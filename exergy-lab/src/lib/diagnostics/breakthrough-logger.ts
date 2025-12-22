/**
 * Breakthrough Engine Diagnostic Logger
 *
 * Specialized logging for Breakthrough Engine v0.0.2 sessions.
 * Captures detailed hypothesis generation, racing, and evaluation data
 * optimized for analysis by Claude/LLMs.
 *
 * @see types/breakthrough-debug.ts - Type definitions
 * @see components/breakthrough/BreakthroughEngineInterface.tsx - UI integration
 */

import type {
  BreakthroughDebugSession,
  BreakthroughPhase,
  BreakthroughStatus,
  HypGenAgentType,
  HypGenAgentLog,
  HypothesisDebugLog,
  HypothesisClassification,
  HypothesisStatus,
  ScoreHistoryEntry,
  DimensionScoreLog,
  RefinementLog,
  RaceStatsLog,
  BreakthroughFinalResult,
  BreakthroughAnalysisRequest,
  BreakthroughExportOptions,
  LLMCallLog,
  PerformanceSnapshot,
  PerformanceMetrics,
  UIStateTransition,
  UIStateTransitionType,
  UIPerformanceMetrics,
  DataSourceLog,
  DataSourceMetrics,
  QualityValidationLog,
  FrontierScienceCriteriaLog,
} from '@/types/breakthrough-debug'
import { DEFAULT_BREAKTHROUGH_EXPORT_OPTIONS, IMPACT_DIMENSIONS, FEASIBILITY_DIMENSIONS } from '@/types/breakthrough-debug'
import type { ErrorLog } from '@/types/debug'

// Valid phases for timing (excludes 'complete')
type TimedPhase = 'research' | 'generation' | 'racing' | 'validation'

function isTimedPhase(phase: BreakthroughPhase): phase is TimedPhase {
  return phase !== 'complete'
}

// ============================================================================
// Utility Functions
// ============================================================================

function generateId(): string {
  return `bt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
}

function getClassification(score: number): HypothesisClassification {
  if (score >= 9.0) return 'breakthrough'
  if (score >= 8.5) return 'partial_breakthrough'
  if (score >= 8.0) return 'major_discovery'
  if (score >= 7.0) return 'significant_discovery'
  if (score >= 5.0) return 'partial_failure'
  return 'failure'
}

// ============================================================================
// Breakthrough Diagnostic Logger Class
// ============================================================================

export class BreakthroughDiagnosticLogger {
  private session: BreakthroughDebugSession | null = null
  private hypothesisMap: Map<string, HypothesisDebugLog> = new Map()
  private phaseStartTimes: Map<BreakthroughPhase, number> = new Map()
  private errors: ErrorLog[] = []
  private warnings: string[] = []
  // New in v0.0.3
  private llmCalls: LLMCallLog[] = []
  private performanceSnapshots: PerformanceSnapshot[] = []
  private uiTransitions: UIStateTransition[] = []
  private dataSourceLogs: DataSourceLog[] = []
  private qualityValidationLogs: QualityValidationLog[] = []
  private lastHeartbeatTime: number = 0
  private heartbeatLatencies: number[] = []

  // ============================================================================
  // Session Management
  // ============================================================================

  startSession(
    query: string,
    domain: string,
    config: BreakthroughDebugSession['config']
  ): string {
    const sessionId = generateId()

    // Ensure config has new v0.0.3 fields with defaults
    const fullConfig = {
      ...config,
      dimensionCount: config.dimensionCount ?? 12,
      feasibilityEnabled: config.feasibilityEnabled ?? true,
      parallelAgents: config.parallelAgents ?? 5,
    }

    this.session = {
      sessionId,
      discoveryId: sessionId,
      startTime: Date.now(),
      status: 'running',
      query,
      events: [],
      apiCalls: [],
      errors: [],
      metadata: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        sessionStart: new Date().toISOString(),
        totalEvents: 0,
        totalApiCalls: 0,
        totalErrors: 0,
      },
      // Breakthrough-specific
      engineVersion: '0.0.3',
      mode: 'breakthrough',
      domain,
      config: fullConfig,
      phaseTiming: {},
      agentLogs: [],
      hypotheses: [],
      finalRaceStats: this.createEmptyRaceStats(),
      finalResult: this.createEmptyFinalResult(),
      // New in v0.0.3
      llmCalls: [],
      performanceSnapshots: [],
      performanceMetrics: undefined,
      uiStateTransitions: [],
      uiPerformanceMetrics: undefined,
      dataSourceLogs: [],
      dataSourceMetrics: undefined,
      qualityValidationLogs: [],
      systemInfo: this.captureSystemInfo(),
      sseHealth: {
        connectionAttempts: 0,
        reconnections: 0,
        heartbeatsMissed: 0,
        avgLatencyMs: 0,
        lastHeartbeat: undefined,
      },
      // Required by DebugSession (v0.0.3)
      sseHealthLogs: [],
      uiStateLogs: [],
      qualityValidations: [],
      alerts: [],
      costSummary: {
        totalCostUSD: 0,
        costByPhase: {
          research: 0,
          generation: 0,
          racing: 0,
          validation: 0,
          complete: 0,
        },
        costByModel: {},
        costByAgent: {
          'novel': 0,
          'feasible': 0,
          'economic': 0,
          'cross-domain': 0,
          'paradigm': 0,
        },
      },
    }

    this.hypothesisMap.clear()
    this.phaseStartTimes.clear()
    this.errors = []
    this.warnings = []
    this.llmCalls = []
    this.performanceSnapshots = []
    this.uiTransitions = []
    this.dataSourceLogs = []
    this.qualityValidationLogs = []
    this.lastHeartbeatTime = 0
    this.heartbeatLatencies = []

    this.persistSession()
    return sessionId
  }

  private captureSystemInfo(): BreakthroughDebugSession['systemInfo'] {
    if (typeof window === 'undefined') {
      return {
        nodeEnv: process.env.NODE_ENV,
      }
    }

    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      connectionType: (navigator as any).connection?.effectiveType,
      nodeEnv: process.env.NODE_ENV,
    }
  }

  endSession(status: BreakthroughStatus = 'completed'): void {
    if (!this.session) return

    this.session.status = status
    this.session.endTime = Date.now()

    // Compile final hypotheses from map
    this.session.hypotheses = Array.from(this.hypothesisMap.values())

    // Calculate final result
    this.session.finalResult = this.compileFinalResult()

    // Compute and store performance metrics (v0.0.3)
    this.session.performanceMetrics = this.computePerformanceMetrics()

    // Compute UI performance metrics (v0.0.3)
    this.session.uiPerformanceMetrics = this.computeUIMetrics()

    // Compute data source metrics (v0.0.3)
    this.session.dataSourceMetrics = this.computeDataSourceMetrics()

    // Update metadata
    this.session.metadata = {
      ...this.session.metadata,
      totalEvents: this.session.events.length,
      totalApiCalls: this.session.apiCalls.length,
      totalErrors: this.session.errors.length,
    }

    this.persistSession()
  }

  private computeUIMetrics(): UIPerformanceMetrics {
    const renders = this.uiTransitions.filter(t => t.type === 'chart_render' || t.renderTimeMs)
    const stateChanges = this.uiTransitions.filter(t => t.type === 'phase_change' || t.type === 'hypothesis_update' || t.type === 'score_update')
    const userInteractions = this.uiTransitions.filter(t => t.trigger === 'user')

    const renderTimes = renders.filter(r => r.renderTimeMs).map(r => r.renderTimeMs!)
    const avgRenderTime = renderTimes.length > 0
      ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length
      : 0

    const componentCounts: Record<string, number> = {}
    for (const transition of this.uiTransitions) {
      componentCounts[transition.component] = (componentCounts[transition.component] || 0) + 1
    }

    const slowRenders = renders
      .filter(r => r.renderTimeMs && r.renderTimeMs > 100)
      .sort((a, b) => (b.renderTimeMs || 0) - (a.renderTimeMs || 0))
      .slice(0, 10)
      .map(r => ({
        component: r.component,
        timeMs: r.renderTimeMs!,
        timestamp: r.timestamp,
      }))

    return {
      totalRenders: renders.length,
      avgRenderTimeMs: avgRenderTime,
      maxRenderTimeMs: Math.max(...renderTimes, 0),
      rerendersByComponent: componentCounts,
      slowRenders,
      stateTransitions: stateChanges.length,
      userInteractions: userInteractions.length,
    }
  }

  private computeDataSourceMetrics(): DataSourceMetrics {
    const bySource: Record<string, {
      calls: number
      avgLatencyMs: number
      successRate: number
      cacheHitRate: number
      avgResultsCount: number
      avgQualityScore: number
    }> = {}

    for (const log of this.dataSourceLogs) {
      if (!bySource[log.source]) {
        bySource[log.source] = {
          calls: 0,
          avgLatencyMs: 0,
          successRate: 0,
          cacheHitRate: 0,
          avgResultsCount: 0,
          avgQualityScore: 0,
        }
      }
      bySource[log.source].calls++
    }

    // Compute averages per source
    for (const [source, stats] of Object.entries(bySource)) {
      const sourceLogs = this.dataSourceLogs.filter(l => l.source === source)
      stats.avgLatencyMs = sourceLogs.reduce((s, l) => s + l.latencyMs, 0) / sourceLogs.length
      stats.successRate = sourceLogs.filter(l => l.success).length / sourceLogs.length
      stats.cacheHitRate = sourceLogs.filter(l => l.cacheHit).length / sourceLogs.length
      stats.avgResultsCount = sourceLogs.reduce((s, l) => s + l.resultsCount, 0) / sourceLogs.length
      const withQuality = sourceLogs.filter(l => l.qualityScore !== undefined)
      stats.avgQualityScore = withQuality.length > 0
        ? withQuality.reduce((s, l) => s + (l.qualityScore || 0), 0) / withQuality.length
        : 0
    }

    const totalLatency = this.dataSourceLogs.reduce((s, l) => s + l.latencyMs, 0)
    const cacheHits = this.dataSourceLogs.filter(l => l.cacheHit).length

    const slowestSources = Object.entries(bySource)
      .sort((a, b) => b[1].avgLatencyMs - a[1].avgLatencyMs)
      .slice(0, 5)
      .map(([source, stats]) => ({ source, avgLatencyMs: stats.avgLatencyMs }))

    const mostReliableSources = Object.entries(bySource)
      .sort((a, b) => b[1].successRate - a[1].successRate)
      .slice(0, 5)
      .map(([source, stats]) => ({ source, successRate: stats.successRate }))

    return {
      bySource,
      totalCalls: this.dataSourceLogs.length,
      totalLatencyMs: totalLatency,
      overallCacheHitRate: this.dataSourceLogs.length > 0 ? cacheHits / this.dataSourceLogs.length : 0,
      slowestSources,
      mostReliableSources,
    }
  }

  getSession(): BreakthroughDebugSession | null {
    return this.session
  }

  // ============================================================================
  // Phase Tracking
  // ============================================================================

  startPhase(phase: BreakthroughPhase): void {
    if (!this.session) return

    this.phaseStartTimes.set(phase, Date.now())

    this.addEvent({
      type: 'sse',
      category: 'progress',
      phase: phase as any,
      data: { action: 'phase_start', phase },
    })
  }

  endPhase(phase: BreakthroughPhase): void {
    if (!this.session) return

    const startTime = this.phaseStartTimes.get(phase)
    if (startTime && isTimedPhase(phase)) {
      const endTime = Date.now()
      this.session.phaseTiming[phase] = {
        start: startTime,
        end: endTime,
        durationMs: endTime - startTime,
      }
    }

    const durationMs = isTimedPhase(phase)
      ? this.session.phaseTiming[phase]?.durationMs
      : undefined

    this.addEvent({
      type: 'sse',
      category: 'complete',
      phase: phase as any,
      data: {
        action: 'phase_end',
        phase,
        durationMs,
      },
    })
  }

  // ============================================================================
  // Agent Logging
  // ============================================================================

  logAgentGeneration(log: HypGenAgentLog): void {
    if (!this.session) return

    this.session.agentLogs.push(log)

    this.addEvent({
      type: 'sse',
      category: 'progress',
      phase: 'generation' as any,
      data: {
        action: 'agent_generation',
        agentType: log.agentType,
        hypothesesGenerated: log.hypothesesGenerated,
        averageScore: log.averageInitialScore,
        timeMs: log.generationTimeMs,
      },
    })
  }

  // ============================================================================
  // Hypothesis Logging
  // ============================================================================

  logHypothesisCreation(
    id: string,
    title: string,
    description: string | undefined,
    agentSource: HypGenAgentType,
    domain: string,
    initialScore: number
  ): void {
    if (!this.session) return

    const hypothesisLog: HypothesisDebugLog = {
      id,
      title,
      description,
      agentSource,
      domain,
      initialScore,
      finalScore: initialScore,
      classification: getClassification(initialScore),
      status: 'active',
      totalIterations: 1,
      scoreHistory: [
        {
          iteration: 1,
          timestamp: Date.now(),
          score: initialScore,
          delta: 0,
          classification: getClassification(initialScore),
        },
      ],
      refinementHistory: [],
      evaluationTimeMs: 0,
    }

    this.hypothesisMap.set(id, hypothesisLog)
  }

  logHypothesisIteration(
    id: string,
    iteration: number,
    newScore: number,
    evaluatorNotes?: string,
    dimensionScores?: DimensionScoreLog[]
  ): void {
    const hypothesis = this.hypothesisMap.get(id)
    if (!hypothesis) return

    const previousScore = hypothesis.finalScore
    const delta = newScore - previousScore

    hypothesis.finalScore = newScore
    hypothesis.classification = getClassification(newScore)
    hypothesis.totalIterations = iteration

    if (dimensionScores) {
      hypothesis.dimensionScores = dimensionScores
    }

    hypothesis.scoreHistory.push({
      iteration,
      timestamp: Date.now(),
      score: newScore,
      delta,
      classification: getClassification(newScore),
      evaluatorNotes,
    })

    // Check for breakthrough
    if (newScore >= 9.0 && hypothesis.status !== 'breakthrough') {
      hypothesis.status = 'breakthrough'
      hypothesis.breakthroughAchievedAt = iteration
    }

    this.addEvent({
      type: 'sse',
      category: 'iteration',
      phase: 'racing' as any,
      data: {
        hypothesisId: id,
        iteration,
        score: newScore,
        delta,
        classification: hypothesis.classification,
      },
    })
  }

  logHypothesisRefinement(
    id: string,
    refinement: Omit<RefinementLog, 'timestamp'>
  ): void {
    const hypothesis = this.hypothesisMap.get(id)
    if (!hypothesis) return

    hypothesis.refinementHistory.push({
      ...refinement,
      timestamp: Date.now(),
    })
  }

  logHypothesisElimination(id: string, reason: string): void {
    const hypothesis = this.hypothesisMap.get(id)
    if (!hypothesis) return

    hypothesis.status = 'eliminated'
    hypothesis.eliminationReason = reason

    this.addEvent({
      type: 'sse',
      category: 'progress',
      phase: 'racing' as any,
      data: {
        action: 'hypothesis_eliminated',
        hypothesisId: id,
        reason,
        finalScore: hypothesis.finalScore,
        iteration: hypothesis.totalIterations,
      },
    })
  }

  // ============================================================================
  // Race Stats Logging
  // ============================================================================

  logRaceStats(stats: RaceStatsLog): void {
    if (!this.session) return

    this.session.finalRaceStats = stats

    this.addEvent({
      type: 'sse',
      category: 'progress',
      phase: 'racing' as any,
      data: {
        action: 'race_stats_update',
        ...stats,
      },
    })
  }

  // ============================================================================
  // Error Logging
  // ============================================================================

  logError(
    message: string,
    phase?: BreakthroughPhase,
    context?: Record<string, unknown>,
    stack?: string
  ): void {
    if (!this.session) return

    const error: ErrorLog = {
      id: generateId(),
      timestamp: Date.now(),
      phase: phase as any,
      message,
      stack,
      context,
      recoverable: true,
    }

    this.session.errors.push(error)
    this.errors.push(error)

    this.addEvent({
      type: 'sse',
      category: 'error',
      phase: phase as any,
      data: { message, context },
    })
  }

  logWarning(message: string): void {
    this.warnings.push(message)
  }

  // ============================================================================
  // LLM Call Logging (v0.0.3)
  // ============================================================================

  logLLMCall(call: Omit<LLMCallLog, 'id' | 'timestamp'>): void {
    if (!this.session) return

    const llmCall: LLMCallLog = {
      id: generateId(),
      timestamp: Date.now(),
      ...call,
    }

    this.llmCalls.push(llmCall)
    this.session.llmCalls.push(llmCall)

    // Update cost summary
    this.session.costSummary.totalCostUSD += call.costEstimateUSD
    if (call.phase !== 'complete') {
      this.session.costSummary.costByPhase[call.phase] += call.costEstimateUSD
    }
    if (!this.session.costSummary.costByModel[call.model]) {
      this.session.costSummary.costByModel[call.model] = 0
    }
    this.session.costSummary.costByModel[call.model] += call.costEstimateUSD
    if (call.agentType) {
      this.session.costSummary.costByAgent[call.agentType] += call.costEstimateUSD
    }

    this.addEvent({
      type: 'sse',
      category: 'api_request',
      phase: call.phase as any,
      data: {
        action: 'llm_call',
        model: call.model,
        purpose: call.purpose,
        tokens: call.totalTokens,
        latencyMs: call.latencyMs,
        success: call.success,
        costUSD: call.costEstimateUSD,
      },
    })
  }

  // ============================================================================
  // Performance Snapshot Logging (v0.0.3)
  // ============================================================================

  logPerformanceSnapshot(phase: BreakthroughPhase): void {
    if (!this.session) return

    const phaseStart = this.phaseStartTimes.get(phase) || this.session.startTime
    const now = Date.now()

    const snapshot: PerformanceSnapshot = {
      timestamp: now,
      phase,
      metrics: {
        elapsedMs: now - this.session.startTime,
        phaseElapsedMs: now - phaseStart,
        activePromises: 0,  // Would need external tracking
        pendingLLMCalls: this.llmCalls.filter(c => !c.success && c.errorMessage).length,
        llmCallsCompleted: this.llmCalls.length,
        hypothesesProcessed: this.hypothesisMap.size,
        iterationsCompleted: Math.max(...Array.from(this.hypothesisMap.values()).map(h => h.totalIterations), 0),
        avgLLMLatencyMs: this.calculateAvgLLMLatency(),
        avgTokensPerCall: this.calculateAvgTokensPerCall(),
        cacheHitRate: this.calculateCacheHitRate(),
      },
    }

    // Add memory usage if available
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory
      snapshot.metrics.heapUsedMB = memory.usedJSHeapSize / (1024 * 1024)
      snapshot.metrics.heapTotalMB = memory.totalJSHeapSize / (1024 * 1024)
    }

    this.performanceSnapshots.push(snapshot)
    this.session.performanceSnapshots.push(snapshot)
  }

  private calculateAvgLLMLatency(): number {
    if (this.llmCalls.length === 0) return 0
    return this.llmCalls.reduce((sum, c) => sum + c.latencyMs, 0) / this.llmCalls.length
  }

  private calculateAvgTokensPerCall(): number {
    if (this.llmCalls.length === 0) return 0
    return this.llmCalls.reduce((sum, c) => sum + c.totalTokens, 0) / this.llmCalls.length
  }

  private calculateCacheHitRate(): number {
    if (this.dataSourceLogs.length === 0) return 0
    const hits = this.dataSourceLogs.filter(d => d.cacheHit).length
    return hits / this.dataSourceLogs.length
  }

  // ============================================================================
  // UI State Transition Logging (v0.0.3)
  // ============================================================================

  logUIStateTransition(
    type: UIStateTransitionType,
    component: string,
    options?: {
      previousState?: Record<string, unknown>
      newState?: Record<string, unknown>
      trigger?: 'user' | 'system' | 'sse'
      renderTimeMs?: number
      metadata?: Record<string, unknown>
    }
  ): void {
    if (!this.session) return

    const transition: UIStateTransition = {
      id: generateId(),
      timestamp: Date.now(),
      type,
      component,
      previousState: options?.previousState,
      newState: options?.newState,
      trigger: options?.trigger || 'system',
      renderTimeMs: options?.renderTimeMs,
      metadata: options?.metadata,
    }

    this.uiTransitions.push(transition)
    this.session.uiStateTransitions.push(transition)
  }

  // ============================================================================
  // Data Source Logging (v0.0.3)
  // ============================================================================

  logDataSourceCall(log: Omit<DataSourceLog, 'id' | 'timestamp'>): void {
    if (!this.session) return

    const dataLog: DataSourceLog = {
      id: generateId(),
      timestamp: Date.now(),
      ...log,
    }

    this.dataSourceLogs.push(dataLog)
    this.session.dataSourceLogs.push(dataLog)

    this.addEvent({
      type: 'api_call',
      category: 'api_request',
      data: {
        action: 'data_source_call',
        source: log.source,
        operation: log.operation,
        success: log.success,
        latencyMs: log.latencyMs,
        cacheHit: log.cacheHit,
        resultsCount: log.resultsCount,
      },
    })
  }

  // ============================================================================
  // Quality Validation Logging (v0.0.3)
  // ============================================================================

  logQualityValidation(log: Omit<QualityValidationLog, 'id' | 'timestamp'>): void {
    if (!this.session) return

    const validationLog: QualityValidationLog = {
      id: generateId(),
      timestamp: Date.now(),
      ...log,
    }

    this.qualityValidationLogs.push(validationLog)
    this.session.qualityValidationLogs.push(validationLog)

    this.addEvent({
      type: 'sse',
      category: 'judge',
      phase: log.phase as any,
      data: {
        action: 'quality_validation',
        hypothesisId: log.hypothesisId,
        fsScore: log.frontierScienceScore,
        fsPassed: log.frontierSciencePassed,
        btScore: log.breakthroughScore,
        btPassed: log.breakthroughPassed,
        feasibilityConfidence: log.feasibilityConfidence,
      },
    })
  }

  // ============================================================================
  // SSE Health Logging (v0.0.3)
  // ============================================================================

  logSSEConnection(event: 'connect' | 'disconnect' | 'reconnect' | 'error', errorMessage?: string): void {
    if (!this.session) return

    if (event === 'connect') {
      this.session.sseHealth.connectionAttempts++
    } else if (event === 'reconnect') {
      this.session.sseHealth.reconnections++
    } else if (event === 'error' && errorMessage) {
      this.logError(errorMessage, undefined, { sseEvent: event })
    }
  }

  logSSEHeartbeat(receivedAt: number): void {
    if (!this.session) return

    if (this.lastHeartbeatTime > 0) {
      const latency = receivedAt - this.lastHeartbeatTime
      this.heartbeatLatencies.push(latency)

      // Update average latency
      this.session.sseHealth.avgLatencyMs =
        this.heartbeatLatencies.reduce((a, b) => a + b, 0) / this.heartbeatLatencies.length
    }

    this.lastHeartbeatTime = receivedAt
    this.session.sseHealth.lastHeartbeat = receivedAt
  }

  logMissedHeartbeat(): void {
    if (!this.session) return
    this.session.sseHealth.heartbeatsMissed++
  }

  // ============================================================================
  // Performance Metrics Computation (v0.0.3)
  // ============================================================================

  computePerformanceMetrics(): PerformanceMetrics {
    const hypotheses = Array.from(this.hypothesisMap.values())
    const totalDuration = this.session?.endTime
      ? this.session.endTime - (this.session?.startTime || 0)
      : Date.now() - (this.session?.startTime || Date.now())

    const phaseDurations: Record<BreakthroughPhase, number> = {
      research: this.session?.phaseTiming.research?.durationMs || 0,
      generation: this.session?.phaseTiming.generation?.durationMs || 0,
      racing: this.session?.phaseTiming.racing?.durationMs || 0,
      validation: this.session?.phaseTiming.validation?.durationMs || 0,
      complete: 0,
    }

    const successfulCalls = this.llmCalls.filter(c => c.success)
    const errorCalls = this.llmCalls.filter(c => !c.success)
    const retriedCalls = this.llmCalls.filter(c => c.retryCount > 0)
    const fallbackCalls = this.llmCalls.filter(c => c.fallbackUsed)

    const totalMinutes = totalDuration / 60000

    // Find slowest operations
    const operationDurations: Record<string, { total: number; count: number }> = {}
    for (const call of this.llmCalls) {
      const key = call.purpose
      if (!operationDurations[key]) {
        operationDurations[key] = { total: 0, count: 0 }
      }
      operationDurations[key].total += call.latencyMs
      operationDurations[key].count++
    }

    const slowestOperations = Object.entries(operationDurations)
      .map(([operation, { total, count }]) => ({
        operation,
        avgMs: total / count,
        count,
      }))
      .sort((a, b) => b.avgMs - a.avgMs)
      .slice(0, 5)

    // Find slowest phase
    const slowestPhase = (Object.entries(phaseDurations) as [BreakthroughPhase, number][])
      .filter(([phase]) => phase !== 'complete')
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'racing'

    const breakthroughs = hypotheses.filter(h => h.status === 'breakthrough')
    const eliminated = hypotheses.filter(h => h.status === 'eliminated')

    return {
      totalDurationMs: totalDuration,
      phaseDurations,
      totalLLMCalls: this.llmCalls.length,
      totalTokensUsed: this.llmCalls.reduce((sum, c) => sum + c.totalTokens, 0),
      totalCostUSD: this.session?.costSummary.totalCostUSD || 0,
      avgLLMLatencyMs: this.calculateAvgLLMLatency(),
      llmErrorRate: this.llmCalls.length > 0 ? errorCalls.length / this.llmCalls.length : 0,
      llmRetryRate: this.llmCalls.length > 0 ? retriedCalls.length / this.llmCalls.length : 0,
      fallbackRate: this.llmCalls.length > 0 ? fallbackCalls.length / this.llmCalls.length : 0,
      hypothesesPerMinute: totalMinutes > 0 ? hypotheses.length / totalMinutes : 0,
      iterationsPerMinute: totalMinutes > 0
        ? hypotheses.reduce((sum, h) => sum + h.totalIterations, 0) / totalMinutes
        : 0,
      evaluationsPerMinute: totalMinutes > 0 ? this.qualityValidationLogs.length / totalMinutes : 0,
      tokensPerHypothesis: hypotheses.length > 0
        ? this.llmCalls.reduce((sum, c) => sum + c.totalTokens, 0) / hypotheses.length
        : 0,
      costPerHypothesis: hypotheses.length > 0
        ? (this.session?.costSummary.totalCostUSD || 0) / hypotheses.length
        : 0,
      timePerHypothesis: hypotheses.length > 0 ? totalDuration / hypotheses.length : 0,
      breakthroughRate: hypotheses.length > 0 ? breakthroughs.length / hypotheses.length : 0,
      eliminationRate: hypotheses.length > 0 ? eliminated.length / hypotheses.length : 0,
      avgScoreImprovement: this.calculateAvgScoreImprovement(),
      slowestPhase,
      slowestOperations,
    }
  }

  private calculateAvgScoreImprovement(): number {
    const hypotheses = Array.from(this.hypothesisMap.values())
    if (hypotheses.length === 0) return 0

    const improvements = hypotheses.map(h => h.finalScore - h.initialScore)
    return improvements.reduce((a, b) => a + b, 0) / improvements.length
  }

  // ============================================================================
  // Event Logging
  // ============================================================================

  private addEvent(event: Omit<import('@/types/debug').DebugEvent, 'id' | 'timestamp'>): void {
    if (!this.session) return

    this.session.events.push({
      id: generateId(),
      timestamp: Date.now(),
      ...event,
    })
  }

  // ============================================================================
  // Compilation
  // ============================================================================

  private compileFinalResult(): BreakthroughFinalResult {
    const hypotheses = Array.from(this.hypothesisMap.values())
    const breakthroughs = hypotheses.filter(h => h.status === 'breakthrough')
    const topHypotheses = hypotheses
      .filter(h => h.status !== 'eliminated')
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, 5)

    // Calculate dimension pass rates
    const dimensionPassRates: Record<string, number> = {}
    const dimensionCounts: Record<string, { passed: number; total: number }> = {}

    for (const hyp of hypotheses) {
      if (hyp.dimensionScores) {
        for (const dim of hyp.dimensionScores) {
          if (!dimensionCounts[dim.dimensionId]) {
            dimensionCounts[dim.dimensionId] = { passed: 0, total: 0 }
          }
          dimensionCounts[dim.dimensionId].total++
          if (dim.passed) {
            dimensionCounts[dim.dimensionId].passed++
          }
        }
      }
    }

    for (const [dimId, counts] of Object.entries(dimensionCounts)) {
      dimensionPassRates[dimId] = counts.total > 0 ? counts.passed / counts.total : 0
    }

    // Calculate total evaluation time
    const totalEvaluationTimeMs = hypotheses.reduce((sum, h) => sum + h.evaluationTimeMs, 0)

    // Calculate average final score (non-eliminated only)
    const activeHypotheses = hypotheses.filter(h => h.status !== 'eliminated')
    const averageFinalScore = activeHypotheses.length > 0
      ? activeHypotheses.reduce((sum, h) => sum + h.finalScore, 0) / activeHypotheses.length
      : 0

    return {
      success: breakthroughs.length > 0,
      breakthroughsAchieved: breakthroughs.length,
      topHypotheses: topHypotheses.map(h => ({
        id: h.id,
        title: h.title,
        score: h.finalScore,
        classification: h.classification,
        agentSource: h.agentSource,
        keyInsights: h.dimensionScores
          ?.filter(d => d.passed)
          .flatMap(d => d.evidence)
          .slice(0, 5) || [],
      })),
      overallStats: {
        totalHypothesesEvaluated: hypotheses.length,
        totalIterations: Math.max(...hypotheses.map(h => h.totalIterations), 0),
        totalEvaluationTimeMs,
        averageFinalScore,
        dimensionPassRates,
      },
      recommendations: this.generateRecommendations(),
    }
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = []
    const hypotheses = Array.from(this.hypothesisMap.values())

    // Check breakthrough rate
    const breakthroughs = hypotheses.filter(h => h.status === 'breakthrough')
    if (breakthroughs.length === 0) {
      recommendations.push('No breakthroughs achieved - consider adjusting hypothesis generation strategies or evaluation criteria')
    }

    // Check elimination rate
    const eliminatedCount = hypotheses.filter(h => h.status === 'eliminated').length
    const eliminationRate = hypotheses.length > 0 ? eliminatedCount / hypotheses.length : 0
    if (eliminationRate > 0.7) {
      recommendations.push(`High elimination rate (${(eliminationRate * 100).toFixed(0)}%) - initial hypothesis quality may need improvement`)
    }

    // Check agent effectiveness
    const agentStats: Record<HypGenAgentType, { count: number; avgScore: number; breakthroughs: number }> = {
      'novel': { count: 0, avgScore: 0, breakthroughs: 0 },
      'feasible': { count: 0, avgScore: 0, breakthroughs: 0 },
      'economic': { count: 0, avgScore: 0, breakthroughs: 0 },
      'cross-domain': { count: 0, avgScore: 0, breakthroughs: 0 },
      'paradigm': { count: 0, avgScore: 0, breakthroughs: 0 },
    }

    for (const hyp of hypotheses) {
      const agent = agentStats[hyp.agentSource]
      if (agent) {
        agent.count++
        agent.avgScore += hyp.finalScore
        if (hyp.status === 'breakthrough') agent.breakthroughs++
      }
    }

    // Find underperforming agents
    for (const [agentType, stats] of Object.entries(agentStats)) {
      if (stats.count > 0) {
        stats.avgScore /= stats.count
        if (stats.avgScore < 6.0) {
          recommendations.push(`${agentType} agent underperforming (avg score: ${stats.avgScore.toFixed(1)}) - review generation strategy`)
        }
      }
    }

    // Check for stagnation
    for (const hyp of hypotheses) {
      if (hyp.scoreHistory.length >= 3) {
        const lastThree = hyp.scoreHistory.slice(-3)
        const scoreDiffs = lastThree.map((s, i) => i > 0 ? s.score - lastThree[i - 1].score : 0)
        if (scoreDiffs.every(d => Math.abs(d) < 0.1)) {
          recommendations.push('Score stagnation detected in some hypotheses - consider more aggressive refinement strategies')
          break
        }
      }
    }

    // Add errors as recommendations
    if (this.errors.length > 0) {
      recommendations.push(`${this.errors.length} error(s) occurred during session - review error logs for details`)
    }

    return recommendations
  }

  private createEmptyRaceStats(): RaceStatsLog {
    return {
      totalHypotheses: 0,
      activeCount: 0,
      eliminatedCount: 0,
      breakthroughCount: 0,
      topScore: 0,
      averageScore: 0,
      currentIteration: 0,
      maxIterations: 0,
      elapsedTimeMs: 0,
      hypothesesPerAgent: {
        'novel': 0,
        'feasible': 0,
        'economic': 0,
        'cross-domain': 0,
        'paradigm': 0,
      },
      breakthroughsByAgent: {
        'novel': 0,
        'feasible': 0,
        'economic': 0,
        'cross-domain': 0,
        'paradigm': 0,
      },
      averageScoreByAgent: {
        'novel': 0,
        'feasible': 0,
        'economic': 0,
        'cross-domain': 0,
        'paradigm': 0,
      },
      eliminationsByIteration: [],
    }
  }

  private createEmptyFinalResult(): BreakthroughFinalResult {
    return {
      success: false,
      breakthroughsAchieved: 0,
      topHypotheses: [],
      overallStats: {
        totalHypothesesEvaluated: 0,
        totalIterations: 0,
        totalEvaluationTimeMs: 0,
        averageFinalScore: 0,
        dimensionPassRates: {},
      },
      recommendations: [],
    }
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  private persistSession(): void {
    if (!this.session || typeof window === 'undefined') return

    try {
      localStorage.setItem(
        `breakthrough_debug_${this.session.sessionId}`,
        JSON.stringify(this.session)
      )

      // Also update session index
      const indexKey = 'breakthrough_debug_index'
      const existingIndex = localStorage.getItem(indexKey)
      const index: string[] = existingIndex ? JSON.parse(existingIndex) : []

      if (!index.includes(this.session.sessionId)) {
        index.push(this.session.sessionId)
        // Keep only last 10 sessions
        while (index.length > 10) {
          const oldId = index.shift()
          if (oldId) {
            localStorage.removeItem(`breakthrough_debug_${oldId}`)
          }
        }
        localStorage.setItem(indexKey, JSON.stringify(index))
      }
    } catch (e) {
      console.warn('Failed to persist breakthrough debug session:', e)
    }
  }

  // ============================================================================
  // Export Methods
  // ============================================================================

  exportForAnalysis(
    options: Partial<BreakthroughExportOptions> = {}
  ): BreakthroughAnalysisRequest | null {
    if (!this.session) return null

    const opts = { ...DEFAULT_BREAKTHROUGH_EXPORT_OPTIONS, ...options }
    const hypotheses = Array.from(this.hypothesisMap.values())
    const breakthroughs = hypotheses.filter(h => h.status === 'breakthrough')
    const eliminated = hypotheses.filter(h => h.status === 'eliminated')
    const active = hypotheses.filter(h => h.status === 'active' || h.status === 'breakthrough')

    // Calculate phase durations
    const phaseDurations: Record<BreakthroughPhase, number> = {
      research: this.session.phaseTiming.research?.durationMs || 0,
      generation: this.session.phaseTiming.generation?.durationMs || 0,
      racing: this.session.phaseTiming.racing?.durationMs || 0,
      validation: this.session.phaseTiming.validation?.durationMs || 0,
      complete: 0,
    }

    // Calculate agent effectiveness
    const agentEffectiveness: Record<HypGenAgentType, {
      hypothesesGenerated: number
      averageScore: number
      breakthroughs: number
      eliminationRate: number
    }> = {} as any

    const agentTypes: HypGenAgentType[] = ['novel', 'feasible', 'economic', 'cross-domain', 'paradigm']
    for (const agentType of agentTypes) {
      const agentHypotheses = hypotheses.filter(h => h.agentSource === agentType)
      const agentEliminated = agentHypotheses.filter(h => h.status === 'eliminated')
      const agentBreakthroughs = agentHypotheses.filter(h => h.status === 'breakthrough')

      agentEffectiveness[agentType] = {
        hypothesesGenerated: agentHypotheses.length,
        averageScore: agentHypotheses.length > 0
          ? agentHypotheses.reduce((sum, h) => sum + h.finalScore, 0) / agentHypotheses.length
          : 0,
        breakthroughs: agentBreakthroughs.length,
        eliminationRate: agentHypotheses.length > 0
          ? agentEliminated.length / agentHypotheses.length
          : 0,
      }
    }

    // Calculate dimension stats
    const dimensionStats: Record<string, { passed: number; total: number; totalScore: number }> = {}
    for (const hyp of hypotheses) {
      if (hyp.dimensionScores) {
        for (const dim of hyp.dimensionScores) {
          if (!dimensionStats[dim.dimensionId]) {
            dimensionStats[dim.dimensionId] = { passed: 0, total: 0, totalScore: 0 }
          }
          dimensionStats[dim.dimensionId].total++
          dimensionStats[dim.dimensionId].totalScore += dim.percentOfMax
          if (dim.passed) {
            dimensionStats[dim.dimensionId].passed++
          }
        }
      }
    }

    const passRates: Record<string, number> = {}
    const averageScores: Record<string, number> = {}
    const dimensionPerformance: { id: string; passRate: number }[] = []

    for (const [dimId, stats] of Object.entries(dimensionStats)) {
      passRates[dimId] = stats.total > 0 ? stats.passed / stats.total : 0
      averageScores[dimId] = stats.total > 0 ? stats.totalScore / stats.total : 0
      dimensionPerformance.push({ id: dimId, passRate: passRates[dimId] })
    }

    dimensionPerformance.sort((a, b) => a.passRate - b.passRate)
    const mostChallenging = dimensionPerformance.slice(0, 3).map(d => d.id)
    const bestPerforming = dimensionPerformance.slice(-3).reverse().map(d => d.id)

    // Calculate refinement stats
    let totalIterationsToBreakthrough = 0
    let breakthroughCount = 0
    const allScoreImprovements: number[] = []

    for (const hyp of hypotheses) {
      if (hyp.breakthroughAchievedAt) {
        totalIterationsToBreakthrough += hyp.breakthroughAchievedAt
        breakthroughCount++
      }
      for (let i = 1; i < hyp.scoreHistory.length; i++) {
        allScoreImprovements.push(hyp.scoreHistory[i].delta)
      }
    }

    // Find stagnation points (iterations where average improvement < 0.1)
    const stagnationPoints: number[] = []
    const maxIter = Math.max(...hypotheses.map(h => h.totalIterations), 0)
    for (let iter = 2; iter <= maxIter; iter++) {
      const deltas = hypotheses
        .filter(h => h.scoreHistory.length >= iter)
        .map(h => h.scoreHistory[iter - 1]?.delta || 0)
      if (deltas.length > 0) {
        const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length
        if (Math.abs(avgDelta) < 0.1) {
          stagnationPoints.push(iter)
        }
      }
    }

    // Compile elimination reasons
    const eliminationReasons: Record<string, number> = {}
    for (const hyp of eliminated) {
      const reason = hyp.eliminationReason || 'Unknown'
      eliminationReasons[reason] = (eliminationReasons[reason] || 0) + 1
    }
    const commonReasons = Object.entries(eliminationReasons)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason]) => reason)

    // Build eliminations by iteration
    const eliminationsByIteration: number[] = new Array(maxIter + 1).fill(0)
    for (const hyp of eliminated) {
      const iterEliminated = hyp.totalIterations
      if (iterEliminated >= 0 && iterEliminated <= maxIter) {
        eliminationsByIteration[iterEliminated]++
      }
    }

    // Find performance bottlenecks
    const performanceBottlenecks: { phase: BreakthroughPhase; duration: number; cause?: string }[] = []
    const totalDuration = this.session.endTime
      ? this.session.endTime - this.session.startTime
      : Date.now() - this.session.startTime

    for (const [phase, timing] of Object.entries(this.session.phaseTiming)) {
      if (timing && timing.durationMs > totalDuration * 0.5) {
        performanceBottlenecks.push({
          phase: phase as BreakthroughPhase,
          duration: timing.durationMs,
          cause: timing.durationMs > 60000 ? 'Phase took over 1 minute' : undefined,
        })
      }
    }

    return {
      version: this.session.engineVersion,
      exportedAt: new Date().toISOString(),
      analysisType: 'full',

      session: {
        id: this.session.sessionId,
        query: this.session.query || '',
        domain: this.session.domain,
        status: this.session.status as BreakthroughStatus,
        duration: {
          total: totalDuration,
          byPhase: phaseDurations,
        },
      },

      performance: {
        breakthroughRate: hypotheses.length > 0 ? breakthroughs.length / hypotheses.length : 0,
        averageFinalScore: active.length > 0
          ? active.reduce((sum, h) => sum + h.finalScore, 0) / active.length
          : 0,
        topScore: Math.max(...hypotheses.map(h => h.finalScore), 0),
        eliminationRate: hypotheses.length > 0 ? eliminated.length / hypotheses.length : 0,
        iterationsToBreakthrough: breakthroughCount > 0
          ? totalIterationsToBreakthrough / breakthroughCount
          : null,
        agentEffectiveness,
      },

      dimensions: {
        passRates,
        averageScores,
        mostChallenging,
        bestPerforming,
        // Calculate impact and feasibility dimension scores
        impactDimensionScore: this.calculateImpactDimensionScore(averageScores),
        feasibilityDimensionScore: this.calculateFeasibilityDimensionScore(averageScores),
        feasibilityConfidence: this.calculateFeasibilityConfidence(averageScores),
      },

      hypotheses: {
        breakthroughs: opts.includeFullHypotheses
          ? breakthroughs.slice(0, opts.maxHypotheses)
          : [],
        topPerformers: opts.includeFullHypotheses
          ? active.sort((a, b) => b.finalScore - a.finalScore).slice(0, opts.maxHypotheses)
          : [],
        eliminated: {
          count: eliminated.length,
          commonReasons,
          byIteration: eliminationsByIteration,
        },
      },

      refinement: {
        averageIterationsToBreakthrough: breakthroughCount > 0
          ? totalIterationsToBreakthrough / breakthroughCount
          : 0,
        scoreImprovementPerIteration: allScoreImprovements.length > 0
          ? allScoreImprovements.reduce((a, b) => a + b, 0) / allScoreImprovements.length
          : 0,
        mostEffectiveRefinementTypes: ['feedback', 'self-critique'], // Would need more data
        stagnationPoints,
      },

      issues: {
        errors: opts.includeErrors ? this.errors : [],
        warnings: this.warnings,
        performanceBottlenecks,
      },

      suggestedImprovements: this.session.finalResult.recommendations,
    }
  }

  // ============================================================================
  // Helper Methods for Dimension Calculations (v0.0.3)
  // ============================================================================

  /**
   * Calculate the total impact dimension score (BC1-BC8)
   * Impact dimensions are weighted to sum to 8.0 max
   */
  private calculateImpactDimensionScore(averageScores: Record<string, number>): number {
    const impactDimensions = [
      'bc1_performance', 'bc2_cost', 'bc3_capabilities', 'bc4_applications',
      'bc5_societal', 'bc6_scale', 'bc7_problem_solving', 'bc8_trajectory'
    ]

    let total = 0
    for (const dim of impactDimensions) {
      const score = averageScores[dim] || 0
      // Scores are typically 0-100, normalize to dimension weight
      total += score / 100 * this.getImpactDimensionWeight(dim)
    }
    return total
  }

  /**
   * Calculate the total feasibility dimension score (BC9-BC12)
   * Feasibility dimensions are weighted to sum to 2.0 max
   */
  private calculateFeasibilityDimensionScore(averageScores: Record<string, number>): number {
    const feasibilityDimensions = [
      'bc9_feasibility', 'bc10_literature', 'bc11_infrastructure', 'bc12_capital'
    ]

    let total = 0
    for (const dim of feasibilityDimensions) {
      const score = averageScores[dim] || 0
      // Each feasibility dimension has max 0.5 points
      total += score / 100 * 0.5
    }
    return total
  }

  /**
   * Calculate the feasibility confidence level based on BC9-BC12 scores
   */
  private calculateFeasibilityConfidence(averageScores: Record<string, number>): 'low' | 'medium' | 'high' {
    const feasibilityScore = this.calculateFeasibilityDimensionScore(averageScores)
    const maxFeasibility = 2.0

    const percentage = (feasibilityScore / maxFeasibility) * 100

    if (percentage >= 70) return 'high'
    if (percentage >= 50) return 'medium'
    return 'low'
  }

  /**
   * Get the weight for impact dimensions (BC1-BC8)
   * Total impact weight: 8.0 (scaled from original 10.0)
   */
  private getImpactDimensionWeight(dimension: string): number {
    const weights: Record<string, number> = {
      'bc1_performance': 1.2,
      'bc2_cost': 1.2,
      'bc3_capabilities': 0.8,
      'bc4_applications': 0.8,
      'bc5_societal': 0.8,
      'bc6_scale': 1.2,
      'bc7_problem_solving': 0.8,
      'bc8_trajectory': 1.2,
    }
    return weights[dimension] || 0
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: BreakthroughDiagnosticLogger | null = null

export function getBreakthroughLogger(): BreakthroughDiagnosticLogger {
  if (!instance) {
    instance = new BreakthroughDiagnosticLogger()
  }
  return instance
}

export function resetBreakthroughLogger(): void {
  instance = null
}

export default BreakthroughDiagnosticLogger
