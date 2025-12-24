import { useState, useCallback } from 'react'
import type { TEAInput_v2, TechnologyType } from '@/types/tea'

export interface TEAFormState {
  formData: Partial<TEAInput_v2>
  errors: Record<string, string>
  touched: Record<string, boolean>
  isValid: boolean
  isDirty: boolean
}

export interface UseTEAFormStateReturn {
  formData: Partial<TEAInput_v2>
  errors: Record<string, string>
  touched: Record<string, boolean>
  isValid: boolean
  isDirty: boolean
  updateField: (path: string, value: any) => void
  updateNestedField: (path: string, value: any) => void
  setError: (field: string, error: string) => void
  clearError: (field: string) => void
  touchField: (field: string) => void
  validateField: (field: string) => boolean
  validateAll: () => boolean
  resetForm: () => void
  loadDefaults: (techType: TechnologyType, defaults: Partial<TEAInput_v2>) => void
  setFormData: (data: Partial<TEAInput_v2>) => void
}

export function useTEAFormState(
  initialData?: Partial<TEAInput_v2>
): UseTEAFormStateReturn {
  const [formData, setFormDataState] = useState<Partial<TEAInput_v2>>(initialData || {})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isDirty, setIsDirty] = useState(false)

  // Update a single field
  const updateField = useCallback((path: string, value: any) => {
    setFormDataState((prev) => ({
      ...prev,
      [path]: value,
    }))
    setIsDirty(true)

    // Auto-calculate derived fields
    setFormDataState((prev) => {
      const updated = { ...prev, [path]: value }

      // Calculate annual production from capacity and capacity factor
      if (path === 'capacity_mw' || path === 'capacity_factor') {
        if (updated.capacity_mw && updated.capacity_factor) {
          updated.annual_production_mwh = updated.capacity_mw * (updated.capacity_factor / 100) * 8760
        }
      }

      return updated
    })
  }, [])

  // Update nested field (e.g., "capexDetailed.bec.total")
  const updateNestedField = useCallback((path: string, value: any) => {
    setFormDataState((prev) => {
      const keys = path.split('.')
      const updated = { ...prev }
      let current: any = updated

      // Navigate to parent object
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {}
        }
        current = current[keys[i]]
      }

      // Set the value
      current[keys[keys.length - 1]] = value

      return updated
    })
    setIsDirty(true)
  }, [])

  const setError = useCallback((field: string, error: string) => {
    setErrors((prev) => ({ ...prev, [field]: error }))
  }, [])

  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      const updated = { ...prev }
      delete updated[field]
      return updated
    })
  }, [])

  const touchField = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }, [])

  const validateField = useCallback((field: string): boolean => {
    // Basic validation - can be extended with validation rules
    const value = formData[field as keyof TEAInput_v2]

    // Required field validation
    const requiredFields = [
      'project_name',
      'technology_type',
      'capacity_mw',
      'capacity_factor',
      'capex_per_kw',
      'project_lifetime_years',
      'discount_rate',
    ]

    if (requiredFields.includes(field) && (value === undefined || value === '')) {
      setError(field, 'This field is required')
      return false
    }

    clearError(field)
    return true
  }, [formData, setError, clearError])

  const validateAll = useCallback((): boolean => {
    const requiredFields = [
      'project_name',
      'technology_type',
      'capacity_mw',
      'capacity_factor',
      'capex_per_kw',
      'opex_per_kw_year',
      'project_lifetime_years',
      'discount_rate',
      'debt_ratio',
      'interest_rate',
      'tax_rate',
      'electricity_price_per_mwh',
    ]

    let isValid = true
    const newErrors: Record<string, string> = {}

    requiredFields.forEach((field) => {
      const value = formData[field as keyof TEAInput_v2]
      if (value === undefined || value === '' || value === null) {
        newErrors[field] = 'This field is required'
        isValid = false
      }
    })

    // Validate debt + equity = 100%
    if (formData.debt_ratio !== undefined) {
      const equity = 100 - formData.debt_ratio
      if (equity < 0 || equity > 100) {
        newErrors.debt_ratio = 'Debt ratio must be between 0-100%'
        isValid = false
      }
    }

    // Validate ranges
    if (formData.capacity_factor !== undefined) {
      if (formData.capacity_factor < 0 || formData.capacity_factor > 100) {
        newErrors.capacity_factor = 'Capacity factor must be between 0-100%'
        isValid = false
      }
    }

    setErrors(newErrors)
    return isValid
  }, [formData])

  const resetForm = useCallback(() => {
    setFormDataState({})
    setErrors({})
    setTouched({})
    setIsDirty(false)
  }, [])

  const loadDefaults = useCallback((techType: TechnologyType, defaults: Partial<TEAInput_v2>) => {
    setFormDataState((prev) => {
      const updated = { ...prev }

      // Only populate empty fields (preserve user edits)
      Object.keys(defaults).forEach((key) => {
        const typedKey = key as keyof TEAInput_v2
        if (updated[typedKey] === undefined || updated[typedKey] === '') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(updated as any)[typedKey] = defaults[typedKey]
        }
      })

      return updated
    })
    setIsDirty(true)
  }, [])

  const setFormData = useCallback((data: Partial<TEAInput_v2>) => {
    setFormDataState(data)
    setIsDirty(true)
  }, [])

  const isValid = Object.keys(errors).length === 0

  return {
    formData,
    errors,
    touched,
    isValid,
    isDirty,
    updateField,
    updateNestedField,
    setError,
    clearError,
    touchField,
    validateField,
    validateAll,
    resetForm,
    loadDefaults,
    setFormData,
  }
}
