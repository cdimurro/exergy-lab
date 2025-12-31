/**
 * Carnot Efficiency Calculator
 *
 * Calculates the theoretical maximum efficiency for a heat engine.
 * The Carnot efficiency represents the upper limit for any heat engine
 * operating between two temperature reservoirs.
 *
 * @citation Carnot, S. (1824). "Réflexions sur la puissance motrice du feu"
 */

import type { CalculatorDefinition, CalculatorResult } from './index'

export interface CarnotInputs {
  hotTemperature: number // K or C
  coldTemperature: number // K or C
  isKelvin?: boolean
}

export function calculateCarnotEfficiency(inputs: CarnotInputs): CalculatorResult {
  const { hotTemperature, coldTemperature, isKelvin = true } = inputs

  // Convert to Kelvin if needed
  const T_hot = isKelvin ? hotTemperature : hotTemperature + 273.15
  const T_cold = isKelvin ? coldTemperature : coldTemperature + 273.15

  const notes: string[] = []
  const warnings: string[] = []

  // Validate temperatures
  if (T_cold >= T_hot) {
    warnings.push('Cold reservoir must be cooler than hot reservoir')
    return {
      outputs: {
        carnotEfficiency: 0,
        heatRejected: 100,
        temperatureRatio: 1,
      },
      warnings,
    }
  }

  if (T_cold < 0 || T_hot < 0) {
    warnings.push('Temperatures must be positive (in Kelvin)')
    return {
      outputs: { carnotEfficiency: 0, heatRejected: 100, temperatureRatio: 1 },
      warnings,
    }
  }

  // Carnot efficiency: η = 1 - T_cold/T_hot
  const carnotEfficiency = (1 - T_cold / T_hot) * 100

  // Heat rejected to cold reservoir (as percentage of input heat)
  const heatRejected = (T_cold / T_hot) * 100

  // Temperature ratio
  const temperatureRatio = T_hot / T_cold

  // Exergy efficiency (second-law efficiency)
  const exergyEfficiency = carnotEfficiency

  // Example applications
  if (T_hot > 800 && T_cold < 400) {
    notes.push('Temperature range suitable for combined cycle gas turbines')
  }
  if (T_hot < 400 && T_hot > 350) {
    notes.push('Temperature range suitable for organic Rankine cycle (ORC)')
  }
  if (carnotEfficiency > 60) {
    notes.push('High theoretical efficiency - consider practical losses of 30-50%')
  }

  // Practical efficiency estimate (typically 40-65% of Carnot)
  const practicalEfficiencyLow = carnotEfficiency * 0.4
  const practicalEfficiencyHigh = carnotEfficiency * 0.65

  return {
    outputs: {
      carnotEfficiency,
      heatRejected,
      temperatureRatio,
      exergyEfficiency,
      hotTemperatureK: T_hot,
      coldTemperatureK: T_cold,
      practicalEfficiencyLow,
      practicalEfficiencyHigh,
    },
    notes,
    warnings,
  }
}

export const carnotCalculator: CalculatorDefinition = {
  id: 'carnot-efficiency',
  name: 'Carnot Efficiency',
  domain: 'thermal',
  description: 'Calculates the theoretical maximum efficiency for any heat engine',
  inputs: [
    {
      id: 'hotTemperature',
      name: 'Hot Reservoir Temperature',
      unit: 'K',
      defaultValue: 600,
      min: 273,
      max: 2000,
      description: 'Temperature of heat source',
    },
    {
      id: 'coldTemperature',
      name: 'Cold Reservoir Temperature',
      unit: 'K',
      defaultValue: 300,
      min: 200,
      max: 500,
      description: 'Temperature of heat sink (often ambient)',
    },
  ],
  outputs: [
    { id: 'carnotEfficiency', name: 'Carnot Efficiency', unit: '%' },
    { id: 'heatRejected', name: 'Heat Rejected', unit: '%' },
    { id: 'temperatureRatio', name: 'Temperature Ratio', unit: '' },
    { id: 'exergyEfficiency', name: 'Exergy Efficiency', unit: '%' },
  ],
  calculate: (inputs) =>
    calculateCarnotEfficiency({
      hotTemperature: inputs.hotTemperature ?? 600,
      coldTemperature: inputs.coldTemperature ?? 300,
      isKelvin: true,
    }),
  formula: 'η_carnot = 1 - T_cold / T_hot',
  citation: 'Carnot, S. (1824). Réflexions sur la puissance motrice du feu',
}
