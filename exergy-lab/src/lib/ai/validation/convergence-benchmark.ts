/**
 * Simulation Convergence Benchmark
 *
 * Validates that Tier 2/3 simulation runs actually converged
 * and produced physically sensible results:
 * - Residual convergence (mass, energy, momentum)
 * - Iteration count check
 * - Numerical stability (no NaN/Inf)
 * - Energy conservation
 * - Mass balance
 *
 * Weight: 0.10 (prevents nonsense from bad sims)
 * Confidence: 0.95 (numerical checks are reliable)
 */

import type {
  BenchmarkResult,
  BenchmarkItemResult,
  BenchmarkMetadata,
  ConvergenceThresholds,
  SimulationResiduals,
  ConvergenceResult,
} from './types'

// ============================================================================
// Convergence Configuration
// ============================================================================

export interface ConvergenceBenchmarkConfig {
  thresholds: ConvergenceThresholds
  maxIterations: number
  maxIterationRatio: number // Warn if used > this % of max iterations
  energyBalanceTolerance: number
  massBalanceTolerance: number
}

export const DEFAULT_CONVERGENCE_CONFIG: ConvergenceBenchmarkConfig = {
  thresholds: {
    mass: 1e-4,
    energy: 1e-4,
    momentum: 1e-3,
  },
  maxIterations: 10000,
  maxIterationRatio: 0.95, // Warn if used > 95% of max iterations
  energyBalanceTolerance: 0.01, // 1% energy balance error
  massBalanceTolerance: 1e-6, // Mass should be very conserved
}

// ============================================================================
// Common Simulation Output Patterns
// ============================================================================

// Keywords indicating numerical issues
const NUMERICAL_ISSUE_KEYWORDS = [
  'nan',
  'inf',
  'infinity',
  '-inf',
  'diverged',
  'divergence',
  'overflow',
  'underflow',
  'singular',
  'ill-conditioned',
]

// Keywords indicating convergence success
const CONVERGENCE_SUCCESS_KEYWORDS = [
  'converged',
  'convergence achieved',
  'solution converged',
  'residuals below',
  'steady state reached',
]

// Keywords indicating convergence failure
const CONVERGENCE_FAILURE_KEYWORDS = [
  'did not converge',
  'failed to converge',
  'convergence failed',
  'maximum iterations reached',
  'iteration limit',
]

// ============================================================================
// Convergence Benchmark Validator
// ============================================================================

export class ConvergenceBenchmarkValidator {
  private config: ConvergenceBenchmarkConfig
  private startTime: number = 0

  constructor(config: Partial<ConvergenceBenchmarkConfig> = {}) {
    this.config = {
      ...DEFAULT_CONVERGENCE_CONFIG,
      ...config,
      thresholds: {
        ...DEFAULT_CONVERGENCE_CONFIG.thresholds,
        ...config.thresholds,
      },
    }
  }

  /**
   * Validate simulation convergence and numerical quality
   */
  async validate(simulationOutput: any): Promise<BenchmarkResult> {
    this.startTime = Date.now()

    const items: BenchmarkItemResult[] = []

    // SC1: Residual convergence
    items.push(this.checkResidualConvergence(simulationOutput))

    // SC2: Iteration count check
    items.push(this.checkIterationCount(simulationOutput))

    // SC3: Numerical stability
    items.push(this.checkNumericalStability(simulationOutput))

    // SC4: Energy conservation
    items.push(this.checkEnergyConservation(simulationOutput))

    // SC5: Mass balance
    items.push(this.checkMassBalance(simulationOutput))

    // Calculate totals
    const totalScore = items.reduce((sum, item) => sum + item.score, 0)
    const maxScore = items.reduce((sum, item) => sum + item.maxScore, 0)

    const metadata: BenchmarkMetadata = {
      evaluationTimeMs: Date.now() - this.startTime,
      version: '1.0.0',
      checksRun: items.length,
    }

    return {
      benchmarkType: 'simulation_convergence',
      score: this.normalizeScore(totalScore, maxScore),
      maxScore: 10,
      passed: totalScore >= maxScore * 0.7,
      weight: 0.10,
      confidence: 0.95, // High confidence - numerical checks
      items,
      metadata,
    }
  }

  /**
   * SC1: Check residual convergence
   */
  private checkResidualConvergence(output: any): BenchmarkItemResult {
    const residuals = this.extractResiduals(output)
    const violations: string[] = []

    // Check each residual type against threshold
    for (const [key, threshold] of Object.entries(this.config.thresholds)) {
      const value = residuals[key]
      if (value !== undefined && value > threshold) {
        violations.push(`${key}: ${value.toExponential(2)} > ${threshold.toExponential(2)}`)
      }
    }

    // Also check any custom residuals in the output
    for (const [key, value] of Object.entries(residuals)) {
      if (!(key in this.config.thresholds) && typeof value === 'number') {
        // Use a default threshold for unknown residuals
        const defaultThreshold = 1e-3
        if (value > defaultThreshold) {
          violations.push(`${key}: ${value.toExponential(2)} (high)`)
        }
      }
    }

    let score: number
    let passed: boolean
    let reasoning: string
    const suggestions: string[] = []

    if (Object.keys(residuals).length === 0) {
      // No residual data available
      score = 1.0 // Neutral score - can't verify
      passed = true
      reasoning = 'No residual data available to validate convergence'
      suggestions.push('Include final residual values in simulation output')
    } else if (violations.length === 0) {
      score = 2.0
      passed = true
      reasoning = 'All residuals below convergence thresholds'
    } else if (violations.length === 1) {
      score = 1.0
      passed = false
      reasoning = `One residual not converged: ${violations[0]}`
      suggestions.push('Increase iteration count or relax convergence criteria')
    } else {
      score = 0.25
      passed = false
      reasoning = `${violations.length} residuals not converged: ${violations.join(', ')}`
      suggestions.push('Review mesh quality and boundary conditions')
      suggestions.push('Consider under-relaxation factors')
    }

    return {
      id: 'SC1',
      name: 'Residual Convergence',
      score,
      maxScore: 2.0,
      passed,
      reasoning,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      evidence: violations.length > 0 ? violations : undefined,
    }
  }

  /**
   * SC2: Check iteration count
   */
  private checkIterationCount(output: any): BenchmarkItemResult {
    const iterations = this.extractIterationInfo(output)

    let score: number
    let passed: boolean
    let reasoning: string
    const suggestions: string[] = []

    if (iterations.count === null) {
      score = 1.0 // Neutral
      passed = true
      reasoning = 'No iteration count data available'
    } else if (iterations.reachedMax) {
      score = 0.25
      passed = false
      reasoning = `Reached maximum iterations (${iterations.count}/${iterations.maxIterations})`
      suggestions.push('Solution may not be converged - increase max iterations')
      suggestions.push('Check for oscillations or divergence')
    } else {
      const ratio = iterations.count / iterations.maxIterations

      if (ratio < 0.5) {
        score = 2.0
        passed = true
        reasoning = `Converged efficiently in ${iterations.count} iterations (${Math.round(ratio * 100)}% of max)`
      } else if (ratio < this.config.maxIterationRatio) {
        score = 1.5
        passed = true
        reasoning = `Converged in ${iterations.count} iterations (${Math.round(ratio * 100)}% of max)`
      } else {
        score = 0.75
        passed = true // Still converged, just slowly
        reasoning = `Slow convergence: ${iterations.count} iterations (${Math.round(ratio * 100)}% of max)`
        suggestions.push('Consider improving initial conditions')
      }
    }

    return {
      id: 'SC2',
      name: 'Iteration Count',
      score,
      maxScore: 2.0,
      passed,
      reasoning,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    }
  }

  /**
   * SC3: Check numerical stability (no NaN/Inf)
   */
  private checkNumericalStability(output: any): BenchmarkItemResult {
    const issues = this.detectNumericalIssues(output)

    let score: number
    let passed: boolean
    let reasoning: string
    const suggestions: string[] = []

    if (issues.length === 0) {
      score = 2.0
      passed = true
      reasoning = 'No numerical instabilities detected (NaN/Inf free)'
    } else if (issues.length <= 2) {
      score = 0.5
      passed = false
      reasoning = `Numerical issues detected: ${issues.join(', ')}`
      suggestions.push('Check for division by zero or extreme values')
      suggestions.push('Review boundary conditions for physical consistency')
    } else {
      score = 0
      passed = false
      reasoning = `Multiple numerical issues: ${issues.slice(0, 3).join(', ')}${issues.length > 3 ? '...' : ''}`
      suggestions.push('Simulation has significant numerical problems')
      suggestions.push('Consider smaller timestep or mesh refinement')
    }

    return {
      id: 'SC3',
      name: 'Numerical Stability',
      score,
      maxScore: 2.0,
      passed,
      reasoning,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      evidence: issues.length > 0 ? issues : undefined,
    }
  }

  /**
   * SC4: Check energy conservation
   */
  private checkEnergyConservation(output: any): BenchmarkItemResult {
    const energyBalance = this.extractEnergyBalance(output)

    let score: number
    let passed: boolean
    let reasoning: string
    const suggestions: string[] = []

    if (energyBalance.error === null) {
      score = 1.0 // Neutral
      passed = true
      reasoning = 'No energy balance data available'
      suggestions.push('Include energy balance verification in simulation')
    } else {
      const errorPercent = Math.abs(energyBalance.error) * 100

      if (errorPercent <= 0.1) {
        score = 2.0
        passed = true
        reasoning = `Excellent energy conservation: ${errorPercent.toFixed(3)}% error`
      } else if (errorPercent <= 1.0) {
        score = 1.5
        passed = true
        reasoning = `Good energy conservation: ${errorPercent.toFixed(2)}% error`
      } else if (errorPercent <= 5.0) {
        score = 0.75
        passed = false
        reasoning = `Marginal energy conservation: ${errorPercent.toFixed(1)}% error`
        suggestions.push('Review heat source terms and boundary conditions')
      } else {
        score = 0.25
        passed = false
        reasoning = `Poor energy conservation: ${errorPercent.toFixed(1)}% error`
        suggestions.push('Significant energy imbalance - check for missing terms')
        suggestions.push('Verify all energy sources and sinks are accounted for')
      }
    }

    return {
      id: 'SC4',
      name: 'Energy Conservation',
      score,
      maxScore: 2.0,
      passed,
      reasoning,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    }
  }

  /**
   * SC5: Check mass balance
   */
  private checkMassBalance(output: any): BenchmarkItemResult {
    const massBalance = this.extractMassBalance(output)

    let score: number
    let passed: boolean
    let reasoning: string
    const suggestions: string[] = []

    if (massBalance.error === null) {
      score = 1.0 // Neutral
      passed = true
      reasoning = 'No mass balance data available'
      suggestions.push('Include mass balance verification in simulation')
    } else {
      const errorMagnitude = Math.abs(massBalance.error)

      if (errorMagnitude <= 1e-8) {
        score = 2.0
        passed = true
        reasoning = `Excellent mass conservation: ${errorMagnitude.toExponential(2)} error`
      } else if (errorMagnitude <= 1e-6) {
        score = 1.5
        passed = true
        reasoning = `Good mass conservation: ${errorMagnitude.toExponential(2)} error`
      } else if (errorMagnitude <= 1e-4) {
        score = 0.75
        passed = false
        reasoning = `Marginal mass conservation: ${errorMagnitude.toExponential(2)} error`
        suggestions.push('Check inlet/outlet boundary conditions')
      } else {
        score = 0.25
        passed = false
        reasoning = `Poor mass conservation: ${errorMagnitude.toExponential(2)} error`
        suggestions.push('Mass not conserved - check for sources/sinks')
        suggestions.push('Verify continuity equation implementation')
      }
    }

    return {
      id: 'SC5',
      name: 'Mass Balance',
      score,
      maxScore: 2.0,
      passed,
      reasoning,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Extract residuals from simulation output
   */
  private extractResiduals(output: any): SimulationResiduals {
    const residuals: SimulationResiduals = {}

    // Try various common patterns
    if (output?.finalResiduals) {
      Object.assign(residuals, output.finalResiduals)
    }

    if (output?.convergence?.residuals) {
      Object.assign(residuals, output.convergence.residuals)
    }

    if (output?.simulation?.residuals) {
      Object.assign(residuals, output.simulation.residuals)
    }

    // Check for individual residual properties
    if (output?.massResidual !== undefined) residuals.mass = output.massResidual
    if (output?.energyResidual !== undefined) residuals.energy = output.energyResidual
    if (output?.momentumResidual !== undefined) residuals.momentum = output.momentumResidual

    return residuals
  }

  /**
   * Extract iteration information
   */
  private extractIterationInfo(output: any): {
    count: number | null
    maxIterations: number
    reachedMax: boolean
  } {
    let count: number | null = null
    let maxIterations = this.config.maxIterations
    let reachedMax = false

    // Try various patterns
    if (output?.iterationCount !== undefined) count = output.iterationCount
    if (output?.iterations !== undefined) count = output.iterations
    if (output?.convergence?.iterations !== undefined) count = output.convergence.iterations
    if (output?.simulation?.iterations !== undefined) count = output.simulation.iterations

    if (output?.maxIterations !== undefined) maxIterations = output.maxIterations
    if (output?.convergence?.maxIterations !== undefined) maxIterations = output.convergence.maxIterations

    // Check for max iterations reached
    if (output?.convergence?.reachedMax !== undefined) reachedMax = output.convergence.reachedMax
    if (output?.reachedMaxIterations !== undefined) reachedMax = output.reachedMaxIterations

    // Infer if reached max
    if (count !== null && count >= maxIterations) {
      reachedMax = true
    }

    // Check text for indicators
    const outputText = JSON.stringify(output).toLowerCase()
    if (CONVERGENCE_FAILURE_KEYWORDS.some(kw => outputText.includes(kw))) {
      reachedMax = true
    }

    return { count, maxIterations, reachedMax }
  }

  /**
   * Detect numerical issues in output
   */
  private detectNumericalIssues(output: any): string[] {
    const issues: string[] = []
    const outputStr = JSON.stringify(output).toLowerCase()

    // Check for NaN/Inf keywords
    for (const keyword of NUMERICAL_ISSUE_KEYWORDS) {
      if (outputStr.includes(keyword)) {
        issues.push(keyword.toUpperCase())
      }
    }

    // Recursively check for actual NaN/Inf values
    this.findNumericalIssuesInObject(output, '', issues)

    return [...new Set(issues)] // Deduplicate
  }

  /**
   * Recursively find NaN/Inf values
   */
  private findNumericalIssuesInObject(obj: any, path: string, issues: string[]): void {
    if (obj === null || obj === undefined) return

    if (typeof obj === 'number') {
      if (isNaN(obj)) issues.push(`NaN at ${path || 'root'}`)
      if (!isFinite(obj)) issues.push(`Infinity at ${path || 'root'}`)
      return
    }

    if (Array.isArray(obj)) {
      for (let i = 0; i < Math.min(obj.length, 100); i++) {
        this.findNumericalIssuesInObject(obj[i], `${path}[${i}]`, issues)
      }
      return
    }

    if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        this.findNumericalIssuesInObject(value, path ? `${path}.${key}` : key, issues)
      }
    }
  }

  /**
   * Extract energy balance information
   */
  private extractEnergyBalance(output: any): { error: number | null; details?: string } {
    // Try various patterns
    if (output?.energyBalanceError !== undefined) {
      return { error: output.energyBalanceError }
    }

    if (output?.convergence?.energyBalance !== undefined) {
      const eb = output.convergence.energyBalance
      if (typeof eb === 'number') return { error: eb }
      if (eb.error !== undefined) return { error: eb.error }
    }

    if (output?.simulation?.energyBalance !== undefined) {
      const eb = output.simulation.energyBalance
      if (typeof eb === 'number') return { error: eb }
      if (eb.error !== undefined) return { error: eb.error }
    }

    // Check for energy in/out
    if (output?.energyIn !== undefined && output?.energyOut !== undefined) {
      const energyIn = output.energyIn
      const energyOut = output.energyOut
      if (energyIn > 0) {
        return { error: (energyOut - energyIn) / energyIn }
      }
    }

    return { error: null }
  }

  /**
   * Extract mass balance information
   */
  private extractMassBalance(output: any): { error: number | null; details?: string } {
    // Try various patterns
    if (output?.massBalanceError !== undefined) {
      return { error: output.massBalanceError }
    }

    if (output?.convergence?.massBalance !== undefined) {
      const mb = output.convergence.massBalance
      if (typeof mb === 'number') return { error: mb }
      if (mb.error !== undefined) return { error: mb.error }
    }

    if (output?.simulation?.massBalance !== undefined) {
      const mb = output.simulation.massBalance
      if (typeof mb === 'number') return { error: mb }
      if (mb.error !== undefined) return { error: mb.error }
    }

    // Check for mass in/out
    if (output?.massIn !== undefined && output?.massOut !== undefined) {
      const massIn = output.massIn
      const massOut = output.massOut
      return { error: massOut - massIn }
    }

    return { error: null }
  }

  /**
   * Normalize score to 0-10 scale
   */
  private normalizeScore(score: number, maxScore: number): number {
    if (maxScore === 0) return 0
    return (score / maxScore) * 10
  }

  /**
   * Analyze full convergence result
   */
  analyzeConvergence(output: any): ConvergenceResult {
    const residuals = this.extractResiduals(output)
    const iterations = this.extractIterationInfo(output)
    const numericalIssues = this.detectNumericalIssues(output)
    const energyBalance = this.extractEnergyBalance(output)
    const massBalance = this.extractMassBalance(output)

    const violations: string[] = []

    // Check residual violations
    for (const [key, threshold] of Object.entries(this.config.thresholds)) {
      const value = residuals[key]
      if (value !== undefined && value > threshold) {
        violations.push(`${key} residual not converged`)
      }
    }

    if (iterations.reachedMax) {
      violations.push('Maximum iterations reached')
    }

    if (numericalIssues.length > 0) {
      violations.push('Numerical instabilities detected')
    }

    return {
      converged: violations.length === 0,
      residuals,
      violations,
      iterationCount: iterations.count || 0,
      maxIterations: iterations.maxIterations,
      hasNumericalIssues: numericalIssues.length > 0,
      energyBalanceError: energyBalance.error || undefined,
      massBalanceError: massBalance.error || undefined,
    }
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const convergenceBenchmarkValidator = new ConvergenceBenchmarkValidator()
