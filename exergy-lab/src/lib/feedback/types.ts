/**
 * User Feedback Types
 *
 * Types for collecting and processing user feedback on:
 * - Overall satisfaction ratings
 * - Individual item score corrections
 * - Benchmark accuracy ratings
 * - Suggestion helpfulness
 *
 * This feedback enables continuous improvement of the validation system.
 */

import type { BenchmarkType } from '../ai/validation/types'
import type { DiscoveryPhase } from '../ai/rubrics/types'

// ============================================================================
// Feedback Types
// ============================================================================

export type FeedbackType =
  | 'rating'               // Overall satisfaction (1-5 stars)
  | 'item_correction'      // Correct a specific item score
  | 'benchmark_accuracy'   // Rate benchmark accuracy
  | 'suggestion_helpful'   // Was suggestion helpful?
  | 'general_comment'      // Free-form feedback

// ============================================================================
// Rating Feedback
// ============================================================================

export type StarRating = 1 | 2 | 3 | 4 | 5

export interface RatingFeedback {
  type: 'rating'
  overallRating: StarRating
  accuracyRating?: StarRating
  usefulnessRating?: StarRating
  comment?: string
}

// ============================================================================
// Item Correction Feedback
// ============================================================================

export interface ItemCorrectionFeedback {
  type: 'item_correction'
  benchmarkType: BenchmarkType
  itemId: string
  originalScore: number
  correctedScore: number
  maxScore: number
  reason: string
  wasOverscored: boolean // true if original was too high
}

// ============================================================================
// Benchmark Accuracy Feedback
// ============================================================================

export interface BenchmarkAccuracyFeedback {
  type: 'benchmark_accuracy'
  benchmarkType: BenchmarkType
  accuracyRating: StarRating
  comments?: string
  specificIssues?: string[]
}

// ============================================================================
// Suggestion Helpfulness Feedback
// ============================================================================

export interface SuggestionHelpfulnessFeedback {
  type: 'suggestion_helpful'
  suggestionId: string
  helpful: boolean
  implemented?: boolean
  comments?: string
}

// ============================================================================
// General Comment Feedback
// ============================================================================

export interface GeneralCommentFeedback {
  type: 'general_comment'
  comment: string
  category?: 'bug' | 'feature' | 'improvement' | 'other'
  relatedPhase?: DiscoveryPhase
  relatedBenchmark?: BenchmarkType
}

// ============================================================================
// Combined Feedback Data Type
// ============================================================================

export type FeedbackData =
  | RatingFeedback
  | ItemCorrectionFeedback
  | BenchmarkAccuracyFeedback
  | SuggestionHelpfulnessFeedback
  | GeneralCommentFeedback

// ============================================================================
// Feedback Entry (with metadata)
// ============================================================================

export interface FeedbackEntry {
  id: string
  sessionId: string
  discoveryId?: string
  timestamp: number
  data: FeedbackData
  context?: {
    overallScore?: number
    benchmarkScores?: Record<BenchmarkType, number>
    phase?: DiscoveryPhase
  }
}

// ============================================================================
// Feedback Summary Types
// ============================================================================

export interface FeedbackSummary {
  totalFeedback: number
  ratingsFeedback: number
  correctionsFeedback: number
  averageRating: number | null
  frequentlyOverscored: FrequentCorrectionItem[]
  frequentlyUnderscored: FrequentCorrectionItem[]
  benchmarkAccuracyRatings: Record<BenchmarkType, { avg: number; count: number }>
  suggestionHelpfulnessRate: number | null
  recentComments: string[]
}

export interface FrequentCorrectionItem {
  benchmarkType: BenchmarkType
  itemId: string
  correctionCount: number
  averageCorrection: number // Average score delta
  direction: 'overscored' | 'underscored'
}

// ============================================================================
// Aggregated Feedback for Calibration
// ============================================================================

export interface CalibrationData {
  benchmarkType: BenchmarkType
  itemId: string
  originalScores: number[]
  correctedScores: number[]
  suggestedAdjustment: number // Recommended bias correction
  confidence: number // How confident we are in the adjustment
  sampleSize: number
}

// ============================================================================
// Feedback Storage Keys
// ============================================================================

export const FEEDBACK_STORAGE_KEYS = {
  feedbackList: 'discovery_feedback',
  feedbackSummary: 'discovery_feedback_summary',
  calibrationData: 'discovery_calibration',
  maxEntries: 500, // Max feedback entries to store
} as const
