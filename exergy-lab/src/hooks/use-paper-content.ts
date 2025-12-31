/**
 * usePaperContent Hook
 *
 * Fetches and manages paper content from the API.
 * Handles loading, error states, and caching.
 */

import { useEffect, useCallback, useRef } from 'react'
import type { Source } from '@/types/sources'
import type { PaperContent, FetchContentOptions } from '@/lib/paper-content'
import { useSearchUIStore } from '@/lib/store/search-ui-store'

/**
 * API response type
 */
interface PaperContentApiResponse {
  success: boolean
  content?: PaperContent
  error?: {
    code: string
    message: string
  }
}

/**
 * Hook options
 */
interface UsePaperContentOptions {
  /**
   * Auto-fetch content when paper changes
   */
  autoFetch?: boolean
  /**
   * Content fetch options
   */
  fetchOptions?: FetchContentOptions
}

/**
 * Hook return type
 */
interface UsePaperContentReturn {
  /**
   * The fetched paper content
   */
  content: PaperContent | null
  /**
   * Whether content is loading
   */
  isLoading: boolean
  /**
   * Error message if fetch failed
   */
  error: string | null
  /**
   * Fetch content for a paper
   */
  fetchContent: (paper: Source, options?: FetchContentOptions) => Promise<PaperContent | null>
  /**
   * Refresh current content
   */
  refresh: () => Promise<void>
  /**
   * Clear content and error
   */
  clear: () => void
}

/**
 * Simple in-memory cache for paper content
 */
const contentCache = new Map<string, { content: PaperContent; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCacheKey(paper: Source): string {
  return `${paper.metadata.source}:${paper.id}`
}

function getCachedContent(paper: Source): PaperContent | null {
  const key = getCacheKey(paper)
  const cached = contentCache.get(key)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.content
  }

  // Clean up expired entry
  if (cached) {
    contentCache.delete(key)
  }

  return null
}

function setCachedContent(paper: Source, content: PaperContent): void {
  const key = getCacheKey(paper)
  contentCache.set(key, { content, timestamp: Date.now() })

  // Limit cache size
  if (contentCache.size > 50) {
    const oldestKey = contentCache.keys().next().value
    if (oldestKey) {
      contentCache.delete(oldestKey)
    }
  }
}

/**
 * Hook for fetching paper content
 */
export function usePaperContent(options: UsePaperContentOptions = {}): UsePaperContentReturn {
  const { autoFetch = true, fetchOptions } = options

  const {
    selectedPaper,
    paperContent,
    isLoadingContent,
    contentError,
    setPaperContent,
    setContentLoading,
    setContentError,
  } = useSearchUIStore()

  // Track current fetch to avoid race conditions
  const fetchIdRef = useRef(0)

  /**
   * Fetch content from API
   */
  const fetchContent = useCallback(
    async (paper: Source, opts?: FetchContentOptions): Promise<PaperContent | null> => {
      const fetchId = ++fetchIdRef.current

      // Check cache first
      const cached = getCachedContent(paper)
      if (cached) {
        setPaperContent(cached)
        return cached
      }

      setContentLoading(true)
      setContentError(null)

      try {
        const response = await fetch('/api/papers/content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paper: {
              id: paper.id,
              title: paper.title,
              url: paper.url,
              abstract: paper.abstract,
              authors: paper.authors,
              doi: paper.doi,
              metadata: {
                source: paper.metadata.source,
                sourceType: paper.metadata.sourceType,
                quality: paper.metadata.quality,
                publicationDate: paper.metadata.publicationDate,
                citationCount: paper.metadata.citationCount,
                verificationStatus: paper.metadata.verificationStatus,
                accessType: paper.metadata.accessType,
              },
            },
            options: opts || fetchOptions,
          }),
        })

        // Check if this is still the current fetch
        if (fetchId !== fetchIdRef.current) {
          return null
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error?.message || `HTTP ${response.status}`)
        }

        const data: PaperContentApiResponse = await response.json()

        if (!data.success || !data.content) {
          throw new Error(data.error?.message || 'Failed to fetch content')
        }

        // Cache the result
        setCachedContent(paper, data.content)

        // Update store
        setPaperContent(data.content)

        return data.content
      } catch (error) {
        // Check if this is still the current fetch
        if (fetchId !== fetchIdRef.current) {
          return null
        }

        const message = error instanceof Error ? error.message : 'Unknown error'
        setContentError(message)
        console.error('[usePaperContent] Fetch error:', error)
        return null
      }
    },
    [fetchOptions, setPaperContent, setContentLoading, setContentError]
  )

  /**
   * Refresh current content
   */
  const refresh = useCallback(async () => {
    if (selectedPaper) {
      // Clear cache for this paper
      const key = getCacheKey(selectedPaper)
      contentCache.delete(key)

      // Re-fetch
      await fetchContent(selectedPaper, fetchOptions)
    }
  }, [selectedPaper, fetchContent, fetchOptions])

  /**
   * Clear content and error
   */
  const clear = useCallback(() => {
    setPaperContent(null)
    setContentError(null)
  }, [setPaperContent, setContentError])

  /**
   * Auto-fetch when paper changes
   */
  useEffect(() => {
    if (autoFetch && selectedPaper) {
      fetchContent(selectedPaper, fetchOptions)
    }
  }, [autoFetch, selectedPaper, fetchContent, fetchOptions])

  return {
    content: paperContent,
    isLoading: isLoadingContent,
    error: contentError,
    fetchContent,
    refresh,
    clear,
  }
}

/**
 * Preload content for a paper (fire and forget)
 */
export function preloadPaperContent(paper: Source, options?: FetchContentOptions): void {
  // Check if already cached
  if (getCachedContent(paper)) {
    return
  }

  // Fire and forget fetch
  fetch('/api/papers/content', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paper: {
        id: paper.id,
        title: paper.title,
        url: paper.url,
        abstract: paper.abstract,
        authors: paper.authors,
        doi: paper.doi,
        metadata: paper.metadata,
      },
      options,
    }),
  })
    .then((response) => response.json())
    .then((data: PaperContentApiResponse) => {
      if (data.success && data.content) {
        setCachedContent(paper, data.content)
      }
    })
    .catch((error) => {
      console.warn('[preloadPaperContent] Failed:', error)
    })
}
