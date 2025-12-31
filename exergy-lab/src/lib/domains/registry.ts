/**
 * Domain Registry (v0.0.5)
 *
 * Central registry for all domain modules. Provides utilities for
 * accessing domain-specific calculators, limits, and validation rules.
 *
 * @see lib/domains/base.ts - Base interfaces
 */

import type {
  DomainModule,
  DomainId,
  DomainCalculator,
  PhysicalLimit,
  IndustryBenchmark,
  ValidationRule,
  SimulationTemplate,
  CalculatorResult,
} from './base'

import { SolarDomain as SolarDomainModule } from './solar'
import { WindDomain as WindDomainModule } from './wind'
import { BatteryDomain as BatteryDomainModule } from './battery'
import { HydrogenDomainModule } from './hydrogen'

// ============================================================================
// Registry Implementation
// ============================================================================

/**
 * Map of all registered domain modules
 */
const DOMAIN_MODULES: Map<DomainId, DomainModule> = new Map([
  ['solar', SolarDomainModule],
  ['wind', WindDomainModule],
  ['battery', BatteryDomainModule],
  ['hydrogen', HydrogenDomainModule],
])

/**
 * Domain Registry class for centralized domain module access
 */
export class DomainRegistry {
  private static instance: DomainRegistry | null = null
  private modules: Map<DomainId, DomainModule>

  private constructor() {
    this.modules = new Map(DOMAIN_MODULES)
  }

  /**
   * Get singleton instance
   */
  static getInstance(): DomainRegistry {
    if (!DomainRegistry.instance) {
      DomainRegistry.instance = new DomainRegistry()
    }
    return DomainRegistry.instance
  }

  /**
   * Get all registered domain IDs
   */
  getDomainIds(): DomainId[] {
    return Array.from(this.modules.keys())
  }

  /**
   * Get all registered domain modules
   */
  getAllModules(): DomainModule[] {
    return Array.from(this.modules.values())
  }

  /**
   * Get a specific domain module by ID
   */
  getModule(domainId: DomainId): DomainModule | undefined {
    return this.modules.get(domainId)
  }

  /**
   * Check if a domain is registered
   */
  hasDomain(domainId: DomainId): boolean {
    return this.modules.has(domainId)
  }

  /**
   * Register a new domain module (for extensions)
   */
  registerModule(module: DomainModule): void {
    this.modules.set(module.id, module)
  }

  /**
   * Get all physical limits across all domains
   */
  getAllPhysicalLimits(): Array<PhysicalLimit & { domain: DomainId }> {
    const limits: Array<PhysicalLimit & { domain: DomainId }> = []
    for (const [domainId, module] of this.modules) {
      for (const limit of module.physicalLimits) {
        limits.push({ ...limit, domain: domainId })
      }
    }
    return limits
  }

  /**
   * Get physical limits for a specific domain
   */
  getPhysicalLimits(domainId: DomainId): PhysicalLimit[] {
    const module = this.modules.get(domainId)
    return module?.physicalLimits ?? []
  }

  /**
   * Get a specific physical limit by ID
   */
  getPhysicalLimit(limitId: string): (PhysicalLimit & { domain: DomainId }) | undefined {
    for (const [domainId, module] of this.modules) {
      const limit = module.physicalLimits.find((l) => l.id === limitId)
      if (limit) {
        return { ...limit, domain: domainId }
      }
    }
    return undefined
  }

  /**
   * Get all industry benchmarks across all domains
   */
  getAllBenchmarks(): Array<IndustryBenchmark & { domain: DomainId }> {
    const benchmarks: Array<IndustryBenchmark & { domain: DomainId }> = []
    for (const [domainId, module] of this.modules) {
      for (const benchmark of module.industryBenchmarks) {
        benchmarks.push({ ...benchmark, domain: domainId })
      }
    }
    return benchmarks
  }

  /**
   * Get industry benchmarks for a specific domain
   */
  getBenchmarks(domainId: DomainId): IndustryBenchmark[] {
    const module = this.modules.get(domainId)
    return module?.industryBenchmarks ?? []
  }

  /**
   * Get benchmarks by category within a domain
   */
  getBenchmarksByCategory(
    domainId: DomainId,
    category: string
  ): IndustryBenchmark[] {
    const module = this.modules.get(domainId)
    return (
      module?.industryBenchmarks.filter((b) => b.category === category) ?? []
    )
  }

  /**
   * Get all calculators across all domains
   */
  getAllCalculators(): Array<DomainCalculator & { domain: DomainId }> {
    const calculators: Array<DomainCalculator & { domain: DomainId }> = []
    for (const [domainId, module] of this.modules) {
      for (const calculator of module.calculators) {
        calculators.push({ ...calculator, domain: domainId })
      }
    }
    return calculators
  }

  /**
   * Get calculators for a specific domain
   */
  getCalculators(domainId: DomainId): DomainCalculator[] {
    const module = this.modules.get(domainId)
    return module?.calculators ?? []
  }

  /**
   * Get a specific calculator by ID
   */
  getCalculator(
    calculatorId: string
  ): (DomainCalculator & { domain: DomainId }) | undefined {
    for (const [domainId, module] of this.modules) {
      const calculator = module.calculators.find((c) => c.id === calculatorId)
      if (calculator) {
        return { ...calculator, domain: domainId }
      }
    }
    return undefined
  }

  /**
   * Run a calculator with given inputs
   */
  runCalculator(
    calculatorId: string,
    inputs: Record<string, number | string>
  ): CalculatorResult | undefined {
    const calculator = this.getCalculator(calculatorId)
    if (!calculator) {
      return undefined
    }
    return calculator.calculate(inputs as Record<string, number>)
  }

  /**
   * Get all validation rules across all domains
   */
  getAllValidationRules(): Array<ValidationRule & { domain: DomainId }> {
    const rules: Array<ValidationRule & { domain: DomainId }> = []
    for (const [domainId, module] of this.modules) {
      for (const rule of module.validationRules) {
        rules.push({ ...rule, domain: domainId })
      }
    }
    return rules
  }

  /**
   * Get validation rules for a specific domain
   */
  getValidationRules(domainId: DomainId): ValidationRule[] {
    const module = this.modules.get(domainId)
    return module?.validationRules ?? []
  }

  /**
   * Validate inputs against domain rules
   */
  validateInputs(
    domainId: DomainId,
    inputs: Record<string, number | string>
  ): Array<{ rule: ValidationRule; passed: boolean }> {
    const rules = this.getValidationRules(domainId)
    return rules.map((rule) => {
      // Extract the numeric value that matches this rule's id prefix
      const rulePrefix = rule.id.split('_')[0]
      const inputKey = Object.keys(inputs).find(k => k.toLowerCase().includes(rulePrefix.toLowerCase()))
      const value = inputKey ? Number(inputs[inputKey]) : 0
      return {
        rule,
        passed: rule.check(value, inputs as Record<string, number>),
      }
    })
  }

  /**
   * Get all simulation templates across all domains
   */
  getAllSimulationTemplates(): Array<SimulationTemplate & { domain: DomainId }> {
    const templates: Array<SimulationTemplate & { domain: DomainId }> = []
    for (const [domainId, module] of this.modules) {
      for (const template of module.simulationTemplates) {
        templates.push({ ...template, domain: domainId })
      }
    }
    return templates
  }

  /**
   * Get simulation templates for a specific domain
   */
  getSimulationTemplates(domainId: DomainId): SimulationTemplate[] {
    const module = this.modules.get(domainId)
    return module?.simulationTemplates ?? []
  }

  /**
   * Get a specific simulation template by ID
   */
  getSimulationTemplate(
    templateId: string
  ): (SimulationTemplate & { domain: DomainId }) | undefined {
    for (const [domainId, module] of this.modules) {
      const template = module.simulationTemplates.find((t) => t.id === templateId)
      if (template) {
        return { ...template, domain: domainId }
      }
    }
    return undefined
  }

  /**
   * Search across all domains for matching resources
   */
  search(query: string): DomainSearchResult {
    const lowerQuery = query.toLowerCase()
    const results: DomainSearchResult = {
      limits: [],
      benchmarks: [],
      calculators: [],
      templates: [],
    }

    for (const [domainId, module] of this.modules) {
      // Search limits
      for (const limit of module.physicalLimits) {
        if (
          limit.name.toLowerCase().includes(lowerQuery) ||
          limit.description.toLowerCase().includes(lowerQuery)
        ) {
          results.limits.push({ ...limit, domain: domainId })
        }
      }

      // Search benchmarks
      for (const benchmark of module.industryBenchmarks) {
        if (
          benchmark.name.toLowerCase().includes(lowerQuery) ||
          benchmark.source.toLowerCase().includes(lowerQuery)
        ) {
          results.benchmarks.push({ ...benchmark, domain: domainId })
        }
      }

      // Search calculators
      for (const calculator of module.calculators) {
        if (
          calculator.name.toLowerCase().includes(lowerQuery) ||
          calculator.description.toLowerCase().includes(lowerQuery)
        ) {
          results.calculators.push({ ...calculator, domain: domainId })
        }
      }

      // Search templates
      for (const template of module.simulationTemplates) {
        if (
          template.name.toLowerCase().includes(lowerQuery) ||
          template.description.toLowerCase().includes(lowerQuery)
        ) {
          results.templates.push({ ...template, domain: domainId })
        }
      }
    }

    return results
  }

  /**
   * Get domain statistics
   */
  getStatistics(): DomainStatistics {
    const stats: DomainStatistics = {
      totalDomains: this.modules.size,
      totalLimits: 0,
      totalBenchmarks: 0,
      totalCalculators: 0,
      totalTemplates: 0,
      totalValidationRules: 0,
      byDomain: {},
    }

    for (const [domainId, module] of this.modules) {
      stats.totalLimits += module.physicalLimits.length
      stats.totalBenchmarks += module.industryBenchmarks.length
      stats.totalCalculators += module.calculators.length
      stats.totalTemplates += module.simulationTemplates.length
      stats.totalValidationRules += module.validationRules.length

      stats.byDomain[domainId] = {
        limits: module.physicalLimits.length,
        benchmarks: module.industryBenchmarks.length,
        calculators: module.calculators.length,
        templates: module.simulationTemplates.length,
        validationRules: module.validationRules.length,
      }
    }

    return stats
  }
}

// ============================================================================
// Types
// ============================================================================

export interface DomainSearchResult {
  limits: Array<PhysicalLimit & { domain: DomainId }>
  benchmarks: Array<IndustryBenchmark & { domain: DomainId }>
  calculators: Array<DomainCalculator & { domain: DomainId }>
  templates: Array<SimulationTemplate & { domain: DomainId }>
}

export interface DomainStatistics {
  totalDomains: number
  totalLimits: number
  totalBenchmarks: number
  totalCalculators: number
  totalTemplates: number
  totalValidationRules: number
  byDomain: Record<
    string,
    {
      limits: number
      benchmarks: number
      calculators: number
      templates: number
      validationRules: number
    }
  >
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the domain registry singleton instance
 */
export function getDomainRegistry(): DomainRegistry {
  return DomainRegistry.getInstance()
}

/**
 * Quick access to run a calculator
 */
export function runDomainCalculator(
  calculatorId: string,
  inputs: Record<string, number | string>
): CalculatorResult | undefined {
  return getDomainRegistry().runCalculator(calculatorId, inputs)
}

/**
 * Quick access to get physical limit
 */
export function getPhysicalLimit(
  limitId: string
): (PhysicalLimit & { domain: DomainId }) | undefined {
  return getDomainRegistry().getPhysicalLimit(limitId)
}

/**
 * Quick access to validate domain inputs
 */
export function validateDomainInputs(
  domainId: DomainId,
  inputs: Record<string, number | string>
): Array<{ rule: ValidationRule; passed: boolean }> {
  return getDomainRegistry().validateInputs(domainId, inputs)
}

/**
 * Check if a value exceeds a physical limit
 */
export function checkPhysicalLimit(
  limitId: string,
  value: number
): { exceeded: boolean; limit: PhysicalLimit | undefined; margin: number } {
  const limit = getPhysicalLimit(limitId)
  if (!limit) {
    return { exceeded: false, limit: undefined, margin: 0 }
  }
  return {
    exceeded: value > limit.value,
    limit,
    margin: limit.value - value,
  }
}

/**
 * Get all benchmarks for a specific year
 */
export function getBenchmarksByYear(year: number): Array<IndustryBenchmark & { domain: DomainId }> {
  return getDomainRegistry()
    .getAllBenchmarks()
    .filter((b) => b.year === year)
}

/**
 * Compare a value to industry benchmarks
 */
export function compareToBenchmarks(
  domainId: DomainId,
  category: string,
  value: number
): Array<{
  benchmark: IndustryBenchmark
  difference: number
  percentOfBenchmark: number
}> {
  const benchmarks = getDomainRegistry().getBenchmarksByCategory(domainId, category)
  return benchmarks.map((benchmark) => ({
    benchmark,
    difference: value - benchmark.value,
    percentOfBenchmark: (value / benchmark.value) * 100,
  }))
}

// ============================================================================
// Exports
// ============================================================================

export {
  SolarDomainModule,
  WindDomainModule,
  BatteryDomainModule,
  HydrogenDomainModule,
}

export default DomainRegistry
