/**
 * Device-Level Exergy Profiles
 *
 * Pre-defined exergy characteristics for 13+ clean energy technologies.
 * Data sourced from peer-reviewed literature and national lab studies.
 *
 * Key data sources:
 * - NREL Annual Technology Baseline (ATB) 2024
 * - IEA Technology Reports (Wind, Solar, Heat Pumps)
 * - DOE Office of Energy Efficiency and Renewable Energy
 * - EIA Power Plant Characteristics Database
 * - IRENA Renewable Energy Statistics
 */

import type { DeviceExergyProfile } from './types'

// ============================================================================
// Technology Profiles Database
// ============================================================================

export const DEVICE_EXERGY_PROFILES: Record<string, DeviceExergyProfile> = {
  // =========================================================================
  // SOLAR TECHNOLOGIES
  // =========================================================================

  'solar-pv': {
    technologyType: 'solar-pv',
    displayName: 'Solar Photovoltaic',
    firstLawEfficiency: 0.22,
    secondLawEfficiency: 0.18,
    inputEnergyType: 'high-temp-heat',
    outputEnergyType: 'electricity',
    fossilEquivalent: {
      technology: 'Natural Gas Combined Cycle',
      secondLawEfficiency: 0.55,
    },
    dataSource: 'NREL ATB 2024; Petela exergy of solar radiation model',
    confidenceLevel: 'high',
    notes: 'Second-law efficiency accounts for spectral and thermodynamic losses. Solar radiation modeled at ~5800K equivalent blackbody.',
  },

  'solar-csp': {
    technologyType: 'solar-csp',
    displayName: 'Concentrated Solar Power',
    firstLawEfficiency: 0.25,
    secondLawEfficiency: 0.22,
    inputEnergyType: 'high-temp-heat',
    outputEnergyType: 'electricity',
    temperatureRange: { hot: 823, cold: 300 }, // 550C receiver
    fossilEquivalent: {
      technology: 'Natural Gas Combined Cycle',
      secondLawEfficiency: 0.55,
    },
    dataSource: 'NREL CSP Technology Reports 2023',
    confidenceLevel: 'high',
    notes: 'Includes thermal storage. Higher temperatures improve Carnot efficiency.',
  },

  // =========================================================================
  // WIND TECHNOLOGIES
  // =========================================================================

  'wind-onshore': {
    technologyType: 'wind-onshore',
    displayName: 'Onshore Wind',
    firstLawEfficiency: 0.45,
    secondLawEfficiency: 0.42,
    inputEnergyType: 'mechanical-work',
    outputEnergyType: 'electricity',
    fossilEquivalent: {
      technology: 'Natural Gas Peaker',
      secondLawEfficiency: 0.35,
    },
    dataSource: 'IEA Wind Technology Report 2023; Betz limit analysis',
    confidenceLevel: 'high',
    notes: 'Betz theoretical limit is 59.3%. Modern turbines achieve ~45% of wind kinetic energy.',
  },

  'wind-offshore': {
    technologyType: 'wind-offshore',
    displayName: 'Offshore Wind',
    firstLawEfficiency: 0.50,
    secondLawEfficiency: 0.47,
    inputEnergyType: 'mechanical-work',
    outputEnergyType: 'electricity',
    fossilEquivalent: {
      technology: 'Natural Gas Peaker',
      secondLawEfficiency: 0.35,
    },
    dataSource: 'IEA Offshore Wind Outlook 2023',
    confidenceLevel: 'high',
    notes: 'Higher capacity factors due to stronger, more consistent offshore winds.',
  },

  // =========================================================================
  // HYDRO & OCEAN
  // =========================================================================

  'hydro': {
    technologyType: 'hydro',
    displayName: 'Hydroelectric',
    firstLawEfficiency: 0.90,
    secondLawEfficiency: 0.88,
    inputEnergyType: 'mechanical-work',
    outputEnergyType: 'electricity',
    fossilEquivalent: {
      technology: 'Natural Gas Combined Cycle',
      secondLawEfficiency: 0.55,
    },
    dataSource: 'IEA Hydropower Special Report 2021',
    confidenceLevel: 'high',
    notes: 'Gravitational potential to electricity. Highest exergy efficiency of all power sources.',
  },

  'tidal': {
    technologyType: 'tidal',
    displayName: 'Tidal Power',
    firstLawEfficiency: 0.35,
    secondLawEfficiency: 0.32,
    inputEnergyType: 'mechanical-work',
    outputEnergyType: 'electricity',
    fossilEquivalent: {
      technology: 'Natural Gas Peaker',
      secondLawEfficiency: 0.35,
    },
    dataSource: 'Ocean Energy Europe Technology Reports',
    confidenceLevel: 'medium',
    notes: 'Emerging technology with significant improvement potential.',
  },

  // =========================================================================
  // GEOTHERMAL
  // =========================================================================

  'geothermal': {
    technologyType: 'geothermal',
    displayName: 'Geothermal Power',
    firstLawEfficiency: 0.12,
    secondLawEfficiency: 0.45,
    inputEnergyType: 'medium-temp-heat',
    outputEnergyType: 'electricity',
    temperatureRange: { hot: 473, cold: 300 }, // 200C reservoir
    fossilEquivalent: {
      technology: 'Coal Steam Turbine',
      secondLawEfficiency: 0.40,
    },
    dataSource: 'DOE GeoVision Report 2019',
    confidenceLevel: 'medium',
    notes: 'Low first-law efficiency due to Carnot limitations at moderate temperatures. High second-law efficiency relative to available exergy.',
  },

  'geothermal-egs': {
    technologyType: 'geothermal-egs',
    displayName: 'Enhanced Geothermal Systems',
    firstLawEfficiency: 0.15,
    secondLawEfficiency: 0.50,
    inputEnergyType: 'medium-temp-heat',
    outputEnergyType: 'electricity',
    temperatureRange: { hot: 523, cold: 300 }, // 250C enhanced
    fossilEquivalent: {
      technology: 'Coal Steam Turbine',
      secondLawEfficiency: 0.40,
    },
    dataSource: 'DOE FORGE Project Reports',
    confidenceLevel: 'medium',
    notes: 'Higher temperatures from engineered reservoirs improve performance.',
  },

  // =========================================================================
  // NUCLEAR
  // =========================================================================

  'nuclear': {
    technologyType: 'nuclear',
    displayName: 'Nuclear Power',
    firstLawEfficiency: 0.33,
    secondLawEfficiency: 0.48,
    inputEnergyType: 'chemical',
    outputEnergyType: 'electricity',
    temperatureRange: { hot: 600, cold: 300 },
    fossilEquivalent: {
      technology: 'Coal Steam Turbine',
      secondLawEfficiency: 0.40,
    },
    dataSource: 'IAEA Nuclear Energy Series; NRC Plant Data',
    confidenceLevel: 'high',
    notes: 'Chemical exergy of nuclear fuel. Limited by Rankine cycle temperatures.',
  },

  'nuclear-smr': {
    technologyType: 'nuclear-smr',
    displayName: 'Small Modular Reactor',
    firstLawEfficiency: 0.31,
    secondLawEfficiency: 0.45,
    inputEnergyType: 'chemical',
    outputEnergyType: 'electricity',
    temperatureRange: { hot: 573, cold: 300 },
    fossilEquivalent: {
      technology: 'Coal Steam Turbine',
      secondLawEfficiency: 0.40,
    },
    dataSource: 'NRC SMR Design Certifications; DOE Advanced Reactor Program',
    confidenceLevel: 'medium',
    notes: 'Slightly lower efficiency due to smaller scale, but improved safety profile.',
  },

  // =========================================================================
  // BIOMASS & BIOENERGY
  // =========================================================================

  'biomass': {
    technologyType: 'biomass',
    displayName: 'Biomass Power',
    firstLawEfficiency: 0.25,
    secondLawEfficiency: 0.22,
    inputEnergyType: 'chemical',
    outputEnergyType: 'electricity',
    fossilEquivalent: {
      technology: 'Coal Steam Turbine',
      secondLawEfficiency: 0.40,
    },
    dataSource: 'NREL Biomass Assessment 2023',
    confidenceLevel: 'medium',
    notes: 'Lower heating value basis. Varies significantly by feedstock moisture content.',
  },

  'biogas': {
    technologyType: 'biogas',
    displayName: 'Biogas/Anaerobic Digestion',
    firstLawEfficiency: 0.35,
    secondLawEfficiency: 0.32,
    inputEnergyType: 'chemical',
    outputEnergyType: 'electricity',
    fossilEquivalent: {
      technology: 'Natural Gas Peaker',
      secondLawEfficiency: 0.35,
    },
    dataSource: 'EPA AgSTAR Program Data',
    confidenceLevel: 'medium',
    notes: 'Combined heat and power applications can improve overall efficiency.',
  },

  // =========================================================================
  // FOSSIL FUEL REFERENCE (for comparisons)
  // =========================================================================

  'ccgt': {
    technologyType: 'ccgt',
    displayName: 'Combined Cycle Gas Turbine',
    firstLawEfficiency: 0.60,
    secondLawEfficiency: 0.55,
    inputEnergyType: 'chemical',
    outputEnergyType: 'electricity',
    fossilEquivalent: {
      technology: 'Simple Cycle Gas Turbine',
      secondLawEfficiency: 0.35,
    },
    dataSource: 'EIA Power Plant Characteristics 2023',
    confidenceLevel: 'high',
    notes: 'Best-in-class fossil fuel efficiency. Used as benchmark for clean alternatives.',
  },

  'coal': {
    technologyType: 'coal',
    displayName: 'Coal Steam Turbine',
    firstLawEfficiency: 0.38,
    secondLawEfficiency: 0.40,
    inputEnergyType: 'chemical',
    outputEnergyType: 'electricity',
    fossilEquivalent: {
      technology: 'Coal Steam Turbine',
      secondLawEfficiency: 0.40,
    },
    dataSource: 'EIA Power Plant Characteristics 2023',
    confidenceLevel: 'high',
    notes: 'Subcritical coal plant. Supercritical plants achieve ~42% first-law efficiency.',
  },

  'natural-gas-peaker': {
    technologyType: 'natural-gas-peaker',
    displayName: 'Natural Gas Peaker',
    firstLawEfficiency: 0.38,
    secondLawEfficiency: 0.35,
    inputEnergyType: 'chemical',
    outputEnergyType: 'electricity',
    fossilEquivalent: {
      technology: 'Natural Gas Peaker',
      secondLawEfficiency: 0.35,
    },
    dataSource: 'EIA Power Plant Characteristics 2023',
    confidenceLevel: 'high',
    notes: 'Simple cycle gas turbine. Fast-ramping but lower efficiency than CCGT.',
  },

  // =========================================================================
  // ENERGY STORAGE
  // =========================================================================

  'battery-storage': {
    technologyType: 'battery-storage',
    displayName: 'Li-ion Battery Storage',
    firstLawEfficiency: 0.90,
    secondLawEfficiency: 0.88,
    inputEnergyType: 'electricity',
    outputEnergyType: 'electricity',
    fossilEquivalent: {
      technology: 'Natural Gas Peaker',
      secondLawEfficiency: 0.35,
    },
    dataSource: 'NREL Energy Storage Cost and Performance 2023',
    confidenceLevel: 'high',
    notes: 'Round-trip efficiency. Minor exergy losses to heat during charge/discharge.',
  },

  'pumped-hydro': {
    technologyType: 'pumped-hydro',
    displayName: 'Pumped Hydro Storage',
    firstLawEfficiency: 0.80,
    secondLawEfficiency: 0.78,
    inputEnergyType: 'electricity',
    outputEnergyType: 'electricity',
    fossilEquivalent: {
      technology: 'Natural Gas Peaker',
      secondLawEfficiency: 0.35,
    },
    dataSource: 'DOE Pumped Storage Hydropower Resource Assessment',
    confidenceLevel: 'high',
    notes: 'Mature technology with long operational history.',
  },

  'hydrogen-storage': {
    technologyType: 'hydrogen-storage',
    displayName: 'Hydrogen Storage (Round-trip)',
    firstLawEfficiency: 0.40,
    secondLawEfficiency: 0.38,
    inputEnergyType: 'electricity',
    outputEnergyType: 'electricity',
    fossilEquivalent: {
      technology: 'Natural Gas Peaker',
      secondLawEfficiency: 0.35,
    },
    dataSource: 'IRENA Green Hydrogen Cost Reduction 2023',
    confidenceLevel: 'medium',
    notes: 'Includes electrolysis, storage, and fuel cell reconversion losses.',
  },

  // =========================================================================
  // ENERGY CONVERSION
  // =========================================================================

  'heat-pump': {
    technologyType: 'heat-pump',
    displayName: 'Heat Pump (Space Heating)',
    firstLawEfficiency: 3.5,
    secondLawEfficiency: 0.45,
    inputEnergyType: 'electricity',
    outputEnergyType: 'low-temp-heat',
    temperatureRange: { hot: 323, cold: 275 }, // 50C output, 2C ambient
    fossilEquivalent: {
      technology: 'Natural Gas Furnace',
      secondLawEfficiency: 0.08,
    },
    dataSource: 'IEA Heat Pump Technology Report 2023',
    confidenceLevel: 'high',
    notes: 'COP of 3.5 means 350% first-law efficiency. Much higher exergy efficiency than fossil heating.',
  },

  'heat-pump-high-temp': {
    technologyType: 'heat-pump-high-temp',
    displayName: 'Industrial Heat Pump',
    firstLawEfficiency: 2.5,
    secondLawEfficiency: 0.40,
    inputEnergyType: 'electricity',
    outputEnergyType: 'medium-temp-heat',
    temperatureRange: { hot: 423, cold: 300 }, // 150C output
    fossilEquivalent: {
      technology: 'Natural Gas Boiler',
      secondLawEfficiency: 0.15,
    },
    dataSource: 'IEA Industrial Heat Pump Report',
    confidenceLevel: 'medium',
    notes: 'Lower COP at higher temperatures but still significant exergy advantage.',
  },

  'fuel-cell': {
    technologyType: 'fuel-cell',
    displayName: 'PEM Fuel Cell',
    firstLawEfficiency: 0.55,
    secondLawEfficiency: 0.50,
    inputEnergyType: 'chemical',
    outputEnergyType: 'electricity',
    fossilEquivalent: {
      technology: 'Diesel Generator',
      secondLawEfficiency: 0.35,
    },
    dataSource: 'DOE Fuel Cell Technologies Office 2023',
    confidenceLevel: 'high',
    notes: 'Direct electrochemical conversion avoids Carnot limitations.',
  },

  'sofc': {
    technologyType: 'sofc',
    displayName: 'Solid Oxide Fuel Cell',
    firstLawEfficiency: 0.60,
    secondLawEfficiency: 0.55,
    inputEnergyType: 'chemical',
    outputEnergyType: 'electricity',
    temperatureRange: { hot: 1073, cold: 300 }, // 800C operating
    fossilEquivalent: {
      technology: 'Natural Gas Combined Cycle',
      secondLawEfficiency: 0.55,
    },
    dataSource: 'DOE Fuel Cell Technologies Office 2023',
    confidenceLevel: 'medium',
    notes: 'High-temperature operation enables combined heat and power.',
  },

  'electrolyzer': {
    technologyType: 'electrolyzer',
    displayName: 'PEM Electrolyzer',
    firstLawEfficiency: 0.70,
    secondLawEfficiency: 0.65,
    inputEnergyType: 'electricity',
    outputEnergyType: 'chemical',
    fossilEquivalent: {
      technology: 'Steam Methane Reforming',
      secondLawEfficiency: 0.75,
    },
    dataSource: 'IRENA Green Hydrogen Cost Reduction 2023',
    confidenceLevel: 'medium',
    notes: 'Converts electricity to hydrogen chemical energy.',
  },

  'alkaline-electrolyzer': {
    technologyType: 'alkaline-electrolyzer',
    displayName: 'Alkaline Electrolyzer',
    firstLawEfficiency: 0.65,
    secondLawEfficiency: 0.60,
    inputEnergyType: 'electricity',
    outputEnergyType: 'chemical',
    fossilEquivalent: {
      technology: 'Steam Methane Reforming',
      secondLawEfficiency: 0.75,
    },
    dataSource: 'IRENA Green Hydrogen Cost Reduction 2023',
    confidenceLevel: 'high',
    notes: 'More mature technology than PEM, lower cost but slower response.',
  },

  // =========================================================================
  // SUSTAINABLE FUELS
  // =========================================================================

  'saf': {
    technologyType: 'saf',
    displayName: 'Sustainable Aviation Fuel',
    firstLawEfficiency: 0.45,
    secondLawEfficiency: 0.40,
    inputEnergyType: 'electricity',
    outputEnergyType: 'chemical',
    fossilEquivalent: {
      technology: 'Petroleum Jet Fuel Refining',
      secondLawEfficiency: 0.90,
    },
    dataSource: 'ICAO SAF Sustainability Report 2023',
    confidenceLevel: 'medium',
    notes: 'Power-to-liquids pathway. Lower efficiency but zero net carbon.',
  },

  'e-methanol': {
    technologyType: 'e-methanol',
    displayName: 'Green Methanol (e-Methanol)',
    firstLawEfficiency: 0.50,
    secondLawEfficiency: 0.45,
    inputEnergyType: 'electricity',
    outputEnergyType: 'chemical',
    fossilEquivalent: {
      technology: 'Fossil Methanol Production',
      secondLawEfficiency: 0.70,
    },
    dataSource: 'IRENA Innovation Outlook: Renewable Methanol',
    confidenceLevel: 'medium',
    notes: 'CO2 hydrogenation with renewable hydrogen.',
  },

  'e-ammonia': {
    technologyType: 'e-ammonia',
    displayName: 'Green Ammonia',
    firstLawEfficiency: 0.55,
    secondLawEfficiency: 0.50,
    inputEnergyType: 'electricity',
    outputEnergyType: 'chemical',
    fossilEquivalent: {
      technology: 'Haber-Bosch (Natural Gas)',
      secondLawEfficiency: 0.65,
    },
    dataSource: 'IRENA Innovation Outlook: Renewable Ammonia',
    confidenceLevel: 'medium',
    notes: 'Potential marine fuel and hydrogen carrier.',
  },
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get profile for a technology type (case-insensitive, handles variations)
 */
export function getDeviceProfile(technologyType: string): DeviceExergyProfile | null {
  const normalizedType = normalizeTechnologyType(technologyType)
  return DEVICE_EXERGY_PROFILES[normalizedType] || null
}

/**
 * Normalize technology type string for lookup
 */
export function normalizeTechnologyType(technologyType: string): string {
  return technologyType
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

/**
 * Get all available technology types
 */
export function getAvailableTechnologies(): string[] {
  return Object.keys(DEVICE_EXERGY_PROFILES)
}

/**
 * Get technologies by output energy type
 */
export function getTechnologiesByOutput(outputType: string): DeviceExergyProfile[] {
  return Object.values(DEVICE_EXERGY_PROFILES).filter(
    (profile) => profile.outputEnergyType === outputType
  )
}

/**
 * Get all electricity-generating technologies
 */
export function getElectricityGenerators(): DeviceExergyProfile[] {
  return getTechnologiesByOutput('electricity')
}

/**
 * Get all renewable technologies (excludes fossil fuels)
 */
export function getRenewableTechnologies(): DeviceExergyProfile[] {
  const fossilTypes = ['ccgt', 'coal', 'natural-gas-peaker']
  return Object.entries(DEVICE_EXERGY_PROFILES)
    .filter(([key]) => !fossilTypes.includes(key))
    .map(([, profile]) => profile)
}

/**
 * Get fossil fuel technologies for comparison
 */
export function getFossilTechnologies(): DeviceExergyProfile[] {
  const fossilTypes = ['ccgt', 'coal', 'natural-gas-peaker']
  return fossilTypes
    .map((key) => DEVICE_EXERGY_PROFILES[key])
    .filter((profile): profile is DeviceExergyProfile => profile !== undefined)
}
