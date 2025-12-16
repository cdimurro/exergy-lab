/**
 * Activity Logging Types
 * Comprehensive tracking of all user interactions and AI agent validations
 */

export type ActivityType =
  | 'search_query'
  | 'discovery_prompt'
  | 'experiment_design'
  | 'simulation_run'
  | 'tea_calculation'
  | 'field_input'
  | 'file_upload'
  | 'page_view'
  | 'api_request'
  | 'ai_agent_request'
  | 'ai_agent_response'
  | 'error'

export interface ActivityLog {
  id: string
  timestamp: string
  sessionId: string
  userId?: string // Optional - for authenticated users
  userEmail?: string

  // Activity details
  type: ActivityType
  page: string
  action: string

  // Input/Output tracking
  inputs?: Record<string, any>
  outputs?: Record<string, any>

  // AI Agent tracking
  aiModel?: string
  aiPrompt?: string
  aiResponse?: string
  aiTokensUsed?: number
  aiResponseTime?: number

  // Error tracking
  error?: {
    message: string
    stack?: string
    code?: string
  }

  // Performance metrics
  duration?: number
  success: boolean

  // Metadata
  userAgent?: string
  ipAddress?: string
  metadata?: Record<string, any>
}

export interface LogFilters {
  startDate?: string
  endDate?: string
  userId?: string
  sessionId?: string
  type?: ActivityType
  page?: string
  success?: boolean
  searchTerm?: string
}

export interface LogStats {
  totalLogs: number
  uniqueSessions: number
  uniqueUsers: number
  successRate: number
  averageResponseTime: number
  topPages: Array<{ page: string; count: number }>
  topActions: Array<{ action: string; count: number }>
  errorRate: number
  aiAgentUsage: {
    totalRequests: number
    totalTokens: number
    averageTokensPerRequest: number
    successRate: number
  }
}

export interface SessionLog {
  sessionId: string
  userId?: string
  startTime: string
  endTime?: string
  totalActivities: number
  pages: string[]
  actions: string[]
  errors: number
}
