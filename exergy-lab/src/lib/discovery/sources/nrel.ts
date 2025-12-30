/**
 * NREL (National Renewable Energy Laboratory) Adapter
 *
 * Searches NREL's comprehensive renewable energy datasets.
 * API: https://developer.nrel.gov/
 * Rate: 1000 requests/hour with API key
 *
 * Features:
 * - Solar resource data (irradiance, weather) via NSRDB
 * - PV performance data via PVWatts
 * - Technology cost projections via ATB
 * - Alternative fuel stations
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
import {
  NSRDBClient,
  PVWattsClient,
  ATBClient,
  ATBTechnology,
} from './nrel/index'

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

  private nsrdbClient: NSRDBClient | null = null
  private pvwattsClient: PVWattsClient | null = null
  private atbClient: ATBClient

  constructor(apiKey?: string) {
    super({
      baseUrl: 'https://developer.nrel.gov/api',
      apiKey: apiKey || process.env.NREL_API_KEY,
      requestsPerMinute: 16, // 1000/hour = ~16.6/min
      requestsPerDay: 1000,
      cacheTTL: 24 * 60 * 60 * 1000, // 24 hours (datasets don't change frequently)
    })

    // Initialize ATB client (no API key needed)
    this.atbClient = new ATBClient()

    // Initialize API-dependent clients if key is available
    if (this.apiKey) {
      this.nsrdbClient = new NSRDBClient({ apiKey: this.apiKey })
      this.pvwattsClient = new PVWattsClient({ apiKey: this.apiKey })
    }
  }

  /**
   * Execute search query
   */
  protected async executeSearch(
    query: string,
    filters: SearchFilters = {}
  ): Promise<SearchResult> {
    const startTime = Date.now()
    const queryLower = query.toLowerCase()
    const results: Dataset[] = []

    // Search ATB data (always available)
    const atbResults = await this.searchATB(queryLower, filters)
    results.push(...atbResults)

    // Search solar data if API key is available
    if (this.apiKey && (queryLower.includes('solar') || queryLower.includes('pv') || queryLower.includes('irradiance'))) {
      const solarResults = await this.searchSolarData(queryLower, filters)
      results.push(...solarResults)
    }

    // Add NREL dataset references
    const datasetRefs = this.getDatasetReferences(queryLower, filters)
    results.push(...datasetRefs)

    return {
      sources: results.slice(0, filters.limit || 20),
      total: results.length,
      searchTime: Date.now() - startTime,
      query,
      filters,
      from: this.name,
    }
  }

  /**
   * Search ATB (Annual Technology Baseline) data
   */
  private async searchATB(query: string, filters: SearchFilters): Promise<Dataset[]> {
    const datasets: Dataset[] = []

    // Map query terms to ATB technologies
    const technologyMap: Record<string, ATBTechnology[]> = {
      solar: ['utility-scale-pv', 'commercial-pv', 'residential-pv'],
      pv: ['utility-scale-pv', 'commercial-pv', 'residential-pv'],
      wind: ['land-based-wind', 'offshore-wind'],
      battery: ['battery-storage'],
      storage: ['battery-storage', 'pumped-hydro'],
      geothermal: ['geothermal'],
      hydro: ['hydropower', 'pumped-hydro'],
      nuclear: ['nuclear'],
      gas: ['natural-gas'],
      csp: ['csp'],
      cost: this.atbClient.getAvailableTechnologies(),
      lcoe: this.atbClient.getAvailableTechnologies(),
      capex: this.atbClient.getAvailableTechnologies(),
    }

    // Find matching technologies
    const matchedTechnologies = new Set<ATBTechnology>()
    for (const [term, techs] of Object.entries(technologyMap)) {
      if (query.includes(term)) {
        techs.forEach(t => matchedTechnologies.add(t))
      }
    }

    // If no specific match, return general ATB info
    if (matchedTechnologies.size === 0 && (query.includes('energy') || query.includes('renewable') || query.includes('technology'))) {
      matchedTechnologies.add('utility-scale-pv')
      matchedTechnologies.add('land-based-wind')
      matchedTechnologies.add('battery-storage')
    }

    // Fetch ATB data for matched technologies
    for (const technology of matchedTechnologies) {
      try {
        const trajectory = await this.atbClient.getCostTrajectory(technology, 'moderate')

        if (trajectory.trajectory.length > 0) {
          const latest = trajectory.trajectory[0]
          const future = trajectory.trajectory[trajectory.trajectory.length - 1]

          datasets.push({
            id: `nrel:atb-${technology}`,
            title: `ATB 2024: ${this.formatTechnologyName(technology)} Cost Projections`,
            authors: ['NREL Annual Technology Baseline'],
            abstract: `Technology cost and performance projections for ${this.formatTechnologyName(technology)}. ` +
              `Current (${latest.year}): CAPEX $${latest.capex}/kW, LCOE $${latest.lcoe}/MWh, CF ${latest.capacityFactor}%. ` +
              `Projected (${future.year}): CAPEX $${future.capex}/kW, LCOE $${future.lcoe}/MWh.`,
            url: 'https://atb.nrel.gov/',
            metadata: {
              source: this.name,
              sourceType: 'dataset',
              quality: 95,
              verificationStatus: 'peer-reviewed',
              accessType: 'open',
              publicationDate: '2024-07-01',
            },
            dataProvider: 'nrel',
            format: 'json',
            lastUpdated: '2024-07-01',
            license: 'Public Domain',
            downloadUrl: 'https://atb.nrel.gov/electricity/2024/data',
            apiEndpoint: 'https://atb.nrel.gov/',
            tags: [technology, 'cost', 'lcoe', 'capex', 'projections'],
            variables: [
              { name: 'CAPEX', unit: '$/kW', description: 'Capital Expenditure' },
              { name: 'LCOE', unit: '$/MWh', description: 'Levelized Cost of Energy' },
              { name: 'Capacity Factor', unit: '%', description: 'Annual capacity factor' },
            ],
            relevanceScore: 90,
          })
        }
      } catch (error) {
        console.warn(`[NREL] Failed to fetch ATB data for ${technology}:`, error)
      }
    }

    return datasets
  }

  /**
   * Search solar resource data
   */
  private async searchSolarData(query: string, filters: SearchFilters): Promise<Dataset[]> {
    const datasets: Dataset[] = []

    // NSRDB Dataset reference
    if (query.includes('solar') || query.includes('irradiance') || query.includes('radiation')) {
      datasets.push({
        id: 'nrel:nsrdb',
        title: 'National Solar Radiation Database (NSRDB)',
        authors: ['National Renewable Energy Laboratory'],
        abstract: 'High-resolution solar irradiance and meteorological data for locations across the United States and internationally. ' +
          'Includes Direct Normal Irradiance (DNI), Diffuse Horizontal Irradiance (DHI), Global Horizontal Irradiance (GHI), ' +
          'temperature, wind speed, and other meteorological variables. Data available from 1998-present at 30-minute resolution.',
        url: 'https://nsrdb.nrel.gov/',
        metadata: {
          source: this.name,
          sourceType: 'dataset',
          quality: 98,
          verificationStatus: 'peer-reviewed',
          accessType: 'open',
          publicationDate: new Date().toISOString(),
        },
        dataProvider: 'nrel',
        format: 'csv',
        lastUpdated: new Date().toISOString(),
        license: 'Public Domain',
        downloadUrl: 'https://nsrdb.nrel.gov/data-viewer',
        apiEndpoint: 'https://developer.nrel.gov/api/nsrdb',
        tags: ['solar', 'irradiance', 'dni', 'ghi', 'dhi', 'weather', 'meteorological'],
        variables: [
          { name: 'DNI', unit: 'W/m2', description: 'Direct Normal Irradiance' },
          { name: 'GHI', unit: 'W/m2', description: 'Global Horizontal Irradiance' },
          { name: 'DHI', unit: 'W/m2', description: 'Diffuse Horizontal Irradiance' },
          { name: 'Temperature', unit: 'C', description: 'Air Temperature' },
          { name: 'Wind Speed', unit: 'm/s', description: 'Wind Speed at 10m' },
        ],
        relevanceScore: 95,
      })
    }

    // PVWatts reference
    if (query.includes('pv') || query.includes('performance') || query.includes('production')) {
      datasets.push({
        id: 'nrel:pvwatts',
        title: 'PVWatts Calculator',
        authors: ['National Renewable Energy Laboratory'],
        abstract: 'PVWatts estimates the energy production and cost savings of grid-connected photovoltaic (PV) systems. ' +
          'Calculates hourly and monthly energy output based on system parameters including capacity, tilt, azimuth, ' +
          'losses, and local solar resource data from NSRDB.',
        url: 'https://pvwatts.nrel.gov/',
        metadata: {
          source: this.name,
          sourceType: 'dataset',
          quality: 95,
          verificationStatus: 'peer-reviewed',
          accessType: 'open',
          publicationDate: new Date().toISOString(),
        },
        dataProvider: 'nrel',
        format: 'api',
        lastUpdated: new Date().toISOString(),
        license: 'Public Domain',
        apiEndpoint: 'https://developer.nrel.gov/api/pvwatts/v8',
        tags: ['pv', 'solar', 'performance', 'production', 'capacity factor'],
        variables: [
          { name: 'AC Output', unit: 'kWh', description: 'AC electricity output' },
          { name: 'Capacity Factor', unit: '%', description: 'System capacity factor' },
          { name: 'POA Irradiance', unit: 'kWh/m2', description: 'Plane of array irradiance' },
        ],
        relevanceScore: 92,
      })
    }

    return datasets
  }

  /**
   * Get dataset references based on query
   */
  private getDatasetReferences(query: string, filters: SearchFilters): Dataset[] {
    const datasets: Dataset[] = []

    // Wind data
    if (query.includes('wind')) {
      datasets.push({
        id: 'nrel:wind-toolkit',
        title: 'Wind Integration National Dataset (WIND) Toolkit',
        authors: ['National Renewable Energy Laboratory'],
        abstract: 'High-resolution wind resource data for the continental United States. ' +
          'Includes wind speed, direction, and power density at multiple hub heights (10m to 200m). ' +
          'Covers 2007-2014 at 5-minute temporal resolution and 2km spatial resolution.',
        url: 'https://www.nrel.gov/grid/wind-toolkit.html',
        metadata: {
          source: this.name,
          sourceType: 'dataset',
          quality: 95,
          verificationStatus: 'peer-reviewed',
          accessType: 'open',
          publicationDate: '2023-01-01',
        },
        dataProvider: 'nrel',
        format: 'hdf5',
        lastUpdated: '2023-01-01',
        license: 'Public Domain',
        downloadUrl: 'https://www.nrel.gov/grid/wind-toolkit.html',
        tags: ['wind', 'wind speed', 'power density', 'hub height'],
        variables: [
          { name: 'wind_speed', unit: 'm/s', description: 'Wind Speed at Hub Height' },
          { name: 'wind_direction', unit: 'degrees', description: 'Wind Direction' },
          { name: 'power_density', unit: 'W/m2', description: 'Wind Power Density' },
        ],
        relevanceScore: 93,
      })
    }

    // Building energy
    if (query.includes('building') || query.includes('efficiency') || query.includes('commercial') || query.includes('residential')) {
      datasets.push({
        id: 'nrel:resstock',
        title: 'ResStock: Residential Building Stock Analysis',
        authors: ['National Renewable Energy Laboratory'],
        abstract: 'Large-scale residential building energy modeling dataset representing the U.S. housing stock. ' +
          'Includes energy consumption by end-use, building characteristics, and upgrade potential analysis ' +
          'for energy efficiency measures.',
        url: 'https://resstock.nrel.gov/',
        metadata: {
          source: this.name,
          sourceType: 'dataset',
          quality: 92,
          verificationStatus: 'peer-reviewed',
          accessType: 'open',
          publicationDate: '2023-06-01',
        },
        dataProvider: 'nrel',
        format: 'csv',
        lastUpdated: '2023-06-01',
        license: 'Public Domain',
        downloadUrl: 'https://data.openei.org/submissions/4520',
        tags: ['building', 'residential', 'energy efficiency', 'HVAC', 'modeling'],
        relevanceScore: 88,
      })

      datasets.push({
        id: 'nrel:comstock',
        title: 'ComStock: Commercial Building Stock Analysis',
        authors: ['National Renewable Energy Laboratory'],
        abstract: 'Large-scale commercial building energy modeling dataset representing the U.S. commercial building stock. ' +
          'Includes energy consumption by building type, end-use breakdowns, and upgrade potential analysis.',
        url: 'https://comstock.nrel.gov/',
        metadata: {
          source: this.name,
          sourceType: 'dataset',
          quality: 92,
          verificationStatus: 'peer-reviewed',
          accessType: 'open',
          publicationDate: '2023-06-01',
        },
        dataProvider: 'nrel',
        format: 'csv',
        lastUpdated: '2023-06-01',
        license: 'Public Domain',
        downloadUrl: 'https://data.openei.org/submissions/4520',
        tags: ['building', 'commercial', 'energy efficiency', 'HVAC', 'modeling'],
        relevanceScore: 87,
      })
    }

    // EV and hydrogen
    if (query.includes('electric') || query.includes('ev') || query.includes('charging') || query.includes('hydrogen')) {
      datasets.push({
        id: 'nrel:afdc',
        title: 'Alternative Fuels Data Center',
        authors: ['National Renewable Energy Laboratory', 'U.S. Department of Energy'],
        abstract: 'Comprehensive database of alternative fuel stations in the United States including ' +
          'electric vehicle charging stations, hydrogen fueling stations, CNG, LNG, propane, and biodiesel. ' +
          'Real-time availability data for many stations.',
        url: 'https://afdc.energy.gov/',
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
        apiEndpoint: 'https://developer.nrel.gov/api/alt-fuel-stations/v1',
        downloadUrl: 'https://afdc.energy.gov/stations/download',
        tags: ['ev', 'charging', 'hydrogen', 'alternative fuel', 'infrastructure'],
        relevanceScore: 85,
      })
    }

    // Grid and utility
    if (query.includes('grid') || query.includes('utility') || query.includes('rate') || query.includes('electricity price')) {
      datasets.push({
        id: 'nrel:utility-rates',
        title: 'Utility Rate Database (URDB)',
        authors: ['National Renewable Energy Laboratory', 'OpenEI'],
        abstract: 'Comprehensive database of utility rate structures across the United States. ' +
          'Includes residential, commercial, and industrial rates, time-of-use structures, demand charges, ' +
          'and net metering policies.',
        url: 'https://openei.org/wiki/Utility_Rate_Database',
        metadata: {
          source: this.name,
          sourceType: 'dataset',
          quality: 88,
          verificationStatus: 'unverified',
          accessType: 'open',
          publicationDate: new Date().toISOString(),
        },
        dataProvider: 'nrel',
        format: 'json',
        lastUpdated: new Date().toISOString(),
        license: 'Public Domain',
        apiEndpoint: 'https://developer.nrel.gov/api/utility_rates/v3',
        tags: ['utility', 'rates', 'electricity', 'pricing', 'tariff'],
        relevanceScore: 84,
      })
    }

    return datasets
  }

  /**
   * Get details for a specific dataset
   */
  protected async executeGetDetails(id: string): Promise<Source | null> {
    try {
      // For ATB data, fetch specific technology details
      if (id.startsWith('nrel:atb-')) {
        const technology = id.replace('nrel:atb-', '') as ATBTechnology
        const breakdown = await this.atbClient.getLCOEBreakdown(technology, 2024)

        return {
          id,
          title: `ATB 2024: ${this.formatTechnologyName(technology)}`,
          authors: ['NREL Annual Technology Baseline'],
          abstract: `Detailed cost breakdown for ${this.formatTechnologyName(technology)}. ` +
            `LCOE: $${breakdown.lcoe}/MWh. Capital: $${breakdown.breakdown.capital}/MWh, ` +
            `Fixed O&M: $${breakdown.breakdown.fixedOm}/MWh. ` +
            `Assumptions: ${breakdown.assumptions.economicLife} year life, ` +
            `${(breakdown.assumptions.discountRate * 100).toFixed(1)}% discount rate, ` +
            `${breakdown.assumptions.capacityFactor}% capacity factor.`,
          url: 'https://atb.nrel.gov/',
          metadata: {
            source: this.name,
            sourceType: 'dataset',
            quality: 95,
            verificationStatus: 'peer-reviewed',
            accessType: 'open',
            publicationDate: '2024-07-01',
          },
        }
      }

      return null
    } catch (error) {
      console.error(`[${this.name}] Failed to get details for ${id}:`, error)
      return null
    }
  }

  /**
   * Format technology name for display
   */
  private formatTechnologyName(technology: ATBTechnology): string {
    const names: Record<ATBTechnology, string> = {
      'utility-scale-pv': 'Utility-Scale Solar PV',
      'commercial-pv': 'Commercial Solar PV',
      'residential-pv': 'Residential Solar PV',
      'land-based-wind': 'Land-Based Wind',
      'offshore-wind': 'Offshore Wind',
      'battery-storage': 'Battery Storage',
      'pumped-hydro': 'Pumped Hydro Storage',
      'geothermal': 'Geothermal',
      'biopower': 'Biopower',
      'hydropower': 'Hydropower',
      'csp': 'Concentrating Solar Power',
      'nuclear': 'Nuclear',
      'natural-gas': 'Natural Gas Combined Cycle',
      'coal': 'Coal',
    }
    return names[technology] || technology
  }

  /**
   * Test if API is available
   */
  async isAvailable(): Promise<boolean> {
    // ATB client is always available (uses embedded data)
    // For full functionality, API key is needed
    if (!this.apiKey) {
      console.warn('[NREL] No API key configured - limited to ATB data only')
      return true // Still functional with ATB data
    }

    try {
      // Test PVWatts with a simple query
      if (this.pvwattsClient) {
        await this.pvwattsClient.calculate({
          lat: 39.7,
          lon: -105.2,
          system_capacity: 1,
          module_type: 0,
          losses: 14,
          array_type: 0,
          tilt: 20,
          azimuth: 180,
        })
      }
      return true
    } catch (error) {
      console.error('[NREL] Availability check failed:', error)
      return true // Fall back to ATB-only mode
    }
  }

  /**
   * Override cache TTL for NREL (longer TTL)
   */
  protected getCacheTTL(): number {
    return 24 * 60 * 60 * 1000 // 24 hours
  }

  /**
   * Get direct access to ATB client for advanced queries
   */
  getATBClient(): ATBClient {
    return this.atbClient
  }

  /**
   * Get direct access to PVWatts client
   */
  getPVWattsClient(): PVWattsClient | null {
    return this.pvwattsClient
  }

  /**
   * Get direct access to NSRDB client
   */
  getNSRDBClient(): NSRDBClient | null {
    return this.nsrdbClient
  }
}

/**
 * Create and export NREL adapter instance
 */
export const nrelAdapter = new NRELAdapter()
