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
  RecoveryRecommendation,
  FailureMode,
} from '@/lib/ai/rubrics/types'
import type { ActivityItem } from '@/components/discovery/LiveActivityFeed'

// Re-export for convenience
export type {
  DiscoveryPhase,
  DiscoveryQuality,
  DiscoveryResult,
  PhaseResult,
  JudgeResult,
  ItemScore,
  RefinementHints,
  RecoveryRecommendation,
  FailureMode,
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

export interface SSEPhaseFailedEvent {
  type: 'phase_failed'
  phase: DiscoveryPhase
  score: number
  threshold: number
  failedCriteria: { id: string; issue: string; suggestion: string }[]
  continuingWithDegradation: boolean
}

export interface SSEPartialCompleteEvent {
  type: 'partial_complete'
  discoveryId: string
  status: 'completed_partial'
  result: PartialDiscoveryResultSummary
  completedPhases: DiscoveryPhase[]
  failedPhases: DiscoveryPhase[]
  recommendations: RecoveryRecommendation[]
}

export type SSEEvent =
  | SSEProgressEvent
  | SSEIterationEvent
  | SSEThinkingEvent
  | SSECompleteEvent
  | SSEErrorEvent
  | SSEHeartbeatEvent
  | SSEPhaseFailedEvent
  | SSEPartialCompleteEvent

// ============================================================================
// UI State Types
// ============================================================================

export type WorkflowStatus = 'idle' | 'starting' | 'running' | 'completed' | 'completed_partial' | 'failed'
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

export interface PartialDiscoveryResultSummary extends DiscoveryResultSummary {
  failureMode: FailureMode
  completedPhases: DiscoveryPhase[]
  failedPhases: DiscoveryPhase[]
  skippedPhases: DiscoveryPhase[]
  degradationReason?: string
  recoveryRecommendations: RecoveryRecommendation[]
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
  /** Discovery mode: breakthrough, synthesis, validation, or parallel (all modes) */
  discoveryMode?: 'breakthrough' | 'synthesis' | 'validation' | 'parallel'
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
  activities: ActivityItem[]

  // Partial results state (graceful degradation)
  partialResult: PartialDiscoveryResultSummary | null
  recoveryRecommendations: RecoveryRecommendation[]
  isPartialResult: boolean

  // Pause/Resume state
  isPaused: boolean
  pausedAtPhase: DiscoveryPhase | null
  changeRequests: ChangeRequest[]
  pendingChangeRequest: ChangeRequest | null

  // Actions
  startDiscovery: (query: string, options?: DiscoveryOptions) => Promise<void>
  cancelDiscovery: () => void
  resetDiscovery: () => void
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

/**
 * Consolidated 4-Phase Model
 *
 * Based on analysis of Robin (FutureHouse), CellAgent, and academic research,
 * we consolidated from 12 phases to 4 phases to improve success probability:
 *
 * - 12 phases × 80% pass rate = 6.9% overall success
 * - 4 phases × 80% pass rate = 41.0% overall success
 *
 * Phase Mapping:
 * - research:    research + synthesis + screening (multi-source research)
 * - hypothesis:  hypothesis + experiment (novel hypothesis + protocol)
 * - validation:  simulation + exergy + tea + patent + validation (all validation)
 * - output:      rubric_eval + publication (final report)
 */
export const PHASE_METADATA: PhaseMetadata[] = [
  {
    id: 'research',
    name: 'Multi-Source Research',
    shortName: 'Research',
    description: 'Search 14+ databases, synthesize knowledge, screen candidates',
    group: 'research',
  },
  {
    id: 'hypothesis',
    name: 'Hypothesis & Protocol',
    shortName: 'Hypothesis',
    description: 'Generate novel hypotheses and design experimental protocols',
    group: 'research',
  },
  {
    id: 'validation',
    name: 'Validation & Analysis',
    shortName: 'Validation',
    description: 'Simulation, exergy, TEA, patents, and physics verification',
    group: 'validation',
  },
  {
    id: 'output',
    name: 'Final Report',
    shortName: 'Report',
    description: 'Quality grading and publication-ready output',
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
    bgClass: 'bg-emerald-600',
    textClass: 'text-white',
    borderClass: 'border-emerald-600',
    icon: 'star',
  },
  significant: {
    quality: 'significant',
    label: 'Significant',
    description: 'Strong findings with minor gaps',
    bgClass: 'bg-emerald-500/20',
    textClass: 'text-emerald-600',
    borderClass: 'border-emerald-500/30',
    icon: 'sparkles',
  },
  validated: {
    quality: 'validated',
    label: 'Validated',
    description: 'Meets FrontierScience threshold',
    bgClass: 'bg-teal-500/20',
    textClass: 'text-teal-600',
    borderClass: 'border-teal-500/30',
    icon: 'check',
  },
  promising: {
    quality: 'promising',
    label: 'Promising',
    description: 'Good foundation, needs refinement',
    bgClass: 'bg-blue-500/15',
    textClass: 'text-blue-600',
    borderClass: 'border-blue-500/25',
    icon: 'circle-half',
  },
  preliminary: {
    quality: 'preliminary',
    label: 'Preliminary',
    description: 'Early stage, significant gaps',
    bgClass: 'bg-muted',
    textClass: 'text-muted-foreground',
    borderClass: 'border-border',
    icon: 'circle',
  },
}

export function getQualityConfig(quality: DiscoveryQuality): QualityBadgeConfig {
  return QUALITY_BADGE_CONFIG[quality]
}
