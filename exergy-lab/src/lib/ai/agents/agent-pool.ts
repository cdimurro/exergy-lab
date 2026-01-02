/**
 * Agent Pool
 *
 * Manages concurrent execution of multiple HypGen agents for the Breakthrough Engine.
 * Provides parallel hypothesis generation with configurable concurrency limits.
 *
 * @see hypgen/index.ts - HypGen agent implementations
 * @see hypothesis-racer.ts - Racing arena that uses this pool
 */

import {
  createAllHypGenAgents,
  type BaseHypGenAgent,
  type HypGenAgentType,
  type HypGenConfig,
  type GenerationContext,
  type GenerationResult,
  type RacingHypothesis,
} from './hypgen'
import type { RefinementFeedback } from '../rubrics/types-breakthrough'

// ============================================================================
// Types
// ============================================================================

export interface AgentPoolConfig {
  maxConcurrency: number
  timeoutMs: number
  retryAttempts: number
  retryDelayMs: number
  enabledAgents: HypGenAgentType[]
}

export const DEFAULT_POOL_CONFIG: AgentPoolConfig = {
  maxConcurrency: 6, // All 6 agents in parallel (v0.0.4.0: added fusion)
  timeoutMs: 60000, // 60 seconds per generation
  retryAttempts: 2,
  retryDelayMs: 1000,
  enabledAgents: ['novel', 'feasible', 'economic', 'cross-domain', 'paradigm', 'fusion'],
}

export interface AgentStatus {
  agentType: HypGenAgentType
  status: 'idle' | 'generating' | 'refining' | 'completed' | 'failed'
  lastGenerationId?: string
  hypothesesGenerated: number
  currentIteration: number
  errors: string[]
  startTime?: number
  endTime?: number
}

export interface PoolStatus {
  agents: Map<HypGenAgentType, AgentStatus>
  totalHypothesesGenerated: number
  activeGenerations: number
  completedGenerations: number
  failedGenerations: number
}

export interface PoolGenerationResult {
  results: GenerationResult[]
  poolStatus: PoolStatus
  totalTimeMs: number
  hypothesesByAgent: Map<HypGenAgentType, RacingHypothesis[]>
}

export type PoolEventType =
  | 'agent_started'
  | 'agent_completed'
  | 'agent_failed'
  | 'agent_zero_hypotheses'
  | 'generation_warning'
  | 'hypothesis_generated'
  | 'pool_complete'

export interface PoolEvent {
  type: PoolEventType
  agentType?: HypGenAgentType
  generationId?: string
  hypotheses?: RacingHypothesis[]
  error?: string
  timestamp: number
}

export type PoolEventCallback = (event: PoolEvent) => void

// ============================================================================
// Agent Pool Class
// ============================================================================

export class AgentPool {
  private config: AgentPoolConfig
  private agents: Map<HypGenAgentType, BaseHypGenAgent>
  private agentStatuses: Map<HypGenAgentType, AgentStatus>
  private eventCallbacks: PoolEventCallback[] = []
  private abortController: AbortController | null = null

  constructor(
    config: Partial<AgentPoolConfig> = {},
    agentConfig?: Partial<HypGenConfig>
  ) {
    this.config = { ...DEFAULT_POOL_CONFIG, ...config }

    // Create only enabled agents
    const allAgents = createAllHypGenAgents(agentConfig)
    this.agents = new Map()

    for (const type of this.config.enabledAgents) {
      const agent = allAgents.get(type)
      if (agent) {
        this.agents.set(type, agent)
      }
    }

    // Initialize statuses
    this.agentStatuses = new Map()
    for (const type of this.config.enabledAgents) {
      this.agentStatuses.set(type, {
        agentType: type,
        status: 'idle',
        hypothesesGenerated: 0,
        currentIteration: 0,
        errors: [],
      })
    }
  }

  /**
   * Subscribe to pool events
   */
  onEvent(callback: PoolEventCallback): () => void {
    this.eventCallbacks.push(callback)
    return () => {
      const index = this.eventCallbacks.indexOf(callback)
      if (index >= 0) {
        this.eventCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Emit an event to all subscribers
   */
  private emit(event: PoolEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event)
      } catch (error) {
        console.error('[AgentPool] Event callback error:', error)
      }
    }
  }

  /**
   * Get current pool status
   */
  getStatus(): PoolStatus {
    let totalHypotheses = 0
    let activeGenerations = 0
    let completedGenerations = 0
    let failedGenerations = 0

    for (const status of this.agentStatuses.values()) {
      totalHypotheses += status.hypothesesGenerated
      if (status.status === 'generating' || status.status === 'refining') {
        activeGenerations++
      } else if (status.status === 'completed') {
        completedGenerations++
      } else if (status.status === 'failed') {
        failedGenerations++
      }
    }

    return {
      agents: new Map(this.agentStatuses),
      totalHypothesesGenerated: totalHypotheses,
      activeGenerations,
      completedGenerations,
      failedGenerations,
    }
  }

  /**
   * Generate hypotheses from all agents in parallel
   */
  async generateAll(context: GenerationContext): Promise<PoolGenerationResult> {
    const startTime = Date.now()
    this.abortController = new AbortController()

    console.log(`[AgentPool] Starting parallel generation (${this.agents.size} agents)`)

    // Reset statuses
    for (const type of this.config.enabledAgents) {
      this.updateAgentStatus(type, {
        status: 'generating',
        currentIteration: context.iteration,
        startTime: Date.now(),
      })
    }

    // Create generation promises for all agents
    const generationPromises = Array.from(this.agents.entries()).map(
      ([type, agent]) => this.generateWithAgent(type, agent, context)
    )

    // Run with concurrency limit
    const results = await this.runWithConcurrency(generationPromises)

    // Aggregate results
    const successfulResults = results.filter((r): r is GenerationResult => r !== null)
    const hypothesesByAgent = new Map<HypGenAgentType, RacingHypothesis[]>()

    for (const result of successfulResults) {
      hypothesesByAgent.set(result.agentType, result.hypotheses)
    }

    // Check for agents that produced 0 hypotheses
    const zeroHypothesisAgents: HypGenAgentType[] = []
    for (const [agentType, hypotheses] of hypothesesByAgent) {
      if (hypotheses.length === 0) {
        console.error(`[AgentPool] Agent ${agentType} produced 0 hypotheses`)
        zeroHypothesisAgents.push(agentType)
        this.emit({
          type: 'agent_zero_hypotheses',
          agentType,
          timestamp: Date.now(),
        })
      }
    }

    // Calculate actual total hypotheses
    const totalHypotheses = [...hypothesesByAgent.values()].reduce((sum, h) => sum + h.length, 0)

    // Warn if below minimum threshold
    if (totalHypotheses < 5) {
      console.error(`[AgentPool] Low hypothesis count: only ${totalHypotheses} generated (expected ~25)`)
      this.emit({
        type: 'generation_warning',
        timestamp: Date.now(),
        error: `Only ${totalHypotheses} hypotheses generated from ${successfulResults.length} agents`,
      })
    }

    const poolStatus = this.getStatus()
    const totalTimeMs = Date.now() - startTime

    console.log(
      `[AgentPool] Generation complete: ${successfulResults.length} agents succeeded, ` +
      `${totalHypotheses} hypotheses generated in ${totalTimeMs}ms` +
      (zeroHypothesisAgents.length > 0 ? ` (${zeroHypothesisAgents.join(', ')} produced 0)` : '')
    )

    this.emit({
      type: 'pool_complete',
      timestamp: Date.now(),
    })

    return {
      results: successfulResults,
      poolStatus,
      totalTimeMs,
      hypothesesByAgent,
    }
  }

  /**
   * Refine hypotheses for specific agents
   */
  async refineHypotheses(
    hypotheses: RacingHypothesis[],
    feedback: Map<string, RefinementFeedback>,
    context: GenerationContext
  ): Promise<RacingHypothesis[]> {
    console.log(`[AgentPool] Refining ${hypotheses.length} hypotheses`)

    // Group hypotheses by agent
    const byAgent = new Map<HypGenAgentType, RacingHypothesis[]>()
    for (const h of hypotheses) {
      const existing = byAgent.get(h.agentSource) || []
      existing.push(h)
      byAgent.set(h.agentSource, existing)
    }

    // Refine in parallel per agent
    const refinementPromises: Promise<RacingHypothesis[]>[] = []

    for (const [agentType, agentHypotheses] of byAgent.entries()) {
      const agent = this.agents.get(agentType)
      if (!agent) continue

      this.updateAgentStatus(agentType, { status: 'refining' })

      const promise = this.refineAgentHypotheses(
        agentType,
        agent,
        agentHypotheses,
        feedback,
        context
      )
      refinementPromises.push(promise)
    }

    const results = await Promise.all(refinementPromises)
    return results.flat()
  }

  /**
   * Stop all running generations
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }

    for (const type of this.config.enabledAgents) {
      const status = this.agentStatuses.get(type)
      if (status?.status === 'generating' || status?.status === 'refining') {
        this.updateAgentStatus(type, { status: 'failed', errors: [...(status.errors || []), 'Aborted'] })
      }
    }
  }

  /**
   * Generate with a single agent (with retry logic)
   */
  private async generateWithAgent(
    type: HypGenAgentType,
    agent: BaseHypGenAgent,
    context: GenerationContext
  ): Promise<GenerationResult | null> {
    this.emit({
      type: 'agent_started',
      agentType: type,
      timestamp: Date.now(),
    })

    let attempts = 0

    while (attempts < this.config.retryAttempts) {
      try {
        // Check for abort
        if (this.abortController?.signal.aborted) {
          throw new Error('Generation aborted')
        }

        // Generate with timeout
        const result = await this.withTimeout(
          agent.generate(context),
          this.config.timeoutMs
        )

        // Update status
        this.updateAgentStatus(type, {
          status: 'completed',
          lastGenerationId: result.generationId,
          hypothesesGenerated:
            (this.agentStatuses.get(type)?.hypothesesGenerated || 0) + result.hypotheses.length,
          endTime: Date.now(),
        })

        this.emit({
          type: 'agent_completed',
          agentType: type,
          generationId: result.generationId,
          hypotheses: result.hypotheses,
          timestamp: Date.now(),
        })

        return result
      } catch (error) {
        attempts++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        console.warn(
          `[AgentPool] Agent ${type} attempt ${attempts} failed:`,
          errorMessage
        )

        if (attempts < this.config.retryAttempts) {
          await this.delay(this.config.retryDelayMs * attempts) // Exponential backoff
        } else {
          this.updateAgentStatus(type, {
            status: 'failed',
            errors: [...(this.agentStatuses.get(type)?.errors || []), errorMessage],
            endTime: Date.now(),
          })

          this.emit({
            type: 'agent_failed',
            agentType: type,
            error: errorMessage,
            timestamp: Date.now(),
          })

          return null
        }
      }
    }

    return null
  }

  /**
   * Refine hypotheses for a single agent
   */
  private async refineAgentHypotheses(
    type: HypGenAgentType,
    agent: BaseHypGenAgent,
    hypotheses: RacingHypothesis[],
    feedback: Map<string, RefinementFeedback>,
    context: GenerationContext
  ): Promise<RacingHypothesis[]> {
    const refined: RacingHypothesis[] = []

    for (const hypothesis of hypotheses) {
      const hypothesisFeedback = feedback.get(hypothesis.id)
      if (!hypothesisFeedback) {
        refined.push(hypothesis) // No feedback, keep as-is
        continue
      }

      try {
        // Bug 2.2 fix: Include previousFeedback in context for each hypothesis
        const hypothesisContext: GenerationContext = {
          ...context,
          previousFeedback: hypothesisFeedback,
        }
        const refinedHypothesis = await agent.refine(hypothesis, hypothesisFeedback, hypothesisContext)
        refined.push(refinedHypothesis)
      } catch (error) {
        console.error(`[AgentPool] Failed to refine ${hypothesis.id}:`, error)
        refined.push(hypothesis) // Keep original on failure
      }
    }

    this.updateAgentStatus(type, { status: 'completed' })
    return refined
  }

  /**
   * Run promises with concurrency limit
   * Uses Promise.allSettled to ensure ALL promises complete before returning
   */
  private async runWithConcurrency<T>(
    promises: Promise<T>[],
  ): Promise<T[]> {
    // Use Promise.allSettled to wait for ALL promises to complete
    // This fixes the race condition where we were returning before all agents finished
    const settledResults = await Promise.allSettled(promises)

    // Extract successful results
    const results: T[] = []
    for (const result of settledResults) {
      if (result.status === 'fulfilled' && result.value !== null) {
        results.push(result.value)
      }
    }

    return results
  }

  /**
   * Wrap promise with timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Generation timeout')), timeoutMs)
      ),
    ])
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Update agent status
   */
  private updateAgentStatus(
    type: HypGenAgentType,
    update: Partial<AgentStatus>
  ): void {
    const current = this.agentStatuses.get(type)
    if (current) {
      this.agentStatuses.set(type, { ...current, ...update })
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAgentPool(
  config?: Partial<AgentPoolConfig>,
  agentConfig?: Partial<HypGenConfig>
): AgentPool {
  return new AgentPool(config, agentConfig)
}
