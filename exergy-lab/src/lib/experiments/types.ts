/**
 * Experiment Types
 *
 * Type definitions for the Discovery Engine stress testing framework.
 */

import type { DiscoveryPhase, DiscoveryQuality } from '@/types/frontierscience'

// =============================================================================
// Test Prompt Types
// =============================================================================

export type PromptCategory = 'basic' | 'standard' | 'technical' | 'edge' | 'domain'

export interface TestPrompt {
  id: string                      // e.g., "A1", "B3", "C2"
  category: PromptCategory
  query: string
  expectedDomain?: string
  expectedChallenges: string[]    // What issues might arise
  difficultyLevel: 1 | 2 | 3 | 4 | 5
  description: string             // Human-readable description
}

// =============================================================================
// Experiment Configuration
// =============================================================================

export interface ExperimentConfig {
  name?: string
  prompts: TestPrompt[]
  concurrency: number             // Run N discoveries in parallel (1-3)
  timeoutPerDiscovery: number     // Max time per discovery (ms)
  captureFullLogs: boolean
  stopOnCriticalFailure: boolean
  categories?: PromptCategory[]   // Filter to specific categories
  promptIds?: string[]            // Run specific prompts by ID
}

export const DEFAULT_EXPERIMENT_CONFIG: Partial<ExperimentConfig> = {
  concurrency: 2,
  timeoutPerDiscovery: 5 * 60 * 1000, // 5 minutes
  captureFullLogs: true,
  stopOnCriticalFailure: false,
}

// =============================================================================
// Discovery Test Result
// =============================================================================

export type TestStatus = 'success' | 'partial' | 'failed' | 'timeout' | 'error'

export interface PhaseTestResult {
  phase: DiscoveryPhase
  status: 'passed' | 'failed' | 'skipped' | 'timeout'
  score?: number
  duration: number
  error?: string
  iterations?: number
}

export interface SSEEventLog {
  timestamp: number
  type: string
  phase?: string
  message?: string
  data: Record<string, any>
}

export interface ErrorLogEntry {
  timestamp: number
  message: string
  stack?: string
  phase?: string
  context?: Record<string, any>
}

export interface DiscoveryTestResult {
  promptId: string
  prompt: TestPrompt
  discoveryId: string
  status: TestStatus
  startTime: number
  endTime: number
  duration: number
  phases: PhaseTestResult[]
  errors: ErrorLogEntry[]
  sseEvents: SSEEventLog[]
  finalScore?: number
  qualityTier?: DiscoveryQuality
  failureMode?: 'none' | 'partial' | 'critical'
  recoveryRecommendations?: string[]
  rawResult?: any
}

// =============================================================================
// Experiment Result & Summary
// =============================================================================

export interface ExperimentSummary {
  totalPrompts: number
  completed: number
  success: number
  partial: number
  failed: number
  timeout: number
  error: number

  successRate: number
  partialSuccessRate: number
  failureRate: number
  timeoutRate: number

  avgDuration: number
  minDuration: number
  maxDuration: number
  totalDuration: number

  avgScore: number

  phaseStats: Record<string, {
    runs: number
    passed: number
    failed: number
    passRate: number
    avgScore: number
    avgDuration: number
  }>

  errorsByType: Record<string, {
    count: number
    affectedPrompts: string[]
  }>

  categoryStats: Record<PromptCategory, {
    total: number
    success: number
    successRate: number
    avgScore: number
  }>
}

export interface ExperimentResult {
  experimentId: string
  name: string
  config: ExperimentConfig
  startTime: number
  endTime: number
  totalDuration: number
  status: 'running' | 'completed' | 'aborted'
  progress: {
    completed: number
    total: number
    currentPrompt?: string
  }
  results: DiscoveryTestResult[]
  summary?: ExperimentSummary
}

// =============================================================================
// Bulk Analysis Types
// =============================================================================

export interface CorrelationData {
  correlation: number   // -1 to 1
  sampleSize: number
  significant: boolean
}

export interface Issue {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  description: string
  affectedPrompts: string[]
  occurrences: number
  suggestedFix?: string
}

export interface BulkAnalysis {
  experimentId: string
  analyzedAt: number

  // Overall Statistics
  totalRuns: number
  successRate: number
  partialSuccessRate: number
  failureRate: number
  timeoutRate: number
  avgDuration: number

  // Phase-Level Analysis
  phaseAnalysis: Record<string, {
    passRate: number
    avgScore: number
    avgDuration: number
    commonFailures: string[]
    bottleneck: boolean
  }>

  // Error Categorization
  errorCategories: {
    apiTimeout: { count: number; prompts: string[] }
    validationFailure: { count: number; prompts: string[] }
    lowScore: { count: number; prompts: string[] }
    networkError: { count: number; prompts: string[] }
    parseError: { count: number; prompts: string[] }
    unknown: { count: number; prompts: string[] }
  }

  // Pattern Detection
  patterns: {
    queryLengthVsSuccess: CorrelationData
    difficultyVsTimeout: CorrelationData
    categoryPerformance: Record<PromptCategory, number>
  }

  // Prioritized Issues
  issues: Issue[]

  // AI-Ready Export
  aiAnalysisPrompt: string
}

// =============================================================================
// Storage Types
// =============================================================================

export interface StoredExperiment {
  id: string
  name: string
  startedAt: number
  completedAt?: number
  config: ExperimentConfig
  resultFile: string  // Path to results JSON
  summaryFile?: string
  notes?: string
}

export interface ExperimentIndex {
  experiments: StoredExperiment[]
  lastUpdated: number
}
