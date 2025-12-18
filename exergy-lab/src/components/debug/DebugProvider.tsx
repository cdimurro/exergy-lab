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
      startSession: debugCapture.startSession,
      endSession: () => debugCapture.endSession(),
      addEvent: debugCapture.addEvent,
      addApiCall: debugCapture.addApiCall,
      addError: debugCapture.addError,
      clearSession: debugCapture.clearSession,
      exportSession: debugCapture.exportSession,
      toggleOpen: debugCapture.toggleOpen,
      setEnabled: debugCapture.setEnabled,
      // Additional methods for SSE capture
      captureSSEEvent: debugCapture.captureSSEEvent,
      copyToClipboard: debugCapture.copyToClipboard,
      stats: debugCapture.stats,
      setOpen: debugCapture.setOpen,
    }),
    [debugCapture]
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
