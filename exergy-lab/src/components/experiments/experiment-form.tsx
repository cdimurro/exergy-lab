'use client'

import * as React from 'react'
import { Sparkles, Loader2, Plus, X } from 'lucide-react'
import { Button, Input, Textarea, Select, Badge } from '@/components/ui'
import type { ExperimentGoal } from '@/types/experiment'
import type { Domain } from '@/types/discovery'

const DOMAINS: Array<{ value: Domain; label: string }> = [
  { value: 'solar-energy', label: 'Solar Energy' },
  { value: 'wind-energy', label: 'Wind Energy' },
  { value: 'battery-storage', label: 'Battery Storage' },
  { value: 'hydrogen-fuel', label: 'Hydrogen Fuel' },
  { value: 'geothermal', label: 'Geothermal' },
  { value: 'biomass', label: 'Biomass' },
  { value: 'carbon-capture', label: 'Carbon Capture' },
  { value: 'energy-efficiency', label: 'Energy Efficiency' },
  { value: 'grid-optimization', label: 'Grid Optimization' },
  { value: 'materials-science', label: 'Materials Science' },
  { value: 'other', label: 'Other' },
]

export interface ExperimentFormProps {
  onSubmit: (goal: ExperimentGoal) => void
  isLoading?: boolean
}

export function ExperimentForm({ onSubmit, isLoading }: ExperimentFormProps) {
  const [domain, setDomain] = React.useState<Domain>('solar-energy')
  const [description, setDescription] = React.useState('')
  const [objectives, setObjectives] = React.useState<string[]>([''])

  const handleAddObjective = () => {
    setObjectives([...objectives, ''])
  }

  const handleRemoveObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index))
  }

  const handleObjectiveChange = (index: number, value: string) => {
    const newObjectives = [...objectives]
    newObjectives[index] = value
    setObjectives(newObjectives)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!description.trim()) {
      alert('Please provide an experiment description')
      return
    }

    const validObjectives = objectives.filter((obj) => obj.trim())
    if (validObjectives.length === 0) {
      alert('Please provide at least one objective')
      return
    }

    const goal: ExperimentGoal = {
      description: description.trim(),
      domain,
      objectives: validObjectives,
    }

    onSubmit(goal)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Domain Selection */}
      <div>
        <Select
          label="Research Domain"
          value={domain}
          onChange={(value) => setDomain(value as Domain)}
          options={DOMAINS}
          hint="Select the primary research domain for your experiment"
        />
      </div>

      {/* Experiment Description */}
      <div>
        <Textarea
          label="Experiment Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the experiment you want to conduct. Be as specific as possible about what you want to test, measure, or investigate..."
          rows={6}
          hint="Provide a detailed description of your experiment goal"
          disabled={isLoading}
        />
      </div>

      {/* Objectives */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-3">
          Research Objectives
        </label>
        <div className="space-y-3">
          {objectives.map((objective, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="flex-1">
                <Input
                  value={objective}
                  onChange={(e) => handleObjectiveChange(index, e.target.value)}
                  placeholder={`Objective ${index + 1}: e.g., Measure efficiency under various conditions`}
                  disabled={isLoading}
                />
              </div>
              {objectives.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveObjective(index)}
                  disabled={isLoading}
                  type="button"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddObjective}
          disabled={isLoading || objectives.length >= 5}
          className="mt-3"
          type="button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Objective
        </Button>

        {objectives.length >= 5 && (
          <p className="mt-2 text-xs text-amber-600">Maximum 5 objectives allowed</p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={isLoading || !description.trim()}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            AI is Designing Experiment...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            Generate Experiment Protocol
          </>
        )}
      </Button>

      {/* Hints */}
      {!isLoading && (
        <div className="p-4 rounded-lg bg-background-surface border border-border">
          <p className="text-xs font-medium text-foreground mb-2">💡 Tips for Best Results</p>
          <ul className="text-xs text-foreground-muted space-y-1">
            <li>• Be specific about materials, conditions, and measurements</li>
            <li>• Include target parameters (temperature, pressure, duration, etc.)</li>
            <li>• Mention any constraints (budget, equipment, safety)</li>
            <li>• AI will generate materials list, procedure, and safety warnings</li>
          </ul>
        </div>
      )}
    </form>
  )
}
