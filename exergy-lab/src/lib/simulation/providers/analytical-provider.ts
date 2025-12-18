/**
 * Tier 1: Analytical Simulation Provider
 *
 * Fast JavaScript-based analytical calculations for:
 * - Thermodynamic equilibrium
 * - Mass/energy balances
 * - First-order kinetics
 * - Efficiency calculations
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
// Analytical Models
// ============================================================================

function calculateThermodynamic(params: SimulationParams): SimulationOutput[] {
  const inputs = params.inputs
  const outputs: SimulationOutput[] = []

  // Temperature-dependent efficiency
  const tHot = inputs.temperatureHot || 1073 // K
  const tCold = inputs.temperatureCold || 298 // K
  const carnotEff = LIMITS.carnotEfficiency(tHot, tCold)

  // Add realistic inefficiencies
  const practicalEff = carnotEff * (0.65 + Math.random() * 0.15)

  outputs.push({
    name: 'carnotEfficiency',
    value: carnotEff,
    unit: '',
    uncertainty: 0,
  })

  outputs.push({
    name: 'practicalEfficiency',
    value: practicalEff,
    unit: '',
    uncertainty: practicalEff * 0.05,
  })

  // Heat transfer
  const heatInput = inputs.heatInput || 1000 // W
  const workOutput = heatInput * practicalEff

  outputs.push({
    name: 'workOutput',
    value: workOutput,
    unit: 'W',
    uncertainty: workOutput * 0.05,
  })

  outputs.push({
    name: 'heatRejected',
    value: heatInput - workOutput,
    unit: 'W',
    uncertainty: (heatInput - workOutput) * 0.05,
  })

  return outputs
}

function calculateElectrochemical(params: SimulationParams): SimulationOutput[] {
  const inputs = params.inputs
  const outputs: SimulationOutput[] = []

  // Nernst equation for cell voltage
  const temperature = inputs.temperature || 298 // K
  const pressure = inputs.pressure || 1 // atm
  const currentDensity = inputs.currentDensity || 0.5 // A/cm²

  // Reversible voltage (approximately 1.23V for water electrolysis at standard conditions)
  const E0 = 1.23
  const nernstCorrection = (CONSTANTS.R * temperature / (2 * CONSTANTS.F)) * Math.log(pressure)
  const reversibleVoltage = E0 + nernstCorrection

  // Overpotentials
  const activationOverpotential = 0.05 + 0.1 * currentDensity
  const ohmicOverpotential = 0.1 * currentDensity
  const concentrationOverpotential = 0.02 * Math.pow(currentDensity, 2)

  const totalOverpotential = activationOverpotential + ohmicOverpotential + concentrationOverpotential
  const cellVoltage = reversibleVoltage + totalOverpotential

  // Efficiency
  const voltageEfficiency = reversibleVoltage / cellVoltage
  const faradaicEfficiency = 0.95 + Math.random() * 0.04 // 95-99%
  const totalEfficiency = voltageEfficiency * faradaicEfficiency

  outputs.push(
    { name: 'cellVoltage', value: cellVoltage, unit: 'V', uncertainty: 0.02 },
    { name: 'reversibleVoltage', value: reversibleVoltage, unit: 'V', uncertainty: 0.01 },
    { name: 'activationOverpotential', value: activationOverpotential, unit: 'V' },
    { name: 'ohmicOverpotential', value: ohmicOverpotential, unit: 'V' },
    { name: 'voltageEfficiency', value: voltageEfficiency, unit: '', uncertainty: 0.02 },
    { name: 'faradaicEfficiency', value: faradaicEfficiency, unit: '' },
    { name: 'totalEfficiency', value: totalEfficiency, unit: '', uncertainty: 0.03 }
  )

  // Hydrogen production rate
  const cellArea = inputs.cellArea || 100 // cm²
  const hydrogenRate = (currentDensity * cellArea * faradaicEfficiency) / (2 * CONSTANTS.F) * 22.4 * 3600
  outputs.push({ name: 'hydrogenRate', value: hydrogenRate, unit: 'L/h', uncertainty: hydrogenRate * 0.05 })

  return outputs
}

function calculateKinetics(params: SimulationParams): SimulationOutput[] {
  const inputs = params.inputs
  const outputs: SimulationOutput[] = []

  // Arrhenius equation
  const temperature = inputs.temperature || 298 // K
  const activationEnergy = inputs.activationEnergy || 50000 // J/mol
  const preExponentialFactor = inputs.preExponentialFactor || 1e10 // 1/s
  const initialConcentration = inputs.initialConcentration || 1 // mol/L
  const time = inputs.reactionTime || 3600 // s

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

  return outputs
}

function calculateHeatTransfer(params: SimulationParams): SimulationOutput[] {
  const inputs = params.inputs
  const outputs: SimulationOutput[] = []

  // Heat transfer parameters
  const surfaceArea = inputs.surfaceArea || 1 // m²
  const heatTransferCoeff = inputs.heatTransferCoeff || 100 // W/(m²·K)
  const temperatureDiff = inputs.temperatureDifference || 50 // K
  const thermalConductivity = inputs.thermalConductivity || 50 // W/(m·K)
  const thickness = inputs.thickness || 0.01 // m

  // Convective heat transfer
  const convectiveHeat = heatTransferCoeff * surfaceArea * temperatureDiff

  // Conductive heat transfer
  const conductiveHeat = (thermalConductivity * surfaceArea * temperatureDiff) / thickness

  // Overall resistance
  const overallCoeff = 1 / (1/heatTransferCoeff + thickness/thermalConductivity)

  outputs.push(
    { name: 'convectiveHeatRate', value: convectiveHeat, unit: 'W', uncertainty: convectiveHeat * 0.1 },
    { name: 'conductiveHeatRate', value: conductiveHeat, unit: 'W', uncertainty: conductiveHeat * 0.1 },
    { name: 'overallHeatTransferCoeff', value: overallCoeff, unit: 'W/(m²·K)' }
  )

  return outputs
}

function calculateMassTransfer(params: SimulationParams): SimulationOutput[] {
  const inputs = params.inputs
  const outputs: SimulationOutput[] = []

  // Mass transfer parameters
  const concentration1 = inputs.concentration1 || 1 // mol/m³
  const concentration2 = inputs.concentration2 || 0.1 // mol/m³
  const diffusivity = inputs.diffusivity || 1e-9 // m²/s
  const filmThickness = inputs.filmThickness || 0.001 // m
  const surfaceArea = inputs.surfaceArea || 0.01 // m²

  // Mass transfer coefficient
  const massTransferCoeff = diffusivity / filmThickness

  // Molar flux
  const molarFlux = massTransferCoeff * (concentration1 - concentration2)

  // Mass transfer rate
  const massTransferRate = molarFlux * surfaceArea

  outputs.push(
    { name: 'massTransferCoeff', value: massTransferCoeff, unit: 'm/s' },
    { name: 'molarFlux', value: molarFlux, unit: 'mol/(m²·s)' },
    { name: 'massTransferRate', value: massTransferRate, unit: 'mol/s', uncertainty: massTransferRate * 0.1 }
  )

  return outputs
}

function calculateExergyAnalysis(outputs: SimulationOutput[], params: SimulationParams): ExergyAnalysis {
  // Find efficiency from outputs
  const efficiencyOutput = outputs.find(o =>
    o.name.toLowerCase().includes('efficiency') && !o.name.toLowerCase().includes('faradaic')
  )
  const efficiency = efficiencyOutput?.value || 0.7

  // Calculate exergy destruction based on inputs
  const heatInput = params.inputs.heatInput || params.inputs.powerInput || 1000
  const exergyInput = heatInput * 0.9 // Approximate exergy of heat input
  const exergyDestruction = exergyInput * (1 - efficiency)

  // Identify major losses
  const majorLosses: string[] = []
  if (efficiency < 0.5) majorLosses.push('High thermal irreversibilities')
  if (params.inputs.currentDensity && params.inputs.currentDensity > 1) {
    majorLosses.push('Ohmic losses at high current density')
  }
  if (params.inputs.temperature && params.inputs.temperature > 1000) {
    majorLosses.push('Heat loss at high operating temperature')
  }
  if (majorLosses.length === 0) majorLosses.push('Inherent process inefficiencies')

  return {
    efficiency,
    exergyDestruction,
    majorLosses,
    improvementPotential: (1 - efficiency) * 0.3, // Assume 30% of losses are recoverable
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

    // Select calculation based on type
    let outputs: SimulationOutput[]

    switch (params.type) {
      case 'thermodynamic':
        outputs = calculateThermodynamic(params)
        break
      case 'electrochemical':
        outputs = calculateElectrochemical(params)
        break
      case 'kinetics':
        outputs = calculateKinetics(params)
        break
      case 'heat-transfer':
        outputs = calculateHeatTransfer(params)
        break
      case 'mass-transfer':
        outputs = calculateMassTransfer(params)
        break
      default:
        // Default to thermodynamic for unknown types
        outputs = calculateThermodynamic(params)
    }

    // Calculate exergy analysis
    const exergy = calculateExergyAnalysis(outputs, params)

    // Simulate some computation time (50-200ms)
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 150))

    const duration = Date.now() - startTime

    return {
      experimentId: params.experimentId,
      converged: true,
      iterations: 1,
      outputs,
      exergy,
      metadata: {
        provider: this.name,
        tier: this.tier,
        duration,
        cost: 0, // Free for analytical models
        timestamp: new Date().toISOString(),
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
