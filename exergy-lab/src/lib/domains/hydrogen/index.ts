/**
 * Hydrogen Domain Module (v0.0.5)
 *
 * Domain-specific calculators, limits, and validation for hydrogen energy.
 * Includes electrolysis efficiency, production pathways, and storage analysis.
 *
 * @see lib/domains/base.ts - Base interfaces
 */

import type {
  DomainModule,
  DomainCalculator,
  PhysicalLimit,
  IndustryBenchmark,
  ValidationRule,
  SimulationTemplate,
  CalculatorResult,
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
    description: 'Thermodynamic minimum voltage at 25°C (reversible potential)',
    citation: 'Electrochemistry fundamentals',
  },
  {
    id: 'thermoneutral_voltage',
    name: 'Thermoneutral Voltage',
    value: 1.48,
    unit: 'V',
    description: 'Voltage at which electrolysis is thermally neutral (no heat required/released)',
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
    unit: 'kg/m³',
    description: 'Density at standard temperature and pressure',
    citation: 'NIST',
  },
  {
    id: 'h2_density_700bar',
    name: 'Hydrogen Density (700 bar)',
    value: 42.0,
    unit: 'kg/m³',
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
  // Electrolyzer technologies
  {
    id: 'pem_efficiency_sota',
    name: 'PEM Electrolyzer Efficiency (SOTA)',
    value: 74,
    unit: '%',
    year: 2024,
    source: 'ITM Power, Nel Hydrogen',
    category: 'electrolyzer',
  },
  {
    id: 'pem_system_efficiency',
    name: 'PEM System Efficiency (Commercial)',
    value: 55,
    unit: 'kWh/kg H2',
    year: 2024,
    source: 'ITM Power specifications',
    category: 'electrolyzer',
  },
  {
    id: 'alkaline_efficiency_sota',
    name: 'Alkaline Electrolyzer Efficiency (SOTA)',
    value: 70,
    unit: '%',
    year: 2024,
    source: 'ThyssenKrupp, McPhy',
    category: 'electrolyzer',
  },
  {
    id: 'alkaline_system_efficiency',
    name: 'Alkaline System Efficiency (Commercial)',
    value: 50,
    unit: 'kWh/kg H2',
    year: 2024,
    source: 'ThyssenKrupp specifications',
    category: 'electrolyzer',
  },
  {
    id: 'soec_efficiency_lab',
    name: 'SOEC Efficiency (Lab Record)',
    value: 90,
    unit: '%',
    year: 2024,
    source: 'Bloom Energy, Sunfire',
    category: 'electrolyzer',
  },
  {
    id: 'soec_system_efficiency',
    name: 'SOEC System Efficiency (Demo)',
    value: 42,
    unit: 'kWh/kg H2',
    year: 2024,
    source: 'Sunfire GmbH',
    category: 'electrolyzer',
  },
  // Production pathways
  {
    id: 'smr_efficiency',
    name: 'SMR Efficiency (Industrial)',
    value: 76,
    unit: '%',
    year: 2024,
    source: 'Air Liquide, Linde',
    category: 'production',
  },
  {
    id: 'smr_co2_intensity',
    name: 'SMR CO2 Intensity',
    value: 9.3,
    unit: 'kg CO2/kg H2',
    year: 2024,
    source: 'IPCC, IEA',
    category: 'production',
  },
  {
    id: 'green_h2_co2_intensity',
    name: 'Green H2 CO2 Intensity',
    value: 0.3,
    unit: 'kg CO2/kg H2',
    year: 2024,
    source: 'Life cycle analysis (upstream only)',
    category: 'production',
  },
  // Storage
  {
    id: 'type_iv_gravimetric',
    name: 'Type IV Tank Gravimetric Density',
    value: 5.7,
    unit: 'wt%',
    year: 2024,
    source: 'Toyota Mirai specifications',
    category: 'storage',
  },
  {
    id: 'type_iv_volumetric',
    name: 'Type IV Tank Volumetric Density',
    value: 25,
    unit: 'g H2/L',
    year: 2024,
    source: 'DOE Technical Targets',
    category: 'storage',
  },
  {
    id: 'liquid_h2_boiloff',
    name: 'Liquid H2 Boil-off Rate (Large Tank)',
    value: 0.1,
    unit: '%/day',
    year: 2024,
    source: 'NASA, Linde',
    category: 'storage',
  },
  // Cost targets
  {
    id: 'green_h2_cost_2024',
    name: 'Green H2 Cost (2024)',
    value: 4.5,
    unit: '$/kg',
    year: 2024,
    source: 'BloombergNEF, IEA',
    category: 'economics',
  },
  {
    id: 'green_h2_cost_target_2030',
    name: 'Green H2 Cost Target (2030)',
    value: 1.0,
    unit: '$/kg',
    year: 2030,
    source: 'DOE Hydrogen Shot',
    category: 'economics',
  },
]

// ============================================================================
// Calculators
// ============================================================================

/**
 * Calculate electrolyzer system efficiency
 *
 * @param voltage Operating cell voltage (V)
 * @param faradayEfficiency Faraday (coulombic) efficiency (0-1)
 * @param auxiliaryPower Auxiliary power consumption (% of stack power)
 * @returns System efficiency and energy consumption
 */
function calculateElectrolyzerEfficiency(
  voltage: number,
  faradayEfficiency: number = 0.98,
  auxiliaryPower: number = 0.1
): CalculatorResult {
  // Thermoneutral voltage at standard conditions
  const thermoneutralVoltage = 1.48 // V

  // Voltage efficiency (based on thermoneutral voltage)
  const voltageEfficiency = thermoneutralVoltage / voltage

  // Stack efficiency
  const stackEfficiency = voltageEfficiency * faradayEfficiency

  // System efficiency including auxiliaries
  const systemEfficiency = stackEfficiency * (1 - auxiliaryPower)

  // Energy consumption (kWh/kg H2)
  // Theoretical: 39.4 kWh/kg at thermoneutral
  const theoreticalEnergy = 39.4 // kWh/kg H2
  const actualEnergy = theoreticalEnergy / systemEfficiency

  // Current density estimate (rough correlation)
  // Higher voltage typically means higher current density
  const estimatedCurrentDensity = (voltage - 1.4) * 2.0 // A/cm² (very rough)

  return {
    value: systemEfficiency,
    unit: 'fraction',
    confidence: 0.9,
    metadata: {
      voltageEfficiency,
      faradayEfficiency,
      stackEfficiency,
      systemEfficiency,
      energyConsumption: actualEnergy,
      energyUnit: 'kWh/kg H2',
      estimatedCurrentDensity: Math.max(0, estimatedCurrentDensity),
      currentDensityUnit: 'A/cm²',
      operatingVoltage: voltage,
    },
  }
}

/**
 * Compare hydrogen production pathways (SMR vs Electrolysis)
 *
 * @param annualProduction Target annual production (tonnes H2/year)
 * @param electricityPrice Electricity price ($/kWh)
 * @param naturalGasPrice Natural gas price ($/MMBtu)
 * @param carbonPrice Carbon price ($/tonne CO2)
 * @param electrolyzerEfficiency Electrolyzer system efficiency (kWh/kg)
 * @returns Levelized cost comparison
 */
function compareProductionPathways(
  annualProduction: number,
  electricityPrice: number,
  naturalGasPrice: number,
  carbonPrice: number = 0,
  electrolyzerEfficiency: number = 55
): CalculatorResult {
  // SMR parameters
  const smrCapexPerKg = 1.2 // $/kg/year capacity
  const smrEfficiency = 0.76 // LHV basis
  const smrCO2Intensity = 9.3 // kg CO2/kg H2
  const smrLifetime = 20 // years
  const smrCapacityFactor = 0.9

  // Electrolyzer parameters
  const electrolyzerCapexPerKg = 2.5 // $/kg/year capacity (falling)
  const electrolyzerLifetime = 15 // years (stack replacement at ~80k hours)
  const electrolyzerCapacityFactor = 0.5 // depends on renewable availability
  const greenCO2Intensity = 0.3 // kg CO2/kg H2

  // Natural gas: ~1 MMBtu = 293 kWh, H2 LHV = 33.3 kWh/kg
  // SMR uses ~165 MJ NG per kg H2 at 76% efficiency
  const ngConsumptionPerKgH2 = (33.3 / smrEfficiency) / 293 * 1000 // MMBtu/kg H2
  const smrFuelCost = ngConsumptionPerKgH2 * naturalGasPrice

  // Electricity cost for electrolysis
  const electrolysisFuelCost = electrolyzerEfficiency * electricityPrice

  // Carbon costs
  const smrCarbonCost = (smrCO2Intensity / 1000) * carbonPrice
  const greenCarbonCost = (greenCO2Intensity / 1000) * carbonPrice

  // Simple LCOH (Levelized Cost of Hydrogen) calculation
  // Ignoring discount rate for simplicity
  const smrCapexContribution = smrCapexPerKg / (smrLifetime * smrCapacityFactor)
  const smrLCOH = smrFuelCost + smrCapexContribution + smrCarbonCost

  const electrolyzerCapexContribution =
    electrolyzerCapexPerKg / (electrolyzerLifetime * electrolyzerCapacityFactor)
  const greenLCOH = electrolysisFuelCost + electrolyzerCapexContribution + greenCarbonCost

  // Break-even electricity price
  const breakEvenElectricityPrice =
    (smrLCOH - electrolyzerCapexContribution - greenCarbonCost) / electrolyzerEfficiency

  return {
    value: greenLCOH,
    unit: '$/kg H2',
    confidence: 0.75,
    metadata: {
      smr: {
        lcoh: smrLCOH,
        fuelCost: smrFuelCost,
        capexContribution: smrCapexContribution,
        carbonCost: smrCarbonCost,
        co2Intensity: smrCO2Intensity,
      },
      green: {
        lcoh: greenLCOH,
        electricityCost: electrolysisFuelCost,
        capexContribution: electrolyzerCapexContribution,
        carbonCost: greenCarbonCost,
        co2Intensity: greenCO2Intensity,
      },
      comparison: {
        costDifference: greenLCOH - smrLCOH,
        greenPremium: ((greenLCOH - smrLCOH) / smrLCOH) * 100,
        breakEvenElectricityPrice,
        co2Avoided: smrCO2Intensity - greenCO2Intensity,
      },
      annualProduction,
      electricityPrice,
      naturalGasPrice,
      carbonPrice,
    },
  }
}

/**
 * Analyze hydrogen storage options
 *
 * @param storageCapacity Required storage capacity (kg H2)
 * @param dischargeDuration Target discharge duration (hours)
 * @param applications Use case ('vehicle' | 'stationary' | 'industrial')
 * @returns Storage option comparison
 */
function analyzeStorageOptions(
  storageCapacity: number,
  dischargeDuration: number,
  applications: 'vehicle' | 'stationary' | 'industrial' = 'stationary'
): CalculatorResult {
  // Storage option parameters
  const options = {
    compressed350bar: {
      name: 'Compressed (350 bar)',
      gravimetricDensity: 0.035, // kg H2/kg tank
      volumetricDensity: 23, // g H2/L
      compressionEnergy: 2.5, // kWh/kg H2
      capitalCost: 500, // $/kg H2 capacity
      operatingCost: 0.3, // $/kg H2
      suitability: { vehicle: 0.6, stationary: 0.8, industrial: 0.9 },
    },
    compressed700bar: {
      name: 'Compressed (700 bar)',
      gravimetricDensity: 0.057, // kg H2/kg tank
      volumetricDensity: 42, // g H2/L
      compressionEnergy: 3.5, // kWh/kg H2
      capitalCost: 700, // $/kg H2 capacity
      operatingCost: 0.4, // $/kg H2
      suitability: { vehicle: 0.95, stationary: 0.6, industrial: 0.5 },
    },
    liquid: {
      name: 'Liquid Hydrogen',
      gravimetricDensity: 0.10, // kg H2/kg tank (large scale)
      volumetricDensity: 70.8, // g H2/L
      compressionEnergy: 12.5, // kWh/kg H2 (liquefaction)
      capitalCost: 300, // $/kg H2 capacity (large scale)
      operatingCost: 0.5, // $/kg H2 (includes boil-off)
      boiloffRate: 0.001, // 0.1%/day for large tanks
      suitability: { vehicle: 0.5, stationary: 0.7, industrial: 0.85 },
    },
    metalHydride: {
      name: 'Metal Hydride',
      gravimetricDensity: 0.015, // kg H2/kg material
      volumetricDensity: 100, // g H2/L (in material)
      compressionEnergy: 0.5, // kWh/kg H2
      capitalCost: 3000, // $/kg H2 capacity
      operatingCost: 0.1, // $/kg H2
      suitability: { vehicle: 0.3, stationary: 0.9, industrial: 0.4 },
    },
    underground: {
      name: 'Underground (Salt Cavern)',
      gravimetricDensity: 0, // N/A
      volumetricDensity: 10, // g H2/L (at ~100 bar)
      compressionEnergy: 2.0, // kWh/kg H2
      capitalCost: 20, // $/kg H2 capacity (large scale)
      operatingCost: 0.05, // $/kg H2
      minimumCapacity: 100000, // kg H2
      suitability: { vehicle: 0, stationary: 0.3, industrial: 0.95 },
    },
  }

  // Evaluate each option
  type StorageOptionKey = keyof typeof options
  const evaluations: Record<string, {
    name: string
    tankMass: number
    tankVolume: number
    energyLoss: number
    totalCapitalCost: number
    annualOperatingCost: number
    suitabilityScore: number
    overallScore: number
  }> = {}

  for (const [key, option] of Object.entries(options)) {
    const optKey = key as StorageOptionKey
    // Skip underground if capacity too small
    if ('minimumCapacity' in option && storageCapacity < (option.minimumCapacity || 0)) {
      continue
    }

    const tankMass =
      option.gravimetricDensity > 0
        ? storageCapacity / option.gravimetricDensity
        : 0
    const tankVolume = (storageCapacity * 1000) / option.volumetricDensity // liters
    const energyLoss = option.compressionEnergy * storageCapacity
    const totalCapitalCost = option.capitalCost * storageCapacity
    const annualOperatingCost =
      option.operatingCost * storageCapacity * (8760 / dischargeDuration)

    // Boil-off losses for liquid (if applicable)
    const boiloffLoss = 'boiloffRate' in option && option.boiloffRate
      ? (option.boiloffRate || 0) * dischargeDuration * storageCapacity
      : 0

    // Suitability score based on application
    const suitabilityScore = option.suitability[applications]

    // Overall score (weighted combination)
    const costScore = Math.exp(-totalCapitalCost / (storageCapacity * 1000))
    const efficiencyScore = Math.exp(-energyLoss / (storageCapacity * 10))
    const overallScore = suitabilityScore * 0.4 + costScore * 0.3 + efficiencyScore * 0.3

    evaluations[key] = {
      name: option.name,
      tankMass,
      tankVolume,
      energyLoss: energyLoss + boiloffLoss,
      totalCapitalCost,
      annualOperatingCost,
      suitabilityScore,
      overallScore,
    }
  }

  // Find recommended option
  const recommended = Object.entries(evaluations).reduce((best, [key, val]) => {
    if (!best || val.overallScore > (evaluations[best]?.overallScore ?? 0)) {
      return key
    }
    return best
  }, '' as string)

  return {
    value: evaluations[recommended]?.overallScore ?? 0,
    unit: 'score',
    confidence: 0.8,
    metadata: {
      recommended,
      recommendedName: evaluations[recommended]?.name,
      evaluations,
      inputs: {
        storageCapacity,
        dischargeDuration,
        applications,
      },
    },
  }
}

/**
 * Calculate electrolyzer stack degradation
 *
 * @param operatingHours Total operating hours
 * @param currentDensity Operating current density (A/cm²)
 * @param temperature Operating temperature (°C)
 * @param cycleCount Number of on/off cycles
 * @param electrolyzerType 'PEM' | 'Alkaline' | 'SOEC'
 * @returns Degradation estimate
 */
function calculateStackDegradation(
  operatingHours: number,
  currentDensity: number,
  temperature: number,
  cycleCount: number,
  electrolyzerType: 'PEM' | 'Alkaline' | 'SOEC' = 'PEM'
): CalculatorResult {
  // Degradation parameters by technology
  const degradationParams = {
    PEM: {
      baseRate: 0.001, // %/hour at nominal conditions
      currentDensityFactor: 0.5, // Additional degradation per A/cm² above 1.5
      temperatureFactor: 0.02, // Additional %/°C above 60°C
      cycleFactor: 0.0005, // % per cycle
      targetLifetime: 80000, // hours
    },
    Alkaline: {
      baseRate: 0.0005,
      currentDensityFactor: 0.3,
      temperatureFactor: 0.015,
      cycleFactor: 0.0002,
      targetLifetime: 90000,
    },
    SOEC: {
      baseRate: 0.002,
      currentDensityFactor: 0.8,
      temperatureFactor: 0.05, // Very sensitive at high temps
      cycleFactor: 0.002, // Thermal cycling is damaging
      targetLifetime: 40000,
    },
  }

  const params = degradationParams[electrolyzerType]

  // Base degradation from hours
  const baseDegradation = params.baseRate * operatingHours

  // Current density acceleration
  const nominalCurrentDensity =
    electrolyzerType === 'PEM' ? 1.5 : electrolyzerType === 'Alkaline' ? 0.4 : 0.5
  const currentAcceleration =
    currentDensity > nominalCurrentDensity
      ? params.currentDensityFactor * (currentDensity - nominalCurrentDensity) * operatingHours
      : 0

  // Temperature acceleration
  const nominalTemp = electrolyzerType === 'SOEC' ? 750 : 60
  const tempAcceleration =
    temperature > nominalTemp
      ? params.temperatureFactor * (temperature - nominalTemp) * (operatingHours / 1000)
      : 0

  // Cycling degradation
  const cycleDegradation = params.cycleFactor * cycleCount

  // Total degradation
  const totalDegradation =
    baseDegradation + currentAcceleration + tempAcceleration + cycleDegradation

  // Efficiency loss (assume 1% degradation = 0.5% efficiency loss)
  const efficiencyLoss = totalDegradation * 0.5

  // Remaining useful life
  const endOfLife = 20 // % degradation threshold
  const remainingLife = Math.max(
    0,
    ((endOfLife - totalDegradation) / params.baseRate) *
      (params.targetLifetime / operatingHours || 1)
  )

  return {
    value: totalDegradation,
    unit: '%',
    confidence: 0.75,
    metadata: {
      components: {
        baseDegradation,
        currentAcceleration,
        tempAcceleration,
        cycleDegradation,
      },
      efficiencyLoss,
      remainingLifeHours: remainingLife,
      targetLifetime: params.targetLifetime,
      electrolyzerType,
      operatingConditions: {
        hours: operatingHours,
        currentDensity,
        temperature,
        cycles: cycleCount,
      },
    },
  }
}

// ============================================================================
// Calculator Definitions
// ============================================================================

export const HYDROGEN_CALCULATORS: DomainCalculator[] = [
  {
    id: 'electrolyzer_efficiency',
    name: 'Electrolyzer System Efficiency',
    description:
      'Calculate electrolyzer system efficiency from operating voltage and losses',
    inputs: [
      {
        id: 'voltage',
        name: 'Cell Voltage',
        unit: 'V',
        min: 1.4,
        max: 2.5,
        defaultValue: 1.8,
      },
      {
        id: 'faradayEfficiency',
        name: 'Faraday Efficiency',
        unit: 'fraction',
        min: 0.9,
        max: 1.0,
        defaultValue: 0.98,
      },
      {
        id: 'auxiliaryPower',
        name: 'Auxiliary Power',
        unit: 'fraction',
        min: 0,
        max: 0.3,
        defaultValue: 0.1,
      },
    ],
    outputs: [
      { id: 'systemEfficiency', name: 'System Efficiency', unit: 'fraction' },
      { id: 'energyConsumption', name: 'Energy Consumption', unit: 'kWh/kg H2' },
    ],
    calculate: (inputs) =>
      calculateElectrolyzerEfficiency(
        inputs.voltage,
        inputs.faradayEfficiency,
        inputs.auxiliaryPower
      ),
    citation: 'DOE Hydrogen and Fuel Cell Technologies Office',
  },
  {
    id: 'production_pathway_comparison',
    name: 'Production Pathway Comparison',
    description: 'Compare levelized cost of SMR vs green hydrogen production',
    inputs: [
      {
        id: 'annualProduction',
        name: 'Annual Production',
        unit: 'tonnes H2/year',
        min: 100,
        max: 100000,
        defaultValue: 10000,
      },
      {
        id: 'electricityPrice',
        name: 'Electricity Price',
        unit: '$/kWh',
        min: 0.01,
        max: 0.20,
        defaultValue: 0.04,
      },
      {
        id: 'naturalGasPrice',
        name: 'Natural Gas Price',
        unit: '$/MMBtu',
        min: 2,
        max: 15,
        defaultValue: 4,
      },
      {
        id: 'carbonPrice',
        name: 'Carbon Price',
        unit: '$/tonne CO2',
        min: 0,
        max: 200,
        defaultValue: 50,
      },
      {
        id: 'electrolyzerEfficiency',
        name: 'Electrolyzer Efficiency',
        unit: 'kWh/kg H2',
        min: 40,
        max: 70,
        defaultValue: 55,
      },
    ],
    outputs: [
      { id: 'greenLCOH', name: 'Green H2 LCOH', unit: '$/kg H2' },
      { id: 'smrLCOH', name: 'SMR LCOH', unit: '$/kg H2' },
      { id: 'breakEvenPrice', name: 'Break-even Electricity', unit: '$/kWh' },
    ],
    calculate: (inputs) =>
      compareProductionPathways(
        inputs.annualProduction,
        inputs.electricityPrice,
        inputs.naturalGasPrice,
        inputs.carbonPrice,
        inputs.electrolyzerEfficiency
      ),
    citation: 'IEA, BloombergNEF hydrogen cost models',
  },
  {
    id: 'storage_options',
    name: 'Storage Options Analysis',
    description: 'Compare hydrogen storage technologies for given requirements',
    inputs: [
      {
        id: 'storageCapacity',
        name: 'Storage Capacity',
        unit: 'kg H2',
        min: 1,
        max: 1000000,
        defaultValue: 1000,
      },
      {
        id: 'dischargeDuration',
        name: 'Discharge Duration',
        unit: 'hours',
        min: 1,
        max: 720,
        defaultValue: 24,
      },
      {
        id: 'application',
        name: 'Application',
        unit: 'category',
        options: ['vehicle', 'stationary', 'industrial'],
        defaultValue: 'stationary',
      },
    ],
    outputs: [
      { id: 'recommendedOption', name: 'Recommended Storage', unit: 'option' },
      { id: 'capitalCost', name: 'Capital Cost', unit: '$' },
      { id: 'energyLoss', name: 'Energy Loss', unit: 'kWh' },
    ],
    calculate: (inputs) =>
      analyzeStorageOptions(
        inputs.storageCapacity,
        inputs.dischargeDuration,
        inputs.application as 'vehicle' | 'stationary' | 'industrial'
      ),
    citation: 'DOE Hydrogen Storage Program, NREL',
  },
  {
    id: 'stack_degradation',
    name: 'Electrolyzer Stack Degradation',
    description:
      'Estimate electrolyzer degradation based on operating conditions',
    inputs: [
      {
        id: 'operatingHours',
        name: 'Operating Hours',
        unit: 'hours',
        min: 0,
        max: 100000,
        defaultValue: 20000,
      },
      {
        id: 'currentDensity',
        name: 'Current Density',
        unit: 'A/cm²',
        min: 0.1,
        max: 4.0,
        defaultValue: 1.5,
      },
      {
        id: 'temperature',
        name: 'Operating Temperature',
        unit: '°C',
        min: 20,
        max: 850,
        defaultValue: 60,
      },
      {
        id: 'cycleCount',
        name: 'Cycle Count',
        unit: 'cycles',
        min: 0,
        max: 50000,
        defaultValue: 1000,
      },
      {
        id: 'electrolyzerType',
        name: 'Electrolyzer Type',
        unit: 'category',
        options: ['PEM', 'Alkaline', 'SOEC'],
        defaultValue: 'PEM',
      },
    ],
    outputs: [
      { id: 'totalDegradation', name: 'Total Degradation', unit: '%' },
      { id: 'efficiencyLoss', name: 'Efficiency Loss', unit: '%' },
      { id: 'remainingLife', name: 'Remaining Life', unit: 'hours' },
    ],
    calculate: (inputs) =>
      calculateStackDegradation(
        inputs.operatingHours,
        inputs.currentDensity,
        inputs.temperature,
        inputs.cycleCount,
        inputs.electrolyzerType as 'PEM' | 'Alkaline' | 'SOEC'
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
    validate: (inputs) => {
      const voltage = inputs.voltage as number
      return voltage >= 1.48 && voltage <= 2.5
    },
    message:
      'Cell voltage should be between 1.48V (thermoneutral) and 2.5V for efficient operation',
  },
  {
    id: 'electrolysis_efficiency_bounds',
    name: 'Electrolysis Efficiency Bounds',
    description: 'System efficiency cannot exceed thermodynamic limits',
    severity: 'error',
    validate: (inputs) => {
      const energyConsumption = inputs.energyConsumption as number
      return energyConsumption >= 39.4 // Theoretical minimum
    },
    message: 'Energy consumption below theoretical minimum (39.4 kWh/kg H2) is physically impossible',
  },
  {
    id: 'soec_temperature_range',
    name: 'SOEC Temperature Range',
    description: 'Solid oxide electrolyzers require high operating temperatures',
    severity: 'warning',
    validate: (inputs) => {
      const type = inputs.electrolyzerType as string
      const temp = inputs.temperature as number
      if (type === 'SOEC') {
        return temp >= 600 && temp <= 900
      }
      return true
    },
    message: 'SOEC typically operates at 600-900°C for optimal performance',
  },
  {
    id: 'storage_capacity_feasibility',
    name: 'Storage Capacity Feasibility',
    description: 'Very large storage may require underground caverns',
    severity: 'info',
    validate: (inputs) => {
      const capacity = inputs.storageCapacity as number
      return capacity < 100000
    },
    message:
      'Storage capacities >100 tonnes typically require underground cavern storage',
  },
]

// ============================================================================
// Simulation Templates
// ============================================================================

export const HYDROGEN_SIMULATION_TEMPLATES: SimulationTemplate[] = [
  {
    id: 'pem_electrolyzer_optimization',
    name: 'PEM Electrolyzer Optimization',
    description:
      'Optimize PEM electrolyzer operating parameters for minimum LCOH',
    simulationType: 'parametric',
    defaultParameters: {
      currentDensityRange: [0.5, 3.0],
      temperatureRange: [50, 80],
      pressureRange: [1, 30],
      cellArea: 500,
      stackCells: 100,
    },
    outputs: [
      'optimalCurrentDensity',
      'optimalTemperature',
      'minimumLCOH',
      'efficiency',
    ],
    estimatedDuration: 'medium',
  },
  {
    id: 'green_hydrogen_project',
    name: 'Green Hydrogen Project Feasibility',
    description:
      'Full techno-economic assessment of green hydrogen production',
    simulationType: 'monte_carlo',
    defaultParameters: {
      productionCapacity: 10000, // tonnes/year
      electricityPriceRange: [0.02, 0.08],
      capacityFactorRange: [0.3, 0.6],
      electrolyzerCapexRange: [800, 1500],
      stackLifetimeRange: [60000, 100000],
    },
    outputs: [
      'lcohDistribution',
      'irr',
      'npv',
      'sensitivityFactors',
    ],
    estimatedDuration: 'long',
  },
  {
    id: 'storage_system_sizing',
    name: 'H2 Storage System Sizing',
    description:
      'Size hydrogen storage system for given demand profile',
    simulationType: 'parametric',
    defaultParameters: {
      demandProfile: 'industrial', // or 'vehicle', 'grid'
      peakDemand: 500, // kg/hour
      autonomyHours: 24,
      compressionStrategy: 'cascade',
    },
    outputs: [
      'storageCapacity',
      'compressorPower',
      'tankCount',
      'totalCost',
    ],
    estimatedDuration: 'short',
  },
]

// ============================================================================
// Module Export
// ============================================================================

export const HydrogenDomainModule: DomainModule = {
  id: 'hydrogen',
  name: 'Hydrogen Energy',
  physicalLimits: HYDROGEN_PHYSICAL_LIMITS,
  industryBenchmarks: HYDROGEN_BENCHMARKS,
  calculators: HYDROGEN_CALCULATORS,
  validationRules: HYDROGEN_VALIDATION_RULES,
  simulationTemplates: HYDROGEN_SIMULATION_TEMPLATES,
}

export default HydrogenDomainModule
