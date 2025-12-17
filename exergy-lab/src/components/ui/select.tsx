import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string
  error?: string
  hint?: string
  options: SelectOption[]
  onChange?: (value: string) => void
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, options, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange?.(e.target.value)
    }

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-foreground mb-2">
            {label}
          </label>
        )}
        <select
          className={cn(
            'flex h-12 w-full rounded-lg border bg-input-background px-4 py-3 text-base text-foreground',
            'focus:outline-none focus:ring-2 focus:ring-border-subtle focus:border-border-subtle',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'appearance-none bg-no-repeat bg-right',
            error ? 'border-error focus:ring-error' : 'border-input-border',
            className
          )}
          ref={ref}
          onChange={handleChange}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 0.5rem center',
            backgroundSize: '1.5em 1.5em',
            paddingRight: '2.5rem',
          }}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="truncate">
              {option.label}
            </option>
          ))}
        </select>
        {hint && !error && (
          <p className="mt-1 text-xs text-foreground-muted">{hint}</p>
        )}
        {error && <p className="mt-1 text-xs text-error">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'

export { Select }
