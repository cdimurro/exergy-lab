'use client'

/**
 * PhaseTimeline Component
 *
 * Displays the 4-step discovery pipeline with status indicators.
 * Supports horizontal (desktop) and vertical (mobile) layouts.
 *
 * Color System:
 * - Future/Pending: muted grey (clear future state)
 * - In Progress: subtle indicator (active work)
 * - Completed: foreground (success)
 * - Failed: muted (needs attention)
 */

import { cn } from '@/lib/utils'
import type { DiscoveryPhase, PhaseProgressDisplay } from '@/types/frontierscience'
import { PHASE_METADATA, getPhaseMetadata } from '@/types/frontierscience'
import {
  BookOpen,
  Combine,
  Lightbulb,
  Filter,
  FlaskConical,
  Cpu,
  Flame,
  Calculator,
  FileText,
  CheckCircle,
  ClipboardCheck,
  FileOutput,
  Check,
  X,
  Loader2,
  Circle,
  AlertCircle,
} from 'lucide-react'
import { CompactQualityIndicator } from './QualityBadge'

// ============================================================================
// Color System Constants
// ============================================================================

const PHASE_COLORS = {
  future: {
    icon: 'text-slate-400',
    bg: 'bg-transparent',
    border: 'border-slate-300',
    text: 'text-slate-500',
  },
  inProgress: {
    icon: 'text-blue-600',
    bg: 'bg-transparent',
    border: 'border-blue-500',
    text: 'text-blue-600',
    ring: 'ring-blue-500/30',
  },
  completed: {
    icon: 'text-emerald-600',
    bg: 'bg-transparent',
    border: 'border-emerald-500',
    text: 'text-emerald-600',
  },
  failed: {
    icon: 'text-amber-600',
    bg: 'bg-transparent',
    border: 'border-amber-500',
    text: 'text-amber-600',
  },
}

function getPhaseColors(status: string, passed?: boolean) {
  if (status === 'pending') return PHASE_COLORS.future
  if (status === 'running') return PHASE_COLORS.inProgress
  if (status === 'completed' && passed) return PHASE_COLORS.completed
  if (status === 'completed' && !passed) return PHASE_COLORS.failed
  if (status === 'failed') return PHASE_COLORS.failed
  return PHASE_COLORS.future
}

/**
 * Phase icons for consolidated 4-phase model:
 * - research: Multi-source research (combines research + synthesis + screening)
 * - hypothesis: Hypothesis & Protocol (combines hypothesis + experiment)
 * - validation: Validation & Analysis (combines simulation + exergy + tea + patent + validation)
 * - output: Final Report (combines rubric_eval + publication)
 */
const PHASE_ICONS: Record<DiscoveryPhase, React.ComponentType<{ size?: number; className?: string }>> = {
  research: BookOpen,
  hypothesis: Lightbulb,
  validation: CheckCircle,
  output: FileOutput,
}

interface PhaseTimelineProps {
  phaseProgress: Map<DiscoveryPhase, PhaseProgressDisplay>
  currentPhase: DiscoveryPhase | null
  selectedPhase?: DiscoveryPhase | null  // Phase currently selected for viewing details
  layout?: 'horizontal' | 'vertical' | 'auto'
  showScores?: boolean
  showLabels?: boolean
  compact?: boolean
  onPhaseClick?: (phase: DiscoveryPhase) => void
  className?: string
}

export function PhaseTimeline({
  phaseProgress,
  currentPhase,
  selectedPhase,
  layout = 'auto',
  showScores = true,
  showLabels = true,
  compact = false,
  onPhaseClick,
  className,
}: PhaseTimelineProps) {
  const phases = PHASE_METADATA

  return (
    <div
      className={cn(
        'w-full',
        layout === 'vertical' && 'flex flex-col',
        className
      )}
    >
      {/* Horizontal layout for desktop - uses flex with connectors that fill available space */}
      <div
        className={cn(
          layout === 'vertical' ? 'hidden' : layout === 'horizontal' ? 'flex' : 'hidden md:flex',
          'items-start w-full px-8'
        )}
      >
        {phases.map((phase, index) => {
          const progress = phaseProgress.get(phase.id)
          const nextPhase = phases[index + 1]
          const nextProgress = nextPhase ? phaseProgress.get(nextPhase.id) : undefined
          const isActive = currentPhase === phase.id
          const Icon = PHASE_ICONS[phase.id]

          return (
            <div key={phase.id} className="flex items-start flex-1 last:flex-none">
              <PhaseNode
                phase={phase.id}
                status={progress?.status || 'pending'}
                score={progress?.score}
                passed={progress?.passed}
                isActive={isActive}
                isSelected={selectedPhase === phase.id}
                showScore={showScores}
                showLabel={showLabels}
                compact={compact}
                Icon={Icon}
                name={phase.shortName}
                onClick={onPhaseClick}
              />
              {index < phases.length - 1 && (
                <PhaseConnector
                  fromStatus={progress?.status || 'pending'}
                  fromPassed={progress?.passed}
                  toStatus={nextProgress?.status || 'pending'}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Vertical layout for mobile */}
      <div
        className={cn(
          layout === 'vertical' ? 'flex' : layout === 'horizontal' ? 'hidden' : 'flex md:hidden',
          'flex-col gap-1'
        )}
      >
        {/* Group phases by category */}
        <PhaseGroup
          title="Research & Analysis"
          phases={phases.filter(p => p.group === 'research')}
          phaseProgress={phaseProgress}
          currentPhase={currentPhase}
          showScores={showScores}
        />
        <PhaseGroup
          title="Validation"
          phases={phases.filter(p => p.group === 'validation')}
          phaseProgress={phaseProgress}
          currentPhase={currentPhase}
          showScores={showScores}
        />
        <PhaseGroup
          title="Output"
          phases={phases.filter(p => p.group === 'output')}
          phaseProgress={phaseProgress}
          currentPhase={currentPhase}
          showScores={showScores}
        />
      </div>
    </div>
  )
}

/**
 * Individual phase node in the timeline
 * Now clickable for ALL statuses (not just completed/running)
 * - Completed phases: Show detailed AI summaries
 * - Running phases: Show live progress
 * - Future/pending phases: Show what will happen
 */
interface PhaseNodeProps {
  phase: DiscoveryPhase
  status: string
  score?: number
  passed?: boolean
  isActive: boolean
  isSelected?: boolean
  showScore: boolean
  showLabel: boolean
  compact: boolean
  Icon: React.ComponentType<{ size?: number; className?: string }>
  name: string
  onClick?: (phase: DiscoveryPhase) => void
}

function PhaseNode({
  phase,
  status,
  score,
  passed,
  isActive,
  isSelected,
  showScore,
  showLabel,
  compact,
  Icon,
  name,
  onClick,
}: PhaseNodeProps) {
  // Larger icon sizes for better visibility with 4 phases
  const iconSize = compact ? 24 : 32
  const nodeSize = compact ? 'w-14 h-14' : 'w-16 h-16'
  const colors = getPhaseColors(status, passed)

  // All phases are now clickable
  const isClickable = !!onClick

  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0">
      {/* Phase Node Button */}
      <button
        type="button"
        onClick={() => onClick?.(phase)}
        className={cn(
          nodeSize,
          'relative rounded-xl flex items-center justify-center',
          'border-2 transition-all duration-300',
          // Use new color system
          colors.bg,
          colors.border,
          // Selected state
          isSelected && 'ring-2 ring-offset-2 ring-blue-500',
          // Active indicator (running phase)
          isActive && status === 'running' && 'ring-2 ring-offset-2 ring-blue-400',
          // Hover effects - all phases now hoverable
          isClickable && 'cursor-pointer hover:scale-105 hover:shadow-md',
          !isClickable && 'cursor-default'
        )}
        title={`${name}: ${status}${score !== undefined ? ` (${score.toFixed(1)}/10)` : ''} - Click to view details`}
      >
        {/* Status indicator badges */}
        {status === 'running' && (
          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-500 rounded-full" />
        )}
        {status === 'completed' && passed && (
          <CheckCircle className="absolute -top-1.5 -right-1.5 w-5 h-5 text-emerald-500 bg-white rounded-full" />
        )}
        {status === 'completed' && !passed && (
          <AlertCircle className="absolute -top-1.5 -right-1.5 w-5 h-5 text-amber-500 bg-white rounded-full" />
        )}
        {status === 'failed' && (
          <X className="absolute -top-1.5 -right-1.5 w-5 h-5 text-red-500 bg-white rounded-full" />
        )}

        {/* Icon - now larger */}
        {status === 'running' ? (
          <Loader2 size={iconSize} className={cn(colors.icon, 'animate-spin')} />
        ) : (
          <Icon size={iconSize} className={colors.icon} />
        )}
      </button>

      {/* Label */}
      {showLabel && (
        <span
          className={cn(
            'text-xs font-medium text-center max-w-[80px] truncate',
            colors.text
          )}
        >
          {name}
        </span>
      )}

      {/* Score (only for completed phases) */}
      {showScore && score !== undefined && status === 'completed' && (
        <span
          className={cn(
            'text-xs font-semibold tabular-nums',
            passed ? 'text-emerald-600' : 'text-amber-600'
          )}
        >
          {score.toFixed(1)}
        </span>
      )}
    </div>
  )
}

/**
 * Progress bar connector between phase nodes
 * Replaced dots with continuous progress bars for clearer visualization
 * - Grey track: baseline for future steps
 * - Green fill: completed connections
 * - Blue fill with pulse: connection to running phase
 */
interface PhaseConnectorProps {
  fromStatus: string
  fromPassed?: boolean
  toStatus: string
}

function PhaseConnector({
  fromStatus,
  fromPassed,
  toStatus,
}: PhaseConnectorProps) {
  const isFromCompleted = fromStatus === 'completed' || fromStatus === 'failed'
  const isToActive = toStatus === 'running'
  const isFromActive = fromStatus === 'running'

  // Determine fill color and width
  const getFillClass = () => {
    // If the previous phase is running and this is the next phase, show blue progress
    if (isFromActive && toStatus === 'pending') return 'bg-blue-500 w-full animate-pulse'
    // If previous phase completed successfully
    if (isFromCompleted && fromPassed) return 'bg-emerald-500 w-full'
    // If previous phase completed but failed
    if (isFromCompleted && !fromPassed) return 'bg-amber-500 w-full'
    // If this phase is currently running
    if (isToActive) return 'bg-blue-500 w-full animate-pulse'
    return 'w-0'
  }

  return (
    <div className="flex-1 relative h-1.5 mx-3 mt-8 self-start min-w-[16px]">
      {/* Background track */}
      <div className="absolute inset-0 bg-slate-200 rounded-full" />

      {/* Progress fill */}
      <div
        className={cn(
          'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
          getFillClass()
        )}
      />
    </div>
  )
}

// Legacy connector for backwards compatibility - can be removed later
function PhaseConnectorLegacy({
  completed,
  active,
}: {
  completed: boolean
  active: boolean
}) {
  return (
    <PhaseConnector
      fromStatus={completed ? 'completed' : 'pending'}
      fromPassed={completed}
      toStatus={active ? 'running' : 'pending'}
    />
  )
}

/**
 * Grouped phases for mobile view
 */
interface PhaseGroupProps {
  title: string
  phases: typeof PHASE_METADATA
  phaseProgress: Map<DiscoveryPhase, PhaseProgressDisplay>
  currentPhase: DiscoveryPhase | null
  showScores: boolean
}

function PhaseGroup({
  title,
  phases,
  phaseProgress,
  currentPhase,
  showScores,
}: PhaseGroupProps) {
  return (
    <div className="border rounded-lg p-3">
      <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
        {title}
      </div>
      <div className="flex flex-col gap-2">
        {phases.map(phase => {
          const progress = phaseProgress.get(phase.id)
          const isActive = currentPhase === phase.id
          const Icon = PHASE_ICONS[phase.id]

          return (
            <div
              key={phase.id}
              className={cn(
                'flex items-center justify-between p-2 rounded-md',
                progress?.status === 'running' && 'bg-blue-500/5',
                progress?.status === 'completed' && progress?.passed && 'bg-emerald-500/5',
                progress?.status === 'completed' && !progress?.passed && 'bg-amber-500/5',
                progress?.status === 'failed' && 'bg-red-500/5'
              )}
            >
              <div className="flex items-center gap-2">
                <PhaseStatusIcon
                  status={progress?.status || 'pending'}
                  passed={progress?.passed}
                  Icon={Icon}
                  isActive={isActive}
                />
                <span
                  className={cn(
                    'text-sm',
                    progress?.status === 'pending' && 'text-muted-foreground',
                    progress?.status === 'running' && 'text-blue-600 font-medium',
                    progress?.status === 'completed' && 'text-foreground',
                    progress?.status === 'failed' && 'text-red-600'
                  )}
                >
                  {phase.shortName}
                </span>
              </div>

              {showScores && progress?.score !== undefined && (
                <CompactQualityIndicator
                  score={progress.score}
                  passed={progress.passed || false}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Status icon for a phase
 */
function PhaseStatusIcon({
  status,
  passed,
  Icon,
  isActive,
}: {
  status: string
  passed?: boolean
  Icon: React.ComponentType<{ size?: number; className?: string }>
  isActive: boolean
}) {
  if (status === 'running') {
    return (
      <div className={cn('relative', isActive && 'animate-pulse')}>
        <Loader2 size={16} className="text-blue-500 animate-spin" />
      </div>
    )
  }

  if (status === 'completed' && passed) {
    return <Check size={16} className="text-emerald-500" />
  }

  if (status === 'completed' && !passed) {
    return <X size={16} className="text-amber-500" />
  }

  if (status === 'failed') {
    return <X size={16} className="text-red-500" />
  }

  return <Circle size={16} className="text-muted-foreground" />
}

export default PhaseTimeline
