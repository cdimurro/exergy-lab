/**
 * Import Papers API
 *
 * Extracts experimental design elements from research papers
 * to pre-populate the experiment workflow.
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/ai/gemini'
import type { ImportPapersRequest, ImportPapersResponse } from '@/types/experiment-workflow'

export async function POST(request: NextRequest) {
  try {
    const body: ImportPapersRequest = await request.json()
    const { sourcePapers } = body

    if (!sourcePapers?.papers || sourcePapers.papers.length === 0) {
      return NextResponse.json(
        { error: 'No papers provided' },
        { status: 400 }
      )
    }

    // Build prompt to extract methodology
    const paperSummaries = sourcePapers.papers
      .map((p) => `Title: ${p.title}\n${p.abstract || p.methodology || ''}`)
      .join('\n\n---\n\n')

    const prompt = `You are an expert research methodologist. Extract experimental design elements from these research papers to help design a new experiment.

**Research Papers:**
${paperSummaries}

**Task:**
Analyze these papers and extract:
1. A suggested experiment goal that would build on or validate these findings
2. 3-5 measurable objectives for the experiment
3. Key parameters or conditions mentioned (temperatures, pressures, concentrations, etc.)
4. Methodological approach summary

Output JSON:
{
  "suggestedGoal": "Clear, actionable experiment goal based on these papers",
  "suggestedObjectives": [
    "Objective 1 with measurable target",
    "Objective 2 with measurable target",
    "Objective 3 with measurable target"
  ],
  "extractedParameters": {
    "parameter_name": value_or_string
  },
  "methodology": "Brief summary of the methodological approach from these papers"
}

Focus on practical, reproducible experiments that could validate or extend the findings.`

    const response = await generateText(prompt, {
      model: 'flash',
      responseMimeType: 'application/json',
      temperature: 0.5,
      maxOutputTokens: 1024,
    })

    const result = JSON.parse(response)

    const importResponse: ImportPapersResponse = {
      suggestedGoal: result.suggestedGoal || 'Design experiment based on selected papers',
      suggestedObjectives: result.suggestedObjectives || [],
      extractedParameters: result.extractedParameters || {},
      methodology: result.methodology || '',
    }

    return NextResponse.json(importResponse)
  } catch (error) {
    console.error('[ImportPapers] Error:', error)

    // Return fallback response
    return NextResponse.json({
      suggestedGoal: 'Design experiment based on selected papers',
      suggestedObjectives: [],
      extractedParameters: {},
      methodology: '',
    })
  }
}
