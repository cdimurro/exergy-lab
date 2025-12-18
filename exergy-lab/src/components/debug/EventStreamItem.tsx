'use client'

/**
 * EventStreamItem Component
 *
 * Displays a single debug event with expandable details.
 */

import * as React from 'react'
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { DebugEvent } from '@/types/debug'
import { DEBUG_EVENT_COLORS } from '@/types/debug'
import { getPhaseMetadata, type DiscoveryPhase } from '@/types/frontierscience'

// ============================================================================
// Props
// ============================================================================

interface EventStreamItemProps {
  event: DebugEvent
  index: number
  isExpanded?: boolean
  onToggle?: () => void
  showIndex?: boolean
}

// ============================================================================
// Main Component
// ============================================================================

export function EventStreamItem({
  event,
  index,
  isExpanded = false,
  onToggle,
  showIndex = true,
}: EventStreamItemProps) {
  const [copied, setCopied] = React.useState(false)

  const colors = DEBUG_EVENT_COLORS[event.category] || DEBUG_EVENT_COLORS.progress

  // Format timestamp
  const formatTime = (ms: number) => {
    const date = new Date(ms)
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + '.' + date.getMilliseconds().toString().padStart(3, '0')
  }

  // Get phase display name
  const phaseDisplay = event.phase
    ? getPhaseMetadata(event.phase as DiscoveryPhase)?.shortName || event.phase
    : null

  // Extract key info from data for preview
  const getPreview = () => {
    if (!event.data) return null

    const data = event.data as Record<string, unknown>

    if (event.category === 'progress') {
      return data.status as string
    }
    if (event.category === 'iteration') {
      const score = data.score as number | undefined
      const iteration = data.iteration as number | undefined
      if (score !== undefined) {
        return `Iteration ${iteration || '?'}: ${score.toFixed(1)}/10`
      }
    }
    if (event.category === 'complete') {
      const quality = data.discoveryQuality as string | undefined
      const score = data.overallScore as number | undefined
      if (quality) {
        return `${quality}${score ? ` (${score.toFixed(1)}/10)` : ''}`
      }
    }
    if (event.category === 'error') {
      return data.message as string
    }

    return null
  }

  const preview = getPreview()

  // Copy event to clipboard
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(JSON.stringify(event, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Ignore copy errors
    }
  }

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden transition-colors',
        colors.border,
        isExpanded && 'ring-1 ring-primary/20'
      )}
    >
      {/* Header */}
      <div
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 cursor-pointer',
          colors.bg,
          'hover:bg-opacity-75 transition-colors'
        )}
      >
        {/* Expand icon */}
        <span className="shrink-0 text-muted-foreground">
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>

        {/* Index */}
        {showIndex && (
          <span className="shrink-0 text-[10px] text-muted-foreground font-mono w-6">
            #{index + 1}
          </span>
        )}

        {/* Timestamp */}
        <span className="shrink-0 text-[10px] text-muted-foreground font-mono">
          {formatTime(event.timestamp)}
        </span>

        {/* Category badge */}
        <Badge
          variant="secondary"
          className={cn('h-4 text-[9px] shrink-0', colors.bg, colors.text)}
        >
          {event.category}
        </Badge>

        {/* Phase badge */}
        {phaseDisplay && (
          <Badge variant="secondary" className="h-4 text-[9px] shrink-0">
            {phaseDisplay}
          </Badge>
        )}

        {/* Preview */}
        {preview && (
          <span className="flex-1 truncate text-xs text-muted-foreground">
            {preview}
          </span>
        )}

        {/* Duration if available */}
        {event.duration && (
          <span className="shrink-0 text-[10px] text-muted-foreground font-mono">
            {event.duration}ms
          </span>
        )}

        {/* Copy button */}
        <Button
          size="sm"
          variant="ghost"
          className="h-5 w-5 p-0 shrink-0"
          onClick={handleCopy}
        >
          {copied ? (
            <Check size={10} className="text-green-500" />
          ) : (
            <Copy size={10} className="text-muted-foreground" />
          )}
        </Button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-3 border-t bg-muted/20">
          <div className="text-xs font-mono overflow-x-auto">
            <pre className="whitespace-pre-wrap break-words text-muted-foreground">
              {JSON.stringify(event.data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Compact Event Item (for timeline view)
// ============================================================================

interface CompactEventItemProps {
  event: DebugEvent
  onClick?: () => void
}

export function CompactEventItem({ event, onClick }: CompactEventItemProps) {
  const colors = DEBUG_EVENT_COLORS[event.category] || DEBUG_EVENT_COLORS.progress

  const formatTime = (ms: number) => {
    const date = new Date(ms)
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-2 py-1 rounded text-left w-full',
        'hover:bg-muted/50 transition-colors',
        colors.bg
      )}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors.text.replace('text-', '') }} />
      <span className="text-[10px] text-muted-foreground font-mono shrink-0">
        {formatTime(event.timestamp)}
      </span>
      <Badge variant="secondary" className={cn('h-3 text-[8px] shrink-0', colors.text)}>
        {event.category}
      </Badge>
      {event.phase && (
        <span className="text-[10px] text-muted-foreground truncate">
          {event.phase}
        </span>
      )}
    </button>
  )
}

export default EventStreamItem
