/**
 * Vercel KV Store Wrapper
 *
 * Provides distributed state storage using Vercel KV (Redis).
 * Used in production to persist workflows across serverless function invocations.
 */

import { kv } from '@vercel/kv'
import type { UnifiedWorkflow } from '@/types/workflow'

// Workflow TTL: 1 hour in seconds
const WORKFLOW_TTL = 3600

/**
 * Check if Vercel KV is configured
 */
export function isKVConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

/**
 * KV-based workflow store for production use
 */
export const kvWorkflowStore = {
  /**
   * Create a new workflow in KV store
   */
  async create(workflow: UnifiedWorkflow): Promise<void> {
    try {
      await kv.set(`workflow:${workflow.id}`, workflow, { ex: WORKFLOW_TTL })
      console.log(`[KV] Created workflow: ${workflow.id}`)
    } catch (error) {
      console.error(`[KV] Failed to create workflow: ${workflow.id}`, error)
      throw error
    }
  },

  /**
   * Get a workflow by ID from KV store
   */
  async get(workflowId: string): Promise<UnifiedWorkflow | null> {
    try {
      const workflow = await kv.get<UnifiedWorkflow>(`workflow:${workflowId}`)
      if (workflow) {
        console.log(`[KV] Found workflow: ${workflowId}, status: ${workflow.status}`)
      } else {
        console.log(`[KV] Workflow not found: ${workflowId}`)
      }
      return workflow
    } catch (error) {
      console.error(`[KV] Failed to get workflow: ${workflowId}`, error)
      throw error
    }
  },

  /**
   * Update a workflow in KV store
   */
  async update(workflowId: string, updates: Partial<UnifiedWorkflow>): Promise<UnifiedWorkflow | null> {
    try {
      const workflow = await this.get(workflowId)
      if (!workflow) {
        console.error(`[KV] Cannot update - workflow not found: ${workflowId}`)
        return null
      }

      const updatedWorkflow: UnifiedWorkflow = {
        ...workflow,
        ...updates,
        updatedAt: new Date().toISOString(),
      }

      await kv.set(`workflow:${workflowId}`, updatedWorkflow, { ex: WORKFLOW_TTL })
      console.log(`[KV] Updated workflow: ${workflowId}`, { status: updatedWorkflow.status })
      return updatedWorkflow
    } catch (error) {
      console.error(`[KV] Failed to update workflow: ${workflowId}`, error)
      throw error
    }
  },

  /**
   * Delete a workflow from KV store
   */
  async delete(workflowId: string): Promise<boolean> {
    try {
      const result = await kv.del(`workflow:${workflowId}`)
      console.log(`[KV] Deleted workflow: ${workflowId}`, { success: result > 0 })
      return result > 0
    } catch (error) {
      console.error(`[KV] Failed to delete workflow: ${workflowId}`, error)
      throw error
    }
  },

  /**
   * Extend the TTL of a workflow (useful during long-running operations)
   */
  async extendTTL(workflowId: string): Promise<void> {
    try {
      await kv.expire(`workflow:${workflowId}`, WORKFLOW_TTL)
      console.log(`[KV] Extended TTL for workflow: ${workflowId}`)
    } catch (error) {
      console.error(`[KV] Failed to extend TTL for workflow: ${workflowId}`, error)
      // Don't throw - this is a non-critical operation
    }
  },
}
