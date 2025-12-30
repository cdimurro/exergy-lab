/**
 * Cache Utilities
 *
 * Exports all cache-related utilities for the Exergy Lab platform:
 * - Semantic Cache: AI-aware caching with embedding-based similarity
 * - Persistent Cache: Two-layer L1/L2 caching with Vercel KV
 * - Cache Keys: Consistent key generation utilities
 */

// Semantic cache (AI-aware with embeddings)
export {
  SemanticCache,
  createSemanticCache,
  getGlobalSemanticCache,
  resetGlobalSemanticCache,
  createCacheKey,
  cached,
  type CacheEntry,
  type CacheMetadata,
  type CacheLayer,
  type CacheQueryType,
  type SemanticCacheConfig,
  type CacheStats,
  DEFAULT_CACHE_CONFIG,
} from './semantic-cache'

// Persistent cache (L1 memory + L2 Vercel KV)
export {
  PersistentCache,
  getPersistentCache,
  resetPersistentCache,
  withCache,
  Cached,
  type PersistentCacheEntry,
  type PersistentCacheConfig,
  type PersistentCacheStats,
} from './persistent-cache'

// Cache key utilities
export {
  type CacheNamespace,
  searchKey,
  paperKey,
  discoveryKey,
  simulationKey,
  validationKey,
  atbKey,
  pvwattsKey,
  nsrdbKey,
  embeddingKey,
  parseKey,
  hashString,
  hashObject,
  getDefaultTTL,
  wildcardPattern,
} from './cache-keys'
