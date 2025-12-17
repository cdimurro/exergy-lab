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
      'cursor-pointer inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none'

    const variants = {
      // Primary: light green accent for CTAs
      primary:
        'bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-primary/50 shadow-sm',
      // Secondary: subtle dark surface
      secondary:
        'bg-background-surface text-foreground border border-border hover:bg-background-hover hover:border-border-subtle focus-visible:ring-primary/30',
      // Ghost: minimal, just text
      ghost:
        'text-foreground-muted hover:text-foreground hover:bg-background-surface focus-visible:ring-primary/30',
      // Outline: border with light green accent on hover
      outline:
        'border border-border text-foreground hover:text-primary hover:bg-primary/10 hover:border-primary focus-visible:ring-primary/30',
      // Danger: for destructive actions
      danger:
        'bg-error text-white hover:bg-error/90 focus-visible:ring-error/50 shadow-sm',
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
