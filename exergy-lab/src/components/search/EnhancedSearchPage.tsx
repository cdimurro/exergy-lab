'use client'

import * as React from 'react'
import {
  Search,
  Loader2,
  Filter,
  LayoutGrid,
  List,
  X,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from 'lucide-react'
import { Card, Button, Badge, Input } from '@/components/ui'
import { SourceSelector, ALL_SOURCES } from './SourceSelector'
import { SourceComparisonPanel, SOURCE_DISPLAY_NAMES } from './SourceComparisonPanel'
import { AIRelevanceExplanation } from './AIRelevanceExplanation'
import { AISearchInsights } from './AISearchInsights'
import { CrossReferenceIndicator } from './CrossReferenceIndicator'
import { PaperCard } from './paper-card'
import type { DataSourceName, Source } from '@/types/sources'
import type { Domain } from '@/types/discovery'

// ============================================================================
// Types
// ============================================================================

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

interface AIEnhancements {
  expandedQuery: string
  relevanceExplanations: Record<string, { score: number; explanation: string }>
  topRecommendations: string[]
  queryInterpretation: string
}

interface SearchMeta {
  query: string
  expandedQuery?: string
  totalTime: number
  sourcesQueried: number
  sourcesSucceeded: number
  deduplicatedCount: number
}

interface EnhancedSearchResponse {
  success: boolean
  results: Source[]
  total: number
  bySource: Record<DataSourceName, SourceStats>
  crossReferences: CrossReference[]
  aiEnhancements?: AIEnhancements
  searchMeta: SearchMeta
  error?: string
}

interface EnhancedSearchPageProps {
  domains?: Domain[]
}

// ============================================================================
// Component
// ============================================================================

export function EnhancedSearchPage({ domains = [] }: EnhancedSearchPageProps) {
  // Search state
  const [query, setQuery] = React.useState('')
  const [selectedSources, setSelectedSources] = React.useState<DataSourceName[]>(ALL_SOURCES)
  const [selectedDomains, setSelectedDomains] = React.useState<Domain[]>(domains)
  const [isSearching, setIsSearching] = React.useState(false)

  // Results state
  const [searchResponse, setSearchResponse] = React.useState<EnhancedSearchResponse | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  // UI state
  const [showFilters, setShowFilters] = React.useState(false)
  const [showSourceComparison, setShowSourceComparison] = React.useState(false)
  const [viewMode, setViewMode] = React.useState<'list' | 'grid'>('list')
  const [sourceFilter, setSourceFilter] = React.useState<DataSourceName | null>(null)

  // Filter options
  const [dateRange, setDateRange] = React.useState<{ from: string; to: string } | undefined>()
  const [minCitations, setMinCitations] = React.useState<number | undefined>()
  const [openAccessOnly, setOpenAccessOnly] = React.useState(false)
  const [peerReviewedOnly, setPeerReviewedOnly] = React.useState(false)
  const [includeAIEnhancements, setIncludeAIEnhancements] = React.useState(true)

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsSearching(true)
    setError(null)
    setSearchResponse(null)

    try {
      const response = await fetch('/api/search/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          domains: selectedDomains.length > 0 ? selectedDomains : undefined,
          sources: selectedSources.length < ALL_SOURCES.length ? selectedSources : undefined,
          dateRange,
          minCitations,
          openAccessOnly,
          peerReviewedOnly,
          includeAIEnhancements,
          limit: 50,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Search failed')
      }

      setSearchResponse(data)
      setShowSourceComparison(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSearching) {
      handleSearch()
    }
  }

  // Filter results by selected source
  const filteredResults = React.useMemo(() => {
    if (!searchResponse?.results) return []
    if (!sourceFilter) return searchResponse.results
    return searchResponse.results.filter(r => r.metadata.source === sourceFilter)
  }, [searchResponse?.results, sourceFilter])

  // Find cross-references for a result
  const getCrossRefsForResult = (resultId: string) => {
    if (!searchResponse?.crossReferences) return []
    return searchResponse.crossReferences.filter(cr => cr.primaryId === resultId)
  }

  // Convert Source to Paper format for PaperCard
  const sourceToPaper = (source: Source) => ({
    id: source.id,
    title: source.title,
    authors: source.authors,
    abstract: source.abstract || '',
    url: source.url || '',
    publicationDate: source.metadata.publicationDate || '',
    citationCount: source.metadata.citationCount || 0,
    venue: undefined,
    fields: [] as string[],
    pdfUrl: undefined,
  })

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-background">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Search className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Enhanced Search</h1>
            <p className="text-sm text-foreground-muted">
              AI-powered search across 15 scientific databases
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Search across all databases..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-4 h-12 text-base"
              disabled={isSearching}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground-muted" />
          </div>
          <Button
            onClick={handleSearch}
            disabled={!query.trim() || isSearching}
            className="h-12 px-6"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              'Search'
            )}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
            className="h-12"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
            {showFilters ? (
              <ChevronUp className="h-4 w-4 ml-2" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-2" />
            )}
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-background-surface rounded-lg border border-border space-y-4">
            {/* Source Selector */}
            <SourceSelector
              selectedSources={selectedSources}
              onSourcesChange={setSelectedSources}
              disabled={isSearching}
              compact
            />

            {/* Additional Filters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-1">
                  Year From
                </label>
                <Input
                  type="number"
                  placeholder="e.g., 2020"
                  value={dateRange?.from || ''}
                  onChange={(e) =>
                    setDateRange((prev) => ({ from: e.target.value, to: prev?.to || '' }))
                  }
                  disabled={isSearching}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-1">
                  Year To
                </label>
                <Input
                  type="number"
                  placeholder="e.g., 2024"
                  value={dateRange?.to || ''}
                  onChange={(e) =>
                    setDateRange((prev) => ({ from: prev?.from || '', to: e.target.value }))
                  }
                  disabled={isSearching}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-1">
                  Min Citations
                </label>
                <Input
                  type="number"
                  placeholder="e.g., 10"
                  value={minCitations || ''}
                  onChange={(e) =>
                    setMinCitations(e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  disabled={isSearching}
                />
              </div>
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={openAccessOnly}
                    onChange={(e) => setOpenAccessOnly(e.target.checked)}
                    disabled={isSearching}
                    className="rounded border-border"
                  />
                  <span className="text-sm text-foreground">Open Access</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={peerReviewedOnly}
                    onChange={(e) => setPeerReviewedOnly(e.target.checked)}
                    disabled={isSearching}
                    className="rounded border-border"
                  />
                  <span className="text-sm text-foreground">Peer Reviewed</span>
                </label>
              </div>
            </div>

            {/* AI Enhancement Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAIEnhancements}
                  onChange={(e) => setIncludeAIEnhancements(e.target.checked)}
                  disabled={isSearching}
                  className="rounded border-border"
                />
                <span className="text-sm font-medium text-foreground">
                  AI-Powered Enhancements
                </span>
                <span className="text-xs text-foreground-muted">
                  (query expansion, relevance explanations)
                </span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Results Area */}
      <div className="flex-1 overflow-auto">
        {/* Error State */}
        {error && (
          <div className="p-6">
            <Card className="bg-red-50 border-red-200 p-4">
              <div className="flex items-center gap-3">
                <X className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">Search Error</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* No Results Yet */}
        {!isSearching && !searchResponse && !error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Search Across 15 Sources
              </h3>
              <p className="text-sm text-foreground-muted">
                Enter a query to search academic papers, preprints, patents, datasets, and more.
                AI-powered query expansion helps find relevant results.
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isSearching && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-foreground-muted">
                Searching across {selectedSources.length} sources...
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {searchResponse && !isSearching && (
          <div className="p-6 space-y-6">
            {/* Search Meta */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-foreground">
                  {searchResponse.total.toLocaleString()} Results
                </h2>
                <Badge variant="secondary">
                  {searchResponse.searchMeta.sourcesSucceeded}/{searchResponse.searchMeta.sourcesQueried} sources
                </Badge>
                <Badge variant="secondary">
                  {searchResponse.searchMeta.totalTime}ms
                </Badge>
                {searchResponse.searchMeta.deduplicatedCount > 0 && (
                  <Badge variant="secondary">
                    {searchResponse.searchMeta.deduplicatedCount} duplicates removed
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={showSourceComparison ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setShowSourceComparison(!showSourceComparison)}
                >
                  <Filter className="h-4 w-4 mr-1" />
                  Compare Sources
                </Button>
                <div className="flex items-center border border-border rounded-md">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-background-surface' : ''}`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-background-surface' : ''}`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* AI Search Insights - Synthesized Summary */}
            {includeAIEnhancements && searchResponse.results.length > 0 && (
              <AISearchInsights
                query={query}
                results={searchResponse.results.map(r => ({
                  id: r.id,
                  title: r.title,
                  authors: r.authors,
                  abstract: r.abstract,
                  year: r.metadata.publicationDate ? parseInt(r.metadata.publicationDate.split('-')[0]) : undefined,
                  url: r.url,
                  citationCount: r.metadata.citationCount,
                }))}
                onRegenerate={() => {}}
              />
            )}

            {/* Source Comparison */}
            {showSourceComparison && (
              <SourceComparisonPanel
                bySource={searchResponse.bySource}
                crossReferences={searchResponse.crossReferences}
                results={searchResponse.results}
                onFilterBySource={setSourceFilter}
                selectedSourceFilter={sourceFilter}
              />
            )}

            {/* Active Source Filter */}
            {sourceFilter && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground-muted">Filtered by:</span>
                <Badge className="bg-primary/10 text-primary">
                  {SOURCE_DISPLAY_NAMES[sourceFilter]}
                  <button
                    onClick={() => setSourceFilter(null)}
                    className="ml-1.5 hover:text-primary-dark"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
                <span className="text-sm text-foreground-muted">
                  ({filteredResults.length} results)
                </span>
              </div>
            )}

            {/* Results List */}
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                  : 'space-y-4'
              }
            >
              {filteredResults.map((result) => {
                const crossRefs = getCrossRefsForResult(result.id)
                const relevance = searchResponse.aiEnhancements?.relevanceExplanations[result.id]

                // Get all sources for this result from cross-references
                const allSources = crossRefs.length > 0
                  ? crossRefs[0].sources
                  : [result.metadata.source]

                return (
                  <div key={result.id} className="relative">
                    <PaperCard paper={sourceToPaper(result)} />

                    {/* Overlay indicators */}
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      {allSources.length > 1 && (
                        <CrossReferenceIndicator sources={allSources} variant="badge" />
                      )}
                      {relevance && (
                        <AIRelevanceExplanation
                          resultId={result.id}
                          explanation={relevance}
                          variant="tooltip"
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* No Results After Filter */}
            {filteredResults.length === 0 && (
              <div className="text-center py-12">
                <p className="text-foreground-muted">
                  No results match the current filter.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSourceFilter(null)}
                  className="mt-2"
                >
                  Clear Filter
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
