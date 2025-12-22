/**
 * Breakthrough Engine v0.0.2 - 12-Dimension Rubric Template
 *
 * Evaluates hypotheses across 12 breakthrough dimensions (BC1-BC12)
 * Total: 10 points (normalized)
 * - Impact Dimensions (BC1-BC8): 8.0 points
 * - Feasibility Dimensions (BC9-BC12): 2.0 points
 * Breakthrough threshold: 9.0+
 * Required dimensions: BC1 (Performance) + BC8 (Knowledge Trajectory)
 */

import type { Rubric, RubricItem, ItemScore } from '../types'
import {
  type BreakthroughDimension,
  type DimensionScore,
  type BreakthroughEvaluationResult,
  type ClassificationTier,
  DIMENSION_CONFIGS,
  getClassificationFromScore,
  getClassificationConfig,
  getScoreColor,
} from '../types-breakthrough'

// =============================================================================
// Automated Validation Functions for 12 Dimensions
// Impact Dimensions (BC1-BC8) - 8.0 points total
// Feasibility Dimensions (BC9-BC12) - 2.0 points total
// =============================================================================

/**
 * BC1: Performance Gains (1.2 pts) - REQUIRED
 * Measures efficiency improvement vs state-of-the-art
 * (Scaled 0.8x from original 1.5 pts for 12-dimension system)
 */
function validatePerformanceGains(response: any): ItemScore {
  const hypothesis = response?.hypothesis || response
  const validation = response?.validation || {}
  const simulation = response?.simulation || {}

  // Look for performance metrics
  const efficiencyImprovement = hypothesis?.performanceMetrics?.efficiencyImprovement ||
    hypothesis?.efficiencyGain ||
    validation?.efficiencyImprovement ||
    simulation?.efficiencyImprovement ||
    0

  const performanceGain = hypothesis?.performanceMetrics?.performanceGain ||
    hypothesis?.performanceImprovement ||
    validation?.performanceGain ||
    0

  // Normalize to percentage if needed
  let improvementPercent = Math.max(efficiencyImprovement, performanceGain)
  if (improvementPercent > 1 && improvementPercent <= 100) {
    // Already in percentage form
  } else if (improvementPercent <= 1) {
    improvementPercent = improvementPercent * 100
  }

  // Check for SOTA comparison
  const hasSOTAComparison = hypothesis?.stateOfTheArt || hypothesis?.priorArt ||
    hypothesis?.currentBenchmark || validation?.sotaComparison

  // Check for quantitative claims
  const description = JSON.stringify(hypothesis).toLowerCase()
  const hasQuantitativeClaims = /\d+(\.\d+)?%/.test(description) ||
    /(efficiency|performance|improvement).*(increase|gain|boost)/i.test(description)

  let points = 0
  let reasoning = ''
  let score = 0

  // Points scaled by 0.8: 1.5 -> 1.2, 1.2 -> 0.96, 0.9 -> 0.72, 0.6 -> 0.48, 0.3 -> 0.24
  if (improvementPercent >= 50 || (hasSOTAComparison && improvementPercent >= 40)) {
    points = 1.2
    score = 95
    reasoning = `Revolutionary performance: ${improvementPercent.toFixed(1)}% improvement vs SOTA`
  } else if (improvementPercent >= 25) {
    points = 0.96
    score = 80
    reasoning = `Major performance gain: ${improvementPercent.toFixed(1)}% improvement`
  } else if (improvementPercent >= 10) {
    points = 0.72
    score = 65
    reasoning = `Significant performance: ${improvementPercent.toFixed(1)}% improvement`
  } else if (improvementPercent >= 5 || hasQuantitativeClaims) {
    points = 0.48
    score = 50
    reasoning = `Moderate performance: ${improvementPercent.toFixed(1)}% improvement`
  } else {
    points = 0.24
    score = 25
    reasoning = 'Incremental performance improvement'
  }

  return {
    itemId: 'BC1',
    points,
    maxPoints: 1.2,
    passed: points >= 0.72,
    reasoning,
  }
}

/**
 * BC2: Cost Reduction (1.2 pts)
 * Measures LCOE, CAPEX, OPEX improvements
 * (Scaled 0.8x from original 1.5 pts for 12-dimension system)
 */
function validateCostReduction(response: any): ItemScore {
  const hypothesis = response?.hypothesis || response
  const tea = response?.tea || response?.technoeconomic || {}
  const validation = response?.validation || {}

  // Look for cost metrics
  const lcoeReduction = tea?.lcoeReduction || hypothesis?.costMetrics?.lcoeReduction || 0
  const capexReduction = tea?.capexReduction || hypothesis?.costMetrics?.capexReduction || 0
  const opexReduction = tea?.opexReduction || hypothesis?.costMetrics?.opexReduction || 0

  // Calculate overall cost improvement
  const costReductions = [lcoeReduction, capexReduction, opexReduction].filter(r => r > 0)
  const avgCostReduction = costReductions.length > 0
    ? costReductions.reduce((a, b) => a + b, 0) / costReductions.length
    : 0

  // Check for economic analysis
  const hasEconomicAnalysis = tea?.npv || tea?.irr || tea?.paybackPeriod ||
    hypothesis?.economicImpact || validation?.economicAnalysis

  // Check for competitive positioning
  const description = JSON.stringify(hypothesis).toLowerCase()
  const hasCompetitiveAnalysis = /lcoe|capex|opex|cost.*(reduc|lower|cheaper)/i.test(description) ||
    /(competitive|economical|affordable)/i.test(description)

  let points = 0
  let reasoning = ''
  let score = 0

  // Points scaled by 0.8: 1.5 -> 1.2, 1.2 -> 0.96, 0.9 -> 0.72, 0.6 -> 0.48, 0.3 -> 0.24
  if (avgCostReduction >= 50) {
    points = 1.2
    score = 95
    reasoning = `Transformative cost reduction: ${avgCostReduction.toFixed(1)}% average`
  } else if (avgCostReduction >= 30 || (hasEconomicAnalysis && avgCostReduction >= 20)) {
    points = 0.96
    score = 80
    reasoning = `Major cost reduction: ${avgCostReduction.toFixed(1)}% with economic analysis`
  } else if (avgCostReduction >= 15) {
    points = 0.72
    score = 65
    reasoning = `Significant cost reduction: ${avgCostReduction.toFixed(1)}%`
  } else if (avgCostReduction >= 5 || hasCompetitiveAnalysis) {
    points = 0.48
    score = 50
    reasoning = `Moderate cost improvement: ${avgCostReduction.toFixed(1)}%`
  } else {
    points = 0.24
    score = 25
    reasoning = 'Marginal cost impact'
  }

  return {
    itemId: 'BC2',
    points,
    maxPoints: 1.2,
    passed: points >= 0.72,
    reasoning,
  }
}

/**
 * BC3: Advanced Capabilities (0.8 pts)
 * Measures new functions not previously possible
 * (Scaled 0.8x from original 1.0 pts for 12-dimension system)
 */
function validateAdvancedCapabilities(response: any): ItemScore {
  const hypothesis = response?.hypothesis || response
  const description = hypothesis?.description || hypothesis?.statement || ''
  const mechanism = hypothesis?.mechanism || {}

  // Check for new capabilities
  const newCapabilities = hypothesis?.newCapabilities || hypothesis?.advancedFeatures || []
  const capabilityCount = Array.isArray(newCapabilities) ? newCapabilities.length : 0

  // Check for capability-related keywords
  const capabilityKeywords = [
    'enables', 'allows', 'makes possible', 'unlocks', 'achieves',
    'first time', 'never before', 'previously impossible', 'new ability'
  ]
  const keywordMatches = capabilityKeywords.filter(kw =>
    description.toLowerCase().includes(kw)
  ).length

  // Check for functional enhancements
  const hasFunctionalEnhancement = mechanism?.enabledCapabilities ||
    hypothesis?.functionalImprovements ||
    hypothesis?.technicalCapabilities

  let points = 0
  let reasoning = ''
  let score = 0

  // Points scaled by 0.8: 1.0 -> 0.8, 0.8 -> 0.64, 0.6 -> 0.48, 0.4 -> 0.32, 0.2 -> 0.16
  if (capabilityCount >= 3 || keywordMatches >= 3) {
    points = 0.8
    score = 95
    reasoning = `Entirely new capabilities: ${capabilityCount} new functions identified`
  } else if (capabilityCount >= 2 || keywordMatches >= 2 || hasFunctionalEnhancement) {
    points = 0.64
    score = 80
    reasoning = `Significant capability enhancement: ${capabilityCount || keywordMatches} new features`
  } else if (capabilityCount >= 1 || keywordMatches >= 1) {
    points = 0.48
    score = 60
    reasoning = 'Moderate capability enhancement'
  } else if (mechanism?.steps?.length > 0) {
    points = 0.32
    score = 40
    reasoning = 'Minor capability enhancement'
  } else {
    points = 0.16
    score = 20
    reasoning = 'Incremental capability improvement'
  }

  return {
    itemId: 'BC3',
    points,
    maxPoints: 0.8,
    passed: points >= 0.48,
    reasoning,
  }
}

/**
 * BC4: New Applications (0.8 pts)
 * Measures cross-domain potential, market expansion
 * (Scaled 0.8x from original 1.0 pts for 12-dimension system)
 */
function validateNewApplications(response: any): ItemScore {
  const hypothesis = response?.hypothesis || response

  // Check for applications
  const applications = hypothesis?.applications ||
    hypothesis?.potentialApplications ||
    hypothesis?.useCases || []
  const applicationCount = Array.isArray(applications) ? applications.length : 0

  // Check for cross-domain potential
  const domains = hypothesis?.targetDomains ||
    hypothesis?.applicableDomains ||
    hypothesis?.marketSectors || []
  const domainCount = Array.isArray(domains) ? domains.length : 0

  // Check for market expansion keywords
  const description = JSON.stringify(hypothesis).toLowerCase()
  const hasMarketExpansion = /(new market|expand|cross.?domain|multiple.?(sector|industr|application))/i.test(description)
  const hasTransferability = /(transfer|adapt|apply to|extend to)/i.test(description)

  let points = 0
  let reasoning = ''
  let score = 0

  // Points scaled by 0.8: 1.0 -> 0.8, 0.8 -> 0.64, 0.6 -> 0.48, 0.4 -> 0.32, 0.2 -> 0.16
  if (domainCount >= 3 || (applicationCount >= 5 && hasMarketExpansion)) {
    points = 0.8
    score = 95
    reasoning = `Multiple new domains: ${domainCount} sectors, ${applicationCount} applications`
  } else if (domainCount >= 2 || (applicationCount >= 3 && hasTransferability)) {
    points = 0.64
    score = 80
    reasoning = `Two new domains identified with ${applicationCount} applications`
  } else if (domainCount >= 1 || applicationCount >= 2) {
    points = 0.48
    score = 60
    reasoning = `One new domain with ${applicationCount} applications`
  } else if (hasMarketExpansion || hasTransferability) {
    points = 0.32
    score = 40
    reasoning = 'Enhanced existing applications'
  } else {
    points = 0.16
    score = 20
    reasoning = 'Same application scope'
  }

  return {
    itemId: 'BC4',
    points,
    maxPoints: 0.8,
    passed: points >= 0.48,
    reasoning,
  }
}

/**
 * BC5: Societal Impact (0.8 pts)
 * Measures decarbonization potential, accessibility
 * (Scaled 0.8x from original 1.0 pts for 12-dimension system)
 */
function validateSocietalImpact(response: any): ItemScore {
  const hypothesis = response?.hypothesis || response

  // Check for impact metrics
  const co2Reduction = hypothesis?.environmentalImpact?.co2Reduction ||
    hypothesis?.decarbonizationPotential || 0
  const accessibilityScore = hypothesis?.socialImpact?.accessibility ||
    hypothesis?.accessibilityImprovement || 0

  // Check for societal impact keywords
  const description = JSON.stringify(hypothesis).toLowerCase()
  const impactKeywords = {
    decarbonization: /(decarboniz|carbon.?neutral|net.?zero|emission.?reduc|ghg)/i.test(description),
    accessibility: /(accessible|affordable|developing.?countr|rural|off.?grid)/i.test(description),
    jobs: /(job|employment|economic.?growth|workforce)/i.test(description),
    sustainability: /(sustainab|renewable|clean.?energy|environment)/i.test(description),
    equity: /(equit|justice|inclusive|communit)/i.test(description),
  }
  const keywordMatches = Object.values(impactKeywords).filter(Boolean).length

  // Check for quantified impact
  const hasQuantifiedImpact = co2Reduction > 0 || accessibilityScore > 0 ||
    hypothesis?.impactMetrics || hypothesis?.sdgAlignment

  let points = 0
  let reasoning = ''
  let score = 0

  // Points scaled by 0.8: 1.0 -> 0.8, 0.8 -> 0.64, 0.6 -> 0.48, 0.4 -> 0.32, 0.2 -> 0.16
  if (keywordMatches >= 4 || (hasQuantifiedImpact && keywordMatches >= 3)) {
    points = 0.8
    score = 95
    reasoning = `Transformative societal impact: ${keywordMatches} impact areas addressed`
  } else if (keywordMatches >= 3 || (hasQuantifiedImpact && keywordMatches >= 2)) {
    points = 0.64
    score = 80
    reasoning = `Major positive impact: ${keywordMatches} areas with quantified metrics`
  } else if (keywordMatches >= 2) {
    points = 0.48
    score = 60
    reasoning = `Significant impact: ${keywordMatches} societal benefits identified`
  } else if (keywordMatches >= 1) {
    points = 0.32
    score = 40
    reasoning = 'Moderate societal impact'
  } else {
    points = 0.16
    score = 20
    reasoning = 'Limited societal impact'
  }

  return {
    itemId: 'BC5',
    points,
    maxPoints: 0.8,
    passed: points >= 0.48,
    reasoning,
  }
}

/**
 * BC6: Opportunity Scale (1.2 pts)
 * Measures market size, deployment potential
 * (Scaled 0.8x from original 1.5 pts for 12-dimension system)
 */
function validateOpportunityScale(response: any): ItemScore {
  const hypothesis = response?.hypothesis || response
  const tea = response?.tea || response?.technoeconomic || {}

  // Check for market size
  const marketSize = tea?.marketSize || hypothesis?.marketPotential?.size || 0
  const marketGrowthRate = tea?.marketGrowthRate || hypothesis?.marketPotential?.cagr || 0

  // Check for deployment potential
  const deploymentScale = hypothesis?.deploymentPotential ||
    hypothesis?.scalabilityAssessment ||
    hypothesis?.commercializationPath

  // Check for scale keywords
  const description = JSON.stringify(hypothesis).toLowerCase()
  const scaleKeywords = {
    global: /(global|worldwide|international)/i.test(description),
    largescale: /(large.?scale|utility.?scale|grid.?scale|gw|tw)/i.test(description),
    massmarket: /(mass.?market|mainstream|widespread|ubiquitous)/i.test(description),
    billion: /\d+\s*(b|billion)/i.test(description),
    trillion: /\d+\s*(t|trillion)/i.test(description),
  }
  const keywordMatches = Object.values(scaleKeywords).filter(Boolean).length

  // Estimate market tier
  let marketTier = 'niche'
  if (marketSize >= 100e9 || scaleKeywords.trillion) marketTier = 'global'
  else if (marketSize >= 10e9 || scaleKeywords.billion) marketTier = 'major'
  else if (marketSize >= 1e9 || scaleKeywords.largescale) marketTier = 'significant'
  else if (marketSize >= 100e6 || scaleKeywords.massmarket) marketTier = 'moderate'

  let points = 0
  let reasoning = ''
  let score = 0

  // Points scaled by 0.8: 1.5 -> 1.2, 1.2 -> 0.96, 0.9 -> 0.72, 0.6 -> 0.48, 0.3 -> 0.24
  if (marketTier === 'global' || keywordMatches >= 4) {
    points = 1.2
    score = 95
    reasoning = `Global scale opportunity: $${(marketSize / 1e9).toFixed(1)}B+ market`
  } else if (marketTier === 'major' || keywordMatches >= 3) {
    points = 0.96
    score = 80
    reasoning = `Major market opportunity: $${(marketSize / 1e9).toFixed(1)}B market`
  } else if (marketTier === 'significant' || keywordMatches >= 2) {
    points = 0.72
    score = 65
    reasoning = `Significant market: ${deploymentScale ? 'clear deployment path' : 'moderate scale'}`
  } else if (marketTier === 'moderate' || keywordMatches >= 1) {
    points = 0.48
    score = 45
    reasoning = 'Moderate market opportunity'
  } else {
    points = 0.24
    score = 25
    reasoning = 'Niche market application'
  }

  return {
    itemId: 'BC6',
    points,
    maxPoints: 1.2,
    passed: points >= 0.72,
    reasoning,
  }
}

/**
 * BC7: Problem-Solving (0.8 pts)
 * Measures addressing unsolved challenges
 * (Scaled 0.8x from original 1.0 pts for 12-dimension system)
 */
function validateProblemSolving(response: any): ItemScore {
  const hypothesis = response?.hypothesis || response

  // Check for problem definition
  const problemStatement = hypothesis?.problemStatement ||
    hypothesis?.challengeAddressed ||
    hypothesis?.researchGap

  // Check for unsolved problems
  const unsolvedProblems = hypothesis?.unsolvedChallenges ||
    hypothesis?.researchGaps ||
    hypothesis?.fundamentalChallenges || []
  const unsolvedCount = Array.isArray(unsolvedProblems) ? unsolvedProblems.length : 0

  // Check for solution completeness
  const solutionCompleteness = hypothesis?.solutionCompleteness ||
    hypothesis?.addressedChallenges || 0

  // Check for problem-solving keywords
  const description = JSON.stringify(hypothesis).toLowerCase()
  const problemKeywords = {
    fundamental: /(fundamental|critical|major|key).*(problem|challenge|barrier|limitation)/i.test(description),
    unsolved: /(unsolved|unresolved|persistent|long.?standing)/i.test(description),
    breakthrough: /(breakthrough|solution|solve|overcome|address)/i.test(description),
    bottleneck: /(bottleneck|barrier|limit|constraint)/i.test(description),
  }
  const keywordMatches = Object.values(problemKeywords).filter(Boolean).length

  let points = 0
  let reasoning = ''
  let score = 0

  // Points scaled by 0.8: 1.0 -> 0.8, 0.8 -> 0.64, 0.6 -> 0.48, 0.4 -> 0.32, 0.2 -> 0.16
  if ((problemKeywords.fundamental && problemKeywords.unsolved && problemKeywords.breakthrough) ||
      (unsolvedCount >= 2 && solutionCompleteness >= 80)) {
    points = 0.8
    score = 95
    reasoning = 'Solves fundamental unsolved problem with high completeness'
  } else if ((problemKeywords.unsolved && problemKeywords.breakthrough) || unsolvedCount >= 2) {
    points = 0.64
    score = 80
    reasoning = `Major contribution: addresses ${unsolvedCount} unsolved challenges`
  } else if (keywordMatches >= 2 || unsolvedCount >= 1) {
    points = 0.48
    score = 60
    reasoning = 'Significant progress on challenge'
  } else if (keywordMatches >= 1 || problemStatement) {
    points = 0.32
    score = 40
    reasoning = 'Partial solution to identified problem'
  } else {
    points = 0.16
    score = 20
    reasoning = 'Incremental progress'
  }

  return {
    itemId: 'BC7',
    points,
    maxPoints: 0.8,
    passed: points >= 0.48,
    reasoning,
  }
}

/**
 * BC8: Knowledge Trajectory (1.2 pts) - REQUIRED
 * Measures paradigm shift vs incremental improvement
 * (Scaled 0.8x from original 1.5 pts for 12-dimension system)
 */
function validateKnowledgeTrajectory(response: any): ItemScore {
  const hypothesis = response?.hypothesis || response
  const novelty = hypothesis?.novelty || hypothesis?.noveltyAssessment || {}

  // Check for paradigm shift indicators
  const paradigmShiftIndicators = {
    challengesAssumptions: novelty?.challengesFundamentalAssumptions ||
      hypothesis?.challengesAssumptions || false,
    newMethodology: novelty?.introducesNewMethodology ||
      hypothesis?.newMethodology || false,
    enablesFollowOn: (novelty?.enablesFollowOnDiscoveries || []).length >= 2 ||
      (hypothesis?.followOnPotential || []).length >= 2,
    contradictsPriorArt: novelty?.contradictsPriorArt ||
      hypothesis?.contradictsPriorArt || false,
    opensNewField: novelty?.opensNewField ||
      hypothesis?.opensNewResearchField || false,
  }

  const indicatorCount = Object.values(paradigmShiftIndicators).filter(Boolean).length

  // Check for trajectory keywords
  const description = JSON.stringify(hypothesis).toLowerCase()
  const trajectoryKeywords = {
    paradigm: /(paradigm.?shift|revolutionary|transformative|disruptive)/i.test(description),
    newField: /(new.?field|new.?area|unexplored|uncharted)/i.test(description),
    fundamental: /(fundamental|first.?principles|foundational)/i.test(description),
    redefine: /(redefin|reconceptualiz|reimagin|rethink)/i.test(description),
  }
  const keywordMatches = Object.values(trajectoryKeywords).filter(Boolean).length

  // Check novelty score
  let noveltyScore = novelty?.score || hypothesis?.noveltyScore || 0
  if (noveltyScore > 10) noveltyScore = noveltyScore / 10

  let points = 0
  let reasoning = ''
  let score = 0

  // Points scaled by 0.8: 1.5 -> 1.2, 1.2 -> 0.96, 0.9 -> 0.72, 0.6 -> 0.48, 0.3 -> 0.24
  if (paradigmShiftIndicators.opensNewField || (indicatorCount >= 4 && noveltyScore >= 9)) {
    points = 1.2
    score = 98
    reasoning = 'Opens entirely new research field - paradigm-shifting trajectory'
  } else if (paradigmShiftIndicators.challengesAssumptions || indicatorCount >= 3) {
    points = 0.96
    score = 85
    reasoning = `Challenges fundamental assumptions: ${indicatorCount} paradigm shift indicators`
  } else if (paradigmShiftIndicators.newMethodology || indicatorCount >= 2 || keywordMatches >= 2) {
    points = 0.72
    score = 70
    reasoning = 'Introduces new methodology or approach'
  } else if (indicatorCount >= 1 || keywordMatches >= 1 || noveltyScore >= 7) {
    points = 0.48
    score = 50
    reasoning = 'Novel combination of existing knowledge'
  } else {
    points = 0.24
    score = 25
    reasoning = 'Incremental within existing paradigm'
  }

  return {
    itemId: 'BC8',
    points,
    maxPoints: 1.2,
    passed: points >= 0.72,
    reasoning,
  }
}

// =============================================================================
// Feasibility Dimension Validation Functions (BC9-BC12)
// =============================================================================

/**
 * BC9: Technical Feasibility (0.5 pts)
 * Measures engineering readiness, TRL level, prototype status
 */
function validateTechnicalFeasibility(response: any): ItemScore {
  const hypothesis = response?.hypothesis || response
  const validation = response?.validation || {}

  // Check for TRL indicators
  const trl = hypothesis?.technicalReadiness?.trl ||
    hypothesis?.trl ||
    validation?.trlLevel ||
    0

  // Check for prototype/demonstration status
  const hasPrototype = hypothesis?.prototypeStatus ||
    hypothesis?.technicalReadiness?.prototypeExists ||
    validation?.hasPrototype || false

  const hasLabValidation = hypothesis?.technicalReadiness?.labValidated ||
    hypothesis?.labDemonstrated ||
    validation?.labValidated || false

  const hasFieldTesting = hypothesis?.technicalReadiness?.fieldTested ||
    hypothesis?.fieldDemonstrated ||
    validation?.fieldTested || false

  // Check for engineering readiness keywords
  const description = JSON.stringify(hypothesis).toLowerCase()
  const engineeringKeywords = {
    demonstrated: /(demonstrated|proven|validated|tested)/i.test(description),
    scalable: /(scalable|scale.?up|manufacturing)/i.test(description),
    practical: /(practical|implement|engineer|build)/i.test(description),
    mature: /(mature|commercial|production|deploy)/i.test(description),
  }
  const keywordMatches = Object.values(engineeringKeywords).filter(Boolean).length

  let points = 0
  let reasoning = ''
  let score = 0

  if (trl >= 7 || (hasFieldTesting && hasPrototype)) {
    points = 0.5
    score = 95
    reasoning = `TRL 7-9: System ready for deployment (TRL ${trl || '7+'})`
  } else if (trl >= 5 || (hasLabValidation && hasPrototype)) {
    points = 0.4
    score = 75
    reasoning = `TRL 5-6: Technology validated in relevant environment`
  } else if (trl >= 3 || hasPrototype || (keywordMatches >= 3)) {
    points = 0.3
    score = 55
    reasoning = `TRL 3-4: Proof of concept demonstrated`
  } else if (trl >= 1 || hasLabValidation || keywordMatches >= 2) {
    points = 0.2
    score = 35
    reasoning = `TRL 1-2: Basic principles observed`
  } else {
    points = 0.1
    score = 15
    reasoning = 'Theoretical only - no experimental validation'
  }

  return {
    itemId: 'BC9',
    points,
    maxPoints: 0.5,
    passed: points >= 0.3,
    reasoning,
  }
}

/**
 * BC10: Existing Literature (0.5 pts)
 * Measures alignment with established research and peer-reviewed support
 *
 * Enhanced to use:
 * 1. Pre-computed literature validation results (if available from LiteratureCrossReferenceValidator)
 * 2. Supporting evidence from hypothesis
 * 3. Fallback to keyword matching for quick assessment
 */
function validateExistingLiterature(response: any): ItemScore {
  const hypothesis = response?.hypothesis || response
  const research = response?.research || hypothesis?.researchContext || {}

  // Check for pre-computed literature cross-reference validation results
  // This is populated by LiteratureCrossReferenceValidator during discovery workflow
  const precomputedValidation = response?.literatureCrossReference ||
    hypothesis?.literatureValidation ||
    research?.literatureCrossReference

  if (precomputedValidation && typeof precomputedValidation.overallConfidence === 'number') {
    // Use pre-computed validation results from LiteratureCrossReferenceValidator
    const confidence = precomputedValidation.overallConfidence
    const supportedClaims = precomputedValidation.supportedClaims || 0
    const contradictedClaims = precomputedValidation.contradictedClaims || 0
    const totalClaims = precomputedValidation.totalClaims || 1

    let points = 0
    let reasoning = ''

    if (confidence >= 0.9 && supportedClaims >= 5 && contradictedClaims === 0) {
      points = 0.5
      reasoning = `Strong peer-reviewed foundation: ${supportedClaims}/${totalClaims} claims verified (${(confidence * 100).toFixed(0)}% confidence)`
    } else if (confidence >= 0.7 && supportedClaims >= 3 && contradictedClaims === 0) {
      points = 0.4
      reasoning = `Good literature support: ${supportedClaims}/${totalClaims} claims verified`
    } else if (confidence >= 0.5 && supportedClaims >= 1) {
      points = 0.3
      reasoning = `Moderate support: ${supportedClaims}/${totalClaims} claims verified, gaps identified`
    } else if (supportedClaims > 0) {
      points = 0.2
      reasoning = `Limited supporting literature: ${supportedClaims} claim(s) verified`
    } else {
      points = 0.1
      reasoning = 'No claims verified by literature - high risk novel approach'
    }

    // Penalize contradictions
    if (contradictedClaims > 0) {
      points = Math.max(0.1, points - 0.1)
      reasoning += ` (Warning: ${contradictedClaims} claim(s) contradict existing literature)`
    }

    return {
      itemId: 'BC10',
      points,
      maxPoints: 0.5,
      passed: points >= 0.3,
      reasoning,
    }
  }

  // Check for supporting evidence in hypothesis
  const supportingEvidence = hypothesis?.supportingEvidence || []
  const evidenceCount = Array.isArray(supportingEvidence) ? supportingEvidence.length : 0
  const peerReviewedEvidence = supportingEvidence.filter((e: any) =>
    e.source?.includes('journal') ||
    e.source?.includes('paper') ||
    e.isPeerReviewed
  ).length

  // Check for literature support from research phase
  const citations = research?.citations ||
    hypothesis?.references ||
    hypothesis?.citations || []
  const citationCount = Array.isArray(citations) ? citations.length : 0

  const peerReviewedCitations = research?.peerReviewedCitations ||
    hypothesis?.peerReviewedReferences ||
    peerReviewedEvidence || 0

  // Check for literature alignment
  const hasSOTAAnalysis = research?.stateOfTheArt ||
    hypothesis?.priorArt ||
    hypothesis?.literatureReview

  const hasContradictions = research?.contradictions ||
    hypothesis?.contradictsPriorArt || false

  // Check for literature keywords in description
  const description = JSON.stringify(hypothesis).toLowerCase()
  const literatureKeywords = {
    peerReviewed: /(peer.?review|journal|published|paper)/i.test(description),
    cited: /(cited|reference|literature|prior.?work)/i.test(description),
    extends: /(extends|builds.?on|based.?on|leverages)/i.test(description),
    validated: /(validated|confirmed|supported|established)/i.test(description),
  }
  const keywordMatches = Object.values(literatureKeywords).filter(Boolean).length

  // Combine evidence count with citation count
  const totalSupport = evidenceCount + citationCount

  let points = 0
  let reasoning = ''

  if ((peerReviewedCitations >= 10 || totalSupport >= 20) && hasSOTAAnalysis && !hasContradictions) {
    points = 0.5
    reasoning = `Strong peer-reviewed foundation: ${totalSupport} supporting sources, extends SOTA`
  } else if ((peerReviewedCitations >= 5 || totalSupport >= 10) && hasSOTAAnalysis) {
    points = 0.4
    reasoning = `Good literature support: ${totalSupport} supporting sources, some novel elements`
  } else if (totalSupport >= 5 || keywordMatches >= 3) {
    points = 0.3
    reasoning = `Moderate support: ${totalSupport} supporting sources, significant gaps`
  } else if (totalSupport >= 2 || keywordMatches >= 2) {
    points = 0.2
    reasoning = `Limited supporting literature: ${totalSupport} supporting sources`
  } else {
    points = 0.1
    reasoning = 'No prior literature - high risk novel approach'
  }

  if (hasContradictions) {
    points = Math.max(0.1, points - 0.1)
    reasoning += ' (contradicts existing literature)'
  }

  return {
    itemId: 'BC10',
    points,
    maxPoints: 0.5,
    passed: points >= 0.3,
    reasoning,
  }
}

/**
 * BC11: Existing Infrastructure (0.5 pts)
 * Measures compatibility with current manufacturing and deployment systems
 */
function validateExistingInfrastructure(response: any): ItemScore {
  const hypothesis = response?.hypothesis || response
  const deployment = hypothesis?.deploymentPath || hypothesis?.commercialization || {}

  // Check for infrastructure compatibility
  const infrastructureCompatibility = deployment?.infrastructureCompatibility ||
    hypothesis?.infrastructureRequirements?.compatibility || 0

  const usesExistingSupplyChain = deployment?.usesExistingSupplyChain ||
    hypothesis?.supplyChainCompatible || false

  const requiresNewFacilities = deployment?.requiresNewFacilities ||
    hypothesis?.newInfrastructureRequired || false

  // Check for infrastructure keywords
  const description = JSON.stringify(hypothesis).toLowerCase()
  const infraKeywords = {
    dropIn: /(drop.?in|retrofit|compatible|plug.?and.?play)/i.test(description),
    existing: /(existing|current|established|standard)/i.test(description),
    manufacturing: /(manufacturing|production|factory|facility)/i.test(description),
    supplyChain: /(supply.?chain|supplier|vendor|material)/i.test(description),
  }
  const keywordMatches = Object.values(infraKeywords).filter(Boolean).length

  let points = 0
  let reasoning = ''
  let score = 0

  if ((infrastructureCompatibility >= 90 || usesExistingSupplyChain) && !requiresNewFacilities) {
    points = 0.5
    score = 95
    reasoning = 'Drop-in compatible with existing systems'
  } else if (infrastructureCompatibility >= 70 || (keywordMatches >= 3 && !requiresNewFacilities)) {
    points = 0.4
    score = 75
    reasoning = 'Minor modifications needed to existing infrastructure'
  } else if (infrastructureCompatibility >= 50 || keywordMatches >= 2) {
    points = 0.3
    score = 55
    reasoning = 'Moderate infrastructure changes required'
  } else if (keywordMatches >= 1 && !requiresNewFacilities) {
    points = 0.2
    score = 35
    reasoning = 'Significant new infrastructure required'
  } else {
    points = 0.1
    score = 15
    reasoning = 'Entirely new infrastructure needed'
  }

  return {
    itemId: 'BC11',
    points,
    maxPoints: 0.5,
    passed: points >= 0.3,
    reasoning,
  }
}

/**
 * BC12: Capital Requirements (0.5 pts)
 * Measures investment needs and funding accessibility
 */
function validateCapitalRequirements(response: any): ItemScore {
  const hypothesis = response?.hypothesis || response
  const tea = response?.tea || response?.technoeconomic || {}
  const funding = hypothesis?.fundingRequirements || {}

  // Check for capital requirements
  const capitalRequired = tea?.capitalRequired ||
    funding?.totalInvestment ||
    hypothesis?.investmentRequired || 0

  const paybackPeriod = tea?.paybackPeriod ||
    funding?.paybackYears || 0

  const roiPercent = tea?.roi ||
    funding?.expectedROI || 0

  // Check for funding keywords
  const description = JSON.stringify(hypothesis).toLowerCase()
  const fundingKeywords = {
    lowCost: /(low.?cost|affordable|minimal.?investment|lean)/i.test(description),
    fundable: /(fundable|vc|venture|grant|seed)/i.test(description),
    roi: /(roi|return|payback|profitable)/i.test(description),
    commercial: /(commercial|revenue|market|business)/i.test(description),
  }
  const keywordMatches = Object.values(fundingKeywords).filter(Boolean).length

  // Determine capital tier
  let capitalTier = 'unknown'
  if (capitalRequired > 0) {
    if (capitalRequired < 1e6) capitalTier = 'seed'
    else if (capitalRequired < 10e6) capitalTier = 'seriesA'
    else if (capitalRequired < 100e6) capitalTier = 'growth'
    else if (capitalRequired < 1e9) capitalTier = 'strategic'
    else capitalTier = 'mega'
  }

  let points = 0
  let reasoning = ''
  let score = 0

  if (capitalTier === 'seed' || (roiPercent >= 30 && paybackPeriod <= 3)) {
    points = 0.5
    score = 95
    reasoning = `<$1M required, easily fundable (${capitalTier === 'seed' ? '<$1M' : `${roiPercent}% ROI`})`
  } else if (capitalTier === 'seriesA' || (roiPercent >= 20 && paybackPeriod <= 5)) {
    points = 0.4
    score = 75
    reasoning = `$1-10M required, standard VC range`
  } else if (capitalTier === 'growth' || keywordMatches >= 3) {
    points = 0.3
    score = 55
    reasoning = `$10-100M required, needs strategic partners`
  } else if (capitalTier === 'strategic' || keywordMatches >= 2) {
    points = 0.2
    score = 35
    reasoning = `$100M-1B required, major capital commitment`
  } else {
    points = 0.1
    score = 15
    reasoning = '>$1B required, government/multinational scale'
  }

  return {
    itemId: 'BC12',
    points,
    maxPoints: 0.5,
    passed: points >= 0.3,
    reasoning,
  }
}

// =============================================================================
// Rubric Items (12 Dimensions)
// =============================================================================

const breakthroughItems: RubricItem[] = [
  // ============================================================================
  // Impact Dimensions (BC1-BC8) - 8.0 points total
  // ============================================================================
  {
    id: 'BC1',
    description: 'Performance Gains: Efficiency improvement vs state-of-the-art (REQUIRED)',
    points: 1.2, // Scaled 0.8x from 1.5
    category: 'accuracy',
    passCondition: '25%+ improvement over current SOTA with quantitative evidence',
    partialConditions: [
      { condition: '50%+ improvement (Revolutionary)', points: 1.2 },
      { condition: '25-50% improvement (Major)', points: 0.96 },
      { condition: '10-25% improvement (Significant)', points: 0.72 },
      { condition: '5-10% improvement (Moderate)', points: 0.48 },
      { condition: '<5% improvement (Incremental)', points: 0.24 },
    ],
    automatedValidation: validatePerformanceGains,
  },
  {
    id: 'BC2',
    description: 'Cost Reduction: LCOE, CAPEX, OPEX improvements',
    points: 1.2, // Scaled 0.8x from 1.5
    category: 'economics',
    passCondition: 'Demonstrates 15%+ cost reduction with economic analysis',
    partialConditions: [
      { condition: '50%+ reduction (Transformative)', points: 1.2 },
      { condition: '30-50% reduction (Major)', points: 0.96 },
      { condition: '15-30% reduction (Significant)', points: 0.72 },
      { condition: '5-15% reduction (Moderate)', points: 0.48 },
      { condition: '<5% reduction (Marginal)', points: 0.24 },
    ],
    automatedValidation: validateCostReduction,
  },
  {
    id: 'BC3',
    description: 'Advanced Capabilities: New functions not previously possible',
    points: 0.8, // Scaled 0.8x from 1.0
    category: 'novelty',
    passCondition: 'Enables 1+ entirely new capabilities or significant enhancements',
    partialConditions: [
      { condition: 'Entirely new capability (3+ functions)', points: 0.8 },
      { condition: 'Significant enhancement (2 functions)', points: 0.64 },
      { condition: 'Moderate enhancement (1 function)', points: 0.48 },
      { condition: 'Minor enhancement', points: 0.32 },
      { condition: 'Incremental improvement', points: 0.16 },
    ],
    automatedValidation: validateAdvancedCapabilities,
  },
  {
    id: 'BC4',
    description: 'New Applications: Cross-domain potential, market expansion',
    points: 0.8, // Scaled 0.8x from 1.0
    category: 'feasibility',
    passCondition: 'Applicable to 1+ new domains beyond original scope',
    partialConditions: [
      { condition: 'Multiple new domains (3+)', points: 0.8 },
      { condition: 'Two new domains', points: 0.64 },
      { condition: 'One new domain', points: 0.48 },
      { condition: 'Enhanced existing applications', points: 0.32 },
      { condition: 'Same application scope', points: 0.16 },
    ],
    automatedValidation: validateNewApplications,
  },
  {
    id: 'BC5',
    description: 'Societal Impact: Decarbonization potential, accessibility',
    points: 0.8, // Scaled 0.8x from 1.0
    category: 'evidence',
    passCondition: 'Clear positive societal impact with 2+ areas addressed',
    partialConditions: [
      { condition: 'Transformative impact (4+ areas)', points: 0.8 },
      { condition: 'Major positive impact (3 areas)', points: 0.64 },
      { condition: 'Significant impact (2 areas)', points: 0.48 },
      { condition: 'Moderate impact (1 area)', points: 0.32 },
      { condition: 'Limited impact', points: 0.16 },
    ],
    automatedValidation: validateSocietalImpact,
  },
  {
    id: 'BC6',
    description: 'Opportunity Scale: Market size, deployment potential',
    points: 1.2, // Scaled 0.8x from 1.5
    category: 'economics',
    passCondition: '$1B+ market opportunity with clear deployment path',
    partialConditions: [
      { condition: 'Global scale (100B+ market)', points: 1.2 },
      { condition: 'Major market (10-100B)', points: 0.96 },
      { condition: 'Significant market (1-10B)', points: 0.72 },
      { condition: 'Moderate market (100M-1B)', points: 0.48 },
      { condition: 'Niche market (<100M)', points: 0.24 },
    ],
    automatedValidation: validateOpportunityScale,
  },
  {
    id: 'BC7',
    description: 'Problem-Solving: Addressing unsolved challenges',
    points: 0.8, // Scaled 0.8x from 1.0
    category: 'methodology',
    passCondition: 'Makes significant progress on 1+ unsolved challenges',
    partialConditions: [
      { condition: 'Solves fundamental unsolved problem', points: 0.8 },
      { condition: 'Major contribution to unsolved problem', points: 0.64 },
      { condition: 'Significant progress on challenge', points: 0.48 },
      { condition: 'Partial solution', points: 0.32 },
      { condition: 'Incremental progress', points: 0.16 },
    ],
    automatedValidation: validateProblemSolving,
  },
  {
    id: 'BC8',
    description: 'Knowledge Trajectory: Paradigm shift vs incremental (REQUIRED)',
    points: 1.2, // Scaled 0.8x from 1.5
    category: 'novelty',
    passCondition: 'Introduces new methodology or challenges fundamental assumptions',
    partialConditions: [
      { condition: 'Opens new research field', points: 1.2 },
      { condition: 'Challenges fundamental assumptions', points: 0.96 },
      { condition: 'New methodology or approach', points: 0.72 },
      { condition: 'Novel combination of existing', points: 0.48 },
      { condition: 'Incremental within paradigm', points: 0.24 },
    ],
    automatedValidation: validateKnowledgeTrajectory,
  },
  // ============================================================================
  // Feasibility Dimensions (BC9-BC12) - 2.0 points total
  // ============================================================================
  {
    id: 'BC9',
    description: 'Technical Feasibility: Engineering readiness, TRL level',
    points: 0.5,
    category: 'feasibility',
    passCondition: 'TRL 3+ with proof of concept or prototype',
    partialConditions: [
      { condition: 'TRL 7-9: System ready for deployment', points: 0.5 },
      { condition: 'TRL 5-6: Technology validated', points: 0.4 },
      { condition: 'TRL 3-4: Proof of concept', points: 0.3 },
      { condition: 'TRL 1-2: Basic principles observed', points: 0.2 },
      { condition: 'Theoretical only', points: 0.1 },
    ],
    automatedValidation: validateTechnicalFeasibility,
  },
  {
    id: 'BC10',
    description: 'Existing Literature: Alignment with peer-reviewed research',
    points: 0.5,
    category: 'evidence',
    passCondition: 'Moderate literature support with some citations',
    partialConditions: [
      { condition: 'Strong peer-reviewed foundation', points: 0.5 },
      { condition: 'Good literature support', points: 0.4 },
      { condition: 'Moderate support, some gaps', points: 0.3 },
      { condition: 'Limited supporting literature', points: 0.2 },
      { condition: 'No prior literature', points: 0.1 },
    ],
    automatedValidation: validateExistingLiterature,
  },
  {
    id: 'BC11',
    description: 'Existing Infrastructure: Manufacturing and deployment compatibility',
    points: 0.5,
    category: 'feasibility',
    passCondition: 'Moderate infrastructure compatibility or minor changes needed',
    partialConditions: [
      { condition: 'Drop-in compatible with existing systems', points: 0.5 },
      { condition: 'Minor modifications needed', points: 0.4 },
      { condition: 'Moderate infrastructure changes', points: 0.3 },
      { condition: 'Significant new infrastructure required', points: 0.2 },
      { condition: 'Entirely new infrastructure needed', points: 0.1 },
    ],
    automatedValidation: validateExistingInfrastructure,
  },
  {
    id: 'BC12',
    description: 'Capital Requirements: Investment needs and funding accessibility',
    points: 0.5,
    category: 'economics',
    passCondition: 'Capital requirements within typical VC/strategic range',
    partialConditions: [
      { condition: '<$1M, easily fundable', points: 0.5 },
      { condition: '$1-10M, standard VC range', points: 0.4 },
      { condition: '$10-100M, requires strategic partners', points: 0.3 },
      { condition: '$100M-1B, major capital needed', points: 0.2 },
      { condition: '>$1B, government/multinational scale', points: 0.1 },
    ],
    automatedValidation: validateCapitalRequirements,
  },
]

// =============================================================================
// Breakthrough Rubric Export
// =============================================================================

export const BREAKTHROUGH_RUBRIC: Rubric = {
  id: 'breakthrough-v2',
  name: 'Breakthrough Engine 12-Dimension Rubric',
  phase: 'hypothesis',  // Using hypothesis phase since breakthrough extends hypothesis evaluation
  domain: 'clean-energy',
  items: breakthroughItems,
  totalPoints: 10,
  successThreshold: 9.0, // Breakthrough threshold
  maxIterations: 5,
  metadata: {
    version: '0.0.3',
    author: 'Breakthrough Engine',
    lastUpdated: new Date(),
    sourceDataset: 'Breakthrough Engine v0.0.3 - 12-dimension rubric (8 impact + 4 feasibility) for breakthrough identification',
  },
}

// Validate that points sum to 10
const totalPoints = breakthroughItems.reduce((sum, item) => sum + item.points, 0)
if (Math.abs(totalPoints - 10) > 0.001) {
  console.warn(`Breakthrough rubric points sum to ${totalPoints}, expected 10`)
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Evaluate all 12 dimensions for a hypothesis
 * - Impact dimensions (BC1-BC8): 8.0 points total
 * - Feasibility dimensions (BC9-BC12): 2.0 points total
 */
export async function evaluateBreakthroughDimensions(
  response: any
): Promise<BreakthroughEvaluationResult> {
  const hypothesisId = response?.hypothesis?.id || response?.id || `hyp-${Date.now()}`
  const agentSource = response?.agentSource || response?.source || 'unknown'
  const iteration = response?.iteration || 1

  // Run all 12 dimension validations
  // Impact dimensions (BC1-BC8)
  const bc1 = validatePerformanceGains(response)
  const bc2 = validateCostReduction(response)
  const bc3 = validateAdvancedCapabilities(response)
  const bc4 = validateNewApplications(response)
  const bc5 = validateSocietalImpact(response)
  const bc6 = validateOpportunityScale(response)
  const bc7 = validateProblemSolving(response)
  const bc8 = validateKnowledgeTrajectory(response)
  // Feasibility dimensions (BC9-BC12)
  const bc9 = validateTechnicalFeasibility(response)
  const bc10 = validateExistingLiterature(response)
  const bc11 = validateExistingInfrastructure(response)
  const bc12 = validateCapitalRequirements(response)

  // Build dimension scores (all 12 dimensions)
  const dimensions = {
    // Impact dimensions
    bc1_performance: itemScoreToDimensionScore(bc1, 'bc1_performance'),
    bc2_cost: itemScoreToDimensionScore(bc2, 'bc2_cost'),
    bc3_capabilities: itemScoreToDimensionScore(bc3, 'bc3_capabilities'),
    bc4_applications: itemScoreToDimensionScore(bc4, 'bc4_applications'),
    bc5_societal: itemScoreToDimensionScore(bc5, 'bc5_societal'),
    bc6_scale: itemScoreToDimensionScore(bc6, 'bc6_scale'),
    bc7_problem_solving: itemScoreToDimensionScore(bc7, 'bc7_problem_solving'),
    bc8_trajectory: itemScoreToDimensionScore(bc8, 'bc8_trajectory'),
    // Feasibility dimensions
    bc9_feasibility: itemScoreToDimensionScore(bc9, 'bc9_feasibility'),
    bc10_literature: itemScoreToDimensionScore(bc10, 'bc10_literature'),
    bc11_infrastructure: itemScoreToDimensionScore(bc11, 'bc11_infrastructure'),
    bc12_capital: itemScoreToDimensionScore(bc12, 'bc12_capital'),
  }

  // Calculate total score (all 12 dimensions)
  const totalScore = bc1.points + bc2.points + bc3.points + bc4.points +
    bc5.points + bc6.points + bc7.points + bc8.points +
    bc9.points + bc10.points + bc11.points + bc12.points
  const totalPercentage = (totalScore / 10) * 100

  // Calculate feasibility score (BC9-BC12, max 2.0 points)
  const feasibilityScore = bc9.points + bc10.points + bc11.points + bc12.points
  const feasibilityPercentage = (feasibilityScore / 2.0) * 100
  const feasibilityConfidence: 'high' | 'medium' | 'low' =
    feasibilityPercentage >= 70 ? 'high' :
    feasibilityPercentage >= 50 ? 'medium' : 'low'

  // Get classification
  const classification = getClassificationFromScore(totalScore)
  const config = getClassificationConfig(classification)

  // Check required dimensions (BC1 + BC8 must pass at 70%)
  const bc1Score = (bc1.points / bc1.maxPoints) * 100
  const bc8Score = (bc8.points / bc8.maxPoints) * 100
  const requiredDimensionsPassed = bc1Score >= 70 && bc8Score >= 70

  // Count dimensions above thresholds (all 12 dimensions)
  const allScores = [bc1, bc2, bc3, bc4, bc5, bc6, bc7, bc8, bc9, bc10, bc11, bc12]
    .map(d => (d.points / d.maxPoints) * 100)
  const dimensionsAbove80 = allScores.filter(s => s >= 80).length
  const dimensionsAbove75 = allScores.filter(s => s >= 75).length
  const dimensionsAbove70 = allScores.filter(s => s >= 70).length

  // Find weakest and strongest dimensions (all 12)
  const sortedDimensions = Object.entries(dimensions)
    .sort(([, a], [, b]) => a.score - b.score)
  const weakestDimensions = sortedDimensions.slice(0, 3).map(([d]) => d as BreakthroughDimension)
  const strongestDimensions = sortedDimensions.slice(-3).reverse().map(([d]) => d as BreakthroughDimension)

  return {
    hypothesisId,
    agentSource,
    iteration,
    timestamp: Date.now(),
    dimensions,
    totalScore,
    totalPercentage,
    classification,
    classificationLabel: config.label,
    classificationColor: config.color.primary,
    requiredDimensionsPassed,
    requiredDimensionsStatus: {
      bc1_performance: { passed: bc1Score >= 70, score: bc1Score },
      bc8_trajectory: { passed: bc8Score >= 70, score: bc8Score },
    },
    dimensionsAbove80,
    dimensionsAbove75,
    dimensionsAbove70,
    weakestDimensions,
    strongestDimensions,
    trending: 'first',
    // Feasibility assessment (new for 12-dimension system)
    feasibilityScore,
    feasibilityPercentage,
    feasibilityConfidence,
  }
}

/**
 * Convert ItemScore to DimensionScore
 */
function itemScoreToDimensionScore(
  itemScore: ItemScore,
  dimension: BreakthroughDimension
): DimensionScore {
  const config = DIMENSION_CONFIGS.find(d => d.id === dimension)!
  const score = (itemScore.points / itemScore.maxPoints) * 100

  // Find the label for this score
  let label = 'Unknown'
  for (const criteria of config.scoringCriteria) {
    if (score >= criteria.threshold) {
      label = criteria.label
      break
    }
  }

  return {
    dimension,
    score,
    points: itemScore.points,
    maxPoints: itemScore.maxPoints,
    percentOfMax: (itemScore.points / itemScore.maxPoints) * 100,
    evidence: [itemScore.reasoning],
    gaps: itemScore.passed ? [] : [itemScore.reasoning],
    label,
  }
}

/**
 * Get the rubric item by ID
 */
export function getBreakthroughRubricItem(itemId: string): RubricItem | undefined {
  return breakthroughItems.find(item => item.id === itemId)
}

/**
 * Get all breakthrough dimension IDs
 */
export function getBreakthroughDimensionIds(): string[] {
  return breakthroughItems.map(item => item.id)
}
