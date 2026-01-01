/**
 * DomainTypeGrid Component
 *
 * Unified grid for selecting domains, simulation types, or technology types.
 * Supports both default (large) and compact variants.
 */

'use client'

import type { LucideIcon } from 'lucide-react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface GridItem {
  id: string
  label: string
  description?: string
  icon: LucideIcon
  disabled?: boolean
  badge?: string
}

export interface DomainTypeGridProps {
  items: GridItem[]
  selected: string | null
  onSelect: (id: string) => void
  columns?: 2 | 3 | 4 | 5
  variant?: 'default' | 'compact'
  label?: string
  helperText?: string
  required?: boolean
  autoDetected?: string | null
  className?: string
}

export function DomainTypeGrid({
  items,
  selected,
  onSelect,
  columns = 5,
  variant = 'default',
  label,
  helperText,
  required,
  autoDetected,
  className,
}: DomainTypeGridProps) {
  const gridColsClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  }[columns]

  const isCompact = variant === 'compact'

  return (
    <div className={className}>
      {label && (
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </h3>
      )}

      {/* Auto-detected indicator */}
      {autoDetected && !selected && (
        <div className="flex items-center gap-2 mb-3 text-xs text-primary">
          <Sparkles className="w-3 h-3" />
          <span>AI detected: {items.find(i => i.id === autoDetected)?.label}</span>
        </div>
      )}

      <div className={cn('grid gap-3', gridColsClass)}>
        {items.map((item) => {
          const Icon = item.icon
          const isSelected = selected === item.id
          const isAutoDetected = !selected && autoDetected === item.id

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => !item.disabled && onSelect(item.id)}
              disabled={item.disabled}
              className={cn(
                'rounded-lg border-2 transition-all',
                isCompact ? 'p-2' : 'p-4',
                isSelected && 'bg-primary/10 border-primary',
                isAutoDetected && 'bg-primary/5 border-primary/30',
                !isSelected && !isAutoDetected && 'bg-background border-border hover:border-primary/50 hover:scale-105',
                item.disabled && 'opacity-50 cursor-not-allowed',
                !item.disabled && 'cursor-pointer'
              )}
            >
              <div className={cn(
                'flex items-center gap-2',
                !isCompact && 'flex-col'
              )}>
                <Icon
                  className={cn(
                    isCompact ? 'w-4 h-4' : 'w-6 h-6',
                    isSelected ? 'text-primary' : 'text-muted'
                  )}
                />
                <span
                  className={cn(
                    'font-medium',
                    isCompact ? 'text-xs' : 'text-xs',
                    isSelected ? 'text-foreground' : 'text-muted'
                  )}
                >
                  {item.label}
                </span>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">
                    {item.badge}
                  </span>
                )}
              </div>
              {!isCompact && item.description && (
                <p className="text-xs text-muted mt-1 line-clamp-2">
                  {item.description}
                </p>
              )}
            </button>
          )
        })}
      </div>

      {helperText && (
        <p className="text-xs text-muted mt-3">{helperText}</p>
      )}
    </div>
  )
}
