'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface UsageBarProps {
  label: string
  current: number
  limit: number
  period: 'daily' | 'monthly'
  className?: string
}

export function UsageBar({ label, current, limit, period, className }: UsageBarProps) {
  const isUnlimited = limit === -1
  const percent = isUnlimited ? 0 : Math.min(100, Math.round((current / limit) * 100))
  const isNearLimit = percent >= 80
  const isAtLimit = percent >= 100

  // Color based on usage level
  const barColor = isAtLimit
    ? 'bg-red-500'
    : isNearLimit
    ? 'bg-amber-500'
    : 'bg-primary'

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-foreground-muted">
          {isUnlimited ? (
            <span className="text-primary">Unlimited</span>
          ) : (
            <>
              <span className={isAtLimit ? 'text-red-500 font-medium' : ''}>
                {current.toLocaleString()}
              </span>
              <span className="text-foreground-subtle"> / {limit.toLocaleString()}</span>
              <span className="text-xs text-foreground-subtle ml-1">
                ({period === 'daily' ? 'today' : 'this month'})
              </span>
            </>
          )}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 bg-background-elevated rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-300', barColor)}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  )
}
