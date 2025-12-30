/**
 * Uncertainty Quantification Framework
 *
 * Provides comprehensive uncertainty analysis for simulation results.
 * Separates uncertainty into three components:
 * - Aleatoric: Inherent randomness in the system
 * - Epistemic: Model/knowledge uncertainty (reducible)
 * - Numerical: Discretization and solver errors
 *
 * @see types.ts - SimulationResult interface
 * @see benchmark-validator.ts - Validation against benchmarks
 */

export interface UncertaintyResult {
  /** Inherent randomness in the system (irreducible) */
  aleatoric: number
  /** Model/knowledge uncertainty (reducible with more data) */
  epistemic: number
  /** Solver discretization and numerical errors */
  numerical: number
  /** Total combined uncertainty */
  total: number
  /** Confidence level (0-1) */
  confidenceLevel: number
  /** Parameter sensitivity analysis */
  parameterSensitivity: Map<string, ParameterSensitivity>
  /** Convergence analysis */
  convergence: ConvergenceAnalysis
  /** Recommendations for reducing uncertainty */
  recommendations: string[]
}

export interface ParameterSensitivity {
  /** Parameter name */
  name: string
  /** Sensitivity coefficient (dOutput/dInput * Input/Output) */
  sensitivity: number
  /** Uncertainty contribution (% of total) */
  contribution: number
  /** Is this a dominant source? */
  isDominant: boolean
  /** Suggested action to reduce */
  suggestion?: string
}

export interface ConvergenceAnalysis {
  /** Has the solution converged? */
  converged: boolean
  /** Residual norm */
  residual: number
  /** Number of iterations */
  iterations: number
  /** Convergence rate (if applicable) */
  convergenceRate?: number
  /** Richardson extrapolation estimate */
  richardsonEstimate?: number
  /** Grid independence achieved? */
  gridIndependent?: boolean
}

export interface UncertaintyConfig {
  /** Confidence level for intervals (default 0.95) */
  confidenceLevel: number
  /** Monte Carlo samples for propagation */
  monteCarloSamples: number
  /** Enable sensitivity analysis */
  enableSensitivity: boolean
  /** Parameter variations for sensitivity (% of nominal) */
  sensitivityVariation: number
  /** Convergence tolerance */
  convergenceTolerance: number
}

export const DEFAULT_UNCERTAINTY_CONFIG: UncertaintyConfig = {
  confidenceLevel: 0.95,
  monteCarloSamples: 1000,
  enableSensitivity: true,
  sensitivityVariation: 0.05, // 5%
  convergenceTolerance: 1e-6,
}

/**
 * Uncertainty Quantifier
 *
 * Analyzes simulation results to quantify and decompose uncertainty.
 */
export class UncertaintyQuantifier {
  private config: UncertaintyConfig

  constructor(config: Partial<UncertaintyConfig> = {}) {
    this.config = { ...DEFAULT_UNCERTAINTY_CONFIG, ...config }
  }

  /**
   * Quantify uncertainty in simulation results
   */
  quantify(
    results: SimulationOutputs,
    inputs: SimulationInputs,
    metadata: SimulationMetadata
  ): UncertaintyResult {
    // Calculate individual uncertainty components
    const aleatoric = this.calculateAleatoric(results, inputs)
    const epistemic = this.calculateEpistemic(results, metadata)
    const numerical = this.calculateNumerical(results, metadata)

    // Combine using root-sum-square (assuming independence)
    const total = Math.sqrt(aleatoric ** 2 + epistemic ** 2 + numerical ** 2)

    // Parameter sensitivity analysis
    const parameterSensitivity = this.config.enableSensitivity
      ? this.analyzeSensitivity(results, inputs)
      : new Map()

    // Convergence analysis
    const convergence = this.analyzeConvergence(results, metadata)

    // Calculate confidence level based on uncertainty
    const confidenceLevel = this.calculateConfidenceLevel(total, results)

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      { aleatoric, epistemic, numerical, total },
      parameterSensitivity,
      convergence
    )

    return {
      aleatoric,
      epistemic,
      numerical,
      total,
      confidenceLevel,
      parameterSensitivity,
      convergence,
      recommendations,
    }
  }

  /**
   * Calculate aleatoric (irreducible) uncertainty
   * From inherent variability in input parameters
   */
  private calculateAleatoric(
    results: SimulationOutputs,
    inputs: SimulationInputs
  ): number {
    // Aleatoric uncertainty comes from:
    // 1. Natural variability in physical parameters
    // 2. Environmental conditions (wind speed, solar irradiance)
    // 3. Manufacturing tolerances

    let totalVariance = 0

    // Check if inputs have uncertainty bounds
    for (const [key, value] of Object.entries(inputs)) {
      if (typeof value === 'object' && value !== null) {
        const inputObj = value as { mean?: number; std?: number; min?: number; max?: number }

        // If standard deviation is provided
        if (inputObj.std !== undefined && inputObj.mean !== undefined) {
          const cv = inputObj.std / inputObj.mean // Coefficient of variation
          totalVariance += cv ** 2
        }
        // If range is provided, estimate std from range
        else if (inputObj.min !== undefined && inputObj.max !== undefined) {
          const range = inputObj.max - inputObj.min
          const mean = (inputObj.max + inputObj.min) / 2
          const estimatedStd = range / 4 // Approximate 95% coverage
          const cv = estimatedStd / mean
          totalVariance += cv ** 2
        }
      }
    }

    // Also check for explicit uncertainty in results
    for (const output of Object.values(results)) {
      if (typeof output === 'object' && output !== null) {
        const outputObj = output as { value?: number; uncertainty?: number }
        if (outputObj.uncertainty !== undefined && outputObj.value !== undefined) {
          const relativeUncertainty = outputObj.uncertainty / outputObj.value
          totalVariance += relativeUncertainty ** 2
        }
      }
    }

    // Return standard deviation (square root of variance)
    return Math.sqrt(totalVariance)
  }

  /**
   * Calculate epistemic (model) uncertainty
   * From incomplete knowledge about the system
   */
  private calculateEpistemic(
    results: SimulationOutputs,
    metadata: SimulationMetadata
  ): number {
    // Epistemic uncertainty sources:
    // 1. Model simplifications
    // 2. Unknown physical parameters
    // 3. Unvalidated assumptions

    let epistemicUncertainty = 0

    // Provider-based uncertainty estimate
    // Analytical models have higher epistemic uncertainty than physics-based
    const providerUncertainty: Record<string, number> = {
      analytical: 0.15, // 15% model uncertainty
      modal: 0.08,      // 8% for Monte Carlo
      physx: 0.05,      // 5% for physics simulation
      mujoco: 0.05,     // 5% for mechanical simulation
    }

    epistemicUncertainty += providerUncertainty[metadata.provider] || 0.10

    // Tier-based adjustment
    const tierUncertainty: Record<string, number> = {
      tier1: 0.10, // Analytical
      tier2: 0.05, // GPU Monte Carlo
      tier3: 0.03, // High-fidelity
    }

    epistemicUncertainty += tierUncertainty[metadata.tier] || 0.05

    // Check for validation status
    if (!metadata.validated) {
      epistemicUncertainty += 0.10 // Additional uncertainty for unvalidated models
    }

    // Domain-specific uncertainty
    if (metadata.domain) {
      const domainUncertainty: Record<string, number> = {
        solar: 0.05,      // Well-characterized
        wind: 0.08,       // Variable conditions
        battery: 0.10,    // Complex electrochemistry
        hydrogen: 0.12,   // Less mature technology
        geothermal: 0.15, // Site-specific
      }
      epistemicUncertainty += domainUncertainty[metadata.domain] || 0.08
    }

    return epistemicUncertainty
  }

  /**
   * Calculate numerical uncertainty
   * From discretization and solver approximations
   */
  private calculateNumerical(
    results: SimulationOutputs,
    metadata: SimulationMetadata
  ): number {
    // Numerical uncertainty sources:
    // 1. Time/space discretization
    // 2. Solver convergence
    // 3. Floating point errors

    let numericalUncertainty = 0

    // Residual-based estimate
    if (metadata.residual !== undefined) {
      numericalUncertainty += metadata.residual
    }

    // Iteration-based estimate (more iterations = better convergence)
    if (metadata.iterations !== undefined) {
      const expectedIterations = 1000
      const iterationFactor = Math.sqrt(expectedIterations / Math.max(metadata.iterations, 1))
      numericalUncertainty += 0.01 * Math.min(iterationFactor, 5)
    }

    // Time step influence (for transient simulations)
    if (metadata.timeStep !== undefined) {
      // Smaller time step = lower numerical error
      // Assume 0.001s is baseline
      const timeStepFactor = Math.sqrt(metadata.timeStep / 0.001)
      numericalUncertainty += 0.005 * Math.min(timeStepFactor, 10)
    }

    // Mesh resolution (for spatial simulations)
    if (metadata.meshSize !== undefined) {
      // Larger mesh = lower error (assume h^2 convergence)
      const meshFactor = Math.sqrt(1000 / Math.max(metadata.meshSize, 10))
      numericalUncertainty += 0.01 * Math.min(meshFactor, 5)
    }

    return numericalUncertainty
  }

  /**
   * Analyze parameter sensitivity using finite differences
   */
  private analyzeSensitivity(
    results: SimulationOutputs,
    inputs: SimulationInputs
  ): Map<string, ParameterSensitivity> {
    const sensitivities = new Map<string, ParameterSensitivity>()

    // Get primary output value
    const primaryOutput = this.getPrimaryOutput(results)
    if (primaryOutput === undefined) return sensitivities

    let totalContribution = 0
    const contributions: Array<{ name: string; contribution: number }> = []

    // Calculate sensitivity for each numeric input
    for (const [name, value] of Object.entries(inputs)) {
      let nominalValue: number | undefined

      if (typeof value === 'number') {
        nominalValue = value
      } else if (typeof value === 'object' && value !== null) {
        const obj = value as { mean?: number; value?: number }
        nominalValue = obj.mean ?? obj.value
      }

      if (nominalValue === undefined || nominalValue === 0) continue

      // Estimate sensitivity using assumed linear relationship
      // In a real implementation, this would run perturbed simulations
      const estimatedSensitivity = this.estimateParameterSensitivity(
        name,
        nominalValue,
        primaryOutput
      )

      // Calculate contribution to total variance
      const inputUncertainty = this.getInputUncertainty(value)
      const contribution = (estimatedSensitivity * inputUncertainty) ** 2

      contributions.push({ name, contribution })
      totalContribution += contribution

      sensitivities.set(name, {
        name,
        sensitivity: estimatedSensitivity,
        contribution: 0, // Will update after normalization
        isDominant: false,
        suggestion: this.getSensitivitySuggestion(name, estimatedSensitivity),
      })
    }

    // Normalize contributions and identify dominant sources
    for (const { name, contribution } of contributions) {
      const entry = sensitivities.get(name)
      if (entry) {
        const normalizedContribution = totalContribution > 0
          ? contribution / totalContribution
          : 0

        entry.contribution = normalizedContribution
        entry.isDominant = normalizedContribution > 0.25 // >25% contribution
        sensitivities.set(name, entry)
      }
    }

    return sensitivities
  }

  /**
   * Analyze convergence of the simulation
   */
  private analyzeConvergence(
    results: SimulationOutputs,
    metadata: SimulationMetadata
  ): ConvergenceAnalysis {
    const residual = metadata.residual ?? 1e-4
    const iterations = metadata.iterations ?? 0
    const converged = residual < this.config.convergenceTolerance && iterations > 0

    // Estimate convergence rate from residual history (if available)
    let convergenceRate: number | undefined
    if (metadata.residualHistory && metadata.residualHistory.length > 2) {
      const history = metadata.residualHistory
      const n = history.length
      // Estimate rate from last few iterations
      convergenceRate = Math.log(history[n - 1] / history[n - 3]) / 2
    }

    // Richardson extrapolation for grid convergence
    let richardsonEstimate: number | undefined
    let gridIndependent: boolean | undefined

    if (metadata.meshRefinementStudy) {
      const study = metadata.meshRefinementStudy
      if (study.length >= 3) {
        // Assume p=2 order convergence
        const f1 = study[0].value
        const f2 = study[1].value
        const f3 = study[2].value
        const r = study[1].meshSize / study[0].meshSize

        richardsonEstimate = f1 + (f1 - f2) / (r ** 2 - 1)

        // Grid independent if extrapolated value is within 1%
        gridIndependent = Math.abs(f1 - richardsonEstimate) / Math.abs(richardsonEstimate) < 0.01
      }
    }

    return {
      converged,
      residual,
      iterations,
      convergenceRate,
      richardsonEstimate,
      gridIndependent,
    }
  }

  /**
   * Calculate overall confidence level
   */
  private calculateConfidenceLevel(
    totalUncertainty: number,
    results: SimulationOutputs
  ): number {
    // Map uncertainty to confidence (inverse relationship)
    // 0% uncertainty -> 100% confidence
    // 50% uncertainty -> ~60% confidence (sigmoid-like)

    // Start with base confidence from uncertainty
    let confidence = Math.exp(-2 * totalUncertainty)

    // Adjust for result completeness
    const expectedOutputs = ['efficiency', 'lcoe', 'power', 'energy']
    const presentOutputs = Object.keys(results).filter(k => expectedOutputs.includes(k))
    const completeness = presentOutputs.length / expectedOutputs.length
    confidence *= (0.5 + 0.5 * completeness)

    return Math.max(0, Math.min(1, confidence))
  }

  /**
   * Generate recommendations for reducing uncertainty
   */
  private generateRecommendations(
    uncertainties: { aleatoric: number; epistemic: number; numerical: number; total: number },
    sensitivities: Map<string, ParameterSensitivity>,
    convergence: ConvergenceAnalysis
  ): string[] {
    const recommendations: string[] = []

    // Prioritize dominant uncertainty sources
    const sources = [
      { type: 'aleatoric', value: uncertainties.aleatoric },
      { type: 'epistemic', value: uncertainties.epistemic },
      { type: 'numerical', value: uncertainties.numerical },
    ].sort((a, b) => b.value - a.value)

    const dominant = sources[0]

    if (dominant.type === 'aleatoric' && dominant.value > 0.10) {
      recommendations.push(
        'Reduce input parameter uncertainty by obtaining more precise measurements'
      )

      // Find dominant parameters
      for (const [name, sens] of sensitivities) {
        if (sens.isDominant) {
          recommendations.push(
            `Focus on ${name}: contributes ${(sens.contribution * 100).toFixed(0)}% of variance`
          )
        }
      }
    }

    if (dominant.type === 'epistemic' && dominant.value > 0.10) {
      recommendations.push(
        'Validate model against experimental data or higher-fidelity simulations'
      )
      recommendations.push(
        'Consider using physics-based simulation (PhysX/MuJoCo) instead of analytical models'
      )
    }

    if (dominant.type === 'numerical' && dominant.value > 0.05) {
      if (!convergence.converged) {
        recommendations.push(
          'Increase number of iterations - simulation has not fully converged'
        )
      }
      if (convergence.gridIndependent === false) {
        recommendations.push(
          'Refine mesh resolution - grid independence not achieved'
        )
      }
    }

    // General recommendations based on total uncertainty
    if (uncertainties.total > 0.30) {
      recommendations.push(
        'Consider Monte Carlo analysis to better characterize output distribution'
      )
    }

    if (recommendations.length === 0) {
      recommendations.push('Uncertainty is within acceptable bounds')
    }

    return recommendations
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private getPrimaryOutput(results: SimulationOutputs): number | undefined {
    // Priority order for primary output
    const priority = ['efficiency', 'lcoe', 'power', 'energy', 'cost']

    for (const key of priority) {
      const value = results[key]
      if (typeof value === 'number') return value
      if (typeof value === 'object' && value !== null) {
        const obj = value as { value?: number; mean?: number }
        if (obj.value !== undefined) return obj.value
        if (obj.mean !== undefined) return obj.mean
      }
    }

    // Return first numeric value
    for (const value of Object.values(results)) {
      if (typeof value === 'number') return value
    }

    return undefined
  }

  private estimateParameterSensitivity(
    name: string,
    nominalValue: number,
    output: number
  ): number {
    // Empirical sensitivity coefficients for common parameters
    const sensitivities: Record<string, number> = {
      efficiency: 1.0,          // Direct proportional
      cost: -0.8,               // Inverse relationship
      costPerKw: -0.8,
      lifetime: 0.6,            // Moderate positive
      capacityFactor: 0.9,      // Strong positive
      windSpeed: 3.0,           // Cubic relationship for wind
      solarIrradiance: 1.0,     // Linear for solar
      temperature: -0.2,        // Slight negative (derating)
      pressure: 0.1,            // Weak positive
      density: 0.5,             // Moderate positive
    }

    // Normalize parameter name
    const normalizedName = name.toLowerCase().replace(/[_-]/g, '')

    for (const [key, value] of Object.entries(sensitivities)) {
      if (normalizedName.includes(key.toLowerCase())) {
        return value
      }
    }

    // Default moderate sensitivity
    return 0.5
  }

  private getInputUncertainty(value: unknown): number {
    if (typeof value === 'number') {
      return 0.05 // Assume 5% default uncertainty
    }

    if (typeof value === 'object' && value !== null) {
      const obj = value as { std?: number; mean?: number; min?: number; max?: number }

      if (obj.std !== undefined && obj.mean !== undefined) {
        return obj.std / obj.mean
      }
      if (obj.min !== undefined && obj.max !== undefined) {
        const mean = (obj.max + obj.min) / 2
        return (obj.max - obj.min) / (4 * mean)
      }
    }

    return 0.10 // Higher default if uncertain
  }

  private getSensitivitySuggestion(name: string, sensitivity: number): string | undefined {
    if (Math.abs(sensitivity) > 1.5) {
      return `${name} has strong influence - prioritize accurate measurements`
    }
    if (Math.abs(sensitivity) < 0.1) {
      return `${name} has minimal influence - may simplify model`
    }
    return undefined
  }
}

// ============================================================================
// Type Definitions
// ============================================================================

interface SimulationOutputs {
  [key: string]: number | { value: number; uncertainty?: number } | unknown
}

interface SimulationInputs {
  [key: string]: number | { mean?: number; std?: number; min?: number; max?: number; value?: number } | unknown
}

interface SimulationMetadata {
  provider: string
  tier: string
  validated?: boolean
  domain?: string
  residual?: number
  iterations?: number
  timeStep?: number
  meshSize?: number
  residualHistory?: number[]
  meshRefinementStudy?: Array<{ meshSize: number; value: number }>
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an uncertainty quantifier with optional configuration
 */
export function createUncertaintyQuantifier(
  config?: Partial<UncertaintyConfig>
): UncertaintyQuantifier {
  return new UncertaintyQuantifier(config)
}
