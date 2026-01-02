/**
 * Workflow Context Store (v0.6.0)
 *
 * Manages data flow between Search, Experiments, and Simulations pages.
 * Enables seamless workflow chaining:
 * Search -> Experiment -> Simulation -> TEA Report
 */

import { create } from 'zustand'
import type { Domain } from '@/types/discovery'

// ============================================================================
// Types
// ============================================================================

export interface SourcePaperContext {
  ids: string[]
  titles: string[]
  extractedParameters: Record<string, number>
  methodology?: string
  keywords: string[]
  authors: string[]
  citations: number
}

export interface ExperimentProtocolContext {
  id: string
  title: string
  domain: Domain
  materials: Array<{
    name: string
    quantity: string
    cost?: number
  }>
  parameters: Record<string, number>
  expectedOutcomes: string[]
  estimatedCost?: number
  estimatedDuration?: string
}

export interface SimulationResultsContext {
  id: string
  title: string
  domain: Domain
  tier: 'browser' | 'local' | 'cloud'
  metrics: Record<string, number>
  recommendations: string[]
  completedAt: string
}

export interface WorkflowContext {
  // Source data from each tool
  sourcePapers: SourcePaperContext | null
  experimentProtocol: ExperimentProtocolContext | null
  simulationResults: SimulationResultsContext | null

  // Navigation tracking
  lastTool: 'search' | 'experiments' | 'simulations' | 'tea' | null
  workflowStartedAt: string | null
}

interface WorkflowContextState extends WorkflowContext {
  // Actions
  setSourcePapers: (papers: SourcePaperContext) => void
  setExperimentProtocol: (protocol: ExperimentProtocolContext) => void
  setSimulationResults: (results: SimulationResultsContext) => void
  setLastTool: (tool: WorkflowContext['lastTool']) => void

  // Clear functions
  clearSourcePapers: () => void
  clearExperimentProtocol: () => void
  clearSimulationResults: () => void
  clearAll: () => void

  // Utility
  hasContext: () => boolean
  getWorkflowSummary: () => string
}

// ============================================================================
// Store
// ============================================================================

export const useWorkflowContext = create<WorkflowContextState>((set, get) => ({
  // Initial state
  sourcePapers: null,
  experimentProtocol: null,
  simulationResults: null,
  lastTool: null,
  workflowStartedAt: null,

  // Set source papers from Search
  setSourcePapers: (papers) =>
    set((state) => ({
      sourcePapers: papers,
      lastTool: 'search',
      workflowStartedAt: state.workflowStartedAt || new Date().toISOString(),
    })),

  // Set experiment protocol from Experiments
  setExperimentProtocol: (protocol) =>
    set((state) => ({
      experimentProtocol: protocol,
      lastTool: 'experiments',
      workflowStartedAt: state.workflowStartedAt || new Date().toISOString(),
    })),

  // Set simulation results from Simulations
  setSimulationResults: (results) =>
    set((state) => ({
      simulationResults: results,
      lastTool: 'simulations',
      workflowStartedAt: state.workflowStartedAt || new Date().toISOString(),
    })),

  // Set last tool visited
  setLastTool: (tool) => set({ lastTool: tool }),

  // Clear functions
  clearSourcePapers: () => set({ sourcePapers: null }),
  clearExperimentProtocol: () => set({ experimentProtocol: null }),
  clearSimulationResults: () => set({ simulationResults: null }),
  clearAll: () =>
    set({
      sourcePapers: null,
      experimentProtocol: null,
      simulationResults: null,
      lastTool: null,
      workflowStartedAt: null,
    }),

  // Check if any context exists
  hasContext: () => {
    const state = get()
    return !!(
      state.sourcePapers ||
      state.experimentProtocol ||
      state.simulationResults
    )
  },

  // Get workflow summary
  getWorkflowSummary: () => {
    const state = get()
    const parts: string[] = []

    if (state.sourcePapers) {
      parts.push(`${state.sourcePapers.ids.length} papers selected`)
    }
    if (state.experimentProtocol) {
      parts.push(`Protocol: ${state.experimentProtocol.title}`)
    }
    if (state.simulationResults) {
      parts.push(`Simulation: ${state.simulationResults.title}`)
    }

    return parts.length > 0 ? parts.join(' -> ') : 'No workflow context'
  },
}))

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract parameters from search results for simulation pre-population
 */
export function extractParametersFromPapers(
  papers: SourcePaperContext
): Record<string, number> {
  // Return any extracted parameters from the papers
  return papers.extractedParameters || {}
}

/**
 * Extract simulation parameters from experiment protocol
 */
export function extractParametersFromProtocol(
  protocol: ExperimentProtocolContext
): Record<string, number> {
  return protocol.parameters || {}
}

/**
 * Check if workflow should suggest next step
 */
export function getNextSuggestedStep(
  context: WorkflowContext
): 'experiments' | 'simulations' | 'tea' | null {
  if (context.sourcePapers && !context.experimentProtocol) {
    return 'experiments'
  }
  if (context.experimentProtocol && !context.simulationResults) {
    return 'simulations'
  }
  if (context.simulationResults) {
    return 'tea'
  }
  return null
}
