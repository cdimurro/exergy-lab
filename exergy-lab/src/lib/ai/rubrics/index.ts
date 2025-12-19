/**
 * FrontierScience Rubrics Module
 *
 * Exports all rubric types, templates, and utilities for the
 * FrontierScience Discovery Engine.
 */

// Core types
export type {
  DiscoveryPhase,
  LegacyDiscoveryPhase,
  RubricCategory,
  PartialCondition,
  RubricItem,
  ItemScore,
  RubricMetadata,
  Rubric,
  JudgeResult,
  RefinementHints,
  RefinementIteration,
  RefinementConfig,
  RefinementResult,
  DiscoveryQuality,
  PhaseResult,
  DiscoveryResult,
  PartialDiscoveryResult,
  FailureMode,
  RecoveryRecommendation,
  PublicationPackage,
  Citation,
  Figure,
  DataTable,
} from './types'

// Type utilities
export {
  DEFAULT_REFINEMENT_CONFIG,
  PHASE_REFINEMENT_CONFIG,
  ALL_DISCOVERY_PHASES,
  LEGACY_TO_CONSOLIDATED_PHASE,
  classifyDiscoveryQuality,
  getQualityDescription,
  validateRubric,
  calculateOverallScore,
  calculateOverallScoreLegacy,
} from './types'

// Judge
export {
  RubricJudge,
  judgeResponse,
  batchJudge,
  DEFAULT_JUDGE_CONFIG,
} from './judge'
export type { JudgeConfig } from './judge'

// Refinement Engine
export {
  RefinementEngine,
  refineUntilPass,
  refineWithProgress,
  formatHintsForPrompt,
  createRefinableGenerator,
} from './refinement-engine'
export type { RefinementEngineConfig } from './refinement-engine'

// Rubric Templates (Legacy - 12 phases)
export { RESEARCH_RUBRIC } from './templates/research'
export { HYPOTHESIS_RUBRIC } from './templates/hypothesis'
export { SIMULATION_RUBRIC, THERMODYNAMIC_LIMITS } from './templates/simulation'

// Rubric Templates (Consolidated - 4 phases)
export { RESEARCH_CONSOLIDATED_RUBRIC } from './templates/research-consolidated'
export { HYPOTHESIS_CONSOLIDATED_RUBRIC } from './templates/hypothesis-consolidated'
export { VALIDATION_CONSOLIDATED_RUBRIC } from './templates/validation-consolidated'
export { OUTPUT_CONSOLIDATED_RUBRIC } from './templates/output-consolidated'

// Criterion name mappings for UI display
export {
  getCriterionInfo,
  getCriterionName,
  getCriterionShortName,
  getCriterionDescription,
  getCategoryLabel,
  getCriteriaForPhase,
  RESEARCH_CRITERIA,
  HYPOTHESIS_CRITERIA,
  VALIDATION_CRITERIA,
  OUTPUT_CRITERIA,
  ALL_CRITERIA,
} from './criterion-names'
export type { CriterionInfo } from './criterion-names'

// Import consolidated rubrics for RUBRICS map
import { RESEARCH_CONSOLIDATED_RUBRIC } from './templates/research-consolidated'
import { HYPOTHESIS_CONSOLIDATED_RUBRIC } from './templates/hypothesis-consolidated'
import { VALIDATION_CONSOLIDATED_RUBRIC } from './templates/validation-consolidated'
import { OUTPUT_CONSOLIDATED_RUBRIC } from './templates/output-consolidated'
import type { Rubric, DiscoveryPhase } from './types'

/**
 * Consolidated 4-phase rubrics map
 * This is the primary rubric map for the discovery engine
 */
export const RUBRICS: Record<DiscoveryPhase, Rubric> = {
  research: RESEARCH_CONSOLIDATED_RUBRIC,
  hypothesis: HYPOTHESIS_CONSOLIDATED_RUBRIC,
  validation: VALIDATION_CONSOLIDATED_RUBRIC,
  output: OUTPUT_CONSOLIDATED_RUBRIC,
}

// Legacy rubrics for backward compatibility
import { RESEARCH_RUBRIC } from './templates/research'
import { HYPOTHESIS_RUBRIC } from './templates/hypothesis'
import { SIMULATION_RUBRIC } from './templates/simulation'
import type { LegacyDiscoveryPhase } from './types'

export const LEGACY_RUBRICS: Partial<Record<LegacyDiscoveryPhase, Rubric>> = {
  research: RESEARCH_RUBRIC,
  hypothesis: HYPOTHESIS_RUBRIC,
  simulation: SIMULATION_RUBRIC,
}

/**
 * Get rubric for a specific phase
 */
export function getRubricForPhase(phase: DiscoveryPhase): Rubric | undefined {
  return RUBRICS[phase]
}

/**
 * Check if a phase has a rubric defined
 */
export function hasRubric(phase: DiscoveryPhase): boolean {
  return phase in RUBRICS
}

/**
 * Get all phases that have rubrics
 */
export function getPhasesWithRubrics(): DiscoveryPhase[] {
  return Object.keys(RUBRICS) as DiscoveryPhase[]
}
