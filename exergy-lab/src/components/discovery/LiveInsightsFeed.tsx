'use client'

/**
 * LiveInsightsFeed Component
 *
 * Real-time streaming display of discovery insights as they're found.
 * Shows sources, findings, gaps, and cross-domain insights progressively.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  FileText,
  Lightbulb,
  AlertTriangle,
  Zap,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// ============================================================================
// Types
// ============================================================================

export type InsightType = 'source' | 'finding' | 'gap' | 'cross-domain' | 'candidate'

export interface InsightItem {
  id: string
  type: InsightType
  timestamp: Date
  title: string
  description?: string
  confidence?: number
  relevance?: number
  metadata?: {
    source?: string
    category?: string
    impact?: 'high' | 'medium' | 'low'
    url?: string
    authors?: string[]
    year?: number
    domain?: string
  }
}

interface LiveInsightsFeedProps {
  /** Insights to display */
  insights: InsightItem[]
  /** Whether discovery is still running */
  isLoading?: boolean
  /** Maximum insights to show before collapsing */
  maxVisible?: number
  /** Whether to auto-scroll to new insights */
  autoScroll?: boolean
  /** Filter by insight type */
  filterType?: InsightType | 'all'
  /** Compact mode for smaller spaces */
  compact?: boolean
  /** Additional CSS classes */
  className?: string
}

// ============================================================================
// Icon and Color Mapping
// ============================================================================

const insightConfig: Record<InsightType, {
  icon: React.ElementType
  label: string
  bgColor: string
  textColor: string
  borderColor: string
}> = {
  source: {
    icon: FileText,
    label: 'Source',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-500/20',
  },
  finding: {
    icon: Lightbulb,
    label: 'Finding',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-600',
    borderColor: 'border-amber-500/20',
  },
  gap: {
    icon: AlertTriangle,
    label: 'Gap',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-600',
    borderColor: 'border-purple-500/20',
  },
  'cross-domain': {
    icon: Zap,
    label: 'Cross-Domain',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-600',
    borderColor: 'border-emerald-500/20',
  },
  candidate: {
    icon: CheckCircle,
    label: 'Candidate',
    bgColor: 'bg-cyan-500/10',
    textColor: 'text-cyan-600',
    borderColor: 'border-cyan-500/20',
  },
}

// ============================================================================
// Main Component
// ============================================================================

export function LiveInsightsFeed({
  insights,
  isLoading = false,
  maxVisible = 10,
  autoScroll = true,
  filterType = 'all',
  compact = false,
  className,
}: LiveInsightsFeedProps) {
  const feedRef = React.useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = React.useState(false)

  // Filter insights by type
  const filteredInsights = React.useMemo(() => {
    if (filterType === 'all') return insights
    return insights.filter(i => i.type === filterType)
  }, [insights, filterType])

  // Auto-scroll to latest insight
  React.useEffect(() => {
    if (autoScroll && feedRef.current && insights.length > 0) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [insights, autoScroll])

  // Determine visible insights
  const visibleInsights = expanded
    ? filteredInsights
    : filteredInsights.slice(-maxVisible)

  const hiddenCount = filteredInsights.length - maxVisible

  // Count by type
  const typeCounts = React.useMemo(() => {
    const counts: Record<InsightType, number> = {
      source: 0,
      finding: 0,
      gap: 0,
      'cross-domain': 0,
      candidate: 0,
    }
    filteredInsights.forEach(i => counts[i.type]++)
    return counts
  }, [filteredInsights])

  if (filteredInsights.length === 0 && !isLoading) {
    return (
      <div className={cn(
        'flex items-center justify-center p-6 text-muted-foreground',
        className
      )}>
        <p className="text-sm">No insights discovered yet</p>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header with counts */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            Live Insights
          </span>
          {isLoading && (
            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {Object.entries(typeCounts).map(([type, count]) => {
            if (count === 0) return null
            const config = insightConfig[type as InsightType]
            return (
              <span key={type} className="flex items-center gap-1">
                <span className={cn('w-2 h-2 rounded-full', config.bgColor)} />
                {count}
              </span>
            )
          })}
        </div>
      </div>

      {/* Show more button */}
      {hiddenCount > 0 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <ChevronUp className="w-3 h-3" />
          Show {hiddenCount} more insights
        </button>
      )}

      {/* Insights feed */}
      <div
        ref={feedRef}
        className={cn(
          'overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent',
          compact ? 'max-h-48' : 'max-h-96'
        )}
      >
        <div className="space-y-2 p-3">
          {visibleInsights.map((insight, index) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              compact={compact}
              isNew={index === visibleInsights.length - 1 && isLoading}
            />
          ))}
        </div>
      </div>

      {/* Collapse button */}
      {expanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(false)}
          className="flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-t border-border"
        >
          <ChevronDown className="w-3 h-3" />
          Show less
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Insight Card Component
// ============================================================================

interface InsightCardProps {
  insight: InsightItem
  compact?: boolean
  isNew?: boolean
}

function InsightCard({ insight, compact = false, isNew = false }: InsightCardProps) {
  const config = insightConfig[insight.type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'rounded-lg border transition-all duration-300',
        config.borderColor,
        config.bgColor,
        isNew && 'animate-in fade-in slide-in-from-bottom-2 duration-300',
        compact ? 'p-2' : 'p-3'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn(
          'flex items-center justify-center shrink-0 rounded-md',
          compact ? 'w-6 h-6' : 'w-8 h-8',
          config.bgColor
        )}>
          <Icon className={cn(
            config.textColor,
            compact ? 'w-3 h-3' : 'w-4 h-4'
          )} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-xs font-medium px-1.5 py-0.5 rounded',
              config.bgColor,
              config.textColor
            )}>
              {config.label}
            </span>
            {insight.confidence && (
              <span className="text-xs text-muted-foreground">
                {Math.round(insight.confidence * 100)}% conf
              </span>
            )}
            {insight.metadata?.impact && (
              <ImpactBadge impact={insight.metadata.impact} />
            )}
          </div>

          <h4 className={cn(
            'font-medium text-foreground mt-1',
            compact ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2'
          )}>
            {insight.title}
          </h4>

          {!compact && insight.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {insight.description}
            </p>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {insight.metadata?.source && (
              <span className="truncate max-w-[150px]">
                {insight.metadata.source}
              </span>
            )}
            {insight.metadata?.year && (
              <span>{insight.metadata.year}</span>
            )}
            {insight.metadata?.url && (
              <a
                href={insight.metadata.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 hover:text-foreground transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <span className="text-muted-foreground/60">
              <Clock className="w-3 h-3 inline mr-0.5" />
              {formatTime(insight.timestamp)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Helper Components
// ============================================================================

function ImpactBadge({ impact }: { impact: 'high' | 'medium' | 'low' }) {
  const colors = {
    high: 'bg-red-500/10 text-red-600',
    medium: 'bg-amber-500/10 text-amber-600',
    low: 'bg-slate-500/10 text-slate-600',
  }

  return (
    <span className={cn(
      'text-[10px] font-medium px-1.5 py-0.5 rounded uppercase',
      colors[impact]
    )}>
      {impact}
    </span>
  )
}

function formatTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 1000) return 'now'
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ============================================================================
// Filter Bar Component
// ============================================================================

interface InsightFilterBarProps {
  selectedType: InsightType | 'all'
  onTypeChange: (type: InsightType | 'all') => void
  counts: Record<InsightType, number>
  className?: string
}

export function InsightFilterBar({
  selectedType,
  onTypeChange,
  counts,
  className,
}: InsightFilterBarProps) {
  const types: Array<InsightType | 'all'> = ['all', 'source', 'finding', 'gap', 'cross-domain', 'candidate']

  return (
    <div className={cn('flex items-center gap-1 overflow-x-auto', className)}>
      {types.map(type => {
        const isAll = type === 'all'
        const config = isAll ? null : insightConfig[type]
        const count = isAll ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[type]
        const isSelected = selectedType === type

        return (
          <button
            key={type}
            onClick={() => onTypeChange(type)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
              isSelected
                ? 'bg-foreground text-background'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {config && <config.icon className="w-3 h-3" />}
            <span>{isAll ? 'All' : config?.label}</span>
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[10px]',
              isSelected ? 'bg-background/20' : 'bg-muted'
            )}>
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default LiveInsightsFeed
