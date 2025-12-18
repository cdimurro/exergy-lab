'use client'

/**
 * PartialResultsCard Component
 *
 * Displays partial discovery results when some phases fail but others succeed.
 * Shows completed phases, failed phases with recommendations, and recovery suggestions.
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
} from 'lucide-react'
import { useState } from 'react'

interface PartialResultsCardProps {
  result: PartialDiscoveryResultSummary
  onExport?: () => void
  onRetryPhase?: (phase: DiscoveryPhase) => void
  onModifyQuery?: () => void
  className?: string
}

export function PartialResultsCard({
  result,
  onExport,
  onRetryPhase,
  onModifyQuery,
  className,
}: PartialResultsCardProps) {
  const [expandedPhases, setExpandedPhases] = useState<Set<DiscoveryPhase>>(new Set())

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

  return (
    <div className={cn('border rounded-xl overflow-hidden bg-card', className)}>
      {/* Warning Banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="text-amber-500" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Partial Results Available</h3>
            <p className="text-sm text-muted-foreground">
              {result.completedPhases.length} of {result.completedPhases.length + result.failedPhases.length} phases completed successfully
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="p-6 border-b bg-gradient-to-br from-background to-muted/30">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">
              Discovery Partially Complete
            </h2>
            <p className="text-sm text-muted-foreground max-w-md truncate">
              {result.query}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onModifyQuery && (
              <button
                onClick={onModifyQuery}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-sm"
              >
                <RefreshCw size={14} />
                Retry
              </button>
            )}
            {onExport && (
              <button
                onClick={onExport}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
              >
                <Download size={14} />
                Export
              </button>
            )}
          </div>
        </div>

        {/* Score and Quality */}
        <div className="flex flex-col md:flex-row md:items-center gap-6">
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

        {/* Summary Stats */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t">
          <StatItem
            icon={Clock}
            label="Duration"
            value={formatDuration(result.totalDuration)}
          />
          <StatItem
            icon={Check}
            label="Completed"
            value={`${result.completedPhases.length} phases`}
            highlight={true}
          />
          <StatItem
            icon={AlertTriangle}
            label="Failed"
            value={`${result.failedPhases.length} phases`}
            className="text-amber-600"
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
        <div className="p-4 border-b bg-amber-500/5">
          <div className="flex items-start gap-2">
            <FileWarning size={16} className="text-amber-500 mt-0.5" />
            <div>
              <span className="text-sm font-medium text-foreground">
                Why partial results?
              </span>
              <p className="text-sm text-muted-foreground mt-1">
                {result.degradationReason}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recovery Recommendations */}
      {result.recoveryRecommendations && result.recoveryRecommendations.length > 0 && (
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={16} className="text-blue-500" />
            <span className="text-sm font-semibold text-foreground">
              How to Improve
            </span>
          </div>
          <RecommendationsList
            recommendations={result.recoveryRecommendations}
            onRetryPhase={onRetryPhase}
          />
        </div>
      )}

      {/* Completed Phases */}
      {result.completedPhases.length > 0 && (
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <Check size={16} className="text-emerald-500" />
            <span className="text-sm font-semibold text-foreground">
              Completed Phases ({result.completedPhases.length})
            </span>
          </div>
          <div className="space-y-2">
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

      {/* Failed Phases */}
      {result.failedPhases.length > 0 && (
        <div className="p-4 border-b bg-red-500/5">
          <div className="flex items-center gap-2 mb-3">
            <X size={16} className="text-red-500" />
            <span className="text-sm font-semibold text-foreground">
              Failed Phases ({result.failedPhases.length})
            </span>
          </div>
          <div className="space-y-2">
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

      {/* Skipped Phases */}
      {result.skippedPhases && result.skippedPhases.length > 0 && (
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">
              Skipped Phases ({result.skippedPhases.length})
            </span>
          </div>
          <div className="space-y-2">
            {result.skippedPhases.map(phase => {
              const meta = getPhaseMetadata(phase)
              return (
                <div
                  key={phase}
                  className="flex items-center gap-3 p-3 rounded-lg border border-dashed bg-muted/20"
                >
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                    <AlertTriangle size={12} className="text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {meta?.name || phase}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Skipped due to prior failures
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 bg-muted/30 flex gap-3">
        {onExport && (
          <button
            onClick={onExport}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-sm font-medium"
          >
            <Download size={14} />
            Export Partial Results
          </button>
        )}
        {onModifyQuery && (
          <button
            onClick={onModifyQuery}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <RefreshCw size={14} />
            Modify Query & Retry
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Stat item display
 */
function StatItem({
  icon: Icon,
  label,
  value,
  highlight = false,
  className,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
  highlight?: boolean
  className?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} className={cn('text-muted-foreground', className)} />
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div
          className={cn(
            'text-sm font-medium',
            highlight ? 'text-emerald-600' : className || 'text-foreground'
          )}
        >
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
      'border rounded-lg overflow-hidden',
      isExpanded && 'ring-1',
      status === 'completed' ? 'ring-emerald-200' : 'ring-red-200'
    )}>
      {/* Header row */}
      <div className="flex items-center">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown size={16} className="text-muted-foreground" />
            ) : (
              <ChevronRight size={16} className="text-muted-foreground" />
            )}
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center',
                status === 'completed'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-red-500 text-white'
              )}
            >
              {status === 'completed' ? <Check size={12} /> : <X size={12} />}
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">
                {meta?.name || phase.phase}
              </div>
              <div className="text-xs text-muted-foreground">
                {phase.iterationCount || phase.iterations?.length || 0} iteration{(phase.iterationCount || phase.iterations?.length || 0) !== 1 ? 's' : ''}
                {status === 'failed' && ' - did not pass threshold'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <CompactQualityIndicator
              score={phase.finalScore}
              passed={phase.passed}
            />
            <QualityBadge quality={quality} size="sm" />
          </div>
        </button>

        {/* Retry button for failed phases */}
        {status === 'failed' && onRetry && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRetry()
            }}
            className="px-3 py-1 mr-2 text-xs rounded-md bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors"
          >
            Retry
          </button>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-4 border-t bg-muted/30">
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
              className="mb-4"
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
            <div className="text-sm text-muted-foreground text-center py-4">
              <p>Score: {phase.finalScore.toFixed(1)}/10</p>
              <p className="mt-1">Detailed iteration data not available</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PartialResultsCard
