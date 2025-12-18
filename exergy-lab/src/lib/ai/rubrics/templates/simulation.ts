/**
 * Simulation Phase Rubric
 *
 * Evaluates the quality of simulation results.
 * Total: 10 points, Pass threshold: 7
 */

import type { Rubric, RubricItem, ItemScore } from '../types'

// ============================================================================
// Thermodynamic Limits for Validation
// ============================================================================

const THERMODYNAMIC_LIMITS = {
  // Solar
  shockleyQueisser: 0.337, // Single junction solar cell efficiency limit
  concentratedSolar: 0.86, // Concentrated solar with ideal conditions

  // Wind
  betz: 0.593, // Betz limit for wind turbines

  // Heat engines
  carnotMax: 1.0, // Carnot efficiency (T_hot - T_cold) / T_hot

  // Electrolysis
  electrolysisMax: 1.48, // Thermoneutral voltage for water electrolysis (V)

  // Fuel cells
  fuelCellMax: 0.83, // Maximum fuel cell efficiency (HHV)

  // Storage
  batteryRoundTrip: 0.99, // Maximum realistic battery round-trip efficiency
}

// ============================================================================
// Automated Validation Functions
// ============================================================================

function validateConvergence(response: any): ItemScore {
  const results = response?.results || response?.simulations || [response]

  if (!Array.isArray(results) || results.length === 0) {
    return {
      itemId: 'S1',
      points: 0,
      maxPoints: 2.0,
      passed: false,
      reasoning: 'No simulation results found',
    }
  }

  let convergedCount = 0
  for (const r of results) {
    const metrics = r.convergenceMetrics || r.convergence || {}
    const converged = metrics.converged === true
    const residualOk = metrics.residual !== undefined &&
      metrics.tolerance !== undefined &&
      metrics.residual <= metrics.tolerance

    if (converged || residualOk) {
      convergedCount++
    }
  }

  const ratio = convergedCount / results.length
  let points = 0
  let reasoning = ''

  if (ratio >= 0.9) {
    points = 2.0
    reasoning = `Excellent: ${convergedCount}/${results.length} simulations converged`
  } else if (ratio >= 0.7) {
    points = 1.5
    reasoning = `Good: ${convergedCount}/${results.length} simulations converged`
  } else if (ratio >= 0.5) {
    points = 1.0
    reasoning = `Acceptable: ${convergedCount}/${results.length} simulations converged`
  } else {
    points = 0.5
    reasoning = `Poor: Only ${convergedCount}/${results.length} simulations converged`
  }

  return {
    itemId: 'S1',
    points,
    maxPoints: 2.0,
    passed: points >= 1.4,
    reasoning,
  }
}

function validateOutputCompleteness(response: any): ItemScore {
  const results = response?.results || response?.simulations || [response]

  if (!Array.isArray(results) || results.length === 0) {
    return {
      itemId: 'S2',
      points: 0,
      maxPoints: 1.5,
      passed: false,
      reasoning: 'No simulation results found',
    }
  }

  let totalOutputs = 0
  let outputsWithUnits = 0
  let outputsWithConfidence = 0

  for (const r of results) {
    const outputs = r.outputs || []
    for (const o of outputs) {
      totalOutputs++
      if (o.unit || o.units) outputsWithUnits++
      if (o.confidence !== undefined) outputsWithConfidence++
    }
  }

  const avgOutputs = totalOutputs / results.length
  const unitsRatio = totalOutputs > 0 ? outputsWithUnits / totalOutputs : 0

  let points = 0
  let reasoning = ''

  if (avgOutputs >= 5 && unitsRatio >= 0.8) {
    points = 1.5
    reasoning = `Excellent: Avg ${avgOutputs.toFixed(1)} outputs/sim, ${Math.round(unitsRatio * 100)}% have units`
  } else if (avgOutputs >= 3 && unitsRatio >= 0.6) {
    points = 1.0
    reasoning = `Good: Avg ${avgOutputs.toFixed(1)} outputs/sim, ${Math.round(unitsRatio * 100)}% have units`
  } else if (avgOutputs >= 2) {
    points = 0.75
    reasoning = `Limited: Avg ${avgOutputs.toFixed(1)} outputs/sim`
  } else {
    points = 0.25
    reasoning = `Insufficient: Avg ${avgOutputs.toFixed(1)} outputs/sim`
  }

  return {
    itemId: 'S2',
    points,
    maxPoints: 1.5,
    passed: points >= 1.05,
    reasoning,
  }
}

function validatePhysicalLimits(response: any): ItemScore {
  const results = response?.results || response?.simulations || [response]

  if (!Array.isArray(results) || results.length === 0) {
    return {
      itemId: 'S3',
      points: 0,
      maxPoints: 2.0,
      passed: false,
      reasoning: 'No simulation results to validate against physical limits',
    }
  }

  const violations: string[] = []

  for (const r of results) {
    const outputs = r.outputs || []
    const simType = r.type || r.simulationType || ''

    for (const o of outputs) {
      const value = o.value
      const name = (o.name || o.metric || '').toLowerCase()

      // Check efficiency limits
      if (name.includes('efficiency') || name.includes('eta') || name === 'η') {
        // General efficiency check (can't exceed 100%)
        if (value > 1 && !name.includes('exerg')) {
          violations.push(`${name}: ${value} exceeds 100%`)
        }

        // Solar efficiency
        if (simType.includes('solar') || name.includes('solar')) {
          if (value > THERMODYNAMIC_LIMITS.concentratedSolar) {
            violations.push(`Solar efficiency ${value} exceeds concentrated solar limit (${THERMODYNAMIC_LIMITS.concentratedSolar})`)
          }
        }

        // Wind efficiency
        if (simType.includes('wind') || name.includes('wind')) {
          if (value > THERMODYNAMIC_LIMITS.betz) {
            violations.push(`Wind efficiency ${value} exceeds Betz limit (${THERMODYNAMIC_LIMITS.betz})`)
          }
        }
      }

      // Check for negative energies (except binding energy)
      if ((name.includes('energy') || name.includes('power')) &&
        !name.includes('binding') && !name.includes('formation')) {
        if (value < 0) {
          violations.push(`${name}: Negative value ${value} is unphysical`)
        }
      }

      // Check temperature (must be above absolute zero)
      if (name.includes('temperature') || name.includes('temp')) {
        const unit = (o.unit || '').toLowerCase()
        if (unit.includes('k') && value < 0) {
          violations.push(`Temperature ${value}K below absolute zero`)
        }
        if (unit.includes('c') && value < -273.15) {
          violations.push(`Temperature ${value}°C below absolute zero`)
        }
      }
    }
  }

  let points = 0
  let reasoning = ''

  if (violations.length === 0) {
    points = 2.0
    reasoning = 'All outputs within physical limits'
  } else if (violations.length <= 1) {
    points = 1.0
    reasoning = `Minor violation: ${violations[0]}`
  } else {
    points = 0
    reasoning = `Multiple violations: ${violations.slice(0, 3).join('; ')}`
  }

  return {
    itemId: 'S3',
    points,
    maxPoints: 2.0,
    passed: violations.length === 0,
    reasoning,
  }
}

function validateExergyAnalysis(response: any): ItemScore {
  const results = response?.results || response?.simulations || [response]

  let hasExergyAnalysis = false
  let exergyDetails: string[] = []

  for (const r of results) {
    const exergy = r.exergy || r.exergyAnalysis || {}

    if (exergy.secondLawEfficiency !== undefined) {
      hasExergyAnalysis = true
      exergyDetails.push(`η_II = ${(exergy.secondLawEfficiency * 100).toFixed(1)}%`)
    }

    if (exergy.exergyDestruction !== undefined) {
      hasExergyAnalysis = true
      exergyDetails.push(`Destruction = ${exergy.exergyDestruction}`)
    }

    // Check outputs for exergy metrics
    const outputs = r.outputs || []
    for (const o of outputs) {
      const name = (o.name || '').toLowerCase()
      if (name.includes('exergy') || name.includes('second law')) {
        hasExergyAnalysis = true
        exergyDetails.push(`${o.name} = ${o.value}${o.unit || ''}`)
      }
    }
  }

  let points = 0
  let reasoning = ''

  if (hasExergyAnalysis && exergyDetails.length >= 2) {
    points = 1.5
    reasoning = `Complete exergy analysis: ${exergyDetails.slice(0, 3).join(', ')}`
  } else if (hasExergyAnalysis) {
    points = 1.0
    reasoning = `Partial exergy analysis: ${exergyDetails[0] || 'present'}`
  } else {
    points = 0
    reasoning = 'No exergy analysis found in simulation results'
  }

  return {
    itemId: 'S4',
    points,
    maxPoints: 1.5,
    passed: points >= 1.05,
    reasoning,
  }
}

function validateUncertainty(response: any): ItemScore {
  const results = response?.results || response?.simulations || [response]

  let totalOutputs = 0
  let outputsWithUncertainty = 0

  for (const r of results) {
    const outputs = r.outputs || []
    for (const o of outputs) {
      totalOutputs++
      if (o.uncertainty !== undefined || o.error !== undefined ||
        o.confidenceInterval !== undefined || o.stdDev !== undefined) {
        outputsWithUncertainty++
      }
    }
  }

  const ratio = totalOutputs > 0 ? outputsWithUncertainty / totalOutputs : 0
  let points = 0
  let reasoning = ''

  if (ratio >= 0.8) {
    points = 1.0
    reasoning = `Excellent: ${Math.round(ratio * 100)}% of outputs have uncertainty`
  } else if (ratio >= 0.5) {
    points = 0.75
    reasoning = `Good: ${Math.round(ratio * 100)}% of outputs have uncertainty`
  } else if (ratio >= 0.25) {
    points = 0.5
    reasoning = `Limited: ${Math.round(ratio * 100)}% of outputs have uncertainty`
  } else {
    points = 0.25
    reasoning = `Insufficient: Only ${Math.round(ratio * 100)}% of outputs have uncertainty`
  }

  return {
    itemId: 'S6',
    points,
    maxPoints: 1.0,
    passed: points >= 0.7,
    reasoning,
  }
}

// ============================================================================
// Rubric Items
// ============================================================================

const simulationRubricItems: RubricItem[] = [
  {
    id: 'S1',
    description: 'Converged with residual < tolerance',
    points: 2.0,
    category: 'accuracy',
    passCondition: 'All simulations converged with residual below specified tolerance',
    partialConditions: [
      { condition: '90%+ converged', points: 2.0 },
      { condition: '70-89% converged', points: 1.5 },
      { condition: '50-69% converged', points: 1.0 },
      { condition: '<50% converged', points: 0.5 },
    ],
    automatedValidation: validateConvergence,
  },
  {
    id: 'S2',
    description: '5+ outputs with units and confidence',
    points: 1.5,
    category: 'completeness',
    passCondition: 'Each simulation produces at least 5 outputs with proper units',
    partialConditions: [
      { condition: '5+ outputs with 80%+ units', points: 1.5 },
      { condition: '3-4 outputs with 60%+ units', points: 1.0 },
      { condition: '2+ outputs', points: 0.75 },
      { condition: '<2 outputs', points: 0.25 },
    ],
    automatedValidation: validateOutputCompleteness,
  },
  {
    id: 'S3',
    description: 'All outputs within physical limits',
    points: 2.0,
    category: 'thermodynamics',
    passCondition: 'All outputs comply with thermodynamic limits (Carnot, Betz, Shockley-Queisser)',
    partialConditions: [
      { condition: 'No violations', points: 2.0 },
      { condition: '1 minor violation', points: 1.0 },
      { condition: 'Multiple violations', points: 0 },
    ],
    automatedValidation: validatePhysicalLimits,
  },
  {
    id: 'S4',
    description: 'Exergy efficiency calculated',
    points: 1.5,
    category: 'thermodynamics',
    passCondition: 'Second-law (exergy) efficiency is calculated with exergy destruction analysis',
    partialConditions: [
      { condition: 'Complete exergy analysis', points: 1.5 },
      { condition: 'Partial exergy analysis', points: 1.0 },
      { condition: 'No exergy analysis', points: 0 },
    ],
    automatedValidation: validateExergyAnalysis,
  },
  {
    id: 'S5',
    description: 'Boundary conditions documented',
    points: 1.0,
    category: 'methodology',
    passCondition: 'At least 3 boundary conditions are clearly documented',
    // Requires AI judge
  },
  {
    id: 'S6',
    description: 'Uncertainty quantified (±X%)',
    points: 1.0,
    category: 'accuracy',
    passCondition: 'All outputs include uncertainty quantification',
    partialConditions: [
      { condition: '80%+ have uncertainty', points: 1.0 },
      { condition: '50-79% have uncertainty', points: 0.75 },
      { condition: '25-49% have uncertainty', points: 0.5 },
      { condition: '<25% have uncertainty', points: 0.25 },
    ],
    automatedValidation: validateUncertainty,
  },
  {
    id: 'S7',
    description: 'Compared to literature benchmarks',
    points: 1.0,
    category: 'accuracy',
    passCondition: 'Results are compared against at least 2 literature benchmarks',
    // Requires AI judge
  },
]

// ============================================================================
// Simulation Rubric Export
// ============================================================================

export const SIMULATION_RUBRIC: Rubric = {
  id: 'simulation-v1',
  name: 'Simulation Phase Rubric',
  phase: 'simulation',
  domain: 'clean-energy',
  items: simulationRubricItems,
  totalPoints: 10,
  successThreshold: 7,
  maxIterations: 3,
  metadata: {
    version: '1.0.0',
    author: 'FrontierScience Discovery Engine',
    lastUpdated: new Date('2024-12-17'),
    sourceDataset: 'Based on OpenAI FrontierScience methodology',
  },
}

// Validate that points sum to 10
const totalPoints = simulationRubricItems.reduce((sum, item) => sum + item.points, 0)
if (Math.abs(totalPoints - 10) > 0.001) {
  console.warn(`Simulation rubric points sum to ${totalPoints}, expected 10`)
}

// Export thermodynamic limits for use elsewhere
export { THERMODYNAMIC_LIMITS }
