'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============================================================================
// Types
// ============================================================================

export interface SavedSearch {
  id: string
  query: string
  domains: string[]
  sources: string[]
  filters: {
    dateRange?: { from: string; to: string }
    minCitations?: number
    openAccess?: boolean
  }
  resultCount: number
  timestamp: number
  isFavorite: boolean
}

export interface RecentQuery {
  query: string
  timestamp: number
  resultCount: number
}

interface SearchHistoryState {
  // State
  savedSearches: SavedSearch[]
  recentQueries: RecentQuery[]
  maxRecentQueries: number

  // Actions
  addRecentQuery: (query: string, resultCount: number) => void
  clearRecentQueries: () => void
  saveSearch: (search: Omit<SavedSearch, 'id' | 'timestamp' | 'isFavorite'>) => void
  deleteSearch: (id: string) => void
  toggleFavorite: (id: string) => void
  clearSavedSearches: () => void
  getQuerySuggestions: (partial: string) => string[]
}

// ============================================================================
// Store
// ============================================================================

export const useSearchHistory = create<SearchHistoryState>()(
  persist(
    (set, get) => ({
      // Initial state
      savedSearches: [],
      recentQueries: [],
      maxRecentQueries: 20,

      // Add a recent query
      addRecentQuery: (query: string, resultCount: number) => {
        const trimmedQuery = query.trim()
        if (!trimmedQuery) return

        set((state) => {
          // Remove duplicate if exists
          const filtered = state.recentQueries.filter(
            (q) => q.query.toLowerCase() !== trimmedQuery.toLowerCase()
          )

          // Add new query at the beginning
          const updated = [
            { query: trimmedQuery, timestamp: Date.now(), resultCount },
            ...filtered,
          ].slice(0, state.maxRecentQueries)

          return { recentQueries: updated }
        })
      },

      // Clear all recent queries
      clearRecentQueries: () => {
        set({ recentQueries: [] })
      },

      // Save a search with full configuration
      saveSearch: (search) => {
        const id = `search-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

        set((state) => ({
          savedSearches: [
            {
              ...search,
              id,
              timestamp: Date.now(),
              isFavorite: false,
            },
            ...state.savedSearches,
          ],
        }))
      },

      // Delete a saved search
      deleteSearch: (id: string) => {
        set((state) => ({
          savedSearches: state.savedSearches.filter((s) => s.id !== id),
        }))
      },

      // Toggle favorite status
      toggleFavorite: (id: string) => {
        set((state) => ({
          savedSearches: state.savedSearches.map((s) =>
            s.id === id ? { ...s, isFavorite: !s.isFavorite } : s
          ),
        }))
      },

      // Clear all saved searches
      clearSavedSearches: () => {
        set({ savedSearches: [] })
      },

      // Get query suggestions based on partial input
      getQuerySuggestions: (partial: string) => {
        const { recentQueries, savedSearches } = get()
        const lowerPartial = partial.toLowerCase()

        // Combine recent queries and saved search queries
        const allQueries = [
          ...recentQueries.map((q) => q.query),
          ...savedSearches.map((s) => s.query),
        ]

        // Filter and deduplicate
        const suggestions = [...new Set(allQueries)]
          .filter((q) => q.toLowerCase().includes(lowerPartial))
          .slice(0, 10)

        return suggestions
      },
    }),
    {
      name: 'exergy-lab-search-history',
      partialize: (state) => ({
        savedSearches: state.savedSearches,
        recentQueries: state.recentQueries,
      }),
    }
  )
)

// ============================================================================
// Utility hooks
// ============================================================================

/**
 * Get favorite saved searches
 */
export function useFavoriteSearches() {
  const savedSearches = useSearchHistory((state) => state.savedSearches)
  return savedSearches.filter((s) => s.isFavorite)
}

/**
 * Get recent queries sorted by timestamp
 */
export function useRecentQueries(limit?: number) {
  const recentQueries = useSearchHistory((state) => state.recentQueries)
  return limit ? recentQueries.slice(0, limit) : recentQueries
}

/**
 * Get search statistics
 */
export function useSearchStats() {
  const savedSearches = useSearchHistory((state) => state.savedSearches)
  const recentQueries = useSearchHistory((state) => state.recentQueries)

  const totalSearches = recentQueries.length
  const savedCount = savedSearches.length
  const favoriteCount = savedSearches.filter((s) => s.isFavorite).length
  const totalResults = recentQueries.reduce((sum, q) => sum + q.resultCount, 0)

  // Most common domains
  const domainCounts: Record<string, number> = {}
  savedSearches.forEach((s) => {
    s.domains.forEach((d) => {
      domainCounts[d] = (domainCounts[d] || 0) + 1
    })
  })

  const topDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([domain, count]) => ({ domain, count }))

  return {
    totalSearches,
    savedCount,
    favoriteCount,
    totalResults,
    topDomains,
  }
}
