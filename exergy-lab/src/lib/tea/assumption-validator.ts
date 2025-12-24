/**
 * Assumption Validator
 *
 * Validates all TEA assumptions for:
 * - Source documentation
 * - Reasonableness against industry data
 * - Consistency with other assumptions
 * - Uncertainty quantification
 *
 * Ensures high-quality, defensible assumptions for TEA reports
 */

import type { TEAInput_v2, TechnologyType } from '@/types/tea'

export interface AssumptionCheck {
  parameter: string
  value: number | string
  unit: string
  source: string
  validated: boolean
  confidence: number // 0-100
  severity: 'high' | 'medium' | 'low' // Impact on results
  issues: string[]
  recommendations: string[]
  benchmarkComparison?: {
    typical: number
    range: { min: number; max: number }
    deviation: number // percentage
  }
}

export interface AssumptionValidationResult {
  overallQuality: 'excellent' | 'good' | 'fair' | 'poor'
  documentationScore: number // 0-100
  consistencyScore: number // 0-100
  uncertaintyScore: number // 0-100
  checks: AssumptionCheck[]
  highImpactAssumptions: string[]
  undocumentedAssumptions: string[]
  recommendations: string[]
}

/**
 * Industry-standard default values and typical ranges
 * Based on NETL, IEA, World Bank, and regional data
 */
const ASSUMPTION_BENCHMARKS = {
  financial: {
    discountRate: { typical: 8, min: 3, max: 15, unit: '%', source: 'NETL QGESS' },
    debtRatio: { typical: 50, min: 0, max: 80, unit: '%', source: 'Project finance standards' },
    interestRate: { typical: 6, min: 2, max: 12, unit: '%', source: 'Market rates' },
    taxRate: { typical: 25, min: 0, max: 40, unit: '%', source: 'Regional tax codes' },
    inflationRate: { typical: 2.5, min: 0, max: 10, unit: '%', source: 'Central bank data' },
  },
  operational: {
    capacityFactor: {
      solar: { typical: 22, min: 15, max: 30, unit: '%' },
      wind: { typical: 35, min: 25, max: 50, unit: '%' },
      offshore_wind: { typical: 45, min: 35, max: 60, unit: '%' },
      hydrogen: { typical: 90, min: 60, max: 95, unit: '%' },
      storage: { typical: 25, min: 10, max: 40, unit: '%' },
      nuclear: { typical: 90, min: 85, max: 95, unit: '%' },
      geothermal: { typical: 85, min: 70, max: 95, unit: '%' },
      hydro: { typical: 45, min: 30, max: 70, unit: '%' },
      biomass: { typical: 75, min: 60, max: 85, unit: '%' },
      generic: { typical: 50, min: 20, max: 90, unit: '%' },
    } as Record<TechnologyType, { typical: number; min: number; max: number; unit: string }>,
    degradationRate: {
      solar: { typical: 0.5, min: 0.2, max: 1.0, unit: '%/year' },
      wind: { typical: 0.3, min: 0.1, max: 0.8, unit: '%/year' },
      storage: { typical: 2.0, min: 1.0, max: 3.0, unit: '%/year' },
      offshore_wind: { typical: 0.3, min: 0.1, max: 0.8, unit: '%/year' },
      hydrogen: { typical: 0.5, min: 0.2, max: 1.0, unit: '%/year' },
      nuclear: { typical: 0.2, min: 0.1, max: 0.5, unit: '%/year' },
      geothermal: { typical: 0.5, min: 0.2, max: 1.0, unit: '%/year' },
      hydro: { typical: 0.1, min: 0.05, max: 0.3, unit: '%/year' },
      biomass: { typical: 0.5, min: 0.2, max: 1.0, unit: '%/year' },
      generic: { typical: 0.5, min: 0.2, max: 1.5, unit: '%/year' },
    } as Record<TechnologyType, { typical: number; min: number; max: number; unit: string }>,
    plantAvailability: { typical: 95, min: 85, max: 99, unit: '%', source: 'Industry average' },
  },
  economic: {
    laborCostUS: { typical: 50, min: 30, max: 100, unit: '$/hour', source: 'BLS data' },
    maintenanceCost: { typical: 2, min: 1, max: 5, unit: '% of CAPEX/year', source: 'Industry average' },
    insuranceRate: { typical: 0.5, min: 0.3, max: 1.5, unit: '% of CAPEX/year', source: 'Industry average' },
  },
}

/**
 * Assumption Validator Class
 */
export class AssumptionValidator {
  private input: TEAInput_v2
  private checks: AssumptionCheck[] = []

  constructor(input: TEAInput_v2) {
    this.input = input
  }

  /**
   * Perform comprehensive assumption validation
   */
  validate(): AssumptionValidationResult {
    // Reset checks
    this.checks = []

    // Validate financial assumptions
    this.validateFinancialAssumptions()

    // Validate operational assumptions
    this.validateOperationalAssumptions()

    // Validate economic assumptions
    this.validateEconomicAssumptions()

    // Validate technology-specific assumptions
    this.validateTechnologyAssumptions()

    // Check for mutual consistency
    this.validateMutualConsistency()

    // Analyze results
    const documentationScore = this.calculateDocumentationScore()
    const consistencyScore = this.calculateConsistencyScore()
    const uncertaintyScore = this.calculateUncertaintyScore()

    const overallQuality = this.determineOverallQuality(
      documentationScore,
      consistencyScore,
      uncertaintyScore
    )

    const highImpactAssumptions = this.identifyHighImpactAssumptions()
    const undocumentedAssumptions = this.checks
      .filter(c => !c.source || c.source === 'default' || c.source === 'unknown')
      .map(c => c.parameter)

    const recommendations = this.generateRecommendations()

    return {
      overallQuality,
      documentationScore,
      consistencyScore,
      uncertaintyScore,
      checks: this.checks,
      highImpactAssumptions,
      undocumentedAssumptions,
      recommendations,
    }
  }

  /**
   * Validate financial assumptions
   */
  private validateFinancialAssumptions() {
    // Discount rate
    this.addAssumptionCheck(
      'Discount Rate',
      this.input.discount_rate,
      '%',
      ASSUMPTION_BENCHMARKS.financial.discountRate,
      'high'
    )

    // Debt ratio
    if (this.input.debt_ratio !== undefined) {
      this.addAssumptionCheck(
        'Debt Ratio',
        this.input.debt_ratio * 100,
        '%',
        ASSUMPTION_BENCHMARKS.financial.debtRatio,
        'high'
      )
    }

    // Interest rate
    if (this.input.interest_rate !== undefined) {
      this.addAssumptionCheck(
        'Interest Rate',
        this.input.interest_rate,
        '%',
        ASSUMPTION_BENCHMARKS.financial.interestRate,
        'medium'
      )
    }

    // Tax rate
    this.addAssumptionCheck(
      'Tax Rate',
      this.input.tax_rate,
      '%',
      ASSUMPTION_BENCHMARKS.financial.taxRate,
      'high'
    )

    // Project lifetime
    const lifetimeBenchmark = { typical: 25, min: 10, max: 50, unit: 'years', source: 'Industry standard' }
    this.addAssumptionCheck(
      'Project Lifetime',
      this.input.project_lifetime_years,
      'years',
      lifetimeBenchmark,
      'high'
    )
  }

  /**
   * Validate operational assumptions
   */
  private validateOperationalAssumptions() {
    const technology = this.input.technology_type

    // Capacity factor
    const cfBenchmark = ASSUMPTION_BENCHMARKS.operational.capacityFactor[technology]
    if (cfBenchmark) {
      this.addAssumptionCheck(
        'Capacity Factor',
        this.input.capacity_factor,
        '%',
        { ...cfBenchmark, source: `Typical for ${technology}` },
        'high'
      )
    }

    // Degradation rate (if applicable)
    if (this.input.performanceData?.degradation) {
      const degradationBenchmark = ASSUMPTION_BENCHMARKS.operational.degradationRate[technology]
      if (degradationBenchmark) {
        this.addAssumptionCheck(
          'Degradation Rate',
          this.input.performanceData.degradation.annual,
          '%/year',
          { ...degradationBenchmark, source: `Typical for ${technology}` },
          'medium'
        )
      }
    }
  }

  /**
   * Validate economic assumptions
   */
  private validateEconomicAssumptions() {
    // Insurance rate
    if (this.input.insurance_rate !== undefined) {
      this.addAssumptionCheck(
        'Insurance Rate',
        this.input.insurance_rate,
        '% of CAPEX',
        ASSUMPTION_BENCHMARKS.economic.insuranceRate,
        'low'
      )
    }

    // Electricity price (region-specific, harder to validate)
    if (this.input.electricity_price_per_mwh) {
      const electricityCheck: AssumptionCheck = {
        parameter: 'Electricity Price',
        value: this.input.electricity_price_per_mwh,
        unit: '$/MWh',
        source: 'user input or default',
        validated: false,
        confidence: 50, // Low confidence without regional validation
        severity: 'high',
        issues: ['Regional electricity prices vary widely. Verify local market rates.'],
        recommendations: ['Validate against regional grid operator data or IEA statistics'],
      }
      this.checks.push(electricityCheck)
    }
  }

  /**
   * Validate technology-specific assumptions
   */
  private validateTechnologyAssumptions() {
    // This would include technology-specific validations
    // For example, solar PV module efficiency, wind turbine power curve, etc.
    // To be expanded based on technology type
  }

  /**
   * Validate mutual consistency between assumptions
   */
  private validateMutualConsistency() {
    const issues: string[] = []

    // Check 1: Debt ratio + Equity ratio should = 100%
    if (this.input.debt_ratio !== undefined) {
      const equityRatio = this.input.financialDetailed?.financing.equityFraction || 1 - this.input.debt_ratio
      const sum = this.input.debt_ratio + equityRatio
      if (Math.abs(sum - 1.0) > 0.01) {
        issues.push(`Debt ratio (${this.input.debt_ratio}) + Equity ratio (${equityRatio}) should equal 1.0`)
      }
    }

    // Check 2: Depreciation years should be ≤ project lifetime
    if (this.input.depreciation_years > this.input.project_lifetime_years) {
      issues.push(
        `Depreciation period (${this.input.depreciation_years} years) exceeds project lifetime (${this.input.project_lifetime_years} years)`
      )
    }

    // Check 3: CAPEX per kW should align with installation factor
    const baseEquipmentCost = this.input.capex_per_kw
    const installationFactor = this.input.installation_factor
    if (installationFactor < 1.0) {
      issues.push(
        `Installation factor (${installationFactor}) is less than 1.0, which is unrealistic. Should be ≥ 1.1.`
      )
    }

    // Add consistency check result
    this.checks.push({
      parameter: 'Mutual Consistency',
      value: 'Checked',
      unit: 'N/A',
      source: 'Cross-validation',
      validated: issues.length === 0,
      confidence: issues.length === 0 ? 100 : 50,
      severity: 'high',
      issues,
      recommendations:
        issues.length > 0
          ? ['Resolve consistency issues between assumptions']
          : ['Assumptions are mutually consistent'],
    })
  }

  /**
   * Add an assumption check
   */
  private addAssumptionCheck(
    parameter: string,
    value: number,
    unit: string,
    benchmark: { typical: number; min: number; max: number; source: string },
    severity: 'high' | 'medium' | 'low'
  ) {
    const issues: string[] = []
    const recommendations: string[] = []
    let validated = true
    let confidence = 80

    // Check if within reasonable range
    if (value < benchmark.min || value > benchmark.max) {
      validated = false
      confidence = 40
      issues.push(`Value (${value} ${unit}) outside typical range (${benchmark.min}-${benchmark.max} ${unit})`)
      recommendations.push(`Verify ${parameter} assumption. Typical value: ${benchmark.typical} ${unit}`)
    }

    // Calculate deviation from typical
    const deviation = ((value - benchmark.typical) / benchmark.typical) * 100

    this.checks.push({
      parameter,
      value,
      unit,
      source: benchmark.source,
      validated,
      confidence,
      severity,
      issues,
      recommendations,
      benchmarkComparison: {
        typical: benchmark.typical,
        range: { min: benchmark.min, max: benchmark.max },
        deviation,
      },
    })
  }

  /**
   * Calculate documentation score
   */
  private calculateDocumentationScore(): number {
    const totalChecks = this.checks.length
    if (totalChecks === 0) return 0

    const documented = this.checks.filter(
      c => c.source && c.source !== 'default' && c.source !== 'unknown'
    ).length

    return Math.round((documented / totalChecks) * 100)
  }

  /**
   * Calculate consistency score
   */
  private calculateConsistencyScore(): number {
    const totalChecks = this.checks.length
    if (totalChecks === 0) return 0

    const consistent = this.checks.filter(c => c.validated).length

    return Math.round((consistent / totalChecks) * 100)
  }

  /**
   * Calculate uncertainty quantification score
   */
  private calculateUncertaintyScore(): number {
    // Check if uncertainty parameters are defined
    if (this.input.uncertaintyParams && this.input.uncertaintyParams.length > 0) {
      const highImpactParams = this.checks.filter(c => c.severity === 'high')
      const quantified = this.input.uncertaintyParams.length

      if (highImpactParams.length === 0) return 100

      const coverage = Math.min(1, quantified / highImpactParams.length)
      return Math.round(coverage * 100)
    }

    return 0 // No uncertainty quantification
  }

  /**
   * Determine overall quality
   */
  private determineOverallQuality(
    documentation: number,
    consistency: number,
    uncertainty: number
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    const average = (documentation + consistency + uncertainty) / 3

    if (average >= 90) return 'excellent'
    if (average >= 75) return 'good'
    if (average >= 60) return 'fair'
    return 'poor'
  }

  /**
   * Identify high-impact assumptions
   */
  private identifyHighImpactAssumptions(): string[] {
    return this.checks.filter(c => c.severity === 'high').map(c => c.parameter)
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = []

    const undocumented = this.checks.filter(c => !c.source || c.source === 'default').length
    if (undocumented > 0) {
      recommendations.push(`Document sources for ${undocumented} assumption(s)`)
    }

    const outOfRange = this.checks.filter(c => !c.validated).length
    if (outOfRange > 0) {
      recommendations.push(
        `${outOfRange} assumption(s) outside typical ranges. Verify or justify these values.`
      )
    }

    const highImpactUndocumented = this.checks.filter(
      c => c.severity === 'high' && (!c.source || c.source === 'default')
    )
    if (highImpactUndocumented.length > 0) {
      recommendations.push(
        `PRIORITY: Document high-impact assumptions: ${highImpactUndocumented.map(c => c.parameter).join(', ')}`
      )
    }

    if (!this.input.uncertaintyParams || this.input.uncertaintyParams.length === 0) {
      recommendations.push('Quantify uncertainty for critical assumptions using probability distributions')
    }

    // Add specific recommendations from individual checks
    this.checks.forEach(check => {
      if (check.recommendations.length > 0) {
        recommendations.push(...check.recommendations)
      }
    })

    // Deduplicate
    return Array.from(new Set(recommendations))
  }
}

/**
 * Convenience function for validation
 */
export function validateAssumptions(input: TEAInput_v2): AssumptionValidationResult {
  const validator = new AssumptionValidator(input)
  return validator.validate()
}

/**
 * Check if a specific assumption is well-justified
 */
export function isAssumptionJustified(
  parameter: string,
  value: number,
  source: string,
  uncertainty?: { distribution: string; params: any }
): {
  justified: boolean
  confidence: number
  issues: string[]
} {
  const issues: string[] = []
  let confidence = 100

  // Check source quality
  if (!source || source === 'default' || source === 'unknown') {
    confidence -= 40
    issues.push('No documented source provided')
  } else if (source.includes('peer-reviewed') || source.includes('published')) {
    confidence += 0 // Already at max
  } else if (source.includes('industry') || source.includes('database')) {
    confidence -= 10
  } else {
    confidence -= 20
    issues.push('Source quality unclear')
  }

  // Check uncertainty quantification
  if (!uncertainty) {
    confidence -= 20
    issues.push('Uncertainty not quantified')
  }

  // Value reasonableness (basic check)
  if (value < 0 && !parameter.includes('NPV')) {
    confidence -= 30
    issues.push('Negative value for non-NPV parameter')
  }

  const justified = confidence >= 60

  return {
    justified,
    confidence: Math.max(0, Math.min(100, confidence)),
    issues,
  }
}

/**
 * Generate assumption documentation template
 */
export function generateAssumptionDocumentation(checks: AssumptionCheck[]): string {
  let doc = '# TEA Assumptions Documentation\n\n'

  doc += '## Summary\n'
  doc += `Total assumptions: ${checks.length}\n`
  doc += `Documented: ${checks.filter(c => c.source && c.source !== 'default').length}\n`
  doc += `Validated: ${checks.filter(c => c.validated).length}\n\n`

  doc += '## High-Impact Assumptions\n\n'
  const highImpact = checks.filter(c => c.severity === 'high')
  for (const check of highImpact) {
    doc += `### ${check.parameter}\n`
    doc += `- **Value**: ${check.value} ${check.unit}\n`
    doc += `- **Source**: ${check.source}\n`
    doc += `- **Confidence**: ${check.confidence}%\n`
    if (check.benchmarkComparison) {
      doc += `- **Typical Value**: ${check.benchmarkComparison.typical} ${check.unit}\n`
      doc += `- **Range**: ${check.benchmarkComparison.range.min}-${check.benchmarkComparison.range.max} ${check.unit}\n`
      doc += `- **Deviation**: ${check.benchmarkComparison.deviation.toFixed(1)}%\n`
    }
    if (check.issues.length > 0) {
      doc += `- **Issues**: ${check.issues.join('; ')}\n`
    }
    doc += '\n'
  }

  doc += '## Medium-Impact Assumptions\n\n'
  const mediumImpact = checks.filter(c => c.severity === 'medium')
  for (const check of mediumImpact) {
    doc += `- **${check.parameter}**: ${check.value} ${check.unit} (Source: ${check.source})\n`
  }

  return doc
}
