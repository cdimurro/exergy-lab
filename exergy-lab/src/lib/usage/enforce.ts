/**
 * Usage Limit Enforcement
 *
 * Server-side utilities for enforcing usage limits in API routes.
 * Works with both localStorage-based tracking and database-based tracking.
 */

import { NextResponse } from 'next/server'
import { createServerClient, isSupabaseConfigured } from '@/lib/db/supabase'
import type { FeatureType, UserTier } from './types'
import { getFeatureLimit, getFeaturePeriod, isFeatureAvailable } from './limits'

interface UsageCheckResult {
  allowed: boolean
  currentUsage: number
  limit: number
  remaining: number
  tier: UserTier
  upgradePrompt?: string
}

/**
 * Check and enforce usage limits for a user (server-side)
 *
 * @param userId - Clerk user ID
 * @param feature - Feature type to check
 * @returns UsageCheckResult with allowed status
 */
export async function checkUsageLimit(
  userId: string,
  feature: FeatureType
): Promise<UsageCheckResult> {
  // Default to free tier if database not configured
  let tier: UserTier = 'free'
  let currentUsage = 0

  if (isSupabaseConfigured()) {
    const supabase = createServerClient()

    // Get user's tier
    const { data: user } = await supabase
      .from('users')
      .select('tier')
      .eq('id', userId)
      .single()

    if (user?.tier) {
      tier = user.tier as UserTier
    }

    // Get current usage from usage_tracking table
    const period = getFeaturePeriod(feature)
    const periodStart = getPeriodStart(period)

    const { data: usageRecord } = await supabase
      .from('usage_tracking')
      .select('count')
      .eq('user_id', userId)
      .eq('feature', feature)
      .eq('period_start', periodStart.toISOString().split('T')[0])
      .eq('period_type', period)
      .single()

    currentUsage = usageRecord?.count || 0
  }

  const limit = getFeatureLimit(feature, tier)
  const allowed = limit === -1 || (limit > 0 && currentUsage < limit)
  const remaining = limit === -1 ? -1 : Math.max(0, limit - currentUsage)

  const result: UsageCheckResult = {
    allowed,
    currentUsage,
    limit,
    remaining,
    tier,
  }

  // Add upgrade prompt if at/over limit or feature is blocked
  if (!allowed) {
    if (tier === 'free') {
      if (limit === 0) {
        result.upgradePrompt = 'Upgrade to Pro to unlock this feature'
      } else {
        result.upgradePrompt = 'Upgrade to Pro for higher limits'
      }
    } else if (tier === 'pro') {
      result.upgradePrompt = 'Upgrade to Enterprise for unlimited access'
    }
  }

  return result
}

/**
 * Record usage after successful operation (server-side)
 */
export async function recordUsage(
  userId: string,
  feature: FeatureType
): Promise<void> {
  if (!isSupabaseConfigured()) {
    return
  }

  const supabase = createServerClient()
  const period = getFeaturePeriod(feature)
  const periodStart = getPeriodStart(period).toISOString().split('T')[0]

  // Upsert usage record
  const { error } = await supabase.from('usage_tracking').upsert(
    {
      user_id: userId,
      feature,
      period_start: periodStart,
      period_type: period,
      count: 1,
    },
    {
      onConflict: 'user_id,feature,period_start,period_type',
    }
  )

  if (error) {
    // If upsert failed, try increment
    await supabase.rpc('increment_usage', {
      p_user_id: userId,
      p_feature: feature,
      p_period_start: periodStart,
      p_period_type: period,
    })
  }
}

/**
 * Create a 429 response for rate limit exceeded
 */
export function rateLimitResponse(result: UsageCheckResult) {
  return NextResponse.json(
    {
      error: 'Rate limit exceeded',
      message: result.upgradePrompt || 'Please try again later',
      currentUsage: result.currentUsage,
      limit: result.limit,
      tier: result.tier,
    },
    { status: 429 }
  )
}

/**
 * Create a 403 response for feature blocked
 */
export function featureBlockedResponse(feature: FeatureType, tier: UserTier) {
  const upgradePrompt =
    tier === 'free'
      ? 'Upgrade to Pro to unlock this feature'
      : 'Upgrade to Enterprise for unlimited access'

  return NextResponse.json(
    {
      error: 'Feature not available',
      message: upgradePrompt,
      feature,
      tier,
    },
    { status: 403 }
  )
}

/**
 * Middleware helper to check limits before processing request
 */
export async function withUsageLimit(
  userId: string,
  feature: FeatureType,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const usageCheck = await checkUsageLimit(userId, feature)

  // Check if feature is blocked for this tier
  if (!isFeatureAvailable(feature, usageCheck.tier)) {
    return featureBlockedResponse(feature, usageCheck.tier)
  }

  // Check if rate limit exceeded
  if (!usageCheck.allowed) {
    return rateLimitResponse(usageCheck)
  }

  // Execute the handler
  const response = await handler()

  // Record usage on successful response (2xx status)
  if (response.status >= 200 && response.status < 300) {
    await recordUsage(userId, feature)
  }

  return response
}

// Helper to get period start date
function getPeriodStart(period: 'daily' | 'monthly'): Date {
  const now = new Date()
  if (period === 'daily') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }
  return new Date(now.getFullYear(), now.getMonth(), 1)
}
