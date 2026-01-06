/**
 * GPU Pricing Constants
 *
 * Modal Labs GPU pricing as of January 2026.
 * Used for cost estimation and tracking.
 *
 * @see https://modal.com/pricing
 */

// ============================================================================
// GPU Types
// ============================================================================

export type GPUTier = 'T4' | 'A10G' | 'A100' | 'H100'

export interface GPUPricing {
  tier: GPUTier
  name: string
  ratePerHour: number
  ratePerMinute: number
  ratePerSecond: number
  vram: number          // GB
  cudaCores: number
  tensorCores: number
  recommendedFor: string[]
}

// ============================================================================
// Pricing Data (Modal Labs - Jan 2026)
// ============================================================================

export const GPU_PRICING_TABLE: Record<GPUTier, GPUPricing> = {
  T4: {
    tier: 'T4',
    name: 'NVIDIA Tesla T4',
    ratePerHour: 0.26,
    ratePerMinute: 0.26 / 60,
    ratePerSecond: 0.26 / 3600,
    vram: 16,
    cudaCores: 2560,
    tensorCores: 320,
    recommendedFor: ['inference', 'light-training', 'monte-carlo'],
  },
  A10G: {
    tier: 'A10G',
    name: 'NVIDIA A10G',
    ratePerHour: 0.76,
    ratePerMinute: 0.76 / 60,
    ratePerSecond: 0.76 / 3600,
    vram: 24,
    cudaCores: 9216,
    tensorCores: 288,
    recommendedFor: ['CFD', 'FNO-inference', 'medium-scale'],
  },
  A100: {
    tier: 'A100',
    name: 'NVIDIA A100 (40GB)',
    ratePerHour: 2.86,
    ratePerMinute: 2.86 / 60,
    ratePerSecond: 2.86 / 3600,
    vram: 40,
    cudaCores: 6912,
    tensorCores: 432,
    recommendedFor: ['materials-discovery', 'large-scale-MD', 'training'],
  },
  H100: {
    tier: 'H100',
    name: 'NVIDIA H100 (80GB)',
    ratePerHour: 4.89,
    ratePerMinute: 4.89 / 60,
    ratePerSecond: 4.89 / 3600,
    vram: 80,
    cudaCores: 16896,
    tensorCores: 528,
    recommendedFor: ['LLM-training', 'massive-scale', 'foundation-models'],
  },
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate GPU cost based on execution time
 */
export function calculateGPUCost(tier: GPUTier, durationMs: number): number {
  const pricing = GPU_PRICING_TABLE[tier]
  if (!pricing) {
    throw new Error(`Unknown GPU tier: ${tier}`)
  }
  return (durationMs / 1000) * pricing.ratePerSecond
}

/**
 * Calculate GPU cost based on duration in seconds
 */
export function calculateGPUCostSeconds(tier: GPUTier, durationSeconds: number): number {
  const pricing = GPU_PRICING_TABLE[tier]
  if (!pricing) {
    throw new Error(`Unknown GPU tier: ${tier}`)
  }
  return durationSeconds * pricing.ratePerSecond
}

/**
 * Estimate execution cost for a simulation
 */
export function estimateSimulationCost(
  tier: GPUTier,
  estimatedDurationMs: number
): {
  tier: GPUTier
  estimatedDurationMs: number
  estimatedCost: number
  ratePerHour: number
} {
  const pricing = GPU_PRICING_TABLE[tier]
  if (!pricing) {
    throw new Error(`Unknown GPU tier: ${tier}`)
  }

  return {
    tier,
    estimatedDurationMs,
    estimatedCost: calculateGPUCost(tier, estimatedDurationMs),
    ratePerHour: pricing.ratePerHour,
  }
}

/**
 * Format cost as currency string
 */
export function formatCost(costUsd: number): string {
  if (costUsd < 0.01) {
    return `$${(costUsd * 1000).toFixed(2)}m` // millidollars
  } else if (costUsd < 1) {
    return `$${costUsd.toFixed(4)}`
  } else {
    return `$${costUsd.toFixed(2)}`
  }
}

/**
 * Get recommended GPU tier for simulation type
 */
export function getRecommendedTier(simulationType: string): GPUTier {
  const typeMap: Record<string, GPUTier> = {
    'monte-carlo': 'T4',
    'parametric-sweep': 'T4',
    'cfd': 'A10G',
    'heat-transfer': 'A10G',
    'fno-inference': 'A10G',
    'materials-discovery': 'A100',
    'geometry-relaxation': 'A100',
    'battery-screening': 'A100',
    'molecular-dynamics': 'A100',
    'llm-training': 'H100',
  }

  return typeMap[simulationType.toLowerCase()] || 'A10G'
}

// ============================================================================
// Tier Limits
// ============================================================================

export interface TierLimits {
  tier: 'free' | 'pro' | 'enterprise'
  gpuRunsPerMonth: number | null  // null = unlimited
  budgetPerMonth: number | null   // USD, null = unlimited
  allowedGPUs: GPUTier[]
}

export const USER_TIER_LIMITS: Record<string, TierLimits> = {
  free: {
    tier: 'free',
    gpuRunsPerMonth: 3,
    budgetPerMonth: 0.50,
    allowedGPUs: ['T4'],
  },
  pro: {
    tier: 'pro',
    gpuRunsPerMonth: null, // unlimited
    budgetPerMonth: 10.00,
    allowedGPUs: ['T4', 'A10G', 'A100'],
  },
  enterprise: {
    tier: 'enterprise',
    gpuRunsPerMonth: null,
    budgetPerMonth: null,
    allowedGPUs: ['T4', 'A10G', 'A100', 'H100'],
  },
}

/**
 * Check if user can run a simulation based on tier limits
 */
export function canRunSimulation(
  userTier: 'free' | 'pro' | 'enterprise',
  gpuTier: GPUTier,
  currentMonthSpent: number,
  currentMonthRuns: number
): {
  allowed: boolean
  reason?: string
} {
  const limits = USER_TIER_LIMITS[userTier]

  // Check if GPU is allowed for tier
  if (!limits.allowedGPUs.includes(gpuTier)) {
    return {
      allowed: false,
      reason: `${gpuTier} GPU not available on ${userTier} tier`,
    }
  }

  // Check run limit
  if (limits.gpuRunsPerMonth !== null && currentMonthRuns >= limits.gpuRunsPerMonth) {
    return {
      allowed: false,
      reason: `Monthly GPU run limit reached (${limits.gpuRunsPerMonth})`,
    }
  }

  // Check budget
  if (limits.budgetPerMonth !== null && currentMonthSpent >= limits.budgetPerMonth) {
    return {
      allowed: false,
      reason: `Monthly budget limit reached ($${limits.budgetPerMonth.toFixed(2)})`,
    }
  }

  return { allowed: true }
}
