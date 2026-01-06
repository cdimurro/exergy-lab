/**
 * GPU Usage Service
 *
 * Server-side service for tracking GPU usage and managing budgets.
 * Uses Supabase for persistence.
 *
 * Features:
 * - Track individual GPU sessions
 * - Calculate costs based on execution time
 * - Enforce budget limits per user tier
 * - Monthly usage summaries
 *
 * Database Tables:
 * - gpu_usage: Individual GPU run records
 * - gpu_budgets: User budget settings
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  type GPUTier,
  calculateGPUCost,
  USER_TIER_LIMITS,
  canRunSimulation,
} from './gpu-pricing'

// ============================================================================
// Types
// ============================================================================

export interface GPUUsageRecord {
  id: string
  userId: string
  gpuTier: GPUTier
  startTime: Date
  endTime?: Date
  durationSeconds?: number
  costUsd?: number
  simulationType: string
  status: 'running' | 'completed' | 'failed'
  metadata?: Record<string, unknown>
  createdAt: Date
}

export interface GPUBudget {
  userId: string
  monthlyBudgetUsd: number
  currentMonthSpentUsd: number
  billingPeriodStart: Date
}

export interface MonthlyUsageSummary {
  userId: string
  month: string // YYYY-MM
  totalRuns: number
  completedRuns: number
  failedRuns: number
  totalDurationSeconds: number
  totalCostUsd: number
  byGpuTier: Record<GPUTier, {
    runs: number
    durationSeconds: number
    costUsd: number
  }>
  bySimulationType: Record<string, {
    runs: number
    costUsd: number
  }>
}

export interface BudgetCheckResult {
  allowed: boolean
  reason?: string
  currentSpent: number
  budgetLimit: number | null
  remainingBudget: number | null
  runsThisMonth: number
  runLimit: number | null
}

// ============================================================================
// GPU Usage Service
// ============================================================================

export class GPUUsageService {
  private supabase: SupabaseClient | null = null

  constructor() {
    // Initialize Supabase if environment variables are available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey)
    }
  }

  /**
   * Check if service is available (Supabase configured)
   */
  isAvailable(): boolean {
    return this.supabase !== null
  }

  /**
   * Start a new GPU session
   */
  async startSession(
    userId: string,
    gpuTier: GPUTier,
    simulationType: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    if (!this.supabase) {
      // Return a mock session ID for local development
      return `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    const { data, error } = await this.supabase
      .from('gpu_usage')
      .insert({
        user_id: userId,
        gpu_tier: gpuTier,
        start_time: new Date().toISOString(),
        simulation_type: simulationType,
        status: 'running',
        metadata,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[GPUUsageService] Error starting session:', error)
      throw new Error(`Failed to start GPU session: ${error.message}`)
    }

    return data.id
  }

  /**
   * End a GPU session
   */
  async endSession(
    sessionId: string,
    status: 'completed' | 'failed',
    durationMs?: number
  ): Promise<GPUUsageRecord | null> {
    if (!this.supabase) {
      // Return mock record for local development
      return null
    }

    // Get the session to calculate cost
    const { data: session, error: fetchError } = await this.supabase
      .from('gpu_usage')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (fetchError || !session) {
      console.error('[GPUUsageService] Session not found:', sessionId)
      return null
    }

    const endTime = new Date()
    const startTime = new Date(session.start_time)
    const durationSeconds = durationMs
      ? durationMs / 1000
      : (endTime.getTime() - startTime.getTime()) / 1000

    const costUsd = calculateGPUCost(session.gpu_tier as GPUTier, durationSeconds * 1000)

    const { data, error } = await this.supabase
      .from('gpu_usage')
      .update({
        end_time: endTime.toISOString(),
        duration_seconds: durationSeconds,
        cost_usd: costUsd,
        status,
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      console.error('[GPUUsageService] Error ending session:', error)
      throw new Error(`Failed to end GPU session: ${error.message}`)
    }

    // Update user's monthly spent
    await this.updateMonthlySpent(session.user_id, costUsd)

    return this.mapToGPUUsageRecord(data)
  }

  /**
   * Check if user can run a simulation
   */
  async checkBudget(
    userId: string,
    userTier: 'free' | 'pro' | 'enterprise',
    gpuTier: GPUTier
  ): Promise<BudgetCheckResult> {
    const limits = USER_TIER_LIMITS[userTier]

    // Get current month usage
    const summary = await this.getMonthlyUsage(userId)
    const currentSpent = summary?.totalCostUsd || 0
    const runsThisMonth = summary?.totalRuns || 0

    // Check limits
    const check = canRunSimulation(userTier, gpuTier, currentSpent, runsThisMonth)

    return {
      allowed: check.allowed,
      reason: check.reason,
      currentSpent,
      budgetLimit: limits.budgetPerMonth,
      remainingBudget: limits.budgetPerMonth !== null
        ? Math.max(0, limits.budgetPerMonth - currentSpent)
        : null,
      runsThisMonth,
      runLimit: limits.gpuRunsPerMonth,
    }
  }

  /**
   * Get monthly usage summary
   */
  async getMonthlyUsage(userId: string): Promise<MonthlyUsageSummary | null> {
    if (!this.supabase) {
      // Return mock data for local development
      return {
        userId,
        month: new Date().toISOString().slice(0, 7),
        totalRuns: 0,
        completedRuns: 0,
        failedRuns: 0,
        totalDurationSeconds: 0,
        totalCostUsd: 0,
        byGpuTier: {} as Record<GPUTier, { runs: number; durationSeconds: number; costUsd: number }>,
        bySimulationType: {},
      }
    }

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const { data, error } = await this.supabase
      .from('gpu_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', monthStart.toISOString())
      .lte('start_time', monthEnd.toISOString())

    if (error) {
      console.error('[GPUUsageService] Error fetching usage:', error)
      return null
    }

    // Aggregate data
    const summary: MonthlyUsageSummary = {
      userId,
      month: now.toISOString().slice(0, 7),
      totalRuns: data.length,
      completedRuns: data.filter(r => r.status === 'completed').length,
      failedRuns: data.filter(r => r.status === 'failed').length,
      totalDurationSeconds: data.reduce((sum, r) => sum + (r.duration_seconds || 0), 0),
      totalCostUsd: data.reduce((sum, r) => sum + (r.cost_usd || 0), 0),
      byGpuTier: {} as Record<GPUTier, { runs: number; durationSeconds: number; costUsd: number }>,
      bySimulationType: {},
    }

    // Aggregate by GPU tier
    for (const record of data) {
      const tier = record.gpu_tier as GPUTier
      if (!summary.byGpuTier[tier]) {
        summary.byGpuTier[tier] = { runs: 0, durationSeconds: 0, costUsd: 0 }
      }
      summary.byGpuTier[tier].runs++
      summary.byGpuTier[tier].durationSeconds += record.duration_seconds || 0
      summary.byGpuTier[tier].costUsd += record.cost_usd || 0

      // Aggregate by simulation type
      const simType = record.simulation_type
      if (!summary.bySimulationType[simType]) {
        summary.bySimulationType[simType] = { runs: 0, costUsd: 0 }
      }
      summary.bySimulationType[simType].runs++
      summary.bySimulationType[simType].costUsd += record.cost_usd || 0
    }

    return summary
  }

  /**
   * Get usage history
   */
  async getUsageHistory(
    userId: string,
    limit: number = 50
  ): Promise<GPUUsageRecord[]> {
    if (!this.supabase) {
      return []
    }

    const { data, error } = await this.supabase
      .from('gpu_usage')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[GPUUsageService] Error fetching history:', error)
      return []
    }

    return data.map(this.mapToGPUUsageRecord)
  }

  /**
   * Get user budget settings
   */
  async getBudget(userId: string): Promise<GPUBudget | null> {
    if (!this.supabase) {
      return {
        userId,
        monthlyBudgetUsd: 10.00,
        currentMonthSpentUsd: 0,
        billingPeriodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      }
    }

    const { data, error } = await this.supabase
      .from('gpu_budgets')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // Not found is ok
      console.error('[GPUUsageService] Error fetching budget:', error)
      return null
    }

    if (!data) {
      // Create default budget for new user
      const { data: newBudget, error: insertError } = await this.supabase
        .from('gpu_budgets')
        .insert({
          user_id: userId,
          monthly_budget_usd: 10.00,
          current_month_spent_usd: 0,
          billing_period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        })
        .select()
        .single()

      if (insertError) {
        console.error('[GPUUsageService] Error creating budget:', insertError)
        return null
      }

      return this.mapToGPUBudget(newBudget)
    }

    return this.mapToGPUBudget(data)
  }

  /**
   * Update user budget settings
   */
  async updateBudget(
    userId: string,
    monthlyBudgetUsd: number
  ): Promise<GPUBudget | null> {
    if (!this.supabase) {
      return null
    }

    const { data, error } = await this.supabase
      .from('gpu_budgets')
      .upsert({
        user_id: userId,
        monthly_budget_usd: monthlyBudgetUsd,
      })
      .select()
      .single()

    if (error) {
      console.error('[GPUUsageService] Error updating budget:', error)
      return null
    }

    return this.mapToGPUBudget(data)
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async updateMonthlySpent(userId: string, amountUsd: number): Promise<void> {
    if (!this.supabase) return

    // Check if we need to reset the billing period
    const budget = await this.getBudget(userId)
    if (!budget) return

    const now = new Date()
    const periodStart = new Date(budget.billingPeriodStart)

    // If we're in a new month, reset the spent amount
    if (now.getMonth() !== periodStart.getMonth() || now.getFullYear() !== periodStart.getFullYear()) {
      await this.supabase
        .from('gpu_budgets')
        .update({
          current_month_spent_usd: amountUsd,
          billing_period_start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        })
        .eq('user_id', userId)
    } else {
      // Add to current month's spending
      await this.supabase
        .from('gpu_budgets')
        .update({
          current_month_spent_usd: budget.currentMonthSpentUsd + amountUsd,
        })
        .eq('user_id', userId)
    }
  }

  private mapToGPUUsageRecord(data: Record<string, unknown>): GPUUsageRecord {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      gpuTier: data.gpu_tier as GPUTier,
      startTime: new Date(data.start_time as string),
      endTime: data.end_time ? new Date(data.end_time as string) : undefined,
      durationSeconds: data.duration_seconds as number | undefined,
      costUsd: data.cost_usd as number | undefined,
      simulationType: data.simulation_type as string,
      status: data.status as 'running' | 'completed' | 'failed',
      metadata: data.metadata as Record<string, unknown> | undefined,
      createdAt: new Date(data.created_at as string || data.start_time as string),
    }
  }

  private mapToGPUBudget(data: Record<string, unknown>): GPUBudget {
    return {
      userId: data.user_id as string,
      monthlyBudgetUsd: data.monthly_budget_usd as number,
      currentMonthSpentUsd: data.current_month_spent_usd as number,
      billingPeriodStart: new Date(data.billing_period_start as string),
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let gpuUsageServiceInstance: GPUUsageService | null = null

export function getGPUUsageService(): GPUUsageService {
  if (!gpuUsageServiceInstance) {
    gpuUsageServiceInstance = new GPUUsageService()
  }
  return gpuUsageServiceInstance
}

export default GPUUsageService
