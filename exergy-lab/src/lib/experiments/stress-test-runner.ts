/**
 * Stress Test Runner for Discovery Engine
 *
 * Executes multiple test prompts through the Discovery Engine with:
 * - Parallel execution (2-3 concurrent discoveries)
 * - Timeout handling (5 min per discovery)
 * - Full SSE event capture
 * - Detailed result logging
 */

import { v4 as uuidv4 } from 'uuid'
import type {
  TestPrompt,
  ExperimentConfig,
  ExperimentResult,
  DiscoveryTestResult,
  ExperimentSummary,
  PhaseTestResult,
  SSEEventLog,
  ErrorLogEntry,
  TestStatus,
  DEFAULT_EXPERIMENT_CONFIG,
} from './types'
import { ALL_TEST_PROMPTS, getPromptsByCategory, getPromptsByIds } from './test-prompts'

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_CONFIG: ExperimentConfig = {
  prompts: ALL_TEST_PROMPTS,
  concurrency: 2,
  timeoutPerDiscovery: 5 * 60 * 1000, // 5 minutes
  captureFullLogs: true,
  stopOnCriticalFailure: false,
}

// =============================================================================
// Experiment Runner Class
// =============================================================================

export class StressTestRunner {
  private config: ExperimentConfig
  private results: DiscoveryTestResult[] = []
  private experimentId: string
  private startTime: number = 0
  private aborted: boolean = false
  private onProgress?: (progress: ExperimentProgress) => void

  constructor(config?: Partial<ExperimentConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.experimentId = `exp_${Date.now()}_${uuidv4().substring(0, 8)}`
  }

  /**
   * Set progress callback for real-time updates
   */
  setProgressCallback(callback: (progress: ExperimentProgress) => void) {
    this.onProgress = callback
  }

  /**
   * Run the full experiment
   */
  async run(): Promise<ExperimentResult> {
    this.startTime = Date.now()
    this.results = []
    this.aborted = false

    console.log(`\n${'='.repeat(60)}`)
    console.log(`[StressTest] Starting experiment: ${this.experimentId}`)
    console.log(`[StressTest] Total prompts: ${this.config.prompts.length}`)
    console.log(`[StressTest] Concurrency: ${this.config.concurrency}`)
    console.log(`[StressTest] Timeout per discovery: ${this.config.timeoutPerDiscovery / 1000}s`)
    console.log(`${'='.repeat(60)}\n`)

    // Create promise pool for parallel execution
    const prompts = [...this.config.prompts]
    const running: Promise<void>[] = []

    for (const prompt of prompts) {
      if (this.aborted) break

      // Wait if we're at max concurrency
      while (running.length >= this.config.concurrency) {
        await Promise.race(running)
        // Remove completed promises
        const stillRunning = running.filter(p => {
          const status = Reflect.get(p, '_status')
          return status !== 'completed'
        })
        running.length = 0
        running.push(...stillRunning)
      }

      // Start new discovery
      const promise = this.runSingleDiscovery(prompt)
        .then(() => {
          Reflect.set(promise, '_status', 'completed')
        })
        .catch((error) => {
          console.error(`[StressTest] Discovery ${prompt.id} crashed:`, error)
          Reflect.set(promise, '_status', 'completed')
        })

      running.push(promise)
      this.emitProgress()
    }

    // Wait for all remaining to complete
    await Promise.all(running)

    const endTime = Date.now()
    const summary = this.calculateSummary()

    const result: ExperimentResult = {
      experimentId: this.experimentId,
      name: this.config.name || `Stress Test ${new Date().toISOString()}`,
      config: this.config,
      startTime: this.startTime,
      endTime,
      totalDuration: endTime - this.startTime,
      status: this.aborted ? 'aborted' : 'completed',
      progress: {
        completed: this.results.length,
        total: this.config.prompts.length,
      },
      results: this.results,
      summary,
    }

    console.log(`\n${'='.repeat(60)}`)
    console.log(`[StressTest] Experiment completed: ${this.experimentId}`)
    console.log(`[StressTest] Duration: ${((endTime - this.startTime) / 1000 / 60).toFixed(1)} minutes`)
    console.log(`[StressTest] Success: ${summary.success}/${summary.totalPrompts} (${(summary.successRate * 100).toFixed(1)}%)`)
    console.log(`[StressTest] Partial: ${summary.partial}/${summary.totalPrompts}`)
    console.log(`[StressTest] Failed: ${summary.failed}/${summary.totalPrompts}`)
    console.log(`[StressTest] Timeout: ${summary.timeout}/${summary.totalPrompts}`)
    console.log(`${'='.repeat(60)}\n`)

    return result
  }

  /**
   * Abort the experiment
   */
  abort() {
    this.aborted = true
    console.log(`[StressTest] Experiment aborted: ${this.experimentId}`)
  }

  /**
   * Run a single discovery with full event capture
   */
  private async runSingleDiscovery(prompt: TestPrompt): Promise<DiscoveryTestResult> {
    const startTime = Date.now()
    const sseEvents: SSEEventLog[] = []
    const errors: ErrorLogEntry[] = []
    const phases: PhaseTestResult[] = []

    console.log(`\n[StressTest] Starting discovery ${prompt.id}: "${prompt.query.substring(0, 50)}..."`)

    let discoveryId = ''
    let status: TestStatus = 'error'
    let finalScore: number | undefined
    let qualityTier: string | undefined
    let rawResult: any

    try {
      // Start discovery via API
      const startResponse = await fetch(`${getBaseUrl()}/api/discovery/frontierscience`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: prompt.query,
          domain: prompt.expectedDomain || 'clean-energy',
          targetQuality: 'validated',
        }),
      })

      if (!startResponse.ok) {
        const errorText = await startResponse.text()
        throw new Error(`Failed to start discovery: ${startResponse.status} - ${errorText}`)
      }

      const startData = await startResponse.json()
      discoveryId = startData.discoveryId

      // Stream SSE events with timeout
      const { result: sseResult, timedOut } = await this.streamWithTimeout(
        discoveryId,
        sseEvents,
        phases,
        errors,
        this.config.timeoutPerDiscovery
      )

      if (timedOut) {
        status = 'timeout'
        errors.push({
          timestamp: Date.now(),
          message: `Discovery timed out after ${this.config.timeoutPerDiscovery / 1000}s`,
        })
      } else if (sseResult) {
        rawResult = sseResult
        finalScore = sseResult.overallScore
        qualityTier = sseResult.discoveryQuality

        // Determine status based on result
        if (sseResult.failureMode || sseResult.failedPhases?.length > 0) {
          status = 'partial'
        } else if (sseResult.overallScore >= 7) {
          status = 'success'
        } else if (sseResult.overallScore >= 5) {
          status = 'partial'
        } else {
          status = 'failed'
        }
      }
    } catch (error) {
      status = 'error'
      errors.push({
        timestamp: Date.now(),
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
    }

    const endTime = Date.now()
    const duration = endTime - startTime

    const result: DiscoveryTestResult = {
      promptId: prompt.id,
      prompt,
      discoveryId,
      status,
      startTime,
      endTime,
      duration,
      phases,
      errors,
      sseEvents: this.config.captureFullLogs ? sseEvents : [],
      finalScore,
      qualityTier: qualityTier as any,
      failureMode: rawResult?.failureMode || 'none',
      recoveryRecommendations: rawResult?.recoveryRecommendations,
      rawResult: this.config.captureFullLogs ? rawResult : undefined,
    }

    this.results.push(result)
    this.emitProgress()

    const statusEmoji = {
      success: '✅',
      partial: '⚠️',
      failed: '❌',
      timeout: '⏱️',
      error: '💥',
    }

    console.log(
      `[StressTest] ${statusEmoji[status]} Discovery ${prompt.id} completed: ` +
      `${status} (score: ${finalScore ?? 'N/A'}, duration: ${(duration / 1000).toFixed(1)}s)`
    )

    return result
  }

  /**
   * Stream SSE events with timeout
   */
  private async streamWithTimeout(
    discoveryId: string,
    sseEvents: SSEEventLog[],
    phases: PhaseTestResult[],
    errors: ErrorLogEntry[],
    timeout: number
  ): Promise<{ result: any | null; timedOut: boolean }> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve({ result: null, timedOut: true })
      }, timeout)

      const streamUrl = `${getBaseUrl()}/api/discovery/frontierscience?discoveryId=${discoveryId}&stream=true`

      fetch(streamUrl)
        .then(async (response) => {
          if (!response.ok || !response.body) {
            clearTimeout(timeoutId)
            resolve({ result: null, timedOut: false })
            return
          }

          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.substring(6))
                    sseEvents.push({
                      timestamp: Date.now(),
                      type: data.type,
                      phase: data.phase,
                      message: data.message,
                      data,
                    })

                    // Track phase results
                    if (data.type === 'progress' && data.status === 'completed') {
                      phases.push({
                        phase: data.phase,
                        status: 'passed',
                        score: data.score,
                        duration: data.durationMs || 0,
                      })
                    } else if (data.type === 'progress' && data.status === 'failed') {
                      phases.push({
                        phase: data.phase,
                        status: 'failed',
                        duration: data.durationMs || 0,
                        error: data.error,
                      })
                    } else if (data.type === 'phase_failed') {
                      phases.push({
                        phase: data.phase,
                        status: 'failed',
                        duration: 0,
                        error: data.error,
                      })
                    }

                    // Check for completion
                    if (data.type === 'complete' || data.type === 'partial_complete') {
                      clearTimeout(timeoutId)
                      resolve({ result: data.result, timedOut: false })
                      return
                    }

                    // Check for error
                    if (data.type === 'error') {
                      errors.push({
                        timestamp: Date.now(),
                        message: data.error || 'Unknown SSE error',
                      })
                      clearTimeout(timeoutId)
                      resolve({ result: null, timedOut: false })
                      return
                    }
                  } catch (parseError) {
                    // Ignore parse errors for partial data
                  }
                }
              }
            }
          } catch (streamError) {
            errors.push({
              timestamp: Date.now(),
              message: `Stream error: ${streamError}`,
            })
          }

          clearTimeout(timeoutId)
          resolve({ result: null, timedOut: false })
        })
        .catch((error) => {
          clearTimeout(timeoutId)
          errors.push({
            timestamp: Date.now(),
            message: `Fetch error: ${error.message}`,
          })
          resolve({ result: null, timedOut: false })
        })
    })
  }

  /**
   * Emit progress update
   */
  private emitProgress() {
    if (this.onProgress) {
      this.onProgress({
        experimentId: this.experimentId,
        completed: this.results.length,
        total: this.config.prompts.length,
        currentPrompts: this.getCurrentlyRunning(),
        elapsedMs: Date.now() - this.startTime,
      })
    }
  }

  /**
   * Get currently running prompts
   */
  private getCurrentlyRunning(): string[] {
    const completedIds = new Set(this.results.map(r => r.promptId))
    return this.config.prompts
      .filter(p => !completedIds.has(p.id))
      .slice(0, this.config.concurrency)
      .map(p => p.id)
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(): ExperimentSummary {
    const totalPrompts = this.results.length
    const success = this.results.filter(r => r.status === 'success').length
    const partial = this.results.filter(r => r.status === 'partial').length
    const failed = this.results.filter(r => r.status === 'failed').length
    const timeout = this.results.filter(r => r.status === 'timeout').length
    const error = this.results.filter(r => r.status === 'error').length

    const durations = this.results.map(r => r.duration)
    const scores = this.results.filter(r => r.finalScore !== undefined).map(r => r.finalScore!)

    // Phase stats
    const phaseStats: ExperimentSummary['phaseStats'] = {}
    for (const result of this.results) {
      for (const phase of result.phases) {
        if (!phaseStats[phase.phase]) {
          phaseStats[phase.phase] = {
            runs: 0,
            passed: 0,
            failed: 0,
            passRate: 0,
            avgScore: 0,
            avgDuration: 0,
          }
        }
        const stat = phaseStats[phase.phase]
        stat.runs++
        if (phase.status === 'passed') stat.passed++
        else stat.failed++
      }
    }

    // Calculate pass rates
    for (const key of Object.keys(phaseStats)) {
      const stat = phaseStats[key]
      stat.passRate = stat.runs > 0 ? stat.passed / stat.runs : 0
    }

    // Error categorization
    const errorsByType: ExperimentSummary['errorsByType'] = {}
    for (const result of this.results) {
      for (const err of result.errors) {
        const type = categorizeError(err.message)
        if (!errorsByType[type]) {
          errorsByType[type] = { count: 0, affectedPrompts: [] }
        }
        errorsByType[type].count++
        if (!errorsByType[type].affectedPrompts.includes(result.promptId)) {
          errorsByType[type].affectedPrompts.push(result.promptId)
        }
      }
    }

    // Category stats
    const categoryStats: ExperimentSummary['categoryStats'] = {
      basic: { total: 0, success: 0, successRate: 0, avgScore: 0 },
      standard: { total: 0, success: 0, successRate: 0, avgScore: 0 },
      technical: { total: 0, success: 0, successRate: 0, avgScore: 0 },
      edge: { total: 0, success: 0, successRate: 0, avgScore: 0 },
      domain: { total: 0, success: 0, successRate: 0, avgScore: 0 },
    }

    for (const result of this.results) {
      const cat = result.prompt.category
      categoryStats[cat].total++
      if (result.status === 'success') categoryStats[cat].success++
    }

    for (const cat of Object.keys(categoryStats) as Array<keyof typeof categoryStats>) {
      const stat = categoryStats[cat]
      stat.successRate = stat.total > 0 ? stat.success / stat.total : 0
    }

    return {
      totalPrompts,
      completed: totalPrompts,
      success,
      partial,
      failed,
      timeout,
      error,
      successRate: totalPrompts > 0 ? success / totalPrompts : 0,
      partialSuccessRate: totalPrompts > 0 ? partial / totalPrompts : 0,
      failureRate: totalPrompts > 0 ? failed / totalPrompts : 0,
      timeoutRate: totalPrompts > 0 ? timeout / totalPrompts : 0,
      avgDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      minDuration: durations.length > 0 ? Math.min(...durations) : 0,
      maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
      totalDuration: Date.now() - this.startTime,
      avgScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      phaseStats,
      errorsByType,
      categoryStats,
    }
  }
}

// =============================================================================
// Helper Types & Functions
// =============================================================================

export interface ExperimentProgress {
  experimentId: string
  completed: number
  total: number
  currentPrompts: string[]
  elapsedMs: number
}

/**
 * Categorize error message into type
 */
function categorizeError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('timeout')) return 'timeout'
  if (lower.includes('network') || lower.includes('fetch')) return 'network'
  if (lower.includes('parse') || lower.includes('json')) return 'parse'
  if (lower.includes('validation') || lower.includes('invalid')) return 'validation'
  if (lower.includes('api') || lower.includes('rate')) return 'api'
  return 'unknown'
}

/**
 * Get base URL for API calls
 */
function getBaseUrl(): string {
  // In server context, use localhost
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

// =============================================================================
// Quick Run Functions
// =============================================================================

/**
 * Run quick test (5 prompts, one per category)
 */
export async function runQuickTest(): Promise<ExperimentResult> {
  const { getQuickTestSet } = await import('./test-prompts')
  const runner = new StressTestRunner({
    name: 'Quick Test',
    prompts: getQuickTestSet(),
    concurrency: 2,
    timeoutPerDiscovery: 3 * 60 * 1000, // 3 min for quick test
  })
  return runner.run()
}

/**
 * Run category-specific test
 */
export async function runCategoryTest(
  category: 'basic' | 'standard' | 'technical' | 'edge' | 'domain'
): Promise<ExperimentResult> {
  const prompts = getPromptsByCategory(category)
  const runner = new StressTestRunner({
    name: `Category Test: ${category}`,
    prompts,
    concurrency: 2,
  })
  return runner.run()
}

/**
 * Run specific prompts by ID
 */
export async function runSpecificPrompts(ids: string[]): Promise<ExperimentResult> {
  const prompts = getPromptsByIds(ids)
  const runner = new StressTestRunner({
    name: `Specific Prompts: ${ids.join(', ')}`,
    prompts,
    concurrency: Math.min(prompts.length, 2),
  })
  return runner.run()
}

/**
 * Run full stress test (all 25 prompts)
 */
export async function runFullStressTest(): Promise<ExperimentResult> {
  const runner = new StressTestRunner({
    name: 'Full Stress Test',
    prompts: ALL_TEST_PROMPTS,
    concurrency: 2,
    timeoutPerDiscovery: 5 * 60 * 1000,
  })
  return runner.run()
}

export { StressTestRunner as default }
