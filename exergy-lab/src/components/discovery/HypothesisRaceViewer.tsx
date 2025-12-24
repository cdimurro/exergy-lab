'use client'

/**
 * HypothesisRaceViewer Component
 *
 * Real-time visualization of hypothesis racing with leaderboard,
 * score trajectories, and elimination events.
 *
 * @see lib/ai/agents/hypothesis-racer.ts - Racing arena logic
 * @see lib/ai/agents/feedback-bus.ts - Real-time events
 */

import { cn } from '@/lib/utils'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import {
  Trophy,
  Flame,
  TrendingUp,
  TrendingDown,
  XCircle,
  Sparkles,
  Activity,
  Users,
  Clock,
  ChevronDown,
  ChevronUp,
  Zap,
  Server,
  Check,
  X,
  ExternalLink,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { ClassificationBadge, TIER_CONFIG, type ClassificationTier } from './BreakthroughScoreCard'
import { BreakthroughRequirementsInline, type BreakthroughRequirements } from './BreakthroughRequirementsChecklist'
import { DimensionProgressBarInline } from './DimensionProgressBar'

// ============================================================================
// Types
// ============================================================================

export type HypGenAgentType = 'novel' | 'feasible' | 'economic' | 'cross-domain' | 'paradigm' | 'fusion'
export type HypothesisStatus = 'active' | 'eliminated' | 'breakthrough'

export interface RacingHypothesis {
  id: string
  title: string
  agentSource: HypGenAgentType
  status: HypothesisStatus
  currentScore: number
  previousScore?: number
  scoreHistory: number[]
  classification: ClassificationTier
  iteration: number
  eliminatedReason?: string
  /** GPU validation results */
  gpuValidation?: {
    physicsValid: boolean
    economicallyViable: boolean
    confidence: number
    tier: 'T4' | 'A10G' | 'A100'
    iteration: number
  }
  /** Hybrid scoring fields (v0.0.3) */
  fsScore?: number           // 0-5
  bdScore?: number           // 0-9
  fsBonusScore?: number      // 0-1
  gateStatus?: {
    passed: boolean
    failedDimensions: string[]
    minFsPercentage?: number
    avgFsPercentage?: number
  }
  breakthroughRequirements?: BreakthroughRequirements
  /** Individual dimension scores (for expanded view) */
  fsDimensions?: Array<{
    dimension: string
    score: number
    maxScore: number
    percentage: number
    passed: boolean
  }>
  bdDimensions?: Array<{
    dimension: string
    score: number
    maxScore: number
    percentage: number
    isCritical?: boolean
    passed: boolean
  }>
}

export interface LeaderboardEntry {
  rank: number
  hypothesis: RacingHypothesis
  isNew?: boolean
  rankChange?: number
}

export interface RaceStats {
  totalHypotheses: number
  activeCount: number
  eliminatedCount: number
  breakthroughCount: number
  currentIteration: number
  maxIterations: number
  topScore: number
  averageScore: number
  elapsedTimeMs: number
}

interface HypothesisRaceViewerProps {
  hypotheses: RacingHypothesis[]
  stats: RaceStats
  showTrajectories?: boolean
  showEliminated?: boolean
  compact?: boolean
  onHypothesisClick?: (hypothesis: RacingHypothesis) => void
  className?: string
}

// ============================================================================
// Agent Type Config
// ============================================================================

const AGENT_CONFIG: Record<HypGenAgentType, { label: string; color: string; icon: React.ReactNode }> = {
  novel: { label: 'Novel', color: '#8B5CF6', icon: <Sparkles size={12} /> },
  feasible: { label: 'Feasible', color: '#10B981', icon: <Zap size={12} /> },
  economic: { label: 'Economic', color: '#F59E0B', icon: <TrendingUp size={12} /> },
  'cross-domain': { label: 'Cross-Domain', color: '#3B82F6', icon: <Activity size={12} /> },
  paradigm: { label: 'Paradigm', color: '#EC4899', icon: <Flame size={12} /> },
  fusion: { label: 'Fusion', color: '#14B8A6', icon: <Users size={12} /> },
}

// ============================================================================
// Main Component
// ============================================================================

export function HypothesisRaceViewer({
  hypotheses,
  stats,
  showTrajectories = true,
  showEliminated = false,
  compact = false,
  onHypothesisClick,
  className,
}: HypothesisRaceViewerProps) {
  const [expandedSection, setExpandedSection] = useState<'leaderboard' | 'trajectories' | 'eliminated' | null>(
    'leaderboard'
  )

  // Filter and sort hypotheses
  const activeHypotheses = useMemo(
    () => hypotheses
      .filter(h => h.status === 'active' || h.status === 'breakthrough')
      .sort((a, b) => b.currentScore - a.currentScore),
    [hypotheses]
  )

  const eliminatedHypotheses = useMemo(
    () => hypotheses.filter(h => h.status === 'eliminated'),
    [hypotheses]
  )

  const breakthroughHypotheses = useMemo(
    () => hypotheses.filter(h => h.status === 'breakthrough'),
    [hypotheses]
  )

  // Create leaderboard entries
  const leaderboard: LeaderboardEntry[] = activeHypotheses.map((h, index) => ({
    rank: index + 1,
    hypothesis: h,
    rankChange: h.previousScore !== undefined
      ? Math.sign(h.currentScore - h.previousScore) * -1 // Higher score = rank improvement (negative change)
      : undefined,
  }))

  if (compact) {
    return (
      <CompactRaceViewer
        leaderboard={leaderboard.slice(0, 5)}
        stats={stats}
        className={className}
      />
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Race Stats Header */}
      <RaceStatsHeader stats={stats} breakthroughCount={breakthroughHypotheses.length} />

      {/* Leaderboard Section */}
      <CollapsibleSection
        title="Leaderboard"
        icon={<Trophy size={16} />}
        count={activeHypotheses.length}
        isExpanded={expandedSection === 'leaderboard'}
        onToggle={() => setExpandedSection(expandedSection === 'leaderboard' ? null : 'leaderboard')}
      >
        <div className="space-y-2">
          {leaderboard.map((entry) => (
            <LeaderboardRow
              key={entry.hypothesis.id}
              entry={entry}
              onClick={() => onHypothesisClick?.(entry.hypothesis)}
            />
          ))}
          {leaderboard.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No active hypotheses
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Score Trajectories */}
      {showTrajectories && (
        <CollapsibleSection
          title="Score Trajectories"
          icon={<Activity size={16} />}
          isExpanded={expandedSection === 'trajectories'}
          onToggle={() => setExpandedSection(expandedSection === 'trajectories' ? null : 'trajectories')}
        >
          <ScoreTrajectoryChart hypotheses={activeHypotheses.slice(0, 5)} />
        </CollapsibleSection>
      )}

      {/* Eliminated Hypotheses */}
      {showEliminated && eliminatedHypotheses.length > 0 && (
        <CollapsibleSection
          title="Eliminated"
          icon={<XCircle size={16} />}
          count={eliminatedHypotheses.length}
          isExpanded={expandedSection === 'eliminated'}
          onToggle={() => setExpandedSection(expandedSection === 'eliminated' ? null : 'eliminated')}
        >
          <div className="space-y-2">
            {eliminatedHypotheses.map((h) => (
              <EliminatedRow key={h.id} hypothesis={h} />
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  )
}

// ============================================================================
// Sub-Components
// ============================================================================

function RaceStatsHeader({ stats, breakthroughCount }: { stats: RaceStats; breakthroughCount: number }) {
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        label="Progress"
        value={`${stats.currentIteration}/${stats.maxIterations}`}
        subtext="iterations"
        icon={<Activity size={14} />}
      />
      <StatCard
        label="Active"
        value={stats.activeCount}
        subtext={`of ${stats.totalHypotheses}`}
        icon={<Users size={14} />}
        highlight={breakthroughCount > 0}
      />
      <StatCard
        label="Top Score"
        value={stats.topScore.toFixed(1)}
        subtext={`avg: ${stats.averageScore.toFixed(1)}`}
        icon={<Trophy size={14} />}
        highlight={stats.topScore >= 9.0}
      />
      <StatCard
        label="Elapsed"
        value={formatTime(stats.elapsedTimeMs)}
        subtext="running"
        icon={<Clock size={14} />}
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  subtext,
  icon,
  highlight = false,
}: {
  label: string
  value: string | number
  subtext: string
  icon: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div className={cn(
      'p-3 rounded-lg border',
      highlight ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800' : 'bg-muted/30'
    )}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className={cn('text-lg font-semibold', highlight && 'text-emerald-600 dark:text-emerald-400')}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{subtext}</div>
    </div>
  )
}

function CollapsibleSection({
  title,
  icon,
  count,
  isExpanded,
  onToggle,
  children,
}: {
  title: string
  icon: React.ReactNode
  count?: number
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-sm font-medium">{title}</span>
          {count !== undefined && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {count}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp size={16} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={16} className="text-muted-foreground" />
        )}
      </button>
      {isExpanded && <div className="p-3 border-t bg-background/50">{children}</div>}
    </div>
  )
}

function LeaderboardRow({ entry, onClick }: { entry: LeaderboardEntry; onClick?: () => void }) {
  const { hypothesis, rank } = entry
  const [isExpanded, setIsExpanded] = useState(false)
  const agentConfig = AGENT_CONFIG[hypothesis.agentSource]
  const scoreChange = hypothesis.previousScore !== undefined
    ? hypothesis.currentScore - hypothesis.previousScore
    : undefined

  // Hybrid score calculations
  const hasHybridScores = hypothesis.fsScore !== undefined && hypothesis.bdScore !== undefined
  const fsPercentage = hypothesis.fsScore !== undefined ? (hypothesis.fsScore / 5) * 100 : 0
  const bdPercentage = hypothesis.bdScore !== undefined ? (hypothesis.bdScore / 9) * 100 : 0

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  return (
    <div className={cn(
      'rounded-lg border transition-all overflow-hidden',
      'hover:border-foreground/20',
      hypothesis.status === 'breakthrough' && 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/50'
    )}>
      {/* Main Row */}
      <div className="flex items-center gap-3 p-3">
        {/* Rank */}
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
          rank === 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
          rank === 2 ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' :
          rank === 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
          'bg-muted text-muted-foreground'
        )}>
          {rank}
        </div>

        {/* Hypothesis Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onClick?.()}
              className="text-sm font-medium truncate hover:underline text-left"
            >
              {hypothesis.title}
            </button>
            {hypothesis.status === 'breakthrough' && (
              <Trophy size={14} className="text-emerald-500 shrink-0" />
            )}
          </div>

          {/* Agent Badge + Iteration + Gate Status */}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span
              className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${agentConfig.color}20`, color: agentConfig.color }}
            >
              {agentConfig.icon}
              {agentConfig.label}
            </span>
            <span className="text-xs text-muted-foreground">Iter {hypothesis.iteration}</span>

            {/* Gate Status Indicator */}
            {hypothesis.gateStatus && (
              <span className={cn(
                'flex items-center gap-1 text-xs px-1.5 py-0.5 rounded',
                hypothesis.gateStatus.passed
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/20 text-red-600 dark:text-red-400'
              )}>
                {hypothesis.gateStatus.passed ? <Check size={10} /> : <X size={10} />}
                Gate
              </span>
            )}

            {/* GPU Validation Badge */}
            {hypothesis.gpuValidation && (
              <span className={cn(
                "flex items-center gap-1 text-xs px-1.5 py-0.5 rounded",
                hypothesis.gpuValidation.physicsValid && hypothesis.gpuValidation.economicallyViable
                  ? "bg-emerald-500/20 text-emerald-600"
                  : hypothesis.gpuValidation.physicsValid
                  ? "bg-blue-500/20 text-blue-600"
                  : "bg-red-500/20 text-red-600"
              )}>
                <Server size={10} />
                {hypothesis.gpuValidation.tier}
                {hypothesis.gpuValidation.physicsValid ? (
                  <Check size={10} />
                ) : (
                  <X size={10} />
                )}
              </span>
            )}
          </div>

          {/* Hybrid Score Line (Compact) */}
          {hasHybridScores && (
            <div className="text-xs text-muted-foreground mt-1">
              <span className="font-medium">FrontierScience:</span> {hypothesis.fsScore?.toFixed(1)}/5 ({fsPercentage.toFixed(0)}%)
              <span className="mx-2">|</span>
              <span className="font-medium">Breakthrough:</span> {hypothesis.bdScore?.toFixed(1)}/9 ({bdPercentage.toFixed(0)}%)
            </div>
          )}
        </div>

        {/* Score + Tier */}
        <div className="text-right shrink-0 flex items-center gap-2">
          <div>
            <div className="text-lg font-semibold">{hypothesis.currentScore.toFixed(2)}</div>
            {scoreChange !== undefined && (
              <div className={cn(
                'text-xs flex items-center gap-0.5 justify-end',
                scoreChange > 0 ? 'text-green-600' : scoreChange < 0 ? 'text-red-600' : 'text-muted-foreground'
              )}>
                {scoreChange > 0 ? <TrendingUp size={10} /> : scoreChange < 0 ? <TrendingDown size={10} /> : null}
                {scoreChange > 0 ? '+' : ''}{scoreChange.toFixed(2)}
              </div>
            )}
          </div>

          {/* Expand/Collapse Button */}
          {hasHybridScores && (
            <button
              onClick={handleExpandToggle}
              className="p-1 hover:bg-muted rounded transition-colors"
              title={isExpanded ? 'Hide details' : 'Show details'}
            >
              {isExpanded ? (
                <ChevronUp size={16} className="text-muted-foreground" />
              ) : (
                <ChevronDown size={16} className="text-muted-foreground" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Section */}
      {isExpanded && hasHybridScores && (
        <div className="border-t bg-muted/20 p-3 space-y-3">
          {/* Gate Section */}
          {hypothesis.gateStatus && (
            <div className="space-y-2">
              <div className={cn(
                'flex items-center gap-2 text-xs font-medium',
                hypothesis.gateStatus.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              )}>
                {hypothesis.gateStatus.passed ? <Check size={12} /> : <X size={12} />}
                GATE: {hypothesis.gateStatus.passed ? 'PASSED' : 'FAILED'}
              </div>

              {/* FS Dimensions (inline) */}
              {hypothesis.fsDimensions && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {hypothesis.fsDimensions.map(dim => (
                    <DimensionProgressBarInline
                      key={dim.dimension}
                      dimension={dim.dimension}
                      label=""
                      percentage={dim.percentage}
                      passed={dim.passed}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Breakthrough Detection Section */}
          {hypothesis.bdDimensions && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                BREAKTHROUGH DETECTION: {hypothesis.bdScore?.toFixed(1)}/9
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                {hypothesis.bdDimensions.map(dim => (
                  <DimensionProgressBarInline
                    key={dim.dimension}
                    dimension={dim.dimension}
                    label=""
                    percentage={dim.percentage}
                    passed={dim.passed}
                    isCritical={dim.isCritical}
                  />
                ))}
              </div>
            </div>
          )}

          {/* FS Bonus */}
          {hypothesis.fsBonusScore !== undefined && hypothesis.fsBonusScore > 0 && (
            <div className="text-xs text-emerald-600 dark:text-emerald-400">
              FS BONUS: +{hypothesis.fsBonusScore.toFixed(2)} | TOTAL: {hypothesis.currentScore.toFixed(2)}/10
            </div>
          )}

          {/* Breakthrough Requirements */}
          {hypothesis.breakthroughRequirements && (
            <BreakthroughRequirementsInline requirements={hypothesis.breakthroughRequirements} />
          )}

          {/* View Details Button */}
          {onClick && (
            <button
              onClick={() => onClick()}
              className="flex items-center gap-1 text-xs text-primary hover:underline mt-2"
            >
              <ExternalLink size={10} />
              View Full Details
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function EliminatedRow({ hypothesis }: { hypothesis: RacingHypothesis }) {
  const agentConfig = AGENT_CONFIG[hypothesis.agentSource]

  return (
    <div className="flex items-center gap-3 p-2 rounded-md bg-muted/30 opacity-60">
      <XCircle size={16} className="text-red-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-muted-foreground line-through truncate">
          {hypothesis.title}
        </div>
        <div className="text-xs text-muted-foreground">
          {hypothesis.eliminatedReason || `Score: ${hypothesis.currentScore.toFixed(1)}`}
        </div>
      </div>
      <span
        className="text-xs px-1.5 py-0.5 rounded"
        style={{ backgroundColor: `${agentConfig.color}20`, color: agentConfig.color }}
      >
        {agentConfig.label}
      </span>
    </div>
  )
}

function ScoreTrajectoryChart({ hypotheses }: { hypotheses: RacingHypothesis[] }) {
  // Prepare data for chart
  const maxIterations = Math.max(...hypotheses.map(h => h.scoreHistory.length), 1)

  const chartData = Array.from({ length: maxIterations }, (_, i) => {
    const point: Record<string, number> = { iteration: i + 1 }
    hypotheses.forEach((h) => {
      point[h.id] = h.scoreHistory[i] ?? null
    })
    return point
  })

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="iteration"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            label={{ value: 'Iteration', position: 'insideBottom', offset: -5, fontSize: 10 }}
          />
          <YAxis
            domain={[0, 10]}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickCount={6}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '11px',
            }}
          />
          {/* 5-Tier Reference Lines (v0.0.3) */}
          {/* Breakthrough threshold (9.0+) - Emerald */}
          <ReferenceLine
            y={9}
            stroke="#10B981"
            strokeDasharray="5 5"
            label={{ value: '9.0 Breakthrough', fontSize: 9, fill: '#10B981', position: 'right' }}
          />
          {/* Scientific Discovery threshold (8.0-8.9) - Blue */}
          <ReferenceLine
            y={8}
            stroke="#3B82F6"
            strokeDasharray="4 4"
            label={{ value: '8.0 Sci.Discovery', fontSize: 9, fill: '#3B82F6', position: 'right' }}
          />
          {/* General Insights threshold (6.5-7.9) - Violet */}
          <ReferenceLine
            y={6.5}
            stroke="#8B5CF6"
            strokeDasharray="3 3"
            label={{ value: '6.5 Insights', fontSize: 9, fill: '#8B5CF6', position: 'right' }}
          />
          {/* Elimination threshold (5.0) - Red */}
          <ReferenceLine
            y={5}
            stroke="#EF4444"
            strokeDasharray="2 2"
            label={{ value: '5.0 Elimination', fontSize: 9, fill: '#EF4444', position: 'right' }}
          />

          {hypotheses.map((h) => {
            const agentConfig = AGENT_CONFIG[h.agentSource]
            return (
              <Line
                key={h.id}
                type="monotone"
                dataKey={h.id}
                stroke={agentConfig.color}
                strokeWidth={2}
                dot={{ r: 3, fill: agentConfig.color }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            )
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function CompactRaceViewer({
  leaderboard,
  stats,
  className,
}: {
  leaderboard: LeaderboardEntry[]
  stats: RaceStats
  className?: string
}) {
  return (
    <div className={cn('p-3 border rounded-lg', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-muted-foreground" />
          <span className="text-sm font-medium">Race Progress</span>
        </div>
        <span className="text-xs text-muted-foreground">
          Iter {stats.currentIteration}/{stats.maxIterations}
        </span>
      </div>

      <div className="space-y-2">
        {leaderboard.slice(0, 3).map((entry) => {
          const agentConfig = AGENT_CONFIG[entry.hypothesis.agentSource]
          return (
            <div key={entry.hypothesis.id} className="flex items-center gap-2">
              <span className="w-5 text-xs font-semibold text-muted-foreground">
                #{entry.rank}
              </span>
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: agentConfig.color }}
              />
              <span className="flex-1 text-sm truncate">{entry.hypothesis.title}</span>
              <span className="text-sm font-semibold">
                {entry.hypothesis.currentScore.toFixed(1)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Exports
// ============================================================================

export { AGENT_CONFIG }
export default HypothesisRaceViewer
