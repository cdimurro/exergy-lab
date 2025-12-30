/**
 * ATB (Annual Technology Baseline) Client
 *
 * Provides access to NREL's Annual Technology Baseline data.
 * The ATB provides cost and performance projections for electricity
 * generation technologies through 2050.
 *
 * Note: ATB data is primarily available as Excel/CSV downloads.
 * This client provides structured access to the key metrics.
 * Documentation: https://atb.nrel.gov/
 */

import {
  ATBRequest,
  ATBResponse,
  ATBDataPoint,
  ATBTechnology,
} from './types'

/**
 * ATB 2024 data (latest available)
 * Source: NREL Annual Technology Baseline 2024
 * These are baseline values for 2024, with projections available
 */
const ATB_2024_DATA: ATBDataPoint[] = [
  // Utility-Scale PV
  {
    technology: 'utility-scale-pv',
    year: 2024,
    scenario: 'moderate',
    capex: 1120, // $/kW
    fixedOm: 23, // $/kW-yr
    variableOm: 0,
    capacityFactor: 25.3,
    lcoe: 36.1, // $/MWh
    efficiency: 21.5,
  },
  {
    technology: 'utility-scale-pv',
    year: 2030,
    scenario: 'moderate',
    capex: 830,
    fixedOm: 17,
    variableOm: 0,
    capacityFactor: 27.1,
    lcoe: 24.8,
    efficiency: 23.5,
  },
  {
    technology: 'utility-scale-pv',
    year: 2050,
    scenario: 'moderate',
    capex: 530,
    fixedOm: 11,
    variableOm: 0,
    capacityFactor: 29.5,
    lcoe: 15.2,
    efficiency: 26.0,
  },

  // Land-Based Wind
  {
    technology: 'land-based-wind',
    year: 2024,
    scenario: 'moderate',
    capex: 1310,
    fixedOm: 43,
    variableOm: 0,
    capacityFactor: 34.6,
    lcoe: 32.9,
  },
  {
    technology: 'land-based-wind',
    year: 2030,
    scenario: 'moderate',
    capex: 1180,
    fixedOm: 39,
    variableOm: 0,
    capacityFactor: 38.2,
    lcoe: 26.4,
  },
  {
    technology: 'land-based-wind',
    year: 2050,
    scenario: 'moderate',
    capex: 970,
    fixedOm: 32,
    variableOm: 0,
    capacityFactor: 43.8,
    lcoe: 19.1,
  },

  // Offshore Wind
  {
    technology: 'offshore-wind',
    year: 2024,
    scenario: 'moderate',
    capex: 4160,
    fixedOm: 86,
    variableOm: 0,
    capacityFactor: 44.0,
    lcoe: 79.4,
  },
  {
    technology: 'offshore-wind',
    year: 2030,
    scenario: 'moderate',
    capex: 3120,
    fixedOm: 65,
    variableOm: 0,
    capacityFactor: 48.5,
    lcoe: 54.2,
  },
  {
    technology: 'offshore-wind',
    year: 2050,
    scenario: 'moderate',
    capex: 2180,
    fixedOm: 45,
    variableOm: 0,
    capacityFactor: 52.0,
    lcoe: 35.6,
  },

  // Battery Storage (4-hour duration)
  {
    technology: 'battery-storage',
    year: 2024,
    scenario: 'moderate',
    capex: 1260, // $/kW (power) - ~315 $/kWh energy
    fixedOm: 25,
    variableOm: 0,
    capacityFactor: 15.0, // Depends on use case
    lcoe: 142.3, // Levelized cost of storage
    efficiency: 85.0, // Round-trip efficiency
  },
  {
    technology: 'battery-storage',
    year: 2030,
    scenario: 'moderate',
    capex: 680,
    fixedOm: 14,
    variableOm: 0,
    capacityFactor: 15.0,
    lcoe: 76.5,
    efficiency: 88.0,
  },
  {
    technology: 'battery-storage',
    year: 2050,
    scenario: 'moderate',
    capex: 380,
    fixedOm: 8,
    variableOm: 0,
    capacityFactor: 15.0,
    lcoe: 42.8,
    efficiency: 92.0,
  },

  // Geothermal
  {
    technology: 'geothermal',
    year: 2024,
    scenario: 'moderate',
    capex: 4680,
    fixedOm: 110,
    variableOm: 0,
    capacityFactor: 90.0,
    lcoe: 58.7,
  },
  {
    technology: 'geothermal',
    year: 2030,
    scenario: 'moderate',
    capex: 4200,
    fixedOm: 99,
    variableOm: 0,
    capacityFactor: 90.0,
    lcoe: 52.8,
  },

  // Hydropower
  {
    technology: 'hydropower',
    year: 2024,
    scenario: 'moderate',
    capex: 2680,
    fixedOm: 43,
    variableOm: 0,
    capacityFactor: 44.0,
    lcoe: 61.8,
  },

  // Nuclear
  {
    technology: 'nuclear',
    year: 2024,
    scenario: 'moderate',
    capex: 6695,
    fixedOm: 121,
    variableOm: 2.3,
    capacityFactor: 90.0,
    lcoe: 88.6,
    heatRate: 10459,
  },

  // Natural Gas Combined Cycle
  {
    technology: 'natural-gas',
    year: 2024,
    scenario: 'moderate',
    capex: 970,
    fixedOm: 11,
    variableOm: 2.0,
    capacityFactor: 55.0,
    lcoe: 48.2, // Assumes $3.50/MMBtu gas
    heatRate: 6370,
    efficiency: 53.5,
  },
]

/**
 * Advanced scenario multipliers (relative to moderate)
 */
const SCENARIO_MULTIPLIERS = {
  conservative: {
    capex: 1.15,
    om: 1.10,
    capacityFactor: 0.95,
  },
  advanced: {
    capex: 0.85,
    om: 0.90,
    capacityFactor: 1.05,
  },
}

export interface ATBClientConfig {
  apiKey?: string // Not required for ATB (uses embedded data)
  timeout?: number
}

export class ATBClient {
  private data: ATBDataPoint[]
  private timeout: number

  constructor(config: ATBClientConfig = {}) {
    this.data = ATB_2024_DATA
    this.timeout = config.timeout || 10000
  }

  /**
   * Get ATB data for specified parameters
   */
  async getData(request: ATBRequest = {}): Promise<ATBResponse> {
    let filteredData = [...this.data]

    // Filter by technology
    if (request.technology) {
      filteredData = filteredData.filter(d => d.technology === request.technology)
    }

    // Filter by year
    if (request.year) {
      filteredData = filteredData.filter(d => d.year === request.year)
    }

    // Apply scenario adjustments
    if (request.scenario && request.scenario !== 'moderate') {
      const multipliers = SCENARIO_MULTIPLIERS[request.scenario]
      filteredData = filteredData.map(d => ({
        ...d,
        scenario: request.scenario!,
        capex: Math.round(d.capex * multipliers.capex),
        fixedOm: Math.round(d.fixedOm * multipliers.om),
        capacityFactor: +(d.capacityFactor * multipliers.capacityFactor).toFixed(1),
        // Recalculate LCOE (simplified)
        lcoe: this.calculateLCOE({
          ...d,
          capex: d.capex * multipliers.capex,
          fixedOm: d.fixedOm * multipliers.om,
          capacityFactor: d.capacityFactor * multipliers.capacityFactor,
        }),
      }))
    }

    return {
      data: filteredData,
      metadata: {
        atbYear: 2024,
        lastUpdated: '2024-07-01',
        version: '2024.1',
      },
    }
  }

  /**
   * Get technology cost trajectory (multiple years)
   */
  async getCostTrajectory(
    technology: ATBTechnology,
    scenario: 'conservative' | 'moderate' | 'advanced' = 'moderate'
  ): Promise<{
    technology: ATBTechnology
    scenario: string
    trajectory: Array<{
      year: number
      capex: number
      lcoe: number
      capacityFactor: number
    }>
  }> {
    const result = await this.getData({ technology, scenario })

    return {
      technology,
      scenario,
      trajectory: result.data.map(d => ({
        year: d.year,
        capex: d.capex,
        lcoe: d.lcoe,
        capacityFactor: d.capacityFactor,
      })),
    }
  }

  /**
   * Compare technologies side-by-side
   */
  async compareTechnologies(
    technologies: ATBTechnology[],
    year: number = 2024,
    scenario: 'conservative' | 'moderate' | 'advanced' = 'moderate'
  ): Promise<{
    year: number
    scenario: string
    comparison: Array<{
      technology: ATBTechnology
      capex: number
      lcoe: number
      capacityFactor: number
      fixedOm: number
    }>
  }> {
    const comparison = await Promise.all(
      technologies.map(async tech => {
        const result = await this.getData({ technology: tech, year, scenario })
        const data = result.data[0]
        return {
          technology: tech,
          capex: data?.capex || 0,
          lcoe: data?.lcoe || 0,
          capacityFactor: data?.capacityFactor || 0,
          fixedOm: data?.fixedOm || 0,
        }
      })
    )

    return {
      year,
      scenario,
      comparison: comparison.filter(c => c.capex > 0),
    }
  }

  /**
   * Get LCOE breakdown for a technology
   */
  async getLCOEBreakdown(
    technology: ATBTechnology,
    year: number = 2024,
    discountRate: number = 0.07
  ): Promise<{
    technology: ATBTechnology
    year: number
    lcoe: number
    breakdown: {
      capital: number
      fixedOm: number
      variableOm: number
      fuel: number
    }
    assumptions: {
      economicLife: number
      discountRate: number
      capacityFactor: number
    }
  }> {
    const result = await this.getData({ technology, year })
    const data = result.data[0]

    if (!data) {
      throw new Error(`No ATB data for ${technology} in ${year}`)
    }

    const economicLife = this.getEconomicLife(technology)
    const crf = this.calculateCRF(discountRate, economicLife)

    const capitalComponent = (data.capex * crf * 1000) / (data.capacityFactor / 100 * 8760)
    const fixedOmComponent = (data.fixedOm * 1000) / (data.capacityFactor / 100 * 8760)
    const variableOmComponent = data.variableOm || 0
    const fuelComponent = this.estimateFuelCost(technology, data.heatRate)

    return {
      technology,
      year,
      lcoe: data.lcoe,
      breakdown: {
        capital: +capitalComponent.toFixed(1),
        fixedOm: +fixedOmComponent.toFixed(1),
        variableOm: +variableOmComponent.toFixed(1),
        fuel: +fuelComponent.toFixed(1),
      },
      assumptions: {
        economicLife,
        discountRate,
        capacityFactor: data.capacityFactor,
      },
    }
  }

  /**
   * Get available technologies
   */
  getAvailableTechnologies(): ATBTechnology[] {
    return [...new Set(this.data.map(d => d.technology))]
  }

  /**
   * Get available years for a technology
   */
  getAvailableYears(technology: ATBTechnology): number[] {
    return this.data
      .filter(d => d.technology === technology)
      .map(d => d.year)
      .sort((a, b) => a - b)
  }

  /**
   * Calculate simplified LCOE
   */
  private calculateLCOE(data: ATBDataPoint): number {
    const economicLife = this.getEconomicLife(data.technology)
    const discountRate = 0.07 // Default real discount rate
    const crf = this.calculateCRF(discountRate, economicLife)

    const annualizedCapex = data.capex * crf
    const annualGeneration = (data.capacityFactor / 100) * 8760 // kWh/kW

    const lcoe = (annualizedCapex + data.fixedOm) / annualGeneration * 1000 + (data.variableOm || 0)

    return +lcoe.toFixed(1)
  }

  /**
   * Calculate Capital Recovery Factor
   */
  private calculateCRF(discountRate: number, years: number): number {
    const i = discountRate
    const n = years
    return (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1)
  }

  /**
   * Get economic life by technology type
   */
  private getEconomicLife(technology: ATBTechnology): number {
    const lifetimes: Record<ATBTechnology, number> = {
      'utility-scale-pv': 30,
      'commercial-pv': 30,
      'residential-pv': 25,
      'land-based-wind': 25,
      'offshore-wind': 25,
      'battery-storage': 15,
      'pumped-hydro': 50,
      'geothermal': 30,
      'biopower': 30,
      'hydropower': 50,
      'csp': 30,
      'nuclear': 40,
      'natural-gas': 30,
      'coal': 40,
    }
    return lifetimes[technology] || 25
  }

  /**
   * Estimate fuel cost component
   */
  private estimateFuelCost(technology: ATBTechnology, heatRate?: number): number {
    if (!heatRate) return 0

    // Assumed fuel prices ($/MMBtu)
    const fuelPrices: Partial<Record<ATBTechnology, number>> = {
      'natural-gas': 3.50,
      'coal': 2.00,
      'nuclear': 0.75, // Uranium
    }

    const price = fuelPrices[technology]
    if (!price) return 0

    // Convert: (BTU/kWh) * ($/MMBtu) / (1000 BTU/MMBtu) * 1000 = $/MWh
    return (heatRate * price) / 1000
  }
}

/**
 * Create ATB client
 */
export function createATBClient(config?: ATBClientConfig): ATBClient {
  return new ATBClient(config)
}
