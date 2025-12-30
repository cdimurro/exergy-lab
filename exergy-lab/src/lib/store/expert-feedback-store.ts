/**
 * Expert Feedback Store
 *
 * Zustand store for persisting expert reviews on AI-generated hypotheses.
 * Tracks expert decisions, feedback, and success rates for prompt tuning.
 *
 * @see components/discovery/ExpertReviewPanel.tsx - UI component
 * @see lib/ai/agents/hypothesis-racer.ts - Hypothesis generation
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ============================================================================
// Types
// ============================================================================

export interface ExpertReview {
  id: string
  hypothesisId: string
  discoveryId: string
  expertId: string
  decision: 'approve' | 'reject' | 'refine'
  confidence: number // 0-1
  feedback?: string
  refinements?: string[]
  tags?: string[]
  timestamp: string
  domain: string
  agentSource?: string // Which agent generated the hypothesis
}

export interface StructuredFeedback {
  id: string
  reviewId: string
  category: FeedbackCategory
  aspect: string
  rating: number // 1-5
  comment?: string
  actionable: boolean
}

export type FeedbackCategory =
  | 'novelty'
  | 'feasibility'
  | 'clarity'
  | 'mechanism'
  | 'evidence'
  | 'impact'
  | 'testability'

export interface ExpertSuccessMetrics {
  totalReviews: number
  approvalRate: number
  refinementRate: number
  rejectionRate: number
  averageConfidence: number
  byDomain: Record<string, DomainMetrics>
  byAgent: Record<string, AgentMetrics>
  topIssues: IssueFrequency[]
}

export interface DomainMetrics {
  domain: string
  reviews: number
  approvalRate: number
  avgConfidence: number
}

export interface AgentMetrics {
  agent: string
  reviews: number
  approvalRate: number
  avgConfidence: number
  commonIssues: string[]
}

export interface IssueFrequency {
  issue: string
  count: number
  category: FeedbackCategory
}

export interface PromptTuningData {
  domain: string
  agent: string
  successfulPatterns: string[]
  failurePatterns: string[]
  refinementSuggestions: string[]
  expertFeedbackSummary: string
}

export interface LabValidationResult {
  id: string
  hypothesisId: string
  reviewId: string
  validated: boolean
  outcome: 'confirmed' | 'partially_confirmed' | 'not_confirmed' | 'pending'
  experimentId?: string
  notes?: string
  timestamp: string
}

// ============================================================================
// Store State
// ============================================================================

interface ExpertFeedbackState {
  reviews: ExpertReview[]
  structuredFeedback: StructuredFeedback[]
  labValidations: LabValidationResult[]

  // Actions
  addReview: (review: Omit<ExpertReview, 'id' | 'timestamp'>) => string
  updateReview: (id: string, updates: Partial<ExpertReview>) => void
  deleteReview: (id: string) => void

  addStructuredFeedback: (feedback: Omit<StructuredFeedback, 'id'>) => string
  addLabValidation: (validation: Omit<LabValidationResult, 'id' | 'timestamp'>) => string

  // Queries
  getReviewsForDiscovery: (discoveryId: string) => ExpertReview[]
  getReviewsForHypothesis: (hypothesisId: string) => ExpertReview[]
  getSuccessMetrics: () => ExpertSuccessMetrics
  getPromptTuningData: (domain: string, agent: string) => PromptTuningData
  getLabValidationRate: () => { total: number; confirmed: number; rate: number }

  // Export
  exportForPromptTuning: () => string
  exportReviewsCSV: () => string

  // Maintenance
  pruneOldReviews: (daysToKeep: number) => number
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useExpertFeedbackStore = create<ExpertFeedbackState>()(
  persist(
    (set, get) => ({
      reviews: [],
      structuredFeedback: [],
      labValidations: [],

      // ========================================================================
      // Actions
      // ========================================================================

      addReview: (review) => {
        const id = `review-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        const fullReview: ExpertReview = {
          ...review,
          id,
          timestamp: new Date().toISOString(),
        }

        set((state) => ({
          reviews: [...state.reviews, fullReview],
        }))

        return id
      },

      updateReview: (id, updates) => {
        set((state) => ({
          reviews: state.reviews.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        }))
      },

      deleteReview: (id) => {
        set((state) => ({
          reviews: state.reviews.filter((r) => r.id !== id),
          structuredFeedback: state.structuredFeedback.filter((f) => f.reviewId !== id),
        }))
      },

      addStructuredFeedback: (feedback) => {
        const id = `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        const fullFeedback: StructuredFeedback = { ...feedback, id }

        set((state) => ({
          structuredFeedback: [...state.structuredFeedback, fullFeedback],
        }))

        return id
      },

      addLabValidation: (validation) => {
        const id = `validation-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        const fullValidation: LabValidationResult = {
          ...validation,
          id,
          timestamp: new Date().toISOString(),
        }

        set((state) => ({
          labValidations: [...state.labValidations, fullValidation],
        }))

        return id
      },

      // ========================================================================
      // Queries
      // ========================================================================

      getReviewsForDiscovery: (discoveryId) => {
        return get().reviews.filter((r) => r.discoveryId === discoveryId)
      },

      getReviewsForHypothesis: (hypothesisId) => {
        return get().reviews.filter((r) => r.hypothesisId === hypothesisId)
      },

      getSuccessMetrics: () => {
        const reviews = get().reviews

        if (reviews.length === 0) {
          return {
            totalReviews: 0,
            approvalRate: 0,
            refinementRate: 0,
            rejectionRate: 0,
            averageConfidence: 0,
            byDomain: {},
            byAgent: {},
            topIssues: [],
          }
        }

        const approved = reviews.filter((r) => r.decision === 'approve')
        const refined = reviews.filter((r) => r.decision === 'refine')
        const rejected = reviews.filter((r) => r.decision === 'reject')

        const avgConfidence =
          reviews.reduce((sum, r) => sum + r.confidence, 0) / reviews.length

        // Group by domain
        const byDomain: Record<string, DomainMetrics> = {}
        const domainGroups = groupBy(reviews, (r) => r.domain)
        for (const [domain, domainReviews] of Object.entries(domainGroups)) {
          const domainApproved = domainReviews.filter((r) => r.decision === 'approve')
          byDomain[domain] = {
            domain,
            reviews: domainReviews.length,
            approvalRate: domainApproved.length / domainReviews.length,
            avgConfidence:
              domainReviews.reduce((sum, r) => sum + r.confidence, 0) /
              domainReviews.length,
          }
        }

        // Group by agent
        const byAgent: Record<string, AgentMetrics> = {}
        const agentGroups = groupBy(
          reviews.filter((r) => r.agentSource),
          (r) => r.agentSource!
        )
        for (const [agent, agentReviews] of Object.entries(agentGroups)) {
          const agentApproved = agentReviews.filter((r) => r.decision === 'approve')
          const agentRejected = agentReviews.filter((r) => r.decision === 'reject')

          // Extract common issues from rejected reviews
          const issues = agentRejected
            .flatMap((r) => r.tags || [])
            .filter(Boolean)

          byAgent[agent] = {
            agent,
            reviews: agentReviews.length,
            approvalRate: agentApproved.length / agentReviews.length,
            avgConfidence:
              agentReviews.reduce((sum, r) => sum + r.confidence, 0) /
              agentReviews.length,
            commonIssues: getMostFrequent(issues, 3),
          }
        }

        // Calculate top issues from structured feedback
        const feedback = get().structuredFeedback
        const lowRatedFeedback = feedback.filter((f) => f.rating <= 2)
        const issueFrequencies = new Map<string, { count: number; category: FeedbackCategory }>()

        for (const f of lowRatedFeedback) {
          const key = f.aspect
          const existing = issueFrequencies.get(key)
          if (existing) {
            existing.count++
          } else {
            issueFrequencies.set(key, { count: 1, category: f.category })
          }
        }

        const topIssues: IssueFrequency[] = Array.from(issueFrequencies.entries())
          .map(([issue, data]) => ({ issue, ...data }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

        return {
          totalReviews: reviews.length,
          approvalRate: approved.length / reviews.length,
          refinementRate: refined.length / reviews.length,
          rejectionRate: rejected.length / reviews.length,
          averageConfidence: avgConfidence,
          byDomain,
          byAgent,
          topIssues,
        }
      },

      getPromptTuningData: (domain, agent) => {
        const reviews = get().reviews.filter(
          (r) => r.domain === domain && r.agentSource === agent
        )

        const approved = reviews.filter((r) => r.decision === 'approve')
        const rejected = reviews.filter((r) => r.decision === 'reject')
        const refined = reviews.filter((r) => r.decision === 'refine')

        // Extract patterns from feedback
        const successfulPatterns = approved
          .flatMap((r) => r.tags || [])
          .filter(Boolean)

        const failurePatterns = rejected
          .flatMap((r) => r.tags || [])
          .filter(Boolean)

        const refinementSuggestions = refined
          .flatMap((r) => r.refinements || [])
          .filter(Boolean)

        // Generate summary
        const approvalRate = reviews.length > 0 ? approved.length / reviews.length : 0
        const summary = `
Domain: ${domain}, Agent: ${agent}
Total reviews: ${reviews.length}
Approval rate: ${(approvalRate * 100).toFixed(1)}%
Common success factors: ${getMostFrequent(successfulPatterns, 3).join(', ') || 'None identified'}
Common failure reasons: ${getMostFrequent(failurePatterns, 3).join(', ') || 'None identified'}
        `.trim()

        return {
          domain,
          agent,
          successfulPatterns: getMostFrequent(successfulPatterns, 10),
          failurePatterns: getMostFrequent(failurePatterns, 10),
          refinementSuggestions: unique(refinementSuggestions).slice(0, 10),
          expertFeedbackSummary: summary,
        }
      },

      getLabValidationRate: () => {
        const validations = get().labValidations
        const confirmed = validations.filter(
          (v) => v.outcome === 'confirmed' || v.outcome === 'partially_confirmed'
        )

        return {
          total: validations.length,
          confirmed: confirmed.length,
          rate: validations.length > 0 ? confirmed.length / validations.length : 0,
        }
      },

      // ========================================================================
      // Export
      // ========================================================================

      exportForPromptTuning: () => {
        const state = get()
        const metrics = state.getSuccessMetrics()

        const exportData = {
          exportDate: new Date().toISOString(),
          metrics,
          domains: Object.keys(metrics.byDomain).map((domain) => {
            const agents = Object.keys(metrics.byAgent)
            return {
              domain,
              agents: agents.map((agent) =>
                state.getPromptTuningData(domain, agent)
              ),
            }
          }),
          recentReviews: state.reviews
            .slice(-100)
            .map((r) => ({
              decision: r.decision,
              confidence: r.confidence,
              domain: r.domain,
              agent: r.agentSource,
              feedback: r.feedback,
              refinements: r.refinements,
              tags: r.tags,
            })),
        }

        return JSON.stringify(exportData, null, 2)
      },

      exportReviewsCSV: () => {
        const reviews = get().reviews
        const headers = [
          'ID',
          'Hypothesis ID',
          'Discovery ID',
          'Expert ID',
          'Decision',
          'Confidence',
          'Domain',
          'Agent',
          'Feedback',
          'Tags',
          'Timestamp',
        ]

        const rows = reviews.map((r) => [
          r.id,
          r.hypothesisId,
          r.discoveryId,
          r.expertId,
          r.decision,
          r.confidence.toString(),
          r.domain,
          r.agentSource || '',
          r.feedback || '',
          (r.tags || []).join('; '),
          r.timestamp,
        ])

        return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      },

      // ========================================================================
      // Maintenance
      // ========================================================================

      pruneOldReviews: (daysToKeep) => {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - daysToKeep)

        const originalCount = get().reviews.length

        set((state) => ({
          reviews: state.reviews.filter(
            (r) => new Date(r.timestamp) >= cutoff
          ),
          structuredFeedback: state.structuredFeedback.filter((f) => {
            const review = state.reviews.find((r) => r.id === f.reviewId)
            return review && new Date(review.timestamp) >= cutoff
          }),
        }))

        return originalCount - get().reviews.length
      },
    }),
    {
      name: 'exergy-lab-expert-feedback',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        reviews: state.reviews,
        structuredFeedback: state.structuredFeedback,
        labValidations: state.labValidations,
      }),
    }
  )
)

// ============================================================================
// Helper Functions
// ============================================================================

function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return array.reduce((acc, item) => {
    const key = keyFn(item)
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

function getMostFrequent(items: string[], limit: number): string[] {
  const counts = new Map<string, number>()

  for (const item of items) {
    counts.set(item, (counts.get(item) || 0) + 1)
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([item]) => item)
}

function unique<T>(array: T[]): T[] {
  return [...new Set(array)]
}
