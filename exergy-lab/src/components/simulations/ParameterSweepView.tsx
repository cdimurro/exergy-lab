'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import {
  TrendingUp,
  Target,
  BarChart3,
  Download,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ContourPlot } from './ContourPlot'
import { SensitivityChart } from './SensitivityChart'
import type { SweepResult, SweepProgress, SweepParameter } from '@/hooks/useParameterSweep'

interface ParameterSweepViewProps {
  result: SweepResult | null
  progress: SweepProgress | null
  isRunning: boolean
  parameters: SweepParameter[]
  onStart?: () => void
  onPause?: () => void
  onReset?: () => void
  onExport?: () => void
}

export function ParameterSweepView({
  result,
  progress,
  isRunning,
  parameters,
  onStart,
  onPause,
  onReset,
  onExport,
}: ParameterSweepViewProps) {
  const [activeTab, setActiveTab] = useState<'results' | 'contour' | 'sensitivity'>('results')
  const [selectedXParam, setSelectedXParam] = useState<string | null>(null)
  const [selectedYParam, setSelectedYParam] = useState<string | null>(null)

  // Set default parameters for contour plot
  React.useEffect(() => {
    if (parameters.length >= 2) {
      if (!selectedXParam) setSelectedXParam(parameters[0].id)
      if (!selectedYParam) setSelectedYParam(parameters[1].id)
    }
  }, [parameters, selectedXParam, selectedYParam])

  const progressPercent = progress
    ? (progress.completedPoints / progress.totalPoints) * 100
    : 0

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <TrendingUp className="h-5 w-5 text-emerald-500" />
          <div>
            <h3 className="font-medium text-white">Parameter Sweep Results</h3>
            <p className="text-xs text-zinc-400">
              {result ? `${result.points.length} data points` : 'No results yet'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRunning ? (
            <Button variant="outline" size="sm" onClick={onPause}>
              <Pause className="h-4 w-4 mr-1" />
              Pause
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onStart}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={parameters.length === 0}
            >
              <Play className="h-4 w-4 mr-1" />
              Run Sweep
            </Button>
          )}
          {result && (
            <>
              <Button variant="outline" size="sm" onClick={onReset}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {progress && isRunning && (
        <div className="px-4 py-2 bg-zinc-800/50 border-b border-zinc-800">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>
              {progress.completedPoints} / {progress.totalPoints} points
            </span>
            <span>
              {progress.estimatedTimeRemaining
                ? `~${formatTime(progress.estimatedTimeRemaining)} remaining`
                : 'Calculating...'}
            </span>
          </div>
          <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('results')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'results'
              ? 'text-white border-b-2 border-emerald-500'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Results
          </div>
        </button>
        <button
          onClick={() => setActiveTab('contour')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'contour'
              ? 'text-white border-b-2 border-emerald-500'
              : 'text-zinc-400 hover:text-white'
          }`}
          disabled={!result || parameters.length < 2}
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Contour Plot
          </div>
        </button>
        <button
          onClick={() => setActiveTab('sensitivity')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'sensitivity'
              ? 'text-white border-b-2 border-emerald-500'
              : 'text-zinc-400 hover:text-white'
          }`}
          disabled={!result}
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Sensitivity
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {!result && !isRunning && (
          <div className="text-center py-12 text-zinc-400">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No Sweep Results</p>
            <p className="text-sm">
              Configure your parameters and click "Run Sweep" to explore the parameter space.
            </p>
          </div>
        )}

        {activeTab === 'results' && result && (
          <div className="space-y-6">
            {/* Optimal Point */}
            {result.optimalPoint && (
              <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-5 w-5 text-emerald-500" />
                  <span className="font-medium text-white">Optimal Configuration</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {parameters.map((param) => (
                    <div key={param.id}>
                      <p className="text-xs text-zinc-400">{param.name}</p>
                      <p className="text-lg font-mono text-white">
                        {result.optimalPoint!.parameterValues[param.id].toFixed(3)}
                        <span className="text-xs text-zinc-500 ml-1">{param.unit}</span>
                      </p>
                    </div>
                  ))}
                  <div>
                    <p className="text-xs text-zinc-400">Result</p>
                    <p className="text-lg font-mono text-emerald-400">
                      {result.optimalPoint.result.toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-400">Minimum</p>
                <p className="text-lg font-mono text-white">
                  {result.statistics.min.toFixed(4)}
                </p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-400">Maximum</p>
                <p className="text-lg font-mono text-white">
                  {result.statistics.max.toFixed(4)}
                </p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-400">Mean</p>
                <p className="text-lg font-mono text-white">
                  {result.statistics.mean.toFixed(4)}
                </p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-400">Std Dev</p>
                <p className="text-lg font-mono text-white">
                  {result.statistics.stdDev.toFixed(4)}
                </p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-400">Median</p>
                <p className="text-lg font-mono text-white">
                  {result.statistics.percentiles.p50.toFixed(4)}
                </p>
              </div>
            </div>

            {/* Data points table (sample) */}
            <div>
              <h4 className="text-sm font-medium text-white mb-2">
                Sample Data Points (showing top 10 by result)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="px-3 py-2 text-left text-zinc-400">#</th>
                      {parameters.map((p) => (
                        <th key={p.id} className="px-3 py-2 text-left text-zinc-400">
                          {p.name}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-left text-zinc-400">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...result.points]
                      .filter((p) => !isNaN(p.result))
                      .sort((a, b) => b.result - a.result)
                      .slice(0, 10)
                      .map((point, i) => (
                        <tr key={i} className="border-b border-zinc-800/50">
                          <td className="px-3 py-2 text-zinc-500">{i + 1}</td>
                          {parameters.map((p) => (
                            <td key={p.id} className="px-3 py-2 font-mono text-white">
                              {point.parameterValues[p.id].toFixed(3)}
                            </td>
                          ))}
                          <td className="px-3 py-2 font-mono text-emerald-400">
                            {point.result.toFixed(4)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contour' && result && result.contourData && (
          <div className="space-y-4">
            {/* Parameter selectors */}
            <div className="flex items-center gap-4">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">X-Axis Parameter</label>
                <select
                  value={selectedXParam || ''}
                  onChange={(e) => setSelectedXParam(e.target.value)}
                  className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm"
                >
                  {parameters.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Y-Axis Parameter</label>
                <select
                  value={selectedYParam || ''}
                  onChange={(e) => setSelectedYParam(e.target.value)}
                  className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm"
                >
                  {parameters.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <ContourPlot
              data={result.contourData}
              xLabel={parameters.find((p) => p.id === selectedXParam)?.name || 'X'}
              yLabel={parameters.find((p) => p.id === selectedYParam)?.name || 'Y'}
              xUnit={parameters.find((p) => p.id === selectedXParam)?.unit || ''}
              yUnit={parameters.find((p) => p.id === selectedYParam)?.unit || ''}
            />
          </div>
        )}

        {activeTab === 'sensitivity' && result && (
          <SensitivityChart
            sensitivity={result.sensitivity}
            parameters={parameters}
          />
        )}
      </div>
    </div>
  )
}
