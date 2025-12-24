/**
 * Device-Level Exergy Analysis Module
 *
 * Provides second-law thermodynamic analysis for clean energy technologies.
 *
 * Features:
 * - Applied Exergy Leverage scoring
 * - Device-level efficiency profiles for 13+ technologies
 * - Fossil fuel comparison statements
 * - Carnot factor calculations for heat systems
 *
 * Usage:
 * ```typescript
 * import { exergyCalculator, getDeviceProfile } from '@/lib/tea/exergy'
 *
 * // Analyze a specific technology
 * const result = exergyCalculator.analyzeProcess('solar-pv')
 *
 * // Get device profile details
 * const profile = getDeviceProfile('wind-onshore')
 *
 * // Compare technologies
 * const comparison = exergyCalculator.compareTechnologies('solar-pv', 'ccgt')
 * ```
 */

// Types
export type {
  EnergyQualityType,
  DeviceExergyProfile,
  ExergyAnalysisResult,
  AppliedExergyLeverage,
} from './types'

// Constants
export {
  ENERGY_QUALITY_FACTORS,
  ENERGY_QUALITY_LABELS,
  LEVERAGE_CATEGORIES,
  REFERENCE_TEMPERATURE_K,
  MIN_EFFICIENCY,
  getLeverageCategory,
} from './types'

// Device profiles
export {
  DEVICE_EXERGY_PROFILES,
  getDeviceProfile,
  normalizeTechnologyType,
  getAvailableTechnologies,
  getTechnologiesByOutput,
  getElectricityGenerators,
  getRenewableTechnologies,
  getFossilTechnologies,
} from './device-profiles'

// Calculator
export { ExergyCalculator, exergyCalculator } from './calculator'
