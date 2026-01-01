'use client'

/**
 * Simulation History Page
 *
 * Browse, search, and manage all saved simulation workflows.
 * Features: search, filters, bulk actions, comparison mode.
 */

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search as SearchIcon,
  Trash2,
  Play,
  Eye,
  GitCompare,
  Download,
  Flame,
  Sun,
  Wind,
  Battery,
  Droplets,
  Recycle,
  Factory,
  Zap,
  Globe,
  Atom,
  Bot,
  Clock,
  Filter,
} from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'
import { useSimulationsStore } from '@/lib/store/simulations-store'
import type { SimulationTier, SimulationType, SavedSimulation } from '@/types/simulation-workflow'

// Icon mapping
const SIMULATION_ICONS: Partial<Record<SimulationType, React.ComponentType<{ className?: string }>>> = {
  'geothermal': Flame,
  'solar': Sun,
  'wind': Wind,
  'battery': Battery,
  'hydrogen': Droplets,
  'carbon-capture': Factory,
  'materials': Atom,
  'process': Factory,
}

export default function SimulationHistoryPage() {
  const router = useRouter()
  const { savedSimulations, deleteSavedSimulation, addToComparison } = useSimulationsStore()

  // Filters and search
  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState<SimulationTier | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<SimulationType | 'all'>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Filtered simulations
  const filteredSimulations = useMemo(() => {
    let filtered = [...savedSimulations]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (sim) =>
          sim.name.toLowerCase().includes(query) ||
          sim.goal.toLowerCase().includes(query) ||
          sim.tags?.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // Tier filter
    if (tierFilter !== 'all') {
      filtered = filtered.filter((sim) => sim.tier === tierFilter)
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((sim) => sim.simulationType === typeFilter)
    }

    // Sort by most recent
    return filtered.sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    )
  }, [savedSimulations, searchQuery, tierFilter, typeFilter])

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
    setSelectedIds(new Set(filteredSimulations.map((s) => s.id)))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  // Bulk actions
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return
    if (
      !window.confirm(
        `Delete ${selectedIds.size} simulation${selectedIds.size > 1 ? 's' : ''}?`
      )
    ) {
      return
    }

    selectedIds.forEach((id) => deleteSavedSimulation(id))
    setSelectedIds(new Set())
  }

  const handleBulkCompare = () => {
    if (selectedIds.size < 2 || selectedIds.size > 4) {
      alert('Select 2-4 simulations to compare')
      return
    }

    selectedIds.forEach((id) => addToComparison(id))
    router.push('/simulations?mode=compare')
  }

  const handleBulkExport = () => {
    if (selectedIds.size === 0) return

    const selected = filteredSimulations.filter((s) => selectedIds.has(s.id))
    const dataStr = JSON.stringify(selected, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`

    const exportFileDefaultName = `simulations-export-${Date.now()}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  // Single simulation actions
  const handleView = (id: string) => {
    router.push(`/simulations?load=${id}`)
  }

  const handleRunAgain = (id: string) => {
    router.push(`/simulations?rerun=${id}`)
  }

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Delete simulation "${name}"?`)) return
    deleteSavedSimulation(id)
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
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Simulation History</h1>
        <p className="text-muted">
          Browse, search, and manage all saved simulation workflows
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-card-dark border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          {/* Tier Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as SimulationTier | 'all')}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
            >
              <option value="all">All Tiers</option>
              <option value="local">Tier 1 (Local)</option>
              <option value="browser">Tier 2 (Browser)</option>
              <option value="cloud">Tier 3 (Cloud)</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as SimulationType | 'all')}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
            >
              <option value="all">All Types</option>
              <option value="geothermal">Geothermal</option>
              <option value="solar">Solar</option>
              <option value="wind">Wind</option>
              <option value="battery">Battery</option>
              <option value="hydrogen">Hydrogen</option>
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
                  Select All ({filteredSimulations.length})
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkCompare}
                disabled={selectedIds.size < 2 || selectedIds.size > 4}
              >
                <GitCompare className="w-4 h-4 mr-2" />
                Compare
              </Button>
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
          {filteredSimulations.length} simulation{filteredSimulations.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Grid */}
      {filteredSimulations.length === 0 ? (
        <Card className="p-12 bg-card-dark border-border">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No simulations found
              </h3>
              <p className="text-muted max-w-md">
                {searchQuery || tierFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters or search query'
                  : 'Complete and save a simulation to see it appear here'}
              </p>
            </div>
            {savedSimulations.length === 0 && (
              <Button onClick={() => router.push('/simulations')}>
                Run Your First Simulation
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSimulations.map((sim) => {
            const Icon = SIMULATION_ICONS[sim.simulationType] || Bot
            const isSelected = selectedIds.has(sim.id)

            return (
              <Card
                key={sim.id}
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
                    onChange={() => toggleSelection(sim.id)}
                    className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/50"
                  />

                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>

                  {/* Title and Badges */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate mb-1">
                      {sim.name}
                    </h3>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {sim.tier.toUpperCase()}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {sim.simulationType}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Goal Preview */}
                <p className="text-xs text-muted line-clamp-2 mb-3">
                  {sim.goal}
                </p>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  <div>
                    <span className="text-foreground-subtle">Saved:</span>{' '}
                    <span className="text-muted">{formatDate(sim.savedAt)}</span>
                  </div>
                  <div>
                    <span className="text-foreground-subtle">Duration:</span>{' '}
                    <span className="text-muted">{formatDuration(sim.duration)}</span>
                  </div>
                  {sim.cost !== undefined && (
                    <div className="col-span-2">
                      <span className="text-foreground-subtle">Cost:</span>{' '}
                      <span className="text-muted">${sim.cost.toFixed(4)}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-border">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleView(sim.id)}
                    className="flex-1"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRunAgain(sim.id)}
                    className="flex-1"
                  >
                    <Play className="w-3.5 h-3.5 mr-1.5" />
                    Run Again
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(sim.id, sim.name)}
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
