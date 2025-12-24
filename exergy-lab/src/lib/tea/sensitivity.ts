/**
 * Sensitivity Analysis Engine for TEA
 *
 * Performs one-at-a-time (OAT) sensitivity analysis to identify:
 * - Critical cost drivers
 * - Parameters with highest impact on results
 * - Tornado plot data
 * - Elasticity coefficients
 *
 * Supports multi-parameter variation studies and parametric analysis
 *
 * Reference: All 4 TEA reports emphasize sensitivity analysis
 */

import type { TEAInput_v2, TEAResult_v2 } from '@/types/tea'
import { TEACalculator } from './calculations'

export interface SensitivityParameter {
  name: string
  baseValue: number
  unit: string
  variationRange: {
    low: number // percentage decrease (e.g., -20)
    high: number // percentage increase (e.g., +20)
  }
  stepSize?: number // For parametric studies
}

export interface SensitivityPoint {
  parameterValue: number
  parameterChange: number // percentage from base
  lcoe: number
  npv: number
  irr: number
  msp?: number
  [key: string]: number | undefined
}

export interface TornadoPlotData {
  parameter: string
  unit: string
  baseCase: {
    value: number
    lcoe: number
    npv: number
  }
  lowCase: {
    value: number
    parameterChange: number // percentage
    lcoe: number
    npv: number
    impact: number // absolute change in NPV
    percentImpact: number
  }
  highCase: {
    value: number
    parameterChange: number
    lcoe: number
    npv: number
    impact: number
    percentImpact: number
  }
  sensitivity: number // Elasticity: (% change in NPV) / (% change in parameter)
  rank: number // Ranking by absolute impact
}

export interface SensitivityAnalysisResult {
  baseCase: {
    input: TEAInput_v2
    results: TEAResult_v2
  }
  tornadoData: TornadoPlotData[]
  criticalParameters: string[] // Top 5 most influential
  parametricStudies: Map<string, SensitivityPoint[]> // parameter: sensitivity curve
  elasticities: Record<string, number> // parameter: NPV elasticity
  summary: {
    mostSensitiveParameter: string
    maxImpactOnNPV: number
    maxImpactOnLCOE: number
    robustnessScore: number // 0-100, higher = less sensitive to variations
  }
}

export interface SensitivityConfig {
  parameters: SensitivityParameter[]
  baselineInput: TEAInput_v2
  targetMetrics: ('lcoe' | 'npv' | 'irr' | 'payback' | 'roi' | 'msp')[]
  variationSteps?: number // For parametric studies (default: 10)
}

/**
 * Default sensitivity parameters for TEA
 */
export function getDefaultSensitivityParams(input: TEAInput_v2): SensitivityParameter[] {
  return [
    {
      name: 'capex_per_kw',
      baseValue: input.capex_per_kw,
      unit: '$/kW',
      variationRange: { low: -30, high: +30 },
    },
    {
      name: 'opex_per_kw_year',
      baseValue: input.opex_per_kw_year,
      unit: '$/kW-year',
      variationRange: { low: -20, high: +20 },
    },
    {
      name: 'capacity_factor',
      baseValue: input.capacity_factor,
      unit: '%',
      variationRange: { low: -20, high: +20 },
    },
    {
      name: 'electricity_price_per_mwh',
      baseValue: input.electricity_price_per_mwh,
      unit: '$/MWh',
      variationRange: { low: -30, high: +30 },
    },
    {
      name: 'discount_rate',
      baseValue: input.discount_rate,
      unit: '%',
      variationRange: { low: -30, high: +30 },
    },
    {
      name: 'project_lifetime_years',
      baseValue: input.project_lifetime_years,
      unit: 'years',
      variationRange: { low: -20, high: +20 },
    },
    {
      name: 'installation_factor',
      baseValue: input.installation_factor,
      unit: 'multiplier',
      variationRange: { low: -15, high: +15 },
    },
  ]
}

/**
 * Sensitivity Analysis Engine
 */
export class SensitivityEngine {
  private config: SensitivityConfig
  private baseResults: TEAResult_v2

  constructor(config: SensitivityConfig) {
    this.config = config

    // Calculate base case
    const calculator = new TEACalculator(config.baselineInput)
    const calculations = calculator.calculate({ includeProvenance: false })

    this.baseResults = {
      ...config.baselineInput,
      lcoe: calculations.lcoe,
      npv: calculations.npv,
      irr: calculations.irr,
      payback_years: calculations.paybackSimple,
      total_capex: calculations.totalCapex,
      annual_opex: calculations.totalOpexAnnual,
      total_lifetime_cost: calculations.totalLifetimeCost,
      annual_production_mwh: this.config.baselineInput.annual_production_mwh || 0,
      lifetime_production_mwh: 0,
      annual_revenue: 0,
      lifetime_revenue_npv: 0,
      capex_breakdown: {
        equipment: 0,
        installation: 0,
        land: 0,
        grid_connection: 0,
      },
      opex_breakdown: {
        capacity_based: 0,
        fixed: 0,
        variable: 0,
        insurance: 0,
      },
      cash_flows: [],
    } as TEAResult_v2
  }

  /**
   * Run complete sensitivity analysis
   */
  async analyze(): Promise<SensitivityAnalysisResult> {
    // Generate tornado plot data
    const tornadoData = await this.generateTornadoData()

    // Identify critical parameters
    const criticalParameters = tornadoData
      .sort((a, b) => Math.abs(b.lowCase.impact) + Math.abs(b.highCase.impact) - (Math.abs(a.lowCase.impact) + Math.abs(a.highCase.impact)))
      .slice(0, 5)
      .map(d => d.parameter)

    // Calculate elasticities
    const elasticities: Record<string, number> = {}
    for (const data of tornadoData) {
      elasticities[data.parameter] = data.sensitivity
    }

    // Generate parametric studies for top 3 parameters
    const parametricStudies = new Map<string, SensitivityPoint[]>()
    for (const param of criticalParameters.slice(0, 3)) {
      const paramConfig = this.config.parameters.find(p => p.name === param)
      if (paramConfig) {
        const curve = await this.generateParametricCurve(paramConfig)
        parametricStudies.set(param, curve)
      }
    }

    // Calculate robustness score
    const robustnessScore = this.calculateRobustnessScore(tornadoData)

    return {
      baseCase: {
        input: this.config.baselineInput,
        results: this.baseResults,
      },
      tornadoData,
      criticalParameters,
      parametricStudies,
      elasticities,
      summary: {
        mostSensitiveParameter: tornadoData[0]?.parameter || 'unknown',
        maxImpactOnNPV: Math.max(
          ...tornadoData.map(d => Math.max(Math.abs(d.lowCase.impact), Math.abs(d.highCase.impact)))
        ),
        maxImpactOnLCOE:
          Math.max(
            ...tornadoData.map(d =>
              Math.max(
                Math.abs(d.lowCase.lcoe - d.baseCase.lcoe),
                Math.abs(d.highCase.lcoe - d.baseCase.lcoe)
              )
            )
          ) || 0,
        robustnessScore,
      },
    }
  }

  /**
   * Generate tornado plot data (OAT sensitivity)
   */
  private async generateTornadoData(): Promise<TornadoPlotData[]> {
    const tornadoData: TornadoPlotData[] = []

    for (const param of this.config.parameters) {
      // Low case (-X%)
      const lowInput = this.varyParameter(param, param.variationRange.low)
      const lowResults = this.calculateResults(lowInput)

      // High case (+X%)
      const highInput = this.varyParameter(param, param.variationRange.high)
      const highResults = this.calculateResults(highInput)

      // Calculate impacts
      const lowImpact = lowResults.npv - this.baseResults.npv
      const highImpact = highResults.npv - this.baseResults.npv
      const lowPercentImpact = (lowImpact / Math.abs(this.baseResults.npv)) * 100
      const highPercentImpact = (highImpact / Math.abs(this.baseResults.npv)) * 100

      // Calculate elasticity
      const avgPercentChange =
        (Math.abs(param.variationRange.low) + Math.abs(param.variationRange.high)) / 2
      const avgNPVChange = (Math.abs(lowPercentImpact) + Math.abs(highPercentImpact)) / 2
      const sensitivity = avgNPVChange / avgPercentChange

      tornadoData.push({
        parameter: param.name,
        unit: param.unit,
        baseCase: {
          value: param.baseValue,
          lcoe: this.baseResults.lcoe,
          npv: this.baseResults.npv,
        },
        lowCase: {
          value: param.baseValue * (1 + param.variationRange.low / 100),
          parameterChange: param.variationRange.low,
          lcoe: lowResults.lcoe,
          npv: lowResults.npv,
          impact: lowImpact,
          percentImpact: lowPercentImpact,
        },
        highCase: {
          value: param.baseValue * (1 + param.variationRange.high / 100),
          parameterChange: param.variationRange.high,
          lcoe: highResults.lcoe,
          npv: highResults.npv,
          impact: highImpact,
          percentImpact: highPercentImpact,
        },
        sensitivity,
        rank: 0, // Will be set after sorting
      })
    }

    // Sort by total impact (sum of absolute impacts)
    tornadoData.sort(
      (a, b) =>
        Math.abs(b.lowCase.impact) +
        Math.abs(b.highCase.impact) -
        (Math.abs(a.lowCase.impact) + Math.abs(a.highCase.impact))
    )

    // Assign ranks
    tornadoData.forEach((data, index) => {
      data.rank = index + 1
    })

    return tornadoData
  }

  /**
   * Generate parametric sensitivity curve
   */
  private async generateParametricCurve(param: SensitivityParameter): Promise<SensitivityPoint[]> {
    const steps = this.config.variationSteps || 10
    const points: SensitivityPoint[] = []

    const minValue = param.baseValue * (1 + param.variationRange.low / 100)
    const maxValue = param.baseValue * (1 + param.variationRange.high / 100)
    const stepSize = (maxValue - minValue) / (steps - 1)

    for (let i = 0; i < steps; i++) {
      const paramValue = minValue + i * stepSize
      const variedInput = this.varyParameter(param, ((paramValue - param.baseValue) / param.baseValue) * 100)
      const results = this.calculateResults(variedInput)

      points.push({
        parameterValue: paramValue,
        parameterChange: ((paramValue - param.baseValue) / param.baseValue) * 100,
        lcoe: results.lcoe,
        npv: results.npv,
        irr: results.irr,
        msp: results.extendedMetrics?.msp,
      })
    }

    return points
  }

  /**
   * Vary a single parameter by percentage
   */
  private varyParameter(param: SensitivityParameter, percentChange: number): TEAInput_v2 {
    const variedInput = { ...this.config.baselineInput }
    const newValue = param.baseValue * (1 + percentChange / 100)

    // Update the parameter
    const key = param.name as keyof TEAInput_v2
    if (key in variedInput) {
      ;(variedInput as any)[key] = newValue
    }

    return variedInput
  }

  /**
   * Calculate results for varied input
   */
  private calculateResults(input: TEAInput_v2): TEAResult_v2 {
    const calculator = new TEACalculator(input)
    const calculations = calculator.calculate({ includeProvenance: false })

    return {
      ...input,
      lcoe: calculations.lcoe,
      npv: calculations.npv,
      irr: calculations.irr,
      payback_years: calculations.paybackSimple,
      total_capex: calculations.totalCapex,
      annual_opex: calculations.totalOpexAnnual,
      total_lifetime_cost: calculations.totalLifetimeCost,
      annual_production_mwh: this.config.baselineInput.annual_production_mwh || 0,
      lifetime_production_mwh: 0,
      annual_revenue: 0,
      lifetime_revenue_npv: 0,
      capex_breakdown: { equipment: 0, installation: 0, land: 0, grid_connection: 0 },
      opex_breakdown: { capacity_based: 0, fixed: 0, variable: 0, insurance: 0 },
      cash_flows: [],
      extendedMetrics: {
        msp: calculations.msp,
        lcop: calculations.lcop,
        roi: calculations.roi,
        profitabilityIndex: calculations.profitabilityIndex,
        benefitCostRatio: calculations.benefitCostRatio,
        mitigationCost: calculations.mitigationCost,
      },
    } as TEAResult_v2
  }

  /**
   * Calculate robustness score (0-100)
   * Higher score = less sensitive to parameter variations
   */
  private calculateRobustnessScore(tornadoData: TornadoPlotData[]): number {
    if (tornadoData.length === 0) return 100

    // Average the sensitivity indices
    const avgSensitivity =
      tornadoData.reduce((sum, d) => sum + d.sensitivity, 0) / tornadoData.length

    // Convert to robustness (inverse relationship)
    // Sensitivity of 1 = moderate robustness (50)
    // Sensitivity of 2 = low robustness (25)
    // Sensitivity of 0.5 = high robustness (75)
    const robustness = Math.max(0, Math.min(100, 100 - avgSensitivity * 25))

    return Math.round(robustness)
  }
}

/**
 * Convenience function to run sensitivity analysis
 */
export async function runSensitivityAnalysis(
  input: TEAInput_v2,
  customParams?: SensitivityParameter[]
): Promise<SensitivityAnalysisResult> {
  const parameters = customParams || getDefaultSensitivityParams(input)

  const config: SensitivityConfig = {
    parameters,
    baselineInput: input,
    targetMetrics: ['lcoe', 'npv', 'irr'],
    variationSteps: 10,
  }

  const engine = new SensitivityEngine(config)
  return await engine.analyze()
}

/**
 * Generate spider plot data (multi-parameter visualization)
 */
export function generateSpiderPlotData(
  sensitivityResult: SensitivityAnalysisResult,
  metric: 'npv' | 'lcoe' = 'npv'
): {
  parameters: string[]
  baseCaseValues: number[]
  lowCaseImpacts: number[]
  highCaseImpacts: number[]
} {
  const parameters: string[] = []
  const baseCaseValues: number[] = []
  const lowCaseImpacts: number[] = []
  const highCaseImpacts: number[] = []

  for (const data of sensitivityResult.tornadoData.slice(0, 8)) {
    // Top 8 parameters
    parameters.push(data.parameter)
    const baseValue = metric === 'npv' ? data.baseCase.npv : data.baseCase.lcoe
    baseCaseValues.push(baseValue)

    if (metric === 'npv') {
      lowCaseImpacts.push(data.lowCase.impact)
      highCaseImpacts.push(data.highCase.impact)
    } else {
      lowCaseImpacts.push(data.lowCase.lcoe - data.baseCase.lcoe)
      highCaseImpacts.push(data.highCase.lcoe - data.baseCase.lcoe)
    }
  }

  return {
    parameters,
    baseCaseValues,
    lowCaseImpacts,
    highCaseImpacts,
  }
}

/**
 * Two-parameter sensitivity analysis (2D heatmap data)
 */
export async function runTwoParameterSensitivity(
  input: TEAInput_v2,
  param1: SensitivityParameter,
  param2: SensitivityParameter,
  steps: number = 10
): Promise<{
  param1Values: number[]
  param2Values: number[]
  npvMatrix: number[][] // [param1Index][param2Index]
  lcoeMatrix: number[][]
}> {
  const param1Values: number[] = []
  const param2Values: number[] = []
  const npvMatrix: number[][] = []
  const lcoeMatrix: number[][] = []

  // Generate parameter value ranges
  for (let i = 0; i < steps; i++) {
    const param1Pct = param1.variationRange.low + (i / (steps - 1)) * (param1.variationRange.high - param1.variationRange.low)
    param1Values.push(param1.baseValue * (1 + param1Pct / 100))

    const param2Pct = param2.variationRange.low + (i / (steps - 1)) * (param2.variationRange.high - param2.variationRange.low)
    param2Values.push(param2.baseValue * (1 + param2Pct / 100))
  }

  // Calculate results for each combination
  for (let i = 0; i < steps; i++) {
    npvMatrix[i] = []
    lcoeMatrix[i] = []

    for (let j = 0; j < steps; j++) {
      const variedInput = { ...input }
      ;(variedInput as any)[param1.name] = param1Values[i]
      ;(variedInput as any)[param2.name] = param2Values[j]

      const calculator = new TEACalculator(variedInput)
      const results = calculator.calculate({ includeProvenance: false })

      npvMatrix[i][j] = results.npv
      lcoeMatrix[i][j] = results.lcoe
    }
  }

  return {
    param1Values,
    param2Values,
    npvMatrix,
    lcoeMatrix,
  }
}

/**
 * Analyze sensitivity results for insights
 */
export function analyzeSensitivityResults(result: SensitivityAnalysisResult): {
  keyInsights: string[]
  recommendations: string[]
  riskAreas: string[]
} {
  const insights: string[] = []
  const recommendations: string[] = []
  const riskAreas: string[] = []

  // Identify most critical parameter
  const topParam = result.tornadoData[0]
  if (topParam) {
    insights.push(
      `${topParam.parameter} has the highest impact on project economics (elasticity: ${topParam.sensitivity.toFixed(2)})`
    )

    // Check if it's a cost or revenue parameter
    if (topParam.parameter.includes('cost') || topParam.parameter.includes('capex') || topParam.parameter.includes('opex')) {
      recommendations.push(`Focus cost reduction efforts on ${topParam.parameter}`)
    } else if (topParam.parameter.includes('price') || topParam.parameter.includes('revenue')) {
      recommendations.push(`Secure long-term contracts to stabilize ${topParam.parameter}`)
    }
  }

  // Check for high sensitivity parameters
  const highSensitivity = result.tornadoData.filter(d => d.sensitivity > 1.5)
  if (highSensitivity.length > 0) {
    insights.push(`${highSensitivity.length} parameters show high sensitivity (>1.5 elasticity)`)
    riskAreas.push(...highSensitivity.map(d => d.parameter))
  }

  // Robustness assessment
  if (result.summary.robustnessScore < 50) {
    insights.push(`Low robustness score (${result.summary.robustnessScore}/100) - project highly sensitive to variations`)
    recommendations.push('Consider risk mitigation strategies or design changes to improve robustness')
  } else if (result.summary.robustnessScore >= 75) {
    insights.push(`High robustness score (${result.summary.robustnessScore}/100) - project resilient to parameter variations`)
  }

  // Check for asymmetric sensitivities
  for (const data of result.tornadoData.slice(0, 5)) {
    const lowImpactAbs = Math.abs(data.lowCase.impact)
    const highImpactAbs = Math.abs(data.highCase.impact)
    const asymmetry = Math.abs(lowImpactAbs - highImpactAbs) / Math.max(lowImpactAbs, highImpactAbs)

    if (asymmetry > 0.5) {
      insights.push(
        `${data.parameter} shows asymmetric sensitivity (${asymmetry.toFixed(0)}% asymmetry)`
      )
      if (lowImpactAbs > highImpactAbs) {
        recommendations.push(`Downside risk in ${data.parameter} - establish floor values`)
      } else {
        recommendations.push(`Upside potential in ${data.parameter} - explore optimization`)
      }
    }
  }

  return {
    keyInsights: insights,
    recommendations,
    riskAreas,
  }
}
