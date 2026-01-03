/**
 * Workflow Manager Service
 *
 * Client-side service for managing workflow persistence.
 * Handles CRUD operations, checkpoints, and resume functionality
 * by interfacing with the /api/user/workflows API routes.
 */

import type {
  WorkflowType,
  WorkflowStatus,
  WorkflowProgress,
  WorkflowCheckpoint,
  WorkflowInput,
  PersistedWorkflow,
  WorkflowManagerOps,
  ResumeOptions,
  WorkflowEvent,
  WorkflowEventListener,
} from './types'

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Transform database workflow to PersistedWorkflow format
 */
function transformDbWorkflow(dbWorkflow: Record<string, unknown>): PersistedWorkflow {
  const progress = dbWorkflow.progress as Record<string, unknown> | null
  const checkpoints = (progress?.checkpoints as WorkflowCheckpoint[]) || []

  return {
    id: dbWorkflow.id as string,
    userId: dbWorkflow.user_id as string,
    type: dbWorkflow.type as WorkflowType,
    name: dbWorkflow.name as string | null,
    status: dbWorkflow.status as WorkflowStatus,
    phase: dbWorkflow.phase as string | null,
    progress: {
      currentPhase: (progress?.currentPhase as string) || null,
      completedPhases: (progress?.completedPhases as string[]) || [],
      phaseProgress: (progress?.phaseProgress as Record<string, unknown>) || {},
      overallProgress: (progress?.overallProgress as number) || 0,
      lastUpdate: (progress?.lastUpdate as number) || Date.now(),
    } as WorkflowProgress,
    input: dbWorkflow.input as WorkflowInput,
    result: dbWorkflow.result as Record<string, unknown> | null,
    checkpoints,
    error: dbWorkflow.error as string | null,
    startedAt: dbWorkflow.started_at as string,
    completedAt: dbWorkflow.completed_at as string | null,
    createdAt: dbWorkflow.created_at as string,
    updatedAt: dbWorkflow.updated_at as string,
  }
}

// ============================================================================
// Workflow Manager Class
// ============================================================================

class WorkflowManager implements WorkflowManagerOps {
  private listeners: Set<WorkflowEventListener> = new Set()
  private checkpointBuffer: Map<string, WorkflowCheckpoint[]> = new Map()
  private saveDebounceTimers: Map<string, NodeJS.Timeout> = new Map()
  private readonly CHECKPOINT_DEBOUNCE_MS = 5000 // 5 seconds

  /**
   * Subscribe to workflow events
   */
  subscribe(listener: WorkflowEventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(event: WorkflowEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.error('[WorkflowManager] Event listener error:', err)
      }
    })
  }

  /**
   * Create a new workflow
   */
  async create(
    type: WorkflowType,
    input: WorkflowInput,
    name?: string
  ): Promise<PersistedWorkflow> {
    const response = await fetch('/api/user/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        name: name || `${type} - ${new Date().toLocaleDateString()}`,
        input,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create workflow')
    }

    const { workflow: dbWorkflow } = await response.json()
    const workflow = transformDbWorkflow(dbWorkflow)

    this.emit({ type: 'created', workflow })
    return workflow
  }

  /**
   * Get a workflow by ID
   */
  async get(id: string): Promise<PersistedWorkflow | null> {
    const response = await fetch(`/api/user/workflows/${id}`)

    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to fetch workflow')
    }

    const { workflow: dbWorkflow } = await response.json()
    return transformDbWorkflow(dbWorkflow)
  }

  /**
   * Get active workflow of a specific type (running or paused)
   */
  async getActiveByType(type: WorkflowType): Promise<PersistedWorkflow | null> {
    // Check for running workflows first
    const runningResponse = await fetch(
      `/api/user/workflows?type=${type}&status=running&limit=1`
    )

    if (runningResponse.ok) {
      const { workflows } = await runningResponse.json()
      if (workflows?.length > 0) {
        return transformDbWorkflow(workflows[0])
      }
    }

    // Check for paused workflows
    const pausedResponse = await fetch(
      `/api/user/workflows?type=${type}&status=paused&limit=1`
    )

    if (pausedResponse.ok) {
      const { workflows } = await pausedResponse.json()
      if (workflows?.length > 0) {
        return transformDbWorkflow(workflows[0])
      }
    }

    return null
  }

  /**
   * List workflows with optional filters
   */
  async list(options?: {
    type?: WorkflowType
    status?: WorkflowStatus
    limit?: number
    offset?: number
  }): Promise<PersistedWorkflow[]> {
    const params = new URLSearchParams()
    if (options?.type) params.set('type', options.type)
    if (options?.status) params.set('status', options.status)
    if (options?.limit) params.set('limit', options.limit.toString())
    if (options?.offset) params.set('offset', options.offset.toString())

    const response = await fetch(`/api/user/workflows?${params.toString()}`)

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to list workflows')
    }

    const { workflows: dbWorkflows } = await response.json()
    return (dbWorkflows || []).map(transformDbWorkflow)
  }

  /**
   * Update workflow status
   */
  async updateStatus(id: string, status: WorkflowStatus): Promise<void> {
    const response = await fetch(`/api/user/workflows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update workflow status')
    }

    this.emit({ type: 'updated', workflowId: id, changes: { status } })
  }

  /**
   * Update workflow phase
   */
  async updatePhase(id: string, phase: string): Promise<void> {
    const response = await fetch(`/api/user/workflows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update workflow phase')
    }

    this.emit({ type: 'updated', workflowId: id, changes: { phase } })
  }

  /**
   * Update workflow progress
   */
  async updateProgress(id: string, progress: Partial<WorkflowProgress>): Promise<void> {
    // Get current workflow to merge progress
    const current = await this.get(id)
    if (!current) {
      throw new Error('Workflow not found')
    }

    const mergedProgress = {
      ...current.progress,
      ...progress,
      lastUpdate: Date.now(),
    }

    // Include buffered checkpoints in progress
    const bufferedCheckpoints = this.checkpointBuffer.get(id) || []
    const allCheckpoints = [...current.checkpoints, ...bufferedCheckpoints]

    const response = await fetch(`/api/user/workflows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        progress: {
          ...mergedProgress,
          checkpoints: allCheckpoints,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update workflow progress')
    }

    // Clear checkpoint buffer after successful save
    this.checkpointBuffer.delete(id)

    this.emit({
      type: 'updated',
      workflowId: id,
      changes: { progress: mergedProgress as WorkflowProgress },
    })
  }

  /**
   * Save a checkpoint (debounced to avoid excessive API calls)
   */
  async saveCheckpoint(
    id: string,
    checkpoint: Omit<WorkflowCheckpoint, 'id'>
  ): Promise<string> {
    const checkpointId = generateId()
    const fullCheckpoint: WorkflowCheckpoint = {
      ...checkpoint,
      id: checkpointId,
    }

    // Add to buffer
    const buffer = this.checkpointBuffer.get(id) || []
    buffer.push(fullCheckpoint)
    this.checkpointBuffer.set(id, buffer)

    // Clear existing debounce timer
    const existingTimer = this.saveDebounceTimers.get(id)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new debounce timer
    const timer = setTimeout(async () => {
      try {
        await this.flushCheckpoints(id)
      } catch (err) {
        console.error('[WorkflowManager] Failed to flush checkpoints:', err)
      }
    }, this.CHECKPOINT_DEBOUNCE_MS)

    this.saveDebounceTimers.set(id, timer)

    this.emit({ type: 'checkpoint_saved', workflowId: id, checkpoint: fullCheckpoint })
    return checkpointId
  }

  /**
   * Flush buffered checkpoints to database
   */
  private async flushCheckpoints(id: string): Promise<void> {
    const buffer = this.checkpointBuffer.get(id)
    if (!buffer || buffer.length === 0) return

    const current = await this.get(id)
    if (!current) return

    const allCheckpoints = [...current.checkpoints, ...buffer]

    await fetch(`/api/user/workflows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        progress: {
          ...current.progress,
          checkpoints: allCheckpoints,
        },
      }),
    })

    this.checkpointBuffer.delete(id)
    this.saveDebounceTimers.delete(id)
  }

  /**
   * Complete a workflow with result
   */
  async complete(id: string, result: Record<string, unknown>): Promise<void> {
    // Flush any pending checkpoints first
    await this.flushCheckpoints(id)

    const response = await fetch(`/api/user/workflows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'completed',
        result,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to complete workflow')
    }

    this.emit({ type: 'completed', workflowId: id, result })
  }

  /**
   * Complete a workflow with partial result (graceful degradation)
   */
  async completePartial(id: string, result: Record<string, unknown>): Promise<void> {
    await this.flushCheckpoints(id)

    // Store partial completion status in progress
    const current = await this.get(id)
    const progress = current?.progress || {}

    const response = await fetch(`/api/user/workflows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'completed',
        result: {
          ...result,
          isPartial: true,
        },
        progress: {
          ...progress,
          completedPartially: true,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to complete workflow partially')
    }

    this.emit({ type: 'completed', workflowId: id, result })
  }

  /**
   * Fail a workflow with error
   */
  async fail(id: string, error: string): Promise<void> {
    await this.flushCheckpoints(id)

    const response = await fetch(`/api/user/workflows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'failed',
        error,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to fail workflow')
    }

    this.emit({ type: 'failed', workflowId: id, error })
  }

  /**
   * Pause a workflow
   */
  async pause(id: string): Promise<void> {
    await this.flushCheckpoints(id)

    const response = await fetch(`/api/user/workflows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paused' }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to pause workflow')
    }

    this.emit({ type: 'paused', workflowId: id })
  }

  /**
   * Resume a paused workflow
   */
  async resume(id: string, options?: ResumeOptions): Promise<PersistedWorkflow> {
    const workflow = await this.get(id)
    if (!workflow) {
      throw new Error('Workflow not found')
    }

    if (workflow.status !== 'paused') {
      throw new Error('Can only resume paused workflows')
    }

    // Find the checkpoint to resume from
    let resumeState: Record<string, unknown> = {}
    if (options?.fromCheckpoint) {
      const checkpoint = workflow.checkpoints.find((c) => c.id === options.fromCheckpoint)
      if (checkpoint) {
        resumeState = checkpoint.state
      }
    } else if (workflow.checkpoints.length > 0) {
      // Resume from latest checkpoint
      const latestCheckpoint = workflow.checkpoints[workflow.checkpoints.length - 1]
      resumeState = latestCheckpoint.state
    }

    // Merge any modified input
    const updatedInput = options?.modifiedInput
      ? { ...workflow.input, ...options.modifiedInput }
      : workflow.input

    const response = await fetch(`/api/user/workflows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'running',
        input: updatedInput,
        progress: {
          ...workflow.progress,
          resumeState,
          skipPhases: options?.skipPhases || [],
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to resume workflow')
    }

    const { workflow: updatedDbWorkflow } = await response.json()
    const updatedWorkflow = transformDbWorkflow(updatedDbWorkflow)

    this.emit({ type: 'resumed', workflowId: id })
    return updatedWorkflow
  }

  /**
   * Delete a workflow
   */
  async delete(id: string): Promise<void> {
    // Clear any pending saves
    this.checkpointBuffer.delete(id)
    const timer = this.saveDebounceTimers.get(id)
    if (timer) {
      clearTimeout(timer)
      this.saveDebounceTimers.delete(id)
    }

    const response = await fetch(`/api/user/workflows/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to delete workflow')
    }

    this.emit({ type: 'deleted', workflowId: id })
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const workflowManager = new WorkflowManager()
export default workflowManager
