/**
 * Debug Formatter - v0.0.3
 *
 * Formats debug sessions for export in various formats (Markdown, JSON, Text, Analysis, CSV).
 * Designed for easy copy/paste into Claude or other AI assistants for troubleshooting.
 *
 * Enhanced in v0.0.3:
 * - LLM usage analysis with cost breakdown
 * - Performance metrics and profiling
 * - Data source integration analysis
 * - SSE connection health analysis
 * - UI performance analysis
 * - Quality validation summary
 * - Alert analysis
 * - Comprehensive analysis format for deep debugging
 */

import type {
  DebugSession,
  DebugEvent,
  APICallLog,
  ErrorLog,
  ExportOptions,
  TimelineEntry,
  LLMCallLog,
  DataSourceLog,
  SSEHealthLog,
  UIStateLog,
  QualityValidationLog,
  DebugAlert,
  PerformanceMetrics,
  CostBreakdown,
  QualityMetrics,
  LLMProvider,
  DataSourceId,
} from '@/types/debug'
import { getPhaseMetadata, type DiscoveryPhase } from '@/types/frontierscience'

// ============================================================================
// Main Export Function
// ============================================================================

export function formatDebugSession(
  session: DebugSession,
  options: ExportOptions
): string {
  switch (options.format) {
    case 'markdown':
      return formatAsMarkdown(session, options)
    case 'json':
      return formatAsJSON(session, options)
    case 'text':
      return formatAsText(session, options)
    case 'detailed_json':
      return formatAsDetailedJSON(session, options)
    case 'analysis':
      return formatAsAnalysis(session, options)
    case 'csv':
      return formatAsCSV(session, options)
    default:
      return formatAsMarkdown(session, options)
  }
}

// ============================================================================
// Markdown Format
// ============================================================================

function formatAsMarkdown(session: DebugSession, options: ExportOptions): string {
  const lines: string[] = []

  // Header
  lines.push('# FrontierScience Debug Session')
  lines.push('')
  lines.push(`**Session ID**: ${session.sessionId}`)
  lines.push(`**Discovery ID**: ${session.discoveryId || 'N/A'}`)
  if (session.query) {
    lines.push(`**Query**: "${truncate(session.query, 100)}"`)
  }
  lines.push(`**Status**: ${session.status}`)
  lines.push(`**Started**: ${formatTimestamp(session.startTime)}`)
  if (session.endTime) {
    lines.push(`**Ended**: ${formatTimestamp(session.endTime)}`)
    lines.push(`**Duration**: ${formatDuration(session.endTime - session.startTime)}`)
  } else {
    lines.push(`**Duration**: ${formatDuration(Date.now() - session.startTime)} (ongoing)`)
  }
  lines.push('')

  // Summary Stats
  lines.push('## Summary')
  lines.push('')
  lines.push(`- **Total Events**: ${session.events.length}`)
  lines.push(`- **API Calls**: ${session.apiCalls.length}`)
  lines.push(`- **Errors**: ${session.errors.length}`)
  lines.push('')

  // Timeline
  const timeline = buildTimeline(session)
  if (timeline.length > 0) {
    lines.push('## Timeline')
    lines.push('')
    for (const entry of timeline.slice(0, 50)) {
      const time = formatTimestamp(entry.timestamp, true)
      let line = `- **${time}** - ${entry.label}`
      if (entry.score !== undefined) {
        line += ` (score: ${entry.score.toFixed(1)}/10${entry.passed ? ', PASSED' : ''})`
      }
      if (entry.details) {
        line += ` - ${entry.details}`
      }
      lines.push(line)
    }
    if (timeline.length > 50) {
      lines.push(`- ... and ${timeline.length - 50} more events`)
    }
    lines.push('')
  }

  // SSE Events
  if (options.includeEvents && session.events.length > 0) {
    const events = filterEvents(session.events, options)
    lines.push(`## SSE Events (${events.length} total)`)
    lines.push('')

    const maxEvents = options.maxEvents || 30
    const displayEvents = events.slice(0, maxEvents)

    for (let i = 0; i < displayEvents.length; i++) {
      const event = displayEvents[i]
      lines.push(`### Event ${i + 1} - ${formatTimestamp(event.timestamp, true)}`)
      lines.push(`**Type**: ${event.type} | **Category**: ${event.category}`)
      if (event.phase) {
        const phaseMeta = getPhaseMetadata(event.phase as DiscoveryPhase)
        lines.push(`**Phase**: ${phaseMeta?.name || event.phase}`)
      }
      if (event.duration) {
        lines.push(`**Duration**: ${event.duration}ms`)
      }
      lines.push('')
      lines.push('```json')
      lines.push(JSON.stringify(event.data, null, 2))
      lines.push('```')
      lines.push('')
    }

    if (events.length > maxEvents) {
      lines.push(`... and ${events.length - maxEvents} more events (use JSON export for full data)`)
      lines.push('')
    }
  }

  // API Calls
  if (options.includeApiCalls && session.apiCalls.length > 0) {
    lines.push(`## API Calls (${session.apiCalls.length} total)`)
    lines.push('')

    for (const apiCall of session.apiCalls) {
      lines.push(`### ${apiCall.method} ${apiCall.url}`)
      lines.push(`**Timestamp**: ${formatTimestamp(apiCall.timestamp, true)}`)
      lines.push(`**Duration**: ${apiCall.duration}ms`)
      if (apiCall.statusCode) {
        lines.push(`**Status**: ${apiCall.statusCode}`)
      }
      if (apiCall.error) {
        lines.push(`**Error**: ${apiCall.error}`)
      }
      lines.push('')

      if (apiCall.requestPayload) {
        lines.push('**Request:**')
        lines.push('```json')
        lines.push(JSON.stringify(apiCall.requestPayload, null, 2))
        lines.push('```')
        lines.push('')
      }

      if (apiCall.responsePayload) {
        const responseStr = JSON.stringify(apiCall.responsePayload, null, 2)
        if (responseStr.length > 2000) {
          lines.push('**Response:** (truncated)')
          lines.push('```json')
          lines.push(responseStr.substring(0, 2000) + '\n... (truncated)')
          lines.push('```')
        } else {
          lines.push('**Response:**')
          lines.push('```json')
          lines.push(responseStr)
          lines.push('```')
        }
        lines.push('')
      }
    }
  }

  // Errors
  if (options.includeErrors && session.errors.length > 0) {
    lines.push(`## Errors (${session.errors.length} total)`)
    lines.push('')

    for (let i = 0; i < session.errors.length; i++) {
      const error = session.errors[i]
      lines.push(`### Error ${i + 1} - ${formatTimestamp(error.timestamp, true)}`)
      if (error.phase) {
        const phaseMeta = getPhaseMetadata(error.phase as DiscoveryPhase)
        lines.push(`**Phase**: ${phaseMeta?.name || error.phase}`)
      }
      lines.push(`**Message**: ${error.message}`)
      lines.push('')

      if (error.stack) {
        lines.push('**Stack Trace:**')
        lines.push('```')
        lines.push(error.stack)
        lines.push('```')
        lines.push('')
      }

      if (error.context) {
        lines.push('**Context:**')
        lines.push('```json')
        lines.push(JSON.stringify(error.context, null, 2))
        lines.push('```')
        lines.push('')
      }
    }
  } else if (options.includeErrors) {
    lines.push('## Errors')
    lines.push('')
    lines.push('No errors encountered.')
    lines.push('')
  }

  // Raw Data
  if (options.includeRawData && session.finalResult) {
    lines.push('## Final Result')
    lines.push('')
    lines.push('```json')
    const resultStr = JSON.stringify(session.finalResult, null, 2)
    if (resultStr.length > 5000) {
      lines.push(resultStr.substring(0, 5000) + '\n... (truncated)')
    } else {
      lines.push(resultStr)
    }
    lines.push('```')
    lines.push('')
  }

  // Footer
  lines.push('---')
  lines.push(`*Exported at ${new Date().toISOString()}*`)

  return lines.join('\n')
}

// ============================================================================
// JSON Format
// ============================================================================

function formatAsJSON(session: DebugSession, options: ExportOptions): string {
  const output: Partial<DebugSession> & { exportedAt: string } = {
    sessionId: session.sessionId,
    discoveryId: session.discoveryId,
    startTime: session.startTime,
    endTime: session.endTime,
    status: session.status,
    query: session.query,
    exportedAt: new Date().toISOString(),
  }

  if (options.includeEvents) {
    output.events = filterEvents(session.events, options)
  }

  if (options.includeApiCalls) {
    output.apiCalls = session.apiCalls
  }

  if (options.includeErrors) {
    output.errors = session.errors
  }

  if (options.includeRawData) {
    output.finalResult = session.finalResult
    output.metadata = session.metadata
  }

  return JSON.stringify(output, null, 2)
}

// ============================================================================
// Plain Text Format
// ============================================================================

function formatAsText(session: DebugSession, options: ExportOptions): string {
  const lines: string[] = []

  lines.push('='.repeat(60))
  lines.push('FRONTIERSCIENCE DEBUG SESSION')
  lines.push('='.repeat(60))
  lines.push('')
  lines.push(`Session ID:   ${session.sessionId}`)
  lines.push(`Discovery ID: ${session.discoveryId || 'N/A'}`)
  lines.push(`Query:        ${session.query || 'N/A'}`)
  lines.push(`Status:       ${session.status}`)
  lines.push(`Started:      ${formatTimestamp(session.startTime)}`)
  if (session.endTime) {
    lines.push(`Ended:        ${formatTimestamp(session.endTime)}`)
    lines.push(`Duration:     ${formatDuration(session.endTime - session.startTime)}`)
  }
  lines.push('')
  lines.push('-'.repeat(60))
  lines.push('SUMMARY')
  lines.push('-'.repeat(60))
  lines.push(`Events:     ${session.events.length}`)
  lines.push(`API Calls:  ${session.apiCalls.length}`)
  lines.push(`Errors:     ${session.errors.length}`)
  lines.push('')

  if (options.includeEvents && session.events.length > 0) {
    lines.push('-'.repeat(60))
    lines.push('EVENTS')
    lines.push('-'.repeat(60))
    const events = filterEvents(session.events, options).slice(0, options.maxEvents || 50)
    for (const event of events) {
      lines.push(
        `[${formatTimestamp(event.timestamp, true)}] ${event.type}:${event.category} ${event.phase || ''}`
      )
    }
    lines.push('')
  }

  if (options.includeErrors && session.errors.length > 0) {
    lines.push('-'.repeat(60))
    lines.push('ERRORS')
    lines.push('-'.repeat(60))
    for (const error of session.errors) {
      lines.push(`[${formatTimestamp(error.timestamp, true)}] ${error.message}`)
      if (error.phase) {
        lines.push(`  Phase: ${error.phase}`)
      }
    }
    lines.push('')
  }

  lines.push('='.repeat(60))
  lines.push(`Exported at ${new Date().toISOString()}`)

  return lines.join('\n')
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatTimestamp(ms: number, includeMs = false): string {
  const date = new Date(ms)
  const time = date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  if (includeMs) {
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0')
    return `${time}.${milliseconds}`
  }

  return `${date.toLocaleDateString()} ${time}`
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength - 3) + '...'
}

function filterEvents(
  events: DebugEvent[],
  options: ExportOptions
): DebugEvent[] {
  let filtered = events

  if (options.filterByPhase && options.filterByPhase.length > 0) {
    filtered = filtered.filter(
      (e) => e.phase && options.filterByPhase!.includes(e.phase as DiscoveryPhase)
    )
  }

  if (options.filterByCategory && options.filterByCategory.length > 0) {
    filtered = filtered.filter((e) => options.filterByCategory!.includes(e.category))
  }

  return filtered
}

function buildTimeline(session: DebugSession): TimelineEntry[] {
  const entries: TimelineEntry[] = []

  // Add session start
  entries.push({
    timestamp: session.startTime,
    type: 'event',
    label: 'Discovery started',
  })

  // Add phase changes and iterations
  let currentPhase: string | undefined
  for (const event of session.events) {
    // Phase transitions
    if (event.category === 'progress' && event.phase && event.phase !== currentPhase) {
      currentPhase = event.phase
      const phaseMeta = getPhaseMetadata(event.phase as DiscoveryPhase)
      const data = event.data as { status?: string }
      entries.push({
        timestamp: event.timestamp,
        type: 'phase_change',
        phase: event.phase as DiscoveryPhase,
        label: `Phase: ${phaseMeta?.name || event.phase}`,
        details: data?.status,
      })
    }

    // Iterations with scores
    if (event.category === 'iteration') {
      const data = event.data as { iteration?: number; score?: number; passed?: boolean }
      entries.push({
        timestamp: event.timestamp,
        type: 'event',
        phase: event.phase as DiscoveryPhase,
        label: `${event.phase} - Iteration ${data?.iteration || '?'}`,
        score: data?.score,
        passed: data?.passed,
      })
    }

    // Completions
    if (event.category === 'complete') {
      entries.push({
        timestamp: event.timestamp,
        type: 'event',
        label: 'Discovery completed',
      })
    }
  }

  // Add errors
  for (const error of session.errors) {
    entries.push({
      timestamp: error.timestamp,
      type: 'error',
      phase: error.phase as DiscoveryPhase,
      label: 'Error',
      details: error.message,
    })
  }

  // Add API calls
  for (const apiCall of session.apiCalls) {
    entries.push({
      timestamp: apiCall.timestamp,
      type: 'api',
      label: `API: ${apiCall.method} ${apiCall.url.split('/').slice(-2).join('/')}`,
      details: `${apiCall.duration}ms`,
    })
  }

  // Sort by timestamp
  entries.sort((a, b) => a.timestamp - b.timestamp)

  return entries
}

// ============================================================================
// Quick Copy Functions
// ============================================================================

export function formatQuickSummary(session: DebugSession): string {
  const duration = session.endTime
    ? formatDuration(session.endTime - session.startTime)
    : formatDuration(Date.now() - session.startTime) + ' (ongoing)'

  return `FrontierScience Debug: ${session.discoveryId || 'N/A'}
Status: ${session.status}
Duration: ${duration}
Events: ${session.events.length} | API Calls: ${session.apiCalls.length} | Errors: ${session.errors.length}`
}

export function formatErrorSummary(errors: ErrorLog[]): string {
  if (errors.length === 0) return 'No errors'

  return errors
    .map((e) => {
      const time = formatTimestamp(e.timestamp, true)
      const phase = e.phase ? ` [${e.phase}]` : ''
      return `${time}${phase}: ${e.message}`
    })
    .join('\n')
}

// ============================================================================
// Detailed JSON Format (v0.0.3)
// ============================================================================

function formatAsDetailedJSON(session: DebugSession, options: ExportOptions): string {
  const output: Record<string, unknown> = {
    version: '0.0.3',
    exportedAt: new Date().toISOString(),
    session: {
      sessionId: session.sessionId,
      discoveryId: session.discoveryId,
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      query: session.query,
      domain: session.domain,
      mode: session.mode,
      duration: session.endTime ? session.endTime - session.startTime : Date.now() - session.startTime,
    },
  }

  // Core logs
  if (options.includeEvents) {
    output.events = filterEvents(session.events, options).slice(0, options.maxEvents || 100)
  }
  if (options.includeApiCalls) {
    output.apiCalls = session.apiCalls
  }
  if (options.includeErrors) {
    output.errors = session.errors
  }

  // Enhanced logs (v0.0.3)
  if (options.includeLLMCalls && session.llmCalls) {
    output.llmCalls = session.llmCalls.slice(0, options.maxLLMCalls || 50)
  }
  if (options.includePerformanceSnapshots && session.performanceSnapshots) {
    output.performanceSnapshots = session.performanceSnapshots.slice(0, options.maxPerformanceSnapshots || 20)
  }
  if (options.includeDataSourceLogs && session.dataSourceLogs) {
    output.dataSourceLogs = session.dataSourceLogs.slice(0, options.maxDataSourceLogs || 50)
  }
  if (options.includeSSEHealth && session.sseHealthLogs) {
    output.sseHealthLogs = session.sseHealthLogs
  }
  if (options.includeUIState && session.uiStateLogs) {
    output.uiStateLogs = session.uiStateLogs.slice(0, options.maxUIStateLogs || 50)
  }
  if (options.includeQualityValidations && session.qualityValidations) {
    output.qualityValidations = session.qualityValidations
  }
  if (options.includeAlerts && session.alerts) {
    output.alerts = session.alerts
  }

  // Computed metrics
  if (options.includeComputedMetrics) {
    output.metrics = {
      performance: session.performanceMetrics,
      dataSource: session.dataSourceMetrics,
      sseHealth: session.sseHealthMetrics,
      uiPerformance: session.uiPerformanceMetrics,
      quality: session.qualityMetrics,
    }
  }
  if (options.includeCostBreakdown && session.costBreakdown) {
    output.costBreakdown = session.costBreakdown
  }
  if (options.includeRawData && session.finalResult) {
    output.finalResult = session.finalResult
  }
  if (options.includeSystemInfo && session.systemInfo) {
    output.systemInfo = session.systemInfo
  }

  output.metadata = {
    ...session.metadata,
    totalEvents: session.events?.length || 0,
    totalApiCalls: session.apiCalls?.length || 0,
    totalErrors: session.errors?.length || 0,
    totalLLMCalls: session.llmCalls?.length || 0,
    totalDataSourceCalls: session.dataSourceLogs?.length || 0,
    totalAlerts: session.alerts?.length || 0,
  }

  return JSON.stringify(output, null, options.prettyPrint !== false ? 2 : 0)
}

// ============================================================================
// Analysis Format (v0.0.3)
// ============================================================================

function formatAsAnalysis(session: DebugSession, options: ExportOptions): string {
  const lines: string[] = []
  const duration = session.endTime ? session.endTime - session.startTime : Date.now() - session.startTime

  // Header
  lines.push('═'.repeat(70))
  lines.push('FRONTIERSCIENCE DEBUG ANALYSIS REPORT - v0.0.3')
  lines.push('═'.repeat(70))
  lines.push('')

  // Section 1: Session Overview
  lines.push('┌' + '─'.repeat(68) + '┐')
  lines.push('│ SECTION 1: SESSION OVERVIEW' + ' '.repeat(40) + '│')
  lines.push('└' + '─'.repeat(68) + '┘')
  lines.push('')
  lines.push(`Session ID:    ${session.sessionId}`)
  lines.push(`Discovery ID:  ${session.discoveryId || 'N/A'}`)
  lines.push(`Query:         ${truncate(session.query || 'N/A', 60)}`)
  lines.push(`Domain:        ${session.domain || 'N/A'}`)
  lines.push(`Mode:          ${session.mode || 'discovery'}`)
  lines.push(`Status:        ${session.status}`)
  lines.push(`Duration:      ${formatDuration(duration)}`)
  lines.push(`Started:       ${formatTimestamp(session.startTime)}`)
  if (session.endTime) {
    lines.push(`Ended:         ${formatTimestamp(session.endTime)}`)
  }
  lines.push('')

  // Section 2: Summary Statistics
  lines.push('┌' + '─'.repeat(68) + '┐')
  lines.push('│ SECTION 2: SUMMARY STATISTICS' + ' '.repeat(38) + '│')
  lines.push('└' + '─'.repeat(68) + '┘')
  lines.push('')
  lines.push(`Events:              ${session.events?.length || 0}`)
  lines.push(`API Calls:           ${session.apiCalls?.length || 0}`)
  lines.push(`Errors:              ${session.errors?.length || 0}`)
  lines.push(`LLM Calls:           ${session.llmCalls?.length || 0}`)
  lines.push(`Data Source Calls:   ${session.dataSourceLogs?.length || 0}`)
  lines.push(`Quality Validations: ${session.qualityValidations?.length || 0}`)
  lines.push(`Alerts:              ${session.alerts?.length || 0}`)
  lines.push('')

  // Section 3: LLM Usage Analysis
  if (options.includeLLMCalls !== false && session.llmCalls && session.llmCalls.length > 0) {
    lines.push('┌' + '─'.repeat(68) + '┐')
    lines.push('│ SECTION 3: LLM USAGE ANALYSIS' + ' '.repeat(38) + '│')
    lines.push('└' + '─'.repeat(68) + '┘')
    lines.push('')

    const llmStats = computeLLMStats(session.llmCalls)
    lines.push(`Total Calls:       ${llmStats.totalCalls}`)
    lines.push(`Successful:        ${llmStats.successfulCalls} (${(llmStats.successRate * 100).toFixed(1)}%)`)
    lines.push(`Failed:            ${llmStats.failedCalls}`)
    lines.push(`Cache Hits:        ${llmStats.cacheHits} (${(llmStats.cacheHitRate * 100).toFixed(1)}%)`)
    lines.push('')
    lines.push(`Total Tokens:      ${llmStats.totalTokens.toLocaleString()}`)
    lines.push(`  Input:           ${llmStats.inputTokens.toLocaleString()}`)
    lines.push(`  Output:          ${llmStats.outputTokens.toLocaleString()}`)
    lines.push('')
    lines.push(`Total Cost:        $${llmStats.totalCost.toFixed(4)}`)
    lines.push(`Avg Latency:       ${llmStats.avgLatency.toFixed(0)}ms`)
    lines.push(`P95 Latency:       ${llmStats.p95Latency.toFixed(0)}ms`)
    lines.push('')

    // By Provider
    lines.push('By Provider:')
    for (const [provider, stats] of Object.entries(llmStats.byProvider)) {
      lines.push(`  ${provider.padEnd(12)} ${stats.calls} calls, $${stats.cost.toFixed(4)}, avg ${stats.avgLatency.toFixed(0)}ms`)
    }
    lines.push('')

    // By Purpose
    lines.push('By Purpose:')
    for (const [purpose, stats] of Object.entries(llmStats.byPurpose)) {
      lines.push(`  ${purpose.padEnd(12)} ${stats.calls} calls, ${stats.tokens.toLocaleString()} tokens`)
    }
    lines.push('')

    // Slowest Calls
    const slowest = [...session.llmCalls].sort((a, b) => b.latencyMs - a.latencyMs).slice(0, 5)
    lines.push('Slowest LLM Calls:')
    for (const call of slowest) {
      lines.push(`  [${formatTimestamp(call.timestamp, true)}] ${call.model}: ${call.latencyMs}ms (${call.purpose})`)
    }
    lines.push('')
  }

  // Section 4: Cost Breakdown
  if (options.includeCostBreakdown !== false && session.costBreakdown) {
    lines.push('┌' + '─'.repeat(68) + '┐')
    lines.push('│ SECTION 4: COST BREAKDOWN' + ' '.repeat(42) + '│')
    lines.push('└' + '─'.repeat(68) + '┘')
    lines.push('')

    const cost = session.costBreakdown
    lines.push(`Total Cost:        $${cost.totalUSD.toFixed(4)}`)
    lines.push(`  Input Tokens:    $${cost.inputTokensCost.toFixed(4)}`)
    lines.push(`  Output Tokens:   $${cost.outputTokensCost.toFixed(4)}`)
    lines.push('')

    lines.push('By Phase:')
    for (const [phase, amount] of Object.entries(cost.byPhase)) {
      if (amount > 0) {
        lines.push(`  ${phase.padEnd(16)} $${amount.toFixed(4)}`)
      }
    }
    lines.push('')

    lines.push('By Model:')
    for (const [model, amount] of Object.entries(cost.byModel)) {
      if (amount > 0) {
        lines.push(`  ${model.padEnd(24)} $${amount.toFixed(4)}`)
      }
    }
    lines.push('')
  }

  // Section 5: Data Source Analysis
  if (options.includeDataSourceLogs !== false && session.dataSourceLogs && session.dataSourceLogs.length > 0) {
    lines.push('┌' + '─'.repeat(68) + '┐')
    lines.push('│ SECTION 5: DATA SOURCE ANALYSIS' + ' '.repeat(36) + '│')
    lines.push('└' + '─'.repeat(68) + '┘')
    lines.push('')

    const dsStats = computeDataSourceStats(session.dataSourceLogs)
    lines.push(`Total Calls:       ${dsStats.totalCalls}`)
    lines.push(`Success Rate:      ${(dsStats.successRate * 100).toFixed(1)}%`)
    lines.push(`Cache Hit Rate:    ${(dsStats.cacheHitRate * 100).toFixed(1)}%`)
    lines.push(`Avg Latency:       ${dsStats.avgLatency.toFixed(0)}ms`)
    lines.push('')

    lines.push('By Source:')
    for (const [source, stats] of Object.entries(dsStats.bySource)) {
      lines.push(`  ${source.padEnd(20)} ${stats.calls} calls, ${(stats.successRate * 100).toFixed(0)}% success, avg ${stats.avgLatency.toFixed(0)}ms`)
    }
    lines.push('')
  }

  // Section 6: SSE Connection Health
  if (options.includeSSEHealth !== false && session.sseHealthLogs && session.sseHealthLogs.length > 0) {
    lines.push('┌' + '─'.repeat(68) + '┐')
    lines.push('│ SECTION 6: SSE CONNECTION HEALTH' + ' '.repeat(35) + '│')
    lines.push('└' + '─'.repeat(68) + '┘')
    lines.push('')

    const sseStats = computeSSEStats(session.sseHealthLogs)
    lines.push(`Connection Events: ${sseStats.totalEvents}`)
    lines.push(`Reconnects:        ${sseStats.reconnects}`)
    lines.push(`Messages:          ${sseStats.messages}`)
    lines.push(`Heartbeats:        ${sseStats.heartbeats}`)
    lines.push(`Errors:            ${sseStats.errors}`)
    lines.push(`Current State:     ${sseStats.currentState}`)
    lines.push('')

    if (sseStats.errors > 0) {
      lines.push('SSE Errors:')
      const sseErrors = session.sseHealthLogs.filter(l => l.event === 'error').slice(0, 5)
      for (const err of sseErrors) {
        lines.push(`  [${formatTimestamp(err.timestamp, true)}] ${err.errorMessage || 'Unknown error'}`)
      }
      lines.push('')
    }
  }

  // Section 7: Quality Validation Analysis
  if (options.includeQualityValidations !== false && session.qualityValidations && session.qualityValidations.length > 0) {
    lines.push('┌' + '─'.repeat(68) + '┐')
    lines.push('│ SECTION 7: QUALITY VALIDATION ANALYSIS' + ' '.repeat(29) + '│')
    lines.push('└' + '─'.repeat(68) + '┘')
    lines.push('')

    const qStats = computeQualityStats(session.qualityValidations)
    lines.push(`Total Validations: ${qStats.totalValidations}`)
    lines.push(`Pass Rate:         ${(qStats.passRate * 100).toFixed(1)}%`)
    lines.push(`Avg Score:         ${qStats.avgScore.toFixed(2)}`)
    lines.push('')

    lines.push('By Criteria:')
    for (const [criteria, stats] of Object.entries(qStats.byCriteria)) {
      const passIndicator = stats.passRate >= 0.7 ? '✓' : stats.passRate >= 0.5 ? '~' : '✗'
      lines.push(`  ${passIndicator} ${criteria.padEnd(20)} avg: ${stats.avgScore.toFixed(2)}, pass: ${(stats.passRate * 100).toFixed(0)}%`)
    }
    lines.push('')
  }

  // Section 8: UI Performance Analysis
  if (options.includeUIState !== false && session.uiStateLogs && session.uiStateLogs.length > 0) {
    lines.push('┌' + '─'.repeat(68) + '┐')
    lines.push('│ SECTION 8: UI PERFORMANCE ANALYSIS' + ' '.repeat(33) + '│')
    lines.push('└' + '─'.repeat(68) + '┘')
    lines.push('')

    const uiStats = computeUIStats(session.uiStateLogs)
    lines.push(`Total UI Events:   ${uiStats.totalEvents}`)
    lines.push(`Renders:           ${uiStats.renders}`)
    lines.push(`Re-renders:        ${uiStats.rerenders}`)
    lines.push(`Interactions:      ${uiStats.interactions}`)
    lines.push(`Avg Render Time:   ${uiStats.avgRenderTime.toFixed(1)}ms`)
    lines.push('')

    if (uiStats.slowRenders.length > 0) {
      lines.push('Slow Renders (>100ms):')
      for (const render of uiStats.slowRenders.slice(0, 5)) {
        lines.push(`  [${formatTimestamp(render.timestamp, true)}] ${render.component}: ${render.renderTimeMs}ms`)
      }
      lines.push('')
    }
  }

  // Section 9: Alerts Summary
  if (options.includeAlerts !== false && session.alerts && session.alerts.length > 0) {
    lines.push('┌' + '─'.repeat(68) + '┐')
    lines.push('│ SECTION 9: ALERTS SUMMARY' + ' '.repeat(42) + '│')
    lines.push('└' + '─'.repeat(68) + '┘')
    lines.push('')

    const alertStats = computeAlertStats(session.alerts)
    lines.push(`Total Alerts:      ${alertStats.total}`)
    lines.push(`Critical:          ${alertStats.bySeverity.critical || 0}`)
    lines.push(`Warning:           ${alertStats.bySeverity.warning || 0}`)
    lines.push(`Info:              ${alertStats.bySeverity.info || 0}`)
    lines.push(`Unresolved:        ${alertStats.unresolved}`)
    lines.push('')

    lines.push('Recent Alerts:')
    for (const alert of session.alerts.slice(-10)) {
      const severity = alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '🟡' : '🔵'
      const resolved = alert.resolvedAt ? ' [RESOLVED]' : ''
      lines.push(`  ${severity} [${formatTimestamp(alert.timestamp, true)}] ${alert.message}${resolved}`)
    }
    lines.push('')
  }

  // Section 10: Error Analysis
  if (options.includeErrors !== false && session.errors && session.errors.length > 0) {
    lines.push('┌' + '─'.repeat(68) + '┐')
    lines.push('│ SECTION 10: ERROR ANALYSIS' + ' '.repeat(41) + '│')
    lines.push('└' + '─'.repeat(68) + '┘')
    lines.push('')

    const errorGroups = groupErrors(session.errors)
    lines.push(`Total Errors:      ${session.errors.length}`)
    lines.push(`Unique Messages:   ${Object.keys(errorGroups).length}`)
    lines.push('')

    lines.push('Error Frequency:')
    const sortedErrors = Object.entries(errorGroups)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
    for (const [message, info] of sortedErrors) {
      lines.push(`  (${info.count}x) ${truncate(message, 55)}`)
      if (info.phases.length > 0) {
        lines.push(`       Phases: ${info.phases.join(', ')}`)
      }
    }
    lines.push('')
  }

  // Section 11: Timeline
  const timeline = buildTimeline(session)
  if (timeline.length > 0) {
    lines.push('┌' + '─'.repeat(68) + '┐')
    lines.push('│ SECTION 11: EVENT TIMELINE' + ' '.repeat(41) + '│')
    lines.push('└' + '─'.repeat(68) + '┘')
    lines.push('')

    const maxEntries = 30
    for (const entry of timeline.slice(0, maxEntries)) {
      const time = formatTimestamp(entry.timestamp, true)
      let line = `[${time}] ${entry.label}`
      if (entry.score !== undefined) {
        line += ` (score: ${entry.score.toFixed(1)}${entry.passed ? ', PASSED' : ''})`
      }
      if (entry.latencyMs !== undefined) {
        line += ` (${entry.latencyMs}ms)`
      }
      if (entry.costUSD !== undefined && entry.costUSD > 0) {
        line += ` ($${entry.costUSD.toFixed(4)})`
      }
      lines.push(line)
    }
    if (timeline.length > maxEntries) {
      lines.push(`... and ${timeline.length - maxEntries} more events`)
    }
    lines.push('')
  }

  // Footer
  lines.push('═'.repeat(70))
  lines.push(`Exported at ${new Date().toISOString()}`)
  lines.push('═'.repeat(70))

  return lines.join('\n')
}

// ============================================================================
// CSV Format (v0.0.3)
// ============================================================================

function formatAsCSV(session: DebugSession, options: ExportOptions): string {
  const rows: string[][] = []

  // Header row
  rows.push([
    'timestamp',
    'type',
    'category',
    'phase',
    'model',
    'provider',
    'purpose',
    'latency_ms',
    'tokens',
    'cost_usd',
    'success',
    'message',
  ])

  // Events
  if (options.includeEvents) {
    for (const event of session.events.slice(0, options.maxEvents || 100)) {
      rows.push([
        new Date(event.timestamp).toISOString(),
        event.type,
        event.category,
        event.phase || '',
        '',
        '',
        '',
        event.duration?.toString() || '',
        '',
        '',
        '',
        JSON.stringify(event.data).substring(0, 100),
      ])
    }
  }

  // LLM Calls
  if (options.includeLLMCalls && session.llmCalls) {
    for (const call of session.llmCalls.slice(0, options.maxLLMCalls || 50)) {
      rows.push([
        new Date(call.timestamp).toISOString(),
        'llm_call',
        call.success ? 'llm_response' : 'error',
        call.phase,
        call.model,
        call.provider,
        call.purpose,
        call.latencyMs.toString(),
        call.totalTokens.toString(),
        call.costEstimateUSD.toFixed(6),
        call.success ? 'true' : 'false',
        call.errorMessage || '',
      ])
    }
  }

  // Data Source Logs
  if (options.includeDataSourceLogs && session.dataSourceLogs) {
    for (const log of session.dataSourceLogs.slice(0, options.maxDataSourceLogs || 50)) {
      rows.push([
        new Date(log.timestamp).toISOString(),
        'data_source',
        log.success ? 'api_response' : 'error',
        log.phase,
        '',
        log.sourceId,
        log.operation,
        log.latencyMs.toString(),
        log.resultsCount.toString(),
        '',
        log.success ? 'true' : 'false',
        log.errorMessage || '',
      ])
    }
  }

  // Errors
  if (options.includeErrors) {
    for (const error of session.errors) {
      rows.push([
        new Date(error.timestamp).toISOString(),
        'error',
        'error',
        error.phase || '',
        '',
        '',
        '',
        '',
        '',
        '',
        'false',
        error.message,
      ])
    }
  }

  // Convert to CSV
  return rows
    .map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

// ============================================================================
// Statistics Computation Helpers (v0.0.3)
// ============================================================================

interface LLMStats {
  totalCalls: number
  successfulCalls: number
  failedCalls: number
  cacheHits: number
  successRate: number
  cacheHitRate: number
  totalTokens: number
  inputTokens: number
  outputTokens: number
  totalCost: number
  avgLatency: number
  p95Latency: number
  byProvider: Record<string, { calls: number; cost: number; avgLatency: number }>
  byPurpose: Record<string, { calls: number; tokens: number }>
}

function computeLLMStats(calls: LLMCallLog[]): LLMStats {
  const successful = calls.filter(c => c.success)
  const cached = calls.filter(c => c.cacheHit)
  const latencies = calls.map(c => c.latencyMs).sort((a, b) => a - b)

  const byProvider: Record<string, { calls: number; cost: number; totalLatency: number; avgLatency: number }> = {}
  const byPurpose: Record<string, { calls: number; tokens: number }> = {}

  for (const call of calls) {
    // By provider
    if (!byProvider[call.provider]) {
      byProvider[call.provider] = { calls: 0, cost: 0, totalLatency: 0, avgLatency: 0 }
    }
    byProvider[call.provider].calls++
    byProvider[call.provider].cost += call.costEstimateUSD
    byProvider[call.provider].totalLatency += call.latencyMs

    // By purpose
    if (!byPurpose[call.purpose]) {
      byPurpose[call.purpose] = { calls: 0, tokens: 0 }
    }
    byPurpose[call.purpose].calls++
    byPurpose[call.purpose].tokens += call.totalTokens
  }

  // Calculate averages for providers
  for (const [, stats] of Object.entries(byProvider)) {
    stats.avgLatency = stats.calls > 0 ? stats.totalLatency / stats.calls : 0
  }

  const totalTokens = calls.reduce((sum, c) => sum + c.totalTokens, 0)
  const inputTokens = calls.reduce((sum, c) => sum + c.inputTokens, 0)
  const outputTokens = calls.reduce((sum, c) => sum + c.outputTokens, 0)
  const totalCost = calls.reduce((sum, c) => sum + c.costEstimateUSD, 0)

  return {
    totalCalls: calls.length,
    successfulCalls: successful.length,
    failedCalls: calls.length - successful.length,
    cacheHits: cached.length,
    successRate: calls.length > 0 ? successful.length / calls.length : 0,
    cacheHitRate: calls.length > 0 ? cached.length / calls.length : 0,
    totalTokens,
    inputTokens,
    outputTokens,
    totalCost,
    avgLatency: calls.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
    p95Latency: latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0,
    byProvider,
    byPurpose,
  }
}

interface DataSourceStats {
  totalCalls: number
  successRate: number
  cacheHitRate: number
  avgLatency: number
  bySource: Record<string, { calls: number; successRate: number; avgLatency: number }>
}

function computeDataSourceStats(logs: DataSourceLog[]): DataSourceStats {
  const successful = logs.filter(l => l.success)
  const cached = logs.filter(l => l.cacheHit)

  const bySource: Record<string, { calls: number; successes: number; totalLatency: number; successRate: number; avgLatency: number }> = {}

  for (const log of logs) {
    if (!bySource[log.sourceId]) {
      bySource[log.sourceId] = { calls: 0, successes: 0, totalLatency: 0, successRate: 0, avgLatency: 0 }
    }
    bySource[log.sourceId].calls++
    if (log.success) bySource[log.sourceId].successes++
    bySource[log.sourceId].totalLatency += log.latencyMs
  }

  for (const [, stats] of Object.entries(bySource)) {
    stats.successRate = stats.calls > 0 ? stats.successes / stats.calls : 0
    stats.avgLatency = stats.calls > 0 ? stats.totalLatency / stats.calls : 0
  }

  const totalLatency = logs.reduce((sum, l) => sum + l.latencyMs, 0)

  return {
    totalCalls: logs.length,
    successRate: logs.length > 0 ? successful.length / logs.length : 0,
    cacheHitRate: logs.length > 0 ? cached.length / logs.length : 0,
    avgLatency: logs.length > 0 ? totalLatency / logs.length : 0,
    bySource,
  }
}

interface SSEStats {
  totalEvents: number
  reconnects: number
  messages: number
  heartbeats: number
  errors: number
  currentState: string
}

function computeSSEStats(logs: SSEHealthLog[]): SSEStats {
  return {
    totalEvents: logs.length,
    reconnects: logs.filter(l => l.event === 'reconnect').length,
    messages: logs.filter(l => l.event === 'message').length,
    heartbeats: logs.filter(l => l.event === 'heartbeat').length,
    errors: logs.filter(l => l.event === 'error').length,
    currentState: logs.length > 0 ? logs[logs.length - 1].state : 'unknown',
  }
}

interface QualityStats {
  totalValidations: number
  passRate: number
  avgScore: number
  byCriteria: Record<string, { avgScore: number; passRate: number }>
}

function computeQualityStats(validations: QualityValidationLog[]): QualityStats {
  const passed = validations.filter(v => v.passed)
  const byCriteria: Record<string, { total: number; passed: number; totalScore: number; avgScore: number; passRate: number }> = {}

  for (const v of validations) {
    if (!byCriteria[v.criteriaName]) {
      byCriteria[v.criteriaName] = { total: 0, passed: 0, totalScore: 0, avgScore: 0, passRate: 0 }
    }
    byCriteria[v.criteriaName].total++
    if (v.passed) byCriteria[v.criteriaName].passed++
    byCriteria[v.criteriaName].totalScore += v.score
  }

  for (const [, stats] of Object.entries(byCriteria)) {
    stats.avgScore = stats.total > 0 ? stats.totalScore / stats.total : 0
    stats.passRate = stats.total > 0 ? stats.passed / stats.total : 0
  }

  const totalScore = validations.reduce((sum, v) => sum + v.score, 0)

  return {
    totalValidations: validations.length,
    passRate: validations.length > 0 ? passed.length / validations.length : 0,
    avgScore: validations.length > 0 ? totalScore / validations.length : 0,
    byCriteria,
  }
}

interface UIStats {
  totalEvents: number
  renders: number
  rerenders: number
  interactions: number
  avgRenderTime: number
  slowRenders: Array<{ component: string; renderTimeMs: number; timestamp: number }>
}

function computeUIStats(logs: UIStateLog[]): UIStats {
  const renders = logs.filter(l => l.type === 'render')
  const rerenders = logs.filter(l => l.type === 'rerender')
  const interactions = logs.filter(l => l.type === 'user_interaction')

  const renderTimes = logs.filter(l => l.renderTimeMs !== undefined).map(l => l.renderTimeMs!)
  const avgRenderTime = renderTimes.length > 0 ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length : 0

  const slowRenders = logs
    .filter(l => l.renderTimeMs !== undefined && l.renderTimeMs > 100)
    .map(l => ({ component: l.component, renderTimeMs: l.renderTimeMs!, timestamp: l.timestamp }))
    .sort((a, b) => b.renderTimeMs - a.renderTimeMs)
    .slice(0, 10)

  return {
    totalEvents: logs.length,
    renders: renders.length,
    rerenders: rerenders.length,
    interactions: interactions.length,
    avgRenderTime,
    slowRenders,
  }
}

interface AlertStats {
  total: number
  bySeverity: Record<string, number>
  unresolved: number
}

function computeAlertStats(alerts: DebugAlert[]): AlertStats {
  const bySeverity: Record<string, number> = {}
  for (const alert of alerts) {
    bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1
  }

  return {
    total: alerts.length,
    bySeverity,
    unresolved: alerts.filter(a => !a.resolvedAt).length,
  }
}

function groupErrors(errors: ErrorLog[]): Record<string, { count: number; phases: string[] }> {
  const groups: Record<string, { count: number; phases: Set<string> }> = {}

  for (const error of errors) {
    const key = error.message
    if (!groups[key]) {
      groups[key] = { count: 0, phases: new Set() }
    }
    groups[key].count++
    if (error.phase) {
      groups[key].phases.add(error.phase)
    }
  }

  const result: Record<string, { count: number; phases: string[] }> = {}
  for (const [key, value] of Object.entries(groups)) {
    result[key] = { count: value.count, phases: Array.from(value.phases) }
  }

  return result
}

// ============================================================================
// Enhanced Quick Copy Functions (v0.0.3)
// ============================================================================

export function formatLLMSummary(llmCalls: LLMCallLog[]): string {
  if (llmCalls.length === 0) return 'No LLM calls'

  const stats = computeLLMStats(llmCalls)
  return `LLM Usage: ${stats.totalCalls} calls, ${stats.totalTokens.toLocaleString()} tokens, $${stats.totalCost.toFixed(4)}, avg ${stats.avgLatency.toFixed(0)}ms`
}

export function formatCostSummary(costBreakdown: CostBreakdown | undefined): string {
  if (!costBreakdown) return 'Cost data not available'

  return `Total Cost: $${costBreakdown.totalUSD.toFixed(4)} (Input: $${costBreakdown.inputTokensCost.toFixed(4)}, Output: $${costBreakdown.outputTokensCost.toFixed(4)})`
}

export function formatPerformanceSummary(session: DebugSession): string {
  const duration = session.endTime ? session.endTime - session.startTime : Date.now() - session.startTime
  const llmCalls = session.llmCalls?.length || 0
  const errors = session.errors?.length || 0

  return `Duration: ${formatDuration(duration)} | LLM Calls: ${llmCalls} | Errors: ${errors}`
}

export default formatDebugSession
