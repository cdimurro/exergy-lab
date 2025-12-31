'use client'

import * as React from 'react'
import { useMemo } from 'react'
import { Zap, TrendingUp, TrendingDown, AlertTriangle, Info, Leaf } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface ExergyComponent {
  name: string
  value: number
  unit: string
  type: 'input' | 'useful' | 'destruction' | 'loss'
  percentage?: number
  description?: string
}

export interface ExergyAnalysisData {
  inputExergy: number
  usefulExergy: number
  exergyDestruction: number
  exergyLoss: number
  exergyEfficiency: number
  components: ExergyComponent[]
  majorLosses: string[]
  improvementPotential: number
  fossilFuelEquivalent?: {
    avoided: number
    unit: string
    comparedTo: string
  }
}

interface ExergyBreakdownProps {
  data: ExergyAnalysisData
  domain?: string
  showRecommendations?: boolean
  className?: string
}

// ============================================================================
// Color utilities
// ============================================================================

const TYPE_COLORS: Record<ExergyComponent['type'], { bg: string; text: string; border: string }> = {
  input: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500' },
  useful: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500' },
  destruction: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500' },
  loss: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500' },
}

// ============================================================================
// Component
// ============================================================================

export function ExergyBreakdown({
  data,
  domain = 'general',
  showRecommendations = true,
  className = '',
}: ExergyBreakdownProps) {
  // Calculate percentages
  const percentages = useMemo(() => {
    const total = data.inputExergy
    return {
      useful: (data.usefulExergy / total) * 100,
      destruction: (data.exergyDestruction / total) * 100,
      loss: (data.exergyLoss / total) * 100,
    }
  }, [data])

  // Applied Exergy Leverage calculation
  const ael = useMemo(() => {
    // AEL = (Useful Output Energy) / (Fossil Fuel Energy Avoided)
    // For clean energy, this represents efficiency gains
    return data.exergyEfficiency > 0 ? 100 / (100 - data.exergyEfficiency) : 1
  }, [data.exergyEfficiency])

  // Energy Quality Factor (simplified)
  const energyQualityFactor = useMemo(() => {
    // Higher exergy efficiency = higher quality energy conversion
    return Math.min(1, data.exergyEfficiency / 100 * 1.2)
  }, [data.exergyEfficiency])

  // Efficiency rating
  const efficiencyRating = useMemo(() => {
    if (data.exergyEfficiency >= 80) return { label: 'Excellent', color: 'text-emerald-400' }
    if (data.exergyEfficiency >= 60) return { label: 'Good', color: 'text-blue-400' }
    if (data.exergyEfficiency >= 40) return { label: 'Moderate', color: 'text-amber-400' }
    return { label: 'Low', color: 'text-red-400' }
  }, [data.exergyEfficiency])

  // Generate recommendations based on analysis
  const recommendations = useMemo(() => {
    const recs: string[] = []

    if (data.exergyDestruction > data.inputExergy * 0.3) {
      recs.push('High exergy destruction indicates irreversibility. Consider process optimization.')
    }

    if (data.exergyLoss > data.inputExergy * 0.1) {
      recs.push('Significant exergy losses detected. Heat recovery systems may improve efficiency.')
    }

    if (data.improvementPotential > 20) {
      recs.push(`${data.improvementPotential.toFixed(1)}% improvement potential exists through process optimization.`)
    }

    // Domain-specific recommendations
    switch (domain) {
      case 'solar':
        if (data.exergyEfficiency < 25) {
          recs.push('Consider advanced cell architectures (tandem, HJT) to approach thermodynamic limits.')
        }
        break
      case 'wind':
        if (data.exergyEfficiency < 45) {
          recs.push('Blade design optimization could improve extraction efficiency toward Betz limit.')
        }
        break
      case 'battery':
        if (data.exergyDestruction > 10) {
          recs.push('Internal resistance causes significant losses. Consider electrode optimization.')
        }
        break
      case 'hydrogen':
        if (data.exergyEfficiency < 70) {
          recs.push('Overpotential losses are significant. Improved catalysts may help.')
        }
        break
    }

    return recs
  }, [data, domain])

  return (
    <div className={`bg-zinc-800 rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-emerald-500" />
          <h3 className="text-sm font-medium text-white">Exergy Analysis</h3>
        </div>
        <span className={`text-sm font-medium ${efficiencyRating.color}`}>
          {efficiencyRating.label}
        </span>
      </div>

      <div className="p-4 space-y-6">
        {/* Main Efficiency Display */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-zinc-900 border-4 border-emerald-500">
            <div>
              <div className="text-3xl font-bold text-white">
                {data.exergyEfficiency.toFixed(1)}%
              </div>
              <div className="text-xs text-zinc-400">Exergy Efficiency</div>
            </div>
          </div>
        </div>

        {/* Sankey-style Breakdown Bar */}
        <div className="space-y-2">
          <div className="flex text-xs text-zinc-400 mb-1">
            <span>Exergy Flow Distribution</span>
          </div>
          <div className="h-8 rounded-lg overflow-hidden flex">
            <div
              className="bg-emerald-500 flex items-center justify-center text-xs font-medium text-white"
              style={{ width: `${percentages.useful}%` }}
              title={`Useful: ${percentages.useful.toFixed(1)}%`}
            >
              {percentages.useful > 15 && `${percentages.useful.toFixed(0)}%`}
            </div>
            <div
              className="bg-red-500 flex items-center justify-center text-xs font-medium text-white"
              style={{ width: `${percentages.destruction}%` }}
              title={`Destruction: ${percentages.destruction.toFixed(1)}%`}
            >
              {percentages.destruction > 15 && `${percentages.destruction.toFixed(0)}%`}
            </div>
            <div
              className="bg-amber-500 flex items-center justify-center text-xs font-medium text-white"
              style={{ width: `${percentages.loss}%` }}
              title={`Losses: ${percentages.loss.toFixed(1)}%`}
            >
              {percentages.loss > 15 && `${percentages.loss.toFixed(0)}%`}
            </div>
          </div>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-zinc-400">Useful</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-zinc-400">Destruction</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span className="text-zinc-400">Losses</span>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-zinc-900 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
              <TrendingUp className="w-3 h-3" />
              Applied Exergy Leverage
            </div>
            <div className="text-xl font-bold text-emerald-400">{ael.toFixed(2)}</div>
          </div>

          <div className="p-3 bg-zinc-900 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
              <Zap className="w-3 h-3" />
              Energy Quality Factor
            </div>
            <div className="text-xl font-bold text-blue-400">{energyQualityFactor.toFixed(2)}</div>
          </div>

          <div className="p-3 bg-zinc-900 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
              <TrendingDown className="w-3 h-3" />
              Exergy Destruction
            </div>
            <div className="text-xl font-bold text-red-400">
              {data.exergyDestruction.toFixed(2)}
              <span className="text-sm font-normal text-zinc-500 ml-1">
                {percentages.destruction.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="p-3 bg-zinc-900 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
              <TrendingUp className="w-3 h-3" />
              Improvement Potential
            </div>
            <div className="text-xl font-bold text-amber-400">
              {data.improvementPotential.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Component Breakdown */}
        {data.components.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-zinc-300 mb-3">Component Breakdown</h4>
            <div className="space-y-2">
              {data.components.map((component, index) => {
                const colors = TYPE_COLORS[component.type]
                const width = component.percentage ?? (component.value / data.inputExergy) * 100

                return (
                  <div key={index} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-zinc-300">{component.name}</span>
                      <span className={`text-sm font-mono ${colors.text}`}>
                        {component.value.toFixed(2)} {component.unit}
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors.bg} ${colors.border} border-l-2 transition-all`}
                        style={{ width: `${Math.min(100, width)}%` }}
                      />
                    </div>
                    {component.description && (
                      <p className="text-xs text-zinc-500 mt-1 hidden group-hover:block">
                        {component.description}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Major Losses */}
        {data.majorLosses.length > 0 && (
          <div className="p-3 bg-amber-900/20 border border-amber-800 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-400 mb-2">
              <AlertTriangle className="w-4 h-4" />
              Major Loss Sources
            </div>
            <ul className="space-y-1">
              {data.majorLosses.map((loss, index) => (
                <li key={index} className="text-sm text-zinc-300 flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  {loss}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Fossil Fuel Comparison */}
        {data.fossilFuelEquivalent && (
          <div className="p-3 bg-emerald-900/20 border border-emerald-800 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-400 mb-1">
              <Leaf className="w-4 h-4" />
              Environmental Impact
            </div>
            <p className="text-sm text-zinc-300">
              Equivalent to avoiding{' '}
              <span className="font-bold text-emerald-400">
                {data.fossilFuelEquivalent.avoided.toFixed(2)} {data.fossilFuelEquivalent.unit}
              </span>{' '}
              from {data.fossilFuelEquivalent.comparedTo}.
            </p>
          </div>
        )}

        {/* Recommendations */}
        {showRecommendations && recommendations.length > 0 && (
          <div className="p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-400 mb-2">
              <Info className="w-4 h-4" />
              Recommendations
            </div>
            <ul className="space-y-1">
              {recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-zinc-300 flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
