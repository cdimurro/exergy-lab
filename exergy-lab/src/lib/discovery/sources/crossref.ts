/**
 * Crossref Adapter
 *
 * Searches Crossref metadata database with 140M+ works.
 * API: https://api.crossref.org/swagger-ui/index.html
 * Rate: 50 requests/second with polite pool (mailto parameter)
 *
 * Features:
 * - Comprehensive DOI metadata
 * - Citation counts
 * - References and citations
 * - Funder information
 * - License data
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
 * Crossref API response types
 */
interface CrossrefResponse {
  status: string
  'message-type': string
  'message-version': string
  message: {
    'total-results': number
    items: CrossrefWork[]
    'items-per-page': number
    query: {
      'start-index': number
      'search-terms': string
    }
  }
}

interface CrossrefWork {
  DOI: string
  title: string[]
  author?: Array<{
    given?: string
    family?: string
    name?: string
    sequence?: string
    affiliation?: Array<{ name: string }>
  }>
  abstract?: string
  'container-title'?: string[]
  publisher?: string
  issued?: {
    'date-parts': number[][]
  }
  published?: {
    'date-parts': number[][]
  }
  created?: {
    'date-parts': number[][]
    timestamp: number
  }
  volume?: string
  issue?: string
  page?: string
  type?: string
  subject?: string[]
  'is-referenced-by-count'?: number
  'references-count'?: number
  URL?: string
  link?: Array<{
    URL: string
    'content-type': string
    'intended-application': string
  }>
  license?: Array<{
    URL: string
    'content-version': string
    start?: {
      'date-parts': number[][]
    }
  }>
  funder?: Array<{
    name: string
    DOI?: string
    award?: string[]
  }>
  ISSN?: string[]
  'short-container-title'?: string[]
}

/**
 * Crossref adapter implementation
 */
export class CrossrefAdapter extends BaseAdapter {
  readonly name: DataSourceName = 'crossref'
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

  private readonly politeEmail = 'exergy-lab@example.com'

  constructor() {
    super({
      baseUrl: 'https://api.crossref.org',
      requestsPerMinute: 50, // Very generous with polite pool
      requestsPerDay: 100000,
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

    try {
      const params: Record<string, string> = {
        query: query,
        rows: String(Math.min(filters.limit || 20, 100)),
        mailto: this.politeEmail, // Use polite pool
        select: 'DOI,title,author,abstract,container-title,publisher,issued,volume,issue,page,type,subject,is-referenced-by-count,references-count,URL,link,license',
      }

      // Add date filter
      if (filters.yearFrom || filters.yearTo) {
        const from = filters.yearFrom || 2000
        const to = filters.yearTo || new Date().getFullYear()
        params.filter = `from-pub-date:${from}-01-01,until-pub-date:${to}-12-31`
      }

      // Add sort by relevance
      params.sort = 'relevance'
      params.order = 'desc'

      const url = `/works?${this.buildQueryString(params)}`

      console.log(`[${this.name}] Searching: ${query}`)

      const response = await this.makeRequest<CrossrefResponse>(url)

      const papers = response.message.items.map(work => this.transformWork(work, query))

      console.log(`[${this.name}] Found ${papers.length} papers (total: ${response.message['total-results']})`)

      return {
        sources: papers,
        total: response.message['total-results'],
        searchTime: Date.now() - startTime,
        query,
        filters,
        from: this.name,
      }
    } catch (error) {
      console.error(`[${this.name}] Search failed:`, error)
      throw error
    }
  }

  /**
   * Transform Crossref work to AcademicPaper
   */
  private transformWork(work: CrossrefWork, query: string): AcademicPaper {
    const title = work.title?.[0] || 'Untitled'

    // Extract authors
    const authors = (work.author || []).map(author => {
      if (author.name) return author.name
      if (author.family && author.given) return `${author.given} ${author.family}`
      if (author.family) return author.family
      return 'Unknown'
    })

    // Extract publication date
    const dateParts = work.issued?.['date-parts']?.[0] ||
                      work.published?.['date-parts']?.[0] ||
                      work.created?.['date-parts']?.[0]
    const year = dateParts?.[0]
    const month = dateParts?.[1] || 1
    const day = dateParts?.[2] || 1
    const pubDate = dateParts ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : undefined

    // Check for open access license
    const isOpenAccess = work.license?.some(lic =>
      lic.URL?.includes('creativecommons.org') ||
      lic['content-version'] === 'vor'
    ) || false

    // Get PDF link if available
    const pdfLink = work.link?.find(l =>
      l['content-type'] === 'application/pdf' ||
      l['intended-application'] === 'text-mining'
    )?.URL

    return {
      id: `crossref:${work.DOI}`,
      title,
      authors,
      abstract: work.abstract,
      url: work.URL || `https://doi.org/${work.DOI}`,
      doi: work.DOI,
      metadata: {
        source: this.name,
        sourceType: 'academic-paper',
        quality: 90,
        verificationStatus: 'peer-reviewed',
        accessType: isOpenAccess ? 'open' : 'subscription',
        citationCount: work['is-referenced-by-count'],
        publicationDate: pubDate,
      },
      journal: work['container-title']?.[0] || work['short-container-title']?.[0],
      volume: work.volume,
      issue: work.issue,
      pages: work.page,
      isOpenAccess,
      pdfUrl: pdfLink,
      fieldsOfStudy: work.subject,
      citedByCount: work['is-referenced-by-count'],
      relevanceScore: this.calculateRelevance(work, query),
    }
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(work: CrossrefWork, query: string): number {
    let score = 60 // Base score

    // Boost for citations
    const citations = work['is-referenced-by-count'] || 0
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
    const year = work.issued?.['date-parts']?.[0]?.[0] ||
                 work.published?.['date-parts']?.[0]?.[0]
    const currentYear = new Date().getFullYear()
    if (year && year >= currentYear - 2) {
      score += 10
    } else if (year && year >= currentYear - 5) {
      score += 5
    }

    // Boost for title match
    const queryTerms = query.toLowerCase().split(/\s+/)
    const titleLower = (work.title?.[0] || '').toLowerCase()
    const titleMatches = queryTerms.filter(term => titleLower.includes(term)).length
    score += (titleMatches / queryTerms.length) * 10

    // Boost for having abstract
    if (work.abstract && work.abstract.length > 100) {
      score += 5
    }

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Get details for a specific DOI
   */
  protected async executeGetDetails(id: string): Promise<Source | null> {
    try {
      // Extract DOI from our ID format
      const doi = id.replace('crossref:', '')

      const response = await this.makeRequest<{ message: CrossrefWork }>(`/works/${encodeURIComponent(doi)}?mailto=${this.politeEmail}`)

      return this.transformWork(response.message, '')
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
      const response = await fetch(`${this.baseUrl}/works?query=test&rows=1&mailto=${this.politeEmail}`)
      return response.ok
    } catch (error) {
      console.error(`[${this.name}] Availability check failed:`, error)
      return false
    }
  }
}

/**
 * Create and export Crossref adapter instance
 */
export const crossrefAdapter = new CrossrefAdapter()
