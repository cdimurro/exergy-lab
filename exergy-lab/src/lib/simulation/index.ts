/**
 * Simulation Module (v0.0.4.2)
 *
 * Tiered simulation architecture with providers for:
 * - Tier 1: Analytical models (JavaScript) - FREE, instant
 * - Tier 2: Modal T4 GPU ($0.01/run) - Monte Carlo, parametric
 * - Tier 3: Modal A10G/A100 ($0.02-0.05/run) - ML-MD, DFT
 *
 * v0.0.2: Added Modal GPU integration for accelerated validation
 * v0.0.4.2: Added PhysX 5 and MuJoCo providers for advanced physics
 *
 * @see providers/modal-provider.ts - GPU-accelerated provider
 * @see providers/physx-provider.ts - PhysX 5 fluid/thermal simulations
 * @see providers/mujoco-provider.ts - MuJoCo mechanical simulations
 * @see orchestrator/simulation-orchestrator.ts - Intelligent routing
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

// PhysX Provider (v0.0.4.2)
export {
  PhysXProvider,
  createPhysXProvider,
  DEFAULT_PHYSX_CONFIG,
  type PhysXConfig,
  type PhysXSimulationType,
  type FluidSimulationParams,
  type ThermalSimulationParams,
  type PhysXSimulationResult,
} from './providers/physx-provider'

// MuJoCo Provider (v0.0.4.2)
export {
  MuJoCoProvider,
  createMuJoCoProvider,
  DEFAULT_MUJOCO_CONFIG,
  type MuJoCoConfig,
  type MuJoCoSimulationType,
  type WindTurbineParams,
  type EnergyStorageParams,
  type MuJoCoSimulationResult,
} from './providers/mujoco-provider'

// Simulation Orchestrator (v0.0.4.2)
export {
  SimulationOrchestrator,
  createSimulationOrchestrator,
  DEFAULT_ORCHESTRATOR_CONFIG,
  type OrchestratorConfig,
  type AdvancedSimulationType,
  type ValidationResult,
  type BatchValidationResult,
} from './orchestrator/simulation-orchestrator'
