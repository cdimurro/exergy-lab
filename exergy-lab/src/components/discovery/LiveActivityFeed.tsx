'use client'

/**
 * LiveActivityFeed Component
 *
 * Displays a real-time scrolling feed of discovery activities.
 * Shows thinking messages, iteration results, and score updates as they happen.
 * Combines Option A (Activity Feed) with Option D (Streaming Text Summary).
 */

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { getCriterionName } from '@/lib/ai/rubrics/criterion-names'
import { getPhaseMetadata, PHASE_METADATA } from '@/types/frontierscience'
import type { DiscoveryPhase, JudgeResult } from '@/types/frontierscience'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
  Download,
  Filter,
  X,
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
// Activity Icons - Status-based colors
// ============================================================================

function getActivityIcon(type: ActivityType, phase?: DiscoveryPhase, passed?: boolean) {
  // Status-based colors: blue (in-progress), green (completed), red (failed)
  switch (type) {
    case 'thinking':
      // Thinking/in-progress uses blue
      if (phase === 'research') return <Search size={14} className="text-blue-500" />
      if (phase === 'hypothesis') return <Lightbulb size={14} className="text-blue-500" />
      if (phase === 'validation') return <FlaskConical size={14} className="text-blue-500" />
      if (phase === 'output') return <CheckCircle2 size={14} className="text-blue-500" />
      return <Brain size={14} className="text-blue-500" />
    case 'iteration':
      return <Sparkles size={14} className="text-blue-500" />
    case 'score':
      return <TrendingUp size={14} className="text-blue-500" />
    case 'phase_start':
      return <ArrowRight size={14} className="text-blue-500" />
    case 'phase_complete':
      // Completed uses green
      return <CheckCircle2 size={14} className="text-emerald-500" />
    case 'phase_failed':
      // Failed uses red
      return <AlertTriangle size={14} className="text-red-500" />
    default:
      return <Brain size={14} className="text-muted-foreground" />
  }
}

// ============================================================================
// Score Change Indicator
// ============================================================================

function ScoreChange({ current, previous, passed }: { current: number; previous?: number; passed?: boolean }) {
  // Determine color based on score: >= 7 green, >= 5 amber, < 5 red
  const getScoreColor = (score: number) => {
    if (passed || score >= 7) return 'text-emerald-600'
    if (score >= 5) return 'text-amber-600'
    return 'text-red-600'
  }

  if (previous === undefined) {
    return (
      <span className={`text-sm font-semibold tabular-nums ${getScoreColor(current)}`}>
        {current.toFixed(1)}
      </span>
    )
  }

  const change = current - previous
  const isImprovement = change > 0

  return (
    <span className="flex items-center gap-1.5">
      <span className={`text-sm font-semibold tabular-nums ${getScoreColor(current)}`}>
        {current.toFixed(1)}
      </span>
      {change !== 0 && (
        <span className={`flex items-center text-xs font-medium ${isImprovement ? 'text-emerald-500' : 'text-red-500'}`}>
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

      {/* Content - Neutral styling for all activity types */}
      <div className={cn(
        'rounded-lg border p-2 transition-colors bg-card border-border',
        activity.type === 'phase_start' && 'bg-muted/50'
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
              <ScoreChange current={activity.score} previous={activity.previousScore} passed={activity.passed} />
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

                {/* Judge result details - Status-based colors */}
                {hasJudgeResult && activity.judgeResult && (
                  <div className="space-y-2">
                    {/* Passed criteria - green */}
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
                                {getCriterionName(s.itemId)}: <span className="text-emerald-600 font-medium">{s.points}/{s.maxPoints}</span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                    {/* Failed criteria - amber/red based on score */}
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
                                {getCriterionName(s.itemId)}: <span className="text-amber-600 font-medium">{s.points}/{s.maxPoints}</span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommendations - blue */}
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
// Activity Stats Summary
// ============================================================================

interface ActivityStats {
  totalEvents: number
  phaseEventCounts: Record<DiscoveryPhase, number>
  bestScore: number | null
  totalIterations: number
  typeEventCounts: Record<ActivityType, number>
}

function computeActivityStats(activities: ActivityItem[]): ActivityStats {
  const stats: ActivityStats = {
    totalEvents: activities.length,
    phaseEventCounts: {} as Record<DiscoveryPhase, number>,
    bestScore: null,
    totalIterations: 0,
    typeEventCounts: {} as Record<ActivityType, number>,
  }

  for (const activity of activities) {
    // Count by phase
    stats.phaseEventCounts[activity.phase] = (stats.phaseEventCounts[activity.phase] || 0) + 1

    // Count by type
    stats.typeEventCounts[activity.type] = (stats.typeEventCounts[activity.type] || 0) + 1

    // Track best score
    if (activity.score !== undefined) {
      if (stats.bestScore === null || activity.score > stats.bestScore) {
        stats.bestScore = activity.score
      }
    }

    // Count iterations
    if (activity.type === 'iteration') {
      stats.totalIterations++
    }
  }

  return stats
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
  const [searchQuery, setSearchQuery] = useState('')
  const [phaseFilter, setPhaseFilter] = useState<DiscoveryPhase | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Compute stats
  const stats = useMemo(() => computeActivityStats(activities), [activities])

  // Filter activities based on search and filters
  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesMessage = activity.message.toLowerCase().includes(query)
        const matchesDetails = activity.details?.some(d => d.toLowerCase().includes(query))
        if (!matchesMessage && !matchesDetails) return false
      }

      // Phase filter
      if (phaseFilter !== 'all' && activity.phase !== phaseFilter) return false

      // Type filter
      if (typeFilter !== 'all' && activity.type !== typeFilter) return false

      return true
    })
  }, [activities, searchQuery, phaseFilter, typeFilter])

  // Auto-scroll to bottom when new activities arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current && !searchQuery && phaseFilter === 'all' && typeFilter === 'all') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [activities, autoScroll, searchQuery, phaseFilter, typeFilter])

  // Detect manual scrolling to disable auto-scroll
  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
    setAutoScroll(isAtBottom)
  }

  // Export activity log as JSON
  const handleExportLog = useCallback(() => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalEvents: activities.length,
      stats,
      activities: activities.map(a => ({
        id: a.id,
        timestamp: new Date(a.timestamp).toISOString(),
        type: a.type,
        phase: a.phase,
        message: a.message,
        score: a.score,
        passed: a.passed,
        details: a.details,
      })),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `discovery-activity-log-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [activities, stats])

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('')
    setPhaseFilter('all')
    setTypeFilter('all')
  }

  const hasActiveFilters = searchQuery || phaseFilter !== 'all' || typeFilter !== 'all'

  if (activities.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <Brain className="w-8 h-8 mx-auto mb-2 opacity-50 animate-pulse" />
        <p className="text-sm">Waiting for activity...</p>
      </div>
    )
  }

  return (
    <div className={cn('relative flex flex-col', className)}>
      {/* Header with stats */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
          Live Activity
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {filteredActivities.length === activities.length
              ? `${activities.length} events`
              : `${filteredActivities.length} / ${activities.length} events`}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowFilters(!showFilters)}
            className={cn('h-7 px-2', showFilters && 'bg-muted')}
          >
            <Filter size={14} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleExportLog}
            className="h-7 px-2"
            title="Export activity log"
          >
            <Download size={14} />
          </Button>
        </div>
      </div>

      {/* Stats Summary - Simplified */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          {/* Phase progress indicators */}
          {['research', 'hypothesis', 'validation', 'output'].map((phase) => {
            const count = stats.phaseEventCounts[phase as DiscoveryPhase] || 0
            const isActive = count > 0
            return (
              <span
                key={phase}
                className={cn(
                  "px-1.5 py-0.5 rounded text-xs",
                  isActive ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                )}
              >
                {getPhaseMetadata(phase as DiscoveryPhase).shortName}
              </span>
            )
          })}
        </div>
        {stats.bestScore !== null && (
          <span className={cn(
            "font-medium",
            stats.bestScore >= 7 ? "text-emerald-600" :
            stats.bestScore >= 5 ? "text-amber-600" : "text-muted-foreground"
          )}>
            Best: {stats.bestScore.toFixed(1)}/10
          </span>
        )}
      </div>

      {/* Filter Controls */}
      {showFilters && (
        <div className="flex flex-col gap-2 mb-2 p-2 bg-muted/30 rounded-lg border border-border">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 text-xs pl-7 pr-7"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value as DiscoveryPhase | 'all')}
              className="h-7 text-xs px-2 rounded-md border border-border bg-background"
            >
              <option value="all">All Phases</option>
              {PHASE_METADATA.map((phase) => (
                <option key={phase.id} value={phase.id}>
                  {phase.shortName}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ActivityType | 'all')}
              className="h-7 text-xs px-2 rounded-md border border-border bg-background"
            >
              <option value="all">All Types</option>
              <option value="thinking">Thinking</option>
              <option value="iteration">Iterations</option>
              <option value="score">Scores</option>
              <option value="phase_start">Phase Start</option>
              <option value="phase_complete">Phase Complete</option>
              <option value="phase_failed">Phase Failed</option>
            </select>
            {hasActiveFilters && (
              <Button size="sm" variant="ghost" onClick={clearFilters} className="h-7 px-2 text-xs">
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Scrollable feed */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="overflow-y-auto pr-2 flex-1"
        style={{ maxHeight }}
      >
        {filteredActivities.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">No activities match your filters</p>
          </div>
        ) : (
          filteredActivities.map((activity) => (
            <ActivityItemCard
              key={activity.id}
              activity={activity}
              showTimestamp={showTimestamps}
            />
          ))
        )}
      </div>

      {/* Auto-scroll indicator */}
      {!autoScroll && !hasActiveFilters && (
        <button
          onClick={() => {
            setAutoScroll(true)
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight
            }
          }}
          className="absolute bottom-2 right-2 px-2 py-1 text-xs bg-foreground text-background rounded-full shadow-lg hover:bg-foreground/90 transition-colors"
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
  const phaseMeta = getPhaseMetadata(phase)

  // Generate clearer, more concise messages
  let message: string
  if (passed) {
    message = `${phaseMeta.shortName} passed quality check (${score.toFixed(1)}/10)`
  } else if (iteration === maxIterations) {
    message = `Final attempt: ${score.toFixed(1)}/10 - continuing with best result`
  } else if (previousScore !== undefined && score > previousScore) {
    const improvement = (score - previousScore).toFixed(1)
    message = `Improved +${improvement} to ${score.toFixed(1)}/10 - refining further`
  } else if (iteration === 1) {
    message = `Initial evaluation: ${score.toFixed(1)}/10 - analyzing for improvements`
  } else {
    message = `Attempt ${iteration}: ${score.toFixed(1)}/10 - optimizing approach`
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

  // More descriptive phase start messages
  const phaseDescriptions: Record<DiscoveryPhase, string> = {
    research: 'Searching academic databases and synthesizing literature...',
    hypothesis: 'Generating novel hypotheses based on research findings...',
    validation: 'Running simulations and validating feasibility...',
    output: 'Compiling final analysis and recommendations...',
  }

  return {
    id: `phase-start-${phase}-${Date.now()}`,
    timestamp: Date.now(),
    type: 'phase_start',
    phase,
    message: phaseDescriptions[phase] || `Starting ${phaseMeta.name}...`,
  }
}

export function createActivityFromPhaseComplete(
  phase: DiscoveryPhase,
  score: number,
  passed: boolean
): ActivityItem {
  const phaseMeta = getPhaseMetadata(phase)

  // More informative completion messages
  const successMessages: Record<DiscoveryPhase, string> = {
    research: `Research complete - synthesized key findings`,
    hypothesis: `Hypothesis generated and validated`,
    validation: `Validation passed - results verified`,
    output: `Analysis finalized`,
  }

  return {
    id: `phase-complete-${phase}-${Date.now()}`,
    timestamp: Date.now(),
    type: 'phase_complete',
    phase,
    message: passed
      ? `${successMessages[phase]} (${score.toFixed(1)}/10)`
      : `${phaseMeta.shortName} completed with partial results (${score.toFixed(1)}/10)`,
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

  // Clearer failure messages with actionable context
  const message = continuingWithDegradation
    ? `${phaseMeta.shortName} needs improvement (${score.toFixed(1)}/10) - proceeding with available data`
    : `${phaseMeta.shortName} could not complete (${score.toFixed(1)}/10)`

  // Simplify the details to be more readable
  const simplifiedDetails = failedCriteria.slice(0, 3).map(c =>
    `${c.issue}${c.suggestion ? ` → ${c.suggestion}` : ''}`
  )

  return {
    id: `phase-failed-${phase}-${Date.now()}`,
    timestamp: Date.now(),
    type: 'phase_failed',
    phase,
    message,
    score,
    passed: false,
    details: simplifiedDetails,
  }
}

/**
 * Create a milestone activity for significant events
 */
export function createActivityFromMilestone(
  phase: DiscoveryPhase,
  milestone: string,
  details?: string[]
): ActivityItem {
  return {
    id: `milestone-${phase}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    type: 'thinking',
    phase,
    message: milestone,
    details,
  }
}

export default LiveActivityFeed
