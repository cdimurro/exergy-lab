// Applied Exergy Types
// Based on Global-Energy-Services-Tracker three-tier framework

// Energy tier view type
export type EnergyTier = 'primary' | 'useful' | 'applied'

// Timeseries metadata
export interface ExergyTimeseriesMetadata {
  generated_at: string
  version: string
  description: string
  sources: string[]
  methodology: string
  unit: string
  validation: string
}

// Per-source exergy values
export interface SourcesServicesEJ {
  oil: number
  gas: number
  coal: number
  nuclear: number
  hydro: number
  wind: number
  solar: number
  biomass: number
  geothermal: number
}

// Yearly data point
export interface YearlyExergyData {
  year: number
  total_services_ej: number
  global_exergy_efficiency: number
  sources_services_ej: SourcesServicesEJ
  fossil_services_ej: number
  clean_services_ej: number
  fossil_services_share_percent: number
  clean_services_share_percent: number
}

// Full timeseries response
export interface AppliedExergyTimeseries {
  metadata: ExergyTimeseriesMetadata
  data: YearlyExergyData[]
}

// Exergy quality factor definition
export interface ExergyQualityFactor {
  factor: number
  description: string
  examples: string[]
}

// Exergy factors by sector
export interface ExergyFactorsSectoral {
  metadata: {
    description: string
    methodology: string
    sources: string[]
    key_insight: string
    last_updated: string
    version: string
  }
  exergy_quality_factors: {
    mechanical_work: ExergyQualityFactor
    electricity: ExergyQualityFactor
    high_temp_process_heat: ExergyQualityFactor
    medium_temp_process_heat: ExergyQualityFactor
    low_temp_space_heating: ExergyQualityFactor
    cooling: ExergyQualityFactor
  }
  notes: Record<string, string>
}

// Chart data point (flexible for different views)
export interface ChartDataPoint {
  year: string
  [key: string]: string | number
}

// Three-tier comparison for a single year
export interface ThreeTierComparison {
  year: string
  primary: number
  useful: number
  applied: number
  efficiency: number // primary -> applied efficiency %
}

// Source-weighted exergy factors (from source_sector_allocation.json)
export const SOURCE_EXERGY_FACTORS: Record<string, number> = {
  coal: 0.78,
  oil: 0.77,
  gas: 0.48,
  nuclear: 1.0,
  hydro: 1.0,
  wind: 1.0,
  solar: 0.95,
  biomass: 0.31,
  geothermal: 0.51,
}

// Conversion efficiency factors (primary -> useful)
export const EFFICIENCY_FACTORS: Record<string, number> = {
  coal: 0.45,
  oil: 0.35,
  gas: 0.65,
  nuclear: 0.33,
  hydro: 0.90,
  wind: 1.00,
  solar: 0.85,
  biomass: 0.50,
  geothermal: 0.65,
}

// Task exergy factors (strict Carnot)
export const TASK_EXERGY_FACTORS = {
  mechanical_work: 1.0,
  electricity: 1.0,
  high_temp_process_heat: 0.6,
  medium_temp_process_heat: 0.4,
  low_temp_space_heating: 0.07, // Strict Carnot per Brockway et al. 2019
  cooling: 0.3,
}
