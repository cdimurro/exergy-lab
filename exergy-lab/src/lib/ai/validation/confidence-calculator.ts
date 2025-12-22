/**
 * Evidence-Based Confidence Calculator
 *
 * Calculates confidence scores based on actual evidence rather than
 * using hardcoded values. This improves validation accuracy by
 * grounding confidence in measurable factors.
 *
 * @see /Users/chrisdimurro/.claude/plans/idempotent-beaming-rose.md - Implementation plan
 */

// ============================================================================
// Types
// ============================================================================

export interface SourceEvidence {
  /** Is the source peer-reviewed? */
  peerReviewed: boolean
  /** Number of citations */
  citations: number
  /** Publication year */
  publicationYear: number
  /** Impact factor of the journal (if known) */
  impactFactor?: number
  /** Is this a primary source or secondary? */
  isPrimarySource?: boolean
}

export interface ValidationEvidence {
  /** List of sources supporting the validation */
  sources: SourceEvidence[]
  /** Ratio of sources that agree (0-1) */
  agreementRatio: number
  /** Average publication age in years */
  avgPublicationAge: number
  /** Number of independent validations */
  independentValidations?: number
  /** Has experimental data? */
  hasExperimentalData?: boolean
  /** Has simulation data? */
  hasSimulationData?: boolean
}

export interface ConfidenceResult {
  /** Overall confidence score (0-1) */
  confidence: number
  /** Breakdown of contributing factors */
  factors: {
    sourceQuality: number
    agreement: number
    recency: number
    coverage: number
    experimental: number
  }
  /** Human-readable confidence level */
  level: 'very_high' | 'high' | 'medium' | 'low' | 'very_low'
  /** Recommendations to improve confidence */
  recommendations: string[]
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIDENCE_CONFIG = {
  // Base confidence (starting point)
  baseConfidence: 0.5,

  // Source quality weights
  peerReviewedBonus: 0.1,
  citationThreshold: 1000, // Citations to reach max bonus
  citationMaxBonus: 0.1,
  impactFactorThreshold: 10,
  impactFactorMaxBonus: 0.05,
  primarySourceBonus: 0.05,

  // Agreement weight
  agreementWeight: 0.2,

  // Recency bonuses
  recentThresholdYears: 2,
  recentBonus: 0.1,
  moderateThresholdYears: 5,
  moderateBonus: 0.05,

  // Coverage weight (sample size)
  coverageMaxBonus: 0.15,
  coverageThresholdSources: 10,

  // Experimental data bonus
  experimentalDataBonus: 0.1,
  simulationDataBonus: 0.05,

  // Bounds
  minConfidence: 0.1,
  maxConfidence: 0.95,
}

// ============================================================================
// Main Calculator Functions
// ============================================================================

/**
 * Calculate confidence score based on evidence
 *
 * @param evidence - The validation evidence to analyze
 * @returns Confidence result with score and breakdown
 *
 * @example
 * const result = calculateConfidence({
 *   sources: [
 *     { peerReviewed: true, citations: 500, publicationYear: 2023 },
 *     { peerReviewed: true, citations: 200, publicationYear: 2022 },
 *   ],
 *   agreementRatio: 0.9,
 *   avgPublicationAge: 2,
 * })
 * console.log(result.confidence) // e.g., 0.78
 */
export function calculateConfidence(evidence: ValidationEvidence): ConfidenceResult {
  const factors = {
    sourceQuality: calculateSourceQuality(evidence.sources),
    agreement: calculateAgreementScore(evidence.agreementRatio),
    recency: calculateRecencyScore(evidence.avgPublicationAge),
    coverage: calculateCoverageScore(evidence.sources.length),
    experimental: calculateExperimentalScore(evidence),
  }

  // Weighted combination
  let confidence = CONFIDENCE_CONFIG.baseConfidence
  confidence += factors.sourceQuality
  confidence += factors.agreement
  confidence += factors.recency
  confidence += factors.coverage
  confidence += factors.experimental

  // Clamp to valid range
  confidence = Math.min(Math.max(confidence, CONFIDENCE_CONFIG.minConfidence), CONFIDENCE_CONFIG.maxConfidence)

  // Determine level
  const level = getConfidenceLevel(confidence)

  // Generate recommendations
  const recommendations = generateRecommendations(factors, evidence)

  return {
    confidence,
    factors,
    level,
    recommendations,
  }
}

/**
 * Quick confidence calculation (simplified)
 * Use when you only have basic source information
 */
export function calculateQuickConfidence(
  sourceCount: number,
  avgCitations: number,
  agreementRatio: number
): number {
  let confidence = CONFIDENCE_CONFIG.baseConfidence

  // Source count bonus
  confidence += Math.min(sourceCount / CONFIDENCE_CONFIG.coverageThresholdSources, 1) * CONFIDENCE_CONFIG.coverageMaxBonus

  // Citation bonus
  confidence += Math.min(avgCitations / CONFIDENCE_CONFIG.citationThreshold, 1) * CONFIDENCE_CONFIG.citationMaxBonus

  // Agreement bonus
  confidence += agreementRatio * CONFIDENCE_CONFIG.agreementWeight

  return Math.min(Math.max(confidence, CONFIDENCE_CONFIG.minConfidence), CONFIDENCE_CONFIG.maxConfidence)
}

// ============================================================================
// Factor Calculators
// ============================================================================

/**
 * Calculate source quality score
 */
function calculateSourceQuality(sources: SourceEvidence[]): number {
  if (sources.length === 0) return 0

  let totalScore = 0

  for (const source of sources) {
    let sourceScore = 0

    // Peer-reviewed bonus
    if (source.peerReviewed) {
      sourceScore += CONFIDENCE_CONFIG.peerReviewedBonus
    }

    // Citation bonus (normalized)
    const citationFactor = Math.min(source.citations / CONFIDENCE_CONFIG.citationThreshold, 1)
    sourceScore += citationFactor * CONFIDENCE_CONFIG.citationMaxBonus

    // Impact factor bonus
    if (source.impactFactor) {
      const impactFactor = Math.min(source.impactFactor / CONFIDENCE_CONFIG.impactFactorThreshold, 1)
      sourceScore += impactFactor * CONFIDENCE_CONFIG.impactFactorMaxBonus
    }

    // Primary source bonus
    if (source.isPrimarySource) {
      sourceScore += CONFIDENCE_CONFIG.primarySourceBonus
    }

    totalScore += sourceScore
  }

  // Average across sources
  return totalScore / sources.length
}

/**
 * Calculate agreement score
 */
function calculateAgreementScore(agreementRatio: number): number {
  // Direct scaling with agreement ratio
  return agreementRatio * CONFIDENCE_CONFIG.agreementWeight
}

/**
 * Calculate recency score
 */
function calculateRecencyScore(avgPublicationAge: number): number {
  if (avgPublicationAge < CONFIDENCE_CONFIG.recentThresholdYears) {
    return CONFIDENCE_CONFIG.recentBonus
  } else if (avgPublicationAge < CONFIDENCE_CONFIG.moderateThresholdYears) {
    return CONFIDENCE_CONFIG.moderateBonus
  }
  return 0
}

/**
 * Calculate coverage score based on number of sources
 */
function calculateCoverageScore(sourceCount: number): number {
  const factor = Math.min(sourceCount / CONFIDENCE_CONFIG.coverageThresholdSources, 1)
  return factor * CONFIDENCE_CONFIG.coverageMaxBonus
}

/**
 * Calculate experimental data score
 */
function calculateExperimentalScore(evidence: ValidationEvidence): number {
  let score = 0

  if (evidence.hasExperimentalData) {
    score += CONFIDENCE_CONFIG.experimentalDataBonus
  }

  if (evidence.hasSimulationData) {
    score += CONFIDENCE_CONFIG.simulationDataBonus
  }

  // Bonus for independent validations
  if (evidence.independentValidations && evidence.independentValidations > 1) {
    score += Math.min(evidence.independentValidations * 0.02, 0.1)
  }

  return score
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get human-readable confidence level
 */
function getConfidenceLevel(confidence: number): ConfidenceResult['level'] {
  if (confidence >= 0.85) return 'very_high'
  if (confidence >= 0.70) return 'high'
  if (confidence >= 0.50) return 'medium'
  if (confidence >= 0.30) return 'low'
  return 'very_low'
}

/**
 * Generate recommendations for improving confidence
 */
function generateRecommendations(
  factors: ConfidenceResult['factors'],
  evidence: ValidationEvidence
): string[] {
  const recommendations: string[] = []

  // Low source quality
  if (factors.sourceQuality < 0.1) {
    recommendations.push('Seek more peer-reviewed sources with higher citation counts')
  }

  // Low agreement
  if (factors.agreement < 0.1) {
    recommendations.push('Investigate conflicting sources to understand disagreements')
  }

  // Old sources
  if (factors.recency === 0) {
    recommendations.push('Include more recent publications (< 5 years old)')
  }

  // Low coverage
  if (factors.coverage < 0.1) {
    recommendations.push('Expand search to include more sources for better coverage')
  }

  // No experimental data
  if (factors.experimental === 0) {
    if (!evidence.hasExperimentalData) {
      recommendations.push('Include sources with experimental validation data')
    }
    if (!evidence.hasSimulationData) {
      recommendations.push('Consider adding simulation-based validation')
    }
  }

  return recommendations
}

/**
 * Combine multiple confidence results
 */
export function combineConfidences(
  confidences: ConfidenceResult[],
  weights?: number[]
): ConfidenceResult {
  if (confidences.length === 0) {
    return {
      confidence: CONFIDENCE_CONFIG.minConfidence,
      factors: { sourceQuality: 0, agreement: 0, recency: 0, coverage: 0, experimental: 0 },
      level: 'very_low',
      recommendations: ['No confidence data available'],
    }
  }

  // Default to equal weights
  const w = weights || confidences.map(() => 1 / confidences.length)

  // Weighted average of confidence
  let combinedConfidence = 0
  const combinedFactors = { sourceQuality: 0, agreement: 0, recency: 0, coverage: 0, experimental: 0 }

  for (let i = 0; i < confidences.length; i++) {
    const c = confidences[i]
    combinedConfidence += c.confidence * w[i]
    combinedFactors.sourceQuality += c.factors.sourceQuality * w[i]
    combinedFactors.agreement += c.factors.agreement * w[i]
    combinedFactors.recency += c.factors.recency * w[i]
    combinedFactors.coverage += c.factors.coverage * w[i]
    combinedFactors.experimental += c.factors.experimental * w[i]
  }

  // Combine recommendations (deduplicate)
  const allRecommendations = confidences.flatMap((c) => c.recommendations)
  const uniqueRecommendations = [...new Set(allRecommendations)]

  return {
    confidence: combinedConfidence,
    factors: combinedFactors,
    level: getConfidenceLevel(combinedConfidence),
    recommendations: uniqueRecommendations.slice(0, 5), // Top 5
  }
}

/**
 * Adjust confidence based on validation outcome
 */
export function adjustConfidenceForOutcome(
  baseConfidence: number,
  physicsValid: boolean,
  economicsValid: boolean
): number {
  let adjustment = 0

  if (physicsValid && economicsValid) {
    adjustment = 0.1 // Both valid: boost confidence
  } else if (physicsValid || economicsValid) {
    adjustment = 0.0 // One valid: neutral
  } else {
    adjustment = -0.15 // Both failed: reduce confidence
  }

  return Math.min(Math.max(baseConfidence + adjustment, CONFIDENCE_CONFIG.minConfidence), CONFIDENCE_CONFIG.maxConfidence)
}
