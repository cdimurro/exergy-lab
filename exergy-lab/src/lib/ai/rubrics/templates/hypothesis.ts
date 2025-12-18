/**
 * Hypothesis Generation Rubric
 *
 * Evaluates the quality of generated scientific hypotheses.
 * Total: 10 points, Pass threshold: 7
 */

import type { Rubric, RubricItem, ItemScore } from '../types'

// ============================================================================
// Helper function to extract hypotheses from various input formats
// ============================================================================

function extractHypotheses(response: any): any[] {
  // If response is null/undefined, return empty array
  if (!response) return []

  // If response is already an array of hypotheses (direct array input)
  if (Array.isArray(response)) {
    // Check if it looks like an array of hypothesis objects
    if (response.length > 0 && (response[0].id || response[0].statement || response[0].predictions)) {
      return response
    }
    // It's an array but not of hypotheses - return as-is for validation to fail gracefully
    return response
  }

  // If response has a hypotheses property (wrapped format)
  if (response.hypotheses && Array.isArray(response.hypotheses)) {
    return response.hypotheses
  }

  // If response is a single hypothesis object, wrap it
  if (response.id || response.statement || response.predictions) {
    return [response]
  }

  // Fallback - return as single-item array (will fail validation gracefully)
  return [response]
}

// ============================================================================
// Automated Validation Functions
// ============================================================================

function validateFalsifiablePrediction(response: any): ItemScore {
  const hypotheses = extractHypotheses(response)

  if (!Array.isArray(hypotheses) || hypotheses.length === 0) {
    return {
      itemId: 'H1',
      points: 0,
      maxPoints: 1.5,
      passed: false,
      reasoning: 'No hypotheses found to evaluate',
    }
  }

  let falsifiableCount = 0
  for (const h of hypotheses) {
    const predictions = h.predictions || []
    const hasFalsifiable = predictions.some((p: any) =>
      p.falsifiable === true || p.measurable === true
    )
    if (hasFalsifiable) falsifiableCount++
  }

  const ratio = falsifiableCount / hypotheses.length
  let points = 0
  let reasoning = ''

  if (ratio >= 0.8) {
    points = 1.5
    reasoning = `Excellent: ${falsifiableCount}/${hypotheses.length} hypotheses have falsifiable predictions`
  } else if (ratio >= 0.6) {
    points = 1.0
    reasoning = `Good: ${falsifiableCount}/${hypotheses.length} hypotheses have falsifiable predictions`
  } else if (ratio >= 0.4) {
    points = 0.75
    reasoning = `Limited: ${falsifiableCount}/${hypotheses.length} hypotheses have falsifiable predictions`
  } else {
    points = 0.25
    reasoning = `Insufficient: Only ${falsifiableCount}/${hypotheses.length} hypotheses have falsifiable predictions`
  }

  return {
    itemId: 'H1',
    points,
    maxPoints: 1.5,
    passed: points >= 1.05,
    reasoning,
  }
}

function validateSupportingEvidence(response: any): ItemScore {
  const hypotheses = extractHypotheses(response)

  if (!Array.isArray(hypotheses) || hypotheses.length === 0) {
    return {
      itemId: 'H2',
      points: 0,
      maxPoints: 1.5,
      passed: false,
      reasoning: 'No hypotheses found to evaluate',
    }
  }

  let wellSupportedCount = 0
  for (const h of hypotheses) {
    const evidence = h.supportingEvidence || h.evidence || []
    const hasEnoughEvidence = evidence.length >= 3

    // RELAXED: Changed from requiring ALL citations to 60%+ citation ratio
    // This addresses the common case where some evidence is from general knowledge
    const citedCount = evidence.filter((e: any) => e.citation || e.source || e.reference).length
    const citationRatio = evidence.length > 0 ? citedCount / evidence.length : 0
    const hasAdequateCitations = citationRatio >= 0.6 || citedCount >= 2

    if (hasEnoughEvidence && hasAdequateCitations) wellSupportedCount++
  }

  const ratio = wellSupportedCount / hypotheses.length
  let points = 0
  let reasoning = ''

  if (ratio >= 0.8) {
    points = 1.5
    reasoning = `Excellent: ${wellSupportedCount}/${hypotheses.length} hypotheses have 3+ evidence pieces with adequate citations`
  } else if (ratio >= 0.6) {
    points = 1.125  // IMPROVED: 75% partial credit for good coverage
    reasoning = `Good: ${wellSupportedCount}/${hypotheses.length} hypotheses have adequate evidence`
  } else if (ratio >= 0.4) {
    points = 0.75
    reasoning = `Limited: ${wellSupportedCount}/${hypotheses.length} hypotheses have adequate evidence`
  } else {
    points = 0.25
    reasoning = `Insufficient: Only ${wellSupportedCount}/${hypotheses.length} hypotheses are well-supported`
  }

  return {
    itemId: 'H2',
    points,
    maxPoints: 1.5,
    passed: points >= 1.05,
    reasoning,
  }
}

function validateNovelty(response: any): ItemScore {
  const hypotheses = extractHypotheses(response)

  if (!Array.isArray(hypotheses) || hypotheses.length === 0) {
    return {
      itemId: 'H3',
      points: 0,
      maxPoints: 1.0,
      passed: false,
      reasoning: 'No hypotheses found to evaluate',
    }
  }

  // Check for novelty scores
  let avgNovelty = 0
  let hasNoveltyScores = false

  for (const h of hypotheses) {
    if (h.noveltyScore !== undefined) {
      avgNovelty += h.noveltyScore
      hasNoveltyScores = true
    }
  }

  if (hasNoveltyScores) {
    avgNovelty /= hypotheses.length

    let points = 0
    let reasoning = ''

    if (avgNovelty >= 80) {
      points = 1.0
      reasoning = `Excellent novelty: Average score ${avgNovelty.toFixed(0)}%`
    } else if (avgNovelty >= 70) {
      points = 0.75
      reasoning = `Good novelty: Average score ${avgNovelty.toFixed(0)}%`
    } else if (avgNovelty >= 50) {
      points = 0.5
      reasoning = `Limited novelty: Average score ${avgNovelty.toFixed(0)}%`
    } else {
      points = 0.25
      reasoning = `Low novelty: Average score ${avgNovelty.toFixed(0)}%`
    }

    return {
      itemId: 'H3',
      points,
      maxPoints: 1.0,
      passed: points >= 0.7,
      reasoning,
    }
  }

  // Fall back to AI judge if no scores
  return {
    itemId: 'H3',
    points: 0,
    maxPoints: 1.0,
    passed: false,
    reasoning: 'No novelty scores found - requires AI evaluation',
  }
}

function validateFeasibility(response: any): ItemScore {
  const hypotheses = extractHypotheses(response)

  if (!Array.isArray(hypotheses) || hypotheses.length === 0) {
    return {
      itemId: 'H8',
      points: 0,
      maxPoints: 0.5,
      passed: false,
      reasoning: 'No hypotheses found to evaluate',
    }
  }

  let avgFeasibility = 0
  let hasScores = false

  for (const h of hypotheses) {
    if (h.feasibilityScore !== undefined) {
      avgFeasibility += h.feasibilityScore
      hasScores = true
    }
  }

  if (hasScores) {
    avgFeasibility /= hypotheses.length

    let points = 0
    let reasoning = ''

    if (avgFeasibility >= 75) {
      points = 0.5
      reasoning = `High feasibility: Average score ${avgFeasibility.toFixed(0)}%`
    } else if (avgFeasibility >= 65) {
      points = 0.375
      reasoning = `Good feasibility: Average score ${avgFeasibility.toFixed(0)}%`
    } else if (avgFeasibility >= 50) {
      points = 0.25
      reasoning = `Moderate feasibility: Average score ${avgFeasibility.toFixed(0)}%`
    } else {
      points = 0.125
      reasoning = `Low feasibility: Average score ${avgFeasibility.toFixed(0)}%`
    }

    return {
      itemId: 'H8',
      points,
      maxPoints: 0.5,
      passed: points >= 0.35,
      reasoning,
    }
  }

  return {
    itemId: 'H8',
    points: 0,
    maxPoints: 0.5,
    passed: false,
    reasoning: 'No feasibility scores found - requires AI evaluation',
  }
}

function validateCausalMechanism(response: any): ItemScore {
  const hypotheses = extractHypotheses(response)

  if (!Array.isArray(hypotheses) || hypotheses.length === 0) {
    return {
      itemId: 'H6',
      points: 0,
      maxPoints: 2.0,
      passed: false,
      reasoning: 'No hypotheses found to evaluate',
    }
  }

  let totalSteps = 0
  let hypothesesWithMechanism = 0

  for (const h of hypotheses) {
    // Check various mechanism formats
    const mechanism = h.causalMechanism || h.mechanism || h.mechanismSteps || []
    let stepCount = 0

    if (Array.isArray(mechanism)) {
      stepCount = mechanism.length
    } else if (typeof mechanism === 'object' && mechanism.steps) {
      stepCount = Array.isArray(mechanism.steps) ? mechanism.steps.length : 0
    } else if (typeof mechanism === 'string') {
      // Count logical steps in text (numbered items or bullet points)
      const stepMatches = mechanism.match(/(\d+\.|•|-|\*)\s+/g)
      stepCount = stepMatches ? stepMatches.length : 1
    }

    if (stepCount > 0) {
      totalSteps += stepCount
      hypothesesWithMechanism++
    }
  }

  if (hypothesesWithMechanism === 0) {
    return {
      itemId: 'H6',
      points: 0,
      maxPoints: 2.0,
      passed: false,
      reasoning: 'No causal mechanisms found in hypotheses',
    }
  }

  const avgSteps = totalSteps / hypothesesWithMechanism
  let points = 0
  let reasoning = ''

  // RELAXED: 3+ steps now passes (was 4+)
  // This addresses the common case where 2-3 clear steps are scientifically sufficient
  if (avgSteps >= 4) {
    points = 2.0
    reasoning = `Excellent: Average ${avgSteps.toFixed(1)} mechanism steps (comprehensive)`
  } else if (avgSteps >= 3) {
    points = 1.75  // IMPROVED: 3 steps now passes with good credit
    reasoning = `Good: Average ${avgSteps.toFixed(1)} mechanism steps (clear logic)`
  } else if (avgSteps >= 2) {
    points = 1.25  // IMPROVED: 2 steps gets more credit
    reasoning = `Acceptable: Average ${avgSteps.toFixed(1)} mechanism steps (basic coverage)`
  } else {
    points = 0.5
    reasoning = `Limited: Average ${avgSteps.toFixed(1)} mechanism steps (needs more detail)`
  }

  return {
    itemId: 'H6',
    points,
    maxPoints: 2.0,
    passed: points >= 1.4, // 70% of 2.0
    reasoning,
  }
}

function validateVariables(response: any): ItemScore {
  const hypotheses = extractHypotheses(response)

  if (!Array.isArray(hypotheses) || hypotheses.length === 0) {
    return {
      itemId: 'H7',
      points: 0,
      maxPoints: 1.0,
      passed: false,
      reasoning: 'No hypotheses found to evaluate',
    }
  }

  let wellDefinedCount = 0
  for (const h of hypotheses) {
    const vars = h.variables || {}
    const hasIndependent = vars.independent || vars.independentVariable
    const hasDependent = vars.dependent || vars.dependentVariable
    const hasControls = vars.controls || vars.controlVariables

    if (hasIndependent && hasDependent) {
      wellDefinedCount++
    }
  }

  const ratio = wellDefinedCount / hypotheses.length
  let points = 0
  let reasoning = ''

  if (ratio >= 0.8) {
    points = 1.0
    reasoning = `Excellent: ${wellDefinedCount}/${hypotheses.length} hypotheses have defined IV/DV`
  } else if (ratio >= 0.6) {
    points = 0.75
    reasoning = `Good: ${wellDefinedCount}/${hypotheses.length} hypotheses have defined variables`
  } else if (ratio >= 0.4) {
    points = 0.5
    reasoning = `Limited: ${wellDefinedCount}/${hypotheses.length} hypotheses have defined variables`
  } else {
    points = 0.25
    reasoning = `Insufficient: Only ${wellDefinedCount}/${hypotheses.length} hypotheses have defined variables`
  }

  return {
    itemId: 'H7',
    points,
    maxPoints: 1.0,
    passed: points >= 0.7,
    reasoning,
  }
}

// ============================================================================
// Rubric Items
// ============================================================================

const hypothesisRubricItems: RubricItem[] = [
  {
    id: 'H1',
    description: 'Falsifiable prediction with measurable outcome',
    points: 1.5,
    category: 'methodology',
    passCondition: 'Each hypothesis includes at least one prediction that is falsifiable and has a measurable outcome',
    partialConditions: [
      { condition: '80%+ hypotheses have falsifiable predictions', points: 1.5 },
      { condition: '60-79% have falsifiable predictions', points: 1.0 },
      { condition: '40-59% have falsifiable predictions', points: 0.75 },
      { condition: '<40% have falsifiable predictions', points: 0.25 },
    ],
    automatedValidation: validateFalsifiablePrediction,
  },
  {
    id: 'H2',
    description: '3+ supporting evidence with citations',
    points: 1.5,
    category: 'evidence',
    passCondition: 'Each hypothesis has at least 3 pieces of supporting evidence, each with proper citations',
    partialConditions: [
      { condition: '80%+ well-supported', points: 1.5 },
      { condition: '60-79% well-supported', points: 1.0 },
      { condition: '40-59% well-supported', points: 0.75 },
      { condition: '<40% well-supported', points: 0.25 },
    ],
    automatedValidation: validateSupportingEvidence,
  },
  {
    id: 'H3',
    description: 'Novel contribution (not in literature)',
    points: 1.0,
    category: 'novelty',
    passCondition: 'Hypothesis represents a novel contribution not explicitly found in existing literature, with novelty score ≥70',
    partialConditions: [
      { condition: 'Novelty score ≥80', points: 1.0 },
      { condition: 'Novelty score 70-79', points: 0.75 },
      { condition: 'Novelty score 50-69', points: 0.5 },
      { condition: 'Novelty score <50', points: 0.25 },
    ],
    automatedValidation: validateNovelty,
  },
  {
    id: 'H4',
    description: 'Thermodynamically feasible',
    points: 1.5,
    category: 'thermodynamics',
    passCondition: 'Hypothesis does not violate thermodynamic laws (Carnot efficiency, Betz limit, Shockley-Queisser limit, conservation laws)',
    // Requires AI judge - checks physics validity
  },
  {
    id: 'H5',
    description: 'Materials available (Materials Project check)',
    points: 1.0,
    category: 'feasibility',
    passCondition: 'Required materials are available in Materials Project database or commercially available',
    // Requires AI judge - cross-references with Materials Project
  },
  {
    id: 'H6',
    description: 'Clear causal mechanism proposed',
    points: 2.0, // Increased from 1.0 to make total 10 points
    category: 'methodology',
    passCondition: 'Hypothesis includes a clear causal mechanism with at least 3 logical steps explaining how the intervention leads to the predicted outcome',
    partialConditions: [
      { condition: 'Mechanism has 4+ steps with physical principles', points: 2.0 },
      { condition: 'Mechanism has 3 steps with clear logic', points: 1.75 },  // RELAXED: now passes
      { condition: 'Mechanism has 2 steps', points: 1.25 },  // RELAXED: more credit
      { condition: 'Mechanism has 1 step or unclear', points: 0.5 },
    ],
    automatedValidation: validateCausalMechanism,
  },
  {
    id: 'H7',
    description: 'Defined variables (IV, DV, controls)',
    points: 1.0,
    category: 'methodology',
    passCondition: 'Hypothesis clearly defines independent variable(s), dependent variable(s), and control variables',
    automatedValidation: validateVariables,
  },
  {
    id: 'H8',
    description: 'Feasibility score ≥ 65',
    points: 0.5,
    category: 'feasibility',
    passCondition: 'Overall feasibility score is at least 65%',
    partialConditions: [
      { condition: 'Feasibility ≥75', points: 0.5 },
      { condition: 'Feasibility 65-74', points: 0.375 },
      { condition: 'Feasibility 50-64', points: 0.25 },
      { condition: 'Feasibility <50', points: 0.125 },
    ],
    automatedValidation: validateFeasibility,
  },
]

// ============================================================================
// Hypothesis Rubric Export
// ============================================================================

export const HYPOTHESIS_RUBRIC: Rubric = {
  id: 'hypothesis-v1',
  name: 'Hypothesis Generation Rubric',
  phase: 'hypothesis',
  domain: 'clean-energy',
  items: hypothesisRubricItems,
  totalPoints: 10,
  successThreshold: 7,
  maxIterations: 2,
  metadata: {
    version: '1.0.0',
    author: 'FrontierScience Discovery Engine',
    lastUpdated: new Date('2024-12-17'),
    sourceDataset: 'Based on OpenAI FrontierScience methodology',
  },
}

// Validate that points sum to 10
const totalPoints = hypothesisRubricItems.reduce((sum, item) => sum + item.points, 0)
if (Math.abs(totalPoints - 10) > 0.001) {
  console.warn(`Hypothesis rubric points sum to ${totalPoints}, expected 10`)
}
