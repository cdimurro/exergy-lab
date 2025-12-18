/**
 * Experiment Tier Selector
 *
 * Auto-selection logic for choosing the appropriate experiment tier
 * based on hypothesis characteristics, safety, and target quality.
 */

import type { Hypothesis } from '@/lib/ai/agents/creative-agent'
import type {
  ExperimentTier,
  TierSelectionFactors,
  TierRecommendation,
  ExperimentTierCapabilities,
  EXPERIMENT_TIER_CONFIG,
} from '@/types/experiment-tiers'
import type { TargetQuality } from '@/types/intervention'
import { runTier1Feasibility } from './tier1-feasibility'

// ============================================================================
// Safety Risk Assessment
// ============================================================================

type SafetyRiskLevel = 'low' | 'medium' | 'high'

interface SafetyAssessment {
  riskLevel: SafetyRiskLevel
  factors: string[]
}

const HIGH_RISK_KEYWORDS = [
  'cyanide', 'fluorine', 'hf', 'hydrofluoric', 'radioactive', 'explosive',
  'pyrophoric', 'carcinogen', 'mutagen', 'teratogen',
]

const MEDIUM_RISK_KEYWORDS = [
  'hydrogen', 'lithium', 'sodium', 'potassium', 'alkali', 'high pressure',
  'autoclave', 'laser', 'nanoparticle', 'organic solvent', 'acid', 'base',
]

function assessSafetyRisk(hypothesis: Hypothesis): SafetyAssessment {
  const searchText = [
    hypothesis.statement,
    hypothesis.title,
    ...hypothesis.predictions.map(p => p.statement),
    ...(hypothesis.mechanism?.steps || []).map(s => s.description),
    ...(hypothesis.requiredMaterials || []).map(m => m.formula),
  ].join(' ').toLowerCase()

  const factors: string[] = []

  // Check for high-risk materials
  for (const keyword of HIGH_RISK_KEYWORDS) {
    if (searchText.includes(keyword)) {
      factors.push(`Contains high-risk material/process: ${keyword}`)
    }
  }

  if (factors.length > 0) {
    return { riskLevel: 'high', factors }
  }

  // Check for medium-risk materials
  for (const keyword of MEDIUM_RISK_KEYWORDS) {
    if (searchText.includes(keyword)) {
      factors.push(`Contains moderate-risk material/process: ${keyword}`)
    }
  }

  // Check temperature
  const tempMatch = searchText.match(/(\d+)\s*[°]?c/i)
  if (tempMatch) {
    const temp = parseInt(tempMatch[1])
    if (temp > 1000) {
      factors.push(`High temperature operation: ${temp}°C`)
      return { riskLevel: 'high', factors }
    } else if (temp > 500) {
      factors.push(`Elevated temperature operation: ${temp}°C`)
    }
  }

  // Check pressure
  const pressureMatch = searchText.match(/(\d+)\s*bar/i)
  if (pressureMatch) {
    const pressure = parseInt(pressureMatch[1])
    if (pressure > 100) {
      factors.push(`High pressure operation: ${pressure} bar`)
      return { riskLevel: 'high', factors }
    } else if (pressure > 10) {
      factors.push(`Elevated pressure operation: ${pressure} bar`)
    }
  }

  if (factors.length > 0) {
    return { riskLevel: 'medium', factors }
  }

  return { riskLevel: 'low', factors: ['Standard laboratory conditions'] }
}

// ============================================================================
// Material Complexity Assessment
// ============================================================================

type MaterialComplexity = 'standard' | 'moderate' | 'advanced' | 'novel'

interface ComplexityAssessment {
  complexity: MaterialComplexity
  factors: string[]
}

const ADVANCED_MATERIALS = [
  'perovskite', 'mof', 'cof', 'metal-organic', 'quantum dot',
  'graphene', 'cnt', 'nanotube', 'nanowire', 'single crystal',
]

const NOVEL_MATERIALS = [
  'never before', 'first time', 'unprecedented', 'novel composition',
  'new material', 'unexplored', 'undiscovered',
]

function assessMaterialComplexity(hypothesis: Hypothesis): ComplexityAssessment {
  const searchText = [
    hypothesis.statement,
    hypothesis.title,
    ...(hypothesis.requiredMaterials || []).map(m => m.formula),
  ].join(' ').toLowerCase()

  const factors: string[] = []

  // Check for novel materials
  for (const keyword of NOVEL_MATERIALS) {
    if (searchText.includes(keyword)) {
      factors.push(`Novel material development: ${keyword}`)
      return { complexity: 'novel', factors }
    }
  }

  // Check for advanced materials
  for (const keyword of ADVANCED_MATERIALS) {
    if (searchText.includes(keyword)) {
      factors.push(`Advanced material: ${keyword}`)
    }
  }

  if (factors.length > 0) {
    return { complexity: 'advanced', factors }
  }

  // Check novelty score
  if (hypothesis.noveltyScore > 80) {
    return { complexity: 'advanced', factors: ['High novelty score suggests advanced materials'] }
  }

  if (hypothesis.noveltyScore > 60) {
    return { complexity: 'moderate', factors: ['Moderate novelty score'] }
  }

  return { complexity: 'standard', factors: ['Standard materials'] }
}

// ============================================================================
// Main Tier Selection Logic
// ============================================================================

export interface TierSelectionInput {
  hypothesis: Hypothesis
  targetQuality: TargetQuality
  budgetConstraint?: number      // USD
  timeConstraint?: number        // minutes
  userPreference?: ExperimentTier | 'auto'
}

export async function selectExperimentTier(
  input: TierSelectionInput
): Promise<TierRecommendation> {
  const { hypothesis, targetQuality, budgetConstraint, timeConstraint, userPreference } = input

  // If user explicitly selected a tier (not 'auto'), respect it
  if (userPreference && userPreference !== 'auto') {
    return {
      recommendedTier: userPreference,
      reasoning: ['User explicitly selected this tier'],
      alternativeTiers: [],
    }
  }

  // Assess factors
  const safetyAssessment = assessSafetyRisk(hypothesis)
  const complexityAssessment = assessMaterialComplexity(hypothesis)

  const factors: TierSelectionFactors = {
    hypothesisNoveltyScore: hypothesis.noveltyScore,
    hypothesisFeasibilityScore: hypothesis.feasibilityScore,
    safetyRiskLevel: safetyAssessment.riskLevel,
    materialComplexity: complexityAssessment.complexity,
    targetQuality,
    budgetConstraint,
    timeConstraint,
  }

  // Decision logic
  const reasoning: string[] = []
  const alternativeTiers: TierRecommendation['alternativeTiers'] = []

  // Publication-ready always needs Tier 3
  if (targetQuality === 'publication') {
    reasoning.push('Publication-ready quality requires Tier 3 protocols with DOE and compliance documentation')
    return {
      recommendedTier: 3,
      reasoning,
      alternativeTiers: [
        { tier: 2, tradeoffs: 'Faster but may lack statistical rigor for publication' },
      ],
    }
  }

  // High safety risk needs at least Tier 2, preferably Tier 3
  if (safetyAssessment.riskLevel === 'high') {
    reasoning.push(`High safety risk detected: ${safetyAssessment.factors.join(', ')}`)
    reasoning.push('Tier 3 recommended for comprehensive safety documentation and expert review')
    return {
      recommendedTier: 3,
      reasoning,
      alternativeTiers: [
        { tier: 2, tradeoffs: 'May lack comprehensive safety documentation for high-risk work' },
      ],
      escalationPath: {
        condition: 'If Tier 2 safety analysis reveals additional concerns',
        escalateTo: 3,
      },
    }
  }

  // Novel or advanced materials benefit from Tier 2+
  if (complexityAssessment.complexity === 'novel') {
    reasoning.push(`Novel material development: ${complexityAssessment.factors.join(', ')}`)
    reasoning.push('Tier 3 recommended for novel materials requiring custom protocols')
    return {
      recommendedTier: 3,
      reasoning,
      alternativeTiers: [
        { tier: 2, tradeoffs: 'Standard protocols may not cover novel material handling' },
      ],
    }
  }

  if (complexityAssessment.complexity === 'advanced') {
    reasoning.push(`Advanced materials detected: ${complexityAssessment.factors.join(', ')}`)
    reasoning.push('Tier 2 standard protocols suitable with potential escalation')
    return {
      recommendedTier: 2,
      reasoning,
      alternativeTiers: [
        { tier: 3, tradeoffs: 'More comprehensive but longer generation time' },
        { tier: 1, tradeoffs: 'Quick check but lacks detailed protocol' },
      ],
      escalationPath: {
        condition: 'If characterization reveals unexpected behavior',
        escalateTo: 3,
      },
    }
  }

  // Budget/time constraints
  if (timeConstraint !== undefined && timeConstraint < 5) {
    reasoning.push(`Time constraint (${timeConstraint} min) requires quick feasibility check`)
    return {
      recommendedTier: 1,
      reasoning,
      alternativeTiers: [
        { tier: 2, tradeoffs: 'Better protocol but exceeds time constraint' },
      ],
    }
  }

  // Low-risk, standard materials, exploratory quality
  if (
    safetyAssessment.riskLevel === 'low' &&
    complexityAssessment.complexity === 'standard' &&
    targetQuality === 'exploratory'
  ) {
    reasoning.push('Standard conditions with exploratory quality target')
    reasoning.push('Tier 1 feasibility check is sufficient for initial screening')
    return {
      recommendedTier: 1,
      reasoning,
      alternativeTiers: [
        { tier: 2, tradeoffs: 'Full protocol if proceeding to lab work' },
      ],
      escalationPath: {
        condition: 'If feasibility check passes',
        escalateTo: 2,
      },
    }
  }

  // Default to Tier 2 for validated quality
  reasoning.push('Standard approach for validated quality target')
  reasoning.push(`Safety level: ${safetyAssessment.riskLevel}`)
  reasoning.push(`Material complexity: ${complexityAssessment.complexity}`)
  return {
    recommendedTier: 2,
    reasoning,
    alternativeTiers: [
      { tier: 1, tradeoffs: 'Quick check only, no full protocol' },
      { tier: 3, tradeoffs: 'Publication-grade protocols with DOE' },
    ],
    escalationPath: {
      condition: 'If pursuing publication or discovering unexpected complexity',
      escalateTo: 3,
    },
  }
}

// ============================================================================
// Batch Selection
// ============================================================================

export async function selectTiersForHypotheses(
  hypotheses: Hypothesis[],
  targetQuality: TargetQuality,
  budgetConstraint?: number,
  timeConstraint?: number
): Promise<Map<string, TierRecommendation>> {
  const recommendations = new Map<string, TierRecommendation>()

  await Promise.all(
    hypotheses.map(async (hypothesis) => {
      const recommendation = await selectExperimentTier({
        hypothesis,
        targetQuality,
        budgetConstraint,
        timeConstraint,
      })
      recommendations.set(hypothesis.id, recommendation)
    })
  )

  return recommendations
}

// ============================================================================
// Escalation Logic
// ============================================================================

export interface EscalationContext {
  currentTier: ExperimentTier
  tier1Result?: Awaited<ReturnType<typeof runTier1Feasibility>>
  userFeedback?: 'escalate' | 'keep'
  safetyIssuesDiscovered?: boolean
  complexityIncreased?: boolean
}

export function shouldEscalate(context: EscalationContext): {
  shouldEscalate: boolean
  suggestedTier: ExperimentTier
  reason: string
} {
  const { currentTier, tier1Result, userFeedback, safetyIssuesDiscovered, complexityIncreased } = context

  // User requested escalation
  if (userFeedback === 'escalate') {
    return {
      shouldEscalate: true,
      suggestedTier: Math.min(currentTier + 1, 3) as ExperimentTier,
      reason: 'User requested escalation to higher tier',
    }
  }

  // Safety issues discovered
  if (safetyIssuesDiscovered && currentTier < 3) {
    return {
      shouldEscalate: true,
      suggestedTier: 3,
      reason: 'Safety issues discovered require comprehensive Tier 3 protocols',
    }
  }

  // Complexity increased
  if (complexityIncreased && currentTier < 3) {
    return {
      shouldEscalate: true,
      suggestedTier: Math.min(currentTier + 1, 3) as ExperimentTier,
      reason: 'Increased complexity warrants more detailed protocols',
    }
  }

  // Tier 1 passed but escalation suggested
  if (currentTier === 1 && tier1Result) {
    if (tier1Result.escalationSuggested) {
      return {
        shouldEscalate: true,
        suggestedTier: 2,
        reason: tier1Result.escalationReason || 'Tier 1 check suggests detailed protocol needed',
      }
    }

    if (tier1Result.confidence < 60) {
      return {
        shouldEscalate: true,
        suggestedTier: 2,
        reason: `Low confidence (${tier1Result.confidence}%) requires more thorough analysis`,
      }
    }
  }

  return {
    shouldEscalate: false,
    suggestedTier: currentTier,
    reason: 'Current tier is appropriate',
  }
}

// ============================================================================
// Exports
// ============================================================================

export {
  assessSafetyRisk,
  assessMaterialComplexity,
  type SafetyAssessment,
  type ComplexityAssessment,
  type SafetyRiskLevel,
  type MaterialComplexity,
}
