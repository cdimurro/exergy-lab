'use client'

import * as React from 'react'
import { useMemo } from 'react'
import type { SweepParameter } from '@/hooks/useParameterSweep'

interface SensitivityChartProps {
  sensitivity: Record<string, number>
  parameters: SweepParameter[]
  title?: string
}

export function SensitivityChart({
  sensitivity,
  parameters,
  title = 'Parameter Sensitivity Analysis',
}: SensitivityChartProps) {
  // Sort parameters by sensitivity
  const sortedParams = useMemo(() => {
    return [...parameters]
      .map((p) => ({
        ...p,
        sensitivity: sensitivity[p.id] || 0,
      }))
      .sort((a, b) => b.sensitivity - a.sensitivity)
  }, [parameters, sensitivity])

  const maxSensitivity = Math.max(...sortedParams.map((p) => p.sensitivity), 1)

  // Get color based on sensitivity level
  const getBarColor = (value: number) => {
    if (value > 50) return 'bg-emerald-500'
    if (value > 30) return 'bg-blue-500'
    if (value > 15) return 'bg-amber-500'
    return 'bg-zinc-500'
  }

  const getTextColor = (value: number) => {
    if (value > 50) return 'text-emerald-400'
    if (value > 30) return 'text-blue-400'
    if (value > 15) return 'text-amber-400'
    return 'text-zinc-400'
  }

  return (
    <div className="bg-zinc-800 rounded-lg p-4">
      <h4 className="text-sm font-medium text-white mb-4">{title}</h4>

      {/* Tornado chart */}
      <div className="space-y-3">
        {sortedParams.map((param, index) => (
          <div key={param.id} className="flex items-center gap-3">
            {/* Parameter name */}
            <div className="w-32 text-right">
              <span className="text-sm text-zinc-300 truncate block">{param.name}</span>
              <span className="text-xs text-zinc-500">{param.unit}</span>
            </div>

            {/* Bar */}
            <div className="flex-1 h-6 bg-zinc-700 rounded overflow-hidden relative">
              <div
                className={`h-full ${getBarColor(param.sensitivity)} transition-all duration-500`}
                style={{ width: `${(param.sensitivity / maxSensitivity) * 100}%` }}
              />
              {/* Value label */}
              <span
                className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono ${getTextColor(param.sensitivity)}`}
              >
                {param.sensitivity.toFixed(1)}%
              </span>
            </div>

            {/* Rank badge */}
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                index === 0
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : index === 1
                    ? 'bg-blue-500/20 text-blue-400'
                    : index === 2
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-zinc-700 text-zinc-400'
              }`}
            >
              {index + 1}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-zinc-700">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span>High (&gt;50%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span>Medium (30-50%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span>Low (15-30%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-zinc-500" />
              <span>Minimal (&lt;15%)</span>
            </div>
          </div>
        </div>

        {/* Interpretation */}
        <div className="mt-3 p-3 bg-zinc-900 rounded text-sm">
          <p className="text-zinc-300">
            <span className="font-medium text-white">Interpretation: </span>
            {sortedParams[0]?.sensitivity > 40 ? (
              <>
                <span className="text-emerald-400">{sortedParams[0]?.name}</span> is the dominant
                factor, explaining {sortedParams[0]?.sensitivity.toFixed(1)}% of output variance.
                {sortedParams[1]?.sensitivity > 20 && (
                  <>
                    {' '}
                    <span className="text-blue-400">{sortedParams[1]?.name}</span> is also
                    significant at {sortedParams[1]?.sensitivity.toFixed(1)}%.
                  </>
                )}
              </>
            ) : (
              <>
                Multiple parameters have comparable influence. Consider interaction effects or
                non-linear relationships.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Recommendations */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-emerald-900/20 border border-emerald-800 rounded">
          <p className="font-medium text-emerald-400 mb-1">Focus Parameters</p>
          <p className="text-zinc-400">
            Prioritize optimization of{' '}
            {sortedParams
              .slice(0, 2)
              .map((p) => p.name)
              .join(' and ')}{' '}
            for maximum impact.
          </p>
        </div>
        <div className="p-3 bg-amber-900/20 border border-amber-800 rounded">
          <p className="font-medium text-amber-400 mb-1">Fixed Parameters</p>
          <p className="text-zinc-400">
            {sortedParams
              .slice(-2)
              .map((p) => p.name)
              .join(' and ')}{' '}
            can be held at nominal values with minimal effect.
          </p>
        </div>
      </div>
    </div>
  )
}
