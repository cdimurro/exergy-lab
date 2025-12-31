/**
 * Provider Utilities
 *
 * Shared helper functions for simulation providers.
 */

/**
 * Safely extract a number from inputs that may contain strings or numbers
 */
export function getNumber(value: number | string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue
  if (typeof value === 'number') return value
  const parsed = parseFloat(value)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * Safely extract a string from inputs
 */
export function getString(value: number | string | undefined, defaultValue: string): string {
  if (value === undefined) return defaultValue
  return String(value)
}

/**
 * Extract all numeric inputs with defaults
 */
export function extractNumericInputs<T extends Record<string, number>>(
  inputs: Record<string, number | string>,
  defaults: T
): T {
  const result = { ...defaults }
  for (const key of Object.keys(defaults)) {
    result[key as keyof T] = getNumber(inputs[key], defaults[key as keyof T]) as T[keyof T]
  }
  return result
}
