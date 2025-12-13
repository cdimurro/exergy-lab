import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string | number
  unit?: string
  change?: number
  changeLabel?: string
  className?: string
}

export function KPICard({
  title,
  value,
  unit,
  change,
  changeLabel,
  className,
}: KPICardProps) {
  const isPositive = change !== undefined && change >= 0

  return (
    <div className={cn('kpi-card', className)}>
      <p className="text-sm text-text-muted mb-1">{title}</p>
      <div className="flex items-baseline gap-1">
        <span className="kpi-value">{value}</span>
        {unit && <span className="text-lg text-text-secondary">{unit}</span>}
      </div>
      {change !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-success" />
          ) : (
            <TrendingDown className="w-4 h-4 text-error" />
          )}
          <span
            className={cn(
              'text-sm font-medium',
              isPositive ? 'text-success' : 'text-error'
            )}
          >
            {isPositive ? '+' : ''}
            {change.toFixed(1)}%
          </span>
          {changeLabel && (
            <span className="text-sm text-text-muted">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  )
}
