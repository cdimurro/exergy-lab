/**
 * Rate Limiter using Token Bucket Algorithm
 * Tracks requests per minute (RPM) and requests per day (RPD) for each AI provider
 */

export type AIProvider = 'gemini' | 'openai' | 'huggingface'

interface RateLimitConfig {
  requestsPerMinute: number
  requestsPerDay: number
}

interface TokenBucket {
  tokens: number
  lastRefill: number
  dailyCount: number
  dailyResetTime: number
}

// Rate limits for free tiers
const RATE_LIMITS: Record<AIProvider, RateLimitConfig> = {
  gemini: {
    requestsPerMinute: 60,
    requestsPerDay: 1500,
  },
  openai: {
    requestsPerMinute: 3,
    requestsPerDay: 200,
  },
  huggingface: {
    requestsPerMinute: 30, // Conservative estimate
    requestsPerDay: 1000,
  },
}

class RateLimiter {
  private buckets: Map<AIProvider, TokenBucket>

  constructor() {
    this.buckets = new Map()
    this.initializeBuckets()
  }

  private initializeBuckets() {
    const now = Date.now()
    const providers: AIProvider[] = ['gemini', 'openai', 'huggingface']

    providers.forEach((provider) => {
      const config = RATE_LIMITS[provider]
      this.buckets.set(provider, {
        tokens: config.requestsPerMinute,
        lastRefill: now,
        dailyCount: 0,
        dailyResetTime: this.getNextMidnight(),
      })
    })
  }

  private getNextMidnight(): number {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    return tomorrow.getTime()
  }

  private refillBucket(provider: AIProvider) {
    const bucket = this.buckets.get(provider)
    const config = RATE_LIMITS[provider]
    const now = Date.now()

    if (!bucket) return

    // Reset daily count if we've passed midnight
    if (now >= bucket.dailyResetTime) {
      bucket.dailyCount = 0
      bucket.dailyResetTime = this.getNextMidnight()
    }

    // Refill tokens based on time elapsed (1 token per minute / RPM)
    const minutesElapsed = (now - bucket.lastRefill) / (1000 * 60)
    const tokensToAdd = Math.floor(minutesElapsed * config.requestsPerMinute)

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(
        bucket.tokens + tokensToAdd,
        config.requestsPerMinute
      )
      bucket.lastRefill = now
    }
  }

  /**
   * Check if a request can be executed for the given provider
   */
  canExecute(provider: AIProvider): boolean {
    this.refillBucket(provider)

    const bucket = this.buckets.get(provider)
    const config = RATE_LIMITS[provider]

    if (!bucket) return false

    // Check both per-minute and per-day limits
    return bucket.tokens > 0 && bucket.dailyCount < config.requestsPerDay
  }

  /**
   * Consume a token for the given provider
   * Should be called after a successful API request
   */
  consume(provider: AIProvider): void {
    const bucket = this.buckets.get(provider)

    if (!bucket) return

    bucket.tokens = Math.max(0, bucket.tokens - 1)
    bucket.dailyCount += 1
  }

  /**
   * Get remaining quota for a provider
   */
  getQuota(provider: AIProvider): {
    remainingMinute: number
    remainingDay: number
    resetsIn: number
  } {
    this.refillBucket(provider)

    const bucket = this.buckets.get(provider)
    const config = RATE_LIMITS[provider]

    if (!bucket) {
      return { remainingMinute: 0, remainingDay: 0, resetsIn: 0 }
    }

    return {
      remainingMinute: bucket.tokens,
      remainingDay: config.requestsPerDay - bucket.dailyCount,
      resetsIn: bucket.dailyResetTime - Date.now(),
    }
  }

  /**
   * Get time until next token is available (in milliseconds)
   */
  getRetryAfter(provider: AIProvider): number {
    const bucket = this.buckets.get(provider)
    const config = RATE_LIMITS[provider]

    if (!bucket) return 60000 // Default 1 minute

    // If daily limit exceeded, wait until midnight
    if (bucket.dailyCount >= config.requestsPerDay) {
      return bucket.dailyResetTime - Date.now()
    }

    // Otherwise, wait for next token (1 minute / RPM)
    return 60000 / config.requestsPerMinute
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter()

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends Error {
  constructor(
    public provider: AIProvider,
    public retryAfter: number
  ) {
    super(`Rate limit exceeded for ${provider}. Retry after ${retryAfter}ms`)
    this.name = 'RateLimitError'
  }
}
