/**
 * TEA Visualization System
 *
 * Generates publication-quality charts for TEA reports:
 * - Tornado plots (sensitivity analysis)
 * - Waterfall charts (cost buildup)
 * - Probability distributions (Monte Carlo)
 * - Parametric studies (sensitivity curves)
 * - Cost breakdown pies
 * - Time series (cash flow trends, degradation)
 * - Scatter plots (Monte Carlo results)
 * - Heat maps (2D sensitivity)
 *
 * Exports to base64 images for PDF inclusion
 * Uses Recharts data format for compatibility with React components
 */

import type { TornadoPlotData } from './sensitivity'
import type { MonteCarloResult } from './monte-carlo'
import type { ProFormaStatement } from './financial-engine'
import type { TEAResult_v2 } from '@/types/tea'

/**
 * Chart configuration
 */
export interface ChartConfig {
  width: number
  height: number
  title?: string
  theme: 'light' | 'dark'
  colorScheme: 'default' | 'colorblind-safe' | 'grayscale'
  fontSize: number
  showGrid: boolean
  showLegend: boolean
}

export const DEFAULT_CHART_CONFIG: ChartConfig = {
  width: 800,
  height: 500,
  theme: 'light',
  colorScheme: 'default',
  fontSize: 12,
  showGrid: true,
  showLegend: true,
}

/**
 * Color schemes
 */
const COLOR_SCHEMES = {
  default: {
    primary: '#10b981', // emerald-500
    secondary: '#3b82f6', // blue-500
    tertiary: '#f59e0b', // amber-500
    error: '#ef4444', // red-400
    success: '#10b981',
    series: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6'],
  },
  'colorblind-safe': {
    primary: '#0173B2',
    secondary: '#DE8F05',
    tertiary: '#029E73',
    error: '#CC78BC',
    success: '#029E73',
    series: ['#0173B2', '#DE8F05', '#029E73', '#CC78BC', '#ECE133', '#56B4E9'],
  },
  grayscale: {
    primary: '#374151',
    secondary: '#6b7280',
    tertiary: '#9ca3af',
    error: '#1f2937',
    success: '#4b5563',
    series: ['#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db'],
  },
}

/**
 * Tornado Plot Data Generator
 * Prepares data for Recharts BarChart (horizontal)
 */
export function prepareTornadoPlotData(tornadoData: TornadoPlotData[]) {
  return tornadoData.map(item => ({
    parameter: item.parameter,
    lowImpact: item.lowCase.impact / 1e6, // Convert to millions
    highImpact: item.highCase.impact / 1e6,
    baseValue: item.baseCase.value,
    unit: item.unit,
  }))
}

/**
 * Monte Carlo Distribution Data
 * Prepares histogram data
 */
export function prepareMonteCarloHistogram(
  distribution: number[],
  bins: number = 50
): Array<{
  bin: string
  count: number
  frequency: number
}> {
  if (distribution.length === 0) return []

  const sorted = [...distribution].sort((a, b) => a - b)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const binWidth = (max - min) / bins

  const histogram: Array<{ bin: string; count: number; frequency: number }> = []

  for (let i = 0; i < bins; i++) {
    const binStart = min + i * binWidth
    const binEnd = binStart + binWidth
    const binMid = (binStart + binEnd) / 2

    const count = sorted.filter(v => v >= binStart && v < binEnd).length
    const frequency = count / distribution.length

    histogram.push({
      bin: binMid.toFixed(2),
      count,
      frequency,
    })
  }

  return histogram
}

/**
 * Cash Flow Time Series Data
 */
export function prepareCashFlowData(proForma: ProFormaStatement) {
  return proForma.years.map(year => ({
    year: year.year,
    revenue: year.totalRevenue / 1e6, // Millions
    expenses: year.totalOPEX / 1e6,
    netIncome: year.netIncome / 1e6,
    cashFlow: year.freeCashFlow / 1e6,
    cumulative: year.cumulativeCashFlow / 1e6,
  }))
}

/**
 * Cost Breakdown Pie Chart Data
 */
export function prepareCostBreakdownData(result: TEAResult_v2) {
  return [
    { name: 'Equipment', value: result.capex_breakdown.equipment, color: '#10b981' },
    { name: 'Installation', value: result.capex_breakdown.installation, color: '#3b82f6' },
    { name: 'Land', value: result.capex_breakdown.land, color: '#8b5cf6' },
    { name: 'Grid Connection', value: result.capex_breakdown.grid_connection, color: '#f59e0b' },
  ]
}

/**
 * Sensitivity Curve Data (Parametric Study)
 */
export function prepareSensitivityCurveData(
  parameterName: string,
  points: Array<{ parameterValue: number; npv: number; lcoe: number }>
) {
  return points.map(point => ({
    parameter: point.parameterValue,
    npv: point.npv / 1e6, // Millions
    lcoe: point.lcoe,
  }))
}

/**
 * Box Plot Data (for Monte Carlo percentiles)
 */
export function prepareBoxPlotData(mcResult: MonteCarloResult) {
  return {
    lcoe: {
      min: mcResult.metrics.lcoe.min,
      p5: mcResult.metrics.lcoe.p5,
      median: mcResult.metrics.lcoe.median,
      p95: mcResult.metrics.lcoe.p95,
      max: mcResult.metrics.lcoe.max,
      mean: mcResult.metrics.lcoe.mean,
    },
    npv: {
      min: mcResult.metrics.npv.min / 1e6,
      p5: mcResult.metrics.npv.p5 / 1e6,
      median: mcResult.metrics.npv.median / 1e6,
      p95: mcResult.metrics.npv.p95 / 1e6,
      max: mcResult.metrics.npv.max / 1e6,
      mean: mcResult.metrics.npv.mean / 1e6,
    },
  }
}

/**
 * Waterfall Chart Data (Cost Build-up)
 */
export function prepareWaterfallData(result: TEAResult_v2) {
  let cumulative = 0
  const data = []

  const items = [
    { name: 'Equipment', value: result.capex_breakdown.equipment },
    { name: 'Installation', value: result.capex_breakdown.installation },
    { name: 'Land', value: result.capex_breakdown.land },
    { name: 'Grid Connection', value: result.capex_breakdown.grid_connection },
  ]

  items.forEach(item => {
    data.push({
      name: item.name,
      value: item.value / 1e6,
      start: cumulative / 1e6,
      end: (cumulative + item.value) / 1e6,
    })
    cumulative += item.value
  })

  data.push({
    name: 'Total',
    value: cumulative / 1e6,
    start: 0,
    end: cumulative / 1e6,
  })

  return data
}

/**
 * Heatmap Data (2D Sensitivity)
 */
export function prepareHeatmapData(params: {
  param1Values: number[]
  param2Values: number[]
  npvMatrix: number[][]
  param1Name: string
  param2Name: string
}) {
  const heatmapData: Array<{
    param1: number
    param2: number
    npv: number
    color: string
  }> = []

  for (let i = 0; i < params.param1Values.length; i++) {
    for (let j = 0; j < params.param2Values.length; j++) {
      heatmapData.push({
        param1: params.param1Values[i],
        param2: params.param2Values[j],
        npv: params.npvMatrix[i][j] / 1e6,
        color: params.npvMatrix[i][j] > 0 ? '#10b981' : '#ef4444',
      })
    }
  }

  return heatmapData
}

/**
 * Chart color helper
 */
export function getChartColors(
  scheme: 'default' | 'colorblind-safe' | 'grayscale' = 'default'
) {
  return COLOR_SCHEMES[scheme]
}

/**
 * Format chart for export (placeholder for actual implementation)
 * In production, this would use html2canvas or similar to convert React charts to images
 */
export async function exportChartToBase64(
  chartElement: HTMLElement
): Promise<string> {
  // Placeholder - actual implementation would use html2canvas
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
}
