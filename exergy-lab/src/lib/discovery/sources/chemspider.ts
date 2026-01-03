/**
 * ChemSpider Adapter
 *
 * Searches chemical compounds from ChemSpider (Royal Society of Chemistry).
 * API: https://api.rsc.org/
 *
 * Features:
 * - Chemical structure search
 * - Molecular properties
 * - Spectra data
 * - Links to publications
 *
 * Note: ChemSpider requires an API key for full access.
 * Free tier available at: https://developer.rsc.org/
 *
 * @version 0.7.0
 */

import { BaseAdapter } from './base'
import {
  DataSourceName,
  Source,
  SearchFilters,
  SearchResult,
} from '@/types/sources'
import { Domain } from '@/types/discovery'

/**
 * ChemSpider compound data
 */
interface ChemSpiderCompound {
  id: number
  commonName?: string
  referenceCount?: number
  dataSourceCount?: number
  molecularFormula?: string
  smiles?: string
  inchi?: string
  inchiKey?: string
  averageMass?: number
  monoisotopicMass?: number
}

/**
 * ChemSpider search response
 */
interface ChemSpiderSearchResponse {
  queryId?: string
  results?: number[]
  status?: string
}

/**
 * ChemSpider record details response
 */
interface ChemSpiderDetailsResponse {
  id: number
  commonName?: string
  molecularFormula?: string
  smiles?: string
  inchi?: string
  inchiKey?: string
  averageMass?: number
  monoisotopicMass?: number
  referenceCount?: number
  dataSourceCount?: number
}

/**
 * ChemSpider adapter implementation
 */
export class ChemSpiderAdapter extends BaseAdapter {
  readonly name: DataSourceName = 'chemspider'
  readonly domains: Domain[] = [
    'battery-storage',
    'hydrogen-fuel',
    'carbon-capture',
    'materials-science',
    'energy-efficiency',
    'solar-energy',
  ]

  constructor() {
    super({
      baseUrl: 'https://api.rsc.org/compounds/v1',
      apiKey: process.env.CHEMSPIDER_API_KEY,
      requestsPerMinute: 20, // ChemSpider has stricter limits
      requestsPerDay: 1000,
      cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
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
    const limit = filters.limit || 20

    // If no API key, return empty results gracefully
    if (!this.apiKey) {
      console.log('[ChemSpider] No API key configured, skipping')
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
      // Step 1: Submit search query
      const searchBody = {
        name: query,
        orderBy: 'referenceCount',
        orderDirection: 'descending',
      }

      const searchResponse = await this.fetchWithTimeout(
        `${this.baseUrl}/filter/name`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.apiKey,
          },
          body: JSON.stringify(searchBody),
        },
        15000
      )

      if (!searchResponse.ok) {
        throw new Error(`Search failed: ${searchResponse.status}`)
      }

      const searchData: ChemSpiderSearchResponse = await searchResponse.json()

      if (!searchData.queryId) {
        return {
          sources: [],
          total: 0,
          searchTime: Date.now() - startTime,
          query,
          filters,
          from: this.name,
        }
      }

      // Step 2: Poll for results
      let resultIds: number[] = []
      let attempts = 0
      const maxAttempts = 10

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500)) // Wait 500ms

        const statusResponse = await this.fetchWithTimeout(
          `${this.baseUrl}/filter/${searchData.queryId}/status`,
          {
            headers: { 'apikey': this.apiKey },
          },
          10000
        )

        if (!statusResponse.ok) {
          break
        }

        const statusData = await statusResponse.json()

        if (statusData.status === 'Complete') {
          // Get results
          const resultsResponse = await this.fetchWithTimeout(
            `${this.baseUrl}/filter/${searchData.queryId}/results?start=0&count=${limit}`,
            {
              headers: { 'apikey': this.apiKey },
            },
            10000
          )

          if (resultsResponse.ok) {
            const resultsData = await resultsResponse.json()
            resultIds = resultsData.results || []
          }
          break
        }

        attempts++
      }

      if (resultIds.length === 0) {
        return {
          sources: [],
          total: 0,
          searchTime: Date.now() - startTime,
          query,
          filters,
          from: this.name,
        }
      }

      // Step 3: Get details for each compound
      const sources: Source[] = []

      for (const id of resultIds.slice(0, limit)) {
        try {
          const details = await this.getCompoundDetails(id)
          if (details) {
            sources.push(this.transformToSource(details, query))
          }
        } catch (error) {
          console.error(`[ChemSpider] Failed to get details for ${id}:`, error)
        }
      }

      return {
        sources,
        total: resultIds.length,
        searchTime: Date.now() - startTime,
        query,
        filters,
        from: this.name,
      }
    } catch (error) {
      console.error(`[ChemSpider] Search failed:`, error)
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
   * Get compound details by ID
   */
  private async getCompoundDetails(id: number): Promise<ChemSpiderDetailsResponse | null> {
    if (!this.apiKey) return null

    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/records/${id}/details`,
        {
          headers: { 'apikey': this.apiKey },
        },
        10000
      )

      if (!response.ok) {
        return null
      }

      return response.json()
    } catch (error) {
      return null
    }
  }

  /**
   * Get details for a specific compound
   */
  protected async executeGetDetails(sourceId: string): Promise<Source | null> {
    try {
      const id = parseInt(sourceId.replace('chemspider:', ''), 10)
      const details = await this.getCompoundDetails(id)

      if (!details) {
        return null
      }

      return this.transformToSource(details, '')
    } catch (error) {
      console.error(`[ChemSpider] Failed to get details for ${sourceId}:`, error)
      return null
    }
  }

  /**
   * Transform ChemSpider compound to standard Source format
   */
  private transformToSource(
    compound: ChemSpiderDetailsResponse,
    query: string
  ): Source {
    const name = compound.commonName || `ChemSpider ID ${compound.id}`
    const formula = compound.molecularFormula || 'Unknown'

    // Build description from properties
    const properties: string[] = []
    if (compound.averageMass) {
      properties.push(`Avg Mass: ${compound.averageMass.toFixed(2)} g/mol`)
    }
    if (compound.monoisotopicMass) {
      properties.push(`Monoisotopic: ${compound.monoisotopicMass.toFixed(4)} g/mol`)
    }
    if (compound.referenceCount) {
      properties.push(`${compound.referenceCount} references`)
    }
    if (compound.dataSourceCount) {
      properties.push(`${compound.dataSourceCount} data sources`)
    }

    const abstract = `Chemical compound: ${formula}. ${properties.join(', ')}. ${
      compound.smiles ? `SMILES: ${compound.smiles}` : ''
    }`

    return {
      id: `chemspider:${compound.id}`,
      title: `${name} (${formula})`,
      authors: ['ChemSpider - Royal Society of Chemistry'],
      abstract,
      url: `https://www.chemspider.com/Chemical-Structure.${compound.id}.html`,
      metadata: {
        source: this.name,
        sourceType: 'chemical-database',
        quality: 85, // ChemSpider is authoritative
        verificationStatus: 'peer-reviewed',
        accessType: 'open',
        citationCount: compound.referenceCount,
      },
      relevanceScore: this.calculateRelevance(compound, query),
    }
  }

  /**
   * Calculate relevance score for compound
   */
  private calculateRelevance(
    compound: ChemSpiderDetailsResponse,
    query: string
  ): number {
    let score = 60 // Base score

    // Boost for name match
    if (compound.commonName?.toLowerCase().includes(query.toLowerCase())) {
      score += 25
    }

    // Boost for more references (indicates well-studied compound)
    if (compound.referenceCount) {
      score += Math.min(15, Math.log10(compound.referenceCount + 1) * 5)
    }

    // Boost for more data sources
    if (compound.dataSourceCount) {
      score += Math.min(10, compound.dataSourceCount / 10)
    }

    return Math.min(100, score)
  }

  /**
   * Test if API is available
   */
  async isAvailable(): Promise<boolean> {
    // Check if API key is configured
    if (!this.apiKey) {
      console.log('[ChemSpider] No API key configured')
      return false
    }

    try {
      // Make a minimal test request
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/records/2244/details`,
        {
          headers: { 'apikey': this.apiKey },
        },
        5000
      )
      return response.ok
    } catch (error) {
      console.error('[ChemSpider] Availability check failed:', error)
      return false
    }
  }

  /**
   * Override cache TTL
   */
  protected getCacheTTL(): number {
    return 24 * 60 * 60 * 1000 // 24 hours
  }
}

/**
 * Create and export ChemSpider adapter instance
 */
export const chemspiderAdapter = new ChemSpiderAdapter()
