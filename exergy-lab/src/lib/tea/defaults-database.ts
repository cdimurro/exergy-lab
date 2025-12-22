/**
 * Defaults Database for TEA
 *
 * Comprehensive default values for:
 * - Technology-specific templates
 * - Regional economic data
 * - Feedstock prices
 * - Utility costs
 * - Market prices
 * - Physical properties
 *
 * Reduces data entry burden while maintaining quality
 */

import type { TEAInput_v2, TechnologyType } from '@/types/tea'
import type { FeedstockSpecification } from '@/types/tea-process'

/**
 * Technology-specific default templates
 */
export const TECHNOLOGY_DEFAULTS: Record<TechnologyType, Partial<TEAInput_v2>> = {
  solar: {
    capacity_factor: 22,
    capex_per_kw: 1000,
    opex_per_kw_year: 15,
    installation_factor: 1.2,
    project_lifetime_years: 25,
    depreciation_years: 10,
    insurance_rate: 0.5,
  },
  wind: {
    capacity_factor: 35,
    capex_per_kw: 1500,
    opex_per_kw_year: 40,
    installation_factor: 1.3,
    project_lifetime_years: 25,
    depreciation_years: 10,
    insurance_rate: 0.6,
  },
  offshore_wind: {
    capacity_factor: 45,
    capex_per_kw: 4000,
    opex_per_kw_year: 100,
    installation_factor: 1.5,
    project_lifetime_years: 25,
    depreciation_years: 10,
    insurance_rate: 1.0,
  },
  hydrogen: {
    capacity_factor: 90,
    capex_per_kw: 1200,
    opex_per_kw_year: 30,
    installation_factor: 1.2,
    project_lifetime_years: 20,
    depreciation_years: 10,
    insurance_rate: 0.5,
  },
  storage: {
    capacity_factor: 25,
    capex_per_kw: 800,
    opex_per_kw_year: 10,
    installation_factor: 1.1,
    project_lifetime_years: 15,
    depreciation_years: 10,
    insurance_rate: 0.4,
  },
  nuclear: {
    capacity_factor: 90,
    capex_per_kw: 7000,
    opex_per_kw_year: 120,
    installation_factor: 1.6,
    project_lifetime_years: 60,
    depreciation_years: 20,
    insurance_rate: 1.5,
  },
  geothermal: {
    capacity_factor: 85,
    capex_per_kw: 3500,
    opex_per_kw_year: 150,
    installation_factor: 1.4,
    project_lifetime_years: 30,
    depreciation_years: 15,
    insurance_rate: 0.8,
  },
  hydro: {
    capacity_factor: 45,
    capex_per_kw: 2500,
    opex_per_kw_year: 25,
    installation_factor: 1.5,
    project_lifetime_years: 50,
    depreciation_years: 20,
    insurance_rate: 0.6,
  },
  biomass: {
    capacity_factor: 75,
    capex_per_kw: 4000,
    opex_per_kw_year: 200,
    installation_factor: 1.4,
    project_lifetime_years: 25,
    depreciation_years: 15,
    insurance_rate: 0.8,
  },
  generic: {
    capacity_factor: 50,
    capex_per_kw: 2000,
    opex_per_kw_year: 50,
    installation_factor: 1.2,
    project_lifetime_years: 25,
    depreciation_years: 10,
    insurance_rate: 0.5,
  },
}

/**
 * Feedstock price database (2024 USD)
 */
export const FEEDSTOCK_PRICES: Record<string, FeedstockSpecification> = {
  PFAD: {
    name: 'Palm Fatty Acid Distillate',
    type: 'biomass',
    composition: { moisture: 0.2, ash: 0.1, volatiles: 85, fixedCarbon: 5 },
    heatingValue: { lhv: 37, hhv: 39, lhvBtu: 15900 },
    cost: { value: 730, unit: 'USD/t', basis: '2024 market price', source: 'Commodity3.com' },
  },
  'Palm-EFB': {
    name: 'Empty Fruit Bunches',
    type: 'biomass',
    composition: { moisture: 65, ash: 2.5, volatiles: 70, fixedCarbon: 15 },
    heatingValue: { lhv: 16, hhv: 18 },
    cost: { value: 9, unit: 'USD/t', basis: '2017 Malaysia', source: 'Lim et al. 2022' },
  },
  MSW: {
    name: 'Municipal Solid Waste',
    type: 'waste',
    composition: { moisture: 30, ash: 15, volatiles: 50, fixedCarbon: 5 },
    heatingValue: { lhv: 12, hhv: 14 },
    cost: { value: -16, unit: 'USD/t', basis: 'Gate fee (revenue)', source: 'Rangga 2022' },
  },
}

/**
 * Utility cost database by region (2024)
 */
export const UTILITY_COSTS = {
  electricity: {
    'US-National': 80, // $/MWh industrial
    'Europe-Western': 150,
    'Asia-Southeast': 90,
    'Asia-China': 70,
    'Latin-America': 85,
  },
  naturalGas: {
    'US-National': 5.0, // $/MMBtu
    'Europe-Western': 12.0,
    'Asia-Southeast': 8.5,
    'Asia-China': 9.0,
  },
  water: {
    'US-National': 2.0, // $/m³
    'Global-Average': 1.5,
  },
}

/**
 * Get defaults for a technology and region
 */
export function getTechnologyDefaults(
  technology: TechnologyType,
  region: string = 'US-National'
): Partial<TEAInput_v2> {
  const techDefaults = TECHNOLOGY_DEFAULTS[technology]
  const electricityPrice = UTILITY_COSTS.electricity[region as keyof typeof UTILITY_COSTS.electricity] || 80

  return {
    ...techDefaults,
    technology_type: technology,
    electricity_price_per_mwh: electricityPrice,
    discount_rate: 8,
    tax_rate: 25,
    debt_ratio: 0.6,
    interest_rate: 6,
  }
}
