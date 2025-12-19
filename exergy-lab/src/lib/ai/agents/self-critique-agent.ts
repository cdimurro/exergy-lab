/**
 * Self-Critique Agent
 *
 * Analyzes validation results and discovery outputs to provide:
 * - Identification of strengths
 * - Identification of weaknesses
 * - Prioritized improvement suggestions
 * - Overall assessment with confidence score
 *
 * This agent serves as a final analysis step that helps users
 * understand what went well and what can be improved.
 */

import type { AggregatedValidation, BenchmarkResult, BenchmarkType } from '../validation/types'
import type { DiscoveryPhase } from '../rubrics/types'
import { diagnosticLogger } from '../../diagnostics/diagnostic-logger'

// ============================================================================
// Self-Critique Types
// ============================================================================

export interface CritiqueItem {
  category: CritiqueCategory
  description: string
  impact: 'high' | 'medium' | 'low'
  relatedBenchmarks: BenchmarkType[]
  relatedPhases?: DiscoveryPhase[]
  evidence?: string[]
}

export type CritiqueCategory =
  | 'scientific_rigor'
  | 'physical_validity'
  | 'practical_feasibility'
  | 'literature_support'
  | 'numerical_quality'
  | 'methodology'
  | 'novelty'
  | 'clarity'

export interface ImprovementSuggestion {
  phase: DiscoveryPhase | 'general'
  currentApproach: string
  suggestedApproach: string
  expectedImpact: string
  difficulty: 'easy' | 'moderate' | 'hard'
  priority: number // 1 = highest priority
  relatedBenchmarks: BenchmarkType[]
}

export interface SelfCritiqueResult {
  strengths: CritiqueItem[]
  weaknesses: CritiqueItem[]
  improvements: ImprovementSuggestion[]
  overallAssessment: string
  confidenceInResults: number
  summary: CritiqueSummary
}

export interface CritiqueSummary {
  scoreCategory: 'excellent' | 'good' | 'moderate' | 'needs_work' | 'poor'
  highPriorityIssues: number
  topStrength: string
  topWeakness: string
  estimatedImprovementPotential: number // 0-1 scale
}

// ============================================================================
// Self-Critique Agent
// ============================================================================

export class SelfCritiqueAgent {
  private readonly SCORE_THRESHOLDS = {
    excellent: 8.5,
    good: 7.5,
    moderate: 6.0,
    needs_work: 4.0,
  }

  /**
   * Analyze validation results and generate critique
   */
  async analyze(
    validation: AggregatedValidation,
    phaseOutputs: Map<string, any>
  ): Promise<SelfCritiqueResult> {
    const startTime = Date.now()

    // 1. Identify strengths from high-scoring items
    const strengths = this.identifyStrengths(validation)

    // 2. Identify weaknesses from failed/low-scoring items
    const weaknesses = this.identifyWeaknesses(validation)

    // 3. Generate prioritized improvements
    const improvements = await this.generateImprovements(
      validation,
      weaknesses,
      phaseOutputs
    )

    // 4. Create overall assessment
    const overallAssessment = this.generateOverallAssessment(
      validation,
      strengths,
      weaknesses
    )

    // 5. Calculate confidence in results
    const confidenceInResults = this.calculateConfidence(validation)

    // 6. Generate summary
    const summary = this.generateSummary(
      validation,
      strengths,
      weaknesses,
      improvements
    )

    // Log the critique
    diagnosticLogger.logAgentReasoning({
      agentType: 'self_critique',
      phase: 'output', // Consolidated: self-critique is part of output phase
      reasoning: [{
        step: 1,
        timestamp: Date.now(),
        thought: `Analyzed ${validation.benchmarks.length} benchmarks`,
        action: 'Generated critique',
        confidence: confidenceInResults,
        durationMs: Date.now() - startTime,
      }],
      selfCritique: {
        strengths: strengths.map(s => s.description),
        weaknesses: weaknesses.map(w => w.description),
        improvements: improvements.map(i => i.suggestedApproach),
        overallAssessment,
        confidenceScore: confidenceInResults,
      },
      totalDurationMs: Date.now() - startTime,
    })

    return {
      strengths,
      weaknesses,
      improvements,
      overallAssessment,
      confidenceInResults,
      summary,
    }
  }

  /**
   * Identify strengths from high-scoring benchmark items
   */
  private identifyStrengths(validation: AggregatedValidation): CritiqueItem[] {
    const strengths: CritiqueItem[] = []

    for (const benchmark of validation.benchmarks) {
      // Add benchmark-level strength if passed with good score
      if (benchmark.passed && benchmark.score >= benchmark.maxScore * 0.8) {
        strengths.push({
          category: this.benchmarkToCategory(benchmark.benchmarkType),
          description: `Strong ${this.formatBenchmarkName(benchmark.benchmarkType)} validation (${benchmark.score.toFixed(1)}/${benchmark.maxScore})`,
          impact: benchmark.score >= benchmark.maxScore * 0.9 ? 'high' : 'medium',
          relatedBenchmarks: [benchmark.benchmarkType],
        })
      }

      // Add item-level strengths
      for (const item of benchmark.items) {
        if (item.passed && item.score >= item.maxScore * 0.9) {
          strengths.push({
            category: this.benchmarkToCategory(benchmark.benchmarkType),
            description: item.reasoning,
            impact: item.maxScore >= 2.0 ? 'high' : 'medium',
            relatedBenchmarks: [benchmark.benchmarkType],
            evidence: item.evidence,
          })
        }
      }
    }

    // Also check for high agreement as a strength
    if (validation.agreementLevel === 'high') {
      strengths.push({
        category: 'methodology',
        description: 'High agreement across all validation benchmarks indicates consistent quality',
        impact: 'high',
        relatedBenchmarks: validation.benchmarks.map(b => b.benchmarkType),
      })
    }

    // Sort by impact and limit
    return this.sortByImpact(strengths).slice(0, 8)
  }

  /**
   * Identify weaknesses from failed/low-scoring items
   */
  private identifyWeaknesses(validation: AggregatedValidation): CritiqueItem[] {
    const weaknesses: CritiqueItem[] = []

    for (const benchmark of validation.benchmarks) {
      // Add benchmark-level weakness if failed
      if (!benchmark.passed) {
        weaknesses.push({
          category: this.benchmarkToCategory(benchmark.benchmarkType),
          description: `Failed ${this.formatBenchmarkName(benchmark.benchmarkType)} validation (${benchmark.score.toFixed(1)}/${benchmark.maxScore})`,
          impact: 'high',
          relatedBenchmarks: [benchmark.benchmarkType],
        })
      }

      // Add item-level weaknesses
      for (const item of benchmark.items) {
        if (!item.passed) {
          weaknesses.push({
            category: this.benchmarkToCategory(benchmark.benchmarkType),
            description: item.reasoning,
            impact: item.score === 0 ? 'high' : 'medium',
            relatedBenchmarks: [benchmark.benchmarkType],
            evidence: item.evidence,
          })
        }
      }
    }

    // Add discrepancy weaknesses
    for (const discrepancy of validation.discrepancies) {
      weaknesses.push({
        category: 'methodology',
        description: `Validation disagreement: ${discrepancy.possibleCause}`,
        impact: discrepancy.scoreDifference > 0.4 ? 'high' : 'medium',
        relatedBenchmarks: [...discrepancy.benchmarks],
      })
    }

    // Low agreement is a weakness
    if (validation.agreementLevel === 'low') {
      weaknesses.push({
        category: 'methodology',
        description: 'Low agreement between benchmarks suggests inconsistencies in the discovery',
        impact: 'high',
        relatedBenchmarks: validation.benchmarks.map(b => b.benchmarkType),
      })
    }

    // Sort by impact and limit
    return this.sortByImpact(weaknesses).slice(0, 10)
  }

  /**
   * Generate prioritized improvement suggestions
   */
  private async generateImprovements(
    validation: AggregatedValidation,
    weaknesses: CritiqueItem[],
    phaseOutputs: Map<string, any>
  ): Promise<ImprovementSuggestion[]> {
    const improvements: ImprovementSuggestion[] = []
    let priorityCounter = 1

    // Group weaknesses by category
    const weaknessesByCategory = this.groupByCategory(weaknesses)

    // Generate improvements for each category
    for (const [category, categoryWeaknesses] of Object.entries(weaknessesByCategory)) {
      const improvement = this.generateCategoryImprovement(
        category as CritiqueCategory,
        categoryWeaknesses,
        priorityCounter++
      )
      if (improvement) {
        improvements.push(improvement)
      }
    }

    // Add benchmark-specific improvements
    for (const benchmark of validation.benchmarks) {
      if (!benchmark.passed) {
        const improvement = this.generateBenchmarkImprovement(
          benchmark,
          priorityCounter++
        )
        if (improvement) {
          improvements.push(improvement)
        }
      }
    }

    // Sort by priority
    improvements.sort((a, b) => a.priority - b.priority)

    return improvements.slice(0, 8) // Top 8 improvements
  }

  /**
   * Generate improvement for a category of weaknesses
   */
  private generateCategoryImprovement(
    category: CritiqueCategory,
    weaknesses: CritiqueItem[],
    priority: number
  ): ImprovementSuggestion | null {
    const highImpactCount = weaknesses.filter(w => w.impact === 'high').length

    // Map to consolidated 4-phase model:
    // research (research + synthesis + screening), hypothesis (hypothesis + experiment),
    // validation (simulation + exergy + tea + patent + validation), output (rubric_eval + publication)
    const categoryImprovements: Record<CritiqueCategory, {
      phase: DiscoveryPhase | 'general'
      current: string
      suggested: string
      impact: string
      difficulty: 'easy' | 'moderate' | 'hard'
    }> = {
      scientific_rigor: {
        phase: 'hypothesis',
        current: 'Current hypothesis may lack scientific rigor',
        suggested: 'Strengthen hypothesis with more specific testable predictions and quantitative targets',
        impact: 'Improved scientific credibility and clearer validation criteria',
        difficulty: 'moderate',
      },
      physical_validity: {
        phase: 'validation', // Consolidated: simulation is now part of validation
        current: 'Some physical constraints may not be properly enforced',
        suggested: 'Add explicit checks for thermodynamic limits and material constraints',
        impact: 'Ensures discovery respects fundamental physical laws',
        difficulty: 'moderate',
      },
      practical_feasibility: {
        phase: 'research', // Consolidated: synthesis is now part of research
        current: 'Practical implementation challenges not fully addressed',
        suggested: 'Include cost estimates, scalability analysis, and supply chain considerations',
        impact: 'Better alignment with real-world implementation requirements',
        difficulty: 'easy',
      },
      literature_support: {
        phase: 'research',
        current: 'Literature coverage may be incomplete or biased',
        suggested: 'Expand source diversity with recent peer-reviewed publications (2020+)',
        impact: 'Stronger evidence base and identification of prior art',
        difficulty: 'easy',
      },
      numerical_quality: {
        phase: 'validation', // Consolidated: simulation is now part of validation
        current: 'Simulation convergence or numerical stability issues detected',
        suggested: 'Review mesh quality, time stepping, and convergence criteria',
        impact: 'More reliable simulation results',
        difficulty: 'hard',
      },
      methodology: {
        phase: 'general',
        current: 'Methodology shows inconsistencies across validation dimensions',
        suggested: 'Align approach across all phases to ensure consistent quality',
        impact: 'Higher benchmark agreement and more robust results',
        difficulty: 'moderate',
      },
      novelty: {
        phase: 'hypothesis',
        current: 'Novelty contribution may not be clearly articulated',
        suggested: 'Explicitly state what makes this discovery novel compared to prior work',
        impact: 'Clearer differentiation from existing research',
        difficulty: 'easy',
      },
      clarity: {
        phase: 'general',
        current: 'Some aspects may lack clarity or specificity',
        suggested: 'Add more detailed explanations and quantitative specifications',
        impact: 'Improved reproducibility and understanding',
        difficulty: 'easy',
      },
    }

    const improvement = categoryImprovements[category]
    if (!improvement) return null

    return {
      phase: improvement.phase,
      currentApproach: improvement.current,
      suggestedApproach: improvement.suggested,
      expectedImpact: improvement.impact,
      difficulty: improvement.difficulty,
      priority: highImpactCount > 1 ? priority : priority + 5,
      relatedBenchmarks: weaknesses.flatMap(w => w.relatedBenchmarks),
    }
  }

  /**
   * Generate improvement for a failed benchmark
   */
  private generateBenchmarkImprovement(
    benchmark: BenchmarkResult,
    priority: number
  ): ImprovementSuggestion | null {
    const failedItems = benchmark.items.filter(i => !i.passed)
    if (failedItems.length === 0) return null

    const topFailedItem = failedItems[0]
    const suggestion = topFailedItem.suggestions?.[0] || 'Review and improve this area'

    // Map to consolidated 4-phase model
    const phaseMap: Record<BenchmarkType, DiscoveryPhase | 'general'> = {
      frontierscience: 'general',
      domain_specific: 'validation', // Consolidated: simulation is now part of validation
      practicality: 'research', // Consolidated: synthesis is now part of research
      literature: 'research',
      simulation_convergence: 'validation', // Consolidated: simulation is now part of validation
    }

    return {
      phase: phaseMap[benchmark.benchmarkType] || 'general',
      currentApproach: topFailedItem.reasoning,
      suggestedApproach: suggestion,
      expectedImpact: `Improve ${this.formatBenchmarkName(benchmark.benchmarkType)} score`,
      difficulty: 'moderate',
      priority,
      relatedBenchmarks: [benchmark.benchmarkType],
    }
  }

  /**
   * Generate overall assessment
   */
  private generateOverallAssessment(
    validation: AggregatedValidation,
    strengths: CritiqueItem[],
    weaknesses: CritiqueItem[]
  ): string {
    const score = validation.overallScore
    const highPriorityWeaknesses = weaknesses.filter(w => w.impact === 'high').length

    if (score >= this.SCORE_THRESHOLDS.excellent) {
      return `Excellent discovery with ${strengths.length} notable strengths. High confidence in results across all validation dimensions.`
    } else if (score >= this.SCORE_THRESHOLDS.good) {
      return `Good discovery. ${weaknesses.length} areas identified for potential improvement. Overall methodology is sound.`
    } else if (score >= this.SCORE_THRESHOLDS.moderate) {
      return `Moderate discovery with ${highPriorityWeaknesses} high-priority issues to address. Focus on the top recommendations for improvement.`
    } else if (score >= this.SCORE_THRESHOLDS.needs_work) {
      return `Discovery needs significant work. ${highPriorityWeaknesses} critical weaknesses identified. Consider addressing fundamental issues before proceeding.`
    } else {
      return `Discovery has substantial issues. Recommend revisiting core assumptions and methodology. ${highPriorityWeaknesses} critical areas need attention.`
    }
  }

  /**
   * Calculate confidence in results
   */
  private calculateConfidence(validation: AggregatedValidation): number {
    // Base confidence on benchmark confidences and agreement
    const avgBenchmarkConfidence = validation.benchmarks.length > 0
      ? validation.benchmarks.reduce((sum, b) => sum + b.confidence, 0) / validation.benchmarks.length
      : 0

    const agreementFactor = {
      high: 1.0,
      moderate: 0.8,
      low: 0.6,
    }[validation.agreementLevel]

    // Penalize for discrepancies
    const discrepancyPenalty = Math.min(validation.discrepancies.length * 0.05, 0.2)

    return Math.max(0, Math.min(1, avgBenchmarkConfidence * agreementFactor - discrepancyPenalty))
  }

  /**
   * Generate summary
   */
  private generateSummary(
    validation: AggregatedValidation,
    strengths: CritiqueItem[],
    weaknesses: CritiqueItem[],
    improvements: ImprovementSuggestion[]
  ): CritiqueSummary {
    const score = validation.overallScore
    let scoreCategory: CritiqueSummary['scoreCategory']

    if (score >= this.SCORE_THRESHOLDS.excellent) scoreCategory = 'excellent'
    else if (score >= this.SCORE_THRESHOLDS.good) scoreCategory = 'good'
    else if (score >= this.SCORE_THRESHOLDS.moderate) scoreCategory = 'moderate'
    else if (score >= this.SCORE_THRESHOLDS.needs_work) scoreCategory = 'needs_work'
    else scoreCategory = 'poor'

    const highPriorityIssues = weaknesses.filter(w => w.impact === 'high').length

    const topStrength = strengths.length > 0
      ? strengths[0].description
      : 'No major strengths identified'

    const topWeakness = weaknesses.length > 0
      ? weaknesses[0].description
      : 'No major weaknesses identified'

    // Estimate improvement potential based on easy fixes available
    const easyImprovements = improvements.filter(i => i.difficulty === 'easy').length
    const estimatedImprovementPotential = Math.min(1, (easyImprovements * 0.2) + (highPriorityIssues > 0 ? 0.3 : 0))

    return {
      scoreCategory,
      highPriorityIssues,
      topStrength,
      topWeakness,
      estimatedImprovementPotential,
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private benchmarkToCategory(benchmarkType: BenchmarkType): CritiqueCategory {
    const mapping: Record<BenchmarkType, CritiqueCategory> = {
      frontierscience: 'scientific_rigor',
      domain_specific: 'physical_validity',
      practicality: 'practical_feasibility',
      literature: 'literature_support',
      simulation_convergence: 'numerical_quality',
    }
    return mapping[benchmarkType] || 'methodology'
  }

  private formatBenchmarkName(benchmarkType: BenchmarkType): string {
    const names: Record<BenchmarkType, string> = {
      frontierscience: 'FrontierScience',
      domain_specific: 'Domain-Specific',
      practicality: 'Practicality',
      literature: 'Literature',
      simulation_convergence: 'Simulation Convergence',
    }
    return names[benchmarkType] || benchmarkType
  }

  private sortByImpact<T extends { impact: 'high' | 'medium' | 'low' }>(items: T[]): T[] {
    const impactOrder = { high: 0, medium: 1, low: 2 }
    return [...items].sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact])
  }

  private groupByCategory(weaknesses: CritiqueItem[]): Record<string, CritiqueItem[]> {
    const grouped: Record<string, CritiqueItem[]> = {}
    for (const weakness of weaknesses) {
      if (!grouped[weakness.category]) {
        grouped[weakness.category] = []
      }
      grouped[weakness.category].push(weakness)
    }
    return grouped
  }
}

// ============================================================================
// Export singleton
// ============================================================================

export const selfCritiqueAgent = new SelfCritiqueAgent()
