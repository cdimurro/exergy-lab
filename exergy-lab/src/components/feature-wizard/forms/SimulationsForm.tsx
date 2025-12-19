'use client'

import * as React from 'react'
import { Bot, Monitor, Server, Cloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDomainLabel, ACTION_BUTTON_LABELS } from '@/types/wizard'
import type { Domain } from '@/types/discovery'
import type { SimulationsFormData } from '@/types/wizard'

interface SimulationsFormProps {
  pageTitle: string
  pageSubtitle: string
  pageIcon: React.ReactNode
  domains: Domain[]
  onSubmit: (data: SimulationsFormData) => void
  isSubmitting?: boolean
  initialData?: Partial<SimulationsFormData> | null
}

const SIMULATION_TIERS = [
  {
    id: 'browser',
    label: 'Browser',
    icon: Monitor,
    description: 'Quick estimates using simplified models',
    cost: '$0.00',
    time: '< 1 min',
  },
  {
    id: 'local',
    label: 'Local GPU',
    icon: Server,
    description: 'Detailed simulations on your hardware',
    cost: '$0.00',
    time: '5-15 min',
  },
  {
    id: 'cloud',
    label: 'Cloud GPU',
    icon: Cloud,
    description: 'High-fidelity multi-physics simulations',
    cost: '$0.50+',
    time: '15-60 min',
  },
] as const

const SYSTEM_TYPES = [
  'Solar PV System',
  'Wind Turbine',
  'Battery Pack',
  'Fuel Cell',
  'Electrolyzer',
  'Heat Exchanger',
  'Power Electronics',
  'Grid Integration',
]

export function SimulationsForm({
  pageTitle,
  pageSubtitle,
  pageIcon,
  domains,
  onSubmit,
  isSubmitting = false,
  initialData,
}: SimulationsFormProps) {
  const [selectedDomain, setSelectedDomain] = React.useState<Domain | null>(
    initialData?.domain || null
  )
  const [description, setDescription] = React.useState(initialData?.description || '')
  const [tier, setTier] = React.useState<'browser' | 'local' | 'cloud'>(
    initialData?.tier || 'browser'
  )
  const [systemType, setSystemType] = React.useState(initialData?.systemType || '')
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!selectedDomain) {
      newErrors.domain = 'Please select a domain'
    }

    if (!description.trim() || description.trim().length < 10) {
      newErrors.description = 'Please describe the system to simulate (at least 10 characters)'
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
      tier,
      systemType,
      parameters: {},
    })
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {pageIcon}
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">{pageTitle}</h1>
            <p className="text-lg text-muted-foreground">{pageSubtitle}</p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <form onSubmit={handleSubmit} className="w-full space-y-10">
          {/* Domain Selection */}
          <div className="space-y-4">
            <label className="text-lg font-medium text-foreground">
              Simulation Domain
            </label>
            <div className="flex flex-wrap gap-3">
              {domains.map((domain) => (
                <Badge
                  key={domain}
                  variant={selectedDomain === domain ? 'primary' : 'secondary'}
                  className="cursor-pointer transition-colors text-base px-4 py-2"
                  onClick={() => setSelectedDomain(domain)}
                >
                  {formatDomainLabel(domain)}
                </Badge>
              ))}
            </div>
            {errors.domain && (
              <p className="text-base text-error">{errors.domain}</p>
            )}
          </div>

          {/* System Type */}
          <div className="space-y-4">
            <label className="text-lg font-medium text-foreground">
              System Type (Optional)
            </label>
            <div className="flex flex-wrap gap-3">
              {SYSTEM_TYPES.map((type) => (
                <Badge
                  key={type}
                  variant={systemType === type ? 'primary' : 'secondary'}
                  className="cursor-pointer transition-colors text-base px-4 py-2"
                  onClick={() => setSystemType(systemType === type ? '' : type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          {/* System Description */}
          <div className="space-y-4">
            <label className="text-lg font-medium text-foreground">
              System Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the system you want to simulate. Include key parameters, operating conditions, and what metrics you want to analyze..."
              className="min-h-[160px] text-lg"
              error={errors.description}
            />
            <p className="text-base text-foreground-subtle">
              Include dimensions, materials, operating conditions, and target outputs
            </p>
          </div>

          {/* Simulation Tier */}
          <div className="space-y-4">
            <label className="text-lg font-medium text-foreground">
              Simulation Tier
            </label>
            <div className="grid gap-4">
              {SIMULATION_TIERS.map((tierOption) => {
                const Icon = tierOption.icon
                const isSelected = tier === tierOption.id
                return (
                  <div
                    key={tierOption.id}
                    onClick={() => setTier(tierOption.id)}
                    className={`
                      flex items-start gap-5 p-5 rounded-xl border cursor-pointer transition-all
                      ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-background-elevated hover:border-primary/50'
                      }
                    `}
                  >
                    <div
                      className={`
                        flex h-12 w-12 items-center justify-center rounded-xl shrink-0
                        ${isSelected ? 'bg-primary/10 text-primary' : 'bg-background-surface text-foreground-muted'}
                      `}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-lg text-foreground">{tierOption.label}</span>
                        <div className="flex items-center gap-3 text-base">
                          <span className={tierOption.cost === '$0.00' ? 'text-success' : 'text-warning'}>
                            {tierOption.cost}
                          </span>
                          <span className="text-foreground-subtle">{tierOption.time}</span>
                        </div>
                      </div>
                      <p className="text-base text-foreground-muted mt-1">
                        {tierOption.description}
                      </p>
                    </div>
                    <div
                      className={`
                        h-6 w-6 rounded-full border-2 shrink-0 mt-1 transition-colors
                        ${isSelected ? 'border-primary bg-primary' : 'border-border'}
                      `}
                    >
                      {isSelected && (
                        <div className="h-full w-full flex items-center justify-center">
                          <div className="h-2.5 w-2.5 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Tips Card */}
          <Card variant="elevated" className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <Bot className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-lg font-medium text-foreground">Simulation tips</p>
                  <ul className="text-base text-foreground-muted space-y-2">
                    <li>Start with Browser tier for quick feasibility checks</li>
                    <li>Use Cloud GPU for detailed parameter sweeps</li>
                    <li>Include boundary conditions and constraints</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="pt-6">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full h-14 text-lg"
              loading={isSubmitting}
            >
              <Bot className="h-5 w-5 mr-2" />
              {ACTION_BUTTON_LABELS.simulations}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
