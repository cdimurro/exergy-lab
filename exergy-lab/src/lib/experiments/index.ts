/**
 * Experiments Module
 *
 * 3-Tier experiment design system:
 * - Tier 1: Rapid Feasibility (<1 min)
 * - Tier 2: Standard Lab Protocol (5-30 min)
 * - Tier 3: Advanced Validation (30+ min)
 *
 * Stress Testing Framework:
 * - 25 diverse test prompts across 5 categories
 * - Parallel execution with configurable concurrency
 * - Full logging and bulk analysis
 */

// Tier 1: Rapid Feasibility
export {
  runTier1Feasibility,
  THERMODYNAMIC_LIMITS,
  checkThermodynamicLimits,
  screenSafetyHazards,
  searchLiteraturePrecedent,
  checkMaterialsProjectStability,
} from './tier1-feasibility'

// Tier Selection
export {
  selectExperimentTier,
  selectTiersForHypotheses,
  shouldEscalate,
  assessSafetyRisk,
  assessMaterialComplexity,
  type TierSelectionInput,
  type SafetyAssessment,
  type ComplexityAssessment,
  type SafetyRiskLevel,
  type MaterialComplexity,
  type EscalationContext,
} from './tier-selector'

// Re-export types for convenience
export type {
  ExperimentTier,
  ExperimentTierName,
  ExperimentTierCapabilities,
  Tier1FeasibilityResult,
  Tier2StandardProtocol,
  Tier3AdvancedProtocol,
  ExperimentTierResult,
  TierSelectionFactors,
  TierRecommendation,
  ThermodynamicCheck,
  SafetyFlag,
  LiteratureSupport,
} from '@/types/experiment-tiers'

// =============================================================================
// Stress Testing Framework
// =============================================================================

// Stress Test Runner
export {
  StressTestRunner,
  runQuickTest,
  runCategoryTest,
  runSpecificPrompts,
  runFullStressTest,
  type ExperimentProgress,
} from './stress-test-runner'

// Test Prompts
export {
  ALL_TEST_PROMPTS,
  PROMPTS_BY_CATEGORY,
  getPromptsByCategory,
  getPromptById,
  getPromptsByIds,
  getPromptsByDifficulty,
  getQuickTestSet,
  TEST_SUITE_INFO,
} from './test-prompts'

// Experiment Logger
export {
  ExperimentLogger,
  loadExperiment,
  listExperiments,
  loadExperimentIndex,
  deleteExperiment,
} from './experiment-logger'

// Experiment Analyzer
export {
  ExperimentAnalyzer,
  analyzeExperimentTrends,
  compareExperiments,
} from './experiment-analyzer'

// Re-export stress test types
export type {
  TestPrompt,
  PromptCategory,
  ExperimentConfig,
  ExperimentResult,
  DiscoveryTestResult,
  ExperimentSummary,
  PhaseTestResult,
  SSEEventLog,
  ErrorLogEntry,
  TestStatus,
  BulkAnalysis,
  CorrelationData,
  Issue,
  StoredExperiment,
  ExperimentIndex,
} from './types'
