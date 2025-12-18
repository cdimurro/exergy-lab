'use client'

/**
 * IterationBadge Component
 *
 * Shows the current iteration progress (e.g., "1/3", "2/3", "3/3")
 * with visual indicators for refinement status.
 */

import { cn } from '@/lib/utils'
import { RefreshCw, Check, AlertTriangle } from 'lucide-react'

interface IterationBadgeProps {
  current: number
  max: number
  score?: number
  previousScore?: number
  passed?: boolean
  isActive?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function IterationBadge({
  current,
  max,
  score,
  previousScore,
  passed,
  isActive = false,
  size = 'md',
  className,
}: IterationBadgeProps) {
  const improvement = previousScore !== undefined && score !== undefined
    ? score - previousScore
    : undefined

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
    lg: 'px-4 py-1.5 text-base gap-2',
  }

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md font-medium',
        'border transition-all duration-200',
        isActive
          ? 'bg-blue-500/10 border-blue-300 text-blue-600'
          : passed
            ? 'bg-emerald-500/10 border-emerald-300 text-emerald-600'
            : 'bg-muted border-border text-muted-foreground',
        sizeClasses[size],
        className
      )}
    >
      {isActive ? (
        <RefreshCw size={iconSizes[size]} className="animate-spin" />
      ) : passed ? (
        <Check size={iconSizes[size]} />
      ) : null}

      <span>
        Iteration {current}/{max}
      </span>

      {score !== undefined && (
        <span className="opacity-80">
          ({score.toFixed(1)})
        </span>
      )}

      {improvement !== undefined && improvement !== 0 && (
        <span
          className={cn(
            'text-xs',
            improvement > 0 ? 'text-emerald-500' : 'text-red-500'
          )}
        >
          {improvement > 0 ? '+' : ''}{improvement.toFixed(1)}
        </span>
      )}
    </div>
  )
}

/**
 * Iteration progress dots for compact display
 */
interface IterationDotsProps {
  current: number
  max: number
  scores?: number[]
  passThreshold?: number
  className?: string
}

export function IterationDots({
  current,
  max,
  scores = [],
  passThreshold = 7,
  className,
}: IterationDotsProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {Array.from({ length: max }).map((_, i) => {
        const iteration = i + 1
        const score = scores[i]
        const isComplete = iteration <= current
        const isPassed = score !== undefined && score >= passThreshold
        const isCurrent = iteration === current

        return (
          <div
            key={i}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-200',
              !isComplete && 'bg-muted',
              isComplete && !isPassed && 'bg-amber-400',
              isComplete && isPassed && 'bg-emerald-500',
              isCurrent && 'ring-2 ring-blue-400 ring-offset-1'
            )}
            title={score !== undefined ? `Iteration ${iteration}: ${score.toFixed(1)}/10` : `Iteration ${iteration}`}
          />
        )
      })}
    </div>
  )
}

/**
 * Iteration history timeline
 */
interface IterationHistoryProps {
  iterations: {
    iteration: number
    score: number
    passed: boolean
    durationMs?: number
  }[]
  maxIterations: number
  className?: string
}

export function IterationHistory({
  iterations,
  maxIterations,
  className,
}: IterationHistoryProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Iteration History</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="flex flex-col gap-1">
        {iterations.map((iter, i) => (
          <div
            key={i}
            className={cn(
              'flex items-center justify-between p-2 rounded-md',
              iter.passed ? 'bg-emerald-500/5' : 'bg-muted/50'
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium',
                  iter.passed
                    ? 'bg-emerald-500 text-white'
                    : 'bg-muted-foreground/20 text-muted-foreground'
                )}
              >
                {iter.iteration}
              </div>
              <span className={cn(
                'text-sm',
                iter.passed ? 'text-emerald-600 font-medium' : 'text-muted-foreground'
              )}>
                {iter.score.toFixed(1)}/10
              </span>
              {iter.passed && (
                <Check size={14} className="text-emerald-500" />
              )}
            </div>
            {iter.durationMs && (
              <span className="text-xs text-muted-foreground">
                {(iter.durationMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>
        ))}
        {/* Show remaining iterations as pending */}
        {Array.from({ length: maxIterations - iterations.length }).map((_, i) => (
          <div
            key={`pending-${i}`}
            className="flex items-center gap-2 p-2 rounded-md bg-muted/30"
          >
            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
              {iterations.length + i + 1}
            </div>
            <span className="text-sm text-muted-foreground">Pending</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default IterationBadge
