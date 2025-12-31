/**
 * Shockley-Queisser Limit Calculator
 *
 * Calculates the theoretical maximum efficiency for a single p-n junction solar cell.
 * Based on the 1961 paper by Shockley and Queisser.
 *
 * @citation Shockley, W.; Queisser, H. J. (1961). "Detailed Balance Limit of Efficiency
 *           of p-n Junction Solar Cells". Journal of Applied Physics. 32 (3): 510-519.
 */

import type { CalculatorDefinition, CalculatorResult } from './index'

// Physical constants
const k = 1.380649e-23 // Boltzmann constant (J/K)
const q = 1.602176634e-19 // Elementary charge (C)
const h = 6.62607015e-34 // Planck constant (J·s)
const c = 299792458 // Speed of light (m/s)
const T_sun = 5778 // Sun's effective temperature (K)

export interface ShockleyQueisserInputs {
  bandgap: number // eV
  temperature: number // K
  concentration: number // suns (1 = AM1.5G)
}

export interface ShockleyQueisserOutputs {
  maxEfficiency: number // %
  openCircuitVoltage: number // V
  shortCircuitCurrent: number // mA/cm²
  maxPower: number // mW/cm²
  optimalBandgap: number // eV
}

export function calculateShockleyQueisser(inputs: ShockleyQueisserInputs): CalculatorResult {
  const { bandgap, temperature, concentration } = inputs

  // Convert bandgap to Joules
  const Eg = bandgap * q

  // Calculate open-circuit voltage (simplified)
  // Voc = (Eg/q) - (kT/q) * ln(c² / (2π * h * c * J))
  const kT = k * temperature
  const Voc = Math.max(0, bandgap - 0.4 - (kT / q) * Math.log(1000 / concentration))

  // Estimate short-circuit current using blackbody approximation
  // This is a simplified calculation
  const E_photon_min = Eg / q // Minimum photon energy in eV

  // AM1.5G photon flux approximation (simplified)
  // Jsc increases as bandgap decreases (more photons absorbed)
  const Jsc_max = 46 // mA/cm² theoretical max for Eg → 0
  const Jsc = Jsc_max * Math.exp(-bandgap / 1.8) * Math.sqrt(concentration)

  // Fill factor estimation
  const voc_normalized = (q * Voc) / (k * temperature)
  const FF = (voc_normalized - Math.log(voc_normalized + 0.72)) / (voc_normalized + 1)
  const fillFactor = Math.min(0.9, Math.max(0.5, FF))

  // Maximum power
  const Pmax = Voc * Jsc * fillFactor

  // Solar irradiance (AM1.5G = 1000 W/m²)
  const solarIrradiance = 100 * concentration // mW/cm²

  // Maximum efficiency
  const maxEfficiency = (Pmax / solarIrradiance) * 100

  // Find optimal bandgap (pre-calculated for AM1.5G at 300K)
  // Peak is around 1.34 eV with ~33.7% efficiency
  const optimalBandgap = 1.34 + 0.0003 * (temperature - 300)

  const notes: string[] = []
  const warnings: string[] = []

  if (bandgap < 0.5) {
    warnings.push('Bandgap below 0.5 eV: thermal losses dominate')
  }
  if (bandgap > 3.0) {
    warnings.push('Bandgap above 3.0 eV: most solar spectrum unused')
  }
  if (Math.abs(bandgap - optimalBandgap) < 0.1) {
    notes.push('Bandgap is near optimal for single-junction efficiency')
  }
  if (concentration > 1) {
    notes.push(`Concentration ratio of ${concentration}x increases Voc and theoretical efficiency`)
  }

  return {
    outputs: {
      maxEfficiency: Math.min(40, Math.max(0, maxEfficiency)),
      openCircuitVoltage: Math.max(0, Voc),
      shortCircuitCurrent: Math.max(0, Jsc),
      maxPower: Math.max(0, Pmax),
      optimalBandgap,
      fillFactor: fillFactor * 100,
    },
    notes,
    warnings,
  }
}

export const shockleyQueisserCalculator: CalculatorDefinition = {
  id: 'shockley-queisser',
  name: 'Shockley-Queisser Limit',
  domain: 'solar-energy',
  description: 'Calculates the theoretical maximum efficiency for a single p-n junction solar cell',
  inputs: [
    {
      id: 'bandgap',
      name: 'Bandgap',
      unit: 'eV',
      defaultValue: 1.34,
      min: 0.5,
      max: 3.0,
      description: 'Semiconductor bandgap energy',
    },
    {
      id: 'temperature',
      name: 'Cell Temperature',
      unit: 'K',
      defaultValue: 300,
      min: 250,
      max: 400,
      description: 'Operating temperature of the solar cell',
    },
    {
      id: 'concentration',
      name: 'Concentration',
      unit: 'suns',
      defaultValue: 1,
      min: 1,
      max: 1000,
      description: 'Solar concentration ratio (1 = no concentration)',
    },
  ],
  outputs: [
    { id: 'maxEfficiency', name: 'Maximum Efficiency', unit: '%' },
    { id: 'openCircuitVoltage', name: 'Open-Circuit Voltage', unit: 'V' },
    { id: 'shortCircuitCurrent', name: 'Short-Circuit Current', unit: 'mA/cm²' },
    { id: 'maxPower', name: 'Maximum Power', unit: 'mW/cm²' },
    { id: 'optimalBandgap', name: 'Optimal Bandgap', unit: 'eV' },
    { id: 'fillFactor', name: 'Fill Factor', unit: '%' },
  ],
  calculate: (inputs) =>
    calculateShockleyQueisser({
      bandgap: inputs.bandgap ?? 1.34,
      temperature: inputs.temperature ?? 300,
      concentration: inputs.concentration ?? 1,
    }),
  formula: 'η_max = (V_oc × J_sc × FF) / P_in',
  citation: 'Shockley & Queisser, J. Appl. Phys. 32, 510 (1961)',
}
