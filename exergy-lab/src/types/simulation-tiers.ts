/**
 * Enhanced 3-Tier Simulation Types
 *
 * Tier 1: Rapid Estimation (<30s) - ML surrogates, local JS, ±20%
 * Tier 2: Classical Simulation (1-30 min) - GCMC/MD, ±10%
 * Tier 3: Advanced/Quantum (30+ min) - DFT/ML potentials, ±2%
 */

import type {
  SimulationTier as BaseTier,
  SimulationConfig,
  SimulationResult,
  SimulationMetric,
  SimulationVisualization,
} from './simulation'

// ============================================================================
// Enhanced Tier Types
// ============================================================================

export type SimulationTierNumber = 1 | 2 | 3

export type SimulationTierName = 'rapid-estimation' | 'classical-simulation' | 'quantum-advanced'

// Map between number and string tier types
export const TIER_NUMBER_TO_NAME: Record<SimulationTierNumber, SimulationTierName> = {
  1: 'rapid-estimation',
  2: 'classical-simulation',
  3: 'quantum-advanced',
}

export const TIER_NAME_TO_NUMBER: Record<SimulationTierName, SimulationTierNumber> = {
  'rapid-estimation': 1,
  'classical-simulation': 2,
  'quantum-advanced': 3,
}

export interface SimulationTierCapabilities {
  tier: SimulationTierNumber
  name: SimulationTierName
  displayName: string
  description: string
  timeEstimate: string
  costEstimate: string
  accuracy: string
  capabilities: string[]
  limitations: string[]
  outputTypes: string[]
  computeLocation: 'browser' | 'server' | 'cloud-gpu'
  recommended: {
    materialNovelty: ('standard' | 'moderate' | 'novel')[]
    precisionRequired: ('screening' | 'validation' | 'publication')[]
    maxBudget?: number
  }
}

// ============================================================================
// Tier 1: Rapid Estimation (ML Surrogates)
// ============================================================================

export interface MLSurrogateModel {
  id: string
  name: string
  targetProperty: string         // e.g., 'CO2_uptake', 'selectivity', 'bandgap'
  modelType: 'gcnn' | 'random-forest' | 'xgboost' | 'neural-network' | 'gpr'
  trainingDataSource: string     // e.g., 'Materials Project', 'CoRE-MOF'
  trainingDataSize: number
  validationMAE: number
  validationR2: number
  applicabilityDomain: string[]  // Material classes this model works for
  inputFeatures: string[]
  onnxPath?: string              // Path to ONNX model for browser inference
}

export interface SurrogatePrediction {
  property: string
  value: number
  unit: string
  uncertainty: number            // ± value
  confidence: number             // 0-1, based on applicability domain
  modelUsed: string
  trainingDataSource: string
  isExtrapolation: boolean       // True if outside training domain
}

export interface AnalyticalModel {
  name: string
  formula: string                // LaTeX or text representation
  parameters: Record<string, { value: number; unit: string }>
  assumptions: string[]
  validRange: Record<string, { min: number; max: number; unit: string }>
}

export interface Tier1RapidResult {
  tier: 1
  predictions: SurrogatePrediction[]
  analyticalResults?: {
    model: AnalyticalModel
    result: number
    unit: string
  }[]
  confidence: number             // Overall confidence 0-100
  trainingDataCoverage: number   // How well training data covers this material
  escalationRecommended: boolean
  escalationReason?: string
  executionTime: number          // milliseconds
  visualizations?: SimulationVisualization[]
}

// ============================================================================
// Tier 2: Classical Simulation (GCMC/MD)
// ============================================================================

export type ForceField = 'UFF' | 'Dreiding' | 'TraPPE' | 'OPLS-AA' | 'AMBER' | 'CHARMM' | 'custom'

export interface GCMCConfig {
  method: 'GCMC'
  forceField: ForceField
  temperature: number            // K
  pressurePoints: number[]       // bar (for isotherm)
  guestMolecules: string[]       // e.g., ['CO2', 'N2', 'H2O']
  equilibrationCycles: number
  productionCycles: number
  framework: {
    source: 'cif' | 'materials-project' | 'cod' | 'custom'
    id?: string
    cifContent?: string
  }
  cutoffRadius: number           // Angstroms
  chargeMethod: 'qeq' | 'eqeq' | 'none' | 'from-file'
}

export interface MDConfig {
  method: 'MD'
  forceField: ForceField
  temperature: number            // K
  pressure?: number              // bar
  ensemble: 'NVT' | 'NPT' | 'NVE'
  timestep: number               // fs
  equilibrationSteps: number
  productionSteps: number
  thermostat: 'nose-hoover' | 'berendsen' | 'velocity-rescaling'
  barostat?: 'berendsen' | 'parrinello-rahman'
}

export interface Isotherm {
  guestMolecule: string
  temperature: number
  pressureUnit: 'bar' | 'Pa' | 'atm'
  uptakeUnit: 'mol/kg' | 'mmol/g' | 'cm3/g' | 'wt%'
  dataPoints: {
    pressure: number
    uptake: number
    uncertainty?: number
  }[]
  modelFit?: {
    model: 'langmuir' | 'freundlich' | 'dsl' | 'bet'
    parameters: Record<string, number>
    r2: number
  }
}

export interface DiffusionResult {
  species: string
  diffusionCoefficient: number
  unit: 'm2/s'
  temperature: number
  method: 'msd' | 'einstein' | 'green-kubo'
  uncertainty?: number
}

export interface RDFResult {
  pair: [string, string]         // e.g., ['C_CO2', 'O_framework']
  data: {
    r: number                    // Distance in Angstroms
    g: number                    // g(r) value
  }[]
}

export interface ConvergenceMetrics {
  energyFluctuation: number
  pressureFluctuation?: number
  uptakeStdDev: number
  blockAnalysisVariance?: number
  autocorrelationTime?: number
  isConverged: boolean
  recommendations?: string[]
}

export interface Tier2ClassicalResult {
  tier: 2
  config: GCMCConfig | MDConfig
  isotherms?: Isotherm[]
  isostericHeat?: {
    value: number
    unit: 'kJ/mol'
    method: 'clausius-clapeyron' | 'fluctuation'
    uncertainty?: number
  }
  selectivity?: Record<string, number>  // e.g., { 'CO2/N2': 42.5 }
  diffusionResults?: DiffusionResult[]
  rdfs?: RDFResult[]
  convergenceMetrics: ConvergenceMetrics
  uncertaintyAnalysis: {
    method: 'block-averaging' | 'bootstrap' | 'replica'
    confidenceLevel: number      // e.g., 0.95
    samples: number
  }
  trajectoryFile?: string        // URL to trajectory for visualization
  executionTime: number          // seconds
  computeCreditsUsed?: number
  visualizations?: SimulationVisualization[]
}

// ============================================================================
// Tier 3: Advanced/Quantum (DFT, ML Potentials)
// ============================================================================

export type DFTFunctional =
  | 'PBE'
  | 'PBE-D3'
  | 'PBE-D3BJ'
  | 'HSE06'
  | 'B3LYP'
  | 'SCAN'
  | 'r2SCAN'
  | 'M06-2X'

export interface DFTConfig {
  method: 'DFT'
  functional: DFTFunctional
  basisSet: string               // e.g., 'def2-TZVP', 'cc-pVTZ'
  software: 'vasp' | 'quantum-espresso' | 'gaussian' | 'orca' | 'cp2k'
  kPoints: [number, number, number]
  cutoffEnergy: number           // eV
  spinPolarized: boolean
  dispersionCorrection: boolean
  convergenceCriteria: {
    energy: number               // eV
    force: number                // eV/Angstrom
    stress?: number              // GPa
  }
}

export type MLPotentialType = 'NequIP' | 'MACE' | 'ANI' | 'M3GNet' | 'CHGNet' | 'GNoME' | 'custom'

export interface MLPotentialConfig {
  method: 'ML-MD'
  potential: MLPotentialType
  modelPath?: string             // Path to custom model
  temperature: number
  timestep: number               // fs
  steps: number
  ensemble: 'NVT' | 'NPT'
}

export interface HybridConfig {
  method: 'HYBRID'
  mlPotential: MLPotentialType
  dftRefinement: {
    frequency: number            // Every N steps
    functional: DFTFunctional
    selectedAtoms: 'all' | 'active-site' | 'adsorbate'
  }
}

export interface BindingEnergyResult {
  adsorbate: string
  bindingSite: string
  bindingEnergy: number
  unit: 'eV' | 'kJ/mol'
  method: 'DFT' | 'ML'
  functional?: DFTFunctional
  zeroPointCorrection?: number
  thermalCorrection?: number
  uncertainty?: number
}

export interface ElectronicStructure {
  bandGap?: {
    value: number
    unit: 'eV'
    type: 'direct' | 'indirect'
  }
  dos?: {
    energies: number[]
    totalDos: number[]
    projectedDos?: Record<string, number[]>
  }
  chargeAnalysis?: {
    method: 'bader' | 'mulliken' | 'lowdin' | 'hirshfeld'
    charges: Record<string, number>
  }
  workFunction?: number
  fermiLevel?: number
}

export interface MLMDResult {
  potential: MLPotentialType
  trajectory: {
    frames: number
    timeSpan: number             // ps
    savedEvery: number           // steps
  }
  thermodynamics: {
    averageTemperature: number
    temperatureStdDev: number
    averagePressure?: number
    averageEnergy: number
    energyStdDev: number
  }
  dynamicProperties?: {
    diffusionCoefficients: DiffusionResult[]
    activationEnergies?: Record<string, number>
  }
}

export interface Tier3QuantumResult {
  tier: 3
  config: DFTConfig | MLPotentialConfig | HybridConfig
  bindingEnergies?: BindingEnergyResult[]
  electronicStructure?: ElectronicStructure
  mlMDResult?: MLMDResult
  optimizedGeometry?: {
    format: 'xyz' | 'cif' | 'poscar'
    content: string
  }
  vibrations?: {
    frequencies: number[]        // cm^-1
    irIntensities?: number[]
    imaginaryModes: number       // Should be 0 for minima
  }
  publicationDataPackage: {
    rawDataUrl?: string
    inputFiles: Record<string, string>
    outputSummary: string
    citationSuggestion: string
  }
  computeCost: number            // USD
  computeTime: number            // seconds
  gpuType?: string
  visualizations?: SimulationVisualization[]
}

// ============================================================================
// Unified Simulation Result Type
// ============================================================================

export type SimulationTierResult =
  | Tier1RapidResult
  | Tier2ClassicalResult
  | Tier3QuantumResult

// ============================================================================
// Tier Selection Types
// ============================================================================

export interface TierSelectionFactors {
  materialNovelty: 'standard' | 'moderate' | 'novel'
  precisionRequired: 'screening' | 'validation' | 'publication'
  budgetRemaining: number        // USD
  timeRemaining: number          // minutes
  tier1Confidence?: number       // If Tier 1 was already run
  previousTierResult?: SimulationTierResult
}

export interface TierEscalation {
  fromTier: SimulationTierNumber
  toTier: SimulationTierNumber
  reason: string
  automaticEscalation: boolean
  userApprovalRequired: boolean
  estimatedAdditionalCost: number
  estimatedAdditionalTime: number
}

export interface SimulationTierRecommendation {
  recommendedTier: SimulationTierNumber
  reasoning: string[]
  alternativeTiers: {
    tier: SimulationTierNumber
    tradeoffs: string
  }[]
  escalationPath?: TierEscalation
}

// ============================================================================
// Tier Capabilities Configuration
// ============================================================================

export const SIMULATION_TIER_CONFIG: SimulationTierCapabilities[] = [
  {
    tier: 1,
    name: 'rapid-estimation',
    displayName: 'Rapid Estimation',
    description: 'Browser-based analytical models and ML surrogates',
    timeEstimate: '<30 seconds',
    costEstimate: 'Free',
    accuracy: '±20%',
    capabilities: [
      'Analytical models (Dubinin-Radushkevich, Langmuir)',
      'Geometric screening (pore size, surface area)',
      'ML surrogates (pre-trained on Materials Project)',
      'Quick isotherm prediction',
      'Basic selectivity estimates',
      'Property predictions (bandgap, stability)',
    ],
    limitations: [
      'Low precision for novel materials',
      'No dynamics or kinetics',
      'Limited to trained material classes',
      'May miss subtle structural effects',
    ],
    outputTypes: ['approximate_isotherms', 'selectivity_estimates', 'screening_scores', 'property_predictions'],
    computeLocation: 'browser',
    recommended: {
      materialNovelty: ['standard', 'moderate'],
      precisionRequired: ['screening'],
      maxBudget: 0,
    },
  },
  {
    tier: 2,
    name: 'classical-simulation',
    displayName: 'Classical Simulation',
    description: 'GCMC and MD simulations with standard force fields',
    timeEstimate: '1-30 minutes',
    costEstimate: 'Free (CPU-bound)',
    accuracy: '±10%',
    capabilities: [
      'GCMC for adsorption isotherms',
      'MD for diffusion and dynamics',
      'UFF/Dreiding/TraPPE force fields',
      'Full isotherms with error bars',
      'Isosteric heat of adsorption',
      'Radial distribution functions',
      'Auto-parameterization from structure',
      'Convergence analysis',
    ],
    limitations: [
      'Rigid framework assumption (for most)',
      'Force field accuracy limitations',
      'No quantum effects',
      'May not capture framework flexibility',
    ],
    outputTypes: ['full_isotherms', 'isosteric_heat', 'rdfs', 'diffusion_coefficients', 'trajectories'],
    computeLocation: 'server',
    recommended: {
      materialNovelty: ['standard', 'moderate'],
      precisionRequired: ['screening', 'validation'],
      maxBudget: 1,
    },
  },
  {
    tier: 3,
    name: 'quantum-advanced',
    displayName: 'Advanced/Quantum',
    description: 'DFT and ML-accelerated high-fidelity simulations',
    timeEstimate: '30+ minutes',
    costEstimate: '$0.50-$5.00',
    accuracy: '±2%',
    capabilities: [
      'DFT single-points (binding energies)',
      'Flexible GCMC/MD with ML potentials (NequIP, MACE)',
      'Hybrid ML-accelerated DFT',
      'Competitive adsorption',
      'Framework flexibility effects',
      'Electronic structure analysis',
      'High-precision energies and forces',
      'Publication-quality results',
    ],
    limitations: [
      'Requires GPU compute credits',
      'Longer turnaround time',
      'May need expert interpretation',
      'Higher computational cost',
    ],
    outputTypes: ['dft_energies', 'ml_md_trajectories', 'electronic_structure', 'binding_energies', 'publication_data'],
    computeLocation: 'cloud-gpu',
    recommended: {
      materialNovelty: ['moderate', 'novel'],
      precisionRequired: ['validation', 'publication'],
    },
  },
]

// ============================================================================
// Available ML Surrogate Models
// ============================================================================

export const AVAILABLE_SURROGATE_MODELS: MLSurrogateModel[] = [
  {
    id: 'mof-co2-uptake',
    name: 'MOF CO2 Uptake Predictor',
    targetProperty: 'CO2 uptake at 1 bar',
    modelType: 'gcnn',
    trainingDataSource: 'CoRE-MOF 2019',
    trainingDataSize: 12000,
    validationMAE: 0.8,
    validationR2: 0.92,
    applicabilityDomain: ['MOF', 'COF', 'porous-carbon'],
    inputFeatures: ['topology', 'pore-size', 'surface-area', 'metal-nodes'],
    onnxPath: 'models/mof-co2-uptake-gcnn.onnx',
  },
  {
    id: 'zeolite-selectivity',
    name: 'Zeolite CO2/N2 Selectivity',
    targetProperty: 'CO2/N2 selectivity',
    modelType: 'random-forest',
    trainingDataSource: 'IZA Database + GCMC',
    trainingDataSize: 3500,
    validationMAE: 12.5,
    validationR2: 0.85,
    applicabilityDomain: ['zeolite', 'aluminosilicate'],
    inputFeatures: ['framework-type', 'Si/Al-ratio', 'pore-diameter', 'cation'],
    onnxPath: 'models/zeolite-selectivity-rf.onnx',
  },
  {
    id: 'perovskite-bandgap',
    name: 'Perovskite Bandgap Predictor',
    targetProperty: 'Electronic bandgap',
    modelType: 'neural-network',
    trainingDataSource: 'Materials Project',
    trainingDataSize: 8500,
    validationMAE: 0.15,
    validationR2: 0.94,
    applicabilityDomain: ['perovskite', 'halide-perovskite', 'oxide-perovskite'],
    inputFeatures: ['composition', 'structure', 'tolerance-factor'],
    onnxPath: 'models/perovskite-bandgap-nn.onnx',
  },
  {
    id: 'battery-voltage',
    name: 'Battery Voltage Predictor',
    targetProperty: 'Average voltage',
    modelType: 'xgboost',
    trainingDataSource: 'Materials Project Battery Explorer',
    trainingDataSize: 4200,
    validationMAE: 0.12,
    validationR2: 0.89,
    applicabilityDomain: ['battery-cathode', 'intercalation'],
    inputFeatures: ['composition', 'working-ion', 'crystal-system'],
  },
]

// ============================================================================
// Helper Functions
// ============================================================================

export function getSimulationTierConfig(tier: SimulationTierNumber): SimulationTierCapabilities {
  return SIMULATION_TIER_CONFIG.find(t => t.tier === tier) || SIMULATION_TIER_CONFIG[0]
}

export function getSimulationTierByName(name: SimulationTierName): SimulationTierCapabilities {
  return SIMULATION_TIER_CONFIG.find(t => t.name === name) || SIMULATION_TIER_CONFIG[0]
}

export function isSimulationTierResult(result: unknown): result is SimulationTierResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    'tier' in result &&
    typeof (result as { tier: unknown }).tier === 'number' &&
    [1, 2, 3].includes((result as { tier: number }).tier)
  )
}

export function getTierColor(tier: SimulationTierNumber): string {
  const colors: Record<SimulationTierNumber, string> = {
    1: 'text-blue-500',
    2: 'text-amber-500',
    3: 'text-purple-500',
  }
  return colors[tier]
}

export function getTierBgColor(tier: SimulationTierNumber): string {
  const colors: Record<SimulationTierNumber, string> = {
    1: 'bg-blue-500/10',
    2: 'bg-amber-500/10',
    3: 'bg-purple-500/10',
  }
  return colors[tier]
}
