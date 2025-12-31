'use client'

import * as React from 'react'
import { useMemo } from 'react'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Copy,
  Check,
  Download,
  Info,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface MetricResult {
  id: string
  name: string
  value: number
  unit: string
  benchmark?: number
  limit?: number
  direction?: 'higher-better' | 'lower-better'
  category?: string
  description?: string
}

export interface SimulationResult {
  metrics: MetricResult[]
  convergence: {
    achieved: boolean
    tolerance: number
    iterations?: number
    finalResidual?: number
  }
  warnings: string[]
  notes: string[]
  computeTime: number
  tier: 1 | 2 | 3
}

interface ResultsTabProps {
  result: SimulationResult | null
  isLoading?: boolean
  onExport?: () => void
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function ResultsTab({
  result,
  isLoading = false,
  onExport,
  className = '',
}: ResultsTabProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null)

  // Group metrics by category
  const groupedMetrics = useMemo(() => {
    if (!result) return {}

    const groups: Record<string, MetricResult[]> = { primary: [] }

    result.metrics.forEach((metric) => {
      const category = metric.category || 'primary'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(metric)
    })

    return groups
  }, [result])

  // Copy metric value
  const handleCopy = async (metric: MetricResult) => {
    await navigator.clipboard.writeText(`${metric.value} ${metric.unit}`)
    setCopiedId(metric.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Get comparison status
  const getComparisonStatus = (metric: MetricResult) => {
    if (metric.benchmark === undefined) return null

    const diff = metric.value - metric.benchmark
    const percentDiff = (diff / metric.benchmark) * 100
    const isGood =
      metric.direction === 'lower-better' ? diff <= 0 : diff >= 0

    return { diff, percentDiff, isGood }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-zinc-700 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  // No results
  if (!result) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <Info className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400">Run a simulation to see results</p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Convergence status */}
      <div
        className={`p-3 rounded-lg flex items-center justify-between ${
          result.convergence.achieved
            ? 'bg-emerald-500/10 border border-emerald-500/30'
            : 'bg-amber-500/10 border border-amber-500/30'
        }`}
      >
        <div className="flex items-center gap-2">
          {result.convergence.achieved ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          )}
          <div>
            <span
              className={`text-sm font-medium ${
                result.convergence.achieved ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {result.convergence.achieved
                ? 'Convergence Achieved'
                : 'Convergence Warning'}
            </span>
            <p className="text-xs text-zinc-400">
              Tolerance: {result.convergence.tolerance.toExponential(1)}
              {result.convergence.iterations && ` | ${result.convergence.iterations} iterations`}
            </p>
          </div>
        </div>
        <div className="text-right text-xs text-zinc-400">
          <div>Tier {result.tier}</div>
          <div>{(result.computeTime / 1000).toFixed(2)}s</div>
        </div>
      </div>

      {/* Metrics by category */}
      {Object.entries(groupedMetrics).map(([category, metrics]) => (
        <div key={category}>
          <h4 className="text-xs font-medium text-zinc-400 uppercase mb-2">
            {category.replace(/-/g, ' ')}
          </h4>
          <div className="space-y-2">
            {metrics.map((metric) => {
              const comparison = getComparisonStatus(metric)

              return (
                <div
                  key={metric.id}
                  className="p-3 bg-zinc-900 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-200">{metric.name}</span>
                      {metric.description && (
                        <span className="group relative">
                          <Info className="w-3 h-3 text-zinc-500" />
                          <span className="absolute left-0 bottom-full mb-1 w-48 p-2 bg-zinc-700 text-xs text-zinc-300 rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            {metric.description}
                          </span>
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleCopy(metric)}
                      className="p-1 text-zinc-500 hover:text-white"
                    >
                      {copiedId === metric.id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="mt-2 flex items-baseline justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-white font-mono">
                        {typeof metric.value === 'number'
                          ? metric.value.toFixed(4)
                          : metric.value}
                      </span>
                      <span className="text-sm text-zinc-400">{metric.unit}</span>
                    </div>

                    {/* Comparison with benchmark */}
                    {comparison && (
                      <div
                        className={`flex items-center gap-1 text-sm ${
                          comparison.isGood ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {comparison.diff > 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : comparison.diff < 0 ? (
                          <TrendingDown className="w-4 h-4" />
                        ) : (
                          <Minus className="w-4 h-4" />
                        )}
                        <span>
                          {comparison.diff > 0 ? '+' : ''}
                          {comparison.percentDiff.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Benchmark and limit info */}
                  {(metric.benchmark !== undefined || metric.limit !== undefined) && (
                    <div className="mt-2 flex gap-4 text-xs text-zinc-500">
                      {metric.benchmark !== undefined && (
                        <span>Benchmark: {metric.benchmark.toFixed(3)} {metric.unit}</span>
                      )}
                      {metric.limit !== undefined && (
                        <span>Limit: {metric.limit.toFixed(3)} {metric.unit}</span>
                      )}
                    </div>
                  )}

                  {/* Progress to limit */}
                  {metric.limit !== undefined && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            (metric.value / metric.limit) > 0.9
                              ? 'bg-emerald-500'
                              : (metric.value / metric.limit) > 0.7
                                ? 'bg-amber-500'
                                : 'bg-blue-500'
                          }`}
                          style={{
                            width: `${Math.min(100, (metric.value / metric.limit) * 100)}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-zinc-500 mt-0.5">
                        <span>0</span>
                        <span>{((metric.value / metric.limit) * 100).toFixed(1)}% of limit</span>
                        <span>{metric.limit}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-400 mb-2">
            <AlertTriangle className="w-4 h-4" />
            Warnings
          </div>
          <ul className="space-y-1">
            {result.warnings.map((warning, idx) => (
              <li key={idx} className="text-xs text-zinc-300 flex items-start gap-2">
                <span className="text-amber-500 mt-1">-</span>
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Notes */}
      {result.notes.length > 0 && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-400 mb-2">
            <Info className="w-4 h-4" />
            Notes
          </div>
          <ul className="space-y-1">
            {result.notes.map((note, idx) => (
              <li key={idx} className="text-xs text-zinc-300 flex items-start gap-2">
                <span className="text-blue-500 mt-1">-</span>
                {note}
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
          Export Results (JSON)
        </button>
      )}
    </div>
  )
}
