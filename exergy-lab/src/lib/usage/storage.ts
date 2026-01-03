/**
 * Usage Storage
 *
 * Persists usage data to localStorage (browser) with later DB migration support.
 *
 * @version 0.7.0
 */

import type { UsageState, FeatureUsage, FeatureType, UserTier } from './types'

const STORAGE_KEY = 'exergy-lab-usage'

/**
 * Initialize default usage state
 */
function createDefaultUsageState(tier: UserTier = 'free'): UsageState {
  const now = new Date().toISOString()
  const features: Record<FeatureType, FeatureUsage> = {
    search: { feature: 'search', count: 0, lastUsed: now, periodStart: now },
    discovery: { feature: 'discovery', count: 0, lastUsed: now, periodStart: now },
    breakthrough: { feature: 'breakthrough', count: 0, lastUsed: now, periodStart: now },
    simulation: { feature: 'simulation', count: 0, lastUsed: now, periodStart: now },
    tea: { feature: 'tea', count: 0, lastUsed: now, periodStart: now },
    'gpu-simulation': { feature: 'gpu-simulation', count: 0, lastUsed: now, periodStart: now },
    experiment: { feature: 'experiment', count: 0, lastUsed: now, periodStart: now },
  }

  return {
    tier,
    features,
    lastUpdated: now,
  }
}

/**
 * Get usage state from storage
 */
export function getUsageState(): UsageState {
  if (typeof window === 'undefined') {
    return createDefaultUsageState()
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return createDefaultUsageState()
    }

    const parsed = JSON.parse(stored) as UsageState
    return parsed
  } catch (error) {
    console.error('[UsageStorage] Failed to read usage state:', error)
    return createDefaultUsageState()
  }
}

/**
 * Save usage state to storage
 */
export function saveUsageState(state: UsageState): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const updated = {
      ...state,
      lastUpdated: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('[UsageStorage] Failed to save usage state:', error)
  }
}

/**
 * Update tier in storage
 */
export function updateTier(tier: UserTier): UsageState {
  const state = getUsageState()
  const updated = { ...state, tier }
  saveUsageState(updated)
  return updated
}

/**
 * Increment usage for a feature
 */
export function incrementUsage(feature: FeatureType): UsageState {
  const state = getUsageState()
  const now = new Date().toISOString()

  const currentFeature = state.features[feature]
  state.features[feature] = {
    ...currentFeature,
    count: currentFeature.count + 1,
    lastUsed: now,
  }

  saveUsageState(state)
  return state
}

/**
 * Reset usage for a feature (e.g., when period changes)
 */
export function resetFeatureUsage(feature: FeatureType): UsageState {
  const state = getUsageState()
  const now = new Date().toISOString()

  state.features[feature] = {
    feature,
    count: 0,
    lastUsed: now,
    periodStart: now,
  }

  saveUsageState(state)
  return state
}

/**
 * Reset all usage (e.g., for testing)
 */
export function resetAllUsage(): UsageState {
  const state = getUsageState()
  const fresh = createDefaultUsageState(state.tier)
  saveUsageState(fresh)
  return fresh
}

/**
 * Clear storage entirely
 */
export function clearUsageStorage(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('[UsageStorage] Failed to clear usage storage:', error)
  }
}
