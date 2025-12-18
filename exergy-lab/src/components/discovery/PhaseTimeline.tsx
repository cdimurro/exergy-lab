'use client'

/**
 * PhaseTimeline Component
 *
 * Displays the 12-phase discovery pipeline with status indicators.
 * Supports horizontal (desktop) and vertical (mobile) layouts.
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
} from 'lucide-react'
import { CompactQualityIndicator } from './QualityBadge'

// Phase icons mapping
const PHASE_ICONS: Record<DiscoveryPhase, React.ComponentType<{ size?: number; className?: string }>> = {
  research: BookOpen,
  synthesis: Combine,
  hypothesis: Lightbulb,
  screening: Filter,
  experiment: FlaskConical,
  simulation: Cpu,
  exergy: Flame,
  tea: Calculator,
  patent: FileText,
  validation: CheckCircle,
  rubric_eval: ClipboardCheck,
  publication: FileOutput,
}

interface PhaseTimelineProps {
  phaseProgress: Map<DiscoveryPhase, PhaseProgressDisplay>
  currentPhase: DiscoveryPhase | null
  layout?: 'horizontal' | 'vertical' | 'auto'
  showScores?: boolean
  showLabels?: boolean
  compact?: boolean
  className?: string
}

export function PhaseTimeline({
  phaseProgress,
  currentPhase,
  layout = 'auto',
  showScores = true,
  showLabels = true,
  compact = false,
  className,
}: PhaseTimelineProps) {
  const phases = PHASE_METADATA

  return (
    <div
      className={cn(
        'w-full',
        layout === 'horizontal' && 'overflow-x-auto',
        layout === 'vertical' && 'flex flex-col',
        layout === 'auto' && 'md:overflow-x-auto',
        className
      )}
    >
      {/* Horizontal layout for desktop */}
      <div
        className={cn(
          layout === 'vertical' ? 'hidden' : layout === 'horizontal' ? 'flex' : 'hidden md:flex',
          'items-start justify-between w-full p-4'
        )}
      >
        {phases.map((phase, index) => {
          const progress = phaseProgress.get(phase.id)
          const isActive = currentPhase === phase.id
          const Icon = PHASE_ICONS[phase.id]

          return (
            <div key={phase.id} className="flex items-center">
              <PhaseNode
                phase={phase.id}
                status={progress?.status || 'pending'}
                score={progress?.score}
                passed={progress?.passed}
                isActive={isActive}
                showScore={showScores}
                showLabel={showLabels}
                compact={compact}
                Icon={Icon}
                name={phase.shortName}
              />
              {index < phases.length - 1 && (
                <PhaseConnector
                  completed={progress?.status === 'completed'}
                  active={isActive}
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
 */
interface PhaseNodeProps {
  phase: DiscoveryPhase
  status: string
  score?: number
  passed?: boolean
  isActive: boolean
  showScore: boolean
  showLabel: boolean
  compact: boolean
  Icon: React.ComponentType<{ size?: number; className?: string }>
  name: string
}

function PhaseNode({
  phase,
  status,
  score,
  passed,
  isActive,
  showScore,
  showLabel,
  compact,
  Icon,
  name,
}: PhaseNodeProps) {
  const iconSize = compact ? 16 : 24
  const nodeSize = compact ? 'w-10 h-10' : 'w-14 h-14'

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          nodeSize,
          'rounded-full flex items-center justify-center',
          'border-2 transition-all duration-300',
          // Pending
          status === 'pending' && 'bg-muted border-muted-foreground/30 text-muted-foreground',
          // Running
          status === 'running' && 'bg-blue-500/10 border-blue-500 text-blue-600',
          // Completed & passed
          status === 'completed' && passed && 'bg-emerald-500 border-emerald-500 text-white',
          // Completed & failed
          status === 'completed' && !passed && 'bg-amber-500 border-amber-500 text-white',
          // Failed
          status === 'failed' && 'bg-red-500/10 border-red-500 text-red-600',
          // Active indicator
          isActive && 'ring-2 ring-blue-400 ring-offset-2'
        )}
        title={`${name}: ${status}${score !== undefined ? ` (${score.toFixed(1)}/10)` : ''}`}
      >
        {status === 'running' ? (
          <Loader2 size={iconSize} className="animate-spin" />
        ) : status === 'completed' && passed ? (
          <Check size={iconSize} />
        ) : status === 'completed' && !passed ? (
          <X size={iconSize} />
        ) : status === 'failed' ? (
          <X size={iconSize} />
        ) : (
          <Icon size={iconSize} />
        )}
      </div>

      {showLabel && (
        <span
          className={cn(
            'text-xs font-medium text-center max-w-[80px] truncate mt-1',
            status === 'pending' && 'text-muted-foreground',
            status === 'running' && 'text-blue-600',
            status === 'completed' && passed && 'text-emerald-600',
            status === 'completed' && !passed && 'text-amber-600',
            status === 'failed' && 'text-red-600'
          )}
        >
          {name}
        </span>
      )}

      {showScore && score !== undefined && (
        <span
          className={cn(
            'text-xs tabular-nums',
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
 * Connector line between phase nodes
 */
function PhaseConnector({
  completed,
  active,
}: {
  completed: boolean
  active: boolean
}) {
  return (
    <div
      className={cn(
        'flex-1 h-0.5 min-w-[8px] max-w-[24px] mx-1 mt-7',
        completed && 'bg-emerald-500',
        active && 'bg-blue-500',
        !completed && !active && 'bg-muted-foreground/30'
      )}
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
