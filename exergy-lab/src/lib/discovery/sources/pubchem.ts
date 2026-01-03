/**
 * PubChem Adapter
 *
 * Searches chemical compounds and substances from PubChem.
 * API: https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest
 *
 * Features:
 * - Chemical compound data
 * - Molecular properties
 * - Bioactivity data
 * - Material properties
 * - Safety information
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
 * PubChem compound data response
 */
interface PubChemCompound {
  CID: number
  MolecularFormula?: string
  MolecularWeight?: number
  IUPACName?: string
  Title?: string
  CanonicalSMILES?: string
  IsomericSMILES?: string
  InChI?: string
  InChIKey?: string
  XLogP?: number
  HBondDonorCount?: number
  HBondAcceptorCount?: number
  RotatableBondCount?: number
  TPSA?: number
  Complexity?: number
}

/**
 * PubChem search response
 */
interface PubChemSearchResponse {
  PC_Compounds?: PubChemCompound[]
  Compounds?: PubChemCompound[]
}

interface PubChemListResponse {
  IdentifierList?: {
    CID?: number[]
  }
}

/**
 * Individual compound property record from PubChem
 */
interface PubChemCompoundProperty {
  CID: number
  MolecularFormula?: string
  MolecularWeight?: number
  CanonicalSMILES?: string
  IUPACName?: string
  InChIKey?: string
  XLogP?: number
  HBondDonorCount?: number
  HBondAcceptorCount?: number
  RotatableBondCount?: number
  TPSA?: number
  Complexity?: number
}

interface PubChemPropertyResponse {
  PropertyTable?: {
    Properties?: PubChemCompoundProperty[]
  }
}

/**
 * PubChem adapter implementation
 */
export class PubChemAdapter extends BaseAdapter {
  readonly name: DataSourceName = 'pubchem'
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
      baseUrl: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug',
      requestsPerMinute: 30, // PubChem has generous limits
      requestsPerDay: 5000,
      cacheTTL: 24 * 60 * 60 * 1000, // 24 hours (compound data is stable)
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

    try {
      // Step 1: Search for compound CIDs matching the query
      const searchResponse = await this.fetchWithTimeout(
        `${this.baseUrl}/compound/name/${encodeURIComponent(query)}/cids/JSON`,
        {},
        15000
      )

      if (!searchResponse.ok) {
        // Try autocomplete search as fallback
        const autocompleteResponse = await this.fetchWithTimeout(
          `${this.baseUrl}/compound/fastsubstructure/smarts/${encodeURIComponent(query)}/cids/JSON?MaxRecords=${limit}`,
          {},
          15000
        )

        if (!autocompleteResponse.ok) {
          // No compounds found
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

      const listData: PubChemListResponse = await searchResponse.json()
      const cids = listData.IdentifierList?.CID?.slice(0, limit) || []

      if (cids.length === 0) {
        return {
          sources: [],
          total: 0,
          searchTime: Date.now() - startTime,
          query,
          filters,
          from: this.name,
        }
      }

      // Step 2: Get properties for the compounds
      const properties = [
        'MolecularFormula',
        'MolecularWeight',
        'CanonicalSMILES',
        'IUPACName',
        'InChIKey',
        'XLogP',
        'HBondDonorCount',
        'HBondAcceptorCount',
        'RotatableBondCount',
        'TPSA',
        'Complexity',
      ].join(',')

      const propsResponse = await this.fetchWithTimeout(
        `${this.baseUrl}/compound/cid/${cids.join(',')}/property/${properties}/JSON`,
        {},
        15000
      )

      if (!propsResponse.ok) {
        throw new Error(`Failed to get compound properties: ${propsResponse.status}`)
      }

      const propsData: PubChemPropertyResponse = await propsResponse.json()
      const compounds = propsData.PropertyTable?.Properties || []

      // Transform to Source format
      const sources: Source[] = compounds.map((compound) =>
        this.transformToSource(compound, query)
      )

      return {
        sources,
        total: cids.length,
        searchTime: Date.now() - startTime,
        query,
        filters,
        from: this.name,
      }
    } catch (error) {
      console.error(`[PubChem] Search failed:`, error)
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
   * Get details for a specific compound
   */
  protected async executeGetDetails(id: string): Promise<Source | null> {
    try {
      // Extract CID from source ID
      const cid = id.replace('pubchem:', '')

      const properties = [
        'MolecularFormula',
        'MolecularWeight',
        'CanonicalSMILES',
        'IUPACName',
        'InChIKey',
        'XLogP',
        'HBondDonorCount',
        'HBondAcceptorCount',
        'RotatableBondCount',
        'TPSA',
        'Complexity',
      ].join(',')

      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/compound/cid/${cid}/property/${properties}/JSON`,
        {},
        10000
      )

      if (!response.ok) {
        return null
      }

      const data: PubChemPropertyResponse = await response.json()
      const compound = data.PropertyTable?.Properties?.[0]

      if (!compound) {
        return null
      }

      return this.transformToSource(compound, '')
    } catch (error) {
      console.error(`[PubChem] Failed to get details for ${id}:`, error)
      return null
    }
  }

  /**
   * Transform PubChem compound to standard Source format
   */
  private transformToSource(
    compound: PubChemCompoundProperty,
    query: string
  ): Source {
    const name = compound.IUPACName || `CID ${compound.CID}`
    const formula = compound.MolecularFormula || 'Unknown'

    // Build description from properties
    const properties: string[] = []
    if (compound.MolecularWeight) {
      properties.push(`MW: ${compound.MolecularWeight.toFixed(2)} g/mol`)
    }
    if (compound.XLogP !== undefined) {
      properties.push(`LogP: ${compound.XLogP.toFixed(2)}`)
    }
    if (compound.TPSA !== undefined) {
      properties.push(`TPSA: ${compound.TPSA.toFixed(1)} A2`)
    }
    if (compound.HBondDonorCount !== undefined) {
      properties.push(`HBD: ${compound.HBondDonorCount}`)
    }
    if (compound.HBondAcceptorCount !== undefined) {
      properties.push(`HBA: ${compound.HBondAcceptorCount}`)
    }

    const abstract = `Chemical compound: ${formula}. ${properties.join(', ')}. ${
      compound.CanonicalSMILES ? `SMILES: ${compound.CanonicalSMILES}` : ''
    }`

    return {
      id: `pubchem:${compound.CID}`,
      title: `${name} (${formula})`,
      authors: ['PubChem Database'],
      abstract,
      url: `https://pubchem.ncbi.nlm.nih.gov/compound/${compound.CID}`,
      metadata: {
        source: this.name,
        sourceType: 'chemical-database',
        quality: 90, // PubChem is authoritative
        verificationStatus: 'peer-reviewed',
        accessType: 'open',
      },
      relevanceScore: this.calculateRelevance(compound, query),
    }
  }

  /**
   * Calculate relevance score for compound
   */
  private calculateRelevance(
    compound: PubChemCompoundProperty,
    query: string
  ): number {
    let score = 70 // Base score

    // Boost for name match
    if (compound.IUPACName?.toLowerCase().includes(query.toLowerCase())) {
      score += 20
    }

    // Boost for common/simple compounds (lower complexity)
    if (compound.Complexity !== undefined && compound.Complexity < 200) {
      score += 10
    }

    // Boost for drug-like properties (Lipinski's rule of five)
    if (compound.MolecularWeight && compound.MolecularWeight < 500 &&
        compound.HBondDonorCount !== undefined && compound.HBondDonorCount <= 5 &&
        compound.HBondAcceptorCount !== undefined && compound.HBondAcceptorCount <= 10 &&
        compound.XLogP !== undefined && compound.XLogP <= 5) {
      score += 10
    }

    return Math.min(100, score)
  }

  /**
   * Test if API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Make a minimal test request
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/compound/cid/2244/property/MolecularFormula/JSON`,
        {},
        5000
      )
      return response.ok
    } catch (error) {
      console.error('[PubChem] Availability check failed:', error)
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
 * Create and export PubChem adapter instance
 */
export const pubchemAdapter = new PubChemAdapter()
