/**
 * Usage Tracking Module
 *
 * Exports usage tracking functionality for the application.
 *
 * @version 0.7.0
 */

// Types
export type {
  UserTier,
  FeatureType,
  LimitPeriod,
  FeatureLimit,
  FeatureUsage,
  UsageState,
  UsageCheckResult,
  UsageSummary,
} from './types'

// Limits configuration
export {
  FEATURE_LIMITS,
  FEATURE_DISPLAY_NAMES,
  getFeatureLimit,
  getFeaturePeriod,
  isUnlimited,
  getTierDisplayName,
  getTierPricing,
  getTierDescription,
  isFeatureAvailable,
  getUpgradeTier,
} from './limits'

// Storage
export {
  getUsageState,
  saveUsageState,
  updateTier,
  incrementUsage,
  resetFeatureUsage,
  resetAllUsage,
  clearUsageStorage,
} from './storage'

// Tracker
export {
  checkUsage,
  recordUsage,
  getUsageSummary,
  getCurrentTier,
  setTier,
  canUseFeature,
  getRemainingUses,
} from './tracker'

// Server-side enforcement
export {
  checkUsageLimit,
  recordUsage as recordUsageServer,
  rateLimitResponse,
  featureBlockedResponse,
  withUsageLimit,
} from './enforce'
