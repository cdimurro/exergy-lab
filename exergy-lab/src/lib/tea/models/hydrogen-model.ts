/**
 * Hydrogen Production Technology Model
 *
 * TEA model for hydrogen production via:
 * - Water electrolysis (alkaline, PEM, SOEC)
 * - Steam methane reforming (SMR)
 * - Other production pathways
 *
 * Based on IEA Hydrogen Reports and DOE H2@Scale program
 */

import type { TEAInput_v2 } from '@/types/tea'

export interface HydrogenProductionSpecs {
  // Production technology
  technology: {
    type: 'alkaline-electrolysis' | 'pem-electrolysis' | 'soec' | 'smr' | 'atr' | 'biomass-gasification'
    capacity: number // kg H2/day
    efficiency: number // %HHV (Higher Heating Value basis)
    stackLifetime: number // hours (for electrolyzers)
    systemLifetime: number // years
  }

  // Performance
  performance: {
    electricityConsumption: number // kWh/kg H2
    waterConsumption?: number // L/kg H2 (for electrolysis)
    naturalGasConsumption?: number // m³/kg H2 (for SMR)
    loadFlexibility: number // % (ability to ramp up/down)
    minimumLoad: number // % of rated capacity
    startupTime: number // minutes
  }

  // Cost breakdown
  costs: {
    electrolyzerStack: number // $/kW (for electrolysis)
    balanceOfPlant: number // $/kW
    installation: number // $/kW
    waterCost?: number // $/m³
    electricityCost?: number // $/MWh
    naturalGasCost?: number // $/MMBtu (for SMR)
    omCostsPercent: number // % of CAPEX per year
  }

  // Carbon intensity
  carbon: {
    gridIntensity?: number // gCO2e/kWh (for electrolysis with grid power)
    ngIntensity?: number // kgCO2e/kg H2 (for SMR)
    renewableFraction?: number // % of electricity from renewables
  }
}

export class HydrogenModel {
  private specs: HydrogenProductionSpecs

  constructor(specs: Partial<HydrogenProductionSpecs>) {
    this.specs = this.mergeWithDefaults(specs)
  }

  private mergeWithDefaults(partial: Partial<HydrogenProductionSpecs>): HydrogenProductionSpecs {
    return {
      technology: {
        type: 'pem-electrolysis',
        capacity: 1000, // kg/day
        efficiency: 65, // %HHV
        stackLifetime: 80000, // hours
        systemLifetime: 20,
        ...partial.technology,
      },
      performance: {
        electricityConsumption: 55, // kWh/kg H2 for PEM
        waterConsumption: 9, // L/kg H2
        loadFlexibility: 100, // Full flexibility for electrolysis
        minimumLoad: 10,
        startupTime: 5,
        ...partial.performance,
      },
      costs: {
        electrolyzerStack: 900, // $/kW
        balanceOfPlant: 600, // $/kW
        installation: 400, // $/kW
        electricityCost: 50, // $/MWh
        waterCost: 2, // $/m³
        omCostsPercent: 2.5,
        ...partial.costs,
      },
      carbon: {
        gridIntensity: 500, // gCO2e/kWh (grid average)
        renewableFraction: 0, // 0% renewable by default
        ...partial.carbon,
      },
    }
  }

  /**
   * Calculate annual hydrogen production
   */
  calculateAnnualProduction(capacityFactor: number = 90): {
    hydrogen: number // kg/year
    energy: number // kWh/year (electricity consumed)
    water: number // m³/year
  } {
    const { technology, performance } = this.specs

    const annualHydrogen = technology.capacity * 365 * (capacityFactor / 100)
    const annualEnergy = annualHydrogen * performance.electricityConsumption
    const annualWater = performance.waterConsumption
      ? annualHydrogen * performance.waterConsumption / 1000
      : 0

    return {
      hydrogen: annualHydrogen,
      energy: annualEnergy,
      water: annualWater,
    }
  }

  /**
   * Calculate CAPEX
   */
  calculateCAPEX(): {
    stack: number
    bop: number
    installation: number
    total: number
    perKgPerDay: number
  } {
    const { technology, performance, costs } = this.specs

    // System power rating (kW)
    const systemPower = (technology.capacity / 24) * performance.electricityConsumption

    const stack = systemPower * costs.electrolyzerStack
    const bop = systemPower * costs.balanceOfPlant
    const installation = systemPower * costs.installation

    const total = stack + bop + installation
    const perKgPerDay = total / technology.capacity

    return {
      stack,
      bop,
      installation,
      total,
      perKgPerDay,
    }
  }

  /**
   * Calculate hydrogen LCOE (Levelized Cost of Hydrogen)
   */
  calculateLCOH(params: {
    capacityFactor: number // percentage
    discountRate: number
  }): {
    lcoh: number // $/kg H2
    components: {
      capital: number
      electricity: number
      water: number
      om: number
      total: number
    }
  } {
    const capex = this.calculateCAPEX()
    const production = this.calculateAnnualProduction(params.capacityFactor)
    const lifetime = this.specs.technology.systemLifetime

    // NPV of costs
    let npvCosts = capex.total

    for (let year = 1; year <= lifetime; year++) {
      const opex = capex.total * (this.specs.costs.omCostsPercent / 100)
      const electricity = production.energy * (this.specs.costs.electricityCost || 0) / 1000
      const water = production.water * (this.specs.costs.waterCost || 0)

      npvCosts += (opex + electricity + water) / Math.pow(1 + params.discountRate / 100, year)

      // Stack replacement
      if (year === Math.floor(this.specs.technology.stackLifetime / 8760)) {
        npvCosts += capex.stack / Math.pow(1 + params.discountRate / 100, year)
      }
    }

    // NPV of production
    let npvProduction = 0
    for (let year = 1; year <= lifetime; year++) {
      npvProduction += production.hydrogen / Math.pow(1 + params.discountRate / 100, year)
    }

    const lcoh = npvCosts / npvProduction

    return {
      lcoh,
      components: {
        capital: capex.total / npvProduction,
        electricity: (production.energy * (this.specs.costs.electricityCost || 0) / 1000 * lifetime) / npvProduction,
        water: (production.water * (this.specs.costs.waterCost || 0) * lifetime) / npvProduction,
        om: (capex.total * (this.specs.costs.omCostsPercent / 100) * lifetime) / npvProduction,
        total: lcoh,
      },
    }
  }

  /**
   * Convert to TEAInput_v2
   */
  toTEAInput(projectName: string, capacityFactor: number = 90): TEAInput_v2 {
    const capex = this.calculateCAPEX()
    const production = this.calculateAnnualProduction(capacityFactor)

    // Convert hydrogen to energy equivalent for standard TEA
    const h2EnergyContent = 33.3 // kWh/kg H2 (LHV)
    const energyEquivalent = production.hydrogen * h2EnergyContent

    return {
      project_name: projectName,
      technology_type: 'hydrogen',
      capacity_mw: (production.energy / 8760) / 1000,
      capacity_factor: capacityFactor,
      annual_production_mwh: energyEquivalent / 1000,
      capex_per_kw: capex.perKgPerDay * 1000,
      installation_factor: 1.0,
      land_cost: 100000,
      grid_connection_cost: 200000,
      opex_per_kw_year: capex.total * (this.specs.costs.omCostsPercent / 100) / ((production.energy / 8760) / 1000),
      fixed_opex_annual: capex.total * (this.specs.costs.omCostsPercent / 100),
      variable_opex_per_mwh: (this.specs.costs.electricityCost || 50),
      insurance_rate: 0.5,
      project_lifetime_years: this.specs.technology.systemLifetime,
      discount_rate: 8,
      debt_ratio: 0.6,
      interest_rate: 6,
      tax_rate: 25,
      depreciation_years: 10,
      electricity_price_per_mwh: 100, // H2 value in electricity equivalent
      price_escalation_rate: 2,
      carbon_credit_per_ton: 0,
      carbon_intensity_avoided: 0,
    }
  }
}

export function createHydrogenModel(specs: Partial<HydrogenProductionSpecs>): HydrogenModel {
  return new HydrogenModel(specs)
}
