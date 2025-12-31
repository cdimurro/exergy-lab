/**
 * Photovoltaics Calculator
 *
 * Physics-based photovoltaic calculations with real material properties.
 * Implements Shockley-Queisser limit with real band gap data from Materials Project.
 */

import { getParameterResolver, getEnvironmentalDatabase, getMaterialsDatabase } from '../data-sources'
import type { SimulationOutput } from '../types'

/**
 * Physical constants
 */
const CONSTANTS = {
  h: 6.626e-34, // Planck constant J·s
  c: 2.998e8, // Speed of light m/s
  k: 1.381e-23, // Boltzmann constant J/K
  q: 1.602e-19, // Elementary charge C
}

/**
 * AM1.5 solar spectrum reference data (simplified)
 * Full spectrum would be imported from ASTM G173
 */
const AM15_TOTAL_POWER = 1000 // W/m2

/**
 * PV technology configurations
 */
interface PVTechnologyConfig {
  name: string
  material: string
  bandGap: number // eV
  efficiencyRecord: number // Lab record
  efficiencyTypical: number // Commercial
  temperatureCoefficient: number // %/K
  degradationRate: number // %/year
  bifaciality: number // 0-1
}

const PV_TECHNOLOGIES: Record<string, PVTechnologyConfig> = {
  'mono-si': {
    name: 'Monocrystalline Silicon',
    material: 'Si',
    bandGap: 1.12,
    efficiencyRecord: 0.266,
    efficiencyTypical: 0.215,
    temperatureCoefficient: -0.0035,
    degradationRate: 0.005,
    bifaciality: 0.0,
  },
  'poly-si': {
    name: 'Polycrystalline Silicon',
    material: 'Si',
    bandGap: 1.12,
    efficiencyRecord: 0.231,
    efficiencyTypical: 0.18,
    temperatureCoefficient: -0.0040,
    degradationRate: 0.006,
    bifaciality: 0.0,
  },
  'bifacial-si': {
    name: 'Bifacial Silicon',
    material: 'Si',
    bandGap: 1.12,
    efficiencyRecord: 0.266,
    efficiencyTypical: 0.21,
    temperatureCoefficient: -0.0035,
    degradationRate: 0.004,
    bifaciality: 0.70,
  },
  'thin-film-cdte': {
    name: 'Cadmium Telluride',
    material: 'CdTe',
    bandGap: 1.45,
    efficiencyRecord: 0.221,
    efficiencyTypical: 0.18,
    temperatureCoefficient: -0.0025,
    degradationRate: 0.005,
    bifaciality: 0.0,
  },
  'thin-film-cigs': {
    name: 'CIGS',
    material: 'CuInGaSe2',
    bandGap: 1.15,
    efficiencyRecord: 0.234,
    efficiencyTypical: 0.165,
    temperatureCoefficient: -0.0030,
    degradationRate: 0.005,
    bifaciality: 0.0,
  },
  'gaas': {
    name: 'Gallium Arsenide',
    material: 'GaAs',
    bandGap: 1.42,
    efficiencyRecord: 0.293,
    efficiencyTypical: 0.28,
    temperatureCoefficient: -0.0020,
    degradationRate: 0.003,
    bifaciality: 0.0,
  },
  'perovskite': {
    name: 'Perovskite',
    material: 'MAPbI3',
    bandGap: 1.55,
    efficiencyRecord: 0.258,
    efficiencyTypical: 0.20,
    temperatureCoefficient: -0.0030,
    degradationRate: 0.02, // Still improving
    bifaciality: 0.0,
  },
  'tandem-perovskite-si': {
    name: 'Perovskite/Silicon Tandem',
    material: 'MAPbI3/Si',
    bandGap: 1.55, // Top cell
    efficiencyRecord: 0.333,
    efficiencyTypical: 0.27,
    temperatureCoefficient: -0.0025,
    degradationRate: 0.01,
    bifaciality: 0.3,
  },
}

/**
 * PV calculation inputs
 */
export interface PVInputs {
  technology?: string
  material?: string
  irradiance?: number // W/m2
  temperature?: number // Cell temperature in C
  area?: number // m2
  tilt?: number // degrees
  azimuth?: number // degrees
  location?: { lat: number; lon: number }
  age?: number // years
}

/**
 * Calculate Shockley-Queisser limit for a given band gap
 */
export function calculateShockleyQueisserLimit(
  bandGap: number,
  temperature: number = 300
): { efficiency: number; voc: number; jsc: number } {
  // Simplified S-Q calculation
  // Full calculation requires integration over solar spectrum

  // Optimal band gap is around 1.34 eV for AM1.5
  const Eg = bandGap * CONSTANTS.q // Convert to Joules

  // Approximate maximum efficiency based on band gap
  // Peak at ~33.7% for Eg = 1.34 eV
  const Eg_optimal = 1.34
  const efficiencyPeak = 0.337
  const bandwidth = 0.5 // eV FWHM of efficiency curve

  const efficiency = efficiencyPeak * Math.exp(-Math.pow((bandGap - Eg_optimal) / bandwidth, 2))

  // Open circuit voltage (approximately 80% of band gap in practical cells)
  const voc = bandGap * 0.80

  // Short circuit current (approximately)
  // Higher for lower band gaps (more photons absorbed)
  const jsc = 44 - 12 * (bandGap - 1.1) // mA/cm2

  return { efficiency, voc, jsc: Math.max(0, jsc) }
}

/**
 * Calculate temperature effect on PV performance
 */
export function calculateTemperatureEffect(
  stcEfficiency: number,
  temperatureCoefficient: number,
  cellTemperature: number
): {
  efficiency: number
  derating: number
} {
  // STC is at 25C
  const stcTemp = 25
  const deltaT = cellTemperature - stcTemp

  const derating = 1 + temperatureCoefficient * deltaT
  const efficiency = stcEfficiency * derating

  return { efficiency: Math.max(0, efficiency), derating }
}

/**
 * Calculate cell temperature from ambient
 */
export function calculateCellTemperature(
  ambientTemp: number, // C
  irradiance: number, // W/m2
  noct: number = 45 // Nominal operating cell temperature
): number {
  // NOCT is measured at 800 W/m2, 20C ambient, 1 m/s wind
  const tempRise = (noct - 20) * (irradiance / 800)
  return ambientTemp + tempRise
}

/**
 * Calculate full PV system performance
 */
export async function calculatePVPerformance(
  inputs: PVInputs
): Promise<{
  outputs: SimulationOutput[]
  dataSourceInfo: {
    bandGapSource: string
    solarResourceSource: string
    isFallback: boolean
  }
}> {
  const resolver = getParameterResolver()
  const envDb = getEnvironmentalDatabase()

  // Get technology configuration
  const techId = inputs.technology || 'mono-si'
  const config = PV_TECHNOLOGIES[techId] || PV_TECHNOLOGIES['mono-si']

  // Get band gap from materials database if custom material specified
  let bandGap = config.bandGap
  let bandGapSource = 'embedded-pv-data'
  let isFallback = true

  if (inputs.material && inputs.material !== config.material) {
    const bandGapResult = await resolver.resolveBandGap(inputs.material)
    bandGap = bandGapResult.value
    bandGapSource = bandGapResult.source
    isFallback = bandGapResult.isFallback
  }

  // Get solar resource data
  let irradiance = inputs.irradiance || AM15_TOTAL_POWER
  let solarResourceSource = 'user-input'

  if (inputs.location && !inputs.irradiance) {
    const solarData = await envDb.getSolarResource(
      inputs.location.lat,
      inputs.location.lon
    )
    irradiance = solarData.ghi * 1000 / 24 // Convert daily to instantaneous
    solarResourceSource = solarData.source
    isFallback = isFallback || solarData.isFallback
  }

  // Calculate S-Q limit for reference
  const sqLimit = calculateShockleyQueisserLimit(bandGap)

  // Cell temperature
  const ambientTemp = inputs.temperature || 25
  const cellTemp = calculateCellTemperature(ambientTemp, irradiance)

  // Temperature-adjusted efficiency
  const tempEffect = calculateTemperatureEffect(
    config.efficiencyTypical,
    config.temperatureCoefficient,
    cellTemp
  )

  // Degradation effect
  const age = inputs.age || 0
  const degradationFactor = Math.pow(1 - config.degradationRate, age)

  // System efficiency (including inverter, wiring losses)
  const inverterEfficiency = 0.96
  const wiringLosses = 0.02
  const mismatchLosses = 0.02
  const soilingLosses = 0.03

  const systemDerating = inverterEfficiency * (1 - wiringLosses) *
    (1 - mismatchLosses) * (1 - soilingLosses)

  // Final module and system efficiency
  const moduleEfficiency = tempEffect.efficiency * degradationFactor
  const systemEfficiency = moduleEfficiency * systemDerating

  // Power output
  const area = inputs.area || 1 // m2
  const modulePower = irradiance * area * moduleEfficiency
  const systemPower = irradiance * area * systemEfficiency

  // Bifacial gain
  let bifacialGain = 0
  if (config.bifaciality > 0) {
    const albedo = 0.25 // Ground reflectance
    bifacialGain = modulePower * config.bifaciality * albedo * 0.7
  }

  // Performance ratio
  const performanceRatio = systemEfficiency / config.efficiencyTypical

  // Exergy analysis
  // Solar radiation exergy ~93% of energy (due to sun temperature)
  const solarExergyFactor = 0.93
  const exergyInput = irradiance * area * solarExergyFactor
  const exergyOutput = systemPower // Electricity is pure exergy
  const exergyEfficiency = exergyOutput / exergyInput

  const outputs: SimulationOutput[] = [
    { name: 'bandGap', value: bandGap, unit: 'eV' },
    { name: 'shockleyQueisserLimit', value: sqLimit.efficiency, unit: '' },
    { name: 'cellTemperature', value: cellTemp, unit: 'C' },
    { name: 'temperatureDerating', value: tempEffect.derating, unit: '' },
    { name: 'moduleEfficiency', value: moduleEfficiency, unit: '', uncertainty: moduleEfficiency * 0.02 },
    { name: 'systemEfficiency', value: systemEfficiency, unit: '', uncertainty: systemEfficiency * 0.03 },
    { name: 'modulePower', value: modulePower, unit: 'W', uncertainty: modulePower * 0.05 },
    { name: 'systemPower', value: systemPower, unit: 'W', uncertainty: systemPower * 0.05 },
    { name: 'performanceRatio', value: performanceRatio, unit: '' },
    { name: 'exergyEfficiency', value: exergyEfficiency, unit: '' },
    { name: 'voc', value: sqLimit.voc, unit: 'V' },
    { name: 'jsc', value: sqLimit.jsc, unit: 'mA/cm2' },
  ]

  if (bifacialGain > 0) {
    outputs.push({ name: 'bifacialGain', value: bifacialGain, unit: 'W' })
    outputs.push({
      name: 'totalPower',
      value: systemPower + bifacialGain,
      unit: 'W',
    })
  }

  if (age > 0) {
    outputs.push({ name: 'degradationLoss', value: 1 - degradationFactor, unit: '' })
  }

  return {
    outputs,
    dataSourceInfo: {
      bandGapSource,
      solarResourceSource,
      isFallback,
    },
  }
}

/**
 * Calculate annual energy yield
 */
export async function calculateAnnualYield(
  technology: string,
  location: { lat: number; lon: number },
  systemCapacity: number // kW
): Promise<{
  annualEnergy: number // kWh
  capacityFactor: number
  specificYield: number // kWh/kWp
}> {
  const envDb = getEnvironmentalDatabase()
  const solarData = await envDb.getSolarResource(location.lat, location.lon)

  const config = PV_TECHNOLOGIES[technology] || PV_TECHNOLOGIES['mono-si']

  // Hours in a year
  const hoursPerYear = 8760

  // Peak sun hours per day
  const peakSunHours = solarData.ghi // Already in kWh/m2/day

  // System performance ratio (typical)
  const performanceRatio = 0.80

  // Annual energy
  const annualEnergy = systemCapacity * peakSunHours * 365 * performanceRatio

  // Capacity factor
  const capacityFactor = annualEnergy / (systemCapacity * hoursPerYear)

  // Specific yield
  const specificYield = annualEnergy / systemCapacity

  return { annualEnergy, capacityFactor, specificYield }
}

/**
 * Get available PV technologies
 */
export function getAvailablePVTechnologies(): Array<{
  id: string
  name: string
  material: string
  efficiencyRange: string
  status: string
}> {
  return Object.entries(PV_TECHNOLOGIES).map(([id, config]) => ({
    id,
    name: config.name,
    material: config.material,
    efficiencyRange: `${(config.efficiencyTypical * 100).toFixed(0)}-${(config.efficiencyRecord * 100).toFixed(0)}%`,
    status: config.degradationRate > 0.015 ? 'Emerging' : 'Commercial',
  }))
}
