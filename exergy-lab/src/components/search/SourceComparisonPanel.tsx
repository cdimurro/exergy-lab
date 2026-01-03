'use client'

import * as React from 'react'
import {
  Check,
  X,
  Clock,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  BarChart3,
  Link2,
} from 'lucide-react'
import { Card, Badge, Button } from '@/components/ui'
import type { DataSourceName, Source } from '@/types/sources'

interface SourceStats {
  name: DataSourceName
  count: number
  success: boolean
  time: number
  error?: string
}

interface CrossReference {
  title: string
  sources: DataSourceName[]
  count: number
  primaryId: string
}

interface SourceComparisonPanelProps {
  bySource: Record<DataSourceName, SourceStats>
  crossReferences: CrossReference[]
  results: Source[]
  onFilterBySource: (source: DataSourceName | null) => void
  selectedSourceFilter: DataSourceName | null
}

// Display names for sources
const SOURCE_DISPLAY_NAMES: Record<DataSourceName, string> = {
  'semantic-scholar': 'Semantic Scholar',
  'openalex': 'OpenAlex',
  'arxiv': 'arXiv',
  'pubmed': 'PubMed',
  'crossref': 'Crossref',
  'core': 'CORE',
  'consensus': 'Consensus',
  'google-patents': 'Google Patents',
  'uspto': 'USPTO',
  'epo': 'EPO',
  'chemrxiv': 'ChemRxiv',
  'biorxiv': 'bioRxiv',
  'medrxiv': 'medRxiv',
  'nrel': 'NREL',
  'ieee': 'IEEE',
  'iea': 'IEA',
  'eia': 'EIA',
  'materials-project': 'Materials Project',
  'zenodo': 'Zenodo',
  'inspire': 'INSPIRE',
  'newsapi': 'News API',
  'web-search': 'Web Search',
  'pubchem': 'PubChem',
  'chemspider': 'ChemSpider',
  'nist-webbook': 'NIST WebBook',
}

export function SourceComparisonPanel({
  bySource,
  crossReferences,
  results,
  onFilterBySource,
  selectedSourceFilter,
}: SourceComparisonPanelProps) {
  const [showAllSources, setShowAllSources] = React.useState(false)

  // Sort sources by count (descending)
  const sortedSources = Object.entries(bySource)
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([sourceName, stats]) => ({ ...stats, name: sourceName as DataSourceName }))

  const successfulSources = sortedSources.filter(s => s.success)
  const failedSources = sortedSources.filter(s => !s.success)

  const displayedSources = showAllSources ? sortedSources : sortedSources.slice(0, 8)
  const totalResults = sortedSources.reduce((sum, s) => sum + s.count, 0)
  const avgTime = sortedSources.length > 0
    ? Math.round(sortedSources.reduce((sum, s) => sum + s.time, 0) / sortedSources.length)
    : 0

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="bg-background-surface p-3">
          <div className="text-xs text-foreground-muted">Sources Searched</div>
          <div className="text-lg font-semibold text-foreground">
            {successfulSources.length}/{sortedSources.length}
          </div>
        </Card>
        <Card className="bg-background-surface p-3">
          <div className="text-xs text-foreground-muted">Total Results</div>
          <div className="text-lg font-semibold text-foreground">{totalResults.toLocaleString()}</div>
        </Card>
        <Card className="bg-background-surface p-3">
          <div className="text-xs text-foreground-muted">Avg Response</div>
          <div className="text-lg font-semibold text-foreground">{avgTime}ms</div>
        </Card>
        <Card className="bg-background-surface p-3">
          <div className="text-xs text-foreground-muted">Cross-References</div>
          <div className="text-lg font-semibold text-foreground">{crossReferences.length}</div>
        </Card>
      </div>

      {/* Source Results Grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-foreground-muted" />
            Results by Source
          </h4>
          {selectedSourceFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFilterBySource(null)}
            >
              Clear Filter
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {displayedSources.map(source => {
            const isSelected = selectedSourceFilter === source.name
            const displayName = SOURCE_DISPLAY_NAMES[source.name] || source.name

            return (
              <button
                key={source.name}
                onClick={() => onFilterBySource(isSelected ? null : source.name)}
                className={`
                  flex items-center justify-between p-2.5 rounded-lg border text-left transition-all
                  ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50'}
                  ${!source.success ? 'opacity-60' : ''}
                `}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {source.success ? (
                    <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium text-foreground truncate">{displayName}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge
                    size="sm"
                    variant={source.count > 0 ? 'secondary' : 'default'}
                    className={source.count > 0 ? '' : 'text-foreground-muted'}
                  >
                    {source.count}
                  </Badge>
                  <span className="text-xs text-foreground-muted">{source.time}ms</span>
                </div>
              </button>
            )
          })}
        </div>

        {sortedSources.length > 8 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAllSources(!showAllSources)}
            className="mt-2 w-full"
          >
            {showAllSources ? 'Show Less' : `Show ${sortedSources.length - 8} More Sources`}
          </Button>
        )}
      </div>

      {/* Failed Sources Warning */}
      {failedSources.length > 0 && (
        <Card className="bg-amber-50 border-amber-200 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-amber-800">
                {failedSources.length} source{failedSources.length > 1 ? 's' : ''} unavailable
              </div>
              <div className="text-xs text-amber-700 mt-1">
                {failedSources.map((s, idx) => (
                  <div key={s.name} className="mt-1 first:mt-0">
                    <span className="font-medium">{SOURCE_DISPLAY_NAMES[s.name]}</span>
                    {s.error && (
                      <span className="block text-amber-600 ml-2">
                        Error: {s.error}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Cross-References */}
      {crossReferences.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
            <Link2 className="h-4 w-4 text-foreground-muted" />
            Cross-Referenced Papers
            <Badge size="sm" variant="secondary">{crossReferences.length}</Badge>
          </h4>
          <div className="space-y-2">
            {crossReferences.slice(0, 5).map((ref, i) => (
              <Card key={i} className="bg-background-surface p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-2">{ref.title}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-xs text-foreground-muted">Found in:</span>
                      {ref.sources.slice(0, 4).map(source => (
                        <Badge key={source} size="sm" variant="secondary">
                          {SOURCE_DISPLAY_NAMES[source]}
                        </Badge>
                      ))}
                      {ref.sources.length > 4 && (
                        <Badge size="sm" variant="secondary">+{ref.sources.length - 4}</Badge>
                      )}
                    </div>
                  </div>
                  <Badge className="bg-primary/10 text-primary flex-shrink-0">
                    {ref.count} sources
                  </Badge>
                </div>
              </Card>
            ))}
            {crossReferences.length > 5 && (
              <p className="text-xs text-foreground-muted text-center py-1">
                +{crossReferences.length - 5} more cross-referenced papers
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export { SOURCE_DISPLAY_NAMES }
