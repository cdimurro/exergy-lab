'use client'

/**
 * PartialResultsCard Component
 *
 * A clean, report-style display for partial discovery results.
 * Shows essential information with progressive disclosure for deep dives.
 */

import { cn } from '@/lib/utils'
import type { DiscoveryPhase, PartialDiscoveryResultSummary } from '@/types/frontierscience'
import { getPhaseMetadata } from '@/types/frontierscience'
import { getCriterionName } from '@/lib/ai/rubrics/criterion-names'

type PhaseSummary = PartialDiscoveryResultSummary['phases'][number]
import { QualityBadge } from './QualityBadge'
import { PromptSuggestion } from './PromptSuggestion'
import { usePromptSuggestion } from '@/hooks/use-prompt-suggestion'
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  Download,
  RotateCcw,
  Settings2,
  ArrowLeft,
  ExternalLink,
  Check,
  X,
} from 'lucide-react'
import { useState, useMemo } from 'react'

interface PartialResultsCardProps {
  result: PartialDiscoveryResultSummary
  onExport?: () => void
  onRetryPhase?: (phase: DiscoveryPhase) => void
  onModifyQuery?: () => void
  onRetryWithPrompt?: (prompt: string) => void
  onLowerThresholds?: () => void
  onGoBack?: () => void
  className?: string
}

export function PartialResultsCard({
  result,
  onExport,
  onRetryPhase,
  onModifyQuery,
  onRetryWithPrompt,
  onLowerThresholds,
  onGoBack,
  className,
}: PartialResultsCardProps) {
  const [expandedPhase, setExpandedPhase] = useState<DiscoveryPhase | null>(null)

  // Format duration
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${seconds}s`
  }

  // Get failed phase info
  const firstFailedPhase = result.failedPhases[0] || null
  const firstFailedPhaseMeta = firstFailedPhase ? getPhaseMetadata(firstFailedPhase) : null
  const failedPhaseData = result.phases.find(p => p.phase === firstFailedPhase)

  // Extract failed criteria
  const failedCriteriaForSuggestion = useMemo(() => {
    if (!failedPhaseData?.iterations?.length) return []
    const lastIteration = failedPhaseData.iterations[failedPhaseData.iterations.length - 1]
    const judgeResult = lastIteration?.judgeResult
    if (!judgeResult?.itemScores) return []

    return judgeResult.itemScores
      .filter((item: any) => !item.passed)
      .map((item: any) => ({
        id: item.itemId,
        name: getCriterionName(item.itemId),
        issue: item.reasoning || `Failed criterion: ${getCriterionName(item.itemId)}`,
        suggestion: `Improve ${getCriterionName(item.itemId)} to score higher`,
        score: item.score || item.points || 0,
        maxScore: item.maxPoints || item.maxScore || 2,
      }))
  }, [failedPhaseData])

  // Use the prompt suggestion hook
  const {
    suggestion: promptSuggestion,
    isLoading: isSuggestionLoading,
    error: suggestionError,
  } = usePromptSuggestion({
    originalQuery: result.query,
    failedPhase: firstFailedPhase ? firstFailedPhaseMeta?.name || firstFailedPhase : null,
    failedCriteria: failedCriteriaForSuggestion,
    overallScore: result.overallScore,
    domain: result.domain,
    enabled: result.failedPhases.length > 0,
  })

  return (
    <div className={cn('bg-card border rounded-xl flex flex-col h-full max-h-[calc(100vh-8rem)]', className)}>
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-foreground">Discovery Report</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDuration(result.totalDuration)} • {result.domain} • {result.completedPhases.length}/{result.completedPhases.length + result.failedPhases.length} phases completed
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tabular-nums text-foreground">
                {result.overallScore.toFixed(1)}<span className="text-base font-normal text-muted-foreground">/10</span>
              </div>
              <QualityBadge quality={result.discoveryQuality} size="sm" />
            </div>
          </div>
          <p className="text-foreground">{result.query}</p>
        </div>

        {/* Phase Results */}
        <div className="divide-y">
          {result.phases.map((phase) => (
            <PhaseSection
              key={phase.phase}
              phase={phase}
              isCompleted={result.completedPhases.includes(phase.phase)}
              isFailed={result.failedPhases.includes(phase.phase)}
              isExpanded={expandedPhase === phase.phase}
              onToggle={() => setExpandedPhase(expandedPhase === phase.phase ? null : phase.phase)}
            />
          ))}

          {/* Skipped Phases */}
          {result.skippedPhases?.map((phaseId) => {
            const meta = getPhaseMetadata(phaseId)
            return (
              <div key={phaseId} className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">—</span>
                  <span className="text-sm text-muted-foreground flex-1">{meta?.name || phaseId}</span>
                  <span className="text-xs text-muted-foreground">Skipped</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* What You Can Do */}
        <div className="p-6 border-t bg-muted/20">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
            Next Steps
          </h2>

          {/* AI Suggestion */}
          {result.failedPhases.length > 0 && onRetryWithPrompt && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-primary" />
                <span className="text-sm font-medium text-foreground">Try an improved prompt</span>
              </div>
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

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {onExport && (
              <button
                onClick={onExport}
                className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
              >
                <Download size={14} />
                Export Report
              </button>
            )}
            {onRetryWithPrompt && (
              <button
                onClick={() => onRetryWithPrompt(result.query)}
                className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
              >
                <RotateCcw size={14} />
                Retry Original
              </button>
            )}
            {onLowerThresholds && (
              <button
                onClick={onLowerThresholds}
                className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
              >
                <Settings2 size={14} />
                Lower Thresholds
              </button>
            )}
            {onGoBack && (
              <button
                onClick={onGoBack}
                className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
              >
                <ArrowLeft size={14} />
                Start Over
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Phase section with expandable details
 */
function PhaseSection({
  phase,
  isCompleted,
  isFailed,
  isExpanded,
  onToggle,
}: {
  phase: PhaseSummary
  isCompleted: boolean
  isFailed: boolean
  isExpanded: boolean
  onToggle: () => void
}) {
  const meta = getPhaseMetadata(phase.phase)
  const lastIteration = phase.iterations?.[phase.iterations.length - 1]
  const judgeResult = lastIteration?.judgeResult
  const itemScores = judgeResult?.itemScores || []

  // Get passed and failed criteria
  const passedCriteria = itemScores.filter((item: any) => item.passed)
  const failedCriteria = itemScores.filter((item: any) => !item.passed)

  // Extract key insights from phase output
  const output = phase.finalOutput
  const sourceCount = output?.sources?.length || output?.literatureReview?.papers?.length || 0
  const findingsCount = output?.keyFindings?.length || output?.insights?.length || 0
  const gapsCount = output?.technologicalGaps?.length || output?.gaps?.length || 0

  return (
    <div className="px-6 py-4">
      {/* Phase Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 text-left"
      >
        <div className={cn(
          'w-5 h-5 rounded-full flex items-center justify-center mt-0.5 shrink-0',
          isCompleted && 'bg-emerald-100 dark:bg-emerald-900/30',
          isFailed && 'bg-red-100 dark:bg-red-900/30'
        )}>
          {isCompleted && <Check size={12} className="text-emerald-600" />}
          {isFailed && <X size={12} className="text-red-500" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              'font-medium',
              isCompleted && 'text-foreground',
              isFailed && 'text-red-600 dark:text-red-400'
            )}>
              {meta?.name || phase.phase}
            </span>
            <span className={cn(
              'text-sm tabular-nums',
              isCompleted && 'text-muted-foreground',
              isFailed && 'text-red-500'
            )}>
              {phase.finalScore.toFixed(1)}/10
            </span>
            {isFailed && (
              <span className="text-xs text-red-500">Below threshold</span>
            )}
          </div>

          {/* Brief summary line */}
          <p className="text-sm text-muted-foreground mt-1">
            {isCompleted && passedCriteria.length > 0 && (
              <>
                Passed {passedCriteria.length} criteria
                {sourceCount > 0 && ` • ${sourceCount} sources`}
                {findingsCount > 0 && ` • ${findingsCount} findings`}
                {gapsCount > 0 && ` • ${gapsCount} gaps identified`}
              </>
            )}
            {isFailed && failedCriteria.length > 0 && (
              <>
                Failed on {failedCriteria.map((c: any) => getCriterionName(c.itemId)).slice(0, 2).join(', ')}
                {failedCriteria.length > 2 && ` +${failedCriteria.length - 2} more`}
              </>
            )}
          </p>
        </div>

        {isExpanded ? (
          <ChevronDown size={16} className="text-muted-foreground mt-1 shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-muted-foreground mt-1 shrink-0" />
        )}
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 ml-8 space-y-4">
          {/* What Worked */}
          {passedCriteria.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                What Worked
              </h4>
              <div className="space-y-2">
                {passedCriteria.map((item: any, idx: number) => (
                  <div key={idx} className="text-sm">
                    <span className="text-foreground font-medium">{getCriterionName(item.itemId)}</span>
                    <span className="text-muted-foreground ml-2">
                      {(item.points || item.score || 0).toFixed(1)}/{(item.maxPoints || item.maxScore || 2).toFixed(1)}
                    </span>
                    {item.reasoning && (
                      <p className="text-muted-foreground mt-0.5">{item.reasoning}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What Didn't Work */}
          {failedCriteria.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                What Didn't Work
              </h4>
              <div className="space-y-2">
                {failedCriteria.map((item: any, idx: number) => (
                  <div key={idx} className="text-sm">
                    <span className="text-red-600 dark:text-red-400 font-medium">{getCriterionName(item.itemId)}</span>
                    <span className="text-red-500 ml-2">
                      {(item.points || item.score || 0).toFixed(1)}/{(item.maxPoints || item.maxScore || 2).toFixed(1)}
                    </span>
                    {item.reasoning && (
                      <p className="text-muted-foreground mt-0.5">{item.reasoning}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {judgeResult?.recommendations && judgeResult.recommendations.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Recommendations
              </h4>
              <ul className="space-y-1">
                {judgeResult.recommendations.map((rec: string, idx: number) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span>•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Insights Found (for research phase) */}
          {phase.phase === 'research' && output && (
            <PhaseInsights output={output} />
          )}

          {/* Hypothesis Details */}
          {phase.phase === 'hypothesis' && output && (
            <HypothesisDetails output={output} />
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Research phase insights
 */
function PhaseInsights({ output }: { output: any }) {
  const [showAll, setShowAll] = useState<string | null>(null)

  const sources = output?.sources || output?.literatureReview?.papers || []
  const findings = output?.keyFindings || output?.insights || []
  const gaps = output?.technologicalGaps || output?.gaps || []
  const patterns = output?.crossDomainInsights || output?.patterns || []
  const candidates = output?.materialCandidates || output?.candidates || []

  const sections = [
    { id: 'sources', label: 'Sources Found', items: sources },
    { id: 'findings', label: 'Key Findings', items: findings },
    { id: 'gaps', label: 'Gaps Identified', items: gaps },
    { id: 'patterns', label: 'Cross-Domain Patterns', items: patterns },
    { id: 'candidates', label: 'Material Candidates', items: candidates },
  ].filter(s => s.items.length > 0)

  if (sections.length === 0) return null

  return (
    <div>
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        Insights Found
      </h4>
      <div className="space-y-3">
        {sections.map(section => (
          <div key={section.id}>
            <button
              onClick={() => setShowAll(showAll === section.id ? null : section.id)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <span>{section.label}</span>
              <span className="text-xs">({section.items.length})</span>
              {showAll === section.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>

            {showAll === section.id && (
              <div className="mt-2 pl-4 space-y-1 max-h-40 overflow-y-auto">
                {section.items.slice(0, 15).map((item: any, idx: number) => (
                  <div key={idx} className="text-sm text-foreground">
                    {section.id === 'sources' ? (
                      item.url || item.link ? (
                        <a
                          href={item.url || item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-primary inline-flex items-center gap-1"
                        >
                          {item.title || item.name || 'Source'}
                          <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span>{item.title || item.name || 'Source'}</span>
                      )
                    ) : (
                      <span>
                        • {typeof item === 'string' ? item : item.finding || item.gap || item.pattern || item.name || item.description || item.insight || 'Item'}
                      </span>
                    )}
                  </div>
                ))}
                {section.items.length > 15 && (
                  <p className="text-xs text-muted-foreground">+{section.items.length - 15} more</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Hypothesis phase details
 */
function HypothesisDetails({ output }: { output: any }) {
  const hypothesis = output?.hypothesis || output
  if (!hypothesis) return null

  // Helper to safely render string or object
  const renderText = (value: any): string => {
    if (typeof value === 'string') return value
    if (typeof value === 'object' && value !== null) {
      // Handle object with text/description properties
      return value.text || value.description || value.statement || JSON.stringify(value)
    }
    return String(value || '')
  }

  // Helper to extract predictions array
  const getPredictions = (): string[] => {
    const preds = hypothesis.predictions || hypothesis.testableHypotheses || []
    if (!Array.isArray(preds)) return []

    return preds.map((pred: any) => {
      if (typeof pred === 'string') return pred
      if (typeof pred === 'object' && pred !== null) {
        // Handle objects with various possible properties
        return pred.prediction || pred.text || pred.description || pred.statement || JSON.stringify(pred)
      }
      return String(pred)
    }).filter(Boolean)
  }

  const predictions = getPredictions()

  return (
    <div>
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        Generated Hypothesis
      </h4>
      <div className="space-y-2 text-sm">
        {hypothesis.statement && (
          <p className="text-foreground">{renderText(hypothesis.statement)}</p>
        )}
        {hypothesis.mechanism && (
          <p className="text-muted-foreground">
            <span className="font-medium">Mechanism:</span> {renderText(hypothesis.mechanism)}
          </p>
        )}
        {predictions.length > 0 && (
          <div>
            <span className="font-medium text-muted-foreground">Predictions:</span>
            <ul className="mt-1 space-y-1">
              {predictions.slice(0, 3).map((pred: string, idx: number) => (
                <li key={idx} className="text-muted-foreground">• {pred}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default PartialResultsCard
