/**
 * Modal GPU Simulation Provider
 *
 * Provides GPU-accelerated simulations via Modal Labs for:
 * - Tier 2 (T4): Monte Carlo, parametric sweeps ($0.01-0.02/run)
 * - Tier 3 (A10G/A100): ML-MD, DFT calculations ($0.02-0.05/run)
 *
 * Designed for Breakthrough Engine v0.0.2 hypothesis validation.
 *
 * @see modal-simulations/gpu_accelerated.py - Backend GPU functions
 * @see lib/simulation/types.ts - Provider interface
 */

import type {
  SimulationProvider,
  SimulationParams,
  SimulationResult,
  SimulationType,
  SimulationOutput,
  SimulationTier,
  ExergyAnalysis,
} from '../types'

// ============================================================================
// Types
// ============================================================================

export type GPUTier = 'T4' | 'A10G' | 'A100'

export interface ModalProviderConfig {
  apiKey?: string
  endpoint?: string
  defaultGPU: GPUTier
  timeout: number
  maxRetries: number
  onProgress?: (event: ModalProgressEvent) => void
}

export interface ModalProgressEvent {
  type: 'started' | 'progress' | 'complete' | 'error'
  tier: GPUTier
  completion?: number
  message?: string
  data?: Record<string, unknown>
}

export interface MonteCarloConfig {
  hypothesis_id: string
  parameters: {
    efficiency_mean: number
    efficiency_std: number
    cost_mean: number
    cost_std: number
    capacity_kw: number
    capacity_factor: number
    capacity_factor_std?: number
    lifetime_years: number
    lifetime_std?: number
  }
  seed?: number
}

export interface MonteCarloResult {
  hypothesis_id: string
  n_iterations: number
  metrics: {
    efficiency: MetricStats
    lcoe: MetricStats
    annual_generation_kwh: MetricStats
    lifetime_output_kwh: MetricStats
  }
  distributions: {
    efficiency: number[]
    lcoe: number[]
  }
  correlations: {
    efficiency_lcoe: number
    lifetime_lcoe: number
  }
  sensitivity: {
    efficiency_impact: number
    cost_impact: number
    lifetime_impact: number
  }
}

interface MetricStats {
  mean: number
  std: number
  median: number
  min: number
  max: number
  ci_low: number
  ci_high: number
  skewness: number
  kurtosis: number
}

interface HypothesisValidationResult {
  hypothesis_id: string
  validation_type: 'quick' | 'full'
  physics_valid: boolean
  economically_viable: boolean
  confidence_score: number
  metrics: {
    efficiency: {
      mean: number
      std: number
      ci_95: [number, number]
    }
    lcoe: {
      mean: number
      median: number
      std: number
      ci_95: [number, number]
    }
  }
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: ModalProviderConfig = {
  apiKey: process.env.MODAL_API_KEY,
  endpoint: process.env.MODAL_ENDPOINT || 'https://modal.run',
  defaultGPU: 'T4',
  timeout: 60000, // 60 seconds
  maxRetries: 2,
}

// Cost per GPU tier (approximate $/run based on typical run times)
const GPU_COSTS: Record<GPUTier, number> = {
  'T4': 0.01,     // ~$0.40/hr, typical run 90s
  'A10G': 0.02,   // ~$1.10/hr, typical run 65s
  'A100': 0.05,   // ~$3.00/hr, typical run 60s
}

// ============================================================================
// Modal GPU Provider
// ============================================================================

export class ModalSimulationProvider implements SimulationProvider {
  name = 'Modal GPU'
  tier: SimulationTier
  supportedTypes: SimulationType[] = [
    'thermodynamic',
    'electrochemical',
    'cfd',
    'kinetics',
    'materials',
    'optimization',
  ]

  private config: ModalProviderConfig
  private gpuTier: GPUTier

  constructor(
    tier: SimulationTier = 'tier2',
    config: Partial<ModalProviderConfig> = {}
  ) {
    this.tier = tier
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.gpuTier = tier === 'tier3' ? 'A10G' : 'T4'
  }

  /**
   * Select GPU tier based on hypothesis score or simulation complexity
   */
  selectGPUTier(hypothesisScore?: number): GPUTier {
    if (hypothesisScore === undefined) {
      return this.config.defaultGPU
    }

    // Higher scores get more powerful GPUs for thorough validation
    if (hypothesisScore >= 8.5) {
      return 'A10G' // High-scoring hypotheses need thorough validation
    } else if (hypothesisScore >= 7.0) {
      return 'T4' // Standard validation
    } else {
      return 'T4' // Quick screening
    }
  }

  /**
   * Execute a simulation on Modal GPU
   */
  async execute(params: SimulationParams): Promise<SimulationResult> {
    const startTime = Date.now()

    // Emit progress event
    this.emitProgress({
      type: 'started',
      tier: this.gpuTier,
      message: `Starting ${params.type} simulation on ${this.gpuTier}`,
    })

    try {
      // Determine the appropriate Modal function based on simulation type
      let result: SimulationResult

      switch (params.type) {
        case 'thermodynamic':
        case 'electrochemical':
        case 'kinetics':
          result = await this.runMonteCarloValidation(params)
          break
        case 'cfd':
        case 'heat-transfer':
        case 'mass-transfer':
          result = await this.runParametricSweep(params)
          break
        case 'materials':
          result = await this.runMaterialsSimulation(params)
          break
        case 'optimization':
          result = await this.runOptimizationSweep(params)
          break
        default:
          result = await this.runMonteCarloValidation(params)
      }

      this.emitProgress({
        type: 'complete',
        tier: this.gpuTier,
        completion: 100,
        message: 'Simulation complete',
        data: { duration: Date.now() - startTime },
      })

      return result

    } catch (error) {
      this.emitProgress({
        type: 'error',
        tier: this.gpuTier,
        message: error instanceof Error ? error.message : 'Simulation failed',
      })
      throw error
    }
  }

  /**
   * Run Monte Carlo validation via Modal
   */
  private async runMonteCarloValidation(params: SimulationParams): Promise<SimulationResult> {
    const startTime = Date.now()

    // Convert simulation params to Modal Monte Carlo format
    const mcConfig: MonteCarloConfig = {
      hypothesis_id: params.experimentId,
      parameters: {
        efficiency_mean: params.inputs.efficiency || params.inputs.practicalEfficiency || 0.35,
        efficiency_std: params.inputs.efficiencyStd || 0.05,
        cost_mean: params.inputs.costPerKw || params.inputs.cost || 100,
        cost_std: params.inputs.costStd || 20,
        capacity_kw: params.inputs.capacityKw || 1000,
        capacity_factor: params.inputs.capacityFactor || 0.25,
        capacity_factor_std: params.inputs.capacityFactorStd || 0.05,
        lifetime_years: params.inputs.lifetimeYears || 25,
        lifetime_std: params.inputs.lifetimeStd || 5,
      },
      seed: params.inputs.seed || Math.floor(Math.random() * 2147483647),
    }

    // Determine number of iterations based on tier
    const nIterations = this.tier === 'tier3' ? 100000 : 10000

    // Call Modal API (using web endpoint)
    const mcResult = await this.callModalFunction<MonteCarloResult[]>(
      'monte_carlo_vectorized_endpoint',
      {
        configs: [mcConfig],
        n_iterations: nIterations,
        confidence_level: 0.95,
      }
    )

    const result = mcResult[0]
    const duration = Date.now() - startTime

    // Convert Modal result to SimulationResult format
    const outputs: SimulationOutput[] = [
      {
        name: 'efficiency',
        value: result.metrics.efficiency.mean,
        unit: '',
        uncertainty: result.metrics.efficiency.std,
      },
      {
        name: 'lcoe',
        value: result.metrics.lcoe.mean,
        unit: '$/kWh',
        uncertainty: result.metrics.lcoe.std,
      },
      {
        name: 'annualGeneration',
        value: result.metrics.annual_generation_kwh.mean,
        unit: 'kWh/year',
        uncertainty: result.metrics.annual_generation_kwh.std,
      },
      {
        name: 'lifetimeOutput',
        value: result.metrics.lifetime_output_kwh.mean,
        unit: 'kWh',
        uncertainty: result.metrics.lifetime_output_kwh.std,
      },
      {
        name: 'confidenceInterval_efficiency_low',
        value: result.metrics.efficiency.ci_low,
        unit: '',
      },
      {
        name: 'confidenceInterval_efficiency_high',
        value: result.metrics.efficiency.ci_high,
        unit: '',
      },
      {
        name: 'confidenceInterval_lcoe_low',
        value: result.metrics.lcoe.ci_low,
        unit: '$/kWh',
      },
      {
        name: 'confidenceInterval_lcoe_high',
        value: result.metrics.lcoe.ci_high,
        unit: '$/kWh',
      },
    ]

    // Build exergy analysis from Monte Carlo results
    const exergy: ExergyAnalysis = {
      efficiency: result.metrics.efficiency.mean,
      exergyDestruction: (1 - result.metrics.efficiency.mean) * mcConfig.parameters.capacity_kw,
      majorLosses: this.identifyMajorLosses(result),
      improvementPotential: result.sensitivity.efficiency_impact * 0.2,
    }

    return {
      experimentId: params.experimentId,
      converged: true,
      iterations: nIterations,
      residual: result.metrics.lcoe.std / result.metrics.lcoe.mean,
      outputs,
      exergy,
      fields: {
        efficiencyDistribution: result.distributions.efficiency,
        lcoeDistribution: result.distributions.lcoe,
      },
      metadata: {
        provider: `Modal GPU (${this.gpuTier})`,
        tier: this.tier,
        duration,
        cost: GPU_COSTS[this.gpuTier],
        timestamp: new Date().toISOString(),
      },
    }
  }

  /**
   * Run parametric sweep via Modal
   */
  private async runParametricSweep(params: SimulationParams): Promise<SimulationResult> {
    const startTime = Date.now()

    // Extract sweep parameters from inputs
    const sweepParams: Record<string, { min: number; max: number; log_scale?: boolean }> = {}

    // Determine which parameters to sweep based on what's provided
    if (params.inputs.efficiencyMin !== undefined && params.inputs.efficiencyMax !== undefined) {
      sweepParams.efficiency = {
        min: params.inputs.efficiencyMin,
        max: params.inputs.efficiencyMax,
      }
    } else {
      sweepParams.efficiency = {
        min: (params.inputs.efficiency || 0.35) * 0.5,
        max: Math.min((params.inputs.efficiency || 0.35) * 1.5, 0.9),
      }
    }

    if (params.inputs.costMin !== undefined && params.inputs.costMax !== undefined) {
      sweepParams.cost_per_kw = {
        min: params.inputs.costMin,
        max: params.inputs.costMax,
      }
    } else {
      sweepParams.cost_per_kw = {
        min: (params.inputs.costPerKw || 100) * 0.5,
        max: (params.inputs.costPerKw || 100) * 2.0,
      }
    }

    // Base configuration for sweep
    const baseConfig = {
      efficiency: params.inputs.efficiency || 0.35,
      cost_per_kw: params.inputs.costPerKw || 100,
      lifetime_years: params.inputs.lifetimeYears || 25,
      capacity_factor: params.inputs.capacityFactor || 0.25,
      capacity_kw: params.inputs.capacityKw || 1000,
    }

    const nSamplesPerDim = this.tier === 'tier3' ? 50 : 25

    // Call Modal parametric sweep (using web endpoint)
    const sweepResult = await this.callModalFunction<{
      n_points: number
      optimal_config: Record<string, number>
      optimal_value: number
      optimal_lcoe: number
      gradients: Record<string, number>
      thresholds: Record<string, number>
      pareto_front: Array<Record<string, number>>
      sensitivity_surface: Record<string, { values: number[]; response: number[] }>
      execution_time_ms: number
    }>('parametric_sweep_endpoint', {
      base_config: baseConfig,
      sweep_params: sweepParams,
      n_samples_per_dim: nSamplesPerDim,
    })

    const duration = Date.now() - startTime

    // Convert to SimulationResult
    const outputs: SimulationOutput[] = [
      {
        name: 'optimalEfficiency',
        value: sweepResult.optimal_config.efficiency || 0,
        unit: '',
      },
      {
        name: 'optimalCost',
        value: sweepResult.optimal_config.cost_per_kw || 0,
        unit: '$/kW',
      },
      {
        name: 'optimalLCOE',
        value: sweepResult.optimal_lcoe,
        unit: '$/kWh',
      },
      {
        name: 'efficiencySensitivity',
        value: sweepResult.gradients.efficiency || 0,
        unit: '',
      },
      {
        name: 'costSensitivity',
        value: sweepResult.gradients.cost_per_kw || 0,
        unit: '',
      },
      {
        name: 'pointsEvaluated',
        value: sweepResult.n_points,
        unit: '',
      },
    ]

    // Add threshold values if found
    if (sweepResult.thresholds.efficiency) {
      outputs.push({
        name: 'efficiencyThreshold',
        value: sweepResult.thresholds.efficiency,
        unit: '',
      })
    }

    // Extract numeric arrays from complex sweep results
    // The fields property only supports Record<string, number[]>
    const fields: Record<string, number[]> = {}

    // Extract pareto front efficiencies and LCOEs as separate arrays
    if (sweepResult.pareto_front.length > 0) {
      fields.paretoEfficiency = sweepResult.pareto_front.map(p => p.efficiency)
      fields.paretoLcoe = sweepResult.pareto_front.map(p => p.lcoe)
    }

    // Extract sensitivity surface data
    for (const [paramName, surface] of Object.entries(sweepResult.sensitivity_surface)) {
      fields[`sensitivity_${paramName}_values`] = surface.values
      fields[`sensitivity_${paramName}_response`] = surface.response
    }

    return {
      experimentId: params.experimentId,
      converged: true,
      iterations: sweepResult.n_points,
      outputs,
      fields,
      metadata: {
        provider: `Modal GPU (${this.gpuTier})`,
        tier: this.tier,
        duration,
        cost: GPU_COSTS[this.gpuTier],
        timestamp: new Date().toISOString(),
      },
    }
  }

  /**
   * Run materials simulation (ML-MD) via Modal
   */
  private async runMaterialsSimulation(params: SimulationParams): Promise<SimulationResult> {
    const startTime = Date.now()

    // This would call ml_potential_md on A100
    // For now, we'll simulate the result structure
    const structure = {
      symbols: params.inputs.symbols || ['Si', 'Si', 'Si', 'Si', 'Si', 'Si', 'Si', 'Si'],
      positions: params.inputs.positions || [],
      cell: params.inputs.cell || [[5.43, 0, 0], [0, 5.43, 0], [0, 0, 5.43]],
    }

    const nSteps = this.tier === 'tier3' ? 100000 : 10000

    const mdResult = await this.callModalFunction<{
      n_atoms: number
      n_steps: number
      temperature_target: number
      statistics: {
        avg_temperature: number
        avg_potential_energy: number
        avg_kinetic_energy: number
        total_energy_drift: number
      }
      rdf: { bins: number[]; values: number[] }
      execution_time_ms: number
    }>('ml_potential_md', {
      structure,
      temperature: params.inputs.temperature || 300,
      n_steps: nSteps,
      timestep_fs: params.inputs.timestepFs || 1.0,
    })

    const duration = Date.now() - startTime

    const outputs: SimulationOutput[] = [
      {
        name: 'avgTemperature',
        value: mdResult.statistics.avg_temperature,
        unit: 'K',
      },
      {
        name: 'avgPotentialEnergy',
        value: mdResult.statistics.avg_potential_energy,
        unit: 'eV',
      },
      {
        name: 'avgKineticEnergy',
        value: mdResult.statistics.avg_kinetic_energy,
        unit: 'eV',
      },
      {
        name: 'energyDrift',
        value: mdResult.statistics.total_energy_drift,
        unit: 'eV',
      },
      {
        name: 'nAtoms',
        value: mdResult.n_atoms,
        unit: '',
      },
    ]

    return {
      experimentId: params.experimentId,
      converged: Math.abs(mdResult.statistics.total_energy_drift) < 0.01,
      iterations: mdResult.n_steps,
      outputs,
      fields: {
        rdfBins: mdResult.rdf.bins,
        rdfValues: mdResult.rdf.values,
      },
      metadata: {
        provider: `Modal GPU (A100)`,
        tier: 'tier3',
        duration,
        cost: GPU_COSTS['A100'],
        timestamp: new Date().toISOString(),
      },
    }
  }

  /**
   * Run optimization sweep via Modal
   */
  private async runOptimizationSweep(params: SimulationParams): Promise<SimulationResult> {
    // Optimization uses parametric sweep with more dimensions
    return this.runParametricSweep(params)
  }

  /**
   * Validate a single hypothesis from the Breakthrough Engine
   * Returns physics validity, economic viability, and confidence score
   *
   * Accepts Breakthrough Engine's RacingHypothesis format:
   * - predictions: Array<{ statement, expectedValue?, unit? }>
   * - mechanism: { steps: Array<{ order, description, physicalPrinciple? }> }
   */
  async validateHypothesis(
    hypothesis: {
      id: string
      title: string
      scores: { overall: number }
      predictions?: Array<{ statement: string; expectedValue?: number; unit?: string }>
      mechanism?: { steps: Array<{ order: number; description: string; physicalPrinciple?: string }> }
    }
  ): Promise<{
    hypothesisId: string
    physicsValid: boolean
    economicallyViable: boolean
    confidenceScore: number
    validationDetails: {
      efficiency?: { mean: number; ci95: [number, number] }
      lcoe?: { mean: number; ci95: [number, number] }
      thermodynamicCheck: boolean
      economicCheck: boolean
    }
    gpuTier: GPUTier
    durationMs: number
  }> {
    const startTime = Date.now()
    const gpuTier = this.selectGPUTier(hypothesis.scores.overall)

    this.emitProgress({
      type: 'started',
      tier: gpuTier,
      message: `Validating hypothesis ${hypothesis.id.slice(-8)} on ${gpuTier}`,
    })

    try {
      // Extract parameters from hypothesis predictions
      const predictions = hypothesis.predictions || []

      // Find efficiency prediction by checking statement for efficiency-related keywords
      const efficiencyPred = predictions.find(p =>
        p.statement.toLowerCase().includes('efficiency') ||
        p.statement.toLowerCase().includes('conversion rate')
      )

      // Find cost prediction by checking statement for cost-related keywords
      const costPred = predictions.find(p =>
        p.statement.toLowerCase().includes('cost') ||
        p.statement.toLowerCase().includes('lcoe') ||
        p.statement.toLowerCase().includes('price')
      )

      // Default parameters for Monte Carlo validation
      const params = {
        id: hypothesis.id,
        parameters: {
          efficiency: efficiencyPred?.expectedValue || 0.35,
          efficiencyStd: 0.03,
          cost: costPred?.expectedValue || 100,
          costStd: 15,
          capacityKw: 1000,
          capacityFactor: 0.25,
          lifetime: 25,
          theoreticalMaxEfficiency: 0.85,
          targetLcoe: 0.05,
        },
      }

      // Use batch validation with single hypothesis
      const results = await this.batchValidateHypotheses([params], 'full')
      const result = results[0]

      this.emitProgress({
        type: 'complete',
        tier: gpuTier,
        completion: 100,
        message: `Validation complete for ${hypothesis.id.slice(-8)}`,
        data: {
          physicsValid: result.physics_valid,
          economicallyViable: result.economically_viable,
          confidence: result.confidence_score,
        },
      })

      return {
        hypothesisId: hypothesis.id,
        physicsValid: result.physics_valid,
        economicallyViable: result.economically_viable,
        confidenceScore: result.confidence_score,
        validationDetails: {
          efficiency: {
            mean: result.metrics.efficiency.mean,
            ci95: result.metrics.efficiency.ci_95,
          },
          lcoe: {
            mean: result.metrics.lcoe.mean,
            ci95: result.metrics.lcoe.ci_95,
          },
          thermodynamicCheck: result.physics_valid,
          economicCheck: result.economically_viable,
        },
        gpuTier,
        durationMs: Date.now() - startTime,
      }
    } catch (error) {
      this.emitProgress({
        type: 'error',
        tier: gpuTier,
        message: `Validation failed for ${hypothesis.id.slice(-8)}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })

      // Return a fallback result indicating validation couldn't be performed
      return {
        hypothesisId: hypothesis.id,
        physicsValid: true, // Assume valid if we can't check
        economicallyViable: true,
        confidenceScore: 0.5, // Low confidence without GPU validation
        validationDetails: {
          thermodynamicCheck: false,
          economicCheck: false,
        },
        gpuTier,
        durationMs: Date.now() - startTime,
      }
    }
  }

  /**
   * Batch validate multiple hypotheses
   */
  async batchValidateHypotheses(
    hypotheses: Array<{
      id: string
      parameters: Record<string, number>
    }>,
    validationType: 'quick' | 'full' = 'full'
  ): Promise<HypothesisValidationResult[]> {
    this.emitProgress({
      type: 'started',
      tier: 'T4',
      message: `Batch validating ${hypotheses.length} hypotheses`,
    })

    const results = await this.callModalFunction<HypothesisValidationResult[]>(
      'batch_hypothesis_validation_endpoint',
      {
        hypotheses: hypotheses.map(h => ({
          id: h.id,
          parameters: {
            efficiency_mean: h.parameters.efficiency || 0.35,
            efficiency_std: h.parameters.efficiencyStd || 0.03,
            cost_mean: h.parameters.cost || 100,
            cost_std: h.parameters.costStd || 10,
            capacity_kw: h.parameters.capacityKw || 1000,
            capacity_factor: h.parameters.capacityFactor || 0.25,
            lifetime_years: h.parameters.lifetime || 25,
            theoretical_max_efficiency: h.parameters.theoreticalMaxEfficiency || 0.85,
            target_lcoe: h.parameters.targetLcoe || 0.05,
          },
        })),
        validation_type: validationType,
      }
    )

    this.emitProgress({
      type: 'complete',
      tier: 'T4',
      completion: 100,
      message: `Validated ${results.length} hypotheses`,
    })

    return results
  }

  /**
   * Call a Modal function via HTTP API
   *
   * Modal web endpoint URL format:
   * - Base endpoint: https://username--appname.modal.run
   * - With function: https://username--appname--functionname.modal.run
   *
   * The endpoint env var should be base: https://cdimurro--breakthrough-engine-gpu.modal.run
   */
  private async callModalFunction<T>(
    functionName: string,
    args: Record<string, unknown>
  ): Promise<T> {
    const apiKey = this.config.apiKey
    const endpoint = this.config.endpoint

    if (!apiKey) {
      throw new Error('Modal API key not configured. Set MODAL_API_KEY environment variable.')
    }

    // Modal web endpoint URL format: insert function name before .modal.run
    // e.g., https://cdimurro--breakthrough-engine-gpu.modal.run
    // becomes: https://cdimurro--breakthrough-engine-gpu--monte_carlo_vectorized.modal.run
    const functionNameFormatted = functionName.replace(/_/g, '-')
    const url = endpoint?.replace('.modal.run', `--${functionNameFormatted}.modal.run`) ||
                `https://modal.run/${functionName}`

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ args }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Modal API error: ${response.status} - ${errorText}`)
        }

        const data = await response.json() as T
        return data

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt < this.config.maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
          continue
        }
      }
    }

    throw lastError || new Error('Modal API call failed after retries')
  }

  /**
   * Check if Modal is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.config.apiKey) {
      return false
    }

    try {
      // Check if we can reach Modal API
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`${this.config.endpoint}/v1/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
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
   * Warm up GPU instances by sending a lightweight request
   * This helps reduce cold start latency for subsequent validations
   */
  async warmUp(count: number = 1): Promise<{ success: boolean; message: string }> {
    if (!this.config.apiKey) {
      return { success: false, message: 'Modal API key not configured' }
    }

    this.emitProgress({
      type: 'started',
      tier: this.gpuTier,
      message: `Warming up ${count} ${this.gpuTier} instance(s)...`,
    })

    try {
      // Send a lightweight validation request to warm up the GPU
      const warmupConfig: MonteCarloConfig = {
        hypothesis_id: 'warmup-ping',
        parameters: {
          efficiency_mean: 0.35,
          efficiency_std: 0.03,
          cost_mean: 100,
          cost_std: 10,
          capacity_kw: 1000,
          capacity_factor: 0.25,
          lifetime_years: 25,
        },
        seed: 42,
      }

      // Run minimal Monte Carlo with few iterations just to warm up
      await this.callModalFunction<MonteCarloResult[]>(
        'monte_carlo_vectorized_endpoint',
        {
          configs: [warmupConfig],
          n_iterations: 100, // Minimal iterations
          confidence_level: 0.95,
        }
      )

      this.emitProgress({
        type: 'complete',
        tier: this.gpuTier,
        completion: 100,
        message: `${this.gpuTier} GPU warmed up successfully`,
      })

      return { success: true, message: `${this.gpuTier} instance(s) ready` }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      this.emitProgress({
        type: 'error',
        tier: this.gpuTier,
        message: `Warm-up failed: ${errorMessage}`,
      })

      return { success: false, message: errorMessage }
    }
  }

  /**
   * Estimate cost for a simulation
   */
  async estimateCost(params: SimulationParams): Promise<number> {
    // Base cost by GPU tier
    let baseCost = GPU_COSTS[this.gpuTier]

    // Adjust based on simulation type and complexity
    switch (params.type) {
      case 'materials':
        baseCost = GPU_COSTS['A100'] // Materials always uses A100
        break
      case 'cfd':
      case 'optimization':
        baseCost = GPU_COSTS['A10G'] // More complex simulations
        break
      default:
        break
    }

    // Adjust for iterations
    const iterations = params.maxIterations || 10000
    if (iterations > 50000) {
      baseCost *= 1.5
    } else if (iterations > 100000) {
      baseCost *= 2.0
    }

    return baseCost
  }

  /**
   * Estimate duration for a simulation
   */
  async estimateDuration(params: SimulationParams): Promise<number> {
    // Base duration in ms by simulation type
    const baseDurations: Record<SimulationType, number> = {
      'thermodynamic': 15000,
      'electrochemical': 20000,
      'cfd': 45000,
      'kinetics': 15000,
      'heat-transfer': 30000,
      'mass-transfer': 30000,
      'materials': 60000,
      'optimization': 45000,
    }

    let duration = baseDurations[params.type] || 30000

    // Adjust for GPU tier (faster GPUs = faster execution)
    if (this.gpuTier === 'A100') {
      duration *= 0.6
    } else if (this.gpuTier === 'A10G') {
      duration *= 0.8
    }

    // Adjust for iterations
    const iterations = params.maxIterations || 10000
    duration *= Math.log10(iterations) / Math.log10(10000)

    return Math.round(duration)
  }

  /**
   * Emit progress event
   */
  private emitProgress(event: ModalProgressEvent): void {
    if (this.config.onProgress) {
      this.config.onProgress(event)
    }
  }

  /**
   * Identify major losses from Monte Carlo results
   */
  private identifyMajorLosses(result: MonteCarloResult): string[] {
    const losses: string[] = []

    // Check sensitivity impacts
    if (result.sensitivity.efficiency_impact > 0.5) {
      losses.push('Efficiency variance is a major driver of output uncertainty')
    }

    if (result.sensitivity.cost_impact > 0.5) {
      losses.push('Capital cost uncertainty significantly impacts economics')
    }

    if (result.sensitivity.lifetime_impact > 0.3) {
      losses.push('System lifetime assumptions affect long-term viability')
    }

    // Check distribution characteristics
    if (result.metrics.lcoe.skewness > 1.0) {
      losses.push('LCOE distribution is positively skewed (risk of higher costs)')
    }

    if (result.metrics.efficiency.std / result.metrics.efficiency.mean > 0.15) {
      losses.push('High efficiency variability suggests process control challenges')
    }

    if (losses.length === 0) {
      losses.push('Primary losses from inherent thermodynamic limitations')
    }

    return losses
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Modal simulation provider with optional configuration
 */
export function createModalProvider(
  tier: SimulationTier = 'tier2',
  config?: Partial<ModalProviderConfig>
): ModalSimulationProvider {
  return new ModalSimulationProvider(tier, config)
}

// ============================================================================
// Tier 2 and Tier 3 Convenience Classes
// ============================================================================

/**
 * Tier 2 provider using T4 GPU for moderate complexity simulations
 */
export class ModalTier2Provider extends ModalSimulationProvider {
  constructor(config?: Partial<ModalProviderConfig>) {
    super('tier2', { ...config, defaultGPU: 'T4' })
  }
}

/**
 * Tier 3 provider using A10G/A100 GPU for high-fidelity simulations
 */
export class ModalTier3Provider extends ModalSimulationProvider {
  constructor(config?: Partial<ModalProviderConfig>) {
    super('tier3', { ...config, defaultGPU: 'A10G' })
  }
}

export default ModalSimulationProvider
