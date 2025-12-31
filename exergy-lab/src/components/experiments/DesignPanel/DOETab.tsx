'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import { Plus, Trash2, Grid3X3, Shuffle, Download, Info, AlertTriangle } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export type DOEMethod = 'full-factorial' | 'fractional' | 'taguchi' | 'central-composite' | 'box-behnken'

export interface DOEFactor {
  id: string
  name: string
  unit: string
  levels: number[]
  isNumeric: boolean
}

export interface DOEResponse {
  id: string
  name: string
  unit: string
  direction: 'maximize' | 'minimize' | 'target'
  targetValue?: number
}

export interface DOEConfig {
  method: DOEMethod
  factors: DOEFactor[]
  responses: DOEResponse[]
  replicates: number
  randomize: boolean
  blockingEnabled: boolean
  centerPoints: number
}

export interface DOERun {
  runNumber: number
  factors: Record<string, number | string>
  isReplicate: boolean
  isCenterPoint: boolean
}

export interface DOETabProps {
  config: DOEConfig
  onChange: (config: DOEConfig) => void
  generatedRuns?: DOERun[]
  onGenerateRuns?: () => void
  onExportMatrix?: () => void
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const DOE_METHODS: Array<{ id: DOEMethod; name: string; description: string }> = [
  { id: 'full-factorial', name: 'Full Factorial', description: 'All combinations of factor levels' },
  { id: 'fractional', name: 'Fractional Factorial', description: 'Subset of full factorial (for many factors)' },
  { id: 'taguchi', name: 'Taguchi Arrays', description: 'Orthogonal arrays for robust design' },
  { id: 'central-composite', name: 'Central Composite', description: 'For response surface methodology' },
  { id: 'box-behnken', name: 'Box-Behnken', description: 'Three-level design without corners' },
]

// ============================================================================
// Component
// ============================================================================

export function DOETab({
  config,
  onChange,
  generatedRuns = [],
  onGenerateRuns,
  onExportMatrix,
  className = '',
}: DOETabProps) {
  const [showRunMatrix, setShowRunMatrix] = useState(false)

  // Calculate total runs
  const totalRuns = useMemo(() => {
    if (config.factors.length === 0) return 0

    let baseRuns: number

    switch (config.method) {
      case 'full-factorial':
        baseRuns = config.factors.reduce((total, f) => total * f.levels.length, 1)
        break
      case 'fractional':
        baseRuns = Math.pow(2, config.factors.length - 1) // Half fraction
        break
      case 'taguchi':
        baseRuns = config.factors.length <= 4 ? 9 : 18 // L9 or L18
        break
      case 'central-composite':
        baseRuns = Math.pow(2, config.factors.length) + 2 * config.factors.length + config.centerPoints
        break
      case 'box-behnken':
        baseRuns = 2 * config.factors.length * (config.factors.length - 1) + config.centerPoints
        break
      default:
        baseRuns = 0
    }

    return (baseRuns + config.centerPoints) * config.replicates
  }, [config])

  // Add factor
  const addFactor = () => {
    const newFactor: DOEFactor = {
      id: `factor-${Date.now()}`,
      name: '',
      unit: '',
      levels: [0, 1],
      isNumeric: true,
    }
    onChange({ ...config, factors: [...config.factors, newFactor] })
  }

  // Update factor
  const updateFactor = (id: string, updates: Partial<DOEFactor>) => {
    onChange({
      ...config,
      factors: config.factors.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    })
  }

  // Remove factor
  const removeFactor = (id: string) => {
    onChange({ ...config, factors: config.factors.filter((f) => f.id !== id) })
  }

  // Update factor levels
  const updateFactorLevels = (id: string, levelsStr: string) => {
    const levels = levelsStr.split(',').map((l) => parseFloat(l.trim())).filter((l) => !isNaN(l))
    updateFactor(id, { levels })
  }

  // Add response
  const addResponse = () => {
    const newResponse: DOEResponse = {
      id: `response-${Date.now()}`,
      name: '',
      unit: '',
      direction: 'maximize',
    }
    onChange({ ...config, responses: [...config.responses, newResponse] })
  }

  // Update response
  const updateResponse = (id: string, updates: Partial<DOEResponse>) => {
    onChange({
      ...config,
      responses: config.responses.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    })
  }

  // Remove response
  const removeResponse = (id: string) => {
    onChange({ ...config, responses: config.responses.filter((r) => r.id !== id) })
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* DOE Method */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 uppercase mb-2">
          Design Method
        </label>
        <div className="grid grid-cols-1 gap-2">
          {DOE_METHODS.map((method) => (
            <button
              key={method.id}
              onClick={() => onChange({ ...config, method: method.id })}
              className={`
                p-3 rounded-lg text-left transition-all
                ${config.method === method.id
                  ? 'bg-emerald-500/10 border-2 border-emerald-500'
                  : 'bg-zinc-900 border-2 border-transparent hover:bg-zinc-800'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${config.method === method.id ? 'text-emerald-400' : 'text-zinc-300'}`}>
                  {method.name}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">{method.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Factors */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-zinc-400 uppercase">
            Factors (Independent Variables)
          </label>
          <button
            onClick={addFactor}
            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
          >
            <Plus className="w-3 h-3" />
            Add Factor
          </button>
        </div>

        {config.factors.length === 0 ? (
          <div className="p-4 border border-dashed border-zinc-700 rounded-lg text-center">
            <Grid3X3 className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No factors defined</p>
            <button
              onClick={addFactor}
              className="mt-2 text-sm text-emerald-400 hover:text-emerald-300"
            >
              Add your first factor
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {config.factors.map((factor, idx) => (
              <div key={factor.id} className="p-3 bg-zinc-900 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 w-6">X{idx + 1}</span>
                  <input
                    type="text"
                    value={factor.name}
                    onChange={(e) => updateFactor(factor.id, { name: e.target.value })}
                    placeholder="Factor name"
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    value={factor.unit}
                    onChange={(e) => updateFactor(factor.id, { unit: e.target.value })}
                    placeholder="Unit"
                    className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => removeFactor(factor.id)}
                    className="p-1 text-zinc-500 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">
                    Levels (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={factor.levels.join(', ')}
                    onChange={(e) => updateFactorLevels(factor.id, e.target.value)}
                    placeholder="e.g., 100, 200, 300"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Responses */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-zinc-400 uppercase">
            Responses (Dependent Variables)
          </label>
          <button
            onClick={addResponse}
            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
          >
            <Plus className="w-3 h-3" />
            Add Response
          </button>
        </div>

        {config.responses.length === 0 ? (
          <p className="text-sm text-zinc-500 italic">No responses defined</p>
        ) : (
          <div className="space-y-2">
            {config.responses.map((response, idx) => (
              <div key={response.id} className="p-3 bg-zinc-900 rounded-lg flex items-center gap-2">
                <span className="text-xs text-zinc-500 w-6">Y{idx + 1}</span>
                <input
                  type="text"
                  value={response.name}
                  onChange={(e) => updateResponse(response.id, { name: e.target.value })}
                  placeholder="Response name"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <input
                  type="text"
                  value={response.unit}
                  onChange={(e) => updateResponse(response.id, { unit: e.target.value })}
                  placeholder="Unit"
                  className="w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <select
                  value={response.direction}
                  onChange={(e) =>
                    updateResponse(response.id, {
                      direction: e.target.value as DOEResponse['direction'],
                    })
                  }
                  className="w-28 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="maximize">Maximize</option>
                  <option value="minimize">Minimize</option>
                  <option value="target">Target</option>
                </select>
                <button
                  onClick={() => removeResponse(response.id)}
                  className="p-1 text-zinc-500 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Design options */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 uppercase mb-1">
            Replicates
          </label>
          <input
            type="number"
            value={config.replicates}
            min={1}
            max={10}
            onChange={(e) => onChange({ ...config, replicates: parseInt(e.target.value) || 1 })}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 uppercase mb-1">
            Center Points
          </label>
          <input
            type="number"
            value={config.centerPoints}
            min={0}
            max={10}
            onChange={(e) => onChange({ ...config, centerPoints: parseInt(e.target.value) || 0 })}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.randomize}
            onChange={(e) => onChange({ ...config, randomize: e.target.checked })}
            className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500"
          />
          <span className="text-sm text-zinc-300">Randomize run order</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.blockingEnabled}
            onChange={(e) => onChange({ ...config, blockingEnabled: e.target.checked })}
            className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500"
          />
          <span className="text-sm text-zinc-300">Enable blocking</span>
        </label>
      </div>

      {/* Summary */}
      <div className="p-3 bg-zinc-900 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Total experimental runs:</span>
          <span className={`text-xl font-bold ${totalRuns > 100 ? 'text-amber-400' : 'text-white'}`}>
            {totalRuns}
          </span>
        </div>
        {totalRuns > 100 && (
          <div className="flex items-center gap-2 mt-2 text-xs text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            Large number of runs. Consider fractional factorial or Taguchi design.
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {onGenerateRuns && (
          <button
            onClick={onGenerateRuns}
            disabled={config.factors.length === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm rounded-lg transition-colors"
          >
            <Shuffle className="w-4 h-4" />
            Generate Run Matrix
          </button>
        )}
        {onExportMatrix && generatedRuns.length > 0 && (
          <button
            onClick={onExportMatrix}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 mt-0.5" />
          <div className="text-xs text-zinc-300">
            <p className="font-medium text-blue-400 mb-1">Design of Experiments</p>
            <p>
              DOE helps optimize experiments by systematically varying factors to understand
              their effects on responses. Choose a design based on your number of factors
              and resource constraints.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
