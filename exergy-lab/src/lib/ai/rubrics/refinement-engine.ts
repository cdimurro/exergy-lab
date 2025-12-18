/**
 * FrontierScience Refinement Engine
 *
 * Iteratively refines outputs until they pass the rubric threshold (7/10).
 * Uses failed criteria to generate targeted hints for improvement.
 */

import { RubricJudge, JudgeConfig } from './judge'
import type {
  Rubric,
  RefinementConfig,
  RefinementResult,
  RefinementIteration,
  RefinementHints,
  JudgeResult,
} from './types'
import { DEFAULT_REFINEMENT_CONFIG } from './types'

// ============================================================================
// Refinement Engine Configuration
// ============================================================================

export interface RefinementEngineConfig {
  judgeConfig?: Partial<JudgeConfig>
  refinementConfig?: Partial<RefinementConfig>
  onIterationComplete?: (iteration: RefinementIteration<any>) => void
  onScoreImprovement?: (oldScore: number, newScore: number) => void
  verbose?: boolean
}

const DEFAULT_ENGINE_CONFIG: Required<RefinementEngineConfig> = {
  judgeConfig: {},
  refinementConfig: {
    maxIterations: 3,
    improvementThreshold: 0.5,
    timeoutMs: 300000,
    earlyStopOnPass: true,
  },
  onIterationComplete: () => {},
  onScoreImprovement: () => {},
  verbose: false,
}

// ============================================================================
// Refinement Engine Class
// ============================================================================

export class RefinementEngine {
  private judge: RubricJudge
  private config: Required<RefinementEngineConfig>

  constructor(config: RefinementEngineConfig = {}) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config }
    this.judge = new RubricJudge(this.config.judgeConfig)
  }

  /**
   * Refine output until it passes the rubric threshold
   *
   * @param problem - The original problem/query
   * @param generator - Function that generates output, optionally using hints
   * @param rubric - The rubric to judge against
   * @returns RefinementResult with final output and iteration history
   */
  async refineUntilPass<T>(
    problem: string,
    generator: (hints?: RefinementHints) => Promise<T>,
    rubric: Rubric
  ): Promise<RefinementResult<T>> {
    const startTime = Date.now()
    const iterations: RefinementIteration<T>[] = []
    const improvementPath: number[] = []
    let bestResult: { output: T; score: number; iteration: number } | null = null

    const maxIterations = this.config.refinementConfig?.maxIterations ?? DEFAULT_REFINEMENT_CONFIG.maxIterations
    const improvementThreshold = this.config.refinementConfig?.improvementThreshold ?? DEFAULT_REFINEMENT_CONFIG.improvementThreshold
    const timeoutMs = this.config.refinementConfig?.timeoutMs ?? DEFAULT_REFINEMENT_CONFIG.timeoutMs
    const earlyStopOnPass = this.config.refinementConfig?.earlyStopOnPass ?? DEFAULT_REFINEMENT_CONFIG.earlyStopOnPass

    for (let i = 0; i < maxIterations; i++) {
      // Check timeout
      if (Date.now() - startTime > timeoutMs) {
        this.log(`Timeout reached after ${i} iterations`)
        break
      }

      const iterationStart = Date.now()

      // Generate hints from previous failures (if any)
      const hints = i > 0 ? this.generateHints(iterations, i) : undefined

      if (this.config.verbose && hints) {
        this.log(`Iteration ${i + 1} hints:`, hints.specificGuidance)
      }

      // Generate output
      let output: T
      try {
        output = await generator(hints)
      } catch (error) {
        this.log(`Generation failed on iteration ${i + 1}:`, error)
        continue
      }

      // Judge against rubric
      const judgeResult = await this.judge.judge(problem, output, rubric)

      const iteration: RefinementIteration<T> = {
        iteration: i + 1,
        output,
        judgeResult,
        hints,
        durationMs: Date.now() - iterationStart,
      }

      iterations.push(iteration)
      improvementPath.push(judgeResult.totalScore)

      // Track best result
      if (!bestResult || judgeResult.totalScore > bestResult.score) {
        const oldScore = bestResult?.score ?? 0
        bestResult = { output, score: judgeResult.totalScore, iteration: i + 1 }
        this.config.onScoreImprovement(oldScore, judgeResult.totalScore)
      }

      // Notify iteration complete
      this.config.onIterationComplete(iteration)

      this.log(
        `Iteration ${i + 1}: Score ${judgeResult.totalScore}/${rubric.totalPoints}`,
        judgeResult.passed ? '✓ PASSED' : '✗ FAILED'
      )

      // Check if passed
      if (judgeResult.passed && earlyStopOnPass) {
        return {
          finalOutput: output,
          finalScore: judgeResult.totalScore,
          iterations,
          passed: true,
          improvementPath,
          totalDurationMs: Date.now() - startTime,
          bestIteration: i + 1,
        }
      }

      // Check if improvement stalled
      if (i > 0) {
        const previousScore = iterations[i - 1].judgeResult.totalScore
        const improvement = judgeResult.totalScore - previousScore

        if (improvement < improvementThreshold && judgeResult.totalScore < rubric.successThreshold) {
          this.log(`Improvement stalled (${improvement} < ${improvementThreshold}), stopping`)

          // Try one more time with more aggressive hints before giving up
          if (i < maxIterations - 1) {
            const aggressiveHints = this.generateAggressiveHints(iterations)
            const lastAttemptOutput = await generator(aggressiveHints)
            const lastJudgeResult = await this.judge.judge(problem, lastAttemptOutput, rubric)

            iterations.push({
              iteration: i + 2,
              output: lastAttemptOutput,
              judgeResult: lastJudgeResult,
              hints: aggressiveHints,
              durationMs: Date.now() - iterationStart,
            })
            improvementPath.push(lastJudgeResult.totalScore)

            if (lastJudgeResult.totalScore > bestResult.score) {
              bestResult = { output: lastAttemptOutput, score: lastJudgeResult.totalScore, iteration: i + 2 }
            }
          }
          break
        }
      }
    }

    // Return best result (may not have passed)
    return {
      finalOutput: bestResult!.output,
      finalScore: bestResult!.score,
      iterations,
      passed: bestResult!.score >= rubric.successThreshold,
      improvementPath,
      totalDurationMs: Date.now() - startTime,
      bestIteration: bestResult!.iteration,
    }
  }

  /**
   * Generate hints from previous failed iterations
   */
  private generateHints(
    iterations: RefinementIteration<any>[],
    currentIteration: number
  ): RefinementHints {
    const lastIteration = iterations[iterations.length - 1]
    const judgeResult = lastIteration.judgeResult

    // Identify criteria that need improvement
    const failedCriteria = judgeResult.failedItems.map(item => {
      const score = judgeResult.itemScores.find(s => s.itemId === item.id)
      return {
        id: item.id,
        description: item.description,
        passCondition: item.passCondition,
        reasoning: score?.reasoning,
        partialCredit: score?.points,
      }
    })

    // Sort by priority: closest to passing first, then by weight
    failedCriteria.sort((a, b) => {
      const aRatio = (a.partialCredit || 0)
      const bRatio = (b.partialCredit || 0)
      return bRatio - aRatio // Higher partial credit = closer to passing
    })

    return {
      previousScore: judgeResult.totalScore,
      failedCriteria,
      specificGuidance: judgeResult.iterationHint,
      recommendations: judgeResult.recommendations,
      iterationNumber: currentIteration,
    }
  }

  /**
   * Generate more aggressive hints when improvement stalls
   */
  private generateAggressiveHints(
    iterations: RefinementIteration<any>[]
  ): RefinementHints {
    const lastIteration = iterations[iterations.length - 1]
    const judgeResult = lastIteration.judgeResult

    // Focus on the single most impactful failed criterion
    const failedCriteria = judgeResult.failedItems
      .sort((a, b) => b.points - a.points) // Highest weight first
      .slice(0, 1) // Only the top one
      .map(item => {
        const score = judgeResult.itemScores.find(s => s.itemId === item.id)
        return {
          id: item.id,
          description: item.description,
          passCondition: item.passCondition,
          reasoning: score?.reasoning,
          partialCredit: score?.points,
        }
      })

    const topFailed = failedCriteria[0]

    return {
      previousScore: judgeResult.totalScore,
      failedCriteria,
      specificGuidance: `CRITICAL: You must address "${topFailed.id}" to pass. ` +
        `Previous attempts failed because: ${topFailed.reasoning}. ` +
        `Requirement: ${topFailed.passCondition}. ` +
        `This is your final attempt - focus entirely on meeting this criterion.`,
      recommendations: [
        `Prioritize ${topFailed.id} above all else`,
        `Provide explicit evidence for: ${topFailed.passCondition}`,
        `Previous issue was: ${topFailed.reasoning}`,
      ],
      iterationNumber: iterations.length,
    }
  }

  /**
   * Log messages if verbose mode is enabled
   */
  private log(...args: any[]): void {
    if (this.config.verbose) {
      console.log('[RefinementEngine]', ...args)
    }
  }
}

// ============================================================================
// Quick Refinement Functions
// ============================================================================

/**
 * Quick function to refine without creating an instance
 */
export async function refineUntilPass<T>(
  problem: string,
  generator: (hints?: RefinementHints) => Promise<T>,
  rubric: Rubric,
  config?: RefinementEngineConfig
): Promise<RefinementResult<T>> {
  const engine = new RefinementEngine(config)
  return engine.refineUntilPass(problem, generator, rubric)
}

/**
 * Refine with streaming progress updates
 */
export async function* refineWithProgress<T>(
  problem: string,
  generator: (hints?: RefinementHints) => Promise<T>,
  rubric: Rubric,
  maxIterations: number = 3
): AsyncGenerator<{
  type: 'iteration' | 'complete'
  iteration?: number
  score?: number
  passed?: boolean
  hints?: RefinementHints
  result?: RefinementResult<T>
}> {
  const iterations: RefinementIteration<T>[] = []
  const improvementPath: number[] = []
  let bestResult: { output: T; score: number; iteration: number } | null = null
  const startTime = Date.now()
  const judge = new RubricJudge()

  for (let i = 0; i < maxIterations; i++) {
    const hints = i > 0
      ? {
        previousScore: iterations[i - 1].judgeResult.totalScore,
        failedCriteria: iterations[i - 1].judgeResult.failedItems.map(item => ({
          id: item.id,
          description: item.description,
          passCondition: item.passCondition,
        })),
        specificGuidance: iterations[i - 1].judgeResult.iterationHint,
        recommendations: iterations[i - 1].judgeResult.recommendations,
        iterationNumber: i,
      }
      : undefined

    const output = await generator(hints)
    const judgeResult = await judge.judge(problem, output, rubric)

    const iteration: RefinementIteration<T> = {
      iteration: i + 1,
      output,
      judgeResult,
      hints,
      durationMs: Date.now() - startTime,
    }

    iterations.push(iteration)
    improvementPath.push(judgeResult.totalScore)

    if (!bestResult || judgeResult.totalScore > bestResult.score) {
      bestResult = { output, score: judgeResult.totalScore, iteration: i + 1 }
    }

    yield {
      type: 'iteration',
      iteration: i + 1,
      score: judgeResult.totalScore,
      passed: judgeResult.passed,
      hints,
    }

    if (judgeResult.passed) {
      yield {
        type: 'complete',
        result: {
          finalOutput: output,
          finalScore: judgeResult.totalScore,
          iterations,
          passed: true,
          improvementPath,
          totalDurationMs: Date.now() - startTime,
          bestIteration: i + 1,
        },
      }
      return
    }
  }

  yield {
    type: 'complete',
    result: {
      finalOutput: bestResult!.output,
      finalScore: bestResult!.score,
      iterations,
      passed: bestResult!.score >= rubric.successThreshold,
      improvementPath,
      totalDurationMs: Date.now() - startTime,
      bestIteration: bestResult!.iteration,
    },
  }
}

// ============================================================================
// Hint Formatting Utilities
// ============================================================================

/**
 * Format hints into a prompt-friendly string
 */
export function formatHintsForPrompt(hints: RefinementHints): string {
  let prompt = `\n\n## IMPROVEMENT GUIDANCE (Previous Score: ${hints.previousScore}/10)\n\n`

  if (hints.specificGuidance) {
    prompt += `### Priority Focus\n${hints.specificGuidance}\n\n`
  }

  if (hints.failedCriteria.length > 0) {
    prompt += `### Failed Criteria to Address\n`
    for (const criterion of hints.failedCriteria) {
      prompt += `- **${criterion.id}**: ${criterion.description}\n`
      prompt += `  - Required: ${criterion.passCondition}\n`
      if (criterion.reasoning) {
        prompt += `  - Previous issue: ${criterion.reasoning}\n`
      }
      prompt += `\n`
    }
  }

  if (hints.recommendations.length > 0) {
    prompt += `### Recommendations\n`
    for (const rec of hints.recommendations) {
      prompt += `- ${rec}\n`
    }
  }

  return prompt
}

/**
 * Create a refinement-aware generator wrapper
 */
export function createRefinableGenerator<T>(
  baseGenerator: (prompt: string) => Promise<T>,
  basePrompt: string
): (hints?: RefinementHints) => Promise<T> {
  return async (hints?: RefinementHints) => {
    if (hints) {
      const enhancedPrompt = basePrompt + formatHintsForPrompt(hints)
      return baseGenerator(enhancedPrompt)
    }
    return baseGenerator(basePrompt)
  }
}
