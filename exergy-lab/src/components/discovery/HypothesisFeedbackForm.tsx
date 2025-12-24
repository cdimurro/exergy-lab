'use client'

/**
 * Hypothesis Feedback Form (v0.0.4.1)
 *
 * Detailed feedback form for expert review of hypotheses.
 * Allows experts to provide structured feedback, suggest refinements,
 * and assign quality ratings across multiple dimensions.
 *
 * @see ExpertReviewPanel.tsx - Parent panel component
 * @see use-expert-review.ts - Hook for managing review state
 */

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  Star,
  AlertTriangle,
  Lightbulb,
  Target,
  FlaskConical,
  DollarSign,
  Clock,
  Send,
  RotateCcw,
} from 'lucide-react'
import type { ExpertDecision } from './ExpertReviewPanel'

// ============================================================================
// Types
// ============================================================================

export interface FeedbackDimension {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  rating: number // 1-5
}

export interface StructuredFeedback {
  decision: ExpertDecision
  overallRating: number // 1-5
  dimensions: FeedbackDimension[]
  strengths: string[]
  weaknesses: string[]
  refinementSuggestions: string[]
  additionalNotes: string
  confidenceLevel: 'low' | 'medium' | 'high'
  timeSpentMinutes: number
}

export interface HypothesisFeedbackFormProps {
  hypothesisId: string
  hypothesisTitle: string
  initialDecision?: ExpertDecision
  onSubmit: (feedback: StructuredFeedback) => void
  onCancel: () => void
  disabled?: boolean
  className?: string
}

// ============================================================================
// Default Dimensions
// ============================================================================

const DEFAULT_DIMENSIONS: Omit<FeedbackDimension, 'rating'>[] = [
  {
    id: 'novelty',
    label: 'Novelty',
    description: 'How novel is this approach compared to existing literature?',
    icon: <Lightbulb size={16} />,
  },
  {
    id: 'feasibility',
    label: 'Feasibility',
    description: 'Can this be implemented with current technology and resources?',
    icon: <Target size={16} />,
  },
  {
    id: 'scientific_rigor',
    label: 'Scientific Rigor',
    description: 'Is the scientific reasoning sound and well-supported?',
    icon: <FlaskConical size={16} />,
  },
  {
    id: 'economic_viability',
    label: 'Economic Viability',
    description: 'Does this have potential for commercial or scaled application?',
    icon: <DollarSign size={16} />,
  },
  {
    id: 'timeline',
    label: 'Timeline',
    description: 'Is the proposed timeline realistic for validation?',
    icon: <Clock size={16} />,
  },
]

// ============================================================================
// Sub-Components
// ============================================================================

interface StarRatingProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

function StarRating({ value, onChange, disabled, size = 'md' }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0)
  const starSize = size === 'sm' ? 16 : size === 'md' ? 20 : 24

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          className={cn(
            'transition-colors',
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'
          )}
          onMouseEnter={() => !disabled && setHoverValue(star)}
          onMouseLeave={() => setHoverValue(0)}
          onClick={() => !disabled && onChange(star)}
        >
          <Star
            size={starSize}
            className={cn(
              'transition-colors',
              (hoverValue || value) >= star
                ? 'fill-amber-400 text-amber-400'
                : 'fill-none text-gray-300'
            )}
          />
        </button>
      ))}
      <span className="ml-2 text-sm text-gray-500">
        {value > 0 ? `${value}/5` : 'Not rated'}
      </span>
    </div>
  )
}

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder: string
  disabled?: boolean
  className?: string
}

function TagInput({ tags, onChange, placeholder, disabled, className }: TagInputProps) {
  const [inputValue, setInputValue] = useState('')

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && inputValue.trim()) {
        e.preventDefault()
        if (!tags.includes(inputValue.trim())) {
          onChange([...tags, inputValue.trim()])
        }
        setInputValue('')
      } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
        onChange(tags.slice(0, -1))
      }
    },
    [inputValue, tags, onChange]
  )

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(tags.filter((t) => t !== tagToRemove))
    },
    [tags, onChange]
  )

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-2',
        disabled && 'opacity-50',
        className
      )}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-sm"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 text-gray-400 hover:text-gray-600"
            >
              x
            </button>
          )}
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        disabled={disabled}
        className="flex-1 min-w-[120px] border-none bg-transparent text-sm outline-none placeholder:text-gray-400"
      />
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function HypothesisFeedbackForm({
  hypothesisId,
  hypothesisTitle,
  initialDecision = 'approve',
  onSubmit,
  onCancel,
  disabled = false,
  className,
}: HypothesisFeedbackFormProps) {
  const [decision, setDecision] = useState<ExpertDecision>(initialDecision)
  const [overallRating, setOverallRating] = useState(0)
  const [dimensions, setDimensions] = useState<FeedbackDimension[]>(
    DEFAULT_DIMENSIONS.map((d) => ({ ...d, rating: 0 }))
  )
  const [strengths, setStrengths] = useState<string[]>([])
  const [weaknesses, setWeaknesses] = useState<string[]>([])
  const [refinementSuggestions, setRefinementSuggestions] = useState<string[]>([])
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [confidenceLevel, setConfidenceLevel] = useState<'low' | 'medium' | 'high'>('medium')
  const [startTime] = useState(Date.now())

  const updateDimensionRating = useCallback((dimensionId: string, rating: number) => {
    setDimensions((prev) =>
      prev.map((d) => (d.id === dimensionId ? { ...d, rating } : d))
    )
  }, [])

  const handleReset = useCallback(() => {
    setDecision(initialDecision)
    setOverallRating(0)
    setDimensions(DEFAULT_DIMENSIONS.map((d) => ({ ...d, rating: 0 })))
    setStrengths([])
    setWeaknesses([])
    setRefinementSuggestions([])
    setAdditionalNotes('')
    setConfidenceLevel('medium')
  }, [initialDecision])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      const feedback: StructuredFeedback = {
        decision,
        overallRating,
        dimensions,
        strengths,
        weaknesses,
        refinementSuggestions,
        additionalNotes,
        confidenceLevel,
        timeSpentMinutes: Math.round((Date.now() - startTime) / 60000),
      }

      onSubmit(feedback)
    },
    [
      decision,
      overallRating,
      dimensions,
      strengths,
      weaknesses,
      refinementSuggestions,
      additionalNotes,
      confidenceLevel,
      startTime,
      onSubmit,
    ]
  )

  const isValid = overallRating > 0 && (decision !== 'refine' || refinementSuggestions.length > 0)

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-lg font-semibold text-gray-900">Expert Feedback</h3>
        <p className="mt-1 text-sm text-gray-500 line-clamp-2">{hypothesisTitle}</p>
      </div>

      {/* Decision Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Decision</label>
        <div className="flex gap-2">
          {[
            { value: 'approve' as const, label: 'Approve', color: 'emerald' },
            { value: 'refine' as const, label: 'Needs Refinement', color: 'amber' },
            { value: 'reject' as const, label: 'Reject', color: 'red' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => setDecision(option.value)}
              className={cn(
                'flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all',
                decision === option.value
                  ? option.color === 'emerald'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : option.color === 'amber'
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overall Rating */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Overall Rating</label>
        <StarRating value={overallRating} onChange={setOverallRating} disabled={disabled} />
      </div>

      {/* Dimension Ratings */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          Dimension Ratings (Optional)
        </label>
        <div className="space-y-3">
          {dimensions.map((dimension) => (
            <div
              key={dimension.id}
              className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{dimension.icon}</span>
                <div>
                  <p className="text-sm font-medium text-gray-700">{dimension.label}</p>
                  <p className="text-xs text-gray-500">{dimension.description}</p>
                </div>
              </div>
              <StarRating
                value={dimension.rating}
                onChange={(rating) => updateDimensionRating(dimension.id, rating)}
                disabled={disabled}
                size="sm"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Strengths */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Strengths <span className="text-gray-400">(press Enter to add)</span>
        </label>
        <TagInput
          tags={strengths}
          onChange={setStrengths}
          placeholder="e.g., Novel approach, Strong theoretical basis..."
          disabled={disabled}
        />
      </div>

      {/* Weaknesses */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Weaknesses <span className="text-gray-400">(press Enter to add)</span>
        </label>
        <TagInput
          tags={weaknesses}
          onChange={setWeaknesses}
          placeholder="e.g., Scalability concerns, Limited data..."
          disabled={disabled}
        />
      </div>

      {/* Refinement Suggestions (required for 'refine' decision) */}
      {decision === 'refine' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Refinement Suggestions{' '}
            <span className="text-red-500">*</span>
          </label>
          <TagInput
            tags={refinementSuggestions}
            onChange={setRefinementSuggestions}
            placeholder="e.g., Consider alternative materials, Add cost analysis..."
            disabled={disabled}
          />
          {refinementSuggestions.length === 0 && (
            <p className="flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle size={12} />
              At least one refinement suggestion is required
            </p>
          )}
        </div>
      )}

      {/* Additional Notes */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Additional Notes (Optional)
        </label>
        <textarea
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          placeholder="Any other comments or observations..."
          disabled={disabled}
          rows={3}
          className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Confidence Level */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Confidence Level</label>
        <div className="flex gap-2">
          {(['low', 'medium', 'high'] as const).map((level) => (
            <button
              key={level}
              type="button"
              disabled={disabled}
              onClick={() => setConfidenceLevel(level)}
              className={cn(
                'flex-1 rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-all',
                confidenceLevel === level
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              )}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={handleReset}
          disabled={disabled}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
        >
          <RotateCcw size={16} />
          Reset
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={disabled || !isValid}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all',
              isValid
                ? 'bg-primary hover:bg-primary/90'
                : 'cursor-not-allowed bg-gray-300'
            )}
          >
            <Send size={16} />
            Submit Feedback
          </button>
        </div>
      </div>
    </form>
  )
}

export default HypothesisFeedbackForm
