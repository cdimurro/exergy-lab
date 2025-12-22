/**
 * TEA Agent Adapters
 *
 * Adapters to interface TEA validation with existing Discovery Engine agents:
 * - Research Agent (for literature validation)
 * - Refinement Agent (for calculation corrections)
 * - Self-Critique Agent (for consistency checking)
 *
 * These adapters translate TEA-specific requests into formats compatible
 * with the existing agent infrastructure.
 */

import { ResearchAgent } from '../ai/agents/research-agent'
import { EnhancedRefinementAgent } from '../ai/agents/enhanced-refinement-agent'
import { SelfCritiqueAgent } from '../ai/agents/self-critique-agent'
import type { TEAInput_v2, TEAResult_v2 } from '@/types/tea'

/**
 * Research Agent Adapter for TEA Validation
 */
export class TEAResearchAdapter {
  private researchAgent: ResearchAgent

  constructor() {
    this.researchAgent = new ResearchAgent()
  }

  /**
   * Validate TEA calculations against academic literature
   */
  async validateCalculations(params: {
    technology: string
    calculations: Array<{
      metric: string
      value: number
      formula: string
      unit: string
    }>
    assumptions: Record<string, any>
  }): Promise<{
    findings: string[]
    discrepancies: string[]
    references: string[]
    confidence: number
  }> {
    // Build research query focusing on TEA methodologies
    const query = `Techno-economic analysis methodology for ${params.technology}:
    Validate the following calculations and assumptions:
    ${params.calculations.map(c => `${c.metric}: ${c.value} ${c.unit} (formula: ${c.formula})`).join('\n')}

    Key assumptions: ${JSON.stringify(params.assumptions, null, 2)}

    Cross-reference against NETL QGESS, DOE, IEA, and NREL standards.`

    try {
      const research Result = await this.researchAgent.research({
        query,
        domain: 'clean-energy' as any,
        maxSources: 10,
        includePatents: false, // Focus on academic/standards
        includeMaterials: false,
      })

      // Extract validation-relevant findings
      const findings: string[] = []
      const discrepancies: string[] = []
      const references: string[] = []

      // Analyze sources for validation information
      for (const source of researchResult.sources.slice(0, 5)) {
        references.push(`${source.title} (${source.source})${source.doi ? ` DOI: ${source.doi}` : ''}`)
      }

      // Analyze key findings for discrepancies
      for (const finding of researchResult.keyFindings) {
        if (finding.category === 'cost' || finding.category === 'performance') {
          findings.push(finding.finding)
        }
      }

      // Use state of the art to identify potential discrepancies
      for (const sota of researchResult.stateOfTheArt) {
        // Compare with our calculations
        const ourCalculation = params.calculations.find(c =>
          c.metric.toLowerCase().includes(sota.metric.toLowerCase())
        )

        if (ourCalculation) {
          const deviation = Math.abs((ourCalculation.value - sota.value) / sota.value)
          if (deviation > 0.2) {
            // More than 20% difference
            discrepancies.push(
              `${ourCalculation.metric} (${ourCalculation.value} ${ourCalculation.unit}) differs significantly from literature (${sota.value} ${sota.unit}). Source: ${sota.source.title}`
            )
          }
        }
      }

      // Calculate confidence based on findings
      const confidence = this.calculateValidationConfidence(
        findings.length,
        discrepancies.length,
        references.length
      )

      return {
        findings,
        discrepancies,
        references,
        confidence,
      }
    } catch (error) {
      console.error('Research validation failed:', error)
      return {
        findings: [],
        discrepancies: [`Research validation error: ${error}`],
        references: [],
        confidence: 0,
      }
    }
  }

  /**
   * Validate assumptions against literature
   */
  async validateAssumptions(params: {
    technology: string
    assumptions: Array<{
      parameter: string
      value: number
      unit: string
    }>
  }): Promise<{
    validated: Record<string, boolean>
    benchmarks: Record<string, { typical: number; range: { min: number; max: number } }>
    references: string[]
  }> {
    const query = `Industry benchmarks and typical values for ${params.technology}:
    ${params.assumptions.map(a => `- ${a.parameter}: ${a.value} ${a.unit}`).join('\n')}

    Find typical values, ranges, and standards from NETL, IEA, NREL databases.`

    try {
      const researchResult = await this.researchAgent.research({
        query,
        domain: 'clean-energy' as any,
        maxSources: 8,
      })

      const validated: Record<string, boolean> = {}
      const benchmarks: Record<string, { typical: number; range: { min: number; max: number } }> = {}
      const references = researchResult.sources.slice(0, 5).map(s => s.title)

      // Extract benchmark data from findings
      for (const finding of researchResult.keyFindings) {
        if (finding.value !== undefined) {
          // Try to match with our assumptions
          const matchingAssumption = params.assumptions.find(a =>
            finding.finding.toLowerCase().includes(a.parameter.toLowerCase())
          )

          if (matchingAssumption && finding.value) {
            benchmarks[matchingAssumption.parameter] = {
              typical: finding.value,
              range: {
                min: finding.value * 0.7,
                max: finding.value * 1.3,
              }, // Estimate range
            }

            const deviation = Math.abs((matchingAssumption.value - finding.value) / finding.value)
            validated[matchingAssumption.parameter] = deviation < 0.3 // Within 30%
          }
        }
      }

      return { validated, benchmarks, references }
    } catch (error) {
      console.error('Assumption validation failed:', error)
      return { validated: {}, benchmarks: {}, references: [] }
    }
  }

  private calculateValidationConfidence(
    findingsCount: number,
    discrepanciesCount: number,
    referencesCount: number
  ): number {
    let confidence = 50 // Base

    // More findings = more confidence
    confidence += Math.min(30, findingsCount * 5)

    // More references = more confidence
    confidence += Math.min(20, referencesCount * 3)

    // Discrepancies reduce confidence
    confidence -= discrepanciesCount * 10

    return Math.max(0, Math.min(100, confidence))
  }
}

/**
 * Refinement Agent Adapter for TEA Corrections
 */
export class TEARefinementAdapter {
  private refinementAgent: EnhancedRefinementAgent

  constructor() {
    this.refinementAgent = new EnhancedRefinementAgent()
  }

  /**
   * Generate corrections for identified discrepancies
   */
  async generateCorrections(params: {
    discrepancies: string[]
    currentResults: TEAResult_v2
    references: string[]
    input: TEAInput_v2
  }): Promise<{
    findings: string[]
    corrections: string[]
    newReferences: string[]
    confidence: number
  }> {
    // Build refinement prompt
    const prompt = `As a techno-economic analysis expert, review the following discrepancies and propose corrections:

Technology: ${params.input.technology_type}

Current Results:
- LCOE: ${params.currentResults.lcoe} $/kWh
- NPV: ${params.currentResults.npv} USD
- IRR: ${params.currentResults.irr}%
- Total CAPEX: ${params.currentResults.total_capex} USD

Discrepancies Found:
${params.discrepancies.map((d, i) => `${i + 1}. ${d}`).join('\n')}

References:
${params.references.slice(0, 3).join('\n')}

Provide:
1. Analysis of each discrepancy
2. Specific corrections (formulas, assumptions, or values)
3. Justification based on industry standards
4. Expected impact on results

Return as structured JSON:
{
  "findings": ["finding1", "finding2"],
  "corrections": ["correction1", "correction2"],
  "references": ["ref1", "ref2"]
}`

    try {
      // Use the refinement agent's refine method
      // Note: Adapting to match EnhancedRefinementAgent interface
      const response = await this.refinementAgent.refine({
        prompt,
        context: {
          discrepancies: params.discrepancies,
          currentResults: params.currentResults,
          references: params.references,
        },
      } as any) // Type assertion since we're adapting

      // Parse response (actual implementation would parse AI response)
      return {
        findings: response.findings || [],
        corrections: response.corrections || [],
        newReferences: response.newReferences || [],
        confidence: response.confidence || 70,
      }
    } catch (error) {
      console.error('Refinement failed:', error)
      return {
        findings: [],
        corrections: [],
        newReferences: [],
        confidence: 0,
      }
    }
  }
}

/**
 * Self-Critique Agent Adapter for TEA Consistency Checking
 */
export class TEACritiqueAdapter {
  private critiqueAgent: SelfCritiqueAgent

  constructor() {
    this.critiqueAgent = new SelfCritiqueAgent()
  }

  /**
   * Perform self-critique on TEA results
   */
  async critiqueResults(params: {
    input: TEAInput_v2
    results: TEAResult_v2
    calculations: Array<{
      metric: string
      value: number
      formula: string
    }>
  }): Promise<{
    strengths: string[]
    weaknesses: string[]
    suggestions: string[]
    overallScore: number
  }> {
    // Create a mock validation object that matches expected interface
    const mockValidation = {
      overallScore: 0,
      passed: false,
      criteria: [],
      failedChecks: [],
      passedChecks: [],
      warnings: [],
      timestamp: new Date(),
    }

    // Create phase outputs map
    const phaseOutputs = new Map()
    phaseOutputs.set('calculations', params.calculations)
    phaseOutputs.set('results', params.results)
    phaseOutputs.set('input', params.input)

    try {
      const critiqueResult = await this.critiqueAgent.analyze(mockValidation as any, phaseOutputs)

      return {
        strengths: critiqueResult.strengths.map(s => s.description),
        weaknesses: critiqueResult.weaknesses.map(w => w.description),
        suggestions: critiqueResult.improvements.map(i => i.suggestedApproach),
        overallScore: critiqueResult.confidenceInResults,
      }
    } catch (error) {
      console.error('Self-critique failed:', error)
      return {
        strengths: [],
        weaknesses: [`Self-critique error: ${error}`],
        suggestions: [],
        overallScore: 0,
      }
    }
  }
}

/**
 * Integrated TEA Validation Service
 * Combines all adapters for easy use
 */
export class TEAValidationService {
  private researchAdapter: TEAResearchAdapter
  private refinementAdapter: TEARefinementAdapter
  private critiqueAdapter: TEACritiqueAdapter

  constructor() {
    this.researchAdapter = new TEAResearchAdapter()
    this.refinementAdapter = new TEARefinementAdapter()
    this.critiqueAdapter = new TEACritiqueAdapter()
  }

  /**
   * Run full validation pipeline
   */
  async runFullValidation(input: TEAInput_v2, results: TEAResult_v2) {
    // Stage 1: Research validation
    const researchResults = await this.researchAdapter.validateCalculations({
      technology: input.technology_type,
      calculations: [
        { metric: 'LCOE', value: results.lcoe, formula: 'NPV(Costs)/NPV(Production)', unit: '$/kWh' },
        { metric: 'NPV', value: results.npv, formula: 'Σ(CF_t/(1+r)^t)', unit: 'USD' },
        { metric: 'IRR', value: results.irr, formula: 'NPV=0 solver', unit: '%' },
      ],
      assumptions: {
        discountRate: input.discount_rate,
        projectLifetime: input.project_lifetime_years,
        capacityFactor: input.capacity_factor,
      },
    })

    // Stage 2: Refinement (if discrepancies found)
    let refinementResults = null
    if (researchResults.discrepancies.length > 0) {
      refinementResults = await this.refinementAdapter.generateCorrections({
        discrepancies: researchResults.discrepancies,
        currentResults: results,
        references: researchResults.references,
        input,
      })
    }

    // Stage 3: Self-critique
    const critiqueResults = await this.critiqueAdapter.critiqueResults({
      input,
      results,
      calculations: [
        { metric: 'LCOE', value: results.lcoe, formula: 'NPV(Costs)/NPV(Production)' },
        { metric: 'NPV', value: results.npv, formula: 'Σ(CF_t/(1+r)^t)' },
        { metric: 'IRR', value: results.irr, formula: 'NPV=0 solver' },
      ],
    })

    return {
      research: researchResults,
      refinement: refinementResults,
      critique: critiqueResults,
      overallConfidence: this.calculateOverallConfidence(
        researchResults,
        refinementResults,
        critiqueResults
      ),
    }
  }

  /**
   * Calculate overall confidence from all validation stages
   */
  private calculateOverallConfidence(
    research: any,
    refinement: any,
    critique: any
  ): number {
    const scores = [research.confidence, critique.overallScore].filter(s => s > 0)

    if (scores.length === 0) return 0

    // If refinement was needed, reduce confidence slightly
    let confidence = scores.reduce((sum, s) => sum + s, 0) / scores.length

    if (refinement && refinement.corrections.length > 0) {
      confidence *= 0.9 // 10% reduction if corrections were needed
    }

    return Math.round(confidence)
  }
}

/**
 * Convenience function to create validation service
 */
export function createTEAValidationService(): TEAValidationService {
  return new TEAValidationService()
}

/**
 * Quick validation function (lightweight check without full pipeline)
 */
export async function quickValidateTEA(
  input: TEAInput_v2,
  results: TEAResult_v2
): Promise<{
  passed: boolean
  confidence: number
  issues: string[]
}> {
  const issues: string[] = []
  let confidence = 100

  // Basic sanity checks
  if (results.lcoe <= 0 || results.lcoe > 10) {
    issues.push(`LCOE (${results.lcoe} $/kWh) outside reasonable range (0-10 $/kWh)`)
    confidence -= 30
  }

  if (results.irr < -50 || results.irr > 100) {
    issues.push(`IRR (${results.irr}%) outside reasonable range (-50% to 100%)`)
    confidence -= 25
  }

  if (results.payback_years > input.project_lifetime_years) {
    issues.push(`Payback (${results.payback_years} years) exceeds lifetime (${input.project_lifetime_years} years)`)
    confidence -= 20
  }

  // NPV-IRR consistency
  const npvPositive = results.npv > 0
  const irrAboveDiscount = results.irr > input.discount_rate
  if ((npvPositive && !irrAboveDiscount) || (!npvPositive && irrAboveDiscount)) {
    issues.push('NPV and IRR are inconsistent with discount rate')
    confidence -= 35
  }

  const passed = issues.length === 0
  confidence = Math.max(0, confidence)

  return { passed, confidence, issues }
}
