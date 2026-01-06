'use client'

/**
 * GPU Usage Hook
 *
 * React hook for fetching and managing GPU usage data.
 *
 * Features:
 * - Fetch usage summary
 * - Fetch usage history
 * - Auto-refresh on interval
 * - Budget checking
 */

import { useState, useEffect, useCallback } from 'react'
import type { GPUTier } from '@/lib/billing/gpu-pricing'

// ============================================================================
// Types
// ============================================================================

interface GPUUsageRecord {
  id: string
  userId: string
  gpuTier: GPUTier
  startTime: Date
  endTime?: Date
  durationSeconds?: number
  costUsd?: number
  simulationType: string
  status: 'running' | 'completed' | 'failed'
}

interface MonthlyUsageSummary {
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

interface BudgetInfo {
  monthlyLimit: number
  currentSpent: number
  remaining: number
  billingPeriodStart: string
}

interface UseGPUUsageResult {
  summary: MonthlyUsageSummary | null
  budget: BudgetInfo | null
  history: GPUUsageRecord[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  estimateCost: (gpuTier: GPUTier, durationMs: number) => Promise<{
    estimatedCost: number
    allowed: boolean
    reason?: string
  }>
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useGPUUsage(options?: {
  autoRefreshInterval?: number
}): UseGPUUsageResult {
  const [summary, setSummary] = useState<MonthlyUsageSummary | null>(null)
  const [budget, setBudget] = useState<BudgetInfo | null>(null)
  const [history, setHistory] = useState<GPUUsageRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsage = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch summary and budget
      const summaryRes = await fetch('/api/billing/usage')
      if (!summaryRes.ok) {
        throw new Error('Failed to fetch usage summary')
      }
      const summaryData = await summaryRes.json()

      setSummary(summaryData.summary)
      setBudget(summaryData.budget)

      // Fetch history
      const historyRes = await fetch('/api/billing/usage?history=true&limit=50')
      if (historyRes.ok) {
        const historyData = await historyRes.json()
        setHistory(historyData.records.map((r: Record<string, unknown>) => ({
          ...r,
          startTime: new Date(r.startTime as string),
          endTime: r.endTime ? new Date(r.endTime as string) : undefined,
        })))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const estimateCost = useCallback(async (
    gpuTier: GPUTier,
    durationMs: number
  ): Promise<{
    estimatedCost: number
    allowed: boolean
    reason?: string
  }> => {
    try {
      const res = await fetch('/api/billing/usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gpuTier,
          estimatedDurationMs: durationMs,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to estimate cost')
      }

      const data = await res.json()
      return {
        estimatedCost: data.estimate.estimatedCostUsd,
        allowed: data.budgetStatus.allowed,
        reason: data.budgetStatus.reason,
      }
    } catch (err) {
      return {
        estimatedCost: 0,
        allowed: false,
        reason: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])

  // Auto-refresh
  useEffect(() => {
    if (options?.autoRefreshInterval) {
      const interval = setInterval(fetchUsage, options.autoRefreshInterval)
      return () => clearInterval(interval)
    }
  }, [options?.autoRefreshInterval, fetchUsage])

  return {
    summary,
    budget,
    history,
    isLoading,
    error,
    refresh: fetchUsage,
    estimateCost,
  }
}

export default useGPUUsage
