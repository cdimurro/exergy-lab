import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format number as currency
 */
export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Format number with commas
 */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format energy values (MWh, GWh, TWh)
 */
export function formatEnergy(mwh: number): string {
  if (mwh >= 1_000_000) {
    return `${(mwh / 1_000_000).toFixed(1)} TWh`
  } else if (mwh >= 1_000) {
    return `${(mwh / 1_000).toFixed(1)} GWh`
  }
  return `${formatNumber(mwh)} MWh`
}

/**
 * Format power values (kW, MW, GW)
 */
export function formatPower(mw: number): string {
  if (mw >= 1_000) {
    return `${(mw / 1_000).toFixed(1)} GW`
  } else if (mw < 1) {
    return `${(mw * 1_000).toFixed(0)} kW`
  }
  return `${formatNumber(mw)} MW`
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => func(...args), wait)
  }
}
