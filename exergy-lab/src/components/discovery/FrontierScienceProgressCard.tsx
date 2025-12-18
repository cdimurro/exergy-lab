'use client'

/**
 * FrontierScienceProgressCard Component
 *
 * Main progress display during FrontierScience discovery execution.
 * Shows real-time progress with phase timeline, iteration tracking, and rubric scores.
 */

import { cn } from '@/lib/utils'
import type { DiscoveryPhase, PhaseProgressDisplay } from '@/types/frontierscience'
import { getPhaseMetadata } from '@/types/frontierscience'
import { PhaseTimeline } from './PhaseTimeline'
import { IterationBadge, IterationDots } from './IterationBadge'
import { ThinkingIndicator, PulsingBrain } from './ThinkingIndicator'
import { RubricScoreCard, RubricProgressBar } from './RubricScoreCard'
import { QualityBadge } from './QualityBadge'
import { PhaseResultsDropdown, generatePhaseKeyFindings } from './PhaseResultsDropdown'
import { X, Clock, Zap, ChevronDown, ChevronUp } from 'lucide-react'
import React, { useState } from 'react'

interface FrontierScienceProgressCardProps {
  query: string
  currentPhase: DiscoveryPhase | null
  phaseProgress: Map<DiscoveryPhase, PhaseProgressDisplay>
  overallProgress: number
  elapsedTime: number
  thinkingMessage: string | null
  onCancel?: () => void
  className?: string
}

export function FrontierScienceProgressCard({
  query,
  currentPhase,
  phaseProgress,
  overallProgress,
  elapsedTime,
  thinkingMessage,
  onCancel,
  className,
}: FrontierScienceProgressCardProps) {
  const [showRubricDetails, setShowRubricDetails] = useState(false)
  const [selectedPhase, setSelectedPhase] = useState<DiscoveryPhase | null>(null)
  const [lastCompletedPhase, setLastCompletedPhase] = useState<DiscoveryPhase | null>(null)

  const currentProgress = currentPhase ? phaseProgress.get(currentPhase) : null
  const phaseMeta = currentPhase ? getPhaseMetadata(currentPhase) : null

  // Auto-expand the most recently completed phase
  React.useEffect(() => {
    const completedPhases = Array.from(phaseProgress.entries())
      .filter(([_, p]) => p.status === 'completed')
      .map(([phase]) => phase)

    const latestCompleted = completedPhases[completedPhases.length - 1]
    if (latestCompleted && latestCompleted !== lastCompletedPhase) {
      setLastCompletedPhase(latestCompleted)
      setSelectedPhase(latestCompleted)
    }
  }, [phaseProgress, lastCompletedPhase])

  const handlePhaseClick = (phase: DiscoveryPhase) => {
    setSelectedPhase(phase === selectedPhase ? null : phase)
  }

  // Format elapsed time
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Estimate remaining time based on progress
  const estimatedTotal = overallProgress > 0 ? (elapsedTime / overallProgress) * 100 : 0
  const estimatedRemaining = Math.max(0, estimatedTotal - elapsedTime)

  return (
    <div className={cn('border rounded-xl overflow-hidden bg-card flex flex-col max-h-[80vh]', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <PulsingBrain />
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Discovery Engine
            </h3>
            <p className="text-xs text-muted-foreground truncate max-w-[300px]">
              {query}
            </p>
          </div>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title="Cancel discovery"
          >
            <X size={16} className="text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Overall Progress */}
        <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Overall Progress
          </span>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatTime(elapsedTime)}
            </span>
            {estimatedRemaining > 0 && overallProgress > 10 && (
              <span className="flex items-center gap-1">
                <Zap size={12} />
                ~{formatTime(estimatedRemaining)} left
              </span>
            )}
          </div>
        </div>
        <div className="relative">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, overallProgress)}%` }}
            />
          </div>
          <span className="absolute right-0 top-3 text-xs text-muted-foreground">
            {Math.round(overallProgress)}%
          </span>
        </div>
      </div>

      {/* Phase Timeline */}
      <div className="p-4 border-b">
        <div className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
          Phase Timeline
        </div>
        <PhaseTimeline
          phaseProgress={phaseProgress}
          currentPhase={currentPhase}
          showScores={true}
          showLabels={true}
          compact={false}
          onPhaseClick={handlePhaseClick}
        />
      </div>

      {/* Selected Phase Details */}
      {selectedPhase && (() => {
        const selectedProgress = phaseProgress.get(selectedPhase)
        const selectedMeta = getPhaseMetadata(selectedPhase)
        const keyFindings = generatePhaseKeyFindings(selectedPhase, null, selectedProgress?.judgeResult)

        return selectedProgress && (
          <div className="p-4 border-b bg-gradient-to-br from-blue-500/5 to-purple-500/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {selectedMeta.name}
                </span>
                {selectedProgress.score !== undefined && (
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    selectedProgress.passed
                      ? 'bg-emerald-500/20 text-emerald-600'
                      : 'bg-amber-500/20 text-amber-600'
                  )}>
                    {selectedProgress.score.toFixed(1)}/10
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedPhase(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-muted-foreground mb-3">
              {selectedMeta.description}
            </p>

            {keyFindings && (
              <PhaseResultsDropdown
                phase={selectedPhase}
                phaseName={selectedMeta.name}
                status={selectedProgress.status as any}
                results={keyFindings}
              />
            )}
          </div>
        )
      })()}

      {/* Current Phase Details */}
      {currentPhase && currentProgress && (
        <div className="p-4 border-b bg-blue-500/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                Current: {phaseMeta?.name}
              </span>
              <IterationBadge
                current={currentProgress.currentIteration}
                max={currentProgress.maxIterations}
                score={currentProgress.score}
                isActive={true}
                size="sm"
              />
            </div>
            <IterationDots
              current={currentProgress.currentIteration}
              max={currentProgress.maxIterations}
            />
          </div>

          {/* Phase description */}
          <p className="text-xs text-muted-foreground mb-3">
            {phaseMeta?.description}
          </p>

          {/* Thinking indicator */}
          {thinkingMessage && (
            <ThinkingIndicator
              message={thinkingMessage}
              phase={phaseMeta?.shortName}
              isActive={true}
              variant="default"
            />
          )}

          {/* Current rubric score if available */}
          {currentProgress.judgeResult && (
            <div className="mt-3">
              <RubricScoreCard
                judgeResult={currentProgress.judgeResult}
                showDetails={showRubricDetails}
                initialExpanded={false}
              />
            </div>
          )}
        </div>
      )}

        {/* Completed Phases Summary */}
        <CompletedPhasesSummary phaseProgress={phaseProgress} />
      </div>
    </div>
  )
}

/**
 * Summary of completed phases with expandable results
 */
function CompletedPhasesSummary({
  phaseProgress,
}: {
  phaseProgress: Map<DiscoveryPhase, PhaseProgressDisplay>
}) {
  const [expandedView, setExpandedView] = useState(false)

  const completedPhases = Array.from(phaseProgress.entries())
    .filter(([_, p]) => p.status === 'completed')
    .map(([phase, p]) => ({ ...p, phase }))

  if (completedPhases.length === 0) return null

  const passedCount = completedPhases.filter(p => p.passed).length
  const avgScore = completedPhases.reduce((sum, p) => sum + (p.score || 0), 0) / completedPhases.length

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Completed Phases
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-600 font-medium">
              {passedCount}/{completedPhases.length} passed
            </span>
            <span className="text-muted-foreground">
              avg: {avgScore.toFixed(1)}/10
            </span>
          </div>
          <button
            onClick={() => setExpandedView(!expandedView)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expandedView ? (
              <>
                <ChevronUp size={14} />
                <span>Hide details</span>
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                <span>Show details</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Compact view - just badges */}
      {!expandedView && (
        <div className="flex flex-wrap gap-2">
          {completedPhases.map(({ phase, score, passed }) => {
            const meta = getPhaseMetadata(phase)
            return (
              <div
                key={phase}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs',
                  passed
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'bg-amber-500/10 text-amber-600'
                )}
              >
                <span>{meta.shortName}</span>
                <span className="opacity-70">{score?.toFixed(1)}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Expanded view - with phase results dropdowns */}
      {expandedView && (
        <div className="space-y-4 mt-4">
          {completedPhases.map(({ phase, score, passed, judgeResult }) => {
            const meta = getPhaseMetadata(phase)
            // Generate key findings from judgeResult (available during progress)
            const keyFindings = generatePhaseKeyFindings(phase, null, judgeResult)

            return (
              <div
                key={phase}
                className={cn(
                  'p-3 rounded-lg border',
                  passed
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-amber-500/30 bg-amber-500/5'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {meta.name}
                    </span>
                    <span
                      className={cn(
                        'text-xs px-1.5 py-0.5 rounded',
                        passed ? 'bg-emerald-500/20 text-emerald-600' : 'bg-amber-500/20 text-amber-600'
                      )}
                    >
                      {score?.toFixed(1)}/10
                    </span>
                  </div>
                  <span
                    className={cn(
                      'text-xs',
                      passed ? 'text-emerald-600' : 'text-amber-600'
                    )}
                  >
                    {passed ? 'Passed' : 'Needs improvement'}
                  </span>
                </div>

                {/* Phase Results Dropdown */}
                {keyFindings && (
                  <PhaseResultsDropdown
                    phase={phase}
                    phaseName={meta.name}
                    status="completed"
                    results={keyFindings}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * Minimal progress indicator for inline use
 */
interface MinimalProgressProps {
  overallProgress: number
  currentPhase: DiscoveryPhase | null
  className?: string
}

export function MinimalProgress({
  overallProgress,
  currentPhase,
  className,
}: MinimalProgressProps) {
  const phaseMeta = currentPhase ? getPhaseMetadata(currentPhase) : null

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <PulsingBrain className="shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground truncate">
            {phaseMeta?.shortName || 'Starting...'}
          </span>
          <span className="text-xs text-muted-foreground">
            {Math.round(overallProgress)}%
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, overallProgress)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default FrontierScienceProgressCard
