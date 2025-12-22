/**
 * Cost Estimation System for TEA
 *
 * Industry-standard cost estimation methods:
 * - Equipment cost scaling (six-tenths rule and variations)
 * - Installation factors by equipment type
 * - Location factors for different regions
 * - Cost index adjustments (CEPCI, CPI)
 * - Contingency factors based on TRL
 * - Engineering cost estimation
 * - Indirect cost calculations
 *
 * Based on NETL QGESS Cost Estimation Methodology and AACE International standards
 */

import type { EquipmentItem, EquipmentType } from '@/types/tea-process'

/**
 * Equipment cost scaling parameters
 * Reference: NETL QGESS Capital Cost Scaling Methodology
 */
export interface CostScalingParams {
  referenceSize: number
  referenceCost: number
  referenceUnit: string
  targetSize: number
  scalingExponent: number // Typically 0.6-0.9 (six-tenths rule)
  material?: string
  technology?: string
}

/**
 * Cost indices for inflation adjustment
 * Reference: Chemical Engineering Plant Cost Index (CEPCI)
 */
export interface CostIndices {
  cepci: {
    // Chemical Engineering Plant Cost Index
    year: number
    value: number
  }
  cpi: {
    // Consumer Price Index
    year: number
    value: number
  }
  region?: string
}

/**
 * Location factors for regional cost adjustment
 * Reference: NETL QGESS, Towler & Sinnott
 */
const LOCATION_FACTORS: Record<string, number> = {
  'US-Gulf-Coast': 1.0, // Baseline
  'US-California': 1.25,
  'US-Northeast': 1.15,
  'US-Midwest': 1.05,
  'Europe-Western': 1.20,
  'Europe-Eastern': 0.90,
  'Asia-Japan': 1.30,
  'Asia-Korea': 1.15,
  'Asia-China': 0.85,
  'Asia-India': 0.75,
  'Asia-Southeast': 0.80,
  'Middle-East': 0.95,
  'Latin-America': 0.85,
  'Africa': 0.70,
}

/**
 * Installation factors by equipment type
 * Reference: NETL studies, Towler & Sinnott
 */
const INSTALLATION_FACTORS: Record<EquipmentType, number> = {
  reactor: 2.5,
  separator: 2.0,
  distillation_column: 3.0,
  heat_exchanger: 2.2,
  cooler: 2.0,
  heater: 2.0,
  compressor: 2.5,
  pump: 2.0,
  turbine: 2.3,
  vessel: 2.0,
  tank: 1.8,
  mixer: 1.5,
  filter: 2.0,
  dryer: 2.2,
  furnace: 2.8,
  boiler: 2.5,
  condenser: 2.0,
  evaporator: 2.3,
  crystallizer: 2.5,
  other: 2.0,
}

/**
 * Material cost factors (relative to carbon steel = 1.0)
 */
const MATERIAL_COST_FACTORS: Record<string, number> = {
  carbon_steel: 1.0,
  stainless_steel_304: 2.5,
  stainless_steel_316: 3.0,
  stainless_steel_317: 3.5,
  hastelloy: 8.0,
  monel: 6.0,
  titanium: 7.0,
  nickel_alloy: 5.0,
  aluminum: 1.8,
  copper: 2.2,
  concrete: 0.5,
  polymer: 0.8,
  ceramic: 3.0,
}

/**
 * Contingency factors based on Technology Readiness Level (TRL)
 * Reference: NETL QGESS, AACE International
 */
const CONTINGENCY_FACTORS = {
  process: {
    // Process contingency based on technology maturity
    TRL_1_3: 0.40, // Laboratory/concept stage: 40%
    TRL_4_6: 0.30, // Pilot/demonstration: 30%
    TRL_7_8: 0.15, // Pre-commercial: 15%
    TRL_9: 0.05, // Commercial/Nth plant: 5%
  },
  project: {
    // Project contingency (general uncertainty)
    class_5: 0.50, // Concept screening (±50%)
    class_4: 0.30, // Study/feasibility (±30%)
    class_3: 0.20, // Budget authorization (±20%)
    class_2: 0.10, // Control/bid (±10%)
    class_1: 0.05, // Check estimate (±5%)
  },
}

/**
 * Cost Estimation Engine
 */
export class CostEstimator {
  /**
   * Scale equipment cost using six-tenths rule or custom exponent
   *
   * Formula: Cost2 = Cost1 * (Size2/Size1)^α
   * Where α = scaling exponent (typically 0.6, range 0.4-0.9)
   */
  scaleEquipmentCost(params: CostScalingParams): {
    scaledCost: number
    scalingFactor: number
    method: string
  } {
    const scalingFactor = Math.pow(
      params.targetSize / params.referenceSize,
      params.scalingExponent
    )

    const scaledCost = params.referenceCost * scalingFactor

    return {
      scaledCost,
      scalingFactor,
      method: `Power law scaling with exponent ${params.scalingExponent}`,
    }
  }

  /**
   * Apply installation factor to equipment cost
   */
  applyInstallationFactor(equipmentCost: number, equipmentType: EquipmentType): {
    installedCost: number
    installationFactor: number
    breakdown: {
      equipment: number
      installation: number
    }
  } {
    const factor = INSTALLATION_FACTORS[equipmentType] || 2.0
    const installedCost = equipmentCost * factor

    return {
      installedCost,
      installationFactor: factor,
      breakdown: {
        equipment: equipmentCost,
        installation: installedCost - equipmentCost,
      },
    }
  }

  /**
   * Apply material cost factor
   */
  applyMaterialFactor(baseCost: number, material: string): {
    adjustedCost: number
    materialFactor: number
  } {
    const factor = (MATERIAL_COST_FACTORS as any)[material] || 1.0

    return {
      adjustedCost: baseCost * factor,
      materialFactor: factor,
    }
  }

  /**
   * Apply location factor for regional adjustment
   */
  applyLocationFactor(baseCost: number, location: string): {
    adjustedCost: number
    locationFactor: number
  } {
    const factor = LOCATION_FACTORS[location] || 1.0

    return {
      adjustedCost: baseCost * factor,
      locationFactor: factor,
    }
  }

  /**
   * Adjust cost for inflation using cost indices
   */
  adjustForInflation(
    baseCost: number,
    baseYear: number,
    targetYear: number,
    indexType: 'cepci' | 'cpi' = 'cepci'
  ): {
    adjustedCost: number
    inflationFactor: number
    method: string
  } {
    // Simplified: assume 3% annual inflation if indices not available
    const annualInflation = 0.03
    const years = targetYear - baseYear
    const inflationFactor = Math.pow(1 + annualInflation, years)

    return {
      adjustedCost: baseCost * inflationFactor,
      inflationFactor,
      method: `${annualInflation * 100}% annual inflation over ${years} years`,
    }
  }

  /**
   * Apply contingency based on TRL
   */
  applyContingency(
    baseCost: number,
    trl: number,
    estimateClass: 1 | 2 | 3 | 4 | 5 = 3
  ): {
    totalCost: number
    processContingency: number
    projectContingency: number
  } {
    // Process contingency (technology-specific)
    let processContingencyRate = 0
    if (trl <= 3) processContingencyRate = CONTINGENCY_FACTORS.process.TRL_1_3
    else if (trl <= 6) processContingencyRate = CONTINGENCY_FACTORS.process.TRL_4_6
    else if (trl <= 8) processContingencyRate = CONTINGENCY_FACTORS.process.TRL_7_8
    else processContingencyRate = CONTINGENCY_FACTORS.process.TRL_9

    // Project contingency (general uncertainty)
    let projectContingencyRate = CONTINGENCY_FACTORS.project.class_3
    switch (estimateClass) {
      case 5:
        projectContingencyRate = CONTINGENCY_FACTORS.project.class_5
        break
      case 4:
        projectContingencyRate = CONTINGENCY_FACTORS.project.class_4
        break
      case 3:
        projectContingencyRate = CONTINGENCY_FACTORS.project.class_3
        break
      case 2:
        projectContingencyRate = CONTINGENCY_FACTORS.project.class_2
        break
      case 1:
        projectContingencyRate = CONTINGENCY_FACTORS.project.class_1
        break
    }

    const processContingency = baseCost * processContingencyRate
    const projectContingency = baseCost * projectContingencyRate
    const totalCost = baseCost + processContingency + projectContingency

    return {
      totalCost,
      processContingency,
      projectContingency,
    }
  }

  /**
   * Calculate BEC to TPC (Bare Erected Cost to Total Plant Cost)
   *
   * Based on NETL 5-level cost structure:
   * BEC → EPCC → TPC → TOC → TASC
   */
  calculateMultiLevelCosts(params: {
    bec: number // Bare Erected Cost
    epcFactor: number // EPC services as % of BEC (typically 10-15%)
    trl: number
    estimateClass: 1 | 2 | 3 | 4 | 5
    ownersCostFactor: number // Owner's costs as % of TPC (typically 15-20%)
    constructionYears: number
    escalationRate: number // Annual escalation during construction
    interestRate: number // Interest during construction
  }): {
    bec: number
    epcc: number
    tpc: number
    toc: number
    tasc: number
    breakdown: {
      epcServices: number
      processContingency: number
      projectContingency: number
      ownersCosts: number
      escalation: number
      idc: number // Interest During Construction
    }
  } {
    // BEC (given)
    const bec = params.bec

    // EPCC = BEC + EPC Services
    const epcServices = bec * params.epcFactor
    const epcc = bec + epcServices

    // TPC = EPCC + Contingencies
    const contingencies = this.applyContingency(epcc, params.trl, params.estimateClass)
    const tpc = contingencies.totalCost

    // TOC = TPC + Owner's Costs
    const ownersCosts = tpc * params.ownersCostFactor
    const toc = tpc + ownersCosts

    // TASC = TOC + Escalation + Interest During Construction
    const escalation = this.calculateConstructionEscalation(
      toc,
      params.constructionYears,
      params.escalationRate
    )

    const idc = this.calculateInterestDuringConstruction(
      toc,
      params.constructionYears,
      params.interestRate
    )

    const tasc = toc + escalation + idc

    return {
      bec,
      epcc,
      tpc,
      toc,
      tasc,
      breakdown: {
        epcServices,
        processContingency: contingencies.processContingency,
        projectContingency: contingencies.projectContingency,
        ownersCosts,
        escalation,
        idc,
      },
    }
  }

  /**
   * Calculate escalation during construction
   */
  private calculateConstructionEscalation(
    toc: number,
    constructionYears: number,
    escalationRate: number
  ): number {
    // Simplified: assumes uniform spending over construction period
    // Midpoint escalation approach
    const midpointYear = constructionYears / 2
    const escalationFactor = Math.pow(1 + escalationRate / 100, midpointYear) - 1

    return toc * escalationFactor
  }

  /**
   * Calculate interest during construction
   */
  private calculateInterestDuringConstruction(
    toc: number,
    constructionYears: number,
    interestRate: number
  ): number {
    // Simplified: assumes uniform spending and compounding
    const r = interestRate / 100
    const n = constructionYears

    // Interest accumulation with uniform spending
    const idc = toc * r * ((Math.pow(1 + r, n) - 1) / r - n) / n

    return idc
  }

  /**
   * Estimate equipment cost from capacity (when no quote available)
   */
  estimateEquipmentCost(params: {
    equipmentType: EquipmentType
    capacity: number
    capacityUnit: string
    material?: string
  }): {
    estimatedCost: number
    method: string
    confidence: 'low' | 'medium' | 'high'
  } {
    // Use typical cost correlations (would be expanded with database)
    const baseCosts: Partial<Record<EquipmentType, { cost: number; capacity: number; unit: string }>> = {
      compressor: { cost: 500000, capacity: 1000, unit: 'kW' },
      heat_exchanger: { cost: 100000, capacity: 1000, unit: 'm²' },
      pump: { cost: 50000, capacity: 100, unit: 'kW' },
      reactor: { cost: 1000000, capacity: 100, unit: 'm³' },
      separator: { cost: 200000, capacity: 50, unit: 'm³' },
      tank: { cost: 150000, capacity: 100, unit: 'm³' },
      vessel: { cost: 300000, capacity: 75, unit: 'm³' },
    }

    const baseData = baseCosts[params.equipmentType]

    if (!baseData) {
      return {
        estimatedCost: 100000, // Default fallback
        method: 'Default estimate (no correlation available)',
        confidence: 'low',
      }
    }

    // Scale using six-tenths rule
    const scalingExponent = 0.6
    const scaled = this.scaleEquipmentCost({
      referenceSize: baseData.capacity,
      referenceCost: baseData.cost,
      referenceUnit: baseData.unit,
      targetSize: params.capacity,
      scalingExponent,
    })

    // Apply material factor if specified
    let finalCost = scaled.scaledCost
    if (params.material) {
      const materialAdj = this.applyMaterialFactor(scaled.scaledCost, params.material)
      finalCost = materialAdj.adjustedCost
    }

    return {
      estimatedCost: finalCost,
      method: `Scaled from ${baseData.cost} USD @ ${baseData.capacity} ${baseData.unit} using ${scalingExponent} exponent`,
      confidence: 'medium',
    }
  }

  /**
   * Calculate engineering costs (% of equipment cost)
   */
  calculateEngineeringCosts(equipmentCost: number): {
    detailedDesign: number // 5-8% of equipment
    procurement: number // 2-3%
    constructionManagement: number // 3-5%
    homeOffice: number // 3-5%
    total: number
  } {
    return {
      detailedDesign: equipmentCost * 0.07,
      procurement: equipmentCost * 0.025,
      constructionManagement: equipmentCost * 0.04,
      homeOffice: equipmentCost * 0.04,
      total: equipmentCost * 0.175, // ~17.5% total
    }
  }

  /**
   * Calculate indirect costs (labor, overhead, etc.)
   */
  calculateIndirectCosts(directCosts: number): {
    indirectLabor: number // Typically 20-30% of direct labor
    temporaryFacilities: number // 2-3% of direct costs
    constructionTools: number // 1-2%
    overhead: number // 5-10%
    total: number
  } {
    return {
      indirectLabor: directCosts * 0.25,
      temporaryFacilities: directCosts * 0.025,
      constructionTools: directCosts * 0.015,
      overhead: directCosts * 0.08,
      total: directCosts * 0.37, // ~37% total
    }
  }
}

/**
 * Estimate total plant cost from capacity (order-of-magnitude estimate)
 */
export function estimatePlantCostFromCapacity(params: {
  technology: string
  capacity: number // MW
  location: string
  trl: number
}): {
  estimatedTPC: number // Total Plant Cost
  estimatedTOC: number // Total Overnight Cost
  capexPerKW: number
  confidence: 'low' | 'medium' | 'high'
  method: string
} {
  // Technology-specific cost per kW (2024 basis)
  const technologyCosts: Record<string, { capexPerKW: number; range: { min: number; max: number } }> = {
    solar: { capexPerKW: 1000, range: { min: 600, max: 2000 } },
    wind: { capexPerKW: 1500, range: { min: 1000, max: 2500 } },
    offshore_wind: { capexPerKW: 4000, range: { min: 2500, max: 5500 } },
    hydrogen: { capexPerKW: 1200, range: { min: 500, max: 2000 } },
    storage: { capexPerKW: 800, range: { min: 300, max: 1500 } },
    nuclear: { capexPerKW: 7000, range: { min: 5000, max: 10000 } },
    geothermal: { capexPerKW: 3500, range: { min: 2000, max: 5000 } },
    hydro: { capexPerKW: 2500, range: { min: 1000, max: 4000 } },
    biomass: { capexPerKW: 4000, range: { min: 2000, max: 6000 } },
  }

  const techCost = technologyCosts[params.technology] || { capexPerKW: 2000, range: { min: 500, max: 5000 } }

  // Apply TRL adjustment (early stage = higher cost)
  let trlFactor = 1.0
  if (params.trl <= 3) trlFactor = 1.5 // +50% for lab scale
  else if (params.trl <= 6) trlFactor = 1.25 // +25% for pilot
  else if (params.trl <= 8) trlFactor = 1.1 // +10% for demo

  const capexPerKW = techCost.capexPerKW * trlFactor

  // Apply location factor
  const estimator = new CostEstimator()
  const locationAdj = estimator.applyLocationFactor(capexPerKW, params.location)

  // Calculate TPC
  const estimatedTPC = locationAdj.adjustedCost * params.capacity * 1000

  // Estimate TOC (TPC + owner's costs ~15%)
  const estimatedTOC = estimatedTPC * 1.15

  return {
    estimatedTPC,
    estimatedTOC,
    capexPerKW: locationAdj.adjustedCost,
    confidence: params.trl >= 7 ? 'medium' : 'low',
    method: `Technology baseline (${techCost.capexPerKW} $/kW) × TRL factor (${trlFactor}) × Location factor (${locationAdj.locationFactor})`,
  }
}

/**
 * Calculate labor costs by region and skill level
 */
export function calculateLaborCosts(params: {
  region: string
  operators: number
  supervisors: number
  engineers: number
  maintenance: number
  admin: number
  annualHours?: number // Default: 2080 hours (40 hrs/week * 52 weeks)
}): {
  annual: number
  breakdown: Record<string, number>
} {
  const hours = params.annualHours || 2080

  // Regional wage multipliers (US baseline = 1.0)
  const regionalMultipliers: Record<string, number> = {
    'US': 1.0,
    'Europe-Western': 1.1,
    'Europe-Eastern': 0.6,
    'Asia-Japan': 1.0,
    'Asia-China': 0.4,
    'Asia-India': 0.3,
    'Asia-Southeast': 0.35,
    'Latin-America': 0.5,
    'Africa': 0.3,
  }

  const multiplier = regionalMultipliers[params.region] || 1.0

  // Base hourly rates (US, 2024)
  const rates = {
    operator: 35 * multiplier,
    supervisor: 55 * multiplier,
    engineer: 75 * multiplier,
    maintenance: 45 * multiplier,
    admin: 40 * multiplier,
  }

  const breakdown = {
    operators: params.operators * rates.operator * hours,
    supervisors: params.supervisors * rates.supervisor * hours,
    engineers: params.engineers * rates.engineer * hours,
    maintenance: params.maintenance * rates.maintenance * hours,
    admin: params.admin * rates.admin * hours,
  }

  const annual = Object.values(breakdown).reduce((sum, cost) => sum + cost, 0)

  return {
    annual,
    breakdown,
  }
}

/**
 * Calculate maintenance costs (% of CAPEX)
 */
export function calculateMaintenanceCosts(params: {
  totalCAPEX: number
  technology: string
  plantAge?: number // Years of operation
}): {
  annualMaintenance: number
  maintenanceRate: number // percentage of CAPEX
} {
  // Technology-specific maintenance rates
  const maintenanceRates: Record<string, number> = {
    solar: 1.0, // 1% of CAPEX per year
    wind: 2.5,
    offshore_wind: 3.5,
    hydrogen: 2.0,
    storage: 1.5,
    nuclear: 3.0,
    geothermal: 2.5,
    hydro: 2.0,
    biomass: 3.0,
    generic: 2.0,
  }

  let baseRate = maintenanceRates[params.technology] || 2.0

  // Increase with plant age (wear and tear)
  if (params.plantAge) {
    const ageFactor = 1 + (params.plantAge * 0.02) // +2% per year of operation
    baseRate *= ageFactor
  }

  return {
    annualMaintenance: params.totalCAPEX * (baseRate / 100),
    maintenanceRate: baseRate,
  }
}

/**
 * Convenience function to estimate all costs
 */
export function estimateComprehensiveCosts(params: {
  technology: string
  capacity: number // MW
  location: string
  trl: number
  lifetime: number
}): {
  capex: {
    tpc: number
    toc: number
    tasc: number
  }
  opex: {
    annualFixedOM: number
    annualVariableOM: number
    annualTotal: number
  }
  unitCosts: {
    capexPerKW: number
    opexPerKWYear: number
  }
} {
  const plantCost = estimatePlantCostFromCapacity(params)

  const maintenance = calculateMaintenanceCosts({
    totalCAPEX: plantCost.estimatedTOC,
    technology: params.technology,
  })

  const labor = calculateLaborCosts({
    region: params.location,
    operators: 4,
    supervisors: 1,
    engineers: 2,
    maintenance: 3,
    admin: 2,
  })

  const annualFixedOM = labor.annual + maintenance.annualMaintenance
  const annualVariableOM = plantCost.estimatedTOC * 0.005 // 0.5% of CAPEX for variable O&M

  return {
    capex: {
      tpc: plantCost.estimatedTPC,
      toc: plantCost.estimatedTOC,
      tasc: plantCost.estimatedTOC * 1.1, // Estimate +10% for escalation/IDC
    },
    opex: {
      annualFixedOM,
      annualVariableOM,
      annualTotal: annualFixedOM + annualVariableOM,
    },
    unitCosts: {
      capexPerKW: plantCost.capexPerKW,
      opexPerKWYear: (annualFixedOM + annualVariableOM) / (params.capacity * 1000),
    },
  }
}
