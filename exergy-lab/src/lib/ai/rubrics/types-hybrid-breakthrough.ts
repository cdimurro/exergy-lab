/**
 * Hybrid Breakthrough Scoring System - Type Definitions (v0.0.3)
 *
 * CALIBRATED GATE + SCORE MODEL (based on historical breakthrough analysis)
 *
 * Scoring Architecture:
 * - Phase 1 (GATE): FrontierScience must pass all dimensions ≥60%
 * - Phase 2 (SCORE): BD dimensions weighted by breakthrough correlation (9.0 pts)
 * - Phase 3 (BONUS): FS excellence adds bonus (0-1.0 pts)
 *
 * Calibrated BD Weights (from Nobel Prize / historical breakthrough analysis):
 * - BD1 Performance: 2.0 pts (CRITICAL - 100% performance gain = paradigm shift)
 * - BD6 Trajectory:  2.0 pts (CRITICAL - new research field = breakthrough)
 * - BD4 Market:      1.5 pts (Important - new market categories)
 * - BD2 Cost:        1.0 pt  (Supporting factor)
 * - BD5 Scalability: 1.0 pt  (Supporting factor)
 * - BD7 Societal:    1.0 pt  (Supporting factor)
 * - BD3 Cross-Domain:0.5 pt  (Methodology indicator)
 *
 * Total: BD (9.0) + FS Bonus (1.0) = 10.0 pts
 *
 * 5-Tier Classification System:
 * - Breakthrough (9.0+)
 * - Scientific Discovery (8.0-8.9)
 * - General Insights (6.5-7.9)
 * - Partial Failure (5.0-6.4)
 * - Failure (<5.0)
 *
 * @see templates/hybrid-breakthrough.ts - Validation functions
 * @see hybrid-breakthrough-evaluator.ts - Evaluator class
 */

// =============================================================================
// 5-Tier Classification System
// =============================================================================

/**
 * 5-tier outcome classification system
 */
export type HybridClassificationTier =
  | 'breakthrough'           // 9.0+ - Paradigm-shifting
  | 'scientific_discovery'   // 8.0-8.9 - Novel contribution
  | 'general_insights'       // 6.5-7.9 - Useful findings
  | 'partial_failure'        // 5.0-6.4 - Some value
  | 'failure'                // <5.0 - Fundamental issues

/**
 * Classification tier configuration
 */
export interface HybridClassificationConfig {
  tier: HybridClassificationTier
  minScore: number
  maxScore: number
  label: string
  description: string
  color: {
    primary: string
    background: string
    border: string
  }
  requirements: string[]
  actions: string[]
}

/**
 * All 5 classification tier configurations
 */
export const HYBRID_CLASSIFICATION_CONFIGS: HybridClassificationConfig[] = [
  {
    tier: 'breakthrough',
    minScore: 9.0,
    maxScore: 10.0,
    label: 'Breakthrough',
    description: 'Paradigm-shifting discovery with exceptional scientific foundation',
    color: {
      primary: '#10B981',    // Emerald
      background: '#ECFDF5',
      border: '#A7F3D0'
    },
    requirements: [
      'FS1-FS5 all ≥70%',
      'BD1 (Performance) ≥80%',
      'BD6 (Trajectory) ≥80%',
      '5+ BD dimensions ≥70%'
    ],
    actions: ['Full validation + highlight', 'Generate breakthrough report', 'Priority recommendation']
  },
  {
    tier: 'scientific_discovery',
    minScore: 8.0,
    maxScore: 8.99,
    label: 'Scientific Discovery',
    description: 'Novel scientific contribution with strong foundation',
    color: {
      primary: '#3B82F6',    // Blue
      background: '#EFF6FF',
      border: '#BFDBFE'
    },
    requirements: [
      'FS1-FS5 all ≥60%',
      '4+ BD dimensions ≥70%'
    ],
    actions: ['Full validation', 'Generate scientific discovery report']
  },
  {
    tier: 'general_insights',
    minScore: 6.5,
    maxScore: 7.99,
    label: 'General Insights',
    description: 'Useful findings with potential for refinement',
    color: {
      primary: '#8B5CF6',    // Violet
      background: '#F5F3FF',
      border: '#DDD6FE'
    },
    requirements: [
      'FS phase ≥3.5/5',
      '2+ BD dimensions ≥60%'
    ],
    actions: ['Standard validation', 'Generate insights report', 'Suggest improvements']
  },
  {
    tier: 'partial_failure',
    minScore: 5.0,
    maxScore: 6.49,
    label: 'Partial Failure',
    description: 'Some valid findings but significant gaps',
    color: {
      primary: '#F59E0B',    // Amber
      background: '#FFFBEB',
      border: '#FDE68A'
    },
    requirements: [
      'FS phase ≥2.5/5'
    ],
    actions: ['Generate partial failure report', 'Identify key improvements needed']
  },
  {
    tier: 'failure',
    minScore: 0,
    maxScore: 4.99,
    label: 'Failure',
    description: 'Does not meet criteria, fundamental issues present',
    color: {
      primary: '#EF4444',    // Red
      background: '#FEF2F2',
      border: '#FECACA'
    },
    requirements: [],
    actions: ['Generate failure report', 'Explain fundamental issues']
  }
]

// =============================================================================
// CALIBRATED SCORING CONSTANTS (v0.0.3)
// Based on historical breakthrough analysis (Goodenough Li-ion, Blue LED, etc.)
// =============================================================================

/**
 * FS Gate Threshold - Minimum percentage for each FS dimension to pass
 * Hypotheses that fail the gate cannot achieve breakthrough status
 */
export const FS_GATE_THRESHOLD = 0.6  // 60% minimum for all FS dimensions

/**
 * Maximum FS Bonus points for excellent scientific foundation
 * Calculated as: (avg_fs_percentage - 0.6) / 0.4 * FS_BONUS_MAX
 */
export const FS_BONUS_MAX = 1.0

/**
 * Maximum BD score (sum of all BD dimension max points)
 * This is the primary scoring component after gate is passed
 */
export const BD_MAX_SCORE = 9.0

/**
 * Calibrated BD dimension weights based on historical breakthrough analysis
 *
 * Calibration sources:
 * - 2019 Nobel Prize (Li-ion batteries): BD1=100%, BD6=100%, BD4=100%
 * - 2014 Nobel Prize (Blue LED): BD1=100%, BD6=100%, BD7=100%
 * - Bell Labs silicon solar (1954): BD4=100%, BD6=100%
 * - LONGi 33.9% tandem (2023): BD1=100%, BD6=80%
 *
 * Key insight: BD1 (Performance) and BD6 (Trajectory) are present in 100%
 * of historical breakthroughs, making them CRITICAL dimensions.
 */
export const BD_DIMENSION_WEIGHTS: Record<string, number> = {
  bd1_performance: 2.0,    // CRITICAL - was ~0.71 (now 2.0)
  bd6_trajectory: 2.0,     // CRITICAL - was ~0.71 (now 2.0)
  bd4_market: 1.5,         // Important - was ~0.71 (now 1.5)
  bd2_cost: 1.0,           // Supporting - was ~0.71 (now 1.0)
  bd5_scalability: 1.0,    // Supporting - was ~0.71 (now 1.0)
  bd7_societal: 1.0,       // Supporting - was ~0.71 (now 1.0)
  bd3_cross_domain: 0.5,   // Methodology - unchanged
}

// =============================================================================
// FrontierScience Dimensions (Phase 1 - GATE)
// All dimensions must score ≥60% to pass the gate
// =============================================================================

/**
 * FrontierScience foundation dimensions (FS1-FS5)
 * Total: 5.0 points
 */
export type FrontierScienceDimension =
  | 'fs1_predictions'      // 1.0 pts - Falsifiable predictions
  | 'fs2_evidence'         // 1.0 pts - Supporting evidence
  | 'fs3_mechanism'        // 1.0 pts - Mechanism quality
  | 'fs4_grounding'        // 1.0 pts - Scientific grounding
  | 'fs5_methodology'      // 1.0 pts - Methodology & safety

/**
 * Configuration for FrontierScience dimensions
 */
export interface FSDimensionConfig {
  id: FrontierScienceDimension
  name: string
  shortName: string
  maxPoints: number
  description: string
  scoringCriteria: {
    threshold: number
    points: number
    label: string
  }[]
}

/**
 * All 5 FrontierScience dimension configurations
 */
export const FS_DIMENSION_CONFIGS: FSDimensionConfig[] = [
  {
    id: 'fs1_predictions',
    name: 'Falsifiable Predictions',
    shortName: 'Predictions',
    maxPoints: 1.0,
    description: 'Testable predictions with measurable outcomes',
    scoringCriteria: [
      { threshold: 80, points: 1.0, label: 'Excellent: 80%+ predictions falsifiable' },
      { threshold: 60, points: 0.75, label: 'Good: 60-80% predictions falsifiable' },
      { threshold: 40, points: 0.5, label: 'Limited: 40-60% predictions falsifiable' },
      { threshold: 0, points: 0.25, label: 'Insufficient: <40% predictions falsifiable' }
    ]
  },
  {
    id: 'fs2_evidence',
    name: 'Supporting Evidence',
    shortName: 'Evidence',
    maxPoints: 1.0,
    description: 'Grounded in research findings and literature',
    scoringCriteria: [
      { threshold: 5, points: 1.0, label: 'Excellent: 5+ high-quality citations' },
      { threshold: 3, points: 0.75, label: 'Good: 3-4 citations with relevance' },
      { threshold: 2, points: 0.5, label: 'Limited: 2 citations' },
      { threshold: 0, points: 0.25, label: 'Insufficient: 0-1 citations' }
    ]
  },
  {
    id: 'fs3_mechanism',
    name: 'Mechanism Quality',
    shortName: 'Mechanism',
    maxPoints: 1.0,
    description: 'Clear physical/chemical mechanism with steps',
    scoringCriteria: [
      { threshold: 90, points: 1.0, label: 'Excellent: Complete mechanism with 4+ steps' },
      { threshold: 70, points: 0.75, label: 'Good: Clear mechanism with 3 steps' },
      { threshold: 50, points: 0.5, label: 'Limited: Basic mechanism with 2 steps' },
      { threshold: 0, points: 0.25, label: 'Insufficient: Unclear or missing mechanism' }
    ]
  },
  {
    id: 'fs4_grounding',
    name: 'Scientific Grounding',
    shortName: 'Grounding',
    maxPoints: 1.0,
    description: 'Thermodynamic validity, materials compatibility',
    scoringCriteria: [
      { threshold: 90, points: 1.0, label: 'Excellent: All claims thermodynamically valid' },
      { threshold: 70, points: 0.75, label: 'Good: Minor uncertainties in physics' },
      { threshold: 50, points: 0.5, label: 'Limited: Some questionable claims' },
      { threshold: 0, points: 0.25, label: 'Insufficient: Violates physical limits' }
    ]
  },
  {
    id: 'fs5_methodology',
    name: 'Methodology & Safety',
    shortName: 'Methodology',
    maxPoints: 1.0,
    description: 'Reproducible approach with safety considerations',
    scoringCriteria: [
      { threshold: 90, points: 1.0, label: 'Excellent: Full methodology + safety' },
      { threshold: 70, points: 0.75, label: 'Good: Clear methodology' },
      { threshold: 50, points: 0.5, label: 'Limited: Basic methodology' },
      { threshold: 0, points: 0.25, label: 'Insufficient: Unclear methodology' }
    ]
  }
]

// =============================================================================
// Breakthrough Detection Dimensions (Phase 2 - SCORE) - 9.0 points total
// Calibrated weights based on historical breakthrough analysis
// =============================================================================

/**
 * Breakthrough detection dimensions (BD1-BD7)
 * Total: 9.0 points (calibrated from historical breakthroughs)
 */
export type BreakthroughDetectionDimension =
  | 'bd1_performance'      // 2.0 pts - CRITICAL: Performance step-change
  | 'bd2_cost'             // 1.0 pts - Cost reduction potential
  | 'bd3_cross_domain'     // 0.5 pts - Cross-domain innovation
  | 'bd4_market'           // 1.5 pts - Important: Market disruption potential
  | 'bd5_scalability'      // 1.0 pts - Scalability path
  | 'bd6_trajectory'       // 2.0 pts - CRITICAL: Knowledge trajectory shift
  | 'bd7_societal'         // 1.0 pts - Societal impact

/**
 * Configuration for Breakthrough Detection dimensions
 */
export interface BDDimensionConfig {
  id: BreakthroughDetectionDimension
  name: string
  shortName: string
  maxPoints: number
  required: boolean  // Required for breakthrough tier
  description: string
  scoringCriteria: {
    threshold: number
    points: number
    label: string
  }[]
}

/**
 * All 7 Breakthrough Detection dimension configurations
 * CALIBRATED WEIGHTS based on historical breakthrough analysis (v0.0.3)
 *
 * Total: 9.0 points (BD_MAX_SCORE)
 * Critical dimensions (BD1, BD6): 2.0 pts each
 * Important dimensions (BD4): 1.5 pts
 * Supporting dimensions (BD2, BD5, BD7): 1.0 pt each
 * Methodology dimension (BD3): 0.5 pt
 */
export const BD_DIMENSION_CONFIGS: BDDimensionConfig[] = [
  {
    id: 'bd1_performance',
    name: 'Performance Step-Change',
    shortName: 'Performance',
    maxPoints: 2.0,  // CRITICAL - doubled from 1.0
    required: true,  // Must score ≥80% for breakthrough
    description: '>25% improvement over state-of-the-art',
    scoringCriteria: [
      { threshold: 50, points: 2.0, label: 'Revolutionary: 50%+ improvement (Nobel-level)' },
      { threshold: 25, points: 1.6, label: 'Major: 25-50% improvement' },
      { threshold: 10, points: 1.2, label: 'Significant: 10-25% improvement' },
      { threshold: 5, points: 0.8, label: 'Moderate: 5-10% improvement' },
      { threshold: 0, points: 0.4, label: 'Incremental: <5% improvement' }
    ]
  },
  {
    id: 'bd2_cost',
    name: 'Cost Reduction Potential',
    shortName: 'Cost',
    maxPoints: 1.0,  // Increased from 0.75
    required: false,
    description: 'Economic viability, LCOE impact',
    scoringCriteria: [
      { threshold: 50, points: 1.0, label: 'Transformative: 50%+ cost reduction' },
      { threshold: 30, points: 0.8, label: 'Major: 30-50% reduction' },
      { threshold: 15, points: 0.6, label: 'Significant: 15-30% reduction' },
      { threshold: 0, points: 0.3, label: 'Minor/unclear cost impact' }
    ]
  },
  {
    id: 'bd3_cross_domain',
    name: 'Cross-Domain Innovation',
    shortName: 'Cross-Domain',
    maxPoints: 0.5,  // Unchanged
    required: false,
    description: 'Knowledge transfer from other fields',
    scoringCriteria: [
      { threshold: 90, points: 0.5, label: 'Novel synthesis from 2+ domains' },
      { threshold: 60, points: 0.35, label: 'Adaptation from 1 domain' },
      { threshold: 0, points: 0.15, label: 'Within-domain innovation' }
    ]
  },
  {
    id: 'bd4_market',
    name: 'Market Disruption Potential',
    shortName: 'Market',
    maxPoints: 1.5,  // Doubled from 0.75 - Important
    required: false,
    description: 'Potential to transform market (new categories)',
    scoringCriteria: [
      { threshold: 90, points: 1.5, label: 'Category-creating disruption (new industry)' },
      { threshold: 70, points: 1.2, label: 'Major market shift' },
      { threshold: 50, points: 0.9, label: 'Significant market impact' },
      { threshold: 0, points: 0.4, label: 'Incremental market change' }
    ]
  },
  {
    id: 'bd5_scalability',
    name: 'Scalability Path',
    shortName: 'Scalability',
    maxPoints: 1.0,  // Increased from 0.75
    required: false,
    description: 'Clear route to GW/TWh scale',
    scoringCriteria: [
      { threshold: 90, points: 1.0, label: 'Clear path to TW scale' },
      { threshold: 70, points: 0.8, label: 'Path to GW scale' },
      { threshold: 50, points: 0.6, label: 'MW scale feasible' },
      { threshold: 0, points: 0.3, label: 'Lab/pilot scale only' }
    ]
  },
  {
    id: 'bd6_trajectory',
    name: 'Knowledge Trajectory',
    shortName: 'Trajectory',
    maxPoints: 2.0,  // CRITICAL - doubled from 0.75
    required: true,  // Must score ≥80% for breakthrough
    description: 'Paradigm shift vs incremental improvement',
    scoringCriteria: [
      { threshold: 90, points: 2.0, label: 'Opens new research field (Nobel-level)' },
      { threshold: 70, points: 1.6, label: 'Challenges fundamental assumptions' },
      { threshold: 50, points: 1.2, label: 'New methodology/approach' },
      { threshold: 30, points: 0.8, label: 'Novel combination of existing' },
      { threshold: 0, points: 0.4, label: 'Incremental within paradigm' }
    ]
  },
  {
    id: 'bd7_societal',
    name: 'Societal Impact',
    shortName: 'Societal',
    maxPoints: 1.0,  // Doubled from 0.5
    required: false,
    description: 'Decarbonization potential, accessibility, electrification',
    scoringCriteria: [
      { threshold: 90, points: 1.0, label: 'Transformative societal impact (electrification)' },
      { threshold: 60, points: 0.7, label: 'Significant positive impact' },
      { threshold: 0, points: 0.3, label: 'Limited direct impact' }
    ]
  }
]

// =============================================================================
// Score Types
// =============================================================================

/**
 * Individual dimension score result
 */
export interface HybridDimensionScore {
  dimension: FrontierScienceDimension | BreakthroughDetectionDimension
  score: number
  maxScore: number
  percentage: number
  passed: boolean
  reasoning: string
  criteriaMatched?: string
}

/**
 * Complete hybrid breakthrough score result (v0.0.3 Gate + Score Model)
 */
export interface HybridBreakthroughScore {
  // Phase scores (Gate + Score + Bonus Model)
  frontierScienceScore: number  // 0-5 (used for gate check and bonus calculation)
  breakthroughScore: number     // 0-9 (BD_MAX_SCORE - primary scoring component)
  fsBonusScore: number          // 0-1 (FS_BONUS_MAX - bonus for excellent FS)
  overallScore: number          // 0-10 (bdScore + fsBonus)

  // Phase percentages
  fsPercentage: number          // 0-100% (used for gate check)
  bdPercentage: number          // 0-100%

  // Gate status (Phase 1)
  gateStatus: {
    passed: boolean             // All FS dimensions ≥60%
    failedDimensions: FrontierScienceDimension[]
    minFsPercentage: number     // Lowest FS dimension percentage
    avgFsPercentage: number     // Average FS percentage (for bonus calc)
  }

  // Individual dimensions
  fsDimensions: Record<FrontierScienceDimension, HybridDimensionScore>
  bdDimensions: Record<BreakthroughDetectionDimension, HybridDimensionScore>

  // Classification
  tier: HybridClassificationTier
  tierConfig: HybridClassificationConfig

  // Breakthrough requirements check (calibrated v0.0.3)
  breakthroughRequirements: {
    bd1Performance: boolean  // BD1 ≥80%
    bd6Trajectory: boolean   // BD6 ≥80%
    fsGatePassed: boolean    // All FS dims ≥60% (gate)
    bdHighCount: number      // Count of BD dims ≥70%
    meetsBreakthrough: boolean
  }

  // Scoring breakdown for debugging
  scoringBreakdown: {
    bdRawScore: number       // Sum of BD dimension scores
    bdMaxPossible: number    // BD_MAX_SCORE (9.0)
    fsBonusApplied: number   // Actual bonus added
    fsBonusMax: number       // FS_BONUS_MAX (1.0)
  }

  // Metadata
  evaluationDurationMs: number
  evaluatorVersion: string
}

/**
 * Refinement feedback based on hybrid scoring
 */
export interface HybridRefinementFeedback {
  overallScore: number
  tier: HybridClassificationTier
  overallAssessment: string

  // Phase-specific feedback
  frontierScienceFeedback: {
    score: number
    percentage: number
    strongDimensions: string[]
    weakDimensions: string[]
    improvements: string[]
  }

  breakthroughFeedback: {
    score: number
    percentage: number
    strongDimensions: string[]
    weakDimensions: string[]
    improvements: string[]
  }

  // Strategic guidance
  strategicGuidance: {
    primaryFocus: string
    secondaryFocus: string
    pathToNextTier: string
    keyBlockers: string[]
  }

  // Dimension-specific feedback
  dimensionFeedback: {
    dimension: string
    currentScore: number
    targetScore: number
    specificImprovements: string[]
  }[]
}

// =============================================================================
// Elimination Logic
// =============================================================================

/**
 * Determine if a hypothesis should be eliminated
 * Implements grace period and minimum survivor rules
 *
 * @param score - Current overall score (0-10)
 * @param iteration - Current iteration number
 * @param activeCount - Number of currently active hypotheses
 * @returns true if hypothesis should be eliminated
 */
export function shouldEliminateHybrid(
  score: number,
  iteration: number,
  activeCount: number = 15
): boolean {
  // Grace period: No elimination in iteration 1
  // Allow all hypotheses to receive refinement feedback first
  if (iteration === 1) {
    return false
  }

  // Always keep at least 3 hypotheses to ensure diversity
  if (activeCount <= 3) {
    return false
  }

  // After grace period, apply lenient thresholds
  // Iteration 2+: Eliminate below 4.0 (was 5.0)
  if (score < 4.0) {
    return true
  }

  // Iteration 3+: Be more selective
  if (iteration >= 3 && score < 5.0) {
    return true
  }

  // Iteration 4+: Eliminate below 5.5
  if (iteration >= 4 && score < 5.5) {
    return true
  }

  return false
}

/**
 * Get elimination reason string
 */
export function getEliminationReason(
  score: number,
  iteration: number,
  tier: HybridClassificationTier
): string {
  if (score < 4.0) {
    return `Score ${score.toFixed(1)}/10 below minimum threshold (4.0) - classified as ${tier}`
  }
  if (score < 5.0 && iteration >= 3) {
    return `Score ${score.toFixed(1)}/10 below iteration-3 threshold (5.0) - classified as ${tier}`
  }
  if (score < 5.5 && iteration >= 4) {
    return `Score ${score.toFixed(1)}/10 below iteration-4 threshold (5.5) - classified as ${tier}`
  }
  return `Eliminated after ${iteration} iterations with score ${score.toFixed(1)}/10`
}

// =============================================================================
// Classification Helper
// =============================================================================

/**
 * Get classification tier from score
 */
export function getClassificationTier(score: number): HybridClassificationTier {
  if (score >= 9.0) return 'breakthrough'
  if (score >= 8.0) return 'scientific_discovery'
  if (score >= 6.5) return 'general_insights'
  if (score >= 5.0) return 'partial_failure'
  return 'failure'
}

/**
 * Get tier configuration
 */
export function getTierConfig(tier: HybridClassificationTier): HybridClassificationConfig {
  const config = HYBRID_CLASSIFICATION_CONFIGS.find(c => c.tier === tier)
  if (!config) {
    throw new Error(`Unknown tier: ${tier}`)
  }
  return config
}

/**
 * Get all dimension configurations as a lookup map
 */
export function getDimensionConfigs(): {
  fs: Record<FrontierScienceDimension, FSDimensionConfig>
  bd: Record<BreakthroughDetectionDimension, BDDimensionConfig>
} {
  const fsMap = {} as Record<FrontierScienceDimension, FSDimensionConfig>
  for (const config of FS_DIMENSION_CONFIGS) {
    fsMap[config.id] = config
  }

  const bdMap = {} as Record<BreakthroughDetectionDimension, BDDimensionConfig>
  for (const config of BD_DIMENSION_CONFIGS) {
    bdMap[config.id] = config
  }

  return { fs: fsMap, bd: bdMap }
}
