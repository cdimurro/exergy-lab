'use client'

/**
 * PhaseActivityTab Component
 *
 * Displays phase-by-phase progress with iteration tracking and rubric scores.
 */

import * as React from 'react'
import { Check, X, Clock, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { DebugEvent } from '@/types/debug'
import {
  PHASE_METADATA,
  getPhaseMetadata,
  type DiscoveryPhase,
  ALL_PHASES,
} from '@/types/frontierscience'

// ============================================================================
// Props
// ============================================================================

interface PhaseActivityTabProps {
  events: DebugEvent[]
}

// ============================================================================
// Phase Summary Type
// ============================================================================

interface PhaseSummary {
  phase: DiscoveryPhase
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime?: number
  endTime?: number
  iterations: {
    iteration: number
    score: number
    passed: boolean
    timestamp: number
  }[]
  finalScore?: number
  passed?: boolean
}

// ============================================================================
// Main Component
// ============================================================================

export function PhaseActivityTab({ events }: PhaseActivityTabProps) {
  const [expandedPhases, setExpandedPhases] = React.useState<Set<DiscoveryPhase>>(new Set())

  // Build phase summaries from events
  const phaseSummaries = React.useMemo(() => {
    const summaries = new Map<DiscoveryPhase, PhaseSummary>()

    // Initialize all phases
    for (const phase of ALL_PHASES) {
      summaries.set(phase, {
        phase,
        status: 'pending',
        iterations: [],
      })
    }

    // Process events
    for (const event of events) {
      if (!event.phase) continue

      const phase = event.phase as DiscoveryPhase
      const summary = summaries.get(phase)
      if (!summary) continue

      const data = event.data as Record<string, unknown>

      // Update status from progress events
      if (event.category === 'progress') {
        const status = data.status as string
        if (status === 'running' && !summary.startTime) {
          summary.startTime = event.timestamp
          summary.status = 'running'
        } else if (status === 'completed') {
          summary.endTime = event.timestamp
          summary.status = 'completed'
          summary.passed = data.passed as boolean
          summary.finalScore = data.score as number
        } else if (status === 'failed') {
          summary.endTime = event.timestamp
          summary.status = 'failed'
        }
      }

      // Capture iteration data
      if (event.category === 'iteration') {
        summary.iterations.push({
          iteration: (data.iteration as number) || summary.iterations.length + 1,
          score: (data.score as number) || 0,
          passed: (data.passed as boolean) || false,
          timestamp: event.timestamp,
        })
      }
    }

    return summaries
  }, [events])

  // Toggle phase expansion
  const togglePhase = (phase: DiscoveryPhase) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev)
      if (next.has(phase)) {
        next.delete(phase)
      } else {
        next.add(phase)
      }
      return next
    })
  }

  // Format duration
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-2">
      {ALL_PHASES.map((phase) => {
        const summary = phaseSummaries.get(phase)
        if (!summary) return null

        const meta = getPhaseMetadata(phase)
        const isExpanded = expandedPhases.has(phase)
        const hasIterations = summary.iterations.length > 0

        return (
          <div
            key={phase}
            className={cn(
              'border rounded-lg overflow-hidden',
              summary.status === 'running' && 'ring-1 ring-blue-500',
              summary.status === 'failed' && 'ring-1 ring-red-500'
            )}
          >
            {/* Phase Header */}
            <button
              onClick={() => togglePhase(phase)}
              className={cn(
                'w-full flex items-center gap-3 p-3 text-left',
                'hover:bg-muted/50 transition-colors',
                summary.status === 'pending' && 'opacity-50'
              )}
            >
              {/* Status Icon */}
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                  summary.status === 'completed' && summary.passed
                    ? 'bg-green-500 text-white'
                    : summary.status === 'completed' && !summary.passed
                      ? 'bg-amber-500 text-white'
                      : summary.status === 'running'
                        ? 'bg-blue-500 text-white animate-pulse'
                        : summary.status === 'failed'
                          ? 'bg-red-500 text-white'
                          : 'bg-muted text-muted-foreground'
                )}
              >
                {summary.status === 'completed' && summary.passed ? (
                  <Check size={12} />
                ) : summary.status === 'completed' && !summary.passed ? (
                  <X size={12} />
                ) : summary.status === 'running' ? (
                  <Clock size={12} />
                ) : summary.status === 'failed' ? (
                  <X size={12} />
                ) : (
                  <span className="text-[10px] font-bold">
                    {ALL_PHASES.indexOf(phase) + 1}
                  </span>
                )}
              </div>

              {/* Phase Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {meta?.name || phase}
                  </span>
                  {summary.status !== 'pending' && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        'h-4 text-[10px]',
                        summary.status === 'running' && 'bg-blue-500/10 text-blue-600',
                        summary.status === 'completed' && summary.passed && 'bg-green-500/10 text-green-600',
                        summary.status === 'completed' && !summary.passed && 'bg-amber-500/10 text-amber-600',
                        summary.status === 'failed' && 'bg-red-500/10 text-red-600'
                      )}
                    >
                      {summary.status}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{meta?.description}</div>
              </div>

              {/* Score */}
              {summary.finalScore !== undefined && (
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold">
                    {summary.finalScore.toFixed(1)}/10
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {summary.iterations.length} iter
                  </div>
                </div>
              )}

              {/* Duration */}
              {summary.startTime && summary.endTime && (
                <div className="text-xs text-muted-foreground shrink-0">
                  {formatDuration(summary.endTime - summary.startTime)}
                </div>
              )}

              {/* Expand icon */}
              {hasIterations && (
                <span className="text-muted-foreground shrink-0">
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
              )}
            </button>

            {/* Expanded: Iteration Details */}
            {isExpanded && hasIterations && (
              <div className="p-3 pt-0 border-t bg-muted/20">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Iterations
                </div>
                <div className="space-y-2">
                  {summary.iterations.map((iter, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg',
                        iter.passed ? 'bg-green-500/10' : 'bg-muted/50'
                      )}
                    >
                      <span className="text-xs font-mono text-muted-foreground">
                        #{iter.iteration}
                      </span>
                      <div className="flex-1">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              iter.passed ? 'bg-green-500' : 'bg-amber-500'
                            )}
                            style={{ width: `${(iter.score / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span
                        className={cn(
                          'text-xs font-semibold',
                          iter.passed ? 'text-green-600' : 'text-amber-600'
                        )}
                      >
                        {iter.score.toFixed(1)}/10
                      </span>
                      {iter.passed && (
                        <Check size={12} className="text-green-500" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Score trend */}
                {summary.iterations.length > 1 && (
                  <div className="mt-2 pt-2 border-t flex items-center gap-2 text-xs text-muted-foreground">
                    <TrendingUp size={12} />
                    <span>
                      {summary.iterations[0].score.toFixed(1)} →{' '}
                      {summary.iterations[summary.iterations.length - 1].score.toFixed(1)}
                    </span>
                    <span className="text-green-600">
                      (+{(summary.iterations[summary.iterations.length - 1].score - summary.iterations[0].score).toFixed(1)})
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default PhaseActivityTab
