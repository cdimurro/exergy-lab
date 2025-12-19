'use client'

/**
 * RefinementVisualization Component
 *
 * Real-time visualization of the refinement agent's iterative improvement process.
 * Shows score progression, criteria status, and improvement deltas.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Target,
  Clock,
  BarChart2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// ============================================================================
// Types
// ============================================================================

export interface CriterionScore {
  id: string
  name: string
  points: number
  maxPoints: number
  passed: boolean
  reasoning?: string
}

export interface IterationData {
  iteration: number
  score: number
  passed: boolean
  criteria: CriterionScore[]
  improvement?: number
  durationMs: number
  hint?: string
}

interface RefinementVisualizationProps {
  /** Phase being refined */
  phase: string
  /** Current iteration number */
  currentIteration: number
  /** Maximum allowed iterations */
  maxIterations: number
  /** All iteration data */
  iterations: IterationData[]
  /** Whether refinement is in progress */
  isRefining: boolean
  /** Pass threshold */
  passThreshold?: number
  /** Additional CSS classes */
  className?: string
}

// ============================================================================
// Main Component
// ============================================================================

export function RefinementVisualization({
  phase,
  currentIteration,
  maxIterations,
  iterations,
  isRefining,
  passThreshold = 7.0,
  className,
}: RefinementVisualizationProps) {
  const [expandedIteration, setExpandedIteration] = React.useState<number | null>(null)
  const latestIteration = iterations[iterations.length - 1]
  const scores = iterations.map(i => i.score)
  const maxScore = Math.max(...scores, passThreshold + 1)
  const minScore = Math.min(...scores, passThreshold - 2)

  // Calculate overall trend
  const trend = React.useMemo(() => {
    if (scores.length < 2) return 'neutral'
    const recentTrend = scores[scores.length - 1] - scores[scores.length - 2]
    if (recentTrend > 0.3) return 'improving'
    if (recentTrend < -0.1) return 'declining'
    return 'neutral'
  }, [scores])

  return (
    <div className={cn(
      'rounded-xl border border-border bg-card overflow-hidden',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            isRefining ? 'bg-purple-500/10' : latestIteration?.passed ? 'bg-green-500/10' : 'bg-amber-500/10'
          )}>
            {isRefining ? (
              <RefreshCw className="w-5 h-5 text-purple-500 animate-spin" />
            ) : latestIteration?.passed ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <Target className="w-5 h-5 text-amber-500" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-foreground capitalize">
              {phase} Refinement
            </h3>
            <p className="text-xs text-muted-foreground">
              Iteration {currentIteration} of {maxIterations}
              {isRefining && ' • Refining...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Current Score */}
          <div className="text-right">
            <div className="flex items-center gap-1">
              <span className={cn(
                'text-2xl font-bold',
                latestIteration?.passed ? 'text-green-600' : 'text-foreground'
              )}>
                {latestIteration?.score.toFixed(1) ?? '-'}
              </span>
              <span className="text-sm text-muted-foreground">/10</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Threshold: {passThreshold}/10
            </p>
          </div>

          {/* Trend Indicator */}
          <TrendBadge trend={trend} />
        </div>
      </div>

      {/* Score Progress Chart */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">Score Progress</span>
          <span className="text-xs text-muted-foreground">
            Total improvement: +{(scores[scores.length - 1] - scores[0]).toFixed(1)}
          </span>
        </div>
        <ScoreProgressChart
          iterations={iterations}
          passThreshold={passThreshold}
          maxScore={maxScore}
          minScore={minScore}
        />
      </div>

      {/* Iteration Timeline */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground">Iteration History</span>
        </div>
        <div className="space-y-2">
          {iterations.map((iteration, index) => (
            <IterationRow
              key={iteration.iteration}
              iteration={iteration}
              isLatest={index === iterations.length - 1}
              isExpanded={expandedIteration === iteration.iteration}
              onToggle={() => setExpandedIteration(
                expandedIteration === iteration.iteration ? null : iteration.iteration
              )}
              previousScore={index > 0 ? iterations[index - 1].score : undefined}
              passThreshold={passThreshold}
            />
          ))}
        </div>
      </div>

      {/* Current Criteria Status (Latest Iteration) */}
      {latestIteration && (
        <div className="p-4 border-t border-border bg-muted/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Criteria Status</span>
            <span className="text-xs text-muted-foreground">
              {latestIteration.criteria.filter(c => c.passed).length}/{latestIteration.criteria.length} passed
            </span>
          </div>
          <CriteriaGrid criteria={latestIteration.criteria} />
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Sub-Components
// ============================================================================

function TrendBadge({ trend }: { trend: 'improving' | 'declining' | 'neutral' }) {
  const config = {
    improving: { icon: TrendingUp, color: 'bg-green-500/10 text-green-600', label: 'Improving' },
    declining: { icon: TrendingDown, color: 'bg-red-500/10 text-red-600', label: 'Declining' },
    neutral: { icon: Minus, color: 'bg-slate-500/10 text-slate-600', label: 'Stable' },
  }
  const { icon: Icon, color, label } = config[trend]

  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
      color
    )}>
      <Icon className="w-3 h-3" />
      {label}
    </div>
  )
}

interface ScoreProgressChartProps {
  iterations: IterationData[]
  passThreshold: number
  maxScore: number
  minScore: number
}

function ScoreProgressChart({ iterations, passThreshold, maxScore, minScore }: ScoreProgressChartProps) {
  const chartHeight = 80
  const scoreRange = maxScore - minScore
  const thresholdY = chartHeight - ((passThreshold - minScore) / scoreRange) * chartHeight

  return (
    <div className="relative h-20 bg-muted/30 rounded-lg overflow-hidden">
      {/* Threshold line */}
      <div
        className="absolute left-0 right-0 border-t-2 border-dashed border-green-500/40"
        style={{ top: `${thresholdY}px` }}
      >
        <span className="absolute -top-3 right-1 text-[10px] text-green-600 font-medium">
          Pass: {passThreshold}
        </span>
      </div>

      {/* Score bars */}
      <div className="absolute inset-0 flex items-end justify-around px-2 pb-1">
        {iterations.map((iteration, i) => {
          const height = ((iteration.score - minScore) / scoreRange) * chartHeight
          const isPassed = iteration.score >= passThreshold

          return (
            <div
              key={iteration.iteration}
              className="flex flex-col items-center gap-1"
              style={{ width: `${80 / iterations.length}%` }}
            >
              <div
                className={cn(
                  'w-full rounded-t-sm transition-all duration-300',
                  isPassed ? 'bg-green-500' : 'bg-amber-500'
                )}
                style={{ height: `${height}px` }}
              />
              <span className="text-[10px] text-muted-foreground">
                {iteration.iteration}
              </span>
            </div>
          )
        })}
      </div>

      {/* Y-axis labels */}
      <div className="absolute left-1 top-0 bottom-0 flex flex-col justify-between text-[9px] text-muted-foreground py-1">
        <span>{maxScore.toFixed(0)}</span>
        <span>{minScore.toFixed(0)}</span>
      </div>
    </div>
  )
}

interface IterationRowProps {
  iteration: IterationData
  isLatest: boolean
  isExpanded: boolean
  onToggle: () => void
  previousScore?: number
  passThreshold: number
}

function IterationRow({
  iteration,
  isLatest,
  isExpanded,
  onToggle,
  previousScore,
  passThreshold,
}: IterationRowProps) {
  const improvement = previousScore !== undefined
    ? iteration.score - previousScore
    : 0

  return (
    <div className={cn(
      'rounded-lg border transition-colors',
      isLatest ? 'border-primary/30 bg-primary/5' : 'border-border',
      isExpanded && 'bg-muted/30'
    )}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        {/* Iteration number */}
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
          iteration.passed ? 'bg-green-500/20 text-green-600' : 'bg-muted text-muted-foreground'
        )}>
          {iteration.iteration}
        </div>

        {/* Score and status */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">
              {iteration.score.toFixed(1)}/10
            </span>
            {iteration.passed ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : iteration.score >= passThreshold - 0.5 ? (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
            {improvement !== 0 && (
              <span className={cn(
                'text-xs font-medium',
                improvement > 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {improvement > 0 ? '+' : ''}{improvement.toFixed(2)}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {iteration.criteria.filter(c => c.passed).length}/{iteration.criteria.length} criteria passed
          </p>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {(iteration.durationMs / 1000).toFixed(1)}s
        </div>

        {/* Expand icon */}
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-border mt-1 pt-3">
          {iteration.hint && (
            <div className="mb-3 p-2 rounded-lg bg-purple-500/10 text-xs text-purple-600">
              <span className="font-medium">Refinement Hint: </span>
              {iteration.hint}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {iteration.criteria.map(criterion => (
              <div
                key={criterion.id}
                className={cn(
                  'p-2 rounded border text-xs',
                  criterion.passed
                    ? 'border-green-500/20 bg-green-500/5'
                    : 'border-red-500/20 bg-red-500/5'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground truncate">
                    {criterion.name}
                  </span>
                  <span className={cn(
                    'font-mono',
                    criterion.passed ? 'text-green-600' : 'text-red-600'
                  )}>
                    {criterion.points.toFixed(1)}/{criterion.maxPoints.toFixed(1)}
                  </span>
                </div>
                {criterion.reasoning && (
                  <p className="text-muted-foreground mt-1 line-clamp-2">
                    {criterion.reasoning}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface CriteriaGridProps {
  criteria: CriterionScore[]
}

function CriteriaGrid({ criteria }: CriteriaGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {criteria.map(criterion => {
        const percentage = (criterion.points / criterion.maxPoints) * 100
        return (
          <div
            key={criterion.id}
            className={cn(
              'p-2 rounded-lg border text-xs',
              criterion.passed
                ? 'border-green-500/30 bg-green-500/5'
                : percentage > 50
                ? 'border-amber-500/30 bg-amber-500/5'
                : 'border-red-500/30 bg-red-500/5'
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-foreground truncate text-[11px]">
                {criterion.id}
              </span>
              {criterion.passed ? (
                <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
              ) : (
                <XCircle className="w-3 h-3 text-red-500 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all',
                    criterion.passed ? 'bg-green-500' : percentage > 50 ? 'bg-amber-500' : 'bg-red-500'
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                {criterion.points.toFixed(1)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// Compact Version
// ============================================================================

interface CompactRefinementProgressProps {
  currentIteration: number
  maxIterations: number
  currentScore: number
  passThreshold: number
  isRefining: boolean
  trend?: 'improving' | 'declining' | 'neutral'
  className?: string
}

export function CompactRefinementProgress({
  currentIteration,
  maxIterations,
  currentScore,
  passThreshold,
  isRefining,
  trend = 'neutral',
  className,
}: CompactRefinementProgressProps) {
  const isPassing = currentScore >= passThreshold

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Iteration dots */}
      <div className="flex items-center gap-1">
        {Array.from({ length: maxIterations }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-2 h-2 rounded-full transition-all',
              i < currentIteration
                ? isPassing ? 'bg-green-500' : 'bg-amber-500'
                : i === currentIteration && isRefining
                ? 'bg-purple-500 animate-pulse'
                : 'bg-muted'
            )}
          />
        ))}
      </div>

      {/* Score */}
      <div className="flex items-center gap-1 text-sm">
        <span className={cn(
          'font-medium',
          isPassing ? 'text-green-600' : 'text-foreground'
        )}>
          {currentScore.toFixed(1)}
        </span>
        <span className="text-muted-foreground">/{passThreshold}</span>
      </div>

      {/* Trend */}
      {trend === 'improving' && (
        <TrendingUp className="w-4 h-4 text-green-500" />
      )}
      {trend === 'declining' && (
        <TrendingDown className="w-4 h-4 text-red-500" />
      )}
    </div>
  )
}

export default RefinementVisualization
