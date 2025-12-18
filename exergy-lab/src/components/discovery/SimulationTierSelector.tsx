'use client'

/**
 * SimulationTierSelector Component
 *
 * Selector for 3-tier simulation system:
 * - Tier 1: Rapid Estimation (<30s, ML surrogates, ±20%)
 * - Tier 2: Classical Simulation (1-30 min, GCMC/MD, ±10%)
 * - Tier 3: Quantum/Advanced (30+ min, DFT/ML potentials, ±2%)
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Zap,
  Cpu,
  Atom,
  Sparkles,
  Clock,
  DollarSign,
  Target,
  ChevronDown,
  ChevronUp,
  Check,
  Cloud,
  Monitor,
  Server,
} from 'lucide-react'
import type { SimulationTierNumber } from '@/types/simulation-tiers'
import { SIMULATION_TIER_CONFIG, getSimulationTierConfig } from '@/types/simulation-tiers'

// ============================================================================
// Props
// ============================================================================

interface SimulationTierSelectorProps {
  value: SimulationTierNumber | 'auto'
  onChange: (tier: SimulationTierNumber | 'auto') => void
  showDetails?: boolean
  compact?: boolean
  disabled?: boolean
  className?: string
}

// ============================================================================
// Tier Icons
// ============================================================================

const TIER_ICONS: Record<SimulationTierNumber | 'auto', React.ReactNode> = {
  auto: <Sparkles className="w-4 h-4" />,
  1: <Zap className="w-4 h-4" />,
  2: <Cpu className="w-4 h-4" />,
  3: <Atom className="w-4 h-4" />,
}

const COMPUTE_ICONS: Record<string, React.ReactNode> = {
  browser: <Monitor className="w-3 h-3" />,
  server: <Server className="w-3 h-3" />,
  'cloud-gpu': <Cloud className="w-3 h-3" />,
}

const TIER_COLORS: Record<SimulationTierNumber | 'auto', { bg: string; border: string; text: string }> = {
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
  value: SimulationTierNumber | 'auto'
  onChange: (tier: SimulationTierNumber | 'auto') => void
  disabled?: boolean
}) {
  const options: (SimulationTierNumber | 'auto')[] = ['auto', 1, 2, 3]

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
  tier: SimulationTierNumber
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
  const config = getSimulationTierConfig(tier)
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
              <Badge variant="secondary" className="gap-1 text-xs">
                {COMPUTE_ICONS[config.computeLocation]}
                {config.computeLocation === 'browser' && 'Browser'}
                {config.computeLocation === 'server' && 'Server'}
                {config.computeLocation === 'cloud-gpu' && 'Cloud GPU'}
              </Badge>
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
            <Target className="w-3 h-3" />
            {config.accuracy}
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

          {/* Recommended For */}
          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Recommended For
            </span>
            <div className="mt-1 flex flex-wrap gap-1">
              {config.recommended.materialNovelty.map((novelty, i) => (
                <Badge key={i} variant="secondary" className="text-xs capitalize">
                  {novelty} materials
                </Badge>
              ))}
              {config.recommended.precisionRequired.map((precision, i) => (
                <Badge key={i} variant="secondary" className="text-xs capitalize">
                  {precision}
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

export function SimulationTierSelector({
  value,
  onChange,
  showDetails = false,
  compact = false,
  disabled = false,
  className,
}: SimulationTierSelectorProps) {
  const [expandedTier, setExpandedTier] = React.useState<SimulationTierNumber | null>(null)

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
              Start with Tier 1 and escalate based on confidence and precision requirements
            </span>
          </div>
        </div>
      </div>

      {/* Tier Cards */}
      {([1, 2, 3] as SimulationTierNumber[]).map((tier) => (
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

interface SimulationTierBadgeProps {
  tier: SimulationTierNumber | 'auto'
  showLabel?: boolean
  showAccuracy?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function SimulationTierBadge({
  tier,
  showLabel = true,
  showAccuracy = false,
  size = 'md',
  className,
}: SimulationTierBadgeProps) {
  const colors = TIER_COLORS[tier]
  const label = tier === 'auto' ? 'Auto' : `Tier ${tier}`
  const config = tier !== 'auto' ? getSimulationTierConfig(tier) : null

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
      {showAccuracy && config && (
        <span className="opacity-75">{config.accuracy}</span>
      )}
    </div>
  )
}

// ============================================================================
// Escalation Banner
// ============================================================================

interface TierEscalationBannerProps {
  currentTier: SimulationTierNumber
  suggestedTier: SimulationTierNumber
  reason: string
  additionalCost?: number
  additionalTime?: string
  onAccept: () => void
  onDecline: () => void
  className?: string
}

export function TierEscalationBanner({
  currentTier,
  suggestedTier,
  reason,
  additionalCost,
  additionalTime,
  onAccept,
  onDecline,
  className,
}: TierEscalationBannerProps) {
  const suggestedConfig = getSimulationTierConfig(suggestedTier)
  const colors = TIER_COLORS[suggestedTier]

  return (
    <div
      className={cn(
        'rounded-lg border-2 p-4',
        colors.border,
        colors.bg,
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className={cn('w-4 h-4', colors.text)} />
            <span className="font-semibold text-foreground">
              Escalation Available
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {reason}
          </p>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5">
              <SimulationTierBadge tier={currentTier} size="sm" />
              <span className="text-muted-foreground">→</span>
              <SimulationTierBadge tier={suggestedTier} size="sm" />
            </div>
            {additionalCost !== undefined && additionalCost > 0 && (
              <Badge variant="secondary" className="gap-1">
                <DollarSign className="w-3 h-3" />
                +${additionalCost.toFixed(2)}
              </Badge>
            )}
            {additionalTime && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="w-3 h-3" />
                +{additionalTime}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onDecline}
            className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Keep Tier {currentTier}
          </button>
          <button
            onClick={onAccept}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            Upgrade to {suggestedConfig.displayName}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SimulationTierSelector
