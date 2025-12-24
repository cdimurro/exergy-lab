/**
 * Solar PV Technology Model
 *
 * Technology-specific TEA model for photovoltaic systems
 * Based on the Perovskite PV reference report and industry standards
 *
 * Includes:
 * - Module specifications (PCE, degradation, temperature coefficients)
 * - System sizing (modules, inverters, BOS)
 * - Performance modeling (irradiance, temperature effects, shading)
 * - Cost breakdowns (modules, inverters, BOS, installation)
 * - LCOE calculations specific to solar PV
 *
 * Reference: Perovskite PV Manufacturing TEA report (Ethiopia)
 */

import type { TEAInput_v2 } from '@/types/tea'
import type { TechnologyPerformance } from '@/types/tea-process'

export interface SolarPVSpecs {
  // Module specifications
  module: {
    pce: number // Power Conversion Efficiency (%)
    technology: 'silicon' | 'perovskite' | 'tandem' | 'thin-film' | 'cdte' | 'cigs'
    moduleArea: number // m² per module
    modulePower: number // W per module
    degradationRate: number // %/year
    temperatureCoefficient: number // %/°C
    moduleLifetime: number // years
  }

  // System configuration
  system: {
    dcCapacity: number // kWp (kilowatt-peak)
    acCapacity: number // kW (after inverter)
    dcToAcRatio: number // Typically 1.1-1.3
    numberOfModules: number
    inverterEfficiency: number // percentage
    inverterLifetime: number // years (typically 10-15)
  }

  // Performance factors
  performance: {
    annualIrradiance: number // kWh/m²/year
    performanceRatio: number // Actual/theoretical output (typically 75-85%)
    shadingLoss: number // percentage
    soilingLoss: number // percentage
    mismatchLoss: number // percentage
    wiringLoss: number // percentage
    availabilityFactor: number // percentage
  }

  // Cost breakdown ($/Wp or $/m²)
  costs: {
    moduleCost: number // $/Wp or $/m²
    inverterCost: number // $/kW
    bosCost: number // Balance of System $/Wp
    installationLabor: number // $/Wp
    landCost?: number // $/m² of land
    gridConnectionCost?: number // $ total
  }
}

/**
 * Solar PV Model Class
 */
export class SolarPVModel {
  private specs: SolarPVSpecs

  constructor(specs: Partial<SolarPVSpecs>) {
    this.specs = this.mergeWithDefaults(specs)
  }

  /**
   * Merge user specs with defaults
   */
  private mergeWithDefaults(partial: Partial<SolarPVSpecs>): SolarPVSpecs {
    return {
      module: {
        pce: 24, // 24% efficiency (perovskite/silicon tandem)
        technology: 'tandem',
        moduleArea: 1.4, // m² (1m x 1.4m standard)
        modulePower: 240, // W
        degradationRate: 0.5, // 0.5%/year typical for silicon
        temperatureCoefficient: -0.35, // -0.35%/°C typical
        moduleLifetime: 25,
        ...partial.module,
      },
      system: {
        dcCapacity: 1000, // 1 MWp default
        acCapacity: 900, // After inverter losses
        dcToAcRatio: 1.2,
        numberOfModules: 4167, // 1000 kWp / 240 W
        inverterEfficiency: 98,
        inverterLifetime: 15,
        ...partial.system,
      },
      performance: {
        annualIrradiance: 1800, // kWh/m²/year (good site)
        performanceRatio: 0.80, // 80% PR typical
        shadingLoss: 2,
        soilingLoss: 3,
        mismatchLoss: 1,
        wiringLoss: 2,
        availabilityFactor: 98,
        ...partial.performance,
      },
      costs: {
        moduleCost: 0.30, // $/Wp (2024)
        inverterCost: 100, // $/kW
        bosCost: 0.25, // $/Wp
        installationLabor: 0.15, // $/Wp
        ...partial.costs,
      },
    }
  }

  /**
   * Calculate annual energy production
   */
  calculateAnnualProduction(): {
    energy: number // kWh/year
    capacityFactor: number // percentage
    energyYield: number // kWh/kWp
  } {
    const { module, system, performance } = this.specs

    // Basic calculation: Irradiance × Area × PCE × PR
    const theoreticalEnergy =
      performance.annualIrradiance *
      system.numberOfModules *
      module.moduleArea *
      (module.pce / 100)

    // Apply losses
    const systemLosses =
      (100 - performance.shadingLoss) *
      (100 - performance.soilingLoss) *
      (100 - performance.mismatchLoss) *
      (100 - performance.wiringLoss) *
      (performance.availabilityFactor / 100)

    const actualEnergy = theoreticalEnergy * (systemLosses / 10000) * (performance.performanceRatio)

    const capacityFactor = (actualEnergy / (system.dcCapacity * 8760)) * 100
    const energyYield = actualEnergy / system.dcCapacity

    return {
      energy: actualEnergy,
      capacityFactor,
      energyYield,
    }
  }

  /**
   * Calculate CAPEX breakdown
   */
  calculateCAPEX(): {
    modules: number
    inverters: number
    bos: number
    installation: number
    total: number
    perWp: number
  } {
    const { system, costs } = this.specs

    const modules = system.dcCapacity * 1000 * costs.moduleCost
    const inverters = system.acCapacity * costs.inverterCost
    const bos = system.dcCapacity * 1000 * costs.bosCost
    const installation = system.dcCapacity * 1000 * costs.installationLabor

    const total = modules + inverters + bos + installation
    const perWp = total / (system.dcCapacity * 1000)

    return {
      modules,
      inverters,
      bos,
      installation,
      total,
      perWp,
    }
  }

  /**
   * Calculate LCOE specific to solar PV
   */
  calculateSolarLCOE(params: {
    discountRate: number // percentage
    lifetime: number // years
    opexPerKWYear: number // $/kW-year
  }): {
    lcoe: number // $/kWh
    lcoeComponents: {
      capital: number
      opex: number
      total: number
    }
  } {
    const capex = this.calculateCAPEX()
    const production = this.calculateAnnualProduction()
    const degradation = this.specs.module.degradationRate / 100

    // Calculate NPV of costs
    let npvCosts = capex.total // Year 0

    for (let year = 1; year <= params.lifetime; year++) {
      const yearOpex = this.specs.system.dcCapacity * params.opexPerKWYear * 1000
      npvCosts += yearOpex / Math.pow(1 + params.discountRate / 100, year)

      // Inverter replacement (typically year 15)
      if (year === 15) {
        npvCosts += capex.inverters / Math.pow(1 + params.discountRate / 100, year)
      }
    }

    // Calculate NPV of production (with degradation)
    let npvProduction = 0
    for (let year = 1; year <= params.lifetime; year++) {
      const yearProduction = production.energy * Math.pow(1 - degradation, year - 1)
      npvProduction += yearProduction / Math.pow(1 + params.discountRate / 100, year)
    }

    const lcoe = npvCosts / npvProduction

    return {
      lcoe,
      lcoeComponents: {
        capital: (capex.total / npvProduction),
        opex: ((npvCosts - capex.total) / npvProduction),
        total: lcoe,
      },
    }
  }

  /**
   * Convert to TEAInput_v2 format
   */
  toTEAInput(projectName: string): TEAInput_v2 {
    const capex = this.calculateCAPEX()
    const production = this.calculateAnnualProduction()

    return {
      project_name: projectName,
      technology_type: 'solar',
      capacity_mw: this.specs.system.dcCapacity / 1000,
      capacity_factor: production.capacityFactor,
      annual_production_mwh: production.energy / 1000,
      capex_per_kw: capex.perWp * 1000,
      installation_factor: 1.4, // Already included in perWp
      land_cost: this.specs.costs.landCost ? this.specs.costs.landCost * 10000 : 50000,
      grid_connection_cost: this.specs.costs.gridConnectionCost || 100000,
      opex_per_kw_year: 15, // $/kW-year typical for solar
      fixed_opex_annual: this.specs.system.dcCapacity * 15 * 1000,
      variable_opex_per_mwh: 0,
      insurance_rate: 0.5,
      project_lifetime_years: this.specs.module.moduleLifetime,
      discount_rate: 8,
      debt_ratio: 0.7,
      interest_rate: 5,
      tax_rate: 25,
      depreciation_years: 10,
      electricity_price_per_mwh: 80,
      price_escalation_rate: 2,
      carbon_credit_per_ton: 0,
      carbon_intensity_avoided: 0,
      performanceData: {
        technology: 'Solar PV',
        efficiency: {
          primary: this.specs.module.pce,
          auxiliary: this.specs.system.inverterEfficiency,
          overall: this.specs.module.pce * (this.specs.system.inverterEfficiency / 100),
        },
        capacityFactor: {
          design: production.capacityFactor,
          actual: production.capacityFactor * 0.95, // Account for real-world factors
          availability: this.specs.performance.availabilityFactor,
        },
        degradation: {
          annual: this.specs.module.degradationRate,
          mechanism: 'UV exposure, thermal cycling, moisture ingress',
        },
        performanceRatio: this.specs.performance.performanceRatio,
      },
    }
  }
}

/**
 * Convenience function to create solar PV model
 */
export function createSolarPVModel(specs: Partial<SolarPVSpecs>): SolarPVModel {
  return new SolarPVModel(specs)
}

/**
 * Get solar PV technology defaults
 */
export function getSolarPVDefaults(technology: SolarPVSpecs['module']['technology']): Partial<SolarPVSpecs> {
  const defaults: Record<string, Partial<SolarPVSpecs>> = {
    silicon: {
      module: {
        pce: 22,
        technology: 'silicon',
        moduleArea: 2.0, // m² per module (standard 72-cell)
        modulePower: 400, // W per module
        degradationRate: 0.5,
        temperatureCoefficient: -0.40,
        moduleLifetime: 25,
      },
      costs: {
        moduleCost: 0.25,
        inverterCost: 80,
        bosCost: 0.20,
        installationLabor: 0.12,
      },
    },
    perovskite: {
      module: {
        pce: 20,
        technology: 'perovskite',
        moduleArea: 2.0, // m² per module
        modulePower: 360, // W per module (lower due to lower PCE)
        degradationRate: 3.0, // Higher degradation currently
        temperatureCoefficient: -0.30,
        moduleLifetime: 15, // Shorter lifetime currently
      },
      costs: {
        moduleCost: 0.19, // Lower cost per Wp
        inverterCost: 80,
        bosCost: 0.20,
        installationLabor: 0.10,
      },
    },
    tandem: {
      module: {
        pce: 24,
        technology: 'tandem',
        moduleArea: 2.0, // m² per module
        modulePower: 480, // W per module (higher due to higher PCE)
        degradationRate: 1.0,
        temperatureCoefficient: -0.32,
        moduleLifetime: 25,
      },
      costs: {
        moduleCost: 0.38, // Higher cost but higher efficiency
        inverterCost: 80,
        bosCost: 0.20,
        installationLabor: 0.15,
      },
    },
  }

  return defaults[technology] || defaults.silicon
}
