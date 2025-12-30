/**
 * Cache Key Management
 *
 * Centralized cache key generation for consistent key patterns across
 * memory (L1) and persistent (L2/L3) cache layers.
 *
 * Key format: {namespace}:{type}:{identifier}:{hash}
 * Example: search:academic:perovskite-solar-cells:abc123
 */

import { createHash } from 'crypto'

/**
 * Cache namespaces for different data types
 */
export type CacheNamespace =
  | 'search'     // Search results from data sources
  | 'paper'      // Individual paper details
  | 'discovery'  // Discovery workflow results
  | 'simulation' // Simulation results
  | 'validation' // Validation results
  | 'atb'        // ATB technology data
  | 'pvwatts'    // PVWatts calculations
  | 'nsrdb'      // NSRDB solar data
  | 'embedding'  // Embedding vectors

/**
 * Generate a cache key for search queries
 */
export function searchKey(
  source: string,
  query: string,
  filters?: Record<string, unknown>
): string {
  const filterHash = filters ? hashObject(filters) : ''
  const queryHash = hashString(query)
  return `search:${source}:${queryHash}${filterHash ? `:${filterHash}` : ''}`
}

/**
 * Generate a cache key for paper details
 */
export function paperKey(source: string, paperId: string): string {
  return `paper:${source}:${paperId}`
}

/**
 * Generate a cache key for discovery results
 */
export function discoveryKey(
  type: 'research' | 'hypothesis' | 'evaluation' | 'simulation',
  query: string,
  domain: string
): string {
  const queryHash = hashString(query)
  return `discovery:${type}:${domain}:${queryHash}`
}

/**
 * Generate a cache key for simulation results
 */
export function simulationKey(
  simulationType: string,
  parameters: Record<string, unknown>
): string {
  const paramHash = hashObject(parameters)
  return `simulation:${simulationType}:${paramHash}`
}

/**
 * Generate a cache key for validation results
 */
export function validationKey(
  validationType: string,
  targetId: string
): string {
  return `validation:${validationType}:${targetId}`
}

/**
 * Generate a cache key for ATB data
 */
export function atbKey(
  technology: string,
  year: number,
  scenario: string
): string {
  return `atb:${technology}:${year}:${scenario}`
}

/**
 * Generate a cache key for PVWatts calculations
 */
export function pvwattsKey(
  lat: number,
  lon: number,
  systemCapacity: number,
  arrayType: number
): string {
  const locHash = hashString(`${lat.toFixed(2)},${lon.toFixed(2)}`)
  return `pvwatts:${locHash}:${systemCapacity}:${arrayType}`
}

/**
 * Generate a cache key for NSRDB data
 */
export function nsrdbKey(
  lat: number,
  lon: number,
  year: number | 'tmy'
): string {
  const locHash = hashString(`${lat.toFixed(2)},${lon.toFixed(2)}`)
  return `nsrdb:${locHash}:${year}`
}

/**
 * Generate a cache key for embeddings
 */
export function embeddingKey(text: string, model: string): string {
  const textHash = hashString(text)
  return `embedding:${model}:${textHash}`
}

/**
 * Parse a cache key into its components
 */
export function parseKey(key: string): {
  namespace: string
  type?: string
  identifier?: string
  hash?: string
} {
  const parts = key.split(':')
  return {
    namespace: parts[0],
    type: parts[1],
    identifier: parts[2],
    hash: parts[3],
  }
}

/**
 * Hash a string to create a short key component
 */
export function hashString(str: string): string {
  return createHash('sha256')
    .update(str.toLowerCase().trim())
    .digest('hex')
    .slice(0, 12)
}

/**
 * Hash an object to create a short key component
 */
export function hashObject(obj: Record<string, unknown>): string {
  const normalized = JSON.stringify(obj, Object.keys(obj).sort())
  return hashString(normalized)
}

/**
 * Get TTL (time-to-live) in seconds for a namespace
 * Default TTLs are designed for different data freshness requirements
 */
export function getDefaultTTL(namespace: CacheNamespace): number {
  const ttls: Record<CacheNamespace, number> = {
    search: 3600,        // 1 hour - search results change frequently
    paper: 86400,        // 24 hours - paper details rarely change
    discovery: 7200,     // 2 hours - discovery results
    simulation: 86400,   // 24 hours - simulation results are static
    validation: 3600,    // 1 hour - validation may need refresh
    atb: 604800,         // 7 days - ATB data is annual
    pvwatts: 86400,      // 24 hours - location data is stable
    nsrdb: 604800,       // 7 days - solar resource data is stable
    embedding: 604800,   // 7 days - embeddings don't change
  }
  return ttls[namespace] || 3600
}

/**
 * Generate a wildcard pattern for deleting related keys
 */
export function wildcardPattern(
  namespace: CacheNamespace,
  ...prefixes: string[]
): string {
  const prefix = prefixes.length > 0 ? `:${prefixes.join(':')}` : ''
  return `${namespace}${prefix}:*`
}
