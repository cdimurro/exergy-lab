/**
 * Polymer Properties Calculator
 *
 * Physics-based polymer calculations for materials science simulations.
 * Includes glass transition, viscosity, and molecular weight predictions.
 *
 * @module simulation/calculators/polymer-properties
 * @version 0.7.0
 */

import type { SimulationOutput } from '../types'

/**
 * Physical constants
 */
const CONSTANTS = {
  R: 8.314, // Universal gas constant J/(mol*K)
  kB: 1.380649e-23, // Boltzmann constant J/K
}

/**
 * Polymer configuration data
 * Source: Polymer Handbook, Mark-Houwink parameters
 */
interface PolymerConfig {
  name: string
  tg: number // Glass transition temperature (K)
  tm?: number // Melting temperature (K) - for semi-crystalline
  density: number // g/cm3
  markHouwink: {
    K: number // Mark-Houwink K value
    a: number // Mark-Houwink exponent
    solvent: string
    temperature: number // K
  }
  thermalExpansion: number // 1/K
  specificHeatCapacity: number // J/(g*K)
}

const POLYMER_CONFIGS: Record<string, PolymerConfig> = {
  'PE': {
    name: 'Polyethylene',
    tg: 148, // Very low for HDPE
    tm: 408,
    density: 0.95,
    markHouwink: { K: 6.2e-4, a: 0.70, solvent: 'trichlorobenzene', temperature: 408 },
    thermalExpansion: 2.0e-4,
    specificHeatCapacity: 2.3,
  },
  'PP': {
    name: 'Polypropylene',
    tg: 253,
    tm: 438,
    density: 0.90,
    markHouwink: { K: 1.1e-4, a: 0.80, solvent: 'decalin', temperature: 408 },
    thermalExpansion: 1.5e-4,
    specificHeatCapacity: 1.9,
  },
  'PS': {
    name: 'Polystyrene',
    tg: 373,
    density: 1.05,
    markHouwink: { K: 1.2e-4, a: 0.71, solvent: 'toluene', temperature: 298 },
    thermalExpansion: 7.0e-5,
    specificHeatCapacity: 1.3,
  },
  'PMMA': {
    name: 'Poly(methyl methacrylate)',
    tg: 378,
    density: 1.19,
    markHouwink: { K: 7.5e-5, a: 0.72, solvent: 'acetone', temperature: 298 },
    thermalExpansion: 7.0e-5,
    specificHeatCapacity: 1.5,
  },
  'PVC': {
    name: 'Poly(vinyl chloride)',
    tg: 354,
    density: 1.40,
    markHouwink: { K: 1.5e-4, a: 0.77, solvent: 'THF', temperature: 298 },
    thermalExpansion: 8.0e-5,
    specificHeatCapacity: 0.9,
  },
  'PET': {
    name: 'Poly(ethylene terephthalate)',
    tg: 342,
    tm: 533,
    density: 1.38,
    markHouwink: { K: 4.7e-4, a: 0.68, solvent: 'phenol-TCE', temperature: 298 },
    thermalExpansion: 6.5e-5,
    specificHeatCapacity: 1.0,
  },
  'PA6': {
    name: 'Nylon 6',
    tg: 323,
    tm: 493,
    density: 1.14,
    markHouwink: { K: 2.3e-4, a: 0.82, solvent: 'm-cresol', temperature: 298 },
    thermalExpansion: 8.5e-5,
    specificHeatCapacity: 1.7,
  },
  'PTFE': {
    name: 'Polytetrafluoroethylene',
    tg: 160,
    tm: 600,
    density: 2.20,
    markHouwink: { K: 2.0e-4, a: 0.65, solvent: 'perfluoronaphthalene', temperature: 573 },
    thermalExpansion: 1.0e-4,
    specificHeatCapacity: 1.0,
  },
  'PC': {
    name: 'Polycarbonate',
    tg: 423,
    density: 1.20,
    markHouwink: { K: 4.0e-5, a: 0.78, solvent: 'chloroform', temperature: 298 },
    thermalExpansion: 6.5e-5,
    specificHeatCapacity: 1.2,
  },
  'PLA': {
    name: 'Polylactic acid',
    tg: 328,
    tm: 443,
    density: 1.25,
    markHouwink: { K: 5.5e-4, a: 0.73, solvent: 'chloroform', temperature: 298 },
    thermalExpansion: 7.4e-5,
    specificHeatCapacity: 1.8,
  },
}

/**
 * Polymer calculation inputs
 */
export interface PolymerInputs {
  polymerType?: string
  molecularWeight?: number // g/mol (Mn or Mw)
  temperature?: number // K
  plasticizer?: number // wt% plasticizer
  crosslinkDensity?: number // mol/cm3
  shearRate?: number // 1/s
  monomerMW?: number // g/mol - for degree of polymerization
}

/**
 * Calculate glass transition temperature using Fox-Flory equation
 * Accounts for molecular weight, plasticizer, and crosslinking effects
 */
export function calculateGlassTransition(inputs: PolymerInputs): {
  tg: number
  tgInfinite: number
  depressionFromMW: number
  plasticizationEffect: number
  crosslinkingEffect: number
} {
  const polymerType = inputs.polymerType?.toUpperCase() || 'PS'
  const config = POLYMER_CONFIGS[polymerType] || POLYMER_CONFIGS['PS']

  // Infinite molecular weight Tg
  const tgInfinite = config.tg

  // Fox-Flory equation: Tg = Tg_inf - K/Mn
  // K typically 10^5 - 10^6 for most polymers
  const foxFloryK = 1e5 // K constant
  const Mn = inputs.molecularWeight || 100000
  const depressionFromMW = foxFloryK / Mn

  // Plasticizer effect - typical plasticizer depression
  // Using Gordon-Taylor-like simplification
  const plasticizer = inputs.plasticizer || 0
  const plasticizationEffect = plasticizer * 2.5 // ~2.5 K per wt% plasticizer

  // Crosslinking elevation
  // Tg increases with crosslink density
  const crosslinkDensity = inputs.crosslinkDensity || 0
  const crosslinkingEffect = crosslinkDensity * 1e6 * 10 // Empirical factor

  const tg = tgInfinite - depressionFromMW - plasticizationEffect + crosslinkingEffect

  return {
    tg: Math.max(100, tg), // Floor at 100K
    tgInfinite,
    depressionFromMW,
    plasticizationEffect,
    crosslinkingEffect,
  }
}

/**
 * Calculate intrinsic viscosity using Mark-Houwink equation
 * [eta] = K * M^a
 */
export function calculateIntrinsicViscosity(inputs: PolymerInputs): {
  intrinsicViscosity: number // dL/g
  mwType: string
  K: number
  a: number
  solvent: string
} {
  const polymerType = inputs.polymerType?.toUpperCase() || 'PS'
  const config = POLYMER_CONFIGS[polymerType] || POLYMER_CONFIGS['PS']

  const Mw = inputs.molecularWeight || 100000
  const { K, a, solvent } = config.markHouwink

  // Mark-Houwink equation
  const intrinsicViscosity = K * Math.pow(Mw, a)

  return {
    intrinsicViscosity,
    mwType: 'weight-average',
    K,
    a,
    solvent,
  }
}

/**
 * Calculate melt viscosity using Cross-WLF model
 */
export function calculateMeltViscosity(inputs: PolymerInputs): {
  zeroShearViscosity: number // Pa*s
  viscosityAtShearRate: number // Pa*s
  shearThinningIndex: number
  temperature: number
  criticalShearRate: number
} {
  const polymerType = inputs.polymerType?.toUpperCase() || 'PS'
  const config = POLYMER_CONFIGS[polymerType] || POLYMER_CONFIGS['PS']

  const T = inputs.temperature || 473 // Default processing temp
  const tg = config.tg
  const shearRate = inputs.shearRate || 100 // Default shear rate

  // WLF equation parameters (universal constants)
  const C1 = 17.44
  const C2 = 51.6

  // Reference viscosity at Tg
  const etaRef = 1e12 // Pa*s at Tg

  // WLF shift factor
  const aT = Math.exp(-C1 * (T - tg) / (C2 + T - tg))

  // Zero-shear viscosity
  const eta0 = etaRef * aT

  // Cross model for shear thinning
  const n = 0.35 // Typical power law index for polymers
  const tauStar = 1e4 // Critical shear stress (Pa)
  const criticalShearRate = tauStar / eta0

  // Viscosity at specified shear rate
  const viscosityAtShearRate = eta0 / (1 + Math.pow(eta0 * shearRate / tauStar, 1 - n))

  return {
    zeroShearViscosity: eta0,
    viscosityAtShearRate,
    shearThinningIndex: n,
    temperature: T,
    criticalShearRate,
  }
}

/**
 * Calculate degree of polymerization and related properties
 */
export function calculateDegreeOfPolymerization(inputs: PolymerInputs): {
  Xn: number // Number-average degree of polymerization
  Xw: number // Weight-average degree of polymerization
  PDI: number // Polydispersity index
  contourLength: number // nm
  radiusOfGyration: number // nm
} {
  const polymerType = inputs.polymerType?.toUpperCase() || 'PS'
  const config = POLYMER_CONFIGS[polymerType] || POLYMER_CONFIGS['PS']

  // Default monomer molecular weights
  const defaultMonomerMW: Record<string, number> = {
    'PE': 28, // ethylene
    'PP': 42, // propylene
    'PS': 104, // styrene
    'PMMA': 100, // MMA
    'PVC': 62.5, // vinyl chloride
    'PET': 192, // repeat unit
    'PA6': 113, // repeat unit
    'PTFE': 100, // TFE
    'PC': 254, // repeat unit
    'PLA': 72, // lactide
  }

  const monomerMW = inputs.monomerMW || defaultMonomerMW[polymerType] || 100
  const Mn = inputs.molecularWeight || 100000

  // Degree of polymerization
  const Xn = Mn / monomerMW

  // Assume typical PDI for free radical polymerization
  const PDI = 2.0
  const Xw = Xn * PDI

  // Contour length (assuming ~0.25 nm per monomer backbone)
  const contourLength = Xn * 0.25 // nm

  // Radius of gyration using Flory-Stockmayer
  // Rg ~ b * sqrt(N/6) for ideal chain
  const bondLength = 0.154 // nm (C-C bond)
  const kuhnLength = bondLength * 2 // Approximate Kuhn length
  const radiusOfGyration = kuhnLength * Math.sqrt(Xn / 6)

  return {
    Xn,
    Xw,
    PDI,
    contourLength,
    radiusOfGyration,
  }
}

/**
 * Calculate thermal properties
 */
export function calculateThermalProperties(inputs: PolymerInputs): {
  tg: number
  tm?: number
  heatCapacity: number
  thermalConductivity: number
  thermalDiffusivity: number
  coefficientOfExpansion: number
} {
  const polymerType = inputs.polymerType?.toUpperCase() || 'PS'
  const config = POLYMER_CONFIGS[polymerType] || POLYMER_CONFIGS['PS']

  const tgResult = calculateGlassTransition(inputs)

  // Thermal conductivity (typical for amorphous polymers: 0.15-0.25 W/m*K)
  const thermalConductivity = 0.20

  // Thermal diffusivity = k / (rho * Cp)
  const thermalDiffusivity = thermalConductivity / (config.density * 1000 * config.specificHeatCapacity)

  return {
    tg: tgResult.tg,
    tm: config.tm,
    heatCapacity: config.specificHeatCapacity,
    thermalConductivity,
    thermalDiffusivity,
    coefficientOfExpansion: config.thermalExpansion,
  }
}

/**
 * Main polymer properties calculation function
 */
export async function calculatePolymerProperties(
  inputs: PolymerInputs
): Promise<{
  outputs: SimulationOutput[]
  dataSourceInfo: {
    source: string
    isFallback: boolean
  }
}> {
  const tgResult = calculateGlassTransition(inputs)
  const viscosityResult = calculateIntrinsicViscosity(inputs)
  const meltResult = calculateMeltViscosity(inputs)
  const dpResult = calculateDegreeOfPolymerization(inputs)
  const thermalResult = calculateThermalProperties(inputs)

  const polymerType = inputs.polymerType?.toUpperCase() || 'PS'
  const config = POLYMER_CONFIGS[polymerType] || POLYMER_CONFIGS['PS']

  const outputs: SimulationOutput[] = [
    { name: 'glassTransitionTemp', value: tgResult.tg, unit: 'K', uncertainty: tgResult.tg * 0.02 },
    { name: 'glassTransitionTempCelsius', value: tgResult.tg - 273.15, unit: 'C' },
    { name: 'intrinsicViscosity', value: viscosityResult.intrinsicViscosity, unit: 'dL/g', uncertainty: viscosityResult.intrinsicViscosity * 0.1 },
    { name: 'zeroShearViscosity', value: meltResult.zeroShearViscosity, unit: 'Pa*s' },
    { name: 'viscosityAtShearRate', value: meltResult.viscosityAtShearRate, unit: 'Pa*s' },
    { name: 'degreeOfPolymerization', value: dpResult.Xn, unit: '' },
    { name: 'polydispersityIndex', value: dpResult.PDI, unit: '' },
    { name: 'radiusOfGyration', value: dpResult.radiusOfGyration, unit: 'nm', uncertainty: dpResult.radiusOfGyration * 0.15 },
    { name: 'contourLength', value: dpResult.contourLength, unit: 'nm' },
    { name: 'density', value: config.density, unit: 'g/cm3' },
    { name: 'specificHeatCapacity', value: thermalResult.heatCapacity, unit: 'J/(g*K)' },
    { name: 'thermalExpansionCoeff', value: thermalResult.coefficientOfExpansion, unit: '1/K' },
  ]

  // Add melting point if semi-crystalline
  if (thermalResult.tm) {
    outputs.push(
      { name: 'meltingTemp', value: thermalResult.tm, unit: 'K' },
      { name: 'meltingTempCelsius', value: thermalResult.tm - 273.15, unit: 'C' }
    )
  }

  return {
    outputs,
    dataSourceInfo: {
      source: 'embedded-polymer-data',
      isFallback: true,
    },
  }
}

/**
 * Get available polymer types
 */
export function getAvailablePolymers(): Array<{
  id: string
  name: string
  tg: string
  category: string
}> {
  return Object.entries(POLYMER_CONFIGS).map(([id, config]) => ({
    id,
    name: config.name,
    tg: `${(config.tg - 273.15).toFixed(0)}C`,
    category: config.tm ? 'semi-crystalline' : 'amorphous',
  }))
}
