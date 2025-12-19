/**
 * usePromptSuggestion Hook
 *
 * Fetches an AI-generated improved prompt based on rubric feedback
 * from a failed discovery phase.
 */

import { useState, useEffect, useCallback } from 'react'
import type { PromptImprovementResponse } from '@/app/api/discovery/improve-prompt/route'

interface FailedCriterion {
  id: string
  issue: string
  suggestion: string
  score: number
  maxScore: number
}

interface UsePromptSuggestionProps {
  originalQuery: string
  failedPhase: string | null
  failedCriteria: FailedCriterion[]
  overallScore: number
  domain?: string
  enabled?: boolean
}

interface PromptSuggestion {
  improvedPrompt: string
  explanation: string
  keyChanges: string[]
}

export function usePromptSuggestion({
  originalQuery,
  failedPhase,
  failedCriteria,
  overallScore,
  domain,
  enabled = true,
}: UsePromptSuggestionProps) {
  const [suggestion, setSuggestion] = useState<PromptSuggestion | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSuggestion = useCallback(async () => {
    if (!originalQuery || !failedPhase || !enabled) {
      console.log('[usePromptSuggestion] Skipping fetch:', { originalQuery: !!originalQuery, failedPhase, enabled })
      return
    }

    console.log('[usePromptSuggestion] Fetching suggestion for:', {
      originalQuery: originalQuery.substring(0, 50) + '...',
      failedPhase,
      failedCriteriaCount: failedCriteria.length,
      overallScore,
      domain,
    })

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/discovery/improve-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalQuery,
          failedPhase,
          failedCriteria,
          overallScore,
          domain,
        }),
      })

      console.log('[usePromptSuggestion] Response status:', response.status)
      const data: PromptImprovementResponse = await response.json()
      console.log('[usePromptSuggestion] Response data:', { success: data.success, error: data.error })

      if (data.success && data.improvedPrompt) {
        setSuggestion({
          improvedPrompt: data.improvedPrompt,
          explanation: data.explanation,
          keyChanges: data.keyChanges,
        })
      } else {
        setError(data.error || 'Failed to generate suggestion')
      }
    } catch (err) {
      console.error('[usePromptSuggestion] Network/parse error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [originalQuery, failedPhase, failedCriteria, overallScore, domain, enabled])

  // Fetch suggestion when inputs change
  // Note: failedCriteria can be empty - the API will still generate suggestions based on phase/score
  useEffect(() => {
    if (enabled && originalQuery && failedPhase) {
      fetchSuggestion()
    }
  }, [enabled, originalQuery, failedPhase, failedCriteria.length, fetchSuggestion])

  const refetch = useCallback(() => {
    fetchSuggestion()
  }, [fetchSuggestion])

  const clear = useCallback(() => {
    setSuggestion(null)
    setError(null)
  }, [])

  return {
    suggestion,
    isLoading,
    error,
    refetch,
    clear,
  }
}

/**
 * Extract failed criteria from a JudgeResult for use with the hook
 */
export function extractFailedCriteria(
  judgeResult: {
    itemScores?: Array<{
      itemId: string
      score: number
      maxPoints: number
      passed: boolean
      reasoning?: string
    }>
  } | null
): FailedCriterion[] {
  if (!judgeResult?.itemScores) {
    return []
  }

  return judgeResult.itemScores
    .filter((item) => !item.passed)
    .map((item) => ({
      id: item.itemId,
      issue: item.reasoning || `Failed criterion: ${item.itemId}`,
      suggestion: `Improve ${item.itemId} to score higher`,
      score: item.score,
      maxScore: item.maxPoints,
    }))
}

export default usePromptSuggestion
