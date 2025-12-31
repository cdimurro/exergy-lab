/**
 * Thermodynamics Calculator
 *
 * Physics-based thermodynamic calculations with real efficiency data.
 * Replaces random multipliers with literature-based values.
 */

import { getParameterResolver, getDataSourceRegistry } from '../data-sources'
import type { SimulationOutput } from '../types'

/**
 * Physical constants
 */
const CONSTANTS = {
  R: 8.314, // Universal gas constant J/(mol·K)
}

/**
 * Power cycle configurations with real efficiency data
 * Source: Literature and NREL ATB
 */
interface PowerCycleConfig {
  name: string
  isentropicEfficiency: number // Turbine/expander
  mechanicalEfficiency: number
  generatorEfficiency: number
  auxiliaryLosses: number // Fraction of gross power
  minTemp: number // K
  maxTemp: number // K
  heatRecoveryFactor: number // For combined cycles
}

const POWER_CYCLE_CONFIGS: Record<string, PowerCycleConfig> = {
  'steam-rankine': {
    name: 'Steam Rankine Cycle',
    isentropicEfficiency: 0.82, // Realistic for steam turbines (was 0.88)
    mechanicalEfficiency: 0.98,
    generatorEfficiency: 0.985,
    auxiliaryLosses: 0.07, // Pump work, condenser, cooling (was 0.05)
    minTemp: 300,
    maxTemp: 873,
    heatRecoveryFactor: 0,
  },
  'gas-brayton': {
    name: 'Gas Brayton Cycle',
    isentropicEfficiency: 0.90,
    mechanicalEfficiency: 0.99,
    generatorEfficiency: 0.985,
    auxiliaryLosses: 0.03,
    minTemp: 288,
    maxTemp: 1573,
    heatRecoveryFactor: 0,
  },
  'combined-cycle': {
    name: 'Combined Cycle Gas Turbine',
    isentropicEfficiency: 0.90,
    mechanicalEfficiency: 0.99,
    generatorEfficiency: 0.985,
    auxiliaryLosses: 0.025,
    minTemp: 288,
    maxTemp: 1573,
    heatRecoveryFactor: 0.75, // HRSG effectiveness
  },
  'orc': {
    name: 'Organic Rankine Cycle',
    isentropicEfficiency: 0.85,
    mechanicalEfficiency: 0.97,
    generatorEfficiency: 0.98,
    auxiliaryLosses: 0.04,
    minTemp: 300,
    maxTemp: 473,
    heatRecoveryFactor: 0,
  },
  'kalina': {
    name: 'Kalina Cycle',
    isentropicEfficiency: 0.84,
    mechanicalEfficiency: 0.96,
    generatorEfficiency: 0.98,
    auxiliaryLosses: 0.045,
    minTemp: 300,
    maxTemp: 573,
    heatRecoveryFactor: 0,
  },
  'supercritical-co2': {
    name: 'Supercritical CO2 Brayton',
    isentropicEfficiency: 0.93,
    mechanicalEfficiency: 0.99,
    generatorEfficiency: 0.985,
    auxiliaryLosses: 0.02,
    minTemp: 305,
    maxTemp: 973,
    heatRecoveryFactor: 0,
  },
}

/**
 * Heat exchanger configurations
 */
interface HeatExchangerConfig {
  type: string
  effectivenessRange: [number, number]
  uValue: number // W/(m2·K) typical overall heat transfer coefficient
  pressureDropFraction: number
}

const HEAT_EXCHANGER_CONFIGS: Record<string, HeatExchangerConfig> = {
  'shell-tube': {
    type: 'Shell and Tube',
    effectivenessRange: [0.60, 0.85],
    uValue: 300,
    pressureDropFraction: 0.02,
  },
  'plate': {
    type: 'Plate Heat Exchanger',
    effectivenessRange: [0.75, 0.95],
    uValue: 500,
    pressureDropFraction: 0.03,
  },
  'double-pipe': {
    type: 'Double Pipe',
    effectivenessRange: [0.50, 0.75],
    uValue: 200,
    pressureDropFraction: 0.015,
  },
  'finned-tube': {
    type: 'Finned Tube',
    effectivenessRange: [0.65, 0.90],
    uValue: 50, // Gas-side limited
    pressureDropFraction: 0.025,
  },
}

/**
 * Thermodynamic calculation inputs
 */
export interface ThermodynamicInputs {
  cycleType?: string
  temperatureHot?: number // K
  temperatureCold?: number // K
  heatInput?: number // W
  massFlowRate?: number // kg/s
  workingFluid?: string
  pressureRatio?: number
}

/**
 * Calculate Carnot efficiency
 */
export function calculateCarnotEfficiency(
  tHot: number,
  tCold: number
): { efficiency: number; uncertainty: number } {
  if (tHot <= tCold) {
    return { efficiency: 0, uncertainty: 0 }
  }

  const efficiency = 1 - tCold / tHot

  // Uncertainty from temperature measurement
  const tempUncertainty = 0.005 // 0.5% temperature measurement
  const uncertainty = efficiency * tempUncertainty * 2

  return { efficiency, uncertainty }
}

/**
 * Calculate practical efficiency for a power cycle
 * Replaces the random 0.65-0.80 multiplier in analytical-provider.ts
 */
export async function calculatePracticalEfficiency(
  inputs: ThermodynamicInputs
): Promise<{
  outputs: SimulationOutput[]
  dataSourceInfo: {
    source: string
    isFallback: boolean
  }
}> {
  const resolver = getParameterResolver()

  const tHot = inputs.temperatureHot || 1073
  const tCold = inputs.temperatureCold || 298
  const heatInput = inputs.heatInput || 1000

  // Get Carnot efficiency
  const carnot = calculateCarnotEfficiency(tHot, tCold)

  // Get cycle configuration
  const cycleType = inputs.cycleType?.toLowerCase().replace(/[^a-z-]/g, '') || 'steam-rankine'
  const config = POWER_CYCLE_CONFIGS[cycleType] || POWER_CYCLE_CONFIGS['steam-rankine']

  // Validate temperature range for cycle
  const effectiveTHot = Math.min(tHot, config.maxTemp)
  const effectiveTCold = Math.max(tCold, config.minTemp)

  // Calculate practical efficiency using real component efficiencies
  // eta_practical = eta_carnot * eta_isentropic * eta_mechanical * eta_generator * (1 - losses)
  const baseMultiplier =
    config.isentropicEfficiency *
    config.mechanicalEfficiency *
    config.generatorEfficiency *
    (1 - config.auxiliaryLosses)

  // Additional derating factors
  let derating = 1.0

  // Part load derating
  if (inputs.massFlowRate && inputs.massFlowRate < 1) {
    derating *= 0.95 + 0.05 * inputs.massFlowRate
  }

  // Temperature mismatch derating
  if (tHot > config.maxTemp || tCold < config.minTemp) {
    derating *= 0.95
  }

  // Get technology-specific multiplier from parameter resolver
  const multiplierResult = await resolver.resolvePracticalEfficiencyMultiplier(
    cycleType,
    {
      temperature: tHot,
      loadFactor: 1.0,
    }
  )

  // Final practical efficiency
  const practicalMultiplier = baseMultiplier * derating
  const practicalEfficiency = carnot.efficiency * practicalMultiplier

  // Work output
  const workOutput = heatInput * practicalEfficiency
  const heatRejected = heatInput - workOutput

  // Exergy analysis
  const exergyInput = heatInput * (1 - tCold / tHot) // Available work from heat
  const exergyEfficiency = workOutput / exergyInput
  const exergyDestruction = exergyInput - workOutput

  // Combined cycle bonus
  let combinedCycleOutput = 0
  if (config.heatRecoveryFactor > 0) {
    const exhaustHeat = heatRejected * 0.6 // 60% to HRSG
    const steamCycleEfficiency = 0.35
    combinedCycleOutput = exhaustHeat * steamCycleEfficiency * config.heatRecoveryFactor
  }

  const totalWorkOutput = workOutput + combinedCycleOutput
  const totalEfficiency = totalWorkOutput / heatInput

  const outputs: SimulationOutput[] = [
    { name: 'carnotEfficiency', value: carnot.efficiency, unit: '', uncertainty: carnot.uncertainty },
    { name: 'practicalEfficiency', value: practicalEfficiency, unit: '', uncertainty: practicalEfficiency * 0.05 },
    { name: 'practicalEfficiencyMultiplier', value: practicalMultiplier, unit: '' },
    { name: 'workOutput', value: workOutput, unit: 'W', uncertainty: workOutput * 0.05 },
    { name: 'heatRejected', value: heatRejected, unit: 'W', uncertainty: heatRejected * 0.05 },
    { name: 'exergyInput', value: exergyInput, unit: 'W' },
    { name: 'exergyEfficiency', value: exergyEfficiency, unit: '' },
    { name: 'exergyDestruction', value: exergyDestruction, unit: 'W' },
  ]

  // Add combined cycle outputs if applicable
  if (combinedCycleOutput > 0) {
    outputs.push(
      { name: 'combinedCycleBonus', value: combinedCycleOutput, unit: 'W' },
      { name: 'totalEfficiency', value: totalEfficiency, unit: '', uncertainty: totalEfficiency * 0.03 }
    )
  }

  return {
    outputs,
    dataSourceInfo: {
      source: multiplierResult.source,
      isFallback: multiplierResult.isFallback,
    },
  }
}

/**
 * Calculate heat exchanger performance
 */
export function calculateHeatExchanger(
  hxType: string,
  hotInletTemp: number, // K
  coldInletTemp: number, // K
  hotMassFlow: number, // kg/s
  coldMassFlow: number, // kg/s
  hotCp: number = 4180, // J/(kg·K) water default
  coldCp: number = 4180
): {
  effectiveness: number
  heatTransfer: number
  hotOutletTemp: number
  coldOutletTemp: number
  exergyEfficiency: number
} {
  const config = HEAT_EXCHANGER_CONFIGS[hxType] || HEAT_EXCHANGER_CONFIGS['shell-tube']

  // Heat capacity rates
  const Chot = hotMassFlow * hotCp
  const Ccold = coldMassFlow * coldCp
  const Cmin = Math.min(Chot, Ccold)
  const Cmax = Math.max(Chot, Ccold)
  const Cr = Cmin / Cmax

  // Effectiveness (use middle of range for typical operation)
  const effectiveness = (config.effectivenessRange[0] + config.effectivenessRange[1]) / 2

  // Maximum possible heat transfer
  const Qmax = Cmin * (hotInletTemp - coldInletTemp)

  // Actual heat transfer
  const Q = effectiveness * Qmax

  // Outlet temperatures
  const hotOutletTemp = hotInletTemp - Q / Chot
  const coldOutletTemp = coldInletTemp + Q / Ccold

  // Exergy analysis
  const T0 = 298 // Reference temperature
  const exergyHotIn = Chot * (hotInletTemp - T0 - T0 * Math.log(hotInletTemp / T0))
  const exergyHotOut = Chot * (hotOutletTemp - T0 - T0 * Math.log(hotOutletTemp / T0))
  const exergyColdIn = Ccold * (coldInletTemp - T0 - T0 * Math.log(coldInletTemp / T0))
  const exergyColdOut = Ccold * (coldOutletTemp - T0 - T0 * Math.log(coldOutletTemp / T0))

  const exergyInputNet = Math.abs(exergyHotIn - exergyHotOut)
  const exergyOutputNet = Math.abs(exergyColdOut - exergyColdIn)
  const exergyEfficiency = exergyOutputNet / exergyInputNet

  return {
    effectiveness,
    heatTransfer: Q,
    hotOutletTemp,
    coldOutletTemp,
    exergyEfficiency: Math.min(1, exergyEfficiency),
  }
}

/**
 * Calculate exergy improvement potential
 * Replaces the hardcoded 0.3 in analytical-provider.ts
 */
export async function calculateExergyImprovement(
  technology: string,
  currentEfficiency: number,
  processType: 'power-generation' | 'heating' | 'cooling' | 'chemical' = 'power-generation'
): Promise<{
  improvementPotential: number
  theoreticalMaxRecovery: number
  practicalRecovery: number
  majorOpportunities: string[]
  source: string
  isFallback: boolean
}> {
  const resolver = getParameterResolver()

  const result = await resolver.resolveExergyImprovementPotential({
    technology,
    currentEfficiency,
    processType,
  })

  // Identify major improvement opportunities
  const opportunities: string[] = []
  const losses = 1 - currentEfficiency

  if (processType === 'power-generation') {
    if (losses > 0.3) opportunities.push('Heat recovery from exhaust gases')
    if (currentEfficiency < 0.5) opportunities.push('Upgrade to combined cycle')
    if (losses > 0.2) opportunities.push('Improve combustion efficiency')
    opportunities.push('Optimize operating temperatures')
  } else if (processType === 'heating') {
    if (losses > 0.1) opportunities.push('Improve insulation')
    opportunities.push('Heat recovery from flue gases')
    opportunities.push('Condensing heat exchanger upgrade')
  } else if (processType === 'cooling') {
    opportunities.push('Variable speed compressor')
    opportunities.push('Economizer optimization')
    if (losses > 0.3) opportunities.push('Consider absorption cooling')
  } else if (processType === 'chemical') {
    opportunities.push('Heat integration')
    opportunities.push('Reaction optimization')
    opportunities.push('Separation efficiency improvement')
  }

  // Calculate theoretical vs practical recovery
  const theoreticalMaxRecovery = losses * 0.8 // 80% of losses theoretically recoverable
  const practicalRecovery = result.value

  return {
    improvementPotential: result.value,
    theoreticalMaxRecovery,
    practicalRecovery,
    majorOpportunities: opportunities.slice(0, 4),
    source: result.source,
    isFallback: result.isFallback,
  }
}

/**
 * Calculate entropy generation
 */
export function calculateEntropyGeneration(
  heatTransfer: number, // W
  tHot: number, // K
  tCold: number // K
): number {
  // Entropy generation = Q/T_cold - Q/T_hot
  return heatTransfer * (1 / tCold - 1 / tHot)
}

/**
 * Get available power cycle types
 */
export function getAvailablePowerCycles(): Array<{
  id: string
  name: string
  tempRange: string
  typicalEfficiency: string
}> {
  return Object.entries(POWER_CYCLE_CONFIGS).map(([id, config]) => ({
    id,
    name: config.name,
    tempRange: `${config.minTemp}K - ${config.maxTemp}K`,
    typicalEfficiency: `${(config.isentropicEfficiency * 0.5 * 100).toFixed(0)}-${(config.isentropicEfficiency * 0.7 * 100).toFixed(0)}%`,
  }))
}
