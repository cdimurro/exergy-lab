'use client'

/**
 * RubricTable Component
 *
 * Displays rubric evaluation results in a professional table format
 * with human-readable criteria names, color-coded scores, and recommendations.
 */

import { cn } from '@/lib/utils'
import type { JudgeResult, ItemScore } from '@/types/frontierscience'
import { getCriterionInfo, getCriterionName, getCriterionDescription } from '@/lib/ai/rubrics/criterion-names'
import { Check, X, AlertTriangle, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { useState } from 'react'

interface RubricTableProps {
  judgeResult: JudgeResult
  phaseName?: string
  className?: string
}

export function RubricTable({
  judgeResult,
  phaseName,
  className,
}: RubricTableProps) {
  const [showRecommendations, setShowRecommendations] = useState(true)

  const passedCount = judgeResult.itemScores.filter(s => s.passed).length
  const partialCount = judgeResult.itemScores.filter(s => !s.passed && s.points > 0).length
  const failedCount = judgeResult.itemScores.filter(s => !s.passed && s.points === 0).length
  const totalCount = judgeResult.itemScores.length

  return (
    <div className={cn('border rounded-xl overflow-hidden bg-card', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {phaseName ? `${phaseName} Evaluation` : 'Rubric Evaluation'}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-sm">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-emerald-600 font-medium">{passedCount} passed</span>
              </span>
              {partialCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-amber-600 font-medium">{partialCount} partial</span>
                </span>
              )}
              {failedCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-red-500 font-medium">{failedCount} failed</span>
                </span>
              )}
              <span className="text-muted-foreground">• Score: {judgeResult.totalScore.toFixed(1)}/10</span>
            </div>
          </div>
          <div className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-semibold',
            judgeResult.passed
              ? 'bg-emerald-500/10 text-emerald-600'
              : 'bg-red-500/10 text-red-500'
          )}>
            {judgeResult.passed ? 'PASSED' : 'NEEDS IMPROVEMENT'}
          </div>
        </div>
      </div>

      {/* Score Summary Bar */}
      <div className="px-6 py-3 border-b bg-muted/10">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground">Score Progress:</span>
          <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-500 rounded-full',
                judgeResult.totalScore >= 7 ? 'bg-emerald-500' :
                judgeResult.totalScore >= 5 ? 'bg-amber-500' : 'bg-red-500'
              )}
              style={{ width: `${(judgeResult.totalScore / 10) * 100}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {judgeResult.totalScore.toFixed(1)}/10
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <span>Pass threshold: 7.0</span>
          <span className="text-muted-foreground/50">|</span>
          <span>Confidence: {judgeResult.confidenceScore}%</span>
        </div>
      </div>

      {/* Criteria Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/20">
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-12">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Criterion
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">
                Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Assessment
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {judgeResult.itemScores.map((item, index) => (
              <RubricTableRow key={item.itemId || index} item={item} />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/30">
              <td className="px-6 py-4" colSpan={2}>
                <span className="text-sm font-semibold text-foreground">Total Score</span>
              </td>
              <td className="px-6 py-4 text-center">
                <span className={cn(
                  'text-lg font-bold tabular-nums',
                  judgeResult.passed ? 'text-emerald-600' : 'text-red-500'
                )}>
                  {judgeResult.totalScore.toFixed(1)}
                </span>
                <span className="text-sm text-muted-foreground">/10</span>
              </td>
              <td className="px-6 py-4">
                <span className={cn(
                  'text-sm font-medium',
                  judgeResult.passed ? 'text-emerald-600' : 'text-red-500'
                )}>
                  {judgeResult.passed
                    ? 'Meets FrontierScience threshold'
                    : 'Below 7.0 threshold - refinement needed'}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Recommendations Section */}
      {judgeResult.recommendations.length > 0 && (
        <div className="border-t">
          <button
            onClick={() => setShowRecommendations(!showRecommendations)}
            className="w-full px-6 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
          >
            <span className="text-sm font-semibold text-foreground">
              Recommendations ({judgeResult.recommendations.length})
            </span>
            {showRecommendations ? (
              <ChevronUp size={16} className="text-muted-foreground" />
            ) : (
              <ChevronDown size={16} className="text-muted-foreground" />
            )}
          </button>
          {showRecommendations && (
            <div className="px-6 pb-4 space-y-2">
              {judgeResult.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                >
                  <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground">{rec}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Iteration Hint */}
      {judgeResult.iterationHint && (
        <div className="px-6 py-4 border-t bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                Improvement Guidance
              </span>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {judgeResult.iterationHint}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Individual rubric table row with human-readable criterion names
 */
function RubricTableRow({ item }: { item: ItemScore }) {
  const [showDetails, setShowDetails] = useState(false)
  const percentage = (item.points / item.maxPoints) * 100
  const criterionInfo = getCriterionInfo(item.itemId)
  const criterionName = getCriterionName(item.itemId)
  const criterionDescription = getCriterionDescription(item.itemId)

  // Determine status: passed (green), partial (yellow), failed (red)
  const status = item.passed ? 'passed' : item.points > 0 ? 'partial' : 'failed'

  return (
    <tr className={cn(
      'hover:bg-muted/30 transition-colors',
      status === 'failed' && 'bg-red-50/30 dark:bg-red-950/10',
      status === 'partial' && 'bg-amber-50/20 dark:bg-amber-950/10'
    )}>
      {/* Status Icon */}
      <td className="px-6 py-4">
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center',
          status === 'passed' && 'bg-emerald-500/10 text-emerald-600',
          status === 'partial' && 'bg-amber-500/10 text-amber-600',
          status === 'failed' && 'bg-red-500/10 text-red-500'
        )}>
          {status === 'passed' ? (
            <Check size={16} />
          ) : status === 'partial' ? (
            <AlertTriangle size={14} />
          ) : (
            <X size={16} />
          )}
        </div>
      </td>

      {/* Criterion Name and Description */}
      <td className="px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'font-medium',
              status === 'passed' && 'text-foreground',
              status === 'partial' && 'text-amber-700 dark:text-amber-300',
              status === 'failed' && 'text-red-600 dark:text-red-400'
            )}>
              {criterionName}
            </span>
            <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {item.itemId}
            </span>
            {criterionDescription && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="p-0.5 rounded hover:bg-muted transition-colors"
                title="Show criterion details"
              >
                <Info size={14} className="text-muted-foreground" />
              </button>
            )}
          </div>
          {showDetails && criterionDescription && (
            <p className="text-xs text-muted-foreground mt-1.5 pl-0.5">
              {criterionDescription}
            </p>
          )}
        </div>
      </td>

      {/* Score */}
      <td className="px-6 py-4 text-center">
        <div className="flex flex-col items-center gap-1">
          <span className={cn(
            'text-base font-semibold tabular-nums',
            status === 'passed' && 'text-emerald-600',
            status === 'partial' && 'text-amber-600',
            status === 'failed' && 'text-red-500'
          )}>
            {item.points.toFixed(1)}
          </span>
          <span className="text-xs text-muted-foreground">
            / {item.maxPoints.toFixed(1)}
          </span>
          {/* Mini progress bar */}
          <div className="w-12 h-1 bg-muted rounded-full overflow-hidden mt-1">
            <div
              className={cn(
                'h-full rounded-full',
                status === 'passed' && 'bg-emerald-500',
                status === 'partial' && 'bg-amber-500',
                status === 'failed' && 'bg-red-500'
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </td>

      {/* Assessment / Reasoning */}
      <td className="px-6 py-4">
        <p className={cn(
          'text-sm',
          status === 'passed' && 'text-foreground',
          status === 'partial' && 'text-amber-700 dark:text-amber-300',
          status === 'failed' && 'text-red-600 dark:text-red-400'
        )}>
          {item.reasoning || 'No assessment provided'}
        </p>
        {/* Partial credits if available */}
        {item.partialCredits && item.partialCredits.length > 0 && (
          <div className="mt-2 space-y-1">
            {item.partialCredits.map((credit, idx) => (
              <div
                key={idx}
                className={cn(
                  'text-xs flex items-center gap-2',
                  credit.earned ? 'text-emerald-600' : 'text-muted-foreground'
                )}
              >
                {credit.earned ? (
                  <Check size={12} />
                ) : (
                  <X size={12} />
                )}
                <span>{credit.condition} ({credit.points} pts)</span>
              </div>
            ))}
          </div>
        )}
      </td>
    </tr>
  )
}

export default RubricTable
