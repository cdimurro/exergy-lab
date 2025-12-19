/**
 * Materials Project API Adapter
 *
 * Searches Materials Project for material properties and structures.
 * API: https://api.materialsproject.org/
 *
 * Rate: 500 requests/day for free API key
 * Auth: Required (API key from materialsproject.org)
 *
 * Features:
 * - 150,000+ inorganic materials
 * - Computed properties (band gap, formation energy, etc.)
 * - Crystal structures
 * - Phase diagrams
 * - Battery electrode properties
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
 * Materials Project material type
 */
export interface MPMaterial {
  material_id: string
  formula_pretty: string
  formula_anonymous?: string
  chemsys?: string // Chemical system (e.g., "Li-Co-O")
  nsites?: number  // Number of sites in unit cell
  nelements?: number // Number of elements
  elements?: string[]
  volume?: number
  density?: number
  density_atomic?: number
  symmetry?: {
    crystal_system: string
    symbol: string
    number: number
    point_group: string
  }
  // Electronic properties
  band_gap?: number
  is_gap_direct?: boolean
  is_metal?: boolean
  is_magnetic?: boolean
  total_magnetization?: number
  // Stability
  formation_energy_per_atom?: number
  energy_above_hull?: number
  is_stable?: boolean
  // Mechanical
  bulk_modulus?: number
  shear_modulus?: number
  // Thermal
  debye_temperature?: number
  // Additional
  theoretical?: boolean
  deprecated?: boolean
}

/**
 * Materials Project API response
 */
interface MPResponse {
  data: MPMaterial[]
  meta?: {
    total_doc?: number
    max_limit?: number
  }
}

/**
 * Materials Project Source (extends base Source with materials data)
 */
interface MaterialSource extends Source {
  materialData: {
    formula: string
    materialId: string
    bandGap?: number
    formationEnergy?: number
    crystalSystem?: string
    spaceGroup?: string
    isStable?: boolean
    isMetal?: boolean
    elements: string[]
    properties: Record<string, any>
  }
}

/**
 * Domain to element/formula patterns
 */
const DOMAIN_TO_MATERIALS: Partial<Record<Domain, string[]>> = {
  'solar-energy': [
    'Si', 'GaAs', 'CdTe', 'CuInGaSe', // Traditional PV
    'MAPbI3', 'FAPbI3', 'CsPbI3', 'CsPbBr3', // Perovskites
    'TiO2', 'ZnO', // Transparent conductors
  ],
  'battery-storage': [
    'LiCoO2', 'LiFePO4', 'LiMn2O4', // Li-ion cathodes
    'LiNiMnCoO2', 'LiNiCoAlO2', // NMC, NCA
    'Li4Ti5O12', 'Si', 'C', // Anodes
    'Li6PS5Cl', 'Li7La3Zr2O12', // Solid electrolytes
    'Na', 'K', 'Mg', 'Al', // Post-Li
  ],
  'hydrogen-fuel': [
    'Pt', 'Ir', 'Ru', // PGM catalysts
    'Ni', 'Fe', 'Co', // Non-PGM catalysts
    'YSZ', 'GDC', 'LSM', // SOFC materials
    'PdCu', 'VNbTa', // Membranes
  ],
  'carbon-capture': [
    'ZIF-8', 'MOF-5', 'HKUST-1', // MOFs
    'CaO', 'MgO', 'K2CO3', // Sorbents
    'Amine', // Amine solutions (not in MP but for reference)
  ],
  'materials-science': [
    'Fe', 'Al', 'Ti', 'Cu', 'Ni', // Metals
    'SiC', 'Si3N4', 'Al2O3', // Ceramics
    'GaN', 'SiC', 'Ga2O3', // Wide bandgap
  ],
  'wind-energy': ['Fe', 'Nd', 'Pr', 'Dy'], // Permanent magnets
  'biomass': ['C', 'Cellulose'], // Carbon materials
  'geothermal': ['SiO2', 'Zeolite'], // Thermal materials
  'energy-efficiency': ['Bi2Te3', 'PbTe', 'CoSb3'], // Thermoelectrics
  'grid-optimization': ['Si', 'SiC', 'GaN'], // Power electronics
}

/**
 * Materials Project adapter implementation
 */
export class MaterialsProjectAdapter extends BaseAdapter {
  readonly name: DataSourceName = 'materials-project'
  readonly domains: Domain[] = [
    'solar-energy',
    'battery-storage',
    'hydrogen-fuel',
    'carbon-capture',
    'materials-science',
    'energy-efficiency',
  ]

  private readonly mpApiKey: string | undefined

  constructor() {
    super({
      baseUrl: 'https://api.materialsproject.org',
      requestsPerMinute: 10, // Conservative for shared API key
      requestsPerDay: 500,    // Free tier limit
      cacheTTL: 24 * 60 * 60 * 1000, // 24 hours (materials don't change)
    })

    this.mpApiKey = process.env.MATERIALS_PROJECT_API_KEY

    if (!this.mpApiKey) {
      console.warn(`[${this.name}] No MATERIALS_PROJECT_API_KEY configured - materials searches will be unavailable`)
    }
  }

  /**
   * Execute search query against Materials Project API
   */
  protected async executeSearch(
    query: string,
    filters: SearchFilters = {}
  ): Promise<SearchResult> {
    const startTime = Date.now()

    // Check for API key
    if (!this.mpApiKey) {
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
      const limit = Math.min(filters.limit || 25, 100)

      // Parse query for chemical formulas and elements
      const { formula, elements, keywords } = this.parseQuery(query, filters)

      // Build API URL
      const url = new URL(`${this.baseUrl}/materials/summary/`)

      // Set fields to retrieve
      const fields = [
        'material_id', 'formula_pretty', 'chemsys', 'nelements', 'elements',
        'nsites', 'volume', 'density',
        'symmetry', 'band_gap', 'is_gap_direct', 'is_metal',
        'formation_energy_per_atom', 'energy_above_hull', 'is_stable',
        'bulk_modulus', 'shear_modulus', 'debye_temperature',
        'theoretical', 'deprecated',
      ]
      url.searchParams.set('_fields', fields.join(','))
      url.searchParams.set('_limit', String(limit))

      // Add filters based on query parsing
      if (formula) {
        url.searchParams.set('formula', formula)
      } else if (elements.length > 0) {
        // Search by elements
        url.searchParams.set('elements', elements.join(','))
      }

      // Filter for stable materials by default
      url.searchParams.set('deprecated', 'false')

      // For battery/energy storage, filter for suitable band gaps
      if (filters.domains?.includes('battery-storage')) {
        url.searchParams.set('energy_above_hull_max', '0.1') // Stable materials
      }

      // For solar, filter for semiconductor band gaps
      if (filters.domains?.includes('solar-energy')) {
        url.searchParams.set('band_gap_min', '0.5')
        url.searchParams.set('band_gap_max', '3.0')
      }

      console.log(`[${this.name}] Searching: formula=${formula || 'N/A'}, elements=[${elements.join(',')}]`)

      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'X-API-KEY': this.mpApiKey,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[${this.name}] API error response:`, errorText)
        throw new Error(`Materials Project API error: HTTP ${response.status}`)
      }

      const data = await response.json() as MPResponse

      const materials = (data.data || []).map(mat => this.transformMaterial(mat, query))

      console.log(`[${this.name}] Found ${materials.length} materials`)

      return {
        sources: materials,
        total: data.meta?.total_doc || materials.length,
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
   * Parse query string to extract chemical formulas and elements
   */
  private parseQuery(
    query: string,
    filters: SearchFilters
  ): { formula: string | null; elements: string[]; keywords: string[] } {
    const elements: string[] = []
    const keywords: string[] = []
    let formula: string | null = null

    // Common element symbols
    const elementSymbols = [
      'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne',
      'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca',
      'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn',
      'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr', 'Rb', 'Sr', 'Y', 'Zr',
      'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn',
      'Sb', 'Te', 'I', 'Xe', 'Cs', 'Ba', 'La', 'Ce', 'Pr', 'Nd',
      'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb',
      'Lu', 'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg',
      'Tl', 'Pb', 'Bi', 'Po', 'At', 'Rn', 'Fr', 'Ra', 'Ac', 'Th',
      'Pa', 'U', 'Np', 'Pu',
    ]

    // Try to match chemical formula patterns (e.g., LiCoO2, Li6PS5Cl)
    const formulaMatch = query.match(/([A-Z][a-z]?\d*)+/)
    if (formulaMatch) {
      const potentialFormula = formulaMatch[0]
      // Validate it looks like a formula (has at least 2 elements or element+number)
      if (/[A-Z][a-z]?\d+/.test(potentialFormula) || /[A-Z][a-z]?[A-Z]/.test(potentialFormula)) {
        formula = potentialFormula
      }
    }

    // Extract individual elements from query
    const words = query.split(/\s+/)
    for (const word of words) {
      // Check if word matches an element symbol
      const cleanWord = word.replace(/[^A-Za-z]/g, '')
      if (elementSymbols.includes(cleanWord)) {
        elements.push(cleanWord)
      } else if (cleanWord.length > 2) {
        keywords.push(cleanWord.toLowerCase())
      }
    }

    // If domain is specified, add relevant elements
    if (filters.domains && filters.domains.length > 0) {
      for (const domain of filters.domains) {
        const domainElements = DOMAIN_TO_MATERIALS[domain]
        if (domainElements) {
          // Only add basic elements, not formulas
          const basicElements = domainElements.filter(e => elementSymbols.includes(e))
          elements.push(...basicElements.slice(0, 3)) // Limit to 3 to avoid over-filtering
        }
      }
    }

    // Deduplicate elements
    const uniqueElements = [...new Set(elements)]

    return { formula, elements: uniqueElements, keywords }
  }

  /**
   * Transform Materials Project material to our Source type
   */
  private transformMaterial(material: MPMaterial, query: string): MaterialSource {
    const crystalSystem = material.symmetry?.crystal_system
    const spaceGroup = material.symmetry?.symbol

    return {
      id: `materials-project:${material.material_id}`,
      title: `${material.formula_pretty} - ${crystalSystem || 'Unknown'} structure`,
      authors: ['Materials Project'],
      abstract: this.generateMaterialAbstract(material),
      url: `https://materialsproject.org/materials/${material.material_id}`,
      metadata: {
        source: this.name,
        sourceType: 'dataset',
        quality: 95, // Computed data from DFT
        verificationStatus: 'peer-reviewed', // MP is well-validated
        accessType: 'open',
      },
      relevanceScore: this.calculateRelevance(material, query),
      materialData: {
        formula: material.formula_pretty,
        materialId: material.material_id,
        bandGap: material.band_gap,
        formationEnergy: material.formation_energy_per_atom,
        crystalSystem,
        spaceGroup,
        isStable: material.is_stable,
        isMetal: material.is_metal,
        elements: material.elements || [],
        properties: {
          volume: material.volume,
          density: material.density,
          energyAboveHull: material.energy_above_hull,
          bulkModulus: material.bulk_modulus,
          shearModulus: material.shear_modulus,
          debyeTemperature: material.debye_temperature,
          isGapDirect: material.is_gap_direct,
          isMagnetic: material.is_magnetic,
          totalMagnetization: material.total_magnetization,
          theoretical: material.theoretical,
        },
      },
    }
  }

  /**
   * Generate a human-readable abstract from material properties
   */
  private generateMaterialAbstract(material: MPMaterial): string {
    const parts: string[] = []

    parts.push(`${material.formula_pretty} is a ${material.is_metal ? 'metallic' : 'non-metallic'} compound`)

    if (material.symmetry) {
      parts.push(`with ${material.symmetry.crystal_system} crystal structure (space group ${material.symmetry.symbol})`)
    }

    if (material.band_gap !== undefined && !material.is_metal) {
      parts.push(`It has a ${material.is_gap_direct ? 'direct' : 'indirect'} band gap of ${material.band_gap.toFixed(2)} eV`)
    }

    if (material.formation_energy_per_atom !== undefined) {
      parts.push(`Formation energy: ${material.formation_energy_per_atom.toFixed(3)} eV/atom`)
    }

    if (material.is_stable !== undefined) {
      parts.push(`Thermodynamic stability: ${material.is_stable ? 'stable' : 'metastable'}`)
    }

    if (material.energy_above_hull !== undefined) {
      parts.push(`Energy above hull: ${material.energy_above_hull.toFixed(3)} eV/atom`)
    }

    return parts.join('. ') + '.'
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(material: MPMaterial, query: string): number {
    let score = 60 // Base score

    // Boost for stable materials
    if (material.is_stable) score += 15
    else if (material.energy_above_hull && material.energy_above_hull < 0.05) score += 10

    // Boost for non-deprecated materials
    if (!material.deprecated) score += 5

    // Boost for having good properties data
    if (material.band_gap !== undefined) score += 5
    if (material.bulk_modulus !== undefined) score += 5
    if (material.debye_temperature !== undefined) score += 3

    // Boost for matching elements in query
    const queryLower = query.toLowerCase()
    const elements = material.elements || []
    const matchingElements = elements.filter(e => queryLower.includes(e.toLowerCase())).length
    score += matchingElements * 5

    // Boost for suitable band gaps (solar cells: 0.8-2.0 eV)
    if (material.band_gap && material.band_gap >= 0.8 && material.band_gap <= 2.0) {
      score += 10
    }

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Get details for a specific material
   */
  protected async executeGetDetails(id: string): Promise<Source | null> {
    if (!this.mpApiKey) {
      console.warn(`[${this.name}] Cannot get details - no API key configured`)
      return null
    }

    try {
      // Extract MP ID from our format
      const mpId = id.replace('materials-project:', '')

      const url = new URL(`${this.baseUrl}/materials/summary/${mpId}`)
      url.searchParams.set('_fields', [
        'material_id', 'formula_pretty', 'chemsys', 'nelements', 'elements',
        'nsites', 'volume', 'density',
        'symmetry', 'band_gap', 'is_gap_direct', 'is_metal',
        'formation_energy_per_atom', 'energy_above_hull', 'is_stable',
        'bulk_modulus', 'shear_modulus', 'debye_temperature',
        'theoretical', 'deprecated',
      ].join(','))

      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'X-API-KEY': this.mpApiKey,
        },
      })

      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error(`Materials Project API error: HTTP ${response.status}`)
      }

      const data = await response.json() as MPResponse

      if (!data.data || data.data.length === 0) {
        return null
      }

      return this.transformMaterial(data.data[0], '')
    } catch (error) {
      console.error(`[${this.name}] Failed to get details for ${id}:`, error)
      return null
    }
  }

  /**
   * Test if API is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.mpApiKey) {
      console.warn(`[${this.name}] Not available - no MATERIALS_PROJECT_API_KEY configured`)
      return false
    }

    try {
      const url = new URL(`${this.baseUrl}/materials/summary/`)
      url.searchParams.set('formula', 'Si')
      url.searchParams.set('_limit', '1')
      url.searchParams.set('_fields', 'material_id')

      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'X-API-KEY': this.mpApiKey,
        },
      })

      if (!response.ok) {
        console.warn(`[${this.name}] API returned ${response.status} - check API key`)
      }

      return response.ok
    } catch (error) {
      console.error(`[${this.name}] Availability check failed:`, error)
      return false
    }
  }
}

/**
 * Create and export Materials Project adapter instance
 */
export const materialsProjectAdapter = new MaterialsProjectAdapter()
