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

  // Check for novelty indicators
  const hasNoveltyScore = typeof noveltyAssessment.score === 'number'
  const noveltyScore = noveltyAssessment.score || 0
  const hasNovelElements = Array.isArray(noveltyAssessment.novelElements) && noveltyAssessment.novelElements.length > 0
  const hasDifferentiation = noveltyAssessment.differentiation || noveltyAssessment.beyondPriorArt

  // Check for novelty keywords in description
  const noveltyKeywords = ['novel', 'new', 'first', 'unique', 'innovative', 'unprecedented', 'breakthrough']
  const hasNoveltyLanguage = noveltyKeywords.some(kw =>
    description.toLowerCase().includes(kw) || title.toLowerCase().includes(kw)
  )

  let points = 0
  let reasoning = ''

  if (noveltyScore >= 8 || (hasNovelElements && hasDifferentiation)) {
    points = 2.5
    reasoning = `Excellent novelty: Score ${noveltyScore}/10, ${noveltyAssessment.novelElements?.length || 0} novel elements identified`
  } else if (noveltyScore >= 6 || hasNovelElements) {
    points = 2.0
    reasoning = `Good novelty: Score ${noveltyScore}/10, clear differentiation from prior art`
  } else if (noveltyScore >= 4 || hasNoveltyLanguage) {
    points = 1.5
    reasoning = `Moderate novelty: Some new elements identified`
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

  // Check for quantitative predictions
  let quantitativePredictions = 0
  for (const pred of (predictions || [])) {
    const predText = typeof pred === 'string' ? pred : (pred.prediction || pred.description || '')
    const hasNumbers = /\d+(\.\d+)?%?/.test(predText)
    const hasUnits = /(°C|K|MW|GW|kW|%|eV|nm|μm|kg|g|mol|J|kJ|MJ|Pa|bar|atm|Wh|Ah|V|A|S\/cm)/i.test(predText)
    if (hasNumbers || hasUnits) {
      quantitativePredictions++
    }
  }

  // Check for success criteria
  const successCriteria = experiment?.successCriteria || hypothesis?.successCriteria || []
  const hasCriteria = Array.isArray(successCriteria) && successCriteria.length > 0

  let points = 0
  let reasoning = ''

  if (predictionCount >= 3 && quantitativePredictions >= 2 && hasCriteria) {
    points = 2.0
    reasoning = `Excellent testability: ${predictionCount} predictions, ${quantitativePredictions} quantitative, clear success criteria`
  } else if (predictionCount >= 2 && quantitativePredictions >= 1) {
    points = 1.5
    reasoning = `Good testability: ${predictionCount} predictions with ${quantitativePredictions} quantitative`
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

  const feasibility = hypothesis?.feasibility || experiment?.feasibility || {}
  const feasibilityScore = typeof feasibility === 'number' ? feasibility : (feasibility.score || 0)

  // Check equipment and resources
  const equipment = experiment?.equipment || experiment?.requiredEquipment || []
  const timeline = experiment?.timeline || experiment?.expectedDuration || ''
  const hasTimeline = timeline.length > 0
  const hasEquipment = Array.isArray(equipment) && equipment.length > 0

  // Check for practical constraints acknowledgment
  const constraints = experiment?.constraints || hypothesis?.constraints || []
  const hasConstraints = Array.isArray(constraints) && constraints.length > 0

  let points = 0
  let reasoning = ''

  if (feasibilityScore >= 7 || (hasEquipment && hasTimeline && hasConstraints)) {
    points = 2.0
    reasoning = `Excellent feasibility: Score ${feasibilityScore || 'N/A'}, equipment list, timeline, constraints identified`
  } else if (feasibilityScore >= 5 || (hasEquipment && hasTimeline)) {
    points = 1.5
    reasoning = `Good feasibility: Practical implementation path outlined`
  } else if (hasEquipment || hasTimeline) {
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
  const experiment = response?.experiment || response?.experimentalDesign || response
  const protocol = experiment?.protocol || experiment?.methodology || ''
  const steps = experiment?.steps || experiment?.procedureSteps || []

  const protocolText = typeof protocol === 'string' ? protocol : JSON.stringify(protocol)
  const stepCount = Array.isArray(steps) ? steps.length : 0

  // Check for key protocol elements
  const hasMaterials = /material|reagent|sample|substrate/i.test(protocolText) || experiment?.materials
  const hasConditions = /temperature|pressure|time|duration|concentration/i.test(protocolText)
  const hasMeasurements = /measure|characteriz|analyz|test/i.test(protocolText)
  const hasControls = /control|baseline|reference|comparison/i.test(protocolText)

  const qualityIndicators = [hasMaterials, hasConditions, hasMeasurements, hasControls].filter(Boolean).length

  let points = 0
  let reasoning = ''

  if (stepCount >= 5 && qualityIndicators >= 3) {
    points = 2.0
    reasoning = `Excellent protocol: ${stepCount} steps, materials, conditions, measurements, controls`
  } else if (stepCount >= 3 && qualityIndicators >= 2) {
    points = 1.5
    reasoning = `Good protocol: ${stepCount} steps with key elements`
  } else if (stepCount >= 1 || protocolText.length > 100) {
    points = 1.0
    reasoning = 'Basic protocol: Outline present but needs detail'
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
