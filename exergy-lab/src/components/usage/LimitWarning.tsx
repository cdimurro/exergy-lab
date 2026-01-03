'use client'

import * as React from 'react'
import { AlertTriangle, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge, Button } from '@/components/ui'
import Link from 'next/link'
import type { FeatureType } from '@/lib/usage/types'
import { useUsage } from '@/hooks/use-usage'

interface LimitWarningProps {
  feature: FeatureType
  className?: string
}

export function LimitWarning({ feature, className }: LimitWarningProps) {
  const { checkFeature, tier, getFeatureName } = useUsage()
  const check = checkFeature(feature)

  // Don't show warning if allowed and under 80%
  if (check.allowed && check.percentUsed < 80) {
    return null
  }

  // Don't show for unlimited
  if (check.limit === -1) {
    return null
  }

  const isAtLimit = !check.allowed
  const isNearLimit = check.allowed && check.percentUsed >= 80

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg px-3 py-2 text-sm',
        isAtLimit ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle
          className={cn(
            'h-4 w-4 flex-shrink-0',
            isAtLimit ? 'text-red-500' : 'text-amber-500'
          )}
        />
        <span className={isAtLimit ? 'text-red-700' : 'text-amber-700'}>
          {isAtLimit ? (
            <>
              You've reached your {getFeatureName(feature).toLowerCase()} limit.
              {tier === 'free' && ' Upgrade to continue.'}
            </>
          ) : (
            <>
              You've used {check.percentUsed}% of your {getFeatureName(feature).toLowerCase()} ({check.remaining} remaining)
            </>
          )}
        </span>
      </div>

      {check.upgradePrompt && (
        <Link href="/pricing">
          <Button
            size="sm"
            variant={isAtLimit ? 'primary' : 'ghost'}
            className={cn(
              'ml-2',
              !isAtLimit && 'text-amber-700 hover:text-amber-800'
            )}
          >
            Upgrade
            <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </Link>
      )}
    </div>
  )
}
