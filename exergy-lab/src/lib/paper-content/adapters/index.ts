/**
 * Adapter Registry
 *
 * Central registry for all content adapters.
 * Routes to the appropriate adapter based on data source.
 */

import type { DataSourceName } from '@/types/sources'
import type { ContentAdapter } from '../types'

// Import adapters
import { ArxivAdapter } from './arxiv-adapter'
import { CoreAdapter } from './core-adapter'
import { PmcAdapter, hasPmcAccess } from './pmc-adapter'
import { SemanticScholarAdapter } from './semantic-scholar-adapter'
import { OpenAlexAdapter } from './openalex-adapter'
import { CrossrefAdapter } from './crossref-adapter'
import { PubMedAdapter } from './pubmed-adapter'
import { FallbackAdapter } from './fallback-adapter'

/**
 * Adapter registry - maps source names to adapter instances
 */
const adapterRegistry = new Map<DataSourceName, ContentAdapter>()

/**
 * Default fallback adapter for unsupported sources
 */
const fallbackAdapter = new FallbackAdapter()

/**
 * Flag to track initialization
 */
let initialized = false

/**
 * Register an adapter for a data source
 */
export function registerAdapter(adapter: ContentAdapter): void {
  adapterRegistry.set(adapter.source, adapter)
}

/**
 * Get the adapter for a data source
 * Returns fallback adapter if no specific adapter is registered
 */
export function getAdapter(source: DataSourceName): ContentAdapter {
  // Auto-initialize on first access
  if (!initialized) {
    initializeAdapters()
  }
  return adapterRegistry.get(source) || fallbackAdapter
}

/**
 * Check if a source has a dedicated adapter
 */
export function hasAdapter(source: DataSourceName): boolean {
  if (!initialized) {
    initializeAdapters()
  }
  return adapterRegistry.has(source)
}

/**
 * Get all registered adapters
 */
export function getAllAdapters(): ContentAdapter[] {
  if (!initialized) {
    initializeAdapters()
  }
  return Array.from(adapterRegistry.values())
}

/**
 * Get adapters that can fetch full content
 */
export function getFullContentAdapters(): ContentAdapter[] {
  return getAllAdapters().filter((adapter) => adapter.canFetchFullContent)
}

/**
 * Get adapters that can fetch PDFs
 */
export function getPdfAdapters(): ContentAdapter[] {
  return getAllAdapters().filter((adapter) => adapter.canFetchPdf)
}

/**
 * Initialize all adapters
 * Called once at startup to register all available adapters
 */
export function initializeAdapters(): void {
  if (initialized) return

  // Tier 1: Full content sources
  registerAdapter(new ArxivAdapter())
  registerAdapter(new CoreAdapter())
  // Note: PMC uses 'pubmed' source but provides full content when PMCID present
  // The PubMed adapter will check for PMCID and could delegate to PMC

  // Tier 2: Metadata + PDF sources
  registerAdapter(new SemanticScholarAdapter())
  registerAdapter(new OpenAlexAdapter())
  registerAdapter(new CrossrefAdapter())

  // Tier 3: Metadata-only sources
  registerAdapter(new PubMedAdapter())

  initialized = true
  console.log(`[paper-content] Initialized ${adapterRegistry.size} adapters`)
}

// Export individual adapters for direct use
export { ArxivAdapter } from './arxiv-adapter'
export { CoreAdapter } from './core-adapter'
export { PmcAdapter, hasPmcAccess } from './pmc-adapter'
export { SemanticScholarAdapter } from './semantic-scholar-adapter'
export { OpenAlexAdapter } from './openalex-adapter'
export { CrossrefAdapter } from './crossref-adapter'
export { PubMedAdapter } from './pubmed-adapter'
export { FallbackAdapter, fallbackAdapter }

// Export types
export type { ContentAdapter }
