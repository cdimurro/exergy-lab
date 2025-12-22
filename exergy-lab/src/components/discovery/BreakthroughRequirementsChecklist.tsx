'use client'

/**
 * BreakthroughRequirementsChecklist Component (v0.0.3)
 *
 * Displays the 5 requirements needed to achieve Breakthrough status:
 * 1. FS Gate Passed (all FS dimensions ≥60%)
 * 2. BD1 Performance ≥80%
 * 3. BD6 Trajectory ≥80%
 * 4. 4+ BD dimensions ≥70%
 * 5. Overall Score ≥9.0
 *
 * @see lib/ai/rubrics/types-hybrid-breakthrough.ts - Requirements definitions
 */

import { cn } from '@/lib/utils'
import { Check, X, AlertCircle, Trophy, Target, Zap, TrendingUp, Scale } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface BreakthroughRequirements {
  fsGatePassed: boolean
  bd1Performance: boolean
  bd1Percentage?: number      // Actual BD1 percentage
  bd6Trajectory: boolean
  bd6Percentage?: number      // Actual BD6 percentage
  bdHighCount: number         // Count of BD dims ≥70%
  overallScore: number        // Actual overall score
  meetsBreakthrough: boolean
}

export interface BreakthroughRequirementsChecklistProps {
  requirements: BreakthroughRequirements
  compact?: boolean
  className?: string
}

// ============================================================================
// Requirements Configuration
// ============================================================================

interface RequirementConfig {
  id: string
  label: string
  threshold: string
  icon: React.ReactNode
  getValue: (r: BreakthroughRequirements) => { passed: boolean; value: string }
}

const REQUIREMENTS: RequirementConfig[] = [
  {
    id: 'fs_gate',
    label: 'FS Gate Passed',
    threshold: 'all ≥60%',
    icon: <Scale size={14} />,
    getValue: (r) => ({
      passed: r.fsGatePassed,
      value: r.fsGatePassed ? 'PASSED' : 'FAILED',
    }),
  },
  {
    id: 'bd1',
    label: 'BD1 Performance',
    threshold: '≥80%',
    icon: <Zap size={14} />,
    getValue: (r) => ({
      passed: r.bd1Performance,
      value: r.bd1Percentage !== undefined ? `${r.bd1Percentage.toFixed(0)}%` : (r.bd1Performance ? 'YES' : 'NO'),
    }),
  },
  {
    id: 'bd6',
    label: 'BD6 Trajectory',
    threshold: '≥80%',
    icon: <TrendingUp size={14} />,
    getValue: (r) => ({
      passed: r.bd6Trajectory,
      value: r.bd6Percentage !== undefined ? `${r.bd6Percentage.toFixed(0)}%` : (r.bd6Trajectory ? 'YES' : 'NO'),
    }),
  },
  {
    id: 'bd_high',
    label: '4+ BD dimensions',
    threshold: '≥70%',
    icon: <Target size={14} />,
    getValue: (r) => ({
      passed: r.bdHighCount >= 4,
      value: `${r.bdHighCount}/7`,
    }),
  },
  {
    id: 'overall',
    label: 'Overall Score',
    threshold: '≥9.0',
    icon: <Trophy size={14} />,
    getValue: (r) => ({
      passed: r.overallScore >= 9.0,
      value: r.overallScore.toFixed(2),
    }),
  },
]

// ============================================================================
// Main Component
// ============================================================================

export function BreakthroughRequirementsChecklist({
  requirements,
  compact = false,
  className,
}: BreakthroughRequirementsChecklistProps) {
  const passedCount = REQUIREMENTS.filter(req => req.getValue(requirements).passed).length
  const totalCount = REQUIREMENTS.length
  const unmetCount = totalCount - passedCount

  if (compact) {
    return (
      <CompactChecklist
        requirements={requirements}
        passedCount={passedCount}
        totalCount={totalCount}
        className={className}
      />
    )
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-4 py-3 border-b',
        requirements.meetsBreakthrough
          ? 'bg-emerald-50 dark:bg-emerald-950/30'
          : 'bg-muted/30'
      )}>
        <div className="flex items-center gap-2">
          {requirements.meetsBreakthrough ? (
            <Trophy size={16} className="text-emerald-500" />
          ) : (
            <AlertCircle size={16} className="text-muted-foreground" />
          )}
          <span className="text-sm font-medium">
            Breakthrough Requirements (9.0+ threshold)
          </span>
        </div>
        <span className={cn(
          'text-xs font-medium px-2 py-1 rounded',
          requirements.meetsBreakthrough
            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            : 'bg-muted text-muted-foreground'
        )}>
          {passedCount}/{totalCount}
        </span>
      </div>

      {/* Requirements List */}
      <div className="p-4 space-y-3">
        {REQUIREMENTS.map((req) => {
          const { passed, value } = req.getValue(requirements)

          return (
            <div
              key={req.id}
              className={cn(
                'flex items-center justify-between py-2 px-3 rounded-lg',
                passed ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : 'bg-muted/30'
              )}
            >
              <div className="flex items-center gap-3">
                {/* Status Icon */}
                <div className={cn(
                  'flex items-center justify-center w-5 h-5 rounded-full',
                  passed ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                )}>
                  {passed ? (
                    <Check size={12} className="text-white" />
                  ) : (
                    <X size={12} className="text-muted-foreground" />
                  )}
                </div>

                {/* Requirement Info */}
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-muted-foreground',
                    passed && 'text-emerald-600 dark:text-emerald-400'
                  )}>
                    {req.icon}
                  </span>
                  <span className={cn(
                    'text-sm',
                    passed ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {req.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({req.threshold})
                  </span>
                </div>
              </div>

              {/* Value */}
              <span className={cn(
                'text-sm font-medium',
                passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
              )}>
                {value}
              </span>
            </div>
          )
        })}
      </div>

      {/* Status Footer */}
      <div className={cn(
        'px-4 py-3 border-t text-sm text-center',
        requirements.meetsBreakthrough
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium'
          : 'bg-muted/30 text-muted-foreground'
      )}>
        {requirements.meetsBreakthrough ? (
          <>Breakthrough Status: ACHIEVED</>
        ) : (
          <>NOT YET BREAKTHROUGH ({unmetCount} requirement{unmetCount !== 1 ? 's' : ''} unmet)</>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Compact Variant
// ============================================================================

function CompactChecklist({
  requirements,
  passedCount,
  totalCount,
  className,
}: {
  requirements: BreakthroughRequirements
  passedCount: number
  totalCount: number
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2 text-xs', className)}>
      <span className="font-medium text-muted-foreground">Requirements:</span>

      {/* FS Gate */}
      <RequirementChip
        label="FS Gate"
        passed={requirements.fsGatePassed}
      />

      {/* BD1 */}
      <RequirementChip
        label="BD1≥80%"
        passed={requirements.bd1Performance}
        value={requirements.bd1Percentage}
      />

      {/* BD6 */}
      <RequirementChip
        label="BD6≥80%"
        passed={requirements.bd6Trajectory}
        value={requirements.bd6Percentage}
      />

      {/* BD High Count */}
      <RequirementChip
        label={`4+ BD≥70%`}
        passed={requirements.bdHighCount >= 4}
        value={requirements.bdHighCount}
        suffix="/7"
      />

      {/* Overall */}
      <RequirementChip
        label="9.0+"
        passed={requirements.overallScore >= 9.0}
        value={requirements.overallScore}
      />
    </div>
  )
}

function RequirementChip({
  label,
  passed,
  value,
  suffix = '',
}: {
  label: string
  passed: boolean
  value?: number
  suffix?: string
}) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded',
      passed
        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
        : 'bg-muted text-muted-foreground'
    )}>
      {passed ? <Check size={10} /> : <X size={10} />}
      <span>{label}</span>
      {value !== undefined && (
        <span className="font-medium">
          {typeof value === 'number' ? value.toFixed(0) : value}{suffix}
        </span>
      )}
    </span>
  )
}

// ============================================================================
// Inline Variant (for leaderboard row footer)
// ============================================================================

export function BreakthroughRequirementsInline({
  requirements,
  className,
}: BreakthroughRequirementsChecklistProps) {
  return (
    <div className={cn('flex flex-wrap gap-1 text-xs', className)}>
      <InlineChip label="FS Gate" passed={requirements.fsGatePassed} />
      <span className="text-muted-foreground">|</span>
      <InlineChip label="BD1≥80%" passed={requirements.bd1Performance} />
      <span className="text-muted-foreground">|</span>
      <InlineChip label="BD6≥80%" passed={requirements.bd6Trajectory} />
      <span className="text-muted-foreground">|</span>
      <InlineChip label={`4+ BD≥70%`} passed={requirements.bdHighCount >= 4} />
      <span className="text-muted-foreground">|</span>
      <InlineChip label="9.0+" passed={requirements.overallScore >= 9.0} />
    </div>
  )
}

function InlineChip({ label, passed }: { label: string; passed: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5',
      passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
    )}>
      {passed ? <Check size={10} /> : <X size={10} />}
      {label}
    </span>
  )
}

// ============================================================================
// Exports
// ============================================================================

export default BreakthroughRequirementsChecklist
