/**
 * Persistent Cache with Vercel KV
 *
 * Two-layer cache architecture:
 * - L1: In-memory LRU cache (5 min TTL) - Hot data
 * - L2: Vercel KV (24 hr TTL) - Cross-session persistence
 *
 * Write-through caching: All writes go to both L1 and L2
 * Read hierarchy: L1 -> L2 -> Source (with L1 population on L2 hit)
 *
 * @see cache-keys.ts - Key generation utilities
 * @see semantic-cache.ts - Semantic similarity caching
 */

import { kv } from '@vercel/kv'
import { CacheNamespace, getDefaultTTL, parseKey } from './cache-keys'

/**
 * Cache entry with metadata
 */
export interface PersistentCacheEntry<T = unknown> {
  value: T
  metadata: {
    createdAt: number
    expiresAt: number
    source: string
    hits: number
    sizeBytes: number
  }
}

/**
 * Cache configuration
 */
export interface PersistentCacheConfig {
  l1MaxSize: number        // Max entries in L1 (default: 1000)
  l1TtlMs: number          // L1 TTL in ms (default: 5 min)
  l2TtlSeconds: number     // L2 TTL in seconds (default: 24 hours)
  enableL2: boolean        // Enable Vercel KV layer
  keyPrefix: string        // Prefix for all keys (e.g., "exergy-lab:")
  onL2Error?: (error: Error) => void  // Optional error handler
}

const DEFAULT_CONFIG: PersistentCacheConfig = {
  l1MaxSize: 1000,
  l1TtlMs: 5 * 60 * 1000, // 5 minutes
  l2TtlSeconds: 24 * 60 * 60, // 24 hours
  enableL2: true,
  keyPrefix: 'exergy:',
}

/**
 * Cache statistics
 */
export interface PersistentCacheStats {
  l1Size: number
  l1Hits: number
  l2Hits: number
  misses: number
  writes: number
  l2Errors: number
  totalRequests: number
}

/**
 * LRU Cache for L1 layer
 */
class L1Cache<T> {
  private cache: Map<string, { entry: PersistentCacheEntry<T>; expiresAt: number }> = new Map()
  private maxSize: number

  constructor(maxSize: number) {
    this.maxSize = maxSize
  }

  get(key: string): PersistentCacheEntry<T> | undefined {
    const item = this.cache.get(key)

    if (!item) return undefined

    // Check expiration
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key)
      return undefined
    }

    // Update hit count and move to end (MRU)
    item.entry.metadata.hits++
    this.cache.delete(key)
    this.cache.set(key, item)

    return item.entry
  }

  set(key: string, entry: PersistentCacheEntry<T>, ttlMs: number): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, {
      entry,
      expiresAt: Date.now() + ttlMs,
    })
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  cleanup(): number {
    const now = Date.now()
    let removed = 0

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key)
        removed++
      }
    }

    return removed
  }
}

/**
 * Persistent Cache implementation
 */
export class PersistentCache {
  private config: PersistentCacheConfig
  private l1: L1Cache<unknown>
  private stats: PersistentCacheStats = {
    l1Size: 0,
    l1Hits: 0,
    l2Hits: 0,
    misses: 0,
    writes: 0,
    l2Errors: 0,
    totalRequests: 0,
  }
  private cleanupInterval: ReturnType<typeof setInterval> | null = null
  private kvAvailable: boolean | null = null

  constructor(config: Partial<PersistentCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.l1 = new L1Cache(this.config.l1MaxSize)

    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.l1.cleanup()
      this.stats.l1Size = this.l1.size()
    }, 60000) // Every minute
  }

  /**
   * Get a value from cache
   * Checks L1 first, then L2 (with L1 population on L2 hit)
   */
  async get<T>(key: string): Promise<T | undefined> {
    this.stats.totalRequests++
    const fullKey = this.getFullKey(key)

    // Check L1 first
    const l1Result = this.l1.get(fullKey) as PersistentCacheEntry<T> | undefined
    if (l1Result) {
      this.stats.l1Hits++
      return l1Result.value
    }

    // Check L2 if enabled
    if (this.config.enableL2) {
      try {
        const l2Result = await this.getFromL2<T>(fullKey)
        if (l2Result) {
          this.stats.l2Hits++

          // Populate L1 from L2
          this.l1.set(fullKey, l2Result, this.config.l1TtlMs)
          this.stats.l1Size = this.l1.size()

          return l2Result.value
        }
      } catch (error) {
        this.handleL2Error(error as Error)
      }
    }

    this.stats.misses++
    return undefined
  }

  /**
   * Set a value in cache (write-through to L1 and L2)
   */
  async set<T>(
    key: string,
    value: T,
    options: {
      ttlSeconds?: number
      source?: string
      namespace?: CacheNamespace
    } = {}
  ): Promise<void> {
    const fullKey = this.getFullKey(key)
    const ttlSeconds = options.ttlSeconds ||
      (options.namespace ? getDefaultTTL(options.namespace) : this.config.l2TtlSeconds)

    const entry: PersistentCacheEntry<T> = {
      value,
      metadata: {
        createdAt: Date.now(),
        expiresAt: Date.now() + (ttlSeconds * 1000),
        source: options.source || 'unknown',
        hits: 0,
        sizeBytes: this.estimateSize(value),
      },
    }

    // Write to L1
    this.l1.set(fullKey, entry as PersistentCacheEntry<unknown>, this.config.l1TtlMs)
    this.stats.l1Size = this.l1.size()
    this.stats.writes++

    // Write to L2 if enabled
    if (this.config.enableL2) {
      try {
        await this.setInL2(fullKey, entry, ttlSeconds)
      } catch (error) {
        this.handleL2Error(error as Error)
      }
    }
  }

  /**
   * Delete a value from both L1 and L2
   */
  async delete(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key)

    const l1Deleted = this.l1.delete(fullKey)
    this.stats.l1Size = this.l1.size()

    let l2Deleted = false
    if (this.config.enableL2) {
      try {
        l2Deleted = await this.deleteFromL2(fullKey)
      } catch (error) {
        this.handleL2Error(error as Error)
      }
    }

    return l1Deleted || l2Deleted
  }

  /**
   * Delete all keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    const fullPattern = this.getFullKey(pattern)
    let deleted = 0

    if (this.config.enableL2) {
      try {
        // Use SCAN to find matching keys (safer than KEYS for large datasets)
        const keys = await this.scanKeys(fullPattern)
        for (const key of keys) {
          await this.delete(key.replace(this.config.keyPrefix, ''))
          deleted++
        }
      } catch (error) {
        this.handleL2Error(error as Error)
      }
    }

    return deleted
  }

  /**
   * Get or set: Return cached value or compute and cache new value
   */
  async getOrSet<T>(
    key: string,
    computeFn: () => Promise<T>,
    options: {
      ttlSeconds?: number
      source?: string
      namespace?: CacheNamespace
    } = {}
  ): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== undefined) {
      return cached
    }

    const value = await computeFn()
    await this.set(key, value, options)
    return value
  }

  /**
   * Check if a key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key)
    return value !== undefined
  }

  /**
   * Clear all L1 entries and optionally L2
   */
  async clear(includeL2: boolean = false): Promise<void> {
    this.l1.clear()
    this.stats.l1Size = 0

    if (includeL2 && this.config.enableL2) {
      try {
        await this.deletePattern('*')
      } catch (error) {
        this.handleL2Error(error as Error)
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): PersistentCacheStats {
    this.stats.l1Size = this.l1.size()
    return { ...this.stats }
  }

  /**
   * Stop the cache (cleanup interval)
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Check if Vercel KV is available
   */
  async isL2Available(): Promise<boolean> {
    if (this.kvAvailable !== null) {
      return this.kvAvailable
    }

    try {
      // Try a simple ping
      await kv.ping()
      this.kvAvailable = true
      return true
    } catch {
      console.warn('[PersistentCache] Vercel KV not available, using L1 only')
      this.kvAvailable = false
      return false
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getFullKey(key: string): string {
    return `${this.config.keyPrefix}${key}`
  }

  private async getFromL2<T>(key: string): Promise<PersistentCacheEntry<T> | undefined> {
    if (!await this.isL2Available()) {
      return undefined
    }

    const entry = await kv.get<PersistentCacheEntry<T>>(key)
    if (!entry) return undefined

    // Check if expired (shouldn't happen with proper TTL, but safety check)
    if (Date.now() > entry.metadata.expiresAt) {
      await kv.del(key)
      return undefined
    }

    return entry
  }

  private async setInL2<T>(
    key: string,
    entry: PersistentCacheEntry<T>,
    ttlSeconds: number
  ): Promise<void> {
    if (!await this.isL2Available()) {
      return
    }

    await kv.set(key, entry, { ex: ttlSeconds })
  }

  private async deleteFromL2(key: string): Promise<boolean> {
    if (!await this.isL2Available()) {
      return false
    }

    const result = await kv.del(key)
    return result === 1
  }

  private async scanKeys(pattern: string): Promise<string[]> {
    if (!await this.isL2Available()) {
      return []
    }

    const keys: string[] = []
    let cursor = 0

    // Use a simple iteration approach to avoid type complexity
    // Vercel KV scan returns [cursor, keys[]]
    let hasMore = true
    while (hasMore) {
      const result = await kv.scan(cursor, {
        match: pattern,
        count: 100,
      })
      const nextCursor = result[0] as unknown as number | string
      const batch = result[1]

      keys.push(...batch)

      // Check if we've completed the scan (cursor returns to 0)
      const cursorNum = typeof nextCursor === 'string' ? parseInt(nextCursor, 10) : nextCursor
      if (cursorNum === 0) {
        hasMore = false
      } else {
        cursor = cursorNum
      }
    }

    return keys
  }

  private handleL2Error(error: Error): void {
    this.stats.l2Errors++
    console.error('[PersistentCache] L2 error:', error.message)

    if (this.config.onL2Error) {
      this.config.onL2Error(error)
    }
  }

  private estimateSize(value: unknown): number {
    try {
      return JSON.stringify(value).length * 2 // Approximate UTF-16 encoding
    } catch {
      return 1000
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalCache: PersistentCache | null = null

/**
 * Get the global persistent cache instance
 */
export function getPersistentCache(): PersistentCache {
  if (!globalCache) {
    globalCache = new PersistentCache()
  }
  return globalCache
}

/**
 * Reset the global cache (for testing)
 */
export async function resetPersistentCache(): Promise<void> {
  if (globalCache) {
    await globalCache.clear(true)
    globalCache.stop()
    globalCache = null
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a cached function wrapper
 */
export function withCache<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyGenerator: (...args: TArgs) => string,
  options: {
    ttlSeconds?: number
    namespace?: CacheNamespace
    source?: string
  } = {}
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const cache = getPersistentCache()
    const key = keyGenerator(...args)

    return cache.getOrSet(key, () => fn(...args), {
      ttlSeconds: options.ttlSeconds,
      namespace: options.namespace,
      source: options.source,
    })
  }
}

/**
 * Decorator for caching async methods
 */
export function Cached(
  keyGenerator: (...args: unknown[]) => string,
  options: {
    ttlSeconds?: number
    namespace?: CacheNamespace
    source?: string
  } = {}
) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: unknown[]) {
      const cache = getPersistentCache()
      const key = keyGenerator(...args)

      return cache.getOrSet(key, () => originalMethod.apply(this, args), {
        ttlSeconds: options.ttlSeconds,
        namespace: options.namespace,
        source: options.source,
      })
    }

    return descriptor
  }
}
