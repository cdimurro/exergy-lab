/**
 * Generate Experiment Plan API
 *
 * POST: Starts plan generation, returns planId
 * GET: Streams progress events via SSE
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/ai/gemini'
import type {
  GeneratePlanRequest,
  ExperimentPlan,
  Material,
  ExperimentStep,
  PlanGenerationEvent,
} from '@/types/experiment-workflow'
import type { SafetyWarning } from '@/types/experiment'

// ============================================================================
// Event Storage (In-Memory for MVP)
// ============================================================================

interface StoredEvents {
  events: PlanGenerationEvent[]
  completed: boolean
}

const eventStore = new Map<string, StoredEvents>()

function addEvent(planId: string, event: PlanGenerationEvent) {
  const stored = eventStore.get(planId) || { events: [], completed: false }
  stored.events.push(event)
  if (event.type === 'complete' || event.type === 'error') {
    stored.completed = true
  }
  eventStore.set(planId, stored)
}

function getEvents(planId: string): PlanGenerationEvent[] {
  return eventStore.get(planId)?.events || []
}

function clearEvents(planId: string) {
  eventStore.delete(planId)
}

// ============================================================================
// POST: Start Plan Generation
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: GeneratePlanRequest = await request.json()
    const { domain, goal, objectives, sourcePapers } = body

    // Validate required fields
    if (!domain || !goal) {
      return NextResponse.json(
        { error: 'Domain and goal are required' },
        { status: 400 }
      )
    }

    // Generate unique plan ID
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Clear old events (keep only last 100 plan IDs to prevent memory leak)
    if (eventStore.size > 100) {
      const oldestKeys = Array.from(eventStore.keys()).slice(0, 50)
      oldestKeys.forEach((key) => eventStore.delete(key))
    }

    // Start async generation (don't await)
    generatePlanAsync(planId, domain, goal, objectives, sourcePapers).catch((error) => {
      console.error('[GeneratePlan] Error:', error)
      addEvent(planId, {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    })

    return NextResponse.json({ planId, status: 'started' })
  } catch (error) {
    console.error('[GeneratePlan] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to start plan generation' },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET: Stream Progress Events
// ============================================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const planId = searchParams.get('planId')
  const stream = searchParams.get('stream') === 'true'

  if (!planId) {
    return NextResponse.json({ error: 'planId required' }, { status: 400 })
  }

  if (!stream) {
    // Return all events as JSON
    const events = getEvents(planId)
    return NextResponse.json({ events })
  }

  // Set up SSE stream
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      const events = getEvents(planId)

      // Send all existing events
      for (const event of events) {
        const data = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
        controller.enqueue(encoder.encode(data))

        // If completed or error, close stream
        if (event.type === 'complete' || event.type === 'error') {
          // Clean up after sending
          setTimeout(() => clearEvents(planId), 5000)
          controller.close()
          return
        }
      }

      // If no events yet, wait for them
      if (events.length === 0) {
        // Poll for new events every 500ms
        const pollInterval = setInterval(() => {
          const newEvents = getEvents(planId)
          const unsentEvents = newEvents.slice(events.length)

          for (const event of unsentEvents) {
            const data = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
            controller.enqueue(encoder.encode(data))

            if (event.type === 'complete' || event.type === 'error') {
              clearInterval(pollInterval)
              setTimeout(() => clearEvents(planId), 5000)
              controller.close()
              return
            }
          }

          // Timeout after 2 minutes
          if (Date.now() - parseInt(planId.split('_')[1]) > 120000) {
            clearInterval(pollInterval)
            controller.enqueue(
              encoder.encode(
                `event: error\ndata: ${JSON.stringify({ error: 'Timeout' })}\n\n`
              )
            )
            controller.close()
          }
        }, 500)
      } else {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

// ============================================================================
// Async Plan Generation
// ============================================================================

async function generatePlanAsync(
  planId: string,
  domain: string,
  goal: string,
  objectives: string[],
  sourcePapers?: { ids: string[]; methodology?: string }
) {
  try {
    // Progress: 10%
    addEvent(planId, {
      type: 'progress',
      percentage: 10,
      status: 'Analyzing experiment goal...',
    })

    // Build prompt with context from source papers if available
    const sourceContext = sourcePapers?.methodology
      ? `\n\nContext from Literature:\n${sourcePapers.methodology}\n\nUse this as reference but adapt for the current experiment.`
      : ''

    const objectivesText =
      objectives.length > 0
        ? `\n\nMeasurable Objectives:\n${objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}`
        : ''

    const prompt = `You are an expert clean energy experimentalist. Generate a detailed, lab-ready experiment protocol.

Domain: ${domain}
Goal: "${goal}"${objectivesText}${sourceContext}

Generate a comprehensive experiment plan as JSON with this structure:

{
  "title": "Clear, descriptive title of the experiment",
  "materials": [
    {
      "name": "Material name",
      "quantity": "Amount (number only)",
      "unit": "Unit (g, mL, mol, etc.)",
      "cost": estimated_cost_in_USD
    }
  ],
  "equipment": ["Equipment item 1", "Equipment item 2"],
  "steps": [
    {
      "step": 1,
      "title": "Step title",
      "description": "Detailed description of what to do",
      "duration": "Time estimate (e.g., '30 minutes')",
      "temperature": "Temperature if applicable (e.g., '25°C')",
      "pressure": "Pressure if applicable (e.g., '1 atm')",
      "safety": ["Safety note 1", "Safety note 2"]
    }
  ],
  "safetyWarnings": [
    {
      "level": "low|medium|high|critical",
      "category": "chemical|thermal|pressure|electrical|radiation|mechanical",
      "description": "Description of the hazard",
      "mitigation": "How to mitigate this risk"
    }
  ],
  "methodology": "Brief summary of the experimental approach and scientific rationale",
  "assumptions": ["Assumption 1", "Assumption 2"],
  "limitations": ["Limitation 1", "Limitation 2"]
}

Important guidelines:
- Be specific about quantities, temperatures, times, and conditions
- Include all necessary safety warnings
- Provide realistic cost estimates based on typical supplier pricing
- Make the protocol detailed enough for a graduate student to follow
- Include appropriate characterization steps for ${domain}
- Consider the specific objectives: ${objectives.join(', ')}`

    // Progress: 30%
    addEvent(planId, {
      type: 'progress',
      percentage: 30,
      status: 'Generating materials list...',
    })

    // Generate plan using Gemini AI
    const response = await generateText(prompt, {
      model: 'flash',
      responseMimeType: 'application/json',
      temperature: 1.0,
      maxOutputTokens: 4096,
    })

    let planData: any
    try {
      planData = JSON.parse(response)
    } catch (parseError) {
      throw new Error('Failed to parse AI response as JSON')
    }

    // Progress: 50% - Send materials
    if (planData.materials) {
      addEvent(planId, {
        type: 'materials',
        percentage: 50,
        materials: planData.materials,
      })
    }

    // Progress: 70% - Send steps
    if (planData.steps) {
      addEvent(planId, {
        type: 'steps',
        percentage: 70,
        steps: planData.steps,
      })
    }

    // Progress: 85% - Send safety warnings
    if (planData.safetyWarnings) {
      addEvent(planId, {
        type: 'safety',
        percentage: 85,
        warnings: planData.safetyWarnings,
      })
    }

    // Progress: 95%
    addEvent(planId, {
      type: 'progress',
      percentage: 95,
      status: 'Finalizing protocol...',
    })

    // Calculate total cost and duration
    const totalCost = planData.materials?.reduce(
      (sum: number, m: Material) => sum + (m.cost || 0),
      0
    ) || 0

    const estimatedDuration = calculateEstimatedDuration(planData.steps || [])

    // Build complete plan
    const plan: ExperimentPlan = {
      id: planId,
      domain: domain as any,
      title: planData.title || 'Untitled Experiment',
      materials: planData.materials || [],
      equipment: planData.equipment || [],
      steps: planData.steps || [],
      safetyWarnings: planData.safetyWarnings || [],
      estimatedDuration,
      estimatedCost: totalCost,
      methodology: planData.methodology || '',
      assumptions: planData.assumptions || [],
      limitations: planData.limitations || [],
      generatedAt: new Date().toISOString(),
      version: 1,
    }

    // Progress: 100% - Complete
    addEvent(planId, {
      type: 'complete',
      percentage: 100,
      plan,
    })
  } catch (error) {
    console.error('[GeneratePlan] Generation error:', error)
    addEvent(planId, {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateEstimatedDuration(steps: ExperimentStep[]): string {
  // Sum up all step durations
  let totalMinutes = 0

  for (const step of steps) {
    if (step.duration) {
      const match = step.duration.match(/(\d+)\s*(min|minute|hour|hr|day)/i)
      if (match) {
        const value = parseInt(match[1])
        const unit = match[2].toLowerCase()

        if (unit.startsWith('min')) {
          totalMinutes += value
        } else if (unit.startsWith('hour') || unit === 'hr') {
          totalMinutes += value * 60
        } else if (unit.startsWith('day')) {
          totalMinutes += value * 24 * 60
        }
      }
    }
  }

  // Convert to readable format
  if (totalMinutes < 60) {
    return `${totalMinutes} minutes`
  } else if (totalMinutes < 24 * 60) {
    const hours = Math.floor(totalMinutes / 60)
    const mins = totalMinutes % 60
    return mins > 0 ? `${hours} hours ${mins} minutes` : `${hours} hours`
  } else {
    const days = Math.floor(totalMinutes / (24 * 60))
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
    return hours > 0 ? `${days} days ${hours} hours` : `${days} days`
  }
}
