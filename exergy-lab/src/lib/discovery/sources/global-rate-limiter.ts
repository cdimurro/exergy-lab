/**
 * Global Rate Limiter
 *
 * Provides coordinated rate limiting across all data source adapters.
 * Prevents API abuse and ensures fair resource usage.
 *
 * Features:
 * - Global request limit (prevents overwhelming external APIs)
 * - Per-source rate limits (respects individual API limits)
 * - Token bucket algorithm with refill
 * - Priority queue for high-priority requests
 * - Statistics and monitoring
 *
 * @see base.ts - Individual source adapters
 * @see /Users/chrisdimurro/.claude/plans/idempotent-beaming-rose.md - Implementation plan
 */

import type { DataSourceName } from '@/types/sources'

// ============================================================================
// Types
// ============================================================================

export interface RateLimitConfig {
  /** Requests per minute allowed */
  requestsPerMinute: number
  /** Requests per day allowed (optional) */
  requestsPerDay?: number
  /** Burst allowance (extra tokens for short bursts) */
  burstSize?: number
}

export interface RateLimitStatus {
  /** Current available tokens */
  available: number
  /** Maximum tokens (capacity) */
  capacity: number
  /** Time until next token refill (ms) */
  timeUntilRefill: number
  /** Whether requests can be made now */
  canProceed: boolean
  /** Requests made in current window */
  requestsInWindow: number
  /** Daily requests made */
  dailyRequests: number
}

export interface GlobalRateLimitStats {
  /** Total requests made */
  totalRequests: number
  /** Requests throttled */
  throttledRequests: number
  /** Per-source statistics */
  bySource: Record<string, {
    requests: number
    throttled: number
    lastRequest: number
  }>
  /** Global rate limit status */
  globalStatus: RateLimitStatus
}

// ============================================================================
// Source-Specific Rate Limits
// ============================================================================

/**
 * Rate limits for each data source based on their API documentation
 * Uses Partial<Record> since not all sources may have specific limits defined
 */
const SOURCE_RATE_LIMITS: Partial<Record<DataSourceName, RateLimitConfig>> = {
  'semantic-scholar': {
    requestsPerMinute: 100,  // Free tier
    requestsPerDay: 5000,
    burstSize: 10,
  },
  'arxiv': {
    requestsPerMinute: 3,    // Very conservative (no official limit but easily blocked)
    burstSize: 1,
  },
  'openalex': {
    requestsPerMinute: 100,  // Free tier
    requestsPerDay: 100000,
    burstSize: 20,
  },
  'pubmed': {
    requestsPerMinute: 3,    // Without API key
    requestsPerDay: 100,
    burstSize: 1,
  },
  'ieee': {
    requestsPerMinute: 10,   // Paid tier varies
    requestsPerDay: 200,
    burstSize: 5,
  },
  'materials-project': {
    requestsPerMinute: 30,   // With API key
    burstSize: 5,
  },
  'nrel': {
    requestsPerMinute: 30,
    burstSize: 5,
  },
  'eia': {
    requestsPerMinute: 30,
    burstSize: 5,
  },
  'iea': {
    requestsPerMinute: 30,
    burstSize: 5,
  },
  'google-patents': {
    requestsPerMinute: 10,
    burstSize: 3,
  },
  'uspto': {
    requestsPerMinute: 30,   // With API key
    burstSize: 5,
  },
  'newsapi': {
    requestsPerMinute: 60,
    burstSize: 10,
  },
  'zenodo': {
    requestsPerMinute: 60,
    burstSize: 10,
  },
}

/**
 * Global rate limit across all sources
 */
const GLOBAL_RATE_LIMIT: RateLimitConfig = {
  requestsPerMinute: 100,
  requestsPerDay: 10000,
  burstSize: 30,
}

/**
 * Default rate limit for sources without specific config
 */
const DEFAULT_SOURCE_RATE_LIMIT: RateLimitConfig = {
  requestsPerMinute: 30,
  burstSize: 5,
}

/**
 * Get rate limit config for a source, falling back to default
 */
function getSourceRateLimit(source: DataSourceName): RateLimitConfig {
  return SOURCE_RATE_LIMITS[source] || DEFAULT_SOURCE_RATE_LIMIT
}

// ============================================================================
// Token Bucket Implementation
// ============================================================================

class TokenBucket {
  private tokens: number
  private lastRefill: number
  private readonly capacity: number
  private readonly refillRate: number  // tokens per ms

  constructor(config: RateLimitConfig) {
    this.capacity = config.requestsPerMinute + (config.burstSize || 0)
    this.tokens = this.capacity
    this.lastRefill = Date.now()
    this.refillRate = config.requestsPerMinute / (60 * 1000)  // tokens per ms
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now()
    const elapsed = now - this.lastRefill
    const tokensToAdd = elapsed * this.refillRate

    if (tokensToAdd >= 1) {
      this.tokens = Math.min(this.capacity, this.tokens + Math.floor(tokensToAdd))
      this.lastRefill = now
    }
  }

  /**
   * Try to consume a token
   * @returns true if token was consumed, false if rate limited
   */
  tryConsume(): boolean {
    this.refill()

    if (this.tokens >= 1) {
      this.tokens--
      return true
    }

    return false
  }

  /**
   * Get time until a token is available (ms)
   */
  getTimeUntilAvailable(): number {
    this.refill()

    if (this.tokens >= 1) {
      return 0
    }

    // Calculate time until next token
    const tokensNeeded = 1 - this.tokens
    return Math.ceil(tokensNeeded / this.refillRate)
  }

  /**
   * Get current status
   */
  getStatus(): { available: number; capacity: number; timeUntilRefill: number } {
    this.refill()
    return {
      available: Math.floor(this.tokens),
      capacity: this.capacity,
      timeUntilRefill: this.getTimeUntilAvailable(),
    }
  }

  /**
   * Reset the bucket to full capacity
   */
  reset(): void {
    this.tokens = this.capacity
    this.lastRefill = Date.now()
  }
}

// ============================================================================
// Global Rate Limiter
// ============================================================================

class GlobalRateLimiter {
  private globalBucket: TokenBucket
  private sourceBuckets: Map<DataSourceName, TokenBucket> = new Map()
  private dailyRequests: Map<string, number> = new Map()
  private lastDayReset: number = Date.now()

  // Statistics
  private stats = {
    totalRequests: 0,
    throttledRequests: 0,
    bySource: {} as Record<string, { requests: number; throttled: number; lastRequest: number }>,
  }

  constructor() {
    this.globalBucket = new TokenBucket(GLOBAL_RATE_LIMIT)

    // Initialize source buckets for known sources
    for (const [source, config] of Object.entries(SOURCE_RATE_LIMITS)) {
      if (config) {
        this.sourceBuckets.set(source as DataSourceName, new TokenBucket(config))
      }
    }
  }

  /**
   * Get or create a bucket for a source
   */
  private getSourceBucket(source: DataSourceName): TokenBucket {
    let bucket = this.sourceBuckets.get(source)
    if (!bucket) {
      // Create bucket on demand with default config
      bucket = new TokenBucket(getSourceRateLimit(source))
      this.sourceBuckets.set(source, bucket)
    }
    return bucket
  }

  /**
   * Check if a request can proceed
   * @param source - The data source making the request
   * @returns true if request can proceed, false if rate limited
   */
  canProceed(source: DataSourceName): boolean {
    this.checkDayReset()

    // Check global limit first
    const globalStatus = this.globalBucket.getStatus()
    if (globalStatus.available < 1) {
      return false
    }

    // Check source-specific limit
    const sourceBucket = this.getSourceBucket(source)
    const sourceStatus = sourceBucket.getStatus()
    if (sourceStatus.available < 1) {
      return false
    }

    // Check daily limits
    const dailyKey = `${source}-${this.getDayKey()}`
    const sourceConfig = getSourceRateLimit(source)
    if (sourceConfig.requestsPerDay) {
      const dailyCount = this.dailyRequests.get(dailyKey) || 0
      if (dailyCount >= sourceConfig.requestsPerDay) {
        return false
      }
    }

    // Check global daily limit
    const globalDailyKey = `global-${this.getDayKey()}`
    const globalDailyCount = this.dailyRequests.get(globalDailyKey) || 0
    if (GLOBAL_RATE_LIMIT.requestsPerDay && globalDailyCount >= GLOBAL_RATE_LIMIT.requestsPerDay) {
      return false
    }

    return true
  }

  /**
   * Consume tokens for a request
   * @param source - The data source making the request
   * @returns true if tokens were consumed, false if rate limited
   */
  consume(source: DataSourceName): boolean {
    this.stats.totalRequests++

    // Initialize source stats if needed
    if (!this.stats.bySource[source]) {
      this.stats.bySource[source] = { requests: 0, throttled: 0, lastRequest: 0 }
    }

    if (!this.canProceed(source)) {
      this.stats.throttledRequests++
      this.stats.bySource[source].throttled++
      return false
    }

    // Consume from global bucket
    this.globalBucket.tryConsume()

    // Consume from source bucket
    const sourceBucket = this.getSourceBucket(source)
    sourceBucket.tryConsume()

    // Update daily counters
    const dailyKey = `${source}-${this.getDayKey()}`
    this.dailyRequests.set(dailyKey, (this.dailyRequests.get(dailyKey) || 0) + 1)

    const globalDailyKey = `global-${this.getDayKey()}`
    this.dailyRequests.set(globalDailyKey, (this.dailyRequests.get(globalDailyKey) || 0) + 1)

    // Update stats
    this.stats.bySource[source].requests++
    this.stats.bySource[source].lastRequest = Date.now()

    return true
  }

  /**
   * Get wait time until a request can proceed (ms)
   */
  getWaitTime(source: DataSourceName): number {
    const globalWait = this.globalBucket.getTimeUntilAvailable()
    const sourceBucket = this.getSourceBucket(source)
    const sourceWait = sourceBucket.getTimeUntilAvailable()

    return Math.max(globalWait, sourceWait)
  }

  /**
   * Get rate limit status for a source
   */
  getStatus(source: DataSourceName): RateLimitStatus {
    const sourceBucket = this.getSourceBucket(source)
    const sourceStatus = sourceBucket.getStatus()

    const dailyKey = `${source}-${this.getDayKey()}`
    const dailyRequests = this.dailyRequests.get(dailyKey) || 0

    return {
      available: sourceStatus.available,
      capacity: sourceStatus.capacity,
      timeUntilRefill: sourceStatus.timeUntilRefill,
      canProceed: this.canProceed(source),
      requestsInWindow: sourceStatus.capacity - sourceStatus.available,
      dailyRequests,
    }
  }

  /**
   * Get global statistics
   */
  getStats(): GlobalRateLimitStats {
    const globalDailyKey = `global-${this.getDayKey()}`
    const globalDailyCount = this.dailyRequests.get(globalDailyKey) || 0

    return {
      totalRequests: this.stats.totalRequests,
      throttledRequests: this.stats.throttledRequests,
      bySource: { ...this.stats.bySource },
      globalStatus: {
        ...this.globalBucket.getStatus(),
        canProceed: this.globalBucket.getStatus().available >= 1,
        requestsInWindow: this.globalBucket.getStatus().capacity - this.globalBucket.getStatus().available,
        dailyRequests: globalDailyCount,
      },
    }
  }

  /**
   * Wait until a request can proceed
   * @param source - The data source
   * @param maxWaitMs - Maximum time to wait (default: 30s)
   * @returns true if can proceed, false if timeout
   */
  async waitForToken(source: DataSourceName, maxWaitMs: number = 30000): Promise<boolean> {
    const waitTime = this.getWaitTime(source)

    if (waitTime === 0) {
      return true
    }

    if (waitTime > maxWaitMs) {
      console.warn(`[GlobalRateLimiter] Wait time ${waitTime}ms exceeds max ${maxWaitMs}ms for ${source}`)
      return false
    }

    console.log(`[GlobalRateLimiter] Waiting ${waitTime}ms for ${source}`)
    await new Promise(resolve => setTimeout(resolve, waitTime))

    return this.canProceed(source)
  }

  /**
   * Reset all rate limiters
   */
  reset(): void {
    this.globalBucket.reset()
    for (const bucket of this.sourceBuckets.values()) {
      bucket.reset()
    }
    this.dailyRequests.clear()
    this.lastDayReset = Date.now()
    this.stats = {
      totalRequests: 0,
      throttledRequests: 0,
      bySource: {},
    }
    console.log('[GlobalRateLimiter] All rate limiters reset')
  }

  /**
   * Get a unique key for the current day
   */
  private getDayKey(): string {
    return new Date().toISOString().split('T')[0]
  }

  /**
   * Check if we need to reset daily counters
   */
  private checkDayReset(): void {
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000

    if (now - this.lastDayReset > dayMs) {
      // Clear old daily keys
      const currentDayKey = this.getDayKey()
      for (const key of this.dailyRequests.keys()) {
        if (!key.includes(currentDayKey)) {
          this.dailyRequests.delete(key)
        }
      }
      this.lastDayReset = now
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const globalRateLimiter = new GlobalRateLimiter()

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Execute a function with rate limiting
 * Waits for a token if needed, then executes
 */
export async function executeWithRateLimit<T>(
  source: DataSourceName,
  executor: () => Promise<T>,
  maxWaitMs: number = 30000
): Promise<T> {
  // Wait for token if needed
  const canProceed = await globalRateLimiter.waitForToken(source, maxWaitMs)

  if (!canProceed) {
    throw new Error(`Rate limit exceeded for ${source}, max wait time ${maxWaitMs}ms exceeded`)
  }

  // Consume token and execute
  if (!globalRateLimiter.consume(source)) {
    throw new Error(`Rate limit exceeded for ${source}`)
  }

  return executor()
}

/**
 * Get rate limit info for a source
 */
export function getRateLimitInfo(source: DataSourceName): RateLimitStatus {
  return globalRateLimiter.getStatus(source)
}

/**
 * Get global rate limit statistics
 */
export function getGlobalRateLimitStats(): GlobalRateLimitStats {
  return globalRateLimiter.getStats()
}
