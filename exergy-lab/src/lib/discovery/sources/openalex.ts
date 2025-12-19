/**
 * OpenAlex API Adapter
 *
 * Searches OpenAlex for academic papers, authors, and institutions.
 * API: https://docs.openalex.org/
 *
 * Rate: 100,000 requests/day for polite users (include email in User-Agent)
 * Auth: None required (free API)
 *
 * Features:
 * - 250M+ works indexed
 * - Full text search across titles, abstracts
 * - Citation data
 * - Open access status
 * - Concept/topic filtering
 */

import { BaseAdapter } from './base'
import {
  DataSourceName,
  Source,
  AcademicPaper,
  SearchFilters,
  SearchResult,
} from '@/types/sources'
import { Domain } from '@/types/discovery'

/**
 * OpenAlex API response types
 */
interface OpenAlexWork {
  id: string // OpenAlex ID (format: https://openalex.org/W1234567)
  doi?: string
  title: string
  display_name: string
  publication_date?: string
  publication_year?: number
  type: string // 'journal-article', 'preprint', etc.
  open_access: {
    is_oa: boolean
    oa_status?: string
    oa_url?: string
  }
  authorships: Array<{
    author: {
      id: string
      display_name: string
      orcid?: string
    }
    institutions: Array<{
      id: string
      display_name: string
      country_code?: string
    }>
    author_position: 'first' | 'middle' | 'last'
  }>
  primary_location?: {
    source?: {
      id: string
      display_name: string
      issn_l?: string
      type: string
    }
    pdf_url?: string
    landing_page_url?: string
  }
  abstract_inverted_index?: Record<string, number[]>
  cited_by_count: number
  referenced_works_count?: number
  concepts?: Array<{
    id: string
    display_name: string
    level: number
    score: number
  }>
  topics?: Array<{
    id: string
    display_name: string
    score: number
    subfield?: { display_name: string }
    field?: { display_name: string }
    domain?: { display_name: string }
  }>
  sustainable_development_goals?: Array<{
    id: string
    display_name: string
    score: number
  }>
}

interface OpenAlexResponse {
  meta: {
    count: number
    db_response_time_ms: number
    page: number
    per_page: number
  }
  results: OpenAlexWork[]
}

/**
 * OpenAlex concept IDs for clean energy topics
 * Found via: https://api.openalex.org/concepts?filter=display_name.search:solar
 */
const DOMAIN_TO_OPENALEX_CONCEPTS: Partial<Record<Domain, string[]>> = {
  'solar-energy': [
    'C49204034',  // Solar cell
    'C115961682', // Photovoltaics
    'C178790620', // Solar energy
    'C2778407487', // Perovskite solar cell
  ],
  'wind-energy': [
    'C46312422',  // Wind power
    'C11413529',  // Wind turbine
  ],
  'battery-storage': [
    'C66586820',  // Lithium-ion battery
    'C185592680', // Energy storage
    'C199360897', // Battery
    'C2776243464', // Solid-state battery
  ],
  'hydrogen-fuel': [
    'C189061180', // Hydrogen fuel cell
    'C81363708',  // Electrolysis
    'C3018543220', // Green hydrogen
  ],
  'biomass': [
    'C2524010',   // Biomass
    'C171250308', // Biofuel
  ],
  'geothermal': [
    'C95701225',  // Geothermal energy
  ],
  'carbon-capture': [
    'C28490314',  // Carbon capture and storage
    'C2780478934', // Direct air capture
  ],
  'energy-efficiency': [
    'C2778755073', // Energy efficiency
  ],
  'grid-optimization': [
    'C124952713', // Smart grid
    'C44154836',  // Electric power system
  ],
  'materials-science': [
    'C192562407', // Materials science
    'C78519656',  // Semiconductor
    'C118552586', // Nanotechnology
  ],
}

/**
 * OpenAlex adapter implementation
 */
export class OpenAlexAdapter extends BaseAdapter {
  readonly name: DataSourceName = 'openalex'
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
  ]

  // Email for polite pool (higher rate limits)
  private readonly politeEmail = 'exergy-lab@anthropic.com'

  constructor() {
    super({
      baseUrl: 'https://api.openalex.org',
      requestsPerMinute: 100, // Conservative for free tier
      requestsPerDay: 50000,  // Well under 100k limit
      cacheTTL: 6 * 60 * 60 * 1000, // 6 hours
    })
  }

  /**
   * Execute search query against OpenAlex API
   */
  protected async executeSearch(
    query: string,
    filters: SearchFilters = {}
  ): Promise<SearchResult> {
    const startTime = Date.now()

    try {
      const limit = Math.min(filters.limit || 25, 200)

      // Build URL with filters
      const url = new URL(`${this.baseUrl}/works`)

      // Text search
      url.searchParams.set('search', query)

      // Filter for recent papers by default
      const yearFrom = filters.yearFrom || new Date().getFullYear() - 5
      const yearTo = filters.yearTo || new Date().getFullYear()
      url.searchParams.set('filter', `publication_year:${yearFrom}-${yearTo}`)

      // Add concept filter if domains specified
      if (filters.domains && filters.domains.length > 0) {
        const concepts: string[] = []
        for (const domain of filters.domains) {
          const domainConcepts = DOMAIN_TO_OPENALEX_CONCEPTS[domain]
          if (domainConcepts) {
            concepts.push(...domainConcepts)
          }
        }
        if (concepts.length > 0) {
          const currentFilter = url.searchParams.get('filter') || ''
          url.searchParams.set('filter', `${currentFilter},concepts.id:${concepts.join('|')}`)
        }
      }

      // Open access filter
      if (filters.openAccessOnly) {
        const currentFilter = url.searchParams.get('filter') || ''
        url.searchParams.set('filter', `${currentFilter},is_oa:true`)
      }

      // Citation filter
      if (filters.minCitations) {
        const currentFilter = url.searchParams.get('filter') || ''
        url.searchParams.set('filter', `${currentFilter},cited_by_count:>${filters.minCitations}`)
      }

      // Pagination and sorting
      url.searchParams.set('per-page', String(limit))
      url.searchParams.set('sort', 'relevance_score:desc')

      // Request specific fields to reduce response size
      url.searchParams.set('select', [
        'id', 'doi', 'title', 'display_name', 'publication_date', 'publication_year',
        'type', 'open_access', 'authorships', 'primary_location',
        'abstract_inverted_index', 'cited_by_count', 'concepts', 'topics',
      ].join(','))

      console.log(`[${this.name}] Searching: ${query}`)

      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': `ExergyLab/1.0 (mailto:${this.politeEmail})`,
        },
      })

      if (!response.ok) {
        throw new Error(`OpenAlex API error: HTTP ${response.status}`)
      }

      const data = await response.json() as OpenAlexResponse

      const papers = data.results.map(work => this.transformWork(work, query))

      console.log(`[${this.name}] Found ${papers.length} papers (total: ${data.meta.count})`)

      return {
        sources: papers,
        total: data.meta.count,
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
   * Transform OpenAlex work to our AcademicPaper type
   */
  private transformWork(work: OpenAlexWork, query: string): AcademicPaper {
    // Extract OpenAlex ID (format: https://openalex.org/W1234567)
    const openAlexId = work.id.split('/').pop() || work.id

    // Reconstruct abstract from inverted index
    const abstract = this.reconstructAbstract(work.abstract_inverted_index)

    // Get authors
    const authors = work.authorships.map(a => a.author.display_name)

    // Get journal/venue
    const journal = work.primary_location?.source?.display_name

    // Get PDF URL
    const pdfUrl = work.open_access.oa_url || work.primary_location?.pdf_url

    // Get fields of study from concepts
    const fieldsOfStudy = work.concepts
      ?.filter(c => c.level <= 2 && c.score > 0.3)
      .map(c => c.display_name)
      .slice(0, 5)

    return {
      id: `openalex:${openAlexId}`,
      title: work.display_name || work.title,
      authors,
      abstract,
      url: work.primary_location?.landing_page_url || `https://openalex.org/${openAlexId}`,
      doi: work.doi?.replace('https://doi.org/', ''),
      metadata: {
        source: this.name,
        sourceType: 'academic-paper',
        quality: this.calculateQuality(work),
        verificationStatus: work.type === 'preprint' ? 'preprint' : 'peer-reviewed',
        accessType: work.open_access.is_oa ? 'open' : 'subscription',
        citationCount: work.cited_by_count,
        publicationDate: work.publication_date,
      },
      journal,
      venue: journal,
      isOpenAccess: work.open_access.is_oa,
      pdfUrl,
      fieldsOfStudy,
      citedByCount: work.cited_by_count,
      relevanceScore: this.calculateRelevance(work, query),
    }
  }

  /**
   * Reconstruct abstract from OpenAlex inverted index format
   */
  private reconstructAbstract(invertedIndex?: Record<string, number[]>): string {
    if (!invertedIndex) return ''

    // Create array of [word, position] pairs
    const words: Array<[string, number]> = []

    for (const [word, positions] of Object.entries(invertedIndex)) {
      for (const pos of positions) {
        words.push([word, pos])
      }
    }

    // Sort by position
    words.sort((a, b) => a[1] - b[1])

    // Join words
    return words.map(([word]) => word).join(' ')
  }

  /**
   * Calculate quality score based on work metadata
   */
  private calculateQuality(work: OpenAlexWork): number {
    let quality = 80 // Base score for OpenAlex papers

    // Boost for high citations
    if (work.cited_by_count > 100) quality += 10
    else if (work.cited_by_count > 50) quality += 7
    else if (work.cited_by_count > 20) quality += 5
    else if (work.cited_by_count > 5) quality += 2

    // Boost for being in a journal
    if (work.primary_location?.source?.type === 'journal') quality += 5

    // Slight penalty for preprints
    if (work.type === 'preprint') quality -= 10

    return Math.min(100, Math.max(0, quality))
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(work: OpenAlexWork, query: string): number {
    let score = 50 // Base score

    // Boost for recent papers
    if (work.publication_year) {
      const yearsAgo = new Date().getFullYear() - work.publication_year
      if (yearsAgo <= 1) score += 25
      else if (yearsAgo <= 2) score += 20
      else if (yearsAgo <= 3) score += 15
      else if (yearsAgo <= 5) score += 10
    }

    // Boost for title match
    const queryTerms = query.toLowerCase().split(/\s+/)
    const titleLower = work.display_name.toLowerCase()
    const titleMatches = queryTerms.filter(term => term.length > 3 && titleLower.includes(term)).length
    score += Math.min((titleMatches / queryTerms.length) * 20, 20)

    // Boost for high citations
    if (work.cited_by_count > 50) score += 10
    else if (work.cited_by_count > 20) score += 7
    else if (work.cited_by_count > 5) score += 4

    // Boost for open access
    if (work.open_access.is_oa) score += 5

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Get details for a specific work
   */
  protected async executeGetDetails(id: string): Promise<Source | null> {
    try {
      // Extract OpenAlex ID from our format
      const openAlexId = id.replace('openalex:', '')

      const url = new URL(`${this.baseUrl}/works/${openAlexId}`)

      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': `ExergyLab/1.0 (mailto:${this.politeEmail})`,
        },
      })

      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error(`OpenAlex API error: HTTP ${response.status}`)
      }

      const work = await response.json() as OpenAlexWork

      return this.transformWork(work, '')
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
      const url = new URL(`${this.baseUrl}/works`)
      url.searchParams.set('search', 'solar cell')
      url.searchParams.set('per-page', '1')

      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': `ExergyLab/1.0 (mailto:${this.politeEmail})`,
        },
      })

      return response.ok
    } catch (error) {
      console.error(`[${this.name}] Availability check failed:`, error)
      return false
    }
  }
}

/**
 * Create and export OpenAlex adapter instance
 */
export const openAlexAdapter = new OpenAlexAdapter()
