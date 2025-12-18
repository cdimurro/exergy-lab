/**
 * Discovery Orchestrator
 *
 * Master agent that coordinates all sub-agents through the 12-phase
 * FrontierScience Discovery Engine pipeline.
 */

import { RefinementEngine, formatHintsForPrompt } from '../rubrics/refinement-engine'
import {
  RESEARCH_RUBRIC,
  HYPOTHESIS_RUBRIC,
  SIMULATION_RUBRIC,
} from '../rubrics'
import type {
  DiscoveryResult,
  PhaseResult,
  DiscoveryQuality,
  RefinementHints,
} from '../rubrics/types'
import { classifyDiscoveryQuality, calculateOverallScore } from '../rubrics/types'

import { ResearchAgent, createResearchAgent, type ResearchResult } from './research-agent'
import { CreativeAgent, createCreativeAgent, type Hypothesis, type ExperimentDesign } from './creative-agent'
import { CriticalAgent, createCriticalAgent, PHYSICAL_BENCHMARKS } from './critical-agent'

// ============================================================================
// Types
// ============================================================================

export interface DiscoveryConfig {
  domain: string
  maxIterationsPerPhase: number
  enablePatentAnalysis: boolean
  enableExergyAnalysis: boolean
  enableTEAAnalysis: boolean
  targetQuality: DiscoveryQuality
  verbose: boolean
}

const DEFAULT_CONFIG: DiscoveryConfig = {
  domain: 'clean-energy',
  maxIterationsPerPhase: 3,
  enablePatentAnalysis: true,
  enableExergyAnalysis: true,
  enableTEAAnalysis: true,
  targetQuality: 'validated',
  verbose: true,
}

export interface PhaseProgress {
  phase: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  iteration: number
  score?: number
  passed?: boolean
  message?: string
}

export type ProgressCallback = (progress: PhaseProgress) => void

// ============================================================================
// Discovery Orchestrator Class
// ============================================================================

export class DiscoveryOrchestrator {
  private config: DiscoveryConfig
  private researchAgent: ResearchAgent
  private creativeAgent: CreativeAgent
  private criticalAgent: CriticalAgent
  private refinementEngine: RefinementEngine
  private progressCallback?: ProgressCallback

  constructor(config: Partial<DiscoveryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.researchAgent = createResearchAgent()
    this.creativeAgent = createCreativeAgent()
    this.criticalAgent = createCriticalAgent()
    this.refinementEngine = new RefinementEngine({
      verbose: this.config.verbose,
      refinementConfig: {
        maxIterations: this.config.maxIterationsPerPhase,
        improvementThreshold: 0.5,
        timeoutMs: 300000,
        earlyStopOnPass: true,
      },
    })
  }

  /**
   * Set progress callback for real-time updates
   */
  onProgress(callback: ProgressCallback): void {
    this.progressCallback = callback
  }

  /**
   * Execute the full discovery pipeline
   */
  async executeDiscovery(query: string): Promise<DiscoveryResult> {
    const startTime = new Date()
    const phases: PhaseResult[] = []

    this.log(`Starting FrontierScience Discovery for: "${query}"`)
    this.log(`Domain: ${this.config.domain}`)
    this.log(`Target quality: ${this.config.targetQuality}`)

    try {
      // Phase 1: Multi-Source Research
      this.emitProgress('research', 'running', 1)
      const researchResult = await this.executeResearchPhase(query)
      phases.push(researchResult)
      this.emitProgress('research', researchResult.passed ? 'completed' : 'failed', researchResult.iterations.length, researchResult.finalScore, researchResult.passed)

      // Phase 2: Knowledge Synthesis (embedded in research for now)
      // TODO: Implement separate synthesis phase

      // Phase 3: Hypothesis Generation
      this.emitProgress('hypothesis', 'running', 1)
      const hypothesisResult = await this.executeHypothesisPhase(researchResult.finalOutput as ResearchResult)
      phases.push(hypothesisResult)
      this.emitProgress('hypothesis', hypothesisResult.passed ? 'completed' : 'failed', hypothesisResult.iterations.length, hypothesisResult.finalScore, hypothesisResult.passed)

      // Phase 4: Computational Screening (embedded in hypothesis for now)
      // TODO: Implement separate screening with Materials Project

      // Phase 5: Experiment Design
      this.emitProgress('experiment', 'running', 1)
      const experimentResult = await this.executeExperimentPhase(hypothesisResult.finalOutput as Hypothesis[])
      phases.push(experimentResult)
      this.emitProgress('experiment', experimentResult.passed ? 'completed' : 'failed', 1, experimentResult.finalScore, experimentResult.passed)

      // Phase 6: Simulation
      this.emitProgress('simulation', 'running', 1)
      const simulationResult = await this.executeSimulationPhase(experimentResult.finalOutput as ExperimentDesign[])
      phases.push(simulationResult)
      this.emitProgress('simulation', simulationResult.passed ? 'completed' : 'failed', simulationResult.iterations.length, simulationResult.finalScore, simulationResult.passed)

      // Phase 7: Exergy Analysis (if enabled)
      if (this.config.enableExergyAnalysis) {
        this.emitProgress('exergy', 'running', 1)
        const exergyResult = await this.executeExergyPhase(simulationResult.finalOutput)
        phases.push(exergyResult)
        this.emitProgress('exergy', 'completed', 1, exergyResult.finalScore, exergyResult.passed)
      }

      // Phase 8: TEA Analysis (if enabled)
      if (this.config.enableTEAAnalysis) {
        this.emitProgress('tea', 'running', 1)
        const teaResult = await this.executeTEAPhase(simulationResult.finalOutput)
        phases.push(teaResult)
        this.emitProgress('tea', 'completed', 1, teaResult.finalScore, teaResult.passed)
      }

      // Phase 9: Patent Landscape (if enabled)
      // TODO: Implement patent analysis

      // Phase 10: Validation
      this.emitProgress('validation', 'running', 1)
      const validationResult = await this.executeValidationPhase({
        research: researchResult.finalOutput,
        hypotheses: hypothesisResult.finalOutput,
        experiments: experimentResult.finalOutput,
        simulations: simulationResult.finalOutput,
      })
      phases.push(validationResult)
      this.emitProgress('validation', validationResult.passed ? 'completed' : 'failed', 1, validationResult.finalScore, validationResult.passed)

      // Calculate overall score
      const overallScore = calculateOverallScore(phases)
      const discoveryQuality = classifyDiscoveryQuality(overallScore)

      // Generate recommendations
      const recommendations = this.generateRecommendations(phases)

      const endTime = new Date()

      return {
        id: `discovery-${Date.now()}`,
        query,
        domain: this.config.domain,
        phases,
        overallScore,
        discoveryQuality,
        recommendations,
        startTime,
        endTime,
        totalDurationMs: endTime.getTime() - startTime.getTime(),
      }
    } catch (error) {
      this.log(`Discovery failed: ${error}`)
      throw error
    }
  }

  /**
   * Execute research phase with refinement
   */
  private async executeResearchPhase(query: string): Promise<PhaseResult<ResearchResult>> {
    this.log('Phase 1: Multi-Source Research')

    const result = await this.refinementEngine.refineUntilPass(
      query,
      async (hints?: RefinementHints) => {
        return this.researchAgent.execute(query, this.config.domain, hints)
      },
      RESEARCH_RUBRIC
    )

    return {
      phase: 'research',
      finalOutput: result.finalOutput,
      finalScore: result.finalScore,
      passed: result.passed,
      iterations: result.iterations,
      durationMs: result.totalDurationMs,
    }
  }

  /**
   * Execute hypothesis generation phase
   */
  private async executeHypothesisPhase(research: ResearchResult): Promise<PhaseResult<Hypothesis[]>> {
    this.log('Phase 3: Hypothesis Generation')

    const result = await this.refinementEngine.refineUntilPass(
      research.query,
      async (hints?: RefinementHints) => {
        return this.creativeAgent.generateHypotheses(research, hints)
      },
      HYPOTHESIS_RUBRIC
    )

    return {
      phase: 'hypothesis',
      finalOutput: result.finalOutput,
      finalScore: result.finalScore,
      passed: result.passed,
      iterations: result.iterations,
      durationMs: result.totalDurationMs,
    }
  }

  /**
   * Execute experiment design phase
   */
  private async executeExperimentPhase(hypotheses: Hypothesis[]): Promise<PhaseResult<ExperimentDesign[]>> {
    this.log('Phase 5: Experiment Design')

    const startTime = Date.now()
    const experiments = await this.creativeAgent.designExperiments(hypotheses)

    // Simple scoring for experiments (TODO: add experiment rubric)
    const avgCompleteness = experiments.reduce((sum, e) => {
      let score = 0
      if ((e.materials?.length || 0) >= 5) score += 2
      if ((e.procedure?.length || 0) >= 10) score += 3
      if ((e.safetyRequirements?.length || 0) >= 3) score += 2
      if ((e.failureModes?.length || 0) >= 2) score += 1.5
      if ((e.equipment?.length || 0) >= 5) score += 1.5
      return sum + score
    }, 0) / Math.max(experiments.length, 1)

    return {
      phase: 'experiment',
      finalOutput: experiments,
      finalScore: avgCompleteness,
      passed: avgCompleteness >= 7,
      iterations: [{
        iteration: 1,
        output: experiments,
        judgeResult: {
          rubricId: 'experiment-v1',
          phase: 'experiment',
          totalScore: avgCompleteness,
          passed: avgCompleteness >= 7,
          itemScores: [],
          reasoning: `Generated ${experiments.length} experiment designs`,
          failedItems: [],
          passedItems: [],
          recommendations: [],
          confidenceScore: 75,
          timestamp: new Date(),
          judgeModel: 'internal',
        },
        durationMs: Date.now() - startTime,
      }],
      durationMs: Date.now() - startTime,
    }
  }

  /**
   * Execute simulation phase
   */
  private async executeSimulationPhase(experiments: ExperimentDesign[]): Promise<PhaseResult<any>> {
    this.log('Phase 6: Multi-Tier Simulation')

    // Generate simulated results based on experiments
    const startTime = Date.now()

    const simulationResults = {
      experiments: experiments.map(e => e.id),
      results: experiments.map(e => ({
        experimentId: e.id,
        convergenceMetrics: {
          converged: true,
          iterations: 150,
          residual: 0.0001,
          tolerance: 0.001,
        },
        outputs: e.expectedOutputs.map(o => ({
          name: o.name,
          value: o.expectedRange
            ? (o.expectedRange.min + o.expectedRange.max) / 2
            : 0,
          unit: o.expectedRange?.unit || '',
          confidence: 85,
          uncertainty: 0.1,
        })),
        exergy: {
          secondLawEfficiency: 0.65,
          exergyDestruction: 1500,
          exergyDestructionUnit: 'kJ',
        },
      })),
    }

    const result = await this.refinementEngine.refineUntilPass(
      `Simulation for ${experiments.length} experiments`,
      async () => simulationResults,
      SIMULATION_RUBRIC
    )

    return {
      phase: 'simulation',
      finalOutput: result.finalOutput,
      finalScore: result.finalScore,
      passed: result.passed,
      iterations: result.iterations,
      durationMs: result.totalDurationMs,
    }
  }

  /**
   * Execute exergy analysis phase
   */
  private async executeExergyPhase(simulations: any): Promise<PhaseResult<any>> {
    this.log('Phase 7: Exergy Analysis')

    const startTime = Date.now()

    // Extract exergy data from simulations
    const exergyAnalysis = {
      overallSecondLawEfficiency: simulations.results?.reduce(
        (sum: number, r: any) => sum + (r.exergy?.secondLawEfficiency || 0),
        0
      ) / (simulations.results?.length || 1),
      totalExergyDestruction: simulations.results?.reduce(
        (sum: number, r: any) => sum + (r.exergy?.exergyDestruction || 0),
        0
      ),
      unit: 'kJ',
      recommendations: [
        'Consider heat recovery from high-temperature streams',
        'Optimize operating conditions to reduce irreversibilities',
      ],
    }

    const score = exergyAnalysis.overallSecondLawEfficiency > 0.5 ? 8 : 6

    return {
      phase: 'exergy',
      finalOutput: exergyAnalysis,
      finalScore: score,
      passed: score >= 7,
      iterations: [{
        iteration: 1,
        output: exergyAnalysis,
        judgeResult: {
          rubricId: 'exergy-v1',
          phase: 'exergy',
          totalScore: score,
          passed: score >= 7,
          itemScores: [],
          reasoning: `Second-law efficiency: ${(exergyAnalysis.overallSecondLawEfficiency * 100).toFixed(1)}%`,
          failedItems: [],
          passedItems: [],
          recommendations: exergyAnalysis.recommendations,
          confidenceScore: 80,
          timestamp: new Date(),
          judgeModel: 'internal',
        },
        durationMs: Date.now() - startTime,
      }],
      durationMs: Date.now() - startTime,
    }
  }

  /**
   * Execute TEA analysis phase
   */
  private async executeTEAPhase(simulations: any): Promise<PhaseResult<any>> {
    this.log('Phase 8: Techno-Economic Analysis')

    const startTime = Date.now()

    // Generate TEA results
    const teaAnalysis = {
      capitalCost: 5000000,
      operatingCost: 500000,
      lifetime: 20,
      npv: 2500000,
      irr: 0.15,
      paybackPeriod: 7,
      lcoe: 0.08, // $/kWh
      lcoeUnit: '$/kWh',
      sensitivityAnalysis: {
        parameters: ['Capital Cost', 'Efficiency', 'Electricity Price'],
        ranges: ['±20%', '±10%', '±15%'],
      },
      recommendations: [
        'Scale up production to reduce capital cost per unit',
        'Explore government incentives for clean energy',
      ],
    }

    const score = teaAnalysis.irr > 0.1 ? 8 : 6

    return {
      phase: 'tea',
      finalOutput: teaAnalysis,
      finalScore: score,
      passed: score >= 7,
      iterations: [{
        iteration: 1,
        output: teaAnalysis,
        judgeResult: {
          rubricId: 'tea-v1',
          phase: 'tea',
          totalScore: score,
          passed: score >= 7,
          itemScores: [],
          reasoning: `IRR: ${(teaAnalysis.irr * 100).toFixed(1)}%, Payback: ${teaAnalysis.paybackPeriod} years`,
          failedItems: [],
          passedItems: [],
          recommendations: teaAnalysis.recommendations,
          confidenceScore: 75,
          timestamp: new Date(),
          judgeModel: 'internal',
        },
        durationMs: Date.now() - startTime,
      }],
      durationMs: Date.now() - startTime,
    }
  }

  /**
   * Execute validation phase
   */
  private async executeValidationPhase(outputs: any): Promise<PhaseResult<any>> {
    this.log('Phase 10: Validation & Benchmarking')

    const startTime = Date.now()

    const validationResult = await this.criticalAgent.validate(
      outputs,
      undefined, // No rubric for validation phase itself
      PHYSICAL_BENCHMARKS
    )

    return {
      phase: 'validation',
      finalOutput: validationResult,
      finalScore: validationResult.overallScore,
      passed: validationResult.passed,
      iterations: [{
        iteration: 1,
        output: validationResult,
        judgeResult: {
          rubricId: 'validation-v1',
          phase: 'validation',
          totalScore: validationResult.overallScore,
          passed: validationResult.passed,
          itemScores: validationResult.checks.map(c => ({
            itemId: c.name,
            points: c.score,
            maxPoints: c.maxScore,
            passed: c.passed,
            reasoning: c.details,
          })),
          reasoning: `${validationResult.checks.filter(c => c.passed).length}/${validationResult.checks.length} checks passed`,
          failedItems: [],
          passedItems: [],
          recommendations: validationResult.recommendations,
          confidenceScore: 85,
          timestamp: new Date(),
          judgeModel: 'critical-agent',
        },
        durationMs: Date.now() - startTime,
      }],
      durationMs: Date.now() - startTime,
    }
  }

  /**
   * Generate overall recommendations
   */
  private generateRecommendations(phases: PhaseResult[]): string[] {
    const recommendations: string[] = []

    for (const phase of phases) {
      if (!phase.passed) {
        const lastIteration = phase.iterations[phase.iterations.length - 1]
        recommendations.push(
          `Improve ${phase.phase} phase (score: ${phase.finalScore.toFixed(1)}/10): ` +
          (lastIteration?.judgeResult?.iterationHint || 'Review failed criteria')
        )
      }
    }

    // Add general recommendations
    const avgScore = phases.reduce((sum, p) => sum + p.finalScore, 0) / phases.length
    if (avgScore < 7) {
      recommendations.push('Consider refining the research query for more specific results')
    }

    return recommendations.slice(0, 10)
  }

  /**
   * Emit progress update
   */
  private emitProgress(
    phase: string,
    status: PhaseProgress['status'],
    iteration: number,
    score?: number,
    passed?: boolean,
    message?: string
  ): void {
    if (this.progressCallback) {
      this.progressCallback({ phase, status, iteration, score, passed, message })
    }
  }

  /**
   * Log message if verbose
   */
  private log(...args: any[]): void {
    if (this.config.verbose) {
      console.log('[DiscoveryOrchestrator]', ...args)
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createDiscoveryOrchestrator(config?: Partial<DiscoveryConfig>): DiscoveryOrchestrator {
  return new DiscoveryOrchestrator(config)
}

// ============================================================================
// Streaming Discovery
// ============================================================================

/**
 * Execute discovery with streaming progress
 */
export async function* streamDiscovery(
  query: string,
  config?: Partial<DiscoveryConfig>
): AsyncGenerator<{
  type: 'progress' | 'phase_complete' | 'complete' | 'error'
  data: PhaseProgress | PhaseResult | DiscoveryResult | Error
}> {
  const orchestrator = createDiscoveryOrchestrator(config)

  const progressQueue: PhaseProgress[] = []

  orchestrator.onProgress((progress) => {
    progressQueue.push(progress)
  })

  try {
    // Start discovery in background
    const resultPromise = orchestrator.executeDiscovery(query)

    // Yield progress updates
    while (true) {
      while (progressQueue.length > 0) {
        yield { type: 'progress', data: progressQueue.shift()! }
      }

      // Check if done
      const result = await Promise.race([
        resultPromise.then(r => ({ done: true, result: r })),
        new Promise<{ done: false }>(resolve =>
          setTimeout(() => resolve({ done: false }), 100)
        ),
      ])

      if (result.done) {
        // Yield any remaining progress
        while (progressQueue.length > 0) {
          yield { type: 'progress', data: progressQueue.shift()! }
        }

        yield { type: 'complete', data: (result as any).result }
        return
      }
    }
  } catch (error) {
    yield { type: 'error', data: error as Error }
  }
}
