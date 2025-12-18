/**
 * Experiments Module
 *
 * 3-Tier experiment design system:
 * - Tier 1: Rapid Feasibility (<1 min)
 * - Tier 2: Standard Lab Protocol (5-30 min)
 * - Tier 3: Advanced Validation (30+ min)
 */

// Tier 1: Rapid Feasibility
export {
  runTier1Feasibility,
  THERMODYNAMIC_LIMITS,
  checkThermodynamicLimits,
  screenSafetyHazards,
  searchLiteraturePrecedent,
  checkMaterialsProjectStability,
} from './tier1-feasibility'

// Tier Selection
export {
  selectExperimentTier,
  selectTiersForHypotheses,
  shouldEscalate,
  assessSafetyRisk,
  assessMaterialComplexity,
  type TierSelectionInput,
  type SafetyAssessment,
  type ComplexityAssessment,
  type SafetyRiskLevel,
  type MaterialComplexity,
  type EscalationContext,
} from './tier-selector'

// Re-export types for convenience
export type {
  ExperimentTier,
  ExperimentTierName,
  ExperimentTierCapabilities,
  Tier1FeasibilityResult,
  Tier2StandardProtocol,
  Tier3AdvancedProtocol,
  ExperimentTierResult,
  TierSelectionFactors,
  TierRecommendation,
  ThermodynamicCheck,
  SafetyFlag,
  LiteratureSupport,
} from '@/types/experiment-tiers'
