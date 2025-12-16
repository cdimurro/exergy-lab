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
  ResearchPlanDetails,
  ExperimentPlanDetails,
  SimulationPlanDetails,
  TEAPlanDetails,
  SimulationMethodType,
} from '@/types/workflow'
import type { ToolName, ToolCall } from '@/types/agent'
import type { Domain } from '@/types/discovery'
import { generateText } from '../ai/model-router'

// ============================================================================
// AI Plan Generation Types
// ============================================================================

interface AIGeneratedPlan {
  research: {
    searchTerms: string[]
    databases: string[]
    keyAreas: string[]
    expectedPapers: number
    expectedPatents: number
    rationale: string
  }
  experiments?: {
    protocols: Array<{
      name: string
      objective: string
      materials: string[]
      equipment: string[]
      procedure: string[]
      metrics: string[]
      safetyNotes?: string[]
      estimatedDuration?: string
    }>
    rationale: string
  }
  simulations?: {
    simulationType: string
    system: string
    parameters: Record<string, string | number>
    expectedOutputs: string[]
    rationale: string
  }
  tea?: {
    analysisScope: string
    keyAssumptions: string[]
    dataRequirements: string[]
    outputMetrics: string[]
    rationale: string
  }
  overview: string
}

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
      // Use generateText (not executeWithTools) for pure JSON response
      const content = await generateText('discovery', analysisPrompt, {
        model: 'fast',
        temperature: 0.3,
        maxTokens: 500,
      })

      // Clean markdown if present
      let cleanedContent = content.trim()
      if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }

      const analysis = JSON.parse(cleanedContent)

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
   * Generate detailed phase plans using AI
   */
  private async generatePhases(
    query: string,
    domains: Domain[],
    goals: string[],
    requiredPhases: PhaseType[],
    options: WorkflowInput['options']
  ): Promise<PlanPhase[]> {
    // Generate AI-powered detailed plan
    const aiPlan = await this.generateDetailedPlanWithAI(query, domains, goals, requiredPhases, options)

    const phases: PlanPhase[] = []

    for (const phaseType of requiredPhases) {
      const phase = this.createPhaseFromAIPlan(phaseType, query, domains, goals, options, aiPlan)
      phases.push(phase)
    }

    return phases
  }

  /**
   * Generate a detailed, personalized plan using AI
   */
  private async generateDetailedPlanWithAI(
    query: string,
    domains: Domain[],
    goals: string[],
    requiredPhases: PhaseType[],
    options: WorkflowInput['options']
  ): Promise<AIGeneratedPlan> {
    const domainContext = this.getDomainContext(domains)
    const phasesNeeded = requiredPhases.filter(p => p !== 'research').map(p => p.replace('_', ' '))

    const planPrompt = `You are an expert research planner for clean energy technology. Generate a DETAILED, SPECIFIC execution plan tailored to the user's exact query.

USER REQUEST:
Domain: ${domains.join(', ')}
Query: "${query}"
Goals: ${goals.length > 0 ? goals.map((g, i) => `${i + 1}. ${g}`).join('\n') : 'Not specified - infer from query'}

DOMAIN CONTEXT:
${domainContext}

PHASES TO PLAN:
1. RESEARCH (required)
${phasesNeeded.length > 0 ? phasesNeeded.map((p, i) => `${i + 2}. ${p.toUpperCase()}`).join('\n') : ''}

INSTRUCTIONS:
Generate a UNIQUE plan based on the specific query. DO NOT use generic templates.

For RESEARCH phase:
- Generate 4-6 SPECIFIC search terms derived from the user's query
- Select databases relevant to this specific domain (Materials Project, NIST WebBook, Web of Science, Scopus, USPTO, arXiv, etc.)
- Identify 3-5 key research areas to investigate
- Estimate realistic paper/patent counts

${requiredPhases.includes('experiment_design') ? `For EXPERIMENT phase:
- Design 2-3 SPECIFIC experimental protocols relevant to the query
- Include materials, equipment, procedures, and metrics
- Consider safety and feasibility` : ''}

${requiredPhases.includes('simulation') ? `For SIMULATION phase:
- Select appropriate simulation method (DFT, MD, GCMC, CFD, FEA, KMC, PV, battery, process)
- Define system setup specific to the query
- Specify key parameters and expected outputs` : ''}

${requiredPhases.includes('tea_analysis') ? `For TEA phase:
- Define analysis scope based on the technology
- List key assumptions and data requirements
- Specify output metrics (LCOE, NPV, IRR, payback)` : ''}

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "research": {
    "searchTerms": ["term1", "term2", "term3", "term4"],
    "databases": ["database1", "database2"],
    "keyAreas": ["area1", "area2", "area3"],
    "expectedPapers": 20,
    "expectedPatents": 10,
    "rationale": "Brief explanation of search strategy"
  }${requiredPhases.includes('experiment_design') ? `,
  "experiments": {
    "protocols": [
      {
        "name": "Protocol Name",
        "objective": "What this tests",
        "materials": ["material1", "material2"],
        "equipment": ["equipment1", "equipment2"],
        "procedure": ["step1", "step2", "step3"],
        "metrics": ["metric1", "metric2"],
        "safetyNotes": ["safety note"],
        "estimatedDuration": "2-3 hours"
      }
    ],
    "rationale": "Why these experiments"
  }` : ''}${requiredPhases.includes('simulation') ? `,
  "simulations": {
    "simulationType": "DFT|MD|GCMC|CFD|FEA|KMC|PV|battery|process|other",
    "system": "Description of simulated system",
    "parameters": {"param1": "value1", "param2": 100},
    "expectedOutputs": ["output1", "output2"],
    "rationale": "Why this simulation approach"
  }` : ''}${requiredPhases.includes('tea_analysis') ? `,
  "tea": {
    "analysisScope": "What costs and revenues to analyze",
    "keyAssumptions": ["assumption1", "assumption2"],
    "dataRequirements": ["data1", "data2"],
    "outputMetrics": ["LCOE", "NPV", "IRR", "Payback Period"],
    "rationale": "Why this analysis approach"
  }` : ''},
  "overview": "2-3 sentence summary explaining the personalized approach for this specific query"
}`

    try {
      // Use generateText (not executeWithTools) to get pure JSON without function calling
      const content = await generateText('discovery', planPrompt, {
        model: 'quality',
        temperature: 0.7,
        maxTokens: 2500,
      })

      // Clean up response - remove any markdown code blocks if present
      let cleanedContent = content.trim()
      if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }

      console.log('[WorkflowPlanner] AI generated plan content:', cleanedContent.substring(0, 200) + '...')

      const aiPlan = JSON.parse(cleanedContent) as AIGeneratedPlan
      return aiPlan
    } catch (error) {
      console.error('[WorkflowPlanner] AI plan generation failed:', error)
      return this.createFallbackPlan(query, domains, goals, requiredPhases)
    }
  }

  /**
   * Get domain-specific context to help AI generate better plans
   */
  private getDomainContext(domains: Domain[]): string {
    const contexts: Record<Domain, string> = {
      'solar-energy': 'Solar technologies include PV cells (silicon, perovskite, tandem), concentrating solar, solar thermal. Key metrics: efficiency, degradation rate, LCOE.',
      'wind-energy': 'Wind technologies include onshore/offshore turbines, blade design, gearbox systems. Key metrics: capacity factor, wake effects, LCOE.',
      'battery-storage': 'Battery technologies include Li-ion, solid-state, flow batteries, supercapacitors. Key metrics: energy density, cycle life, round-trip efficiency.',
      'hydrogen-fuel': 'Hydrogen technologies include electrolysis (PEM, alkaline, SOEC), fuel cells, storage, transport. Key metrics: efficiency, cost per kg.',
      'geothermal': 'Geothermal technologies include enhanced geothermal systems, heat pumps, power plants. Key metrics: reservoir temperature, flow rate.',
      'biomass': 'Biomass technologies include gasification, pyrolysis, anaerobic digestion, biofuels. Key metrics: conversion efficiency, feedstock availability.',
      'carbon-capture': 'Carbon capture technologies include DAC, point-source capture, MOFs, amines, mineralization. Key metrics: capture rate, energy penalty, cost per ton CO2.',
      'energy-efficiency': 'Energy efficiency technologies include building insulation, HVAC optimization, industrial heat recovery. Key metrics: energy savings, payback period.',
      'grid-optimization': 'Grid technologies include smart grid, demand response, energy management systems, microgrids. Key metrics: reliability, losses, flexibility.',
      'materials-science': 'Materials research includes semiconductors, catalysts, membranes, coatings, composites. Key metrics: performance, stability, scalability.',
      'other': 'General clean energy research including cross-domain technologies and emerging solutions.',
    }

    return domains.map(d => contexts[d] || '').filter(Boolean).join('\n')
  }

  /**
   * Create fallback plan if AI generation fails
   */
  private createFallbackPlan(
    query: string,
    domains: Domain[],
    goals: string[],
    requiredPhases: PhaseType[]
  ): AIGeneratedPlan {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3)

    return {
      research: {
        searchTerms: queryWords.slice(0, 4).map(w => `${domains[0]?.replace('-', ' ') || 'clean energy'} ${w}`),
        databases: ['Web of Science', 'Scopus', 'arXiv', 'USPTO'],
        keyAreas: [`${query.substring(0, 50)} research`, 'Recent advances', 'Commercial applications'],
        expectedPapers: 15,
        expectedPatents: 5,
        rationale: 'General search strategy based on query keywords',
      },
      experiments: requiredPhases.includes('experiment_design') ? {
        protocols: [{
          name: 'Characterization Protocol',
          objective: `Characterize materials related to ${query.substring(0, 30)}`,
          materials: ['Sample materials', 'Reference standards'],
          equipment: ['Analytical instruments', 'Testing equipment'],
          procedure: ['Prepare samples', 'Run analysis', 'Record results'],
          metrics: ['Performance metrics', 'Quality indicators'],
        }],
        rationale: 'Standard characterization approach',
      } : undefined,
      simulations: requiredPhases.includes('simulation') ? {
        simulationType: 'other',
        system: `System based on ${query.substring(0, 30)}`,
        parameters: { accuracy: 85, iterations: 1000 },
        expectedOutputs: ['Performance predictions', 'Optimization suggestions'],
        rationale: 'General simulation approach',
      } : undefined,
      tea: requiredPhases.includes('tea_analysis') ? {
        analysisScope: `Economic analysis of ${query.substring(0, 30)}`,
        keyAssumptions: ['Standard industry assumptions', 'Current market prices'],
        dataRequirements: ['Cost data', 'Performance data'],
        outputMetrics: ['LCOE', 'NPV', 'IRR', 'Payback Period'],
        rationale: 'Standard techno-economic analysis',
      } : undefined,
      overview: `This workflow will investigate "${query}" through systematic research and analysis.`,
    }
  }

  /**
   * Create phase from AI-generated plan
   */
  private createPhaseFromAIPlan(
    phaseType: PhaseType,
    query: string,
    domains: Domain[],
    goals: string[],
    options: WorkflowInput['options'],
    aiPlan: AIGeneratedPlan
  ): PlanPhase {
    const phaseId = `phase_${phaseType}_${Date.now()}`

    switch (phaseType) {
      case 'research':
        return this.createResearchPhaseWithDetails(phaseId, query, domains, options, aiPlan.research)

      case 'experiment_design':
        return this.createExperimentPhaseWithDetails(phaseId, query, domains, goals, aiPlan.experiments)

      case 'simulation':
        return this.createSimulationPhaseWithDetails(phaseId, query, domains, options, aiPlan.simulations)

      case 'tea_analysis':
        return this.createTEAPhaseWithDetails(phaseId, query, domains, aiPlan.tea)

      default:
        throw new Error(`Unknown phase type: ${phaseType}`)
    }
  }

  /**
   * Create Research Phase plan with AI-generated details
   */
  private createResearchPhaseWithDetails(
    phaseId: string,
    query: string,
    domains: Domain[],
    options: WorkflowInput['options'],
    researchDetails: AIGeneratedPlan['research']
  ): PlanPhase {
    const maxResults = options?.budgetLimit ? Math.min(50, Math.floor(options.budgetLimit * 10)) : 20

    const details: ResearchPlanDetails = {
      type: 'research',
      searchTerms: researchDetails.searchTerms,
      databases: researchDetails.databases,
      keyAreas: researchDetails.keyAreas,
      expectedPapers: researchDetails.expectedPapers,
      expectedPatents: researchDetails.expectedPatents,
      rationale: researchDetails.rationale,
    }

    return {
      id: phaseId,
      type: 'research',
      title: 'Research Literature',
      description: researchDetails.rationale || 'Search academic papers, patents, and datasets across multiple scientific databases',
      tools: [
        {
          toolName: 'searchPapers',
          params: {
            query,
            domains,
            searchTerms: researchDetails.searchTerms,
            databases: researchDetails.databases,
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
        `${researchDetails.expectedPapers} research papers from ${researchDetails.databases.slice(0, 2).join(', ')}`,
        `${researchDetails.expectedPatents} related patents`,
        `Analysis of: ${researchDetails.keyAreas.slice(0, 2).join(', ')}`,
        'Key findings and emerging trends',
      ],
      parameters: {
        maxResults,
        yearFrom: 2020,
        yearTo: new Date().getFullYear(),
        includePapers: true,
        includePatents: true,
        includeDatasets: true,
        searchTerms: researchDetails.searchTerms,
        databases: researchDetails.databases,
      },
      canModify: true,
      optional: false,
      estimatedDuration: 15000,
      estimatedCost: 0,
      details,
    }
  }

  /**
   * Create Experiment Design Phase plan with AI-generated details
   */
  private createExperimentPhaseWithDetails(
    phaseId: string,
    query: string,
    domains: Domain[],
    goals: string[],
    experimentDetails?: AIGeneratedPlan['experiments']
  ): PlanPhase {
    const protocols = experimentDetails?.protocols || []

    const details: ExperimentPlanDetails = {
      type: 'experiment_design',
      protocols: protocols.map(p => ({
        name: p.name,
        objective: p.objective,
        materials: p.materials,
        equipment: p.equipment,
        procedure: p.procedure,
        metrics: p.metrics,
        safetyNotes: p.safetyNotes,
        estimatedDuration: p.estimatedDuration,
      })),
      rationale: experimentDetails?.rationale || 'Design experimental protocols based on research findings',
    }

    const protocolNames = protocols.map(p => p.name).slice(0, 3)

    return {
      id: phaseId,
      type: 'experiment_design',
      title: 'Design Experiments',
      description: experimentDetails?.rationale || 'Generate experimental protocols based on research findings',
      tools: [
        {
          toolName: 'designExperiment' as ToolName,
          params: {
            goal: {
              description: query,
              objectives: goals,
              domain: domains[0],
            },
            protocols: protocols,
            referenceResearch: [],
          },
          callId: `experiment_${Date.now()}`,
        },
      ],
      expectedOutputs: protocolNames.length > 0
        ? [
            ...protocolNames.map(name => `Protocol: ${name}`),
            'Materials and equipment lists',
            'Safety considerations',
            'Failure mode analysis',
          ]
        : [
            '2-3 experimental protocols',
            'Materials and equipment lists',
            'Safety considerations',
            'Failure mode analysis',
          ],
      parameters: {
        protocolCount: protocols.length || 3,
        difficultyLevel: 'medium',
        includeSafety: true,
        includeFailureAnalysis: true,
      },
      canModify: true,
      optional: true,
      estimatedDuration: 20000,
      estimatedCost: 0,
      details,
    }
  }

  /**
   * Create Simulation Phase plan with AI-generated details
   */
  private createSimulationPhaseWithDetails(
    phaseId: string,
    query: string,
    domains: Domain[],
    options: WorkflowInput['options'],
    simulationDetails?: AIGeneratedPlan['simulations']
  ): PlanPhase {
    const tier = options?.simulationTier || 'browser'
    const targetAccuracy = options?.targetAccuracy || 85

    const simType = (simulationDetails?.simulationType || 'other') as SimulationMethodType

    const details: SimulationPlanDetails = {
      type: 'simulation',
      simulationType: simType,
      system: simulationDetails?.system || `System based on ${query.substring(0, 50)}`,
      parameters: simulationDetails?.parameters || { accuracy: targetAccuracy },
      expectedOutputs: simulationDetails?.expectedOutputs || ['Performance predictions'],
      rationale: simulationDetails?.rationale || `Execute ${tier} simulations to validate designs`,
    }

    const simTypeLabels: Record<SimulationMethodType, string> = {
      DFT: 'Density Functional Theory',
      MD: 'Molecular Dynamics',
      GCMC: 'Grand Canonical Monte Carlo',
      CFD: 'Computational Fluid Dynamics',
      FEA: 'Finite Element Analysis',
      KMC: 'Kinetic Monte Carlo',
      PV: 'Photovoltaic Performance',
      battery: 'Battery Electrochemistry',
      process: 'Process Simulation',
      other: 'Custom Simulation',
    }

    return {
      id: phaseId,
      type: 'simulation',
      title: `Run ${simTypeLabels[simType] || 'Simulations'}`,
      description: simulationDetails?.rationale || `Execute ${tier} simulations to validate experimental designs`,
      tools: [
        {
          toolName: 'runSimulation',
          params: {
            tier,
            simulationType: simType,
            system: simulationDetails?.system,
            parameters: {
              ...simulationDetails?.parameters,
              accuracy: targetAccuracy,
              iterations: tier === 'cloud' ? 10000 : tier === 'browser' ? 1000 : 100,
            },
            duration: tier === 'cloud' ? 300000 : tier === 'browser' ? 60000 : 10000,
          },
          callId: `simulation_${Date.now()}`,
        },
      ],
      expectedOutputs: simulationDetails?.expectedOutputs || [
        'Simulation results with confidence intervals',
        'Parameter optimization recommendations',
        'Performance visualizations',
      ],
      parameters: {
        simulationTier: tier,
        simulationType: simType,
        targetAccuracy,
        iterations: tier === 'cloud' ? 10000 : tier === 'browser' ? 1000 : 100,
        generateVisualizations: true,
        ...simulationDetails?.parameters,
      },
      canModify: true,
      optional: true,
      estimatedDuration: tier === 'cloud' ? 300000 : tier === 'browser' ? 60000 : 10000,
      estimatedCost: tier === 'cloud' ? 0.50 : 0,
      details,
    }
  }

  /**
   * Create TEA Analysis Phase plan with AI-generated details
   */
  private createTEAPhaseWithDetails(
    phaseId: string,
    query: string,
    domains: Domain[],
    teaDetails?: AIGeneratedPlan['tea']
  ): PlanPhase {
    const details: TEAPlanDetails = {
      type: 'tea_analysis',
      analysisScope: teaDetails?.analysisScope || `Economic analysis of ${query.substring(0, 50)}`,
      keyAssumptions: teaDetails?.keyAssumptions || ['Standard industry assumptions'],
      dataRequirements: teaDetails?.dataRequirements || ['Cost data', 'Performance data'],
      outputMetrics: teaDetails?.outputMetrics || ['LCOE', 'NPV', 'IRR', 'Payback Period'],
      rationale: teaDetails?.rationale || 'Calculate key financial metrics',
    }

    return {
      id: phaseId,
      type: 'tea_analysis',
      title: 'Techno-Economic Analysis',
      description: teaDetails?.rationale || 'Calculate LCOE, NPV, IRR, and payback period',
      tools: [
        {
          toolName: 'calculateMetrics',
          params: {
            type: 'tea',
            analysisScope: teaDetails?.analysisScope,
            data: {},
            parameters: {
              discountRate: 0.08,
              projectLifetime: 25,
              analysisType: 'comprehensive',
            },
          },
          callId: `tea_${Date.now()}`,
        },
      ],
      expectedOutputs: teaDetails?.outputMetrics || [
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
        analysisScope: teaDetails?.analysisScope,
      },
      canModify: true,
      optional: true,
      estimatedDuration: 10000,
      estimatedCost: 0,
      details,
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

    const costStr = totalCost > 0 ? ` with an estimated cost of $${totalCost.toFixed(2)}` : ''

    return `This workflow will ${phases.map(p => p.type.replace('_', ' ')).join(', then ')} to address: "${query}".

It consists of ${phaseCount} phases with ${toolCount} tool executions, estimated to complete in ${durationMin} minutes${costStr}.`
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const workflowPlanner = new WorkflowPlanner()
