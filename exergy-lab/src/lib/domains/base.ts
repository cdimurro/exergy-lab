/**
 * Domain Module Base (v0.0.5)
 *
 * Base interfaces and types for domain-specific calculators
 * and validation in clean energy domains.
 *
 * @see registry.ts - Domain module registry
 * @see solar/ - Solar domain implementation
 * @see wind/ - Wind domain implementation
 * @see battery/ - Battery domain implementation
 * @see hydrogen/ - Hydrogen domain implementation
 */

// ============================================================================
// Types
// ============================================================================

export type DomainId = 'solar' | 'wind' | 'battery' | 'hydrogen' | 'geothermal' | 'grid' | 'general'

export interface PhysicalLimit {
  id: string
  name: string
  description: string
  value: number
  unit: string
  formula?: string
  citation: string
  conditions?: string
}

export interface IndustryBenchmark {
  id: string
  name: string
  description: string
  value: number
  unit: string
  year: number
  source: string
  category: 'commercial' | 'lab_record' | 'theoretical' | 'projected'
}

export interface CalculatorInput {
  id: string
  name: string
  description: string
  type: 'number' | 'select' | 'range'
  unit?: string
  defaultValue: number | string
  min?: number
  max?: number
  step?: number
  options?: { value: string | number; label: string }[]
  required: boolean
}

export interface CalculatorOutput {
  id: string
  name: string
  description: string
  unit: string
  precision?: number
  category?: string
}

export interface CalculatorResult {
  outputs: Record<string, number | string>
  warnings?: string[]
  notes?: string[]
  references?: string[]
  isValid: boolean
  validationErrors?: string[]
}

export interface DomainCalculator {
  id: string
  name: string
  description: string
  category: string
  inputs: CalculatorInput[]
  outputs: CalculatorOutput[]
  calculate: (inputs: Record<string, number | string>) => CalculatorResult
  citation?: string
}

export interface ValidationRule {
  id: string
  name: string
  description: string
  severity: 'error' | 'warning' | 'info'
  check: (value: number, context?: Record<string, any>) => boolean
  message: string
}

export interface SimulationTemplate {
  id: string
  name: string
  description: string
  provider: 'analytical' | 'modal' | 'physx' | 'mujoco'
  parameters: Record<string, any>
  estimatedCost?: number
  estimatedDuration?: number
}

export interface DomainFormConfig {
  sections: {
    id: string
    title: string
    fields: CalculatorInput[]
  }[]
  presets?: {
    id: string
    name: string
    values: Record<string, number | string>
  }[]
}

// ============================================================================
// Domain Module Interface
// ============================================================================

export interface DomainModule {
  id: DomainId
  name: string
  description: string
  icon?: string

  // Physical constraints
  physicalLimits: PhysicalLimit[]
  industryBenchmarks: IndustryBenchmark[]

  // Calculators
  calculators: DomainCalculator[]

  // Validation
  validationRules: ValidationRule[]

  // Simulation
  simulationTemplates: SimulationTemplate[]

  // Form configuration
  inputFormConfig?: DomainFormConfig

  // Utilities
  validateValue: (metric: string, value: number, context?: Record<string, any>) => {
    valid: boolean
    violations: string[]
    warnings: string[]
  }

  getCalculator: (id: string) => DomainCalculator | undefined
  getPhysicalLimit: (id: string) => PhysicalLimit | undefined
  getBenchmark: (id: string) => IndustryBenchmark | undefined
}

// ============================================================================
// Base Implementation
// ============================================================================

export abstract class BaseDomainModule implements DomainModule {
  abstract id: DomainId
  abstract name: string
  abstract description: string
  abstract icon?: string
  abstract physicalLimits: PhysicalLimit[]
  abstract industryBenchmarks: IndustryBenchmark[]
  abstract calculators: DomainCalculator[]
  abstract validationRules: ValidationRule[]
  abstract simulationTemplates: SimulationTemplate[]
  abstract inputFormConfig?: DomainFormConfig

  validateValue(
    metric: string,
    value: number,
    context?: Record<string, any>
  ): { valid: boolean; violations: string[]; warnings: string[] } {
    const violations: string[] = []
    const warnings: string[] = []

    for (const rule of this.validationRules) {
      if (rule.id.startsWith(metric) || rule.id === metric) {
        const passes = rule.check(value, context)
        if (!passes) {
          if (rule.severity === 'error') {
            violations.push(rule.message)
          } else {
            warnings.push(rule.message)
          }
        }
      }
    }

    return {
      valid: violations.length === 0,
      violations,
      warnings,
    }
  }

  getCalculator(id: string): DomainCalculator | undefined {
    return this.calculators.find(c => c.id === id)
  }

  getPhysicalLimit(id: string): PhysicalLimit | undefined {
    return this.physicalLimits.find(l => l.id === id)
  }

  getBenchmark(id: string): IndustryBenchmark | undefined {
    return this.industryBenchmarks.find(b => b.id === id)
  }
}

// ============================================================================
// Constants
// ============================================================================

export const PHYSICAL_CONSTANTS = {
  // Speed of light
  c: 299792458, // m/s
  // Planck constant
  h: 6.62607015e-34, // J*s
  // Boltzmann constant
  k: 1.380649e-23, // J/K
  // Elementary charge
  e: 1.602176634e-19, // C
  // Stefan-Boltzmann constant
  sigma: 5.670374419e-8, // W/(m^2*K^4)
  // Solar constant
  G_sc: 1361, // W/m^2
  // Standard temperature
  T_STC: 298.15, // K (25C)
  // Standard pressure
  P_STC: 101325, // Pa
  // Faraday constant
  F: 96485.33212, // C/mol
  // Avogadro number
  N_A: 6.02214076e23, // 1/mol
  // Gas constant
  R: 8.314462618, // J/(mol*K)
  // Air density at STC
  rho_air: 1.225, // kg/m^3
  // Water density
  rho_water: 1000, // kg/m^3
}

export const THERMODYNAMIC_LIMITS = {
  // Maximum efficiency limits
  carnot: (T_hot: number, T_cold: number) => 1 - T_cold / T_hot,
  betz: 16 / 27, // ~0.593
  shockley_queisser: 0.337, // Single junction at 1.34 eV
  concentrated_solar: 0.86, // Ideal thermodynamic limit
  electrolysis_voltage: 1.23, // V (reversible at STC)
  thermoneutral_voltage: 1.48, // V (including heat of reaction)
  fuel_cell_theoretical: 0.83, // H2 fuel cell at STC
  battery_coulombic: 1.0, // Theoretical max
}
