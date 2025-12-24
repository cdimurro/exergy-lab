import { useEffect, useState, useCallback, useRef } from 'react'

export interface UseFormPersistenceOptions {
  key: string
  data: any
  enabled?: boolean
  debounceMs?: number
  maxAgeMinutes?: number
}

export interface UseFormPersistenceReturn {
  isSaving: boolean
  lastSaved: Date | null
  hasSavedData: boolean
  restoreSaved: () => any | null
  clearSaved: () => void
  exportAsJSON: () => void
}

export function useFormPersistence({
  key,
  data,
  enabled = true,
  debounceMs = 5000,
  maxAgeMinutes = 60,
}: UseFormPersistenceOptions): UseFormPersistenceReturn {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasSavedData, setHasSavedData] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check for existing saved data on mount
  useEffect(() => {
    if (!enabled) return

    const saved = localStorage.getItem(key)
    setHasSavedData(saved !== null)
  }, [key, enabled])

  // Auto-save with debounce
  useEffect(() => {
    if (!enabled || !data) return

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout
    setIsSaving(true)
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const saveData = {
          data,
          timestamp: Date.now(),
          version: '1.0',
        }
        localStorage.setItem(key, JSON.stringify(saveData))
        setLastSaved(new Date())
        setIsSaving(false)
        setHasSavedData(true)
      } catch (error) {
        console.error('Failed to save form data:', error)
        setIsSaving(false)
      }
    }, debounceMs)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [data, key, enabled, debounceMs])

  const restoreSaved = useCallback((): any | null => {
    try {
      const saved = localStorage.getItem(key)
      if (!saved) return null

      const { data: savedData, timestamp } = JSON.parse(saved)

      // Check age
      const ageMinutes = (Date.now() - timestamp) / 1000 / 60
      if (ageMinutes > maxAgeMinutes) {
        // Too old, clear it
        localStorage.removeItem(key)
        setHasSavedData(false)
        return null
      }

      return savedData
    } catch (error) {
      console.error('Failed to restore saved data:', error)
      return null
    }
  }, [key, maxAgeMinutes])

  const clearSaved = useCallback(() => {
    localStorage.removeItem(key)
    setHasSavedData(false)
    setLastSaved(null)
  }, [key])

  const exportAsJSON = useCallback(() => {
    const exportData = {
      formData: data,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tea-form-export-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [data])

  return {
    isSaving,
    lastSaved,
    hasSavedData,
    restoreSaved,
    clearSaved,
    exportAsJSON,
  }
}
