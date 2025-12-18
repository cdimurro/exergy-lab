'use client'

/**
 * FeedbackPanel Component
 *
 * Allows users to rate and provide feedback on validation results:
 * - Star rating (1-5)
 * - Optional comment
 * - Item-level accuracy feedback
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { feedbackService } from '@/lib/feedback/feedback-service'
import type { BenchmarkType } from '@/lib/ai/validation/types'
import {
  Star,
  Send,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Check,
  X,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface FeedbackPanelProps {
  sessionId: string
  discoveryId?: string
  onSubmit?: () => void
  className?: string
  compact?: boolean
}

interface ItemFeedbackProps {
  benchmarkType: BenchmarkType
  itemId: string
  itemName: string
  originalScore: number
  maxScore: number
  sessionId: string
  discoveryId?: string
  onFeedback?: () => void
}

// ============================================================================
// Main FeedbackPanel Component
// ============================================================================

export function FeedbackPanel({
  sessionId,
  discoveryId,
  onSubmit,
  className,
  compact = false,
}: FeedbackPanelProps) {
  const [overallRating, setOverallRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null)
  const [accuracyRating, setAccuracyRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [hoveredStar, setHoveredStar] = useState<number | null>(null)
  const [hoveredAccuracy, setHoveredAccuracy] = useState<number | null>(null)

  const handleSubmit = () => {
    if (!overallRating) return

    feedbackService.submitRating(sessionId, overallRating, {
      discoveryId,
      accuracyRating: accuracyRating || undefined,
      comment: comment.trim() || undefined,
    })

    setSubmitted(true)
    onSubmit?.()
  }

  if (submitted) {
    return (
      <div className={cn('p-4 border rounded-lg bg-emerald-500/5 border-emerald-200', className)}>
        <div className="flex items-center gap-2 text-emerald-600">
          <Check size={18} />
          <span className="font-medium">Thank you for your feedback!</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Your input helps improve validation accuracy.
        </p>
      </div>
    )
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <span className="text-sm text-muted-foreground">Rate this result:</span>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => {
                setOverallRating(star as 1 | 2 | 3 | 4 | 5)
                feedbackService.submitRating(sessionId, star as 1 | 2 | 3 | 4 | 5, {
                  discoveryId,
                })
                setSubmitted(true)
              }}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(null)}
              className="p-0.5 hover:scale-110 transition-transform"
            >
              <Star
                size={18}
                className={cn(
                  'transition-colors',
                  (hoveredStar !== null ? star <= hoveredStar : star <= (overallRating || 0))
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground'
                )}
              />
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('p-4 border rounded-lg bg-card', className)}>
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={18} className="text-blue-500" />
        <h4 className="text-sm font-semibold text-foreground">
          Rate This Validation
        </h4>
      </div>

      {/* Overall Rating */}
      <div className="mb-4">
        <label className="text-sm text-muted-foreground block mb-2">
          Overall Satisfaction
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => setOverallRating(star as 1 | 2 | 3 | 4 | 5)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(null)}
              className="p-1 hover:scale-110 transition-transform"
            >
              <Star
                size={24}
                className={cn(
                  'transition-colors',
                  (hoveredStar !== null ? star <= hoveredStar : star <= (overallRating || 0))
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground'
                )}
              />
            </button>
          ))}
          {overallRating && (
            <span className="ml-2 text-sm text-muted-foreground">
              {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][overallRating]}
            </span>
          )}
        </div>
      </div>

      {/* Accuracy Rating */}
      <div className="mb-4">
        <label className="text-sm text-muted-foreground block mb-2">
          Accuracy of Validation (optional)
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => setAccuracyRating(star as 1 | 2 | 3 | 4 | 5)}
              onMouseEnter={() => setHoveredAccuracy(star)}
              onMouseLeave={() => setHoveredAccuracy(null)}
              className="p-1 hover:scale-110 transition-transform"
            >
              <Star
                size={20}
                className={cn(
                  'transition-colors',
                  (hoveredAccuracy !== null ? star <= hoveredAccuracy : star <= (accuracyRating || 0))
                    ? 'fill-blue-400 text-blue-400'
                    : 'text-muted-foreground'
                )}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Comment */}
      <div className="mb-4">
        <label className="text-sm text-muted-foreground block mb-2">
          Additional Comments (optional)
        </label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="What could be improved?"
          className="w-full p-3 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
          rows={3}
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!overallRating}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
          overallRating
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        )}
      >
        <Send size={16} />
        Submit Feedback
      </button>
    </div>
  )
}

// ============================================================================
// Item-level Feedback Component
// ============================================================================

export function ItemFeedback({
  benchmarkType,
  itemId,
  itemName,
  originalScore,
  maxScore,
  sessionId,
  discoveryId,
  onFeedback,
}: ItemFeedbackProps) {
  const [mode, setMode] = useState<'view' | 'correct'>('view')
  const [correctedScore, setCorrectedScore] = useState<number>(originalScore)
  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleCorrection = () => {
    if (correctedScore === originalScore || !reason.trim()) return

    feedbackService.submitCorrection(
      sessionId,
      benchmarkType,
      itemId,
      originalScore,
      correctedScore,
      maxScore,
      reason.trim(),
      discoveryId
    )

    setSubmitted(true)
    setMode('view')
    onFeedback?.()
  }

  const handleThumbsFeedback = (helpful: boolean) => {
    feedbackService.submitFeedback(sessionId, {
      type: 'suggestion_helpful',
      suggestionId: `${benchmarkType}:${itemId}`,
      helpful,
    }, discoveryId)

    setSubmitted(true)
    onFeedback?.()
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-1 text-xs text-emerald-600">
        <Check size={12} />
        <span>Feedback recorded</span>
      </div>
    )
  }

  if (mode === 'view') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Accurate?</span>
        <button
          onClick={() => handleThumbsFeedback(true)}
          className="p-1 rounded hover:bg-emerald-500/10 text-emerald-600"
          title="Yes, accurate"
        >
          <ThumbsUp size={14} />
        </button>
        <button
          onClick={() => setMode('correct')}
          className="p-1 rounded hover:bg-red-500/10 text-red-600"
          title="No, needs correction"
        >
          <ThumbsDown size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="mt-2 p-3 rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-foreground">
          Correct score for {itemName}
        </span>
        <button
          onClick={() => setMode('view')}
          className="p-0.5 hover:bg-muted rounded"
        >
          <X size={14} className="text-muted-foreground" />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-muted-foreground">
          Original: {originalScore.toFixed(1)}/{maxScore}
        </span>
        <span className="text-xs text-muted-foreground">→</span>
        <input
          type="number"
          min={0}
          max={maxScore}
          step={0.5}
          value={correctedScore}
          onChange={e => setCorrectedScore(parseFloat(e.target.value) || 0)}
          className="w-16 px-2 py-1 text-xs border rounded bg-background"
        />
        <span className="text-xs text-muted-foreground">/{maxScore}</span>
      </div>

      <input
        type="text"
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder="Why is this score incorrect?"
        className="w-full px-2 py-1 text-xs border rounded bg-background mb-2"
      />

      <button
        onClick={handleCorrection}
        disabled={correctedScore === originalScore || !reason.trim()}
        className={cn(
          'w-full px-2 py-1 text-xs rounded font-medium',
          correctedScore !== originalScore && reason.trim()
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        )}
      >
        Submit Correction
      </button>
    </div>
  )
}

// ============================================================================
// Quick Rating Component (for inline use)
// ============================================================================

export function QuickRating({
  sessionId,
  discoveryId,
  label = 'Rate this:',
  className,
}: {
  sessionId: string
  discoveryId?: string
  label?: string
  className?: string
}) {
  const [rating, setRating] = useState<number | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)

  const handleRate = (value: 1 | 2 | 3 | 4 | 5) => {
    setRating(value)
    feedbackService.submitRating(sessionId, value, { discoveryId })
  }

  if (rating !== null) {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-emerald-600', className)}>
        <Check size={12} />
        <span>Thanks!</span>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => handleRate(star as 1 | 2 | 3 | 4 | 5)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            className="p-0.5 hover:scale-110 transition-transform"
          >
            <Star
              size={14}
              className={cn(
                'transition-colors',
                (hovered !== null ? star <= hovered : false)
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-muted-foreground'
              )}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

export default FeedbackPanel
