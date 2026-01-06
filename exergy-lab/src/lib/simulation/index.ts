/**
 * Simulation Module (v2.0)
 *
 * Tiered simulation architecture with providers for:
 * - Tier 1: Analytical models (JavaScript) - FREE, instant
 * - Tier 2: Modal T4 GPU ($0.26/hr) - Monte Carlo, parametric
 * - Tier 3: Modal A10G/A100 ($0.76-$2.86/hr) - ML-MD, DFT, CFD
 *
 * v0.0.2: Added Modal GPU integration for accelerated validation
 * v0.0.4.2: Added PhysX 5 and MuJoCo providers for advanced physics
 * v2.0: Real PhysicsNeMo CFD + NVIDIA ALCHEMI + GPU billing
 *
 * @see providers/modal-provider.ts - GPU-accelerated provider
 * @see providers/physicsnemo-provider.ts - PhysicsNeMo CFD simulations
 * @see providers/alchemi-provider.ts - ALCHEMI materials discovery
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
  // PhysicsNeMo CFD (v0.0.5)
  getPhysicsNeMoProvider,
  isPhysicsNeMoAvailable,
  getCFDProvider,
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

// PhysicsNeMo CFD Provider (v2.0 - NVIDIA CES 2026)
export {
  PhysicsNeMoProvider,
  createPhysicsNeMoProvider,
  DEFAULT_PHYSICSNEMO_CONFIG,
  // GPU Billing (v2.0)
  GPU_PRICING,
  estimateGPUCost,
  type GPUType,
  type GPUBillingInfo,
  type PhysicsNeMoConfig,
  type CFDConfig,
  type BoundaryCondition,
  type HeatTransferConfig,
  type CFDResult,
  type HeatTransferResult,
} from './providers/physicsnemo-provider'

// ALCHEMI Materials Discovery Provider (v2.0 - NVIDIA ALCHEMI)
export {
  ALCHEMIProvider,
  createALCHEMIProvider,
  DEFAULT_ALCHEMI_CONFIG,
  type ALCHEMIConfig,
  type ALCHEMIModel,
  type AtomicStructure,
  type RelaxationRequest,
  type RelaxationResult,
  type BatteryScreeningRequest,
  type BatteryScreeningResult,
  type BatteryCandidate,
  type PropertyPredictionRequest,
  type PropertyPredictionResult,
} from './providers/alchemi-provider'

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

// Cost Control Service (v0.0.4.2)
export {
  CostControlService,
  getCostControlService,
  estimateSimulationCost,
  DEFAULT_COST_LIMITS,
  type CostLimits,
  type CostRecord,
  type CostSummary,
  type CostCheckResult,
} from './cost-control-service'

// Validation Module (v0.0.5)
export {
  UncertaintyQuantifier,
  createUncertaintyQuantifier,
  DEFAULT_UNCERTAINTY_CONFIG,
  BenchmarkValidator,
  createBenchmarkValidator,
  validateSimulation,
  BENCHMARK_DATABASE,
  type UncertaintyResult,
  type UncertaintyConfig,
  type ParameterSensitivity,
  type ConvergenceAnalysis,
  type BenchmarkCase,
  type ValidationResult as BenchmarkValidationResult,
  type MetricValidation,
  type Domain as BenchmarkDomain,
} from './validation'
