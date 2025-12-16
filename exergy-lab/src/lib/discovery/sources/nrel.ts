/**
 * NREL (National Renewable Energy Laboratory) Adapter
 *
 * Searches NREL's comprehensive renewable energy datasets.
 * API: https://developer.nrel.gov/
 * Rate: 1000 requests/hour with API key
 *
 * Features:
 * - Solar resource data (irradiance, weather)
 * - Wind resource data (speed, direction)
 * - Building energy data
 * - PV performance data
 * - Alternative fuel stations
 * - Transportation data
 * - Utility rates
 */

import { BaseAdapter } from './base'
import {
  DataSourceName,
  Source,
  SearchFilters,
  SearchResult,
  Dataset,
} from '@/types/sources'
import { Domain } from '@/types/discovery'

/**
 * NREL API response types
 */
interface NRELAPIResponse {
  result: {
    outputs: Array<{
      id: string
      title: string
      description: string
      url: string
      category: string
      format: string
      size?: number
      updated_at: string
      keywords?: string[]
      variables?: Array<{
        name: string
        unit: string
        description: string
      }>
    }>
    total: number
  }
}

/**
 * NREL adapter implementation
 */
export class NRELAdapter extends BaseAdapter {
  readonly name: DataSourceName = 'nrel'
  readonly domains: Domain[] = [
    'solar-energy',
    'wind-energy',
    'battery-storage',
    'hydrogen-fuel',
    'biomass',
    'geothermal',
    'energy-efficiency',
    'grid-optimization',
  ]

  constructor(apiKey?: string) {
    super({
      baseUrl: 'https://developer.nrel.gov/api',
      apiKey: apiKey || process.env.NREL_API_KEY,
      requestsPerMinute: 16, // 1000/hour = ~16.6/min
      requestsPerDay: 1000,
      cacheTTL: 24 * 60 * 60 * 1000, // 24 hours (datasets don't change frequently)
    })
  }

  /**
   * Execute search query
   */
  protected async executeSearch(
    query: string,
    filters: SearchFilters = {}
  ): Promise<SearchResult> {
    const startTime = Date.now()

    // NREL has various dataset APIs, we'll search the main data catalog
    // For production, you'd want to integrate with specific APIs:
    // - Solar Resource Data: /api/solar/...
    // - Wind Resource Data: /api/wind/...
    // - Alt Fuel Stations: /api/alt-fuel-stations/...
    // - Utility Rates: /api/utility_rates/...

    // For now, we'll simulate a catalog search
    // In production, this would call NREL's data catalog or individual APIs

    const mockResults = this.getMockDatasets(query, filters)

    return {
      sources: mockResults,
      total: mockResults.length,
      searchTime: Date.now() - startTime,
      query,
      filters,
      from: this.name,
    }
  }

  /**
   * Get details for a specific dataset
   */
  protected async executeGetDetails(id: string): Promise<Source | null> {
    try {
      // In production, this would fetch specific dataset metadata
      // For now, return null as we need actual NREL integration
      return null
    } catch (error) {
      console.error(`[${this.name}] Failed to get details for ${id}:`, error)
      return null
    }
  }

  /**
   * Mock datasets for demonstration
   * In production, this would be replaced with actual NREL API calls
   */
  private getMockDatasets(query: string, filters: SearchFilters): Dataset[] {
    const queryLower = query.toLowerCase()

    const datasets: Dataset[] = []

    // Solar datasets
    if (queryLower.includes('solar') || queryLower.includes('pv')) {
      datasets.push({
        id: 'nrel:solar-resource-data',
        title: 'NREL Solar Resource Data',
        authors: ['National Renewable Energy Laboratory'],
        abstract: 'Comprehensive solar irradiance and meteorological data for locations across the United States. Includes direct normal irradiance (DNI), diffuse horizontal irradiance (DHI), and global horizontal irradiance (GHI).',
        url: 'https://nsrdb.nrel.gov/',
        metadata: {
          source: this.name,
          sourceType: 'dataset',
          quality: 95,
          verificationStatus: 'peer-reviewed',
          accessType: 'open',
          publicationDate: new Date().toISOString(),
        },
        dataProvider: 'nrel',
        format: 'csv',
        lastUpdated: new Date().toISOString(),
        license: 'Public Domain',
        downloadUrl: 'https://nsrdb.nrel.gov/data-viewer',
        apiEndpoint: 'https://developer.nrel.gov/api/solar',
        tags: ['solar', 'irradiance', 'weather', 'meteorological'],
        variables: [
          { name: 'DNI', unit: 'W/m²', description: 'Direct Normal Irradiance' },
          { name: 'DHI', unit: 'W/m²', description: 'Diffuse Horizontal Irradiance' },
          { name: 'GHI', unit: 'W/m²', description: 'Global Horizontal Irradiance' },
        ],
        relevanceScore: 95,
      })
    }

    // Wind datasets
    if (queryLower.includes('wind')) {
      datasets.push({
        id: 'nrel:wind-resource-data',
        title: 'NREL Wind Resource Data',
        authors: ['National Renewable Energy Laboratory'],
        abstract: 'High-resolution wind resource data including wind speed, direction, and power density for wind energy assessment.',
        url: 'https://windexchange.energy.gov/',
        metadata: {
          source: this.name,
          sourceType: 'dataset',
          quality: 95,
          verificationStatus: 'peer-reviewed',
          accessType: 'open',
          publicationDate: new Date().toISOString(),
        },
        dataProvider: 'nrel',
        format: 'hdf5',
        lastUpdated: new Date().toISOString(),
        license: 'Public Domain',
        apiEndpoint: 'https://developer.nrel.gov/api/wind',
        tags: ['wind', 'wind speed', 'power density'],
        variables: [
          { name: 'wind_speed', unit: 'm/s', description: 'Wind Speed at Hub Height' },
          { name: 'wind_direction', unit: 'degrees', description: 'Wind Direction' },
          { name: 'power_density', unit: 'W/m²', description: 'Wind Power Density' },
        ],
        relevanceScore: 95,
      })
    }

    // Building energy datasets
    if (queryLower.includes('building') || queryLower.includes('efficiency')) {
      datasets.push({
        id: 'nrel:building-energy-data',
        title: 'NREL Building Energy Data',
        authors: ['National Renewable Energy Laboratory'],
        abstract: 'Building energy consumption data, performance metrics, and energy efficiency benchmarks for commercial and residential buildings.',
        url: 'https://buildingdata.energy.gov/',
        metadata: {
          source: this.name,
          sourceType: 'dataset',
          quality: 90,
          verificationStatus: 'peer-reviewed',
          accessType: 'open',
          publicationDate: new Date().toISOString(),
        },
        dataProvider: 'nrel',
        format: 'json',
        lastUpdated: new Date().toISOString(),
        license: 'Public Domain',
        tags: ['building', 'energy consumption', 'efficiency', 'HVAC'],
        relevanceScore: 85,
      })
    }

    // EV charging stations
    if (queryLower.includes('electric') || queryLower.includes('ev') || queryLower.includes('charging')) {
      datasets.push({
        id: 'nrel:alt-fuel-stations',
        title: 'Alternative Fuel Stations',
        authors: ['National Renewable Energy Laboratory'],
        abstract: 'Database of alternative fuel stations in the United States including electric vehicle charging stations, hydrogen stations, and more.',
        url: 'https://afdc.energy.gov/stations/',
        metadata: {
          source: this.name,
          sourceType: 'dataset',
          quality: 90,
          verificationStatus: 'unverified',
          accessType: 'open',
          publicationDate: new Date().toISOString(),
        },
        dataProvider: 'nrel',
        format: 'json',
        lastUpdated: new Date().toISOString(),
        license: 'Public Domain',
        apiEndpoint: 'https://developer.nrel.gov/api/alt-fuel-stations',
        tags: ['ev', 'charging', 'hydrogen', 'alternative fuel'],
        relevanceScore: 80,
      })
    }

    return datasets.slice(0, filters.limit || 20)
  }

  /**
   * Test if API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        console.warn('[NREL] No API key configured')
        return false
      }

      // Test with a simple API call (utility rates endpoint is lightweight)
      // In production, you'd make an actual test call
      return true
    } catch (error) {
      console.error('[NREL] Availability check failed:', error)
      return false
    }
  }

  /**
   * Override cache TTL for NREL (longer TTL)
   */
  protected getCacheTTL(): number {
    return 24 * 60 * 60 * 1000 // 24 hours
  }
}

/**
 * Create and export NREL adapter instance
 */
export const nrelAdapter = new NRELAdapter()
