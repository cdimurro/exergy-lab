'use client'

/**
 * ExperimentTierSelector Component
 *
 * Selector for 3-tier experiment design system:
 * - Tier 1: Rapid Feasibility (<1 min)
 * - Tier 2: Standard Lab Protocol (5-30 min)
 * - Tier 3: Advanced Validation (30+ min)
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Zap,
  FlaskConical,
  GraduationCap,
  Sparkles,
  Clock,
  DollarSign,
  Target,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react'
import type { ExperimentTier } from '@/types/experiment-tiers'
import { EXPERIMENT_TIER_CONFIG, getExperimentTierConfig } from '@/types/experiment-tiers'

// ============================================================================
// Props
// ============================================================================

interface ExperimentTierSelectorProps {
  value: ExperimentTier | 'auto'
  onChange: (tier: ExperimentTier | 'auto') => void
  showDetails?: boolean
  compact?: boolean
  disabled?: boolean
  className?: string
}

// ============================================================================
// Tier Icons
// ============================================================================

const TIER_ICONS: Record<ExperimentTier | 'auto', React.ReactNode> = {
  auto: <Sparkles className="w-4 h-4" />,
  1: <Zap className="w-4 h-4" />,
  2: <FlaskConical className="w-4 h-4" />,
  3: <GraduationCap className="w-4 h-4" />,
}

const TIER_COLORS: Record<ExperimentTier | 'auto', { bg: string; border: string; text: string }> = {
  auto: {
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    text: 'text-violet-600',
  },
  1: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-600',
  },
  2: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-600',
  },
  3: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-600',
  },
}

// ============================================================================
// Compact Selector
// ============================================================================

function CompactSelector({
  value,
  onChange,
  disabled,
}: {
  value: ExperimentTier | 'auto'
  onChange: (tier: ExperimentTier | 'auto') => void
  disabled?: boolean
}) {
  const options: (ExperimentTier | 'auto')[] = ['auto', 1, 2, 3]

  return (
    <div className="flex rounded-lg border border-border overflow-hidden">
      {options.map((tier) => {
        const isSelected = value === tier
        const colors = TIER_COLORS[tier]
        const label = tier === 'auto' ? 'Auto' : `Tier ${tier}`

        return (
          <button
            key={tier}
            onClick={() => onChange(tier)}
            disabled={disabled}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors',
              'border-r border-border last:border-r-0',
              isSelected
                ? cn(colors.bg, colors.text)
                : 'bg-muted/30 text-muted-foreground hover:bg-muted/50',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {TIER_ICONS[tier]}
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ============================================================================
// Detailed Card
// ============================================================================

interface TierCardProps {
  tier: ExperimentTier
  isSelected: boolean
  onSelect: () => void
  disabled?: boolean
  expanded?: boolean
  onToggleExpand?: () => void
}

function TierCard({
  tier,
  isSelected,
  onSelect,
  disabled,
  expanded,
  onToggleExpand,
}: TierCardProps) {
  const config = getExperimentTierConfig(tier)
  const colors = TIER_COLORS[tier]

  return (
    <div
      className={cn(
        'rounded-lg border-2 transition-all cursor-pointer',
        isSelected
          ? cn(colors.border, colors.bg, 'shadow-sm')
          : 'border-border hover:border-border-subtle',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* Header */}
      <button
        onClick={onSelect}
        disabled={disabled}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              isSelected ? colors.bg : 'bg-muted/50'
            )}
          >
            <span className={isSelected ? colors.text : 'text-muted-foreground'}>
              {TIER_ICONS[tier]}
            </span>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">
                {config.displayName}
              </span>
              {isSelected && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {config.description}
            </span>
          </div>
        </div>

        {/* Meta badges */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Clock className="w-3 h-3" />
            {config.timeEstimate}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <DollarSign className="w-3 h-3" />
            {config.costEstimate}
          </Badge>
          {onToggleExpand && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpand()
              }}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border/50 space-y-3">
          {/* Capabilities */}
          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Capabilities
            </span>
            <ul className="mt-1 space-y-1">
              {config.capabilities.slice(0, 4).map((cap, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{cap}</span>
                </li>
              ))}
              {config.capabilities.length > 4 && (
                <li className="text-sm text-muted-foreground">
                  +{config.capabilities.length - 4} more...
                </li>
              )}
            </ul>
          </div>

          {/* Limitations */}
          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Limitations
            </span>
            <ul className="mt-1 space-y-1">
              {config.limitations.slice(0, 2).map((lim, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="w-4 text-center">•</span>
                  <span>{lim}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Output Types */}
          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Outputs
            </span>
            <div className="mt-1 flex flex-wrap gap-1">
              {config.outputTypes.map((output, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {output.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function ExperimentTierSelector({
  value,
  onChange,
  showDetails = false,
  compact = false,
  disabled = false,
  className,
}: ExperimentTierSelectorProps) {
  const [expandedTier, setExpandedTier] = React.useState<ExperimentTier | null>(null)

  if (compact) {
    return (
      <div className={className}>
        <CompactSelector value={value} onChange={onChange} disabled={disabled} />
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Auto Option */}
      <div
        className={cn(
          'rounded-lg border-2 p-4 transition-all cursor-pointer',
          value === 'auto'
            ? cn(TIER_COLORS.auto.border, TIER_COLORS.auto.bg, 'shadow-sm')
            : 'border-border hover:border-border-subtle',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={() => !disabled && onChange('auto')}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              value === 'auto' ? TIER_COLORS.auto.bg : 'bg-muted/50'
            )}
          >
            <Sparkles
              className={cn(
                'w-5 h-5',
                value === 'auto' ? TIER_COLORS.auto.text : 'text-muted-foreground'
              )}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">Auto-Select</span>
              {value === 'auto' && <Check className="w-4 h-4 text-primary" />}
            </div>
            <span className="text-sm text-muted-foreground">
              Automatically choose tier based on hypothesis complexity and target quality
            </span>
          </div>
        </div>
      </div>

      {/* Tier Cards */}
      {([1, 2, 3] as ExperimentTier[]).map((tier) => (
        <TierCard
          key={tier}
          tier={tier}
          isSelected={value === tier}
          onSelect={() => onChange(tier)}
          disabled={disabled}
          expanded={showDetails || expandedTier === tier}
          onToggleExpand={showDetails ? undefined : () => setExpandedTier(
            expandedTier === tier ? null : tier
          )}
        />
      ))}
    </div>
  )
}

// ============================================================================
// Tier Badge Component
// ============================================================================

interface ExperimentTierBadgeProps {
  tier: ExperimentTier | 'auto'
  showLabel?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function ExperimentTierBadge({
  tier,
  showLabel = true,
  size = 'md',
  className,
}: ExperimentTierBadgeProps) {
  const colors = TIER_COLORS[tier]
  const label = tier === 'auto' ? 'Auto' : `Tier ${tier}`
  const config = tier !== 'auto' ? getExperimentTierConfig(tier) : null

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md font-medium',
        colors.bg,
        colors.text,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        className
      )}
    >
      {TIER_ICONS[tier]}
      {showLabel && (
        <span>{config ? config.displayName : label}</span>
      )}
    </div>
  )
}

export default ExperimentTierSelector
