/**
 * Standardized Score Normalization
 *
 * Provides consistent score normalization across all validators.
 * Different validation types may use different raw score ranges,
 * but this module ensures they all map to a standard 0-10 scale.
 *
 * @see /Users/chrisdimurro/.claude/plans/idempotent-beaming-rose.md - Implementation plan
 */

// ============================================================================
// Types
// ============================================================================

export type NormalizationCurve = 'linear' | 'sigmoid' | 'logarithmic' | 'exponential'

export interface NormalizationConfig {
  /** Minimum expected raw score */
  minScore: number
  /** Maximum expected raw score */
  maxScore: number
  /** Target minimum (usually 0) */
  targetMin: number
  /** Target maximum (usually 10) */
  targetMax: number
  /** Transformation curve */
  curve: NormalizationCurve
  /** Center point for sigmoid (relative to input range, 0-1) */
  sigmoidCenter?: number
  /** Steepness of sigmoid curve */
  sigmoidSteepness?: number
}

export interface NormalizedScore {
  /** Normalized score on target scale */
  score: number
  /** Original raw score */
  rawScore: number
  /** Percentage of maximum */
  percentOfMax: number
  /** Qualitative grade */
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  /** Is this score considered passing? */
  passing: boolean
}

// ============================================================================
// Predefined Configurations
// ============================================================================

/**
 * Physics validation normalization
 * Raw scores: 0-100 (percentage-based)
 * Linear mapping to 0-10
 */
export const PHYSICS_NORMALIZATION: NormalizationConfig = {
  minScore: 0,
  maxScore: 100,
  targetMin: 0,
  targetMax: 10,
  curve: 'linear',
}

/**
 * Economics validation normalization
 * Raw scores: -50 to 200 (ROI-based, can be negative)
 * Sigmoid curve to compress extremes
 */
export const ECONOMICS_NORMALIZATION: NormalizationConfig = {
  minScore: -50,
  maxScore: 200,
  targetMin: 0,
  targetMax: 10,
  curve: 'sigmoid',
  sigmoidCenter: 0.4, // Slightly optimistic center
  sigmoidSteepness: 6,
}

/**
 * Literature alignment normalization
 * Raw scores: 0-1 (ratio-based)
 * Logarithmic to give more granularity at high alignment
 */
export const LITERATURE_NORMALIZATION: NormalizationConfig = {
  minScore: 0,
  maxScore: 1,
  targetMin: 0,
  targetMax: 10,
  curve: 'logarithmic',
}

/**
 * Confidence score normalization
 * Raw scores: 0-1 (probability)
 * Linear mapping
 */
export const CONFIDENCE_NORMALIZATION: NormalizationConfig = {
  minScore: 0,
  maxScore: 1,
  targetMin: 0,
  targetMax: 10,
  curve: 'linear',
}

/**
 * Novelty score normalization
 * Raw scores: 0-100 (AI-assigned)
 * Exponential to reward high novelty
 */
export const NOVELTY_NORMALIZATION: NormalizationConfig = {
  minScore: 0,
  maxScore: 100,
  targetMin: 0,
  targetMax: 10,
  curve: 'exponential',
}

/**
 * Feasibility score normalization
 * Raw scores: 0-100 (TRL-based)
 * Linear mapping
 */
export const FEASIBILITY_NORMALIZATION: NormalizationConfig = {
  minScore: 0,
  maxScore: 100,
  targetMin: 0,
  targetMax: 10,
  curve: 'linear',
}

// ============================================================================
// Main Normalization Functions
// ============================================================================

/**
 * Normalize a raw score using the specified configuration
 *
 * @param rawScore - The raw score to normalize
 * @param config - Normalization configuration
 * @returns Normalized score object
 *
 * @example
 * const result = normalizeScore(75, PHYSICS_NORMALIZATION)
 * console.log(result.score) // 7.5
 */
export function normalizeScore(rawScore: number, config: NormalizationConfig): NormalizedScore {
  // Clamp to input range
  const clamped = Math.max(config.minScore, Math.min(config.maxScore, rawScore))

  // Normalize to 0-1 range
  const normalized = (clamped - config.minScore) / (config.maxScore - config.minScore)

  // Apply curve transformation
  let curved: number
  switch (config.curve) {
    case 'sigmoid':
      curved = applySigmoid(normalized, config.sigmoidCenter, config.sigmoidSteepness)
      break
    case 'logarithmic':
      curved = applyLogarithmic(normalized)
      break
    case 'exponential':
      curved = applyExponential(normalized)
      break
    default:
      curved = normalized // Linear
  }

  // Scale to target range
  const score = config.targetMin + curved * (config.targetMax - config.targetMin)

  // Calculate percentage and grade
  const percentOfMax = (score / config.targetMax) * 100
  const grade = scoreToGrade(score, config.targetMax)
  const passing = score >= config.targetMax * 0.6 // 60% threshold

  return {
    score,
    rawScore,
    percentOfMax,
    grade,
    passing,
  }
}

/**
 * Batch normalize multiple scores
 */
export function normalizeScores(
  rawScores: number[],
  config: NormalizationConfig
): NormalizedScore[] {
  return rawScores.map((raw) => normalizeScore(raw, config))
}

/**
 * Normalize a score and return just the numeric value
 */
export function normalizeToValue(rawScore: number, config: NormalizationConfig): number {
  return normalizeScore(rawScore, config).score
}

/**
 * Denormalize a score back to raw scale
 */
export function denormalizeScore(
  normalizedScore: number,
  config: NormalizationConfig
): number {
  // Clamp to target range
  const clamped = Math.max(config.targetMin, Math.min(config.targetMax, normalizedScore))

  // Normalize to 0-1
  const normalized = (clamped - config.targetMin) / (config.targetMax - config.targetMin)

  // Reverse the curve (approximation for non-linear curves)
  let uncurved: number
  switch (config.curve) {
    case 'sigmoid':
      uncurved = reverseSigmoid(normalized, config.sigmoidCenter, config.sigmoidSteepness)
      break
    case 'logarithmic':
      uncurved = reverseLogarithmic(normalized)
      break
    case 'exponential':
      uncurved = reverseExponential(normalized)
      break
    default:
      uncurved = normalized
  }

  // Scale to raw range
  return config.minScore + uncurved * (config.maxScore - config.minScore)
}

// ============================================================================
// Curve Functions
// ============================================================================

/**
 * Apply sigmoid transformation
 * Maps 0-1 to 0-1 with S-curve
 */
function applySigmoid(
  x: number,
  center: number = 0.5,
  steepness: number = 6
): number {
  // Shift x relative to center
  const shifted = (x - center) * steepness
  return 1 / (1 + Math.exp(-shifted))
}

/**
 * Reverse sigmoid transformation
 */
function reverseSigmoid(
  y: number,
  center: number = 0.5,
  steepness: number = 6
): number {
  // Clamp to avoid log(0) or log(negative)
  const clampedY = Math.max(0.001, Math.min(0.999, y))
  const shifted = -Math.log(1 / clampedY - 1)
  return shifted / steepness + center
}

/**
 * Apply logarithmic transformation
 * Maps 0-1 to 0-1 with log curve (more granularity at high end)
 */
function applyLogarithmic(x: number): number {
  // log1p handles x=0 correctly
  return Math.log(1 + x * 9) / Math.log(10) // log10(1 + 9x) maps [0,1] to [0,1]
}

/**
 * Reverse logarithmic transformation
 */
function reverseLogarithmic(y: number): number {
  return (Math.pow(10, y) - 1) / 9
}

/**
 * Apply exponential transformation
 * Maps 0-1 to 0-1 with exponential curve (more granularity at low end)
 */
function applyExponential(x: number): number {
  // (e^x - 1) / (e - 1) maps [0,1] to [0,1]
  return (Math.exp(x) - 1) / (Math.E - 1)
}

/**
 * Reverse exponential transformation
 */
function reverseExponential(y: number): number {
  return Math.log(y * (Math.E - 1) + 1)
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert normalized score to letter grade
 */
function scoreToGrade(score: number, maxScore: number): NormalizedScore['grade'] {
  const percentage = (score / maxScore) * 100

  if (percentage >= 90) return 'A'
  if (percentage >= 80) return 'B'
  if (percentage >= 70) return 'C'
  if (percentage >= 60) return 'D'
  return 'F'
}

/**
 * Combine multiple normalized scores with weights
 */
export function combineNormalizedScores(
  scores: NormalizedScore[],
  weights?: number[]
): NormalizedScore {
  if (scores.length === 0) {
    return {
      score: 0,
      rawScore: 0,
      percentOfMax: 0,
      grade: 'F',
      passing: false,
    }
  }

  // Default to equal weights
  const w = weights || scores.map(() => 1 / scores.length)

  // Weighted average
  let combinedScore = 0
  let combinedRaw = 0

  for (let i = 0; i < scores.length; i++) {
    combinedScore += scores[i].score * w[i]
    combinedRaw += scores[i].rawScore * w[i]
  }

  // Assume 10-point scale for combined
  const percentOfMax = (combinedScore / 10) * 100
  const grade = scoreToGrade(combinedScore, 10)
  const passing = combinedScore >= 6 // 60% threshold

  return {
    score: combinedScore,
    rawScore: combinedRaw,
    percentOfMax,
    grade,
    passing,
  }
}

/**
 * Create a custom normalization config
 */
export function createNormalizationConfig(
  minScore: number,
  maxScore: number,
  curve: NormalizationCurve = 'linear',
  options?: {
    targetMin?: number
    targetMax?: number
    sigmoidCenter?: number
    sigmoidSteepness?: number
  }
): NormalizationConfig {
  return {
    minScore,
    maxScore,
    targetMin: options?.targetMin ?? 0,
    targetMax: options?.targetMax ?? 10,
    curve,
    sigmoidCenter: options?.sigmoidCenter,
    sigmoidSteepness: options?.sigmoidSteepness,
  }
}

/**
 * Get the appropriate normalization config for a validation type
 */
export function getNormalizationConfig(
  validationType: 'physics' | 'economics' | 'literature' | 'confidence' | 'novelty' | 'feasibility'
): NormalizationConfig {
  switch (validationType) {
    case 'physics':
      return PHYSICS_NORMALIZATION
    case 'economics':
      return ECONOMICS_NORMALIZATION
    case 'literature':
      return LITERATURE_NORMALIZATION
    case 'confidence':
      return CONFIDENCE_NORMALIZATION
    case 'novelty':
      return NOVELTY_NORMALIZATION
    case 'feasibility':
      return FEASIBILITY_NORMALIZATION
    default:
      return PHYSICS_NORMALIZATION // Default to linear 0-100 → 0-10
  }
}
