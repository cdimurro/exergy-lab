/**
 * Enhanced Diagnostics Logging Types - v0.0.3
 *
 * Provides structured logging for rubric evaluations, benchmark results,
 * input sensitivity analysis, and agent reasoning to enable better
 * debugging and user insights.
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

import type { DiscoveryPhase } from '../ai/rubrics/types'
import type { BenchmarkType, BenchmarkCategory } from '../ai/validation/types'

// ============================================================================
// Diagnostic Entry Types
// ============================================================================

export type DiagnosticType =
  | 'rubric_evaluation'   // Per-item rubric scores with reasoning
  | 'benchmark_result'    // Multi-benchmark results
  | 'input_variation'     // Sensitivity analysis results
  | 'agent_reasoning'     // Agent thought process and self-critique
  | 'phase_transition'    // Phase start/end with context
  | 'error_recovery'      // Error handling and recovery actions

export interface DiagnosticLogEntry {
  id: string
  timestamp: number
  sessionId: string
  discoveryId?: string
  type: DiagnosticType
  data: DiagnosticData
}

export type DiagnosticData =
  | RubricEvaluationLog
  | BenchmarkResultLog
  | InputVariationLog
  | AgentReasoningLog
  | PhaseTransitionLog
  | ErrorRecoveryLog

// ============================================================================
// Rubric Evaluation Logging
// ============================================================================

export interface RubricEvaluationLog {
  type: 'rubric_evaluation'
  phase: DiscoveryPhase
  iteration: number
  items: RubricItemLog[]
  totalScore: number
  maxScore: number
  passed: boolean
  threshold: number
  evaluationMethod: 'automated' | 'ai' | 'hybrid'
  evaluationDurationMs: number
  modelUsed?: string
}

export interface RubricItemLog {
  id: string
  name: string
  description: string
  score: number
  maxScore: number
  passed: boolean
  reasoning: string
  passCondition: string
  category?: string
  evidence?: string[]
  partialCredits?: {
    condition: string
    points: number
    earned: boolean
  }[]
  evaluationTimeMs: number
  failedValidators?: string[]
}

// ============================================================================
// Benchmark Result Logging
// ============================================================================

export interface BenchmarkResultLog {
  type: 'benchmark_result'
  benchmarkType: BenchmarkType
  items: BenchmarkItemLog[]
  aggregatedScore: number
  maxScore: number
  passed: boolean
  confidence: number
  weight: number
  effectiveWeight: number
  discrepancies?: string[]
  evaluationDurationMs: number
}

export interface BenchmarkItemLog {
  id: string
  name: string
  score: number
  maxScore: number
  passed: boolean
  reasoning: string
  category: BenchmarkCategory
  suggestions?: string[]
}

// ============================================================================
// Input Variation / Sensitivity Logging
// ============================================================================

export interface InputVariationLog {
  type: 'input_variation'
  originalQuery: string
  variations: QueryVariationResult[]
  sensitivity: SensitivityLevel
  scoreRange: {
    min: number
    max: number
    mean: number
    stdDev: number
  }
  recommendations: string[]
  analysisMethod: string
}

export type SensitivityLevel = 'low' | 'medium' | 'high'

export interface QueryVariationResult {
  query: string
  variationStrategy: string
  score: number
  scoreDelta: number           // Difference from original
  passedPhases: DiscoveryPhase[]
  failedPhases: DiscoveryPhase[]
  evaluationTimeMs: number
}

// ============================================================================
// Agent Reasoning Logging
// ============================================================================

export interface AgentReasoningLog {
  type: 'agent_reasoning'
  agentType: string
  agentId?: string
  phase: DiscoveryPhase
  reasoning: ReasoningStep[]
  selfCritique?: SelfCritiqueLog
  totalDurationMs: number
  tokensUsed?: number
}

export interface ReasoningStep {
  step: number
  timestamp: number
  thought: string
  action: string
  observation?: string
  confidence: number
  durationMs: number
}

export interface SelfCritiqueLog {
  strengths: string[]
  weaknesses: string[]
  improvements: string[]
  overallAssessment: string
  confidenceScore: number
}

// ============================================================================
// Phase Transition Logging
// ============================================================================

export interface PhaseTransitionLog {
  type: 'phase_transition'
  phase: DiscoveryPhase
  event: 'start' | 'complete' | 'failed' | 'skipped'
  previousPhase?: DiscoveryPhase
  score?: number
  passed?: boolean
  reason?: string
  context?: Record<string, any>
  durationMs?: number
}

// ============================================================================
// Error Recovery Logging
// ============================================================================

export interface ErrorRecoveryLog {
  type: 'error_recovery'
  errorType: string
  errorMessage: string
  phase?: DiscoveryPhase
  recoveryAction: 'retry' | 'fallback' | 'skip' | 'abort'
  recoverySuccessful: boolean
  attemptsCount: number
  fallbackResult?: any
  context?: Record<string, any>
}

// ============================================================================
// Diagnostic Report Types
// ============================================================================

export interface DiagnosticReport {
  sessionId: string
  discoveryId?: string
  generatedAt: number
  totalEvaluations: number
  totalDurationMs: number
  problematicItems: ProblematicItem[]
  phaseStatistics: PhaseStatistics[]
  recommendations: DiagnosticRecommendation[]
  sensitivitySummary?: SensitivitySummary
}

export interface ProblematicItem {
  id: string
  name: string
  phase: DiscoveryPhase
  attempts: number
  failures: number
  failureRate: number
  averageScore: number
  commonReasons: string[]
}

export interface PhaseStatistics {
  phase: DiscoveryPhase
  evaluations: number
  passed: number
  failed: number
  passRate: number
  averageScore: number
  averageIterations: number
  averageDurationMs: number
}

export interface DiagnosticRecommendation {
  priority: 'high' | 'medium' | 'low'
  category: 'query' | 'rubric' | 'process' | 'model'
  issue: string
  suggestion: string
  relatedItems?: string[]
  relatedPhases?: DiscoveryPhase[]
}

export interface SensitivitySummary {
  testsRun: number
  overallSensitivity: SensitivityLevel
  mostSensitivePhases: DiscoveryPhase[]
  bestPerformingVariation?: {
    query: string
    scoreDelta: number
  }
}

// ============================================================================
// Session Index
// ============================================================================

export interface DiagnosticSessionIndex {
  sessionId: string
  startTime: number
  endTime?: number
  discoveryId?: string
  query?: string
  status: 'running' | 'completed' | 'failed'
  logCount: number
  finalScore?: number
}

// ============================================================================
// Storage Keys
// ============================================================================

export const DIAGNOSTIC_STORAGE_KEYS = {
  sessionIndex: 'diagnostic_sessions',
  sessionPrefix: 'diagnostics_',
  maxSessions: 20,
} as const

// ============================================================================
// LLM Call Logging (v0.0.3)
// ============================================================================

export interface LLMCallDiagnostic {
  id: string
  timestamp: number
  model: string
  provider: 'google' | 'openai' | 'anthropic' | 'other'
  purpose: 'research' | 'hypothesis' | 'validation' | 'synthesis' | 'critique' | 'other'
  phase: DiscoveryPhase
  inputTokens: number
  outputTokens: number
  totalTokens: number
  costEstimateUSD: number
  latencyMs: number
  success: boolean
  errorMessage?: string
  retryCount: number
  fallbackUsed: boolean
  promptTemplateId?: string
  responseQuality?: 'high' | 'medium' | 'low'
  cacheHit: boolean
}

// ============================================================================
// Performance Profiling (v0.0.3)
// ============================================================================

export interface PerformanceProfile {
  timestamp: number
  phase: DiscoveryPhase
  operation: string
  durationMs: number
  success: boolean
  metadata?: Record<string, unknown>
}

export interface PerformanceMetricsSummary {
  totalDurationMs: number
  phaseBreakdown: Record<DiscoveryPhase, {
    durationMs: number
    operations: number
    avgOperationMs: number
  }>
  llmMetrics: {
    totalCalls: number
    totalTokens: number
    totalCostUSD: number
    avgLatencyMs: number
    errorRate: number
    cacheHitRate: number
  }
  bottlenecks: {
    phase: DiscoveryPhase
    operation: string
    avgDurationMs: number
    count: number
  }[]
}

// ============================================================================
// Data Source Logging (v0.0.3)
// ============================================================================

export interface DataSourceDiagnostic {
  id: string
  timestamp: number
  source: string
  operation: 'search' | 'fetch' | 'embed' | 'analyze'
  query?: string
  resultsCount: number
  latencyMs: number
  success: boolean
  errorMessage?: string
  cacheHit: boolean
  qualityScore?: number
  relevanceScore?: number
}

export interface DataSourceMetricsSummary {
  totalCalls: number
  successRate: number
  cacheHitRate: number
  avgLatencyMs: number
  bySource: Record<string, {
    calls: number
    successRate: number
    avgLatencyMs: number
    cacheHitRate: number
    avgQualityScore: number
  }>
}

// ============================================================================
// SSE Connection Health (v0.0.3)
// ============================================================================

export interface SSEHealthLog {
  timestamp: number
  event: 'connect' | 'disconnect' | 'reconnect' | 'heartbeat' | 'error'
  latencyMs?: number
  errorMessage?: string
  connectionId?: string
}

export interface SSEHealthMetrics {
  connectionAttempts: number
  successfulConnections: number
  reconnections: number
  missedHeartbeats: number
  avgHeartbeatLatencyMs: number
  errors: { timestamp: number; message: string }[]
  uptime: number
  downtimeMs: number
}

// ============================================================================
// UI State Tracking (v0.0.3)
// ============================================================================

export type UIEventType =
  | 'render'
  | 'state_change'
  | 'user_interaction'
  | 'error_display'
  | 'loading_start'
  | 'loading_end'
  | 'modal_open'
  | 'modal_close'

export interface UIEventLog {
  id: string
  timestamp: number
  type: UIEventType
  component: string
  durationMs?: number
  details?: Record<string, unknown>
}

export interface UIMetricsSummary {
  totalRenders: number
  avgRenderTimeMs: number
  slowRenders: { component: string; durationMs: number; timestamp: number }[]
  stateChanges: number
  userInteractions: number
  errors: number
  componentRenderCounts: Record<string, number>
}

// ============================================================================
// Cost Tracking (v0.0.3)
// ============================================================================

export interface CostBreakdown {
  totalCostUSD: number
  byPhase: Record<DiscoveryPhase, number>
  byModel: Record<string, number>
  byOperation: Record<string, number>
  tokensUsed: {
    input: number
    output: number
    total: number
  }
  efficiency: {
    costPerIteration: number
    costPerPhase: Record<DiscoveryPhase, number>
    costEfficiencyRating: 'high' | 'medium' | 'low'
  }
}

// ============================================================================
// Extended Diagnostic Report (v0.0.3)
// ============================================================================

export interface ExtendedDiagnosticReport extends DiagnosticReport {
  // New comprehensive fields
  llmMetrics?: PerformanceMetricsSummary['llmMetrics']
  dataSourceMetrics?: DataSourceMetricsSummary
  sseHealthMetrics?: SSEHealthMetrics
  uiMetrics?: UIMetricsSummary
  costBreakdown?: CostBreakdown

  // Quality indicators
  qualityIndicators?: {
    overallScore: number
    phaseScores: Record<DiscoveryPhase, number>
    passRateByPhase: Record<DiscoveryPhase, number>
    iterationsToPass: Record<DiscoveryPhase, number>
  }

  // System info
  systemInfo?: {
    userAgent?: string
    platform?: string
    timezone?: string
    sessionStart: string
    sessionEnd?: string
  }
}

// ============================================================================
// Diagnostic Session with Enhanced Tracking (v0.0.3)
// ============================================================================

export interface ExtendedDiagnosticSessionIndex extends DiagnosticSessionIndex {
  // Enhanced metadata
  phaseReached?: DiscoveryPhase
  totalIterations?: number
  passedPhases?: DiscoveryPhase[]
  failedPhases?: DiscoveryPhase[]
  totalCostUSD?: number
  totalTokensUsed?: number
  errorCount?: number
  warningCount?: number
}

// ============================================================================
// Diagnostic Event Streaming (v0.0.3)
// ============================================================================

export interface DiagnosticStreamEvent {
  id: string
  timestamp: number
  sessionId: string
  eventType: 'log' | 'metric' | 'alert' | 'summary'
  priority: 'low' | 'medium' | 'high' | 'critical'
  data: DiagnosticData | PerformanceProfile | LLMCallDiagnostic | DataSourceDiagnostic
}

// ============================================================================
// Alert System (v0.0.3)
// ============================================================================

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical'
export type AlertCategory = 'performance' | 'quality' | 'cost' | 'connection' | 'error'

export interface DiagnosticAlert {
  id: string
  timestamp: number
  sessionId: string
  severity: AlertSeverity
  category: AlertCategory
  message: string
  details?: Record<string, unknown>
  resolved?: boolean
  resolvedAt?: number
  resolutionNote?: string
}

export interface AlertThresholds {
  llmLatencyMs: number  // Alert if LLM call exceeds this
  llmErrorRate: number  // Alert if error rate exceeds this percentage
  costPerSession: number  // Alert if cost exceeds this USD amount
  missedHeartbeats: number  // Alert after this many missed heartbeats
  phaseTimeoutMs: number  // Alert if phase exceeds this duration
  lowScoreThreshold: number  // Alert if score falls below this
}

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  llmLatencyMs: 30000,  // 30 seconds
  llmErrorRate: 0.2,  // 20%
  costPerSession: 5.0,  // $5
  missedHeartbeats: 3,
  phaseTimeoutMs: 120000,  // 2 minutes
  lowScoreThreshold: 4.0,  // out of 10
}

// ============================================================================
// Export Configuration (v0.0.3)
// ============================================================================

export interface DiagnosticExportOptions {
  format: 'json' | 'markdown' | 'csv' | 'analysis'
  includeRubricLogs: boolean
  includeBenchmarkLogs: boolean
  includeAgentReasoning: boolean
  includePhaseTransitions: boolean
  includeErrorRecovery: boolean
  includeLLMCalls: boolean
  includePerformanceProfiles: boolean
  includeDataSourceLogs: boolean
  includeSSEHealth: boolean
  includeUIEvents: boolean
  includeCostBreakdown: boolean
  includeAlerts: boolean
  maxEntriesPerType?: number
  filterByPhase?: DiscoveryPhase[]
  filterByTimeRange?: { start: number; end: number }
}

export const DEFAULT_DIAGNOSTIC_EXPORT_OPTIONS: DiagnosticExportOptions = {
  format: 'analysis',
  includeRubricLogs: true,
  includeBenchmarkLogs: true,
  includeAgentReasoning: true,
  includePhaseTransitions: true,
  includeErrorRecovery: true,
  includeLLMCalls: true,
  includePerformanceProfiles: false,
  includeDataSourceLogs: true,
  includeSSEHealth: true,
  includeUIEvents: false,
  includeCostBreakdown: true,
  includeAlerts: true,
  maxEntriesPerType: 100,
}
