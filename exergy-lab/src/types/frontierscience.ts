/**
 * FrontierScience UI Types
 *
 * UI-specific types for the FrontierScience discovery interface.
 * Extends core types from lib/ai/rubrics/types.ts
 */

import type {
  DiscoveryPhase,
  DiscoveryQuality,
  DiscoveryResult,
  PhaseResult,
  JudgeResult,
  ItemScore,
  RefinementHints,
} from '@/lib/ai/rubrics/types'

// Re-export for convenience
export type {
  DiscoveryPhase,
  DiscoveryQuality,
  DiscoveryResult,
  PhaseResult,
  JudgeResult,
  ItemScore,
  RefinementHints,
}

// ============================================================================
// SSE Event Types
// ============================================================================

export type SSEEventType =
  | 'progress'
  | 'iteration'
  | 'judge'
  | 'thinking'
  | 'complete'
  | 'error'
  | 'heartbeat'

export interface SSEProgressEvent {
  type: 'progress'
  phase: DiscoveryPhase
  status: PhaseStatus
  iteration?: number
  maxIterations?: number
  score?: number
  passed?: boolean
  message?: string
}

export interface SSEIterationEvent {
  type: 'iteration'
  phase: DiscoveryPhase
  iteration: number
  maxIterations: number
  judgeResult: JudgeResult
  previousScore?: number
}

export interface SSEThinkingEvent {
  type: 'thinking'
  phase: DiscoveryPhase
  message: string
  details?: string[]
}

export interface SSECompleteEvent {
  type: 'complete'
  discoveryId: string
  status: 'completed'
  result: DiscoveryResultSummary
}

export interface SSEErrorEvent {
  type: 'error'
  discoveryId: string
  status: 'failed'
  error: string
}

export interface SSEHeartbeatEvent {
  type: 'heartbeat'
  status: WorkflowStatus
  elapsed: number
}

export type SSEEvent =
  | SSEProgressEvent
  | SSEIterationEvent
  | SSEThinkingEvent
  | SSECompleteEvent
  | SSEErrorEvent
  | SSEHeartbeatEvent

// ============================================================================
// UI State Types
// ============================================================================

export type WorkflowStatus = 'idle' | 'starting' | 'running' | 'completed' | 'failed'
export type PhaseStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export interface PhaseProgressDisplay {
  phase: DiscoveryPhase
  status: PhaseStatus
  currentIteration: number
  maxIterations: number
  score?: number
  passed?: boolean
  message?: string
  judgeResult?: JudgeResult
  startTime?: number
  endTime?: number
}

export interface DiscoveryResultSummary {
  id: string
  query: string
  domain: string
  overallScore: number
  discoveryQuality: DiscoveryQuality
  recommendations: string[]
  phases: {
    phase: DiscoveryPhase
    finalScore: number
    passed: boolean
    iterationCount: number
    durationMs?: number
    finalOutput?: any
    iterations?: {
      iteration: number
      judgeResult?: {
        totalScore: number
        passed: boolean
        reasoning?: string
        recommendations?: string[]
        itemScores?: any[]
      } | null
      durationMs?: number
    }[]
  }[]
  totalDuration: number
  startTime?: string | Date
  endTime?: string | Date
}

// ============================================================================
// Discovery Options
// ============================================================================

export interface DiscoveryOptions {
  domain?: string
  targetQuality?: 'validated' | 'significant' | 'breakthrough'
  enablePatentAnalysis?: boolean
  enableExergyAnalysis?: boolean
  enableTEAAnalysis?: boolean
  maxIterationsPerPhase?: number
}

// ============================================================================
// Change Request Types
// ============================================================================

export interface ChangeRequest {
  id: string
  request: string
  timestamp: Date
  status: 'pending' | 'reviewing' | 'applied' | 'rejected'
  aiResponse?: string
  changes?: {
    phase: string
    description: string
    applied: boolean
  }[]
}

// ============================================================================
// Hook Return Type
// ============================================================================

export interface UseFrontierScienceWorkflowReturn {
  // State
  discoveryId: string | null
  status: WorkflowStatus
  currentPhase: DiscoveryPhase | null
  phaseProgress: Map<DiscoveryPhase, PhaseProgressDisplay>
  overallProgress: number
  elapsedTime: number
  result: DiscoveryResult | null
  error: string | null
  thinkingMessage: string | null

  // Pause/Resume state
  isPaused: boolean
  pausedAtPhase: DiscoveryPhase | null
  changeRequests: ChangeRequest[]
  pendingChangeRequest: ChangeRequest | null

  // Actions
  startDiscovery: (query: string, options?: DiscoveryOptions) => Promise<void>
  cancelDiscovery: () => void
  pauseDiscovery: () => void
  resumeDiscovery: () => void
  submitChangeRequest: (request: string) => Promise<ChangeRequest>

  // Computed
  qualityTier: DiscoveryQuality | null
  passedPhases: DiscoveryPhase[]
  failedPhases: DiscoveryPhase[]
  completedPhasesCount: number
  totalPhasesCount: number
}

// ============================================================================
// Phase Metadata
// ============================================================================

export interface PhaseMetadata {
  id: DiscoveryPhase
  name: string
  shortName: string
  description: string
  group: 'research' | 'validation' | 'output'
}

export const PHASE_METADATA: PhaseMetadata[] = [
  {
    id: 'research',
    name: 'Multi-Source Research',
    shortName: 'Research',
    description: 'Search 14+ databases for relevant papers, patents, and materials data',
    group: 'research',
  },
  {
    id: 'synthesis',
    name: 'Knowledge Synthesis',
    shortName: 'Synthesis',
    description: 'Identify cross-domain patterns and research gaps',
    group: 'research',
  },
  {
    id: 'hypothesis',
    name: 'Hypothesis Generation',
    shortName: 'Hypothesis',
    description: 'Generate and validate novel scientific hypotheses',
    group: 'research',
  },
  {
    id: 'screening',
    name: 'Computational Screening',
    shortName: 'Screening',
    description: 'Screen candidates using Materials Project data',
    group: 'research',
  },
  {
    id: 'experiment',
    name: 'Experiment Design',
    shortName: 'Experiment',
    description: 'Design reproducible experimental protocols',
    group: 'validation',
  },
  {
    id: 'simulation',
    name: 'Multi-Tier Simulation',
    shortName: 'Simulation',
    description: 'Run browser, AI, and cloud GPU simulations',
    group: 'validation',
  },
  {
    id: 'exergy',
    name: 'Exergy Analysis',
    shortName: 'Exergy',
    description: 'Calculate second-law efficiency and exergy destruction',
    group: 'validation',
  },
  {
    id: 'tea',
    name: 'Techno-Economic Analysis',
    shortName: 'TEA',
    description: 'Calculate NPV, IRR, LCOE, and payback period',
    group: 'validation',
  },
  {
    id: 'patent',
    name: 'Patent Landscape',
    shortName: 'Patent',
    description: 'Analyze USPTO and Google Patents for white space',
    group: 'validation',
  },
  {
    id: 'validation',
    name: 'Validation & Benchmarking',
    shortName: 'Validation',
    description: 'Verify against 800+ physical benchmarks',
    group: 'validation',
  },
  {
    id: 'rubric_eval',
    name: 'Rubric Evaluation',
    shortName: 'Rubric',
    description: 'Final FrontierScience rubric grading',
    group: 'output',
  },
  {
    id: 'publication',
    name: 'Publication Output',
    shortName: 'Publication',
    description: 'Generate publication-ready research report',
    group: 'output',
  },
]

export const ALL_PHASES: DiscoveryPhase[] = PHASE_METADATA.map(p => p.id)

export function getPhaseMetadata(phase: DiscoveryPhase): PhaseMetadata {
  return PHASE_METADATA.find(p => p.id === phase) || PHASE_METADATA[0]
}

// ============================================================================
// Quality Badge Styling
// ============================================================================

export interface QualityBadgeConfig {
  quality: DiscoveryQuality
  label: string
  description: string
  bgClass: string
  textClass: string
  borderClass: string
  icon: 'star' | 'sparkles' | 'check' | 'circle-half' | 'circle'
}

export const QUALITY_BADGE_CONFIG: Record<DiscoveryQuality, QualityBadgeConfig> = {
  breakthrough: {
    quality: 'breakthrough',
    label: 'Breakthrough',
    description: 'Potential for publication, novel contribution',
    bgClass: 'bg-gradient-to-r from-amber-500 to-yellow-400',
    textClass: 'text-white',
    borderClass: 'border-amber-400',
    icon: 'star',
  },
  significant: {
    quality: 'significant',
    label: 'Significant',
    description: 'Strong findings with minor gaps',
    bgClass: 'bg-emerald-500',
    textClass: 'text-white',
    borderClass: 'border-emerald-400',
    icon: 'sparkles',
  },
  validated: {
    quality: 'validated',
    label: 'Validated',
    description: 'Meets FrontierScience threshold',
    bgClass: 'bg-blue-500',
    textClass: 'text-white',
    borderClass: 'border-blue-400',
    icon: 'check',
  },
  promising: {
    quality: 'promising',
    label: 'Promising',
    description: 'Good foundation, needs refinement',
    bgClass: 'bg-cyan-500/20',
    textClass: 'text-cyan-600',
    borderClass: 'border-cyan-400',
    icon: 'circle-half',
  },
  preliminary: {
    quality: 'preliminary',
    label: 'Preliminary',
    description: 'Early stage, significant gaps',
    bgClass: 'bg-gray-200',
    textClass: 'text-gray-600',
    borderClass: 'border-gray-300',
    icon: 'circle',
  },
}

export function getQualityConfig(quality: DiscoveryQuality): QualityBadgeConfig {
  return QUALITY_BADGE_CONFIG[quality]
}
