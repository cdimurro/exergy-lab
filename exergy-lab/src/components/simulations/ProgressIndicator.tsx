'use client'

import * as React from 'react'
import { useMemo } from 'react'
import {
  Loader2,
  Check,
  X,
  Clock,
  Cpu,
  Database,
  BarChart3,
  FileText,
  Zap,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export type StageStatus = 'pending' | 'running' | 'completed' | 'error' | 'skipped'

export interface SimulationStage {
  id: string
  name: string
  description: string
  status: StageStatus
  progress?: number // 0-100
  duration?: number // milliseconds
  error?: string
  metrics?: Record<string, number | string>
}

export interface SimulationProgress {
  id: string
  status: 'initializing' | 'running' | 'completed' | 'error' | 'cancelled'
  stages: SimulationStage[]
  startTime: number
  endTime?: number
  tier: 1 | 2 | 3
  estimatedCost?: number
  actualCost?: number
  liveMetrics?: Record<string, number>
}

interface ProgressIndicatorProps {
  progress: SimulationProgress
  showDetails?: boolean
  showLiveMetrics?: boolean
  onCancel?: () => void
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const STAGE_ICONS: Record<string, React.ElementType> = {
  initialization: Database,
  setup: Cpu,
  computation: Zap,
  analysis: BarChart3,
  report: FileText,
}

const STATUS_CONFIG: Record<
  StageStatus,
  { icon: React.ElementType; color: string; bg: string }
> = {
  pending: { icon: Clock, color: 'text-zinc-500', bg: 'bg-zinc-700' },
  running: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  completed: { icon: Check, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  error: { icon: X, color: 'text-red-400', bg: 'bg-red-500/20' },
  skipped: { icon: Clock, color: 'text-zinc-500', bg: 'bg-zinc-700' },
}

// ============================================================================
// Component
// ============================================================================

export function ProgressIndicator({
  progress,
  showDetails = true,
  showLiveMetrics = true,
  onCancel,
  className = '',
}: ProgressIndicatorProps) {
  const [isExpanded, setIsExpanded] = React.useState(true)

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    const completedStages = progress.stages.filter(
      (s) => s.status === 'completed' || s.status === 'skipped'
    ).length
    const totalStages = progress.stages.length

    if (totalStages === 0) return 0

    // If a stage is running with its own progress, factor that in
    const runningStage = progress.stages.find((s) => s.status === 'running')
    if (runningStage && runningStage.progress !== undefined) {
      return ((completedStages + runningStage.progress / 100) / totalStages) * 100
    }

    return (completedStages / totalStages) * 100
  }, [progress.stages])

  // Calculate elapsed time
  const elapsedTime = useMemo(() => {
    const end = progress.endTime || Date.now()
    const elapsed = end - progress.startTime
    return formatDuration(elapsed)
  }, [progress.startTime, progress.endTime])

  // Get current stage
  const currentStage = useMemo(() => {
    return progress.stages.find((s) => s.status === 'running')
  }, [progress.stages])

  // Format duration
  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    const mins = Math.floor(ms / 60000)
    const secs = Math.floor((ms % 60000) / 1000)
    return `${mins}m ${secs}s`
  }

  // Get status color
  const getStatusColor = () => {
    switch (progress.status) {
      case 'completed':
        return 'text-emerald-400'
      case 'error':
        return 'text-red-400'
      case 'cancelled':
        return 'text-amber-400'
      default:
        return 'text-blue-400'
    }
  }

  return (
    <div className={`bg-zinc-800 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {progress.status === 'running' ? (
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            ) : progress.status === 'completed' ? (
              <Check className="w-5 h-5 text-emerald-400" />
            ) : progress.status === 'error' ? (
              <X className="w-5 h-5 text-red-400" />
            ) : (
              <Clock className="w-5 h-5 text-zinc-400" />
            )}
            <div>
              <h3 className="text-sm font-medium text-white">
                {progress.status === 'running'
                  ? 'Simulation Running'
                  : progress.status === 'completed'
                    ? 'Simulation Complete'
                    : progress.status === 'error'
                      ? 'Simulation Failed'
                      : 'Simulation'}
              </h3>
              <p className="text-xs text-zinc-400">Tier {progress.tier} Execution</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Elapsed time */}
            <div className="text-right">
              <div className="text-sm font-mono text-zinc-300">{elapsedTime}</div>
              <div className="text-xs text-zinc-500">elapsed</div>
            </div>

            {/* Cost */}
            {(progress.actualCost || progress.estimatedCost) && (
              <div className="text-right">
                <div className="text-sm font-mono text-zinc-300">
                  ${(progress.actualCost || progress.estimatedCost || 0).toFixed(3)}
                </div>
                <div className="text-xs text-zinc-500">
                  {progress.actualCost ? 'cost' : 'est.'}
                </div>
              </div>
            )}

            {/* Cancel button */}
            {progress.status === 'running' && onCancel && (
              <button
                onClick={onCancel}
                className="px-3 py-1.5 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
              >
                Cancel
              </button>
            )}

            {/* Expand/collapse */}
            {showDetails && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>{currentStage?.name || 'Progress'}</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                progress.status === 'error'
                  ? 'bg-red-500'
                  : progress.status === 'completed'
                    ? 'bg-emerald-500'
                    : 'bg-blue-500'
              }`}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stages */}
      {showDetails && isExpanded && (
        <div className="p-4 space-y-3">
          {progress.stages.map((stage, index) => {
            const config = STATUS_CONFIG[stage.status]
            const StatusIcon = config.icon
            const StageIcon = STAGE_ICONS[stage.id] || Cpu

            return (
              <div
                key={stage.id}
                className={`
                  relative pl-8 pb-3
                  ${index < progress.stages.length - 1 ? 'border-l border-zinc-700' : ''}
                `}
                style={{ marginLeft: '12px' }}
              >
                {/* Stage icon */}
                <div
                  className={`
                    absolute left-0 -translate-x-1/2 w-6 h-6 rounded-full
                    flex items-center justify-center
                    ${config.bg}
                  `}
                  style={{ top: '0' }}
                >
                  {stage.status === 'running' ? (
                    <Loader2 className={`w-3.5 h-3.5 ${config.color} animate-spin`} />
                  ) : (
                    <StatusIcon className={`w-3.5 h-3.5 ${config.color}`} />
                  )}
                </div>

                {/* Stage content */}
                <div className="ml-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StageIcon className="w-4 h-4 text-zinc-500" />
                      <span
                        className={`text-sm ${
                          stage.status === 'running'
                            ? 'text-white font-medium'
                            : stage.status === 'completed'
                              ? 'text-zinc-300'
                              : 'text-zinc-500'
                        }`}
                      >
                        {stage.name}
                      </span>
                    </div>
                    {stage.duration !== undefined && (
                      <span className="text-xs text-zinc-500">
                        {formatDuration(stage.duration)}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-500 mt-0.5">{stage.description}</p>

                  {/* Stage progress bar */}
                  {stage.status === 'running' && stage.progress !== undefined && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${stage.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Stage metrics */}
                  {stage.metrics && Object.keys(stage.metrics).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(stage.metrics).map(([key, value]) => (
                        <span
                          key={key}
                          className="text-xs px-2 py-0.5 bg-zinc-700 text-zinc-300 rounded"
                        >
                          {key}: {typeof value === 'number' ? value.toFixed(4) : value}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Error message */}
                  {stage.status === 'error' && stage.error && (
                    <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
                      {stage.error}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Live metrics */}
      {showLiveMetrics &&
        progress.status === 'running' &&
        progress.liveMetrics &&
        Object.keys(progress.liveMetrics).length > 0 && (
          <div className="px-4 py-3 border-t border-zinc-700 bg-zinc-900">
            <h4 className="text-xs font-medium text-zinc-400 uppercase mb-2">
              Live Metrics
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(progress.liveMetrics).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div className="text-lg font-mono text-white">
                    {typeof value === 'number' ? value.toFixed(3) : value}
                  </div>
                  <div className="text-xs text-zinc-500">{key}</div>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  )
}

// ============================================================================
// Default stages for different simulation types
// ============================================================================

export function getDefaultStages(tier: 1 | 2 | 3): SimulationStage[] {
  const baseStages: SimulationStage[] = [
    {
      id: 'initialization',
      name: 'Initialization',
      description: 'Setting up simulation environment',
      status: 'pending',
    },
    {
      id: 'setup',
      name: 'Parameter Setup',
      description: 'Configuring simulation parameters',
      status: 'pending',
    },
    {
      id: 'computation',
      name: 'Computation',
      description: 'Running physics calculations',
      status: 'pending',
    },
    {
      id: 'analysis',
      name: 'Analysis',
      description: 'Processing results and metrics',
      status: 'pending',
    },
    {
      id: 'report',
      name: 'Report Generation',
      description: 'Creating output report',
      status: 'pending',
    },
  ]

  if (tier === 2 || tier === 3) {
    // Add GPU-specific stages
    baseStages.splice(2, 0, {
      id: 'gpu-allocation',
      name: 'GPU Allocation',
      description: 'Allocating cloud compute resources',
      status: 'pending',
    })
  }

  if (tier === 3) {
    // Add validation stage for high-fidelity
    baseStages.splice(-1, 0, {
      id: 'validation',
      name: 'Validation',
      description: 'Comparing against benchmarks',
      status: 'pending',
    })
  }

  return baseStages
}
