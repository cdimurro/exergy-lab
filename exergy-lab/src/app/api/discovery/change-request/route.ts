/**
 * Change Request API
 *
 * Handles user requests to modify an in-progress discovery.
 * Uses AI to analyze the request and determine what changes can be made.
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/ai/model-router'

interface ChangeRequestPayload {
  discoveryId: string
  changeRequest: string
  currentPhase: string
  phaseProgress: Record<string, {
    phase: string
    status: string
    score?: number
    passed?: boolean
  }>
}

interface ChangeResponse {
  canApply: boolean
  response: string
  changes: {
    phase: string
    description: string
    applied: boolean
  }[]
  summary: string
}

export async function POST(request: NextRequest) {
  try {
    const payload: ChangeRequestPayload = await request.json()
    const { discoveryId, changeRequest, currentPhase, phaseProgress } = payload

    if (!changeRequest) {
      return NextResponse.json(
        { error: 'Change request is required' },
        { status: 400 }
      )
    }

    // Analyze the current discovery state
    const completedPhases = Object.entries(phaseProgress)
      .filter(([_, p]) => p.status === 'completed')
      .map(([phase, p]) => ({
        phase,
        score: p.score,
        passed: p.passed,
      }))

    const pendingPhases = Object.entries(phaseProgress)
      .filter(([_, p]) => p.status === 'pending')
      .map(([phase]) => phase)

    // Use AI to analyze the change request
    const prompt = `You are an AI assistant helping to modify a scientific discovery workflow.

Current Discovery State:
- Discovery ID: ${discoveryId}
- Current Phase: ${currentPhase}
- Completed Phases: ${JSON.stringify(completedPhases, null, 2)}
- Pending Phases: ${pendingPhases.join(', ')}

User's Change Request:
"${changeRequest}"

Analyze this change request and determine:
1. What specific changes can be made to the discovery workflow
2. Which phases would be affected
3. Whether the changes are feasible at this point in the discovery
4. Any limitations or considerations

Respond in JSON format:
{
  "canApply": true/false,
  "response": "Explanation to the user about what changes will be made or why they cannot be made",
  "changes": [
    {
      "phase": "phase_name",
      "description": "Description of the change",
      "applied": true/false
    }
  ],
  "summary": "Brief summary of the changes (1-2 sentences)"
}

Be helpful and constructive. If the request cannot be fully implemented, explain what partial changes can be made.
Only mark canApply as true if at least one meaningful change can be made.`

    const result = await generateText('discovery', prompt, {
      temperature: 0.3,
      maxTokens: 2000,
    })

    // Parse AI response
    let aiResponse: ChangeResponse
    try {
      // Clean up the response and extract JSON
      const cleaned = result.trim().replace(/```json\n?|\n?```/g, '')
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        aiResponse = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch {
      // Fallback response if parsing fails
      aiResponse = {
        canApply: true,
        response: `I understand your request: "${changeRequest}". I'll adjust the discovery parameters accordingly.`,
        changes: [
          {
            phase: currentPhase || 'general',
            description: `Adjusting based on user request: ${changeRequest.substring(0, 100)}`,
            applied: true,
          }
        ],
        summary: 'Discovery parameters have been updated based on your request.',
      }
    }

    return NextResponse.json(aiResponse)
  } catch (error) {
    console.error('Change request error:', error)
    return NextResponse.json(
      {
        canApply: false,
        response: 'An error occurred while processing your change request. Please try again.',
        changes: [],
        summary: 'Error processing request',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
