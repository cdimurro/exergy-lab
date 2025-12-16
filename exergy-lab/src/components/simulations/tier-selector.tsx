'use client'

import * as React from 'react'
import { Zap, Brain, Server, Check, DollarSign, Clock, Target } from 'lucide-react'
import { Card, Badge } from '@/components/ui'
import type { SimulationTier, TierCapabilities } from '@/types/simulation'

const TIER_ICONS = {
  local: Zap,
  browser: Brain,
  cloud: Server,
}

const TIER_COLORS = {
  local: {
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    text: 'text-primary',
    icon: 'text-primary',
  },
  browser: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    icon: 'text-purple-600',
  },
  cloud: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    icon: 'text-amber-600',
  },
}

export interface TierSelectorProps {
  selectedTier: SimulationTier
  onTierSelect: (tier: SimulationTier) => void
  tiers: TierCapabilities[]
  recommendation?: SimulationTier
}

export function TierSelector({
  selectedTier,
  onTierSelect,
  tiers,
  recommendation,
}: TierSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Select Computational Tier</h3>
        {recommendation && (
          <Badge variant="primary" size="sm">
            Recommended: {tiers.find((t) => t.tier === recommendation)?.name}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map((tier) => {
          const Icon = TIER_ICONS[tier.tier]
          const colors = TIER_COLORS[tier.tier]
          const isSelected = selectedTier === tier.tier
          const isRecommended = recommendation === tier.tier

          return (
            <button
              key={tier.tier}
              onClick={() => onTierSelect(tier.tier)}
              className={`
                relative p-5 rounded-xl border-2 text-left transition-all
                ${
                  isSelected
                    ? `${colors.border} ${colors.bg} shadow-md scale-105`
                    : 'border-border bg-card-dark hover:border-primary/30'
                }
              `}
            >
              {/* Recommended Badge */}
              {isRecommended && !isSelected && (
                <div className="absolute -top-2 -right-2">
                  <Badge variant="primary" size="sm">
                    Recommended
                  </Badge>
                </div>
              )}

              {/* Selected Checkmark */}
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <div className={`p-1 rounded-full ${colors.bg}`}>
                    <Check className={`w-4 h-4 ${colors.icon}`} />
                  </div>
                </div>
              )}

              {/* Icon */}
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-lg mb-3 ${
                  isSelected ? colors.bg : 'bg-page-background'
                }`}
              >
                <Icon className={`w-6 h-6 ${isSelected ? colors.icon : 'text-white'}`} />
              </div>

              {/* Title */}
              <h4
                className={`font-semibold mb-1 ${isSelected ? colors.text : 'text-white'}`}
              >
                {tier.name}
              </h4>

              {/* Description */}
              <p className="text-xs text-foreground-subtle mb-3">{tier.description}</p>

              {/* Stats */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="w-3.5 h-3.5 text-foreground-subtle" />
                  <span className="text-foreground-subtle">{tier.estimatedTime}</span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <Target className="w-3.5 h-3.5 text-foreground-subtle" />
                  <span className="text-foreground-subtle">Accuracy: {tier.accuracy}</span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <DollarSign className="w-3.5 h-3.5 text-foreground-subtle" />
                  <span
                    className={`font-medium ${tier.cost === 'FREE' ? 'text-primary' : 'text-foreground-subtle'}`}
                  >
                    {tier.cost}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Comparison Note */}
      <div className="p-4 rounded-lg bg-card-dark border border-border">
        <p className="text-xs text-foreground-subtle">
          <strong className="text-white">💡 Choosing a tier:</strong> Local is fastest for
          quick estimates. Browser AI provides better accuracy with ML predictions. Cloud GPU
          delivers production-grade results for critical applications.
        </p>
      </div>
    </div>
  )
}
