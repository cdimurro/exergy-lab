/**
 * Hypothesis Racing Arena
 *
 * Orchestrates the competition between hypotheses in the Breakthrough Engine.
 * Manages 5 HypGen agents, iterative refinement loop, and winner selection.
 *
 * @see agent-pool.ts - Concurrent agent execution
 * @see breakthrough-evaluator.ts - 8-dimension scoring
 * @see enhanced-refinement-agent.ts - Feedback generation
 * @see feedback-bus.ts - Real-time communication
 */

import { AgentPool, createAgentPool, type AgentPoolConfig, type PoolStatus } from './agent-pool'
import {
  BreakthroughEvaluator,
  createBreakthroughEvaluator,
  type EvaluationConfig,
  type HypothesisEvaluation,
  type LeaderboardEntry,
  type BatchEvaluationResult,
} from './breakthrough-evaluator'
import {
  EnhancedRefinementAgent,
  createEnhancedRefinementAgent,
  type RefinementConfig,
  type RefinementContext,
} from './enhanced-refinement-agent'
import {
  FeedbackBus,
  createFeedbackBus,
  type BusConfig,
} from './feedback-bus'
import type {
  RacingHypothesis,
  HypGenAgentType,
  GenerationContext,
} from './hypgen/base'
import type { ResearchResult } from './research-agent'
import type {
  ClassificationTier,
  RefinementFeedback,
} from '../rubrics/types-breakthrough'

// ============================================================================
// Types
// ============================================================================

export interface RacingArenaConfig {
  maxIterations: number
  eliminationThreshold: number
  breakthroughThreshold: number
  winnersCount: number
  targetScore: number
  poolConfig?: Partial<AgentPoolConfig>
  evaluatorConfig?: Partial<EvaluationConfig>
  refinementConfig?: Partial<RefinementConfig>
  busConfig?: Partial<BusConfig>
}

export const DEFAULT_RACING_CONFIG: RacingArenaConfig = {
  maxIterations: 5,
  eliminationThreshold: 5.0,
  breakthroughThreshold: 9.0,
  winnersCount: 3,
  targetScore: 9.0,
}

export interface RaceState {
  status: 'idle' | 'generating' | 'evaluating' | 'refining' | 'complete' | 'error'
  currentIteration: number
  maxIterations: number
  hypotheses: Map<string, RacingHypothesis>
  leaderboard: LeaderboardEntry[]
  breakthroughCandidates: RacingHypothesis[]
  eliminatedHypotheses: RacingHypothesis[]
  activeHypotheses: RacingHypothesis[]
  statistics: RaceStatistics
  startTime: number
  endTime?: number
}

export interface RaceStatistics {
  totalGenerated: number
  totalEliminated: number
  totalBreakthroughs: number
  averageScore: number
  highestScore: number
  lowestActiveScore: number
  iterationTimes: number[]
  byAgent: Map<HypGenAgentType, {
    generated: number
    surviving: number
    breakthroughs: number
    averageScore: number
  }>
}

export interface RaceResult {
  winners: RacingHypothesis[]
  allHypotheses: RacingHypothesis[]
  eliminated: RacingHypothesis[]
  breakthroughs: RacingHypothesis[]
  finalLeaderboard: LeaderboardEntry[]
  statistics: RaceStatistics
  totalIterations: number
  totalTimeMs: number
  earlyTermination: boolean
  terminationReason?: string
}

export type RaceEventType =
  | 'race_started'
  | 'iteration_started'
  | 'generation_complete'
  | 'evaluation_complete'
  | 'refinement_complete'
  | 'hypothesis_eliminated'
  | 'breakthrough_detected'
  | 'iteration_complete'
  | 'race_complete'
  | 'race_error'

export interface RaceEvent {
  type: RaceEventType
  iteration?: number
  hypothesisId?: string
  score?: number
  classification?: ClassificationTier
  state?: Partial<RaceState>
  message?: string
  timestamp: number
}

export type RaceEventCallback = (event: RaceEvent) => void

// ============================================================================
// Hypothesis Racing Arena
// ============================================================================

export class HypothesisRacingArena {
  private config: RacingArenaConfig
  private agentPool: AgentPool
  private evaluator: BreakthroughEvaluator
  private refinementAgent: EnhancedRefinementAgent
  private feedbackBus: FeedbackBus
  private state: RaceState
  private eventCallbacks: RaceEventCallback[] = []
  private abortController: AbortController | null = null

  constructor(config: Partial<RacingArenaConfig> = {}) {
    this.config = { ...DEFAULT_RACING_CONFIG, ...config }

    // Initialize components
    this.agentPool = createAgentPool(config.poolConfig)
    this.evaluator = createBreakthroughEvaluator(config.evaluatorConfig)
    this.refinementAgent = createEnhancedRefinementAgent(config.refinementConfig)
    this.feedbackBus = createFeedbackBus(config.busConfig)

    // Initialize state
    this.state = this.createInitialState()

    // Wire up internal event handlers
    this.setupInternalEventHandlers()
  }

  /**
   * Subscribe to race events
   */
  onEvent(callback: RaceEventCallback): () => void {
    this.eventCallbacks.push(callback)
    return () => {
      const index = this.eventCallbacks.indexOf(callback)
      if (index >= 0) this.eventCallbacks.splice(index, 1)
    }
  }

  /**
   * Get current race state
   */
  getState(): RaceState {
    return { ...this.state }
  }

  /**
   * Get current leaderboard
   */
  getLeaderboard(): LeaderboardEntry[] {
    return [...this.state.leaderboard]
  }

  /**
   * Run the complete hypothesis race
   */
  async runRace(
    research: ResearchResult,
    problem: string
  ): Promise<RaceResult> {
    const startTime = Date.now()
    this.abortController = new AbortController()

    console.log('[HypothesisRacingArena] Starting race with research:', research.query)

    // Reset state for new race
    this.state = this.createInitialState()
    this.state.status = 'generating'
    this.state.startTime = startTime

    this.emit({
      type: 'race_started',
      message: `Starting hypothesis race with ${this.config.maxIterations} max iterations`,
      timestamp: Date.now(),
    })

    try {
      // Start the feedback bus
      this.feedbackBus.start()

      // Main racing loop
      for (let iteration = 1; iteration <= this.config.maxIterations; iteration++) {
        // Check for abort
        if (this.abortController.signal.aborted) {
          throw new Error('Race aborted')
        }

        const iterationStartTime = Date.now()
        this.state.currentIteration = iteration

        this.emit({
          type: 'iteration_started',
          iteration,
          message: `Starting iteration ${iteration}/${this.config.maxIterations}`,
          timestamp: Date.now(),
        })

        // Phase 1: Generate (or refine) hypotheses
        await this.generateOrRefineHypotheses(research, iteration)

        // Phase 2: Evaluate all active hypotheses
        const evalResult = await this.evaluateAllHypotheses(problem, iteration)

        // Phase 3: Process eliminations and breakthroughs
        this.processEvaluationResults(evalResult, iteration)

        // Phase 4: Generate refinement feedback
        await this.generateRefinementFeedback(problem, iteration)

        // Record iteration time
        this.state.statistics.iterationTimes.push(Date.now() - iterationStartTime)

        // Emit iteration complete
        this.emit({
          type: 'iteration_complete',
          iteration,
          state: {
            leaderboard: this.state.leaderboard,
            activeHypotheses: this.state.activeHypotheses,
            eliminatedHypotheses: this.state.eliminatedHypotheses,
            breakthroughCandidates: this.state.breakthroughCandidates,
          },
          timestamp: Date.now(),
        })

        // Check for early termination conditions
        if (this.shouldTerminateEarly()) {
          console.log('[HypothesisRacingArena] Early termination triggered')
          break
        }
      }

      // Final cleanup and result generation
      this.state.status = 'complete'
      this.state.endTime = Date.now()

      const result = this.generateRaceResult(startTime)

      this.emit({
        type: 'race_complete',
        state: { statistics: this.state.statistics },
        message: `Race complete. ${result.winners.length} winners, ${result.breakthroughs.length} breakthroughs`,
        timestamp: Date.now(),
      })

      return result

    } catch (error) {
      this.state.status = 'error'
      this.state.endTime = Date.now()

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      this.emit({
        type: 'race_error',
        message: errorMessage,
        timestamp: Date.now(),
      })

      throw error

    } finally {
      this.feedbackBus.stop()
      this.abortController = null
    }
  }

  /**
   * Abort the current race
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
    }
  }

  // ============================================================================
  // Internal Methods
  // ============================================================================

  /**
   * Create initial race state
   */
  private createInitialState(): RaceState {
    return {
      status: 'idle',
      currentIteration: 0,
      maxIterations: this.config.maxIterations,
      hypotheses: new Map(),
      leaderboard: [],
      breakthroughCandidates: [],
      eliminatedHypotheses: [],
      activeHypotheses: [],
      statistics: {
        totalGenerated: 0,
        totalEliminated: 0,
        totalBreakthroughs: 0,
        averageScore: 0,
        highestScore: 0,
        lowestActiveScore: 0,
        iterationTimes: [],
        byAgent: new Map(),
      },
      startTime: 0,
    }
  }

  /**
   * Setup internal event handlers
   */
  private setupInternalEventHandlers(): void {
    // Subscribe to evaluator events
    this.evaluator.onEvent((event) => {
      if (event.type === 'breakthrough_detected') {
        this.emit({
          type: 'breakthrough_detected',
          hypothesisId: event.hypothesisId,
          score: event.score,
          classification: event.classification,
          timestamp: Date.now(),
        })
      }
      if (event.type === 'hypothesis_eliminated') {
        this.emit({
          type: 'hypothesis_eliminated',
          hypothesisId: event.hypothesisId,
          score: event.score,
          timestamp: Date.now(),
        })
      }
    })

    // Subscribe to feedback bus for race updates
    this.feedbackBus.subscribe('racing-arena', ['iteration_complete'], (message) => {
      // Process iteration complete messages
    })
  }

  /**
   * Generate or refine hypotheses
   */
  private async generateOrRefineHypotheses(
    research: ResearchResult,
    iteration: number
  ): Promise<void> {
    this.state.status = 'generating'

    if (iteration === 1) {
      // First iteration: generate new hypotheses from all agents
      const generationContext: GenerationContext = {
        research,
        iteration,
        competitorHypotheses: [],
      }

      const poolResult = await this.agentPool.generateAll(generationContext)

      // Add all hypotheses to state
      for (const [agentType, hypotheses] of poolResult.hypothesesByAgent) {
        for (const hypothesis of hypotheses) {
          this.state.hypotheses.set(hypothesis.id, hypothesis)
          this.state.activeHypotheses.push(hypothesis)
        }

        // Update agent statistics
        const agentStats = this.state.statistics.byAgent.get(agentType) || {
          generated: 0,
          surviving: 0,
          breakthroughs: 0,
          averageScore: 0,
        }
        agentStats.generated += hypotheses.length
        agentStats.surviving = hypotheses.length
        this.state.statistics.byAgent.set(agentType, agentStats)
      }

      this.state.statistics.totalGenerated = this.state.activeHypotheses.length

    } else {
      // Subsequent iterations: refine existing hypotheses using feedback
      const feedbackMap = new Map<string, RefinementFeedback>()

      // Collect feedback for each active hypothesis
      for (const hypothesis of this.state.activeHypotheses) {
        const history = this.feedbackBus.getHistory(`hypgen-${hypothesis.agentSource}` as any)
        const lastFeedback = history
          .filter(m => m.type === 'refinement_ready')
          .find(m => (m.payload as any).hypothesisId === hypothesis.id)

        if (lastFeedback) {
          feedbackMap.set(hypothesis.id, (lastFeedback.payload as any).feedback)
        }
      }

      // Refine hypotheses
      const generationContext: GenerationContext = {
        research,
        iteration,
        competitorHypotheses: this.state.activeHypotheses,
      }

      const refinedHypotheses = await this.agentPool.refineHypotheses(
        this.state.activeHypotheses,
        feedbackMap,
        generationContext
      )

      // Update hypotheses in state
      for (const refined of refinedHypotheses) {
        this.state.hypotheses.set(refined.id, refined)
        const idx = this.state.activeHypotheses.findIndex(h => h.id === refined.id)
        if (idx >= 0) {
          this.state.activeHypotheses[idx] = refined
        }
      }
    }

    this.emit({
      type: 'generation_complete',
      iteration,
      message: `Generated/refined ${this.state.activeHypotheses.length} hypotheses`,
      timestamp: Date.now(),
    })
  }

  /**
   * Evaluate all active hypotheses
   */
  private async evaluateAllHypotheses(
    problem: string,
    iteration: number
  ): Promise<BatchEvaluationResult> {
    this.state.status = 'evaluating'

    const evalResult = await this.evaluator.evaluateBatch(
      this.state.activeHypotheses,
      problem,
      iteration
    )

    // Update leaderboard
    this.state.leaderboard = evalResult.leaderboard

    // Update statistics
    const scores = evalResult.evaluations.map(e => e.overallScore)
    this.state.statistics.averageScore = scores.reduce((a, b) => a + b, 0) / scores.length
    this.state.statistics.highestScore = Math.max(...scores)

    this.emit({
      type: 'evaluation_complete',
      iteration,
      message: `Evaluated ${evalResult.evaluations.length} hypotheses. Top score: ${this.state.statistics.highestScore.toFixed(2)}`,
      timestamp: Date.now(),
    })

    return evalResult
  }

  /**
   * Process evaluation results (eliminations, breakthroughs)
   */
  private processEvaluationResults(
    evalResult: BatchEvaluationResult,
    iteration: number
  ): void {
    // Process eliminations
    for (const eliminated of evalResult.eliminatedHypotheses) {
      const idx = this.state.activeHypotheses.findIndex(h => h.id === eliminated.id)
      if (idx >= 0) {
        this.state.activeHypotheses.splice(idx, 1)
        this.state.eliminatedHypotheses.push(eliminated)
        this.state.statistics.totalEliminated++

        // Update agent statistics
        const agentStats = this.state.statistics.byAgent.get(eliminated.agentSource)
        if (agentStats) {
          agentStats.surviving--
        }
      }
    }

    // Process breakthrough candidates
    for (const breakthrough of evalResult.breakthroughCandidates) {
      const exists = this.state.breakthroughCandidates.find(h => h.id === breakthrough.id)
      if (!exists) {
        this.state.breakthroughCandidates.push(breakthrough)
        this.state.statistics.totalBreakthroughs++

        // Update agent statistics
        const agentStats = this.state.statistics.byAgent.get(breakthrough.agentSource)
        if (agentStats) {
          agentStats.breakthroughs++
        }
      }
    }

    // Update active hypotheses list
    this.state.activeHypotheses = evalResult.activeHypotheses

    // Update lowest active score
    const activeScores = this.state.activeHypotheses.map(h => h.scores.overall)
    this.state.statistics.lowestActiveScore = activeScores.length > 0
      ? Math.min(...activeScores)
      : 0

    // Publish events
    for (const eliminated of evalResult.eliminatedHypotheses) {
      this.feedbackBus.publishHypothesisEliminated(
        eliminated,
        `Score ${eliminated.scores.overall.toFixed(1)} below threshold`,
        iteration
      )
    }

    for (const breakthrough of evalResult.breakthroughCandidates) {
      this.feedbackBus.publishBreakthroughFound(
        breakthrough,
        breakthrough.status === 'breakthrough' ? 'breakthrough' : 'major_discovery',
        iteration
      )
    }
  }

  /**
   * Generate refinement feedback for next iteration
   */
  private async generateRefinementFeedback(
    problem: string,
    iteration: number
  ): Promise<void> {
    if (iteration >= this.config.maxIterations) {
      // No need to generate feedback for last iteration
      return
    }

    this.state.status = 'refining'

    // Build refinement contexts for each active hypothesis
    const contexts: RefinementContext[] = []

    for (const hypothesis of this.state.activeHypotheses) {
      const evaluation = await this.evaluator.evaluateHypothesis(hypothesis, problem, iteration)

      contexts.push({
        evaluation,
        hypothesis,
        leaderboard: this.state.leaderboard,
        iteration,
        maxIterations: this.config.maxIterations,
        targetScore: this.config.targetScore,
      })
    }

    // Generate batch feedback
    const feedbackMap = await this.refinementAgent.generateBatchFeedback(contexts)

    // Publish feedback to bus
    for (const [hypothesisId, feedback] of feedbackMap) {
      this.feedbackBus.publishRefinementReady(feedback, iteration)
    }

    // Publish iteration complete
    this.feedbackBus.publishIterationComplete(iteration, this.config.maxIterations, {
      activeCount: this.state.activeHypotheses.length,
      eliminatedCount: this.state.eliminatedHypotheses.length,
      breakthroughCount: this.state.breakthroughCandidates.length,
      leaderboard: this.state.leaderboard,
    })

    this.emit({
      type: 'refinement_complete',
      iteration,
      message: `Generated refinement feedback for ${feedbackMap.size} hypotheses`,
      timestamp: Date.now(),
    })
  }

  /**
   * Check if race should terminate early
   */
  private shouldTerminateEarly(): boolean {
    // Terminate if all hypotheses eliminated
    if (this.state.activeHypotheses.length === 0) {
      return true
    }

    // Terminate if we have enough breakthrough candidates
    if (this.state.breakthroughCandidates.length >= this.config.winnersCount) {
      // Check if all breakthroughs are above threshold
      const allAboveThreshold = this.state.breakthroughCandidates.every(
        h => h.scores.overall >= this.config.breakthroughThreshold
      )
      if (allAboveThreshold) {
        return true
      }
    }

    // Terminate if scores have stabilized (no improvement in last iteration)
    if (this.state.currentIteration >= 3) {
      const recentScores = this.state.leaderboard.slice(0, 5).map(e => e.scoreChange)
      const avgChange = recentScores.reduce((a, b) => a + b, 0) / recentScores.length
      if (Math.abs(avgChange) < 0.1) {
        // Scores have stabilized
        return true
      }
    }

    return false
  }

  /**
   * Generate final race result
   */
  private generateRaceResult(startTime: number): RaceResult {
    // Sort active hypotheses by score
    const sortedActive = [...this.state.activeHypotheses]
      .sort((a, b) => b.scores.overall - a.scores.overall)

    // Select winners (prioritize breakthroughs)
    const winners: RacingHypothesis[] = []

    // Add breakthrough candidates first
    for (const breakthrough of this.state.breakthroughCandidates) {
      if (winners.length < this.config.winnersCount) {
        winners.push(breakthrough)
      }
    }

    // Fill remaining slots with top active hypotheses
    for (const hypothesis of sortedActive) {
      if (winners.length >= this.config.winnersCount) break
      if (!winners.find(w => w.id === hypothesis.id)) {
        winners.push(hypothesis)
      }
    }

    // Calculate final statistics
    const allHypotheses = Array.from(this.state.hypotheses.values())

    // Update agent average scores
    for (const [agentType, stats] of this.state.statistics.byAgent) {
      const agentHypotheses = allHypotheses.filter(h => h.agentSource === agentType)
      if (agentHypotheses.length > 0) {
        stats.averageScore = agentHypotheses.reduce((sum, h) => sum + h.scores.overall, 0) / agentHypotheses.length
      }
    }

    return {
      winners,
      allHypotheses,
      eliminated: this.state.eliminatedHypotheses,
      breakthroughs: this.state.breakthroughCandidates,
      finalLeaderboard: this.state.leaderboard,
      statistics: this.state.statistics,
      totalIterations: this.state.currentIteration,
      totalTimeMs: (this.state.endTime || Date.now()) - startTime,
      earlyTermination: this.state.currentIteration < this.config.maxIterations,
      terminationReason: this.getTerminationReason(),
    }
  }

  /**
   * Get reason for termination
   */
  private getTerminationReason(): string | undefined {
    if (this.state.currentIteration >= this.config.maxIterations) {
      return 'Reached maximum iterations'
    }
    if (this.state.activeHypotheses.length === 0) {
      return 'All hypotheses eliminated'
    }
    if (this.state.breakthroughCandidates.length >= this.config.winnersCount) {
      return 'Sufficient breakthrough candidates found'
    }
    return 'Scores stabilized'
  }

  /**
   * Emit a race event
   */
  private emit(event: RaceEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event)
      } catch (error) {
        console.error('[HypothesisRacingArena] Event callback error:', error)
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createHypothesisRacingArena(
  config?: Partial<RacingArenaConfig>
): HypothesisRacingArena {
  return new HypothesisRacingArena(config)
}

// ============================================================================
// Convenience Function
// ============================================================================

/**
 * Run a complete hypothesis race
 */
export async function runHypothesisRace(
  research: ResearchResult,
  problem: string,
  config?: Partial<RacingArenaConfig>,
  onEvent?: RaceEventCallback
): Promise<RaceResult> {
  const arena = createHypothesisRacingArena(config)

  if (onEvent) {
    arena.onEvent(onEvent)
  }

  return arena.runRace(research, problem)
}
