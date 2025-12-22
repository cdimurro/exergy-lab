/**
 * Enhanced Refinement Agent
 *
 * Generates detailed, actionable feedback for hypothesis refinement.
 * Analyzes evaluation results and provides specific improvement suggestions
 * for each dimension.
 *
 * @see breakthrough-evaluator.ts - Provides evaluation results
 * @see hypgen/base.ts - RefinementFeedback type
 */

import { generateText } from '../model-router'
import type {
  BreakthroughDimension,
  DimensionScore,
  RefinementFeedback,
  ClassificationTier,
  DIMENSION_CONFIGS,
} from '../rubrics/types-breakthrough'
import type { RacingHypothesis, HypGenAgentType } from './hypgen/base'
import type { HypothesisEvaluation, LeaderboardEntry } from './breakthrough-evaluator'

// ============================================================================
// Types
// ============================================================================

export interface RefinementConfig {
  temperature: number
  model: 'fast' | 'quality'
  maxImprovementsPerDimension: number
  includeCompetitiveInsights: boolean
  includeResearchPointers: boolean
}

export const DEFAULT_REFINEMENT_CONFIG: RefinementConfig = {
  temperature: 0.5, // Lower for focused, consistent feedback
  model: 'fast',
  maxImprovementsPerDimension: 3,
  includeCompetitiveInsights: true,
  includeResearchPointers: true,
}

export interface RefinementContext {
  evaluation: HypothesisEvaluation
  hypothesis: RacingHypothesis
  leaderboard: LeaderboardEntry[]
  iteration: number
  maxIterations: number
  targetScore: number
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

  constructor(config: Partial<RefinementConfig> = {}) {
    this.config = { ...DEFAULT_REFINEMENT_CONFIG, ...config }
  }

  /**
   * Generate comprehensive refinement feedback for a hypothesis
   */
  async generateFeedback(context: RefinementContext): Promise<RefinementFeedback> {
    console.log(
      `[EnhancedRefinementAgent] Generating feedback for ${context.hypothesis.id} ` +
      `(score: ${context.evaluation.overallScore.toFixed(1)})`
    )

    // Analyze dimensions to prioritize
    const dimensionAnalysis = this.analyzeDimensions(context.evaluation)

    // Generate AI-enhanced feedback for weak dimensions
    const enhancedFeedback = await this.generateAIEnhancedFeedback(
      context,
      dimensionAnalysis
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

    // Determine priority based on score gap
    const scoreGap = context.targetScore - context.evaluation.overallScore
    const priority = scoreGap > 3 ? 'critical' : scoreGap > 2 ? 'high' : scoreGap > 1 ? 'normal' : 'low'

    return {
      targetAgent: context.hypothesis.agentSource,
      hypothesisId: context.hypothesis.id,
      iteration: context.iteration,
      timestamp: Date.now(),
      overallAssessment: this.generateOverallAssessment(context),
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
   * Analyze dimensions to determine priorities
   */
  private analyzeDimensions(
    evaluation: HypothesisEvaluation
  ): Map<BreakthroughDimension, DimensionFeedback> {
    const analysis = new Map<BreakthroughDimension, DimensionFeedback>()

    for (const [dimension, score] of evaluation.dimensionScores.entries()) {
      const targetScore = this.getTargetScore(dimension, score.percentOfMax)
      const priority = this.calculatePriority(dimension, score)

      analysis.set(dimension, {
        dimension,
        currentScore: score.percentOfMax,
        targetScore,
        percentAchieved: score.percentOfMax,
        priority,
        specificImprovements: [], // Will be filled by AI
        researchPointers: [], // Will be filled by AI
        exampleStrategies: this.getExampleStrategies(dimension),
      })
    }

    return analysis
  }

  /**
   * Generate AI-enhanced feedback for weak dimensions
   */
  private async generateAIEnhancedFeedback(
    context: RefinementContext,
    dimensionAnalysis: Map<BreakthroughDimension, DimensionFeedback>
  ): Promise<DimensionFeedback[]> {
    // Get dimensions that need improvement (below target)
    const weakDimensions = Array.from(dimensionAnalysis.entries())
      .filter(([, df]) => df.currentScore < df.targetScore)
      .sort((a, b) => {
        // Sort by priority, then by gap
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
        const priorityDiff = priorityOrder[a[1].priority] - priorityOrder[b[1].priority]
        if (priorityDiff !== 0) return priorityDiff
        return (b[1].targetScore - b[1].currentScore) - (a[1].targetScore - a[1].currentScore)
      })
      .slice(0, 5) // Focus on top 5 weakest dimensions

    if (weakDimensions.length === 0) {
      return Array.from(dimensionAnalysis.values())
    }

    // Generate AI feedback for weak dimensions
    const prompt = this.buildFeedbackPrompt(context, weakDimensions)

    try {
      const result = await generateText('discovery', prompt, {
        temperature: this.config.temperature,
        model: this.config.model,
      })

      const aiFeedback = this.parseAIFeedback(result, weakDimensions)

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
   * Build prompt for AI feedback generation
   */
  private buildFeedbackPrompt(
    context: RefinementContext,
    weakDimensions: [BreakthroughDimension, DimensionFeedback][]
  ): string {
    return `You are providing refinement feedback for a clean energy hypothesis.

## HYPOTHESIS
Title: ${context.hypothesis.title}
Statement: ${context.hypothesis.statement}
Current Score: ${context.evaluation.overallScore.toFixed(1)}/10
Target Score: ${context.targetScore}/10
Iteration: ${context.iteration}/${context.maxIterations}

## WEAK DIMENSIONS (Need Improvement)
${weakDimensions.map(([dim, df]) => `
### ${dim}
Current: ${df.currentScore.toFixed(0)}%
Target: ${df.targetScore.toFixed(0)}%
Priority: ${df.priority}
`).join('\n')}

## YOUR TASK
For EACH weak dimension, provide:
1. 2-3 specific, actionable improvements the hypothesis could make
2. 1-2 research areas or papers to consult for evidence

Format your response as:

DIMENSION: [dimension_name]
IMPROVEMENTS:
- [Specific improvement 1]
- [Specific improvement 2]
- [Specific improvement 3]
RESEARCH POINTERS:
- [Research area or type of paper to find]

Repeat for each dimension listed above.

Be specific and actionable. Reference the hypothesis content when suggesting improvements.`
  }

  /**
   * Parse AI feedback response
   */
  private parseAIFeedback(
    result: string,
    weakDimensions: [BreakthroughDimension, DimensionFeedback][]
  ): DimensionFeedback[] {
    const feedback: DimensionFeedback[] = []

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
          /IMPROVEMENTS:[\s\S]*?(?=RESEARCH POINTERS:|DIMENSION:|$)/i
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
   * Generate strategic guidance based on context
   */
  private generateStrategicGuidance(
    context: RefinementContext,
    dimensionAnalysis: Map<BreakthroughDimension, DimensionFeedback>
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
   * Generate overall assessment text
   */
  private generateOverallAssessment(context: RefinementContext): string {
    const { evaluation, iteration, maxIterations, targetScore } = context
    const { overallScore, classification, passedDimensions, failedDimensions } = evaluation

    const scoreGap = targetScore - overallScore
    const iterationsRemaining = maxIterations - iteration

    if (overallScore >= 9.0) {
      return `Breakthrough candidate! Score ${overallScore.toFixed(1)}/10. ` +
        `Passed ${passedDimensions.length}/8 dimensions. Ready for validation phase.`
    }

    if (overallScore >= 8.0) {
      return `Near breakthrough (${classification}). Score ${overallScore.toFixed(1)}/10. ` +
        `Gap: ${scoreGap.toFixed(1)} points. ${iterationsRemaining} iterations remaining. ` +
        `Focus on: ${failedDimensions.slice(0, 2).join(', ')}.`
    }

    if (overallScore >= 6.0) {
      return `Making progress (${classification}). Score ${overallScore.toFixed(1)}/10. ` +
        `${failedDimensions.length} dimensions need improvement. ` +
        `${iterationsRemaining} iterations remaining.`
    }

    if (overallScore >= 5.0) {
      return `At risk of elimination. Score ${overallScore.toFixed(1)}/10. ` +
        `Significant improvements needed in: ${failedDimensions.slice(0, 3).join(', ')}. ` +
        `${iterationsRemaining} iterations remaining.`
    }

    return `Below elimination threshold. Score ${overallScore.toFixed(1)}/10. ` +
      `Will be eliminated unless score improves above 5.0 in remaining ${iterationsRemaining} iterations.`
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
  config?: Partial<RefinementConfig>
): EnhancedRefinementAgent {
  return new EnhancedRefinementAgent(config)
}
