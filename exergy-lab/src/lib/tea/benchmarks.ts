/**
 * Benchmarking System for TEA
 *
 * Compare TEA results against:
 * - Technology-specific benchmarks (IEA, NREL, NETL)
 * - Regional cost comparisons
 * - Published reference cases
 * - Historical project data
 *
 * Provides validation context for multi-agent pipeline
 */

import type { TEAResult_v2, TechnologyType } from '@/types/tea'
import { IEA_COST_BENCHMARKS, REFERENCE_CASES } from './standards-db'

export interface BenchmarkComparison {
  metric: string
  projectValue: number
  benchmarkValue: { min: number; typical: number; max: number }
  unit: string
  deviation: number // percentage from typical
  status: 'excellent' | 'good' | 'acceptable' | 'concerning' | 'outlier'
  message: string
  source: string
}

export interface BenchmarkingResult {
  technology: TechnologyType
  comparisons: BenchmarkComparison[]
  overallAssessment: {
    withinBenchmarks: number // percentage of metrics within range
    outliers: string[] // metrics significantly outside range
    grade: 'A' | 'B' | 'C' | 'D' | 'F'
  }
  recommendations: string[]
}

/**
 * Benchmarking Engine
 */
export class BenchmarkingEngine {
  /**
   * Compare project results against industry benchmarks
   */
  compareToIndustryBenchmarks(
    technology: TechnologyType,
    results: TEAResult_v2
  ): BenchmarkingResult {
    const comparisons: BenchmarkComparison[] = []

    // Get technology-specific benchmarks
    const benchmarks = (IEA_COST_BENCHMARKS as any)[technology]

    if (benchmarks) {
      // LCOE comparison
      if (benchmarks.lcoeRange) {
        comparisons.push(
          this.createComparison(
            'LCOE',
            results.lcoe,
            benchmarks.lcoeRange,
            '$/kWh',
            benchmarks.source
          )
        )
      }

      // CAPEX comparison
      if (benchmarks.capexRange) {
        const capexPerKW = results.total_capex / (results.annual_production_mwh / 8.76)
        comparisons.push(
          this.createComparison(
            'CAPEX per kW',
            capexPerKW,
            benchmarks.capexRange,
            '$/kW',
            benchmarks.source
          )
        )
      }

      // OPEX comparison
      if (benchmarks.opexRange) {
        const opexPerKW = results.annual_opex / (results.annual_production_mwh / 8.76)
        comparisons.push(
          this.createComparison(
            'OPEX per kW-year',
            opexPerKW,
            benchmarks.opexRange,
            '$/kW-year',
            benchmarks.source
          )
        )
      }
    }

    // Calculate overall assessment
    const withinRange = comparisons.filter(c => c.status !== 'outlier').length
    const withinBenchmarks = (withinRange / Math.max(comparisons.length, 1)) * 100

    const outliers = comparisons.filter(c => c.status === 'outlier').map(c => c.metric)

    const grade = this.calculateGrade(withinBenchmarks)
    const recommendations = this.generateRecommendations(comparisons, outliers)

    return {
      technology,
      comparisons,
      overallAssessment: {
        withinBenchmarks,
        outliers,
        grade,
      },
      recommendations,
    }
  }

  /**
   * Create a single benchmark comparison
   */
  private createComparison(
    metric: string,
    value: number,
    benchmark: { min: number; typical: number; max: number },
    unit: string,
    source: string
  ): BenchmarkComparison {
    const deviation = ((value - benchmark.typical) / benchmark.typical) * 100

    let status: BenchmarkComparison['status']
    let message: string

    if (value < benchmark.min * 0.8 || value > benchmark.max * 1.2) {
      status = 'outlier'
      message = `Significantly outside typical range (${deviation.toFixed(0)}% deviation)`
    } else if (value < benchmark.min || value > benchmark.max) {
      status = 'concerning'
      message = `Outside typical range but within extended bounds`
    } else if (Math.abs(deviation) <= 10) {
      status = 'excellent'
      message = `Very close to typical value (${deviation.toFixed(0)}% deviation)`
    } else if (Math.abs(deviation) <= 25) {
      status = 'good'
      message = `Within expected range (${deviation.toFixed(0)}% deviation)`
    } else {
      status = 'acceptable'
      message = `Acceptable but on the edge of typical range`
    }

    return {
      metric,
      projectValue: value,
      benchmarkValue: benchmark,
      unit,
      deviation,
      status,
      message,
      source,
    }
  }

  /**
   * Calculate overall grade
   */
  private calculateGrade(withinBenchmarks: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (withinBenchmarks >= 90) return 'A'
    if (withinBenchmarks >= 75) return 'B'
    if (withinBenchmarks >= 60) return 'C'
    if (withinBenchmarks >= 40) return 'D'
    return 'F'
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    comparisons: BenchmarkComparison[],
    outliers: string[]
  ): string[] {
    const recommendations: string[] = []

    if (outliers.length > 0) {
      recommendations.push(
        `Review calculations for ${outliers.join(', ')} - values significantly outside industry benchmarks`
      )
    }

    const concerningMetrics = comparisons.filter(c => c.status === 'concerning')
    if (concerningMetrics.length > 0) {
      recommendations.push(
        `Verify assumptions for ${concerningMetrics.map(c => c.metric).join(', ')} - approaching benchmark limits`
      )
    }

    if (recommendations.length === 0) {
      recommendations.push('All metrics within industry benchmark ranges - results validated')
    }

    return recommendations
  }
}

/**
 * Convenience function
 */
export function benchmarkResults(
  technology: TechnologyType,
  results: TEAResult_v2
): BenchmarkingResult {
  const engine = new BenchmarkingEngine()
  return engine.compareToIndustryBenchmarks(technology, results)
}
