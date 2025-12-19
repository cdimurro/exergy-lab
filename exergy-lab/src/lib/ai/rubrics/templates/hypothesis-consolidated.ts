/**
 * Hypothesis Phase Consolidated Rubric
 *
 * Combines: hypothesis + experiment
 * Evaluates novel hypothesis generation and experimental protocol design.
 * Total: 10 points, Pass threshold: 7
 */

import type { Rubric, RubricItem, ItemScore } from '../types'

// ============================================================================
// Automated Validation Functions
// ============================================================================

function validateNovelty(response: any): ItemScore {
  const hypothesis = response?.hypothesis || response
  const noveltyAssessment = hypothesis?.novelty || hypothesis?.noveltyAssessment || {}
  const title = hypothesis?.title || ''
  const description = hypothesis?.description || hypothesis?.statement || ''

  // Check for novelty indicators - support both 0-10 and 0-100 scales
  let noveltyScore = noveltyAssessment.score || hypothesis?.noveltyScore || 0
  // Normalize 0-100 scores to 0-10
  if (noveltyScore > 10) {
    noveltyScore = noveltyScore / 10
  }
  const hasNoveltyScore = noveltyScore > 0
  const hasNovelElements = Array.isArray(noveltyAssessment.novelElements) && noveltyAssessment.novelElements.length > 0
  const hasDifferentiation = noveltyAssessment.differentiation || noveltyAssessment.beyondPriorArt

  // Check for novelty keywords in description
  const noveltyKeywords = ['novel', 'new', 'first', 'unique', 'innovative', 'unprecedented', 'breakthrough']
  const hasNoveltyLanguage = noveltyKeywords.some(kw =>
    description.toLowerCase().includes(kw) || title.toLowerCase().includes(kw)
  )

  let points = 0
  let reasoning = ''

  // Primary path: Use the noveltyScore which the agent explicitly computed
  // This is the most reliable indicator as it reflects the agent's assessment
  if (noveltyScore >= 8 || (hasNovelElements && hasDifferentiation)) {
    points = 2.5
    reasoning = `Excellent novelty: Score ${noveltyScore.toFixed(1)}/10, ${noveltyAssessment.novelElements?.length || 0} novel elements identified`
  } else if (noveltyScore >= 6 || hasNovelElements) {
    points = 2.0
    reasoning = `Good novelty: Score ${noveltyScore.toFixed(1)}/10, clear differentiation from prior art`
  } else if (noveltyScore >= 4 || hasNoveltyLanguage) {
    points = 1.5
    reasoning = `Moderate novelty: Score ${noveltyScore.toFixed(1)}/10, some new elements identified`
  } else if (description.length > 50) {
    points = 1.0
    reasoning = 'Limited novelty: Hypothesis present but novelty unclear'
  } else {
    points = 0.5
    reasoning = 'Minimal novelty: Incremental improvement only'
  }

  return {
    itemId: 'HC1',
    points,
    maxPoints: 2.5,
    passed: points >= 1.75,
    reasoning,
  }
}

function validateTestability(response: any): ItemScore {
  const hypothesis = response?.hypothesis || response
  const predictions = hypothesis?.testable_predictions || hypothesis?.predictions || hypothesis?.testableHypotheses || []
  const experiment = response?.experiment || response?.experimentalDesign || {}

  const predictionCount = Array.isArray(predictions) ? predictions.length : 0

  // Check for quantitative predictions - support both text-based and structured formats
  let quantitativePredictions = 0
  for (const pred of (predictions || [])) {
    // Check for structured prediction format with expectedValue/unit
    const hasExpectedValue = typeof pred?.expectedValue === 'number' || typeof pred?.targetValue === 'number'
    const hasUnit = !!pred?.unit
    const hasTolerance = typeof pred?.tolerance === 'number'
    const isMeasurable = pred?.measurable === true
    const isFalsifiable = pred?.falsifiable === true

    if (hasExpectedValue && hasUnit) {
      quantitativePredictions++
      continue
    }

    // Fallback to text-based detection
    const predText = typeof pred === 'string' ? pred : (pred.prediction || pred.description || pred.statement || '')
    const hasNumbers = /\d+(\.\d+)?%?/.test(predText)
    const hasUnits = /(°C|K|MW|GW|kW|%|eV|nm|μm|kg|g|mol|J|kJ|MJ|Pa|bar|atm|Wh|Ah|V|A|S\/cm)/i.test(predText)
    if (hasNumbers || hasUnits || (isMeasurable && isFalsifiable)) {
      quantitativePredictions++
    }
  }

  // Check for success criteria - also check validationMetrics
  const successCriteria = experiment?.successCriteria || hypothesis?.successCriteria || []
  const validationMetrics = hypothesis?.validationMetrics || []
  const hasCriteria = (Array.isArray(successCriteria) && successCriteria.length > 0) ||
                      (Array.isArray(validationMetrics) && validationMetrics.length > 0)

  let points = 0
  let reasoning = ''

  if (predictionCount >= 3 && quantitativePredictions >= 2 && hasCriteria) {
    points = 2.0
    reasoning = `Excellent testability: ${predictionCount} predictions, ${quantitativePredictions} quantitative, clear success criteria`
  } else if (predictionCount >= 2 && quantitativePredictions >= 2) {
    points = 2.0
    reasoning = `Excellent testability: ${predictionCount} predictions, all ${quantitativePredictions} quantitative with values/units`
  } else if (predictionCount >= 2 && quantitativePredictions >= 1) {
    points = 1.5
    reasoning = `Good testability: ${predictionCount} predictions with ${quantitativePredictions} quantitative`
  } else if (predictionCount >= 1 && quantitativePredictions >= 1) {
    points = 1.2
    reasoning = `Adequate testability: ${predictionCount} prediction(s) with quantitative detail`
  } else if (predictionCount >= 1) {
    points = 1.0
    reasoning = `Basic testability: ${predictionCount} prediction(s) but limited quantitative detail`
  } else {
    points = 0.5
    reasoning = 'Weak testability: No clear testable predictions'
  }

  return {
    itemId: 'HC2',
    points,
    maxPoints: 2.0,
    passed: points >= 1.4,
    reasoning,
  }
}

function validateFeasibility(response: any): ItemScore {
  const hypothesis = response?.hypothesis || response
  const experiment = response?.experiment || response?.experimentalDesign || {}

  // Check for feasibility score - support both 0-10 and 0-100 scales
  const feasibility = hypothesis?.feasibility || experiment?.feasibility || {}
  let feasibilityScore = typeof feasibility === 'number' ? feasibility : (feasibility.score || hypothesis?.feasibilityScore || 0)
  // Normalize 0-100 scores to 0-10
  if (feasibilityScore > 10) {
    feasibilityScore = feasibilityScore / 10
  }

  // Check equipment and resources - also look in hypothesis.variables
  const equipment = experiment?.equipment || experiment?.requiredEquipment || hypothesis?.requiredMaterials || []
  const timeline = experiment?.timeline || experiment?.expectedDuration || ''
  const hasTimeline = timeline.length > 0

  // Check for variables (independent, dependent, controls) - indicates methodological rigor
  const variables = hypothesis?.variables || {}
  const hasIndependentVars = Array.isArray(variables.independent) && variables.independent.length > 0
  const hasDependentVars = Array.isArray(variables.dependent) && variables.dependent.length > 0
  const hasControlVars = Array.isArray(variables.controls) && variables.controls.length > 0
  const hasVariables = hasIndependentVars && hasDependentVars

  // Check for equipment in various formats
  const hasEquipment = (Array.isArray(equipment) && equipment.length > 0) || hasVariables

  // Check for practical constraints acknowledgment
  const constraints = experiment?.constraints || hypothesis?.constraints || []
  const hasConstraints = Array.isArray(constraints) && constraints.length > 0

  // Check for supporting evidence (indicates feasibility research was done)
  const supportingEvidence = hypothesis?.supportingEvidence || []
  const hasSupportingEvidence = Array.isArray(supportingEvidence) && supportingEvidence.length > 0

  let points = 0
  let reasoning = ''

  if (feasibilityScore >= 7 || (hasVariables && hasControlVars && hasSupportingEvidence)) {
    points = 2.0
    reasoning = `Excellent feasibility: Score ${feasibilityScore.toFixed(1)}/10, variables defined, controls identified, evidence provided`
  } else if (feasibilityScore >= 5 || (hasVariables && hasSupportingEvidence)) {
    points = 1.5
    reasoning = `Good feasibility: Score ${feasibilityScore.toFixed(1)}/10, practical implementation path outlined`
  } else if (hasEquipment || hasTimeline || hasVariables) {
    points = 1.0
    reasoning = 'Basic feasibility: Some practical details provided'
  } else {
    points = 0.5
    reasoning = 'Limited feasibility: Missing practical implementation details'
  }

  return {
    itemId: 'HC3',
    points,
    maxPoints: 2.0,
    passed: points >= 1.4,
    reasoning,
  }
}

function validateProtocolQuality(response: any): ItemScore {
  const hypothesis = response?.hypothesis || response
  const experiment = response?.experiment || response?.experimentalDesign || {}
  const protocol = experiment?.protocol || experiment?.methodology || ''
  const steps = experiment?.steps || experiment?.procedureSteps || []

  // Also check mechanism steps in hypothesis - these describe the scientific process
  const mechanismSteps = hypothesis?.mechanism?.steps || []
  const mechanismStepCount = Array.isArray(mechanismSteps) ? mechanismSteps.length : 0

  // Check for variables which indicate experimental design rigor
  const variables = hypothesis?.variables || {}
  const hasIndependentVars = Array.isArray(variables.independent) && variables.independent.length > 0
  const hasDependentVars = Array.isArray(variables.dependent) && variables.dependent.length > 0
  const hasControlVars = Array.isArray(variables.controls) && variables.controls.length > 0

  const protocolText = typeof protocol === 'string' ? protocol : JSON.stringify(protocol)
  const mechanismText = JSON.stringify(mechanismSteps)
  const combinedText = protocolText + ' ' + mechanismText

  // Count steps from all sources
  const stepCount = Math.max(
    Array.isArray(steps) ? steps.length : 0,
    mechanismStepCount
  )

  // Check for key protocol elements - search in both protocol and mechanism
  const hasMaterials = /material|reagent|sample|substrate|layer|coating|film/i.test(combinedText) || experiment?.materials || hasIndependentVars
  const hasConditions = /temperature|pressure|time|duration|concentration|nm|μm|°C|bar|atm/i.test(combinedText) || hasIndependentVars
  const hasMeasurements = /measure|characteriz|analyz|test|efficien|output|performance/i.test(combinedText) || hasDependentVars
  const hasControls = /control|baseline|reference|comparison|constant|fixed/i.test(combinedText) || hasControlVars

  // Check for physical principles (indicates scientific rigor)
  const hasPhysicalPrinciples = mechanismSteps.some((step: any) => step?.physicalPrinciple)

  const qualityIndicators = [hasMaterials, hasConditions, hasMeasurements, hasControls, hasPhysicalPrinciples].filter(Boolean).length

  let points = 0
  let reasoning = ''

  if ((stepCount >= 3 && qualityIndicators >= 4) || (mechanismStepCount >= 3 && hasPhysicalPrinciples && hasControlVars)) {
    points = 2.0
    reasoning = `Excellent protocol: ${stepCount} steps with physical principles, variables, and controls defined`
  } else if (stepCount >= 3 && qualityIndicators >= 3) {
    points = 1.8
    reasoning = `Strong protocol: ${stepCount} steps with ${qualityIndicators} quality indicators`
  } else if (stepCount >= 2 && qualityIndicators >= 2) {
    points = 1.5
    reasoning = `Good protocol: ${stepCount} steps with key elements`
  } else if (stepCount >= 1 || protocolText.length > 100 || mechanismStepCount >= 1) {
    points = 1.0
    reasoning = `Basic protocol: ${stepCount || mechanismStepCount} step(s), outline present but needs detail`
  } else {
    points = 0.5
    reasoning = 'Minimal protocol: Methodology not well defined'
  }

  return {
    itemId: 'HC4',
    points,
    maxPoints: 2.0,
    passed: points >= 1.4,
    reasoning,
  }
}

function validateSafety(response: any): ItemScore {
  const experiment = response?.experiment || response?.experimentalDesign || response
  const safety = experiment?.safety || experiment?.safetyRequirements || experiment?.safetyConsiderations || []

  const safetyItems = Array.isArray(safety) ? safety : (safety ? [safety] : [])
  const safetyCount = safetyItems.length

  // Check for safety categories
  const safetyText = JSON.stringify(safetyItems).toLowerCase()
  const hasHazards = /hazard|danger|risk|toxic|flammable|corrosive/i.test(safetyText)
  const hasPPE = /ppe|glove|goggle|mask|coat|shield|ventilat/i.test(safetyText)
  const hasEmergency = /emergency|spill|fire|first.?aid/i.test(safetyText)
  const hasWaste = /waste|disposal|containment/i.test(safetyText)

  const safetyCategories = [hasHazards, hasPPE, hasEmergency, hasWaste].filter(Boolean).length

  let points = 0
  let reasoning = ''

  if (safetyCount >= 5 && safetyCategories >= 3) {
    points = 1.5
    reasoning = `Comprehensive safety: ${safetyCount} requirements covering hazards, PPE, emergency, waste`
  } else if (safetyCount >= 3 && safetyCategories >= 2) {
    points = 1.2
    reasoning = `Good safety: ${safetyCount} requirements with key categories`
  } else if (safetyCount >= 1) {
    points = 0.8
    reasoning = `Basic safety: ${safetyCount} requirement(s) identified`
  } else {
    points = 0.4
    reasoning = 'Minimal safety: Safety considerations not addressed'
  }

  return {
    itemId: 'HC5',
    points,
    maxPoints: 1.5,
    passed: points >= 1.0,
    reasoning,
  }
}

// ============================================================================
// Rubric Items
// ============================================================================

const hypothesisConsolidatedItems: RubricItem[] = [
  {
    id: 'HC1',
    description: 'Novelty: Beyond incremental, clear differentiation from prior art',
    points: 2.5,
    category: 'novelty',
    passCondition: 'Hypothesis demonstrates clear novelty with identified novel elements and differentiation',
    partialConditions: [
      { condition: 'Novelty score 8+, multiple novel elements, clear differentiation', points: 2.5 },
      { condition: 'Novelty score 6+, some novel elements', points: 2.0 },
      { condition: 'Moderate novelty, some new elements', points: 1.5 },
      { condition: 'Limited novelty, incremental improvement', points: 1.0 },
    ],
    automatedValidation: validateNovelty,
  },
  {
    id: 'HC2',
    description: 'Testability: 3+ quantitative predictions with success criteria',
    points: 2.0,
    category: 'methodology',
    passCondition: 'Hypothesis includes testable predictions with quantitative metrics and clear success criteria',
    partialConditions: [
      { condition: '3+ predictions, 2+ quantitative, success criteria', points: 2.0 },
      { condition: '2+ predictions, 1+ quantitative', points: 1.5 },
      { condition: '1+ prediction, limited quantitative', points: 1.0 },
      { condition: 'No clear predictions', points: 0.5 },
    ],
    automatedValidation: validateTestability,
  },
  {
    id: 'HC3',
    description: 'Feasibility: Practical with equipment, timeline, constraints',
    points: 2.0,
    category: 'feasibility',
    passCondition: 'Clear path to implementation with equipment, timeline, and acknowledged constraints',
    partialConditions: [
      { condition: 'Feasibility 7+, equipment, timeline, constraints', points: 2.0 },
      { condition: 'Equipment and timeline provided', points: 1.5 },
      { condition: 'Some practical details', points: 1.0 },
      { condition: 'Missing implementation details', points: 0.5 },
    ],
    automatedValidation: validateFeasibility,
  },
  {
    id: 'HC4',
    description: 'Protocol quality: 5+ steps with materials, conditions, controls',
    points: 2.0,
    category: 'reproducibility',
    passCondition: 'Reproducible experimental protocol with detailed steps, materials, conditions, and controls',
    partialConditions: [
      { condition: '5+ steps, materials, conditions, measurements, controls', points: 2.0 },
      { condition: '3+ steps with key elements', points: 1.5 },
      { condition: 'Basic outline present', points: 1.0 },
      { condition: 'Methodology not defined', points: 0.5 },
    ],
    automatedValidation: validateProtocolQuality,
  },
  {
    id: 'HC5',
    description: 'Safety: Comprehensive requirements (hazards, PPE, emergency, waste)',
    points: 1.5,
    category: 'safety',
    passCondition: 'Safety requirements cover hazard identification, PPE, emergency procedures, and waste disposal',
    partialConditions: [
      { condition: '5+ requirements, 3+ categories', points: 1.5 },
      { condition: '3+ requirements, 2+ categories', points: 1.2 },
      { condition: '1+ requirement identified', points: 0.8 },
      { condition: 'Safety not addressed', points: 0.4 },
    ],
    automatedValidation: validateSafety,
  },
]

// ============================================================================
// Hypothesis Consolidated Rubric Export
// ============================================================================

export const HYPOTHESIS_CONSOLIDATED_RUBRIC: Rubric = {
  id: 'hypothesis-consolidated-v1',
  name: 'Hypothesis Phase (Consolidated) Rubric',
  phase: 'hypothesis',
  domain: 'clean-energy',
  items: hypothesisConsolidatedItems,
  totalPoints: 10,
  successThreshold: 7,
  maxIterations: 5, // Creative phase gets more iterations
  metadata: {
    version: '1.0.0',
    author: 'FrontierScience Discovery Engine',
    lastUpdated: new Date('2024-12-18'),
    sourceDataset: 'Consolidated rubric combining hypothesis + experiment',
  },
}

// Validate that points sum to 10
const totalPoints = hypothesisConsolidatedItems.reduce((sum, item) => sum + item.points, 0)
if (Math.abs(totalPoints - 10) > 0.001) {
  console.warn(`Hypothesis consolidated rubric points sum to ${totalPoints}, expected 10`)
}

// ============================================================================
// Mode-Adjusted Rubric Generation
// ============================================================================

import { type DiscoveryMode, getModeConfig, getAdjustedNoveltyPoints } from '../mode-configs'

/**
 * Create a novelty validation function with adjusted weights
 */
function createAdjustedNoveltyValidation(
  noveltyPoints: number,
  passThresholdPoints: number,
  modeName: string
): (response: any) => ItemScore {
  return (response: any): ItemScore => {
    const result = validateNovelty(response)
    const scaleFactor = noveltyPoints / 2.5
    const adjustedPoints = result.points * scaleFactor
    return {
      ...result,
      points: Math.round(adjustedPoints * 100) / 100,
      maxPoints: noveltyPoints,
      passed: adjustedPoints >= passThresholdPoints,
      reasoning: `${result.reasoning} (${modeName} mode: ${noveltyPoints}pt max)`,
    }
  }
}

/**
 * Create a scaled validation function for non-novelty criteria
 */
function createScaledValidation(
  originalValidation: (response: any) => Promise<ItemScore> | ItemScore,
  scaleFactor: number,
  newMaxPoints: number
): (response: any) => Promise<ItemScore> | ItemScore {
  return async (response: any): Promise<ItemScore> => {
    const result = await originalValidation(response)
    const adjustedPoints = result.points * scaleFactor
    const adjustedPassThreshold = (result.maxPoints * 0.7) * scaleFactor // 70% of new max
    return {
      ...result,
      points: Math.round(adjustedPoints * 100) / 100,
      maxPoints: newMaxPoints,
      passed: adjustedPoints >= adjustedPassThreshold,
    }
  }
}

/**
 * Create a mode-adjusted hypothesis rubric
 *
 * Adjusts the novelty criterion (HC1) weight based on the discovery mode:
 * - Breakthrough: 2.5 points (25%) - strict novelty requirement
 * - Synthesis: 0.5 points (5%) - minimal novelty, focus on comprehensiveness
 * - Validation: 1.0 points (10%) - moderate novelty, focus on testability
 *
 * Redistributes removed novelty points to other criteria proportionally.
 */
export function createModeAdjustedHypothesisRubric(mode: DiscoveryMode): Rubric {
  const modeConfig = getModeConfig(mode)
  const { noveltyPoints, redistributedPoints } = getAdjustedNoveltyPoints(mode)

  // Calculate redistribution to other items (HC2, HC3, HC4, HC5)
  // Original points: HC2=2.0, HC3=2.0, HC4=2.0, HC5=1.5 (total non-novelty = 7.5)
  const originalNonNoveltyTotal = 7.5
  const redistributionFactor = redistributedPoints / originalNonNoveltyTotal

  // Create adjusted items
  const adjustedItems: RubricItem[] = hypothesisConsolidatedItems.map(item => {
    if (item.id === 'HC1') {
      // Adjust novelty criterion
      const passThresholdPoints = noveltyPoints * (modeConfig.rubricWeights.noveltyPassThreshold / 100)
      return {
        ...item,
        points: noveltyPoints,
        passCondition: noveltyPoints < 1.0
          ? 'Novelty is de-emphasized in this mode - basic differentiation sufficient'
          : item.passCondition,
        partialConditions: item.partialConditions?.map(pc => ({
          ...pc,
          points: Math.round((pc.points * (noveltyPoints / 2.5)) * 100) / 100,
        })),
        automatedValidation: createAdjustedNoveltyValidation(
          noveltyPoints,
          passThresholdPoints,
          modeConfig.name
        ),
      }
    } else {
      // Redistribute points to other criteria
      const originalPoints = item.points
      const bonusPoints = originalPoints * redistributionFactor
      const newPoints = Math.round((originalPoints + bonusPoints) * 100) / 100
      const scaleFactor = newPoints / originalPoints

      return {
        ...item,
        points: newPoints,
        partialConditions: item.partialConditions?.map(pc => ({
          ...pc,
          points: Math.round((pc.points * scaleFactor) * 100) / 100,
        })),
        automatedValidation: item.automatedValidation
          ? createScaledValidation(item.automatedValidation, scaleFactor, newPoints)
          : undefined,
      }
    }
  })

  // Verify points sum to 10
  const adjustedTotal = adjustedItems.reduce((sum, item) => sum + item.points, 0)
  if (Math.abs(adjustedTotal - 10) > 0.01) {
    console.warn(`Mode-adjusted rubric points sum to ${adjustedTotal}, expected 10`)
  }

  return {
    ...HYPOTHESIS_CONSOLIDATED_RUBRIC,
    id: `hypothesis-${mode}-v1`,
    name: `Hypothesis Phase (${modeConfig.name} Mode) Rubric`,
    items: adjustedItems,
    successThreshold: modeConfig.rubricWeights.overallPassThreshold,
    maxIterations: modeConfig.iterationConfig.hypothesisMaxIterations,
    metadata: {
      ...HYPOTHESIS_CONSOLIDATED_RUBRIC.metadata,
      sourceDataset: `Mode-adjusted from hypothesis-consolidated-v1 (${mode} mode, novelty=${noveltyPoints}pt)`,
    },
  }
}

/**
 * Get the appropriate hypothesis rubric for a given mode
 */
export function getHypothesisRubricForMode(mode: DiscoveryMode | 'parallel' | undefined): Rubric {
  // For parallel mode or undefined, use the default breakthrough rubric
  if (!mode || mode === 'parallel') {
    return HYPOTHESIS_CONSOLIDATED_RUBRIC
  }
  return createModeAdjustedHypothesisRubric(mode)
}

// Pre-create rubrics for each mode for caching
export const HYPOTHESIS_BREAKTHROUGH_RUBRIC = createModeAdjustedHypothesisRubric('breakthrough')
export const HYPOTHESIS_SYNTHESIS_RUBRIC = createModeAdjustedHypothesisRubric('synthesis')
export const HYPOTHESIS_VALIDATION_RUBRIC = createModeAdjustedHypothesisRubric('validation')
