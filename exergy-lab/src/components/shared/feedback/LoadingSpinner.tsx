'use client'

/**
 * LoadingSpinner Component
 *
 * Standardized loading spinner with consistent sizing and styling.
 */

import React from 'react'

interface LoadingSpinnerProps {
  /** Spinner size: sm (16px), md (32px), lg (48px) */
  size?: 'sm' | 'md' | 'lg'
  /** Optional loading text */
  text?: string
  /** Center the spinner in its container */
  centered?: boolean
  /** Optional className for additional styling */
  className?: string
}

const sizeClasses = {
  sm: 'h-4 w-4 border',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-2',
}

export function LoadingSpinner({
  size = 'md',
  text,
  centered = false,
  className = '',
}: LoadingSpinnerProps) {
  const spinner = (
    <div
      className={`animate-spin rounded-full border-primary border-t-transparent ${sizeClasses[size]} ${className}`}
    />
  )

  if (centered || text) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 ${centered ? 'h-full min-h-[200px]' : ''}`}>
        {spinner}
        {text && (
          <p className="text-sm text-foreground-muted">{text}</p>
        )}
      </div>
    )
  }

  return spinner
}

export default LoadingSpinner
