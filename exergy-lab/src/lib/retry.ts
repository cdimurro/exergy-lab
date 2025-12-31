/**
 * Retry Utility with Exponential Backoff
 *
 * Provides configurable retry logic for handling transient failures
 * Useful for API calls that may temporarily fail due to network issues or rate limiting
 */

export interface RetryOptions {
  maxAttempts?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
  shouldRetry?: (error: any) => boolean
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  shouldRetry: (error) => {
    // Retry on network errors and 5xx errors
    if (error instanceof TypeError) return true // Network error
    if (error?.status >= 500) return true // Server error
    if (error?.status === 429) return true // Rate limited
    return false
  },
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry an async operation with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options }
  let lastError: any

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if we should retry
      if (!config.shouldRetry(error)) {
        throw error
      }

      // Don't delay on last attempt
      if (attempt === config.maxAttempts) {
        throw error
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelayMs
      )

      console.log(`[retry] Attempt ${attempt} failed, retrying in ${delay}ms...`)
      await sleep(delay)
    }
  }

  throw lastError
}

/**
 * Retry configuration for different types of operations
 */
export const RETRY_PRESETS = {
  /**
   * Fast retries for quick operations (e.g., API calls)
   */
  fast: {
    maxAttempts: 3,
    initialDelayMs: 50,
    maxDelayMs: 500,
  },

  /**
   * Standard retries for normal operations
   */
  standard: {
    maxAttempts: 3,
    initialDelayMs: 100,
    maxDelayMs: 5000,
  },

  /**
   * Aggressive retries for important operations
   */
  aggressive: {
    maxAttempts: 5,
    initialDelayMs: 100,
    maxDelayMs: 10000,
  },

  /**
   * No retries - fail fast
   */
  noRetry: {
    maxAttempts: 1,
  },
}
