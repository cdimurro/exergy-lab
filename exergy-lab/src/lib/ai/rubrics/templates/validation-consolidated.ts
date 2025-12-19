/**
 * Validation Phase Consolidated Rubric
 *
 * Combines: simulation + exergy + tea + patent + validation
 * Evaluates simulation results, thermodynamic analysis, economics, IP, and physics verification.
 * Total: 10 points, Pass threshold: 7
 */

import type { Rubric, RubricItem, ItemScore } from '../types'

// ============================================================================
// Physical Constants and Limits
// ============================================================================

const PHYSICAL_LIMITS = {
  // Solar efficiency limits (Shockley-Queisser)
  solarSingleJunction: 33.7,
  solarTandem: 45.7,
  solarConcentrated: 68.7,

  // Battery limits
  lithiumIonTheoretical: 400, // Wh/kg
  solidStateTheoretical: 500, // Wh/kg

  // Electrolysis limits
  pemElectrolysis: 83, // % HHV efficiency
  alkalineElectrolysis: 80,
  soecElectrolysis: 95,

  // Carnot efficiency (reference)
  carnotAt500C: 61.8, // T_hot=773K, T_cold=298K

  // Fuel cell limits
  pemFuelCell: 60, // % practical
  sofcFuelCell: 65, // % practical
}

// ============================================================================
// Automated Validation Functions
// ============================================================================

function validatePhysicsAccuracy(response: any): ItemScore {
  const simulation = response?.simulation || response?.simulationResults || response
  const validation = response?.physicsValidation || response?.validation || {}

  const efficiency = simulation?.efficiency || simulation?.systemEfficiency || 0
  const domain = response?.domain || 'general'
  const violations = validation?.violations || []
  const benchmarksChecked = validation?.benchmarksChecked || 0

  // Check against physical limits
  let physicsViolations: string[] = []

  if (domain.includes('solar') && efficiency > PHYSICAL_LIMITS.solarTandem) {
    physicsViolations.push(`Solar efficiency ${efficiency}% exceeds tandem limit ${PHYSICAL_LIMITS.solarTandem}%`)
  }

  if (domain.includes('hydrogen') || domain.includes('electrolysis')) {
    if (efficiency > PHYSICAL_LIMITS.soecElectrolysis) {
      physicsViolations.push(`Electrolysis efficiency ${efficiency}% exceeds SOEC limit ${PHYSICAL_LIMITS.soecElectrolysis}%`)
    }
  }

  if (domain.includes('battery')) {
    const energyDensity = simulation?.energyDensity || 0
    if (energyDensity > PHYSICAL_LIMITS.solidStateTheoretical) {
      physicsViolations.push(`Energy density ${energyDensity} Wh/kg exceeds solid-state limit`)
    }
  }

  // Check for thermodynamic violations
  const hasThermodynamicCheck = validation?.thermodynamicsValid !== undefined
  const thermodynamicsValid = validation?.thermodynamicsValid !== false

  const totalViolations = physicsViolations.length + (Array.isArray(violations) ? violations.length : 0)

  let points = 0
  let reasoning = ''

  if (totalViolations === 0 && thermodynamicsValid && benchmarksChecked >= 5) {
    points = 2.0
    reasoning = `Excellent: No physics violations, ${benchmarksChecked} benchmarks checked, thermodynamics valid`
  } else if (totalViolations === 0 && thermodynamicsValid) {
    points = 1.5
    reasoning = 'Good: No physics violations detected'
  } else if (totalViolations <= 1) {
    points = 1.0
    reasoning = `Minor issues: ${totalViolations} violation(s) found`
  } else {
    points = 0.5
    reasoning = `Physics violations: ${physicsViolations.join('; ')}`
  }

  return {
    itemId: 'VC1',
    points,
    maxPoints: 2.0,
    passed: points >= 1.4,
    reasoning,
  }
}

function validateSimulationQuality(response: any): ItemScore {
  const simulation = response?.simulation || response?.simulationResults || response

  // Check convergence
  const convergence = simulation?.convergence || {}
  const hasConverged = convergence?.converged !== false
  const iterations = convergence?.iterations || simulation?.iterations || 0

  // Check parameters
  const parameters = simulation?.parameters || simulation?.inputParameters || {}
  const parameterCount = Object.keys(parameters).length

  // Check outputs
  const outputs = simulation?.outputs || simulation?.results || {}
  const outputCount = Object.keys(outputs).length
  const hasTimeSeries = simulation?.timeSeries || simulation?.timeSeriesData

  // Check confidence/uncertainty
  const confidence = simulation?.confidence || simulation?.confidenceLevel || 0
  const hasUncertainty = simulation?.uncertainty !== undefined || simulation?.errorBars !== undefined

  let points = 0
  let reasoning = ''

  if (hasConverged && parameterCount >= 5 && outputCount >= 3 && hasTimeSeries) {
    points = 2.0
    reasoning = `Excellent simulation: Converged, ${parameterCount} parameters, ${outputCount} outputs, time series`
  } else if (hasConverged && parameterCount >= 3 && outputCount >= 2) {
    points = 1.5
    reasoning = `Good simulation: Converged with adequate parameters and outputs`
  } else if (hasConverged || parameterCount >= 2) {
    points = 1.0
    reasoning = 'Basic simulation: Some results but limited detail'
  } else {
    points = 0.5
    reasoning = 'Weak simulation: Convergence issues or missing data'
  }

  return {
    itemId: 'VC2',
    points,
    maxPoints: 2.0,
    passed: points >= 1.4,
    reasoning,
  }
}

function validateEconomicViability(response: any): ItemScore {
  const economics = response?.economics || response?.teaResults || response?.tea || {}

  // Key economic metrics
  const npv = economics?.npv || economics?.netPresentValue
  const irr = economics?.irr || economics?.internalRateOfReturn
  const lcoe = economics?.lcoe || economics?.levelizedCost
  const payback = economics?.paybackPeriod || economics?.payback
  const capex = economics?.capex || economics?.capitalCost
  const opex = economics?.opex || economics?.operatingCost

  // Count valid metrics
  let validMetrics = 0
  if (npv !== undefined) validMetrics++
  if (irr !== undefined) validMetrics++
  if (lcoe !== undefined) validMetrics++
  if (payback !== undefined) validMetrics++
  if (capex !== undefined) validMetrics++
  if (opex !== undefined) validMetrics++

  // Check for positive economics
  const hasPositiveNPV = typeof npv === 'number' && npv > 0
  const hasReasonableIRR = typeof irr === 'number' && irr > 5 && irr < 100
  const hasReasonablePayback = typeof payback === 'number' && payback > 0 && payback < 30

  const positiveIndicators = [hasPositiveNPV, hasReasonableIRR, hasReasonablePayback].filter(Boolean).length

  let points = 0
  let reasoning = ''

  if (validMetrics >= 5 && positiveIndicators >= 2) {
    points = 2.0
    reasoning = `Excellent economics: ${validMetrics} metrics, NPV positive, IRR ${irr?.toFixed?.(1) || 'N/A'}%`
  } else if (validMetrics >= 3 && positiveIndicators >= 1) {
    points = 1.5
    reasoning = `Good economics: ${validMetrics} metrics with positive indicators`
  } else if (validMetrics >= 2) {
    points = 1.0
    reasoning = `Basic economics: ${validMetrics} metrics provided`
  } else {
    points = 0.5
    reasoning = 'Limited economics: Insufficient financial analysis'
  }

  return {
    itemId: 'VC3',
    points,
    maxPoints: 2.0,
    passed: points >= 1.4,
    reasoning,
  }
}

function validateEfficiencyAnalysis(response: any): ItemScore {
  const exergy = response?.exergy || response?.exergyAnalysis || {}
  const simulation = response?.simulation || response?.simulationResults || {}

  // Exergy metrics
  const exergyEfficiency = exergy?.efficiency || exergy?.exergyEfficiency
  const exergyDestruction = exergy?.destruction || exergy?.exergyDestruction
  const irreversibilities = exergy?.irreversibilities || []

  // First-law vs second-law comparison
  const firstLawEfficiency = simulation?.efficiency || simulation?.energyEfficiency
  const hasComparison = exergyEfficiency !== undefined && firstLawEfficiency !== undefined

  // Check for efficiency breakdown
  const components = exergy?.componentAnalysis || exergy?.components || []
  const hasBreakdown = Array.isArray(components) && components.length > 0

  // Improvement recommendations
  const recommendations = exergy?.improvements || exergy?.recommendations || []
  const hasRecommendations = Array.isArray(recommendations) && recommendations.length > 0

  let points = 0
  let reasoning = ''

  if (exergyEfficiency !== undefined && hasComparison && hasBreakdown && hasRecommendations) {
    points = 2.0
    reasoning = `Excellent exergy: ${exergyEfficiency?.toFixed?.(1) || exergyEfficiency}% efficiency, component breakdown, improvements identified`
  } else if (exergyEfficiency !== undefined && (hasBreakdown || hasRecommendations)) {
    points = 1.5
    reasoning = `Good exergy: Efficiency calculated with analysis`
  } else if (exergyEfficiency !== undefined || firstLawEfficiency !== undefined) {
    points = 1.0
    reasoning = 'Basic efficiency: Some metrics provided'
  } else {
    points = 0.5
    reasoning = 'Limited efficiency analysis: Missing exergy evaluation'
  }

  return {
    itemId: 'VC4',
    points,
    maxPoints: 2.0,
    passed: points >= 1.4,
    reasoning,
  }
}

function validateIPLandscape(response: any): ItemScore {
  const patents = response?.patents || response?.patentLandscape || response?.ipAnalysis || {}

  // Patent counts
  const existingPatents = patents?.existingPatents || patents?.priorArt || []
  const patentCount = Array.isArray(existingPatents) ? existingPatents.length : 0

  // Freedom to operate
  const fto = patents?.freedomToOperate || patents?.fto || {}
  const hasFTO = fto?.assessment || fto?.status || fto?.clear !== undefined

  // Patentability assessment
  const patentability = patents?.patentability || patents?.noveltyAssessment || {}
  const hasPatentability = patentability?.score !== undefined || patentability?.assessment

  // Key players and landscape
  const keyPlayers = patents?.keyPlayers || patents?.competitors || []
  const hasLandscape = Array.isArray(keyPlayers) && keyPlayers.length > 0

  let points = 0
  let reasoning = ''

  if (patentCount >= 5 && hasFTO && hasPatentability && hasLandscape) {
    points = 2.0
    reasoning = `Excellent IP: ${patentCount} patents analyzed, FTO assessed, patentability evaluated`
  } else if (patentCount >= 3 && (hasFTO || hasPatentability)) {
    points = 1.5
    reasoning = `Good IP: ${patentCount} patents with some analysis`
  } else if (patentCount >= 1) {
    points = 1.0
    reasoning = `Basic IP: ${patentCount} patent(s) identified`
  } else {
    points = 0.5
    reasoning = 'Limited IP: Patent landscape not analyzed'
  }

  return {
    itemId: 'VC5',
    points,
    maxPoints: 2.0,
    passed: points >= 1.4,
    reasoning,
  }
}

// ============================================================================
// Rubric Items
// ============================================================================

const validationConsolidatedItems: RubricItem[] = [
  {
    id: 'VC1',
    description: 'Physics accuracy: No thermodynamic violations, benchmarks checked',
    points: 2.0,
    category: 'thermodynamics',
    passCondition: 'Results respect physical limits (Shockley-Queisser, Carnot, etc.) with benchmark validation',
    partialConditions: [
      { condition: 'No violations, 5+ benchmarks checked, thermodynamics valid', points: 2.0 },
      { condition: 'No violations detected', points: 1.5 },
      { condition: '1 minor violation', points: 1.0 },
      { condition: 'Multiple violations', points: 0.5 },
    ],
    automatedValidation: validatePhysicsAccuracy,
  },
  {
    id: 'VC2',
    description: 'Simulation quality: Converged, 5+ parameters, time series data',
    points: 2.0,
    category: 'methodology',
    passCondition: 'Simulation converged with adequate parameters, outputs, and time series visualization',
    partialConditions: [
      { condition: 'Converged, 5+ params, 3+ outputs, time series', points: 2.0 },
      { condition: 'Converged, adequate params and outputs', points: 1.5 },
      { condition: 'Some results but limited detail', points: 1.0 },
      { condition: 'Convergence issues or missing data', points: 0.5 },
    ],
    automatedValidation: validateSimulationQuality,
  },
  {
    id: 'VC3',
    description: 'Economic viability: NPV, IRR, LCOE with positive indicators',
    points: 2.0,
    category: 'economics',
    passCondition: 'TEA includes 5+ metrics with positive NPV and reasonable IRR/payback',
    partialConditions: [
      { condition: '5+ metrics, NPV positive, IRR reasonable', points: 2.0 },
      { condition: '3+ metrics with positive indicators', points: 1.5 },
      { condition: '2+ metrics provided', points: 1.0 },
      { condition: 'Insufficient financial analysis', points: 0.5 },
    ],
    automatedValidation: validateEconomicViability,
  },
  {
    id: 'VC4',
    description: 'Efficiency analysis: Exergy evaluation with component breakdown',
    points: 2.0,
    category: 'thermodynamics',
    passCondition: 'Second-law analysis with exergy efficiency, destruction breakdown, improvements',
    partialConditions: [
      { condition: 'Exergy efficiency, comparison, breakdown, recommendations', points: 2.0 },
      { condition: 'Efficiency with analysis', points: 1.5 },
      { condition: 'Some metrics provided', points: 1.0 },
      { condition: 'Missing exergy evaluation', points: 0.5 },
    ],
    automatedValidation: validateEfficiencyAnalysis,
  },
  {
    id: 'VC5',
    description: 'IP landscape: 5+ patents analyzed, FTO, patentability',
    points: 2.0,
    category: 'feasibility',
    passCondition: 'Patent landscape analyzed with freedom-to-operate and patentability assessment',
    partialConditions: [
      { condition: '5+ patents, FTO, patentability, key players', points: 2.0 },
      { condition: '3+ patents with some analysis', points: 1.5 },
      { condition: '1+ patent identified', points: 1.0 },
      { condition: 'Patent landscape not analyzed', points: 0.5 },
    ],
    automatedValidation: validateIPLandscape,
  },
]

// ============================================================================
// Validation Consolidated Rubric Export
// ============================================================================

export const VALIDATION_CONSOLIDATED_RUBRIC: Rubric = {
  id: 'validation-consolidated-v1',
  name: 'Validation Phase (Consolidated) Rubric',
  phase: 'validation',
  domain: 'clean-energy',
  items: validationConsolidatedItems,
  totalPoints: 10,
  successThreshold: 7,
  maxIterations: 4,
  metadata: {
    version: '1.0.0',
    author: 'FrontierScience Discovery Engine',
    lastUpdated: new Date('2024-12-18'),
    sourceDataset: 'Consolidated rubric combining simulation + exergy + tea + patent + validation',
  },
}

// Validate that points sum to 10
const totalPoints = validationConsolidatedItems.reduce((sum, item) => sum + item.points, 0)
if (Math.abs(totalPoints - 10) > 0.001) {
  console.warn(`Validation consolidated rubric points sum to ${totalPoints}, expected 10`)
}
