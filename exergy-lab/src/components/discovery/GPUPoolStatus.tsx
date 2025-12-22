'use client'

/**
 * GPU Pool Status Component
 *
 * Displays real-time GPU pool utilization during discovery/breakthrough workflows.
 * Shows tier utilization, queue lengths, and cost tracking.
 */

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Cpu, Zap, DollarSign, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface GPUPoolUtilization {
  T4: number
  A10G: number
  A100: number
  queueLengths: {
    T4: number
    A10G: number
    A100: number
  }
  totalActive: number
  totalQueued: number
}

export interface GPUPoolMetrics {
  totalCompleted: number
  totalCost: number
  averageDuration: number
  cacheHitRate: number
}

export interface GPUPoolStatusProps {
  utilization: GPUPoolUtilization
  metrics?: GPUPoolMetrics
  isActive?: boolean
  className?: string
}

// ============================================================================
// GPU Tier Card Component
// ============================================================================

interface GPUTierCardProps {
  tier: 'T4' | 'A10G' | 'A100'
  utilization: number
  queue: number
  isActive?: boolean
}

function GPUTierCard({ tier, utilization, queue, isActive }: GPUTierCardProps) {
  const tierConfig = {
    T4: {
      color: 'bg-slate-500',
      progressColor: 'bg-slate-500',
      label: 'T4',
      description: 'Quick validation',
    },
    A10G: {
      color: 'bg-blue-500',
      progressColor: 'bg-blue-500',
      label: 'A10G',
      description: 'Parametric sweep',
    },
    A100: {
      color: 'bg-emerald-500',
      progressColor: 'bg-emerald-500',
      label: 'A100',
      description: 'Full Monte Carlo',
    },
  }

  const config = tierConfig[tier]
  const utilizationPercent = Math.round(utilization * 100)
  const isRunning = utilizationPercent > 0

  return (
    <div
      className={cn(
        'bg-background/50 rounded-lg p-3 transition-all duration-200',
        isRunning && 'ring-1 ring-primary/30'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', config.color, isRunning && 'animate-pulse')} />
          <span className="text-sm font-medium">{config.label}</span>
        </div>
        {isRunning && (
          <Badge variant="secondary" className="text-xs">
            {utilizationPercent}%
          </Badge>
        )}
      </div>

      <Progress
        value={utilizationPercent}
        className="h-1.5 mb-2"
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{config.description}</span>
        {queue > 0 ? (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {queue} queued
          </span>
        ) : (
          <span className="text-muted-foreground/50">idle</span>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function GPUPoolStatus({
  utilization,
  metrics,
  isActive = true,
  className,
}: GPUPoolStatusProps) {
  // Calculate overall utilization
  const overallUtilization = Math.round(
    ((utilization.T4 + utilization.A10G + utilization.A100) / 3) * 100
  )

  // Determine status
  const hasActivity = utilization.totalActive > 0 || utilization.totalQueued > 0
  const statusColor = hasActivity ? 'text-emerald-500' : 'text-muted-foreground'
  const statusText = hasActivity
    ? `${utilization.totalActive} active, ${utilization.totalQueued} queued`
    : 'Idle'

  return (
    <Card className={cn('bg-elevated border-border', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            GPU Validation Pool
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasActivity ? (
              <Badge variant="default" className="text-xs bg-emerald-500/20 text-emerald-500 border-emerald-500/30">
                <Zap className="h-3 w-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs text-muted-foreground">
                Idle
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* GPU Tier Cards */}
        <div className="grid grid-cols-3 gap-2">
          <GPUTierCard
            tier="T4"
            utilization={utilization.T4}
            queue={utilization.queueLengths.T4}
            isActive={isActive}
          />
          <GPUTierCard
            tier="A10G"
            utilization={utilization.A10G}
            queue={utilization.queueLengths.A10G}
            isActive={isActive}
          />
          <GPUTierCard
            tier="A100"
            utilization={utilization.A100}
            queue={utilization.queueLengths.A100}
            isActive={isActive}
          />
        </div>

        {/* Metrics Row */}
        {metrics && (
          <div className="flex items-center justify-between text-xs border-t border-border pt-3">
            <div className="flex items-center gap-4">
              {/* Completed */}
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-muted-foreground">
                  {metrics.totalCompleted} validated
                </span>
              </div>

              {/* Cache Hit Rate */}
              {metrics.cacheHitRate > 0 && (
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-muted-foreground">
                    {Math.round(metrics.cacheHitRate * 100)}% cached
                  </span>
                </div>
              )}

              {/* Average Duration */}
              {metrics.averageDuration > 0 && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-muted-foreground">
                    ~{(metrics.averageDuration / 1000).toFixed(1)}s avg
                  </span>
                </div>
              )}
            </div>

            {/* Cost */}
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">
                ${metrics.totalCost.toFixed(3)}
              </span>
            </div>
          </div>
        )}

        {/* Status Line */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2">
          <span className={statusColor}>{statusText}</span>
          <span>
            {overallUtilization}% overall utilization
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Compact Version
// ============================================================================

interface GPUPoolStatusCompactProps {
  utilization: GPUPoolUtilization
  totalCost?: number
  className?: string
}

export function GPUPoolStatusCompact({
  utilization,
  totalCost = 0,
  className,
}: GPUPoolStatusCompactProps) {
  const hasActivity = utilization.totalActive > 0

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg bg-elevated/50',
        hasActivity && 'ring-1 ring-primary/20',
        className
      )}
    >
      <Cpu className={cn('h-4 w-4', hasActivity ? 'text-primary animate-pulse' : 'text-muted-foreground')} />

      <div className="flex items-center gap-2 text-xs">
        {/* Tier indicators */}
        <div className="flex items-center gap-1">
          <div
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              utilization.T4 > 0 ? 'bg-slate-500 animate-pulse' : 'bg-slate-500/30'
            )}
            title={`T4: ${Math.round(utilization.T4 * 100)}%`}
          />
          <div
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              utilization.A10G > 0 ? 'bg-blue-500 animate-pulse' : 'bg-blue-500/30'
            )}
            title={`A10G: ${Math.round(utilization.A10G * 100)}%`}
          />
          <div
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              utilization.A100 > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-500/30'
            )}
            title={`A100: ${Math.round(utilization.A100 * 100)}%`}
          />
        </div>

        {hasActivity ? (
          <span className="text-primary font-medium">
            {utilization.totalActive} running
          </span>
        ) : (
          <span className="text-muted-foreground">GPU idle</span>
        )}

        {totalCost > 0 && (
          <>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground">
              ${totalCost.toFixed(3)}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

export default GPUPoolStatus
