/**
 * Discovery Mode Configurations
 *
 * Defines the three discovery presets (Breakthrough, Synthesis, Validation)
 * with their respective novelty weights, thresholds, and iteration limits.
 * Also includes parallel analysis mode for running all modes simultaneously.
 */

export type DiscoveryMode = 'breakthrough' | 'synthesis' | 'validation'

/**
 * Mode-specific rubric weight adjustments
 */
export interface ModeRubricWeights {
  /** Novelty criterion weight (HC1) - 0 to 2.5 points */
  noveltyWeight: number
  /** Novelty pass threshold as percentage (0-100) */
  noveltyPassThreshold: number
  /** Overall pass threshold (out of 10) */
  overallPassThreshold: number
  /** Threshold that can be relaxed after iterations */
  relaxedThreshold: number
  /** Minimum acceptable score (graceful degradation) */
  minimumAcceptableScore: number
}

/**
 * Mode-specific iteration configuration
 */
export interface ModeIterationConfig {
  /** Maximum iterations for hypothesis phase */
  hypothesisMaxIterations: number
  /** Maximum iterations for research phase */
  researchMaxIterations: number
  /** Maximum iterations for validation phase */
  validationMaxIterations: number
  /** Maximum iterations for output phase */
  outputMaxIterations: number
  /** Iteration at which threshold relaxation begins */
  relaxationIterationStart: number
  /** Improvement threshold below which to stop iterating */
  improvementThreshold: number
}

/**
 * Complete mode configuration
 */
export interface DiscoveryModeConfig {
  /** Mode identifier */
  id: DiscoveryMode
  /** Display name */
  name: string
  /** Short description */
  description: string
  /** Detailed explanation for UI */
  details: string
  /** Icon name from lucide-react */
  icon: 'Sparkles' | 'BookOpen' | 'CheckCircle'
  /** Recommended use cases */
  useCases: string[]
  /** Rubric weight adjustments */
  rubricWeights: ModeRubricWeights
  /** Iteration configuration */
  iterationConfig: ModeIterationConfig
  /** Primary color theme */
  colorTheme: 'purple' | 'blue' | 'green' | 'amber'
}

/**
 * Breakthrough Mode Configuration
 *
 * For frontier research aimed at novel discoveries and potential patents.
 * High novelty requirements, strict thresholds, more iterations allowed.
 */
export const BREAKTHROUGH_MODE: DiscoveryModeConfig = {
  id: 'breakthrough',
  name: 'Breakthrough',
  description: 'Novel discovery for publication & patents',
  details: 'Strict novelty requirements (25% weight) with 7.0/10 pass threshold. Best for frontier research seeking truly novel insights that could lead to publications or patents.',
  icon: 'Sparkles',
  useCases: [
    'Frontier research discoveries',
    'Patent-worthy innovations',
    'Novel material combinations',
    'Paradigm-shifting approaches',
  ],
  rubricWeights: {
    noveltyWeight: 2.5, // Full 25% weight
    noveltyPassThreshold: 70, // 70% of 2.5 = 1.75 points required
    overallPassThreshold: 7.0,
    relaxedThreshold: 6.5, // Can relax to 6.5 after iteration 4
    minimumAcceptableScore: 6.0,
  },
  iterationConfig: {
    hypothesisMaxIterations: 5,
    researchMaxIterations: 4,
    validationMaxIterations: 4,
    outputMaxIterations: 3,
    relaxationIterationStart: 4,
    improvementThreshold: 0.1, // Very permissive
  },
  colorTheme: 'amber', // Gold color for premium/advanced mode
}

/**
 * Synthesis Mode Configuration
 *
 * For comprehensive research analysis and literature reviews.
 * Low novelty requirements, focus on completeness and source diversity.
 */
export const SYNTHESIS_MODE: DiscoveryModeConfig = {
  id: 'synthesis',
  name: 'Synthesis',
  description: 'Comprehensive research analysis',
  details: 'Minimal novelty requirements (5% weight) with 6.0/10 pass threshold. Ideal for literature reviews, gap analysis, and comprehensive understanding of a research area.',
  icon: 'BookOpen',
  useCases: [
    'Literature reviews',
    'Technology gap analysis',
    'State-of-the-art surveys',
    'Research landscape mapping',
  ],
  rubricWeights: {
    noveltyWeight: 0.5, // Only 5% weight
    noveltyPassThreshold: 50, // 50% of 0.5 = 0.25 points (very easy)
    overallPassThreshold: 6.0,
    relaxedThreshold: 5.5, // Can relax after iteration 3
    minimumAcceptableScore: 5.0,
  },
  iterationConfig: {
    hypothesisMaxIterations: 3, // Fewer iterations needed
    researchMaxIterations: 4, // Keep research iterations high
    validationMaxIterations: 3,
    outputMaxIterations: 3,
    relaxationIterationStart: 3,
    improvementThreshold: 0.2,
  },
  colorTheme: 'blue',
}

/**
 * Validation Mode Configuration
 *
 * For validating existing hypotheses and ideas.
 * Moderate novelty, focus on testability and feasibility.
 */
export const VALIDATION_MODE: DiscoveryModeConfig = {
  id: 'validation',
  name: 'Validation',
  description: 'Validate existing ideas & hypotheses',
  details: 'Moderate novelty requirements (10% weight) with 6.5/10 pass threshold. Perfect for testing your own hypotheses, assessing feasibility, and validating research directions.',
  icon: 'CheckCircle',
  useCases: [
    'Hypothesis validation',
    'Feasibility assessment',
    'Research direction testing',
    'Idea sanity checking',
  ],
  rubricWeights: {
    noveltyWeight: 1.0, // 10% weight
    noveltyPassThreshold: 60, // 60% of 1.0 = 0.6 points
    overallPassThreshold: 6.5,
    relaxedThreshold: 6.0, // Can relax after iteration 3
    minimumAcceptableScore: 5.5,
  },
  iterationConfig: {
    hypothesisMaxIterations: 3,
    researchMaxIterations: 3,
    validationMaxIterations: 4, // Extra validation iterations
    outputMaxIterations: 3,
    relaxationIterationStart: 3,
    improvementThreshold: 0.15,
  },
  colorTheme: 'green',
}

/**
 * All mode configurations indexed by mode ID
 */
export const MODE_CONFIGS: Record<DiscoveryMode, DiscoveryModeConfig> = {
  breakthrough: BREAKTHROUGH_MODE,
  synthesis: SYNTHESIS_MODE,
  validation: VALIDATION_MODE,
}

/**
 * Get mode configuration by ID
 */
export function getModeConfig(mode: DiscoveryMode): DiscoveryModeConfig {
  return MODE_CONFIGS[mode]
}

/**
 * Get all available modes
 */
export function getAllModes(): DiscoveryModeConfig[] {
  // Order: Synthesis (most accessible), Validation, Breakthrough (most demanding)
  return [SYNTHESIS_MODE, VALIDATION_MODE, BREAKTHROUGH_MODE]
}

/**
 * Calculate adjusted novelty points based on mode
 *
 * The hypothesis rubric has HC1 (novelty) worth 2.5 points.
 * This function redistributes those points based on the mode.
 */
export function getAdjustedNoveltyPoints(mode: DiscoveryMode): {
  noveltyPoints: number
  redistributedPoints: number
  redistributeTo: string[]
} {
  const config = getModeConfig(mode)
  const originalNoveltyPoints = 2.5
  const noveltyPoints = config.rubricWeights.noveltyWeight
  const redistributedPoints = originalNoveltyPoints - noveltyPoints

  // Redistribute to other criteria
  // HC2: Technical Merit, HC3: Testability, HC4: Specificity, HC5: Predictions
  const redistributeTo: string[] = []
  if (redistributedPoints > 0) {
    redistributeTo.push('HC2', 'HC3', 'HC4', 'HC5')
  }

  return {
    noveltyPoints,
    redistributedPoints,
    redistributeTo,
  }
}

/**
 * Check if a score passes for a given mode
 */
export function checkModePass(
  mode: DiscoveryMode,
  totalScore: number,
  noveltyScore: number,
  iterationNumber: number
): {
  passed: boolean
  reason: string
  qualityTier: 'breakthrough' | 'significant' | 'validated' | 'promising' | 'preliminary'
} {
  const config = getModeConfig(mode)
  const weights = config.rubricWeights
  const iterConfig = config.iterationConfig

  // Check novelty requirement
  const noveltyRequirement = weights.noveltyWeight * (weights.noveltyPassThreshold / 100)
  const noveltyPassed = noveltyScore >= noveltyRequirement

  // Determine threshold based on iteration
  let currentThreshold = weights.overallPassThreshold
  if (iterationNumber >= iterConfig.relaxationIterationStart) {
    currentThreshold = weights.relaxedThreshold
  }

  // Check overall pass
  const overallPassed = totalScore >= currentThreshold && noveltyPassed

  // Determine quality tier
  let qualityTier: 'breakthrough' | 'significant' | 'validated' | 'promising' | 'preliminary'
  if (totalScore >= 8.5) {
    qualityTier = 'breakthrough'
  } else if (totalScore >= 7.5) {
    qualityTier = 'significant'
  } else if (totalScore >= 6.5) {
    qualityTier = 'validated'
  } else if (totalScore >= 5.5) {
    qualityTier = 'promising'
  } else {
    qualityTier = 'preliminary'
  }

  // Generate reason
  let reason: string
  if (overallPassed) {
    reason = `Passed ${mode} mode (${totalScore.toFixed(1)}/10, threshold: ${currentThreshold})`
  } else if (!noveltyPassed && totalScore >= currentThreshold) {
    reason = `Novelty below ${mode} requirements (${noveltyScore.toFixed(2)}/${noveltyRequirement.toFixed(2)})`
  } else if (totalScore >= weights.minimumAcceptableScore) {
    reason = `Below threshold but acceptable (${totalScore.toFixed(1)}/${currentThreshold})`
  } else {
    reason = `Below minimum for ${mode} mode (${totalScore.toFixed(1)}/${weights.minimumAcceptableScore})`
  }

  return { passed: overallPassed, reason, qualityTier }
}

/**
 * Parallel analysis configuration
 */
export interface ParallelAnalysisConfig {
  /** Modes to run in parallel */
  modes: DiscoveryMode[]
  /** Whether to merge results or show separately */
  mergeResults: boolean
  /** Concordance threshold for considering findings aligned */
  concordanceThreshold: number
}

/**
 * Default parallel analysis configuration
 */
export const DEFAULT_PARALLEL_CONFIG: ParallelAnalysisConfig = {
  modes: ['breakthrough', 'synthesis', 'validation'],
  mergeResults: true,
  concordanceThreshold: 0.7,
}

/**
 * Get recommended mode based on query analysis
 */
export function suggestMode(query: string): DiscoveryMode {
  const lowerQuery = query.toLowerCase()

  // Synthesis indicators
  const synthesisKeywords = [
    'review', 'survey', 'overview', 'state of the art', 'landscape',
    'comparison', 'compare', 'analysis', 'understand', 'explore',
    'what is', 'how does', 'existing', 'current', 'literature',
  ]
  if (synthesisKeywords.some(kw => lowerQuery.includes(kw))) {
    return 'synthesis'
  }

  // Validation indicators
  const validationKeywords = [
    'validate', 'test', 'verify', 'check', 'feasible', 'feasibility',
    'possible', 'would it work', 'can we', 'is it possible',
    'my hypothesis', 'my idea', 'our approach',
  ]
  if (validationKeywords.some(kw => lowerQuery.includes(kw))) {
    return 'validation'
  }

  // Breakthrough indicators (or default)
  const breakthroughKeywords = [
    'novel', 'new', 'innovative', 'breakthrough', 'discover',
    'invent', 'patent', 'first', 'unprecedented', 'revolutionary',
  ]
  if (breakthroughKeywords.some(kw => lowerQuery.includes(kw))) {
    return 'breakthrough'
  }

  // Default to synthesis for better success rate
  return 'synthesis'
}
