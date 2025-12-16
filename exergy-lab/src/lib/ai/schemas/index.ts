import { z } from 'zod'

// ============================================================================
// Search & Discovery Schemas
// ============================================================================

export const PaperSchema = z.object({
  id: z.string(),
  title: z.string().min(5),
  authors: z.array(z.string()).min(1),
  abstract: z.string().optional(),
  doi: z.string().optional(),
  url: z.string().url().optional(),
  publicationDate: z.string().optional(),
  citationCount: z.number().int().min(0),
  venue: z.string().optional(),
  relevanceScore: z.number().min(0).max(100),
  source: z.enum([
    'semantic-scholar',
    'arxiv',
    'pubmed',
    'consensus',
    'chemrxiv',
    'biorxiv',
    'nrel',
    'ieee',
    'iea',
    'inspire',
  ]),
})

export const SearchResultSchema = z.object({
  papers: z.array(PaperSchema),
  totalResults: z.number().int().min(0),
  searchTime: z.number().min(0),
  query: z.string(),
})

export const PatentSchema = z.object({
  id: z.string(),
  title: z.string().min(5),
  abstract: z.string().optional(),
  inventors: z.array(z.string()),
  assignee: z.string().optional(),
  publicationDate: z.string(),
  filingDate: z.string().optional(),
  patentNumber: z.string(),
  url: z.string().url().optional(),
  claims: z.array(z.string()).optional(),
  citations: z.number().int().min(0).optional(),
  relevanceScore: z.number().min(0).max(100),
})

export const PatentAnalysisSchema = z.object({
  patent: PatentSchema,
  noveltyScore: z.number().min(0).max(100),
  technicalDepth: z.number().min(0).max(100),
  commercialPotential: z.number().min(0).max(100),
  keyInnovations: z.array(z.string()),
  relatedPatents: z.array(z.string()),
  marketApplications: z.array(z.string()),
})

// ============================================================================
// Discovery & Idea Generation Schemas
// ============================================================================

export const NovelIdeaSchema = z.object({
  title: z.string().min(10).max(200),
  description: z.string().min(50).max(2000),
  novelty: z.number().min(0).max(100),
  feasibility: z.number().min(0).max(100),
  impact: z.number().min(0).max(100),
  domains: z.array(z.string()).min(1),
  keyInsights: z.array(z.string()).min(1),
  technicalApproach: z.string().min(20),
  estimatedCost: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
    currency: z.string().default('USD'),
  }).optional(),
  timeframe: z.string().optional(),
  risks: z.array(z.string()).optional(),
  nextSteps: z.array(z.string()).optional(),
})

export const IdeaGenerationSchema = z.object({
  ideas: z.array(NovelIdeaSchema).min(1).max(10),
  totalSourcesAnalyzed: z.number().int().min(0),
  crossDomainPatterns: z.array(z.string()),
  keyThemes: z.array(z.string()),
  recommendations: z.array(z.string()),
})

export const DiscoveryReportSchema = z.object({
  summary: z.string().min(50),
  ideas: z.array(NovelIdeaSchema).min(1),
  searchStats: z.object({
    totalSourcesAnalyzed: z.number().int().min(0),
    papers: z.number().int().min(0),
    patents: z.number().int().min(0),
    datasets: z.number().int().min(0),
    news: z.number().int().min(0),
  }),
  patterns: z.array(z.object({
    name: z.string(),
    description: z.string(),
    frequency: z.number().int().min(0),
    significance: z.number().min(0).max(100),
  })),
  recommendations: z.array(z.string()).min(1),
  timestamp: z.number(),
})

// ============================================================================
// Experiment Design Schemas
// ============================================================================

export const ExperimentStepSchema = z.object({
  stepNumber: z.number().int().min(1),
  title: z.string(),
  description: z.string(),
  duration: z.string().optional(),
  equipment: z.array(z.string()).optional(),
  safety: z.array(z.string()).optional(),
  expectedOutcome: z.string().optional(),
})

export const ExperimentProtocolSchema = z.object({
  title: z.string().min(10),
  objective: z.string().min(20),
  hypothesis: z.string().optional(),
  steps: z.array(ExperimentStepSchema).min(1),
  variables: z.object({
    independent: z.array(z.string()),
    dependent: z.array(z.string()),
    controlled: z.array(z.string()),
  }),
  equipment: z.array(z.string()),
  safetyPrecautions: z.array(z.string()),
  dataCollection: z.string(),
  analysisMethod: z.string(),
  estimatedDuration: z.string(),
  successCriteria: z.array(z.string()),
})

export const FailureModeSchema = z.object({
  mode: z.string(),
  probability: z.enum(['low', 'medium', 'high']),
  impact: z.enum(['low', 'medium', 'high']),
  mitigation: z.string(),
  earlyWarnings: z.array(z.string()),
})

export const ExperimentDesignSchema = z.object({
  protocol: ExperimentProtocolSchema,
  failureModes: z.array(FailureModeSchema),
  optimizationSuggestions: z.array(z.string()),
  alternativeApproaches: z.array(z.string()).optional(),
})

// ============================================================================
// TEA (Techno-Economic Analysis) Schemas
// ============================================================================

export const TEAInsightSchema = z.object({
  category: z.enum([
    'financial',
    'technical',
    'market',
    'risk',
    'opportunity',
    'recommendation',
  ]),
  title: z.string(),
  description: z.string().min(20),
  severity: z.enum(['low', 'medium', 'high']).optional(),
  actionable: z.boolean(),
  priority: z.number().min(1).max(10).optional(),
})

export const TEAAnalysisSchema = z.object({
  summary: z.string().min(50),
  insights: z.array(TEAInsightSchema).min(1),
  strengths: z.array(z.string()).min(1),
  weaknesses: z.array(z.string()).min(1),
  opportunities: z.array(z.string()).min(1),
  threats: z.array(z.string()).min(1),
  recommendations: z.array(z.string()).min(1),
  marketAnalysis: z.object({
    targetMarket: z.string(),
    marketSize: z.string(),
    competition: z.string(),
    barriers: z.array(z.string()),
  }).optional(),
  riskAssessment: z.object({
    technicalRisks: z.array(z.string()),
    financialRisks: z.array(z.string()),
    marketRisks: z.array(z.string()),
    mitigationStrategies: z.array(z.string()),
  }).optional(),
})

// ============================================================================
// Simulation Schemas
// ============================================================================

export const SimulationResultSchema = z.object({
  success: z.boolean(),
  tier: z.enum(['tier1', 'tier2', 'tier3']),
  results: z.object({
    energyOutput: z.number().optional(),
    efficiency: z.number().optional(),
    cost: z.number().optional(),
    performanceMetrics: z.record(z.string(), z.number()).optional(),
  }),
  charts: z.array(z.object({
    type: z.string(),
    data: z.any(),
    title: z.string(),
  })).optional(),
  duration: z.number(),
  timestamp: z.number(),
})

// ============================================================================
// Data Extraction Schemas
// ============================================================================

export const ExtractedDataSchema = z.object({
  format: z.enum(['pdf', 'docx', 'xlsx', 'csv', 'json']),
  content: z.object({
    text: z.string().optional(),
    tables: z.array(z.object({
      headers: z.array(z.string()),
      rows: z.array(z.array(z.any())),
    })).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
    sections: z.array(z.object({
      title: z.string(),
      content: z.string(),
    })).optional(),
  }),
  extractionMethod: z.string(),
  confidence: z.number().min(0).max(100),
  warnings: z.array(z.string()).optional(),
})

// ============================================================================
// Agent Execution Schemas
// ============================================================================

export const AgentPlanSchema = z.object({
  steps: z.array(z.string()).min(1),
  tools: z.array(z.object({
    name: z.string(),
    params: z.any(),
    rationale: z.string(),
  })),
  expectedGaps: z.array(z.string()),
  complexity: z.number().min(1).max(10),
  estimatedDuration: z.number().min(0),
})

export const AgentAnalysisSchema = z.object({
  synthesis: z.string().min(20),
  keyFindings: z.array(z.string()).min(1),
  gaps: z.array(z.string()),
  needsMoreInfo: z.boolean(),
  refinedQuery: z.string().optional(),
  confidence: z.number().min(0).max(100),
})

export const AgentResponseSchema = z.object({
  answer: z.string().min(20),
  sources: z.array(z.object({
    title: z.string(),
    url: z.string().url().optional(),
    authors: z.array(z.string()).optional(),
    year: z.number().int().optional(),
    relevance: z.number().min(0).max(100),
    type: z.enum(['paper', 'patent', 'dataset', 'news', 'report']).optional(),
  })),
  keyFindings: z.array(z.string()),
  recommendations: z.array(z.string()),
  confidence: z.number().min(0).max(100),
})

export const AgentResultSchema = z.object({
  success: z.boolean(),
  response: z.string().min(20),
  sources: z.array(z.object({
    title: z.string(),
    url: z.string().url().optional(),
    authors: z.array(z.string()).optional(),
    year: z.number().int().optional(),
    relevance: z.number().min(0).max(100),
    type: z.enum(['paper', 'patent', 'dataset', 'news', 'report']),
  })),
  toolCalls: z.array(z.object({
    toolName: z.string(),
    params: z.any(),
    callId: z.string(),
  })),
  steps: z.array(z.object({
    phase: z.enum(['plan', 'execute', 'analyze', 'iterate', 'respond']),
    description: z.string(),
    timestamp: z.number(),
    duration: z.number(),
    data: z.any(),
  })),
  duration: z.number().min(0),
  error: z.string().optional(),
})

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validate AI output against a schema with retry on failure
 */
export async function validateAIOutput<T>(
  output: string,
  schema: z.ZodSchema<T>,
  options: {
    retries?: number
    onRetry?: (error: z.ZodError, attempt: number) => Promise<string>
  } = {}
): Promise<{ success: true; data: T } | { success: false; error: z.ZodError }> {
  const { retries = 3, onRetry } = options

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Try to parse JSON
      const parsed = JSON.parse(output)

      // Validate against schema
      const validated = schema.parse(parsed)

      return { success: true, data: validated }
    } catch (error) {
      if (error instanceof z.ZodError) {
        // If we have retries left and a retry callback, try to correct
        if (attempt < retries - 1 && onRetry) {
          try {
            output = await onRetry(error, attempt + 1)
            continue
          } catch (retryError) {
            // If retry callback fails, continue to next attempt or fail
            if (attempt === retries - 1) {
              return { success: false, error }
            }
          }
        } else if (attempt === retries - 1) {
          // Last attempt, return error
          return { success: false, error }
        }
      } else {
        // JSON parse error or other error
        if (attempt === retries - 1) {
          // Convert to Zod error format
          const zodError = new z.ZodError([
            {
              code: 'custom',
              message: `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
              path: [],
            },
          ])
          return { success: false, error: zodError }
        }
      }
    }
  }

  // Should never reach here, but TypeScript needs this
  const zodError = new z.ZodError([
    {
      code: 'custom',
      message: 'Validation failed after all retries',
      path: [],
    },
  ])
  return { success: false, error: zodError }
}

/**
 * Create a corrective prompt from Zod validation errors
 */
export function createCorrectivePrompt(
  originalPrompt: string,
  output: string,
  error: z.ZodError
): string {
  const errorMessages = error.issues.map((err) => {
    const path = err.path.join('.')
    return `- ${path ? `Field "${path}"` : 'Root'}: ${err.message}`
  }).join('\n')

  return `The previous output had validation errors:

${errorMessages}

Original prompt:
${originalPrompt}

Previous output:
${output}

Please provide a corrected JSON response that fixes these validation errors. Ensure all required fields are present and have the correct types.`
}

/**
 * Safely parse AI output with fallback
 */
export function safeParseAIOutput<T>(
  output: string,
  schema: z.ZodSchema<T>,
  fallback: T
): T {
  try {
    const parsed = JSON.parse(output)
    return schema.parse(parsed)
  } catch {
    return fallback
  }
}

/**
 * Get human-readable validation error messages
 */
export function formatValidationErrors(error: z.ZodError): string[] {
  return error.issues.map((err) => {
    const path = err.path.length > 0 ? `${err.path.join('.')}: ` : ''
    return `${path}${err.message}`
  })
}

// ============================================================================
// Export all schemas as a collection
// ============================================================================

export const AISchemas = {
  // Search & Discovery
  Paper: PaperSchema,
  SearchResult: SearchResultSchema,
  Patent: PatentSchema,
  PatentAnalysis: PatentAnalysisSchema,

  // Discovery & Ideas
  NovelIdea: NovelIdeaSchema,
  IdeaGeneration: IdeaGenerationSchema,
  DiscoveryReport: DiscoveryReportSchema,

  // Experiments
  ExperimentStep: ExperimentStepSchema,
  ExperimentProtocol: ExperimentProtocolSchema,
  FailureMode: FailureModeSchema,
  ExperimentDesign: ExperimentDesignSchema,

  // TEA
  TEAInsight: TEAInsightSchema,
  TEAAnalysis: TEAAnalysisSchema,

  // Simulations
  SimulationResult: SimulationResultSchema,

  // Data Extraction
  ExtractedData: ExtractedDataSchema,

  // Agent Execution
  AgentPlan: AgentPlanSchema,
  AgentAnalysis: AgentAnalysisSchema,
  AgentResponse: AgentResponseSchema,
}

// Export types inferred from schemas
export type Paper = z.infer<typeof PaperSchema>
export type SearchResult = z.infer<typeof SearchResultSchema>
export type Patent = z.infer<typeof PatentSchema>
export type PatentAnalysis = z.infer<typeof PatentAnalysisSchema>
export type NovelIdea = z.infer<typeof NovelIdeaSchema>
export type IdeaGeneration = z.infer<typeof IdeaGenerationSchema>
export type DiscoveryReport = z.infer<typeof DiscoveryReportSchema>
export type ExperimentStep = z.infer<typeof ExperimentStepSchema>
export type ExperimentProtocol = z.infer<typeof ExperimentProtocolSchema>
export type FailureMode = z.infer<typeof FailureModeSchema>
export type ExperimentDesign = z.infer<typeof ExperimentDesignSchema>
export type TEAInsight = z.infer<typeof TEAInsightSchema>
export type TEAAnalysis = z.infer<typeof TEAAnalysisSchema>
export type SimulationResult = z.infer<typeof SimulationResultSchema>
export type ExtractedData = z.infer<typeof ExtractedDataSchema>
export type AgentPlan = z.infer<typeof AgentPlanSchema>
export type AgentAnalysis = z.infer<typeof AgentAnalysisSchema>
export type AgentResponse = z.infer<typeof AgentResponseSchema>
