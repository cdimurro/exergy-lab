/**
 * Simulations Module
 *
 * 3-Tier simulation system:
 * - Tier 1: Rapid Estimation (<30s, ML surrogates, ±20%)
 * - Tier 2: Classical Simulation (1-30 min, GCMC/MD, ±10%)
 * - Tier 3: Quantum/Advanced (30+ min, DFT/ML potentials, ±2%)
 */

// Tier Selection
export {
  selectSimulationTier,
  selectTiersForExperiments,
  shouldEscalateSimulation,
  assessMaterialNovelty,
  getPrecisionFromQuality,
  getRequiredAccuracy,
  type SimulationTierSelectionInput,
  type SimulationEscalationContext,
  type NoveltyAssessment,
  type MaterialNovelty,
  type PrecisionLevel,
} from './tier-selector'

// Re-export types for convenience
export type {
  SimulationTierNumber,
  SimulationTierName,
  SimulationTierCapabilities,
  TierSelectionFactors,
  SimulationTierRecommendation,
  TierEscalation,
  Tier1RapidResult,
  Tier2ClassicalResult,
  Tier3QuantumResult,
  SimulationTierResult,
  SurrogatePrediction,
  MLSurrogateModel,
  GCMCConfig,
  MDConfig,
  ConvergenceMetrics,
} from '@/types/simulation-tiers'

// Re-export config and helpers
export {
  SIMULATION_TIER_CONFIG,
  AVAILABLE_SURROGATE_MODELS,
  getSimulationTierConfig,
  getSimulationTierByName,
  isSimulationTierResult,
  getTierColor,
  getTierBgColor,
} from '@/types/simulation-tiers'
