/**
 * Data Source Registry
 *
 * Central registry for all data source adapters with:
 * - Parallel search execution
 * - Rate-limit aware scheduling
 * - Cross-source deduplication
 * - Domain-based routing
 */

import { DataSourceAdapter } from '../sources/base'
import {
  Source,
  SearchFilters,
  SearchResult,
  DataSourceName,
  DataSourceType,
} from '@/types/sources'
import { Domain } from '@/types/discovery'

/**
 * Aggregated search results from multiple sources
 */
export interface AggregatedSearchResult {
  sources: Source[]
  total: number
  searchTime: number
  query: string
  filters?: SearchFilters
  bySource: Record<DataSourceName, { count: number; time: number; success: boolean; error?: string }>
  deduplicatedCount: number
}

/**
 * Query plan for routing to appropriate sources
 */
interface QueryPlan {
  primarySources: DataSourceName[]
  secondarySources: DataSourceName[]
  query: string
  expandedQueries: string[]
}

/**
 * Data Source Registry - manages all adapters and orchestrates searches
 */
export class DataSourceRegistry {
  private adapters: Map<DataSourceName, DataSourceAdapter> = new Map()
  private domainSourceMap: Map<Domain, DataSourceName[]> = new Map()

  /**
   * Register an adapter
   */
  register(adapter: DataSourceAdapter): void {
    this.adapters.set(adapter.name, adapter)

    // Update domain mapping
    for (const domain of adapter.domains) {
      const existing = this.domainSourceMap.get(domain) || []
      if (!existing.includes(adapter.name)) {
        existing.push(adapter.name)
        this.domainSourceMap.set(domain, existing)
      }
    }

    console.log(`[DataSourceRegistry] Registered: ${adapter.name} (domains: ${adapter.domains.join(', ')})`)
  }

  /**
   * Get adapter by name
   */
  get(name: DataSourceName): DataSourceAdapter | undefined {
    return this.adapters.get(name)
  }

  /**
   * Get all registered adapters
   */
  getAll(): DataSourceAdapter[] {
    return Array.from(this.adapters.values())
  }

  /**
   * Get adapters by type (academic, patent, dataset, etc.)
   */
  getByDomain(domain: Domain): DataSourceAdapter[] {
    const sourceNames = this.domainSourceMap.get(domain) || []
    return sourceNames
      .map(name => this.adapters.get(name))
      .filter((adapter): adapter is DataSourceAdapter => adapter !== undefined)
  }

  /**
   * Check which adapters are available
   */
  async checkAvailability(): Promise<Record<DataSourceName, boolean>> {
    const results: Record<DataSourceName, boolean> = {} as Record<DataSourceName, boolean>

    await Promise.all(
      Array.from(this.adapters.entries()).map(async ([name, adapter]) => {
        try {
          results[name] = await adapter.isAvailable()
        } catch {
          results[name] = false
        }
      })
    )

    return results
  }

  /**
   * Get available adapters (ones that have required API keys configured)
   * This is a quick check that doesn't make network requests
   */
  async getAvailableAdapters(): Promise<DataSourceAdapter[]> {
    const adapters = this.getAll()
    const availabilityChecks = await Promise.all(
      adapters.map(async (adapter) => {
        try {
          const available = await adapter.isAvailable()
          return { adapter, available }
        } catch {
          return { adapter, available: false }
        }
      })
    )

    const available = availabilityChecks
      .filter(({ available }) => available)
      .map(({ adapter }) => adapter)

    const unavailable = availabilityChecks
      .filter(({ available }) => !available)
      .map(({ adapter }) => adapter.name)

    if (unavailable.length > 0) {
      console.log(`[DataSourceRegistry] Unavailable sources (missing API keys or offline): ${unavailable.join(', ')}`)
    }

    return available
  }

  /**
   * Search across all registered sources in parallel
   * Automatically skips sources that aren't available (missing API keys, etc.)
   */
  async searchAll(query: string, filters: SearchFilters = {}): Promise<AggregatedSearchResult> {
    const startTime = Date.now()
    const bySource: AggregatedSearchResult['bySource'] = {} as AggregatedSearchResult['bySource']

    // Determine which sources to query based on filters
    let adaptersToQuery = this.getAll()

    // Filter by specific sources if requested
    if (filters.sources && filters.sources.length > 0) {
      adaptersToQuery = adaptersToQuery.filter(a => filters.sources!.includes(a.name))
    }

    // Filter by domains if requested
    if (filters.domains && filters.domains.length > 0) {
      const relevantSources = new Set<DataSourceName>()
      for (const domain of filters.domains) {
        const sourcesForDomain = this.domainSourceMap.get(domain) || []
        sourcesForDomain.forEach(s => relevantSources.add(s))
      }

      adaptersToQuery = adaptersToQuery.filter(a => relevantSources.has(a.name))
    }

    console.log(`[DataSourceRegistry] Searching ${adaptersToQuery.length} sources for: "${query}"`)

    // Execute searches in parallel
    const searchPromises = adaptersToQuery.map(async (adapter) => {
      const sourceStartTime = Date.now()
      try {
        const result = await adapter.search(query, filters)
        bySource[adapter.name] = {
          count: result.sources.length,
          time: Date.now() - sourceStartTime,
          success: true,
        }
        return result
      } catch (error) {
        console.error(`[DataSourceRegistry] ${adapter.name} search failed:`, error)
        bySource[adapter.name] = {
          count: 0,
          time: Date.now() - sourceStartTime,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
        return null
      }
    })

    const results = await Promise.allSettled(searchPromises)

    // Collect all sources
    const allSources: Source[] = []
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        allSources.push(...result.value.sources)
      }
    }

    // Deduplicate sources
    const { deduplicated, removedCount } = this.deduplicateSources(allSources)

    // Sort by relevance
    deduplicated.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))

    // Apply limit
    const limited = filters.limit ? deduplicated.slice(0, filters.limit) : deduplicated

    return {
      sources: limited,
      total: deduplicated.length,
      searchTime: Date.now() - startTime,
      query,
      filters,
      bySource,
      deduplicatedCount: removedCount,
    }
  }

  /**
   * Smart search with domain-based routing
   */
  async smartSearch(
    query: string,
    domains: Domain[],
    filters: SearchFilters = {}
  ): Promise<AggregatedSearchResult> {
    // Create query plan based on domains
    const plan = this.createQueryPlan(query, domains)

    console.log(`[DataSourceRegistry] Smart search plan:`)
    console.log(`  Primary sources: ${plan.primarySources.join(', ')}`)
    console.log(`  Secondary sources: ${plan.secondarySources.join(', ')}`)

    // Search primary sources first
    const primaryResults = await this.searchAll(query, {
      ...filters,
      sources: plan.primarySources,
    })

    // If not enough results, search secondary sources
    if (primaryResults.total < (filters.limit || 20)) {
      const secondaryResults = await this.searchAll(query, {
        ...filters,
        sources: plan.secondarySources,
      })

      // Merge results
      const mergedSources = [...primaryResults.sources, ...secondaryResults.sources]
      const { deduplicated, removedCount } = this.deduplicateSources(mergedSources)

      return {
        sources: deduplicated.slice(0, filters.limit || 100),
        total: deduplicated.length,
        searchTime: primaryResults.searchTime + secondaryResults.searchTime,
        query,
        filters,
        bySource: { ...primaryResults.bySource, ...secondaryResults.bySource },
        deduplicatedCount: primaryResults.deduplicatedCount + secondaryResults.deduplicatedCount + removedCount,
      }
    }

    return primaryResults
  }

  /**
   * Create query plan based on domains
   */
  private createQueryPlan(query: string, domains: Domain[]): QueryPlan {
    const primarySources = new Set<DataSourceName>()
    const secondarySources = new Set<DataSourceName>()

    // Map domains to priority sources
    const domainPrioritySources: Record<Domain, DataSourceName[]> = {
      'solar-energy': ['nrel', 'ieee', 'semantic-scholar'],
      'wind-energy': ['nrel', 'ieee', 'semantic-scholar'],
      'battery-storage': ['semantic-scholar', 'ieee', 'chemrxiv'],
      'hydrogen-fuel': ['semantic-scholar', 'chemrxiv', 'nrel'],
      'biomass': ['semantic-scholar', 'biorxiv', 'pubmed'],
      'geothermal': ['nrel', 'semantic-scholar'],
      'carbon-capture': ['semantic-scholar', 'chemrxiv'],
      'energy-efficiency': ['nrel', 'ieee', 'semantic-scholar'],
      'grid-optimization': ['ieee', 'semantic-scholar', 'nrel'],
      'materials-science': ['semantic-scholar', 'chemrxiv', 'ieee'],
      'other': ['semantic-scholar', 'arxiv'],
    }

    // Add primary sources for each domain
    for (const domain of domains) {
      const priorities = domainPrioritySources[domain] || domainPrioritySources['other']
      priorities.forEach((source, index) => {
        if (index < 2) {
          primarySources.add(source)
        } else {
          secondarySources.add(source)
        }
      })
    }

    // Always include these general sources
    secondarySources.add('arxiv')
    secondarySources.add('google-patents')

    // Remove primary sources from secondary
    primarySources.forEach(s => secondarySources.delete(s))

    return {
      primarySources: Array.from(primarySources).filter(s => this.adapters.has(s)),
      secondarySources: Array.from(secondarySources).filter(s => this.adapters.has(s)),
      query,
      expandedQueries: this.expandQuery(query, domains),
    }
  }

  /**
   * Expand query with domain-specific terms
   */
  private expandQuery(query: string, domains: Domain[]): string[] {
    const expansions = [query]

    const domainTerms: Record<Domain, string[]> = {
      'solar-energy': ['photovoltaic', 'PV', 'solar cell', 'irradiance'],
      'wind-energy': ['wind turbine', 'wind farm', 'offshore wind'],
      'battery-storage': ['lithium-ion', 'energy storage', 'battery cell'],
      'hydrogen-fuel': ['hydrogen production', 'fuel cell', 'electrolysis'],
      'biomass': ['biofuel', 'biomass conversion', 'bioenergy'],
      'geothermal': ['geothermal energy', 'heat pump', 'ground source'],
      'carbon-capture': ['CCS', 'carbon sequestration', 'direct air capture'],
      'energy-efficiency': ['energy saving', 'efficiency improvement'],
      'grid-optimization': ['smart grid', 'grid stability', 'power grid'],
      'materials-science': ['material properties', 'material synthesis'],
      'other': [],
    }

    for (const domain of domains) {
      const terms = domainTerms[domain] || []
      for (const term of terms.slice(0, 2)) {
        if (!query.toLowerCase().includes(term.toLowerCase())) {
          expansions.push(`${query} ${term}`)
        }
      }
    }

    return expansions
  }

  /**
   * Deduplicate sources by title similarity
   */
  private deduplicateSources(sources: Source[]): { deduplicated: Source[]; removedCount: number } {
    const seen = new Map<string, Source>()
    let removedCount = 0

    for (const source of sources) {
      // Normalize title for comparison
      const normalizedTitle = source.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 100)

      if (!seen.has(normalizedTitle)) {
        seen.set(normalizedTitle, source)
      } else {
        removedCount++
        // Keep the one with higher quality or more metadata
        const existing = seen.get(normalizedTitle)!
        const existingScore = this.getSourceScore(existing)
        const newScore = this.getSourceScore(source)

        if (newScore > existingScore) {
          seen.set(normalizedTitle, source)
        }
      }
    }

    return {
      deduplicated: Array.from(seen.values()),
      removedCount,
    }
  }

  /**
   * Calculate source quality score for deduplication
   */
  private getSourceScore(source: Source): number {
    let score = source.metadata.quality || 50

    // Bonus for citations
    if (source.metadata.citationCount) {
      score += Math.min(20, Math.log10(source.metadata.citationCount + 1) * 5)
    }

    // Bonus for abstract
    if (source.abstract && source.abstract.length > 100) {
      score += 10
    }

    // Bonus for relevance score
    if (source.relevanceScore) {
      score += source.relevanceScore / 10
    }

    // Bonus for peer review
    if (source.metadata.verificationStatus === 'peer-reviewed') {
      score += 10
    }

    return score
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalAdapters: number
    adaptersByDomain: Record<string, number>
    availableAdapters: string[]
  } {
    const adaptersByDomain: Record<string, number> = {}

    for (const [domain, sources] of this.domainSourceMap.entries()) {
      adaptersByDomain[domain] = sources.length
    }

    return {
      totalAdapters: this.adapters.size,
      adaptersByDomain,
      availableAdapters: Array.from(this.adapters.keys()),
    }
  }
}

/**
 * Global registry instance
 */
let globalRegistry: DataSourceRegistry | null = null

/**
 * Get or create the global registry
 */
export function getDataSourceRegistry(): DataSourceRegistry {
  if (!globalRegistry) {
    globalRegistry = new DataSourceRegistry()
  }
  return globalRegistry
}

/**
 * Initialize registry with all available adapters
 */
export async function initializeDataSourceRegistry(): Promise<DataSourceRegistry> {
  const registry = getDataSourceRegistry()

  // Helper to safely import and register
  const safeRegister = async (importFn: () => Promise<any>, adapterName: string) => {
    try {
      const module = await importFn()

      // Look for adapter instance (lowercase, like nrelAdapter) first
      const instanceKey = Object.keys(module).find(k =>
        k.toLowerCase().includes('adapter') && !k.endsWith('Adapter')
      )

      // Fall back to class export (uppercase, like NRELAdapter)
      const classKey = Object.keys(module).find(k => k.endsWith('Adapter'))

      let adapter = null

      // Prefer the instance export
      if (instanceKey && module[instanceKey] && module[instanceKey].name && module[instanceKey].domains) {
        adapter = module[instanceKey]
      }
      // Fall back to class if it's already instantiated or has required properties
      else if (classKey && module[classKey]) {
        const exported = module[classKey]
        // Check if it's an instance (has name and domains) or needs instantiation
        if (exported.name && exported.domains) {
          adapter = exported
        } else if (typeof exported === 'function') {
          // It's a class, try to instantiate
          try {
            adapter = new exported()
          } catch {
            // Can't instantiate, skip
          }
        }
      }

      if (adapter && adapter.name && Array.isArray(adapter.domains)) {
        registry.register(adapter)
      } else {
        console.warn(`[DataSourceRegistry] ${adapterName}: No valid adapter found in exports:`, Object.keys(module))
      }
    } catch (error) {
      console.warn(`[DataSourceRegistry] Failed to load ${adapterName}:`, error)
    }
  }

  // Import all adapters in parallel
  await Promise.all([
    // Core academic sources
    safeRegister(() => import('../sources/semantic-scholar'), 'semantic-scholar'),
    safeRegister(() => import('../sources/arxiv'), 'arxiv'),
    safeRegister(() => import('../sources/openalex'), 'openalex'),
    safeRegister(() => import('../sources/pubmed'), 'pubmed'),
    safeRegister(() => import('../sources/crossref'), 'crossref'),
    safeRegister(() => import('../sources/core'), 'core'),
    safeRegister(() => import('../sources/ieee'), 'ieee'),

    // Preprint servers
    safeRegister(() => import('../sources/biorxiv'), 'biorxiv'),
    safeRegister(() => import('../sources/chemrxiv'), 'chemrxiv'),

    // Domain-specific data sources
    safeRegister(() => import('../sources/nrel'), 'nrel'),
    safeRegister(() => import('../sources/consensus'), 'consensus'),
    safeRegister(() => import('../sources/materials-project'), 'materials-project'),

    // Chemistry databases
    safeRegister(() => import('../sources/pubchem'), 'pubchem'),
    safeRegister(() => import('../sources/chemspider'), 'chemspider'),
    safeRegister(() => import('../sources/nist-webbook'), 'nist-webbook'),

    // Patents
    safeRegister(() => import('../sources/google-patents'), 'google-patents'),
    safeRegister(() => import('../sources/uspto'), 'uspto'),

    // Web Search - Google Custom Search API for pricing/policy/benchmarks
    safeRegister(() => import('../sources/web-search'), 'web-search'),
  ])

  console.log(`[DataSourceRegistry] Initialized with ${registry.getAll().length} adapters:`,
    registry.getAll().map(a => a.name).join(', '))

  return registry
}
