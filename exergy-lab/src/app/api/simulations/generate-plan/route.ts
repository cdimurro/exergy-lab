/**
 * Simulation Plan Generation API
 *
 * AI-guided plan generation for simulations. Uses Gemini to analyze user goals
 * and generate detailed simulation plans with parameters.
 *
 * Endpoints:
 * - POST /api/simulations/generate-plan → Start plan generation
 * - GET  /api/simulations/generate-plan?planId=xxx&stream=true → SSE progress
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/ai/gemini'
import { SimulationPlanSchema } from '@/lib/ai/schemas'
import type {
  SimulationType,
  SimulationPlan,
  SimulationPlanParameter,
  PlanGenerationEvent,
  TIER_INFO,
} from '@/types/simulation-workflow'
import type { SimulationTier } from '@/types/simulation'

// In-memory store for active plan generations
const activePlans = new Map<string, {
  status: 'pending' | 'generating' | 'complete' | 'error'
  events: PlanGenerationEvent[]
  plan?: SimulationPlan
  error?: string
  startTime: number
}>()

// Tier descriptions for the AI prompt
const TIER_DESCRIPTIONS: Record<SimulationTier, { label: string; description: string }> = {
  local: {
    label: 'Rapid Feasibility Check (Tier 1)',
    description: 'Analytical calculations, literature validation, thermodynamic limits. <1 minute, FREE.',
  },
  browser: {
    label: 'Standard Lab Protocol (Tier 2)',
    description: 'Monte Carlo simulation with 10,000 iterations, uncertainty quantification. 5-30 minutes, ~$0.01.',
  },
  cloud: {
    label: 'Advanced Validation (Tier 3)',
    description: 'High-fidelity GPU simulation, parametric sweeps, publication-grade results. 30+ minutes, ~$0.02.',
  },
}

// ============================================================================
// POST - Start Plan Generation
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tier, simulationType, goal } = body

    // Validate input
    if (!goal || goal.trim().length < 20) {
      return NextResponse.json(
        { error: 'Goal must be at least 20 characters' },
        { status: 400 }
      )
    }

    if (!tier || !['local', 'browser', 'cloud'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier. Must be local, browser, or cloud' },
        { status: 400 }
      )
    }

    // Generate plan ID
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    // Initialize plan state
    activePlans.set(planId, {
      status: 'pending',
      events: [],
      startTime: Date.now(),
    })

    // Start plan generation in background
    generatePlanAsync(planId, tier, simulationType, goal)

    console.log(`[SimulationPlan] Started plan generation ${planId} for: "${goal.substring(0, 50)}..."`)

    return NextResponse.json({
      planId,
      status: 'started',
    })
  } catch (error) {
    console.error('[SimulationPlan] Failed to start plan generation:', error)
    return NextResponse.json(
      {
        error: 'Failed to start plan generation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET - Stream Progress / Get Results
// ============================================================================

export async function GET(request: NextRequest) {
  const planId = request.nextUrl.searchParams.get('planId')
  const streamMode = request.nextUrl.searchParams.get('stream') !== 'false'

  if (!planId) {
    return NextResponse.json({ error: 'planId required' }, { status: 400 })
  }

  const planState = activePlans.get(planId)
  if (!planState) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  // Non-streaming mode: return current status
  if (!streamMode) {
    return NextResponse.json({
      planId,
      status: planState.status,
      plan: planState.plan,
      error: planState.error,
      duration: Date.now() - planState.startTime,
    })
  }

  // Streaming mode: SSE
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  let isStreamClosed = false
  let lastEventIndex = 0

  const safeCloseStream = async () => {
    if (isStreamClosed) return
    isStreamClosed = true
    try {
      await writer.close()
    } catch {
      // Already closed
    }
  }

  // Stream events
  const streamInterval = setInterval(async () => {
    if (isStreamClosed) {
      clearInterval(streamInterval)
      return
    }

    try {
      const currentPlan = activePlans.get(planId)
      if (!currentPlan) {
        clearInterval(streamInterval)
        await safeCloseStream()
        return
      }

      // Send any new events
      while (lastEventIndex < currentPlan.events.length) {
        const event = currentPlan.events[lastEventIndex]
        await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        lastEventIndex++
      }

      // Check for completion
      if (currentPlan.status === 'complete' && currentPlan.plan) {
        const completeEvent: PlanGenerationEvent = {
          type: 'complete',
          plan: currentPlan.plan,
        }
        await writer.write(encoder.encode(`data: ${JSON.stringify(completeEvent)}\n\n`))
        clearInterval(streamInterval)
        setTimeout(safeCloseStream, 300)
        return
      }

      // Check for error
      if (currentPlan.status === 'error') {
        const errorEvent: PlanGenerationEvent = {
          type: 'error',
          error: currentPlan.error || 'Plan generation failed',
        }
        await writer.write(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`))
        clearInterval(streamInterval)
        setTimeout(safeCloseStream, 300)
        return
      }
    } catch (error) {
      console.error('[SimulationPlan] Stream error:', error)
      clearInterval(streamInterval)
      await safeCloseStream()
    }
  }, 500) // Check every 500ms

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// ============================================================================
// Background Plan Generation
// ============================================================================

async function generatePlanAsync(
  planId: string,
  tier: SimulationTier,
  simulationType: SimulationType | null,
  goal: string
) {
  const planState = activePlans.get(planId)
  if (!planState) return

  planState.status = 'generating'

  try {
    // Progress: Analyzing request
    addEvent(planId, {
      type: 'progress',
      percentage: 10,
      status: 'Analyzing your simulation goal...',
    })

    // Build the AI prompt
    const prompt = buildPlanGenerationPrompt(tier, simulationType, goal)

    // Progress: Generating parameters
    addEvent(planId, {
      type: 'progress',
      percentage: 30,
      status: 'Determining simulation parameters...',
    })

    // Call Gemini AI to generate the plan
    const response = await generateText(prompt, {
      model: 'flash',
      temperature: 0.7,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      thinkingLevel: 'medium',
    })

    // Progress: Processing response
    addEvent(planId, {
      type: 'progress',
      percentage: 70,
      status: 'Processing AI response...',
    })

    // Parse and validate the response
    const parsed = JSON.parse(response)
    const validated = SimulationPlanSchema.parse(parsed)

    // Detect simulation type if not provided
    if (validated.simulationType && validated.simulationType !== simulationType) {
      addEvent(planId, {
        type: 'type_detected',
        simulationType: validated.simulationType,
      })
    }

    // Progress: Finalizing plan
    addEvent(planId, {
      type: 'progress',
      percentage: 90,
      status: 'Finalizing simulation plan...',
    })

    // Build the complete plan with IDs
    const plan: SimulationPlan = {
      id: planId,
      tier,
      simulationType: validated.simulationType,
      detectedType: simulationType ? undefined : validated.simulationType,
      title: validated.title,
      methodology: validated.methodology,
      parameters: validated.parameters.map((p, i) => ({
        ...p,
        id: p.id || `param_${i}`,
        isEditable: p.isEditable ?? true,
      })),
      expectedOutputs: validated.expectedOutputs,
      estimatedDuration: validated.estimatedDuration,
      estimatedCost: validated.estimatedCost,
      generatedAt: new Date().toISOString(),
      version: 1,
    }

    // Mark as complete
    planState.plan = plan
    planState.status = 'complete'

    console.log(`[SimulationPlan] Plan ${planId} generated successfully:`, {
      type: plan.simulationType,
      title: plan.title,
      paramCount: plan.parameters.length,
    })
  } catch (error) {
    console.error(`[SimulationPlan] Plan ${planId} generation failed:`, error)
    planState.status = 'error'
    planState.error = error instanceof Error ? error.message : 'Unknown error'
  }
}

function addEvent(planId: string, event: PlanGenerationEvent) {
  const planState = activePlans.get(planId)
  if (planState) {
    planState.events.push(event)
  }
}

// ============================================================================
// AI Prompt Builder
// ============================================================================

function buildPlanGenerationPrompt(
  tier: SimulationTier,
  simulationType: SimulationType | null,
  goal: string
): string {
  const tierInfo = TIER_DESCRIPTIONS[tier]

  return `You are an expert clean energy simulation engineer. Generate a detailed simulation plan based on the user's goal.

## User Input
- **Selected Tier:** ${tierInfo.label}
  - ${tierInfo.description}
- **Simulation Type:** ${simulationType ? simulationType : 'Auto-detect from description'}
- **Goal Description:** "${goal}"

## Tier Capabilities
- **Tier 1 (Rapid Feasibility, <1min):** Analytical calculations, literature validation, thermodynamic limits
- **Tier 2 (Standard Protocol, 5-30min):** Monte Carlo 10K iterations, uncertainty quantification
- **Tier 3 (Advanced Validation, 30min+):** Full parametric sweeps, publication-grade, GPU-accelerated

## Instructions
1. ${simulationType ? `Confirm the simulation type is ${simulationType}` : 'Detect the appropriate simulation type from the goal description'}
2. Generate a concise but descriptive title for this simulation
3. Write a 2-3 paragraph methodology explaining the simulation approach, equations used, and assumptions
4. Define 5-15 parameters categorized as:
   - **input**: Core physical parameters the user controls (temperatures, pressures, capacities)
   - **boundary**: Environmental conditions and constraints (ambient conditions, grid requirements)
   - **operational**: Operating strategy parameters (capacity factor, cycling patterns)
5. Define 3-6 expected outputs with units and descriptions
6. Estimate duration and cost based on the tier

## Parameter Guidelines
- For geothermal simulations: Include source/sink temperatures, flow rates, working fluid properties
- For solar simulations: Include irradiance, panel specs, tracking parameters
- For wind simulations: Include wind speed, turbine specs, wake parameters
- For battery simulations: Include capacity, chemistry, cycling parameters
- For hydrogen simulations: Include electrolyzer efficiency, storage pressure, fuel cell specs
- All temperatures should be in Kelvin or Celsius with clear units
- Provide min/max ranges for editable numerical parameters

## Output Format (JSON)
{
  "simulationType": "${simulationType || '<detected-type>'}",
  "title": "<concise simulation title, 10-50 characters>",
  "methodology": "<2-3 paragraph explanation of approach, equations, and assumptions>",
  "parameters": [
    {
      "id": "param_1",
      "name": "<parameter name>",
      "value": <number or string>,
      "unit": "<unit>",
      "category": "input" | "boundary" | "operational",
      "description": "<what this parameter controls>",
      "isEditable": true,
      "min": <optional min value>,
      "max": <optional max value>
    }
  ],
  "expectedOutputs": [
    {
      "name": "<output name>",
      "unit": "<unit>",
      "description": "<what this output represents>"
    }
  ],
  "estimatedDuration": <milliseconds>,
  "estimatedCost": <dollars as decimal>
}

Generate a thorough, scientifically accurate simulation plan.`
}

// ============================================================================
// Cleanup Old Plans
// ============================================================================

// Clean up plans older than 1 hour
setInterval(() => {
  const now = Date.now()
  const oneHour = 60 * 60 * 1000

  for (const [id, plan] of activePlans.entries()) {
    if (now - plan.startTime > oneHour) {
      activePlans.delete(id)
      console.log(`[SimulationPlan] Cleaned up old plan: ${id}`)
    }
  }
}, 10 * 60 * 1000) // Every 10 minutes
