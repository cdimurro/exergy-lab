/**
 * Diagnostics Module - v0.0.3
 *
 * Enhanced logging and diagnostic reporting for the Discovery Engine
 * and Breakthrough Engine.
 *
 * Features:
 * - Comprehensive rubric evaluation logging
 * - Multi-benchmark result tracking
 * - LLM call metrics and cost tracking
 * - Performance profiling
 * - Data source integration metrics
 * - UI state tracking
 * - SSE connection health monitoring
 */

// Types - Discovery Engine (Core)
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

// Types - Discovery Engine (v0.0.3 Enhancements)
export type {
  LLMCallDiagnostic,
  PerformanceProfile,
  PerformanceMetricsSummary,
  DataSourceDiagnostic,
  DataSourceMetricsSummary,
  SSEHealthLog,
  SSEHealthMetrics,
  UIEventType,
  UIEventLog,
  UIMetricsSummary,
  CostBreakdown,
  ExtendedDiagnosticReport,
  ExtendedDiagnosticSessionIndex,
  DiagnosticStreamEvent,
  AlertSeverity,
  AlertCategory,
  DiagnosticAlert,
  AlertThresholds,
  DiagnosticExportOptions,
} from './types'

// Constants
export {
  DIAGNOSTIC_STORAGE_KEYS,
  DEFAULT_ALERT_THRESHOLDS,
  DEFAULT_DIAGNOSTIC_EXPORT_OPTIONS,
} from './types'

// Logger service - Discovery Engine
export { diagnosticLogger, DiagnosticLogger } from './diagnostic-logger'

// Breakthrough Engine diagnostics
export {
  BreakthroughDiagnosticLogger,
  getBreakthroughLogger,
  resetBreakthroughLogger,
} from './breakthrough-logger'

export {
  formatBreakthroughSession,
} from './breakthrough-formatter'
