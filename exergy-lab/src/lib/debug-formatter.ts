/**
 * Debug Formatter
 *
 * Formats debug sessions for export in various formats (Markdown, JSON, Text).
 * Designed for easy copy/paste into Claude or other AI assistants for troubleshooting.
 */

import type {
  DebugSession,
  DebugEvent,
  APICallLog,
  ErrorLog,
  ExportOptions,
  TimelineEntry,
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

export default formatDebugSession
