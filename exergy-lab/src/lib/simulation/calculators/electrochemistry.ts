/**
 * Electrochemistry Calculator
 *
 * Physics-based calculations for electrochemical systems.
 * Implements Butler-Volmer kinetics and Nernst equation with real parameters.
 */

import { getParameterResolver } from '../data-sources'
import type { SimulationOutput } from '../types'

/**
 * Physical constants
 */
const CONSTANTS = {
  R: 8.314, // Universal gas constant J/(mol·K)
  F: 96485, // Faraday constant C/mol
  k: 1.381e-23, // Boltzmann constant J/K
}

/**
 * Standard electrode potentials (V vs SHE)
 */
const STANDARD_POTENTIALS: Record<string, number> = {
  'H2/H+': 0.0,
  'O2/OH-': 0.401,
  'O2/H2O': 1.229,
  'Cl2/Cl-': 1.358,
  'Zn/Zn2+': -0.763,
  'Fe/Fe2+': -0.44,
  'Cu/Cu2+': 0.337,
  'Ag/Ag+': 0.7996,
  'Li/Li+': -3.04,
  'Na/Na+': -2.71,
}

/**
 * Electrolyzer type configurations
 */
interface ElectrolyzerConfig {
  name: string
  typicalVoltage: number // Operating voltage at reference conditions
  cellResistance: number // Ohmic resistance (Ohm·cm2)
  exchangeCurrentDensity: number // i0 (A/cm2)
  tafelSlope: number // mV/decade
  temperatureOptimal: number // K
  faradaicEfficiencyBase: number
}

const ELECTROLYZER_CONFIGS: Record<string, ElectrolyzerConfig> = {
  'alkaline': {
    name: 'Alkaline Electrolyzer',
    typicalVoltage: 1.8,
    cellResistance: 0.25,
    exchangeCurrentDensity: 1e-6,
    tafelSlope: 120,
    temperatureOptimal: 353, // 80C
    faradaicEfficiencyBase: 0.98,
  },
  'pem': {
    name: 'PEM Electrolyzer',
    typicalVoltage: 1.7,
    cellResistance: 0.15,
    exchangeCurrentDensity: 1e-3,
    tafelSlope: 60,
    temperatureOptimal: 333, // 60C
    faradaicEfficiencyBase: 0.99,
  },
  'soec': {
    name: 'Solid Oxide Electrolyzer',
    typicalVoltage: 1.3, // Lower due to high temperature
    cellResistance: 0.10,
    exchangeCurrentDensity: 1e-4,
    tafelSlope: 80,
    temperatureOptimal: 1073, // 800C
    faradaicEfficiencyBase: 0.95,
  },
  'aem': {
    name: 'AEM Electrolyzer',
    typicalVoltage: 1.85,
    cellResistance: 0.20,
    exchangeCurrentDensity: 5e-5,
    tafelSlope: 90,
    temperatureOptimal: 323, // 50C
    faradaicEfficiencyBase: 0.97,
  },
}

/**
 * Electrochemistry calculation inputs
 */
export interface ElectrochemistryInputs {
  electrolyzerType?: 'alkaline' | 'pem' | 'soec' | 'aem'
  temperature?: number // K
  pressure?: number // atm
  currentDensity?: number // A/cm2
  cellArea?: number // cm2
  catalystMaterial?: string
}

/**
 * Calculate reversible (Nernst) voltage for water electrolysis
 */
export function calculateNernstVoltage(
  temperature: number,
  pressure: number = 1
): { voltage: number; uncertainty: number } {
  // Standard reversible potential for water electrolysis
  const E0 = 1.229 // V at 25C, 1 atm

  // Temperature correction (Gibbs free energy variation)
  const T0 = 298.15 // Reference temperature (K)
  const dS = -163.4 // Entropy change J/(mol·K) for H2O -> H2 + 0.5 O2
  const temperatureCorrection = -(dS / (2 * CONSTANTS.F)) * (temperature - T0)

  // Pressure correction (Nernst equation)
  const nernstCorrection = (CONSTANTS.R * temperature / (2 * CONSTANTS.F)) * Math.log(pressure)

  const voltage = E0 + temperatureCorrection + nernstCorrection

  return {
    voltage: Math.max(1.0, voltage), // Physical minimum
    uncertainty: 0.005, // 5mV uncertainty
  }
}

/**
 * Calculate thermoneutral voltage
 */
export function calculateThermoneutralVoltage(temperature: number): number {
  // At thermoneutral voltage, heat generated = heat required
  // At 25C, this is 1.48V. Varies slightly with temperature.
  const E_tn0 = 1.481
  const tempEffect = -0.0003 * (temperature - 298.15)

  return E_tn0 + tempEffect
}

/**
 * Calculate overpotentials using Butler-Volmer kinetics
 */
export function calculateOverpotentials(
  currentDensity: number,
  config: ElectrolyzerConfig,
  temperature: number
): {
  activation: number
  ohmic: number
  concentration: number
  total: number
} {
  // Activation overpotential (Tafel equation for high overpotentials)
  // eta_act = (RT/alphaF) * ln(j/j0) = tafelSlope * log10(j/j0)
  const i0 = config.exchangeCurrentDensity

  // Temperature-corrected Tafel slope
  const tafelSlope = config.tafelSlope * (temperature / 298.15)

  // Activation overpotential
  let activation = 0
  if (currentDensity > i0) {
    activation = (tafelSlope / 1000) * Math.log10(currentDensity / i0)
  }

  // Ohmic overpotential (Ohm's law)
  const ohmic = config.cellResistance * currentDensity

  // Concentration overpotential
  // Becomes significant at high current densities
  const limitingCurrentDensity = 2.0 // A/cm2 typical
  const concentrationFactor = currentDensity / limitingCurrentDensity

  let concentration = 0
  if (concentrationFactor < 0.95) {
    concentration = -(CONSTANTS.R * temperature / (2 * CONSTANTS.F)) *
      Math.log(1 - concentrationFactor)
  } else {
    // Near limiting current density
    concentration = 0.2 // Large but finite
  }

  return {
    activation,
    ohmic,
    concentration,
    total: activation + ohmic + concentration,
  }
}

/**
 * Calculate electrochemical cell performance
 */
export async function calculateElectrochemicalCell(
  inputs: ElectrochemistryInputs
): Promise<{
  outputs: SimulationOutput[]
  dataSourceInfo: {
    faradaicEfficiencySource: string
    isFallback: boolean
  }
}> {
  const resolver = getParameterResolver()

  // Get configuration
  const electrolyzerType = inputs.electrolyzerType || 'pem'
  const config = ELECTROLYZER_CONFIGS[electrolyzerType]

  // Operating conditions
  const temperature = inputs.temperature || config.temperatureOptimal
  const pressure = inputs.pressure || 1
  const currentDensity = inputs.currentDensity || 0.5
  const cellArea = inputs.cellArea || 100

  // Calculate voltages
  const nernst = calculateNernstVoltage(temperature, pressure)
  const thermoneutral = calculateThermoneutralVoltage(temperature)
  const overpotentials = calculateOverpotentials(currentDensity, config, temperature)

  const cellVoltage = nernst.voltage + overpotentials.total

  // Get real faradaic efficiency from parameter resolver
  const faradaicResult = await resolver.resolveFaradaicEfficiency({
    electrolyteType: electrolyzerType,
    catalystMaterial: inputs.catalystMaterial,
    currentDensity,
    temperature,
  })

  const faradaicEfficiency = faradaicResult.value

  // Calculate efficiencies
  const voltageEfficiency = nernst.voltage / cellVoltage
  const thermalEfficiency = thermoneutral / cellVoltage
  const totalEfficiency = voltageEfficiency * faradaicEfficiency

  // Hydrogen production rate
  // n = (I * eta_F) / (n_e * F), where n_e = 2 for H2
  const current = currentDensity * cellArea // A
  const hydrogenMolarRate = (current * faradaicEfficiency) / (2 * CONSTANTS.F) // mol/s
  const hydrogenVolumeRate = hydrogenMolarRate * 22.4 * 3600 // L/h at STP

  // Power consumption
  const power = current * cellVoltage // W
  const specificEnergy = (cellVoltage * 2 * CONSTANTS.F) / (faradaicEfficiency * 3600000) // kWh/mol
  const energyPerKgH2 = specificEnergy * 1000 / 2.016 // kWh/kg H2

  // Exergy efficiency
  const exergyInputElectric = power // Electrical work is pure exergy
  const exergyOutputH2 = hydrogenMolarRate * 236000 // Higher heating value ~236 kJ/mol
  const exergyEfficiency = exergyOutputH2 / exergyInputElectric

  const outputs: SimulationOutput[] = [
    { name: 'cellVoltage', value: cellVoltage, unit: 'V', uncertainty: 0.02 },
    { name: 'reversibleVoltage', value: nernst.voltage, unit: 'V', uncertainty: nernst.uncertainty },
    { name: 'thermoneutralVoltage', value: thermoneutral, unit: 'V' },
    { name: 'activationOverpotential', value: overpotentials.activation, unit: 'V' },
    { name: 'ohmicOverpotential', value: overpotentials.ohmic, unit: 'V' },
    { name: 'concentrationOverpotential', value: overpotentials.concentration, unit: 'V' },
    { name: 'voltageEfficiency', value: voltageEfficiency, unit: '', uncertainty: 0.02 },
    { name: 'faradaicEfficiency', value: faradaicEfficiency, unit: '', uncertainty: faradaicResult.uncertainty },
    { name: 'totalEfficiency', value: totalEfficiency, unit: '', uncertainty: 0.03 },
    { name: 'thermalEfficiency', value: thermalEfficiency, unit: '' },
    { name: 'exergyEfficiency', value: Math.min(exergyEfficiency, 1), unit: '' },
    { name: 'hydrogenRate', value: hydrogenVolumeRate, unit: 'L/h', uncertainty: hydrogenVolumeRate * 0.05 },
    { name: 'power', value: power, unit: 'W' },
    { name: 'specificEnergy', value: energyPerKgH2, unit: 'kWh/kg' },
  ]

  return {
    outputs,
    dataSourceInfo: {
      faradaicEfficiencySource: faradaicResult.source,
      isFallback: faradaicResult.isFallback,
    },
  }
}

/**
 * Calculate fuel cell performance
 */
export function calculateFuelCellPerformance(
  currentDensity: number,
  temperature: number = 353,
  pressure: number = 1,
  fuelCellType: 'pem' | 'sofc' | 'afc' = 'pem'
): {
  voltage: number
  power: number
  efficiency: number
} {
  // Open circuit voltage (Nernst)
  const E0_fc = 1.229
  const ocv = E0_fc + (CONSTANTS.R * temperature / (4 * CONSTANTS.F)) * Math.log(pressure ** 1.5)

  // Fuel cell losses (simplified)
  const activationLoss = 0.05 + 0.03 * Math.log(currentDensity + 0.01)
  const ohmicLoss = 0.1 * currentDensity
  const concentrationLoss = 0.02 * (currentDensity / 2) ** 2

  const voltage = ocv - activationLoss - ohmicLoss - concentrationLoss

  // Power density
  const power = Math.max(0, voltage * currentDensity) // W/cm2

  // Efficiency (HHV basis)
  const efficiency = voltage / 1.481

  return { voltage, power, efficiency }
}

/**
 * Generate polarization curve data
 */
export function generatePolarizationCurve(
  electrolyzerType: 'alkaline' | 'pem' | 'soec' | 'aem' = 'pem',
  temperature: number = 333,
  pressure: number = 1,
  points: number = 20
): Array<{
  currentDensity: number
  voltage: number
  power: number
}> {
  const config = ELECTROLYZER_CONFIGS[electrolyzerType]
  const nernst = calculateNernstVoltage(temperature, pressure)

  const curve: Array<{ currentDensity: number; voltage: number; power: number }> = []

  for (let i = 0; i <= points; i++) {
    const currentDensity = (i / points) * 2.0 // 0 to 2 A/cm2
    const overpotentials = calculateOverpotentials(currentDensity, config, temperature)
    const voltage = nernst.voltage + overpotentials.total
    const power = voltage * currentDensity

    curve.push({ currentDensity, voltage, power })
  }

  return curve
}
