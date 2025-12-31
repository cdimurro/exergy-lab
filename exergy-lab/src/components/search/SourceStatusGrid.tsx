'use client'

import * as React from 'react'
import { useMemo } from 'react'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Key,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export type SourceStatus = 'available' | 'needs_key' | 'error' | 'loading' | 'disabled'

export interface DataSource {
  id: string
  name: string
  category: 'academic' | 'patents' | 'energy' | 'preprint' | 'web' | 'datasets'
  status: SourceStatus
  resultCount?: number
  responseTime?: number
  error?: string
  requiresApiKey?: boolean
}

interface SourceStatusGridProps {
  sources: DataSource[]
  onSourceToggle?: (sourceId: string, enabled: boolean) => void
  onRetry?: (sourceId: string) => void
  enabledSources?: string[]
  isCollapsible?: boolean
  defaultCollapsed?: boolean
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_LABELS: Record<DataSource['category'], string> = {
  academic: 'Academic',
  patents: 'Patents',
  energy: 'Energy Data',
  preprint: 'Preprints',
  web: 'Web',
  datasets: 'Datasets',
}

const CATEGORY_ORDER: DataSource['category'][] = [
  'academic',
  'preprint',
  'patents',
  'energy',
  'datasets',
  'web',
]

// ============================================================================
// Component
// ============================================================================

export function SourceStatusGrid({
  sources,
  onSourceToggle,
  onRetry,
  enabledSources,
  isCollapsible = true,
  defaultCollapsed = true,
  className = '',
}: SourceStatusGridProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)

  // Group sources by category
  const groupedSources = useMemo(() => {
    const groups: Record<string, DataSource[]> = {}

    CATEGORY_ORDER.forEach((category) => {
      const categorySources = sources.filter((s) => s.category === category)
      if (categorySources.length > 0) {
        groups[category] = categorySources
      }
    })

    return groups
  }, [sources])

  // Calculate summary stats
  const stats = useMemo(() => {
    const available = sources.filter((s) => s.status === 'available').length
    const needsKey = sources.filter((s) => s.status === 'needs_key').length
    const errors = sources.filter((s) => s.status === 'error').length
    const loading = sources.filter((s) => s.status === 'loading').length
    const total = sources.length

    return { available, needsKey, errors, loading, total }
  }, [sources])

  // Render status icon
  const renderStatusIcon = (status: SourceStatus) => {
    switch (status) {
      case 'available':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
      case 'needs_key':
        return <Key className="w-3.5 h-3.5 text-amber-500" />
      case 'error':
        return <XCircle className="w-3.5 h-3.5 text-red-500" />
      case 'loading':
        return <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
      case 'disabled':
        return <AlertCircle className="w-3.5 h-3.5 text-zinc-500" />
      default:
        return null
    }
  }

  // Check if source is enabled
  const isSourceEnabled = (sourceId: string) => {
    if (!enabledSources) return true
    return enabledSources.includes(sourceId)
  }

  return (
    <div className={`bg-zinc-800 rounded-lg ${className}`}>
      {/* Header with summary */}
      <div
        className={`px-4 py-3 border-b border-zinc-700 flex items-center justify-between ${
          isCollapsible ? 'cursor-pointer hover:bg-zinc-750' : ''
        }`}
        onClick={() => isCollapsible && setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-medium text-white">Data Sources</h3>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              {stats.available}
            </span>
            {stats.needsKey > 0 && (
              <span className="flex items-center gap-1 text-amber-400">
                <Key className="w-3 h-3" />
                {stats.needsKey}
              </span>
            )}
            {stats.errors > 0 && (
              <span className="flex items-center gap-1 text-red-400">
                <XCircle className="w-3 h-3" />
                {stats.errors}
              </span>
            )}
            {stats.loading > 0 && (
              <span className="flex items-center gap-1 text-blue-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                {stats.loading}
              </span>
            )}
          </div>
        </div>

        {isCollapsible && (
          <button className="p-1 text-zinc-400 hover:text-white">
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Source grid */}
      {!isCollapsed && (
        <div className="p-4 space-y-4">
          {Object.entries(groupedSources).map(([category, categorySources]) => (
            <div key={category}>
              <h4 className="text-xs font-medium text-zinc-500 uppercase mb-2">
                {CATEGORY_LABELS[category as DataSource['category']]}
              </h4>
              <div className="flex flex-wrap gap-2">
                {categorySources.map((source) => {
                  const enabled = isSourceEnabled(source.id)
                  const isClickable =
                    onSourceToggle && source.status !== 'loading'

                  return (
                    <div
                      key={source.id}
                      className={`
                        group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md
                        text-xs transition-all
                        ${enabled ? 'bg-zinc-700' : 'bg-zinc-800 opacity-50'}
                        ${isClickable ? 'cursor-pointer hover:bg-zinc-600' : ''}
                        ${source.status === 'error' ? 'ring-1 ring-red-500/50' : ''}
                      `}
                      onClick={() => {
                        if (isClickable) {
                          onSourceToggle(source.id, !enabled)
                        }
                      }}
                      title={
                        source.error ||
                        (source.responseTime
                          ? `${source.responseTime}ms`
                          : source.name)
                      }
                    >
                      {renderStatusIcon(source.status)}
                      <span
                        className={
                          enabled ? 'text-zinc-200' : 'text-zinc-500'
                        }
                      >
                        {source.name}
                      </span>

                      {source.resultCount !== undefined && source.resultCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-zinc-600 rounded text-zinc-400">
                          {source.resultCount}
                        </span>
                      )}

                      {/* Retry button for errors */}
                      {source.status === 'error' && onRetry && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onRetry(source.id)
                          }}
                          className="ml-1 p-0.5 hover:bg-zinc-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <RefreshCw className="w-3 h-3 text-zinc-400" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Legend */}
          <div className="pt-3 border-t border-zinc-700">
            <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                Available
              </span>
              <span className="flex items-center gap-1">
                <Key className="w-3 h-3 text-amber-500" />
                Needs API Key
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="w-3 h-3 text-red-500" />
                Error
              </span>
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 text-blue-500" />
                Loading
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Default sources configuration
// ============================================================================

export const DEFAULT_DATA_SOURCES: DataSource[] = [
  // Academic
  { id: 'semantic-scholar', name: 'Semantic Scholar', category: 'academic', status: 'available' },
  { id: 'openalex', name: 'OpenAlex', category: 'academic', status: 'available' },
  { id: 'core', name: 'CORE', category: 'academic', status: 'available' },
  { id: 'crossref', name: 'Crossref', category: 'academic', status: 'available' },
  { id: 'ieee', name: 'IEEE Xplore', category: 'academic', status: 'needs_key' },
  { id: 'springer', name: 'Springer', category: 'academic', status: 'needs_key' },

  // Preprints
  { id: 'arxiv', name: 'arXiv', category: 'preprint', status: 'available' },
  { id: 'biorxiv', name: 'bioRxiv', category: 'preprint', status: 'available' },
  { id: 'chemrxiv', name: 'ChemRxiv', category: 'preprint', status: 'available' },
  { id: 'medrxiv', name: 'medRxiv', category: 'preprint', status: 'available' },

  // Patents
  { id: 'google-patents', name: 'Google Patents', category: 'patents', status: 'needs_key' },
  { id: 'uspto', name: 'USPTO', category: 'patents', status: 'available' },
  { id: 'epo', name: 'EPO', category: 'patents', status: 'needs_key' },

  // Energy
  { id: 'nrel', name: 'NREL', category: 'energy', status: 'available' },
  { id: 'doe', name: 'DOE', category: 'energy', status: 'available' },
  { id: 'eia', name: 'EIA', category: 'energy', status: 'available' },

  // Datasets
  { id: 'materials-project', name: 'Materials Project', category: 'datasets', status: 'needs_key' },
  { id: 'pubchem', name: 'PubChem', category: 'datasets', status: 'available' },

  // Web
  { id: 'consensus', name: 'Consensus', category: 'web', status: 'needs_key' },
  { id: 'web-search', name: 'Web Search', category: 'web', status: 'needs_key' },
  { id: 'pubmed', name: 'PubMed', category: 'web', status: 'available' },
]
