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
import { LiveActivityFeed, type ActivityItem } from './LiveActivityFeed'
import { X, Clock, Zap, ChevronDown, ChevronUp, Activity } from 'lucide-react'
import React, { useState } from 'react'

interface FrontierScienceProgressCardProps {
  query: string
  currentPhase: DiscoveryPhase | null
  phaseProgress: Map<DiscoveryPhase, PhaseProgressDisplay>
  overallProgress: number
  elapsedTime: number
  thinkingMessage: string | null
  activities?: ActivityItem[]
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
  activities = [],
  onCancel,
  className,
}: FrontierScienceProgressCardProps) {
  const [showRubricDetails, setShowRubricDetails] = useState(false)
  const [selectedPhase, setSelectedPhase] = useState<DiscoveryPhase | null>(null)
  const [lastCompletedPhase, setLastCompletedPhase] = useState<DiscoveryPhase | null>(null)
  const [showActivityFeed, setShowActivityFeed] = useState(true)

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
            <h3 className="text-base font-semibold text-foreground">
              Discovery Engine
            </h3>
            <p className="text-sm text-muted-foreground truncate max-w-[350px]">
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
            <X size={18} className="text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Overall Progress */}
        <div className="p-5 border-b">
        <div className="flex items-center justify-between mb-3">
          <span className="text-base font-semibold text-foreground">
            Overall Progress
          </span>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              {formatTime(elapsedTime)}
            </span>
            {estimatedRemaining > 0 && overallProgress > 10 && (
              <span className="flex items-center gap-1.5">
                <Zap size={14} />
                ~{formatTime(estimatedRemaining)} left
              </span>
            )}
          </div>
        </div>
        <div className="relative">
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, overallProgress)}%` }}
            />
          </div>
          <span className="absolute right-0 top-4 text-sm font-medium text-muted-foreground">
            {Math.round(overallProgress)}%
          </span>
        </div>
      </div>

      {/* Phase Timeline */}
      <div className="p-5 border-b">
        <div className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
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

      {/* Live Activity Feed - Real-time updates during discovery */}
      {activities.length > 0 && (
        <div className="p-5 border-b">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowActivityFeed(!showActivityFeed)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
            >
              <Activity size={14} />
              Live Activity Feed
              {showActivityFeed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <span className="text-xs text-muted-foreground">
              {activities.length} events
            </span>
          </div>
          {showActivityFeed && (
            <LiveActivityFeed
              activities={activities}
              currentPhase={currentPhase}
              maxHeight="250px"
              showTimestamps={true}
            />
          )}
        </div>
      )}

      {/* Phase Details Panel - Shows different content based on selected phase status */}
      {(() => {
        // Determine which phase to show details for
        const displayPhase = selectedPhase || currentPhase
        if (!displayPhase) return null

        const displayProgress = phaseProgress.get(displayPhase)
        const displayMeta = getPhaseMetadata(displayPhase)
        const isCurrentPhase = displayPhase === currentPhase
        const isCompleted = displayProgress?.status === 'completed'
        const isRunning = displayProgress?.status === 'running'
        const keyFindings = generatePhaseKeyFindings(displayPhase, null, displayProgress?.judgeResult)

        // Determine background color based on status
        const bgClass = isRunning
          ? 'bg-blue-500/5'
          : isCompleted && displayProgress?.passed
            ? 'bg-gradient-to-br from-emerald-500/5 to-green-500/5'
            : isCompleted && !displayProgress?.passed
              ? 'bg-gradient-to-br from-amber-500/5 to-orange-500/5'
              : 'bg-muted/30'

        return displayProgress && (
          <div className={cn('p-5 border-b', bgClass)}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {/* Status indicator */}
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium uppercase tracking-wide',
                  isRunning && 'bg-blue-500/20 text-blue-600',
                  isCompleted && displayProgress?.passed && 'bg-emerald-500/20 text-emerald-600',
                  isCompleted && !displayProgress?.passed && 'bg-amber-500/20 text-amber-600',
                  !isRunning && !isCompleted && 'bg-muted text-muted-foreground'
                )}>
                  {isRunning ? 'In Progress' : isCompleted ? (displayProgress?.passed ? 'Passed' : 'Completed') : 'Pending'}
                </span>
                <span className="text-base font-semibold text-foreground">
                  {displayMeta.name}
                </span>
                {displayProgress.score !== undefined && (
                  <span className={cn(
                    'text-sm px-2.5 py-1 rounded-full font-medium',
                    displayProgress.passed
                      ? 'bg-emerald-500/20 text-emerald-600'
                      : 'bg-amber-500/20 text-amber-600'
                  )}>
                    {displayProgress.score.toFixed(1)}/10
                  </span>
                )}
              </div>
              {selectedPhase && (
                <button
                  onClick={() => setSelectedPhase(null)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              {displayMeta.description}
            </p>

            {/* === RUNNING PHASE: Show Real-Time Updates === */}
            {isRunning && (
              <div className="space-y-4">
                {/* Iteration Progress */}
                <div className="flex items-center justify-between bg-background/60 rounded-lg p-3 border border-border/50">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">Iteration Progress</span>
                    <IterationBadge
                      current={displayProgress.currentIteration}
                      max={displayProgress.maxIterations}
                      score={displayProgress.score}
                      isActive={true}
                      size="sm"
                    />
                  </div>
                  <IterationDots
                    current={displayProgress.currentIteration}
                    max={displayProgress.maxIterations}
                  />
                </div>

                {/* Thinking indicator - Real-time status */}
                {thinkingMessage && (
                  <ThinkingIndicator
                    message={thinkingMessage}
                    phase={displayMeta?.shortName}
                    isActive={true}
                    variant="default"
                  />
                )}

                {/* Current rubric score if available during iteration */}
                {displayProgress.judgeResult && (
                  <div className="mt-2">
                    <RubricScoreCard
                      judgeResult={displayProgress.judgeResult}
                      showDetails={showRubricDetails}
                      initialExpanded={false}
                    />
                  </div>
                )}
              </div>
            )}

            {/* === COMPLETED PHASE: Show AI Summary Results === */}
            {isCompleted && keyFindings && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="bg-background/60 rounded-lg p-4 border border-border/50">
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Summary
                  </h4>
                  <p className="text-sm text-foreground leading-relaxed">
                    {keyFindings.summary}
                  </p>
                </div>

                {/* Key Findings */}
                {keyFindings.keyFindings.length > 0 && (
                  <div className="bg-background/60 rounded-lg p-4 border border-border/50">
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Key Findings & Recommendations
                    </h4>
                    <ul className="space-y-2">
                      {keyFindings.keyFindings.map((finding, i) => (
                        <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                          <span className="text-muted-foreground mt-1.5 text-xs">•</span>
                          <span className="leading-relaxed">{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Highlights Grid */}
                {keyFindings.highlights && (keyFindings.highlights.whatWorked.length > 0 || keyFindings.highlights.challenges.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {keyFindings.highlights.whatWorked.length > 0 && (
                      <div className="bg-emerald-500/5 rounded-lg p-4 border border-emerald-500/20">
                        <h4 className="text-sm font-semibold text-emerald-600 mb-2 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Criteria Passed
                        </h4>
                        <ul className="space-y-1.5">
                          {keyFindings.highlights.whatWorked.map((item, i) => (
                            <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                              <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {keyFindings.highlights.challenges.length > 0 && (
                      <div className="bg-amber-500/5 rounded-lg p-4 border border-amber-500/20">
                        <h4 className="text-sm font-semibold text-amber-600 mb-2 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Areas for Improvement
                        </h4>
                        <ul className="space-y-1.5">
                          {keyFindings.highlights.challenges.map((item, i) => (
                            <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                              <span className="text-amber-500 mt-0.5 shrink-0">!</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Refinements Applied */}
                {keyFindings.highlights?.refinements && keyFindings.highlights.refinements.length > 0 && (
                  <div className="bg-blue-500/5 rounded-lg p-4 border border-blue-500/20">
                    <h4 className="text-sm font-semibold text-blue-600 mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      Recommendations
                    </h4>
                    <ul className="space-y-1.5">
                      {keyFindings.highlights.refinements.map((item, i) => (
                        <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5 shrink-0">→</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* === PENDING PHASE: Show what will happen === */}
            {!isRunning && !isCompleted && (
              <div className="bg-background/60 rounded-lg p-4 border border-border/50">
                <p className="text-sm text-muted-foreground">
                  This phase will begin after the current phase completes.
                </p>
              </div>
            )}
          </div>
        )
      })()}

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
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Completed Phases
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-emerald-600 font-semibold">
              {passedCount}/{completedPhases.length} passed
            </span>
            <span className="text-muted-foreground">
              avg: {avgScore.toFixed(1)}/10
            </span>
          </div>
          <button
            onClick={() => setExpandedView(!expandedView)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {expandedView ? (
              <>
                <ChevronUp size={16} />
                <span>Hide details</span>
              </>
            ) : (
              <>
                <ChevronDown size={16} />
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
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium',
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
                  'p-4 rounded-lg border',
                  passed
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-amber-500/30 bg-amber-500/5'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-medium text-foreground">
                      {meta.name}
                    </span>
                    <span
                      className={cn(
                        'text-sm px-2 py-0.5 rounded font-medium',
                        passed ? 'bg-emerald-500/20 text-emerald-600' : 'bg-amber-500/20 text-amber-600'
                      )}
                    >
                      {score?.toFixed(1)}/10
                    </span>
                  </div>
                  <span
                    className={cn(
                      'text-sm font-medium',
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
