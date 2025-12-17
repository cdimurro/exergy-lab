/**
 * Server-Side Workflow Store
 *
 * In-memory store for workflow objects that persists across API requests.
 * This is needed because Zustand stores are client-side only.
 *
 * In production, this should be replaced with Redis or a database.
 */

import type { UnifiedWorkflow } from '@/types/workflow'

// Use global object to persist across hot reloads in development
// In production, this should be replaced with Redis or a database
declare global {
  // eslint-disable-next-line no-var
  var __workflowStore: Map<string, UnifiedWorkflow> | undefined
}

// Initialize the store on the global object to survive hot reloads
const workflowStore = globalThis.__workflowStore ?? new Map<string, UnifiedWorkflow>()

// Save reference to global
if (process.env.NODE_ENV === 'development') {
  globalThis.__workflowStore = workflowStore
}

// Cleanup old workflows after 1 hour
const WORKFLOW_TTL = 60 * 60 * 1000

export const serverWorkflowStore = {
  /**
   * Create a new workflow
   */
  create(workflow: UnifiedWorkflow): void {
    workflowStore.set(workflow.id, workflow)
    console.log(`[WorkflowStore] Created workflow: ${workflow.id} (total: ${workflowStore.size})`)

    // Schedule cleanup
    setTimeout(() => {
      if (workflowStore.has(workflow.id)) {
        const stored = workflowStore.get(workflow.id)
        // Only delete if not completed (allow completed workflows to persist longer)
        if (stored?.status !== 'completed') {
          workflowStore.delete(workflow.id)
          console.log(`[WorkflowStore] Cleaned up workflow: ${workflow.id}`)
        }
      }
    }, WORKFLOW_TTL)
  },

  /**
   * Get a workflow by ID
   */
  get(workflowId: string): UnifiedWorkflow | undefined {
    console.log(`[WorkflowStore] Getting workflow: ${workflowId} (store has ${workflowStore.size} workflows)`)
    const workflow = workflowStore.get(workflowId)
    if (workflow) {
      console.log(`[WorkflowStore] Found workflow: ${workflowId}, status: ${workflow.status}`)
    } else {
      console.log(`[WorkflowStore] Workflow not found: ${workflowId}`)
      console.log(`[WorkflowStore] Available IDs:`, Array.from(workflowStore.keys()))
    }
    return workflow
  },

  /**
   * Update a workflow
   */
  update(workflowId: string, updates: Partial<UnifiedWorkflow>): UnifiedWorkflow | undefined {
    const workflow = workflowStore.get(workflowId)
    if (!workflow) {
      console.error(`[WorkflowStore] Cannot update - workflow not found: ${workflowId}`)
      return undefined
    }

    const updatedWorkflow = {
      ...workflow,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    workflowStore.set(workflowId, updatedWorkflow)
    console.log(`[WorkflowStore] Updated workflow: ${workflowId}`, { status: updatedWorkflow.status })
    return updatedWorkflow
  },

  /**
   * Delete a workflow
   */
  delete(workflowId: string): boolean {
    const deleted = workflowStore.delete(workflowId)
    console.log(`[WorkflowStore] Deleted workflow: ${workflowId}`, { success: deleted })
    return deleted
  },

  /**
   * List all workflows (for debugging)
   */
  list(): UnifiedWorkflow[] {
    return Array.from(workflowStore.values())
  },

  /**
   * Get store size (for debugging)
   */
  size(): number {
    return workflowStore.size
  },

  /**
   * Clear all workflows (for testing)
   */
  clear(): void {
    workflowStore.clear()
    console.log('[WorkflowStore] Cleared all workflows')
  },
}
