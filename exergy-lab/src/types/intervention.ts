/**
 * Interactive Discovery Workflow Types
 *
 * Types for user interventions, feedback, and interactive control
 * of the FrontierScience discovery process.
 */

import type { DiscoveryPhase } from '@/lib/ai/rubrics/types'
import type { ExperimentTier } from './experiment-tiers'
import type { SimulationTierNumber } from './simulation-tiers'

// ============================================================================
// Discovery Configuration
// ============================================================================

export type Domain =
  | 'solar-photovoltaics'
  | 'solar-thermal'
  | 'battery-storage'
  | 'fuel-cells'
  | 'electrolyzers'
  | 'carbon-capture'
  | 'direct-air-capture'
  | 'wind-energy'
  | 'geothermal'
  | 'hydrogen-storage'
  | 'catalysis'
  | 'thermoelectrics'
  | 'supercapacitors'
  | 'biofuels'
  | 'nuclear-advanced'
  | 'custom'

export type TargetQuality = 'exploratory' | 'validated' | 'publication'

export type InteractionLevel = 'autonomous' | 'guided' | 'manual'

export interface PhaseSettings {
  enabled: boolean
  maxIterations?: number
  customRubricWeights?: Record<string, number>
  skipConditions?: string[]      // Conditions under which to skip
}

export interface BudgetConstraints {
  maxDuration: number            // minutes
  maxCost: number                // USD for cloud compute
  maxIterations: number          // per phase
  maxTokens?: number             // optional token budget
}

export interface DiscoveryConfiguration {
  // Basic Settings
  query: string
  domain: Domain
  customDomain?: string          // If domain === 'custom'
  targetQuality: TargetQuality

  // Phase Configuration
  enabledPhases: Set<DiscoveryPhase>
  phaseSettings: Map<DiscoveryPhase, PhaseSettings>

  // Tier Preferences
  experimentTier: ExperimentTier | 'auto'
  simulationTier: SimulationTierNumber | 'auto'
  autoEscalate: boolean          // Allow auto-upgrade to higher tier

  // Budget Constraints
  budget: BudgetConstraints

  // Interaction Mode
  interactionLevel: InteractionLevel

  // Advanced Options
  priorityMetrics?: string[]     // e.g., ['efficiency', 'cost', 'safety']
  customPromptAdditions?: string // Additional context for AI
  seedHypotheses?: string[]      // User-provided starting hypotheses
  excludedMaterials?: string[]   // Materials to avoid
  preferredMaterials?: string[]  // Preferred materials
}

/**
 * Default discovery configuration using consolidated 4-phase model
 */
export const DEFAULT_DISCOVERY_CONFIG: Omit<DiscoveryConfiguration, 'query'> = {
  domain: 'solar-photovoltaics',
  targetQuality: 'validated',
  enabledPhases: new Set([
    'research',    // Combines: research + synthesis + screening
    'hypothesis',  // Combines: hypothesis + experiment
    'validation',  // Combines: simulation + exergy + tea + patent + validation
    'output',      // Combines: rubric_eval + publication
  ] as DiscoveryPhase[]),
  phaseSettings: new Map(),
  experimentTier: 'auto',
  simulationTier: 'auto',
  autoEscalate: true,
  budget: {
    maxDuration: 30,
    maxCost: 5,
    maxIterations: 3,
  },
  interactionLevel: 'guided',
}

// ============================================================================
// Intervention Types
// ============================================================================

export type InterventionType =
  | 'approval_required'          // Must approve to continue
  | 'review_recommended'         // Can continue, but review suggested
  | 'escalation_available'       // Option to escalate tier
  | 'input_required'             // User input needed
  | 'selection_required'         // User must select from options

export type InterventionAction =
  | 'continue'                   // Proceed with current results
  | 'retry'                      // Retry the phase
  | 'skip'                       // Skip this phase
  | 'modify'                     // Modify the output
  | 'escalate'                   // Escalate to higher tier
  | 'reject'                     // Reject results, stop discovery
  | 'select'                     // Select from options
  | 'add-custom'                 // Add user-provided content

export interface InterventionOption {
  id: string
  label: string
  description?: string
  action: InterventionAction
  icon?: string                  // Lucide icon name
  variant?: 'default' | 'primary' | 'secondary' | 'destructive' | 'outline'
  requiresInput?: boolean
  inputLabel?: string
  inputPlaceholder?: string
  inputType?: 'text' | 'textarea' | 'number' | 'select'
  selectOptions?: { value: string; label: string }[]
  disabled?: boolean
  disabledReason?: string
}

export interface PhaseInterventionPoint {
  id: string
  type: InterventionType
  phase: DiscoveryPhase
  title: string
  message: string
  details?: string[]
  options: InterventionOption[]
  data: unknown                  // Phase-specific data for review
  timestamp: number
  timeout?: number               // Auto-continue after X seconds
  timeoutAction?: InterventionAction
  canDismiss: boolean
}

export interface InterventionResponse {
  interventionId: string
  action: InterventionAction
  selectedOptionId: string
  userInput?: string | number | string[]
  modifiedData?: unknown
  timestamp: number
  reasoning?: string             // Optional user explanation
}

// ============================================================================
// Phase-Specific Intervention Data
// ============================================================================

export interface ResearchInterventionData {
  sourcesFound: number
  topSources: {
    title: string
    authors: string
    year: number
    relevance: number
    type: 'paper' | 'patent' | 'database'
  }[]
  keyFindings: string[]
  gaps: string[]
}

export interface HypothesisInterventionData {
  hypotheses: {
    id: string
    title: string
    statement: string
    noveltyScore: number
    feasibilityScore: number
    selected: boolean
  }[]
  maxSelectable: number
  minRequired: number
}

export interface ExperimentInterventionData {
  protocol: {
    title: string
    materialCount: number
    stepCount: number
    estimatedCost: number
    estimatedDuration: string
    safetyLevel: 'low' | 'medium' | 'high'
  }
  safetyWarnings: {
    level: 'low' | 'medium' | 'high' | 'critical'
    description: string
  }[]
  tierUsed: ExperimentTier
  canEscalate: boolean
}

export interface SimulationInterventionData {
  metrics: {
    name: string
    value: number
    unit: string
    confidence: number
  }[]
  tierUsed: SimulationTierNumber
  escalationAvailable: boolean
  estimatedImprovementIfEscalated?: string
  additionalCostIfEscalated?: number
}

export interface ValidationInterventionData {
  overallScore: number
  passedChecks: number
  totalChecks: number
  criticalFailures: {
    check: string
    reason: string
    recommendation: string
  }[]
  benchmarkComparisons: {
    metric: string
    value: number
    benchmark: number
    unit: string
    status: 'above' | 'at' | 'below'
  }[]
}

export type InterventionData =
  | ResearchInterventionData
  | HypothesisInterventionData
  | ExperimentInterventionData
  | SimulationInterventionData
  | ValidationInterventionData

// ============================================================================
// User Feedback Types
// ============================================================================

export type FeedbackType =
  | 'thumbs_up'
  | 'thumbs_down'
  | 'flag'                       // Flag for review
  | 'note'                       // Add note/comment
  | 'edit'                       // User edited something

export interface UserFeedback {
  id: string
  discoveryId: string
  phase: DiscoveryPhase
  feedbackType: FeedbackType
  targetId: string               // Hypothesis ID, source ID, etc.
  targetType: 'hypothesis' | 'source' | 'experiment' | 'result' | 'metric'
  comment?: string
  suggestedImprovement?: string
  timestamp: number
  incorporated?: boolean         // Whether feedback was incorporated
}

export interface FeedbackSummary {
  discoveryId: string
  totalFeedback: number
  byType: Record<FeedbackType, number>
  byPhase: Record<DiscoveryPhase, number>
  incorporatedCount: number
}

// ============================================================================
// Editable Content Types
// ============================================================================

export interface EditableHypothesis {
  id: string
  originalTitle: string
  originalStatement: string
  modifiedTitle?: string
  modifiedStatement?: string
  userNotes?: string
  userConfidence?: number        // 0-100
  isUserCreated: boolean
  isUserModified: boolean
  modifications: {
    field: string
    oldValue: string
    newValue: string
    timestamp: number
    reason?: string
  }[]
}

export interface EditableExperimentStep {
  stepNumber: number
  originalDescription: string
  modifiedDescription?: string
  userWarning?: string
  skipStep: boolean
  additionalNotes?: string
}

export interface EditableProtocol {
  protocolId: string
  steps: EditableExperimentStep[]
  addedMaterials: string[]
  removedMaterials: string[]
  userSafetyNotes: string[]
  overallNotes: string
}

// ============================================================================
// Discovery State Types
// ============================================================================

export type DiscoveryState =
  | 'configuring'                // User configuring options
  | 'starting'                   // Discovery starting
  | 'running'                    // Phase executing
  | 'paused'                     // User paused
  | 'awaiting_intervention'      // Waiting for user input
  | 'completed'                  // Successfully completed
  | 'failed'                     // Failed with error
  | 'cancelled'                  // User cancelled

export interface DiscoveryStateInfo {
  state: DiscoveryState
  currentPhase?: DiscoveryPhase
  currentIteration?: number
  pendingIntervention?: PhaseInterventionPoint
  pausedAt?: number
  canResume: boolean
  canCancel: boolean
  estimatedTimeRemaining?: number
}

// ============================================================================
// Pause/Resume Types
// ============================================================================

export interface PauseRequest {
  discoveryId: string
  reason?: string
  pauseAfterCurrentPhase: boolean
}

export interface ResumeRequest {
  discoveryId: string
  modifications?: {
    phaseSettings?: Partial<Record<DiscoveryPhase, PhaseSettings>>
    experimentTier?: ExperimentTier
    simulationTier?: SimulationTierNumber
  }
}

export interface PauseState {
  isPaused: boolean
  pausedAt?: number
  pauseReason?: string
  currentPhaseWhenPaused?: DiscoveryPhase
  canResumeFrom: DiscoveryPhase[]
}

// ============================================================================
// Domain Configuration
// ============================================================================

export interface DomainConfig {
  id: Domain
  name: string
  description: string
  icon: string                   // Lucide icon name
  defaultPriorityMetrics: string[]
  suggestedMaterials: string[]
  relevantPhases: DiscoveryPhase[]
  typicalExperimentTier: ExperimentTier
  typicalSimulationTier: SimulationTierNumber
}

/**
 * Domain configurations using consolidated 4-phase model
 * All domains enable all 4 consolidated phases by default
 */
export const DOMAIN_CONFIGS: DomainConfig[] = [
  {
    id: 'solar-photovoltaics',
    name: 'Solar Photovoltaics',
    description: 'Photovoltaic materials and device optimization',
    icon: 'Sun',
    defaultPriorityMetrics: ['efficiency', 'stability', 'cost'],
    suggestedMaterials: ['perovskite', 'silicon', 'CIGS', 'CdTe'],
    relevantPhases: ['research', 'hypothesis', 'validation', 'output'] as DiscoveryPhase[],
    typicalExperimentTier: 2,
    typicalSimulationTier: 2,
  },
  {
    id: 'battery-storage',
    name: 'Battery Storage',
    description: 'Battery materials, electrolytes, and cell design',
    icon: 'Battery',
    defaultPriorityMetrics: ['energy-density', 'cycle-life', 'safety', 'cost'],
    suggestedMaterials: ['LFP', 'NMC', 'solid-electrolyte', 'lithium-metal'],
    relevantPhases: ['research', 'hypothesis', 'validation', 'output'] as DiscoveryPhase[],
    typicalExperimentTier: 2,
    typicalSimulationTier: 2,
  },
  {
    id: 'carbon-capture',
    name: 'Carbon Capture',
    description: 'CO2 capture materials and processes',
    icon: 'Cloud',
    defaultPriorityMetrics: ['capacity', 'selectivity', 'regeneration-energy', 'cost'],
    suggestedMaterials: ['MOF', 'zeolite', 'amine-sorbent', 'ionic-liquid'],
    relevantPhases: ['research', 'hypothesis', 'validation', 'output'] as DiscoveryPhase[],
    typicalExperimentTier: 2,
    typicalSimulationTier: 2,
  },
  {
    id: 'direct-air-capture',
    name: 'Direct Air Capture',
    description: 'Atmospheric CO2 removal technologies',
    icon: 'Wind',
    defaultPriorityMetrics: ['energy-efficiency', 'cost-per-ton', 'durability'],
    suggestedMaterials: ['sorbent', 'membrane', 'electrocatalyst'],
    relevantPhases: ['research', 'hypothesis', 'validation', 'output'] as DiscoveryPhase[],
    typicalExperimentTier: 2,
    typicalSimulationTier: 2,
  },
  {
    id: 'fuel-cells',
    name: 'Fuel Cells',
    description: 'Fuel cell materials and system design',
    icon: 'Zap',
    defaultPriorityMetrics: ['power-density', 'efficiency', 'durability', 'cost'],
    suggestedMaterials: ['platinum', 'SOFC-cathode', 'PEM-membrane', 'catalyst'],
    relevantPhases: ['research', 'hypothesis', 'validation', 'output'] as DiscoveryPhase[],
    typicalExperimentTier: 2,
    typicalSimulationTier: 3,
  },
  {
    id: 'electrolyzers',
    name: 'Electrolyzers',
    description: 'Water splitting and hydrogen production',
    icon: 'Droplets',
    defaultPriorityMetrics: ['efficiency', 'current-density', 'durability', 'cost'],
    suggestedMaterials: ['PEM-catalyst', 'SOEC-electrode', 'alkaline-membrane'],
    relevantPhases: ['research', 'hypothesis', 'validation', 'output'] as DiscoveryPhase[],
    typicalExperimentTier: 2,
    typicalSimulationTier: 3,
  },
  {
    id: 'hydrogen-storage',
    name: 'Hydrogen Storage',
    description: 'Hydrogen storage materials and systems',
    icon: 'Atom',
    defaultPriorityMetrics: ['gravimetric-capacity', 'volumetric-capacity', 'kinetics'],
    suggestedMaterials: ['metal-hydride', 'MOF', 'carbon-nanotube', 'ammonia'],
    relevantPhases: ['research', 'hypothesis', 'validation', 'output'] as DiscoveryPhase[],
    typicalExperimentTier: 2,
    typicalSimulationTier: 2,
  },
  {
    id: 'catalysis',
    name: 'Catalysis',
    description: 'Heterogeneous and homogeneous catalysts',
    icon: 'FlaskConical',
    defaultPriorityMetrics: ['activity', 'selectivity', 'stability', 'cost'],
    suggestedMaterials: ['transition-metal', 'single-atom', 'bimetallic', 'zeolite'],
    relevantPhases: ['research', 'hypothesis', 'validation', 'output'] as DiscoveryPhase[],
    typicalExperimentTier: 3,
    typicalSimulationTier: 3,
  },
  {
    id: 'thermoelectrics',
    name: 'Thermoelectrics',
    description: 'Thermoelectric materials for waste heat recovery',
    icon: 'Thermometer',
    defaultPriorityMetrics: ['ZT', 'power-factor', 'thermal-stability'],
    suggestedMaterials: ['bismuth-telluride', 'skutterudite', 'half-heusler'],
    relevantPhases: ['research', 'hypothesis', 'validation', 'output'] as DiscoveryPhase[],
    typicalExperimentTier: 2,
    typicalSimulationTier: 3,
  },
  {
    id: 'custom',
    name: 'Custom Domain',
    description: 'Define your own research domain',
    icon: 'Settings',
    defaultPriorityMetrics: [],
    suggestedMaterials: [],
    relevantPhases: ['research', 'hypothesis', 'validation', 'output'] as DiscoveryPhase[],
    typicalExperimentTier: 2,
    typicalSimulationTier: 2,
  },
]

// ============================================================================
// Helper Functions
// ============================================================================

export function getDomainConfig(domain: Domain): DomainConfig {
  return DOMAIN_CONFIGS.find(d => d.id === domain) || DOMAIN_CONFIGS[DOMAIN_CONFIGS.length - 1]
}

/**
 * Get default phase settings for a domain using consolidated 4-phase model
 */
export function getDefaultPhaseSettings(domain: Domain): Map<DiscoveryPhase, PhaseSettings> {
  const config = getDomainConfig(domain)
  const settings = new Map<DiscoveryPhase, PhaseSettings>()

  // Consolidated 4-phase model
  const allPhases: DiscoveryPhase[] = ['research', 'hypothesis', 'validation', 'output']

  allPhases.forEach(phase => {
    settings.set(phase, {
      enabled: config.relevantPhases.includes(phase),
      maxIterations: phase === 'hypothesis' ? 5 : phase === 'validation' ? 4 : 3, // Phase-specific iterations
    })
  })

  return settings
}

export function isPhaseInterventionRequired(
  phase: DiscoveryPhase,
  interactionLevel: InteractionLevel
): boolean {
  if (interactionLevel === 'autonomous') return false
  if (interactionLevel === 'manual') return true

  // 'guided' mode - only key decision points in consolidated 4-phase model
  const guidedInterventionPhases: DiscoveryPhase[] = [
    'hypothesis',   // Select hypotheses and approve protocols
    'validation',   // Accept/reject findings
  ]

  return guidedInterventionPhases.includes(phase)
}

export function createDefaultIntervention(
  phase: DiscoveryPhase,
  type: InterventionType,
  data: unknown
): PhaseInterventionPoint {
  return {
    id: `intervention_${phase}_${Date.now()}`,
    type,
    phase,
    title: `${phase.charAt(0).toUpperCase() + phase.slice(1)} Review`,
    message: `Review the ${phase} phase results before continuing.`,
    options: [
      {
        id: 'continue',
        label: 'Continue',
        action: 'continue',
        variant: 'primary',
      },
      {
        id: 'retry',
        label: 'Retry Phase',
        action: 'retry',
        variant: 'secondary',
      },
      {
        id: 'skip',
        label: 'Skip',
        action: 'skip',
        variant: 'outline',
      },
    ],
    data,
    timestamp: Date.now(),
    canDismiss: type === 'review_recommended',
  }
}
