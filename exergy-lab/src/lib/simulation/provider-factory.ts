/**
 * Simulation Provider Factory
 *
 * Creates and manages simulation providers based on tier configuration.
 * Handles tier escalation and fallback logic.
 */

import type {
  SimulationProvider,
  SimulationTier,
  SimulationParams,
  SimulationResult,
  SimulationConfig,
} from './types'
import { DEFAULT_SIMULATION_CONFIG, TIER_INFO } from './types'
import { AnalyticalSimulationProvider } from './providers/analytical-provider'

// ============================================================================
// Provider Registry
// ============================================================================

const providerInstances: Map<SimulationTier, SimulationProvider> = new Map()

/**
 * Get or create a simulation provider for the specified tier
 */
export function getSimulationProvider(tier: SimulationTier): SimulationProvider {
  // Check if we already have an instance
  let provider = providerInstances.get(tier)

  if (!provider) {
    // Create new provider based on tier
    switch (tier) {
      case 'tier1':
        provider = new AnalyticalSimulationProvider()
        break
      case 'tier2':
        // ML provider not yet implemented - fall back to tier1
        console.warn('[SimulationProvider] Tier 2 (ML) not implemented, falling back to Tier 1')
        provider = new AnalyticalSimulationProvider()
        break
      case 'tier3':
        // Cloud provider not yet implemented - fall back to tier1
        console.warn('[SimulationProvider] Tier 3 (Cloud) not implemented, falling back to Tier 1')
        provider = new AnalyticalSimulationProvider()
        break
      default:
        provider = new AnalyticalSimulationProvider()
    }

    providerInstances.set(tier, provider)
  }

  return provider
}

// ============================================================================
// Simulation Manager
// ============================================================================

/**
 * Manages simulation execution with tier escalation and fallback
 */
export class SimulationManager {
  private config: SimulationConfig

  constructor(config: Partial<SimulationConfig> = {}) {
    this.config = { ...DEFAULT_SIMULATION_CONFIG, ...config }
  }

  /**
   * Execute a simulation with automatic tier handling
   */
  async execute(params: SimulationParams, requestedTier?: SimulationTier): Promise<SimulationResult> {
    const tier = requestedTier || this.config.defaultTier

    // Get the provider for the requested tier
    const provider = getSimulationProvider(tier)

    // Check if provider is available
    const isAvailable = await provider.isAvailable()

    if (!isAvailable && this.config.fallbackToLowerTier) {
      // Try to fall back to a lower tier
      const lowerTier = this.getLowerTier(tier)
      if (lowerTier) {
        console.log(`[SimulationManager] Falling back from ${tier} to ${lowerTier}`)
        return this.execute(params, lowerTier)
      }
    }

    if (!isAvailable) {
      throw new Error(`Simulation provider for ${tier} is not available`)
    }

    // Check cost if configured
    if (this.config.maxCostPerSimulation && provider.estimateCost) {
      const estimatedCost = await provider.estimateCost(params)
      if (estimatedCost > this.config.maxCostPerSimulation) {
        throw new Error(
          `Estimated cost $${estimatedCost.toFixed(2)} exceeds limit $${this.config.maxCostPerSimulation.toFixed(2)}`
        )
      }
    }

    // Execute the simulation
    console.log(`[SimulationManager] Executing ${params.type} simulation with ${provider.name}`)
    const result = await provider.execute(params)

    return result
  }

  /**
   * Execute multiple simulations in parallel with concurrency limit
   */
  async executeMany(
    paramsArray: SimulationParams[],
    tier?: SimulationTier,
    concurrency: number = 5
  ): Promise<SimulationResult[]> {
    const results: SimulationResult[] = []

    // Process in batches
    for (let i = 0; i < paramsArray.length; i += concurrency) {
      const batch = paramsArray.slice(i, i + concurrency)
      const batchResults = await Promise.all(
        batch.map(params => this.execute(params, tier))
      )
      results.push(...batchResults)
    }

    return results
  }

  /**
   * Get the next lower tier
   */
  private getLowerTier(tier: SimulationTier): SimulationTier | null {
    switch (tier) {
      case 'tier3':
        return 'tier2'
      case 'tier2':
        return 'tier1'
      default:
        return null
    }
  }

  /**
   * Get information about available tiers
   */
  getAvailableTiers(): typeof TIER_INFO {
    return TIER_INFO
  }

  /**
   * Check if a specific tier is available
   */
  async isTierAvailable(tier: SimulationTier): Promise<boolean> {
    const provider = getSimulationProvider(tier)
    return provider.isAvailable()
  }
}

// ============================================================================
// Default Export
// ============================================================================

export const defaultSimulationManager = new SimulationManager()

export default SimulationManager
