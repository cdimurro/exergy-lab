'use client'

/**
 * PhaseDetailPanel Component
 *
 * Context-aware detail panel for discovery phases.
 * Displays different content based on phase status:
 * - Completed phases: Full AI summaries with key findings and scores
 * - Running phases: Live progress and current activity
 * - Future/pending phases: Description of what will happen
 */

import { cn } from '@/lib/utils'
import type { DiscoveryPhase, PhaseProgressDisplay, PhaseMetadata } from '@/types/frontierscience'
import { getPhaseMetadata } from '@/types/frontierscience'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  X,
  RefreshCw,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

// ============================================================================
// Types
// ============================================================================

export type PhaseStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface PhaseResult {
  summary?: string
  keyFindings?: string[]
  score?: number
  passed?: boolean
  rubricItems?: Array<{
    id: string
    name: string
    score: number
    maxScore: number
    passed: boolean
    reasoning?: string
  }>
  iterationCount?: number
  durationMs?: number
}

interface PhaseDetailPanelProps {
  phase: DiscoveryPhase
  status: PhaseStatus
  phaseResult?: PhaseResult | PhaseProgressDisplay
  onClose: () => void
  onRetry?: () => void
  className?: string
}

// ============================================================================
// Phase step descriptions for future phases
// ============================================================================

/**
 * Phase steps for consolidated 4-phase model
 */
const PHASE_STEPS: Record<DiscoveryPhase, string[]> = {
  research: [
    'Search academic databases (arXiv, OpenAlex, Semantic Scholar)',
    'Query patent databases and materials project',
    'Synthesize knowledge across domains',
    'Screen candidates using computational methods',
    'Identify research gaps and opportunities',
  ],
  hypothesis: [
    'Generate novel scientific hypotheses',
    'Evaluate novelty and testability',
    'Design experimental protocols',
    'Specify materials and equipment',
    'Define success criteria and safety requirements',
  ],
  validation: [
    'Run simulations and numerical experiments',
    'Perform exergy and thermodynamic analysis',
    'Conduct techno-economic assessment (TEA)',
    'Analyze patent landscape and IP freedom',
    'Verify against 800+ physical benchmarks',
  ],
  output: [
    'Evaluate against FrontierScience rubric',
    'Generate publication-ready report',
    'Create abstract and key findings',
    'Format citations and references',
    'Assess overall discovery quality',
  ],
}

/**
 * Estimated durations for consolidated 4-phase model
 */
const PHASE_DURATIONS: Record<DiscoveryPhase, string> = {
  research: '60-120 seconds',   // Combines: research + synthesis + screening
  hypothesis: '90-180 seconds', // Combines: hypothesis + experiment
  validation: '120-240 seconds', // Combines: simulation + exergy + tea + patent + validation
  output: '60-120 seconds',     // Combines: rubric_eval + publication
}

// ============================================================================
// Main Component
// ============================================================================

export function PhaseDetailPanel({
  phase,
  status,
  phaseResult,
  onClose,
  onRetry,
  className,
}: PhaseDetailPanelProps) {
  const meta = getPhaseMetadata(phase)
  const colors = getStatusColors(status, (phaseResult as PhaseResult)?.passed)

  return (
    <div className={cn('border rounded-xl bg-card overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', colors.bg)}>
            <StatusIcon status={status} passed={(phaseResult as PhaseResult)?.passed} className={colors.icon} />
          </div>
          <div>
            <h3 className="font-semibold">{meta.name}</h3>
            <StatusBadge status={status} passed={(phaseResult as PhaseResult)?.passed} />
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content based on status */}
      <div className="p-4">
        {status === 'pending' && (
          <FuturePhaseContent phase={phase} meta={meta} />
        )}
        {status === 'running' && (
          <InProgressPhaseContent phase={phase} result={phaseResult} />
        )}
        {(status === 'completed' || status === 'failed') && (
          <CompletedPhaseContent
            phase={phase}
            result={phaseResult as PhaseResult}
            onRetry={status === 'failed' || !(phaseResult as PhaseResult)?.passed ? onRetry : undefined}
          />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Future Phase Content
// ============================================================================

function FuturePhaseContent({
  phase,
  meta,
}: {
  phase: DiscoveryPhase
  meta: PhaseMetadata
}) {
  const steps = PHASE_STEPS[phase] || []
  const duration = PHASE_DURATIONS[phase] || 'Variable'

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">{meta.description}</p>

      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="text-sm font-medium mb-2">What happens in this phase:</h4>
        <ul className="text-sm text-muted-foreground space-y-1.5">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-blue-500 mt-1 shrink-0">•</span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>Estimated duration: {duration}</span>
      </div>
    </div>
  )
}

// ============================================================================
// In Progress Phase Content
// ============================================================================

function InProgressPhaseContent({
  phase,
  result,
}: {
  phase: DiscoveryPhase
  result?: PhaseResult | PhaseProgressDisplay
}) {
  const meta = getPhaseMetadata(phase)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        <div>
          <p className="text-sm font-medium text-blue-900">Processing...</p>
          <p className="text-xs text-blue-700">{meta.description}</p>
        </div>
      </div>

      {(result as PhaseProgressDisplay)?.currentIteration && (result as PhaseProgressDisplay).currentIteration > 0 && (
        <div className="text-sm text-muted-foreground">
          Iteration {(result as PhaseProgressDisplay).currentIteration} of {(result as PhaseProgressDisplay).maxIterations} in progress
        </div>
      )}

      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="text-sm font-medium mb-2">Currently working on:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          {(PHASE_STEPS[phase] || []).slice(0, 3).map((step, i) => (
            <li key={i} className="flex items-start gap-2">
              {i === 0 ? (
                <Loader2 className="w-3 h-3 mt-1 text-blue-500 animate-spin shrink-0" />
              ) : (
                <span className="text-muted-foreground/50 mt-1 shrink-0">•</span>
              )}
              <span className={i === 0 ? 'text-foreground' : 'text-muted-foreground/50'}>
                {step}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ============================================================================
// Completed Phase Content
// ============================================================================

function CompletedPhaseContent({
  phase,
  result,
  onRetry,
}: {
  phase: DiscoveryPhase
  result?: PhaseResult
  onRetry?: () => void
}) {
  if (!result) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No detailed results available for this phase.</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry This Phase
          </Button>
        )}
      </div>
    )
  }

  const score = result.score ?? (result as any)?.finalScore ?? 0
  const passed = result.passed ?? score >= 7

  return (
    <div className="space-y-4">
      {/* AI-Generated Summary */}
      {result.summary && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Summary</h4>
          <p className="text-sm text-muted-foreground">{result.summary}</p>
        </div>
      )}

      {/* Key Findings */}
      {result.keyFindings && result.keyFindings.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Key Findings</h4>
          <ul className="space-y-2">
            {result.keyFindings.map((finding, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>{finding}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Score Card */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Phase Score</span>
          <span
            className={cn(
              'text-lg font-bold',
              score >= 7 ? 'text-emerald-600' : score >= 5 ? 'text-amber-600' : 'text-red-600'
            )}
          >
            {score.toFixed(1)}/10
          </span>
        </div>
        <Progress
          value={score * 10}
          className={cn(
            'h-2',
            score >= 7 ? '[&>div]:bg-emerald-500' : score >= 5 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'
          )}
        />
        {result.iterationCount && (
          <p className="text-xs text-muted-foreground mt-2">
            Completed in {result.iterationCount} iteration{result.iterationCount > 1 ? 's' : ''}
            {result.durationMs && ` (${(result.durationMs / 1000).toFixed(1)}s)`}
          </p>
        )}
      </div>

      {/* Rubric Items */}
      {result.rubricItems && result.rubricItems.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-foreground text-muted-foreground">
            <ChevronRight className="w-4 h-4 transition-transform duration-200 [&[data-state=open]]:rotate-90" />
            View Evaluation Details ({result.rubricItems.length} items)
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="space-y-2 pl-4 border-l-2 border-muted">
              {result.rubricItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'p-2 rounded-lg text-sm',
                    item.passed ? 'bg-emerald-50' : 'bg-amber-50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.name}</span>
                    <span
                      className={cn(
                        'text-xs font-semibold',
                        item.passed ? 'text-emerald-600' : 'text-amber-600'
                      )}
                    >
                      {item.score.toFixed(1)}/{item.maxScore.toFixed(1)}
                    </span>
                  </div>
                  {item.reasoning && (
                    <p className="text-xs text-muted-foreground mt-1">{item.reasoning}</p>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Retry button for failed phases */}
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="w-full">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry This Phase
        </Button>
      )}
    </div>
  )
}

// ============================================================================
// Helper Components
// ============================================================================

function StatusBadge({ status, passed }: { status: PhaseStatus; passed?: boolean }) {
  const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'error' | 'warning' | 'success' }> = {
    pending: { label: 'Pending', variant: 'secondary' },
    running: { label: 'In Progress', variant: 'default' },
    completed_passed: { label: 'Passed', variant: 'success' },
    completed_failed: { label: 'Needs Improvement', variant: 'warning' },
    failed: { label: 'Failed', variant: 'error' },
  }

  const key = status === 'completed' ? (passed ? 'completed_passed' : 'completed_failed') : status
  const config = variants[key] || variants.pending

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'text-xs',
        status === 'completed' && passed && 'bg-emerald-100 text-emerald-700',
        status === 'running' && 'bg-blue-100 text-blue-700'
      )}
    >
      {config.label}
    </Badge>
  )
}

function StatusIcon({
  status,
  passed,
  className,
}: {
  status: PhaseStatus
  passed?: boolean
  className?: string
}) {
  if (status === 'running') {
    return <Loader2 className={cn('w-5 h-5 animate-spin', className)} />
  }
  if (status === 'completed' && passed) {
    return <CheckCircle className={cn('w-5 h-5', className)} />
  }
  if (status === 'completed' && !passed) {
    return <AlertCircle className={cn('w-5 h-5', className)} />
  }
  if (status === 'failed') {
    return <AlertCircle className={cn('w-5 h-5', className)} />
  }
  return <Clock className={cn('w-5 h-5', className)} />
}

function getStatusColors(status: PhaseStatus, passed?: boolean) {
  if (status === 'pending') {
    return { bg: 'bg-slate-100', icon: 'text-slate-500' }
  }
  if (status === 'running') {
    return { bg: 'bg-blue-100', icon: 'text-blue-600' }
  }
  if (status === 'completed' && passed) {
    return { bg: 'bg-emerald-100', icon: 'text-emerald-600' }
  }
  if (status === 'completed' && !passed) {
    return { bg: 'bg-amber-100', icon: 'text-amber-600' }
  }
  if (status === 'failed') {
    return { bg: 'bg-red-100', icon: 'text-red-600' }
  }
  return { bg: 'bg-slate-100', icon: 'text-slate-500' }
}

export default PhaseDetailPanel
