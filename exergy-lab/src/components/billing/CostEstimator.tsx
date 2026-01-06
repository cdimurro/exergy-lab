'use client'

/**
 * Cost Estimator Component
 *
 * Shows estimated GPU cost before running a simulation.
 * Used in simulation forms to inform users about costs.
 */

import React, { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, Loader2, DollarSign } from 'lucide-react'
import { useGPUUsage } from '@/hooks/use-gpu-usage'
import { formatCost, GPU_PRICING_TABLE, type GPUTier } from '@/lib/billing/gpu-pricing'

interface CostEstimatorProps {
  gpuTier: GPUTier
  estimatedDurationMs: number
  simulationType?: string
  className?: string
  onEstimateChange?: (estimate: { cost: number; allowed: boolean }) => void
}

export function CostEstimator({
  gpuTier,
  estimatedDurationMs,
  simulationType,
  className = '',
  onEstimateChange,
}: CostEstimatorProps) {
  const { estimateCost, budget } = useGPUUsage()
  const [estimate, setEstimate] = useState<{
    cost: number
    allowed: boolean
    reason?: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchEstimate = async () => {
      setIsLoading(true)
      try {
        const result = await estimateCost(gpuTier, estimatedDurationMs)
        setEstimate({
          cost: result.estimatedCost,
          allowed: result.allowed,
          reason: result.reason,
        })
        onEstimateChange?.({ cost: result.estimatedCost, allowed: result.allowed })
      } catch (err) {
        console.error('Failed to estimate cost:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (estimatedDurationMs > 0) {
      fetchEstimate()
    }
  }, [gpuTier, estimatedDurationMs, estimateCost, onEstimateChange])

  const pricing = GPU_PRICING_TABLE[gpuTier]
  const durationMinutes = estimatedDurationMs / 60000

  return (
    <Card className={className}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Estimated Cost</span>
          </div>
          <Badge variant="secondary">
            {gpuTier} - ${pricing.ratePerHour.toFixed(2)}/hr
          </Badge>
        </div>

        <div className="mt-3 space-y-2">
          {isLoading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Calculating...</span>
            </div>
          ) : estimate ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Duration</span>
                <span className="font-medium">
                  {durationMinutes < 1
                    ? `${(estimatedDurationMs / 1000).toFixed(1)}s`
                    : `${durationMinutes.toFixed(1)}min`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Cost</span>
                <span className="text-lg font-semibold">
                  {formatCost(estimate.cost)}
                </span>
              </div>

              {budget && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Remaining Budget</span>
                  <span className={budget.remaining < estimate.cost ? 'text-red-600' : 'text-gray-600'}>
                    {formatCost(budget.remaining)}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t mt-2">
                {estimate.allowed ? (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Within budget - ready to run</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{estimate.reason || 'Budget limit exceeded'}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-500">
              Enter simulation parameters to see cost estimate
            </div>
          )}
        </div>

        {simulationType && (
          <div className="mt-2 text-xs text-gray-400">
            Simulation: {simulationType}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default CostEstimator
