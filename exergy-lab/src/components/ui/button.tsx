'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  glow?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      glow = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none'

    const variants = {
      // Primary: subtle blue, not overwhelming
      primary:
        'bg-primary/90 text-primary-foreground hover:bg-primary focus-visible:ring-primary/50',
      // Secondary: subtle border, good for most actions
      secondary:
        'bg-background-surface/80 text-foreground-muted border border-border hover:bg-background-surface hover:text-foreground hover:border-foreground-subtle focus-visible:ring-border',
      // Ghost: minimal, just text
      ghost:
        'text-foreground-muted hover:text-foreground hover:bg-background-surface/50 focus-visible:ring-border',
      // Outline: border only, transparent background
      outline:
        'border border-border text-foreground-muted hover:text-foreground hover:bg-background-surface/30 hover:border-foreground-subtle focus-visible:ring-border',
      // Danger: for destructive actions
      danger:
        'bg-error/80 text-white hover:bg-error focus-visible:ring-error/50',
    }

    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-9 px-4 text-sm',
      lg: 'h-11 px-5 text-sm',
    }

    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
