'use client'

/**
 * useDebugCapture Hook
 *
 * Captures and stores debug events from FrontierScience discovery workflow.
 * Provides event interception, API call tracking, and session management.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import type {
  DebugEvent,
  APICallLog,
  ErrorLog,
  DebugSession,
  DebugConfig,
  DebugStats,
  ExportOptions,
  DebugEventCategory,
  DebugSessionStatus,
} from '@/types/debug'
import { DEFAULT_DEBUG_CONFIG } from '@/types/debug'
import { formatDebugSession } from '@/lib/debug-formatter'

// ============================================================================
// Utility Functions
// ============================================================================

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
}

function canAccessDebugViewer(): boolean {
  if (typeof window === 'undefined') return false
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_ENABLE_DEBUG_VIEWER === 'true'
  )
}

// ============================================================================
// Hook Options
// ============================================================================

interface UseDebugCaptureOptions {
  enabled?: boolean
  config?: Partial<DebugConfig>
  onEvent?: (event: DebugEvent) => void
  onError?: (error: ErrorLog) => void
  onApiCall?: (apiCall: APICallLog) => void
}

interface UseDebugCaptureReturn {
  // Session state
  session: DebugSession | null
  isEnabled: boolean
  isOpen: boolean

  // Actions
  startSession: (discoveryId: string, query?: string) => void
  endSession: (status?: DebugSessionStatus) => void
  clearSession: () => void

  // Event capture
  addEvent: (event: Omit<DebugEvent, 'id'>) => void
  addApiCall: (apiCall: Omit<APICallLog, 'id'>) => void
  addError: (error: Omit<ErrorLog, 'id'>) => void

  // SSE event integration
  captureSSEEvent: (eventType: string, data: unknown, phase?: string) => void

  // UI controls
  toggleOpen: () => void
  setOpen: (open: boolean) => void
  setEnabled: (enabled: boolean) => void

  // Export
  exportSession: (options?: Partial<ExportOptions>) => string
  copyToClipboard: (options?: Partial<ExportOptions>) => Promise<boolean>

  // Stats
  stats: DebugStats
}

// ============================================================================
// Main Hook
// ============================================================================

export function useDebugCapture(
  options: UseDebugCaptureOptions = {}
): UseDebugCaptureReturn {
  const {
    enabled: initialEnabled = canAccessDebugViewer(),
    config: configOverrides = {},
    onEvent,
    onError,
    onApiCall,
  } = options

  const config = useMemo(
    () => ({ ...DEFAULT_DEBUG_CONFIG, ...configOverrides }),
    [configOverrides]
  )

  // State
  const [session, setSession] = useState<DebugSession | null>(null)
  const [isEnabled, setIsEnabled] = useState(initialEnabled)
  const [isOpen, setIsOpen] = useState(false)

  // Refs for performance
  const sessionRef = useRef<DebugSession | null>(null)
  const configRef = useRef(config)

  // Keep refs in sync
  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    configRef.current = config
  }, [config])

  // ============================================================================
  // Session Management
  // ============================================================================

  const startSession = useCallback((discoveryId: string, query?: string) => {
    const newSession: DebugSession = {
      sessionId: generateId(),
      discoveryId,
      startTime: Date.now(),
      status: 'running',
      query,
      events: [],
      apiCalls: [],
      errors: [],
      // New in v0.0.3
      llmCalls: [],
      performanceSnapshots: [],
      dataSourceLogs: [],
      sseHealthLogs: [],
      uiStateLogs: [],
      qualityValidations: [],
      alerts: [],
      metadata: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        sessionStart: new Date().toISOString(),
        totalEvents: 0,
        totalApiCalls: 0,
        totalErrors: 0,
      },
    }
    setSession(newSession)

    // Persist to localStorage if enabled
    if (configRef.current.persistToLocalStorage && typeof window !== 'undefined') {
      try {
        localStorage.setItem('debug_session', JSON.stringify(newSession))
      } catch {
        // Ignore storage errors
      }
    }
  }, [])

  const endSession = useCallback((status: DebugSessionStatus = 'completed') => {
    setSession((prev) => {
      if (!prev) return null
      return {
        ...prev,
        endTime: Date.now(),
        status,
        metadata: {
          ...prev.metadata,
          totalEvents: prev.events.length,
          totalApiCalls: prev.apiCalls.length,
          totalErrors: prev.errors.length,
        },
      }
    })
  }, [])

  const clearSession = useCallback(() => {
    setSession(null)
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('debug_session')
      } catch {
        // Ignore storage errors
      }
    }
  }, [])

  // ============================================================================
  // Event Capture
  // ============================================================================

  const addEvent = useCallback(
    (event: Omit<DebugEvent, 'id'>) => {
      if (!isEnabled) return

      const newEvent: DebugEvent = {
        ...event,
        id: generateId(),
      }

      setSession((prev) => {
        if (!prev) return prev

        const events = [...prev.events, newEvent]
        // Trim if over limit
        if (events.length > configRef.current.maxEvents) {
          events.shift()
        }

        return { ...prev, events }
      })

      onEvent?.(newEvent)
    },
    [isEnabled, onEvent]
  )

  const addApiCall = useCallback(
    (apiCall: Omit<APICallLog, 'id'>) => {
      if (!isEnabled) return

      const newApiCall: APICallLog = {
        ...apiCall,
        id: generateId(),
      }

      setSession((prev) => {
        if (!prev) return prev

        const apiCalls = [...prev.apiCalls, newApiCall]
        // Trim if over limit
        if (apiCalls.length > configRef.current.maxApiCalls) {
          apiCalls.shift()
        }

        return { ...prev, apiCalls }
      })

      onApiCall?.(newApiCall)
    },
    [isEnabled, onApiCall]
  )

  const addError = useCallback(
    (error: Omit<ErrorLog, 'id'>) => {
      if (!isEnabled) return

      const newError: ErrorLog = {
        ...error,
        id: generateId(),
      }

      setSession((prev) => {
        if (!prev) return prev

        const errors = [...prev.errors, newError]
        // Trim if over limit
        if (errors.length > configRef.current.maxErrors) {
          errors.shift()
        }

        return { ...prev, errors, status: 'running' }
      })

      onError?.(newError)
    },
    [isEnabled, onError]
  )

  // ============================================================================
  // SSE Event Integration
  // ============================================================================

  const captureSSEEvent = useCallback(
    (eventType: string, data: unknown, phase?: string) => {
      if (!isEnabled) return

      // Map SSE event types to debug categories
      const categoryMap: Record<string, DebugEventCategory> = {
        progress: 'progress',
        iteration: 'iteration',
        judge: 'judge',
        complete: 'complete',
        heartbeat: 'heartbeat',
        error: 'error',
        thinking: 'progress',
      }

      const category = categoryMap[eventType] || 'progress'

      addEvent({
        timestamp: Date.now(),
        type: 'sse',
        category,
        phase: phase as DebugEvent['phase'],
        data,
      })

      // Also capture errors separately
      if (eventType === 'error' && data) {
        const errorData = data as { message?: string; stack?: string }
        addError({
          timestamp: Date.now(),
          phase: phase as ErrorLog['phase'],
          message: errorData.message || 'Unknown error',
          stack: errorData.stack,
          context: { eventType, data },
        })
      }
    },
    [isEnabled, addEvent, addError]
  )

  // ============================================================================
  // UI Controls
  // ============================================================================

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const setOpen = useCallback((open: boolean) => {
    setIsOpen(open)
  }, [])

  const setEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled)
  }, [])

  // ============================================================================
  // Export
  // ============================================================================

  const exportSession = useCallback(
    (exportOptions?: Partial<ExportOptions>): string => {
      if (!session) return ''

      const defaultOptions: ExportOptions = {
        format: 'markdown',
        includeEvents: true,
        includeApiCalls: true,
        includeErrors: true,
        includeRawData: false,
      }

      return formatDebugSession(session, { ...defaultOptions, ...exportOptions })
    },
    [session]
  )

  const copyToClipboard = useCallback(
    async (exportOptions?: Partial<ExportOptions>): Promise<boolean> => {
      const content = exportSession(exportOptions)
      if (!content) return false

      try {
        await navigator.clipboard.writeText(content)
        return true
      } catch {
        return false
      }
    },
    [exportSession]
  )

  // ============================================================================
  // Stats
  // ============================================================================

  const stats = useMemo((): DebugStats => {
    const emptyStats: DebugStats = {
      totalEvents: 0,
      eventsByCategory: {} as Record<DebugEventCategory, number>,
      totalApiCalls: 0,
      totalErrors: 0,
      averageApiDuration: 0,
      elapsedTime: 0,
      eventsPerSecond: 0,
      // v0.0.3 stats
      totalLLMCalls: 0,
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalCostUSD: 0,
      avgLLMLatencyMs: 0,
      llmSuccessRate: 0,
      cacheHitRate: 0,
      totalDataSourceCalls: 0,
      dataSourceSuccessRate: 0,
      avgDataSourceLatencyMs: 0,
      totalUIEvents: 0,
      totalRerenders: 0,
      avgRenderTimeMs: 0,
      totalValidations: 0,
      validationPassRate: 0,
      avgValidationScore: 0,
      sseReconnects: 0,
      sseCurrentState: 'disconnected',
      sseUptime: 0,
      totalAlerts: 0,
      alertsBySeverity: { critical: 0, warning: 0, info: 0 },
      unresolvedAlerts: 0,
    }

    if (!session) {
      return emptyStats
    }

    const eventsByCategory = session.events.reduce(
      (acc, event) => {
        acc[event.category] = (acc[event.category] || 0) + 1
        return acc
      },
      {} as Record<DebugEventCategory, number>
    )

    const totalApiDuration = session.apiCalls.reduce(
      (sum, call) => sum + call.duration,
      0
    )
    const averageApiDuration =
      session.apiCalls.length > 0
        ? totalApiDuration / session.apiCalls.length
        : 0

    const elapsedTime = session.endTime
      ? session.endTime - session.startTime
      : Date.now() - session.startTime

    const eventsPerSecond =
      elapsedTime > 0 ? (session.events.length / elapsedTime) * 1000 : 0

    // LLM stats
    const llmCalls = session.llmCalls || []
    const successfulLLMCalls = llmCalls.filter(c => c.success)
    const cachedLLMCalls = llmCalls.filter(c => c.cacheHit)
    const totalTokens = llmCalls.reduce((sum, c) => sum + c.totalTokens, 0)
    const inputTokens = llmCalls.reduce((sum, c) => sum + c.inputTokens, 0)
    const outputTokens = llmCalls.reduce((sum, c) => sum + c.outputTokens, 0)
    const totalCostUSD = llmCalls.reduce((sum, c) => sum + c.costEstimateUSD, 0)
    const totalLLMLatency = llmCalls.reduce((sum, c) => sum + c.latencyMs, 0)

    // Data source stats
    const dataSourceLogs = session.dataSourceLogs || []
    const successfulDSCalls = dataSourceLogs.filter(d => d.success)
    const totalDSLatency = dataSourceLogs.reduce((sum, d) => sum + d.latencyMs, 0)

    // UI stats
    const uiStateLogs = session.uiStateLogs || []
    const rerenders = uiStateLogs.filter(u => u.type === 'rerender')
    const renderTimes = uiStateLogs.filter(u => u.renderTimeMs !== undefined).map(u => u.renderTimeMs!)
    const totalRenderTime = renderTimes.reduce((sum, t) => sum + t, 0)

    // Quality stats
    const qualityValidations = session.qualityValidations || []
    const passedValidations = qualityValidations.filter(q => q.passed)
    const totalScore = qualityValidations.reduce((sum, q) => sum + q.score, 0)

    // SSE stats
    const sseHealthLogs = session.sseHealthLogs || []
    const reconnects = sseHealthLogs.filter(s => s.event === 'reconnect').length
    const currentSSEState = sseHealthLogs.length > 0 ? sseHealthLogs[sseHealthLogs.length - 1].state : 'disconnected'

    // Alert stats
    const alerts = session.alerts || []
    const alertsBySeverity = alerts.reduce((acc, a) => {
      acc[a.severity] = (acc[a.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalEvents: session.events.length,
      eventsByCategory,
      totalApiCalls: session.apiCalls.length,
      totalErrors: session.errors.length,
      averageApiDuration,
      elapsedTime,
      eventsPerSecond,
      // v0.0.3 stats
      totalLLMCalls: llmCalls.length,
      totalTokens,
      inputTokens,
      outputTokens,
      totalCostUSD,
      avgLLMLatencyMs: llmCalls.length > 0 ? totalLLMLatency / llmCalls.length : 0,
      llmSuccessRate: llmCalls.length > 0 ? successfulLLMCalls.length / llmCalls.length : 0,
      cacheHitRate: llmCalls.length > 0 ? cachedLLMCalls.length / llmCalls.length : 0,
      totalDataSourceCalls: dataSourceLogs.length,
      dataSourceSuccessRate: dataSourceLogs.length > 0 ? successfulDSCalls.length / dataSourceLogs.length : 0,
      avgDataSourceLatencyMs: dataSourceLogs.length > 0 ? totalDSLatency / dataSourceLogs.length : 0,
      totalUIEvents: uiStateLogs.length,
      totalRerenders: rerenders.length,
      avgRenderTimeMs: renderTimes.length > 0 ? totalRenderTime / renderTimes.length : 0,
      totalValidations: qualityValidations.length,
      validationPassRate: qualityValidations.length > 0 ? passedValidations.length / qualityValidations.length : 0,
      avgValidationScore: qualityValidations.length > 0 ? totalScore / qualityValidations.length : 0,
      sseReconnects: reconnects,
      sseCurrentState: currentSSEState,
      sseUptime: elapsedTime,
      totalAlerts: alerts.length,
      alertsBySeverity: {
        critical: alertsBySeverity.critical || 0,
        warning: alertsBySeverity.warning || 0,
        info: alertsBySeverity.info || 0,
      },
      unresolvedAlerts: alerts.filter(a => !a.resolvedAt).length,
    }
  }, [session])

  // ============================================================================
  // Keyboard Shortcuts
  // ============================================================================

  useEffect(() => {
    if (!config.enableKeyboardShortcuts || !isEnabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+D to toggle debug viewer
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        toggleOpen()
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [config.enableKeyboardShortcuts, isEnabled, isOpen, toggleOpen])

  // ============================================================================
  // Load persisted session
  // ============================================================================

  useEffect(() => {
    if (!config.persistToLocalStorage || typeof window === 'undefined') return

    try {
      const saved = localStorage.getItem('debug_session')
      if (saved) {
        const parsed = JSON.parse(saved) as DebugSession
        // Only restore if session is recent (within 1 hour)
        if (Date.now() - parsed.startTime < 60 * 60 * 1000) {
          setSession(parsed)
        } else {
          localStorage.removeItem('debug_session')
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [config.persistToLocalStorage])

  return {
    session,
    isEnabled,
    isOpen,
    startSession,
    endSession,
    clearSession,
    addEvent,
    addApiCall,
    addError,
    captureSSEEvent,
    toggleOpen,
    setOpen,
    setEnabled,
    exportSession,
    copyToClipboard,
    stats,
  }
}

// ============================================================================
// Debug Context (for sharing across components)
// ============================================================================

import { createContext, useContext } from 'react'
import type { DebugContextValue } from '@/types/debug'

export const DebugContext = createContext<DebugContextValue | null>(null)

export function useDebugContext(): DebugContextValue {
  const context = useContext(DebugContext)
  if (!context) {
    throw new Error('useDebugContext must be used within a DebugProvider')
  }
  return context
}

export default useDebugCapture
