/**
 * Battery Degradation Calculator
 *
 * Calculates capacity fade and cycle life for lithium-ion batteries.
 * Models both calendar aging and cycle aging mechanisms.
 *
 * @citation Xu et al. (2018). "Modeling of Lithium-Ion Battery Degradation
 *           for Cell Life Assessment". IEEE Transactions on Smart Grid.
 */

import type { CalculatorDefinition, CalculatorResult } from './index'

export type BatteryChemistry = 'nmc' | 'lfp' | 'nca' | 'lto'

export interface BatteryDegradationInputs {
  chemistry: BatteryChemistry
  temperature: number // °C
  depthOfDischarge: number // % (0-100)
  cRate: number // C (1C = full discharge in 1 hour)
  cyclesPerDay: number
  initialCapacity: number // Ah
  yearsInService?: number
}

export function calculateBatteryDegradation(inputs: BatteryDegradationInputs): CalculatorResult {
  const {
    chemistry,
    temperature,
    depthOfDischarge,
    cRate,
    cyclesPerDay,
    initialCapacity,
    yearsInService = 1,
  } = inputs

  const notes: string[] = []
  const warnings: string[] = []

  // Chemistry-specific parameters
  let baseCalendarFade = 0 // %/year
  let baseCycleFade = 0 // %/cycle
  let optimalTemp = 25 // °C
  let cycleLimitEOL = 0 // cycles to 80% capacity

  switch (chemistry) {
    case 'nmc':
      baseCalendarFade = 2.0
      baseCycleFade = 0.02
      cycleLimitEOL = 2000
      notes.push('NMC: Good energy density, moderate cycle life')
      break
    case 'lfp':
      baseCalendarFade = 1.0
      baseCycleFade = 0.01
      cycleLimitEOL = 4000
      optimalTemp = 30
      notes.push('LFP: Excellent cycle life, safer, lower energy density')
      break
    case 'nca':
      baseCalendarFade = 2.5
      baseCycleFade = 0.025
      cycleLimitEOL = 1500
      notes.push('NCA: High energy density, used in EVs')
      break
    case 'lto':
      baseCalendarFade = 0.5
      baseCycleFade = 0.005
      cycleLimitEOL = 15000
      notes.push('LTO: Exceptional cycle life, fast charging, lower energy')
      break
  }

  // Temperature factor (Arrhenius-like acceleration)
  // Each 10°C above optimal roughly doubles degradation
  const tempDelta = temperature - optimalTemp
  const tempFactor = Math.pow(2, tempDelta / 10)

  if (temperature > 45) {
    warnings.push('High temperature significantly accelerates degradation')
  }
  if (temperature < 0) {
    warnings.push('Low temperature can cause lithium plating during charging')
  }

  // Depth of Discharge factor
  // Higher DoD = more stress = faster degradation
  const dodFactor = 1 + (depthOfDischarge / 100 - 0.5) * 0.5

  // C-rate factor
  // Higher C-rate = more heat and stress
  const cRateFactor = 1 + Math.max(0, cRate - 1) * 0.2

  // Calculate calendar aging (per year)
  const calendarFade = baseCalendarFade * tempFactor

  // Calculate cycle aging (per cycle)
  const cycleFade = baseCycleFade * tempFactor * dodFactor * cRateFactor

  // Total cycles
  const totalCycles = cyclesPerDay * 365 * yearsInService

  // Total capacity fade
  const calendarLoss = calendarFade * yearsInService
  const cycleLoss = cycleFade * totalCycles
  const totalFade = Math.min(calendarLoss + cycleLoss, 100)

  // Remaining capacity
  const remainingCapacity = Math.max(0, 100 - totalFade)
  const remainingAh = initialCapacity * (remainingCapacity / 100)

  // State of Health
  const stateOfHealth = remainingCapacity

  // Estimated cycles to 80% capacity (EOL threshold)
  const fadePerCycle = cycleFade + calendarFade / (cyclesPerDay * 365)
  const cyclesToEOL = Math.floor(20 / fadePerCycle)

  // Remaining useful life (in years)
  const currentFade = totalFade
  const fadeToEOL = 20 - currentFade
  const remainingYears = fadeToEOL > 0 ? fadeToEOL / (calendarFade + cycleFade * cyclesPerDay * 365) : 0

  // Energy throughput
  const energyPerCycle = initialCapacity * 3.7 * (depthOfDischarge / 100) // Wh (assuming 3.7V nominal)
  const totalEnergy = energyPerCycle * totalCycles / 1000 // kWh

  return {
    outputs: {
      totalCapacityFade: totalFade,
      calendarFade: calendarLoss,
      cycleFade: cycleLoss,
      stateOfHealth,
      remainingCapacity: remainingAh,
      totalCycles,
      cyclesToEOL,
      remainingYears: Math.max(0, remainingYears),
      totalEnergyThroughput: totalEnergy,
      tempAccelerationFactor: tempFactor,
    },
    notes,
    warnings,
  }
}

export const batteryDegradationCalculator: CalculatorDefinition = {
  id: 'battery-degradation',
  name: 'Battery Degradation',
  domain: 'battery-storage',
  description: 'Calculates capacity fade and remaining life for lithium-ion batteries',
  inputs: [
    {
      id: 'chemistry',
      name: 'Battery Chemistry',
      unit: '',
      defaultValue: 0,
      description: 'NMC, LFP, NCA, or LTO',
    },
    {
      id: 'temperature',
      name: 'Operating Temperature',
      unit: '°C',
      defaultValue: 25,
      min: -20,
      max: 60,
      description: 'Average operating temperature',
    },
    {
      id: 'depthOfDischarge',
      name: 'Depth of Discharge',
      unit: '%',
      defaultValue: 80,
      min: 10,
      max: 100,
      description: 'Typical discharge depth per cycle',
    },
    {
      id: 'cRate',
      name: 'C-Rate',
      unit: 'C',
      defaultValue: 0.5,
      min: 0.1,
      max: 5,
      description: 'Typical charge/discharge rate',
    },
    {
      id: 'cyclesPerDay',
      name: 'Cycles Per Day',
      unit: '',
      defaultValue: 1,
      min: 0.1,
      max: 10,
      description: 'Average number of full cycles per day',
    },
    {
      id: 'initialCapacity',
      name: 'Initial Capacity',
      unit: 'Ah',
      defaultValue: 100,
      min: 1,
      max: 10000,
      description: 'Rated capacity of the battery',
    },
    {
      id: 'yearsInService',
      name: 'Years in Service',
      unit: 'years',
      defaultValue: 1,
      min: 0,
      max: 25,
      description: 'Time period for degradation calculation',
    },
  ],
  outputs: [
    { id: 'totalCapacityFade', name: 'Total Capacity Fade', unit: '%' },
    { id: 'stateOfHealth', name: 'State of Health', unit: '%' },
    { id: 'cyclesToEOL', name: 'Cycles to 80% Capacity', unit: 'cycles' },
    { id: 'remainingYears', name: 'Remaining Useful Life', unit: 'years' },
    { id: 'totalEnergyThroughput', name: 'Energy Throughput', unit: 'kWh' },
  ],
  calculate: (inputs) =>
    calculateBatteryDegradation({
      chemistry: 'lfp',
      temperature: inputs.temperature ?? 25,
      depthOfDischarge: inputs.depthOfDischarge ?? 80,
      cRate: inputs.cRate ?? 0.5,
      cyclesPerDay: inputs.cyclesPerDay ?? 1,
      initialCapacity: inputs.initialCapacity ?? 100,
      yearsInService: inputs.yearsInService ?? 1,
    }),
  formula: 'Q_fade = Q_calendar + Q_cycle = f(T, DoD, C-rate, cycles)',
  citation: 'Xu et al., IEEE Trans. Smart Grid (2018)',
}
