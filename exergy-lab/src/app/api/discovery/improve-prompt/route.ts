/**
 * Prompt Improvement API
 *
 * Analyzes rubric feedback from a failed discovery phase and suggests
 * an improved prompt that addresses the specific criteria that weren't met.
 *
 * IMPORTANT: The goal is NOT to "game" the rubric, but to help users
 * craft better research queries that will lead to better real-world
 * scientific outcomes upon further validation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

export interface PromptImprovementRequest {
  originalQuery: string
  failedPhase: string
  failedCriteria: {
    id: string
    issue: string
    suggestion: string
    score: number
    maxScore: number
  }[]
  overallScore: number
  domain?: string
}

export interface PromptImprovementResponse {
  success: boolean
  improvedPrompt: string
  explanation: string
  keyChanges: string[]
  error?: string
}

const IMPROVEMENT_SYSTEM_PROMPT = `You are a scientific research methodology expert helping researchers improve their discovery queries.

Your task is to analyze why a research query didn't meet quality criteria and suggest an improved version that will lead to BETTER REAL-WORLD SCIENTIFIC OUTCOMES - not just better rubric scores.

CRITICAL GUIDELINES:
1. DO NOT add fake or made-up details - only suggest adding specificity where the user can reasonably provide it
2. DO NOT inflate claims or add unrealistic targets
3. DO suggest adding:
   - Specific, measurable success criteria the researcher can actually test
   - Clear methodology that can be reproduced
   - Relevant safety considerations for the domain
   - Practical feasibility constraints
   - Testable predictions with quantitative targets (if the user knows them)

4. Keep the core research intent intact - you're refining, not replacing
5. If the original query was vague, suggest making it more specific
6. If testability was weak, suggest adding measurable outcomes
7. If feasibility was unclear, suggest adding practical constraints

FORMAT YOUR RESPONSE AS JSON:
{
  "improvedPrompt": "The full improved prompt text",
  "explanation": "1-2 sentence explanation of the key improvements",
  "keyChanges": ["Change 1", "Change 2", "Change 3"]
}

Remember: A good research query leads to discoveries that can be validated in the real world.
Artificially inflating specificity with made-up numbers defeats the purpose.`

export async function POST(request: NextRequest) {
  try {
    const body: PromptImprovementRequest = await request.json()
    const { originalQuery, failedPhase, failedCriteria, overallScore, domain } = body

    console.log('[improve-prompt] Request received:', {
      originalQuery: originalQuery?.substring(0, 50) + '...',
      failedPhase,
      failedCriteriaCount: failedCriteria?.length || 0,
      overallScore,
      domain,
    })

    if (!originalQuery) {
      return NextResponse.json(
        { success: false, error: 'Original query is required' },
        { status: 400 }
      )
    }

    if (!failedPhase) {
      return NextResponse.json(
        { success: false, error: 'Failed phase is required' },
        { status: 400 }
      )
    }

    // Check API key
    if (!process.env.GOOGLE_AI_API_KEY) {
      console.error('[improve-prompt] GOOGLE_AI_API_KEY not configured')
      return NextResponse.json(
        { success: false, error: 'AI service not configured' },
        { status: 500 }
      )
    }

    // Build the analysis prompt
    const analysisPrompt = buildAnalysisPrompt(
      originalQuery,
      failedPhase,
      failedCriteria,
      overallScore,
      domain
    )

    // Call Gemini to generate improved prompt
    console.log('[improve-prompt] Calling Gemini API...')
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })

    let result
    try {
      result = await model.generateContent({
        contents: [
          { role: 'user', parts: [{ text: IMPROVEMENT_SYSTEM_PROMPT }] },
          { role: 'model', parts: [{ text: 'I understand. I will analyze the research query and suggest improvements that lead to better real-world scientific outcomes, not just better scores. I will respond with JSON.' }] },
          { role: 'user', parts: [{ text: analysisPrompt }] },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        },
      })
    } catch (aiError) {
      console.error('[improve-prompt] Gemini API error:', aiError)
      return NextResponse.json(
        {
          success: false,
          improvedPrompt: '',
          explanation: '',
          keyChanges: [],
          error: `AI API error: ${aiError instanceof Error ? aiError.message : 'Unknown AI error'}`,
        } as PromptImprovementResponse,
        { status: 500 }
      )
    }

    const responseText = result.response.text()
    console.log('[improve-prompt] AI response received, length:', responseText.length)

    // Parse the JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[improve-prompt] Failed to parse JSON from response:', responseText.substring(0, 200))
      return NextResponse.json(
        {
          success: false,
          improvedPrompt: '',
          explanation: '',
          keyChanges: [],
          error: 'AI response was not in expected format',
        } as PromptImprovementResponse,
        { status: 500 }
      )
    }

    let parsed
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('[improve-prompt] JSON parse error:', parseError, 'Raw:', jsonMatch[0].substring(0, 200))
      return NextResponse.json(
        {
          success: false,
          improvedPrompt: '',
          explanation: '',
          keyChanges: [],
          error: 'Failed to parse AI response',
        } as PromptImprovementResponse,
        { status: 500 }
      )
    }

    console.log('[improve-prompt] Successfully generated suggestion')
    return NextResponse.json({
      success: true,
      improvedPrompt: parsed.improvedPrompt || originalQuery,
      explanation: parsed.explanation || 'Suggested improvements based on rubric feedback.',
      keyChanges: parsed.keyChanges || [],
    } as PromptImprovementResponse)
  } catch (error) {
    console.error('[improve-prompt] Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        improvedPrompt: '',
        explanation: '',
        keyChanges: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      } as PromptImprovementResponse,
      { status: 500 }
    )
  }
}

function buildAnalysisPrompt(
  originalQuery: string,
  failedPhase: string,
  failedCriteria: PromptImprovementRequest['failedCriteria'],
  overallScore: number,
  domain?: string
): string {
  const criteriaAnalysis = failedCriteria.length > 0
    ? failedCriteria
        .map(
          (c) =>
            `- ${c.id}: ${c.issue} (scored ${c.score}/${c.maxScore})\n  Suggestion: ${c.suggestion}`
        )
        .join('\n')
    : null

  // Different prompt template based on whether we have criteria details
  if (criteriaAnalysis) {
    return `
ORIGINAL RESEARCH QUERY:
"${originalQuery}"

DOMAIN: ${domain || 'Clean Energy Research'}

FAILED AT PHASE: ${failedPhase}
OVERALL SCORE: ${overallScore}/10

CRITERIA THAT NEED IMPROVEMENT:
${criteriaAnalysis}

Please analyze this research query and suggest an improved version that:
1. Addresses the specific criteria that weren't met
2. Maintains the original research intent
3. Is practically achievable and scientifically sound
4. Will lead to better real-world research outcomes

Provide your response as JSON with: improvedPrompt, explanation, and keyChanges (array of 2-4 key improvements made).
`
  }

  // Generic improvement when no specific criteria available
  return `
ORIGINAL RESEARCH QUERY:
"${originalQuery}"

DOMAIN: ${domain || 'Clean Energy Research'}

FAILED AT PHASE: ${failedPhase}
OVERALL SCORE: ${overallScore}/10

The query failed the "${failedPhase}" phase with a score below the 7.0/10 threshold.
Common reasons for failing this phase include:
- Lack of specific, measurable success criteria
- Missing testable predictions or quantitative targets
- Unclear methodology or experimental approach
- Insufficient detail on safety considerations
- Vague feasibility constraints

Please analyze this research query and suggest an improved version that addresses these common weaknesses while:
1. Maintaining the original research intent
2. Adding specific, measurable outcomes where appropriate
3. Including practical constraints and safety considerations
4. Being scientifically sound and achievable

Provide your response as JSON with: improvedPrompt, explanation, and keyChanges (array of 2-4 key improvements made).
`
}
