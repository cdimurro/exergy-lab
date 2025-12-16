/**
 * ChemRxiv Adapter
 *
 * Searches chemistry preprints from ChemRxiv.
 * API: https://chemrxiv.org/engage/chemrxiv/public-api
 *
 * Features:
 * - Chemistry preprints
 * - Materials science
 * - Battery chemistry
 * - Catalysis
 * - Energy storage chemistry
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
 * ChemRxiv API response types
 */
interface ChemRxivAPIResponse {
  itemHits: Array<{
    item: {
      id: string
      title: string
      abstract: string
      authors: Array<{ firstName: string; lastName: string }>
      doi: string
      publishedDate: string
      submittedDate: string
      version: number
      category: string
      asset: {
        original: {
          url: string
        }
      }
    }
  }>
  totalCount: number
}

/**
 * ChemRxiv adapter implementation
 */
export class ChemRxivAdapter extends BaseAdapter {
  readonly name: DataSourceName = 'chemrxiv'
  readonly domains: Domain[] = [
    'battery-storage',
    'hydrogen-fuel-cells',
    'carbon-capture',
    'solar-energy', // For materials science
    'energy-efficiency', // For catalysis
  ]

  constructor() {
    super({
      baseUrl: 'https://chemrxiv.org/engage/chemrxiv/public-api/v1',
      requestsPerMinute: 30,
      requestsPerDay: 1000,
      cacheTTL: 6 * 60 * 60 * 1000, // 6 hours
    })
  }

  /**
   * Execute search query
   */
  protected async executeSearch(
    query: string,
    filters: SearchFilters = {}
  ): Promise<SearchResult> {
    const startTime = Date.now()

    // Build search parameters
    const params: Record<string, any> = {
      term: query,
      limit: filters.limit || 20,
      skip: 0,
    }

    // Make API request
    const queryString = this.buildQueryString(params)
    const response = await this.makeRequest<ChemRxivAPIResponse>(
      `/items?${queryString}`
    )

    // Transform to standard format
    const sources: Source[] = response.itemHits.map((hit) =>
      this.transformToSource(hit.item)
    )

    return {
      sources,
      total: response.totalCount,
      searchTime: Date.now() - startTime,
      query,
      filters,
      from: this.name,
    }
  }

  /**
   * Get details for a specific preprint
   */
  protected async executeGetDetails(id: string): Promise<Source | null> {
    try {
      const response = await this.makeRequest<{ item: any }>(
        `/items/${id}`
      )

      if (!response.item) {
        return null
      }

      return this.transformToSource(response.item)
    } catch (error) {
      console.error(`[${this.name}] Failed to get details for ${id}:`, error)
      return null
    }
  }

  /**
   * Transform ChemRxiv result to standard Source format
   */
  private transformToSource(item: any): Preprint {
    const authors = item.authors?.map(
      (a: any) => `${a.firstName} ${a.lastName}`
    ) || []

    return {
      id: `chemrxiv:${item.id}`,
      title: item.title,
      authors,
      abstract: item.abstract,
      url: `https://chemrxiv.org/engage/chemrxiv/article-details/${item.id}`,
      doi: item.doi,
      metadata: {
        source: this.name,
        sourceType: 'preprint',
        quality: this.calculateQuality(item),
        verificationStatus: 'preprint',
        accessType: 'open',
        publicationDate: item.publishedDate,
      },
      server: 'chemrxiv',
      category: item.category,
      version: item.version,
      submittedDate: item.submittedDate,
      publishedDate: item.publishedDate,
      relevanceScore: this.calculateRelevance(item),
    }
  }

  /**
   * Calculate quality score
   */
  private calculateQuality(item: any): number {
    let score = 70 // Base score for preprints

    // Boost for recent submissions
    const submittedDate = new Date(item.submittedDate)
    const age = Date.now() - submittedDate.getTime()
    const daysOld = age / (1000 * 60 * 60 * 24)

    if (daysOld <= 30) score += 10
    else if (daysOld <= 90) score += 5

    // Boost for multiple versions (shows engagement)
    if (item.version > 1) score += 5

    // Boost for having DOI
    if (item.doi) score += 10

    return Math.min(100, score)
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(item: any): number {
    let score = 60 // Base score

    // Boost for recent papers
    const publishedDate = new Date(item.publishedDate)
    const age = Date.now() - publishedDate.getTime()
    const daysOld = age / (1000 * 60 * 60 * 24)

    if (daysOld <= 30) score += 20
    else if (daysOld <= 90) score += 15
    else if (daysOld <= 180) score += 10
    else if (daysOld <= 365) score += 5

    // Boost for relevant categories
    const relevantCategories = [
      'Energy',
      'Materials Science',
      'Physical Chemistry',
      'Catalysis',
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
      await this.makeRequest('/items?limit=1')
      return true
    } catch (error) {
      console.error('[ChemRxiv] Availability check failed:', error)
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
 * Create and export ChemRxiv adapter instance
 */
export const chemrxivAdapter = new ChemRxivAdapter()
