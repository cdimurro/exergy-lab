/**
 * Critical Agent
 *
 * Validates scientific outputs against physical laws, literature,
 * and FrontierScience rubrics. Acts as a rigorous quality gate.
 */

import { generateText } from '../model-router'
import { RubricJudge } from '../rubrics/judge'
import type { Rubric, JudgeResult, RefinementHints } from '../rubrics/types'
import { THERMODYNAMIC_LIMITS } from '../rubrics/templates/simulation'
import type { Hypothesis, ExperimentDesign } from './creative-agent'
import type { ResearchResult } from './research-agent'

// ============================================================================
// Types
// ============================================================================

export interface PhysicalBenchmark {
  metric: string
  category: string
  currentBest: number
  theoreticalLimit: number
  unit: string
  source: string
}

export interface ValidationCheck {
  name: string
  passed: boolean
  score: number
  maxScore: number
  details: string
  recommendations?: string[]
}

export interface ValidationResult {
  overallScore: number
  passed: boolean
  checks: ValidationCheck[]
  physicsViolations: {
    type: string
    description: string
    severity: 'warning' | 'error' | 'critical'
    location: string
  }[]
  literatureConsistency: {
    consistent: boolean
    discrepancies: string[]
    supportingReferences: string[]
  }
  rubricResults?: JudgeResult
  recommendations: string[]
  timestamp: Date
}

// ============================================================================
// Physical Benchmarks Database
// ============================================================================

export const PHYSICAL_BENCHMARKS: PhysicalBenchmark[] = [
  // Solar
  {
    metric: 'Single junction solar cell efficiency',
    category: 'solar',
    currentBest: 0.294,
    theoreticalLimit: 0.337,
    unit: 'fraction',
    source: 'Shockley-Queisser limit',
  },
  {
    metric: 'Perovskite solar cell efficiency',
    category: 'solar',
    currentBest: 0.259,
    theoreticalLimit: 0.337,
    unit: 'fraction',
    source: 'NREL Best Research-Cell Efficiency Chart',
  },
  {
    metric: 'Multi-junction solar cell efficiency',
    category: 'solar',
    currentBest: 0.472,
    theoreticalLimit: 0.86,
    unit: 'fraction',
    source: 'Concentrated solar limit',
  },

  // Wind
  {
    metric: 'Wind turbine power coefficient',
    category: 'wind',
    currentBest: 0.50,
    theoreticalLimit: 0.593,
    unit: 'fraction',
    source: 'Betz limit',
  },

  // Electrolysis
  {
    metric: 'PEM electrolyzer efficiency',
    category: 'electrolysis',
    currentBest: 0.80,
    theoreticalLimit: 0.83,
    unit: 'fraction',
    source: 'HHV basis',
  },
  {
    metric: 'SOEC electrolysis efficiency',
    category: 'electrolysis',
    currentBest: 0.90,
    theoreticalLimit: 1.0,
    unit: 'fraction (LHV)',
    source: 'High-temperature electrolysis',
  },
  {
    metric: 'Alkaline electrolyzer efficiency',
    category: 'electrolysis',
    currentBest: 0.70,
    theoreticalLimit: 0.83,
    unit: 'fraction',
    source: 'HHV basis',
  },

  // Fuel Cells
  {
    metric: 'PEM fuel cell efficiency',
    category: 'fuel_cell',
    currentBest: 0.60,
    theoreticalLimit: 0.83,
    unit: 'fraction',
    source: 'Gibbs free energy limit',
  },
  {
    metric: 'SOFC efficiency',
    category: 'fuel_cell',
    currentBest: 0.65,
    theoreticalLimit: 0.83,
    unit: 'fraction',
    source: 'High-temperature operation',
  },

  // Batteries
  {
    metric: 'Li-ion battery energy density',
    category: 'battery',
    currentBest: 300,
    theoreticalLimit: 500,
    unit: 'Wh/kg',
    source: 'Theoretical Li-ion limit',
  },
  {
    metric: 'Li-ion round-trip efficiency',
    category: 'battery',
    currentBest: 0.95,
    theoreticalLimit: 0.99,
    unit: 'fraction',
    source: 'DC-DC basis',
  },

  // Heat Engines
  {
    metric: 'Combined cycle gas turbine efficiency',
    category: 'thermal',
    currentBest: 0.64,
    theoreticalLimit: 0.70,
    unit: 'fraction',
    source: 'GE HA turbine',
  },
  {
    metric: 'Steam turbine efficiency',
    category: 'thermal',
    currentBest: 0.47,
    theoreticalLimit: 0.60,
    unit: 'fraction',
    source: 'Ultra-supercritical',
  },
]

// ============================================================================
// Critical Agent Class
// ============================================================================

export class CriticalAgent {
  private judge: RubricJudge

  constructor() {
    this.judge = new RubricJudge({ strictMode: true })
  }

  /**
   * Comprehensive validation of discovery outputs
   */
  async validate(
    outputs: {
      research?: ResearchResult
      hypotheses?: Hypothesis[]
      simulations?: any
      experiments?: ExperimentDesign[]
      exergy?: any
      tea?: any
    },
    rubric?: Rubric,
    benchmarks: PhysicalBenchmark[] = PHYSICAL_BENCHMARKS
  ): Promise<ValidationResult> {
    const checks: ValidationCheck[] = []
    const violations: ValidationResult['physicsViolations'] = []
    const recommendations: string[] = []

    // 1. Physics validation
    const physicsCheck = await this.checkPhysicalPlausibility(outputs, benchmarks)
    checks.push(physicsCheck.check)
    violations.push(...physicsCheck.violations)
    recommendations.push(...physicsCheck.recommendations)

    // 2. Literature consistency
    const literatureCheck = await this.checkLiteratureConsistency(outputs)
    checks.push(literatureCheck.check)

    // 3. Thermodynamic validation
    const thermoCheck = this.checkThermodynamicLimits(outputs)
    checks.push(thermoCheck.check)
    violations.push(...thermoCheck.violations)

    // 4. Hypothesis quality
    if (outputs.hypotheses) {
      const hypothesisCheck = this.checkHypothesisQuality(outputs.hypotheses)
      checks.push(hypothesisCheck)
    }

    // 5. Experiment completeness
    if (outputs.experiments) {
      const experimentCheck = this.checkExperimentCompleteness(outputs.experiments)
      checks.push(experimentCheck)
    }

    // 6. Rubric evaluation (if rubric provided)
    let rubricResults: JudgeResult | undefined
    if (rubric) {
      rubricResults = await this.judge.judge(
        outputs.research?.query || 'Scientific discovery',
        outputs,
        rubric
      )
      checks.push({
        name: 'Rubric Evaluation',
        passed: rubricResults.passed,
        score: rubricResults.totalScore,
        maxScore: 10,
        details: rubricResults.reasoning,
        recommendations: rubricResults.recommendations,
      })
    }

    // Calculate overall score
    const totalScore = checks.reduce((sum, c) => sum + c.score, 0)
    const maxScore = checks.reduce((sum, c) => sum + c.maxScore, 0)
    const overallScore = maxScore > 0 ? (totalScore / maxScore) * 10 : 0

    const passed = overallScore >= 7 && violations.filter(v => v.severity === 'critical').length === 0

    return {
      overallScore,
      passed,
      checks,
      physicsViolations: violations,
      literatureConsistency: {
        consistent: literatureCheck.consistent,
        discrepancies: literatureCheck.discrepancies,
        supportingReferences: literatureCheck.supportingReferences,
      },
      rubricResults,
      recommendations: this.prioritizeRecommendations(recommendations, checks),
      timestamp: new Date(),
    }
  }

  /**
   * Check physical plausibility against benchmarks
   */
  private async checkPhysicalPlausibility(
    outputs: any,
    benchmarks: PhysicalBenchmark[]
  ): Promise<{
    check: ValidationCheck
    violations: ValidationResult['physicsViolations']
    recommendations: string[]
  }> {
    const violations: ValidationResult['physicsViolations'] = []
    const recommendations: string[] = []

    // Extract numerical claims from outputs
    const claims = this.extractNumericalClaims(outputs)

    for (const claim of claims) {
      // Find matching benchmark
      const benchmark = benchmarks.find(b =>
        claim.metric.toLowerCase().includes(b.metric.toLowerCase()) ||
        b.metric.toLowerCase().includes(claim.metric.toLowerCase())
      )

      if (benchmark) {
        // Check against theoretical limit
        if (claim.value > benchmark.theoreticalLimit) {
          violations.push({
            type: 'exceeds_theoretical_limit',
            description: `${claim.metric}: ${claim.value} ${claim.unit} exceeds theoretical limit of ${benchmark.theoreticalLimit}`,
            severity: 'critical',
            location: claim.source,
          })
        }
        // Check against current best
        else if (claim.value > benchmark.currentBest * 1.5) {
          violations.push({
            type: 'exceeds_current_best',
            description: `${claim.metric}: ${claim.value} significantly exceeds current best of ${benchmark.currentBest}`,
            severity: 'warning',
            location: claim.source,
          })
          recommendations.push(
            `Verify claim for ${claim.metric} (${claim.value}) against recent literature - exceeds known performance`
          )
        }
      }
    }

    const score = violations.length === 0 ? 10 :
      violations.some(v => v.severity === 'critical') ? 2 :
        violations.some(v => v.severity === 'error') ? 5 : 7

    return {
      check: {
        name: 'Physical Plausibility',
        passed: !violations.some(v => v.severity === 'critical'),
        score,
        maxScore: 10,
        details: violations.length === 0
          ? 'All claims within physical limits'
          : `Found ${violations.length} potential violations`,
        recommendations,
      },
      violations,
      recommendations,
    }
  }

  /**
   * Extract numerical claims from outputs
   */
  private extractNumericalClaims(outputs: any): {
    metric: string
    value: number
    unit: string
    source: string
  }[] {
    const claims: { metric: string; value: number; unit: string; source: string }[] = []

    // Extract from hypotheses
    if (outputs.hypotheses) {
      for (const h of outputs.hypotheses) {
        for (const p of h.predictions || []) {
          if (p.expectedValue !== undefined) {
            claims.push({
              metric: p.statement,
              value: p.expectedValue,
              unit: p.unit || '',
              source: `Hypothesis: ${h.title}`,
            })
          }
        }
      }
    }

    // Extract from simulations
    if (outputs.simulations?.outputs) {
      for (const o of outputs.simulations.outputs) {
        if (o.value !== undefined) {
          claims.push({
            metric: o.name || o.metric,
            value: o.value,
            unit: o.unit || '',
            source: 'Simulation output',
          })
        }
      }
    }

    return claims
  }

  /**
   * Check literature consistency
   */
  private async checkLiteratureConsistency(outputs: any): Promise<{
    check: ValidationCheck
    consistent: boolean
    discrepancies: string[]
    supportingReferences: string[]
  }> {
    const discrepancies: string[] = []
    const supportingReferences: string[] = []

    // Extract key claims
    const claims = this.extractNumericalClaims(outputs)

    // Compare with research findings
    if (outputs.research?.keyFindings) {
      for (const claim of claims) {
        const matchingFinding = outputs.research.keyFindings.find((f: any) =>
          f.finding.toLowerCase().includes(claim.metric.toLowerCase().split(' ')[0])
        )

        if (matchingFinding) {
          if (matchingFinding.value !== undefined) {
            const difference = Math.abs(claim.value - matchingFinding.value) / matchingFinding.value
            if (difference > 0.5) {
              discrepancies.push(
                `Claimed ${claim.metric}: ${claim.value} differs significantly from literature value ${matchingFinding.value}`
              )
            } else {
              supportingReferences.push(matchingFinding.source?.title || 'Literature source')
            }
          }
        }
      }
    }

    const consistent = discrepancies.length === 0
    const score = consistent ? 10 : Math.max(5, 10 - discrepancies.length * 2)

    return {
      check: {
        name: 'Literature Consistency',
        passed: consistent,
        score,
        maxScore: 10,
        details: consistent
          ? `Consistent with ${supportingReferences.length} literature references`
          : `Found ${discrepancies.length} discrepancies with literature`,
      },
      consistent,
      discrepancies,
      supportingReferences,
    }
  }

  /**
   * Check thermodynamic limits
   */
  private checkThermodynamicLimits(outputs: any): {
    check: ValidationCheck
    violations: ValidationResult['physicsViolations']
  } {
    const violations: ValidationResult['physicsViolations'] = []

    // Check efficiency values
    const claims = this.extractNumericalClaims(outputs)

    for (const claim of claims) {
      const metric = claim.metric.toLowerCase()

      // General efficiency check
      if (metric.includes('efficiency') || metric.includes('eta') || metric.includes('η')) {
        // Normalize to fraction if percentage
        const value = claim.value > 1 ? claim.value / 100 : claim.value

        if (value > 1) {
          violations.push({
            type: 'thermodynamic_violation',
            description: `Efficiency ${claim.value} exceeds 100% - violates conservation of energy`,
            severity: 'critical',
            location: claim.source,
          })
        }

        // Check specific limits
        if (metric.includes('solar') && !metric.includes('concentrated')) {
          if (value > THERMODYNAMIC_LIMITS.shockleyQueisser) {
            violations.push({
              type: 'exceeds_sq_limit',
              description: `Solar efficiency ${value} exceeds Shockley-Queisser limit (${THERMODYNAMIC_LIMITS.shockleyQueisser})`,
              severity: 'error',
              location: claim.source,
            })
          }
        }

        if (metric.includes('wind')) {
          if (value > THERMODYNAMIC_LIMITS.betz) {
            violations.push({
              type: 'exceeds_betz',
              description: `Wind efficiency ${value} exceeds Betz limit (${THERMODYNAMIC_LIMITS.betz})`,
              severity: 'critical',
              location: claim.source,
            })
          }
        }
      }

      // Check for negative energy
      if ((metric.includes('energy') || metric.includes('power')) &&
        !metric.includes('formation') && !metric.includes('binding')) {
        if (claim.value < 0) {
          violations.push({
            type: 'negative_energy',
            description: `Negative ${claim.metric} (${claim.value}) violates conservation of energy`,
            severity: 'error',
            location: claim.source,
          })
        }
      }
    }

    const score = violations.length === 0 ? 10 :
      violations.some(v => v.severity === 'critical') ? 0 :
        violations.some(v => v.severity === 'error') ? 4 : 7

    return {
      check: {
        name: 'Thermodynamic Limits',
        passed: violations.length === 0,
        score,
        maxScore: 10,
        details: violations.length === 0
          ? 'All values comply with thermodynamic limits'
          : `Found ${violations.length} thermodynamic violations`,
      },
      violations,
    }
  }

  /**
   * Check hypothesis quality
   */
  private checkHypothesisQuality(hypotheses: Hypothesis[]): ValidationCheck {
    let score = 0
    const issues: string[] = []

    for (const h of hypotheses) {
      // Check falsifiability
      const hasFalsifiable = h.predictions.some(p => p.falsifiable)
      if (hasFalsifiable) score += 1

      // Check evidence
      if ((h.supportingEvidence?.length || 0) >= 3) score += 1

      // Check mechanism
      if ((h.mechanism?.steps?.length || 0) >= 3) score += 1

      // Check variables
      if (h.variables?.independent?.length > 0 && h.variables?.dependent?.length > 0) score += 1
    }

    const maxScore = hypotheses.length * 4
    const normalizedScore = maxScore > 0 ? (score / maxScore) * 10 : 0

    return {
      name: 'Hypothesis Quality',
      passed: normalizedScore >= 7,
      score: normalizedScore,
      maxScore: 10,
      details: `${hypotheses.length} hypotheses evaluated, quality score: ${normalizedScore.toFixed(1)}/10`,
    }
  }

  /**
   * Check experiment completeness
   */
  private checkExperimentCompleteness(experiments: ExperimentDesign[]): ValidationCheck {
    let score = 0
    const issues: string[] = []

    for (const e of experiments) {
      // Check materials
      if ((e.materials?.length || 0) >= 5) score += 1
      else issues.push(`${e.title}: Needs more materials (${e.materials?.length || 0}/5)`)

      // Check equipment
      if ((e.equipment?.length || 0) >= 5) score += 1
      else issues.push(`${e.title}: Needs more equipment (${e.equipment?.length || 0}/5)`)

      // Check procedure
      if ((e.procedure?.length || 0) >= 10) score += 1
      else issues.push(`${e.title}: Needs more procedure steps (${e.procedure?.length || 0}/10)`)

      // Check safety
      if ((e.safetyRequirements?.length || 0) >= 3) score += 1

      // Check failure modes
      if ((e.failureModes?.length || 0) >= 2) score += 1
    }

    const maxScore = experiments.length * 5
    const normalizedScore = maxScore > 0 ? (score / maxScore) * 10 : 0

    return {
      name: 'Experiment Completeness',
      passed: normalizedScore >= 7,
      score: normalizedScore,
      maxScore: 10,
      details: issues.length === 0
        ? 'All experiments are complete'
        : `Issues: ${issues.slice(0, 3).join('; ')}`,
      recommendations: issues,
    }
  }

  /**
   * Prioritize recommendations
   */
  private prioritizeRecommendations(
    recommendations: string[],
    checks: ValidationCheck[]
  ): string[] {
    // Add recommendations from failed checks
    for (const check of checks) {
      if (!check.passed && check.recommendations) {
        recommendations.push(...check.recommendations)
      }
    }

    // Deduplicate and limit
    return [...new Set(recommendations)].slice(0, 10)
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createCriticalAgent(): CriticalAgent {
  return new CriticalAgent()
}
