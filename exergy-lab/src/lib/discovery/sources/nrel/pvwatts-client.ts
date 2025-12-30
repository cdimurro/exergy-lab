/**
 * PVWatts Client
 *
 * Provides access to NREL's PVWatts API for PV system performance estimation.
 * Documentation: https://developer.nrel.gov/docs/solar/pvwatts/
 */

import {
  PVWattsRequest,
  PVWattsResponse,
  NRELErrorResponse,
} from './types'

const PVWATTS_BASE_URL = 'https://developer.nrel.gov/api/pvwatts/v8'

/**
 * Default system configuration for quick estimates
 */
const DEFAULT_SYSTEM: Partial<PVWattsRequest> = {
  system_capacity: 4, // 4 kW residential
  module_type: 0, // Standard
  losses: 14, // 14% total losses
  array_type: 1, // Fixed roof mount
  tilt: 20, // 20 degree tilt
  azimuth: 180, // South-facing
  dc_ac_ratio: 1.2,
  inv_eff: 96,
}

export interface PVWattsClientConfig {
  apiKey: string
  timeout?: number
}

export class PVWattsClient {
  private apiKey: string
  private timeout: number

  constructor(config: PVWattsClientConfig) {
    this.apiKey = config.apiKey
    this.timeout = config.timeout || 30000
  }

  /**
   * Calculate PV system performance
   */
  async calculate(request: PVWattsRequest): Promise<PVWattsResponse> {
    const params = new URLSearchParams({
      api_key: this.apiKey,
      system_capacity: request.system_capacity.toString(),
      module_type: request.module_type.toString(),
      losses: request.losses.toString(),
      array_type: request.array_type.toString(),
      tilt: request.tilt.toString(),
      azimuth: request.azimuth.toString(),
    })

    // Add location - either lat/lon or address
    if (request.lat !== undefined && request.lon !== undefined) {
      params.append('lat', request.lat.toString())
      params.append('lon', request.lon.toString())
    } else if (request.address) {
      params.append('address', request.address)
    } else {
      throw new Error('Either lat/lon or address is required')
    }

    // Optional parameters
    if (request.dataset) params.append('dataset', request.dataset)
    if (request.radius) params.append('radius', request.radius.toString())
    if (request.timeframe) params.append('timeframe', request.timeframe)
    if (request.dc_ac_ratio) params.append('dc_ac_ratio', request.dc_ac_ratio.toString())
    if (request.gcr) params.append('gcr', request.gcr.toString())
    if (request.inv_eff) params.append('inv_eff', request.inv_eff.toString())
    if (request.bifaciality) params.append('bifaciality', request.bifaciality.toString())
    if (request.albedo) params.append('albedo', request.albedo.toString())

    const url = `${PVWATTS_BASE_URL}.json?${params.toString()}`

    const response = await this.fetchWithTimeout(url)

    if (!response.ok) {
      const errorData = await response.json() as NRELErrorResponse
      throw new Error(`PVWatts API error: ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json() as PVWattsResponse

    // Check for API-level errors
    if (data.errors && data.errors.length > 0) {
      throw new Error(`PVWatts error: ${data.errors.join(', ')}`)
    }

    return data
  }

  /**
   * Quick estimate for residential PV system
   */
  async estimateResidential(
    lat: number,
    lon: number,
    systemSizeKW: number = 6
  ): Promise<{
    annualProduction: number
    capacityFactor: number
    monthlyProduction: number[]
    location: string
    systemSize: number
  }> {
    const result = await this.calculate({
      ...DEFAULT_SYSTEM,
      lat,
      lon,
      system_capacity: systemSizeKW,
      array_type: 1, // Roof mount
    } as PVWattsRequest)

    return {
      annualProduction: result.outputs.ac_annual,
      capacityFactor: result.outputs.capacity_factor,
      monthlyProduction: result.outputs.ac_monthly,
      location: `${result.station_info.city}, ${result.station_info.state}`,
      systemSize: systemSizeKW,
    }
  }

  /**
   * Quick estimate for utility-scale PV system
   */
  async estimateUtilityScale(
    lat: number,
    lon: number,
    systemSizeMW: number = 10
  ): Promise<{
    annualProduction: number
    capacityFactor: number
    monthlyProduction: number[]
    location: string
    systemSize: number
    specificYield: number
  }> {
    const systemSizeKW = systemSizeMW * 1000

    const result = await this.calculate({
      ...DEFAULT_SYSTEM,
      lat,
      lon,
      system_capacity: systemSizeKW,
      array_type: 2, // Single-axis tracking
      tilt: 0, // Tracking systems use 0 tilt
      dc_ac_ratio: 1.3,
      losses: 12,
    } as PVWattsRequest)

    return {
      annualProduction: result.outputs.ac_annual,
      capacityFactor: result.outputs.capacity_factor,
      monthlyProduction: result.outputs.ac_monthly,
      location: `${result.station_info.city}, ${result.station_info.state}`,
      systemSize: systemSizeMW,
      specificYield: result.outputs.ac_annual / systemSizeKW, // kWh/kWp
    }
  }

  /**
   * Compare different array configurations
   */
  async compareConfigurations(
    lat: number,
    lon: number,
    systemSizeKW: number
  ): Promise<{
    fixedTilt: { production: number; capacityFactor: number }
    singleAxis: { production: number; capacityFactor: number }
    dualAxis: { production: number; capacityFactor: number }
    recommendation: string
  }> {
    const baseConfig: PVWattsRequest = {
      ...DEFAULT_SYSTEM,
      lat,
      lon,
      system_capacity: systemSizeKW,
    } as PVWattsRequest

    // Fixed tilt (optimal angle)
    const fixedResult = await this.calculate({
      ...baseConfig,
      array_type: 0, // Fixed open rack
      tilt: Math.abs(lat), // Optimal tilt = latitude
    })

    // Single-axis tracking
    const singleAxisResult = await this.calculate({
      ...baseConfig,
      array_type: 2, // Single-axis
      tilt: 0,
    })

    // Dual-axis tracking
    const dualAxisResult = await this.calculate({
      ...baseConfig,
      array_type: 4, // Dual-axis
      tilt: 0,
    })

    const fixedCF = fixedResult.outputs.capacity_factor
    const singleCF = singleAxisResult.outputs.capacity_factor
    const dualCF = dualAxisResult.outputs.capacity_factor

    // Determine recommendation based on improvement
    let recommendation: string
    const singleImprovement = ((singleCF - fixedCF) / fixedCF) * 100
    const dualImprovement = ((dualCF - fixedCF) / fixedCF) * 100

    if (dualImprovement > 30) {
      recommendation = `Dual-axis tracking recommended (+${dualImprovement.toFixed(1)}% vs fixed)`
    } else if (singleImprovement > 15) {
      recommendation = `Single-axis tracking recommended (+${singleImprovement.toFixed(1)}% vs fixed)`
    } else {
      recommendation = `Fixed tilt recommended for this location (tracking gains < 15%)`
    }

    return {
      fixedTilt: {
        production: fixedResult.outputs.ac_annual,
        capacityFactor: fixedCF,
      },
      singleAxis: {
        production: singleAxisResult.outputs.ac_annual,
        capacityFactor: singleCF,
      },
      dualAxis: {
        production: dualAxisResult.outputs.ac_annual,
        capacityFactor: dualCF,
      },
      recommendation,
    }
  }

  /**
   * Get hourly production profile
   */
  async getHourlyProfile(
    lat: number,
    lon: number,
    systemSizeKW: number
  ): Promise<PVWattsResponse> {
    return this.calculate({
      ...DEFAULT_SYSTEM,
      lat,
      lon,
      system_capacity: systemSizeKW,
      timeframe: 'hourly',
    } as PVWattsRequest)
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
        throw new Error(`PVWatts request timed out after ${this.timeout}ms`)
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

/**
 * Create PVWatts client with API key from environment
 */
export function createPVWattsClient(apiKey?: string): PVWattsClient {
  const key = apiKey || process.env.NREL_API_KEY
  if (!key) {
    throw new Error('NREL_API_KEY is required for PVWatts client')
  }
  return new PVWattsClient({ apiKey: key })
}
