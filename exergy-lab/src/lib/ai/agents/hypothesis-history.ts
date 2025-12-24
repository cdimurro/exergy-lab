/**
 * Hypothesis History Tracking System
 *
 * Inspired by Poetiq ARC-AGI solver's solution history pattern.
 * Maintains a comprehensive record of hypothesis iterations with:
 * - Structured feedback with diff visualization
 * - Score trajectory tracking (improving/stable/declining)
 * - Lessons learned from each iteration
 * - BEFORE/AFTER comparison for refinements
 *
 * @see poetiq-analysis.md - Analysis of Poetiq patterns
 * @see enhanced-refinement-agent.ts - Uses this for feedback generation
 */

import type {
  BreakthroughDimension,
  DimensionScore,
  RefinementFeedback,
} from '../rubrics/types-breakthrough'
import type { RacingHypothesis, HypGenAgentType } from './hypgen/base'

// ============================================================================
// Trajectory Types
// ============================================================================

/**
 * Score trajectory indicates improvement direction
 */
export type ScoreTrajectory = 'improving' | 'stable' | 'declining' | 'first'

/**
 * Calculate trajectory from score history
 */
export function calculateTrajectory(scores: number[]): ScoreTrajectory {
  if (scores.length === 0) return 'first'
  if (scores.length === 1) return 'first'

  const current = scores[scores.length - 1]
  const previous = scores[scores.length - 2]
  const delta = current - previous

  // Use 0.2 threshold for meaningful change
  if (delta > 0.2) return 'improving'
  if (delta < -0.2) return 'declining'
  return 'stable'
}

/**
 * Calculate average trajectory over multiple iterations
 */
export function calculateAverageTrajectory(scores: number[]): {
  trajectory: ScoreTrajectory
  averageDelta: number
  consistency: number // 0-1, higher = more consistent direction
} {
  if (scores.length < 2) {
    return { trajectory: 'first', averageDelta: 0, consistency: 1 }
  }

  const deltas: number[] = []
  for (let i = 1; i < scores.length; i++) {
    deltas.push(scores[i] - scores[i - 1])
  }

  const averageDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length

  // Calculate consistency (how often deltas agree in direction)
  const positiveCount = deltas.filter(d => d > 0).length
  const negativeCount = deltas.filter(d => d < 0).length
  const consistency = Math.max(positiveCount, negativeCount) / deltas.length

  let trajectory: ScoreTrajectory = 'stable'
  if (averageDelta > 0.15) trajectory = 'improving'
  else if (averageDelta < -0.15) trajectory = 'declining'

  return { trajectory, averageDelta, consistency }
}

// ============================================================================
// Dimension Diff Types
// ============================================================================

/**
 * Diff for a single dimension showing BEFORE/AFTER
 */
export interface DimensionDiff {
  dimension: BreakthroughDimension
  previousScore: number
  currentScore: number
  targetScore: number
  delta: number
  trajectory: ScoreTrajectory
  gapsIdentified: string[]
  improvementsMade: string[]
  stillMissing: string[]
}

/**
 * Create dimension diff between two evaluations
 */
export function createDimensionDiff(
  dimension: BreakthroughDimension,
  previous: DimensionScore | undefined,
  current: DimensionScore,
  target: number
): DimensionDiff {
  const previousScore = previous?.percentOfMax ?? 0
  const currentScore = current.percentOfMax
  const delta = currentScore - previousScore

  let trajectory: ScoreTrajectory = 'first'
  if (previous) {
    if (delta > 5) trajectory = 'improving'
    else if (delta < -5) trajectory = 'declining'
    else trajectory = 'stable'
  }

  // Identify what's still missing
  const stillMissing = current.gaps || []

  // Identify improvements made (gaps that were in previous but not in current)
  const previousGaps = previous?.gaps || []
  const improvementsMade = previousGaps.filter(
    gap => !stillMissing.some(m => m.toLowerCase().includes(gap.toLowerCase().slice(0, 20)))
  )

  return {
    dimension,
    previousScore,
    currentScore,
    targetScore: target,
    delta,
    trajectory,
    gapsIdentified: previousGaps,
    improvementsMade,
    stillMissing,
  }
}

// ============================================================================
// Iteration Record Types
// ============================================================================

/**
 * Complete record of a single hypothesis iteration
 * Includes everything needed for feedback integration
 */
export interface HypothesisIterationRecord {
  /** Iteration number (1-based) */
  iteration: number

  /** Timestamp when this iteration was evaluated */
  timestamp: number

  /** Overall score for this iteration */
  score: number

  /** Score change from previous iteration */
  scoreDelta: number

  /** Trajectory at this point */
  trajectory: ScoreTrajectory

  /** Dimension scores at this iteration */
  dimensionScores: Map<BreakthroughDimension, DimensionScore>

  /** Dimension diffs from previous iteration */
  dimensionDiffs: DimensionDiff[]

  /** Hypothesis statement at this iteration */
  statement: string

  /** Key changes made in this iteration */
  changesMade: string[]

  /** Feedback received (from refinement agent) */
  feedbackReceived?: {
    overallAssessment: string
    primaryFocus: string
    specificSuggestions: string[]
  }

  /** Lesson learned from this iteration */
  lessonLearned?: string

  /** Whether this iteration improved, degraded, or maintained */
  outcome: 'improved' | 'degraded' | 'maintained' | 'breakthrough'
}

/**
 * Complete history for a hypothesis across all iterations
 */
export interface HypothesisHistory {
  /** Hypothesis ID */
  hypothesisId: string

  /** Agent that created this hypothesis */
  agentSource: HypGenAgentType

  /** Hypothesis title */
  title: string

  /** All iteration records (ordered oldest to newest) */
  iterations: HypothesisIterationRecord[]

  /** Current status */
  status: 'active' | 'eliminated' | 'breakthrough' | 'pending'

  /** Overall trajectory across all iterations */
  overallTrajectory: {
    trajectory: ScoreTrajectory
    averageDelta: number
    consistency: number
  }

  /** Best score achieved */
  bestScore: number

  /** Iteration that achieved best score */
  bestIteration: number

  /** Dimensions that consistently improve */
  improvingDimensions: BreakthroughDimension[]

  /** Dimensions that consistently struggle */
  strugglingDimensions: BreakthroughDimension[]

  /** Key lessons learned across iterations */
  cumulativeLessons: string[]
}

// ============================================================================
// History Manager
// ============================================================================

/**
 * Manages hypothesis history for the refinement loop
 */
export class HypothesisHistoryManager {
  private histories: Map<string, HypothesisHistory> = new Map()

  /**
   * Get or create history for a hypothesis
   */
  getHistory(hypothesis: RacingHypothesis): HypothesisHistory {
    let history = this.histories.get(hypothesis.id)

    if (!history) {
      history = this.createHistory(hypothesis)
      this.histories.set(hypothesis.id, history)
    }

    return history
  }

  /**
   * Create new history for a hypothesis
   */
  private createHistory(hypothesis: RacingHypothesis): HypothesisHistory {
    return {
      hypothesisId: hypothesis.id,
      agentSource: hypothesis.agentSource,
      title: hypothesis.title,
      iterations: [],
      status: hypothesis.status,
      overallTrajectory: { trajectory: 'first', averageDelta: 0, consistency: 1 },
      bestScore: 0,
      bestIteration: 0,
      improvingDimensions: [],
      strugglingDimensions: [],
      cumulativeLessons: [],
    }
  }

  /**
   * Record a new iteration for a hypothesis
   */
  recordIteration(
    hypothesis: RacingHypothesis,
    feedback?: RefinementFeedback
  ): HypothesisIterationRecord {
    const history = this.getHistory(hypothesis)
    const previousIteration = history.iterations[history.iterations.length - 1]
    const previousScore = previousIteration?.score ?? 0

    const scoreDelta = hypothesis.scores.overall - previousScore

    // Calculate trajectory
    const scores = history.iterations.map(i => i.score).concat(hypothesis.scores.overall)
    const trajectory = calculateTrajectory(scores)

    // Create dimension diffs
    const dimensionDiffs: DimensionDiff[] = []
    for (const [dimension, score] of hypothesis.scores.dimensions.entries()) {
      const previousDimScore = previousIteration?.dimensionScores.get(dimension)
      const targetScore = this.getTargetScore(dimension, score.percentOfMax)
      dimensionDiffs.push(createDimensionDiff(dimension, previousDimScore, score, targetScore))
    }

    // Determine outcome
    let outcome: HypothesisIterationRecord['outcome'] = 'maintained'
    if (hypothesis.scores.overall >= 9.0) outcome = 'breakthrough'
    else if (scoreDelta > 0.3) outcome = 'improved'
    else if (scoreDelta < -0.3) outcome = 'degraded'

    // Extract changes made
    const changesMade = this.extractChangesMade(previousIteration, hypothesis)

    // Generate lesson learned
    const lessonLearned = this.generateLessonLearned(outcome, dimensionDiffs, feedback)

    const record: HypothesisIterationRecord = {
      iteration: hypothesis.iteration,
      timestamp: Date.now(),
      score: hypothesis.scores.overall,
      scoreDelta,
      trajectory,
      dimensionScores: new Map(hypothesis.scores.dimensions),
      dimensionDiffs,
      statement: hypothesis.statement,
      changesMade,
      feedbackReceived: feedback
        ? {
            overallAssessment: feedback.overallAssessment,
            primaryFocus: feedback.strategicGuidance.primaryFocus,
            specificSuggestions: feedback.dimensionFeedback
              .flatMap(d => d.specificImprovements)
              .slice(0, 5),
          }
        : undefined,
      lessonLearned,
      outcome,
    }

    // Add to history
    history.iterations.push(record)

    // Update aggregates
    this.updateAggregates(history)

    return record
  }

  /**
   * Get iterations sorted by score (worst to best) for "improving order"
   */
  getIterationsInImprovingOrder(hypothesisId: string): HypothesisIterationRecord[] {
    const history = this.histories.get(hypothesisId)
    if (!history) return []

    return [...history.iterations].sort((a, b) => a.score - b.score)
  }

  /**
   * Get top N iterations for context (by score, descending)
   */
  getTopIterations(hypothesisId: string, n: number = 3): HypothesisIterationRecord[] {
    const history = this.histories.get(hypothesisId)
    if (!history) return []

    return [...history.iterations]
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
  }

  /**
   * Get all histories
   */
  getAllHistories(): HypothesisHistory[] {
    return Array.from(this.histories.values())
  }

  /**
   * Format history for prompt inclusion (Poetiq-style)
   */
  formatHistoryForPrompt(
    hypothesisId: string,
    options: {
      maxIterations?: number
      improvingOrder?: boolean
      includeFullDiffs?: boolean
    } = {}
  ): string {
    const { maxIterations = 5, improvingOrder = true, includeFullDiffs = false } = options

    const history = this.histories.get(hypothesisId)
    if (!history || history.iterations.length === 0) {
      return ''
    }

    let iterations = improvingOrder
      ? this.getIterationsInImprovingOrder(hypothesisId)
      : history.iterations

    iterations = iterations.slice(-maxIterations)

    const sections: string[] = [
      '## PREVIOUS REFINEMENT ATTEMPTS',
      '',
      `The following ${iterations.length} iterations show the improvement trajectory.`,
      `Study these and produce an improved version that addresses remaining gaps.`,
      '',
    ]

    for (const [index, iter] of iterations.entries()) {
      const trajectoryIcon =
        iter.trajectory === 'improving'
          ? '[+]'
          : iter.trajectory === 'declining'
            ? '[-]'
            : '[=]'

      sections.push(`### Iteration ${iter.iteration} (Score: ${iter.score.toFixed(1)}/10) ${trajectoryIcon}`)
      sections.push('')

      if (iter.feedbackReceived) {
        sections.push(`**Assessment:** ${iter.feedbackReceived.overallAssessment}`)
        sections.push(`**Primary Focus:** ${iter.feedbackReceived.primaryFocus}`)
        sections.push('')
      }

      if (iter.changesMade.length > 0) {
        sections.push('**Changes Made:**')
        for (const change of iter.changesMade) {
          sections.push(`- ${change}`)
        }
        sections.push('')
      }

      if (includeFullDiffs && iter.dimensionDiffs.length > 0) {
        sections.push('**Dimension Changes:**')
        for (const diff of iter.dimensionDiffs) {
          if (Math.abs(diff.delta) > 5) {
            const arrow = diff.delta > 0 ? '++' : '--'
            sections.push(
              `- ${diff.dimension}: ${diff.previousScore.toFixed(0)}% -> ${diff.currentScore.toFixed(0)}% (${arrow}${Math.abs(diff.delta).toFixed(0)}%)`
            )
          }
        }
        sections.push('')
      }

      if (iter.lessonLearned) {
        sections.push(`**Lesson Learned:** ${iter.lessonLearned}`)
        sections.push('')
      }

      sections.push('---')
      sections.push('')
    }

    // Add cumulative lessons
    if (history.cumulativeLessons.length > 0) {
      sections.push('## KEY LESSONS ACROSS ALL ITERATIONS')
      for (const lesson of history.cumulativeLessons.slice(-3)) {
        sections.push(`- ${lesson}`)
      }
      sections.push('')
    }

    return sections.join('\n')
  }

  /**
   * Format diff visualization for a dimension (BEFORE/AFTER style)
   */
  formatDimensionDiff(diff: DimensionDiff): string {
    const lines: string[] = [
      `### ${diff.dimension}`,
      `Current: ${diff.currentScore.toFixed(0)}% | Target: ${diff.targetScore.toFixed(0)}% | Delta: ${diff.delta >= 0 ? '+' : ''}${diff.delta.toFixed(0)}%`,
      '',
    ]

    if (diff.improvementsMade.length > 0) {
      lines.push('**Improvements Made (BEFORE -> AFTER):**')
      for (const improvement of diff.improvementsMade) {
        lines.push(`[x] ${improvement}`)
      }
      lines.push('')
    }

    if (diff.stillMissing.length > 0) {
      lines.push('**Still Missing:**')
      for (const missing of diff.stillMissing) {
        lines.push(`[ ] ${missing}`)
      }
      lines.push('')
    }

    return lines.join('\n')
  }

  /**
   * Clear history for a hypothesis
   */
  clearHistory(hypothesisId: string): void {
    this.histories.delete(hypothesisId)
  }

  /**
   * Clear all histories
   */
  clearAll(): void {
    this.histories.clear()
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getTargetScore(dimension: BreakthroughDimension, currentScore: number): number {
    const requiredDims: BreakthroughDimension[] = ['bc1_performance', 'bc8_trajectory']
    const minTarget = requiredDims.includes(dimension) ? 80 : 70
    return Math.max(minTarget, Math.min(95, currentScore + 15))
  }

  private extractChangesMade(
    previous: HypothesisIterationRecord | undefined,
    current: RacingHypothesis
  ): string[] {
    if (!previous) return ['Initial hypothesis generation']

    const changes: string[] = []

    // Check for statement changes
    if (previous.statement !== current.statement) {
      changes.push('Refined hypothesis statement')
    }

    // Check for dimension improvements
    for (const [dim, score] of current.scores.dimensions.entries()) {
      const prevScore = previous.dimensionScores.get(dim)
      if (prevScore && score.percentOfMax > prevScore.percentOfMax + 10) {
        changes.push(`Improved ${dim} by ${(score.percentOfMax - prevScore.percentOfMax).toFixed(0)}%`)
      }
    }

    if (changes.length === 0) {
      changes.push('Minor refinements applied')
    }

    return changes
  }

  private generateLessonLearned(
    outcome: HypothesisIterationRecord['outcome'],
    diffs: DimensionDiff[],
    feedback?: RefinementFeedback
  ): string {
    if (outcome === 'breakthrough') {
      return 'Achieved breakthrough status through focused improvements'
    }

    if (outcome === 'improved') {
      const improvedDims = diffs.filter(d => d.delta > 5).map(d => d.dimension)
      if (improvedDims.length > 0) {
        return `Improvements in ${improvedDims.join(', ')} drove score increase`
      }
      return 'General refinement improved overall quality'
    }

    if (outcome === 'degraded') {
      const degradedDims = diffs.filter(d => d.delta < -5).map(d => d.dimension)
      if (degradedDims.length > 0) {
        return `Regression in ${degradedDims.join(', ')} - avoid similar changes`
      }
      return 'Changes did not improve quality - reconsider approach'
    }

    // Maintained
    if (feedback) {
      return `Focus on ${feedback.strategicGuidance.primaryFocus} for next iteration`
    }
    return 'Score maintained - need more significant improvements'
  }

  private updateAggregates(history: HypothesisHistory): void {
    // Update overall trajectory
    const scores = history.iterations.map(i => i.score)
    history.overallTrajectory = calculateAverageTrajectory(scores)

    // Update best score
    const bestIter = history.iterations.reduce(
      (best, iter) => (iter.score > best.score ? iter : best),
      history.iterations[0]
    )
    if (bestIter) {
      history.bestScore = bestIter.score
      history.bestIteration = bestIter.iteration
    }

    // Update improving/struggling dimensions
    const dimensionDeltas = new Map<BreakthroughDimension, number[]>()

    for (const iter of history.iterations) {
      for (const diff of iter.dimensionDiffs) {
        const deltas = dimensionDeltas.get(diff.dimension) || []
        deltas.push(diff.delta)
        dimensionDeltas.set(diff.dimension, deltas)
      }
    }

    history.improvingDimensions = []
    history.strugglingDimensions = []

    for (const [dim, deltas] of dimensionDeltas.entries()) {
      const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length
      if (avgDelta > 3) history.improvingDimensions.push(dim)
      if (avgDelta < -3) history.strugglingDimensions.push(dim)
    }

    // Update cumulative lessons
    const newLessons = history.iterations
      .filter(i => i.lessonLearned)
      .map(i => i.lessonLearned!)
      .slice(-5)
    history.cumulativeLessons = newLessons
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const hypothesisHistoryManager = new HypothesisHistoryManager()
