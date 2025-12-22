/**
 * TEA Module Index
 * Central export for all techno-economic analysis functionality
 */

// Quality Assurance
export * from './quality-orchestrator'
export * from './quality-rubric'
export * from './calculation-validator'
export * from './assumption-validator'
export * from './result-reconciliation'
export * from './agent-adapters'

// Core Calculations
export * from './calculations'

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
} from '@/types/tea-process'
