import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ProgressProps {
  value: number // 0-100
  label?: string
  showPercentage?: boolean
  variant?: 'default' | 'success' | 'warning' | 'error'
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const variantColors = {
  default: 'bg-primary',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
}

const sizeClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
}

export function Progress({
  value,
  label,
  showPercentage = false,
  variant = 'default',
  className,
  size = 'md',
}: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value))

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <span className="text-sm font-medium text-foreground">{label}</span>
          )}
          {showPercentage && (
            <span className="text-sm text-foreground-muted">
              {clampedValue.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          'w-full rounded-full bg-background-surface overflow-hidden',
          sizeClasses[size]
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-in-out',
            variantColors[variant]
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  )
}
