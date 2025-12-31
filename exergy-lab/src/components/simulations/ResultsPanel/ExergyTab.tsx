'use client'

import * as React from 'react'
import { useMemo } from 'react'
import {
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Leaf,
  Info,
  Download,
  ArrowRight,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface ExergyFlowComponent {
  id: string
  name: string
  value: number
  unit: string
  type: 'input' | 'useful' | 'destruction' | 'loss'
  percentage: number
  description?: string
}

export interface ExergyAnalysis {
  inputExergy: number
  usefulExergy: number
  exergyDestruction: number
  exergyLoss: number
  exergyEfficiency: number
  secondLawEfficiency: number
  appliedExergyLeverage: number
  energyQualityFactor: number
  improvementPotential: number
  components: ExergyFlowComponent[]
  majorLossSources: string[]
  recommendations: string[]
  fossilFuelComparison?: {
    avoided: number
    unit: string
    equivalentTo: string
  }
  carnot?: {
    hotTemp: number
    coldTemp: number
    carnotEfficiency: number
    secondLawEfficiency: number
  }
}

interface ExergyTabProps {
  analysis: ExergyAnalysis | null
  domain?: string
  onExport?: () => void
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const TYPE_COLORS: Record<ExergyFlowComponent['type'], { bg: string; text: string; fill: string }> = {
  input: { bg: 'bg-blue-500/20', text: 'text-blue-400', fill: 'bg-blue-500' },
  useful: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', fill: 'bg-emerald-500' },
  destruction: { bg: 'bg-red-500/20', text: 'text-red-400', fill: 'bg-red-500' },
  loss: { bg: 'bg-amber-500/20', text: 'text-amber-400', fill: 'bg-amber-500' },
}

// ============================================================================
// Component
// ============================================================================

export function ExergyTab({
  analysis,
  domain = 'general',
  onExport,
  className = '',
}: ExergyTabProps) {
  // Efficiency rating
  const efficiencyRating = useMemo(() => {
    if (!analysis) return null

    const eff = analysis.exergyEfficiency
    if (eff >= 80) return { label: 'Excellent', color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
    if (eff >= 60) return { label: 'Good', color: 'text-blue-400', bg: 'bg-blue-500/10' }
    if (eff >= 40) return { label: 'Moderate', color: 'text-amber-400', bg: 'bg-amber-500/10' }
    return { label: 'Low', color: 'text-red-400', bg: 'bg-red-500/10' }
  }, [analysis])

  if (!analysis) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <Zap className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400">No exergy analysis available</p>
        <p className="text-xs text-zinc-500 mt-1">
          Run a simulation to see thermodynamic analysis
        </p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main efficiency display */}
      <div className="text-center p-6 bg-zinc-900 rounded-lg">
        <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-zinc-800 border-4 border-emerald-500 mb-4">
          <div>
            <div className="text-3xl font-bold text-white">
              {analysis.exergyEfficiency.toFixed(1)}%
            </div>
            <div className="text-xs text-zinc-400">Exergy Efficiency</div>
          </div>
        </div>
        {efficiencyRating && (
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${efficiencyRating.bg} ${efficiencyRating.color} text-sm`}>
            {efficiencyRating.label}
          </span>
        )}
      </div>

      {/* Sankey-style flow bar */}
      <div>
        <h4 className="text-xs font-medium text-zinc-400 uppercase mb-2">
          Exergy Flow Distribution
        </h4>
        <div className="h-8 rounded-lg overflow-hidden flex">
          <div
            className="bg-emerald-500 flex items-center justify-center text-xs font-medium text-white"
            style={{ width: `${(analysis.usefulExergy / analysis.inputExergy) * 100}%` }}
            title={`Useful: ${((analysis.usefulExergy / analysis.inputExergy) * 100).toFixed(1)}%`}
          >
            {(analysis.usefulExergy / analysis.inputExergy) > 0.15 &&
              `${((analysis.usefulExergy / analysis.inputExergy) * 100).toFixed(0)}%`}
          </div>
          <div
            className="bg-red-500 flex items-center justify-center text-xs font-medium text-white"
            style={{ width: `${(analysis.exergyDestruction / analysis.inputExergy) * 100}%` }}
            title={`Destruction: ${((analysis.exergyDestruction / analysis.inputExergy) * 100).toFixed(1)}%`}
          >
            {(analysis.exergyDestruction / analysis.inputExergy) > 0.15 &&
              `${((analysis.exergyDestruction / analysis.inputExergy) * 100).toFixed(0)}%`}
          </div>
          <div
            className="bg-amber-500 flex items-center justify-center text-xs font-medium text-white"
            style={{ width: `${(analysis.exergyLoss / analysis.inputExergy) * 100}%` }}
            title={`Losses: ${((analysis.exergyLoss / analysis.inputExergy) * 100).toFixed(1)}%`}
          >
            {(analysis.exergyLoss / analysis.inputExergy) > 0.15 &&
              `${((analysis.exergyLoss / analysis.inputExergy) * 100).toFixed(0)}%`}
          </div>
        </div>
        <div className="flex gap-4 mt-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <span className="text-zinc-400">Useful Output</span>
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

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-zinc-900 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
            <TrendingUp className="w-3 h-3" />
            Applied Exergy Leverage
          </div>
          <div className="text-xl font-bold text-emerald-400">
            {analysis.appliedExergyLeverage.toFixed(2)}
          </div>
          <div className="text-xs text-zinc-500">Higher is better</div>
        </div>

        <div className="p-3 bg-zinc-900 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
            <Zap className="w-3 h-3" />
            Energy Quality Factor
          </div>
          <div className="text-xl font-bold text-blue-400">
            {analysis.energyQualityFactor.toFixed(2)}
          </div>
          <div className="text-xs text-zinc-500">0-1 scale</div>
        </div>

        <div className="p-3 bg-zinc-900 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
            <TrendingDown className="w-3 h-3" />
            Exergy Destruction
          </div>
          <div className="text-xl font-bold text-red-400">
            {analysis.exergyDestruction.toFixed(2)}
            <span className="text-sm font-normal text-zinc-500 ml-1">
              ({((analysis.exergyDestruction / analysis.inputExergy) * 100).toFixed(1)}%)
            </span>
          </div>
        </div>

        <div className="p-3 bg-zinc-900 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
            <TrendingUp className="w-3 h-3" />
            Improvement Potential
          </div>
          <div className="text-xl font-bold text-amber-400">
            {analysis.improvementPotential.toFixed(1)}%
          </div>
          <div className="text-xs text-zinc-500">Recoverable efficiency</div>
        </div>
      </div>

      {/* Carnot comparison */}
      {analysis.carnot && (
        <div className="p-3 bg-zinc-900 rounded-lg">
          <h4 className="text-xs font-medium text-zinc-400 uppercase mb-3">
            Carnot Comparison
          </h4>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-lg font-bold text-white">
                {analysis.carnot.hotTemp}K
              </div>
              <div className="text-xs text-zinc-500">Hot Temp</div>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-600" />
            <div className="text-center">
              <div className="text-lg font-bold text-blue-400">
                {(analysis.carnot.carnotEfficiency * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-zinc-500">Carnot Limit</div>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-600" />
            <div className="text-center">
              <div className="text-lg font-bold text-white">
                {analysis.carnot.coldTemp}K
              </div>
              <div className="text-xs text-zinc-500">Cold Temp</div>
            </div>
          </div>
          <div className="mt-3 text-center">
            <span className="text-sm text-zinc-400">
              2nd Law Efficiency:{' '}
              <span className="text-emerald-400 font-medium">
                {(analysis.carnot.secondLawEfficiency * 100).toFixed(1)}%
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Component breakdown */}
      {analysis.components.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-zinc-400 uppercase mb-2">
            Component Breakdown
          </h4>
          <div className="space-y-2">
            {analysis.components.map((component) => {
              const colors = TYPE_COLORS[component.type]

              return (
                <div key={component.id} className="p-3 bg-zinc-900 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-zinc-200">{component.name}</span>
                    <span className={`text-sm font-mono ${colors.text}`}>
                      {component.value.toFixed(2)} {component.unit}
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors.fill} rounded-full`}
                      style={{ width: `${Math.min(100, component.percentage)}%` }}
                    />
                  </div>
                  {component.description && (
                    <p className="text-xs text-zinc-500 mt-1">{component.description}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Major loss sources */}
      {analysis.majorLossSources.length > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-400 mb-2">
            <AlertTriangle className="w-4 h-4" />
            Major Loss Sources
          </div>
          <ul className="space-y-1">
            {analysis.majorLossSources.map((source, idx) => (
              <li key={idx} className="text-xs text-zinc-300 flex items-start gap-2">
                <span className="text-amber-500 mt-1">-</span>
                {source}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fossil fuel comparison */}
      {analysis.fossilFuelComparison && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-400 mb-2">
            <Leaf className="w-4 h-4" />
            Environmental Impact
          </div>
          <p className="text-sm text-zinc-300">
            This process avoids{' '}
            <span className="font-bold text-emerald-400">
              {analysis.fossilFuelComparison.avoided.toFixed(2)} {analysis.fossilFuelComparison.unit}
            </span>{' '}
            of CO2, equivalent to {analysis.fossilFuelComparison.equivalentTo}.
          </p>
        </div>
      )}

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-400 mb-2">
            <Info className="w-4 h-4" />
            Recommendations
          </div>
          <ul className="space-y-1">
            {analysis.recommendations.map((rec, idx) => (
              <li key={idx} className="text-xs text-zinc-300 flex items-start gap-2">
                <span className="text-blue-500 mt-1">-</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Export button */}
      {onExport && (
        <button
          onClick={onExport}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Exergy Analysis
        </button>
      )}
    </div>
  )
}
