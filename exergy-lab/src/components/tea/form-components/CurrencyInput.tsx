'use client'

import * as React from 'react'
import { DollarSign } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

export interface CurrencyInputProps {
  label: string
  value: number | undefined
  onChange: (value: number | undefined) => void
  unit?: string
  unitOptions?: string[]
  onUnitChange?: (unit: string) => void
  placeholder?: string
  hint?: string
  required?: boolean
  disabled?: boolean
  error?: string
  min?: number
  max?: number
}

export function CurrencyInput({
  label,
  value,
  onChange,
  unit = '$',
  unitOptions,
  onUnitChange,
  placeholder,
  hint,
  required = false,
  disabled = false,
  error,
  min,
  max,
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = React.useState<string>('')
  const [isFocused, setIsFocused] = React.useState(false)

  // Format number with thousand separators
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num)
  }

  // Parse formatted string to number
  const parseNumber = (str: string): number | undefined => {
    if (!str || str.trim() === '') return undefined
    const cleaned = str.replace(/[,$]/g, '')
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? undefined : parsed
  }

  // Update display value when prop value changes (unless focused)
  React.useEffect(() => {
    if (!isFocused && value !== undefined) {
      setDisplayValue(formatNumber(value))
    }
  }, [value, isFocused])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    setDisplayValue(input)

    // Parse and validate
    const parsed = parseNumber(input)
    if (parsed !== undefined) {
      if (min !== undefined && parsed < min) return
      if (max !== undefined && parsed > max) return
    }

    onChange(parsed)
  }

  const handleFocus = () => {
    setIsFocused(true)
    // Show raw number without formatting when focused
    if (value !== undefined) {
      setDisplayValue(value.toString())
    }
  }

  const handleBlur = () => {
    setIsFocused(false)
    // Re-format with thousand separators when unfocused
    if (value !== undefined) {
      setDisplayValue(formatNumber(value))
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={label} className="text-base font-medium text-foreground">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            <DollarSign className="w-4 h-4" />
          </div>
          <Input
            id={label}
            type="text"
            value={displayValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={`pl-9 ${error ? 'border-red-500' : ''}`}
          />
        </div>

        {unitOptions && onUnitChange && (
          <Select
            value={unit}
            onChange={onUnitChange}
            options={unitOptions.map((unitOption) => ({
              value: unitOption,
              label: unitOption,
            }))}
            className="w-32"
          />
        )}

        {!unitOptions && unit !== '$' && (
          <div className="flex items-center px-3 bg-elevated border border-border rounded-md text-sm text-muted min-w-[100px] justify-center">
            {unit}
          </div>
        )}
      </div>

      {hint && !error && (
        <p className="text-sm text-muted">{hint}</p>
      )}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
