import { NextResponse } from 'next/server'

interface DOEFactor {
  id: string
  name: string
  unit: string
  min: number
  max: number
  levels: number
}

interface DOERun {
  runNumber: number
  factorValues: Record<string, number>
  isCenter?: boolean
  isStar?: boolean
}

interface DOERequest {
  designType: 'full-factorial' | 'fractional-factorial' | 'taguchi' | 'central-composite' | 'box-behnken' | 'latin-hypercube'
  factors: DOEFactor[]
  replicates?: number
  centerPoints?: number
  randomize?: boolean
}

interface DOEResponse {
  designType: string
  factors: DOEFactor[]
  runs: DOERun[]
  totalRuns: number
  replicates: number
  centerPoints: number
  estimatedTime: number
  resolution?: string
}

export async function POST(request: Request) {
  try {
    const {
      designType,
      factors,
      replicates = 1,
      centerPoints = 0,
      randomize = true,
    }: DOERequest = await request.json()

    if (!factors || factors.length === 0) {
      return NextResponse.json({ error: 'At least one factor is required' }, { status: 400 })
    }

    let runs: DOERun[] = []
    let resolution: string | undefined

    switch (designType) {
      case 'full-factorial':
        runs = generateFullFactorial(factors, replicates)
        resolution = 'Full (all main effects and interactions estimable)'
        break

      case 'fractional-factorial':
        runs = generateFractionalFactorial(factors, replicates)
        resolution = 'III (main effects confounded with 2-factor interactions)'
        break

      case 'taguchi':
        runs = generateTaguchi(factors, replicates)
        resolution = 'Orthogonal (main effects estimable)'
        break

      case 'central-composite':
        runs = generateCentralComposite(factors, replicates, centerPoints)
        resolution = 'Quadratic (main, interaction, and quadratic effects)'
        break

      case 'box-behnken':
        runs = generateBoxBehnken(factors, replicates, centerPoints)
        resolution = 'Quadratic (3-level design, no extreme corners)'
        break

      case 'latin-hypercube':
        runs = generateLatinHypercube(factors, replicates)
        resolution = 'Space-filling (uniform coverage of design space)'
        break

      default:
        return NextResponse.json({ error: 'Invalid design type' }, { status: 400 })
    }

    // Randomize if requested
    if (randomize) {
      runs = shuffleArray(runs).map((run, i) => ({ ...run, runNumber: i + 1 }))
    }

    // Estimate execution time (seconds per run based on complexity)
    const timePerRun = factors.length <= 3 ? 0.1 : factors.length <= 5 ? 0.5 : 1.0
    const estimatedTime = runs.length * timePerRun

    const response: DOEResponse = {
      designType,
      factors,
      runs,
      totalRuns: runs.length,
      replicates,
      centerPoints,
      estimatedTime,
      resolution,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('DOE generation error:', error)
    return NextResponse.json({ error: 'Failed to generate DOE matrix' }, { status: 500 })
  }
}

// ============================================================================
// Design Generators
// ============================================================================

function generateFullFactorial(factors: DOEFactor[], replicates: number): DOERun[] {
  const runs: DOERun[] = []
  const levels = factors.map((f) => {
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
  const runs: DOERun[] = []
  const k = factors.length
  const numRuns = Math.pow(2, Math.ceil(k / 2))

  for (let i = 0; i < numRuns; i++) {
    const factorValues: Record<string, number> = {}
    factors.forEach((f, j) => {
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
  // L9 orthogonal array
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
      const levelIndex = row[i % 4]
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
  const alpha = Math.pow(Math.pow(2, k), 0.25)

  // Factorial points
  for (let i = 0; i < Math.pow(2, k); i++) {
    const factorValues: Record<string, number> = {}
    factors.forEach((f, j) => {
      const level = (i >> j) % 2 === 0 ? f.min : f.max
      factorValues[f.id] = level
    })
    runs.push({ runNumber: runs.length + 1, factorValues })
  }

  // Star points
  factors.forEach((f) => {
    const center = (f.min + f.max) / 2
    const range = (f.max - f.min) / 2

    // Low star point
    const lowValues = factors.reduce((acc, factor) => {
      acc[factor.id] = factor.id === f.id ? center - alpha * range : (factor.min + factor.max) / 2
      return acc
    }, {} as Record<string, number>)
    runs.push({ runNumber: runs.length + 1, factorValues: lowValues, isStar: true })

    // High star point
    const highValues = factors.reduce((acc, factor) => {
      acc[factor.id] = factor.id === f.id ? center + alpha * range : (factor.min + factor.max) / 2
      return acc
    }, {} as Record<string, number>)
    runs.push({ runNumber: runs.length + 1, factorValues: highValues, isStar: true })
  })

  // Center points
  const centerValues = factors.reduce((acc, f) => {
    acc[f.id] = (f.min + f.max) / 2
    return acc
  }, {} as Record<string, number>)

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

  // Box-Behnken points
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
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
  const centerValues = factors.reduce((acc, f) => {
    acc[f.id] = (f.min + f.max) / 2
    return acc
  }, {} as Record<string, number>)

  for (let i = 0; i < Math.max(centerPoints, 3); i++) {
    runs.push({ runNumber: runs.length + 1, factorValues: { ...centerValues }, isCenter: true })
  }

  return runs
}

function generateLatinHypercube(factors: DOEFactor[], replicates: number): DOERun[] {
  const runs: DOERun[] = []
  const n = Math.max(factors.length * 2, 10)

  // Initialize runs
  for (let i = 0; i < n; i++) {
    runs.push({ runNumber: i + 1, factorValues: {} })
  }

  // Generate Latin Hypercube samples
  factors.forEach((f) => {
    const intervals = Array.from({ length: n }, (_, i) => i)
    shuffleArrayInPlace(intervals)

    intervals.forEach((interval, runIndex) => {
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
