/**
 * Wind Turbines Calculator
 *
 * Physics-based wind power calculations with NREL power curve data.
 */

import { getEnvironmentalDatabase, getDataSourceRegistry } from '../data-sources'
import type { SimulationOutput } from '../types'

/**
 * Physical constants
 */
const CONSTANTS = {
  rho: 1.225, // Air density at sea level kg/m3
  betzLimit: 0.593, // Maximum theoretical Cp
}

/**
 * Wind turbine configurations based on NREL reference turbines
 * Source: NREL Reference Turbines and IEC standards
 */
interface TurbineConfig {
  name: string
  ratedPower: number // MW
  rotorDiameter: number // m
  hubHeight: number // m
  cutInSpeed: number // m/s
  ratedSpeed: number // m/s
  cutOutSpeed: number // m/s
  maxCp: number // Maximum power coefficient
  specificPower: number // W/m2
  class: 'I' | 'II' | 'III' | 'IV'
}

const TURBINE_CONFIGS: Record<string, TurbineConfig> = {
  'nrel-5mw': {
    name: 'NREL 5MW Reference',
    ratedPower: 5.0,
    rotorDiameter: 126,
    hubHeight: 90,
    cutInSpeed: 3.0,
    ratedSpeed: 11.4,
    cutOutSpeed: 25.0,
    maxCp: 0.48,
    specificPower: 401,
    class: 'I',
  },
  'nrel-15mw': {
    name: 'IEA 15MW Reference',
    ratedPower: 15.0,
    rotorDiameter: 240,
    hubHeight: 150,
    cutInSpeed: 3.0,
    ratedSpeed: 10.6,
    cutOutSpeed: 25.0,
    maxCp: 0.49,
    specificPower: 332,
    class: 'I',
  },
  'vestas-v90': {
    name: 'Vestas V90-2.0MW',
    ratedPower: 2.0,
    rotorDiameter: 90,
    hubHeight: 80,
    cutInSpeed: 4.0,
    ratedSpeed: 13.0,
    cutOutSpeed: 25.0,
    maxCp: 0.47,
    specificPower: 314,
    class: 'II',
  },
  'vestas-v164': {
    name: 'Vestas V164-9.5MW (Offshore)',
    ratedPower: 9.5,
    rotorDiameter: 164,
    hubHeight: 105,
    cutInSpeed: 3.5,
    ratedSpeed: 12.0,
    cutOutSpeed: 25.0,
    maxCp: 0.48,
    specificPower: 450,
    class: 'I',
  },
  'ge-haliade-x': {
    name: 'GE Haliade-X 14MW (Offshore)',
    ratedPower: 14.0,
    rotorDiameter: 220,
    hubHeight: 150,
    cutInSpeed: 3.0,
    ratedSpeed: 10.5,
    cutOutSpeed: 28.0,
    maxCp: 0.49,
    specificPower: 368,
    class: 'I',
  },
  'siemens-3.0': {
    name: 'Siemens SWT-3.0-108',
    ratedPower: 3.0,
    rotorDiameter: 108,
    hubHeight: 80,
    cutInSpeed: 3.0,
    ratedSpeed: 12.5,
    cutOutSpeed: 25.0,
    maxCp: 0.47,
    specificPower: 327,
    class: 'II',
  },
  'generic-onshore-2mw': {
    name: 'Generic Onshore 2MW',
    ratedPower: 2.0,
    rotorDiameter: 90,
    hubHeight: 80,
    cutInSpeed: 3.5,
    ratedSpeed: 12.0,
    cutOutSpeed: 25.0,
    maxCp: 0.45,
    specificPower: 314,
    class: 'III',
  },
  'generic-onshore-3mw': {
    name: 'Generic Onshore 3MW',
    ratedPower: 3.0,
    rotorDiameter: 112,
    hubHeight: 100,
    cutInSpeed: 3.0,
    ratedSpeed: 11.5,
    cutOutSpeed: 25.0,
    maxCp: 0.46,
    specificPower: 304,
    class: 'II',
  },
  'generic-offshore-8mw': {
    name: 'Generic Offshore 8MW',
    ratedPower: 8.0,
    rotorDiameter: 167,
    hubHeight: 110,
    cutInSpeed: 3.0,
    ratedSpeed: 11.0,
    cutOutSpeed: 25.0,
    maxCp: 0.48,
    specificPower: 365,
    class: 'I',
  },
}

/**
 * Wind turbine calculation inputs
 */
export interface WindTurbineInputs {
  turbineType?: string
  windSpeed?: number // m/s at hub height
  airDensity?: number // kg/m3
  location?: { lat: number; lon: number }
  hubHeight?: number // m (for wind shear calculation)
  numTurbines?: number
  wakeEffect?: boolean
}

/**
 * Calculate wind power in the wind
 */
export function calculateWindPower(
  windSpeed: number,
  rotorDiameter: number,
  airDensity: number = CONSTANTS.rho
): number {
  // P = 0.5 * rho * A * v^3
  const area = Math.PI * Math.pow(rotorDiameter / 2, 2)
  return 0.5 * airDensity * area * Math.pow(windSpeed, 3)
}

/**
 * Calculate power coefficient (Cp) for a turbine
 */
export function calculatePowerCoefficient(
  windSpeed: number,
  config: TurbineConfig
): number {
  // Simplified Cp curve based on normalized wind speed
  const vRated = config.ratedSpeed
  const vCutIn = config.cutInSpeed
  const vCutOut = config.cutOutSpeed

  if (windSpeed < vCutIn || windSpeed > vCutOut) {
    return 0
  }

  if (windSpeed >= vRated) {
    // Above rated: Cp decreases to maintain rated power
    const windPowerRatio = Math.pow(vRated / windSpeed, 3)
    return config.maxCp * windPowerRatio
  }

  // Below rated: Cp follows optimal curve
  // Simplified quadratic approximation
  const normalized = (windSpeed - vCutIn) / (vRated - vCutIn)
  const cpCurve = config.maxCp * (1 - Math.pow(1 - normalized, 2) * 0.3)

  return Math.min(cpCurve, CONSTANTS.betzLimit)
}

/**
 * Calculate electrical power output from a turbine
 */
export function calculateTurbinePower(
  windSpeed: number,
  config: TurbineConfig,
  airDensity: number = CONSTANTS.rho
): number {
  if (windSpeed < config.cutInSpeed) {
    return 0
  }

  if (windSpeed > config.cutOutSpeed) {
    return 0
  }

  if (windSpeed >= config.ratedSpeed) {
    return config.ratedPower * 1e6 // Convert MW to W
  }

  // Below rated: power follows wind speed cubed
  const windPower = calculateWindPower(windSpeed, config.rotorDiameter, airDensity)
  const cp = calculatePowerCoefficient(windSpeed, config)

  return windPower * cp
}

/**
 * Calculate wind shear - adjust wind speed for hub height
 */
export function calculateWindShear(
  windSpeedRef: number,
  heightRef: number,
  heightTarget: number,
  shearExponent: number = 0.14 // Typical for open terrain
): number {
  // Power law: v2 = v1 * (h2/h1)^alpha
  return windSpeedRef * Math.pow(heightTarget / heightRef, shearExponent)
}

/**
 * Calculate wake effect between turbines
 */
export function calculateWakeLoss(
  numTurbines: number,
  spacing: number = 7 // Rotor diameters between turbines
): number {
  if (numTurbines <= 1) return 0

  // Simplified Jensen wake model effect
  // Wake losses typically 5-15% for wind farms
  const baseLoss = 0.10 // 10% average wake loss for multiple turbines

  // Spacing effect (more spacing = less loss)
  const spacingFactor = Math.min(1, 7 / spacing)

  // Size effect (more turbines = more wake interactions)
  const sizeFactor = 1 + 0.02 * Math.log(numTurbines)

  return baseLoss * spacingFactor * sizeFactor
}

/**
 * Calculate full wind turbine performance
 */
export async function calculateWindTurbinePerformance(
  inputs: WindTurbineInputs
): Promise<{
  outputs: SimulationOutput[]
  dataSourceInfo: {
    windResourceSource: string
    isFallback: boolean
  }
}> {
  const envDb = getEnvironmentalDatabase()
  const registry = getDataSourceRegistry()

  // Get turbine configuration
  const turbineType = inputs.turbineType || 'generic-onshore-3mw'
  const config = TURBINE_CONFIGS[turbineType] || TURBINE_CONFIGS['generic-onshore-3mw']

  // Get wind resource
  let windSpeed = inputs.windSpeed
  let windResourceSource = 'user-input'
  let isFallback = false

  if (inputs.location && !windSpeed) {
    const windData = await envDb.getWindResource(
      inputs.location.lat,
      inputs.location.lon,
      config.hubHeight
    )

    // Use wind speed at hub height
    if (config.hubHeight <= 50) {
      windSpeed = windData.windSpeed50m
    } else if (config.hubHeight <= 80) {
      windSpeed = windData.windSpeed80m
    } else {
      windSpeed = windData.windSpeed100m
    }

    windResourceSource = windData.source
    isFallback = windData.isFallback
  }

  // Apply wind shear if custom hub height specified
  if (inputs.hubHeight && inputs.hubHeight !== config.hubHeight && windSpeed) {
    windSpeed = calculateWindShear(windSpeed, config.hubHeight, inputs.hubHeight)
  }

  windSpeed = windSpeed || 8.0 // Default if nothing else

  const airDensity = inputs.airDensity || CONSTANTS.rho

  // Calculate power
  const windPowerAvailable = calculateWindPower(windSpeed, config.rotorDiameter, airDensity)
  const cp = calculatePowerCoefficient(windSpeed, config)
  const turbinePower = calculateTurbinePower(windSpeed, config, airDensity)

  // Calculate efficiencies
  const aerodynamicEfficiency = cp / CONSTANTS.betzLimit
  const electricalEfficiency = 0.97 // Generator + power electronics
  const availabilityFactor = 0.97 // Typical availability

  // Number of turbines and wake effects
  const numTurbines = inputs.numTurbines || 1
  let totalPower = turbinePower * numTurbines

  let wakeLoss = 0
  if (inputs.wakeEffect !== false && numTurbines > 1) {
    wakeLoss = calculateWakeLoss(numTurbines)
    totalPower *= (1 - wakeLoss)
  }

  // Apply electrical and availability losses
  const netPower = totalPower * electricalEfficiency * availabilityFactor

  // Capacity factor estimation (based on Rayleigh distribution)
  // This is a simplification - real CF depends on wind speed distribution
  const meanWindRatio = windSpeed / config.ratedSpeed
  let capacityFactor: number
  if (meanWindRatio < 0.5) {
    capacityFactor = 0.15 + meanWindRatio * 0.3
  } else if (meanWindRatio < 1.0) {
    capacityFactor = 0.30 + (meanWindRatio - 0.5) * 0.4
  } else {
    capacityFactor = 0.50 + Math.min(0.15, (meanWindRatio - 1.0) * 0.2)
  }

  // Get NREL ATB capacity factor for comparison
  const techType = turbineType.includes('offshore') ? 'offshore-wind' : 'land-based-wind'
  const atbData = await registry.getCapacityFactor(techType as any)

  // Exergy analysis
  // Wind kinetic energy is pure exergy
  const exergyInput = windPowerAvailable
  const exergyOutput = turbinePower
  const exergyEfficiency = turbinePower / windPowerAvailable

  // Thrust coefficient for structural calculations
  const ct = 8 * cp / (1 + Math.sqrt(1 - cp)) // Simplified actuator disk

  const outputs: SimulationOutput[] = [
    { name: 'windSpeed', value: windSpeed, unit: 'm/s' },
    { name: 'windPowerAvailable', value: windPowerAvailable / 1e6, unit: 'MW' },
    { name: 'powerCoefficient', value: cp, unit: '' },
    { name: 'betzLimit', value: CONSTANTS.betzLimit, unit: '' },
    { name: 'turbinePower', value: turbinePower / 1e6, unit: 'MW', uncertainty: turbinePower / 1e6 * 0.05 },
    { name: 'aerodynamicEfficiency', value: aerodynamicEfficiency, unit: '' },
    { name: 'capacityFactor', value: capacityFactor, unit: '', uncertainty: 0.05 },
    { name: 'atbCapacityFactor', value: atbData.capacityFactor, unit: '' },
    { name: 'exergyEfficiency', value: exergyEfficiency, unit: '' },
    { name: 'thrustCoefficient', value: ct, unit: '' },
    { name: 'rotorArea', value: Math.PI * Math.pow(config.rotorDiameter / 2, 2), unit: 'm2' },
    { name: 'specificPower', value: config.specificPower, unit: 'W/m2' },
  ]

  if (numTurbines > 1) {
    outputs.push(
      { name: 'numTurbines', value: numTurbines, unit: '' },
      { name: 'totalPower', value: totalPower / 1e6, unit: 'MW' },
      { name: 'netPower', value: netPower / 1e6, unit: 'MW' }
    )

    if (wakeLoss > 0) {
      outputs.push({ name: 'wakeLoss', value: wakeLoss, unit: '' })
    }
  }

  return {
    outputs,
    dataSourceInfo: {
      windResourceSource,
      isFallback,
    },
  }
}

/**
 * Generate power curve data
 */
export function generatePowerCurve(
  turbineType: string = 'generic-onshore-3mw',
  points: number = 30
): Array<{
  windSpeed: number
  power: number
  cp: number
}> {
  const config = TURBINE_CONFIGS[turbineType] || TURBINE_CONFIGS['generic-onshore-3mw']
  const curve: Array<{ windSpeed: number; power: number; cp: number }> = []

  const maxSpeed = config.cutOutSpeed + 2

  for (let i = 0; i <= points; i++) {
    const windSpeed = (i / points) * maxSpeed
    const power = calculateTurbinePower(windSpeed, config) / 1e6 // MW
    const cp = calculatePowerCoefficient(windSpeed, config)

    curve.push({ windSpeed, power, cp })
  }

  return curve
}

/**
 * Get available turbine types
 */
export function getAvailableTurbines(): Array<{
  id: string
  name: string
  power: string
  diameter: string
  type: string
}> {
  return Object.entries(TURBINE_CONFIGS).map(([id, config]) => ({
    id,
    name: config.name,
    power: `${config.ratedPower} MW`,
    diameter: `${config.rotorDiameter} m`,
    type: id.includes('offshore') ? 'Offshore' : 'Onshore',
  }))
}
