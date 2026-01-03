/**
 * Membrane Separation Calculator
 *
 * Physics-based membrane separation calculations for water treatment,
 * gas separation, and desalination simulations.
 *
 * @module simulation/calculators/membrane-separation
 * @version 0.7.0
 */

import type { SimulationOutput } from '../types'

/**
 * Physical constants
 */
const CONSTANTS = {
  R: 8.314, // Universal gas constant J/(mol*K)
  molarVolumeWater: 18.015e-6, // m3/mol
  viscosityWater298: 8.9e-4, // Pa*s at 25C
}

/**
 * Membrane configuration data
 * Sources: Dow FilmTec, Hydranautics, literature data
 */
interface MembraneConfig {
  name: string
  type: 'RO' | 'NF' | 'UF' | 'MF' | 'MD' | 'ED' | 'FO'
  poreSize: number // nm (0 for dense membranes)
  permeability: number // L/(m2*h*bar) or LMH/bar
  saltRejection: number // 0-1 for NaCl
  mwco: number // Molecular weight cutoff (Da)
  maxPressure: number // bar
  maxTemperature: number // K
  temperatureRange: [number, number] // K (operating range)
  typicalFlux: number // LMH at standard conditions
  foulingResistance: number // 0-1 (higher = more resistant)
  cleaningInterval: number // hours
  lifetime: number // years
}

const MEMBRANE_CONFIGS: Record<string, MembraneConfig> = {
  'RO-SW': {
    name: 'Seawater RO (SW30HR)',
    type: 'RO',
    poreSize: 0,
    permeability: 1.2,
    saltRejection: 0.995,
    mwco: 100,
    maxPressure: 83,
    maxTemperature: 318,
    temperatureRange: [278, 318],
    typicalFlux: 15,
    foulingResistance: 0.7,
    cleaningInterval: 720,
    lifetime: 7,
  },
  'RO-BW': {
    name: 'Brackish Water RO (BW30)',
    type: 'RO',
    poreSize: 0,
    permeability: 3.5,
    saltRejection: 0.995,
    mwco: 100,
    maxPressure: 41,
    maxTemperature: 318,
    temperatureRange: [278, 318],
    typicalFlux: 25,
    foulingResistance: 0.6,
    cleaningInterval: 480,
    lifetime: 5,
  },
  'RO-LP': {
    name: 'Low Pressure RO (XLE)',
    type: 'RO',
    poreSize: 0,
    permeability: 7.5,
    saltRejection: 0.985,
    mwco: 100,
    maxPressure: 41,
    maxTemperature: 318,
    temperatureRange: [278, 318],
    typicalFlux: 35,
    foulingResistance: 0.5,
    cleaningInterval: 360,
    lifetime: 4,
  },
  'NF-200': {
    name: 'Nanofiltration (NF200)',
    type: 'NF',
    poreSize: 1,
    permeability: 8.0,
    saltRejection: 0.35,
    mwco: 200,
    maxPressure: 41,
    maxTemperature: 318,
    temperatureRange: [278, 318],
    typicalFlux: 45,
    foulingResistance: 0.65,
    cleaningInterval: 480,
    lifetime: 5,
  },
  'NF-270': {
    name: 'Nanofiltration (NF270)',
    type: 'NF',
    poreSize: 0.8,
    permeability: 11.0,
    saltRejection: 0.40,
    mwco: 270,
    maxPressure: 41,
    maxTemperature: 323,
    temperatureRange: [278, 323],
    typicalFlux: 55,
    foulingResistance: 0.6,
    cleaningInterval: 360,
    lifetime: 5,
  },
  'UF-PES': {
    name: 'UF Polyethersulfone (100 kDa)',
    type: 'UF',
    poreSize: 20,
    permeability: 150,
    saltRejection: 0,
    mwco: 100000,
    maxPressure: 7,
    maxTemperature: 333,
    temperatureRange: [278, 333],
    typicalFlux: 100,
    foulingResistance: 0.5,
    cleaningInterval: 168,
    lifetime: 5,
  },
  'UF-PVDF': {
    name: 'UF PVDF (50 kDa)',
    type: 'UF',
    poreSize: 15,
    permeability: 200,
    saltRejection: 0,
    mwco: 50000,
    maxPressure: 5,
    maxTemperature: 353,
    temperatureRange: [278, 353],
    typicalFlux: 120,
    foulingResistance: 0.7,
    cleaningInterval: 240,
    lifetime: 7,
  },
  'MF-PTFE': {
    name: 'MF PTFE (0.2 um)',
    type: 'MF',
    poreSize: 200,
    permeability: 500,
    saltRejection: 0,
    mwco: 500000,
    maxPressure: 3,
    maxTemperature: 393,
    temperatureRange: [278, 393],
    typicalFlux: 200,
    foulingResistance: 0.8,
    cleaningInterval: 336,
    lifetime: 10,
  },
  'MD-PTFE': {
    name: 'Membrane Distillation PTFE',
    type: 'MD',
    poreSize: 200,
    permeability: 10, // kg/(m2*h) for vapor
    saltRejection: 0.9999,
    mwco: 0,
    maxPressure: 1,
    maxTemperature: 363,
    temperatureRange: [313, 363],
    typicalFlux: 15,
    foulingResistance: 0.85,
    cleaningInterval: 720,
    lifetime: 5,
  },
  'ED-CEM': {
    name: 'Electrodialysis Cation Exchange',
    type: 'ED',
    poreSize: 0,
    permeability: 0,
    saltRejection: 0.85,
    mwco: 100,
    maxPressure: 1,
    maxTemperature: 333,
    temperatureRange: [283, 333],
    typicalFlux: 30,
    foulingResistance: 0.75,
    cleaningInterval: 720,
    lifetime: 10,
  },
  'FO-CTA': {
    name: 'Forward Osmosis CTA',
    type: 'FO',
    poreSize: 0,
    permeability: 1.5,
    saltRejection: 0.97,
    mwco: 100,
    maxPressure: 10,
    maxTemperature: 318,
    temperatureRange: [278, 318],
    typicalFlux: 12,
    foulingResistance: 0.8,
    cleaningInterval: 480,
    lifetime: 5,
  },
}

/**
 * Membrane separation calculation inputs
 */
export interface MembraneInputs {
  membraneType?: string
  temperature?: number // K
  feedPressure?: number // bar
  feedConcentration?: number // g/L (for salt) or mg/L
  feedFlowRate?: number // m3/h
  membraneArea?: number // m2
  recovery?: number // 0-1 (permeate/feed ratio)
  operatingHours?: number // cumulative hours
  feedTDS?: number // Total dissolved solids mg/L
  deltaT?: number // Temperature difference for MD (K)
}

/**
 * Calculate water flux using solution-diffusion model
 */
export function calculateWaterFlux(inputs: MembraneInputs): {
  flux: number
  permeability: number
  effectivePressure: number
  osmoticPressure: number
  temperatureCorrectionFactor: number
} {
  const membraneType = inputs.membraneType?.toUpperCase() || 'RO-SW'
  const config = MEMBRANE_CONFIGS[membraneType] || MEMBRANE_CONFIGS['RO-SW']

  const T = inputs.temperature || 298
  const P = inputs.feedPressure || 55 // bar
  const C = inputs.feedConcentration || 35 // g/L

  // Temperature correction factor (viscosity-based)
  // Flux increases ~3% per degree above 25C
  const Tref = 298
  const tcf = Math.exp(0.03 * (T - Tref))

  // Osmotic pressure (Van't Hoff equation)
  // For NaCl: pi = i * C * R * T / M
  const ionicFactor = 2 // NaCl dissociation
  const molarMass = 58.44 // g/mol NaCl
  const osmoticPressure = ionicFactor * (C / molarMass) * CONSTANTS.R * T / 100000 // bar

  // Net driving pressure
  const effectivePressure = Math.max(0, P - osmoticPressure)

  // Water flux (LMH = L/m2/h)
  const flux = config.permeability * effectivePressure * tcf

  return {
    flux,
    permeability: config.permeability,
    effectivePressure,
    osmoticPressure,
    temperatureCorrectionFactor: tcf,
  }
}

/**
 * Calculate solute rejection
 */
export function calculateSoluteRejection(inputs: MembraneInputs): {
  rejection: number
  permeateConcentration: number
  solutePassage: number
  concentrationPolarization: number
  realRejection: number
} {
  const membraneType = inputs.membraneType?.toUpperCase() || 'RO-SW'
  const config = MEMBRANE_CONFIGS[membraneType] || MEMBRANE_CONFIGS['RO-SW']

  const C_feed = inputs.feedConcentration || 35 // g/L
  const recovery = inputs.recovery || 0.5

  // Intrinsic rejection
  const R_intrinsic = config.saltRejection

  // Concentration polarization modulus
  // CP = exp(J_w / k) where k is mass transfer coefficient
  const fluxResult = calculateWaterFlux(inputs)
  const massTransferCoeff = 20 // L/m2/h (typical)
  const cpModulus = Math.exp(fluxResult.flux / massTransferCoeff)

  // Real rejection accounting for CP
  const realRejection = R_intrinsic / (R_intrinsic + (1 - R_intrinsic) * cpModulus)

  // Permeate concentration
  const C_permeate = C_feed * (1 - realRejection)

  // Solute passage
  const solutePassage = 1 - realRejection

  return {
    rejection: realRejection,
    permeateConcentration: C_permeate,
    solutePassage,
    concentrationPolarization: cpModulus,
    realRejection,
  }
}

/**
 * Calculate fouling rate and cleaning requirements
 */
export function calculateFoulingRate(inputs: MembraneInputs): {
  foulingFactor: number
  fluxDecline: number
  cleaningRequired: boolean
  hoursToNextCleaning: number
  resistanceIncrease: number
  foulingType: string
} {
  const membraneType = inputs.membraneType?.toUpperCase() || 'RO-SW'
  const config = MEMBRANE_CONFIGS[membraneType] || MEMBRANE_CONFIGS['RO-SW']

  const operatingHours = inputs.operatingHours || 0
  const recovery = inputs.recovery || 0.5

  // Fouling rate depends on recovery and membrane resistance
  // Higher recovery = more concentration polarization = faster fouling
  const baseFoulingRate = (1 - config.foulingResistance) * 0.001 // per hour
  const recoveryFactor = 1 + 2 * Math.pow(recovery - 0.5, 2)

  const effectiveFoulingRate = baseFoulingRate * recoveryFactor

  // Fouling factor (0-1, where 1 is clean)
  const foulingFactor = Math.max(0.3, 1 - effectiveFoulingRate * operatingHours)

  // Flux decline percentage
  const fluxDecline = (1 - foulingFactor) * 100

  // Hours since last cleaning (assuming starts clean)
  const hoursSinceCleaning = operatingHours % config.cleaningInterval

  // Hours to next cleaning
  const hoursToNextCleaning = Math.max(0, config.cleaningInterval - hoursSinceCleaning)

  // Cleaning required if flux declined significantly
  const cleaningRequired = fluxDecline > 20 || hoursToNextCleaning < 24

  // Resistance increase factor
  const resistanceIncrease = 1 / foulingFactor

  // Dominant fouling type
  let foulingType = 'Organic'
  if (config.type === 'RO' || config.type === 'NF') foulingType = 'Scaling'
  if (inputs.feedTDS && inputs.feedTDS > 50000) foulingType = 'Biofouling'

  return {
    foulingFactor,
    fluxDecline,
    cleaningRequired,
    hoursToNextCleaning,
    resistanceIncrease,
    foulingType,
  }
}

/**
 * Calculate energy consumption
 */
export function calculateEnergyConsumption(inputs: MembraneInputs): {
  specificEnergy: number
  pumpPower: number
  thermodynamicMinimum: number
  energyEfficiency: number
  secondLawEfficiency: number
} {
  const membraneType = inputs.membraneType?.toUpperCase() || 'RO-SW'
  const config = MEMBRANE_CONFIGS[membraneType] || MEMBRANE_CONFIGS['RO-SW']

  const P = inputs.feedPressure || 55 // bar
  const recovery = inputs.recovery || 0.5
  const flowRate = inputs.feedFlowRate || 100 // m3/h
  const C = inputs.feedConcentration || 35 // g/L

  // Pump power (kW)
  const pumpEfficiency = 0.80
  const pumpPower = (P * 100000) * (flowRate / 3600) / pumpEfficiency / 1000

  // Permeate flow
  const permeateFlow = flowRate * recovery

  // Specific energy consumption (kWh/m3 permeate)
  const specificEnergy = pumpPower / permeateFlow

  // Thermodynamic minimum for desalination (reversible work)
  // For seawater at 35 g/L: ~1.06 kWh/m3 at 50% recovery
  const osmPressure = 2 * (C / 58.44) * CONSTANTS.R * 298 / 100000 // bar
  const thermodynamicMinimum = osmPressure * 100000 * CONSTANTS.molarVolumeWater /
    (CONSTANTS.R * 298) * (-Math.log(1 - recovery)) / 3600

  // Energy efficiency
  const energyEfficiency = thermodynamicMinimum / specificEnergy * 100

  // Second law (exergy) efficiency
  const secondLawEfficiency = energyEfficiency * 0.8 // Approximate

  return {
    specificEnergy,
    pumpPower,
    thermodynamicMinimum,
    energyEfficiency,
    secondLawEfficiency,
  }
}

/**
 * Calculate permeate quality
 */
export function calculatePermeateQuality(inputs: MembraneInputs): {
  tds: number
  conductivity: number
  pH: number
  turbidity: number
  meetsStandard: boolean
  standardName: string
} {
  const membraneType = inputs.membraneType?.toUpperCase() || 'RO-SW'
  const config = MEMBRANE_CONFIGS[membraneType] || MEMBRANE_CONFIGS['RO-SW']

  const feedTDS = inputs.feedTDS || inputs.feedConcentration ? inputs.feedConcentration! * 1000 : 35000 // mg/L

  const rejectionResult = calculateSoluteRejection(inputs)

  // Permeate TDS
  const permeateTDS = feedTDS * (1 - rejectionResult.rejection)

  // Conductivity (approximate: 1 mg/L TDS ~ 2 uS/cm)
  const conductivity = permeateTDS * 2

  // pH (RO typically produces slightly acidic permeate)
  const pH = 6.5

  // Turbidity (NTU) - very low for RO/NF
  const turbidity = config.type === 'RO' || config.type === 'NF' ? 0.1 : 1.0

  // WHO drinking water standard: < 600 mg/L TDS
  const whoStandard = 600
  const meetsStandard = permeateTDS < whoStandard

  return {
    tds: permeateTDS,
    conductivity,
    pH,
    turbidity,
    meetsStandard,
    standardName: 'WHO Drinking Water',
  }
}

/**
 * Main membrane separation calculation function
 */
export async function calculateMembraneSeparation(
  inputs: MembraneInputs
): Promise<{
  outputs: SimulationOutput[]
  dataSourceInfo: {
    source: string
    isFallback: boolean
  }
}> {
  const membraneType = inputs.membraneType?.toUpperCase() || 'RO-SW'
  const config = MEMBRANE_CONFIGS[membraneType] || MEMBRANE_CONFIGS['RO-SW']

  const fluxResult = calculateWaterFlux(inputs)
  const rejectionResult = calculateSoluteRejection(inputs)
  const foulingResult = calculateFoulingRate(inputs)
  const energyResult = calculateEnergyConsumption(inputs)
  const qualityResult = calculatePermeateQuality(inputs)

  const outputs: SimulationOutput[] = [
    { name: 'waterFlux', value: fluxResult.flux, unit: 'LMH', uncertainty: fluxResult.flux * 0.1 },
    { name: 'effectivePressure', value: fluxResult.effectivePressure, unit: 'bar' },
    { name: 'osmoticPressure', value: fluxResult.osmoticPressure, unit: 'bar' },
    { name: 'saltRejection', value: rejectionResult.rejection * 100, unit: '%', uncertainty: 1 },
    { name: 'permeateConcentration', value: rejectionResult.permeateConcentration, unit: 'g/L' },
    { name: 'concentrationPolarization', value: rejectionResult.concentrationPolarization, unit: '' },
    { name: 'foulingFactor', value: foulingResult.foulingFactor, unit: '' },
    { name: 'fluxDecline', value: foulingResult.fluxDecline, unit: '%' },
    { name: 'hoursToNextCleaning', value: foulingResult.hoursToNextCleaning, unit: 'h' },
    { name: 'specificEnergy', value: energyResult.specificEnergy, unit: 'kWh/m3', uncertainty: energyResult.specificEnergy * 0.1 },
    { name: 'pumpPower', value: energyResult.pumpPower, unit: 'kW' },
    { name: 'energyEfficiency', value: energyResult.energyEfficiency, unit: '%' },
    { name: 'permeateTDS', value: qualityResult.tds, unit: 'mg/L' },
    { name: 'permeateQualityMeetsStandard', value: qualityResult.meetsStandard ? 1 : 0, unit: '' },
    { name: 'membranePermeability', value: config.permeability, unit: 'LMH/bar' },
    { name: 'mwco', value: config.mwco, unit: 'Da' },
    { name: 'maxOperatingPressure', value: config.maxPressure, unit: 'bar' },
    { name: 'expectedLifetime', value: config.lifetime, unit: 'years' },
  ]

  return {
    outputs,
    dataSourceInfo: {
      source: 'embedded-membrane-data',
      isFallback: true,
    },
  }
}

/**
 * Get available membrane types
 */
export function getAvailableMembranes(): Array<{
  id: string
  name: string
  type: string
  permeability: string
  rejection: string
}> {
  return Object.entries(MEMBRANE_CONFIGS).map(([id, config]) => ({
    id,
    name: config.name,
    type: config.type,
    permeability: `${config.permeability.toFixed(1)} LMH/bar`,
    rejection: config.saltRejection > 0 ? `${(config.saltRejection * 100).toFixed(1)}%` : 'N/A',
  }))
}
