'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  ChatMessage,
  ChatWorkflowState,
  ChatWorkflowContext,
  ChatSubmitContext,
  PlanModification,
  ExecutionStatus,
  ChatError,
  createUserMessage,
  createAssistantMessage,
  createPlanMessage,
  createExecutionMessage,
  createResultsMessage,
  createErrorMessage,
  generateMessageId,
} from '@/types/chat'
import { ExecutionPlan, WorkflowResults } from '@/types/workflow'

interface UseChatWorkflowOptions {
  pageType: 'discovery' | 'search' | 'experiments' | 'simulations' | 'tea'
  onWorkflowComplete?: (results: WorkflowResults) => void
  onError?: (error: ChatError) => void
}

interface UseChatWorkflowReturn {
  // State
  messages: ChatMessage[]
  workflowState: ChatWorkflowState
  context: ChatWorkflowContext
  isLoading: boolean

  // Actions
  sendMessage: (content: string, submitContext?: ChatSubmitContext) => Promise<void>
  approvePlan: (modifications?: PlanModification[]) => Promise<void>
  rejectPlan: (reason?: string) => void
  modifyPlan: (phaseId: string, parameter: string, value: any) => void
  cancelExecution: () => void
  retry: () => void
  reset: () => void

  // Plan modifications tracking
  modifications: PlanModification[]
}

export function useChatWorkflow(options: UseChatWorkflowOptions): UseChatWorkflowReturn {
  const { pageType, onWorkflowComplete, onError } = options

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [workflowState, setWorkflowState] = useState<ChatWorkflowState>('idle')
  const [isLoading, setIsLoading] = useState(false)
  const [modifications, setModifications] = useState<PlanModification[]>([])

  // Context refs
  const workflowIdRef = useRef<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const planRef = useRef<ExecutionPlan | null>(null)
  const resultsRef = useRef<WorkflowResults | null>(null)
  const errorRef = useRef<ChatError | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const lastQueryRef = useRef<string>('')
  const lastContextRef = useRef<ChatSubmitContext | undefined>(undefined)

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  // Add message helper
  const addMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message])
  }, [])

  // Update last message (for streaming)
  const updateLastMessage = useCallback((updates: Partial<ChatMessage>) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      return [...prev.slice(0, -1), { ...last, ...updates }]
    })
  }, [])

  // Send message and generate plan
  const sendMessage = useCallback(
    async (content: string, submitContext?: ChatSubmitContext) => {
      console.log('[useChatWorkflow] sendMessage called with:', { content: content?.substring(0, 50), hasContext: !!submitContext })

      if (!content.trim()) {
        console.log('[useChatWorkflow] sendMessage returning early - empty content')
        return
      }

      console.log('[useChatWorkflow] sendMessage proceeding with message')
      lastQueryRef.current = content
      lastContextRef.current = submitContext

      // Add user message
      addMessage(createUserMessage(content))

      // Add thinking message
      const thinkingMessage = createAssistantMessage('Analyzing your request...')
      thinkingMessage.isStreaming = true
      addMessage(thinkingMessage)

      setWorkflowState('thinking')
      setIsLoading(true)
      setModifications([])

      console.log('[useChatWorkflow] About to call API...')

      try {
        // Call API to generate plan
        console.log('[useChatWorkflow] Fetching /api/discovery/workflow...')
        const response = await fetch('/api/discovery/workflow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: content,
            domains: submitContext?.domains || [],
            goals: submitContext?.goals || [content],
            options: {
              targetAccuracy: 85,
              includeExperiments: pageType !== 'search',
              includeSimulations: pageType !== 'search' && pageType !== 'experiments',
              includeTEA: pageType === 'tea',
            },
          }),
        })

        console.log('[useChatWorkflow] API response status:', response.status)

        if (!response.ok) {
          throw new Error(`Failed to generate plan: ${response.statusText}`)
        }

        const data = await response.json()
        console.log('[useChatWorkflow] API response data:', { workflowId: data.workflowId, hasPlan: !!data.plan })
        workflowIdRef.current = data.workflowId
        planRef.current = data.plan

        // Update the thinking message with plan
        const planContent = `I've analyzed your request and created an execution plan. Here's what I'll do:`
        updateLastMessage({
          content: planContent,
          contentType: 'plan',
          plan: data.plan,
          isStreaming: false,
        })

        setWorkflowState('awaiting_approval')
      } catch (error) {
        const chatError: ChatError = {
          message: error instanceof Error ? error.message : 'Failed to generate plan',
          retryable: true,
        }
        errorRef.current = chatError

        updateLastMessage({
          content: chatError.message,
          contentType: 'error',
          error: chatError,
          isStreaming: false,
        })

        setWorkflowState('error')
        onError?.(chatError)
      } finally {
        setIsLoading(false)
      }
    },
    [pageType, addMessage, updateLastMessage, onError]
  )

  // Approve plan and start execution
  const approvePlan = useCallback(
    async (planModifications?: PlanModification[]) => {
      if (!workflowIdRef.current || !planRef.current) return

      const allModifications = planModifications || modifications

      // Add user approval message
      if (allModifications.length > 0) {
        addMessage(
          createUserMessage(
            `Plan approved with ${allModifications.length} modification${allModifications.length !== 1 ? 's' : ''}.`
          )
        )
      } else {
        addMessage(createUserMessage('Plan approved. Starting execution...'))
      }

      // Add execution status message
      const executionStatus: ExecutionStatus = {
        phase: 'Starting',
        progress: 0,
        currentStep: 'Initializing workflow...',
        toolCalls: [],
        startedAt: Date.now(),
      }
      addMessage(createExecutionMessage(executionStatus))

      setWorkflowState('executing')
      setIsLoading(true)

      try {
        // Call API to execute workflow
        const response = await fetch('/api/discovery/workflow', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workflowId: workflowIdRef.current,
            action: 'execute',
            modifications: allModifications,
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to execute workflow: ${response.statusText}`)
        }

        const data = await response.json()
        sessionIdRef.current = data.sessionId

        // Start SSE connection for real-time updates
        startSSEConnection(workflowIdRef.current)
      } catch (error) {
        const chatError: ChatError = {
          message: error instanceof Error ? error.message : 'Failed to execute workflow',
          retryable: true,
        }
        errorRef.current = chatError

        updateLastMessage({
          content: chatError.message,
          contentType: 'error',
          error: chatError,
          isStreaming: false,
        })

        setWorkflowState('error')
        setIsLoading(false)
        onError?.(chatError)
      }
    },
    [modifications, addMessage, updateLastMessage, onError]
  )

  // Start SSE connection for execution updates
  const startSSEConnection = useCallback(
    (workflowId: string) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      const eventSource = new EventSource(`/api/discovery/workflow?workflowId=${workflowId}`)
      eventSourceRef.current = eventSource

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'status') {
            // Update execution status
            const status: ExecutionStatus = {
              phase: data.phase || 'Executing',
              progress: data.progress || 0,
              currentStep: data.message || 'Processing...',
              toolCalls: data.toolCalls || [],
              startedAt: data.startedAt || Date.now(),
              estimatedCompletion: data.estimatedCompletion,
            }

            updateLastMessage({
              content: `Executing: ${status.currentStep}`,
              execution: status,
            })
          } else if (data.type === 'complete') {
            // Workflow completed
            eventSource.close()
            eventSourceRef.current = null

            resultsRef.current = data.results

            // Update last message to show results
            updateLastMessage({
              content: 'Workflow completed successfully. Here are your results:',
              contentType: 'results',
              results: data.results,
              execution: undefined,
              isStreaming: false,
            })

            setWorkflowState('completed')
            setIsLoading(false)
            onWorkflowComplete?.(data.results)
          } else if (data.type === 'error') {
            eventSource.close()
            eventSourceRef.current = null

            const chatError: ChatError = {
              message: data.error || 'Execution failed',
              retryable: true,
            }
            errorRef.current = chatError

            updateLastMessage({
              content: chatError.message,
              contentType: 'error',
              error: chatError,
              isStreaming: false,
            })

            setWorkflowState('error')
            setIsLoading(false)
            onError?.(chatError)
          }
        } catch (e) {
          console.error('Failed to parse SSE message:', e)
        }
      }

      eventSource.onerror = () => {
        // Connection error - could be temporary
        console.warn('SSE connection error, attempting reconnection...')
      }
    },
    [updateLastMessage, onWorkflowComplete, onError]
  )

  // Reject plan
  const rejectPlan = useCallback(
    (reason?: string) => {
      addMessage(createUserMessage(reason || 'Let me start over with a different approach.'))
      setWorkflowState('idle')
      planRef.current = null
      workflowIdRef.current = null
      setModifications([])
    },
    [addMessage]
  )

  // Modify plan parameter
  const modifyPlan = useCallback(
    (phaseId: string, parameter: string, value: any) => {
      if (!planRef.current) return

      // Find existing modification or create new
      setModifications((prev) => {
        const existingIndex = prev.findIndex(
          (m) => m.phaseId === phaseId && m.parameter === parameter
        )

        // Find original value
        const phase = planRef.current?.phases.find((p) => p.id === phaseId)
        const oldValue = phase?.parameters?.[parameter]

        const newMod: PlanModification = {
          phaseId,
          parameter,
          oldValue,
          newValue: value,
        }

        if (existingIndex >= 0) {
          const updated = [...prev]
          updated[existingIndex] = newMod
          return updated
        }

        return [...prev, newMod]
      })
    },
    []
  )

  // Cancel execution
  const cancelExecution = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    addMessage(createUserMessage('Execution cancelled.'))
    setWorkflowState('idle')
    setIsLoading(false)
  }, [addMessage])

  // Retry last action
  const retry = useCallback(() => {
    if (lastQueryRef.current) {
      sendMessage(lastQueryRef.current, lastContextRef.current)
    }
  }, [sendMessage])

  // Reset to initial state
  const reset = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setMessages([])
    setWorkflowState('idle')
    setIsLoading(false)
    setModifications([])
    workflowIdRef.current = null
    sessionIdRef.current = null
    planRef.current = null
    resultsRef.current = null
    errorRef.current = null
    lastQueryRef.current = ''
    lastContextRef.current = undefined
  }, [])

  // Build context object
  const context: ChatWorkflowContext = {
    state: workflowState,
    workflowId: workflowIdRef.current,
    sessionId: sessionIdRef.current,
    plan: planRef.current,
    results: resultsRef.current,
    error: errorRef.current,
  }

  return {
    messages,
    workflowState,
    context,
    isLoading,
    sendMessage,
    approvePlan,
    rejectPlan,
    modifyPlan,
    cancelExecution,
    retry,
    reset,
    modifications,
  }
}
