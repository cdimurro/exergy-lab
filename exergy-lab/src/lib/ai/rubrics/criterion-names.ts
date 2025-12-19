/**
 * Criterion Name Mappings
 *
 * Maps internal criterion IDs (RC1, HC1, VC1, etc.) to human-readable names
 * for display in the UI.
 */

export interface CriterionInfo {
  id: string
  name: string
  shortName: string
  description: string
  maxPoints: number
  category: 'research' | 'hypothesis' | 'validation' | 'output'
}

/**
 * Research Phase Criteria (RC1-RC5)
 */
export const RESEARCH_CRITERIA: Record<string, CriterionInfo> = {
  RC1: {
    id: 'RC1',
    name: 'Source Quality',
    shortName: 'Sources',
    description: '20+ sources from 3+ types (papers, patents, databases)',
    maxPoints: 2.0,
    category: 'research',
  },
  RC2: {
    id: 'RC2',
    name: 'Synthesis Depth',
    shortName: 'Synthesis',
    description: 'Cross-domain patterns, 3+ technological gaps identified',
    maxPoints: 2.0,
    category: 'research',
  },
  RC3: {
    id: 'RC3',
    name: 'Candidate Selection',
    shortName: 'Candidates',
    description: '5+ screened candidates with feasibility rankings',
    maxPoints: 2.0,
    category: 'research',
  },
  RC4: {
    id: 'RC4',
    name: 'Research Completeness',
    shortName: 'Completeness',
    description: '40%+ recent sources (<3 years), 3+ quantitative findings',
    maxPoints: 2.0,
    category: 'research',
  },
  RC5: {
    id: 'RC5',
    name: 'Quality & Benchmarks',
    shortName: 'Benchmarks',
    description: 'SOTA benchmarks cited, methodology documented',
    maxPoints: 2.0,
    category: 'research',
  },
}

/**
 * Hypothesis Phase Criteria (HC1-HC5)
 */
export const HYPOTHESIS_CRITERIA: Record<string, CriterionInfo> = {
  HC1: {
    id: 'HC1',
    name: 'Novelty',
    shortName: 'Novelty',
    description: 'Beyond incremental, clear differentiation from prior art',
    maxPoints: 2.5,
    category: 'hypothesis',
  },
  HC2: {
    id: 'HC2',
    name: 'Testability',
    shortName: 'Testability',
    description: '3+ quantitative predictions with success criteria',
    maxPoints: 2.0,
    category: 'hypothesis',
  },
  HC3: {
    id: 'HC3',
    name: 'Feasibility',
    shortName: 'Feasibility',
    description: 'Practical with equipment, timeline, constraints',
    maxPoints: 2.0,
    category: 'hypothesis',
  },
  HC4: {
    id: 'HC4',
    name: 'Protocol Quality',
    shortName: 'Protocol',
    description: '5+ steps with materials, conditions, controls',
    maxPoints: 2.0,
    category: 'hypothesis',
  },
  HC5: {
    id: 'HC5',
    name: 'Safety Requirements',
    shortName: 'Safety',
    description: 'Comprehensive requirements (hazards, PPE, emergency, waste)',
    maxPoints: 1.5,
    category: 'hypothesis',
  },
}

/**
 * Validation Phase Criteria (VC1-VC5)
 */
export const VALIDATION_CRITERIA: Record<string, CriterionInfo> = {
  VC1: {
    id: 'VC1',
    name: 'Physics Validation',
    shortName: 'Physics',
    description: 'Thermodynamic laws compliance, energy balance verified',
    maxPoints: 2.5,
    category: 'validation',
  },
  VC2: {
    id: 'VC2',
    name: 'Economic Feasibility',
    shortName: 'Economics',
    description: 'NPV, IRR, LCOE calculations with realistic assumptions',
    maxPoints: 2.0,
    category: 'validation',
  },
  VC3: {
    id: 'VC3',
    name: 'Patent Landscape',
    shortName: 'Patents',
    description: 'Freedom-to-operate analysis, prior art assessment',
    maxPoints: 1.5,
    category: 'validation',
  },
  VC4: {
    id: 'VC4',
    name: 'Simulation Quality',
    shortName: 'Simulation',
    description: 'Validated models with uncertainty quantification',
    maxPoints: 2.0,
    category: 'validation',
  },
  VC5: {
    id: 'VC5',
    name: 'Experimental Design',
    shortName: 'Experiment',
    description: 'Rigorous design with controls and statistics',
    maxPoints: 2.0,
    category: 'validation',
  },
}

/**
 * Output Phase Criteria (OC1-OC5)
 */
export const OUTPUT_CRITERIA: Record<string, CriterionInfo> = {
  OC1: {
    id: 'OC1',
    name: 'Abstract Quality',
    shortName: 'Abstract',
    description: 'Clear, concise summary with key findings',
    maxPoints: 2.0,
    category: 'output',
  },
  OC2: {
    id: 'OC2',
    name: 'Methods Rigor',
    shortName: 'Methods',
    description: 'Reproducible methodology with sufficient detail',
    maxPoints: 2.0,
    category: 'output',
  },
  OC3: {
    id: 'OC3',
    name: 'Results Presentation',
    shortName: 'Results',
    description: 'Clear visualization and statistical analysis',
    maxPoints: 2.0,
    category: 'output',
  },
  OC4: {
    id: 'OC4',
    name: 'Discussion Depth',
    shortName: 'Discussion',
    description: 'Implications, limitations, future directions',
    maxPoints: 2.0,
    category: 'output',
  },
  OC5: {
    id: 'OC5',
    name: 'Citation Quality',
    shortName: 'Citations',
    description: 'Appropriate, relevant, and properly formatted',
    maxPoints: 2.0,
    category: 'output',
  },
}

/**
 * Combined mapping of all criteria
 */
export const ALL_CRITERIA: Record<string, CriterionInfo> = {
  ...RESEARCH_CRITERIA,
  ...HYPOTHESIS_CRITERIA,
  ...VALIDATION_CRITERIA,
  ...OUTPUT_CRITERIA,
}

/**
 * Get criterion info by ID
 */
export function getCriterionInfo(criterionId: string): CriterionInfo | null {
  return ALL_CRITERIA[criterionId] || null
}

/**
 * Get criterion name by ID (returns ID if not found)
 */
export function getCriterionName(criterionId: string): string {
  return ALL_CRITERIA[criterionId]?.name || criterionId
}

/**
 * Get criterion short name by ID (returns ID if not found)
 */
export function getCriterionShortName(criterionId: string): string {
  return ALL_CRITERIA[criterionId]?.shortName || criterionId
}

/**
 * Get criterion description by ID
 */
export function getCriterionDescription(criterionId: string): string {
  return ALL_CRITERIA[criterionId]?.description || ''
}

/**
 * Get category label for display
 */
export function getCategoryLabel(category: CriterionInfo['category']): string {
  const labels: Record<CriterionInfo['category'], string> = {
    research: 'Research Phase',
    hypothesis: 'Hypothesis Phase',
    validation: 'Validation Phase',
    output: 'Output Phase',
  }
  return labels[category]
}

/**
 * Get all criteria for a specific phase
 */
export function getCriteriaForPhase(phase: string): CriterionInfo[] {
  const phaseMapping: Record<string, Record<string, CriterionInfo>> = {
    research: RESEARCH_CRITERIA,
    hypothesis: HYPOTHESIS_CRITERIA,
    validation: VALIDATION_CRITERIA,
    output: OUTPUT_CRITERIA,
  }

  const criteria = phaseMapping[phase.toLowerCase()]
  return criteria ? Object.values(criteria) : []
}

export default ALL_CRITERIA
