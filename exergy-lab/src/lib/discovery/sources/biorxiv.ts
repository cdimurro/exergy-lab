/**
 * BioRxiv Adapter
 *
 * Searches biology preprints from BioRxiv.
 * API: https://api.biorxiv.org/
 * Rate: 100 requests/second (very generous)
 *
 * Features:
 * - Biology preprints
 * - Biomass and biofuel research
 * - Bioenergy
 * - Microbiology for energy applications
 * - Also supports medRxiv (medical preprints)
 */

import { BaseAdapter } from './base'
import {
  DataSourceName,
  Source,
  SearchFilters,
  SearchResult,
  Preprint,
} from '@/types/sources'
import { Domain } from '@/types/discovery'

/**
 * BioRxiv API response types
 */
interface BioRxivAPIResponse {
  messages: Array<{
    status: string
    total: number
  }>
  collection: Array<{
    doi: string
    title: string
    authors: string
    author_corresponding: string
    author_corresponding_institution: string
    date: string
    version: string
    type: string
    license: string
    category: string
    jatsxml: string
    abstract: string
    published: string
    server: string
  }>
}

/**
 * BioRxiv adapter implementation
 */
export class BioRxivAdapter extends BaseAdapter {
  readonly name: DataSourceName = 'biorxiv'
  readonly domains: Domain[] = [
    'bioenergy',
    'biomass',
    'carbon-capture', // For biological carbon capture
    'circular-economy', // For biomass lifecycle
  ]

  constructor() {
    super({
      baseUrl: 'https://api.biorxiv.org',
      requestsPerMinute: 100, // Very generous API
      requestsPerDay: 10000,
      cacheTTL: 6 * 60 * 60 * 1000, // 6 hours
    })
  }

  /**
   * Execute search query
   * Note: BioRxiv API doesn't have a search endpoint, so we'll use content search
   */
  protected async executeSearch(
    query: string,
    filters: SearchFilters = {}
  ): Promise<SearchResult> {
    const startTime = Date.now()

    // BioRxiv uses date-based retrieval, so we'll search recent papers
    const toDate = new Date().toISOString().split('T')[0]
    const fromDate = filters.yearFrom
      ? `${filters.yearFrom}-01-01`
      : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Make API request - search recent content
    // Note: BioRxiv API is limited, we're using the interval endpoint
    const response = await this.makeRequest<BioRxivAPIResponse>(
      `/details/biorxiv/${fromDate}/${toDate}/0/json`
    )

    // Filter results by query match in title or abstract
    const queryLower = query.toLowerCase()
    const filtered = response.collection.filter(
      (item) =>
        item.title.toLowerCase().includes(queryLower) ||
        item.abstract?.toLowerCase().includes(queryLower)
    )

    // Apply limit
    const limited = filtered.slice(0, filters.limit || 20)

    // Transform to standard format
    const sources: Source[] = limited.map((item) =>
      this.transformToSource(item)
    )

    return {
      sources,
      total: filtered.length,
      searchTime: Date.now() - startTime,
      query,
      filters,
      from: this.name,
    }
  }

  /**
   * Get details for a specific preprint by DOI
   */
  protected async executeGetDetails(id: string): Promise<Source | null> {
    try {
      // BioRxiv uses DOI for lookups
      const response = await this.makeRequest<BioRxivAPIResponse>(
        `/details/biorxiv/${id}/na/json`
      )

      if (!response.collection || response.collection.length === 0) {
        return null
      }

      return this.transformToSource(response.collection[0])
    } catch (error) {
      console.error(`[${this.name}] Failed to get details for ${id}:`, error)
      return null
    }
  }

  /**
   * Transform BioRxiv result to standard Source format
   */
  private transformToSource(item: any): Preprint {
    // Parse authors (comes as semicolon-separated string)
    const authors = item.authors
      ? item.authors.split(';').map((a: string) => a.trim())
      : []

    return {
      id: `biorxiv:${item.doi}`,
      title: item.title,
      authors,
      abstract: item.abstract,
      url: `https://www.biorxiv.org/content/${item.doi}`,
      doi: item.doi,
      metadata: {
        source: this.name,
        sourceType: 'preprint',
        quality: this.calculateQuality(item),
        verificationStatus: 'preprint',
        accessType: 'open',
        publicationDate: item.date,
      },
      server: item.server === 'medrxiv' ? 'medrxiv' : 'biorxiv',
      category: item.category,
      version: parseInt(item.version) || 1,
      submittedDate: item.date,
      publishedDate: item.published || item.date,
      relevanceScore: this.calculateRelevance(item),
    }
  }

  /**
   * Calculate quality score
   */
  private calculateQuality(item: any): number {
    let score = 70 // Base score for preprints

    // Boost for recent submissions
    const pubDate = new Date(item.date)
    const age = Date.now() - pubDate.getTime()
    const daysOld = age / (1000 * 60 * 60 * 24)

    if (daysOld <= 30) score += 10
    else if (daysOld <= 90) score += 5

    // Boost for multiple versions (shows engagement)
    const version = parseInt(item.version) || 1
    if (version > 1) score += 5

    // Boost for having DOI
    if (item.doi) score += 10

    // Boost for having complete abstract
    if (item.abstract && item.abstract.length > 100) score += 5

    return Math.min(100, score)
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(item: any): number {
    let score = 60 // Base score

    // Boost for recent papers
    const pubDate = new Date(item.date)
    const age = Date.now() - pubDate.getTime()
    const daysOld = age / (1000 * 60 * 60 * 24)

    if (daysOld <= 30) score += 20
    else if (daysOld <= 90) score += 15
    else if (daysOld <= 180) score += 10
    else if (daysOld <= 365) score += 5

    // Boost for relevant categories to bioenergy
    const relevantCategories = [
      'Microbiology',
      'Plant Biology',
      'Biochemistry',
      'Bioengineering',
      'Systems Biology',
    ]

    if (relevantCategories.some(cat => item.category?.includes(cat))) {
      score += 15
    }

    return Math.min(100, score)
  }

  /**
   * Test if API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Make a minimal test request
      const today = new Date().toISOString().split('T')[0]
      await this.makeRequest(`/details/biorxiv/${today}/${today}/0/json`)
      return true
    } catch (error) {
      console.error('[BioRxiv] Availability check failed:', error)
      return false
    }
  }

  /**
   * Override cache TTL
   */
  protected getCacheTTL(): number {
    return 6 * 60 * 60 * 1000 // 6 hours
  }
}

/**
 * Create and export BioRxiv adapter instance
 */
export const biorxivAdapter = new BioRxivAdapter()
