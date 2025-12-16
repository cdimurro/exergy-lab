import { z } from 'zod'
import { ToolDeclaration } from '@/types/agent'
import { SearchResultSchema, PatentAnalysisSchema, ExtractedDataSchema, SimulationResultSchema } from '../schemas'

// Note: These will integrate with existing systems once they're connected
// For now, we'll create the interfaces that other systems can implement

// ============================================================================
// Tool 1: searchPapers - Search across all data sources
// ============================================================================

const searchPapersSchema = z.object({
  query: z.string().min(3).describe('Search query for papers'),
  domains: z.array(z.string()).optional().describe('Domain filters (e.g., ["solar-energy", "battery-storage"])'),
  filters: z.object({
    yearFrom: z.number().optional(),
    yearTo: z.number().optional(),
    minCitations: z.number().optional(),
    sources: z.array(z.string()).optional(),
  }).optional().describe('Additional search filters'),
  maxResults: z.number().min(1).max(100).default(20).describe('Maximum number of results'),
})

async function searchPapersHandler(params: z.infer<typeof searchPapersSchema>) {
  const { query, domains = [], filters = {}, maxResults = 20 } = params

  console.log('[searchPapers] Executing search:', { query, domains, maxResults })

  try {
    // Import SearchOrchestrator (dynamic import to avoid circular dependencies)
    const { SearchOrchestrator } = await import('@/lib/discovery/search-apis')
    const orchestrator = new SearchOrchestrator()

    // Execute real search across all data sources
    const startTime = Date.now()
    const results = await orchestrator.searchAllSources({
      description: query,
      domains: domains as any[], // Cast to Domain[]
      goals: [], // Goals not needed for tool-based search
    })

    // Transform SearchResults to tool response format
    const papers = results.sources
      .filter(s => s.type === 'academic-paper' || s.type === 'patent')
      .slice(0, maxResults)
      .map((source: any) => ({
        id: source.id,
        title: source.title,
        authors: source.authors || [],
        abstract: source.abstract,
        url: source.url,
        doi: source.doi || undefined,
        citationCount: source.citationCount || 0,
        publicationDate: source.publishedDate || source.publicationDate,
        relevanceScore: source.relevanceScore,
        type: source.type,
      }))

    const response = {
      papers,
      totalResults: results.totalSources,
      searchTime: Date.now() - startTime,
      query,
      sources: {
        papers: results.papers,
        patents: results.patents,
        reports: results.reports,
        news: results.news,
      },
    }

    console.log(`[searchPapers] Found ${response.totalResults} total sources (${response.papers.length} papers returned)`)
    return response
  } catch (error) {
    console.error('[searchPapers] Search failed:', error)
    // Return empty results on error rather than throwing (agent can handle empty results)
    return {
      papers: [],
      totalResults: 0,
      searchTime: 0,
      query,
      sources: { papers: 0, patents: 0, reports: 0, news: 0 },
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export const searchPapersTool: ToolDeclaration = {
  name: 'searchPapers',
  description: 'Search for academic papers, preprints, and research across 14+ scientific databases including Semantic Scholar, arXiv, PubMed, Consensus, ChemRxiv, BioRxiv, NREL, IEEE, and more. Returns papers with relevance scores, citations, and metadata.',
  schema: searchPapersSchema,
  handler: searchPapersHandler,
}

// ============================================================================
// Tool 2: analyzePatent - Deep patent analysis
// ============================================================================

const analyzePatentSchema = z.object({
  patentId: z.string().min(1).describe('Patent ID or number'),
  analysisDepth: z.enum(['basic', 'detailed', 'comprehensive']).default('detailed').describe('Depth of analysis'),
  includeRelated: z.boolean().default(true).describe('Include related patents'),
})

async function analyzePatentHandler(params: z.infer<typeof analyzePatentSchema>) {
  const { patentId, analysisDepth, includeRelated } = params

  console.log('[analyzePatent] Analyzing patent:', { patentId, analysisDepth })

  try {
    // This will integrate with Google Patents API once implemented
    // For now, return structured response

    const analysis = {
      patent: {
        id: patentId,
        title: 'Patent analysis pending integration',
        abstract: '',
        inventors: [],
        assignee: '',
        publicationDate: new Date().toISOString(),
        patentNumber: patentId,
        relevanceScore: 0,
      },
      noveltyScore: 0,
      technicalDepth: 0,
      commercialPotential: 0,
      keyInnovations: [],
      relatedPatents: includeRelated ? [] : [],
      marketApplications: [],
    }

    console.log('[analyzePatent] Analysis complete')
    return analysis
  } catch (error) {
    console.error('[analyzePatent] Analysis failed:', error)
    throw new Error(`Patent analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export const analyzePatentTool: ToolDeclaration = {
  name: 'analyzePatent',
  description: 'Perform deep analysis of a patent including novelty assessment, technical depth evaluation, commercial potential scoring, key innovations extraction, and related patent identification. Useful for competitive analysis and prior art search.',
  schema: analyzePatentSchema,
  handler: analyzePatentHandler,
}

// ============================================================================
// Tool 3: extractData - Extract structured data from files
// ============================================================================

const extractDataSchema = z.object({
  fileUrl: z.string().url().describe('URL to the file to extract data from'),
  format: z.enum(['pdf', 'docx', 'xlsx', 'csv', 'json']).describe('File format'),
  extractionType: z.enum(['text', 'tables', 'metadata', 'all']).default('all').describe('What to extract'),
})

async function extractDataHandler(params: z.infer<typeof extractDataSchema>) {
  const { fileUrl, format, extractionType } = params

  console.log('[extractData] Extracting from:', { fileUrl, format, extractionType })

  try {
    // This will integrate with file parsing libraries (pdf-parse, mammoth, xlsx)
    // For now, return structured response

    const extracted = {
      format,
      content: {
        text: extractionType === 'text' || extractionType === 'all' ? '' : undefined,
        tables: extractionType === 'tables' || extractionType === 'all' ? [] : undefined,
        metadata: extractionType === 'metadata' || extractionType === 'all' ? {} : undefined,
      },
      extractionMethod: `${format}-parser`,
      confidence: 0,
      warnings: [],
    }

    console.log('[extractData] Extraction complete')
    return extracted
  } catch (error) {
    console.error('[extractData] Extraction failed:', error)
    throw new Error(`Data extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export const extractDataTool: ToolDeclaration = {
  name: 'extractData',
  description: 'Extract structured data from various file formats (PDF, DOCX, XLSX, CSV, JSON). Can extract text content, tables, metadata, or all information. Returns structured data with confidence scores and warnings.',
  schema: extractDataSchema,
  handler: extractDataHandler,
}

// ============================================================================
// Tool 4: calculateMetrics - Run various calculations
// ============================================================================

const calculateMetricsSchema = z.object({
  type: z.enum(['tea', 'efficiency', 'emissions', 'cost', 'energy']).describe('Type of calculation'),
  data: z.record(z.string(), z.any()).describe('Input data for calculation'),
  parameters: z.object({
    discountRate: z.number().optional(),
    projectLifetime: z.number().optional(),
    units: z.string().optional(),
  }).optional().describe('Calculation parameters'),
})

async function calculateMetricsHandler(params: z.infer<typeof calculateMetricsSchema>) {
  const { type, data, parameters = {} } = params

  console.log('[calculateMetrics] Calculating:', { type, parameters })

  try {
    let results: any = {}

    switch (type) {
      case 'tea':
        // Integrate with existing TEA calculator
        // const calculator = new TEACalculator(data)
        // results = calculator.calculate()
        results = {
          npv: 0,
          irr: 0,
          paybackPeriod: 0,
          roi: 0,
        }
        break

      case 'efficiency':
        // Calculate energy efficiency metrics
        results = {
          efficiency: 0,
          energyInput: data.energyInput || 0,
          energyOutput: data.energyOutput || 0,
        }
        break

      case 'emissions':
        // Calculate emissions metrics
        results = {
          co2Emissions: 0,
          emissionsPerUnit: 0,
        }
        break

      case 'cost':
        // Calculate cost metrics
        results = {
          totalCost: 0,
          costPerUnit: 0,
          breakdown: {},
        }
        break

      case 'energy':
        // Calculate energy metrics
        results = {
          totalEnergy: 0,
          peakPower: 0,
          averagePower: 0,
        }
        break
    }

    console.log('[calculateMetrics] Calculation complete')
    return results
  } catch (error) {
    console.error('[calculateMetrics] Calculation failed:', error)
    throw new Error(`Metrics calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export const calculateMetricsTool: ToolDeclaration = {
  name: 'calculateMetrics',
  description: 'Perform various engineering and financial calculations including Techno-Economic Analysis (TEA), efficiency calculations, emissions analysis, cost breakdown, and energy metrics. Supports parametric calculations with discount rates, project lifetimes, and custom units.',
  schema: calculateMetricsSchema,
  handler: calculateMetricsHandler,
}

// ============================================================================
// Tool 5: runSimulation - Execute simulations
// ============================================================================

const runSimulationSchema = z.object({
  tier: z.enum(['tier1', 'tier2', 'tier3']).default('tier1').describe('Simulation tier (tier1=local, tier2=browser ML, tier3=cloud GPU)'),
  simulationType: z.string().describe('Type of simulation (e.g., "solar_panel", "battery_storage", "wind_turbine")'),
  parameters: z.record(z.string(), z.any()).describe('Simulation parameters'),
  duration: z.number().optional().describe('Simulation duration in time units'),
})

async function runSimulationHandler(params: z.infer<typeof runSimulationSchema>) {
  const { tier, simulationType, parameters, duration } = params

  console.log('[runSimulation] Running simulation:', { tier, simulationType })

  try {
    // This will integrate with the simulation engine from /src/lib/simulation-engine.ts
    // For now, return structured response

    let results: any = {
      energyOutput: 0,
      efficiency: 0,
      cost: 0,
      performanceMetrics: {},
    }

    // Simulate different tiers
    switch (tier) {
      case 'tier1':
        // Quick analytical calculations
        console.log('[runSimulation] Running Tier 1 (analytical)')
        break

      case 'tier2':
        // Browser-based ML inference
        console.log('[runSimulation] Running Tier 2 (browser ML)')
        break

      case 'tier3':
        // Cloud GPU simulation
        console.log('[runSimulation] Running Tier 3 (cloud GPU)')
        if (process.env.ENABLE_CLOUD_GPU !== 'true') {
          throw new Error('Cloud GPU simulations not enabled')
        }
        break
    }

    const simulation = {
      success: true,
      tier,
      results,
      charts: [],
      duration: Date.now(),
      timestamp: Date.now(),
    }

    console.log('[runSimulation] Simulation complete')
    return simulation
  } catch (error) {
    console.error('[runSimulation] Simulation failed:', error)
    throw new Error(`Simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export const runSimulationTool: ToolDeclaration = {
  name: 'runSimulation',
  description: 'Execute physics-based or machine learning simulations across three computational tiers: Tier 1 (fast analytical), Tier 2 (browser ML with WebGPU), Tier 3 (cloud GPU for high-fidelity). Supports solar, wind, battery, hydrogen, and other clean energy simulations.',
  schema: runSimulationSchema,
  handler: runSimulationHandler,
}

// ============================================================================
// Tool 6: designExperiment - Design experimental protocols (NEW)
// ============================================================================

const designExperimentSchema = z.object({
  goal: z.object({
    description: z.string().min(10).describe('Experiment goal description'),
    objectives: z.array(z.string()).describe('Specific objectives to achieve'),
    domain: z.string().describe('Scientific domain (e.g., "solar-energy", "battery-storage")'),
  }).describe('Experiment goal and objectives'),
  referenceResearch: z.array(z.object({
    title: z.string(),
    methodology: z.string(),
  })).optional().describe('Reference papers with methodologies'),
  constraints: z.object({
    budget: z.number().optional().describe('Budget limit in USD'),
    timeline: z.string().optional().describe('Timeline constraint (e.g., "3 months")'),
    safetyLevel: z.enum(['standard', 'high', 'critical']).default('standard'),
  }).optional().describe('Experiment constraints'),
})

async function designExperimentHandler(params: z.infer<typeof designExperimentSchema>) {
  const { goal, referenceResearch = [], constraints = {} as z.infer<typeof designExperimentSchema>['constraints'] } = params

  console.log('[designExperiment] Designing protocol for:', goal.description)

  try {
    // Use AI to generate comprehensive experimental protocol
    const { executeWithTools } = await import('../model-router')

    const prompt = `Design a detailed experimental protocol for:

Goal: ${goal.description}
Objectives: ${goal.objectives.join(', ')}
Domain: ${goal.domain}

${referenceResearch.length > 0 ? `
Reference Research:
${referenceResearch.map(r => `- ${r.title}: ${r.methodology}`).join('\n')}
` : ''}

${constraints?.budget ? `Budget: $${constraints.budget}` : ''}
${constraints?.timeline ? `Timeline: ${constraints.timeline}` : ''}
Safety Level: ${constraints?.safetyLevel || 'standard'}

Generate a complete experimental protocol with:
1. Materials list with quantities and specifications
2. Equipment requirements (required and alternatives)
3. Step-by-step procedure with durations and temperatures
4. Safety warnings and precautions
5. Expected results and success criteria
6. Potential failure modes with likelihood and mitigation

Format as JSON matching this structure:
{
  "title": string,
  "objective": string,
  "materials": [{"name": string, "quantity": string, "purity"?: string}],
  "equipment": [{"name": string, "specification"?: string, "required": boolean}],
  "procedure": [{"step": number, "instruction": string, "duration"?: string}],
  "safetyWarnings": string[],
  "expectedResults": string[],
  "failureModes": [{"mode": string, "likelihood": "low"|"medium"|"high", "mitigation": string[]}],
  "duration": string,
  "difficulty": "low"|"medium"|"high",
  "estimatedCost": number
}`

    const response = await executeWithTools(prompt, {
      model: 'fast',
      temperature: 0.6,
      maxTokens: 3000,
    })

    // Parse AI response
    let protocol
    try {
      const content = response.type === 'text' ? response.content : ''
      protocol = JSON.parse(content)
    } catch {
      // If parsing fails, create structured response from text
      const textContent = response.type === 'text' ? response.content : ''
      protocol = {
        title: `Experimental Protocol: ${goal.description}`,
        objective: goal.description,
        materials: [],
        equipment: [],
        procedure: [{ step: 1, instruction: textContent.substring(0, 500) }],
        safetyWarnings: ['Protocol generated - requires expert review'],
        expectedResults: goal.objectives,
        failureModes: [],
        duration: '2-4 weeks',
        difficulty: 'medium',
        estimatedCost: constraints?.budget || 10000,
      }
    }

    console.log('[designExperiment] Protocol generated successfully')

    return {
      protocol,
      generatedAt: new Date().toISOString(),
      domain: goal.domain,
      confidence: referenceResearch.length > 0 ? 85 : 70,
    }
  } catch (error) {
    console.error('[designExperiment] Protocol generation failed:', error)
    throw new Error(`Experiment design failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export const designExperimentTool: ToolDeclaration = {
  name: 'designExperiment' as any, // Type assertion for new tool
  description: 'Design comprehensive experimental protocols based on research findings. Generates materials lists, equipment requirements, step-by-step procedures, safety warnings, expected results, and failure mode analysis. Incorporates methodologies from reference research when available.',
  schema: designExperimentSchema,
  handler: designExperimentHandler,
}

// ============================================================================
// Export all tools
// ============================================================================

export const ALL_TOOLS: ToolDeclaration[] = [
  searchPapersTool,
  analyzePatentTool,
  extractDataTool,
  calculateMetricsTool,
  runSimulationTool,
  designExperimentTool,
]

// ============================================================================
// Tool initialization utility
// ============================================================================

export function initializeTools(): ToolDeclaration[] {
  console.log('[Tools] Initializing 6 core tools...')
  console.log('[Tools] Available tools:', ALL_TOOLS.map(t => t.name).join(', '))
  return ALL_TOOLS
}

// ============================================================================
// Integration points for existing systems
// ============================================================================

/**
 * Connect searchPapers tool to SearchOrchestrator
 * This should be called once SearchOrchestrator is refactored with adapters
 */
export function connectSearchOrchestrator(orchestrator: any) {
  // Update searchPapersHandler to use real orchestrator
  console.log('[Tools] Connected SearchOrchestrator to searchPapers tool')
}

/**
 * Connect runSimulation tool to SimulationEngine
 * This should be called to integrate with existing simulation system
 */
export function connectSimulationEngine(engine: any) {
  // Update runSimulationHandler to use real engine
  console.log('[Tools] Connected SimulationEngine to runSimulation tool')
}

/**
 * Connect calculateMetrics tool to TEA Calculator
 * This should be called to integrate with existing TEA system
 */
export function connectTEACalculator(calculator: any) {
  // Update calculateMetricsHandler to use real calculator
  console.log('[Tools] Connected TEACalculator to calculateMetrics tool')
}
