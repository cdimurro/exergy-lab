/**
 * ExecutionProgress Component
 *
 * Displays real-time workflow execution progress with:
 * - SSE streaming for live status updates
 * - Overall progress bar
 * - Phase timeline with completion status
 * - Current step indicator
 * - Recent activity log
 * - Time remaining and cost tracking
 */

'use client'

import { useEffect, useState, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import type { WorkflowStatusUpdate, PhaseType } from '@/types/workflow'

interface ExecutionProgressProps {
  workflowId: string
  onComplete?: () => void
  onError?: (error: string) => void
  onCancel?: () => void
}

interface ActivityLogItem {
  timestamp: number
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

export function ExecutionProgress({
  workflowId,
  onComplete,
  onError,
  onCancel,
}: ExecutionProgressProps) {
  const [status, setStatus] = useState<WorkflowStatusUpdate | null>(null)
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Connect to SSE stream
  useEffect(() => {
    if (!workflowId) return

    const connectSSE = () => {
      try {
        const eventSource = new EventSource(
          `/api/discovery/workflow?workflowId=${workflowId}`
        )

        eventSource.onopen = () => {
          console.log('[ExecutionProgress] SSE connected')
          setIsConnected(true)
          addToActivityLog('Connected to workflow stream', 'info')
        }

        eventSource.onmessage = (event) => {
          try {
            const update: WorkflowStatusUpdate = JSON.parse(event.data)
            setStatus(update)

            // Add to activity log
            if (update.message) {
              addToActivityLog(update.message, getLogTypeFromStatus(update.status))
            }

            // Handle completion
            if (update.status === 'completed') {
              addToActivityLog('Workflow completed successfully!', 'success')
              eventSource.close()
              onComplete?.()
            }

            // Handle failure
            if (update.status === 'failed') {
              addToActivityLog('Workflow failed', 'error')
              setError('Workflow execution failed')
              eventSource.close()
              onError?.('Workflow execution failed')
            }
          } catch (err) {
            console.error('[ExecutionProgress] Failed to parse SSE message:', err)
          }
        }

        eventSource.onerror = (err) => {
          console.error('[ExecutionProgress] SSE error:', err)
          setIsConnected(false)
          setError('Connection lost. Attempting to reconnect...')

          // Attempt reconnection after delay
          setTimeout(() => {
            if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
              connectSSE()
            }
          }, 3000)
        }

        eventSourceRef.current = eventSource
      } catch (err) {
        console.error('[ExecutionProgress] Failed to connect SSE:', err)
        setError('Failed to connect to workflow stream')
      }
    }

    connectSSE()

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [workflowId, onComplete, onError])

  // Add item to activity log
  const addToActivityLog = (message: string, type: ActivityLogItem['type']) => {
    setActivityLog((prev) => [
      { timestamp: Date.now(), message, type },
      ...prev.slice(0, 19), // Keep last 20 items
    ])
  }

  // Get log type from workflow status
  const getLogTypeFromStatus = (status: string): ActivityLogItem['type'] => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'failed':
        return 'error'
      case 'executing':
        return 'info'
      default:
        return 'info'
    }
  }

  // Format timestamp
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  // Format duration
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m`
  }

  // Get phase icon
  const getPhaseIcon = (phase: string): string => {
    if (phase.toLowerCase().includes('research')) return '📚'
    if (phase.toLowerCase().includes('experiment')) return '🧪'
    if (phase.toLowerCase().includes('simulation')) return '⚙️'
    if (phase.toLowerCase().includes('tea')) return '💰'
    return '📋'
  }

  // Get status icon
  const getStatusIcon = (type: ActivityLogItem['type']): string => {
    switch (type) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      default:
        return 'ℹ️'
    }
  }

  // Handle cancel
  const handleCancel = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    onCancel?.()
  }

  if (!status && !error) {
    return (
      <Card className="p-8 text-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 mx-auto mb-4 bg-primary/20 rounded-full" />
          <p className="text-sm text-muted-foreground">Connecting to workflow stream...</p>
        </div>
      </Card>
    )
  }

  if (error && !status) {
    return (
      <Card className="p-8 text-center">
        <div className="text-red-500 mb-4">❌</div>
        <p className="text-sm text-red-600">{error}</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="p-6 bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-blue-500/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Workflow Executing</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {status?.currentPhase || 'Initializing...'}
            </p>
          </div>

          {/* Connection Status */}
          <Badge variant={isConnected ? 'default' : 'secondary'} className="text-xs">
            {isConnected ? '🟢 Live' : '🔴 Disconnected'}
          </Badge>
        </div>

        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall Progress</span>
            <span className="text-muted-foreground">
              {status?.overallProgress || 0}% Complete
            </span>
          </div>
          <Progress value={status?.overallProgress || 0} className="h-3" />
          {status?.estimatedTimeRemaining && (
            <p className="text-xs text-muted-foreground text-right">
              ~{formatDuration(status.estimatedTimeRemaining)} remaining
            </p>
          )}
        </div>

        {/* Cost Tracker */}
        {status?.costAccumulated !== undefined && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Cost Accumulated</span>
              <span className="font-semibold">${status.costAccumulated.toFixed(2)}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Current Step Card */}
      {status?.currentPhase && (
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <div className="text-3xl animate-pulse">{getPhaseIcon(status.currentPhase)}</div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Current Step</h3>
              <p className="text-sm text-muted-foreground">{status.message}</p>
              {status.details && (
                <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono">
                  {JSON.stringify(status.details, null, 2)}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Activity Log Card */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <span>Recent Activity</span>
          <Badge variant="secondary" className="text-xs">
            {activityLog.length}
          </Badge>
        </h3>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {activityLog.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No activity yet...
            </p>
          ) : (
            activityLog.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 transition-colors"
              >
                <span className="text-lg shrink-0">{getStatusIcon(item.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{item.message}</p>
                  <p className="text-xs text-muted-foreground">{formatTime(item.timestamp)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Cancel Button */}
      {status?.status === 'executing' && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleCancel} className="text-red-600">
            ⏹️ Cancel Execution
          </Button>
        </div>
      )}
    </div>
  )
}
