/**
 * TEA Module Index
 * Central export for all techno-economic analysis functionality
 */

// Quality Assurance (Sprint 1)
export * from './quality-orchestrator'
export * from './quality-rubric'
export * from './calculation-validator'
export * from './assumption-validator'
export * from './result-reconciliation'
export * from './agent-adapters'

// Core Calculations (Sprint 1)
export * from './calculations'

// Advanced Calculations (Sprint 2)
export * from './monte-carlo'
export * from './sensitivity'
export * from './financial-engine'
export * from './cost-estimator'

// Re-export commonly used types
export type {
  TEAInput_v2,
  TEAResult_v2,
  TEAReportConfig,
  CalculationProvenance,
} from '@/types/tea'

export type {
  ProcessStream,
  EquipmentItem,
  MaterialBalance,
  EnergyBalance,
  TEAValidationResult,
  FeedstockSpecification,
  EconomicAllocation,
  UncertaintyParameter,
} from '@/types/tea-process'
