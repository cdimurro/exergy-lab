import {
  Checkpoint,
  CheckpointPhase,
  ConversationSession,
  AgentResult,
  AgentStep,
  ToolCall,
  ToolResult,
} from '@/types/agent'

/**
 * Checkpoint & Resume System
 *
 * Provides fault-tolerant agent execution through:
 * - Automatic checkpoint creation at phase boundaries
 * - State serialization and persistence
 * - Resume from last successful checkpoint
 * - Checkpoint expiration and cleanup
 * - Multi-level checkpoint strategies
 */

/**
 * Checkpoint Manager
 *
 * Manages checkpoint lifecycle and storage
 */
export class CheckpointManager {
  private checkpoints: Map<string, Checkpoint> = new Map()
  private defaultTTL: number = 24 * 60 * 60 * 1000 // 24 hours

  /**
   * Create a checkpoint
   */
  async createCheckpoint(
    sessionId: string,
    step: number,
    phase: CheckpointPhase,
    context: {
      query: string
      plan?: any
      toolResults?: ToolResult[]
      analysis?: any
      iterationCount?: number
      steps?: AgentStep[]
      toolCalls?: ToolCall[]
    }
  ): Promise<Checkpoint> {
    const checkpointId = this.generateCheckpointId(sessionId, step)
    const now = Date.now()

    const checkpoint: Checkpoint = {
      id: checkpointId,
      sessionId,
      step,
      phase,
      context,
      toolResults: context.toolResults || [],
      timestamp: now,
      ttl: now + this.defaultTTL,
    }

    this.checkpoints.set(checkpointId, checkpoint)

    // Persist to storage
    await this.persistCheckpoint(checkpoint)

    console.log(`[CheckpointManager] Created checkpoint: ${checkpointId} at phase ${phase}`)

    return checkpoint
  }

  /**
   * Get a checkpoint by ID
   */
  getCheckpoint(checkpointId: string): Checkpoint | undefined {
    const checkpoint = this.checkpoints.get(checkpointId)

    // Check if expired
    if (checkpoint && Date.now() > checkpoint.ttl) {
      console.warn(`[CheckpointManager] Checkpoint ${checkpointId} has expired`)
      this.checkpoints.delete(checkpointId)
      return undefined
    }

    return checkpoint
  }

  /**
   * Get latest checkpoint for a session
   */
  getLatestCheckpoint(sessionId: string): Checkpoint | undefined {
    const sessionCheckpoints = Array.from(this.checkpoints.values())
      .filter((cp) => cp.sessionId === sessionId)
      .filter((cp) => Date.now() <= cp.ttl)
      .sort((a, b) => b.step - a.step)

    return sessionCheckpoints[0]
  }

  /**
   * Get all checkpoints for a session
   */
  getSessionCheckpoints(sessionId: string): Checkpoint[] {
    return Array.from(this.checkpoints.values())
      .filter((cp) => cp.sessionId === sessionId)
      .filter((cp) => Date.now() <= cp.ttl)
      .sort((a, b) => a.step - b.step)
  }

  /**
   * Delete a checkpoint
   */
  deleteCheckpoint(checkpointId: string): boolean {
    return this.checkpoints.delete(checkpointId)
  }

  /**
   * Delete all checkpoints for a session
   */
  deleteSessionCheckpoints(sessionId: string): void {
    const sessionCheckpoints = Array.from(this.checkpoints.entries())
      .filter(([_, cp]) => cp.sessionId === sessionId)

    for (const [id, _] of sessionCheckpoints) {
      this.checkpoints.delete(id)
    }

    console.log(`[CheckpointManager] Deleted checkpoints for session ${sessionId}`)
  }

  /**
   * Clean up expired checkpoints
   */
  cleanupExpired(): number {
    const now = Date.now()
    let count = 0

    for (const [id, checkpoint] of this.checkpoints.entries()) {
      if (now > checkpoint.ttl) {
        this.checkpoints.delete(id)
        count++
      }
    }

    if (count > 0) {
      console.log(`[CheckpointManager] Cleaned up ${count} expired checkpoints`)
    }

    return count
  }

  /**
   * Persist checkpoint to storage
   */
  private async persistCheckpoint(checkpoint: Checkpoint): Promise<void> {
    try {
      // Store in localStorage for browser persistence
      if (typeof window !== 'undefined') {
        const key = `checkpoint_${checkpoint.id}`
        localStorage.setItem(key, JSON.stringify(checkpoint))
      }

      // Also persist to server if available
      await this.saveToServer(checkpoint)
    } catch (error) {
      console.error('[CheckpointManager] Failed to persist checkpoint:', error)
    }
  }

  /**
   * Save checkpoint to server
   */
  private async saveToServer(checkpoint: Checkpoint): Promise<void> {
    try {
      const response = await fetch('/api/checkpoints/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkpoint),
      })

      if (!response.ok) {
        console.warn('[CheckpointManager] Server save failed:', response.statusText)
      }
    } catch (error) {
      // Non-critical error - checkpoint is still in memory
      console.debug('[CheckpointManager] Server unavailable for checkpoint save')
    }
  }

  /**
   * Generate checkpoint ID
   */
  private generateCheckpointId(sessionId: string, step: number): string {
    return `cp_${sessionId}_step${step}_${Date.now()}`
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number
    active: number
    expired: number
    sessions: number
  } {
    const now = Date.now()
    const all = Array.from(this.checkpoints.values())
    const active = all.filter((cp) => now <= cp.ttl)
    const expired = all.filter((cp) => now > cp.ttl)
    const sessions = new Set(all.map((cp) => cp.sessionId)).size

    return {
      total: all.length,
      active: active.length,
      expired: expired.length,
      sessions,
    }
  }
}

/**
 * Checkpoint Strategy
 *
 * Determines when to create checkpoints during agent execution
 */
export class CheckpointStrategy {
  /**
   * Should create checkpoint for this phase?
   */
  shouldCheckpoint(phase: CheckpointPhase, step: number): boolean {
    // Always checkpoint at phase boundaries
    const phaseCheckpoints: CheckpointPhase[] = ['plan', 'execute', 'analyze', 'respond']

    if (phaseCheckpoints.includes(phase)) {
      return true
    }

    // Checkpoint every N steps during iteration
    if (phase === 'iterate' && step % 2 === 0) {
      return true
    }

    return false
  }

  /**
   * Get checkpoint interval for a phase
   */
  getCheckpointInterval(phase: CheckpointPhase): number {
    const intervals: Record<CheckpointPhase, number> = {
      plan: 1, // Every plan
      execute: 1, // After each tool execution batch
      analyze: 1, // After each analysis
      iterate: 2, // Every 2 iterations
      respond: 1, // After response generation
    }

    return intervals[phase] || 1
  }
}

/**
 * Resume Agent Execution from Checkpoint
 *
 * Reconstructs agent state and continues execution
 */
export class CheckpointResumer {
  private checkpointManager: CheckpointManager

  constructor(checkpointManager: CheckpointManager) {
    this.checkpointManager = checkpointManager
  }

  /**
   * Resume execution from a checkpoint
   */
  async resumeFromCheckpoint(
    checkpointId: string,
    continueExecution: (context: any) => Promise<AgentResult>
  ): Promise<AgentResult> {
    const checkpoint = this.checkpointManager.getCheckpoint(checkpointId)

    if (!checkpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found or expired`)
    }

    console.log(
      `[CheckpointResumer] Resuming from checkpoint ${checkpointId} at phase ${checkpoint.phase}`
    )

    try {
      // Reconstruct agent state from checkpoint
      const context = this.reconstructContext(checkpoint)

      // Continue execution from this point
      const result = await continueExecution(context)

      // Delete checkpoint on successful completion
      this.checkpointManager.deleteCheckpoint(checkpointId)

      return result
    } catch (error) {
      console.error('[CheckpointResumer] Failed to resume from checkpoint:', error)
      throw error
    }
  }

  /**
   * Resume from latest checkpoint in a session
   */
  async resumeFromLatest(
    sessionId: string,
    continueExecution: (context: any) => Promise<AgentResult>
  ): Promise<AgentResult> {
    const latestCheckpoint = this.checkpointManager.getLatestCheckpoint(sessionId)

    if (!latestCheckpoint) {
      throw new Error(`No valid checkpoints found for session ${sessionId}`)
    }

    return this.resumeFromCheckpoint(latestCheckpoint.id, continueExecution)
  }

  /**
   * Reconstruct agent context from checkpoint
   */
  private reconstructContext(checkpoint: Checkpoint): any {
    return {
      sessionId: checkpoint.sessionId,
      step: checkpoint.step,
      phase: checkpoint.phase,
      query: checkpoint.context.query,
      plan: checkpoint.context.plan,
      toolResults: checkpoint.toolResults,
      analysis: checkpoint.context.analysis,
      iterationCount: checkpoint.context.iterationCount || 0,
      steps: checkpoint.context.steps || [],
      toolCalls: checkpoint.context.toolCalls || [],
      resumedFrom: checkpoint.id,
      resumedAt: Date.now(),
    }
  }

  /**
   * Check if a session can be resumed
   */
  canResume(sessionId: string): boolean {
    const checkpoint = this.checkpointManager.getLatestCheckpoint(sessionId)
    return checkpoint !== undefined
  }

  /**
   * Get resume information for a session
   */
  getResumeInfo(sessionId: string): {
    canResume: boolean
    latestCheckpoint?: Checkpoint
    checkpointCount: number
  } {
    const checkpoints = this.checkpointManager.getSessionCheckpoints(sessionId)
    const latest = checkpoints[checkpoints.length - 1]

    return {
      canResume: latest !== undefined,
      latestCheckpoint: latest,
      checkpointCount: checkpoints.length,
    }
  }
}

/**
 * Checkpoint-Aware Agent Wrapper
 *
 * Wraps agent execution with automatic checkpointing
 */
export class CheckpointedAgent {
  private checkpointManager: CheckpointManager
  private checkpointStrategy: CheckpointStrategy
  private resumer: CheckpointResumer

  constructor() {
    this.checkpointManager = new CheckpointManager()
    this.checkpointStrategy = new CheckpointStrategy()
    this.resumer = new CheckpointResumer(this.checkpointManager)
  }

  /**
   * Execute with automatic checkpointing
   */
  async executeWithCheckpoints(
    sessionId: string,
    execution: (createCheckpoint: CheckpointCallback) => Promise<AgentResult>
  ): Promise<AgentResult> {
    // Create checkpoint callback
    const createCheckpoint: CheckpointCallback = async (step, phase, context) => {
      if (this.checkpointStrategy.shouldCheckpoint(phase, step)) {
        await this.checkpointManager.createCheckpoint(sessionId, step, phase, context)
      }
    }

    try {
      const result = await execution(createCheckpoint)

      // Clean up checkpoints on success
      this.checkpointManager.deleteSessionCheckpoints(sessionId)

      return result
    } catch (error) {
      console.error('[CheckpointedAgent] Execution failed, checkpoints preserved for resume')
      throw error
    }
  }

  /**
   * Resume from checkpoint
   */
  async resume(
    checkpointId: string,
    continueExecution: (context: any) => Promise<AgentResult>
  ): Promise<AgentResult> {
    return this.resumer.resumeFromCheckpoint(checkpointId, continueExecution)
  }

  /**
   * Resume from latest checkpoint
   */
  async resumeLatest(
    sessionId: string,
    continueExecution: (context: any) => Promise<AgentResult>
  ): Promise<AgentResult> {
    return this.resumer.resumeFromLatest(sessionId, continueExecution)
  }

  /**
   * Get checkpoint manager
   */
  getCheckpointManager(): CheckpointManager {
    return this.checkpointManager
  }

  /**
   * Get resumer
   */
  getResumer(): CheckpointResumer {
    return this.resumer
  }

  /**
   * Clean up expired checkpoints
   */
  cleanup(): void {
    this.checkpointManager.cleanupExpired()
  }
}

/**
 * Checkpoint callback type
 */
export type CheckpointCallback = (
  step: number,
  phase: CheckpointPhase,
  context: any
) => Promise<void>

/**
 * Global checkpoint manager instance
 */
let globalCheckpointManager: CheckpointManager | null = null

/**
 * Get global checkpoint manager
 */
export function getGlobalCheckpointManager(): CheckpointManager {
  if (!globalCheckpointManager) {
    globalCheckpointManager = new CheckpointManager()
  }
  return globalCheckpointManager
}

/**
 * Create checkpointed agent instance
 */
export function createCheckpointedAgent(): CheckpointedAgent {
  return new CheckpointedAgent()
}

/**
 * Utility: Save checkpoint to local storage
 */
export function saveCheckpointToLocalStorage(checkpoint: Checkpoint): void {
  if (typeof window !== 'undefined') {
    const key = `checkpoint_${checkpoint.id}`
    localStorage.setItem(key, JSON.stringify(checkpoint))
  }
}

/**
 * Utility: Load checkpoint from local storage
 */
export function loadCheckpointFromLocalStorage(checkpointId: string): Checkpoint | null {
  if (typeof window !== 'undefined') {
    const key = `checkpoint_${checkpointId}`
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
  }
  return null
}

/**
 * Utility: Clear all checkpoints from local storage
 */
export function clearCheckpointsFromLocalStorage(): void {
  if (typeof window !== 'undefined') {
    const keys = Object.keys(localStorage).filter((key) => key.startsWith('checkpoint_'))
    keys.forEach((key) => localStorage.removeItem(key))
    console.log(`[CheckpointManager] Cleared ${keys.length} checkpoints from local storage`)
  }
}
