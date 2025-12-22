/**
 * AI Call Batch Executor
 *
 * Batches multiple LLM calls to reduce overhead and token usage.
 * Combines similar prompts with shared system prompts and disperses results.
 *
 * @see model-router.ts - Uses this for optimized AI calls
 * @see discovery-orchestrator.ts - Batch evaluation calls
 */

import { aiRouter, AITask, getTokenBudget } from './model-router'

// ============================================================================
// Types
// ============================================================================

export interface BatchedCall {
  id: string
  task: AITask
  prompt: string
  systemPrompt?: string
  options?: {
    temperature?: number
    maxTokens?: number
    model?: 'fast' | 'quality'
  }
  priority: 'critical' | 'high' | 'normal' | 'low'
  callback?: (result: string, error?: Error) => void
}

export interface BatchResult {
  id: string
  result?: string
  error?: Error
  tokensUsed?: number
  executionTimeMs: number
}

export interface BatchExecutorConfig {
  maxBatchSize: number
  maxWaitTimeMs: number
  maxTokensPerBatch: number
  enableLogging: boolean
  deduplication: boolean
}

export const DEFAULT_BATCH_CONFIG: BatchExecutorConfig = {
  maxBatchSize: 10,
  maxWaitTimeMs: 100,
  maxTokensPerBatch: 50000,
  enableLogging: true,
  deduplication: true,
}

interface PendingBatch {
  calls: BatchedCall[]
  timer: ReturnType<typeof setTimeout> | null
  sharedSystemPrompts: Map<string, string[]> // System prompt -> call IDs
}

// ============================================================================
// Batch Executor Class
// ============================================================================

export class AICallBatchExecutor {
  private config: BatchExecutorConfig
  private pendingBatches: Map<AITask, PendingBatch> = new Map()
  private promptCache: Map<string, { result: string; timestamp: number }> = new Map()
  private cacheHits: number = 0
  private totalCalls: number = 0

  constructor(config: Partial<BatchExecutorConfig> = {}) {
    this.config = { ...DEFAULT_BATCH_CONFIG, ...config }
  }

  /**
   * Submit a call to be batched
   */
  async submit(call: Omit<BatchedCall, 'id'>): Promise<string> {
    this.totalCalls++
    const id = this.generateCallId()
    const fullCall: BatchedCall = { ...call, id }

    // Check cache first (deduplication)
    if (this.config.deduplication) {
      const cacheKey = this.getCacheKey(call)
      const cached = this.promptCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 min TTL
        this.cacheHits++
        if (this.config.enableLogging) {
          console.log(`[BatchExecutor] Cache hit (${this.cacheHits}/${this.totalCalls})`)
        }
        return cached.result
      }
    }

    return new Promise((resolve, reject) => {
      fullCall.callback = (result, error) => {
        if (error) {
          reject(error)
        } else {
          // Cache successful results
          if (this.config.deduplication && result) {
            const cacheKey = this.getCacheKey(call)
            this.promptCache.set(cacheKey, { result, timestamp: Date.now() })
          }
          resolve(result)
        }
      }

      this.addToBatch(fullCall)
    })
  }

  /**
   * Submit multiple calls and wait for all results
   */
  async submitBatch(calls: Omit<BatchedCall, 'id'>[]): Promise<BatchResult[]> {
    const promises = calls.map((call, index) =>
      this.submit(call)
        .then(result => ({
          id: `batch-${index}`,
          result,
          executionTimeMs: 0, // Will be set by batch processing
        }))
        .catch(error => ({
          id: `batch-${index}`,
          error,
          executionTimeMs: 0,
        }))
    )

    return Promise.all(promises)
  }

  /**
   * Execute calls immediately (bypass batching)
   */
  async executeImmediate(call: Omit<BatchedCall, 'id'>): Promise<string> {
    return aiRouter.execute(call.task, call.prompt, call.options)
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    cacheHits: number
    totalCalls: number
    hitRate: number
    pendingBatches: number
    cacheSize: number
  } {
    return {
      cacheHits: this.cacheHits,
      totalCalls: this.totalCalls,
      hitRate: this.totalCalls > 0 ? this.cacheHits / this.totalCalls : 0,
      pendingBatches: this.pendingBatches.size,
      cacheSize: this.promptCache.size,
    }
  }

  /**
   * Clear the prompt cache
   */
  clearCache(): void {
    this.promptCache.clear()
    this.cacheHits = 0
    this.totalCalls = 0
  }

  /**
   * Flush all pending batches immediately
   */
  async flush(): Promise<void> {
    const promises: Promise<void>[] = []

    for (const [task, batch] of this.pendingBatches.entries()) {
      if (batch.timer) {
        clearTimeout(batch.timer)
        batch.timer = null
      }
      if (batch.calls.length > 0) {
        promises.push(this.executeBatch(task, batch))
      }
    }

    this.pendingBatches.clear()
    await Promise.all(promises)
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Add a call to the appropriate batch
   */
  private addToBatch(call: BatchedCall): void {
    let batch = this.pendingBatches.get(call.task)

    if (!batch) {
      batch = {
        calls: [],
        timer: null,
        sharedSystemPrompts: new Map(),
      }
      this.pendingBatches.set(call.task, batch)
    }

    batch.calls.push(call)

    // Track shared system prompts for optimization
    if (call.systemPrompt) {
      const existing = batch.sharedSystemPrompts.get(call.systemPrompt) || []
      existing.push(call.id)
      batch.sharedSystemPrompts.set(call.systemPrompt, existing)
    }

    // Check if we should execute immediately
    if (batch.calls.length >= this.config.maxBatchSize) {
      if (batch.timer) {
        clearTimeout(batch.timer)
        batch.timer = null
      }
      this.executeBatch(call.task, batch)
      this.pendingBatches.delete(call.task)
    } else if (!batch.timer) {
      // Set timeout for batch execution
      batch.timer = setTimeout(() => {
        const currentBatch = this.pendingBatches.get(call.task)
        if (currentBatch && currentBatch.calls.length > 0) {
          this.executeBatch(call.task, currentBatch)
          this.pendingBatches.delete(call.task)
        }
      }, this.config.maxWaitTimeMs)
    }
  }

  /**
   * Execute a batch of calls
   */
  private async executeBatch(task: AITask, batch: PendingBatch): Promise<void> {
    const startTime = Date.now()
    const calls = batch.calls

    if (this.config.enableLogging) {
      console.log(`[BatchExecutor] Executing batch: ${calls.length} calls for task "${task}"`)
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 }
    calls.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    // Group calls with same system prompt for token efficiency
    const groupedCalls = this.groupBySystemPrompt(calls)

    // Execute groups in parallel
    const groupPromises = Array.from(groupedCalls.entries()).map(
      ([systemPrompt, groupCalls]) =>
        this.executeGroup(task, systemPrompt, groupCalls)
    )

    await Promise.all(groupPromises)

    const executionTime = Date.now() - startTime
    if (this.config.enableLogging) {
      console.log(`[BatchExecutor] Batch complete in ${executionTime}ms`)
    }
  }

  /**
   * Group calls by shared system prompt
   */
  private groupBySystemPrompt(calls: BatchedCall[]): Map<string | undefined, BatchedCall[]> {
    const groups = new Map<string | undefined, BatchedCall[]>()

    for (const call of calls) {
      const key = call.systemPrompt
      const existing = groups.get(key) || []
      existing.push(call)
      groups.set(key, existing)
    }

    return groups
  }

  /**
   * Execute a group of calls with shared system prompt
   */
  private async executeGroup(
    task: AITask,
    systemPrompt: string | undefined,
    calls: BatchedCall[]
  ): Promise<void> {
    // For small groups, execute individually
    if (calls.length <= 2) {
      await Promise.all(calls.map(call => this.executeSingleCall(call)))
      return
    }

    // For larger groups, combine into a single prompt with separators
    const combinedPrompt = this.buildCombinedPrompt(systemPrompt, calls)

    try {
      const result = await aiRouter.execute(task, combinedPrompt, {
        maxTokens: getTokenBudget(task) * calls.length,
        model: calls[0].options?.model,
        temperature: calls[0].options?.temperature,
      })

      // Parse and distribute results
      this.distributeResults(calls, result)
    } catch (error) {
      // On combined failure, fall back to individual execution
      if (this.config.enableLogging) {
        console.warn('[BatchExecutor] Combined execution failed, falling back to individual')
      }
      await Promise.all(calls.map(call => this.executeSingleCall(call)))
    }
  }

  /**
   * Build a combined prompt from multiple calls
   */
  private buildCombinedPrompt(
    systemPrompt: string | undefined,
    calls: BatchedCall[]
  ): string {
    let combined = ''

    if (systemPrompt) {
      combined += `${systemPrompt}\n\n`
    }

    combined += 'Please respond to each of the following requests separately, '
    combined += 'using "---RESPONSE_SEPARATOR---" between each response:\n\n'

    for (let i = 0; i < calls.length; i++) {
      combined += `### Request ${i + 1}:\n${calls[i].prompt}\n\n`
    }

    return combined
  }

  /**
   * Distribute combined results to individual callbacks
   */
  private distributeResults(calls: BatchedCall[], combinedResult: string): void {
    const separator = '---RESPONSE_SEPARATOR---'
    const responses = combinedResult.split(separator).map(r => r.trim())

    for (let i = 0; i < calls.length; i++) {
      const call = calls[i]
      const response = responses[i] || ''

      if (response && call.callback) {
        call.callback(response)
      } else if (call.callback) {
        call.callback('', new Error('No response in combined result'))
      }
    }
  }

  /**
   * Execute a single call
   */
  private async executeSingleCall(call: BatchedCall): Promise<void> {
    const startTime = Date.now()

    try {
      const prompt = call.systemPrompt
        ? `${call.systemPrompt}\n\n${call.prompt}`
        : call.prompt

      const result = await aiRouter.execute(call.task, prompt, call.options)

      if (call.callback) {
        call.callback(result)
      }
    } catch (error) {
      if (call.callback) {
        call.callback('', error instanceof Error ? error : new Error(String(error)))
      }
    }
  }

  /**
   * Generate unique call ID
   */
  private generateCallId(): string {
    return `call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  /**
   * Generate cache key for deduplication
   */
  private getCacheKey(call: Omit<BatchedCall, 'id'>): string {
    return `${call.task}:${call.prompt}:${call.systemPrompt || ''}:${call.options?.model || 'default'}`
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createBatchExecutor(
  config?: Partial<BatchExecutorConfig>
): AICallBatchExecutor {
  return new AICallBatchExecutor(config)
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalBatchExecutor: AICallBatchExecutor | null = null

export function getGlobalBatchExecutor(): AICallBatchExecutor {
  if (!globalBatchExecutor) {
    globalBatchExecutor = new AICallBatchExecutor()
  }
  return globalBatchExecutor
}

export function resetGlobalBatchExecutor(): void {
  if (globalBatchExecutor) {
    globalBatchExecutor.flush()
    globalBatchExecutor = null
  }
}
