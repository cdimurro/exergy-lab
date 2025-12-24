/**
 * Enhanced Refinement Agent
 *
 * Generates detailed, actionable feedback for hypothesis refinement.
 * Analyzes evaluation results and provides specific improvement suggestions
 * for each dimension.
 *
 * Poetiq-Inspired Enhancements (v0.0.3.2):
 * - Solution history tracking with iteration records
 * - Diff-based feedback visualization (BEFORE/AFTER)
 * - Structured 5-part prompts for consistent refinement
 * - Improving order (worst-to-best) for learning progression
 * - Feedback integration showing past attempts with lessons
 * - Trajectory tracking (improving/stable/declining)
 *
 * GPU-Aware Features:
 * - Quick GPU validation of refinements on T4
 * - Reverts refinements that degrade physics validity
 * - Includes GPU validation context in refinement prompts
 *
 * @see breakthrough-evaluator.ts - Provides evaluation results
 * @see hypgen/base.ts - RefinementFeedback type
 * @see gpu-pool.ts - GPU validation integration
 * @see hypothesis-history.ts - History tracking system
 * @see .claude/poetiq-analysis.md - Poetiq ARC-AGI solver analysis
 */

import { generateText } from '../model-router'
import type { GPUResult } from '@/lib/simulation/gpu-pool'
import type { GPUFeedbackBridge } from './gpu-bridge'
import type {
  BreakthroughDimension,
  DimensionScore,
  RefinementFeedback,
} from '../rubrics/types-breakthrough'
import type { RacingHypothesis, HypGenAgentType } from './hypgen/base'
import type { HypothesisEvaluation, LeaderboardEntry } from './breakthrough-evaluator'
import {
  hypothesisHistoryManager,
  type HypothesisHistory,
  type HypothesisIterationRecord,
  type DimensionDiff,
  type ScoreTrajectory,
  createDimensionDiff,
  calculateTrajectory,
} from './hypothesis-history'

// ============================================================================
// Types
// ============================================================================

export interface RefinementConfig {
  temperature: number
  model: 'fast' | 'quality'
  maxImprovementsPerDimension: number
  includeCompetitiveInsights: boolean
  includeResearchPointers: boolean
  // GPU-aware refinement options
  enableGPUValidation: boolean
  revertOnPhysicsFailure: boolean
  includeGPUContext: boolean
  gpuValidationThreshold: number // Minimum score to trigger GPU validation
  // Poetiq-inspired options (v0.0.3.2)
  enableHistoryTracking: boolean      // Track iteration history
  maxHistoryInPrompt: number          // Max iterations to include in prompt
  useImprovingOrder: boolean          // Show worst-to-best (Poetiq pattern)
  includeDiffVisualization: boolean   // Show BEFORE/AFTER diffs
  includeLessonsLearned: boolean      // Include lessons from past iterations
  enableTrajectoryTracking: boolean   // Track improving/stable/declining
}

export const DEFAULT_REFINEMENT_CONFIG: RefinementConfig = {
  temperature: 0.5, // Lower for focused, consistent feedback
  model: 'fast',
  maxImprovementsPerDimension: 3,
  includeCompetitiveInsights: true,
  includeResearchPointers: true,
  // GPU defaults
  enableGPUValidation: true,
  revertOnPhysicsFailure: true,
  includeGPUContext: true,
  gpuValidationThreshold: 6.0,
  // Poetiq-inspired defaults (v0.0.3.2)
  enableHistoryTracking: true,
  maxHistoryInPrompt: 5,
  useImprovingOrder: true,           // Show worst-to-best like Poetiq
  includeDiffVisualization: true,
  includeLessonsLearned: true,
  enableTrajectoryTracking: true,
}

export interface RefinementContext {
  evaluation: HypothesisEvaluation
  hypothesis: RacingHypothesis
  leaderboard: LeaderboardEntry[]
  iteration: number
  maxIterations: number
  targetScore: number
  // GPU validation context (optional)
  gpuValidation?: {
    result: GPUResult
    physicsValid: boolean
    economicallyViable: boolean
    confidenceScore: number
    previousResult?: GPUResult
  }
  // Poetiq-inspired trajectory tracking (v0.0.3.2)
  trajectory?: {
    current: ScoreTrajectory
    averageDelta: number
    consistency: number
    previousScore?: number
  }
}

/**
 * Extended dimension feedback with trajectory and diff information
 */
export interface ExtendedDimensionFeedback extends DimensionFeedback {
  trajectory: ScoreTrajectory
  previousScore?: number
  scoreDelta: number
  diff?: DimensionDiff
}

export interface DimensionFeedback {
  dimension: BreakthroughDimension
  currentScore: number
  targetScore: number
  percentAchieved: number
  priority: 'critical' | 'high' | 'medium' | 'low'
  specificImprovements: string[]
  researchPointers: string[]
  exampleStrategies: string[]
}

// ============================================================================
// Enhanced Refinement Agent Class
// ============================================================================

export class EnhancedRefinementAgent {
  private config: RefinementConfig
  private gpuBridge?: GPUFeedbackBridge

  constructor(
    config: Partial<RefinementConfig> = {},
    gpuBridge?: GPUFeedbackBridge
  ) {
    this.config = { ...DEFAULT_REFINEMENT_CONFIG, ...config }
    this.gpuBridge = gpuBridge
  }

  /**
   * Set GPU bridge for validation
   */
  setGPUBridge(bridge: GPUFeedbackBridge): void {
    this.gpuBridge = bridge
  }

  /**
   * Generate comprehensive refinement feedback for a hypothesis
   *
   * Poetiq-inspired enhancements (v0.0.3.2):
   * - Tracks hypothesis history across iterations
   * - Includes trajectory analysis (improving/stable/declining)
   * - Generates diff-based feedback for BEFORE/AFTER visualization
   */
  async generateFeedback(context: RefinementContext): Promise<RefinementFeedback> {
    const trajectoryIcon = context.trajectory?.current === 'improving' ? '[+]' :
                          context.trajectory?.current === 'declining' ? '[-]' : '[=]'

    console.log(
      `[EnhancedRefinementAgent] Generating feedback for ${context.hypothesis.id} ` +
      `(score: ${context.evaluation.overallScore.toFixed(1)}) ${trajectoryIcon}`
    )

    // Track history if enabled (Poetiq pattern #1)
    let history: HypothesisHistory | undefined
    if (this.config.enableHistoryTracking) {
      hypothesisHistoryManager.recordIteration(context.hypothesis)
      history = hypothesisHistoryManager.getHistory(context.hypothesis)
    }

    // Calculate trajectory if enabled (Poetiq pattern #6)
    const trajectory = this.config.enableTrajectoryTracking
      ? this.calculateContextTrajectory(context, history)
      : undefined

    // Analyze dimensions to prioritize with trajectory
    const dimensionAnalysis = this.analyzeDimensionsWithTrajectory(
      context.evaluation,
      history
    )

    // Generate AI-enhanced feedback for weak dimensions
    const enhancedFeedback = await this.generateAIEnhancedFeedback(
      context,
      dimensionAnalysis,
      history
    )

    // Generate strategic guidance
    const strategicGuidance = this.generateStrategicGuidance(
      context,
      dimensionAnalysis
    )

    // Generate competitive insights
    const competitiveInsight = this.config.includeCompetitiveInsights
      ? this.generateCompetitiveInsights(context)
      : { leadingHypotheses: [], differentiationOpportunities: [] }

    // Determine priority based on score gap and trajectory
    const priority = this.calculatePriorityWithTrajectory(context, trajectory)

    // Build overall assessment with trajectory context
    const overallAssessment = this.generateOverallAssessmentWithTrajectory(
      context,
      trajectory,
      history
    )

    return {
      targetAgent: context.hypothesis.agentSource,
      hypothesisId: context.hypothesis.id,
      iteration: context.iteration,
      timestamp: Date.now(),
      overallAssessment,
      currentScore: context.evaluation.overallScore,
      targetScore: context.targetScore,
      dimensionFeedback: enhancedFeedback.map(df => ({
        dimension: df.dimension,
        currentScore: df.currentScore,
        targetScore: df.targetScore,
        specificImprovements: df.specificImprovements,
        researchPointers: df.researchPointers,
        exampleStrategies: df.exampleStrategies,
      })),
      strategicGuidance,
      competitiveInsight,
      priority,
    }
  }

  /**
   * Calculate trajectory context for the current iteration
   */
  private calculateContextTrajectory(
    context: RefinementContext,
    history?: HypothesisHistory
  ): RefinementContext['trajectory'] {
    if (!history || history.iterations.length === 0) {
      return {
        current: 'first',
        averageDelta: 0,
        consistency: 1,
      }
    }

    const scores = history.iterations.map(i => i.score)
    scores.push(context.evaluation.overallScore)

    const current = calculateTrajectory(scores)

    // Calculate average delta over all iterations
    const deltas: number[] = []
    for (let i = 1; i < scores.length; i++) {
      deltas.push(scores[i] - scores[i - 1])
    }
    const averageDelta = deltas.length > 0
      ? deltas.reduce((a, b) => a + b, 0) / deltas.length
      : 0

    // Calculate consistency (how often deltas agree in direction)
    const positiveCount = deltas.filter(d => d > 0).length
    const negativeCount = deltas.filter(d => d < 0).length
    const consistency = deltas.length > 0
      ? Math.max(positiveCount, negativeCount) / deltas.length
      : 1

    return {
      current,
      averageDelta,
      consistency,
      previousScore: history.iterations[history.iterations.length - 1]?.score,
    }
  }

  /**
   * Calculate priority considering trajectory
   */
  private calculatePriorityWithTrajectory(
    context: RefinementContext,
    trajectory?: RefinementContext['trajectory']
  ): 'critical' | 'high' | 'normal' | 'low' {
    const scoreGap = context.targetScore - context.evaluation.overallScore

    // Base priority on score gap
    let priority: 'critical' | 'high' | 'normal' | 'low' =
      scoreGap > 3 ? 'critical' : scoreGap > 2 ? 'high' : scoreGap > 1 ? 'normal' : 'low'

    // Adjust based on trajectory
    if (trajectory) {
      if (trajectory.current === 'declining' && priority === 'normal') {
        priority = 'high' // Escalate if declining
      }
      if (trajectory.current === 'declining' && priority === 'high') {
        priority = 'critical' // Double escalate if declining and already high
      }
      if (trajectory.current === 'improving' && trajectory.consistency > 0.7 && priority === 'high') {
        priority = 'normal' // De-escalate if consistently improving
      }
    }

    return priority
  }

  /**
   * Analyze dimensions with trajectory information (Poetiq pattern #6)
   */
  private analyzeDimensionsWithTrajectory(
    evaluation: HypothesisEvaluation,
    history?: HypothesisHistory
  ): Map<BreakthroughDimension, ExtendedDimensionFeedback> {
    const analysis = new Map<BreakthroughDimension, ExtendedDimensionFeedback>()
    const previousIteration = history?.iterations[history.iterations.length - 1]

    for (const [dimension, score] of evaluation.dimensionScores.entries()) {
      const targetScore = this.getTargetScore(dimension, score.percentOfMax)
      const priority = this.calculatePriority(dimension, score)

      // Get previous score for this dimension
      const previousDimScore = previousIteration?.dimensionScores.get(dimension)
      const previousScore = previousDimScore?.percentOfMax
      const scoreDelta = previousScore !== undefined
        ? score.percentOfMax - previousScore
        : 0

      // Calculate trajectory for this dimension
      let trajectory: ScoreTrajectory = 'first'
      if (previousScore !== undefined) {
        if (scoreDelta > 5) trajectory = 'improving'
        else if (scoreDelta < -5) trajectory = 'declining'
        else trajectory = 'stable'
      }

      // Create diff if enabled (Poetiq pattern #2)
      const diff = this.config.includeDiffVisualization && previousDimScore
        ? createDimensionDiff(dimension, previousDimScore, score, targetScore)
        : undefined

      analysis.set(dimension, {
        dimension,
        currentScore: score.percentOfMax,
        targetScore,
        percentAchieved: score.percentOfMax,
        priority,
        specificImprovements: [], // Will be filled by AI
        researchPointers: [], // Will be filled by AI
        exampleStrategies: this.getExampleStrategies(dimension),
        // Trajectory fields
        trajectory,
        previousScore,
        scoreDelta,
        diff,
      })
    }

    return analysis
  }

  /**
   * Generate batch feedback for multiple hypotheses
   */
  async generateBatchFeedback(
    contexts: RefinementContext[]
  ): Promise<Map<string, RefinementFeedback>> {
    const feedbackMap = new Map<string, RefinementFeedback>()

    // Process in parallel
    const feedbacks = await Promise.all(
      contexts.map(ctx => this.generateFeedback(ctx))
    )

    for (const feedback of feedbacks) {
      feedbackMap.set(feedback.hypothesisId, feedback)
    }

    return feedbackMap
  }

  /**
   * Validate a refinement using GPU (quick T4 check)
   * Returns whether the refinement should be kept or reverted
   */
  async validateRefinement(
    original: RacingHypothesis,
    refined: RacingHypothesis
  ): Promise<{
    keep: boolean
    originalResult: GPUResult | null
    refinedResult: GPUResult | null
    reason: string
  }> {
    if (!this.config.enableGPUValidation || !this.gpuBridge) {
      return {
        keep: true,
        originalResult: null,
        refinedResult: null,
        reason: 'GPU validation disabled or not available',
      }
    }

    // Only validate if score meets threshold
    if (refined.scores.overall < this.config.gpuValidationThreshold) {
      return {
        keep: true,
        originalResult: null,
        refinedResult: null,
        reason: `Score ${refined.scores.overall.toFixed(1)} below GPU threshold ${this.config.gpuValidationThreshold}`,
      }
    }

    console.log(
      `[EnhancedRefinementAgent] GPU validating refinement for ${refined.id.slice(-8)}`
    )

    try {
      // Validate both original and refined on T4
      const [originalResult, refinedResult] = await Promise.all([
        this.gpuBridge.queueValidation(original, { tier: 'T4' }),
        this.gpuBridge.queueValidation(refined, { tier: 'T4' }),
      ])

      // Check if refinement degrades physics validity
      if (this.config.revertOnPhysicsFailure) {
        // If original passed physics but refined fails, revert
        if (originalResult.physicsValid && !refinedResult.physicsValid) {
          console.log(
            `[EnhancedRefinementAgent] Refinement degrades physics validity, recommending revert`
          )
          return {
            keep: false,
            originalResult,
            refinedResult,
            reason: 'Refinement degrades physics validity - reverting',
          }
        }

        // If confidence dropped significantly, consider reverting
        if (
          refinedResult.confidenceScore < originalResult.confidenceScore - 0.2
        ) {
          console.log(
            `[EnhancedRefinementAgent] Refinement significantly reduces confidence`
          )
          return {
            keep: false,
            originalResult,
            refinedResult,
            reason: `Confidence dropped from ${(originalResult.confidenceScore * 100).toFixed(0)}% to ${(refinedResult.confidenceScore * 100).toFixed(0)}%`,
          }
        }
      }

      // Calculate net improvement
      const originalScore = this.calculateGPUScore(originalResult)
      const refinedScore = this.calculateGPUScore(refinedResult)

      if (refinedScore > originalScore) {
        return {
          keep: true,
          originalResult,
          refinedResult,
          reason: `Refinement improves GPU score: ${originalScore.toFixed(2)} → ${refinedScore.toFixed(2)}`,
        }
      } else if (refinedScore === originalScore) {
        return {
          keep: true,
          originalResult,
          refinedResult,
          reason: 'Refinement maintains GPU validation quality',
        }
      } else {
        return {
          keep: !this.config.revertOnPhysicsFailure,
          originalResult,
          refinedResult,
          reason: `Refinement reduces GPU score: ${originalScore.toFixed(2)} → ${refinedScore.toFixed(2)}`,
        }
      }
    } catch (error) {
      console.warn('[EnhancedRefinementAgent] GPU validation failed:', error)
      return {
        keep: true,
        originalResult: null,
        refinedResult: null,
        reason: `GPU validation error: ${error instanceof Error ? error.message : 'Unknown'}`,
      }
    }
  }

  /**
   * Calculate a simple score from GPU result
   */
  private calculateGPUScore(result: GPUResult): number {
    let score = 0
    if (result.physicsValid) score += 5
    if (result.economicallyViable) score += 3
    score += result.confidenceScore * 2
    return score
  }

  /**
   * Generate GPU context for refinement prompts
   */
  private generateGPUContext(context: RefinementContext): string {
    if (!this.config.includeGPUContext || !context.gpuValidation) {
      return ''
    }

    const gpu = context.gpuValidation
    const lines: string[] = [
      '\n## GPU VALIDATION CONTEXT',
      `Physics Validation: ${gpu.physicsValid ? 'PASSED' : 'FAILED'}`,
      `Economic Viability: ${gpu.economicallyViable ? 'PASSED' : 'FAILED'}`,
      `Confidence Score: ${(gpu.confidenceScore * 100).toFixed(0)}%`,
    ]

    if (gpu.previousResult) {
      const prevConfidence = gpu.previousResult.confidenceScore
      const change = gpu.confidenceScore - prevConfidence
      lines.push(
        `Confidence Change: ${change >= 0 ? '+' : ''}${(change * 100).toFixed(0)}%`
      )
    }

    // Add specific metrics if available
    if (gpu.result.metrics.efficiency) {
      lines.push(
        `Efficiency: ${(gpu.result.metrics.efficiency.mean * 100).toFixed(1)}% ` +
        `(95% CI: ${(gpu.result.metrics.efficiency.ci95[0] * 100).toFixed(1)}-${(gpu.result.metrics.efficiency.ci95[1] * 100).toFixed(1)}%)`
      )
    }

    if (gpu.result.metrics.lcoe) {
      lines.push(
        `LCOE: $${gpu.result.metrics.lcoe.mean.toFixed(4)}/kWh ` +
        `(95% CI: $${gpu.result.metrics.lcoe.ci95[0].toFixed(4)}-$${gpu.result.metrics.lcoe.ci95[1].toFixed(4)})`
      )
    }

    if (!gpu.physicsValid) {
      lines.push('\n**IMPORTANT**: The hypothesis failed physics validation.')
      lines.push('Focus refinement on addressing physical feasibility concerns.')
    }

    return lines.join('\n')
  }

  /**
   * Generate AI-enhanced feedback for weak dimensions
   *
   * Poetiq-inspired: Now accepts history for including past iterations in prompt
   */
  private async generateAIEnhancedFeedback(
    context: RefinementContext,
    dimensionAnalysis: Map<BreakthroughDimension, ExtendedDimensionFeedback>,
    history?: HypothesisHistory
  ): Promise<ExtendedDimensionFeedback[]> {
    // Get dimensions that need improvement (below target)
    // Sort by trajectory first (declining gets priority), then by priority, then by gap
    const weakDimensions = Array.from(dimensionAnalysis.entries())
      .filter(([, df]) => df.currentScore < df.targetScore)
      .sort((a, b) => {
        // Declining dimensions get priority
        const trajectoryOrder = { declining: 0, stable: 1, first: 2, improving: 3 }
        const trajectoryDiff = trajectoryOrder[a[1].trajectory] - trajectoryOrder[b[1].trajectory]
        if (trajectoryDiff !== 0) return trajectoryDiff

        // Then by priority
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
        const priorityDiff = priorityOrder[a[1].priority] - priorityOrder[b[1].priority]
        if (priorityDiff !== 0) return priorityDiff

        // Then by gap
        return (b[1].targetScore - b[1].currentScore) - (a[1].targetScore - a[1].currentScore)
      })
      .slice(0, 5) // Focus on top 5 weakest dimensions

    if (weakDimensions.length === 0) {
      return Array.from(dimensionAnalysis.values())
    }

    // Generate AI feedback for weak dimensions with history context
    const prompt = this.buildFeedbackPromptWithHistory(context, weakDimensions, history)

    try {
      const result = await generateText('discovery', prompt, {
        temperature: this.config.temperature,
        model: this.config.model,
        maxTokens: 4000, // Increased for detailed feedback
      })

      const aiFeedback = this.parseAIFeedbackExtended(result, weakDimensions)

      // Merge AI feedback with analysis
      for (const [dimension, df] of dimensionAnalysis) {
        const aiDF = aiFeedback.find(f => f.dimension === dimension)
        if (aiDF) {
          df.specificImprovements = aiDF.specificImprovements.slice(
            0,
            this.config.maxImprovementsPerDimension
          )
          df.researchPointers = aiDF.researchPointers || []
        }
      }
    } catch (error) {
      console.warn('[EnhancedRefinementAgent] AI feedback generation failed:', error)
      // Fall back to template-based feedback
      for (const [, df] of dimensionAnalysis) {
        df.specificImprovements = this.getTemplateFeedback(df.dimension, df.currentScore)
      }
    }

    return Array.from(dimensionAnalysis.values())
  }

  /**
   * Build prompt for AI feedback generation (5-part Poetiq-style structure)
   *
   * Poetiq-inspired improvements (v0.0.3.2):
   * - PART 1: Current state with trajectory analysis
   * - PART 2: Dimension-by-dimension gap analysis with diffs
   * - PART 3: Past improvement trajectory (improving order)
   * - PART 4: Competitive context
   * - PART 5: Task specification with clear examples
   */
  private buildFeedbackPromptWithHistory(
    context: RefinementContext,
    weakDimensions: [BreakthroughDimension, ExtendedDimensionFeedback][],
    history?: HypothesisHistory
  ): string {
    const sections: string[] = []

    // ========================================================================
    // PART 1: CURRENT STATE ANALYSIS
    // ========================================================================
    const trajectoryIcon = context.trajectory?.current === 'improving' ? '[+]' :
                          context.trajectory?.current === 'declining' ? '[-]' : '[=]'

    sections.push(`## PART 1: CURRENT STATE ANALYSIS

Hypothesis: "${context.hypothesis.title}"
Statement: ${context.hypothesis.statement}

Current Score: ${context.evaluation.overallScore.toFixed(1)}/10 ${trajectoryIcon}
Target Score: ${context.targetScore}/10
Gap to Close: ${Math.max(0, context.targetScore - context.evaluation.overallScore).toFixed(1)} points
Iterations Remaining: ${context.maxIterations - context.iteration}`)

    // Add trajectory analysis
    if (context.trajectory && context.trajectory.current !== 'first') {
      const deltaStr = context.trajectory.averageDelta >= 0 ? '+' : ''
      sections.push(`
Trajectory: ${context.trajectory.current.toUpperCase()}
Average Change: ${deltaStr}${context.trajectory.averageDelta.toFixed(2)} points/iteration
Consistency: ${(context.trajectory.consistency * 100).toFixed(0)}%
Previous Score: ${context.trajectory.previousScore?.toFixed(1) ?? 'N/A'}`)
    }

    // ========================================================================
    // PART 2: DIMENSION-BY-DIMENSION GAP ANALYSIS
    // ========================================================================
    sections.push(`\n## PART 2: DIMENSION-BY-DIMENSION GAP ANALYSIS

Focus on these ${weakDimensions.length} dimensions that need improvement:`)

    for (const [dim, df] of weakDimensions) {
      const trajectoryMarker = df.trajectory === 'improving' ? '[+]' :
                               df.trajectory === 'declining' ? '[-]' :
                               df.trajectory === 'stable' ? '[=]' : '[NEW]'

      sections.push(`
### ${dim} ${trajectoryMarker}
Current: ${df.currentScore.toFixed(0)}% | Target: ${df.targetScore.toFixed(0)}% | Priority: ${df.priority}`)

      // Add trajectory info for this dimension
      if (df.previousScore !== undefined) {
        const deltaStr = df.scoreDelta >= 0 ? '+' : ''
        sections.push(`Previous: ${df.previousScore.toFixed(0)}% | Change: ${deltaStr}${df.scoreDelta.toFixed(0)}%`)
      }

      // Add diff visualization if available (Poetiq pattern #2)
      if (df.diff && df.diff.stillMissing.length > 0) {
        sections.push(`\nMissing Elements:`)
        for (const missing of df.diff.stillMissing.slice(0, 3)) {
          sections.push(`[ ] ${missing}`)
        }
      }

      if (df.diff && df.diff.improvementsMade.length > 0) {
        sections.push(`\nImprovements Already Made:`)
        for (const done of df.diff.improvementsMade.slice(0, 2)) {
          sections.push(`[x] ${done}`)
        }
      }
    }

    // ========================================================================
    // PART 3: PAST IMPROVEMENT TRAJECTORY (Poetiq pattern #4 & #5)
    // ========================================================================
    if (this.config.enableHistoryTracking && history && history.iterations.length > 0) {
      // Get iterations in improving order (worst to best) - Poetiq pattern #4
      const historyPrompt = hypothesisHistoryManager.formatHistoryForPrompt(
        context.hypothesis.id,
        {
          maxIterations: this.config.maxHistoryInPrompt,
          improvingOrder: this.config.useImprovingOrder,
          includeFullDiffs: false, // Keep prompt concise
        }
      )

      if (historyPrompt) {
        sections.push(`\n${historyPrompt}`)
      }
    }

    // ========================================================================
    // PART 4: COMPETITIVE CONTEXT
    // ========================================================================
    const topCompetitors = context.leaderboard
      .slice(0, 3)
      .filter(e => e.hypothesisId !== context.hypothesis.id)
      .map(e => `- "${e.title}" (Score: ${e.score.toFixed(1)})`)
      .join('\n')

    if (topCompetitors) {
      sections.push(`\n## PART 4: COMPETITIVE CONTEXT

Top 3 Competitors:
${topCompetitors}

Current Rank: ${context.leaderboard.findIndex(e => e.hypothesisId === context.hypothesis.id) + 1}/${context.leaderboard.length}`)
    }

    // ========================================================================
    // PART 5: TASK SPECIFICATION
    // ========================================================================
    const dimensionGuidance = this.getDimensionSpecificGuidance(weakDimensions)

    sections.push(`\n## PART 5: YOUR TASK

Generate specific, actionable improvements for each weak dimension listed above.

### Dimension-Specific Benchmarks
${dimensionGuidance}

### Output Format
For EACH weak dimension, provide:

DIMENSION: [dimension_name]
IMPROVEMENTS:
- [Specific improvement with numbers, e.g., "Increase efficiency claim from 25% to 33%"]
- [Another improvement with quantifiable target]
BEFORE:
"[Quote the current weak statement or describe the gap]"
AFTER:
"[Show exactly how the improved statement should read]"
RESEARCH POINTERS:
- [Specific paper type or database to search]

### Critical Rules
1. Be SPECIFIC - use numbers, percentages, and concrete metrics
2. Reference SOTA benchmarks: Solar 33.7%, Wind 59.3%, Battery 300 Wh/kg
3. Provide BEFORE/AFTER examples that are directly usable
4. Address declining dimensions FIRST (marked with [-])
5. Build on what worked in past iterations
6. Focus on the TOP 3 gaps for each dimension`)

    // Add GPU context if available
    const gpuContext = this.generateGPUContext(context)
    if (gpuContext) {
      sections.push(gpuContext)
    }

    return sections.join('\n')
  }

  /**
   * Parse extended AI feedback response (handles trajectory-aware format)
   */
  private parseAIFeedbackExtended(
    result: string,
    weakDimensions: [BreakthroughDimension, ExtendedDimensionFeedback][]
  ): ExtendedDimensionFeedback[] {
    const feedback: ExtendedDimensionFeedback[] = []

    for (const [dimension, df] of weakDimensions) {
      // Find the section for this dimension
      const sectionPattern = new RegExp(
        `DIMENSION:\\s*${dimension}[\\s\\S]*?(?=DIMENSION:|$)`,
        'i'
      )
      const sectionMatch = result.match(sectionPattern)

      if (sectionMatch) {
        const section = sectionMatch[0]

        // Extract improvements
        const improvementsMatch = section.match(
          /IMPROVEMENTS:[\s\S]*?(?=BEFORE:|RESEARCH POINTERS:|DIMENSION:|$)/i
        )
        const improvements = improvementsMatch
          ? improvementsMatch[0]
              .split('\n')
              .filter(line => line.trim().startsWith('-'))
              .map(line => line.replace(/^-\s*/, '').trim())
              .filter(line => line.length > 0)
          : []

        // Extract research pointers
        const researchMatch = section.match(
          /RESEARCH POINTERS:[\s\S]*?(?=DIMENSION:|$)/i
        )
        const researchPointers = researchMatch
          ? researchMatch[0]
              .split('\n')
              .filter(line => line.trim().startsWith('-'))
              .map(line => line.replace(/^-\s*/, '').trim())
              .filter(line => line.length > 0)
          : []

        feedback.push({
          ...df,
          specificImprovements: improvements,
          researchPointers,
        })
      } else {
        // Use template feedback if AI didn't provide for this dimension
        feedback.push({
          ...df,
          specificImprovements: this.getTemplateFeedback(dimension, df.currentScore),
        })
      }
    }

    return feedback
  }

  /**
   * Generate overall assessment with trajectory context
   */
  private generateOverallAssessmentWithTrajectory(
    context: RefinementContext,
    trajectory?: RefinementContext['trajectory'],
    history?: HypothesisHistory
  ): string {
    const { evaluation, iteration, maxIterations, targetScore } = context
    const { overallScore, classification, passedDimensions, failedDimensions } = evaluation

    const scoreGap = targetScore - overallScore
    const iterationsRemaining = maxIterations - iteration

    // Add trajectory context to assessment
    let trajectoryNote = ''
    if (trajectory && trajectory.current !== 'first') {
      if (trajectory.current === 'improving') {
        trajectoryNote = ` Trajectory: IMPROVING (avg +${trajectory.averageDelta.toFixed(2)}/iter).`
      } else if (trajectory.current === 'declining') {
        trajectoryNote = ` WARNING: Trajectory DECLINING (avg ${trajectory.averageDelta.toFixed(2)}/iter) - requires strategy change.`
      } else {
        trajectoryNote = ` Trajectory: STABLE - need more significant changes.`
      }
    }

    // Add history-based insight
    let historyInsight = ''
    if (history && history.cumulativeLessons.length > 0) {
      historyInsight = ` Key lesson: ${history.cumulativeLessons[history.cumulativeLessons.length - 1]}`
    }

    if (overallScore >= 9.0) {
      return `Breakthrough candidate! Score ${overallScore.toFixed(1)}/10. ` +
        `Passed ${passedDimensions.length}/8 dimensions. Ready for validation phase.${trajectoryNote}`
    }

    if (overallScore >= 8.0) {
      return `Near breakthrough (${classification}). Score ${overallScore.toFixed(1)}/10. ` +
        `Gap: ${scoreGap.toFixed(1)} points. ${iterationsRemaining} iterations remaining. ` +
        `Focus on: ${failedDimensions.slice(0, 2).join(', ')}.${trajectoryNote}${historyInsight}`
    }

    if (overallScore >= 6.0) {
      return `Making progress (${classification}). Score ${overallScore.toFixed(1)}/10. ` +
        `${failedDimensions.length} dimensions need improvement. ` +
        `${iterationsRemaining} iterations remaining.${trajectoryNote}${historyInsight}`
    }

    if (overallScore >= 5.0) {
      return `At risk of elimination. Score ${overallScore.toFixed(1)}/10. ` +
        `Significant improvements needed in: ${failedDimensions.slice(0, 3).join(', ')}. ` +
        `${iterationsRemaining} iterations remaining.${trajectoryNote}${historyInsight}`
    }

    return `Below elimination threshold. Score ${overallScore.toFixed(1)}/10. ` +
      `Will be eliminated unless score improves above 5.0 in remaining ${iterationsRemaining} iterations.${trajectoryNote}`
  }

  /**
   * Get dimension-specific guidance based on breakthrough requirements
   */
  private getDimensionSpecificGuidance(
    weakDimensions: [BreakthroughDimension, DimensionFeedback | ExtendedDimensionFeedback][]
  ): string {
    const guidance: string[] = []

    for (const [dim] of weakDimensions) {
      switch (dim) {
        case 'bc1_performance':
          guidance.push(
            `BC1 (Performance): Breakthroughs require >25% improvement over SOTA. ` +
            `Current SOTA benchmarks: Solar ~33.7%, Wind ~59.3% Betz, Battery ~300 Wh/kg commercial. ` +
            `Include specific percentage improvements with clear baselines.`
          )
          break
        case 'bc2_cost':
          guidance.push(
            `BC2 (Cost): Include specific $/kWh, $/kg, or LCOE projections. ` +
            `Reference current costs: Solar $0.03-0.05/kWh, Battery $150-200/kWh, H2 $3-5/kg. ` +
            `Provide manufacturing cost breakdown.`
          )
          break
        case 'bc8_trajectory':
          guidance.push(
            `BC8 (Trajectory): Describe the paradigm shift clearly. ` +
            `Is this incremental improvement or fundamentally new approach? ` +
            `Reference how previous breakthroughs changed their fields.`
          )
          break
        case 'bc4_applications':
          guidance.push(
            `BC4 (Applications): Identify specific market segments and TAM. ` +
            `Which incumbents would this disrupt? What's the adoption timeline?`
          )
          break
        case 'bc5_societal':
          guidance.push(
            `BC5 (Societal): Describe decarbonization impact and accessibility. ` +
            `What manufacturing processes are needed? Material supply chain concerns?`
          )
          break
        case 'bc6_scale':
          guidance.push(
            `BC6 (Scale): Describe path from TRL 4-5 to TRL 8-9. ` +
            `Market size, deployment potential, and scalability path.`
          )
          break
        default:
          // Generic guidance for other dimensions
          break
      }
    }

    return guidance.join('\n\n') || 'Focus on scientific rigor and quantifiable improvements.'
  }

  /**
   * Generate strategic guidance based on context
   *
   * Enhanced with trajectory awareness (v0.0.3.2)
   */
  private generateStrategicGuidance(
    context: RefinementContext,
    dimensionAnalysis: Map<BreakthroughDimension, DimensionFeedback | ExtendedDimensionFeedback>
  ): RefinementFeedback['strategicGuidance'] {
    // Find the most impactful dimension to focus on
    const sortedDimensions = Array.from(dimensionAnalysis.entries())
      .filter(([, df]) => df.currentScore < df.targetScore)
      .sort((a, b) => {
        // Prioritize required dimensions (bc1_performance, bc8_trajectory)
        const requiredDims: BreakthroughDimension[] = ['bc1_performance', 'bc8_trajectory']
        const aRequired = requiredDims.includes(a[0]) ? 0 : 1
        const bRequired = requiredDims.includes(b[0]) ? 0 : 1
        if (aRequired !== bRequired) return aRequired - bRequired

        // Then by gap size
        return (b[1].targetScore - b[1].currentScore) - (a[1].targetScore - a[1].currentScore)
      })

    const primaryFocus = sortedDimensions[0]
      ? `Focus on ${sortedDimensions[0][0]} (${sortedDimensions[0][1].currentScore.toFixed(0)}% → ${sortedDimensions[0][1].targetScore.toFixed(0)}%)`
      : 'Maintain current performance across all dimensions'

    // Identify quick wins (close to target)
    const quickWins = Array.from(dimensionAnalysis.entries())
      .filter(([, df]) => df.currentScore >= 60 && df.currentScore < df.targetScore)
      .map(([dim]) => `${dim}: close to passing, small improvements can push it over`)
      .slice(0, 3)

    // Identify deep dive areas (far from target)
    const deepDiveAreas = Array.from(dimensionAnalysis.entries())
      .filter(([, df]) => df.currentScore < 40)
      .map(([dim]) => `${dim}: requires significant rework`)
      .slice(0, 2)

    // Identify synergies
    const synergies = this.identifySynergies(dimensionAnalysis)

    return {
      primaryFocus,
      quickWins,
      deepDiveAreas,
      synergies,
    }
  }

  /**
   * Generate competitive insights from leaderboard
   */
  private generateCompetitiveInsights(
    context: RefinementContext
  ): RefinementFeedback['competitiveInsight'] {
    const currentRank = context.leaderboard.findIndex(
      e => e.hypothesisId === context.hypothesis.id
    )

    const leadingHypotheses = context.leaderboard
      .slice(0, 3)
      .filter(e => e.hypothesisId !== context.hypothesis.id)
      .map(e => `${e.hypothesisId}: ${e.title} (${e.score.toFixed(1)})`)

    // Generate differentiation opportunities based on agent type
    const differentiationOpportunities = this.getDifferentiationOpportunities(
      context.hypothesis.agentSource,
      currentRank,
      context.leaderboard.length
    )

    return {
      leadingHypotheses,
      differentiationOpportunities,
    }
  }

  /**
   * Calculate priority for a dimension
   */
  private calculatePriority(
    dimension: BreakthroughDimension,
    score: DimensionScore
  ): DimensionFeedback['priority'] {
    // Required dimensions (bc1_performance, bc8_trajectory) get higher priority
    const requiredDims: BreakthroughDimension[] = ['bc1_performance', 'bc8_trajectory']
    const isRequired = requiredDims.includes(dimension)

    if (score.percentOfMax < 30) {
      return 'critical'
    }
    if (score.percentOfMax < 50 || (isRequired && score.percentOfMax < 70)) {
      return 'high'
    }
    if (score.percentOfMax < 70) {
      return 'medium'
    }
    return 'low'
  }

  /**
   * Get target score for a dimension based on current score
   */
  private getTargetScore(dimension: BreakthroughDimension, currentScore: number): number {
    // Required dimensions need to reach at least 80%
    const requiredDims: BreakthroughDimension[] = ['bc1_performance', 'bc8_trajectory']
    const minTarget = requiredDims.includes(dimension) ? 80 : 70

    // Target should be at least 15% above current, but at least minTarget
    return Math.max(minTarget, Math.min(95, currentScore + 15))
  }

  /**
   * Get template-based feedback for a dimension
   */
  private getTemplateFeedback(dimension: BreakthroughDimension, score: number): string[] {
    const templates: Record<BreakthroughDimension, string[]> = {
      // Impact dimensions (BC1-BC8)
      bc1_performance: [
        'Quantify efficiency improvement vs. state-of-the-art with specific percentages',
        'Add comparison to at least 3 competing technologies',
        'Include mechanism explanation for performance gains',
      ],
      bc2_cost: [
        'Provide LCOE calculation or estimate with assumptions',
        'Break down cost components (materials, processing, BOS)',
        'Compare to current market prices with sources',
      ],
      bc3_capabilities: [
        'Specify new functions not possible with existing technology',
        'Provide evidence that these capabilities are genuinely novel',
        'Explain enabling mechanism for new capabilities',
      ],
      bc4_applications: [
        'Identify 2-3 specific new market applications',
        'Estimate market size or adoption potential',
        'Explain why current technology cannot address these applications',
      ],
      bc5_societal: [
        'Quantify decarbonization potential (tons CO2/year)',
        'Assess accessibility for developing regions',
        'Consider job creation and economic development impacts',
      ],
      bc6_scale: [
        'Estimate total addressable market in $ or capacity',
        'Assess scalability barriers and solutions',
        'Project deployment timeline and volumes',
      ],
      bc7_problem_solving: [
        'Identify the specific unsolved challenge being addressed',
        'Explain why previous approaches failed',
        'Provide evidence that this approach overcomes those barriers',
      ],
      bc8_trajectory: [
        'Articulate what fundamental assumption is being challenged',
        'Describe potential follow-on discoveries this enables',
        'Explain paradigm-shifting nature of the approach',
      ],
      // Feasibility dimensions (BC9-BC12)
      bc9_feasibility: [
        'Specify current Technology Readiness Level (TRL)',
        'Describe prototype or lab demonstration status',
        'Outline pathway from current state to deployment',
      ],
      bc10_literature: [
        'Cite peer-reviewed sources supporting key claims',
        'Reference state-of-the-art publications in the field',
        'Address any contradicting research findings',
      ],
      bc11_infrastructure: [
        'Assess compatibility with existing manufacturing processes',
        'Identify supply chain requirements and availability',
        'Describe deployment pathway using current infrastructure',
      ],
      bc12_capital: [
        'Estimate capital requirements with component breakdown',
        'Identify potential funding sources (VC, grants, strategic)',
        'Project ROI timeline and payback period',
      ],
    }

    return templates[dimension] || ['Improve this dimension based on the rubric criteria']
  }

  /**
   * Get example strategies for a dimension
   */
  private getExampleStrategies(dimension: BreakthroughDimension): string[] {
    const strategies: Record<BreakthroughDimension, string[]> = {
      // Impact dimensions (BC1-BC8)
      bc1_performance: ['Perovskite tandem cells achieved 33%+ efficiency via bandgap engineering'],
      bc2_cost: ['CATL reduced battery costs via simplified manufacturing and cell-to-pack'],
      bc3_capabilities: ['Bifacial solar enabled dual-side light capture, not possible before'],
      bc4_applications: ['Solid-state batteries enabled new form factors for wearables'],
      bc5_societal: ['Distributed solar + storage enables energy access in off-grid areas'],
      bc6_scale: ['Li-ion addressed 10+ industries from phones to grid storage'],
      bc7_problem_solving: ['mRNA vaccines solved rapid development challenge'],
      bc8_trajectory: ['CRISPR fundamentally changed genetic engineering approach'],
      // Feasibility dimensions (BC9-BC12)
      bc9_feasibility: ['Tesla Megapack achieved TRL 9 through iterative manufacturing scaling'],
      bc10_literature: ['Perovskite solar cells built on extensive material science research base'],
      bc11_infrastructure: ['EV charging leveraged existing electrical grid infrastructure'],
      bc12_capital: ['Offshore wind projects secured $50B+ through government-backed financing'],
    }

    return strategies[dimension] || []
  }

  /**
   * Identify synergies between dimensions
   */
  private identifySynergies(
    analysis: Map<BreakthroughDimension, DimensionFeedback>
  ): string[] {
    const synergies: string[] = []

    // bc1 + bc2: Performance and cost often synergize
    const bc1 = analysis.get('bc1_performance')
    const bc2 = analysis.get('bc2_cost')
    if (bc1 && bc2 && bc1.currentScore < 70 && bc2.currentScore < 70) {
      synergies.push('Improving efficiency (BC1) often reduces LCOE (BC2)')
    }

    // bc3 + bc4: New capabilities enable new applications
    const bc3 = analysis.get('bc3_capabilities')
    const bc4 = analysis.get('bc4_applications')
    if (bc3 && bc4 && bc3.currentScore < 70 && bc4.currentScore < 70) {
      synergies.push('Demonstrating new capabilities (BC3) opens new applications (BC4)')
    }

    // bc7 + bc8: Problem-solving can be paradigm-shifting
    const bc7 = analysis.get('bc7_problem_solving')
    const bc8 = analysis.get('bc8_trajectory')
    if (bc7 && bc8 && bc7.currentScore >= 70 && bc8.currentScore < 70) {
      synergies.push('Strong problem-solving (BC7) can strengthen trajectory arguments (BC8)')
    }

    return synergies.slice(0, 3)
  }

  /**
   * Get differentiation opportunities based on agent type
   */
  private getDifferentiationOpportunities(
    agentType: HypGenAgentType,
    currentRank: number,
    totalCount: number
  ): string[] {
    const opportunities: string[] = []

    // Position-based advice
    if (currentRank > totalCount / 2) {
      opportunities.push('Currently in bottom half - focus on quick wins to avoid elimination')
    } else if (currentRank > 3) {
      opportunities.push('Close to top 3 - targeted improvements could secure validation slot')
    }

    // Agent-type specific advice
    const typeAdvice: Record<HypGenAgentType, string> = {
      novel: 'Lean into novelty strength - ensure unconventional aspects are well-evidenced',
      feasible: 'Manufacturing readiness is your edge - emphasize practical implementation path',
      economic: 'Cost advantage is key - ensure economic calculations are rigorous and sourced',
      'cross-domain': 'Cross-domain insight is unique - strengthen the transfer mechanism',
      paradigm: 'Paradigm-shift potential is rare - double down on trajectory and impact',
    }

    opportunities.push(typeAdvice[agentType])

    return opportunities
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createEnhancedRefinementAgent(
  config?: Partial<RefinementConfig>,
  gpuBridge?: GPUFeedbackBridge
): EnhancedRefinementAgent {
  return new EnhancedRefinementAgent(config, gpuBridge)
}

// ============================================================================
// Singleton Export (backwards compatibility)
// ============================================================================

/**
 * Default refinement agent instance
 *
 * Note: For new code, prefer creating instances via createEnhancedRefinementAgent()
 * to enable custom configuration and GPU bridge integration.
 */
export const refinementAgent = new EnhancedRefinementAgent()
