/**
 * Hybrid Breakthrough Validation Functions
 *
 * Two-phase validation system:
 * - Phase 1: FrontierScience Foundation (FS1-FS5) - 5.0 points
 * - Phase 2: Breakthrough Detection (BD1-BD7) - 5.0 points
 *
 * Validation functions work with existing RacingHypothesis structure
 * from hypgen/base.ts, reading fields like predictions, mechanism,
 * supportingEvidence, noveltyScore, etc.
 *
 * @see types-hybrid-breakthrough.ts - Type definitions
 * @see hypgen/base.ts - RacingHypothesis structure
 */

import type { RacingHypothesis } from '../../agents/hypgen/base'
import type { Prediction, Mechanism } from '../../agents/creative-agent'
import {
  type FrontierScienceDimension,
  type BreakthroughDetectionDimension,
  type HybridDimensionScore,
  type HybridBreakthroughScore,
  type HybridClassificationTier,
  FS_DIMENSION_CONFIGS,
  BD_DIMENSION_CONFIGS,
  getClassificationTier,
  getTierConfig,
} from '../types-hybrid-breakthrough'

// =============================================================================
// Thermodynamic Limits (for FS4 validation)
// =============================================================================

const THERMODYNAMIC_LIMITS = {
  betz: 0.593,                    // Wind turbine max efficiency
  shockleyQueisser: 0.337,        // Single-junction PV limit
  multiJunctionPV: 0.68,          // Multi-junction theoretical
  carnotBase: (tHot: number, tCold: number = 300) =>
    tHot > tCold ? (tHot - tCold) / tHot : 0,
  fuelCellThermo: 0.83,           // H2 fuel cell theoretical
  electrolysisMin: 1.23,          // Minimum voltage for water splitting
  batteryTheoretical: 0.95,       // Battery round-trip theoretical
  hydrogenGravimetric: 0.055,     // kg H2 / kg system (DOE target)
}

// =============================================================================
// Phase 1: FrontierScience Foundation (FS1-FS5)
// =============================================================================

/**
 * FS1: Falsifiable Predictions (1.0 pts)
 * Evaluates whether predictions are testable with measurable outcomes
 */
export function validateFS1(hypothesis: RacingHypothesis): HybridDimensionScore {
  const predictions = hypothesis.predictions || []
  const config = FS_DIMENSION_CONFIGS.find(c => c.id === 'fs1_predictions')!

  if (predictions.length === 0) {
    return {
      dimension: 'fs1_predictions',
      score: 0.25,
      maxScore: config.maxPoints,
      percentage: 25,
      passed: false,
      reasoning: 'No predictions found',
      criteriaMatched: 'Insufficient: No predictions'
    }
  }

  // Count falsifiable predictions
  let falsifiableCount = 0
  for (const pred of predictions) {
    const isFalsifiable = (
      pred.falsifiable === true ||
      pred.measurable === true ||
      (pred.expectedValue !== undefined && pred.unit !== undefined)
    )
    if (isFalsifiable) falsifiableCount++
  }

  const ratio = (falsifiableCount / predictions.length) * 100

  // Find matching criteria
  const criteria = config.scoringCriteria.find(c => ratio >= c.threshold) || config.scoringCriteria[config.scoringCriteria.length - 1]

  return {
    dimension: 'fs1_predictions',
    score: criteria.points,
    maxScore: config.maxPoints,
    percentage: (criteria.points / config.maxPoints) * 100,
    passed: criteria.points >= config.maxPoints * 0.6,
    reasoning: `${falsifiableCount}/${predictions.length} predictions (${ratio.toFixed(0)}%) are falsifiable with measurable outcomes`,
    criteriaMatched: criteria.label
  }
}

/**
 * FS2: Supporting Evidence (1.0 pts)
 * Evaluates grounding in research findings and literature
 */
export function validateFS2(hypothesis: RacingHypothesis): HybridDimensionScore {
  const evidence = hypothesis.supportingEvidence || []
  const config = FS_DIMENSION_CONFIGS.find(c => c.id === 'fs2_evidence')!

  // Count high-quality evidence (has citation and relevance)
  let qualityCount = 0
  for (const ev of evidence) {
    const hasQuality = (
      (ev.citation && typeof ev.citation === 'string' && ev.citation.length > 5) ||
      (typeof ev.relevance === 'number' && ev.relevance >= 0.5) ||
      ev.finding
    )
    if (hasQuality) qualityCount++
  }

  // Find matching criteria (using count as threshold)
  let criteria = config.scoringCriteria[config.scoringCriteria.length - 1]
  for (const c of config.scoringCriteria) {
    if (qualityCount >= c.threshold) {
      criteria = c
      break
    }
  }

  return {
    dimension: 'fs2_evidence',
    score: criteria.points,
    maxScore: config.maxPoints,
    percentage: (criteria.points / config.maxPoints) * 100,
    passed: criteria.points >= config.maxPoints * 0.6,
    reasoning: `${qualityCount} supporting evidence items with citations/relevance`,
    criteriaMatched: criteria.label
  }
}

/**
 * FS3: Mechanism Quality (1.0 pts)
 * Evaluates clarity of physical/chemical mechanism
 */
export function validateFS3(hypothesis: RacingHypothesis): HybridDimensionScore {
  const mechanism = hypothesis.mechanism
  const config = FS_DIMENSION_CONFIGS.find(c => c.id === 'fs3_mechanism')!

  if (!mechanism || !mechanism.steps) {
    return {
      dimension: 'fs3_mechanism',
      score: 0.25,
      maxScore: config.maxPoints,
      percentage: 25,
      passed: false,
      reasoning: 'No mechanism or steps defined',
      criteriaMatched: 'Insufficient: Missing mechanism'
    }
  }

  const steps = mechanism.steps || []
  const stepCount = steps.length

  // Check quality of steps
  let qualityScore = 0
  let hasPhysicalPrinciples = 0

  for (const step of steps) {
    if (step.description && step.description.length > 20) qualityScore += 1
    if (step.physicalPrinciple) {
      hasPhysicalPrinciples++
      qualityScore += 1
    }
    if (step.order !== undefined) qualityScore += 0.5
  }

  // Calculate percentage based on steps and quality
  const maxPossible = stepCount * 2.5  // description + principle + order
  const percentage = maxPossible > 0 ? Math.min(100, (qualityScore / maxPossible) * 100 + stepCount * 10) : 0

  // Find matching criteria
  const criteria = config.scoringCriteria.find(c => percentage >= c.threshold) || config.scoringCriteria[config.scoringCriteria.length - 1]

  return {
    dimension: 'fs3_mechanism',
    score: criteria.points,
    maxScore: config.maxPoints,
    percentage: (criteria.points / config.maxPoints) * 100,
    passed: criteria.points >= config.maxPoints * 0.6,
    reasoning: `${stepCount} mechanism steps, ${hasPhysicalPrinciples} with physical principles`,
    criteriaMatched: criteria.label
  }
}

/**
 * FS4: Scientific Grounding (1.0 pts)
 * Validates thermodynamic validity and materials compatibility
 */
export function validateFS4(hypothesis: RacingHypothesis): HybridDimensionScore {
  const config = FS_DIMENSION_CONFIGS.find(c => c.id === 'fs4_grounding')!
  const predictions = hypothesis.predictions || []
  const statement = hypothesis.statement || ''

  let violations = 0
  let checks = 0
  const issues: string[] = []

  // Check for efficiency claims that might violate limits
  for (const pred of predictions) {
    const value = pred.expectedValue
    const unit = (pred.unit || '').toLowerCase()

    if (unit.includes('%') || unit === 'efficiency') {
      checks++
      const numValue = typeof value === 'number' ? value : parseFloat(String(value))

      if (!isNaN(numValue)) {
        // Check various limits
        if (numValue > 100) {
          violations++
          issues.push(`Efficiency ${numValue}% exceeds 100%`)
        }
        if (statement.toLowerCase().includes('solar') && numValue > 86.7) {
          // Close to concentrated solar limit
          if (numValue > 95) {
            violations++
            issues.push(`Solar efficiency ${numValue}% exceeds theoretical limits`)
          }
        }
        if (statement.toLowerCase().includes('wind') && numValue > 59.3) {
          violations++
          issues.push(`Wind efficiency ${numValue}% exceeds Betz limit`)
        }
      }
    }
  }

  // Check for reasonable novelty/feasibility scores
  if (hypothesis.noveltyScore !== undefined) {
    checks++
    if (hypothesis.noveltyScore > 100) {
      violations++
      issues.push('Novelty score exceeds 100')
    }
  }

  if (hypothesis.feasibilityScore !== undefined) {
    checks++
    if (hypothesis.feasibilityScore < 20 && hypothesis.noveltyScore > 90) {
      // Very novel but very infeasible might indicate issues
      issues.push('Very low feasibility with very high novelty may indicate speculative claims')
    }
  }

  // Calculate percentage (start at 90% if no checks, reduce for violations)
  const basePercentage = checks === 0 ? 70 : 90
  const violationPenalty = violations * 25
  const percentage = Math.max(0, basePercentage - violationPenalty)

  // Find matching criteria
  const criteria = config.scoringCriteria.find(c => percentage >= c.threshold) || config.scoringCriteria[config.scoringCriteria.length - 1]

  return {
    dimension: 'fs4_grounding',
    score: criteria.points,
    maxScore: config.maxPoints,
    percentage: (criteria.points / config.maxPoints) * 100,
    passed: criteria.points >= config.maxPoints * 0.6,
    reasoning: violations === 0
      ? `No thermodynamic violations detected in ${checks} checks`
      : `${violations} potential issues: ${issues.join('; ')}`,
    criteriaMatched: criteria.label
  }
}

/**
 * FS5: Methodology & Safety (1.0 pts)
 * Evaluates reproducibility and safety considerations
 */
export function validateFS5(hypothesis: RacingHypothesis): HybridDimensionScore {
  const config = FS_DIMENSION_CONFIGS.find(c => c.id === 'fs5_methodology')!
  const validationMetrics = hypothesis.validationMetrics || []
  const variables = hypothesis.variables || {}

  let methodologyScore = 0

  // Check validation metrics
  if (validationMetrics.length >= 3) {
    methodologyScore += 30
  } else if (validationMetrics.length >= 2) {
    methodologyScore += 20
  } else if (validationMetrics.length >= 1) {
    methodologyScore += 10
  }

  // Check for well-defined variables
  const independentVars = variables.independent || []
  const dependentVars = variables.dependent || []
  const controlVars = variables.controls || []

  if (independentVars.length >= 2) methodologyScore += 20
  if (dependentVars.length >= 1) methodologyScore += 15
  if (controlVars.length >= 1) methodologyScore += 15

  // Check for required materials (indicates practical approach)
  if (hypothesis.requiredMaterials && hypothesis.requiredMaterials.length > 0) {
    methodologyScore += 20
  }

  // Bonus for impact/feasibility balance
  if (hypothesis.impactScore && hypothesis.feasibilityScore) {
    const ratio = hypothesis.feasibilityScore / hypothesis.impactScore
    if (ratio >= 0.7 && ratio <= 1.3) {
      // Balanced approach
      methodologyScore += 10
    }
  }

  const percentage = Math.min(100, methodologyScore)

  // Find matching criteria
  const criteria = config.scoringCriteria.find(c => percentage >= c.threshold) || config.scoringCriteria[config.scoringCriteria.length - 1]

  return {
    dimension: 'fs5_methodology',
    score: criteria.points,
    maxScore: config.maxPoints,
    percentage: (criteria.points / config.maxPoints) * 100,
    passed: criteria.points >= config.maxPoints * 0.6,
    reasoning: `${validationMetrics.length} validation metrics, ${independentVars.length + dependentVars.length + controlVars.length} defined variables`,
    criteriaMatched: criteria.label
  }
}

// =============================================================================
// Phase 2: Breakthrough Detection (BD1-BD7)
// =============================================================================

/**
 * Extract performance gain percentage from predictions and statement
 */
function extractPerformanceGain(predictions: Prediction[], statement: string): number {
  let maxGain = 0

  // Check predictions for performance claims
  for (const pred of predictions) {
    const text = `${pred.statement || ''} ${pred.expectedValue || ''}`

    // Look for percentage patterns
    const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/)
    if (percentMatch) {
      const value = parseFloat(percentMatch[1])
      if (value > maxGain && value <= 100) {
        maxGain = value
      }
    }

    // Look for "X times" or "Xx" patterns
    const timesMatch = text.match(/(\d+(?:\.\d+)?)\s*[xX×]\s*(?:improvement|increase|better|higher)/i)
    if (timesMatch) {
      const multiplier = parseFloat(timesMatch[1])
      const gainPercent = (multiplier - 1) * 100
      if (gainPercent > maxGain && gainPercent <= 500) {
        maxGain = gainPercent
      }
    }
  }

  // Check statement for claims
  const statementPercent = statement.match(/(\d+(?:\.\d+)?)\s*%\s*(?:improvement|increase|higher|better|gain)/i)
  if (statementPercent) {
    const value = parseFloat(statementPercent[1])
    if (value > maxGain && value <= 100) {
      maxGain = value
    }
  }

  return maxGain
}

/**
 * BD1: Performance Step-Change (1.0 pts)
 * >25% improvement over state-of-the-art
 */
export function validateBD1(hypothesis: RacingHypothesis): HybridDimensionScore {
  const config = BD_DIMENSION_CONFIGS.find(c => c.id === 'bd1_performance')!
  const predictions = hypothesis.predictions || []
  const statement = hypothesis.statement || ''

  // Extract performance gain
  const performanceGain = extractPerformanceGain(predictions, statement)

  // Also consider novelty score as proxy for improvement magnitude
  const noveltyBonus = (hypothesis.noveltyScore || 0) > 80 ? 10 : 0

  const effectiveGain = performanceGain + noveltyBonus

  // Find matching criteria
  const criteria = config.scoringCriteria.find(c => effectiveGain >= c.threshold) || config.scoringCriteria[config.scoringCriteria.length - 1]

  return {
    dimension: 'bd1_performance',
    score: criteria.points,
    maxScore: config.maxPoints,
    percentage: (criteria.points / config.maxPoints) * 100,
    passed: criteria.points >= config.maxPoints * 0.8,  // 80% for breakthrough
    reasoning: `Detected ${performanceGain.toFixed(0)}% performance improvement claim`,
    criteriaMatched: criteria.label
  }
}

/**
 * BD2: Cost Reduction Potential (0.75 pts)
 */
export function validateBD2(hypothesis: RacingHypothesis): HybridDimensionScore {
  const config = BD_DIMENSION_CONFIGS.find(c => c.id === 'bd2_cost')!
  const predictions = hypothesis.predictions || []
  const statement = hypothesis.statement || ''

  let costReduction = 0

  // Search for cost-related claims
  const costTerms = ['cost', 'lcoe', 'capex', 'opex', 'price', 'economical', 'affordable', '$/']
  const fullText = `${statement} ${predictions.map(p => p.statement || '').join(' ')}`.toLowerCase()

  // Check for cost reduction mentions
  for (const term of costTerms) {
    if (fullText.includes(term)) {
      // Look for percentage near cost term
      const termIndex = fullText.indexOf(term)
      const nearby = fullText.slice(Math.max(0, termIndex - 50), termIndex + 100)
      const percentMatch = nearby.match(/(\d+(?:\.\d+)?)\s*%/)
      if (percentMatch) {
        const value = parseFloat(percentMatch[1])
        if (value > costReduction && value <= 90) {
          costReduction = value
        }
      }
    }
  }

  // Use impact score as proxy if no explicit cost claims
  if (costReduction === 0 && hypothesis.impactScore) {
    costReduction = Math.min(30, hypothesis.impactScore / 3)  // Conservative estimate
  }

  // Find matching criteria
  const criteria = config.scoringCriteria.find(c => costReduction >= c.threshold) || config.scoringCriteria[config.scoringCriteria.length - 1]

  return {
    dimension: 'bd2_cost',
    score: criteria.points,
    maxScore: config.maxPoints,
    percentage: (criteria.points / config.maxPoints) * 100,
    passed: criteria.points >= config.maxPoints * 0.6,
    reasoning: costReduction > 0
      ? `Detected ${costReduction.toFixed(0)}% cost reduction potential`
      : 'No explicit cost reduction claims detected',
    criteriaMatched: criteria.label
  }
}

/**
 * BD3: Cross-Domain Innovation (0.5 pts)
 */
export function validateBD3(hypothesis: RacingHypothesis): HybridDimensionScore {
  const config = BD_DIMENSION_CONFIGS.find(c => c.id === 'bd3_cross_domain')!
  const evidence = hypothesis.supportingEvidence || []
  const statement = hypothesis.statement || ''
  const mechanism = hypothesis.mechanism?.steps || []

  // Domain keywords to detect cross-domain elements
  const domains = {
    biology: ['bio', 'enzyme', 'protein', 'cell', 'organism', 'photosynthesis', 'cyanobacteria'],
    aerospace: ['aerospace', 'turbine', 'compressor', 'nozzle', 'thermal barrier'],
    automotive: ['automotive', 'vehicle', 'ev', 'motor', 'drivetrain'],
    semiconductor: ['semiconductor', 'wafer', 'doping', 'lithography', 'silicon'],
    materials: ['alloy', 'composite', 'ceramic', 'polymer', 'metal-organic'],
    computing: ['ml', 'machine learning', 'ai', 'optimization', 'algorithm', 'simulation'],
    chemistry: ['catalyst', 'electrolyte', 'synthesis', 'reaction', 'kinetics'],
    physics: ['quantum', 'phonon', 'bandgap', 'thermodynamic', 'entropy']
  }

  const detectedDomains = new Set<string>()
  const fullText = `${statement} ${mechanism.map(s => s.description || '').join(' ')}`.toLowerCase()

  for (const [domain, keywords] of Object.entries(domains)) {
    for (const keyword of keywords) {
      if (fullText.includes(keyword)) {
        detectedDomains.add(domain)
        break
      }
    }
  }

  const domainCount = detectedDomains.size
  let percentage = 0

  if (domainCount >= 3) {
    percentage = 90
  } else if (domainCount === 2) {
    percentage = 60
  } else if (domainCount === 1) {
    percentage = 30
  }

  // Find matching criteria
  const criteria = config.scoringCriteria.find(c => percentage >= c.threshold) || config.scoringCriteria[config.scoringCriteria.length - 1]

  return {
    dimension: 'bd3_cross_domain',
    score: criteria.points,
    maxScore: config.maxPoints,
    percentage: (criteria.points / config.maxPoints) * 100,
    passed: criteria.points >= config.maxPoints * 0.6,
    reasoning: `Detected ${domainCount} domain(s): ${Array.from(detectedDomains).join(', ') || 'single domain'}`,
    criteriaMatched: criteria.label
  }
}

/**
 * BD4: Market Disruption Potential (0.75 pts)
 */
export function validateBD4(hypothesis: RacingHypothesis): HybridDimensionScore {
  const config = BD_DIMENSION_CONFIGS.find(c => c.id === 'bd4_market')!
  const statement = hypothesis.statement || ''
  const impactScore = hypothesis.impactScore || 0

  // Market disruption indicators
  const disruptionIndicators = [
    'disruption', 'disruptive', 'game-changing', 'revolutionary', 'breakthrough',
    'paradigm shift', 'transformative', 'replace', 'obsolete', 'new market',
    'category', 'platform'
  ]

  let indicatorCount = 0
  const fullText = statement.toLowerCase()

  for (const indicator of disruptionIndicators) {
    if (fullText.includes(indicator)) {
      indicatorCount++
    }
  }

  // Base score on impact score and disruption indicators
  let percentage = Math.min(90, impactScore + indicatorCount * 10)

  // Find matching criteria
  const criteria = config.scoringCriteria.find(c => percentage >= c.threshold) || config.scoringCriteria[config.scoringCriteria.length - 1]

  return {
    dimension: 'bd4_market',
    score: criteria.points,
    maxScore: config.maxPoints,
    percentage: (criteria.points / config.maxPoints) * 100,
    passed: criteria.points >= config.maxPoints * 0.6,
    reasoning: `Impact score ${impactScore}, ${indicatorCount} disruption indicators found`,
    criteriaMatched: criteria.label
  }
}

/**
 * BD5: Scalability Path (0.75 pts)
 */
export function validateBD5(hypothesis: RacingHypothesis): HybridDimensionScore {
  const config = BD_DIMENSION_CONFIGS.find(c => c.id === 'bd5_scalability')!
  const statement = hypothesis.statement || ''
  const feasibilityScore = hypothesis.feasibilityScore || 0

  // Scale indicators
  const scaleIndicators = {
    tw: ['tw', 'terawatt', 'global scale', 'planetary'],
    gw: ['gw', 'gigawatt', 'utility scale', 'grid scale', 'large scale'],
    mw: ['mw', 'megawatt', 'commercial scale', 'industrial'],
    lab: ['lab', 'pilot', 'demonstration', 'prototype', 'bench scale']
  }

  const fullText = statement.toLowerCase()
  let maxScale = 'lab'

  for (const [scale, keywords] of Object.entries(scaleIndicators)) {
    for (const keyword of keywords) {
      if (fullText.includes(keyword)) {
        if (scale === 'tw') maxScale = 'tw'
        else if (scale === 'gw' && maxScale !== 'tw') maxScale = 'gw'
        else if (scale === 'mw' && maxScale === 'lab') maxScale = 'mw'
        break
      }
    }
  }

  // Calculate percentage based on scale + feasibility
  let percentage = feasibilityScore * 0.5  // Start with half of feasibility

  if (maxScale === 'tw') percentage += 45
  else if (maxScale === 'gw') percentage += 35
  else if (maxScale === 'mw') percentage += 20

  percentage = Math.min(90, percentage)

  // Find matching criteria
  const criteria = config.scoringCriteria.find(c => percentage >= c.threshold) || config.scoringCriteria[config.scoringCriteria.length - 1]

  return {
    dimension: 'bd5_scalability',
    score: criteria.points,
    maxScore: config.maxPoints,
    percentage: (criteria.points / config.maxPoints) * 100,
    passed: criteria.points >= config.maxPoints * 0.6,
    reasoning: `Scalability path: ${maxScale.toUpperCase()} scale, feasibility ${feasibilityScore}%`,
    criteriaMatched: criteria.label
  }
}

/**
 * BD6: Knowledge Trajectory (0.75 pts)
 * Paradigm shift vs incremental improvement
 */
export function validateBD6(hypothesis: RacingHypothesis): HybridDimensionScore {
  const config = BD_DIMENSION_CONFIGS.find(c => c.id === 'bd6_trajectory')!
  const statement = hypothesis.statement || ''
  const noveltyScore = hypothesis.noveltyScore || 0

  // Trajectory indicators
  const paradigmIndicators = [
    'new field', 'new paradigm', 'fundamental', 'first-of-kind', 'unprecedented',
    'redefine', 'revolutionize', 'novel mechanism', 'unexplored'
  ]

  const assumptionIndicators = [
    'challenge', 'assumption', 'conventional wisdom', 'contrary to', 'rethink',
    'reconsider', 'alternative approach'
  ]

  const methodologyIndicators = [
    'new method', 'novel approach', 'unique strategy', 'innovative technique',
    'original framework'
  ]

  const fullText = statement.toLowerCase()

  let paradigmCount = paradigmIndicators.filter(i => fullText.includes(i)).length
  let assumptionCount = assumptionIndicators.filter(i => fullText.includes(i)).length
  let methodCount = methodologyIndicators.filter(i => fullText.includes(i)).length

  // Calculate percentage based on indicators + novelty
  let percentage = noveltyScore * 0.6  // Start with 60% of novelty score

  if (paradigmCount > 0) percentage += 30
  else if (assumptionCount > 0) percentage += 20
  else if (methodCount > 0) percentage += 15

  percentage = Math.min(90, percentage)

  // Find matching criteria
  const criteria = config.scoringCriteria.find(c => percentage >= c.threshold) || config.scoringCriteria[config.scoringCriteria.length - 1]

  return {
    dimension: 'bd6_trajectory',
    score: criteria.points,
    maxScore: config.maxPoints,
    percentage: (criteria.points / config.maxPoints) * 100,
    passed: criteria.points >= config.maxPoints * 0.8,  // 80% for breakthrough
    reasoning: `Novelty ${noveltyScore}%, ${paradigmCount} paradigm + ${assumptionCount} assumption + ${methodCount} method indicators`,
    criteriaMatched: criteria.label
  }
}

/**
 * BD7: Societal Impact (0.5 pts)
 */
export function validateBD7(hypothesis: RacingHypothesis): HybridDimensionScore {
  const config = BD_DIMENSION_CONFIGS.find(c => c.id === 'bd7_societal')!
  const statement = hypothesis.statement || ''

  // Societal impact indicators
  const impactIndicators = [
    'decarbonization', 'carbon neutral', 'net zero', 'climate', 'emission',
    'sustainable', 'renewable', 'clean energy', 'green',
    'accessibility', 'affordable', 'developing', 'rural', 'global',
    'health', 'safety', 'environment', 'pollution', 'air quality'
  ]

  const fullText = statement.toLowerCase()
  const indicatorCount = impactIndicators.filter(i => fullText.includes(i)).length

  // Calculate percentage
  let percentage = Math.min(90, indicatorCount * 20 + 30)

  // Find matching criteria
  const criteria = config.scoringCriteria.find(c => percentage >= c.threshold) || config.scoringCriteria[config.scoringCriteria.length - 1]

  return {
    dimension: 'bd7_societal',
    score: criteria.points,
    maxScore: config.maxPoints,
    percentage: (criteria.points / config.maxPoints) * 100,
    passed: criteria.points >= config.maxPoints * 0.6,
    reasoning: `${indicatorCount} societal impact indicators found`,
    criteriaMatched: criteria.label
  }
}

// =============================================================================
// Main Validation Function
// =============================================================================

/**
 * Validate a hypothesis using the hybrid two-phase scoring system
 *
 * @param hypothesis - RacingHypothesis to evaluate
 * @returns Complete HybridBreakthroughScore with all dimensions
 */
export function validateHybridBreakthrough(hypothesis: RacingHypothesis): HybridBreakthroughScore {
  const startTime = Date.now()

  // Phase 1: FrontierScience Foundation (5.0 pts)
  const fs1 = validateFS1(hypothesis)
  const fs2 = validateFS2(hypothesis)
  const fs3 = validateFS3(hypothesis)
  const fs4 = validateFS4(hypothesis)
  const fs5 = validateFS5(hypothesis)

  const fsDimensions = {
    fs1_predictions: fs1,
    fs2_evidence: fs2,
    fs3_mechanism: fs3,
    fs4_grounding: fs4,
    fs5_methodology: fs5
  } as Record<FrontierScienceDimension, HybridDimensionScore>

  const fsScore = fs1.score + fs2.score + fs3.score + fs4.score + fs5.score
  const fsPercentage = (fsScore / 5.0) * 100

  // Phase 2: Breakthrough Detection (5.0 pts)
  const bd1 = validateBD1(hypothesis)
  const bd2 = validateBD2(hypothesis)
  const bd3 = validateBD3(hypothesis)
  const bd4 = validateBD4(hypothesis)
  const bd5 = validateBD5(hypothesis)
  const bd6 = validateBD6(hypothesis)
  const bd7 = validateBD7(hypothesis)

  const bdDimensions = {
    bd1_performance: bd1,
    bd2_cost: bd2,
    bd3_cross_domain: bd3,
    bd4_market: bd4,
    bd5_scalability: bd5,
    bd6_trajectory: bd6,
    bd7_societal: bd7
  } as Record<BreakthroughDetectionDimension, HybridDimensionScore>

  const bdScore = bd1.score + bd2.score + bd3.score + bd4.score + bd5.score + bd6.score + bd7.score
  const bdPercentage = (bdScore / 5.0) * 100

  // Overall score
  const overallScore = fsScore + bdScore

  // Classification
  const tier = getClassificationTier(overallScore)
  const tierConfig = getTierConfig(tier)

  // Check breakthrough requirements
  const fsAllPassing = [fs1, fs2, fs3, fs4, fs5].every(d => d.percentage >= 70)
  const bd1Performance = bd1.percentage >= 80
  const bd6Trajectory = bd6.percentage >= 80
  const bdHighCount = [bd1, bd2, bd3, bd4, bd5, bd6, bd7].filter(d => d.percentage >= 70).length

  const meetsBreakthrough = (
    fsAllPassing &&
    bd1Performance &&
    bd6Trajectory &&
    bdHighCount >= 5 &&
    overallScore >= 9.0
  )

  return {
    frontierScienceScore: fsScore,
    breakthroughScore: bdScore,
    overallScore,
    fsPercentage,
    bdPercentage,
    fsDimensions,
    bdDimensions,
    tier,
    tierConfig,
    breakthroughRequirements: {
      bd1Performance,
      bd6Trajectory,
      fsAllPassing,
      bdHighCount,
      meetsBreakthrough
    },
    evaluationDurationMs: Date.now() - startTime,
    evaluatorVersion: '0.1.0'
  }
}

/**
 * Generate refinement feedback from hybrid score
 */
export function generateHybridFeedback(score: HybridBreakthroughScore): string {
  const lines: string[] = []

  lines.push(`## Hybrid Breakthrough Evaluation (${score.overallScore.toFixed(1)}/10)`)
  lines.push(`**Classification**: ${score.tierConfig.label} - ${score.tierConfig.description}`)
  lines.push('')

  // Phase 1 Summary
  lines.push(`### Phase 1: FrontierScience Foundation (${score.frontierScienceScore.toFixed(1)}/5.0)`)
  for (const [dim, result] of Object.entries(score.fsDimensions)) {
    const icon = result.passed ? '✓' : '✗'
    lines.push(`- ${icon} **${result.dimension}**: ${result.score.toFixed(2)}/${result.maxScore} - ${result.reasoning}`)
  }
  lines.push('')

  // Phase 2 Summary
  lines.push(`### Phase 2: Breakthrough Detection (${score.breakthroughScore.toFixed(1)}/5.0)`)
  for (const [dim, result] of Object.entries(score.bdDimensions)) {
    const icon = result.passed ? '✓' : '✗'
    lines.push(`- ${icon} **${result.dimension}**: ${result.score.toFixed(2)}/${result.maxScore} - ${result.reasoning}`)
  }
  lines.push('')

  // Breakthrough Requirements
  lines.push(`### Breakthrough Requirements`)
  const req = score.breakthroughRequirements
  lines.push(`- BD1 Performance ≥80%: ${req.bd1Performance ? '✓' : '✗'}`)
  lines.push(`- BD6 Trajectory ≥80%: ${req.bd6Trajectory ? '✓' : '✗'}`)
  lines.push(`- FS dimensions all ≥70%: ${req.fsAllPassing ? '✓' : '✗'}`)
  lines.push(`- BD dimensions ≥70%: ${req.bdHighCount}/7 (need 5+)`)
  lines.push(`- **Meets Breakthrough**: ${req.meetsBreakthrough ? 'YES ✓' : 'NO'}`)

  return lines.join('\n')
}
