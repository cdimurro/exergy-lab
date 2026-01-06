/**
 * Rate Limiter using Token Bucket Algorithm
 * Tracks requests per minute (RPM) and requests per day (RPD) for each AI provider
 * Supports per-user rate limiting with tiered quotas
 */

export type AIProvider = 'gemini' | 'openai' | 'huggingface' | 'nemotron'
export type UserTier = 'free' | 'pro' | 'enterprise'

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

interface UserRateLimit {
  userId: string
  tier: UserTier
  buckets: Map<AIProvider, TokenBucket>
  priorityQueue: boolean
}

interface TierLimits {
  requestsPerMinute: number
  requestsPerDay: number
  priorityQueue: boolean
}

// Global rate limits (used when no user-specific limits apply)
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
  nemotron: {
    requestsPerMinute: 30, // Modal GPU endpoint rate limit
    requestsPerDay: 2000,  // Higher daily limit for embeddings
  },
}

// Per-user tier limits
const TIER_LIMITS: Record<UserTier, TierLimits> = {
  free: {
    requestsPerMinute: 10,
    requestsPerDay: 100,
    priorityQueue: false,
  },
  pro: {
    requestsPerMinute: 60,
    requestsPerDay: 1500,
    priorityQueue: true,
  },
  enterprise: {
    requestsPerMinute: 300,
    requestsPerDay: 10000,
    priorityQueue: true,
  },
}

class RateLimiter {
  private buckets: Map<AIProvider, TokenBucket>
  private userLimits: Map<string, UserRateLimit>

  constructor() {
    this.buckets = new Map()
    this.userLimits = new Map()
    this.initializeBuckets()
  }

  private initializeBuckets() {
    const now = Date.now()
    const providers: AIProvider[] = ['gemini', 'openai', 'huggingface', 'nemotron']

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

  // =========================================================================
  // Per-User Rate Limiting
  // =========================================================================

  /**
   * Register a user with a specific tier
   */
  registerUser(userId: string, tier: UserTier): void {
    if (this.userLimits.has(userId)) {
      // Update tier if user already exists
      const userLimit = this.userLimits.get(userId)!
      userLimit.tier = tier
      userLimit.priorityQueue = TIER_LIMITS[tier].priorityQueue
      return
    }

    const now = Date.now()
    const providers: AIProvider[] = ['gemini', 'openai', 'huggingface', 'nemotron']
    const tierConfig = TIER_LIMITS[tier]

    const buckets = new Map<AIProvider, TokenBucket>()

    providers.forEach((provider) => {
      buckets.set(provider, {
        tokens: tierConfig.requestsPerMinute,
        lastRefill: now,
        dailyCount: 0,
        dailyResetTime: this.getNextMidnight(),
      })
    })

    this.userLimits.set(userId, {
      userId,
      tier,
      buckets,
      priorityQueue: tierConfig.priorityQueue,
    })

    console.log(`[RateLimiter] Registered user ${userId} with tier ${tier}`)
  }

  /**
   * Get user's tier
   */
  getUserTier(userId: string): UserTier | undefined {
    return this.userLimits.get(userId)?.tier
  }

  /**
   * Set user's tier
   */
  setUserTier(userId: string, tier: UserTier): void {
    const userLimit = this.userLimits.get(userId)

    if (!userLimit) {
      this.registerUser(userId, tier)
      return
    }

    userLimit.tier = tier
    userLimit.priorityQueue = TIER_LIMITS[tier].priorityQueue

    // Update bucket limits
    const tierConfig = TIER_LIMITS[tier]
    userLimit.buckets.forEach((bucket) => {
      bucket.tokens = Math.min(bucket.tokens, tierConfig.requestsPerMinute)
    })
  }

  /**
   * Refill user's token bucket
   */
  private refillUserBucket(userId: string, provider: AIProvider): void {
    const userLimit = this.userLimits.get(userId)
    if (!userLimit) return

    const bucket = userLimit.buckets.get(provider)
    const tierConfig = TIER_LIMITS[userLimit.tier]
    const now = Date.now()

    if (!bucket) return

    // Reset daily count if we've passed midnight
    if (now >= bucket.dailyResetTime) {
      bucket.dailyCount = 0
      bucket.dailyResetTime = this.getNextMidnight()
    }

    // Refill tokens based on time elapsed
    const minutesElapsed = (now - bucket.lastRefill) / (1000 * 60)
    const tokensToAdd = Math.floor(minutesElapsed * tierConfig.requestsPerMinute)

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(
        bucket.tokens + tokensToAdd,
        tierConfig.requestsPerMinute
      )
      bucket.lastRefill = now
    }
  }

  /**
   * Check if a user can execute a request
   */
  canUserExecute(userId: string, provider: AIProvider): boolean {
    const userLimit = this.userLimits.get(userId)

    // If user not registered, fall back to global limits
    if (!userLimit) {
      return this.canExecute(provider)
    }

    this.refillUserBucket(userId, provider)

    const bucket = userLimit.buckets.get(provider)
    const tierConfig = TIER_LIMITS[userLimit.tier]

    if (!bucket) return false

    // Check both per-minute and per-day limits
    return bucket.tokens > 0 && bucket.dailyCount < tierConfig.requestsPerDay
  }

  /**
   * Consume a token for a specific user
   */
  consumeUser(userId: string, provider: AIProvider): void {
    const userLimit = this.userLimits.get(userId)

    // If user not registered, fall back to global consumption
    if (!userLimit) {
      this.consume(provider)
      return
    }

    const bucket = userLimit.buckets.get(provider)

    if (!bucket) return

    bucket.tokens = Math.max(0, bucket.tokens - 1)
    bucket.dailyCount += 1
  }

  /**
   * Get user's remaining quota
   */
  getUserQuota(userId: string, provider: AIProvider): {
    remainingMinute: number
    remainingDay: number
    resetsIn: number
    tier: UserTier
    hasPriority: boolean
  } {
    const userLimit = this.userLimits.get(userId)

    // If user not registered, return global quota with 'free' tier
    if (!userLimit) {
      const globalQuota = this.getQuota(provider)
      return {
        ...globalQuota,
        tier: 'free',
        hasPriority: false,
      }
    }

    this.refillUserBucket(userId, provider)

    const bucket = userLimit.buckets.get(provider)
    const tierConfig = TIER_LIMITS[userLimit.tier]

    if (!bucket) {
      return {
        remainingMinute: 0,
        remainingDay: 0,
        resetsIn: 0,
        tier: userLimit.tier,
        hasPriority: userLimit.priorityQueue,
      }
    }

    return {
      remainingMinute: bucket.tokens,
      remainingDay: tierConfig.requestsPerDay - bucket.dailyCount,
      resetsIn: bucket.dailyResetTime - Date.now(),
      tier: userLimit.tier,
      hasPriority: userLimit.priorityQueue,
    }
  }

  /**
   * Get retry time for a specific user
   */
  getUserRetryAfter(userId: string, provider: AIProvider): number {
    const userLimit = this.userLimits.get(userId)

    // If user not registered, fall back to global retry time
    if (!userLimit) {
      return this.getRetryAfter(provider)
    }

    const bucket = userLimit.buckets.get(provider)
    const tierConfig = TIER_LIMITS[userLimit.tier]

    if (!bucket) return 60000 // Default 1 minute

    // If daily limit exceeded, wait until midnight
    if (bucket.dailyCount >= tierConfig.requestsPerDay) {
      return bucket.dailyResetTime - Date.now()
    }

    // Otherwise, wait for next token
    return 60000 / tierConfig.requestsPerMinute
  }

  /**
   * Remove user from rate limiter
   */
  removeUser(userId: string): boolean {
    return this.userLimits.delete(userId)
  }

  /**
   * Get all registered users
   */
  getRegisteredUsers(): string[] {
    return Array.from(this.userLimits.keys())
  }

  /**
   * Get user count by tier
   */
  getUserCountByTier(): Record<UserTier, number> {
    const counts: Record<UserTier, number> = {
      free: 0,
      pro: 0,
      enterprise: 0,
    }

    this.userLimits.forEach((userLimit) => {
      counts[userLimit.tier]++
    })

    return counts
  }

  /**
   * Get statistics for all users
   */
  getUserStats(): {
    totalUsers: number
    byTier: Record<UserTier, number>
    withPriority: number
  } {
    const byTier = this.getUserCountByTier()
    const withPriority = Array.from(this.userLimits.values()).filter(
      (u) => u.priorityQueue
    ).length

    return {
      totalUsers: this.userLimits.size,
      byTier,
      withPriority,
    }
  }

  /**
   * Clean up inactive users (not used in last N days)
   */
  cleanupInactiveUsers(inactiveDays: number = 30): number {
    const cutoffTime = Date.now() - inactiveDays * 24 * 60 * 60 * 1000
    let removed = 0

    this.userLimits.forEach((userLimit, userId) => {
      // Check if any bucket has been used recently
      let isInactive = true
      userLimit.buckets.forEach((bucket) => {
        if (bucket.lastRefill > cutoffTime) {
          isInactive = false
        }
      })

      if (isInactive) {
        this.userLimits.delete(userId)
        removed++
      }
    })

    if (removed > 0) {
      console.log(`[RateLimiter] Cleaned up ${removed} inactive users`)
    }

    return removed
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

/**
 * User-specific rate limit error
 */
export class UserRateLimitError extends Error {
  constructor(
    public userId: string,
    public tier: UserTier,
    public provider: AIProvider,
    public retryAfter: number
  ) {
    super(
      `Rate limit exceeded for user ${userId} (${tier} tier) on ${provider}. Retry after ${retryAfter}ms`
    )
    this.name = 'UserRateLimitError'
  }
}

/**
 * Export tier limits for external use
 */
export { TIER_LIMITS }

/**
 * Helper: Get tier limits for a specific tier
 */
export function getTierLimits(tier: UserTier): TierLimits {
  return TIER_LIMITS[tier]
}

/**
 * Helper: Register user with rate limiter
 */
export function registerUser(userId: string, tier: UserTier): void {
  rateLimiter.registerUser(userId, tier)
}

/**
 * Helper: Check if user can execute request
 */
export function canUserExecute(userId: string, provider: AIProvider): boolean {
  return rateLimiter.canUserExecute(userId, provider)
}

/**
 * Helper: Consume token for user
 */
export function consumeUserToken(userId: string, provider: AIProvider): void {
  rateLimiter.consumeUser(userId, provider)
}

/**
 * Helper: Get user quota
 */
export function getUserQuota(
  userId: string,
  provider: AIProvider
): {
  remainingMinute: number
  remainingDay: number
  resetsIn: number
  tier: UserTier
  hasPriority: boolean
} {
  return rateLimiter.getUserQuota(userId, provider)
}
