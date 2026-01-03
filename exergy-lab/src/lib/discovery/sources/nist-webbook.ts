/**
 * NIST WebBook Adapter
 *
 * Searches thermophysical and thermochemical data from NIST WebBook.
 * API: https://webbook.nist.gov
 *
 * Features:
 * - Thermochemical data (enthalpy, entropy, heat capacity)
 * - Phase transition data
 * - Spectral data (IR, MS, UV-Vis)
 * - Thermophysical properties
 *
 * Note: NIST WebBook has limited programmatic access. This adapter
 * uses web scraping patterns where API is not available.
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
 * NIST WebBook compound data
 */
interface NISTCompound {
  casNumber: string
  name: string
  formula?: string
  molecularWeight?: number
  enthalpy?: number // kJ/mol
  entropy?: number // J/(mol*K)
  heatCapacity?: number // J/(mol*K)
  meltingPoint?: number // K
  boilingPoint?: number // K
  vaporPressure?: number // Pa at 25C
  density?: number // kg/m3
  hasIRSpectrum?: boolean
  hasMSSpectrum?: boolean
  hasPhaseData?: boolean
}

/**
 * NIST search response structure (parsed from HTML/JSON)
 */
interface NISTSearchResult {
  compounds: NISTCompound[]
  total: number
}

/**
 * NIST WebBook adapter implementation
 */
export class NISTWebbookAdapter extends BaseAdapter {
  readonly name: DataSourceName = 'nist-webbook'
  readonly domains: Domain[] = [
    'battery-storage',
    'hydrogen-fuel',
    'carbon-capture',
    'materials-science',
    'energy-efficiency',
  ]

  constructor() {
    super({
      baseUrl: 'https://webbook.nist.gov',
      requestsPerMinute: 20, // Conservative rate limiting
      requestsPerDay: 1000,
      cacheTTL: 7 * 24 * 60 * 60 * 1000, // 7 days (data is stable)
    })
  }

  /**
   * Execute search query
   * NIST WebBook doesn't have a proper search API, so we use the CGI interface
   */
  protected async executeSearch(
    query: string,
    filters: SearchFilters = {}
  ): Promise<SearchResult> {
    const startTime = Date.now()
    const limit = filters.limit || 20

    try {
      // Use NIST Chemistry WebBook search
      // Format: /cgi/cbook.cgi?Name=query&Units=SI
      const searchUrl = `${this.baseUrl}/cgi/cbook.cgi?Name=${encodeURIComponent(query)}&Units=SI&cTG=on&cTC=on&cTP=on`

      const response = await this.fetchWithTimeout(searchUrl, {}, 15000)

      if (!response.ok) {
        return this.emptyResult(query, filters, startTime)
      }

      const html = await response.text()

      // Parse the HTML response to extract compounds
      const compounds = this.parseSearchResults(html, query)

      // Transform to Source format
      const sources: Source[] = compounds.slice(0, limit).map((compound) =>
        this.transformToSource(compound, query)
      )

      return {
        sources,
        total: compounds.length,
        searchTime: Date.now() - startTime,
        query,
        filters,
        from: this.name,
      }
    } catch (error) {
      console.error(`[NIST WebBook] Search failed:`, error)
      return this.emptyResult(query, filters, startTime)
    }
  }

  /**
   * Parse HTML search results from NIST WebBook
   * This is a simplified parser - NIST returns HTML pages
   */
  private parseSearchResults(html: string, query: string): NISTCompound[] {
    const compounds: NISTCompound[] = []

    // Look for CAS registry numbers and names in the HTML
    // Pattern: CAS Registry Number: XXX-XX-X
    const casPattern = /CAS Registry Number:\s*(\d+-\d+-\d+)/gi
    const namePattern = /<title>([^<]+)<\/title>/i

    // Extract title (compound name)
    const titleMatch = html.match(namePattern)
    let compoundName = query

    if (titleMatch && titleMatch[1]) {
      // Clean up the title
      compoundName = titleMatch[1]
        .replace(' - NIST Chemistry WebBook', '')
        .replace(/\s+/g, ' ')
        .trim()
    }

    // Extract CAS number
    const casMatch = html.match(casPattern)
    let casNumber = ''

    if (casMatch && casMatch[0]) {
      const casExtract = casMatch[0].match(/(\d+-\d+-\d+)/)
      if (casExtract) {
        casNumber = casExtract[1]
      }
    }

    // Extract formula
    const formulaPattern = /Formula:\s*<[^>]*>([^<]+)<\/a>/i
    const formulaMatch = html.match(formulaPattern)
    const formula = formulaMatch ? formulaMatch[1].trim() : undefined

    // Extract molecular weight
    const mwPattern = /Molecular weight:\s*([\d.]+)/i
    const mwMatch = html.match(mwPattern)
    const molecularWeight = mwMatch ? parseFloat(mwMatch[1]) : undefined

    // Check for available data types
    const hasThermo = html.includes('Thermochemical') || html.includes('Gas phase thermochemistry')
    const hasIR = html.includes('IR Spectrum')
    const hasMS = html.includes('Mass spectrum')
    const hasPhase = html.includes('Phase change') || html.includes('Condensed phase')

    // Extract thermodynamic data if available
    let enthalpy: number | undefined
    let entropy: number | undefined

    const enthalpyPattern = /ΔfH°gas\s*<\/td>\s*<td[^>]*>([-\d.]+)/i
    const enthalpyMatch = html.match(enthalpyPattern)
    if (enthalpyMatch) {
      enthalpy = parseFloat(enthalpyMatch[1])
    }

    const entropyPattern = /S°gas,\s*1 bar\s*<\/td>\s*<td[^>]*>([\d.]+)/i
    const entropyMatch = html.match(entropyPattern)
    if (entropyMatch) {
      entropy = parseFloat(entropyMatch[1])
    }

    // Only add if we found a valid compound
    if (compoundName && compoundName !== query && casNumber) {
      compounds.push({
        casNumber,
        name: compoundName,
        formula,
        molecularWeight,
        enthalpy,
        entropy,
        hasIRSpectrum: hasIR,
        hasMSSpectrum: hasMS,
        hasPhaseData: hasPhase,
      })
    } else if (html.includes('Search Results')) {
      // This is a search results page with multiple compounds
      // Extract list items
      const listPattern = /<li><a href="\/cgi\/cbook\.cgi\?ID=([^&"]+)[^"]*">([^<]+)<\/a>/gi
      let match

      while ((match = listPattern.exec(html)) !== null && compounds.length < 20) {
        const id = match[1]
        const name = match[2].trim()

        compounds.push({
          casNumber: id,
          name,
        })
      }
    }

    return compounds
  }

  /**
   * Get details for a specific compound
   */
  protected async executeGetDetails(id: string): Promise<Source | null> {
    try {
      // Extract CAS number from source ID
      const casNumber = id.replace('nist-webbook:', '')

      // Fetch compound page
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/cgi/cbook.cgi?ID=${casNumber}&Units=SI&cTG=on&cTC=on&cTP=on&cSO=on`,
        {},
        10000
      )

      if (!response.ok) {
        return null
      }

      const html = await response.text()
      const compounds = this.parseSearchResults(html, casNumber)

      if (compounds.length === 0) {
        return null
      }

      return this.transformToSource(compounds[0], '')
    } catch (error) {
      console.error(`[NIST WebBook] Failed to get details for ${id}:`, error)
      return null
    }
  }

  /**
   * Transform NIST compound to standard Source format
   */
  private transformToSource(compound: NISTCompound, query: string): Source {
    // Build description from available data
    const properties: string[] = []

    if (compound.formula) {
      properties.push(`Formula: ${compound.formula}`)
    }
    if (compound.molecularWeight) {
      properties.push(`MW: ${compound.molecularWeight.toFixed(2)} g/mol`)
    }
    if (compound.enthalpy !== undefined) {
      properties.push(`ΔfH: ${compound.enthalpy.toFixed(1)} kJ/mol`)
    }
    if (compound.entropy !== undefined) {
      properties.push(`S: ${compound.entropy.toFixed(1)} J/(mol*K)`)
    }
    if (compound.meltingPoint) {
      properties.push(`Tm: ${compound.meltingPoint.toFixed(1)} K`)
    }
    if (compound.boilingPoint) {
      properties.push(`Tb: ${compound.boilingPoint.toFixed(1)} K`)
    }

    const dataTypes: string[] = []
    if (compound.hasIRSpectrum) dataTypes.push('IR')
    if (compound.hasMSSpectrum) dataTypes.push('MS')
    if (compound.hasPhaseData) dataTypes.push('Phase')

    const abstract = `Thermochemical and physical property data from NIST. ${properties.join('. ')}.${
      dataTypes.length > 0 ? ` Available data: ${dataTypes.join(', ')}.` : ''
    }`

    return {
      id: `nist-webbook:${compound.casNumber}`,
      title: compound.formula
        ? `${compound.name} (${compound.formula})`
        : compound.name,
      authors: ['NIST Chemistry WebBook'],
      abstract,
      url: `https://webbook.nist.gov/cgi/cbook.cgi?ID=${compound.casNumber}&Units=SI`,
      metadata: {
        source: this.name,
        sourceType: 'chemical-database',
        quality: 95, // NIST is authoritative reference data
        verificationStatus: 'peer-reviewed',
        accessType: 'open',
      },
      relevanceScore: this.calculateRelevance(compound, query),
    }
  }

  /**
   * Calculate relevance score for compound
   */
  private calculateRelevance(compound: NISTCompound, query: string): number {
    let score = 75 // Base score (NIST is authoritative)

    // Boost for name match
    if (compound.name.toLowerCase().includes(query.toLowerCase())) {
      score += 15
    }

    // Boost for thermodynamic data availability
    if (compound.enthalpy !== undefined) score += 3
    if (compound.entropy !== undefined) score += 3
    if (compound.heatCapacity !== undefined) score += 2

    // Boost for spectral data
    if (compound.hasIRSpectrum) score += 2
    if (compound.hasMSSpectrum) score += 2

    return Math.min(100, score)
  }

  /**
   * Test if API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Test with a known compound (water)
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/cgi/cbook.cgi?ID=C7732185&Units=SI`,
        {},
        5000
      )
      return response.ok
    } catch (error) {
      console.error('[NIST WebBook] Availability check failed:', error)
      return false
    }
  }

  /**
   * Helper to return empty result
   */
  private emptyResult(
    query: string,
    filters: SearchFilters,
    startTime: number
  ): SearchResult {
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
   * Override cache TTL - NIST data is very stable
   */
  protected getCacheTTL(): number {
    return 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}

/**
 * Create and export NIST WebBook adapter instance
 */
export const nistWebbookAdapter = new NISTWebbookAdapter()
