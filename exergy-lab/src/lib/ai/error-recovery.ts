import {
  RateLimitError,
  ValidationError,
  ToolExecutionError,
  RetryConfig,
  CircuitBreakerConfig,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from '@/types/agent'

// ============================================================================
// Retry Policy with Exponential Backoff
// ============================================================================

export class RetryPolicy {
  private config: RetryConfig

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config }
  }

  /**
   * Execute a function with exponential backoff retry logic
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    context?: string
  ): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error

        // Check if error is retryable
        if (!this.isRetryable(error as Error) || attempt === this.config.maxRetries) {
          throw error
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt)

        console.warn(
          `[RetryPolicy] Attempt ${attempt + 1}/${this.config.maxRetries + 1} failed${context ? ` for ${context}` : ''}. Retrying in ${delay}ms...`,
          error
        )

        // Wait before retry
        await this.sleep(delay)
      }
    }

    // Should never reach here, but TypeScript needs this
    throw lastError || new Error('Retry failed')
  }

  /**
   * Check if an error is retryable
   */
  private isRetryable(error: Error): boolean {
    // Check if error type is in retryable list
    const errorType = error.constructor.name
    if (this.config.retryableErrors.includes(errorType)) {
      return true
    }

    // Check if error message contains retryable keywords
    const message = error.message.toLowerCase()
    return this.config.retryableErrors.some((keyword) =>
      message.includes(keyword.toLowerCase())
    )
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number): number {
    // Exponential backoff: initialDelay * (backoffMultiplier ^ attempt)
    const exponentialDelay =
      this.config.initialDelay *
      Math.pow(this.config.backoffMultiplier, attempt)

    // Cap at maxDelay
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelay)

    // Add jitter (random 0-20% of delay) to prevent thundering herd
    const jitter = cappedDelay * 0.2 * Math.random()

    return Math.floor(cappedDelay + jitter)
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Get configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...updates }
  }
}

// ============================================================================
// Circuit Breaker Pattern
// ============================================================================

type CircuitState = 'closed' | 'open' | 'half-open'

interface CircuitStats {
  failures: number
  successes: number
  consecutiveFailures: number
  lastFailureTime?: number
  lastSuccessTime?: number
}

export class CircuitBreaker {
  private state: CircuitState = 'closed'
  private config: CircuitBreakerConfig
  private stats: CircuitStats = {
    failures: 0,
    successes: 0,
    consecutiveFailures: 0,
  }
  private halfOpenAttempts = 0

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config }
  }

  /**
   * Execute a function through the circuit breaker
   */
  async execute<T>(fn: () => Promise<T>, context?: string): Promise<T> {
    // Check if circuit is open
    if (this.state === 'open') {
      // Check if we should transition to half-open
      if (this.shouldAttemptReset()) {
        console.log(
          `[CircuitBreaker] Transitioning to HALF-OPEN state${context ? ` for ${context}` : ''}`
        )
        this.state = 'half-open'
        this.halfOpenAttempts = 0
      } else {
        throw new Error(
          `Circuit breaker is OPEN${context ? ` for ${context}` : ''}. Failing fast.`
        )
      }
    }

    try {
      const result = await fn()
      this.onSuccess(context)
      return result
    } catch (error) {
      this.onFailure(context)
      throw error
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(context?: string): void {
    this.stats.successes++
    this.stats.consecutiveFailures = 0
    this.stats.lastSuccessTime = Date.now()

    if (this.state === 'half-open') {
      this.halfOpenAttempts++

      if (this.halfOpenAttempts >= this.config.halfOpenAttempts) {
        console.log(
          `[CircuitBreaker] Transitioning to CLOSED state${context ? ` for ${context}` : ''}`
        )
        this.state = 'closed'
        this.resetStats()
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(context?: string): void {
    this.stats.failures++
    this.stats.consecutiveFailures++
    this.stats.lastFailureTime = Date.now()

    if (this.state === 'half-open') {
      console.warn(
        `[CircuitBreaker] Failure in HALF-OPEN state, transitioning to OPEN${context ? ` for ${context}` : ''}`
      )
      this.state = 'open'
    } else if (
      this.state === 'closed' &&
      this.stats.consecutiveFailures >= this.config.failureThreshold
    ) {
      console.warn(
        `[CircuitBreaker] Failure threshold (${this.config.failureThreshold}) reached, transitioning to OPEN${context ? ` for ${context}` : ''}`
      )
      this.state = 'open'
    }
  }

  /**
   * Check if we should attempt to reset the circuit
   */
  private shouldAttemptReset(): boolean {
    if (!this.stats.lastFailureTime) return false

    const timeSinceLastFailure = Date.now() - this.stats.lastFailureTime
    return timeSinceLastFailure >= this.config.resetTimeout
  }

  /**
   * Reset statistics
   */
  private resetStats(): void {
    this.stats = {
      failures: 0,
      successes: 0,
      consecutiveFailures: 0,
    }
    this.halfOpenAttempts = 0
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state
  }

  /**
   * Get statistics
   */
  getStats(): CircuitStats {
    return { ...this.stats }
  }

  /**
   * Manually reset the circuit
   */
  reset(): void {
    console.log('[CircuitBreaker] Manually resetting circuit')
    this.state = 'closed'
    this.resetStats()
  }

  /**
   * Check if circuit is operational (closed or half-open)
   */
  isOperational(): boolean {
    return this.state === 'closed' || this.state === 'half-open'
  }
}

// ============================================================================
// Combined Retry with Circuit Breaker
// ============================================================================

export class ResilientExecutor {
  private retryPolicy: RetryPolicy
  private circuitBreaker: CircuitBreaker

  constructor(
    retryConfig?: Partial<RetryConfig>,
    circuitBreakerConfig?: Partial<CircuitBreakerConfig>
  ) {
    this.retryPolicy = new RetryPolicy(retryConfig)
    this.circuitBreaker = new CircuitBreaker(circuitBreakerConfig)
  }

  /**
   * Execute with both retry policy and circuit breaker
   */
  async execute<T>(fn: () => Promise<T>, context?: string): Promise<T> {
    return this.circuitBreaker.execute(
      () => this.retryPolicy.executeWithRetry(fn, context),
      context
    )
  }

  /**
   * Get retry policy
   */
  getRetryPolicy(): RetryPolicy {
    return this.retryPolicy
  }

  /**
   * Get circuit breaker
   */
  getCircuitBreaker(): CircuitBreaker {
    return this.circuitBreaker
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.circuitBreaker.reset()
  }

  /**
   * Check if executor is operational
   */
  isOperational(): boolean {
    return this.circuitBreaker.isOperational()
  }
}

// ============================================================================
// Error Classification & Handling
// ============================================================================

/**
 * Classify errors into categories for better handling
 */
export enum ErrorCategory {
  RETRYABLE = 'retryable', // Transient errors
  NON_RETRYABLE = 'non_retryable', // Permanent errors
  RATE_LIMIT = 'rate_limit', // Rate limit exceeded
  VALIDATION = 'validation', // Data validation errors
  TIMEOUT = 'timeout', // Timeout errors
  NETWORK = 'network', // Network errors
  UNKNOWN = 'unknown', // Unknown errors
}

export function classifyError(error: Error): ErrorCategory {
  if (error instanceof RateLimitError) {
    return ErrorCategory.RATE_LIMIT
  }

  if (error instanceof ValidationError) {
    return ErrorCategory.VALIDATION
  }

  if (error instanceof ToolExecutionError) {
    // Tool execution errors might be retryable or not
    const originalError = error.originalError
    return classifyError(originalError)
  }

  const message = error.message.toLowerCase()

  if (message.includes('timeout') || message.includes('timed out')) {
    return ErrorCategory.TIMEOUT
  }

  if (
    message.includes('429') ||
    message.includes('rate limit') ||
    message.includes('too many requests')
  ) {
    return ErrorCategory.RATE_LIMIT
  }

  if (
    message.includes('network') ||
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('503') ||
    message.includes('502')
  ) {
    return ErrorCategory.NETWORK
  }

  if (
    message.includes('400') ||
    message.includes('401') ||
    message.includes('403') ||
    message.includes('404') ||
    message.includes('invalid')
  ) {
    return ErrorCategory.NON_RETRYABLE
  }

  if (message.includes('500') || message.includes('503')) {
    return ErrorCategory.RETRYABLE
  }

  return ErrorCategory.UNKNOWN
}

/**
 * Determine if an error should be retried
 */
export function shouldRetryError(error: Error): boolean {
  const category = classifyError(error)

  return (
    category === ErrorCategory.RETRYABLE ||
    category === ErrorCategory.RATE_LIMIT ||
    category === ErrorCategory.TIMEOUT ||
    category === ErrorCategory.NETWORK
  )
}

/**
 * Get suggested delay for rate limit errors
 */
export function getSuggestedDelay(error: Error): number {
  if (error instanceof RateLimitError && error.retryAfter) {
    return error.retryAfter
  }

  // Default delays by category
  const category = classifyError(error)

  switch (category) {
    case ErrorCategory.RATE_LIMIT:
      return 60000 // 1 minute
    case ErrorCategory.TIMEOUT:
      return 5000 // 5 seconds
    case ErrorCategory.NETWORK:
      return 3000 // 3 seconds
    default:
      return 1000 // 1 second
  }
}

/**
 * Create a user-friendly error message
 */
export function formatErrorMessage(error: Error): string {
  const category = classifyError(error)

  switch (category) {
    case ErrorCategory.RATE_LIMIT:
      return 'Rate limit exceeded. Please try again in a few moments.'
    case ErrorCategory.TIMEOUT:
      return 'Request timed out. Please try again.'
    case ErrorCategory.NETWORK:
      return 'Network error occurred. Please check your connection and try again.'
    case ErrorCategory.VALIDATION:
      return `Validation error: ${error.message}`
    case ErrorCategory.NON_RETRYABLE:
      return `Error: ${error.message}`
    default:
      return 'An unexpected error occurred. Please try again.'
  }
}

// ============================================================================
// Global Error Handlers
// ============================================================================

/**
 * Global resilient executor instance (singleton)
 */
let globalResilientExecutor: ResilientExecutor | null = null

/**
 * Get or create global resilient executor
 */
export function getGlobalResilientExecutor(): ResilientExecutor {
  if (!globalResilientExecutor) {
    globalResilientExecutor = new ResilientExecutor()
  }
  return globalResilientExecutor
}

/**
 * Reset global resilient executor
 */
export function resetGlobalResilientExecutor(): void {
  if (globalResilientExecutor) {
    globalResilientExecutor.reset()
  }
}

/**
 * Helper to execute with global resilient executor
 */
export async function executeResilient<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<T> {
  return getGlobalResilientExecutor().execute(fn, context)
}
