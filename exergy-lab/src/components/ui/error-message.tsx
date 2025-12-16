import * as React from 'react'
import { AlertCircle, AlertTriangle, Info, RefreshCw, X } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { cn } from '@/lib/utils'

export interface ErrorMessageProps {
  title?: string
  message: string
  variant?: 'error' | 'warning' | 'info'
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

export function ErrorMessage({
  title,
  message,
  variant = 'error',
  onRetry,
  onDismiss,
  className,
}: ErrorMessageProps) {
  const config = {
    error: {
      icon: AlertCircle,
      bg: 'bg-red-50',
      border: 'border-red-200',
      iconColor: 'text-red-600',
      title: 'Error',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      iconColor: 'text-amber-600',
      title: 'Warning',
    },
    info: {
      icon: Info,
      bg: 'bg-primary/10',
      border: 'border-primary/20',
      iconColor: 'text-primary',
      title: 'Information',
    },
  }

  const { icon: Icon, bg, border, iconColor, title: defaultTitle } = config[variant]

  return (
    <Card className={cn(bg, border, 'relative', className)}>
      <div className="flex items-start gap-3">
        <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', iconColor)} />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground mb-1">{title || defaultTitle}</h4>
          <p className="text-sm text-foreground-muted">{message}</p>

          {(onRetry || onDismiss) && (
            <div className="flex items-center gap-2 mt-3">
              {onRetry && (
                <Button variant="secondary" size="sm" onClick={onRetry}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Try Again
                </Button>
              )}
              {onDismiss && (
                <Button variant="ghost" size="sm" onClick={onDismiss}>
                  Dismiss
                </Button>
              )}
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="shrink-0 p-1 rounded hover:bg-background-surface transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-foreground-muted" />
          </button>
        )}
      </div>
    </Card>
  )
}

// Empty state component
export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('empty-state', className)}>
      {icon && <div className="mb-4 text-foreground-muted">{icon}</div>}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-foreground-muted max-w-md mb-6">{description}</p>
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
