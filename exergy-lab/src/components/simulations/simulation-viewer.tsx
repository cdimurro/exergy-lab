'use client'

import * as React from 'react'
import { Loader2, CheckCircle2, XCircle, Clock, TrendingUp } from 'lucide-react'
import { Card, Progress, Badge } from '@/components/ui'
import type { SimulationProgress, SimulationMetric } from '@/types/simulation'

export interface SimulationViewerProps {
  progress: SimulationProgress
  metrics?: SimulationMetric[]
  insights?: string
}

export function SimulationViewer({ progress, metrics, insights }: SimulationViewerProps) {
  const getStatusIcon = () => {
    switch (progress.status) {
      case 'completed':
        return <CheckCircle2 className="w-6 h-6 text-green-600" />
      case 'failed':
        return <XCircle className="w-6 h-6 text-red-600" />
      case 'running':
      case 'processing':
        return <Loader2 className="w-6 h-6 text-primary animate-spin" />
      default:
        return <Clock className="w-6 h-6 text-foreground-muted" />
    }
  }

  const getStatusColor = () => {
    switch (progress.status) {
      case 'completed':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
      case 'running':
      case 'processing':
        return 'text-primary'
      default:
        return 'text-foreground-muted'
    }
  }

  const getStatusLabel = () => {
    switch (progress.status) {
      case 'queued':
        return 'Queued'
      case 'initializing':
        return 'Initializing'
      case 'running':
        return 'Running'
      case 'processing':
        return 'Processing Results'
      case 'completed':
        return 'Completed'
      case 'failed':
        return 'Failed'
      default:
        return 'Unknown'
    }
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
  }

  return (
    <div className="space-y-6">
      {/* Progress Card */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="shrink-0">{getStatusIcon()}</div>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className={`text-lg font-semibold ${getStatusColor()}`}>
                  {getStatusLabel()}
                </h3>
                {progress.currentStep && (
                  <p className="text-sm text-foreground-muted mt-1">{progress.currentStep}</p>
                )}
              </div>

              <Badge
                variant={
                  progress.status === 'completed'
                    ? 'success'
                    : progress.status === 'failed'
                      ? 'error'
                      : 'primary'
                }
              >
                {progress.percentage}%
              </Badge>
            </div>

            {/* Progress Bar */}
            <Progress
              value={progress.percentage}
              variant={
                progress.status === 'completed'
                  ? 'success'
                  : progress.status === 'failed'
                    ? 'error'
                    : 'default'
              }
              className="mb-3"
            />

            {/* Time Estimate */}
            {progress.estimatedTimeRemaining !== undefined && progress.status === 'running' && (
              <p className="text-xs text-foreground-muted">
                Estimated time remaining: {formatTime(progress.estimatedTimeRemaining)}
              </p>
            )}

            {/* Completion Time */}
            {progress.completedAt && (
              <p className="text-xs text-foreground-muted">
                Completed at: {new Date(progress.completedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Metrics Display */}
      {metrics && metrics.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Simulation Results</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((metric, index) => (
              <div
                key={index}
                className="p-4 rounded-lg bg-background-surface border border-border"
              >
                <p className="text-sm font-medium text-foreground-muted mb-1">{metric.name}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-foreground">
                    {typeof metric.value === 'number' ? metric.value.toFixed(2) : metric.value}
                  </span>
                  <span className="text-sm text-foreground-muted">{metric.unit}</span>
                </div>

                {/* Uncertainty */}
                {metric.uncertainty !== undefined && (
                  <p className="text-xs text-foreground-muted mt-1">
                    ± {metric.uncertainty}% uncertainty
                  </p>
                )}

                {/* Confidence Interval */}
                {metric.confidenceInterval && (
                  <p className="text-xs text-foreground-muted mt-1">
                    95% CI: [{metric.confidenceInterval[0].toFixed(2)},{' '}
                    {metric.confidenceInterval[1].toFixed(2)}]
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* AI Insights */}
      {insights && (
        <Card className="bg-gradient-to-br from-primary/5 to-accent-purple/5 border-primary/20">
          <h3 className="text-lg font-semibold text-foreground mb-3">AI Insights</h3>
          <p className="text-sm text-foreground-muted whitespace-pre-line">{insights}</p>
        </Card>
      )}
    </div>
  )
}
