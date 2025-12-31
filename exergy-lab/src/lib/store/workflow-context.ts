'use client'

import { create } from 'zustand'

// ============================================================================
// Types
// ============================================================================

export interface SourcePaper {
  id: string
  title: string
  authors: string[]
  year: number
  abstract?: string
  doi?: string
  url?: string
  extractedParameters?: Record<string, number>
  methodology?: string
  keyFindings?: string[]
}

export interface ExperimentContext {
  id: string
  title: string
  domain: string
  description: string
  materials?: Array<{ name: string; quantity: string; unit: string }>
  parameters?: Record<string, number>
  expectedOutcomes?: string[]
}

export interface SimulationContext {
  id: string
  type: string
  domain: string
  metrics?: Record<string, number>
  charts?: Array<{ type: string; data: unknown }>
  recommendations?: string[]
}

export interface WorkflowContext {
  // Source papers from search
  sourcePapers: SourcePaper[]

  // Experiment context
  experimentContext: ExperimentContext | null

  // Simulation context
  simulationContext: SimulationContext | null

  // Current workflow step
  currentStep: 'search' | 'experiments' | 'simulations' | 'tea' | null
}

interface WorkflowContextState extends WorkflowContext {
  // Actions
  addSourcePaper: (paper: SourcePaper) => void
  removeSourcePaper: (paperId: string) => void
  setSourcePapers: (papers: SourcePaper[]) => void
  clearSourcePapers: () => void

  setExperimentContext: (context: ExperimentContext | null) => void
  updateExperimentContext: (updates: Partial<ExperimentContext>) => void

  setSimulationContext: (context: SimulationContext | null) => void
  updateSimulationContext: (updates: Partial<SimulationContext>) => void

  setCurrentStep: (step: WorkflowContext['currentStep']) => void

  // Utility
  clearWorkflow: () => void
  hasContext: () => boolean
  getContextSummary: () => string
}

// ============================================================================
// Store
// ============================================================================

export const useWorkflowContext = create<WorkflowContextState>((set, get) => ({
  // Initial state
  sourcePapers: [],
  experimentContext: null,
  simulationContext: null,
  currentStep: null,

  // Source papers actions
  addSourcePaper: (paper) => {
    set((state) => ({
      sourcePapers: [...state.sourcePapers.filter((p) => p.id !== paper.id), paper],
    }))
  },

  removeSourcePaper: (paperId) => {
    set((state) => ({
      sourcePapers: state.sourcePapers.filter((p) => p.id !== paperId),
    }))
  },

  setSourcePapers: (papers) => {
    set({ sourcePapers: papers })
  },

  clearSourcePapers: () => {
    set({ sourcePapers: [] })
  },

  // Experiment context actions
  setExperimentContext: (context) => {
    set({ experimentContext: context })
  },

  updateExperimentContext: (updates) => {
    set((state) => ({
      experimentContext: state.experimentContext
        ? { ...state.experimentContext, ...updates }
        : null,
    }))
  },

  // Simulation context actions
  setSimulationContext: (context) => {
    set({ simulationContext: context })
  },

  updateSimulationContext: (updates) => {
    set((state) => ({
      simulationContext: state.simulationContext
        ? { ...state.simulationContext, ...updates }
        : null,
    }))
  },

  // Navigation
  setCurrentStep: (step) => {
    set({ currentStep: step })
  },

  // Utility
  clearWorkflow: () => {
    set({
      sourcePapers: [],
      experimentContext: null,
      simulationContext: null,
      currentStep: null,
    })
  },

  hasContext: () => {
    const state = get()
    return (
      state.sourcePapers.length > 0 ||
      state.experimentContext !== null ||
      state.simulationContext !== null
    )
  },

  getContextSummary: () => {
    const state = get()
    const parts: string[] = []

    if (state.sourcePapers.length > 0) {
      parts.push(`${state.sourcePapers.length} paper(s) selected`)
    }

    if (state.experimentContext) {
      parts.push(`Experiment: ${state.experimentContext.title}`)
    }

    if (state.simulationContext) {
      parts.push(`Simulation: ${state.simulationContext.type}`)
    }

    return parts.join(' | ') || 'No context'
  },
}))

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Get papers selected for workflow
 */
export function useSelectedPapers() {
  return useWorkflowContext((state) => state.sourcePapers)
}

/**
 * Get experiment context
 */
export function useExperimentContext() {
  return useWorkflowContext((state) => state.experimentContext)
}

/**
 * Get simulation context
 */
export function useSimulationContext() {
  return useWorkflowContext((state) => state.simulationContext)
}

/**
 * Check if workflow has any context
 */
export function useHasWorkflowContext() {
  return useWorkflowContext((state) => state.hasContext())
}
