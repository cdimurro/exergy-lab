/**
 * Debug Types for Admin Debug Viewer - v0.0.3
 *
 * TypeScript definitions for debug events, sessions, and errors
 * used by the Admin Debug Viewer for FrontierScience discovery debugging.
 *
 * Enhanced in v0.0.3:
 * - LLM call tracking with cost estimation
 * - Performance metrics and profiling
 * - Data source integration tracking
 * - SSE connection health monitoring
 * - UI state and performance tracking
 * - Quality validation logging
 * - Comprehensive export options
 */

import type { DiscoveryPhase } from './frontierscience'

// ============================================================================
// Debug Event Types
// ============================================================================

export type DebugEventType =
  | 'sse'
  | 'api_call'
  | 'phase_transition'
  | 'error'
  | 'thinking'
  | 'llm_call'
  | 'performance'
  | 'data_source'
  | 'ui_state'
  | 'quality_check'
  | 'alert'

export type DebugEventCategory =
  | 'progress'
  | 'iteration'
  | 'judge'
  | 'complete'
  | 'heartbeat'
  | 'error'
  | 'api_request'
  | 'api_response'
  | 'llm_request'
  | 'llm_response'
  | 'cache_hit'
  | 'cache_miss'
  | 'validation'
  | 'ui_render'
  | 'ui_interaction'
  | 'performance_snapshot'
  | 'alert_triggered'

export interface DebugEvent {
  id: string
  timestamp: number
  type: DebugEventType
  category: DebugEventCategory
  phase?: DiscoveryPhase
  data: unknown
  duration?: number
  metadata?: Record<string, unknown>
}

// ============================================================================
// API Call Logging
// ============================================================================

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface APICallLog {
  id: string
  timestamp: number
  method: HTTPMethod
  url: string
  requestPayload?: unknown
  responsePayload?: unknown
  statusCode?: number
  duration: number
  error?: string
  headers?: Record<string, string>
}

// ============================================================================
// Error Logging
// ============================================================================

export interface ErrorLog {
  id: string
  timestamp: number
  phase?: DiscoveryPhase
  message: string
  stack?: string
  context?: Record<string, unknown>
  recoverable?: boolean
  severity?: 'critical' | 'error' | 'warning' | 'info'
  errorCode?: string
  retryable?: boolean
  recoveryAttempted?: boolean
  recoverySuccessful?: boolean
}

// ============================================================================
// LLM Call Tracking (v0.0.3)
// ============================================================================

export type LLMProvider = 'google' | 'openai' | 'anthropic' | 'other'
export type LLMPurpose = 'research' | 'hypothesis' | 'validation' | 'synthesis' | 'critique' | 'refinement' | 'evaluation' | 'other'

export interface LLMCallLog {
  id: string
  timestamp: number
  model: string
  provider: LLMProvider
  purpose: LLMPurpose
  phase: DiscoveryPhase
  inputTokens: number
  outputTokens: number
  totalTokens: number
  costEstimateUSD: number
  latencyMs: number
  success: boolean
  errorMessage?: string
  retryCount: number
  fallbackUsed: boolean
  promptTemplateId?: string
  responseQuality?: 'high' | 'medium' | 'low'
  cacheHit: boolean
  streamingEnabled?: boolean
  finishReason?: 'stop' | 'length' | 'content_filter' | 'error'
}

// ============================================================================
// Performance Tracking (v0.0.3)
// ============================================================================

export interface PerformanceSnapshot {
  id: string
  timestamp: number
  phase: DiscoveryPhase
  heapUsedMB: number
  heapTotalMB: number
  cpuUsagePercent?: number
  activePromises: number
  pendingRequests: number
  sseConnectionState: 'connected' | 'reconnecting' | 'disconnected'
  eventQueueDepth: number
  renderTime?: number
}

export interface PerformanceMetrics {
  avgResponseTimeMs: number
  p50ResponseTimeMs: number
  p95ResponseTimeMs: number
  p99ResponseTimeMs: number
  maxResponseTimeMs: number
  minResponseTimeMs: number
  totalRequests: number
  successRate: number
  avgTokensPerRequest: number
  peakMemoryMB: number
  avgHeapUsageMB: number
  totalRenderTimeMs: number
  rerenderCount: number
}

// ============================================================================
// Data Source Tracking (v0.0.3)
// ============================================================================

export type DataSourceId =
  | 'semantic_scholar'
  | 'arxiv'
  | 'pubmed'
  | 'ieee'
  | 'nrel'
  | 'eia'
  | 'patents'
  | 'crossref'
  | 'news'
  | 'custom'
  | 'other'

export interface DataSourceLog {
  id: string
  timestamp: number
  sourceId: DataSourceId
  sourceName: string
  phase: DiscoveryPhase
  operation: 'search' | 'fetch' | 'embed' | 'parse'
  query?: string
  resultsCount: number
  relevantResultsCount: number
  latencyMs: number
  success: boolean
  cacheHit: boolean
  errorMessage?: string
  rateLimit?: {
    remaining: number
    resetAt: number
    limited: boolean
  }
  bytesTransferred?: number
}

export interface DataSourceMetrics {
  sourceId: DataSourceId
  totalCalls: number
  successfulCalls: number
  failedCalls: number
  cacheHits: number
  avgLatencyMs: number
  totalResultsReturned: number
  avgRelevanceScore: number
  rateLimitHits: number
}

// ============================================================================
// SSE Connection Health (v0.0.3)
// ============================================================================

export type SSEConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error'

export interface SSEHealthLog {
  id: string
  timestamp: number
  event: 'connect' | 'disconnect' | 'reconnect' | 'error' | 'heartbeat' | 'message'
  state: SSEConnectionState
  reconnectAttempt?: number
  latencyMs?: number
  errorMessage?: string
  eventsReceived?: number
  bytesSinceLastHeartbeat?: number
}

export interface SSEHealthMetrics {
  connectionUptime: number
  totalReconnects: number
  avgReconnectTimeMs: number
  messagesReceived: number
  heartbeatsReceived: number
  heartbeatsMissed: number
  avgLatencyMs: number
  lastHeartbeatAt: number
  currentState: SSEConnectionState
}

// ============================================================================
// UI State Tracking (v0.0.3)
// ============================================================================

export type UIStateTransitionType =
  | 'phase_change'
  | 'loading_start'
  | 'loading_end'
  | 'error_display'
  | 'error_dismiss'
  | 'result_display'
  | 'modal_open'
  | 'modal_close'
  | 'tab_switch'
  | 'scroll'
  | 'user_interaction'
  | 'render'
  | 'rerender'

export interface UIStateLog {
  id: string
  timestamp: number
  type: UIStateTransitionType
  component: string
  fromState?: string
  toState?: string
  renderTimeMs?: number
  triggeredBy?: 'user' | 'system' | 'sse' | 'api'
  metadata?: Record<string, unknown>
}

export interface UIPerformanceMetrics {
  totalRenderTimeMs: number
  avgRenderTimeMs: number
  rerenderCount: number
  componentRenderCounts: Record<string, number>
  slowestRenders: Array<{
    component: string
    renderTimeMs: number
    timestamp: number
  }>
  interactionCount: number
  avgInteractionLatencyMs: number
}

// ============================================================================
// Quality Validation Tracking (v0.0.3)
// ============================================================================

export type ValidationSource = 'frontierscience' | 'breakthrough' | 'custom'

export interface QualityValidationLog {
  id: string
  timestamp: number
  phase: DiscoveryPhase
  source: ValidationSource
  criteriaId: string
  criteriaName: string
  score: number
  maxScore: number
  passed: boolean
  feedback?: string
  confidence?: number
  evaluatorNotes?: string
}

export interface QualityMetrics {
  source: ValidationSource
  avgScore: number
  passRate: number
  criteriaScores: Record<string, {
    avgScore: number
    passRate: number
    evaluationCount: number
  }>
  totalEvaluations: number
  strongestCriteria: string
  weakestCriteria: string
}

// ============================================================================
// Cost Tracking (v0.0.3)
// ============================================================================

export interface CostBreakdown {
  totalUSD: number
  byPhase: Record<DiscoveryPhase, number>
  byModel: Record<string, number>
  byProvider: Record<LLMProvider, number>
  byPurpose: Record<LLMPurpose, number>
  inputTokensCost: number
  outputTokensCost: number
  estimatedMonthlyAtCurrentRate?: number
}

// ============================================================================
// Alert System (v0.0.3)
// ============================================================================

export type AlertSeverity = 'critical' | 'warning' | 'info'
export type AlertCategory = 'performance' | 'error' | 'cost' | 'quality' | 'connection' | 'timeout'

export interface DebugAlert {
  id: string
  timestamp: number
  severity: AlertSeverity
  category: AlertCategory
  message: string
  metric?: string
  threshold?: number
  actualValue?: number
  phase?: DiscoveryPhase
  acknowledged: boolean
  resolvedAt?: number
}

export interface AlertThresholds {
  maxLatencyMs: number
  maxCostPerSessionUSD: number
  maxErrorRate: number
  minSuccessRate: number
  maxReconnectAttempts: number
  heartbeatTimeoutMs: number
  maxRenderTimeMs: number
  minQualityScore: number
}

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  maxLatencyMs: 10000,
  maxCostPerSessionUSD: 5.0,
  maxErrorRate: 0.2,
  minSuccessRate: 0.8,
  maxReconnectAttempts: 5,
  heartbeatTimeoutMs: 30000,
  maxRenderTimeMs: 500,
  minQualityScore: 5.0,
}

// ============================================================================
// Debug Session (Enhanced v0.0.3)
// ============================================================================

export type DebugSessionStatus = 'idle' | 'running' | 'completed' | 'failed' | 'paused'

export interface DebugSession {
  sessionId: string
  discoveryId: string | null
  startTime: number
  endTime?: number
  status: DebugSessionStatus
  query?: string
  domain?: string
  mode?: 'discovery' | 'breakthrough' | 'validation' | 'synthesis'

  // Core event logs
  events: DebugEvent[]
  apiCalls: APICallLog[]
  errors: ErrorLog[]

  // Enhanced tracking (v0.0.3)
  llmCalls: LLMCallLog[]
  performanceSnapshots: PerformanceSnapshot[]
  dataSourceLogs: DataSourceLog[]
  sseHealthLogs: SSEHealthLog[]
  uiStateLogs: UIStateLog[]
  qualityValidations: QualityValidationLog[]
  alerts: DebugAlert[]

  // Computed metrics (populated on session end)
  performanceMetrics?: PerformanceMetrics
  dataSourceMetrics?: DataSourceMetrics[]
  sseHealthMetrics?: SSEHealthMetrics
  uiPerformanceMetrics?: UIPerformanceMetrics
  qualityMetrics?: QualityMetrics[]
  costBreakdown?: CostBreakdown

  // Final result
  finalResult?: unknown

  // Metadata
  metadata?: DebugSessionMetadata

  // System info
  systemInfo?: SystemInfo
}

export interface DebugSessionMetadata {
  userAgent?: string
  sessionStart?: string
  totalEvents?: number
  totalApiCalls?: number
  totalErrors?: number
  totalLLMCalls?: number
  totalTokens?: number
  totalCostUSD?: number
  avgLatencyMs?: number
  successRate?: number
  phaseDurations?: Record<DiscoveryPhase, number>
  iterationCounts?: Record<DiscoveryPhase, number>
  exportedAt?: string
  version?: string
}

export interface SystemInfo {
  platform?: string
  userAgent?: string
  screenWidth?: number
  screenHeight?: number
  devicePixelRatio?: number
  timezone?: string
  language?: string
  connectionType?: string
  effectiveType?: string
  downlink?: number
}

// ============================================================================
// Export Options (Enhanced v0.0.3)
// ============================================================================

export type ExportFormat = 'markdown' | 'json' | 'text' | 'detailed_json' | 'analysis' | 'csv'

export interface ExportOptions {
  format: ExportFormat
  includeEvents: boolean
  includeApiCalls: boolean
  includeErrors: boolean
  includeRawData: boolean
  maxEvents?: number
  filterByPhase?: DiscoveryPhase[]
  filterByCategory?: DebugEventCategory[]

  // Enhanced options (v0.0.3)
  includeLLMCalls?: boolean
  includePerformanceSnapshots?: boolean
  includeDataSourceLogs?: boolean
  includeSSEHealth?: boolean
  includeUIState?: boolean
  includeQualityValidations?: boolean
  includeAlerts?: boolean
  includeComputedMetrics?: boolean
  includeCostBreakdown?: boolean
  includeSystemInfo?: boolean

  // Filtering
  filterByProvider?: LLMProvider[]
  filterByPurpose?: LLMPurpose[]
  filterByDataSource?: DataSourceId[]
  filterBySeverity?: AlertSeverity[]

  // Time range
  startTime?: number
  endTime?: number

  // Aggregation
  aggregateByPhase?: boolean
  aggregateByModel?: boolean

  // Limits
  maxLLMCalls?: number
  maxPerformanceSnapshots?: number
  maxDataSourceLogs?: number
  maxUIStateLogs?: number

  // Formatting
  prettyPrint?: boolean
  includeTimestamps?: boolean
  relativeTimes?: boolean
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'markdown',
  includeEvents: true,
  includeApiCalls: true,
  includeErrors: true,
  includeRawData: false,
  includeLLMCalls: true,
  includePerformanceSnapshots: false,
  includeDataSourceLogs: true,
  includeSSEHealth: true,
  includeUIState: false,
  includeQualityValidations: true,
  includeAlerts: true,
  includeComputedMetrics: true,
  includeCostBreakdown: true,
  includeSystemInfo: false,
  prettyPrint: true,
  includeTimestamps: true,
  relativeTimes: false,
  maxEvents: 100,
  maxLLMCalls: 50,
  maxPerformanceSnapshots: 20,
  maxDataSourceLogs: 50,
  maxUIStateLogs: 50,
}

// Export presets for common use cases
export const EXPORT_PRESETS: Record<string, Partial<ExportOptions>> = {
  performance: {
    format: 'analysis',
    includeEvents: false,
    includeApiCalls: true,
    includeErrors: true,
    includeLLMCalls: true,
    includePerformanceSnapshots: true,
    includeDataSourceLogs: true,
    includeSSEHealth: true,
    includeUIState: true,
    includeComputedMetrics: true,
    includeCostBreakdown: true,
  },
  quality: {
    format: 'analysis',
    includeEvents: true,
    includeQualityValidations: true,
    includeComputedMetrics: true,
    aggregateByPhase: true,
  },
  cost: {
    format: 'analysis',
    includeLLMCalls: true,
    includeCostBreakdown: true,
    aggregateByModel: true,
    aggregateByPhase: true,
  },
  ui: {
    format: 'analysis',
    includeUIState: true,
    includePerformanceSnapshots: true,
    includeSSEHealth: true,
    includeComputedMetrics: true,
  },
  full: {
    format: 'detailed_json',
    includeEvents: true,
    includeApiCalls: true,
    includeErrors: true,
    includeRawData: true,
    includeLLMCalls: true,
    includePerformanceSnapshots: true,
    includeDataSourceLogs: true,
    includeSSEHealth: true,
    includeUIState: true,
    includeQualityValidations: true,
    includeAlerts: true,
    includeComputedMetrics: true,
    includeCostBreakdown: true,
    includeSystemInfo: true,
  },
  minimal: {
    format: 'text',
    includeEvents: false,
    includeApiCalls: false,
    includeErrors: true,
    includeRawData: false,
    includeLLMCalls: false,
    includeAlerts: true,
    includeComputedMetrics: true,
  },
}

// ============================================================================
// Debug Viewer State (Enhanced v0.0.3)
// ============================================================================

export type DebugTabId =
  | 'events'
  | 'phases'
  | 'errors'
  | 'api'
  | 'raw'
  | 'llm'
  | 'performance'
  | 'data_sources'
  | 'sse'
  | 'ui'
  | 'quality'
  | 'cost'
  | 'alerts'

export interface DebugViewerState {
  isOpen: boolean
  activeTab: DebugTabId
  session: DebugSession | null
  autoScroll: boolean
  showAlerts: boolean
  alertsMinimized: boolean
  compactMode: boolean
  darkMode: boolean
  filters: {
    eventTypes: DebugEventType[]
    categories: DebugEventCategory[]
    phases: DiscoveryPhase[]
    searchTerm: string
    providers?: LLMProvider[]
    purposes?: LLMPurpose[]
    dataSources?: DataSourceId[]
    severities?: AlertSeverity[]
    timeRange?: {
      start: number
      end: number
    }
    onlyErrors?: boolean
    onlySlowRequests?: boolean
    slowThresholdMs?: number
  }
  viewOptions: {
    showTimestamps: boolean
    relativeTimes: boolean
    groupByPhase: boolean
    expandedSections: string[]
    chartType?: 'line' | 'bar' | 'area' | 'radar'
  }
}

// ============================================================================
// Event Colors for UI
// ============================================================================

export const DEBUG_EVENT_COLORS: Record<DebugEventCategory, {
  bg: string
  text: string
  border: string
}> = {
  progress: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600',
    border: 'border-blue-400',
  },
  iteration: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600',
    border: 'border-purple-400',
  },
  judge: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600',
    border: 'border-amber-400',
  },
  complete: {
    bg: 'bg-green-500/10',
    text: 'text-green-600',
    border: 'border-green-400',
  },
  heartbeat: {
    bg: 'bg-gray-500/10',
    text: 'text-gray-600',
    border: 'border-gray-400',
  },
  error: {
    bg: 'bg-red-500/10',
    text: 'text-red-600',
    border: 'border-red-400',
  },
  api_request: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-600',
    border: 'border-cyan-400',
  },
  api_response: {
    bg: 'bg-teal-500/10',
    text: 'text-teal-600',
    border: 'border-teal-400',
  },
  // New categories (v0.0.3)
  llm_request: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-600',
    border: 'border-indigo-400',
  },
  llm_response: {
    bg: 'bg-violet-500/10',
    text: 'text-violet-600',
    border: 'border-violet-400',
  },
  cache_hit: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600',
    border: 'border-emerald-400',
  },
  cache_miss: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-600',
    border: 'border-orange-400',
  },
  validation: {
    bg: 'bg-lime-500/10',
    text: 'text-lime-600',
    border: 'border-lime-400',
  },
  ui_render: {
    bg: 'bg-pink-500/10',
    text: 'text-pink-600',
    border: 'border-pink-400',
  },
  ui_interaction: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-600',
    border: 'border-rose-400',
  },
  performance_snapshot: {
    bg: 'bg-sky-500/10',
    text: 'text-sky-600',
    border: 'border-sky-400',
  },
  alert_triggered: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-600',
    border: 'border-yellow-400',
  },
}

// ============================================================================
// Debug Configuration
// ============================================================================

export interface DebugConfig {
  maxEvents: number
  maxApiCalls: number
  maxErrors: number
  maxSessionSizeMB: number
  autoClearOnComplete: boolean
  persistToLocalStorage: boolean
  enableKeyboardShortcuts: boolean
  debounceMs: number
}

export const DEFAULT_DEBUG_CONFIG: DebugConfig = {
  maxEvents: 1000,
  maxApiCalls: 100,
  maxErrors: 100,
  maxSessionSizeMB: 10,
  autoClearOnComplete: false,
  persistToLocalStorage: true,
  enableKeyboardShortcuts: true,
  debounceMs: 100,
}

// ============================================================================
// Utility Types (Enhanced v0.0.3)
// ============================================================================

export interface DebugStats {
  totalEvents: number
  eventsByCategory: Record<DebugEventCategory, number>
  totalApiCalls: number
  totalErrors: number
  averageApiDuration: number
  elapsedTime: number
  eventsPerSecond: number

  // Enhanced stats (v0.0.3)
  totalLLMCalls: number
  totalTokens: number
  inputTokens: number
  outputTokens: number
  totalCostUSD: number
  avgLLMLatencyMs: number
  llmSuccessRate: number
  cacheHitRate: number

  totalDataSourceCalls: number
  dataSourceSuccessRate: number
  avgDataSourceLatencyMs: number

  totalUIEvents: number
  totalRerenders: number
  avgRenderTimeMs: number

  totalValidations: number
  validationPassRate: number
  avgValidationScore: number

  sseReconnects: number
  sseCurrentState: SSEConnectionState
  sseUptime: number

  totalAlerts: number
  alertsBySeverity: Record<AlertSeverity, number>
  unresolvedAlerts: number
}

export interface TimelineEntry {
  timestamp: number
  type: 'event' | 'api' | 'error' | 'phase_change' | 'llm' | 'data_source' | 'validation' | 'alert'
  phase?: DiscoveryPhase
  label: string
  details?: string
  score?: number
  passed?: boolean
  latencyMs?: number
  costUSD?: number
  severity?: AlertSeverity
  model?: string
  tokens?: number
}

// ============================================================================
// Debug Context for React (Enhanced v0.0.3)
// ============================================================================

export interface DebugContextValue {
  session: DebugSession | null
  config: DebugConfig
  isEnabled: boolean
  isOpen: boolean
  stats: DebugStats
  activeAlerts: DebugAlert[]
  alertThresholds: AlertThresholds

  // Session actions
  startSession: (discoveryId: string, query?: string, options?: {
    domain?: string
    mode?: 'discovery' | 'breakthrough' | 'validation' | 'synthesis'
  }) => void
  endSession: () => void
  pauseSession: () => void
  resumeSession: () => void
  clearSession: () => void

  // Core logging actions
  addEvent: (event: Omit<DebugEvent, 'id'>) => void
  addApiCall: (apiCall: Omit<APICallLog, 'id'>) => void
  addError: (error: Omit<ErrorLog, 'id'>) => void
  captureSSEEvent: (eventType: string, data: unknown, phase?: string) => void

  // Enhanced logging actions (v0.0.3)
  addLLMCall: (call: Omit<LLMCallLog, 'id' | 'timestamp'>) => void
  addPerformanceSnapshot: (snapshot: Omit<PerformanceSnapshot, 'id' | 'timestamp'>) => void
  addDataSourceLog: (log: Omit<DataSourceLog, 'id' | 'timestamp'>) => void
  addSSEHealthLog: (log: Omit<SSEHealthLog, 'id' | 'timestamp'>) => void
  addUIStateLog: (log: Omit<UIStateLog, 'id' | 'timestamp'>) => void
  addQualityValidation: (validation: Omit<QualityValidationLog, 'id' | 'timestamp'>) => void
  addAlert: (alert: Omit<DebugAlert, 'id' | 'timestamp' | 'acknowledged'>) => void
  acknowledgeAlert: (alertId: string) => void
  resolveAlert: (alertId: string) => void

  // Metrics computation
  computeStats: () => DebugStats
  computeCostBreakdown: () => CostBreakdown
  computePerformanceMetrics: () => PerformanceMetrics
  computeQualityMetrics: () => QualityMetrics[]

  // Export actions
  exportSession: (options?: Partial<ExportOptions>) => string
  exportWithPreset: (preset: keyof typeof EXPORT_PRESETS) => string
  copyToClipboard: (options?: Partial<ExportOptions>) => Promise<boolean>
  downloadSession: (filename?: string, options?: Partial<ExportOptions>) => void

  // View actions
  toggleOpen: () => void
  setEnabled: (enabled: boolean) => void
  setOpen: (open: boolean) => void
  setActiveTab: (tab: DebugTabId) => void
  setFilters: (filters: Partial<DebugViewerState['filters']>) => void
  setViewOptions: (options: Partial<DebugViewerState['viewOptions']>) => void
  setAlertThresholds: (thresholds: Partial<AlertThresholds>) => void
}

// ============================================================================
// Computed Metrics Helpers
// ============================================================================

export interface ComputedSessionMetrics {
  duration: number
  eventsPerSecond: number
  llmCallsPerPhase: Record<DiscoveryPhase, number>
  costPerPhase: Record<DiscoveryPhase, number>
  avgLatencyPerPhase: Record<DiscoveryPhase, number>
  topErrorMessages: Array<{ message: string; count: number }>
  slowestLLMCalls: LLMCallLog[]
  slowestDataSources: DataSourceLog[]
  qualityTrend: Array<{ timestamp: number; score: number; phase: DiscoveryPhase }>
  phaseDurations: Record<DiscoveryPhase, number>
  tokenUsageByModel: Record<string, { input: number; output: number; cost: number }>
}
