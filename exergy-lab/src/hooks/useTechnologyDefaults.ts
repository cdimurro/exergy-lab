import { useCallback } from 'react'
import type { TechnologyType, TEAInput_v2 } from '@/types/tea'

export interface TechnologyDefaults {
  capex_per_kw: number
  opex_per_kw_year: number
  capacity_factor: number
  project_lifetime_years: number
  degradation_rate?: number
  specificFields?: Record<string, any>
}

// Default values for each technology type
const TECHNOLOGY_DEFAULTS_MAP: Record<TechnologyType, TechnologyDefaults> = {
  solar: {
    capex_per_kw: 950,
    opex_per_kw_year: 15,
    capacity_factor: 24.5,
    project_lifetime_years: 30,
    degradation_rate: 0.5,
    specificFields: {
      module_efficiency: 24,
      performance_ratio: 85,
      irradiance: 5.2,
      shading_loss: 5,
      inverter_efficiency: 98,
    },
  },
  wind: {
    capex_per_kw: 1300,
    opex_per_kw_year: 45,
    capacity_factor: 35,
    project_lifetime_years: 25,
    specificFields: {
      hub_height: 100,
      rotor_diameter: 120,
      wind_speed: 7.5,
      air_density: 1.225,
      wake_loss: 5,
    },
  },
  offshore_wind: {
    capex_per_kw: 4500,
    opex_per_kw_year: 130,
    capacity_factor: 45,
    project_lifetime_years: 25,
    specificFields: {
      water_depth: 30,
      distance_to_shore: 20,
      foundation_type: 'monopile',
    },
  },
  hydrogen: {
    capex_per_kw: 1100,
    opex_per_kw_year: 30,
    capacity_factor: 90,
    project_lifetime_years: 20,
    specificFields: {
      electrolyzer_type: 'PEM',
      stack_efficiency: 65,
      current_density: 1.5,
      h2_purity: 99.95,
      compression_stages: 3,
      target_pressure: 350,
    },
  },
  storage: {
    capex_per_kw: 300,
    opex_per_kw_year: 10,
    capacity_factor: 85,
    project_lifetime_years: 15,
    degradation_rate: 2.0,
    specificFields: {
      cell_chemistry: 'Li-ion NMC',
      cycle_life: 5000,
      depth_of_discharge: 90,
      roundtrip_efficiency: 90,
      self_discharge_rate: 0.1,
    },
  },
  nuclear: {
    capex_per_kw: 6000,
    opex_per_kw_year: 95,
    capacity_factor: 92,
    project_lifetime_years: 60,
    specificFields: {
      reactor_type: 'PWR',
      fuel_cycle_length: 18,
      burnup: 45000,
    },
  },
  geothermal: {
    capex_per_kw: 4000,
    opex_per_kw_year: 150,
    capacity_factor: 90,
    project_lifetime_years: 30,
    specificFields: {
      resource_temperature: 200,
      flow_rate: 500,
      reinjection_rate: 100,
    },
  },
  hydro: {
    capex_per_kw: 2500,
    opex_per_kw_year: 40,
    capacity_factor: 52,
    project_lifetime_years: 50,
    specificFields: {
      head_height: 50,
      turbine_efficiency: 90,
      flow_rate: 100,
    },
  },
  biomass: {
    capex_per_kw: 3500,
    opex_per_kw_year: 100,
    capacity_factor: 85,
    project_lifetime_years: 25,
    specificFields: {
      feedstock_type: 'wood_chips',
      moisture_content: 30,
      heating_value: 16,
    },
  },
  generic: {
    capex_per_kw: 1000,
    opex_per_kw_year: 20,
    capacity_factor: 50,
    project_lifetime_years: 25,
  },
}

export interface UseTechnologyDefaultsReturn {
  getDefaults: (techType: TechnologyType) => Partial<TEAInput_v2>
  hasDefaults: (techType: TechnologyType) => boolean
  getDefaultValue: (techType: TechnologyType, field: string) => any
  getAllDefaults: () => Record<TechnologyType, TechnologyDefaults>
}

export function useTechnologyDefaults(): UseTechnologyDefaultsReturn {
  const getDefaults = useCallback((techType: TechnologyType): Partial<TEAInput_v2> => {
    const defaults = TECHNOLOGY_DEFAULTS_MAP[techType]

    if (!defaults) {
      return {}
    }

    // Convert to TEAInput_v2 format
    const teaDefaults: Partial<TEAInput_v2> = {
      technology_type: techType,
      capex_per_kw: defaults.capex_per_kw,
      opex_per_kw_year: defaults.opex_per_kw_year,
      capacity_factor: defaults.capacity_factor,
      project_lifetime_years: defaults.project_lifetime_years,
    }

    // Add technology-specific fields if available
    if (defaults.specificFields) {
      Object.assign(teaDefaults, defaults.specificFields)
    }

    return teaDefaults
  }, [])

  const hasDefaults = useCallback((techType: TechnologyType): boolean => {
    return techType in TECHNOLOGY_DEFAULTS_MAP
  }, [])

  const getDefaultValue = useCallback((techType: TechnologyType, field: string): any => {
    const defaults = TECHNOLOGY_DEFAULTS_MAP[techType]
    if (!defaults) return undefined

    // Check main defaults
    if (field in defaults) {
      return defaults[field as keyof TechnologyDefaults]
    }

    // Check specific fields
    if (defaults.specificFields && field in defaults.specificFields) {
      return defaults.specificFields[field]
    }

    return undefined
  }, [])

  const getAllDefaults = useCallback(() => {
    return TECHNOLOGY_DEFAULTS_MAP
  }, [])

  return {
    getDefaults,
    hasDefaults,
    getDefaultValue,
    getAllDefaults,
  }
}
