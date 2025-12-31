'use client'

import * as React from 'react'
import { Sun, Wind, Battery, Droplets, Thermometer, Beaker, Info } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export type Domain = 'solar' | 'wind' | 'battery' | 'hydrogen' | 'thermal' | 'general'
export type SimulationTier = 1 | 2 | 3

export interface SystemConfig {
  id: string
  name: string
  domain: Domain
  description: string
  defaultParameters: Record<string, number>
}

interface SetupTabProps {
  domain: Domain
  onDomainChange: (domain: Domain) => void
  system: string
  onSystemChange: (system: string) => void
  tier: SimulationTier
  onTierChange: (tier: SimulationTier) => void
  description: string
  onDescriptionChange: (description: string) => void
  availableSystems: SystemConfig[]
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const DOMAINS: Array<{ id: Domain; name: string; icon: React.ElementType; color: string }> = [
  { id: 'solar', name: 'Solar', icon: Sun, color: 'amber' },
  { id: 'wind', name: 'Wind', icon: Wind, color: 'sky' },
  { id: 'battery', name: 'Battery', icon: Battery, color: 'green' },
  { id: 'hydrogen', name: 'Hydrogen', icon: Droplets, color: 'blue' },
  { id: 'thermal', name: 'Thermal', icon: Thermometer, color: 'red' },
  { id: 'general', name: 'General', icon: Beaker, color: 'purple' },
]

const TIER_INFO: Record<SimulationTier, { name: string; description: string; cost: string; time: string }> = {
  1: {
    name: 'Analytical',
    description: 'Fast analytical formulas and equations',
    cost: 'Free',
    time: '< 1 second',
  },
  2: {
    name: 'ML Surrogate',
    description: 'Monte Carlo and machine learning models',
    cost: '~$0.05/run',
    time: '30-60 seconds',
  },
  3: {
    name: 'Cloud HPC',
    description: 'Full physics simulation with GPU acceleration',
    cost: '~$0.50/run',
    time: '5-15 minutes',
  },
}

// ============================================================================
// Component
// ============================================================================

export function SetupTab({
  domain,
  onDomainChange,
  system,
  onSystemChange,
  tier,
  onTierChange,
  description,
  onDescriptionChange,
  availableSystems,
  className = '',
}: SetupTabProps) {
  // Filter systems by domain
  const domainSystems = availableSystems.filter((s) => s.domain === domain)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Domain Selection */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 uppercase mb-2">
          Domain
        </label>
        <div className="grid grid-cols-3 gap-2">
          {DOMAINS.map((d) => {
            const Icon = d.icon
            const isSelected = domain === d.id

            return (
              <button
                key={d.id}
                onClick={() => onDomainChange(d.id)}
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

      {/* System Selection */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 uppercase mb-2">
          System Type
        </label>
        <select
          value={system}
          onChange={(e) => onSystemChange(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">Select a system...</option>
          {domainSystems.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {system && domainSystems.find((s) => s.id === system)?.description && (
          <p className="mt-1 text-xs text-zinc-500">
            {domainSystems.find((s) => s.id === system)?.description}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 uppercase mb-2">
          Simulation Description
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Describe what you want to simulate..."
          rows={3}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
        />
      </div>

      {/* Tier Selection */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 uppercase mb-2">
          Simulation Tier
        </label>
        <div className="space-y-2">
          {([1, 2, 3] as SimulationTier[]).map((t) => {
            const info = TIER_INFO[t]
            const isSelected = tier === t

            return (
              <button
                key={t}
                onClick={() => onTierChange(t)}
                className={`
                  w-full p-3 rounded-lg text-left transition-all
                  ${isSelected
                    ? 'bg-emerald-500/10 border-2 border-emerald-500'
                    : 'bg-zinc-900 border-2 border-transparent hover:bg-zinc-800'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                        ${isSelected ? 'bg-emerald-500 text-white' : 'bg-zinc-700 text-zinc-400'}
                      `}
                    >
                      {t}
                    </div>
                    <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                      Tier {t}: {info.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-zinc-400">{info.cost}</div>
                    <div className="text-xs text-zinc-500">{info.time}</div>
                  </div>
                </div>
                <p className="mt-1 text-xs text-zinc-500 ml-8">{info.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tier 2/3 notice */}
      {tier > 1 && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-400 mt-0.5" />
            <div>
              <p className="text-sm text-blue-400">Cloud Compute Required</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {tier === 2
                  ? 'This tier uses cloud GPU for Monte Carlo sampling. Estimated cost: ~$0.05 per run.'
                  : 'This tier uses high-performance cloud compute for full physics simulation. Estimated cost: ~$0.50 per run.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Default systems
// ============================================================================

export const DEFAULT_SYSTEMS: SystemConfig[] = [
  // Solar
  { id: 'silicon-pv', name: 'Silicon Photovoltaic', domain: 'solar', description: 'Crystalline silicon solar cell', defaultParameters: { bandgap: 1.12, temperature: 298 } },
  { id: 'perovskite', name: 'Perovskite Solar Cell', domain: 'solar', description: 'Metal halide perovskite absorber', defaultParameters: { bandgap: 1.55, temperature: 298 } },
  { id: 'tandem', name: 'Tandem Cell', domain: 'solar', description: 'Multi-junction tandem solar cell', defaultParameters: { topBandgap: 1.7, bottomBandgap: 1.1 } },
  { id: 'thin-film', name: 'Thin Film (CIGS/CdTe)', domain: 'solar', description: 'Thin film photovoltaic', defaultParameters: { bandgap: 1.15, thickness: 2.0 } },

  // Wind
  { id: 'hawt', name: 'Horizontal Axis Wind Turbine', domain: 'wind', description: '3-blade HAWT design', defaultParameters: { rotorDiameter: 100, ratedPower: 3000 } },
  { id: 'vawt', name: 'Vertical Axis Wind Turbine', domain: 'wind', description: 'Darrieus or Savonius design', defaultParameters: { rotorHeight: 10, rotorDiameter: 5 } },
  { id: 'offshore', name: 'Offshore Wind Farm', domain: 'wind', description: 'Marine wind energy system', defaultParameters: { capacity: 500, turbineCount: 50 } },

  // Battery
  { id: 'lithium-ion', name: 'Lithium-Ion Cell', domain: 'battery', description: 'Li-ion battery cell', defaultParameters: { capacity: 5, voltage: 3.7 } },
  { id: 'solid-state', name: 'Solid-State Battery', domain: 'battery', description: 'Solid electrolyte battery', defaultParameters: { capacity: 10, voltage: 4.0 } },
  { id: 'flow-battery', name: 'Flow Battery', domain: 'battery', description: 'Redox flow battery system', defaultParameters: { power: 100, energy: 400 } },

  // Hydrogen
  { id: 'pem-electrolyzer', name: 'PEM Electrolyzer', domain: 'hydrogen', description: 'Proton exchange membrane electrolysis', defaultParameters: { power: 100, efficiency: 0.7 } },
  { id: 'alkaline-electrolyzer', name: 'Alkaline Electrolyzer', domain: 'hydrogen', description: 'Alkaline water electrolysis', defaultParameters: { power: 500, efficiency: 0.65 } },
  { id: 'soec', name: 'Solid Oxide Electrolyzer', domain: 'hydrogen', description: 'High-temperature electrolysis', defaultParameters: { power: 50, efficiency: 0.85 } },

  // Thermal
  { id: 'heat-exchanger', name: 'Heat Exchanger', domain: 'thermal', description: 'Shell and tube or plate heat exchanger', defaultParameters: { hotInlet: 400, coldInlet: 300 } },
  { id: 'thermal-storage', name: 'Thermal Energy Storage', domain: 'thermal', description: 'Sensible or latent heat storage', defaultParameters: { capacity: 100, temperature: 350 } },
  { id: 'heat-pump', name: 'Heat Pump', domain: 'thermal', description: 'Air or ground source heat pump', defaultParameters: { heatingCapacity: 10, cop: 3.5 } },

  // General
  { id: 'thermodynamic-cycle', name: 'Thermodynamic Cycle', domain: 'general', description: 'Generic power cycle analysis', defaultParameters: { hotTemp: 500, coldTemp: 300 } },
  { id: 'mass-transfer', name: 'Mass Transfer', domain: 'general', description: 'Diffusion and convection analysis', defaultParameters: { concentration: 1.0, diffusivity: 1e-9 } },
]
