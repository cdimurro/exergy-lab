'use client'

/**
 * LiveActivityFeed Component
 *
 * Displays a real-time scrolling feed of discovery activities.
 * Shows thinking messages, iteration results, and score updates as they happen.
 * Combines Option A (Activity Feed) with Option D (Streaming Text Summary).
 */

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { getPhaseMetadata } from '@/types/frontierscience'
import type { DiscoveryPhase, JudgeResult } from '@/types/frontierscience'
import {
  Brain,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Search,
  Lightbulb,
  FlaskConical,
  TrendingUp,
  TrendingDown,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export type ActivityType = 'thinking' | 'iteration' | 'score' | 'phase_start' | 'phase_complete' | 'phase_failed'

export interface ActivityItem {
  id: string
  timestamp: number
  type: ActivityType
  phase: DiscoveryPhase
  message: string
  details?: string[]
  score?: number
  previousScore?: number
  passed?: boolean
  judgeResult?: JudgeResult
}

interface LiveActivityFeedProps {
  activities: ActivityItem[]
  currentPhase: DiscoveryPhase | null
  maxHeight?: string
  showTimestamps?: boolean
  className?: string
}

// ============================================================================
// Activity Icons
// ============================================================================

function getActivityIcon(type: ActivityType, phase?: DiscoveryPhase) {
  switch (type) {
    case 'thinking':
      // Different icons based on phase for more context
      // Consolidated 4-phase model: research, hypothesis, validation, output
      if (phase === 'research') return <Search size={14} className="text-blue-500" />
      if (phase === 'hypothesis') return <Lightbulb size={14} className="text-amber-500" />
      if (phase === 'validation') return <FlaskConical size={14} className="text-purple-500" />
      if (phase === 'output') return <CheckCircle2 size={14} className="text-emerald-500" />
      return <Brain size={14} className="text-blue-500" />
    case 'iteration':
      return <Sparkles size={14} className="text-indigo-500" />
    case 'score':
      return <TrendingUp size={14} className="text-emerald-500" />
    case 'phase_start':
      return <ArrowRight size={14} className="text-blue-500" />
    case 'phase_complete':
      return <CheckCircle2 size={14} className="text-emerald-500" />
    case 'phase_failed':
      return <AlertTriangle size={14} className="text-amber-500" />
    default:
      return <Brain size={14} className="text-muted-foreground" />
  }
}

// ============================================================================
// Score Change Indicator
// ============================================================================

function ScoreChange({ current, previous }: { current: number; previous?: number }) {
  if (previous === undefined) {
    return (
      <span className="text-sm font-medium text-foreground">
        {current.toFixed(1)}/10
      </span>
    )
  }

  const change = current - previous
  const isImprovement = change > 0

  return (
    <span className="flex items-center gap-1.5">
      <span className="text-sm font-medium text-foreground">
        {current.toFixed(1)}/10
      </span>
      {change !== 0 && (
        <span className={cn(
          'flex items-center text-xs font-medium',
          isImprovement ? 'text-emerald-600' : 'text-amber-600'
        )}>
          {isImprovement ? (
            <TrendingUp size={12} className="mr-0.5" />
          ) : (
            <TrendingDown size={12} className="mr-0.5" />
          )}
          {isImprovement ? '+' : ''}{change.toFixed(1)}
        </span>
      )}
    </span>
  )
}

// ============================================================================
// Single Activity Item
// ============================================================================

function ActivityItemCard({ activity, showTimestamp }: { activity: ActivityItem; showTimestamp: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const hasDetails = activity.details && activity.details.length > 0
  const hasJudgeResult = activity.judgeResult && activity.judgeResult.itemScores

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const phaseMeta = getPhaseMetadata(activity.phase)

  return (
    <div className={cn(
      'group relative pl-6 pb-2',
      'before:absolute before:left-[7px] before:top-6 before:bottom-0 before:w-px before:bg-border',
      'last:before:hidden'
    )}>
      {/* Timeline dot */}
      <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-background border-2 border-border flex items-center justify-center">
        {getActivityIcon(activity.type, activity.phase)}
      </div>

      {/* Content */}
      <div className={cn(
        'rounded-lg border p-2 transition-colors',
        activity.type === 'iteration' && activity.passed && 'bg-emerald-500/5 border-emerald-500/20',
        activity.type === 'iteration' && !activity.passed && 'bg-amber-500/5 border-amber-500/20',
        activity.type === 'thinking' && 'bg-blue-500/5 border-blue-500/20',
        activity.type === 'phase_complete' && 'bg-emerald-500/5 border-emerald-500/20',
        activity.type === 'phase_failed' && 'bg-amber-500/10 border-amber-500/30',
        activity.type === 'phase_start' && 'bg-muted/50 border-border',
        !['iteration', 'thinking', 'phase_complete', 'phase_failed', 'phase_start'].includes(activity.type) && 'bg-card border-border'
      )}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Phase badge */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {phaseMeta.shortName}
              </span>
              {showTimestamp && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock size={10} />
                  {formatTime(activity.timestamp)}
                </span>
              )}
            </div>

            {/* Main message */}
            <p className="text-sm text-foreground leading-relaxed">
              {activity.message}
            </p>
          </div>

          {/* Score (if available) */}
          {activity.score !== undefined && (
            <div className="shrink-0">
              <ScoreChange current={activity.score} previous={activity.previousScore} />
            </div>
          )}
        </div>

        {/* Details section (expandable) */}
        {(hasDetails || hasJudgeResult) && (
          <div className="mt-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? 'Hide details' : 'Show details'}
            </button>

            {expanded && (
              <div className="mt-2 space-y-2">
                {/* Thinking details */}
                {hasDetails && (
                  <ul className="text-xs text-muted-foreground space-y-1 pl-3 border-l-2 border-border">
                    {activity.details!.map((detail, i) => (
                      <li key={i} className="leading-relaxed">{detail}</li>
                    ))}
                  </ul>
                )}

                {/* Judge result details */}
                {hasJudgeResult && activity.judgeResult && (
                  <div className="space-y-2">
                    {/* Passed criteria */}
                    {activity.judgeResult.itemScores?.filter(s => s.passed).length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-emerald-600 flex items-center gap-1 mb-1">
                          <CheckCircle2 size={10} />
                          Criteria Passed
                        </span>
                        <ul className="text-xs text-muted-foreground space-y-0.5 pl-3">
                          {activity.judgeResult.itemScores
                            ?.filter(s => s.passed)
                            .slice(0, 3)
                            .map((s, i) => (
                              <li key={i} className="flex items-center gap-1">
                                <span className="text-emerald-500">✓</span>
                                {s.itemId}: {s.points}/{s.maxPoints}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                    {/* Failed criteria */}
                    {activity.judgeResult.itemScores?.filter(s => !s.passed).length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-amber-600 flex items-center gap-1 mb-1">
                          <AlertCircle size={10} />
                          Needs Improvement
                        </span>
                        <ul className="text-xs text-muted-foreground space-y-0.5 pl-3">
                          {activity.judgeResult.itemScores
                            ?.filter(s => !s.passed)
                            .slice(0, 3)
                            .map((s, i) => (
                              <li key={i} className="flex items-center gap-1">
                                <span className="text-amber-500">!</span>
                                {s.itemId}: {s.points}/{s.maxPoints}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommendations */}
                    {activity.judgeResult.recommendations && activity.judgeResult.recommendations.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-blue-600 flex items-center gap-1 mb-1">
                          <Lightbulb size={10} />
                          Recommendations
                        </span>
                        <ul className="text-xs text-muted-foreground space-y-0.5 pl-3">
                          {activity.judgeResult.recommendations.slice(0, 2).map((r, i) => (
                            <li key={i} className="leading-relaxed">→ {r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Live Activity Feed Component
// ============================================================================

export function LiveActivityFeed({
  activities,
  currentPhase,
  maxHeight = '300px',
  showTimestamps = true,
  className,
}: LiveActivityFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  // Auto-scroll to bottom when new activities arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [activities, autoScroll])

  // Detect manual scrolling to disable auto-scroll
  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
    setAutoScroll(isAtBottom)
  }

  if (activities.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <Brain className="w-8 h-8 mx-auto mb-2 opacity-50 animate-pulse" />
        <p className="text-sm">Waiting for activity...</p>
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Live Activity
        </h4>
        <span className="text-xs text-muted-foreground">
          {activities.length} events
        </span>
      </div>

      {/* Scrollable feed */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="overflow-y-auto pr-2"
        style={{ maxHeight }}
      >
        {activities.map((activity) => (
          <ActivityItemCard
            key={activity.id}
            activity={activity}
            showTimestamp={showTimestamps}
          />
        ))}
      </div>

      {/* Auto-scroll indicator */}
      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true)
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight
            }
          }}
          className="absolute bottom-2 right-2 px-2 py-1 text-xs bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
        >
          ↓ New activity
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Helper to generate activity items from SSE events
// ============================================================================

export function createActivityFromThinking(
  phase: DiscoveryPhase,
  message: string,
  details?: string[]
): ActivityItem {
  return {
    id: `thinking-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    type: 'thinking',
    phase,
    message,
    details,
  }
}

export function createActivityFromIteration(
  phase: DiscoveryPhase,
  iteration: number,
  maxIterations: number,
  judgeResult: JudgeResult,
  previousScore?: number
): ActivityItem {
  const passed = judgeResult.passed
  const score = judgeResult.totalScore

  // Generate a human-readable summary
  let message: string
  if (passed) {
    message = `Iteration ${iteration}/${maxIterations} passed with score ${score.toFixed(1)}/10`
  } else if (previousScore !== undefined && score > previousScore) {
    message = `Iteration ${iteration}/${maxIterations} improved to ${score.toFixed(1)}/10 (need 7.0 to pass)`
  } else {
    message = `Iteration ${iteration}/${maxIterations} scored ${score.toFixed(1)}/10, refining...`
  }

  return {
    id: `iteration-${phase}-${iteration}-${Date.now()}`,
    timestamp: Date.now(),
    type: 'iteration',
    phase,
    message,
    score,
    previousScore,
    passed,
    judgeResult,
  }
}

export function createActivityFromPhaseStart(phase: DiscoveryPhase): ActivityItem {
  const phaseMeta = getPhaseMetadata(phase)
  return {
    id: `phase-start-${phase}-${Date.now()}`,
    timestamp: Date.now(),
    type: 'phase_start',
    phase,
    message: `Starting ${phaseMeta.name}...`,
  }
}

export function createActivityFromPhaseComplete(
  phase: DiscoveryPhase,
  score: number,
  passed: boolean
): ActivityItem {
  const phaseMeta = getPhaseMetadata(phase)
  return {
    id: `phase-complete-${phase}-${Date.now()}`,
    timestamp: Date.now(),
    type: 'phase_complete',
    phase,
    message: passed
      ? `${phaseMeta.name} completed successfully`
      : `${phaseMeta.name} completed with score ${score.toFixed(1)}/10`,
    score,
    passed,
  }
}

export function createActivityFromPhaseFailed(
  phase: DiscoveryPhase,
  score: number,
  failedCriteria: { id: string; issue: string; suggestion: string }[],
  continuingWithDegradation: boolean
): ActivityItem {
  const phaseMeta = getPhaseMetadata(phase)
  return {
    id: `phase-failed-${phase}-${Date.now()}`,
    timestamp: Date.now(),
    type: 'phase_failed',
    phase,
    message: continuingWithDegradation
      ? `${phaseMeta.name} scored ${score.toFixed(1)}/10 (below 7.0 threshold). Continuing with partial results.`
      : `${phaseMeta.name} failed with score ${score.toFixed(1)}/10`,
    score,
    passed: false,
    details: failedCriteria.map(c => `${c.id}: ${c.issue} - ${c.suggestion}`),
  }
}

export default LiveActivityFeed
