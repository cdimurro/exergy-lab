'use client'

/**
 * useBreakthroughDebug Hook
 *
 * React hook for capturing and managing Breakthrough Engine debug sessions.
 * Provides methods for logging events, exporting sessions, and analyzing performance.
 *
 * @see lib/diagnostics/breakthrough-logger.ts
 * @see lib/diagnostics/breakthrough-formatter.ts
 * @see types/breakthrough-debug.ts
 */

import { useCallback, useRef, useState, useEffect } from 'react'
import {
  getBreakthroughLogger,
  resetBreakthroughLogger,
  formatBreakthroughSession,
} from '@/lib/diagnostics'
import type {
  BreakthroughDebugSession,
  BreakthroughPhase,
  HypGenAgentType,
  HypGenAgentLog,
  DimensionScoreLog,
  RefinementLog,
  RaceStatsLog,
  BreakthroughExportOptions,
  DEFAULT_BREAKTHROUGH_EXPORT_OPTIONS,
} from '@/types/breakthrough-debug'

// ============================================================================
// Types
// ============================================================================

interface UseBreakthroughDebugOptions {
  enabled?: boolean
  autoSave?: boolean
}

interface UseBreakthroughDebugReturn {
  // Session state
  session: BreakthroughDebugSession | null
  isEnabled: boolean
  isRecording: boolean

  // Session management
  startSession: (query: string, domain: string, config: BreakthroughDebugSession['config']) => string
  endSession: (status?: 'completed' | 'failed') => void
  clearSession: () => void

  // Phase logging
  startPhase: (phase: BreakthroughPhase) => void
  endPhase: (phase: BreakthroughPhase) => void

  // Agent logging
  logAgentGeneration: (log: HypGenAgentLog) => void

  // Hypothesis logging
  logHypothesisCreation: (
    id: string,
    title: string,
    description: string | undefined,
    agentSource: HypGenAgentType,
    domain: string,
    initialScore: number
  ) => void
  logHypothesisIteration: (
    id: string,
    iteration: number,
    newScore: number,
    evaluatorNotes?: string,
    dimensionScores?: DimensionScoreLog[]
  ) => void
  logHypothesisRefinement: (
    id: string,
    refinement: Omit<RefinementLog, 'timestamp'>
  ) => void
  logHypothesisElimination: (id: string, reason: string) => void

  // Stats logging
  logRaceStats: (stats: RaceStatsLog) => void

  // Error logging
  logError: (message: string, phase?: BreakthroughPhase, context?: Record<string, unknown>) => void
  logWarning: (message: string) => void

  // Export
  exportSession: (options?: Partial<BreakthroughExportOptions>) => string | null
  copyToClipboard: (options?: Partial<BreakthroughExportOptions>) => Promise<boolean>
  downloadSession: (options?: Partial<BreakthroughExportOptions>, filename?: string) => void
}

// ============================================================================
// Hook
// ============================================================================

export function useBreakthroughDebug(
  options: UseBreakthroughDebugOptions = {}
): UseBreakthroughDebugReturn {
  const { enabled = true, autoSave = true } = options

  const [session, setSession] = useState<BreakthroughDebugSession | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const loggerRef = useRef(getBreakthroughLogger())

  // Update session state from logger
  const syncSession = useCallback(() => {
    const currentSession = loggerRef.current.getSession()
    setSession(currentSession)
  }, [])

  // Session management
  const startSession = useCallback((
    query: string,
    domain: string,
    config: BreakthroughDebugSession['config']
  ): string => {
    if (!enabled) return ''

    // Reset logger for new session
    resetBreakthroughLogger()
    loggerRef.current = getBreakthroughLogger()

    const sessionId = loggerRef.current.startSession(query, domain, config)
    setIsRecording(true)
    syncSession()

    return sessionId
  }, [enabled, syncSession])

  const endSession = useCallback((status: 'completed' | 'failed' = 'completed') => {
    loggerRef.current.endSession(status)
    setIsRecording(false)
    syncSession()
  }, [syncSession])

  const clearSession = useCallback(() => {
    resetBreakthroughLogger()
    loggerRef.current = getBreakthroughLogger()
    setSession(null)
    setIsRecording(false)
  }, [])

  // Phase logging
  const startPhase = useCallback((phase: BreakthroughPhase) => {
    if (!enabled || !isRecording) return
    loggerRef.current.startPhase(phase)
    syncSession()
  }, [enabled, isRecording, syncSession])

  const endPhase = useCallback((phase: BreakthroughPhase) => {
    if (!enabled || !isRecording) return
    loggerRef.current.endPhase(phase)
    syncSession()
  }, [enabled, isRecording, syncSession])

  // Agent logging
  const logAgentGeneration = useCallback((log: HypGenAgentLog) => {
    if (!enabled || !isRecording) return
    loggerRef.current.logAgentGeneration(log)
    syncSession()
  }, [enabled, isRecording, syncSession])

  // Hypothesis logging
  const logHypothesisCreation = useCallback((
    id: string,
    title: string,
    description: string | undefined,
    agentSource: HypGenAgentType,
    domain: string,
    initialScore: number
  ) => {
    if (!enabled || !isRecording) return
    loggerRef.current.logHypothesisCreation(id, title, description, agentSource, domain, initialScore)
    syncSession()
  }, [enabled, isRecording, syncSession])

  const logHypothesisIteration = useCallback((
    id: string,
    iteration: number,
    newScore: number,
    evaluatorNotes?: string,
    dimensionScores?: DimensionScoreLog[]
  ) => {
    if (!enabled || !isRecording) return
    loggerRef.current.logHypothesisIteration(id, iteration, newScore, evaluatorNotes, dimensionScores)
    syncSession()
  }, [enabled, isRecording, syncSession])

  const logHypothesisRefinement = useCallback((
    id: string,
    refinement: Omit<RefinementLog, 'timestamp'>
  ) => {
    if (!enabled || !isRecording) return
    loggerRef.current.logHypothesisRefinement(id, refinement)
    syncSession()
  }, [enabled, isRecording, syncSession])

  const logHypothesisElimination = useCallback((id: string, reason: string) => {
    if (!enabled || !isRecording) return
    loggerRef.current.logHypothesisElimination(id, reason)
    syncSession()
  }, [enabled, isRecording, syncSession])

  // Stats logging
  const logRaceStats = useCallback((stats: RaceStatsLog) => {
    if (!enabled || !isRecording) return
    loggerRef.current.logRaceStats(stats)
    syncSession()
  }, [enabled, isRecording, syncSession])

  // Error logging
  const logError = useCallback((
    message: string,
    phase?: BreakthroughPhase,
    context?: Record<string, unknown>
  ) => {
    if (!enabled) return
    loggerRef.current.logError(message, phase, context)
    syncSession()
  }, [enabled, syncSession])

  const logWarning = useCallback((message: string) => {
    if (!enabled) return
    loggerRef.current.logWarning(message)
  }, [enabled])

  // Export methods
  const exportSession = useCallback((
    options: Partial<BreakthroughExportOptions> = {}
  ): string | null => {
    const currentSession = loggerRef.current.getSession()
    if (!currentSession) return null

    const analysisRequest = loggerRef.current.exportForAnalysis(options)
    if (!analysisRequest) return null

    const exportOptions: BreakthroughExportOptions = {
      format: 'analysis',
      includeFullHypotheses: true,
      includeScoreHistory: true,
      includeRefinementDetails: true,
      includeErrors: true,
      includeRawEvents: false,
      // v0.0.3 options
      includeLLMCalls: true,
      includePerformanceSnapshots: false,
      includeUITransitions: false,
      includeDataSourceLogs: true,
      includeQualityValidation: true,
      includeCostAnalysis: true,
      includeSystemInfo: false,
      includeSSEHealth: true,
      ...options,
    }

    return formatBreakthroughSession(currentSession, analysisRequest, exportOptions)
  }, [])

  const copyToClipboard = useCallback(async (
    options: Partial<BreakthroughExportOptions> = {}
  ): Promise<boolean> => {
    const content = exportSession(options)
    if (!content) return false

    try {
      await navigator.clipboard.writeText(content)
      return true
    } catch (e) {
      console.error('Failed to copy to clipboard:', e)
      return false
    }
  }, [exportSession])

  const downloadSession = useCallback((
    options: Partial<BreakthroughExportOptions> = {},
    filename?: string
  ) => {
    const content = exportSession(options)
    if (!content) return

    const format = options.format || 'analysis'
    const extension = format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'md'
    const defaultFilename = `breakthrough-debug-${Date.now()}.${extension}`

    const blob = new Blob([content], {
      type: format === 'json' ? 'application/json' : 'text/plain',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || defaultFilename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [exportSession])

  // Load session from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const indexKey = 'breakthrough_debug_index'
      const existingIndex = localStorage.getItem(indexKey)
      if (existingIndex) {
        const index: string[] = JSON.parse(existingIndex)
        if (index.length > 0) {
          const lastSessionId = index[index.length - 1]
          const savedSession = localStorage.getItem(`breakthrough_debug_${lastSessionId}`)
          if (savedSession) {
            const parsed = JSON.parse(savedSession) as BreakthroughDebugSession
            // Only restore recent sessions (within 1 hour)
            if (Date.now() - parsed.startTime < 60 * 60 * 1000) {
              setSession(parsed)
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load breakthrough debug session:', e)
    }
  }, [])

  return {
    session,
    isEnabled: enabled,
    isRecording,
    startSession,
    endSession,
    clearSession,
    startPhase,
    endPhase,
    logAgentGeneration,
    logHypothesisCreation,
    logHypothesisIteration,
    logHypothesisRefinement,
    logHypothesisElimination,
    logRaceStats,
    logError,
    logWarning,
    exportSession,
    copyToClipboard,
    downloadSession,
  }
}

export default useBreakthroughDebug
