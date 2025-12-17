/**
 * Workflow Planner - Generates execution plans for unified discovery workflows
 *
 * This is the "brain" that analyzes user queries and creates comprehensive
 * execution plans across the 7-phase workflow:
 * Research → Hypothesis → Experiment Design → Simulation → TEA → Validation → Quality Gates
 */

import type {
  WorkflowInput,
  ExecutionPlan,
  PlanPhase,
  PhaseDependency,
  PhaseType,
  PhaseParameters,
  ResearchPlanDetails,
  HypothesisPlanDetails,
  ExperimentPlanDetails,
  SimulationPlanDetails,
  TEAPlanDetails,
  ValidationPlanDetails,
  QualityGatesPlanDetails,
  SimulationMethodType,
} from '@/types/workflow'
import type { ToolName, ToolCall } from '@/types/agent'
import type { Domain } from '@/types/discovery'
import * as gemini from '../ai/gemini'

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
  hypothesis?: {
    focusAreas: string[]
    expectedHypotheses: number
    evaluationCriteria: string[]
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
  validation?: {
    validationMethods: string[]
    literatureComparison: string[]
    acceptanceCriteria: string[]
    rationale: string
  }
  qualityGates?: {
    qualityChecks: Array<{
      name: string
      description: string
      weight: number
      threshold: number
    }>
    overallThreshold: number
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

    // Step 2: Generate detailed plan for each phase (includes AI-generated overview)
    const { phases, aiOverview } = await this.generatePhases(query, domains, goals, requiredPhases, options)

    // Step 3: Determine phase dependencies
    const dependencies = this.analyzeDependencies(phases)

    // Step 4: Estimate costs and durations
    const { totalDuration, totalCost } = this.estimateTotals(phases)

    // Step 5: Extract all required tools
    const requiredTools = this.extractRequiredTools(phases)

    // Step 6: Use AI-generated overview if available, otherwise generate one
    const overview = aiOverview || this.generateOverview(query, phases, totalDuration, totalCost)

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
   * Always includes: research, hypothesis, validation, quality_gates
   * Optional: experiment_design, simulation, tea_analysis
   */
  private async analyzeRequiredPhases(
    query: string,
    goals: string[],
    options: WorkflowInput['options']
  ): Promise<PhaseType[]> {
    // Always include core phases: research → hypothesis → validation → quality_gates
    const phases: PhaseType[] = ['research', 'hypothesis']

    // Use AI to determine if experiments, simulations, or TEA are needed
    const analysisPrompt = `Analyze this query and determine which OPTIONAL workflow phases are needed:

Query: "${query}"
Goals: ${goals.join(', ')}

REQUIRED phases (always included):
- research: Literature search & analysis
- hypothesis: Generate testable hypotheses from research
- validation: Validate results against literature
- quality_gates: Quality assurance checks

OPTIONAL phases (you decide):
- experiment_design: Design laboratory experiments or field tests
- simulation: Run computational simulations (DFT, MD, CFD, etc.)
- tea_analysis: Perform techno-economic analysis (costs, ROI, LCOE)

Respond with JSON:
{
  "needsExperiments": boolean,
  "needsSimulations": boolean,
  "needsTEA": boolean,
  "reasoning": string
}`

    try {
      // Use Gemini flash-lite for fast analysis
      console.log('[WorkflowPlanner] Analyzing required phases...')
      const content = await gemini.generateText(analysisPrompt, {
        model: 'flash-lite',
        temperature: 0.3,
        maxOutputTokens: 500,
      })

      console.log('[WorkflowPlanner] Phase analysis response:', content.substring(0, 100))

      // Clean and parse JSON response
      const analysis = this.parseJSONResponse(content)

      // Include experiment_design and simulation by default unless explicitly disabled
      // Only TEA depends on AI analysis since it requires specific economic data
      if (options?.includeExperiments !== false) {
        phases.push('experiment_design')
      }
      if (options?.includeSimulations !== false) {
        phases.push('simulation')
      }
      if (options?.includeTEA !== false && analysis.needsTEA) {
        phases.push('tea_analysis')
      }
    } catch (error) {
      console.warn('[WorkflowPlanner] Phase analysis failed, using defaults:', error)
      // Default: include all optional phases except TEA
      phases.push('experiment_design', 'simulation')
    }

    // Always add validation and quality gates at the end
    phases.push('validation', 'quality_gates')

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
  ): Promise<{ phases: PlanPhase[]; aiOverview: string | undefined }> {
    // Generate AI-powered detailed plan
    const aiPlan = await this.generateDetailedPlanWithAI(query, domains, goals, requiredPhases, options)

    const phases: PlanPhase[] = []

    for (const phaseType of requiredPhases) {
      const phase = this.createPhaseFromAIPlan(phaseType, query, domains, goals, options, aiPlan)
      phases.push(phase)
    }

    return { phases, aiOverview: aiPlan.overview }
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

    const planPrompt = `You are an expert research planner for clean energy technology.

CRITICAL JSON REQUIREMENTS:
- Your response must be ONLY valid JSON - no markdown, no code blocks, no explanations
- Escape quotes inside strings with backslash: \\"
- NO trailing commas before } or ]
- NO comments in JSON
- NO line breaks within string values

Generate a DETAILED, SPECIFIC execution plan tailored to the user's exact query.

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

OUTPUT FORMAT:
Respond with ONLY the JSON object below. Start directly with { and end with }. Do not wrap in markdown or add any text before/after:
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

    console.log('[WorkflowPlanner] === Starting AI Plan Generation ===')
    console.log('[WorkflowPlanner] Query:', query)
    console.log('[WorkflowPlanner] Domains:', domains)
    console.log('[WorkflowPlanner] Goals:', goals)
    console.log('[WorkflowPlanner] Required phases:', requiredPhases)
    console.log('[WorkflowPlanner] Prompt length:', planPrompt.length, 'chars')

    try {
      // Use Gemini flash for better quality (not flash-lite)
      console.log('[WorkflowPlanner] Calling Gemini API...')
      const content = await gemini.generateText(planPrompt, {
        model: 'flash', // Upgraded from flash-lite for better JSON quality
        temperature: 0.5, // Lower temperature for more consistent JSON
        maxOutputTokens: 3000, // More tokens for complex plans
        responseMimeType: 'application/json', // Request JSON response
      })

      console.log('[WorkflowPlanner] === Raw AI Response ===')
      console.log('[WorkflowPlanner] Response length:', content.length, 'chars')
      console.log('[WorkflowPlanner] Raw response (first 800 chars):')
      console.log(content.substring(0, 800))

      // Parse JSON with robust error handling
      console.log('[WorkflowPlanner] Attempting to parse JSON response...')
      const aiPlan = this.parseJSONResponse(content) as AIGeneratedPlan

      console.log('[WorkflowPlanner] === Parsed Plan ===')
      console.log('[WorkflowPlanner] Overview:', aiPlan.overview?.substring(0, 100))
      console.log('[WorkflowPlanner] Has research:', !!aiPlan.research)
      console.log('[WorkflowPlanner] Search terms:', aiPlan.research?.searchTerms)
      console.log('[WorkflowPlanner] Has experiments:', !!aiPlan.experiments)
      console.log('[WorkflowPlanner] Has simulations:', !!aiPlan.simulations)

      // Validate that we got required fields
      if (!aiPlan.research || !aiPlan.research.searchTerms) {
        console.warn('[WorkflowPlanner] === VALIDATION FAILED ===')
        console.warn('[WorkflowPlanner] Missing required research fields!')
        console.warn('[WorkflowPlanner] aiPlan.research:', aiPlan.research)
        return this.createFallbackPlan(query, domains, goals, requiredPhases)
      }

      console.log('[WorkflowPlanner] === AI Plan Generation SUCCESS ===')
      console.log('[WorkflowPlanner] Search terms count:', aiPlan.research.searchTerms.length)
      return aiPlan
    } catch (error) {
      console.error('[WorkflowPlanner] === AI Plan Generation FAILED ===')
      console.error('[WorkflowPlanner] Error type:', (error as any)?.constructor?.name)
      console.error('[WorkflowPlanner] Error message:', error instanceof Error ? error.message : String(error))
      console.error('[WorkflowPlanner] Using fallback plan instead')
      return this.createFallbackPlan(query, domains, goals, requiredPhases)
    }
  }

  /**
   * Parse JSON response with robust error handling
   * Handles markdown code blocks, trailing commas, unescaped quotes, and other common LLM issues
   */
  private parseJSONResponse(content: string): any {
    console.log('[WorkflowPlanner] parseJSONResponse - input length:', content.length)

    let cleanedContent = content.trim()

    // Remove markdown code blocks (various formats)
    cleanedContent = cleanedContent
      .replace(/^```json\s*\n?/i, '')
      .replace(/^```\s*\n?/, '')
      .replace(/\n?```\s*$/g, '')
      .trim()

    console.log('[WorkflowPlanner] After markdown cleanup - length:', cleanedContent.length)

    // Try direct parse first
    try {
      const result = JSON.parse(cleanedContent)
      console.log('[WorkflowPlanner] Direct JSON parse SUCCESS')
      return result
    } catch (firstError: any) {
      console.log('[WorkflowPlanner] Direct parse failed:', firstError.message)
      console.log('[WorkflowPlanner] Content starts with:', cleanedContent.substring(0, 100))
    }

    // Find the JSON object boundaries first
    const firstBrace = cleanedContent.indexOf('{')
    const lastBrace = cleanedContent.lastIndexOf('}')

    console.log('[WorkflowPlanner] JSON boundaries - first {:', firstBrace, ', last }:', lastBrace)

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      console.error('[WorkflowPlanner] No JSON object found in response!')
      console.error('[WorkflowPlanner] Content preview:', cleanedContent.substring(0, 300))
      throw new Error('No JSON object found in AI response')
    }

    // Extract just the JSON portion
    let jsonStr = cleanedContent.substring(firstBrace, lastBrace + 1)
    console.log('[WorkflowPlanner] Extracted JSON length:', jsonStr.length)

    // Apply fixes in sequence
    try {
      // 1. Fix trailing commas
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1')

      // 2. Fix line breaks within strings (replace with space)
      // This handles multi-line string values
      jsonStr = jsonStr.replace(/"([^"]*)\n([^"]*)"/g, (match, p1, p2) => {
        return `"${p1} ${p2}"`
      })

      // 3. Normalize whitespace
      jsonStr = jsonStr.replace(/\r\n/g, ' ').replace(/\t/g, ' ')

      // Try parsing after basic fixes
      try {
        const result = JSON.parse(jsonStr)
        console.log('[WorkflowPlanner] Parse after basic fixes SUCCESS')
        return result
      } catch (e: any) {
        console.log('[WorkflowPlanner] Parse after basic fixes failed:', e.message)
      }

      // 4. More aggressive: escape unescaped quotes in string values
      // This is tricky - we look for patterns like "value with "inner" quotes"
      // and try to fix them to "value with \"inner\" quotes"
      let inString = false
      let result = ''
      let i = 0

      while (i < jsonStr.length) {
        const char = jsonStr[i]

        if (char === '"' && (i === 0 || jsonStr[i - 1] !== '\\')) {
          if (!inString) {
            inString = true
            result += char
          } else {
            // Check if this quote should end the string
            // Look ahead to see if next non-whitespace char is : , } or ]
            let j = i + 1
            while (j < jsonStr.length && /\s/.test(jsonStr[j])) j++

            const nextChar = jsonStr[j]
            if (nextChar === ':' || nextChar === ',' || nextChar === '}' || nextChar === ']' || j >= jsonStr.length) {
              // This is a closing quote
              inString = false
              result += char
            } else {
              // This is a quote inside a string - escape it
              result += '\\"'
            }
          }
        } else {
          result += char
        }
        i++
      }

      const aggressiveResult = JSON.parse(result)
      console.log('[WorkflowPlanner] Parse after quote fix SUCCESS')
      return aggressiveResult
    } catch (secondError: any) {
      console.log('[WorkflowPlanner] Parse after quote fix failed:', secondError.message)
    }

    // Last resort: try a very aggressive cleanup
    try {
      console.log('[WorkflowPlanner] Attempting aggressive cleanup...')
      // Remove all control characters and try again
      const aggressive = jsonStr
        .replace(/[\x00-\x1F\x7F]/g, ' ')
        .replace(/,(\s*[}\]])/g, '$1')
        .replace(/\s+/g, ' ')

      const finalResult = JSON.parse(aggressive)
      console.log('[WorkflowPlanner] Aggressive cleanup parse SUCCESS')
      return finalResult
    } catch (thirdError: any) {
      console.error('[WorkflowPlanner] === ALL JSON PARSE ATTEMPTS FAILED ===')
      console.error('[WorkflowPlanner] Final error:', thirdError.message)
      console.error('[WorkflowPlanner] Raw content (first 500 chars):', content.substring(0, 500))
      console.error('[WorkflowPlanner] Extracted JSON (first 500 chars):', jsonStr.substring(0, 500))
    }

    throw new Error('Failed to parse JSON response from AI')
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

      case 'hypothesis':
        return this.createHypothesisPhaseWithDetails(phaseId, query, domains, goals, aiPlan.hypothesis)

      case 'experiment_design':
        return this.createExperimentPhaseWithDetails(phaseId, query, domains, goals, aiPlan.experiments)

      case 'simulation':
        return this.createSimulationPhaseWithDetails(phaseId, query, domains, options, aiPlan.simulations)

      case 'tea_analysis':
        return this.createTEAPhaseWithDetails(phaseId, query, domains, aiPlan.tea)

      case 'validation':
        return this.createValidationPhaseWithDetails(phaseId, query, domains, aiPlan.validation)

      case 'quality_gates':
        return this.createQualityGatesPhaseWithDetails(phaseId, query, domains, aiPlan.qualityGates)

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
        protocolCount: protocols.length || 1,
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
   * Create Hypothesis Phase plan with AI-generated details
   */
  private createHypothesisPhaseWithDetails(
    phaseId: string,
    query: string,
    domains: Domain[],
    goals: string[],
    hypothesisDetails?: AIGeneratedPlan['hypothesis']
  ): PlanPhase {
    const details: HypothesisPlanDetails = {
      type: 'hypothesis',
      focusAreas: hypothesisDetails?.focusAreas || [`${query.substring(0, 50)} mechanisms`, 'Performance optimization', 'Novel approaches'],
      expectedHypotheses: hypothesisDetails?.expectedHypotheses || 1,
      evaluationCriteria: hypothesisDetails?.evaluationCriteria || ['Novelty', 'Feasibility', 'Impact potential'],
      rationale: hypothesisDetails?.rationale || 'Generate testable hypotheses based on research findings',
    }

    return {
      id: phaseId,
      type: 'hypothesis',
      title: 'Generate Hypotheses',
      description: hypothesisDetails?.rationale || 'Analyze research findings to generate testable hypotheses',
      tools: [
        {
          toolName: 'generateHypotheses' as ToolName,
          params: {
            researchContext: {
              query,
              domains,
              goals,
            },
            focusAreas: details.focusAreas,
            maxHypotheses: details.expectedHypotheses,
          },
          callId: `hypothesis_${Date.now()}`,
        },
      ],
      expectedOutputs: [
        `${details.expectedHypotheses} testable hypotheses`,
        'Supporting evidence from research',
        'Novelty and feasibility scores',
        'Testable predictions for each hypothesis',
      ],
      parameters: {
        focusAreas: details.focusAreas,
        maxHypotheses: details.expectedHypotheses,
        evaluationCriteria: details.evaluationCriteria,
      },
      canModify: true,
      optional: false, // Hypothesis is required
      estimatedDuration: 15000,
      estimatedCost: 0,
      details,
    }
  }

  /**
   * Create Validation Phase plan with AI-generated details
   */
  private createValidationPhaseWithDetails(
    phaseId: string,
    query: string,
    domains: Domain[],
    validationDetails?: AIGeneratedPlan['validation']
  ): PlanPhase {
    const details: ValidationPlanDetails = {
      type: 'validation',
      validationMethods: validationDetails?.validationMethods || ['Literature cross-reference', 'Physical plausibility check', 'Benchmark comparison'],
      literatureComparison: validationDetails?.literatureComparison || ['Recent peer-reviewed studies', 'Industry benchmarks', 'Established theoretical limits'],
      acceptanceCriteria: validationDetails?.acceptanceCriteria || ['Within 20% of literature values', 'No physical impossibilities', 'Consistent with domain knowledge'],
      rationale: validationDetails?.rationale || 'Validate results against literature and physical constraints',
    }

    return {
      id: phaseId,
      type: 'validation',
      title: 'Validate Results',
      description: validationDetails?.rationale || 'Cross-reference results with literature and validate against physical constraints',
      tools: [
        {
          toolName: 'validateResults' as ToolName,
          params: {
            validationMethods: details.validationMethods,
            literatureComparison: details.literatureComparison,
            acceptanceCriteria: details.acceptanceCriteria,
          },
          callId: `validation_${Date.now()}`,
        },
      ],
      expectedOutputs: [
        'Validation score (0-100)',
        'Literature comparison results',
        'Identified discrepancies and issues',
        'Recommendations for refinement',
      ],
      parameters: {
        validationMethods: details.validationMethods,
        literatureComparison: details.literatureComparison,
        acceptanceCriteria: details.acceptanceCriteria,
      },
      canModify: true,
      optional: false, // Validation is required
      estimatedDuration: 12000,
      estimatedCost: 0,
      details,
    }
  }

  /**
   * Create Quality Gates Phase plan with AI-generated details
   */
  private createQualityGatesPhaseWithDetails(
    phaseId: string,
    query: string,
    domains: Domain[],
    qualityGatesDetails?: AIGeneratedPlan['qualityGates']
  ): PlanPhase {
    const defaultChecks = [
      { name: 'Research Coverage', description: 'Sufficient sources found and analyzed', weight: 0.2, threshold: 70 },
      { name: 'Hypothesis Quality', description: 'Hypotheses are testable and well-supported', weight: 0.2, threshold: 70 },
      { name: 'Scientific Validity', description: 'Results are physically plausible', weight: 0.25, threshold: 80 },
      { name: 'Literature Consistency', description: 'Results align with established knowledge', weight: 0.2, threshold: 75 },
      { name: 'Completeness', description: 'All required outputs generated', weight: 0.15, threshold: 90 },
    ]

    const details: QualityGatesPlanDetails = {
      type: 'quality_gates',
      qualityChecks: qualityGatesDetails?.qualityChecks || defaultChecks,
      overallThreshold: qualityGatesDetails?.overallThreshold || 75,
      rationale: qualityGatesDetails?.rationale || 'Final quality assurance before presenting results',
    }

    return {
      id: phaseId,
      type: 'quality_gates',
      title: 'Quality Assurance',
      description: qualityGatesDetails?.rationale || 'Run quality checks to ensure results meet standards',
      tools: [
        {
          toolName: 'runQualityGates' as ToolName,
          params: {
            qualityChecks: details.qualityChecks,
            overallThreshold: details.overallThreshold,
          },
          callId: `quality_${Date.now()}`,
        },
      ],
      expectedOutputs: [
        'Overall quality score',
        'Individual check results',
        'Pass/fail determination',
        'Recommendations for improvement',
      ],
      parameters: {
        qualityChecks: details.qualityChecks,
        overallThreshold: details.overallThreshold,
      },
      canModify: true,
      optional: false, // Quality gates are required
      estimatedDuration: 8000,
      estimatedCost: 0,
      details,
    }
  }

  /**
   * Analyze dependencies between phases for the 7-phase workflow
   *
   * Dependency chain:
   * Research → Hypothesis → Experiment Design → Simulation → TEA → Validation → Quality Gates
   */
  private analyzeDependencies(phases: PlanPhase[]): PhaseDependency[] {
    const dependencies: PhaseDependency[] = []

    // Get phase IDs
    const phaseMap = new Map<PhaseType, string>()
    for (const phase of phases) {
      phaseMap.set(phase.type, phase.id)
    }

    const researchId = phaseMap.get('research')
    const hypothesisId = phaseMap.get('hypothesis')
    const experimentId = phaseMap.get('experiment_design')
    const simulationId = phaseMap.get('simulation')
    const teaId = phaseMap.get('tea_analysis')
    const validationId = phaseMap.get('validation')
    const qualityGatesId = phaseMap.get('quality_gates')

    // Hypothesis depends on Research
    if (hypothesisId && researchId) {
      dependencies.push({
        phaseId: hypothesisId,
        dependsOn: [researchId],
        dataFlow: 'Research findings feed into hypothesis generation',
      })
    }

    // Experiment Design depends on Research and Hypothesis
    if (experimentId) {
      const deps = [researchId, hypothesisId].filter(Boolean) as string[]
      if (deps.length > 0) {
        dependencies.push({
          phaseId: experimentId,
          dependsOn: deps,
          dataFlow: 'Research findings and hypotheses guide experiment design',
        })
      }
    }

    // Simulation depends on Research, Hypothesis, and optionally Experiments
    if (simulationId) {
      const deps = [researchId, hypothesisId, experimentId].filter(Boolean) as string[]
      if (deps.length > 0) {
        dependencies.push({
          phaseId: simulationId,
          dependsOn: deps,
          dataFlow: 'Research and experiment designs inform simulation parameters',
        })
      }
    }

    // TEA depends on all prior analytical phases
    if (teaId) {
      const deps = [researchId, experimentId, simulationId].filter(Boolean) as string[]
      if (deps.length > 0) {
        dependencies.push({
          phaseId: teaId,
          dependsOn: deps,
          dataFlow: 'Cost and performance data from experiments and simulations',
        })
      }
    }

    // Validation depends on all content-generating phases
    if (validationId) {
      const deps = [researchId, hypothesisId, experimentId, simulationId, teaId].filter(Boolean) as string[]
      if (deps.length > 0) {
        dependencies.push({
          phaseId: validationId,
          dependsOn: deps,
          dataFlow: 'All results need validation against literature and physical constraints',
        })
      }
    }

    // Quality Gates depends on Validation and all prior phases
    if (qualityGatesId) {
      const deps = [validationId, researchId, hypothesisId].filter(Boolean) as string[]
      if (deps.length > 0) {
        dependencies.push({
          phaseId: qualityGatesId,
          dependsOn: deps,
          dataFlow: 'Quality assessment of all workflow outputs',
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
    // Phase label mapping for readable names
    const PHASE_LABELS: Record<PhaseType, string> = {
      research: 'Research',
      hypothesis: 'Hypothesis Generation',
      experiment_design: 'Experiment Design',
      simulation: 'Simulation',
      tea_analysis: 'TEA Analysis',
      validation: 'Validation',
      quality_gates: 'Quality Gates',
    }

    const phaseCount = phases.length
    const toolCount = phases.reduce((sum, p) => sum + p.tools.length, 0)
    const durationMin = Math.ceil(totalDuration / 60000)

    // Extract key details from phases
    const researchPhase = phases.find(p => p.type === 'research')
    const hypothesisPhase = phases.find(p => p.type === 'hypothesis')
    const simulationPhase = phases.find(p => p.type === 'simulation')

    // Get details if available
    const searchTerms = (researchPhase?.details as any)?.searchTerms?.slice(0, 3) || []
    const expectedHypotheses = (hypothesisPhase?.details as any)?.expectedHypotheses || 1
    const simulationType = (simulationPhase?.details as any)?.simulationType || ''

    // Build workflow steps as readable flow
    const workflowSteps = phases.map(p => PHASE_LABELS[p.type] || p.type.replace('_', ' ')).join(' → ')

    // Build clean summary
    const lines: string[] = []

    // Main description
    lines.push(`A ${phaseCount}-phase research workflow to investigate: "${query}"`)
    lines.push('')
    lines.push(`**Workflow:** ${workflowSteps}`)

    // Key details (if available)
    if (searchTerms.length > 0) {
      lines.push(`**Key Search Areas:** ${searchTerms.join(', ')}`)
    }
    if (simulationType) {
      lines.push(`**Simulation:** ${simulationType}`)
    }

    // Summary stats
    const costStr = totalCost > 0 ? `, estimated cost $${totalCost.toFixed(2)}` : ''
    lines.push('')
    lines.push(`${toolCount} tool executions across ${phaseCount} phases, ~${durationMin} min${costStr}`)

    return lines.join('\n')
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const workflowPlanner = new WorkflowPlanner()
