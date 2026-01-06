/**
 * Billing Module
 *
 * GPU usage tracking and budget management for Exergy Lab.
 *
 * Features:
 * - GPU pricing constants (Modal Labs)
 * - Usage tracking via Supabase
 * - Per-user budget limits
 * - Monthly usage summaries
 *
 * @see gpu-pricing.ts - Pricing constants and tier limits
 * @see gpu-usage-service.ts - Usage tracking service
 */

// GPU Pricing
export {
  type GPUTier,
  type GPUPricing,
  type TierLimits,
  GPU_PRICING_TABLE,
  USER_TIER_LIMITS,
  calculateGPUCost,
  calculateGPUCostSeconds,
  estimateSimulationCost,
  formatCost,
  getRecommendedTier,
  canRunSimulation,
} from './gpu-pricing'

// GPU Usage Service
export {
  GPUUsageService,
  getGPUUsageService,
  type GPUUsageRecord,
  type GPUBudget,
  type MonthlyUsageSummary,
  type BudgetCheckResult,
} from './gpu-usage-service'
