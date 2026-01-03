'use client'

/**
 * Reports Hub Page
 *
 * Browse, search, and manage all generated reports.
 * Features: search, filters by type, export, view details.
 */

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search as SearchIcon,
  FileText,
  Trash2,
  Eye,
  Download,
  Filter,
  Clock,
  Cpu,
  Microscope,
  FlaskConical,
  Bot,
  Calculator,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'
import type { ReportType } from '@/types/database'

// Report from API
interface ReportItem {
  id: string
  user_id: string
  workflow_id: string | null
  type: ReportType
  title: string
  summary: string | null
  sections: unknown[]
  metadata: Record<string, unknown>
  pdf_url: string | null
  created_at: string
}

// Icon mapping for report types
const REPORT_TYPE_ICONS: Record<ReportType, React.ComponentType<{ className?: string }>> = {
  discovery: Cpu,
  breakthrough: Microscope,
  experiment: FlaskConical,
  simulation: Bot,
  tea: Calculator,
}

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  discovery: 'Discovery',
  breakthrough: 'Breakthrough',
  experiment: 'Experiment',
  simulation: 'Simulation',
  tea: 'TEA Analysis',
}

const REPORT_TYPE_COLORS: Record<ReportType, string> = {
  discovery: 'bg-blue-100 text-blue-700',
  breakthrough: 'bg-purple-100 text-purple-700',
  experiment: 'bg-green-100 text-green-700',
  simulation: 'bg-orange-100 text-orange-700',
  tea: 'bg-amber-100 text-amber-700',
}

export default function ReportsPage() {
  const router = useRouter()

  // Data state
  const [reports, setReports] = useState<ReportItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters and search
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<ReportType | 'all'>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Fetch reports
  const fetchReports = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (typeFilter !== 'all') {
        params.set('type', typeFilter)
      }
      params.set('limit', '100')

      const response = await fetch(`/api/user/reports?${params.toString()}`)

      if (!response.ok) {
        if (response.status === 503) {
          setError('Database not configured. Reports require Supabase setup.')
          setReports([])
          return
        }
        throw new Error('Failed to fetch reports')
      }

      const data = await response.json()
      setReports(data.reports || [])
    } catch (err) {
      console.error('[Reports] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load reports')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [typeFilter])

  // Filtered reports (client-side search)
  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports

    const query = searchQuery.toLowerCase()
    return reports.filter(
      (report) =>
        report.title.toLowerCase().includes(query) ||
        report.summary?.toLowerCase().includes(query) ||
        report.type.toLowerCase().includes(query)
    )
  }, [reports, searchQuery])

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
    setSelectedIds(new Set(filteredReports.map((r) => r.id)))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  // Actions
  const handleView = (id: string) => {
    router.push(`/reports/${id}`)
  }

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete report "${title}"?`)) return

    try {
      const response = await fetch(`/api/user/reports/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete report')
      }

      setReports((prev) => prev.filter((r) => r.id !== id))
      selectedIds.delete(id)
      setSelectedIds(new Set(selectedIds))
    } catch (err) {
      console.error('[Reports] Delete error:', err)
      alert('Failed to delete report')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (
      !window.confirm(
        `Delete ${selectedIds.size} report${selectedIds.size > 1 ? 's' : ''}?`
      )
    ) {
      return
    }

    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/user/reports/${id}`, { method: 'DELETE' })
        )
      )

      setReports((prev) => prev.filter((r) => !selectedIds.has(r.id)))
      setSelectedIds(new Set())
    } catch (err) {
      console.error('[Reports] Bulk delete error:', err)
      alert('Failed to delete some reports')
      fetchReports() // Refresh to get accurate state
    }
  }

  const handleExport = (report: ReportItem) => {
    const dataStr = JSON.stringify(report, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', `report-${report.id}.json`)
    linkElement.click()
  }

  const handleBulkExport = () => {
    if (selectedIds.size === 0) return

    const selected = filteredReports.filter((r) => selectedIds.has(r.id))
    const dataStr = JSON.stringify(selected, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', `reports-export-${Date.now()}.json`)
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

  const getSectionCount = (report: ReportItem): number => {
    return Array.isArray(report.sections) ? report.sections.length : 0
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Reports</h1>
          <p className="text-foreground-muted">
            View and manage all your generated research reports
          </p>
        </div>
        <Button variant="outline" onClick={fetchReports} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4 bg-background-surface border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <input
              type="text"
              placeholder="Search by title or summary..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ReportType | 'all')}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="discovery">Discovery Reports</option>
              <option value="breakthrough">Breakthrough Reports</option>
              <option value="experiment">Experiment Reports</option>
              <option value="simulation">Simulation Reports</option>
              <option value="tea">TEA Analysis Reports</option>
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
                  Select All ({filteredReports.length})
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
        <p className="text-sm text-foreground-muted">
          {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card className="p-12 bg-background-surface border-border">
          <div className="flex flex-col items-center text-center space-y-4">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            <p className="text-foreground-muted">Loading reports...</p>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && filteredReports.length === 0 && !error && (
        <Card className="p-12 bg-background-surface border-border">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No reports found
              </h3>
              <p className="text-foreground-muted max-w-md">
                {searchQuery || typeFilter !== 'all'
                  ? 'Try adjusting your filters or search query'
                  : 'Complete a discovery, simulation, or analysis to generate your first report'}
              </p>
            </div>
            {reports.length === 0 && (
              <Button onClick={() => router.push('/discovery')}>
                Start a Discovery
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Grid */}
      {!isLoading && filteredReports.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report) => {
            const Icon = REPORT_TYPE_ICONS[report.type] || FileText
            const isSelected = selectedIds.has(report.id)

            return (
              <Card
                key={report.id}
                className={`p-4 bg-background-surface border-border hover:border-primary/30 transition-all cursor-pointer ${
                  isSelected ? 'ring-2 ring-primary/50 border-primary' : ''
                }`}
                onClick={() => handleView(report.id)}
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation()
                      toggleSelection(report.id)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/50"
                  />

                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>

                  {/* Title and Badge */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate mb-1">
                      {report.title}
                    </h3>
                    <Badge className={REPORT_TYPE_COLORS[report.type]}>
                      {REPORT_TYPE_LABELS[report.type]}
                    </Badge>
                  </div>
                </div>

                {/* Summary Preview */}
                {report.summary && (
                  <p className="text-xs text-foreground-muted line-clamp-2 mb-3">
                    {report.summary}
                  </p>
                )}

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-foreground-subtle" />
                    <span className="text-foreground-muted">{formatDate(report.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-foreground-subtle" />
                    <span className="text-foreground-muted">{getSectionCount(report)} sections</span>
                  </div>
                </div>

                {/* Actions */}
                <div
                  className="flex gap-2 pt-3 border-t border-border"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleView(report.id)}
                    className="flex-1"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExport(report)}
                    title="Export as JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(report.id, report.title)}
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
