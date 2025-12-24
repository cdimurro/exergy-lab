/**
 * HEFA/SAF Production Technology Model
 *
 * TEA model for Sustainable Aviation Fuel via HEFA process:
 * - Feedstock processing (oils, fats, residues)
 * - Hydroprocessing (hydrotreating, hydrocracking)
 * - Fractionation (SAF, diesel, naphtha, LPG)
 * - Product yields and allocations
 *
 * Based on RSB SAF TEA Tool and ICAO CORSIA standards
 */

import type { TEAInput_v2 } from '@/types/tea'
import type { FeedstockSpecification, EconomicAllocation } from '@/types/tea-process'

export interface HEFASAFSpecs {
  // Plant capacity
  capacity: {
    feedstockInput: number // tonnes/year
    safOutput: number // m³/year (target: 1 million)
    distillateOutput: number // m³/year (total liquid fuels)
  }

  // Feedstock
  feedstock: {
    type: 'pfad' | 'ucopalm-efb' | 'waste-oils' | 'animal-fats'
    cost: number // $/tonne
    carbonIntensity: number // gCO2e/MJ
    lhv: number // MJ/kg
  }

  // Process yields
  yields: {
    saf: number // m³ SAF / tonne feedstock
    diesel: number // m³ diesel / tonne feedstock
    naphtha: number // m³ naphtha / tonne feedstock
    lpg: number // tonnes LPG / tonne feedstock
  }

  // Process specifications
  process: {
    hydrogenConsumption: number // kg H2 / tonne feedstock
    electricityConsumption: number // kWh / tonne feedstock
    naturalGasConsumption: number // GJ / tonne feedstock
    waterConsumption: number // m³ / tonne feedstock
  }

  // Costs
  costs: {
    fciTotal: number // Fixed Capital Investment (million USD)
    hydrogenPrice: number // $/kg
    electricityPrice: number // $/MWh
    naturalGasPrice: number // $/GJ
    laborAndMaintenance: number // % of FCI per year
  }

  // Product prices (for allocation)
  productPrices: {
    fossilKerosene: number // $/m³ (benchmark)
    safReference: number // $/m³ (market/reference)
    diesel: number // $/m³
    naphtha: number // $/m³
    lpg: number // $/tonne
  }
}

export class HEFASAFModel {
  private specs: HEFASAFSpecs

  constructor(specs: Partial<HEFASAFSpecs>) {
    this.specs = this.mergeWithDefaults(specs)
  }

  private mergeWithDefaults(partial: Partial<HEFASAFSpecs>): HEFASAFSpecs {
    return {
      capacity: {
        feedstockInput: 830000, // tonnes/year (for 1M m³ SAF)
        safOutput: 1000000, // m³/year
        distillateOutput: 1050000, // m³/year (includes diesel, naphtha)
        ...partial.capacity,
      },
      feedstock: {
        type: 'pfad',
        cost: 730, // $/tonne (PFAD 2024)
        carbonIntensity: 20.7, // gCO2e/MJ (CORSIA value)
        lhv: 37, // MJ/kg
        ...partial.feedstock,
      },
      yields: {
        saf: 0.49, // m³/tonne (from reference)
        diesel: 0.23, // m³/tonne
        naphtha: 0.07, // m³/tonne
        lpg: 0.10, // tonnes/tonne
        ...partial.yields,
      },
      process: {
        hydrogenConsumption: 40, // kg/tonne
        electricityConsumption: 45, // kWh/tonne
        naturalGasConsumption: 6.0, // GJ/tonne
        waterConsumption: 0.5, // m³/tonne
        ...partial.process,
      },
      costs: {
        fciTotal: 829, // million USD (from reference)
        hydrogenPrice: 2.38, // $/kg (SMR hydrogen)
        electricityPrice: 123, // $/MWh (Malaysia)
        naturalGasPrice: 8.67, // $/GJ
        laborAndMaintenance: 1.0, // 1% of FCI
        ...partial.costs,
      },
      productPrices: {
        fossilKerosene: 290, // $/m³ (IEA 2020)
        safReference: 1764, // $/m³ (IATA 2022)
        diesel: 835, // $/m³
        naphtha: 627, // $/m³
        lpg: 404, // $/tonne
        ...partial.productPrices,
      },
    }
  }

  /**
   * Calculate MSP (Minimum Selling Price) for SAF
   */
  calculateMSP(params: { discountRate: number; lifetime: number }): {
    msp: number // $/m³ SAF
    comparisonToFossil: number // percentage premium
    mitigationCost: number // $/tCO2e
  } {
    const { capacity, feedstock, yields, process, costs, productPrices } = this.specs

    // Annual costs
    const feedstockCost = capacity.feedstockInput * feedstock.cost
    const hydrogenCost = capacity.feedstockInput * process.hydrogenConsumption * costs.hydrogenPrice
    const electricityCost = (capacity.feedstockInput * process.electricityConsumption * costs.electricityPrice) / 1000
    const ngCost = capacity.feedstockInput * process.naturalGasConsumption * costs.naturalGasPrice
    const omCost = costs.fciTotal * 1e6 * (costs.laborAndMaintenance / 100)

    const totalAnnualCost = feedstockCost + hydrogenCost + electricityCost + ngCost + omCost

    // NPV of costs
    let npvCosts = costs.fciTotal * 1e6 // Million to USD

    for (let year = 1; year <= params.lifetime; year++) {
      npvCosts += totalAnnualCost / Math.pow(1 + params.discountRate / 100, year)
    }

    // NPV of production
    let npvSAFProduction = 0
    for (let year = 1; year <= params.lifetime; year++) {
      npvSAFProduction += capacity.safOutput / Math.pow(1 + params.discountRate / 100, year)
    }

    // Allocate costs to SAF (economic allocation)
    const allocation = this.calculateEconomicAllocation()
    const safAllocationFraction = allocation.find(a => a.product === 'SAF')?.allocation.economic || 100

    // MSP for SAF
    const msp = (npvCosts * (safAllocationFraction / 100)) / npvSAFProduction

    // Comparison to fossil
    const premium = ((msp - productPrices.fossilKerosene) / productPrices.fossilKerosene) * 100

    // Mitigation cost
    const fossilCI = 89.0 // gCO2e/MJ (CORSIA)
    const safCI = feedstock.carbonIntensity
    const emissionReduction = (fossilCI - safCI) / 1000 * feedstock.lhv // kgCO2e/kg
    const mitigationCost = (msp - productPrices.fossilKerosene) / (emissionReduction * 0.735) // 0.735 kg/L SAF density

    return {
      msp,
      comparisonToFossil: premium,
      mitigationCost,
    }
  }

  /**
   * Calculate economic allocation to co-products
   */
  calculateEconomicAllocation(): EconomicAllocation[] {
    const { capacity, yields, productPrices } = this.specs

    const products = [
      {
        product: 'SAF',
        production: capacity.safOutput,
        price: productPrices.safReference,
        unit: 'm³',
      },
      {
        product: 'Diesel',
        production: capacity.feedstockInput * yields.diesel,
        price: productPrices.diesel,
        unit: 'm³',
      },
      {
        product: 'Naphtha',
        production: capacity.feedstockInput * yields.naphtha,
        price: productPrices.naphtha,
        unit: 'm³',
      },
      {
        product: 'LPG',
        production: capacity.feedstockInput * yields.lpg,
        price: productPrices.lpg,
        unit: 'tonne',
      },
    ]

    const totalValue = products.reduce((sum, p) => sum + p.production * p.price, 0)

    return products.map(p => ({
      product: p.product,
      annualProduction: { value: p.production, unit: p.unit },
      marketPrice: { value: p.price, unit: `$/${p.unit}`, source: '2024 market data' },
      allocation: {
        mass: 0, // Not used for economic allocation
        energy: 0,
        economic: (p.production * p.price / totalValue) * 100,
        exergy: 0,
      },
      allocatedCosts: {
        capex: 0, // Calculated separately
        opex: 0,
        total: 0,
      },
    }))
  }

  /**
   * Calculate total CAPEX
   */
  calculateCAPEX(): { total: number } {
    return { total: this.specs.costs.fciTotal * 1e6 } // Convert million USD to USD
  }

  /**
   * Convert to TEAInput_v2
   */
  toTEAInput(projectName: string, capacityFactor: number = 85): TEAInput_v2 {
    const capex = this.calculateCAPEX()
    const production = this.calculateAnnualProduction(capacityFactor)
    const omPercentOfCapex = 5 // Default 5% O&M cost
    const systemLifetime = 25 // Default 25 year lifetime

    return {
      project_name: projectName,
      technology_type: 'biomass', // Closest match
      capacity_mw: (production.energy / 8760) / 1000,
      capacity_factor: capacityFactor,
      annual_production_mwh: production.energy / 1000,
      capex_per_kw: capex.total / ((production.energy / 8760) / 1000),
      installation_factor: 1.0,
      land_cost: 100000,
      grid_connection_cost: 150000,
      opex_per_kw_year: 20,
      fixed_opex_annual: capex.total * (omPercentOfCapex / 100),
      variable_opex_per_mwh: this.specs.costs.electricityPrice || 50,
      insurance_rate: 0.5,
      project_lifetime_years: systemLifetime,
      discount_rate: 12,
      debt_ratio: 0.5,
      interest_rate: 6,
      tax_rate: 34,
      depreciation_years: 10,
      electricity_price_per_mwh: 150, // SAF value equivalent
      price_escalation_rate: 2,
      carbon_credit_per_ton: 0,
      carbon_intensity_avoided: this.specs.feedstock.carbonIntensity,
    }
  }

  private calculateAnnualProduction(capacityFactor: number): any {
    // Simplified for type compatibility
    return {
      energy: this.specs.capacity.feedstockInput * this.specs.process.electricityConsumption * (capacityFactor / 100),
    }
  }
}

export function createHEFASAFModel(specs: Partial<HEFASAFSpecs>): HEFASAFModel {
  return new HEFASAFModel(specs)
}
