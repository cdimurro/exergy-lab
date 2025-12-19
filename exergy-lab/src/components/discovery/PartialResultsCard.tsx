'use client'

/**
 * PartialResultsCard Component
 *
 * Displays partial discovery results when some phases fail but others succeed.
 * Shows completed phases, failed phases with recommendations, and recovery suggestions.
 * Now includes AI-suggested prompt improvements based on rubric feedback.
 */

import { cn } from '@/lib/utils'
import type { DiscoveryPhase, PartialDiscoveryResultSummary } from '@/types/frontierscience'
import type { RecoveryRecommendation } from '@/lib/ai/rubrics/types'
import { getPhaseMetadata } from '@/types/frontierscience'
import { classifyDiscoveryQuality } from '@/lib/ai/rubrics/types'

// Phase type from the summary
type PhaseSummary = PartialDiscoveryResultSummary['phases'][number]
import { QualityBadge, QualityScoreDisplay, CompactQualityIndicator } from './QualityBadge'
import { RubricScoreCard } from './RubricScoreCard'
import { IterationHistory } from './IterationBadge'
import { RecommendationsList } from './RecommendationsList'
import { PromptSuggestion } from './PromptSuggestion'
import { usePromptSuggestion, extractFailedCriteria } from '@/hooks/use-prompt-suggestion'
import {
  Check,
  X,
  AlertTriangle,
  Clock,
  Download,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  BookOpen,
  RefreshCw,
  FileWarning,
  Edit3,
  Send,
  Loader2,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface PartialResultsCardProps {
  result: PartialDiscoveryResultSummary
  onExport?: () => void
  onRetryPhase?: (phase: DiscoveryPhase) => void
  onModifyQuery?: () => void
  onRetryWithPrompt?: (prompt: string) => void
  className?: string
}

export function PartialResultsCard({
  result,
  onExport,
  onRetryPhase,
  onModifyQuery,
  onRetryWithPrompt,
  className,
}: PartialResultsCardProps) {
  const [expandedPhases, setExpandedPhases] = useState<Set<DiscoveryPhase>>(new Set())
  const [isEditingPrompt, setIsEditingPrompt] = useState(false)
  const [editedPrompt, setEditedPrompt] = useState(result.query)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const togglePhase = (phase: DiscoveryPhase) => {
    setExpandedPhases(prev => {
      const next = new Set(prev)
      if (next.has(phase)) {
        next.delete(phase)
      } else {
        next.add(phase)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedPhases(new Set(result.phases.map(p => p.phase)))
  }

  const collapseAll = () => {
    setExpandedPhases(new Set())
  }

  // Format duration
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  // Handle inline prompt edit submission - immediately starts new discovery
  const handleSubmitEditedPrompt = () => {
    if (!editedPrompt.trim() || !onRetryWithPrompt) return
    setIsSubmitting(true)
    onRetryWithPrompt(editedPrompt.trim())
    // Note: isSubmitting will be reset when the component unmounts as the view changes
  }

  // Handle keyboard shortcut (Ctrl/Cmd + Enter to submit)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmitEditedPrompt()
    }
  }

  // Extract failed criteria from the first failed phase for prompt suggestion
  const failedCriteriaForSuggestion = useMemo(() => {
    const firstFailedPhase = result.phases.find(p => result.failedPhases.includes(p.phase))
    if (!firstFailedPhase?.iterations?.length) return []

    const lastIteration = firstFailedPhase.iterations[firstFailedPhase.iterations.length - 1]
    const judgeResult = lastIteration?.judgeResult

    if (!judgeResult?.itemScores) return []

    return judgeResult.itemScores
      .filter((item: any) => !item.passed)
      .map((item: any) => ({
        id: item.itemId,
        issue: item.reasoning || `Failed criterion: ${item.itemId}`,
        suggestion: `Improve ${item.itemId} to score higher`,
        score: item.score || 0,
        maxScore: item.maxPoints || item.maxScore || 2,
      }))
  }, [result.phases, result.failedPhases])

  // Get the first failed phase name
  const firstFailedPhase = result.failedPhases[0] || null

  // Use the prompt suggestion hook
  // Note: enabled even without failedCriteria - API can generate suggestions based on phase/score alone
  const {
    suggestion: promptSuggestion,
    isLoading: isSuggestionLoading,
    error: suggestionError,
  } = usePromptSuggestion({
    originalQuery: result.query,
    failedPhase: firstFailedPhase ? getPhaseMetadata(firstFailedPhase)?.name || firstFailedPhase : null,
    failedCriteria: failedCriteriaForSuggestion,
    overallScore: result.overallScore,
    domain: result.domain,
    enabled: result.failedPhases.length > 0,
  })

  return (
    <div className={cn('border rounded-xl overflow-hidden bg-card flex flex-col h-full max-h-[calc(100vh-8rem)]', className)}>
      {/* Header - With subtle amber accent for warning state */}
      <div className="flex items-center justify-between p-5 border-b bg-muted/30 shrink-0">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="text-amber-600" size={20} />
          </div>
          <div>
            <span className="text-base font-semibold text-foreground">Partial Results Available</span>
            <p className="text-sm text-muted-foreground">
              {result.completedPhases.length} of {result.completedPhases.length + result.failedPhases.length} steps completed successfully
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-sm font-medium"
            >
              <Download size={16} />
              Export
            </button>
          )}
          {onRetryWithPrompt && (
            <button
              onClick={() => setIsEditingPrompt(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Query and Score Section */}
        <div className="p-6 border-b bg-background">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Discovery Partially Complete
            </h2>
            <p className="text-base text-muted-foreground">
              {result.query}
            </p>
          </div>

          {/* Score and Quality - Larger display */}
          <div className="flex flex-col md:flex-row md:items-center gap-8">
            <QualityScoreDisplay
              score={result.overallScore}
              quality={result.discoveryQuality}
              className="flex-1"
            />
            <div className="flex flex-col gap-2">
              <QualityBadge
                quality={result.discoveryQuality}
                showDescription={true}
                size="lg"
              />
            </div>
          </div>

          {/* Summary Stats - Larger */}
          <div className="flex flex-wrap items-center gap-8 mt-6 pt-6 border-t">
            <StatItem
              icon={Clock}
              label="Duration"
              value={formatDuration(result.totalDuration)}
            />
            <StatItem
              icon={Check}
              label="Completed"
              value={`${result.completedPhases.length} steps`}
            />
            <StatItem
              icon={AlertTriangle}
              label="Failed"
              value={`${result.failedPhases.length} steps`}
            />
            <StatItem
              icon={BookOpen}
              label="Domain"
              value={result.domain}
            />
          </div>
        </div>

        {/* Degradation Reason */}
        {result.degradationReason && (
          <div className="p-5 border-b bg-muted/20">
            <div className="flex items-start gap-3">
              <FileWarning size={18} className="text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-base font-medium text-foreground">
                  Why partial results?
                </span>
                <p className="text-base text-muted-foreground mt-1">
                  {result.degradationReason}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recovery Recommendations - With green accent for improvement */}
        {result.recoveryRecommendations && result.recoveryRecommendations.length > 0 && (
          <div className="p-5 border-b">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Lightbulb size={14} className="text-emerald-600" />
              </div>
              <span className="text-base font-semibold text-foreground uppercase tracking-wide">
                How to Improve
              </span>
            </div>
            <RecommendationsList
              recommendations={result.recoveryRecommendations}
              onRetryPhase={onRetryPhase}
            />
          </div>
        )}

        {/* AI-Suggested Improved Prompt */}
        {(promptSuggestion || isSuggestionLoading || suggestionError) && onRetryWithPrompt && (
          <div className="p-5 border-b">
            <PromptSuggestion
              originalQuery={result.query}
              suggestion={promptSuggestion}
              isLoading={isSuggestionLoading}
              error={suggestionError}
              onUseSuggestion={onRetryWithPrompt}
              onRetryWithOriginal={() => onRetryWithPrompt(result.query)}
            />
          </div>
        )}

        {/* Completed Steps - With green accent */}
        {result.completedPhases.length > 0 && (
          <div className="p-5 border-b">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Check size={14} className="text-emerald-600" />
              </div>
              <span className="text-base font-semibold text-foreground uppercase tracking-wide">
                Completed Steps ({result.completedPhases.length})
              </span>
            </div>
            <div className="space-y-3">
              {result.phases
                .filter(p => result.completedPhases.includes(p.phase))
                .map(phase => (
                  <PhaseResultRow
                    key={phase.phase}
                    phase={phase}
                    isExpanded={expandedPhases.has(phase.phase)}
                    onToggle={() => togglePhase(phase.phase)}
                    status="completed"
                  />
                ))}
            </div>
          </div>
        )}

        {/* Failed Steps - With subtle red accent */}
        {result.failedPhases.length > 0 && (
          <div className="p-5 border-b">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center">
                <X size={14} className="text-red-500" />
              </div>
              <span className="text-base font-semibold text-foreground uppercase tracking-wide">
                Failed Steps ({result.failedPhases.length})
              </span>
            </div>
            <div className="space-y-3">
              {result.phases
                .filter(p => result.failedPhases.includes(p.phase))
                .map(phase => (
                  <PhaseResultRow
                    key={phase.phase}
                    phase={phase}
                    isExpanded={expandedPhases.has(phase.phase)}
                    onToggle={() => togglePhase(phase.phase)}
                    status="failed"
                    onRetry={onRetryPhase ? () => onRetryPhase(phase.phase) : undefined}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Skipped Steps */}
        {result.skippedPhases && result.skippedPhases.length > 0 && (
          <div className="p-5 border-b bg-muted/20">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={18} className="text-muted-foreground" />
              <span className="text-base font-semibold text-foreground uppercase tracking-wide">
                Skipped Steps ({result.skippedPhases.length})
              </span>
            </div>
            <div className="space-y-3">
              {result.skippedPhases.map(phase => {
                const meta = getPhaseMetadata(phase)
                return (
                  <div
                    key={phase}
                    className="flex items-center gap-4 p-4 rounded-lg border border-dashed bg-muted/20"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <AlertTriangle size={14} className="text-muted-foreground" />
                    </div>
                    <div>
                      <div className="text-base font-medium text-muted-foreground">
                        {meta?.name || phase}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Skipped due to prior failures
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Actions - Fixed at bottom */}
      <div className="p-5 bg-muted/30 border-t shrink-0">
        {isEditingPrompt ? (
          /* Inline Prompt Editor */
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Edit your query and retry
              </label>
              <Textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your research query..."
                className="min-h-[120px] text-base resize-none"
                disabled={isSubmitting}
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-2">
                Press Ctrl+Enter (Cmd+Enter on Mac) to submit
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditingPrompt(false)
                  setEditedPrompt(result.query) // Reset to original
                }}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitEditedPrompt}
                disabled={!editedPrompt.trim() || isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Send size={18} className="mr-2" />
                    Start Discovery
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Default Action Buttons */
          <div className="flex gap-4">
            {onExport && (
              <button
                onClick={onExport}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-base font-medium"
              >
                <Download size={18} />
                Export Results
              </button>
            )}
            {onRetryWithPrompt && (
              <button
                onClick={() => setIsEditingPrompt(true)}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-base font-medium"
              >
                <Edit3 size={18} />
                Edit Query & Retry
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Stat item display - Neutral styling with larger text
 */
function StatItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={18} className="text-muted-foreground" />
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-base font-medium text-foreground">
          {value}
        </div>
      </div>
    </div>
  )
}

/**
 * Individual phase result row with expandable details
 */
interface PhaseResultRowProps {
  phase: PhaseSummary
  isExpanded: boolean
  onToggle: () => void
  status: 'completed' | 'failed'
  onRetry?: () => void
}

function PhaseResultRow({ phase, isExpanded, onToggle, status, onRetry }: PhaseResultRowProps) {
  const meta = getPhaseMetadata(phase.phase)
  const quality = classifyDiscoveryQuality(phase.finalScore)

  return (
    <div className={cn(
      'border rounded-lg overflow-hidden bg-card',
      isExpanded && 'ring-1 ring-border'
    )}>
      {/* Header row - Larger padding and text */}
      <div className="flex items-center">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
        >
          <div className="flex items-center gap-4">
            {isExpanded ? (
              <ChevronDown size={20} className="text-muted-foreground" />
            ) : (
              <ChevronRight size={20} className="text-muted-foreground" />
            )}
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                status === 'completed'
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : 'bg-red-500/10 text-red-500'
              )}
            >
              {status === 'completed' ? <Check size={16} /> : <X size={16} />}
            </div>
            <div>
              <div className="text-base font-medium text-foreground">
                {meta?.name || phase.phase}
              </div>
              <div className="text-sm text-muted-foreground">
                {phase.iterationCount || phase.iterations?.length || 0} iteration{(phase.iterationCount || phase.iterations?.length || 0) !== 1 ? 's' : ''}
                {status === 'failed' && ' - did not pass threshold'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <CompactQualityIndicator
              score={phase.finalScore}
              passed={phase.passed}
            />
            <QualityBadge quality={quality} size="md" />
          </div>
        </button>

        {/* Retry button for failed phases - Larger */}
        {status === 'failed' && onRetry && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRetry()
            }}
            className="px-4 py-2 mr-3 text-sm rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors font-medium"
          >
            Retry
          </button>
        )}
      </div>

      {/* Expanded content - Larger padding */}
      {isExpanded && (
        <div className="p-5 border-t bg-muted/30">
          {/* Iteration history */}
          {phase.iterations && phase.iterations.length > 0 && (
            <IterationHistory
              iterations={phase.iterations.map((iter, i) => ({
                iteration: iter.iteration || i + 1,
                score: iter.judgeResult?.totalScore ?? 0,
                passed: iter.judgeResult?.passed ?? false,
                durationMs: iter.durationMs,
              }))}
              maxIterations={3}
              className="mb-5"
            />
          )}

          {/* Final judge result */}
          {phase.iterations && phase.iterations.length > 0 && phase.iterations[phase.iterations.length - 1]?.judgeResult && (
            <RubricScoreCard
              judgeResult={phase.iterations[phase.iterations.length - 1].judgeResult as any}
              showDetails={true}
              initialExpanded={true}
            />
          )}

          {/* Fallback if no iterations available */}
          {(!phase.iterations || phase.iterations.length === 0) && (
            <div className="text-base text-muted-foreground text-center py-6">
              <p>Score: {phase.finalScore.toFixed(1)}/10</p>
              <p className="mt-2">Detailed iteration data not available</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PartialResultsCard
