/**
 * GPU Validation Pool
 *
 * Manages GPU-accelerated validation tasks across T4/A10G/A100 tiers.
 * Provides priority queuing, batch submission, caching, and utilization monitoring.
 *
 * Features:
 * - Progressive tier escalation based on hypothesis scores
 * - Priority queuing (critical → high → normal → low)
 * - LRU cache for duplicate hypothesis parameters
 * - Warm-up support for pre-starting GPU instances
 * - Real-time utilization monitoring
 *
 * @see modal-provider.ts - GPU execution backend
 * @see gpu-bridge.ts - FeedbackBus integration
 */

import { EventEmitter } from 'events'
import {
  ModalSimulationProvider,
  createModalProvider,
  type GPUTier,
} from './providers/modal-provider'

// Simple LRU Cache implementation to avoid external dependency
class LRUCache<K, V> {
  private cache: Map<K, { value: V; expiry: number }>
  private maxSize: number
  private ttl: number

  constructor(options: { max: number; ttl: number }) {
    this.cache = new Map()
    this.maxSize = options.max
    this.ttl = options.ttl
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(key, { value, expiry: Date.now() + this.ttl })
  }

  has(key: K): boolean {
    return this.get(key) !== undefined
  }

  clear(): void {
    this.cache.clear()
  }
}

// ============================================================================
// Types
// ============================================================================

export type TaskPriority = 'critical' | 'high' | 'normal' | 'low'
export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface GPUPoolConfig {
  maxConcurrentT4: number
  maxConcurrentA10G: number
  maxConcurrentA100: number
  queueTimeout: number
  autoScaleThreshold: number
  enableCache: boolean
  cacheTTL: number
  maxCacheSize: number
}

export const DEFAULT_POOL_CONFIG: GPUPoolConfig = {
  maxConcurrentT4: 10,
  maxConcurrentA10G: 5,
  maxConcurrentA100: 2,
  queueTimeout: 30_000,
  autoScaleThreshold: 0.7,
  enableCache: true,
  cacheTTL: 300_000, // 5 minutes
  maxCacheSize: 100,
}

export interface GPUTask {
  id: string
  hypothesisId: string
  tier: GPUTier
  priority: TaskPriority
  simulationType: 'monte_carlo' | 'parametric_sweep' | 'physics_validation' | 'batch_validation'
  parameters: Record<string, unknown>
  createdAt: number
  startedAt?: number
  completedAt?: number
  status: TaskStatus
}

export interface GPUResult {
  taskId: string
  hypothesisId: string
  tier: GPUTier
  physicsValid: boolean
  economicallyViable: boolean
  confidenceScore: number
  metrics: {
    efficiency?: { mean: number; ci95: [number, number] }
    lcoe?: { mean: number; ci95: [number, number] }
  }
  durationMs: number
  cost: number
  fromCache: boolean
}

export interface PoolUtilization {
  T4: number
  A10G: number
  A100: number
  queueLengths: {
    T4: number
    A10G: number
    A100: number
  }
  totalActive: number
  totalQueued: number
}

export interface PoolMetrics {
  totalTasksSubmitted: number
  totalTasksCompleted: number
  totalTasksFailed: number
  cacheHits: number
  cacheMisses: number
  totalCost: number
  averageDurationMs: number
  utilizationHistory: PoolUtilization[]
}

// Priority values for sorting
const PRIORITY_VALUES: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
}

// GPU costs per tier
const GPU_COSTS: Record<GPUTier, number> = {
  T4: 0.01,
  A10G: 0.02,
  A100: 0.05,
}

// ============================================================================
// GPU Validation Pool
// ============================================================================

export class GPUValidationPool extends EventEmitter {
  private config: GPUPoolConfig
  private queues: Map<GPUTier, GPUTask[]>
  private activeWorkers: Map<GPUTier, Set<string>>
  private resultCache: LRUCache<string, GPUResult>
  private providers: Map<GPUTier, ModalSimulationProvider>
  private metrics: PoolMetrics
  private taskCounter: number = 0
  private isRunning: boolean = false
  private processInterval: ReturnType<typeof setInterval> | null = null

  constructor(config: Partial<GPUPoolConfig> = {}) {
    super()
    this.config = { ...DEFAULT_POOL_CONFIG, ...config }
    this.queues = new Map([
      ['T4', []],
      ['A10G', []],
      ['A100', []],
    ])
    this.activeWorkers = new Map([
      ['T4', new Set()],
      ['A10G', new Set()],
      ['A100', new Set()],
    ])
    this.providers = new Map()
    this.resultCache = new LRUCache({
      max: this.config.maxCacheSize,
      ttl: this.config.cacheTTL,
    })
    this.metrics = {
      totalTasksSubmitted: 0,
      totalTasksCompleted: 0,
      totalTasksFailed: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalCost: 0,
      averageDurationMs: 0,
      utilizationHistory: [],
    }
    this.initializeProviders()
  }

  /**
   * Initialize Modal providers for each tier
   */
  private initializeProviders(): void {
    this.providers.set('T4', createModalProvider('tier2', { defaultGPU: 'T4' }))
    this.providers.set('A10G', createModalProvider('tier3', { defaultGPU: 'A10G' }))
    this.providers.set('A100', createModalProvider('tier3', { defaultGPU: 'A100' }))
  }

  /**
   * Start the pool processing loop
   */
  start(): void {
    if (this.isRunning) return

    this.isRunning = true
    this.processInterval = setInterval(() => this.processQueues(), 50)

    this.emit('pool_started')
    console.log('[GPUPool] Started processing loop')
  }

  /**
   * Stop the pool processing loop
   */
  stop(): void {
    if (!this.isRunning) return

    this.isRunning = false
    if (this.processInterval) {
      clearInterval(this.processInterval)
      this.processInterval = null
    }

    this.emit('pool_stopped')
    console.log('[GPUPool] Stopped processing loop')
  }

  /**
   * Submit a single task to the pool
   */
  async submitTask(taskInput: Omit<GPUTask, 'id' | 'createdAt' | 'status'>): Promise<GPUResult> {
    const task: GPUTask = {
      ...taskInput,
      id: this.generateTaskId(),
      createdAt: Date.now(),
      status: 'queued',
    }

    // Check cache first
    if (this.config.enableCache) {
      const cacheKey = this.computeCacheKey(task)
      const cached = this.resultCache.get(cacheKey)
      if (cached) {
        this.metrics.cacheHits++
        this.emit('cache_hit', { taskId: task.id, hypothesisId: task.hypothesisId })
        return { ...cached, fromCache: true }
      }
      this.metrics.cacheMisses++
    }

    this.metrics.totalTasksSubmitted++

    // Add to queue
    const queue = this.queues.get(task.tier)!
    this.enqueue(queue, task)

    this.emit('task_queued', {
      taskId: task.id,
      hypothesisId: task.hypothesisId,
      tier: task.tier,
      queuePosition: queue.indexOf(task) + 1,
    })

    // Wait for result with timeout
    return this.waitForResult(task)
  }

  /**
   * Submit multiple tasks in batch
   */
  async batchSubmit(
    taskInputs: Array<Omit<GPUTask, 'id' | 'createdAt' | 'status'>>
  ): Promise<GPUResult[]> {
    // Group by tier for efficient batching
    const byTier = new Map<GPUTier, typeof taskInputs>()

    for (const input of taskInputs) {
      const existing = byTier.get(input.tier) || []
      existing.push(input)
      byTier.set(input.tier, existing)
    }

    // Submit all tasks and collect promises
    const resultPromises: Promise<GPUResult | GPUResult[]>[] = []

    for (const [tier, inputs] of byTier) {
      // For batch validation, we can use the provider's batch method directly
      if (inputs.length > 1 && inputs.every(i => i.simulationType === 'physics_validation')) {
        resultPromises.push(this.executeBatchValidation(tier, inputs))
      } else {
        // Submit individually
        for (const input of inputs) {
          resultPromises.push(this.submitTask(input))
        }
      }
    }

    // Wait for all results
    const results = await Promise.allSettled(resultPromises)

    // Flatten and extract values
    const flatResults: GPUResult[] = []
    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (Array.isArray(result.value)) {
          flatResults.push(...result.value)
        } else {
          flatResults.push(result.value)
        }
      }
    }

    return flatResults
  }

  /**
   * Execute batch validation directly on GPU
   */
  private async executeBatchValidation(
    tier: GPUTier,
    inputs: Array<Omit<GPUTask, 'id' | 'createdAt' | 'status'>>
  ): Promise<GPUResult[]> {
    const provider = this.providers.get(tier)!
    const startTime = Date.now()

    try {
      // Check for cached results first
      const results: GPUResult[] = []
      const uncachedInputs: typeof inputs = []
      const uncachedIndices: number[] = []

      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i]
        const cacheKey = this.computeCacheKey({
          ...input,
          id: 'temp',
          createdAt: 0,
          status: 'queued',
        } as GPUTask)

        const cached = this.resultCache.get(cacheKey)
        if (cached) {
          this.metrics.cacheHits++
          results[i] = { ...cached, fromCache: true }
        } else {
          this.metrics.cacheMisses++
          uncachedInputs.push(input)
          uncachedIndices.push(i)
        }
      }

      // Execute batch for uncached inputs
      if (uncachedInputs.length > 0) {
        const hypotheses = uncachedInputs.map(input => ({
          id: input.hypothesisId,
          parameters: input.parameters as Record<string, number>,
        }))

        const batchResults = await provider.batchValidateHypotheses(hypotheses, 'quick')
        const duration = Date.now() - startTime

        for (let i = 0; i < batchResults.length; i++) {
          const batchResult = batchResults[i]
          const originalIndex = uncachedIndices[i]
          const input = uncachedInputs[i]

          const result: GPUResult = {
            taskId: this.generateTaskId(),
            hypothesisId: input.hypothesisId,
            tier,
            physicsValid: batchResult.physics_valid,
            economicallyViable: batchResult.economically_viable,
            confidenceScore: batchResult.confidence_score,
            metrics: {
              efficiency: batchResult.metrics?.efficiency
                ? { mean: batchResult.metrics.efficiency.mean, ci95: batchResult.metrics.efficiency.ci_95 }
                : undefined,
              lcoe: batchResult.metrics?.lcoe
                ? { mean: batchResult.metrics.lcoe.mean, ci95: batchResult.metrics.lcoe.ci_95 }
                : undefined,
            },
            durationMs: duration / uncachedInputs.length,
            cost: GPU_COSTS[tier],
            fromCache: false,
          }

          results[originalIndex] = result

          // Cache the result
          const cacheKey = this.computeCacheKey({
            ...input,
            id: 'temp',
            createdAt: 0,
            status: 'queued',
          } as GPUTask)
          this.resultCache.set(cacheKey, result)

          this.metrics.totalTasksCompleted++
          this.metrics.totalCost += GPU_COSTS[tier]
        }
      }

      return results
    } catch (error) {
      console.error('[GPUPool] Batch validation failed:', error)
      throw error
    }
  }

  /**
   * Warm up GPU instances
   */
  async warmUp(tier: GPUTier, count: number = 1): Promise<void> {
    const provider = this.providers.get(tier)!

    this.emit('warmup_started', { tier, count })
    console.log(`[GPUPool] Warming up ${count} ${tier} instance(s)`)

    try {
      // Send lightweight ping to start instances
      // This would call a warm-up endpoint on Modal
      const available = await provider.isAvailable()

      if (available) {
        this.emit('warmup_complete', { tier, count })
        console.log(`[GPUPool] ${tier} warm-up complete`)
      } else {
        this.emit('warmup_failed', { tier, reason: 'GPU not available' })
        console.warn(`[GPUPool] ${tier} warm-up failed: GPU not available`)
      }
    } catch (error) {
      this.emit('warmup_failed', { tier, reason: error instanceof Error ? error.message : 'Unknown error' })
      console.error(`[GPUPool] ${tier} warm-up failed:`, error)
    }
  }

  /**
   * Get current pool utilization
   */
  getUtilization(): PoolUtilization {
    const maxConcurrent: Record<GPUTier, number> = {
      T4: this.config.maxConcurrentT4,
      A10G: this.config.maxConcurrentA10G,
      A100: this.config.maxConcurrentA100,
    }

    const utilization: PoolUtilization = {
      T4: this.activeWorkers.get('T4')!.size / maxConcurrent.T4,
      A10G: this.activeWorkers.get('A10G')!.size / maxConcurrent.A10G,
      A100: this.activeWorkers.get('A100')!.size / maxConcurrent.A100,
      queueLengths: {
        T4: this.queues.get('T4')!.length,
        A10G: this.queues.get('A10G')!.length,
        A100: this.queues.get('A100')!.length,
      },
      totalActive:
        this.activeWorkers.get('T4')!.size +
        this.activeWorkers.get('A10G')!.size +
        this.activeWorkers.get('A100')!.size,
      totalQueued:
        this.queues.get('T4')!.length +
        this.queues.get('A10G')!.length +
        this.queues.get('A100')!.length,
    }

    return utilization
  }

  /**
   * Get pool metrics
   */
  getMetrics(): PoolMetrics {
    return { ...this.metrics }
  }

  /**
   * Select appropriate GPU tier based on hypothesis score
   */
  selectTierByScore(score: number): GPUTier {
    if (score >= 8.5) return 'A100'
    if (score >= 7.0) return 'A10G'
    if (score >= 6.0) return 'T4'
    return 'T4' // Default to T4 for lower scores
  }

  /**
   * Check if a tier has capacity
   */
  hasCapacity(tier: GPUTier): boolean {
    const maxConcurrent: Record<GPUTier, number> = {
      T4: this.config.maxConcurrentT4,
      A10G: this.config.maxConcurrentA10G,
      A100: this.config.maxConcurrentA100,
    }

    return this.activeWorkers.get(tier)!.size < maxConcurrent[tier]
  }

  /**
   * Cancel a queued task
   */
  cancelTask(taskId: string): boolean {
    for (const [tier, queue] of this.queues) {
      const index = queue.findIndex(t => t.id === taskId)
      if (index >= 0) {
        const task = queue.splice(index, 1)[0]
        task.status = 'cancelled'
        this.emit('task_cancelled', { taskId, tier })
        return true
      }
    }
    return false
  }

  /**
   * Clear all queues
   */
  clearQueues(): void {
    for (const queue of this.queues.values()) {
      queue.length = 0
    }
    this.emit('queues_cleared')
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Enqueue task with priority ordering
   */
  private enqueue(queue: GPUTask[], task: GPUTask): void {
    const insertIndex = queue.findIndex(
      t => PRIORITY_VALUES[t.priority] > PRIORITY_VALUES[task.priority]
    )

    if (insertIndex === -1) {
      queue.push(task)
    } else {
      queue.splice(insertIndex, 0, task)
    }
  }

  /**
   * Process all queues
   */
  private async processQueues(): Promise<void> {
    for (const tier of ['T4', 'A10G', 'A100'] as GPUTier[]) {
      await this.processQueue(tier)
    }
  }

  /**
   * Process a single tier's queue
   */
  private async processQueue(tier: GPUTier): Promise<void> {
    const queue = this.queues.get(tier)!
    const workers = this.activeWorkers.get(tier)!
    const maxConcurrent: Record<GPUTier, number> = {
      T4: this.config.maxConcurrentT4,
      A10G: this.config.maxConcurrentA10G,
      A100: this.config.maxConcurrentA100,
    }

    while (queue.length > 0 && workers.size < maxConcurrent[tier]) {
      const task = queue.shift()
      if (!task) break

      // Check for timeout
      if (Date.now() - task.createdAt > this.config.queueTimeout) {
        task.status = 'failed'
        this.emit('task_timeout', { taskId: task.id, tier })
        continue
      }

      // Start the task
      workers.add(task.id)
      task.status = 'running'
      task.startedAt = Date.now()

      this.emit('task_started', {
        taskId: task.id,
        hypothesisId: task.hypothesisId,
        tier,
        estimatedDuration: this.estimateDuration(tier),
      })

      // Execute asynchronously
      this.executeTask(task).catch(error => {
        console.error(`[GPUPool] Task ${task.id} failed:`, error)
      })
    }
  }

  /**
   * Execute a single task
   */
  private async executeTask(task: GPUTask): Promise<void> {
    const tier = task.tier
    const provider = this.providers.get(tier)!
    const startTime = Date.now()

    try {
      // Execute based on simulation type
      let result: GPUResult

      if (task.simulationType === 'physics_validation' || task.simulationType === 'batch_validation') {
        // Convert parameters to Record<string, number>
        const numericParams: Record<string, number> = {}
        for (const [key, value] of Object.entries(task.parameters)) {
          numericParams[key] = typeof value === 'number' ? value : Number(value) || 0
        }

        const validationResult = await provider.batchValidateHypotheses(
          [{ id: task.hypothesisId, parameters: numericParams }],
          'quick'
        )

        const batchResult = validationResult[0]
        result = {
          taskId: task.id,
          hypothesisId: task.hypothesisId,
          tier,
          physicsValid: batchResult.physics_valid,
          economicallyViable: batchResult.economically_viable,
          confidenceScore: batchResult.confidence_score,
          metrics: {
            efficiency: batchResult.metrics?.efficiency
              ? { mean: batchResult.metrics.efficiency.mean, ci95: batchResult.metrics.efficiency.ci_95 }
              : undefined,
            lcoe: batchResult.metrics?.lcoe
              ? { mean: batchResult.metrics.lcoe.mean, ci95: batchResult.metrics.lcoe.ci_95 }
              : undefined,
          },
          durationMs: Date.now() - startTime,
          cost: GPU_COSTS[tier],
          fromCache: false,
        }
      } else {
        // For other simulation types, use execute()
        // Convert parameters to Record<string, number>
        const numericInputs: Record<string, number> = {}
        for (const [key, value] of Object.entries(task.parameters)) {
          numericInputs[key] = typeof value === 'number' ? value : Number(value) || 0
        }

        const simResult = await provider.execute({
          experimentId: task.hypothesisId,
          type: task.simulationType === 'monte_carlo' ? 'thermodynamic' : 'optimization',
          inputs: numericInputs,
          boundaryConditions: [],
        })

        result = {
          taskId: task.id,
          hypothesisId: task.hypothesisId,
          tier,
          physicsValid: simResult.converged,
          economicallyViable: true,
          confidenceScore: 1 - (simResult.residual || 0),
          metrics: {},
          durationMs: Date.now() - startTime,
          cost: GPU_COSTS[tier],
          fromCache: false,
        }
      }

      // Update task
      task.status = 'completed'
      task.completedAt = Date.now()

      // Update metrics
      this.metrics.totalTasksCompleted++
      this.metrics.totalCost += GPU_COSTS[tier]
      this.updateAverageDuration(result.durationMs)

      // Cache result
      if (this.config.enableCache) {
        const cacheKey = this.computeCacheKey(task)
        this.resultCache.set(cacheKey, result)
      }

      this.emit('task_complete', { task, result })

    } catch (error) {
      task.status = 'failed'
      task.completedAt = Date.now()
      this.metrics.totalTasksFailed++

      this.emit('task_failed', {
        taskId: task.id,
        tier,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

    } finally {
      // Remove from active workers
      this.activeWorkers.get(tier)!.delete(task.id)
    }
  }

  /**
   * Wait for a task result
   */
  private waitForResult(task: GPUTask): Promise<GPUResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup()
        reject(new Error(`Task ${task.id} timed out`))
      }, this.config.queueTimeout + 60_000) // Queue timeout + execution time

      const onComplete = (event: { task: GPUTask; result: GPUResult }) => {
        if (event.task.id === task.id) {
          cleanup()
          resolve(event.result)
        }
      }

      const onFailed = (event: { taskId: string; error: string }) => {
        if (event.taskId === task.id) {
          cleanup()
          reject(new Error(event.error))
        }
      }

      const onTimeout = (event: { taskId: string }) => {
        if (event.taskId === task.id) {
          cleanup()
          reject(new Error(`Task ${task.id} timed out in queue`))
        }
      }

      const cleanup = () => {
        clearTimeout(timeout)
        this.off('task_complete', onComplete)
        this.off('task_failed', onFailed)
        this.off('task_timeout', onTimeout)
      }

      this.on('task_complete', onComplete)
      this.on('task_failed', onFailed)
      this.on('task_timeout', onTimeout)
    })
  }

  /**
   * Compute cache key for a task
   */
  private computeCacheKey(task: GPUTask): string {
    const params = JSON.stringify(task.parameters)
    return `${task.hypothesisId}-${task.tier}-${task.simulationType}-${params}`
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    this.taskCounter++
    return `gpu-task-${Date.now()}-${this.taskCounter}`
  }

  /**
   * Estimate duration for a tier
   */
  private estimateDuration(tier: GPUTier): number {
    const baseDurations: Record<GPUTier, number> = {
      T4: 15_000,
      A10G: 20_000,
      A100: 25_000,
    }
    return baseDurations[tier]
  }

  /**
   * Update average duration metric
   */
  private updateAverageDuration(duration: number): void {
    const completed = this.metrics.totalTasksCompleted
    if (completed === 1) {
      this.metrics.averageDurationMs = duration
    } else {
      this.metrics.averageDurationMs =
        (this.metrics.averageDurationMs * (completed - 1) + duration) / completed
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createGPUPool(config?: Partial<GPUPoolConfig>): GPUValidationPool {
  const pool = new GPUValidationPool(config)
  pool.start()
  return pool
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalPool: GPUValidationPool | null = null

export function getGlobalGPUPool(): GPUValidationPool {
  if (!globalPool) {
    globalPool = createGPUPool()
  }
  return globalPool
}

export function resetGlobalGPUPool(): void {
  if (globalPool) {
    globalPool.stop()
    globalPool = null
  }
}

export default GPUValidationPool
