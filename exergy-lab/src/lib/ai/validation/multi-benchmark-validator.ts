/**
 * Multi-Benchmark Validation Orchestrator
 *
 * Orchestrates 5 complementary validation benchmarks:
 * 1. FrontierScience (0.30 weight) - Existing rubric system
 * 2. Domain-specific (0.25 weight) - Physics/chemistry/engineering
 * 3. Practicality (0.20 weight) - Real-world feasibility
 * 4. Literature (0.15 weight) - Published research consistency
 * 5. Simulation Convergence (0.10 weight) - Numerical validation
 *
 * Features confidence-weighted aggregation per Grok feedback:
 * - Low-confidence benchmarks automatically downweighted
 * - Discrepancy detection between benchmarks
 * - Agreement level indicator
 */

import type {
  BenchmarkType,
  BenchmarkResult,
  AggregatedValidation,
  AgreementLevel,
  Discrepancy,
  ValidationRecommendation,
  ConfidenceBreakdown,
  MultiBenchmarkConfig,
  LiteratureSource,
} from './types'
import {
  DEFAULT_BENCHMARK_WEIGHTS,
  DEFAULT_MULTI_BENCHMARK_CONFIG,
  calculateAgreementLevel,
  findDiscrepancies,
  categorizeItem,
} from './types'

import { DomainBenchmarkValidator } from './domain-benchmark'
import { PracticalityBenchmarkValidator } from './practicality-benchmark'
import { LiteratureBenchmarkValidator } from './literature-benchmark'
import { ConvergenceBenchmarkValidator } from './convergence-benchmark'
import { diagnosticLogger } from '../../diagnostics/diagnostic-logger'

// ============================================================================
// Multi-Benchmark Validator
// ============================================================================

export interface ValidationContext {
  sources?: LiteratureSource[]
  simulationOutput?: any
  hypothesisOutput?: any
  researchOutput?: any
  existingRubricResult?: BenchmarkResult
}

export class MultiBenchmarkValidator {
  private config: MultiBenchmarkConfig
  private domainValidator: DomainBenchmarkValidator
  private practicalityValidator: PracticalityBenchmarkValidator
  private literatureValidator: LiteratureBenchmarkValidator
  private convergenceValidator: ConvergenceBenchmarkValidator

  constructor(config: Partial<MultiBenchmarkConfig> = {}) {
    this.config = { ...DEFAULT_MULTI_BENCHMARK_CONFIG, ...config }
    this.domainValidator = new DomainBenchmarkValidator()
    this.practicalityValidator = new PracticalityBenchmarkValidator()
    this.literatureValidator = new LiteratureBenchmarkValidator()
    this.convergenceValidator = new ConvergenceBenchmarkValidator()
  }

  /**
   * Run all enabled benchmarks and aggregate results
   */
  async validate(
    discoveryOutput: any,
    context: ValidationContext
  ): Promise<AggregatedValidation> {
    const startTime = Date.now()

    // Build list of benchmark promises
    const benchmarkPromises: Array<Promise<BenchmarkResult>> = []
    const benchmarkNames: BenchmarkType[] = []

    for (const benchmarkType of this.config.enabledBenchmarks) {
      const promise = this.runBenchmark(benchmarkType, discoveryOutput, context)
      benchmarkPromises.push(promise)
      benchmarkNames.push(benchmarkType)
    }

    // Run benchmarks (parallel or sequential based on config)
    let benchmarkResults: BenchmarkResult[]

    if (this.config.parallelExecution) {
      const settledResults = await Promise.allSettled(benchmarkPromises)
      benchmarkResults = settledResults
        .filter((r): r is PromiseFulfilledResult<BenchmarkResult> =>
          r.status === 'fulfilled'
        )
        .map(r => r.value)

      // Log any failures
      settledResults.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`Benchmark ${benchmarkNames[i]} failed:`, r.reason)
        }
      })
    } else {
      benchmarkResults = []
      for (const promise of benchmarkPromises) {
        try {
          benchmarkResults.push(await promise)
        } catch (error) {
          console.error('Benchmark failed:', error)
        }
      }
    }

    // Filter by minimum confidence
    const filteredBenchmarks = benchmarkResults.filter(
      b => b.confidence >= this.config.minConfidence
    )

    // Aggregate results
    const aggregated = this.aggregateResults(filteredBenchmarks)

    // Log diagnostics
    diagnosticLogger.logBenchmarkResult({
      benchmarkType: 'frontierscience', // Using valid type for aggregated results
      items: [],
      aggregatedScore: aggregated.overallScore,
      maxScore: 10,
      passed: aggregated.overallPassed,
      confidence: this.calculateOverallConfidence(filteredBenchmarks),
      weight: 1.0,
      effectiveWeight: 1.0,
      discrepancies: aggregated.discrepancies.map(d =>
        `${d.benchmarks[0]} vs ${d.benchmarks[1]}: ${d.possibleCause}`
      ),
      evaluationDurationMs: Date.now() - startTime,
    })

    return aggregated
  }

  /**
   * Run a single benchmark
   */
  private async runBenchmark(
    benchmarkType: BenchmarkType,
    discoveryOutput: any,
    context: ValidationContext
  ): Promise<BenchmarkResult> {
    switch (benchmarkType) {
      case 'frontierscience':
        // Use existing rubric result if provided
        if (context.existingRubricResult) {
          return context.existingRubricResult
        }
        // Otherwise return a placeholder
        return this.createPlaceholderResult('frontierscience', 0.30)

      case 'domain_specific':
        return this.domainValidator.validate(discoveryOutput)

      case 'practicality':
        return this.practicalityValidator.validate(discoveryOutput)

      case 'literature':
        return this.literatureValidator.validate(
          discoveryOutput,
          context.sources || []
        )

      case 'simulation_convergence':
        return this.convergenceValidator.validate(
          context.simulationOutput || discoveryOutput?.simulation
        )

      default:
        throw new Error(`Unknown benchmark type: ${benchmarkType}`)
    }
  }

  /**
   * Aggregate benchmark results with confidence-weighted scoring
   */
  private aggregateResults(benchmarks: BenchmarkResult[]): AggregatedValidation {
    if (benchmarks.length === 0) {
      return {
        overallScore: 0,
        overallPassed: false,
        benchmarks: [],
        agreementLevel: 'low',
        discrepancies: [],
        recommendations: [{
          priority: 'high',
          category: 'completeness',
          issue: 'No benchmarks completed',
          suggestion: 'Ensure at least one validation benchmark runs successfully',
          relatedBenchmarks: [],
        }],
        confidenceBreakdown: [],
      }
    }

    // Calculate confidence-weighted score
    let weightedSum = 0
    let totalWeight = 0
    const confidenceBreakdown: ConfidenceBreakdown[] = []

    for (const benchmark of benchmarks) {
      const baseWeight = this.getWeight(benchmark.benchmarkType)
      // Confidence-adjusted weight: low confidence reduces influence
      const effectiveWeight = baseWeight * benchmark.confidence

      const normalizedScore = benchmark.score / benchmark.maxScore
      weightedSum += normalizedScore * effectiveWeight
      totalWeight += effectiveWeight

      confidenceBreakdown.push({
        benchmark: benchmark.benchmarkType,
        baseWeight,
        confidence: benchmark.confidence,
        effectiveWeight,
      })
    }

    const overallScore = totalWeight > 0 ? (weightedSum / totalWeight) * 10 : 0

    // Check if all required benchmarks passed (if configured)
    let overallPassed = overallScore >= 7.0
    if (this.config.failOnAnyBenchmark) {
      overallPassed = overallPassed && benchmarks.every(b => b.passed)
    }

    // Calculate agreement level
    const agreementLevel = calculateAgreementLevel(benchmarks)

    // Find discrepancies
    const discrepancies = findDiscrepancies(benchmarks)

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      benchmarks,
      discrepancies,
      agreementLevel
    )

    return {
      overallScore,
      overallPassed,
      benchmarks,
      agreementLevel,
      discrepancies,
      recommendations,
      confidenceBreakdown,
    }
  }

  /**
   * Get weight for benchmark type
   */
  private getWeight(benchmarkType: BenchmarkType): number {
    if (this.config.weights?.[benchmarkType] !== undefined) {
      return this.config.weights[benchmarkType]!
    }
    return DEFAULT_BENCHMARK_WEIGHTS[benchmarkType] || 0.1
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(benchmarks: BenchmarkResult[]): number {
    if (benchmarks.length === 0) return 0

    const totalConfidence = benchmarks.reduce((sum, b) => sum + b.confidence, 0)
    return totalConfidence / benchmarks.length
  }

  /**
   * Generate recommendations based on benchmark results
   */
  private generateRecommendations(
    benchmarks: BenchmarkResult[],
    discrepancies: Discrepancy[],
    agreementLevel: AgreementLevel
  ): ValidationRecommendation[] {
    const recommendations: ValidationRecommendation[] = []

    // Add recommendations for failed benchmarks
    for (const benchmark of benchmarks) {
      if (!benchmark.passed) {
        const failedItems = benchmark.items.filter(i => !i.passed)

        for (const item of failedItems.slice(0, 2)) { // Top 2 issues per benchmark
          recommendations.push({
            priority: item.score === 0 ? 'high' : 'medium',
            category: categorizeItem(item.id),
            issue: item.reasoning,
            suggestion: item.suggestions?.[0] || `Improve ${item.name}`,
            relatedBenchmarks: [benchmark.benchmarkType],
            relatedItems: [item.id],
          })
        }
      }
    }

    // Add recommendations for discrepancies
    for (const discrepancy of discrepancies) {
      recommendations.push({
        priority: discrepancy.scoreDifference > 0.4 ? 'high' : 'medium',
        category: 'accuracy',
        issue: `Disagreement between ${discrepancy.benchmarks[0]} and ${discrepancy.benchmarks[1]}`,
        suggestion: discrepancy.possibleCause,
        relatedBenchmarks: discrepancy.benchmarks,
      })
    }

    // Add recommendation for low agreement
    if (agreementLevel === 'low') {
      recommendations.push({
        priority: 'medium',
        category: 'accuracy',
        issue: 'Low agreement between validation benchmarks',
        suggestion: 'Review discovery for consistency across different validation criteria',
        relatedBenchmarks: benchmarks.map(b => b.benchmarkType),
      })
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    return recommendations.slice(0, 10) // Limit to top 10
  }

  /**
   * Create placeholder result for benchmarks not run
   */
  private createPlaceholderResult(
    benchmarkType: BenchmarkType,
    weight: number
  ): BenchmarkResult {
    return {
      benchmarkType,
      score: 0,
      maxScore: 10,
      passed: false,
      weight,
      confidence: 0,
      items: [],
      metadata: {
        evaluationTimeMs: 0,
        version: '1.0.0',
        checksRun: 0,
        checksSkipped: 1,
      },
    }
  }

  /**
   * Get benchmark summary for display
   */
  getBenchmarkSummary(result: AggregatedValidation): {
    score: number
    passed: boolean
    agreementEmoji: string
    benchmarkCount: number
    topIssues: string[]
  } {
    const agreementEmoji = {
      high: '✅',
      moderate: '⚠️',
      low: '❌',
    }[result.agreementLevel]

    return {
      score: result.overallScore,
      passed: result.overallPassed,
      agreementEmoji,
      benchmarkCount: result.benchmarks.length,
      topIssues: result.recommendations
        .filter(r => r.priority === 'high')
        .slice(0, 3)
        .map(r => r.issue),
    }
  }
}

// ============================================================================
// Export singleton and factory
// ============================================================================

export const multiBenchmarkValidator = new MultiBenchmarkValidator()

export function createMultiBenchmarkValidator(
  config?: Partial<MultiBenchmarkConfig>
): MultiBenchmarkValidator {
  return new MultiBenchmarkValidator(config)
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Quick validation with default settings
 */
export async function validateDiscovery(
  discoveryOutput: any,
  context: ValidationContext
): Promise<AggregatedValidation> {
  return multiBenchmarkValidator.validate(discoveryOutput, context)
}

/**
 * Run only specific benchmarks
 */
export async function validateWithBenchmarks(
  discoveryOutput: any,
  context: ValidationContext,
  benchmarks: BenchmarkType[]
): Promise<AggregatedValidation> {
  const validator = new MultiBenchmarkValidator({
    enabledBenchmarks: benchmarks,
  })
  return validator.validate(discoveryOutput, context)
}

/**
 * Get formatted validation report
 */
export function formatValidationReport(result: AggregatedValidation): string {
  const lines: string[] = []

  lines.push(`## Validation Report`)
  lines.push(``)
  lines.push(`**Overall Score:** ${result.overallScore.toFixed(1)}/10 (${result.overallPassed ? 'PASSED' : 'FAILED'})`)
  lines.push(`**Agreement Level:** ${result.agreementLevel}`)
  lines.push(``)

  lines.push(`### Benchmark Results`)
  for (const benchmark of result.benchmarks) {
    const status = benchmark.passed ? '✅' : '❌'
    lines.push(`- ${status} **${benchmark.benchmarkType}**: ${benchmark.score.toFixed(1)}/10 (conf: ${Math.round(benchmark.confidence * 100)}%)`)
  }

  if (result.discrepancies.length > 0) {
    lines.push(``)
    lines.push(`### Discrepancies`)
    for (const d of result.discrepancies) {
      lines.push(`- ${d.benchmarks[0]} vs ${d.benchmarks[1]}: ${d.possibleCause}`)
    }
  }

  if (result.recommendations.length > 0) {
    lines.push(``)
    lines.push(`### Recommendations`)
    for (const rec of result.recommendations.slice(0, 5)) {
      const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢'
      lines.push(`- ${priority} **${rec.issue}**: ${rec.suggestion}`)
    }
  }

  return lines.join('\n')
}
