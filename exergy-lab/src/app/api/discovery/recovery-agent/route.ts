/**
 * Recovery Agent API
 *
 * Intelligent agent that analyzes user input after a discovery failure.
 * Determines the appropriate action: retry, modify, answer question, or change parameters.
 * Uses Gemini 3 Flash with high thinking for complex reasoning.
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/ai/model-router'

export interface RecoveryAgentPayload {
  userInput: string
  originalQuery: string
  failedPhase: string
  failedScore?: number
  passedPhases: string[]
  failedCriteria: { id: string; issue: string; suggestion: string }[]
  recoveryRecommendations: { issue: string; suggestion: string; priority: string }[]
  phaseProgress: Record<string, {
    phase: string
    status: string
    score?: number
    passed?: boolean
  }>
}

export type RecoveryAction =
  | 'rerun_full'           // Start discovery from scratch
  | 'rerun_from_checkpoint' // Resume from last successful phase
  | 'answer_question'       // Answer user's question without rerunning
  | 'modify_parameters'     // Change specific parameters
  | 'clarify'              // Ask user for clarification

export interface RecoveryAgentResponse {
  action: RecoveryAction
  reasoning: string

  // For rerun actions
  modifiedQuery?: string  // The query to use (possibly modified)
  resumeFromPhase?: string // Phase to resume from (for checkpoint)

  // For answer_question action
  answer?: string

  // For modify_parameters action
  parameterChanges?: {
    parameter: string
    oldValue: string
    newValue: string
    description: string
  }[]

  // For clarify action
  clarificationQuestion?: string

  // User-facing message
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const payload: RecoveryAgentPayload = await request.json()
    const {
      userInput,
      originalQuery,
      failedPhase,
      failedScore,
      passedPhases,
      failedCriteria,
      recoveryRecommendations,
      phaseProgress,
    } = payload

    if (!userInput?.trim()) {
      return NextResponse.json(
        { error: 'User input is required' },
        { status: 400 }
      )
    }

    // Build context for the AI
    const failedCriteriaText = failedCriteria.length > 0
      ? failedCriteria.map(c => `- ${c.id}: ${c.issue}`).join('\n')
      : 'No specific criteria failures recorded'

    const recommendationsText = recoveryRecommendations.length > 0
      ? recoveryRecommendations.map(r => `- [${r.priority}] ${r.suggestion}`).join('\n')
      : 'No recommendations available'

    const passedPhasesText = passedPhases.length > 0
      ? passedPhases.join(', ')
      : 'None'

    // Use AI to analyze the user's input and determine action
    const prompt = `You are an intelligent recovery agent for a scientific discovery workflow.

## DISCOVERY CONTEXT

**Original Query:** "${originalQuery}"
**Failed Phase:** ${failedPhase} (Score: ${failedScore?.toFixed(1) || 'N/A'}/10)
**Successfully Completed Phases:** ${passedPhasesText}

**Failed Criteria:**
${failedCriteriaText}

**Recommendations for Improvement:**
${recommendationsText}

## USER INPUT

The user has entered the following in response to the failure:
"${userInput}"

## YOUR TASK

Analyze the user's input and determine the most appropriate action. Consider:

1. **Is this a NEW/MODIFIED QUERY?**
   - If the user provides a completely new research topic → action: "rerun_full"
   - If the user refines/improves the original query → action: "rerun_full" with modifiedQuery
   - If the change is minor and earlier phases can be reused → action: "rerun_from_checkpoint"

2. **Is this a QUESTION?**
   - If the user asks about the failure, the results, or seeks clarification → action: "answer_question"
   - Provide a helpful, detailed answer

3. **Is this a PARAMETER CHANGE REQUEST?**
   - If the user wants to change search parameters, thresholds, etc. → action: "modify_parameters"
   - List specific parameter changes

4. **Is the input AMBIGUOUS?**
   - If you can't determine intent → action: "clarify"
   - Ask a specific clarifying question

## RESPONSE FORMAT

Respond with a JSON object:
{
  "action": "rerun_full" | "rerun_from_checkpoint" | "answer_question" | "modify_parameters" | "clarify",
  "reasoning": "Brief explanation of why you chose this action",
  "modifiedQuery": "The query to use (only for rerun actions, can be same as original or modified)",
  "resumeFromPhase": "Phase name to resume from (only for rerun_from_checkpoint)",
  "answer": "Your answer (only for answer_question)",
  "parameterChanges": [{"parameter": "name", "oldValue": "...", "newValue": "...", "description": "..."}],
  "clarificationQuestion": "Your question (only for clarify)",
  "message": "User-friendly message explaining what will happen next"
}

Important guidelines:
- Be helpful and constructive
- If the user's modification addresses the failed criteria, acknowledge that
- For checkpoint resume, only suggest if the change doesn't invalidate earlier work
- Keep messages concise and actionable`

    const result = await generateText('discovery', prompt, {
      temperature: 0.3,
      maxTokens: 2000,
    })

    // Parse AI response
    let agentResponse: RecoveryAgentResponse
    try {
      const cleaned = result.trim().replace(/```json\n?|\n?```/g, '')
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        agentResponse = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch {
      // Fallback: Try to infer intent from user input
      const inputLower = userInput.toLowerCase()
      const isQuestion = inputLower.includes('?') ||
        inputLower.startsWith('why') ||
        inputLower.startsWith('what') ||
        inputLower.startsWith('how') ||
        inputLower.startsWith('can')

      if (isQuestion) {
        agentResponse = {
          action: 'answer_question',
          reasoning: 'User input appears to be a question',
          answer: `Based on the discovery results, the ${failedPhase} phase failed because it didn't meet the quality threshold (scored ${failedScore?.toFixed(1) || 'below 7.0'}/10). ${recoveryRecommendations.length > 0 ? `The main recommendation is: ${recoveryRecommendations[0].suggestion}` : 'Please try refining your query.'}`,
          message: 'Here\'s what I found:',
        }
      } else {
        // Assume it's a modified query
        agentResponse = {
          action: 'rerun_full',
          reasoning: 'User appears to be providing a modified or new query',
          modifiedQuery: userInput,
          message: 'I\'ll start a new discovery with your updated query.',
        }
      }
    }

    // Validate and enhance response
    if (!agentResponse.action) {
      agentResponse.action = 'rerun_full'
    }
    if (!agentResponse.message) {
      agentResponse.message = getDefaultMessage(agentResponse.action)
    }
    if (agentResponse.action === 'rerun_full' && !agentResponse.modifiedQuery) {
      agentResponse.modifiedQuery = userInput
    }

    return NextResponse.json(agentResponse)
  } catch (error) {
    console.error('Recovery agent error:', error)
    return NextResponse.json(
      {
        action: 'rerun_full',
        reasoning: 'Error processing request, defaulting to full rerun',
        modifiedQuery: undefined,
        message: 'I encountered an issue analyzing your request. Let me restart the discovery.',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

function getDefaultMessage(action: RecoveryAction): string {
  switch (action) {
    case 'rerun_full':
      return 'Starting a fresh discovery with your query.'
    case 'rerun_from_checkpoint':
      return 'Resuming discovery from the last successful checkpoint.'
    case 'answer_question':
      return 'Here\'s what I found:'
    case 'modify_parameters':
      return 'I\'ll update the parameters and retry.'
    case 'clarify':
      return 'I need a bit more information to help you.'
    default:
      return 'Processing your request.'
  }
}
