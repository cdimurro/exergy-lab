'use client'

import * as React from 'react'
import { useMemo } from 'react'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  FileText,
  Info,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface BenchmarkValue {
  name: string
  simulated: number
  benchmark: number
  unit: string
  tolerance: number // Percentage tolerance
  source: string
  sourceUrl?: string
  notes?: string
}

export interface BenchmarkResult {
  id: string
  name: string
  domain: 'solar' | 'wind' | 'battery' | 'hydrogen' | 'thermal' | 'general'
  description: string
  values: BenchmarkValue[]
  overallStatus: 'pass' | 'partial' | 'fail'
  confidence: number // 0-1
  citation: string
}

interface BenchmarkComparisonProps {
  result: BenchmarkResult
  showDetails?: boolean
  onSourceClick?: (url: string) => void
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function BenchmarkComparison({
  result,
  showDetails = true,
  onSourceClick,
  className = '',
}: BenchmarkComparisonProps) {
  // Calculate pass/fail for each value
  const valueResults = useMemo(() => {
    return result.values.map((value) => {
      const percentDiff = ((value.simulated - value.benchmark) / value.benchmark) * 100
      const isWithinTolerance = Math.abs(percentDiff) <= value.tolerance

      return {
        ...value,
        percentDiff,
        isWithinTolerance,
        status: isWithinTolerance ? 'pass' : Math.abs(percentDiff) <= value.tolerance * 2 ? 'warning' : 'fail',
      }
    })
  }, [result.values])

  // Calculate summary stats
  const stats = useMemo(() => {
    const passing = valueResults.filter((v) => v.status === 'pass').length
    const warnings = valueResults.filter((v) => v.status === 'warning').length
    const failing = valueResults.filter((v) => v.status === 'fail').length
    const total = valueResults.length

    const avgDeviation =
      valueResults.reduce((sum, v) => sum + Math.abs(v.percentDiff), 0) / total

    return { passing, warnings, failing, total, avgDeviation }
  }, [valueResults])

  // Get status icon and color
  const getStatusConfig = (status: 'pass' | 'warning' | 'fail') => {
    switch (status) {
      case 'pass':
        return { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
      case 'warning':
        return { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' }
      case 'fail':
        return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' }
    }
  }

  const overallConfig = getStatusConfig(
    result.overallStatus === 'pass' ? 'pass' : result.overallStatus === 'partial' ? 'warning' : 'fail'
  )
  const OverallIcon = overallConfig.icon

  return (
    <div className={`bg-zinc-800 rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-medium text-white">Benchmark Validation</h3>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${overallConfig.bg} ${overallConfig.color}`}
            >
              <OverallIcon className="w-3 h-3" />
              {result.overallStatus === 'pass'
                ? 'Validated'
                : result.overallStatus === 'partial'
                  ? 'Partial Match'
                  : 'Outside Tolerance'}
            </span>
          </div>
        </div>
        <p className="text-xs text-zinc-400 mt-1">{result.description}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center p-2 bg-zinc-900 rounded">
            <div className="text-lg font-bold text-emerald-400">{stats.passing}</div>
            <div className="text-xs text-zinc-500">Passing</div>
          </div>
          <div className="text-center p-2 bg-zinc-900 rounded">
            <div className="text-lg font-bold text-amber-400">{stats.warnings}</div>
            <div className="text-xs text-zinc-500">Warnings</div>
          </div>
          <div className="text-center p-2 bg-zinc-900 rounded">
            <div className="text-lg font-bold text-red-400">{stats.failing}</div>
            <div className="text-xs text-zinc-500">Failing</div>
          </div>
          <div className="text-center p-2 bg-zinc-900 rounded">
            <div className="text-lg font-bold text-white">
              {stats.avgDeviation.toFixed(1)}%
            </div>
            <div className="text-xs text-zinc-500">Avg. Deviation</div>
          </div>
        </div>

        {/* Confidence indicator */}
        <div className="p-3 bg-zinc-900 rounded">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Validation Confidence</span>
            <span>{(result.confidence * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                result.confidence >= 0.8
                  ? 'bg-emerald-500'
                  : result.confidence >= 0.5
                    ? 'bg-amber-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${result.confidence * 100}%` }}
            />
          </div>
        </div>

        {/* Detailed comparison table */}
        {showDetails && (
          <div>
            <h4 className="text-xs font-medium text-zinc-400 uppercase mb-2">
              Metric Comparison
            </h4>
            <div className="space-y-2">
              {valueResults.map((value, idx) => {
                const config = getStatusConfig(value.status as 'pass' | 'warning' | 'fail')
                const Icon = config.icon
                const isPositive = value.percentDiff > 0

                return (
                  <div
                    key={idx}
                    className="p-3 bg-zinc-900 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${config.color}`} />
                        <span className="text-sm text-zinc-200">{value.name}</span>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}>
                        {value.status === 'pass' ? 'Within tolerance' : `${value.percentDiff > 0 ? '+' : ''}${value.percentDiff.toFixed(1)}%`}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <div className="text-xs text-zinc-500">Simulated</div>
                        <div className="text-sm font-mono text-white">
                          {value.simulated.toFixed(3)} {value.unit}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500">Benchmark</div>
                        <div className="text-sm font-mono text-zinc-300">
                          {value.benchmark.toFixed(3)} {value.unit}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500">Difference</div>
                        <div className={`text-sm font-mono flex items-center justify-center gap-1 ${
                          value.isWithinTolerance ? 'text-emerald-400' : isPositive ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {isPositive ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : value.percentDiff < 0 ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : (
                            <Minus className="w-3 h-3" />
                          )}
                          {Math.abs(value.percentDiff).toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* Source */}
                    <div className="mt-2 pt-2 border-t border-zinc-800 flex items-center justify-between">
                      <span className="text-xs text-zinc-500">
                        Source: {value.source}
                      </span>
                      {value.sourceUrl && onSourceClick && (
                        <button
                          onClick={() => onSourceClick(value.sourceUrl!)}
                          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View
                        </button>
                      )}
                    </div>

                    {/* Notes */}
                    {value.notes && (
                      <div className="mt-2 p-2 bg-zinc-800 rounded text-xs text-zinc-400 flex items-start gap-2">
                        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {value.notes}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Citation */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded">
          <div className="flex items-center gap-2 text-xs text-blue-400 mb-1">
            <FileText className="w-3 h-3" />
            Reference
          </div>
          <p className="text-xs text-zinc-300">{result.citation}</p>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Pre-defined benchmarks
// ============================================================================

export const SOLAR_BENCHMARKS: Record<string, BenchmarkValue[]> = {
  'silicon-pv': [
    {
      name: 'Efficiency',
      simulated: 0,
      benchmark: 26.7,
      unit: '%',
      tolerance: 5,
      source: 'NREL Best Research Cell Chart',
      sourceUrl: 'https://www.nrel.gov/pv/cell-efficiency.html',
    },
    {
      name: 'Voc',
      simulated: 0,
      benchmark: 0.738,
      unit: 'V',
      tolerance: 3,
      source: 'NREL Best Research Cell',
    },
    {
      name: 'Jsc',
      simulated: 0,
      benchmark: 42.65,
      unit: 'mA/cm2',
      tolerance: 5,
      source: 'NREL Best Research Cell',
    },
    {
      name: 'Fill Factor',
      simulated: 0,
      benchmark: 84.9,
      unit: '%',
      tolerance: 3,
      source: 'NREL Best Research Cell',
    },
  ],
  'perovskite': [
    {
      name: 'Efficiency',
      simulated: 0,
      benchmark: 26.1,
      unit: '%',
      tolerance: 5,
      source: 'NREL Best Research Cell Chart',
    },
    {
      name: 'Voc',
      simulated: 0,
      benchmark: 1.21,
      unit: 'V',
      tolerance: 5,
      source: 'Literature average',
    },
  ],
}

export const BATTERY_BENCHMARKS: Record<string, BenchmarkValue[]> = {
  'lithium-ion': [
    {
      name: 'Energy Density',
      simulated: 0,
      benchmark: 265,
      unit: 'Wh/kg',
      tolerance: 10,
      source: 'DOE Vehicle Technologies Office',
    },
    {
      name: 'Cycle Life',
      simulated: 0,
      benchmark: 1000,
      unit: 'cycles',
      tolerance: 15,
      source: 'Industry standard',
    },
    {
      name: 'Coulombic Efficiency',
      simulated: 0,
      benchmark: 99.9,
      unit: '%',
      tolerance: 0.5,
      source: 'Laboratory measurements',
    },
  ],
}

export const HYDROGEN_BENCHMARKS: Record<string, BenchmarkValue[]> = {
  'pem-electrolyzer': [
    {
      name: 'Stack Efficiency',
      simulated: 0,
      benchmark: 80,
      unit: '%',
      tolerance: 5,
      source: 'DOE Hydrogen Program',
    },
    {
      name: 'Current Density',
      simulated: 0,
      benchmark: 2.0,
      unit: 'A/cm2',
      tolerance: 10,
      source: 'Commercial specifications',
    },
    {
      name: 'Hydrogen Purity',
      simulated: 0,
      benchmark: 99.999,
      unit: '%',
      tolerance: 0.001,
      source: 'ISO 14687',
    },
  ],
}
