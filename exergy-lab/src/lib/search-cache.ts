/**
 * Search Result Cache
 *
 * Caches search results for 10 minutes to avoid redundant API calls
 * Cache key is based on search parameters (query, sources, domains, filters)
 */

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // milliseconds
}

class SearchCache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private readonly DEFAULT_TTL = 10 * 60 * 1000 // 10 minutes

  /**
   * Generate cache key from search parameters
   */
  private generateKey(params: Record<string, any>): string {
    return JSON.stringify({
      query: params.query,
      sources: Array.isArray(params.sources) ? params.sources.sort() : undefined,
      domains: Array.isArray(params.domains) ? params.domains.sort() : undefined,
      dateRange: params.dateRange,
      minCitations: params.minCitations,
      openAccessOnly: params.openAccessOnly,
      peerReviewedOnly: params.peerReviewedOnly,
      includeAIEnhancements: params.includeAIEnhancements,
    })
  }

  /**
   * Check if cache entry exists and is still valid
   */
  private isValid(entry: CacheEntry<any>): boolean {
    const age = Date.now() - entry.timestamp
    return age < entry.ttl
  }

  /**
   * Get cached result if available and valid
   */
  get<T>(params: Record<string, any>): T | null {
    const key = this.generateKey(params)
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    if (!this.isValid(entry)) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Store result in cache
   */
  set<T>(params: Record<string, any>, data: T, ttl: number = this.DEFAULT_TTL): void {
    const key = this.generateKey(params)
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number
    entries: number
  } {
    let validEntries = 0
    for (const entry of this.cache.values()) {
      if (this.isValid(entry)) {
        validEntries++
      }
    }
    return {
      size: this.cache.size,
      entries: validEntries,
    }
  }
}

// Export singleton instance
export const searchCache = new SearchCache()
