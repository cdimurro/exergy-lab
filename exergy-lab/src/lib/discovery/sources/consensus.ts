/**
 * Consensus API Adapter
 *
 * Searches scientific consensus across research papers.
 * API: https://consensus.app/api
 * Rate: 100 requests/day (free tier)
 *
 * Features:
 * - Scientific consensus scoring
 * - Evidence-based summaries
 * - Supporting/contradicting papers
 * - Ideal for controversial topics
 */

import { BaseAdapter } from './base'
import {
  DataSourceName,
  Source,
  SearchFilters,
  SearchResult,
  ConsensusResult,
} from '@/types/sources'
import { Domain } from '@/types/discovery'

/**
 * Consensus API response types
 */
interface ConsensusAPIResponse {
  results: Array<{
    id: string
    title: string
    abstract: string
    authors: Array<{ name: string }>
    year: number
    doi?: string
    url: string
    citation_count: number
    consensus_score?: number
    evidence_type?: 'supporting' | 'contradicting' | 'neutral'
  }>
  total: number
  query: string
  consensus_summary?: string
}

/**
 * Consensus API adapter implementation
 */
export class ConsensusAdapter extends BaseAdapter {
  readonly name: DataSourceName = 'consensus'
  readonly domains: Domain[] = [
    'solar-energy',
    'wind-energy',
    'battery-storage',
    'hydrogen-fuel',
    'carbon-capture',
    'biomass',
    'geothermal',
    'grid-optimization',
    'energy-efficiency',
  ]

  constructor(apiKey?: string) {
    super({
      baseUrl: 'https://consensus.app/api/v1',
      apiKey: apiKey || process.env.CONSENSUS_API_KEY,
      requestsPerMinute: 10, // Conservative for free tier
      requestsPerDay: 100,
      cacheTTL: 24 * 60 * 60 * 1000, // 24 hours (consensus doesn't change fast)
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
      q: query,
      limit: filters.limit || 20,
    }

    if (filters.yearFrom) {
      params.year_min = filters.yearFrom
    }

    if (filters.yearTo) {
      params.year_max = filters.yearTo
    }

    // Make API request
    const queryString = this.buildQueryString(params)
    const response = await this.makeRequest<ConsensusAPIResponse>(
      `/search?${queryString}`
    )

    // Transform to standard format
    const sources: Source[] = response.results.map((result) =>
      this.transformToSource(result)
    )

    return {
      sources,
      total: response.total,
      searchTime: Date.now() - startTime,
      query,
      filters,
      from: this.name,
    }
  }

  /**
   * Get details for a specific paper
   */
  protected async executeGetDetails(id: string): Promise<Source | null> {
    try {
      // Consensus API doesn't have a details endpoint
      // We'll need to search by ID or DOI
      const response = await this.makeRequest<ConsensusAPIResponse>(
        `/search?q=${encodeURIComponent(id)}&limit=1`
      )

      if (response.results.length === 0) {
        return null
      }

      return this.transformToSource(response.results[0])
    } catch (error) {
      console.error(`[${this.name}] Failed to get details for ${id}:`, error)
      return null
    }
  }

  /**
   * Transform Consensus result to standard Source format
   */
  private transformToSource(result: any): ConsensusResult {
    return {
      id: `consensus:${result.id}`,
      title: result.title,
      authors: result.authors?.map((a: any) => a.name) || [],
      abstract: result.abstract,
      url: result.url,
      doi: result.doi,
      metadata: {
        source: this.name,
        sourceType: 'consensus',
        quality: this.calculateQuality(result),
        verificationStatus: 'peer-reviewed', // Consensus aggregates peer-reviewed papers
        accessType: 'open',
        citationCount: result.citation_count,
        publicationDate: result.year?.toString(),
      },
      consensusScore: result.consensus_score,
      evidenceCount: result.citation_count,
      summary: result.abstract,
      relevanceScore: this.calculateRelevance(result),
    }
  }

  /**
   * Calculate quality score
   */
  private calculateQuality(result: any): number {
    let score = 80 // Base score for consensus results

    // Boost for high citation count
    if (result.citation_count > 100) score += 10
    else if (result.citation_count > 50) score += 5

    // Boost for recent publications
    const currentYear = new Date().getFullYear()
    const age = currentYear - (result.year || 2000)
    if (age <= 2) score += 10
    else if (age <= 5) score += 5

    // Boost for high consensus score
    if (result.consensus_score >= 80) score += 10
    else if (result.consensus_score >= 60) score += 5

    return Math.min(100, score)
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(result: any): number {
    // Start with consensus score if available
    let score = result.consensus_score || 50

    // Boost for recent papers
    const currentYear = new Date().getFullYear()
    const age = currentYear - (result.year || 2000)
    if (age <= 1) score += 15
    else if (age <= 3) score += 10
    else if (age <= 5) score += 5

    // Boost for citations
    if (result.citation_count > 100) score += 15
    else if (result.citation_count > 50) score += 10
    else if (result.citation_count > 10) score += 5

    return Math.min(100, score)
  }

  /**
   * Test if API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        console.warn('[Consensus] No API key configured')
        return false
      }

      // Make a minimal test request
      await this.makeRequest('/search?q=test&limit=1')
      return true
    } catch (error) {
      console.error('[Consensus] Availability check failed:', error)
      return false
    }
  }

  /**
   * Override cache TTL for consensus (longer TTL)
   */
  protected getCacheTTL(): number {
    return 24 * 60 * 60 * 1000 // 24 hours
  }
}

/**
 * Create and export Consensus adapter instance
 */
export const consensusAdapter = new ConsensusAdapter()
