'use client'

/**
 * BreakthroughScoreCard Component
 *
 * Displays 8-dimension breakthrough score with radar chart visualization.
 * Shows classification tier, dimension breakdown, and improvement recommendations.
 *
 * @see lib/ai/rubrics/types-breakthrough.ts - Breakthrough dimension types
 * @see lib/ai/agents/breakthrough-evaluator.ts - Evaluation logic
 */

import { cn } from '@/lib/utils'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle,
  Target,
  Zap,
  Check,
  X,
  Info,
  Scale,
} from 'lucide-react'
import { useState } from 'react'
import { BreakthroughRequirementsChecklist, type BreakthroughRequirements } from './BreakthroughRequirementsChecklist'

// ============================================================================
// Types
// ============================================================================

export type ClassificationTier =
  | 'breakthrough'           // 9.0+
  | 'scientific_discovery'   // 8.0-8.9
  | 'general_insights'       // 6.5-7.9
  | 'partial_failure'        // 5.0-6.4
  | 'failure'                // <5.0

export interface DimensionScore {
  dimension: string
  dimensionId: string
  score: number
  maxScore: number
  percentOfMax: number
  evidence: string[]
  gaps: string[]
}

export interface BreakthroughScoreData {
  hypothesisId: string
  hypothesisTitle: string
  classification: ClassificationTier
  totalScore: number
  previousScore?: number
  dimensions: DimensionScore[]
  passedDimensions: string[]
  failedDimensions: string[]
  recommendations: string[]
  iteration: number
  timestamp: Date
  /** Hybrid scoring fields (v0.0.3) */
  fsScore?: number           // 0-5
  bdScore?: number           // 0-9
  fsBonusScore?: number      // 0-1
  gateStatus?: {
    passed: boolean
    failedDimensions: string[]
    minFsPercentage: number
    avgFsPercentage: number
  }
  breakthroughRequirements?: BreakthroughRequirements
  /** Separate FS and BD dimension arrays for phase display */
  fsDimensions?: DimensionScore[]
  bdDimensions?: DimensionScore[]
}

interface BreakthroughScoreCardProps {
  data: BreakthroughScoreData
  showDetails?: boolean
  initialExpanded?: boolean
  compact?: boolean
  onViewDetails?: () => void
  className?: string
}

// ============================================================================
// Classification Tier Config
// ============================================================================

const TIER_CONFIG: Record<
  ClassificationTier,
  { label: string; color: string; bgColor: string; borderColor: string; icon: React.ReactNode }
> = {
  breakthrough: {
    label: 'BREAKTHROUGH',
    color: '#10B981',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    icon: <Trophy className="w-4 h-4" />,
  },
  scientific_discovery: {
    label: 'SCIENTIFIC DISCOVERY',
    color: '#3B82F6',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: <Target className="w-4 h-4" />,
  },
  general_insights: {
    label: 'GENERAL INSIGHTS',
    color: '#8B5CF6',
    bgColor: 'bg-violet-50 dark:bg-violet-950',
    borderColor: 'border-violet-200 dark:border-violet-800',
    icon: <Zap className="w-4 h-4" />,
  },
  partial_failure: {
    label: 'PARTIAL FAILURE',
    color: '#F59E0B',
    bgColor: 'bg-amber-50 dark:bg-amber-950',
    borderColor: 'border-amber-200 dark:border-amber-800',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  failure: {
    label: 'FAILURE',
    color: '#EF4444',
    bgColor: 'bg-red-50 dark:bg-red-950',
    borderColor: 'border-red-200 dark:border-red-800',
    icon: <AlertCircle className="w-4 h-4" />,
  },
}

// Dimension display names (exported for use in other components)
export const DIMENSION_NAMES: Record<string, string> = {
  // FrontierScience dimensions (FS1-FS5) - v0.0.3
  fs1_predictions: 'FS1 Predictions',
  fs2_evidence: 'FS2 Evidence',
  fs3_mechanism: 'FS3 Mechanism',
  fs4_grounding: 'FS4 Grounding',
  fs5_methodology: 'FS5 Methodology',
  // Breakthrough Detection dimensions (BD1-BD7) - v0.0.3
  bd1_performance: 'BD1 Performance',
  bd2_cost: 'BD2 Cost',
  bd3_cross_domain: 'BD3 Cross-Domain',
  bd4_market: 'BD4 Market',
  bd5_scalability: 'BD5 Scalability',
  bd6_trajectory: 'BD6 Trajectory',
  bd7_societal: 'BD7 Societal',
  // Legacy Impact dimensions (BC1-BC8)
  bc1_performance: 'Performance',
  bc2_cost: 'Cost',
  bc3_capabilities: 'Capabilities',
  bc4_applications: 'Applications',
  bc5_societal: 'Societal',
  bc6_scale: 'Scale',
  bc7_problem_solving: 'Problem-Solving',
  bc8_trajectory: 'Trajectory',
  // Legacy Feasibility dimensions (BC9-BC12)
  bc9_feasibility: 'Feasibility',
  bc10_literature: 'Literature',
  bc11_infrastructure: 'Infrastructure',
  bc12_capital: 'Capital',
}

// Critical BD dimensions for breakthrough (must score ≥80%)
const CRITICAL_BD_DIMENSIONS = ['bd1_performance', 'bd6_trajectory']

// ============================================================================
// Main Component
// ============================================================================

export function BreakthroughScoreCard({
  data,
  showDetails = true,
  initialExpanded = false,
  compact = false,
  onViewDetails,
  className,
}: BreakthroughScoreCardProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded)

  const tierConfig = TIER_CONFIG[data.classification]
  const scoreChange = data.previousScore !== undefined
    ? data.totalScore - data.previousScore
    : undefined

  // Check if hybrid scoring data is available
  const hasHybridScores = data.fsScore !== undefined && data.bdScore !== undefined

  // Prepare radar chart data
  const radarData = data.dimensions.map((dim) => ({
    dimension: DIMENSION_NAMES[dim.dimensionId] || dim.dimension,
    score: dim.percentOfMax,
    fullMark: 100,
  }))

  if (compact) {
    return (
      <CompactScoreCard data={data} tierConfig={tierConfig} scoreChange={scoreChange} className={className} />
    )
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden', tierConfig.borderColor, className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between p-4 transition-colors text-left',
          tierConfig.bgColor,
          'hover:opacity-90'
        )}
      >
        <div className="flex items-center gap-3">
          <ScoreCircle score={data.totalScore} color={tierConfig.color} />
          <div>
            <div className="text-sm font-medium text-foreground line-clamp-1">
              {data.hypothesisTitle}
            </div>
            <div className="text-xs text-muted-foreground">
              {data.passedDimensions.length}/12 dimensions passed • Iteration {data.iteration}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ClassificationBadge classification={data.classification} />
          {scoreChange !== undefined && <ScoreChangeIndicator change={scoreChange} />}
          {isExpanded ? (
            <ChevronUp size={16} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={16} className="text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Score Progress Bar */}
      <div className="h-1.5 bg-muted">
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${(data.totalScore / 10) * 100}%`,
            backgroundColor: tierConfig.color,
          }}
        />
      </div>

      {/* Expanded Details */}
      {isExpanded && showDetails && (
        <div className="p-4 border-t bg-background/50">
          {/* Hybrid Scoring Phases (v0.0.3) */}
          {hasHybridScores && (
            <div className="space-y-4 mb-6">
              {/* Phase 1: Gate (FrontierScience) */}
              <div className={cn(
                'p-3 rounded-lg border',
                data.gateStatus?.passed
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
              )}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Scale size={14} className={data.gateStatus?.passed ? 'text-emerald-600' : 'text-red-600'} />
                    <span className="text-xs font-medium uppercase tracking-wide">
                      Phase 1: Gate (FrontierScience)
                    </span>
                  </div>
                  <span className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded',
                    data.gateStatus?.passed
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-500/20 text-red-600 dark:text-red-400'
                  )}>
                    {data.gateStatus?.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>

                {/* FS Dimensions */}
                {data.fsDimensions && data.fsDimensions.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {data.fsDimensions.map((dim) => (
                      <DimensionRow
                        key={dim.dimensionId}
                        dimension={dim}
                        tierColor={data.gateStatus?.passed ? '#10B981' : '#EF4444'}
                        threshold={60}
                      />
                    ))}
                  </div>
                )}

                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Info size={10} />
                  Gate Threshold: 60% per dimension
                </div>
              </div>

              {/* Phase 2: Score (Breakthrough Detection) */}
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-blue-600" />
                    <span className="text-xs font-medium uppercase tracking-wide">
                      Phase 2: Score (Breakthrough Detection)
                    </span>
                  </div>
                  <span className="text-xs font-medium" style={{ color: tierConfig.color }}>
                    {data.bdScore?.toFixed(1)}/9 pts
                  </span>
                </div>

                {/* BD Dimensions */}
                {data.bdDimensions && data.bdDimensions.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {data.bdDimensions.map((dim) => (
                      <DimensionRow
                        key={dim.dimensionId}
                        dimension={dim}
                        tierColor={tierConfig.color}
                        isCritical={CRITICAL_BD_DIMENSIONS.includes(dim.dimensionId)}
                      />
                    ))}
                  </div>
                )}

                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Info size={10} />
                  <span className="text-amber-500">*</span> = Critical for Breakthrough (must be ≥80%)
                </div>
              </div>

              {/* Phase 3: FS Bonus */}
              {data.fsBonusScore !== undefined && data.fsBonusScore > 0 && (
                <div className="p-3 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-emerald-600" />
                      <span className="text-xs font-medium uppercase tracking-wide">
                        Phase 3: FS Bonus
                      </span>
                    </div>
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      +{data.fsBonusScore.toFixed(2)} pts
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Avg FS: {data.gateStatus?.avgFsPercentage?.toFixed(0) || '0'}% → Bonus: ({data.gateStatus?.avgFsPercentage?.toFixed(0) || '0'}%-60%)/40% × 1.0
                  </div>
                </div>
              )}

              {/* Final Score Summary */}
              <div className={cn('p-3 rounded-lg border-2', tierConfig.borderColor, tierConfig.bgColor)}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">FINAL SCORE</span>
                  <div className="text-right">
                    <div className="text-lg font-bold" style={{ color: tierConfig.color }}>
                      {data.totalScore.toFixed(2)}/10
                    </div>
                    <div className="text-xs text-muted-foreground">
                      BD: {data.bdScore?.toFixed(2)} + FS Bonus: {data.fsBonusScore?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-center">
                  <ClassificationBadge classification={data.classification} />
                </div>
              </div>

              {/* Breakthrough Requirements Checklist */}
              {data.breakthroughRequirements && (
                <BreakthroughRequirementsChecklist
                  requirements={data.breakthroughRequirements}
                  compact
                />
              )}
            </div>
          )}

          {/* Radar Chart (for legacy or when hybrid not available) */}
          {!hasHybridScores && (
            <div className="h-64 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis
                    dataKey="dimension"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                  />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke={tierConfig.color}
                    fill={tierConfig.color}
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Score']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Dimension Breakdown (legacy view) */}
          {!hasHybridScores && (
            <div className="space-y-2 mb-4">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Dimension Scores
              </div>
              {data.dimensions.map((dim) => (
                <DimensionRow key={dim.dimensionId} dimension={dim} tierColor={tierConfig.color} />
              ))}
            </div>
          )}

          {/* Recommendations */}
          {data.recommendations.length > 0 && (
            <div className="mt-4 p-3 rounded-md bg-muted/50 border">
              <div className="text-xs font-medium text-foreground mb-2 flex items-center gap-1">
                <Target size={12} />
                Improvement Recommendations
              </div>
              <ul className="space-y-1">
                {data.recommendations.slice(0, 3).map((rec, index) => (
                  <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-muted-foreground shrink-0">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* View Details Button */}
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="mt-4 w-full py-2 text-sm font-medium text-foreground bg-muted rounded-md hover:bg-muted/80 transition-colors"
            >
              View Full Details
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Sub-Components
// ============================================================================

function ScoreCircle({ score, color, size = 'md' }: { score: number; color: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg',
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold border-2',
        sizeClasses[size]
      )}
      style={{ borderColor: color, color }}
    >
      {score.toFixed(1)}
    </div>
  )
}

function ClassificationBadge({ classification }: { classification: ClassificationTier }) {
  const config = TIER_CONFIG[classification]

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
        config.bgColor
      )}
      style={{ color: config.color }}
    >
      {config.icon}
      <span>{config.label}</span>
    </div>
  )
}

function ScoreChangeIndicator({ change }: { change: number }) {
  if (Math.abs(change) < 0.1) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus size={12} />
        <span>0.0</span>
      </div>
    )
  }

  const isPositive = change > 0

  return (
    <div
      className={cn(
        'flex items-center gap-1 text-xs font-medium',
        isPositive ? 'text-green-600' : 'text-red-600'
      )}
    >
      {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      <span>{isPositive ? '+' : ''}{change.toFixed(1)}</span>
    </div>
  )
}

interface DimensionRowProps {
  dimension: DimensionScore
  tierColor: string
  threshold?: number      // Pass threshold for gate checking (e.g., 60 for FS)
  isCritical?: boolean    // Mark critical BD dimensions
}

function DimensionRow({ dimension, tierColor, threshold, isCritical = false }: DimensionRowProps) {
  // Use threshold if provided, otherwise default to 70%
  const passThreshold = threshold ?? 70
  const isPassed = dimension.percentOfMax >= passThreshold

  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        'w-24 text-xs truncate flex items-center gap-1',
        isCritical && 'font-medium'
      )}>
        <span className="text-muted-foreground">
          {DIMENSION_NAMES[dimension.dimensionId] || dimension.dimension}
        </span>
        {isCritical && <span className="text-amber-500 font-bold">*</span>}
      </div>
      <div className="flex-1 relative">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300 rounded-full"
            style={{
              width: `${dimension.percentOfMax}%`,
              backgroundColor: isPassed ? tierColor : (isCritical && !isPassed ? '#EF4444' : '#9ca3af'),
            }}
          />
        </div>
        {/* Threshold marker */}
        {threshold && (
          <div
            className="absolute top-0 h-2 w-px bg-foreground/30"
            style={{ left: `${threshold}%` }}
            title={`Threshold: ${threshold}%`}
          />
        )}
      </div>
      <div className={cn(
        'w-16 text-xs text-right font-mono',
        isPassed ? 'text-foreground' : 'text-muted-foreground'
      )}>
        {dimension.score.toFixed(1)}/{dimension.maxScore.toFixed(1)}
      </div>
      <div className={cn(
        'w-10 text-xs text-right',
        isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
      )}>
        {dimension.percentOfMax.toFixed(0)}%
      </div>
      {/* Status icon */}
      <div className="w-4">
        {isPassed ? (
          <Check size={12} className="text-emerald-500" />
        ) : (
          <X size={12} className={isCritical ? 'text-red-500' : 'text-muted-foreground'} />
        )}
      </div>
    </div>
  )
}

function CompactScoreCard({
  data,
  tierConfig,
  scoreChange,
  className,
}: {
  data: BreakthroughScoreData
  tierConfig: typeof TIER_CONFIG[ClassificationTier]
  scoreChange?: number
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-3 p-3 border rounded-lg', tierConfig.borderColor, className)}>
      <ScoreCircle score={data.totalScore} color={tierConfig.color} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">
          {data.hypothesisTitle}
        </div>
        <div className="text-xs text-muted-foreground">
          {data.passedDimensions.length}/12 passed
        </div>
      </div>
      <div className="flex items-center gap-2">
        {scoreChange !== undefined && <ScoreChangeIndicator change={scoreChange} />}
        <ClassificationBadge classification={data.classification} />
      </div>
    </div>
  )
}

// ============================================================================
// Exports
// ============================================================================

export { ClassificationBadge, ScoreChangeIndicator, TIER_CONFIG }
export default BreakthroughScoreCard
