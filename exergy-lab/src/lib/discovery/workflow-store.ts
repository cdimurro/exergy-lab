/**
 * Server-Side Workflow Store
 *
 * Hybrid store that uses:
 * - Vercel KV (Redis) in production for distributed state
 * - In-memory Map in development for fast iteration
 *
 * This ensures workflows persist across serverless function invocations on Vercel.
 */

import type { UnifiedWorkflow } from '@/types/workflow'
import { kvWorkflowStore, isKVConfigured } from '@/lib/kv-store'

// Use global object to persist across hot reloads in development
declare global {
  // eslint-disable-next-line no-var
  var __workflowStore: Map<string, UnifiedWorkflow> | undefined
}

// Initialize the in-memory store
const memoryStore = globalThis.__workflowStore ?? new Map<string, UnifiedWorkflow>()

// Save reference to global for hot reload persistence in development
if (process.env.NODE_ENV === 'development') {
  globalThis.__workflowStore = memoryStore
}

// Cleanup old workflows after 1 hour (in-memory only)
const WORKFLOW_TTL = 60 * 60 * 1000

/**
 * Determine if we should use KV store
 * Use KV in production when configured, otherwise use in-memory
 */
function useKV(): boolean {
  return process.env.NODE_ENV === 'production' && isKVConfigured()
}

export const serverWorkflowStore = {
  /**
   * Create a new workflow
   */
  async create(workflow: UnifiedWorkflow): Promise<void> {
    if (useKV()) {
      await kvWorkflowStore.create(workflow)
    } else {
      memoryStore.set(workflow.id, workflow)
      console.log(`[WorkflowStore] Created workflow: ${workflow.id} (total: ${memoryStore.size})`)

      // Schedule cleanup for in-memory store
      setTimeout(() => {
        if (memoryStore.has(workflow.id)) {
          const stored = memoryStore.get(workflow.id)
          // Only delete if not completed
          if (stored?.status !== 'completed') {
            memoryStore.delete(workflow.id)
            console.log(`[WorkflowStore] Cleaned up workflow: ${workflow.id}`)
          }
        }
      }, WORKFLOW_TTL)
    }
  },

  /**
   * Get a workflow by ID
   */
  async get(workflowId: string): Promise<UnifiedWorkflow | undefined> {
    if (useKV()) {
      const workflow = await kvWorkflowStore.get(workflowId)
      return workflow ?? undefined
    } else {
      console.log(`[WorkflowStore] Getting workflow: ${workflowId} (store has ${memoryStore.size} workflows)`)
      const workflow = memoryStore.get(workflowId)
      if (workflow) {
        console.log(`[WorkflowStore] Found workflow: ${workflowId}, status: ${workflow.status}`)
      } else {
        console.log(`[WorkflowStore] Workflow not found: ${workflowId}`)
        console.log(`[WorkflowStore] Available IDs:`, Array.from(memoryStore.keys()))
      }
      return workflow
    }
  },

  /**
   * Update a workflow
   */
  async update(workflowId: string, updates: Partial<UnifiedWorkflow>): Promise<UnifiedWorkflow | undefined> {
    if (useKV()) {
      const updated = await kvWorkflowStore.update(workflowId, updates)
      return updated ?? undefined
    } else {
      const workflow = memoryStore.get(workflowId)
      if (!workflow) {
        console.error(`[WorkflowStore] Cannot update - workflow not found: ${workflowId}`)
        return undefined
      }

      const updatedWorkflow = {
        ...workflow,
        ...updates,
        updatedAt: new Date().toISOString(),
      }

      memoryStore.set(workflowId, updatedWorkflow)
      console.log(`[WorkflowStore] Updated workflow: ${workflowId}`, { status: updatedWorkflow.status })
      return updatedWorkflow
    }
  },

  /**
   * Delete a workflow
   */
  async delete(workflowId: string): Promise<boolean> {
    if (useKV()) {
      return await kvWorkflowStore.delete(workflowId)
    } else {
      const deleted = memoryStore.delete(workflowId)
      console.log(`[WorkflowStore] Deleted workflow: ${workflowId}`, { success: deleted })
      return deleted
    }
  },

  /**
   * List all workflows (for debugging, in-memory only)
   */
  list(): UnifiedWorkflow[] {
    if (useKV()) {
      console.warn('[WorkflowStore] list() not supported with KV store')
      return []
    }
    return Array.from(memoryStore.values())
  },

  /**
   * Get store size (for debugging, in-memory only)
   */
  size(): number {
    if (useKV()) {
      console.warn('[WorkflowStore] size() not supported with KV store')
      return -1
    }
    return memoryStore.size
  },

  /**
   * Clear all workflows (for testing, in-memory only)
   */
  clear(): void {
    if (useKV()) {
      console.warn('[WorkflowStore] clear() not supported with KV store')
      return
    }
    memoryStore.clear()
    console.log('[WorkflowStore] Cleared all workflows')
  },

  /**
   * Extend TTL for a workflow (KV only, useful during long operations)
   */
  async extendTTL(workflowId: string): Promise<void> {
    if (useKV()) {
      await kvWorkflowStore.extendTTL(workflowId)
    }
    // No-op for in-memory store (handled by setTimeout)
  },
}
