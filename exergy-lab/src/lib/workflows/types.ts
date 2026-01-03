/**
 * Workflow Persistence Types
 *
 * Type definitions for workflow persistence, checkpoints, and resume functionality.
 */

import type { WorkflowType, WorkflowStatus as DbWorkflowStatus } from '@/types/database'

// Re-export database types for convenience
export type { WorkflowType }
export type WorkflowStatus = DbWorkflowStatus | 'completed_partial'

/**
 * Checkpoint for workflow state preservation
 */
export interface WorkflowCheckpoint {
  id: string
  phase: string
  timestamp: number
  elapsedTime: number
  state: Record<string, unknown>
  canResumeFrom: boolean
  metadata?: {
    iteration?: number
    score?: number
    message?: string
  }
}

/**
 * Workflow progress tracking
 */
export interface WorkflowProgress {
  currentPhase: string | null
  completedPhases: string[]
  phaseProgress: Record<string, PhaseProgress>
  overallProgress: number // 0-100
  lastUpdate: number
}

/**
 * Individual phase progress
 */
export interface PhaseProgress {
  phase: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  startTime?: number
  endTime?: number
  iteration?: number
  maxIterations?: number
  score?: number
  passed?: boolean
  message?: string
}

/**
 * Persisted workflow record
 */
export interface PersistedWorkflow {
  id: string
  userId: string
  type: WorkflowType
  name: string | null
  status: WorkflowStatus
  phase: string | null
  progress: WorkflowProgress
  input: WorkflowInput
  result: Record<string, unknown> | null
  checkpoints: WorkflowCheckpoint[]
  error: string | null
  startedAt: string
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Workflow input configuration
 */
export interface WorkflowInput {
  query: string
  domain?: string
  options?: Record<string, unknown>
}

/**
 * Options for resuming a workflow
 */
export interface ResumeOptions {
  fromCheckpoint?: string
  skipPhases?: string[]
  modifiedInput?: Partial<WorkflowInput>
}

/**
 * Workflow manager operations
 */
export interface WorkflowManagerOps {
  /**
   * Create a new workflow
   */
  create(type: WorkflowType, input: WorkflowInput, name?: string): Promise<PersistedWorkflow>

  /**
   * Get a workflow by ID
   */
  get(id: string): Promise<PersistedWorkflow | null>

  /**
   * Get active workflow of a specific type (running or paused)
   */
  getActiveByType(type: WorkflowType): Promise<PersistedWorkflow | null>

  /**
   * List user's workflows with optional filters
   */
  list(options?: {
    type?: WorkflowType
    status?: WorkflowStatus
    limit?: number
    offset?: number
  }): Promise<PersistedWorkflow[]>

  /**
   * Update workflow status
   */
  updateStatus(id: string, status: WorkflowStatus): Promise<void>

  /**
   * Update workflow phase
   */
  updatePhase(id: string, phase: string): Promise<void>

  /**
   * Update workflow progress
   */
  updateProgress(id: string, progress: Partial<WorkflowProgress>): Promise<void>

  /**
   * Save a checkpoint
   */
  saveCheckpoint(id: string, checkpoint: Omit<WorkflowCheckpoint, 'id'>): Promise<string>

  /**
   * Complete a workflow with result
   */
  complete(id: string, result: Record<string, unknown>): Promise<void>

  /**
   * Complete a workflow with partial result (graceful degradation)
   */
  completePartial(id: string, result: Record<string, unknown>): Promise<void>

  /**
   * Fail a workflow with error
   */
  fail(id: string, error: string): Promise<void>

  /**
   * Pause a workflow
   */
  pause(id: string): Promise<void>

  /**
   * Resume a paused workflow
   */
  resume(id: string, options?: ResumeOptions): Promise<PersistedWorkflow>

  /**
   * Delete a workflow
   */
  delete(id: string): Promise<void>
}

/**
 * Hook state for workflow persistence
 */
export interface WorkflowPersistenceState {
  workflowId: string | null
  isPersisted: boolean
  lastCheckpoint: WorkflowCheckpoint | null
  autoSaveEnabled: boolean
}

/**
 * Events emitted by workflow manager
 */
export type WorkflowEvent =
  | { type: 'created'; workflow: PersistedWorkflow }
  | { type: 'updated'; workflowId: string; changes: Partial<PersistedWorkflow> }
  | { type: 'checkpoint_saved'; workflowId: string; checkpoint: WorkflowCheckpoint }
  | { type: 'completed'; workflowId: string; result: Record<string, unknown> }
  | { type: 'failed'; workflowId: string; error: string }
  | { type: 'paused'; workflowId: string }
  | { type: 'resumed'; workflowId: string }
  | { type: 'deleted'; workflowId: string }

/**
 * Listener for workflow events
 */
export type WorkflowEventListener = (event: WorkflowEvent) => void
