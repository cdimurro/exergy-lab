/**
 * Chat Interface Types
 *
 * Type definitions for the chat-first interface used across all feature pages.
 * Supports the Claude Code-style workflow: Query → Plan → Approve → Execute → Results
 */

import { ExecutionPlan, WorkflowResults, WorkflowStatusUpdate, PlanPhase } from './workflow'
import { Domain } from './discovery'

// ============================================================================
// Message Types
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system'

export type MessageContentType =
  | 'text'
  | 'plan'
  | 'execution'
  | 'results'
  | 'error'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  contentType: MessageContentType

  // Special content for assistant messages
  plan?: ExecutionPlan
  execution?: ExecutionStatus
  results?: WorkflowResults
  error?: ChatError

  // UI state
  isStreaming?: boolean
  isCollapsed?: boolean
}

export interface ChatError {
  message: string
  code?: string
  retryable: boolean
}

export interface ExecutionStatus {
  phase: string
  progress: number // 0-100
  currentStep: string
  toolCalls: ToolCallStatus[]
  startedAt: number
  estimatedCompletion?: number
}

export interface ToolCallStatus {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  duration?: number
  result?: string
  error?: string
}

// ============================================================================
// Workflow State
// ============================================================================

export type ChatWorkflowState =
  | 'idle'              // Ready for user input
  | 'thinking'          // AI generating plan
  | 'awaiting_approval' // Plan displayed, waiting for user
  | 'executing'         // Workflow running
  | 'completed'         // Results displayed
  | 'error'             // Error occurred, retry available

export interface ChatWorkflowContext {
  state: ChatWorkflowState
  workflowId: string | null
  sessionId: string | null
  plan: ExecutionPlan | null
  results: WorkflowResults | null
  error: ChatError | null
}

// ============================================================================
// Plan Modification
// ============================================================================

export interface PlanModification {
  phaseId: string
  parameter: string
  oldValue: any
  newValue: any
  reason?: string
}

export interface PlanApprovalAction {
  type: 'approve' | 'reject' | 'modify'
  modifications?: PlanModification[]
  reason?: string
}

// ============================================================================
// Quick Actions
// ============================================================================

export interface QuickAction {
  id: string
  label: string
  icon?: string
  value: string
  selected?: boolean
}

export interface DomainQuickAction extends QuickAction {
  domain: Domain
}

// ============================================================================
// Chat Interface Props
// ============================================================================

export interface ChatInterfaceProps {
  pageTitle: string
  pageSubtitle: string
  pageIcon?: React.ReactNode
  pageType: 'discovery' | 'search' | 'experiments' | 'simulations' | 'tea'

  // Optional configuration
  showDomainSelector?: boolean
  showFileUpload?: boolean
  domains?: Domain[]
  quickActions?: QuickAction[]
  placeholder?: string

  // Initial state
  initialMessages?: ChatMessage[]
  workflowId?: string

  // Optional callbacks
  onWorkflowComplete?: (results: any) => void
  onError?: (error: any) => void
}

export interface ChatSubmitContext {
  domains?: Domain[]
  goals?: string[]
  files?: File[]
  parameters?: Record<string, any>
}

// ============================================================================
// Chat Input Props
// ============================================================================

export interface ChatInputProps {
  onSubmit: (message: string, context?: ChatSubmitContext) => void
  disabled?: boolean
  isLoading?: boolean
  placeholder?: string
  showDomainSelector?: boolean
  domains?: Domain[]
  selectedDomains?: Domain[]
  onDomainToggle?: (domain: Domain) => void
  showFileUpload?: boolean
  onFileUpload?: (files: File[]) => void
  quickActions?: QuickAction[]
}

// ============================================================================
// Message Component Props
// ============================================================================

export interface ChatMessageProps {
  message: ChatMessage
  onPlanApprove?: (modifications?: PlanModification[]) => void
  onPlanReject?: (reason?: string) => void
  onPlanModify?: (phaseId: string, parameter: string, value: any) => void
  onRetry?: () => void
  onCancel?: () => void
  isLastMessage?: boolean
}

export interface PlanCardProps {
  plan: ExecutionPlan
  onApprove: (modifications?: PlanModification[]) => void
  onReject: (reason?: string) => void
  onModify: (phaseId: string, parameter: string, value: any) => void
  modifications?: PlanModification[]
  isLoading?: boolean
}

export interface ExecutionCardProps {
  status: ExecutionStatus
  onCancel?: () => void
}

export interface ResultsCardProps {
  results: WorkflowResults
  pageType: 'discovery' | 'search' | 'experiments' | 'simulations' | 'tea'
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate unique message ID
 */
export function generateMessageId(role: MessageRole): string {
  return `msg_${role}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
}

/**
 * Create a user message
 */
export function createUserMessage(content: string): ChatMessage {
  return {
    id: generateMessageId('user'),
    role: 'user',
    content,
    timestamp: Date.now(),
    contentType: 'text',
  }
}

/**
 * Create an assistant text message
 */
export function createAssistantMessage(content: string): ChatMessage {
  return {
    id: generateMessageId('assistant'),
    role: 'assistant',
    content,
    timestamp: Date.now(),
    contentType: 'text',
  }
}

/**
 * Create an assistant message with plan
 */
export function createPlanMessage(content: string, plan: ExecutionPlan): ChatMessage {
  return {
    id: generateMessageId('assistant'),
    role: 'assistant',
    content,
    timestamp: Date.now(),
    contentType: 'plan',
    plan,
  }
}

/**
 * Create an assistant message with execution status
 */
export function createExecutionMessage(status: ExecutionStatus): ChatMessage {
  return {
    id: generateMessageId('assistant'),
    role: 'assistant',
    content: `Executing: ${status.currentStep}`,
    timestamp: Date.now(),
    contentType: 'execution',
    execution: status,
    isStreaming: true,
  }
}

/**
 * Create an assistant message with results
 */
export function createResultsMessage(content: string, results: WorkflowResults): ChatMessage {
  return {
    id: generateMessageId('assistant'),
    role: 'assistant',
    content,
    timestamp: Date.now(),
    contentType: 'results',
    results,
  }
}

/**
 * Create an error message
 */
export function createErrorMessage(error: ChatError): ChatMessage {
  return {
    id: generateMessageId('assistant'),
    role: 'assistant',
    content: error.message,
    timestamp: Date.now(),
    contentType: 'error',
    error,
  }
}

/**
 * Create a system message
 */
export function createSystemMessage(content: string): ChatMessage {
  return {
    id: generateMessageId('system'),
    role: 'system',
    content,
    timestamp: Date.now(),
    contentType: 'text',
  }
}
