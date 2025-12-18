'use client'

/**
 * RubricScoreCard Component
 *
 * Displays the detailed rubric scoring breakdown with item-by-item results.
 */

import { cn } from '@/lib/utils'
import type { JudgeResult, ItemScore } from '@/types/frontierscience'
import { Check, X, Circle, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'
import { useState } from 'react'

interface RubricScoreCardProps {
  judgeResult: JudgeResult
  showDetails?: boolean
  initialExpanded?: boolean
  className?: string
}

export function RubricScoreCard({
  judgeResult,
  showDetails = true,
  initialExpanded = false,
  className,
}: RubricScoreCardProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded)

  const passedCount = judgeResult.itemScores.filter(s => s.passed).length
  const totalCount = judgeResult.itemScores.length
  const percentage = (judgeResult.totalScore / 10) * 100

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <ScoreCircle score={judgeResult.totalScore} passed={judgeResult.passed} />
          <div>
            <div className="text-sm font-medium text-foreground">
              Rubric Evaluation
            </div>
            <div className="text-xs text-muted-foreground">
              {passedCount}/{totalCount} criteria passed
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'px-2 py-1 rounded-md text-xs font-medium',
              judgeResult.passed
                ? 'bg-emerald-500/10 text-emerald-600'
                : 'bg-amber-500/10 text-amber-600'
            )}
          >
            {judgeResult.passed ? 'PASSED' : 'NEEDS WORK'}
          </div>
          {isExpanded ? (
            <ChevronUp size={16} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={16} className="text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className={cn(
            'h-full transition-all duration-500',
            judgeResult.passed ? 'bg-emerald-500' : 'bg-amber-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Expanded details */}
      {isExpanded && showDetails && (
        <div className="p-4 border-t bg-muted/30">
          {/* Item scores */}
          <div className="space-y-2 mb-4">
            {judgeResult.itemScores.map((item, index) => (
              <RubricItemRow key={item.itemId || index} item={item} />
            ))}
          </div>

          {/* Iteration hint */}
          {judgeResult.iterationHint && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-blue-500/5 border border-blue-200/50">
              <Lightbulb size={16} className="text-blue-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-medium text-blue-600 mb-0.5">
                  Improvement Hint
                </div>
                <div className="text-sm text-blue-700">
                  {judgeResult.iterationHint}
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {judgeResult.recommendations.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Recommendations
              </div>
              <ul className="space-y-1">
                {judgeResult.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-muted-foreground">-</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Circular score display
 */
function ScoreCircle({
  score,
  passed,
  size = 'md',
}: {
  score: number
  passed: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg',
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold',
        'border-2',
        sizeClasses[size],
        passed
          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600'
          : 'bg-amber-500/10 border-amber-500 text-amber-600'
      )}
    >
      {score.toFixed(1)}
    </div>
  )
}

/**
 * Individual rubric item row
 */
function RubricItemRow({ item }: { item: ItemScore }) {
  const percentage = (item.points / item.maxPoints) * 100

  return (
    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
      {/* Status icon */}
      <div
        className={cn(
          'w-5 h-5 rounded-full flex items-center justify-center shrink-0',
          item.passed
            ? 'bg-emerald-500 text-white'
            : item.points > 0
              ? 'bg-amber-400 text-white'
              : 'bg-muted text-muted-foreground'
        )}
      >
        {item.passed ? (
          <Check size={12} />
        ) : item.points > 0 ? (
          <Circle size={8} className="fill-current" />
        ) : (
          <X size={12} />
        )}
      </div>

      {/* Item details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {item.itemId}
          </span>
          <span
            className={cn(
              'text-xs tabular-nums shrink-0',
              item.passed ? 'text-emerald-600' : 'text-amber-600'
            )}
          >
            {item.points.toFixed(1)}/{item.maxPoints.toFixed(1)}
          </span>
        </div>
        {item.reasoning && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {item.reasoning}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Compact rubric score summary
 */
interface CompactRubricSummaryProps {
  judgeResult: JudgeResult
  className?: string
}

export function CompactRubricSummary({
  judgeResult,
  className,
}: CompactRubricSummaryProps) {
  const passedCount = judgeResult.itemScores.filter(s => s.passed).length
  const totalCount = judgeResult.itemScores.length

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium',
          judgeResult.passed
            ? 'bg-emerald-500/10 text-emerald-600'
            : 'bg-amber-500/10 text-amber-600'
        )}
      >
        {judgeResult.passed ? <Check size={12} /> : <Circle size={12} />}
        <span>{judgeResult.totalScore.toFixed(1)}/10</span>
      </div>
      <span className="text-xs text-muted-foreground">
        {passedCount}/{totalCount} items
      </span>
    </div>
  )
}

/**
 * Rubric score progress visualization
 */
interface RubricProgressBarProps {
  scores: ItemScore[]
  className?: string
}

export function RubricProgressBar({ scores, className }: RubricProgressBarProps) {
  return (
    <div className={cn('flex gap-0.5 h-2 rounded-full overflow-hidden', className)}>
      {scores.map((item, index) => {
        const percentage = (item.points / item.maxPoints) * 100
        return (
          <div
            key={item.itemId || index}
            className={cn(
              'flex-1 transition-all duration-300',
              item.passed
                ? 'bg-emerald-500'
                : item.points > 0
                  ? 'bg-amber-400'
                  : 'bg-muted'
            )}
            title={`${item.itemId}: ${item.points.toFixed(1)}/${item.maxPoints.toFixed(1)}`}
          />
        )
      })}
    </div>
  )
}

export default RubricScoreCard
