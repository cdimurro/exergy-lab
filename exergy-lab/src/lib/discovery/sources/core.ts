/**
 * CORE Adapter
 *
 * Searches CORE - world's largest collection of open access research papers.
 * API: https://core.ac.uk/documentation/api
 * Rate: 10 requests/minute (free tier), more with API key
 *
 * Features:
 * - 200M+ open access research papers
 * - Full text access
 * - Global repository aggregation
 * - Semantic search capabilities
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
 * CORE API response types
 */
interface CORESearchResponse {
  totalHits: number
  limit: number
  offset: number
  scrollId?: string
  results: COREArticle[]
}

interface COREArticle {
  id: string | number
  doi?: string
  title?: string
  authors?: Array<{
    name?: string
  }>
  abstract?: string
  fullText?: string
  publisher?: string
  publishedDate?: string
  updatedDate?: string
  yearPublished?: number
  downloadUrl?: string
  sourceFulltextUrls?: string[]
  documentType?: string
  language?: {
    code?: string
    name?: string
  }
  journals?: Array<{
    title?: string
    identifiers?: string[]
  }>
  repositories?: Array<{
    id: string
    name?: string
  }>
  links?: Array<{
    type: string
    url: string
  }>
  citationCount?: number
  topics?: string[]
  subjects?: string[]
  fieldOfStudy?: string
}

/**
 * CORE adapter implementation
 */
export class COREAdapter extends BaseAdapter {
  readonly name: DataSourceName = 'core'
  readonly domains: Domain[] = [
    'solar-energy',
    'wind-energy',
    'battery-storage',
    'hydrogen-fuel',
    'biomass',
    'geothermal',
    'carbon-capture',
    'energy-efficiency',
    'grid-optimization',
    'materials-science',
    'other',
  ]

  constructor(apiKey?: string) {
    super({
      baseUrl: 'https://api.core.ac.uk/v3',
      apiKey: apiKey || process.env.CORE_API_KEY,
      requestsPerMinute: apiKey ? 30 : 10, // Higher limit with API key
      requestsPerDay: apiKey ? 10000 : 1000,
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

    try {
      const limit = Math.min(filters.limit || 20, 100)

      // Build search body
      const searchBody: Record<string, any> = {
        q: query,
        limit,
        offset: 0,
      }

      // Add date filter
      if (filters.yearFrom || filters.yearTo) {
        const from = filters.yearFrom || 2000
        const to = filters.yearTo || new Date().getFullYear()
        searchBody.q += ` AND yearPublished>=${from} AND yearPublished<=${to}`
      }

      // Add open access filter (CORE is all open access, but we can filter for quality)
      searchBody.q += ' AND _exists_:abstract'

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`
      }

      console.log(`[${this.name}] Searching: ${query}`)

      const response = await fetch(`${this.baseUrl}/search/works`, {
        method: 'POST',
        headers,
        body: JSON.stringify(searchBody),
      })

      if (!response.ok) {
        throw new Error(`CORE search failed: HTTP ${response.status}`)
      }

      const data = await response.json() as CORESearchResponse

      const papers = (data.results || []).map(article => this.transformArticle(article, query))

      console.log(`[${this.name}] Found ${papers.length} papers (total: ${data.totalHits})`)

      return {
        sources: papers,
        total: data.totalHits,
        searchTime: Date.now() - startTime,
        query,
        filters,
        from: this.name,
      }
    } catch (error) {
      console.error(`[${this.name}] Search failed:`, error)

      // Return empty results on error (CORE may be rate limited)
      return {
        sources: [],
        total: 0,
        searchTime: Date.now() - startTime,
        query,
        filters,
        from: this.name,
      }
    }
  }

  /**
   * Transform CORE article to AcademicPaper
   */
  private transformArticle(article: COREArticle, query: string): AcademicPaper {
    const title = article.title || 'Untitled'

    // Extract authors
    const authors = (article.authors || [])
      .map(a => a.name)
      .filter((name): name is string => !!name)

    // Extract publication date
    const year = article.yearPublished
    const pubDate = article.publishedDate || (year ? `${year}-01-01` : undefined)

    // Get download URL (prefer full text)
    const downloadUrl = article.downloadUrl ||
                        article.sourceFulltextUrls?.[0] ||
                        article.links?.find(l => l.type === 'download')?.url

    // Get journal info
    const journal = article.journals?.[0]?.title

    return {
      id: `core:${article.id}`,
      title,
      authors,
      abstract: article.abstract,
      url: downloadUrl || `https://core.ac.uk/works/${article.id}`,
      doi: article.doi,
      metadata: {
        source: this.name,
        sourceType: 'academic-paper',
        quality: 80, // Slightly lower since includes preprints and theses
        verificationStatus: article.documentType === 'journal-article' ? 'peer-reviewed' : 'preprint',
        accessType: 'open', // CORE is all open access
        citationCount: article.citationCount,
        publicationDate: pubDate,
      },
      journal,
      isOpenAccess: true, // CORE is all open access
      pdfUrl: downloadUrl,
      fieldsOfStudy: article.subjects || article.topics,
      citedByCount: article.citationCount,
      relevanceScore: this.calculateRelevance(article, query),
    }
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(article: COREArticle, query: string): number {
    let score = 55 // Base score (lower than other sources since includes theses etc.)

    // Boost for citations
    const citations = article.citationCount || 0
    if (citations > 100) {
      score += 20
    } else if (citations > 50) {
      score += 15
    } else if (citations > 10) {
      score += 10
    } else if (citations > 0) {
      score += 5
    }

    // Boost for recent publications
    const year = article.yearPublished
    const currentYear = new Date().getFullYear()
    if (year && year >= currentYear - 2) {
      score += 10
    } else if (year && year >= currentYear - 5) {
      score += 5
    }

    // Boost for title match
    const queryTerms = query.toLowerCase().split(/\s+/)
    const titleLower = (article.title || '').toLowerCase()
    const titleMatches = queryTerms.filter(term => titleLower.includes(term)).length
    score += (titleMatches / queryTerms.length) * 10

    // Boost for having abstract
    if (article.abstract && article.abstract.length > 100) {
      score += 5
    }

    // Boost for having download URL
    if (article.downloadUrl || article.sourceFulltextUrls?.length) {
      score += 5
    }

    // Boost for journal articles (vs theses, dissertations)
    if (article.documentType === 'journal-article') {
      score += 10
    }

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Get details for a specific article
   */
  protected async executeGetDetails(id: string): Promise<Source | null> {
    try {
      // Extract CORE ID from our ID format
      const coreId = id.replace('core:', '')

      const headers: Record<string, string> = {}
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`
      }

      const response = await fetch(`${this.baseUrl}/works/${coreId}`, { headers })

      if (!response.ok) {
        throw new Error(`CORE fetch failed: HTTP ${response.status}`)
      }

      const article = await response.json() as COREArticle

      return this.transformArticle(article, '')
    } catch (error) {
      console.error(`[${this.name}] Failed to get details for ${id}:`, error)
      return null
    }
  }

  /**
   * Test if API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const headers: Record<string, string> = {}
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`
      }

      // Test with a simple search
      const response = await fetch(`${this.baseUrl}/search/works`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: 'test', limit: 1 }),
      })

      return response.ok
    } catch (error) {
      console.error(`[${this.name}] Availability check failed:`, error)
      return false
    }
  }
}

/**
 * Create and export CORE adapter instance
 */
export const coreAdapter = new COREAdapter()
