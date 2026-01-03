'use client'

import * as React from 'react'
import { Card, Badge, Button } from '@/components/ui'
import { BarChart3, Sparkles, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUsage } from '@/hooks/use-usage'
import { UsageBar } from './UsageBar'
import Link from 'next/link'

interface UsageDashboardProps {
  className?: string
  compact?: boolean
}

export function UsageDashboard({ className, compact = false }: UsageDashboardProps) {
  const { tier, tierDisplayName, summary, isLoaded } = useUsage()

  if (!isLoaded || !summary) {
    return (
      <Card className={cn('bg-background-surface', className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 bg-background-elevated rounded" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-4 w-full bg-background-elevated rounded" />
                <div className="h-2 w-full bg-background-elevated rounded" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  const tierColors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-700',
    pro: 'bg-primary/10 text-primary',
    enterprise: 'bg-amber-100 text-amber-700',
  }

  // Filter features for compact view
  const displayFeatures = compact
    ? summary.features.filter((f) => f.currentUsage > 0 || f.limit !== -1).slice(0, 4)
    : summary.features

  return (
    <Card className={cn('bg-background-surface', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-foreground-muted" />
          <h3 className="font-semibold text-foreground">Usage</h3>
          <Badge className={tierColors[tier]} size="sm">
            {tierDisplayName}
          </Badge>
        </div>
        {tier === 'free' && (
          <Link href="/pricing">
            <Button variant="ghost" size="sm" className="text-primary">
              <Sparkles className="h-4 w-4 mr-1" />
              Upgrade
            </Button>
          </Link>
        )}
      </div>

      {/* Usage Bars */}
      <div className="space-y-4">
        {displayFeatures.map((feature) => (
          <UsageBar
            key={feature.feature}
            label={feature.displayName}
            current={feature.currentUsage}
            limit={feature.limit}
            period={feature.period}
          />
        ))}
      </div>

      {/* View All Link (for compact mode) */}
      {compact && summary.features.length > displayFeatures.length && (
        <Link
          href="/settings?tab=usage"
          className="flex items-center justify-center gap-1 mt-4 text-sm text-primary hover:underline"
        >
          View all usage
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </Card>
  )
}
