'use client'

/**
 * SimulationTypeSelector Component
 *
 * Dropdown for selecting simulation type with AI auto-detection indicator.
 */

import {
  Flame,
  Sun,
  Wind,
  Battery,
  Droplets,
  Cloud,
  Atom,
  Factory,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui'
import type { SimulationType } from '@/types/simulation-workflow'
import { SIMULATION_TYPES } from '@/types/simulation-workflow'

const TYPE_ICONS: Record<SimulationType, typeof Flame> = {
  geothermal: Flame,
  solar: Sun,
  wind: Wind,
  battery: Battery,
  hydrogen: Droplets,
  'carbon-capture': Cloud,
  materials: Atom,
  process: Factory,
}

export interface SimulationTypeSelectorProps {
  selectedType: SimulationType | null
  detectedType: SimulationType | null
  onTypeSelect: (type: SimulationType | null) => void
}

export function SimulationTypeSelector({
  selectedType,
  detectedType,
  onTypeSelect,
}: SimulationTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-white">
          Simulation Type
        </label>
        {detectedType && !selectedType && (
          <div className="flex items-center gap-1.5 text-xs text-foreground-subtle">
            <Sparkles className="w-3 h-3 text-primary" />
            AI detected: <Badge variant="secondary" size="sm">{detectedType}</Badge>
          </div>
        )}
      </div>

      <div className="relative">
        <select
          value={selectedType || ''}
          onChange={(e) => onTypeSelect(e.target.value as SimulationType || null)}
          className="w-full h-12 px-4 pr-10 rounded-lg bg-card-dark border border-border text-white
                     appearance-none cursor-pointer hover:border-primary/50 transition-colors
                     focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">
            Auto-detect from description
          </option>
          {SIMULATION_TYPES.map((type) => {
            const Icon = TYPE_ICONS[type.id]
            return (
              <option key={type.id} value={type.id}>
                {type.label} - {type.description}
              </option>
            )
          })}
        </select>

        {/* Custom Dropdown Arrow */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            className="w-5 h-5 text-foreground-subtle"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Type Grid (Alternative Visual Selection) */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {SIMULATION_TYPES.map((type) => {
          const Icon = TYPE_ICONS[type.id]
          const isSelected = selectedType === type.id
          const isDetected = detectedType === type.id && !selectedType

          return (
            <button
              key={type.id}
              onClick={() => onTypeSelect(isSelected ? null : type.id)}
              className={`
                flex flex-col items-center gap-1 p-2 rounded-lg border transition-all
                ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary'
                    : isDetected
                    ? 'border-primary/30 bg-primary/5 text-primary/70'
                    : 'border-border bg-card-dark text-foreground-subtle hover:border-primary/30'
                }
              `}
              title={type.description}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-medium truncate w-full text-center">
                {type.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Help Text */}
      <p className="text-xs text-foreground-subtle">
        Leave as &quot;Auto-detect&quot; and the AI will determine the best type from your description.
        Or select manually to override.
      </p>
    </div>
  )
}

export default SimulationTypeSelector
