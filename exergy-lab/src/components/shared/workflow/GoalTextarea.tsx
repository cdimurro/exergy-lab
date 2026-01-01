/**
 * GoalTextarea Component
 *
 * Unified goal/description input with character counter and validation feedback.
 */

'use client'

import { cn } from '@/lib/utils'

export interface GoalTextareaProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  maxLength?: number
  minLength?: number
  rows?: number
  required?: boolean
  helperText?: string
  error?: string
  className?: string
}

export function GoalTextarea({
  value,
  onChange,
  label,
  placeholder = 'Describe your goal...',
  maxLength = 1000,
  minLength = 20,
  rows = 4,
  required,
  helperText,
  error,
  className,
}: GoalTextareaProps) {
  const charCount = value.length
  const isNearLimit = charCount > maxLength * 0.8
  const isTooShort = charCount > 0 && charCount < minLength
  const isOverLimit = charCount > maxLength

  return (
    <div className={className}>
      {label && (
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </h3>
      )}

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength + 100} // Allow slight overflow for UX
        className={cn(
          'w-full px-4 py-3 bg-background border rounded-lg text-foreground',
          'placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none',
          error ? 'border-red-500' : 'border-border',
          isOverLimit && 'border-red-500'
        )}
      />

      <div className="mt-2 flex items-center justify-between">
        <div className="flex-1">
          {error ? (
            <p className="text-xs text-red-400">{error}</p>
          ) : helperText ? (
            <p className="text-xs text-muted">{helperText}</p>
          ) : isTooShort ? (
            <p className="text-xs text-amber-400">
              Add more detail ({minLength - charCount} more characters recommended)
            </p>
          ) : null}
        </div>

        <span
          className={cn(
            'text-xs',
            isOverLimit && 'text-red-400',
            isNearLimit && !isOverLimit && 'text-amber-400',
            !isNearLimit && 'text-muted'
          )}
        >
          {charCount} / {maxLength}
        </span>
      </div>
    </div>
  )
}
