'use client'

/**
 * ErrorsTab Component
 *
 * Displays errors with stack traces and context.
 */

import * as React from 'react'
import { AlertCircle, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ErrorLog } from '@/types/debug'
import { getPhaseMetadata, type DiscoveryPhase } from '@/types/frontierscience'

// ============================================================================
// Props
// ============================================================================

interface ErrorsTabProps {
  errors: ErrorLog[]
}

// ============================================================================
// Main Component
// ============================================================================

export function ErrorsTab({ errors }: ErrorsTabProps) {
  const [expandedErrors, setExpandedErrors] = React.useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = React.useState<string | null>(null)

  // Toggle error expansion
  const toggleError = (errorId: string) => {
    setExpandedErrors((prev) => {
      const next = new Set(prev)
      if (next.has(errorId)) {
        next.delete(errorId)
      } else {
        next.add(errorId)
      }
      return next
    })
  }

  // Copy error to clipboard
  const copyError = async (error: ErrorLog) => {
    const text = formatErrorForCopy(error)
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(error.id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      // Ignore copy errors
    }
  }

  // Format timestamp
  const formatTime = (ms: number) => {
    const date = new Date(ms)
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  if (errors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <AlertCircle size={48} className="mb-4 opacity-20 text-green-500" />
        <p className="text-sm font-medium text-green-600">No Errors</p>
        <p className="text-xs mt-1">The discovery ran without errors</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
        <AlertCircle size={16} className="text-red-500" />
        <span className="text-sm font-medium text-red-600">
          {errors.length} error{errors.length !== 1 ? 's' : ''} encountered
        </span>
      </div>

      {/* Error List */}
      {errors.map((error, index) => {
        const isExpanded = expandedErrors.has(error.id)
        const phaseMeta = error.phase
          ? getPhaseMetadata(error.phase as DiscoveryPhase)
          : null

        return (
          <div
            key={error.id}
            className="border border-red-500/30 rounded-lg overflow-hidden"
          >
            {/* Error Header */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggleError(error.id)}
              onKeyDown={(e) => e.key === 'Enter' && toggleError(error.id)}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-red-500/5 transition-colors cursor-pointer"
            >
              <span className="text-muted-foreground shrink-0">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>

              <span className="text-xs text-muted-foreground font-mono shrink-0">
                #{index + 1}
              </span>

              <span className="text-xs text-muted-foreground font-mono shrink-0">
                {formatTime(error.timestamp)}
              </span>

              {phaseMeta && (
                <Badge variant="secondary" className="h-4 text-[9px] shrink-0">
                  {phaseMeta.shortName}
                </Badge>
              )}

              <span className="flex-1 text-sm text-red-600 truncate">
                {error.message}
              </span>

              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  copyError(error)
                }}
              >
                {copiedId === error.id ? (
                  <Check size={12} className="text-green-500" />
                ) : (
                  <Copy size={12} className="text-muted-foreground" />
                )}
              </Button>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="p-3 border-t bg-muted/20 space-y-3">
                {/* Error Message */}
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Message
                  </div>
                  <div className="text-sm text-red-600">{error.message}</div>
                </div>

                {/* Stack Trace */}
                {error.stack && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Stack Trace
                    </div>
                    <pre className="text-[10px] font-mono text-muted-foreground bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  </div>
                )}

                {/* Context */}
                {error.context && Object.keys(error.context).length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Context
                    </div>
                    <pre className="text-[10px] font-mono text-muted-foreground bg-muted p-2 rounded overflow-x-auto">
                      {JSON.stringify(error.context, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Metadata */}
                <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                  <span>ID: {error.id}</span>
                  <span>|</span>
                  <span>Timestamp: {new Date(error.timestamp).toISOString()}</span>
                  {error.recoverable !== undefined && (
                    <>
                      <span>|</span>
                      <span>
                        Recoverable:{' '}
                        {error.recoverable ? (
                          <span className="text-green-600">Yes</span>
                        ) : (
                          <span className="text-red-600">No</span>
                        )}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatErrorForCopy(error: ErrorLog): string {
  const lines: string[] = []

  lines.push(`## Error: ${error.message}`)
  lines.push('')
  lines.push(`**Timestamp**: ${new Date(error.timestamp).toISOString()}`)
  if (error.phase) {
    lines.push(`**Phase**: ${error.phase}`)
  }
  lines.push('')

  if (error.stack) {
    lines.push('**Stack Trace:**')
    lines.push('```')
    lines.push(error.stack)
    lines.push('```')
    lines.push('')
  }

  if (error.context && Object.keys(error.context).length > 0) {
    lines.push('**Context:**')
    lines.push('```json')
    lines.push(JSON.stringify(error.context, null, 2))
    lines.push('```')
  }

  return lines.join('\n')
}

export default ErrorsTab
