'use client'

/**
 * DimensionProgressBar Component (v0.0.3)
 *
 * Displays a progress bar for individual FS or BD dimensions
 * with threshold indicators and pass/fail status.
 *
 * @see lib/ai/rubrics/types-hybrid-breakthrough.ts - Dimension types
 */

import { cn } from '@/lib/utils'
import { Check, X, AlertTriangle } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface DimensionProgressBarProps {
  dimension: string           // 'fs1_predictions' or 'bd1_performance'
  label: string               // Display name
  score: number
  maxScore: number
  percentage: number
  threshold?: number          // 60 for FS gate, 80 for critical BD
  isCritical?: boolean        // BD1, BD6 are critical
  passed: boolean
  showDetails?: boolean
  className?: string
}

// ============================================================================
// Dimension Metadata
// ============================================================================

const DIMENSION_META: Record<string, { shortName: string; description: string }> = {
  // FrontierScience (Gate)
  fs1_predictions: { shortName: 'Predictions', description: 'Falsifiable predictions with measurable outcomes' },
  fs2_evidence: { shortName: 'Evidence', description: 'Supporting evidence from literature' },
  fs3_mechanism: { shortName: 'Mechanism', description: 'Clear physical/chemical mechanism' },
  fs4_grounding: { shortName: 'Grounding', description: 'Thermodynamic validity' },
  fs5_methodology: { shortName: 'Methodology', description: 'Reproducible approach with safety' },
  // Breakthrough Detection (Score)
  bd1_performance: { shortName: 'Performance', description: 'Step-change improvement over SOTA (CRITICAL)' },
  bd2_cost: { shortName: 'Cost', description: 'Economic viability and LCOE impact' },
  bd3_cross_domain: { shortName: 'Cross-Domain', description: 'Knowledge transfer from other fields' },
  bd4_market: { shortName: 'Market', description: 'Market disruption potential' },
  bd5_scalability: { shortName: 'Scalability', description: 'Path to GW/TWh scale' },
  bd6_trajectory: { shortName: 'Trajectory', description: 'Paradigm shift potential (CRITICAL)' },
  bd7_societal: { shortName: 'Societal', description: 'Decarbonization and accessibility impact' },
}

// ============================================================================
// Main Component
// ============================================================================

export function DimensionProgressBar({
  dimension,
  label,
  score,
  maxScore,
  percentage,
  threshold,
  isCritical = false,
  passed,
  showDetails = true,
  className,
}: DimensionProgressBarProps) {
  const meta = DIMENSION_META[dimension]
  const displayLabel = label || meta?.shortName || dimension
  const meetsThreshold = threshold ? percentage >= threshold : passed

  // Determine bar color based on status
  const getBarColor = () => {
    if (meetsThreshold) {
      return isCritical ? 'bg-emerald-500' : 'bg-emerald-500'
    }
    if (isCritical && !passed) {
      return 'bg-red-500'
    }
    return 'bg-muted-foreground/50'
  }

  // Determine status icon
  const StatusIcon = () => {
    if (meetsThreshold) {
      return <Check size={12} className="text-emerald-500 shrink-0" />
    }
    if (isCritical && !passed) {
      return <AlertTriangle size={12} className="text-red-500 shrink-0" />
    }
    return <X size={12} className="text-muted-foreground shrink-0" />
  }

  return (
    <div className={cn('group', className)}>
      <div className="flex items-center gap-3">
        {/* Label */}
        <div className={cn(
          'w-24 text-xs truncate flex items-center gap-1',
          isCritical && 'font-medium'
        )}>
          {displayLabel}
          {isCritical && <span className="text-amber-500 font-bold">*</span>}
        </div>

        {/* Progress Bar Container */}
        <div className="flex-1 relative">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            {/* Progress Fill */}
            <div
              className={cn('h-full transition-all duration-300 rounded-full', getBarColor())}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>

          {/* Threshold Marker */}
          {threshold && (
            <div
              className="absolute top-0 h-2 w-px bg-foreground/30"
              style={{ left: `${threshold}%` }}
              title={`Threshold: ${threshold}%`}
            />
          )}
        </div>

        {/* Score Display */}
        <div className={cn(
          'w-20 text-xs text-right font-mono',
          meetsThreshold ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
        )}>
          {score.toFixed(2)}/{maxScore.toFixed(1)}
        </div>

        {/* Percentage */}
        <div className={cn(
          'w-10 text-xs text-right',
          meetsThreshold ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
        )}>
          {percentage.toFixed(0)}%
        </div>

        {/* Status Icon */}
        <StatusIcon />
      </div>

      {/* Details on Hover */}
      {showDetails && meta?.description && (
        <div className="hidden group-hover:block ml-24 mt-1 text-xs text-muted-foreground">
          {meta.description}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Compact Variant
// ============================================================================

export function DimensionProgressBarCompact({
  dimension,
  label,
  score,
  maxScore,
  percentage,
  passed,
  isCritical = false,
  className,
}: Omit<DimensionProgressBarProps, 'threshold' | 'showDetails'>) {
  const meta = DIMENSION_META[dimension]
  const displayLabel = label || meta?.shortName || dimension

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Label with critical marker */}
      <span className={cn(
        'text-xs w-20 truncate',
        isCritical && 'font-medium'
      )}>
        {displayLabel}{isCritical && '*'}
      </span>

      {/* Mini Progress Bar */}
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            passed ? 'bg-emerald-500' : 'bg-muted-foreground/50'
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {/* Percentage Only */}
      <span className={cn(
        'text-xs w-8 text-right',
        passed ? 'text-emerald-600' : 'text-muted-foreground'
      )}>
        {percentage.toFixed(0)}%
      </span>
    </div>
  )
}

// ============================================================================
// Inline Variant (for leaderboard rows)
// ============================================================================

export function DimensionProgressBarInline({
  dimension,
  label,
  percentage,
  passed,
  isCritical = false,
  className,
}: Omit<DimensionProgressBarProps, 'score' | 'maxScore' | 'threshold' | 'showDetails'>) {
  const meta = DIMENSION_META[dimension]
  const displayLabel = label || meta?.shortName || dimension

  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs',
      passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
      className
    )}>
      <span className={cn(isCritical && 'font-medium')}>
        {displayLabel}{isCritical && '*'}:
      </span>
      <span>{percentage.toFixed(0)}%</span>
      {passed ? (
        <Check size={10} className="text-emerald-500" />
      ) : (
        <X size={10} className="text-muted-foreground" />
      )}
    </span>
  )
}

// ============================================================================
// Exports
// ============================================================================

export { DIMENSION_META }
export default DimensionProgressBar
