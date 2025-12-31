/**
 * Hydrogen Domain Module (v0.0.5)
 *
 * Domain-specific calculators, limits, and validation for hydrogen energy.
 * Includes electrolysis efficiency, production pathways, and storage analysis.
 *
 * @see lib/domains/base.ts - Base interfaces
 */

import {
  BaseDomainModule,
  type DomainCalculator,
  type PhysicalLimit,
  type IndustryBenchmark,
  type ValidationRule,
  type SimulationTemplate,
  type CalculatorResult,
  type DomainFormConfig,
} from '../base'

// ============================================================================
// Physical Limits
// ============================================================================

/**
 * Thermodynamic limits for hydrogen production
 */
export const HYDROGEN_PHYSICAL_LIMITS: PhysicalLimit[] = [
  {
    id: 'h2_hhv',
    name: 'Hydrogen Higher Heating Value',
    value: 141.86,
    unit: 'MJ/kg',
    description: 'Energy content of hydrogen (HHV)',
    citation: 'NIST Chemistry WebBook',
  },
  {
    id: 'h2_lhv',
    name: 'Hydrogen Lower Heating Value',
    value: 119.96,
    unit: 'MJ/kg',
    description: 'Energy content of hydrogen (LHV)',
    citation: 'NIST Chemistry WebBook',
  },
  {
    id: 'electrolysis_minimum_voltage',
    name: 'Minimum Electrolysis Voltage',
    value: 1.23,
    unit: 'V',
    description: 'Thermodynamic minimum voltage at 25C (reversible potential)',
    citation: 'Electrochemistry fundamentals',
  },
  {
    id: 'thermoneutral_voltage',
    name: 'Thermoneutral Voltage',
    value: 1.48,
    unit: 'V',
    description: 'Voltage at which electrolysis is thermally neutral',
    citation: 'DOE Hydrogen Program',
  },
  {
    id: 'faraday_efficiency_limit',
    name: 'Faraday Efficiency Limit',
    value: 100,
    unit: '%',
    description: 'Maximum coulombic efficiency (no parasitic reactions)',
    citation: 'Faraday law of electrolysis',
  },
  {
    id: 'minimum_energy_h2',
    name: 'Minimum Energy for Electrolysis',
    value: 39.4,
    unit: 'kWh/kg H2',
    description: 'Theoretical minimum at thermoneutral voltage',
    citation: 'DOE Hydrogen Program',
  },
  {
    id: 'h2_density_stp',
    name: 'Hydrogen Density (STP)',
    value: 0.0899,
    unit: 'kg/m3',
    description: 'Density at standard temperature and pressure',
    citation: 'NIST',
  },
  {
    id: 'h2_density_700bar',
    name: 'Hydrogen Density (700 bar)',
    value: 42.0,
    unit: 'kg/m3',
    description: 'Density at 700 bar (Type IV tank)',
    citation: 'DOE Hydrogen Storage',
  },
  {
    id: 'h2_liquefaction_energy',
    name: 'Liquefaction Energy',
    value: 12.5,
    unit: 'kWh/kg H2',
    description: 'Typical energy required for hydrogen liquefaction',
    citation: 'DOE Hydrogen Program',
  },
]

// ============================================================================
// Industry Benchmarks
// ============================================================================

/**
 * Current state-of-art benchmarks for hydrogen technologies
 */
export const HYDROGEN_BENCHMARKS: IndustryBenchmark[] = [
  // Electrolyzer technologies - commercial
  {
    id: 'pem_efficiency_sota',
    name: 'PEM Electrolyzer Efficiency (SOTA)',
    description: 'State-of-art PEM electrolyzer stack efficiency',
    value: 74,
    unit: '%',
    year: 2024,
    source: 'ITM Power, Nel Hydrogen',
    category: 'commercial',
  },
  {
    id: 'pem_system_efficiency',
    name: 'PEM System Efficiency (Commercial)',
    description: 'Commercial PEM system energy consumption',
    value: 55,
    unit: 'kWh/kg H2',
    year: 2024,
    source: 'ITM Power specifications',
    category: 'commercial',
  },
  {
    id: 'alkaline_efficiency_sota',
    name: 'Alkaline Electrolyzer Efficiency (SOTA)',
    description: 'State-of-art alkaline electrolyzer efficiency',
    value: 70,
    unit: '%',
    year: 2024,
    source: 'ThyssenKrupp, McPhy',
    category: 'commercial',
  },
  {
    id: 'alkaline_system_efficiency',
    name: 'Alkaline System Efficiency (Commercial)',
    description: 'Commercial alkaline system energy consumption',
    value: 50,
    unit: 'kWh/kg H2',
    year: 2024,
    source: 'ThyssenKrupp specifications',
    category: 'commercial',
  },
  // Lab records
  {
    id: 'soec_efficiency_lab',
    name: 'SOEC Efficiency (Lab Record)',
    description: 'Laboratory record for solid oxide electrolysis',
    value: 90,
    unit: '%',
    year: 2024,
    source: 'Bloom Energy, Sunfire',
    category: 'lab_record',
  },
  {
    id: 'soec_system_efficiency',
    name: 'SOEC System Efficiency (Demo)',
    description: 'Demonstration SOEC system energy consumption',
    value: 42,
    unit: 'kWh/kg H2',
    year: 2024,
    source: 'Sunfire GmbH',
    category: 'lab_record',
  },
  // Production pathways - commercial
  {
    id: 'smr_efficiency',
    name: 'SMR Efficiency (Industrial)',
    description: 'Industrial steam methane reforming efficiency',
    value: 76,
    unit: '%',
    year: 2024,
    source: 'Air Liquide, Linde',
    category: 'commercial',
  },
  {
    id: 'smr_co2_intensity',
    name: 'SMR CO2 Intensity',
    description: 'CO2 emissions from steam methane reforming',
    value: 9.3,
    unit: 'kg CO2/kg H2',
    year: 2024,
    source: 'IPCC, IEA',
    category: 'commercial',
  },
  {
    id: 'green_h2_co2_intensity',
    name: 'Green H2 CO2 Intensity',
    description: 'Life cycle CO2 for green hydrogen (upstream only)',
    value: 0.3,
    unit: 'kg CO2/kg H2',
    year: 2024,
    source: 'Life cycle analysis',
    category: 'commercial',
  },
  // Storage - commercial
  {
    id: 'type_iv_gravimetric',
    name: 'Type IV Tank Gravimetric Density',
    description: 'Hydrogen storage weight fraction in Type IV tanks',
    value: 5.7,
    unit: 'wt%',
    year: 2024,
    source: 'Toyota Mirai specifications',
    category: 'commercial',
  },
  {
    id: 'type_iv_volumetric',
    name: 'Type IV Tank Volumetric Density',
    description: 'Hydrogen storage density in Type IV tanks',
    value: 25,
    unit: 'g H2/L',
    year: 2024,
    source: 'DOE Technical Targets',
    category: 'commercial',
  },
  {
    id: 'liquid_h2_boiloff',
    name: 'Liquid H2 Boil-off Rate (Large Tank)',
    description: 'Daily boil-off rate for large liquid hydrogen tanks',
    value: 0.1,
    unit: '%/day',
    year: 2024,
    source: 'NASA, Linde',
    category: 'commercial',
  },
  // Cost projections
  {
    id: 'green_h2_cost_2024',
    name: 'Green H2 Cost (2024)',
    description: 'Current levelized cost of green hydrogen',
    value: 4.5,
    unit: '$/kg',
    year: 2024,
    source: 'BloombergNEF, IEA',
    category: 'commercial',
  },
  {
    id: 'green_h2_cost_target_2030',
    name: 'Green H2 Cost Target (2030)',
    description: 'DOE Hydrogen Shot target cost for 2030',
    value: 1.0,
    unit: '$/kg',
    year: 2030,
    source: 'DOE Hydrogen Shot',
    category: 'projected',
  },
]

// ============================================================================
// Calculator Functions
// ============================================================================

/**
 * Calculate electrolyzer system efficiency
 */
function calculateElectrolyzerEfficiency(
  voltage: number,
  faradayEfficiency: number = 0.98,
  auxiliaryPower: number = 0.1
): CalculatorResult {
  const thermoneutralVoltage = 1.48
  const voltageEfficiency = thermoneutralVoltage / voltage
  const stackEfficiency = voltageEfficiency * faradayEfficiency
  const systemEfficiency = stackEfficiency * (1 - auxiliaryPower)
  const theoreticalEnergy = 39.4
  const actualEnergy = theoreticalEnergy / systemEfficiency

  const warnings: string[] = []
  if (voltage < 1.48) {
    warnings.push('Voltage below thermoneutral - requires external heat input')
  }
  if (voltage > 2.2) {
    warnings.push('High voltage may indicate electrode degradation')
  }

  return {
    outputs: {
      systemEfficiency: Number((systemEfficiency * 100).toFixed(1)),
      stackEfficiency: Number((stackEfficiency * 100).toFixed(1)),
      voltageEfficiency: Number((voltageEfficiency * 100).toFixed(1)),
      energyConsumption: Number(actualEnergy.toFixed(1)),
    },
    isValid: voltage >= 1.23 && voltage <= 3.0,
    warnings,
    notes: [
      `Operating at ${voltage.toFixed(2)}V cell voltage`,
      `Energy consumption: ${actualEnergy.toFixed(1)} kWh/kg H2`,
    ],
    references: ['DOE Hydrogen and Fuel Cell Technologies Office'],
  }
}

/**
 * Compare hydrogen production pathways (SMR vs Electrolysis)
 */
function compareProductionPathways(
  annualProduction: number,
  electricityPrice: number,
  naturalGasPrice: number,
  carbonPrice: number = 0,
  electrolyzerEfficiency: number = 55
): CalculatorResult {
  // SMR parameters
  const smrCapexPerKg = 1.2
  const smrEfficiency = 0.76
  const smrCO2Intensity = 9.3
  const smrLifetime = 20
  const smrCapacityFactor = 0.9

  // Electrolyzer parameters
  const electrolyzerCapexPerKg = 2.5
  const electrolyzerLifetime = 15
  const electrolyzerCapacityFactor = 0.5
  const greenCO2Intensity = 0.3

  // Calculate SMR costs
  const ngConsumptionPerKgH2 = ((33.3 / smrEfficiency) / 293) * 1000
  const smrFuelCost = ngConsumptionPerKgH2 * naturalGasPrice
  const smrCarbonCost = (smrCO2Intensity / 1000) * carbonPrice
  const smrCapexContribution = smrCapexPerKg / (smrLifetime * smrCapacityFactor)
  const smrLCOH = smrFuelCost + smrCapexContribution + smrCarbonCost

  // Calculate green hydrogen costs
  const electrolysisFuelCost = electrolyzerEfficiency * electricityPrice
  const greenCarbonCost = (greenCO2Intensity / 1000) * carbonPrice
  const electrolyzerCapexContribution =
    electrolyzerCapexPerKg / (electrolyzerLifetime * electrolyzerCapacityFactor)
  const greenLCOH = electrolysisFuelCost + electrolyzerCapexContribution + greenCarbonCost

  // Break-even electricity price
  const breakEvenElectricityPrice =
    (smrLCOH - electrolyzerCapexContribution - greenCarbonCost) / electrolyzerEfficiency

  return {
    outputs: {
      greenLCOH: Number(greenLCOH.toFixed(2)),
      smrLCOH: Number(smrLCOH.toFixed(2)),
      costDifference: Number((greenLCOH - smrLCOH).toFixed(2)),
      breakEvenElectricityPrice: Number(breakEvenElectricityPrice.toFixed(4)),
      co2Avoided: Number((smrCO2Intensity - greenCO2Intensity).toFixed(1)),
    },
    isValid: true,
    notes: [
      `Green H2 LCOH: $${greenLCOH.toFixed(2)}/kg`,
      `SMR LCOH: $${smrLCOH.toFixed(2)}/kg`,
      `Break-even electricity: $${breakEvenElectricityPrice.toFixed(4)}/kWh`,
    ],
    references: ['IEA', 'BloombergNEF hydrogen cost models'],
  }
}

/**
 * Analyze hydrogen storage options
 */
function analyzeStorageOptions(
  storageCapacity: number,
  dischargeDuration: number,
  application: string = 'stationary'
): CalculatorResult {
  const options = {
    compressed350bar: {
      name: 'Compressed (350 bar)',
      volumetricDensity: 23,
      compressionEnergy: 2.5,
      capitalCost: 500,
      suitability: { vehicle: 0.6, stationary: 0.8, industrial: 0.9 },
    },
    compressed700bar: {
      name: 'Compressed (700 bar)',
      volumetricDensity: 42,
      compressionEnergy: 3.5,
      capitalCost: 700,
      suitability: { vehicle: 0.95, stationary: 0.6, industrial: 0.5 },
    },
    liquid: {
      name: 'Liquid Hydrogen',
      volumetricDensity: 70.8,
      compressionEnergy: 12.5,
      capitalCost: 300,
      suitability: { vehicle: 0.5, stationary: 0.7, industrial: 0.85 },
    },
    underground: {
      name: 'Underground (Salt Cavern)',
      volumetricDensity: 10,
      compressionEnergy: 2.0,
      capitalCost: 20,
      minimumCapacity: 100000,
      suitability: { vehicle: 0, stationary: 0.3, industrial: 0.95 },
    },
  }

  const app = application as 'vehicle' | 'stationary' | 'industrial'
  let bestOption = 'compressed350bar'
  let bestScore = 0

  for (const [key, option] of Object.entries(options)) {
    if ('minimumCapacity' in option && storageCapacity < (option.minimumCapacity || 0)) {
      continue
    }
    const score = option.suitability[app] || 0
    if (score > bestScore) {
      bestScore = score
      bestOption = key
    }
  }

  const selected = options[bestOption as keyof typeof options]
  const totalCost = selected.capitalCost * storageCapacity
  const energyLoss = selected.compressionEnergy * storageCapacity
  const tankVolume = (storageCapacity * 1000) / selected.volumetricDensity

  return {
    outputs: {
      recommendedOption: bestOption,
      recommendedName: selected.name,
      suitabilityScore: Number((bestScore * 100).toFixed(0)),
      totalCapitalCost: Number(totalCost.toFixed(0)),
      energyLoss: Number(energyLoss.toFixed(1)),
      tankVolumeLiters: Number(tankVolume.toFixed(0)),
    },
    isValid: true,
    notes: [
      `Recommended: ${selected.name}`,
      `Capital cost: $${totalCost.toLocaleString()}`,
      `Tank volume: ${tankVolume.toFixed(0)} liters`,
    ],
    references: ['DOE Hydrogen Storage Program', 'NREL'],
  }
}

/**
 * Calculate electrolyzer stack degradation
 */
function calculateStackDegradation(
  operatingHours: number,
  currentDensity: number,
  temperature: number,
  cycleCount: number,
  electrolyzerType: string = 'PEM'
): CalculatorResult {
  const degradationParams: Record<string, {
    baseRate: number
    currentDensityFactor: number
    temperatureFactor: number
    cycleFactor: number
    targetLifetime: number
    nominalCurrent: number
    nominalTemp: number
  }> = {
    PEM: {
      baseRate: 0.001,
      currentDensityFactor: 0.5,
      temperatureFactor: 0.02,
      cycleFactor: 0.0005,
      targetLifetime: 80000,
      nominalCurrent: 1.5,
      nominalTemp: 60,
    },
    Alkaline: {
      baseRate: 0.0005,
      currentDensityFactor: 0.3,
      temperatureFactor: 0.015,
      cycleFactor: 0.0002,
      targetLifetime: 90000,
      nominalCurrent: 0.4,
      nominalTemp: 60,
    },
    SOEC: {
      baseRate: 0.002,
      currentDensityFactor: 0.8,
      temperatureFactor: 0.05,
      cycleFactor: 0.002,
      targetLifetime: 40000,
      nominalCurrent: 0.5,
      nominalTemp: 750,
    },
  }

  const params = degradationParams[electrolyzerType] || degradationParams.PEM

  const baseDegradation = params.baseRate * operatingHours
  const currentAcceleration =
    currentDensity > params.nominalCurrent
      ? params.currentDensityFactor * (currentDensity - params.nominalCurrent) * operatingHours
      : 0
  const tempAcceleration =
    temperature > params.nominalTemp
      ? params.temperatureFactor * (temperature - params.nominalTemp) * (operatingHours / 1000)
      : 0
  const cycleDegradation = params.cycleFactor * cycleCount

  const totalDegradation = baseDegradation + currentAcceleration + tempAcceleration + cycleDegradation
  const efficiencyLoss = totalDegradation * 0.5
  const endOfLife = 20
  const remainingLife = Math.max(
    0,
    ((endOfLife - totalDegradation) / params.baseRate) *
      (operatingHours > 0 ? params.targetLifetime / operatingHours : 1)
  )

  const warnings: string[] = []
  if (totalDegradation > 15) {
    warnings.push('Stack approaching end-of-life (>15% degradation)')
  }
  if (currentDensity > params.nominalCurrent * 1.5) {
    warnings.push('High current density accelerating degradation')
  }

  return {
    outputs: {
      totalDegradation: Number(totalDegradation.toFixed(2)),
      efficiencyLoss: Number(efficiencyLoss.toFixed(2)),
      remainingLifeHours: Number(remainingLife.toFixed(0)),
      baseDegradation: Number(baseDegradation.toFixed(2)),
      currentAcceleration: Number(currentAcceleration.toFixed(2)),
      tempAcceleration: Number(tempAcceleration.toFixed(2)),
      cycleDegradation: Number(cycleDegradation.toFixed(2)),
    },
    isValid: true,
    warnings,
    notes: [
      `Total degradation: ${totalDegradation.toFixed(2)}%`,
      `Estimated remaining life: ${remainingLife.toFixed(0)} hours`,
    ],
    references: ['NREL electrolyzer durability studies'],
  }
}

// ============================================================================
// Calculator Definitions
// ============================================================================

export const HYDROGEN_CALCULATORS: DomainCalculator[] = [
  {
    id: 'electrolyzer_efficiency',
    name: 'Electrolyzer System Efficiency',
    description: 'Calculate electrolyzer system efficiency from operating voltage and losses',
    category: 'efficiency',
    inputs: [
      {
        id: 'voltage',
        name: 'Cell Voltage',
        description: 'Operating cell voltage',
        type: 'number',
        unit: 'V',
        min: 1.4,
        max: 2.5,
        defaultValue: 1.8,
        required: true,
      },
      {
        id: 'faradayEfficiency',
        name: 'Faraday Efficiency',
        description: 'Coulombic efficiency (typically 0.95-0.99)',
        type: 'number',
        unit: 'fraction',
        min: 0.9,
        max: 1.0,
        defaultValue: 0.98,
        required: true,
      },
      {
        id: 'auxiliaryPower',
        name: 'Auxiliary Power',
        description: 'Fraction of power for auxiliaries (pumps, controls)',
        type: 'number',
        unit: 'fraction',
        min: 0,
        max: 0.3,
        defaultValue: 0.1,
        required: true,
      },
    ],
    outputs: [
      { id: 'systemEfficiency', name: 'System Efficiency', description: 'Overall system efficiency', unit: '%' },
      { id: 'energyConsumption', name: 'Energy Consumption', description: 'Energy per kg H2', unit: 'kWh/kg H2' },
    ],
    calculate: (inputs) =>
      calculateElectrolyzerEfficiency(
        Number(inputs.voltage),
        Number(inputs.faradayEfficiency),
        Number(inputs.auxiliaryPower)
      ),
    citation: 'DOE Hydrogen and Fuel Cell Technologies Office',
  },
  {
    id: 'production_pathway_comparison',
    name: 'Production Pathway Comparison',
    description: 'Compare levelized cost of SMR vs green hydrogen production',
    category: 'economics',
    inputs: [
      {
        id: 'annualProduction',
        name: 'Annual Production',
        description: 'Target annual hydrogen production',
        type: 'number',
        unit: 'tonnes H2/year',
        min: 100,
        max: 100000,
        defaultValue: 10000,
        required: true,
      },
      {
        id: 'electricityPrice',
        name: 'Electricity Price',
        description: 'Grid or renewable electricity price',
        type: 'number',
        unit: '$/kWh',
        min: 0.01,
        max: 0.20,
        defaultValue: 0.04,
        required: true,
      },
      {
        id: 'naturalGasPrice',
        name: 'Natural Gas Price',
        description: 'Natural gas price for SMR',
        type: 'number',
        unit: '$/MMBtu',
        min: 2,
        max: 15,
        defaultValue: 4,
        required: true,
      },
      {
        id: 'carbonPrice',
        name: 'Carbon Price',
        description: 'Carbon pricing for CO2 emissions',
        type: 'number',
        unit: '$/tonne CO2',
        min: 0,
        max: 200,
        defaultValue: 50,
        required: false,
      },
      {
        id: 'electrolyzerEfficiency',
        name: 'Electrolyzer Efficiency',
        description: 'System energy consumption',
        type: 'number',
        unit: 'kWh/kg H2',
        min: 40,
        max: 70,
        defaultValue: 55,
        required: true,
      },
    ],
    outputs: [
      { id: 'greenLCOH', name: 'Green H2 LCOH', description: 'Levelized cost of green hydrogen', unit: '$/kg H2' },
      { id: 'smrLCOH', name: 'SMR LCOH', description: 'Levelized cost of SMR hydrogen', unit: '$/kg H2' },
      { id: 'breakEvenElectricityPrice', name: 'Break-even Electricity', description: 'Electricity price for cost parity', unit: '$/kWh' },
    ],
    calculate: (inputs) =>
      compareProductionPathways(
        Number(inputs.annualProduction),
        Number(inputs.electricityPrice),
        Number(inputs.naturalGasPrice),
        Number(inputs.carbonPrice),
        Number(inputs.electrolyzerEfficiency)
      ),
    citation: 'IEA, BloombergNEF hydrogen cost models',
  },
  {
    id: 'storage_options',
    name: 'Storage Options Analysis',
    description: 'Compare hydrogen storage technologies for given requirements',
    category: 'storage',
    inputs: [
      {
        id: 'storageCapacity',
        name: 'Storage Capacity',
        description: 'Required hydrogen storage capacity',
        type: 'number',
        unit: 'kg H2',
        min: 1,
        max: 1000000,
        defaultValue: 1000,
        required: true,
      },
      {
        id: 'dischargeDuration',
        name: 'Discharge Duration',
        description: 'Target discharge duration',
        type: 'number',
        unit: 'hours',
        min: 1,
        max: 720,
        defaultValue: 24,
        required: true,
      },
      {
        id: 'application',
        name: 'Application',
        description: 'Primary use case for storage',
        type: 'select',
        unit: '',
        options: [
          { value: 'vehicle', label: 'Vehicle' },
          { value: 'stationary', label: 'Stationary' },
          { value: 'industrial', label: 'Industrial' },
        ],
        defaultValue: 'stationary',
        required: true,
      },
    ],
    outputs: [
      { id: 'recommendedOption', name: 'Recommended Storage', description: 'Best storage option', unit: '' },
      { id: 'totalCapitalCost', name: 'Capital Cost', description: 'Total capital cost', unit: '$' },
      { id: 'energyLoss', name: 'Energy Loss', description: 'Energy for compression/liquefaction', unit: 'kWh' },
    ],
    calculate: (inputs) =>
      analyzeStorageOptions(
        Number(inputs.storageCapacity),
        Number(inputs.dischargeDuration),
        String(inputs.application)
      ),
    citation: 'DOE Hydrogen Storage Program, NREL',
  },
  {
    id: 'stack_degradation',
    name: 'Electrolyzer Stack Degradation',
    description: 'Estimate electrolyzer degradation based on operating conditions',
    category: 'durability',
    inputs: [
      {
        id: 'operatingHours',
        name: 'Operating Hours',
        description: 'Total operating hours',
        type: 'number',
        unit: 'hours',
        min: 0,
        max: 100000,
        defaultValue: 20000,
        required: true,
      },
      {
        id: 'currentDensity',
        name: 'Current Density',
        description: 'Operating current density',
        type: 'number',
        unit: 'A/cm2',
        min: 0.1,
        max: 4.0,
        defaultValue: 1.5,
        required: true,
      },
      {
        id: 'temperature',
        name: 'Operating Temperature',
        description: 'Cell operating temperature',
        type: 'number',
        unit: 'C',
        min: 20,
        max: 850,
        defaultValue: 60,
        required: true,
      },
      {
        id: 'cycleCount',
        name: 'Cycle Count',
        description: 'Number of on/off cycles',
        type: 'number',
        unit: 'cycles',
        min: 0,
        max: 50000,
        defaultValue: 1000,
        required: true,
      },
      {
        id: 'electrolyzerType',
        name: 'Electrolyzer Type',
        description: 'Technology type',
        type: 'select',
        unit: '',
        options: [
          { value: 'PEM', label: 'PEM' },
          { value: 'Alkaline', label: 'Alkaline' },
          { value: 'SOEC', label: 'SOEC' },
        ],
        defaultValue: 'PEM',
        required: true,
      },
    ],
    outputs: [
      { id: 'totalDegradation', name: 'Total Degradation', description: 'Cumulative degradation', unit: '%' },
      { id: 'efficiencyLoss', name: 'Efficiency Loss', description: 'Efficiency reduction', unit: '%' },
      { id: 'remainingLifeHours', name: 'Remaining Life', description: 'Estimated remaining hours', unit: 'hours' },
    ],
    calculate: (inputs) =>
      calculateStackDegradation(
        Number(inputs.operatingHours),
        Number(inputs.currentDensity),
        Number(inputs.temperature),
        Number(inputs.cycleCount),
        String(inputs.electrolyzerType)
      ),
    citation: 'NREL electrolyzer durability studies',
  },
]

// ============================================================================
// Validation Rules
// ============================================================================

export const HYDROGEN_VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'electrolyzer_voltage_range',
    name: 'Electrolyzer Voltage Range',
    description: 'Cell voltage must be above thermoneutral voltage for stable operation',
    severity: 'warning',
    check: (value) => value >= 1.48 && value <= 2.5,
    message: 'Cell voltage should be between 1.48V (thermoneutral) and 2.5V for efficient operation',
  },
  {
    id: 'electrolysis_efficiency_bounds',
    name: 'Electrolysis Efficiency Bounds',
    description: 'System efficiency cannot exceed thermodynamic limits',
    severity: 'error',
    check: (value) => value >= 39.4,
    message: 'Energy consumption below theoretical minimum (39.4 kWh/kg H2) is physically impossible',
  },
  {
    id: 'soec_temperature_range',
    name: 'SOEC Temperature Range',
    description: 'Solid oxide electrolyzers require high operating temperatures',
    severity: 'warning',
    check: (value) => value >= 600 && value <= 900,
    message: 'SOEC typically operates at 600-900C for optimal performance',
  },
  {
    id: 'storage_capacity_feasibility',
    name: 'Storage Capacity Feasibility',
    description: 'Very large storage may require underground caverns',
    severity: 'info',
    check: (value) => value < 100000,
    message: 'Storage capacities >100 tonnes typically require underground cavern storage',
  },
]

// ============================================================================
// Simulation Templates
// ============================================================================

export const HYDROGEN_SIMULATION_TEMPLATES: SimulationTemplate[] = [
  {
    id: 'pem_electrolyzer_optimization',
    name: 'PEM Electrolyzer Optimization',
    description: 'Optimize PEM electrolyzer operating parameters for minimum LCOH',
    provider: 'modal',
    parameters: {
      currentDensityRange: [0.5, 3.0],
      temperatureRange: [50, 80],
      pressureRange: [1, 30],
      cellArea: 500,
      stackCells: 100,
    },
    estimatedCost: 0.25,
    estimatedDuration: 300,
  },
  {
    id: 'green_hydrogen_project',
    name: 'Green Hydrogen Project Feasibility',
    description: 'Full techno-economic assessment of green hydrogen production',
    provider: 'modal',
    parameters: {
      productionCapacity: 10000,
      electricityPriceRange: [0.02, 0.08],
      capacityFactorRange: [0.3, 0.6],
      electrolyzerCapexRange: [800, 1500],
      stackLifetimeRange: [60000, 100000],
    },
    estimatedCost: 0.50,
    estimatedDuration: 600,
  },
  {
    id: 'storage_system_sizing',
    name: 'H2 Storage System Sizing',
    description: 'Size hydrogen storage system for given demand profile',
    provider: 'analytical',
    parameters: {
      demandProfile: 'industrial',
      peakDemand: 500,
      autonomyHours: 24,
      compressionStrategy: 'cascade',
    },
    estimatedCost: 0,
    estimatedDuration: 10,
  },
]

// ============================================================================
// Form Configuration
// ============================================================================

export const HYDROGEN_FORM_CONFIG: DomainFormConfig = {
  sections: [
    {
      id: 'electrolysis',
      title: 'Electrolysis Parameters',
      fields: HYDROGEN_CALCULATORS[0].inputs,
    },
    {
      id: 'production',
      title: 'Production Economics',
      fields: HYDROGEN_CALCULATORS[1].inputs,
    },
  ],
  presets: [
    {
      id: 'pem_commercial',
      name: 'Commercial PEM',
      values: {
        voltage: 1.8,
        faradayEfficiency: 0.98,
        auxiliaryPower: 0.1,
      },
    },
    {
      id: 'alkaline_industrial',
      name: 'Industrial Alkaline',
      values: {
        voltage: 1.9,
        faradayEfficiency: 0.96,
        auxiliaryPower: 0.12,
      },
    },
  ],
}

// ============================================================================
// Module Export
// ============================================================================

class HydrogenDomain extends BaseDomainModule {
  id = 'hydrogen' as const
  name = 'Hydrogen Energy'
  description = 'Hydrogen production, storage, and utilization technologies'
  icon = 'flame'
  physicalLimits = HYDROGEN_PHYSICAL_LIMITS
  industryBenchmarks = HYDROGEN_BENCHMARKS
  calculators = HYDROGEN_CALCULATORS
  validationRules = HYDROGEN_VALIDATION_RULES
  simulationTemplates = HYDROGEN_SIMULATION_TEMPLATES
  inputFormConfig = HYDROGEN_FORM_CONFIG
}

export const HydrogenDomainModule = new HydrogenDomain()

export default HydrogenDomainModule
