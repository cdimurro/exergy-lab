'use client'

/**
 * SampleSimulations Component
 *
 * Displays pre-configured simulation examples that users can click to auto-fill and run
 */

import { useState } from 'react'
import { Flame, Sun, Wind, Droplets, Play, Info, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SAMPLE_SIMULATIONS, type SampleSimulation } from '@/data/sample-simulations'

const ICON_MAP = {
  Flame,
  Sun,
  Wind,
  Droplets,
}

const CATEGORY_COLORS = {
  beginner: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' },
  intermediate: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  advanced: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
}

export interface SampleSimulationsProps {
  onSelectSample: (sample: SampleSimulation) => void
}

export function SampleSimulations({ onSelectSample }: SampleSimulationsProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Quick Start Examples</h2>
          <p className="text-sm text-muted mt-1">
            Click any example to auto-fill parameters and run immediately
          </p>
        </div>
        <Sparkles className="w-5 h-5 text-primary" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {SAMPLE_SIMULATIONS.map((sample) => {
          const Icon = ICON_MAP[sample.icon as keyof typeof ICON_MAP] || Flame
          const categoryColors = CATEGORY_COLORS[sample.category]
          const isSelected = selectedId === sample.id

          return (
            <Card
              key={sample.id}
              className={`
                p-4 cursor-pointer transition-all hover:shadow-lg
                ${isSelected ? 'ring-2 ring-primary' : ''}
              `}
              onClick={() => {
                setSelectedId(sample.id)
                onSelectSample(sample)
              }}
            >
              {/* Icon & Title */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground mb-1 line-clamp-2">
                    {sample.title}
                  </h3>
                  <Badge variant="secondary" size="sm">
                    {sample.tier.toUpperCase()}
                  </Badge>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-muted mb-3 line-clamp-2">
                {sample.description}
              </p>

              {/* Expected Outputs Preview */}
              <div className="space-y-1 mb-3">
                {sample.expectedOutputs.slice(0, 2).map((output, i) => (
                  <div key={i} className="text-xs text-muted flex items-start gap-1">
                    <span className="text-primary">•</span>
                    <span className="line-clamp-1">{output}</span>
                  </div>
                ))}
                {sample.expectedOutputs.length > 2 && (
                  <div className="text-xs text-muted">
                    +{sample.expectedOutputs.length - 2} more
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className={`text-xs px-2 py-0.5 rounded ${categoryColors.bg} ${categoryColors.text}`}>
                  {sample.category}
                </div>
                <div className="text-xs text-muted">
                  {sample.expectedDuration}
                </div>
              </div>

              {/* Run Button (appears on hover/selected) */}
              {isSelected && (
                <Button size="sm" className="w-full mt-3">
                  <Play className="w-3 h-3 mr-1" />
                  Run This Example
                </Button>
              )}
            </Card>
          )
        })}
      </div>

      {/* Help Text */}
      <div className="p-4 rounded-lg bg-elevated border border-border">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-xs text-muted">
            <strong className="text-foreground">New to simulations?</strong> Start with the Beginner examples (Tier 1).
            These run locally in under a minute and give you immediate feedback on feasibility.
          </div>
        </div>
      </div>
    </div>
  )
}
