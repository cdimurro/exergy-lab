/**
 * WorkflowSectionCard Component
 *
 * Unified collapsible section card with optional progress tracking.
 * Based on the TEA SectionCard pattern.
 */

'use client'

import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface WorkflowSectionCardProps {
  title: string
  icon?: LucideIcon
  description?: string
  children: React.ReactNode
  collapsible?: boolean
  defaultExpanded?: boolean
  progress?: {
    filled: number
    total: number
  }
  errorCount?: number
  variant?: 'default' | 'highlight' | 'subtle'
  actions?: React.ReactNode
  className?: string
}

export function WorkflowSectionCard({
  title,
  icon: Icon,
  description,
  children,
  collapsible = false,
  defaultExpanded = true,
  progress,
  errorCount = 0,
  variant = 'default',
  actions,
  className,
}: WorkflowSectionCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)

  const isComplete = progress && progress.filled >= progress.total
  const hasErrors = errorCount > 0

  const variantStyles = {
    default: 'bg-card-dark border-border',
    highlight: 'bg-primary/5 border-primary/20',
    subtle: 'bg-elevated border-border',
  }

  return (
    <Card className={cn('overflow-hidden', variantStyles[variant], className)}>
      {/* Header */}
      <div
        className={cn(
          'px-4 py-3 border-b border-border bg-elevated transition-colors',
          collapsible && 'cursor-pointer hover:bg-elevated/80'
        )}
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {title}
                </h3>

                {/* Progress Badge */}
                {progress && (
                  <Badge
                    variant={isComplete ? 'default' : 'secondary'}
                    className={cn(
                      'text-xs',
                      isComplete ? 'bg-success text-white' : 'bg-slate-700 text-slate-300'
                    )}
                  >
                    {progress.filled}/{progress.total}
                    {isComplete && <CheckCircle2 className="w-3 h-3 ml-1" />}
                  </Badge>
                )}

                {/* Error Badge */}
                {hasErrors && (
                  <Badge variant="error" className="text-xs">
                    {errorCount} {errorCount === 1 ? 'error' : 'errors'}
                  </Badge>
                )}
              </div>

              {description && (
                <p className="text-xs text-muted mt-0.5">{description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}

            {collapsible && (
              <div className="text-muted">
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {(!collapsible || isExpanded) && (
        <div className="p-6">
          {children}
        </div>
      )}
    </Card>
  )
}
