'use client'

/**
 * useSimulationWorkflow Hook
 *
 * Manages the AI-guided simulation workflow with plan generation, review, and execution.
 * Uses SSE streaming for real-time progress updates during plan generation and simulation.
 */

import { useState, useCallback, useRef, useEffect, useReducer } from 'react'
import type { SimulationTier, SimulationResult } from '@/types/simulation'
import type {
  WorkflowPhase,
  SimulationType,
  SimulationPlan,
  SimulationWorkflowState,
  WorkflowAction,
  StreamProgress,
  PlanGenerationEvent,
  SimulationPlanParameter,
  WorkflowExecutionProgress,
} from '@/types/simulation-workflow'

// ============================================================================
// Initial State
// ============================================================================

const initialProgress: WorkflowExecutionProgress = {
  phase: 'initialization',
  percentage: 0,
  message: '',
  estimatedTimeRemaining: null,
}

const initialStreamProgress: StreamProgress = {
  status: 'idle',
  percentage: 0,
  currentStep: '',
}

const initialState: SimulationWorkflowState = {
  phase: 'setup',
  tier: 'local',
  simulationType: null,
  detectedType: null,
  goal: '',
  plan: null,
  planProgress: initialStreamProgress,
  pendingChangeFeedback: null,
  isRegenerating: false,
  executionProgress: initialProgress,
  results: null,
  error: null,
  startTime: null,
  elapsedTime: 0,
  navigationHistory: ['setup'],
  canNavigateBack: false,
  canNavigateNext: false,
}

// ============================================================================
// Reducer
// ============================================================================

function workflowReducer(state: SimulationWorkflowState, action: WorkflowAction): SimulationWorkflowState {
  switch (action.type) {
    case 'SET_TIER':
      return { ...state, tier: action.payload }

    case 'SET_SIMULATION_TYPE':
      return { ...state, simulationType: action.payload }

    case 'SET_DETECTED_TYPE':
      return { ...state, detectedType: action.payload }

    case 'SET_GOAL':
      return { ...state, goal: action.payload }

    case 'START_PLAN_GENERATION':
      return {
        ...state,
        phase: 'generating',
        plan: null,
        planProgress: { status: 'streaming', percentage: 0, currentStep: 'Analyzing request...' },
        error: null,
        isRegenerating: false,
      }

    case 'UPDATE_PLAN_PROGRESS':
      return { ...state, planProgress: action.payload }

    case 'SET_PLAN':
      return {
        ...state,
        phase: 'review',
        plan: action.payload,
        planProgress: { status: 'complete', percentage: 100, currentStep: 'Complete' },
        detectedType: action.payload.detectedType || action.payload.simulationType,
      }

    case 'START_REGENERATION':
      return {
        ...state,
        phase: 'generating',
        pendingChangeFeedback: action.payload,
        planProgress: { status: 'streaming', percentage: 0, currentStep: 'Applying changes...' },
        isRegenerating: true,
        error: null,
      }

    case 'UPDATE_PARAMETER': {
      if (!state.plan) return state
      const updatedParams = state.plan.parameters.map(p =>
        p.id === action.payload.id ? { ...p, value: action.payload.value } : p
      )
      return {
        ...state,
        plan: { ...state.plan, parameters: updatedParams, version: state.plan.version + 1 },
      }
    }

    case 'APPROVE_PLAN':
      return {
        ...state,
        phase: 'executing',
        startTime: Date.now(),
        elapsedTime: 0,
        executionProgress: { ...initialProgress, phase: 'initialization', message: 'Starting simulation...' },
      }

    case 'START_EXECUTION':
      return {
        ...state,
        phase: 'executing',
        startTime: Date.now(),
        elapsedTime: 0,
        executionProgress: { ...initialProgress, phase: 'initialization', message: 'Initializing...' },
      }

    case 'UPDATE_EXECUTION_PROGRESS':
      return { ...state, executionProgress: action.payload }

    case 'SET_RESULTS':
      return {
        ...state,
        phase: 'complete',
        results: action.payload,
        executionProgress: { ...state.executionProgress, phase: 'finalization', percentage: 100 },
      }

    case 'SET_ERROR':
      return { ...state, phase: 'error', error: action.payload }

    case 'RESET':
      return { ...initialState }

    case 'TICK_ELAPSED_TIME':
      if (!state.startTime) return state
      return { ...state, elapsedTime: Date.now() - state.startTime }

    case 'NAVIGATE_TO_PHASE': {
      const targetPhase = action.payload
      // Only allow navigation between setup, review, and complete
      // Cannot navigate during generating or executing
      if (state.phase === 'generating' || state.phase === 'executing') {
        return state
      }
      return {
        ...state,
        phase: targetPhase,
        navigationHistory: [...state.navigationHistory, targetPhase],
      }
    }

    case 'UPDATE_NAVIGATION_STATE': {
      const canGoBack = state.phase === 'review' || state.phase === 'complete'
      const canGoNext = (state.phase === 'setup' && state.plan !== null) ||
                        (state.phase === 'review' && state.results !== null)
      return {
        ...state,
        canNavigateBack: canGoBack,
        canNavigateNext: canGoNext,
      }
    }

    default:
      return state
  }
}

// ============================================================================
// Hook Return Type
// ============================================================================

export interface UseSimulationWorkflowReturn {
  // State
  phase: WorkflowPhase
  tier: SimulationTier
  simulationType: SimulationType | null
  detectedType: SimulationType | null
  goal: string
  plan: SimulationPlan | null
  planProgress: StreamProgress
  isRegenerating: boolean
  executionProgress: WorkflowExecutionProgress
  results: SimulationResult | null
  error: string | null
  elapsedTime: number
  navigationHistory: WorkflowPhase[]
  canNavigateBack: boolean
  canNavigateNext: boolean

  // Setters
  setTier: (tier: SimulationTier) => void
  setSimulationType: (type: SimulationType | null) => void
  setGoal: (goal: string) => void
  updateParameter: (id: string, value: number | string) => void

  // Actions
  generatePlan: () => Promise<void>
  regeneratePlan: (feedback: string) => Promise<void>
  approvePlan: () => Promise<void>
  reset: () => void
  navigateToPhase: (phase: WorkflowPhase) => void
  navigateBack: () => void
  navigateNext: () => void

  // Computed
  canGenerate: boolean
  canApprove: boolean
  isGenerating: boolean
  isExecuting: boolean
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useSimulationWorkflow(): UseSimulationWorkflowReturn {
  const [state, dispatch] = useReducer(workflowReducer, initialState)

  // Refs for cleanup
  const eventSourceRef = useRef<EventSource | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Cleanup function
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  // Elapsed time ticker during execution
  useEffect(() => {
    if (state.phase === 'executing' && state.startTime) {
      timerRef.current = setInterval(() => {
        dispatch({ type: 'TICK_ELAPSED_TIME' })
      }, 1000)
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }
    }
  }, [state.phase, state.startTime])

  // ============================================================================
  // Setters
  // ============================================================================

  const setTier = useCallback((tier: SimulationTier) => {
    dispatch({ type: 'SET_TIER', payload: tier })
  }, [])

  const setSimulationType = useCallback((type: SimulationType | null) => {
    dispatch({ type: 'SET_SIMULATION_TYPE', payload: type })
  }, [])

  const setGoal = useCallback((goal: string) => {
    dispatch({ type: 'SET_GOAL', payload: goal })
  }, [])

  const updateParameter = useCallback((id: string, value: number | string) => {
    dispatch({ type: 'UPDATE_PARAMETER', payload: { id, value } })
  }, [])

  // ============================================================================
  // Plan Generation via SSE
  // ============================================================================

  const handlePlanSSE = useCallback((planId: string, isRegeneration: boolean) => {
    return new Promise<SimulationPlan>((resolve, reject) => {
      const url = `/api/simulations/generate-plan?planId=${planId}&stream=true`
      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as PlanGenerationEvent

          switch (data.type) {
            case 'progress':
              dispatch({
                type: 'UPDATE_PLAN_PROGRESS',
                payload: {
                  status: 'streaming',
                  percentage: data.percentage,
                  currentStep: data.status,
                },
              })
              break

            case 'type_detected':
              dispatch({ type: 'SET_DETECTED_TYPE', payload: data.simulationType })
              break

            case 'complete':
              dispatch({ type: 'SET_PLAN', payload: data.plan })
              eventSource.close()
              eventSourceRef.current = null
              resolve(data.plan)
              break

            case 'error':
              eventSource.close()
              eventSourceRef.current = null
              dispatch({ type: 'SET_ERROR', payload: data.error })
              reject(new Error(data.error))
              break
          }
        } catch (err) {
          console.error('[SimulationWorkflow] Failed to parse SSE event:', err, event.data)
        }
      }

      eventSource.onerror = (err) => {
        console.error('[SimulationWorkflow] SSE error:', err)
        eventSource.close()
        eventSourceRef.current = null
        dispatch({ type: 'SET_ERROR', payload: 'Connection lost to plan generation server' })
        reject(new Error('SSE connection failed'))
      }
    })
  }, [])

  const generatePlan = useCallback(async () => {
    if (!state.goal.trim() || state.goal.length < 20) {
      dispatch({ type: 'SET_ERROR', payload: 'Please provide a more detailed description (at least 20 characters)' })
      return
    }

    dispatch({ type: 'START_PLAN_GENERATION' })

    try {
      // POST to start plan generation
      const response = await fetch('/api/simulations/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: state.tier,
          simulationType: state.simulationType,
          goal: state.goal,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start plan generation')
      }

      const { planId } = await response.json()

      // Connect to SSE for streaming updates
      await handlePlanSSE(planId, false)
    } catch (err) {
      console.error('[SimulationWorkflow] Generate plan error:', err)
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : 'Unknown error' })
    }
  }, [state.tier, state.simulationType, state.goal, handlePlanSSE])

  const regeneratePlan = useCallback(async (feedback: string) => {
    if (!state.plan) {
      dispatch({ type: 'SET_ERROR', payload: 'No plan to modify' })
      return
    }

    dispatch({ type: 'START_REGENERATION', payload: feedback })

    try {
      // POST to modify plan
      const response = await fetch('/api/simulations/modify-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: state.plan.id,
          plan: state.plan,
          feedback,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to modify plan')
      }

      const modifiedPlan = await response.json()
      dispatch({ type: 'SET_PLAN', payload: modifiedPlan })
    } catch (err) {
      console.error('[SimulationWorkflow] Regenerate plan error:', err)
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : 'Unknown error' })
    }
  }, [state.plan])

  // ============================================================================
  // Plan Execution via SSE
  // ============================================================================

  const approvePlan = useCallback(async () => {
    if (!state.plan) {
      dispatch({ type: 'SET_ERROR', payload: 'No plan to execute' })
      return
    }

    dispatch({ type: 'APPROVE_PLAN' })

    try {
      // POST to start execution
      const response = await fetch('/api/simulations/execute-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: state.plan }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start execution')
      }

      const { executionId } = await response.json()

      // Connect to SSE for execution progress
      const url = `/api/simulations/execute-plan?executionId=${executionId}&stream=true`
      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'progress') {
            dispatch({
              type: 'UPDATE_EXECUTION_PROGRESS',
              payload: {
                phase: data.phase,
                percentage: data.percentage,
                message: data.message,
                estimatedTimeRemaining: data.eta || null,
              },
            })
          } else if (data.type === 'complete') {
            dispatch({ type: 'SET_RESULTS', payload: data.result })
            eventSource.close()
            eventSourceRef.current = null
          } else if (data.type === 'error') {
            dispatch({ type: 'SET_ERROR', payload: data.error })
            eventSource.close()
            eventSourceRef.current = null
          }
        } catch (err) {
          console.error('[SimulationWorkflow] Failed to parse execution SSE:', err)
        }
      }

      eventSource.onerror = (err) => {
        console.error('[SimulationWorkflow] Execution SSE error:', err)
        eventSource.close()
        eventSourceRef.current = null
        dispatch({ type: 'SET_ERROR', payload: 'Connection lost during simulation' })
      }
    } catch (err) {
      console.error('[SimulationWorkflow] Approve plan error:', err)
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : 'Unknown error' })
    }
  }, [state.plan])

  // ============================================================================
  // Reset
  // ============================================================================

  const reset = useCallback(() => {
    cleanup()
    dispatch({ type: 'RESET' })
  }, [cleanup])

  // ============================================================================
  // Navigation Methods
  // ============================================================================

  const navigateToPhase = useCallback((phase: WorkflowPhase) => {
    dispatch({ type: 'NAVIGATE_TO_PHASE', payload: phase })
    dispatch({ type: 'UPDATE_NAVIGATION_STATE' })
  }, [])

  const navigateBack = useCallback(() => {
    if (state.phase === 'review') {
      navigateToPhase('setup')
    } else if (state.phase === 'complete') {
      navigateToPhase('review')
    }
  }, [state.phase, navigateToPhase])

  const navigateNext = useCallback(() => {
    if (state.phase === 'setup' && state.plan) {
      navigateToPhase('review')
    } else if (state.phase === 'review' && state.results) {
      navigateToPhase('complete')
    }
  }, [state.phase, state.plan, state.results, navigateToPhase])

  // Update navigation state whenever relevant state changes
  useEffect(() => {
    dispatch({ type: 'UPDATE_NAVIGATION_STATE' })
  }, [state.phase, state.plan, state.results])

  // ============================================================================
  // Computed Values
  // ============================================================================

  const canGenerate = state.phase === 'setup' && state.goal.trim().length >= 20
  const canApprove = state.phase === 'review' && state.plan !== null
  const isGenerating = state.phase === 'generating'
  const isExecuting = state.phase === 'executing'

  return {
    // State
    phase: state.phase,
    tier: state.tier,
    simulationType: state.simulationType,
    detectedType: state.detectedType,
    goal: state.goal,
    plan: state.plan,
    planProgress: state.planProgress,
    isRegenerating: state.isRegenerating,
    executionProgress: state.executionProgress,
    results: state.results,
    error: state.error,
    elapsedTime: state.elapsedTime,
    navigationHistory: state.navigationHistory,
    canNavigateBack: state.canNavigateBack,
    canNavigateNext: state.canNavigateNext,

    // Setters
    setTier,
    setSimulationType,
    setGoal,
    updateParameter,

    // Actions
    generatePlan,
    regeneratePlan,
    approvePlan,
    reset,
    navigateToPhase,
    navigateBack,
    navigateNext,

    // Computed
    canGenerate,
    canApprove,
    isGenerating,
    isExecuting,
  }
}

export default useSimulationWorkflow
