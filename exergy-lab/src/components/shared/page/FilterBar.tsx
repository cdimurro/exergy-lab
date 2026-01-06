'use client'

/**
 * FilterBar Component
 *
 * Standardized filter bar with search input and filter dropdowns.
 */

import React from 'react'
import { Search, Filter } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface FilterOption {
  value: string
  label: string
}

interface FilterConfig {
  id: string
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
  icon?: React.ComponentType<{ className?: string }>
}

interface FilterBarProps {
  /** Search input value */
  searchValue: string
  /** Search input change handler */
  onSearchChange: (value: string) => void
  /** Search input placeholder */
  searchPlaceholder?: string
  /** Filter configurations */
  filters?: FilterConfig[]
  /** Optional className for the container */
  className?: string
  /** Number of grid columns for filters (default: 3) */
  columns?: 2 | 3 | 4
}

const columnClasses = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  className = '',
  columns = 3,
}: FilterBarProps) {
  const totalColumns = 1 + filters.length // Search + filters
  const effectiveColumns = Math.min(totalColumns, columns) as 2 | 3 | 4

  return (
    <Card className={`p-4 bg-background-elevated border-border ${className}`}>
      <div className={`grid grid-cols-1 ${columnClasses[effectiveColumns]} gap-4`}>
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-subtle" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-background-surface border border-border text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Filter Dropdowns */}
        {filters.map((filter) => {
          const FilterIcon = filter.icon || Filter
          return (
            <div key={filter.id} className="relative">
              <FilterIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-subtle" />
              <select
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-background-surface border border-border text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
              >
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg
                  className="h-4 w-4 text-foreground-subtle"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default FilterBar
