/**
 * Setup Phase Component
 *
 * Initial phase where users define their experiment goal and domain.
 */

'use client'

import { useState } from 'react'
import type { UseExperimentWorkflowReturn } from '@/hooks/useExperimentWorkflow'
import type { ExperimentDomain } from '@/types/experiment-workflow'
import { Card, Button } from '@/components/ui'
import { Sparkles, Plus, X, FlaskConical } from 'lucide-react'
import {
  Sun,
  Wind,
  Battery,
  Flame,
  Droplets,
  Recycle,
  Factory,
  Zap,
  Globe,
  Atom,
} from 'lucide-react'

interface SetupPhaseProps {
  workflow: UseExperimentWorkflowReturn
}

// Domain icons mapping
const DOMAIN_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'solar-energy': Sun,
  'wind-energy': Wind,
  'battery-storage': Battery,
  'geothermal': Flame,
  'hydrogen-fuel': Droplets,
  'biomass': Recycle,
  'carbon-capture': Factory,
  'energy-efficiency': Zap,
  'grid-optimization': Globe,
  'materials-science': Atom,
}

const DOMAINS: Array<{ id: ExperimentDomain; label: string }> = [
  { id: 'solar-energy', label: 'Solar Energy' },
  { id: 'wind-energy', label: 'Wind Energy' },
  { id: 'battery-storage', label: 'Battery Storage' },
  { id: 'geothermal', label: 'Geothermal' },
  { id: 'hydrogen-fuel', label: 'Hydrogen Fuel' },
  { id: 'biomass', label: 'Biomass' },
  { id: 'carbon-capture', label: 'Carbon Capture' },
  { id: 'energy-efficiency', label: 'Energy Efficiency' },
  { id: 'grid-optimization', label: 'Grid Optimization' },
  { id: 'materials-science', label: 'Materials Science' },
]

export function SetupPhase({ workflow }: SetupPhaseProps) {
  const [newObjective, setNewObjective] = useState('')

  const handleAddObjective = () => {
    if (newObjective.trim()) {
      workflow.setObjectives([...workflow.objectives, newObjective.trim()])
      setNewObjective('')
    }
  }

  const handleRemoveObjective = (index: number) => {
    workflow.setObjectives(workflow.objectives.filter((_, i) => i !== index))
  }

  const handleGenerate = () => {
    if (workflow.canGenerate) {
      workflow.generatePlan()
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <FlaskConical className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Design Your Experiment</h2>
        </div>
        <p className="text-muted">
          Describe what you want to test and AI will generate a detailed protocol
        </p>
      </div>

      {/* Domain Selection */}
      <Card className="p-6 bg-card-dark border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Select Domain</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {DOMAINS.map((domain) => {
            const Icon = DOMAIN_ICONS[domain.id] || Atom
            const isSelected = workflow.domain === domain.id

            return (
              <button
                key={domain.id}
                onClick={() => workflow.setDomain(domain.id)}
                className={`
                  p-4 rounded-lg border-2 transition-all hover:scale-105
                  ${
                    isSelected
                      ? 'bg-primary/10 border-primary'
                      : 'bg-background border-border hover:border-primary/50'
                  }
                `}
              >
                <div className="flex flex-col items-center gap-2">
                  <Icon
                    className={`w-6 h-6 ${isSelected ? 'text-primary' : 'text-muted'}`}
                  />
                  <span
                    className={`text-xs font-medium ${
                      isSelected ? 'text-foreground' : 'text-muted'
                    }`}
                  >
                    {domain.label}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      {/* Goal Input */}
      <Card className="p-6 bg-card-dark border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Experiment Goal
          <span className="text-red-400 ml-1">*</span>
        </h3>
        <textarea
          value={workflow.goal}
          onChange={(e) => workflow.setGoal(e.target.value)}
          placeholder="Describe what you want to test or investigate. Example: 'Synthesize a high-efficiency perovskite solar cell with lead-free materials and test its stability under humid conditions'"
          rows={4}
          className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-muted">
            Be specific about materials, conditions, and what you want to measure
          </p>
          <span
            className={`text-xs ${workflow.goal.length > 500 ? 'text-amber-400' : 'text-muted'}`}
          >
            {workflow.goal.length} / 1000
          </span>
        </div>
      </Card>

      {/* Objectives (Optional) */}
      <Card className="p-6 bg-card-dark border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Measurable Objectives
          <span className="text-xs font-normal text-muted ml-2">(Optional)</span>
        </h3>

        {/* Objectives List */}
        {workflow.objectives.length > 0 && (
          <div className="space-y-2 mb-4">
            {workflow.objectives.map((objective, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-3 bg-background rounded-lg border border-border"
              >
                <span className="text-sm text-foreground flex-1">{objective}</span>
                <button
                  onClick={() => handleRemoveObjective(index)}
                  className="p-1 hover:bg-background-hover rounded transition-colors"
                >
                  <X className="w-4 h-4 text-muted" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Objective */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newObjective}
            onChange={(e) => setNewObjective(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddObjective()
              }
            }}
            placeholder="e.g., Achieve >20% power conversion efficiency"
            className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Button onClick={handleAddObjective} size="sm" variant="outline">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-xs text-muted mt-2">
          Define specific, measurable outcomes you want to achieve (e.g., efficiency targets,
          stability duration, cost limits)
        </p>
      </Card>

      {/* Source Papers Info */}
      {workflow.sourcePapers && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Using context from {workflow.sourcePapers.ids.length} research paper
                {workflow.sourcePapers.ids.length > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-muted mt-1">
                The protocol will reference methodologies from your selected papers
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Generate Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleGenerate}
          disabled={!workflow.canGenerate}
          size="lg"
          className="min-w-48"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate Protocol
        </Button>
      </div>

      {/* Instructions */}
      <div className="p-4 rounded-lg bg-background border border-border">
        <h4 className="text-sm font-medium text-foreground mb-2">Quick Tips:</h4>
        <ul className="text-xs text-muted space-y-1 list-disc list-inside">
          <li>Include specific materials, equipment, or techniques you want to use</li>
          <li>Mention environmental conditions (temperature, pressure, atmosphere)</li>
          <li>Specify what you want to measure or characterize</li>
          <li>Note any safety constraints or resource limitations</li>
        </ul>
      </div>
    </div>
  )
}
