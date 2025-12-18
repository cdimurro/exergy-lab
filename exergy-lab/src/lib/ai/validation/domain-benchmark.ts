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
// Domain Benchmarks Database
// ============================================================================

export const DOMAIN_BENCHMARKS: DomainBenchmarks = {
  // Energy conversion limits
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
      value: 2.87e-21, // kT*ln(2) at 300K in Joules
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

  // Battery-specific limits (per Grok feedback)
  battery: {
    liIonGravimetric: {
      name: 'Li-ion Practical Limit',
      value: 300,
      unit: 'Wh/kg',
      context: 'Practical lithium-ion battery',
    },
    liSGravimetric: {
      name: 'Li-S Theoretical Limit',
      value: 500,
      unit: 'Wh/kg',
      context: 'Lithium-sulfur theoretical maximum',
    },
    solidStateMax: {
      name: 'Solid-State Limit',
      value: 400,
      unit: 'Wh/kg',
      context: 'Solid-state battery theoretical',
    },
    cycleLifeMax: {
      name: 'Max Cycle Life',
      value: 10000,
      unit: 'cycles',
      context: 'LFP best case scenario',
    },
  },

  // Electrolyzer limits (per Grok feedback)
  electrolyzer: {
    minThermodynamicVoltage: {
      name: 'Thermodynamic Voltage',
      value: 1.23,
      unit: 'V',
      context: 'Reversible potential at 25°C',
    },
    practicalOverpotential: {
      name: 'Min Practical Overpotential',
      value: 0.3,
      unit: 'V',
      context: 'Minimum practical overpotential',
    },
    alkalineEfficiency: {
      name: 'Alkaline Efficiency',
      value: 0.70,
      unit: '',
      context: 'Alkaline electrolyzer best case',
    },
    pemEfficiency: {
      name: 'PEM Efficiency',
      value: 0.80,
      unit: '',
      context: 'PEM electrolyzer best case',
    },
    soecEfficiency: {
      name: 'SOEC Efficiency',
      value: 0.90,
      unit: '',
      context: 'SOEC with heat recovery',
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

    // Check solar efficiency
    if ((domain.includes('solar') || domain.includes('photovoltaic')) && efficiency !== null) {
      if (efficiency > DOMAIN_BENCHMARKS.energy.shockleyQueisser.value) {
        if (efficiency > 0.86) { // Concentrated solar max
          violations.push({
            type: 'solar_efficiency',
            claimed: efficiency,
            limit: 0.86,
            unit: 'η',
            severity: 'major',
            description: 'Solar efficiency exceeds concentrated solar maximum (86%)',
          })
        } else {
          violations.push({
            type: 'solar_efficiency',
            claimed: efficiency,
            limit: DOMAIN_BENCHMARKS.energy.shockleyQueisser.value,
            unit: 'η',
            severity: 'minor',
            description: 'Solar efficiency exceeds Shockley-Queisser limit (33.7%) - valid for multi-junction only',
          })
          suggestions.push('Specify multi-junction or tandem cell architecture to justify higher efficiency')
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

    // Check gravimetric energy density
    if (batterySpecs.gravimetricEnergy) {
      const limits = DOMAIN_BENCHMARKS.battery

      if (batterySpecs.gravimetricEnergy > limits.liSGravimetric.value) {
        issues.push(`Gravimetric energy ${batterySpecs.gravimetricEnergy} Wh/kg exceeds Li-S theoretical limit (500)`)
      } else if (batterySpecs.gravimetricEnergy > limits.liIonGravimetric.value) {
        // Above practical Li-ion, check if they specify advanced chemistry
        if (!batterySpecs.chemistry?.includes('solid') && !batterySpecs.chemistry?.includes('sulfur')) {
          suggestions.push('Specify advanced battery chemistry (solid-state, Li-S) to justify high energy density')
        }
      }
    }

    // Check cycle life
    if (batterySpecs.cycleLife && batterySpecs.cycleLife > DOMAIN_BENCHMARKS.battery.cycleLifeMax.value) {
      issues.push(`Cycle life ${batterySpecs.cycleLife} exceeds best-case LFP (10,000 cycles)`)
    }

    const passed = issues.length === 0
    return {
      id: 'D5',
      name: 'Battery Limits',
      score: passed ? 1.0 : 0.5,
      maxScore: 1.0,
      passed,
      reasoning: passed ? 'Battery specifications within known limits' : issues.join('; '),
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
