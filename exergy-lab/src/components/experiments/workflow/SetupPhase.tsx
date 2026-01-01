/**
 * Setup Phase Component
 *
 * Initial phase where users define their experiment goal and domain.
 * Uses shared workflow components for consistent UI.
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
import {
  WorkflowLayout,
  WorkflowSectionCard,
  DomainTypeGrid,
  GoalTextarea,
  GuidanceSidebar,
  type GridItem,
} from '@/components/shared/workflow'

interface SetupPhaseProps {
  workflow: UseExperimentWorkflowReturn
}

// Domain grid items with icons
const DOMAIN_ITEMS: GridItem[] = [
  { id: 'solar-energy', label: 'Solar Energy', icon: Sun },
  { id: 'wind-energy', label: 'Wind Energy', icon: Wind },
  { id: 'battery-storage', label: 'Battery Storage', icon: Battery },
  { id: 'geothermal', label: 'Geothermal', icon: Flame },
  { id: 'hydrogen-fuel', label: 'Hydrogen Fuel', icon: Droplets },
  { id: 'biomass', label: 'Biomass', icon: Recycle },
  { id: 'carbon-capture', label: 'Carbon Capture', icon: Factory },
  { id: 'energy-efficiency', label: 'Energy Efficiency', icon: Zap },
  { id: 'grid-optimization', label: 'Grid Optimization', icon: Globe },
  { id: 'materials-science', label: 'Materials Science', icon: Atom },
]

// Guidance sidebar content
const HOW_IT_WORKS = [
  { step: 1, title: 'Select Domain', description: 'Choose the research area for your experiment.' },
  { step: 2, title: 'Define Goal', description: 'Describe what you want to test or investigate.' },
  { step: 3, title: 'Generate Protocol', description: 'AI creates a detailed experimental protocol.' },
]

const TIPS = [
  'Include specific materials, equipment, or techniques you want to use',
  'Mention environmental conditions (temperature, pressure, atmosphere)',
  'Specify what you want to measure or characterize',
  'Note any safety constraints or resource limitations',
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

  // Sidebar content
  const sidebar = (
    <GuidanceSidebar
      howItWorks={HOW_IT_WORKS}
      tips={TIPS}
    />
  )

  return (
    <WorkflowLayout sidebar={sidebar}>
      {/* Header */}
      <div className="text-center space-y-2 mb-6">
        <div className="flex items-center justify-center gap-2">
          <FlaskConical className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Design Your Experiment</h2>
        </div>
        <p className="text-muted">
          Describe what you want to test and AI will generate a detailed protocol
        </p>
      </div>

      {/* Domain Selection */}
      <WorkflowSectionCard title="Select Domain" icon={Globe}>
        <DomainTypeGrid
          items={DOMAIN_ITEMS}
          selected={workflow.domain}
          onSelect={(id) => workflow.setDomain(id as ExperimentDomain)}
          columns={5}
        />
      </WorkflowSectionCard>

      {/* Goal Input */}
      <WorkflowSectionCard title="Experiment Goal" icon={FlaskConical}>
        <GoalTextarea
          value={workflow.goal}
          onChange={workflow.setGoal}
          placeholder="Describe what you want to test or investigate. Example: 'Synthesize a high-efficiency perovskite solar cell with lead-free materials and test its stability under humid conditions'"
          maxLength={1000}
          minLength={20}
          rows={4}
          required
          helperText="Be specific about materials, conditions, and what you want to measure"
        />
      </WorkflowSectionCard>

      {/* Objectives (Optional) */}
      <WorkflowSectionCard
        title="Measurable Objectives"
        description="(Optional)"
        icon={Sparkles}
      >
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
      </WorkflowSectionCard>

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
    </WorkflowLayout>
  )
}
