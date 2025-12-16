/**
 * IEEE Xplore Adapter
 *
 * Searches engineering and technology papers from IEEE Xplore.
 * API: https://developer.ieee.org/
 * Requires: IEEE Xplore API key (subscription required)
 *
 * Features:
 * - Engineering research papers
 * - Conference proceedings
 * - Standards
 * - Grid optimization
 * - Power electronics
 * - Smart grid technologies
 */

import { BaseAdapter } from './base'
import {
  DataSourceName,
  Source,
  SearchFilters,
  SearchResult,
  AcademicPaper,
} from '@/types/sources'
import { Domain } from '@/types/discovery'

/**
 * IEEE API response types
 */
interface IEEEAPIResponse {
  total_records: number
  articles: Array<{
    article_number: string
    title: string
    abstract: string
    authors: {
      authors: Array<{
        full_name: string
        affiliation: string
      }>
    }
    doi: string
    publication_year: number
    publication_title: string
    pdf_url: string
    html_url: string
    index_terms?: {
      ieee_terms?: {
        terms: string[]
      }
      author_terms?: {
        terms: string[]
      }
    }
    citing_paper_count?: number
    content_type: string
  }>
}

/**
 * IEEE Xplore adapter implementation
 */
export class IEEEAdapter extends BaseAdapter {
  readonly name: DataSourceName = 'ieee'
  readonly domains: Domain[] = [
    'grid-optimization',
    'battery-storage',
    'solar-energy',
    'wind-energy',
    'energy-efficiency',
    'hydrogen-fuel',
    'geothermal',
    'materials-science',
  ]

  constructor(apiKey?: string) {
    super({
      baseUrl: 'https://ieeexploreapi.ieee.org/api/v1',
      apiKey: apiKey || process.env.IEEE_API_KEY,
      requestsPerMinute: 10, // Conservative for subscription API
      requestsPerDay: 200,
      cacheTTL: 12 * 60 * 60 * 1000, // 12 hours
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

    if (!this.apiKey) {
      console.warn('[IEEE] No API key - returning mock results')
      return this.searchMock(query, filters, startTime)
    }

    try {
      const params: Record<string, any> = {
        apikey: this.apiKey,
        querytext: query,
        max_records: filters.limit || 20,
        start_record: 1,
        sort_field: 'publication_year',
        sort_order: 'desc',
      }

      // Add year filter if provided
      if (filters.yearFrom) {
        params.start_year = filters.yearFrom
      }
      if (filters.yearTo) {
        params.end_year = filters.yearTo
      }

      const queryString = this.buildQueryString(params)
      const response = await this.makeRequest<IEEEAPIResponse>(
        `/search/articles?${queryString}`
      )

      const sources: Source[] = (response.articles || []).map((article) =>
        this.transformToSource(article)
      )

      return {
        sources,
        total: response.total_records || 0,
        searchTime: Date.now() - startTime,
        query,
        filters,
        from: this.name,
      }
    } catch (error) {
      console.error('[IEEE] Search failed:', error)
      return this.searchMock(query, filters, startTime)
    }
  }

  /**
   * Mock search (when no API key available)
   */
  private async searchMock(
    query: string,
    filters: SearchFilters,
    startTime: number
  ): Promise<SearchResult> {
    return {
      sources: [],
      total: 0,
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
      if (!this.apiKey) {
        return null
      }

      const params = {
        apikey: this.apiKey,
        article_number: id,
      }

      const queryString = this.buildQueryString(params)
      const response = await this.makeRequest<IEEEAPIResponse>(
        `/search/articles?${queryString}`
      )

      if (!response.articles || response.articles.length === 0) {
        return null
      }

      return this.transformToSource(response.articles[0])
    } catch (error) {
      console.error(`[${this.name}] Failed to get details for ${id}:`, error)
      return null
    }
  }

  /**
   * Transform IEEE result to standard Source format
   */
  private transformToSource(article: any): AcademicPaper {
    const authors = article.authors?.authors
      ? article.authors.authors.map((a: any) => a.full_name)
      : []

    // Extract fields of study from index terms
    const fieldsOfStudy: string[] = []
    if (article.index_terms?.ieee_terms?.terms) {
      fieldsOfStudy.push(...article.index_terms.ieee_terms.terms)
    }
    if (article.index_terms?.author_terms?.terms) {
      fieldsOfStudy.push(...article.index_terms.author_terms.terms)
    }

    return {
      id: `ieee:${article.article_number}`,
      title: article.title,
      authors,
      abstract: article.abstract,
      url: article.html_url,
      doi: article.doi,
      metadata: {
        source: this.name,
        sourceType: 'academic-paper',
        quality: this.calculateQuality(article),
        verificationStatus: 'peer-reviewed',
        accessType: 'subscription', // IEEE typically requires subscription
        citationCount: article.citing_paper_count || 0,
        publicationDate: article.publication_year?.toString(),
      },
      journal: article.publication_title,
      isOpenAccess: false, // IEEE rarely open access
      pdfUrl: article.pdf_url,
      fieldsOfStudy,
      citedByCount: article.citing_paper_count || 0,
      relevanceScore: this.calculateRelevance(article),
    }
  }

  /**
   * Calculate quality score
   */
  private calculateQuality(article: any): number {
    let score = 90 // Base score for peer-reviewed IEEE papers

    // Boost for high citation count
    const citations = article.citing_paper_count || 0
    if (citations > 100) score += 10
    else if (citations > 50) score += 7
    else if (citations > 10) score += 5

    // No penalty for age - classic papers are valuable
    // But slight boost for recent
    const currentYear = new Date().getFullYear()
    const age = currentYear - (article.publication_year || currentYear)
    if (age <= 2) score += 5

    return Math.min(100, score)
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(article: any): number {
    let score = 75 // Base score

    // Boost for recent papers
    const currentYear = new Date().getFullYear()
    const age = currentYear - (article.publication_year || currentYear)

    if (age <= 1) score += 15
    else if (age <= 3) score += 12
    else if (age <= 5) score += 8
    else if (age <= 10) score += 4

    // Boost for citations
    const citations = article.citing_paper_count || 0
    if (citations > 100) score += 15
    else if (citations > 50) score += 12
    else if (citations > 10) score += 8
    else if (citations > 5) score += 4

    // Boost for having index terms (shows good categorization)
    if (article.index_terms) {
      score += 5
    }

    return Math.min(100, score)
  }

  /**
   * Test if API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        console.warn('[IEEE] No API key configured')
        return false
      }

      // IEEE API requires valid subscription key
      return true
    } catch (error) {
      console.error('[IEEE] Availability check failed:', error)
      return false
    }
  }

  /**
   * Override cache TTL
   */
  protected getCacheTTL(): number {
    return 12 * 60 * 60 * 1000 // 12 hours
  }
}

/**
 * Create and export IEEE adapter instance
 */
export const ieeeAdapter = new IEEEAdapter()
