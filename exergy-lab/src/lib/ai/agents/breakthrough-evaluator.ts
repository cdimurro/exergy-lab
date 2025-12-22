/**
 * Breakthrough Evaluator
 *
 * Evaluates hypotheses across all 12 breakthrough dimensions:
 * - Impact Dimensions (BC1-BC8): 8.0 points
 * - Feasibility Dimensions (BC9-BC12): 2.0 points
 * Uses the BreakthroughJudge for scoring and provides detailed dimension analysis.
 *
 * @see rubrics/types-breakthrough.ts - Breakthrough dimension types
 * @see rubrics/breakthrough-judge.ts - BreakthroughJudge implementation
 * @see hypgen/base.ts - RacingHypothesis type
 */

import { BreakthroughJudge, type BreakthroughJudgeConfig } from '../rubrics/breakthrough-judge'
import {
  type BreakthroughDimension,
  type DimensionScore,
  type ClassificationTier,
  type BreakthroughEvaluationResult,
  getClassificationFromScore,
  shouldEliminate,
  isBreakthroughCandidate,
  DIMENSION_CONFIGS,
} from '../rubrics/types-breakthrough'
import { evaluateBreakthroughDimensions } from '../rubrics/templates/breakthrough'
import type { RacingHypothesis, HypGenAgentType } from './hypgen/base'

// ============================================================================
// Types
// ============================================================================

export interface EvaluationConfig {
  judgeConfig?: Partial<BreakthroughJudgeConfig>
  enableDetailedScoring: boolean
  trackScoreHistory: boolean
  parallelEvaluation: boolean
  maxConcurrency: number
}

export const DEFAULT_EVALUATION_CONFIG: EvaluationConfig = {
  enableDetailedScoring: true,
  trackScoreHistory: true,
  parallelEvaluation: true,
  maxConcurrency: 5,
}

export interface HypothesisEvaluation {
  hypothesisId: string
  agentSource: HypGenAgentType
  iteration: number
  overallScore: number
  classification: ClassificationTier
  dimensionScores: Map<BreakthroughDimension, DimensionScore>
  passedDimensions: BreakthroughDimension[]
  failedDimensions: BreakthroughDimension[]
  weakestDimensions: BreakthroughDimension[]
  strongestDimensions: BreakthroughDimension[]
  shouldEliminate: boolean
  isBreakthroughCandidate: boolean
  previousScore?: number
  scoreChange?: number
  recommendations: string[]
  timestamp: Date
}

export interface BatchEvaluationResult {
  evaluations: HypothesisEvaluation[]
  breakthroughCandidates: RacingHypothesis[]
  eliminatedHypotheses: RacingHypothesis[]
  activeHypotheses: RacingHypothesis[]
  leaderboard: LeaderboardEntry[]
  statistics: EvaluationStatistics
}

export interface LeaderboardEntry {
  rank?: number
  hypothesisId: string
  agentSource: HypGenAgentType
  title: string
  score: number
  classification: ClassificationTier
  scoreChange: number
  iteration: number
  previousScore?: number
  isBreakthrough?: boolean
  /** FrontierScience component score (0-5) from hybrid evaluator */
  fsScore?: number
  /** Breakthrough detection component score (0-5) from hybrid evaluator */
  bdScore?: number
}

export interface EvaluationStatistics {
  totalEvaluated: number
  averageScore: number
  medianScore: number
  breakthroughCount: number
  eliminatedCount: number
  improvingCount: number
  decliningCount: number
  byAgent: Map<HypGenAgentType, AgentStatistics>
}

export interface AgentStatistics {
  agentType: HypGenAgentType
  hypothesesCount: number
  averageScore: number
  bestScore: number
  improvedCount: number
  eliminatedCount: number
}

export type EvaluationEventType =
  | 'evaluation_started'
  | 'hypothesis_evaluated'
  | 'breakthrough_detected'
  | 'hypothesis_eliminated'
  | 'batch_complete'

export interface EvaluationEvent {
  type: EvaluationEventType
  hypothesisId?: string
  score?: number
  classification?: ClassificationTier
  timestamp: number
}

export type EvaluationEventCallback = (event: EvaluationEvent) => void

// ============================================================================
// Breakthrough Evaluator Class
// ============================================================================

export class BreakthroughEvaluator {
  private config: EvaluationConfig
  private judge: BreakthroughJudge
  private scoreHistory: Map<string, number[]> = new Map()
  private eventCallbacks: EvaluationEventCallback[] = []

  constructor(config: Partial<EvaluationConfig> = {}) {
    this.config = { ...DEFAULT_EVALUATION_CONFIG, ...config }
    this.judge = new BreakthroughJudge(config.judgeConfig)
  }

  /**
   * Subscribe to evaluation events
   */
  onEvent(callback: EvaluationEventCallback): () => void {
    this.eventCallbacks.push(callback)
    return () => {
      const index = this.eventCallbacks.indexOf(callback)
      if (index >= 0) this.eventCallbacks.splice(index, 1)
    }
  }

  /**
   * Emit an evaluation event
   */
  private emit(event: EvaluationEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event)
      } catch (error) {
        console.error('[BreakthroughEvaluator] Event callback error:', error)
      }
    }
  }

  /**
   * Evaluate a single hypothesis
   */
  async evaluateHypothesis(
    hypothesis: RacingHypothesis,
    problem: string,
    iteration: number
  ): Promise<HypothesisEvaluation> {
    console.log(
      `[BreakthroughEvaluator] Evaluating ${hypothesis.id} (iteration ${iteration})`
    )

    this.emit({
      type: 'evaluation_started',
      hypothesisId: hypothesis.id,
      timestamp: Date.now(),
    })

    // Run the judge evaluation
    const { breakthroughResult, classification } = await this.judge.evaluateBreakthrough(
      problem,
      hypothesis,
      iteration
    )

    // Extract dimension scores from the dimensions object (all 12 dimensions)
    const dimensionScores = new Map<BreakthroughDimension, DimensionScore>()
    const dims = breakthroughResult.dimensions
    const dimensionKeys: BreakthroughDimension[] = [
      // Impact dimensions (BC1-BC8)
      'bc1_performance', 'bc2_cost', 'bc3_capabilities', 'bc4_applications',
      'bc5_societal', 'bc6_scale', 'bc7_problem_solving', 'bc8_trajectory',
      // Feasibility dimensions (BC9-BC12)
      'bc9_feasibility', 'bc10_literature', 'bc11_infrastructure', 'bc12_capital'
    ]
    for (const key of dimensionKeys) {
      dimensionScores.set(key, dims[key])
    }

    // Analyze dimensions
    const passedDimensions: BreakthroughDimension[] = []
    const failedDimensions: BreakthroughDimension[] = []

    for (const [dim, score] of dimensionScores.entries()) {
      if (score.percentOfMax >= 70) {
        passedDimensions.push(dim)
      } else {
        failedDimensions.push(dim)
      }
    }

    // Sort by score to find weakest/strongest
    const sortedByScore = Array.from(dimensionScores.entries())
      .sort(([, a], [, b]) => a.percentOfMax - b.percentOfMax)

    const weakestDimensions = sortedByScore.slice(0, 3).map(([dim]) => dim)
    const strongestDimensions = sortedByScore.slice(-3).reverse().map(([dim]) => dim)

    // Track score history
    const previousScores = this.scoreHistory.get(hypothesis.id) || []
    const previousScore = previousScores.length > 0 ? previousScores[previousScores.length - 1] : undefined
    const scoreChange = previousScore !== undefined
      ? breakthroughResult.totalScore - previousScore
      : undefined

    if (this.config.trackScoreHistory) {
      previousScores.push(breakthroughResult.totalScore)
      this.scoreHistory.set(hypothesis.id, previousScores)
    }

    // Generate recommendations based on weak dimensions
    const recommendations = this.generateRecommendations(
      weakestDimensions,
      dimensionScores
    )

    const evaluation: HypothesisEvaluation = {
      hypothesisId: hypothesis.id,
      agentSource: hypothesis.agentSource,
      iteration,
      overallScore: breakthroughResult.totalScore,
      classification,
      dimensionScores,
      passedDimensions,
      failedDimensions,
      weakestDimensions,
      strongestDimensions,
      shouldEliminate: shouldEliminate(breakthroughResult.totalScore, iteration),
      isBreakthroughCandidate: isBreakthroughCandidate(breakthroughResult.totalScore),
      previousScore,
      scoreChange,
      recommendations,
      timestamp: new Date(),
    }

    // Emit appropriate events
    this.emit({
      type: 'hypothesis_evaluated',
      hypothesisId: hypothesis.id,
      score: evaluation.overallScore,
      classification,
      timestamp: Date.now(),
    })

    if (evaluation.isBreakthroughCandidate) {
      this.emit({
        type: 'breakthrough_detected',
        hypothesisId: hypothesis.id,
        score: evaluation.overallScore,
        classification,
        timestamp: Date.now(),
      })
    }

    if (evaluation.shouldEliminate) {
      this.emit({
        type: 'hypothesis_eliminated',
        hypothesisId: hypothesis.id,
        score: evaluation.overallScore,
        classification,
        timestamp: Date.now(),
      })
    }

    return evaluation
  }

  /**
   * Evaluate a batch of hypotheses
   */
  async evaluateBatch(
    hypotheses: RacingHypothesis[],
    problem: string,
    iteration: number
  ): Promise<BatchEvaluationResult> {
    console.log(
      `[BreakthroughEvaluator] Evaluating batch of ${hypotheses.length} hypotheses`
    )

    // Evaluate in parallel or sequentially
    const evaluations: HypothesisEvaluation[] = []

    if (this.config.parallelEvaluation) {
      // Process in batches to respect concurrency limit
      for (let i = 0; i < hypotheses.length; i += this.config.maxConcurrency) {
        const batch = hypotheses.slice(i, i + this.config.maxConcurrency)
        const batchResults = await Promise.all(
          batch.map(h => this.evaluateHypothesis(h, problem, iteration))
        )
        evaluations.push(...batchResults)
      }
    } else {
      for (const hypothesis of hypotheses) {
        const evaluation = await this.evaluateHypothesis(hypothesis, problem, iteration)
        evaluations.push(evaluation)
      }
    }

    // Update hypotheses with new scores
    const updatedHypotheses = hypotheses.map(h => {
      const evaluation = evaluations.find(e => e.hypothesisId === h.id)
      if (!evaluation) return h

      return {
        ...h,
        scores: {
          overall: evaluation.overallScore,
          dimensions: evaluation.dimensionScores,
        },
        status: evaluation.shouldEliminate
          ? 'eliminated' as const
          : evaluation.isBreakthroughCandidate
            ? 'breakthrough' as const
            : 'active' as const,
        eliminatedReason: evaluation.shouldEliminate
          ? `Score ${evaluation.overallScore.toFixed(1)} below elimination threshold`
          : undefined,
      }
    })

    // Categorize hypotheses
    const breakthroughCandidates = updatedHypotheses.filter(h => h.status === 'breakthrough')
    const eliminatedHypotheses = updatedHypotheses.filter(h => h.status === 'eliminated')
    const activeHypotheses = updatedHypotheses.filter(h => h.status === 'active')

    // Generate leaderboard
    const leaderboard = this.generateLeaderboard(evaluations, hypotheses)

    // Calculate statistics
    const statistics = this.calculateStatistics(evaluations)

    this.emit({
      type: 'batch_complete',
      timestamp: Date.now(),
    })

    return {
      evaluations,
      breakthroughCandidates,
      eliminatedHypotheses,
      activeHypotheses,
      leaderboard,
      statistics,
    }
  }

  /**
   * Quick evaluation using automated checks only (no AI judge)
   * Useful for fast preliminary scoring
   */
  async quickEvaluate(hypothesis: RacingHypothesis): Promise<{
    score: number
    classification: ClassificationTier
    passedDimensions: BreakthroughDimension[]
    feasibilityConfidence?: 'high' | 'medium' | 'low'
  }> {
    // Use the automated validation functions
    const evalResult = await evaluateBreakthroughDimensions(hypothesis)

    const totalScore = evalResult.totalScore
    const classification = evalResult.classification

    // Extract dimension scores from the dimensions object (all 12 dimensions)
    const dimensionKeys: BreakthroughDimension[] = [
      // Impact dimensions (BC1-BC8)
      'bc1_performance', 'bc2_cost', 'bc3_capabilities', 'bc4_applications',
      'bc5_societal', 'bc6_scale', 'bc7_problem_solving', 'bc8_trajectory',
      // Feasibility dimensions (BC9-BC12)
      'bc9_feasibility', 'bc10_literature', 'bc11_infrastructure', 'bc12_capital'
    ]

    const passedDimensions = dimensionKeys.filter(key =>
      evalResult.dimensions[key].percentOfMax >= 70
    )

    return {
      score: totalScore,
      classification,
      passedDimensions,
      feasibilityConfidence: evalResult.feasibilityConfidence,
    }
  }

  /**
   * Get dimension config by ID
   */
  private getDimensionConfig(dim: BreakthroughDimension) {
    return DIMENSION_CONFIGS.find(c => c.id === dim)
  }

  /**
   * Generate recommendations based on weak dimensions
   */
  private generateRecommendations(
    weakDimensions: BreakthroughDimension[],
    scores: Map<BreakthroughDimension, DimensionScore>
  ): string[] {
    const recommendations: string[] = []

    for (const dim of weakDimensions) {
      const score = scores.get(dim)
      if (!score) continue

      const config = this.getDimensionConfig(dim)
      if (!config) continue
      const percentOfMax = score.percentOfMax

      if (percentOfMax < 30) {
        recommendations.push(
          `${config.name}: Critical gap (${percentOfMax.toFixed(0)}%). ` +
          `Requires major improvement. ${config.description}`
        )
      } else if (percentOfMax < 50) {
        recommendations.push(
          `${config.name}: Significant weakness (${percentOfMax.toFixed(0)}%). ` +
          `Focus on: ${score.gaps.slice(0, 2).join(', ')}`
        )
      } else if (percentOfMax < 70) {
        recommendations.push(
          `${config.name}: Close to passing (${percentOfMax.toFixed(0)}%). ` +
          `Minor improvements needed: ${score.gaps[0] || config.description}`
        )
      }
    }

    return recommendations.slice(0, 5) // Top 5 recommendations
  }

  /**
   * Generate leaderboard from evaluations
   */
  private generateLeaderboard(
    evaluations: HypothesisEvaluation[],
    hypotheses: RacingHypothesis[]
  ): LeaderboardEntry[] {
    return evaluations
      .sort((a, b) => b.overallScore - a.overallScore)
      .map((evaluation, index) => {
        const hypothesis = hypotheses.find(h => h.id === evaluation.hypothesisId)

        return {
          rank: index + 1,
          hypothesisId: evaluation.hypothesisId,
          agentSource: evaluation.agentSource,
          title: hypothesis?.title || 'Unknown',
          score: evaluation.overallScore,
          classification: evaluation.classification,
          scoreChange: evaluation.scoreChange || 0,
          iteration: evaluation.iteration,
        }
      })
  }

  /**
   * Calculate batch statistics
   */
  private calculateStatistics(evaluations: HypothesisEvaluation[]): EvaluationStatistics {
    const scores = evaluations.map(e => e.overallScore)
    const sortedScores = [...scores].sort((a, b) => a - b)

    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length
    const medianScore = sortedScores.length % 2 === 0
      ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
      : sortedScores[Math.floor(sortedScores.length / 2)]

    const breakthroughCount = evaluations.filter(e => e.isBreakthroughCandidate).length
    const eliminatedCount = evaluations.filter(e => e.shouldEliminate).length
    const improvingCount = evaluations.filter(e => (e.scoreChange || 0) > 0).length
    const decliningCount = evaluations.filter(e => (e.scoreChange || 0) < 0).length

    // Calculate by agent
    const byAgent = new Map<HypGenAgentType, AgentStatistics>()
    const agentTypes: HypGenAgentType[] = ['novel', 'feasible', 'economic', 'cross-domain', 'paradigm']

    for (const agentType of agentTypes) {
      const agentEvals = evaluations.filter(e => e.agentSource === agentType)
      if (agentEvals.length === 0) continue

      const agentScores = agentEvals.map(e => e.overallScore)

      byAgent.set(agentType, {
        agentType,
        hypothesesCount: agentEvals.length,
        averageScore: agentScores.reduce((a, b) => a + b, 0) / agentScores.length,
        bestScore: Math.max(...agentScores),
        improvedCount: agentEvals.filter(e => (e.scoreChange || 0) > 0).length,
        eliminatedCount: agentEvals.filter(e => e.shouldEliminate).length,
      })
    }

    return {
      totalEvaluated: evaluations.length,
      averageScore,
      medianScore,
      breakthroughCount,
      eliminatedCount,
      improvingCount,
      decliningCount,
      byAgent,
    }
  }

  /**
   * Get score history for a hypothesis
   */
  getScoreHistory(hypothesisId: string): number[] {
    return this.scoreHistory.get(hypothesisId) || []
  }

  /**
   * Clear score history (e.g., at start of new discovery)
   */
  clearHistory(): void {
    this.scoreHistory.clear()
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createBreakthroughEvaluator(
  config?: Partial<EvaluationConfig>
): BreakthroughEvaluator {
  return new BreakthroughEvaluator(config)
}
