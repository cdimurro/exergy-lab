/**
 * Sensitivity Analysis API Route
 *
 * Performs sensitivity analysis using various methods:
 * - One-at-a-time (OAT)
 * - Morris screening
 * - Sobol indices (first-order and total)
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export type SensitivityMethod = 'oat' | 'morris' | 'sobol'

export interface SensitivityParameter {
  id: string
  name: string
  baseline: number
  range: [number, number]
  unit: string
}

export interface SensitivityConfig {
  domain: string
  simulationType: string
  method: SensitivityMethod
  parameters: SensitivityParameter[]
  outputMetric: string
  numSamples?: number // For Morris and Sobol
  perturbation?: number // For OAT (percentage)
}

export interface SensitivityIndex {
  parameterId: string
  parameterName: string
  firstOrder: number // Main effect
  totalOrder?: number // Total effect (Sobol only)
  influence: 'high' | 'medium' | 'low' | 'minimal'
  direction: 'positive' | 'negative' | 'mixed'
  elasticity?: number // % change in output / % change in input
}

export interface SensitivityResult {
  id: string
  method: SensitivityMethod
  baselineOutput: number
  indices: SensitivityIndex[]
  robustnessScore: number // 0-100, higher = more robust to perturbations
  dominantParameter: string
  recommendations: string[]
  executionTime: number
}

/**
 * POST /api/simulations/sensitivity
 * Perform sensitivity analysis
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const config = (await request.json()) as SensitivityConfig

    if (!config.parameters || config.parameters.length === 0) {
      return NextResponse.json(
        { error: 'At least one parameter is required' },
        { status: 400 }
      )
    }

    let result: SensitivityResult

    switch (config.method) {
      case 'oat':
        result = performOAT(config, startTime)
        break
      case 'morris':
        result = performMorris(config, startTime)
        break
      case 'sobol':
        result = performSobol(config, startTime)
        break
      default:
        result = performOAT(config, startTime)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Sensitivity analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/simulations/sensitivity
 * Get available methods and their characteristics
 */
export async function GET() {
  return NextResponse.json({
    methods: [
      {
        id: 'oat',
        name: 'One-at-a-Time',
        description: 'Perturb each parameter individually around baseline',
        complexity: 'O(n)',
        bestFor: 'Quick screening, linear models',
        limitations: 'Misses parameter interactions',
      },
      {
        id: 'morris',
        name: 'Morris Screening',
        description: 'Elementary effects method with random trajectories',
        complexity: 'O(r*(n+1))',
        bestFor: 'Identifying non-influential parameters',
        limitations: 'Qualitative ranking only',
      },
      {
        id: 'sobol',
        name: 'Sobol Indices',
        description: 'Variance-based global sensitivity analysis',
        complexity: 'O(n*(k+2))',
        bestFor: 'Quantitative importance, interaction effects',
        limitations: 'Computationally expensive',
      },
    ],
  })
}

// One-at-a-Time sensitivity analysis
function performOAT(config: SensitivityConfig, startTime: number): SensitivityResult {
  const perturbation = config.perturbation ?? 10 // Default 10% perturbation

  // Calculate baseline output
  const baselineInputs: Record<string, number> = {}
  config.parameters.forEach((p) => {
    baselineInputs[p.id] = p.baseline
  })
  const baselineOutput = simulate(config.domain, config.simulationType, baselineInputs)

  const indices: SensitivityIndex[] = []

  for (const param of config.parameters) {
    // Perturb up
    const upInputs = { ...baselineInputs }
    upInputs[param.id] = param.baseline * (1 + perturbation / 100)
    const upOutput = simulate(config.domain, config.simulationType, upInputs)

    // Perturb down
    const downInputs = { ...baselineInputs }
    downInputs[param.id] = param.baseline * (1 - perturbation / 100)
    const downOutput = simulate(config.domain, config.simulationType, downInputs)

    // Calculate elasticity
    const deltaOutput = upOutput - downOutput
    const deltaInput = (2 * perturbation) / 100
    const elasticity = baselineOutput !== 0 ? (deltaOutput / baselineOutput) / deltaInput : 0

    // Calculate influence percentage (normalized)
    const influence = Math.abs(deltaOutput / (baselineOutput || 1)) * 100

    // Determine direction
    let direction: 'positive' | 'negative' | 'mixed' = 'mixed'
    if (upOutput > baselineOutput && downOutput < baselineOutput) {
      direction = 'positive'
    } else if (upOutput < baselineOutput && downOutput > baselineOutput) {
      direction = 'negative'
    }

    indices.push({
      parameterId: param.id,
      parameterName: param.name,
      firstOrder: influence,
      influence: categorizeInfluence(influence),
      direction,
      elasticity: Math.abs(elasticity),
    })
  }

  // Sort by influence
  indices.sort((a, b) => b.firstOrder - a.firstOrder)

  // Calculate robustness score
  const totalInfluence = indices.reduce((sum, i) => sum + i.firstOrder, 0)
  const robustnessScore = Math.max(0, 100 - totalInfluence)

  // Generate recommendations
  const recommendations = generateRecommendations(indices)

  return {
    id: `sensitivity_oat_${Date.now()}`,
    method: 'oat',
    baselineOutput,
    indices,
    robustnessScore,
    dominantParameter: indices[0]?.parameterId || '',
    recommendations,
    executionTime: Date.now() - startTime,
  }
}

// Morris screening method
function performMorris(config: SensitivityConfig, startTime: number): SensitivityResult {
  const numTrajectories = config.numSamples ?? 10
  const numLevels = 4

  const baselineInputs: Record<string, number> = {}
  config.parameters.forEach((p) => {
    baselineInputs[p.id] = p.baseline
  })
  const baselineOutput = simulate(config.domain, config.simulationType, baselineInputs)

  // Elementary effects for each parameter
  const effects: Record<string, number[]> = {}
  config.parameters.forEach((p) => {
    effects[p.id] = []
  })

  // Generate random trajectories
  for (let r = 0; r < numTrajectories; r++) {
    // Random starting point
    const currentInputs: Record<string, number> = {}
    config.parameters.forEach((p) => {
      const range = p.range[1] - p.range[0]
      const level = Math.floor(Math.random() * numLevels)
      currentInputs[p.id] = p.range[0] + (range * level) / (numLevels - 1)
    })

    let currentOutput = simulate(config.domain, config.simulationType, currentInputs)

    // Perturb each parameter once
    const order = shuffleArray([...config.parameters])
    for (const param of order) {
      const previousValue = currentInputs[param.id]
      const range = param.range[1] - param.range[0]
      const delta = range / (numLevels - 1)
      const direction = Math.random() > 0.5 ? 1 : -1

      currentInputs[param.id] = Math.max(
        param.range[0],
        Math.min(param.range[1], previousValue + direction * delta)
      )

      const newOutput = simulate(config.domain, config.simulationType, currentInputs)
      const effect = (newOutput - currentOutput) / delta

      effects[param.id].push(effect)
      currentOutput = newOutput
    }
  }

  // Calculate mu* (mean of absolute elementary effects)
  const indices: SensitivityIndex[] = []

  for (const param of config.parameters) {
    const absEffects = effects[param.id].map(Math.abs)
    const muStar = absEffects.reduce((a, b) => a + b, 0) / absEffects.length
    const sigma = Math.sqrt(
      absEffects.reduce((sum, e) => sum + Math.pow(e - muStar, 2), 0) / absEffects.length
    )

    // Normalize to percentage
    const normalizedMuStar = (muStar / (Math.abs(baselineOutput) || 1)) * 100

    // Direction from sign of mean effect
    const meanEffect = effects[param.id].reduce((a, b) => a + b, 0) / effects[param.id].length
    const direction = meanEffect > 0.01 ? 'positive' : meanEffect < -0.01 ? 'negative' : 'mixed'

    indices.push({
      parameterId: param.id,
      parameterName: param.name,
      firstOrder: normalizedMuStar,
      influence: categorizeInfluence(normalizedMuStar),
      direction,
    })
  }

  indices.sort((a, b) => b.firstOrder - a.firstOrder)

  const totalInfluence = indices.reduce((sum, i) => sum + i.firstOrder, 0)
  const robustnessScore = Math.max(0, 100 - totalInfluence)

  return {
    id: `sensitivity_morris_${Date.now()}`,
    method: 'morris',
    baselineOutput,
    indices,
    robustnessScore,
    dominantParameter: indices[0]?.parameterId || '',
    recommendations: generateRecommendations(indices),
    executionTime: Date.now() - startTime,
  }
}

// Sobol sensitivity analysis (simplified variance-based)
function performSobol(config: SensitivityConfig, startTime: number): SensitivityResult {
  const numSamples = config.numSamples ?? 1000

  const baselineInputs: Record<string, number> = {}
  config.parameters.forEach((p) => {
    baselineInputs[p.id] = p.baseline
  })
  const baselineOutput = simulate(config.domain, config.simulationType, baselineInputs)

  // Generate quasi-random samples (simplified: uniform random)
  const samplesA: Record<string, number>[] = []
  const samplesB: Record<string, number>[] = []

  for (let i = 0; i < numSamples; i++) {
    const sampleA: Record<string, number> = {}
    const sampleB: Record<string, number> = {}
    config.parameters.forEach((p) => {
      sampleA[p.id] = p.range[0] + Math.random() * (p.range[1] - p.range[0])
      sampleB[p.id] = p.range[0] + Math.random() * (p.range[1] - p.range[0])
    })
    samplesA.push(sampleA)
    samplesB.push(sampleB)
  }

  // Evaluate model for matrix A
  const outputsA = samplesA.map((s) => simulate(config.domain, config.simulationType, s))

  // Evaluate model for matrix B
  const outputsB = samplesB.map((s) => simulate(config.domain, config.simulationType, s))

  // Total variance
  const allOutputs = [...outputsA, ...outputsB]
  const meanOutput = allOutputs.reduce((a, b) => a + b, 0) / allOutputs.length
  const totalVariance =
    allOutputs.reduce((sum, o) => sum + Math.pow(o - meanOutput, 2), 0) / allOutputs.length

  const indices: SensitivityIndex[] = []

  for (const param of config.parameters) {
    // Matrix AB_i (B with i-th column from A)
    const outputsABi = samplesB.map((sB, idx) => {
      const sABi = { ...sB }
      sABi[param.id] = samplesA[idx][param.id]
      return simulate(config.domain, config.simulationType, sABi)
    })

    // First-order Sobol index
    let covariance = 0
    for (let i = 0; i < numSamples; i++) {
      covariance += outputsB[i] * (outputsABi[i] - outputsA[i])
    }
    covariance /= numSamples

    const firstOrder = totalVariance > 0 ? Math.max(0, covariance / totalVariance) * 100 : 0

    // Total-order index (simplified)
    let varianceNotI = 0
    for (let i = 0; i < numSamples; i++) {
      varianceNotI += Math.pow(outputsA[i] - outputsABi[i], 2)
    }
    varianceNotI /= 2 * numSamples

    const totalOrder = totalVariance > 0 ? Math.min(100, (varianceNotI / totalVariance) * 100) : 0

    indices.push({
      parameterId: param.id,
      parameterName: param.name,
      firstOrder,
      totalOrder,
      influence: categorizeInfluence(firstOrder),
      direction: 'mixed', // Sobol doesn't provide direction
    })
  }

  indices.sort((a, b) => b.firstOrder - a.firstOrder)

  const robustnessScore = Math.max(0, 100 - indices[0]?.firstOrder || 0)

  return {
    id: `sensitivity_sobol_${Date.now()}`,
    method: 'sobol',
    baselineOutput,
    indices,
    robustnessScore,
    dominantParameter: indices[0]?.parameterId || '',
    recommendations: generateRecommendations(indices),
    executionTime: Date.now() - startTime,
  }
}

// Helper: Categorize influence level
function categorizeInfluence(value: number): 'high' | 'medium' | 'low' | 'minimal' {
  if (value > 50) return 'high'
  if (value > 30) return 'medium'
  if (value > 15) return 'low'
  return 'minimal'
}

// Helper: Shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Helper: Generate recommendations
function generateRecommendations(indices: SensitivityIndex[]): string[] {
  const recommendations: string[] = []

  const highInfluence = indices.filter((i) => i.influence === 'high')
  const minimal = indices.filter((i) => i.influence === 'minimal')

  if (highInfluence.length > 0) {
    recommendations.push(
      `Focus optimization efforts on ${highInfluence.map((i) => i.parameterName).join(', ')} - these have the highest impact.`
    )
  }

  if (highInfluence.length === 1 && highInfluence[0].firstOrder > 70) {
    recommendations.push(
      `${highInfluence[0].parameterName} dominates the output. Consider if this concentration of influence is desirable.`
    )
  }

  if (minimal.length > 0) {
    recommendations.push(
      `${minimal.map((i) => i.parameterName).join(', ')} can be held at nominal values with minimal effect on output.`
    )
  }

  if (indices.length > 2 && indices[0].firstOrder - indices[1].firstOrder < 10) {
    recommendations.push(
      'Multiple parameters have similar influence. Consider interaction effects in design optimization.'
    )
  }

  return recommendations
}

// Helper: Domain-specific simulation
function simulate(domain: string, type: string, inputs: Record<string, number>): number {
  switch (domain) {
    case 'solar':
      return simulateSolar(inputs)
    case 'wind':
      return simulateWind(inputs)
    case 'battery':
      return simulateBattery(inputs)
    case 'hydrogen':
      return simulateHydrogen(inputs)
    default:
      return simulateGeneric(inputs)
  }
}

function simulateSolar(inputs: Record<string, number>): number {
  const bandgap = inputs.bandgap ?? 1.34
  const temperature = inputs.temperature ?? 300
  const irradiance = inputs.irradiance ?? 1000

  const optimalBandgap = 1.34
  const bandgapPenalty = Math.exp(-Math.pow(bandgap - optimalBandgap, 2) / 0.5)
  const tempFactor = 1 - 0.004 * (temperature - 298)
  const irradianceFactor = Math.log10(irradiance / 1000 + 1) + 0.9

  return 33.7 * bandgapPenalty * tempFactor * irradianceFactor
}

function simulateWind(inputs: Record<string, number>): number {
  const windSpeed = inputs.windSpeed ?? 10
  const rotorDiameter = inputs.rotorDiameter ?? 100
  const cp = inputs.cp ?? 0.45
  const airDensity = inputs.airDensity ?? 1.225

  const area = Math.PI * Math.pow(rotorDiameter / 2, 2)
  return (0.5 * airDensity * area * Math.pow(windSpeed, 3) * cp) / 1e6
}

function simulateBattery(inputs: Record<string, number>): number {
  const temperature = inputs.temperature ?? 25
  const depthOfDischarge = inputs.depthOfDischarge ?? 80
  const cRate = inputs.cRate ?? 1

  const tempFactor = Math.pow(2, (temperature - 25) / 10)
  const dodFactor = 1 + (depthOfDischarge / 100 - 0.5) * 0.5
  const cRateFactor = 1 + Math.max(0, cRate - 1) * 0.2

  return 3000 / (tempFactor * dodFactor * cRateFactor)
}

function simulateHydrogen(inputs: Record<string, number>): number {
  const temperature = inputs.temperature ?? 80
  const currentDensity = inputs.currentDensity ?? 1.5

  const reversibleVoltage = 1.23
  const thermalVoltage = 0.025 * (temperature + 273) / 298
  const activationOverpotential = 0.05 * Math.log(currentDensity + 1)
  const ohmicOverpotential = 0.1 * currentDensity

  const cellVoltage = reversibleVoltage + thermalVoltage + activationOverpotential + ohmicOverpotential
  return (reversibleVoltage / cellVoltage) * 100
}

function simulateGeneric(inputs: Record<string, number>): number {
  let result = 50
  const values = Object.values(inputs)

  for (const val of values) {
    result += 10 * Math.sin(val / 10) - 0.01 * Math.pow(val - 50, 2)
  }

  return Math.max(0, Math.min(100, result))
}
