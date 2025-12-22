/**
 * Feedback Bus
 *
 * Real-time inter-agent communication system for the Breakthrough Engine.
 * Enables the iterative refinement loop by broadcasting events between
 * evaluator, refinement agent, and HypGen agents.
 *
 * @see breakthrough-evaluator.ts - Emits evaluation events
 * @see enhanced-refinement-agent.ts - Generates feedback
 * @see hypgen/base.ts - Receives feedback for refinement
 */

import type { RacingHypothesis, HypGenAgentType } from './hypgen/base'
import type { HypothesisEvaluation, LeaderboardEntry } from './breakthrough-evaluator'
import type { RefinementFeedback, ClassificationTier } from '../rubrics/types-breakthrough'

// ============================================================================
// Types
// ============================================================================

export type FeedbackMessageType =
  | 'evaluation_complete'
  | 'refinement_ready'
  | 'hypothesis_improved'
  | 'hypothesis_eliminated'
  | 'breakthrough_found'
  | 'iteration_complete'
  | 'race_update'
  | 'error'

export type MessagePriority = 'critical' | 'high' | 'normal' | 'low'

export interface FeedbackMessage {
  id: string
  type: FeedbackMessageType
  sourceAgent: AgentId
  targetAgents: AgentId[] | 'broadcast'
  payload: MessagePayload
  priority: MessagePriority
  iteration: number
  timestamp: number
  metadata?: Record<string, unknown>
}

export type AgentId =
  | 'evaluator'
  | 'refinement-agent'
  | 'racing-arena'
  | `hypgen-${HypGenAgentType}`
  | 'orchestrator'

export type MessagePayload =
  | EvaluationCompletePayload
  | RefinementReadyPayload
  | HypothesisImprovedPayload
  | HypothesisEliminatedPayload
  | BreakthroughFoundPayload
  | IterationCompletePayload
  | RaceUpdatePayload
  | ErrorPayload

export interface EvaluationCompletePayload {
  type: 'evaluation_complete'
  hypothesisId: string
  agentSource: HypGenAgentType
  score: number
  previousScore?: number
  classification: ClassificationTier
  evaluation: HypothesisEvaluation
}

export interface RefinementReadyPayload {
  type: 'refinement_ready'
  hypothesisId: string
  agentSource: HypGenAgentType
  feedback: RefinementFeedback
}

export interface HypothesisImprovedPayload {
  type: 'hypothesis_improved'
  hypothesisId: string
  agentSource: HypGenAgentType
  previousScore: number
  newScore: number
  hypothesis: RacingHypothesis
}

export interface HypothesisEliminatedPayload {
  type: 'hypothesis_eliminated'
  hypothesisId: string
  agentSource: HypGenAgentType
  finalScore: number
  reason: string
}

export interface BreakthroughFoundPayload {
  type: 'breakthrough_found'
  hypothesisId: string
  agentSource: HypGenAgentType
  score: number
  classification: ClassificationTier
  hypothesis: RacingHypothesis
}

export interface IterationCompletePayload {
  type: 'iteration_complete'
  iteration: number
  maxIterations: number
  activeCount: number
  eliminatedCount: number
  breakthroughCount: number
  leaderboard: LeaderboardEntry[]
}

export interface RaceUpdatePayload {
  type: 'race_update'
  iteration: number
  activeHypotheses: number
  eliminatedHypotheses: number
  breakthroughCandidates: number
  topScore: number
  averageScore: number
}

export interface ErrorPayload {
  type: 'error'
  source: AgentId
  error: string
  recoverable: boolean
}

export type MessageHandler = (message: FeedbackMessage) => void | Promise<void>

export interface Subscription {
  id: string
  agent: AgentId
  messageTypes: FeedbackMessageType[] | 'all'
  handler: MessageHandler
}

export interface BusConfig {
  maxQueueSize: number
  processInterval: number
  enableLogging: boolean
  retainHistory: boolean
  historyLimit: number
}

export const DEFAULT_BUS_CONFIG: BusConfig = {
  maxQueueSize: 1000,
  processInterval: 10, // ms
  enableLogging: true,
  retainHistory: true,
  historyLimit: 500,
}

// ============================================================================
// Feedback Bus Class
// ============================================================================

export class FeedbackBus {
  private config: BusConfig
  private subscriptions: Map<string, Subscription> = new Map()
  private messageQueue: FeedbackMessage[] = []
  private messageHistory: FeedbackMessage[] = []
  private messageCounter: number = 0
  private processing: boolean = false
  private processTimer: ReturnType<typeof setInterval> | null = null

  constructor(config: Partial<BusConfig> = {}) {
    this.config = { ...DEFAULT_BUS_CONFIG, ...config }
  }

  /**
   * Start the message processing loop
   */
  start(): void {
    if (this.processTimer) return

    this.processTimer = setInterval(() => {
      this.processQueue()
    }, this.config.processInterval)

    if (this.config.enableLogging) {
      console.log('[FeedbackBus] Started message processing')
    }
  }

  /**
   * Stop the message processing loop
   */
  stop(): void {
    if (this.processTimer) {
      clearInterval(this.processTimer)
      this.processTimer = null
    }

    if (this.config.enableLogging) {
      console.log('[FeedbackBus] Stopped message processing')
    }
  }

  /**
   * Subscribe to messages
   */
  subscribe(
    agent: AgentId,
    messageTypes: FeedbackMessageType[] | 'all',
    handler: MessageHandler
  ): string {
    const id = `sub-${agent}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    this.subscriptions.set(id, {
      id,
      agent,
      messageTypes,
      handler,
    })

    if (this.config.enableLogging) {
      console.log(`[FeedbackBus] ${agent} subscribed (${id})`)
    }

    return id
  }

  /**
   * Unsubscribe from messages
   */
  unsubscribe(subscriptionId: string): boolean {
    const removed = this.subscriptions.delete(subscriptionId)

    if (removed && this.config.enableLogging) {
      console.log(`[FeedbackBus] Unsubscribed (${subscriptionId})`)
    }

    return removed
  }

  /**
   * Publish a message to the bus
   */
  publish(
    type: FeedbackMessageType,
    source: AgentId,
    target: AgentId[] | 'broadcast',
    payload: Omit<MessagePayload, 'type'>,
    options: {
      priority?: MessagePriority
      iteration?: number
      metadata?: Record<string, unknown>
    } = {}
  ): string {
    const message: FeedbackMessage = {
      id: this.generateMessageId(),
      type,
      sourceAgent: source,
      targetAgents: target,
      payload: { ...payload, type } as MessagePayload,
      priority: options.priority || 'normal',
      iteration: options.iteration || 0,
      timestamp: Date.now(),
      metadata: options.metadata,
    }

    // Add to queue based on priority
    this.enqueue(message)

    if (this.config.enableLogging) {
      console.log(
        `[FeedbackBus] Published: ${type} from ${source} ` +
        `(priority: ${message.priority}, queue: ${this.messageQueue.length})`
      )
    }

    return message.id
  }

  /**
   * Publish an evaluation complete message
   */
  publishEvaluationComplete(
    source: AgentId,
    evaluation: HypothesisEvaluation,
    hypothesis: RacingHypothesis
  ): string {
    return this.publish(
      'evaluation_complete',
      source,
      ['refinement-agent', 'racing-arena'],
      {
        hypothesisId: evaluation.hypothesisId,
        agentSource: evaluation.agentSource,
        score: evaluation.overallScore,
        previousScore: evaluation.previousScore,
        classification: evaluation.classification,
        evaluation,
      },
      { priority: 'high', iteration: evaluation.iteration }
    )
  }

  /**
   * Publish refinement feedback ready
   */
  publishRefinementReady(
    feedback: RefinementFeedback,
    iteration: number
  ): string {
    const targetAgent = `hypgen-${feedback.targetAgent}` as AgentId

    return this.publish(
      'refinement_ready',
      'refinement-agent',
      [targetAgent],
      {
        hypothesisId: feedback.hypothesisId,
        agentSource: feedback.targetAgent,
        feedback,
      },
      { priority: 'high', iteration }
    )
  }

  /**
   * Publish hypothesis eliminated
   */
  publishHypothesisEliminated(
    hypothesis: RacingHypothesis,
    reason: string,
    iteration: number
  ): string {
    return this.publish(
      'hypothesis_eliminated',
      'evaluator',
      'broadcast',
      {
        hypothesisId: hypothesis.id,
        agentSource: hypothesis.agentSource,
        finalScore: hypothesis.scores.overall,
        reason,
      },
      { priority: 'normal', iteration }
    )
  }

  /**
   * Publish breakthrough found
   */
  publishBreakthroughFound(
    hypothesis: RacingHypothesis,
    classification: ClassificationTier,
    iteration: number
  ): string {
    return this.publish(
      'breakthrough_found',
      'evaluator',
      'broadcast',
      {
        hypothesisId: hypothesis.id,
        agentSource: hypothesis.agentSource,
        score: hypothesis.scores.overall,
        classification,
        hypothesis,
      },
      { priority: 'critical', iteration }
    )
  }

  /**
   * Publish iteration complete
   */
  publishIterationComplete(
    iteration: number,
    maxIterations: number,
    stats: {
      activeCount: number
      eliminatedCount: number
      breakthroughCount: number
      leaderboard: LeaderboardEntry[]
    }
  ): string {
    return this.publish(
      'iteration_complete',
      'racing-arena',
      'broadcast',
      {
        iteration,
        maxIterations,
        ...stats,
      },
      { priority: 'high', iteration }
    )
  }

  /**
   * Publish race update (lightweight status)
   */
  publishRaceUpdate(
    iteration: number,
    stats: {
      activeHypotheses: number
      eliminatedHypotheses: number
      breakthroughCandidates: number
      topScore: number
      averageScore: number
    }
  ): string {
    return this.publish(
      'race_update',
      'racing-arena',
      ['orchestrator'],
      {
        iteration,
        ...stats,
      },
      { priority: 'normal', iteration }
    )
  }

  /**
   * Publish error
   */
  publishError(
    source: AgentId,
    error: string,
    recoverable: boolean = true
  ): string {
    return this.publish(
      'error',
      source,
      'broadcast',
      {
        source,
        error,
        recoverable,
      },
      { priority: recoverable ? 'high' : 'critical' }
    )
  }

  /**
   * Get message history for an agent
   */
  getHistory(agent?: AgentId, limit?: number): FeedbackMessage[] {
    let history = this.messageHistory

    if (agent) {
      history = history.filter(
        m => m.sourceAgent === agent ||
          m.targetAgents === 'broadcast' ||
          (Array.isArray(m.targetAgents) && m.targetAgents.includes(agent))
      )
    }

    return history.slice(-(limit || this.config.historyLimit))
  }

  /**
   * Get pending messages count
   */
  getPendingCount(): number {
    return this.messageQueue.length
  }

  /**
   * Clear all state
   */
  clear(): void {
    this.messageQueue = []
    this.messageHistory = []
    this.subscriptions.clear()
    this.messageCounter = 0
  }

  /**
   * Wait for a specific message type
   */
  async waitFor(
    messageType: FeedbackMessageType,
    timeout: number = 30000
  ): Promise<FeedbackMessage> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.unsubscribe(subId)
        reject(new Error(`Timeout waiting for ${messageType}`))
      }, timeout)

      const subId = this.subscribe('orchestrator', [messageType], (message) => {
        clearTimeout(timer)
        this.unsubscribe(subId)
        resolve(message)
      })
    })
  }

  /**
   * Wait for all agents to complete an iteration
   */
  async waitForIteration(iteration: number, timeout: number = 60000): Promise<FeedbackMessage> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.unsubscribe(subId)
        reject(new Error(`Timeout waiting for iteration ${iteration}`))
      }, timeout)

      const subId = this.subscribe('orchestrator', ['iteration_complete'], (message) => {
        const payload = message.payload as IterationCompletePayload
        if (payload.iteration === iteration) {
          clearTimeout(timer)
          this.unsubscribe(subId)
          resolve(message)
        }
      })
    })
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Enqueue message based on priority
   */
  private enqueue(message: FeedbackMessage): void {
    // Enforce queue size limit
    if (this.messageQueue.length >= this.config.maxQueueSize) {
      // Remove lowest priority, oldest message
      const lowestPriorityIndex = this.findLowestPriorityMessage()
      if (lowestPriorityIndex >= 0) {
        this.messageQueue.splice(lowestPriorityIndex, 1)
      }
    }

    // Insert based on priority
    const priorityOrder: Record<MessagePriority, number> = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3,
    }

    const insertIndex = this.messageQueue.findIndex(
      m => priorityOrder[m.priority] > priorityOrder[message.priority]
    )

    if (insertIndex === -1) {
      this.messageQueue.push(message)
    } else {
      this.messageQueue.splice(insertIndex, 0, message)
    }
  }

  /**
   * Find the lowest priority message (for removal when queue is full)
   */
  private findLowestPriorityMessage(): number {
    const priorityOrder: Record<MessagePriority, number> = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3,
    }

    let lowestIndex = -1
    let lowestPriority = -1

    for (let i = 0; i < this.messageQueue.length; i++) {
      const priority = priorityOrder[this.messageQueue[i].priority]
      if (priority > lowestPriority) {
        lowestPriority = priority
        lowestIndex = i
      }
    }

    return lowestIndex
  }

  /**
   * Process the message queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.messageQueue.length === 0) return

    this.processing = true

    try {
      // Process up to 10 messages per tick
      const batchSize = Math.min(10, this.messageQueue.length)

      for (let i = 0; i < batchSize; i++) {
        const message = this.messageQueue.shift()
        if (!message) break

        await this.deliverMessage(message)

        // Add to history
        if (this.config.retainHistory) {
          this.messageHistory.push(message)
          if (this.messageHistory.length > this.config.historyLimit) {
            this.messageHistory.shift()
          }
        }
      }
    } finally {
      this.processing = false
    }
  }

  /**
   * Deliver a message to matching subscribers
   */
  private async deliverMessage(message: FeedbackMessage): Promise<void> {
    const matchingSubscriptions = Array.from(this.subscriptions.values()).filter(sub => {
      // Check message type match
      const typeMatch = sub.messageTypes === 'all' ||
        sub.messageTypes.includes(message.type)

      if (!typeMatch) return false

      // Check target match
      if (message.targetAgents === 'broadcast') return true
      return message.targetAgents.includes(sub.agent)
    })

    // Deliver to all matching subscriptions
    await Promise.all(
      matchingSubscriptions.map(async sub => {
        try {
          await sub.handler(message)
        } catch (error) {
          console.error(`[FeedbackBus] Handler error for ${sub.agent}:`, error)
        }
      })
    )
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    this.messageCounter++
    return `msg-${Date.now()}-${this.messageCounter}`
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createFeedbackBus(config?: Partial<BusConfig>): FeedbackBus {
  return new FeedbackBus(config)
}

// ============================================================================
// Singleton Instance (Optional)
// ============================================================================

let globalBus: FeedbackBus | null = null

export function getGlobalFeedbackBus(): FeedbackBus {
  if (!globalBus) {
    globalBus = new FeedbackBus()
    globalBus.start()
  }
  return globalBus
}

export function resetGlobalFeedbackBus(): void {
  if (globalBus) {
    globalBus.stop()
    globalBus.clear()
    globalBus = null
  }
}
