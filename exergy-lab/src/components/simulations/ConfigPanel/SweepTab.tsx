'use client'

import * as React from 'react'
import { useState } from 'react'
import { Plus, Trash2, Play, AlertTriangle, Info, Grid3X3 } from 'lucide-react'
import type { ParameterDefinition } from './ParamsTab'

// ============================================================================
// Types
// ============================================================================

export interface SweepParameter {
  id: string
  parameterId: string
  min: number
  max: number
  steps: number
}

export interface SweepConfig {
  parameters: SweepParameter[]
  enableSensitivity: boolean
  enableUncertainty: boolean
  method: 'grid' | 'latin-hypercube' | 'sobol'
}

interface SweepTabProps {
  availableParameters: ParameterDefinition[]
  config: SweepConfig
  onChange: (config: SweepConfig) => void
  estimatedCost?: number
  estimatedTime?: string
  maxRuns?: number
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function SweepTab({
  availableParameters,
  config,
  onChange,
  estimatedCost,
  estimatedTime,
  maxRuns = 10000,
  className = '',
}: SweepTabProps) {
  // Calculate total runs
  const totalRuns = React.useMemo(() => {
    if (config.parameters.length === 0) return 0
    if (config.method === 'grid') {
      return config.parameters.reduce((total, p) => total * p.steps, 1)
    }
    // For LHS and Sobol, it's the max steps
    return Math.max(...config.parameters.map((p) => p.steps), 0)
  }, [config.parameters, config.method])

  const isOverLimit = totalRuns > maxRuns

  // Add a new sweep parameter
  const addParameter = () => {
    const usedIds = config.parameters.map((p) => p.parameterId)
    const available = availableParameters.filter((p) => !usedIds.includes(p.id))

    if (available.length === 0) return

    const param = available[0]
    const newSweep: SweepParameter = {
      id: `sweep-${Date.now()}`,
      parameterId: param.id,
      min: param.min ?? param.defaultValue * 0.5,
      max: param.max ?? param.defaultValue * 1.5,
      steps: 10,
    }

    onChange({
      ...config,
      parameters: [...config.parameters, newSweep],
    })
  }

  // Remove a sweep parameter
  const removeParameter = (id: string) => {
    onChange({
      ...config,
      parameters: config.parameters.filter((p) => p.id !== id),
    })
  }

  // Update a sweep parameter
  const updateParameter = (id: string, updates: Partial<SweepParameter>) => {
    onChange({
      ...config,
      parameters: config.parameters.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })
  }

  // Get parameter definition
  const getParamDef = (parameterId: string) => {
    return availableParameters.find((p) => p.id === parameterId)
  }

  // Get unused parameters
  const unusedParameters = availableParameters.filter(
    (p) => !config.parameters.some((sp) => sp.parameterId === p.id)
  )

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Method selection */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 uppercase mb-2">
          Sampling Method
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'grid', name: 'Grid', description: 'Full factorial grid' },
            { id: 'latin-hypercube', name: 'LHS', description: 'Latin Hypercube' },
            { id: 'sobol', name: 'Sobol', description: 'Sobol sequence' },
          ].map((method) => (
            <button
              key={method.id}
              onClick={() => onChange({ ...config, method: method.id as SweepConfig['method'] })}
              className={`
                p-2 rounded-lg text-center transition-all
                ${config.method === method.id
                  ? 'bg-emerald-500/20 border-2 border-emerald-500'
                  : 'bg-zinc-900 border-2 border-transparent hover:bg-zinc-800'
                }
              `}
            >
              <div className={`text-sm font-medium ${config.method === method.id ? 'text-emerald-400' : 'text-zinc-300'}`}>
                {method.name}
              </div>
              <div className="text-xs text-zinc-500">{method.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Sweep parameters */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-zinc-400 uppercase">
            Parameters to Sweep
          </label>
          {unusedParameters.length > 0 && (
            <button
              onClick={addParameter}
              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
            >
              <Plus className="w-3 h-3" />
              Add Parameter
            </button>
          )}
        </div>

        {config.parameters.length === 0 ? (
          <div className="p-4 border border-dashed border-zinc-700 rounded-lg text-center">
            <Grid3X3 className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-400">No parameters selected</p>
            <button
              onClick={addParameter}
              className="mt-2 text-sm text-emerald-400 hover:text-emerald-300"
            >
              Add a parameter to sweep
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {config.parameters.map((sweep) => {
              const paramDef = getParamDef(sweep.parameterId)
              if (!paramDef) return null

              return (
                <div
                  key={sweep.id}
                  className="p-3 bg-zinc-900 rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <select
                      value={sweep.parameterId}
                      onChange={(e) =>
                        updateParameter(sweep.id, { parameterId: e.target.value })
                      }
                      className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value={sweep.parameterId}>{paramDef.name}</option>
                      {unusedParameters.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeParameter(sweep.id)}
                      className="p-1 text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Range inputs */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">Min</label>
                      <input
                        type="number"
                        value={sweep.min}
                        onChange={(e) =>
                          updateParameter(sweep.id, { min: parseFloat(e.target.value) })
                        }
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">Max</label>
                      <input
                        type="number"
                        value={sweep.max}
                        onChange={(e) =>
                          updateParameter(sweep.id, { max: parseFloat(e.target.value) })
                        }
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">Steps</label>
                      <input
                        type="number"
                        value={sweep.steps}
                        min={2}
                        max={100}
                        onChange={(e) =>
                          updateParameter(sweep.id, { steps: parseInt(e.target.value) || 2 })
                        }
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Range preview */}
                  <div className="text-xs text-zinc-500">
                    {sweep.min} {paramDef.unit} → {sweep.max} {paramDef.unit} ({sweep.steps} steps)
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Analysis options */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 uppercase mb-2">
          Analysis Options
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.enableSensitivity}
              onChange={(e) =>
                onChange({ ...config, enableSensitivity: e.target.checked })
              }
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
            />
            <span className="text-sm text-zinc-300">Sensitivity Analysis</span>
            <span className="text-xs text-zinc-500">(Sobol indices)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.enableUncertainty}
              onChange={(e) =>
                onChange({ ...config, enableUncertainty: e.target.checked })
              }
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
            />
            <span className="text-sm text-zinc-300">Uncertainty Quantification</span>
            <span className="text-xs text-zinc-500">(Bootstrap confidence intervals)</span>
          </label>
        </div>
      </div>

      {/* Summary */}
      <div className={`p-3 rounded-lg ${isOverLimit ? 'bg-red-500/10 border border-red-500/50' : 'bg-zinc-900'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-zinc-300">Total Runs</span>
          <span className={`text-lg font-bold ${isOverLimit ? 'text-red-400' : 'text-white'}`}>
            {totalRuns.toLocaleString()}
          </span>
        </div>

        {isOverLimit && (
          <div className="flex items-center gap-2 text-xs text-red-400 mb-2">
            <AlertTriangle className="w-3 h-3" />
            Exceeds maximum of {maxRuns.toLocaleString()} runs
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-zinc-500">Est. Cost:</span>
            <span className="ml-1 text-zinc-300">
              ${estimatedCost?.toFixed(2) ?? (totalRuns * 0.001).toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-zinc-500">Est. Time:</span>
            <span className="ml-1 text-zinc-300">
              {estimatedTime ?? `~${Math.ceil(totalRuns * 0.5)} seconds`}
            </span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 mt-0.5" />
          <div className="text-xs text-zinc-300">
            <p className="font-medium text-blue-400 mb-1">About Parameter Sweeps</p>
            <p>
              Grid search evaluates all combinations. For high-dimensional sweeps, use Latin
              Hypercube Sampling (LHS) or Sobol sequences for better coverage with fewer samples.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
