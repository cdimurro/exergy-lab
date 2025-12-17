/**
 * Workflow Context Manager
 *
 * Manages data flow between workflow phases:
 * Research → Hypothesis → Experiment Design → Simulation → Analysis
 *
 * Features:
 * - Accumulates findings from each phase
 * - Provides context to subsequent phases
 * - Tracks iteration history
 * - Supports quality gate evaluation
 */

import type { Source } from './search-apis'

/**
 * Research findings from the research phase
 */
export interface ResearchFindings {
  sources: Source[]
  keyFindings: KeyFinding[]
  technologicalGaps: string[]
  emergingTrends: string[]
  controversies: string[]
  establishedFacts: EstablishedFact[]
  summary: string
}

export interface KeyFinding {
  id: string
  title: string
  description: string
  supportingSourceIds: string[]
  confidence: number // 0-100
  category: 'breakthrough' | 'improvement' | 'challenge' | 'opportunity' | 'trend'
}

export interface EstablishedFact {
  statement: string
  sourceIds: string[]
  fieldOfStudy: string
}

/**
 * Hypothesis generated from research
 */
export interface Hypothesis {
  id: string
  statement: string
  supportingEvidence: string[]
  assumptions: string[]
  predictions: Prediction[]
  validationMetrics: string[]
  feasibilityScore: number // 0-100
  noveltyScore: number // 0-100
  impactScore: number // 0-100
  status: 'proposed' | 'testing' | 'supported' | 'refuted' | 'inconclusive'
  iterationCount: number
}

export interface Prediction {
  description: string
  measurable: boolean
  expectedRange?: { min: number; max: number; unit: string }
}

/**
 * Experiment design based on hypothesis
 */
export interface ExperimentDesign {
  id: string
  hypothesisId: string
  title: string
  objective: string
  methodology: string
  materials: Material[]
  equipment: Equipment[]
  procedure: ProcedureStep[]
  safetyRequirements: string[]
  expectedResults: string[]
  failureModes: FailureMode[]
  estimatedDuration: string
  estimatedCost: number
  difficulty: 'low' | 'medium' | 'high'
}

export interface Material {
  name: string
  quantity: string
  purity?: string
  supplier?: string
}

export interface Equipment {
  name: string
  specification?: string
  required: boolean
}

export interface ProcedureStep {
  step: number
  instruction: string
  duration?: string
  temperature?: string
  notes?: string
}

export interface FailureMode {
  mode: string
  likelihood: 'low' | 'medium' | 'high'
  mitigation: string[]
}

/**
 * Simulation results
 */
export interface SimulationResult {
  id: string
  experimentId: string
  tier: 'tier1' | 'tier2' | 'tier3'
  type: string
  parameters: Record<string, any>
  outputs: SimulationOutput[]
  convergenceMetrics: ConvergenceMetrics
  executionTimeMs: number
  timestamp: string
}

export interface SimulationOutput {
  name: string
  value: number
  unit: string
  confidence?: number
}

export interface ConvergenceMetrics {
  converged: boolean
  iterations: number
  residual: number
  tolerance: number
}

/**
 * Analysis conclusions
 */
export interface AnalysisConclusion {
  id: string
  hypothesisId: string
  supportLevel: 'strongly_supported' | 'supported' | 'inconclusive' | 'contradicted' | 'strongly_contradicted'
  evidenceSummary: string
  keyMetrics: AnalysisMetric[]
  literatureComparison: LiteratureComparison[]
  recommendations: string[]
  confidence: number // 0-100
}

export interface AnalysisMetric {
  name: string
  predicted: number
  observed: number
  unit: string
  withinExpectation: boolean
  deviation: number // percentage
}

export interface LiteratureComparison {
  sourceId: string
  claim: string
  consistency: 'consistent' | 'inconsistent' | 'novel'
  notes: string
}

/**
 * Iteration record for tracking refinements
 */
export interface IterationRecord {
  id: string
  phase: WorkflowPhase
  iteration: number
  timestamp: string
  trigger: 'quality_gate_failure' | 'user_request' | 'inconsistent_results'
  refinements: Refinement[]
  previousResults: any
  newResults: any
}

export interface Refinement {
  type: 'hypothesis_modification' | 'experiment_adjustment' | 'simulation_parameter_change' | 'additional_research'
  description: string
  rationale: string
}

/**
 * Workflow phases
 */
export type WorkflowPhase =
  | 'research'
  | 'hypothesis_generation'
  | 'experiment_design'
  | 'simulation'
  | 'analysis'
  | 'tea_analysis'

/**
 * Complete workflow context
 */
export interface WorkflowContext {
  id: string
  createdAt: string
  updatedAt: string
  currentPhase: WorkflowPhase
  status: 'in_progress' | 'completed' | 'failed' | 'iterating'

  // Input
  originalQuery: string
  domains: string[]
  goals: string[]

  // Phase results
  researchFindings: ResearchFindings | null
  hypotheses: Hypothesis[]
  experimentDesigns: ExperimentDesign[]
  simulationResults: SimulationResult[]
  analysisConclusions: AnalysisConclusion[]

  // Tracking
  iterationHistory: IterationRecord[]
  qualityScores: Record<WorkflowPhase, number>
  errors: WorkflowError[]
}

export interface WorkflowError {
  phase: WorkflowPhase
  timestamp: string
  message: string
  recoverable: boolean
}

/**
 * Workflow Context Manager class
 */
export class WorkflowContextManager {
  private context: WorkflowContext

  constructor(id: string, query: string, domains: string[], goals: string[]) {
    this.context = {
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentPhase: 'research',
      status: 'in_progress',
      originalQuery: query,
      domains,
      goals,
      researchFindings: null,
      hypotheses: [],
      experimentDesigns: [],
      simulationResults: [],
      analysisConclusions: [],
      iterationHistory: [],
      qualityScores: {
        research: 0,
        hypothesis_generation: 0,
        experiment_design: 0,
        simulation: 0,
        analysis: 0,
        tea_analysis: 0,
      },
      errors: [],
    }
  }

  /**
   * Get current context
   */
  getContext(): WorkflowContext {
    return { ...this.context }
  }

  /**
   * Update phase
   */
  setPhase(phase: WorkflowPhase): void {
    this.context.currentPhase = phase
    this.context.updatedAt = new Date().toISOString()
    console.log(`[WorkflowContext] Phase changed to: ${phase}`)
  }

  /**
   * Store research findings
   */
  setResearchFindings(findings: ResearchFindings): void {
    this.context.researchFindings = findings
    this.context.updatedAt = new Date().toISOString()
    console.log(`[WorkflowContext] Research findings stored: ${findings.sources.length} sources, ${findings.keyFindings.length} key findings`)
  }

  /**
   * Add hypothesis
   */
  addHypothesis(hypothesis: Hypothesis): void {
    this.context.hypotheses.push(hypothesis)
    this.context.updatedAt = new Date().toISOString()
    console.log(`[WorkflowContext] Hypothesis added: ${hypothesis.statement.slice(0, 50)}...`)
  }

  /**
   * Update hypothesis status
   */
  updateHypothesisStatus(id: string, status: Hypothesis['status']): void {
    const hypothesis = this.context.hypotheses.find(h => h.id === id)
    if (hypothesis) {
      hypothesis.status = status
      hypothesis.iterationCount++
      this.context.updatedAt = new Date().toISOString()
    }
  }

  /**
   * Add experiment design
   */
  addExperimentDesign(design: ExperimentDesign): void {
    this.context.experimentDesigns.push(design)
    this.context.updatedAt = new Date().toISOString()
    console.log(`[WorkflowContext] Experiment design added: ${design.title}`)
  }

  /**
   * Add simulation result
   */
  addSimulationResult(result: SimulationResult): void {
    this.context.simulationResults.push(result)
    this.context.updatedAt = new Date().toISOString()
    console.log(`[WorkflowContext] Simulation result added: ${result.type} (tier ${result.tier})`)
  }

  /**
   * Add analysis conclusion
   */
  addAnalysisConclusion(conclusion: AnalysisConclusion): void {
    this.context.analysisConclusions.push(conclusion)
    this.context.updatedAt = new Date().toISOString()
    console.log(`[WorkflowContext] Analysis conclusion added: ${conclusion.supportLevel}`)
  }

  /**
   * Record iteration
   */
  recordIteration(record: Omit<IterationRecord, 'id' | 'timestamp'>): void {
    this.context.iterationHistory.push({
      ...record,
      id: `iter_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
    })
    this.context.status = 'iterating'
    this.context.updatedAt = new Date().toISOString()
    console.log(`[WorkflowContext] Iteration recorded for phase: ${record.phase}`)
  }

  /**
   * Set quality score for a phase
   */
  setQualityScore(phase: WorkflowPhase, score: number): void {
    this.context.qualityScores[phase] = Math.min(100, Math.max(0, score))
    this.context.updatedAt = new Date().toISOString()
    console.log(`[WorkflowContext] Quality score for ${phase}: ${score}`)
  }

  /**
   * Record error
   */
  recordError(phase: WorkflowPhase, message: string, recoverable: boolean): void {
    this.context.errors.push({
      phase,
      timestamp: new Date().toISOString(),
      message,
      recoverable,
    })
    if (!recoverable) {
      this.context.status = 'failed'
    }
    this.context.updatedAt = new Date().toISOString()
  }

  /**
   * Mark workflow as completed
   */
  markCompleted(): void {
    this.context.status = 'completed'
    this.context.updatedAt = new Date().toISOString()
    console.log(`[WorkflowContext] Workflow completed`)
  }

  /**
   * Get input for hypothesis generation
   */
  getHypothesisInput(): {
    keyFindings: KeyFinding[]
    technologicalGaps: string[]
    emergingTrends: string[]
    goals: string[]
  } | null {
    if (!this.context.researchFindings) {
      console.warn('[WorkflowContext] No research findings available for hypothesis generation')
      return null
    }

    return {
      keyFindings: this.context.researchFindings.keyFindings,
      technologicalGaps: this.context.researchFindings.technologicalGaps,
      emergingTrends: this.context.researchFindings.emergingTrends,
      goals: this.context.goals,
    }
  }

  /**
   * Get input for experiment design
   */
  getExperimentDesignInput(): {
    hypotheses: Hypothesis[]
    domain: string
  } | null {
    if (this.context.hypotheses.length === 0) {
      console.warn('[WorkflowContext] No hypotheses available for experiment design')
      return null
    }

    return {
      hypotheses: this.context.hypotheses.filter(h => h.status === 'proposed' || h.status === 'testing'),
      domain: this.context.domains[0] || 'other',
    }
  }

  /**
   * Get input for analysis
   */
  getAnalysisInput(): {
    hypotheses: Hypothesis[]
    simulationResults: SimulationResult[]
    researchFindings: ResearchFindings
  } | null {
    if (!this.context.researchFindings || this.context.simulationResults.length === 0) {
      console.warn('[WorkflowContext] Insufficient data for analysis')
      return null
    }

    return {
      hypotheses: this.context.hypotheses,
      simulationResults: this.context.simulationResults,
      researchFindings: this.context.researchFindings,
    }
  }

  /**
   * Get iteration count for a phase
   */
  getPhaseIterationCount(phase: WorkflowPhase): number {
    return this.context.iterationHistory.filter(r => r.phase === phase).length
  }

  /**
   * Check if phase should iterate
   */
  shouldIterate(phase: WorkflowPhase, maxIterations: number = 3): boolean {
    const iterations = this.getPhaseIterationCount(phase)
    const qualityScore = this.context.qualityScores[phase]

    if (iterations >= maxIterations) {
      console.log(`[WorkflowContext] Max iterations reached for ${phase}`)
      return false
    }

    if (qualityScore < 70) {
      console.log(`[WorkflowContext] Quality score ${qualityScore} below threshold for ${phase}, suggesting iteration`)
      return true
    }

    return false
  }

  /**
   * Export context as JSON
   */
  toJSON(): string {
    return JSON.stringify(this.context, null, 2)
  }

  /**
   * Restore from JSON
   */
  static fromJSON(json: string): WorkflowContextManager {
    const context = JSON.parse(json) as WorkflowContext
    const manager = new WorkflowContextManager(
      context.id,
      context.originalQuery,
      context.domains,
      context.goals
    )
    // @ts-ignore - Restore full context
    manager.context = context
    return manager
  }
}

/**
 * Extract key findings from research sources
 */
export function extractKeyFindings(sources: Source[]): KeyFinding[] {
  const findings: KeyFinding[] = []

  // Group sources by topic/title similarity
  const topicGroups = new Map<string, Source[]>()

  for (const source of sources) {
    // Extract main topic from title
    const topic = extractMainTopic(source.title)
    const existing = topicGroups.get(topic) || []
    existing.push(source)
    topicGroups.set(topic, existing)
  }

  // Create findings from topic groups
  for (const [topic, groupSources] of topicGroups.entries()) {
    if (groupSources.length >= 2) {
      findings.push({
        id: `finding_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        title: topic,
        description: `${groupSources.length} sources discuss ${topic}`,
        supportingSourceIds: groupSources.map(s => s.id),
        confidence: Math.min(95, 50 + groupSources.length * 10),
        category: categorizeFindings(topic),
      })
    }
  }

  return findings.slice(0, 10) // Top 10 findings
}

/**
 * Extract main topic from title
 */
function extractMainTopic(title: string): string {
  // Simple extraction - take first 5 significant words
  const stopWords = new Set(['the', 'a', 'an', 'of', 'in', 'for', 'to', 'and', 'on', 'with', 'by', 'from', 'as', 'at'])
  const words = title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 5)

  return words.join(' ')
}

/**
 * Categorize finding based on keywords
 */
function categorizeFindings(topic: string): KeyFinding['category'] {
  const topicLower = topic.toLowerCase()

  if (topicLower.includes('breakthrough') || topicLower.includes('novel') || topicLower.includes('new')) {
    return 'breakthrough'
  }
  if (topicLower.includes('improve') || topicLower.includes('enhance') || topicLower.includes('optimize')) {
    return 'improvement'
  }
  if (topicLower.includes('challenge') || topicLower.includes('problem') || topicLower.includes('limitation')) {
    return 'challenge'
  }
  if (topicLower.includes('potential') || topicLower.includes('opportunity') || topicLower.includes('prospect')) {
    return 'opportunity'
  }

  return 'trend'
}
