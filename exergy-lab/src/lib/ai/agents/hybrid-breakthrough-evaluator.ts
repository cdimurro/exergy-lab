/**
 * Hybrid Breakthrough Evaluator
 *
 * Two-phase evaluation system for breakthrough hypothesis scoring:
 * - Phase 1: FrontierScience Foundation (5 pts) - Scientific quality
 * - Phase 2: Breakthrough Detection (5 pts) - Breakthrough indicators
 *
 * Features:
 * - Evaluation caching to avoid redundant scoring
 * - Refinement feedback generation
 * - 5-tier classification support
 * - Batch evaluation for racing
 *
 * @see types-hybrid-breakthrough.ts - Type definitions
 * @see templates/hybrid-breakthrough.ts - Validation functions
 * @see hypothesis-racer.ts - Integration point
 */

import crypto from 'crypto'
import type { RacingHypothesis } from './hypgen/base'
import {
  validateHybridBreakthrough,
  generateHybridFeedback,
} from '../rubrics/templates/hybrid-breakthrough'
import {
  type HybridBreakthroughScore,
  type HybridRefinementFeedback,
  type HybridClassificationTier,
  type FrontierScienceDimension,
  type BreakthroughDetectionDimension,
  shouldEliminateHybrid,
  getEliminationReason,
  FS_DIMENSION_CONFIGS,
  BD_DIMENSION_CONFIGS,
} from '../rubrics/types-hybrid-breakthrough'

// =============================================================================
// Types
// =============================================================================

export interface EvaluatorConfig {
  /** Enable evaluation caching (default: true) */
  enableCache: boolean
  /** Cache TTL in milliseconds (default: 30 min) */
  cacheTtlMs: number
  /** Maximum cache entries (default: 200) */
  maxCacheEntries: number
}

const DEFAULT_EVALUATOR_CONFIG: EvaluatorConfig = {
  enableCache: true,
  cacheTtlMs: 30 * 60 * 1000,  // 30 minutes
  maxCacheEntries: 200,
}

interface CachedEvaluation {
  score: HybridBreakthroughScore
  timestamp: number
  hits: number
}

export interface EvaluationResult {
  hypothesisId: string
  score: HybridBreakthroughScore
  feedback: HybridRefinementFeedback
  shouldEliminate: boolean
  eliminationReason?: string
}

export interface BatchEvaluationResult {
  results: EvaluationResult[]
  summary: {
    totalEvaluated: number
    averageScore: number
    highestScore: number
    lowestScore: number
    tierDistribution: Record<HybridClassificationTier, number>
    eliminationCount: number
    evaluationDurationMs: number
  }
}

// =============================================================================
// Hybrid Breakthrough Evaluator
// =============================================================================

export class HybridBreakthroughEvaluator {
  private config: EvaluatorConfig
  private evaluationCache: Map<string, CachedEvaluation> = new Map()
  private stats = {
    totalEvaluations: 0,
    cacheHits: 0,
    cacheMisses: 0,
  }

  constructor(config: Partial<EvaluatorConfig> = {}) {
    this.config = { ...DEFAULT_EVALUATOR_CONFIG, ...config }
  }

  // ===========================================================================
  // Cache Management
  // ===========================================================================

  /**
   * Generate cache key from hypothesis content
   */
  private getCacheKey(hypothesis: RacingHypothesis): string {
    const keyData = {
      id: hypothesis.id,
      statement: hypothesis.statement?.slice(0, 200),
      predictions: hypothesis.predictions?.length || 0,
      mechanism: hypothesis.mechanism?.steps?.length || 0,
      noveltyScore: hypothesis.noveltyScore,
      feasibilityScore: hypothesis.feasibilityScore,
    }
    return crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex')
  }

  /**
   * Get cached evaluation if available and valid
   */
  private getCached(key: string): HybridBreakthroughScore | null {
    if (!this.config.enableCache) return null

    const cached = this.evaluationCache.get(key)
    if (!cached) {
      this.stats.cacheMisses++
      return null
    }

    // Check TTL
    if (Date.now() - cached.timestamp > this.config.cacheTtlMs) {
      this.evaluationCache.delete(key)
      this.stats.cacheMisses++
      return null
    }

    cached.hits++
    this.stats.cacheHits++
    return cached.score
  }

  /**
   * Store evaluation in cache
   */
  private setCached(key: string, score: HybridBreakthroughScore): void {
    if (!this.config.enableCache) return

    // Enforce max entries
    if (this.evaluationCache.size >= this.config.maxCacheEntries) {
      this.evictOldest()
    }

    this.evaluationCache.set(key, {
      score,
      timestamp: Date.now(),
      hits: 0,
    })
  }

  /**
   * Evict oldest cache entries
   */
  private evictOldest(): void {
    const entries = Array.from(this.evaluationCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)

    const toEvict = Math.max(1, Math.floor(entries.length * 0.1))
    for (let i = 0; i < toEvict; i++) {
      this.evaluationCache.delete(entries[i][0])
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number
    hits: number
    misses: number
    hitRate: number
  } {
    const total = this.stats.cacheHits + this.stats.cacheMisses
    return {
      size: this.evaluationCache.size,
      hits: this.stats.cacheHits,
      misses: this.stats.cacheMisses,
      hitRate: total > 0 ? this.stats.cacheHits / total : 0,
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.evaluationCache.clear()
    this.stats = { totalEvaluations: 0, cacheHits: 0, cacheMisses: 0 }
  }

  // ===========================================================================
  // Evaluation
  // ===========================================================================

  /**
   * Evaluate a single hypothesis using hybrid two-phase scoring
   */
  async evaluate(hypothesis: RacingHypothesis): Promise<HybridBreakthroughScore> {
    this.stats.totalEvaluations++

    // Check cache
    const cacheKey = this.getCacheKey(hypothesis)
    const cached = this.getCached(cacheKey)
    if (cached) {
      console.log(`[HybridEvaluator] Cache hit for ${hypothesis.id}`)
      return cached
    }

    // Run hybrid validation
    console.log(`[HybridEvaluator] Evaluating ${hypothesis.id}`)
    const score = validateHybridBreakthrough(hypothesis)

    // Cache result
    this.setCached(cacheKey, score)

    return score
  }

  /**
   * Evaluate a hypothesis and generate full result with feedback
   */
  async evaluateWithFeedback(
    hypothesis: RacingHypothesis,
    iteration: number,
    activeCount: number = 15
  ): Promise<EvaluationResult> {
    const score = await this.evaluate(hypothesis)
    const feedback = this.generateFeedback(score, iteration)
    const shouldEliminate = shouldEliminateHybrid(score.overallScore, iteration, activeCount)

    return {
      hypothesisId: hypothesis.id,
      score,
      feedback,
      shouldEliminate,
      eliminationReason: shouldEliminate
        ? getEliminationReason(score.overallScore, iteration, score.tier)
        : undefined,
    }
  }

  /**
   * Evaluate multiple hypotheses in batch
   */
  async evaluateBatch(
    hypotheses: RacingHypothesis[],
    iteration: number
  ): Promise<BatchEvaluationResult> {
    const startTime = Date.now()

    // Evaluate all hypotheses
    const results: EvaluationResult[] = []
    const activeCount = hypotheses.length

    for (const hypothesis of hypotheses) {
      const result = await this.evaluateWithFeedback(hypothesis, iteration, activeCount)
      results.push(result)
    }

    // Calculate summary statistics
    const scores = results.map(r => r.score.overallScore)
    const tierDistribution = {
      breakthrough: 0,
      scientific_discovery: 0,
      general_insights: 0,
      partial_failure: 0,
      failure: 0,
    } as Record<HybridClassificationTier, number>

    for (const result of results) {
      tierDistribution[result.score.tier]++
    }

    return {
      results,
      summary: {
        totalEvaluated: results.length,
        averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
        highestScore: Math.max(...scores),
        lowestScore: Math.min(...scores),
        tierDistribution,
        eliminationCount: results.filter(r => r.shouldEliminate).length,
        evaluationDurationMs: Date.now() - startTime,
      },
    }
  }

  // ===========================================================================
  // Feedback Generation
  // ===========================================================================

  /**
   * Generate refinement feedback from hybrid score
   */
  generateFeedback(score: HybridBreakthroughScore, iteration: number): HybridRefinementFeedback {
    // Find strong and weak dimensions for FS phase
    const fsStrong: string[] = []
    const fsWeak: string[] = []
    const fsImprovements: string[] = []

    for (const [dim, result] of Object.entries(score.fsDimensions)) {
      if (result.percentage >= 70) {
        fsStrong.push(`${dim}: ${result.criteriaMatched}`)
      } else {
        fsWeak.push(`${dim}: ${result.reasoning}`)
        const config = FS_DIMENSION_CONFIGS.find(c => c.id === dim)
        if (config) {
          fsImprovements.push(`Improve ${config.name}: target ${config.scoringCriteria[0].label}`)
        }
      }
    }

    // Find strong and weak dimensions for BD phase
    const bdStrong: string[] = []
    const bdWeak: string[] = []
    const bdImprovements: string[] = []

    for (const [dim, result] of Object.entries(score.bdDimensions)) {
      if (result.percentage >= 70) {
        bdStrong.push(`${dim}: ${result.criteriaMatched}`)
      } else {
        bdWeak.push(`${dim}: ${result.reasoning}`)
        const config = BD_DIMENSION_CONFIGS.find(c => c.id === dim)
        if (config) {
          bdImprovements.push(`Improve ${config.name}: target ${config.scoringCriteria[0].label}`)
        }
      }
    }

    // Strategic guidance
    const primaryFocus = this.determinePrimaryFocus(score)
    const secondaryFocus = this.determineSecondaryFocus(score, primaryFocus)
    const pathToNextTier = this.getPathToNextTier(score)
    const keyBlockers = this.identifyKeyBlockers(score)

    // Dimension-specific feedback
    const dimensionFeedback = this.generateDimensionFeedback(score)

    // Overall assessment
    const overallAssessment = this.generateOverallAssessment(score, iteration)

    return {
      overallScore: score.overallScore,
      tier: score.tier,
      overallAssessment,
      frontierScienceFeedback: {
        score: score.frontierScienceScore,
        percentage: score.fsPercentage,
        strongDimensions: fsStrong,
        weakDimensions: fsWeak,
        improvements: fsImprovements,
      },
      breakthroughFeedback: {
        score: score.breakthroughScore,
        percentage: score.bdPercentage,
        strongDimensions: bdStrong,
        weakDimensions: bdWeak,
        improvements: bdImprovements,
      },
      strategicGuidance: {
        primaryFocus,
        secondaryFocus,
        pathToNextTier,
        keyBlockers,
      },
      dimensionFeedback,
    }
  }

  /**
   * Determine primary improvement focus
   */
  private determinePrimaryFocus(score: HybridBreakthroughScore): string {
    // If FS phase is weak, focus there first
    if (score.fsPercentage < 60) {
      const weakestFs = Object.values(score.fsDimensions)
        .sort((a, b) => a.percentage - b.percentage)[0]
      return `Strengthen scientific foundation: focus on ${weakestFs.dimension}`
    }

    // Otherwise focus on breakthrough dimensions
    const weakestBd = Object.values(score.bdDimensions)
      .sort((a, b) => a.percentage - b.percentage)[0]
    return `Enhance breakthrough potential: focus on ${weakestBd.dimension}`
  }

  /**
   * Determine secondary improvement focus
   */
  private determineSecondaryFocus(score: HybridBreakthroughScore, primaryFocus: string): string {
    // Check required dimensions for breakthrough
    if (!score.breakthroughRequirements.bd1Performance) {
      return 'Increase BD1 (Performance) to ≥80% for breakthrough qualification'
    }
    if (!score.breakthroughRequirements.bd6Trajectory) {
      return 'Increase BD6 (Trajectory) to ≥80% for breakthrough qualification'
    }

    // Find second weakest dimension
    const allDimensions = [
      ...Object.values(score.fsDimensions),
      ...Object.values(score.bdDimensions),
    ].sort((a, b) => a.percentage - b.percentage)

    // Skip the first (already in primary focus)
    const secondWeakest = allDimensions[1]
    return `Secondary: improve ${secondWeakest.dimension}`
  }

  /**
   * Get path to next tier
   */
  private getPathToNextTier(score: HybridBreakthroughScore): string {
    switch (score.tier) {
      case 'failure':
        return 'To reach Partial Failure (5.0+): Strengthen FS dimensions, especially predictions and evidence'
      case 'partial_failure':
        return 'To reach General Insights (6.5+): Improve FS phase to ≥3.5/5 and add 2+ BD dimensions ≥60%'
      case 'general_insights':
        return 'To reach Scientific Discovery (8.0+): All FS dims ≥60%, 4+ BD dims ≥70%'
      case 'scientific_discovery':
        return 'To reach Breakthrough (9.0+): All FS dims ≥70%, BD1+BD6 ≥80%, 5+ BD dims ≥70%'
      case 'breakthrough':
        return 'Already at Breakthrough tier - focus on refining for publication quality'
      default:
        return 'Continue improving all dimensions'
    }
  }

  /**
   * Identify key blockers preventing advancement
   */
  private identifyKeyBlockers(score: HybridBreakthroughScore): string[] {
    const blockers: string[] = []

    // Check required breakthrough dimensions
    if (!score.breakthroughRequirements.bd1Performance) {
      blockers.push('BD1 Performance below 80% threshold')
    }
    if (!score.breakthroughRequirements.bd6Trajectory) {
      blockers.push('BD6 Trajectory below 80% threshold')
    }

    // Check FS phase
    if (score.fsPercentage < 70) {
      const failingFs = Object.values(score.fsDimensions)
        .filter(d => d.percentage < 70)
        .map(d => d.dimension)
      blockers.push(`FS dimensions below 70%: ${failingFs.join(', ')}`)
    }

    // Check BD count
    if (score.breakthroughRequirements.bdHighCount < 5) {
      blockers.push(`Only ${score.breakthroughRequirements.bdHighCount}/7 BD dimensions at ≥70% (need 5+)`)
    }

    return blockers
  }

  /**
   * Generate dimension-specific feedback
   */
  private generateDimensionFeedback(score: HybridBreakthroughScore): HybridRefinementFeedback['dimensionFeedback'] {
    const feedback: HybridRefinementFeedback['dimensionFeedback'] = []

    // Process FS dimensions
    for (const [dim, result] of Object.entries(score.fsDimensions)) {
      const config = FS_DIMENSION_CONFIGS.find(c => c.id === dim)
      if (!config) continue

      const targetScore = config.maxPoints * 0.7  // 70% for passing
      if (result.score < targetScore) {
        feedback.push({
          dimension: dim,
          currentScore: result.score,
          targetScore,
          specificImprovements: [
            config.scoringCriteria[0].label,
            `Current: ${result.criteriaMatched || 'Unknown'}`,
          ],
        })
      }
    }

    // Process BD dimensions
    for (const [dim, result] of Object.entries(score.bdDimensions)) {
      const config = BD_DIMENSION_CONFIGS.find(c => c.id === dim)
      if (!config) continue

      const targetScore = config.required ? config.maxPoints * 0.8 : config.maxPoints * 0.7
      if (result.score < targetScore) {
        feedback.push({
          dimension: dim,
          currentScore: result.score,
          targetScore,
          specificImprovements: [
            config.scoringCriteria[0].label,
            `Current: ${result.criteriaMatched || 'Unknown'}`,
          ],
        })
      }
    }

    return feedback
  }

  /**
   * Generate overall assessment text
   */
  private generateOverallAssessment(score: HybridBreakthroughScore, iteration: number): string {
    const fsQuality = score.fsPercentage >= 70 ? 'strong' : score.fsPercentage >= 50 ? 'moderate' : 'weak'
    const bdQuality = score.bdPercentage >= 70 ? 'strong' : score.bdPercentage >= 50 ? 'moderate' : 'limited'

    return `Iteration ${iteration}: Score ${score.overallScore.toFixed(1)}/10 (${score.tier}). ` +
      `FrontierScience foundation is ${fsQuality} (${score.frontierScienceScore.toFixed(1)}/5). ` +
      `Breakthrough indicators are ${bdQuality} (${score.breakthroughScore.toFixed(1)}/5). ` +
      (score.breakthroughRequirements.meetsBreakthrough
        ? 'Meets all breakthrough requirements.'
        : `Not yet meeting breakthrough requirements: ${this.identifyKeyBlockers(score)[0] || 'needs improvement'}.`)
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Get formatted feedback text for a hypothesis
   */
  getFormattedFeedback(score: HybridBreakthroughScore): string {
    return generateHybridFeedback(score)
  }

  /**
   * Check if hypothesis meets breakthrough requirements
   */
  meetsBreakthroughRequirements(score: HybridBreakthroughScore): boolean {
    return score.breakthroughRequirements.meetsBreakthrough
  }

  /**
   * Get evaluation statistics
   */
  getStats(): {
    totalEvaluations: number
    cacheHits: number
    cacheMisses: number
    cacheSize: number
    hitRate: number
  } {
    const total = this.stats.cacheHits + this.stats.cacheMisses
    return {
      totalEvaluations: this.stats.totalEvaluations,
      cacheHits: this.stats.cacheHits,
      cacheMisses: this.stats.cacheMisses,
      cacheSize: this.evaluationCache.size,
      hitRate: total > 0 ? this.stats.cacheHits / total : 0,
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new HybridBreakthroughEvaluator instance
 */
export function createHybridBreakthroughEvaluator(
  config?: Partial<EvaluatorConfig>
): HybridBreakthroughEvaluator {
  return new HybridBreakthroughEvaluator(config)
}

/**
 * Singleton instance for shared use
 */
let sharedEvaluator: HybridBreakthroughEvaluator | null = null

export function getSharedHybridEvaluator(): HybridBreakthroughEvaluator {
  if (!sharedEvaluator) {
    sharedEvaluator = new HybridBreakthroughEvaluator()
  }
  return sharedEvaluator
}
