/**
 * Base HypGen Agent
 *
 * Abstract base class for all hypothesis generation agents in the Breakthrough Engine.
 * Each specialized agent extends this class with a unique strategic focus.
 *
 * @see types-breakthrough.ts - Breakthrough scoring types
 * @see breakthrough-judge.ts - 8-dimension evaluation
 */

import { generateText } from '../../model-router'
import type { RefinementHints } from '../../rubrics/types'
import type { ResearchResult, MaterialData, TechnologicalGap } from '../research-agent'
import type { Hypothesis, Variable, Mechanism, Prediction } from '../creative-agent'
import type {
  RefinementFeedback,
  DimensionScore,
  BreakthroughDimension,
} from '../../rubrics/types-breakthrough'

// ============================================================================
// Types
// ============================================================================

export type HypGenAgentType =
  | 'novel'
  | 'feasible'
  | 'economic'
  | 'cross-domain'
  | 'paradigm'

export interface HypGenConfig {
  agentType: HypGenAgentType
  hypothesesPerGeneration: number
  minNoveltyScore: number
  minFeasibilityScore: number
  temperature: number
  model: 'fast' | 'quality'
  enableThermodynamicChecks: boolean
}

export const DEFAULT_HYPGEN_CONFIG: HypGenConfig = {
  agentType: 'novel',
  hypothesesPerGeneration: 3,
  minNoveltyScore: 60,
  minFeasibilityScore: 50,
  temperature: 0.8,
  model: 'quality',
  enableThermodynamicChecks: true,
}

export interface RacingHypothesis extends Hypothesis {
  agentSource: HypGenAgentType
  generationId: string
  iteration: number
  scores: {
    overall: number
    dimensions: Map<BreakthroughDimension, DimensionScore>
  }
  history: {
    iteration: number
    score: number
    feedback?: string
    improvements?: string[]
  }[]
  status: 'active' | 'eliminated' | 'breakthrough' | 'pending'
  eliminatedReason?: string
}

export interface GenerationContext {
  research: ResearchResult
  iteration: number
  previousFeedback?: RefinementFeedback
  competitorHypotheses?: RacingHypothesis[]
  targetDimensions?: BreakthroughDimension[]
}

export interface GenerationResult {
  hypotheses: RacingHypothesis[]
  agentType: HypGenAgentType
  generationId: string
  metadata: {
    tokensUsed: number
    generationTimeMs: number
    strategicFocus: string
  }
}

// ============================================================================
// Thermodynamic Limits (Shared)
// ============================================================================

export const THERMODYNAMIC_LIMITS = {
  carnot: (tHot: number, tCold: number) => (tHot - tCold) / tHot,
  betz: 0.593,
  shockleyQueisser: 0.337,
  concentratedSolar: 0.86,
  electrolysisVoltage: 1.48,
  fuelCellEfficiency: 0.83,
  batteryTheoretical: 0.95,
  hydrogenStorageDensity: 0.055, // kg H2 / kg system (DOE target)
}

// ============================================================================
// Base HypGen Agent Class
// ============================================================================

export abstract class BaseHypGenAgent {
  protected config: HypGenConfig
  protected generationCounter: number = 0

  constructor(config: Partial<HypGenConfig> = {}) {
    this.config = { ...DEFAULT_HYPGEN_CONFIG, ...config }
  }

  /**
   * Abstract method - each agent must define its strategic focus
   */
  abstract get strategicFocus(): string

  /**
   * Abstract method - each agent provides custom prompt instructions
   */
  abstract getStrategicPromptInstructions(): string

  /**
   * Generate hypotheses based on research and context
   * This is the main entry point for hypothesis generation
   */
  async generate(context: GenerationContext): Promise<GenerationResult> {
    const startTime = Date.now()
    const generationId = this.createGenerationId()

    console.log(
      `[HypGen-${this.config.agentType}] Starting generation #${generationId} ` +
      `(iteration ${context.iteration})`
    )

    // Generate raw hypotheses
    const rawHypotheses = await this.generateHypotheses(context)

    // Enrich with materials data if available
    const enriched = this.enrichWithMaterials(rawHypotheses, context.research.materialsData)

    // Validate thermodynamics if enabled
    const validated = this.config.enableThermodynamicChecks
      ? this.filterThermodynamicallyValid(enriched)
      : enriched

    // Convert to RacingHypothesis format
    const racingHypotheses = validated.map(h => this.toRacingHypothesis(h, generationId, context))

    return {
      hypotheses: racingHypotheses,
      agentType: this.config.agentType,
      generationId,
      metadata: {
        tokensUsed: 0, // Would be tracked by model-router
        generationTimeMs: Date.now() - startTime,
        strategicFocus: this.strategicFocus,
      },
    }
  }

  /**
   * Refine an existing hypothesis based on feedback
   */
  async refine(
    hypothesis: RacingHypothesis,
    feedback: RefinementFeedback,
    context: GenerationContext
  ): Promise<RacingHypothesis> {
    console.log(
      `[HypGen-${this.config.agentType}] Refining hypothesis ${hypothesis.id} ` +
      `(iteration ${context.iteration})`
    )

    const refinedHypothesis = await this.generateRefinedHypothesis(hypothesis, feedback, context)

    return {
      ...refinedHypothesis,
      agentSource: this.config.agentType,
      generationId: hypothesis.generationId,
      iteration: context.iteration,
      scores: hypothesis.scores, // Will be re-evaluated
      history: [
        ...hypothesis.history,
        {
          iteration: context.iteration - 1,
          score: hypothesis.scores.overall,
          feedback: feedback.overallAssessment,
          improvements: feedback.dimensionFeedback
            .filter(d => d.specificImprovements.length > 0)
            .map(d => d.specificImprovements[0]),
        },
      ],
      status: 'active',
    }
  }

  /**
   * Generate hypotheses using AI
   */
  protected async generateHypotheses(context: GenerationContext): Promise<Hypothesis[]> {
    const prompt = this.buildGenerationPrompt(context)

    // Use higher token limit for hypothesis generation to avoid truncation
    // Each hypothesis requires ~2500 tokens, generating 3 = ~7500 tokens
    const result = await generateText('discovery', prompt, {
      temperature: this.config.temperature,
      model: this.config.model,
      maxTokens: 10000, // Increased from default 2048 to prevent truncation
    })

    return this.parseHypothesesResponse(result, context)
  }

  /**
   * Refine a hypothesis based on feedback
   */
  protected async generateRefinedHypothesis(
    hypothesis: RacingHypothesis,
    feedback: RefinementFeedback,
    context: GenerationContext
  ): Promise<Hypothesis> {
    const prompt = this.buildRefinementPrompt(hypothesis, feedback, context)

    const result = await generateText('discovery', prompt, {
      temperature: this.config.temperature * 0.8, // Slightly lower for refinement
      model: this.config.model,
    })

    const refined = this.parseRefinedHypothesis(result, hypothesis)
    return refined
  }

  /**
   * Build the generation prompt with strategic focus
   */
  protected buildGenerationPrompt(context: GenerationContext): string {
    const strategicInstructions = this.getStrategicPromptInstructions()

    const feedbackSection = context.previousFeedback
      ? `
## REFINEMENT GUIDANCE (Previous Score: ${context.previousFeedback.overallAssessment})
Focus on improving these dimensions:
${context.previousFeedback.dimensionFeedback
  .filter(d => d.currentScore < d.targetScore)
  .map(d => `- ${d.dimension}: ${d.specificImprovements.join(', ')}`)
  .join('\n')}

Strategic Guidance: ${context.previousFeedback.strategicGuidance.primaryFocus}
---
`
      : ''

    const competitorSection = context.competitorHypotheses?.length
      ? `
## COMPETITOR HYPOTHESES (Differentiate from these)
${context.competitorHypotheses
  .slice(0, 3)
  .map(h => `- ${h.title}: ${h.statement.substring(0, 100)}...`)
  .join('\n')}
---
`
      : ''

    return `${feedbackSection}${competitorSection}You are a hypothesis generator for clean energy research with a ${this.strategicFocus} focus.

## YOUR STRATEGIC APPROACH
${strategicInstructions}

## RESEARCH CONTEXT
Domain: ${context.research.domain}
Query: ${context.research.query}

KEY FINDINGS:
${context.research.keyFindings.slice(0, 8).map(f =>
  `- ${f.finding}${f.value ? ` (${f.value} ${f.unit})` : ''}`
).join('\n')}

TECHNOLOGICAL GAPS:
${context.research.technologicalGaps.slice(0, 5).map(g =>
  `- ${g.description} (Impact: ${g.impact})`
).join('\n')}

CROSS-DOMAIN INSIGHTS:
${(context.research.crossDomainInsights || []).slice(0, 3).map(i =>
  `- ${i.insight} (from ${i.domains?.join(', ') || 'multiple domains'})`
).join('\n')}

MATERIALS DATA:
${context.research.materialsData.slice(0, 5).map(m =>
  `- ${m.formula}: bandGap=${m.bandGap}eV, ${m.stability}`
).join('\n')}

## GENERATION REQUIREMENTS
Generate ${this.config.hypothesesPerGeneration} hypotheses with the following structure:

For EACH hypothesis, provide:
1. id: Unique identifier (e.g., "HYP-${this.config.agentType.toUpperCase()}-001")
2. title: Concise descriptive title
3. statement: Full hypothesis statement (2-3 sentences)
4. mechanism: { steps: [{ order, description, physicalPrinciple }] } - at least 3 steps
5. predictions: [{ statement, measurable: true, falsifiable: true, expectedValue, unit, tolerance }] - at least 2
6. supportingEvidence: [{ finding, citation, relevance }] - at least 3 items
7. variables: {
     independent: [{ name, type: 'independent', description, range: { min, max, unit } }],
     dependent: [{ name, type: 'dependent', description }],
     controls: [{ name, type: 'control', description }]
   }
8. noveltyScore: 70-95 (how novel is this approach)
9. feasibilityScore: 60-90 (how feasible to implement)
10. impactScore: 70-95 (potential impact if successful)
11. validationMetrics: [{ name, targetValue, unit, threshold }]
12. relatedGaps: Reference 1-2 gaps from the research
13. requiredMaterials: Materials needed for validation

CRITICAL: Each hypothesis must be:
- Grounded in the research findings provided
- Thermodynamically sound
- Falsifiable with clear predictions
- Novel relative to existing approaches
- Aligned with your ${this.strategicFocus} focus

Respond with a JSON array of hypotheses:
[{ "id": "...", "title": "...", ... }, ...]`
  }

  /**
   * Build refinement prompt
   */
  protected buildRefinementPrompt(
    hypothesis: RacingHypothesis,
    feedback: RefinementFeedback,
    context: GenerationContext
  ): string {
    return `You are refining a hypothesis based on evaluation feedback.

## CURRENT HYPOTHESIS
ID: ${hypothesis.id}
Title: ${hypothesis.title}
Statement: ${hypothesis.statement}
Current Score: ${hypothesis.scores.overall}/10

## DIMENSION FEEDBACK
${feedback.dimensionFeedback.map(d => `
### ${d.dimension} (${d.currentScore}% → target ${d.targetScore}%)
Improvements needed:
${d.specificImprovements.map(i => `- ${i}`).join('\n')}
Research pointers:
${d.researchPointers.map(p => `- ${p}`).join('\n')}
`).join('\n')}

## STRATEGIC GUIDANCE
Primary Focus: ${feedback.strategicGuidance.primaryFocus}
Quick Wins: ${feedback.strategicGuidance.quickWins.join(', ')}
Synergies: ${feedback.strategicGuidance.synergies.join(', ')}

## COMPETITIVE INSIGHT
${feedback.competitiveInsight.differentiationOpportunities.join(', ')}

## YOUR TASK
Refine this hypothesis to address the feedback while maintaining its core innovation.
Keep your ${this.strategicFocus} strategic focus.

Provide the refined hypothesis in the same JSON format as the original.
Only output the single refined hypothesis as a JSON object.`
  }

  /**
   * Parse AI response into hypothesis objects
   * Handles truncated JSON, markdown code blocks, and malformed responses
   */
  protected parseHypothesesResponse(
    result: string,
    context: GenerationContext
  ): Hypothesis[] {
    try {
      // Step 1: Clean up the response - remove markdown code blocks
      let cleaned = result.trim()
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
      }

      // Step 2: Try to extract JSON array
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        console.warn(`[HypGen-${this.config.agentType}] No JSON array found in response`)
        return this.extractIndividualHypotheses(cleaned)
      }

      let jsonStr = jsonMatch[0]

      // Step 3: Try to repair truncated JSON
      // Count brackets to detect truncation
      const openBrackets = (jsonStr.match(/\[/g) || []).length
      const closeBrackets = (jsonStr.match(/\]/g) || []).length
      const openBraces = (jsonStr.match(/\{/g) || []).length
      const closeBraces = (jsonStr.match(/\}/g) || []).length

      if (openBrackets > closeBrackets || openBraces > closeBraces) {
        console.log(`[HypGen-${this.config.agentType}] Detected truncated JSON, attempting repair...`)
        jsonStr = this.repairTruncatedJson(jsonStr)
      }

      // Step 4: Parse the JSON
      const parsed = JSON.parse(jsonStr)

      if (!Array.isArray(parsed)) {
        console.warn(`[HypGen-${this.config.agentType}] Parsed result is not an array`)
        return []
      }

      console.log(`[HypGen-${this.config.agentType}] Successfully parsed ${parsed.length} hypotheses`)
      return parsed.map((h: any, index: number) => this.normalizeHypothesis(h, index))
    } catch (error) {
      console.error(`[HypGen-${this.config.agentType}] Failed to parse response:`, error)
      // Try extracting individual hypotheses as fallback
      return this.extractIndividualHypotheses(result)
    }
  }

  /**
   * Attempt to repair truncated JSON by closing open brackets/braces
   */
  protected repairTruncatedJson(json: string): string {
    let repaired = json.trim()

    // Remove any trailing incomplete property (e.g., "property": or "property": "incomplete)
    repaired = repaired.replace(/,\s*"[^"]*":\s*("[^"]*)?$/, '')
    repaired = repaired.replace(/,\s*"[^"]*":\s*\d*\.?\d*$/, '')
    repaired = repaired.replace(/,\s*"[^"]*":\s*$/, '')
    repaired = repaired.replace(/,\s*$/, '')

    // Count what needs closing
    const openBraces = (repaired.match(/\{/g) || []).length
    const closeBraces = (repaired.match(/\}/g) || []).length
    const openBrackets = (repaired.match(/\[/g) || []).length
    const closeBrackets = (repaired.match(/\]/g) || []).length

    // Add missing closing braces
    for (let i = 0; i < openBraces - closeBraces; i++) {
      repaired += '}'
    }

    // Add missing closing brackets
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      repaired += ']'
    }

    return repaired
  }

  /**
   * Extract individual hypothesis objects when array parsing fails
   */
  protected extractIndividualHypotheses(text: string): Hypothesis[] {
    const hypotheses: Hypothesis[] = []

    // Try to find complete hypothesis objects
    const objectPattern = /\{[^{}]*"id"\s*:\s*"[^"]*"[^{}]*"title"\s*:\s*"[^"]*"[^{}]*"statement"\s*:\s*"[^"]*"[^{}]*\}/g
    const matches = text.match(objectPattern)

    if (matches && matches.length > 0) {
      console.log(`[HypGen-${this.config.agentType}] Extracted ${matches.length} individual hypotheses`)
      for (let i = 0; i < matches.length; i++) {
        try {
          const parsed = JSON.parse(matches[i])
          hypotheses.push(this.normalizeHypothesis(parsed, i))
        } catch {
          // Skip malformed objects
        }
      }
    }

    return hypotheses
  }

  /**
   * Parse refined hypothesis from AI response
   */
  protected parseRefinedHypothesis(result: string, original: Hypothesis): Hypothesis {
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.warn(`[HypGen-${this.config.agentType}] No JSON object found, returning original`)
        return original
      }

      const parsed = JSON.parse(jsonMatch[0])
      return this.normalizeHypothesis(parsed, 0, original.id)
    } catch (error) {
      console.error(`[HypGen-${this.config.agentType}] Failed to parse refinement:`, error)
      return original
    }
  }

  /**
   * Normalize a parsed hypothesis to ensure all fields exist
   */
  protected normalizeHypothesis(raw: any, index: number, overrideId?: string): Hypothesis {
    return {
      id: overrideId || raw.id || `HYP-${this.config.agentType.toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
      title: raw.title || 'Untitled Hypothesis',
      statement: raw.statement || '',
      predictions: this.normalizePredictions(raw.predictions || []),
      supportingEvidence: (raw.supportingEvidence || []).map((e: any) => ({
        finding: e.finding || '',
        citation: e.citation || 'Unknown',
        relevance: e.relevance || 0.5,
      })),
      contradictingEvidence: raw.contradictingEvidence || [],
      mechanism: this.normalizeMechanism(raw.mechanism),
      variables: this.normalizeVariables(raw.variables),
      noveltyScore: Math.min(100, Math.max(0, raw.noveltyScore || 50)),
      feasibilityScore: Math.min(100, Math.max(0, raw.feasibilityScore || 50)),
      impactScore: Math.min(100, Math.max(0, raw.impactScore || 50)),
      validationMetrics: (raw.validationMetrics || []).map((m: any) => ({
        name: m.name || 'Metric',
        targetValue: m.targetValue || 0,
        unit: m.unit || '',
        threshold: m.threshold || 0,
      })),
      relatedGaps: raw.relatedGaps || [],
      requiredMaterials: raw.requiredMaterials || [],
    }
  }

  /**
   * Normalize predictions array
   */
  protected normalizePredictions(predictions: any[]): Prediction[] {
    return predictions.map(p => ({
      statement: p.statement || '',
      measurable: p.measurable !== false,
      falsifiable: p.falsifiable !== false,
      expectedValue: p.expectedValue,
      unit: p.unit,
      tolerance: p.tolerance,
    }))
  }

  /**
   * Normalize mechanism object
   */
  protected normalizeMechanism(mechanism: any): Mechanism {
    if (!mechanism || !mechanism.steps) {
      return { steps: [] }
    }
    return {
      steps: mechanism.steps.map((s: any, i: number) => ({
        order: s.order || i + 1,
        description: s.description || '',
        physicalPrinciple: s.physicalPrinciple,
      })),
    }
  }

  /**
   * Normalize variables object
   */
  protected normalizeVariables(variables: any): Hypothesis['variables'] {
    return {
      independent: (variables?.independent || []).map((v: any) => this.normalizeVariable(v, 'independent')),
      dependent: (variables?.dependent || []).map((v: any) => this.normalizeVariable(v, 'dependent')),
      controls: (variables?.controls || []).map((v: any) => this.normalizeVariable(v, 'control')),
    }
  }

  /**
   * Normalize a single variable
   */
  protected normalizeVariable(v: any, type: Variable['type']): Variable {
    return {
      name: v.name || 'Variable',
      type,
      description: v.description || '',
      range: v.range,
    }
  }

  /**
   * Enrich hypotheses with materials data
   */
  protected enrichWithMaterials(hypotheses: Hypothesis[], materials: MaterialData[]): Hypothesis[] {
    return hypotheses.map(h => ({
      ...h,
      requiredMaterials: h.requiredMaterials.length > 0
        ? h.requiredMaterials
        : materials.slice(0, 3), // Add top 3 materials if none specified
    }))
  }

  /**
   * Filter hypotheses that violate thermodynamic limits
   */
  protected filterThermodynamicallyValid(hypotheses: Hypothesis[]): Hypothesis[] {
    return hypotheses.filter(h => !this.violatesThermodynamics(h))
  }

  /**
   * Check if a hypothesis violates thermodynamic limits
   */
  protected violatesThermodynamics(hypothesis: Hypothesis): boolean {
    const statement = hypothesis.statement.toLowerCase()
    const predictions = hypothesis.predictions.map(p => p.statement.toLowerCase()).join(' ')
    const combined = `${statement} ${predictions}`

    // Check for Betz limit violations (wind)
    if (combined.includes('wind') && combined.includes('efficiency')) {
      const efficiencyMatch = combined.match(/(\d+(?:\.\d+)?)\s*%?\s*efficiency/)
      if (efficiencyMatch) {
        const efficiency = parseFloat(efficiencyMatch[1]) / 100
        if (efficiency > THERMODYNAMIC_LIMITS.betz) {
          console.warn(
            `[HypGen-${this.config.agentType}] Hypothesis "${hypothesis.id}" violates Betz limit`
          )
          return true
        }
      }
    }

    // Check for Shockley-Queisser limit violations (single-junction solar)
    if (
      (combined.includes('solar') || combined.includes('photovoltaic')) &&
      combined.includes('single') &&
      combined.includes('efficiency')
    ) {
      const efficiencyMatch = combined.match(/(\d+(?:\.\d+)?)\s*%?\s*efficiency/)
      if (efficiencyMatch) {
        const efficiency = parseFloat(efficiencyMatch[1]) / 100
        if (efficiency > THERMODYNAMIC_LIMITS.shockleyQueisser) {
          console.warn(
            `[HypGen-${this.config.agentType}] Hypothesis "${hypothesis.id}" violates Shockley-Queisser limit`
          )
          return true
        }
      }
    }

    // Check for fuel cell efficiency violations
    if (combined.includes('fuel cell') && combined.includes('efficiency')) {
      const efficiencyMatch = combined.match(/(\d+(?:\.\d+)?)\s*%?\s*efficiency/)
      if (efficiencyMatch) {
        const efficiency = parseFloat(efficiencyMatch[1]) / 100
        if (efficiency > THERMODYNAMIC_LIMITS.fuelCellEfficiency) {
          console.warn(
            `[HypGen-${this.config.agentType}] Hypothesis "${hypothesis.id}" violates fuel cell limits`
          )
          return true
        }
      }
    }

    return false
  }

  /**
   * Convert Hypothesis to RacingHypothesis
   */
  protected toRacingHypothesis(
    hypothesis: Hypothesis,
    generationId: string,
    context: GenerationContext
  ): RacingHypothesis {
    return {
      ...hypothesis,
      agentSource: this.config.agentType,
      generationId,
      iteration: context.iteration,
      scores: {
        overall: 0,
        dimensions: new Map(),
      },
      history: [],
      status: 'pending',
    }
  }

  /**
   * Create unique generation ID
   */
  protected createGenerationId(): string {
    this.generationCounter++
    return `${this.config.agentType}-gen-${Date.now()}-${this.generationCounter}`
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createHypGenAgent(
  type: HypGenAgentType,
  config?: Partial<HypGenConfig>
): BaseHypGenAgent {
  // Import dynamically to avoid circular dependencies
  // The actual implementations will be in separate files
  throw new Error(`Use specific agent constructors: NovelHypGenAgent, FeasibleHypGenAgent, etc.`)
}
