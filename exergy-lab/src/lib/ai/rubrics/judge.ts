/**
 * FrontierScience Rubric Judge
 *
 * Implements the exact grading methodology from OpenAI's FrontierScience paper.
 * Uses Gemini 3 Flash with high thinking level for rigorous evaluation.
 */

import { generateText } from '../model-router'
import type {
  Rubric,
  RubricItem,
  JudgeResult,
  ItemScore,
  DiscoveryPhase,
} from './types'

// ============================================================================
// Judge Configuration
// ============================================================================

export interface JudgeConfig {
  temperature: number
  thinkingLevel: 'minimal' | 'low' | 'medium' | 'high'
  model: 'fast' | 'quality'
  maxRetries: number
  strictMode: boolean // If true, requires exact matches; if false, allows partial credit
}

export const DEFAULT_JUDGE_CONFIG: JudgeConfig = {
  temperature: 0.3, // Low temperature for consistent grading
  thinkingLevel: 'medium', // Medium thinking for balanced speed and quality
  model: 'quality',
  maxRetries: 2,
  strictMode: false,
}

// ============================================================================
// Rubric Judge Class
// ============================================================================

export class RubricJudge {
  private config: JudgeConfig

  constructor(config: Partial<JudgeConfig> = {}) {
    this.config = { ...DEFAULT_JUDGE_CONFIG, ...config }
  }

  /**
   * Judge a response against a rubric
   * Uses the exact FrontierScience prompt structure
   */
  async judge(
    problem: string,
    response: any,
    rubric: Rubric
  ): Promise<JudgeResult> {
    const startTime = Date.now()

    // First, run automated checks for items that have them
    const automatedScores = await this.runAutomatedChecks(response, rubric)

    // Then, use AI judge for remaining items
    const aiScores = await this.runAIJudge(problem, response, rubric, automatedScores)

    // Combine scores
    const allScores = this.combineScores(automatedScores, aiScores, rubric)

    // Calculate total and determine pass/fail
    const totalScore = allScores.reduce((sum, s) => sum + s.points, 0)
    const passed = totalScore >= rubric.successThreshold

    // Identify failed and passed items
    const failedItems = rubric.items.filter(item => {
      const score = allScores.find(s => s.itemId === item.id)
      return score && score.points < item.points * 0.7 // Less than 70% of item points
    })

    const passedItems = rubric.items.filter(item => {
      const score = allScores.find(s => s.itemId === item.id)
      return score && score.points >= item.points * 0.7
    })

    // Generate recommendations
    const recommendations = this.generateRecommendations(failedItems, allScores)

    // Generate iteration hint for refinement
    const iterationHint = this.generateIterationHint(failedItems, allScores)

    return {
      rubricId: rubric.id,
      phase: rubric.phase,
      totalScore: Math.round(totalScore * 100) / 100, // Round to 2 decimal places
      passed,
      itemScores: allScores,
      reasoning: this.summarizeReasoning(allScores),
      failedItems,
      passedItems,
      recommendations,
      confidenceScore: this.calculateConfidence(allScores),
      iterationHint,
      timestamp: new Date(),
      judgeModel: `gemini-3-flash-${this.config.model}`,
    }
  }

  /**
   * Run automated checks for items with automatedValidation functions
   */
  private async runAutomatedChecks(
    response: any,
    rubric: Rubric
  ): Promise<Map<string, ItemScore>> {
    const scores = new Map<string, ItemScore>()

    for (const item of rubric.items) {
      if (item.automatedValidation) {
        try {
          const score = await item.automatedValidation(response)
          scores.set(item.id, score)
        } catch (error) {
          console.warn(`Automated check failed for ${item.id}:`, error)
          // Will fall back to AI judge
        }
      }
    }

    return scores
  }

  /**
   * Run AI judge for items without automated checks
   * Uses the exact FrontierScience prompt structure
   */
  private async runAIJudge(
    problem: string,
    response: any,
    rubric: Rubric,
    automatedScores: Map<string, ItemScore>
  ): Promise<ItemScore[]> {
    // Filter items that need AI judging
    const itemsToJudge = rubric.items.filter(item => !automatedScores.has(item.id))

    if (itemsToJudge.length === 0) {
      return []
    }

    const prompt = this.buildJudgePrompt(problem, response, rubric, itemsToJudge)

    let attempts = 0
    while (attempts < this.config.maxRetries) {
      try {
        const result = await generateText('discovery', prompt, {
          temperature: this.config.temperature,
          model: this.config.model,
          // Note: thinkingLevel passed via model-router if supported
        })

        return this.parseJudgeResponse(result, itemsToJudge)
      } catch (error) {
        attempts++
        console.warn(`Judge attempt ${attempts} failed:`, error)
        if (attempts >= this.config.maxRetries) {
          // Return conservative scores on failure
          return itemsToJudge.map(item => ({
            itemId: item.id,
            points: 0,
            maxPoints: item.points,
            passed: false,
            reasoning: 'Automated grading failed - defaulting to 0 points',
          }))
        }
      }
    }

    return []
  }

  /**
   * Compress response to essential evaluation data
   * Reduces prompt size for faster judge evaluation
   */
  private compressResponse(response: any, phase: DiscoveryPhase): any {
    if (typeof response === 'string') return response

    // For research phase, we only need summary statistics
    if (phase === 'research') {
      return {
        sourceCount: response.sources?.length || 0,
        sourceTypes: [...new Set(response.sources?.map((s: any) => s.source) || [])],
        recentSources: response.sources?.filter((s: any) => {
          const year = new Date(s.publishedDate).getFullYear()
          return year >= new Date().getFullYear() - 3
        }).length || 0,
        keyFindingsCount: response.keyFindings?.length || 0,
        keyFindingsWithValues: response.keyFindings?.filter((f: any) => f.value && f.unit).length || 0,
        gapsCount: response.technologicalGaps?.length || 0,
        crossDomainCount: response.crossDomainInsights?.length || 0,
        materialsCount: response.materialsData?.length || 0,
        // Sample first 3 sources for verification
        sampleSources: response.sources?.slice(0, 3).map((s: any) => ({
          title: s.title,
          source: s.source,
          publishedDate: s.publishedDate,
        })) || [],
        // Sample findings for quality check
        sampleFindings: response.keyFindings?.slice(0, 3).map((f: any) => ({
          finding: f.finding.substring(0, 100),
          hasValue: !!f.value,
          hasUnit: !!f.unit,
        })) || [],
      }
    }

    // For other phases, return full response (they're smaller)
    return response
  }

  /**
   * Build the FrontierScience-style judge prompt
   * Follows the exact structure from the paper
   */
  private buildJudgePrompt(
    problem: string,
    response: any,
    rubric: Rubric,
    itemsToJudge: RubricItem[]
  ): string {
    // Compress response for faster evaluation
    const compressedResponse = this.compressResponse(response, rubric.phase)

    const responseStr = typeof compressedResponse === 'string'
      ? compressedResponse
      : JSON.stringify(compressedResponse, null, 2)

    const rubricStr = itemsToJudge.map(item => {
      let itemStr = `- ${item.id} (${item.points} points): ${item.description}\n  Pass condition: ${item.passCondition}`

      if (item.partialConditions && item.partialConditions.length > 0) {
        itemStr += '\n  Partial credit:'
        for (const partial of item.partialConditions) {
          itemStr += `\n    - (${partial.points}pts) ${partial.condition}`
        }
      }

      return itemStr
    }).join('\n\n')

    return `You are grading a scientific research output.

You will be given the research problem, the attempted answer/output, and a rubric to grade the answer.
The rubric items below total up to ${itemsToJudge.reduce((sum, i) => sum + i.points, 0)} points.

Evaluate the attempted answer against the provided rubric. Pay close attention to detail and grade it strictly, but fairly. Only evaluate against the rubric criteria - do not make subjective judgements beyond what the rubric specifies.

***
THE PROBLEM:
${problem}
***

***
THE RUBRIC:
${rubricStr}
***

***
THE ATTEMPTED ANSWER:
${responseStr}
***

Evaluate each rubric item concisely. For EACH item, output:

ITEM: [item_id]
ANALYSIS: [brief reasoning - 1-2 sentences]
POINTS: [points awarded]/[max points]

After all items, write:
VERDICT: [total_points]/[max_points]`
  }

  /**
   * Parse the AI judge's response into ItemScores
   */
  private parseJudgeResponse(result: string, items: RubricItem[]): ItemScore[] {
    const scores: ItemScore[] = []

    for (const item of items) {
      // Find the section for this item
      const itemPattern = new RegExp(
        `ITEM:\\s*${item.id}[\\s\\S]*?POINTS:\\s*([\\d.]+)\\s*/\\s*([\\d.]+)`,
        'i'
      )
      const match = result.match(itemPattern)

      if (match) {
        const points = parseFloat(match[1])
        const maxPoints = parseFloat(match[2])

        // Extract analysis/reasoning
        const analysisPattern = new RegExp(
          `ITEM:\\s*${item.id}[\\s\\S]*?ANALYSIS:\\s*([\\s\\S]*?)(?=POINTS:|$)`,
          'i'
        )
        const analysisMatch = result.match(analysisPattern)
        const reasoning = analysisMatch ? analysisMatch[1].trim() : 'No reasoning provided'

        scores.push({
          itemId: item.id,
          points: Math.min(points, item.points), // Cap at max points
          maxPoints: item.points,
          passed: points >= item.points * 0.7,
          reasoning,
        })
      } else {
        // Item not found in response - assign 0
        scores.push({
          itemId: item.id,
          points: 0,
          maxPoints: item.points,
          passed: false,
          reasoning: 'Item not evaluated in judge response',
        })
      }
    }

    return scores
  }

  /**
   * Combine automated and AI scores
   */
  private combineScores(
    automatedScores: Map<string, ItemScore>,
    aiScores: ItemScore[],
    rubric: Rubric
  ): ItemScore[] {
    const combined: ItemScore[] = []

    for (const item of rubric.items) {
      const automated = automatedScores.get(item.id)
      const ai = aiScores.find(s => s.itemId === item.id)

      if (automated) {
        combined.push(automated)
      } else if (ai) {
        combined.push(ai)
      } else {
        // Missing score - default to 0
        combined.push({
          itemId: item.id,
          points: 0,
          maxPoints: item.points,
          passed: false,
          reasoning: 'No score available',
        })
      }
    }

    return combined
  }

  /**
   * Generate recommendations based on failed items
   */
  private generateRecommendations(
    failedItems: RubricItem[],
    scores: ItemScore[]
  ): string[] {
    const recommendations: string[] = []

    for (const item of failedItems) {
      const score = scores.find(s => s.itemId === item.id)
      const percentAchieved = score ? (score.points / item.points) * 100 : 0

      if (percentAchieved === 0) {
        recommendations.push(
          `${item.id}: Missing entirely. ${item.passCondition}`
        )
      } else if (percentAchieved < 50) {
        recommendations.push(
          `${item.id}: Needs significant improvement (${Math.round(percentAchieved)}% achieved). Focus on: ${item.passCondition}`
        )
      } else {
        recommendations.push(
          `${item.id}: Close to passing (${Math.round(percentAchieved)}% achieved). Minor adjustments needed for: ${item.passCondition}`
        )
      }
    }

    return recommendations
  }

  /**
   * Generate specific guidance for the next iteration
   */
  private generateIterationHint(
    failedItems: RubricItem[],
    scores: ItemScore[]
  ): string | undefined {
    if (failedItems.length === 0) return undefined

    // Find the item closest to passing
    let closestItem: RubricItem | null = null
    let highestPercent = 0

    for (const item of failedItems) {
      const score = scores.find(s => s.itemId === item.id)
      const percent = score ? (score.points / item.points) * 100 : 0

      if (percent > highestPercent) {
        highestPercent = percent
        closestItem = item
      }
    }

    if (closestItem) {
      const score = scores.find(s => s.itemId === closestItem!.id)
      return `Priority: Fix "${closestItem.id}" (${Math.round(highestPercent)}% achieved). ` +
        `${closestItem.passCondition}. Previous issue: ${score?.reasoning || 'Unknown'}`
    }

    // If all at 0%, focus on the highest-weighted failed item
    const sortedByWeight = [...failedItems].sort((a, b) => b.points - a.points)
    const topItem = sortedByWeight[0]

    return `Priority: Address "${topItem.id}" (${topItem.points} points). ${topItem.passCondition}`
  }

  /**
   * Summarize reasoning across all items
   */
  private summarizeReasoning(scores: ItemScore[]): string {
    const passed = scores.filter(s => s.passed)
    const failed = scores.filter(s => !s.passed)

    let summary = `Passed ${passed.length}/${scores.length} criteria. `

    if (failed.length > 0) {
      summary += `Failed: ${failed.map(s => s.itemId).join(', ')}. `
    }

    // Add key reasoning from failed items
    const criticalIssues = failed
      .filter(s => s.points === 0)
      .map(s => `${s.itemId}: ${s.reasoning.substring(0, 100)}...`)

    if (criticalIssues.length > 0) {
      summary += `Critical issues: ${criticalIssues.slice(0, 3).join('; ')}`
    }

    return summary
  }

  /**
   * Calculate confidence score based on how clear the grading was
   */
  private calculateConfidence(scores: ItemScore[]): number {
    // Higher confidence when scores are clearly pass or fail (not borderline)
    let confidence = 70 // Base confidence

    for (const score of scores) {
      const ratio = score.points / score.maxPoints
      if (ratio <= 0.2 || ratio >= 0.8) {
        confidence += 3 // Clear pass or fail
      } else if (ratio >= 0.4 && ratio <= 0.6) {
        confidence -= 5 // Borderline case
      }
    }

    return Math.min(100, Math.max(0, confidence))
  }
}

// ============================================================================
// Quick Judge Function
// ============================================================================

/**
 * Quick function to judge without creating an instance
 */
export async function judgeResponse(
  problem: string,
  response: any,
  rubric: Rubric,
  config?: Partial<JudgeConfig>
): Promise<JudgeResult> {
  const judge = new RubricJudge(config)
  return judge.judge(problem, response, rubric)
}

// ============================================================================
// Batch Judging
// ============================================================================

/**
 * Judge multiple responses in parallel
 */
export async function batchJudge(
  problems: string[],
  responses: any[],
  rubrics: Rubric[],
  config?: Partial<JudgeConfig>
): Promise<JudgeResult[]> {
  const judge = new RubricJudge(config)

  return Promise.all(
    problems.map((problem, i) =>
      judge.judge(problem, responses[i], rubrics[i] || rubrics[0])
    )
  )
}
