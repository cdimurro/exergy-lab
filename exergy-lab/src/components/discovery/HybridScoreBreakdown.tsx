'use client'

/**
 * HybridScoreBreakdown Component (v0.0.3)
 *
 * Displays the Gate + Score + Bonus breakdown for the hybrid scoring system.
 * Shows FS Gate status, BD Score, FS Bonus, and overall score with tier classification.
 *
 * @see lib/ai/rubrics/types-hybrid-breakthrough.ts - Type definitions
 * @see lib/ai/agents/breakthrough-evaluator.ts - Evaluation logic
 */

import { cn } from '@/lib/utils'
import { Check, X, AlertCircle, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { useState } from 'react'
import type { HybridClassificationTier } from '@/lib/ai/rubrics/types-hybrid-breakthrough'

// ============================================================================
// Types
// ============================================================================

export interface FSDimensionScore {
  dimension: string
  score: number
  maxScore: number
  percentage: number
  passed: boolean
}

export interface BDDimensionScore {
  dimension: string
  score: number
  maxScore: number
  percentage: number
  isCritical?: boolean
  passed: boolean
}

export interface GateStatus {
  passed: boolean
  failedDimensions: string[]
  minFsPercentage: number
  avgFsPercentage: number
}

export interface HybridScoreBreakdownProps {
  fsScore: number           // 0-5
  bdScore: number           // 0-9
  fsBonusScore?: number     // 0-1
  overallScore: number      // 0-10
  gateStatus?: GateStatus
  tier: HybridClassificationTier
  fsDimensions?: FSDimensionScore[]
  bdDimensions?: BDDimensionScore[]
  compact?: boolean         // For leaderboard row vs detailed card
  className?: string
}

// ============================================================================
// Tier Configuration
// ============================================================================

const TIER_CONFIG: Record<HybridClassificationTier, { label: string; color: string; bgClass: string }> = {
  breakthrough: { label: 'Breakthrough', color: '#10B981', bgClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  scientific_discovery: { label: 'Scientific Discovery', color: '#3B82F6', bgClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  general_insights: { label: 'General Insights', color: '#8B5CF6', bgClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  partial_failure: { label: 'Partial Failure', color: '#F59E0B', bgClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  failure: { label: 'Failure', color: '#EF4444', bgClass: 'bg-red-500/10 text-red-600 dark:text-red-400' },
}

// Dimension display names
const FS_DIMENSION_NAMES: Record<string, string> = {
  fs1_predictions: 'FS1 Predictions',
  fs2_evidence: 'FS2 Evidence',
  fs3_mechanism: 'FS3 Mechanism',
  fs4_grounding: 'FS4 Grounding',
  fs5_methodology: 'FS5 Methodology',
}

const BD_DIMENSION_NAMES: Record<string, string> = {
  bd1_performance: 'BD1 Performance',
  bd2_cost: 'BD2 Cost',
  bd3_cross_domain: 'BD3 Cross-Domain',
  bd4_market: 'BD4 Market',
  bd5_scalability: 'BD5 Scalability',
  bd6_trajectory: 'BD6 Trajectory',
  bd7_societal: 'BD7 Societal',
}

// Critical BD dimensions for breakthrough
const CRITICAL_BD_DIMENSIONS = ['bd1_performance', 'bd6_trajectory']

// ============================================================================
// Main Component
// ============================================================================

export function HybridScoreBreakdown({
  fsScore,
  bdScore,
  fsBonusScore = 0,
  overallScore,
  gateStatus,
  tier,
  fsDimensions,
  bdDimensions,
  compact = false,
  className,
}: HybridScoreBreakdownProps) {
  const tierConfig = TIER_CONFIG[tier]
  const fsPercentage = (fsScore / 5) * 100
  const bdPercentage = (bdScore / 9) * 100

  if (compact) {
    return (
      <CompactBreakdown
        fsScore={fsScore}
        bdScore={bdScore}
        fsBonusScore={fsBonusScore}
        overallScore={overallScore}
        gateStatus={gateStatus}
        tier={tier}
        className={className}
      />
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Gate Status Banner */}
      <GateStatusBanner gateStatus={gateStatus} />

      {/* Score Overview */}
      <div className="grid grid-cols-3 gap-3">
        <ScoreBox
          label="FrontierScience"
          score={fsScore}
          maxScore={5}
          percentage={fsPercentage}
          color={gateStatus?.passed ? '#10B981' : '#EF4444'}
        />
        <ScoreBox
          label="Breakthrough"
          score={bdScore}
          maxScore={9}
          percentage={bdPercentage}
          color={tierConfig.color}
        />
        <ScoreBox
          label="Total"
          score={overallScore}
          maxScore={10}
          percentage={(overallScore / 10) * 100}
          color={tierConfig.color}
          highlight
        />
      </div>

      {/* Tier Badge */}
      <div className="flex items-center justify-center">
        <span className={cn('px-3 py-1.5 rounded-full text-sm font-medium', tierConfig.bgClass)}>
          {tierConfig.label} ({overallScore.toFixed(1)}/10)
        </span>
      </div>

      {/* FS Dimensions */}
      {fsDimensions && fsDimensions.length > 0 && (
        <DimensionSection
          title="GATE: FrontierScience (≥60% each)"
          dimensions={fsDimensions}
          dimensionNames={FS_DIMENSION_NAMES}
          threshold={60}
        />
      )}

      {/* BD Dimensions */}
      {bdDimensions && bdDimensions.length > 0 && (
        <DimensionSection
          title="SCORE: Breakthrough Detection (9 pts)"
          dimensions={bdDimensions}
          dimensionNames={BD_DIMENSION_NAMES}
          criticalDimensions={CRITICAL_BD_DIMENSIONS}
        />
      )}

      {/* FS Bonus */}
      {fsBonusScore > 0 && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center justify-between">
            <span className="text-sm text-emerald-700 dark:text-emerald-300">FS Bonus (Excellence)</span>
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              +{fsBonusScore.toFixed(2)} pts
            </span>
          </div>
          <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">
            Avg FS: {gateStatus?.avgFsPercentage?.toFixed(0) || fsPercentage.toFixed(0)}% → Bonus: ({(gateStatus?.avgFsPercentage || fsPercentage).toFixed(0)}%-60%)/40% × 1.0
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Sub-Components
// ============================================================================

function CompactBreakdown({
  fsScore,
  bdScore,
  fsBonusScore = 0,
  overallScore,
  gateStatus,
  tier,
  className,
}: Omit<HybridScoreBreakdownProps, 'compact' | 'fsDimensions' | 'bdDimensions'>) {
  const tierConfig = TIER_CONFIG[tier]
  const fsPercentage = (fsScore / 5) * 100
  const bdPercentage = (bdScore / 9) * 100

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Gate Status */}
      <div className="flex items-center gap-2">
        {gateStatus?.passed ? (
          <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <Check size={12} /> Gate
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
            <X size={12} /> Gate
          </span>
        )}
      </div>

      {/* Score Line */}
      <div className="text-xs text-muted-foreground">
        <span className="font-medium">FrontierScience:</span> {fsScore.toFixed(1)}/5 ({fsPercentage.toFixed(0)}%)
        <span className="mx-2">|</span>
        <span className="font-medium">Breakthrough:</span> {bdScore.toFixed(1)}/9 ({bdPercentage.toFixed(0)}%)
      </div>

      {/* Total */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">TOTAL: {overallScore.toFixed(2)}</span>
        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', tierConfig.bgClass)}>
          {tierConfig.label}
        </span>
      </div>
    </div>
  )
}

function GateStatusBanner({ gateStatus }: { gateStatus?: GateStatus }) {
  if (!gateStatus) return null

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
      gateStatus.passed
        ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'
        : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
    )}>
      {gateStatus.passed ? (
        <>
          <Check size={16} className="text-emerald-600 dark:text-emerald-400" />
          <span className="text-emerald-700 dark:text-emerald-300 font-medium">FS Gate: PASSED</span>
          <span className="text-emerald-600/70 dark:text-emerald-400/70 text-xs">
            (min: {gateStatus.minFsPercentage.toFixed(0)}%, avg: {gateStatus.avgFsPercentage.toFixed(0)}%)
          </span>
        </>
      ) : (
        <>
          <X size={16} className="text-red-600 dark:text-red-400" />
          <span className="text-red-700 dark:text-red-300 font-medium">FS Gate: FAILED</span>
          {gateStatus.failedDimensions.length > 0 && (
            <span className="text-red-600/70 dark:text-red-400/70 text-xs">
              Failed: {gateStatus.failedDimensions.map(d => FS_DIMENSION_NAMES[d] || d).join(', ')}
            </span>
          )}
        </>
      )}
    </div>
  )
}

function ScoreBox({
  label,
  score,
  maxScore,
  percentage,
  color,
  highlight = false,
}: {
  label: string
  score: number
  maxScore: number
  percentage: number
  color: string
  highlight?: boolean
}) {
  return (
    <div className={cn(
      'p-3 rounded-lg border text-center',
      highlight ? 'bg-muted/50 border-foreground/20' : 'bg-background'
    )}>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-lg font-bold" style={{ color }}>
        {score.toFixed(1)}<span className="text-sm font-normal text-muted-foreground">/{maxScore}</span>
      </div>
      <div className="text-xs text-muted-foreground">({percentage.toFixed(0)}%)</div>
    </div>
  )
}

interface DimensionSectionProps {
  title: string
  dimensions: (FSDimensionScore | BDDimensionScore)[]
  dimensionNames: Record<string, string>
  threshold?: number
  criticalDimensions?: string[]
}

function DimensionSection({
  title,
  dimensions,
  dimensionNames,
  threshold,
  criticalDimensions = [],
}: DimensionSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
      >
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        {isExpanded ? (
          <ChevronUp size={14} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={14} className="text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="p-3 border-t bg-background/50 space-y-2">
          {dimensions.map((dim) => {
            const isCritical = criticalDimensions.includes(dim.dimension)
            const displayName = dimensionNames[dim.dimension] || dim.dimension
            const meetsThreshold = threshold ? dim.percentage >= threshold : dim.passed

            return (
              <div key={dim.dimension} className="flex items-center gap-3">
                <div className={cn(
                  'w-28 text-xs truncate flex items-center gap-1',
                  isCritical ? 'font-medium' : ''
                )}>
                  {displayName}
                  {isCritical && <span className="text-amber-500">*</span>}
                </div>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all duration-300 rounded-full',
                      meetsThreshold ? 'bg-emerald-500' : 'bg-muted-foreground/50'
                    )}
                    style={{ width: `${Math.min(dim.percentage, 100)}%` }}
                  />
                </div>
                <div className={cn(
                  'w-16 text-xs text-right',
                  meetsThreshold ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                )}>
                  {dim.score.toFixed(1)}/{dim.maxScore.toFixed(1)} ({dim.percentage.toFixed(0)}%)
                </div>
                {meetsThreshold ? (
                  <Check size={12} className="text-emerald-500" />
                ) : (
                  <X size={12} className="text-muted-foreground" />
                )}
              </div>
            )
          })}
          {criticalDimensions.length > 0 && (
            <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Info size={10} />
              <span className="text-amber-500">*</span> = Critical for Breakthrough (must be ≥80%)
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Exports
// ============================================================================

export { TIER_CONFIG as HYBRID_TIER_CONFIG }
export default HybridScoreBreakdown
