/**
 * Parameter Resolver
 *
 * Resolves simulation parameters to real values from external data sources.
 * Returns values with uncertainty bounds and data source transparency.
 */

import { getDataSourceRegistry, DataSourceRegistry } from './data-source-registry'
import { getMaterialsDatabase, MaterialsDatabase } from './materials-db'
import type { ATBTechnology } from '@/lib/discovery/sources/nrel/types'
import type { SimulationType } from '../types'

/**
 * Resolved parameter with metadata
 */
export interface ResolvedParameter {
  name: string
  value: number
  unit: string
  uncertainty: number
  source: string
  isFallback: boolean
  physicsValid: boolean
  validationMessage?: string
}

/**
 * Parameter resolution request
 */
export interface ParameterRequest {
  name: string
  technology?: string
  material?: string
  year?: number
  location?: { lat: number; lon: number }
}

/**
 * Technology mapping for ATB lookups
 */
const TECHNOLOGY_TO_ATB: Record<string, ATBTechnology> = {
  'solar': 'utility-scale-pv',
  'solar-pv': 'utility-scale-pv',
  'pv': 'utility-scale-pv',
  'wind': 'land-based-wind',
  'onshore-wind': 'land-based-wind',
  'offshore-wind': 'offshore-wind',
  'battery': 'battery-storage',
  'storage': 'battery-storage',
  'geothermal': 'geothermal',
  'hydro': 'hydropower',
  'nuclear': 'nuclear',
  'gas': 'natural-gas',
  'ccgt': 'natural-gas',
}

/**
 * Physics limits for validation
 */
const PHYSICS_LIMITS: Record<string, { min: number; max: number; unit: string }> = {
  efficiency: { min: 0, max: 1, unit: '' },
  carnotEfficiency: { min: 0, max: 1, unit: '' },
  practicalEfficiency: { min: 0, max: 0.95, unit: '' },
  temperature: { min: 0, max: 10000, unit: 'K' },
  pressure: { min: 0, max: 1000, unit: 'atm' },
  currentDensity: { min: 0, max: 10, unit: 'A/cm2' },
  voltage: { min: 0, max: 100, unit: 'V' },
  capacityFactor: { min: 0, max: 1, unit: '' },
  bandGap: { min: 0, max: 6, unit: 'eV' },
  faradaicEfficiency: { min: 0.5, max: 1, unit: '' },
}

/**
 * Parameter Resolver class
 */
export class ParameterResolver {
  private registry: DataSourceRegistry
  private materialsDb: MaterialsDatabase

  constructor(
    registry?: DataSourceRegistry,
    materialsDb?: MaterialsDatabase
  ) {
    this.registry = registry || getDataSourceRegistry()
    this.materialsDb = materialsDb || getMaterialsDatabase()
  }

  /**
   * Resolve efficiency parameter for a technology
   */
  async resolveEfficiency(
    technology: string,
    context: {
      type?: 'practical' | 'theoretical' | 'carnot'
      temperature?: { hot: number; cold: number }
      year?: number
    } = {}
  ): Promise<ResolvedParameter> {
    const atbTech = this.mapToATBTechnology(technology)

    if (atbTech && context.type !== 'carnot') {
      const result = await this.registry.getTechnologyEfficiency(atbTech, context.year)

      return this.validateAndReturn({
        name: 'efficiency',
        value: result.efficiency,
        unit: '',
        uncertainty: result.uncertainty,
        source: result.isFallback ? 'embedded-atb-fallback' : 'nrel-atb-2024',
        isFallback: result.isFallback,
      })
    }

    // Calculate Carnot efficiency if temperatures provided
    if (context.temperature && context.type === 'carnot') {
      const carnotEff = 1 - context.temperature.cold / context.temperature.hot

      return this.validateAndReturn({
        name: 'carnotEfficiency',
        value: carnotEff,
        unit: '',
        uncertainty: 0, // Theoretical - no uncertainty
        source: 'analytical-carnot',
        isFallback: false,
      })
    }

    // Default fallback
    return {
      name: 'efficiency',
      value: 0.70,
      unit: '',
      uncertainty: 0.10,
      source: 'default-fallback',
      isFallback: true,
      physicsValid: true,
    }
  }

  /**
   * Resolve practical efficiency multiplier based on technology
   * This replaces the random 0.65-0.80 multiplier in analytical-provider.ts
   */
  async resolvePracticalEfficiencyMultiplier(
    technology: string,
    operatingConditions?: {
      temperature?: number
      pressure?: number
      loadFactor?: number
    }
  ): Promise<ResolvedParameter> {
    // Technology-specific practical efficiency multipliers from literature
    const multipliers: Record<string, { value: number; uncertainty: number }> = {
      'steam-turbine': { value: 0.70, uncertainty: 0.05 },
      'gas-turbine': { value: 0.75, uncertainty: 0.04 },
      'combined-cycle': { value: 0.82, uncertainty: 0.03 },
      'reciprocating-engine': { value: 0.72, uncertainty: 0.05 },
      'fuel-cell-sofc': { value: 0.78, uncertainty: 0.04 },
      'fuel-cell-pem': { value: 0.65, uncertainty: 0.05 },
      'heat-pump': { value: 0.75, uncertainty: 0.06 },
      'orc': { value: 0.68, uncertainty: 0.05 }, // Organic Rankine Cycle
      'default': { value: 0.72, uncertainty: 0.07 },
    }

    const techKey = technology.toLowerCase().replace(/[^a-z-]/g, '')
    const data = multipliers[techKey] || multipliers['default']

    // Adjust for operating conditions
    let adjustedValue = data.value
    let adjustedUncertainty = data.uncertainty

    if (operatingConditions?.loadFactor) {
      // Part-load efficiency penalty
      const loadFactor = operatingConditions.loadFactor
      if (loadFactor < 0.5) {
        adjustedValue *= 0.9 + 0.1 * loadFactor // Penalty at low loads
        adjustedUncertainty *= 1.2
      }
    }

    return this.validateAndReturn({
      name: 'practicalEfficiencyMultiplier',
      value: adjustedValue,
      unit: '',
      uncertainty: adjustedUncertainty,
      source: 'literature-engineering-data',
      isFallback: false,
    })
  }

  /**
   * Resolve faradaic efficiency for electrochemical systems
   * This replaces the random 0.95-0.99 in analytical-provider.ts
   */
  async resolveFaradaicEfficiency(
    system: {
      electrolyteType?: 'alkaline' | 'pem' | 'soec' | 'aem'
      catalystMaterial?: string
      currentDensity?: number
      temperature?: number
    } = {}
  ): Promise<ResolvedParameter> {
    // Faradaic efficiencies from electrochemical literature
    const efficiencyByType: Record<string, { base: number; tempCoeff: number; currentCoeff: number }> = {
      'alkaline': { base: 0.98, tempCoeff: -0.0001, currentCoeff: -0.02 },
      'pem': { base: 0.99, tempCoeff: -0.00005, currentCoeff: -0.01 },
      'soec': { base: 0.95, tempCoeff: 0.0002, currentCoeff: -0.015 }, // Improves with temp
      'aem': { base: 0.97, tempCoeff: -0.0001, currentCoeff: -0.025 },
    }

    const type = system.electrolyteType || 'pem'
    const params = efficiencyByType[type] || efficiencyByType['pem']

    let efficiency = params.base

    // Temperature adjustment (deviation from optimal)
    if (system.temperature) {
      const optimalTemp = type === 'soec' ? 1073 : type === 'alkaline' ? 353 : 333
      const tempDeviation = Math.abs(system.temperature - optimalTemp) / optimalTemp
      efficiency += params.tempCoeff * tempDeviation * 100
    }

    // Current density adjustment
    if (system.currentDensity) {
      // Higher current density reduces faradaic efficiency
      efficiency += params.currentCoeff * (system.currentDensity - 0.5)
    }

    // Clamp to valid range
    efficiency = Math.max(0.85, Math.min(0.999, efficiency))

    // Look up catalyst-specific data if material provided
    if (system.catalystMaterial) {
      const materialData = await this.materialsDb.getElectrochemicalProperties(
        system.catalystMaterial
      )
      if (materialData && materialData.faradaicEfficiency) {
        efficiency = materialData.faradaicEfficiency
      }
    }

    return this.validateAndReturn({
      name: 'faradaicEfficiency',
      value: efficiency,
      unit: '',
      uncertainty: 0.015,
      source: 'electrochemistry-literature',
      isFallback: false,
    })
  }

  /**
   * Resolve band gap for photovoltaic calculations
   */
  async resolveBandGap(material: string): Promise<ResolvedParameter> {
    const materialData = await this.materialsDb.getMaterialProperties(material)

    if (materialData && materialData.bandGap !== undefined) {
      return this.validateAndReturn({
        name: 'bandGap',
        value: materialData.bandGap,
        unit: 'eV',
        uncertainty: 0.02,
        source: materialData.source,
        isFallback: materialData.isFallback,
      })
    }

    // Known band gaps for common PV materials
    const knownBandGaps: Record<string, number> = {
      'si': 1.12,
      'silicon': 1.12,
      'gaas': 1.42,
      'cdte': 1.45,
      'cigs': 1.15,
      'perovskite': 1.55, // MAPbI3
      'mapbi3': 1.55,
      'fapbi3': 1.48,
      'cspbi3': 1.73,
    }

    const key = material.toLowerCase().replace(/[^a-z0-9]/g, '')
    const bandGap = knownBandGaps[key]

    if (bandGap !== undefined) {
      return this.validateAndReturn({
        name: 'bandGap',
        value: bandGap,
        unit: 'eV',
        uncertainty: 0.03,
        source: 'embedded-material-data',
        isFallback: true,
      })
    }

    return {
      name: 'bandGap',
      value: 1.4, // Default for solar applications
      unit: 'eV',
      uncertainty: 0.2,
      source: 'default-fallback',
      isFallback: true,
      physicsValid: true,
    }
  }

  /**
   * Resolve capacity factor for renewable energy
   */
  async resolveCapacityFactor(
    technology: string,
    options?: {
      location?: { lat: number; lon: number }
      year?: number
    }
  ): Promise<ResolvedParameter> {
    const atbTech = this.mapToATBTechnology(technology)

    if (atbTech) {
      const result = await this.registry.getCapacityFactor(atbTech, options?.year)

      return this.validateAndReturn({
        name: 'capacityFactor',
        value: result.capacityFactor,
        unit: '',
        uncertainty: result.uncertainty,
        source: result.isFallback ? 'embedded-atb-fallback' : 'nrel-atb-2024',
        isFallback: result.isFallback,
      })
    }

    return {
      name: 'capacityFactor',
      value: 0.25,
      unit: '',
      uncertainty: 0.05,
      source: 'default-fallback',
      isFallback: true,
      physicsValid: true,
    }
  }

  /**
   * Resolve exergy improvement potential
   * This replaces the hardcoded 0.3 in analytical-provider.ts
   */
  async resolveExergyImprovementPotential(
    system: {
      technology: string
      currentEfficiency: number
      processType?: 'power-generation' | 'heating' | 'cooling' | 'chemical'
    }
  ): Promise<ResolvedParameter> {
    // Technology-specific improvement potentials from exergy analysis literature
    const improvementFactors: Record<string, number> = {
      'steam-turbine': 0.35, // 35% of losses recoverable
      'gas-turbine': 0.30,
      'combined-cycle': 0.25, // Already optimized
      'fuel-cell': 0.40, // Significant improvement potential
      'electrolyzer': 0.45,
      'heat-exchanger': 0.50, // Heat recovery potential
      'distillation': 0.35,
      'reactor': 0.25,
      'default': 0.30,
    }

    // Lookup improvement factor
    const techKey = system.technology.toLowerCase().replace(/[^a-z-]/g, '')
    let improvementFactor = 0.30

    for (const [key, value] of Object.entries(improvementFactors)) {
      if (techKey.includes(key)) {
        improvementFactor = value
        break
      }
    }

    // Adjust based on current efficiency
    // Systems already at high efficiency have less room for improvement
    if (system.currentEfficiency > 0.6) {
      improvementFactor *= 0.8
    } else if (system.currentEfficiency < 0.3) {
      improvementFactor *= 1.2
    }

    // Calculate actual improvement potential
    const lossesAvailable = 1 - system.currentEfficiency
    const improvementPotential = lossesAvailable * improvementFactor

    return this.validateAndReturn({
      name: 'exergyImprovementPotential',
      value: improvementPotential,
      unit: '',
      uncertainty: improvementPotential * 0.2, // 20% uncertainty
      source: 'exergy-analysis-literature',
      isFallback: false,
    })
  }

  /**
   * Batch resolve multiple parameters
   */
  async resolveParameters(
    requests: ParameterRequest[],
    context: {
      technology?: string
      simulationType?: SimulationType
      year?: number
    } = {}
  ): Promise<Map<string, ResolvedParameter>> {
    const results = new Map<string, ResolvedParameter>()

    for (const request of requests) {
      const tech = request.technology || context.technology || 'default'

      switch (request.name) {
        case 'efficiency':
          results.set(request.name, await this.resolveEfficiency(tech, { year: request.year }))
          break
        case 'faradaicEfficiency':
          results.set(request.name, await this.resolveFaradaicEfficiency({}))
          break
        case 'bandGap':
          results.set(request.name, await this.resolveBandGap(request.material || 'si'))
          break
        case 'capacityFactor':
          results.set(request.name, await this.resolveCapacityFactor(tech))
          break
        default:
          // Return a placeholder for unknown parameters
          results.set(request.name, {
            name: request.name,
            value: 0,
            unit: '',
            uncertainty: 0,
            source: 'not-resolved',
            isFallback: true,
            physicsValid: false,
            validationMessage: `Unknown parameter: ${request.name}`,
          })
      }
    }

    return results
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private mapToATBTechnology(technology: string): ATBTechnology | null {
    const normalized = technology.toLowerCase().replace(/[^a-z-]/g, '')
    return TECHNOLOGY_TO_ATB[normalized] || null
  }

  private validateAndReturn(param: Omit<ResolvedParameter, 'physicsValid' | 'validationMessage'>): ResolvedParameter {
    const limits = PHYSICS_LIMITS[param.name]

    if (limits) {
      const isValid = param.value >= limits.min && param.value <= limits.max

      return {
        ...param,
        physicsValid: isValid,
        validationMessage: isValid
          ? undefined
          : `Value ${param.value} outside physics limits [${limits.min}, ${limits.max}] ${limits.unit}`,
      }
    }

    return {
      ...param,
      physicsValid: true,
    }
  }
}

/**
 * Singleton instance
 */
let resolverInstance: ParameterResolver | null = null

export function getParameterResolver(): ParameterResolver {
  if (!resolverInstance) {
    resolverInstance = new ParameterResolver()
  }
  return resolverInstance
}

/**
 * Create a new resolver (for testing)
 */
export function createParameterResolver(
  registry?: DataSourceRegistry,
  materialsDb?: MaterialsDatabase
): ParameterResolver {
  return new ParameterResolver(registry, materialsDb)
}
