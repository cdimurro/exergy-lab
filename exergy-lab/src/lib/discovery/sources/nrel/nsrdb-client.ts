/**
 * NSRDB (National Solar Radiation Database) Client
 *
 * Provides access to NREL's solar resource data API.
 * Documentation: https://developer.nrel.gov/docs/solar/nsrdb/
 */

import {
  NSRDBRequest,
  NSRDBResponse,
  NSRDBAttribute,
  NRELErrorResponse,
} from './types'

const NSRDB_BASE_URL = 'https://developer.nrel.gov/api/nsrdb/v2/solar'

const DEFAULT_ATTRIBUTES: NSRDBAttribute[] = [
  'ghi',
  'dni',
  'dhi',
  'wind_speed',
  'air_temperature',
]

export interface NSRDBClientConfig {
  apiKey: string
  timeout?: number
}

export class NSRDBClient {
  private apiKey: string
  private timeout: number

  constructor(config: NSRDBClientConfig) {
    this.apiKey = config.apiKey
    this.timeout = config.timeout || 30000
  }

  /**
   * Get solar resource data for a specific location
   * Uses the PSM (Physical Solar Model) v3 dataset
   */
  async getSolarData(request: NSRDBRequest): Promise<NSRDBResponse> {
    const params = new URLSearchParams({
      api_key: this.apiKey,
      lat: request.lat.toString(),
      lon: request.lon.toString(),
      names: request.year?.toString() || 'tmy',
      interval: (request.interval || 60).toString(),
      utc: (request.utc ?? true).toString(),
      leap_day: (request.leapDay ?? false).toString(),
      attributes: (request.attributes || DEFAULT_ATTRIBUTES).join(','),
    })

    if (request.email) {
      params.append('email', request.email)
    }

    const url = `${NSRDB_BASE_URL}/psm3-download.json?${params.toString()}`

    const response = await this.fetchWithTimeout(url)

    if (!response.ok) {
      const errorData = await response.json() as NRELErrorResponse
      throw new Error(`NSRDB API error: ${errorData.error?.message || response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get TMY (Typical Meteorological Year) data
   * Simplified wrapper for common use case
   */
  async getTMYData(lat: number, lon: number): Promise<NSRDBResponse> {
    return this.getSolarData({
      lat,
      lon,
      year: 'tmy',
      interval: 60,
      attributes: DEFAULT_ATTRIBUTES,
    })
  }

  /**
   * Get historical solar data for a specific year
   */
  async getHistoricalData(
    lat: number,
    lon: number,
    year: number
  ): Promise<NSRDBResponse> {
    if (year < 1998 || year > new Date().getFullYear()) {
      throw new Error(`Year must be between 1998 and ${new Date().getFullYear()}`)
    }

    return this.getSolarData({
      lat,
      lon,
      year,
      interval: 60,
      attributes: DEFAULT_ATTRIBUTES,
    })
  }

  /**
   * Get average solar irradiance summary for a location
   * Returns simplified metrics useful for quick assessments
   */
  async getSolarSummary(lat: number, lon: number): Promise<{
    location: string
    avgDNI: number
    avgGHI: number
    avgTemperature: number
    elevation: number
    timezone: number
  }> {
    const response = await this.getTMYData(lat, lon)

    return {
      location: `${response.outputs.city}, ${response.outputs.state}`,
      avgDNI: response.outputs.avg_dni,
      avgGHI: response.outputs.avg_ghi,
      avgTemperature: response.outputs.avg_temperature,
      elevation: response.outputs.elev,
      timezone: response.outputs.timezone,
    }
  }

  /**
   * Search for datasets available at a location
   * Returns metadata about what data is available
   */
  async getAvailableDatasets(lat: number, lon: number): Promise<{
    datasets: Array<{
      name: string
      years: number[]
      resolution: string
      description: string
    }>
  }> {
    // Query the data catalog endpoint
    const params = new URLSearchParams({
      api_key: this.apiKey,
      lat: lat.toString(),
      lon: lon.toString(),
    })

    const url = `${NSRDB_BASE_URL}/data-query.json?${params.toString()}`
    const response = await this.fetchWithTimeout(url)

    if (!response.ok) {
      // Return default dataset info if query fails
      return {
        datasets: [
          {
            name: 'PSM v3',
            years: this.getAvailableYears(),
            resolution: '4km, 30-min',
            description: 'Physical Solar Model v3 - GOES satellite-derived solar data',
          },
          {
            name: 'TMY',
            years: [0], // TMY doesn't have specific years
            resolution: '4km, hourly',
            description: 'Typical Meteorological Year - representative year for PV modeling',
          },
        ],
      }
    }

    const data = await response.json()
    return data
  }

  /**
   * Get available years for historical data
   */
  private getAvailableYears(): number[] {
    const currentYear = new Date().getFullYear()
    const startYear = 1998
    const years: number[] = []
    // Data is typically available up to previous year
    for (let year = startYear; year <= currentYear - 1; year++) {
      years.push(year)
    }
    return years
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      })
      return response
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`NSRDB request timed out after ${this.timeout}ms`)
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

/**
 * Create NSRDB client with API key from environment
 */
export function createNSRDBClient(apiKey?: string): NSRDBClient {
  const key = apiKey || process.env.NREL_API_KEY
  if (!key) {
    throw new Error('NREL_API_KEY is required for NSRDB client')
  }
  return new NSRDBClient({ apiKey: key })
}
