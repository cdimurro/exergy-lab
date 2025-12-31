'use client'

import { useState, useCallback, useMemo } from 'react'
import { create } from 'zustand'

// ============================================================================
// Types
// ============================================================================

export type SensitivityMethod = 'oat' | 'morris' | 'sobol'

export interface SensitivityParameter {
  id: string
  name: string
  baseline: number
  range: [number, number]
  unit: string
}

export interface SensitivityIndex {
  parameterId: string
  parameterName: string
  firstOrder: number
  totalOrder?: number
  influence: 'high' | 'medium' | 'low' | 'minimal'
  direction: 'positive' | 'negative' | 'mixed'
  elasticity?: number
}

export interface SensitivityResult {
  id: string
  method: SensitivityMethod
  baselineOutput: number
  indices: SensitivityIndex[]
  robustnessScore: number
  dominantParameter: string
  recommendations: string[]
  executionTime: number
}

export interface SensitivityConfig {
  domain: string
  simulationType: string
  method: SensitivityMethod
  parameters: SensitivityParameter[]
  outputMetric: string
  numSamples?: number
  perturbation?: number
}

export interface SensitivityAnalysisState {
  parameters: SensitivityParameter[]
  method: SensitivityMethod
  numSamples: number
  perturbation: number
  result: SensitivityResult | null
  isLoading: boolean
  error: string | null
  history: Array<{ id: string; timestamp: number; result: SensitivityResult }>

  // Actions
  setParameters: (parameters: SensitivityParameter[]) => void
  addParameter: (parameter: SensitivityParameter) => void
  removeParameter: (id: string) => void
  updateParameter: (id: string, updates: Partial<SensitivityParameter>) => void
  setMethod: (method: SensitivityMethod) => void
  setNumSamples: (samples: number) => void
  setPerturbation: (perturbation: number) => void
  setResult: (result: SensitivityResult | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  addToHistory: (result: SensitivityResult) => void
  clearHistory: () => void
  reset: () => void
}

// ============================================================================
// Store
// ============================================================================

const initialState = {
  parameters: [],
  method: 'oat' as SensitivityMethod,
  numSamples: 100,
  perturbation: 10,
  result: null,
  isLoading: false,
  error: null,
  history: [],
}

export const useSensitivityAnalysisStore = create<SensitivityAnalysisState>((set) => ({
  ...initialState,

  setParameters: (parameters) => set({ parameters }),

  addParameter: (parameter) =>
    set((state) => ({ parameters: [...state.parameters, parameter] })),

  removeParameter: (id) =>
    set((state) => ({
      parameters: state.parameters.filter((p) => p.id !== id),
    })),

  updateParameter: (id, updates) =>
    set((state) => ({
      parameters: state.parameters.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  setMethod: (method) => set({ method }),
  setNumSamples: (samples) => set({ numSamples: samples }),
  setPerturbation: (perturbation) => set({ perturbation }),
  setResult: (result) => set({ result }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  addToHistory: (result) =>
    set((state) => ({
      history: [
        { id: result.id, timestamp: Date.now(), result },
        ...state.history,
      ].slice(0, 20),
    })),

  clearHistory: () => set({ history: [] }),
  reset: () => set(initialState),
}))

// ============================================================================
// Method Descriptions
// ============================================================================

export const SENSITIVITY_METHODS: Record<SensitivityMethod, {
  name: string
  description: string
  complexity: string
  bestFor: string
  limitations: string
}> = {
  oat: {
    name: 'One-at-a-Time',
    description: 'Perturb each parameter individually around baseline',
    complexity: 'O(n)',
    bestFor: 'Quick screening, linear models',
    limitations: 'Misses parameter interactions',
  },
  morris: {
    name: 'Morris Screening',
    description: 'Elementary effects method with random trajectories',
    complexity: 'O(r*(n+1))',
    bestFor: 'Identifying non-influential parameters',
    limitations: 'Qualitative ranking only',
  },
  sobol: {
    name: 'Sobol Indices',
    description: 'Variance-based global sensitivity analysis',
    complexity: 'O(n*(k+2))',
    bestFor: 'Quantitative importance, interaction effects',
    limitations: 'Computationally expensive',
  },
}

// ============================================================================
// Hook
// ============================================================================

export function useSensitivityAnalysis() {
  const store = useSensitivityAnalysisStore()
  const [availableMethods, setAvailableMethods] = useState(SENSITIVITY_METHODS)

  // Fetch available methods from API
  const fetchMethods = useCallback(async () => {
    try {
      const response = await fetch('/api/simulations/sensitivity')

      if (!response.ok) {
        throw new Error('Failed to fetch sensitivity methods')
      }

      const data = await response.json()

      if (data.methods) {
        const methodMap: Record<SensitivityMethod, typeof SENSITIVITY_METHODS['oat']> = {} as any
        for (const m of data.methods) {
          methodMap[m.id as SensitivityMethod] = {
            name: m.name,
            description: m.description,
            complexity: m.complexity,
            bestFor: m.bestFor,
            limitations: m.limitations,
          }
        }
        setAvailableMethods(methodMap)
      }

      return data
    } catch (error) {
      // Use defaults if fetch fails
      return { methods: Object.values(SENSITIVITY_METHODS) }
    }
  }, [])

  // Run sensitivity analysis
  const analyze = useCallback(async (
    domain: string,
    simulationType: string,
    outputMetric: string,
    options?: {
      parameters?: SensitivityParameter[]
      method?: SensitivityMethod
      numSamples?: number
      perturbation?: number
    }
  ): Promise<SensitivityResult | null> => {
    store.setLoading(true)
    store.setError(null)

    const parameters = options?.parameters || store.parameters
    const method = options?.method || store.method
    const numSamples = options?.numSamples ?? store.numSamples
    const perturbation = options?.perturbation ?? store.perturbation

    if (parameters.length === 0) {
      store.setError('At least one parameter is required')
      store.setLoading(false)
      return null
    }

    try {
      const config: SensitivityConfig = {
        domain,
        simulationType,
        method,
        parameters,
        outputMetric,
        numSamples,
        perturbation,
      }

      const response = await fetch('/api/simulations/sensitivity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Sensitivity analysis failed')
      }

      const result = (await response.json()) as SensitivityResult

      store.setResult(result)
      store.addToHistory(result)

      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sensitivity analysis failed'
      store.setError(message)
      return null
    } finally {
      store.setLoading(false)
    }
  }, [store])

  // Create parameter from template
  const createParameter = useCallback((
    id: string,
    name: string,
    baseline: number,
    min: number,
    max: number,
    unit: string
  ): SensitivityParameter => {
    return {
      id,
      name,
      baseline,
      range: [min, max],
      unit,
    }
  }, [])

  // Get parameters sorted by influence
  const sortedIndices = useMemo(() => {
    if (!store.result) return []
    return [...store.result.indices].sort((a, b) => b.firstOrder - a.firstOrder)
  }, [store.result])

  // Get high-influence parameters
  const highInfluenceParams = useMemo(() => {
    return sortedIndices.filter((i) => i.influence === 'high')
  }, [sortedIndices])

  // Get minimal-influence parameters
  const minimalInfluenceParams = useMemo(() => {
    return sortedIndices.filter((i) => i.influence === 'minimal')
  }, [sortedIndices])

  // Check if analysis indicates robust system
  const isRobust = useMemo(() => {
    if (!store.result) return false
    return store.result.robustnessScore >= 70
  }, [store.result])

  // Get influence color
  const getInfluenceColor = useCallback((influence: 'high' | 'medium' | 'low' | 'minimal'): string => {
    switch (influence) {
      case 'high':
        return 'text-emerald-500 bg-emerald-500/10'
      case 'medium':
        return 'text-blue-500 bg-blue-500/10'
      case 'low':
        return 'text-amber-500 bg-amber-500/10'
      case 'minimal':
        return 'text-zinc-500 bg-zinc-500/10'
    }
  }, [])

  // Get direction color
  const getDirectionColor = useCallback((direction: 'positive' | 'negative' | 'mixed'): string => {
    switch (direction) {
      case 'positive':
        return 'text-green-500'
      case 'negative':
        return 'text-red-500'
      case 'mixed':
        return 'text-yellow-500'
    }
  }, [])

  // Estimate computation time
  const estimateTime = useCallback((
    method: SensitivityMethod,
    numParams: number,
    numSamples: number
  ): number => {
    // Time estimates in milliseconds
    switch (method) {
      case 'oat':
        return numParams * 2 * 50 // 50ms per simulation
      case 'morris':
        return numSamples * (numParams + 1) * 50
      case 'sobol':
        return numSamples * (numParams + 2) * 50
    }
  }, [])

  // Get recommended method based on parameters
  const getRecommendedMethod = useCallback((numParams: number): SensitivityMethod => {
    if (numParams <= 3) return 'sobol' // Full analysis for few params
    if (numParams <= 10) return 'morris' // Screening for moderate params
    return 'oat' // Quick screening for many params
  }, [])

  return {
    // State
    parameters: store.parameters,
    method: store.method,
    numSamples: store.numSamples,
    perturbation: store.perturbation,
    result: store.result,
    isLoading: store.isLoading,
    error: store.error,
    history: store.history,

    // Reference data
    availableMethods,
    methodDescriptions: SENSITIVITY_METHODS,

    // Computed
    sortedIndices,
    highInfluenceParams,
    minimalInfluenceParams,
    isRobust,

    // Actions
    setParameters: store.setParameters,
    addParameter: store.addParameter,
    removeParameter: store.removeParameter,
    updateParameter: store.updateParameter,
    setMethod: store.setMethod,
    setNumSamples: store.setNumSamples,
    setPerturbation: store.setPerturbation,
    reset: store.reset,
    clearHistory: store.clearHistory,

    // API functions
    fetchMethods,
    analyze,
    createParameter,
    estimateTime,
    getRecommendedMethod,

    // Helpers
    getInfluenceColor,
    getDirectionColor,
  }
}
