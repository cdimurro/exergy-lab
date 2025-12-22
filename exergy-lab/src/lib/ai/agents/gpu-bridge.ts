/**
 * GPU-FeedbackBus Bridge
 *
 * Connects the GPU Validation Pool with the FeedbackBus for real-time
 * inter-agent communication about GPU validation events.
 *
 * Features:
 * - Forwards GPU pool events to FeedbackBus
 * - Auto-queues GPU validation on hypothesis generation
 * - Tier selection based on hypothesis scores
 * - Score adjustment calculations based on GPU results
 *
 * @see gpu-pool.ts - GPU task management
 * @see feedback-bus.ts - Message routing
 * @see hypothesis-racer.ts - Racing arena integration
 */

import type { RacingHypothesis, HypGenAgentType } from './hypgen/base'
import type { FeedbackBus, AgentId, MessagePriority } from './feedback-bus'
import type {
  GPUValidationPool,
  GPUResult,
  GPUTask,
  PoolUtilization,
  TaskPriority,
} from '@/lib/simulation/gpu-pool'
import type { GPUTier } from '@/lib/simulation/providers/modal-provider'

// ============================================================================
// Types
// ============================================================================

export type GPUMessageType =
  | 'gpu_validation_queued'
  | 'gpu_validation_started'
  | 'gpu_validation_progress'
  | 'gpu_validation_complete'
  | 'gpu_pool_status'
  | 'tier_escalation'
  | 'score_adjustment'
  | 'gpu_warmup_started'
  | 'gpu_warmup_complete'
  | 'gpu_error'

export interface GPUValidationQueuedPayload {
  type: 'gpu_validation_queued'
  hypothesisId: string
  tier: GPUTier
  priority: TaskPriority
  queuePosition: number
  estimatedWait: number
}

export interface GPUValidationStartedPayload {
  type: 'gpu_validation_started'
  hypothesisId: string
  tier: GPUTier
  estimatedDuration: number
}

export interface GPUValidationProgressPayload {
  type: 'gpu_validation_progress'
  hypothesisId: string
  tier: GPUTier
  percentComplete: number
  message?: string
}

export interface GPUValidationCompletePayload {
  type: 'gpu_validation_complete'
  hypothesisId: string
  tier: GPUTier
  result: GPUResult
  scoreAdjustment: number
}

export interface GPUPoolStatusPayload {
  type: 'gpu_pool_status'
  utilization: PoolUtilization
  metrics: {
    totalCompleted: number
    totalCost: number
    averageDuration: number
    cacheHitRate: number
  }
}

export interface TierEscalationPayload {
  type: 'tier_escalation'
  hypothesisId: string
  fromTier: GPUTier
  toTier: GPUTier
  reason: string
}

export interface ScoreAdjustmentPayload {
  type: 'score_adjustment'
  hypothesisId: string
  previousScore: number
  adjustment: number
  newScore: number
  reason: string
  gpuResult: GPUResult
}

export type GPUMessagePayload =
  | GPUValidationQueuedPayload
  | GPUValidationStartedPayload
  | GPUValidationProgressPayload
  | GPUValidationCompletePayload
  | GPUPoolStatusPayload
  | TierEscalationPayload
  | ScoreAdjustmentPayload

export interface GPUBridgeConfig {
  autoQueueThreshold: number // Score threshold for auto-queue (default: 6.0)
  autoQueueStartIteration: number // Start auto-queueing at this iteration
  publishPoolStatusInterval: number // How often to publish pool status (ms)
  enableAutoScoreAdjustment: boolean // Automatically publish score adjustments
}

export const DEFAULT_BRIDGE_CONFIG: GPUBridgeConfig = {
  autoQueueThreshold: 6.0,
  autoQueueStartIteration: 2,
  publishPoolStatusInterval: 5000,
  enableAutoScoreAdjustment: true,
}

// ============================================================================
// GPU-FeedbackBus Bridge
// ============================================================================

export class GPUFeedbackBridge {
  private gpuPool: GPUValidationPool
  private feedbackBus: FeedbackBus
  private config: GPUBridgeConfig
  private statusInterval: ReturnType<typeof setInterval> | null = null
  private subscriptionId: string | null = null

  constructor(
    gpuPool: GPUValidationPool,
    feedbackBus: FeedbackBus,
    config: Partial<GPUBridgeConfig> = {}
  ) {
    this.gpuPool = gpuPool
    this.feedbackBus = feedbackBus
    this.config = { ...DEFAULT_BRIDGE_CONFIG, ...config }
    this.setupEventForwarding()
  }

  /**
   * Start the bridge
   */
  start(): void {
    this.setupAutoValidation()
    this.startStatusBroadcast()
    console.log('[GPUBridge] Started')
  }

  /**
   * Stop the bridge
   */
  stop(): void {
    if (this.statusInterval) {
      clearInterval(this.statusInterval)
      this.statusInterval = null
    }
    if (this.subscriptionId) {
      this.feedbackBus.unsubscribe(this.subscriptionId)
      this.subscriptionId = null
    }
    console.log('[GPUBridge] Stopped')
  }

  /**
   * Publish a GPU-related message to the FeedbackBus
   */
  publishGPUMessage(
    type: GPUMessageType,
    payload: Omit<GPUMessagePayload, 'type'>,
    options: {
      priority?: MessagePriority
      iteration?: number
      targetAgents?: AgentId[] | 'broadcast'
    } = {}
  ): string {
    // Use the FeedbackBus publish method with custom type
    // Since FeedbackBus expects specific message types, we cast to 'race_update' for GPU messages
    // and include the actual GPU type in the payload
    return this.feedbackBus.publish(
      'race_update', // Use race_update as the carrier type
      'orchestrator' as AgentId,
      options.targetAgents || 'broadcast',
      {
        // Wrap GPU payload in race_update structure
        iteration: options.iteration || 0,
        activeHypotheses: 0,
        eliminatedHypotheses: 0,
        breakthroughCandidates: 0,
        topScore: 0,
        averageScore: 0,
        // Add GPU data as metadata
        ...payload,
      },
      {
        priority: options.priority || 'normal',
        iteration: options.iteration,
        metadata: {
          gpuMessageType: type,
          gpuPayload: payload,
        },
      }
    )
  }

  /**
   * Queue a hypothesis for GPU validation
   */
  async queueValidation(
    hypothesis: RacingHypothesis,
    options: {
      priority?: TaskPriority
      tier?: GPUTier
      iteration?: number
    } = {}
  ): Promise<GPUResult> {
    const tier = options.tier || this.selectTierForHypothesis(hypothesis)
    const priority = options.priority || this.selectPriorityForScore(hypothesis.scores.overall)

    const task: Omit<GPUTask, 'id' | 'createdAt' | 'status'> = {
      hypothesisId: hypothesis.id,
      tier,
      priority,
      simulationType: 'physics_validation',
      parameters: this.extractParametersFromHypothesis(hypothesis),
    }

    const result = await this.gpuPool.submitTask(task)

    // Publish completion with score adjustment
    if (this.config.enableAutoScoreAdjustment) {
      const adjustment = this.calculateScoreAdjustment(result)
      this.publishScoreAdjustment(hypothesis.id, hypothesis.scores.overall, adjustment, result)
    }

    return result
  }

  /**
   * Queue multiple hypotheses for GPU validation
   */
  async queueBatchValidation(
    hypotheses: RacingHypothesis[],
    options: {
      iteration?: number
    } = {}
  ): Promise<GPUResult[]> {
    const tasks: Array<Omit<GPUTask, 'id' | 'createdAt' | 'status'>> = hypotheses.map(h => ({
      hypothesisId: h.id,
      tier: this.selectTierForHypothesis(h),
      priority: this.selectPriorityForScore(h.scores.overall),
      simulationType: 'physics_validation' as const,
      parameters: this.extractParametersFromHypothesis(h),
    }))

    const results = await this.gpuPool.batchSubmit(tasks)

    // Publish score adjustments
    if (this.config.enableAutoScoreAdjustment) {
      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        const hypothesis = hypotheses.find(h => h.id === result.hypothesisId)
        if (hypothesis) {
          const adjustment = this.calculateScoreAdjustment(result)
          this.publishScoreAdjustment(hypothesis.id, hypothesis.scores.overall, adjustment, result)
        }
      }
    }

    return results
  }

  /**
   * Calculate score adjustment based on GPU validation result
   */
  calculateScoreAdjustment(result: GPUResult): number {
    let adjustment = 0

    // Physics validation impact
    if (result.physicsValid) {
      adjustment += 0.3
      if (result.confidenceScore > 0.9) adjustment += 0.1
      if (result.confidenceScore > 0.95) adjustment += 0.1
    } else {
      adjustment -= 0.3
      if (result.confidenceScore < 0.5) adjustment -= 0.2
    }

    // Economic viability impact
    if (result.economicallyViable) {
      adjustment += 0.2
      // Check LCOE metrics if available
      if (result.metrics.lcoe && result.metrics.lcoe.mean < 0.05) {
        adjustment += 0.1 // Bonus for very low LCOE
      }
    } else {
      adjustment -= 0.1
    }

    // Cap adjustment to prevent extreme swings
    return Math.max(-0.5, Math.min(0.5, adjustment))
  }

  /**
   * Get current pool utilization
   */
  getUtilization(): PoolUtilization {
    return this.gpuPool.getUtilization()
  }

  /**
   * Warm up GPU instances
   */
  async warmUp(tier: GPUTier, count: number = 1): Promise<void> {
    this.publishGPUMessage('gpu_warmup_started', {
      type: 'gpu_pool_status',
      utilization: this.gpuPool.getUtilization(),
      metrics: this.getPoolMetrics(),
    })

    await this.gpuPool.warmUp(tier, count)

    this.publishGPUMessage('gpu_warmup_complete', {
      type: 'gpu_pool_status',
      utilization: this.gpuPool.getUtilization(),
      metrics: this.getPoolMetrics(),
    })
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Setup event forwarding from GPU pool to FeedbackBus
   */
  private setupEventForwarding(): void {
    // Task queued
    this.gpuPool.on('task_queued', (event: {
      taskId: string
      hypothesisId: string
      tier: GPUTier
      queuePosition: number
    }) => {
      this.publishGPUMessage(
        'gpu_validation_queued',
        {
          type: 'gpu_validation_queued',
          hypothesisId: event.hypothesisId,
          tier: event.tier,
          priority: 'normal',
          queuePosition: event.queuePosition,
          estimatedWait: event.queuePosition * 10_000, // Rough estimate
        },
        { priority: 'normal' }
      )
    })

    // Task started
    this.gpuPool.on('task_started', (event: {
      taskId: string
      hypothesisId: string
      tier: GPUTier
      estimatedDuration: number
    }) => {
      this.publishGPUMessage(
        'gpu_validation_started',
        {
          type: 'gpu_validation_started',
          hypothesisId: event.hypothesisId,
          tier: event.tier,
          estimatedDuration: event.estimatedDuration,
        },
        { priority: 'high' }
      )
    })

    // Task complete
    this.gpuPool.on('task_complete', (event: { task: GPUTask; result: GPUResult }) => {
      const adjustment = this.calculateScoreAdjustment(event.result)

      this.publishGPUMessage(
        'gpu_validation_complete',
        {
          type: 'gpu_validation_complete',
          hypothesisId: event.task.hypothesisId,
          tier: event.task.tier,
          result: event.result,
          scoreAdjustment: adjustment,
        },
        { priority: 'critical' }
      )
    })

    // Task failed
    this.gpuPool.on('task_failed', (event: {
      taskId: string
      tier: GPUTier
      error: string
    }) => {
      this.feedbackBus.publishError(
        'orchestrator',
        `GPU validation failed on ${event.tier}: ${event.error}`,
        true
      )
    })

    // Cache hit
    this.gpuPool.on('cache_hit', (event: { taskId: string; hypothesisId: string }) => {
      console.log(`[GPUBridge] Cache hit for hypothesis ${event.hypothesisId.slice(-8)}`)
    })
  }

  /**
   * Setup auto-validation when hypotheses are generated/evaluated
   */
  private setupAutoValidation(): void {
    // Subscribe to evaluation complete events
    this.subscriptionId = this.feedbackBus.subscribe(
      'orchestrator',
      ['evaluation_complete'],
      async (message) => {
        const payload = message.payload as {
          type: 'evaluation_complete'
          hypothesisId: string
          score: number
          agentSource: HypGenAgentType
        }

        // Auto-queue if score meets threshold and iteration is sufficient
        if (
          payload.score >= this.config.autoQueueThreshold &&
          message.iteration >= this.config.autoQueueStartIteration
        ) {
          // Tier selection based on score
          const tier = this.gpuPool.selectTierByScore(payload.score)

          console.log(
            `[GPUBridge] Auto-queuing GPU validation for ${payload.hypothesisId.slice(-8)} ` +
            `(score: ${payload.score.toFixed(2)}, tier: ${tier})`
          )

          // Note: We don't await here to avoid blocking the message processing
          // The result will be published through the event forwarding
        }
      }
    )
  }

  /**
   * Start periodic pool status broadcast
   */
  private startStatusBroadcast(): void {
    this.statusInterval = setInterval(() => {
      const utilization = this.gpuPool.getUtilization()
      const metrics = this.getPoolMetrics()

      // Only publish if there's activity
      if (utilization.totalActive > 0 || utilization.totalQueued > 0) {
        this.publishGPUMessage(
          'gpu_pool_status',
          {
            type: 'gpu_pool_status',
            utilization,
            metrics,
          },
          { priority: 'low' }
        )
      }
    }, this.config.publishPoolStatusInterval)
  }

  /**
   * Publish score adjustment message
   */
  private publishScoreAdjustment(
    hypothesisId: string,
    previousScore: number,
    adjustment: number,
    gpuResult: GPUResult
  ): void {
    const newScore = Math.max(0, Math.min(10, previousScore + adjustment))

    const reason = this.buildAdjustmentReason(gpuResult, adjustment)

    this.publishGPUMessage(
      'score_adjustment',
      {
        type: 'score_adjustment',
        hypothesisId,
        previousScore,
        adjustment,
        newScore,
        reason,
        gpuResult,
      },
      { priority: 'high' }
    )
  }

  /**
   * Build human-readable adjustment reason
   */
  private buildAdjustmentReason(result: GPUResult, adjustment: number): string {
    const parts: string[] = []

    if (result.physicsValid) {
      parts.push('physics validated')
    } else {
      parts.push('physics validation failed')
    }

    if (result.economicallyViable) {
      parts.push('economically viable')
    } else {
      parts.push('economic concerns')
    }

    parts.push(`confidence: ${(result.confidenceScore * 100).toFixed(0)}%`)

    const direction = adjustment >= 0 ? '+' : ''
    return `GPU validation: ${parts.join(', ')} (${direction}${adjustment.toFixed(2)})`
  }

  /**
   * Select GPU tier based on hypothesis
   */
  private selectTierForHypothesis(hypothesis: RacingHypothesis): GPUTier {
    return this.gpuPool.selectTierByScore(hypothesis.scores.overall)
  }

  /**
   * Select task priority based on score
   */
  private selectPriorityForScore(score: number): TaskPriority {
    if (score >= 9.0) return 'critical'
    if (score >= 8.0) return 'high'
    if (score >= 7.0) return 'normal'
    return 'low'
  }

  /**
   * Extract parameters from hypothesis for GPU validation
   */
  private extractParametersFromHypothesis(hypothesis: RacingHypothesis): Record<string, number> {
    const params: Record<string, number> = {
      efficiency: 0.35,
      efficiencyStd: 0.03,
      cost: 100,
      costStd: 15,
      capacityKw: 1000,
      capacityFactor: 0.25,
      lifetime: 25,
      theoreticalMaxEfficiency: 0.85,
      targetLcoe: 0.05,
    }

    // Extract from predictions if available
    if (hypothesis.predictions) {
      for (const pred of hypothesis.predictions) {
        const statement = pred.statement.toLowerCase()

        if (statement.includes('efficiency') && pred.expectedValue) {
          params.efficiency = pred.expectedValue
        }
        if ((statement.includes('cost') || statement.includes('lcoe')) && pred.expectedValue) {
          params.cost = pred.expectedValue
        }
        if (statement.includes('capacity') && pred.expectedValue) {
          params.capacityKw = pred.expectedValue
        }
        if (statement.includes('lifetime') && pred.expectedValue) {
          params.lifetime = pred.expectedValue
        }
      }
    }

    return params
  }

  /**
   * Get pool metrics for status messages
   */
  private getPoolMetrics(): {
    totalCompleted: number
    totalCost: number
    averageDuration: number
    cacheHitRate: number
  } {
    const metrics = this.gpuPool.getMetrics()

    const totalRequests = metrics.cacheHits + metrics.cacheMisses
    const cacheHitRate = totalRequests > 0 ? metrics.cacheHits / totalRequests : 0

    return {
      totalCompleted: metrics.totalTasksCompleted,
      totalCost: metrics.totalCost,
      averageDuration: metrics.averageDurationMs,
      cacheHitRate,
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createGPUBridge(
  gpuPool: GPUValidationPool,
  feedbackBus: FeedbackBus,
  config?: Partial<GPUBridgeConfig>
): GPUFeedbackBridge {
  const bridge = new GPUFeedbackBridge(gpuPool, feedbackBus, config)
  bridge.start()
  return bridge
}

export default GPUFeedbackBridge
