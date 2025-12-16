/**
 * Workflow Planner - Generates execution plans for unified discovery workflows
 *
 * This is the "brain" that analyzes user queries and creates comprehensive
 * execution plans across Research → Experiments → Simulations → TEA phases.
 */

import type {
  WorkflowInput,
  ExecutionPlan,
  PlanPhase,
  PhaseDependency,
  PhaseType,
  PhaseParameters,
} from '@/types/workflow'
import type { ToolName, ToolCall } from '@/types/agent'
import type { Domain } from '@/types/discovery'
import { executeWithTools } from '../ai/model-router'

// ============================================================================
// Workflow Planner Class
// ============================================================================

export class WorkflowPlanner {
  /**
   * Generate comprehensive execution plan from user input
   */
  async generatePlan(input: WorkflowInput): Promise<ExecutionPlan> {
    const { query, domains, goals, options = {} } = input

    // Step 1: Analyze query to determine required phases
    const requiredPhases = await this.analyzeRequiredPhases(query, goals, options)

    // Step 2: Generate detailed plan for each phase
    const phases = await this.generatePhases(query, domains, goals, requiredPhases, options)

    // Step 3: Determine phase dependencies
    const dependencies = this.analyzeDependencies(phases)

    // Step 4: Estimate costs and durations
    const { totalDuration, totalCost } = this.estimateTotals(phases)

    // Step 5: Extract all required tools
    const requiredTools = this.extractRequiredTools(phases)

    // Step 6: Generate overview
    const overview = this.generateOverview(query, phases, totalDuration, totalCost)

    return {
      overview,
      phases,
      estimatedDuration: totalDuration,
      estimatedCost: totalCost,
      requiredTools,
      dependencies,
    }
  }

  /**
   * Analyze which phases are needed for this workflow
   */
  private async analyzeRequiredPhases(
    query: string,
    goals: string[],
    options: WorkflowInput['options']
  ): Promise<PhaseType[]> {
    // Always include research phase
    const phases: PhaseType[] = ['research']

    // Use AI to determine if experiments, simulations, or TEA are needed
    const analysisPrompt = `Analyze this query and determine which workflow phases are needed:

Query: "${query}"
Goals: ${goals.join(', ')}

Available phases:
- experiment_design: Design laboratory experiments or field tests
- simulation: Run computational simulations
- tea_analysis: Perform techno-economic analysis (costs, ROI, LCOE)

Respond with JSON:
{
  "needsExperiments": boolean,
  "needsSimulations": boolean,
  "needsTEA": boolean,
  "reasoning": string
}`

    try {
      const response = await executeWithTools(analysisPrompt, {
        model: 'fast',
        temperature: 0.3,
        maxTokens: 500,
      })

      const content = response.type === 'text' ? response.content : ''
      const analysis = JSON.parse(content)

      // Apply user options overrides
      if (options?.includeExperiments !== false && analysis.needsExperiments) {
        phases.push('experiment_design')
      }
      if (options?.includeSimulations !== false && analysis.needsSimulations) {
        phases.push('simulation')
      }
      if (options?.includeTEA !== false && analysis.needsTEA) {
        phases.push('tea_analysis')
      }
    } catch (error) {
      console.warn('[WorkflowPlanner] Phase analysis failed, using defaults:', error)
      // Default: include all phases except TEA
      phases.push('experiment_design', 'simulation')
    }

    return phases
  }

  /**
   * Generate detailed phase plans
   */
  private async generatePhases(
    query: string,
    domains: Domain[],
    goals: string[],
    requiredPhases: PhaseType[],
    options: WorkflowInput['options']
  ): Promise<PlanPhase[]> {
    const phases: PlanPhase[] = []

    for (const phaseType of requiredPhases) {
      const phase = await this.generatePhaseDetails(phaseType, query, domains, goals, options)
      phases.push(phase)
    }

    return phases
  }

  /**
   * Generate details for a specific phase
   */
  private async generatePhaseDetails(
    phaseType: PhaseType,
    query: string,
    domains: Domain[],
    goals: string[],
    options: WorkflowInput['options']
  ): Promise<PlanPhase> {
    const phaseId = `phase_${phaseType}_${Date.now()}`

    switch (phaseType) {
      case 'research':
        return this.createResearchPhase(phaseId, query, domains, options)

      case 'experiment_design':
        return this.createExperimentPhase(phaseId, query, domains, goals)

      case 'simulation':
        return this.createSimulationPhase(phaseId, query, domains, options)

      case 'tea_analysis':
        return this.createTEAPhase(phaseId, query, domains)

      default:
        throw new Error(`Unknown phase type: ${phaseType}`)
    }
  }

  /**
   * Create Research Phase plan
   */
  private createResearchPhase(
    phaseId: string,
    query: string,
    domains: Domain[],
    options: WorkflowInput['options']
  ): PlanPhase {
    const maxResults = options?.budgetLimit ? Math.min(50, Math.floor(options.budgetLimit * 10)) : 20

    return {
      id: phaseId,
      type: 'research',
      title: 'Research Literature',
      description: 'Search academic papers, patents, and datasets across multiple scientific databases',
      tools: [
        {
          toolName: 'searchPapers',
          params: {
            query,
            domains,
            filters: {
              limit: maxResults,
              yearFrom: 2020,
              yearTo: new Date().getFullYear(),
            },
            maxResults,
          },
          callId: `search_${Date.now()}`,
        },
      ],
      expectedOutputs: [
        `${maxResults} most relevant research papers`,
        '5-10 related patents',
        'Key findings and trends',
        'Confidence score for research quality',
      ],
      parameters: {
        maxResults,
        yearFrom: 2020,
        yearTo: new Date().getFullYear(),
        includePapers: true,
        includePatents: true,
        includeDatasets: true,
      },
      canModify: true,
      optional: false,
      estimatedDuration: 15000, // 15 seconds
      estimatedCost: 0.10,       // API calls
    }
  }

  /**
   * Create Experiment Design Phase plan
   */
  private createExperimentPhase(
    phaseId: string,
    query: string,
    domains: Domain[],
    goals: string[]
  ): PlanPhase {
    return {
      id: phaseId,
      type: 'experiment_design',
      title: 'Design Experiments',
      description: 'Generate experimental protocols based on research findings',
      tools: [
        {
          toolName: 'designExperiment' as ToolName,
          params: {
            goal: {
              description: query,
              objectives: goals,
              domain: domains[0],
            },
            referenceResearch: [], // Will be populated with research phase results
          },
          callId: `experiment_${Date.now()}`,
        },
      ],
      expectedOutputs: [
        '2-3 experimental protocols',
        'Materials and equipment lists',
        'Safety considerations',
        'Failure mode analysis',
      ],
      parameters: {
        protocolCount: 3,
        difficultyLevel: 'medium',
        includeSafety: true,
        includeFailureAnalysis: true,
      },
      canModify: true,
      optional: true,
      estimatedDuration: 20000, // 20 seconds
      estimatedCost: 0.05,       // AI generation
    }
  }

  /**
   * Create Simulation Phase plan
   */
  private createSimulationPhase(
    phaseId: string,
    query: string,
    domains: Domain[],
    options: WorkflowInput['options']
  ): PlanPhase {
    const tier = options?.simulationTier || 'browser'
    const targetAccuracy = options?.targetAccuracy || 85

    return {
      id: phaseId,
      type: 'simulation',
      title: 'Run Simulations',
      description: `Execute ${tier} simulations to validate experimental designs`,
      tools: [
        {
          toolName: 'runSimulation',
          params: {
            tier,
            simulationType: query.substring(0, 50),
            parameters: {
              accuracy: targetAccuracy,
              iterations: tier === 'cloud' ? 10000 : tier === 'browser' ? 1000 : 100,
            },
            duration: tier === 'cloud' ? 300000 : tier === 'browser' ? 60000 : 10000,
          },
          callId: `simulation_${Date.now()}`,
        },
      ],
      expectedOutputs: [
        'Simulation results with confidence intervals',
        'Parameter optimization recommendations',
        'Performance visualizations',
      ],
      parameters: {
        simulationTier: tier,
        targetAccuracy,
        iterations: tier === 'cloud' ? 10000 : tier === 'browser' ? 1000 : 100,
        generateVisualizations: true,
      },
      canModify: true,
      optional: true,
      estimatedDuration: tier === 'cloud' ? 300000 : tier === 'browser' ? 60000 : 10000,
      estimatedCost: tier === 'cloud' ? 0.50 : 0,
    }
  }

  /**
   * Create TEA Analysis Phase plan
   */
  private createTEAPhase(
    phaseId: string,
    query: string,
    domains: Domain[]
  ): PlanPhase {
    return {
      id: phaseId,
      type: 'tea_analysis',
      title: 'Techno-Economic Analysis',
      description: 'Calculate LCOE, NPV, IRR, and payback period',
      tools: [
        {
          toolName: 'calculateMetrics',
          params: {
            type: 'tea',
            data: {}, // Will be populated with previous phase results
            parameters: {
              discountRate: 0.08,
              projectLifetime: 25,
              analysisType: 'comprehensive',
            },
          },
          callId: `tea_${Date.now()}`,
        },
      ],
      expectedOutputs: [
        'LCOE (Levelized Cost of Energy)',
        'NPV (Net Present Value)',
        'IRR (Internal Rate of Return)',
        'Payback period',
        'Sensitivity analysis',
        'Investment recommendations',
      ],
      parameters: {
        discountRate: 0.08,
        projectLifetime: 25,
        includeSensitivity: true,
        includeRecommendations: true,
      },
      canModify: true,
      optional: true,
      estimatedDuration: 10000, // 10 seconds
      estimatedCost: 0.02,       // Calculations
    }
  }

  /**
   * Analyze dependencies between phases
   */
  private analyzeDependencies(phases: PlanPhase[]): PhaseDependency[] {
    const dependencies: PhaseDependency[] = []
    const phaseIds = phases.map(p => p.id)
    const researchPhaseId = phases.find(p => p.type === 'research')?.id

    // All phases depend on research
    for (const phase of phases) {
      if (phase.type !== 'research' && researchPhaseId) {
        dependencies.push({
          phaseId: phase.id,
          dependsOn: [researchPhaseId],
          dataFlow: `Research findings feed into ${phase.type}`,
        })
      }

      // TEA depends on simulation and experiment results
      if (phase.type === 'tea_analysis') {
        const simPhaseId = phases.find(p => p.type === 'simulation')?.id
        const expPhaseId = phases.find(p => p.type === 'experiment_design')?.id

        const deps = [researchPhaseId, simPhaseId, expPhaseId].filter(Boolean) as string[]
        dependencies.push({
          phaseId: phase.id,
          dependsOn: deps,
          dataFlow: 'Cost and performance data from experiments and simulations',
        })
      }
    }

    return dependencies
  }

  /**
   * Estimate total duration and cost
   */
  private estimateTotals(phases: PlanPhase[]): { totalDuration: number; totalCost: number } {
    // Phases execute sequentially due to dependencies
    const totalDuration = phases.reduce((sum, phase) => sum + phase.estimatedDuration, 0)

    // Costs accumulate
    const totalCost = phases.reduce((sum, phase) => sum + phase.estimatedCost, 0)

    return { totalDuration, totalCost }
  }

  /**
   * Extract all unique tools from phases
   */
  private extractRequiredTools(phases: PlanPhase[]): ToolName[] {
    const toolSet = new Set<ToolName>()

    for (const phase of phases) {
      for (const toolCall of phase.tools) {
        toolSet.add(toolCall.toolName)
      }
    }

    return Array.from(toolSet)
  }

  /**
   * Generate human-readable overview
   */
  private generateOverview(
    query: string,
    phases: PlanPhase[],
    totalDuration: number,
    totalCost: number
  ): string {
    const phaseCount = phases.length
    const toolCount = phases.reduce((sum, p) => sum + p.tools.length, 0)
    const durationMin = Math.ceil(totalDuration / 60000)

    return `This workflow will ${phases.map(p => p.type.replace('_', ' ')).join(', then ')} to address: "${query}".

It consists of ${phaseCount} phases with ${toolCount} tool executions, estimated to complete in ${durationMin} minutes with an estimated cost of $${totalCost.toFixed(2)}.`
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const workflowPlanner = new WorkflowPlanner()
