/**
 * Base Data Source Adapter
 *
 * Provides common functionality for all data source adapters:
 * - Rate limiting
 * - Caching
 * - Error handling
 * - Retry logic
 * - Standard interface
 */

import {
  DataSourceName,
  Source,
  SearchFilters,
  SearchResult,
  RateLimitInfo,
  DataSourceError,
  CacheEntry,
} from '@/types/sources'
import { Domain } from '@/types/discovery'
import { executeResilient, CircuitBreaker } from '@/lib/ai/error-recovery'
import { CircuitBreakerConfig } from '@/types/agent'

/**
 * Data source adapter interface
 */
export interface DataSourceAdapter {
  readonly name: DataSourceName
  readonly domains: Domain[]

  /**
   * Search for sources matching the query
   */
  search(query: string, filters?: SearchFilters): Promise<SearchResult>

  /**
   * Get details for a specific source by ID
   */
  getDetails(id: string): Promise<Source | null>

  /**
   * Get rate limit information
   */
  getRateLimit(): RateLimitInfo

  /**
   * Test if the adapter is available/configured
   */
  isAvailable(): Promise<boolean>
}

/**
 * Simple in-memory cache
 */
class SimpleCache {
  private cache: Map<string, CacheEntry> = new Map()

  set(key: string, value: any, ttl: number): void {
    this.cache.set(key, {
      key,
      value,
      timestamp: Date.now(),
      ttl,
      hits: 0,
    })
  }

  get<T = any>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) return null

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    // Increment hit counter
    entry.hits++

    return entry.value as T
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  getStats(): {
    size: number
    totalHits: number
    keys: string[]
  } {
    const entries = Array.from(this.cache.values())
    return {
      size: this.cache.size,
      totalHits: entries.reduce((sum, e) => sum + e.hits, 0),
      keys: Array.from(this.cache.keys()),
    }
  }

  cleanup(): number {
    const now = Date.now()
    let removed = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        removed++
      }
    }

    return removed
  }
}

/**
 * Simple rate limiter (token bucket)
 */
class SimpleRateLimiter {
  private tokens: number
  private lastRefill: number

  constructor(
    private requestsPerMinute: number,
    private requestsPerDay: number
  ) {
    this.tokens = requestsPerMinute
    this.lastRefill = Date.now()
  }

  canExecute(): boolean {
    this.refill()
    return this.tokens > 0
  }

  consume(): void {
    if (this.tokens > 0) {
      this.tokens--
    }
  }

  private refill(): void {
    const now = Date.now()
    const minutesElapsed = (now - this.lastRefill) / (1000 * 60)
    const tokensToAdd = Math.floor(minutesElapsed * this.requestsPerMinute)

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.tokens + tokensToAdd, this.requestsPerMinute)
      this.lastRefill = now
    }
  }

  getRemaining(): number {
    this.refill()
    return this.tokens
  }
}

/**
 * Base adapter class with common functionality
 */
/**
 * Default circuit breaker config for data sources
 */
const DEFAULT_SOURCE_CIRCUIT_BREAKER: Partial<CircuitBreakerConfig> = {
  failureThreshold: 3,  // Open after 3 consecutive failures
  resetTimeout: 60000,  // Try again after 1 minute
  halfOpenAttempts: 1,  // Single test request in half-open state
}

export abstract class BaseAdapter implements DataSourceAdapter {
  abstract readonly name: DataSourceName
  abstract readonly domains: Domain[]

  protected cache: SimpleCache
  protected rateLimiter: SimpleRateLimiter
  protected circuitBreaker: CircuitBreaker
  protected baseUrl: string
  protected apiKey?: string

  constructor(
    config: {
      baseUrl: string
      apiKey?: string
      requestsPerMinute?: number
      requestsPerDay?: number
      cacheTTL?: number
      circuitBreakerConfig?: Partial<CircuitBreakerConfig>
    }
  ) {
    this.baseUrl = config.baseUrl
    this.apiKey = config.apiKey
    this.cache = new SimpleCache()
    this.rateLimiter = new SimpleRateLimiter(
      config.requestsPerMinute || 60,
      config.requestsPerDay || 1000
    )
    this.circuitBreaker = new CircuitBreaker({
      ...DEFAULT_SOURCE_CIRCUIT_BREAKER,
      ...config.circuitBreakerConfig,
    })
  }

  /**
   * Check if the circuit breaker is open (source is failing)
   */
  isCircuitOpen(): boolean {
    return !this.circuitBreaker.isOperational()
  }

  /**
   * Get circuit breaker state for monitoring
   */
  getCircuitState(): { state: string; stats: { failures: number; successes: number } } {
    return {
      state: this.circuitBreaker.getState(),
      stats: this.circuitBreaker.getStats(),
    }
  }

  /**
   * Search implementation with caching and rate limiting
   */
  async search(query: string, filters: SearchFilters = {}): Promise<SearchResult> {
    const cacheKey = this.getCacheKey('search', query, filters)

    // Check cache first
    const cached = this.cache.get<SearchResult>(cacheKey)
    if (cached) {
      console.log(`[${this.name}] Cache hit for query: "${query}"`)
      return cached
    }

    // Check rate limit
    if (!this.rateLimiter.canExecute()) {
      throw new DataSourceError(
        `Rate limit exceeded. ${this.rateLimiter.getRemaining()} requests remaining.`,
        this.name
      )
    }

    try {
      // Execute search with resilient error handling
      const result = await executeResilient(
        () => this.executeSearch(query, filters),
        `source:${this.name}:search`
      )

      // Consume rate limit token
      this.rateLimiter.consume()

      // Cache result
      this.cache.set(cacheKey, result, this.getCacheTTL())

      return result
    } catch (error) {
      console.error(`[${this.name}] Search failed:`, error)
      throw new DataSourceError(
        `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        error as Error
      )
    }
  }

  /**
   * Get details with caching
   */
  async getDetails(id: string): Promise<Source | null> {
    const cacheKey = this.getCacheKey('details', id)

    // Check cache first
    const cached = this.cache.get<Source>(cacheKey)
    if (cached) {
      return cached
    }

    // Check rate limit
    if (!this.rateLimiter.canExecute()) {
      throw new DataSourceError(
        `Rate limit exceeded. ${this.rateLimiter.getRemaining()} requests remaining.`,
        this.name
      )
    }

    try {
      const result = await executeResilient(
        () => this.executeGetDetails(id),
        `source:${this.name}:details`
      )

      this.rateLimiter.consume()

      if (result) {
        this.cache.set(cacheKey, result, this.getCacheTTL())
      }

      return result
    } catch (error) {
      console.error(`[${this.name}] Get details failed:`, error)
      throw new DataSourceError(
        `Get details failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        error as Error
      )
    }
  }

  /**
   * Get rate limit info
   */
  getRateLimit(): RateLimitInfo {
    return {
      requestsPerMinute: 60,
      requestsPerDay: 1000,
      remaining: this.rateLimiter.getRemaining(),
    }
  }

  /**
   * Test availability
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Subclasses can override this
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Abstract methods for subclasses to implement
   */
  protected abstract executeSearch(
    query: string,
    filters: SearchFilters
  ): Promise<SearchResult>

  protected abstract executeGetDetails(id: string): Promise<Source | null>

  /**
   * Get cache TTL (can be overridden)
   */
  protected getCacheTTL(): number {
    return 60 * 60 * 1000 // 1 hour default
  }

  /**
   * Generate cache key
   */
  protected getCacheKey(operation: string, ...params: any[]): string {
    const paramsStr = JSON.stringify(params)
    return `${this.name}:${operation}:${paramsStr}`
  }

  /**
   * Default timeout for requests (10 seconds)
   */
  protected defaultTimeout = 10000

  /**
   * Fetch with timeout protection
   * Prevents requests from hanging indefinitely
   */
  protected async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = this.defaultTimeout
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      return response
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs}ms`)
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Helper: Make HTTP request with timeout and circuit breaker protection
   */
  protected async makeRequest<T = any>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs?: number
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
      ...(options.headers as Record<string, string>),
    }

    // Wrap request in circuit breaker for automatic failure isolation
    return this.circuitBreaker.execute(
      async () => {
        const response = await this.fetchWithTimeout(
          url,
          { ...options, headers },
          timeoutMs
        )

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return response.json() as Promise<T>
      },
      `source:${this.name}:${endpoint}`
    )
  }

  /**
   * Helper: Build query string
   */
  protected buildQueryString(params: Record<string, any>): string {
    const filtered = Object.entries(params).filter(([_, v]) => v !== undefined && v !== null)
    const searchParams = new URLSearchParams(
      filtered.map(([k, v]) => [k, String(v)])
    )
    return searchParams.toString()
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return this.cache.getStats()
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Cleanup expired cache entries
   */
  cleanupCache(): number {
    return this.cache.cleanup()
  }
}
