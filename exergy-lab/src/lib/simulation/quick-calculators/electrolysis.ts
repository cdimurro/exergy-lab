/**
 * Electrolysis Efficiency Calculator
 *
 * Calculates hydrogen production efficiency for water electrolysis systems.
 * Covers PEM, Alkaline, and Solid Oxide Electrolyzer Cell (SOEC) technologies.
 *
 * @citation DOE Hydrogen Program: Technical Targets for Electrolysis
 */

import type { CalculatorDefinition, CalculatorResult } from './index'

// Physical constants
const FARADAY = 96485.33 // C/mol
const H2_LHV = 120 // MJ/kg (lower heating value)
const H2_HHV = 142 // MJ/kg (higher heating value)
const MOLAR_MASS_H2 = 2.016 // g/mol
const REVERSIBLE_VOLTAGE = 1.23 // V at STP
const THERMONEUTRAL_VOLTAGE = 1.48 // V (includes heat of vaporization)

export type ElectrolyzerType = 'pem' | 'alkaline' | 'soec'

export interface ElectrolysisInputs {
  electrolyzerType: ElectrolyzerType
  cellVoltage: number // V
  currentDensity: number // A/cm²
  temperature: number // °C
  pressure: number // bar
  faradaicEfficiency?: number // 0-1
}

export function calculateElectrolysis(inputs: ElectrolysisInputs): CalculatorResult {
  const {
    electrolyzerType,
    cellVoltage,
    currentDensity,
    temperature,
    pressure,
    faradaicEfficiency = 0.98,
  } = inputs

  const notes: string[] = []
  const warnings: string[] = []

  // Voltage efficiency (relative to thermoneutral voltage)
  const voltageEfficiency = THERMONEUTRAL_VOLTAGE / cellVoltage

  // Stack efficiency (voltage × faradaic)
  const stackEfficiency = voltageEfficiency * faradaicEfficiency

  // System efficiency (including BOP, typically 85-95% of stack)
  const bopEfficiency = electrolyzerType === 'soec' ? 0.85 : 0.90
  const systemEfficiency = stackEfficiency * bopEfficiency

  // Hydrogen production rate (kg/h per m² of electrode)
  // From Faraday's law: m = (I × t × M) / (n × F)
  // where n = 2 electrons per H2 molecule
  const areaM2 = 0.01 // 100 cm² = 0.01 m²
  const currentA = currentDensity * 100 // A for 100 cm²
  const h2MolPerSecond = (currentA * faradaicEfficiency) / (2 * FARADAY)
  const h2KgPerHour = (h2MolPerSecond * MOLAR_MASS_H2 * 3600) / 1000

  // Energy consumption (kWh/kg H2)
  // Ideal: 39.4 kWh/kg (HHV) or 33.3 kWh/kg (LHV)
  const idealEnergy_LHV = 33.3
  const actualEnergy = idealEnergy_LHV / systemEfficiency

  // Technology-specific adjustments
  let degradationRate = 0 // %/1000h
  let lifetimeHours = 0
  let capitalCost = 0 // $/kW

  switch (electrolyzerType) {
    case 'pem':
      degradationRate = 0.1
      lifetimeHours = 60000
      capitalCost = 1400
      if (currentDensity > 2.0) {
        warnings.push('Current density may accelerate degradation')
      }
      notes.push('PEM: Fast response, high current density, compact')
      break
    case 'alkaline':
      degradationRate = 0.05
      lifetimeHours = 80000
      capitalCost = 800
      if (currentDensity > 0.5) {
        warnings.push('High current density for alkaline - verify design')
      }
      notes.push('Alkaline: Mature technology, lower cost, slower dynamics')
      break
    case 'soec':
      degradationRate = 0.5
      lifetimeHours = 20000
      capitalCost = 2000
      if (temperature < 700) {
        warnings.push('SOEC typically operates at 700-900°C')
      }
      notes.push('SOEC: Highest efficiency, uses waste heat, emerging technology')
      break
  }

  // Levelized cost of hydrogen (simplified, $/kg)
  const electricityCost = 0.05 // $/kWh
  const electricityCostPerKg = actualEnergy * electricityCost
  const capacityFactor = 0.9
  const capitalRecovery = capitalCost / (lifetimeHours * capacityFactor * h2KgPerHour)
  const lcoh = electricityCostPerKg + capitalRecovery

  // Pressure effect on efficiency (slight decrease at higher pressure)
  const pressurePenalty = pressure > 30 ? (pressure - 30) * 0.001 : 0

  return {
    outputs: {
      voltageEfficiency: voltageEfficiency * 100,
      stackEfficiency: stackEfficiency * 100,
      systemEfficiency: (systemEfficiency - pressurePenalty) * 100,
      energyConsumption: actualEnergy,
      h2ProductionRate: h2KgPerHour * 100, // per m² electrode
      degradationRate,
      lifetimeHours,
      lcoh,
      reversibleVoltage: REVERSIBLE_VOLTAGE,
      thermoneutralVoltage: THERMONEUTRAL_VOLTAGE,
    },
    notes,
    warnings,
  }
}

export const electrolysisCalculator: CalculatorDefinition = {
  id: 'electrolysis',
  name: 'Electrolysis Efficiency',
  domain: 'hydrogen-fuel',
  description: 'Calculates hydrogen production efficiency for water electrolysis',
  inputs: [
    {
      id: 'electrolyzerType',
      name: 'Electrolyzer Type',
      unit: '',
      defaultValue: 0, // Will need to handle as enum
      description: 'Technology type: PEM, Alkaline, or SOEC',
    },
    {
      id: 'cellVoltage',
      name: 'Cell Voltage',
      unit: 'V',
      defaultValue: 1.8,
      min: 1.4,
      max: 2.5,
      description: 'Operating voltage per cell',
    },
    {
      id: 'currentDensity',
      name: 'Current Density',
      unit: 'A/cm²',
      defaultValue: 1.0,
      min: 0.1,
      max: 4.0,
      description: 'Operating current density',
    },
    {
      id: 'temperature',
      name: 'Temperature',
      unit: '°C',
      defaultValue: 80,
      min: 20,
      max: 900,
      description: 'Operating temperature',
    },
    {
      id: 'pressure',
      name: 'Pressure',
      unit: 'bar',
      defaultValue: 30,
      min: 1,
      max: 100,
      description: 'Output pressure',
    },
  ],
  outputs: [
    { id: 'systemEfficiency', name: 'System Efficiency', unit: '%' },
    { id: 'energyConsumption', name: 'Energy Consumption', unit: 'kWh/kg H2' },
    { id: 'h2ProductionRate', name: 'H2 Production Rate', unit: 'kg/h/m²' },
    { id: 'lcoh', name: 'Levelized Cost of H2', unit: '$/kg' },
  ],
  calculate: (inputs) =>
    calculateElectrolysis({
      electrolyzerType: 'pem',
      cellVoltage: inputs.cellVoltage ?? 1.8,
      currentDensity: inputs.currentDensity ?? 1.0,
      temperature: inputs.temperature ?? 80,
      pressure: inputs.pressure ?? 30,
    }),
  formula: 'η = V_th / V_cell × η_faradaic × η_BOP',
  citation: 'DOE Hydrogen Program Technical Targets',
}
