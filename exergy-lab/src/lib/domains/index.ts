/**
 * Domain Modules Index (v0.0.5)
 *
 * Centralized exports for all domain-specific modules.
 * Provides clean energy domain calculators, physical limits,
 * industry benchmarks, and validation rules.
 *
 * @example
 * ```typescript
 * import { getDomainRegistry, runDomainCalculator } from '@/lib/domains'
 *
 * // Get all solar calculators
 * const solarCalcs = getDomainRegistry().getCalculators('solar')
 *
 * // Run a specific calculator
 * const result = runDomainCalculator('shockley_queisser', { bandgap: 1.4 })
 * ```
 */

// Base types and constants
export * from './base'

// Domain Registry
export {
  DomainRegistry,
  getDomainRegistry,
  runDomainCalculator,
  getPhysicalLimit,
  validateDomainInputs,
  checkPhysicalLimit,
  getBenchmarksByYear,
  compareToBenchmarks,
  type DomainSearchResult,
  type DomainStatistics,
} from './registry'

// Individual domain modules
export { SolarDomain as SolarDomainModule } from './solar'
export { WindDomain as WindDomainModule } from './wind'
export { BatteryDomain as BatteryDomainModule } from './battery'
export { HydrogenDomainModule } from './hydrogen'
