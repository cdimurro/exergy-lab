/**
 * Simulation Plan Modification API
 *
 * Uses AI to modify simulation plans based on natural language feedback.
 *
 * Endpoint:
 * - POST /api/simulations/modify-plan → Modify plan based on feedback
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/ai/gemini'
import { SimulationPlanSchema } from '@/lib/ai/schemas'
import type { SimulationPlan } from '@/types/simulation-workflow'

// ============================================================================
// POST - Modify Plan
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { planId, plan, feedback } = body

    // Validate input
    if (!plan || !feedback) {
      return NextResponse.json(
        { error: 'Plan and feedback are required' },
        { status: 400 }
      )
    }

    if (feedback.trim().length < 5) {
      return NextResponse.json(
        { error: 'Feedback must be at least 5 characters' },
        { status: 400 }
      )
    }

    console.log(`[SimulationPlan] Modifying plan ${planId} with feedback: "${feedback.substring(0, 50)}..."`)

    // Build modification prompt
    const prompt = buildModificationPrompt(plan, feedback)

    // Call Gemini AI to modify the plan
    const response = await generateText(prompt, {
      model: 'flash',
      temperature: 0.5,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      thinkingLevel: 'low',
    })

    // Parse and validate the response
    const parsed = JSON.parse(response)
    const validated = SimulationPlanSchema.parse(parsed)

    // Build the modified plan
    const modifiedPlan: SimulationPlan = {
      id: plan.id,
      tier: plan.tier,
      simulationType: validated.simulationType,
      detectedType: plan.detectedType,
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
      generatedAt: plan.generatedAt,
      version: (plan.version || 1) + 1,
    }

    console.log(`[SimulationPlan] Plan ${planId} modified successfully (v${modifiedPlan.version})`)

    return NextResponse.json(modifiedPlan)
  } catch (error) {
    console.error('[SimulationPlan] Failed to modify plan:', error)
    return NextResponse.json(
      {
        error: 'Failed to modify plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// AI Prompt Builder
// ============================================================================

function buildModificationPrompt(plan: SimulationPlan, feedback: string): string {
  return `You are an expert clean energy simulation engineer. Modify the following simulation plan based on user feedback.

## Current Plan
\`\`\`json
${JSON.stringify(plan, null, 2)}
\`\`\`

## User Feedback
"${feedback}"

## Instructions
1. Apply the user's requested changes to the plan
2. Maintain scientific accuracy and physical validity
3. Keep parameters within reasonable physical limits
4. Update the methodology if the changes significantly affect the approach
5. Adjust estimated duration/cost if changes affect complexity

## Examples of Common Requests
- "Increase the temperature to 200C" → Update the relevant temperature parameter
- "Add exergy analysis" → Add exergy-related outputs and update methodology
- "Use R134a instead of R245fa" → Update working fluid parameter and related properties
- "Add uncertainty analysis" → Ensure Monte Carlo parameters are included
- "Include sensitivity analysis for flow rate" → Add flow rate variations to parameters

## Output Format (JSON)
Return the complete modified plan in the same JSON structure:
{
  "simulationType": "<type>",
  "title": "<possibly updated title>",
  "methodology": "<updated methodology if needed>",
  "parameters": [...],
  "expectedOutputs": [...],
  "estimatedDuration": <milliseconds>,
  "estimatedCost": <dollars>
}

Apply the requested changes while maintaining plan validity.`
}
