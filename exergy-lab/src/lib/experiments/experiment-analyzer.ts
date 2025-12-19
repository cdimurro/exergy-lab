/**
 * Experiment Analyzer
 *
 * Bulk analysis utilities for stress test results:
 * - Statistical analysis
 * - Pattern detection
 * - Error categorization
 * - Issue prioritization
 * - Correlation analysis
 */

import type {
  ExperimentResult,
  DiscoveryTestResult,
  BulkAnalysis,
  CorrelationData,
  Issue,
  PromptCategory,
} from './types'

// =============================================================================
// Main Analyzer Class
// =============================================================================

export class ExperimentAnalyzer {
  private result: ExperimentResult

  constructor(result: ExperimentResult) {
    this.result = result
  }

  /**
   * Run full bulk analysis
   */
  analyze(): BulkAnalysis {
    const summary = this.result.summary!

    return {
      experimentId: this.result.experimentId,
      analyzedAt: Date.now(),

      // Overall Statistics
      totalRuns: summary.totalPrompts,
      successRate: summary.successRate,
      partialSuccessRate: summary.partialSuccessRate,
      failureRate: summary.failureRate,
      timeoutRate: summary.timeoutRate,
      avgDuration: summary.avgDuration,

      // Phase Analysis
      phaseAnalysis: this.analyzePhases(),

      // Error Categorization
      errorCategories: this.categorizeErrors(),

      // Pattern Detection
      patterns: {
        queryLengthVsSuccess: this.analyzeQueryLengthCorrelation(),
        difficultyVsTimeout: this.analyzeDifficultyTimeoutCorrelation(),
        categoryPerformance: this.analyzeCategoryPerformance(),
      },

      // Prioritized Issues
      issues: this.identifyIssues(),

      // AI-Ready Export
      aiAnalysisPrompt: this.generateAiPromptSummary(),
    }
  }

  /**
   * Analyze phase performance
   */
  private analyzePhases(): BulkAnalysis['phaseAnalysis'] {
    const phaseData: Record<string, {
      passed: number
      failed: number
      scores: number[]
      durations: number[]
      errors: string[]
    }> = {}

    for (const result of this.result.results) {
      for (const phase of result.phases) {
        if (!phaseData[phase.phase]) {
          phaseData[phase.phase] = {
            passed: 0,
            failed: 0,
            scores: [],
            durations: [],
            errors: [],
          }
        }

        const data = phaseData[phase.phase]
        if (phase.status === 'passed') {
          data.passed++
        } else {
          data.failed++
          if (phase.error) {
            data.errors.push(phase.error)
          }
        }

        if (phase.score !== undefined) {
          data.scores.push(phase.score)
        }
        data.durations.push(phase.duration)
      }
    }

    const analysis: BulkAnalysis['phaseAnalysis'] = {}

    for (const [phase, data] of Object.entries(phaseData)) {
      const total = data.passed + data.failed
      const avgScore = data.scores.length > 0
        ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
        : 0
      const avgDuration = data.durations.length > 0
        ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length
        : 0

      // Find most common errors
      const errorCounts = new Map<string, number>()
      for (const err of data.errors) {
        const normalized = normalizeError(err)
        errorCounts.set(normalized, (errorCounts.get(normalized) || 0) + 1)
      }

      const commonFailures = Array.from(errorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([err]) => err)

      // Identify bottleneck phases (low pass rate or high duration)
      const passRate = total > 0 ? data.passed / total : 0
      const isBottleneck = passRate < 0.7 || avgDuration > 60000 // Less than 70% pass or >60s

      analysis[phase] = {
        passRate,
        avgScore,
        avgDuration,
        commonFailures,
        bottleneck: isBottleneck,
      }
    }

    return analysis
  }

  /**
   * Categorize errors by type
   */
  private categorizeErrors(): BulkAnalysis['errorCategories'] {
    const categories: BulkAnalysis['errorCategories'] = {
      apiTimeout: { count: 0, prompts: [] },
      validationFailure: { count: 0, prompts: [] },
      lowScore: { count: 0, prompts: [] },
      networkError: { count: 0, prompts: [] },
      parseError: { count: 0, prompts: [] },
      unknown: { count: 0, prompts: [] },
    }

    for (const result of this.result.results) {
      // Check for timeout
      if (result.status === 'timeout') {
        categories.apiTimeout.count++
        categories.apiTimeout.prompts.push(result.promptId)
      }

      // Check for low score
      if (result.finalScore !== undefined && result.finalScore < 5) {
        categories.lowScore.count++
        categories.lowScore.prompts.push(result.promptId)
      }

      // Categorize errors
      for (const error of result.errors) {
        const msg = error.message.toLowerCase()

        if (msg.includes('timeout')) {
          categories.apiTimeout.count++
          if (!categories.apiTimeout.prompts.includes(result.promptId)) {
            categories.apiTimeout.prompts.push(result.promptId)
          }
        } else if (msg.includes('validation') || msg.includes('invalid')) {
          categories.validationFailure.count++
          if (!categories.validationFailure.prompts.includes(result.promptId)) {
            categories.validationFailure.prompts.push(result.promptId)
          }
        } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection')) {
          categories.networkError.count++
          if (!categories.networkError.prompts.includes(result.promptId)) {
            categories.networkError.prompts.push(result.promptId)
          }
        } else if (msg.includes('parse') || msg.includes('json') || msg.includes('syntax')) {
          categories.parseError.count++
          if (!categories.parseError.prompts.includes(result.promptId)) {
            categories.parseError.prompts.push(result.promptId)
          }
        } else {
          categories.unknown.count++
          if (!categories.unknown.prompts.includes(result.promptId)) {
            categories.unknown.prompts.push(result.promptId)
          }
        }
      }
    }

    return categories
  }

  /**
   * Analyze correlation between query length and success
   */
  private analyzeQueryLengthCorrelation(): CorrelationData {
    const data = this.result.results.map(r => ({
      length: r.prompt.query.length,
      success: r.status === 'success' ? 1 : 0,
    }))

    return this.calculateCorrelation(
      data.map(d => d.length),
      data.map(d => d.success)
    )
  }

  /**
   * Analyze correlation between difficulty and timeout
   */
  private analyzeDifficultyTimeoutCorrelation(): CorrelationData {
    const data = this.result.results.map(r => ({
      difficulty: r.prompt.difficultyLevel,
      timeout: r.status === 'timeout' ? 1 : 0,
    }))

    return this.calculateCorrelation(
      data.map(d => d.difficulty),
      data.map(d => d.timeout)
    )
  }

  /**
   * Analyze performance by category
   */
  private analyzeCategoryPerformance(): Record<PromptCategory, number> {
    const categories: PromptCategory[] = ['basic', 'standard', 'technical', 'edge', 'domain']
    const performance: Record<string, number> = {}

    for (const cat of categories) {
      const catResults = this.result.results.filter(r => r.prompt.category === cat)
      const successCount = catResults.filter(r => r.status === 'success').length
      performance[cat] = catResults.length > 0 ? successCount / catResults.length : 0
    }

    return performance as Record<PromptCategory, number>
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private calculateCorrelation(x: number[], y: number[]): CorrelationData {
    if (x.length !== y.length || x.length < 3) {
      return { correlation: 0, sampleSize: x.length, significant: false }
    }

    const n = x.length
    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = y.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0)
    const sumX2 = x.reduce((a, b) => a + b * b, 0)
    const sumY2 = y.reduce((a, b) => a + b * b, 0)

    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

    const correlation = denominator === 0 ? 0 : numerator / denominator

    // Simple significance test: |r| > 0.5 with n > 10
    const significant = Math.abs(correlation) > 0.5 && n > 10

    return { correlation, sampleSize: n, significant }
  }

  /**
   * Identify and prioritize issues
   */
  private identifyIssues(): Issue[] {
    const issues: Issue[] = []
    const summary = this.result.summary!

    // Critical: High timeout rate
    if (summary.timeoutRate > 0.3) {
      issues.push({
        id: 'high-timeout-rate',
        severity: 'critical',
        category: 'performance',
        description: `High timeout rate: ${(summary.timeoutRate * 100).toFixed(1)}% of discoveries timeout`,
        affectedPrompts: this.result.results
          .filter(r => r.status === 'timeout')
          .map(r => r.promptId),
        occurrences: summary.timeout,
        suggestedFix: 'Increase timeout or optimize long-running phases',
      })
    }

    // Critical: High failure rate
    if (summary.failureRate > 0.2) {
      issues.push({
        id: 'high-failure-rate',
        severity: 'critical',
        category: 'reliability',
        description: `High failure rate: ${(summary.failureRate * 100).toFixed(1)}% of discoveries fail completely`,
        affectedPrompts: this.result.results
          .filter(r => r.status === 'failed' || r.status === 'error')
          .map(r => r.promptId),
        occurrences: summary.failed + summary.error,
        suggestedFix: 'Investigate common failure patterns and add error handling',
      })
    }

    // High: Phase bottlenecks
    const phaseAnalysis = this.analyzePhases()
    for (const [phase, data] of Object.entries(phaseAnalysis)) {
      if (data.bottleneck) {
        issues.push({
          id: `bottleneck-${phase}`,
          severity: 'high',
          category: 'phase-performance',
          description: `Phase "${phase}" is a bottleneck: ${(data.passRate * 100).toFixed(1)}% pass rate, ${(data.avgDuration / 1000).toFixed(1)}s avg duration`,
          affectedPrompts: this.result.results
            .filter(r => r.phases.some(p => p.phase === phase && p.status === 'failed'))
            .map(r => r.promptId),
          occurrences: Math.round(this.result.results.length * (1 - data.passRate)),
          suggestedFix: `Investigate ${phase} phase failures: ${data.commonFailures.join(', ')}`,
        })
      }
    }

    // Medium: Low scores for basic queries
    const basicResults = this.result.results.filter(r => r.prompt.category === 'basic')
    const basicSuccessRate = basicResults.length > 0
      ? basicResults.filter(r => r.status === 'success').length / basicResults.length
      : 1
    if (basicSuccessRate < 0.6) {
      issues.push({
        id: 'basic-queries-failing',
        severity: 'medium',
        category: 'input-handling',
        description: `Basic/vague queries have low success rate: ${(basicSuccessRate * 100).toFixed(1)}%`,
        affectedPrompts: basicResults
          .filter(r => r.status !== 'success')
          .map(r => r.promptId),
        occurrences: basicResults.filter(r => r.status !== 'success').length,
        suggestedFix: 'Improve query preprocessing and clarification prompts',
      })
    }

    // Medium: Edge cases failing
    const edgeResults = this.result.results.filter(r => r.prompt.category === 'edge')
    const edgeSuccessRate = edgeResults.length > 0
      ? edgeResults.filter(r => r.status === 'success').length / edgeResults.length
      : 1
    if (edgeSuccessRate < 0.4) {
      issues.push({
        id: 'edge-cases-failing',
        severity: 'medium',
        category: 'robustness',
        description: `Edge case queries have low success rate: ${(edgeSuccessRate * 100).toFixed(1)}%`,
        affectedPrompts: edgeResults
          .filter(r => r.status !== 'success')
          .map(r => r.promptId),
        occurrences: edgeResults.filter(r => r.status !== 'success').length,
        suggestedFix: 'Add special handling for long queries, special characters, and numeric-heavy inputs',
      })
    }

    // Low: Long average duration
    if (summary.avgDuration > 180000) { // 3 minutes
      issues.push({
        id: 'long-average-duration',
        severity: 'low',
        category: 'performance',
        description: `Average discovery duration is high: ${(summary.avgDuration / 1000 / 60).toFixed(1)} minutes`,
        affectedPrompts: this.result.results
          .filter(r => r.duration > summary.avgDuration)
          .map(r => r.promptId),
        occurrences: this.result.results.filter(r => r.duration > summary.avgDuration).length,
        suggestedFix: 'Consider caching, parallel phase execution, or reducing iteration limits',
      })
    }

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    return issues
  }

  /**
   * Generate AI analysis prompt summary
   */
  private generateAiPromptSummary(): string {
    const issues = this.identifyIssues()
    const summary = this.result.summary!

    return `Analyze Discovery Engine stress test:
- ${summary.totalPrompts} prompts, ${(summary.successRate * 100).toFixed(1)}% success
- ${issues.filter(i => i.severity === 'critical').length} critical issues
- ${issues.filter(i => i.severity === 'high').length} high-priority issues
- Top issues: ${issues.slice(0, 3).map(i => i.description).join('; ')}

See full analysis for details.`
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Normalize error messages for grouping
 */
function normalizeError(error: string): string {
  // Remove specific values like IDs, numbers, etc.
  return error
    .replace(/\d+/g, 'N')
    .replace(/[a-f0-9]{8,}/gi, 'ID')
    .substring(0, 100)
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Analyze multiple experiments for trends
 */
export function analyzeExperimentTrends(results: ExperimentResult[]): {
  improvingMetrics: string[]
  decliningMetrics: string[]
  stableMetrics: string[]
  overallTrend: 'improving' | 'declining' | 'stable'
} {
  if (results.length < 2) {
    return {
      improvingMetrics: [],
      decliningMetrics: [],
      stableMetrics: ['insufficient data'],
      overallTrend: 'stable',
    }
  }

  // Sort by start time
  const sorted = [...results].sort((a, b) => a.startTime - b.startTime)

  // Compare first and last
  const first = sorted[0].summary!
  const last = sorted[sorted.length - 1].summary!

  const improving: string[] = []
  const declining: string[] = []
  const stable: string[] = []

  // Compare success rate
  const successDiff = last.successRate - first.successRate
  if (successDiff > 0.1) improving.push('successRate')
  else if (successDiff < -0.1) declining.push('successRate')
  else stable.push('successRate')

  // Compare timeout rate
  const timeoutDiff = last.timeoutRate - first.timeoutRate
  if (timeoutDiff < -0.1) improving.push('timeoutRate')
  else if (timeoutDiff > 0.1) declining.push('timeoutRate')
  else stable.push('timeoutRate')

  // Compare avg duration
  const durationDiff = (last.avgDuration - first.avgDuration) / first.avgDuration
  if (durationDiff < -0.2) improving.push('avgDuration')
  else if (durationDiff > 0.2) declining.push('avgDuration')
  else stable.push('avgDuration')

  // Determine overall trend
  let overallTrend: 'improving' | 'declining' | 'stable' = 'stable'
  if (improving.length > declining.length) overallTrend = 'improving'
  else if (declining.length > improving.length) overallTrend = 'declining'

  return {
    improvingMetrics: improving,
    decliningMetrics: declining,
    stableMetrics: stable,
    overallTrend,
  }
}

/**
 * Compare two experiments
 */
export function compareExperiments(
  baseline: ExperimentResult,
  current: ExperimentResult
): {
  successRateDelta: number
  timeoutRateDelta: number
  avgDurationDelta: number
  improvedPrompts: string[]
  degradedPrompts: string[]
} {
  const baselineSummary = baseline.summary!
  const currentSummary = current.summary!

  // Find matching prompts
  const baselineMap = new Map(baseline.results.map(r => [r.promptId, r]))
  const currentMap = new Map(current.results.map(r => [r.promptId, r]))

  const improved: string[] = []
  const degraded: string[] = []

  for (const [id, curr] of currentMap) {
    const base = baselineMap.get(id)
    if (!base) continue

    const currSuccess = curr.status === 'success'
    const baseSuccess = base.status === 'success'

    if (currSuccess && !baseSuccess) improved.push(id)
    else if (!currSuccess && baseSuccess) degraded.push(id)
  }

  return {
    successRateDelta: currentSummary.successRate - baselineSummary.successRate,
    timeoutRateDelta: currentSummary.timeoutRate - baselineSummary.timeoutRate,
    avgDurationDelta: currentSummary.avgDuration - baselineSummary.avgDuration,
    improvedPrompts: improved,
    degradedPrompts: degraded,
  }
}

export { ExperimentAnalyzer as default }
