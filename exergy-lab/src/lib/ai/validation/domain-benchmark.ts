/**
 * Domain-Specific Scientific Benchmark
 *
 * Validates discovery outputs against known physical laws, thermodynamic limits,
 * and domain-specific constraints. Includes battery and electrolyzer limits
 * per Grok's recommendations for clean energy applications.
 *
 * @module domain-benchmark
 */

import type {
  BenchmarkResult,
  BenchmarkItemResult,
  PhysicalLimit,
  ThermodynamicViolation,
  DomainBenchmarks,
} from './types'

// ============================================================================
// TRUE PHYSICAL LIMITS (Thermodynamic/Physics-based)
// These are fundamental limits based on physics, NOT industry achievements
// Violating these limits indicates a physically impossible claim
// ============================================================================

export const PHYSICAL_LIMITS = {
  // Solar - Thermodynamic limits from detailed balance calculations
  solar: {
    shockleyQueisser: {
      name: 'Shockley-Queisser Limit',
      value: 0.337,  // 33.7% - TRUE thermodynamic limit for single-junction
      unit: 'η',
      type: 'thermodynamic' as const,
      citation: 'Shockley & Queisser (1961), J. Appl. Phys. 32, 510',
      context: 'Single-junction solar cell maximum efficiency at 1 sun',
    },
    siliconAuger: {
      name: 'Silicon Auger Limit',
      value: 0.298,  // 29.8% - Si-specific with Auger recombination
      unit: 'η',
      type: 'physics' as const,
      citation: 'Richter et al. (2013), IEEE J. Photovoltaics',
      context: 'Silicon-specific limit accounting for Auger recombination',
    },
    tandem2Junction: {
      name: '2-Junction Tandem Limit',
      value: 0.45,  // 45%
      unit: 'η',
      type: 'thermodynamic' as const,
      citation: 'De Vos (1980), J. Phys. D',
      context: 'Two-junction tandem cell theoretical maximum',
    },
    tandem3Junction: {
      name: '3-Junction Tandem Limit',
      value: 0.515,  // 51.5%
      unit: 'η',
      type: 'thermodynamic' as const,
      context: 'Three-junction tandem cell theoretical maximum',
    },
    infiniteJunction: {
      name: 'Infinite-Junction Limit (1 sun)',
      value: 0.687,  // 68.7% at 1 sun
      unit: 'η',
      type: 'thermodynamic' as const,
      context: 'Infinite-junction limit at 1 sun concentration',
    },
    infiniteJunctionConcentrated: {
      name: 'Infinite-Junction Limit (max concentration)',
      value: 0.868,  // 86.8% at maximum concentration
      unit: 'η',
      type: 'thermodynamic' as const,
      context: 'Ultimate thermodynamic limit for solar conversion',
    },
  },

  // Wind - Physics limit from momentum theory
  wind: {
    betz: {
      name: 'Betz Limit',
      value: 0.593,  // 59.3% - TRUE physics limit
      unit: 'η',
      type: 'physics' as const,
      citation: 'Betz (1920), Die Naturwissenschaften',
      context: 'Maximum extractable power from wind by any turbine',
    },
  },

  // Battery - TRUE theoretical limits from electrochemistry
  // NOT industry achievements - these are thermodynamic maxima
  battery: {
    liIonTheoretical: {
      name: 'Li-ion Theoretical (cell level)',
      value: 555,  // Wh/kg - thermodynamic limit at cell level
      unit: 'Wh/kg',
      type: 'thermodynamic' as const,
      citation: 'Tarascon & Armand (2001), Nature 414, 359-367',
      context: 'Maximum theoretical specific energy for Li-ion chemistry',
    },
    liSTheoretical: {
      name: 'Li-S Theoretical',
      value: 2600,  // Wh/kg - thermodynamic limit
      unit: 'Wh/kg',
      type: 'thermodynamic' as const,
      citation: 'Ji & Nazar (2010), J. Mater. Chem.',
      context: 'Maximum theoretical specific energy for Li-S chemistry',
    },
    liAirTheoretical: {
      name: 'Li-Air Theoretical',
      value: 3500,  // Wh/kg - thermodynamic limit
      unit: 'Wh/kg',
      type: 'thermodynamic' as const,
      context: 'Maximum theoretical specific energy for Li-Air chemistry',
    },
    liFTheoretical: {
      name: 'Li-F Ultimate',
      value: 6294,  // Wh/kg - highest possible electrochemical
      unit: 'Wh/kg',
      type: 'thermodynamic' as const,
      citation: 'Lu et al. (2016), J. Electrochem. Soc.',
      context: 'Ultimate thermodynamic limit for electrochemical storage',
    },
  },

  // Hydrogen - Fixed physics values
  hydrogen: {
    lhv: {
      name: 'Lower Heating Value',
      value: 33.33,  // kWh/kg - fixed physics
      unit: 'kWh/kg',
      type: 'physics' as const,
      context: 'Energy content of hydrogen (LHV)',
    },
    hhv: {
      name: 'Higher Heating Value',
      value: 39.4,  // kWh/kg - fixed physics
      unit: 'kWh/kg',
      type: 'physics' as const,
      context: 'Energy content of hydrogen (HHV)',
    },
    reversibleVoltage: {
      name: 'Reversible Electrolysis Voltage',
      value: 1.23,  // V at 25°C - thermodynamic minimum
      unit: 'V',
      type: 'thermodynamic' as const,
      context: 'Minimum voltage for water splitting at 25°C',
    },
    thermoneutralVoltage: {
      name: 'Thermoneutral Voltage',
      value: 1.48,  // V - includes heat
      unit: 'V',
      type: 'thermodynamic' as const,
      context: 'Voltage for adiabatic water splitting',
    },
  },

  // Thermal - Carnot limit
  thermal: {
    carnot: {
      name: 'Carnot Efficiency',
      value: 1.0,  // η = 1 - Tc/Th, max is 1
      unit: 'η',
      type: 'thermodynamic' as const,
      formula: '1 - T_cold/T_hot',
      context: 'Maximum heat engine efficiency',
    },
  },

  // Materials - Theoretical maxima
  materials: {
    maxTensileStrength: {
      name: 'Max Tensile Strength',
      value: 100e9,  // Pa - Carbon nanotubes theoretical
      unit: 'Pa',
      type: 'physics' as const,
      context: 'Carbon nanotubes theoretical maximum',
    },
    maxThermalConductivity: {
      name: 'Max Thermal Conductivity',
      value: 5000,  // W/m·K - Diamond/graphene
      unit: 'W/m·K',
      type: 'physics' as const,
      context: 'Diamond/graphene at room temperature',
    },
  },

  // Reaction kinetics
  kinetics: {
    diffusionLimit: {
      name: 'Diffusion Limit',
      value: 1e10,
      unit: 'M⁻¹s⁻¹',
      type: 'physics' as const,
      context: 'Maximum rate for diffusion-limited reactions',
    },
  },
}

// ============================================================================
// INDUSTRY BENCHMARKS (Current Achievements - NOT Physical Limits)
// These are what has been achieved, NOT what is physically possible
// Exceeding these is NOTABLE, not a violation
// ============================================================================

export const INDUSTRY_BENCHMARKS = {
  solar: {
    commercialSilicon: {
      name: 'Commercial Silicon Best',
      value: 0.23,  // 23% - current commercial
      unit: 'η',
      context: 'Current best commercial silicon module',
    },
    labSiliconRecord: {
      name: 'Lab Silicon Record',
      value: 0.267,  // 26.7% - UNSW 2023
      unit: 'η',
      context: 'Laboratory silicon cell record',
    },
    tandemRecord: {
      name: 'Tandem Cell Record',
      value: 0.339,  // 33.9% - LONGi 2023
      unit: 'η',
      context: 'Perovskite-silicon tandem record',
    },
  },
  battery: {
    commercialLiIon: {
      name: 'Commercial Li-ion',
      value: 300,  // Wh/kg - current best commercial
      unit: 'Wh/kg',
      context: 'Current commercial Li-ion energy density',
    },
    solidStateRecord: {
      name: 'Solid-State Record',
      value: 800,  // Wh/kg - WeLion 2024 claim
      unit: 'Wh/kg',
      context: 'Claimed solid-state battery achievement',
    },
    labLiSRecord: {
      name: 'Lab Li-S Record',
      value: 500,  // Wh/kg - lab demonstration
      unit: 'Wh/kg',
      context: 'Laboratory Li-S demonstration',
    },
  },
  hydrogen: {
    pemEfficiency: {
      name: 'PEM Electrolyzer Efficiency',
      value: 0.80,  // 80% - current best
      unit: 'η',
      context: 'Current best PEM electrolyzer efficiency',
    },
    alkalineEfficiency: {
      name: 'Alkaline Electrolyzer Efficiency',
      value: 0.70,  // 70% - current best
      unit: 'η',
      context: 'Current best alkaline electrolyzer efficiency',
    },
    soecEfficiency: {
      name: 'SOEC Efficiency',
      value: 0.90,  // 90% - with heat recovery
      unit: 'η',
      context: 'SOEC with heat recovery',
    },
  },
  wind: {
    largeScaleEfficiency: {
      name: 'Large-Scale Wind Efficiency',
      value: 0.50,  // 50% - current best large turbines
      unit: 'η',
      context: 'Current best large-scale wind turbines',
    },
  },
}

// ============================================================================
// BREAKTHROUGH BASELINES (v0.0.4.0)
// Domain-specific thresholds for TRUE breakthrough detection
// Used by BD1/BD6 to calibrate scoring and prevent false positives
// ============================================================================

export interface BreakthroughBaseline {
  domain: string
  subDomain?: string
  currentSOTA: number            // Current state-of-the-art value
  sotaUnit: string               // Unit for the SOTA value
  nearTermTarget: number         // Industry 5-year target
  breakthroughThreshold: number  // Threshold for TRUE breakthrough (9.0+)
  paradigmShiftThreshold: number // Threshold for paradigm shift (9.5+)
  context: string                // Brief description
  lastUpdated: string            // When this baseline was set (YYYY-MM)
}

/**
 * Domain-specific breakthrough baselines for accurate breakthrough detection.
 *
 * Key principle: TRUE breakthroughs are rare by definition. These baselines
 * define what constitutes a genuine paradigm shift vs. incremental improvement.
 *
 * Scoring guidance:
 * - Below SOTA: Not competitive (score 5-6)
 * - SOTA to nearTermTarget: Incremental improvement (score 6.5-7.5)
 * - nearTermTarget to breakthroughThreshold: Significant advancement (score 7.5-8.5)
 * - Above breakthroughThreshold: TRUE breakthrough (score 9.0+)
 * - Above paradigmShiftThreshold: Paradigm shift (score 9.5+)
 */
export const BREAKTHROUGH_BASELINES: BreakthroughBaseline[] = [
  // Solar PV
  {
    domain: 'solar',
    subDomain: 'silicon',
    currentSOTA: 26.7,           // Lab record (UNSW 2023)
    sotaUnit: '%',
    nearTermTarget: 28.0,        // Approaching Auger limit
    breakthroughThreshold: 29.0, // Exceeding practical Si limit
    paradigmShiftThreshold: 30.0, // Beyond theoretical Si limit (requires tandem)
    context: 'Single-junction silicon solar cell efficiency',
    lastUpdated: '2024-12',
  },
  {
    domain: 'solar',
    subDomain: 'perovskite-tandem',
    currentSOTA: 33.9,           // LONGi 2023
    sotaUnit: '%',
    nearTermTarget: 37.0,        // Near-term tandem target
    breakthroughThreshold: 40.0, // TRUE breakthrough threshold
    paradigmShiftThreshold: 45.0, // Approaching 2-junction limit (45%)
    context: 'Perovskite-silicon tandem cell efficiency',
    lastUpdated: '2024-12',
  },
  {
    domain: 'solar',
    subDomain: 'perovskite-stability',
    currentSOTA: 1000,           // Hours at T80
    sotaUnit: 'hours',
    nearTermTarget: 10000,       // 1+ year under accelerated testing
    breakthroughThreshold: 25000, // 3 years under accelerated testing
    paradigmShiftThreshold: 50000, // Commercial-grade stability
    context: 'Perovskite solar cell operational stability (T80 lifetime)',
    lastUpdated: '2024-12',
  },

  // Battery Energy Density
  {
    domain: 'battery',
    subDomain: 'li-ion-gravimetric',
    currentSOTA: 300,            // Commercial EV cells
    sotaUnit: 'Wh/kg',
    nearTermTarget: 400,         // Near-term solid-state target
    breakthroughThreshold: 500,  // TRUE breakthrough (Li-S territory)
    paradigmShiftThreshold: 600, // Paradigm shift
    context: 'Lithium-ion battery gravimetric energy density',
    lastUpdated: '2024-12',
  },
  {
    domain: 'battery',
    subDomain: 'cycle-life',
    currentSOTA: 1500,           // Commercial EV cycle life
    sotaUnit: 'cycles',
    nearTermTarget: 3000,        // Next-gen target
    breakthroughThreshold: 10000, // TRUE breakthrough
    paradigmShiftThreshold: 50000, // Grid-storage grade
    context: 'Battery cycle life (80% capacity retention)',
    lastUpdated: '2024-12',
  },
  {
    domain: 'battery',
    subDomain: 'fast-charge',
    currentSOTA: 15,             // Current best (15 min to 80%)
    sotaUnit: 'minutes',
    nearTermTarget: 10,          // Near-term target
    breakthroughThreshold: 5,    // TRUE breakthrough (gas-station parity)
    paradigmShiftThreshold: 2,   // Paradigm shift
    context: 'Time to charge 0-80% capacity',
    lastUpdated: '2024-12',
  },

  // Hydrogen Production
  {
    domain: 'hydrogen',
    subDomain: 'electrolyzer-efficiency',
    currentSOTA: 80,             // Best PEM efficiency
    sotaUnit: '%',
    nearTermTarget: 85,          // Near-term target
    breakthroughThreshold: 90,   // TRUE breakthrough (near reversible)
    paradigmShiftThreshold: 95,  // Paradigm shift
    context: 'Water electrolyzer electrical efficiency (HHV)',
    lastUpdated: '2024-12',
  },
  {
    domain: 'hydrogen',
    subDomain: 'electrolyzer-cost',
    currentSOTA: 500,            // $/kW installed
    sotaUnit: '$/kW',
    nearTermTarget: 200,         // DOE target
    breakthroughThreshold: 100,  // TRUE breakthrough
    paradigmShiftThreshold: 50,  // Paradigm shift (commodity hardware)
    context: 'Electrolyzer capital cost per kW',
    lastUpdated: '2024-12',
  },
  {
    domain: 'hydrogen',
    subDomain: 'green-h2-cost',
    currentSOTA: 5.0,            // $/kg H2 (renewable electricity)
    sotaUnit: '$/kg',
    nearTermTarget: 2.0,         // DOE Earthshot target
    breakthroughThreshold: 1.0,  // TRUE breakthrough (fossil parity)
    paradigmShiftThreshold: 0.5, // Paradigm shift
    context: 'Green hydrogen production cost',
    lastUpdated: '2024-12',
  },

  // Wind Energy
  {
    domain: 'wind',
    subDomain: 'capacity-factor',
    currentSOTA: 45,             // Best offshore sites
    sotaUnit: '%',
    nearTermTarget: 55,          // Next-gen offshore target
    breakthroughThreshold: 65,   // TRUE breakthrough
    paradigmShiftThreshold: 75,  // Paradigm shift
    context: 'Wind turbine capacity factor',
    lastUpdated: '2024-12',
  },
  {
    domain: 'wind',
    subDomain: 'turbine-efficiency',
    currentSOTA: 50,             // Best large turbines
    sotaUnit: '%',
    nearTermTarget: 52,          // Near Betz with improvements
    breakthroughThreshold: 55,   // TRUE breakthrough (exceptional)
    paradigmShiftThreshold: 57,  // Very close to Betz limit
    context: 'Wind turbine aerodynamic efficiency',
    lastUpdated: '2024-12',
  },

  // Energy Storage Cost
  {
    domain: 'storage',
    subDomain: 'battery-cost',
    currentSOTA: 139,            // $/kWh (BloombergNEF 2024)
    sotaUnit: '$/kWh',
    nearTermTarget: 80,          // Near-term target
    breakthroughThreshold: 50,   // TRUE breakthrough
    paradigmShiftThreshold: 25,  // Paradigm shift (ubiquitous storage)
    context: 'Battery pack cost per kWh',
    lastUpdated: '2024-12',
  },

  // LCOE
  {
    domain: 'solar',
    subDomain: 'lcoe',
    currentSOTA: 30,             // Best utility solar $/MWh
    sotaUnit: '$/MWh',
    nearTermTarget: 20,          // Near-term target
    breakthroughThreshold: 10,   // TRUE breakthrough
    paradigmShiftThreshold: 5,   // Paradigm shift (too cheap to meter)
    context: 'Solar PV levelized cost of electricity',
    lastUpdated: '2024-12',
  },
  {
    domain: 'wind',
    subDomain: 'lcoe',
    currentSOTA: 35,             // Best onshore wind $/MWh
    sotaUnit: '$/MWh',
    nearTermTarget: 25,          // Near-term target
    breakthroughThreshold: 15,   // TRUE breakthrough
    paradigmShiftThreshold: 10,  // Paradigm shift
    context: 'Onshore wind levelized cost of electricity',
    lastUpdated: '2024-12',
  },

  // Carbon Capture
  {
    domain: 'carbon-capture',
    subDomain: 'dac-cost',
    currentSOTA: 600,            // $/tCO2 for DAC
    sotaUnit: '$/tCO2',
    nearTermTarget: 200,         // Near-term target
    breakthroughThreshold: 100,  // TRUE breakthrough
    paradigmShiftThreshold: 50,  // Paradigm shift (climate-scale viable)
    context: 'Direct air capture cost per ton CO2',
    lastUpdated: '2024-12',
  },

  // Catalysis
  {
    domain: 'catalysis',
    subDomain: 'fuel-cell-platinum-loading',
    currentSOTA: 0.25,           // mg Pt/cm² current
    sotaUnit: 'mg/cm²',
    nearTermTarget: 0.1,         // Near-term target
    breakthroughThreshold: 0.025, // TRUE breakthrough
    paradigmShiftThreshold: 0,   // Paradigm shift (Pt-free)
    context: 'Fuel cell platinum catalyst loading',
    lastUpdated: '2024-12',
  },
]

/**
 * Get the breakthrough baseline for a specific domain/subdomain
 */
export function getBreakthroughBaseline(
  domain: string,
  subDomain?: string
): BreakthroughBaseline | undefined {
  const domainLower = domain.toLowerCase()
  const subDomainLower = subDomain?.toLowerCase()

  return BREAKTHROUGH_BASELINES.find(b => {
    const domainMatch = b.domain === domainLower ||
                        domainLower.includes(b.domain) ||
                        b.domain.includes(domainLower)

    if (!domainMatch) return false

    if (subDomainLower && b.subDomain) {
      return subDomainLower.includes(b.subDomain) ||
             b.subDomain.includes(subDomainLower)
    }

    return true
  })
}

/**
 * Calculate breakthrough score adjustment based on domain baselines
 *
 * @param domain - Domain (e.g., 'solar', 'battery')
 * @param subDomain - Sub-domain (e.g., 'perovskite-tandem', 'li-ion-gravimetric')
 * @param claimedValue - The claimed performance value
 * @param isLowerBetter - Whether lower values are better (e.g., cost, time)
 * @returns Score adjustment multiplier (0.5 to 1.5)
 */
export function calculateBreakthroughScoreAdjustment(
  domain: string,
  subDomain: string | undefined,
  claimedValue: number,
  isLowerBetter: boolean = false
): { multiplier: number; tier: string; reasoning: string } {
  const baseline = getBreakthroughBaseline(domain, subDomain)

  if (!baseline) {
    return {
      multiplier: 1.0,
      tier: 'unknown',
      reasoning: `No baseline found for ${domain}/${subDomain || 'default'}`,
    }
  }

  // Normalize comparison based on whether lower is better
  const sota = baseline.currentSOTA
  const nearTerm = baseline.nearTermTarget
  const breakthrough = baseline.breakthroughThreshold
  const paradigm = baseline.paradigmShiftThreshold

  // Calculate position relative to thresholds
  let tier: string
  let multiplier: number

  if (isLowerBetter) {
    // Lower is better (cost, time, etc.)
    if (claimedValue <= paradigm) {
      tier = 'paradigm-shift'
      multiplier = 1.5
    } else if (claimedValue <= breakthrough) {
      tier = 'breakthrough'
      multiplier = 1.3
    } else if (claimedValue <= nearTerm) {
      tier = 'significant'
      multiplier = 1.1
    } else if (claimedValue <= sota) {
      tier = 'incremental'
      multiplier = 1.0
    } else {
      tier = 'below-sota'
      multiplier = 0.7
    }
  } else {
    // Higher is better (efficiency, energy density, etc.)
    if (claimedValue >= paradigm) {
      tier = 'paradigm-shift'
      multiplier = 1.5
    } else if (claimedValue >= breakthrough) {
      tier = 'breakthrough'
      multiplier = 1.3
    } else if (claimedValue >= nearTerm) {
      tier = 'significant'
      multiplier = 1.1
    } else if (claimedValue >= sota) {
      tier = 'incremental'
      multiplier = 1.0
    } else {
      tier = 'below-sota'
      multiplier = 0.7
    }
  }

  const reasoning = `${domain}/${subDomain || 'default'}: claimed ${claimedValue}${baseline.sotaUnit} ` +
    `vs SOTA ${sota}, near-term ${nearTerm}, breakthrough ${breakthrough}, paradigm ${paradigm} ` +
    `=> ${tier} (${multiplier}x)`

  return { multiplier, tier, reasoning }
}

// Legacy export for backward compatibility
export const DOMAIN_BENCHMARKS: DomainBenchmarks = {
  // Energy conversion limits (TRUE PHYSICAL LIMITS)
  energy: {
    carnot: {
      name: 'Carnot Efficiency',
      value: 1.0,
      unit: 'η',
      formula: '1 - T_cold/T_hot',
      context: 'Maximum heat engine efficiency',
    },
    shockleyQueisser: {
      name: 'Shockley-Queisser Limit',
      value: 0.337,
      unit: 'η',
      context: 'Single-junction solar cell maximum',
    },
    betz: {
      name: 'Betz Limit',
      value: 0.593,
      unit: 'η',
      context: 'Maximum wind turbine efficiency',
    },
    landauer: {
      name: 'Landauer Limit',
      value: 2.87e-21,
      unit: 'J',
      formula: 'kT*ln(2)',
      context: 'Minimum energy per bit erasure',
    },
  },

  // Materials properties
  materials: {
    maxTensileStrength: {
      name: 'Max Tensile Strength',
      value: 100e9,
      unit: 'Pa',
      context: 'Carbon nanotubes theoretical max',
    },
    maxThermalConductivity: {
      name: 'Max Thermal Conductivity',
      value: 5000,
      unit: 'W/m·K',
      context: 'Diamond/graphene at room temperature',
    },
    maxElectricalConductivity: {
      name: 'Max Electrical Conductivity',
      value: 6.3e7,
      unit: 'S/m',
      context: 'Silver at room temperature',
    },
  },

  // Reaction kinetics
  kinetics: {
    diffusionLimit: {
      name: 'Diffusion Limit',
      value: 1e10,
      unit: 'M⁻¹s⁻¹',
      context: 'Maximum rate for diffusion-limited reactions',
    },
  },

  // Energy storage
  storage: {
    gravimetricEnergyMax: {
      name: 'Max Gravimetric Energy',
      value: 143,
      unit: 'MJ/kg',
      context: 'Hydrogen gas theoretical',
    },
    volumetricEnergyMax: {
      name: 'Max Volumetric Energy',
      value: 36,
      unit: 'MJ/L',
      context: 'Diesel fuel',
    },
  },

  // Battery-specific limits (Updated to TRUE PHYSICAL LIMITS)
  battery: {
    liIonGravimetric: {
      name: 'Li-ion Theoretical Limit',
      value: 555,  // Updated from 300 (industry) to 555 (thermodynamic)
      unit: 'Wh/kg',
      context: 'Lithium-ion thermodynamic maximum',
    },
    liSGravimetric: {
      name: 'Li-S Theoretical Limit',
      value: 2600,  // Updated from 500 to 2600 (true thermodynamic limit)
      unit: 'Wh/kg',
      context: 'Lithium-sulfur thermodynamic maximum',
    },
    solidStateMax: {
      name: 'Li-F Ultimate Limit',
      value: 6294,  // Updated to ultimate electrochemical limit
      unit: 'Wh/kg',
      context: 'Ultimate electrochemical energy density limit',
    },
    cycleLifeMax: {
      name: 'Max Cycle Life',
      value: 100000,  // Updated - no hard physical limit, but practical
      unit: 'cycles',
      context: 'High-stability chemistry theoretical',
    },
  },

  // Electrolyzer limits (TRUE PHYSICAL LIMITS)
  electrolyzer: {
    minThermodynamicVoltage: {
      name: 'Thermodynamic Voltage',
      value: 1.23,  // TRUE thermodynamic minimum
      unit: 'V',
      context: 'Reversible potential at 25°C',
    },
    practicalOverpotential: {
      name: 'Min Practical Overpotential',
      value: 0.1,  // Reduced - near-reversible catalysts approaching this
      unit: 'V',
      context: 'Near-theoretical overpotential',
    },
    alkalineEfficiency: {
      name: 'Alkaline Max Efficiency',
      value: 0.85,  // Thermodynamic max with advanced catalysts
      unit: '',
      context: 'Theoretical maximum for alkaline electrolysis',
    },
    pemEfficiency: {
      name: 'PEM Max Efficiency',
      value: 0.90,  // Theoretical max
      unit: '',
      context: 'Theoretical maximum for PEM electrolysis',
    },
    soecEfficiency: {
      name: 'SOEC Max Efficiency',
      value: 1.0,  // Can exceed 100% with heat input
      unit: '',
      context: 'SOEC can exceed 100% electrical efficiency with heat',
    },
  },
}

// ============================================================================
// Domain Benchmark Validator Class
// ============================================================================

export interface DomainBenchmarkConfig {
  domain: string
  strictMode: boolean      // Fail on any violation vs allow minor
  customLimits?: Partial<Record<string, number>>
}

const DEFAULT_CONFIG: DomainBenchmarkConfig = {
  domain: 'clean_energy',
  strictMode: false,
}

export class DomainBenchmarkValidator {
  private config: DomainBenchmarkConfig

  constructor(config: Partial<DomainBenchmarkConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async validate(discoveryOutput: any): Promise<BenchmarkResult> {
    const startTime = Date.now()
    const items: BenchmarkItemResult[] = []

    // Run all domain-specific checks
    items.push(this.checkThermodynamics(discoveryOutput))
    items.push(this.checkMaterialsFeasibility(discoveryOutput))
    items.push(this.checkKinetics(discoveryOutput))
    items.push(this.checkConservationLaws(discoveryOutput))
    items.push(this.checkBatteryLimits(discoveryOutput))
    items.push(this.checkElectrolyzerLimits(discoveryOutput))
    items.push(this.checkScaleUp(discoveryOutput))

    const totalScore = items.reduce((sum, i) => sum + i.score, 0)
    const maxScore = items.reduce((sum, i) => sum + i.maxScore, 0)
    const normalizedScore = (totalScore / maxScore) * 10

    return {
      benchmarkType: 'domain_specific',
      score: normalizedScore,
      maxScore: 10,
      passed: normalizedScore >= 7.0,
      weight: 0.25,
      confidence: 0.85,
      items,
      metadata: {
        evaluationTimeMs: Date.now() - startTime,
        version: '1.0.0',
        checksRun: items.length,
      },
    }
  }

  // ============================================================================
  // Individual Checks
  // ============================================================================

  private checkThermodynamics(output: any): BenchmarkItemResult {
    const violations: ThermodynamicViolation[] = []
    const suggestions: string[] = []

    // Extract efficiency claims
    const efficiency = this.extractEfficiency(output)
    const domain = this.config.domain.toLowerCase()

    // Check solar efficiency against TRUE PHYSICAL LIMITS
    if ((domain.includes('solar') || domain.includes('photovoltaic')) && efficiency !== null) {
      const solarLimits = PHYSICAL_LIMITS.solar

      // Ultimate physical limit: 86.8% for infinite junction with max concentration
      if (efficiency > solarLimits.infiniteJunctionConcentrated.value) {
        violations.push({
          type: 'solar_efficiency',
          claimed: efficiency,
          limit: solarLimits.infiniteJunctionConcentrated.value,
          unit: 'η',
          severity: 'critical',
          description: `Solar efficiency ${(efficiency * 100).toFixed(1)}% exceeds ultimate thermodynamic limit (86.8%)`,
        })
      }
      // Check against appropriate limit based on architecture keywords
      else if (efficiency > solarLimits.shockleyQueisser.value) {
        const hasTandem = domain.includes('tandem') || domain.includes('multi-junction') || domain.includes('multijunction')
        const hasConcentrator = domain.includes('concentrator') || domain.includes('cpv')

        if (hasConcentrator && efficiency > solarLimits.infiniteJunction.value) {
          // Above 68.7% (1-sun infinite junction) but claims concentration
          violations.push({
            type: 'solar_efficiency',
            claimed: efficiency,
            limit: solarLimits.infiniteJunctionConcentrated.value,
            unit: 'η',
            severity: 'minor',
            description: `High concentration claim (${(efficiency * 100).toFixed(1)}%) - verify concentration ratio supports this`,
          })
        } else if (hasTandem) {
          // Tandem cell - check against appropriate junction limit
          if (efficiency > solarLimits.tandem3Junction.value) {
            violations.push({
              type: 'solar_efficiency',
              claimed: efficiency,
              limit: solarLimits.tandem3Junction.value,
              unit: 'η',
              severity: 'minor',
              description: `Efficiency ${(efficiency * 100).toFixed(1)}% exceeds 3-junction limit (51.5%) - verify >3 junctions`,
            })
          }
          // Else within tandem limits - valid
        } else {
          // Single-junction claim above S-Q limit
          violations.push({
            type: 'solar_efficiency',
            claimed: efficiency,
            limit: solarLimits.shockleyQueisser.value,
            unit: 'η',
            severity: 'minor',
            description: `Single-junction efficiency ${(efficiency * 100).toFixed(1)}% exceeds Shockley-Queisser limit (33.7%)`,
          })
          suggestions.push('Specify multi-junction/tandem architecture or concentration to justify efficiency >33.7%')
        }
      }
    }

    // Check wind efficiency
    if (domain.includes('wind') && efficiency !== null) {
      if (efficiency > DOMAIN_BENCHMARKS.energy.betz.value) {
        violations.push({
          type: 'wind_efficiency',
          claimed: efficiency,
          limit: DOMAIN_BENCHMARKS.energy.betz.value,
          unit: 'η',
          severity: 'major',
          description: 'Wind turbine efficiency exceeds Betz limit (59.3%)',
        })
      }
    }

    // Check heat engine / Carnot efficiency
    const carnotEfficiency = this.extractCarnotEfficiency(output)
    if (carnotEfficiency !== null && carnotEfficiency > 1.0) {
      violations.push({
        type: 'carnot_efficiency',
        claimed: carnotEfficiency,
        limit: 1.0,
        unit: 'η',
        severity: 'critical',
        description: 'Claimed efficiency violates second law of thermodynamics',
      })
    }

    // Score based on violations
    const majorViolations = violations.filter(v => v.severity === 'major' || v.severity === 'critical')
    const minorViolations = violations.filter(v => v.severity === 'minor')

    let score: number
    let passed: boolean
    let reasoning: string

    if (majorViolations.length > 0) {
      score = 0
      passed = false
      reasoning = `Major violations: ${majorViolations.map(v => v.description).join('; ')}`
    } else if (minorViolations.length === 0) {
      score = 2.0
      passed = true
      reasoning = 'All efficiency claims within thermodynamic limits'
    } else if (minorViolations.length <= 2) {
      score = 1.5
      passed = true
      reasoning = `Minor violations within tolerance: ${minorViolations.length}`
    } else {
      score = 0.5
      passed = false
      reasoning = `Too many minor violations: ${minorViolations.length}`
    }

    return {
      id: 'D1',
      name: 'Thermodynamic Consistency',
      score,
      maxScore: 2.0,
      passed,
      reasoning,
      evidence: violations.map(v => v.description),
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    }
  }

  private checkMaterialsFeasibility(output: any): BenchmarkItemResult {
    const issues: string[] = []
    const suggestions: string[] = []

    // Check for impossible material properties
    const materials = this.extractMaterials(output)

    for (const material of materials) {
      // Check tensile strength
      if (material.tensileStrength && material.tensileStrength > DOMAIN_BENCHMARKS.materials.maxTensileStrength.value) {
        issues.push(`${material.name}: Tensile strength ${material.tensileStrength} Pa exceeds maximum known (100 GPa)`)
      }

      // Check thermal conductivity
      if (material.thermalConductivity && material.thermalConductivity > DOMAIN_BENCHMARKS.materials.maxThermalConductivity.value) {
        issues.push(`${material.name}: Thermal conductivity ${material.thermalConductivity} W/m·K exceeds diamond (5000)`)
      }
    }

    const passed = issues.length === 0
    return {
      id: 'D2',
      name: 'Materials Feasibility',
      score: passed ? 1.5 : Math.max(0, 1.5 - issues.length * 0.5),
      maxScore: 1.5,
      passed,
      reasoning: passed ? 'Material properties within known ranges' : issues.join('; '),
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    }
  }

  private checkKinetics(output: any): BenchmarkItemResult {
    const issues: string[] = []

    // Check reaction rates
    const reactionRate = this.extractReactionRate(output)
    if (reactionRate !== null && reactionRate > DOMAIN_BENCHMARKS.kinetics.diffusionLimit.value) {
      issues.push(`Reaction rate ${reactionRate} M⁻¹s⁻¹ exceeds diffusion limit (10¹⁰)`)
    }

    const passed = issues.length === 0
    return {
      id: 'D3',
      name: 'Kinetics Plausibility',
      score: passed ? 1.0 : 0.5,
      maxScore: 1.0,
      passed,
      reasoning: passed ? 'Reaction kinetics within diffusion limits' : issues.join('; '),
    }
  }

  private checkConservationLaws(output: any): BenchmarkItemResult {
    const issues: string[] = []

    // Check energy balance
    const energyBalance = this.extractEnergyBalance(output)
    if (energyBalance !== null) {
      const imbalance = Math.abs(energyBalance.input - energyBalance.output)
      const tolerance = energyBalance.input * 0.05 // 5% tolerance

      if (imbalance > tolerance) {
        issues.push(`Energy imbalance: ${imbalance.toFixed(2)} ${energyBalance.unit} (${((imbalance / energyBalance.input) * 100).toFixed(1)}%)`)
      }
    }

    // Check mass balance
    const massBalance = this.extractMassBalance(output)
    if (massBalance !== null) {
      const imbalance = Math.abs(massBalance.input - massBalance.output)
      const tolerance = massBalance.input * 0.01 // 1% tolerance

      if (imbalance > tolerance) {
        issues.push(`Mass imbalance: ${imbalance.toFixed(4)} ${massBalance.unit}`)
      }
    }

    const passed = issues.length === 0
    return {
      id: 'D4',
      name: 'Conservation Laws',
      score: passed ? 1.5 : Math.max(0, 1.5 - issues.length * 0.5),
      maxScore: 1.5,
      passed,
      reasoning: passed ? 'Energy and mass balance maintained' : issues.join('; '),
    }
  }

  private checkBatteryLimits(output: any): BenchmarkItemResult {
    const issues: string[] = []
    const suggestions: string[] = []
    const notable: string[] = []  // Exceeds industry benchmarks but not physical limits

    const batterySpecs = this.extractBatterySpecs(output)
    if (!batterySpecs) {
      return {
        id: 'D5',
        name: 'Battery Limits',
        score: 1.0,
        maxScore: 1.0,
        passed: true,
        reasoning: 'No battery specifications to validate',
      }
    }

    // Check gravimetric energy density against TRUE PHYSICAL LIMITS
    if (batterySpecs.gravimetricEnergy) {
      const physicalLimits = PHYSICAL_LIMITS.battery
      const industryBenchmarks = INDUSTRY_BENCHMARKS.battery

      // PHYSICAL LIMIT VIOLATION: Above Li-F ultimate limit (6294 Wh/kg)
      if (batterySpecs.gravimetricEnergy > physicalLimits.liFTheoretical.value) {
        issues.push(
          `Gravimetric energy ${batterySpecs.gravimetricEnergy} Wh/kg exceeds ultimate electrochemical limit ` +
          `(${physicalLimits.liFTheoretical.value} Wh/kg for Li-F chemistry)`
        )
      }
      // Check chemistry-specific limits
      else if (batterySpecs.chemistry?.toLowerCase().includes('li-ion') ||
               batterySpecs.chemistry?.toLowerCase().includes('lithium-ion')) {
        if (batterySpecs.gravimetricEnergy > physicalLimits.liIonTheoretical.value) {
          issues.push(
            `Gravimetric energy ${batterySpecs.gravimetricEnergy} Wh/kg exceeds Li-ion theoretical limit ` +
            `(${physicalLimits.liIonTheoretical.value} Wh/kg)`
          )
        }
      }
      else if (batterySpecs.chemistry?.toLowerCase().includes('sulfur') ||
               batterySpecs.chemistry?.toLowerCase().includes('li-s')) {
        if (batterySpecs.gravimetricEnergy > physicalLimits.liSTheoretical.value) {
          issues.push(
            `Gravimetric energy ${batterySpecs.gravimetricEnergy} Wh/kg exceeds Li-S theoretical limit ` +
            `(${physicalLimits.liSTheoretical.value} Wh/kg)`
          )
        }
      }
      // For unspecified chemistry, use most permissive limit (Li-F) for physics check
      // but note if it exceeds industry benchmarks
      else {
        if (batterySpecs.gravimetricEnergy > industryBenchmarks.solidStateRecord.value) {
          notable.push(
            `Claimed ${batterySpecs.gravimetricEnergy} Wh/kg exceeds current solid-state record ` +
            `(${industryBenchmarks.solidStateRecord.value} Wh/kg) - verify chemistry supports this`
          )
          suggestions.push('Specify battery chemistry to validate against appropriate theoretical limit')
        }
      }
    }

    // Check cycle life - no hard physical limit, but note if exceptional
    if (batterySpecs.cycleLife && batterySpecs.cycleLife > 50000) {
      notable.push(`Exceptional cycle life (${batterySpecs.cycleLife}) - ensure stability mechanism is explained`)
    }

    const passed = issues.length === 0
    const hasNotable = notable.length > 0

    return {
      id: 'D5',
      name: 'Battery Limits',
      score: passed ? (hasNotable ? 0.8 : 1.0) : 0.3,
      maxScore: 1.0,
      passed,
      reasoning: passed
        ? (hasNotable ? `Within physical limits but notable: ${notable.join('; ')}` : 'Battery specifications within physical limits')
        : `Physical limit violations: ${issues.join('; ')}`,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    }
  }

  private checkElectrolyzerLimits(output: any): BenchmarkItemResult {
    const issues: string[] = []
    const suggestions: string[] = []

    const electrolyzerSpecs = this.extractElectrolyzerSpecs(output)
    if (!electrolyzerSpecs) {
      return {
        id: 'D6',
        name: 'Electrolyzer Limits',
        score: 1.0,
        maxScore: 1.0,
        passed: true,
        reasoning: 'No electrolyzer specifications to validate',
      }
    }

    const limits = DOMAIN_BENCHMARKS.electrolyzer

    // Check operating voltage
    if (electrolyzerSpecs.voltage) {
      const minVoltage = limits.minThermodynamicVoltage.value + limits.practicalOverpotential.value
      if (electrolyzerSpecs.voltage < minVoltage) {
        issues.push(`Operating voltage ${electrolyzerSpecs.voltage}V below practical minimum (${minVoltage}V)`)
      }
    }

    // Check efficiency claims
    if (electrolyzerSpecs.efficiency) {
      let maxEfficiency = limits.alkalineEfficiency.value

      if (electrolyzerSpecs.type === 'PEM') {
        maxEfficiency = limits.pemEfficiency.value
      } else if (electrolyzerSpecs.type === 'SOEC') {
        maxEfficiency = limits.soecEfficiency.value
      }

      if (electrolyzerSpecs.efficiency > maxEfficiency) {
        issues.push(`Efficiency ${(electrolyzerSpecs.efficiency * 100).toFixed(0)}% exceeds ${electrolyzerSpecs.type || 'electrolyzer'} maximum (${(maxEfficiency * 100).toFixed(0)}%)`)
      }
    }

    const passed = issues.length === 0
    return {
      id: 'D6',
      name: 'Electrolyzer Limits',
      score: passed ? 1.0 : 0.5,
      maxScore: 1.0,
      passed,
      reasoning: passed ? 'Electrolyzer specifications within physical limits' : issues.join('; '),
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    }
  }

  private checkScaleUp(output: any): BenchmarkItemResult {
    const concerns: string[] = []
    const suggestions: string[] = []

    // Check if lab-scale results can scale
    const scaleInfo = this.extractScaleInfo(output)

    if (scaleInfo?.labScale && !scaleInfo?.scaleUpPath) {
      concerns.push('No scale-up pathway identified for lab-scale results')
      suggestions.push('Include scale-up considerations for industrial implementation')
    }

    if (scaleInfo?.requiresRareMaterials) {
      concerns.push('Relies on rare or expensive materials that may limit scale-up')
    }

    const passed = concerns.length === 0
    return {
      id: 'D7',
      name: 'Scale-Up Feasibility',
      score: passed ? 1.0 : 0.5,
      maxScore: 1.0,
      passed,
      reasoning: passed ? 'Scale-up pathway identified' : concerns.join('; '),
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    }
  }

  // ============================================================================
  // Extraction Helpers
  // ============================================================================

  private extractEfficiency(output: any): number | null {
    const efficiency = output?.efficiency ||
                       output?.results?.efficiency ||
                       output?.simulation?.efficiency ||
                       output?.metrics?.efficiency

    if (typeof efficiency === 'number') {
      // Normalize to 0-1 range if given as percentage
      return efficiency > 1 ? efficiency / 100 : efficiency
    }
    return null
  }

  private extractCarnotEfficiency(output: any): number | null {
    const temps = output?.temperatures || output?.thermalCycle
    if (temps?.hot && temps?.cold) {
      return 1 - (temps.cold / temps.hot)
    }
    return null
  }

  private extractMaterials(output: any): Array<{
    name: string
    tensileStrength?: number
    thermalConductivity?: number
  }> {
    const materials = output?.materials || output?.components?.materials || []
    return Array.isArray(materials) ? materials : []
  }

  private extractReactionRate(output: any): number | null {
    return output?.kinetics?.rate ||
           output?.reaction?.rate ||
           output?.catalysis?.turnoverFrequency ||
           null
  }

  private extractEnergyBalance(output: any): { input: number; output: number; unit: string } | null {
    const balance = output?.energyBalance || output?.thermodynamics?.energyBalance
    if (balance?.input && balance?.output) {
      return {
        input: balance.input,
        output: balance.output,
        unit: balance.unit || 'kJ',
      }
    }
    return null
  }

  private extractMassBalance(output: any): { input: number; output: number; unit: string } | null {
    const balance = output?.massBalance || output?.stoichiometry?.massBalance
    if (balance?.input && balance?.output) {
      return {
        input: balance.input,
        output: balance.output,
        unit: balance.unit || 'kg',
      }
    }
    return null
  }

  private extractBatterySpecs(output: any): {
    gravimetricEnergy?: number
    cycleLife?: number
    chemistry?: string
  } | null {
    const battery = output?.battery || output?.storage?.battery || output?.electrochemical
    if (!battery) return null

    return {
      gravimetricEnergy: battery.gravimetricEnergy || battery.specificEnergy || battery.energyDensity,
      cycleLife: battery.cycleLife || battery.cycles,
      chemistry: battery.chemistry || battery.type,
    }
  }

  private extractElectrolyzerSpecs(output: any): {
    voltage?: number
    efficiency?: number
    type?: string
  } | null {
    const electrolyzer = output?.electrolyzer || output?.electrolysis || output?.hydrogen?.production
    if (!electrolyzer) return null

    return {
      voltage: electrolyzer.voltage || electrolyzer.operatingVoltage,
      efficiency: electrolyzer.efficiency,
      type: electrolyzer.type,
    }
  }

  private extractScaleInfo(output: any): {
    labScale?: boolean
    scaleUpPath?: boolean
    requiresRareMaterials?: boolean
  } | null {
    return {
      labScale: output?.scale === 'lab' || output?.experimental?.scale === 'lab',
      scaleUpPath: output?.scaleUp?.identified || output?.commercialization?.pathway,
      requiresRareMaterials: output?.materials?.some?.((m: any) => m.rare || m.critical),
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createDomainBenchmarkValidator(config?: Partial<DomainBenchmarkConfig>) {
  return new DomainBenchmarkValidator(config)
}
