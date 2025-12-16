/**
 * Activity Tracking Hook
 * Easy-to-use React hook for tracking user interactions
 */

'use client'

import { useEffect, useCallback } from 'react'
import { activityLogger } from '@/lib/activity-logger'
import { usePathname } from 'next/navigation'

export function useActivityTracking() {
  const pathname = usePathname()

  // Track page views
  useEffect(() => {
    activityLogger.logPageView(pathname)
  }, [pathname])

  // Track field inputs
  const trackFieldInput = useCallback(
    (fieldName: string, value: any, metadata?: Record<string, any>) => {
      activityLogger.logFieldInput(pathname, fieldName, value, metadata)
    },
    [pathname]
  )

  // Track search
  const trackSearch = useCallback(
    async (query: string, filters?: any, results?: any) => {
      await activityLogger.logSearch(query, filters, results)
    },
    []
  )

  // Track discovery
  const trackDiscovery = useCallback(
    async (prompt: any, report?: any) => {
      await activityLogger.logDiscovery(prompt, report)
    },
    []
  )

  // Track experiment
  const trackExperiment = useCallback(
    async (inputs: any, design?: any) => {
      await activityLogger.logExperiment(inputs, design)
    },
    []
  )

  // Track simulation
  const trackSimulation = useCallback(
    async (inputs: any, results?: any, duration?: number) => {
      await activityLogger.logSimulation(inputs, results, duration)
    },
    []
  )

  // Track TEA
  const trackTEA = useCallback(
    async (inputs: any, results?: any) => {
      await activityLogger.logTEA(inputs, results)
    },
    []
  )

  // Track AI agent
  const trackAI = useCallback(
    async (
      action: string,
      prompt: string,
      response?: string,
      model?: string,
      tokens?: number,
      responseTime?: number
    ) => {
      await activityLogger.logAI(pathname, action, prompt, response, model, tokens, responseTime)
    },
    [pathname]
  )

  // Track error
  const trackError = useCallback(
    async (action: string, error: Error | string, metadata?: Record<string, any>) => {
      await activityLogger.logError(pathname, action, error, metadata)
    },
    [pathname]
  )

  return {
    trackFieldInput,
    trackSearch,
    trackDiscovery,
    trackExperiment,
    trackSimulation,
    trackTEA,
    trackAI,
    trackError,
  }
}

/**
 * Input tracking wrapper component
 */
export function useInputTracking<T = any>(
  fieldName: string,
  debounceMs: number = 1000
) {
  const { trackFieldInput } = useActivityTracking()

  let timeoutId: NodeJS.Timeout | null = null

  const track = useCallback(
    (value: T, metadata?: Record<string, any>) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(() => {
        trackFieldInput(fieldName, value, metadata)
      }, debounceMs)
    },
    [fieldName, trackFieldInput, debounceMs]
  )

  return track
}
