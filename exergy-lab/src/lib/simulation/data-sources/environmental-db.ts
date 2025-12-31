/**
 * Environmental Database
 *
 * Wrapper for NREL NSRDB and PVWatts data for location-specific
 * environmental conditions in simulations.
 */

import { CACHE_TTL } from './data-source-registry'

/**
 * Solar resource data
 */
export interface SolarResource {
  location: { lat: number; lon: number }
  ghi: number // Global Horizontal Irradiance (kWh/m2/day)
  dni: number // Direct Normal Irradiance (kWh/m2/day)
  dhi: number // Diffuse Horizontal Irradiance (kWh/m2/day)
  tilt: number // Optimal tilt angle (degrees)
  azimuth: number // Optimal azimuth (degrees)
  capacityFactor: number // Expected capacity factor for PV
  source: string
  isFallback: boolean
}

/**
 * Wind resource data
 */
export interface WindResource {
  location: { lat: number; lon: number }
  windSpeed50m: number // Average wind speed at 50m (m/s)
  windSpeed80m: number // Average wind speed at 80m (m/s)
  windSpeed100m: number // Average wind speed at 100m (m/s)
  windPowerDensity: number // W/m2
  capacityFactor: number // Expected capacity factor for wind
  source: string
  isFallback: boolean
}

/**
 * Ambient conditions
 */
export interface AmbientConditions {
  location: { lat: number; lon: number }
  temperature: number // Average temperature (C)
  temperatureMin: number
  temperatureMax: number
  humidity: number // Relative humidity (%)
  pressure: number // Atmospheric pressure (kPa)
  elevation: number // meters
  source: string
  isFallback: boolean
}

/**
 * Embedded solar resource data for major regions
 * Source: NREL NSRDB TMY data
 */
const REGIONAL_SOLAR_DATA: Record<string, Partial<SolarResource>> = {
  'us-southwest': {
    ghi: 5.8,
    dni: 7.2,
    dhi: 1.4,
    tilt: 32,
    azimuth: 180,
    capacityFactor: 0.27,
  },
  'us-southeast': {
    ghi: 4.5,
    dni: 4.8,
    dhi: 1.5,
    tilt: 28,
    azimuth: 180,
    capacityFactor: 0.21,
  },
  'us-midwest': {
    ghi: 4.2,
    dni: 4.5,
    dhi: 1.4,
    tilt: 35,
    azimuth: 180,
    capacityFactor: 0.19,
  },
  'us-northeast': {
    ghi: 4.0,
    dni: 4.2,
    dhi: 1.3,
    tilt: 38,
    azimuth: 180,
    capacityFactor: 0.18,
  },
  'us-northwest': {
    ghi: 3.8,
    dni: 4.0,
    dhi: 1.2,
    tilt: 40,
    azimuth: 180,
    capacityFactor: 0.17,
  },
  'europe-south': {
    ghi: 5.2,
    dni: 5.5,
    dhi: 1.5,
    tilt: 30,
    azimuth: 180,
    capacityFactor: 0.24,
  },
  'europe-central': {
    ghi: 3.5,
    dni: 3.2,
    dhi: 1.2,
    tilt: 35,
    azimuth: 180,
    capacityFactor: 0.15,
  },
  'europe-north': {
    ghi: 2.8,
    dni: 2.5,
    dhi: 1.0,
    tilt: 45,
    azimuth: 180,
    capacityFactor: 0.12,
  },
  'middle-east': {
    ghi: 6.5,
    dni: 7.5,
    dhi: 1.6,
    tilt: 25,
    azimuth: 180,
    capacityFactor: 0.30,
  },
  'australia': {
    ghi: 5.5,
    dni: 6.0,
    dhi: 1.5,
    tilt: 30,
    azimuth: 0, // North-facing in southern hemisphere
    capacityFactor: 0.26,
  },
  'asia-tropical': {
    ghi: 4.8,
    dni: 4.5,
    dhi: 1.8,
    tilt: 15,
    azimuth: 180,
    capacityFactor: 0.22,
  },
  'default': {
    ghi: 4.5,
    dni: 4.5,
    dhi: 1.4,
    tilt: 30,
    azimuth: 180,
    capacityFactor: 0.20,
  },
}

/**
 * Embedded wind resource data for major regions
 * Source: Global Wind Atlas, NREL Wind Toolkit
 */
const REGIONAL_WIND_DATA: Record<string, Partial<WindResource>> = {
  'us-great-plains': {
    windSpeed50m: 7.5,
    windSpeed80m: 8.2,
    windSpeed100m: 8.6,
    windPowerDensity: 450,
    capacityFactor: 0.42,
  },
  'us-coastal': {
    windSpeed50m: 6.5,
    windSpeed80m: 7.2,
    windSpeed100m: 7.6,
    windPowerDensity: 380,
    capacityFactor: 0.35,
  },
  'us-offshore-atlantic': {
    windSpeed50m: 8.0,
    windSpeed80m: 8.8,
    windSpeed100m: 9.2,
    windPowerDensity: 550,
    capacityFactor: 0.48,
  },
  'europe-north-sea': {
    windSpeed50m: 9.0,
    windSpeed80m: 9.8,
    windSpeed100m: 10.2,
    windPowerDensity: 650,
    capacityFactor: 0.52,
  },
  'europe-onshore': {
    windSpeed50m: 6.0,
    windSpeed80m: 6.8,
    windSpeed100m: 7.2,
    windPowerDensity: 300,
    capacityFactor: 0.32,
  },
  'default': {
    windSpeed50m: 6.0,
    windSpeed80m: 6.8,
    windSpeed100m: 7.2,
    windPowerDensity: 300,
    capacityFactor: 0.30,
  },
}

/**
 * Cached data
 */
interface CachedData<T> {
  data: T
  timestamp: number
}

/**
 * Environmental Database class
 */
export class EnvironmentalDatabase {
  private nrelApiKey: string | null
  private cache: Map<string, CachedData<unknown>> = new Map()

  constructor() {
    this.nrelApiKey = process.env.NREL_API_KEY || null
  }

  /**
   * Get solar resource data for a location
   */
  async getSolarResource(
    lat: number,
    lon: number
  ): Promise<SolarResource> {
    const cacheKey = `solar:${lat.toFixed(2)}:${lon.toFixed(2)}`

    // Check cache
    const cached = this.cache.get(cacheKey) as CachedData<SolarResource> | undefined
    if (cached && Date.now() - cached.timestamp < CACHE_TTL.NSRDB_TMY) {
      return cached.data
    }

    // Try NREL API if available
    if (this.nrelApiKey) {
      try {
        const apiData = await this.fetchSolarFromNREL(lat, lon)
        if (apiData) {
          this.cache.set(cacheKey, { data: apiData, timestamp: Date.now() })
          return apiData
        }
      } catch (error) {
        console.warn('[EnvironmentalDatabase] NREL API failed:', error)
      }
    }

    // Use regional fallback data
    const region = this.getRegionForLocation(lat, lon)
    const regionalData = REGIONAL_SOLAR_DATA[region] || REGIONAL_SOLAR_DATA['default']

    const fallbackData: SolarResource = {
      location: { lat, lon },
      ghi: regionalData.ghi ?? 4.5,
      dni: regionalData.dni ?? 4.5,
      dhi: regionalData.dhi ?? 1.4,
      tilt: regionalData.tilt ?? Math.abs(lat),
      azimuth: regionalData.azimuth ?? (lat >= 0 ? 180 : 0),
      capacityFactor: regionalData.capacityFactor ?? 0.20,
      source: 'regional-fallback-data',
      isFallback: true,
    }

    this.cache.set(cacheKey, { data: fallbackData, timestamp: Date.now() })
    return fallbackData
  }

  /**
   * Get wind resource data for a location
   */
  async getWindResource(
    lat: number,
    lon: number,
    hubHeight: number = 80
  ): Promise<WindResource> {
    const cacheKey = `wind:${lat.toFixed(2)}:${lon.toFixed(2)}:${hubHeight}`

    // Check cache
    const cached = this.cache.get(cacheKey) as CachedData<WindResource> | undefined
    if (cached && Date.now() - cached.timestamp < CACHE_TTL.NSRDB_TMY) {
      return cached.data
    }

    // Use regional fallback data
    const region = this.getWindRegionForLocation(lat, lon)
    const regionalData = REGIONAL_WIND_DATA[region] || REGIONAL_WIND_DATA['default']

    // Interpolate wind speed for hub height
    let windSpeed: number
    if (hubHeight <= 50) {
      windSpeed = regionalData.windSpeed50m ?? 6.0
    } else if (hubHeight <= 80) {
      const ratio = (hubHeight - 50) / 30
      windSpeed = (regionalData.windSpeed50m ?? 6.0) +
        ratio * ((regionalData.windSpeed80m ?? 6.8) - (regionalData.windSpeed50m ?? 6.0))
    } else if (hubHeight <= 100) {
      const ratio = (hubHeight - 80) / 20
      windSpeed = (regionalData.windSpeed80m ?? 6.8) +
        ratio * ((regionalData.windSpeed100m ?? 7.2) - (regionalData.windSpeed80m ?? 6.8))
    } else {
      // Extrapolate using wind shear
      windSpeed = (regionalData.windSpeed100m ?? 7.2) *
        Math.pow(hubHeight / 100, 0.14)
    }

    const result: WindResource = {
      location: { lat, lon },
      windSpeed50m: regionalData.windSpeed50m ?? 6.0,
      windSpeed80m: regionalData.windSpeed80m ?? 6.8,
      windSpeed100m: regionalData.windSpeed100m ?? 7.2,
      windPowerDensity: regionalData.windPowerDensity ?? 300,
      capacityFactor: regionalData.capacityFactor ?? 0.30,
      source: 'regional-fallback-data',
      isFallback: true,
    }

    this.cache.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  }

  /**
   * Get ambient conditions for a location
   */
  async getAmbientConditions(
    lat: number,
    lon: number
  ): Promise<AmbientConditions> {
    // Estimate based on latitude and known climate patterns
    // More detailed data would come from weather APIs

    // Temperature estimation based on latitude
    const absLat = Math.abs(lat)
    let avgTemp: number
    if (absLat < 15) {
      avgTemp = 27 // Tropical
    } else if (absLat < 30) {
      avgTemp = 22 // Subtropical
    } else if (absLat < 45) {
      avgTemp = 15 // Temperate
    } else if (absLat < 60) {
      avgTemp = 8 // Cool temperate
    } else {
      avgTemp = 0 // Cold
    }

    return {
      location: { lat, lon },
      temperature: avgTemp,
      temperatureMin: avgTemp - 15,
      temperatureMax: avgTemp + 15,
      humidity: 60,
      pressure: 101.325, // Standard atmospheric pressure
      elevation: 0, // Would need elevation API
      source: 'latitude-estimation',
      isFallback: true,
    }
  }

  /**
   * Calculate optimal tilt angle for solar panels
   */
  calculateOptimalTilt(lat: number, mode: 'annual' | 'summer' | 'winter' = 'annual'): number {
    const absLat = Math.abs(lat)

    switch (mode) {
      case 'summer':
        return absLat - 15
      case 'winter':
        return absLat + 15
      case 'annual':
      default:
        return absLat
    }
  }

  /**
   * Check if NREL API is available
   */
  async isAPIAvailable(): Promise<boolean> {
    if (!this.nrelApiKey) return false

    try {
      const response = await fetch(
        `https://developer.nrel.gov/api/pvwatts/v6.json?api_key=${this.nrelApiKey}&system_capacity=1&lat=40&lon=-105&azimuth=180&tilt=30&array_type=0&module_type=0&losses=14`
      )
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getRegionForLocation(lat: number, lon: number): string {
    // US regions
    if (lat >= 25 && lat <= 50 && lon >= -130 && lon <= -65) {
      if (lat >= 35 && lon >= -115 && lon <= -100) return 'us-southwest'
      if (lat >= 25 && lat <= 35 && lon >= -100 && lon <= -75) return 'us-southeast'
      if (lat >= 35 && lat <= 50 && lon >= -105 && lon <= -85) return 'us-midwest'
      if (lat >= 38 && lon >= -80 && lon <= -65) return 'us-northeast'
      if (lat >= 40 && lon >= -130 && lon <= -115) return 'us-northwest'
    }

    // Europe
    if (lat >= 35 && lat <= 70 && lon >= -10 && lon <= 40) {
      if (lat >= 55) return 'europe-north'
      if (lat <= 45) return 'europe-south'
      return 'europe-central'
    }

    // Middle East
    if (lat >= 15 && lat <= 40 && lon >= 25 && lon <= 65) {
      return 'middle-east'
    }

    // Australia
    if (lat >= -45 && lat <= -10 && lon >= 110 && lon <= 155) {
      return 'australia'
    }

    // Tropical Asia
    if (lat >= -10 && lat <= 25 && lon >= 90 && lon <= 140) {
      return 'asia-tropical'
    }

    return 'default'
  }

  private getWindRegionForLocation(lat: number, lon: number): string {
    // US regions
    if (lat >= 25 && lat <= 50 && lon >= -130 && lon <= -65) {
      if (lat >= 35 && lat <= 50 && lon >= -105 && lon <= -90) return 'us-great-plains'
      if (lon >= -82 && lon <= -65) return 'us-coastal'
    }

    // North Sea
    if (lat >= 50 && lat <= 62 && lon >= -5 && lon <= 10) {
      return 'europe-north-sea'
    }

    // Europe onshore
    if (lat >= 35 && lat <= 70 && lon >= -10 && lon <= 40) {
      return 'europe-onshore'
    }

    return 'default'
  }

  private async fetchSolarFromNREL(
    lat: number,
    lon: number
  ): Promise<SolarResource | null> {
    if (!this.nrelApiKey) return null

    try {
      const url = new URL('https://developer.nrel.gov/api/pvwatts/v6.json')
      url.searchParams.set('api_key', this.nrelApiKey)
      url.searchParams.set('lat', String(lat))
      url.searchParams.set('lon', String(lon))
      url.searchParams.set('system_capacity', '1')
      url.searchParams.set('azimuth', '180')
      url.searchParams.set('tilt', String(Math.abs(lat)))
      url.searchParams.set('array_type', '0')
      url.searchParams.set('module_type', '0')
      url.searchParams.set('losses', '14')

      const response = await fetch(url.toString())
      if (!response.ok) return null

      const data = await response.json()

      if (data.outputs) {
        const outputs = data.outputs
        return {
          location: { lat, lon },
          ghi: outputs.solrad_annual / 365,
          dni: outputs.solrad_annual / 365 * 0.8, // Approximate
          dhi: outputs.solrad_annual / 365 * 0.2,
          tilt: Math.abs(lat),
          azimuth: lat >= 0 ? 180 : 0,
          capacityFactor: outputs.capacity_factor / 100,
          source: 'nrel-pvwatts-api',
          isFallback: false,
        }
      }

      return null
    } catch (error) {
      console.error('[EnvironmentalDatabase] PVWatts fetch error:', error)
      return null
    }
  }
}

/**
 * Singleton instance
 */
let dbInstance: EnvironmentalDatabase | null = null

export function getEnvironmentalDatabase(): EnvironmentalDatabase {
  if (!dbInstance) {
    dbInstance = new EnvironmentalDatabase()
  }
  return dbInstance
}

/**
 * Create new instance (for testing)
 */
export function createEnvironmentalDatabase(): EnvironmentalDatabase {
  return new EnvironmentalDatabase()
}
