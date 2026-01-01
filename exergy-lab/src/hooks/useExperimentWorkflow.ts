/**
 * Experiment Workflow Hook
 *
 * Manages the AI-guided experiment design workflow state machine.
 * Phases: Setup → Generating → Review → Validating → Complete
 */

import { useReducer, useCallback, useRef, useEffect } from 'react'
import type {
  ExperimentWorkflowState,
  ExperimentWorkflowAction,
  ExperimentWorkflowPhase,
  ExperimentDomain,
  ExperimentPlan,
  Material,
  ExperimentStep,
  SavedExperiment,
  ProtocolValidation,
  StreamProgress,
  ValidationProgress,
  SourcePaperContext,
} from '@/types/experiment-workflow'
import type { FailureAnalysis } from '@/types/experiment'

// ============================================================================
// Initial State
// ============================================================================

const initialState: ExperimentWorkflowState = {
  phase: 'setup',
  domain: null,
  goal: '',
  objectives: [],
  sourcePapers: undefined,
  planProgress: { percentage: 0, status: '' },
  isGenerating: false,
  plan: null,
  validationProgress: { phase: 'literature', percentage: 0, message: '' },
  isValidating: false,
  validation: null,
  failureAnalysis: null,
  keyFindings: [],
  startedAt: null,
  completedAt: null,
  error: null,
}

// ============================================================================
// Reducer
// ============================================================================

function workflowReducer(
  state: ExperimentWorkflowState,
  action: ExperimentWorkflowAction
): ExperimentWorkflowState {
  switch (action.type) {
    case 'SET_DOMAIN':
      return { ...state, domain: action.payload, error: null }

    case 'SET_GOAL':
      return { ...state, goal: action.payload, error: null }

    case 'SET_OBJECTIVES':
      return { ...state, objectives: action.payload, error: null }

    case 'SET_SOURCE_PAPERS':
      return { ...state, sourcePapers: action.payload }

    case 'START_PLAN_GENERATION':
      return {
        ...state,
        phase: 'generating',
        isGenerating: true,
        planProgress: { percentage: 0, status: 'Initializing...' },
        startedAt: state.startedAt || new Date().toISOString(),
        error: null,
      }

    case 'UPDATE_PLAN_PROGRESS':
      return {
        ...state,
        planProgress: action.payload,
      }

    case 'SET_PLAN':
      return {
        ...state,
        phase: 'review',
        isGenerating: false,
        plan: action.payload,
        planProgress: { percentage: 100, status: 'Complete' },
      }

    case 'UPDATE_MATERIAL':
      if (!state.plan) return state
      const updatedMaterials = [...state.plan.materials]
      updatedMaterials[action.payload.index] = action.payload.material
      return {
        ...state,
        plan: { ...state.plan, materials: updatedMaterials },
      }

    case 'UPDATE_STEP':
      if (!state.plan) return state
      const updatedSteps = [...state.plan.steps]
      updatedSteps[action.payload.index] = action.payload.step
      return {
        ...state,
        plan: { ...state.plan, steps: updatedSteps },
      }

    case 'ADD_MATERIAL':
      if (!state.plan) return state
      return {
        ...state,
        plan: {
          ...state.plan,
          materials: [...state.plan.materials, action.payload],
        },
      }

    case 'REMOVE_MATERIAL':
      if (!state.plan) return state
      return {
        ...state,
        plan: {
          ...state.plan,
          materials: state.plan.materials.filter((_, i) => i !== action.payload),
        },
      }

    case 'ADD_STEP':
      if (!state.plan) return state
      return {
        ...state,
        plan: {
          ...state.plan,
          steps: [...state.plan.steps, action.payload],
        },
      }

    case 'REMOVE_STEP':
      if (!state.plan) return state
      return {
        ...state,
        plan: {
          ...state.plan,
          steps: state.plan.steps.filter((_, i) => i !== action.payload),
        },
      }

    case 'APPROVE_PLAN':
      return {
        ...state,
        phase: 'validating',
      }

    case 'START_VALIDATION':
      return {
        ...state,
        phase: 'validating',
        isValidating: true,
        validationProgress: { phase: 'literature', percentage: 0, message: 'Starting validation...' },
        error: null,
      }

    case 'UPDATE_VALIDATION_PROGRESS':
      return {
        ...state,
        validationProgress: action.payload,
      }

    case 'SET_VALIDATION':
      return {
        ...state,
        phase: 'complete',
        isValidating: false,
        validation: action.payload,
        validationProgress: { phase: 'complete', percentage: 100, message: 'Validation complete' },
        completedAt: new Date().toISOString(),
      }

    case 'SET_FAILURE_ANALYSIS':
      return {
        ...state,
        failureAnalysis: action.payload,
      }

    case 'SET_KEY_FINDINGS':
      return {
        ...state,
        keyFindings: action.payload,
      }

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isGenerating: false,
        isValidating: false,
      }

    case 'RESET':
      return initialState

    case 'LOAD_SAVED':
      return {
        phase: 'complete',
        domain: action.payload.domain,
        goal: action.payload.goal,
        objectives: action.payload.objectives,
        sourcePapers: undefined,
        planProgress: { percentage: 100, status: 'Loaded' },
        isGenerating: false,
        plan: action.payload.plan,
        validationProgress: { phase: 'complete', percentage: 100, message: 'Loaded' },
        isValidating: false,
        validation: action.payload.validation,
        failureAnalysis: action.payload.failureAnalysis || null,
        keyFindings: [],
        startedAt: action.payload.plan.generatedAt,
        completedAt: action.payload.savedAt,
        error: null,
      }

    default:
      return state
  }
}

// ============================================================================
// Hook
// ============================================================================

export function useExperimentWorkflow() {
  const [state, dispatch] = useReducer(workflowReducer, initialState)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Cleanup event source on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [])

  // ============================================================================
  // Actions
  // ============================================================================

  const setDomain = useCallback((domain: ExperimentDomain) => {
    dispatch({ type: 'SET_DOMAIN', payload: domain })
  }, [])

  const setGoal = useCallback((goal: string) => {
    dispatch({ type: 'SET_GOAL', payload: goal })
  }, [])

  const setObjectives = useCallback((objectives: string[]) => {
    dispatch({ type: 'SET_OBJECTIVES', payload: objectives })
  }, [])

  const setSourcePapers = useCallback((papers: SourcePaperContext) => {
    dispatch({ type: 'SET_SOURCE_PAPERS', payload: papers })
  }, [])

  const generatePlan = useCallback(async () => {
    try {
      dispatch({ type: 'START_PLAN_GENERATION' })

      // Close any existing event source
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }

      // Start plan generation
      const response = await fetch('/api/experiments/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: state.domain,
          goal: state.goal,
          objectives: state.objectives,
          sourcePapers: state.sourcePapers,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to start plan generation')
      }

      const { planId } = await response.json()

      // Set up SSE stream
      const eventSource = new EventSource(
        `/api/experiments/generate-plan?planId=${planId}&stream=true`
      )
      eventSourceRef.current = eventSource

      eventSource.addEventListener('progress', (e) => {
        const data = JSON.parse((e as MessageEvent).data)
        dispatch({
          type: 'UPDATE_PLAN_PROGRESS',
          payload: { percentage: data.percentage, status: data.status },
        })
      })

      eventSource.addEventListener('complete', (e) => {
        const { plan } = JSON.parse((e as MessageEvent).data)
        dispatch({ type: 'SET_PLAN', payload: plan })
        eventSource.close()
        eventSourceRef.current = null
      })

      eventSource.addEventListener('error', (e) => {
        const messageEvent = e as MessageEvent
        const errorData = messageEvent.data ? JSON.parse(messageEvent.data) : { error: 'Unknown error' }
        dispatch({ type: 'SET_ERROR', payload: errorData.error })
        eventSource.close()
        eventSourceRef.current = null
      })
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to generate plan',
      })
    }
  }, [state.domain, state.goal, state.objectives, state.sourcePapers])

  const updateMaterial = useCallback((index: number, material: Material) => {
    dispatch({ type: 'UPDATE_MATERIAL', payload: { index, material } })
  }, [])

  const updateStep = useCallback((index: number, step: ExperimentStep) => {
    dispatch({ type: 'UPDATE_STEP', payload: { index, step } })
  }, [])

  const addMaterial = useCallback((material: Material) => {
    dispatch({ type: 'ADD_MATERIAL', payload: material })
  }, [])

  const removeMaterial = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_MATERIAL', payload: index })
  }, [])

  const addStep = useCallback((step: ExperimentStep) => {
    dispatch({ type: 'ADD_STEP', payload: step })
  }, [])

  const removeStep = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_STEP', payload: index })
  }, [])

  const approvePlan = useCallback(() => {
    dispatch({ type: 'APPROVE_PLAN' })
  }, [])

  const validateProtocol = useCallback(async () => {
    if (!state.plan) return

    try {
      dispatch({ type: 'START_VALIDATION' })

      // Close any existing event source
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }

      // Start validation
      const response = await fetch('/api/experiments/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: state.plan,
          sourcePapers: state.sourcePapers,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to start validation')
      }

      const { validationId } = await response.json()

      // Set up SSE stream
      const eventSource = new EventSource(
        `/api/experiments/validate?validationId=${validationId}&stream=true`
      )
      eventSourceRef.current = eventSource

      eventSource.addEventListener('progress', (e) => {
        const data = JSON.parse((e as MessageEvent).data)
        dispatch({
          type: 'UPDATE_VALIDATION_PROGRESS',
          payload: {
            phase: data.phase,
            percentage: data.percentage,
            message: data.message,
          },
        })
      })

      eventSource.addEventListener('complete', (e) => {
        const { validation } = JSON.parse((e as MessageEvent).data)
        dispatch({ type: 'SET_VALIDATION', payload: validation })
        eventSource.close()
        eventSourceRef.current = null
      })

      eventSource.addEventListener('error', (e) => {
        const messageEvent = e as MessageEvent
        const errorData = messageEvent.data ? JSON.parse(messageEvent.data) : { error: 'Unknown error' }
        dispatch({ type: 'SET_ERROR', payload: errorData.error })
        eventSource.close()
        eventSourceRef.current = null
      })
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to validate protocol',
      })
    }
  }, [state.plan, state.sourcePapers])

  const reset = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    dispatch({ type: 'RESET' })
  }, [])

  const loadSavedExperiment = useCallback((experiment: SavedExperiment) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    dispatch({ type: 'LOAD_SAVED', payload: experiment })
  }, [])

  // ============================================================================
  // Computed Values
  // ============================================================================

  const canGenerate = state.phase === 'setup' && !!state.domain && !!state.goal.trim()

  const canApprove = state.phase === 'review' && !!state.plan

  const canValidate = state.phase === 'validating' && !!state.plan && !state.isValidating

  const canSave = state.phase === 'complete' && !!state.plan && !!state.validation

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    phase: state.phase,
    domain: state.domain,
    goal: state.goal,
    objectives: state.objectives,
    sourcePapers: state.sourcePapers,
    plan: state.plan,
    planProgress: state.planProgress,
    validation: state.validation,
    validationProgress: state.validationProgress,
    failureAnalysis: state.failureAnalysis,
    keyFindings: state.keyFindings,
    error: state.error,
    isGenerating: state.isGenerating,
    isValidating: state.isValidating,
    startedAt: state.startedAt,
    completedAt: state.completedAt,

    // Actions
    setDomain,
    setGoal,
    setObjectives,
    setSourcePapers,
    generatePlan,
    updateMaterial,
    updateStep,
    addMaterial,
    removeMaterial,
    addStep,
    removeStep,
    approvePlan,
    validateProtocol,
    reset,
    loadSavedExperiment,
    dispatch,

    // Computed
    canGenerate,
    canApprove,
    canValidate,
    canSave,
  }
}

export type UseExperimentWorkflowReturn = ReturnType<typeof useExperimentWorkflow>
