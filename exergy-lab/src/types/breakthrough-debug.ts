/**
 * Breakthrough Engine Debug Types
 *
 * Extended debug types specifically for the Breakthrough Engine v0.0.3
 * Optimized for analysis by Claude/LLMs to identify improvements.
 *
 * Features:
 * - 12-dimension breakthrough scoring support
 * - Comprehensive performance metrics
 * - LLM call tracking and cost analysis
 * - UI state transition logging
 * - Data source integration metrics
 * - Quality validation diagnostics
 *
 * @see components/breakthrough/BreakthroughEngineInterface.tsx
 * @see lib/ai/agents/hypothesis-racer.ts
 * @see lib/ai/agents/breakthrough-evaluator.ts
 */

import type {
  DebugSession,
  DebugEvent,
  ErrorLog,
  APICallLog,
  SSEHealthLog,
  UIStateLog,
  QualityValidationLog as DebugQualityValidationLog,
  DebugAlert,
  LLMPurpose,
} from './debug'

// ============================================================================
// Breakthrough Engine Phase Types
// ============================================================================

export type BreakthroughPhase =
  | 'research'      // Literature synthesis
  | 'generation'    // HypGen agent hypothesis generation
  | 'racing'        // Hypothesis racing and refinement
  | 'validation'    // Final validation of top hypotheses
  | 'complete'      // Discovery complete

export type BreakthroughStatus =
  | 'idle'
  | 'starting'
  | 'running'
  | 'completed'
  | 'failed'

// ============================================================================
// HypGen Agent Types
// ============================================================================

export type HypGenAgentType =
  | 'novel'         // Novelty-first approach
  | 'feasible'      // Feasibility-first approach
  | 'economic'      // Economics-first approach
  | 'cross-domain'  // Cross-domain knowledge transfer
  | 'paradigm'      // Paradigm-shift focused

export interface HypGenAgentLog {
  agentType: HypGenAgentType
  agentId: string
  generationTimeMs: number
  hypothesesGenerated: number
  averageInitialScore: number
  strategy: string
  reasoning: string[]
  inputTokens?: number
  outputTokens?: number
}

// ============================================================================
// Hypothesis Types for Debug
// ============================================================================

export type HypothesisClassification =
  | 'breakthrough'           // Score >= 9.0
  | 'partial_breakthrough'   // Score 8.5-8.9
  | 'major_discovery'        // Score 8.0-8.4
  | 'significant_discovery'  // Score 7.0-7.9
  | 'partial_failure'        // Score 5.0-6.9
  | 'failure'                // Score < 5.0

export type HypothesisStatus =
  | 'active'
  | 'breakthrough'
  | 'eliminated'

export interface HypothesisDebugLog {
  id: string
  title: string
  description?: string
  agentSource: HypGenAgentType
  domain: string
  initialScore: number
  finalScore: number
  classification: HypothesisClassification
  status: HypothesisStatus
  totalIterations: number
  scoreHistory: ScoreHistoryEntry[]
  dimensionScores?: DimensionScoreLog[]
  eliminationReason?: string
  breakthroughAchievedAt?: number // iteration number
  refinementHistory: RefinementLog[]
  evaluationTimeMs: number
  tokensUsed?: number
}

export interface ScoreHistoryEntry {
  iteration: number
  timestamp: number
  score: number
  delta: number
  classification: HypothesisClassification
  evaluatorNotes?: string
}

export interface DimensionScoreLog {
  dimensionId: string
  dimensionName: string
  score: number
  maxScore: number
  percentOfMax: number
  passed: boolean
  evidence: string[]
  gaps: string[]
}

export interface RefinementLog {
  iteration: number
  timestamp: number
  previousScore: number
  newScore: number
  refinementType: 'feedback' | 'self-critique' | 'cross-pollination'
  feedback: string
  changes: string[]
  improvementAreas: string[]
  durationMs: number
}

// ============================================================================
// 12-Dimension Breakthrough Criteria (v0.0.3)
// ============================================================================

export interface BreakthroughDimensionConfig {
  id: string
  name: string
  shortName: string
  maxScore: number
  weight: number
  required: boolean
  description: string
  passThreshold: number
  category: 'impact' | 'feasibility'
}

// Impact Dimensions (BC1-BC8): 8.0 points total
// Feasibility Dimensions (BC9-BC12): 2.0 points total
// Total: 10.0 points
export const BREAKTHROUGH_DIMENSIONS: BreakthroughDimensionConfig[] = [
  // Impact Dimensions (scaled by 0.8 from original)
  { id: 'bc1_performance', name: 'Performance Gains', shortName: 'Performance', maxScore: 1.2, weight: 1.2, required: true, description: '10x+ improvement in key metrics', passThreshold: 0.84, category: 'impact' },
  { id: 'bc2_cost', name: 'Cost Reduction', shortName: 'Cost', maxScore: 1.2, weight: 1.2, required: false, description: '10x cost reduction potential', passThreshold: 0.84, category: 'impact' },
  { id: 'bc3_capabilities', name: 'Advanced Capabilities', shortName: 'Capabilities', maxScore: 0.8, weight: 0.8, required: false, description: 'Previously impossible capabilities', passThreshold: 0.56, category: 'impact' },
  { id: 'bc4_applications', name: 'New Applications', shortName: 'Applications', maxScore: 0.8, weight: 0.8, required: false, description: 'Opens new application domains', passThreshold: 0.56, category: 'impact' },
  { id: 'bc5_societal', name: 'Societal Impact', shortName: 'Societal', maxScore: 0.8, weight: 0.8, required: false, description: 'Major societal or environmental impact', passThreshold: 0.56, category: 'impact' },
  { id: 'bc6_scale', name: 'Opportunity Scale', shortName: 'Scale', maxScore: 1.2, weight: 1.2, required: false, description: 'Addresses large market opportunity', passThreshold: 0.84, category: 'impact' },
  { id: 'bc7_problem_solving', name: 'Problem-Solving', shortName: 'Problem-Solving', maxScore: 0.8, weight: 0.8, required: false, description: 'Solves fundamental challenge', passThreshold: 0.56, category: 'impact' },
  { id: 'bc8_trajectory', name: 'Knowledge Trajectory', shortName: 'Trajectory', maxScore: 1.2, weight: 1.2, required: true, description: 'Changes research trajectory', passThreshold: 0.84, category: 'impact' },
  // Feasibility Dimensions (new in v0.0.3)
  { id: 'bc9_feasibility', name: 'Technical Feasibility', shortName: 'Feasibility', maxScore: 0.5, weight: 0.5, required: false, description: 'Engineering readiness and TRL level', passThreshold: 0.35, category: 'feasibility' },
  { id: 'bc10_literature', name: 'Existing Literature', shortName: 'Literature', maxScore: 0.5, weight: 0.5, required: false, description: 'Peer-reviewed support and alignment', passThreshold: 0.35, category: 'feasibility' },
  { id: 'bc11_infrastructure', name: 'Existing Infrastructure', shortName: 'Infrastructure', maxScore: 0.5, weight: 0.5, required: false, description: 'Manufacturing and deployment compatibility', passThreshold: 0.35, category: 'feasibility' },
  { id: 'bc12_capital', name: 'Capital Requirements', shortName: 'Capital', maxScore: 0.5, weight: 0.5, required: false, description: 'Investment needs and funding accessibility', passThreshold: 0.35, category: 'feasibility' },
]

// Convenience groupings
export const IMPACT_DIMENSIONS = BREAKTHROUGH_DIMENSIONS.filter(d => d.category === 'impact')
export const FEASIBILITY_DIMENSIONS = BREAKTHROUGH_DIMENSIONS.filter(d => d.category === 'feasibility')
export const REQUIRED_DIMENSIONS = BREAKTHROUGH_DIMENSIONS.filter(d => d.required)

// ============================================================================
// LLM Call Tracking
// ============================================================================

export interface LLMCallLog {
  id: string
  timestamp: number
  model: string
  modelVersion?: string
  provider: 'google' | 'openai' | 'anthropic' | 'other'
  purpose: LLMPurpose  // Uses LLMPurpose from debug.ts
  phase: BreakthroughPhase
  agentType?: HypGenAgentType
  promptTemplate?: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  costEstimateUSD: number
  latencyMs: number
  success: boolean
  errorMessage?: string
  retryCount: number
  fallbackUsed: boolean
  fallbackModel?: string
  responseQuality?: 'high' | 'medium' | 'low'
  cacheHit: boolean
  streamingEnabled?: boolean
  finishReason?: 'stop' | 'length' | 'content_filter' | 'error'
  promptTemplateId?: string
  parseSuccess: boolean
  parseErrors?: string[]
}

// ============================================================================
// Performance Metrics
// ============================================================================

export interface PerformanceSnapshot {
  timestamp: number
  phase: BreakthroughPhase
  metrics: {
    // Timing
    elapsedMs: number
    phaseElapsedMs: number
    estimatedRemainingMs?: number

    // Resource usage
    activePromises: number
    pendingLLMCalls: number

    // Memory (if available)
    heapUsedMB?: number
    heapTotalMB?: number

    // Throughput
    llmCallsCompleted: number
    hypothesesProcessed: number
    iterationsCompleted: number

    // Efficiency
    avgLLMLatencyMs: number
    avgTokensPerCall: number
    cacheHitRate: number
  }
}

export interface PerformanceMetrics {
  // Overall timing
  totalDurationMs: number
  phaseDurations: Record<BreakthroughPhase, number>

  // LLM usage
  totalLLMCalls: number
  totalTokensUsed: number
  totalCostUSD: number
  avgLLMLatencyMs: number
  llmErrorRate: number
  llmRetryRate: number
  fallbackRate: number

  // Throughput
  hypothesesPerMinute: number
  iterationsPerMinute: number
  evaluationsPerMinute: number

  // Efficiency
  tokensPerHypothesis: number
  costPerHypothesis: number
  timePerHypothesis: number

  // Quality indicators
  breakthroughRate: number
  eliminationRate: number
  avgScoreImprovement: number

  // Bottlenecks
  slowestPhase: BreakthroughPhase
  slowestOperations: { operation: string; avgMs: number; count: number }[]
}

// ============================================================================
// UI State Tracking
// ============================================================================

export type UIStateTransitionType =
  | 'phase_change'
  | 'hypothesis_update'
  | 'score_update'
  | 'chart_render'
  | 'modal_open'
  | 'modal_close'
  | 'tab_change'
  | 'filter_change'
  | 'export_trigger'
  | 'error_display'
  | 'loading_state'

export interface UIStateTransition {
  id: string
  timestamp: number
  type: UIStateTransitionType
  component: string
  previousState?: Record<string, unknown>
  newState?: Record<string, unknown>
  trigger: 'user' | 'system' | 'sse'
  renderTimeMs?: number
  metadata?: Record<string, unknown>
}

export interface UIPerformanceMetrics {
  totalRenders: number
  avgRenderTimeMs: number
  maxRenderTimeMs: number
  rerendersByComponent: Record<string, number>
  slowRenders: { component: string; timeMs: number; timestamp: number }[]
  stateTransitions: number
  userInteractions: number
}

// ============================================================================
// Data Source Metrics
// ============================================================================

export interface DataSourceLog {
  id: string
  timestamp: number
  source: string  // e.g., 'semantic_scholar', 'arxiv', 'pubmed'
  operation: 'search' | 'fetch' | 'embed' | 'analyze'
  query?: string
  resultsCount: number
  latencyMs: number
  success: boolean
  errorMessage?: string
  cacheHit: boolean
  qualityScore?: number  // 0-100
  relevanceScore?: number  // 0-100
  dataSize?: number  // bytes
}

export interface DataSourceMetrics {
  bySource: Record<string, {
    calls: number
    avgLatencyMs: number
    successRate: number
    cacheHitRate: number
    avgResultsCount: number
    avgQualityScore: number
  }>
  totalCalls: number
  totalLatencyMs: number
  overallCacheHitRate: number
  slowestSources: { source: string; avgLatencyMs: number }[]
  mostReliableSources: { source: string; successRate: number }[]
}

// ============================================================================
// Quality Validation Metrics
// ============================================================================

export interface FrontierScienceCriteriaLog {
  criterionId: 'HC1' | 'HC2' | 'HC3' | 'HC4' | 'HC5'
  criterionName: string
  score: number
  maxScore: number
  passed: boolean
  reasoning: string
  evidence: string[]
  gaps: string[]
  evaluationTimeMs: number
}

export interface QualityValidationLog {
  id: string
  timestamp: number
  hypothesisId: string
  phase: BreakthroughPhase

  // FrontierScience criteria (HC1-HC5)
  frontierScienceCriteria: FrontierScienceCriteriaLog[]
  frontierScienceScore: number
  frontierSciencePassed: boolean

  // Breakthrough dimensions (BC1-BC12)
  breakthroughDimensions: DimensionScoreLog[]
  breakthroughScore: number
  breakthroughPassed: boolean

  // Feasibility assessment
  feasibilityScore: number
  feasibilityConfidence: 'high' | 'medium' | 'low'

  // Academic rigor indicators
  academicRigor: {
    citationCount: number
    peerReviewedSources: number
    recentSources: number  // 2020+
    contradictions: string[]
    assumptions: string[]
    testableHypotheses: string[]
    falsifiableClaims: string[]
  }

  // Thermodynamic validation
  thermodynamicValidation?: {
    efficiencyClaim: number
    theoreticalLimit: number
    withinLimits: boolean
    methodology: string
  }

  evaluationTimeMs: number
}

// ============================================================================
// Racing Statistics
// ============================================================================

export interface RaceStatsLog {
  totalHypotheses: number
  activeCount: number
  eliminatedCount: number
  breakthroughCount: number
  topScore: number
  averageScore: number
  currentIteration: number
  maxIterations: number
  elapsedTimeMs: number
  hypothesesPerAgent: Record<HypGenAgentType, number>
  breakthroughsByAgent: Record<HypGenAgentType, number>
  averageScoreByAgent: Record<HypGenAgentType, number>
  eliminationsByIteration: number[]
}

// ============================================================================
// Breakthrough Debug Session (Extended) - v0.0.3
// ============================================================================

export interface BreakthroughDebugSession extends Omit<DebugSession,
  'finalResult' | 'status' | 'llmCalls' | 'performanceSnapshots' | 'dataSourceLogs' |
  'performanceMetrics' | 'dataSourceMetrics' | 'uiPerformanceMetrics' | 'qualityMetrics' |
  'costBreakdown' | 'systemInfo' | 'metadata' | 'mode' | 'domain'
> {
  // Override status to include 'starting'
  status: BreakthroughStatus

  // Breakthrough-specific metadata
  engineVersion: string
  mode: 'breakthrough' | 'discovery' | 'validation'
  domain: string

  // Configuration used
  config: {
    maxIterations: number
    hypothesesPerAgent: number
    breakthroughThreshold: number
    eliminationThreshold: number
    enableGPU: boolean
    // New in v0.0.3
    dimensionCount: number  // 12
    feasibilityEnabled: boolean
    parallelAgents: number
  }

  // Phase timing
  phaseTiming: {
    research?: { start: number; end: number; durationMs: number }
    generation?: { start: number; end: number; durationMs: number }
    racing?: { start: number; end: number; durationMs: number }
    validation?: { start: number; end: number; durationMs: number }
  }

  // HypGen agent logs
  agentLogs: HypGenAgentLog[]

  // Hypothesis tracking
  hypotheses: HypothesisDebugLog[]

  // Racing stats at end
  finalRaceStats: RaceStatsLog

  // Final result summary
  finalResult: BreakthroughFinalResult

  // ========== NEW COMPREHENSIVE LOGGING (v0.0.3) ==========

  // LLM call tracking
  llmCalls: LLMCallLog[]

  // Performance snapshots (periodic)
  performanceSnapshots: PerformanceSnapshot[]

  // Computed performance metrics
  performanceMetrics?: PerformanceMetrics

  // UI state transitions
  uiStateTransitions: UIStateTransition[]
  uiPerformanceMetrics?: UIPerformanceMetrics

  // Data source usage
  dataSourceLogs: DataSourceLog[]
  dataSourceMetrics?: DataSourceMetrics

  // Quality validation logs
  qualityValidationLogs: QualityValidationLog[]

  // Metadata
  metadata?: {
    userAgent?: string
    sessionStart?: string
    totalEvents?: number
    totalApiCalls?: number
    totalErrors?: number
    totalLLMCalls?: number
    totalTokens?: number
    totalCostUSD?: number
    avgLatencyMs?: number
    successRate?: number
    phaseDurations?: Record<BreakthroughPhase, number>
    iterationCounts?: Record<BreakthroughPhase, number>
    exportedAt?: string
    version?: string
  }

  // System information
  systemInfo: {
    userAgent?: string
    platform?: string
    screenResolution?: string
    timezone?: string
    language?: string
    connectionType?: string
    nodeEnv?: string
  }

  // SSE connection health
  sseHealth: {
    connectionAttempts: number
    reconnections: number
    heartbeatsMissed: number
    avgLatencyMs: number
    lastHeartbeat?: number
  }

  // SSE health logs (required by DebugSession)
  sseHealthLogs: SSEHealthLog[]

  // UI state logs (required by DebugSession)
  uiStateLogs: UIStateLog[]

  // Quality validations (required by DebugSession)
  qualityValidations: DebugQualityValidationLog[]

  // Alerts (required by DebugSession)
  alerts: DebugAlert[]

  // Cost tracking
  costSummary: {
    totalCostUSD: number
    costByPhase: Record<BreakthroughPhase, number>
    costByModel: Record<string, number>
    costByAgent: Record<HypGenAgentType, number>
  }
}

export interface BreakthroughFinalResult {
  success: boolean
  breakthroughsAchieved: number
  topHypotheses: {
    id: string
    title: string
    score: number
    classification: HypothesisClassification
    agentSource: HypGenAgentType
    keyInsights: string[]
  }[]
  overallStats: {
    totalHypothesesEvaluated: number
    totalIterations: number
    totalEvaluationTimeMs: number
    averageFinalScore: number
    dimensionPassRates: Record<string, number>
  }
  recommendations: string[]
}

// ============================================================================
// Analysis Request Format (for Claude) - v0.0.3
// ============================================================================

export interface BreakthroughAnalysisRequest {
  version: string
  exportedAt: string
  analysisType: 'improvement' | 'debugging' | 'comparison' | 'full' | 'performance' | 'quality'

  // Session summary
  session: {
    id: string
    query: string
    domain: string
    status: BreakthroughStatus
    duration: {
      total: number
      byPhase: Record<BreakthroughPhase, number>
    }
    systemInfo?: BreakthroughDebugSession['systemInfo']
  }

  // Performance metrics
  performance: {
    breakthroughRate: number
    averageFinalScore: number
    topScore: number
    eliminationRate: number
    iterationsToBreakthrough: number | null
    agentEffectiveness: Record<HypGenAgentType, {
      hypothesesGenerated: number
      averageScore: number
      breakthroughs: number
      eliminationRate: number
    }>
  }

  // Dimension analysis (12 dimensions in v0.0.3)
  dimensions: {
    passRates: Record<string, number>
    averageScores: Record<string, number>
    mostChallenging: string[]
    bestPerforming: string[]
    // New in v0.0.3
    impactDimensionScore: number
    feasibilityDimensionScore: number
    feasibilityConfidence: 'high' | 'medium' | 'low'
  }

  // Hypothesis details
  hypotheses: {
    breakthroughs: HypothesisDebugLog[]
    topPerformers: HypothesisDebugLog[]
    eliminated: {
      count: number
      commonReasons: string[]
      byIteration: number[]
    }
  }

  // Refinement effectiveness
  refinement: {
    averageIterationsToBreakthrough: number
    scoreImprovementPerIteration: number
    mostEffectiveRefinementTypes: string[]
    stagnationPoints: number[]
  }

  // Errors and issues
  issues: {
    errors: ErrorLog[]
    warnings: string[]
    performanceBottlenecks: {
      phase: BreakthroughPhase
      duration: number
      cause?: string
    }[]
  }

  // Recommendations for improvement
  suggestedImprovements: string[]

  // ========== NEW COMPREHENSIVE ANALYSIS (v0.0.3) ==========

  // LLM usage analysis
  llmAnalysis?: {
    totalCalls: number
    totalTokens: number
    totalCostUSD: number
    avgLatencyMs: number
    errorRate: number
    retryRate: number
    fallbackRate: number
    modelUsage: Record<string, {
      calls: number
      tokens: number
      costUSD: number
      avgLatencyMs: number
    }>
    callsByPurpose: Record<string, number>
    slowestCalls: { purpose: string; model: string; latencyMs: number }[]
  }

  // UI performance analysis
  uiAnalysis?: {
    totalRenders: number
    avgRenderTimeMs: number
    slowRenders: { component: string; timeMs: number }[]
    stateTransitions: number
    userInteractions: number
    componentHotspots: { component: string; renderCount: number }[]
  }

  // Data source analysis
  dataSourceAnalysis?: {
    totalCalls: number
    overallSuccessRate: number
    overallCacheHitRate: number
    avgLatencyMs: number
    sourcePerformance: Record<string, {
      calls: number
      successRate: number
      avgLatencyMs: number
      cacheHitRate: number
    }>
    slowestSources: { source: string; avgLatencyMs: number }[]
    failingSources: { source: string; failureRate: number }[]
  }

  // Quality validation analysis
  qualityAnalysis?: {
    frontierSciencePassRate: number
    avgFrontierScienceScore: number
    breakthroughPassRate: number
    avgBreakthroughScore: number
    feasibilityConfidenceDistribution: Record<'high' | 'medium' | 'low', number>
    weakestCriteria: { id: string; passRate: number }[]
    strongestCriteria: { id: string; passRate: number }[]
    academicRigorStats: {
      avgCitations: number
      avgPeerReviewedSources: number
      avgRecentSources: number
    }
  }

  // Cost analysis
  costAnalysis?: {
    totalCostUSD: number
    costPerHypothesis: number
    costPerBreakthrough: number | null
    costByPhase: Record<BreakthroughPhase, number>
    costByModel: Record<string, number>
    costByAgent: Record<HypGenAgentType, number>
    costEfficiency: 'high' | 'medium' | 'low'
  }

  // SSE health analysis
  sseAnalysis?: {
    connectionStability: 'stable' | 'unstable' | 'poor'
    reconnections: number
    missedHeartbeats: number
    avgLatencyMs: number
  }

  // Comparative analysis (if comparing sessions)
  comparison?: {
    comparedSessionId: string
    improvements: string[]
    regressions: string[]
    unchanged: string[]
  }
}

// ============================================================================
// Export Formats
// ============================================================================

export type BreakthroughExportFormat = 'analysis' | 'json' | 'markdown' | 'csv' | 'detailed_json'

export interface BreakthroughExportOptions {
  format: BreakthroughExportFormat
  includeFullHypotheses: boolean
  includeScoreHistory: boolean
  includeRefinementDetails: boolean
  includeErrors: boolean
  includeRawEvents: boolean
  maxHypotheses?: number
  // New in v0.0.3
  includeLLMCalls: boolean
  includePerformanceSnapshots: boolean
  includeUITransitions: boolean
  includeDataSourceLogs: boolean
  includeQualityValidation: boolean
  includeCostAnalysis: boolean
  includeSystemInfo: boolean
  includeSSEHealth: boolean
  // Analysis focus
  analysisFocus?: 'performance' | 'quality' | 'cost' | 'all'
}

// ============================================================================
// Default Export Options
// ============================================================================

export const DEFAULT_BREAKTHROUGH_EXPORT_OPTIONS: BreakthroughExportOptions = {
  format: 'analysis',
  includeFullHypotheses: true,
  includeScoreHistory: true,
  includeRefinementDetails: true,
  includeErrors: true,
  includeRawEvents: false,
  maxHypotheses: 20,
  // New in v0.0.3
  includeLLMCalls: true,
  includePerformanceSnapshots: false,
  includeUITransitions: false,
  includeDataSourceLogs: true,
  includeQualityValidation: true,
  includeCostAnalysis: true,
  includeSystemInfo: true,
  includeSSEHealth: true,
  analysisFocus: 'all',
}

// Preset export configurations for common use cases
export const EXPORT_PRESETS = {
  // For debugging performance issues
  performance: {
    ...DEFAULT_BREAKTHROUGH_EXPORT_OPTIONS,
    format: 'analysis' as const,
    includePerformanceSnapshots: true,
    includeLLMCalls: true,
    analysisFocus: 'performance' as const,
  },
  // For quality validation analysis
  quality: {
    ...DEFAULT_BREAKTHROUGH_EXPORT_OPTIONS,
    format: 'analysis' as const,
    includeQualityValidation: true,
    includeFullHypotheses: true,
    analysisFocus: 'quality' as const,
  },
  // For cost optimization
  cost: {
    ...DEFAULT_BREAKTHROUGH_EXPORT_OPTIONS,
    format: 'analysis' as const,
    includeLLMCalls: true,
    includeCostAnalysis: true,
    analysisFocus: 'cost' as const,
  },
  // For UI debugging
  ui: {
    ...DEFAULT_BREAKTHROUGH_EXPORT_OPTIONS,
    format: 'detailed_json' as const,
    includeUITransitions: true,
    includePerformanceSnapshots: true,
  },
  // Full debug export
  full: {
    ...DEFAULT_BREAKTHROUGH_EXPORT_OPTIONS,
    format: 'detailed_json' as const,
    includeRawEvents: true,
    includeLLMCalls: true,
    includePerformanceSnapshots: true,
    includeUITransitions: true,
    includeDataSourceLogs: true,
    includeQualityValidation: true,
    includeCostAnalysis: true,
    analysisFocus: 'all' as const,
  },
  // Minimal for quick sharing
  minimal: {
    ...DEFAULT_BREAKTHROUGH_EXPORT_OPTIONS,
    format: 'markdown' as const,
    includeScoreHistory: false,
    includeRefinementDetails: false,
    includeRawEvents: false,
    includeLLMCalls: false,
    includePerformanceSnapshots: false,
    includeUITransitions: false,
    includeDataSourceLogs: false,
    maxHypotheses: 5,
  },
}
