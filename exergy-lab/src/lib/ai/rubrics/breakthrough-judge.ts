/**
 * Breakthrough Engine v0.0.3 - Breakthrough Judge
 *
 * Extends RubricJudge with breakthrough-specific functionality:
 * - 12-dimension evaluation (8 impact + 4 feasibility)
 * - 6-tier classification
 * - Score trajectory tracking
 * - Feasibility assessment
 * - Report generation
 */

import { RubricJudge, JudgeConfig, DEFAULT_JUDGE_CONFIG } from './judge'
import type { JudgeResult, ItemScore } from './types'
import {
  BREAKTHROUGH_RUBRIC,
  evaluateBreakthroughDimensions,
} from './templates/breakthrough'
import {
  type ClassificationTier,
  type BreakthroughEvaluationResult,
  type BreakthroughReport,
  type RefinementFeedback,
  type BreakthroughDimension,
  getClassificationFromScore,
  getClassificationConfig,
  getScoreColor,
  checkRequiredDimensions,
  countDimensionsAboveThreshold,
  shouldEliminate,
  isBreakthroughCandidate,
  isPromising,
} from './types-breakthrough'

// =============================================================================
// Breakthrough Judge Configuration
// =============================================================================

export interface BreakthroughJudgeConfig extends JudgeConfig {
  breakthroughThreshold: number      // Default: 9.0
  eliminationThreshold: number       // Default: 5.0
  maxIterations: number              // Default: 5
  trackScoreHistory: boolean         // Track scores across iterations
  generateReports: boolean           // Generate detailed reports
}

export const DEFAULT_BREAKTHROUGH_CONFIG: BreakthroughJudgeConfig = {
  ...DEFAULT_JUDGE_CONFIG,
  breakthroughThreshold: 9.0,
  eliminationThreshold: 5.0,
  maxIterations: 5,
  trackScoreHistory: true,
  generateReports: true,
}

// =============================================================================
// Breakthrough Judge Class
// =============================================================================

export class BreakthroughJudge extends RubricJudge {
  private breakthroughConfig: BreakthroughJudgeConfig
  private scoreHistory: Map<string, BreakthroughEvaluationResult[]> = new Map()

  constructor(config: Partial<BreakthroughJudgeConfig> = {}) {
    super(config)
    this.breakthroughConfig = { ...DEFAULT_BREAKTHROUGH_CONFIG, ...config }
  }

  /**
   * Evaluate a hypothesis for breakthrough potential
   * Returns both standard JudgeResult and BreakthroughEvaluationResult
   */
  async evaluateBreakthrough(
    problem: string,
    response: any,
    iteration: number = 1
  ): Promise<{
    judgeResult: JudgeResult
    breakthroughResult: BreakthroughEvaluationResult
    classification: ClassificationTier
    shouldContinue: boolean
    feedback?: RefinementFeedback
  }> {
    // Run standard judge evaluation
    const judgeResult = await this.judge(problem, response, BREAKTHROUGH_RUBRIC)

    // Run breakthrough-specific 12-dimension evaluation (8 impact + 4 feasibility)
    const breakthroughResult = await evaluateBreakthroughDimensions(response)
    breakthroughResult.iteration = iteration

    // Determine if this is a score improvement
    const hypothesisId = response?.hypothesis?.id || response?.id || 'unknown'
    const previousResults = this.scoreHistory.get(hypothesisId) || []
    const previousScore = previousResults.length > 0
      ? previousResults[previousResults.length - 1].totalScore
      : undefined

    if (previousScore !== undefined) {
      breakthroughResult.previousScore = previousScore
      breakthroughResult.scoreDelta = breakthroughResult.totalScore - previousScore
      breakthroughResult.trending = breakthroughResult.scoreDelta > 0.2
        ? 'improving'
        : breakthroughResult.scoreDelta < -0.2
          ? 'declining'
          : 'stable'
    }

    // Track score history
    if (this.breakthroughConfig.trackScoreHistory) {
      if (!this.scoreHistory.has(hypothesisId)) {
        this.scoreHistory.set(hypothesisId, [])
      }
      this.scoreHistory.get(hypothesisId)!.push(breakthroughResult)
    }

    // Get classification
    const classification = getClassificationFromScore(breakthroughResult.totalScore)

    // Determine if hypothesis should continue refining
    const shouldContinue = this.shouldContinueRefining(
      breakthroughResult,
      iteration,
      judgeResult
    )

    // Generate refinement feedback if continuing
    let feedback: RefinementFeedback | undefined
    if (shouldContinue && this.breakthroughConfig.generateReports) {
      feedback = this.generateRefinementFeedback(
        breakthroughResult,
        response?.agentSource || 'unknown',
        iteration
      )
    }

    return {
      judgeResult,
      breakthroughResult,
      classification,
      shouldContinue,
      feedback,
    }
  }

  /**
   * Determine if hypothesis should continue refining
   */
  private shouldContinueRefining(
    result: BreakthroughEvaluationResult,
    iteration: number,
    judgeResult: JudgeResult
  ): boolean {
    // Check if max iterations reached
    if (iteration >= this.breakthroughConfig.maxIterations) {
      return false
    }

    // Check if should be eliminated (score < 5.0)
    if (shouldEliminate(result.totalScore, iteration)) {
      return false
    }

    // Check if already a breakthrough candidate (score >= 9.0)
    if (isBreakthroughCandidate(result.totalScore)) {
      // Still continue to potentially improve further, but flag as candidate
      return true
    }

    // Check for improvement trend
    if (result.trending === 'declining' && iteration >= 3) {
      // If declining after 3 iterations, may want to stop
      return result.totalScore >= 7.0 // Only continue if still promising
    }

    // Continue if there's room for improvement
    return result.totalScore < 10.0 && judgeResult.failedItems.length > 0
  }

  /**
   * Generate detailed refinement feedback for an agent
   */
  private generateRefinementFeedback(
    result: BreakthroughEvaluationResult,
    targetAgent: string,
    iteration: number
  ): RefinementFeedback {
    const dimensionFeedback = result.weakestDimensions.map(dimId => {
      const dim = result.dimensions[dimId as keyof typeof result.dimensions]
      const targetScore = Math.min(dim.score + 20, 100) // Target 20% improvement

      return {
        dimension: dimId,
        currentScore: dim.score,
        targetScore,
        specificImprovements: this.generateImprovementSuggestions(dimId, dim),
        researchPointers: this.generateResearchPointers(dimId),
        exampleStrategies: this.generateExampleStrategies(dimId),
      }
    })

    // Find primary focus (lowest required dimension or overall weakest)
    const bc1Score = result.dimensions.bc1_performance.score
    const bc8Score = result.dimensions.bc8_trajectory.score
    let primaryFocus = result.weakestDimensions[0]

    if (bc1Score < 70 && bc1Score <= bc8Score) {
      primaryFocus = 'bc1_performance'
    } else if (bc8Score < 70) {
      primaryFocus = 'bc8_trajectory'
    }

    // Identify quick wins (dimensions close to threshold)
    const quickWins: string[] = []
    const deepDiveAreas: string[] = []

    for (const [dimId, dim] of Object.entries(result.dimensions)) {
      if (dim.score >= 60 && dim.score < 70) {
        quickWins.push(`${dimId}: ${dim.label} (${dim.score}% - close to 70% threshold)`)
      } else if (dim.score < 50) {
        deepDiveAreas.push(`${dimId}: ${dim.label} (${dim.score}% - needs significant improvement)`)
      }
    }

    // Identify synergies
    const synergies = this.identifySynergies(result)

    // Determine priority
    let priority: 'critical' | 'high' | 'normal' | 'low' = 'normal'
    if (result.totalScore < 5.0) priority = 'critical'
    else if (result.totalScore < 7.0) priority = 'high'
    else if (result.totalScore >= 8.5) priority = 'low'

    return {
      targetAgent,
      hypothesisId: result.hypothesisId,
      iteration,
      timestamp: Date.now(),
      overallAssessment: this.generateOverallAssessment(result),
      currentScore: result.totalScore,
      targetScore: Math.min(result.totalScore + 1.0, 10.0),
      dimensionFeedback,
      strategicGuidance: {
        primaryFocus: `Focus on ${primaryFocus}: ${this.getDimensionName(primaryFocus as BreakthroughDimension)}`,
        quickWins,
        deepDiveAreas,
        synergies,
      },
      competitiveInsight: {
        leadingHypotheses: [], // Would be populated by racing arena
        differentiationOpportunities: this.generateDifferentiationOpportunities(result),
      },
      priority,
    }
  }

  /**
   * Generate improvement suggestions for a dimension
   */
  private generateImprovementSuggestions(
    dimension: string,
    dimScore: { score: number; gaps: string[] }
  ): string[] {
    const suggestions: string[] = []

    switch (dimension) {
      case 'bc1_performance':
        suggestions.push('Quantify efficiency improvement with specific metrics')
        suggestions.push('Compare against current state-of-the-art benchmarks')
        suggestions.push('Provide evidence from simulations or prior research')
        break
      case 'bc2_cost':
        suggestions.push('Include LCOE, CAPEX, and OPEX estimates')
        suggestions.push('Reference comparable cost analyses')
        suggestions.push('Show path to cost competitiveness')
        break
      case 'bc3_capabilities':
        suggestions.push('Identify specific new functions enabled')
        suggestions.push('Describe capabilities not possible with current technology')
        suggestions.push('Quantify capability improvements')
        break
      case 'bc4_applications':
        suggestions.push('Identify cross-domain applications')
        suggestions.push('Describe market expansion opportunities')
        suggestions.push('Show transferability to other sectors')
        break
      case 'bc5_societal':
        suggestions.push('Quantify decarbonization potential')
        suggestions.push('Address accessibility and equity')
        suggestions.push('Align with SDGs')
        break
      case 'bc6_scale':
        suggestions.push('Estimate total addressable market')
        suggestions.push('Describe deployment pathway')
        suggestions.push('Show scalability potential')
        break
      case 'bc7_problem_solving':
        suggestions.push('Identify specific unsolved challenges addressed')
        suggestions.push('Show how this advances the field')
        suggestions.push('Reference prior attempts and why they failed')
        break
      case 'bc8_trajectory':
        suggestions.push('Challenge fundamental assumptions')
        suggestions.push('Introduce novel methodology')
        suggestions.push('Show potential for follow-on discoveries')
        break
      // Feasibility dimensions (BC9-BC12)
      case 'bc9_feasibility':
        suggestions.push('Describe current technology readiness level (TRL)')
        suggestions.push('Provide evidence of prototype or lab demonstration')
        suggestions.push('Outline engineering pathway to deployment')
        break
      case 'bc10_literature':
        suggestions.push('Cite peer-reviewed sources supporting the approach')
        suggestions.push('Reference state-of-the-art literature')
        suggestions.push('Address any contradicting research')
        break
      case 'bc11_infrastructure':
        suggestions.push('Assess compatibility with existing manufacturing')
        suggestions.push('Identify supply chain requirements')
        suggestions.push('Describe deployment pathway using current infrastructure')
        break
      case 'bc12_capital':
        suggestions.push('Estimate capital requirements with breakdown')
        suggestions.push('Identify potential funding sources')
        suggestions.push('Project ROI and payback period')
        break
    }

    // Add gap-specific suggestions
    for (const gap of dimScore.gaps.slice(0, 2)) {
      suggestions.push(`Address: ${gap}`)
    }

    return suggestions.slice(0, 5)
  }

  /**
   * Generate research pointers for a dimension
   */
  private generateResearchPointers(dimension: string): string[] {
    const pointers: string[] = []

    switch (dimension) {
      case 'bc1_performance':
        pointers.push('Review NREL efficiency charts for current SOTA')
        pointers.push('Check recent publications on performance improvements')
        break
      case 'bc2_cost':
        pointers.push('Reference Lazard LCOE analysis')
        pointers.push('Review DOE cost targets')
        break
      case 'bc6_scale':
        pointers.push('Check IEA market projections')
        pointers.push('Review BloombergNEF market analysis')
        break
      case 'bc8_trajectory':
        pointers.push('Identify paradigm-shifting papers in the field')
        pointers.push('Look for review articles on research gaps')
        break
      // Feasibility dimensions (BC9-BC12)
      case 'bc9_feasibility':
        pointers.push('Review TRL assessment guidelines (NASA, DOE)')
        pointers.push('Check for similar technology demonstrations')
        break
      case 'bc10_literature':
        pointers.push('Search Semantic Scholar for relevant citations')
        pointers.push('Check Web of Science for peer-reviewed support')
        break
      case 'bc11_infrastructure':
        pointers.push('Review manufacturing readiness assessments')
        pointers.push('Check industry reports on supply chain capacity')
        break
      case 'bc12_capital':
        pointers.push('Review VC investment trends in sector')
        pointers.push('Check DOE funding opportunities')
        break
    }

    return pointers
  }

  /**
   * Generate example strategies for a dimension
   */
  private generateExampleStrategies(dimension: string): string[] {
    const strategies: string[] = []

    switch (dimension) {
      case 'bc1_performance':
        strategies.push('Perovskite-silicon tandems achieved >30% by combining bandgaps')
        strategies.push('LiFePO4 achieved cycle life >5000 by optimizing crystal structure')
        break
      case 'bc8_trajectory':
        strategies.push('Perovskites challenged Si dominance by enabling solution processing')
        strategies.push('Solid-state batteries challenge liquid electrolytes fundamentally')
        break
    }

    return strategies
  }

  /**
   * Identify synergies between dimensions
   */
  private identifySynergies(result: BreakthroughEvaluationResult): string[] {
    const synergies: string[] = []

    // Performance + Cost synergy
    if (result.dimensions.bc1_performance.score < 70 && result.dimensions.bc2_cost.score < 70) {
      synergies.push('Improving efficiency often reduces cost per unit output')
    }

    // Capabilities + Applications synergy
    if (result.dimensions.bc3_capabilities.score > 60 && result.dimensions.bc4_applications.score < 60) {
      synergies.push('New capabilities can unlock additional applications')
    }

    // Problem-solving + Trajectory synergy
    if (result.dimensions.bc7_problem_solving.score > 60 && result.dimensions.bc8_trajectory.score < 70) {
      synergies.push('Solving fundamental problems often indicates paradigm shift')
    }

    // Feasibility dimension synergies (BC9-BC12)
    if (result.dimensions.bc9_feasibility && result.dimensions.bc11_infrastructure) {
      if (result.dimensions.bc9_feasibility.score > 60 && result.dimensions.bc11_infrastructure.score < 60) {
        synergies.push('High TRL can leverage existing infrastructure for deployment')
      }
    }

    if (result.dimensions.bc10_literature && result.dimensions.bc8_trajectory) {
      if (result.dimensions.bc10_literature.score > 60 && result.dimensions.bc8_trajectory.score > 60) {
        synergies.push('Strong literature foundation supports paradigm-shifting claims')
      }
    }

    if (result.dimensions.bc12_capital && result.dimensions.bc6_scale) {
      if (result.dimensions.bc12_capital.score < 50 && result.dimensions.bc6_scale.score > 70) {
        synergies.push('Large market opportunity may attract capital despite high requirements')
      }
    }

    return synergies
  }

  /**
   * Generate differentiation opportunities
   */
  private generateDifferentiationOpportunities(result: BreakthroughEvaluationResult): string[] {
    const opportunities: string[] = []

    for (const dimId of result.strongestDimensions) {
      const dim = result.dimensions[dimId as keyof typeof result.dimensions]
      if (dim.score >= 80) {
        opportunities.push(`Leverage strength in ${this.getDimensionName(dimId as BreakthroughDimension)} (${dim.score}%)`)
      }
    }

    return opportunities
  }

  /**
   * Generate overall assessment text
   */
  private generateOverallAssessment(result: BreakthroughEvaluationResult): string {
    const config = getClassificationConfig(result.classification)

    let assessment = `Score: ${result.totalScore.toFixed(1)}/10 (${config.label}). `

    if (result.requiredDimensionsPassed) {
      assessment += 'Required dimensions (Performance + Trajectory) passed. '
    } else {
      const bc1Status = result.requiredDimensionsStatus.bc1_performance
      const bc8Status = result.requiredDimensionsStatus.bc8_trajectory
      if (!bc1Status.passed) {
        assessment += `Performance dimension needs improvement (${bc1Status.score}%). `
      }
      if (!bc8Status.passed) {
        assessment += `Knowledge Trajectory needs improvement (${bc8Status.score}%). `
      }
    }

    assessment += `${result.dimensionsAbove70}/12 dimensions above 70% threshold. `

    // Add feasibility confidence if available
    if (result.feasibilityConfidence) {
      assessment += `Feasibility confidence: ${result.feasibilityConfidence}. `
    }

    if (result.trending === 'improving') {
      assessment += `Improving trend (+${result.scoreDelta?.toFixed(2)}). `
    } else if (result.trending === 'declining') {
      assessment += `Declining trend (${result.scoreDelta?.toFixed(2)}). `
    }

    return assessment
  }

  /**
   * Get dimension display name
   */
  private getDimensionName(dimension: BreakthroughDimension): string {
    const names: Record<BreakthroughDimension, string> = {
      // Impact dimensions
      bc1_performance: 'Performance Gains',
      bc2_cost: 'Cost Reduction',
      bc3_capabilities: 'Advanced Capabilities',
      bc4_applications: 'New Applications',
      bc5_societal: 'Societal Impact',
      bc6_scale: 'Opportunity Scale',
      bc7_problem_solving: 'Problem-Solving',
      bc8_trajectory: 'Knowledge Trajectory',
      // Feasibility dimensions
      bc9_feasibility: 'Technical Feasibility',
      bc10_literature: 'Literature Support',
      bc11_infrastructure: 'Infrastructure Compatibility',
      bc12_capital: 'Capital Requirements',
    }
    return names[dimension] || dimension
  }

  /**
   * Generate a breakthrough report
   */
  async generateReport(
    hypothesisId: string,
    result: BreakthroughEvaluationResult,
    hypothesis: any
  ): Promise<BreakthroughReport> {
    const config = getClassificationConfig(result.classification)
    const history = this.scoreHistory.get(hypothesisId) || []

    return {
      id: `report-${hypothesisId}-${Date.now()}`,
      hypothesisId,
      generatedAt: Date.now(),
      classification: result.classification,
      score: result.totalScore,
      executiveSummary: this.generateExecutiveSummary(result, hypothesis),
      hypothesisSummary: {
        title: hypothesis?.title || 'Untitled Hypothesis',
        innovation: hypothesis?.description || hypothesis?.statement || '',
        mechanism: hypothesis?.mechanism?.summary || '',
        domain: hypothesis?.domain || 'clean-energy',
      },
      scoreBreakdown: Object.values(result.dimensions),
      strengths: result.strongestDimensions.map(d =>
        `${this.getDimensionName(d)}: ${result.dimensions[d].label}`
      ),
      weaknesses: result.weakestDimensions.map(d =>
        `${this.getDimensionName(d)}: ${result.dimensions[d].gaps[0] || 'Needs improvement'}`
      ),
      recommendations: this.generateReportRecommendations(result),
      competitorAnalysis: this.generateCompetitorAnalysis(hypothesis),
      timelineToImpact: this.generateTimelineToImpact(result, hypothesis),
      iterationHistory: history.map(h => ({
        iteration: h.iteration,
        score: h.totalScore,
        improvements: h.scoreDelta ? [`+${h.scoreDelta.toFixed(2)} from previous`] : [],
      })),
    }
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(
    result: BreakthroughEvaluationResult,
    hypothesis: any
  ): string {
    const config = getClassificationConfig(result.classification)
    const title = hypothesis?.title || 'This hypothesis'

    let summary = `${title} achieves a score of ${result.totalScore.toFixed(1)}/10, `
    summary += `classified as "${config.label}". `

    if (result.classification === 'breakthrough') {
      summary += 'This represents a paradigm-shifting discovery with publication-ready findings. '
    } else if (result.classification === 'partial_breakthrough') {
      summary += 'Near-breakthrough potential with minor refinements needed. '
    } else if (result.classification === 'major_discovery') {
      summary += 'Significant novel contribution to the field. '
    }

    const topStrength = result.strongestDimensions[0]
    const dim = result.dimensions[topStrength]
    summary += `Key strength: ${this.getDimensionName(topStrength)} (${dim.score}%). `

    return summary
  }

  /**
   * Generate report recommendations
   */
  private generateReportRecommendations(result: BreakthroughEvaluationResult): string[] {
    const recommendations: string[] = []

    // Based on classification
    switch (result.classification) {
      case 'breakthrough':
        recommendations.push('Submit for publication in high-impact journal')
        recommendations.push('File provisional patent within 30 days')
        recommendations.push('Seek independent verification from national lab')
        break
      case 'partial_breakthrough':
        recommendations.push('Address remaining gaps for breakthrough classification')
        recommendations.push('Consider pre-print for community feedback')
        recommendations.push('Begin patent landscape analysis')
        break
      case 'major_discovery':
        recommendations.push('Continue refinement to reach breakthrough threshold')
        recommendations.push('Document methodology for reproducibility')
        recommendations.push('Identify potential collaborators')
        break
      case 'significant_discovery':
        recommendations.push('Focus on improving weakest dimensions')
        recommendations.push('Validate key assumptions with simulation')
        recommendations.push('Review prior art for differentiation')
        break
      case 'partial_failure':
        recommendations.push('Re-evaluate fundamental approach')
        recommendations.push('Consider alternative hypotheses')
        recommendations.push('Review research gaps for opportunities')
        break
      case 'failure':
        recommendations.push('Analyze failure modes')
        recommendations.push('Document learnings for future research')
        recommendations.push('Explore adjacent problem spaces')
        break
    }

    return recommendations
  }

  /**
   * Generate competitor analysis
   */
  private generateCompetitorAnalysis(hypothesis: any): string {
    const priorArt = hypothesis?.priorArt || hypothesis?.stateOfTheArt || {}
    const novelty = hypothesis?.novelty || {}

    if (novelty?.differentiation) {
      return `Differentiated from prior art through: ${novelty.differentiation}. `
    }

    if (Array.isArray(priorArt) && priorArt.length > 0) {
      return `Builds upon ${priorArt.length} prior works with novel improvements. `
    }

    return 'Competitor analysis pending - recommend patent landscape review. '
  }

  /**
   * Generate timeline to impact
   */
  private generateTimelineToImpact(
    result: BreakthroughEvaluationResult,
    hypothesis: any
  ): string {
    const feasibility = hypothesis?.feasibility?.score || hypothesis?.feasibilityScore || 5
    const trl = hypothesis?.trl || 1

    if (result.classification === 'breakthrough' && feasibility >= 7) {
      return 'Near-term impact: 1-2 years to prototype, 3-5 years to commercialization'
    } else if (result.totalScore >= 8.0 && feasibility >= 5) {
      return 'Medium-term impact: 2-3 years to prototype, 5-7 years to commercialization'
    } else if (result.totalScore >= 7.0) {
      return 'Long-term impact: 3-5 years to prototype validation'
    }

    return 'Early stage: Further research needed before impact assessment'
  }

  /**
   * Get score history for a hypothesis
   */
  getScoreHistory(hypothesisId: string): BreakthroughEvaluationResult[] {
    return this.scoreHistory.get(hypothesisId) || []
  }

  /**
   * Clear score history
   */
  clearScoreHistory(): void {
    this.scoreHistory.clear()
  }

  /**
   * Get breakthrough threshold
   */
  getBreakthroughThreshold(): number {
    return this.breakthroughConfig.breakthroughThreshold
  }

  /**
   * Get elimination threshold
   */
  getEliminationThreshold(): number {
    return this.breakthroughConfig.eliminationThreshold
  }
}

// =============================================================================
// Quick Functions
// =============================================================================

/**
 * Quick function to evaluate breakthrough without creating instance
 */
export async function evaluateBreakthrough(
  problem: string,
  response: any,
  iteration: number = 1,
  config?: Partial<BreakthroughJudgeConfig>
): Promise<{
  judgeResult: JudgeResult
  breakthroughResult: BreakthroughEvaluationResult
  classification: ClassificationTier
  shouldContinue: boolean
  feedback?: RefinementFeedback
}> {
  const judge = new BreakthroughJudge(config)
  return judge.evaluateBreakthrough(problem, response, iteration)
}

/**
 * Quick function to generate breakthrough report
 */
export async function generateBreakthroughReport(
  hypothesisId: string,
  result: BreakthroughEvaluationResult,
  hypothesis: any,
  config?: Partial<BreakthroughJudgeConfig>
): Promise<BreakthroughReport> {
  const judge = new BreakthroughJudge(config)
  return judge.generateReport(hypothesisId, result, hypothesis)
}
