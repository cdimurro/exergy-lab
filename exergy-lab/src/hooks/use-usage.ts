/**
 * useUsage Hook
 *
 * React hook for accessing usage tracking and tier limits.
 *
 * @version 0.7.0
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import type {
  FeatureType,
  UserTier,
  UsageCheckResult,
  UsageSummary,
} from '@/lib/usage/types'
import {
  checkUsage,
  recordUsage,
  getUsageSummary,
  getCurrentTier,
  setTier as setTierStorage,
  canUseFeature,
  getRemainingUses,
} from '@/lib/usage/tracker'
import { FEATURE_DISPLAY_NAMES, getTierDisplayName } from '@/lib/usage/limits'

/**
 * Hook return type
 */
interface UseUsageReturn {
  /**
   * Current user tier
   */
  tier: UserTier
  /**
   * Tier display name
   */
  tierDisplayName: string
  /**
   * Usage summary for all features
   */
  summary: UsageSummary | null
  /**
   * Check if a feature can be used
   */
  checkFeature: (feature: FeatureType) => UsageCheckResult
  /**
   * Record usage of a feature (call after successful operation)
   */
  recordFeatureUsage: (feature: FeatureType) => void
  /**
   * Quick check if feature is available
   */
  canUse: (feature: FeatureType) => boolean
  /**
   * Get remaining uses for a feature
   */
  remaining: (feature: FeatureType) => number
  /**
   * Get display name for a feature
   */
  getFeatureName: (feature: FeatureType) => string
  /**
   * Update user tier
   */
  setTier: (tier: UserTier) => void
  /**
   * Refresh usage data
   */
  refresh: () => void
  /**
   * Is usage data loaded
   */
  isLoaded: boolean
}

/**
 * Hook for accessing usage tracking
 */
export function useUsage(): UseUsageReturn {
  const [tier, setTierState] = useState<UserTier>('free')
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load initial data on mount
  useEffect(() => {
    const loadUsage = () => {
      const currentTier = getCurrentTier()
      const currentSummary = getUsageSummary()
      setTierState(currentTier)
      setSummary(currentSummary)
      setIsLoaded(true)
    }

    loadUsage()

    // Also refresh on storage events (cross-tab sync)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'exergy-lab-usage') {
        loadUsage()
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // Refresh usage data
  const refresh = useCallback(() => {
    const currentTier = getCurrentTier()
    const currentSummary = getUsageSummary()
    setTierState(currentTier)
    setSummary(currentSummary)
  }, [])

  // Check if feature can be used
  const checkFeature = useCallback((feature: FeatureType): UsageCheckResult => {
    return checkUsage(feature)
  }, [])

  // Record usage and refresh
  const recordFeatureUsage = useCallback((feature: FeatureType) => {
    recordUsage(feature)
    refresh()
  }, [refresh])

  // Quick availability check
  const canUse = useCallback((feature: FeatureType): boolean => {
    return canUseFeature(feature)
  }, [])

  // Get remaining uses
  const remaining = useCallback((feature: FeatureType): number => {
    return getRemainingUses(feature)
  }, [])

  // Get feature display name
  const getFeatureName = useCallback((feature: FeatureType): string => {
    return FEATURE_DISPLAY_NAMES[feature]
  }, [])

  // Update tier
  const setTier = useCallback((newTier: UserTier) => {
    setTierStorage(newTier)
    setTierState(newTier)
    refresh()
  }, [refresh])

  return {
    tier,
    tierDisplayName: getTierDisplayName(tier),
    summary,
    checkFeature,
    recordFeatureUsage,
    canUse,
    remaining,
    getFeatureName,
    setTier,
    refresh,
    isLoaded,
  }
}

/**
 * Hook for checking a single feature's usage
 */
export function useFeatureUsage(feature: FeatureType) {
  const { checkFeature, recordFeatureUsage, canUse, remaining, isLoaded } = useUsage()

  const check = useCallback(() => checkFeature(feature), [checkFeature, feature])
  const record = useCallback(() => recordFeatureUsage(feature), [recordFeatureUsage, feature])
  const available = useCallback(() => canUse(feature), [canUse, feature])
  const left = useCallback(() => remaining(feature), [remaining, feature])

  return {
    check,
    record,
    canUse: available,
    remaining: left,
    isLoaded,
  }
}
