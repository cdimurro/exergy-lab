/**
 * FrontierScience Rubrics Module
 *
 * Exports all rubric types, templates, and utilities for the
 * FrontierScience Discovery Engine.
 */

// Core types
export type {
  DiscoveryPhase,
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
  PublicationPackage,
  Citation,
  Figure,
  DataTable,
} from './types'

// Type utilities
export {
  DEFAULT_REFINEMENT_CONFIG,
  classifyDiscoveryQuality,
  getQualityDescription,
  validateRubric,
  calculateOverallScore,
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

// Rubric Templates
export { RESEARCH_RUBRIC } from './templates/research'
export { HYPOTHESIS_RUBRIC } from './templates/hypothesis'
export { SIMULATION_RUBRIC, THERMODYNAMIC_LIMITS } from './templates/simulation'

// All rubrics in a convenient map
import { RESEARCH_RUBRIC } from './templates/research'
import { HYPOTHESIS_RUBRIC } from './templates/hypothesis'
import { SIMULATION_RUBRIC } from './templates/simulation'
import type { Rubric, DiscoveryPhase } from './types'

export const RUBRICS: Partial<Record<DiscoveryPhase, Rubric>> = {
  research: RESEARCH_RUBRIC,
  hypothesis: HYPOTHESIS_RUBRIC,
  simulation: SIMULATION_RUBRIC,
  // Additional rubrics to be added:
  // synthesis: SYNTHESIS_RUBRIC,
  // screening: SCREENING_RUBRIC,
  // experiment: EXPERIMENT_RUBRIC,
  // exergy: EXERGY_RUBRIC,
  // tea: TEA_RUBRIC,
  // patent: PATENT_RUBRIC,
  // validation: VALIDATION_RUBRIC,
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
