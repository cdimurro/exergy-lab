/**
 * Simulation Provider Types
 *
 * Types and interfaces for the tiered simulation architecture.
 */

// ============================================================================
// Simulation Tiers
// ============================================================================

export type SimulationTier = 'tier1' | 'tier2' | 'tier3'

export interface TierInfo {
  tier: SimulationTier
  name: string
  description: string
  capabilities: string[]
  costLevel: 'free' | 'low' | 'medium' | 'high'
  speedLevel: 'fast' | 'medium' | 'slow'
  accuracyLevel: 'approximate' | 'moderate' | 'high'
}

export const TIER_INFO: Record<SimulationTier, TierInfo> = {
  tier1: {
    tier: 'tier1',
    name: 'Analytical Models',
    description: 'Fast JavaScript-based analytical calculations',
    capabilities: [
      'Thermodynamic equilibrium',
      'Mass/energy balances',
      'First-order kinetics',
      'Efficiency calculations',
    ],
    costLevel: 'free',
    speedLevel: 'fast',
    accuracyLevel: 'approximate',
  },
  tier2: {
    tier: 'tier2',
    name: 'ML Surrogate Models',
    description: 'ONNX.js inference for trained surrogate models',
    capabilities: [
      'CFD surrogate inference',
      'Multi-physics prediction',
      'Optimization sweeps',
      'Uncertainty quantification',
    ],
    costLevel: 'low',
    speedLevel: 'medium',
    accuracyLevel: 'moderate',
  },
  tier3: {
    tier: 'tier3',
    name: 'Cloud HPC Simulation',
    description: 'Full-fidelity cloud GPU simulations via Modal Labs',
    capabilities: [
      'Full CFD simulation',
      'Molecular dynamics',
      'DFT calculations',
      'Multi-scale modeling',
    ],
    costLevel: 'high',
    speedLevel: 'slow',
    accuracyLevel: 'high',
  },
}

// ============================================================================
// Simulation Types
// ============================================================================

export type SimulationType =
  | 'thermodynamic'
  | 'electrochemical'
  | 'cfd'
  | 'kinetics'
  | 'heat-transfer'
  | 'mass-transfer'
  | 'materials'
  | 'optimization'

// ============================================================================
// Simulation Parameters
// ============================================================================

export interface BoundaryCondition {
  name: string
  type: 'dirichlet' | 'neumann' | 'robin' | 'periodic'
  value: number
  unit: string
  location?: string
}

export interface SimulationParams {
  experimentId: string
  type: SimulationType
  inputs: Record<string, number>
  boundaryConditions: BoundaryCondition[]
  convergenceTolerance?: number
  maxIterations?: number
  timeStep?: number
  duration?: number
  domain?: {
    geometry: string
    dimensions: number[]
    meshSize?: number
  }
}

// ============================================================================
// Simulation Results
// ============================================================================

export interface SimulationOutput {
  name: string
  value: number
  unit: string
  uncertainty?: number
}

export interface ExergyAnalysis {
  efficiency: number
  exergyDestruction: number
  majorLosses: string[]
  improvementPotential: number
}

export interface SimulationResult {
  experimentId: string
  converged: boolean
  iterations: number
  residual?: number
  outputs: SimulationOutput[]
  exergy?: ExergyAnalysis
  fields?: Record<string, number[]>
  metadata: {
    provider: string
    tier: SimulationTier
    duration: number
    cost?: number
    timestamp: string
  }
}

// ============================================================================
// Provider Interface
// ============================================================================

export interface SimulationProvider {
  name: string
  tier: SimulationTier
  supportedTypes: SimulationType[]

  /**
   * Execute a simulation with the given parameters
   */
  execute(params: SimulationParams): Promise<SimulationResult>

  /**
   * Check if the provider is available (e.g., API key configured)
   */
  isAvailable(): Promise<boolean>

  /**
   * Estimate cost for a simulation
   */
  estimateCost?(params: SimulationParams): Promise<number>

  /**
   * Estimate duration for a simulation
   */
  estimateDuration?(params: SimulationParams): Promise<number>
}

// ============================================================================
// Provider Configuration
// ============================================================================

export interface SimulationConfig {
  defaultTier: SimulationTier
  enableTierEscalation: boolean
  maxCostPerSimulation?: number
  apiKeys?: {
    modalLabs?: string
    deepmind?: string
  }
  fallbackToLowerTier: boolean
}

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  defaultTier: 'tier1',
  enableTierEscalation: true,
  fallbackToLowerTier: true,
}
