'use client'

import * as React from 'react'
import { Cpu, Monitor, Server, Cloud } from 'lucide-react'
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
              Simulation Domain
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

          {/* System Type */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              System Type (Optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {SYSTEM_TYPES.map((type) => (
                <Badge
                  key={type}
                  variant={systemType === type ? 'primary' : 'secondary'}
                  className="cursor-pointer transition-colors"
                  onClick={() => setSystemType(systemType === type ? '' : type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          {/* System Description */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              System Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the system you want to simulate. Include key parameters, operating conditions, and what metrics you want to analyze..."
              className="min-h-[120px]"
              error={errors.description}
            />
            <p className="text-xs text-foreground-subtle">
              Include dimensions, materials, operating conditions, and target outputs
            </p>
          </div>

          {/* Simulation Tier */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Simulation Tier
            </label>
            <div className="grid gap-3">
              {SIMULATION_TIERS.map((tierOption) => {
                const Icon = tierOption.icon
                const isSelected = tier === tierOption.id
                return (
                  <div
                    key={tierOption.id}
                    onClick={() => setTier(tierOption.id)}
                    className={`
                      flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all
                      ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-background-elevated hover:border-primary/50'
                      }
                    `}
                  >
                    <div
                      className={`
                        flex h-10 w-10 items-center justify-center rounded-lg shrink-0
                        ${isSelected ? 'bg-primary/10 text-primary' : 'bg-background-surface text-foreground-muted'}
                      `}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{tierOption.label}</span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={tierOption.cost === '$0.00' ? 'text-success' : 'text-warning'}>
                            {tierOption.cost}
                          </span>
                          <span className="text-foreground-subtle">{tierOption.time}</span>
                        </div>
                      </div>
                      <p className="text-sm text-foreground-muted mt-1">
                        {tierOption.description}
                      </p>
                    </div>
                    <div
                      className={`
                        h-5 w-5 rounded-full border-2 shrink-0 mt-1 transition-colors
                        ${isSelected ? 'border-primary bg-primary' : 'border-border'}
                      `}
                    >
                      {isSelected && (
                        <div className="h-full w-full flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-white" />
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
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Cpu className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Simulation tips</p>
                  <ul className="text-xs text-foreground-muted space-y-1">
                    <li>Start with Browser tier for quick feasibility checks</li>
                    <li>Use Cloud GPU for detailed parameter sweeps</li>
                    <li>Include boundary conditions and constraints</li>
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
              <Cpu className="h-4 w-4 mr-2" />
              {ACTION_BUTTON_LABELS.simulations}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
