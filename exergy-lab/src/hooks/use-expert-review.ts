/**
 * useExpertReview Hook (v0.0.5)
 *
 * Hook for managing expert review state and workflow.
 * Handles review submissions, feedback storage, and integration
 * with the hypothesis racing pipeline.
 *
 * Now integrated with ExpertFeedbackStore for persistent storage
 * and success rate tracking.
 *
 * @see ExpertReviewPanel.tsx - UI component
 * @see hypothesis-racer.ts - Integration point
 * @see lib/store/expert-feedback-store.ts - Persistent storage
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import type { RacingHypothesis } from '@/lib/ai/agents/hypgen'
import type { ExpertDecision, ExpertReview } from '@/components/discovery/ExpertReviewPanel'
import type { StructuredFeedback } from '@/components/discovery/HypothesisFeedbackForm'
import { useExpertFeedbackStore } from '@/lib/store/expert-feedback-store'

// ============================================================================
// Types
// ============================================================================

export interface ExpertReviewState {
  isReviewMode: boolean
  reviews: Map<string, ExpertReview>
  pendingHypotheses: RacingHypothesis[]
  approvedHypotheses: RacingHypothesis[]
  rejectedHypotheses: RacingHypothesis[]
  refinementRequested: RacingHypothesis[]
  currentHypothesisIndex: number
  expertId: string
  sessionStartTime: number
  totalReviewTime: number
}

export interface ExpertReviewActions {
  startReview: (hypotheses: RacingHypothesis[], expertId?: string, discoveryId?: string) => void
  submitReview: (hypothesisId: string, decision: ExpertDecision, feedback?: string) => void
  submitStructuredFeedback: (hypothesisId: string, feedback: StructuredFeedback) => void
  skipHypothesis: (hypothesisId: string) => void
  bulkApprove: (hypothesisIds: string[]) => void
  bulkReject: (hypothesisIds: string[]) => void
  navigateToHypothesis: (index: number) => void
  endReview: () => ExpertReviewSummary
  cancelReview: () => void
  getReviewForHypothesis: (hypothesisId: string) => ExpertReview | undefined
  isHypothesisReviewed: (hypothesisId: string) => boolean
  getSuccessMetrics: () => import('@/lib/store/expert-feedback-store').ExpertSuccessMetrics
  getPromptTuningData: (domain: string, agent: string) => import('@/lib/store/expert-feedback-store').PromptTuningData
}

export interface ExpertReviewSummary {
  totalReviewed: number
  approved: number
  rejected: number
  refinementRequested: number
  skipped: number
  averageConfidence: number
  totalTimeMinutes: number
  reviews: ExpertReview[]
}

export interface UseExpertReviewOptions {
  defaultExpertId?: string
  autoAdvance?: boolean
  onReviewComplete?: (summary: ExpertReviewSummary) => void
  onHypothesisReviewed?: (review: ExpertReview) => void
}

// ============================================================================
// Initial State
// ============================================================================

const createInitialState = (): ExpertReviewState => ({
  isReviewMode: false,
  reviews: new Map(),
  pendingHypotheses: [],
  approvedHypotheses: [],
  rejectedHypotheses: [],
  refinementRequested: [],
  currentHypothesisIndex: 0,
  expertId: 'expert',
  sessionStartTime: 0,
  totalReviewTime: 0,
})

// ============================================================================
// Hook Implementation
// ============================================================================

export function useExpertReview(options: UseExpertReviewOptions = {}): [
  ExpertReviewState,
  ExpertReviewActions
] {
  const {
    defaultExpertId = 'expert',
    autoAdvance = true,
    onReviewComplete,
    onHypothesisReviewed,
  } = options

  const [state, setState] = useState<ExpertReviewState>(createInitialState())

  // Access the persistent expert feedback store
  const feedbackStore = useExpertFeedbackStore()

  // Current discovery ID for persistence (set when startReview is called)
  const [currentDiscoveryId, setCurrentDiscoveryId] = useState<string>('')

  // ============================================================================
  // Actions
  // ============================================================================

  const startReview = useCallback(
    (hypotheses: RacingHypothesis[], expertId?: string, discoveryId?: string) => {
      // Set current discovery ID for persistence
      setCurrentDiscoveryId(discoveryId || `discovery-${Date.now()}`)

      setState({
        isReviewMode: true,
        reviews: new Map(),
        pendingHypotheses: [...hypotheses],
        approvedHypotheses: [],
        rejectedHypotheses: [],
        refinementRequested: [],
        currentHypothesisIndex: 0,
        expertId: expertId || defaultExpertId,
        sessionStartTime: Date.now(),
        totalReviewTime: 0,
      })
    },
    [defaultExpertId]
  )

  const submitReview = useCallback(
    (hypothesisId: string, decision: ExpertDecision, feedback?: string) => {
      const timestamp = Date.now()

      const review: ExpertReview = {
        hypothesisId,
        expertId: state.expertId,
        decision,
        feedback,
        timestamp,
      }

      // Find the hypothesis to get additional context
      const hypothesis = state.pendingHypotheses.find((h) => h.id === hypothesisId)

      // Persist to the expert feedback store
      if (hypothesis) {
        feedbackStore.addReview({
          hypothesisId,
          discoveryId: currentDiscoveryId,
          expertId: state.expertId,
          decision,
          confidence: 0.75, // Default confidence, can be overridden in structured feedback
          feedback,
          domain: 'general', // Domain is determined by research context, not hypothesis
          agentSource: hypothesis.agentSource,
        })
      }

      setState((prev) => {
        const hyp = prev.pendingHypotheses.find((h) => h.id === hypothesisId)
        if (!hyp) return prev

        const newReviews = new Map(prev.reviews)
        newReviews.set(hypothesisId, review)

        const newPending = prev.pendingHypotheses.filter((h) => h.id !== hypothesisId)
        const newApproved =
          decision === 'approve'
            ? [...prev.approvedHypotheses, hyp]
            : prev.approvedHypotheses
        const newRejected =
          decision === 'reject'
            ? [...prev.rejectedHypotheses, hyp]
            : prev.rejectedHypotheses
        const newRefinement =
          decision === 'refine'
            ? [...prev.refinementRequested, hyp]
            : prev.refinementRequested

        // Auto-advance to next hypothesis
        const newIndex = autoAdvance
          ? Math.min(prev.currentHypothesisIndex, newPending.length - 1)
          : prev.currentHypothesisIndex

        return {
          ...prev,
          reviews: newReviews,
          pendingHypotheses: newPending,
          approvedHypotheses: newApproved,
          rejectedHypotheses: newRejected,
          refinementRequested: newRefinement,
          currentHypothesisIndex: Math.max(0, newIndex),
        }
      })

      // Notify callback
      onHypothesisReviewed?.({
        hypothesisId,
        expertId: state.expertId,
        decision,
        feedback,
        timestamp,
      })
    },
    [state.expertId, state.pendingHypotheses, autoAdvance, onHypothesisReviewed, feedbackStore, currentDiscoveryId]
  )

  const submitStructuredFeedback = useCallback(
    (hypothesisId: string, feedback: StructuredFeedback) => {
      // Convert structured feedback to ExpertReview
      const refinements = feedback.refinementSuggestions.length > 0
        ? feedback.refinementSuggestions
        : undefined

      const feedbackText = [
        feedback.additionalNotes,
        feedback.strengths.length > 0 ? `Strengths: ${feedback.strengths.join(', ')}` : '',
        feedback.weaknesses.length > 0 ? `Weaknesses: ${feedback.weaknesses.join(', ')}` : '',
        `Overall: ${feedback.overallRating}/5 (${feedback.confidenceLevel} confidence)`,
      ]
        .filter(Boolean)
        .join('\n')

      const timestamp = Date.now()

      const review: ExpertReview = {
        hypothesisId,
        expertId: state.expertId,
        decision: feedback.decision,
        feedback: feedbackText,
        refinements,
        timestamp,
      }

      // Find the hypothesis to get additional context
      const hypothesis = state.pendingHypotheses.find((h) => h.id === hypothesisId)

      // Persist to the expert feedback store with full structured data
      if (hypothesis) {
        // Map confidence level to numeric value
        const confidenceMap: Record<string, number> = {
          'very_low': 0.2,
          'low': 0.4,
          'medium': 0.6,
          'high': 0.8,
          'very_high': 0.95,
        }

        // Create tags from strengths and weaknesses for pattern analysis
        const tags = [
          ...feedback.strengths.map(s => `strength:${s}`),
          ...feedback.weaknesses.map(w => `weakness:${w}`),
        ]

        const reviewId = feedbackStore.addReview({
          hypothesisId,
          discoveryId: currentDiscoveryId,
          expertId: state.expertId,
          decision: feedback.decision,
          confidence: confidenceMap[feedback.confidenceLevel] || 0.6,
          feedback: feedbackText,
          refinements,
          tags,
          domain: 'general', // Domain is determined by research context, not hypothesis
          agentSource: hypothesis.agentSource,
        })

        // Add detailed structured feedback entries for analytics
        const feedbackCategories = ['novelty', 'feasibility', 'clarity', 'mechanism', 'evidence', 'impact', 'testability'] as const

        // Add rating-based structured feedback if applicable
        if (feedback.overallRating) {
          feedbackStore.addStructuredFeedback({
            reviewId,
            category: 'impact',
            aspect: 'overall_quality',
            rating: feedback.overallRating,
            comment: feedback.additionalNotes,
            actionable: feedback.refinementSuggestions.length > 0,
          })
        }
      }

      setState((prev) => {
        const hyp = prev.pendingHypotheses.find((h) => h.id === hypothesisId)
        if (!hyp) return prev

        const newReviews = new Map(prev.reviews)
        newReviews.set(hypothesisId, review)

        const newPending = prev.pendingHypotheses.filter((h) => h.id !== hypothesisId)
        const newApproved =
          feedback.decision === 'approve'
            ? [...prev.approvedHypotheses, hyp]
            : prev.approvedHypotheses
        const newRejected =
          feedback.decision === 'reject'
            ? [...prev.rejectedHypotheses, hyp]
            : prev.rejectedHypotheses
        const newRefinement =
          feedback.decision === 'refine'
            ? [...prev.refinementRequested, hyp]
            : prev.refinementRequested

        const newIndex = autoAdvance
          ? Math.min(prev.currentHypothesisIndex, newPending.length - 1)
          : prev.currentHypothesisIndex

        return {
          ...prev,
          reviews: newReviews,
          pendingHypotheses: newPending,
          approvedHypotheses: newApproved,
          rejectedHypotheses: newRejected,
          refinementRequested: newRefinement,
          currentHypothesisIndex: Math.max(0, newIndex),
          totalReviewTime: prev.totalReviewTime + feedback.timeSpentMinutes,
        }
      })

      onHypothesisReviewed?.(review)
    },
    [state.expertId, state.pendingHypotheses, autoAdvance, onHypothesisReviewed, feedbackStore, currentDiscoveryId]
  )

  const skipHypothesis = useCallback((hypothesisId: string) => {
    setState((prev) => {
      // Move hypothesis to end of pending list
      const hypothesis = prev.pendingHypotheses.find((h) => h.id === hypothesisId)
      if (!hypothesis) return prev

      const otherHypotheses = prev.pendingHypotheses.filter((h) => h.id !== hypothesisId)
      return {
        ...prev,
        pendingHypotheses: [...otherHypotheses, hypothesis],
        currentHypothesisIndex: Math.min(
          prev.currentHypothesisIndex,
          otherHypotheses.length - 1
        ),
      }
    })
  }, [])

  const bulkApprove = useCallback(
    (hypothesisIds: string[]) => {
      hypothesisIds.forEach((id) => {
        submitReview(id, 'approve')
      })
    },
    [submitReview]
  )

  const bulkReject = useCallback(
    (hypothesisIds: string[]) => {
      hypothesisIds.forEach((id) => {
        submitReview(id, 'reject')
      })
    },
    [submitReview]
  )

  const navigateToHypothesis = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      currentHypothesisIndex: Math.max(0, Math.min(index, prev.pendingHypotheses.length - 1)),
    }))
  }, [])

  const endReview = useCallback((): ExpertReviewSummary => {
    const reviews = Array.from(state.reviews.values())
    const approved = reviews.filter((r) => r.decision === 'approve').length
    const rejected = reviews.filter((r) => r.decision === 'reject').length
    const refinementRequested = reviews.filter((r) => r.decision === 'refine').length
    const skipped = state.pendingHypotheses.length

    const totalTimeMinutes = Math.round((Date.now() - state.sessionStartTime) / 60000)

    const summary: ExpertReviewSummary = {
      totalReviewed: reviews.length,
      approved,
      rejected,
      refinementRequested,
      skipped,
      averageConfidence: 0.75, // Could calculate from structured feedback if stored
      totalTimeMinutes,
      reviews,
    }

    setState(createInitialState())
    onReviewComplete?.(summary)

    return summary
  }, [state, onReviewComplete])

  const cancelReview = useCallback(() => {
    setState(createInitialState())
  }, [])

  const getReviewForHypothesis = useCallback(
    (hypothesisId: string): ExpertReview | undefined => {
      return state.reviews.get(hypothesisId)
    },
    [state.reviews]
  )

  const isHypothesisReviewed = useCallback(
    (hypothesisId: string): boolean => {
      return state.reviews.has(hypothesisId)
    },
    [state.reviews]
  )

  /**
   * Get success metrics from the persistent store
   * Tracks approval rates by domain and agent for prompt tuning
   */
  const getSuccessMetrics = useCallback(() => {
    return feedbackStore.getSuccessMetrics()
  }, [feedbackStore])

  /**
   * Get prompt tuning data for a specific domain and agent
   * Returns patterns, failure reasons, and refinement suggestions
   */
  const getPromptTuningData = useCallback(
    (domain: string, agent: string) => {
      return feedbackStore.getPromptTuningData(domain, agent)
    },
    [feedbackStore]
  )

  // ============================================================================
  // Memoized Actions Object
  // ============================================================================

  const actions = useMemo<ExpertReviewActions>(
    () => ({
      startReview,
      submitReview,
      submitStructuredFeedback,
      skipHypothesis,
      bulkApprove,
      bulkReject,
      navigateToHypothesis,
      endReview,
      cancelReview,
      getReviewForHypothesis,
      isHypothesisReviewed,
      getSuccessMetrics,
      getPromptTuningData,
    }),
    [
      startReview,
      submitReview,
      submitStructuredFeedback,
      skipHypothesis,
      bulkApprove,
      bulkReject,
      navigateToHypothesis,
      endReview,
      cancelReview,
      getReviewForHypothesis,
      isHypothesisReviewed,
      getSuccessMetrics,
      getPromptTuningData,
    ]
  )

  return [state, actions]
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert expert reviews to refinement feedback for agent consumption
 */
export function reviewsToRefinementFeedback(
  reviews: ExpertReview[]
): Map<string, { decision: ExpertDecision; feedback?: string; refinements?: string[] }> {
  const feedbackMap = new Map()

  for (const review of reviews) {
    if (review.decision === 'refine' || review.feedback || review.refinements) {
      feedbackMap.set(review.hypothesisId, {
        decision: review.decision,
        feedback: review.feedback,
        refinements: review.refinements,
      })
    }
  }

  return feedbackMap
}

/**
 * Filter hypotheses based on expert review decisions
 */
export function filterByExpertDecision(
  hypotheses: RacingHypothesis[],
  reviews: Map<string, ExpertReview>,
  decision: ExpertDecision
): RacingHypothesis[] {
  return hypotheses.filter((h) => {
    const review = reviews.get(h.id)
    return review?.decision === decision
  })
}

export default useExpertReview
