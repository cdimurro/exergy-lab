'use client'

import * as React from 'react'
import { useState } from 'react'
import { Info, RotateCcw, Download, Upload, ChevronDown, ChevronUp } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface ParameterDefinition {
  id: string
  name: string
  description?: string
  unit: string
  defaultValue: number
  min?: number
  max?: number
  step?: number
  category?: string
  isAdvanced?: boolean
}

export interface ParameterValue {
  id: string
  value: number
}

interface ParamsTabProps {
  parameters: ParameterDefinition[]
  values: Record<string, number>
  onChange: (id: string, value: number) => void
  onReset: () => void
  onImport?: (values: Record<string, number>) => void
  onExport?: () => Record<string, number>
  showAdvanced?: boolean
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function ParamsTab({
  parameters,
  values,
  onChange,
  onReset,
  onImport,
  onExport,
  showAdvanced: initialShowAdvanced = false,
  className = '',
}: ParamsTabProps) {
  const [showAdvanced, setShowAdvanced] = useState(initialShowAdvanced)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['basic']))

  // Group parameters by category
  const groupedParams = React.useMemo(() => {
    const groups: Record<string, ParameterDefinition[]> = { basic: [] }

    parameters.forEach((param) => {
      if (param.isAdvanced && !showAdvanced) return

      const category = param.category || 'basic'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(param)
    })

    return groups
  }, [parameters, showAdvanced])

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  // Handle import from JSON
  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const text = await file.text()
      try {
        const imported = JSON.parse(text)
        if (onImport) {
          onImport(imported)
        }
      } catch (err) {
        console.error('Failed to parse parameter file:', err)
      }
    }
    input.click()
  }

  // Handle export to JSON
  const handleExport = () => {
    if (!onExport) return

    const data = onExport()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'simulation-parameters.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Check if value is at default
  const isDefault = (param: ParameterDefinition) => {
    return values[param.id] === param.defaultValue
  }

  // Count modified parameters
  const modifiedCount = parameters.filter((p) => !isDefault(p)).length

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset All
          </button>
          {modifiedCount > 0 && (
            <span className="text-xs text-amber-400">
              ({modifiedCount} modified)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onImport && (
            <button
              onClick={handleImport}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <Upload className="w-3 h-3" />
              Import
            </button>
          )}
          {onExport && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <Download className="w-3 h-3" />
              Export
            </button>
          )}
        </div>
      </div>

      {/* Parameter categories */}
      {Object.entries(groupedParams).map(([category, params]) => {
        if (params.length === 0) return null

        const isExpanded = expandedCategories.has(category)
        const categoryModified = params.filter((p) => !isDefault(p)).length

        return (
          <div key={category} className="border border-zinc-700 rounded-lg overflow-hidden">
            {/* Category header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full px-4 py-2 bg-zinc-900 flex items-center justify-between hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-200 capitalize">
                  {category.replace(/-/g, ' ')}
                </span>
                <span className="text-xs text-zinc-500">({params.length})</span>
                {categoryModified > 0 && (
                  <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                    {categoryModified} modified
                  </span>
                )}
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-zinc-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-500" />
              )}
            </button>

            {/* Parameters */}
            {isExpanded && (
              <div className="p-4 space-y-4 bg-zinc-800/50">
                {params.map((param) => {
                  const value = values[param.id] ?? param.defaultValue
                  const isModified = !isDefault(param)

                  return (
                    <div key={param.id}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm text-zinc-300 flex items-center gap-1">
                          {param.name}
                          {param.description && (
                            <span className="group relative">
                              <Info className="w-3 h-3 text-zinc-500" />
                              <span className="absolute left-0 bottom-full mb-1 w-48 p-2 bg-zinc-700 text-xs text-zinc-300 rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                {param.description}
                              </span>
                            </span>
                          )}
                          {isModified && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          )}
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500">{param.unit}</span>
                          {isModified && (
                            <button
                              onClick={() => onChange(param.id, param.defaultValue)}
                              className="text-xs text-zinc-500 hover:text-white"
                              title="Reset to default"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Slider */}
                        {param.min !== undefined && param.max !== undefined && (
                          <input
                            type="range"
                            min={param.min}
                            max={param.max}
                            step={param.step || (param.max - param.min) / 100}
                            value={value}
                            onChange={(e) => onChange(param.id, parseFloat(e.target.value))}
                            className="flex-1 h-2 bg-zinc-700 rounded-full appearance-none cursor-pointer
                              [&::-webkit-slider-thumb]:appearance-none
                              [&::-webkit-slider-thumb]:w-4
                              [&::-webkit-slider-thumb]:h-4
                              [&::-webkit-slider-thumb]:rounded-full
                              [&::-webkit-slider-thumb]:bg-emerald-500
                              [&::-webkit-slider-thumb]:cursor-pointer"
                          />
                        )}

                        {/* Number input */}
                        <input
                          type="number"
                          value={value}
                          min={param.min}
                          max={param.max}
                          step={param.step}
                          onChange={(e) => onChange(param.id, parseFloat(e.target.value) || 0)}
                          className="w-24 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      {/* Range labels */}
                      {param.min !== undefined && param.max !== undefined && (
                        <div className="flex justify-between text-xs text-zinc-500 mt-1">
                          <span>{param.min}</span>
                          <span className="text-zinc-600">
                            Default: {param.defaultValue}
                          </span>
                          <span>{param.max}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Show advanced toggle */}
      {parameters.some((p) => p.isAdvanced) && (
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full py-2 text-sm text-zinc-400 hover:text-white border border-dashed border-zinc-700 rounded-lg transition-colors"
        >
          {showAdvanced ? 'Hide Advanced Parameters' : 'Show Advanced Parameters'}
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Default parameter sets
// ============================================================================

export const SOLAR_PARAMETERS: ParameterDefinition[] = [
  { id: 'bandgap', name: 'Bandgap', unit: 'eV', defaultValue: 1.12, min: 0.5, max: 3.0, step: 0.01, description: 'Material bandgap energy' },
  { id: 'temperature', name: 'Temperature', unit: 'K', defaultValue: 298, min: 200, max: 400, step: 1, description: 'Operating temperature' },
  { id: 'irradiance', name: 'Irradiance', unit: 'W/m2', defaultValue: 1000, min: 100, max: 1500, step: 10, description: 'Solar irradiance (AM1.5G = 1000)' },
  { id: 'seriesResistance', name: 'Series Resistance', unit: 'ohm', defaultValue: 0.5, min: 0, max: 10, step: 0.1, category: 'losses', description: 'Cell series resistance' },
  { id: 'shuntResistance', name: 'Shunt Resistance', unit: 'ohm', defaultValue: 1000, min: 10, max: 10000, step: 10, category: 'losses', description: 'Cell shunt resistance' },
  { id: 'reflectance', name: 'Front Reflectance', unit: '%', defaultValue: 5, min: 0, max: 20, step: 0.5, category: 'optics', isAdvanced: true },
  { id: 'cellArea', name: 'Cell Area', unit: 'cm2', defaultValue: 1, min: 0.1, max: 400, step: 0.1, isAdvanced: true },
]

export const BATTERY_PARAMETERS: ParameterDefinition[] = [
  { id: 'capacity', name: 'Nominal Capacity', unit: 'Ah', defaultValue: 5, min: 0.1, max: 100, step: 0.1 },
  { id: 'voltage', name: 'Nominal Voltage', unit: 'V', defaultValue: 3.7, min: 1, max: 5, step: 0.1 },
  { id: 'cRate', name: 'C-Rate', unit: 'C', defaultValue: 1, min: 0.1, max: 10, step: 0.1, description: 'Charge/discharge rate' },
  { id: 'temperature', name: 'Temperature', unit: 'C', defaultValue: 25, min: -20, max: 60, step: 1 },
  { id: 'soc', name: 'Initial SOC', unit: '%', defaultValue: 100, min: 0, max: 100, step: 1, description: 'State of charge' },
  { id: 'internalR', name: 'Internal Resistance', unit: 'mohm', defaultValue: 50, min: 1, max: 500, step: 1, category: 'losses' },
]

export const HYDROGEN_PARAMETERS: ParameterDefinition[] = [
  { id: 'power', name: 'Input Power', unit: 'kW', defaultValue: 100, min: 1, max: 10000, step: 1 },
  { id: 'current', name: 'Current Density', unit: 'A/cm2', defaultValue: 1.5, min: 0.1, max: 4, step: 0.1 },
  { id: 'temperature', name: 'Operating Temperature', unit: 'C', defaultValue: 80, min: 20, max: 900, step: 5 },
  { id: 'pressure', name: 'Operating Pressure', unit: 'bar', defaultValue: 30, min: 1, max: 100, step: 1 },
  { id: 'stackEfficiency', name: 'Stack Efficiency', unit: '%', defaultValue: 70, min: 50, max: 95, step: 1 },
]
