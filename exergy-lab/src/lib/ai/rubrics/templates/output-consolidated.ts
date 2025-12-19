/**
 * Output Phase Consolidated Rubric
 *
 * Combines: rubric_eval + publication
 * Evaluates final quality grading and publication-ready report generation.
 * Total: 10 points, Pass threshold: 7
 */

import type { Rubric, RubricItem, ItemScore } from '../types'

// ============================================================================
// Automated Validation Functions
// ============================================================================

function validateReportCompleteness(response: any): ItemScore {
  const report = response?.report || response?.publication || response

  // Check for required sections
  const sections = {
    title: report?.title || '',
    abstract: report?.abstract || report?.summary || '',
    introduction: report?.introduction || '',
    methodology: report?.methodology || report?.methods || '',
    results: report?.results || '',
    discussion: report?.discussion || '',
    conclusion: report?.conclusion || report?.conclusions || '',
    references: report?.references || report?.citations || [],
  }

  // Count complete sections (non-empty)
  let completeSections = 0
  const sectionDetails: string[] = []

  if (sections.title.length >= 10) {
    completeSections++
  } else {
    sectionDetails.push('title missing/short')
  }

  if (sections.abstract.length >= 100) {
    completeSections++
  } else {
    sectionDetails.push('abstract missing/short')
  }

  if (sections.introduction.length >= 200) {
    completeSections++
  } else {
    sectionDetails.push('introduction missing/short')
  }

  if (sections.methodology.length >= 200) {
    completeSections++
  } else {
    sectionDetails.push('methodology missing/short')
  }

  if (sections.results.length >= 200) {
    completeSections++
  } else {
    sectionDetails.push('results missing/short')
  }

  if (sections.discussion.length >= 150) {
    completeSections++
  } else {
    sectionDetails.push('discussion missing/short')
  }

  if (sections.conclusion.length >= 100) {
    completeSections++
  } else {
    sectionDetails.push('conclusion missing/short')
  }

  const refCount = Array.isArray(sections.references) ? sections.references.length : 0
  if (refCount >= 5) {
    completeSections++
  } else {
    sectionDetails.push(`references: only ${refCount}`)
  }

  let points = 0
  let reasoning = ''

  if (completeSections >= 8) {
    points = 2.5
    reasoning = 'Excellent: All 8 sections complete with adequate content'
  } else if (completeSections >= 6) {
    points = 2.0
    reasoning = `Good: ${completeSections}/8 sections complete. Missing: ${sectionDetails.slice(0, 2).join(', ')}`
  } else if (completeSections >= 4) {
    points = 1.5
    reasoning = `Partial: ${completeSections}/8 sections. Missing: ${sectionDetails.slice(0, 3).join(', ')}`
  } else if (completeSections >= 2) {
    points = 1.0
    reasoning = `Incomplete: Only ${completeSections}/8 sections`
  } else {
    points = 0.5
    reasoning = 'Minimal: Report structure not established'
  }

  return {
    itemId: 'OC1',
    points,
    maxPoints: 2.5,
    passed: points >= 1.75,
    reasoning,
  }
}

function validateScientificRigor(response: any): ItemScore {
  const report = response?.report || response?.publication || response
  const validation = response?.validation || response?.qualityAssessment || {}

  // Check for scientific elements
  const methodology = report?.methodology || report?.methods || ''
  const results = report?.results || ''

  // Check for quantitative content
  const hasQuantitativeResults = /\d+(\.\d+)?%?/.test(results)
  const hasUnits = /(°C|K|MW|GW|kW|%|eV|nm|μm|kg|g|mol|J|kJ|MJ|Pa|bar|atm|Wh|Ah|V|A)/i.test(results)
  const hasStatistics = /(±|error|uncertainty|confidence|p\s*[<>=]|std|variance)/i.test(results)

  // Check methodology quality
  const hasExperimentalDetails = /material|equipment|procedure|protocol|sample/i.test(methodology)
  const hasControls = /control|baseline|reference|comparison/i.test(methodology)
  const hasReproducibility = /reproduc|repeat|replicate|n\s*=\s*\d/i.test(methodology)

  // Count scientific indicators
  const rigorIndicators = [
    hasQuantitativeResults,
    hasUnits,
    hasStatistics,
    hasExperimentalDetails,
    hasControls,
    hasReproducibility,
  ].filter(Boolean).length

  // Check for validation score
  const validationScore = validation?.score || validation?.overallScore || 0

  let points = 0
  let reasoning = ''

  if (rigorIndicators >= 5 && validationScore >= 7) {
    points = 2.5
    reasoning = `Excellent rigor: ${rigorIndicators}/6 indicators, quantitative data, statistics, controls`
  } else if (rigorIndicators >= 4 || validationScore >= 6) {
    points = 2.0
    reasoning = `Good rigor: ${rigorIndicators}/6 indicators met`
  } else if (rigorIndicators >= 2) {
    points = 1.5
    reasoning = `Basic rigor: ${rigorIndicators}/6 indicators, needs more detail`
  } else {
    points = 1.0
    reasoning = 'Limited rigor: Missing quantitative data and methodology detail'
  }

  return {
    itemId: 'OC2',
    points,
    maxPoints: 2.5,
    passed: points >= 1.75,
    reasoning,
  }
}

function validateClarity(response: any): ItemScore {
  const report = response?.report || response?.publication || response

  // Collect all text content
  const allText = [
    report?.abstract || '',
    report?.introduction || '',
    report?.methodology || '',
    report?.results || '',
    report?.discussion || '',
    report?.conclusion || '',
  ].join(' ')

  // Check text quality metrics
  const wordCount = allText.split(/\s+/).filter(w => w.length > 0).length
  const sentenceCount = allText.split(/[.!?]+/).filter(s => s.trim().length > 0).length
  const avgSentenceLength = sentenceCount > 0 ? wordCount / sentenceCount : 0

  // Check for clear structure
  const hasHeadings = report?.sections || (
    report?.introduction && report?.methodology && report?.results && report?.discussion
  )

  // Check for figures and tables
  const figures = report?.figures || []
  const tables = report?.tables || []
  const hasFigures = Array.isArray(figures) && figures.length > 0
  const hasTables = Array.isArray(tables) && tables.length > 0
  const hasVisuals = hasFigures || hasTables

  // Check for jargon balance
  const technicalTerms = allText.match(/\b[A-Z]{2,}\b/g) || [] // Acronyms
  const jargonDensity = wordCount > 0 ? technicalTerms.length / wordCount : 0
  const reasonableJargon = jargonDensity < 0.05 // Less than 5% acronyms

  let points = 0
  let reasoning = ''

  if (wordCount >= 1000 && avgSentenceLength >= 10 && avgSentenceLength <= 25 && hasVisuals && reasonableJargon) {
    points = 2.0
    reasoning = `Excellent clarity: ${wordCount} words, well-structured, includes visuals`
  } else if (wordCount >= 500 && avgSentenceLength >= 8 && avgSentenceLength <= 30) {
    points = 1.5
    reasoning = `Good clarity: ${wordCount} words, readable sentences`
  } else if (wordCount >= 200) {
    points = 1.0
    reasoning = `Basic clarity: ${wordCount} words, needs expansion`
  } else {
    points = 0.5
    reasoning = 'Limited clarity: Insufficient content or poor structure'
  }

  return {
    itemId: 'OC3',
    points,
    maxPoints: 2.0,
    passed: points >= 1.4,
    reasoning,
  }
}

function validateReproducibility(response: any): ItemScore {
  const report = response?.report || response?.publication || response

  const methodology = report?.methodology || report?.methods || ''
  const supplementary = report?.supplementaryMaterials || report?.supplementary || ''

  // Check for reproducibility elements
  const hasMaterials = /material|reagent|chemical|supplier|catalog/i.test(methodology)
  const hasEquipment = /equipment|instrument|model|manufacturer/i.test(methodology)
  const hasProcedure = /step|procedure|protocol|process/i.test(methodology)
  const hasParameters = /temperature|pressure|time|concentration|flow|rate/i.test(methodology)
  const hasDataAvailability = /data.{0,20}availab|repository|supplement|DOI/i.test(report?.dataAvailability || supplementary || methodology)
  const hasCodeAvailability = /code|github|script|software/i.test(supplementary || methodology)

  const reproducibilityIndicators = [
    hasMaterials,
    hasEquipment,
    hasProcedure,
    hasParameters,
    hasDataAvailability,
    hasCodeAvailability,
  ].filter(Boolean).length

  let points = 0
  let reasoning = ''

  if (reproducibilityIndicators >= 5) {
    points = 2.0
    reasoning = `Excellent reproducibility: ${reproducibilityIndicators}/6 elements (materials, equipment, procedure, parameters, data/code availability)`
  } else if (reproducibilityIndicators >= 3) {
    points = 1.5
    reasoning = `Good reproducibility: ${reproducibilityIndicators}/6 elements present`
  } else if (reproducibilityIndicators >= 2) {
    points = 1.0
    reasoning = `Basic reproducibility: ${reproducibilityIndicators}/6 elements, needs more detail`
  } else {
    points = 0.5
    reasoning = 'Limited reproducibility: Insufficient methodological detail'
  }

  return {
    itemId: 'OC4',
    points,
    maxPoints: 2.0,
    passed: points >= 1.4,
    reasoning,
  }
}

function validateConclusions(response: any): ItemScore {
  const report = response?.report || response?.publication || response

  const conclusion = report?.conclusion || report?.conclusions || ''
  const discussion = report?.discussion || ''
  const recommendations = report?.recommendations || response?.recommendations || []

  // Check conclusion quality
  const conclusionLength = conclusion.length
  const hasKeyFindings = /finding|result|show|demonstrat|confirm|reveal/i.test(conclusion)
  const hasImplications = /implication|significance|impact|potential|future/i.test(conclusion)
  const hasLimitations = /limitation|caveat|further.{0,20}research|future work/i.test(conclusion || discussion)

  // Check for actionable recommendations
  const hasRecommendations = Array.isArray(recommendations) && recommendations.length > 0
  const recommendationCount = hasRecommendations ? recommendations.length : 0

  // Evidence-based conclusions
  const hasEvidenceReference = /data|result|experiment|simulation|analysis/i.test(conclusion)

  let points = 0
  let reasoning = ''

  if (conclusionLength >= 200 && hasKeyFindings && hasImplications && hasLimitations && hasEvidenceReference) {
    points = 1.0
    reasoning = 'Excellent conclusions: Evidence-based findings, implications, limitations addressed'
  } else if (conclusionLength >= 100 && hasKeyFindings && (hasImplications || hasLimitations)) {
    points = 0.8
    reasoning = 'Good conclusions: Key findings with some context'
  } else if (conclusionLength >= 50 || hasKeyFindings) {
    points = 0.5
    reasoning = 'Basic conclusions: Present but needs expansion'
  } else {
    points = 0.2
    reasoning = 'Weak conclusions: Missing or unsupported by evidence'
  }

  return {
    itemId: 'OC5',
    points,
    maxPoints: 1.0,
    passed: points >= 0.7,
    reasoning,
  }
}

// ============================================================================
// Rubric Items
// ============================================================================

const outputConsolidatedItems: RubricItem[] = [
  {
    id: 'OC1',
    description: 'Report completeness: All 8 sections present and adequate',
    points: 2.5,
    category: 'completeness',
    passCondition: 'Report includes title, abstract, introduction, methodology, results, discussion, conclusion, references',
    partialConditions: [
      { condition: 'All 8 sections complete with adequate content', points: 2.5 },
      { condition: '6+ sections complete', points: 2.0 },
      { condition: '4+ sections complete', points: 1.5 },
      { condition: '2+ sections complete', points: 1.0 },
    ],
    automatedValidation: validateReportCompleteness,
  },
  {
    id: 'OC2',
    description: 'Scientific rigor: Quantitative data, statistics, methodology sound',
    points: 2.5,
    category: 'accuracy',
    passCondition: 'Results include quantitative data with units, statistics, and sound methodology with controls',
    partialConditions: [
      { condition: '5+ rigor indicators, quantitative, statistics, controls', points: 2.5 },
      { condition: '4+ indicators met', points: 2.0 },
      { condition: '2+ indicators met', points: 1.5 },
      { condition: 'Limited rigor', points: 1.0 },
    ],
    automatedValidation: validateScientificRigor,
  },
  {
    id: 'OC3',
    description: 'Clarity: 1000+ words, good structure, includes visuals',
    points: 2.0,
    category: 'completeness',
    passCondition: 'Report is well-written with clear structure, adequate length, and visual elements',
    partialConditions: [
      { condition: '1000+ words, structured, visuals', points: 2.0 },
      { condition: '500+ words, readable', points: 1.5 },
      { condition: '200+ words', points: 1.0 },
      { condition: 'Insufficient content', points: 0.5 },
    ],
    automatedValidation: validateClarity,
  },
  {
    id: 'OC4',
    description: 'Reproducibility: Materials, equipment, parameters, data availability',
    points: 2.0,
    category: 'reproducibility',
    passCondition: 'Methodology detailed enough for others to reproduce with data/code availability',
    partialConditions: [
      { condition: '5+ reproducibility elements', points: 2.0 },
      { condition: '3+ elements present', points: 1.5 },
      { condition: '2 elements present', points: 1.0 },
      { condition: 'Insufficient detail', points: 0.5 },
    ],
    automatedValidation: validateReproducibility,
  },
  {
    id: 'OC5',
    description: 'Conclusions: Evidence-based findings, implications, limitations',
    points: 1.0,
    category: 'evidence',
    passCondition: 'Conclusions supported by evidence with discussion of implications and limitations',
    partialConditions: [
      { condition: 'Evidence-based, implications, limitations', points: 1.0 },
      { condition: 'Key findings with some context', points: 0.8 },
      { condition: 'Basic conclusions present', points: 0.5 },
      { condition: 'Missing or unsupported', points: 0.2 },
    ],
    automatedValidation: validateConclusions,
  },
]

// ============================================================================
// Output Consolidated Rubric Export
// ============================================================================

export const OUTPUT_CONSOLIDATED_RUBRIC: Rubric = {
  id: 'output-consolidated-v1',
  name: 'Output Phase (Consolidated) Rubric',
  phase: 'output',
  domain: 'clean-energy',
  items: outputConsolidatedItems,
  totalPoints: 10,
  successThreshold: 7,
  maxIterations: 3, // Report generation is faster
  metadata: {
    version: '1.0.0',
    author: 'FrontierScience Discovery Engine',
    lastUpdated: new Date('2024-12-18'),
    sourceDataset: 'Consolidated rubric combining rubric_eval + publication',
  },
}

// Validate that points sum to 10
const totalPoints = outputConsolidatedItems.reduce((sum, item) => sum + item.points, 0)
if (Math.abs(totalPoints - 10) > 0.001) {
  console.warn(`Output consolidated rubric points sum to ${totalPoints}, expected 10`)
}
