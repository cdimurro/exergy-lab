/**
 * TEA (Techno-Economic Analysis) Types
 */

export interface TEAInput {
  // Project metadata
  project_name: string
  technology_type: TechnologyType

  // Capacity and production
  capacity_mw: number
  capacity_factor: number
  annual_production_mwh?: number

  // Capital costs
  capex_per_kw: number
  installation_factor: number
  land_cost: number
  grid_connection_cost: number

  // Operating costs
  opex_per_kw_year: number
  fixed_opex_annual: number
  variable_opex_per_mwh: number
  insurance_rate: number

  // Financial parameters
  project_lifetime_years: number
  discount_rate: number
  debt_ratio: number
  interest_rate: number
  tax_rate: number
  depreciation_years: number

  // Revenue assumptions
  electricity_price_per_mwh: number
  price_escalation_rate: number
  carbon_credit_per_ton: number
  carbon_intensity_avoided: number
}

export interface TEAResult {
  // Summary metrics
  lcoe: number
  npv: number
  irr: number
  payback_years: number

  // Cost breakdown
  total_capex: number
  annual_opex: number
  total_lifetime_cost: number

  // Production
  annual_production_mwh: number
  lifetime_production_mwh: number

  // Revenue
  annual_revenue: number
  lifetime_revenue_npv: number

  // Detailed breakdown
  capex_breakdown: CAPEXBreakdown
  opex_breakdown: OPEXBreakdown
  cash_flows: number[]
}

export interface CAPEXBreakdown {
  equipment: number
  installation: number
  land: number
  grid_connection: number
}

export interface OPEXBreakdown {
  capacity_based: number
  fixed: number
  variable: number
  insurance: number
}

export type TechnologyType =
  | 'solar'
  | 'wind'
  | 'offshore_wind'
  | 'hydrogen'
  | 'storage'
  | 'nuclear'
  | 'geothermal'
  | 'hydro'
  | 'biomass'
  | 'generic'

export interface TEATemplate {
  id: string
  name: string
  technology_type: TechnologyType
  capex_per_kw: number
  opex_per_kw_year: number
  capacity_factor: number
  lifetime_years: number
}

export interface Project {
  id: string
  name: string
  description?: string
  technology_type: TechnologyType
  status: ProjectStatus
  created_at: string
  updated_at: string
  tea_results?: TEAResult
}

export type ProjectStatus = 'draft' | 'analyzing' | 'complete' | 'archived'

export interface SensitivityAnalysis {
  parameter: string
  variations: number[]
  lcoe: number[]
  npv: number[]
}
