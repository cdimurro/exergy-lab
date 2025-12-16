/**
 * Discovery Cache - 24-hour in-memory cache for search results
 *
 * This cache helps avoid hitting rate limits and improves performance
 * by caching search results for identical queries.
 */

interface CacheEntry {
  data: any
  expires: number
}

// In-memory cache store
const cache = new Map<string, CacheEntry>()

// Cache statistics
let hits = 0
let misses = 0

/**
 * Get cached search results
 * @param key - Cache key (usually stringified query params)
 * @returns Cached data or null if not found/expired
 */
export function getCachedSearch(key: string): any | null {
  const cached = cache.get(key)

  if (!cached) {
    misses++
    return null
  }

  // Check if expired
  if (cached.expires < Date.now()) {
    cache.delete(key)
    misses++
    return null
  }

  hits++
  console.log(`[Cache] HIT for key: ${key.substring(0, 50)}...`)
  return cached.data
}

/**
 * Set cached search results
 * @param key - Cache key
 * @param data - Data to cache
 * @param ttl - Time to live in milliseconds (default: 24 hours)
 */
export function setCachedSearch(key: string, data: any, ttl = 24 * 60 * 60 * 1000): void {
  const expires = Date.now() + ttl

  cache.set(key, {
    data,
    expires
  })

  console.log(`[Cache] SET for key: ${key.substring(0, 50)}... (TTL: ${ttl / 1000 / 60}min)`)

  // Clean up expired entries periodically
  if (cache.size > 100) {
    cleanupExpired()
  }
}

/**
 * Invalidate a specific cache entry
 * @param key - Cache key to invalidate
 */
export function invalidateCachedSearch(key: string): boolean {
  const deleted = cache.delete(key)
  if (deleted) {
    console.log(`[Cache] INVALIDATED key: ${key.substring(0, 50)}...`)
  }
  return deleted
}

/**
 * Clear all cached searches
 */
export function clearCache(): void {
  const size = cache.size
  cache.clear()
  hits = 0
  misses = 0
  console.log(`[Cache] CLEARED ${size} entries`)
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const total = hits + misses
  const hitRate = total > 0 ? (hits / total * 100).toFixed(2) : '0.00'

  return {
    size: cache.size,
    hits,
    misses,
    hitRate: `${hitRate}%`,
    total
  }
}

/**
 * Clean up expired entries
 */
function cleanupExpired(): void {
  const now = Date.now()
  let cleaned = 0

  for (const [key, entry] of cache.entries()) {
    if (entry.expires < now) {
      cache.delete(key)
      cleaned++
    }
  }

  if (cleaned > 0) {
    console.log(`[Cache] Cleaned up ${cleaned} expired entries`)
  }
}

/**
 * Generate cache key from discovery prompt
 * @param prompt - Discovery prompt object
 * @returns Stable cache key
 */
export function generateCacheKey(prompt: any): string {
  // Create a stable key from the prompt
  const key = {
    description: prompt.description,
    domains: [...prompt.domains].sort(), // Sort for consistency
    goals: [...prompt.goals].sort(),
    constraints: prompt.constraints ? [...prompt.constraints].sort() : [],
    timeframe: prompt.timeframe || ''
  }

  return `discovery:${JSON.stringify(key)}`
}

// Auto-cleanup every 30 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cleanupExpired()
  }, 30 * 60 * 1000)
}
