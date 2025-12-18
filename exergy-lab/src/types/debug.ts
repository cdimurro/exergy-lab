/**
 * Debug Types for Admin Debug Viewer
 *
 * TypeScript definitions for debug events, sessions, and errors
 * used by the Admin Debug Viewer for FrontierScience discovery debugging.
 */

import type { DiscoveryPhase } from './frontierscience'

// ============================================================================
// Debug Event Types
// ============================================================================

export type DebugEventType = 'sse' | 'api_call' | 'phase_transition' | 'error' | 'thinking'

export type DebugEventCategory =
  | 'progress'
  | 'iteration'
  | 'judge'
  | 'complete'
  | 'heartbeat'
  | 'error'
  | 'api_request'
  | 'api_response'

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
}

// ============================================================================
// Debug Session
// ============================================================================

export type DebugSessionStatus = 'idle' | 'running' | 'completed' | 'failed'

export interface DebugSession {
  sessionId: string
  discoveryId: string | null
  startTime: number
  endTime?: number
  status: DebugSessionStatus
  query?: string
  events: DebugEvent[]
  apiCalls: APICallLog[]
  errors: ErrorLog[]
  finalResult?: unknown
  metadata?: {
    userAgent?: string
    sessionStart?: string
    totalEvents?: number
    totalApiCalls?: number
    totalErrors?: number
  }
}

// ============================================================================
// Export Options
// ============================================================================

export type ExportFormat = 'markdown' | 'json' | 'text'

export interface ExportOptions {
  format: ExportFormat
  includeEvents: boolean
  includeApiCalls: boolean
  includeErrors: boolean
  includeRawData: boolean
  maxEvents?: number
  filterByPhase?: DiscoveryPhase[]
  filterByCategory?: DebugEventCategory[]
}

// ============================================================================
// Debug Viewer State
// ============================================================================

export type DebugTabId = 'events' | 'phases' | 'errors' | 'api' | 'raw'

export interface DebugViewerState {
  isOpen: boolean
  activeTab: DebugTabId
  session: DebugSession | null
  autoScroll: boolean
  filters: {
    eventTypes: DebugEventType[]
    categories: DebugEventCategory[]
    phases: DiscoveryPhase[]
    searchTerm: string
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
// Utility Types
// ============================================================================

export interface DebugStats {
  totalEvents: number
  eventsByCategory: Record<DebugEventCategory, number>
  totalApiCalls: number
  totalErrors: number
  averageApiDuration: number
  elapsedTime: number
  eventsPerSecond: number
}

export interface TimelineEntry {
  timestamp: number
  type: 'event' | 'api' | 'error' | 'phase_change'
  phase?: DiscoveryPhase
  label: string
  details?: string
  score?: number
  passed?: boolean
}

// ============================================================================
// Debug Context for React
// ============================================================================

export interface DebugContextValue {
  session: DebugSession | null
  config: DebugConfig
  isEnabled: boolean
  isOpen: boolean

  // Actions
  startSession: (discoveryId: string, query?: string) => void
  endSession: () => void
  addEvent: (event: Omit<DebugEvent, 'id'>) => void
  addApiCall: (apiCall: Omit<APICallLog, 'id'>) => void
  addError: (error: Omit<ErrorLog, 'id'>) => void
  clearSession: () => void
  exportSession: (options: ExportOptions) => string
  toggleOpen: () => void
  setEnabled: (enabled: boolean) => void
}
