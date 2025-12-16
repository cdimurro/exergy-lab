/**
 * Recommendation Engine
 *
 * Generates intelligent next-step suggestions based on workflow results.
 * Analyzes research quality, experiment risk, simulation accuracy, and
 * provides actionable recommendations for workflow refinement or continuation.
 */

import type {
  WorkflowResults,
  NextStepSuggestion,
  NextStepType,
} from '@/types/workflow'

// ============================================================================
// Recommendation Engine Class
// ============================================================================

export class RecommendationEngine {
  /**
   * Generate next-step suggestions based on workflow results
   */
  generateNextSteps(results: WorkflowResults): NextStepSuggestion[] {
    const suggestions: NextStepSuggestion[] = []

    // Analyze research phase
    const researchSuggestions = this.analyzeResearch(results.research)
    suggestions.push(...researchSuggestions)

    // Analyze experiment phase
    const experimentSuggestions = this.analyzeExperiments(results.experiments)
    suggestions.push(...experimentSuggestions)

    // Analyze simulation phase
    const simulationSuggestions = this.analyzeSimulations(results.simulations)
    suggestions.push(...simulationSuggestions)

    // Check if ready for TEA
    const teaSuggestion = this.checkTEAReadiness(results)
    if (teaSuggestion) {
      suggestions.push(teaSuggestion)
    }

    // Sort by priority
    return this.prioritizeSuggestions(suggestions)
  }

  /**
   * Analyze research phase results
   */
  private analyzeResearch(research: WorkflowResults['research']): NextStepSuggestion[] {
    const suggestions: NextStepSuggestion[] = []

    // Low confidence score → Expand search
    if (research.confidenceScore < 70) {
      suggestions.push({
        type: 'refine_search',
        priority: 'high',
        reason: `Research confidence score is ${research.confidenceScore}%, which is below the recommended threshold of 70%`,
        action: {
          label: 'Expand Literature Search',
          description: 'Search additional sources or broaden domain coverage to increase confidence',
          estimatedTime: 5,
          estimatedCost: 0,
          parameters: {
            expandDomains: true,
            increaseMaxResults: true,
          },
        },
        estimatedImpact: 'Increase research confidence by 15-25%',
      })
    }

    // Very few sources found
    if (research.totalSources < 10) {
      suggestions.push({
        type: 'refine_search',
        priority: 'high',
        reason: `Only ${research.totalSources} sources found, which may not provide sufficient coverage`,
        action: {
          label: 'Broaden Search Parameters',
          description: 'Adjust search query or expand date range to find more relevant sources',
          estimatedTime: 3,
          estimatedCost: 0,
        },
        estimatedImpact: 'Find 20-40 additional relevant sources',
      })
    }

    // Imbalanced source types
    if (research.papers.length > 0 && research.patents.length === 0) {
      suggestions.push({
        type: 'refine_search',
        priority: 'medium',
        reason: 'No patents found - commercial viability may be unclear',
        action: {
          label: 'Search Patent Databases',
          description: 'Query patent databases to understand IP landscape and commercial potential',
          estimatedTime: 4,
          estimatedCost: 0,
        },
        estimatedImpact: 'Identify 5-10 relevant patents',
      })
    }

    return suggestions
  }

  /**
   * Analyze experiment phase results
   */
  private analyzeExperiments(experiments: WorkflowResults['experiments']): NextStepSuggestion[] {
    const suggestions: NextStepSuggestion[] = []

    // Calculate average risk score
    const avgRisk = this.calculateAverageRisk(experiments.failureAnalyses)

    // High risk protocols → Redesign
    if (avgRisk > 75) {
      suggestions.push({
        type: 'modify_experiments',
        priority: 'high',
        reason: `Average failure risk is ${avgRisk.toFixed(1)}%, which is above the acceptable threshold of 75%`,
        action: {
          label: 'Redesign High-Risk Protocols',
          description: 'Simplify procedures or add safety measures to reduce failure likelihood',
          estimatedTime: 10,
          estimatedCost: 0,
          parameters: {
            focusOnSafety: true,
            simplifyProcedures: true,
          },
        },
        estimatedImpact: 'Reduce failure risk by 20-30%',
      })
    }

    // No protocols generated
    if (experiments.totalProtocols === 0) {
      suggestions.push({
        type: 'modify_experiments',
        priority: 'high',
        reason: 'No experimental protocols were generated',
        action: {
          label: 'Generate Experiment Protocols',
          description: 'Create detailed experimental designs based on research findings',
          estimatedTime: 8,
          estimatedCost: 0,
        },
        estimatedImpact: 'Generate 2-3 actionable protocols',
      })
    }

    // Too few protocols
    if (experiments.totalProtocols > 0 && experiments.totalProtocols < 2) {
      suggestions.push({
        type: 'modify_experiments',
        priority: 'medium',
        reason: 'Only one protocol available - having alternatives reduces risk',
        action: {
          label: 'Design Alternative Protocols',
          description: 'Create backup experimental approaches with different methodologies',
          estimatedTime: 6,
          estimatedCost: 0,
        },
        estimatedImpact: 'Provide 1-2 alternative approaches',
      })
    }

    return suggestions
  }

  /**
   * Analyze simulation phase results
   */
  private analyzeSimulations(simulations: WorkflowResults['simulations']): NextStepSuggestion[] {
    const suggestions: NextStepSuggestion[] = []

    // Low accuracy → Optimize
    if (simulations.averageAccuracy < 85 && simulations.totalRuns > 0) {
      suggestions.push({
        type: 'optimize_simulations',
        priority: 'high',
        reason: `Average simulation accuracy is ${simulations.averageAccuracy.toFixed(1)}%, below the target of 85%`,
        action: {
          label: 'Optimize Simulation Parameters',
          description: 'Adjust parameters or increase iterations to improve accuracy (cloud GPU)',
          estimatedTime: 15,
          estimatedCost: 0.50, // Cloud GPU cost
          parameters: {
            increaseIterations: true,
            refineMesh: true,
          },
        },
        estimatedImpact: 'Increase accuracy by 10-15%',
      })
    }

    // No simulations run
    if (simulations.totalRuns === 0) {
      suggestions.push({
        type: 'optimize_simulations',
        priority: 'medium',
        reason: 'No simulations were executed',
        action: {
          label: 'Run Simulations',
          description: 'Execute simulations to validate experimental designs',
          estimatedTime: 20,
          estimatedCost: 0, // Free unless using cloud GPU tier
        },
        estimatedImpact: 'Validate protocols before physical testing',
      })
    }

    return suggestions
  }

  /**
   * Check if workflow is ready for TEA analysis
   */
  private checkTEAReadiness(results: WorkflowResults): NextStepSuggestion | null {
    // TEA requires good research, experiments, and ideally simulations
    const hasGoodResearch = results.research.confidenceScore >= 70
    const hasExperiments = results.experiments.totalProtocols > 0
    const hasSimulations = results.simulations.totalRuns > 0
    const hasLowRisk =
      this.calculateAverageRisk(results.experiments.failureAnalyses) < 75

    // If all criteria met, suggest TEA
    if (hasGoodResearch && hasExperiments && (hasSimulations || hasLowRisk)) {
      return {
        type: 'generate_tea',
        priority: 'high',
        reason: 'Workflow results are comprehensive and ready for economic analysis',
        action: {
          label: 'Generate Full TEA Report',
          description:
            'Calculate LCOE, NPV, IRR, and create comprehensive techno-economic analysis',
          estimatedTime: 8,
          estimatedCost: 0,
        },
        estimatedImpact: 'Complete financial feasibility assessment',
      }
    }

    return null
  }

  /**
   * Calculate average risk score from failure analyses
   */
  private calculateAverageRisk(
    failureAnalyses: WorkflowResults['experiments']['failureAnalyses']
  ): number {
    if (failureAnalyses.length === 0) return 0

    const totalRisk = failureAnalyses.reduce((sum, analysis) => sum + analysis.riskScore, 0)
    return totalRisk / failureAnalyses.length
  }

  /**
   * Prioritize suggestions by importance
   */
  private prioritizeSuggestions(
    suggestions: NextStepSuggestion[]
  ): NextStepSuggestion[] {
    const priorityOrder = { high: 0, medium: 1, low: 2 }

    return suggestions.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff

      // If same priority, sort by estimated impact
      return (b.estimatedImpact?.length || 0) - (a.estimatedImpact?.length || 0)
    })
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const recommendationEngine = new RecommendationEngine()

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Quick check if workflow is ready for TEA
 */
export function isReadyForTEA(results: WorkflowResults): boolean {
  return (
    results.research.confidenceScore >= 70 &&
    results.experiments.totalProtocols > 0 &&
    (results.simulations.totalRuns > 0 ||
      recommendationEngine['calculateAverageRisk'](
        results.experiments.failureAnalyses
      ) < 75)
  )
}

/**
 * Get quick recommendation summary
 */
export function getQuickRecommendation(results: WorkflowResults): string {
  const suggestions = recommendationEngine.generateNextSteps(results)

  if (suggestions.length === 0) {
    return 'All workflow phases look good! Ready to proceed.'
  }

  const highPriority = suggestions.filter((s) => s.priority === 'high')
  if (highPriority.length > 0) {
    return `⚠️ ${highPriority.length} high-priority improvement${
      highPriority.length > 1 ? 's' : ''
    } suggested`
  }

  return `✓ Minor optimizations available (${suggestions.length} suggestions)`
}
