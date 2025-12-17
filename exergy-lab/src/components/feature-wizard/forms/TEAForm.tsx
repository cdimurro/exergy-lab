'use client'

import * as React from 'react'
import { Calculator, Upload, X, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDomainLabel, ACTION_BUTTON_LABELS } from '@/types/wizard'
import type { Domain } from '@/types/discovery'
import type { TEAFormData } from '@/types/wizard'

interface TEAFormProps {
  pageTitle: string
  pageSubtitle: string
  pageIcon: React.ReactNode
  domains: Domain[]
  onSubmit: (data: TEAFormData) => void
  isSubmitting?: boolean
  initialData?: Partial<TEAFormData> | null
}

const SCALE_OPTIONS = [
  { id: 'small', label: 'Small Scale', description: 'Pilot plant or lab scale' },
  { id: 'medium', label: 'Medium Scale', description: 'Demonstration or regional' },
  { id: 'large', label: 'Large Scale', description: 'Commercial or utility scale' },
] as const

const REGIONS = [
  'United States',
  'European Union',
  'China',
  'India',
  'Japan',
  'Australia',
  'Brazil',
  'Other',
]

export function TEAForm({
  pageTitle,
  pageSubtitle,
  pageIcon,
  domains,
  onSubmit,
  isSubmitting = false,
  initialData,
}: TEAFormProps) {
  const [selectedDomain, setSelectedDomain] = React.useState<Domain | null>(
    initialData?.domain || null
  )
  const [description, setDescription] = React.useState(initialData?.description || '')
  const [files, setFiles] = React.useState<File[]>(initialData?.files || [])
  const [scale, setScale] = React.useState<'small' | 'medium' | 'large'>(
    initialData?.scale || 'medium'
  )
  const [region, setRegion] = React.useState(initialData?.region || '')
  const [projectLifespan, setProjectLifespan] = React.useState(
    initialData?.projectLifespan || 25
  )
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    setFiles((prev) => [...prev, ...selectedFiles])
  }

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!selectedDomain) {
      newErrors.domain = 'Please select a domain'
    }

    if (!description.trim() || description.trim().length < 10) {
      newErrors.description = 'Please describe the technology (at least 10 characters)'
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
      files,
      scale,
      region,
      projectLifespan,
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
              Technology Domain
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

          {/* Technology Description */}
          <div className="space-y-4">
            <label className="text-lg font-medium text-foreground">
              Technology Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the technology for economic analysis. Include key specifications, capacity, and any cost assumptions..."
              className="min-h-[160px] text-lg"
              error={errors.description}
            />
            <p className="text-base text-foreground-subtle">
              Include capacity, efficiency, and any known cost parameters
            </p>
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <label className="text-lg font-medium text-foreground">
              Supporting Documents (Optional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              multiple
              accept=".pdf,.xlsx,.xls,.csv,.doc,.docx"
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Upload className="h-10 w-10 mx-auto text-foreground-subtle mb-3" />
              <p className="text-base text-foreground-muted">
                Click to upload cost data, specifications, or reports
              </p>
              <p className="text-sm text-foreground-subtle mt-2">
                PDF, Excel, CSV, Word files supported
              </p>
            </div>
            {files.length > 0 && (
              <div className="space-y-3 mt-4">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-background-elevated border border-border"
                  >
                    <FileText className="h-5 w-5 text-foreground-muted" />
                    <span className="flex-1 text-base text-foreground truncate">
                      {file.name}
                    </span>
                    <span className="text-sm text-foreground-subtle">
                      {(file.size / 1024).toFixed(0)} KB
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(index)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scale Selection */}
          <div className="space-y-4">
            <label className="text-lg font-medium text-foreground">
              Project Scale
            </label>
            <div className="grid grid-cols-3 gap-4">
              {SCALE_OPTIONS.map((option) => (
                <div
                  key={option.id}
                  onClick={() => setScale(option.id)}
                  className={`
                    p-5 rounded-xl border cursor-pointer text-center transition-all
                    ${
                      scale === option.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-background-elevated hover:border-primary/50'
                    }
                  `}
                >
                  <p className="font-medium text-foreground text-base">{option.label}</p>
                  <p className="text-sm text-foreground-muted mt-2">{option.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Region */}
          <div className="space-y-4">
            <label className="text-lg font-medium text-foreground">
              Target Region (Optional)
            </label>
            <div className="flex flex-wrap gap-3">
              {REGIONS.map((r) => (
                <Badge
                  key={r}
                  variant={region === r ? 'primary' : 'secondary'}
                  className="cursor-pointer transition-colors text-base px-4 py-2"
                  onClick={() => setRegion(region === r ? '' : r)}
                >
                  {r}
                </Badge>
              ))}
            </div>
            <p className="text-base text-foreground-subtle">
              Region affects electricity prices, labor costs, and incentives
            </p>
          </div>

          {/* Project Lifespan */}
          <div className="space-y-4">
            <label className="text-lg font-medium text-foreground">
              Project Lifespan: {projectLifespan} years
            </label>
            <input
              type="range"
              min="5"
              max="40"
              value={projectLifespan}
              onChange={(e) => setProjectLifespan(parseInt(e.target.value))}
              className="w-full h-3 bg-background-surface rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-sm text-foreground-subtle">
              <span>5 years</span>
              <span>40 years</span>
            </div>
          </div>

          {/* Tips Card */}
          <Card variant="elevated" className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <Calculator className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-lg font-medium text-foreground">TEA analysis includes</p>
                  <ul className="text-base text-foreground-muted space-y-2">
                    <li>LCOE (Levelized Cost of Energy)</li>
                    <li>NPV and IRR calculations</li>
                    <li>Sensitivity analysis on key parameters</li>
                    <li>Comparison with industry benchmarks</li>
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
              <Calculator className="h-5 w-5 mr-2" />
              {ACTION_BUTTON_LABELS.tea}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
