import { useEffect, useRef } from 'react'

interface UseAutoSaveOptions {
  interval?: number // Milliseconds between saves (default: 30000)
  enabled?: boolean // Enable/disable auto-save (default: true)
  onSave?: () => void // Callback after save
}

/**
 * Hook for auto-saving data with debouncing
 *
 * @example
 * const { updateDraft } = useExperimentsStore()
 *
 * useAutoSave(experimentFormData, updateDraft, {
 *   interval: 30000, // 30 seconds
 *   enabled: true
 * })
 */
export function useAutoSave<T>(
  data: T,
  saveFn: (data: T) => void,
  options: UseAutoSaveOptions = {}
) {
  const {
    interval = 30000,
    enabled = true,
    onSave
  } = options

  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const previousDataRef = useRef<T>(data)
  const lastSaveTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    if (!enabled) {
      // Clear timeout if disabled
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      return
    }

    // Check if data actually changed
    const dataChanged = JSON.stringify(data) !== JSON.stringify(previousDataRef.current)

    if (!dataChanged) return

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(() => {
      console.log('[Auto-save] Saving data...')
      saveFn(data)
      previousDataRef.current = data
      lastSaveTimeRef.current = Date.now()
      onSave?.()
    }, interval)

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [data, saveFn, interval, enabled, onSave])

  // Return last save time for UI display
  return {
    lastSaveTime: lastSaveTimeRef.current,
    isDirty: JSON.stringify(data) !== JSON.stringify(previousDataRef.current)
  }
}
