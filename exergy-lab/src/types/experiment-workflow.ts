/**
 * Experiment Workflow Types
 *
 * Defines the AI-guided experiment design workflow with 5 phases:
 * Setup → Generating → Review → Validating → Complete
 */

import type { Material, ExperimentStep, SafetyWarning, FailureAnalysis } from './experiment'
import type { Domain } from './discovery'

// Re-export commonly used types for convenience
export type { Material, ExperimentStep, SafetyWarning, FailureAnalysis } from './experiment'

// ============================================================================
// Workflow Phase Types
// ============================================================================

export type ExperimentWorkflowPhase = 'setup' | 'generating' | 'review' | 'validating' | 'complete'

export type ExperimentDomain = Domain

// ============================================================================
// Experiment Plan Types
// ============================================================================

export interface ExperimentPlan {
  id: string
  domain: ExperimentDomain
  title: string
  materials: Material[]
  equipment: string[]
  steps: ExperimentStep[]
  safetyWarnings: SafetyWarning[]
  estimatedDuration: string
  estimatedCost: number
  methodology: string
  assumptions: string[]
  limitations: string[]
  generatedAt: string
  version: number
}

// ============================================================================
// Validation Types
// ============================================================================

export interface MaterialHazard {
  material: string
  hazardClass: 'low' | 'medium' | 'high' | 'critical'
  ghsPictograms: string[]
  handlingRequirements: string[]
  storageRequirements: string
  disposalRequirements: string
  requiredPPE: string[]
}

export interface Incompatibility {
  material1: string
  material2: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  reaction: string
  mitigation: string
}

export interface ProtocolValidation {
  literatureAlignment: {
    confidence: number  // 0-100
    matchedPapers: number
    deviations: string[]
    recommendations: string[]
  }
  materialSafety: {
    allChecked: boolean
    hazards: MaterialHazard[]
    incompatibilities: Incompatibility[]
    requiredPPE: string[]
  }
  equipmentFeasibility: {
    tier: 'academic' | 'industrial' | 'pilot'
    available: string[]
    unavailable: string[]
    alternatives: Record<string, string[]>
    estimatedAccessCost: number
  }
  costAccuracy: {
    totalCost: number
    confidenceInterval: [number, number]
    regionalAdjustment: number
    breakdown: CostBreakdown
    quoteSources: string[]
  }
}

export interface CostBreakdown {
  materials: Array<{
    name: string
    quantity: string
    unitCost: number
    totalCost: number
  }>
  subtotalMaterials: number
  equipmentUsage?: number
  labor?: number
  overhead?: number
  total: number
}

// ============================================================================
// Saved Experiment Types
// ============================================================================

export interface SavedExperiment {
  id: string
  savedAt: string
  name: string
  domain: ExperimentDomain
  goal: string
  objectives: string[]
  plan: ExperimentPlan
  validation: ProtocolValidation
  failureAnalysis?: FailureAnalysis
  tags?: string[]
  notes?: string
  duration?: number
  cost?: number
}

// ============================================================================
// Streaming Progress Types
// ============================================================================

export interface StreamProgress {
  percentage: number
  status: string
  currentPhase?: string
}

export interface PlanGenerationEvent {
  type: 'progress' | 'materials' | 'steps' | 'safety' | 'complete' | 'error'
  percentage?: number
  status?: string
  materials?: Material[]
  steps?: ExperimentStep[]
  warnings?: SafetyWarning[]
  plan?: ExperimentPlan
  error?: string
}

export interface ValidationProgress {
  phase: 'literature' | 'safety' | 'equipment' | 'cost' | 'complete'
  percentage: number
  message: string
}

export interface ValidationEvent {
  type: 'progress' | 'literature_complete' | 'safety_complete' | 'equipment_complete' | 'cost_complete' | 'complete' | 'error'
  phase?: 'literature' | 'safety' | 'equipment' | 'cost'
  percentage?: number
  message?: string
  data?: Partial<ProtocolValidation>
  validation?: ProtocolValidation
  error?: string
}

// ============================================================================
// Key Findings Types
// ============================================================================

export interface KeyFinding {
  id: string
  type: 'observation' | 'warning' | 'recommendation'
  title: string
  description: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  action?: RecommendationAction
}

export interface RecommendationAction {
  id: string
  type: 'navigate' | 'regenerate' | 'modify' | 'export'
  title: string
  description: string
  icon: string
  targetPath?: string
  targetTier?: string
  parameters?: Record<string, unknown>
}

// ============================================================================
// Source Paper Context Types
// ============================================================================

export interface SourcePaperContext {
  ids: string[]
  methodology?: string
  extractedParameters?: Record<string, unknown>
}

// ============================================================================
// Workflow State Types
// ============================================================================

export interface ExperimentWorkflowState {
  // Current phase
  phase: ExperimentWorkflowPhase

  // Setup phase
  domain: ExperimentDomain | null
  goal: string
  objectives: string[]
  sourcePapers?: SourcePaperContext

  // Generating phase
  planProgress: StreamProgress
  isGenerating: boolean

  // Review phase
  plan: ExperimentPlan | null

  // Validating phase
  validationProgress: ValidationProgress
  isValidating: boolean

  // Complete phase
  validation: ProtocolValidation | null
  failureAnalysis: FailureAnalysis | null
  keyFindings: KeyFinding[]

  // Metadata
  startedAt: string | null
  completedAt: string | null

  // Error state
  error: string | null
}

// ============================================================================
// Workflow Action Types
// ============================================================================

export type ExperimentWorkflowAction =
  | { type: 'SET_DOMAIN'; payload: ExperimentDomain }
  | { type: 'SET_GOAL'; payload: string }
  | { type: 'SET_OBJECTIVES'; payload: string[] }
  | { type: 'SET_SOURCE_PAPERS'; payload: SourcePaperContext }
  | { type: 'START_PLAN_GENERATION' }
  | { type: 'UPDATE_PLAN_PROGRESS'; payload: StreamProgress }
  | { type: 'SET_PLAN'; payload: ExperimentPlan }
  | { type: 'UPDATE_MATERIAL'; payload: { index: number; material: Material } }
  | { type: 'UPDATE_STEP'; payload: { index: number; step: ExperimentStep } }
  | { type: 'ADD_MATERIAL'; payload: Material }
  | { type: 'REMOVE_MATERIAL'; payload: number }
  | { type: 'ADD_STEP'; payload: ExperimentStep }
  | { type: 'REMOVE_STEP'; payload: number }
  | { type: 'APPROVE_PLAN' }
  | { type: 'START_VALIDATION' }
  | { type: 'UPDATE_VALIDATION_PROGRESS'; payload: ValidationProgress }
  | { type: 'SET_VALIDATION'; payload: ProtocolValidation }
  | { type: 'SET_FAILURE_ANALYSIS'; payload: FailureAnalysis }
  | { type: 'SET_KEY_FINDINGS'; payload: KeyFinding[] }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'RESET' }
  | { type: 'LOAD_SAVED'; payload: SavedExperiment }

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface GeneratePlanRequest {
  domain: ExperimentDomain
  goal: string
  objectives: string[]
  sourcePapers?: SourcePaperContext
}

export interface GeneratePlanResponse {
  planId: string
  status: 'started' | 'completed' | 'error'
  plan?: ExperimentPlan
  error?: string
}

export interface ValidateProtocolRequest {
  plan: ExperimentPlan
  sourcePapers?: SourcePaperContext
}

export interface ValidateProtocolResponse {
  validationId: string
  status: 'started' | 'completed' | 'error'
  validation?: ProtocolValidation
  error?: string
}

export interface ImportPapersRequest {
  paperIds: string[]
  sourcePapers: {
    papers: Array<{
      id: string
      title: string
      abstract: string
      methodology?: string
    }>
  }
}

export interface ImportPapersResponse {
  suggestedGoal: string
  suggestedObjectives: string[]
  extractedParameters: Record<string, unknown>
  methodology: string
}

// ============================================================================
// Exergy Experiment File Format (for cross-system integration)
// ============================================================================

export interface ExergyExperimentFile {
  version: '1.0.0'
  metadata: {
    id: string
    title: string
    domain: ExperimentDomain
    createdAt?: string
    author?: string
  }
  protocol: {
    materials: Material[]
    steps: ExperimentStep[]
    safetyWarnings: SafetyWarning[]
    equipment: string[]
  }
  validation?: ProtocolValidation
  simulation?: {
    suggestedType: string
    suggestedTier: string
    parameters: Record<string, unknown>
  }
}

// ============================================================================
// Helper Type Guards
// ============================================================================

export function isExperimentWorkflowPhase(value: unknown): value is ExperimentWorkflowPhase {
  return typeof value === 'string' && ['setup', 'generating', 'review', 'validating', 'complete'].includes(value)
}

export function isExperimentPlan(value: unknown): value is ExperimentPlan {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'domain' in value &&
    'title' in value &&
    'materials' in value &&
    'steps' in value
  )
}

export function isSavedExperiment(value: unknown): value is SavedExperiment {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'savedAt' in value &&
    'name' in value &&
    'domain' in value &&
    'plan' in value &&
    'validation' in value
  )
}
