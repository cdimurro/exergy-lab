/**
 * Unified Workflow Types
 *
 * Defines types for orchestrating the complete 7-phase workflow:
 * Research → Hypothesis → Experiment Design → Simulation → TEA → Validation → Quality Gates
 */

import type { ToolName, ToolCall, ToolResult } from './agent'
import type { Domain, Source } from './discovery'

// ============================================================================
// Workflow State Types
// ============================================================================

export type WorkflowStatus =
  | 'planning'           // AI is generating execution plan
  | 'awaiting_approval'  // Plan ready, waiting for user
  | 'executing'          // Workflow is running
  | 'completed'          // All phases complete
  | 'failed'             // Workflow failed
  | 'cancelled'          // User cancelled

export type PhaseType =
  | 'research'           // Phase 1: Literature search & analysis
  | 'hypothesis'         // Phase 2: Generate testable hypotheses
  | 'experiment_design'  // Phase 3: Design experimental protocols
  | 'simulation'         // Phase 4: Run simulations
  | 'tea_analysis'       // Phase 5: Techno-economic analysis
  | 'validation'         // Phase 6: Validate results against literature
  | 'quality_gates'      // Phase 7: Quality assurance checks

export interface UnifiedWorkflow {
  id: string
  status: WorkflowStatus
  query: string
  executionPlan: ExecutionPlan
  checkpoints: WorkflowCheckpoint[]
  results: WorkflowResults
  userDecisions: UserDecision[]
  createdAt: string
  updatedAt: string
  duration?: number  // Total execution time in ms
}

// ============================================================================
// Execution Plan Types
// ============================================================================

export interface ExecutionPlan {
  overview: string              // Human-readable summary
  phases: PlanPhase[]           // Ordered list of phases
  estimatedDuration: number     // milliseconds
  estimatedCost: number         // USD (for cloud GPU, API calls, etc.)
  requiredTools: ToolName[]     // All tools needed
  dependencies: PhaseDependency[] // Phase execution order
}

export interface PlanPhase {
  id: string
  type: PhaseType
  title: string
  description: string
  tools: ToolCall[]             // Tools to execute in this phase
  expectedOutputs: string[]     // What this phase will produce
  parameters: PhaseParameters   // Configurable parameters
  canModify: boolean            // Can user edit parameters?
  optional: boolean             // Is this phase optional?
  enabled: boolean              // Is this phase enabled? (default true)
  estimatedDuration: number     // milliseconds
  estimatedCost: number         // USD
  details?: PlanPhaseDetails    // AI-generated detailed plan content
}

// ============================================================================
// AI-Generated Plan Details (Phase 7)
// ============================================================================

/**
 * Union type for all phase-specific details
 */
export type PlanPhaseDetails =
  | ResearchPlanDetails
  | HypothesisPlanDetails
  | ExperimentPlanDetails
  | SimulationPlanDetails
  | TEAPlanDetails
  | ValidationPlanDetails
  | QualityGatesPlanDetails

/**
 * Detailed plan for Research phase
 * Contains specific search terms, databases, and key areas tailored to user query
 */
export interface ResearchPlanDetails {
  type: 'research'
  searchTerms: string[]           // Specific search queries derived from user input
  databases: string[]             // Relevant databases to search
  keyAreas: string[]              // Key research areas to investigate
  expectedPapers: number          // Estimated number of papers
  expectedPatents: number         // Estimated number of patents
  rationale: string               // Why these searches were chosen
}

/**
 * Detailed plan for Hypothesis phase
 * Contains hypothesis generation approach and expected outputs
 */
export interface HypothesisPlanDetails {
  type: 'hypothesis'
  focusAreas: string[]            // Key areas to generate hypotheses for
  expectedHypotheses: number      // Number of hypotheses to generate
  evaluationCriteria: string[]    // How hypotheses will be evaluated
  rationale: string               // Why this approach was chosen
}

/**
 * Detailed plan for Experiment Design phase
 * Contains domain-specific experimental protocols
 */
export interface ExperimentPlanDetails {
  type: 'experiment_design'
  protocols: ExperimentPlanProtocol[]  // Planned experimental protocols
  rationale: string                     // Why these experiments were chosen
}

/**
 * Individual experiment protocol in the plan
 */
export interface ExperimentPlanProtocol {
  name: string                    // Protocol name
  objective: string               // What this experiment tests
  materials: string[]             // Required materials
  equipment: string[]             // Required equipment
  procedure: string[]             // Step-by-step procedure
  metrics: string[]               // Success metrics to measure
  safetyNotes?: string[]          // Safety considerations
  estimatedDuration?: string      // e.g., "2-3 hours"
}

/**
 * Detailed plan for Simulation phase
 * Contains simulation type and parameters specific to the domain
 */
export interface SimulationPlanDetails {
  type: 'simulation'
  simulationType: SimulationMethodType  // DFT, MD, GCMC, CFD, etc.
  system: string                        // Description of simulated system
  parameters: Record<string, string | number>  // Simulation parameters
  expectedOutputs: string[]             // What the simulation will produce
  rationale: string                     // Why this simulation approach
}

/**
 * Common simulation method types in clean energy research
 */
export type SimulationMethodType =
  | 'DFT'       // Density Functional Theory (materials properties)
  | 'MD'        // Molecular Dynamics (thermal, mechanical)
  | 'GCMC'      // Grand Canonical Monte Carlo (adsorption)
  | 'CFD'       // Computational Fluid Dynamics (flow, heat transfer)
  | 'FEA'       // Finite Element Analysis (structural)
  | 'KMC'       // Kinetic Monte Carlo (reaction kinetics)
  | 'PV'        // Photovoltaic performance simulation
  | 'battery'   // Battery electrochemistry simulation
  | 'process'   // Process simulation (chemical engineering)
  | 'other'     // Other simulation types

/**
 * Detailed plan for TEA phase
 * Contains analysis approach and key assumptions
 */
export interface TEAPlanDetails {
  type: 'tea_analysis'
  analysisScope: string           // What costs/revenue to analyze
  keyAssumptions: string[]        // Critical assumptions for the analysis
  dataRequirements: string[]      // Data needed from previous phases
  outputMetrics: string[]         // Financial metrics to calculate
  rationale: string               // Why this analysis approach
}

/**
 * Detailed plan for Validation phase
 * Contains validation approach and literature comparison strategy
 */
export interface ValidationPlanDetails {
  type: 'validation'
  validationMethods: string[]     // Methods to validate results
  literatureComparison: string[]  // Key papers/benchmarks to compare against
  acceptanceCriteria: string[]    // Criteria for accepting results
  rationale: string               // Why this validation approach
}

/**
 * Detailed plan for Quality Gates phase
 * Contains quality assurance checks and thresholds
 */
export interface QualityGatesPlanDetails {
  type: 'quality_gates'
  qualityChecks: QualityCheck[]   // Specific quality checks to perform
  overallThreshold: number        // Minimum score to pass (0-100)
  rationale: string               // Why these checks were chosen
}

/**
 * Individual quality check in the plan
 */
export interface QualityCheck {
  name: string                    // Check name
  description: string             // What this check validates
  weight: number                  // Importance weight (0-1)
  threshold: number               // Minimum score to pass (0-100)
}

export interface PhaseParameters {
  [key: string]: any
  // Common parameters
  maxResults?: number
  yearFrom?: number
  yearTo?: number
  simulationTier?: 'local' | 'browser' | 'cloud'
  targetAccuracy?: number  // 0-100
  budgetLimit?: number     // USD
}

export interface PhaseDependency {
  phaseId: string
  dependsOn: string[]  // Phase IDs that must complete first
  dataFlow: string     // Description of what data passes between phases
}

// ============================================================================
// Workflow Results Types
// ============================================================================

export interface WorkflowResults {
  // Optional summary field for AI-generated overviews
  summary?: string
  // Comprehensive AI analysis (synthesis, findings, recommendations)
  analysis?: {
    synthesis?: string
    keyFindings?: string[]
    recommendations?: string[]
    confidence?: number
  }
  research: ResearchResults
  hypotheses: HypothesisResults
  experiments: ExperimentResults
  simulations: SimulationResults
  tea: TEAResults
  validation: ValidationResults
  qualityGates: QualityGatesResults
  crossFeatureInsights: Insight[] | string[]  // Can be full Insights or simple strings
}

export interface ResearchResults {
  papers: Source[]
  patents: Source[]
  datasets: Source[]
  totalSources: number
  keyFindings: string[]
  confidenceScore: number  // 0-100
  searchTime: number       // milliseconds
}

export interface HypothesisResults {
  hypotheses: Hypothesis[]
  totalHypotheses: number
  topRanked: Hypothesis[]     // Top 3 hypotheses by score
  generationTime: number      // milliseconds
}

export interface Hypothesis {
  id: string
  title: string
  statement: string           // The hypothesis statement
  rationale: string           // Why this hypothesis was generated
  supportingEvidence: string[] // References from research phase
  testablePredicitions: string[] // What can be tested
  noveltyScore: number        // 0-100
  feasibilityScore: number    // 0-100
  impactScore: number         // 0-100
  overallScore: number        // Weighted combination
  status: 'proposed' | 'testing' | 'supported' | 'refuted' | 'inconclusive'
}

export interface ExperimentResults {
  protocols: ExperimentProtocol[]
  failureAnalyses: FailureAnalysis[]
  recommendations: string[]
  totalProtocols: number
}

export interface ExperimentProtocol {
  id: string
  title: string
  objective: string
  materials: Material[]
  equipment: Equipment[]
  procedure: ProcedureStep[]
  safetyWarnings: string[]
  expectedResults: string[]
  duration: string         // e.g., "2-3 hours"
  difficulty: 'low' | 'medium' | 'high'
  cost: number            // USD
}

export interface Material {
  name: string
  quantity: string
  purity?: string
  supplier?: string
  cost?: number
}

export interface Equipment {
  name: string
  specification?: string
  required: boolean
  alternative?: string
}

export interface ProcedureStep {
  step: number
  instruction: string
  duration?: string
  temperature?: string
  warning?: string
}

export interface FailureAnalysis {
  protocolId: string
  failureMode: string
  likelihood: 'low' | 'medium' | 'high'
  impact: 'low' | 'medium' | 'high'
  riskScore: number      // 0-100
  mitigation: string[]
}

export interface SimulationResults {
  runs: SimulationRun[]
  optimizations: Optimization[]
  visualizations: Visualization[]
  totalRuns: number
  averageAccuracy: number
}

export interface SimulationRun {
  id: string
  name: string
  tier: 'local' | 'browser' | 'cloud'
  parameters: Record<string, number>
  metrics: SimulationMetric[]
  status: 'completed' | 'failed' | 'running'
  duration: number        // milliseconds
  accuracy?: number       // 0-100
}

export interface SimulationMetric {
  name: string
  value: number
  unit: string
  uncertainty?: number    // percentage
}

export interface Optimization {
  parameter: string
  optimalValue: number
  improvement: number     // percentage
  confidence: number      // 0-100
}

export interface Visualization {
  type: 'chart' | 'graph' | 'heatmap' | '3d'
  title: string
  data: any
  description: string
}

export interface TEAResults {
  lcoe: number           // Levelized Cost of Energy ($/kWh)
  npv: number            // Net Present Value ($)
  irr: number            // Internal Rate of Return (%)
  paybackPeriod: number  // years
  breakdown: TEABreakdown
  sensitivityAnalysis: SensitivityResult[]
  recommendations: string[]
}

export interface TEABreakdown {
  capitalCosts: CostCategory[]
  operatingCosts: CostCategory[]
  revenue: RevenueStream[]
  totalCapex: number
  totalOpex: number
  annualRevenue: number
}

export interface CostCategory {
  category: string
  amount: number
  percentage: number
}

export interface RevenueStream {
  source: string
  amount: number
  percentage: number
}

export interface SensitivityResult {
  variable: string
  baseValue: number
  change: number         // percentage
  impact: number         // impact on NPV/LCOE
}

export interface ValidationResults {
  validationChecks: ValidationCheck[]
  literatureComparisons: LiteratureComparison[]
  overallScore: number            // 0-100
  passed: boolean
  issues: ValidationIssue[]
  validationTime: number          // milliseconds
}

export interface ValidationCheck {
  name: string
  description: string
  result: 'pass' | 'fail' | 'warning'
  score: number                   // 0-100
  details: string
}

export interface LiteratureComparison {
  metric: string
  ourValue: number
  literatureValue: number
  source: string                  // Reference paper/benchmark
  deviation: number               // percentage
  acceptable: boolean
}

export interface ValidationIssue {
  severity: 'critical' | 'major' | 'minor'
  phase: PhaseType
  description: string
  recommendation: string
}

export interface QualityGatesResults {
  gates: QualityGateResult[]
  overallScore: number            // 0-100
  passed: boolean
  summary: string
  recommendations: string[]
  evaluationTime: number          // milliseconds
}

export interface QualityGateResult {
  name: string
  description: string
  weight: number                  // 0-1
  score: number                   // 0-100
  threshold: number               // Minimum to pass
  passed: boolean
  details: string
  affectedPhases: PhaseType[]
}

// ============================================================================
// Cross-Feature Insights
// ============================================================================

export interface Insight {
  id: string
  type: 'cross_domain' | 'cost_saving' | 'risk_mitigation' | 'performance_gain'
  title: string
  description: string
  affectedPhases: PhaseType[]
  priority: 'high' | 'medium' | 'low'
  actionable: boolean
  recommendation?: string
  evidence?: Source[]
}

// ============================================================================
// User Decision Types
// ============================================================================

export type UserDecisionType =
  | 'plan_approved'
  | 'plan_modified'
  | 'plan_rejected'
  | 'refine_requested'
  | 'tea_requested'
  | 'workflow_cancelled'

export interface UserDecision {
  timestamp: number
  type: UserDecisionType
  modifications?: PhaseModification[]
  reasoning?: string
  nextAction?: string
}

export interface PhaseModification {
  phaseId: string
  parameterChanges: Record<string, any>
  reason?: string
}

// ============================================================================
// Checkpoint Types
// ============================================================================

export interface WorkflowCheckpoint {
  id?: string
  workflowId?: string
  phaseId: string
  timestamp: number
  state?: WorkflowState
  canResumeFrom?: boolean
  ttl?: number            // milliseconds (default 24h)
  data?: Record<string, any>  // Flexible data for checkpoint state
}

export interface WorkflowState {
  completedPhases: string[]
  currentPhase?: string
  partialResults: Partial<WorkflowResults>
  toolResults: ToolResult[]
  context: Record<string, any>
}

// ============================================================================
// Next-Step Recommendation Types
// ============================================================================

export type NextStepType =
  | 'refine_search'
  | 'modify_experiments'
  | 'optimize_simulations'
  | 'generate_tea'
  | 'export_results'
  | 'repeat_workflow'

export interface NextStepSuggestion {
  type: NextStepType
  priority: 'high' | 'medium' | 'low'
  reason: string
  action: NextStepAction
  estimatedImpact?: string
}

export interface NextStepAction {
  label: string
  description: string
  estimatedTime: number  // minutes
  estimatedCost?: number // USD
  parameters?: Record<string, any>
}

// ============================================================================
// Status Update Extensions (for workflow-specific updates)
// ============================================================================

export interface WorkflowStatusUpdate {
  workflowId: string
  status: WorkflowStatus
  currentPhase?: PhaseType
  phaseProgress: number  // 0-100
  overallProgress: number // 0-100
  step: string
  message: string
  details?: Record<string, any>
  timestamp: number
  estimatedTimeRemaining?: number  // milliseconds
  costAccumulated?: number         // USD
}

// ============================================================================
// Helper Types
// ============================================================================

export interface WorkflowInput {
  query: string
  domains: Domain[]
  goals: string[]
  options?: WorkflowOptions
}

export interface WorkflowOptions {
  targetAccuracy?: number      // 0-100
  budgetLimit?: number          // USD
  simulationTier?: 'local' | 'browser' | 'cloud'
  includeTEA?: boolean          // Include TEA phase
  includeExperiments?: boolean  // Include experiment design
  includeSimulations?: boolean  // Include simulations
  maxDuration?: number          // Maximum allowed duration in ms
}

// All types are exported inline via 'export interface' declarations above
