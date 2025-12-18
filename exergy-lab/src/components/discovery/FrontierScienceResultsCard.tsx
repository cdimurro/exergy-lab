'use client'

/**
 * FrontierScienceResultsCard Component
 *
 * Displays the final discovery results with phase breakdown,
 * quality classification, and recommendations.
 */

import { cn } from '@/lib/utils'
import type { DiscoveryResult, DiscoveryPhase, PhaseResult } from '@/types/frontierscience'
import { getPhaseMetadata } from '@/types/frontierscience'
import { classifyDiscoveryQuality } from '@/lib/ai/rubrics/types'
import { QualityBadge, QualityScoreDisplay, CompactQualityIndicator } from './QualityBadge'
import { RubricScoreCard, CompactRubricSummary } from './RubricScoreCard'
import { IterationHistory } from './IterationBadge'
import {
  Check,
  X,
  Clock,
  FileText,
  Download,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  BookOpen,
  Beaker,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'

interface FrontierScienceResultsCardProps {
  result: DiscoveryResult
  onExport?: () => void
  className?: string
}

export function FrontierScienceResultsCard({
  result,
  onExport,
  className,
}: FrontierScienceResultsCardProps) {
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

  // Calculate summary stats
  const passedPhases = result.phases.filter(p => p.passed).length
  const totalPhases = result.phases.length
  const totalSources = 0 // Would come from research phase output

  // Format duration
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className={cn('border rounded-xl overflow-hidden bg-card', className)}>
      {/* Header */}
      <div className="p-6 border-b bg-gradient-to-br from-background to-muted/30">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">
              Discovery Complete
            </h2>
            <p className="text-sm text-muted-foreground max-w-md truncate">
              {result.query}
            </p>
          </div>
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
            value={formatDuration(result.totalDurationMs)}
          />
          <StatItem
            icon={Check}
            label="Phases Passed"
            value={`${passedPhases}/${totalPhases}`}
            highlight={passedPhases === totalPhases}
          />
          <StatItem
            icon={BookOpen}
            label="Domain"
            value={result.domain}
          />
        </div>
      </div>

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <div className="p-4 border-b bg-amber-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={16} className="text-amber-500" />
            <span className="text-sm font-medium text-foreground">
              Recommendations
            </span>
          </div>
          <ul className="space-y-2">
            {result.recommendations.map((rec, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="text-amber-500 mt-1">{index + 1}.</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Phase Results */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-foreground">
            Phase Results
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Expand All
            </button>
            <span className="text-muted-foreground">/</span>
            <button
              onClick={collapseAll}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {result.phases.map(phase => (
            <PhaseResultRow
              key={phase.phase}
              phase={phase}
              isExpanded={expandedPhases.has(phase.phase)}
              onToggle={() => togglePhase(phase.phase)}
            />
          ))}
        </div>
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
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} className="text-muted-foreground" />
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div
          className={cn(
            'text-sm font-medium',
            highlight ? 'text-emerald-600' : 'text-foreground'
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
  phase: PhaseResult
  isExpanded: boolean
  onToggle: () => void
}

function PhaseResultRow({ phase, isExpanded, onToggle }: PhaseResultRowProps) {
  const meta = getPhaseMetadata(phase.phase)
  const quality = classifyDiscoveryQuality(phase.finalScore)

  return (
    <div className={cn('border rounded-lg overflow-hidden', isExpanded && 'ring-1 ring-blue-200')}>
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
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
              phase.passed
                ? 'bg-emerald-500 text-white'
                : 'bg-amber-500 text-white'
            )}
          >
            {phase.passed ? <Check size={12} /> : <X size={12} />}
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">
              {meta?.name || phase.phase}
            </div>
            <div className="text-xs text-muted-foreground">
              {phase.iterations.length} iteration{phase.iterations.length !== 1 ? 's' : ''}
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

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-4 border-t bg-muted/30">
          {/* Iteration history */}
          {phase.iterations.length > 0 && (
            <IterationHistory
              iterations={phase.iterations.map((iter, i) => ({
                iteration: i + 1,
                score: iter.judgeResult.totalScore,
                passed: iter.judgeResult.passed,
                durationMs: iter.durationMs,
              }))}
              maxIterations={3}
              className="mb-4"
            />
          )}

          {/* Final judge result */}
          {phase.iterations.length > 0 && (
            <RubricScoreCard
              judgeResult={phase.iterations[phase.iterations.length - 1].judgeResult}
              showDetails={true}
              initialExpanded={true}
            />
          )}

          {/* Phase-specific output summary would go here */}
          <PhaseOutputSummary phase={phase} />
        </div>
      )}
    </div>
  )
}

/**
 * Phase-specific output summary
 */
function PhaseOutputSummary({ phase }: { phase: PhaseResult }) {
  // This would render phase-specific output based on the phase type
  // For now, show a generic summary
  if (!phase.finalOutput) return null

  return (
    <div className="mt-4 pt-4 border-t">
      <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
        Output Summary
      </div>
      <div className="text-sm text-muted-foreground">
        {typeof phase.finalOutput === 'object'
          ? `${Object.keys(phase.finalOutput).length} properties`
          : 'Output available'}
      </div>
    </div>
  )
}

/**
 * Compact results summary for inline use
 */
interface CompactResultsSummaryProps {
  result: DiscoveryResult
  className?: string
}

export function CompactResultsSummary({
  result,
  className,
}: CompactResultsSummaryProps) {
  const passedPhases = result.phases.filter(p => p.passed).length

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <QualityBadge quality={result.discoveryQuality} size="sm" />
      <div className="flex items-center gap-1 text-sm">
        <span className="font-medium">{result.overallScore.toFixed(1)}</span>
        <span className="text-muted-foreground">/10</span>
      </div>
      <div className="text-xs text-muted-foreground">
        {passedPhases}/{result.phases.length} phases passed
      </div>
    </div>
  )
}

export default FrontierScienceResultsCard
