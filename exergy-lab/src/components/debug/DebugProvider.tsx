'use client'

/**
 * DebugProvider Component
 *
 * Provides shared debug state across the application.
 * This allows both the AdminDebugViewer and workflow hooks to share the same debug session.
 */

import * as React from 'react'
import { useDebugCapture, DebugContext } from '@/hooks/use-debug-capture'
import type { DebugContextValue } from '@/types/debug'
import { DEFAULT_ALERT_THRESHOLDS, EXPORT_PRESETS } from '@/types/debug'

// ============================================================================
// Access Control
// ============================================================================

function canAccessDebugViewer(): boolean {
  if (typeof window === 'undefined') return false
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_ENABLE_DEBUG_VIEWER === 'true'
  )
}

// ============================================================================
// Props
// ============================================================================

interface DebugProviderProps {
  children: React.ReactNode
}

// ============================================================================
// Provider Component
// ============================================================================

export function DebugProvider({ children }: DebugProviderProps) {
  const [isMounted, setIsMounted] = React.useState(false)

  // Prevent hydration mismatch by only rendering after mount
  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const debugCapture = useDebugCapture({
    enabled: canAccessDebugViewer(),
  })

  // Alert thresholds state
  const [alertThresholds, setAlertThresholds] = React.useState(DEFAULT_ALERT_THRESHOLDS)

  // Create context value
  const contextValue: DebugContextValue = React.useMemo(
    () => ({
      session: debugCapture.session,
      config: {
        maxEvents: 1000,
        maxApiCalls: 100,
        maxErrors: 100,
        maxSessionSizeMB: 10,
        autoClearOnComplete: false,
        persistToLocalStorage: true,
        enableKeyboardShortcuts: true,
        debounceMs: 100,
      },
      isEnabled: debugCapture.isEnabled,
      isOpen: debugCapture.isOpen,
      stats: debugCapture.stats,
      activeAlerts: debugCapture.session?.alerts?.filter(a => !a.resolvedAt) || [],
      alertThresholds,

      // Session actions
      startSession: debugCapture.startSession,
      endSession: () => debugCapture.endSession(),
      pauseSession: () => debugCapture.endSession('paused' as 'completed'),
      resumeSession: () => {}, // TODO: Implement resume
      clearSession: debugCapture.clearSession,

      // Core logging actions
      addEvent: debugCapture.addEvent,
      addApiCall: debugCapture.addApiCall,
      addError: debugCapture.addError,
      captureSSEEvent: debugCapture.captureSSEEvent,

      // Enhanced logging actions (v0.0.3) - placeholder implementations
      addLLMCall: () => {}, // TODO: Implement in use-debug-capture
      addPerformanceSnapshot: () => {},
      addDataSourceLog: () => {},
      addSSEHealthLog: () => {},
      addUIStateLog: () => {},
      addQualityValidation: () => {},
      addAlert: () => {},
      acknowledgeAlert: () => {},
      resolveAlert: () => {},

      // Metrics computation - placeholder implementations
      computeStats: () => debugCapture.stats,
      computeCostBreakdown: () => debugCapture.session?.costBreakdown || {
        totalUSD: 0,
        byPhase: { research: 0, hypothesis: 0, validation: 0, output: 0 },
        byModel: {},
        byProvider: { google: 0, openai: 0, anthropic: 0, other: 0 },
        byPurpose: { research: 0, hypothesis: 0, validation: 0, synthesis: 0, critique: 0, refinement: 0, evaluation: 0, other: 0 },
        inputTokensCost: 0,
        outputTokensCost: 0,
      },
      computePerformanceMetrics: () => debugCapture.session?.performanceMetrics || {
        avgResponseTimeMs: 0,
        p50ResponseTimeMs: 0,
        p95ResponseTimeMs: 0,
        p99ResponseTimeMs: 0,
        maxResponseTimeMs: 0,
        minResponseTimeMs: 0,
        totalRequests: 0,
        successRate: 0,
        avgTokensPerRequest: 0,
        peakMemoryMB: 0,
        avgHeapUsageMB: 0,
        totalRenderTimeMs: 0,
        rerenderCount: 0,
      },
      computeQualityMetrics: () => debugCapture.session?.qualityMetrics || [],

      // Export actions
      exportSession: debugCapture.exportSession,
      exportWithPreset: (preset) => debugCapture.exportSession(EXPORT_PRESETS[preset]),
      copyToClipboard: debugCapture.copyToClipboard,
      downloadSession: (filename, options) => {
        const content = debugCapture.exportSession(options)
        if (!content) return
        const blob = new Blob([content], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename || `debug-session-${Date.now()}.txt`
        a.click()
        URL.revokeObjectURL(url)
      },

      // View actions
      toggleOpen: debugCapture.toggleOpen,
      setEnabled: debugCapture.setEnabled,
      setOpen: debugCapture.setOpen,
      setActiveTab: () => {}, // TODO: Implement tab state
      setFilters: () => {}, // TODO: Implement filter state
      setViewOptions: () => {}, // TODO: Implement view options state
      setAlertThresholds: (thresholds) => setAlertThresholds(prev => ({ ...prev, ...thresholds })),
    }),
    [debugCapture, alertThresholds]
  )

  // If not mounted yet, just render children without context
  // This prevents hydration mismatch
  if (!isMounted) {
    return <>{children}</>
  }

  return (
    <DebugContext.Provider value={contextValue}>
      {children}
    </DebugContext.Provider>
  )
}

export default DebugProvider
