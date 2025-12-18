/**
 * Simulation Tier Selector
 *
 * Auto-selection logic for choosing the appropriate simulation tier
 * based on material novelty, precision requirements, and budget.
 */

import type { ExperimentDesign } from '@/lib/ai/agents/creative-agent'
import type {
  SimulationTierNumber,
  TierSelectionFactors,
  SimulationTierRecommendation,
  TierEscalation,
  Tier1RapidResult,
} from '@/types/simulation-tiers'
import type { TargetQuality } from '@/types/intervention'

// ============================================================================
// Material Novelty Assessment
// ============================================================================

type MaterialNovelty = 'standard' | 'moderate' | 'novel'

interface NoveltyAssessment {
  novelty: MaterialNovelty
  factors: string[]
  applicabilityScore: number  // 0-100, how well ML models cover this material
}

// Materials well-covered by existing ML models
const STANDARD_MATERIALS = [
  'zeolite', 'mof-5', 'uio-66', 'hkust-1', 'mil-101', 'zif-8',
  'silicon', 'copper', 'iron', 'titanium', 'aluminum',
  'graphite', 'activated carbon', 'silica',
]

// Materials with some ML coverage but may need classical simulation
const MODERATE_MATERIALS = [
  'perovskite', 'halide perovskite', 'metal sulfide', 'metal nitride',
  'covalent organic framework', 'cof', 'porous polymer',
  'mixed metal oxide', 'layered double hydroxide',
]

// Novel materials requiring DFT/advanced methods
const NOVEL_MATERIAL_KEYWORDS = [
  'never synthesized', 'new composition', 'unexplored', 'hypothetical',
  'predicted structure', 'high-entropy', 'disordered',
]

function assessMaterialNovelty(experiment: ExperimentDesign): NoveltyAssessment {
  const searchText = [
    experiment.title,
    experiment.objective,
    ...experiment.materials.map(m => m.name),
  ].join(' ').toLowerCase()

  const factors: string[] = []

  // Check for novel material keywords
  for (const keyword of NOVEL_MATERIAL_KEYWORDS) {
    if (searchText.includes(keyword)) {
      factors.push(`Novel material development: ${keyword}`)
      return { novelty: 'novel', factors, applicabilityScore: 20 }
    }
  }

  // Check for standard materials
  let standardCount = 0
  for (const material of STANDARD_MATERIALS) {
    if (searchText.includes(material)) {
      standardCount++
      factors.push(`Standard material: ${material}`)
    }
  }

  if (standardCount > 0) {
    return {
      novelty: 'standard',
      factors,
      applicabilityScore: 85 + Math.min(standardCount * 5, 15),
    }
  }

  // Check for moderate complexity materials
  for (const material of MODERATE_MATERIALS) {
    if (searchText.includes(material)) {
      factors.push(`Moderate complexity material: ${material}`)
      return { novelty: 'moderate', factors, applicabilityScore: 60 }
    }
  }

  // Default to moderate if no specific matches
  return {
    novelty: 'moderate',
    factors: ['Unclassified material - assuming moderate complexity'],
    applicabilityScore: 50,
  }
}

// ============================================================================
// Precision Requirements
// ============================================================================

type PrecisionLevel = 'screening' | 'validation' | 'publication'

function getPrecisionFromQuality(targetQuality: TargetQuality): PrecisionLevel {
  switch (targetQuality) {
    case 'exploratory':
      return 'screening'
    case 'validated':
      return 'validation'
    case 'publication':
      return 'publication'
  }
}

function getRequiredAccuracy(precision: PrecisionLevel): { min: number; ideal: number } {
  switch (precision) {
    case 'screening':
      return { min: 20, ideal: 15 }   // ±20% acceptable, ±15% ideal
    case 'validation':
      return { min: 10, ideal: 5 }    // ±10% acceptable, ±5% ideal
    case 'publication':
      return { min: 5, ideal: 2 }     // ±5% acceptable, ±2% ideal
  }
}

// ============================================================================
// Main Tier Selection Logic
// ============================================================================

export interface SimulationTierSelectionInput {
  experiment: ExperimentDesign
  targetQuality: TargetQuality
  budgetRemaining: number       // USD
  timeRemaining: number         // minutes
  tier1Result?: Tier1RapidResult
  userPreference?: SimulationTierNumber | 'auto'
}

export async function selectSimulationTier(
  input: SimulationTierSelectionInput
): Promise<SimulationTierRecommendation> {
  const {
    experiment,
    targetQuality,
    budgetRemaining,
    timeRemaining,
    tier1Result,
    userPreference,
  } = input

  // If user explicitly selected a tier (not 'auto'), respect it
  if (userPreference && userPreference !== 'auto') {
    return {
      recommendedTier: userPreference,
      reasoning: ['User explicitly selected this tier'],
      alternativeTiers: [],
    }
  }

  // Assess factors
  const noveltyAssessment = assessMaterialNovelty(experiment)
  const precision = getPrecisionFromQuality(targetQuality)
  const requiredAccuracy = getRequiredAccuracy(precision)

  const reasoning: string[] = []
  const alternativeTiers: SimulationTierRecommendation['alternativeTiers'] = []

  // Publication quality always needs Tier 3
  if (precision === 'publication') {
    reasoning.push('Publication-quality results require Tier 3 (DFT/ML potentials)')
    reasoning.push(`Target accuracy: ±${requiredAccuracy.ideal}%`)
    return {
      recommendedTier: 3,
      reasoning,
      alternativeTiers: [
        { tier: 2, tradeoffs: '±10% accuracy may not meet publication standards' },
      ],
    }
  }

  // Novel materials need at least Tier 2, preferably Tier 3
  if (noveltyAssessment.novelty === 'novel') {
    reasoning.push(`Novel material detected: ${noveltyAssessment.factors.join(', ')}`)
    reasoning.push('ML surrogates unlikely to cover this material')

    if (budgetRemaining >= 1) {
      reasoning.push('Tier 3 recommended for accurate results on novel materials')
      return {
        recommendedTier: 3,
        reasoning,
        alternativeTiers: [
          { tier: 2, tradeoffs: 'Classical force fields may be inaccurate for novel materials' },
        ],
      }
    } else {
      reasoning.push('Budget constraint - Tier 2 with caution for novel materials')
      return {
        recommendedTier: 2,
        reasoning,
        alternativeTiers: [
          { tier: 3, tradeoffs: 'More accurate but exceeds budget' },
        ],
        escalationPath: {
          fromTier: 2,
          toTier: 3,
          reason: 'Force field may not capture novel material behavior',
          automaticEscalation: false,
          userApprovalRequired: true,
          estimatedAdditionalCost: 2,
          estimatedAdditionalTime: 30,
        },
      }
    }
  }

  // Check if Tier 1 confidence is sufficient
  if (tier1Result) {
    if (tier1Result.confidence >= 80 && precision === 'screening') {
      reasoning.push(`Tier 1 confidence: ${tier1Result.confidence}% is sufficient for screening`)
      return {
        recommendedTier: 1,
        reasoning,
        alternativeTiers: [
          { tier: 2, tradeoffs: 'More accurate but longer execution time' },
        ],
        escalationPath: {
          fromTier: 1,
          toTier: 2,
          reason: 'If Tier 1 predictions need validation',
          automaticEscalation: false,
          userApprovalRequired: true,
          estimatedAdditionalCost: 0,
          estimatedAdditionalTime: 15,
        },
      }
    }

    if (tier1Result.escalationRecommended) {
      reasoning.push(`Tier 1 recommended escalation: ${tier1Result.escalationReason}`)
    }
  }

  // Budget/time constraints
  if (budgetRemaining < 0.5) {
    reasoning.push('Budget constraint limits to Tier 1-2')
    if (timeRemaining < 10) {
      reasoning.push('Time constraint requires Tier 1')
      return {
        recommendedTier: 1,
        reasoning,
        alternativeTiers: [],
      }
    }
    return {
      recommendedTier: 2,
      reasoning,
      alternativeTiers: [
        { tier: 1, tradeoffs: 'Faster but less accurate' },
      ],
    }
  }

  if (timeRemaining < 5) {
    reasoning.push(`Time constraint (${timeRemaining} min) requires Tier 1`)
    return {
      recommendedTier: 1,
      reasoning,
      alternativeTiers: [
        { tier: 2, tradeoffs: 'Would exceed time constraint' },
      ],
    }
  }

  // Standard/moderate materials with validation quality
  if (noveltyAssessment.novelty === 'standard') {
    reasoning.push(`Standard materials with good ML coverage (${noveltyAssessment.applicabilityScore}%)`)

    if (precision === 'screening') {
      reasoning.push('Tier 1 ML surrogates are well-suited')
      return {
        recommendedTier: 1,
        reasoning,
        alternativeTiers: [
          { tier: 2, tradeoffs: 'More accurate but unnecessary for screening' },
        ],
        escalationPath: {
          fromTier: 1,
          toTier: 2,
          reason: 'If predictions need classical simulation validation',
          automaticEscalation: false,
          userApprovalRequired: false,
          estimatedAdditionalCost: 0,
          estimatedAdditionalTime: 10,
        },
      }
    }

    reasoning.push('Tier 2 classical simulation for validation-quality results')
    return {
      recommendedTier: 2,
      reasoning,
      alternativeTiers: [
        { tier: 1, tradeoffs: 'Quick screening but ±20% accuracy' },
        { tier: 3, tradeoffs: 'Publication-grade but higher cost' },
      ],
    }
  }

  // Default to Tier 2 for moderate complexity
  reasoning.push(`Material complexity: ${noveltyAssessment.novelty}`)
  reasoning.push(`Precision required: ${precision} (±${requiredAccuracy.min}%)`)
  reasoning.push('Tier 2 classical simulation provides good balance')

  return {
    recommendedTier: 2,
    reasoning,
    alternativeTiers: [
      { tier: 1, tradeoffs: 'Quick but ML models may have limited coverage' },
      { tier: 3, tradeoffs: 'Higher accuracy but longer/more expensive' },
    ],
    escalationPath: {
      fromTier: 2,
      toTier: 3,
      reason: 'If classical simulation shows unexpected behavior or higher precision needed',
      automaticEscalation: false,
      userApprovalRequired: true,
      estimatedAdditionalCost: 1.5,
      estimatedAdditionalTime: 45,
    },
  }
}

// ============================================================================
// Escalation Logic
// ============================================================================

export interface SimulationEscalationContext {
  currentTier: SimulationTierNumber
  tier1Result?: Tier1RapidResult
  convergenceFailed?: boolean
  unexpectedResults?: boolean
  userRequest?: boolean
  targetPrecision: PrecisionLevel
}

export function shouldEscalateSimulation(
  context: SimulationEscalationContext
): TierEscalation | null {
  const {
    currentTier,
    tier1Result,
    convergenceFailed,
    unexpectedResults,
    userRequest,
    targetPrecision,
  } = context

  if (currentTier === 3) {
    // Already at highest tier
    return null
  }

  // User explicitly requested escalation
  if (userRequest) {
    return {
      fromTier: currentTier,
      toTier: (currentTier + 1) as SimulationTierNumber,
      reason: 'User requested escalation to higher tier',
      automaticEscalation: false,
      userApprovalRequired: false,
      estimatedAdditionalCost: currentTier === 1 ? 0 : 1.5,
      estimatedAdditionalTime: currentTier === 1 ? 15 : 45,
    }
  }

  // Convergence failed
  if (convergenceFailed) {
    return {
      fromTier: currentTier,
      toTier: (currentTier + 1) as SimulationTierNumber,
      reason: 'Simulation did not converge - higher tier may provide better results',
      automaticEscalation: true,
      userApprovalRequired: true,
      estimatedAdditionalCost: currentTier === 1 ? 0 : 2,
      estimatedAdditionalTime: currentTier === 1 ? 20 : 60,
    }
  }

  // Unexpected results that need verification
  if (unexpectedResults) {
    return {
      fromTier: currentTier,
      toTier: (currentTier + 1) as SimulationTierNumber,
      reason: 'Unexpected results detected - verification with higher tier recommended',
      automaticEscalation: false,
      userApprovalRequired: true,
      estimatedAdditionalCost: currentTier === 1 ? 0 : 1.5,
      estimatedAdditionalTime: currentTier === 1 ? 15 : 45,
    }
  }

  // Tier 1 with low confidence
  if (currentTier === 1 && tier1Result && tier1Result.confidence < 60) {
    return {
      fromTier: 1,
      toTier: 2,
      reason: `Low confidence (${tier1Result.confidence}%) - classical simulation recommended`,
      automaticEscalation: true,
      userApprovalRequired: false,
      estimatedAdditionalCost: 0,
      estimatedAdditionalTime: 15,
    }
  }

  // Precision requirements not met
  if (currentTier === 1 && targetPrecision === 'validation') {
    return {
      fromTier: 1,
      toTier: 2,
      reason: 'Validation-quality precision requires classical simulation',
      automaticEscalation: true,
      userApprovalRequired: false,
      estimatedAdditionalCost: 0,
      estimatedAdditionalTime: 15,
    }
  }

  if (currentTier <= 2 && targetPrecision === 'publication') {
    return {
      fromTier: currentTier,
      toTier: 3,
      reason: 'Publication-quality precision requires DFT/ML potentials',
      automaticEscalation: true,
      userApprovalRequired: true,
      estimatedAdditionalCost: 2,
      estimatedAdditionalTime: 60,
    }
  }

  return null
}

// ============================================================================
// Batch Selection for Multiple Experiments
// ============================================================================

export async function selectTiersForExperiments(
  experiments: ExperimentDesign[],
  targetQuality: TargetQuality,
  totalBudget: number,
  totalTime: number
): Promise<Map<string, SimulationTierRecommendation>> {
  const recommendations = new Map<string, SimulationTierRecommendation>()

  // Distribute budget/time across experiments
  const budgetPerExperiment = totalBudget / experiments.length
  const timePerExperiment = totalTime / experiments.length

  await Promise.all(
    experiments.map(async (experiment) => {
      const recommendation = await selectSimulationTier({
        experiment,
        targetQuality,
        budgetRemaining: budgetPerExperiment,
        timeRemaining: timePerExperiment,
      })
      recommendations.set(experiment.id, recommendation)
    })
  )

  return recommendations
}

// ============================================================================
// Exports
// ============================================================================

export {
  assessMaterialNovelty,
  getPrecisionFromQuality,
  getRequiredAccuracy,
  type NoveltyAssessment,
  type MaterialNovelty,
  type PrecisionLevel,
}
