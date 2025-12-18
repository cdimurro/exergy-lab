'use client'

/**
 * AdminDebugViewer Component
 *
 * Main container for the debug viewer with floating toggle button.
 * Shows/hides the DebugDrawer slide-out panel.
 *
 * IMPORTANT: This component should be used inside a DebugProvider to share
 * debug state with other components like useFrontierScienceWorkflow.
 */

import * as React from 'react'
import { Bug, X, Activity, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DebugDrawer } from './DebugDrawer'
import { DebugContext } from '@/hooks/use-debug-capture'
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

interface AdminDebugViewerProps {
  className?: string
}

// ============================================================================
// Main Component
// ============================================================================

export function AdminDebugViewer({ className }: AdminDebugViewerProps) {
  const [copied, setCopied] = React.useState(false)
  const [isMounted, setIsMounted] = React.useState(false)

  // Get debug context from provider (must be wrapped in DebugProvider)
  const debugContext = React.useContext(DebugContext)

  // Prevent hydration mismatch by only rendering after mount
  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  // Don't render if not mounted (prevents hydration mismatch) or no context
  if (!isMounted || !debugContext || !debugContext.isEnabled) {
    return null
  }

  const handleCopyToClipboard = async () => {
    const success = await debugContext.copyToClipboard({ format: 'markdown' })
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const eventCount = debugContext.session?.events.length || 0
  const errorCount = debugContext.session?.errors.length || 0
  const hasErrors = errorCount > 0
  const isActive = debugContext.session?.status === 'running'

  return (
    <>
      {/* Floating Toggle Button */}
      <div className={cn('fixed bottom-6 right-6 z-50 flex flex-col gap-2', className)}>
        {/* Quick Actions (shown when drawer is closed and session exists) */}
        {!debugContext.isOpen && debugContext.session && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyToClipboard}
              className="h-9 px-3 bg-background shadow-lg"
              title="Copy debug session to clipboard"
            >
              {copied ? (
                <Check size={14} className="text-green-500" />
              ) : (
                <Copy size={14} />
              )}
            </Button>
          </div>
        )}

        {/* Main Toggle Button */}
        <Button
          onClick={debugContext.toggleOpen}
          size="lg"
          variant={debugContext.isOpen ? 'primary' : 'outline'}
          className={cn(
            'h-14 w-14 rounded-full shadow-lg',
            'transition-all duration-200',
            isActive && 'ring-2 ring-blue-500 ring-offset-2',
            hasErrors && 'ring-2 ring-red-500 ring-offset-2'
          )}
          title="Toggle Debug Viewer (Ctrl+Shift+D)"
        >
          {debugContext.isOpen ? (
            <X size={20} />
          ) : (
            <div className="relative">
              <Bug size={20} />
              {(eventCount > 0 || hasErrors) && (
                <span
                  className={cn(
                    'absolute -top-2 -right-2 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center',
                    hasErrors
                      ? 'bg-red-500 text-white'
                      : 'bg-blue-500 text-white'
                  )}
                >
                  {hasErrors ? errorCount : eventCount > 99 ? '99+' : eventCount}
                </span>
              )}
            </div>
          )}
        </Button>
      </div>

      {/* Debug Drawer */}
      <DebugDrawer
        isOpen={debugContext.isOpen}
        onClose={() => debugContext.setOpen(false)}
        session={debugContext.session}
        stats={debugContext.stats}
        onClear={debugContext.clearSession}
        onExport={debugContext.exportSession}
        onCopyToClipboard={handleCopyToClipboard}
        copied={copied}
      />
    </>
  )
}

// ============================================================================
// Status Indicator (for inline use)
// ============================================================================

interface DebugStatusIndicatorProps {
  className?: string
}

export function DebugStatusIndicator({ className }: DebugStatusIndicatorProps) {
  const debugContext = React.useContext(DebugContext)

  if (!debugContext || !debugContext.isEnabled || !debugContext.session) {
    return null
  }

  const { session, stats } = debugContext
  const isRunning = session.status === 'running'
  const hasErrors = stats.totalErrors > 0

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs',
        'bg-muted/50 border border-border',
        className
      )}
    >
      <Activity
        size={12}
        className={cn(
          isRunning && 'animate-pulse text-blue-500',
          hasErrors && 'text-red-500'
        )}
      />
      <span className="text-muted-foreground">Debug:</span>
      <Badge variant="secondary" className="h-5 text-[10px]">
        {stats.totalEvents} events
      </Badge>
      {hasErrors && (
        <Badge variant="error" className="h-5 text-[10px]">
          {stats.totalErrors} errors
        </Badge>
      )}
    </div>
  )
}

export default AdminDebugViewer
