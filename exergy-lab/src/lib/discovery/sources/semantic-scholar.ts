/**
 * Semantic Scholar API Adapter
 *
 * Searches Semantic Scholar for academic papers with rich citation data.
 * API: https://api.semanticscholar.org/
 *
 * Rate: 1 req/sec without key, 10 req/sec with key
 * Auth: Optional API key for higher rate limits
 *
 * Features:
 * - Full text search across papers
 * - Rich citation metadata and graphs
 * - Fields of study filtering
 * - Influential citation tracking
 * - Paper recommendations
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
 * Semantic Scholar API response types
 */
interface S2Paper {
  paperId: string
  externalIds?: {
    DOI?: string
    ArXiv?: string
    PubMed?: string
    DBLP?: string
    MAG?: string
  }
  url?: string
  title: string
  abstract?: string
  venue?: string
  publicationVenue?: {
    id?: string
    name?: string
    type?: string
    alternate_names?: string[]
    url?: string
  }
  year?: number
  referenceCount?: number
  citationCount?: number
  influentialCitationCount?: number
  isOpenAccess?: boolean
  openAccessPdf?: {
    url: string
    status: string
  }
  fieldsOfStudy?: string[]
  s2FieldsOfStudy?: Array<{
    category: string
    source: string
  }>
  authors?: Array<{
    authorId: string
    name: string
  }>
  publicationDate?: string
  citations?: S2Paper[]
  references?: S2Paper[]
}

interface S2SearchResponse {
  total: number
  offset: number
  next?: number
  data: S2Paper[]
}

interface S2RecommendationsResponse {
  recommendedPapers: S2Paper[]
}

/**
 * Field mappings for Semantic Scholar
 */
const DOMAIN_TO_S2_FIELDS: Partial<Record<Domain, string[]>> = {
  'solar-energy': ['Materials Science', 'Physics', 'Engineering', 'Environmental Science'],
  'wind-energy': ['Engineering', 'Physics', 'Environmental Science'],
  'battery-storage': ['Materials Science', 'Chemistry', 'Engineering', 'Physics'],
  'hydrogen-fuel': ['Chemistry', 'Engineering', 'Materials Science', 'Physics'],
  'biomass': ['Environmental Science', 'Chemistry', 'Biology', 'Agricultural and Food Sciences'],
  'geothermal': ['Geology', 'Engineering', 'Environmental Science'],
  'carbon-capture': ['Chemistry', 'Environmental Science', 'Engineering', 'Materials Science'],
  'energy-efficiency': ['Engineering', 'Environmental Science', 'Economics'],
  'grid-optimization': ['Engineering', 'Computer Science', 'Physics'],
  'materials-science': ['Materials Science', 'Physics', 'Chemistry'],
}

/**
 * Fields to request from API
 */
const PAPER_FIELDS = [
  'paperId',
  'externalIds',
  'url',
  'title',
  'abstract',
  'venue',
  'publicationVenue',
  'year',
  'referenceCount',
  'citationCount',
  'influentialCitationCount',
  'isOpenAccess',
  'openAccessPdf',
  'fieldsOfStudy',
  's2FieldsOfStudy',
  'authors',
  'publicationDate',
].join(',')

/**
 * Semantic Scholar adapter implementation
 */
export class SemanticScholarAdapter extends BaseAdapter {
  readonly name: DataSourceName = 'semantic-scholar'
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

  constructor(apiKey?: string) {
    super({
      baseUrl: 'https://api.semanticscholar.org/graph/v1',
      apiKey: apiKey || process.env.SEMANTIC_SCHOLAR_API_KEY,
      // Rate limits: 1 req/sec without key, 10 req/sec with key
      requestsPerMinute: apiKey ? 600 : 60,
      requestsPerDay: apiKey ? 10000 : 1000,
      cacheTTL: 12 * 60 * 60 * 1000, // 12 hours
    })
  }

  /**
   * Execute search query against Semantic Scholar API
   */
  protected async executeSearch(
    query: string,
    filters: SearchFilters = {}
  ): Promise<SearchResult> {
    const startTime = Date.now()

    try {
      const limit = Math.min(filters.limit || 25, 100)

      // Build search URL
      const url = new URL(`${this.baseUrl}/paper/search`)
      url.searchParams.set('query', query)
      url.searchParams.set('limit', String(limit))
      url.searchParams.set('fields', PAPER_FIELDS)

      // Add year filter if specified
      if (filters.yearFrom || filters.yearTo) {
        const from = filters.yearFrom || 1900
        const to = filters.yearTo || new Date().getFullYear()
        url.searchParams.set('year', `${from}-${to}`)
      }

      // Add open access filter if specified
      if (filters.openAccessOnly) {
        url.searchParams.set('openAccessPdf', '')
      }

      // Add fields of study filter if domains specified
      if (filters.domains && filters.domains.length > 0) {
        const fields: string[] = []
        for (const domain of filters.domains) {
          const domainFields = DOMAIN_TO_S2_FIELDS[domain]
          if (domainFields) {
            fields.push(...domainFields)
          }
        }
        if (fields.length > 0) {
          const uniqueFields = [...new Set(fields)]
          url.searchParams.set('fieldsOfStudy', uniqueFields.join(','))
        }
      }

      // Add minimum citation filter
      if (filters.minCitations) {
        url.searchParams.set('minCitationCount', String(filters.minCitations))
      }

      console.log(`[${this.name}] Searching: ${query}`)

      const headers: Record<string, string> = {
        'Accept': 'application/json',
      }
      if (this.apiKey) {
        headers['x-api-key'] = this.apiKey
      }

      const response = await this.fetchWithTimeout(url.toString(), { headers }, 15000)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Semantic Scholar API error: HTTP ${response.status} - ${errorText}`)
      }

      const data: S2SearchResponse = await response.json()

      const papers = data.data.map(paper => this.transformPaper(paper, query))

      console.log(`[${this.name}] Found ${papers.length} papers (total: ${data.total})`)

      return {
        sources: papers,
        total: data.total,
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
   * Transform Semantic Scholar paper to our AcademicPaper type
   */
  private transformPaper(paper: S2Paper, query: string): AcademicPaper {
    return {
      id: `s2:${paper.paperId}`,
      title: paper.title,
      authors: paper.authors?.map(a => a.name) || [],
      abstract: paper.abstract,
      url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
      doi: paper.externalIds?.DOI,
      metadata: {
        source: this.name,
        sourceType: 'academic-paper',
        quality: this.calculateQuality(paper),
        verificationStatus: 'peer-reviewed',
        accessType: paper.isOpenAccess ? 'open' : 'subscription',
        citationCount: paper.citationCount,
        publicationDate: paper.publicationDate || (paper.year ? `${paper.year}-01-01` : undefined),
      },
      journal: paper.publicationVenue?.name || paper.venue,
      venue: paper.venue,
      isOpenAccess: paper.isOpenAccess,
      pdfUrl: paper.openAccessPdf?.url,
      fieldsOfStudy: paper.fieldsOfStudy,
      citedByCount: paper.citationCount,
      influentialCitationCount: paper.influentialCitationCount,
      s2FieldsOfStudy: paper.s2FieldsOfStudy,
      relevanceScore: this.calculateRelevance(paper, query),
    }
  }

  /**
   * Calculate paper quality score
   */
  private calculateQuality(paper: S2Paper): number {
    let quality = 70 // Base quality for peer-reviewed papers

    // Boost for citation count
    if (paper.citationCount) {
      if (paper.citationCount >= 1000) quality += 15
      else if (paper.citationCount >= 100) quality += 10
      else if (paper.citationCount >= 10) quality += 5
    }

    // Boost for influential citations
    if (paper.influentialCitationCount && paper.influentialCitationCount >= 10) {
      quality += 10
    }

    // Boost for open access
    if (paper.isOpenAccess) {
      quality += 5
    }

    return Math.min(100, quality)
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(paper: S2Paper, query: string): number {
    let score = 50 // Base score

    // Boost for recent papers
    if (paper.year) {
      const yearsAgo = new Date().getFullYear() - paper.year
      if (yearsAgo <= 1) score += 20
      else if (yearsAgo <= 2) score += 15
      else if (yearsAgo <= 5) score += 10
      else if (yearsAgo <= 10) score += 5
    }

    // Boost for citation count
    if (paper.citationCount) {
      if (paper.citationCount >= 1000) score += 15
      else if (paper.citationCount >= 100) score += 10
      else if (paper.citationCount >= 10) score += 5
    }

    // Boost for influential citations
    if (paper.influentialCitationCount) {
      if (paper.influentialCitationCount >= 50) score += 10
      else if (paper.influentialCitationCount >= 10) score += 5
    }

    // Boost for title match
    const queryTerms = query.toLowerCase().split(/\s+/)
    const titleLower = (paper.title || '').toLowerCase()
    const titleMatches = queryTerms.filter(term => term.length > 3 && titleLower.includes(term)).length
    score += Math.min((titleMatches / Math.max(queryTerms.length, 1)) * 15, 15)

    // Boost for open access
    if (paper.isOpenAccess) {
      score += 5
    }

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Get details for a specific paper
   */
  protected async executeGetDetails(id: string): Promise<Source | null> {
    try {
      // Extract paper ID from our format
      const paperId = id.replace('s2:', '')

      const url = `${this.baseUrl}/paper/${paperId}?fields=${PAPER_FIELDS}`

      const headers: Record<string, string> = {
        'Accept': 'application/json',
      }
      if (this.apiKey) {
        headers['x-api-key'] = this.apiKey
      }

      const response = await this.fetchWithTimeout(url, { headers }, 10000)

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Semantic Scholar API error: HTTP ${response.status}`)
      }

      const paper: S2Paper = await response.json()
      return this.transformPaper(paper, '')
    } catch (error) {
      console.error(`[${this.name}] Failed to get details for ${id}:`, error)
      return null
    }
  }

  /**
   * Get paper citations
   */
  async getCitations(paperId: string, limit: number = 50): Promise<AcademicPaper[]> {
    try {
      const id = paperId.replace('s2:', '')
      const url = `${this.baseUrl}/paper/${id}/citations?fields=${PAPER_FIELDS}&limit=${limit}`

      const headers: Record<string, string> = {
        'Accept': 'application/json',
      }
      if (this.apiKey) {
        headers['x-api-key'] = this.apiKey
      }

      const response = await this.fetchWithTimeout(url, { headers }, 15000)

      if (!response.ok) {
        throw new Error(`Semantic Scholar API error: HTTP ${response.status}`)
      }

      const data: { data: Array<{ citingPaper: S2Paper }> } = await response.json()
      return data.data.map(d => this.transformPaper(d.citingPaper, ''))
    } catch (error) {
      console.error(`[${this.name}] Failed to get citations for ${paperId}:`, error)
      return []
    }
  }

  /**
   * Get paper references
   */
  async getReferences(paperId: string, limit: number = 50): Promise<AcademicPaper[]> {
    try {
      const id = paperId.replace('s2:', '')
      const url = `${this.baseUrl}/paper/${id}/references?fields=${PAPER_FIELDS}&limit=${limit}`

      const headers: Record<string, string> = {
        'Accept': 'application/json',
      }
      if (this.apiKey) {
        headers['x-api-key'] = this.apiKey
      }

      const response = await this.fetchWithTimeout(url, { headers }, 15000)

      if (!response.ok) {
        throw new Error(`Semantic Scholar API error: HTTP ${response.status}`)
      }

      const data: { data: Array<{ citedPaper: S2Paper }> } = await response.json()
      return data.data.map(d => this.transformPaper(d.citedPaper, ''))
    } catch (error) {
      console.error(`[${this.name}] Failed to get references for ${paperId}:`, error)
      return []
    }
  }

  /**
   * Get paper recommendations based on a seed paper
   */
  async getRecommendations(paperId: string, limit: number = 10): Promise<AcademicPaper[]> {
    try {
      const id = paperId.replace('s2:', '')
      const url = `${this.baseUrl}/recommendations/v1/papers/forpaper/${id}?fields=${PAPER_FIELDS}&limit=${limit}`

      const headers: Record<string, string> = {
        'Accept': 'application/json',
      }
      if (this.apiKey) {
        headers['x-api-key'] = this.apiKey
      }

      const response = await this.fetchWithTimeout(url, { headers }, 15000)

      if (!response.ok) {
        throw new Error(`Semantic Scholar API error: HTTP ${response.status}`)
      }

      const data: S2RecommendationsResponse = await response.json()
      return data.recommendedPapers.map(paper => this.transformPaper(paper, ''))
    } catch (error) {
      console.error(`[${this.name}] Failed to get recommendations for ${paperId}:`, error)
      return []
    }
  }

  /**
   * Batch lookup papers by DOI, ArXiv ID, or Semantic Scholar ID
   */
  async batchLookup(ids: string[], idType: 'DOI' | 'ArXiv' | 'S2PaperId' = 'S2PaperId'): Promise<AcademicPaper[]> {
    try {
      const url = `${this.baseUrl}/paper/batch?fields=${PAPER_FIELDS}`

      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
      if (this.apiKey) {
        headers['x-api-key'] = this.apiKey
      }

      // Format IDs based on type
      const formattedIds = ids.map(id => {
        switch (idType) {
          case 'DOI':
            return `DOI:${id}`
          case 'ArXiv':
            return `ARXIV:${id}`
          default:
            return id.replace('s2:', '')
        }
      })

      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ids: formattedIds }),
      }, 30000)

      if (!response.ok) {
        throw new Error(`Semantic Scholar API error: HTTP ${response.status}`)
      }

      const papers: (S2Paper | null)[] = await response.json()
      return papers
        .filter((p): p is S2Paper => p !== null)
        .map(paper => this.transformPaper(paper, ''))
    } catch (error) {
      console.error(`[${this.name}] Batch lookup failed:`, error)
      return []
    }
  }

  /**
   * Search with author filter
   */
  async searchByAuthor(authorName: string, limit: number = 25): Promise<AcademicPaper[]> {
    try {
      // First, search for the author
      const authorUrl = `${this.baseUrl}/author/search?query=${encodeURIComponent(authorName)}&limit=1`

      const headers: Record<string, string> = {
        'Accept': 'application/json',
      }
      if (this.apiKey) {
        headers['x-api-key'] = this.apiKey
      }

      const authorResponse = await this.fetchWithTimeout(authorUrl, { headers }, 10000)

      if (!authorResponse.ok) {
        throw new Error(`Author search failed: HTTP ${authorResponse.status}`)
      }

      const authorData: { data: Array<{ authorId: string }> } = await authorResponse.json()

      if (authorData.data.length === 0) {
        return []
      }

      // Then get their papers
      const authorId = authorData.data[0].authorId
      const papersUrl = `${this.baseUrl}/author/${authorId}/papers?fields=${PAPER_FIELDS}&limit=${limit}`

      const papersResponse = await this.fetchWithTimeout(papersUrl, { headers }, 15000)

      if (!papersResponse.ok) {
        throw new Error(`Papers lookup failed: HTTP ${papersResponse.status}`)
      }

      const papersData: { data: S2Paper[] } = await papersResponse.json()
      return papersData.data.map(paper => this.transformPaper(paper, authorName))
    } catch (error) {
      console.error(`[${this.name}] Author search failed for ${authorName}:`, error)
      return []
    }
  }

  /**
   * Test if API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/paper/search?query=solar+cell&limit=1&fields=paperId,title`

      const headers: Record<string, string> = {
        'Accept': 'application/json',
      }
      if (this.apiKey) {
        headers['x-api-key'] = this.apiKey
      }

      const response = await this.fetchWithTimeout(url, { headers }, 10000)
      return response.ok
    } catch (error) {
      console.error(`[${this.name}] Availability check failed:`, error)
      return false
    }
  }
}

/**
 * Create and export Semantic Scholar adapter instance
 */
export const semanticScholarAdapter = new SemanticScholarAdapter()
