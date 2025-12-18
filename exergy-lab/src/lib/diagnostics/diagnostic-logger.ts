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
} from './types'
import { DIAGNOSTIC_STORAGE_KEYS } from './types'
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
