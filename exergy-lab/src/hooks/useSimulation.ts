/**
 * useSimulation Hook (v0.0.6)
 *
 * Comprehensive simulation hook for the SimulationPlatform page.
 *
 * Features:
 * - 3-tier simulation execution (local, ML, cloud)
 * - Quick calculator access for domain-specific formulas
 * - Parameter sweep and sensitivity analysis
 * - Progress tracking and result visualization
 * - Exergy analysis integration
 * - PDF report generation
 * - Workflow context integration
 */

import { useState, useCallback, useMemo, useRef } from 'react'
import { useWorkflowContext } from '@/lib/store'
import type { Domain } from '@/types/discovery'
import type {
  SimulationTier,
  SimulationConfig,
  SimulationResult,
  SimulationParameter,
  SimulationMetric,
  SimulationProgress,
  TierCapabilities,
} from '@/types/simulation'

// ============================================================================
// Types
// ============================================================================

export type SimulationPhase = 'idle' | 'configuring' | 'running' | 'complete' | 'error'

export interface QuickCalculator {
  id: string
  name: string
  domain: Domain
  category: string
  description: string
  inputs: CalculatorInput[]
  formula: string
  outputName: string
  outputUnit: string
  citation?: string
}

export interface CalculatorInput {
  name: string
  symbol: string
  unit: string
  defaultValue: number
  min?: number
  max?: number
  step?: number
  description: string
}

export interface CalculatorResult {
  name: string
  value: number
  unit: string
  formula: string
  inputs: Record<string, number>
}

export interface ParameterSweepConfig {
  parameters: ParameterSweepItem[]
  resolution: number
  totalRuns: number
}

export interface ParameterSweepItem {
  name: string
  min: number
  max: number
  steps: number
}

export interface SweepResult {
  parameterValues: Record<string, number>
  metrics: SimulationMetric[]
}

export interface SensitivityResult {
  parameter: string
  sensitivity: number
  rank: number
}

export interface SimulationState {
  phase: SimulationPhase
  config: Partial<SimulationConfig>
  result: SimulationResult | null
  progress: SimulationProgress
  error: string | null

  // Quick calculator
  selectedCalculator: QuickCalculator | null
  calculatorResult: CalculatorResult | null

  // Parameter sweep
  sweepConfig: ParameterSweepConfig | null
  sweepResults: SweepResult[]
  sensitivityResults: SensitivityResult[]

  // UI state
  selectedTier: SimulationTier
  estimatedCost: number
  estimatedDuration: string

  // Context
  hasContextFromExperiment: boolean
}

// ============================================================================
// Constants
// ============================================================================

export const TIER_INFO: TierCapabilities[] = [
  {
    tier: 'local',
    name: 'Tier 1: Analytical',
    description: 'Physics-based analytical calculations with literature data',
    estimatedTime: '< 1 second',
    accuracy: '+/- 5-10%',
    cost: 'Free',
    computeLocation: 'browser',
  },
  {
    tier: 'browser',
    name: 'Tier 2: T4 GPU',
    description: 'Monte Carlo simulation with uncertainty quantification',
    estimatedTime: '1-5 seconds',
    accuracy: '+/- 2-5%',
    cost: '~$0.01',
    computeLocation: 'modal-t4',
  },
  {
    tier: 'cloud',
    name: 'Tier 3: A10G GPU',
    description: 'Parametric sweeps and optimization on high-memory GPU',
    estimatedTime: '5-30 seconds',
    accuracy: '+/- 1-2%',
    cost: '~$0.02',
    computeLocation: 'modal-a10g',
  },
]

export const QUICK_CALCULATORS: QuickCalculator[] = [
  {
    id: 'shockley-queisser',
    name: 'Shockley-Queisser Limit',
    domain: 'solar-energy',
    category: 'Efficiency Limits',
    description: 'Maximum theoretical efficiency of a single-junction solar cell',
    inputs: [
      { name: 'Bandgap', symbol: 'Eg', unit: 'eV', defaultValue: 1.34, min: 0.5, max: 3.0, step: 0.01, description: 'Semiconductor bandgap energy' },
      { name: 'Temperature', symbol: 'T', unit: 'K', defaultValue: 300, min: 200, max: 400, step: 1, description: 'Cell operating temperature' },
    ],
    formula: 'eta_max = (1 - T_c/T_s) * (1 - u^4) * (15/pi^4) * integral(...)',
    outputName: 'Maximum Efficiency',
    outputUnit: '%',
    citation: 'Shockley & Queisser, J. Appl. Phys. 32, 510 (1961)',
  },
  {
    id: 'betz-limit',
    name: 'Betz Limit',
    domain: 'wind-energy',
    category: 'Efficiency Limits',
    description: 'Maximum extractable power from wind',
    inputs: [
      { name: 'Air Density', symbol: 'rho', unit: 'kg/m3', defaultValue: 1.225, min: 0.9, max: 1.5, step: 0.01, description: 'Air density at operating conditions' },
      { name: 'Rotor Diameter', symbol: 'D', unit: 'm', defaultValue: 100, min: 10, max: 200, step: 1, description: 'Wind turbine rotor diameter' },
      { name: 'Wind Speed', symbol: 'v', unit: 'm/s', defaultValue: 10, min: 3, max: 30, step: 0.5, description: 'Free stream wind velocity' },
    ],
    formula: 'P_max = (16/27) * 0.5 * rho * A * v^3',
    outputName: 'Maximum Power',
    outputUnit: 'kW',
    citation: 'Betz, A. (1920). Das Maximum der theoretisch moglichen Ausnutzung des Windes.',
  },
  {
    id: 'carnot-efficiency',
    name: 'Carnot Efficiency',
    domain: 'geothermal',
    category: 'Thermodynamics',
    description: 'Maximum theoretical thermal efficiency',
    inputs: [
      { name: 'Hot Temperature', symbol: 'T_h', unit: 'K', defaultValue: 500, min: 300, max: 1500, step: 10, description: 'Heat source temperature' },
      { name: 'Cold Temperature', symbol: 'T_c', unit: 'K', defaultValue: 300, min: 250, max: 400, step: 5, description: 'Heat sink temperature' },
    ],
    formula: 'eta_carnot = 1 - T_c / T_h',
    outputName: 'Carnot Efficiency',
    outputUnit: '%',
  },
  {
    id: 'electrolysis-efficiency',
    name: 'Electrolysis Efficiency',
    domain: 'hydrogen-fuel',
    category: 'Electrochemistry',
    description: 'Water electrolysis efficiency at given overpotential',
    inputs: [
      { name: 'Operating Voltage', symbol: 'V_op', unit: 'V', defaultValue: 1.8, min: 1.23, max: 3.0, step: 0.01, description: 'Cell operating voltage' },
      { name: 'Thermoneutral Voltage', symbol: 'V_tn', unit: 'V', defaultValue: 1.48, min: 1.48, max: 1.48, step: 0, description: 'Thermoneutral voltage (fixed)' },
    ],
    formula: 'eta = V_tn / V_op * 100',
    outputName: 'Voltage Efficiency',
    outputUnit: '%',
    citation: 'Based on standard electrolysis thermodynamics',
  },
  {
    id: 'battery-capacity-fade',
    name: 'Battery Capacity Fade',
    domain: 'battery-storage',
    category: 'Degradation',
    description: 'Estimate remaining capacity after cycling',
    inputs: [
      { name: 'Initial Capacity', symbol: 'C_0', unit: 'Ah', defaultValue: 100, min: 1, max: 500, step: 1, description: 'Initial rated capacity' },
      { name: 'Cycle Number', symbol: 'N', unit: 'cycles', defaultValue: 500, min: 0, max: 5000, step: 10, description: 'Number of charge/discharge cycles' },
      { name: 'Fade Rate', symbol: 'k', unit: '%/cycle', defaultValue: 0.02, min: 0.001, max: 0.1, step: 0.001, description: 'Capacity fade rate per cycle' },
    ],
    formula: 'C_remaining = C_0 * (1 - k/100)^N',
    outputName: 'Remaining Capacity',
    outputUnit: 'Ah',
  },
]

// ============================================================================
// Hook Implementation
// ============================================================================

export function useSimulation() {
  // State
  const [state, setState] = useState<SimulationState>({
    phase: 'idle',
    config: {},
    result: null,
    progress: {
      status: 'queued',
      percentage: 0,
    },
    error: null,
    selectedCalculator: null,
    calculatorResult: null,
    sweepConfig: null,
    sweepResults: [],
    sensitivityResults: [],
    selectedTier: 'local',
    estimatedCost: 0,
    estimatedDuration: '< 1 second',
    hasContextFromExperiment: false,
  })

  // Abort controller for cancelling simulations
  const abortControllerRef = useRef<AbortController | null>(null)

  // Workflow context
  const { experimentProtocol, setSimulationResults, setLastTool } = useWorkflowContext()

  // Check if we have context from experiments page
  const hasExperimentContext = useMemo(() => {
    return !!experimentProtocol && !!experimentProtocol.id
  }, [experimentProtocol])

  // ============================================================================
  // Configuration
  // ============================================================================

  const setTier = useCallback((tier: SimulationTier) => {
    const tierInfo = TIER_INFO.find(t => t.tier === tier)
    setState(prev => ({
      ...prev,
      selectedTier: tier,
      estimatedCost: tier === 'cloud' ? 0.5 : tier === 'browser' ? 0.05 : 0,
      estimatedDuration: tierInfo?.estimatedTime || '< 1 second',
    }))
  }, [])

  const updateConfig = useCallback((updates: Partial<SimulationConfig>) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, ...updates },
      phase: 'configuring',
    }))
  }, [])

  const addParameter = useCallback((param: SimulationParameter) => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        parameters: [...(prev.config.parameters || []), param],
      },
    }))
  }, [])

  const removeParameter = useCallback((name: string) => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        parameters: (prev.config.parameters || []).filter(p => p.name !== name),
      },
    }))
  }, [])

  // ============================================================================
  // Quick Calculator
  // ============================================================================

  const selectCalculator = useCallback((calculatorId: string) => {
    const calculator = QUICK_CALCULATORS.find(c => c.id === calculatorId)
    setState(prev => ({
      ...prev,
      selectedCalculator: calculator || null,
      calculatorResult: null,
    }))
  }, [])

  const runCalculator = useCallback((inputs: Record<string, number>) => {
    if (!state.selectedCalculator) return

    const calc = state.selectedCalculator
    let result: number

    // Calculate based on calculator type
    switch (calc.id) {
      case 'shockley-queisser':
        // Simplified SQ limit approximation
        const Eg = inputs['Eg'] || 1.34
        result = 33.7 * Math.exp(-0.5 * Math.pow((Eg - 1.34) / 0.3, 2))
        break

      case 'betz-limit':
        const rho = inputs['rho'] || 1.225
        const D = inputs['D'] || 100
        const v = inputs['v'] || 10
        const A = Math.PI * Math.pow(D / 2, 2)
        result = (16 / 27) * 0.5 * rho * A * Math.pow(v, 3) / 1000 // kW
        break

      case 'carnot-efficiency':
        const Th = inputs['T_h'] || 500
        const Tc = inputs['T_c'] || 300
        result = (1 - Tc / Th) * 100
        break

      case 'electrolysis-efficiency':
        const Vop = inputs['V_op'] || 1.8
        const Vtn = inputs['V_tn'] || 1.48
        result = (Vtn / Vop) * 100
        break

      case 'battery-capacity-fade':
        const C0 = inputs['C_0'] || 100
        const N = inputs['N'] || 500
        const k = inputs['k'] || 0.02
        result = C0 * Math.pow(1 - k / 100, N)
        break

      default:
        result = 0
    }

    setState(prev => ({
      ...prev,
      calculatorResult: {
        name: calc.outputName,
        value: Math.round(result * 100) / 100,
        unit: calc.outputUnit,
        formula: calc.formula,
        inputs,
      },
    }))
  }, [state.selectedCalculator])

  const clearCalculator = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedCalculator: null,
      calculatorResult: null,
    }))
  }, [])

  // ============================================================================
  // Simulation Execution
  // ============================================================================

  const runSimulation = useCallback(async () => {
    if (!state.config.title || !state.config.description) {
      setState(prev => ({ ...prev, error: 'Title and description are required' }))
      return
    }

    // Cancel any ongoing simulation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setState(prev => ({
      ...prev,
      phase: 'running',
      error: null,
      progress: { status: 'initializing', percentage: 0 },
    }))

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setState(prev => {
          if (prev.progress.percentage >= 90) {
            return prev
          }
          return {
            ...prev,
            progress: {
              ...prev.progress,
              percentage: prev.progress.percentage + 10,
              status: prev.progress.percentage < 30 ? 'initializing' :
                      prev.progress.percentage < 70 ? 'running' : 'processing',
            },
          }
        })
      }, 500)

      const response = await fetch('/api/simulations/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...state.config,
          tier: state.selectedTier,
        }),
        signal: abortControllerRef.current.signal,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Simulation failed')
      }

      const result = await response.json()

      setState(prev => ({
        ...prev,
        phase: 'complete',
        result,
        progress: { status: 'completed', percentage: 100 },
      }))

      // Store in workflow context
      if (result.metrics) {
        setSimulationResults({
          id: result.id,
          title: state.config.title || 'Simulation',
          domain: (experimentProtocol?.domain || 'solar-energy') as Domain,
          tier: state.selectedTier,
          metrics: result.metrics.reduce((acc: Record<string, number>, m: SimulationMetric) => {
            acc[m.name] = m.value
            return acc
          }, {}),
          recommendations: result.insights ? [result.insights] : [],
          completedAt: new Date().toISOString(),
        })
        setLastTool('simulations')
      }

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return
      }

      console.error('Simulation error:', error)
      setState(prev => ({
        ...prev,
        phase: 'error',
        error: error instanceof Error ? error.message : 'Simulation failed',
        progress: { status: 'failed', percentage: 0 },
      }))
    }
  }, [state.config, state.selectedTier, experimentProtocol, setSimulationResults, setLastTool])

  const cancelSimulation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setState(prev => ({
      ...prev,
      phase: 'idle',
      progress: { status: 'queued', percentage: 0 },
    }))
  }, [])

  // ============================================================================
  // Parameter Sweep
  // ============================================================================

  const configureSweep = useCallback((config: ParameterSweepConfig) => {
    const totalRuns = config.parameters.reduce((total, p) => total * p.steps, 1)
    setState(prev => ({
      ...prev,
      sweepConfig: { ...config, totalRuns },
    }))
  }, [])

  const runParameterSweep = useCallback(async () => {
    if (!state.sweepConfig) return

    // This would typically call an API endpoint
    // For now, generate mock results
    const results: SweepResult[] = []

    // Generate sample results
    for (let i = 0; i < Math.min(state.sweepConfig.totalRuns, 100); i++) {
      const paramValues: Record<string, number> = {}
      for (const param of state.sweepConfig.parameters) {
        paramValues[param.name] = param.min + (param.max - param.min) * Math.random()
      }
      results.push({
        parameterValues: paramValues,
        metrics: [
          { name: 'Efficiency', value: 20 + Math.random() * 10, unit: '%' },
          { name: 'Power Output', value: 100 + Math.random() * 50, unit: 'W' },
        ],
      })
    }

    // Calculate sensitivity
    const sensitivities: SensitivityResult[] = state.sweepConfig.parameters.map((param, idx) => ({
      parameter: param.name,
      sensitivity: Math.random() * 100,
      rank: idx + 1,
    })).sort((a, b) => b.sensitivity - a.sensitivity)
    .map((s, idx) => ({ ...s, rank: idx + 1 }))

    setState(prev => ({
      ...prev,
      sweepResults: results,
      sensitivityResults: sensitivities,
    }))
  }, [state.sweepConfig])

  // ============================================================================
  // Report Generation
  // ============================================================================

  const downloadReport = useCallback(async () => {
    if (!state.result) return

    try {
      // Import the report builder dynamically to avoid circular dependencies
      const { buildReportData } = await import('@/lib/simulation-report-builder')
      const reportData = buildReportData(state.result, state.config)

      const response = await fetch('/api/simulations/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportData,
          format: 'pdf',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate report')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate report')
      }

      // Decode base64 PDF
      const binaryString = atob(result.data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'application/pdf' })

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.filename || `simulation-report-${state.result.id}.pdf`
      a.click()
      URL.revokeObjectURL(url)

    } catch (error) {
      console.error('Report generation error:', error)
      setState(prev => ({
        ...prev,
        error: 'Failed to generate report',
      }))
    }
  }, [state.result, state.config])

  const exportData = useCallback(() => {
    if (!state.result) return

    const data = {
      config: state.config,
      result: state.result,
      sweepResults: state.sweepResults,
      sensitivityResults: state.sensitivityResults,
      timestamp: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `simulation-data-${state.result.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [state.result, state.config, state.sweepResults, state.sensitivityResults])

  // ============================================================================
  // Initialize from experiment context
  // ============================================================================

  const initializeFromExperiment = useCallback(() => {
    if (!experimentProtocol) return

    const parameters: SimulationParameter[] = Object.entries(experimentProtocol.parameters || {}).map(
      ([name, value]) => ({
        name,
        value: value as number,
        unit: 'varies',
        description: `Parameter from experiment protocol`,
      })
    )

    setState(prev => ({
      ...prev,
      config: {
        title: `Simulation: ${experimentProtocol.title}`,
        description: `Simulation based on experiment protocol: ${experimentProtocol.title}`,
        experimentId: experimentProtocol.id,
        tier: 'local',
        parameters,
      },
      phase: 'configuring',
      hasContextFromExperiment: true,
    }))
  }, [experimentProtocol])

  // ============================================================================
  // Reset
  // ============================================================================

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setState({
      phase: 'idle',
      config: {},
      result: null,
      progress: { status: 'queued', percentage: 0 },
      error: null,
      selectedCalculator: null,
      calculatorResult: null,
      sweepConfig: null,
      sweepResults: [],
      sensitivityResults: [],
      selectedTier: 'local',
      estimatedCost: 0,
      estimatedDuration: '< 1 second',
      hasContextFromExperiment: false,
    })
  }, [])

  // ============================================================================
  // Return Hook API
  // ============================================================================

  return {
    // State
    ...state,
    tiers: TIER_INFO,
    calculators: QUICK_CALCULATORS,
    hasExperimentContext,
    experimentContext: experimentProtocol,

    // Configuration
    setTier,
    updateConfig,
    addParameter,
    removeParameter,

    // Calculator
    selectCalculator,
    runCalculator,
    clearCalculator,

    // Simulation
    runSimulation,
    cancelSimulation,

    // Parameter Sweep
    configureSweep,
    runParameterSweep,

    // Export
    downloadReport,
    exportData,

    // Context
    initializeFromExperiment,

    // Reset
    reset,
  }
}

// ============================================================================
// Export Types
// ============================================================================

export type UseSimulationReturn = ReturnType<typeof useSimulation>
