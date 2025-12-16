/**
 * Experiment Failure Analysis API Route
 * AI-powered failure mode and risk analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { aiRouter } from '@/lib/ai/model-router'
import type { ExperimentProtocol, FailureAnalysis, FailureMode } from '@/types/experiment'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface AnalyzeRequest {
  protocol: ExperimentProtocol
}

/**
 * POST /api/experiments/analyze
 * Generate failure mode analysis for experiment protocol
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyzeRequest

    if (!body.protocol) {
      return NextResponse.json({ error: 'Protocol is required' }, { status: 400 })
    }

    // Generate failure analysis using AI
    const failureAnalysis = await generateFailureAnalysis(body.protocol)

    return NextResponse.json({ failureAnalysis })
  } catch (error) {
    console.error('Failure analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}

/**
 * Generate failure mode analysis
 */
async function generateFailureAnalysis(
  protocol: ExperimentProtocol
): Promise<FailureAnalysis> {
  // Search for similar failed experiments (simulated - would use real database in production)
  const similarFailures = await searchSimilarFailures(protocol)

  // Generate failure modes using AI
  const prompt = `You are a clean energy research expert analyzing potential failure modes for an experiment.

Experiment: ${protocol.title}
Domain: ${protocol.goal.domain}
Description: ${protocol.goal.description}

Materials: ${protocol.materials.map((m) => m.name).join(', ')}
Steps: ${protocol.steps.length} steps

${similarFailures.length > 0 ? `Similar Past Failures:\n${similarFailures.join('\n')}` : ''}

Identify 3-5 potential failure modes and return as JSON:
{
  "potentialFailures": [
    {
      "description": "Failure mode description",
      "frequency": "common|occasional|rare",
      "impact": "low|medium|high|critical",
      "causes": ["Cause 1", "Cause 2"],
      "preventions": ["Prevention 1", "Prevention 2"]
    }
  ],
  "riskScore": 0-100,
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}

Focus on realistic failure modes based on the domain and materials involved.`

  try {
    const response = await aiRouter.execute('experiment-failure', prompt, {
      temperature: 0.6,
      maxTokens: 1500,
    })

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])

      // Add similar experiment references to failure modes
      const failureModes: FailureMode[] = (parsed.potentialFailures || []).map(
        (f: any) => ({
          ...f,
          similarExperiments: similarFailures.length > 0 ? similarFailures.slice(0, 2) : undefined,
        })
      )

      return {
        potentialFailures: failureModes,
        riskScore: parsed.riskScore || calculateRiskScore(failureModes),
        recommendations: parsed.recommendations || [],
      }
    }
  } catch (error) {
    console.error('Failure mode generation failed:', error)
  }

  // Fallback analysis
  const fallbackFailures: FailureMode[] = [
    {
      description: 'Equipment malfunction or calibration issues',
      frequency: 'occasional',
      impact: 'medium',
      causes: ['Improper calibration', 'Equipment wear', 'Power fluctuations'],
      preventions: [
        'Regular equipment maintenance',
        'Pre-experiment calibration checks',
        'Use backup power supply',
      ],
    },
    {
      description: 'Contamination of materials or samples',
      frequency: 'common',
      impact: 'medium',
      causes: ['Improper handling', 'Environmental exposure', 'Cross-contamination'],
      preventions: [
        'Use clean room protocols',
        'Proper PPE',
        'Dedicated equipment for each material',
      ],
    },
    {
      description: 'Unexpected chemical reactions',
      frequency: 'rare',
      impact: 'high',
      causes: ['Material incompatibility', 'Temperature excursions', 'Impurities'],
      preventions: [
        'Thorough material compatibility analysis',
        'Controlled temperature environment',
        'Use high-purity materials',
      ],
    },
  ]

  return {
    potentialFailures: fallbackFailures,
    riskScore: calculateRiskScore(fallbackFailures),
    recommendations: [
      'Conduct preliminary risk assessment before starting',
      'Have emergency protocols in place',
      'Document all deviations from procedure',
      'Review similar experiments in literature',
    ],
  }
}

/**
 * Search for similar failed experiments (simulated)
 * In production, this would query a database of historical experiments
 */
async function searchSimilarFailures(protocol: ExperimentProtocol): Promise<string[]> {
  // Simulated search results
  const failures = [
    `Similar ${protocol.goal.domain} experiment failed due to temperature control issues`,
    `Prior research encountered material degradation in ${protocol.goal.domain} applications`,
    `Historical data shows ${protocol.goal.domain} experiments require precise timing`,
  ]

  // Return random subset
  return failures.slice(0, Math.floor(Math.random() * 3) + 1)
}

/**
 * Calculate overall risk score from failure modes
 */
function calculateRiskScore(failures: FailureMode[]): number {
  if (failures.length === 0) return 0

  const frequencyScore = {
    rare: 1,
    occasional: 2,
    common: 3,
  }

  const impactScore = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  }

  const totalScore = failures.reduce((sum, failure) => {
    const freq = frequencyScore[failure.frequency as keyof typeof frequencyScore] || 1
    const impact = impactScore[failure.impact as keyof typeof impactScore] || 1
    return sum + freq * impact
  }, 0)

  // Normalize to 0-100 scale
  const maxPossibleScore = failures.length * 3 * 4 // common * critical
  const score = Math.round((totalScore / maxPossibleScore) * 100)

  return Math.min(100, Math.max(0, score))
}
