import { EventEmitter } from 'events'
import { getGlobalToolRegistry } from '../tools/registry'
import { executeWithTools, continueAfterFunctionCalls } from '../model-router'
import { executeResilient } from '../error-recovery'
import { AISchemas, validateAIOutput } from '../schemas'
import {
  AgentResult,
  AgentPhase,
  AgentStep,
  AgentPlan,
  AgentAnalysis,
  AgentResponse,
  AgentConfig,
  StatusUpdate,
  ToolCall,
  ToolName,
  ToolResult,
  FunctionCall,
  DEFAULT_AGENT_CONFIG,
} from '@/types/agent'

/**
 * 5-Phase Reasoning Engine for Agentic AI
 *
 * Implements sophisticated multi-step reasoning with:
 * - PLAN: Break down user query into sub-goals and tool calls
 * - EXECUTE: Run tools to gather information
 * - ANALYZE: Synthesize results and identify gaps
 * - ITERATE: Decide if more information is needed
 * - RESPOND: Generate final answer with citations
 *
 * Features:
 * - Event-driven status updates
 * - Tool orchestration via registry
 * - Recursive iteration for complex queries
 * - Structured output validation
 * - Resilient error handling
 */
export class ReasoningEngine extends EventEmitter {
  private config: AgentConfig
  private toolRegistry = getGlobalToolRegistry()
  private currentSessionId: string | null = null
  private iterationCount = 0
  private consecutiveToolFailures = 0
  private startTime = 0

  constructor(config: Partial<AgentConfig> = {}) {
    super()
    this.config = { ...DEFAULT_AGENT_CONFIG, ...config }
    console.log('[ReasoningEngine] Initialized with config:', {
      maxIterations: this.config.maxIterations,
      enableStreaming: this.config.enableStreaming,
      maxTokens: this.config.maxTokens,
      timeout: this.config.timeout,
    })
  }

  /**
   * Main execution method - runs the complete 5-phase agent loop
   */
  async execute(userQuery: string, sessionId?: string): Promise<AgentResult> {
    // Only reset startTime on first call (not recursive iterations)
    if (this.iterationCount === 0) {
      this.startTime = Date.now()
      this.consecutiveToolFailures = 0
    }
    this.currentSessionId = sessionId || this.generateSessionId()

    console.log('[ReasoningEngine] === Execute Start ===')
    console.log('[ReasoningEngine] Session ID:', this.currentSessionId)
    console.log('[ReasoningEngine] Query:', userQuery.substring(0, 100) + (userQuery.length > 100 ? '...' : ''))
    console.log('[ReasoningEngine] Iteration:', this.iterationCount)
    console.log('[ReasoningEngine] Elapsed time:', Date.now() - this.startTime, 'ms')

    const steps: AgentStep[] = []
    const toolCalls: ToolCall[] = []
    const sources: any[] = []

    try {
      this.emitStatus({
        step: 'initializing',
        phase: 'plan',
        progress: 0,
        message: 'Starting agent execution...',
        timestamp: Date.now(),
      })

      // ===================================================================
      // PHASE 1: PLAN - Break down query into sub-goals
      // ===================================================================
      const plan = await this.planExecution(userQuery)
      steps.push({
        phase: 'plan',
        description: 'Created execution plan',
        data: plan,
        timestamp: Date.now(),
        duration: 0,
      })

      this.emitStatus({
        step: 'planning',
        phase: 'plan',
        progress: 20,
        message: `Planned ${plan.steps.length} steps with ${plan.tools.length} tool calls`,
        details: { steps: plan.steps.length, tools: plan.tools.length },
        timestamp: Date.now(),
      })

      // ===================================================================
      // PHASE 2: EXECUTE - Run tools to gather information
      // ===================================================================
      const toolResults = await this.executeTools(plan.tools)
      toolCalls.push(...plan.tools.map((tool, index) => ({
        toolName: tool.name as ToolName,
        params: tool.params,
        callId: `${this.currentSessionId}_${index}`,
      })))

      steps.push({
        phase: 'execute',
        description: `Executed ${toolResults.length} tools`,
        data: toolResults,
        timestamp: Date.now(),
        duration: 0,
      })

      this.emitStatus({
        step: 'executing',
        phase: 'execute',
        progress: 50,
        message: `Executed ${toolResults.length} tools successfully`,
        details: {
          successCount: toolResults.filter(r => r.success).length,
          totalCount: toolResults.length,
        },
        timestamp: Date.now(),
      })

      // Extract sources from tool results
      toolResults.forEach(result => {
        if (result.success && result.data) {
          if (Array.isArray(result.data.papers)) {
            sources.push(...result.data.papers)
          }
          if (Array.isArray(result.data.sources)) {
            sources.push(...result.data.sources)
          }
        }
      })

      // ===================================================================
      // PHASE 3: ANALYZE - Synthesize results and identify gaps
      // ===================================================================
      const analysis = await this.analyzeResults(userQuery, toolResults, plan)
      steps.push({
        phase: 'analyze',
        description: 'Analyzed results and identified gaps',
        data: analysis,
        timestamp: Date.now(),
        duration: 0,
      })

      this.emitStatus({
        step: 'analyzing',
        phase: 'analyze',
        progress: 70,
        message: `Analysis complete. Confidence: ${analysis.confidence}%`,
        details: {
          confidence: analysis.confidence,
          gapsFound: analysis.gaps.length,
          needsMoreInfo: analysis.needsMoreInfo,
        },
        timestamp: Date.now(),
      })

      // ===================================================================
      // PHASE 4: ITERATE - Decide if more information is needed
      // ===================================================================
      console.log('[ReasoningEngine] === Iteration Decision ===')
      console.log('[ReasoningEngine] needsMoreInfo:', analysis.needsMoreInfo)
      console.log('[ReasoningEngine] confidence:', analysis.confidence)
      console.log('[ReasoningEngine] iterationCount:', this.iterationCount, '/', this.config.maxIterations)
      console.log('[ReasoningEngine] consecutiveToolFailures:', this.consecutiveToolFailures)

      // Check elapsed time before iterating
      const elapsedTime = Date.now() - this.startTime
      const remainingTime = (this.config.timeout || 120000) - elapsedTime
      console.log('[ReasoningEngine] Elapsed time:', elapsedTime, 'ms, Remaining:', remainingTime, 'ms')

      // Check for conditions that should prevent iteration
      if (this.consecutiveToolFailures >= 3) {
        console.warn('[ReasoningEngine] Breaking iteration - too many consecutive tool failures:', this.consecutiveToolFailures)
        return this.generateFallbackResult(userQuery, toolResults, steps, toolCalls, sources, 'Too many tool failures')
      }

      if (remainingTime < 15000) {
        console.warn('[ReasoningEngine] Breaking iteration - insufficient time remaining:', remainingTime, 'ms')
        return this.generateFallbackResult(userQuery, toolResults, steps, toolCalls, sources, 'Timeout approaching')
      }

      if (analysis.needsMoreInfo && this.iterationCount < this.config.maxIterations) {
        this.iterationCount++
        console.log('[ReasoningEngine] Will iterate. New iteration count:', this.iterationCount)

        this.emitStatus({
          step: 'iterating',
          phase: 'iterate',
          progress: 75,
          message: `Iteration ${this.iterationCount}: Gathering additional information`,
          details: {
            iteration: this.iterationCount,
            refinedQuery: analysis.refinedQuery,
            gaps: analysis.gaps,
          },
          timestamp: Date.now(),
        })

        steps.push({
          phase: 'iterate',
          description: `Iteration ${this.iterationCount}: Need more information`,
          data: { refinedQuery: analysis.refinedQuery, gaps: analysis.gaps },
          timestamp: Date.now(),
          duration: 0,
        })

        // Recursive call with refined query
        const iterationResult = await this.execute(
          analysis.refinedQuery || userQuery,
          this.currentSessionId
        )

        // Merge iteration results
        return {
          ...iterationResult,
          steps: [...steps, ...iterationResult.steps],
          toolCalls: [...toolCalls, ...iterationResult.toolCalls],
          sources: [...sources, ...iterationResult.sources],
          duration: Date.now() - this.startTime,
        }
      } else {
        console.log('[ReasoningEngine] Not iterating. Proceeding to response generation.')
      }

      // ===================================================================
      // PHASE 5: RESPOND - Generate final answer with citations
      // ===================================================================
      const response = await this.generateResponse(userQuery, analysis, toolResults)
      steps.push({
        phase: 'respond',
        description: 'Generated final response with citations',
        data: response,
        timestamp: Date.now(),
        duration: 0,
      })

      this.emitStatus({
        step: 'completed',
        phase: 'respond',
        progress: 100,
        message: 'Agent execution completed successfully',
        details: {
          sourcesUsed: response.sources.length,
          keyFindings: response.keyFindings.length,
        },
        timestamp: Date.now(),
      })

      // Build final result
      // Use sources from tool results if available, fallback to AI-generated sources
      const finalSources = sources.length > 0 ? sources : response.sources

      const result: AgentResult = {
        success: true,
        response: response.answer,
        sources: finalSources,
        toolCalls,
        steps,
        duration: Date.now() - this.startTime,
        metadata: {
          sessionId: this.currentSessionId,
          iterations: this.iterationCount,
          totalToolCalls: toolCalls.length,
          confidence: analysis.confidence,
          keyFindings: analysis.keyFindings,
          // Include full analysis for comprehensive results display
          synthesis: analysis.synthesis,
          recommendations: response.recommendations,
          responseKeyFindings: response.keyFindings,
        },
      }

      return result

    } catch (error) {
      console.error('[ReasoningEngine] Execution failed:', error)

      this.emitStatus({
        step: 'error',
        phase: 'respond',
        progress: 0,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
      })

      return {
        success: false,
        response: '',
        sources: [],
        toolCalls,
        steps,
        duration: Date.now() - this.startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          sessionId: this.currentSessionId,
          iterations: this.iterationCount,
          totalToolCalls: toolCalls.length,
          confidence: 0,
        },
      }
    }
  }

  /**
   * PHASE 1: PLAN
   * Break down user query into sub-goals and identify required tools
   */
  private async planExecution(userQuery: string): Promise<AgentPlan> {
    const planningPrompt = `You are a planning agent. Given the user query, create an execution plan.

User Query: "${userQuery}"

Available Tools:
${this.toolRegistry.getAllTools().map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

Create a plan with:
1. High-level steps to answer the query
2. Specific tool calls needed (with parameters)
3. Expected information gaps
4. Estimated complexity (1-10)

CRITICAL TYPE REQUIREMENTS:
- "maxResults" MUST be a NUMBER (e.g., 20), NOT a string (NOT "20")
- "iterations", "targetAccuracy" MUST be NUMBERS
- Boolean fields like "includePapers" MUST be true/false (NOT "true"/"false")

IMPORTANT: Respond with ONLY valid JSON, no markdown or explanation. Use this exact structure:
{
  "steps": ["step 1", "step 2"],
  "tools": [{"name": "searchPapers", "params": {"query": "search terms", "maxResults": 20}, "rationale": "why needed"}],
  "expectedGaps": ["potential gap 1"],
  "complexity": 5,
  "estimatedDuration": 15000
}

Note: maxResults in the example above is the number 20, NOT the string "20".
`

    // Try up to 2 times before falling back to default plan
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const planResult = await executeResilient(
          () => executeWithTools(planningPrompt, { model: 'quality' }),
          'reasoning:plan'
        )

        if (planResult.type === 'text') {
          // Parse and validate the plan
          const validated = await validateAIOutput(planResult.content, AISchemas.AgentPlan)

          if (validated.success) {
            console.log('[ReasoningEngine] Plan validation succeeded on attempt', attempt + 1)
            return validated.data
          }

          // Log validation error details for debugging
          console.warn(`[ReasoningEngine] Plan validation attempt ${attempt + 1} failed:`,
            validated.error?.message || 'Unknown validation error')
          console.warn('[ReasoningEngine] Raw response preview:', planResult.content.substring(0, 200))
        }
      } catch (error) {
        console.warn(`[ReasoningEngine] Plan execution attempt ${attempt + 1} error:`, error)
      }
    }

    // Fallback after retries exhausted
    console.warn('[ReasoningEngine] Plan validation failed after retries, using default plan')
    return this.createDefaultPlan(userQuery)
  }

  /**
   * Coerce AI-generated tool params to correct types
   * The AI often returns strings for numeric fields - this fixes that
   */
  private coerceToolParams(toolName: string, params: any): any {
    if (!params || typeof params !== 'object') return params

    const coerced = { ...params }

    // Known numeric fields for each tool
    const numericFields: Record<string, string[]> = {
      searchPapers: ['maxResults'],
      runSimulation: ['iterations', 'targetAccuracy'],
      designExperiment: ['duration', 'sampleSize'],
      calculateMetrics: ['timeHorizon', 'discountRate'],
    }

    // Known boolean fields
    const booleanFields: Record<string, string[]> = {
      searchPapers: ['includePapers', 'includePatents', 'includeDatasets'],
      runSimulation: ['generateVisualizations'],
      designExperiment: ['includeSafety', 'includeFailureAnalysis'],
      calculateMetrics: ['includeSensitivity', 'includeRecommendations'],
    }

    // Coerce numeric fields
    const numFields = numericFields[toolName] || []
    for (const field of numFields) {
      if (field in coerced && typeof coerced[field] === 'string') {
        const parsed = parseFloat(coerced[field])
        coerced[field] = isNaN(parsed) ? (field === 'maxResults' ? 20 : 0) : parsed
        console.log(`[ReasoningEngine] Coerced ${toolName}.${field}: "${params[field]}" -> ${coerced[field]} (number)`)
      }
    }

    // Coerce boolean fields
    const boolFields = booleanFields[toolName] || []
    for (const field of boolFields) {
      if (field in coerced && typeof coerced[field] === 'string') {
        coerced[field] = coerced[field] === 'true' || coerced[field] === '1'
        console.log(`[ReasoningEngine] Coerced ${toolName}.${field}: "${params[field]}" -> ${coerced[field]} (boolean)`)
      }
    }

    return coerced
  }

  /**
   * PHASE 2: EXECUTE
   * Run tool calls to gather information
   */
  private async executeTools(toolCalls: Array<{ name: string; params: any; rationale?: string }>): Promise<ToolResult[]> {
    console.log('[ReasoningEngine] === Execute Tools ===')
    console.log('[ReasoningEngine] Tool calls count:', toolCalls.length)
    console.log('[ReasoningEngine] Tools to execute:', toolCalls.map(t => t.name).join(', '))

    const results: ToolResult[] = []
    let failureCountThisIteration = 0

    for (const toolCall of toolCalls) {
      // Coerce AI-generated params to correct types BEFORE executing
      const coercedParams = this.coerceToolParams(toolCall.name, toolCall.params)

      console.log(`[ReasoningEngine] Executing tool: ${toolCall.name}`)
      console.log(`[ReasoningEngine] Tool params (coerced):`, JSON.stringify(coercedParams, null, 2))

      try {
        this.emitStatus({
          step: `executing_${toolCall.name}`,
          phase: 'execute',
          progress: 40 + (results.length / toolCalls.length) * 20,
          message: `Running ${toolCall.name}...`,
          details: { tool: toolCall.name, rationale: toolCall.rationale || 'Execute tool' },
          timestamp: Date.now(),
        })

        const result = await this.toolRegistry.execute({
          toolName: toolCall.name as any,
          params: coercedParams,  // Use coerced params
          callId: `${this.currentSessionId}_${toolCall.name}_${Date.now()}`,
        })

        console.log(`[ReasoningEngine] Tool ${toolCall.name} result:`, {
          success: result.success,
          hasData: !!result.data,
          error: result.error,
          duration: result.duration,
        })

        if (result.success) {
          // Reset consecutive failures on success
          this.consecutiveToolFailures = 0
        } else {
          failureCountThisIteration++
          this.consecutiveToolFailures++
          console.warn(`[ReasoningEngine] Tool ${toolCall.name} FAILED:`, result.error)
          console.warn(`[ReasoningEngine] Consecutive failures: ${this.consecutiveToolFailures}`)
        }

        results.push(result)
      } catch (error) {
        failureCountThisIteration++
        this.consecutiveToolFailures++
        console.error(`[ReasoningEngine] Tool ${toolCall.name} threw exception:`, error)
        console.error(`[ReasoningEngine] Consecutive failures: ${this.consecutiveToolFailures}`)

        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: 0,
          timestamp: Date.now(),
        })
      }
    }

    console.log('[ReasoningEngine] === Tool Execution Summary ===')
    console.log('[ReasoningEngine] Total tools:', results.length)
    console.log('[ReasoningEngine] Successful:', results.filter(r => r.success).length)
    console.log('[ReasoningEngine] Failed this iteration:', failureCountThisIteration)
    console.log('[ReasoningEngine] Consecutive failures total:', this.consecutiveToolFailures)

    return results
  }

  /**
   * PHASE 3: ANALYZE
   * Synthesize tool results and identify knowledge gaps
   */
  private async analyzeResults(
    originalQuery: string,
    toolResults: ToolResult[],
    plan: AgentPlan
  ): Promise<AgentAnalysis> {
    console.log('[ReasoningEngine] === Analyze Results ===')
    console.log('[ReasoningEngine] Tool results summary:', toolResults.map(r => ({
      success: r.success,
      error: r.error,
      hasData: !!r.data,
    })))

    const successfulResults = toolResults.filter(r => r.success)
    const failedResults = toolResults.filter(r => !r.success)

    console.log('[ReasoningEngine] Successful results:', successfulResults.length)
    console.log('[ReasoningEngine] Failed results:', failedResults.length)

    if (failedResults.length > 0) {
      console.log('[ReasoningEngine] Failed tool errors:', failedResults.map(r => r.error))
    }

    const analysisPrompt = `You are an analysis agent. Synthesize the tool results and determine if more information is needed.

Original Query: "${originalQuery}"

Tool Results:
${toolResults.map((result, i) => `
Tool ${i + 1}: ${result.success ? 'SUCCESS' : 'FAILED'}
${result.success ? JSON.stringify(result.data, null, 2) : `Error: ${result.error}`}
`).join('\n')}

Expected Gaps from Plan: ${(plan.expectedGaps || []).join(', ')}

Analyze the results and respond with JSON:
{
  "synthesis": "summary of findings",
  "gaps": ["remaining gap 1", "remaining gap 2"],
  "needsMoreInfo": false,
  "refinedQuery": null,
  "confidence": 85,
  "keyFindings": ["finding 1", "finding 2"]
}

Set "needsMoreInfo" to true if critical information is missing.
Set "refinedQuery" to a more specific query if iteration is needed.
Set "confidence" 0-100 based on how well the query can be answered.
`

    const analysisResult = await executeResilient(
      () => executeWithTools(analysisPrompt, { model: 'fast' }),
      'reasoning:analyze'
    )

    if (analysisResult.type === 'text') {
      const validated = await validateAIOutput(analysisResult.content, AISchemas.AgentAnalysis)

      if (validated.success) {
        console.log('[ReasoningEngine] Analysis validation succeeded')
        console.log('[ReasoningEngine] Analysis result:', {
          confidence: validated.data.confidence,
          needsMoreInfo: validated.data.needsMoreInfo,
          gapsCount: validated.data.gaps.length,
          keyFindingsCount: validated.data.keyFindings.length,
        })
        return validated.data
      } else {
        console.warn('[ReasoningEngine] Analysis validation FAILED:', validated.error?.message)
        console.warn('[ReasoningEngine] Raw analysis response:', analysisResult.content.substring(0, 500))
      }
    }

    // Fallback analysis - don't iterate on validation failure
    console.log('[ReasoningEngine] Using fallback analysis (no iteration)')
    const fallbackAnalysis: AgentAnalysis = {
      synthesis: `Analysis completed with ${successfulResults.length}/${toolResults.length} successful tool executions`,
      gaps: failedResults.map(r => `Tool error: ${r.error}`),
      needsMoreInfo: false,  // Don't iterate on validation failure
      refinedQuery: undefined,
      confidence: successfulResults.length > 0 ? 60 : 30,
      keyFindings: [],
    }
    console.log('[ReasoningEngine] Fallback analysis:', fallbackAnalysis)
    return fallbackAnalysis
  }

  /**
   * PHASE 5: RESPOND
   * Generate final answer with citations
   */
  private async generateResponse(
    originalQuery: string,
    analysis: AgentAnalysis,
    toolResults: ToolResult[]
  ): Promise<AgentResponse> {
    const responsePrompt = `You are a response generation agent. Create a comprehensive answer to the user's query.

User Query: "${originalQuery}"

Analysis Summary: ${analysis.synthesis}

Key Findings:
${analysis.keyFindings.map((finding, i) => `${i + 1}. ${finding}`).join('\n')}

Tool Results Data:
${toolResults.filter(r => r.success).map((result, i) => `
Source ${i + 1}:
${JSON.stringify(result.data, null, 2)}
`).join('\n')}

Create a response with:
1. Clear, comprehensive answer
2. Proper citations to sources
3. Key findings highlighted
4. Recommendations if applicable

Respond with JSON:
{
  "answer": "comprehensive answer with citations",
  "sources": [{"title": "...", "url": "...", "relevance": 95}],
  "keyFindings": ["finding 1", "finding 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "confidence": 90
}
`

    const responseResult = await executeResilient(
      () => executeWithTools(responsePrompt, { model: 'quality' }),
      'reasoning:respond'
    )

    if (responseResult.type === 'text') {
      const validated = await validateAIOutput(responseResult.content, AISchemas.AgentResponse)

      if (validated.success) {
        return validated.data
      }
    }

    // Fallback response
    return {
      answer: analysis.synthesis,
      sources: [],
      keyFindings: analysis.keyFindings,
      recommendations: [],
      confidence: analysis.confidence,
    }
  }

  /**
   * Emit status update event
   */
  private emitStatus(status: StatusUpdate): void {
    this.emit('status', status)

    if (this.config.enableStreaming) {
      console.log(`[ReasoningEngine] ${status.phase.toUpperCase()} - ${status.message}`)
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  }

  /**
   * Create a default plan when AI planning fails
   * Extracts key terms from query to improve search quality
   */
  private createDefaultPlan(query: string): AgentPlan {
    // Extract meaningful terms from query for better search
    const queryTerms = query
      .split(/\s+/)
      .filter(w => w.length > 3 && !['what', 'which', 'that', 'this', 'with', 'from', 'have', 'been'].includes(w.toLowerCase()))
      .slice(0, 6)
    const searchQuery = queryTerms.length > 0 ? queryTerms.join(' ') : query.slice(0, 100)

    return {
      steps: [
        `Analyze query: "${query.slice(0, 60)}${query.length > 60 ? '...' : ''}"`,
        'Search academic databases for relevant papers and patents',
        'Analyze and synthesize key findings from sources',
        'Generate comprehensive response with citations',
      ],
      tools: [
        {
          name: 'searchPapers',
          params: {
            query: searchQuery,
            maxResults: 20,
            domains: [],  // Search all domains
          },
          rationale: `Search for papers related to: ${query.slice(0, 80)}`,
        },
      ],
      expectedGaps: [
        'May need follow-up searches for specific subtopics',
        'Some specialized databases may require additional API access',
      ],
      complexity: 5,
      estimatedDuration: 15000,
    }
  }

  /**
   * Generate a fallback result when execution cannot continue
   * Used for timeout, too many failures, etc.
   */
  private generateFallbackResult(
    query: string,
    toolResults: ToolResult[],
    steps: AgentStep[],
    toolCalls: ToolCall[],
    sources: any[],
    reason: string
  ): AgentResult {
    console.warn(`[ReasoningEngine] === Generating Fallback Result ===`)
    console.warn(`[ReasoningEngine] Reason: ${reason}`)
    console.warn(`[ReasoningEngine] Iterations completed: ${this.iterationCount}`)
    console.warn(`[ReasoningEngine] Total tool calls: ${toolCalls.length}`)

    const successfulResults = toolResults.filter(r => r.success)
    const failedResults = toolResults.filter(r => !r.success)

    // Extract any sources we did manage to get
    const extractedSources: any[] = [...sources]
    successfulResults.forEach(result => {
      if (result.data) {
        if (Array.isArray(result.data.papers)) {
          extractedSources.push(...result.data.papers)
        }
        if (Array.isArray(result.data.sources)) {
          extractedSources.push(...result.data.sources)
        }
      }
    })

    const confidence = successfulResults.length > 0 ? 50 : 20

    const result: AgentResult = {
      success: true, // Still mark as success to return partial results
      response: `Research completed with ${successfulResults.length}/${toolResults.length} successful queries. ${reason}. Retrieved ${extractedSources.length} sources.`,
      sources: extractedSources,
      toolCalls,
      steps: [
        ...steps,
        {
          phase: 'respond',
          description: `Fallback response generated: ${reason}`,
          data: { reason, successfulTools: successfulResults.length, failedTools: failedResults.length },
          timestamp: Date.now(),
          duration: 0,
        },
      ],
      duration: Date.now() - this.startTime,
      metadata: {
        sessionId: this.currentSessionId,
        iterations: this.iterationCount,
        totalToolCalls: toolCalls.length,
        confidence,
        keyFindings: [],
        synthesis: `Partial results: ${successfulResults.length} data sources retrieved. ${reason}.`,
        recommendations: ['Review search parameters', 'Check parameter types', 'Retry with simplified query'],
      },
    }

    console.log('[ReasoningEngine] Fallback result generated:', {
      success: result.success,
      sourcesCount: result.sources.length,
      confidence,
      reason,
    })

    return result
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.currentSessionId
  }

  /**
   * Get iteration count
   */
  getIterationCount(): number {
    return this.iterationCount
  }

  /**
   * Reset the engine for a new execution
   */
  reset(): void {
    this.currentSessionId = null
    this.iterationCount = 0
    this.consecutiveToolFailures = 0
    this.startTime = 0
    this.removeAllListeners()
  }
}

/**
 * Create a new reasoning engine instance
 */
export function createReasoningEngine(config?: Partial<AgentConfig>): ReasoningEngine {
  return new ReasoningEngine(config)
}

/**
 * Quick execution helper
 */
export async function executeAgentQuery(
  query: string,
  config?: Partial<AgentConfig>
): Promise<AgentResult> {
  const engine = new ReasoningEngine(config)

  // Set up status logging if streaming is enabled
  if (config?.enableStreaming !== false) {
    engine.on('status', (status: StatusUpdate) => {
      console.log(`[Agent] ${status.phase} - ${status.message}`)
    })
  }

  return engine.execute(query)
}
