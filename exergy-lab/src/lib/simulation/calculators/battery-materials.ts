/**
 * Battery Materials Calculator
 *
 * Physics-based battery materials calculations for energy storage simulations.
 * Includes capacity, degradation, ionic conductivity, and thermal stability predictions.
 *
 * @module simulation/calculators/battery-materials
 * @version 0.7.0
 */

import type { SimulationOutput } from '../types'

/**
 * Physical constants
 */
const CONSTANTS = {
  R: 8.314, // Universal gas constant J/(mol*K)
  F: 96485, // Faraday constant C/mol
  kB: 1.380649e-23, // Boltzmann constant J/K
}

/**
 * Battery material configuration data
 * Sources: Literature data from J. Electrochem. Soc., Nature Energy, etc.
 */
interface BatteryMaterialConfig {
  name: string
  type: 'cathode' | 'anode' | 'electrolyte'
  nominalVoltage: number // V vs Li/Li+
  theoreticalCapacity: number // mAh/g
  practicalCapacity: number // mAh/g (typical achievable)
  ionicConductivity: number // S/cm at 25C
  activationEnergy: number // kJ/mol for ion transport
  temperatureRange: [number, number] // K (operating range)
  cycleLifeTypical: number // cycles to 80% capacity
  degradationRate: number // %/cycle at 1C
  densityActive: number // g/cm3
  volumetricCapacity: number // mAh/cm3
}

const BATTERY_CONFIGS: Record<string, BatteryMaterialConfig> = {
  'LCO': {
    name: 'Lithium Cobalt Oxide (LiCoO2)',
    type: 'cathode',
    nominalVoltage: 3.9,
    theoreticalCapacity: 274,
    practicalCapacity: 140,
    ionicConductivity: 1e-4,
    activationEnergy: 35,
    temperatureRange: [263, 333],
    cycleLifeTypical: 500,
    degradationRate: 0.02,
    densityActive: 5.05,
    volumetricCapacity: 707,
  },
  'NMC-811': {
    name: 'LiNi0.8Mn0.1Co0.1O2',
    type: 'cathode',
    nominalVoltage: 3.8,
    theoreticalCapacity: 275,
    practicalCapacity: 200,
    ionicConductivity: 1e-4,
    activationEnergy: 40,
    temperatureRange: [263, 328],
    cycleLifeTypical: 800,
    degradationRate: 0.015,
    densityActive: 4.75,
    volumetricCapacity: 950,
  },
  'NMC-622': {
    name: 'LiNi0.6Mn0.2Co0.2O2',
    type: 'cathode',
    nominalVoltage: 3.85,
    theoreticalCapacity: 270,
    practicalCapacity: 175,
    ionicConductivity: 1e-4,
    activationEnergy: 38,
    temperatureRange: [263, 333],
    cycleLifeTypical: 1000,
    degradationRate: 0.012,
    densityActive: 4.70,
    volumetricCapacity: 823,
  },
  'LFP': {
    name: 'Lithium Iron Phosphate (LiFePO4)',
    type: 'cathode',
    nominalVoltage: 3.4,
    theoreticalCapacity: 170,
    practicalCapacity: 150,
    ionicConductivity: 1e-9,
    activationEnergy: 60,
    temperatureRange: [233, 353],
    cycleLifeTypical: 3000,
    degradationRate: 0.005,
    densityActive: 3.60,
    volumetricCapacity: 540,
  },
  'NCA': {
    name: 'LiNi0.8Co0.15Al0.05O2',
    type: 'cathode',
    nominalVoltage: 3.75,
    theoreticalCapacity: 279,
    practicalCapacity: 200,
    ionicConductivity: 1e-4,
    activationEnergy: 42,
    temperatureRange: [263, 323],
    cycleLifeTypical: 600,
    degradationRate: 0.018,
    densityActive: 4.85,
    volumetricCapacity: 970,
  },
  'LMO': {
    name: 'Lithium Manganese Oxide (LiMn2O4)',
    type: 'cathode',
    nominalVoltage: 4.0,
    theoreticalCapacity: 148,
    practicalCapacity: 120,
    ionicConductivity: 1e-5,
    activationEnergy: 45,
    temperatureRange: [253, 328],
    cycleLifeTypical: 400,
    degradationRate: 0.025,
    densityActive: 4.28,
    volumetricCapacity: 514,
  },
  'Graphite': {
    name: 'Graphite Anode',
    type: 'anode',
    nominalVoltage: 0.1,
    theoreticalCapacity: 372,
    practicalCapacity: 350,
    ionicConductivity: 1e-3,
    activationEnergy: 30,
    temperatureRange: [253, 333],
    cycleLifeTypical: 1500,
    degradationRate: 0.008,
    densityActive: 2.24,
    volumetricCapacity: 784,
  },
  'Si-C': {
    name: 'Silicon-Carbon Composite Anode',
    type: 'anode',
    nominalVoltage: 0.4,
    theoreticalCapacity: 1500,
    practicalCapacity: 600,
    ionicConductivity: 1e-4,
    activationEnergy: 45,
    temperatureRange: [263, 328],
    cycleLifeTypical: 300,
    degradationRate: 0.05,
    densityActive: 2.33,
    volumetricCapacity: 1398,
  },
  'LTO': {
    name: 'Lithium Titanate (Li4Ti5O12)',
    type: 'anode',
    nominalVoltage: 1.55,
    theoreticalCapacity: 175,
    practicalCapacity: 165,
    ionicConductivity: 1e-6,
    activationEnergy: 50,
    temperatureRange: [233, 353],
    cycleLifeTypical: 10000,
    degradationRate: 0.002,
    densityActive: 3.50,
    volumetricCapacity: 578,
  },
  'LLZO': {
    name: 'Li7La3Zr2O12 Solid Electrolyte',
    type: 'electrolyte',
    nominalVoltage: 0,
    theoreticalCapacity: 0,
    practicalCapacity: 0,
    ionicConductivity: 1e-4,
    activationEnergy: 30,
    temperatureRange: [233, 473],
    cycleLifeTypical: 5000,
    degradationRate: 0.003,
    densityActive: 5.10,
    volumetricCapacity: 0,
  },
  'LGPS': {
    name: 'Li10GeP2S12 Solid Electrolyte',
    type: 'electrolyte',
    nominalVoltage: 0,
    theoreticalCapacity: 0,
    practicalCapacity: 0,
    ionicConductivity: 1.2e-2,
    activationEnergy: 25,
    temperatureRange: [233, 353],
    cycleLifeTypical: 1000,
    degradationRate: 0.01,
    densityActive: 1.95,
    volumetricCapacity: 0,
  },
  'LiPF6-EC-DMC': {
    name: 'LiPF6 in EC:DMC (1M)',
    type: 'electrolyte',
    nominalVoltage: 0,
    theoreticalCapacity: 0,
    practicalCapacity: 0,
    ionicConductivity: 1.0e-2,
    activationEnergy: 15,
    temperatureRange: [233, 333],
    cycleLifeTypical: 2000,
    degradationRate: 0.008,
    densityActive: 1.30,
    volumetricCapacity: 0,
  },
}

/**
 * Battery calculation inputs
 */
export interface BatteryInputs {
  materialType?: string
  temperature?: number // K
  stateOfCharge?: number // 0-1
  cRate?: number // C-rate (1C = 1 hour discharge)
  cycleNumber?: number // current cycle number
  depthOfDischarge?: number // 0-1
  activeMaterialMass?: number // g
  electrodeArea?: number // cm2
}

/**
 * Calculate practical capacity based on C-rate and temperature
 * Uses Peukert's law and Arrhenius temperature correction
 */
export function calculateCapacity(inputs: BatteryInputs): {
  theoreticalCapacity: number
  practicalCapacity: number
  capacityAtCRate: number
  capacityRetention: number
  peukertExponent: number
  temperatureEffect: number
} {
  const materialType = inputs.materialType?.toUpperCase() || 'NMC-811'
  const config = BATTERY_CONFIGS[materialType] || BATTERY_CONFIGS['NMC-811']

  const T = inputs.temperature || 298
  const cRate = inputs.cRate || 1
  const cycleNumber = inputs.cycleNumber || 0

  // Peukert's law for C-rate effect
  // C_actual = C_nominal * (1/cRate)^(k-1)
  const peukertExponent = 1.1 // Typical for Li-ion
  const cRateFactor = Math.pow(1 / cRate, peukertExponent - 1)

  // Temperature effect using Arrhenius
  const Tref = 298 // Reference temperature
  const Ea = config.activationEnergy * 1000 // Convert to J/mol
  const temperatureFactor = Math.exp(-Ea / CONSTANTS.R * (1 / T - 1 / Tref))

  // Capacity fade from cycling
  const degradationPerCycle = config.degradationRate / 100
  const capacityRetention = Math.max(0.5, 1 - degradationPerCycle * cycleNumber)

  // Final capacity
  const capacityAtCRate = config.practicalCapacity * cRateFactor * temperatureFactor * capacityRetention

  return {
    theoreticalCapacity: config.theoreticalCapacity,
    practicalCapacity: config.practicalCapacity,
    capacityAtCRate: Math.max(0, capacityAtCRate),
    capacityRetention,
    peukertExponent,
    temperatureEffect: temperatureFactor,
  }
}

/**
 * Calculate cycle degradation and state of health
 */
export function calculateCycleDegradation(inputs: BatteryInputs): {
  stateOfHealth: number
  capacityLoss: number
  resistanceGrowth: number
  cyclesToEOL: number
  remainingCycles: number
  degradationMode: string
} {
  const materialType = inputs.materialType?.toUpperCase() || 'NMC-811'
  const config = BATTERY_CONFIGS[materialType] || BATTERY_CONFIGS['NMC-811']

  const cycleNumber = inputs.cycleNumber || 0
  const depthOfDischarge = inputs.depthOfDischarge || 0.8
  const T = inputs.temperature || 298

  // Base degradation rate adjusted for DOD
  // Higher DOD = faster degradation (roughly quadratic)
  const dodFactor = Math.pow(depthOfDischarge, 1.5)

  // Temperature acceleration (Arrhenius-like)
  // Degradation doubles roughly every 10K above 25C
  const Tref = 298
  const tempAcceleration = Math.pow(2, (T - Tref) / 10)

  // Effective degradation per cycle
  const effectiveDegradation = config.degradationRate * dodFactor * tempAcceleration / 100

  // State of health calculation
  const capacityLoss = effectiveDegradation * cycleNumber
  const stateOfHealth = Math.max(0, 1 - capacityLoss)

  // Resistance growth (typically 50% at EOL)
  const resistanceGrowth = 1 + 0.5 * capacityLoss / 0.2 // Normalized to 20% capacity loss

  // Cycles to end of life (80% SOH)
  const eolThreshold = 0.2 // 20% capacity loss
  const cyclesToEOL = Math.round(eolThreshold / effectiveDegradation)
  const remainingCycles = Math.max(0, cyclesToEOL - cycleNumber)

  // Dominant degradation mode
  let degradationMode = 'SEI growth'
  if (T > 318) degradationMode = 'Thermal decomposition'
  else if (depthOfDischarge > 0.9) degradationMode = 'Li plating risk'
  else if (config.type === 'anode' && materialType === 'Si-C') degradationMode = 'Volume expansion'

  return {
    stateOfHealth,
    capacityLoss,
    resistanceGrowth,
    cyclesToEOL,
    remainingCycles,
    degradationMode,
  }
}

/**
 * Calculate ionic conductivity with temperature dependence
 * Uses Arrhenius equation
 */
export function calculateIonicConductivity(inputs: BatteryInputs): {
  conductivity: number
  conductivityLog: number
  activationEnergy: number
  preExponential: number
  ionicResistivity: number
  ionTransferNumber: number
} {
  const materialType = inputs.materialType?.toUpperCase() || 'NMC-811'
  const config = BATTERY_CONFIGS[materialType] || BATTERY_CONFIGS['NMC-811']

  const T = inputs.temperature || 298
  const Tref = 298

  // Arrhenius equation: sigma = sigma0 * exp(-Ea/RT)
  const Ea = config.activationEnergy * 1000 // J/mol
  const sigma0 = config.ionicConductivity * Math.exp(Ea / (CONSTANTS.R * Tref)) // Pre-exponential

  const conductivity = sigma0 * Math.exp(-Ea / (CONSTANTS.R * T))

  // Ion transfer number (Li+ transference)
  // Typically 0.3-0.5 for liquid electrolytes, ~1 for solid
  const ionTransferNumber = config.type === 'electrolyte' && config.ionicConductivity > 1e-3 ? 0.4 : 0.95

  return {
    conductivity,
    conductivityLog: Math.log10(conductivity),
    activationEnergy: config.activationEnergy,
    preExponential: sigma0,
    ionicResistivity: 1 / conductivity,
    ionTransferNumber,
  }
}

/**
 * Calculate thermal runaway parameters
 */
export function calculateThermalRunaway(inputs: BatteryInputs): {
  onsetTemperature: number
  thermalRunawayTemp: number
  selfHeatingRate: number
  adiabaticRiseRate: number
  safetyMargin: number
  thermalStability: string
} {
  const materialType = inputs.materialType?.toUpperCase() || 'NMC-811'
  const config = BATTERY_CONFIGS[materialType] || BATTERY_CONFIGS['NMC-811']

  const T = inputs.temperature || 298
  const soc = inputs.stateOfCharge || 1.0

  // Onset temperature depends on material
  const baseOnsetTemp: Record<string, number> = {
    'LCO': 423,
    'NMC-811': 443,
    'NMC-622': 458,
    'LFP': 543,
    'NCA': 433,
    'LMO': 503,
    'Graphite': 393,
    'Si-C': 403,
    'LTO': 573,
    'LLZO': 673,
    'LGPS': 473,
    'LiPF6-EC-DMC': 363,
  }

  const onsetTemperature = baseOnsetTemp[materialType] || 450

  // SOC effect - higher SOC = lower onset temperature
  const socEffect = 30 * (soc - 0.5)
  const adjustedOnset = onsetTemperature - socEffect

  // Thermal runaway temperature (peak)
  const thermalRunawayTemp = adjustedOnset + 200

  // Self-heating rate at current temperature (mW/Ah)
  const activationEnergy = 100000 // J/mol typical for decomposition
  const selfHeatingRate = 1e-3 * Math.exp(-activationEnergy / (CONSTANTS.R * T))

  // Adiabatic temperature rise rate (K/min)
  const adiabaticRiseRate = selfHeatingRate * 60 * 1000 // Approximate

  // Safety margin
  const safetyMargin = adjustedOnset - T

  // Thermal stability classification
  let thermalStability: string
  if (safetyMargin > 150) thermalStability = 'Excellent'
  else if (safetyMargin > 100) thermalStability = 'Good'
  else if (safetyMargin > 50) thermalStability = 'Moderate'
  else if (safetyMargin > 20) thermalStability = 'Caution'
  else thermalStability = 'Critical'

  return {
    onsetTemperature: adjustedOnset,
    thermalRunawayTemp,
    selfHeatingRate,
    adiabaticRiseRate,
    safetyMargin,
    thermalStability,
  }
}

/**
 * Calculate open circuit voltage using Nernst equation
 */
export function calculateOpenCircuitVoltage(inputs: BatteryInputs): {
  ocv: number
  nominalVoltage: number
  socVoltageSlope: number
  entropyCoefficient: number
  hysteresis: number
} {
  const materialType = inputs.materialType?.toUpperCase() || 'NMC-811'
  const config = BATTERY_CONFIGS[materialType] || BATTERY_CONFIGS['NMC-811']

  const T = inputs.temperature || 298
  const soc = inputs.stateOfCharge || 0.5

  // Simplified OCV-SOC relationship
  // OCV = V_nom + slope * (SOC - 0.5) + temperature correction
  const socVoltageSlope = 0.8 // V per unit SOC (typical)
  const ocvBase = config.nominalVoltage + socVoltageSlope * (soc - 0.5)

  // Temperature coefficient (entropy effect)
  const entropyCoefficient = -0.0004 // V/K (typical for Li-ion)
  const tempCorrection = entropyCoefficient * (T - 298)

  const ocv = ocvBase + tempCorrection

  // Hysteresis (charge vs discharge)
  const hysteresis = 0.02 // V (typical)

  return {
    ocv,
    nominalVoltage: config.nominalVoltage,
    socVoltageSlope,
    entropyCoefficient,
    hysteresis,
  }
}

/**
 * Calculate energy density
 */
export function calculateEnergyDensity(inputs: BatteryInputs): {
  gravimetricEnergy: number
  volumetricEnergy: number
  specificPower: number
  cellVoltage: number
} {
  const materialType = inputs.materialType?.toUpperCase() || 'NMC-811'
  const config = BATTERY_CONFIGS[materialType] || BATTERY_CONFIGS['NMC-811']

  // Skip for electrolytes
  if (config.type === 'electrolyte') {
    return {
      gravimetricEnergy: 0,
      volumetricEnergy: 0,
      specificPower: 0,
      cellVoltage: 0,
    }
  }

  const capacityResult = calculateCapacity(inputs)

  // Gravimetric energy density (Wh/kg)
  const gravimetricEnergy = capacityResult.capacityAtCRate * config.nominalVoltage / 1000

  // Volumetric energy density (Wh/L)
  const volumetricEnergy = gravimetricEnergy * config.densityActive * 1000

  // Specific power (W/kg) - assumes 1C discharge
  const specificPower = gravimetricEnergy * (inputs.cRate || 1)

  return {
    gravimetricEnergy,
    volumetricEnergy,
    specificPower,
    cellVoltage: config.nominalVoltage,
  }
}

/**
 * Main battery materials calculation function
 */
export async function calculateBatteryMaterials(
  inputs: BatteryInputs
): Promise<{
  outputs: SimulationOutput[]
  dataSourceInfo: {
    source: string
    isFallback: boolean
  }
}> {
  const materialType = inputs.materialType?.toUpperCase() || 'NMC-811'
  const config = BATTERY_CONFIGS[materialType] || BATTERY_CONFIGS['NMC-811']

  const capacityResult = calculateCapacity(inputs)
  const degradationResult = calculateCycleDegradation(inputs)
  const conductivityResult = calculateIonicConductivity(inputs)
  const thermalResult = calculateThermalRunaway(inputs)
  const ocvResult = calculateOpenCircuitVoltage(inputs)
  const energyResult = calculateEnergyDensity(inputs)

  const outputs: SimulationOutput[] = [
    { name: 'theoreticalCapacity', value: capacityResult.theoreticalCapacity, unit: 'mAh/g' },
    { name: 'practicalCapacity', value: capacityResult.practicalCapacity, unit: 'mAh/g' },
    { name: 'capacityAtCRate', value: capacityResult.capacityAtCRate, unit: 'mAh/g', uncertainty: capacityResult.capacityAtCRate * 0.05 },
    { name: 'stateOfHealth', value: degradationResult.stateOfHealth * 100, unit: '%' },
    { name: 'remainingCycles', value: degradationResult.remainingCycles, unit: 'cycles' },
    { name: 'ionicConductivity', value: conductivityResult.conductivity, unit: 'S/cm' },
    { name: 'ionicConductivityLog', value: conductivityResult.conductivityLog, unit: 'log(S/cm)' },
    { name: 'activationEnergy', value: conductivityResult.activationEnergy, unit: 'kJ/mol' },
    { name: 'thermalOnsetTemp', value: thermalResult.onsetTemperature, unit: 'K' },
    { name: 'thermalOnsetTempCelsius', value: thermalResult.onsetTemperature - 273.15, unit: 'C' },
    { name: 'safetyMargin', value: thermalResult.safetyMargin, unit: 'K' },
    { name: 'openCircuitVoltage', value: ocvResult.ocv, unit: 'V', uncertainty: 0.01 },
    { name: 'nominalVoltage', value: config.nominalVoltage, unit: 'V' },
  ]

  // Add energy density outputs for electrode materials
  if (config.type !== 'electrolyte') {
    outputs.push(
      { name: 'gravimetricEnergyDensity', value: energyResult.gravimetricEnergy, unit: 'Wh/kg' },
      { name: 'volumetricEnergyDensity', value: energyResult.volumetricEnergy, unit: 'Wh/L' },
      { name: 'specificPower', value: energyResult.specificPower, unit: 'W/kg' }
    )
  }

  return {
    outputs,
    dataSourceInfo: {
      source: 'embedded-battery-data',
      isFallback: true,
    },
  }
}

/**
 * Get available battery materials
 */
export function getAvailableBatteryMaterials(): Array<{
  id: string
  name: string
  type: string
  voltage: string
  capacity: string
}> {
  return Object.entries(BATTERY_CONFIGS).map(([id, config]) => ({
    id,
    name: config.name,
    type: config.type,
    voltage: config.nominalVoltage > 0 ? `${config.nominalVoltage.toFixed(2)} V` : 'N/A',
    capacity: config.practicalCapacity > 0 ? `${config.practicalCapacity} mAh/g` : 'N/A',
  }))
}
