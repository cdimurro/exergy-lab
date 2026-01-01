'use client'

/**
 * TierSelector Component
 *
 * Enhanced tier selection with detailed descriptions to help users choose.
 */

import { Zap, Cpu, Server, Check, Clock, DollarSign } from 'lucide-react'
import { Badge } from '@/components/ui'
import type { SimulationTier } from '@/types/simulation'
import { TIER_INFO } from '@/types/simulation-workflow'

const TIER_ICONS: Record<SimulationTier, typeof Zap> = {
  local: Zap,
  browser: Cpu,
  cloud: Server,
}

const TIER_COLORS: Record<SimulationTier, { bg: string; border: string; text: string; icon: string }> = {
  local: {
    bg: 'bg-primary/10',
    border: 'border-primary/40',
    text: 'text-primary',
    icon: 'text-primary',
  },
  browser: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/40',
    text: 'text-purple-400',
    icon: 'text-purple-400',
  },
  cloud: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/40',
    text: 'text-amber-400',
    icon: 'text-amber-400',
  },
}

export interface TierSelectorProps {
  selectedTier: SimulationTier
  onTierSelect: (tier: SimulationTier) => void
}

export function TierSelector({ selectedTier, onTierSelect }: TierSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Select Computational Tier</h3>
          <p className="text-sm text-muted mt-1">
            Choose the right balance of speed, cost, and accuracy for your analysis
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TIER_INFO.map((tierInfo) => {
          const Icon = TIER_ICONS[tierInfo.tier]
          const colors = TIER_COLORS[tierInfo.tier]
          const isSelected = selectedTier === tierInfo.tier

          return (
            <button
              key={tierInfo.tier}
              onClick={() => onTierSelect(tierInfo.tier)}
              className={`
                relative p-5 rounded-xl border-2 text-left transition-all
                ${
                  isSelected
                    ? `${colors.border} ${colors.bg} shadow-md`
                    : 'border-border bg-card-dark hover:border-primary/30'
                }
              `}
            >
              {/* Selected Checkmark */}
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <div className={`p-1 rounded-full ${colors.bg}`}>
                    <Check className={`w-4 h-4 ${colors.icon}`} />
                  </div>
                </div>
              )}

              {/* Header: Icon + Labels */}
              <div className="flex items-start gap-3 mb-3">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                    isSelected ? colors.bg : 'bg-page-background'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isSelected ? colors.icon : 'text-muted'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold ${isSelected ? colors.text : 'text-muted'}`}>
                      {tierInfo.shortLabel}
                    </span>
                    <Badge
                      variant={tierInfo.badge === 'FREE' ? 'success' : 'secondary'}
                      size="sm"
                    >
                      {tierInfo.badge}
                    </Badge>
                  </div>
                  <h4 className={`font-semibold text-base ${isSelected ? colors.text : 'text-foreground'}`}>
                    {tierInfo.label}
                  </h4>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-muted mb-3">
                {tierInfo.description}
              </p>

              {/* Best For */}
              <div className="mb-3">
                <p className="text-xs font-medium text-muted mb-1">Best for:</p>
                <ul className="text-xs text-muted space-y-0.5">
                  {tierInfo.bestFor.slice(0, 3).map((item, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-primary">-</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 pt-3 border-t border-border">
                <div className="flex items-center gap-1 text-xs text-muted">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{tierInfo.duration}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span className={tierInfo.cost === '$0' ? 'text-primary font-medium' : ''}>
                    {tierInfo.cost}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Help Text */}
      <div className="p-3 rounded-lg bg-card-dark border border-border">
        <p className="text-xs text-muted">
          <strong className="text-foreground">Choosing a tier:</strong> Start with{' '}
          <span className="text-primary">T1</span> for quick feasibility checks.
          Use <span className="text-purple-400">T2</span> for uncertainty analysis and protocols.
          Choose <span className="text-amber-400">T3</span> for publication-grade validation.
        </p>
      </div>
    </div>
  )
}

export default TierSelector
