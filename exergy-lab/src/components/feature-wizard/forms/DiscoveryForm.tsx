'use client'

import * as React from 'react'
import { Sparkles, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDomainLabel, ACTION_BUTTON_LABELS } from '@/types/wizard'
import type { Domain } from '@/types/discovery'
import type { DiscoveryFormData } from '@/types/wizard'

interface DiscoveryFormProps {
  pageTitle: string
  pageSubtitle: string
  pageIcon: React.ReactNode
  domains: Domain[]
  onSubmit: (data: DiscoveryFormData) => void
  isSubmitting?: boolean
  initialData?: Partial<DiscoveryFormData> | null
}

const FOCUS_AREAS = [
  'Efficiency improvements',
  'Cost reduction',
  'Scalability',
  'Environmental impact',
  'Material innovation',
  'Manufacturing processes',
  'Integration challenges',
  'Policy & regulations',
]

export function DiscoveryForm({
  pageTitle,
  pageSubtitle,
  pageIcon,
  domains,
  onSubmit,
  isSubmitting = false,
  initialData,
}: DiscoveryFormProps) {
  const [selectedDomain, setSelectedDomain] = React.useState<Domain | null>(
    initialData?.domain || null
  )
  const [description, setDescription] = React.useState(initialData?.description || '')
  const [goals, setGoals] = React.useState<string[]>(initialData?.goals || [''])
  const [focusAreas, setFocusAreas] = React.useState<string[]>(
    initialData?.focusAreas || []
  )
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const handleAddGoal = () => {
    setGoals([...goals, ''])
  }

  const handleRemoveGoal = (index: number) => {
    if (goals.length > 1) {
      setGoals(goals.filter((_, i) => i !== index))
    }
  }

  const handleGoalChange = (index: number, value: string) => {
    const newGoals = [...goals]
    newGoals[index] = value
    setGoals(newGoals)
  }

  const handleFocusAreaToggle = (area: string) => {
    setFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    )
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!selectedDomain) {
      newErrors.domain = 'Please select a domain'
    }

    if (!description.trim() || description.trim().length < 10) {
      newErrors.description = 'Please provide a description (at least 10 characters)'
    }

    const validGoals = goals.filter((g) => g.trim())
    if (validGoals.length === 0) {
      newErrors.goals = 'Please add at least one research goal'
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
      goals: goals.filter((g) => g.trim()),
      focusAreas,
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

          {/* Description */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              What would you like to discover?
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your research goal in detail. What problem are you trying to solve? What outcomes are you looking for?"
              className="min-h-[120px]"
              error={errors.description}
            />
            <p className="text-xs text-foreground-subtle">
              Be specific about the technology, application, or challenge you want to explore
            </p>
          </div>

          {/* Research Goals */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Research Goals
            </label>
            <div className="space-y-2">
              {goals.map((goal, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={goal}
                    onChange={(e) => handleGoalChange(index, e.target.value)}
                    placeholder={`Goal ${index + 1}`}
                    className="flex-1 h-10 px-3 rounded-lg border border-border bg-background-elevated text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {goals.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveGoal(index)}
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
              onClick={handleAddGoal}
              className="gap-1"
            >
              <Plus className="h-3 w-3" />
              Add Goal
            </Button>
            {errors.goals && (
              <p className="text-sm text-error">{errors.goals}</p>
            )}
          </div>

          {/* Focus Areas */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Focus Areas (Optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {FOCUS_AREAS.map((area) => (
                <Badge
                  key={area}
                  variant={focusAreas.includes(area) ? 'primary' : 'secondary'}
                  className="cursor-pointer transition-colors"
                  onClick={() => handleFocusAreaToggle(area)}
                >
                  {area}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-foreground-subtle">
              Select areas to help focus the AI's research
            </p>
          </div>

          {/* Tips Card */}
          <Card variant="elevated" className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Tips for better results</p>
                  <ul className="text-xs text-foreground-muted space-y-1">
                    <li>Be specific about the technology or application</li>
                    <li>Mention any constraints (budget, timeline, scale)</li>
                    <li>Include target metrics if you have them</li>
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
              <Sparkles className="h-4 w-4 mr-2" />
              {ACTION_BUTTON_LABELS.discovery}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
