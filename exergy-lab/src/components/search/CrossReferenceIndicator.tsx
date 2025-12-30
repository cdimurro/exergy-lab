'use client'

import * as React from 'react'
import { Link2, Check } from 'lucide-react'
import { Badge } from '@/components/ui'
import type { DataSourceName } from '@/types/sources'

interface CrossReferenceIndicatorProps {
  sources: DataSourceName[]
  variant?: 'badge' | 'detailed' | 'compact'
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
}

// Short names for compact display
const SOURCE_SHORT_NAMES: Record<DataSourceName, string> = {
  'semantic-scholar': 'SS',
  'openalex': 'OA',
  'arxiv': 'arXiv',
  'pubmed': 'PM',
  'crossref': 'CR',
  'core': 'CORE',
  'consensus': 'Con',
  'google-patents': 'GP',
  'uspto': 'USPTO',
  'epo': 'EPO',
  'chemrxiv': 'CRxiv',
  'biorxiv': 'bRxiv',
  'medrxiv': 'mRxiv',
  'nrel': 'NREL',
  'ieee': 'IEEE',
  'iea': 'IEA',
  'eia': 'EIA',
  'materials-project': 'MP',
  'zenodo': 'Zen',
  'inspire': 'INS',
  'newsapi': 'News',
  'web-search': 'Web',
}

export function CrossReferenceIndicator({
  sources,
  variant = 'badge',
}: CrossReferenceIndicatorProps) {
  // Only show indicator if found in multiple sources
  if (sources.length <= 1) {
    return null
  }

  // Simple badge showing count
  if (variant === 'badge') {
    return (
      <Badge
        size="sm"
        className="bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors cursor-help"
        title={`Found in ${sources.length} sources: ${sources.map(s => SOURCE_DISPLAY_NAMES[s]).join(', ')}`}
      >
        <Link2 className="h-3 w-3 mr-1" />
        {sources.length} sources
      </Badge>
    )
  }

  // Compact inline display with short names
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1">
        <Link2 className="h-3 w-3 text-purple-600" />
        <div className="flex items-center gap-0.5">
          {sources.slice(0, 3).map((source, i) => (
            <span
              key={source}
              className="text-xs font-medium text-purple-600"
              title={SOURCE_DISPLAY_NAMES[source]}
            >
              {SOURCE_SHORT_NAMES[source]}
              {i < Math.min(sources.length - 1, 2) && <span className="text-purple-400">,</span>}
            </span>
          ))}
          {sources.length > 3 && (
            <span className="text-xs text-purple-500">+{sources.length - 3}</span>
          )}
        </div>
      </div>
    )
  }

  // Detailed display with full source names
  return (
    <div className="flex items-start gap-2 p-2 bg-purple-50 rounded-md">
      <Link2 className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-purple-800 mb-1">
          Verified across {sources.length} databases
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sources.map(source => (
            <span
              key={source}
              className="inline-flex items-center gap-1 text-xs text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded"
            >
              <Check className="h-2.5 w-2.5" />
              {SOURCE_DISPLAY_NAMES[source]}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export { SOURCE_DISPLAY_NAMES, SOURCE_SHORT_NAMES }
