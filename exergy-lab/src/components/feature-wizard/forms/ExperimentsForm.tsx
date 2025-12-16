'use client'

import * as React from 'react'
import { FlaskConical, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDomainLabel, ACTION_BUTTON_LABELS } from '@/types/wizard'
import type { Domain } from '@/types/discovery'
import type { ExperimentsFormData } from '@/types/wizard'

interface ExperimentsFormProps {
  pageTitle: string
  pageSubtitle: string
  pageIcon: React.ReactNode
  domains: Domain[]
  onSubmit: (data: ExperimentsFormData) => void
  isSubmitting?: boolean
  initialData?: Partial<ExperimentsFormData> | null
}

const COMMON_CONSTRAINTS = [
  'Budget limited',
  'Time constrained',
  'Lab-scale only',
  'Limited equipment',
  'Safety restrictions',
  'Environmental compliance',
]

export function ExperimentsForm({
  pageTitle,
  pageSubtitle,
  pageIcon,
  domains,
  onSubmit,
  isSubmitting = false,
  initialData,
}: ExperimentsFormProps) {
  const [selectedDomain, setSelectedDomain] = React.useState<Domain | null>(
    initialData?.domain || null
  )
  const [description, setDescription] = React.useState(initialData?.description || '')
  const [objectives, setObjectives] = React.useState<string[]>(
    initialData?.objectives?.length ? initialData.objectives : ['']
  )
  const [safetyRequirements, setSafetyRequirements] = React.useState(
    initialData?.safetyRequirements || ''
  )
  const [constraints, setConstraints] = React.useState<string[]>(
    initialData?.constraints || []
  )
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const handleAddObjective = () => {
    setObjectives([...objectives, ''])
  }

  const handleRemoveObjective = (index: number) => {
    if (objectives.length > 1) {
      setObjectives(objectives.filter((_, i) => i !== index))
    }
  }

  const handleObjectiveChange = (index: number, value: string) => {
    const newObjectives = [...objectives]
    newObjectives[index] = value
    setObjectives(newObjectives)
  }

  const handleConstraintToggle = (constraint: string) => {
    setConstraints((prev) =>
      prev.includes(constraint)
        ? prev.filter((c) => c !== constraint)
        : [...prev, constraint]
    )
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!selectedDomain) {
      newErrors.domain = 'Please select a domain'
    }

    if (!description.trim() || description.trim().length < 10) {
      newErrors.description = 'Please describe the experiment (at least 10 characters)'
    }

    const validObjectives = objectives.filter((o) => o.trim())
    if (validObjectives.length === 0) {
      newErrors.objectives = 'Please add at least one objective'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    onSubmit({
      domain: selectedDomain,
      description: description.trim(),
      objectives: objectives.filter((o) => o.trim()),
      safetyRequirements: safetyRequirements.trim(),
      constraints,
    })
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {pageIcon}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{pageTitle}</h1>
            <p className="text-sm text-muted-foreground">{pageSubtitle}</p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-8">
          {/* Domain Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Research Domain
            </label>
            <div className="flex flex-wrap gap-2">
              {domains.map((domain) => (
                <Badge
                  key={domain}
                  variant={selectedDomain === domain ? 'primary' : 'secondary'}
                  className="cursor-pointer transition-colors"
                  onClick={() => setSelectedDomain(domain)}
                >
                  {formatDomainLabel(domain)}
                </Badge>
              ))}
            </div>
            {errors.domain && (
              <p className="text-sm text-error">{errors.domain}</p>
            )}
          </div>

          {/* Experiment Description */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Experiment Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you want to investigate. Include materials, processes, or phenomena you want to study..."
              className="min-h-[120px]"
              error={errors.description}
            />
            <p className="text-xs text-foreground-subtle">
              Be specific about the hypothesis, materials, and expected outcomes
            </p>
          </div>

          {/* Objectives */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Experiment Objectives
            </label>
            <div className="space-y-2">
              {objectives.map((objective, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={objective}
                    onChange={(e) => handleObjectiveChange(index, e.target.value)}
                    placeholder={`Objective ${index + 1}: What do you want to measure or achieve?`}
                    className="flex-1 h-10 px-3 rounded-lg border border-border bg-background-elevated text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {objectives.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveObjective(index)}
                      className="h-10 w-10 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddObjective}
              className="gap-1"
            >
              <Plus className="h-3 w-3" />
              Add Objective
            </Button>
            {errors.objectives && (
              <p className="text-sm text-error">{errors.objectives}</p>
            )}
          </div>

          {/* Safety Requirements */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Safety Requirements (Optional)
            </label>
            <Textarea
              value={safetyRequirements}
              onChange={(e) => setSafetyRequirements(e.target.value)}
              placeholder="Any specific safety protocols, PPE requirements, or hazardous materials to consider..."
              className="min-h-[80px]"
            />
          </div>

          {/* Constraints */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Constraints (Optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_CONSTRAINTS.map((constraint) => (
                <Badge
                  key={constraint}
                  variant={constraints.includes(constraint) ? 'primary' : 'secondary'}
                  className="cursor-pointer transition-colors"
                  onClick={() => handleConstraintToggle(constraint)}
                >
                  {constraint}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-foreground-subtle">
              Select any constraints that apply to your experiment
            </p>
          </div>

          {/* Tips Card */}
          <Card variant="elevated" className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <FlaskConical className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Design better experiments</p>
                  <ul className="text-xs text-foreground-muted space-y-1">
                    <li>Define clear, measurable objectives</li>
                    <li>Include control variables and expected ranges</li>
                    <li>Consider failure modes and safety protocols</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="pt-4">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={isSubmitting}
            >
              <FlaskConical className="h-4 w-4 mr-2" />
              {ACTION_BUTTON_LABELS.experiments}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
