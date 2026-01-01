'use client'

/**
 * Experiment History Page
 *
 * Browse, search, and manage all saved experiment workflows.
 * Features: search, filters, bulk actions, export.
 */

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search as SearchIcon,
  Trash2,
  Play,
  Eye,
  Download,
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
  FlaskConical,
  Clock,
  Filter,
} from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'
import { useExperimentsStore } from '@/lib/store/experiments-store'
import type { ExperimentDomain, SavedExperiment } from '@/types/experiment-workflow'

// Icon mapping
const DOMAIN_ICONS: Partial<Record<string, React.ComponentType<{ className?: string }>>> = {
  'solar-energy': Sun,
  'wind-energy': Wind,
  'battery-storage': Battery,
  'geothermal': Flame,
  'hydrogen-fuel': Droplets,
  'biomass': Recycle,
  'carbon-capture': Factory,
  'energy-efficiency': Zap,
  'grid-optimization': Globe,
  'materials-science': Atom,
}

export default function ExperimentHistoryPage() {
  const router = useRouter()
  const { savedExperiments, deleteSavedExperiment } = useExperimentsStore()

  // Filters and search
  const [searchQuery, setSearchQuery] = useState('')
  const [domainFilter, setDomainFilter] = useState<ExperimentDomain | 'all'>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Filtered experiments
  const filteredExperiments = useMemo(() => {
    let filtered = [...savedExperiments]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (exp) =>
          exp.name.toLowerCase().includes(query) ||
          exp.goal.toLowerCase().includes(query) ||
          exp.tags?.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // Domain filter
    if (domainFilter !== 'all') {
      filtered = filtered.filter((exp) => exp.domain === domainFilter)
    }

    // Sort by most recent
    return filtered.sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    )
  }, [savedExperiments, searchQuery, domainFilter])

  // Selection handlers
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const selectAll = () => {
    setSelectedIds(new Set(filteredExperiments.map((e) => e.id)))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  // Bulk actions
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return
    if (
      !window.confirm(
        `Delete ${selectedIds.size} experiment${selectedIds.size > 1 ? 's' : ''}?`
      )
    ) {
      return
    }

    selectedIds.forEach((id) => deleteSavedExperiment(id))
    setSelectedIds(new Set())
  }

  const handleBulkExport = () => {
    if (selectedIds.size === 0) return

    const selected = filteredExperiments.filter((e) => selectedIds.has(e.id))
    const dataStr = JSON.stringify(selected, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`

    const exportFileDefaultName = `experiments-export-${Date.now()}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  // Single experiment actions
  const handleView = (id: string) => {
    router.push(`/experiments?load=${id}`)
  }

  const handleRunAgain = (id: string) => {
    router.push(`/experiments?rerun=${id}`)
  }

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Delete experiment "${name}"?`)) return
    deleteSavedExperiment(id)
  }

  // Export single experiment as JSON
  const handleExportSingle = (exp: SavedExperiment) => {
    const dataStr = JSON.stringify(exp, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', `experiment-${exp.id}.json`)
    linkElement.click()
  }

  // Format helpers
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return '-'
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ${seconds % 60}s`
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Experiment History</h1>
        <p className="text-muted">
          Browse, search, and manage all saved experiment workflows
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-card-dark border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search by name, goal, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Domain Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value as ExperimentDomain | 'all')}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
            >
              <option value="all">All Domains</option>
              <option value="solar-energy">Solar Energy</option>
              <option value="wind-energy">Wind Energy</option>
              <option value="battery-storage">Battery Storage</option>
              <option value="geothermal">Geothermal</option>
              <option value="hydrogen-fuel">Hydrogen Fuel</option>
              <option value="biomass">Biomass</option>
              <option value="carbon-capture">Carbon Capture</option>
              <option value="energy-efficiency">Energy Efficiency</option>
              <option value="grid-optimization">Grid Optimization</option>
              <option value="materials-science">Materials Science</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-foreground">
                {selectedIds.size} selected
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={clearSelection}>
                  Clear
                </Button>
                <Button size="sm" variant="outline" onClick={selectAll}>
                  Select All ({filteredExperiments.length})
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleBulkExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button size="sm" variant="danger" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {filteredExperiments.length} experiment{filteredExperiments.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Grid */}
      {filteredExperiments.length === 0 ? (
        <Card className="p-12 bg-card-dark border-border">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No experiments found
              </h3>
              <p className="text-muted max-w-md">
                {searchQuery || domainFilter !== 'all'
                  ? 'Try adjusting your filters or search query'
                  : 'Complete and save an experiment to see it appear here'}
              </p>
            </div>
            {savedExperiments.length === 0 && (
              <Button onClick={() => router.push('/experiments')}>
                Design Your First Experiment
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExperiments.map((exp) => {
            const Icon = DOMAIN_ICONS[exp.domain] || FlaskConical
            const isSelected = selectedIds.has(exp.id)

            return (
              <Card
                key={exp.id}
                className={`p-4 bg-card-dark border-border hover:border-primary/30 transition-all ${
                  isSelected ? 'ring-2 ring-primary/50 border-primary' : ''
                }`}
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelection(exp.id)}
                    className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/50"
                  />

                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>

                  {/* Title and Badges */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate mb-1">
                      {exp.name}
                    </h3>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {exp.domain}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Goal Preview */}
                <p className="text-xs text-muted line-clamp-2 mb-3">
                  {exp.goal}
                </p>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  <div>
                    <span className="text-foreground-subtle">Saved:</span>{' '}
                    <span className="text-muted">{formatDate(exp.savedAt)}</span>
                  </div>
                  <div>
                    <span className="text-foreground-subtle">Duration:</span>{' '}
                    <span className="text-muted">{formatDuration(exp.duration)}</span>
                  </div>
                  {exp.cost !== undefined && (
                    <div className="col-span-2">
                      <span className="text-foreground-subtle">Cost:</span>{' '}
                      <span className="text-muted">${exp.cost.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Validation Summary */}
                {exp.validation && (
                  <div className="p-2 rounded bg-background border border-border mb-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted">Literature:</span>{' '}
                        <span className="text-foreground">{exp.validation.literatureAlignment.confidence}%</span>
                      </div>
                      <div>
                        <span className="text-muted">Equipment:</span>{' '}
                        <span className="text-foreground">{exp.validation.equipmentFeasibility.tier}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-border">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleView(exp.id)}
                    className="flex-1"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRunAgain(exp.id)}
                    className="flex-1"
                  >
                    <Play className="w-3.5 h-3.5 mr-1.5" />
                    Run Again
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExportSingle(exp)}
                    title="Export as JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(exp.id, exp.name)}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
