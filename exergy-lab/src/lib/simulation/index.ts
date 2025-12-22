/**
 * Simulation Module
 *
 * Tiered simulation architecture with providers for:
 * - Tier 1: Analytical models (JavaScript) - FREE, instant
 * - Tier 2: Modal T4 GPU ($0.01/run) - Monte Carlo, parametric
 * - Tier 3: Modal A10G/A100 ($0.02-0.05/run) - ML-MD, DFT
 *
 * v0.0.2: Added Modal GPU integration for accelerated validation
 *
 * @see providers/modal-provider.ts - GPU-accelerated provider
 * @see modal-simulations/gpu_accelerated.py - Backend GPU functions
 */

// Types
export * from './types'

// Provider factory and manager
export {
  getSimulationProvider,
  selectTierByScore,
  isModalAvailable,
  clearProviderCache,
  SimulationManager,
  defaultSimulationManager,
} from './provider-factory'

// Providers
export { AnalyticalSimulationProvider } from './providers/analytical-provider'
export {
  ModalSimulationProvider,
  ModalTier2Provider,
  ModalTier3Provider,
  createModalProvider,
  type ModalProviderConfig,
  type ModalProgressEvent,
  type GPUTier,
} from './providers/modal-provider'
