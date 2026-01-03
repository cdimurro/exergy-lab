/**
 * Catalyst Performance Calculator
 *
 * Physics-based catalyst and reaction kinetics calculations.
 * Includes Arrhenius kinetics, turnover frequency, selectivity modeling.
 *
 * @module simulation/calculators/catalyst-performance
 * @version 0.7.0
 */

import type { SimulationOutput } from '../types'

/**
 * Physical constants
 */
const CONSTANTS = {
  R: 8.314, // Universal gas constant J/(mol*K)
  kB: 1.380649e-23, // Boltzmann constant J/K
  h: 6.62607e-34, // Planck constant J*s
  NA: 6.022e23, // Avogadro's number 1/mol
}

/**
 * Catalyst configuration data
 * Source: Catalysis literature, kinetics databases
 */
interface CatalystConfig {
  name: string
  activationEnergy: number // kJ/mol
  preExponentialFactor: number // 1/s (for first-order)
  typicalTOF: number // 1/s at standard conditions
  selectivity: number // Primary product selectivity (0-1)
  temperatureRange: [number, number] // K
  deactivationRate: number // 1/h
  reactionType: string
}

const CATALYST_CONFIGS: Record<string, CatalystConfig> = {
  // Heterogeneous catalysts
  'Pt/Al2O3-HDS': {
    name: 'Pt/Al2O3 Hydrodesulfurization',
    activationEnergy: 120,
    preExponentialFactor: 1e13,
    typicalTOF: 0.1,
    selectivity: 0.95,
    temperatureRange: [573, 723],
    deactivationRate: 0.01,
    reactionType: 'hydrodesulfurization',
  },
  'Ni/Al2O3-methanation': {
    name: 'Ni/Al2O3 Methanation',
    activationEnergy: 85,
    preExponentialFactor: 1e11,
    typicalTOF: 1.0,
    selectivity: 0.98,
    temperatureRange: [473, 673],
    deactivationRate: 0.005,
    reactionType: 'methanation',
  },
  'Fe-FT': {
    name: 'Fe Fischer-Tropsch',
    activationEnergy: 100,
    preExponentialFactor: 1e12,
    typicalTOF: 0.05,
    selectivity: 0.75,
    temperatureRange: [493, 623],
    deactivationRate: 0.02,
    reactionType: 'fischer-tropsch',
  },
  'Co-FT': {
    name: 'Co Fischer-Tropsch',
    activationEnergy: 95,
    preExponentialFactor: 1e12,
    typicalTOF: 0.1,
    selectivity: 0.85,
    temperatureRange: [473, 573],
    deactivationRate: 0.015,
    reactionType: 'fischer-tropsch',
  },
  'ZSM-5-cracking': {
    name: 'ZSM-5 Zeolite Cracking',
    activationEnergy: 60,
    preExponentialFactor: 1e10,
    typicalTOF: 10,
    selectivity: 0.70,
    temperatureRange: [673, 823],
    deactivationRate: 0.05,
    reactionType: 'cracking',
  },
  'Cu/ZnO/Al2O3-MeOH': {
    name: 'Cu/ZnO/Al2O3 Methanol Synthesis',
    activationEnergy: 70,
    preExponentialFactor: 1e10,
    typicalTOF: 0.5,
    selectivity: 0.99,
    temperatureRange: [493, 573],
    deactivationRate: 0.008,
    reactionType: 'methanol-synthesis',
  },
  'V2O5-oxidation': {
    name: 'V2O5 Selective Oxidation',
    activationEnergy: 80,
    preExponentialFactor: 1e11,
    typicalTOF: 0.3,
    selectivity: 0.88,
    temperatureRange: [573, 723],
    deactivationRate: 0.012,
    reactionType: 'selective-oxidation',
  },
  'Pd/C-hydrogenation': {
    name: 'Pd/C Hydrogenation',
    activationEnergy: 45,
    preExponentialFactor: 1e9,
    typicalTOF: 5.0,
    selectivity: 0.95,
    temperatureRange: [298, 423],
    deactivationRate: 0.003,
    reactionType: 'hydrogenation',
  },
  // Homogeneous catalysts
  'Wilkinson': {
    name: 'Wilkinson Rh Catalyst',
    activationEnergy: 55,
    preExponentialFactor: 1e8,
    typicalTOF: 100,
    selectivity: 0.99,
    temperatureRange: [298, 373],
    deactivationRate: 0.001,
    reactionType: 'homogeneous-hydrogenation',
  },
  'Grubbs': {
    name: 'Grubbs Ru Metathesis',
    activationEnergy: 85,
    preExponentialFactor: 1e10,
    typicalTOF: 50,
    selectivity: 0.97,
    temperatureRange: [298, 353],
    deactivationRate: 0.02,
    reactionType: 'metathesis',
  },
  // Enzyme-like
  'enzyme-generic': {
    name: 'Generic Enzyme',
    activationEnergy: 40,
    preExponentialFactor: 1e7,
    typicalTOF: 1000,
    selectivity: 0.999,
    temperatureRange: [293, 323],
    deactivationRate: 0.1,
    reactionType: 'enzymatic',
  },
}

/**
 * Catalyst calculation inputs
 */
export interface CatalystInputs {
  catalystType?: string
  temperature?: number // K
  pressure?: number // bar
  reactantConcentration?: number // mol/L
  activeSiteDensity?: number // sites/g
  catalystMass?: number // g
  timeOnStream?: number // hours
  customEa?: number // kJ/mol - override activation energy
  customA?: number // 1/s - override pre-exponential
}

/**
 * Calculate rate constant using Arrhenius equation
 * k = A * exp(-Ea/RT)
 */
export function calculateRateConstant(
  activationEnergy: number, // kJ/mol
  preExponentialFactor: number, // 1/s
  temperature: number // K
): {
  rateConstant: number
  halfLife: number
  reactionTimescale: string
} {
  const Ea = activationEnergy * 1000 // Convert to J/mol
  const k = preExponentialFactor * Math.exp(-Ea / (CONSTANTS.R * temperature))

  // Half-life for first-order reaction
  const halfLife = Math.log(2) / k

  // Classify timescale
  let timescale: string
  if (halfLife < 1e-6) timescale = 'microseconds'
  else if (halfLife < 1e-3) timescale = 'milliseconds'
  else if (halfLife < 1) timescale = 'seconds'
  else if (halfLife < 60) timescale = 'minutes'
  else if (halfLife < 3600) timescale = 'hours'
  else timescale = 'days'

  return {
    rateConstant: k,
    halfLife,
    reactionTimescale: timescale,
  }
}

/**
 * Calculate turnover frequency (TOF)
 */
export function calculateTurnoverFrequency(
  rateConstant: number, // 1/s
  reactantConcentration: number, // mol/L
  activeSiteDensity: number, // sites/g
  catalystMass: number // g
): {
  TOF: number // 1/s per site
  TON: number // turnover number (at 1 hour)
  specificActivity: number // mol/(g*s)
} {
  // Reaction rate (mol/L/s) for first-order kinetics
  const reactionRate = rateConstant * reactantConcentration

  // Total active sites
  const totalSites = activeSiteDensity * catalystMass / CONSTANTS.NA

  // TOF = rate / sites (reactions per site per second)
  const TOF = reactionRate / (totalSites / 1000) // Normalize to L

  // Turnover number after 1 hour
  const TON = TOF * 3600

  // Specific activity
  const specificActivity = reactionRate / catalystMass

  return {
    TOF,
    TON,
    specificActivity,
  }
}

/**
 * Calculate activation parameters from transition state theory
 */
export function calculateActivationParameters(
  activationEnergy: number, // kJ/mol
  preExponentialFactor: number, // 1/s
  temperature: number // K
): {
  deltaGActivation: number // kJ/mol
  deltaHActivation: number // kJ/mol
  deltaS_Activation: number // J/(mol*K)
  transmissionCoefficient: number
} {
  // Eyring equation: k = (kB*T/h) * exp(-DeltaG/RT)
  // From Arrhenius: A = (kB*T/h) * exp(DeltaS/R)

  // Enthalpy of activation (approximately equal to Ea - RT)
  const deltaHActivation = activationEnergy - CONSTANTS.R * temperature / 1000

  // Entropy of activation from pre-exponential
  const eyringPrefactor = (CONSTANTS.kB * temperature) / CONSTANTS.h
  const deltaS_Activation = CONSTANTS.R * Math.log(preExponentialFactor / eyringPrefactor)

  // Free energy of activation
  const deltaGActivation = deltaHActivation - temperature * deltaS_Activation / 1000

  // Transmission coefficient (typically near 1 for most reactions)
  const kappa = Math.min(1, preExponentialFactor / eyringPrefactor)

  return {
    deltaGActivation,
    deltaHActivation,
    deltaS_Activation,
    transmissionCoefficient: kappa,
  }
}

/**
 * Calculate catalyst deactivation
 */
export function calculateDeactivation(
  deactivationRate: number, // 1/h
  timeOnStream: number, // hours
  deactivationOrder: number = 1
): {
  activityRetained: number // fraction
  timeToHalfActivity: number // hours
  timeToReplacement: number // hours (10% activity)
} {
  // First-order deactivation: a = exp(-kd * t)
  // nth order: a = (1 + (n-1)*kd*t)^(1/(1-n))

  let activityRetained: number
  if (deactivationOrder === 1) {
    activityRetained = Math.exp(-deactivationRate * timeOnStream)
  } else {
    activityRetained = Math.pow(1 + (deactivationOrder - 1) * deactivationRate * timeOnStream, 1 / (1 - deactivationOrder))
  }

  // Time to half activity
  const timeToHalfActivity = Math.log(2) / deactivationRate

  // Time to 10% activity (replacement threshold)
  const timeToReplacement = Math.log(10) / deactivationRate

  return {
    activityRetained: Math.max(0, activityRetained),
    timeToHalfActivity,
    timeToReplacement,
  }
}

/**
 * Calculate selectivity using Anderson-Schulz-Flory distribution
 * (for polymerization/chain growth reactions)
 */
export function calculateASFSelectivity(
  chainGrowthProbability: number // alpha, 0-1
): {
  alpha: number
  meanChainLength: number
  C1Selectivity: number
  C2toC4: number
  C5toC11: number
  C12plus: number
} {
  const alpha = Math.min(0.99, Math.max(0.01, chainGrowthProbability))

  // Mean chain length
  const meanChainLength = 1 / (1 - alpha)

  // Product distribution W_n = n * (1-alpha)^2 * alpha^(n-1)
  const W = (n: number) => n * Math.pow(1 - alpha, 2) * Math.pow(alpha, n - 1)

  // Sum selectivities for ranges
  const C1Selectivity = W(1)

  let C2toC4 = 0
  for (let n = 2; n <= 4; n++) C2toC4 += W(n)

  let C5toC11 = 0
  for (let n = 5; n <= 11; n++) C5toC11 += W(n)

  // C12+ is the remainder
  const C12plus = 1 - C1Selectivity - C2toC4 - C5toC11

  return {
    alpha,
    meanChainLength,
    C1Selectivity,
    C2toC4,
    C5toC11,
    C12plus: Math.max(0, C12plus),
  }
}

/**
 * Calculate space velocity parameters
 */
export function calculateSpaceVelocity(
  volumetricFlowRate: number, // L/h
  catalystVolume: number, // L
  catalystMass: number // g
): {
  GHSV: number // 1/h (gas hourly space velocity)
  LHSV: number // 1/h (liquid hourly space velocity)
  WHSV: number // g/(g*h) (weight hourly space velocity)
  residenceTime: number // s
} {
  const GHSV = volumetricFlowRate / catalystVolume
  const LHSV = GHSV // Same for liquids
  const WHSV = volumetricFlowRate * 1000 / catalystMass // Assuming 1 g/mL liquid density

  const residenceTime = (catalystVolume / volumetricFlowRate) * 3600 // Convert to seconds

  return {
    GHSV,
    LHSV,
    WHSV,
    residenceTime,
  }
}

/**
 * Main catalyst performance calculation function
 */
export async function calculateCatalystPerformance(
  inputs: CatalystInputs
): Promise<{
  outputs: SimulationOutput[]
  dataSourceInfo: {
    source: string
    isFallback: boolean
  }
}> {
  const catalystType = inputs.catalystType || 'Pd/C-hydrogenation'
  const config = CATALYST_CONFIGS[catalystType] || CATALYST_CONFIGS['Pd/C-hydrogenation']

  const T = inputs.temperature || (config.temperatureRange[0] + config.temperatureRange[1]) / 2
  const Ea = inputs.customEa || config.activationEnergy
  const A = inputs.customA || config.preExponentialFactor
  const concentration = inputs.reactantConcentration || 1.0 // mol/L
  const siteDensity = inputs.activeSiteDensity || 1e19 // sites/g
  const catalystMass = inputs.catalystMass || 1.0 // g
  const timeOnStream = inputs.timeOnStream || 0

  // Calculate rate constant
  const rateResult = calculateRateConstant(Ea, A, T)

  // Calculate TOF
  const tofResult = calculateTurnoverFrequency(
    rateResult.rateConstant,
    concentration,
    siteDensity,
    catalystMass
  )

  // Calculate activation parameters
  const activationResult = calculateActivationParameters(Ea, A, T)

  // Calculate deactivation
  const deactivationResult = calculateDeactivation(
    config.deactivationRate,
    timeOnStream
  )

  const outputs: SimulationOutput[] = [
    { name: 'temperature', value: T, unit: 'K' },
    { name: 'temperatureCelsius', value: T - 273.15, unit: 'C' },
    { name: 'activationEnergy', value: Ea, unit: 'kJ/mol', uncertainty: Ea * 0.1 },
    { name: 'rateConstant', value: rateResult.rateConstant, unit: '1/s' },
    { name: 'halfLife', value: rateResult.halfLife, unit: 's' },
    { name: 'turnoverFrequency', value: tofResult.TOF, unit: '1/s' },
    { name: 'turnoverNumber1h', value: tofResult.TON, unit: '' },
    { name: 'specificActivity', value: tofResult.specificActivity, unit: 'mol/(g*s)' },
    { name: 'selectivity', value: config.selectivity * 100, unit: '%' },
    { name: 'deltaGActivation', value: activationResult.deltaGActivation, unit: 'kJ/mol' },
    { name: 'deltaHActivation', value: activationResult.deltaHActivation, unit: 'kJ/mol' },
    { name: 'deltaSActivation', value: activationResult.deltaS_Activation, unit: 'J/(mol*K)' },
  ]

  // Add deactivation info if time on stream specified
  if (timeOnStream > 0) {
    outputs.push(
      { name: 'activityRetained', value: deactivationResult.activityRetained * 100, unit: '%' },
      { name: 'timeToHalfActivity', value: deactivationResult.timeToHalfActivity, unit: 'h' },
      { name: 'timeToReplacement', value: deactivationResult.timeToReplacement, unit: 'h' }
    )
  }

  return {
    outputs,
    dataSourceInfo: {
      source: 'embedded-catalyst-data',
      isFallback: true,
    },
  }
}

/**
 * Get available catalyst types
 */
export function getAvailableCatalysts(): Array<{
  id: string
  name: string
  reactionType: string
  tempRange: string
}> {
  return Object.entries(CATALYST_CONFIGS).map(([id, config]) => ({
    id,
    name: config.name,
    reactionType: config.reactionType,
    tempRange: `${config.temperatureRange[0] - 273}C - ${config.temperatureRange[1] - 273}C`,
  }))
}

/**
 * Calculate Arrhenius plot data for visualization
 */
export function generateArrheniusPlot(
  activationEnergy: number, // kJ/mol
  preExponentialFactor: number, // 1/s
  tempMin: number = 300, // K
  tempMax: number = 800 // K
): Array<{ temperature: number; inverseT: number; lnK: number }> {
  const points: Array<{ temperature: number; inverseT: number; lnK: number }> = []
  const numPoints = 20

  for (let i = 0; i <= numPoints; i++) {
    const T = tempMin + (i / numPoints) * (tempMax - tempMin)
    const k = preExponentialFactor * Math.exp(-activationEnergy * 1000 / (CONSTANTS.R * T))

    points.push({
      temperature: T,
      inverseT: 1000 / T,
      lnK: Math.log(k),
    })
  }

  return points
}
