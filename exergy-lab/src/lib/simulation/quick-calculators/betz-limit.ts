/**
 * Betz Limit Calculator
 *
 * Calculates the theoretical maximum efficiency for wind energy extraction.
 * The Betz limit (16/27 ≈ 59.3%) represents the maximum fraction of kinetic
 * energy that can be extracted from a wind stream.
 *
 * @citation Betz, A. (1920). "Das Maximum der theoretisch möglichen Ausnützung
 *           des Windes durch Windmotoren". Zeitschrift für das gesamte Turbinenwesen.
 */

import type { CalculatorDefinition, CalculatorResult } from './index'

// Physical constants
const BETZ_LIMIT = 16 / 27 // ~0.593
const AIR_DENSITY_STP = 1.225 // kg/m³ at sea level, 15°C

export interface BetzLimitInputs {
  windSpeed: number // m/s
  rotorDiameter: number // m
  airDensity?: number // kg/m³
  powerCoefficient?: number // Cp (0-0.593)
}

export interface BetzLimitOutputs {
  betzLimit: number // % (always 59.3%)
  theoreticalMaxPower: number // W
  actualPower: number // W (if Cp provided)
  sweptArea: number // m²
  windPower: number // W (total wind power)
  tipSpeedRatio: number // optimal TSR
}

export function calculateBetzLimit(inputs: BetzLimitInputs): CalculatorResult {
  const {
    windSpeed,
    rotorDiameter,
    airDensity = AIR_DENSITY_STP,
    powerCoefficient = BETZ_LIMIT,
  } = inputs

  // Swept area
  const radius = rotorDiameter / 2
  const sweptArea = Math.PI * radius * radius

  // Total power in wind (P = 0.5 * ρ * A * v³)
  const windPower = 0.5 * airDensity * sweptArea * Math.pow(windSpeed, 3)

  // Theoretical maximum (Betz limit)
  const theoreticalMaxPower = windPower * BETZ_LIMIT

  // Actual power with given Cp
  const Cp = Math.min(powerCoefficient, BETZ_LIMIT)
  const actualPower = windPower * Cp

  // Optimal tip speed ratio (typically 7-8 for modern turbines)
  const optimalTSR = 7.5

  // Efficiency relative to Betz limit
  const efficiencyVsBetz = (Cp / BETZ_LIMIT) * 100

  const notes: string[] = []
  const warnings: string[] = []

  if (windSpeed < 3) {
    warnings.push('Wind speed below cut-in threshold (~3 m/s)')
  }
  if (windSpeed > 25) {
    warnings.push('Wind speed above typical cut-out threshold (~25 m/s)')
  }
  if (powerCoefficient > BETZ_LIMIT) {
    warnings.push('Power coefficient cannot exceed Betz limit (59.3%)')
  }
  if (powerCoefficient >= 0.45) {
    notes.push('Power coefficient indicates a high-efficiency modern turbine')
  }

  // Estimate annual energy (simplified using capacity factor)
  const capacityFactor = 0.35 // Typical for good wind site
  const annualEnergy = (actualPower * 8760 * capacityFactor) / 1000 // kWh

  return {
    outputs: {
      betzLimit: BETZ_LIMIT * 100,
      theoreticalMaxPower,
      actualPower,
      sweptArea,
      windPower,
      tipSpeedRatio: optimalTSR,
      powerCoefficient: Cp * 100,
      efficiencyVsBetz,
      annualEnergyEstimate: annualEnergy,
    },
    notes,
    warnings,
  }
}

export const betzLimitCalculator: CalculatorDefinition = {
  id: 'betz-limit',
  name: 'Betz Limit',
  domain: 'wind-energy',
  description:
    'Calculates the theoretical maximum efficiency (59.3%) for wind energy extraction',
  inputs: [
    {
      id: 'windSpeed',
      name: 'Wind Speed',
      unit: 'm/s',
      defaultValue: 10,
      min: 1,
      max: 50,
      description: 'Incoming wind velocity',
    },
    {
      id: 'rotorDiameter',
      name: 'Rotor Diameter',
      unit: 'm',
      defaultValue: 100,
      min: 1,
      max: 250,
      description: 'Wind turbine rotor diameter',
    },
    {
      id: 'airDensity',
      name: 'Air Density',
      unit: 'kg/m³',
      defaultValue: 1.225,
      min: 0.9,
      max: 1.4,
      description: 'Air density (varies with altitude and temperature)',
    },
    {
      id: 'powerCoefficient',
      name: 'Power Coefficient (Cp)',
      unit: '',
      defaultValue: 0.45,
      min: 0.1,
      max: 0.593,
      description: 'Actual turbine power coefficient',
    },
  ],
  outputs: [
    { id: 'betzLimit', name: 'Betz Limit', unit: '%' },
    { id: 'theoreticalMaxPower', name: 'Theoretical Max Power', unit: 'W' },
    { id: 'actualPower', name: 'Actual Power', unit: 'W' },
    { id: 'sweptArea', name: 'Swept Area', unit: 'm²' },
    { id: 'windPower', name: 'Wind Power Available', unit: 'W' },
    { id: 'tipSpeedRatio', name: 'Optimal Tip Speed Ratio', unit: '' },
  ],
  calculate: (inputs) =>
    calculateBetzLimit({
      windSpeed: inputs.windSpeed ?? 10,
      rotorDiameter: inputs.rotorDiameter ?? 100,
      airDensity: inputs.airDensity,
      powerCoefficient: inputs.powerCoefficient,
    }),
  formula: 'P_max = (16/27) × 0.5 × ρ × A × v³',
  citation: 'Betz, A. (1920). Zeitschrift für das gesamte Turbinenwesen',
}
