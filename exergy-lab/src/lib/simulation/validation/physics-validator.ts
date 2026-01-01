/**
 * Physics Validation Middleware
 *
 * Enforces thermodynamic limits on simulation results before they are returned.
 * Catches physically impossible values (e.g., efficiency > Carnot limit) and
 * either corrects them or adds warnings.
 */

import type { SimulationResult, SimulationConfig, SimulationMetric } from '@/types/simulation'

export interface PhysicsValidationResult {
  isValid: boolean
  correctedMetrics?: SimulationMetric[]
  warnings: string[]
  errors: string[]
}

/**
 * Domain-specific efficiency limits based on physics
 */
const EFFICIENCY_LIMITS: Record<string, number> = {
  'geothermal': 0.35,      // Binary cycle with low-temp source
  'orc': 0.35,             // Organic Rankine Cycle
  'binary': 0.35,          // Binary cycle
  'rankine': 0.45,         // Steam Rankine
  'brayton': 0.45,         // Gas turbine
  'combined-cycle': 0.65,  // CCGT
  'solar': 0.47,           // Multi-junction concentrated
  'wind': 0.593,           // Betz limit
  'fuel-cell': 0.70,       // High-temp SOFC
  'thermal': 0.50,         // Generic thermal system
}

/**
 * Physics Validator - enforces thermodynamic limits on simulation results
 */
export class PhysicsValidator {
  /**
   * Validate and optionally correct simulation results against physics limits
   */
  static validate(
    result: SimulationResult,
    config: SimulationConfig
  ): PhysicsValidationResult {
    const warnings: string[] = []
    const errors: string[] = []
    const correctedMetrics = [...result.metrics]

    // Find efficiency metric(s)
    const efficiencyIndices = correctedMetrics
      .map((m, i) => ({ metric: m, index: i }))
      .filter(({ metric }) =>
        metric.name.toLowerCase().includes('efficiency') ||
        metric.name.toLowerCase().includes('eta') ||
        metric.name.toLowerCase() === 'eta_practical' ||
        metric.name.toLowerCase() === 'cycle efficiency'
      )

    for (const { metric, index } of efficiencyIndices) {
      // Calculate Carnot limit from temperature parameters if available
      const carnotLimit = this.calculateCarnotLimit(config)

      // Determine domain-specific limit
      const domainLimit = this.getDomainLimit(config)

      // Use the more restrictive of Carnot or domain limit
      const effectiveLimit = carnotLimit
        ? Math.min(carnotLimit, domainLimit)
        : domainLimit

      // Check if efficiency exceeds limit
      // Note: metric.value is in percentage (e.g., 77.17), limit is fraction (e.g., 0.295)
      const efficiencyFraction = metric.value / 100

      if (efficiencyFraction > effectiveLimit) {
        const limitPercent = (effectiveLimit * 100).toFixed(1)
        errors.push(
          `${metric.name} of ${metric.value.toFixed(1)}% exceeds thermodynamic limit of ${limitPercent}%`
        )

        // Correct to 80% of the theoretical limit (practical systems)
        // For ORC geothermal with T_hot=423K, T_cold=298K:
        // Carnot = 29.5%, practical = 29.5% * 0.80 = 23.6%
        const practicalFactor = 0.80
        const correctedValue = effectiveLimit * practicalFactor * 100

        correctedMetrics[index] = {
          ...metric,
          value: correctedValue,
          uncertainty: metric.uncertainty ?? 5, // Add uncertainty for corrected value
        }

        warnings.push(
          `${metric.name} corrected to ${correctedValue.toFixed(1)}% (${(practicalFactor * 100).toFixed(0)}% of Carnot limit)`
        )
      }
    }

    // Validate power output is positive
    const powerMetrics = correctedMetrics.filter(m =>
      m.name.toLowerCase().includes('power')
    )
    for (const metric of powerMetrics) {
      if (metric.value < 0) {
        errors.push(`${metric.name} cannot be negative: ${metric.value} ${metric.unit}`)
      }
    }

    return {
      isValid: errors.length === 0,
      correctedMetrics: errors.length > 0 ? correctedMetrics : undefined,
      warnings,
      errors,
    }
  }

  /**
   * Calculate Carnot efficiency limit from temperature parameters
   *
   * eta_carnot = 1 - T_cold/T_hot
   *
   * For geothermal with T_hot=423K, T_cold=298K:
   * eta_carnot = 1 - 298/423 = 0.295 (29.5%)
   */
  private static calculateCarnotLimit(config: SimulationConfig): number | null {
    const params = config.parameters || []

    // Find hot side temperature
    const tHot = params.find(p => {
      const name = p.name.toLowerCase()
      return name.includes('source') ||
             name.includes('hot') ||
             name.includes('inlet') ||
             name.includes('geofluid') ||
             name.includes('brine')
    })

    // Find cold side temperature
    const tCold = params.find(p => {
      const name = p.name.toLowerCase()
      return name.includes('sink') ||
             name.includes('cold') ||
             name.includes('ambient') ||
             name.includes('condenser') ||
             name.includes('rejection')
    })

    if (tHot && tCold) {
      const hotValue = typeof tHot.value === 'number' ? tHot.value : parseFloat(String(tHot.value))
      const coldValue = typeof tCold.value === 'number' ? tCold.value : parseFloat(String(tCold.value))

      if (isNaN(hotValue) || isNaN(coldValue)) {
        return null
      }

      // Convert to Kelvin if needed (assume Kelvin if > 200, otherwise Celsius)
      const hotK = hotValue > 200 ? hotValue : hotValue + 273.15
      const coldK = coldValue > 200 ? coldValue : coldValue + 273.15

      // Carnot limit
      const carnotLimit = 1 - (coldK / hotK)

      return Math.max(0, carnotLimit)
    }

    return null
  }

  /**
   * Get domain-specific efficiency limit from simulation config or title
   */
  private static getDomainLimit(config: SimulationConfig): number {
    const title = (config.title || '').toLowerCase()
    const description = (config.description || '').toLowerCase()
    const combined = `${title} ${description}`

    // Check for domain keywords
    if (combined.includes('geothermal') || combined.includes('binary cycle') || combined.includes('orc')) {
      return EFFICIENCY_LIMITS['geothermal']
    }
    if (combined.includes('solar') || combined.includes('photovoltaic')) {
      return EFFICIENCY_LIMITS['solar']
    }
    if (combined.includes('wind')) {
      return EFFICIENCY_LIMITS['wind']
    }
    if (combined.includes('fuel cell') || combined.includes('sofc')) {
      return EFFICIENCY_LIMITS['fuel-cell']
    }
    if (combined.includes('combined cycle') || combined.includes('ccgt')) {
      return EFFICIENCY_LIMITS['combined-cycle']
    }
    if (combined.includes('rankine')) {
      return EFFICIENCY_LIMITS['rankine']
    }
    if (combined.includes('brayton')) {
      return EFFICIENCY_LIMITS['brayton']
    }

    // Default to generic thermal limit
    return EFFICIENCY_LIMITS['thermal']
  }

  /**
   * Extract domain string for logging/warnings
   */
  static extractDomain(config: SimulationConfig): string {
    const title = (config.title || '').toLowerCase()

    if (title.includes('geothermal') || title.includes('binary cycle')) return 'geothermal'
    if (title.includes('orc')) return 'orc'
    if (title.includes('solar')) return 'solar'
    if (title.includes('wind')) return 'wind'
    if (title.includes('fuel cell')) return 'fuel-cell'

    return 'thermal'
  }
}

/**
 * Factory function for creating a validator instance
 */
export function createPhysicsValidator(): typeof PhysicsValidator {
  return PhysicsValidator
}
