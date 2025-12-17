/**
 * USPTO PatentsView Adapter
 *
 * Searches USPTO PatentsView API v2 for US patent data.
 * API: https://search.patentsview.org/api/v1/patent/
 * (Note: The old api.patentsview.org endpoint returned HTTP 410 Gone)
 *
 * Rate: No strict limit, be polite
 *
 * Features:
 * - Complete US patent database
 * - Full text search
 * - CPC/USPC classifications
 * - Inventor and assignee data
 * - Citation networks
 */

import { BaseAdapter } from './base'
import {
  DataSourceName,
  Source,
  SearchFilters,
  SearchResult,
  Patent,
} from '@/types/sources'
import { Domain } from '@/types/discovery'

/**
 * PatentsView API v2 response types
 */
interface PatentsViewResponse {
  patents: PatentsViewPatent[]
  count: number
  total_hits: number
}

interface PatentsViewPatent {
  patent_id: string
  patent_number: string
  patent_title: string
  patent_abstract?: string
  patent_date: string
  patent_type: string
  patent_kind?: string
  patent_num_claims?: number
  patent_processing_time?: number
  inventors?: Array<{
    inventor_first_name?: string
    inventor_last_name?: string
    inventor_city?: string
    inventor_state?: string
    inventor_country?: string
  }>
  assignees?: Array<{
    assignee_organization?: string
    assignee_first_name?: string
    assignee_last_name?: string
    assignee_type?: string
  }>
  applications?: Array<{
    app_number: string
    app_date: string
    app_type: string
  }>
  cpcs?: Array<{
    cpc_section?: string
    cpc_subsection?: string
    cpc_group?: string
    cpc_subgroup?: string
  }>
  uspcs?: Array<{
    uspc_mainclass?: string
    uspc_subclass?: string
  }>
  cited_patents?: Array<{
    patent_number: string
    patent_title?: string
  }>
}

/**
 * USPTO PatentsView adapter implementation
 *
 * IMPORTANT: PatentsView API requires an API key as of 2024.
 * Register at https://patentsview.org/ to obtain a key.
 * Set PATENTSVIEW_API_KEY environment variable.
 */
export class USPTOAdapter extends BaseAdapter {
  readonly name: DataSourceName = 'uspto'
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

  private readonly patentsViewApiKey: string | undefined

  constructor() {
    super({
      // New PatentsView API v1 endpoint (the old api.patentsview.org is deprecated with HTTP 410)
      baseUrl: 'https://search.patentsview.org/api/v1/patent',
      requestsPerMinute: 45, // PatentsView allows 45 req/min with API key
      requestsPerDay: 10000,
      cacheTTL: 24 * 60 * 60 * 1000, // 24 hours (patents don't change)
    })

    this.patentsViewApiKey = process.env.PATENTSVIEW_API_KEY

    if (!this.patentsViewApiKey) {
      console.warn(`[${this.name}] No PATENTSVIEW_API_KEY configured - patent searches will be unavailable`)
    }
  }

  /**
   * Build headers for PatentsView API requests
   */
  private getRequestHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }

    if (this.patentsViewApiKey) {
      headers['X-Api-Key'] = this.patentsViewApiKey
    }

    return headers
  }

  /**
   * Execute search query using the new PatentsView API v1
   * The new API uses POST with JSON body instead of GET with query params
   */
  protected async executeSearch(
    query: string,
    filters: SearchFilters = {}
  ): Promise<SearchResult> {
    const startTime = Date.now()

    // Check for API key before making request
    if (!this.patentsViewApiKey) {
      console.warn(`[${this.name}] Skipping search - no API key configured`)
      return {
        sources: [],
        total: 0,
        searchTime: Date.now() - startTime,
        query,
        filters,
        from: this.name,
      }
    }

    try {
      const limit = Math.min(filters.limit || 20, 100)

      // Build the request body for the new API
      const requestBody = {
        q: this.buildPatentsViewQuery(query, filters),
        f: [
          'patent_id',
          'patent_number',
          'patent_title',
          'patent_abstract',
          'patent_date',
          'patent_type',
          'patent_num_claims',
          'inventors',
          'assignees',
          'applications',
          'cpcs',
        ],
        o: {
          size: limit,
          from: 0,
        },
        s: [{ patent_date: 'desc' }], // Sort by date descending
      }

      console.log(`[${this.name}] Searching: ${query}`)

      const response = await fetch(`${this.baseUrl}/`, {
        method: 'POST',
        headers: this.getRequestHeaders(),
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[${this.name}] API error response:`, errorText)
        throw new Error(`USPTO search failed: HTTP ${response.status}`)
      }

      const data = await response.json() as PatentsViewResponse

      const patents = (data.patents || []).map(patent => this.transformPatent(patent, query))

      console.log(`[${this.name}] Found ${patents.length} patents (total: ${data.total_hits || data.count})`)

      return {
        sources: patents,
        total: data.total_hits || data.count || patents.length,
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
   * Build PatentsView query object for the new API v1
   * Uses Elasticsearch-style query syntax
   */
  private buildPatentsViewQuery(query: string, filters: SearchFilters): Record<string, any> {
    const must: Record<string, any>[] = []

    // Full text search using multi_match query
    must.push({
      _text_any: {
        _fields: ['patent_title', 'patent_abstract'],
        _value: query,
      },
    })

    // Date filter
    if (filters.yearFrom || filters.yearTo) {
      const from = filters.yearFrom || 2000
      const to = filters.yearTo || new Date().getFullYear()

      must.push({
        _and: [
          { _gte: { patent_date: `${from}-01-01` } },
          { _lte: { patent_date: `${to}-12-31` } },
        ],
      })
    } else {
      // Default to last 10 years if no filter specified
      const tenYearsAgo = new Date().getFullYear() - 10
      must.push({
        _gte: { patent_date: `${tenYearsAgo}-01-01` },
      })
    }

    return must.length === 1 ? must[0] : { _and: must }
  }

  /**
   * Transform PatentsView patent to our Patent type
   * Handles both old and new API response formats
   */
  private transformPatent(patent: PatentsViewPatent, query: string): Patent {
    // Extract inventors - handle both flat and nested formats
    const inventors = (patent.inventors || []).map(inv => {
      // New API format has inventor_name_first/inventor_name_last
      // Old format has inventor_first_name/inventor_last_name
      const firstName = inv.inventor_first_name || (inv as any).inventor_name_first || ''
      const lastName = inv.inventor_last_name || (inv as any).inventor_name_last || ''
      const name = [firstName, lastName].filter(Boolean).join(' ')
      return name || 'Unknown'
    })

    // Extract assignee
    const firstAssignee = patent.assignees?.[0]
    const assignee = firstAssignee?.assignee_organization ||
                     (firstAssignee as any)?.assignee_name ||
                     [firstAssignee?.assignee_first_name, firstAssignee?.assignee_last_name]
                       .filter(Boolean).join(' ') ||
                     'Unknown'

    // Extract CPC classifications
    const cpc = (patent.cpcs || []).map(c => {
      // Handle both formats
      const section = c.cpc_section || (c as any).cpc_class
      const subsection = c.cpc_subsection || (c as any).cpc_subclass
      const group = c.cpc_group
      const subgroup = c.cpc_subgroup
      return [section, subsection, group, subgroup].filter(Boolean).join('/')
    })

    // Extract USPC classifications (may not be present in new API)
    const uspc = (patent.uspcs || []).map(u =>
      [u.uspc_mainclass, u.uspc_subclass].filter(Boolean).join('/')
    )

    // Application info
    const application = patent.applications?.[0]

    return {
      id: `uspto:${patent.patent_number}`,
      title: patent.patent_title || 'Untitled Patent',
      authors: inventors, // In patents, inventors are the "authors"
      abstract: patent.patent_abstract,
      url: `https://patents.google.com/patent/US${patent.patent_number}`,
      metadata: {
        source: this.name,
        sourceType: 'patent',
        quality: 85,
        verificationStatus: 'peer-reviewed', // Patents are examined
        accessType: 'open', // Patent data is public
        publicationDate: patent.patent_date,
      },
      patentNumber: `US${patent.patent_number}`,
      applicationNumber: application?.app_number,
      filingDate: application?.app_date,
      grantDate: patent.patent_date,
      assignee,
      inventors,
      classifications: {
        cpc,
        uspc,
      },
      legalStatus: 'granted', // PatentsView only has granted patents
      relevanceScore: this.calculateRelevance(patent, query),
    }
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(patent: PatentsViewPatent, query: string): number {
    let score = 60 // Base score for patents

    // Boost for recent patents
    const patentDate = new Date(patent.patent_date)
    const yearsAgo = (Date.now() - patentDate.getTime()) / (365 * 24 * 60 * 60 * 1000)

    if (yearsAgo <= 2) {
      score += 20
    } else if (yearsAgo <= 5) {
      score += 15
    } else if (yearsAgo <= 10) {
      score += 10
    }

    // Boost for title match
    const queryTerms = query.toLowerCase().split(/\s+/)
    const titleLower = (patent.patent_title || '').toLowerCase()
    const titleMatches = queryTerms.filter(term => titleLower.includes(term)).length
    score += (titleMatches / queryTerms.length) * 15

    // Boost for having abstract
    if (patent.patent_abstract && patent.patent_abstract.length > 100) {
      score += 5
    }

    // Boost for energy-related CPC codes
    const energyCPCs = ['Y02E', 'H01M', 'H02S', 'F03D', 'Y02B', 'C01B', 'B01D']
    const hasenergyCPC = patent.cpcs?.some(c =>
      energyCPCs.some(ec => c.cpc_section?.startsWith(ec) || c.cpc_group?.startsWith(ec))
    )
    if (hasenergyCPC) {
      score += 10
    }

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Get details for a specific patent using the new API
   */
  protected async executeGetDetails(id: string): Promise<Source | null> {
    // Check for API key before making request
    if (!this.patentsViewApiKey) {
      console.warn(`[${this.name}] Cannot get details - no API key configured`)
      return null
    }

    try {
      // Extract patent number from our ID format
      const patentNumber = id.replace('uspto:', '').replace('US', '')

      const requestBody = {
        q: { patent_number: patentNumber },
        f: [
          'patent_id',
          'patent_number',
          'patent_title',
          'patent_abstract',
          'patent_date',
          'patent_type',
          'patent_num_claims',
          'inventors',
          'assignees',
          'applications',
          'cpcs',
        ],
      }

      const response = await fetch(`${this.baseUrl}/`, {
        method: 'POST',
        headers: this.getRequestHeaders(),
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`USPTO fetch failed: HTTP ${response.status}`)
      }

      const data = await response.json() as PatentsViewResponse

      if (!data.patents?.length) {
        return null
      }

      return this.transformPatent(data.patents[0], '')
    } catch (error) {
      console.error(`[${this.name}] Failed to get details for ${id}:`, error)
      return null
    }
  }

  /**
   * Test if API is available using the new API
   * Returns false if no API key is configured
   */
  async isAvailable(): Promise<boolean> {
    // No API key = not available
    if (!this.patentsViewApiKey) {
      console.warn(`[${this.name}] Not available - no PATENTSVIEW_API_KEY configured`)
      return false
    }

    try {
      // Test with a simple query to the new API
      const requestBody = {
        q: { _gte: { patent_date: '2024-01-01' } },
        f: ['patent_number'],
        o: { size: 1, from: 0 },
      }

      const response = await fetch(`${this.baseUrl}/`, {
        method: 'POST',
        headers: this.getRequestHeaders(),
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        console.warn(`[${this.name}] API returned ${response.status} - may need to verify API key`)
      }

      return response.ok
    } catch (error) {
      console.error(`[${this.name}] Availability check failed:`, error)
      return false
    }
  }
}

/**
 * Create and export USPTO adapter instance
 */
export const usptoAdapter = new USPTOAdapter()
