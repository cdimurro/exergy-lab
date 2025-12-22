'use client'

/**
 * IterationProgressCard Component
 *
 * Shows refinement loop progress with iteration counter, improvement delta,
 * and feedback preview for the Breakthrough Engine.
 *
 * @see lib/ai/agents/enhanced-refinement-agent.ts - Feedback generation
 * @see lib/ai/agents/hypothesis-racer.ts - Iteration loop
 */

import { cn } from '@/lib/utils'
import {
  RefreshCcw,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Target,
  Zap,
  Lightbulb,
  ArrowRight,
} from 'lucide-react'
import { type ClassificationTier, TIER_CONFIG, DIMENSION_NAMES } from './BreakthroughScoreCard'

// ============================================================================
// Types
// ============================================================================

export interface IterationFeedback {
  targetDimensions: string[]
  primaryFocus: string
  quickWins: string[]
  improvements: string[]
}

export interface IterationData {
  iteration: number
  maxIterations: number
  previousScore: number
  currentScore: number
  targetScore: number
  classification: ClassificationTier
  status: 'pending' | 'evaluating' | 'refining' | 'completed' | 'breakthrough' | 'eliminated'
  feedback?: IterationFeedback
  improvementDelta: number
  timestamp: Date
}

export interface IterationHistoryEntry {
  iteration: number
  score: number
  delta: number
  status: 'completed' | 'breakthrough' | 'eliminated'
}

interface IterationProgressCardProps {
  current: IterationData
  history?: IterationHistoryEntry[]
  hypothesisTitle?: string
  showFeedback?: boolean
  compact?: boolean
  className?: string
}

// ============================================================================
// Status Config
// ============================================================================

const STATUS_CONFIG: Record<
  IterationData['status'],
  { label: string; color: string; icon: React.ReactNode; animate?: boolean }
> = {
  pending: {
    label: 'Pending',
    color: '#9CA3AF',
    icon: <Minus size={14} />,
  },
  evaluating: {
    label: 'Evaluating',
    color: '#3B82F6',
    icon: <RefreshCcw size={14} className="animate-spin" />,
    animate: true,
  },
  refining: {
    label: 'Refining',
    color: '#8B5CF6',
    icon: <Sparkles size={14} className="animate-pulse" />,
    animate: true,
  },
  completed: {
    label: 'Completed',
    color: '#10B981',
    icon: <CheckCircle2 size={14} />,
  },
  breakthrough: {
    label: 'Breakthrough!',
    color: '#10B981',
    icon: <Sparkles size={14} />,
  },
  eliminated: {
    label: 'Eliminated',
    color: '#EF4444',
    icon: <XCircle size={14} />,
  },
}

// ============================================================================
// Main Component
// ============================================================================

export function IterationProgressCard({
  current,
  history = [],
  hypothesisTitle,
  showFeedback = true,
  compact = false,
  className,
}: IterationProgressCardProps) {
  const statusConfig = STATUS_CONFIG[current.status]
  const tierConfig = TIER_CONFIG[current.classification]
  const progressPercent = (current.iteration / current.maxIterations) * 100
  const scoreProgressPercent = (current.currentScore / 10) * 100

  if (compact) {
    return (
      <CompactIterationCard
        current={current}
        statusConfig={statusConfig}
        className={className}
      />
    )
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <RefreshCcw size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium">Refinement Loop</span>
            {hypothesisTitle && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                • {hypothesisTitle}
              </span>
            )}
          </div>
          <StatusBadge status={current.status} config={statusConfig} />
        </div>

        {/* Iteration Progress */}
        <div className="flex items-center gap-4">
          {/* Iteration Counter */}
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">
              {current.iteration}
              <span className="text-muted-foreground text-lg font-normal">
                /{current.maxIterations}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Iteration</div>
          </div>

          {/* Progress Bar */}
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500 rounded-full"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: statusConfig.color,
                }}
              />
            </div>
          </div>

          {/* Score Display */}
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: tierConfig.color }}>
              {current.currentScore.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">Score</div>
          </div>
        </div>
      </div>

      {/* Score Change Indicator */}
      <div className="px-4 py-3 border-t bg-background/50">
        <div className="flex items-center justify-between">
          <ScoreChangeDisplay
            previousScore={current.previousScore}
            currentScore={current.currentScore}
            targetScore={current.targetScore}
          />

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Target:</span>
            <span className="text-sm font-medium">{current.targetScore.toFixed(1)}</span>
          </div>
        </div>

        {/* Score Progress Towards Target */}
        <div className="mt-2">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden relative">
            {/* Current score bar */}
            <div
              className="h-full transition-all duration-500 rounded-full"
              style={{
                width: `${scoreProgressPercent}%`,
                backgroundColor: tierConfig.color,
              }}
            />
            {/* Target marker */}
            <div
              className="absolute top-0 h-full w-0.5 bg-foreground"
              style={{ left: `${(current.targetScore / 10) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0</span>
            <span>5 (Threshold)</span>
            <span>10</span>
          </div>
        </div>
      </div>

      {/* Feedback Section */}
      {showFeedback && current.feedback && (
        <div className="px-4 py-3 border-t">
          <FeedbackPreview feedback={current.feedback} />
        </div>
      )}

      {/* Iteration History */}
      {history.length > 0 && (
        <div className="px-4 py-3 border-t bg-muted/20">
          <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            History
          </div>
          <div className="flex items-center gap-1">
            {history.map((entry, index) => (
              <HistoryDot key={entry.iteration} entry={entry} isLatest={index === history.length - 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({
  status,
  config,
}: {
  status: IterationData['status']
  config: typeof STATUS_CONFIG[IterationData['status']]
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        config.animate && 'animate-pulse'
      )}
      style={{
        backgroundColor: `${config.color}20`,
        color: config.color,
      }}
    >
      {config.icon}
      <span>{config.label}</span>
    </div>
  )
}

function ScoreChangeDisplay({
  previousScore,
  currentScore,
  targetScore,
}: {
  previousScore: number
  currentScore: number
  targetScore: number
}) {
  const delta = currentScore - previousScore
  const isImproving = delta > 0
  const isDecreasing = delta < 0
  const distanceToTarget = targetScore - currentScore

  return (
    <div className="flex items-center gap-4">
      {/* Score Change */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Change:</span>
        <div
          className={cn(
            'flex items-center gap-1 text-sm font-medium',
            isImproving ? 'text-green-600' : isDecreasing ? 'text-red-600' : 'text-muted-foreground'
          )}
        >
          {isImproving ? (
            <TrendingUp size={14} />
          ) : isDecreasing ? (
            <TrendingDown size={14} />
          ) : (
            <Minus size={14} />
          )}
          <span>{isImproving ? '+' : ''}{delta.toFixed(2)}</span>
        </div>
      </div>

      {/* Distance to Target */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">To target:</span>
        <span
          className={cn(
            'text-sm font-medium',
            distanceToTarget <= 0 ? 'text-green-600' : 'text-amber-600'
          )}
        >
          {distanceToTarget <= 0 ? 'Reached!' : `+${distanceToTarget.toFixed(1)} needed`}
        </span>
      </div>
    </div>
  )
}

function FeedbackPreview({ feedback }: { feedback: IterationFeedback }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <Lightbulb size={12} />
        Refinement Focus
      </div>

      {/* Primary Focus */}
      <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
        <Target size={14} className="text-violet-500 mt-0.5 shrink-0" />
        <div>
          <div className="text-xs font-medium text-foreground">{feedback.primaryFocus}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Targeting: {feedback.targetDimensions.slice(0, 2).map(d => DIMENSION_NAMES[d] || d).join(', ')}
          </div>
        </div>
      </div>

      {/* Quick Wins */}
      {feedback.quickWins.length > 0 && (
        <div className="flex items-start gap-2">
          <Zap size={14} className="text-amber-500 mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Quick wins: </span>
            {feedback.quickWins.slice(0, 2).join('; ')}
          </div>
        </div>
      )}
    </div>
  )
}

function HistoryDot({ entry, isLatest }: { entry: IterationHistoryEntry; isLatest: boolean }) {
  const getColor = () => {
    if (entry.status === 'breakthrough') return '#10B981'
    if (entry.status === 'eliminated') return '#EF4444'
    if (entry.delta > 0) return '#22C55E'
    if (entry.delta < 0) return '#F59E0B'
    return '#9CA3AF'
  }

  return (
    <div className="flex items-center">
      <div
        className={cn(
          'relative group cursor-default',
          isLatest && 'ring-2 ring-offset-2 ring-foreground/20 rounded-full'
        )}
      >
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white"
          style={{ backgroundColor: getColor() }}
        >
          {entry.iteration}
        </div>

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Score: {entry.score.toFixed(1)} ({entry.delta >= 0 ? '+' : ''}{entry.delta.toFixed(2)})
        </div>
      </div>
      {!isLatest && (
        <ArrowRight size={10} className="text-muted-foreground mx-0.5" />
      )}
    </div>
  )
}

function CompactIterationCard({
  current,
  statusConfig,
  className,
}: {
  current: IterationData
  statusConfig: typeof STATUS_CONFIG[IterationData['status']]
  className?: string
}) {
  const tierConfig = TIER_CONFIG[current.classification]
  const delta = current.currentScore - current.previousScore

  return (
    <div className={cn('flex items-center gap-3 p-3 border rounded-lg', className)}>
      {/* Iteration Counter */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
        style={{ backgroundColor: statusConfig.color }}
      >
        {current.iteration}/{current.maxIterations}
      </div>

      {/* Progress Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Iteration {current.iteration}</span>
          <StatusBadge status={current.status} config={statusConfig} />
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          <span>Score: {current.currentScore.toFixed(1)}</span>
          <span
            className={cn(
              delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : ''
            )}
          >
            ({delta >= 0 ? '+' : ''}{delta.toFixed(2)})
          </span>
        </div>
      </div>

      {/* Target Progress */}
      <div className="text-right">
        <div className="text-sm font-semibold" style={{ color: tierConfig.color }}>
          {((current.currentScore / current.targetScore) * 100).toFixed(0)}%
        </div>
        <div className="text-xs text-muted-foreground">to target</div>
      </div>
    </div>
  )
}

// ============================================================================
// Exports
// ============================================================================

export { STATUS_CONFIG }
export default IterationProgressCard
