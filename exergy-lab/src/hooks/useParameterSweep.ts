'use client'

import { useState, useCallback, useMemo } from 'react'

// ============================================================================
// Types
// ============================================================================

export interface SweepParameter {
  id: string
  name: string
  unit: string
  min: number
  max: number
  steps: number
  currentValue: number
}

export interface SweepPoint {
  parameterValues: Record<string, number>
  result: number
  timestamp: number
  error?: number // Standard deviation or confidence interval
}

export interface SweepConfig {
  parameters: SweepParameter[]
  objectiveFunction: string // e.g., 'efficiency', 'cost', 'performance'
  parallelRuns: number
  tier: 'browser' | 'local' | 'cloud'
}

export interface SweepProgress {
  totalPoints: number
  completedPoints: number
  currentParameter?: string
  estimatedTimeRemaining?: number
  startTime: number
}

export interface SweepResult {
  config: SweepConfig
  points: SweepPoint[]
  optimalPoint: SweepPoint | null
  sensitivity: Record<string, number> // Parameter sensitivity indices
  contourData?: ContourData
  statistics: SweepStatistics
}

export interface ContourData {
  xParam: string
  yParam: string
  xValues: number[]
  yValues: number[]
  zValues: number[][] // 2D array of results
}

export interface SweepStatistics {
  min: number
  max: number
  mean: number
  stdDev: number
  percentiles: { p25: number; p50: number; p75: number }
}

// ============================================================================
// Hook
// ============================================================================

export function useParameterSweep() {
  const [parameters, setParameters] = useState<SweepParameter[]>([])
  const [result, setResult] = useState<SweepResult | null>(null)
  const [progress, setProgress] = useState<SweepProgress | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Total points to compute
  const totalPoints = useMemo(() => {
    return parameters.reduce((total, p) => total * p.steps, 1)
  }, [parameters])

  // Estimated time based on tier
  const estimatedTime = useCallback(
    (tier: 'browser' | 'local' | 'cloud') => {
      const timePerPoint = tier === 'browser' ? 0.01 : tier === 'local' ? 0.5 : 2
      return totalPoints * timePerPoint
    },
    [totalPoints]
  )

  // Add a sweep parameter
  const addParameter = useCallback((param: Omit<SweepParameter, 'id' | 'currentValue'>) => {
    setParameters((prev) => [
      ...prev,
      {
        ...param,
        id: `param_${Date.now()}`,
        currentValue: (param.min + param.max) / 2,
      },
    ])
  }, [])

  // Remove a parameter
  const removeParameter = useCallback((paramId: string) => {
    setParameters((prev) => prev.filter((p) => p.id !== paramId))
  }, [])

  // Update a parameter
  const updateParameter = useCallback((paramId: string, updates: Partial<SweepParameter>) => {
    setParameters((prev) => prev.map((p) => (p.id === paramId ? { ...p, ...updates } : p)))
  }, [])

  // Run the parameter sweep
  const runSweep = useCallback(
    async (
      simulationFn: (params: Record<string, number>) => Promise<number>,
      tier: 'browser' | 'local' | 'cloud' = 'browser'
    ) => {
      if (parameters.length === 0) {
        setError('No parameters defined')
        return null
      }

      setIsRunning(true)
      setError(null)
      setProgress({
        totalPoints,
        completedPoints: 0,
        startTime: Date.now(),
      })

      const points: SweepPoint[] = []

      try {
        // Generate all parameter combinations
        const combinations = generateCombinations(parameters)

        // Run simulations
        for (let i = 0; i < combinations.length; i++) {
          const paramValues = combinations[i]

          setProgress((prev) =>
            prev
              ? {
                  ...prev,
                  completedPoints: i,
                  estimatedTimeRemaining:
                    ((Date.now() - prev.startTime) / (i + 1)) * (combinations.length - i - 1),
                }
              : null
          )

          try {
            const result = await simulationFn(paramValues)
            points.push({
              parameterValues: paramValues,
              result,
              timestamp: Date.now(),
            })
          } catch (err) {
            console.error('Simulation error:', err)
            points.push({
              parameterValues: paramValues,
              result: NaN,
              timestamp: Date.now(),
              error: Infinity,
            })
          }
        }

        // Calculate statistics
        const validResults = points.filter((p) => !isNaN(p.result)).map((p) => p.result)
        const sorted = [...validResults].sort((a, b) => a - b)

        const statistics: SweepStatistics = {
          min: Math.min(...validResults),
          max: Math.max(...validResults),
          mean: validResults.reduce((a, b) => a + b, 0) / validResults.length,
          stdDev: calculateStdDev(validResults),
          percentiles: {
            p25: sorted[Math.floor(sorted.length * 0.25)],
            p50: sorted[Math.floor(sorted.length * 0.5)],
            p75: sorted[Math.floor(sorted.length * 0.75)],
          },
        }

        // Find optimal point
        const optimalPoint =
          points
            .filter((p) => !isNaN(p.result))
            .sort((a, b) => b.result - a.result)[0] || null

        // Calculate sensitivity indices (simple variance-based)
        const sensitivity = calculateSensitivity(points, parameters)

        // Generate contour data for first two parameters
        let contourData: ContourData | undefined
        if (parameters.length >= 2) {
          contourData = generateContourData(points, parameters[0], parameters[1])
        }

        const sweepResult: SweepResult = {
          config: {
            parameters,
            objectiveFunction: 'result',
            parallelRuns: 1,
            tier,
          },
          points,
          optimalPoint,
          sensitivity,
          contourData,
          statistics,
        }

        setResult(sweepResult)
        setProgress((prev) => (prev ? { ...prev, completedPoints: points.length } : null))

        return sweepResult
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sweep failed')
        return null
      } finally {
        setIsRunning(false)
      }
    },
    [parameters, totalPoints]
  )

  // Clear results
  const clearResults = useCallback(() => {
    setResult(null)
    setProgress(null)
    setError(null)
  }, [])

  return {
    // State
    parameters,
    result,
    progress,
    isRunning,
    error,
    totalPoints,
    estimatedTime,

    // Actions
    addParameter,
    removeParameter,
    updateParameter,
    runSweep,
    clearResults,
  }
}

// ============================================================================
// Utilities
// ============================================================================

function generateCombinations(parameters: SweepParameter[]): Record<string, number>[] {
  if (parameters.length === 0) return []

  const combinations: Record<string, number>[] = []

  function recurse(index: number, current: Record<string, number>) {
    if (index === parameters.length) {
      combinations.push({ ...current })
      return
    }

    const param = parameters[index]
    const step = (param.max - param.min) / (param.steps - 1)

    for (let i = 0; i < param.steps; i++) {
      current[param.id] = param.min + step * i
      recurse(index + 1, current)
    }
  }

  recurse(0, {})
  return combinations
}

function calculateStdDev(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2))
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length)
}

function calculateSensitivity(
  points: SweepPoint[],
  parameters: SweepParameter[]
): Record<string, number> {
  const sensitivity: Record<string, number> = {}
  const validPoints = points.filter((p) => !isNaN(p.result))

  if (validPoints.length === 0) return sensitivity

  const totalVariance = calculateStdDev(validPoints.map((p) => p.result)) ** 2

  for (const param of parameters) {
    // Group by parameter value
    const groups = new Map<number, number[]>()
    for (const point of validPoints) {
      const paramValue = point.parameterValues[param.id]
      if (!groups.has(paramValue)) groups.set(paramValue, [])
      groups.get(paramValue)!.push(point.result)
    }

    // Calculate between-group variance
    const groupMeans = Array.from(groups.values()).map(
      (g) => g.reduce((a, b) => a + b, 0) / g.length
    )
    const overallMean = validPoints.reduce((a, p) => a + p.result, 0) / validPoints.length
    const betweenVariance =
      groupMeans.reduce((sum, mean, i) => {
        const groupSize = Array.from(groups.values())[i].length
        return sum + groupSize * Math.pow(mean - overallMean, 2)
      }, 0) / validPoints.length

    sensitivity[param.id] = totalVariance > 0 ? (betweenVariance / totalVariance) * 100 : 0
  }

  return sensitivity
}

function generateContourData(
  points: SweepPoint[],
  xParam: SweepParameter,
  yParam: SweepParameter
): ContourData {
  // Get unique values for each parameter
  const xValues = [...new Set(points.map((p) => p.parameterValues[xParam.id]))].sort(
    (a, b) => a - b
  )
  const yValues = [...new Set(points.map((p) => p.parameterValues[yParam.id]))].sort(
    (a, b) => a - b
  )

  // Build 2D matrix
  const zValues: number[][] = []
  for (let yi = 0; yi < yValues.length; yi++) {
    const row: number[] = []
    for (let xi = 0; xi < xValues.length; xi++) {
      // Find matching point (average if multiple)
      const matching = points.filter(
        (p) =>
          Math.abs(p.parameterValues[xParam.id] - xValues[xi]) < 1e-10 &&
          Math.abs(p.parameterValues[yParam.id] - yValues[yi]) < 1e-10
      )

      if (matching.length > 0) {
        const avg = matching.reduce((sum, p) => sum + p.result, 0) / matching.length
        row.push(avg)
      } else {
        row.push(NaN)
      }
    }
    zValues.push(row)
  }

  return {
    xParam: xParam.id,
    yParam: yParam.id,
    xValues,
    yValues,
    zValues,
  }
}
