'use client'

/**
 * useWorkflowPersistence Hook
 *
 * Provides workflow persistence functionality that can be composed with
 * existing workflow hooks (useFrontierScienceWorkflow, useBreakthroughWorkflow, etc.)
 *
 * Features:
 * - Auto-detect active workflows on mount
 * - Periodic checkpoint saves (every 30s while running)
 * - Resume from last checkpoint
 * - Graceful degradation for offline scenarios
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { workflowManager } from '@/lib/workflows'
import type {
  WorkflowType,
  WorkflowStatus,
  WorkflowCheckpoint,
  WorkflowProgress,
  WorkflowInput,
  PersistedWorkflow,
} from '@/lib/workflows/types'

// ============================================================================
// Types
// ============================================================================

export interface UseWorkflowPersistenceOptions {
  /** Workflow type for this hook instance */
  type: WorkflowType
  /** Enable auto-checkpoint saving (default: true) */
  autoCheckpoint?: boolean
  /** Checkpoint interval in ms (default: 30000 = 30s) */
  checkpointIntervalMs?: number
  /** Callback when an active workflow is found on mount */
  onActiveWorkflowFound?: (workflow: PersistedWorkflow) => void
  /** Callback when workflow is resumed */
  onResume?: (workflow: PersistedWorkflow, checkpoint?: WorkflowCheckpoint) => void
}

export interface WorkflowPersistenceState {
  /** ID of the persisted workflow */
  workflowId: string | null
  /** Whether persistence is enabled (Supabase configured) */
  isEnabled: boolean
  /** Whether there's an active workflow that can be resumed */
  hasActiveWorkflow: boolean
  /** The active workflow if found */
  activeWorkflow: PersistedWorkflow | null
  /** Last saved checkpoint */
  lastCheckpoint: WorkflowCheckpoint | null
  /** Whether auto-save is currently active */
  isAutoSaving: boolean
  /** Error from persistence operations */
  persistenceError: string | null
}

export interface WorkflowPersistenceActions {
  /** Create a new persisted workflow */
  createWorkflow: (input: WorkflowInput, name?: string) => Promise<string | null>
  /** Update workflow status */
  updateStatus: (status: WorkflowStatus) => Promise<void>
  /** Update workflow phase */
  updatePhase: (phase: string) => Promise<void>
  /** Update workflow progress */
  updateProgress: (progress: Partial<WorkflowProgress>) => Promise<void>
  /** Save a checkpoint */
  saveCheckpoint: (state: Record<string, unknown>, phase: string) => Promise<void>
  /** Complete the workflow */
  completeWorkflow: (result: Record<string, unknown>) => Promise<void>
  /** Complete with partial result */
  completePartially: (result: Record<string, unknown>) => Promise<void>
  /** Fail the workflow */
  failWorkflow: (error: string) => Promise<void>
  /** Pause the workflow */
  pauseWorkflow: () => Promise<void>
  /** Resume the workflow */
  resumeWorkflow: () => Promise<PersistedWorkflow | null>
  /** Dismiss active workflow (user chose not to resume) */
  dismissActiveWorkflow: () => void
  /** Clear persistence state (for new workflow) */
  clearPersistence: () => void
}

export type UseWorkflowPersistenceReturn = WorkflowPersistenceState & WorkflowPersistenceActions

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CHECKPOINT_INTERVAL = 30000 // 30 seconds

// ============================================================================
// Hook Implementation
// ============================================================================

export function useWorkflowPersistence(
  options: UseWorkflowPersistenceOptions
): UseWorkflowPersistenceReturn {
  const {
    type,
    autoCheckpoint = true,
    checkpointIntervalMs = DEFAULT_CHECKPOINT_INTERVAL,
    onActiveWorkflowFound,
    onResume,
  } = options

  // State
  const [workflowId, setWorkflowId] = useState<string | null>(null)
  const [isEnabled, setIsEnabled] = useState(true)
  const [hasActiveWorkflow, setHasActiveWorkflow] = useState(false)
  const [activeWorkflow, setActiveWorkflow] = useState<PersistedWorkflow | null>(null)
  const [lastCheckpoint, setLastCheckpoint] = useState<WorkflowCheckpoint | null>(null)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [persistenceError, setPersistenceError] = useState<string | null>(null)

  // Refs for checkpoint state
  const checkpointStateRef = useRef<Record<string, unknown>>({})
  const currentPhaseRef = useRef<string | null>(null)
  const checkpointTimerRef = useRef<NodeJS.Timeout | null>(null)
  const elapsedTimeRef = useRef<number>(0)

  // Check for active workflow on mount
  useEffect(() => {
    const checkActiveWorkflow = async () => {
      try {
        const active = await workflowManager.getActiveByType(type)
        if (active) {
          setHasActiveWorkflow(true)
          setActiveWorkflow(active)
          onActiveWorkflowFound?.(active)
        }
      } catch (err) {
        // Supabase not configured or other error - disable persistence
        console.warn('[WorkflowPersistence] Could not check for active workflows:', err)
        setIsEnabled(false)
      }
    }

    checkActiveWorkflow()
  }, [type, onActiveWorkflowFound])

  // Auto-checkpoint timer
  useEffect(() => {
    if (!autoCheckpoint || !workflowId || !isAutoSaving) {
      return
    }

    checkpointTimerRef.current = setInterval(async () => {
      if (checkpointStateRef.current && currentPhaseRef.current) {
        try {
          await workflowManager.saveCheckpoint(workflowId, {
            phase: currentPhaseRef.current,
            timestamp: Date.now(),
            elapsedTime: elapsedTimeRef.current,
            state: checkpointStateRef.current,
            canResumeFrom: true,
          })
        } catch (err) {
          console.warn('[WorkflowPersistence] Auto-checkpoint failed:', err)
        }
      }
    }, checkpointIntervalMs)

    return () => {
      if (checkpointTimerRef.current) {
        clearInterval(checkpointTimerRef.current)
        checkpointTimerRef.current = null
      }
    }
  }, [autoCheckpoint, workflowId, isAutoSaving, checkpointIntervalMs])

  // Create workflow
  const createWorkflow = useCallback(
    async (input: WorkflowInput, name?: string): Promise<string | null> => {
      if (!isEnabled) return null

      try {
        const workflow = await workflowManager.create(type, input, name)
        setWorkflowId(workflow.id)
        setIsAutoSaving(true)
        setPersistenceError(null)
        return workflow.id
      } catch (err) {
        console.error('[WorkflowPersistence] Failed to create workflow:', err)
        setPersistenceError(err instanceof Error ? err.message : 'Failed to create workflow')
        return null
      }
    },
    [isEnabled, type]
  )

  // Update status
  const updateStatus = useCallback(
    async (status: WorkflowStatus): Promise<void> => {
      if (!workflowId || !isEnabled) return

      try {
        await workflowManager.updateStatus(workflowId, status)
        if (status === 'running') {
          setIsAutoSaving(true)
        } else if (status === 'paused' || status === 'completed' || status === 'failed') {
          setIsAutoSaving(false)
        }
      } catch (err) {
        console.warn('[WorkflowPersistence] Failed to update status:', err)
      }
    },
    [workflowId, isEnabled]
  )

  // Update phase
  const updatePhase = useCallback(
    async (phase: string): Promise<void> => {
      if (!workflowId || !isEnabled) return
      currentPhaseRef.current = phase

      try {
        await workflowManager.updatePhase(workflowId, phase)
      } catch (err) {
        console.warn('[WorkflowPersistence] Failed to update phase:', err)
      }
    },
    [workflowId, isEnabled]
  )

  // Update progress
  const updateProgress = useCallback(
    async (progress: Partial<WorkflowProgress>): Promise<void> => {
      if (!workflowId || !isEnabled) return

      try {
        await workflowManager.updateProgress(workflowId, progress)
      } catch (err) {
        console.warn('[WorkflowPersistence] Failed to update progress:', err)
      }
    },
    [workflowId, isEnabled]
  )

  // Save checkpoint
  const saveCheckpoint = useCallback(
    async (state: Record<string, unknown>, phase: string): Promise<void> => {
      if (!workflowId || !isEnabled) return

      // Update refs for auto-checkpoint
      checkpointStateRef.current = state
      currentPhaseRef.current = phase

      try {
        const checkpointId = await workflowManager.saveCheckpoint(workflowId, {
          phase,
          timestamp: Date.now(),
          elapsedTime: elapsedTimeRef.current,
          state,
          canResumeFrom: true,
        })

        setLastCheckpoint({
          id: checkpointId,
          phase,
          timestamp: Date.now(),
          elapsedTime: elapsedTimeRef.current,
          state,
          canResumeFrom: true,
        })
      } catch (err) {
        console.warn('[WorkflowPersistence] Failed to save checkpoint:', err)
      }
    },
    [workflowId, isEnabled]
  )

  // Complete workflow
  const completeWorkflow = useCallback(
    async (result: Record<string, unknown>): Promise<void> => {
      if (!workflowId || !isEnabled) return

      try {
        await workflowManager.complete(workflowId, result)
        setIsAutoSaving(false)
      } catch (err) {
        console.warn('[WorkflowPersistence] Failed to complete workflow:', err)
      }
    },
    [workflowId, isEnabled]
  )

  // Complete partially
  const completePartially = useCallback(
    async (result: Record<string, unknown>): Promise<void> => {
      if (!workflowId || !isEnabled) return

      try {
        await workflowManager.completePartial(workflowId, result)
        setIsAutoSaving(false)
      } catch (err) {
        console.warn('[WorkflowPersistence] Failed to complete workflow partially:', err)
      }
    },
    [workflowId, isEnabled]
  )

  // Fail workflow
  const failWorkflow = useCallback(
    async (error: string): Promise<void> => {
      if (!workflowId || !isEnabled) return

      try {
        await workflowManager.fail(workflowId, error)
        setIsAutoSaving(false)
      } catch (err) {
        console.warn('[WorkflowPersistence] Failed to fail workflow:', err)
      }
    },
    [workflowId, isEnabled]
  )

  // Pause workflow
  const pauseWorkflow = useCallback(async (): Promise<void> => {
    if (!workflowId || !isEnabled) return

    try {
      await workflowManager.pause(workflowId)
      setIsAutoSaving(false)
    } catch (err) {
      console.warn('[WorkflowPersistence] Failed to pause workflow:', err)
    }
  }, [workflowId, isEnabled])

  // Resume workflow
  const resumeWorkflow = useCallback(async (): Promise<PersistedWorkflow | null> => {
    if (!activeWorkflow || !isEnabled) return null

    try {
      const resumed = await workflowManager.resume(activeWorkflow.id)
      setWorkflowId(resumed.id)
      setHasActiveWorkflow(false)
      setActiveWorkflow(null)
      setIsAutoSaving(true)

      // Find the latest resumable checkpoint
      const latestCheckpoint = resumed.checkpoints
        .filter((c) => c.canResumeFrom)
        .sort((a, b) => b.timestamp - a.timestamp)[0]

      if (latestCheckpoint) {
        setLastCheckpoint(latestCheckpoint)
        checkpointStateRef.current = latestCheckpoint.state
        currentPhaseRef.current = latestCheckpoint.phase
        elapsedTimeRef.current = latestCheckpoint.elapsedTime
      }

      onResume?.(resumed, latestCheckpoint)
      return resumed
    } catch (err) {
      console.error('[WorkflowPersistence] Failed to resume workflow:', err)
      setPersistenceError(err instanceof Error ? err.message : 'Failed to resume workflow')
      return null
    }
  }, [activeWorkflow, isEnabled, onResume])

  // Dismiss active workflow
  const dismissActiveWorkflow = useCallback(() => {
    setHasActiveWorkflow(false)
    setActiveWorkflow(null)
  }, [])

  // Clear persistence state
  const clearPersistence = useCallback(() => {
    setWorkflowId(null)
    setLastCheckpoint(null)
    setIsAutoSaving(false)
    checkpointStateRef.current = {}
    currentPhaseRef.current = null
    elapsedTimeRef.current = 0
  }, [])

  // Public method to update elapsed time (called by consuming hook)
  const setElapsedTime = useCallback((time: number) => {
    elapsedTimeRef.current = time
  }, [])

  return {
    // State
    workflowId,
    isEnabled,
    hasActiveWorkflow,
    activeWorkflow,
    lastCheckpoint,
    isAutoSaving,
    persistenceError,

    // Actions
    createWorkflow,
    updateStatus,
    updatePhase,
    updateProgress,
    saveCheckpoint,
    completeWorkflow,
    completePartially,
    failWorkflow,
    pauseWorkflow,
    resumeWorkflow,
    dismissActiveWorkflow,
    clearPersistence,
  }
}

export default useWorkflowPersistence
