'use client'

/**
 * FrontierScienceProgressCard Component
 *
 * Main progress display during FrontierScience discovery execution.
 * Shows real-time progress with phase timeline, iteration tracking, and rubric scores.
 */

import { cn } from '@/lib/utils'
import type { DiscoveryPhase, PhaseProgressDisplay, RecoveryRecommendation } from '@/types/frontierscience'
import { getPhaseMetadata } from '@/types/frontierscience'
import { PhaseTimeline } from './PhaseTimeline'
import { PhaseResultsDropdown, generatePhaseKeyFindings } from './PhaseResultsDropdown'
import { LiveActivityFeed, type ActivityItem } from './LiveActivityFeed'
import { Button } from '@/components/ui/button'
import {
  X,
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
  Activity,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  Lightbulb,
  Download,
  Send,
  Cpu,
  Loader2,
  MessageSquare,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import React, { useState, useCallback } from 'react'
import type { RecoveryAgentResponse } from '@/app/api/discovery/recovery-agent/route'

export type DiscoveryStatus = 'idle' | 'starting' | 'running' | 'completed' | 'completed_partial' | 'failed'

interface FrontierScienceProgressCardProps {
  query: string
  status: DiscoveryStatus
  currentPhase: DiscoveryPhase | null
  phaseProgress: Map<DiscoveryPhase, PhaseProgressDisplay>
  overallProgress: number
  elapsedTime: number
  thinkingMessage: string | null
  activities?: ActivityItem[]
  // Failure handling props
  error?: string | null
  passedPhases?: DiscoveryPhase[]
  failedPhases?: DiscoveryPhase[]
  recoveryRecommendations?: RecoveryRecommendation[]
  failedCriteria?: { id: string; issue: string; suggestion: string }[]
  // Action handlers
  onCancel?: () => void
  onRetryWithQuery?: (query: string, fromCheckpoint?: boolean) => void
  onExportResults?: () => void
  onViewResults?: () => void
  className?: string
}

export function FrontierScienceProgressCard({
  query,
  status,
  currentPhase,
  phaseProgress,
  overallProgress,
  elapsedTime,
  thinkingMessage,
  activities = [],
  error,
  passedPhases = [],
  failedPhases = [],
  recoveryRecommendations = [],
  failedCriteria = [],
  onCancel,
  onRetryWithQuery,
  onExportResults,
  onViewResults,
  className,
}: FrontierScienceProgressCardProps) {
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
      {/* Header - Status indicator only (query shown in editor when failed) */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {status === 'failed' ? (
            <>
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle size={16} className="text-amber-400" />
              </div>
              <div>
                <span className="text-sm font-medium text-foreground">Discovery Paused</span>
                <p className="text-xs text-muted-foreground">Review feedback and refine your query</p>
              </div>
            </>
          ) : (
            <>
              <Cpu className="w-5 h-5 text-blue-500 animate-pulse shrink-0" />
              <div>
                <span className="text-sm font-medium text-foreground">Discovery in Progress</span>
                <p className="text-xs text-muted-foreground">Analyzing and validating research...</p>
              </div>
            </>
          )}
        </div>
        {onCancel && status === 'running' && (
          <button
            onClick={onCancel}
            className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0"
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
          <span className="absolute right-0 -top-5 text-sm font-medium text-muted-foreground">
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

      {/* Live Activity Feed - Fills remaining space */}
      {activities.length > 0 && (
        <div className="flex-1 flex flex-col min-h-0 border-b">
          <div className="flex items-center justify-between p-4 pb-2">
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
            <div className="flex-1 min-h-0 px-4 pb-4">
              <LiveActivityFeed
                activities={activities}
                currentPhase={currentPhase}
                maxHeight="100%"
                showTimestamps={true}
                className="h-full"
              />
            </div>
          )}
        </div>
      )}

      {/* Phase Details Panel - Only shows for SELECTED completed or pending phases (not running) */}
      {(() => {
        // Only show details for user-selected phases, NOT the currently running phase
        // The Live Activity Feed handles running phase information
        if (!selectedPhase) return null

        const displayProgress = phaseProgress.get(selectedPhase)
        const displayMeta = getPhaseMetadata(selectedPhase)
        const isCompleted = displayProgress?.status === 'completed'
        const isRunning = displayProgress?.status === 'running'
        const keyFindings = generatePhaseKeyFindings(selectedPhase, null, displayProgress?.judgeResult)

        // Don't show the detail panel for running phases - Activity Feed handles that
        if (isRunning) return null

        // Determine background color based on status
        const bgClass = isCompleted && displayProgress?.passed
          ? 'bg-gradient-to-br from-emerald-500/5 to-green-500/5'
          : isCompleted && !displayProgress?.passed
            ? 'bg-gradient-to-br from-amber-500/5 to-orange-500/5'
            : 'bg-muted/30'

        return (
          <div className={cn('p-5 border-b', bgClass)}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {/* Status indicator */}
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium uppercase tracking-wide',
                  isCompleted && displayProgress?.passed && 'bg-emerald-500/20 text-emerald-600',
                  isCompleted && !displayProgress?.passed && 'bg-amber-500/20 text-amber-600',
                  !isCompleted && 'bg-muted text-muted-foreground'
                )}>
                  {isCompleted ? (displayProgress?.passed ? 'Passed' : 'Completed') : 'Pending'}
                </span>
                <span className="text-base font-semibold text-foreground">
                  {displayMeta.name}
                </span>
                {displayProgress?.score !== undefined && (
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
              <button
                onClick={() => setSelectedPhase(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/50 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              {displayMeta.description}
            </p>

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
            {!isCompleted && (
              <div className="bg-background/60 rounded-lg p-4 border border-border/50">
                <p className="text-sm text-muted-foreground">
                  This phase will begin after the current phase completes.
                </p>
              </div>
            )}
          </div>
        )
      })()}

        {/* Recovery Editor - Shows inline when discovery fails */}
        {status === 'failed' && (
          <RecoveryEditor
            originalQuery={query}
            error={error}
            passedPhases={passedPhases}
            failedPhases={failedPhases}
            phaseProgress={phaseProgress}
            recoveryRecommendations={recoveryRecommendations}
            failedCriteria={failedCriteria}
            onRetryWithQuery={onRetryWithQuery}
            onExportResults={onExportResults}
            onViewResults={onViewResults}
          />
        )}

        {/* Completed Phases Summary - Only show when not failed (failure banner handles this) */}
        {status !== 'failed' && (
          <CompletedPhasesSummary phaseProgress={phaseProgress} />
        )}
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

/**
 * Recovery Editor - Interactive editor for refining queries after failure
 * Integrates with the Recovery Agent API for intelligent action routing
 */
interface RecoveryEditorProps {
  originalQuery: string
  error?: string | null
  passedPhases: DiscoveryPhase[]
  failedPhases: DiscoveryPhase[]
  phaseProgress: Map<DiscoveryPhase, PhaseProgressDisplay>
  recoveryRecommendations: RecoveryRecommendation[]
  failedCriteria: { id: string; issue: string; suggestion: string }[]
  onRetryWithQuery?: (query: string, fromCheckpoint?: boolean) => void
  onExportResults?: () => void
  onViewResults?: () => void
}

function RecoveryEditor({
  originalQuery,
  error,
  passedPhases,
  failedPhases,
  phaseProgress,
  recoveryRecommendations,
  failedCriteria,
  onRetryWithQuery,
  onExportResults,
  onViewResults,
}: RecoveryEditorProps) {
  const [inputValue, setInputValue] = useState(originalQuery)
  const [isProcessing, setIsProcessing] = useState(false)
  const [agentResponse, setAgentResponse] = useState<RecoveryAgentResponse | null>(null)
  const [showRecommendations, setShowRecommendations] = useState(true)

  const lastFailedPhase = failedPhases.length > 0 ? failedPhases[failedPhases.length - 1] : null
  const lastFailedScore = lastFailedPhase ? phaseProgress.get(lastFailedPhase)?.score : undefined
  const hasPartialResults = passedPhases.length > 0

  // Get prioritized recommendations
  const highPriorityRecs = recoveryRecommendations.filter(r => r.priority === 'high').slice(0, 3)
  const mediumPriorityRecs = recoveryRecommendations.filter(r => r.priority === 'medium').slice(0, 2)

  const handleSubmit = useCallback(async () => {
    if (!inputValue.trim() || isProcessing) return

    setIsProcessing(true)
    setAgentResponse(null)

    try {
      // Call the Recovery Agent API
      const response = await fetch('/api/discovery/recovery-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: inputValue,
          originalQuery,
          failedPhase: lastFailedPhase,
          failedScore: lastFailedScore,
          passedPhases,
          failedCriteria,
          recoveryRecommendations,
          phaseProgress: Object.fromEntries(phaseProgress),
        }),
      })

      const result: RecoveryAgentResponse = await response.json()
      setAgentResponse(result)

      // Handle action based on response
      if (result.action === 'rerun_full' || result.action === 'rerun_from_checkpoint') {
        // Trigger retry with the query (possibly modified)
        const queryToUse = result.modifiedQuery || inputValue
        const fromCheckpoint = result.action === 'rerun_from_checkpoint'
        onRetryWithQuery?.(queryToUse, fromCheckpoint)
      }
      // For answer_question, modify_parameters, clarify - show the response in the UI
    } catch (err) {
      console.error('Recovery agent error:', err)
      // Fallback: just retry with the current input
      onRetryWithQuery?.(inputValue, false)
    } finally {
      setIsProcessing(false)
    }
  }, [inputValue, originalQuery, lastFailedPhase, lastFailedScore, passedPhases, failedCriteria, recoveryRecommendations, phaseProgress, onRetryWithQuery, isProcessing])

  return (
    <div className="p-5 space-y-4">
      {/* Failure Context - Compact */}
      <div className="border border-amber-500/30 rounded-xl bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground">
              {error || 'The discovery process needs your input to continue.'}
            </p>
            {lastFailedPhase && (
              <p className="text-xs text-amber-400 mt-1">
                Issue at: <span className="font-medium">{getPhaseMetadata(lastFailedPhase).name}</span>
                {lastFailedScore !== undefined && ` (Score: ${lastFailedScore.toFixed(1)}/10)`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Recommendations - Collapsible */}
      {(highPriorityRecs.length > 0 || mediumPriorityRecs.length > 0) && (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <button
            onClick={() => setShowRecommendations(!showRecommendations)}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              Suggestions for Improvement
            </span>
            {showRecommendations ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showRecommendations && (
            <div className="px-4 pb-4 space-y-2">
              {highPriorityRecs.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                  <span className="text-xs font-bold text-red-400 bg-red-500/20 w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-sm text-foreground">{rec.suggestion}</p>
                </div>
              ))}
              {mediumPriorityRecs.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-muted/30 rounded-lg">
                  <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">{rec.suggestion}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Agent Response - Show when available */}
      {agentResponse && agentResponse.action === 'answer_question' && (
        <div className="border border-blue-500/30 rounded-xl bg-blue-500/10 p-4">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">{agentResponse.message}</p>
              <p className="text-sm text-muted-foreground">{agentResponse.answer}</p>
            </div>
          </div>
        </div>
      )}

      {agentResponse && agentResponse.action === 'clarify' && (
        <div className="border border-purple-500/30 rounded-xl bg-purple-500/10 p-4">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Need More Information</p>
              <p className="text-sm text-muted-foreground">{agentResponse.clarificationQuestion}</p>
            </div>
          </div>
        </div>
      )}

      {/* Query Editor - Main Input */}
      <div className="border border-border rounded-xl bg-background p-4">
        <label className="block text-sm font-medium text-foreground mb-2">
          Refine Your Query
        </label>
        <p className="text-xs text-muted-foreground mb-3">
          Edit your query based on the suggestions above, ask a question, or describe what you'd like to change.
        </p>
        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter your refined query, ask a question, or describe changes..."
          className="min-h-[100px] resize-none bg-muted/30 border-border"
          disabled={isProcessing}
        />
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI will analyze your input and determine the best action</span>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!inputValue.trim() || isProcessing}
            className="gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Partial Results - Compact */}
      {hasPartialResults && (
        <div className="border border-emerald-500/30 rounded-xl bg-emerald-500/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-foreground">
                {passedPhases.length} phase{passedPhases.length !== 1 ? 's' : ''} completed
              </span>
              <div className="flex gap-1">
                {passedPhases.slice(0, 3).map((phase) => (
                  <span
                    key={phase}
                    className="text-xs px-2 py-0.5 bg-emerald-500/20 rounded-full text-emerald-300"
                  >
                    {getPhaseMetadata(phase).shortName}
                  </span>
                ))}
                {passedPhases.length > 3 && (
                  <span className="text-xs px-2 py-0.5 bg-emerald-500/20 rounded-full text-emerald-300">
                    +{passedPhases.length - 3}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {onExportResults && (
                <Button size="sm" variant="outline" onClick={onExportResults} className="gap-1 text-xs border-emerald-500/30">
                  <Download className="w-3 h-3" />
                  Export
                </Button>
              )}
              {onViewResults && (
                <Button size="sm" onClick={onViewResults} className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700">
                  <ArrowRight className="w-3 h-3" />
                  View
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <button
          onClick={() => {
            setInputValue(originalQuery)
            onRetryWithQuery?.(originalQuery, false)
          }}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Retry with original query
        </button>
      </div>
    </div>
  )
}

export function MinimalProgress({
  overallProgress,
  currentPhase,
  className,
}: MinimalProgressProps) {
  const phaseMeta = currentPhase ? getPhaseMetadata(currentPhase) : null

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Cpu className="w-5 h-5 text-blue-500 animate-pulse shrink-0" />
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
