/**
 * Materials Database
 *
 * Wrapper for Materials Project data to provide simulation-relevant properties.
 * Implements API-first with embedded fallback data.
 */

import { CACHE_TTL } from './data-source-registry'

/**
 * Material properties relevant for simulations
 */
export interface MaterialProperties {
  formula: string
  materialId?: string
  bandGap?: number
  isBandGapDirect?: boolean
  isMetal: boolean
  formationEnergy?: number
  isStable?: boolean
  thermalConductivity?: number
  electricalConductivity?: number
  density?: number
  crystalSystem?: string
  source: string
  isFallback: boolean
}

/**
 * Electrochemical properties for catalysts and electrodes
 */
export interface ElectrochemicalProperties {
  material: string
  faradaicEfficiency?: number
  exchangeCurrentDensity?: number // A/cm2
  tafelSlope?: number // mV/decade
  overpotential?: number // V at reference current density
  stabilityRating?: 'low' | 'medium' | 'high'
  source: string
  isFallback: boolean
}

/**
 * Embedded material data for common simulation materials
 * Source: Materials Project, literature values
 */
const EMBEDDED_MATERIALS: Record<string, Partial<MaterialProperties>> = {
  // Photovoltaic materials
  'Si': {
    formula: 'Si',
    bandGap: 1.12,
    isBandGapDirect: false,
    isMetal: false,
    isStable: true,
    thermalConductivity: 149, // W/m-K
    density: 2.329, // g/cm3
    crystalSystem: 'cubic',
  },
  'GaAs': {
    formula: 'GaAs',
    bandGap: 1.42,
    isBandGapDirect: true,
    isMetal: false,
    isStable: true,
    thermalConductivity: 55,
    density: 5.32,
    crystalSystem: 'cubic',
  },
  'CdTe': {
    formula: 'CdTe',
    bandGap: 1.45,
    isBandGapDirect: true,
    isMetal: false,
    isStable: true,
    thermalConductivity: 6.2,
    density: 5.85,
    crystalSystem: 'cubic',
  },
  'CuInGaSe2': {
    formula: 'CuInGaSe2',
    bandGap: 1.15,
    isBandGapDirect: true,
    isMetal: false,
    isStable: true,
    density: 5.75,
    crystalSystem: 'tetragonal',
  },
  // Perovskites
  'MAPbI3': {
    formula: 'CH3NH3PbI3',
    bandGap: 1.55,
    isBandGapDirect: true,
    isMetal: false,
    isStable: false, // Metastable
    density: 4.16,
    crystalSystem: 'tetragonal',
  },
  'FAPbI3': {
    formula: 'CH(NH2)2PbI3',
    bandGap: 1.48,
    isBandGapDirect: true,
    isMetal: false,
    isStable: false,
    density: 4.09,
  },
  'CsPbI3': {
    formula: 'CsPbI3',
    bandGap: 1.73,
    isBandGapDirect: true,
    isMetal: false,
    isStable: false,
    density: 4.83,
  },
  // Battery cathode materials
  'LiCoO2': {
    formula: 'LiCoO2',
    bandGap: 2.7,
    isMetal: false,
    formationEnergy: -2.35, // eV/atom
    isStable: true,
    density: 5.05,
    crystalSystem: 'trigonal',
  },
  'LiFePO4': {
    formula: 'LiFePO4',
    bandGap: 3.8,
    isMetal: false,
    formationEnergy: -2.15,
    isStable: true,
    density: 3.60,
    crystalSystem: 'orthorhombic',
  },
  'LiNiMnCoO2': {
    formula: 'LiNi0.33Mn0.33Co0.33O2',
    bandGap: 2.5,
    isMetal: false,
    formationEnergy: -2.28,
    isStable: true,
    density: 4.68,
  },
  // Thermoelectric materials
  'Bi2Te3': {
    formula: 'Bi2Te3',
    bandGap: 0.15,
    isBandGapDirect: false,
    isMetal: false,
    isStable: true,
    thermalConductivity: 1.5,
    density: 7.86,
  },
  // Wide bandgap semiconductors
  'SiC': {
    formula: 'SiC',
    bandGap: 3.26,
    isBandGapDirect: false,
    isMetal: false,
    isStable: true,
    thermalConductivity: 490,
    density: 3.21,
    crystalSystem: 'hexagonal',
  },
  'GaN': {
    formula: 'GaN',
    bandGap: 3.4,
    isBandGapDirect: true,
    isMetal: false,
    isStable: true,
    thermalConductivity: 130,
    density: 6.15,
    crystalSystem: 'hexagonal',
  },
}

/**
 * Embedded electrochemical data for common catalysts
 * Source: Electrochemistry literature
 */
const EMBEDDED_ELECTROCHEMICAL: Record<string, Partial<ElectrochemicalProperties>> = {
  // Hydrogen evolution reaction (HER) catalysts
  'Pt': {
    material: 'Pt',
    exchangeCurrentDensity: 1e-3, // A/cm2
    tafelSlope: 30, // mV/decade
    overpotential: 0.02, // V at 10 mA/cm2
    faradaicEfficiency: 0.999,
    stabilityRating: 'high',
  },
  'Ir': {
    material: 'Ir',
    exchangeCurrentDensity: 5e-4,
    tafelSlope: 35,
    overpotential: 0.03,
    faradaicEfficiency: 0.998,
    stabilityRating: 'high',
  },
  'Ni': {
    material: 'Ni',
    exchangeCurrentDensity: 1e-5,
    tafelSlope: 120,
    overpotential: 0.25,
    faradaicEfficiency: 0.97,
    stabilityRating: 'medium',
  },
  'NiMo': {
    material: 'NiMo',
    exchangeCurrentDensity: 5e-5,
    tafelSlope: 70,
    overpotential: 0.08,
    faradaicEfficiency: 0.98,
    stabilityRating: 'high',
  },
  // Oxygen evolution reaction (OER) catalysts
  'IrO2': {
    material: 'IrO2',
    exchangeCurrentDensity: 1e-8,
    tafelSlope: 40,
    overpotential: 0.30,
    faradaicEfficiency: 0.99,
    stabilityRating: 'high',
  },
  'RuO2': {
    material: 'RuO2',
    exchangeCurrentDensity: 5e-8,
    tafelSlope: 45,
    overpotential: 0.28,
    faradaicEfficiency: 0.98,
    stabilityRating: 'medium',
  },
  'NiFe': {
    material: 'NiFe',
    exchangeCurrentDensity: 1e-9,
    tafelSlope: 55,
    overpotential: 0.35,
    faradaicEfficiency: 0.96,
    stabilityRating: 'medium',
  },
  // Fuel cell catalysts
  'Pt/C': {
    material: 'Pt/C',
    exchangeCurrentDensity: 2e-3,
    tafelSlope: 60,
    overpotential: 0.05,
    faradaicEfficiency: 0.99,
    stabilityRating: 'high',
  },
}

/**
 * Cached API data
 */
interface CachedMaterial {
  data: MaterialProperties
  timestamp: number
}

/**
 * Materials Database class
 */
export class MaterialsDatabase {
  private apiKey: string | null
  private cache: Map<string, CachedMaterial> = new Map()

  constructor() {
    this.apiKey = process.env.MATERIALS_PROJECT_API_KEY || null
  }

  /**
   * Get material properties
   */
  async getMaterialProperties(
    formula: string
  ): Promise<MaterialProperties | null> {
    const normalizedFormula = this.normalizeFormula(formula)

    // Check cache
    const cached = this.cache.get(normalizedFormula)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL.MATERIALS_PROJECT) {
      return cached.data
    }

    // Check embedded data first
    const embedded = EMBEDDED_MATERIALS[normalizedFormula]
    if (embedded) {
      const props: MaterialProperties = {
        formula: normalizedFormula,
        ...embedded,
        source: 'embedded-materials-data',
        isFallback: true,
        isMetal: embedded.isMetal ?? false,
      }
      this.cache.set(normalizedFormula, { data: props, timestamp: Date.now() })
      return props
    }

    // Try Materials Project API if key available
    if (this.apiKey) {
      try {
        const apiData = await this.fetchFromMaterialsProject(normalizedFormula)
        if (apiData) {
          this.cache.set(normalizedFormula, { data: apiData, timestamp: Date.now() })
          return apiData
        }
      } catch (error) {
        console.warn('[MaterialsDatabase] API fetch failed:', error)
      }
    }

    // Return null if not found
    return null
  }

  /**
   * Get electrochemical properties for catalyst/electrode materials
   */
  async getElectrochemicalProperties(
    material: string
  ): Promise<ElectrochemicalProperties | null> {
    const normalized = material.toUpperCase().replace(/[^A-Z0-9/]/g, '')

    // Check embedded data
    for (const [key, data] of Object.entries(EMBEDDED_ELECTROCHEMICAL)) {
      if (key.toUpperCase() === normalized || normalized.includes(key.toUpperCase())) {
        return {
          material: key,
          ...data,
          source: 'embedded-electrochemistry-data',
          isFallback: true,
        } as ElectrochemicalProperties
      }
    }

    return null
  }

  /**
   * Get band gap for a material
   */
  async getBandGap(formula: string): Promise<{
    value: number
    isDirect: boolean
    source: string
    isFallback: boolean
  } | null> {
    const props = await this.getMaterialProperties(formula)

    if (props?.bandGap !== undefined) {
      return {
        value: props.bandGap,
        isDirect: props.isBandGapDirect ?? false,
        source: props.source,
        isFallback: props.isFallback,
      }
    }

    return null
  }

  /**
   * Get thermal properties for heat transfer simulations
   */
  async getThermalProperties(formula: string): Promise<{
    thermalConductivity: number
    density: number
    source: string
    isFallback: boolean
  } | null> {
    const props = await this.getMaterialProperties(formula)

    if (props?.thermalConductivity !== undefined && props?.density !== undefined) {
      return {
        thermalConductivity: props.thermalConductivity,
        density: props.density,
        source: props.source,
        isFallback: props.isFallback,
      }
    }

    return null
  }

  /**
   * Check if Materials Project API is available
   */
  async isAPIAvailable(): Promise<boolean> {
    if (!this.apiKey) return false

    try {
      const response = await fetch(
        'https://api.materialsproject.org/materials/summary/?formula=Si&_limit=1&_fields=material_id',
        {
          headers: {
            'Accept': 'application/json',
            'X-API-KEY': this.apiKey,
          },
        }
      )
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private normalizeFormula(formula: string): string {
    // Handle common aliases
    const aliases: Record<string, string> = {
      'silicon': 'Si',
      'gallium arsenide': 'GaAs',
      'cadmium telluride': 'CdTe',
      'cigs': 'CuInGaSe2',
      'perovskite': 'MAPbI3',
      'platinum': 'Pt',
      'iridium': 'Ir',
      'nickel': 'Ni',
    }

    const lower = formula.toLowerCase().trim()
    if (aliases[lower]) {
      return aliases[lower]
    }

    // Return as-is, preserving case for chemical formulas
    return formula.trim()
  }

  private async fetchFromMaterialsProject(
    formula: string
  ): Promise<MaterialProperties | null> {
    if (!this.apiKey) return null

    try {
      const url = new URL('https://api.materialsproject.org/materials/summary/')
      url.searchParams.set('formula', formula)
      url.searchParams.set('_limit', '1')
      url.searchParams.set('_fields', [
        'material_id', 'formula_pretty', 'band_gap', 'is_gap_direct',
        'is_metal', 'formation_energy_per_atom', 'is_stable',
        'density', 'symmetry',
      ].join(','))

      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'X-API-KEY': this.apiKey,
        },
      })

      if (!response.ok) return null

      const data = await response.json()
      if (!data.data || data.data.length === 0) return null

      const material = data.data[0]

      return {
        formula: material.formula_pretty || formula,
        materialId: material.material_id,
        bandGap: material.band_gap,
        isBandGapDirect: material.is_gap_direct,
        isMetal: material.is_metal ?? false,
        formationEnergy: material.formation_energy_per_atom,
        isStable: material.is_stable,
        density: material.density,
        crystalSystem: material.symmetry?.crystal_system,
        source: 'materials-project-api',
        isFallback: false,
      }
    } catch (error) {
      console.error('[MaterialsDatabase] API fetch error:', error)
      return null
    }
  }
}

/**
 * Singleton instance
 */
let dbInstance: MaterialsDatabase | null = null

export function getMaterialsDatabase(): MaterialsDatabase {
  if (!dbInstance) {
    dbInstance = new MaterialsDatabase()
  }
  return dbInstance
}

/**
 * Create new instance (for testing)
 */
export function createMaterialsDatabase(): MaterialsDatabase {
  return new MaterialsDatabase()
}
