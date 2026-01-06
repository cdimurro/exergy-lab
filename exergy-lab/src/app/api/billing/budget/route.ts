/**
 * GPU Budget API Route
 *
 * Endpoints:
 * - GET /api/billing/budget - Get user budget settings
 * - PUT /api/billing/budget - Update user budget settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getGPUUsageService } from '@/lib/billing/gpu-usage-service'
import { USER_TIER_LIMITS } from '@/lib/billing/gpu-pricing'

// ============================================================================
// GET: Get Budget Settings
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    // Get user ID from session/auth
    const userId = req.headers.get('x-user-id') || 'demo-user'
    const userTier = (req.headers.get('x-user-tier') as 'free' | 'pro' | 'enterprise') || 'free'

    const service = getGPUUsageService()
    const budget = await service.getBudget(userId)
    const tierLimits = USER_TIER_LIMITS[userTier]

    return NextResponse.json({
      success: true,
      userId,
      userTier,
      budget: {
        monthlyBudgetUsd: budget?.monthlyBudgetUsd || tierLimits.budgetPerMonth,
        currentMonthSpentUsd: budget?.currentMonthSpentUsd || 0,
        billingPeriodStart: budget?.billingPeriodStart || new Date().toISOString(),
      },
      tierLimits: {
        tier: tierLimits.tier,
        gpuRunsPerMonth: tierLimits.gpuRunsPerMonth,
        budgetPerMonth: tierLimits.budgetPerMonth,
        allowedGPUs: tierLimits.allowedGPUs,
      },
    })
  } catch (error) {
    console.error('[Budget API] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch budget',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// PUT: Update Budget Settings
// ============================================================================

const UpdateBudgetSchema = z.object({
  monthlyBudgetUsd: z.number().min(0).max(1000),
})

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = UpdateBudgetSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: parsed.error.format(),
        },
        { status: 400 }
      )
    }

    // Get user ID from session/auth
    const userId = req.headers.get('x-user-id') || 'demo-user'
    const userTier = (req.headers.get('x-user-tier') as 'free' | 'pro' | 'enterprise') || 'free'

    // Only Pro and Enterprise users can change their budget
    if (userTier === 'free') {
      return NextResponse.json(
        {
          error: 'Budget customization not available on free tier',
          details: 'Upgrade to Pro or Enterprise to set custom budgets',
        },
        { status: 403 }
      )
    }

    const service = getGPUUsageService()
    const updatedBudget = await service.updateBudget(userId, parsed.data.monthlyBudgetUsd)

    if (!updatedBudget) {
      return NextResponse.json(
        {
          error: 'Failed to update budget',
          details: 'Database update failed',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      userId,
      budget: {
        monthlyBudgetUsd: updatedBudget.monthlyBudgetUsd,
        currentMonthSpentUsd: updatedBudget.currentMonthSpentUsd,
        billingPeriodStart: updatedBudget.billingPeriodStart,
      },
    })
  } catch (error) {
    console.error('[Budget API] Update error:', error)
    return NextResponse.json(
      {
        error: 'Failed to update budget',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
