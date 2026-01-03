/**
 * Usage Tracking Types
 *
 * Type definitions for usage tracking and tier limits.
 *
 * @version 0.7.0
 */

/**
 * User subscription tier
 *
 * - free: Search + TEA only
 * - pro ($19.99/mo): All features with moderate limits
 * - enterprise ($99/mo): Unlimited + team features
 */
export type UserTier = 'free' | 'pro' | 'enterprise'

/**
 * Trackable feature types
 */
export type FeatureType =
  | 'search'
  | 'discovery'
  | 'breakthrough'
  | 'simulation'
  | 'tea'
  | 'gpu-simulation'
  | 'experiment'

/**
 * Limit period (how often limits reset)
 */
export type LimitPeriod = 'daily' | 'monthly'

/**
 * Feature limit configuration
 */
export interface FeatureLimit {
  feature: FeatureType
  period: LimitPeriod
  limits: {
    free: number // 0 = blocked, >0 = limit
    pro: number // moderate limits
    enterprise: number // -1 = unlimited
  }
}

/**
 * Usage record for a single feature
 */
export interface FeatureUsage {
  feature: FeatureType
  count: number
  lastUsed: string // ISO timestamp
  periodStart: string // ISO timestamp (start of day/month)
}

/**
 * Complete usage state for a user
 */
export interface UsageState {
  tier: UserTier
  userId?: string
  features: Record<FeatureType, FeatureUsage>
  lastUpdated: string
}

/**
 * Usage check result
 */
export interface UsageCheckResult {
  allowed: boolean
  currentUsage: number
  limit: number
  remaining: number
  percentUsed: number
  resetsAt: string // ISO timestamp
  upgradePrompt?: string
}

/**
 * Usage summary for dashboard display
 */
export interface UsageSummary {
  tier: UserTier
  features: Array<{
    feature: FeatureType
    displayName: string
    currentUsage: number
    limit: number
    percentUsed: number
    period: LimitPeriod
    resetsAt: string
  }>
}
