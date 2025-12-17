/**
 * Result Validator
 *
 * Validates workflow results against scientific knowledge and benchmarks.
 * Ensures conclusions are plausible and consistent with established facts.
 *
 * Features:
 * - Physical plausibility checking
 * - Range validation against domain benchmarks
 * - Literature consistency checking
 * - Cross-reference validation
 */

import type {
  WorkflowContext,
  ResearchFindings,
  Hypothesis,
  SimulationResult,
  AnalysisConclusion,
} from './workflow-context'

/**
 * Validation result types
 */
export interface ValidationResult {
  isValid: boolean
  overallScore: number // 0-100
  checks: ValidationCheck[]
  warnings: ValidationWarning[]
  errors: ValidationError[]
  recommendations: string[]
}

export interface ValidationCheck {
  name: string
  category: ValidationCategory
  passed: boolean
  score: number // 0-100
  details: string
  evidence?: string[]
}

export interface ValidationWarning {
  category: ValidationCategory
  message: string
  severity: 'low' | 'medium' | 'high'
  suggestion?: string
}

export interface ValidationError {
  category: ValidationCategory
  message: string
  fatal: boolean
  context?: Record<string, any>
}

export type ValidationCategory =
  | 'physical_plausibility'
  | 'range_validation'
  | 'literature_consistency'
  | 'internal_consistency'
  | 'methodology'
  | 'data_quality'

/**
 * Physical constants and benchmarks for validation
 */
const PHYSICAL_BENCHMARKS = {
  // Solar PV
  solar: {
    maxPanelEfficiency: 0.47, // Multi-junction lab record
    typicalPanelEfficiency: { min: 0.15, max: 0.23 },
    maxCapacityFactor: 0.35, // Best desert locations
    typicalCapacityFactor: { min: 0.10, max: 0.25 },
    specificYield: { min: 800, max: 2500 }, // kWh/kWp/year
    degradationRate: { min: 0.003, max: 0.01 }, // per year
    temperatureCoefficient: { min: -0.005, max: -0.003 }, // per °C
  },

  // Wind
  wind: {
    betzLimit: 0.593,
    maxTurbineEfficiency: 0.50,
    typicalTurbineEfficiency: { min: 0.35, max: 0.45 },
    maxCapacityFactor: 0.55, // Offshore wind best
    typicalCapacityFactor: { min: 0.25, max: 0.45 },
    cutInSpeed: { min: 2, max: 5 }, // m/s
    ratedSpeed: { min: 10, max: 15 }, // m/s
    cutOutSpeed: { min: 20, max: 30 }, // m/s
  },

  // Battery storage
  battery: {
    maxRoundTripEfficiency: 0.98, // Lab conditions
    typicalRoundTripEfficiency: { min: 0.85, max: 0.95 },
    lithiumCycleLife: { min: 2000, max: 10000 },
    selfDischargeRate: { min: 0.00001, max: 0.001 }, // per hour
    depthOfDischarge: { min: 0.8, max: 0.95 },
  },

  // Hydrogen
  hydrogen: {
    lhv: 33.33, // kWh/kg
    hhv: 39.4, // kWh/kg
    pemEfficiency: { min: 0.55, max: 0.75 },
    alkalineEfficiency: { min: 0.50, max: 0.70 },
    soecEfficiency: { min: 0.75, max: 0.95 },
    fuelCellEfficiency: { min: 0.40, max: 0.60 },
    waterConsumption: { min: 9, max: 12 }, // L/kg H2
  },

  // TEA metrics
  tea: {
    lcoe: {
      utilitySolar: { min: 0.02, max: 0.05 },
      rooftopSolar: { min: 0.06, max: 0.15 },
      onshoreWind: { min: 0.025, max: 0.055 },
      offshoreWind: { min: 0.07, max: 0.15 },
      nuclear: { min: 0.10, max: 0.20 },
      naturalGas: { min: 0.04, max: 0.08 },
      coal: { min: 0.06, max: 0.15 },
      battery: { min: 0.10, max: 0.30 }, // $/kWh discharged
      hydrogen: { min: 2, max: 8 }, // $/kg
    },
    discountRate: { min: 0.03, max: 0.15 },
    projectLifetime: {
      solar: { min: 20, max: 35 },
      wind: { min: 20, max: 30 },
      battery: { min: 10, max: 20 },
      electrolyzer: { min: 10, max: 25 },
    },
  },

  // Emissions
  emissions: {
    lifecycleIntensity: { // g CO2/kWh
      solar: { min: 20, max: 60 },
      wind: { min: 7, max: 15 },
      hydro: { min: 10, max: 50 },
      nuclear: { min: 5, max: 20 },
      naturalGas: { min: 400, max: 550 },
      coal: { min: 700, max: 1000 },
    },
  },

  // Thermodynamic limits
  thermodynamics: {
    carnotEfficiencyMax: (Th: number, Tc: number) => 1 - Tc / Th,
    secondLawEfficiency: { max: 1.0 },
    heatPumpCOPMax: (Th: number, Tc: number) => Th / (Th - Tc), // Heating
  },
}

/**
 * Known scientific facts that should not be contradicted
 */
const ESTABLISHED_FACTS = [
  {
    statement: 'Solar panel efficiency cannot exceed the Shockley-Queisser limit of ~33% for single-junction cells',
    field: 'solar-energy',
    check: (value: number) => value <= 0.33,
    parameter: 'single_junction_efficiency',
  },
  {
    statement: 'Wind turbine efficiency cannot exceed the Betz limit of 59.3%',
    field: 'wind-energy',
    check: (value: number) => value <= 0.593,
    parameter: 'turbine_efficiency',
  },
  {
    statement: 'Round-trip battery efficiency cannot exceed 100%',
    field: 'battery-storage',
    check: (value: number) => value <= 1.0,
    parameter: 'round_trip_efficiency',
  },
  {
    statement: 'Electrolyzer efficiency cannot exceed 100% of LHV basis',
    field: 'hydrogen-fuel',
    check: (value: number) => value <= 1.0,
    parameter: 'electrolyzer_efficiency_lhv',
  },
  {
    statement: 'Heat pump COP is limited by Carnot efficiency',
    field: 'energy-efficiency',
    check: (cop: number, Th: number, Tc: number) => cop <= Th / (Th - Tc),
    parameter: 'heat_pump_cop',
  },
  {
    statement: 'Energy cannot be created or destroyed (First Law of Thermodynamics)',
    field: 'general',
    check: (energyIn: number, energyOut: number) => energyOut <= energyIn * 1.01, // 1% tolerance
    parameter: 'energy_balance',
  },
]

/**
 * Validate simulation results
 */
export function validateSimulationResults(
  results: SimulationResult[],
  domain: string
): ValidationResult {
  const checks: ValidationCheck[] = []
  const warnings: ValidationWarning[] = []
  const errors: ValidationError[] = []

  for (const result of results) {
    // Check convergence
    if (result.convergenceMetrics) {
      const converged = result.convergenceMetrics.converged
      checks.push({
        name: 'Simulation Convergence',
        category: 'methodology',
        passed: converged,
        score: converged ? 100 : 30,
        details: converged
          ? `Simulation converged with residual ${result.convergenceMetrics.residual}`
          : 'Simulation did not converge - results may be unreliable',
      })

      if (!converged) {
        warnings.push({
          category: 'methodology',
          message: 'Simulation did not converge',
          severity: 'high',
          suggestion: 'Increase iterations or check parameter bounds',
        })
      }

      // Check residual magnitude
      const residualRatio = result.convergenceMetrics.residual / result.convergenceMetrics.tolerance
      if (residualRatio > 0.5 && residualRatio < 1) {
        warnings.push({
          category: 'data_quality',
          message: `Residual (${result.convergenceMetrics.residual}) is close to tolerance`,
          severity: 'medium',
          suggestion: 'Consider tightening convergence criteria',
        })
      }
    }

    // Validate outputs against physical limits
    for (const output of result.outputs || []) {
      const validation = validateOutputAgainstBenchmarks(output, result.type, domain)
      if (validation) {
        checks.push(validation.check)
        if (validation.warning) warnings.push(validation.warning)
        if (validation.error) errors.push(validation.error)
      }
    }
  }

  // Calculate overall score
  const passedChecks = checks.filter(c => c.passed).length
  const overallScore = checks.length > 0
    ? Math.round((passedChecks / checks.length) * 100)
    : 50

  return {
    isValid: errors.filter(e => e.fatal).length === 0 && overallScore >= 60,
    overallScore,
    checks,
    warnings,
    errors,
    recommendations: generateRecommendations(checks, warnings, errors),
  }
}

/**
 * Validate output value against benchmarks
 */
function validateOutputAgainstBenchmarks(
  output: { name: string; value: number; unit: string; confidence?: number },
  simulationType: string,
  domain: string
): { check: ValidationCheck; warning?: ValidationWarning; error?: ValidationError } | null {
  const { name, value, unit } = output
  const nameLower = name.toLowerCase()

  // Solar validations
  if (simulationType?.includes('solar') || domain?.includes('solar')) {
    if (nameLower.includes('efficiency')) {
      const effValue = unit === '%' ? value / 100 : value
      const benchmark = PHYSICAL_BENCHMARKS.solar.typicalPanelEfficiency
      const isPlausible = effValue >= benchmark.min * 0.5 && effValue <= PHYSICAL_BENCHMARKS.solar.maxPanelEfficiency

      return {
        check: {
          name: `Solar Efficiency Plausibility`,
          category: 'physical_plausibility',
          passed: isPlausible,
          score: isPlausible ? 90 : 20,
          details: `Efficiency ${(effValue * 100).toFixed(1)}% ${isPlausible ? 'is within' : 'exceeds'} physical limits`,
        },
        warning: !isPlausible ? {
          category: 'physical_plausibility',
          message: `Solar efficiency ${(effValue * 100).toFixed(1)}% may be unrealistic`,
          severity: effValue > PHYSICAL_BENCHMARKS.solar.maxPanelEfficiency ? 'high' : 'medium',
        } : undefined,
        error: effValue > PHYSICAL_BENCHMARKS.solar.maxPanelEfficiency ? {
          category: 'physical_plausibility',
          message: `Solar efficiency ${(effValue * 100).toFixed(1)}% exceeds physical maximum`,
          fatal: true,
        } : undefined,
      }
    }

    if (nameLower.includes('capacity factor')) {
      const cfValue = unit === '%' ? value / 100 : value
      const isPlausible = cfValue >= 0.05 && cfValue <= PHYSICAL_BENCHMARKS.solar.maxCapacityFactor

      return {
        check: {
          name: `Solar Capacity Factor Plausibility`,
          category: 'range_validation',
          passed: isPlausible,
          score: isPlausible ? 85 : 30,
          details: `Capacity factor ${(cfValue * 100).toFixed(1)}% ${isPlausible ? 'is reasonable' : 'is unusual'}`,
        },
        warning: cfValue > PHYSICAL_BENCHMARKS.solar.maxCapacityFactor ? {
          category: 'range_validation',
          message: `Solar capacity factor ${(cfValue * 100).toFixed(1)}% is unusually high`,
          severity: 'medium',
          suggestion: 'Check location irradiance assumptions',
        } : undefined,
      }
    }

    if (nameLower.includes('specific yield') || nameLower.includes('kwh/kwp')) {
      const benchmark = PHYSICAL_BENCHMARKS.solar.specificYield
      const isPlausible = value >= benchmark.min * 0.5 && value <= benchmark.max * 1.2

      return {
        check: {
          name: `Specific Yield Plausibility`,
          category: 'range_validation',
          passed: isPlausible,
          score: isPlausible ? 85 : 25,
          details: `Specific yield ${value} kWh/kWp ${isPlausible ? 'matches' : 'outside'} expected range`,
        },
      }
    }
  }

  // Wind validations
  if (simulationType?.includes('wind') || domain?.includes('wind')) {
    if (nameLower.includes('capacity factor')) {
      const cfValue = unit === '%' ? value / 100 : value
      const isPlausible = cfValue >= 0.15 && cfValue <= PHYSICAL_BENCHMARKS.wind.maxCapacityFactor

      return {
        check: {
          name: `Wind Capacity Factor Plausibility`,
          category: 'range_validation',
          passed: isPlausible,
          score: isPlausible ? 85 : 30,
          details: `Capacity factor ${(cfValue * 100).toFixed(1)}% ${isPlausible ? 'is reasonable' : 'is unusual'}`,
        },
      }
    }
  }

  // Battery validations
  if (simulationType?.includes('battery') || domain?.includes('battery')) {
    if (nameLower.includes('round-trip efficiency') || nameLower.includes('round trip')) {
      const effValue = unit === '%' ? value / 100 : value
      const benchmark = PHYSICAL_BENCHMARKS.battery.typicalRoundTripEfficiency
      const isPlausible = effValue >= benchmark.min * 0.9 && effValue <= PHYSICAL_BENCHMARKS.battery.maxRoundTripEfficiency

      return {
        check: {
          name: `Battery Efficiency Plausibility`,
          category: 'physical_plausibility',
          passed: isPlausible,
          score: isPlausible ? 90 : 20,
          details: `Round-trip efficiency ${(effValue * 100).toFixed(1)}% ${isPlausible ? 'is realistic' : 'may be unrealistic'}`,
        },
        error: effValue > 1.0 ? {
          category: 'physical_plausibility',
          message: 'Round-trip efficiency cannot exceed 100%',
          fatal: true,
        } : undefined,
      }
    }
  }

  // Hydrogen validations
  if (simulationType?.includes('hydrogen') || simulationType?.includes('electrolyzer')) {
    if (nameLower.includes('efficiency')) {
      const effValue = unit === '%' ? value / 100 : value
      const isPlausible = effValue >= 0.4 && effValue <= 0.95 // SOEC can reach ~90%

      return {
        check: {
          name: `Electrolyzer Efficiency Plausibility`,
          category: 'physical_plausibility',
          passed: isPlausible,
          score: isPlausible ? 85 : 25,
          details: `Electrolyzer efficiency ${(effValue * 100).toFixed(1)}% ${isPlausible ? 'is achievable' : 'may be unrealistic'}`,
        },
        warning: effValue > 0.85 ? {
          category: 'physical_plausibility',
          message: 'Electrolyzer efficiency above 85% requires SOEC technology',
          severity: 'low',
        } : undefined,
      }
    }
  }

  return null
}

/**
 * Validate TEA results
 */
export function validateTEAResults(
  teaResults: Record<string, any>,
  domain: string
): ValidationResult {
  const checks: ValidationCheck[] = []
  const warnings: ValidationWarning[] = []
  const errors: ValidationError[] = []

  // LCOE validation
  if (teaResults.lcoe !== undefined) {
    const lcoe = teaResults.lcoe
    let benchmark: { min: number; max: number } | null = null

    if (domain.includes('solar')) {
      benchmark = PHYSICAL_BENCHMARKS.tea.lcoe.utilitySolar
    } else if (domain.includes('wind')) {
      benchmark = PHYSICAL_BENCHMARKS.tea.lcoe.onshoreWind
    } else if (domain.includes('battery')) {
      benchmark = PHYSICAL_BENCHMARKS.tea.lcoe.battery
    }

    if (benchmark) {
      const isReasonable = lcoe >= benchmark.min * 0.5 && lcoe <= benchmark.max * 2
      checks.push({
        name: 'LCOE Range Validation',
        category: 'range_validation',
        passed: isReasonable,
        score: isReasonable ? 85 : 40,
        details: `LCOE $${lcoe.toFixed(4)}/kWh ${isReasonable ? 'is within' : 'outside'} expected range ($${benchmark.min}-${benchmark.max})`,
      })

      if (!isReasonable) {
        warnings.push({
          category: 'range_validation',
          message: `LCOE $${lcoe.toFixed(4)}/kWh is outside typical range for ${domain}`,
          severity: lcoe < benchmark.min * 0.3 || lcoe > benchmark.max * 3 ? 'high' : 'medium',
          suggestion: 'Review capital and operating cost assumptions',
        })
      }
    }
  }

  // NPV validation
  if (teaResults.npv !== undefined) {
    const npvPositive = teaResults.npv > 0
    checks.push({
      name: 'NPV Viability',
      category: 'methodology',
      passed: npvPositive,
      score: npvPositive ? 90 : 50,
      details: npvPositive
        ? `Positive NPV of $${teaResults.npv.toLocaleString()} indicates economic viability`
        : `Negative NPV of $${teaResults.npv.toLocaleString()} indicates project may not be viable`,
    })
  }

  // IRR validation
  if (teaResults.irr !== undefined && teaResults.irr !== null) {
    const irr = teaResults.irr
    const isReasonable = irr >= -0.5 && irr <= 1.0 // -50% to 100%

    checks.push({
      name: 'IRR Plausibility',
      category: 'range_validation',
      passed: isReasonable,
      score: isReasonable ? 85 : 30,
      details: `IRR of ${(irr * 100).toFixed(1)}% ${isReasonable ? 'is reasonable' : 'may be unrealistic'}`,
    })

    if (irr > 0.5) {
      warnings.push({
        category: 'range_validation',
        message: `IRR of ${(irr * 100).toFixed(1)}% is unusually high`,
        severity: 'medium',
        suggestion: 'Verify revenue and cost projections',
      })
    }
  }

  // Payback period validation
  if (teaResults.simplePaybackPeriod !== undefined) {
    const payback = teaResults.simplePaybackPeriod
    const projectLifetime = teaResults.assumptions?.projectLifetime || 25
    const isReasonable = payback > 0 && payback <= projectLifetime

    checks.push({
      name: 'Payback Period Validation',
      category: 'methodology',
      passed: isReasonable,
      score: isReasonable ? 80 : 40,
      details: isReasonable
        ? `Payback period of ${payback.toFixed(1)} years is within project lifetime`
        : `Payback period ${payback <= 0 ? 'is invalid' : 'exceeds project lifetime'}`,
    })
  }

  // Discount rate validation
  if (teaResults.assumptions?.discountRate !== undefined) {
    const dr = teaResults.assumptions.discountRate
    const benchmark = PHYSICAL_BENCHMARKS.tea.discountRate
    const isReasonable = dr >= benchmark.min && dr <= benchmark.max

    checks.push({
      name: 'Discount Rate Reasonableness',
      category: 'methodology',
      passed: isReasonable,
      score: isReasonable ? 90 : 60,
      details: `Discount rate of ${(dr * 100).toFixed(1)}% ${isReasonable ? 'is typical' : 'may need justification'}`,
    })
  }

  const passedChecks = checks.filter(c => c.passed).length
  const overallScore = checks.length > 0
    ? Math.round((passedChecks / checks.length) * 100)
    : 50

  return {
    isValid: errors.filter(e => e.fatal).length === 0 && overallScore >= 60,
    overallScore,
    checks,
    warnings,
    errors,
    recommendations: generateRecommendations(checks, warnings, errors),
  }
}

/**
 * Validate hypothesis against research findings
 */
export function validateHypothesis(
  hypothesis: Hypothesis,
  researchFindings: ResearchFindings | null
): ValidationResult {
  const checks: ValidationCheck[] = []
  const warnings: ValidationWarning[] = []
  const errors: ValidationError[] = []

  // Check for supporting evidence
  const hasEvidence = hypothesis.supportingEvidence && hypothesis.supportingEvidence.length > 0
  checks.push({
    name: 'Supporting Evidence',
    category: 'literature_consistency',
    passed: hasEvidence,
    score: hasEvidence ? 85 : 40,
    details: hasEvidence
      ? `Hypothesis has ${hypothesis.supportingEvidence.length} pieces of supporting evidence`
      : 'No supporting evidence provided',
    evidence: hypothesis.supportingEvidence,
  })

  // Check testability
  const hasTestablePredicitions = hypothesis.predictions?.some(p => p.measurable)
  checks.push({
    name: 'Testability',
    category: 'methodology',
    passed: hasTestablePredicitions || false,
    score: hasTestablePredicitions ? 90 : 30,
    details: hasTestablePredicitions
      ? 'Hypothesis has measurable predictions'
      : 'Hypothesis lacks measurable predictions',
  })

  // Check feasibility
  const isFeasible = hypothesis.feasibilityScore >= 50
  checks.push({
    name: 'Feasibility Assessment',
    category: 'methodology',
    passed: isFeasible,
    score: hypothesis.feasibilityScore,
    details: `Feasibility score: ${hypothesis.feasibilityScore}/100`,
  })

  // Check for contradictions with established facts
  if (researchFindings?.establishedFacts) {
    for (const fact of researchFindings.establishedFacts) {
      // Simple keyword matching for contradiction detection
      const hypothesisLower = hypothesis.statement.toLowerCase()
      const factLower = fact.statement.toLowerCase()

      // Check for potential contradictions
      const contradictionIndicators = ['not', "doesn't", "can't", 'impossible', 'never']
      const potentialContradiction = contradictionIndicators.some(ind =>
        (hypothesisLower.includes(ind) && !factLower.includes(ind)) ||
        (!hypothesisLower.includes(ind) && factLower.includes(ind))
      )

      if (potentialContradiction) {
        warnings.push({
          category: 'literature_consistency',
          message: `Hypothesis may contradict established fact: "${fact.statement}"`,
          severity: 'medium',
          suggestion: 'Review hypothesis against established literature',
        })
      }
    }
  }

  // Check assumption count
  if (hypothesis.assumptions && hypothesis.assumptions.length > 5) {
    warnings.push({
      category: 'methodology',
      message: `Hypothesis has ${hypothesis.assumptions.length} assumptions - consider simplifying`,
      severity: 'low',
    })
  }

  const passedChecks = checks.filter(c => c.passed).length
  const overallScore = checks.length > 0
    ? Math.round((passedChecks / checks.length) * 100)
    : 50

  return {
    isValid: overallScore >= 50,
    overallScore,
    checks,
    warnings,
    errors,
    recommendations: generateRecommendations(checks, warnings, errors),
  }
}

/**
 * Validate analysis conclusions
 */
export function validateAnalysisConclusions(
  conclusions: AnalysisConclusion[],
  simulationResults: SimulationResult[],
  researchFindings: ResearchFindings | null
): ValidationResult {
  const checks: ValidationCheck[] = []
  const warnings: ValidationWarning[] = []
  const errors: ValidationError[] = []

  for (const conclusion of conclusions) {
    // Check support level consistency
    const supportScore = getSupportLevelScore(conclusion.supportLevel)
    const confidenceMatch = Math.abs(conclusion.confidence - supportScore) < 30

    checks.push({
      name: `Confidence-Support Consistency`,
      category: 'internal_consistency',
      passed: confidenceMatch,
      score: confidenceMatch ? 85 : 50,
      details: `Support level "${conclusion.supportLevel}" ${confidenceMatch ? 'matches' : 'differs from'} confidence ${conclusion.confidence}%`,
    })

    // Check metric validation
    if (conclusion.keyMetrics && conclusion.keyMetrics.length > 0) {
      const validMetrics = conclusion.keyMetrics.filter(m => m.withinExpectation).length
      const metricValidationRate = validMetrics / conclusion.keyMetrics.length

      checks.push({
        name: 'Metric Validation Rate',
        category: 'data_quality',
        passed: metricValidationRate >= 0.6,
        score: Math.round(metricValidationRate * 100),
        details: `${validMetrics}/${conclusion.keyMetrics.length} metrics within expectations`,
      })

      // Check for large deviations
      for (const metric of conclusion.keyMetrics) {
        if (Math.abs(metric.deviation) > 50) {
          warnings.push({
            category: 'data_quality',
            message: `${metric.name} shows ${metric.deviation.toFixed(1)}% deviation from expected`,
            severity: Math.abs(metric.deviation) > 100 ? 'high' : 'medium',
            suggestion: 'Review experimental conditions or model parameters',
          })
        }
      }
    }

    // Check literature comparison
    if (conclusion.literatureComparison && conclusion.literatureComparison.length > 0) {
      const consistentCount = conclusion.literatureComparison.filter(
        l => l.consistency === 'consistent' || l.consistency === 'novel'
      ).length
      const consistencyRate = consistentCount / conclusion.literatureComparison.length

      checks.push({
        name: 'Literature Consistency',
        category: 'literature_consistency',
        passed: consistencyRate >= 0.5,
        score: Math.round(consistencyRate * 100),
        details: `${consistentCount}/${conclusion.literatureComparison.length} findings consistent with literature`,
      })

      // Flag inconsistencies
      const inconsistencies = conclusion.literatureComparison.filter(l => l.consistency === 'inconsistent')
      for (const inc of inconsistencies) {
        warnings.push({
          category: 'literature_consistency',
          message: `Finding inconsistent with source: ${inc.claim}`,
          severity: 'medium',
          suggestion: inc.notes || 'Review methodology and assumptions',
        })
      }
    }
  }

  // Check that conclusions are based on simulation results
  if (simulationResults.length === 0) {
    errors.push({
      category: 'methodology',
      message: 'Conclusions drawn without simulation results',
      fatal: false,
    })
  }

  const passedChecks = checks.filter(c => c.passed).length
  const overallScore = checks.length > 0
    ? Math.round((passedChecks / checks.length) * 100)
    : 50

  return {
    isValid: errors.filter(e => e.fatal).length === 0 && overallScore >= 60,
    overallScore,
    checks,
    warnings,
    errors,
    recommendations: generateRecommendations(checks, warnings, errors),
  }
}

/**
 * Get numerical score for support level
 */
function getSupportLevelScore(level: AnalysisConclusion['supportLevel']): number {
  const scores: Record<AnalysisConclusion['supportLevel'], number> = {
    'strongly_supported': 90,
    'supported': 75,
    'inconclusive': 50,
    'contradicted': 25,
    'strongly_contradicted': 10,
  }
  return scores[level] || 50
}

/**
 * Generate recommendations from validation results
 */
function generateRecommendations(
  checks: ValidationCheck[],
  warnings: ValidationWarning[],
  errors: ValidationError[]
): string[] {
  const recommendations: string[] = []

  // From failed checks
  for (const check of checks) {
    if (!check.passed && check.score < 50) {
      switch (check.category) {
        case 'physical_plausibility':
          recommendations.push(`Review ${check.name.toLowerCase()} against physical limits`)
          break
        case 'range_validation':
          recommendations.push(`Verify input parameters for ${check.name.toLowerCase()}`)
          break
        case 'methodology':
          recommendations.push(`Consider improving methodology for ${check.name.toLowerCase()}`)
          break
        case 'literature_consistency':
          recommendations.push(`Cross-check findings with additional literature sources`)
          break
      }
    }
  }

  // From high severity warnings
  for (const warning of warnings.filter(w => w.severity === 'high')) {
    if (warning.suggestion) {
      recommendations.push(warning.suggestion)
    }
  }

  // From errors
  for (const error of errors) {
    if (error.fatal) {
      recommendations.push(`CRITICAL: Address ${error.message.toLowerCase()}`)
    }
  }

  // Deduplicate
  return [...new Set(recommendations)]
}

/**
 * Validate entire workflow context
 */
export function validateWorkflowResults(context: WorkflowContext): ValidationResult {
  const allChecks: ValidationCheck[] = []
  const allWarnings: ValidationWarning[] = []
  const allErrors: ValidationError[] = []

  const domain = context.domains[0] || 'other'

  // Validate simulation results
  if (context.simulationResults.length > 0) {
    const simValidation = validateSimulationResults(context.simulationResults, domain)
    allChecks.push(...simValidation.checks)
    allWarnings.push(...simValidation.warnings)
    allErrors.push(...simValidation.errors)
  }

  // Validate hypotheses
  for (const hypothesis of context.hypotheses) {
    const hypValidation = validateHypothesis(hypothesis, context.researchFindings)
    allChecks.push(...hypValidation.checks)
    allWarnings.push(...hypValidation.warnings)
    allErrors.push(...hypValidation.errors)
  }

  // Validate analysis conclusions
  if (context.analysisConclusions.length > 0) {
    const analysisValidation = validateAnalysisConclusions(
      context.analysisConclusions,
      context.simulationResults,
      context.researchFindings
    )
    allChecks.push(...analysisValidation.checks)
    allWarnings.push(...analysisValidation.warnings)
    allErrors.push(...analysisValidation.errors)
  }

  const passedChecks = allChecks.filter(c => c.passed).length
  const overallScore = allChecks.length > 0
    ? Math.round((passedChecks / allChecks.length) * 100)
    : 50

  return {
    isValid: allErrors.filter(e => e.fatal).length === 0 && overallScore >= 60,
    overallScore,
    checks: allChecks,
    warnings: allWarnings,
    errors: allErrors,
    recommendations: generateRecommendations(allChecks, allWarnings, allErrors),
  }
}

/**
 * Quick plausibility check for a single value
 */
export function quickPlausibilityCheck(
  parameter: string,
  value: number,
  domain: string
): { plausible: boolean; reason?: string } {
  const paramLower = parameter.toLowerCase()

  // Efficiency checks
  if (paramLower.includes('efficiency')) {
    if (value > 1 || value > 100) {
      return { plausible: false, reason: 'Efficiency cannot exceed 100%' }
    }
    if (value < 0) {
      return { plausible: false, reason: 'Efficiency cannot be negative' }
    }
  }

  // Capacity factor checks
  if (paramLower.includes('capacity factor')) {
    const cf = value > 1 ? value / 100 : value
    if (cf > 0.6) {
      return { plausible: false, reason: 'Capacity factor above 60% is rare' }
    }
    if (cf < 0.05) {
      return { plausible: false, reason: 'Capacity factor below 5% indicates system issues' }
    }
  }

  // LCOE checks
  if (paramLower.includes('lcoe')) {
    if (value < 0) {
      return { plausible: false, reason: 'LCOE cannot be negative' }
    }
    if (value > 1) {
      return { plausible: false, reason: 'LCOE above $1/kWh is extremely high' }
    }
  }

  // COP checks for heat pumps
  if (paramLower.includes('cop')) {
    if (value > 10) {
      return { plausible: false, reason: 'COP above 10 is unrealistic for current technology' }
    }
    if (value < 1) {
      return { plausible: false, reason: 'COP below 1 would mean system is less efficient than direct heating' }
    }
  }

  return { plausible: true }
}
