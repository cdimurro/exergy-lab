/**
 * Simulation Module
 *
 * Tiered simulation architecture with providers for:
 * - Tier 1: Analytical models (JavaScript)
 * - Tier 2: ML surrogate models (ONNX.js)
 * - Tier 3: Cloud HPC simulations (Modal Labs)
 */

// Types
export * from './types'

// Provider factory and manager
export {
  getSimulationProvider,
  SimulationManager,
  defaultSimulationManager,
} from './provider-factory'

// Providers
export { AnalyticalSimulationProvider } from './providers/analytical-provider'
