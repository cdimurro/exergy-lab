/**
 * Research Phase Consolidated Rubric
 *
 * Combines: research + synthesis + screening
 * Evaluates multi-source research, knowledge synthesis, and candidate screening.
 * Total: 10 points, Pass threshold: 7
 */

import type { Rubric, RubricItem, ItemScore } from '../types'

// ============================================================================
// Automated Validation Functions
// ============================================================================

function validateSourceQuality(response: any): ItemScore {
  const sources = response?.sources || response?.papers || []
  const count = Array.isArray(sources) ? sources.length : 0

  // Check source types for diversity
  const types = new Set<string>()
  for (const source of sources) {
    const type = source.type || source.sourceType || 'unknown'
    types.add(type.toLowerCase())
  }

  let points = 0
  let reasoning = ''

  // Combined scoring: count + diversity
  if (count >= 30 && types.size >= 3) {
    points = 2.0
    reasoning = `Excellent: ${count} sources from ${types.size} types (academic, patents, datasets, materials)`
  } else if (count >= 20 && types.size >= 2) {
    points = 1.5
    reasoning = `Good: ${count} sources from ${types.size} types`
  } else if (count >= 10) {
    points = 1.0
    reasoning = `Acceptable: ${count} sources found`
  } else if (count >= 5) {
    points = 0.5
    reasoning = `Limited: Only ${count} sources found`
  } else {
    points = 0
    reasoning = `Insufficient: ${count} sources is inadequate for research phase`
  }

  return {
    itemId: 'RC1',
    points,
    maxPoints: 2.0,
    passed: points >= 1.4,
    reasoning,
  }
}

function validateSynthesisDepth(response: any): ItemScore {
  const insights = response?.crossDomainInsights || response?.synthesis?.insights || []
  const gaps = response?.technologicalGaps || response?.gaps || []
  const patterns = response?.patterns || response?.synthesis?.patterns || []

  const insightCount = Array.isArray(insights) ? insights.length : 0
  const gapCount = Array.isArray(gaps) ? gaps.length : 0
  const patternCount = Array.isArray(patterns) ? patterns.length : 0
  const total = insightCount + gapCount + patternCount

  // Check quality of insights
  let validInsights = 0
  for (const insight of (insights || [])) {
    const domains = insight.domains || []
    const description = insight.insight || insight.description || ''
    if (domains.length >= 2 && description.length >= 30) {
      validInsights++
    }
  }

  let points = 0
  let reasoning = ''

  if (total >= 8 && validInsights >= 2 && gapCount >= 3) {
    points = 2.0
    reasoning = `Excellent synthesis: ${insightCount} insights, ${gapCount} gaps, ${patternCount} patterns`
  } else if (total >= 5 && gapCount >= 2) {
    points = 1.5
    reasoning = `Good synthesis: ${gapCount} gaps identified, ${validInsights} cross-domain insights`
  } else if (total >= 3) {
    points = 1.0
    reasoning = `Basic synthesis: ${total} total findings`
  } else if (total >= 1) {
    points = 0.5
    reasoning = `Limited synthesis: Only ${total} findings`
  } else {
    points = 0
    reasoning = 'No synthesis outputs found (gaps, insights, patterns)'
  }

  return {
    itemId: 'RC2',
    points,
    maxPoints: 2.0,
    passed: points >= 1.4,
    reasoning,
  }
}

function validateCandidateSelection(response: any): ItemScore {
  const candidates = response?.candidates || response?.screening?.candidates || []
  const materials = response?.materialsData || response?.materials || []
  const count = (Array.isArray(candidates) ? candidates.length : 0) +
    (Array.isArray(materials) ? materials.length : 0)

  // Check quality: candidates should have properties/rankings
  let rankedCount = 0
  for (const c of [...(candidates || []), ...(materials || [])]) {
    if (c.score !== undefined || c.rank !== undefined || c.feasibility !== undefined) {
      rankedCount++
    }
  }

  let points = 0
  let reasoning = ''

  if (count >= 10 && rankedCount >= 5) {
    points = 2.0
    reasoning = `Excellent: ${count} candidates screened, ${rankedCount} ranked by feasibility`
  } else if (count >= 5 && rankedCount >= 2) {
    points = 1.5
    reasoning = `Good: ${count} candidates with ${rankedCount} ranked`
  } else if (count >= 3) {
    points = 1.0
    reasoning = `Acceptable: ${count} candidates identified`
  } else if (count >= 1) {
    points = 0.5
    reasoning = `Limited: Only ${count} candidates`
  } else {
    points = 0
    reasoning = 'No candidates or materials screened'
  }

  return {
    itemId: 'RC3',
    points,
    maxPoints: 2.0,
    passed: points >= 1.4,
    reasoning,
  }
}

function validateCompleteness(response: any): ItemScore {
  const sources = response?.sources || []
  const currentYear = new Date().getFullYear()

  if (!Array.isArray(sources) || sources.length === 0) {
    return {
      itemId: 'RC4',
      points: 0,
      maxPoints: 2.0,
      passed: false,
      reasoning: 'No sources to evaluate for completeness',
    }
  }

  // Check recency
  let recentCount = 0
  for (const source of sources) {
    const dateStr = source.publishedDate || source.year || source.date || ''
    const yearMatch = String(dateStr).match(/\d{4}/)
    if (yearMatch) {
      const year = parseInt(yearMatch[0])
      if (year >= currentYear - 3) {
        recentCount++
      }
    }
  }

  // Check for key findings with quantitative data
  const findings = response?.keyFindings || response?.findings || []
  let quantitativeCount = 0
  for (const finding of findings) {
    const hasNumber = /\d+\.?\d*\s*(°C|K|MW|GW|kW|%|eV|nm|μm|kg|g|mol|J|kJ|MJ|Pa|bar|atm)/i.test(
      typeof finding === 'string' ? finding : (finding.finding || finding.description || '')
    )
    if (hasNumber) quantitativeCount++
  }

  const recentRatio = sources.length > 0 ? recentCount / sources.length : 0
  const hasQuantitative = quantitativeCount >= 3

  let points = 0
  let reasoning = ''

  if (recentRatio >= 0.4 && hasQuantitative) {
    points = 2.0
    reasoning = `Excellent: ${Math.round(recentRatio * 100)}% recent sources, ${quantitativeCount} quantitative findings`
  } else if (recentRatio >= 0.3 || hasQuantitative) {
    points = 1.5
    reasoning = `Good: ${Math.round(recentRatio * 100)}% recent, ${quantitativeCount} quantitative`
  } else if (recentRatio >= 0.2) {
    points = 1.0
    reasoning = `Acceptable: ${Math.round(recentRatio * 100)}% recent sources`
  } else {
    points = 0.5
    reasoning = `Limited recency: Only ${Math.round(recentRatio * 100)}% from last 3 years`
  }

  return {
    itemId: 'RC4',
    points,
    maxPoints: 2.0,
    passed: points >= 1.4,
    reasoning,
  }
}

function validateRecencyAndQuality(response: any): ItemScore {
  const stateOfArt = response?.stateOfTheArt || response?.benchmarks || []
  const methodology = response?.methodology || response?.searchMethodology || ''

  // Check state of the art
  const hasSOTA = Array.isArray(stateOfArt) && stateOfArt.length >= 2
  const hasMethodology = typeof methodology === 'string' && methodology.length >= 50

  let points = 0
  let reasoning = ''

  if (hasSOTA && hasMethodology) {
    points = 2.0
    reasoning = `Excellent: ${stateOfArt.length} SOTA benchmarks cited, methodology documented`
  } else if (hasSOTA) {
    points = 1.5
    reasoning = `Good: ${stateOfArt.length} SOTA benchmarks cited`
  } else if (hasMethodology) {
    points = 1.0
    reasoning = 'Research methodology documented but no SOTA comparison'
  } else {
    points = 0.5
    reasoning = 'Missing SOTA benchmarks and methodology documentation'
  }

  return {
    itemId: 'RC5',
    points,
    maxPoints: 2.0,
    passed: points >= 1.4,
    reasoning,
  }
}

// ============================================================================
// Rubric Items
// ============================================================================

const researchConsolidatedItems: RubricItem[] = [
  {
    id: 'RC1',
    description: 'Source quality: 20+ sources from 3+ types (papers, patents, datasets, materials)',
    points: 2.0,
    category: 'completeness',
    passCondition: 'At least 20 relevant sources from multiple database types including academic papers, patents, and materials data',
    partialConditions: [
      { condition: '30+ sources from 3+ types', points: 2.0 },
      { condition: '20+ sources from 2+ types', points: 1.5 },
      { condition: '10+ sources', points: 1.0 },
      { condition: '5-9 sources', points: 0.5 },
    ],
    automatedValidation: validateSourceQuality,
  },
  {
    id: 'RC2',
    description: 'Synthesis depth: Cross-domain patterns, 3+ gaps identified',
    points: 2.0,
    category: 'novelty',
    passCondition: 'Knowledge synthesis includes cross-domain insights with 2+ domains each, and identifies at least 3 technological gaps',
    partialConditions: [
      { condition: '8+ synthesis items, 2+ cross-domain, 3+ gaps', points: 2.0 },
      { condition: '5+ items, 2+ gaps', points: 1.5 },
      { condition: '3+ items', points: 1.0 },
      { condition: '1-2 items', points: 0.5 },
    ],
    automatedValidation: validateSynthesisDepth,
  },
  {
    id: 'RC3',
    description: 'Candidate selection: 5+ screened candidates with feasibility rankings',
    points: 2.0,
    category: 'methodology',
    passCondition: 'At least 5 material/technology candidates screened with feasibility scores or rankings',
    partialConditions: [
      { condition: '10+ candidates, 5+ ranked', points: 2.0 },
      { condition: '5+ candidates, 2+ ranked', points: 1.5 },
      { condition: '3+ candidates', points: 1.0 },
      { condition: '1-2 candidates', points: 0.5 },
    ],
    automatedValidation: validateCandidateSelection,
  },
  {
    id: 'RC4',
    description: 'Completeness: 40%+ recent sources (< 3 years), 3+ quantitative findings',
    points: 2.0,
    category: 'completeness',
    passCondition: 'Research includes recent literature and extracts quantitative metrics with units',
    partialConditions: [
      { condition: '40%+ recent, 3+ quantitative', points: 2.0 },
      { condition: '30%+ recent or 3+ quantitative', points: 1.5 },
      { condition: '20%+ recent', points: 1.0 },
      { condition: '<20% recent', points: 0.5 },
    ],
    automatedValidation: validateCompleteness,
  },
  {
    id: 'RC5',
    description: 'Quality: SOTA benchmarks cited, methodology documented',
    points: 2.0,
    category: 'accuracy',
    passCondition: 'State-of-the-art performance metrics cited and research methodology clearly documented',
    partialConditions: [
      { condition: '2+ SOTA benchmarks + methodology', points: 2.0 },
      { condition: '2+ SOTA benchmarks', points: 1.5 },
      { condition: 'Methodology only', points: 1.0 },
      { condition: 'Neither', points: 0.5 },
    ],
    automatedValidation: validateRecencyAndQuality,
  },
]

// ============================================================================
// Research Consolidated Rubric Export
// ============================================================================

export const RESEARCH_CONSOLIDATED_RUBRIC: Rubric = {
  id: 'research-consolidated-v1',
  name: 'Research Phase (Consolidated) Rubric',
  phase: 'research',
  domain: 'clean-energy',
  items: researchConsolidatedItems,
  totalPoints: 10,
  successThreshold: 7,
  maxIterations: 4, // Increased from 3
  metadata: {
    version: '1.0.0',
    author: 'FrontierScience Discovery Engine',
    lastUpdated: new Date('2024-12-18'),
    sourceDataset: 'Consolidated rubric combining research + synthesis + screening',
  },
}

// Validate that points sum to 10
const totalPoints = researchConsolidatedItems.reduce((sum, item) => sum + item.points, 0)
if (Math.abs(totalPoints - 10) > 0.001) {
  console.warn(`Research consolidated rubric points sum to ${totalPoints}, expected 10`)
}
