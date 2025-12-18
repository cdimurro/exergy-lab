'use client'

/**
 * APICallsTab Component
 *
 * Displays API request/response tracking with timing.
 */

import * as React from 'react'
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  ArrowRight,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { APICallLog } from '@/types/debug'

// ============================================================================
// Props
// ============================================================================

interface APICallsTabProps {
  apiCalls: APICallLog[]
}

// ============================================================================
// Main Component
// ============================================================================

export function APICallsTab({ apiCalls }: APICallsTabProps) {
  const [expandedCalls, setExpandedCalls] = React.useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = React.useState<string | null>(null)

  // Toggle call expansion
  const toggleCall = (callId: string) => {
    setExpandedCalls((prev) => {
      const next = new Set(prev)
      if (next.has(callId)) {
        next.delete(callId)
      } else {
        next.add(callId)
      }
      return next
    })
  }

  // Copy API call to clipboard
  const copyCall = async (call: APICallLog) => {
    const text = formatAPICallForCopy(call)
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(call.id)
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

  // Get method color
  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-blue-500/10 text-blue-600'
      case 'POST':
        return 'bg-green-500/10 text-green-600'
      case 'PUT':
        return 'bg-amber-500/10 text-amber-600'
      case 'DELETE':
        return 'bg-red-500/10 text-red-600'
      default:
        return 'bg-gray-500/10 text-gray-600'
    }
  }

  // Get status color
  const getStatusColor = (status?: number) => {
    if (!status) return 'text-muted-foreground'
    if (status >= 200 && status < 300) return 'text-green-600'
    if (status >= 400 && status < 500) return 'text-amber-600'
    if (status >= 500) return 'text-red-600'
    return 'text-muted-foreground'
  }

  // Calculate stats
  const stats = React.useMemo(() => {
    if (apiCalls.length === 0) return null

    const totalDuration = apiCalls.reduce((sum, c) => sum + c.duration, 0)
    const avgDuration = totalDuration / apiCalls.length
    const maxDuration = Math.max(...apiCalls.map((c) => c.duration))
    const errorCount = apiCalls.filter((c) => c.error || (c.statusCode && c.statusCode >= 400)).length

    return { totalDuration, avgDuration, maxDuration, errorCount }
  }, [apiCalls])

  if (apiCalls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Clock size={48} className="mb-4 opacity-20" />
        <p className="text-sm">No API calls recorded</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-4 gap-2">
          <StatCard label="Total" value={`${apiCalls.length}`} />
          <StatCard label="Avg Time" value={`${Math.round(stats.avgDuration)}ms`} />
          <StatCard label="Max Time" value={`${Math.round(stats.maxDuration)}ms`} />
          <StatCard
            label="Errors"
            value={`${stats.errorCount}`}
            variant={stats.errorCount > 0 ? 'error' : 'default'}
          />
        </div>
      )}

      {/* API Calls List */}
      <div className="space-y-2">
        {apiCalls.map((call: APICallLog, index: number) => {
          const isExpanded = expandedCalls.has(call.id)
          const hasError = Boolean(call.error) || (call.statusCode && call.statusCode >= 400)

          return (
            <div
              key={call.id}
              className={cn(
                'border rounded-lg overflow-hidden',
                hasError && 'border-red-500/30'
              )}
            >
              {/* Call Header */}
              <button
                onClick={() => toggleCall(call.id)}
                className={cn(
                  'w-full flex items-center gap-2 p-3 text-left',
                  'hover:bg-muted/50 transition-colors',
                  hasError && 'bg-red-500/5'
                )}
              >
                <span className="text-muted-foreground shrink-0">
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </span>

                <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                  #{index + 1}
                </span>

                <Badge
                  variant="secondary"
                  className={cn('h-4 text-[9px] shrink-0 font-mono', getMethodColor(call.method))}
                >
                  {call.method}
                </Badge>

                <span className="flex-1 text-xs font-mono truncate text-muted-foreground">
                  {call.url.replace(/^https?:\/\/[^/]+/, '')}
                </span>

                {call.statusCode && (
                  <span className={cn('text-xs font-mono shrink-0', getStatusColor(call.statusCode))}>
                    {call.statusCode}
                  </span>
                )}

                <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                  {call.duration}ms
                </span>

                {hasError && <AlertCircle size={12} className="text-red-500 shrink-0" />}

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 w-5 p-0 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    copyCall(call)
                  }}
                >
                  {copiedId === call.id ? (
                    <Check size={10} className="text-green-500" />
                  ) : (
                    <Copy size={10} className="text-muted-foreground" />
                  )}
                </Button>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="p-3 border-t bg-muted/20 space-y-3">
                  {/* Metadata */}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>Time: {formatTime(call.timestamp)}</span>
                    <span>Duration: {call.duration}ms</span>
                    {call.statusCode && (
                      <span className={getStatusColor(call.statusCode)}>
                        Status: {call.statusCode}
                      </span>
                    )}
                  </div>

                  {/* Error */}
                  {typeof call.error === 'string' && call.error.length > 0 ? (
                    <div>
                      <div className="text-xs font-medium text-red-500 mb-1">Error</div>
                      <div className="text-sm text-red-600 bg-red-500/10 p-2 rounded">
                        {call.error}
                      </div>
                    </div>
                  ) : null}

                  {/* Request */}
                  {call.requestPayload !== undefined && call.requestPayload !== null ? (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                        <ArrowRight size={10} />
                        Request
                      </div>
                      <pre className="text-[10px] font-mono text-muted-foreground bg-muted p-2 rounded overflow-x-auto max-h-40">
                        {JSON.stringify(call.requestPayload, null, 2)}
                      </pre>
                    </div>
                  ) : null}

                  {/* Response */}
                  {call.responsePayload !== undefined && call.responsePayload !== null ? (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                        <ArrowRight size={10} className="rotate-180" />
                        Response
                      </div>
                      <pre className="text-[10px] font-mono text-muted-foreground bg-muted p-2 rounded overflow-x-auto max-h-60">
                        {truncateJSON(call.responsePayload, 3000)}
                      </pre>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Stat Card
// ============================================================================

function StatCard({
  label,
  value,
  variant = 'default',
}: {
  label: string
  value: string
  variant?: 'default' | 'error'
}) {
  return (
    <div
      className={cn(
        'p-2 rounded-lg text-center',
        variant === 'error' ? 'bg-red-500/10' : 'bg-muted/50'
      )}
    >
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div
        className={cn(
          'text-sm font-semibold',
          variant === 'error' ? 'text-red-600' : 'text-foreground'
        )}
      >
        {value}
      </div>
    </div>
  )
}

// ============================================================================
// Helper Functions
// ============================================================================

function truncateJSON(data: unknown, maxLength: number): string {
  const str = JSON.stringify(data, null, 2)
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength) + '\n... (truncated)'
}

function formatAPICallForCopy(call: APICallLog): string {
  const lines: string[] = []

  lines.push(`## ${call.method} ${call.url}`)
  lines.push('')
  lines.push(`**Timestamp**: ${new Date(call.timestamp).toISOString()}`)
  lines.push(`**Duration**: ${call.duration}ms`)
  if (call.statusCode) {
    lines.push(`**Status**: ${call.statusCode}`)
  }
  if (call.error) {
    lines.push(`**Error**: ${call.error}`)
  }
  lines.push('')

  if (call.requestPayload) {
    lines.push('**Request:**')
    lines.push('```json')
    lines.push(JSON.stringify(call.requestPayload, null, 2))
    lines.push('```')
    lines.push('')
  }

  if (call.responsePayload) {
    lines.push('**Response:**')
    lines.push('```json')
    lines.push(truncateJSON(call.responsePayload, 5000))
    lines.push('```')
  }

  return lines.join('\n')
}

export default APICallsTab
