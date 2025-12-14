'use client'

import { Card, Metric, Text, Flex, BadgeDelta, DeltaType } from '@tremor/react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string | number
  unit?: string
  change?: number
  changeLabel?: string
  icon?: LucideIcon
  accentColor?: 'emerald' | 'blue' | 'purple' | 'amber' | 'cyan' | 'rose'
  className?: string
}

export function KPICard({
  title,
  value,
  unit,
  change,
  changeLabel,
  icon: Icon,
  accentColor = 'emerald',
  className,
}: KPICardProps) {
  const getDeltaType = (change: number): DeltaType => {
    if (change > 0) return 'increase'
    if (change < 0) return 'decrease'
    return 'unchanged'
  }

  const accentColors = {
    emerald: 'text-emerald-500',
    blue: 'text-blue-500',
    purple: 'text-purple-500',
    amber: 'text-amber-500',
    cyan: 'text-cyan-500',
    rose: 'text-rose-500',
  }

  const accentBgColors = {
    emerald: 'bg-emerald-500/10',
    blue: 'bg-blue-500/10',
    purple: 'bg-purple-500/10',
    amber: 'bg-amber-500/10',
    cyan: 'bg-cyan-500/10',
    rose: 'bg-rose-500/10',
  }

  return (
    <Card
      className={cn(
        'relative overflow-hidden bg-background-elevated border-border',
        className
      )}
      decoration="top"
      decorationColor={accentColor}
    >
      <Flex alignItems="start" justifyContent="between">
        <div>
          <Text className="text-foreground-muted">{title}</Text>
          <Flex alignItems="baseline" className="mt-2 space-x-2">
            <Metric className="text-foreground">
              {value}
              {unit && (
                <span className="text-lg font-normal text-foreground-muted ml-1">
                  {unit}
                </span>
              )}
            </Metric>
          </Flex>
          {change !== undefined && (
            <Flex className="mt-2 space-x-2" alignItems="center">
              <BadgeDelta
                deltaType={getDeltaType(change)}
                size="sm"
              >
                {change > 0 ? '+' : ''}
                {change.toFixed(1)}%
              </BadgeDelta>
              {changeLabel && (
                <Text className="text-foreground-subtle text-xs">
                  {changeLabel}
                </Text>
              )}
            </Flex>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              'p-3 rounded-xl',
              accentBgColors[accentColor]
            )}
          >
            <Icon className={cn('w-6 h-6', accentColors[accentColor])} />
          </div>
        )}
      </Flex>
    </Card>
  )
}
