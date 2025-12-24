'use client'

/**
 * Expert Review Panel (v0.0.4.1)
 *
 * Optional human expert review step after AI hypothesis generation.
 * Allows experts to approve, reject, or refine hypotheses before
 * final validation and output.
 *
 * Features:
 * - Review top N hypotheses (configurable, default 5)
 * - Approve, reject, or request refinement
 * - Add feedback for future prompt tuning
 * - Track expert approval rates
 *
 * @see use-expert-review.ts - Hook for expert review state
 * @see hypothesis-racer.ts - Integration with racing arena
 */

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle,
  XCircle,
  Edit3,
  ChevronDown,
  ChevronUp,
  User,
  Clock,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
import type { RacingHypothesis } from '@/lib/ai/agents/hypgen/base'
import type { HypGenAgentType } from '@/lib/ai/agents/hypgen/base'

// ============================================================================
// Types
// ============================================================================

export type ExpertDecision = 'approve' | 'reject' | 'refine'

export interface ExpertReview {
  hypothesisId: string
  expertId: string
  decision: ExpertDecision
  feedback?: string
  refinements?: string[]
  timestamp: number
  reviewDurationMs?: number
}

export interface ExpertReviewPanelProps {
  hypotheses: RacingHypothesis[]
  onReviewComplete: (reviews: ExpertReview[]) => void
  onSkipReview?: () => void
  expertId?: string
  maxHypotheses?: number
  allowBulkApproval?: boolean
  className?: string
}

interface HypothesisReviewState {
  decision?: ExpertDecision
  feedback: string
  refinements: string[]
  expanded: boolean
  reviewStartTime?: number
}

// ============================================================================
// Agent Colors
// ============================================================================

const AGENT_COLORS: Record<HypGenAgentType, string> = {
  novel: '#8B5CF6',
  feasible: '#10B981',
  economic: '#F59E0B',
  'cross-domain': '#3B82F6',
  paradigm: '#EC4899',
  fusion: '#14B8A6',
}

// ============================================================================
// Sub-Components
// ============================================================================

function DecisionButton({
  decision,
  currentDecision,
  onClick,
  children,
  icon: Icon,
  color,
}: {
  decision: ExpertDecision
  currentDecision?: ExpertDecision
  onClick: () => void
  children: React.ReactNode
  icon: React.ElementType
  color: string
}) {
  const isSelected = currentDecision === decision

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
        isSelected
          ? `bg-${color}/10 border-${color} text-${color}`
          : 'border-border hover:border-border-subtle bg-background-surface'
      )}
      style={isSelected ? { borderColor: color, backgroundColor: `${color}10` } : undefined}
    >
      <Icon size={16} style={isSelected ? { color } : undefined} />
      <span className={cn('text-sm font-medium', isSelected && `text-[${color}]`)}>
        {children}
      </span>
    </button>
  )
}

function HypothesisCard({
  hypothesis,
  state,
  onDecisionChange,
  onFeedbackChange,
  onToggleExpand,
  index,
}: {
  hypothesis: RacingHypothesis
  state: HypothesisReviewState
  onDecisionChange: (decision: ExpertDecision) => void
  onFeedbackChange: (feedback: string) => void
  onToggleExpand: () => void
  index: number
}) {
  const agentColor = AGENT_COLORS[hypothesis.agentSource] || '#6B7280'
  const score = hypothesis.scores?.overall || 0

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden transition-all',
        state.decision === 'approve' && 'border-emerald-500/50 bg-emerald-500/5',
        state.decision === 'reject' && 'border-red-500/50 bg-red-500/5',
        state.decision === 'refine' && 'border-amber-500/50 bg-amber-500/5',
        !state.decision && 'border-border bg-background-surface'
      )}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-background-hover/50"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground-muted">#{index + 1}</span>
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: agentColor }}
          />
          <h4 className="font-medium text-foreground truncate max-w-md">
            {hypothesis.title || 'Untitled Hypothesis'}
          </h4>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={score >= 8 ? 'primary' : score >= 6 ? 'secondary' : 'default'}>
            {score.toFixed(1)}
          </Badge>
          <Badge variant="default" className="capitalize">
            {hypothesis.agentSource}
          </Badge>
          {state.decision && (
            <Badge
              variant={
                state.decision === 'approve' ? 'primary' :
                state.decision === 'reject' ? 'error' : 'secondary'
              }
            >
              {state.decision === 'approve' && <CheckCircle size={12} className="mr-1" />}
              {state.decision === 'reject' && <XCircle size={12} className="mr-1" />}
              {state.decision === 'refine' && <Edit3 size={12} className="mr-1" />}
              {state.decision}
            </Badge>
          )}
          {state.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded Content */}
      {state.expanded && (
        <div className="px-4 pb-4 border-t border-border/50">
          {/* Hypothesis Statement */}
          <div className="mt-4">
            <h5 className="text-sm font-medium text-foreground-muted mb-2">Statement</h5>
            <p className="text-sm text-foreground leading-relaxed">
              {hypothesis.statement || 'No statement provided'}
            </p>
          </div>

          {/* Key Predictions */}
          {hypothesis.predictions && hypothesis.predictions.length > 0 && (
            <div className="mt-4">
              <h5 className="text-sm font-medium text-foreground-muted mb-2">
                Key Predictions ({hypothesis.predictions.length})
              </h5>
              <ul className="space-y-1">
                {hypothesis.predictions.slice(0, 3).map((pred, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <Sparkles size={14} className="mt-0.5 text-primary" />
                    <span>{pred.statement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Score Breakdown */}
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="text-center p-2 bg-background rounded-lg">
              <div className="text-lg font-semibold text-foreground">
                {hypothesis.noveltyScore?.toFixed(0) || '-'}
              </div>
              <div className="text-xs text-foreground-muted">Novelty</div>
            </div>
            <div className="text-center p-2 bg-background rounded-lg">
              <div className="text-lg font-semibold text-foreground">
                {hypothesis.feasibilityScore?.toFixed(0) || '-'}
              </div>
              <div className="text-xs text-foreground-muted">Feasibility</div>
            </div>
            <div className="text-center p-2 bg-background rounded-lg">
              <div className="text-lg font-semibold text-foreground">
                {hypothesis.impactScore?.toFixed(0) || '-'}
              </div>
              <div className="text-xs text-foreground-muted">Impact</div>
            </div>
          </div>

          {/* Decision Buttons */}
          <div className="mt-4">
            <h5 className="text-sm font-medium text-foreground-muted mb-2">Your Decision</h5>
            <div className="flex items-center gap-2">
              <DecisionButton
                decision="approve"
                currentDecision={state.decision}
                onClick={() => onDecisionChange('approve')}
                icon={ThumbsUp}
                color="#10B981"
              >
                Approve
              </DecisionButton>
              <DecisionButton
                decision="refine"
                currentDecision={state.decision}
                onClick={() => onDecisionChange('refine')}
                icon={Edit3}
                color="#F59E0B"
              >
                Needs Refinement
              </DecisionButton>
              <DecisionButton
                decision="reject"
                currentDecision={state.decision}
                onClick={() => onDecisionChange('reject')}
                icon={ThumbsDown}
                color="#EF4444"
              >
                Reject
              </DecisionButton>
            </div>
          </div>

          {/* Feedback Input */}
          <div className="mt-4">
            <h5 className="text-sm font-medium text-foreground-muted mb-2">
              <MessageSquare size={14} className="inline mr-1" />
              Feedback (Optional)
            </h5>
            <textarea
              value={state.feedback}
              onChange={(e) => onFeedbackChange(e.target.value)}
              placeholder="Add feedback for this hypothesis (used to improve future generations)"
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              rows={2}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function ExpertReviewPanel({
  hypotheses,
  onReviewComplete,
  onSkipReview,
  expertId = 'anonymous',
  maxHypotheses = 5,
  allowBulkApproval = true,
  className,
}: ExpertReviewPanelProps) {
  // Limit to top N hypotheses
  const reviewableHypotheses = hypotheses
    .slice()
    .sort((a, b) => (b.scores?.overall || 0) - (a.scores?.overall || 0))
    .slice(0, maxHypotheses)

  // State for each hypothesis
  const [reviewStates, setReviewStates] = useState<Map<string, HypothesisReviewState>>(() => {
    const initial = new Map<string, HypothesisReviewState>()
    reviewableHypotheses.forEach((h, i) => {
      initial.set(h.id, {
        feedback: '',
        refinements: [],
        expanded: i === 0, // First one expanded by default
        reviewStartTime: Date.now(),
      })
    })
    return initial
  })

  const updateState = useCallback((id: string, updates: Partial<HypothesisReviewState>) => {
    setReviewStates(prev => {
      const next = new Map(prev)
      const current = next.get(id) || { feedback: '', refinements: [], expanded: false }
      next.set(id, { ...current, ...updates })
      return next
    })
  }, [])

  const handleDecisionChange = useCallback((id: string, decision: ExpertDecision) => {
    updateState(id, { decision })
  }, [updateState])

  const handleFeedbackChange = useCallback((id: string, feedback: string) => {
    updateState(id, { feedback })
  }, [updateState])

  const handleToggleExpand = useCallback((id: string) => {
    setReviewStates(prev => {
      const next = new Map(prev)
      const current = next.get(id) || { feedback: '', refinements: [], expanded: false }
      next.set(id, { ...current, expanded: !current.expanded })
      return next
    })
  }, [])

  const handleBulkApprove = useCallback(() => {
    setReviewStates(prev => {
      const next = new Map(prev)
      for (const [id, state] of next) {
        if (!state.decision) {
          next.set(id, { ...state, decision: 'approve' })
        }
      }
      return next
    })
  }, [])

  const handleSubmit = useCallback(() => {
    const reviews: ExpertReview[] = []
    const now = Date.now()

    for (const hypothesis of reviewableHypotheses) {
      const state = reviewStates.get(hypothesis.id)
      if (state?.decision) {
        reviews.push({
          hypothesisId: hypothesis.id,
          expertId,
          decision: state.decision,
          feedback: state.feedback || undefined,
          refinements: state.refinements.length > 0 ? state.refinements : undefined,
          timestamp: now,
          reviewDurationMs: state.reviewStartTime ? now - state.reviewStartTime : undefined,
        })
      }
    }

    onReviewComplete(reviews)
  }, [reviewableHypotheses, reviewStates, expertId, onReviewComplete])

  // Calculate progress
  const reviewedCount = Array.from(reviewStates.values()).filter(s => s.decision).length
  const approvedCount = Array.from(reviewStates.values()).filter(s => s.decision === 'approve').length
  const rejectedCount = Array.from(reviewStates.values()).filter(s => s.decision === 'reject').length
  const refineCount = Array.from(reviewStates.values()).filter(s => s.decision === 'refine').length
  const allReviewed = reviewedCount === reviewableHypotheses.length

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <User size={20} />
            Expert Review
          </h3>
          <p className="text-sm text-foreground-muted mt-1">
            Review the top {reviewableHypotheses.length} hypotheses before final validation
          </p>
        </div>

        <div className="flex items-center gap-2">
          {allowBulkApproval && (
            <Button variant="outline" size="sm" onClick={handleBulkApprove}>
              <CheckCircle size={14} className="mr-1" />
              Approve All Remaining
            </Button>
          )}
          {onSkipReview && (
            <Button variant="ghost" size="sm" onClick={onSkipReview}>
              Skip Review
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-background-surface border border-border rounded-lg p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-foreground-muted">Review Progress</span>
          <span className="font-medium text-foreground">
            {reviewedCount}/{reviewableHypotheses.length}
          </span>
        </div>
        <div className="h-2 bg-background rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(reviewedCount / reviewableHypotheses.length) * 100}%` }}
          />
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs">
          <span className="flex items-center gap-1 text-emerald-500">
            <CheckCircle size={12} />
            {approvedCount} approved
          </span>
          <span className="flex items-center gap-1 text-amber-500">
            <Edit3 size={12} />
            {refineCount} need refinement
          </span>
          <span className="flex items-center gap-1 text-red-500">
            <XCircle size={12} />
            {rejectedCount} rejected
          </span>
        </div>
      </div>

      {/* Hypothesis Cards */}
      <div className="space-y-3">
        {reviewableHypotheses.map((hypothesis, index) => {
          const state = reviewStates.get(hypothesis.id) || {
            feedback: '',
            refinements: [],
            expanded: false,
          }

          return (
            <HypothesisCard
              key={hypothesis.id}
              hypothesis={hypothesis}
              state={state}
              onDecisionChange={(decision) => handleDecisionChange(hypothesis.id, decision)}
              onFeedbackChange={(feedback) => handleFeedbackChange(hypothesis.id, feedback)}
              onToggleExpand={() => handleToggleExpand(hypothesis.id)}
              index={index}
            />
          )
        })}
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="text-sm text-foreground-muted flex items-center gap-2">
          <Clock size={14} />
          Expert review helps improve future hypothesis quality
        </div>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!allReviewed}
        >
          {allReviewed ? (
            <>
              <CheckCircle size={16} className="mr-2" />
              Submit Reviews ({reviewedCount})
            </>
          ) : (
            <>
              <AlertTriangle size={16} className="mr-2" />
              Review All Hypotheses First
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export default ExpertReviewPanel
