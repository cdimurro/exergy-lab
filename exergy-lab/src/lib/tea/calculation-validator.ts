/**
 * Calculation Validator
 *
 * Validates TEA calculations for:
 * - Dimensional consistency
 * - Physical constraints
 * - Technology-specific ranges
 * - Cross-validation against published examples
 *
 * Prevents calculation errors from propagating to final reports
 */

import type { TEAInput_v2, TEAResult_v2, CalculationProvenance, TechnologyType } from '@/types/tea'

export interface ValidationCheck {
  metric: string
  checkType: 'dimensional' | 'physical' | 'benchmark' | 'cross-validation'
  passed: boolean
  severity: 'critical' | 'major' | 'minor'
  message: string
  expectedRange?: { min: number; max: number; unit: string }
  actualValue: { value: number; unit: string }
  deviation?: number // percentage
  reference?: string
}

export interface CalculationValidationResult {
  valid: boolean
  overallConfidence: number // 0-100
  checks: ValidationCheck[]
  criticalIssues: string[]
  warnings: string[]
  recommendations: string[]
}

/**
 * Technology-specific benchmark ranges
 * Based on NETL, IEA, NREL, and published literature
 */
const TECHNOLOGY_BENCHMARKS: Record<
  TechnologyType,
  {
    lcoe: { min: number; max: number } // $/kWh
    capexPerKW: { min: number; max: number } // $/kW
    opexPerKWYear: { min: number; max: number } // $/kW-year
    capacityFactor: { min: number; max: number } // percentage
    lifetime: { min: number; max: number } // years
  }
> = {
  solar: {
    lcoe: { min: 0.02, max: 0.12 },
    capexPerKW: { min: 600, max: 2000 },
    opexPerKWYear: { min: 10, max: 40 },
    capacityFactor: { min: 15, max: 30 },
    lifetime: { min: 20, max: 35 },
  },
  wind: {
    lcoe: { min: 0.02, max: 0.09 },
    capexPerKW: { min: 1000, max: 2500 },
    opexPerKWYear: { min: 25, max: 60 },
    capacityFactor: { min: 25, max: 50 },
    lifetime: { min: 20, max: 30 },
  },
  offshore_wind: {
    lcoe: { min: 0.05, max: 0.15 },
    capexPerKW: { min: 2500, max: 5500 },
    opexPerKWYear: { min: 60, max: 150 },
    capacityFactor: { min: 35, max: 60 },
    lifetime: { min: 20, max: 30 },
  },
  hydrogen: {
    lcoe: { min: 0.05, max: 0.20 },
    capexPerKW: { min: 500, max: 2000 },
    opexPerKWYear: { min: 20, max: 80 },
    capacityFactor: { min: 30, max: 95 },
    lifetime: { min: 20, max: 30 },
  },
  storage: {
    lcoe: { min: 0.05, max: 0.15 },
    capexPerKW: { min: 300, max: 1500 },
    opexPerKWYear: { min: 5, max: 30 },
    capacityFactor: { min: 10, max: 40 },
    lifetime: { min: 10, max: 20 },
  },
  nuclear: {
    lcoe: { min: 0.06, max: 0.15 },
    capexPerKW: { min: 5000, max: 10000 },
    opexPerKWYear: { min: 80, max: 150 },
    capacityFactor: { min: 85, max: 95 },
    lifetime: { min: 40, max: 60 },
  },
  geothermal: {
    lcoe: { min: 0.04, max: 0.10 },
    capexPerKW: { min: 2000, max: 5000 },
    opexPerKWYear: { min: 100, max: 250 },
    capacityFactor: { min: 70, max: 95 },
    lifetime: { min: 25, max: 35 },
  },
  hydro: {
    lcoe: { min: 0.03, max: 0.12 },
    capexPerKW: { min: 1000, max: 4000 },
    opexPerKWYear: { min: 15, max: 50 },
    capacityFactor: { min: 30, max: 70 },
    lifetime: { min: 50, max: 100 },
  },
  biomass: {
    lcoe: { min: 0.06, max: 0.18 },
    capexPerKW: { min: 2000, max: 6000 },
    opexPerKWYear: { min: 100, max: 300 },
    capacityFactor: { min: 60, max: 85 },
    lifetime: { min: 20, max: 30 },
  },
  generic: {
    lcoe: { min: 0.01, max: 0.50 },
    capexPerKW: { min: 100, max: 15000 },
    opexPerKWYear: { min: 5, max: 500 },
    capacityFactor: { min: 5, max: 100 },
    lifetime: { min: 10, max: 100 },
  },
}

/**
 * Physical constraints (absolute limits)
 */
const PHYSICAL_CONSTRAINTS = {
  capacityFactor: { min: 0, max: 100 }, // percentage
  efficiency: { min: 0, max: 100 }, // percentage
  lifetime: { min: 1, max: 100 }, // years
  discountRate: { min: 0, max: 50 }, // percentage
  temperature: { min: -273.15, max: 3000 }, // °C (absolute zero to practical max)
  pressure: { min: 0, max: 100 }, // MPa (practical limits)
  irr: { min: -100, max: 1000 }, // percentage (allow wide range for validation)
}

/**
 * Calculation Validator Class
 */
export class CalculationValidator {
  private input: TEAInput_v2
  private results: TEAResult_v2
  private provenance: CalculationProvenance[]
  private checks: ValidationCheck[] = []

  constructor(input: TEAInput_v2, results: TEAResult_v2, provenance: CalculationProvenance[] = []) {
    this.input = input
    this.results = results
    this.provenance = provenance
  }

  /**
   * Perform comprehensive validation
   */
  validate(): CalculationValidationResult {
    // Reset checks
    this.checks = []

    // 1. Dimensional consistency checks
    this.validateDimensions()

    // 2. Physical constraint checks
    this.validatePhysicalConstraints()

    // 3. Technology-specific benchmark checks
    this.validateAgainstBenchmarks()

    // 4. Cross-validation checks (economic metrics consistency)
    this.validateCrossConsistency()

    // 5. Formula validation (if provenance available)
    if (this.provenance.length > 0) {
      this.validateFormulas()
    }

    // Analyze results
    const criticalIssues = this.checks.filter(c => !c.passed && c.severity === 'critical').map(c => c.message)

    const warnings = this.checks.filter(c => !c.passed && c.severity !== 'critical').map(c => c.message)

    const valid = criticalIssues.length === 0
    const overallConfidence = this.calculateConfidence()
    const recommendations = this.generateRecommendations()

    return {
      valid,
      overallConfidence,
      checks: this.checks,
      criticalIssues,
      warnings,
      recommendations,
    }
  }

  /**
   * Validate dimensional consistency
   */
  private validateDimensions() {
    // LCOE should be in $/kWh (reasonable range)
    this.checks.push({
      metric: 'LCOE',
      checkType: 'dimensional',
      passed: this.results.lcoe > 0 && this.results.lcoe < 10, // $0-10/kWh is reasonable
      severity: 'critical',
      message:
        this.results.lcoe > 0 && this.results.lcoe < 10
          ? 'LCOE within reasonable range'
          : `LCOE (${this.results.lcoe} $/kWh) outside reasonable range (0-10 $/kWh)`,
      actualValue: { value: this.results.lcoe, unit: '$/kWh' },
    })

    // NPV should be in reasonable range (not astronomical)
    const capexMagnitude = this.results.total_capex
    const reasonableNPVRange = capexMagnitude * 5 // NPV shouldn't be more than 5x CAPEX

    this.checks.push({
      metric: 'NPV',
      checkType: 'dimensional',
      passed: Math.abs(this.results.npv) < reasonableNPVRange,
      severity: 'major',
      message:
        Math.abs(this.results.npv) < reasonableNPVRange
          ? 'NPV magnitude reasonable'
          : `NPV (${this.results.npv}) exceeds reasonable range relative to CAPEX`,
      actualValue: { value: this.results.npv, unit: 'USD' },
    })

    // IRR should be percentage
    this.checks.push({
      metric: 'IRR',
      checkType: 'dimensional',
      passed:
        this.results.irr >= PHYSICAL_CONSTRAINTS.irr.min && this.results.irr <= PHYSICAL_CONSTRAINTS.irr.max,
      severity: 'major',
      message:
        this.results.irr >= PHYSICAL_CONSTRAINTS.irr.min && this.results.irr <= PHYSICAL_CONSTRAINTS.irr.max
          ? 'IRR within reasonable range'
          : `IRR (${this.results.irr}%) outside reasonable range (${PHYSICAL_CONSTRAINTS.irr.min}-${PHYSICAL_CONSTRAINTS.irr.max}%)`,
      actualValue: { value: this.results.irr, unit: '%' },
    })
  }

  /**
   * Validate physical constraints
   */
  private validatePhysicalConstraints() {
    // Capacity factor
    this.checks.push({
      metric: 'Capacity Factor',
      checkType: 'physical',
      passed:
        this.input.capacity_factor >= PHYSICAL_CONSTRAINTS.capacityFactor.min &&
        this.input.capacity_factor <= PHYSICAL_CONSTRAINTS.capacityFactor.max,
      severity: 'critical',
      message:
        this.input.capacity_factor >= PHYSICAL_CONSTRAINTS.capacityFactor.min &&
        this.input.capacity_factor <= PHYSICAL_CONSTRAINTS.capacityFactor.max
          ? 'Capacity factor within physical limits'
          : `Capacity factor (${this.input.capacity_factor}%) outside physical limits (0-100%)`,
      actualValue: { value: this.input.capacity_factor, unit: '%' },
      expectedRange: PHYSICAL_CONSTRAINTS.capacityFactor,
    })

    // Project lifetime
    this.checks.push({
      metric: 'Project Lifetime',
      checkType: 'physical',
      passed:
        this.input.project_lifetime_years >= PHYSICAL_CONSTRAINTS.lifetime.min &&
        this.input.project_lifetime_years <= PHYSICAL_CONSTRAINTS.lifetime.max,
      severity: 'major',
      message:
        this.input.project_lifetime_years >= PHYSICAL_CONSTRAINTS.lifetime.min &&
        this.input.project_lifetime_years <= PHYSICAL_CONSTRAINTS.lifetime.max
          ? 'Project lifetime reasonable'
          : `Project lifetime (${this.input.project_lifetime_years} years) outside typical range`,
      actualValue: { value: this.input.project_lifetime_years, unit: 'years' },
      expectedRange: PHYSICAL_CONSTRAINTS.lifetime,
    })

    // Payback period should be less than project lifetime
    this.checks.push({
      metric: 'Payback Period',
      checkType: 'physical',
      passed: this.results.payback_years <= this.input.project_lifetime_years,
      severity: 'critical',
      message:
        this.results.payback_years <= this.input.project_lifetime_years
          ? 'Payback period within project lifetime'
          : `Payback period (${this.results.payback_years} years) exceeds project lifetime (${this.input.project_lifetime_years} years)`,
      actualValue: { value: this.results.payback_years, unit: 'years' },
    })
  }

  /**
   * Validate against technology-specific benchmarks
   */
  private validateAgainstBenchmarks() {
    const technology = this.input.technology_type
    const benchmarks = TECHNOLOGY_BENCHMARKS[technology]

    if (!benchmarks) {
      this.checks.push({
        metric: 'Technology Benchmarks',
        checkType: 'benchmark',
        passed: false,
        severity: 'minor',
        message: `No benchmarks available for technology type: ${technology}`,
        actualValue: { value: 0, unit: 'N/A' },
      })
      return
    }

    // Validate LCOE against benchmarks
    const lcoeInRange = this.results.lcoe >= benchmarks.lcoe.min && this.results.lcoe <= benchmarks.lcoe.max

    this.checks.push({
      metric: 'LCOE vs Benchmark',
      checkType: 'benchmark',
      passed: lcoeInRange,
      severity: lcoeInRange ? 'minor' : 'major',
      message: lcoeInRange
        ? `LCOE within benchmark range for ${technology}`
        : `LCOE (${this.results.lcoe} $/kWh) outside benchmark range for ${technology}`,
      expectedRange: { ...benchmarks.lcoe, unit: '$/kWh' },
      actualValue: { value: this.results.lcoe, unit: '$/kWh' },
      deviation: this.calculateDeviation(this.results.lcoe, benchmarks.lcoe),
      reference: `NETL/IEA benchmarks for ${technology}`,
    })

    // Validate CAPEX per kW
    const capexPerKW = this.input.capex_per_kw
    const capexInRange =
      capexPerKW >= benchmarks.capexPerKW.min && capexPerKW <= benchmarks.capexPerKW.max

    this.checks.push({
      metric: 'CAPEX per kW',
      checkType: 'benchmark',
      passed: capexInRange,
      severity: capexInRange ? 'minor' : 'major',
      message: capexInRange
        ? `CAPEX within benchmark range for ${technology}`
        : `CAPEX (${capexPerKW} $/kW) outside benchmark range for ${technology}`,
      expectedRange: { ...benchmarks.capexPerKW, unit: '$/kW' },
      actualValue: { value: capexPerKW, unit: '$/kW' },
      deviation: this.calculateDeviation(capexPerKW, benchmarks.capexPerKW),
      reference: `Industry benchmarks for ${technology}`,
    })

    // Validate capacity factor
    const cfInRange =
      this.input.capacity_factor >= benchmarks.capacityFactor.min &&
      this.input.capacity_factor <= benchmarks.capacityFactor.max

    this.checks.push({
      metric: 'Capacity Factor',
      checkType: 'benchmark',
      passed: cfInRange,
      severity: cfInRange ? 'minor' : 'major',
      message: cfInRange
        ? `Capacity factor typical for ${technology}`
        : `Capacity factor (${this.input.capacity_factor}%) outside typical range for ${technology}`,
      expectedRange: { ...benchmarks.capacityFactor, unit: '%' },
      actualValue: { value: this.input.capacity_factor, unit: '%' },
      deviation: this.calculateDeviation(this.input.capacity_factor, benchmarks.capacityFactor),
      reference: `Typical capacity factors for ${technology}`,
    })
  }

  /**
   * Validate cross-consistency between metrics
   */
  private validateCrossConsistency() {
    // NPV and IRR relationship
    // If NPV > 0, then IRR > discount rate
    // If NPV < 0, then IRR < discount rate
    // If NPV = 0, then IRR = discount rate
    const npvPositive = this.results.npv > 0
    const irrAboveDiscount = this.results.irr > this.input.discount_rate
    const consistent = (npvPositive && irrAboveDiscount) || (!npvPositive && !irrAboveDiscount)

    this.checks.push({
      metric: 'NPV-IRR Consistency',
      checkType: 'cross-validation',
      passed: consistent,
      severity: 'critical',
      message: consistent
        ? 'NPV and IRR are consistent'
        : `NPV (${this.results.npv}) and IRR (${this.results.irr}%) are inconsistent. NPV > 0 should imply IRR > discount rate.`,
      actualValue: {
        value: this.results.irr - this.input.discount_rate,
        unit: 'percentage points',
      },
    })

    // Total CAPEX should equal sum of components
    if (this.input.capexDetailed) {
      const calculatedTotal = this.results.total_capex
      const componentSum =
        (this.input.capexDetailed.toc?.total || 0) ||
        (this.input.capexDetailed.tpc?.total || 0) ||
        (this.input.capexDetailed.epcc?.total || 0)

      if (componentSum > 0) {
        const difference = Math.abs(calculatedTotal - componentSum)
        const tolerancePercent = 0.01 // 1%

        this.checks.push({
          metric: 'CAPEX Component Sum',
          checkType: 'cross-validation',
          passed: difference / calculatedTotal < tolerancePercent,
          severity: 'major',
          message:
            difference / calculatedTotal < tolerancePercent
              ? 'CAPEX components sum correctly'
              : `CAPEX total (${calculatedTotal}) doesn't match component sum (${componentSum})`,
          actualValue: { value: difference, unit: 'USD' },
        })
      }
    }

    // Annual production should match capacity * capacity factor * hours
    const expectedProduction = this.input.capacity_mw * this.input.capacity_factor * 8760 * 1000 // kWh
    const actualProduction = this.input.annual_production_mwh || 0

    if (actualProduction > 0) {
      const productionDifference = Math.abs(actualProduction - expectedProduction) / expectedProduction

      this.checks.push({
        metric: 'Annual Production',
        checkType: 'cross-validation',
        passed: productionDifference < 0.05, // 5% tolerance
        severity: 'major',
        message:
          productionDifference < 0.05
            ? 'Annual production consistent with capacity and capacity factor'
            : `Annual production (${actualProduction} kWh) inconsistent with capacity (${this.input.capacity_mw} MW) and CF (${this.input.capacity_factor}%)`,
        actualValue: { value: actualProduction, unit: 'kWh/year' },
        expectedRange: {
          min: expectedProduction * 0.95,
          max: expectedProduction * 1.05,
          unit: 'kWh/year',
        },
      })
    }
  }

  /**
   * Validate formulas (if provenance available)
   */
  private validateFormulas() {
    for (const prov of this.provenance) {
      // Check if formula is documented
      const formulaDocumented = prov.formula && prov.formula.length > 0

      this.checks.push({
        metric: `${prov.metric} Formula`,
        checkType: 'dimensional',
        passed: formulaDocumented,
        severity: formulaDocumented ? 'minor' : 'major',
        message: formulaDocumented
          ? `Formula documented for ${prov.metric}`
          : `Formula not documented for ${prov.metric}`,
        actualValue: { value: formulaDocumented ? 1 : 0, unit: 'boolean' },
      })

      // Check if references provided
      const referencesProvided = prov.references && prov.references.length > 0

      this.checks.push({
        metric: `${prov.metric} References`,
        checkType: 'dimensional',
        passed: referencesProvided,
        severity: 'minor',
        message: referencesProvided
          ? `References provided for ${prov.metric}`
          : `No references for ${prov.metric}`,
        actualValue: { value: referencesProvided ? 1 : 0, unit: 'boolean' },
      })
    }
  }

  /**
   * Calculate deviation from benchmark range
   */
  private calculateDeviation(value: number, range: { min: number; max: number }): number {
    if (value < range.min) {
      return ((range.min - value) / range.min) * -100
    } else if (value > range.max) {
      return ((value - range.max) / range.max) * 100
    }
    return 0 // Within range
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(): number {
    if (this.checks.length === 0) return 0

    const totalChecks = this.checks.length
    const passedChecks = this.checks.filter(c => c.passed).length
    const criticalFailed = this.checks.filter(c => !c.passed && c.severity === 'critical').length

    // Base confidence on pass rate
    let confidence = (passedChecks / totalChecks) * 100

    // Penalize critical failures heavily
    confidence -= criticalFailed * 20

    // Ensure 0-100 range
    return Math.max(0, Math.min(100, Math.round(confidence)))
  }

  /**
   * Generate validation recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = []

    const failedCritical = this.checks.filter(c => !c.passed && c.severity === 'critical')
    const failedMajor = this.checks.filter(c => !c.passed && c.severity === 'major')

    if (failedCritical.length > 0) {
      recommendations.push(
        `CRITICAL: ${failedCritical.length} critical validation(s) failed. Must be resolved before report generation.`
      )
      failedCritical.forEach(check => {
        recommendations.push(`- ${check.message}`)
      })
    }

    if (failedMajor.length > 0) {
      recommendations.push(`${failedMajor.length} major validation(s) failed. Review recommended.`)
    }

    const outOfBenchmark = this.checks.filter(
      c => c.checkType === 'benchmark' && !c.passed
    )

    if (outOfBenchmark.length > 0) {
      recommendations.push(
        'Some results are outside typical benchmark ranges. Verify assumptions and input data.'
      )
    }

    if (recommendations.length === 0) {
      recommendations.push('All validation checks passed. Calculations appear correct.')
    }

    return recommendations
  }
}

/**
 * Convenience function for validation
 */
export function validateCalculations(
  input: TEAInput_v2,
  results: TEAResult_v2,
  provenance: CalculationProvenance[] = []
): CalculationValidationResult {
  const validator = new CalculationValidator(input, results, provenance)
  return validator.validate()
}

/**
 * Validate specific metric against reference value
 */
export function validateMetric(
  metricName: string,
  calculated: number,
  reference: number,
  tolerance: number = 0.05
): { valid: boolean; deviation: number; message: string } {
  const deviation = Math.abs((calculated - reference) / reference)
  const valid = deviation <= tolerance

  return {
    valid,
    deviation: deviation * 100, // as percentage
    message: valid
      ? `${metricName} within ${tolerance * 100}% of reference`
      : `${metricName} deviates ${(deviation * 100).toFixed(1)}% from reference (tolerance: ${tolerance * 100}%)`,
  }
}
