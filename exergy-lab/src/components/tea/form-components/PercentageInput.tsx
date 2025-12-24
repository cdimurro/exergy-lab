'use client'

import * as React from 'react'
import { Percent } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

export interface PercentageInputProps {
  label: string
  value: number | undefined
  onChange: (value: number | undefined) => void
  placeholder?: string
  hint?: string
  required?: boolean
  disabled?: boolean
  error?: string
  min?: number
  max?: number
  showSlider?: boolean
  step?: number
}

export function PercentageInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
  required = false,
  disabled = false,
  error,
  min = 0,
  max = 100,
  showSlider = false,
  step = 0.1,
}: PercentageInputProps) {
  const [displayValue, setDisplayValue] = React.useState<string>('')

  // Update display value when prop value changes
  React.useEffect(() => {
    if (value !== undefined) {
      setDisplayValue(value.toString())
    } else {
      setDisplayValue('')
    }
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    setDisplayValue(input)

    if (input === '') {
      onChange(undefined)
      return
    }

    const parsed = parseFloat(input)
    if (isNaN(parsed)) return

    // Validate range
    if (parsed < min || parsed > max) return

    onChange(parsed)
  }

  const handleSliderChange = (values: number[]) => {
    onChange(values[0])
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={label} className="text-base font-medium text-foreground">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      <div className="space-y-3">
        <div className="relative">
          <Input
            id={label}
            type="number"
            value={displayValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            disabled={disabled}
            min={min}
            max={max}
            step={step}
            className={`pr-9 ${error ? 'border-red-500' : ''}`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            <Percent className="w-4 h-4" />
          </div>
        </div>

        {showSlider && !disabled && value !== undefined && (
          <div className="px-1">
            <Slider
              value={[value]}
              onValueChange={handleSliderChange}
              min={min}
              max={max}
              step={step}
              className="cursor-pointer"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-muted">{min}%</span>
              <span className="text-xs text-muted">{max}%</span>
            </div>
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
