/**
 * Usage Tracker
 *
 * Core logic for tracking and checking feature usage against tier limits.
 *
 * @version 0.7.0
 */

import type {
  FeatureType,
  UserTier,
  UsageCheckResult,
  UsageSummary,
  UsageState,
} from './types'
import {
  getFeatureLimit,
  getFeaturePeriod,
  isUnlimited,
  FEATURE_LIMITS,
  FEATURE_DISPLAY_NAMES,
} from './limits'
import {
  getUsageState,
  saveUsageState,
  incrementUsage as storageIncrement,
  resetFeatureUsage,
} from './storage'

/**
 * Get the start of the current period (day or month)
 */
function getPeriodStart(period: 'daily' | 'monthly'): Date {
  const now = new Date()
  if (period === 'daily') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

/**
 * Get when the current period ends (for reset)
 */
function getPeriodEnd(period: 'daily' | 'monthly'): Date {
  const now = new Date()
  if (period === 'daily') {
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    return tomorrow
  }
  return new Date(now.getFullYear(), now.getMonth() + 1, 1)
}

/**
 * Check if the period has changed and reset if needed
 */
function checkAndResetPeriod(feature: FeatureType, state: UsageState): UsageState {
  const period = getFeaturePeriod(feature)
  const periodStart = getPeriodStart(period)
  const featureUsage = state.features[feature]

  // If the stored periodStart is before the current period start, reset
  const storedPeriodStart = new Date(featureUsage.periodStart)
  if (storedPeriodStart < periodStart) {
    return resetFeatureUsage(feature)
  }

  return state
}

/**
 * Check if a feature can be used (hasn't exceeded limit)
 */
export function checkUsage(
  feature: FeatureType,
  tier?: UserTier
): UsageCheckResult {
  let state = getUsageState()
  const effectiveTier = tier || state.tier

  // Check and reset period if needed
  state = checkAndResetPeriod(feature, state)

  const limit = getFeatureLimit(feature, effectiveTier)
  const period = getFeaturePeriod(feature)
  const currentUsage = state.features[feature].count
  const resetsAt = getPeriodEnd(period).toISOString()

  // Unlimited
  if (limit === -1) {
    return {
      allowed: true,
      currentUsage,
      limit: -1,
      remaining: -1,
      percentUsed: 0,
      resetsAt,
    }
  }

  const remaining = Math.max(0, limit - currentUsage)
  const allowed = currentUsage < limit
  const percentUsed = limit > 0 ? Math.round((currentUsage / limit) * 100) : 0

  const result: UsageCheckResult = {
    allowed,
    currentUsage,
    limit,
    remaining,
    percentUsed,
    resetsAt,
  }

  // Add upgrade prompt if at/over limit or feature is blocked
  if (!allowed || percentUsed >= 80) {
    if (effectiveTier === 'free') {
      if (limit === 0) {
        result.upgradePrompt = 'Upgrade to Pro to unlock this feature'
      } else {
        result.upgradePrompt = 'Upgrade to Pro for higher limits'
      }
    } else if (effectiveTier === 'pro') {
      result.upgradePrompt = 'Upgrade to Enterprise for unlimited access'
    }
  }

  return result
}

/**
 * Record usage of a feature (call after successful operation)
 */
export function recordUsage(feature: FeatureType): UsageState {
  // First check and reset period if needed
  let state = getUsageState()
  state = checkAndResetPeriod(feature, state)

  // Then increment
  return storageIncrement(feature)
}

/**
 * Get usage summary for all features (for dashboard display)
 */
export function getUsageSummary(): UsageSummary {
  const state = getUsageState()

  const features = FEATURE_LIMITS.map((config) => {
    const limit = getFeatureLimit(config.feature, state.tier)
    const currentUsage = state.features[config.feature].count
    const resetsAt = getPeriodEnd(config.period).toISOString()

    return {
      feature: config.feature,
      displayName: FEATURE_DISPLAY_NAMES[config.feature],
      currentUsage,
      limit,
      percentUsed: limit > 0 ? Math.round((currentUsage / limit) * 100) : 0,
      period: config.period,
      resetsAt,
    }
  })

  return {
    tier: state.tier,
    features,
  }
}

/**
 * Get current tier
 */
export function getCurrentTier(): UserTier {
  return getUsageState().tier
}

/**
 * Set tier (for upgrade/downgrade)
 */
export function setTier(tier: UserTier): void {
  const state = getUsageState()
  saveUsageState({ ...state, tier })
}

/**
 * Check if user can use a feature (shorthand for checkUsage().allowed)
 */
export function canUseFeature(feature: FeatureType): boolean {
  return checkUsage(feature).allowed
}

/**
 * Get remaining uses for a feature
 */
export function getRemainingUses(feature: FeatureType): number {
  return checkUsage(feature).remaining
}
