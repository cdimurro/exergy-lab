/**
 * TEA Quality Rubric System
 *
 * 10-point quality assessment framework for TEA analyses
 * Similar to Discovery Engine's rubric system but tailored for TEA
 *
 * Scoring Criteria:
 * 1. Calculation Accuracy (3 points)
 * 2. Assumption Quality (2 points)
 * 3. Data Completeness (2 points)
 * 4. Internal Consistency (1 point)
 * 5. Benchmarking (1 point)
 * 6. Methodology Rigor (1 point)
 *
 * Minimum Score for Report Generation: 7/10
 * Recommended Score: 9/10
 */

import type { TEAInput_v2, TEAResult_v2, CalculationProvenance } from '@/types/tea'
import type { ValidationReport } from './quality-orchestrator'

export interface RubricCriterion {
  id: string
  name: string
  maxPoints: number
  description: string
  scoringGuidelines: ScoringGuideline[]
}

export interface ScoringGuideline {
  pointsAwarded: number
  requirements: string[]
  description: string
}

export interface RubricScore {
  criterion: string
  pointsAwarded: number
  maxPoints: number
  percentage: number
  rationale: string
  evidence: string[]
  improvements: string[]
}

export interface TEAQualityAssessment {
  overallScore: number // 0-10
  overallPercentage: number // 0-100
  passed: boolean // score >= 7
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  criteriaScores: RubricScore[]
  summary: string
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  validatedAt: Date
}

/**
 * TEA Quality Rubric Definition
 */
export const TEA_QUALITY_RUBRIC: RubricCriterion[] = [
  {
    id: 'calculation-accuracy',
    name: 'Calculation Accuracy',
    maxPoints: 3,
    description:
      'Formulas match industry standards, dimensional consistency verified, results validated against reference cases',
    scoringGuidelines: [
      {
        pointsAwarded: 3,
        requirements: [
          'All formulas match published industry standards (NETL, DOE, IEA, NREL)',
          'Dimensional analysis confirms unit consistency throughout',
          'Results validated against ≥3 reference cases with <5% deviation',
          'All calculation steps documented with provenance',
          'Cross-validated by research agent',
        ],
        description: 'Exemplary calculation rigor meeting highest standards',
      },
      {
        pointsAwarded: 2,
        requirements: [
          'Core formulas match standards with minor acceptable variations',
          'Dimensional consistency verified for all major calculations',
          'Results validated against ≥2 reference cases with <10% deviation',
          'Main calculation steps documented',
        ],
        description: 'Strong calculation methodology with minor gaps',
      },
      {
        pointsAwarded: 1,
        requirements: [
          'Basic formulas used correctly',
          'Major dimensional errors avoided',
          'Results compared to at least 1 reference case',
          'Some documentation of calculations',
        ],
        description: 'Acceptable calculations but needs improvement',
      },
      {
        pointsAwarded: 0,
        requirements: ['Formula errors detected', 'Dimensional inconsistencies', 'No validation against references'],
        description: 'Inadequate calculation quality',
      },
    ],
  },
  {
    id: 'assumption-quality',
    name: 'Assumption Quality',
    maxPoints: 2,
    description:
      'Assumptions well-documented with sources, consistent with literature, uncertainty quantified',
    scoringGuidelines: [
      {
        pointsAwarded: 2,
        requirements: [
          'All assumptions documented with peer-reviewed sources',
          'Assumptions validated against ≥3 independent sources',
          'Uncertainty bounds quantified for all critical assumptions',
          'Sensitivity to assumptions analyzed',
          'Assumptions mutually consistent',
        ],
        description: 'Exemplary assumption documentation and validation',
      },
      {
        pointsAwarded: 1,
        requirements: [
          'Most assumptions documented with credible sources',
          'Key assumptions validated against industry data',
          'Uncertainty acknowledged for critical parameters',
          'Basic sensitivity analysis performed',
        ],
        description: 'Adequate assumption quality with room for improvement',
      },
      {
        pointsAwarded: 0,
        requirements: [
          'Assumptions poorly documented or unsourced',
          'No validation against literature',
          'Uncertainty not quantified',
        ],
        description: 'Inadequate assumption quality',
      },
    ],
  },
  {
    id: 'data-completeness',
    name: 'Data Completeness',
    maxPoints: 2,
    description: 'All required parameters present, minimal use of defaults, high-quality primary data',
    scoringGuidelines: [
      {
        pointsAwarded: 2,
        requirements: [
          'All required parameters present (100% complete)',
          '<20% of parameters use default values',
          '≥80% primary data from direct sources',
          'Data quality score ≥90%',
          'All critical parameters have high-confidence values',
        ],
        description: 'Comprehensive high-quality data',
      },
      {
        pointsAwarded: 1,
        requirements: [
          '≥80% of required parameters present',
          '<50% of parameters use default values',
          '≥50% primary data',
          'Data quality score ≥70%',
        ],
        description: 'Acceptable data quality with some gaps',
      },
      {
        pointsAwarded: 0,
        requirements: [
          '<80% of required parameters present',
          'Heavy reliance on defaults',
          'Low primary data percentage',
          'Data quality score <70%',
        ],
        description: 'Inadequate data completeness',
      },
    ],
  },
  {
    id: 'internal-consistency',
    name: 'Internal Consistency',
    maxPoints: 1,
    description: 'Mass/energy balances converge, economic metrics self-consistent, no contradictions',
    scoringGuidelines: [
      {
        pointsAwarded: 1,
        requirements: [
          'All material balances converge (<1% error)',
          'Energy balance converges (<2% error)',
          'Economic metrics mutually consistent (NPV, IRR, payback align)',
          'No contradictions between assumptions',
          'Validation by self-critique agent passed',
        ],
        description: 'Perfect internal consistency',
      },
      {
        pointsAwarded: 0,
        requirements: [
          'Balance convergence errors >5%',
          'Economic metrics inconsistent',
          'Contradictions detected',
        ],
        description: 'Internal inconsistencies require resolution',
      },
    ],
  },
  {
    id: 'benchmarking',
    name: 'Benchmarking',
    maxPoints: 1,
    description:
      'Results within expected ranges, comparison with alternatives, industry validation',
    scoringGuidelines: [
      {
        pointsAwarded: 1,
        requirements: [
          'All metrics within industry benchmark ranges',
          'Comparison with ≥2 alternative technologies documented',
          'Results validated against NETL/IEA/NREL databases',
          'Deviation from benchmarks explained and justified',
        ],
        description: 'Comprehensive benchmarking',
      },
      {
        pointsAwarded: 0,
        requirements: [
          'Metrics outside expected ranges without justification',
          'No comparison with alternatives',
          'No industry validation',
        ],
        description: 'Inadequate benchmarking',
      },
    ],
  },
  {
    id: 'methodology-rigor',
    name: 'Methodology Rigor',
    maxPoints: 1,
    description:
      'Clear documentation of methods, appropriate sensitivity analysis, uncertainty quantification',
    scoringGuidelines: [
      {
        pointsAwarded: 1,
        requirements: [
          'Methodology clearly documented with formulas',
          'Sensitivity analysis covers ≥5 critical parameters',
          'Uncertainty quantified (Monte Carlo or equivalent)',
          'Data sources and references cited',
          'Reproducible methodology',
        ],
        description: 'Rigorous methodology',
      },
      {
        pointsAwarded: 0,
        requirements: [
          'Methodology poorly documented',
          'No sensitivity analysis',
          'Uncertainty not quantified',
          'Insufficient references',
        ],
        description: 'Inadequate methodology rigor',
      },
    ],
  },
]

/**
 * Minimum and recommended thresholds
 */
export const QUALITY_THRESHOLDS = {
  MINIMUM_PASS: 7,
  RECOMMENDED: 9,
  EXCELLENT: 10,
}

/**
 * Grade mapping
 */
function getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 9) return 'A'
  if (score >= 7) return 'B'
  if (score >= 5) return 'C'
  if (score >= 3) return 'D'
  return 'F'
}

/**
 * TEA Quality Evaluator Class
 */
export class TEAQualityEvaluator {
  private input: TEAInput_v2
  private results: TEAResult_v2
  private validationReport: ValidationReport
  private calculationProvenance?: CalculationProvenance[]

  constructor(
    input: TEAInput_v2,
    results: TEAResult_v2,
    validationReport: ValidationReport,
    calculationProvenance?: CalculationProvenance[]
  ) {
    this.input = input
    this.results = results
    this.validationReport = validationReport
    this.calculationProvenance = calculationProvenance
  }

  /**
   * Evaluate overall TEA quality
   */
  evaluateQuality(): TEAQualityAssessment {
    const criteriaScores: RubricScore[] = []

    // Evaluate each criterion
    for (const criterion of TEA_QUALITY_RUBRIC) {
      const score = this.evaluateCriterion(criterion)
      criteriaScores.push(score)
    }

    // Calculate overall score
    const overallScore = criteriaScores.reduce((sum, score) => sum + score.pointsAwarded, 0)
    const maxPossible = TEA_QUALITY_RUBRIC.reduce((sum, criterion) => sum + criterion.maxPoints, 0)
    const overallPercentage = (overallScore / maxPossible) * 100

    // Determine pass/fail
    const passed = overallScore >= QUALITY_THRESHOLDS.MINIMUM_PASS
    const grade = getGrade(overallScore)

    // Extract strengths and weaknesses
    const strengths = criteriaScores
      .filter(s => s.percentage >= 80)
      .map(s => `${s.criterion}: ${s.rationale}`)

    const weaknesses = criteriaScores
      .filter(s => s.percentage < 80)
      .map(s => `${s.criterion}: ${s.rationale}`)

    // Generate recommendations
    const recommendations = this.generateRecommendations(criteriaScores, overallScore)

    // Generate summary
    const summary = this.generateSummary(overallScore, passed, grade, criteriaScores)

    return {
      overallScore,
      overallPercentage,
      passed,
      grade,
      criteriaScores,
      summary,
      strengths,
      weaknesses,
      recommendations,
      validatedAt: new Date(),
    }
  }

  /**
   * Evaluate a single criterion
   */
  private evaluateCriterion(criterion: RubricCriterion): RubricScore {
    switch (criterion.id) {
      case 'calculation-accuracy':
        return this.evaluateCalculationAccuracy(criterion)
      case 'assumption-quality':
        return this.evaluateAssumptionQuality(criterion)
      case 'data-completeness':
        return this.evaluateDataCompleteness(criterion)
      case 'internal-consistency':
        return this.evaluateInternalConsistency(criterion)
      case 'benchmarking':
        return this.evaluateBenchmarking(criterion)
      case 'methodology-rigor':
        return this.evaluateMethodologyRigor(criterion)
      default:
        return {
          criterion: criterion.name,
          pointsAwarded: 0,
          maxPoints: criterion.maxPoints,
          percentage: 0,
          rationale: 'Unknown criterion',
          evidence: [],
          improvements: [],
        }
    }
  }

  /**
   * Evaluate Calculation Accuracy (3 points max)
   */
  private evaluateCalculationAccuracy(criterion: RubricCriterion): RubricScore {
    const evidence: string[] = []
    const improvements: string[] = []
    let pointsAwarded = 0

    const accuracy = this.validationReport.calculationAccuracy

    // Check formulas validated
    if (accuracy.formulasValidated) {
      pointsAwarded += 1
      evidence.push('Formulas validated against industry standards')
    } else {
      improvements.push('Validate all formulas against NETL/DOE/IEA standards')
    }

    // Check dimensional consistency
    if (accuracy.dimensionalConsistency) {
      pointsAwarded += 1
      evidence.push('Dimensional consistency verified')
    } else {
      improvements.push('Perform dimensional analysis on all calculations')
    }

    // Check benchmark comparison
    if (accuracy.benchmarkComparison && accuracy.benchmarkComparison !== 'Pending validation') {
      pointsAwarded += 1
      evidence.push(`Benchmark comparison: ${accuracy.benchmarkComparison}`)
    } else {
      improvements.push('Compare results against published reference cases')
    }

    const percentage = (pointsAwarded / criterion.maxPoints) * 100

    return {
      criterion: criterion.name,
      pointsAwarded,
      maxPoints: criterion.maxPoints,
      percentage,
      rationale:
        pointsAwarded === 3
          ? 'Exemplary calculation rigor'
          : pointsAwarded >= 2
            ? 'Strong calculations with minor gaps'
            : pointsAwarded >= 1
              ? 'Basic calculations need improvement'
              : 'Inadequate calculation quality',
      evidence,
      improvements,
    }
  }

  /**
   * Evaluate Assumption Quality (2 points max)
   */
  private evaluateAssumptionQuality(criterion: RubricCriterion): RubricScore {
    const evidence: string[] = []
    const improvements: string[] = []
    let pointsAwarded = 0

    const assumption = this.validationReport.assumptionQuality

    // Check if sources documented and literature consistent
    if (assumption.sourcesDocumented && assumption.literatureConsistency) {
      pointsAwarded += 1
      evidence.push('Assumptions documented with peer-reviewed sources')
      evidence.push('Assumptions consistent with literature')
    } else {
      if (!assumption.sourcesDocumented) {
        improvements.push('Document sources for all assumptions')
      }
      if (!assumption.literatureConsistency) {
        improvements.push('Validate assumptions against published literature')
      }
    }

    // Check uncertainty quantification
    if (assumption.uncertaintyQuantified) {
      pointsAwarded += 1
      evidence.push('Uncertainty quantified for critical parameters')
    } else {
      improvements.push('Quantify uncertainty bounds for all critical assumptions')
    }

    const percentage = (pointsAwarded / criterion.maxPoints) * 100

    return {
      criterion: criterion.name,
      pointsAwarded,
      maxPoints: criterion.maxPoints,
      percentage,
      rationale:
        pointsAwarded === 2
          ? 'Exemplary assumption documentation'
          : pointsAwarded >= 1
            ? 'Adequate assumptions needing improvement'
            : 'Inadequate assumption quality',
      evidence,
      improvements,
    }
  }

  /**
   * Evaluate Data Completeness (2 points max)
   */
  private evaluateDataCompleteness(criterion: RubricCriterion): RubricScore {
    const evidence: string[] = []
    const improvements: string[] = []
    let pointsAwarded = 0

    const completeness = this.validationReport.dataCompleteness

    // Check required parameters and minimal defaults
    if (completeness.requiredParametersPresent && completeness.defaultUsageMinimal) {
      pointsAwarded += 1
      evidence.push('All required parameters present')
      evidence.push('Minimal use of default values (<20%)')
    } else {
      if (!completeness.requiredParametersPresent) {
        improvements.push('Complete all required input parameters')
      }
      if (!completeness.defaultUsageMinimal) {
        improvements.push('Provide primary data instead of relying on defaults')
      }
    }

    // Check primary data quality
    if (completeness.primaryDataQuality === 'High' || completeness.primaryDataQuality === 'Excellent') {
      pointsAwarded += 1
      evidence.push(`Primary data quality: ${completeness.primaryDataQuality}`)
    } else {
      improvements.push('Improve quality of primary data sources')
    }

    const percentage = (pointsAwarded / criterion.maxPoints) * 100

    return {
      criterion: criterion.name,
      pointsAwarded,
      maxPoints: criterion.maxPoints,
      percentage,
      rationale:
        pointsAwarded === 2
          ? 'Comprehensive high-quality data'
          : pointsAwarded >= 1
            ? 'Acceptable data with some gaps'
            : 'Inadequate data completeness',
      evidence,
      improvements,
    }
  }

  /**
   * Evaluate Internal Consistency (1 point max)
   */
  private evaluateInternalConsistency(criterion: RubricCriterion): RubricScore {
    const evidence: string[] = []
    const improvements: string[] = []
    let pointsAwarded = 0

    const consistency = this.validationReport.internalConsistency

    // All three requirements must be met for the point
    if (
      consistency.balancesConverged &&
      consistency.metricsConsistent &&
      !consistency.contradictionsFound
    ) {
      pointsAwarded = 1
      evidence.push('All material/energy balances converged (<1% error)')
      evidence.push('Economic metrics mutually consistent')
      evidence.push('No contradictions detected')
    } else {
      if (!consistency.balancesConverged) {
        improvements.push('Ensure all material and energy balances converge (<1% error)')
      }
      if (!consistency.metricsConsistent) {
        improvements.push('Verify economic metrics are self-consistent')
      }
      if (consistency.contradictionsFound) {
        improvements.push('Resolve contradictions in assumptions or calculations')
      }
    }

    const percentage = (pointsAwarded / criterion.maxPoints) * 100

    return {
      criterion: criterion.name,
      pointsAwarded,
      maxPoints: criterion.maxPoints,
      percentage,
      rationale: pointsAwarded === 1 ? 'Perfect internal consistency' : 'Inconsistencies require resolution',
      evidence,
      improvements,
    }
  }

  /**
   * Evaluate Benchmarking (1 point max)
   */
  private evaluateBenchmarking(criterion: RubricCriterion): RubricScore {
    const evidence: string[] = []
    const improvements: string[] = []
    let pointsAwarded = 0

    const benchmarking = this.validationReport.benchmarking

    // All three requirements must be met
    if (
      benchmarking.withinExpectedRanges &&
      benchmarking.alternativesCompared &&
      benchmarking.industryValidated
    ) {
      pointsAwarded = 1
      evidence.push('Results within industry benchmark ranges')
      evidence.push('Comparison with alternative technologies documented')
      evidence.push('Industry validation completed')
    } else {
      if (!benchmarking.withinExpectedRanges) {
        improvements.push('Verify results against technology-specific benchmark ranges')
      }
      if (!benchmarking.alternativesCompared) {
        improvements.push('Document comparison with at least 2 alternative technologies')
      }
      if (!benchmarking.industryValidated) {
        improvements.push('Validate against industry databases (NETL, IEA, NREL)')
      }
    }

    const percentage = (pointsAwarded / criterion.maxPoints) * 100

    return {
      criterion: criterion.name,
      pointsAwarded,
      maxPoints: criterion.maxPoints,
      percentage,
      rationale: pointsAwarded === 1 ? 'Comprehensive benchmarking' : 'Benchmarking incomplete',
      evidence,
      improvements,
    }
  }

  /**
   * Evaluate Methodology Rigor (1 point max)
   */
  private evaluateMethodologyRigor(criterion: RubricCriterion): RubricScore {
    const evidence: string[] = []
    const improvements: string[] = []
    let pointsAwarded = 0

    const methodology = this.validationReport.methodologyRigor

    // All requirements must be met
    if (
      methodology.methodsDocumented &&
      methodology.sensitivityAnalysisAppropriate &&
      methodology.uncertaintyQuantified
    ) {
      pointsAwarded = 1
      evidence.push('Methods clearly documented')
      evidence.push('Appropriate sensitivity analysis performed')
      evidence.push('Uncertainty quantified')
    } else {
      if (!methodology.methodsDocumented) {
        improvements.push('Document all calculation methods with formulas')
      }
      if (!methodology.sensitivityAnalysisAppropriate) {
        improvements.push('Perform sensitivity analysis on critical parameters')
      }
      if (!methodology.uncertaintyQuantified) {
        improvements.push('Quantify uncertainty using Monte Carlo or equivalent')
      }
    }

    const percentage = (pointsAwarded / criterion.maxPoints) * 100

    return {
      criterion: criterion.name,
      pointsAwarded,
      maxPoints: criterion.maxPoints,
      percentage,
      rationale: pointsAwarded === 1 ? 'Rigorous methodology' : 'Methodology rigor needs improvement',
      evidence,
      improvements,
    }
  }

  /**
   * Generate overall summary
   */
  private generateSummary(
    score: number,
    passed: boolean,
    grade: string,
    criteriaScores: RubricScore[]
  ): string {
    const passStatus = passed ? 'PASSED' : 'FAILED'
    const scorePercent = ((score / 10) * 100).toFixed(0)

    let summary = `TEA Quality Assessment: ${passStatus} (${score}/10, ${scorePercent}%, Grade: ${grade})\n\n`

    if (score >= QUALITY_THRESHOLDS.EXCELLENT) {
      summary += 'Exemplary quality. Report ready for publication and regulatory submission.'
    } else if (score >= QUALITY_THRESHOLDS.RECOMMENDED) {
      summary += 'High quality. Report suitable for industry use with minor enhancements possible.'
    } else if (score >= QUALITY_THRESHOLDS.MINIMUM_PASS) {
      summary += 'Acceptable quality. Report can be generated but improvements recommended.'
    } else {
      summary += 'Below minimum quality threshold. Address deficiencies before report generation.'
    }

    summary += '\n\nCriteria breakdown:\n'
    for (const criteriaScore of criteriaScores) {
      summary += `- ${criteriaScore.criterion}: ${criteriaScore.pointsAwarded}/${criteriaScore.maxPoints} (${criteriaScore.percentage.toFixed(0)}%)\n`
    }

    return summary
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(criteriaScores: RubricScore[], overallScore: number): string[] {
    const recommendations: string[] = []

    if (overallScore < QUALITY_THRESHOLDS.MINIMUM_PASS) {
      recommendations.push(
        `Overall score (${overallScore}/10) is below minimum threshold (${QUALITY_THRESHOLDS.MINIMUM_PASS}/10). Report generation not recommended until quality improves.`
      )
    }

    // Add improvements from each low-scoring criterion
    for (const score of criteriaScores) {
      if (score.percentage < 100) {
        recommendations.push(...score.improvements)
      }
    }

    // Priority recommendations
    const lowScores = criteriaScores.filter(s => s.percentage < 50).sort((a, b) => a.percentage - b.percentage)

    if (lowScores.length > 0) {
      recommendations.unshift(
        `PRIORITY: Address ${lowScores[0].criterion} (${lowScores[0].percentage.toFixed(0)}% score) as it has the most critical deficiencies.`
      )
    }

    if (recommendations.length === 0) {
      recommendations.push('All quality criteria met. Report generation approved.')
    }

    return recommendations
  }
}

/**
 * Convenience function to evaluate TEA quality
 */
export function evaluateTEAQuality(
  input: TEAInput_v2,
  results: TEAResult_v2,
  validationReport: ValidationReport,
  calculationProvenance?: CalculationProvenance[]
): TEAQualityAssessment {
  const evaluator = new TEAQualityEvaluator(input, results, validationReport, calculationProvenance)
  return evaluator.evaluateQuality()
}
