'use client'

import * as React from 'react'
import { Loader2, CheckCircle2, XCircle, Clock, StopCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, Card } from '@/components/ui'
import type { ExecutionCardProps, ToolCallStatus } from '@/types/chat'

interface ToolCallItemProps {
  tool: ToolCallStatus
}

function ToolCallItem({ tool }: ToolCallItemProps) {
  const statusIcons = {
    pending: <Clock className="h-3 w-3 text-muted-foreground" />,
    running: <Loader2 className="h-3 w-3 text-primary animate-spin" />,
    completed: <CheckCircle2 className="h-3 w-3 text-primary" />,
    failed: <XCircle className="h-3 w-3 text-destructive" />,
  }

  const formatDuration = (ms?: number): string => {
    if (!ms) return ''
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 py-1.5 px-2 rounded text-xs',
        tool.status === 'running' && 'bg-primary/5',
        tool.status === 'failed' && 'bg-destructive/5'
      )}
    >
      {statusIcons[tool.status]}
      <span
        className={cn(
          'flex-1 truncate',
          tool.status === 'completed' && 'text-muted-foreground',
          tool.status === 'failed' && 'text-destructive'
        )}
      >
        {tool.name}
      </span>
      {tool.duration && (
        <span className="text-muted-foreground">{formatDuration(tool.duration)}</span>
      )}
    </div>
  )
}

export function ExecutionCard({ status, onCancel }: ExecutionCardProps) {
  const [elapsedTime, setElapsedTime] = React.useState(0)

  // Update elapsed time every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - status.startedAt)
    }, 1000)
    return () => clearInterval(interval)
  }, [status.startedAt])

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    }
    return `${seconds}s`
  }

  const formatETA = (ms?: number): string => {
    if (!ms) return ''
    const remaining = ms - Date.now()
    if (remaining <= 0) return 'Almost done...'
    return `~${formatTime(remaining)} remaining`
  }

  // Count tool statuses
  const toolCounts = status.toolCalls.reduce(
    (acc, tool) => {
      acc[tool.status]++
      return acc
    },
    { pending: 0, running: 0, completed: 0, failed: 0 }
  )

  return (
    <Card className="p-4 border-border">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
            <h4 className="font-medium text-sm">Executing</h4>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{formatTime(elapsedTime)}</span>
            {status.estimatedCompletion && (
              <span>{formatETA(status.estimatedCompletion)}</span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{status.phase}</span>
            <span className="font-medium">{status.progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-foreground/10 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${status.progress}%` }}
            />
          </div>
        </div>

        {/* Current step */}
        <div className="text-sm text-foreground">
          <span className="text-muted-foreground">Current: </span>
          {status.currentStep}
        </div>

        {/* Tool calls */}
        {status.toolCalls.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Tool Calls</span>
              <span>
                {toolCounts.completed}/{status.toolCalls.length} complete
              </span>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-border">
              {status.toolCalls.map((tool) => (
                <ToolCallItem key={tool.id} tool={tool} />
              ))}
            </div>
          </div>
        )}

        {/* Cancel button */}
        {onCancel && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onCancel}
            className="w-full"
          >
            <StopCircle className="h-3 w-3 mr-2" />
            Cancel Execution
          </Button>
        )}
      </div>
    </Card>
  )
}
