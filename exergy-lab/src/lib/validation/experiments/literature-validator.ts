/**
 * Literature Alignment Validator
 *
 * Compares experiment protocol against published methodologies
 * to assess scientific rigor and precedent.
 */

import type { ExperimentPlan, ProtocolValidation, SourcePaperContext } from '@/types/experiment-workflow'
import { generateText } from '@/lib/ai/gemini'

export async function validateLiteratureAlignment(
  plan: ExperimentPlan,
  sourcePapers?: SourcePaperContext
): Promise<ProtocolValidation['literatureAlignment']> {
  // If no source papers provided, return moderate confidence
  if (!sourcePapers || sourcePapers.ids.length === 0) {
    return {
      confidence: 50,
      matchedPapers: 0,
      deviations: ['No reference papers provided for comparison'],
      recommendations: [
        'Import papers from Search to enable literature validation',
        'Consider searching for similar protocols in published literature',
      ],
    }
  }

  try {
    // Build comparison prompt
    const prompt = `You are an expert research methodologist. Compare this experimental protocol to published methodologies and assess alignment.

**Experiment Protocol:**
Domain: ${plan.domain}
Title: ${plan.title}
Methodology: ${plan.methodology}

Materials: ${plan.materials.map(m => `${m.name} (${m.quantity} ${m.unit})`).join(', ')}

Steps Summary:
${plan.steps.map(s => `${s.step}. ${s.title}: ${s.description.substring(0, 100)}...`).join('\n')}

**Reference Context:**
${sourcePapers.methodology || 'Based on ' + sourcePapers.ids.length + ' research papers'}

**Task:**
Assess how well this protocol aligns with established literature practices.

Output JSON:
{
  "confidence": <0-100 confidence score>,
  "matchedPapers": <estimated number of similar protocols>,
  "deviations": ["deviation 1", "deviation 2"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}

**Scoring Guidelines:**
- 90-100: Protocol closely matches established best practices
- 70-89: Good alignment with minor deviations
- 50-69: Moderate alignment, some non-standard approaches
- 30-49: Significant deviations from literature norms
- 0-29: Highly novel or questionable methodology

Focus on:
1. Are the materials and conditions typical for ${plan.domain}?
2. Do the steps follow logical scientific procedures?
3. Are safety protocols appropriate?
4. Is the methodology scientifically sound?`

    const response = await generateText(prompt, {
      model: 'flash',
      responseMimeType: 'application/json',
      temperature: 0.3, // Lower temperature for more consistent scoring
      maxOutputTokens: 1024,
    })

    const result = JSON.parse(response)

    return {
      confidence: Math.min(100, Math.max(0, result.confidence || 50)),
      matchedPapers: result.matchedPapers || sourcePapers.ids.length,
      deviations: Array.isArray(result.deviations) ? result.deviations : [],
      recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
    }
  } catch (error) {
    console.error('[LiteratureValidator] Error:', error)
    // Return moderate confidence on error
    return {
      confidence: 50,
      matchedPapers: 0,
      deviations: ['Unable to complete literature comparison'],
      recommendations: ['Manual review recommended'],
    }
  }
}
