/**
 * Enhanced Diagnostics Logging Types
 *
 * Provides structured logging for rubric evaluations, benchmark results,
 * input sensitivity analysis, and agent reasoning to enable better
 * debugging and user insights.
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
