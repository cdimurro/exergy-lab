/**
 * NVIDIA ALCHEMI Materials Discovery Provider (v2.0)
 *
 * Provides GPU-accelerated materials science simulations using NVIDIA ALCHEMI toolkit
 * with AIMNet2 and MACE-MP-0 for molecular property prediction.
 *
 * ALCHEMI (AI for Large-scale Chemical Exploration and Materials Insight)
 * provides 25x-800x speedup over traditional DFT for materials screening.
 *
 * Capabilities:
 * - Geometry relaxation (structure optimization)
 * - Battery materials screening (cathode, anode, electrolyte)
 * - Catalyst performance prediction
 * - Molecular property prediction
 * - GPU billing information
 *
 * References:
 * - NVIDIA ALCHEMI: https://developer.nvidia.com/blog/revolutionizing-ai-driven-material-discovery-using-nvidia-alchemi/
 * - AIMNet2: https://github.com/aiqm/aimnet2
 * - MACE: https://github.com/ACEsuit/mace
 *
 * @see modal-simulations/alchemi_materials.py - Backend GPU functions
 */

import type {
  SimulationProvider,
  SimulationParams,
  SimulationResult,
  SimulationTier,
  SimulationType,
  SimulationOutput,
} from '../types'
import { GPU_PRICING, type GPUType, type GPUBillingInfo, estimateGPUCost } from './physicsnemo-provider'

// ============================================================================
// Types
// ============================================================================

export interface ALCHEMIConfig {
  endpoint?: string
  apiKey?: string
  timeout?: number
  maxRetries?: number
  defaultModel?: ALCHEMIModel
}

export type ALCHEMIModel = 'AIMNet2' | 'MACE-MP-0' | 'analytical'

export interface AtomicStructure {
  symbols: string[]
  positions: number[][]
  cell?: number[][]
  pbc?: boolean[]
}

export interface RelaxationRequest {
  structure: AtomicStructure
  model?: ALCHEMIModel
  fmax?: number
  maxSteps?: number
}

export interface RelaxationResult {
  converged: boolean
  iterations: number
  energy_eV: number
  max_force_eV_A: number
  optimized_positions: number[][]
  optimized_symbols: string[]
  method: string
  execution_time_ms: number
  billing?: GPUBillingInfo
}

export interface BatteryScreeningRequest {
  candidates: AtomicStructure[]
  targetProperties?: {
    voltageRange?: [number, number]
    capacityMin?: number
    stabilityThreshold?: number
  }
  materialType?: 'cathode' | 'anode' | 'electrolyte'
  model?: ALCHEMIModel
}

export interface BatteryCandidate {
  index: number
  formula: string
  properties: {
    voltage_V: number
    theoretical_capacity_mAh_g: number
    formation_energy_eV_atom: number
    n_atoms: number
    composition: string
  }
  score: number
  passes: boolean
}

export interface BatteryScreeningResult {
  candidates_screened: number
  passing_candidates: number
  top_candidates: BatteryCandidate[]
  material_type: string
  method: string
  execution_time_ms: number
  billing?: GPUBillingInfo
}

export interface PropertyPredictionRequest {
  structures: AtomicStructure[]
  properties?: string[]
  model?: ALCHEMIModel
}

export interface PropertyResult {
  formula: string
  index: number
  energy_eV?: number
  forces_eV_A?: number[][]
  max_force_eV_A?: number
  stress_GPa?: number[]
  homo_lumo_gap_eV?: number
  formation_energy_eV_atom?: number
}

export interface PropertyPredictionResult {
  structures_processed: number
  results: PropertyResult[]
  method: string
  execution_time_ms: number
  billing?: GPUBillingInfo
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: ALCHEMIConfig = {
  endpoint:
    process.env.MODAL_ALCHEMI_ENDPOINT ||
    process.env.MODAL_ENDPOINT?.replace(
      'breakthrough-engine-gpu',
      'exergy-alchemi-materials'
    ) ||
    'https://modal.run',
  apiKey: process.env.MODAL_API_KEY,
  timeout: 300000, // 5 minutes for large batches
  maxRetries: 2,
  defaultModel: 'analytical',
}

export { DEFAULT_CONFIG as DEFAULT_ALCHEMI_CONFIG }

// ============================================================================
// ALCHEMI Provider
// ============================================================================

export class ALCHEMIProvider implements SimulationProvider {
  name = 'ALCHEMI Materials Discovery'
  tier: SimulationTier = 'tier3'
  supportedTypes: SimulationType[] = ['thermodynamic', 'electrochemical']

  private config: ALCHEMIConfig

  constructor(config: Partial<ALCHEMIConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Execute a simulation with the given parameters
   */
  async execute(params: SimulationParams): Promise<SimulationResult> {
    try {
      // For generic simulation params, default to property prediction
      const structures = this.paramsToStructures(params)
      const result = await this.predictProperties({
        structures,
        properties: ['energy', 'forces', 'formation_energy'],
        model: this.config.defaultModel,
      })

      return this.toSimulationResult(params, result)
    } catch (error) {
      console.error('[ALCHEMI] Simulation failed:', error)
      throw error
    }
  }

  /**
   * Relax geometry using ML potentials
   */
  async relaxGeometry(request: RelaxationRequest): Promise<RelaxationResult> {
    const apiRequest = {
      structure: request.structure,
      model: request.model || this.config.defaultModel,
      fmax: request.fmax || 0.05,
      max_steps: request.maxSteps || 100,
    }

    return this.callModalFunction<RelaxationResult>(
      'relax-geometry-endpoint',
      apiRequest
    )
  }

  /**
   * Screen materials for battery applications
   */
  async screenBatteryMaterials(
    request: BatteryScreeningRequest
  ): Promise<BatteryScreeningResult> {
    const apiRequest = {
      candidates: request.candidates,
      target_properties: {
        voltage_range: request.targetProperties?.voltageRange || [3.0, 4.5],
        capacity_min: request.targetProperties?.capacityMin || 150,
        stability_threshold: request.targetProperties?.stabilityThreshold || 0.05,
      },
      material_type: request.materialType || 'cathode',
      model: request.model || this.config.defaultModel,
    }

    return this.callModalFunction<BatteryScreeningResult>(
      'screen-battery-endpoint',
      apiRequest
    )
  }

  /**
   * Predict molecular properties
   */
  async predictProperties(
    request: PropertyPredictionRequest
  ): Promise<PropertyPredictionResult> {
    const apiRequest = {
      structures: request.structures,
      properties: request.properties || ['energy', 'forces'],
      model: request.model || this.config.defaultModel,
    }

    return this.callModalFunction<PropertyPredictionResult>(
      'predict-properties-endpoint',
      apiRequest
    )
  }

  /**
   * Check if provider is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.config.apiKey) {
      return false
    }

    try {
      const endpoint = this.config.endpoint?.replace('.modal.run', '-health.modal.run')
      if (!endpoint) return false

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Estimate cost for simulation
   */
  async estimateCost(params: SimulationParams): Promise<number> {
    const estimatedDuration = await this.estimateDuration(params)
    return estimateGPUCost('A100', estimatedDuration)
  }

  /**
   * Estimate duration for simulation
   */
  async estimateDuration(params: SimulationParams): Promise<number> {
    // Base duration in ms
    const baseDuration = 60000 // 1 minute

    // Adjust for number of atoms/structures
    const nAtoms = params.inputs.nAtoms || 10
    if (nAtoms > 100) {
      return baseDuration * 2
    } else if (nAtoms > 500) {
      return baseDuration * 5
    }

    return baseDuration
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Convert simulation params to atomic structures
   */
  private paramsToStructures(params: SimulationParams): AtomicStructure[] {
    // Cast inputs to allow complex types (structures, symbols, positions are arrays)
    const inputs = params.inputs as unknown as Record<string, unknown>

    // If params contains structure data, use it
    const structures = inputs.structures
    if (Array.isArray(structures) && structures.length > 0) {
      return structures as AtomicStructure[]
    }

    // Otherwise create a default structure from inputs
    const symbols = (Array.isArray(inputs.symbols) ? inputs.symbols : ['C', 'H', 'H', 'H', 'H']) as string[]
    const positions = (Array.isArray(inputs.positions) ? inputs.positions : [
      [0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]
    ]) as number[][]

    return [{
      symbols,
      positions,
    }]
  }

  /**
   * Convert property prediction result to SimulationResult
   */
  private toSimulationResult(
    params: SimulationParams,
    result: PropertyPredictionResult
  ): SimulationResult {
    const outputs: SimulationOutput[] = []

    // Aggregate results
    if (result.results.length > 0) {
      const firstResult = result.results[0]

      if (firstResult.energy_eV !== undefined) {
        outputs.push({
          name: 'energy',
          value: firstResult.energy_eV,
          unit: 'eV',
        })
      }

      if (firstResult.max_force_eV_A !== undefined) {
        outputs.push({
          name: 'maxForce',
          value: firstResult.max_force_eV_A,
          unit: 'eV/A',
        })
      }

      if (firstResult.formation_energy_eV_atom !== undefined) {
        outputs.push({
          name: 'formationEnergy',
          value: firstResult.formation_energy_eV_atom,
          unit: 'eV/atom',
        })
      }

      if (firstResult.homo_lumo_gap_eV !== undefined) {
        outputs.push({
          name: 'homoLumoGap',
          value: firstResult.homo_lumo_gap_eV,
          unit: 'eV',
        })
      }
    }

    // Use actual billing or estimate
    const actualCost = result.billing?.cost_usd ??
      estimateGPUCost('A100', result.execution_time_ms)

    return {
      experimentId: params.experimentId,
      converged: true,
      iterations: 1,
      outputs,
      exergy: {
        efficiency: 0.95,
        exergyDestruction: 0,
        majorLosses: ['Minimal losses in ML inference'],
        improvementPotential: 0.05,
      },
      fields: {},
      metadata: {
        provider: `ALCHEMI Materials Discovery v2.0 (${result.method})`,
        tier: 'tier3',
        duration: result.execution_time_ms,
        cost: actualCost,
        timestamp: new Date().toISOString(),
      },
    }
  }

  /**
   * Call a Modal function via HTTP API
   */
  private async callModalFunction<T>(
    functionName: string,
    args: Record<string, unknown>
  ): Promise<T> {
    const apiKey = this.config.apiKey

    if (!apiKey) {
      throw new Error(
        'Modal API key not configured. Set MODAL_API_KEY environment variable.'
      )
    }

    // Format URL for Modal web endpoint
    const baseEndpoint = this.config.endpoint || ''
    const url = baseEndpoint.replace('.modal.run', `-${functionName}.modal.run`)

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= (this.config.maxRetries || 2); attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.timeout || 300000
        )

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(args),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Modal API error: ${response.status} - ${errorText}`)
        }

        return (await response.json()) as T
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt < (this.config.maxRetries || 2)) {
          // Exponential backoff
          await new Promise(resolve =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          )
          continue
        }
      }
    }

    throw lastError || new Error('Modal API call failed after retries')
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an ALCHEMI provider with optional configuration
 */
export function createALCHEMIProvider(
  config?: Partial<ALCHEMIConfig>
): ALCHEMIProvider {
  return new ALCHEMIProvider(config)
}

export default ALCHEMIProvider
