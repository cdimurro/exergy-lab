/**
 * Benchmark Validation System
 *
 * Validates simulation results against published benchmarks and reference data.
 * Uses domain-specific benchmarks from NREL, DOE, and academic publications.
 *
 * @see uncertainty-quantifier.ts - Uncertainty analysis
 * @see ../types.ts - Simulation result types
 */

export interface BenchmarkCase {
  id: string
  name: string
  domain: Domain
  source: string
  citation?: string
  year: number
  inputs: BenchmarkInputs
  outputs: BenchmarkOutputs
  tolerance: number // Acceptable relative error
  conditions?: string
}

export interface BenchmarkInputs {
  [key: string]: number | string | boolean
}

export interface BenchmarkOutputs {
  [key: string]: {
    value: number
    unit: string
    uncertainty?: number
  }
}

export interface ValidationResult {
  benchmarkId: string
  benchmarkName: string
  passed: boolean
  metrics: MetricValidation[]
  overallError: number
  confidence: number
  details: string
}

export interface MetricValidation {
  name: string
  expected: number
  actual: number
  error: number // Relative error
  passed: boolean
  unit: string
}

export type Domain = 'solar' | 'wind' | 'battery' | 'hydrogen' | 'geothermal' | 'general'

// ============================================================================
// Benchmark Database
// ============================================================================

/**
 * Reference benchmarks from authoritative sources
 */
export const BENCHMARK_DATABASE: BenchmarkCase[] = [
  // ============================================================================
  // Solar PV Benchmarks
  // ============================================================================
  {
    id: 'nrel-sam-utility-pv-2024',
    name: 'NREL SAM Utility-Scale PV Reference',
    domain: 'solar',
    source: 'NREL System Advisor Model',
    citation: 'NREL/TP-6A20-80934',
    year: 2024,
    inputs: {
      systemCapacity: 100000, // 100 MW
      moduleType: 'premium',
      dcAcRatio: 1.3,
      tilt: 30,
      azimuth: 180,
      losses: 14,
      location: 'Daggett, CA',
    },
    outputs: {
      annualEnergy: { value: 186000000, unit: 'kWh', uncertainty: 0.03 }, // 186 GWh
      capacityFactor: { value: 0.212, unit: '', uncertainty: 0.02 },
      lcoe: { value: 0.028, unit: '$/kWh', uncertainty: 0.05 },
    },
    tolerance: 0.10,
    conditions: 'High DNI desert location, fixed-tilt ground mount',
  },
  {
    id: 'nrel-sam-residential-pv-2024',
    name: 'NREL SAM Residential PV Reference',
    domain: 'solar',
    source: 'NREL System Advisor Model',
    year: 2024,
    inputs: {
      systemCapacity: 6, // 6 kW
      moduleType: 'standard',
      dcAcRatio: 1.2,
      tilt: 25,
      azimuth: 180,
      losses: 14,
      location: 'Phoenix, AZ',
    },
    outputs: {
      annualEnergy: { value: 10200, unit: 'kWh', uncertainty: 0.05 },
      capacityFactor: { value: 0.194, unit: '', uncertainty: 0.03 },
      specificYield: { value: 1700, unit: 'kWh/kWp', uncertainty: 0.05 },
    },
    tolerance: 0.12,
    conditions: 'Residential rooftop, south-facing',
  },
  {
    id: 'shockley-queisser-limit',
    name: 'Shockley-Queisser Efficiency Limit',
    domain: 'solar',
    source: 'Shockley & Queisser (1961)',
    citation: 'J. Appl. Phys. 32, 510',
    year: 1961,
    inputs: {
      bandgap: 1.34, // eV - optimal for single junction
      solarSpectrum: 'AM1.5G',
      concentration: 1,
    },
    outputs: {
      maxEfficiency: { value: 0.337, unit: '', uncertainty: 0.001 },
      openCircuitVoltage: { value: 1.06, unit: 'V', uncertainty: 0.01 },
    },
    tolerance: 0.02,
    conditions: 'Single junction, unconcentrated, 300K',
  },

  // ============================================================================
  // Wind Energy Benchmarks
  // ============================================================================
  {
    id: 'nrel-windtoolkit-class3',
    name: 'NREL Wind Toolkit Class 3 Reference',
    domain: 'wind',
    source: 'NREL Wind Integration National Dataset',
    year: 2024,
    inputs: {
      hubHeight: 80,
      rotorDiameter: 100,
      ratedPower: 2000, // 2 MW
      cutInSpeed: 3,
      ratedSpeed: 11,
      cutOutSpeed: 25,
      windClass: 3,
    },
    outputs: {
      capacityFactor: { value: 0.35, unit: '', uncertainty: 0.05 },
      annualEnergy: { value: 6132000, unit: 'kWh', uncertainty: 0.08 },
      availabilityFactor: { value: 0.95, unit: '', uncertainty: 0.02 },
    },
    tolerance: 0.15,
    conditions: 'IEC Class III site, moderate wind resource',
  },
  {
    id: 'betz-limit-theoretical',
    name: 'Betz Limit Theoretical Maximum',
    domain: 'wind',
    source: 'Betz (1920)',
    year: 1920,
    inputs: {
      windSpeed: 12,
      airDensity: 1.225,
      rotorArea: 7854, // 100m diameter
    },
    outputs: {
      maxPowerCoefficient: { value: 0.593, unit: '', uncertainty: 0.001 },
      maxPowerExtraction: { value: 16 / 27, unit: '', uncertainty: 0.0001 },
    },
    tolerance: 0.01,
    conditions: 'Ideal actuator disk, no losses',
  },

  // ============================================================================
  // Battery Storage Benchmarks
  // ============================================================================
  {
    id: 'nrel-battery-utility-2024',
    name: 'NREL Utility Battery Storage Reference',
    domain: 'battery',
    source: 'NREL Annual Technology Baseline 2024',
    citation: 'NREL ATB 2024',
    year: 2024,
    inputs: {
      capacity: 100, // 100 MWh
      power: 25, // 25 MW (4-hour)
      technology: 'lithium-ion',
      depth_of_discharge: 0.8,
    },
    outputs: {
      roundTripEfficiency: { value: 0.86, unit: '', uncertainty: 0.02 },
      cycleLife: { value: 6000, unit: 'cycles', uncertainty: 0.10 },
      lcosLevelized: { value: 0.085, unit: '$/kWh', uncertainty: 0.15 },
    },
    tolerance: 0.15,
    conditions: 'Utility-scale LFP, 4-hour duration',
  },
  {
    id: 'doe-battery-degradation-model',
    name: 'DOE Battery Degradation Reference',
    domain: 'battery',
    source: 'DOE/NREL Battery Lifetime Model',
    year: 2023,
    inputs: {
      temperature: 25, // Celsius
      cRate: 0.5,
      depthOfDischarge: 0.8,
      initialCapacity: 100,
      yearsOfOperation: 10,
    },
    outputs: {
      capacityRetention: { value: 0.80, unit: '', uncertainty: 0.05 },
      calendarDegradation: { value: 0.02, unit: '/year', uncertainty: 0.01 },
      cycleDegradation: { value: 0.00008, unit: '/cycle', uncertainty: 0.00002 },
    },
    tolerance: 0.20,
    conditions: 'LFP chemistry, moderate cycling',
  },

  // ============================================================================
  // Hydrogen Benchmarks
  // ============================================================================
  {
    id: 'doe-hydrogen-pem-electrolyzer',
    name: 'DOE PEM Electrolyzer Reference',
    domain: 'hydrogen',
    source: 'DOE Hydrogen and Fuel Cells Program Record',
    citation: 'DOE Record 23003',
    year: 2023,
    inputs: {
      power: 1000, // 1 MW
      technology: 'PEM',
      pressure: 30, // bar
      temperature: 80, // Celsius
    },
    outputs: {
      efficiency: { value: 0.65, unit: '', uncertainty: 0.03 },
      specificEnergy: { value: 54, unit: 'kWh/kg H2', uncertainty: 0.05 },
      productionRate: { value: 18.5, unit: 'kg H2/hr', uncertainty: 0.05 },
    },
    tolerance: 0.12,
    conditions: 'Commercial PEM stack, BOL performance',
  },
  {
    id: 'doe-hydrogen-alkaline-electrolyzer',
    name: 'DOE Alkaline Electrolyzer Reference',
    domain: 'hydrogen',
    source: 'DOE Hydrogen and Fuel Cells Program',
    year: 2023,
    inputs: {
      power: 1000, // 1 MW
      technology: 'alkaline',
      pressure: 1, // bar
      temperature: 80, // Celsius
    },
    outputs: {
      efficiency: { value: 0.70, unit: '', uncertainty: 0.03 },
      specificEnergy: { value: 50, unit: 'kWh/kg H2', uncertainty: 0.05 },
      productionRate: { value: 20, unit: 'kg H2/hr', uncertainty: 0.05 },
    },
    tolerance: 0.12,
    conditions: 'Commercial alkaline stack',
  },

  // ============================================================================
  // Geothermal Benchmarks
  // ============================================================================
  {
    id: 'nrel-geothermal-binary',
    name: 'NREL Geothermal Binary Plant Reference',
    domain: 'geothermal',
    source: 'NREL Geothermal Prospector',
    year: 2024,
    inputs: {
      resourceTemp: 150, // Celsius
      flowRate: 100, // kg/s
      ambientTemp: 20, // Celsius
      plantType: 'binary',
    },
    outputs: {
      thermalEfficiency: { value: 0.12, unit: '', uncertainty: 0.02 },
      capacityFactor: { value: 0.90, unit: '', uncertainty: 0.03 },
      netPower: { value: 5000, unit: 'kW', uncertainty: 0.10 },
    },
    tolerance: 0.15,
    conditions: 'Medium-temperature hydrothermal resource',
  },
]

// ============================================================================
// Benchmark Validator
// ============================================================================

export class BenchmarkValidator {
  private benchmarks: BenchmarkCase[]

  constructor(additionalBenchmarks?: BenchmarkCase[]) {
    this.benchmarks = [...BENCHMARK_DATABASE, ...(additionalBenchmarks || [])]
  }

  /**
   * Find applicable benchmarks for a given domain and inputs
   */
  findApplicableBenchmarks(
    domain: Domain,
    inputs: Record<string, unknown>
  ): BenchmarkCase[] {
    return this.benchmarks.filter(b => {
      if (b.domain !== domain && b.domain !== 'general') return false

      // Check if inputs are compatible
      const inputKeys = Object.keys(inputs)
      const benchmarkInputKeys = Object.keys(b.inputs)

      // At least 50% of benchmark inputs should be present
      const matchingKeys = benchmarkInputKeys.filter(k =>
        inputKeys.some(ik => this.keysMatch(ik, k))
      )

      return matchingKeys.length >= benchmarkInputKeys.length * 0.5
    })
  }

  /**
   * Validate simulation results against a specific benchmark
   */
  validateAgainstBenchmark(
    benchmark: BenchmarkCase,
    results: Record<string, number | { value: number; unit?: string }>
  ): ValidationResult {
    const metrics: MetricValidation[] = []
    let totalError = 0
    let passedCount = 0

    for (const [outputName, expected] of Object.entries(benchmark.outputs)) {
      const actual = this.getResultValue(results, outputName)

      if (actual === undefined) continue

      const error = Math.abs(actual - expected.value) / expected.value
      const tolerance = expected.uncertainty
        ? Math.max(benchmark.tolerance, expected.uncertainty * 2)
        : benchmark.tolerance
      const passed = error <= tolerance

      if (passed) passedCount++
      totalError += error

      metrics.push({
        name: outputName,
        expected: expected.value,
        actual,
        error,
        passed,
        unit: expected.unit,
      })
    }

    const overallError = metrics.length > 0 ? totalError / metrics.length : 1
    const confidence = metrics.length > 0 ? passedCount / metrics.length : 0

    const passed = confidence >= 0.5 && overallError <= benchmark.tolerance * 1.5

    return {
      benchmarkId: benchmark.id,
      benchmarkName: benchmark.name,
      passed,
      metrics,
      overallError,
      confidence,
      details: this.generateValidationDetails(benchmark, metrics, passed),
    }
  }

  /**
   * Validate against all applicable benchmarks
   */
  validateAll(
    domain: Domain,
    inputs: Record<string, unknown>,
    results: Record<string, number | { value: number; unit?: string }>
  ): ValidationResult[] {
    const applicableBenchmarks = this.findApplicableBenchmarks(domain, inputs)

    return applicableBenchmarks.map(b => this.validateAgainstBenchmark(b, results))
  }

  /**
   * Get best matching benchmark for a simulation
   */
  getBestMatch(
    domain: Domain,
    inputs: Record<string, unknown>
  ): BenchmarkCase | undefined {
    const applicable = this.findApplicableBenchmarks(domain, inputs)

    if (applicable.length === 0) return undefined

    // Score by input similarity
    return applicable.reduce((best, current) => {
      const bestScore = this.calculateInputSimilarity(best.inputs, inputs)
      const currentScore = this.calculateInputSimilarity(current.inputs, inputs)
      return currentScore > bestScore ? current : best
    })
  }

  /**
   * Get benchmark by ID
   */
  getBenchmark(id: string): BenchmarkCase | undefined {
    return this.benchmarks.find(b => b.id === id)
  }

  /**
   * Get all benchmarks for a domain
   */
  getBenchmarksForDomain(domain: Domain): BenchmarkCase[] {
    return this.benchmarks.filter(b => b.domain === domain || b.domain === 'general')
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private getResultValue(
    results: Record<string, number | { value: number; unit?: string }>,
    key: string
  ): number | undefined {
    // Try exact match
    if (key in results) {
      const val = results[key]
      return typeof val === 'number' ? val : val.value
    }

    // Try case-insensitive match
    const lowerKey = key.toLowerCase()
    for (const [k, v] of Object.entries(results)) {
      if (k.toLowerCase() === lowerKey || this.keysMatch(k, key)) {
        return typeof v === 'number' ? v : v.value
      }
    }

    return undefined
  }

  private keysMatch(key1: string, key2: string): boolean {
    const normalize = (k: string) => k.toLowerCase().replace(/[_-]/g, '')
    return normalize(key1) === normalize(key2)
  }

  private calculateInputSimilarity(
    benchmarkInputs: BenchmarkInputs,
    testInputs: Record<string, unknown>
  ): number {
    let matches = 0
    let total = 0

    for (const [key, value] of Object.entries(benchmarkInputs)) {
      total++
      const testValue = this.findMatchingInput(testInputs, key)

      if (testValue !== undefined) {
        if (typeof value === 'number' && typeof testValue === 'number') {
          // Check if within 50% of benchmark value
          if (Math.abs(value - testValue) / value < 0.5) {
            matches++
          }
        } else if (value === testValue) {
          matches++
        }
      }
    }

    return total > 0 ? matches / total : 0
  }

  private findMatchingInput(
    inputs: Record<string, unknown>,
    key: string
  ): unknown {
    if (key in inputs) return inputs[key]

    const lowerKey = key.toLowerCase()
    for (const [k, v] of Object.entries(inputs)) {
      if (this.keysMatch(k, key)) return v
    }

    return undefined
  }

  private generateValidationDetails(
    benchmark: BenchmarkCase,
    metrics: MetricValidation[],
    passed: boolean
  ): string {
    const passedMetrics = metrics.filter(m => m.passed)
    const failedMetrics = metrics.filter(m => !m.passed)

    let details = `Validated against ${benchmark.name} (${benchmark.source}, ${benchmark.year}). `

    if (passed) {
      details += `PASSED: ${passedMetrics.length}/${metrics.length} metrics within tolerance. `
    } else {
      details += `FAILED: ${failedMetrics.length}/${metrics.length} metrics exceeded tolerance. `
    }

    if (failedMetrics.length > 0) {
      const worst = failedMetrics.reduce((a, b) => a.error > b.error ? a : b)
      details += `Largest deviation: ${worst.name} (${(worst.error * 100).toFixed(1)}% error). `
    }

    if (benchmark.conditions) {
      details += `Conditions: ${benchmark.conditions}.`
    }

    return details
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a benchmark validator
 */
export function createBenchmarkValidator(
  additionalBenchmarks?: BenchmarkCase[]
): BenchmarkValidator {
  return new BenchmarkValidator(additionalBenchmarks)
}

/**
 * Validate simulation results against benchmarks
 */
export function validateSimulation(
  domain: Domain,
  inputs: Record<string, unknown>,
  results: Record<string, number | { value: number; unit?: string }>
): ValidationResult[] {
  const validator = new BenchmarkValidator()
  return validator.validateAll(domain, inputs, results)
}
