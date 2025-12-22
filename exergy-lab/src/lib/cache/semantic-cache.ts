/**
 * Semantic Cache
 *
 * Three-layer cache hierarchy with embedding-based semantic similarity.
 * Provides intelligent caching for AI responses based on query similarity.
 *
 * Cache Layers:
 * - L1: Memory LRU (5 min TTL, 100MB) - Hot data for active discoveries
 * - L2: Redis Semantic (2 hr TTL, 1GB) - Embedding-indexed research
 * - L3: Persistent (24 hr TTL, 10GB) - Completed discoveries, simulations
 *
 * @see batch-executor.ts - Uses this for response caching
 * @see discovery-orchestrator.ts - Caches research results
 */

import { aiRouter } from '../ai/model-router'

// ============================================================================
// Types
// ============================================================================

export interface CacheEntry<T = unknown> {
  key: string
  value: T
  embedding?: number[]
  metadata: CacheMetadata
}

export interface CacheMetadata {
  createdAt: number
  lastAccessedAt: number
  accessCount: number
  ttlMs: number
  layer: CacheLayer
  queryType: CacheQueryType
  sizeBytes: number
}

export type CacheLayer = 'L1_memory' | 'L2_semantic' | 'L3_persistent'

export type CacheQueryType =
  | 'research'
  | 'hypothesis'
  | 'evaluation'
  | 'simulation'
  | 'validation'
  | 'general'

export interface SemanticCacheConfig {
  l1MaxSizeMb: number
  l1TtlMs: number
  l2TtlMs: number
  l3TtlMs: number
  similarityThreshold: number // 0-1, default 0.92
  embeddingModel: 'huggingface' | 'openai'
  enableSemanticSearch: boolean
  enablePersistence: boolean
  maxEntriesPerLayer: number
}

export const DEFAULT_CACHE_CONFIG: SemanticCacheConfig = {
  l1MaxSizeMb: 100,
  l1TtlMs: 5 * 60 * 1000, // 5 minutes
  l2TtlMs: 2 * 60 * 60 * 1000, // 2 hours
  l3TtlMs: 24 * 60 * 60 * 1000, // 24 hours
  similarityThreshold: 0.92,
  embeddingModel: 'huggingface',
  enableSemanticSearch: true,
  enablePersistence: false, // Requires Redis/external storage
  maxEntriesPerLayer: 1000,
}

export interface CacheStats {
  l1Size: number
  l2Size: number
  l3Size: number
  l1Hits: number
  l2Hits: number
  l3Hits: number
  misses: number
  semanticHits: number
  totalQueries: number
}

// ============================================================================
// LRU Cache Implementation
// ============================================================================

class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map()
  private maxSize: number
  private currentSizeBytes: number = 0

  constructor(maxSizeMb: number) {
    this.maxSize = maxSizeMb * 1024 * 1024
  }

  get(key: string): CacheEntry<T> | undefined {
    const entry = this.cache.get(key)
    if (entry) {
      // Update access time and count
      entry.metadata.lastAccessedAt = Date.now()
      entry.metadata.accessCount++
      // Move to end (most recently used)
      this.cache.delete(key)
      this.cache.set(key, entry)
    }
    return entry
  }

  set(key: string, entry: CacheEntry<T>): void {
    // Remove if exists (to update position)
    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!
      this.currentSizeBytes -= existing.metadata.sizeBytes
      this.cache.delete(key)
    }

    // Evict LRU entries if necessary
    while (this.currentSizeBytes + entry.metadata.sizeBytes > this.maxSize && this.cache.size > 0) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        const oldest = this.cache.get(oldestKey)!
        this.currentSizeBytes -= oldest.metadata.sizeBytes
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, entry)
    this.currentSizeBytes += entry.metadata.sizeBytes
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (entry) {
      this.currentSizeBytes -= entry.metadata.sizeBytes
      return this.cache.delete(key)
    }
    return false
  }

  clear(): void {
    this.cache.clear()
    this.currentSizeBytes = 0
  }

  size(): number {
    return this.cache.size
  }

  sizeBytes(): number {
    return this.currentSizeBytes
  }

  entries(): IterableIterator<[string, CacheEntry<T>]> {
    return this.cache.entries()
  }

  /**
   * Remove expired entries
   */
  cleanup(): number {
    let removed = 0
    const now = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.metadata.createdAt > entry.metadata.ttlMs) {
        this.delete(key)
        removed++
      }
    }

    return removed
  }
}

// ============================================================================
// Semantic Cache Class
// ============================================================================

export class SemanticCache {
  private config: SemanticCacheConfig
  private l1Cache: LRUCache<unknown>
  private l2Cache: Map<string, CacheEntry<unknown>> = new Map()
  private l3Cache: Map<string, CacheEntry<unknown>> = new Map()
  private embeddingIndex: Map<string, { key: string; embedding: number[] }[]> = new Map()
  private stats: CacheStats = {
    l1Size: 0,
    l2Size: 0,
    l3Size: 0,
    l1Hits: 0,
    l2Hits: 0,
    l3Hits: 0,
    misses: 0,
    semanticHits: 0,
    totalQueries: 0,
  }
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor(config: Partial<SemanticCacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config }
    this.l1Cache = new LRUCache(this.config.l1MaxSizeMb)

    // Start cleanup timer
    this.startCleanup()
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string, queryType: CacheQueryType = 'general'): Promise<T | undefined> {
    this.stats.totalQueries++

    // Check L1 first
    const l1Entry = this.l1Cache.get(key) as CacheEntry<T> | undefined
    if (l1Entry && !this.isExpired(l1Entry)) {
      this.stats.l1Hits++
      return l1Entry.value
    }

    // Check L2
    const l2Entry = this.l2Cache.get(key) as CacheEntry<T> | undefined
    if (l2Entry && !this.isExpired(l2Entry)) {
      this.stats.l2Hits++
      // Promote to L1
      this.promoteToL1(key, l2Entry)
      return l2Entry.value
    }

    // Check L3
    const l3Entry = this.l3Cache.get(key) as CacheEntry<T> | undefined
    if (l3Entry && !this.isExpired(l3Entry)) {
      this.stats.l3Hits++
      // Promote to L2
      this.l2Cache.set(key, {
        ...l3Entry,
        metadata: { ...l3Entry.metadata, layer: 'L2_semantic', lastAccessedAt: Date.now() },
      })
      return l3Entry.value
    }

    this.stats.misses++
    return undefined
  }

  /**
   * Get a value using semantic similarity search
   */
  async getSemanticMatch<T>(
    query: string,
    queryType: CacheQueryType = 'general'
  ): Promise<{ value: T; similarity: number } | undefined> {
    if (!this.config.enableSemanticSearch) {
      return undefined
    }

    this.stats.totalQueries++

    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query)

      // Search embedding index
      const typeIndex = this.embeddingIndex.get(queryType) || []
      let bestMatch: { key: string; similarity: number } | null = null

      for (const item of typeIndex) {
        const similarity = this.cosineSimilarity(queryEmbedding, item.embedding)
        if (similarity >= this.config.similarityThreshold) {
          if (!bestMatch || similarity > bestMatch.similarity) {
            bestMatch = { key: item.key, similarity }
          }
        }
      }

      if (bestMatch) {
        const value = await this.get<T>(bestMatch.key, queryType)
        if (value !== undefined) {
          this.stats.semanticHits++
          return { value, similarity: bestMatch.similarity }
        }
      }
    } catch (error) {
      console.error('[SemanticCache] Semantic search failed:', error)
    }

    this.stats.misses++
    return undefined
  }

  /**
   * Set a value in cache
   */
  async set<T>(
    key: string,
    value: T,
    options: {
      queryType?: CacheQueryType
      layer?: CacheLayer
      ttlMs?: number
      indexForSemantic?: boolean
      query?: string // Original query for semantic indexing
    } = {}
  ): Promise<void> {
    const queryType = options.queryType || 'general'
    const layer = options.layer || 'L1_memory'
    const ttlMs = options.ttlMs || this.getTtlForLayer(layer)

    const entry: CacheEntry<T> = {
      key,
      value,
      metadata: {
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 0,
        ttlMs,
        layer,
        queryType,
        sizeBytes: this.estimateSize(value),
      },
    }

    // Store in appropriate layer
    switch (layer) {
      case 'L1_memory':
        this.l1Cache.set(key, entry as CacheEntry<unknown>)
        this.stats.l1Size = this.l1Cache.size()
        break
      case 'L2_semantic':
        this.l2Cache.set(key, entry as CacheEntry<unknown>)
        this.stats.l2Size = this.l2Cache.size
        break
      case 'L3_persistent':
        this.l3Cache.set(key, entry as CacheEntry<unknown>)
        this.stats.l3Size = this.l3Cache.size
        break
    }

    // Index for semantic search if requested
    if (options.indexForSemantic && options.query && this.config.enableSemanticSearch) {
      try {
        const embedding = await this.generateEmbedding(options.query)
        entry.embedding = embedding

        const typeIndex = this.embeddingIndex.get(queryType) || []
        typeIndex.push({ key, embedding })

        // Limit index size
        if (typeIndex.length > this.config.maxEntriesPerLayer) {
          typeIndex.shift()
        }

        this.embeddingIndex.set(queryType, typeIndex)
      } catch (error) {
        console.error('[SemanticCache] Failed to index for semantic search:', error)
      }
    }
  }

  /**
   * Delete a value from all layers
   */
  delete(key: string): boolean {
    const l1Deleted = this.l1Cache.delete(key)
    const l2Deleted = this.l2Cache.delete(key)
    const l3Deleted = this.l3Cache.delete(key)

    // Remove from embedding index
    for (const [type, index] of this.embeddingIndex.entries()) {
      const filtered = index.filter(item => item.key !== key)
      if (filtered.length !== index.length) {
        this.embeddingIndex.set(type, filtered)
      }
    }

    this.updateStats()
    return l1Deleted || l2Deleted || l3Deleted
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.l1Cache.clear()
    this.l2Cache.clear()
    this.l3Cache.clear()
    this.embeddingIndex.clear()
    this.stats = {
      l1Size: 0,
      l2Size: 0,
      l3Size: 0,
      l1Hits: 0,
      l2Hits: 0,
      l3Hits: 0,
      misses: 0,
      semanticHits: 0,
      totalQueries: 0,
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.updateStats()
    return { ...this.stats }
  }

  /**
   * Stop the cache (cleanup timer)
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Generate embedding for a query
   */
  private async generateEmbedding(query: string): Promise<number[]> {
    const embeddings = await aiRouter.generateEmbeddings([query])
    return embeddings[0]
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    if (normA === 0 || normB === 0) return 0
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  /**
   * Check if an entry is expired
   */
  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() - entry.metadata.createdAt > entry.metadata.ttlMs
  }

  /**
   * Get TTL for a cache layer
   */
  private getTtlForLayer(layer: CacheLayer): number {
    switch (layer) {
      case 'L1_memory':
        return this.config.l1TtlMs
      case 'L2_semantic':
        return this.config.l2TtlMs
      case 'L3_persistent':
        return this.config.l3TtlMs
    }
  }

  /**
   * Promote an entry to L1 cache
   */
  private promoteToL1<T>(key: string, entry: CacheEntry<T>): void {
    this.l1Cache.set(key, {
      ...entry,
      metadata: {
        ...entry.metadata,
        layer: 'L1_memory',
        lastAccessedAt: Date.now(),
        ttlMs: this.config.l1TtlMs,
      },
    } as CacheEntry<unknown>)
  }

  /**
   * Estimate size of a value in bytes
   */
  private estimateSize(value: unknown): number {
    try {
      return new Blob([JSON.stringify(value)]).size
    } catch {
      return 1000 // Default estimate
    }
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    this.stats.l1Size = this.l1Cache.size()
    this.stats.l2Size = this.l2Cache.size
    this.stats.l3Size = this.l3Cache.size
  }

  /**
   * Start cleanup timer
   */
  private startCleanup(): void {
    // Run cleanup every minute
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, 60 * 1000)
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now()

    // L1 has its own cleanup
    this.l1Cache.cleanup()

    // Clean L2
    for (const [key, entry] of this.l2Cache.entries()) {
      if (now - entry.metadata.createdAt > entry.metadata.ttlMs) {
        this.l2Cache.delete(key)
      }
    }

    // Clean L3
    for (const [key, entry] of this.l3Cache.entries()) {
      if (now - entry.metadata.createdAt > entry.metadata.ttlMs) {
        this.l3Cache.delete(key)
      }
    }

    this.updateStats()
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSemanticCache(
  config?: Partial<SemanticCacheConfig>
): SemanticCache {
  return new SemanticCache(config)
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalSemanticCache: SemanticCache | null = null

export function getGlobalSemanticCache(): SemanticCache {
  if (!globalSemanticCache) {
    globalSemanticCache = new SemanticCache()
  }
  return globalSemanticCache
}

export function resetGlobalSemanticCache(): void {
  if (globalSemanticCache) {
    globalSemanticCache.stop()
    globalSemanticCache.clear()
    globalSemanticCache = null
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a cache key from components
 */
export function createCacheKey(
  type: CacheQueryType,
  ...components: string[]
): string {
  return `${type}:${components.join(':')}`
}

/**
 * Decorator for caching function results
 */
export function cached<T extends (...args: unknown[]) => Promise<unknown>>(
  queryType: CacheQueryType,
  keyGenerator: (...args: Parameters<T>) => string,
  options: {
    layer?: CacheLayer
    ttlMs?: number
    semantic?: boolean
  } = {}
) {
  return function decorator(
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: Parameters<T>) {
      const cache = getGlobalSemanticCache()
      const key = keyGenerator(...args)

      // Try to get from cache
      const cached = await cache.get(key, queryType)
      if (cached !== undefined) {
        return cached
      }

      // Try semantic match if enabled
      if (options.semantic) {
        const semanticMatch = await cache.getSemanticMatch(key, queryType)
        if (semanticMatch) {
          return semanticMatch.value
        }
      }

      // Execute original method
      const result = await originalMethod.apply(this, args)

      // Cache the result
      await cache.set(key, result, {
        queryType,
        layer: options.layer,
        ttlMs: options.ttlMs,
        indexForSemantic: options.semantic,
        query: key,
      })

      return result
    }

    return descriptor
  }
}
