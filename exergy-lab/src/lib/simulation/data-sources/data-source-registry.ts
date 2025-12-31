/**
 * Data Source Registry
 *
 * Central registry for external data APIs used in simulations.
 * Provides API-first access with intelligent caching and fallback.
 */

import { ATBClient, createATBClient } from '@/lib/discovery/sources/nrel/atb-client'
import type { ATBTechnology, ATBDataPoint } from '@/lib/discovery/sources/nrel/types'

/**
 * Data source status
 */
export interface DataSourceStatus {
  name: string
  available: boolean
  lastChecked: Date
  usingFallback: boolean
  error?: string
}

/**
 * Cached data with metadata
 */
interface CachedData<T> {
  data: T
  timestamp: number
  ttl: number
  isFallback: boolean
}

/**
 * Cache TTL constants (in milliseconds)
 */
export const CACHE_TTL = {
  ATB_DATA: 24 * 60 * 60 * 1000, // 24 hours (yearly updates)
  MATERIALS_PROJECT: 7 * 24 * 60 * 60 * 1000, // 7 days
  NSRDB_TMY: Infinity, // Indefinite (historical data)
  SOLAR_REALTIME: 60 * 60 * 1000, // 1 hour
}

/**
 * Data Source Registry - manages all external data sources
 */
export class DataSourceRegistry {
  private atbClient: ATBClient
  private cache: Map<string, CachedData<unknown>> = new Map()
  private sourceStatus: Map<string, DataSourceStatus> = new Map()

  constructor() {
    this.atbClient = createATBClient()
  }

  /**
   * Get ATB data for a technology
   */
  async getATBData(
    technology: ATBTechnology,
    year: number = 2024,
    scenario: 'conservative' | 'moderate' | 'advanced' = 'moderate'
  ): Promise<{
    data: ATBDataPoint | null
    isFallback: boolean
    source: string
  }> {
    const cacheKey = `atb:${technology}:${year}:${scenario}`

    // Check cache first
    const cached = this.getFromCache<ATBDataPoint>(cacheKey)
    if (cached) {
      return {
        data: cached.data,
        isFallback: cached.isFallback,
        source: cached.isFallback ? 'embedded-fallback' : 'nrel-atb-api',
      }
    }

    try {
      // Try API first
      const result = await this.atbClient.getData({ technology, year, scenario })
      const data = result.data[0] || null

      if (data) {
        this.setCache(cacheKey, data, CACHE_TTL.ATB_DATA, false)
        this.updateSourceStatus('nrel-atb', true, false)
        return { data, isFallback: false, source: 'nrel-atb-api' }
      }
    } catch (error) {
      console.warn('[DataSourceRegistry] ATB API failed, using fallback:', error)
      this.updateSourceStatus('nrel-atb', false, true, String(error))
    }

    // Use embedded fallback data (already in atb-client.ts)
    const fallbackResult = await this.atbClient.getData({ technology, year, scenario })
    const fallbackData = fallbackResult.data[0] || null

    if (fallbackData) {
      this.setCache(cacheKey, fallbackData, CACHE_TTL.ATB_DATA, true)
    }

    return {
      data: fallbackData,
      isFallback: true,
      source: 'embedded-fallback',
    }
  }

  /**
   * Get efficiency data for a technology
   */
  async getTechnologyEfficiency(
    technology: ATBTechnology,
    year: number = 2024
  ): Promise<{
    efficiency: number
    uncertainty: number
    isFallback: boolean
  }> {
    const result = await this.getATBData(technology, year)

    if (result.data?.efficiency) {
      return {
        efficiency: result.data.efficiency / 100, // Convert % to decimal
        uncertainty: 0.02, // 2% uncertainty from ATB
        isFallback: result.isFallback,
      }
    }

    // Default fallback efficiencies by technology type
    const defaultEfficiencies: Partial<Record<ATBTechnology, number>> = {
      'utility-scale-pv': 0.215,
      'land-based-wind': 0.40, // Capacity factor as proxy
      'offshore-wind': 0.44,
      'battery-storage': 0.85,
      'natural-gas': 0.535,
      'nuclear': 0.33,
      'geothermal': 0.12,
      'hydropower': 0.90,
    }

    return {
      efficiency: defaultEfficiencies[technology] || 0.70,
      uncertainty: 0.05,
      isFallback: true,
    }
  }

  /**
   * Get capacity factor for a technology
   */
  async getCapacityFactor(
    technology: ATBTechnology,
    year: number = 2024
  ): Promise<{
    capacityFactor: number
    uncertainty: number
    isFallback: boolean
  }> {
    const result = await this.getATBData(technology, year)

    if (result.data?.capacityFactor) {
      return {
        capacityFactor: result.data.capacityFactor / 100,
        uncertainty: 0.03,
        isFallback: result.isFallback,
      }
    }

    return {
      capacityFactor: 0.25,
      uncertainty: 0.05,
      isFallback: true,
    }
  }

  /**
   * Get LCOE data for a technology
   */
  async getLCOE(
    technology: ATBTechnology,
    year: number = 2024,
    scenario: 'conservative' | 'moderate' | 'advanced' = 'moderate'
  ): Promise<{
    lcoe: number
    uncertainty: number
    isFallback: boolean
  }> {
    const result = await this.getATBData(technology, year, scenario)

    if (result.data?.lcoe) {
      return {
        lcoe: result.data.lcoe,
        uncertainty: result.data.lcoe * 0.10, // 10% uncertainty
        isFallback: result.isFallback,
      }
    }

    return {
      lcoe: 50.0, // Default $/MWh
      uncertainty: 15.0,
      isFallback: true,
    }
  }

  /**
   * Get all source statuses
   */
  getSourceStatuses(): DataSourceStatus[] {
    return Array.from(this.sourceStatus.values())
  }

  /**
   * Check if any source is using fallback
   */
  isUsingFallback(): boolean {
    return Array.from(this.sourceStatus.values()).some(s => s.usingFallback)
  }

  /**
   * Check health of all data sources and return status map
   */
  async checkDataSourceHealth(): Promise<Record<string, 'available' | 'fallback' | 'unavailable'>> {
    const status: Record<string, 'available' | 'fallback' | 'unavailable'> = {}

    // Check NREL ATB
    try {
      const atbResult = await this.getATBData('utility-scale-pv', 2024)
      if (atbResult.data) {
        status['nrel-atb'] = atbResult.isFallback ? 'fallback' : 'available'
      } else {
        status['nrel-atb'] = 'unavailable'
      }
    } catch {
      status['nrel-atb'] = 'unavailable'
    }

    // Add other data sources as they are checked
    // Materials Project and Environmental DB status would be added here
    // For now, mark them based on whether they have embedded fallback data
    status['materials-project'] = 'fallback' // Always has embedded data
    status['nrel-nsrdb'] = 'fallback' // Always has embedded data

    return status
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear()
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getFromCache<T>(key: string): CachedData<T> | null {
    const cached = this.cache.get(key) as CachedData<T> | undefined
    if (!cached) return null

    const isExpired = Date.now() - cached.timestamp > cached.ttl
    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return cached
  }

  private setCache<T>(
    key: string,
    data: T,
    ttl: number,
    isFallback: boolean
  ): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      isFallback,
    })
  }

  private updateSourceStatus(
    name: string,
    available: boolean,
    usingFallback: boolean,
    error?: string
  ): void {
    this.sourceStatus.set(name, {
      name,
      available,
      lastChecked: new Date(),
      usingFallback,
      error,
    })
  }
}

/**
 * Singleton instance
 */
let registryInstance: DataSourceRegistry | null = null

export function getDataSourceRegistry(): DataSourceRegistry {
  if (!registryInstance) {
    registryInstance = new DataSourceRegistry()
  }
  return registryInstance
}

/**
 * Create a new registry (for testing)
 */
export function createDataSourceRegistry(): DataSourceRegistry {
  return new DataSourceRegistry()
}
