/**
 * FrontierScience Discovery Agents Module
 *
 * Exports all specialized agents for the 12-phase discovery pipeline.
 */

// Research Agent
export {
  ResearchAgent,
  createResearchAgent,
} from './research-agent'
export type {
  Source,
  KeyFinding,
  TechnologicalGap,
  CrossDomainInsight,
  MaterialData,
  ResearchResult,
  ResearchConfig,
} from './research-agent'

// Creative Agent
export {
  CreativeAgent,
  createCreativeAgent,
} from './creative-agent'
export type {
  Prediction,
  Variable,
  Mechanism,
  Hypothesis,
  ExperimentMaterial,
  ExperimentEquipment,
  ProcedureStep,
  SafetyRequirement,
  FailureMode,
  ExperimentDesign,
  CreativeConfig,
} from './creative-agent'

// Critical Agent
export {
  CriticalAgent,
  createCriticalAgent,
  PHYSICAL_BENCHMARKS,
} from './critical-agent'
export type {
  PhysicalBenchmark,
  ValidationCheck,
  ValidationResult,
} from './critical-agent'

// Discovery Orchestrator
export {
  DiscoveryOrchestrator,
  createDiscoveryOrchestrator,
  streamDiscovery,
} from './discovery-orchestrator'
export type {
  DiscoveryConfig,
  PhaseProgress,
  ProgressCallback,
  IterationEvent,
  IterationCallback,
  ThinkingEvent,
  ThinkingCallback,
} from './discovery-orchestrator'

// Re-export key types from rubrics for convenience
export type {
  DiscoveryResult,
  PhaseResult,
  DiscoveryQuality,
} from '../rubrics/types'
