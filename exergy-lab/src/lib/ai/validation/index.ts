/**
 * Multi-Benchmark Validation Module
 *
 * Exports all validation components for the 5-tier benchmark system:
 * - FrontierScience (rubric-based)
 * - Domain-specific (physics/chemistry/engineering)
 * - Practicality (real-world feasibility)
 * - Literature (published research consistency)
 * - Simulation Convergence (numerical validation)
 */

// Types
export type {
  BenchmarkType,
  BenchmarkCategory,
  BenchmarkResult,
  BenchmarkItemResult,
  BenchmarkMetadata,
  AggregatedValidation,
  AgreementLevel,
  Discrepancy,
  ConfidenceBreakdown,
  ValidationRecommendation,
  MultiBenchmarkConfig,
  PhysicalLimit,
  DomainBenchmarks,
  ThermodynamicViolation,
  TechnologyReadinessLevel,
  ScalabilityFactors,
  CriticalMaterial,
  LiteratureSource,
  SourceRecency,
  ConvergenceThresholds,
  SimulationResiduals,
  ConvergenceResult,
} from './types'

// Constants
export {
  DEFAULT_BENCHMARK_WEIGHTS,
  DEFAULT_MULTI_BENCHMARK_CONFIG,
  CRITICAL_MATERIALS,
  calculateAgreementLevel,
  findDiscrepancies,
  categorizeItem,
} from './types'

// Domain-specific benchmark
export {
  DomainBenchmarkValidator,
  DOMAIN_BENCHMARKS,
} from './domain-benchmark'
export type { DomainBenchmarkConfig } from './domain-benchmark'

// Practicality benchmark
export {
  PracticalityBenchmarkValidator,
} from './practicality-benchmark'
export type { PracticalityConfig } from './practicality-benchmark'

// Literature benchmark
export {
  LiteratureBenchmarkValidator,
  literatureBenchmarkValidator,
  SOURCE_QUALITY_TIERS,
  DEFAULT_LITERATURE_CONFIG,
} from './literature-benchmark'
export type { LiteratureBenchmarkConfig } from './literature-benchmark'

// Convergence benchmark
export {
  ConvergenceBenchmarkValidator,
  convergenceBenchmarkValidator,
  DEFAULT_CONVERGENCE_CONFIG,
} from './convergence-benchmark'
export type { ConvergenceBenchmarkConfig } from './convergence-benchmark'

// Multi-benchmark orchestrator
export {
  MultiBenchmarkValidator,
  multiBenchmarkValidator,
  createMultiBenchmarkValidator,
  validateDiscovery,
  validateWithBenchmarks,
  formatValidationReport,
} from './multi-benchmark-validator'
export type { ValidationContext } from './multi-benchmark-validator'
