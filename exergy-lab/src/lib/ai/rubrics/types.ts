/**
 * FrontierScience Rubric System Types
 *
 * Based on OpenAI's FrontierScience paper methodology.
 * Each rubric has exactly 10 points total with a 7/10 pass threshold.
 */

// ============================================================================
// Discovery Phases
// ============================================================================

export type DiscoveryPhase =
  | 'research'
  | 'synthesis'
  | 'hypothesis'
  | 'screening'
  | 'experiment'
  | 'simulation'
  | 'exergy'
  | 'tea'
  | 'patent'
  | 'validation'
  | 'rubric_eval'
  | 'publication'

export type RubricCategory =
  | 'completeness'
  | 'accuracy'
  | 'novelty'
  | 'feasibility'
  | 'methodology'
  | 'evidence'
  | 'safety'
  | 'reproducibility'
  | 'thermodynamics'
  | 'economics'

// ============================================================================
// Rubric Item Definition
// ============================================================================

export interface PartialCondition {
  condition: string
  points: number
  automatedCheck?: (response: any) => boolean
}

export interface RubricItem {
  id: string
  description: string
  points: number // Total points for this item (e.g., 1.0, 1.5, 2.0)
  category: RubricCategory
  passCondition: string
  partialConditions?: PartialCondition[]
  automatedValidation?: (response: any) => Promise<ItemScore> | ItemScore
}

export interface ItemScore {
  itemId: string
  points: number // Points earned (0 to item.points)
  maxPoints: number
  passed: boolean
  reasoning: string
  partialCredits?: { condition: string; points: number; earned: boolean }[]
}

// ============================================================================
// Rubric Definition
// ============================================================================

export interface RubricMetadata {
  version: string
  author: string
  lastUpdated: Date
  domainExpert?: string
  sourceDataset?: string // Reference to FrontierScience dataset
}

export interface Rubric {
  id: string
  name: string
  phase: DiscoveryPhase
  domain: string
  items: RubricItem[]
  totalPoints: 10 // Always exactly 10
  successThreshold: number // Default 7
  maxIterations: number
  metadata: RubricMetadata
}

// ============================================================================
// Judge Result
// ============================================================================

export interface JudgeResult {
  rubricId: string
  phase: DiscoveryPhase
  totalScore: number // 0-10
  passed: boolean // score >= successThreshold
  itemScores: ItemScore[]
  reasoning: string
  failedItems: RubricItem[]
  passedItems: RubricItem[]
  recommendations: string[]
  confidenceScore: number // 0-100, judge's confidence in grading
  iterationHint?: string // Specific guidance for next iteration
  timestamp: Date
  judgeModel: string
}

// ============================================================================
// Refinement Types
// ============================================================================

export interface RefinementHints {
  previousScore: number
  failedCriteria: {
    id: string
    description: string
    passCondition: string
    reasoning?: string
    partialCredit?: number
  }[]
  specificGuidance?: string
  recommendations: string[]
  iterationNumber: number
}

export interface RefinementIteration<T> {
  iteration: number
  output: T
  judgeResult: JudgeResult
  hints?: RefinementHints
  durationMs: number
}

export interface RefinementConfig {
  maxIterations: number
  improvementThreshold: number // Minimum score improvement to continue
  timeoutMs: number
  earlyStopOnPass: boolean
}

export const DEFAULT_REFINEMENT_CONFIG: RefinementConfig = {
  maxIterations: 3,
  improvementThreshold: 0.5, // Need at least 0.5 point improvement
  timeoutMs: 300000, // 5 minutes
  earlyStopOnPass: true,
}

export interface RefinementResult<T> {
  finalOutput: T
  finalScore: number
  iterations: RefinementIteration<T>[]
  passed: boolean
  improvementPath: number[] // Score progression
  totalDurationMs: number
  bestIteration: number
}

// ============================================================================
// Discovery Quality Classification
// ============================================================================

export type DiscoveryQuality =
  | 'breakthrough' // 9.0+ - Potential publication
  | 'significant' // 8.0-8.9 - Strong findings
  | 'validated' // 7.0-7.9 - FrontierScience threshold
  | 'promising' // 5.0-6.9 - Needs refinement
  | 'preliminary' // <5.0 - Early stage

export function classifyDiscoveryQuality(score: number): DiscoveryQuality {
  if (score >= 9.0) return 'breakthrough'
  if (score >= 8.0) return 'significant'
  if (score >= 7.0) return 'validated'
  if (score >= 5.0) return 'promising'
  return 'preliminary'
}

export function getQualityDescription(quality: DiscoveryQuality): string {
  const descriptions: Record<DiscoveryQuality, string> = {
    breakthrough: 'Potential for publication, novel contribution to the field',
    significant: 'Strong findings with minor gaps, high quality work',
    validated: 'Meets FrontierScience threshold, solid scientific work',
    promising: 'Good foundation but needs iteration and refinement',
    preliminary: 'Early stage work with significant gaps',
  }
  return descriptions[quality]
}

// ============================================================================
// Phase Result Types
// ============================================================================

export interface PhaseResult<T = any> {
  phase: DiscoveryPhase
  finalOutput: T
  finalScore: number
  passed: boolean
  iterations: RefinementIteration<T>[]
  durationMs: number
}

export interface DiscoveryResult {
  id: string
  query: string
  domain: string
  phases: PhaseResult[]
  overallScore: number
  discoveryQuality: DiscoveryQuality
  recommendations: string[]
  publication?: PublicationPackage
  startTime: Date
  endTime: Date
  totalDurationMs: number
}

export interface PublicationPackage {
  title: string
  abstract: string
  introduction: string
  methodology: string
  results: string
  discussion: string
  conclusion: string
  references: Citation[]
  figures?: Figure[]
  tables?: DataTable[]
  supplementaryMaterials?: string
}

export interface Citation {
  id: string
  type: 'paper' | 'patent' | 'dataset' | 'website'
  title: string
  authors: string[]
  year: number
  source: string
  doi?: string
  url?: string
  bibtex?: string
}

export interface Figure {
  id: string
  caption: string
  data: any
  chartType: 'line' | 'bar' | 'scatter' | 'heatmap' | 'diagram'
}

export interface DataTable {
  id: string
  caption: string
  headers: string[]
  rows: (string | number)[][]
}

// ============================================================================
// Validation Helpers
// ============================================================================

export function validateRubric(rubric: Rubric): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check total points sum to 10
  const totalPoints = rubric.items.reduce((sum, item) => sum + item.points, 0)
  if (Math.abs(totalPoints - 10) > 0.001) {
    errors.push(`Rubric points sum to ${totalPoints}, must equal exactly 10`)
  }

  // Check all items have unique IDs
  const ids = new Set<string>()
  for (const item of rubric.items) {
    if (ids.has(item.id)) {
      errors.push(`Duplicate item ID: ${item.id}`)
    }
    ids.add(item.id)
  }

  // Check partial conditions sum correctly
  for (const item of rubric.items) {
    if (item.partialConditions) {
      const partialSum = item.partialConditions.reduce((sum, p) => sum + p.points, 0)
      if (Math.abs(partialSum - item.points) > 0.001) {
        errors.push(`Item ${item.id}: partial conditions sum to ${partialSum}, should be ${item.points}`)
      }
    }
  }

  // Check threshold is reasonable
  if (rubric.successThreshold < 0 || rubric.successThreshold > 10) {
    errors.push(`Success threshold ${rubric.successThreshold} out of range [0, 10]`)
  }

  return { valid: errors.length === 0, errors }
}

export function calculateOverallScore(phaseResults: PhaseResult[]): number {
  if (phaseResults.length === 0) return 0

  // Weighted average with critical phases weighted higher
  const weights: Partial<Record<DiscoveryPhase, number>> = {
    research: 1.0,
    synthesis: 0.8,
    hypothesis: 1.5, // Critical phase
    screening: 0.8,
    experiment: 1.2,
    simulation: 1.5, // Critical phase
    exergy: 1.0,
    tea: 1.0,
    patent: 0.7,
    validation: 1.3, // Critical phase
  }

  let weightedSum = 0
  let totalWeight = 0

  for (const result of phaseResults) {
    const weight = weights[result.phase] ?? 1.0
    weightedSum += result.finalScore * weight
    totalWeight += weight
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0
}
