/**
 * ToolProgressIndicator Component
 *
 * A reusable widget for displaying individual tool execution progress.
 * Shows tool name, status, duration, and result summary.
 */

'use client'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { ToolName } from '@/types/agent'

export interface ToolProgressIndicatorProps {
  toolName: ToolName
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress?: number // 0-100
  duration?: number // milliseconds
  resultSummary?: string
  error?: string
}

export function ToolProgressIndicator({
  toolName,
  status,
  progress = 0,
  duration,
  resultSummary,
  error,
}: ToolProgressIndicatorProps) {
  // Get tool icon
  const getToolIcon = (tool: ToolName): string => {
    switch (tool) {
      case 'searchPapers':
        return '🔍'
      case 'designExperiment':
        return '🧪'
      case 'runSimulation':
        return '⚙️'
      case 'calculateMetrics':
        return '📊'
      case 'analyzePatent':
        return '📄'
      case 'extractData':
        return '📥'
      default:
        return '🔧'
    }
  }

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-600 border-green-500/20'
      case 'running':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      case 'failed':
        return 'bg-red-500/10 text-red-600 border-red-500/20'
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
    }
  }

  // Get status badge variant
  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'error' => {
    switch (status) {
      case 'completed':
        return 'default'
      case 'running':
        return 'default'
      case 'failed':
        return 'error'
      default:
        return 'secondary'
    }
  }

  // Format duration
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  }

  // Format tool name
  const formatToolName = (name: ToolName): string => {
    return name
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div
      className={`p-3 rounded-lg border transition-all ${getStatusColor(status)} ${
        status === 'running' ? 'animate-pulse' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        {/* Tool Info */}
        <div className="flex items-center gap-2">
          <span className="text-xl">{getToolIcon(toolName)}</span>
          <div>
            <h4 className="font-medium text-sm">{formatToolName(toolName)}</h4>
            {duration && status !== 'pending' && (
              <p className="text-xs text-muted-foreground">{formatDuration(duration)}</p>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <Badge variant={getStatusBadgeVariant(status)} className="text-xs capitalize">
          {status === 'running' && '🔄 '}
          {status === 'completed' && '✓ '}
          {status === 'failed' && '✗ '}
          {status}
        </Badge>
      </div>

      {/* Progress Bar (for running tools) */}
      {status === 'running' && (
        <div className="mb-2">
          <Progress value={progress} className="h-1.5" />
          {progress > 0 && (
            <p className="text-xs text-muted-foreground mt-1 text-right">{progress}%</p>
          )}
        </div>
      )}

      {/* Result Summary */}
      {resultSummary && status === 'completed' && (
        <p className="text-xs text-muted-foreground mt-2">{resultSummary}</p>
      )}

      {/* Error Message */}
      {error && status === 'failed' && (
        <p className="text-xs text-red-600 mt-2">⚠️ {error}</p>
      )}
    </div>
  )
}
