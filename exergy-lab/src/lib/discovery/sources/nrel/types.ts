/**
 * NREL API Types
 *
 * Type definitions for NREL's various APIs:
 * - NSRDB (National Solar Radiation Database)
 * - PVWatts (PV Performance Calculator)
 * - ATB (Annual Technology Baseline)
 */

/**
 * NSRDB Types (Solar Resource Data)
 */
export interface NSRDBRequest {
  lat: number
  lon: number
  year?: number | 'tmy' // Typical Meteorological Year
  interval?: 30 | 60 // Minutes
  utc?: boolean
  attributes?: NSRDBAttribute[]
  leapDay?: boolean
  email?: string
}

export type NSRDBAttribute =
  | 'ghi' // Global Horizontal Irradiance
  | 'dni' // Direct Normal Irradiance
  | 'dhi' // Diffuse Horizontal Irradiance
  | 'wind_speed'
  | 'wind_direction'
  | 'air_temperature'
  | 'solar_zenith_angle'
  | 'surface_albedo'
  | 'relative_humidity'
  | 'dew_point'
  | 'surface_pressure'
  | 'cloud_type'
  | 'fill_flag'

export interface NSRDBResponse {
  outputs: {
    avg_dni: number
    avg_ghi: number
    avg_lat_tilt: number
    avg_temperature: number
    city: string
    country: string
    elev: number
    lat: number
    lon: number
    state: string
    timezone: number
    timezone_city: string
    location_id: number
    data?: NSRDBDataPoint[]
  }
  errors?: string[]
  warnings?: string[]
  version: string
}

export interface NSRDBDataPoint {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  dni: number
  ghi: number
  dhi: number
  wind_speed?: number
  air_temperature?: number
}

/**
 * PVWatts Types (PV Performance Calculator)
 */
export interface PVWattsRequest {
  system_capacity: number // kW
  module_type: 0 | 1 | 2 // 0=Standard, 1=Premium, 2=Thin Film
  losses: number // System losses (%)
  array_type: 0 | 1 | 2 | 3 | 4 // 0=Fixed Open Rack, 1=Fixed Roof, 2=1-Axis, 3=1-Axis Backtrack, 4=2-Axis
  tilt: number // Degrees
  azimuth: number // Degrees
  lat?: number
  lon?: number
  address?: string
  dataset?: 'nsrdb' | 'tmy2' | 'tmy3' | 'intl'
  radius?: number // Search radius in miles
  timeframe?: 'monthly' | 'hourly'
  dc_ac_ratio?: number
  gcr?: number // Ground coverage ratio
  inv_eff?: number // Inverter efficiency (%)
  bifaciality?: number // Bifacial panel ratio
  albedo?: number // Ground reflectance
}

export interface PVWattsResponse {
  inputs: PVWattsRequest
  errors?: string[]
  warnings?: string[]
  version: string
  station_info: {
    lat: number
    lon: number
    elev: number
    tz: number
    location: string
    city: string
    state: string
    solar_resource_file: string
    distance: number
  }
  outputs: {
    ac_monthly: number[] // Monthly AC output (kWh)
    dc_monthly: number[] // Monthly DC output (kWh)
    poa_monthly: number[] // Monthly plane of array irradiance (kWh/m2)
    solrad_monthly: number[] // Monthly solar radiation (kWh/m2/day)
    ac_annual: number // Annual AC output (kWh)
    solrad_annual: number // Annual solar radiation (kWh/m2/day)
    capacity_factor: number // Capacity factor (%)
  }
}

/**
 * ATB Types (Annual Technology Baseline)
 */
export interface ATBRequest {
  technology?: ATBTechnology
  year?: number
  scenario?: 'conservative' | 'moderate' | 'advanced'
  financialCase?: 'r&d' | 'market'
}

export type ATBTechnology =
  | 'utility-scale-pv'
  | 'commercial-pv'
  | 'residential-pv'
  | 'land-based-wind'
  | 'offshore-wind'
  | 'battery-storage'
  | 'pumped-hydro'
  | 'geothermal'
  | 'biopower'
  | 'hydropower'
  | 'csp' // Concentrating Solar Power
  | 'nuclear'
  | 'natural-gas'
  | 'coal'

export interface ATBDataPoint {
  technology: ATBTechnology
  year: number
  scenario: string
  capex: number // Capital expenditure ($/kW)
  fixedOm: number // Fixed O&M ($/kW-yr)
  variableOm: number // Variable O&M ($/MWh)
  capacityFactor: number // (%)
  lcoe: number // Levelized Cost of Energy ($/MWh)
  heatRate?: number // BTU/kWh (for thermal)
  efficiency?: number // (%)
}

export interface ATBResponse {
  data: ATBDataPoint[]
  metadata: {
    atbYear: number
    lastUpdated: string
    version: string
  }
  errors?: string[]
}

/**
 * Utility Rates Types
 */
export interface UtilityRatesRequest {
  lat?: number
  lon?: number
  address?: string
  radius?: number // miles
}

export interface UtilityRatesResponse {
  outputs: {
    utility_name: string
    utility_info: Array<{
      utility_id: number
      utility_name: string
      state: string
      sector: string
      residential?: {
        avg_rate: number // $/kWh
        min_rate: number
        max_rate: number
      }
      commercial?: {
        avg_rate: number
        min_rate: number
        max_rate: number
      }
      industrial?: {
        avg_rate: number
        min_rate: number
        max_rate: number
      }
    }>
  }
  errors?: string[]
}

/**
 * Alt Fuel Stations Types
 */
export interface AltFuelStationsRequest {
  lat?: number
  lon?: number
  location?: string
  radius?: number // miles
  status?: 'all' | 'E' | 'P' | 'T' // E=Open, P=Planned, T=Temporarily Unavailable
  fuelType?: Array<'ELEC' | 'HY' | 'CNG' | 'LNG' | 'LPG' | 'BD' | 'E85'>
  evNetwork?: string[]
  evConnectorType?: string[]
  limit?: number
}

export interface FuelStation {
  id: number
  station_name: string
  street_address: string
  city: string
  state: string
  zip: string
  country: string
  latitude: number
  longitude: number
  fuel_type_code: string
  status_code: string
  access_code: string
  access_detail_code: string
  ev_network?: string
  ev_connector_types?: string[]
  ev_dc_fast_num?: number
  ev_level1_evse_num?: number
  ev_level2_evse_num?: number
  hy_is_retail?: boolean
  hy_status_link?: string
  distance?: number
  distance_km?: number
}

export interface AltFuelStationsResponse {
  station_locator_url: string
  total_results: number
  fuel_stations: FuelStation[]
  station_counts: {
    total: number
    fuels: Record<string, { total: number }>
  }
}

/**
 * Common NREL API error response
 */
export interface NRELErrorResponse {
  error: {
    code: string
    message: string
  }
}

/**
 * NREL Dataset metadata
 */
export interface NRELDatasetInfo {
  id: string
  name: string
  description: string
  apiEndpoint: string
  documentation: string
  attributes: string[]
  coverage: {
    spatial: string
    temporal: string
  }
  format: 'csv' | 'json' | 'hdf5'
  updateFrequency: string
}
