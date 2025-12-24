/**
 * Web Search Adapter
 *
 * Uses Google Custom Search API to fetch real-time data from
 * authoritative sources for pricing, policy, and benchmark information.
 *
 * Features:
 * - Tiered credibility scoring for source reliability
 * - Specialized search methods for pricing, policy, and benchmarks
 * - 6-hour caching to reduce API costs
 * - Domain filtering for authoritative sources only
 */

import { BaseAdapter } from './base'
import type {
  DataSourceName,
  Source,
  SearchFilters,
  SearchResult,
} from '@/types/sources'
import type { Domain } from '@/types/discovery'

// ============================================================================
// Types
// ============================================================================

interface GoogleSearchItem {
  title: string
  link: string
  snippet: string
  displayLink: string
  pagemap?: {
    metatags?: Array<Record<string, string>>
    article?: Array<{
      datePublished?: string
      author?: string
    }>
  }
}

interface GoogleSearchResponse {
  items?: GoogleSearchItem[]
  searchInformation?: {
    totalResults: string
    searchTime: number
  }
  error?: {
    code: number
    message: string
  }
}

// ============================================================================
// Credibility Scoring
// ============================================================================

/**
 * Domain credibility scores (0-1)
 * Higher scores indicate more authoritative sources
 */
const DOMAIN_CREDIBILITY: Record<string, number> = {
  // Tier 1: Government & International Organizations (1.0)
  'energy.gov': 1.0,
  'nrel.gov': 1.0,
  'eia.gov': 1.0,
  'epa.gov': 1.0,
  'doe.gov': 1.0,
  'sandia.gov': 1.0,
  'lbl.gov': 1.0,
  'anl.gov': 1.0,
  'inl.gov': 1.0,        // Idaho National Laboratory
  'llnl.gov': 1.0,       // Lawrence Livermore National Lab
  'iea.org': 1.0,
  'irena.org': 1.0,

  // Tier 2: Academic & Research Institutions (0.9)
  'nature.com': 0.9,
  'sciencedirect.com': 0.9,
  'ieee.org': 0.9,
  'acs.org': 0.9,
  'rsc.org': 0.9,
  'cell.com': 0.9,
  'wiley.com': 0.9,
  'springer.com': 0.9,
  'mit.edu': 0.9,
  'energy.mit.edu': 0.9, // MIT Energy Initiative
  'stanford.edu': 0.9,
  'berkeley.edu': 0.9,
  'ourworldindata.org': 0.9, // Oxford-based research

  // Tier 2.5: Research Think Tanks (0.85)
  'carbonbrief.org': 0.85,   // Climate/energy analysis
  'ember-energy.org': 0.85,  // Energy think tank

  // Tier 3: Industry Reports & Analysis (0.8)
  'bnef.com': 0.8,
  'bloombergnef.com': 0.8,
  'woodmac.com': 0.8,
  'spglobal.com': 0.8,
  'lazard.com': 0.8,
  'lazard.org': 0.8,
  'mckinsey.com': 0.8,
  'ihs.com': 0.8,
  'energyinst.org': 0.8,     // Energy Institute
  'solarpowerworldonline.com': 0.8,
  'pv-magazine.com': 0.8,
  'windpowermonthly.com': 0.8,

  // Tier 4: Reputable News & Trade Publications (0.7)
  'reuters.com': 0.7,
  'bloomberg.com': 0.7,
  'ft.com': 0.7,
  'wsj.com': 0.7,
  'utilitydive.com': 0.7,
  'greentechmedia.com': 0.7,
  'cleantechnica.com': 0.7,
  'energymonitor.ai': 0.7,
  'canarymedia.com': 0.7,    // Clean energy news
  'reneweconomy.com.au': 0.7, // Australian renewable news
}

/**
 * Minimum credibility threshold for inclusion in results
 */
const MIN_CREDIBILITY = 0.5

// ============================================================================
// Domain-Specific Search Enhancements
// ============================================================================

const DOMAIN_SEARCH_TERMS: Record<string, string[]> = {
  'solar-energy': ['solar PV', 'photovoltaic', 'solar panel', 'solar LCOE'],
  'wind-energy': ['wind turbine', 'wind farm', 'offshore wind', 'wind LCOE'],
  'battery-storage': ['battery storage', 'lithium-ion', 'energy storage', 'grid storage'],
  'hydrogen-fuel': ['green hydrogen', 'electrolysis', 'hydrogen production', 'fuel cell'],
  'biomass': ['biomass energy', 'biofuel', 'biogas', 'renewable fuel'],
  'geothermal': ['geothermal energy', 'geothermal power', 'ground source heat'],
  'carbon-capture': ['carbon capture', 'CCS', 'CCUS', 'direct air capture'],
  'energy-efficiency': ['energy efficiency', 'demand response', 'building efficiency'],
  'grid-optimization': ['smart grid', 'grid modernization', 'power grid', 'transmission'],
}

// ============================================================================
// Web Search Adapter
// ============================================================================

export class WebSearchAdapter extends BaseAdapter {
  readonly name: DataSourceName = 'web-search'
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
  ]

  private searchEngineId: string

  constructor() {
    super({
      baseUrl: 'https://www.googleapis.com/customsearch/v1',
      apiKey: process.env.GOOGLE_CUSTOM_SEARCH_API_KEY,
      requestsPerMinute: 100,
      requestsPerDay: 10000,
      cacheTTL: 6 * 60 * 60 * 1000, // 6 hours
    })
    this.searchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID || ''
  }

  /**
   * Check if the adapter is properly configured
   */
  async isAvailable(): Promise<boolean> {
    const hasApiKey = !!process.env.GOOGLE_CUSTOM_SEARCH_API_KEY
    const hasEngineId = !!process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID

    if (!hasApiKey || !hasEngineId) {
      console.warn(
        `[${this.name}] Not available - missing ${!hasApiKey ? 'GOOGLE_CUSTOM_SEARCH_API_KEY' : 'GOOGLE_CUSTOM_SEARCH_ENGINE_ID'}`
      )
      return false
    }

    return true
  }

  /**
   * Execute search against Google Custom Search API
   */
  protected async executeSearch(
    query: string,
    filters: SearchFilters = {}
  ): Promise<SearchResult> {
    const startTime = Date.now()
    const limit = Math.min(filters.limit || 10, 10) // Google CSE max is 10 per request

    // Build search URL
    const url = new URL(this.baseUrl)
    url.searchParams.set('key', this.apiKey || '')
    url.searchParams.set('cx', this.searchEngineId)
    url.searchParams.set('q', this.enhanceQuery(query, filters.domains))
    url.searchParams.set('num', String(limit))

    // Add date restriction if specified
    if (filters.yearFrom) {
      url.searchParams.set('dateRestrict', `y${new Date().getFullYear() - filters.yearFrom}`)
    }

    console.log(`[${this.name}] Searching: "${query}"`)

    const response = await this.fetchWithTimeout(url.toString())

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data: GoogleSearchResponse = await response.json()

    if (data.error) {
      throw new Error(`API Error ${data.error.code}: ${data.error.message}`)
    }

    const sources = (data.items || [])
      .map((item) => this.transformResult(item, query))
      .filter((source) => source !== null) as Source[]

    // Sort by credibility score
    sources.sort((a, b) => (b.metadata?.quality || 0) - (a.metadata?.quality || 0))

    return {
      sources,
      total: parseInt(data.searchInformation?.totalResults || '0', 10),
      searchTime: Date.now() - startTime,
      query,
      filters,
      from: this.name,
    }
  }

  /**
   * Web search doesn't support individual item details
   */
  protected async executeGetDetails(id: string): Promise<Source | null> {
    // Web search results don't have a details endpoint
    // Return null to indicate not supported
    console.log(`[${this.name}] getDetails not supported for web search results`)
    return null
  }

  /**
   * Enhance query with domain-specific terms
   */
  private enhanceQuery(query: string, domains?: string[]): string {
    let enhanced = query

    // Add energy context if not already present
    const energyTerms = ['energy', 'power', 'renewable', 'clean', 'solar', 'wind', 'battery', 'hydrogen']
    const hasEnergyContext = energyTerms.some((term) =>
      query.toLowerCase().includes(term)
    )

    if (!hasEnergyContext) {
      enhanced = `${query} clean energy`
    }

    // Add domain-specific terms if specified
    if (domains && domains.length > 0) {
      const domainTerms = domains
        .flatMap((d) => DOMAIN_SEARCH_TERMS[d] || [])
        .slice(0, 2) // Take first 2 terms to avoid over-specifying

      if (domainTerms.length > 0) {
        enhanced = `${enhanced} ${domainTerms.join(' ')}`
      }
    }

    return enhanced
  }

  /**
   * Transform Google search result to standard Source format
   */
  private transformResult(item: GoogleSearchItem, query: string): Source | null {
    // Calculate credibility score
    const credibility = this.getCredibilityScore(item.displayLink)

    // Filter out low-credibility sources
    if (credibility < MIN_CREDIBILITY) {
      return null
    }

    // Extract publication date if available
    const dateStr = item.pagemap?.article?.[0]?.datePublished
    const publicationDate = dateStr ? new Date(dateStr).toISOString() : undefined

    // Calculate relevance score
    const relevance = this.calculateRelevance(item, query)

    return {
      id: `web-search:${Buffer.from(item.link).toString('base64').slice(0, 32)}`,
      title: item.title,
      authors: item.pagemap?.article?.[0]?.author ? [item.pagemap.article[0].author] : [],
      abstract: item.snippet,
      url: item.link,
      metadata: {
        source: this.name,
        sourceType: 'news', // Web results are treated as news/reports
        quality: Math.round(credibility * 100), // Quality score reflects credibility
        verificationStatus: credibility >= 0.9 ? 'peer-reviewed' : 'unverified',
        accessType: 'open',
        publicationDate,
      },
      relevanceScore: relevance,
    }
  }

  /**
   * Get credibility score for a domain
   */
  private getCredibilityScore(displayLink: string): number {
    // Extract root domain
    const domain = displayLink.toLowerCase().replace(/^www\./, '')

    // Check exact match first
    if (DOMAIN_CREDIBILITY[domain]) {
      return DOMAIN_CREDIBILITY[domain]
    }

    // Check if it's a subdomain of a known domain
    for (const [knownDomain, score] of Object.entries(DOMAIN_CREDIBILITY)) {
      if (domain.endsWith(`.${knownDomain}`) || domain === knownDomain) {
        return score
      }
    }

    // Check for government domains
    if (domain.endsWith('.gov') || domain.endsWith('.gov.uk')) {
      return 0.95
    }

    // Check for educational domains
    if (domain.endsWith('.edu') || domain.endsWith('.ac.uk')) {
      return 0.85
    }

    // Check for organizational domains
    if (domain.endsWith('.org')) {
      return 0.6
    }

    // Default for unknown domains
    return MIN_CREDIBILITY
  }

  /**
   * Get human-readable credibility tier
   */
  private getCredibilityTier(score: number): string {
    if (score >= 0.95) return 'government'
    if (score >= 0.85) return 'academic'
    if (score >= 0.75) return 'industry'
    if (score >= 0.65) return 'news'
    return 'other'
  }

  /**
   * Calculate relevance score based on query match
   */
  private calculateRelevance(item: GoogleSearchItem, query: string): number {
    const titleLower = item.title.toLowerCase()
    const snippetLower = item.snippet.toLowerCase()
    const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2)

    let matches = 0

    for (const term of queryTerms) {
      if (titleLower.includes(term)) matches += 2 // Title match worth more
      if (snippetLower.includes(term)) matches += 1
    }

    // Normalize to 0-100
    const maxScore = queryTerms.length * 3
    return Math.min(100, Math.round((matches / maxScore) * 100))
  }

  /**
   * Cache TTL override - 6 hours for web content
   */
  protected getCacheTTL(): number {
    return 6 * 60 * 60 * 1000 // 6 hours
  }

  // ============================================================================
  // Specialized Search Methods
  // ============================================================================

  /**
   * Search for current equipment pricing
   */
  async searchPricing(
    equipment: string,
    region: string = 'US'
  ): Promise<Source[]> {
    const query = `${equipment} price cost ${new Date().getFullYear()} ${region}`
    const result = await this.search(query, { limit: 10 })
    return result.sources
  }

  /**
   * Search for policy and incentive information
   */
  async searchPolicy(
    incentiveType: string,
    region: string = 'US'
  ): Promise<Source[]> {
    const query = `${incentiveType} incentive policy ${new Date().getFullYear()} ${region} renewable energy`
    const result = await this.search(query, { limit: 10 })
    return result.sources
  }

  /**
   * Search for technology benchmarks and LCOE data
   */
  async searchBenchmarks(technology: string): Promise<Source[]> {
    const query = `${technology} LCOE benchmark cost ${new Date().getFullYear()} NREL IEA`
    const result = await this.search(query, { limit: 10 })
    return result.sources
  }

  /**
   * Search for industry news and trends
   */
  async searchNews(topic: string, days: number = 30): Promise<Source[]> {
    const query = `${topic} news latest developments`
    const result = await this.search(query, {
      limit: 10,
      yearFrom: new Date().getFullYear(),
    })
    return result.sources
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const webSearchAdapter = new WebSearchAdapter()
