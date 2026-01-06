'use client'

/**
 * EmptyState Component
 *
 * Standardized empty state display for lists and data views.
 */

import React from 'react'
import { Button } from '@/components/ui/button'

interface EmptyStateAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
}

interface EmptyStateProps {
  /** Lucide icon component to display */
  icon: React.ComponentType<{ className?: string }>
  /** Empty state title */
  title: string
  /** Empty state description */
  description: string
  /** Optional action button */
  action?: EmptyStateAction
  /** Optional secondary action button */
  secondaryAction?: EmptyStateAction
  /** Optional className for the container */
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center text-center space-y-4 p-12 ${className}`}>
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-foreground-muted max-w-md">{description}</p>
      </div>
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 pt-2">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'primary'}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant={secondaryAction.variant || 'secondary'}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default EmptyState
