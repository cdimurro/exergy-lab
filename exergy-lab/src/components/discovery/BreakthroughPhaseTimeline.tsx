'use client'

/**
 * BreakthroughPhaseTimeline Component
 *
 * Displays the Breakthrough Engine's 4-phase pipeline with status indicators.
 * Matches the Discovery Engine phases for consistent UX:
 * - Research (literature synthesis, gap identification)
 * - Hypothesis (5 HypGen agents + racing/refinement combined)
 * - Validation (GPU simulation, physics checks)
 * - Results (final breakthrough results)
 */

import { cn } from '@/lib/utils'
import {
  BookOpen,
  Lightbulb,
  FlaskConical,
  Trophy,
  Check,
  X,
  Loader2,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export type BreakthroughEnginePhase =
  | 'idle'
  | 'research'
  | 'hypothesis'    // Combined generation + racing
  | 'generation'    // Legacy - maps to hypothesis
  | 'racing'        // Legacy - maps to hypothesis
  | 'validation'
  | 'complete'
  | 'failed'

export interface PhaseProgress {
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress?: number
  score?: number
  message?: string
}

// Map legacy phase names to new unified phases
function normalizePhase(phase: BreakthroughEnginePhase): BreakthroughEnginePhase {
  if (phase === 'generation' || phase === 'racing') {
    return 'hypothesis'
  }
  return phase
}

// ============================================================================
// Phase Configuration
// ============================================================================

const PHASE_CONFIG: Record<
  'research' | 'hypothesis' | 'validation' | 'complete',
  {
    id: BreakthroughEnginePhase
    name: string
    shortName: string
    description: string
    icon: React.ComponentType<{ size?: number; className?: string }>
  }
> = {
  research: {
    id: 'research',
    name: 'Research',
    shortName: 'Research',
    description: 'Literature synthesis and gap identification',
    icon: BookOpen,
  },
  hypothesis: {
    id: 'hypothesis',
    name: 'Hypothesis',
    shortName: 'Hypothesis',
    description: '5 agents generate and race hypotheses',
    icon: Lightbulb,
  },
  validation: {
    id: 'validation',
    name: 'Validation',
    shortName: 'Validate',
    description: 'GPU simulation and physics checks',
    icon: FlaskConical,
  },
  complete: {
    id: 'complete',
    name: 'Complete',
    shortName: 'Results',
    description: 'Final breakthrough results',
    icon: Trophy,
  },
}

const PHASE_ORDER: ('research' | 'hypothesis' | 'validation' | 'complete')[] = [
  'research',
  'hypothesis',
  'validation',
  'complete',
]

// ============================================================================
// Color System
// ============================================================================

const PHASE_COLORS = {
  pending: {
    icon: 'text-muted-foreground/50',
    bg: 'bg-transparent',
    border: 'border-muted',
    text: 'text-muted-foreground/70',
  },
  running: {
    icon: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500',
    text: 'text-blue-600',
  },
  completed: {
    icon: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500',
    text: 'text-emerald-600',
  },
  failed: {
    icon: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500',
    text: 'text-red-600',
  },
}

// ============================================================================
// Helper Functions
// ============================================================================

function getPhaseStatus(
  phase: 'research' | 'hypothesis' | 'validation' | 'complete',
  currentPhase: BreakthroughEnginePhase | null,
  completedPhases: Set<BreakthroughEnginePhase>
): 'pending' | 'running' | 'completed' | 'failed' {
  // Normalize both phases for comparison
  const normalizedCurrent = currentPhase ? normalizePhase(currentPhase) : null

  if (completedPhases.has(phase)) return 'completed'
  if (normalizedCurrent === phase) return 'running'
  if (currentPhase === 'failed') return 'failed'
  return 'pending'
}

// ============================================================================
// Props Interface
// ============================================================================

interface BreakthroughPhaseTimelineProps {
  currentPhase: BreakthroughEnginePhase | null
  phaseProgress?: Map<BreakthroughEnginePhase, PhaseProgress>
  layout?: 'horizontal' | 'vertical' | 'compact'
  showLabels?: boolean
  showProgress?: boolean
  className?: string
}

// ============================================================================
// Main Component
// ============================================================================

export function BreakthroughPhaseTimeline({
  currentPhase,
  phaseProgress,
  layout = 'horizontal',
  showLabels = true,
  showProgress = true,
  className,
}: BreakthroughPhaseTimelineProps) {
  // Normalize the current phase (generation/racing -> hypothesis)
  const normalizedCurrentPhase = currentPhase ? normalizePhase(currentPhase) : null

  // Determine which phases are completed
  const completedPhases = new Set<BreakthroughEnginePhase>()

  if (normalizedCurrentPhase) {
    const currentIndex = PHASE_ORDER.indexOf(
      normalizedCurrentPhase as 'research' | 'hypothesis' | 'validation' | 'complete'
    )
    if (currentIndex > 0) {
      PHASE_ORDER.slice(0, currentIndex).forEach((phase) =>
        completedPhases.add(phase)
      )
    }
    // If complete, mark all as completed
    if (normalizedCurrentPhase === 'complete') {
      PHASE_ORDER.forEach((phase) => completedPhases.add(phase))
    }
  }

  // Also check phaseProgress for completed phases
  if (phaseProgress) {
    phaseProgress.forEach((progress, phase) => {
      if (progress.status === 'completed') {
        // Normalize legacy phases
        const normalizedPhase = normalizePhase(phase)
        completedPhases.add(normalizedPhase)
      }
    })
  }

  if (layout === 'compact') {
    return (
      <CompactTimeline
        currentPhase={currentPhase}
        completedPhases={completedPhases}
        phaseProgress={phaseProgress}
        className={className}
      />
    )
  }

  if (layout === 'vertical') {
    return (
      <VerticalTimeline
        currentPhase={currentPhase}
        completedPhases={completedPhases}
        phaseProgress={phaseProgress}
        showProgress={showProgress}
        className={className}
      />
    )
  }

  return (
    <div className={cn('w-full px-4', className)}>
      <div className="flex items-start justify-between">
        {PHASE_ORDER.map((phaseId, index) => {
          const config = PHASE_CONFIG[phaseId]
          const status = getPhaseStatus(phaseId, currentPhase, completedPhases)
          const progress = phaseProgress?.get(phaseId)
          const colors = PHASE_COLORS[status]
          const Icon = config.icon
          const isLast = index === PHASE_ORDER.length - 1

          return (
            <div
              key={phaseId}
              className={cn('flex items-start', !isLast && 'flex-1')}
            >
              {/* Phase Node */}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    'border-2 transition-all duration-300',
                    colors.bg,
                    colors.border,
                    status === 'running' &&
                      'ring-2 ring-offset-2 ring-blue-500/30'
                  )}
                >
                  {/* Status indicator badges */}
                  {status === 'running' && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                  )}
                  {status === 'completed' && (
                    <Check
                      size={12}
                      className="absolute -top-1 -right-1 w-4 h-4 text-emerald-500 bg-background rounded-full"
                    />
                  )}
                  {status === 'failed' && (
                    <X
                      size={12}
                      className="absolute -top-1 -right-1 w-4 h-4 text-red-500 bg-background rounded-full"
                    />
                  )}

                  {/* Icon */}
                  {status === 'running' ? (
                    <Loader2
                      size={24}
                      className={cn(colors.icon, 'animate-spin')}
                    />
                  ) : (
                    <Icon size={24} className={colors.icon} />
                  )}
                </div>

                {/* Label */}
                {showLabels && (
                  <span
                    className={cn(
                      'text-xs font-medium text-center max-w-[80px]',
                      colors.text
                    )}
                  >
                    {config.shortName}
                  </span>
                )}

                {/* Progress percentage */}
                {showProgress && status === 'running' && progress?.progress && (
                  <span className="text-xs font-semibold text-blue-600 tabular-nums">
                    {Math.round(progress.progress)}%
                  </span>
                )}
              </div>

              {/* Connector */}
              {!isLast && (
                <div className="flex-1 relative h-1.5 mx-3 mt-6 min-w-[24px]">
                  {/* Background track */}
                  <div className="absolute inset-0 bg-muted rounded-full" />

                  {/* Progress fill */}
                  <div
                    className={cn(
                      'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
                      status === 'completed' && 'bg-emerald-500 w-full',
                      status === 'running' && 'bg-blue-500 w-full animate-pulse',
                      status === 'pending' && 'w-0'
                    )}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Compact Timeline (for headers)
// ============================================================================

function CompactTimeline({
  currentPhase,
  completedPhases,
  phaseProgress,
  className,
}: {
  currentPhase: BreakthroughEnginePhase | null
  completedPhases: Set<BreakthroughEnginePhase>
  phaseProgress?: Map<BreakthroughEnginePhase, PhaseProgress>
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {PHASE_ORDER.map((phaseId, index) => {
        const status = getPhaseStatus(phaseId, currentPhase, completedPhases)
        const isLast = index === PHASE_ORDER.length - 1

        return (
          <div key={phaseId} className="flex items-center gap-2">
            {/* Dot indicator */}
            <div
              className={cn(
                'w-2.5 h-2.5 rounded-full transition-all',
                status === 'completed' && 'bg-emerald-500',
                status === 'running' && 'bg-blue-500 animate-pulse',
                status === 'pending' && 'bg-muted',
                status === 'failed' && 'bg-red-500'
              )}
            />

            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  'w-6 h-0.5 rounded-full',
                  status === 'completed' && 'bg-emerald-500',
                  status === 'running' && 'bg-blue-500',
                  status === 'pending' && 'bg-muted'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// Vertical Timeline (for mobile/sidebar)
// ============================================================================

function VerticalTimeline({
  currentPhase,
  completedPhases,
  phaseProgress,
  showProgress,
  className,
}: {
  currentPhase: BreakthroughEnginePhase | null
  completedPhases: Set<BreakthroughEnginePhase>
  phaseProgress?: Map<BreakthroughEnginePhase, PhaseProgress>
  showProgress: boolean
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {PHASE_ORDER.map((phaseId, index) => {
        const config = PHASE_CONFIG[phaseId]
        const status = getPhaseStatus(phaseId, currentPhase, completedPhases)
        const progress = phaseProgress?.get(phaseId)
        const colors = PHASE_COLORS[status]
        const Icon = config.icon
        const isLast = index === PHASE_ORDER.length - 1

        return (
          <div key={phaseId} className="flex items-start gap-3">
            {/* Timeline line and node */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  'border transition-all',
                  colors.bg,
                  colors.border
                )}
              >
                {status === 'running' ? (
                  <Loader2
                    size={16}
                    className={cn(colors.icon, 'animate-spin')}
                  />
                ) : status === 'completed' ? (
                  <Check size={16} className={colors.icon} />
                ) : status === 'failed' ? (
                  <X size={16} className={colors.icon} />
                ) : (
                  <Icon size={16} className={colors.icon} />
                )}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'w-0.5 h-6 mt-1',
                    status === 'completed' && 'bg-emerald-500',
                    status === 'running' && 'bg-blue-500',
                    status === 'pending' && 'bg-muted'
                  )}
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pb-4">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-sm font-medium',
                    status === 'running' && 'text-blue-600',
                    status === 'completed' && 'text-foreground',
                    status === 'pending' && 'text-muted-foreground',
                    status === 'failed' && 'text-red-600'
                  )}
                >
                  {config.name}
                </span>
                {status === 'running' && showProgress && progress?.progress && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-medium tabular-nums">
                    {Math.round(progress.progress)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {status === 'running' && progress?.message
                  ? progress.message
                  : config.description}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default BreakthroughPhaseTimeline
