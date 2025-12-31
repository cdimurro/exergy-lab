'use client'

import { useState, useCallback, useMemo } from 'react'

// ============================================================================
// Types
// ============================================================================

export type DOEDesignType =
  | 'full-factorial'
  | 'fractional-factorial'
  | 'taguchi'
  | 'central-composite'
  | 'box-behnken'
  | 'latin-hypercube'

export interface DOEFactor {
  id: string
  name: string
  unit: string
  min: number
  max: number
  levels: number // For factorial designs
  values?: number[] // Custom levels if specified
}

export interface DOERun {
  runNumber: number
  factorValues: Record<string, number>
  isCenter?: boolean
  isStar?: boolean
  estimatedResponse?: number
  actualResponse?: number
  completed?: boolean
}

export interface DOEMatrix {
  designType: DOEDesignType
  factors: DOEFactor[]
  runs: DOERun[]
  totalRuns: number
  replicates: number
  centerPoints: number
  resolution?: string // For fractional factorial
}

export interface DOEAnalysis {
  mainEffects: Record<string, number>
  interactions: Record<string, number>
  optimalSettings: Record<string, number>
  predictedOptimum: number
  rSquared?: number
}

// ============================================================================
// Hook
// ============================================================================

export function useDOE() {
  const [designType, setDesignType] = useState<DOEDesignType>('full-factorial')
  const [factors, setFactors] = useState<DOEFactor[]>([])
  const [matrix, setMatrix] = useState<DOEMatrix | null>(null)
  const [replicates, setReplicates] = useState(1)
  const [centerPoints, setCenterPoints] = useState(0)
  const [randomize, setRandomize] = useState(true)

  // Add a new factor
  const addFactor = useCallback((factor: Omit<DOEFactor, 'id'>) => {
    setFactors((prev) => [
      ...prev,
      {
        ...factor,
        id: `factor_${Date.now()}`,
      },
    ])
  }, [])

  // Remove a factor
  const removeFactor = useCallback((factorId: string) => {
    setFactors((prev) => prev.filter((f) => f.id !== factorId))
  }, [])

  // Update a factor
  const updateFactor = useCallback((factorId: string, updates: Partial<DOEFactor>) => {
    setFactors((prev) => prev.map((f) => (f.id === factorId ? { ...f, ...updates } : f)))
  }, [])

  // Calculate total runs for current design
  const estimatedRuns = useMemo(() => {
    if (factors.length === 0) return 0

    switch (designType) {
      case 'full-factorial':
        return factors.reduce((total, f) => total * f.levels, 1) * replicates + centerPoints

      case 'fractional-factorial':
        // Resolution III design
        const fullRuns = factors.reduce((total, f) => total * f.levels, 1)
        return Math.ceil(fullRuns / Math.pow(2, Math.floor(factors.length / 2))) * replicates

      case 'taguchi':
        // L9, L16, L27 orthogonal arrays
        if (factors.length <= 4) return 9 * replicates
        if (factors.length <= 5) return 16 * replicates
        return 27 * replicates

      case 'central-composite':
        // 2^k + 2k + center points
        const k = factors.length
        return (Math.pow(2, k) + 2 * k + centerPoints) * replicates

      case 'box-behnken':
        // More efficient for 3+ factors
        const n = factors.length
        return (2 * n * (n - 1) + centerPoints) * replicates

      case 'latin-hypercube':
        // User-defined number of samples
        return Math.max(factors.length * 2, 10) * replicates

      default:
        return 0
    }
  }, [designType, factors, replicates, centerPoints])

  // Generate the DOE matrix
  const generateMatrix = useCallback(() => {
    if (factors.length === 0) return

    let runs: DOERun[] = []

    switch (designType) {
      case 'full-factorial':
        runs = generateFullFactorial(factors, replicates)
        break
      case 'fractional-factorial':
        runs = generateFractionalFactorial(factors, replicates)
        break
      case 'taguchi':
        runs = generateTaguchi(factors, replicates)
        break
      case 'central-composite':
        runs = generateCentralComposite(factors, replicates, centerPoints)
        break
      case 'box-behnken':
        runs = generateBoxBehnken(factors, replicates, centerPoints)
        break
      case 'latin-hypercube':
        runs = generateLatinHypercube(factors, replicates)
        break
    }

    // Randomize if requested
    if (randomize) {
      runs = shuffleArray(runs).map((run, i) => ({ ...run, runNumber: i + 1 }))
    }

    // Add center points
    if (centerPoints > 0 && designType !== 'central-composite' && designType !== 'box-behnken') {
      const centerRun: DOERun = {
        runNumber: runs.length + 1,
        factorValues: factors.reduce(
          (acc, f) => {
            acc[f.id] = (f.min + f.max) / 2
            return acc
          },
          {} as Record<string, number>
        ),
        isCenter: true,
      }
      for (let i = 0; i < centerPoints; i++) {
        runs.push({ ...centerRun, runNumber: runs.length + 1 })
      }
    }

    setMatrix({
      designType,
      factors,
      runs,
      totalRuns: runs.length,
      replicates,
      centerPoints,
    })

    return {
      designType,
      factors,
      runs,
      totalRuns: runs.length,
      replicates,
      centerPoints,
    }
  }, [designType, factors, replicates, centerPoints, randomize])

  // Export matrix to CSV
  const exportToCSV = useCallback(() => {
    if (!matrix) return ''

    const headers = ['Run', ...matrix.factors.map((f) => `${f.name} (${f.unit})`), 'Response']
    const rows = matrix.runs.map((run) => [
      run.runNumber,
      ...matrix.factors.map((f) => run.factorValues[f.id]),
      run.actualResponse ?? '',
    ])

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  }, [matrix])

  // Clear matrix
  const clearMatrix = useCallback(() => {
    setMatrix(null)
  }, [])

  return {
    // State
    designType,
    factors,
    matrix,
    replicates,
    centerPoints,
    randomize,
    estimatedRuns,

    // Actions
    setDesignType,
    setReplicates,
    setCenterPoints,
    setRandomize,
    addFactor,
    removeFactor,
    updateFactor,
    generateMatrix,
    exportToCSV,
    clearMatrix,
  }
}

// ============================================================================
// Design Generators
// ============================================================================

function generateFullFactorial(factors: DOEFactor[], replicates: number): DOERun[] {
  const runs: DOERun[] = []
  const levels = factors.map((f) => {
    if (f.values) return f.values
    const step = (f.max - f.min) / (f.levels - 1)
    return Array.from({ length: f.levels }, (_, i) => f.min + step * i)
  })

  function generateCombinations(index: number, current: Record<string, number>) {
    if (index === factors.length) {
      for (let r = 0; r < replicates; r++) {
        runs.push({
          runNumber: runs.length + 1,
          factorValues: { ...current },
        })
      }
      return
    }

    const factor = factors[index]
    for (const level of levels[index]) {
      current[factor.id] = level
      generateCombinations(index + 1, current)
    }
  }

  generateCombinations(0, {})
  return runs
}

function generateFractionalFactorial(factors: DOEFactor[], replicates: number): DOERun[] {
  // Simplified Resolution III design
  const runs: DOERun[] = []
  const k = factors.length
  const numRuns = Math.pow(2, Math.ceil(k / 2))

  for (let i = 0; i < numRuns; i++) {
    const factorValues: Record<string, number> = {}
    factors.forEach((f, j) => {
      // Use bit pattern for factor levels
      const level = (i >> j) % 2 === 0 ? f.min : f.max
      factorValues[f.id] = level
    })

    for (let r = 0; r < replicates; r++) {
      runs.push({
        runNumber: runs.length + 1,
        factorValues: { ...factorValues },
      })
    }
  }

  return runs
}

function generateTaguchi(factors: DOEFactor[], replicates: number): DOERun[] {
  // L9 orthogonal array for up to 4 factors at 3 levels
  const L9 = [
    [0, 0, 0, 0],
    [0, 1, 1, 1],
    [0, 2, 2, 2],
    [1, 0, 1, 2],
    [1, 1, 2, 0],
    [1, 2, 0, 1],
    [2, 0, 2, 1],
    [2, 1, 0, 2],
    [2, 2, 1, 0],
  ]

  const runs: DOERun[] = []

  for (const row of L9) {
    const factorValues: Record<string, number> = {}
    factors.forEach((f, i) => {
      const levelIndex = row[i % 4] // Wrap for more than 4 factors
      const levels = [f.min, (f.min + f.max) / 2, f.max]
      factorValues[f.id] = levels[Math.min(levelIndex, 2)]
    })

    for (let r = 0; r < replicates; r++) {
      runs.push({
        runNumber: runs.length + 1,
        factorValues: { ...factorValues },
      })
    }
  }

  return runs
}

function generateCentralComposite(
  factors: DOEFactor[],
  replicates: number,
  centerPoints: number
): DOERun[] {
  const runs: DOERun[] = []
  const k = factors.length
  const alpha = Math.pow(Math.pow(2, k), 0.25) // Rotatability condition

  // Factorial points (corners)
  for (let i = 0; i < Math.pow(2, k); i++) {
    const factorValues: Record<string, number> = {}
    factors.forEach((f, j) => {
      const level = (i >> j) % 2 === 0 ? f.min : f.max
      factorValues[f.id] = level
    })
    runs.push({ runNumber: runs.length + 1, factorValues })
  }

  // Star points (axial)
  factors.forEach((f) => {
    const center = (f.min + f.max) / 2
    const range = (f.max - f.min) / 2

    // -alpha point
    const lowValues = factors.reduce(
      (acc, factor) => {
        acc[factor.id] = factor.id === f.id ? center - alpha * range : (factor.min + factor.max) / 2
        return acc
      },
      {} as Record<string, number>
    )
    runs.push({ runNumber: runs.length + 1, factorValues: lowValues, isStar: true })

    // +alpha point
    const highValues = factors.reduce(
      (acc, factor) => {
        acc[factor.id] =
          factor.id === f.id ? center + alpha * range : (factor.min + factor.max) / 2
        return acc
      },
      {} as Record<string, number>
    )
    runs.push({ runNumber: runs.length + 1, factorValues: highValues, isStar: true })
  })

  // Center points
  const centerValues = factors.reduce(
    (acc, f) => {
      acc[f.id] = (f.min + f.max) / 2
      return acc
    },
    {} as Record<string, number>
  )
  for (let i = 0; i < Math.max(centerPoints, 3); i++) {
    runs.push({ runNumber: runs.length + 1, factorValues: { ...centerValues }, isCenter: true })
  }

  return runs
}

function generateBoxBehnken(
  factors: DOEFactor[],
  replicates: number,
  centerPoints: number
): DOERun[] {
  const runs: DOERun[] = []
  const n = factors.length

  // Box-Behnken: each factor at 3 levels, but not all combinations
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      // All 4 corner combinations for factors i and j
      for (const levelI of [-1, 1]) {
        for (const levelJ of [-1, 1]) {
          const factorValues: Record<string, number> = {}
          factors.forEach((f, k) => {
            if (k === i) {
              factorValues[f.id] = levelI === -1 ? f.min : f.max
            } else if (k === j) {
              factorValues[f.id] = levelJ === -1 ? f.min : f.max
            } else {
              factorValues[f.id] = (f.min + f.max) / 2
            }
          })
          runs.push({ runNumber: runs.length + 1, factorValues })
        }
      }
    }
  }

  // Center points
  const centerValues = factors.reduce(
    (acc, f) => {
      acc[f.id] = (f.min + f.max) / 2
      return acc
    },
    {} as Record<string, number>
  )
  for (let i = 0; i < Math.max(centerPoints, 3); i++) {
    runs.push({ runNumber: runs.length + 1, factorValues: { ...centerValues }, isCenter: true })
  }

  return runs
}

function generateLatinHypercube(factors: DOEFactor[], replicates: number): DOERun[] {
  const runs: DOERun[] = []
  const n = Math.max(factors.length * 2, 10) // At least 10 samples or 2 per factor

  // Generate Latin Hypercube samples
  factors.forEach((f) => {
    // Create n evenly spaced intervals
    const intervals = Array.from({ length: n }, (_, i) => i)
    shuffleArrayInPlace(intervals)

    intervals.forEach((interval, runIndex) => {
      if (!runs[runIndex]) {
        runs[runIndex] = {
          runNumber: runIndex + 1,
          factorValues: {},
        }
      }
      // Random point within the interval
      const intervalSize = (f.max - f.min) / n
      runs[runIndex].factorValues[f.id] = f.min + intervalSize * (interval + Math.random())
    })
  })

  return runs
}

// ============================================================================
// Utilities
// ============================================================================

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array]
  shuffleArrayInPlace(result)
  return result
}

function shuffleArrayInPlace<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
}
