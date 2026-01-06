/**
 * GPU Usage API Route
 *
 * Endpoints:
 * - GET /api/billing/usage - Get current month usage summary
 * - GET /api/billing/usage?history=true - Get usage history
 * - POST /api/billing/usage/estimate - Estimate cost before run
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getGPUUsageService } from '@/lib/billing/gpu-usage-service'
import { estimateSimulationCost, type GPUTier } from '@/lib/billing/gpu-pricing'

// ============================================================================
// GET: Usage Summary or History
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    // Get user ID from session/auth (for now, use a placeholder)
    // In production, this would come from your auth system
    const userId = req.headers.get('x-user-id') || 'demo-user'

    const { searchParams } = new URL(req.url)
    const showHistory = searchParams.get('history') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const service = getGPUUsageService()

    if (showHistory) {
      const history = await service.getUsageHistory(userId, limit)
      return NextResponse.json({
        success: true,
        userId,
        records: history,
      })
    }

    const summary = await service.getMonthlyUsage(userId)
    const budget = await service.getBudget(userId)

    return NextResponse.json({
      success: true,
      userId,
      month: summary?.month,
      summary: {
        totalRuns: summary?.totalRuns || 0,
        completedRuns: summary?.completedRuns || 0,
        failedRuns: summary?.failedRuns || 0,
        totalDurationSeconds: summary?.totalDurationSeconds || 0,
        totalCostUsd: summary?.totalCostUsd || 0,
        byGpuTier: summary?.byGpuTier || {},
        bySimulationType: summary?.bySimulationType || {},
      },
      budget: {
        monthlyLimit: budget?.monthlyBudgetUsd || 10.00,
        currentSpent: budget?.currentMonthSpentUsd || 0,
        remaining: (budget?.monthlyBudgetUsd || 10.00) - (budget?.currentMonthSpentUsd || 0),
        billingPeriodStart: budget?.billingPeriodStart,
      },
    })
  } catch (error) {
    console.error('[Billing API] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch usage',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST: Estimate Cost
// ============================================================================

const EstimateRequestSchema = z.object({
  gpuTier: z.enum(['T4', 'A10G', 'A100', 'H100']),
  estimatedDurationMs: z.number().positive(),
  simulationType: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = EstimateRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: parsed.error.format(),
        },
        { status: 400 }
      )
    }

    const { gpuTier, estimatedDurationMs, simulationType } = parsed.data

    // Get user info
    const userId = req.headers.get('x-user-id') || 'demo-user'
    const userTier = (req.headers.get('x-user-tier') as 'free' | 'pro' | 'enterprise') || 'free'

    const service = getGPUUsageService()

    // Check if user can run
    const budgetCheck = await service.checkBudget(userId, userTier, gpuTier as GPUTier)

    // Estimate cost
    const estimate = estimateSimulationCost(gpuTier as GPUTier, estimatedDurationMs)

    return NextResponse.json({
      success: true,
      estimate: {
        gpuTier: estimate.tier,
        estimatedDurationMs: estimate.estimatedDurationMs,
        estimatedCostUsd: estimate.estimatedCost,
        ratePerHourUsd: estimate.ratePerHour,
        simulationType,
      },
      budgetStatus: {
        allowed: budgetCheck.allowed,
        reason: budgetCheck.reason,
        currentSpentUsd: budgetCheck.currentSpent,
        budgetLimitUsd: budgetCheck.budgetLimit,
        remainingBudgetUsd: budgetCheck.remainingBudget,
        runsThisMonth: budgetCheck.runsThisMonth,
        runLimit: budgetCheck.runLimit,
      },
    })
  } catch (error) {
    console.error('[Billing API] Estimate error:', error)
    return NextResponse.json(
      {
        error: 'Failed to estimate cost',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
