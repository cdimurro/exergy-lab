'use client'

import { useState, useCallback, useMemo } from 'react'
import { create } from 'zustand'
import type { CalculatorDefinition, CalculatorResult } from '@/lib/simulation/quick-calculators'

// ============================================================================
// Types
// ============================================================================

export interface CalculatorExecution {
  id: string
  calculatorId: string
  calculatorName: string
  domain: string
  inputs: Record<string, number>
  result: CalculatorResult
  formula?: string
  citation?: string
  timestamp: number
}

export interface QuickCalculatorState {
  availableCalculators: CalculatorDefinition[]
  executionHistory: CalculatorExecution[]
  favorites: string[]
  isLoading: boolean
  error: string | null

  // Actions
  setCalculators: (calculators: CalculatorDefinition[]) => void
  addExecution: (execution: CalculatorExecution) => void
  clearHistory: () => void
  toggleFavorite: (calculatorId: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

// ============================================================================
// Store
// ============================================================================

export const useQuickCalculatorStore = create<QuickCalculatorState>((set) => ({
  availableCalculators: [],
  executionHistory: [],
  favorites: [],
  isLoading: false,
  error: null,

  setCalculators: (calculators) => set({ availableCalculators: calculators }),

  addExecution: (execution) =>
    set((state) => ({
      executionHistory: [execution, ...state.executionHistory].slice(0, 50), // Keep last 50
    })),

  clearHistory: () => set({ executionHistory: [] }),

  toggleFavorite: (calculatorId) =>
    set((state) => ({
      favorites: state.favorites.includes(calculatorId)
        ? state.favorites.filter((id) => id !== calculatorId)
        : [...state.favorites, calculatorId],
    })),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}))

// ============================================================================
// Hook
// ============================================================================

export function useQuickCalculator() {
  const store = useQuickCalculatorStore()
  const [selectedCalculator, setSelectedCalculator] = useState<CalculatorDefinition | null>(null)
  const [inputs, setInputs] = useState<Record<string, number>>({})
  const [result, setResult] = useState<CalculatorResult | null>(null)

  // Fetch available calculators
  const fetchCalculators = useCallback(async (domain?: string) => {
    store.setLoading(true)
    store.setError(null)

    try {
      const url = domain
        ? `/api/simulations/quick-calc?domain=${encodeURIComponent(domain)}`
        : '/api/simulations/quick-calc'

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch calculators')
      }

      const data = await response.json()
      store.setCalculators(data.calculators)

      return data.calculators as CalculatorDefinition[]
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch calculators'
      store.setError(message)
      return []
    } finally {
      store.setLoading(false)
    }
  }, [store])

  // Execute a calculation
  const execute = useCallback(async (
    calculatorId: string,
    inputValues: Record<string, number>
  ): Promise<CalculatorResult | null> => {
    store.setLoading(true)
    store.setError(null)

    try {
      const response = await fetch('/api/simulations/quick-calc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calculatorId,
          inputs: inputValues,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Calculation failed')
      }

      const data = await response.json()

      // Store execution in history
      const execution: CalculatorExecution = {
        id: `exec_${Date.now()}`,
        calculatorId: data.calculatorId,
        calculatorName: data.calculatorName,
        domain: data.domain,
        inputs: data.inputs,
        result: data.result,
        formula: data.formula,
        citation: data.citation,
        timestamp: Date.now(),
      }

      store.addExecution(execution)
      setResult(data.result)

      return data.result as CalculatorResult
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Calculation failed'
      store.setError(message)
      return null
    } finally {
      store.setLoading(false)
    }
  }, [store])

  // Select a calculator and initialize inputs with defaults
  const selectCalculator = useCallback((calculator: CalculatorDefinition) => {
    setSelectedCalculator(calculator)

    // Initialize inputs with default values
    const defaultInputs: Record<string, number> = {}
    for (const input of calculator.inputs) {
      defaultInputs[input.id] = input.defaultValue ?? 0
    }
    setInputs(defaultInputs)
    setResult(null)
  }, [])

  // Update a single input value
  const updateInput = useCallback((inputId: string, value: number) => {
    setInputs((prev) => ({
      ...prev,
      [inputId]: value,
    }))
  }, [])

  // Run calculation with current inputs
  const runCalculation = useCallback(async () => {
    if (!selectedCalculator) return null
    return execute(selectedCalculator.id, inputs)
  }, [selectedCalculator, inputs, execute])

  // Get calculators grouped by domain
  const calculatorsByDomain = useMemo(() => {
    const grouped: Record<string, CalculatorDefinition[]> = {}

    for (const calc of store.availableCalculators) {
      if (!grouped[calc.domain]) {
        grouped[calc.domain] = []
      }
      grouped[calc.domain].push(calc)
    }

    return grouped
  }, [store.availableCalculators])

  // Get favorite calculators
  const favoriteCalculators = useMemo(() => {
    return store.availableCalculators.filter((calc) =>
      store.favorites.includes(calc.id)
    )
  }, [store.availableCalculators, store.favorites])

  // Get recent executions for a specific calculator
  const getRecentExecutions = useCallback((calculatorId: string) => {
    return store.executionHistory.filter((exec) => exec.calculatorId === calculatorId)
  }, [store.executionHistory])

  return {
    // State
    availableCalculators: store.availableCalculators,
    executionHistory: store.executionHistory,
    favorites: store.favorites,
    isLoading: store.isLoading,
    error: store.error,

    // Current calculator state
    selectedCalculator,
    inputs,
    result,

    // Computed
    calculatorsByDomain,
    favoriteCalculators,

    // Actions
    fetchCalculators,
    execute,
    selectCalculator,
    updateInput,
    runCalculation,
    toggleFavorite: store.toggleFavorite,
    clearHistory: store.clearHistory,
    getRecentExecutions,
  }
}
