/**
 * Breakthrough Engine v0.0.2 - Type Definitions
 *
 * 6-tier classification system for scientific breakthroughs in clean energy
 * Aligned with FrontierScience paper (9.0+ = Breakthrough)
 */

// =============================================================================
// Classification Tiers
// =============================================================================

/**
 * 5-tier outcome classification system (v0.1.0)
 * Aligned with Hybrid FrontierScience + Breakthrough scoring
 * Each tier has specific score ranges and visual styling
 *
 * NOTE: The old 6-tier system has been consolidated:
 * - partial_breakthrough + major_discovery → scientific_discovery
 * - significant_discovery → general_insights
 */
export type ClassificationTier =
  | 'breakthrough'           // 9.0+ - Paradigm-shifting, publication-ready
  | 'scientific_discovery'   // 8.0-8.9 - Novel scientific contribution
  | 'general_insights'       // 6.5-7.9 - Useful findings with potential
  | 'partial_failure'        // 5.0-6.4 - Some valid findings, major gaps
  | 'failure'                // <5.0 - Does not meet criteria

/**
 * Classification configuration with thresholds and colors
 */
export interface ClassificationConfig {
  tier: ClassificationTier
  minScore: number
  maxScore: number
  label: string
  description: string
  color: {
    primary: string      // Main color
    background: string   // Light background
    border: string       // Border color
  }
  requirements: string[]
  actions: string[]      // What happens at this tier
}

/**
 * All 5 classification tiers with their configurations (v0.1.0)
 * Updated to align with Hybrid FrontierScience + Breakthrough scoring
 */
export const CLASSIFICATION_CONFIGS: ClassificationConfig[] = [
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
    description: 'Some valid findings but significant gaps remain',
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
// 12 Breakthrough Dimensions
// =============================================================================

/**
 * The 12 breakthrough dimensions (BC1-BC12)
 * Total: 10 points (normalized)
 * - Impact Dimensions (BC1-BC8): 8.0 points
 * - Feasibility Dimensions (BC9-BC12): 2.0 points
 * BC1 (Performance) and BC8 (Knowledge Trajectory) are REQUIRED for breakthrough
 */
export type BreakthroughDimension =
  // Impact Dimensions (8.0 points total)
  | 'bc1_performance'       // 1.2 pts - Efficiency improvement vs SOTA
  | 'bc2_cost'              // 1.2 pts - LCOE, CAPEX, OPEX improvements
  | 'bc3_capabilities'      // 0.8 pts - New functions not previously possible
  | 'bc4_applications'      // 0.8 pts - Cross-domain potential, market expansion
  | 'bc5_societal'          // 0.8 pts - Decarbonization, accessibility
  | 'bc6_scale'             // 1.2 pts - Market size, deployment potential
  | 'bc7_problem_solving'   // 0.8 pts - Addressing unsolved challenges
  | 'bc8_trajectory'        // 1.2 pts - Paradigm shift vs incremental
  // Feasibility Dimensions (2.0 points total)
  | 'bc9_feasibility'       // 0.5 pts - Technical feasibility, TRL level
  | 'bc10_literature'       // 0.5 pts - Peer-reviewed support, literature alignment
  | 'bc11_infrastructure'   // 0.5 pts - Manufacturing compatibility, deployment paths
  | 'bc12_capital'          // 0.5 pts - Investment needs, funding accessibility

/**
 * Configuration for each dimension
 */
export interface DimensionConfig {
  id: BreakthroughDimension
  name: string
  shortName: string
  maxPoints: number
  required: boolean          // Must pass for breakthrough tier
  description: string
  scoringCriteria: {
    threshold: number        // Percentage threshold
    points: number           // Points awarded
    label: string            // e.g., "Revolutionary", "Major"
  }[]
}

/**
 * All 12 dimension configurations (normalized to 10 points total)
 * - Impact Dimensions (BC1-BC8): 8.0 points (scaled by 0.8 from original)
 * - Feasibility Dimensions (BC9-BC12): 2.0 points (new)
 */
export const DIMENSION_CONFIGS: DimensionConfig[] = [
  // =========================================================================
  // Impact Dimensions (BC1-BC8) - 8.0 points total
  // =========================================================================
  {
    id: 'bc1_performance',
    name: 'Performance Gains',
    shortName: 'Performance',
    maxPoints: 1.2,  // Scaled from 1.5
    required: true,
    description: 'Efficiency improvement vs state-of-the-art',
    scoringCriteria: [
      { threshold: 50, points: 1.2, label: 'Revolutionary (50%+)' },
      { threshold: 25, points: 0.96, label: 'Major (25-50%)' },
      { threshold: 10, points: 0.72, label: 'Significant (10-25%)' },
      { threshold: 5, points: 0.48, label: 'Moderate (5-10%)' },
      { threshold: 0, points: 0.24, label: 'Incremental (<5%)' }
    ]
  },
  {
    id: 'bc2_cost',
    name: 'Cost Reductions',
    shortName: 'Cost',
    maxPoints: 1.2,  // Scaled from 1.5
    required: false,
    description: 'LCOE, CAPEX, OPEX improvements',
    scoringCriteria: [
      { threshold: 50, points: 1.2, label: 'Transformative (50%+)' },
      { threshold: 30, points: 0.96, label: 'Major (30-50%)' },
      { threshold: 15, points: 0.72, label: 'Significant (15-30%)' },
      { threshold: 5, points: 0.48, label: 'Moderate (5-15%)' },
      { threshold: 0, points: 0.24, label: 'Marginal (<5%)' }
    ]
  },
  {
    id: 'bc3_capabilities',
    name: 'Advanced Capabilities',
    shortName: 'Capabilities',
    maxPoints: 0.8,  // Scaled from 1.0
    required: false,
    description: 'New functions not previously possible',
    scoringCriteria: [
      { threshold: 90, points: 0.8, label: 'Entirely new capability' },
      { threshold: 70, points: 0.64, label: 'Significant enhancement' },
      { threshold: 50, points: 0.48, label: 'Moderate enhancement' },
      { threshold: 30, points: 0.32, label: 'Minor enhancement' },
      { threshold: 0, points: 0.16, label: 'Incremental improvement' }
    ]
  },
  {
    id: 'bc4_applications',
    name: 'New Applications',
    shortName: 'Applications',
    maxPoints: 0.8,  // Scaled from 1.0
    required: false,
    description: 'Cross-domain potential, market expansion',
    scoringCriteria: [
      { threshold: 90, points: 0.8, label: 'Multiple new domains (3+)' },
      { threshold: 70, points: 0.64, label: 'Two new domains' },
      { threshold: 50, points: 0.48, label: 'One new domain' },
      { threshold: 30, points: 0.32, label: 'Enhanced existing applications' },
      { threshold: 0, points: 0.16, label: 'Same application scope' }
    ]
  },
  {
    id: 'bc5_societal',
    name: 'Societal Impact',
    shortName: 'Societal',
    maxPoints: 0.8,  // Scaled from 1.0
    required: false,
    description: 'Decarbonization potential, accessibility',
    scoringCriteria: [
      { threshold: 90, points: 0.8, label: 'Transformative societal impact' },
      { threshold: 70, points: 0.64, label: 'Major positive impact' },
      { threshold: 50, points: 0.48, label: 'Significant impact' },
      { threshold: 30, points: 0.32, label: 'Moderate impact' },
      { threshold: 0, points: 0.16, label: 'Limited impact' }
    ]
  },
  {
    id: 'bc6_scale',
    name: 'Opportunity Scale',
    shortName: 'Scale',
    maxPoints: 1.2,  // Scaled from 1.5
    required: false,
    description: 'Market size, deployment potential',
    scoringCriteria: [
      { threshold: 90, points: 1.2, label: 'Global scale (100B+ market)' },
      { threshold: 70, points: 0.96, label: 'Major market (10-100B)' },
      { threshold: 50, points: 0.72, label: 'Significant market (1-10B)' },
      { threshold: 30, points: 0.48, label: 'Moderate market (100M-1B)' },
      { threshold: 0, points: 0.24, label: 'Niche market (<100M)' }
    ]
  },
  {
    id: 'bc7_problem_solving',
    name: 'Problem-Solving',
    shortName: 'Problem',
    maxPoints: 0.8,  // Scaled from 1.0
    required: false,
    description: 'Addressing unsolved challenges',
    scoringCriteria: [
      { threshold: 90, points: 0.8, label: 'Solves fundamental unsolved problem' },
      { threshold: 70, points: 0.64, label: 'Major contribution to unsolved problem' },
      { threshold: 50, points: 0.48, label: 'Significant progress on challenge' },
      { threshold: 30, points: 0.32, label: 'Partial solution' },
      { threshold: 0, points: 0.16, label: 'Incremental progress' }
    ]
  },
  {
    id: 'bc8_trajectory',
    name: 'Knowledge Trajectory',
    shortName: 'Trajectory',
    maxPoints: 1.2,  // Scaled from 1.5
    required: true,
    description: 'Paradigm shift vs incremental improvement',
    scoringCriteria: [
      { threshold: 90, points: 1.2, label: 'Opens new research field' },
      { threshold: 70, points: 0.96, label: 'Challenges fundamental assumptions' },
      { threshold: 50, points: 0.72, label: 'New methodology or approach' },
      { threshold: 30, points: 0.48, label: 'Novel combination of existing' },
      { threshold: 0, points: 0.24, label: 'Incremental within paradigm' }
    ]
  },
  // =========================================================================
  // Feasibility Dimensions (BC9-BC12) - 2.0 points total
  // =========================================================================
  {
    id: 'bc9_feasibility',
    name: 'Technical Feasibility',
    shortName: 'Feasibility',
    maxPoints: 0.5,
    required: false,
    description: 'Engineering readiness and implementation practicality',
    scoringCriteria: [
      { threshold: 90, points: 0.5, label: 'TRL 7-9: System ready for deployment' },
      { threshold: 70, points: 0.4, label: 'TRL 5-6: Technology validated' },
      { threshold: 50, points: 0.3, label: 'TRL 3-4: Proof of concept' },
      { threshold: 30, points: 0.2, label: 'TRL 1-2: Basic principles observed' },
      { threshold: 0, points: 0.1, label: 'Theoretical only' }
    ]
  },
  {
    id: 'bc10_literature',
    name: 'Existing Literature',
    shortName: 'Literature',
    maxPoints: 0.5,
    required: false,
    description: 'Alignment with established research and peer-reviewed support',
    scoringCriteria: [
      { threshold: 90, points: 0.5, label: 'Strong peer-reviewed foundation, extends SOTA' },
      { threshold: 70, points: 0.4, label: 'Good literature support, some novel elements' },
      { threshold: 50, points: 0.3, label: 'Moderate support, significant gaps' },
      { threshold: 30, points: 0.2, label: 'Limited supporting literature' },
      { threshold: 0, points: 0.1, label: 'No prior literature, high risk' }
    ]
  },
  {
    id: 'bc11_infrastructure',
    name: 'Existing Infrastructure',
    shortName: 'Infrastructure',
    maxPoints: 0.5,
    required: false,
    description: 'Compatibility with current manufacturing and deployment systems',
    scoringCriteria: [
      { threshold: 90, points: 0.5, label: 'Drop-in compatible with existing systems' },
      { threshold: 70, points: 0.4, label: 'Minor modifications needed' },
      { threshold: 50, points: 0.3, label: 'Moderate infrastructure changes' },
      { threshold: 30, points: 0.2, label: 'Significant new infrastructure required' },
      { threshold: 0, points: 0.1, label: 'Entirely new infrastructure needed' }
    ]
  },
  {
    id: 'bc12_capital',
    name: 'Capital Requirements',
    shortName: 'Capital',
    maxPoints: 0.5,
    required: false,
    description: 'Investment needs and funding accessibility',
    scoringCriteria: [
      { threshold: 90, points: 0.5, label: '<$1M, easily fundable' },
      { threshold: 70, points: 0.4, label: '$1-10M, standard VC range' },
      { threshold: 50, points: 0.3, label: '$10-100M, requires strategic partners' },
      { threshold: 30, points: 0.2, label: '$100M-1B, major capital needed' },
      { threshold: 0, points: 0.1, label: '>$1B, government/multinational scale' }
    ]
  }
]

// =============================================================================
// Scoring Types
// =============================================================================

/**
 * Score for a single dimension
 */
export interface DimensionScore {
  dimension: BreakthroughDimension
  score: number              // 0-100 percentage
  points: number             // Weighted points (0 to maxPoints)
  maxPoints: number          // Maximum possible points
  percentOfMax: number       // points / maxPoints as percentage
  evidence: string[]         // Supporting evidence
  gaps: string[]             // Identified weaknesses
  label: string              // Scoring label (e.g., "Revolutionary")
}

/**
 * Complete evaluation result for a hypothesis
 */
export interface BreakthroughEvaluationResult {
  hypothesisId: string
  agentSource: string        // Which HypGen agent created this
  iteration: number          // Which refinement iteration
  timestamp: number

  // Dimension scores (12 dimensions total)
  dimensions: {
    // Impact Dimensions (BC1-BC8)
    bc1_performance: DimensionScore
    bc2_cost: DimensionScore
    bc3_capabilities: DimensionScore
    bc4_applications: DimensionScore
    bc5_societal: DimensionScore
    bc6_scale: DimensionScore
    bc7_problem_solving: DimensionScore
    bc8_trajectory: DimensionScore
    // Feasibility Dimensions (BC9-BC12)
    bc9_feasibility: DimensionScore
    bc10_literature: DimensionScore
    bc11_infrastructure: DimensionScore
    bc12_capital: DimensionScore
  }

  // Feasibility assessment (BC9-BC12 combined)
  feasibilityScore: number       // 0-2.0 scale
  feasibilityPercentage: number  // 0-100%
  feasibilityConfidence: 'high' | 'medium' | 'low'

  // Aggregate metrics
  totalScore: number         // 0-10 scale
  totalPercentage: number    // 0-100%

  // Classification
  classification: ClassificationTier
  classificationLabel: string
  classificationColor: string

  // Required dimensions check
  requiredDimensionsPassed: boolean
  requiredDimensionsStatus: {
    bc1_performance: { passed: boolean; score: number }
    bc8_trajectory: { passed: boolean; score: number }
  }

  // Analysis
  dimensionsAbove80: number  // Count of dimensions ≥80%
  dimensionsAbove75: number  // Count of dimensions ≥75%
  dimensionsAbove70: number  // Count of dimensions ≥70%

  weakestDimensions: BreakthroughDimension[]  // Top 3 lowest
  strongestDimensions: BreakthroughDimension[] // Top 3 highest

  // Score trajectory (for refinement loop)
  previousScore?: number
  scoreDelta?: number        // Change from previous iteration
  trending: 'improving' | 'declining' | 'stable' | 'first'
}

// =============================================================================
// Report Types
// =============================================================================

/**
 * AI-generated report for a breakthrough evaluation
 */
export interface BreakthroughReport {
  id: string
  hypothesisId: string
  generatedAt: number

  // Classification
  classification: ClassificationTier
  score: number

  // Executive summary
  executiveSummary: string   // 2-3 sentences

  // Hypothesis details
  hypothesisSummary: {
    title: string
    innovation: string
    mechanism: string
    domain: string
  }

  // Score breakdown
  scoreBreakdown: DimensionScore[]

  // Validation results (populated after validation phase)
  validationResults?: {
    physicsCheck: {
      passed: boolean
      violations: string[]
      benchmarks: string[]
    }
    economicAnalysis: {
      lcoe: number
      npv: number
      irr: number
      paybackYears: number
      competitive: boolean
    }
    patentLandscape: {
      noveltyScore: number
      relatedPatents: number
      ftoStatus: string
    }
    simulationResults: {
      converged: boolean
      confidenceInterval: [number, number]
      keyMetrics: Record<string, number>
    }
  }

  // Analysis
  strengths: string[]        // Top 3 strongest areas
  weaknesses: string[]       // Top 3 areas needing improvement
  recommendations: string[]  // Actionable next steps
  competitorAnalysis: string // How this compares to prior art
  timelineToImpact: string   // Estimated path to deployment

  // Iteration history (for refinement loop)
  iterationHistory?: {
    iteration: number
    score: number
    improvements: string[]
  }[]
}

// =============================================================================
// Refinement Types
// =============================================================================

/**
 * Feedback from Enhanced Refinement Agent
 */
export interface RefinementFeedback {
  targetAgent: string        // HypGen agent to receive feedback
  hypothesisId: string
  iteration: number
  timestamp: number

  // Overall assessment
  overallAssessment: string
  currentScore: number
  targetScore: number

  // Per-dimension feedback
  dimensionFeedback: {
    dimension: BreakthroughDimension
    currentScore: number
    targetScore: number
    specificImprovements: string[]  // Concrete suggestions
    researchPointers: string[]      // Papers, data sources
    exampleStrategies: string[]     // How other breakthroughs achieved this
  }[]

  // Strategic guidance
  strategicGuidance: {
    primaryFocus: string            // Most impactful improvement area
    quickWins: string[]             // Easy improvements for fast gains
    deepDiveAreas: string[]         // Requires more research
    synergies: string[]             // How improvements can compound
  }

  // Competitive insight
  competitiveInsight: {
    leadingHypotheses: string[]     // What's working for top performers
    differentiationOpportunities: string[]
  }

  // Priority level
  priority: 'critical' | 'high' | 'normal' | 'low'
}

// =============================================================================
// Hypothesis Racing Types
// =============================================================================

/**
 * Status of a hypothesis in the racing arena
 */
export type HypothesisRaceStatus =
  | 'active'           // Still in the race
  | 'eliminated'       // Score dropped below threshold
  | 'breakthrough'     // Flagged as potential breakthrough (9.0+)
  | 'promising'        // Flagged as promising (8.0-8.9)
  | 'winner'           // Selected as top 3 for validation

/**
 * Hypothesis in the racing arena
 */
export interface RacingHypothesis {
  id: string
  agentSource: string
  title: string
  description: string
  createdAt: number

  // Racing status
  status: HypothesisRaceStatus
  currentScore: number
  currentIteration: number

  // Score history
  scoreHistory: {
    iteration: number
    score: number
    delta: number
    timestamp: number
  }[]

  // Latest evaluation
  latestEvaluation?: BreakthroughEvaluationResult

  // Ranking
  rank: number
  percentile: number
}

/**
 * Race leaderboard state
 */
export interface RaceLeaderboard {
  hypotheses: RacingHypothesis[]
  currentIteration: number
  maxIterations: number
  activeCount: number
  eliminatedCount: number
  breakthroughCandidates: string[]  // Hypothesis IDs
  promisingCandidates: string[]     // Hypothesis IDs
  topThree: string[]                // Hypothesis IDs for validation
}

/**
 * Race result after all iterations complete
 */
export interface RaceResult {
  winners: RacingHypothesis[]       // Top 3
  eliminated: RacingHypothesis[]    // All eliminated
  breakthroughsFound: RacingHypothesis[]
  totalIterations: number
  totalHypothesesGenerated: number
  averageFinalScore: number
  highestScore: number
  lowestSurvivingScore: number
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get classification tier from score (5-tier system)
 */
export function getClassificationFromScore(score: number): ClassificationTier {
  if (score >= 9.0) return 'breakthrough'
  if (score >= 8.0) return 'scientific_discovery'
  if (score >= 6.5) return 'general_insights'
  if (score >= 5.0) return 'partial_failure'
  return 'failure'
}

/**
 * Get classification config from tier
 */
export function getClassificationConfig(tier: ClassificationTier): ClassificationConfig {
  return CLASSIFICATION_CONFIGS.find(c => c.tier === tier) || CLASSIFICATION_CONFIGS[5]
}

/**
 * Get dimension config
 */
export function getDimensionConfig(dimension: BreakthroughDimension): DimensionConfig {
  return DIMENSION_CONFIGS.find(d => d.id === dimension)!
}

/**
 * Calculate total score from dimension scores
 */
export function calculateTotalScore(dimensions: Record<BreakthroughDimension, DimensionScore>): number {
  return Object.values(dimensions).reduce((sum, d) => sum + d.points, 0)
}

/**
 * Check if required dimensions pass threshold
 */
export function checkRequiredDimensions(
  dimensions: Record<BreakthroughDimension, DimensionScore>,
  threshold: number = 70
): boolean {
  const bc1 = dimensions.bc1_performance
  const bc8 = dimensions.bc8_trajectory
  return bc1.score >= threshold && bc8.score >= threshold
}

/**
 * Count dimensions above threshold
 */
export function countDimensionsAboveThreshold(
  dimensions: Record<BreakthroughDimension, DimensionScore>,
  threshold: number
): number {
  return Object.values(dimensions).filter(d => d.score >= threshold).length
}

/**
 * Get color for score value (aligned with 5-tier system)
 */
export function getScoreColor(score: number): string {
  if (score >= 9.0) return '#10B981' // Emerald - Breakthrough
  if (score >= 8.0) return '#3B82F6' // Blue - Scientific Discovery
  if (score >= 6.5) return '#8B5CF6' // Violet - General Insights
  if (score >= 5.0) return '#F59E0B' // Amber - Partial Failure
  return '#EF4444' // Red - Failure
}

/**
 * Determine if hypothesis should be eliminated (v0.1.0)
 *
 * Implements grace period + minimum survivor rules:
 * - Iteration 1: No elimination (grace period for refinement feedback)
 * - Always keep at least 3 hypotheses for diversity
 * - Lowered threshold from 5.0 to 4.0 for iteration 2+
 * - Progressive thresholds for later iterations
 *
 * @param score - Current overall score (0-10)
 * @param iteration - Current iteration number
 * @param activeCount - Number of currently active hypotheses (default: 15)
 * @returns true if hypothesis should be eliminated
 */
export function shouldEliminate(
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
 * Determine if hypothesis is a breakthrough candidate
 */
export function isBreakthroughCandidate(score: number): boolean {
  return score >= 9.0
}

/**
 * Determine if hypothesis is promising
 */
export function isPromising(score: number): boolean {
  return score >= 8.0 && score < 9.0
}

/**
 * Calculate feasibility score from BC9-BC12 dimensions
 */
export function calculateFeasibilityScore(dimensions: Record<BreakthroughDimension, DimensionScore>): number {
  return (
    dimensions.bc9_feasibility.points +
    dimensions.bc10_literature.points +
    dimensions.bc11_infrastructure.points +
    dimensions.bc12_capital.points
  )
}

/**
 * Get feasibility confidence level based on feasibility score
 */
export function getFeasibilityConfidence(feasibilityScore: number): 'high' | 'medium' | 'low' {
  const maxFeasibility = 2.0
  const percentage = (feasibilityScore / maxFeasibility) * 100
  if (percentage >= 70) return 'high'
  if (percentage >= 50) return 'medium'
  return 'low'
}

/**
 * Check if hypothesis has clear implementation path (feasibility >= 70%)
 */
export function hasImplementationPath(feasibilityScore: number): boolean {
  return (feasibilityScore / 2.0) * 100 >= 70
}

/**
 * Check if hypothesis is ready for academic peer review (feasibility >= 60%)
 */
export function isAcademicReady(feasibilityScore: number): boolean {
  return (feasibilityScore / 2.0) * 100 >= 60
}

/**
 * Get all impact dimension IDs (BC1-BC8)
 */
export const IMPACT_DIMENSIONS: BreakthroughDimension[] = [
  'bc1_performance',
  'bc2_cost',
  'bc3_capabilities',
  'bc4_applications',
  'bc5_societal',
  'bc6_scale',
  'bc7_problem_solving',
  'bc8_trajectory',
]

/**
 * Get all feasibility dimension IDs (BC9-BC12)
 */
export const FEASIBILITY_DIMENSIONS: BreakthroughDimension[] = [
  'bc9_feasibility',
  'bc10_literature',
  'bc11_infrastructure',
  'bc12_capital',
]

/**
 * Get all dimension IDs (BC1-BC12)
 */
export const ALL_DIMENSIONS: BreakthroughDimension[] = [
  ...IMPACT_DIMENSIONS,
  ...FEASIBILITY_DIMENSIONS,
]
