/**
 * PubMed/NCBI Adapter
 *
 * Searches PubMed database via NCBI E-utilities API.
 * API: https://www.ncbi.nlm.nih.gov/books/NBK25500/
 * Rate: 3 requests/second without API key, 10 requests/second with API key
 *
 * Features:
 * - Access to 35M+ biomedical literature citations
 * - Full abstracts and metadata
 * - MeSH term indexing
 * - PubMed Central full-text links
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
 * PubMed E-utilities API response types
 */
interface ESearchResult {
  esearchresult: {
    count: string
    retmax: string
    retstart: string
    idlist: string[]
    querytranslation: string
  }
}

interface EFetchResult {
  result: {
    uids: string[]
    [pmid: string]: PubMedArticle | string[]
  }
}

interface PubMedArticle {
  uid: string
  pubdate: string
  epubdate?: string
  source: string
  authors: Array<{ name: string; authtype?: string }>
  title: string
  sorttitle?: string
  volume?: string
  issue?: string
  pages?: string
  lang?: string[]
  issn?: string
  essn?: string
  pubtype?: string[]
  articleids?: Array<{ idtype: string; value: string }>
  fulljournalname?: string
  elocationid?: string
  doctype?: string
  pmcid?: string
  abstract?: string
}

/**
 * PubMed adapter implementation
 */
export class PubMedAdapter extends BaseAdapter {
  readonly name: DataSourceName = 'pubmed'
  readonly domains: Domain[] = [
    'biomass',
    'hydrogen-fuel',
    'battery-storage',
    'materials-science',
    'carbon-capture',
    'energy-efficiency',
  ]

  private readonly esearchBase = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi'
  private readonly esummaryBase = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi'
  private readonly efetchBase = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi'

  constructor(apiKey?: string) {
    super({
      baseUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',
      apiKey: apiKey || process.env.NCBI_API_KEY,
      requestsPerMinute: apiKey ? 10 : 3, // Rate limit depends on API key
      requestsPerDay: 10000,
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
      // Step 1: Search for PMIDs
      const pmids = await this.searchPMIDs(query, filters)

      if (pmids.length === 0) {
        return {
          sources: [],
          total: 0,
          searchTime: Date.now() - startTime,
          query,
          filters,
          from: this.name,
        }
      }

      // Step 2: Fetch article details
      const articles = await this.fetchArticleDetails(pmids.slice(0, filters.limit || 20))

      return {
        sources: articles,
        total: pmids.length,
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
   * Search for PMIDs matching query
   */
  private async searchPMIDs(query: string, filters: SearchFilters): Promise<string[]> {
    const params: Record<string, string> = {
      db: 'pubmed',
      term: this.buildPubMedQuery(query, filters),
      retmax: String(Math.min(filters.limit || 20, 100)),
      retmode: 'json',
      sort: 'relevance',
    }

    if (this.apiKey) {
      params.api_key = this.apiKey
    }

    const url = `${this.esearchBase}?${this.buildQueryString(params)}`

    console.log(`[${this.name}] Searching: ${query}`)

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`PubMed search failed: HTTP ${response.status}`)
    }

    const data = await response.json() as ESearchResult

    return data.esearchresult?.idlist || []
  }

  /**
   * Fetch detailed article information
   */
  private async fetchArticleDetails(pmids: string[]): Promise<AcademicPaper[]> {
    if (pmids.length === 0) return []

    const params: Record<string, string> = {
      db: 'pubmed',
      id: pmids.join(','),
      retmode: 'json',
    }

    if (this.apiKey) {
      params.api_key = this.apiKey
    }

    const url = `${this.esummaryBase}?${this.buildQueryString(params)}`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`PubMed fetch failed: HTTP ${response.status}`)
    }

    const data = await response.json() as EFetchResult

    const articles: AcademicPaper[] = []

    for (const pmid of pmids) {
      const article = data.result?.[pmid] as PubMedArticle | undefined
      if (!article || typeof article === 'object' && 'length' in article) continue

      const doi = article.articleids?.find(id => id.idtype === 'doi')?.value
      const pmcid = article.pmcid || article.articleids?.find(id => id.idtype === 'pmc')?.value

      articles.push({
        id: `pubmed:${pmid}`,
        title: article.title || 'Untitled',
        authors: (article.authors || []).map(a => a.name),
        abstract: article.abstract,
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        doi: doi ? `10.${doi}` : undefined,
        metadata: {
          source: this.name,
          sourceType: 'academic-paper',
          quality: 95, // PubMed is peer-reviewed
          verificationStatus: 'peer-reviewed',
          accessType: pmcid ? 'open' : 'subscription',
          publicationDate: article.pubdate || article.epubdate,
        },
        journal: article.fulljournalname || article.source,
        volume: article.volume,
        issue: article.issue,
        pages: article.pages,
        isOpenAccess: !!pmcid,
        pdfUrl: pmcid ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid}/pdf/` : undefined,
        relevanceScore: this.calculateRelevance(article),
      })
    }

    console.log(`[${this.name}] Found ${articles.length} articles`)

    return articles
  }

  /**
   * Build PubMed search query with filters
   */
  private buildPubMedQuery(query: string, filters: SearchFilters): string {
    const parts: string[] = [query]

    // Add date filter
    if (filters.yearFrom || filters.yearTo) {
      const from = filters.yearFrom || 1900
      const to = filters.yearTo || new Date().getFullYear()
      parts.push(`(${from}[pdat]:${to}[pdat])`)
    }

    // Add energy-related MeSH terms for relevance
    const energyTerms = [
      'renewable energy',
      'clean energy',
      'energy storage',
      'biofuels',
      'hydrogen production',
      'carbon capture',
    ]

    // Check if query already contains energy terms
    const hasEnergyTerm = energyTerms.some(term =>
      query.toLowerCase().includes(term.toLowerCase())
    )

    if (!hasEnergyTerm) {
      // Add energy context to improve relevance for clean energy research
      const energyContext = energyTerms.map(term => `"${term}"[Title/Abstract]`).join(' OR ')
      // Only add if we want to filter to energy topics (optional)
      // parts.push(`(${energyContext})`)
    }

    return parts.join(' AND ')
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(article: PubMedArticle): number {
    let score = 70 // Base score for PubMed results

    // Boost for recent publications
    const year = parseInt(article.pubdate?.match(/\d{4}/)?.[0] || '0')
    const currentYear = new Date().getFullYear()
    if (year >= currentYear - 2) {
      score += 15
    } else if (year >= currentYear - 5) {
      score += 10
    }

    // Boost for open access (has PMC ID)
    if (article.pmcid) {
      score += 10
    }

    // Boost for having abstract
    if (article.abstract && article.abstract.length > 100) {
      score += 5
    }

    return Math.min(100, score)
  }

  /**
   * Get details for a specific article
   */
  protected async executeGetDetails(id: string): Promise<Source | null> {
    try {
      // Extract PMID from our ID format
      const pmid = id.replace('pubmed:', '')

      const articles = await this.fetchArticleDetails([pmid])
      return articles[0] || null
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
      // Test with a simple search
      const params: Record<string, string> = {
        db: 'pubmed',
        term: 'test',
        retmax: '1',
        retmode: 'json',
      }

      if (this.apiKey) {
        params.api_key = this.apiKey
      }

      const url = `${this.esearchBase}?${this.buildQueryString(params)}`
      const response = await fetch(url)

      return response.ok
    } catch (error) {
      console.error(`[${this.name}] Availability check failed:`, error)
      return false
    }
  }
}

/**
 * Create and export PubMed adapter instance
 */
export const pubmedAdapter = new PubMedAdapter()
