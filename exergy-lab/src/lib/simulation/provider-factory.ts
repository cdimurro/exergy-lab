/**
 * Simulation Provider Factory
 *
 * Creates and manages simulation providers based on tier configuration.
 * Handles tier escalation and fallback logic.
 *
 * v0.0.2: Added Modal GPU providers for Tier 2/3
 * - Tier 2 (T4 GPU): Monte Carlo, parametric sweeps
 * - Tier 3 (A10G/A100): ML-MD, DFT calculations
 *
 * @see providers/modal-provider.ts - GPU-accelerated provider
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
import {
  ModalSimulationProvider,
  ModalTier2Provider,
  ModalTier3Provider,
  type ModalProgressEvent,
} from './providers/modal-provider'

// ============================================================================
// Configuration
// ============================================================================

/**
 * Check if Modal GPU is available (API key configured)
 */
function isModalConfigured(): boolean {
  return typeof process !== 'undefined' && !!process.env?.MODAL_API_KEY
}

/**
 * Check if cloud GPU is enabled
 */
function isCloudGPUEnabled(): boolean {
  return typeof process !== 'undefined' && process.env?.ENABLE_CLOUD_GPU === 'true'
}

// ============================================================================
// Provider Registry
// ============================================================================

const providerInstances: Map<SimulationTier, SimulationProvider> = new Map()

// Track Modal availability for logging
let modalAvailabilityChecked = false
let modalAvailable = false

/**
 * Get or create a simulation provider for the specified tier
 */
export function getSimulationProvider(
  tier: SimulationTier,
  onProgress?: (event: ModalProgressEvent) => void
): SimulationProvider {
  // Check if we already have an instance (without progress callback)
  if (!onProgress) {
    const existing = providerInstances.get(tier)
    if (existing) {
      return existing
    }
  }

  let provider: SimulationProvider

  // Create new provider based on tier
  switch (tier) {
    case 'tier1':
      provider = new AnalyticalSimulationProvider()
      break

    case 'tier2':
      // Use Modal T4 GPU if configured, otherwise fallback to analytical
      if (isModalConfigured()) {
        if (!modalAvailabilityChecked) {
          console.log('[SimulationProvider] Modal API key detected, enabling GPU tier 2 (T4)')
          modalAvailable = true
          modalAvailabilityChecked = true
        }
        provider = new ModalTier2Provider({ onProgress })
      } else {
        if (!modalAvailabilityChecked) {
          console.warn('[SimulationProvider] Modal not configured (MODAL_API_KEY missing), falling back to Tier 1')
          modalAvailabilityChecked = true
        }
        provider = new AnalyticalSimulationProvider()
      }
      break

    case 'tier3':
      // Use Modal A10G/A100 GPU if configured AND cloud GPU enabled
      if (isModalConfigured() && isCloudGPUEnabled()) {
        if (!modalAvailabilityChecked) {
          console.log('[SimulationProvider] Modal + Cloud GPU enabled, using GPU tier 3 (A10G/A100)')
          modalAvailable = true
          modalAvailabilityChecked = true
        }
        provider = new ModalTier3Provider({ onProgress })
      } else if (isModalConfigured()) {
        // Modal configured but cloud GPU not enabled - use T4
        console.log('[SimulationProvider] Cloud GPU not enabled (ENABLE_CLOUD_GPU=false), using Tier 2 (T4)')
        provider = new ModalTier2Provider({ onProgress })
      } else {
        if (!modalAvailabilityChecked) {
          console.warn('[SimulationProvider] Modal not configured, falling back to Tier 1')
          modalAvailabilityChecked = true
        }
        provider = new AnalyticalSimulationProvider()
      }
      break

    default:
      provider = new AnalyticalSimulationProvider()
  }

  // Cache if no progress callback (callbacks make instances unique)
  if (!onProgress) {
    providerInstances.set(tier, provider)
  }

  return provider
}

/**
 * Get appropriate tier based on hypothesis score
 * Higher scoring hypotheses get more powerful validation
 */
export function selectTierByScore(score: number): SimulationTier {
  if (score >= 8.5 && isModalConfigured() && isCloudGPUEnabled()) {
    return 'tier3' // A10G/A100 for potential breakthroughs
  } else if (score >= 7.0 && isModalConfigured()) {
    return 'tier2' // T4 for promising hypotheses
  } else {
    return 'tier1' // Local for screening
  }
}

/**
 * Check if Modal is currently available
 */
export function isModalAvailable(): boolean {
  return modalAvailable
}

/**
 * Clear cached providers (useful for testing)
 */
export function clearProviderCache(): void {
  providerInstances.clear()
  modalAvailabilityChecked = false
  modalAvailable = false
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
