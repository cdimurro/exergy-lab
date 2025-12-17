'use client'

import * as React from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDomainLabel, ACTION_BUTTON_LABELS } from '@/types/wizard'
import type { Domain } from '@/types/discovery'
import type { SearchFormData } from '@/types/wizard'

interface SearchFormProps {
  pageTitle: string
  pageSubtitle: string
  pageIcon: React.ReactNode
  domains: Domain[]
  onSubmit: (data: SearchFormData) => void
  isSubmitting?: boolean
  initialData?: Partial<SearchFormData> | null
}

const SOURCE_TYPES = [
  { id: 'papers', label: 'Academic Papers' },
  { id: 'patents', label: 'Patents' },
  { id: 'datasets', label: 'Datasets' },
] as const

export function SearchForm({
  pageTitle,
  pageSubtitle,
  pageIcon,
  domains,
  onSubmit,
  isSubmitting = false,
  initialData,
}: SearchFormProps) {
  const [selectedDomain, setSelectedDomain] = React.useState<Domain | null>(
    initialData?.domain || null
  )
  const [description, setDescription] = React.useState(initialData?.description || '')
  const [query, setQuery] = React.useState(initialData?.query || '')
  const [sourceTypes, setSourceTypes] = React.useState<('papers' | 'patents' | 'datasets')[]>(
    initialData?.sourceTypes || ['papers']
  )
  const [useDateRange, setUseDateRange] = React.useState(!!initialData?.dateRange)
  const [dateFrom, setDateFrom] = React.useState(initialData?.dateRange?.from || '')
  const [dateTo, setDateTo] = React.useState(initialData?.dateRange?.to || '')
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const handleSourceTypeToggle = (type: 'papers' | 'patents' | 'datasets') => {
    setSourceTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!selectedDomain) {
      newErrors.domain = 'Please select a domain'
    }

    if (!description.trim() && !query.trim()) {
      newErrors.query = 'Please provide a search query or description'
    }

    if (sourceTypes.length === 0) {
      newErrors.sourceTypes = 'Please select at least one source type'
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
      query: query.trim() || description.trim(),
      sourceTypes,
      dateRange: useDateRange && dateFrom && dateTo ? { from: dateFrom, to: dateTo } : null,
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
            <h1 className="text-2xl font-semibold text-foreground">{pageTitle}</h1>
            <p className="text-base text-muted-foreground">{pageSubtitle}</p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-8">
          {/* Domain Selection */}
          <div className="space-y-3">
            <label className="text-base font-medium text-foreground">
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

          {/* Search Query */}
          <div className="space-y-3">
            <label className="text-base font-medium text-foreground">
              Search Query
            </label>
            <Textarea
              value={query || description}
              onChange={(e) => {
                setQuery(e.target.value)
                if (!description) setDescription(e.target.value)
              }}
              placeholder="Enter keywords, phrases, or a natural language query..."
              className="min-h-[100px] text-base"
              error={errors.query}
            />
            <p className="text-sm text-foreground-subtle">
              Try: "perovskite solar cell efficiency 2024" or "solid-state battery thermal management"
            </p>
          </div>

          {/* Source Types */}
          <div className="space-y-3">
            <label className="text-base font-medium text-foreground">
              Source Types
            </label>
            <div className="flex flex-wrap gap-2">
              {SOURCE_TYPES.map((source) => (
                <Badge
                  key={source.id}
                  variant={sourceTypes.includes(source.id) ? 'primary' : 'secondary'}
                  className="cursor-pointer transition-colors"
                  onClick={() => handleSourceTypeToggle(source.id)}
                >
                  {source.label}
                </Badge>
              ))}
            </div>
            {errors.sourceTypes && (
              <p className="text-sm text-error">{errors.sourceTypes}</p>
            )}
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useDateRange"
                checked={useDateRange}
                onChange={(e) => setUseDateRange(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="useDateRange" className="text-base font-medium text-foreground">
                Filter by date range
              </label>
            </div>
            {useDateRange && (
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-foreground-subtle mb-1 block">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background-elevated text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-foreground-subtle mb-1 block">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background-elevated text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tips Card */}
          <Card variant="elevated" className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Search className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-base font-medium text-foreground">Search tips</p>
                  <ul className="text-sm text-foreground-muted space-y-1">
                    <li>Use specific technical terms for better results</li>
                    <li>Include year ranges for recent research</li>
                    <li>Combine domain keywords with application areas</li>
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
              <Search className="h-4 w-4 mr-2" />
              {ACTION_BUTTON_LABELS.search}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
