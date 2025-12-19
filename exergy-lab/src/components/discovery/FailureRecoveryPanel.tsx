'use client'

/**
 * FailureRecoveryPanel Component
 *
 * Displays when a phase fails, showing:
 * - Failed phase details with score
 * - Primary issues and recommendations
 * - Partial results summary (if available)
 * - Actions: Retry, Modify Query, Continue, Export
 */

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  AlertTriangle,
  XCircle,
  Lightbulb,
  Download,
  Play,
  RefreshCw,
  Edit,
  ChevronRight,
  CheckCircle,
  ArrowRight,
} from 'lucide-react'
import type { DiscoveryPhase } from '@/types/frontierscience'
import { getPhaseMetadata } from '@/types/frontierscience'
import type { RecoveryRecommendation, PartialDiscoveryResult } from '@/lib/ai/rubrics/types'

// ============================================================================
// Types
// ============================================================================

interface FailureRecoveryPanelProps {
  failedPhase: DiscoveryPhase
  score?: number
  threshold?: number
  recommendations: RecoveryRecommendation[]
  partialResults?: PartialDiscoveryResult
  onRetryPhase: (phase: DiscoveryPhase) => void
  onModifyQuery: () => void
  onContinuePartial: () => void
  onExportResults: () => void
  className?: string
}

// ============================================================================
// Main Component
// ============================================================================

export function FailureRecoveryPanel({
  failedPhase,
  score = 0,
  threshold = 7.0,
  recommendations,
  partialResults,
  onRetryPhase,
  onModifyQuery,
  onContinuePartial,
  onExportResults,
  className,
}: FailureRecoveryPanelProps) {
  const meta = getPhaseMetadata(failedPhase)
  const highPriority = recommendations.filter(r => r.priority === 'high')
  const mediumPriority = recommendations.filter(r => r.priority === 'medium')

  const completedCount = partialResults?.completedPhases?.length || 0
  const totalCount = (partialResults?.completedPhases?.length || 0) +
                     (partialResults?.failedPhases?.length || 0) +
                     (partialResults?.skippedPhases?.length || 0)

  return (
    <Card className={cn('border-amber-200 bg-amber-50/50', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{meta.name} Did Not Pass</CardTitle>
            <CardDescription>
              Score: <span className="font-semibold text-amber-600">{score.toFixed(1)}</span> / {threshold.toFixed(1)} threshold
            </CardDescription>
          </div>
          <Badge variant="warning" className="border-amber-300 text-amber-700 bg-amber-100">
            Needs Attention
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Primary Issues */}
        {highPriority.length > 0 && (
          <div className="bg-white rounded-lg p-4 border border-amber-200">
            <h4 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              High Priority Issues
            </h4>
            <ul className="space-y-3">
              {highPriority.slice(0, 3).map((rec, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-red-600">{i + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{rec.issue}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{rec.suggestion}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Medium Priority Issues */}
        {mediumPriority.length > 0 && (
          <div className="bg-white/50 rounded-lg p-4 border border-amber-100">
            <h4 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Suggestions for Improvement
            </h4>
            <ul className="space-y-2">
              {mediumPriority.slice(0, 2).map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <ChevronRight className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{rec.suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Partial Results Available */}
        {partialResults && completedCount > 0 && (
          <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
            <h4 className="text-sm font-semibold text-emerald-800 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Partial Results Available
            </h4>
            <p className="text-sm text-emerald-700 mb-3">
              <span className="font-semibold">{completedCount}</span> of {totalCount || 12} phases completed successfully
            </p>
            <div className="flex flex-wrap gap-1.5">
              {partialResults.completedPhases?.map((phase) => {
                const phaseMeta = getPhaseMetadata(phase)
                return (
                  <Badge key={phase} variant="secondary" className="bg-emerald-100 text-emerald-700">
                    {phaseMeta.shortName}
                  </Badge>
                )
              })}
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline" onClick={onExportResults} className="gap-2">
                <Download className="w-4 h-4" />
                Export Partial
              </Button>
              <Button size="sm" onClick={onContinuePartial} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <Play className="w-4 h-4" />
                Continue
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex-col gap-3 pt-0">
        <Separator className="bg-amber-200/50" />
        <div className="w-full grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={onModifyQuery} className="gap-2">
            <Edit className="w-4 h-4" />
            Modify Query
          </Button>
          <Button variant="outline" onClick={() => onRetryPhase(failedPhase)} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Retry {meta.shortName}
          </Button>
        </div>
        <Button
          variant="ghost"
          className="w-full text-muted-foreground hover:text-foreground gap-2"
          onClick={onContinuePartial}
        >
          Skip and continue with degraded results
          <ArrowRight className="w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}

// ============================================================================
// Compact Variant for Activity Feed
// ============================================================================

interface FailureAlertProps {
  phase: DiscoveryPhase
  score: number
  threshold: number
  mainIssue?: string
  onViewDetails?: () => void
  onRetry?: () => void
  className?: string
}

export function FailureAlert({
  phase,
  score,
  threshold,
  mainIssue,
  onViewDetails,
  onRetry,
  className,
}: FailureAlertProps) {
  const meta = getPhaseMetadata(phase)

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200',
      className
    )}>
      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          {meta.name} scored {score.toFixed(1)}/{threshold.toFixed(1)}
        </p>
        {mainIssue && (
          <p className="text-xs text-muted-foreground truncate">{mainIssue}</p>
        )}
      </div>
      <div className="flex gap-1.5 shrink-0">
        {onViewDetails && (
          <Button size="sm" variant="ghost" onClick={onViewDetails} className="h-7 px-2 text-xs">
            Details
          </Button>
        )}
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry} className="h-7 px-2 text-xs gap-1">
            <RefreshCw className="w-3 h-3" />
            Retry
          </Button>
        )}
      </div>
    </div>
  )
}

export default FailureRecoveryPanel
