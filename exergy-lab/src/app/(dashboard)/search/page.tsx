'use client'

import * as React from 'react'
import { AlertCircle, Sparkles } from 'lucide-react'
import { SearchBar, PaperCard, FilterPanel } from '@/components/search'
import { Skeleton } from '@/components/ui'
import type { SearchQuery, SearchResult, SearchFilters, Paper, SavedPaper } from '@/types/search'

export default function SearchPage() {
  const [searchResult, setSearchResult] = React.useState<SearchResult | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [filters, setFilters] = React.useState<SearchFilters>({})
  const [savedPapers, setSavedPapers] = React.useState<Set<string>>(new Set())

  // Load saved papers from localStorage on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('saved-papers')
      if (saved) {
        const papers: SavedPaper[] = JSON.parse(saved)
        setSavedPapers(new Set(papers.map((p) => p.id)))
      }
    } catch (error) {
      console.error('Failed to load saved papers:', error)
    }
  }, [])

  const handleSearch = async (query: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const searchQuery: SearchQuery = {
        query,
        filters,
      }

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchQuery),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Search failed')
      }

      const result: SearchResult = await response.json()
      setSearchResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during search')
      setSearchResult(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters)
  }

  const handleResetFilters = () => {
    setFilters({})
  }

  const handleSavePaper = (paper: Paper) => {
    try {
      const saved = localStorage.getItem('saved-papers')
      const existingPapers: SavedPaper[] = saved ? JSON.parse(saved) : []

      const isSaved = savedPapers.has(paper.id)

      if (isSaved) {
        // Remove from saved
        const updated = existingPapers.filter((p) => p.id !== paper.id)
        localStorage.setItem('saved-papers', JSON.stringify(updated))
        setSavedPapers((prev) => {
          const newSet = new Set(prev)
          newSet.delete(paper.id)
          return newSet
        })
      } else {
        // Add to saved
        const savedPaper: SavedPaper = {
          ...paper,
          savedAt: new Date().toISOString(),
        }
        existingPapers.push(savedPaper)
        localStorage.setItem('saved-papers', JSON.stringify(existingPapers))
        setSavedPapers((prev) => new Set(prev).add(paper.id))
      }
    } catch (error) {
      console.error('Failed to save paper:', error)
    }
  }

  // Filter papers based on current filters
  const filteredPapers = React.useMemo(() => {
    if (!searchResult) return []

    let papers = searchResult.papers

    // Apply domain filter
    if (filters.domains && filters.domains.length > 0) {
      papers = papers.filter((paper) =>
        paper.fields?.some((field) =>
          filters.domains!.some((domain) => field.toLowerCase().includes(domain.toLowerCase()))
        )
      )
    }

    // Apply year range filter
    if (filters.yearRange) {
      const [minYear, maxYear] = filters.yearRange
      papers = papers.filter((paper) => {
        const year = new Date(paper.publicationDate).getFullYear()
        return year >= minYear && year <= maxYear
      })
    }

    // Apply min citations filter
    if (filters.minCitations !== undefined) {
      papers = papers.filter((paper) => paper.citationCount >= filters.minCitations!)
    }

    // Apply venue filter
    if (filters.venues && filters.venues.length > 0) {
      papers = papers.filter((paper) =>
        filters.venues!.some((venue) =>
          paper.venue?.toLowerCase().includes(venue.toLowerCase())
        )
      )
    }

    return papers
  }, [searchResult, filters])

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Academic Search</h1>
              <p className="text-sm text-foreground-muted mt-1">
                AI-powered search across multiple research databases
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <SearchBar
            onSearch={handleSearch}
            isLoading={isLoading}
            expandedQuery={searchResult?.expandedQuery}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filter Panel - Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <div className="p-4 rounded-xl bg-background-elevated border border-border">
                <FilterPanel
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  onReset={handleResetFilters}
                  resultsCount={filteredPapers.length}
                />
              </div>
            </div>
          </div>

          {/* Results - Main Area */}
          <div className="lg:col-span-3">
            {/* Error State */}
            {error && (
              <div className="p-6 rounded-xl bg-red-50 border border-red-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-900 mb-1">Search Error</h3>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-6 rounded-xl bg-background-elevated border border-border">
                    <Skeleton className="h-6 w-3/4 mb-3" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <Skeleton className="h-20 w-full mb-3" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Results */}
            {!isLoading && !error && searchResult && (
              <>
                {filteredPapers.length > 0 ? (
                  <div className="space-y-4">
                    {filteredPapers.map((paper) => (
                      <PaperCard
                        key={paper.id}
                        paper={paper}
                        onSave={handleSavePaper}
                        isSaved={savedPapers.has(paper.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center rounded-xl bg-background-elevated border border-border">
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-background-surface">
                        <AlertCircle className="w-8 h-8 text-foreground-muted" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-foreground mb-2">
                          No papers found
                        </h3>
                        <p className="text-sm text-foreground-muted">
                          Try adjusting your filters or search query
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Empty State - No Search Yet */}
            {!isLoading && !error && !searchResult && (
              <div className="p-12 text-center rounded-xl bg-background-elevated border border-border">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Start Your Research
                    </h3>
                    <p className="text-sm text-foreground-muted mb-4">
                      Enter a query above to search across academic databases
                    </p>
                    <div className="text-xs text-foreground-muted space-y-1">
                      <p>• Semantic Scholar for comprehensive coverage</p>
                      <p>• arXiv for preprints and latest research</p>
                      <p>• PubMed for biomedical literature</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
