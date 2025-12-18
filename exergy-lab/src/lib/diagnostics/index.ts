/**
 * Diagnostics Module
 *
 * Enhanced logging and diagnostic reporting for the Discovery Engine.
 */

// Types
export type {
  DiagnosticType,
  DiagnosticLogEntry,
  DiagnosticData,
  RubricEvaluationLog,
  RubricItemLog,
  BenchmarkResultLog,
  BenchmarkItemLog,
  InputVariationLog,
  SensitivityLevel,
  QueryVariationResult,
  AgentReasoningLog,
  ReasoningStep,
  SelfCritiqueLog,
  PhaseTransitionLog,
  ErrorRecoveryLog,
  DiagnosticReport,
  ProblematicItem,
  PhaseStatistics,
  DiagnosticRecommendation,
  SensitivitySummary,
  DiagnosticSessionIndex,
} from './types'

// Constants
export { DIAGNOSTIC_STORAGE_KEYS } from './types'

// Logger service
export { diagnosticLogger, DiagnosticLogger } from './diagnostic-logger'
