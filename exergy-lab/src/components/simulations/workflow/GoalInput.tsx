'use client'

/**
 * GoalInput Component
 *
 * Natural language input for describing simulation goals with helpful guidance.
 */

import { useState } from 'react'
import { Lightbulb, AlertCircle } from 'lucide-react'
import type { SimulationType } from '@/types/simulation-workflow'

const EXAMPLE_GOALS: Record<SimulationType, string> = {
  geothermal:
    'Analyze a binary cycle geothermal plant with 180C reservoir temperature, 25 MW capacity, and R245fa working fluid',
  solar:
    'Compare PV cell efficiency for different bandgap materials under AM1.5 spectrum at 25C and 1000 W/m2 irradiance',
  wind:
    'Model a 5 MW offshore wind turbine at 12 m/s average wind speed with 120m hub height and wake effects',
  battery:
    'Simulate LFP battery degradation over 1000 cycles at 1C charge rate and 80% DOD with thermal management',
  hydrogen:
    'Analyze PEM electrolyzer efficiency at 80C with 30 bar output pressure and 95% current efficiency',
  'carbon-capture':
    'Model DAC system with amine sorbent at 400 ppm CO2 inlet, 95% capture rate, and regeneration at 120C',
  materials:
    'Predict catalyst performance for CO2 reduction with Cu-based electrodes at -0.8V vs RHE',
  process:
    'Optimize heat integration for ammonia synthesis plant with 500 tpd capacity and 80% conversion efficiency',
}

const PLACEHOLDER_TEXT = `Describe what you want to simulate...

Examples:
- "Analyze a binary cycle geothermal plant with 180C reservoir and 25 MW capacity"
- "Compare PV cell efficiency for different bandgap materials under AM1.5"
- "Model battery degradation for a 100 kWh lithium-ion pack over 1000 cycles"

Be specific about operating conditions, materials, and what outputs you care about.`

export interface GoalInputProps {
  value: string
  onChange: (value: string) => void
  detectedType: SimulationType | null
}

export function GoalInput({ value, onChange, detectedType }: GoalInputProps) {
  const [isFocused, setIsFocused] = useState(false)

  const charCount = value.length
  const minChars = 20
  const isShort = charCount > 0 && charCount < minChars
  const recommendedMinChars = 50

  // Get relevant example based on detected type
  const relevantExample = detectedType ? EXAMPLE_GOALS[detectedType] : null

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">
        Describe Your Simulation Goal
      </label>

      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={PLACEHOLDER_TEXT}
          rows={8}
          className={`
            w-full p-4 rounded-lg bg-card-dark border text-foreground text-base resize-none
            placeholder:text-muted/50 transition-colors
            focus:outline-none focus:ring-2 focus:ring-primary/50
            ${
              isShort
                ? 'border-amber-500/50'
                : isFocused
                ? 'border-primary/50'
                : 'border-border'
            }
          `}
        />

        {/* Character Counter */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <span
            className={`text-xs ${
              isShort
                ? 'text-amber-500'
                : charCount >= recommendedMinChars
                ? 'text-primary'
                : 'text-muted'
            }`}
          >
            {charCount}/500
          </span>
        </div>
      </div>

      {/* Feedback Messages */}
      {isShort && (
        <div className="flex items-center gap-2 text-xs text-amber-500">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>
            Please provide more detail (at least {minChars} characters, {recommendedMinChars}+ recommended)
          </span>
        </div>
      )}

      {/* Example Suggestion */}
      {relevantExample && charCount < recommendedMinChars && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-primary mb-1">
                Example for {detectedType}:
              </p>
              <p className="text-xs text-muted">&quot;{relevantExample}&quot;</p>
              <button
                onClick={() => onChange(relevantExample)}
                className="text-xs text-primary hover:underline mt-1"
              >
                Use this example
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <p className="text-xs text-muted">
        <strong className="text-foreground">Tip:</strong> Be specific about operating conditions, materials, and what outputs you care about.
        The AI will generate appropriate parameters based on your description.
      </p>
    </div>
  )
}

export default GoalInput
