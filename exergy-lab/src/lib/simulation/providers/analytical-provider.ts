/**
 * Tier 1: Analytical Simulation Provider
 *
 * Fast JavaScript-based analytical calculations with real data from:
 * - NREL ATB for technology efficiencies and costs
 * - Materials Project for material properties
 * - Physics-based calculator modules
 *
 * This serves as the default/fallback provider and is always available.
 */

import type {
  SimulationProvider,
  SimulationParams,
  SimulationResult,
  SimulationType,
  SimulationOutput,
  ExergyAnalysis,
} from '../types'

import { getParameterResolver } from '../data-sources'
import {
  calculatePracticalEfficiency,
  calculateCarnotEfficiency,
  calculateExergyImprovement,
} from '../calculators/thermodynamics'
import { calculateElectrochemicalCell } from '../calculators/electrochemistry'

// ============================================================================
// Thermodynamic Constants
// ============================================================================

const CONSTANTS = {
  R: 8.314, // Universal gas constant J/(mol·K)
  F: 96485, // Faraday constant C/mol
  h: 6.626e-34, // Planck constant J·s
  k: 1.381e-23, // Boltzmann constant J/K
  NA: 6.022e23, // Avogadro constant 1/mol
}

// Physical limits
const LIMITS = {
  carnotEfficiency: (tHot: number, tCold: number) => 1 - tCold / tHot,
  betzLimit: 0.593,
  shockleyQueisser: 0.337,
  electrolysisVoltage: 1.48, // Thermoneutral voltage
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Safely get a number from inputs with a default value
 */
function getNum(value: number | undefined, defaultValue: number): number {
  return value ?? defaultValue
}

// ============================================================================
// Data Source Tracking
// ============================================================================

interface DataSourceInfo {
  name: string
  source: string
  isFallback: boolean
}

// ============================================================================
// Analytical Models
// ============================================================================

async function calculateThermodynamic(params: SimulationParams): Promise<{
  outputs: SimulationOutput[]
  dataSources: DataSourceInfo[]
}> {
  const inputs = params.inputs
  const dataSources: DataSourceInfo[] = []

  // Temperature-dependent efficiency
  const tHot = inputs.temperatureHot ?? 1073 // K
  const tCold = inputs.temperatureCold ?? 298 // K

  // Get cycle type from inputs (use numeric mapping if needed)
  const cycleType = 'steam-rankine' // Default, could be extended with mapping

  // Use the thermodynamics calculator with real data
  const result = await calculatePracticalEfficiency({
    cycleType,
    temperatureHot: tHot,
    temperatureCold: tCold,
    heatInput: getNum(inputs.heatInput, 1000),
    massFlowRate: getNum(inputs.massFlowRate, 1),
  })

  dataSources.push({
    name: 'practicalEfficiency',
    source: result.dataSourceInfo.source,
    isFallback: result.dataSourceInfo.isFallback,
  })

  return {
    outputs: result.outputs,
    dataSources,
  }
}

async function calculateElectrochemical(params: SimulationParams): Promise<{
  outputs: SimulationOutput[]
  dataSources: DataSourceInfo[]
}> {
  const inputs = params.inputs
  const dataSources: DataSourceInfo[] = []

  // Map numeric electrolyzer type to string (0=alkaline, 1=pem, 2=soec, 3=aem)
  const electrolyzerTypes: Array<'alkaline' | 'pem' | 'soec' | 'aem'> = ['alkaline', 'pem', 'soec', 'aem']
  const electrolyzerTypeIndex = Math.min(Math.max(0, Math.floor(inputs.electrolyzerType ?? 1)), 3)
  const electrolyzerType = electrolyzerTypes[electrolyzerTypeIndex]

  // Use the electrochemistry calculator with real faradaic efficiency data
  const result = await calculateElectrochemicalCell({
    electrolyzerType,
    temperature: getNum(inputs.temperature, 333),
    pressure: getNum(inputs.pressure, 1),
    currentDensity: getNum(inputs.currentDensity, 0.5),
    cellArea: getNum(inputs.cellArea, 100),
    catalystMaterial: '', // Catalyst material would need extended params
  })

  dataSources.push({
    name: 'faradaicEfficiency',
    source: result.dataSourceInfo.faradaicEfficiencySource,
    isFallback: result.dataSourceInfo.isFallback,
  })

  return {
    outputs: result.outputs,
    dataSources,
  }
}

async function calculateKinetics(params: SimulationParams): Promise<{
  outputs: SimulationOutput[]
  dataSources: DataSourceInfo[]
}> {
  const inputs = params.inputs
  const outputs: SimulationOutput[] = []

  // Arrhenius equation
  const temperature = getNum(inputs.temperature, 298) // K
  const activationEnergy = getNum(inputs.activationEnergy, 50000) // J/mol
  const preExponentialFactor = getNum(inputs.preExponentialFactor, 1e10) // 1/s
  const initialConcentration = getNum(inputs.initialConcentration, 1) // mol/L
  const time = getNum(inputs.reactionTime, 3600) // s

  // Rate constant
  const k = preExponentialFactor * Math.exp(-activationEnergy / (CONSTANTS.R * temperature))

  // First-order kinetics
  const finalConcentration = initialConcentration * Math.exp(-k * time)
  const conversion = 1 - finalConcentration / initialConcentration
  const halfLife = Math.log(2) / k

  outputs.push(
    { name: 'rateConstant', value: k, unit: '1/s' },
    { name: 'finalConcentration', value: finalConcentration, unit: 'mol/L' },
    { name: 'conversion', value: conversion, unit: '', uncertainty: 0.02 },
    { name: 'halfLife', value: halfLife, unit: 's' }
  )

  return {
    outputs,
    dataSources: [{ name: 'kinetics', source: 'analytical-arrhenius', isFallback: false }],
  }
}

async function calculateHeatTransfer(params: SimulationParams): Promise<{
  outputs: SimulationOutput[]
  dataSources: DataSourceInfo[]
}> {
  const inputs = params.inputs
  const outputs: SimulationOutput[] = []

  // Heat transfer parameters
  const surfaceArea = getNum(inputs.surfaceArea, 1) // m2
  const heatTransferCoeff = getNum(inputs.heatTransferCoeff, 100) // W/(m2·K)
  const temperatureDiff = getNum(inputs.temperatureDifference, 50) // K
  const thermalConductivity = getNum(inputs.thermalConductivity, 50) // W/(m·K)
  const thickness = getNum(inputs.thickness, 0.01) // m

  // Convective heat transfer
  const convectiveHeat = heatTransferCoeff * surfaceArea * temperatureDiff

  // Conductive heat transfer
  const conductiveHeat = (thermalConductivity * surfaceArea * temperatureDiff) / thickness

  // Overall resistance
  const overallCoeff = 1 / (1/heatTransferCoeff + thickness/thermalConductivity)

  outputs.push(
    { name: 'convectiveHeatRate', value: convectiveHeat, unit: 'W', uncertainty: convectiveHeat * 0.1 },
    { name: 'conductiveHeatRate', value: conductiveHeat, unit: 'W', uncertainty: conductiveHeat * 0.1 },
    { name: 'overallHeatTransferCoeff', value: overallCoeff, unit: 'W/(m2·K)' }
  )

  return {
    outputs,
    dataSources: [{ name: 'heatTransfer', source: 'analytical-fourier', isFallback: false }],
  }
}

async function calculateMassTransfer(params: SimulationParams): Promise<{
  outputs: SimulationOutput[]
  dataSources: DataSourceInfo[]
}> {
  const inputs = params.inputs
  const outputs: SimulationOutput[] = []

  // Mass transfer parameters
  const concentration1 = getNum(inputs.concentration1, 1) // mol/m3
  const concentration2 = getNum(inputs.concentration2, 0.1) // mol/m3
  const diffusivity = getNum(inputs.diffusivity, 1e-9) // m2/s
  const filmThickness = getNum(inputs.filmThickness, 0.001) // m
  const surfaceArea = getNum(inputs.surfaceArea, 0.01) // m2

  // Mass transfer coefficient
  const massTransferCoeff = diffusivity / filmThickness

  // Molar flux
  const molarFlux = massTransferCoeff * (concentration1 - concentration2)

  // Mass transfer rate
  const massTransferRate = molarFlux * surfaceArea

  outputs.push(
    { name: 'massTransferCoeff', value: massTransferCoeff, unit: 'm/s' },
    { name: 'molarFlux', value: molarFlux, unit: 'mol/(m2·s)' },
    { name: 'massTransferRate', value: massTransferRate, unit: 'mol/s', uncertainty: massTransferRate * 0.1 }
  )

  return {
    outputs,
    dataSources: [{ name: 'massTransfer', source: 'analytical-fick', isFallback: false }],
  }
}

async function calculateExergyAnalysis(
  outputs: SimulationOutput[],
  params: SimulationParams
): Promise<{
  exergy: ExergyAnalysis
  dataSources: DataSourceInfo[]
}> {
  // Find efficiency from outputs
  const efficiencyOutput = outputs.find(o =>
    o.name.toLowerCase().includes('efficiency') && !o.name.toLowerCase().includes('faradaic')
  )
  const efficiency = efficiencyOutput?.value || 0.7

  // Technology is determined by simulation type (string params not currently supported)
  const technology = 'default'

  // Use the real exergy improvement calculator
  const improvementResult = await calculateExergyImprovement(
    technology,
    efficiency,
    'power-generation'
  )

  // Calculate exergy destruction based on inputs
  const heatInput = getNum(params.inputs.heatInput, getNum(params.inputs.powerInput, 1000))
  const exergyInput = heatInput * 0.9 // Approximate exergy of heat input
  const exergyDestruction = exergyInput * (1 - efficiency)

  return {
    exergy: {
      efficiency,
      exergyDestruction,
      majorLosses: improvementResult.majorOpportunities,
      improvementPotential: improvementResult.improvementPotential,
    },
    dataSources: [{
      name: 'exergyImprovement',
      source: improvementResult.source,
      isFallback: improvementResult.isFallback,
    }],
  }
}

// ============================================================================
// Analytical Provider Class
// ============================================================================

export class AnalyticalSimulationProvider implements SimulationProvider {
  name = 'Analytical Models'
  tier = 'tier1' as const
  supportedTypes: SimulationType[] = [
    'thermodynamic',
    'electrochemical',
    'kinetics',
    'heat-transfer',
    'mass-transfer',
  ]

  async execute(params: SimulationParams): Promise<SimulationResult> {
    const startTime = Date.now()

    // Track all data sources used
    let allDataSources: DataSourceInfo[] = []

    // Select calculation based on type
    let result: { outputs: SimulationOutput[]; dataSources: DataSourceInfo[] }

    switch (params.type) {
      case 'thermodynamic':
        result = await calculateThermodynamic(params)
        break
      case 'electrochemical':
        result = await calculateElectrochemical(params)
        break
      case 'kinetics':
        result = await calculateKinetics(params)
        break
      case 'heat-transfer':
        result = await calculateHeatTransfer(params)
        break
      case 'mass-transfer':
        result = await calculateMassTransfer(params)
        break
      default:
        // Default to thermodynamic for unknown types
        result = await calculateThermodynamic(params)
    }

    allDataSources = [...allDataSources, ...result.dataSources]

    // Calculate exergy analysis
    const exergyResult = await calculateExergyAnalysis(result.outputs, params)
    allDataSources = [...allDataSources, ...exergyResult.dataSources]

    // Simulate minimal computation time (for UX)
    await new Promise(resolve => setTimeout(resolve, 50))

    const duration = Date.now() - startTime

    // Check if any data source used fallback
    const usingFallback = allDataSources.some(ds => ds.isFallback)

    // Build data source summary
    const dataSourceSummary = allDataSources.reduce((acc, ds) => {
      acc[ds.name] = {
        source: ds.source,
        isFallback: ds.isFallback,
      }
      return acc
    }, {} as Record<string, { source: string; isFallback: boolean }>)

    return {
      experimentId: params.experimentId,
      converged: true,
      iterations: 1,
      outputs: result.outputs,
      exergy: exergyResult.exergy,
      metadata: {
        provider: this.name,
        tier: this.tier,
        duration,
        cost: 0, // Free for analytical models
        timestamp: new Date().toISOString(),
        dataSourceInfo: {
          usingFallback,
          sources: dataSourceSummary,
        },
      },
    }
  }

  async isAvailable(): Promise<boolean> {
    // Always available - runs in browser
    return true
  }

  async estimateCost(): Promise<number> {
    return 0 // Free
  }

  async estimateDuration(): Promise<number> {
    return 100 // ~100ms average
  }
}

export default AnalyticalSimulationProvider
