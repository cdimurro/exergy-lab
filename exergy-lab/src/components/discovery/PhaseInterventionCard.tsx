'use client'

/**
 * PhaseInterventionCard Component
 *
 * Displays intervention points during discovery workflow where users can:
 * - Approve phase results before continuing
 * - Review and modify outputs (hypotheses, protocols, etc.)
 * - Request tier escalation for higher precision
 * - Provide feedback and notes
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit3,
  MessageSquare,
  RefreshCw,
  SkipForward,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  X,
} from 'lucide-react'
import type { DiscoveryPhase } from '@/types/frontierscience'

// ============================================================================
// Local Types (simplified for component use)
// ============================================================================

interface InterventionOption {
  id: string
  label: string
  action: 'continue' | 'retry' | 'skip' | 'modify' | 'escalate'
}

interface PhaseInterventionData {
  hypotheses?: Array<{
    id: string
    statement?: string
    title?: string
    noveltyScore?: number
    selected?: boolean
  }>
  protocol?: {
    title?: string
    objective?: string
    steps?: Array<{ description: string } | string>
    materials?: Array<{ name: string } | string>
  }
  simulationResults?: {
    predictions?: Record<string, number | string>
    confidence?: number
  }
  currentTier?: number
  escalationDetails?: {
    reason?: string
    additionalCost?: number
    additionalTime?: string
  }
}

interface PhaseIntervention {
  id: string
  type: 'approval_required' | 'review_recommended' | 'escalation_available'
  phase: DiscoveryPhase
  message: string
  options: InterventionOption[]
  data?: PhaseInterventionData
  timeout?: number
}

interface InterventionResponse {
  interventionId: string
  action: string
  timestamp: string
  selectedIds?: string[]
  comment?: string
}

interface UserFeedback {
  phase: DiscoveryPhase
  feedbackType: 'thumbs_up' | 'thumbs_down'
  targetId: string
  comment?: string
}

// ============================================================================
// Props
// ============================================================================

interface PhaseInterventionCardProps {
  intervention: PhaseIntervention
  onRespond: (response: InterventionResponse) => void
  onFeedback?: (feedback: UserFeedback) => void
  className?: string
}

// ============================================================================
// Intervention Type Styling
// ============================================================================

const INTERVENTION_STYLES: Record<
  PhaseIntervention['type'],
  { bg: string; border: string; icon: React.ReactNode; label: string }
> = {
  approval_required: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: <AlertCircle className="w-5 h-5 text-amber-600" />,
    label: 'Approval Required',
  },
  review_recommended: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: <Edit3 className="w-5 h-5 text-blue-600" />,
    label: 'Review Recommended',
  },
  escalation_available: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    icon: <TrendingUp className="w-5 h-5 text-purple-600" />,
    label: 'Escalation Available',
  },
}

// ============================================================================
// Action Button Mapping
// ============================================================================

const ACTION_STYLES: Record<
  InterventionOption['action'],
  { variant: 'secondary' | 'outline' | 'ghost'; icon: React.ReactNode }
> = {
  continue: { variant: 'secondary', icon: <CheckCircle2 className="w-4 h-4" /> },
  retry: { variant: 'secondary', icon: <RefreshCw className="w-4 h-4" /> },
  skip: { variant: 'ghost', icon: <SkipForward className="w-4 h-4" /> },
  modify: { variant: 'outline', icon: <Edit3 className="w-4 h-4" /> },
  escalate: { variant: 'secondary', icon: <TrendingUp className="w-4 h-4" /> },
}

// ============================================================================
// Phase Display Names
// ============================================================================

const PHASE_NAMES: Record<DiscoveryPhase, string> = {
  research: 'Research',
  synthesis: 'Synthesis',
  hypothesis: 'Hypothesis Generation',
  screening: 'Screening',
  experiment: 'Experiment Design',
  simulation: 'Simulation',
  exergy: 'Exergy Analysis',
  tea: 'TEA Analysis',
  patent: 'Patent Analysis',
  validation: 'Validation',
  rubric_eval: 'Rubric Evaluation',
  publication: 'Publication',
}

// ============================================================================
// Data Preview Components
// ============================================================================

interface HypothesisPreviewProps {
  hypotheses: PhaseInterventionData['hypotheses']
  selectedIds: Set<string>
  onToggle: (id: string) => void
}

function HypothesisPreview({ hypotheses, selectedIds, onToggle }: HypothesisPreviewProps) {
  if (!hypotheses) return null

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {hypotheses.map((h, index) => (
        <label
          key={h.id || index}
          className={cn(
            'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
            selectedIds.has(h.id)
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-border-subtle'
          )}
        >
          <input
            type="checkbox"
            checked={selectedIds.has(h.id)}
            onChange={() => onToggle(h.id)}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-foreground">
                H{index + 1}: {(h.statement || h.title || 'Hypothesis')?.slice(0, 80)}
                {((h.statement || h.title)?.length || 0) > 80 && '...'}
              </span>
              {h.noveltyScore !== undefined && (
                <Badge variant="secondary" className="text-xs">
                  Score: {h.noveltyScore}
                </Badge>
              )}
            </div>
          </div>
        </label>
      ))}
    </div>
  )
}

interface ProtocolPreviewProps {
  protocol: PhaseInterventionData['protocol']
}

function ProtocolPreview({ protocol }: ProtocolPreviewProps) {
  const [expanded, setExpanded] = React.useState(false)

  if (!protocol) return null

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <span className="font-medium text-sm text-foreground">
          {protocol.title || 'Experiment Protocol'}
        </span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {expanded && (
        <div className="p-3 space-y-3 text-sm">
          {protocol.objective && (
            <div>
              <span className="font-medium text-muted-foreground">Objective:</span>
              <p className="text-foreground">{protocol.objective}</p>
            </div>
          )}
          {protocol.steps && protocol.steps.length > 0 && (
            <div>
              <span className="font-medium text-muted-foreground">Steps:</span>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                {protocol.steps.slice(0, 5).map((step, i) => (
                  <li key={i} className="text-foreground">
                    {typeof step === 'string' ? step : step.description}
                  </li>
                ))}
                {protocol.steps.length > 5 && (
                  <li className="text-muted-foreground">... and {protocol.steps.length - 5} more</li>
                )}
              </ol>
            </div>
          )}
          {protocol.materials && protocol.materials.length > 0 && (
            <div>
              <span className="font-medium text-muted-foreground">Materials:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {protocol.materials.slice(0, 6).map((m, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {typeof m === 'string' ? m : m.name}
                  </Badge>
                ))}
                {protocol.materials.length > 6 && (
                  <Badge variant="secondary" className="text-xs">
                    +{protocol.materials.length - 6} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface SimulationPreviewProps {
  results: PhaseInterventionData['simulationResults']
  currentTier: number
}

function SimulationPreview({ results, currentTier }: SimulationPreviewProps) {
  if (!results) return null

  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm text-foreground">
          Tier {currentTier} Results
        </span>
        <Badge variant="secondary" className="text-xs">
          ±{currentTier === 1 ? '20%' : currentTier === 2 ? '10%' : '2%'} accuracy
        </Badge>
      </div>
      {results.predictions && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          {Object.entries(results.predictions).slice(0, 4).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-muted-foreground">{key}:</span>
              <span className="text-foreground font-medium">
                {typeof value === 'number' ? value.toFixed(2) : String(value)}
              </span>
            </div>
          ))}
        </div>
      )}
      {results.confidence !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Confidence:</span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${results.confidence}%` }}
            />
          </div>
          <span className="text-xs font-medium">{results.confidence}%</span>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function PhaseInterventionCard({
  intervention,
  onRespond,
  onFeedback,
  className,
}: PhaseInterventionCardProps) {
  const [selectedHypotheses, setSelectedHypotheses] = React.useState<Set<string>>(new Set())
  const [comment, setComment] = React.useState('')
  const [showCommentInput, setShowCommentInput] = React.useState(false)
  const [countdown, setCountdown] = React.useState<number | null>(
    intervention.timeout ? Math.ceil(intervention.timeout / 1000) : null
  )

  const style = INTERVENTION_STYLES[intervention.type]
  const data = intervention.data

  // Initialize selected hypotheses from data if available
  React.useEffect(() => {
    if (data?.hypotheses) {
      const ids = new Set(
        data.hypotheses
          .filter((h) => h.selected !== false)
          .map((h) => h.id)
      )
      setSelectedHypotheses(ids)
    }
  }, [data?.hypotheses])

  // Countdown timer for auto-continue
  React.useEffect(() => {
    if (countdown === null || countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          // Auto-continue when countdown reaches 0
          onRespond({
            interventionId: intervention.id,
            action: 'continue',
            timestamp: new Date().toISOString(),
          })
          return null
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [countdown, intervention.id, onRespond])

  const handleToggleHypothesis = (id: string) => {
    setSelectedHypotheses((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleAction = (option: InterventionOption) => {
    // Stop countdown when user takes action
    setCountdown(null)

    const response: InterventionResponse = {
      interventionId: intervention.id,
      action: option.action,
      timestamp: new Date().toISOString(),
    }

    // Add selection data for hypothesis interventions
    if (intervention.phase === 'hypothesis' && selectedHypotheses.size > 0) {
      response.selectedIds = Array.from(selectedHypotheses)
    }

    // Add comment if provided
    if (comment.trim()) {
      response.comment = comment.trim()
    }

    onRespond(response)
  }

  const handleFeedback = (type: 'thumbs_up' | 'thumbs_down') => {
    if (onFeedback) {
      onFeedback({
        phase: intervention.phase,
        feedbackType: type,
        targetId: intervention.id,
        comment: comment.trim() || undefined,
      })
    }
  }

  return (
    <div
      className={cn(
        'rounded-xl border-2 overflow-hidden',
        style.border,
        style.bg,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          {style.icon}
          <div>
            <h3 className="font-semibold text-foreground">
              {PHASE_NAMES[intervention.phase]} - {style.label}
            </h3>
            <p className="text-sm text-muted-foreground">{intervention.message}</p>
          </div>
        </div>
        {countdown !== null && (
          <Badge variant="secondary" className="gap-1">
            <Clock className="w-3 h-3" />
            Auto-continue in {countdown}s
          </Badge>
        )}
      </div>

      {/* Data Preview */}
      <div className="p-4 space-y-4">
        {/* Hypothesis Selection */}
        {data?.hypotheses && data.hypotheses.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                Select hypotheses to pursue ({selectedHypotheses.size} selected)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedHypotheses(
                    new Set(data.hypotheses!.map((h) => h.id))
                  )}
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedHypotheses(new Set())}
                >
                  Clear
                </Button>
              </div>
            </div>
            <HypothesisPreview
              hypotheses={data.hypotheses}
              selectedIds={selectedHypotheses}
              onToggle={handleToggleHypothesis}
            />
          </div>
        )}

        {/* Protocol Review */}
        {data?.protocol && (
          <ProtocolPreview protocol={data.protocol} />
        )}

        {/* Simulation Results (for escalation) */}
        {data?.simulationResults && data?.currentTier && (
          <SimulationPreview
            results={data.simulationResults}
            currentTier={data.currentTier}
          />
        )}

        {/* Escalation Details */}
        {intervention.type === 'escalation_available' && data?.escalationDetails && (
          <div className="bg-purple-500/5 rounded-lg p-3 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-sm text-foreground">
                Tier Escalation Recommended
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {data.escalationDetails.reason}
            </p>
            <div className="flex gap-4 text-sm">
              {data.escalationDetails.additionalCost !== undefined && (
                <span className="text-muted-foreground">
                  +${data.escalationDetails.additionalCost.toFixed(2)}
                </span>
              )}
              {data.escalationDetails.additionalTime && (
                <span className="text-muted-foreground">
                  +{data.escalationDetails.additionalTime}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Feedback Section */}
        {onFeedback && (
          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground">Helpful?</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedback('thumbs_up')}
              className="h-8 px-2"
            >
              <ThumbsUp className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedback('thumbs_down')}
              className="h-8 px-2"
            >
              <ThumbsDown className="w-4 h-4" />
            </Button>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCommentInput(!showCommentInput)}
              className="h-8 gap-1"
            >
              <MessageSquare className="w-4 h-4" />
              Add Note
            </Button>
          </div>
        )}

        {/* Comment Input */}
        {showCommentInput && (
          <div className="flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a note or suggestion..."
              className="flex-1 px-3 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCommentInput(false)
                setComment('')
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 p-4 bg-muted/30 border-t border-border/50">
        {intervention.options.map((option) => {
          const actionStyle = ACTION_STYLES[option.action]
          const isDisabled = option.action === 'continue' &&
            intervention.phase === 'hypothesis' &&
            selectedHypotheses.size === 0

          return (
            <Button
              key={option.id}
              variant={actionStyle?.variant || 'secondary'}
              size="sm"
              onClick={() => handleAction(option)}
              disabled={isDisabled}
              className="gap-2"
            >
              {actionStyle?.icon}
              {option.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Compact Intervention Banner
// ============================================================================

interface InterventionBannerProps {
  intervention: PhaseIntervention
  onView: () => void
  className?: string
}

export function InterventionBanner({
  intervention,
  onView,
  className,
}: InterventionBannerProps) {
  const style = INTERVENTION_STYLES[intervention.type]

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border',
        style.border,
        style.bg,
        className
      )}
    >
      <div className="flex items-center gap-2">
        {style.icon}
        <div>
          <span className="font-medium text-sm text-foreground">{style.label}</span>
          <span className="text-sm text-muted-foreground ml-2">
            {PHASE_NAMES[intervention.phase]}
          </span>
        </div>
      </div>
      <Button variant="secondary" size="sm" onClick={onView}>
        Review
      </Button>
    </div>
  )
}

export default PhaseInterventionCard
