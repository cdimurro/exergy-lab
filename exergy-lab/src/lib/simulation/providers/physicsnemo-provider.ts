/**
 * PhysicsNeMo CFD Simulation Provider (v2.0)
 *
 * Provides GPU-accelerated CFD simulations using NVIDIA PhysicsNeMo 25.06
 * with Fourier Neural Operators (FNO) for physics-informed deep learning.
 *
 * v2.0 Updates:
 * - Real PhysicsNeMo container (not dev fallback)
 * - GPU time tracking for billing
 * - Actual FNO inference
 *
 * Capabilities:
 * - Full CFD simulation (Navier-Stokes) with FNO
 * - Heat transfer simulation
 * - Velocity, pressure, and temperature fields
 * - Reynolds number and flow statistics
 * - GPU billing information
 *
 * References:
 * - PhysicsNeMo GitHub: https://github.com/NVIDIA/physicsnemo
 * - FNO API: https://docs.nvidia.com/physicsnemo/
 *
 * @see modal-simulations/physicsnemo_cfd.py - Backend GPU functions
 */

import type {
  SimulationProvider,
  SimulationParams,
  SimulationResult,
  SimulationTier,
  SimulationType,
  SimulationOutput,
  ExergyAnalysis,
} from '../types'

// ============================================================================
// Types
// ============================================================================

export interface PhysicsNeMoConfig {
  endpoint?: string
  apiKey?: string
  timeout?: number
  maxRetries?: number
  defaultResolution?: [number, number]
}

export interface CFDConfig {
  geometry: 'rectangular' | 'cylindrical' | 'custom'
  dimensions: [number, number]
  resolution: [number, number]
  boundaryConditions: Record<string, BoundaryCondition>
  density?: number
  viscosity?: number
  thermalConductivity?: number
  specificHeat?: number
  timeSteps?: number
  dt?: number
  steadyState?: boolean
  includeHeatTransfer?: boolean
  includeTurbulence?: boolean
}

export interface BoundaryCondition {
  type: 'velocity' | 'pressure' | 'temperature' | 'insulated'
  value?: number
  direction?: 'x' | 'y'
}

export interface HeatTransferConfig {
  geometry: string
  dimensions: [number, number]
  resolution: [number, number]
  thermalConductivity: number
  density: number
  specificHeat: number
  boundaryTemperatures: {
    left?: number
    right?: number
    top?: number
    bottom?: number
  }
  heatSources?: Array<{
    x: number
    y: number
    radius: number
    power: number
  }>
  timeSteps?: number
  steadyState?: boolean
}

export interface CFDResult {
  converged: boolean
  method: string
  resolution: [number, number]
  iterations?: number
  fields: {
    velocity_x: number[][]
    velocity_y: number[][]
    velocity_magnitude: number[][]
    pressure: number[][]
    vorticity: number[][]
    temperature?: number[][]
  }
  statistics: {
    max_velocity: number
    avg_velocity: number
    max_pressure: number
    min_pressure: number
    reynolds_number: number
  }
  execution_time_ms: number
  billing?: GPUBillingInfo
}

export interface HeatTransferResult {
  converged: boolean
  method: string
  iterations: number
  resolution: [number, number]
  fields: {
    temperature: number[][]
    heat_flux_x: number[][]
    heat_flux_y: number[][]
    heat_flux_magnitude: number[][]
  }
  statistics: {
    max_temperature: number
    min_temperature: number
    avg_temperature: number
    max_heat_flux: number
    total_heat_transfer: number
  }
  execution_time_ms: number
  billing?: GPUBillingInfo
}

// ============================================================================
// GPU Billing Types (v2.0)
// ============================================================================

/**
 * GPU type identifiers for billing
 */
export type GPUType = 'T4' | 'A10G' | 'A100'

/**
 * GPU pricing rates per second (Modal Labs pricing Jan 2026)
 */
export const GPU_PRICING: Record<GPUType, number> = {
  T4: 0.26 / 3600,      // $0.26/hr = $0.0000722/sec
  A10G: 0.76 / 3600,    // $0.76/hr = $0.0002111/sec
  A100: 2.86 / 3600,    // $2.86/hr = $0.0007944/sec
}

/**
 * GPU billing information from Modal function execution
 */
export interface GPUBillingInfo {
  gpu_type: GPUType
  start_time: number
  end_time: number
  execution_time_ms: number
  cost_usd: number
}

/**
 * Estimate GPU cost based on execution time
 */
export function estimateGPUCost(gpuType: GPUType, durationMs: number): number {
  const ratePerSecond = GPU_PRICING[gpuType] || GPU_PRICING.A10G
  return (durationMs / 1000) * ratePerSecond
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: PhysicsNeMoConfig = {
  endpoint:
    process.env.MODAL_PHYSICSNEMO_ENDPOINT ||
    process.env.MODAL_ENDPOINT?.replace(
      'breakthrough-engine-gpu',
      'exergy-physicsnemo-cfd'
    ) ||
    'https://modal.run',
  apiKey: process.env.MODAL_API_KEY,
  timeout: 120000, // 2 minutes for CFD
  maxRetries: 2,
  defaultResolution: [64, 64],
}

export { DEFAULT_CONFIG as DEFAULT_PHYSICSNEMO_CONFIG }

// ============================================================================
// PhysicsNeMo Provider
// ============================================================================

export class PhysicsNeMoProvider implements SimulationProvider {
  name = 'PhysicsNeMo CFD'
  tier: SimulationTier = 'tier3'
  supportedTypes: SimulationType[] = ['cfd', 'heat-transfer', 'thermodynamic']

  private config: PhysicsNeMoConfig

  constructor(config: Partial<PhysicsNeMoConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Execute a simulation with the given parameters
   */
  async execute(params: SimulationParams): Promise<SimulationResult> {
    const startTime = Date.now()

    try {
      let result: SimulationResult

      switch (params.type) {
        case 'cfd':
          result = await this.runCFDSimulation(params)
          break
        case 'heat-transfer':
          result = await this.runHeatTransferSimulation(params)
          break
        case 'thermodynamic':
          // For thermodynamic, run heat transfer with convection
          result = await this.runHeatTransferSimulation(params)
          break
        default:
          throw new Error(`Unsupported simulation type: ${params.type}`)
      }

      return result
    } catch (error) {
      console.error('[PhysicsNeMo] Simulation failed:', error)
      throw error
    }
  }

  /**
   * Run CFD simulation
   */
  async runCFDSimulation(params: SimulationParams): Promise<SimulationResult> {
    const startTime = Date.now()

    // Build CFD config from simulation params
    const cfdConfig: CFDConfig = {
      geometry: 'rectangular',
      dimensions: params.domain?.dimensions as [number, number] || [1.0, 1.0],
      resolution: this.config.defaultResolution || [64, 64],
      boundaryConditions: this.convertBoundaryConditions(params.boundaryConditions),
      density: params.inputs.density || 1.225,
      viscosity: params.inputs.viscosity || 1.81e-5,
      thermalConductivity: params.inputs.thermalConductivity || 0.026,
      specificHeat: params.inputs.specificHeat || 1005,
      timeSteps: params.maxIterations || 100,
      steadyState: true,
      includeHeatTransfer: params.inputs.includeHeatTransfer !== 0 && params.inputs.includeHeatTransfer !== undefined,
    }

    // Call Modal endpoint
    const cfdResult = await this.callModalFunction<CFDResult>(
      'cfd-endpoint',
      { config: cfdConfig }
    )

    // Convert to SimulationResult
    const outputs: SimulationOutput[] = [
      {
        name: 'maxVelocity',
        value: cfdResult.statistics.max_velocity,
        unit: 'm/s',
      },
      {
        name: 'avgVelocity',
        value: cfdResult.statistics.avg_velocity,
        unit: 'm/s',
      },
      {
        name: 'maxPressure',
        value: cfdResult.statistics.max_pressure,
        unit: 'Pa',
      },
      {
        name: 'minPressure',
        value: cfdResult.statistics.min_pressure,
        unit: 'Pa',
      },
      {
        name: 'reynoldsNumber',
        value: cfdResult.statistics.reynolds_number,
        unit: '',
      },
    ]

    // Add temperature stats if heat transfer was included
    if (cfdResult.fields.temperature) {
      const temps = cfdResult.fields.temperature.flat()
      outputs.push({
        name: 'maxTemperature',
        value: Math.max(...temps),
        unit: 'K',
      })
      outputs.push({
        name: 'avgTemperature',
        value: temps.reduce((a, b) => a + b, 0) / temps.length,
        unit: 'K',
      })
    }

    // Build exergy analysis
    const exergy = this.computeExergyAnalysis(cfdResult, params)

    // Build fields object (temperature is optional)
    const fields: Record<string, number[]> = {
      velocityX: cfdResult.fields.velocity_x.flat(),
      velocityY: cfdResult.fields.velocity_y.flat(),
      velocityMagnitude: cfdResult.fields.velocity_magnitude.flat(),
      pressure: cfdResult.fields.pressure.flat(),
      vorticity: cfdResult.fields.vorticity.flat(),
    }

    if (cfdResult.fields.temperature) {
      fields.temperature = cfdResult.fields.temperature.flat()
    }

    // Use actual billing from Modal response, or estimate
    const actualCost = cfdResult.billing?.cost_usd ??
      estimateGPUCost('A10G', cfdResult.execution_time_ms)

    return {
      experimentId: params.experimentId,
      converged: cfdResult.converged,
      iterations: cfdResult.iterations ?? cfdConfig.timeSteps ?? 100,
      outputs,
      exergy,
      fields,
      metadata: {
        provider: `PhysicsNeMo CFD v2.0 (${cfdResult.method || 'FNO'})`,
        tier: 'tier3',
        duration: cfdResult.execution_time_ms,
        cost: actualCost,
        timestamp: new Date().toISOString(),
      },
    }
  }

  /**
   * Run heat transfer simulation
   */
  async runHeatTransferSimulation(
    params: SimulationParams
  ): Promise<SimulationResult> {
    const startTime = Date.now()

    // Extract boundary temperatures from params
    const tempBCs = params.boundaryConditions
      .filter(bc => bc.type === 'dirichlet' && bc.name.includes('temperature'))
      .reduce((acc, bc) => {
        acc[bc.location || bc.name] = bc.value
        return acc
      }, {} as Record<string, number>)

    // Build heat transfer config
    const heatConfig: HeatTransferConfig = {
      geometry: 'rectangular',
      dimensions: params.domain?.dimensions as [number, number] || [1.0, 1.0],
      resolution: this.config.defaultResolution || [64, 64],
      thermalConductivity: params.inputs.thermalConductivity || 50.0,
      density: params.inputs.density || 7800,
      specificHeat: params.inputs.specificHeat || 500,
      boundaryTemperatures: {
        left: tempBCs.left || params.inputs.temperatureLeft,
        right: tempBCs.right || params.inputs.temperatureRight,
        top: tempBCs.top || params.inputs.temperatureTop,
        bottom: tempBCs.bottom || params.inputs.temperatureBottom,
      },
      heatSources: params.inputs.heatSources as any,
      timeSteps: params.maxIterations || 100,
      steadyState: true,
    }

    // Call Modal endpoint
    const heatResult = await this.callModalFunction<HeatTransferResult>(
      'heat-transfer-endpoint',
      { config: heatConfig }
    )

    // Convert to SimulationResult
    const outputs: SimulationOutput[] = [
      {
        name: 'maxTemperature',
        value: heatResult.statistics.max_temperature,
        unit: 'K',
      },
      {
        name: 'minTemperature',
        value: heatResult.statistics.min_temperature,
        unit: 'K',
      },
      {
        name: 'avgTemperature',
        value: heatResult.statistics.avg_temperature,
        unit: 'K',
      },
      {
        name: 'maxHeatFlux',
        value: heatResult.statistics.max_heat_flux,
        unit: 'W/m^2',
      },
      {
        name: 'totalHeatTransfer',
        value: heatResult.statistics.total_heat_transfer,
        unit: 'W',
      },
    ]

    // Compute exergy for heat transfer
    const exergy = this.computeHeatTransferExergy(heatResult, params)

    // Use actual billing from Modal response, or estimate
    const actualCost = heatResult.billing?.cost_usd ??
      estimateGPUCost('A10G', heatResult.execution_time_ms)

    return {
      experimentId: params.experimentId,
      converged: heatResult.converged,
      iterations: heatResult.iterations,
      outputs,
      exergy,
      fields: {
        temperature: heatResult.fields.temperature.flat(),
        heatFluxX: heatResult.fields.heat_flux_x.flat(),
        heatFluxY: heatResult.fields.heat_flux_y.flat(),
        heatFluxMagnitude: heatResult.fields.heat_flux_magnitude.flat(),
      },
      metadata: {
        provider: `PhysicsNeMo Heat Transfer v2.0 (${heatResult.method || 'FNO'})`,
        tier: 'tier3',
        duration: heatResult.execution_time_ms,
        cost: actualCost,
        timestamp: new Date().toISOString(),
      },
    }
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
   * Estimate cost for simulation based on GPU time
   */
  async estimateCost(params: SimulationParams): Promise<number> {
    // Estimate duration first
    const estimatedDuration = await this.estimateDuration(params)

    // Calculate cost based on A10G pricing
    return estimateGPUCost('A10G', estimatedDuration)
  }

  /**
   * Estimate duration for simulation
   */
  async estimateDuration(params: SimulationParams): Promise<number> {
    // Base duration in ms
    const baseDuration = 30000

    // Adjust for resolution
    const resolution = this.config.defaultResolution || [64, 64]
    const cells = resolution[0] * resolution[1]

    if (cells > 10000) {
      return baseDuration * 2
    } else if (cells > 50000) {
      return baseDuration * 5
    }

    return baseDuration
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Convert boundary conditions to CFD format
   */
  private convertBoundaryConditions(
    bcs: SimulationParams['boundaryConditions']
  ): Record<string, BoundaryCondition> {
    const result: Record<string, BoundaryCondition> = {}

    for (const bc of bcs) {
      const location = bc.location || bc.name

      if (bc.type === 'dirichlet') {
        if (bc.name.includes('velocity')) {
          result[location] = { type: 'velocity', value: bc.value }
        } else if (bc.name.includes('pressure')) {
          result[location] = { type: 'pressure', value: bc.value }
        } else if (bc.name.includes('temperature')) {
          result[location] = { type: 'temperature', value: bc.value }
        }
      } else if (bc.type === 'neumann') {
        result[location] = { type: 'insulated' }
      }
    }

    return result
  }

  /**
   * Compute exergy analysis for CFD results
   */
  private computeExergyAnalysis(
    result: CFDResult,
    params: SimulationParams
  ): ExergyAnalysis {
    // Flow exergy is based on kinetic energy and pressure work
    const avgVelocity = result.statistics.avg_velocity
    const maxVelocity = result.statistics.max_velocity
    const density = params.inputs.density || 1.225

    // Kinetic energy per unit mass
    const kineticEnergy = 0.5 * avgVelocity ** 2

    // Estimate exergy destruction from velocity gradients (turbulence dissipation)
    const velocityVariation = maxVelocity - avgVelocity
    const exergyDestruction = density * velocityVariation ** 2 / 2

    // Efficiency based on useful kinetic energy vs total
    const efficiency = avgVelocity ** 2 / (maxVelocity ** 2 || 1)

    // Major losses
    const majorLosses: string[] = []

    if (result.statistics.reynolds_number > 4000) {
      majorLosses.push('Turbulent dissipation in high Reynolds number flow')
    }

    if (velocityVariation / avgVelocity > 0.5) {
      majorLosses.push('Non-uniform flow distribution causes mixing losses')
    }

    const pressureDrop = result.statistics.max_pressure - result.statistics.min_pressure
    if (pressureDrop > 100) {
      majorLosses.push('Significant pressure drop across domain')
    }

    if (majorLosses.length === 0) {
      majorLosses.push('Primary losses from viscous dissipation')
    }

    return {
      efficiency,
      exergyDestruction,
      majorLosses,
      improvementPotential: 1 - efficiency,
    }
  }

  /**
   * Compute exergy analysis for heat transfer results
   */
  private computeHeatTransferExergy(
    result: HeatTransferResult,
    params: SimulationParams
  ): ExergyAnalysis {
    const Tmax = result.statistics.max_temperature
    const Tmin = result.statistics.min_temperature
    const Tavg = result.statistics.avg_temperature
    const T0 = 298.15 // Reference temperature (25C)

    // Carnot efficiency for heat transfer
    const carnotEfficiency = 1 - T0 / Tmax

    // Actual exergy efficiency (accounts for irreversibilities)
    const exergyEfficiency = (Tmax - Tavg) / (Tmax - T0) * carnotEfficiency

    // Exergy destruction from temperature gradients
    const totalHeat = result.statistics.total_heat_transfer
    const exergyDestruction = totalHeat * (1 - T0 / Tavg) - totalHeat * (1 - T0 / Tmax)

    // Major losses
    const majorLosses: string[] = []

    const tempDiff = Tmax - Tmin
    if (tempDiff > 50) {
      majorLosses.push('Large temperature gradient causes entropy generation')
    }

    if (result.statistics.max_heat_flux > 10000) {
      majorLosses.push('High heat flux indicates potential thermal stress')
    }

    if (majorLosses.length === 0) {
      majorLosses.push('Primary losses from heat conduction irreversibilities')
    }

    return {
      efficiency: exergyEfficiency,
      exergyDestruction: Math.abs(exergyDestruction),
      majorLosses,
      improvementPotential: carnotEfficiency - exergyEfficiency,
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
          this.config.timeout || 120000
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

        const data = (await response.json()) as T
        return data
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
 * Create a PhysicsNeMo provider with optional configuration
 */
export function createPhysicsNeMoProvider(
  config?: Partial<PhysicsNeMoConfig>
): PhysicsNeMoProvider {
  return new PhysicsNeMoProvider(config)
}

export default PhysicsNeMoProvider
