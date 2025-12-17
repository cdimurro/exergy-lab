import { z } from 'zod'

// ============================================================================
// Tool System Types
// ============================================================================

export type ToolName =
  | 'searchPapers'
  | 'analyzePatent'
  | 'extractData'
  | 'calculateMetrics'
  | 'runSimulation'
  | 'designExperiment'

export interface ToolDeclaration {
  name: ToolName
  description: string
  schema: z.ZodSchema
  handler: (params: any) => Promise<any>
}

export interface ToolResult<T = any> {
  success: boolean
  data?: T
  error?: string
  duration: number
  timestamp: number
}

export interface ToolCall {
  toolName: ToolName
  params: any
  callId: string
}

// ============================================================================
// Agent Execution Types
// ============================================================================

export type AgentPhase = 'plan' | 'execute' | 'analyze' | 'iterate' | 'respond'

export interface PlannedToolCall {
  name: string
  params: any
  rationale?: string  // Made optional to match relaxed schema
}

export interface AgentPlan {
  steps: string[]
  tools: PlannedToolCall[]
  expectedGaps?: string[]  // Made optional to match relaxed schema
  complexity?: number  // Made optional to match relaxed schema
  estimatedDuration?: number  // Made optional to match relaxed schema
}

export interface AgentAnalysis {
  synthesis: string
  keyFindings: string[]
  gaps: string[]
  needsMoreInfo: boolean
  refinedQuery?: string
  confidence: number
}

export interface AgentResultMetadata {
  sessionId: string | null
  iterations: number
  totalToolCalls: number
  confidence: number
  keyFindings?: string[]           // Key findings from the agent execution
  synthesis?: string               // Full synthesis text from analysis
  recommendations?: string[]       // AI recommendations
  responseKeyFindings?: string[]   // Key findings from final response
}

export interface AgentResult {
  success: boolean
  response: string
  sources: AgentSource[]
  toolCalls: ToolCall[]
  steps: AgentStep[]
  duration: number
  error?: string
  metadata?: AgentResultMetadata
}

export interface AgentStep {
  phase: AgentPhase
  description: string
  timestamp: number
  duration: number
  data: any
}

export interface AgentSource {
  title: string
  url?: string
  authors?: string[]
  year?: number
  relevance: number
  type?: 'paper' | 'patent' | 'dataset' | 'news' | 'report'
}

export interface AgentResponse {
  answer: string
  sources: AgentSource[]
  keyFindings: string[]
  recommendations: string[]
  confidence: number
}

// ============================================================================
// Status Update Types
// ============================================================================

export interface StatusUpdate {
  step: string
  phase: AgentPhase
  progress: number // 0-100
  message: string
  details?: Record<string, any>
  timestamp: number
}

export type StatusCallback = (status: StatusUpdate) => void

// ============================================================================
// Conversation & Session Types
// ============================================================================

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  timestamp: number
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
}

export interface ConversationSession {
  id: string
  userId: string
  messages: Message[]
  checkpoints: Checkpoint[]
  createdAt: number
  updatedAt: number
  metadata: SessionMetadata
}

export interface SessionMetadata {
  domain?: string
  complexity: number // 1-10
  estimatedTokens: number
  actualTokens: number
}

// ============================================================================
// Checkpoint Types
// ============================================================================

export interface Checkpoint {
  id: string
  sessionId: string
  step: number
  phase: AgentPhase
  context: CheckpointContext
  toolResults: ToolResult[]
  timestamp: number
  ttl: number // Time to live in seconds (default: 24 hours)
}

export interface CheckpointContext {
  query: string
  plan?: AgentPlan
  analysis?: AgentAnalysis
  intermediateResults: any[]
  messagesSnapshot: Message[]
  iterationCount?: number
  steps?: AgentStep[]
  toolCalls?: ToolCall[]
}

// ============================================================================
// Error Types
// ============================================================================

export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter: number // milliseconds
  ) {
    super(message)
    this.name = 'RateLimitError'
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public details: any
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class ToolExecutionError extends Error {
  constructor(
    message: string,
    public toolName: ToolName,
    public originalError: Error
  ) {
    super(message)
    this.name = 'ToolExecutionError'
  }
}

export class CheckpointError extends Error {
  constructor(
    message: string,
    public checkpointId?: string
  ) {
    super(message)
    this.name = 'CheckpointError'
  }
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface AgentConfig {
  maxIterations: number // Default: 5
  maxTokens: number // Default: 8000
  temperature: number // Default: 0.7
  timeout: number // milliseconds, Default: 60000 (1 min)
  enableCheckpointing: boolean // Default: true
  enableStreaming: boolean // Default: true
}

export interface RetryConfig {
  maxRetries: number // Default: 5
  initialDelay: number // milliseconds, Default: 1000
  maxDelay: number // milliseconds, Default: 16000
  backoffMultiplier: number // Default: 2
  retryableErrors: string[] // Error types to retry
}

export interface CircuitBreakerConfig {
  failureThreshold: number // Default: 5
  resetTimeout: number // milliseconds, Default: 60000
  halfOpenAttempts: number // Default: 1
}

// ============================================================================
// Rate Limiting Types
// ============================================================================

export type UserTier = 'free' | 'pro' | 'enterprise'

export interface UserRateLimit {
  userId: string
  tier: UserTier
  requestsPerMinute: number
  requestsPerDay: number
  currentMinuteCount: number
  currentDayCount: number
  windowStartMinute: number
  windowStartDay: number
}

export interface RateLimitInfo {
  allowed: boolean
  remaining: number
  resetAt: number // timestamp
  tier: UserTier
}

// ============================================================================
// Execution Context
// ============================================================================

export interface ExecutionContext {
  sessionId: string
  userId: string
  config: AgentConfig
  rateLimitInfo: RateLimitInfo
  onStatus?: StatusCallback
}

// ============================================================================
// Function Calling (Gemini API format)
// ============================================================================

export interface FunctionDeclaration {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, ParameterSchema>
    required: string[]
  }
}

export interface ParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  enum?: string[] // For string enums
  items?: ParameterSchema // For arrays
  properties?: Record<string, ParameterSchema> // For objects
}

export interface FunctionCall {
  name: string
  args: Record<string, any>
}

export interface FunctionResponse {
  name: string
  response: any
}

// ============================================================================
// Generate Result (for function calling)
// ============================================================================

export type GenerateResult =
  | { type: 'text'; content: string }
  | { type: 'function_call'; calls: FunctionCall[] }

// ============================================================================
// Export collections for convenience
// ============================================================================

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  maxIterations: 5,
  maxTokens: 8000,
  temperature: 0.7,
  timeout: 60000,
  enableCheckpointing: true,
  enableStreaming: true,
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  initialDelay: 1000,
  maxDelay: 16000,
  backoffMultiplier: 2,
  retryableErrors: ['RateLimitError', 'TimeoutError', 'NetworkError', '503', '429'],
}

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 60000,
  halfOpenAttempts: 1,
}

export const TIER_LIMITS: Record<UserTier, { rpm: number; rpd: number }> = {
  free: { rpm: 10, rpd: 100 },
  pro: { rpm: 60, rpd: 1500 },
  enterprise: { rpm: 300, rpd: 10000 },
}
