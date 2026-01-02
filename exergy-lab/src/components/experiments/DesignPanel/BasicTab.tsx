'use client'

import * as React from 'react'
import { Sun, Wind, Battery, Droplets, Thermometer, Beaker, Plus, X, Target } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export type ExperimentDomain = 'solar' | 'wind' | 'battery' | 'hydrogen' | 'thermal' | 'general'

export interface ExperimentObjective {
  id: string
  text: string
  isQuantitative: boolean
  targetValue?: number
  targetUnit?: string
}

export interface ExperimentConstraint {
  id: string
  type: 'budget' | 'time' | 'equipment' | 'materials' | 'safety' | 'other'
  description: string
  value?: string
}

export interface BasicConfig {
  title: string
  domain: ExperimentDomain
  description: string
  objectives: ExperimentObjective[]
  constraints: ExperimentConstraint[]
  hypothesis?: string
}

export interface BasicTabProps {
  config: BasicConfig
  onChange: (config: BasicConfig) => void
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const DOMAINS: Array<{ id: ExperimentDomain; name: string; icon: React.ElementType; color: string }> = [
  { id: 'solar', name: 'Solar', icon: Sun, color: 'amber' },
  { id: 'wind', name: 'Wind', icon: Wind, color: 'sky' },
  { id: 'battery', name: 'Battery', icon: Battery, color: 'green' },
  { id: 'hydrogen', name: 'Hydrogen', icon: Droplets, color: 'blue' },
  { id: 'thermal', name: 'Thermal', icon: Thermometer, color: 'red' },
  { id: 'general', name: 'General', icon: Beaker, color: 'purple' },
]

const CONSTRAINT_TYPES: Array<{ id: ExperimentConstraint['type']; label: string }> = [
  { id: 'budget', label: 'Budget' },
  { id: 'time', label: 'Time' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'materials', label: 'Materials' },
  { id: 'safety', label: 'Safety' },
  { id: 'other', label: 'Other' },
]

// ============================================================================
// Component
// ============================================================================

export function BasicTab({ config, onChange, className = '' }: BasicTabProps) {
  // Add objective
  const addObjective = () => {
    const newObjective: ExperimentObjective = {
      id: `obj-${Date.now()}`,
      text: '',
      isQuantitative: false,
    }
    onChange({
      ...config,
      objectives: [...config.objectives, newObjective],
    })
  }

  // Update objective
  const updateObjective = (id: string, updates: Partial<ExperimentObjective>) => {
    onChange({
      ...config,
      objectives: config.objectives.map((obj) =>
        obj.id === id ? { ...obj, ...updates } : obj
      ),
    })
  }

  // Remove objective
  const removeObjective = (id: string) => {
    onChange({
      ...config,
      objectives: config.objectives.filter((obj) => obj.id !== id),
    })
  }

  // Add constraint
  const addConstraint = () => {
    const newConstraint: ExperimentConstraint = {
      id: `con-${Date.now()}`,
      type: 'other',
      description: '',
    }
    onChange({
      ...config,
      constraints: [...config.constraints, newConstraint],
    })
  }

  // Update constraint
  const updateConstraint = (id: string, updates: Partial<ExperimentConstraint>) => {
    onChange({
      ...config,
      constraints: config.constraints.map((con) =>
        con.id === id ? { ...con, ...updates } : con
      ),
    })
  }

  // Remove constraint
  const removeConstraint = (id: string) => {
    onChange({
      ...config,
      constraints: config.constraints.filter((con) => con.id !== id),
    })
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 uppercase mb-2">
          Experiment Title
        </label>
        <input
          type="text"
          value={config.title}
          onChange={(e) => onChange({ ...config, title: e.target.value })}
          placeholder="e.g., Perovskite Solar Cell Optimization"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* Domain Selection */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 uppercase mb-2">
          Research Domain
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {DOMAINS.map((d) => {
            const Icon = d.icon
            const isSelected = config.domain === d.id

            return (
              <button
                key={d.id}
                onClick={() => onChange({ ...config, domain: d.id })}
                className={`
                  flex flex-col items-center gap-1 p-3 rounded-lg transition-all
                  ${isSelected
                    ? `bg-${d.color}-500/20 border-2 border-${d.color}-500 text-${d.color}-400`
                    : 'bg-zinc-900 border-2 border-transparent text-zinc-400 hover:bg-zinc-800'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{d.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 uppercase mb-2">
          Description
        </label>
        <textarea
          value={config.description}
          onChange={(e) => onChange({ ...config, description: e.target.value })}
          placeholder="Describe the experiment and what you hope to achieve..."
          rows={4}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
        />
      </div>

      {/* Hypothesis */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 uppercase mb-2">
          Hypothesis (Optional)
        </label>
        <textarea
          value={config.hypothesis || ''}
          onChange={(e) => onChange({ ...config, hypothesis: e.target.value })}
          placeholder="What do you expect to find? e.g., 'Adding 5% cesium will improve stability...'"
          rows={2}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
        />
      </div>

      {/* Objectives */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-zinc-400 uppercase">
            Objectives
          </label>
          <button
            onClick={addObjective}
            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
          >
            <Plus className="w-3 h-3" />
            Add Objective
          </button>
        </div>

        {config.objectives.length === 0 ? (
          <div className="p-4 border border-dashed border-zinc-700 rounded-lg text-center">
            <Target className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No objectives defined</p>
            <button
              onClick={addObjective}
              className="mt-2 text-sm text-emerald-400 hover:text-emerald-300"
            >
              Add your first objective
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {config.objectives.map((objective, idx) => (
              <div
                key={objective.id}
                className="p-3 bg-zinc-900 rounded-lg space-y-2"
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs text-zinc-500 mt-2">{idx + 1}.</span>
                  <input
                    type="text"
                    value={objective.text}
                    onChange={(e) =>
                      updateObjective(objective.id, { text: e.target.value })
                    }
                    placeholder="e.g., Achieve >20% efficiency"
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => removeObjective(objective.id)}
                    className="p-1 text-zinc-500 hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <label className="flex items-center gap-2 text-xs text-zinc-400">
                  <input
                    type="checkbox"
                    checked={objective.isQuantitative}
                    onChange={(e) =>
                      updateObjective(objective.id, { isQuantitative: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500"
                  />
                  Quantitative target
                </label>

                {objective.isQuantitative && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={objective.targetValue || ''}
                      onChange={(e) =>
                        updateObjective(objective.id, {
                          targetValue: parseFloat(e.target.value),
                        })
                      }
                      placeholder="Value"
                      className="w-24 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <input
                      type="text"
                      value={objective.targetUnit || ''}
                      onChange={(e) =>
                        updateObjective(objective.id, { targetUnit: e.target.value })
                      }
                      placeholder="Unit"
                      className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Constraints */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-zinc-400 uppercase">
            Constraints
          </label>
          <button
            onClick={addConstraint}
            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
          >
            <Plus className="w-3 h-3" />
            Add Constraint
          </button>
        </div>

        {config.constraints.length === 0 ? (
          <p className="text-sm text-zinc-500 italic">No constraints defined</p>
        ) : (
          <div className="space-y-2">
            {config.constraints.map((constraint) => (
              <div
                key={constraint.id}
                className="p-3 bg-zinc-900 rounded-lg flex items-center gap-2"
              >
                <select
                  value={constraint.type}
                  onChange={(e) =>
                    updateConstraint(constraint.id, {
                      type: e.target.value as ExperimentConstraint['type'],
                    })
                  }
                  className="w-28 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {CONSTRAINT_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={constraint.description}
                  onChange={(e) =>
                    updateConstraint(constraint.id, { description: e.target.value })
                  }
                  placeholder="Constraint details..."
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <input
                  type="text"
                  value={constraint.value || ''}
                  onChange={(e) =>
                    updateConstraint(constraint.id, { value: e.target.value })
                  }
                  placeholder="Value"
                  className="w-24 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  onClick={() => removeConstraint(constraint.id)}
                  className="p-1 text-zinc-500 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
