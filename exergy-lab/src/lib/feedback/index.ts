/**
 * Feedback Module
 *
 * User feedback collection and analysis for validation results.
 */

// Types
export type {
  FeedbackType,
  FeedbackData,
  FeedbackEntry,
  FeedbackSummary,
  FrequentCorrectionItem,
  CalibrationData,
  StarRating,
  RatingFeedback,
  ItemCorrectionFeedback,
  BenchmarkAccuracyFeedback,
  SuggestionHelpfulnessFeedback,
  GeneralCommentFeedback,
} from './types'

// Constants
export { FEEDBACK_STORAGE_KEYS } from './types'

// Service
export { feedbackService } from './feedback-service'
