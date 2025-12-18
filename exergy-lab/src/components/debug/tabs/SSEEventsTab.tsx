'use client'

/**
 * SSEEventsTab Component
 *
 * Displays real-time SSE event stream with filtering and auto-scroll.
 */

import * as React from 'react'
import { Search, Filter, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EventStreamItem } from '../EventStreamItem'
import type { DebugEvent, DebugEventCategory } from '@/types/debug'

// ============================================================================
// Props
// ============================================================================

interface SSEEventsTabProps {
  events: DebugEvent[]
}

// ============================================================================
// Filter Options
// ============================================================================

const CATEGORY_OPTIONS: { value: DebugEventCategory; label: string }[] = [
  { value: 'progress', label: 'Progress' },
  { value: 'iteration', label: 'Iteration' },
  { value: 'judge', label: 'Judge' },
  { value: 'complete', label: 'Complete' },
  { value: 'heartbeat', label: 'Heartbeat' },
  { value: 'error', label: 'Error' },
]

// ============================================================================
// Main Component
// ============================================================================

export function SSEEventsTab({ events }: SSEEventsTabProps) {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [selectedCategories, setSelectedCategories] = React.useState<Set<DebugEventCategory>>(
    new Set()
  )
  const [expandedEvents, setExpandedEvents] = React.useState<Set<string>>(new Set())
  const [autoScroll, setAutoScroll] = React.useState(true)
  const [showFilters, setShowFilters] = React.useState(false)

  const scrollContainerRef = React.useRef<HTMLDivElement>(null)

  // Filter events
  const filteredEvents = React.useMemo(() => {
    return events.filter((event) => {
      // Category filter
      if (selectedCategories.size > 0 && !selectedCategories.has(event.category)) {
        return false
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesCategory = event.category.toLowerCase().includes(searchLower)
        const matchesPhase = event.phase?.toLowerCase().includes(searchLower)
        const matchesData = JSON.stringify(event.data).toLowerCase().includes(searchLower)
        if (!matchesCategory && !matchesPhase && !matchesData) {
          return false
        }
      }

      return true
    })
  }, [events, selectedCategories, searchTerm])

  // Auto-scroll to bottom when new events arrive
  React.useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [filteredEvents.length, autoScroll])

  // Toggle category filter
  const toggleCategory = (category: DebugEventCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  // Toggle event expansion
  const toggleExpanded = (eventId: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('')
    setSelectedCategories(new Set())
  }

  const hasFilters = searchTerm || selectedCategories.size > 0

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="shrink-0 p-3 border-b border-border space-y-2">
        {/* Search and filter toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <Button
            size="sm"
            variant={showFilters ? 'secondary' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            className="h-8"
          >
            <Filter size={14} />
          </Button>
          <Button
            size="sm"
            variant={autoScroll ? 'secondary' : 'outline'}
            onClick={() => setAutoScroll(!autoScroll)}
            className="h-8"
            title="Auto-scroll to latest"
          >
            <ArrowDown size={14} />
          </Button>
        </div>

        {/* Category filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => toggleCategory(option.value)}
                className={cn(
                  'px-2 py-1 rounded text-xs transition-colors',
                  selectedCategories.has(option.value)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {option.label}
              </button>
            ))}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Results count */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {filteredEvents.length} of {events.length} events
          </span>
          {filteredEvents.length > 0 && (
            <button
              onClick={() => setExpandedEvents(new Set())}
              className="hover:text-foreground"
            >
              Collapse all
            </button>
          )}
        </div>
      </div>

      {/* Event List */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2"
      >
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">No events found</p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs mt-1 hover:text-foreground"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          filteredEvents.map((event, index) => (
            <EventStreamItem
              key={event.id}
              event={event}
              index={index}
              isExpanded={expandedEvents.has(event.id)}
              onToggle={() => toggleExpanded(event.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default SSEEventsTab
