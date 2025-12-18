/**
 * Feedback Service
 *
 * Collects, stores, and analyzes user feedback on validation results.
 * Uses localStorage for persistence across sessions.
 *
 * Features:
 * - Store feedback entries
 * - Generate feedback summaries
 * - Identify frequently over/under-scored items
 * - Calculate calibration adjustments
 */

import type {
  FeedbackType,
  FeedbackData,
  FeedbackEntry,
  FeedbackSummary,
  FrequentCorrectionItem,
  CalibrationData,
  ItemCorrectionFeedback,
  RatingFeedback,
  BenchmarkAccuracyFeedback,
  SuggestionHelpfulnessFeedback,
  FEEDBACK_STORAGE_KEYS,
} from './types'
import type { BenchmarkType } from '../ai/validation/types'

// ============================================================================
// Feedback Service
// ============================================================================

class FeedbackService {
  private feedback: FeedbackEntry[] = []
  private initialized: boolean = false
  private readonly storageKey = 'discovery_feedback'
  private readonly maxEntries = 500

  constructor() {
    // Defer initialization to first use (for SSR compatibility)
  }

  /**
   * Initialize by loading from storage
   */
  private initialize(): void {
    if (this.initialized) return
    this.initialized = true

    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        this.feedback = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load feedback from storage:', error)
      this.feedback = []
    }
  }

  /**
   * Submit new feedback
   */
  submitFeedback(
    sessionId: string,
    data: FeedbackData,
    discoveryId?: string,
    context?: FeedbackEntry['context']
  ): string {
    this.initialize()

    const entry: FeedbackEntry = {
      id: this.generateId(),
      sessionId,
      discoveryId,
      timestamp: Date.now(),
      data,
      context,
    }

    this.feedback.push(entry)
    this.pruneOldEntries()
    this.saveToStorage()

    return entry.id
  }

  /**
   * Submit rating feedback
   */
  submitRating(
    sessionId: string,
    overallRating: 1 | 2 | 3 | 4 | 5,
    options?: {
      discoveryId?: string
      accuracyRating?: 1 | 2 | 3 | 4 | 5
      usefulnessRating?: 1 | 2 | 3 | 4 | 5
      comment?: string
    }
  ): string {
    const data: RatingFeedback = {
      type: 'rating',
      overallRating,
      accuracyRating: options?.accuracyRating,
      usefulnessRating: options?.usefulnessRating,
      comment: options?.comment,
    }

    return this.submitFeedback(sessionId, data, options?.discoveryId)
  }

  /**
   * Submit item correction feedback
   */
  submitCorrection(
    sessionId: string,
    benchmarkType: BenchmarkType,
    itemId: string,
    originalScore: number,
    correctedScore: number,
    maxScore: number,
    reason: string,
    discoveryId?: string
  ): string {
    const data: ItemCorrectionFeedback = {
      type: 'item_correction',
      benchmarkType,
      itemId,
      originalScore,
      correctedScore,
      maxScore,
      reason,
      wasOverscored: correctedScore < originalScore,
    }

    return this.submitFeedback(sessionId, data, discoveryId)
  }

  /**
   * Submit suggestion helpfulness feedback
   */
  submitSuggestionFeedback(
    sessionId: string,
    suggestionId: string,
    helpful: boolean,
    options?: {
      discoveryId?: string
      implemented?: boolean
      comments?: string
    }
  ): string {
    const data: SuggestionHelpfulnessFeedback = {
      type: 'suggestion_helpful',
      suggestionId,
      helpful,
      implemented: options?.implemented,
      comments: options?.comments,
    }

    return this.submitFeedback(sessionId, data, options?.discoveryId)
  }

  /**
   * Get aggregated feedback summary
   */
  getAggregatedFeedback(): FeedbackSummary {
    this.initialize()

    const ratings = this.feedback.filter(f => f.data.type === 'rating') as Array<FeedbackEntry & { data: RatingFeedback }>
    const corrections = this.feedback.filter(f => f.data.type === 'item_correction') as Array<FeedbackEntry & { data: ItemCorrectionFeedback }>
    const benchmarkAccuracy = this.feedback.filter(f => f.data.type === 'benchmark_accuracy') as Array<FeedbackEntry & { data: BenchmarkAccuracyFeedback }>
    const suggestions = this.feedback.filter(f => f.data.type === 'suggestion_helpful') as Array<FeedbackEntry & { data: SuggestionHelpfulnessFeedback }>

    // Calculate average rating
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.data.overallRating, 0) / ratings.length
      : null

    // Find frequently corrected items
    const { frequentlyOverscored, frequentlyUnderscored } = this.analyzeCorrections(corrections)

    // Calculate benchmark accuracy ratings
    const benchmarkAccuracyRatings = this.calculateBenchmarkAccuracy(benchmarkAccuracy)

    // Calculate suggestion helpfulness rate
    const suggestionHelpfulnessRate = suggestions.length > 0
      ? suggestions.filter(s => s.data.helpful).length / suggestions.length
      : null

    // Get recent comments
    const recentComments = this.feedback
      .filter(f => {
        const data = f.data as any
        return data.comment || data.comments
      })
      .slice(-10)
      .map(f => {
        const data = f.data as any
        return data.comment || data.comments
      })
      .filter(Boolean) as string[]

    return {
      totalFeedback: this.feedback.length,
      ratingsFeedback: ratings.length,
      correctionsFeedback: corrections.length,
      averageRating,
      frequentlyOverscored,
      frequentlyUnderscored,
      benchmarkAccuracyRatings,
      suggestionHelpfulnessRate,
      recentComments,
    }
  }

  /**
   * Get calibration data for a specific benchmark/item
   */
  getCalibrationData(benchmarkType: BenchmarkType, itemId?: string): CalibrationData[] {
    this.initialize()

    const corrections = this.feedback
      .filter(f => f.data.type === 'item_correction')
      .map(f => f.data as ItemCorrectionFeedback)
      .filter(c => c.benchmarkType === benchmarkType)
      .filter(c => !itemId || c.itemId === itemId)

    // Group by item ID
    const grouped = new Map<string, ItemCorrectionFeedback[]>()
    for (const correction of corrections) {
      const existing = grouped.get(correction.itemId) || []
      existing.push(correction)
      grouped.set(correction.itemId, existing)
    }

    // Calculate calibration data for each item
    const calibrationData: CalibrationData[] = []

    for (const [id, itemCorrections] of grouped) {
      if (itemCorrections.length < 3) continue // Need minimum sample size

      const originalScores = itemCorrections.map(c => c.originalScore)
      const correctedScores = itemCorrections.map(c => c.correctedScore)

      const avgOriginal = originalScores.reduce((a, b) => a + b, 0) / originalScores.length
      const avgCorrected = correctedScores.reduce((a, b) => a + b, 0) / correctedScores.length

      const suggestedAdjustment = avgCorrected - avgOriginal

      // Calculate confidence based on sample size and consistency
      const variance = this.calculateVariance(correctedScores.map((c, i) => c - originalScores[i]))
      const confidence = Math.min(1, itemCorrections.length / 10) * Math.max(0, 1 - variance)

      calibrationData.push({
        benchmarkType,
        itemId: id,
        originalScores,
        correctedScores,
        suggestedAdjustment,
        confidence,
        sampleSize: itemCorrections.length,
      })
    }

    return calibrationData
  }

  /**
   * Get feedback for a specific discovery
   */
  getFeedbackForDiscovery(discoveryId: string): FeedbackEntry[] {
    this.initialize()
    return this.feedback.filter(f => f.discoveryId === discoveryId)
  }

  /**
   * Get feedback for a specific session
   */
  getFeedbackForSession(sessionId: string): FeedbackEntry[] {
    this.initialize()
    return this.feedback.filter(f => f.sessionId === sessionId)
  }

  /**
   * Clear all feedback (for testing/reset)
   */
  clearAll(): void {
    this.feedback = []
    this.saveToStorage()
  }

  /**
   * Export feedback data
   */
  exportFeedback(): string {
    this.initialize()
    return JSON.stringify(this.feedback, null, 2)
  }

  /**
   * Import feedback data
   */
  importFeedback(jsonData: string): number {
    try {
      const imported = JSON.parse(jsonData) as FeedbackEntry[]
      if (!Array.isArray(imported)) {
        throw new Error('Invalid feedback data format')
      }

      const previousCount = this.feedback.length
      this.feedback = [...this.feedback, ...imported]
      this.pruneOldEntries()
      this.saveToStorage()

      return this.feedback.length - previousCount
    } catch (error) {
      console.error('Failed to import feedback:', error)
      throw error
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private analyzeCorrections(
    corrections: Array<FeedbackEntry & { data: ItemCorrectionFeedback }>
  ): {
    frequentlyOverscored: FrequentCorrectionItem[]
    frequentlyUnderscored: FrequentCorrectionItem[]
  } {
    // Group by benchmark type and item ID
    const groups = new Map<string, ItemCorrectionFeedback[]>()

    for (const entry of corrections) {
      const key = `${entry.data.benchmarkType}:${entry.data.itemId}`
      const existing = groups.get(key) || []
      existing.push(entry.data)
      groups.set(key, existing)
    }

    const frequentlyOverscored: FrequentCorrectionItem[] = []
    const frequentlyUnderscored: FrequentCorrectionItem[] = []

    for (const [key, items] of groups) {
      if (items.length < 2) continue // Need at least 2 corrections

      const [benchmarkType, itemId] = key.split(':') as [BenchmarkType, string]
      const overscoredCount = items.filter(i => i.wasOverscored).length
      const underscoredCount = items.filter(i => !i.wasOverscored).length

      const avgCorrection = items.reduce(
        (sum, i) => sum + (i.correctedScore - i.originalScore),
        0
      ) / items.length

      if (overscoredCount > underscoredCount && overscoredCount >= 2) {
        frequentlyOverscored.push({
          benchmarkType,
          itemId,
          correctionCount: overscoredCount,
          averageCorrection: avgCorrection,
          direction: 'overscored',
        })
      } else if (underscoredCount > overscoredCount && underscoredCount >= 2) {
        frequentlyUnderscored.push({
          benchmarkType,
          itemId,
          correctionCount: underscoredCount,
          averageCorrection: avgCorrection,
          direction: 'underscored',
        })
      }
    }

    // Sort by correction count
    frequentlyOverscored.sort((a, b) => b.correctionCount - a.correctionCount)
    frequentlyUnderscored.sort((a, b) => b.correctionCount - a.correctionCount)

    return {
      frequentlyOverscored: frequentlyOverscored.slice(0, 5),
      frequentlyUnderscored: frequentlyUnderscored.slice(0, 5),
    }
  }

  private calculateBenchmarkAccuracy(
    feedback: Array<FeedbackEntry & { data: BenchmarkAccuracyFeedback }>
  ): Record<BenchmarkType, { avg: number; count: number }> {
    const result: Record<BenchmarkType, { avg: number; count: number }> = {} as any

    // Group by benchmark type
    const grouped = new Map<BenchmarkType, number[]>()
    for (const entry of feedback) {
      const existing = grouped.get(entry.data.benchmarkType) || []
      existing.push(entry.data.accuracyRating)
      grouped.set(entry.data.benchmarkType, existing)
    }

    for (const [benchmarkType, ratings] of grouped) {
      result[benchmarkType] = {
        avg: ratings.reduce((a, b) => a + b, 0) / ratings.length,
        count: ratings.length,
      }
    }

    return result
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length
  }

  private generateId(): string {
    return `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private pruneOldEntries(): void {
    if (this.feedback.length > this.maxEntries) {
      // Keep most recent entries
      this.feedback = this.feedback
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, this.maxEntries)
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.feedback))
    } catch (error) {
      console.error('Failed to save feedback to storage:', error)
    }
  }
}

// ============================================================================
// Export singleton
// ============================================================================

export const feedbackService = new FeedbackService()
