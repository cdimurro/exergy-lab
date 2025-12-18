'use client'

/**
 * RecommendationsList Component
 *
 * Displays recovery recommendations grouped by priority.
 * Shows actionable suggestions for improving failed phases.
 */

import { cn } from '@/lib/utils'
import type { DiscoveryPhase } from '@/types/frontierscience'
import type { RecoveryRecommendation } from '@/lib/ai/rubrics/types'
import { getPhaseMetadata } from '@/types/frontierscience'
import {
  Lightbulb,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'

interface RecommendationsListProps {
  recommendations: RecoveryRecommendation[]
  onRetryPhase?: (phase: DiscoveryPhase) => void
  className?: string
  maxItems?: number
}

// Group recommendations by priority
function groupByPriority(recommendations: RecoveryRecommendation[]) {
  const groups: Record<string, RecoveryRecommendation[]> = {
    high: [],
    medium: [],
    low: [],
  }

  for (const rec of recommendations) {
    groups[rec.priority]?.push(rec)
  }

  return groups
}

export function RecommendationsList({
  recommendations,
  onRetryPhase,
  className,
  maxItems = 6,
}: RecommendationsListProps) {
  const grouped = groupByPriority(recommendations)
  const totalShown = Math.min(recommendations.length, maxItems)

  // Prioritize showing high > medium > low
  const itemsToShow: RecoveryRecommendation[] = []
  let remaining = maxItems

  for (const priority of ['high', 'medium', 'low'] as const) {
    const items = grouped[priority] || []
    const toTake = Math.min(items.length, remaining)
    itemsToShow.push(...items.slice(0, toTake))
    remaining -= toTake
    if (remaining <= 0) break
  }

  if (itemsToShow.length === 0) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)}>
        No specific recommendations available.
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* High Priority */}
      {grouped.high && grouped.high.length > 0 && (
        <PrioritySection
          priority="high"
          recommendations={grouped.high.slice(0, Math.min(grouped.high.length, maxItems))}
          onRetryPhase={onRetryPhase}
        />
      )}

      {/* Medium Priority */}
      {grouped.medium && grouped.medium.length > 0 && (
        <PrioritySection
          priority="medium"
          recommendations={grouped.medium.slice(0, Math.min(grouped.medium.length, maxItems - (grouped.high?.length || 0)))}
          onRetryPhase={onRetryPhase}
        />
      )}

      {/* Low Priority */}
      {grouped.low && grouped.low.length > 0 && (
        <PrioritySection
          priority="low"
          recommendations={grouped.low.slice(0, Math.min(grouped.low.length, maxItems - (grouped.high?.length || 0) - (grouped.medium?.length || 0)))}
          onRetryPhase={onRetryPhase}
        />
      )}

      {/* Show count if more items */}
      {recommendations.length > maxItems && (
        <div className="text-xs text-muted-foreground text-center pt-2">
          Showing {maxItems} of {recommendations.length} recommendations
        </div>
      )}
    </div>
  )
}

/**
 * Priority section with grouped recommendations
 */
interface PrioritySectionProps {
  priority: 'high' | 'medium' | 'low'
  recommendations: RecoveryRecommendation[]
  onRetryPhase?: (phase: DiscoveryPhase) => void
}

function PrioritySection({ priority, recommendations, onRetryPhase }: PrioritySectionProps) {
  if (recommendations.length === 0) return null

  const config = {
    high: {
      icon: AlertTriangle,
      label: 'High Priority',
      iconClass: 'text-red-500',
      labelClass: 'text-red-600',
      bgClass: 'bg-red-500/5',
      borderClass: 'border-red-500/20',
    },
    medium: {
      icon: AlertCircle,
      label: 'Medium Priority',
      iconClass: 'text-amber-500',
      labelClass: 'text-amber-600',
      bgClass: 'bg-amber-500/5',
      borderClass: 'border-amber-500/20',
    },
    low: {
      icon: Info,
      label: 'Low Priority',
      iconClass: 'text-blue-500',
      labelClass: 'text-blue-600',
      bgClass: 'bg-blue-500/5',
      borderClass: 'border-blue-500/20',
    },
  }[priority]

  const Icon = config.icon

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={config.iconClass} />
        <span className={cn('text-xs font-semibold uppercase tracking-wide', config.labelClass)}>
          {config.label}
        </span>
        <span className="text-xs text-muted-foreground">
          ({recommendations.length})
        </span>
      </div>
      <div className="space-y-2">
        {recommendations.map((rec, i) => (
          <RecommendationItem
            key={`${rec.phase}-${i}`}
            recommendation={rec}
            onRetryPhase={onRetryPhase}
            bgClass={config.bgClass}
            borderClass={config.borderClass}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Individual recommendation item
 */
interface RecommendationItemProps {
  recommendation: RecoveryRecommendation
  onRetryPhase?: (phase: DiscoveryPhase) => void
  bgClass?: string
  borderClass?: string
}

function RecommendationItem({
  recommendation,
  onRetryPhase,
  bgClass = 'bg-muted/50',
  borderClass = 'border-border',
}: RecommendationItemProps) {
  const phaseMeta = getPhaseMetadata(recommendation.phase)

  return (
    <div className={cn('p-3 rounded-lg border', bgClass, borderClass)}>
      <div className="flex items-start gap-2">
        <Lightbulb size={16} className="text-amber-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
              {phaseMeta?.shortName || recommendation.phase}
            </span>
            {recommendation.actionable && (
              <span className="text-xs text-emerald-600">Actionable</span>
            )}
          </div>
          <p className="text-sm font-medium text-foreground">
            {recommendation.issue}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {recommendation.suggestion}
          </p>
        </div>

        {/* Retry button */}
        {recommendation.actionable && onRetryPhase && (
          <button
            onClick={() => onRetryPhase(recommendation.phase)}
            className="shrink-0 p-2 rounded-md hover:bg-background transition-colors group"
            title={`Retry ${phaseMeta?.name || recommendation.phase}`}
          >
            <RefreshCw size={14} className="text-muted-foreground group-hover:text-foreground" />
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Compact recommendations display for inline use
 */
interface CompactRecommendationsProps {
  recommendations: RecoveryRecommendation[]
  className?: string
}

export function CompactRecommendations({
  recommendations,
  className,
}: CompactRecommendationsProps) {
  const highCount = recommendations.filter(r => r.priority === 'high').length
  const mediumCount = recommendations.filter(r => r.priority === 'medium').length

  return (
    <div className={cn('flex items-center gap-3 text-xs', className)}>
      {highCount > 0 && (
        <span className="flex items-center gap-1 text-red-600">
          <AlertTriangle size={12} />
          {highCount} high priority
        </span>
      )}
      {mediumCount > 0 && (
        <span className="flex items-center gap-1 text-amber-600">
          <AlertCircle size={12} />
          {mediumCount} medium
        </span>
      )}
      {recommendations.length > highCount + mediumCount && (
        <span className="text-muted-foreground">
          +{recommendations.length - highCount - mediumCount} more
        </span>
      )}
    </div>
  )
}

export default RecommendationsList
