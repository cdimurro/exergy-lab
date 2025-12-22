/**
 * Diagnostic Logger Service
 *
 * Captures detailed evaluation data for analysis, debugging, and user insights.
 * Features:
 * - Buffered logging with periodic flush
 * - LocalStorage persistence for debug viewer
 * - Session management and indexing
 * - Report generation for problematic items
 */

import type {
  DiagnosticLogEntry,
  DiagnosticType,
  DiagnosticData,
  RubricEvaluationLog,
  BenchmarkResultLog,
  InputVariationLog,
  AgentReasoningLog,
  PhaseTransitionLog,
  ErrorRecoveryLog,
  DiagnosticReport,
  ProblematicItem,
  PhaseStatistics,
  DiagnosticRecommendation,
  DiagnosticSessionIndex,
  // New in v0.0.3
  LLMCallDiagnostic,
  PerformanceProfile,
  PerformanceMetricsSummary,
  DataSourceDiagnostic,
  DataSourceMetricsSummary,
  SSEHealthLog,
  SSEHealthMetrics,
  UIEventLog,
  UIEventType,
  UIMetricsSummary,
  CostBreakdown,
  ExtendedDiagnosticReport,
  DiagnosticAlert,
  AlertSeverity,
  AlertCategory,
  AlertThresholds,
} from './types'
import { DIAGNOSTIC_STORAGE_KEYS, DEFAULT_ALERT_THRESHOLDS } from './types'
import type { DiscoveryPhase } from '../ai/rubrics/types'

// ============================================================================
// Diagnostic Logger Class
// ============================================================================

class DiagnosticLogger {
  private logs: DiagnosticLogEntry[] = []
  private buffer: DiagnosticLogEntry[] = []
  private sessionId: string
  private discoveryId?: string
  private flushInterval: ReturnType<typeof setInterval> | null = null

  // Configuration
  private bufferSize = 20
  private flushIntervalMs = 10000
  private enabled = true

  // New in v0.0.3: Comprehensive tracking
  private llmCalls: LLMCallDiagnostic[] = []
  private performanceProfiles: PerformanceProfile[] = []
  private dataSourceLogs: DataSourceDiagnostic[] = []
  private sseHealthLogs: SSEHealthLog[] = []
  private uiEventLogs: UIEventLog[] = []
  private alerts: DiagnosticAlert[] = []
  private alertThresholds: AlertThresholds = DEFAULT_ALERT_THRESHOLDS
  private lastHeartbeatTime: number = 0
  private heartbeatLatencies: number[] = []
  private costByPhase: Record<string, number> = {}
  private costByModel: Record<string, number> = {}
  private costByOperation: Record<string, number> = {}
  private totalCostUSD: number = 0
  private totalTokensUsed = { input: 0, output: 0, total: 0 }
  private sessionStartTime: number = 0
  private phaseStartTimes: Map<DiscoveryPhase, number> = new Map()

  constructor() {
    this.sessionId = this.generateSessionId()
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  initialize(options?: {
    sessionId?: string
    discoveryId?: string
    enabled?: boolean
  }) {
    this.sessionId = options?.sessionId || this.generateSessionId()
    this.discoveryId = options?.discoveryId
    this.enabled = options?.enabled ?? true
    this.logs = []
    this.buffer = []
    this.sessionStartTime = Date.now()

    // Reset v0.0.3 tracking
    this.llmCalls = []
    this.performanceProfiles = []
    this.dataSourceLogs = []
    this.sseHealthLogs = []
    this.uiEventLogs = []
    this.alerts = []
    this.lastHeartbeatTime = 0
    this.heartbeatLatencies = []
    this.costByPhase = {}
    this.costByModel = {}
    this.costByOperation = {}
    this.totalCostUSD = 0
    this.totalTokensUsed = { input: 0, output: 0, total: 0 }
    this.phaseStartTimes.clear()

    this.startAutoFlush()
    this.updateSessionIndex('running')
  }

  setDiscoveryId(discoveryId: string) {
    this.discoveryId = discoveryId
  }

  // ============================================================================
  // Logging Methods
  // ============================================================================

  logRubricEvaluation(data: Omit<RubricEvaluationLog, 'type'>) {
    if (!this.enabled) return
    this.addEntry('rubric_evaluation', { type: 'rubric_evaluation', ...data })
  }

  logBenchmarkResult(data: Omit<BenchmarkResultLog, 'type'>) {
    if (!this.enabled) return
    this.addEntry('benchmark_result', { type: 'benchmark_result', ...data })
  }

  logInputVariation(data: Omit<InputVariationLog, 'type'>) {
    if (!this.enabled) return
    this.addEntry('input_variation', { type: 'input_variation', ...data })
  }

  logAgentReasoning(data: Omit<AgentReasoningLog, 'type'>) {
    if (!this.enabled) return
    this.addEntry('agent_reasoning', { type: 'agent_reasoning', ...data })
  }

  logPhaseTransition(data: Omit<PhaseTransitionLog, 'type'>) {
    if (!this.enabled) return
    this.addEntry('phase_transition', { type: 'phase_transition', ...data })
  }

  logErrorRecovery(data: Omit<ErrorRecoveryLog, 'type'>) {
    if (!this.enabled) return
    this.addEntry('error_recovery', { type: 'error_recovery', ...data })
  }

  // ============================================================================
  // LLM Call Logging (v0.0.3)
  // ============================================================================

  logLLMCall(call: Omit<LLMCallDiagnostic, 'id' | 'timestamp'>): void {
    if (!this.enabled) return

    const llmCall: LLMCallDiagnostic = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...call,
    }

    this.llmCalls.push(llmCall)

    // Update cost tracking
    this.totalCostUSD += call.costEstimateUSD
    this.totalTokensUsed.input += call.inputTokens
    this.totalTokensUsed.output += call.outputTokens
    this.totalTokensUsed.total += call.totalTokens

    // Track cost by phase
    const phaseKey = call.phase as string
    this.costByPhase[phaseKey] = (this.costByPhase[phaseKey] || 0) + call.costEstimateUSD

    // Track cost by model
    this.costByModel[call.model] = (this.costByModel[call.model] || 0) + call.costEstimateUSD

    // Track cost by purpose/operation
    this.costByOperation[call.purpose] = (this.costByOperation[call.purpose] || 0) + call.costEstimateUSD

    // Check for alerts
    if (call.latencyMs > this.alertThresholds.llmLatencyMs) {
      this.addAlert('warning', 'performance', `LLM call exceeded latency threshold: ${call.latencyMs}ms`, {
        model: call.model,
        purpose: call.purpose,
        threshold: this.alertThresholds.llmLatencyMs,
      })
    }
  }

  // ============================================================================
  // Performance Profiling (v0.0.3)
  // ============================================================================

  logPerformanceProfile(phase: DiscoveryPhase, operation: string, durationMs: number, success: boolean, metadata?: Record<string, unknown>): void {
    if (!this.enabled) return

    const profile: PerformanceProfile = {
      timestamp: Date.now(),
      phase,
      operation,
      durationMs,
      success,
      metadata,
    }

    this.performanceProfiles.push(profile)
  }

  startPhaseTimer(phase: DiscoveryPhase): void {
    this.phaseStartTimes.set(phase, Date.now())
  }

  endPhaseTimer(phase: DiscoveryPhase): number {
    const start = this.phaseStartTimes.get(phase)
    if (!start) return 0
    return Date.now() - start
  }

  // ============================================================================
  // Data Source Logging (v0.0.3)
  // ============================================================================

  logDataSourceCall(log: Omit<DataSourceDiagnostic, 'id' | 'timestamp'>): void {
    if (!this.enabled) return

    const dataLog: DataSourceDiagnostic = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...log,
    }

    this.dataSourceLogs.push(dataLog)
  }

  // ============================================================================
  // SSE Health Logging (v0.0.3)
  // ============================================================================

  logSSEEvent(event: 'connect' | 'disconnect' | 'reconnect' | 'heartbeat' | 'error', errorMessage?: string): void {
    if (!this.enabled) return

    const now = Date.now()
    const sseLog: SSEHealthLog = {
      timestamp: now,
      event,
      errorMessage,
    }

    this.sseHealthLogs.push(sseLog)

    if (event === 'heartbeat') {
      if (this.lastHeartbeatTime > 0) {
        const latency = now - this.lastHeartbeatTime
        this.heartbeatLatencies.push(latency)
        sseLog.latencyMs = latency
      }
      this.lastHeartbeatTime = now
    }
  }

  // ============================================================================
  // UI Event Logging (v0.0.3)
  // ============================================================================

  logUIEvent(type: UIEventType, component: string, durationMs?: number, details?: Record<string, unknown>): void {
    if (!this.enabled) return

    const uiLog: UIEventLog = {
      id: this.generateId(),
      timestamp: Date.now(),
      type,
      component,
      durationMs,
      details,
    }

    this.uiEventLogs.push(uiLog)
  }

  // ============================================================================
  // Alert System (v0.0.3)
  // ============================================================================

  setAlertThresholds(thresholds: Partial<AlertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds }
  }

  private addAlert(severity: AlertSeverity, category: AlertCategory, message: string, details?: Record<string, unknown>): void {
    const alert: DiagnosticAlert = {
      id: this.generateId(),
      timestamp: Date.now(),
      sessionId: this.sessionId,
      severity,
      category,
      message,
      details,
    }

    this.alerts.push(alert)
  }

  getAlerts(): DiagnosticAlert[] {
    return [...this.alerts]
  }

  // ============================================================================
  // Metrics Computation (v0.0.3)
  // ============================================================================

  computeLLMMetrics(): PerformanceMetricsSummary['llmMetrics'] {
    const successfulCalls = this.llmCalls.filter(c => c.success)
    const errorCalls = this.llmCalls.filter(c => !c.success)
    const cachedCalls = this.llmCalls.filter(c => c.cacheHit)

    return {
      totalCalls: this.llmCalls.length,
      totalTokens: this.totalTokensUsed.total,
      totalCostUSD: this.totalCostUSD,
      avgLatencyMs: this.llmCalls.length > 0
        ? this.llmCalls.reduce((sum, c) => sum + c.latencyMs, 0) / this.llmCalls.length
        : 0,
      errorRate: this.llmCalls.length > 0 ? errorCalls.length / this.llmCalls.length : 0,
      cacheHitRate: this.llmCalls.length > 0 ? cachedCalls.length / this.llmCalls.length : 0,
    }
  }

  computeDataSourceMetrics(): DataSourceMetricsSummary {
    const bySource: DataSourceMetricsSummary['bySource'] = {}

    for (const log of this.dataSourceLogs) {
      if (!bySource[log.source]) {
        bySource[log.source] = {
          calls: 0,
          successRate: 0,
          avgLatencyMs: 0,
          cacheHitRate: 0,
          avgQualityScore: 0,
        }
      }
      bySource[log.source].calls++
    }

    // Compute averages
    for (const [source, stats] of Object.entries(bySource)) {
      const sourceLogs = this.dataSourceLogs.filter(l => l.source === source)
      stats.avgLatencyMs = sourceLogs.reduce((s, l) => s + l.latencyMs, 0) / sourceLogs.length
      stats.successRate = sourceLogs.filter(l => l.success).length / sourceLogs.length
      stats.cacheHitRate = sourceLogs.filter(l => l.cacheHit).length / sourceLogs.length
      const withQuality = sourceLogs.filter(l => l.qualityScore !== undefined)
      stats.avgQualityScore = withQuality.length > 0
        ? withQuality.reduce((s, l) => s + (l.qualityScore || 0), 0) / withQuality.length
        : 0
    }

    const totalLatency = this.dataSourceLogs.reduce((s, l) => s + l.latencyMs, 0)
    const cacheHits = this.dataSourceLogs.filter(l => l.cacheHit).length

    return {
      totalCalls: this.dataSourceLogs.length,
      successRate: this.dataSourceLogs.length > 0
        ? this.dataSourceLogs.filter(l => l.success).length / this.dataSourceLogs.length
        : 0,
      cacheHitRate: this.dataSourceLogs.length > 0 ? cacheHits / this.dataSourceLogs.length : 0,
      avgLatencyMs: this.dataSourceLogs.length > 0 ? totalLatency / this.dataSourceLogs.length : 0,
      bySource,
    }
  }

  computeSSEHealthMetrics(): SSEHealthMetrics {
    const connectEvents = this.sseHealthLogs.filter(l => l.event === 'connect')
    const reconnectEvents = this.sseHealthLogs.filter(l => l.event === 'reconnect')
    const errorEvents = this.sseHealthLogs.filter(l => l.event === 'error')

    const avgHeartbeatLatency = this.heartbeatLatencies.length > 0
      ? this.heartbeatLatencies.reduce((a, b) => a + b, 0) / this.heartbeatLatencies.length
      : 0

    // Calculate uptime (simplified)
    const now = Date.now()
    const sessionDuration = now - this.sessionStartTime
    const disconnectDuration = reconnectEvents.length * 5000 // Estimate 5s per reconnect

    return {
      connectionAttempts: connectEvents.length,
      successfulConnections: connectEvents.length - errorEvents.length,
      reconnections: reconnectEvents.length,
      missedHeartbeats: 0, // Would need external tracking
      avgHeartbeatLatencyMs: avgHeartbeatLatency,
      errors: errorEvents.map(e => ({ timestamp: e.timestamp, message: e.errorMessage || 'Unknown error' })),
      uptime: sessionDuration > 0 ? (sessionDuration - disconnectDuration) / sessionDuration : 0,
      downtimeMs: disconnectDuration,
    }
  }

  computeUIMetrics(): UIMetricsSummary {
    const renders = this.uiEventLogs.filter(l => l.type === 'render' && l.durationMs)
    const stateChanges = this.uiEventLogs.filter(l => l.type === 'state_change')
    const userInteractions = this.uiEventLogs.filter(l => l.type === 'user_interaction')
    const errors = this.uiEventLogs.filter(l => l.type === 'error_display')

    const renderTimes = renders.map(r => r.durationMs!).filter(Boolean)
    const avgRenderTime = renderTimes.length > 0
      ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length
      : 0

    const componentCounts: Record<string, number> = {}
    for (const log of this.uiEventLogs) {
      componentCounts[log.component] = (componentCounts[log.component] || 0) + 1
    }

    const slowRenders = renders
      .filter(r => r.durationMs && r.durationMs > 100)
      .sort((a, b) => (b.durationMs || 0) - (a.durationMs || 0))
      .slice(0, 10)
      .map(r => ({
        component: r.component,
        durationMs: r.durationMs!,
        timestamp: r.timestamp,
      }))

    return {
      totalRenders: renders.length,
      avgRenderTimeMs: avgRenderTime,
      slowRenders,
      stateChanges: stateChanges.length,
      userInteractions: userInteractions.length,
      errors: errors.length,
      componentRenderCounts: componentCounts,
    }
  }

  computeCostBreakdown(): CostBreakdown {
    const phases = Object.keys(this.costByPhase) as DiscoveryPhase[]
    const costPerPhase: Record<DiscoveryPhase, number> = {} as Record<DiscoveryPhase, number>
    for (const phase of phases) {
      costPerPhase[phase] = this.costByPhase[phase] || 0
    }

    return {
      totalCostUSD: this.totalCostUSD,
      byPhase: costPerPhase,
      byModel: { ...this.costByModel },
      byOperation: { ...this.costByOperation },
      tokensUsed: { ...this.totalTokensUsed },
      efficiency: {
        costPerIteration: 0, // Would need iteration tracking
        costPerPhase: costPerPhase,
        costEfficiencyRating: this.totalCostUSD < 1 ? 'high' : this.totalCostUSD < 3 ? 'medium' : 'low',
      },
    }
  }

  // ============================================================================
  // Extended Report Generation (v0.0.3)
  // ============================================================================

  generateExtendedReport(): ExtendedDiagnosticReport {
    const baseReport = this.generateReport()

    return {
      ...baseReport,
      llmMetrics: this.computeLLMMetrics(),
      dataSourceMetrics: this.computeDataSourceMetrics(),
      sseHealthMetrics: this.computeSSEHealthMetrics(),
      uiMetrics: this.computeUIMetrics(),
      costBreakdown: this.computeCostBreakdown(),
      systemInfo: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        platform: typeof navigator !== 'undefined' ? navigator.platform : undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        sessionStart: new Date(this.sessionStartTime || Date.now()).toISOString(),
        sessionEnd: new Date().toISOString(),
      },
    }
  }

  // ============================================================================
  // Core Logging
  // ============================================================================

  private addEntry(type: DiagnosticType, data: DiagnosticData) {
    const entry: DiagnosticLogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      sessionId: this.sessionId,
      discoveryId: this.discoveryId,
      type,
      data,
    }

    this.buffer.push(entry)

    if (this.buffer.length >= this.bufferSize) {
      this.flush()
    }
  }

  flush() {
    if (this.buffer.length === 0) return

    this.logs.push(...this.buffer)
    this.buffer = []
    this.persistToStorage()
  }

  // ============================================================================
  // Retrieval Methods
  // ============================================================================

  getLogsForSession(sessionId?: string): DiagnosticLogEntry[] {
    const id = sessionId || this.sessionId
    return this.logs.filter(l => l.sessionId === id)
  }

  getLogsByType<T extends DiagnosticData>(type: DiagnosticType): T[] {
    return this.logs
      .filter(l => l.type === type)
      .map(l => l.data as T)
  }

  getRubricLogs(): RubricEvaluationLog[] {
    return this.getLogsByType<RubricEvaluationLog>('rubric_evaluation')
  }

  getBenchmarkLogs(): BenchmarkResultLog[] {
    return this.getLogsByType<BenchmarkResultLog>('benchmark_result')
  }

  getAgentReasoningLogs(): AgentReasoningLog[] {
    return this.getLogsByType<AgentReasoningLog>('agent_reasoning')
  }

  // ============================================================================
  // Report Generation
  // ============================================================================

  generateReport(): DiagnosticReport {
    this.flush() // Ensure all buffered logs are included

    const rubricLogs = this.getRubricLogs()
    const startTime = this.logs[0]?.timestamp || Date.now()
    const endTime = this.logs[this.logs.length - 1]?.timestamp || Date.now()

    return {
      sessionId: this.sessionId,
      discoveryId: this.discoveryId,
      generatedAt: Date.now(),
      totalEvaluations: rubricLogs.length,
      totalDurationMs: endTime - startTime,
      problematicItems: this.findProblematicItems(rubricLogs),
      phaseStatistics: this.calculatePhaseStatistics(rubricLogs),
      recommendations: this.generateRecommendations(rubricLogs),
    }
  }

  private findProblematicItems(rubricLogs: RubricEvaluationLog[]): ProblematicItem[] {
    const itemStats = new Map<string, {
      name: string
      phase: DiscoveryPhase
      attempts: number
      failures: number
      scores: number[]
      reasons: string[]
    }>()

    for (const log of rubricLogs) {
      for (const item of log.items) {
        const key = `${log.phase}:${item.id}`
        const existing = itemStats.get(key) || {
          name: item.name,
          phase: log.phase,
          attempts: 0,
          failures: 0,
          scores: [],
          reasons: [],
        }

        existing.attempts++
        existing.scores.push(item.score)

        if (!item.passed) {
          existing.failures++
          if (item.reasoning && !existing.reasons.includes(item.reasoning)) {
            existing.reasons.push(item.reasoning)
          }
        }

        itemStats.set(key, existing)
      }
    }

    // Find items with >50% failure rate
    return Array.from(itemStats.entries())
      .map(([key, stats]) => {
        const [phase, id] = key.split(':')
        return {
          id,
          name: stats.name,
          phase: phase as DiscoveryPhase,
          attempts: stats.attempts,
          failures: stats.failures,
          failureRate: stats.attempts > 0 ? stats.failures / stats.attempts : 0,
          averageScore: stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length,
          commonReasons: stats.reasons.slice(0, 3),
        }
      })
      .filter(item => item.failureRate > 0.5)
      .sort((a, b) => b.failureRate - a.failureRate)
  }

  private calculatePhaseStatistics(rubricLogs: RubricEvaluationLog[]): PhaseStatistics[] {
    const phaseStats = new Map<DiscoveryPhase, {
      evaluations: number
      passed: number
      scores: number[]
      iterations: number[]
      durations: number[]
    }>()

    for (const log of rubricLogs) {
      const existing = phaseStats.get(log.phase) || {
        evaluations: 0,
        passed: 0,
        scores: [],
        iterations: [],
        durations: [],
      }

      existing.evaluations++
      existing.scores.push(log.totalScore)
      existing.iterations.push(log.iteration)
      existing.durations.push(log.evaluationDurationMs)

      if (log.passed) {
        existing.passed++
      }

      phaseStats.set(log.phase, existing)
    }

    return Array.from(phaseStats.entries()).map(([phase, stats]) => ({
      phase,
      evaluations: stats.evaluations,
      passed: stats.passed,
      failed: stats.evaluations - stats.passed,
      passRate: stats.evaluations > 0 ? stats.passed / stats.evaluations : 0,
      averageScore: stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length,
      averageIterations: stats.iterations.reduce((a, b) => a + b, 0) / stats.iterations.length,
      averageDurationMs: stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length,
    }))
  }

  private generateRecommendations(rubricLogs: RubricEvaluationLog[]): DiagnosticRecommendation[] {
    const recommendations: DiagnosticRecommendation[] = []
    const problematic = this.findProblematicItems(rubricLogs)

    // Recommendations for frequently failing items
    for (const item of problematic.slice(0, 5)) {
      recommendations.push({
        priority: item.failureRate > 0.8 ? 'high' : 'medium',
        category: 'rubric',
        issue: `Item ${item.id} failed ${Math.round(item.failureRate * 100)}% of attempts`,
        suggestion: this.getSuggestionForItem(item),
        relatedItems: [item.id],
        relatedPhases: [item.phase],
      })
    }

    // Phase-level recommendations
    const phaseStats = this.calculatePhaseStatistics(rubricLogs)
    for (const stats of phaseStats) {
      if (stats.passRate < 0.5) {
        recommendations.push({
          priority: 'high',
          category: 'process',
          issue: `${stats.phase} phase has low pass rate (${Math.round(stats.passRate * 100)}%)`,
          suggestion: `Consider reviewing ${stats.phase} requirements or providing more specific guidance`,
          relatedPhases: [stats.phase],
        })
      }
    }

    return recommendations.sort((a, b) =>
      a.priority === 'high' ? -1 : b.priority === 'high' ? 1 : 0
    )
  }

  private getSuggestionForItem(item: ProblematicItem): string {
    const suggestions: Record<string, string> = {
      R2: 'Expand literature search to include more diverse source types',
      H2: 'Ensure all evidence claims have explicit citations',
      H6: 'Add more detailed mechanistic steps with physical principles',
      S3: 'Review efficiency claims against thermodynamic limits',
      L6: 'Include more recent sources (2020+)',
    }

    return suggestions[item.id] ||
      `Review criteria for ${item.name} - ${item.commonReasons[0] || 'check pass conditions'}`
  }

  // ============================================================================
  // Storage
  // ============================================================================

  private persistToStorage() {
    if (typeof window === 'undefined') return

    try {
      const key = `${DIAGNOSTIC_STORAGE_KEYS.sessionPrefix}${this.sessionId}`
      localStorage.setItem(key, JSON.stringify(this.logs))
    } catch (e) {
      console.warn('Failed to persist diagnostics:', e)
    }
  }

  private updateSessionIndex(status: 'running' | 'completed' | 'failed') {
    if (typeof window === 'undefined') return

    try {
      const indexKey = DIAGNOSTIC_STORAGE_KEYS.sessionIndex
      const index: DiagnosticSessionIndex[] = JSON.parse(
        localStorage.getItem(indexKey) || '[]'
      )

      // Find or create session entry
      const existingIndex = index.findIndex(s => s.sessionId === this.sessionId)
      const sessionEntry: DiagnosticSessionIndex = {
        sessionId: this.sessionId,
        startTime: this.logs[0]?.timestamp || Date.now(),
        endTime: status !== 'running' ? Date.now() : undefined,
        discoveryId: this.discoveryId,
        status,
        logCount: this.logs.length,
      }

      if (existingIndex >= 0) {
        index[existingIndex] = sessionEntry
      } else {
        index.push(sessionEntry)
      }

      // Keep only last N sessions
      while (index.length > DIAGNOSTIC_STORAGE_KEYS.maxSessions) {
        const oldest = index.shift()
        if (oldest) {
          localStorage.removeItem(`${DIAGNOSTIC_STORAGE_KEYS.sessionPrefix}${oldest.sessionId}`)
        }
      }

      localStorage.setItem(indexKey, JSON.stringify(index))
    } catch (e) {
      console.warn('Failed to update session index:', e)
    }
  }

  loadSession(sessionId: string): DiagnosticLogEntry[] | null {
    if (typeof window === 'undefined') return null

    try {
      const key = `${DIAGNOSTIC_STORAGE_KEYS.sessionPrefix}${sessionId}`
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : null
    } catch (e) {
      console.warn('Failed to load session:', e)
      return null
    }
  }

  listSessions(): DiagnosticSessionIndex[] {
    if (typeof window === 'undefined') return []

    try {
      const indexKey = DIAGNOSTIC_STORAGE_KEYS.sessionIndex
      return JSON.parse(localStorage.getItem(indexKey) || '[]')
    } catch (e) {
      return []
    }
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  private startAutoFlush() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }
    this.flushInterval = setInterval(() => this.flush(), this.flushIntervalMs)
  }

  cleanup(status: 'completed' | 'failed' = 'completed') {
    this.flush()
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }
    this.updateSessionIndex(status)
  }

  reset() {
    this.logs = []
    this.buffer = []
    this.sessionId = this.generateSessionId()
    this.discoveryId = undefined

    // Reset v0.0.3 tracking
    this.llmCalls = []
    this.performanceProfiles = []
    this.dataSourceLogs = []
    this.sseHealthLogs = []
    this.uiEventLogs = []
    this.alerts = []
    this.lastHeartbeatTime = 0
    this.heartbeatLatencies = []
    this.costByPhase = {}
    this.costByModel = {}
    this.costByOperation = {}
    this.totalCostUSD = 0
    this.totalTokensUsed = { input: 0, output: 0, total: 0 }
    this.sessionStartTime = 0
    this.phaseStartTimes.clear()
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private generateSessionId(): string {
    return `diag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  }

  getSessionId(): string {
    return this.sessionId
  }

  isEnabled(): boolean {
    return this.enabled
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const diagnosticLogger = new DiagnosticLogger()
export { DiagnosticLogger }
