/**
 * Multi-Benchmark Validation System Types
 *
 * Provides a comprehensive validation framework with 5 complementary benchmarks:
 * - FrontierScience (existing rubric system)
 * - Domain-specific (physics/chemistry/engineering checks)
 * - Practicality (real-world feasibility)
 * - Literature (consistency with published research)
 * - Simulation Convergence (numerical validation)
 *
 * Features confidence-weighted aggregation per Grok feedback.
 */

import type { DiscoveryPhase } from '../rubrics/types'

// ============================================================================
// Benchmark Types
// ============================================================================

export type BenchmarkType =
  | 'frontierscience'         // Existing rubric system
  | 'domain_specific'         // Physics/chemistry/engineering checks
  | 'practicality'            // Real-world feasibility
  | 'literature'              // Consistency with published research
  | 'simulation_convergence'  // Did Tier 2/3 sims converge?

export type BenchmarkCategory =
  | 'accuracy'
  | 'completeness'
  | 'feasibility'
  | 'novelty'
  | 'reproducibility'

// ============================================================================
// Benchmark Results
// ============================================================================

export interface BenchmarkItemResult {
  id: string
  name: string
  score: number
  maxScore: number
  passed: boolean
  reasoning: string
  evidence?: string[]
  suggestions?: string[]
}

export interface BenchmarkResult {
  benchmarkType: BenchmarkType
  score: number             // 0-10 scale (normalized)
  maxScore: number          // Always 10 for normalized scores
  passed: boolean
  weight: number            // Base weight for aggregation (0-1)
  confidence: number        // Assessment confidence (0-1), affects effective weight
  items: BenchmarkItemResult[]
  metadata: BenchmarkMetadata
}

export interface BenchmarkMetadata {
  evaluationTimeMs: number
  modelUsed?: string
  version: string
  checksRun: number
  checksSkipped?: number
}

// ============================================================================
// Aggregated Validation
// ============================================================================

export interface AggregatedValidation {
  overallScore: number            // Confidence-weighted average (0-10)
  overallPassed: boolean          // score >= 7.0
  benchmarks: BenchmarkResult[]
  agreementLevel: AgreementLevel
  discrepancies: Discrepancy[]
  recommendations: ValidationRecommendation[]
  confidenceBreakdown: ConfidenceBreakdown[]
}

export type AgreementLevel = 'high' | 'moderate' | 'low'

export interface Discrepancy {
  benchmarks: [BenchmarkType, BenchmarkType]
  item: string
  scores: [number, number]
  scoreDifference: number
  possibleCause: string
}

export interface ConfidenceBreakdown {
  benchmark: BenchmarkType
  baseWeight: number
  confidence: number
  effectiveWeight: number   // baseWeight * confidence
}

export interface ValidationRecommendation {
  priority: 'high' | 'medium' | 'low'
  category: BenchmarkCategory
  issue: string
  suggestion: string
  relatedBenchmarks: BenchmarkType[]
  relatedItems?: string[]
}

// ============================================================================
// Default Weights (per Grok feedback)
// ============================================================================

export const DEFAULT_BENCHMARK_WEIGHTS: Record<BenchmarkType, number> = {
  frontierscience: 0.30,        // Important but not dominant
  domain_specific: 0.25,        // Physical limits critical for clean energy
  practicality: 0.20,           // Real-world feasibility matters
  literature: 0.15,             // Solid baseline
  simulation_convergence: 0.10, // Prevents nonsense from bad sims
}

// ============================================================================
// Domain-Specific Benchmark Types
// ============================================================================

export interface PhysicalLimit {
  name: string
  value: number
  unit: string
  formula?: string
  context?: string
}

export interface DomainBenchmarks {
  energy: {
    carnot: PhysicalLimit
    shockleyQueisser: PhysicalLimit
    betz: PhysicalLimit
    landauer?: PhysicalLimit
  }
  materials: {
    maxTensileStrength: PhysicalLimit
    maxThermalConductivity: PhysicalLimit
    maxElectricalConductivity?: PhysicalLimit
  }
  kinetics: {
    diffusionLimit: PhysicalLimit
  }
  storage: {
    gravimetricEnergyMax: PhysicalLimit
    volumetricEnergyMax?: PhysicalLimit
  }
  battery: {
    liIonGravimetric: PhysicalLimit
    liSGravimetric: PhysicalLimit
    solidStateMax: PhysicalLimit
    cycleLifeMax: PhysicalLimit
  }
  electrolyzer: {
    minThermodynamicVoltage: PhysicalLimit
    practicalOverpotential: PhysicalLimit
    alkalineEfficiency: PhysicalLimit
    pemEfficiency: PhysicalLimit
    soecEfficiency: PhysicalLimit
  }
}

export interface ThermodynamicViolation {
  type: string
  claimed: number
  limit: number
  unit: string
  severity: 'minor' | 'major' | 'critical'
  description: string
}

// ============================================================================
// Practicality Benchmark Types
// ============================================================================

export type TechnologyReadinessLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export interface ScalabilityFactors {
  precursorAbundance: { score: number; reason: string }
  synthesisComplexity: { score: number; reason: string }
  equipmentAvailability: { score: number; reason: string }
  energyRequirements: { score: number; reason: string }
}

export interface CriticalMaterial {
  name: string
  supplyRisk: 'low' | 'medium' | 'high' | 'critical'
  alternatives?: string[]
}

export const CRITICAL_MATERIALS: CriticalMaterial[] = [
  { name: 'cobalt', supplyRisk: 'high', alternatives: ['iron', 'manganese'] },
  { name: 'lithium', supplyRisk: 'medium', alternatives: ['sodium'] },
  { name: 'neodymium', supplyRisk: 'critical' },
  { name: 'dysprosium', supplyRisk: 'critical' },
  { name: 'platinum', supplyRisk: 'high', alternatives: ['nickel', 'iron'] },
  { name: 'iridium', supplyRisk: 'critical' },
  { name: 'ruthenium', supplyRisk: 'high' },
]

// ============================================================================
// Literature Benchmark Types
// ============================================================================

export interface SourceRecency {
  totalSources: number
  recentSources: number       // From 2020+
  recentRatio: number         // 0-1
  hasRecencyBias: boolean     // True if <30% recent
}

export interface LiteratureSource {
  id: string
  type: 'paper' | 'patent' | 'report' | 'dataset' | 'website'
  title: string
  year?: number
  publicationYear?: number
  date?: string
  peerReviewed?: boolean
  citationCount?: number
  doi?: string
  authors?: string[]
}

// ============================================================================
// Simulation Convergence Types
// ============================================================================

export interface ConvergenceThresholds {
  mass: number      // e.g., 1e-4
  energy: number    // e.g., 1e-4
  momentum: number  // e.g., 1e-3
}

export interface SimulationResiduals {
  mass?: number
  energy?: number
  momentum?: number
  species?: number
  [key: string]: number | undefined
}

export interface ConvergenceResult {
  converged: boolean
  residuals: SimulationResiduals
  violations: string[]
  iterationCount: number
  maxIterations: number
  hasNumericalIssues: boolean
  energyBalanceError?: number
  massBalanceError?: number
}

// ============================================================================
// Validation Config
// ============================================================================

export interface MultiBenchmarkConfig {
  enabledBenchmarks: BenchmarkType[]
  weights?: Partial<Record<BenchmarkType, number>>
  parallelExecution: boolean
  failOnAnyBenchmark: boolean       // If true, all benchmarks must pass
  confidenceWeighting: boolean      // If true, use confidence-weighted aggregation
  minConfidence: number             // Minimum confidence to include benchmark (0-1)
}

export const DEFAULT_MULTI_BENCHMARK_CONFIG: MultiBenchmarkConfig = {
  enabledBenchmarks: [
    'frontierscience',
    'domain_specific',
    'practicality',
    'literature',
    'simulation_convergence',
  ],
  parallelExecution: true,
  failOnAnyBenchmark: false,
  confidenceWeighting: true,
  minConfidence: 0.3,
}

// ============================================================================
// Helper Functions
// ============================================================================

export function calculateAgreementLevel(benchmarks: BenchmarkResult[]): AgreementLevel {
  if (benchmarks.length < 2) return 'high'

  // Calculate normalized scores
  const normalizedScores = benchmarks.map(b => b.score / b.maxScore)

  // Calculate variance
  const mean = normalizedScores.reduce((a, b) => a + b, 0) / normalizedScores.length
  const variance = normalizedScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / normalizedScores.length

  if (variance < 0.05) return 'high'      // Very low variance
  if (variance < 0.15) return 'moderate'   // Moderate variance
  return 'low'                             // High variance
}

export function findDiscrepancies(
  benchmarks: BenchmarkResult[],
  threshold: number = 0.3
): Discrepancy[] {
  const discrepancies: Discrepancy[] = []

  for (let i = 0; i < benchmarks.length; i++) {
    for (let j = i + 1; j < benchmarks.length; j++) {
      const b1 = benchmarks[i]
      const b2 = benchmarks[j]

      const score1 = b1.score / b1.maxScore
      const score2 = b2.score / b2.maxScore
      const diff = Math.abs(score1 - score2)

      if (diff > threshold) {
        discrepancies.push({
          benchmarks: [b1.benchmarkType, b2.benchmarkType],
          item: 'overall',
          scores: [b1.score, b2.score],
          scoreDifference: diff,
          possibleCause: generateDiscrepancyCause(b1.benchmarkType, b2.benchmarkType, score1 > score2),
        })
      }
    }
  }

  return discrepancies
}

function generateDiscrepancyCause(
  higher: BenchmarkType,
  lower: BenchmarkType,
  firstHigher: boolean
): string {
  const [h, l] = firstHigher ? [higher, lower] : [lower, higher]

  const causes: Record<string, string> = {
    'frontierscience-domain_specific': 'Rubric criteria may not capture all physical constraints',
    'frontierscience-practicality': 'Theoretical merit differs from practical feasibility',
    'frontierscience-literature': 'Novel approach may conflict with established literature',
    'domain_specific-practicality': 'Physically valid but practically challenging',
    'domain_specific-literature': 'Physical model differs from empirical literature',
    'practicality-literature': 'Practical approach may lack academic validation',
    'simulation_convergence-domain_specific': 'Numerical results may not respect physical limits',
  }

  const key = `${h}-${l}`
  const reverseKey = `${l}-${h}`

  return causes[key] || causes[reverseKey] || `${h} and ${l} assess different aspects`
}

export function categorizeItem(itemId: string): BenchmarkCategory {
  const prefix = itemId.charAt(0).toUpperCase()

  const categoryMap: Record<string, BenchmarkCategory> = {
    'D': 'accuracy',       // Domain-specific items
    'L': 'completeness',   // Literature items
    'R': 'completeness',   // Research items
    'P': 'feasibility',    // Practicality items
    'SC': 'reproducibility', // Simulation convergence
    'H': 'novelty',        // Hypothesis items
  }

  if (itemId.startsWith('SC')) return categoryMap['SC']
  return categoryMap[prefix] || 'accuracy'
}
