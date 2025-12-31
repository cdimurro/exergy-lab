/**
 * useSearch Hook (v0.0.6)
 *
 * Comprehensive search hook for the PowerSearchPage that leverages
 * all 15 data sources through the DataSourceRegistry.
 *
 * Features:
 * - Multi-source federation with parallel execution
 * - Live source status indicators
 * - AI query expansion preview
 * - Batch operations support
 * - Filter management (domains, sources, dates, citations)
 * - Workflow context integration for cross-page data passing
 * - Search history tracking
 * - Result caching
 */

import { useState, useCallback, useRef, useMemo } from 'react'
import { useWorkflowContext } from '@/lib/store'
import type { Source, SearchFilters, DataSourceName, DataSourceType } from '@/types/sources'
import type { Domain } from '@/types/discovery'

// ============================================================================
// Types
// ============================================================================

export type SourceStatus = 'idle' | 'searching' | 'success' | 'error' | 'unavailable'

export interface SourceStatusInfo {
  name: DataSourceName
  displayName: string
  status: SourceStatus
  resultCount: number
  searchTime: number
  error?: string
  type: 'academic' | 'patent' | 'dataset' | 'preprint' | 'web'
  requiresApiKey: boolean
  isAvailable: boolean
}

export interface SearchState {
  query: string
  expandedQuery: string | null
  results: Source[]
  totalCount: number
  isSearching: boolean
  error: string | null
  searchTime: number
  sourceStatuses: Record<DataSourceName, SourceStatusInfo>
  selectedResults: Set<string>
  deduplicatedCount: number
}

export interface SearchFiltersState {
  domains: Domain[]
  sources: DataSourceName[]
  yearFrom: number | null
  yearTo: number | null
  minCitations: number
  openAccessOnly: boolean
  peerReviewedOnly: boolean
  limit: number
}

export interface SearchHistoryItem {
  query: string
  timestamp: number
  resultCount: number
  domains: Domain[]
}

export type SortOption = 'relevance' | 'citations' | 'date' | 'title'
export type ViewMode = 'list' | 'grid' | 'graph'

// ============================================================================
// Constants
// ============================================================================

// 15 implemented data sources
export const ALL_DATA_SOURCES: DataSourceName[] = [
  // Academic (6)
  'semantic-scholar',
  'openalex',
  'pubmed',
  'crossref',
  'core',
  'ieee',
  // Preprints (3)
  'arxiv',
  'biorxiv',
  'chemrxiv',
  // Patents (2)
  'google-patents',
  'uspto',
  // Datasets (2)
  'nrel',
  'materials-project',
  // AI/Consensus (1)
  'consensus',
  // Web (1)
  'web-search',
]

export const SOURCE_DISPLAY_NAMES: Record<DataSourceName, string> = {
  'semantic-scholar': 'Semantic Scholar',
  'openalex': 'OpenAlex',
  'arxiv': 'arXiv',
  'pubmed': 'PubMed',
  'crossref': 'Crossref',
  'core': 'CORE',
  'ieee': 'IEEE Xplore',
  'biorxiv': 'bioRxiv',
  'chemrxiv': 'ChemRxiv',
  'medrxiv': 'medRxiv',
  'google-patents': 'Google Patents',
  'uspto': 'USPTO',
  'epo': 'European Patent Office',
  'nrel': 'NREL',
  'materials-project': 'Materials Project',
  'consensus': 'Consensus',
  'web-search': 'Web Search',
  'iea': 'IEA',
  'eia': 'EIA',
  'zenodo': 'Zenodo',
  'inspire': 'INSPIRE-HEP',
  'newsapi': 'News API',
}

export const SOURCE_TYPES: Record<DataSourceName, 'academic' | 'patent' | 'dataset' | 'preprint' | 'web'> = {
  'semantic-scholar': 'academic',
  'openalex': 'academic',
  'arxiv': 'preprint',
  'pubmed': 'academic',
  'crossref': 'academic',
  'core': 'academic',
  'ieee': 'academic',
  'biorxiv': 'preprint',
  'chemrxiv': 'preprint',
  'medrxiv': 'preprint',
  'google-patents': 'patent',
  'uspto': 'patent',
  'epo': 'patent',
  'nrel': 'dataset',
  'materials-project': 'dataset',
  'consensus': 'academic',
  'web-search': 'web',
  'iea': 'dataset',
  'eia': 'dataset',
  'zenodo': 'dataset',
  'inspire': 'academic',
  'newsapi': 'web',
}

export const SOURCES_REQUIRING_API_KEY: DataSourceName[] = [
  'ieee',
  'consensus',
  'web-search',
  'google-patents',
  'materials-project',
]

export const DEFAULT_FILTERS: SearchFiltersState = {
  domains: [],
  sources: [],
  yearFrom: null,
  yearTo: null,
  minCitations: 0,
  openAccessOnly: false,
  peerReviewedOnly: false,
  limit: 100,
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useSearch() {
  // State
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    expandedQuery: null,
    results: [],
    totalCount: 0,
    isSearching: false,
    error: null,
    searchTime: 0,
    sourceStatuses: initializeSourceStatuses(),
    selectedResults: new Set(),
    deduplicatedCount: 0,
  })

  const [filters, setFilters] = useState<SearchFiltersState>(DEFAULT_FILTERS)
  const [sortBy, setSortBy] = useState<SortOption>('relevance')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])

  // Workflow context for cross-page data passing
  const { setSourcePapers, setLastTool } = useWorkflowContext()

  // Abort controller for cancelling ongoing searches
  const abortControllerRef = useRef<AbortController | null>(null)

  // ============================================================================
  // Core Search Function
  // ============================================================================

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchState(prev => ({
        ...prev,
        error: 'Please enter a search query',
      }))
      return
    }

    // Cancel any ongoing search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    const startTime = Date.now()

    // Reset state and set searching
    setSearchState(prev => ({
      ...prev,
      query,
      isSearching: true,
      error: null,
      results: [],
      totalCount: 0,
      sourceStatuses: initializeSourceStatuses('searching'),
      selectedResults: new Set(),
    }))

    try {
      // Call the enhanced search API
      const response = await fetch('/api/search/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          filters: {
            domains: filters.domains.length > 0 ? filters.domains : undefined,
            sources: filters.sources.length > 0 ? filters.sources : undefined,
            yearFrom: filters.yearFrom || undefined,
            yearTo: filters.yearTo || undefined,
            minCitations: filters.minCitations > 0 ? filters.minCitations : undefined,
            openAccessOnly: filters.openAccessOnly || undefined,
            peerReviewedOnly: filters.peerReviewedOnly || undefined,
            limit: filters.limit,
          },
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`)
      }

      const data = await response.json()
      const searchTime = Date.now() - startTime

      // Update source statuses from response
      const updatedStatuses = { ...initializeSourceStatuses() }
      if (data.bySource) {
        for (const [sourceName, sourceData] of Object.entries(data.bySource)) {
          const name = sourceName as DataSourceName
          if (updatedStatuses[name]) {
            const status = sourceData as { count: number; time: number; success: boolean; error?: string }
            updatedStatuses[name] = {
              ...updatedStatuses[name],
              status: status.success ? 'success' : 'error',
              resultCount: status.count,
              searchTime: status.time,
              error: status.error,
            }
          }
        }
      }

      // Sort results based on current sort option
      const sortedResults = sortResults(data.sources || [], sortBy)

      setSearchState(prev => ({
        ...prev,
        query,
        expandedQuery: data.expandedQuery || null,
        results: sortedResults,
        totalCount: data.total || sortedResults.length,
        isSearching: false,
        error: null,
        searchTime,
        sourceStatuses: updatedStatuses,
        deduplicatedCount: data.deduplicatedCount || 0,
      }))

      // Add to search history
      setSearchHistory(prev => [
        {
          query,
          timestamp: Date.now(),
          resultCount: sortedResults.length,
          domains: filters.domains,
        },
        ...prev.slice(0, 19), // Keep last 20 searches
      ])

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // Search was cancelled, ignore
        return
      }

      console.error('Search error:', error)
      setSearchState(prev => ({
        ...prev,
        isSearching: false,
        error: error instanceof Error ? error.message : 'Search failed',
        sourceStatuses: initializeSourceStatuses('error'),
      }))
    }
  }, [filters, sortBy])

  // ============================================================================
  // AI Query Expansion Preview
  // ============================================================================

  const getQueryExpansion = useCallback(async (query: string): Promise<string | null> => {
    if (!query.trim() || query.length < 3) return null

    try {
      const response = await fetch('/api/search/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })

      if (!response.ok) return null

      const data = await response.json()
      return data.expandedQuery || null
    } catch {
      return null
    }
  }, [])

  // ============================================================================
  // Selection Management
  // ============================================================================

  const toggleSelection = useCallback((id: string) => {
    setSearchState(prev => {
      const newSelected = new Set(prev.selectedResults)
      if (newSelected.has(id)) {
        newSelected.delete(id)
      } else {
        newSelected.add(id)
      }
      return { ...prev, selectedResults: newSelected }
    })
  }, [])

  const selectAll = useCallback(() => {
    setSearchState(prev => ({
      ...prev,
      selectedResults: new Set(prev.results.map(r => r.id)),
    }))
  }, [])

  const clearSelection = useCallback(() => {
    setSearchState(prev => ({
      ...prev,
      selectedResults: new Set(),
    }))
  }, [])

  const getSelectedPapers = useCallback(() => {
    return searchState.results.filter(r => searchState.selectedResults.has(r.id))
  }, [searchState.results, searchState.selectedResults])

  // ============================================================================
  // Workflow Integration
  // ============================================================================

  const sendToExperiments = useCallback(() => {
    const selectedPapers = getSelectedPapers()
    if (selectedPapers.length === 0) return

    // Extract parameters from selected papers
    const extractedParams: Record<string, number> = {}
    // In production, this would use AI to extract parameters from abstracts

    setSourcePapers({
      ids: selectedPapers.map(p => p.id),
      titles: selectedPapers.map(p => p.title),
      extractedParameters: extractedParams,
      keywords: selectedPapers.flatMap(p => p.metadata.sourceType ? [p.metadata.sourceType] : []),
      authors: selectedPapers.flatMap(p => p.authors || []).slice(0, 10),
      citations: selectedPapers.reduce((sum, p) => sum + (p.metadata.citationCount || 0), 0),
    })
    setLastTool('search')

    // Navigate to experiments page (handled by caller)
    return '/experiments'
  }, [getSelectedPapers, setSourcePapers, setLastTool])

  const sendToSimulations = useCallback(() => {
    const selectedPapers = getSelectedPapers()
    if (selectedPapers.length === 0) return

    // Similar to sendToExperiments but for simulations
    setSourcePapers({
      ids: selectedPapers.map(p => p.id),
      titles: selectedPapers.map(p => p.title),
      extractedParameters: {},
      keywords: [],
      authors: selectedPapers.flatMap(p => p.authors || []).slice(0, 10),
      citations: selectedPapers.reduce((sum, p) => sum + (p.metadata.citationCount || 0), 0),
    })
    setLastTool('search')

    return '/simulations'
  }, [getSelectedPapers, setSourcePapers, setLastTool])

  // ============================================================================
  // Filter Management
  // ============================================================================

  const updateFilters = useCallback((updates: Partial<SearchFiltersState>) => {
    setFilters(prev => ({ ...prev, ...updates }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  const toggleDomain = useCallback((domain: Domain) => {
    setFilters(prev => ({
      ...prev,
      domains: prev.domains.includes(domain)
        ? prev.domains.filter(d => d !== domain)
        : [...prev.domains, domain],
    }))
  }, [])

  const toggleSource = useCallback((source: DataSourceName) => {
    setFilters(prev => ({
      ...prev,
      sources: prev.sources.includes(source)
        ? prev.sources.filter(s => s !== source)
        : [...prev.sources, source],
    }))
  }, [])

  // ============================================================================
  // Sorting
  // ============================================================================

  const updateSort = useCallback((newSort: SortOption) => {
    setSortBy(newSort)
    setSearchState(prev => ({
      ...prev,
      results: sortResults(prev.results, newSort),
    }))
  }, [])

  // ============================================================================
  // Source Groups for UI
  // ============================================================================

  const sourceGroups = useMemo(() => {
    const groups: Record<'academic' | 'patent' | 'dataset' | 'preprint' | 'web', SourceStatusInfo[]> = {
      academic: [],
      patent: [],
      dataset: [],
      preprint: [],
      web: [],
    }

    for (const [name, status] of Object.entries(searchState.sourceStatuses)) {
      const type = status.type
      if (groups[type]) {
        groups[type].push(status)
      }
    }

    return groups
  }, [searchState.sourceStatuses])

  // ============================================================================
  // Statistics
  // ============================================================================

  const stats = useMemo(() => {
    const successful = Object.values(searchState.sourceStatuses).filter(
      s => s.status === 'success'
    ).length
    const total = Object.keys(searchState.sourceStatuses).length
    const available = Object.values(searchState.sourceStatuses).filter(
      s => s.isAvailable
    ).length

    return {
      sourcesSearched: successful,
      totalSources: total,
      availableSources: available,
      totalResults: searchState.totalCount,
      deduplicatedCount: searchState.deduplicatedCount,
      searchTime: searchState.searchTime,
      selectedCount: searchState.selectedResults.size,
    }
  }, [searchState])

  // ============================================================================
  // Return Hook API
  // ============================================================================

  return {
    // State
    ...searchState,
    filters,
    sortBy,
    viewMode,
    searchHistory,
    sourceGroups,
    stats,

    // Actions
    search,
    getQueryExpansion,
    toggleSelection,
    selectAll,
    clearSelection,
    getSelectedPapers,
    sendToExperiments,
    sendToSimulations,
    updateFilters,
    resetFilters,
    toggleDomain,
    toggleSource,
    updateSort,
    setViewMode,
    clearHistory: () => setSearchHistory([]),
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function initializeSourceStatuses(
  defaultStatus: SourceStatus = 'idle'
): Record<DataSourceName, SourceStatusInfo> {
  const statuses: Record<DataSourceName, SourceStatusInfo> = {} as Record<DataSourceName, SourceStatusInfo>

  for (const name of ALL_DATA_SOURCES) {
    statuses[name] = {
      name,
      displayName: SOURCE_DISPLAY_NAMES[name] || name,
      status: defaultStatus,
      resultCount: 0,
      searchTime: 0,
      type: SOURCE_TYPES[name] || 'academic',
      requiresApiKey: SOURCES_REQUIRING_API_KEY.includes(name),
      isAvailable: true, // Will be updated by API response
    }
  }

  return statuses
}

function sortResults(results: Source[], sortBy: SortOption): Source[] {
  const sorted = [...results]

  switch (sortBy) {
    case 'relevance':
      sorted.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      break
    case 'citations':
      sorted.sort((a, b) => (b.metadata.citationCount || 0) - (a.metadata.citationCount || 0))
      break
    case 'date':
      sorted.sort((a, b) => {
        const dateA = a.metadata.publicationDate || a.createdAt || ''
        const dateB = b.metadata.publicationDate || b.createdAt || ''
        return dateB.localeCompare(dateA)
      })
      break
    case 'title':
      sorted.sort((a, b) => a.title.localeCompare(b.title))
      break
  }

  return sorted
}

// ============================================================================
// Export Types
// ============================================================================

export type UseSearchReturn = ReturnType<typeof useSearch>
