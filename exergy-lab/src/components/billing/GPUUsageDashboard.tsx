'use client'

/**
 * GPU Usage Dashboard
 *
 * Displays GPU usage summary, budget gauge, and usage history.
 *
 * Features:
 * - Current month spending vs budget
 * - GPU tier breakdown
 * - Recent usage history
 * - Cost estimator integration
 */

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useGPUUsage } from '@/hooks/use-gpu-usage'
import { formatCost, GPU_PRICING_TABLE, type GPUTier } from '@/lib/billing/gpu-pricing'
import { Activity, Cpu, DollarSign, Clock, TrendingUp, AlertCircle } from 'lucide-react'

// ============================================================================
// Budget Gauge Component
// ============================================================================

interface BudgetGaugeProps {
  spent: number
  limit: number | null
  className?: string
}

function BudgetGauge({ spent, limit, className = '' }: BudgetGaugeProps) {
  const percentage = limit ? Math.min((spent / limit) * 100, 100) : 0
  const isOverBudget = limit && spent >= limit
  const isNearBudget = limit && spent >= limit * 0.8

  const getColor = () => {
    if (isOverBudget) return 'bg-red-500'
    if (isNearBudget) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between text-sm">
        <span>Spent: {formatCost(spent)}</span>
        <span>{limit !== null ? `Limit: ${formatCost(limit)}` : 'Unlimited'}</span>
      </div>
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isNearBudget && !isOverBudget && (
        <div className="flex items-center gap-1 text-xs text-yellow-600">
          <AlertCircle className="h-3 w-3" />
          Approaching budget limit
        </div>
      )}
      {isOverBudget && (
        <div className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3 w-3" />
          Budget limit reached
        </div>
      )}
    </div>
  )
}

// ============================================================================
// GPU Tier Badge
// ============================================================================

interface GPUTierBadgeProps {
  tier: GPUTier
}

function GPUTierBadge({ tier }: GPUTierBadgeProps) {
  const colors: Record<GPUTier, string> = {
    T4: 'bg-blue-100 text-blue-800',
    A10G: 'bg-green-100 text-green-800',
    A100: 'bg-purple-100 text-purple-800',
    H100: 'bg-orange-100 text-orange-800',
  }

  return (
    <Badge className={colors[tier] || 'bg-gray-100 text-gray-800'}>
      {tier}
    </Badge>
  )
}

// ============================================================================
// Stats Card
// ============================================================================

interface StatsCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  description?: string
  trend?: number
}

function StatsCard({ title, value, icon, description, trend }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-semibold mt-1">{value}</p>
            {description && (
              <p className="text-xs text-gray-400 mt-1">{description}</p>
            )}
          </div>
          <div className="p-3 bg-gray-100 rounded-lg">
            {icon}
          </div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className={`h-3 w-3 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend)}% from last month
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Usage History Table
// ============================================================================

interface UsageHistoryProps {
  records: Array<{
    id: string
    gpuTier: GPUTier
    simulationType: string
    durationSeconds?: number
    costUsd?: number
    status: string
    startTime: Date
  }>
}

function UsageHistoryTable({ records }: UsageHistoryProps) {
  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No GPU usage history yet
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 px-4">Type</th>
            <th className="py-2 px-4">GPU</th>
            <th className="py-2 px-4">Duration</th>
            <th className="py-2 px-4">Cost</th>
            <th className="py-2 px-4">Status</th>
            <th className="py-2 px-4">Time</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id} className="border-b hover:bg-gray-50">
              <td className="py-2 px-4">{record.simulationType}</td>
              <td className="py-2 px-4">
                <GPUTierBadge tier={record.gpuTier} />
              </td>
              <td className="py-2 px-4">
                {record.durationSeconds !== undefined
                  ? `${record.durationSeconds.toFixed(1)}s`
                  : '-'}
              </td>
              <td className="py-2 px-4">
                {record.costUsd !== undefined
                  ? formatCost(record.costUsd)
                  : '-'}
              </td>
              <td className="py-2 px-4">
                <Badge
                  variant={record.status === 'completed' ? 'default' : 'secondary'}
                  className={
                    record.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : record.status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }
                >
                  {record.status}
                </Badge>
              </td>
              <td className="py-2 px-4 text-gray-500">
                {new Date(record.startTime).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================================
// GPU Usage Dashboard
// ============================================================================

export function GPUUsageDashboard() {
  const { summary, budget, history, isLoading, error, refresh } = useGPUUsage()

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load GPU usage data</p>
            <Button onClick={refresh} variant="outline" className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalCost = summary?.totalCostUsd || 0
  const totalRuns = summary?.totalRuns || 0
  const totalDuration = summary?.totalDurationSeconds || 0
  const budgetLimit = budget?.monthlyLimit || 10

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="This Month's Cost"
          value={formatCost(totalCost)}
          icon={<DollarSign className="h-5 w-5 text-gray-600" />}
          description={`of ${formatCost(budgetLimit)} budget`}
        />
        <StatsCard
          title="Total Runs"
          value={totalRuns}
          icon={<Activity className="h-5 w-5 text-gray-600" />}
          description={`${summary?.completedRuns || 0} completed`}
        />
        <StatsCard
          title="GPU Time"
          value={`${(totalDuration / 60).toFixed(1)} min`}
          icon={<Clock className="h-5 w-5 text-gray-600" />}
          description="Total compute time"
        />
        <StatsCard
          title="Primary GPU"
          value={Object.keys(summary?.byGpuTier || {})[0] || 'A10G'}
          icon={<Cpu className="h-5 w-5 text-gray-600" />}
          description="Most used tier"
        />
      </div>

      {/* Budget Card */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Budget</CardTitle>
          <CardDescription>
            Track your GPU spending against your monthly limit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BudgetGauge
            spent={totalCost}
            limit={budgetLimit}
          />
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            {(['T4', 'A10G', 'A100', 'H100'] as GPUTier[]).map((tier) => {
              const tierData = summary?.byGpuTier?.[tier]
              const pricing = GPU_PRICING_TABLE[tier]
              return (
                <div key={tier} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <GPUTierBadge tier={tier} />
                    <span className="text-xs text-gray-500">
                      ${pricing.ratePerHour.toFixed(2)}/hr
                    </span>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium">{tierData?.runs || 0}</span>
                    <span className="text-gray-500"> runs</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatCost(tierData?.costUsd || 0)}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Usage History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Usage</CardTitle>
            <CardDescription>
              Your recent GPU simulation runs
            </CardDescription>
          </div>
          <Button onClick={refresh} variant="outline" size="sm">
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <UsageHistoryTable records={history.slice(0, 10)} />
        </CardContent>
      </Card>
    </div>
  )
}

export default GPUUsageDashboard
