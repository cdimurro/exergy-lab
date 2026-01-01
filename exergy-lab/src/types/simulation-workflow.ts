/**
 * Simulation Workflow Types
 *
 * Types for the AI-guided simulation workflow where users describe their
 * simulation goals and the AI generates detailed plans for review and execution.
 */

import type { SimulationTier, SimulationResult } from './simulation'

// ============================================================================
// Workflow Phases
// ============================================================================

export type WorkflowPhase =
  | 'setup'      // User configures tier, type, and goal
  | 'generating' // AI generates plan (SSE streaming)
  | 'review'     // User reviews/edits plan
  | 'executing'  // Simulation runs
  | 'complete'   // Results displayed
  | 'error'      // Error state

// ============================================================================
// Simulation Types
// ============================================================================

export type SimulationType =
  | 'geothermal'
  | 'solar'
  | 'wind'
  | 'battery'
  | 'hydrogen'
  | 'carbon-capture'
  | 'materials'
  | 'process'

export interface SimulationTypeInfo {
  id: SimulationType
  label: string
  icon: string // Lucide icon name
  description: string
  exampleUseCases: string[]
}

export const SIMULATION_TYPES: SimulationTypeInfo[] = [
  {
    id: 'geothermal',
    label: 'Geothermal',
    icon: 'Flame',
    description: 'Binary cycle, ORC, and flash steam power plant analysis',
    exampleUseCases: [
      'Reservoir temperature optimization',
      'Working fluid selection',
      'Plant efficiency calculation',
    ],
  },
  {
    id: 'solar',
    label: 'Solar',
    icon: 'Sun',
    description: 'Photovoltaic and concentrated solar power systems',
    exampleUseCases: [
      'Cell efficiency limits (Shockley-Queisser)',
      'Tracking optimization',
      'Thermal losses analysis',
    ],
  },
  {
    id: 'wind',
    label: 'Wind',
    icon: 'Wind',
    description: 'Turbine performance and wind farm analysis',
    exampleUseCases: [
      'Betz limit validation',
      'Wake effects modeling',
      'Capacity factor estimation',
    ],
  },
  {
    id: 'battery',
    label: 'Battery',
    icon: 'Battery',
    description: 'Electrochemistry, degradation, and cycling analysis',
    exampleUseCases: [
      'State-of-health prediction',
      'Cycle life estimation',
      'Thermal management',
    ],
  },
  {
    id: 'hydrogen',
    label: 'Hydrogen',
    icon: 'Droplets',
    description: 'Electrolysis, fuel cells, and storage systems',
    exampleUseCases: [
      'Electrolyzer efficiency',
      'Fuel cell performance',
      'Storage losses analysis',
    ],
  },
  {
    id: 'carbon-capture',
    label: 'Carbon Capture',
    icon: 'Cloud',
    description: 'Direct air capture, absorption, and sequestration',
    exampleUseCases: [
      'Sorbent performance',
      'Energy penalty calculation',
      'Cost analysis',
    ],
  },
  {
    id: 'materials',
    label: 'Materials',
    icon: 'Atom',
    description: 'Material property prediction and molecular simulation',
    exampleUseCases: [
      'Catalyst design',
      'Membrane performance',
      'Electrode optimization',
    ],
  },
  {
    id: 'process',
    label: 'Process',
    icon: 'Factory',
    description: 'Chemical process simulation and mass/energy balances',
    exampleUseCases: [
      'Heat integration',
      'Reactor design',
      'Process optimization',
    ],
  },
]

// ============================================================================
// Tier Information
// ============================================================================

export interface TierInfo {
  tier: SimulationTier
  label: string
  shortLabel: string
  badge: string
  duration: string
  cost: string
  description: string
  bestFor: string[]
  output: string
}

export const TIER_INFO: TierInfo[] = [
  {
    tier: 'local',
    label: 'Rapid Feasibility Check',
    shortLabel: 'T1',
    badge: 'FREE',
    duration: '<1 min',
    cost: '$0',
    description: 'Quick analytical validation using thermodynamic limits and literature data.',
    bestFor: [
      'Initial screening',
      'Checking if an idea is physically possible',
      'Rough efficiency estimates',
      'Safety and risk screening',
    ],
    output: 'Go/no-go decision with risk flags',
  },
  {
    tier: 'browser',
    label: 'Standard Lab Protocol',
    shortLabel: 'T2',
    badge: '~$0.01',
    duration: '5-30 min',
    cost: '$0.01',
    description: 'Monte Carlo simulation with 10,000 iterations for uncertainty quantification.',
    bestFor: [
      'Detailed analysis',
      'Parameter studies',
      'Generating lab protocols',
      'Uncertainty quantification',
    ],
    output: 'Full characterization plan with materials list',
  },
  {
    tier: 'cloud',
    label: 'Advanced Validation',
    shortLabel: 'T3',
    badge: '~$0.02',
    duration: '30+ min',
    cost: '$0.02',
    description: 'High-fidelity GPU simulation with parametric sweeps and statistical design.',
    bestFor: [
      'Publication-grade results',
      'Complex multi-physics',
      'Validation studies',
      'Statistical design of experiments',
    ],
    output: 'Comprehensive protocol with integrated characterization suite',
  },
]

// ============================================================================
// Simulation Plan
// ============================================================================

export type ParameterCategory = 'input' | 'boundary' | 'operational'

export interface SimulationPlanParameter {
  id: string
  name: string
  value: number | string
  unit: string
  category: ParameterCategory
  description: string
  isEditable: boolean
  min?: number
  max?: number
}

export interface ExpectedOutput {
  name: string
  unit: string
  description: string
}

export interface SimulationPlan {
  id: string
  tier: SimulationTier
  simulationType: SimulationType
  detectedType?: SimulationType // AI auto-detected from description
  title: string
  methodology: string
  parameters: SimulationPlanParameter[]
  expectedOutputs: ExpectedOutput[]
  estimatedDuration: number // milliseconds
  estimatedCost: number // dollars
  generatedAt: string // ISO date string
  version: number // Increments on each regeneration
}

// ============================================================================
// Workflow State
// ============================================================================

export interface StreamProgress {
  status: 'idle' | 'streaming' | 'complete' | 'error'
  percentage: number
  currentStep: string
}

export type ExecutionPhase =
  | 'initialization'
  | 'computing'
  | 'validation'
  | 'finalization'

export interface WorkflowExecutionProgress {
  phase: ExecutionPhase
  percentage: number
  message: string
  estimatedTimeRemaining: number | null
}

export interface SimulationWorkflowState {
  // Phase
  phase: WorkflowPhase

  // Setup inputs
  tier: SimulationTier
  simulationType: SimulationType | null
  detectedType: SimulationType | null
  goal: string

  // Plan
  plan: SimulationPlan | null
  planProgress: StreamProgress
  pendingChangeFeedback: string | null
  isRegenerating: boolean

  // Execution
  executionProgress: WorkflowExecutionProgress

  // Results
  results: SimulationResult | null

  // Error handling
  error: string | null

  // Timing
  startTime: number | null
  elapsedTime: number

  // Navigation
  navigationHistory: WorkflowPhase[]
  canNavigateBack: boolean
  canNavigateNext: boolean
}

// ============================================================================
// API Types
// ============================================================================

export interface GeneratePlanRequest {
  tier: SimulationTier
  simulationType?: SimulationType | null
  goal: string
}

export interface GeneratePlanResponse {
  planId: string
  status: 'started'
}

export interface ModifyPlanRequest {
  planId: string
  plan: SimulationPlan
  feedback: string
}

export interface ExecutePlanRequest {
  plan: SimulationPlan
}

export interface ExecutePlanResponse {
  executionId: string
  status: 'started'
}

// ============================================================================
// SSE Event Types
// ============================================================================

export type PlanGenerationEventType =
  | 'progress'
  | 'type_detected'
  | 'parameters'
  | 'methodology'
  | 'complete'
  | 'error'

export interface PlanGenerationProgressEvent {
  type: 'progress'
  percentage: number
  status: string
}

export interface PlanGenerationTypeDetectedEvent {
  type: 'type_detected'
  simulationType: SimulationType
}

export interface PlanGenerationParametersEvent {
  type: 'parameters'
  parameters: SimulationPlanParameter[]
}

export interface PlanGenerationMethodologyEvent {
  type: 'methodology'
  methodology: string
}

export interface PlanGenerationCompleteEvent {
  type: 'complete'
  plan: SimulationPlan
}

export interface PlanGenerationErrorEvent {
  type: 'error'
  error: string
}

export type PlanGenerationEvent =
  | PlanGenerationProgressEvent
  | PlanGenerationTypeDetectedEvent
  | PlanGenerationParametersEvent
  | PlanGenerationMethodologyEvent
  | PlanGenerationCompleteEvent
  | PlanGenerationErrorEvent

// ============================================================================
// Workflow Actions
// ============================================================================

export type WorkflowAction =
  | { type: 'SET_TIER'; payload: SimulationTier }
  | { type: 'SET_SIMULATION_TYPE'; payload: SimulationType | null }
  | { type: 'SET_DETECTED_TYPE'; payload: SimulationType | null }
  | { type: 'SET_GOAL'; payload: string }
  | { type: 'START_PLAN_GENERATION' }
  | { type: 'UPDATE_PLAN_PROGRESS'; payload: StreamProgress }
  | { type: 'SET_PLAN'; payload: SimulationPlan }
  | { type: 'START_REGENERATION'; payload: string }
  | { type: 'UPDATE_PARAMETER'; payload: { id: string; value: number | string } }
  | { type: 'APPROVE_PLAN' }
  | { type: 'START_EXECUTION' }
  | { type: 'UPDATE_EXECUTION_PROGRESS'; payload: WorkflowExecutionProgress }
  | { type: 'SET_RESULTS'; payload: SimulationResult }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'RESET' }
  | { type: 'TICK_ELAPSED_TIME' }
  | { type: 'NAVIGATE_TO_PHASE'; payload: WorkflowPhase }
  | { type: 'UPDATE_NAVIGATION_STATE' }
