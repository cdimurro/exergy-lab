/**
 * Unified Validation Engine
 *
 * Consolidates all validation steps into a single engine that coordinates:
 * - Physics validation (GPU-accelerated)
 * - Economic validation (GPU-accelerated)
 * - Literature cross-reference
 * - Quality grading
 *
 * This engine provides a unified interface for hypothesis validation,
 * supporting multiple validation levels from quick screening to comprehensive analysis.
 *
 * @see gpu-pool.ts - GPU task execution
 * @see gpu-bridge.ts - FeedbackBus integration
 * @see discovery-orchestrator.ts - Main workflow integration
 */

import { EventEmitter } from 'events'
import type { RacingHypothesis } from './hypgen/base'
import type { GPUValidationPool, GPUResult } from '@/lib/simulation/gpu-pool'
import type { GPUFeedbackBridge } from './gpu-bridge'
import type { FeedbackBus, AgentId } from './feedback-bus'
import type { GPUTier } from '@/lib/simulation/providers/modal-provider'

// ============================================================================
// Types
// ============================================================================

export type ValidationLevel = 'quick' | 'standard' | 'comprehensive'

export interface ValidationResult {
  hypothesisId: string
  level: ValidationLevel
  overallScore: number
  passed: boolean
  timestamp: number
  durationMs: number

  // Physics validation
  physics: {
    valid: boolean
    confidenceScore: number
    metrics: {
      efficiency?: { mean: number; ci95: [number, number] }
      theoreticalLimit?: number
      violationsDetected: string[]
    }
    gpuTier?: GPUTier
    fromCache: boolean
  }

  // Economic validation
  economics: {
    viable: boolean
    confidenceScore: number
    metrics: {
      lcoe?: { mean: number; ci95: [number, number] }
      paybackYears?: number
      roi?: number
    }
  }

  // Literature cross-reference
  literature: {
    supportedClaims: number
    contradictedClaims: number
    totalClaims: number
    confidenceScore: number
    citations: string[]
    warnings: string[]
  }

  // Quality assessment
  quality: {
    completeness: number
    accuracy: number
    novelty: number
    feasibility: number
    overallGrade: 'A' | 'B' | 'C' | 'D' | 'F'
  }

  // Summary
  summary: string
  recommendations: string[]
  warnings: string[]
}

export interface ValidationConfig {
  // GPU settings
  enableGPU: boolean
  gpuPool?: GPUValidationPool
  gpuBridge?: GPUFeedbackBridge

  // Validation thresholds
  physicsConfidenceThreshold: number
  economicsConfidenceThreshold: number
  literatureMinSupport: number

  // Feature flags
  enableLiteratureCrossRef: boolean
  enableDetailedMetrics: boolean
  strictMode: boolean

  // Timeout settings
  quickTimeoutMs: number
  standardTimeoutMs: number
  comprehensiveTimeoutMs: number
}

export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  enableGPU: true,
  physicsConfidenceThreshold: 0.7,
  economicsConfidenceThreshold: 0.6,
  literatureMinSupport: 2,
  enableLiteratureCrossRef: true,
  enableDetailedMetrics: true,
  strictMode: false,
  quickTimeoutMs: 30_000,
  standardTimeoutMs: 60_000,
  comprehensiveTimeoutMs: 180_000,
}

// Level-specific configurations
const LEVEL_CONFIG: Record<ValidationLevel, {
  gpuTier: GPUTier
  enableLiterature: boolean
  enableDetailedQuality: boolean
  monteCarloIterations: number
}> = {
  quick: {
    gpuTier: 'T4',
    enableLiterature: false,
    enableDetailedQuality: false,
    monteCarloIterations: 10_000,
  },
  standard: {
    gpuTier: 'A10G',
    enableLiterature: true,
    enableDetailedQuality: true,
    monteCarloIterations: 100_000,
  },
  comprehensive: {
    gpuTier: 'A100',
    enableLiterature: true,
    enableDetailedQuality: true,
    monteCarloIterations: 1_000_000,
  },
}

// ============================================================================
// Unified Validation Engine
// ============================================================================

export class ValidationEngine extends EventEmitter {
  private config: ValidationConfig
  private gpuPool?: GPUValidationPool
  private gpuBridge?: GPUFeedbackBridge
  private feedbackBus?: FeedbackBus

  constructor(
    config: Partial<ValidationConfig> = {},
    dependencies?: {
      gpuPool?: GPUValidationPool
      gpuBridge?: GPUFeedbackBridge
      feedbackBus?: FeedbackBus
    }
  ) {
    super()
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config }
    this.gpuPool = dependencies?.gpuPool || config.gpuPool
    this.gpuBridge = dependencies?.gpuBridge || config.gpuBridge
    this.feedbackBus = dependencies?.feedbackBus
  }

  /**
   * Get timeout for a validation level
   */
  private getTimeoutForLevel(level: ValidationLevel): number {
    switch (level) {
      case 'quick':
        return this.config.quickTimeoutMs
      case 'standard':
        return this.config.standardTimeoutMs
      case 'comprehensive':
        return this.config.comprehensiveTimeoutMs
      default:
        return this.config.standardTimeoutMs
    }
  }

  /**
   * Validate a hypothesis at the specified level
   * Now includes timeout protection to prevent indefinite blocking
   */
  async validateHypothesis(
    hypothesis: RacingHypothesis,
    level: ValidationLevel = 'standard'
  ): Promise<ValidationResult> {
    const timeoutMs = this.getTimeoutForLevel(level)

    // Wrap validation in timeout
    return this.validateWithTimeout(hypothesis, level, timeoutMs)
  }

  /**
   * Internal validation with timeout protection
   */
  private async validateWithTimeout(
    hypothesis: RacingHypothesis,
    level: ValidationLevel,
    timeoutMs: number
  ): Promise<ValidationResult> {
    const startTime = Date.now()
    const levelConfig = LEVEL_CONFIG[level]

    this.emit('validation_started', {
      hypothesisId: hypothesis.id,
      level,
      gpuTier: levelConfig.gpuTier,
    })

    console.log(
      `[ValidationEngine] Starting ${level} validation for ${hypothesis.id.slice(-8)} ` +
      `(GPU tier: ${levelConfig.gpuTier}, timeout: ${timeoutMs}ms)`
    )

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Validation timed out after ${timeoutMs}ms`))
      }, timeoutMs)
    })

    try {
      // Race validation against timeout
      const validationPromise = this.runValidation(hypothesis, level, levelConfig, startTime)
      return await Promise.race([validationPromise, timeoutPromise])

    } catch (error) {
      // Handle timeout specifically
      if (error instanceof Error && error.message.includes('timed out')) {
        console.warn(`[ValidationEngine] ${level} validation TIMED OUT for ${hypothesis.id.slice(-8)}`)

        this.emit('validation_timeout', {
          hypothesisId: hypothesis.id,
          level,
          timeoutMs,
        })

        // Return a failed result on timeout
        return this.createTimeoutResult(hypothesis, level, startTime, timeoutMs)
      }

      this.emit('validation_failed', {
        hypothesisId: hypothesis.id,
        level,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      throw error
    }
  }

  /**
   * Create a failed result for timeout scenarios
   */
  private createTimeoutResult(
    hypothesis: RacingHypothesis,
    level: ValidationLevel,
    startTime: number,
    timeoutMs: number
  ): ValidationResult {
    return {
      hypothesisId: hypothesis.id,
      level,
      overallScore: 0,
      passed: false,
      timestamp: Date.now(),
      durationMs: Date.now() - startTime,
      physics: {
        valid: false,
        confidenceScore: 0,
        metrics: { violationsDetected: ['Validation timed out'] },
        fromCache: false,
      },
      economics: {
        viable: false,
        confidenceScore: 0,
        metrics: {},
      },
      literature: this.getEmptyLiteratureResult(),
      quality: {
        completeness: 0,
        accuracy: 0,
        novelty: 0,
        feasibility: 0,
        overallGrade: 'F',
      },
      summary: `Validation timed out after ${timeoutMs}ms`,
      recommendations: ['Retry validation or simplify hypothesis'],
      warnings: [`Validation exceeded ${timeoutMs}ms timeout`],
    }
  }

  /**
   * Run the actual validation logic
   */
  private async runValidation(
    hypothesis: RacingHypothesis,
    level: ValidationLevel,
    levelConfig: typeof LEVEL_CONFIG[ValidationLevel],
    startTime: number
  ): Promise<ValidationResult> {
    // Run validation steps in parallel where possible
    const [physicsResult, economicsResult, literatureResult, qualityResult] = await Promise.all([
      this.validatePhysics(hypothesis, levelConfig),
      this.validateEconomics(hypothesis, levelConfig),
      levelConfig.enableLiterature
        ? this.validateLiterature(hypothesis)
        : this.getEmptyLiteratureResult(),
      levelConfig.enableDetailedQuality
        ? this.assessQuality(hypothesis)
        : this.getQuickQualityAssessment(hypothesis),
    ])

    // Calculate overall score
    const overallScore = this.calculateOverallScore(
      physicsResult,
      economicsResult,
      literatureResult,
      qualityResult
    )

    // Determine pass/fail
    const passed = this.determinePass(
      overallScore,
      physicsResult,
      economicsResult,
      literatureResult,
      level
    )

    // Generate summary and recommendations
    const summary = this.generateSummary(
      hypothesis,
      physicsResult,
      economicsResult,
      literatureResult,
      passed
    )

    const recommendations = this.generateRecommendations(
      physicsResult,
      economicsResult,
      literatureResult,
      qualityResult
    )

    const warnings = this.collectWarnings(
      physicsResult,
      economicsResult,
      literatureResult
    )

    const result: ValidationResult = {
      hypothesisId: hypothesis.id,
      level,
      overallScore,
      passed,
      timestamp: Date.now(),
      durationMs: Date.now() - startTime,
      physics: physicsResult,
      economics: economicsResult,
      literature: literatureResult,
      quality: qualityResult,
      summary,
      recommendations,
      warnings,
    }

    this.emit('validation_complete', {
      hypothesisId: hypothesis.id,
      level,
      passed,
      score: overallScore,
      durationMs: result.durationMs,
    })

    console.log(
      `[ValidationEngine] ${level} validation complete for ${hypothesis.id.slice(-8)}: ` +
      `${passed ? 'PASSED' : 'FAILED'} (score: ${overallScore.toFixed(2)})`
    )

    return result
  }

  /**
   * Validate multiple hypotheses in batch
   */
  async validateBatch(
    hypotheses: RacingHypothesis[],
    level: ValidationLevel = 'quick'
  ): Promise<ValidationResult[]> {
    console.log(
      `[ValidationEngine] Starting batch validation for ${hypotheses.length} hypotheses (level: ${level})`
    )

    // For quick validation, use GPU batch if available
    if (level === 'quick' && this.gpuBridge && hypotheses.length > 1) {
      const gpuResults = await this.gpuBridge.queueBatchValidation(hypotheses)

      // Convert GPU results to full validation results
      return hypotheses.map((hyp, i) => {
        const gpuResult = gpuResults.find(r => r.hypothesisId === hyp.id) || gpuResults[i]
        return this.convertGPUToValidationResult(hyp, gpuResult, level)
      })
    }

    // Otherwise validate individually in parallel
    return Promise.all(
      hypotheses.map(hyp => this.validateHypothesis(hyp, level))
    )
  }

  /**
   * Quick screening validation (fastest, GPU T4)
   */
  async quickScreen(hypothesis: RacingHypothesis): Promise<ValidationResult> {
    return this.validateHypothesis(hypothesis, 'quick')
  }

  /**
   * Standard validation (balanced, GPU A10G)
   */
  async standardValidate(hypothesis: RacingHypothesis): Promise<ValidationResult> {
    return this.validateHypothesis(hypothesis, 'standard')
  }

  /**
   * Comprehensive validation (thorough, GPU A100)
   */
  async comprehensiveValidate(hypothesis: RacingHypothesis): Promise<ValidationResult> {
    return this.validateHypothesis(hypothesis, 'comprehensive')
  }

  /**
   * Auto-select validation level based on hypothesis score
   */
  async autoValidate(hypothesis: RacingHypothesis): Promise<ValidationResult> {
    const score = hypothesis.scores.overall

    if (score >= 8.5) {
      return this.comprehensiveValidate(hypothesis)
    } else if (score >= 7.0) {
      return this.standardValidate(hypothesis)
    } else {
      return this.quickScreen(hypothesis)
    }
  }

  // ============================================================================
  // Private Validation Methods
  // ============================================================================

  /**
   * Validate physics using GPU
   */
  private async validatePhysics(
    hypothesis: RacingHypothesis,
    levelConfig: typeof LEVEL_CONFIG[ValidationLevel]
  ): Promise<ValidationResult['physics']> {
    // Use GPU validation if available
    if (this.config.enableGPU && this.gpuBridge) {
      try {
        const gpuResult = await this.gpuBridge.queueValidation(hypothesis, {
          tier: levelConfig.gpuTier,
        })

        return {
          valid: gpuResult.physicsValid,
          confidenceScore: gpuResult.confidenceScore,
          metrics: {
            efficiency: gpuResult.metrics.efficiency,
            theoreticalLimit: undefined, // Would need separate calculation
            violationsDetected: gpuResult.physicsValid ? [] : ['Physics constraints violated'],
          },
          gpuTier: levelConfig.gpuTier,
          fromCache: gpuResult.fromCache,
        }
      } catch (error) {
        console.warn('[ValidationEngine] GPU physics validation failed, using fallback:', error)
        return this.fallbackPhysicsValidation(hypothesis)
      }
    }

    return this.fallbackPhysicsValidation(hypothesis)
  }

  /**
   * Fallback physics validation without GPU
   */
  private fallbackPhysicsValidation(
    hypothesis: RacingHypothesis
  ): ValidationResult['physics'] {
    // Simple heuristic-based validation
    const score = hypothesis.scores.overall
    const valid = score >= 5.0 // Basic threshold

    return {
      valid,
      confidenceScore: 0.5 + (score / 20), // Convert score to confidence
      metrics: {
        violationsDetected: valid ? [] : ['Score below threshold'],
      },
      fromCache: false,
    }
  }

  /**
   * Validate economics using GPU
   */
  private async validateEconomics(
    hypothesis: RacingHypothesis,
    levelConfig: typeof LEVEL_CONFIG[ValidationLevel]
  ): Promise<ValidationResult['economics']> {
    // Economics are validated alongside physics in GPU batch
    // This is a simplified version
    if (this.config.enableGPU && this.gpuBridge) {
      try {
        const gpuResult = await this.gpuBridge.queueValidation(hypothesis, {
          tier: levelConfig.gpuTier,
        })

        return {
          viable: gpuResult.economicallyViable,
          confidenceScore: gpuResult.confidenceScore,
          metrics: {
            lcoe: gpuResult.metrics.lcoe,
            paybackYears: undefined,
            roi: undefined,
          },
        }
      } catch (error) {
        console.warn('[ValidationEngine] GPU economics validation failed, using fallback:', error)
        return this.fallbackEconomicsValidation(hypothesis)
      }
    }

    return this.fallbackEconomicsValidation(hypothesis)
  }

  /**
   * Fallback economics validation without GPU
   */
  private fallbackEconomicsValidation(
    hypothesis: RacingHypothesis
  ): ValidationResult['economics'] {
    const score = hypothesis.scores.overall
    const viable = score >= 6.0

    return {
      viable,
      confidenceScore: 0.4 + (score / 20),
      metrics: {},
    }
  }

  /**
   * Validate against literature
   */
  private async validateLiterature(
    hypothesis: RacingHypothesis
  ): Promise<ValidationResult['literature']> {
    if (!this.config.enableLiteratureCrossRef) {
      return this.getEmptyLiteratureResult()
    }

    try {
      const { LiteratureCrossReferenceValidator } = await import(
        '@/lib/ai/validation/literature-cross-reference'
      )

      const validator = new LiteratureCrossReferenceValidator({
        minSupportingEvidence: this.config.literatureMinSupport,
        recentThresholdYear: 2020,
        maxSourcesPerClaim: 10,
        enablePhysicsValidation: true,
        strictMode: this.config.strictMode,
      })

      const result = await validator.validate({
        hypothesis: hypothesis,
        validation: {},
        research: {},
      })

      return {
        supportedClaims: result.supportedClaims,
        contradictedClaims: result.contradictedClaims,
        totalClaims: result.totalClaims,
        confidenceScore: result.overallConfidence,
        citations: result.claimValidations?.map(c => c.claimId).slice(0, 5) || [],
        warnings: result.recommendations || [],
      }
    } catch (error) {
      console.warn('[ValidationEngine] Literature validation failed:', error)
      return this.getEmptyLiteratureResult()
    }
  }

  /**
   * Empty literature result for quick validation
   */
  private getEmptyLiteratureResult(): ValidationResult['literature'] {
    return {
      supportedClaims: 0,
      contradictedClaims: 0,
      totalClaims: 0,
      confidenceScore: 0.5,
      citations: [],
      warnings: [],
    }
  }

  /**
   * Assess quality of the hypothesis
   */
  private async assessQuality(
    hypothesis: RacingHypothesis
  ): Promise<ValidationResult['quality']> {
    // Derive quality metrics from existing scores
    const scores = hypothesis.scores

    // Map dimensions to quality metrics - extract percentOfMax from DimensionScore
    const getScore = (dimension: string, defaultValue: number): number => {
      const dimScore = scores.dimensions.get(dimension as import('../rubrics/types-breakthrough').BreakthroughDimension)
      return dimScore?.percentOfMax ?? defaultValue
    }

    const completeness = getScore('bc9_feasibility', 70) / 100
    const accuracy = getScore('bc1_performance', 70) / 100
    const novelty = getScore('bc3_capabilities', 50) / 100
    const feasibility = getScore('bc9_feasibility', 60) / 100

    // Calculate overall grade
    const avg = (completeness + accuracy + novelty + feasibility) / 4
    let grade: 'A' | 'B' | 'C' | 'D' | 'F'
    if (avg >= 0.9) grade = 'A'
    else if (avg >= 0.8) grade = 'B'
    else if (avg >= 0.7) grade = 'C'
    else if (avg >= 0.6) grade = 'D'
    else grade = 'F'

    return {
      completeness: completeness * 10,
      accuracy: accuracy * 10,
      novelty: novelty * 10,
      feasibility: feasibility * 10,
      overallGrade: grade,
    }
  }

  /**
   * Quick quality assessment
   */
  private getQuickQualityAssessment(
    hypothesis: RacingHypothesis
  ): ValidationResult['quality'] {
    const score = hypothesis.scores.overall

    let grade: 'A' | 'B' | 'C' | 'D' | 'F'
    if (score >= 9.0) grade = 'A'
    else if (score >= 8.0) grade = 'B'
    else if (score >= 7.0) grade = 'C'
    else if (score >= 6.0) grade = 'D'
    else grade = 'F'

    return {
      completeness: score,
      accuracy: score,
      novelty: score * 0.8,
      feasibility: score * 0.9,
      overallGrade: grade,
    }
  }

  /**
   * Calculate overall validation score
   */
  private calculateOverallScore(
    physics: ValidationResult['physics'],
    economics: ValidationResult['economics'],
    literature: ValidationResult['literature'],
    quality: ValidationResult['quality']
  ): number {
    // Weighted score calculation
    const weights = {
      physics: 0.35,
      economics: 0.25,
      literature: 0.15,
      quality: 0.25,
    }

    const physicsScore = physics.valid
      ? (physics.confidenceScore * 10)
      : (physics.confidenceScore * 5)

    const economicsScore = economics.viable
      ? (economics.confidenceScore * 10)
      : (economics.confidenceScore * 5)

    const literatureScore = literature.totalClaims > 0
      ? ((literature.supportedClaims / Math.max(1, literature.totalClaims)) * 10)
      : 5 // Neutral if no literature check

    const qualityScore = (
      quality.completeness +
      quality.accuracy +
      quality.novelty +
      quality.feasibility
    ) / 4

    return (
      physicsScore * weights.physics +
      economicsScore * weights.economics +
      literatureScore * weights.literature +
      qualityScore * weights.quality
    )
  }

  /**
   * Determine if hypothesis passes validation
   */
  private determinePass(
    overallScore: number,
    physics: ValidationResult['physics'],
    economics: ValidationResult['economics'],
    literature: ValidationResult['literature'],
    level: ValidationLevel
  ): boolean {
    // Minimum thresholds based on level
    const minScores: Record<ValidationLevel, number> = {
      quick: 5.0,
      standard: 6.0,
      comprehensive: 7.0,
    }

    // Must meet overall score threshold
    if (overallScore < minScores[level]) {
      return false
    }

    // Must pass physics validation
    if (!physics.valid && physics.confidenceScore < this.config.physicsConfidenceThreshold) {
      return false
    }

    // In strict mode, must also pass economics
    if (this.config.strictMode && !economics.viable) {
      return false
    }

    // Check for literature contradictions in comprehensive mode
    if (level === 'comprehensive' && literature.contradictedClaims > 0) {
      return false
    }

    return true
  }

  /**
   * Generate validation summary
   */
  private generateSummary(
    hypothesis: RacingHypothesis,
    physics: ValidationResult['physics'],
    economics: ValidationResult['economics'],
    literature: ValidationResult['literature'],
    passed: boolean
  ): string {
    const parts: string[] = []

    parts.push(`Hypothesis "${hypothesis.title.slice(0, 50)}..." ${passed ? 'PASSED' : 'FAILED'} validation.`)

    if (physics.valid) {
      parts.push(`Physics validated (${(physics.confidenceScore * 100).toFixed(0)}% confidence).`)
    } else {
      parts.push(`Physics validation failed (${(physics.confidenceScore * 100).toFixed(0)}% confidence).`)
    }

    if (economics.viable) {
      parts.push(`Economically viable.`)
    } else {
      parts.push(`Economic concerns identified.`)
    }

    if (literature.totalClaims > 0) {
      parts.push(`Literature: ${literature.supportedClaims}/${literature.totalClaims} claims supported.`)
    }

    return parts.join(' ')
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    physics: ValidationResult['physics'],
    economics: ValidationResult['economics'],
    literature: ValidationResult['literature'],
    quality: ValidationResult['quality']
  ): string[] {
    const recommendations: string[] = []

    // Physics recommendations
    if (!physics.valid) {
      recommendations.push('Address physics violations before proceeding')
      if (physics.metrics.violationsDetected.length > 0) {
        recommendations.push(`Fix: ${physics.metrics.violationsDetected.join(', ')}`)
      }
    }

    // Economics recommendations
    if (!economics.viable) {
      recommendations.push('Improve economic viability - consider cost reduction strategies')
      if (economics.metrics.lcoe && economics.metrics.lcoe.mean > 0.1) {
        recommendations.push(`LCOE (${economics.metrics.lcoe.mean.toFixed(3)}) is high - target < $0.05/kWh`)
      }
    }

    // Literature recommendations
    if (literature.contradictedClaims > 0) {
      recommendations.push(`Address ${literature.contradictedClaims} contradicted claims`)
    }

    // Quality recommendations
    if (quality.completeness < 6) {
      recommendations.push('Improve completeness - add more detail to hypothesis')
    }
    if (quality.novelty < 5) {
      recommendations.push('Strengthen novelty - differentiate from existing approaches')
    }

    return recommendations
  }

  /**
   * Collect warnings from validation results
   */
  private collectWarnings(
    physics: ValidationResult['physics'],
    economics: ValidationResult['economics'],
    literature: ValidationResult['literature']
  ): string[] {
    const warnings: string[] = []

    // Physics warnings
    if (physics.confidenceScore < 0.5) {
      warnings.push('Low physics confidence - results may be unreliable')
    }
    warnings.push(...physics.metrics.violationsDetected)

    // Economics warnings
    if (economics.confidenceScore < 0.5) {
      warnings.push('Low economic confidence - market analysis recommended')
    }

    // Literature warnings
    warnings.push(...literature.warnings)
    if (literature.contradictedClaims > 0) {
      warnings.push(`${literature.contradictedClaims} claims contradict existing literature`)
    }

    return warnings
  }

  /**
   * Convert GPU result to full validation result
   */
  private convertGPUToValidationResult(
    hypothesis: RacingHypothesis,
    gpuResult: GPUResult,
    level: ValidationLevel
  ): ValidationResult {
    return {
      hypothesisId: hypothesis.id,
      level,
      overallScore: (gpuResult.physicsValid ? 6 : 3) + (gpuResult.economicallyViable ? 2 : 0) + (gpuResult.confidenceScore * 2),
      passed: gpuResult.physicsValid && gpuResult.confidenceScore >= 0.7,
      timestamp: Date.now(),
      durationMs: gpuResult.durationMs,
      physics: {
        valid: gpuResult.physicsValid,
        confidenceScore: gpuResult.confidenceScore,
        metrics: {
          efficiency: gpuResult.metrics.efficiency,
          violationsDetected: gpuResult.physicsValid ? [] : ['GPU validation failed'],
        },
        gpuTier: gpuResult.tier,
        fromCache: gpuResult.fromCache,
      },
      economics: {
        viable: gpuResult.economicallyViable,
        confidenceScore: gpuResult.confidenceScore,
        metrics: {
          lcoe: gpuResult.metrics.lcoe,
        },
      },
      literature: this.getEmptyLiteratureResult(),
      quality: this.getQuickQualityAssessment(hypothesis),
      summary: `Quick GPU validation: ${gpuResult.physicsValid ? 'physics OK' : 'physics FAILED'}, ${gpuResult.economicallyViable ? 'economics OK' : 'economics FAILED'}`,
      recommendations: [],
      warnings: gpuResult.fromCache ? ['Result from cache'] : [],
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createValidationEngine(
  config?: Partial<ValidationConfig>,
  dependencies?: {
    gpuPool?: GPUValidationPool
    gpuBridge?: GPUFeedbackBridge
    feedbackBus?: FeedbackBus
  }
): ValidationEngine {
  return new ValidationEngine(config, dependencies)
}

export default ValidationEngine
