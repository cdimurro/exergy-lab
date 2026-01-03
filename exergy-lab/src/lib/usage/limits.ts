/**
 * Usage Limits Configuration
 *
 * Defines feature limits for each subscription tier.
 *
 * @version 0.7.0
 */

import type { FeatureLimit, FeatureType, UserTier } from './types'

/**
 * Feature limits by tier
 *
 * Free: Search + TEA only (other features blocked with 0)
 * Pro ($19.99/mo): All features with moderate limits
 * Enterprise ($99/mo): Unlimited (-1)
 */
export const FEATURE_LIMITS: FeatureLimit[] = [
  {
    feature: 'search',
    period: 'daily',
    limits: {
      free: 10, // Available on free tier
      pro: 50,
      enterprise: -1,
    },
  },
  {
    feature: 'tea',
    period: 'monthly',
    limits: {
      free: 5, // Available on free tier
      pro: 25,
      enterprise: -1,
    },
  },
  {
    feature: 'discovery',
    period: 'monthly',
    limits: {
      free: 0, // Blocked on free tier
      pro: 10,
      enterprise: -1,
    },
  },
  {
    feature: 'breakthrough',
    period: 'monthly',
    limits: {
      free: 0, // Blocked on free tier
      pro: 5,
      enterprise: -1,
    },
  },
  {
    feature: 'simulation',
    period: 'daily',
    limits: {
      free: 0, // Blocked on free tier
      pro: 30,
      enterprise: -1,
    },
  },
  {
    feature: 'experiment',
    period: 'monthly',
    limits: {
      free: 0, // Blocked on free tier
      pro: 20,
      enterprise: -1,
    },
  },
  {
    feature: 'gpu-simulation',
    period: 'monthly',
    limits: {
      free: 0, // Blocked on free tier
      pro: 5,
      enterprise: -1,
    },
  },
]

/**
 * Display names for features
 */
export const FEATURE_DISPLAY_NAMES: Record<FeatureType, string> = {
  search: 'Literature Searches',
  discovery: 'Discovery Workflows',
  breakthrough: 'Breakthrough Workflows',
  simulation: 'Simulations',
  tea: 'TEA Reports',
  'gpu-simulation': 'GPU Simulations',
  experiment: 'Experiment Designs',
}

/**
 * Get limit for a feature and tier
 */
export function getFeatureLimit(feature: FeatureType, tier: UserTier): number {
  const featureConfig = FEATURE_LIMITS.find((f) => f.feature === feature)
  if (!featureConfig) return 0
  return featureConfig.limits[tier]
}

/**
 * Get period for a feature
 */
export function getFeaturePeriod(feature: FeatureType): 'daily' | 'monthly' {
  const featureConfig = FEATURE_LIMITS.find((f) => f.feature === feature)
  return featureConfig?.period || 'daily'
}

/**
 * Check if a feature is unlimited for a tier
 */
export function isUnlimited(feature: FeatureType, tier: UserTier): boolean {
  return getFeatureLimit(feature, tier) === -1
}

/**
 * Get tier display name
 */
export function getTierDisplayName(tier: UserTier): string {
  const names: Record<UserTier, string> = {
    free: 'Free',
    pro: 'Pro',
    enterprise: 'Enterprise',
  }
  return names[tier]
}

/**
 * Get tier pricing
 */
export function getTierPricing(tier: UserTier): { monthly: number; annual: number } | null {
  const pricing: Record<UserTier, { monthly: number; annual: number } | null> = {
    free: null,
    pro: { monthly: 1999, annual: 19990 }, // $19.99/mo in cents
    enterprise: { monthly: 9900, annual: 99000 }, // $99/mo in cents
  }
  return pricing[tier]
}

/**
 * Get tier description
 */
export function getTierDescription(tier: UserTier): string {
  const descriptions: Record<UserTier, string> = {
    free: 'Search + TEA only',
    pro: 'All features with moderate limits',
    enterprise: 'Unlimited + team features',
  }
  return descriptions[tier]
}

/**
 * Check if a feature is available for a tier (not blocked)
 */
export function isFeatureAvailable(feature: FeatureType, tier: UserTier): boolean {
  const limit = getFeatureLimit(feature, tier)
  return limit !== 0
}

/**
 * Get next tier for upgrade
 */
export function getUpgradeTier(tier: UserTier): UserTier | null {
  switch (tier) {
    case 'free':
      return 'pro'
    case 'pro':
      return 'enterprise'
    case 'enterprise':
      return null
  }
}
