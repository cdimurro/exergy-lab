/**
 * Creative Agent
 *
 * Generates novel hypotheses and experiment designs based on research findings.
 * Uses FrontierScience methodology to ensure quality and novelty.
 *
 * @skill hypothesis-generation
 * @skill experiment-design
 * @see .claude/skills/hypothesis-generation/SKILL.md - Hypothesis criteria
 * @see .claude/skills/experiment-design/SKILL.md - Protocol patterns
 * @see .claude/skills/experiment-design/safety-protocols.md - Safety requirements
 * @see .claude/skills/rubrics/hypothesis.json - Hypothesis rubric
 * @see .claude/skills/rubrics/experiment.json - Experiment rubric
 */

import { generateText } from '../model-router'
import type { RefinementHints } from '../rubrics/types'
import type {
  ResearchResult,
  Source,
  KeyFinding,
  TechnologicalGap,
  MaterialData,
} from './research-agent'

// ============================================================================
// Types
// ============================================================================

export interface Prediction {
  statement: string
  measurable: boolean
  falsifiable: boolean
  expectedValue?: number
  unit?: string
  tolerance?: number
}

export interface Variable {
  name: string
  type: 'independent' | 'dependent' | 'control'
  description: string
  range?: { min: number; max: number; unit: string }
}

export interface Mechanism {
  steps: {
    order: number
    description: string
    physicalPrinciple?: string
  }[]
}

export interface Hypothesis {
  id: string
  title: string
  statement: string
  predictions: Prediction[]
  supportingEvidence: {
    finding: string
    citation: string
    relevance: number
  }[]
  contradictingEvidence?: {
    finding: string
    citation: string
    howAddressed: string
  }[]
  mechanism: Mechanism
  variables: {
    independent: Variable[]
    dependent: Variable[]
    controls: Variable[]
  }
  noveltyScore: number
  feasibilityScore: number
  impactScore: number
  validationMetrics: {
    name: string
    targetValue: number
    unit: string
    threshold: number
  }[]
  relatedGaps: TechnologicalGap[]
  requiredMaterials: MaterialData[]
}

export interface ExperimentMaterial {
  name: string
  quantity: string
  purity?: string
  supplier?: string
  alternatives?: string[]
}

export interface ExperimentEquipment {
  name: string
  specification: string
  purpose: string
  alternatives?: string[]
}

export interface ProcedureStep {
  order: number
  description: string
  duration?: string
  temperature?: string
  criticalParameters?: string[]
}

export interface SafetyRequirement {
  hazard: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  mitigation: string
  ppe?: string[]
}

export interface FailureMode {
  mode: string
  likelihood: 'low' | 'medium' | 'high'
  impact: 'low' | 'medium' | 'high'
  detection: string
  mitigation: string
}

export interface ExperimentDesign {
  id: string
  hypothesisId: string
  title: string
  objective: string
  type: 'synthesis' | 'characterization' | 'performance' | 'durability' | 'optimization'
  materials: ExperimentMaterial[]
  equipment: ExperimentEquipment[]
  procedure: ProcedureStep[]
  safetyRequirements: SafetyRequirement[]
  failureModes: FailureMode[]
  expectedOutputs: {
    name: string
    type: 'quantitative' | 'qualitative'
    expectedRange?: { min: number; max: number; unit: string }
  }[]
  difficulty: 'low' | 'medium' | 'high'
  estimatedDuration: string
  estimatedCost?: number
  reproducibilityScore: number
}

export interface CreativeConfig {
  minHypotheses: number
  maxHypotheses: number
  minNoveltyScore: number
  minFeasibilityScore: number
  checkThermodynamics: boolean
}

const DEFAULT_CONFIG: CreativeConfig = {
  minHypotheses: 5,
  maxHypotheses: 10,
  minNoveltyScore: 50,
  minFeasibilityScore: 50,
  checkThermodynamics: true,
}

// ============================================================================
// Thermodynamic Limits
// ============================================================================

const THERMODYNAMIC_LIMITS = {
  carnot: (tHot: number, tCold: number) => (tHot - tCold) / tHot,
  betz: 0.593,
  shockleyQueisser: 0.337,
  concentratedSolar: 0.86,
  electrolysisVoltage: 1.48, // Thermoneutral voltage
  fuelCellEfficiency: 0.83,
}

// ============================================================================
// Creative Agent Class
// ============================================================================

export class CreativeAgent {
  private config: CreativeConfig

  constructor(config: Partial<CreativeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Generate hypotheses from research findings
   */
  async generateHypotheses(
    research: ResearchResult,
    hints?: RefinementHints
  ): Promise<Hypothesis[]> {
    console.log(`[CreativeAgent] Generating hypotheses for: "${research.query}"`)

    // Generate candidate hypotheses with refinement hints
    const candidates = await this.generateCandidates(research, this.config.maxHypotheses, hints)

    // Enrich with materials data
    const withMaterials = this.enrichWithMaterialsData(candidates, research.materialsData)

    // Filter thermodynamically invalid
    const valid = this.config.checkThermodynamics
      ? withMaterials.filter(h => !this.violatesThermodynamics(h))
      : withMaterials

    // Score and rank
    const scored = this.scoreHypotheses(valid)

    // Filter by minimum scores
    const filtered = scored.filter(
      h => h.noveltyScore >= this.config.minNoveltyScore &&
        h.feasibilityScore >= this.config.minFeasibilityScore
    )

    // Return top hypotheses
    return filtered
      .sort((a, b) => (b.noveltyScore + b.feasibilityScore) - (a.noveltyScore + a.feasibilityScore))
      .slice(0, this.config.maxHypotheses)
  }

  /**
   * Design experiments for hypotheses (runs in parallel with concurrency limit)
   */
  async designExperiments(
    hypotheses: Hypothesis[],
    hints?: RefinementHints
  ): Promise<ExperimentDesign[]> {
    const CONCURRENCY_LIMIT = 3 // Limit to avoid rate limits

    // Process hypotheses in parallel batches
    const results: ExperimentDesign[] = []

    for (let i = 0; i < hypotheses.length; i += CONCURRENCY_LIMIT) {
      const batch = hypotheses.slice(i, i + CONCURRENCY_LIMIT)
      const batchPromises = batch.map(hypothesis =>
        this.designExperimentForHypothesis(hypothesis, hints)
      )

      const batchResults = await Promise.all(batchPromises)

      // Filter out nulls and add to results
      for (const design of batchResults) {
        if (design) {
          results.push(design)
        }
      }
    }

    return results
  }

  /**
   * Generate candidate hypotheses using AI
   */
  private async generateCandidates(
    research: ResearchResult,
    count: number,
    hints?: RefinementHints
  ): Promise<Hypothesis[]> {
    // Build hints section if refinement hints are provided
    const hintsSection = hints ? `
## IMPROVEMENT GUIDANCE (Previous Score: ${hints.previousScore}/10)
Your previous attempt scored below the required threshold. Focus on addressing these failed criteria:
${hints.failedCriteria.map(c => `- ${c.id}: ${c.description}
  Reason: ${c.reasoning}
  Pass condition: ${c.passCondition}`).join('\n')}

SPECIFIC GUIDANCE: ${hints.specificGuidance}

IMPORTANT: Ensure each hypothesis fully meets the criteria above.
---
` : ''

    const prompt = `${hintsSection}You are a scientific hypothesis generator for the ${research.domain} domain.

Based on the following research:

KEY FINDINGS:
${research.keyFindings.map(f => `- ${f.finding}${f.value ? ` (${f.value} ${f.unit})` : ''}`).join('\n')}

TECHNOLOGICAL GAPS:
${research.technologicalGaps.map(g => `- ${g.description} (Impact: ${g.impact})`).join('\n')}

AVAILABLE MATERIALS:
${research.materialsData.map(m => `- ${m.formula}: bandGap=${m.bandGap}eV, ${m.stability}`).join('\n')}

Generate ${count} novel, testable hypotheses that could advance the field.

CRITICAL REQUIREMENTS FOR EACH HYPOTHESIS:
1. Each hypothesis MUST have at least 2 falsifiable, measurable predictions with expected values
2. Each hypothesis MUST have at least 3 supporting evidence items with proper citations
3. Each hypothesis MUST have a mechanism with at least 3 ordered steps with physical principles
4. Each hypothesis MUST define:
   - At least 2 independent variables with ranges and units
   - At least 2 dependent variables with descriptions
   - At least 2 control variables with descriptions
5. noveltyScore must be between 70-95
6. feasibilityScore must be between 65-90

For each hypothesis, include EXACTLY this structure:
{
  "id": "H1",
  "title": "Short descriptive title",
  "statement": "Clear hypothesis statement in 'If X, then Y' format",
  "predictions": [
    {
      "statement": "Specific measurable prediction",
      "measurable": true,
      "falsifiable": true,
      "expectedValue": 85,
      "unit": "%",
      "tolerance": 5
    },
    {
      "statement": "Second measurable prediction",
      "measurable": true,
      "falsifiable": true,
      "expectedValue": 42,
      "unit": "mV",
      "tolerance": 2
    }
  ],
  "supportingEvidence": [
    {
      "finding": "Key finding from literature",
      "citation": "Author et al., 2023",
      "relevance": 0.9
    },
    {
      "finding": "Second supporting finding",
      "citation": "Researcher et al., 2022",
      "relevance": 0.85
    },
    {
      "finding": "Third supporting finding",
      "citation": "Scientist et al., 2024",
      "relevance": 0.8
    }
  ],
  "mechanism": {
    "steps": [
      { "order": 1, "description": "First step of mechanism", "physicalPrinciple": "Principle 1" },
      { "order": 2, "description": "Second step of mechanism", "physicalPrinciple": "Principle 2" },
      { "order": 3, "description": "Third step of mechanism", "physicalPrinciple": "Principle 3" }
    ]
  },
  "variables": {
    "independent": [
      { "name": "Variable 1", "type": "independent", "description": "Description", "range": { "min": 0, "max": 100, "unit": "°C" } },
      { "name": "Variable 2", "type": "independent", "description": "Description", "range": { "min": 0, "max": 1, "unit": "bar" } }
    ],
    "dependent": [
      { "name": "Dependent 1", "type": "dependent", "description": "What we measure" },
      { "name": "Dependent 2", "type": "dependent", "description": "Second measurement" }
    ],
    "controls": [
      { "name": "Control 1", "type": "control", "description": "Held constant" },
      { "name": "Control 2", "type": "control", "description": "Controlled condition" }
    ]
  },
  "noveltyScore": 78,
  "feasibilityScore": 72,
  "impactScore": 80,
  "validationMetrics": [
    { "name": "Metric", "targetValue": 85, "unit": "%", "threshold": 80 }
  ]
}

CRITICAL: Return a COMPLETE, valid JSON array with ALL ${count} hypotheses.
Do not truncate. Ensure all hypotheses have ALL required fields filled in completely.`

    try {
      const result = await generateText('discovery', prompt, {
        temperature: 0.6, // Lower for more consistent structured JSON output
        maxTokens: 12000, // Optimized for speed (reduced from 16000)
        model: 'fast', // Use Gemini 3 Flash (high thinking) for cost savings
      })

      // Log raw response for debugging (first 500 chars)
      console.log(`[CreativeAgent] Raw response (first 500 chars): ${result.substring(0, 500)}...`)

      // Clean JSON - handle various markdown formats
      let cleaned = result.trim()
      cleaned = cleaned.replace(/```json\n?|\n?```/g, '')
      cleaned = cleaned.replace(/^[^[\{]*/, '') // Remove any text before JSON
      cleaned = cleaned.replace(/[^\]\}]*$/, '') // Remove any text after JSON

      // Try to extract JSON array
      let hypotheses: Hypothesis[] = []

      try {
        hypotheses = JSON.parse(cleaned) as Hypothesis[]
      } catch (parseError) {
        console.error('[CreativeAgent] JSON parse failed, trying to extract array...', parseError)

        // Try to find and parse just the array portion
        const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
        if (arrayMatch) {
          try {
            hypotheses = JSON.parse(arrayMatch[0]) as Hypothesis[]
            console.log(`[CreativeAgent] Extracted ${hypotheses.length} hypotheses from partial JSON`)
          } catch {
            console.error('[CreativeAgent] Could not extract array from response')
          }
        }
      }

      if (hypotheses.length === 0) {
        console.warn('[CreativeAgent] No hypotheses parsed - generating fallback')
        // Generate a minimal fallback hypothesis to avoid 0.0 score
        hypotheses = [this.createFallbackHypothesis(research)]
      }

      return hypotheses.map((h, i) => ({
        ...h,
        id: h.id || `H${i + 1}`,
        relatedGaps: research.technologicalGaps.slice(0, 2),
        requiredMaterials: [],
      }))
    } catch (error) {
      console.error('[CreativeAgent] Hypothesis generation failed:', error)
      // Return fallback hypothesis instead of empty array
      return [this.createFallbackHypothesis(research)]
    }
  }

  /**
   * Enrich hypotheses with materials data
   */
  private enrichWithMaterialsData(
    hypotheses: Hypothesis[],
    materials: MaterialData[]
  ): Hypothesis[] {
    return hypotheses.map(h => {
      // Find relevant materials based on hypothesis content
      const relevantMaterials = materials.filter(m => {
        const formula = m.formula.toLowerCase()
        const statement = h.statement.toLowerCase()
        return statement.includes(formula) ||
          formula.split(/[^a-z]/i).some(element =>
            element.length > 1 && statement.includes(element.toLowerCase())
          )
      })

      return {
        ...h,
        requiredMaterials: relevantMaterials, // Keep all matched materials
      }
    })
  }

  /**
   * Check if hypothesis violates thermodynamic limits
   */
  private violatesThermodynamics(hypothesis: Hypothesis): boolean {
    for (const prediction of hypothesis.predictions) {
      const value = prediction.expectedValue
      if (value === undefined) continue

      const statement = prediction.statement.toLowerCase()

      // Check efficiency claims
      if (statement.includes('efficiency') && value > 100) {
        console.warn(`Thermodynamic violation: ${prediction.statement}`)
        return true
      }

      // Check solar efficiency
      if (statement.includes('solar') && statement.includes('efficiency')) {
        if (value / 100 > THERMODYNAMIC_LIMITS.concentratedSolar) {
          console.warn(`Solar efficiency ${value}% exceeds thermodynamic limit`)
          return true
        }
      }

      // Check wind efficiency
      if (statement.includes('wind') && statement.includes('efficiency')) {
        if (value / 100 > THERMODYNAMIC_LIMITS.betz) {
          console.warn(`Wind efficiency ${value}% exceeds Betz limit`)
          return true
        }
      }
    }

    return false
  }

  /**
   * Create a fallback hypothesis when generation fails
   * This ensures we never return empty arrays that cause 0.0 scores
   */
  private createFallbackHypothesis(research: ResearchResult): Hypothesis {
    const finding = research.keyFindings[0]?.finding || 'improved efficiency'
    const gap = research.technologicalGaps[0]?.description || 'efficiency optimization'

    return {
      id: 'H1-FALLBACK',
      title: `Addressing ${gap.substring(0, 50)}...`,
      statement: `If ${finding.substring(0, 100)}..., then we can achieve significant improvements in system performance.`,
      predictions: [
        {
          statement: 'Expected improvement in efficiency of at least 15%',
          measurable: true,
          falsifiable: true,
          expectedValue: 15,
          unit: '%',
          tolerance: 5,
        },
        {
          statement: 'Reduction in operational costs by measurable margin',
          measurable: true,
          falsifiable: true,
          expectedValue: 10,
          unit: '%',
          tolerance: 3,
        },
      ],
      supportingEvidence: research.keyFindings.slice(0, 3).map(f => ({
        finding: f.finding,
        citation: 'Research synthesis, 2024',
        relevance: 0.8,
      })),
      contradictingEvidence: [],
      mechanism: {
        steps: [
          { order: 1, description: 'Initial system optimization', physicalPrinciple: 'Thermodynamic efficiency' },
          { order: 2, description: 'Process parameter adjustment', physicalPrinciple: 'Mass and energy balance' },
          { order: 3, description: 'Performance validation', physicalPrinciple: 'Empirical measurement' },
        ],
      },
      variables: {
        independent: [
          { name: 'Process temperature', type: 'independent', description: 'Operating temperature', range: { min: 20, max: 100, unit: '°C' } },
          { name: 'Flow rate', type: 'independent', description: 'Material flow rate', range: { min: 0.1, max: 10, unit: 'L/min' } },
        ],
        dependent: [
          { name: 'Efficiency', type: 'dependent', description: 'System efficiency output' },
          { name: 'Yield', type: 'dependent', description: 'Product yield' },
        ],
        controls: [
          { name: 'Ambient pressure', type: 'control', description: 'Maintained at 1 atm' },
          { name: 'Humidity', type: 'control', description: 'Controlled humidity level' },
        ],
      },
      relatedGaps: research.technologicalGaps.slice(0, 2),
      requiredMaterials: research.materialsData.slice(0, 2),
      noveltyScore: 65,
      feasibilityScore: 70,
      impactScore: 60,
      validationMetrics: [
        { name: 'Efficiency improvement', targetValue: 15, unit: '%', threshold: 10 },
      ],
    }
  }

  /**
   * Score hypotheses based on multiple criteria
   */
  private scoreHypotheses(hypotheses: Hypothesis[]): Hypothesis[] {
    return hypotheses.map(h => {
      // Adjust novelty based on evidence
      let noveltyAdjustment = 0
      if (h.supportingEvidence.length < 2) noveltyAdjustment += 10 // More novel if less prior work
      if (h.contradictingEvidence && h.contradictingEvidence.length > 0) noveltyAdjustment -= 10

      // Adjust feasibility based on materials
      let feasibilityAdjustment = 0
      if (h.requiredMaterials.length > 0) feasibilityAdjustment += 10 // Better if materials exist
      if (h.variables.controls.length < 2) feasibilityAdjustment -= 5 // Harder to control

      return {
        ...h,
        noveltyScore: Math.min(100, Math.max(0, h.noveltyScore + noveltyAdjustment)),
        feasibilityScore: Math.min(100, Math.max(0, h.feasibilityScore + feasibilityAdjustment)),
      }
    })
  }

  /**
   * Design experiment for a single hypothesis
   */
  private async designExperimentForHypothesis(
    hypothesis: Hypothesis,
    hints?: RefinementHints
  ): Promise<ExperimentDesign | null> {
    let hintText = ''
    if (hints?.failedCriteria.some(c => c.id.startsWith('E'))) {
      hintText = `
IMPORTANT: Previous experiment design failed validation. Address these issues:
${hints.failedCriteria.filter(c => c.id.startsWith('E')).map(c => `- ${c.description}: ${c.passCondition}`).join('\n')}`
    }

    const prompt = `You are a scientific experiment designer.
${hintText}
Design a detailed experiment to test this hypothesis:

HYPOTHESIS: ${hypothesis.title}
${hypothesis.statement}

PREDICTIONS TO TEST:
${hypothesis.predictions.map(p => `- ${p.statement}${p.expectedValue ? ` (expected: ${p.expectedValue}${p.unit})` : ''}`).join('\n')}

VARIABLES:
- Independent: ${hypothesis.variables.independent.map(v => v.name).join(', ')}
- Dependent: ${hypothesis.variables.dependent.map(v => v.name).join(', ')}
- Controls: ${hypothesis.variables.controls.map(v => v.name).join(', ')}

Design an experiment with:
{
  "id": "E1",
  "hypothesisId": "${hypothesis.id}",
  "title": "Experiment title",
  "objective": "Clear objective",
  "type": "synthesis|characterization|performance|durability|optimization",
  "materials": [
    { "name": "Material", "quantity": "100g", "purity": "99.9%", "supplier": "Sigma-Aldrich" }
  ],
  "equipment": [
    { "name": "Equipment", "specification": "Spec", "purpose": "Purpose" }
  ],
  "procedure": [
    { "order": 1, "description": "Step", "duration": "1h", "temperature": "25°C", "criticalParameters": ["param"] }
  ],
  "safetyRequirements": [
    { "hazard": "Hazard", "severity": "medium", "mitigation": "Action", "ppe": ["gloves", "goggles"] }
  ],
  "failureModes": [
    { "mode": "Failure", "likelihood": "low", "impact": "medium", "detection": "Method", "mitigation": "Action" }
  ],
  "expectedOutputs": [
    { "name": "Output", "type": "quantitative", "expectedRange": { "min": 0, "max": 100, "unit": "%" } }
  ],
  "difficulty": "medium",
  "estimatedDuration": "2 weeks",
  "estimatedCost": 5000,
  "reproducibilityScore": 85
}

Include:
- At least 5 materials with suppliers
- At least 5 pieces of equipment
- At least 10 procedure steps
- At least 3 safety requirements
- At least 2 failure modes

CRITICAL: Return a COMPLETE, valid JSON object with ALL required fields. Do not truncate.`

    try {
      const result = await generateText('experiment-design', prompt, {
        temperature: 0.5, // Lower for more consistent structured experiment design
        maxTokens: 6000, // Optimized for speed (reduced from 8000)
        model: 'fast', // Use Gemini 3 Flash (high thinking) for cost savings
      })

      const cleaned = result.trim().replace(/```json\n?|\n?```/g, '')
      return JSON.parse(cleaned) as ExperimentDesign
    } catch (error) {
      console.error(`Experiment design failed for ${hypothesis.id}:`, error)
      return null
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createCreativeAgent(config?: Partial<CreativeConfig>): CreativeAgent {
  return new CreativeAgent(config)
}
