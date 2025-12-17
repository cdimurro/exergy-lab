/**
 * Quality Gates System
 *
 * Defines quality criteria for each workflow phase.
 * Used to determine if results meet minimum standards
 * or if iteration is needed.
 */

import type { WorkflowPhase, ResearchFindings, Hypothesis, ExperimentDesign, SimulationResult, AnalysisConclusion } from './workflow-context'
import type { Source } from './search-apis'

/**
 * Quality criterion definition
 */
export interface QualityCriterion {
  name: string
  description: string
  weight: number // 0-1, weights should sum to 1
  evaluate: (results: any) => number // Returns 0-100
}

/**
 * Quality gate definition
 */
export interface QualityGate {
  phase: WorkflowPhase
  criteria: QualityCriterion[]
  threshold: number // Minimum score to pass (0-100)
  maxIterations: number
}

/**
 * Quality evaluation result
 */
export interface QualityEvaluation {
  phase: WorkflowPhase
  overallScore: number
  passed: boolean
  criteriaScores: Record<string, { score: number; weight: number }>
  recommendations: string[]
}

// ============================================================================
// Research Phase Quality Gate
// ============================================================================

const researchCriteria: QualityCriterion[] = [
  {
    name: 'Source Count',
    description: 'Minimum number of relevant sources found',
    weight: 0.25,
    evaluate: (findings: ResearchFindings) => {
      const count = findings?.sources?.length || 0
      if (count >= 50) return 100
      if (count >= 30) return 80
      if (count >= 20) return 70
      if (count >= 10) return 60
      if (count >= 5) return 40
      return 20
    },
  },
  {
    name: 'Source Diversity',
    description: 'Mix of source types (papers, patents, datasets)',
    weight: 0.15,
    evaluate: (findings: ResearchFindings) => {
      const sources = findings?.sources || []
      const types = new Set(sources.map((s: Source) => s.type))
      if (types.size >= 4) return 100
      if (types.size >= 3) return 80
      if (types.size >= 2) return 60
      return 40
    },
  },
  {
    name: 'Key Findings Quality',
    description: 'Number and confidence of key findings',
    weight: 0.25,
    evaluate: (findings: ResearchFindings) => {
      const keyFindings = findings?.keyFindings || []
      if (keyFindings.length === 0) return 30

      const avgConfidence = keyFindings.reduce((sum, f) => sum + f.confidence, 0) / keyFindings.length
      const countScore = Math.min(100, keyFindings.length * 20)

      return (avgConfidence * 0.6 + countScore * 0.4)
    },
  },
  {
    name: 'Gap Identification',
    description: 'Technological gaps identified for innovation',
    weight: 0.15,
    evaluate: (findings: ResearchFindings) => {
      const gaps = findings?.technologicalGaps?.length || 0
      if (gaps >= 5) return 100
      if (gaps >= 3) return 80
      if (gaps >= 1) return 60
      return 30
    },
  },
  {
    name: 'Recency',
    description: 'Sources include recent publications',
    weight: 0.2,
    evaluate: (findings: ResearchFindings) => {
      const sources = findings?.sources || []
      const currentYear = new Date().getFullYear()

      let recentCount = 0
      for (const source of sources) {
        const year = parseInt(source.publishedDate?.match(/\d{4}/)?.[0] || '2000')
        if (year >= currentYear - 2) recentCount++
      }

      const ratio = sources.length > 0 ? recentCount / sources.length : 0
      return Math.min(100, ratio * 150) // Bonus for high recency
    },
  },
]

export const researchQualityGate: QualityGate = {
  phase: 'research',
  criteria: researchCriteria,
  threshold: 65,
  maxIterations: 3,
}

// ============================================================================
// Hypothesis Generation Quality Gate
// ============================================================================

const hypothesisCriteria: QualityCriterion[] = [
  {
    name: 'Hypothesis Count',
    description: 'Number of hypotheses generated',
    weight: 0.2,
    evaluate: (hypotheses: Hypothesis[]) => {
      const count = hypotheses?.length || 0
      if (count >= 5) return 100
      if (count >= 3) return 80
      if (count >= 2) return 60
      if (count >= 1) return 40
      return 0
    },
  },
  {
    name: 'Testability',
    description: 'Hypotheses have measurable predictions',
    weight: 0.25,
    evaluate: (hypotheses: Hypothesis[]) => {
      if (!hypotheses || hypotheses.length === 0) return 0

      let testableCount = 0
      for (const h of hypotheses) {
        const hasMeasurable = h.predictions?.some(p => p.measurable) || false
        const hasMetrics = (h.validationMetrics?.length || 0) > 0
        if (hasMeasurable && hasMetrics) testableCount++
      }

      return (testableCount / hypotheses.length) * 100
    },
  },
  {
    name: 'Evidence Support',
    description: 'Hypotheses have supporting evidence',
    weight: 0.2,
    evaluate: (hypotheses: Hypothesis[]) => {
      if (!hypotheses || hypotheses.length === 0) return 0

      let supportedCount = 0
      for (const h of hypotheses) {
        if ((h.supportingEvidence?.length || 0) >= 2) supportedCount++
      }

      return (supportedCount / hypotheses.length) * 100
    },
  },
  {
    name: 'Feasibility Score',
    description: 'Average feasibility of hypotheses',
    weight: 0.2,
    evaluate: (hypotheses: Hypothesis[]) => {
      if (!hypotheses || hypotheses.length === 0) return 0
      return hypotheses.reduce((sum, h) => sum + (h.feasibilityScore || 0), 0) / hypotheses.length
    },
  },
  {
    name: 'Novelty Score',
    description: 'Average novelty of hypotheses',
    weight: 0.15,
    evaluate: (hypotheses: Hypothesis[]) => {
      if (!hypotheses || hypotheses.length === 0) return 0
      return hypotheses.reduce((sum, h) => sum + (h.noveltyScore || 0), 0) / hypotheses.length
    },
  },
]

export const hypothesisQualityGate: QualityGate = {
  phase: 'hypothesis_generation',
  criteria: hypothesisCriteria,
  threshold: 60,
  maxIterations: 2,
}

// ============================================================================
// Experiment Design Quality Gate
// ============================================================================

const experimentCriteria: QualityCriterion[] = [
  {
    name: 'Completeness',
    description: 'Design includes all required elements',
    weight: 0.3,
    evaluate: (designs: ExperimentDesign[]) => {
      if (!designs || designs.length === 0) return 0

      let completeCount = 0
      for (const d of designs) {
        const hasMaterials = (d.materials?.length || 0) > 0
        const hasEquipment = (d.equipment?.length || 0) > 0
        const hasProcedure = (d.procedure?.length || 0) > 0
        const hasSafety = (d.safetyRequirements?.length || 0) > 0

        if (hasMaterials && hasEquipment && hasProcedure && hasSafety) {
          completeCount++
        }
      }

      return (completeCount / designs.length) * 100
    },
  },
  {
    name: 'Safety Coverage',
    description: 'Safety requirements are documented',
    weight: 0.25,
    evaluate: (designs: ExperimentDesign[]) => {
      if (!designs || designs.length === 0) return 0

      let score = 0
      for (const d of designs) {
        const safetyCount = d.safetyRequirements?.length || 0
        const failureModeCount = d.failureModes?.length || 0

        if (safetyCount >= 3 && failureModeCount >= 2) score += 100
        else if (safetyCount >= 2 || failureModeCount >= 1) score += 70
        else if (safetyCount >= 1) score += 40
      }

      return score / designs.length
    },
  },
  {
    name: 'Procedure Detail',
    description: 'Procedure steps are detailed and actionable',
    weight: 0.25,
    evaluate: (designs: ExperimentDesign[]) => {
      if (!designs || designs.length === 0) return 0

      let score = 0
      for (const d of designs) {
        const stepCount = d.procedure?.length || 0
        if (stepCount >= 10) score += 100
        else if (stepCount >= 7) score += 85
        else if (stepCount >= 5) score += 70
        else if (stepCount >= 3) score += 50
        else score += 30
      }

      return score / designs.length
    },
  },
  {
    name: 'Feasibility',
    description: 'Design is feasible to execute',
    weight: 0.2,
    evaluate: (designs: ExperimentDesign[]) => {
      if (!designs || designs.length === 0) return 0

      let score = 0
      for (const d of designs) {
        const difficultyScore = d.difficulty === 'low' ? 100 : d.difficulty === 'medium' ? 70 : 50
        const costScore = d.estimatedCost ? Math.max(0, 100 - d.estimatedCost / 1000) : 50
        score += (difficultyScore * 0.6 + costScore * 0.4)
      }

      return score / designs.length
    },
  },
]

export const experimentQualityGate: QualityGate = {
  phase: 'experiment_design',
  criteria: experimentCriteria,
  threshold: 65,
  maxIterations: 2,
}

// ============================================================================
// Simulation Quality Gate
// ============================================================================

const simulationCriteria: QualityCriterion[] = [
  {
    name: 'Convergence',
    description: 'Simulations converged successfully',
    weight: 0.35,
    evaluate: (results: SimulationResult[]) => {
      if (!results || results.length === 0) return 0

      let convergedCount = 0
      for (const r of results) {
        if (r.convergenceMetrics?.converged) convergedCount++
      }

      return (convergedCount / results.length) * 100
    },
  },
  {
    name: 'Output Completeness',
    description: 'All expected outputs are present',
    weight: 0.25,
    evaluate: (results: SimulationResult[]) => {
      if (!results || results.length === 0) return 0

      let score = 0
      for (const r of results) {
        const outputCount = r.outputs?.length || 0
        if (outputCount >= 5) score += 100
        else if (outputCount >= 3) score += 80
        else if (outputCount >= 1) score += 50
      }

      return score / results.length
    },
  },
  {
    name: 'Confidence',
    description: 'Output confidence levels',
    weight: 0.2,
    evaluate: (results: SimulationResult[]) => {
      if (!results || results.length === 0) return 0

      let totalConfidence = 0
      let count = 0

      for (const r of results) {
        for (const output of r.outputs || []) {
          if (output.confidence !== undefined) {
            totalConfidence += output.confidence
            count++
          }
        }
      }

      return count > 0 ? totalConfidence / count : 50
    },
  },
  {
    name: 'Residual',
    description: 'Low simulation residuals',
    weight: 0.2,
    evaluate: (results: SimulationResult[]) => {
      if (!results || results.length === 0) return 0

      let score = 0
      for (const r of results) {
        const residual = r.convergenceMetrics?.residual ?? 1
        const tolerance = r.convergenceMetrics?.tolerance ?? 0.001

        if (residual <= tolerance) score += 100
        else if (residual <= tolerance * 10) score += 70
        else if (residual <= tolerance * 100) score += 40
        else score += 20
      }

      return score / results.length
    },
  },
]

export const simulationQualityGate: QualityGate = {
  phase: 'simulation',
  criteria: simulationCriteria,
  threshold: 70,
  maxIterations: 3,
}

// ============================================================================
// Analysis Quality Gate
// ============================================================================

const analysisCriteria: QualityCriterion[] = [
  {
    name: 'Conclusion Strength',
    description: 'Conclusions are well-supported',
    weight: 0.3,
    evaluate: (conclusions: AnalysisConclusion[]) => {
      if (!conclusions || conclusions.length === 0) return 0

      const supportLevels: Record<string, number> = {
        'strongly_supported': 100,
        'supported': 80,
        'inconclusive': 50,
        'contradicted': 30,
        'strongly_contradicted': 10,
      }

      let total = 0
      for (const c of conclusions) {
        total += supportLevels[c.supportLevel] || 50
      }

      return total / conclusions.length
    },
  },
  {
    name: 'Metric Validation',
    description: 'Predictions match observations',
    weight: 0.25,
    evaluate: (conclusions: AnalysisConclusion[]) => {
      if (!conclusions || conclusions.length === 0) return 0

      let validCount = 0
      let totalCount = 0

      for (const c of conclusions) {
        for (const m of c.keyMetrics || []) {
          totalCount++
          if (m.withinExpectation) validCount++
        }
      }

      return totalCount > 0 ? (validCount / totalCount) * 100 : 50
    },
  },
  {
    name: 'Literature Consistency',
    description: 'Results consistent with literature',
    weight: 0.25,
    evaluate: (conclusions: AnalysisConclusion[]) => {
      if (!conclusions || conclusions.length === 0) return 0

      let consistentCount = 0
      let totalCount = 0

      for (const c of conclusions) {
        for (const l of c.literatureComparison || []) {
          totalCount++
          if (l.consistency === 'consistent' || l.consistency === 'novel') consistentCount++
        }
      }

      return totalCount > 0 ? (consistentCount / totalCount) * 100 : 50
    },
  },
  {
    name: 'Confidence',
    description: 'Analysis confidence levels',
    weight: 0.2,
    evaluate: (conclusions: AnalysisConclusion[]) => {
      if (!conclusions || conclusions.length === 0) return 0
      return conclusions.reduce((sum, c) => sum + (c.confidence || 0), 0) / conclusions.length
    },
  },
]

export const analysisQualityGate: QualityGate = {
  phase: 'analysis',
  criteria: analysisCriteria,
  threshold: 65,
  maxIterations: 2,
}

// ============================================================================
// Quality Evaluator
// ============================================================================

/**
 * Get quality gate for a phase
 */
export function getQualityGate(phase: WorkflowPhase): QualityGate {
  const gates: Record<WorkflowPhase, QualityGate> = {
    research: researchQualityGate,
    hypothesis_generation: hypothesisQualityGate,
    experiment_design: experimentQualityGate,
    simulation: simulationQualityGate,
    analysis: analysisQualityGate,
    tea_analysis: analysisQualityGate, // Reuse analysis gate
  }

  return gates[phase]
}

/**
 * Evaluate quality for a phase
 */
export function evaluateQuality(phase: WorkflowPhase, results: any): QualityEvaluation {
  const gate = getQualityGate(phase)

  const criteriaScores: Record<string, { score: number; weight: number }> = {}
  let weightedSum = 0

  for (const criterion of gate.criteria) {
    const score = criterion.evaluate(results)
    criteriaScores[criterion.name] = { score, weight: criterion.weight }
    weightedSum += score * criterion.weight
  }

  const overallScore = Math.round(weightedSum)
  const passed = overallScore >= gate.threshold

  // Generate recommendations for failed criteria
  const recommendations: string[] = []
  for (const [name, { score, weight }] of Object.entries(criteriaScores)) {
    if (score < 60) {
      recommendations.push(`Improve ${name.toLowerCase()} (current: ${Math.round(score)}/100)`)
    }
  }

  return {
    phase,
    overallScore,
    passed,
    criteriaScores,
    recommendations,
  }
}

/**
 * Check if iteration is needed
 */
export function shouldIterate(phase: WorkflowPhase, results: any, currentIteration: number): {
  iterate: boolean
  reason?: string
} {
  const gate = getQualityGate(phase)
  const evaluation = evaluateQuality(phase, results)

  if (currentIteration >= gate.maxIterations) {
    return { iterate: false, reason: 'Maximum iterations reached' }
  }

  if (!evaluation.passed) {
    return {
      iterate: true,
      reason: `Quality score ${evaluation.overallScore} below threshold ${gate.threshold}`,
    }
  }

  return { iterate: false }
}
