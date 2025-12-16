'use client'

import * as React from 'react'
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Button, Badge, Input } from '@/components/ui'
import type { SearchFilters } from '@/types/search'
import type { Domain } from '@/types/discovery'

const DOMAINS: Domain[] = [
  'solar-energy',
  'wind-energy',
  'battery-storage',
  'hydrogen-fuel',
  'geothermal',
  'biomass',
  'carbon-capture',
  'energy-efficiency',
  'grid-optimization',
  'materials-science',
]

const COMMON_VENUES = [
  'Nature',
  'Science',
  'Nature Energy',
  'Energy & Environmental Science',
  'Applied Energy',
  'Renewable Energy',
  'Solar Energy',
  'Energy Storage Materials',
]

export interface FilterPanelProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  onReset: () => void
  resultsCount?: number
}

export function FilterPanel({
  filters,
  onFiltersChange,
  onReset,
  resultsCount,
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = React.useState(true)

  const currentYear = new Date().getFullYear()
  const defaultYearRange: [number, number] = [currentYear - 10, currentYear]

  const handleDomainToggle = (domain: string) => {
    const currentDomains = filters.domains || []
    const newDomains = currentDomains.includes(domain)
      ? currentDomains.filter((d) => d !== domain)
      : [...currentDomains, domain]

    onFiltersChange({ ...filters, domains: newDomains })
  }

  const handleVenueToggle = (venue: string) => {
    const currentVenues = filters.venues || []
    const newVenues = currentVenues.includes(venue)
      ? currentVenues.filter((v) => v !== venue)
      : [...currentVenues, venue]

    onFiltersChange({ ...filters, venues: newVenues })
  }

  const handleYearRangeChange = (index: 0 | 1, value: string) => {
    const year = parseInt(value)
    if (isNaN(year)) return

    const currentRange = filters.yearRange || defaultYearRange
    const newRange: [number, number] = [...currentRange] as [number, number]
    newRange[index] = year

    onFiltersChange({ ...filters, yearRange: newRange })
  }

  const handleMinCitationsChange = (value: string) => {
    const citations = parseInt(value)
    if (isNaN(citations)) {
      onFiltersChange({ ...filters, minCitations: undefined })
    } else {
      onFiltersChange({ ...filters, minCitations: citations })
    }
  }

  const hasActiveFilters =
    (filters.domains && filters.domains.length > 0) ||
    (filters.venues && filters.venues.length > 0) ||
    filters.yearRange ||
    filters.minCitations !== undefined

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-foreground" />
          <h3 className="text-base font-semibold text-foreground">Filters</h3>
          {resultsCount !== undefined && (
            <Badge variant="secondary" size="sm">
              {resultsCount} results
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {isExpanded && (
        <div className="space-y-6">
          {/* Domains Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Research Domains
            </label>
            <div className="flex flex-wrap gap-2">
              {DOMAINS.map((domain) => {
                const isActive = filters.domains?.includes(domain)
                return (
                  <Badge
                    key={domain}
                    variant={isActive ? 'primary' : 'secondary'}
                    size="sm"
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleDomainToggle(domain)}
                  >
                    {domain.split('-').join(' ')}
                  </Badge>
                )
              })}
            </div>
          </div>

          {/* Year Range Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Publication Year
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                placeholder="From"
                value={filters.yearRange?.[0] || defaultYearRange[0]}
                onChange={(e) => handleYearRangeChange(0, e.target.value)}
                min={1900}
                max={currentYear}
                className="flex-1"
              />
              <span className="text-sm text-foreground-muted">to</span>
              <Input
                type="number"
                placeholder="To"
                value={filters.yearRange?.[1] || defaultYearRange[1]}
                onChange={(e) => handleYearRangeChange(1, e.target.value)}
                min={1900}
                max={currentYear}
                className="flex-1"
              />
            </div>
          </div>

          {/* Citation Count Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Minimum Citations
            </label>
            <Input
              type="number"
              placeholder="e.g., 10"
              value={filters.minCitations || ''}
              onChange={(e) => handleMinCitationsChange(e.target.value)}
              min={0}
            />
            <p className="mt-2 text-xs text-foreground-muted">
              Filter papers with at least this many citations
            </p>
          </div>

          {/* Venues Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Journals & Conferences
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_VENUES.map((venue) => {
                const isActive = filters.venues?.includes(venue)
                return (
                  <Badge
                    key={venue}
                    variant={isActive ? 'primary' : 'secondary'}
                    size="sm"
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleVenueToggle(venue)}
                  >
                    {venue}
                  </Badge>
                )
              })}
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="pt-4 border-t border-border">
              <p className="text-xs font-medium text-foreground-muted mb-2">
                Active Filters:
              </p>
              <div className="space-y-1 text-xs text-foreground-muted">
                {filters.domains && filters.domains.length > 0 && (
                  <p>• Domains: {filters.domains.length} selected</p>
                )}
                {filters.yearRange && (
                  <p>
                    • Year: {filters.yearRange[0]} - {filters.yearRange[1]}
                  </p>
                )}
                {filters.minCitations !== undefined && (
                  <p>• Min citations: {filters.minCitations}</p>
                )}
                {filters.venues && filters.venues.length > 0 && (
                  <p>• Venues: {filters.venues.length} selected</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
