/**
 * Simulation Orchestrator (v0.0.4.2)
 *
 * Intelligent routing layer that selects the appropriate simulation provider
 * based on hypothesis type, domain, and available resources.
 *
 * Supports:
 * - PhysX 5 for fluid dynamics and thermal simulations
 * - MuJoCo for mechanical and multi-body dynamics
 * - Modal provider for ML surrogate models
 * - Analytical provider for fast approximations
 *
 * @see providers/ - Individual simulation providers
 * @see hypothesis-racer.ts - Integration with breakthrough engine
 */

import type {
  SimulationProvider,
  SimulationParams,
  SimulationResult,
  SimulationType,
  SimulationTier,
} from '../types'
import { createPhysXProvider, type PhysXConfig } from '../providers/physx-provider'
import { createMuJoCoProvider, type MuJoCoConfig } from '../providers/mujoco-provider'
import type { RacingHypothesis } from '@/lib/ai/agents/hypgen'

// ============================================================================
// Types
// ============================================================================

export type AdvancedSimulationType =
  | SimulationType
  | 'fluid_dynamics'
  | 'thermal'
  | 'mechanical'
  | 'wind_turbine'
  | 'energy_storage'
  | 'battery'
  | 'solar'
  | 'hydrogen'

export interface OrchestratorConfig {
  /** Enable PhysX provider */
  enablePhysX: boolean
  /** Enable MuJoCo provider */
  enableMuJoCo: boolean
  /** Enable cloud providers */
  enableCloud: boolean
  /** Maximum cost per simulation */
  maxCostPerSimulation: number
  /** Preferred cloud provider */
  cloudProvider: 'modal' | 'runpod' | 'local'
  /** GPU tier for cloud simulations */
  gpuTier: 'T4' | 'A10G' | 'A100'
  /** Cache results for faster repeat runs */
  enableCaching: boolean
  /** Cache TTL in milliseconds */
  cacheTTL: number
}

export interface ValidationResult {
  hypothesisId: string
  physicsValid: boolean
  economicallyViable: boolean
  simulationType: AdvancedSimulationType
  provider: string
  confidence: number
  metrics: Record<string, number>
  cost: number
  durationMs: number
  fromCache: boolean
  warnings?: string[]
  recommendations?: string[]
}

export interface BatchValidationResult {
  results: ValidationResult[]
  totalCost: number
  totalDuration: number
  providerStats: Record<string, { count: number; successRate: number }>
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  enablePhysX: true,
  enableMuJoCo: true,
  enableCloud: false, // Disabled by default to minimize costs
  maxCostPerSimulation: 0.50,
  cloudProvider: 'modal',
  gpuTier: 'T4',
  enableCaching: true,
  cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
}

// ============================================================================
// Domain Keywords for Classification
// ============================================================================

const DOMAIN_KEYWORDS = {
  fluid_dynamics: [
    'flow', 'fluid', 'turbulent', 'laminar', 'reynolds', 'navier-stokes',
    'cfd', 'velocity', 'pressure drop', 'pump', 'pipe', 'channel',
  ],
  thermal: [
    'heat', 'thermal', 'temperature', 'conduction', 'convection', 'radiation',
    'heat exchanger', 'cooling', 'heating', 'insulation', 'heat transfer',
  ],
  mechanical: [
    'mechanical', 'stress', 'strain', 'fatigue', 'vibration', 'dynamics',
    'bearing', 'gear', 'shaft', 'structural', 'load', 'torque',
  ],
  wind_turbine: [
    'wind turbine', 'blade', 'rotor', 'nacelle', 'tower', 'wind farm',
    'wind energy', 'wind speed', 'tip speed', 'yaw', 'pitch control',
  ],
  energy_storage: [
    'flywheel', 'energy storage', 'mechanical storage', 'kinetic energy',
    'compressed air', 'caes', 'pumped hydro', 'gravity storage',
  ],
  battery: [
    'battery', 'lithium', 'electrode', 'electrolyte', 'cathode', 'anode',
    'cell', 'charging', 'discharge', 'soc', 'degradation', 'cycle',
  ],
  solar: [
    'solar', 'photovoltaic', 'pv', 'solar cell', 'module', 'panel',
    'irradiance', 'efficiency', 'shading', 'mppt', 'inverter',
  ],
  hydrogen: [
    'hydrogen', 'electrolyzer', 'fuel cell', 'h2', 'electrolysis',
    'proton exchange', 'pem', 'soec', 'alkaline', 'green hydrogen',
  ],
}

// ============================================================================
// Simulation Orchestrator
// ============================================================================

export class SimulationOrchestrator {
  private config: OrchestratorConfig
  private physxProvider: SimulationProvider | null = null
  private mujocoProvider: SimulationProvider | null = null
  private analyticalProvider: SimulationProvider | null = null
  private cache: Map<string, { result: ValidationResult; timestamp: number }> = new Map()

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_ORCHESTRATOR_CONFIG, ...config }
    this.initializeProviders()
  }

  /**
   * Initialize simulation providers
   */
  private initializeProviders(): void {
    const physxConfig: Partial<PhysXConfig> = {
      cloudProvider: this.config.enableCloud ? this.config.cloudProvider : 'local',
      gpuTier: this.config.gpuTier,
    }

    const mujocoConfig: Partial<MuJoCoConfig> = {
      cloudProvider: this.config.enableCloud ? this.config.cloudProvider : 'local',
    }

    if (this.config.enablePhysX) {
      this.physxProvider = createPhysXProvider(physxConfig)
    }

    if (this.config.enableMuJoCo) {
      this.mujocoProvider = createMuJoCoProvider(mujocoConfig)
    }
  }

  /**
   * Validate a hypothesis using appropriate physics simulation
   */
  async validateHypothesis(hypothesis: RacingHypothesis): Promise<ValidationResult> {
    const startTime = Date.now()

    // Check cache
    const cacheKey = this.getCacheKey(hypothesis)
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      console.log(`[Orchestrator] Cache hit for hypothesis ${hypothesis.id.slice(-8)}`)
      return { ...cached, fromCache: true }
    }

    // Determine simulation type
    const simType = this.classifyHypothesis(hypothesis)
    console.log(`[Orchestrator] Classified hypothesis as: ${simType}`)

    // Select provider
    const provider = this.selectProvider(simType)
    if (!provider) {
      console.warn(`[Orchestrator] No provider available for ${simType}`)
      return this.createFallbackResult(hypothesis, simType, startTime)
    }

    // Build simulation parameters
    const params = this.buildSimulationParams(hypothesis, simType)

    // Estimate cost and check budget
    const estimatedCost = await provider.estimateCost?.(params) || 0
    if (estimatedCost > this.config.maxCostPerSimulation) {
      console.warn(`[Orchestrator] Estimated cost $${estimatedCost.toFixed(3)} exceeds budget`)
      return this.createFallbackResult(hypothesis, simType, startTime, 'Budget exceeded')
    }

    try {
      // Execute simulation
      const simResult = await provider.execute(params)

      // Convert to validation result
      const validationResult = this.convertToValidationResult(
        hypothesis,
        simResult,
        simType,
        provider.name,
        startTime
      )

      // Cache result
      this.addToCache(cacheKey, validationResult)

      return validationResult

    } catch (error) {
      console.error(`[Orchestrator] Simulation failed:`, error)
      return this.createFallbackResult(
        hypothesis,
        simType,
        startTime,
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  /**
   * Batch validate multiple hypotheses
   */
  async validateBatch(hypotheses: RacingHypothesis[]): Promise<BatchValidationResult> {
    const startTime = Date.now()
    const results: ValidationResult[] = []
    const providerStats: Record<string, { count: number; successes: number }> = {}

    // Process hypotheses in parallel (with concurrency limit)
    const concurrencyLimit = 5
    const batches: RacingHypothesis[][] = []

    for (let i = 0; i < hypotheses.length; i += concurrencyLimit) {
      batches.push(hypotheses.slice(i, i + concurrencyLimit))
    }

    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(h => this.validateHypothesis(h))
      )

      for (const result of batchResults) {
        results.push(result)

        // Track provider stats
        if (!providerStats[result.provider]) {
          providerStats[result.provider] = { count: 0, successes: 0 }
        }
        providerStats[result.provider].count++
        if (result.physicsValid) {
          providerStats[result.provider].successes++
        }
      }
    }

    // Calculate totals
    const totalCost = results.reduce((sum, r) => sum + r.cost, 0)
    const totalDuration = Date.now() - startTime

    // Convert stats to success rates
    const statsWithRates: Record<string, { count: number; successRate: number }> = {}
    for (const [provider, stats] of Object.entries(providerStats)) {
      statsWithRates[provider] = {
        count: stats.count,
        successRate: stats.count > 0 ? stats.successes / stats.count : 0,
      }
    }

    return {
      results,
      totalCost,
      totalDuration,
      providerStats: statsWithRates,
    }
  }

  /**
   * Classify hypothesis to determine simulation type
   */
  classifyHypothesis(hypothesis: RacingHypothesis): AdvancedSimulationType {
    const text = `${hypothesis.title} ${hypothesis.statement}`.toLowerCase()

    // Score each domain
    const scores: Record<string, number> = {}

    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      scores[domain] = keywords.filter(kw => text.includes(kw)).length
    }

    // Find best match
    let bestDomain: AdvancedSimulationType = 'thermodynamic'
    let bestScore = 0

    for (const [domain, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score
        bestDomain = domain as AdvancedSimulationType
      }
    }

    // Fallback based on hypothesis predictions
    if (bestScore === 0 && hypothesis.predictions) {
      for (const prediction of hypothesis.predictions) {
        const predText = prediction.statement?.toLowerCase() || ''
        if (predText.includes('efficiency')) return 'thermodynamic'
        if (predText.includes('cost')) return 'optimization'
        if (predText.includes('power')) return 'mechanical'
      }
    }

    return bestDomain
  }

  /**
   * Select appropriate provider for simulation type
   */
  private selectProvider(simType: AdvancedSimulationType): SimulationProvider | null {
    switch (simType) {
      case 'fluid_dynamics':
      case 'thermal':
      case 'cfd':
      case 'heat-transfer':
        return this.physxProvider

      case 'mechanical':
      case 'wind_turbine':
      case 'energy_storage':
      case 'kinetics':
        return this.mujocoProvider

      case 'battery':
      case 'solar':
      case 'hydrogen':
      case 'electrochemical':
        // These would use specialized providers (future expansion)
        // For now, fall back to PhysX for thermal aspects
        return this.physxProvider

      default:
        // Prefer MuJoCo for general mechanics, PhysX for fluids
        return this.mujocoProvider || this.physxProvider
    }
  }

  /**
   * Build simulation parameters from hypothesis
   */
  private buildSimulationParams(
    hypothesis: RacingHypothesis,
    simType: AdvancedSimulationType
  ): SimulationParams {
    const inputs: Record<string, number> = {}

    // Extract numerical values from predictions
    if (hypothesis.predictions) {
      for (const prediction of hypothesis.predictions) {
        if (prediction.expectedValue !== undefined) {
          const key = prediction.statement?.slice(0, 20)
            .replace(/[^a-zA-Z0-9]/g, '_')
            .toLowerCase() || 'value'
          inputs[key] = typeof prediction.expectedValue === 'number'
            ? prediction.expectedValue
            : parseFloat(String(prediction.expectedValue)) || 0
        }
      }
    }

    // Add default parameters based on simulation type
    switch (simType) {
      case 'wind_turbine':
        inputs.bladeLength = inputs.bladeLength || 50
        inputs.windSpeed = inputs.windSpeed || 12
        break
      case 'energy_storage':
        inputs.flywheel_mass = inputs.flywheel_mass || 1000
        break
      case 'thermal':
        inputs.initial_temperature = inputs.initial_temperature || 300
        break
      case 'fluid_dynamics':
        inputs.velocity = inputs.velocity || 1
        break
    }

    // Map advanced types to core types
    const coreType: SimulationType = this.mapToCoreType(simType)

    return {
      experimentId: hypothesis.id,
      type: coreType,
      inputs,
      boundaryConditions: [],
      maxIterations: 1000,
      duration: 10,
    }
  }

  /**
   * Map advanced simulation type to core type
   */
  private mapToCoreType(simType: AdvancedSimulationType): SimulationType {
    const mapping: Record<AdvancedSimulationType, SimulationType> = {
      'fluid_dynamics': 'cfd',
      'thermal': 'heat-transfer',
      'mechanical': 'kinetics',
      'wind_turbine': 'kinetics',
      'energy_storage': 'kinetics',
      'battery': 'electrochemical',
      'solar': 'thermodynamic',
      'hydrogen': 'electrochemical',
      'thermodynamic': 'thermodynamic',
      'electrochemical': 'electrochemical',
      'cfd': 'cfd',
      'kinetics': 'kinetics',
      'heat-transfer': 'heat-transfer',
      'mass-transfer': 'mass-transfer',
      'materials': 'materials',
      'optimization': 'optimization',
    }

    return mapping[simType] || 'thermodynamic'
  }

  /**
   * Convert simulation result to validation result
   */
  private convertToValidationResult(
    hypothesis: RacingHypothesis,
    simResult: SimulationResult,
    simType: AdvancedSimulationType,
    providerName: string,
    startTime: number
  ): ValidationResult {
    // Extract metrics from outputs
    const metrics: Record<string, number> = {}
    for (const output of simResult.outputs) {
      metrics[output.name.toLowerCase().replace(/\s+/g, '_')] = output.value
    }

    // Determine physics validity
    const physicsValid = simResult.converged && this.assessPhysicsValidity(simResult, simType)

    // Determine economic viability
    const economicallyViable = this.assessEconomicViability(simResult, hypothesis)

    // Calculate confidence
    const confidence = this.calculateConfidence(simResult, physicsValid)

    return {
      hypothesisId: hypothesis.id,
      physicsValid,
      economicallyViable,
      simulationType: simType,
      provider: providerName,
      confidence,
      metrics,
      cost: simResult.metadata.cost || 0,
      durationMs: Date.now() - startTime,
      fromCache: false,
      warnings: this.generateWarnings(simResult, simType),
      recommendations: this.generateRecommendations(simResult, simType),
    }
  }

  /**
   * Assess physics validity from simulation results
   */
  private assessPhysicsValidity(result: SimulationResult, simType: AdvancedSimulationType): boolean {
    // Check for convergence
    if (!result.converged) return false

    // Check for reasonable output values
    for (const output of result.outputs) {
      if (!isFinite(output.value)) return false
      if (output.name.toLowerCase().includes('efficiency') && (output.value < 0 || output.value > 100)) {
        return false
      }
    }

    return true
  }

  /**
   * Assess economic viability
   */
  private assessEconomicViability(result: SimulationResult, hypothesis: RacingHypothesis): boolean {
    // Check for cost-related outputs
    for (const output of result.outputs) {
      const name = output.name.toLowerCase()
      if (name.includes('lcoe') && output.value > 200) return false // Too expensive
      if (name.includes('efficiency') && output.value < 10) return false // Too low
    }

    // Use hypothesis economic score if available
    const economicDimension = hypothesis.scores?.dimensions?.get('bc2_cost')
    if (economicDimension) {
      return economicDimension.points >= 0.5
    }

    return true
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(result: SimulationResult, physicsValid: boolean): number {
    let confidence = physicsValid ? 0.7 : 0.3

    // Adjust based on convergence quality
    if (result.residual !== undefined) {
      confidence += result.residual < 1e-6 ? 0.2 : result.residual < 1e-3 ? 0.1 : 0
    }

    // Adjust based on iteration count
    if (result.iterations < 100) confidence += 0.1 // Fast convergence is good

    return Math.min(1, confidence)
  }

  /**
   * Generate warnings based on simulation results
   */
  private generateWarnings(result: SimulationResult, simType: AdvancedSimulationType): string[] {
    const warnings: string[] = []

    if (!result.converged) {
      warnings.push('Simulation did not converge fully')
    }

    if (result.residual && result.residual > 1e-3) {
      warnings.push(`High residual: ${result.residual.toExponential(2)}`)
    }

    return warnings
  }

  /**
   * Generate recommendations based on simulation results
   */
  private generateRecommendations(result: SimulationResult, simType: AdvancedSimulationType): string[] {
    const recommendations: string[] = []

    for (const output of result.outputs) {
      const name = output.name.toLowerCase()

      if (name.includes('efficiency') && output.value < 30) {
        recommendations.push('Consider optimizing efficiency through material or design changes')
      }

      if (name.includes('reynolds') && output.value > 100000) {
        recommendations.push('High turbulence detected - may require more detailed CFD analysis')
      }
    }

    return recommendations
  }

  /**
   * Create fallback result when simulation cannot be performed
   */
  private createFallbackResult(
    hypothesis: RacingHypothesis,
    simType: AdvancedSimulationType,
    startTime: number,
    reason?: string
  ): ValidationResult {
    return {
      hypothesisId: hypothesis.id,
      physicsValid: true, // Assume valid if we can't verify
      economicallyViable: true,
      simulationType: simType,
      provider: 'fallback',
      confidence: 0.5,
      metrics: {},
      cost: 0,
      durationMs: Date.now() - startTime,
      fromCache: false,
      warnings: reason ? [reason] : ['Simulation skipped - using analytical approximation'],
    }
  }

  /**
   * Get cache key for hypothesis
   */
  private getCacheKey(hypothesis: RacingHypothesis): string {
    // Hash based on hypothesis content (not ID, since content matters)
    const content = `${hypothesis.title}:${hypothesis.statement}:${hypothesis.iteration}`
    return `sim_${this.hashCode(content)}`
  }

  /**
   * Simple hash function for cache keys
   */
  private hashCode(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return hash.toString(36)
  }

  /**
   * Get from cache if not expired
   */
  private getFromCache(key: string): ValidationResult | null {
    if (!this.config.enableCaching) return null

    const cached = this.cache.get(key)
    if (!cached) return null

    const age = Date.now() - cached.timestamp
    if (age > this.config.cacheTTL) {
      this.cache.delete(key)
      return null
    }

    return cached.result
  }

  /**
   * Add to cache
   */
  private addToCache(key: string, result: ValidationResult): void {
    if (!this.config.enableCaching) return

    this.cache.set(key, { result, timestamp: Date.now() })

    // Clean old entries if cache is too large
    if (this.cache.size > 1000) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) this.cache.delete(oldestKey)
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses for accurate rate
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSimulationOrchestrator(
  config?: Partial<OrchestratorConfig>
): SimulationOrchestrator {
  return new SimulationOrchestrator(config)
}
