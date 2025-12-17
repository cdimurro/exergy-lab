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

  constructor(config: Partial<AgentConfig> = {}) {
    super()
    this.config = { ...DEFAULT_AGENT_CONFIG, ...config }
  }

  /**
   * Main execution method - runs the complete 5-phase agent loop
   */
  async execute(userQuery: string, sessionId?: string): Promise<AgentResult> {
    const startTime = Date.now()
    this.currentSessionId = sessionId || this.generateSessionId()
    this.iterationCount = 0

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
      if (analysis.needsMoreInfo && this.iterationCount < this.config.maxIterations) {
        this.iterationCount++

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
          duration: Date.now() - startTime,
        }
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
      const result: AgentResult = {
        success: true,
        response: response.answer,
        sources: response.sources,
        toolCalls,
        steps,
        duration: Date.now() - startTime,
        metadata: {
          sessionId: this.currentSessionId,
          iterations: this.iterationCount,
          totalToolCalls: toolCalls.length,
          confidence: analysis.confidence,
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
        duration: Date.now() - startTime,
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

Respond with a JSON object matching this structure:
{
  "steps": ["step 1", "step 2", ...],
  "tools": [{"name": "toolName", "params": {...}, "rationale": "why needed"}],
  "expectedGaps": ["potential gap 1", ...],
  "complexity": 5,
  "estimatedDuration": 15000
}
`

    const planResult = await executeResilient(
      () => executeWithTools(planningPrompt, { model: 'quality' }),
      'reasoning:plan'
    )

    if (planResult.type === 'text') {
      // Parse and validate the plan
      const validated = await validateAIOutput(planResult.content, AISchemas.AgentPlan)

      if (validated.success) {
        return validated.data
      } else {
        // Fallback plan if validation fails
        console.warn('[ReasoningEngine] Plan validation failed, using default plan')
        return this.createDefaultPlan(userQuery)
      }
    }

    return this.createDefaultPlan(userQuery)
  }

  /**
   * PHASE 2: EXECUTE
   * Run tool calls to gather information
   */
  private async executeTools(toolCalls: Array<{ name: string; params: any; rationale: string }>): Promise<ToolResult[]> {
    const results: ToolResult[] = []

    for (const toolCall of toolCalls) {
      try {
        this.emitStatus({
          step: `executing_${toolCall.name}`,
          phase: 'execute',
          progress: 40 + (results.length / toolCalls.length) * 20,
          message: `Running ${toolCall.name}...`,
          details: { tool: toolCall.name, rationale: toolCall.rationale },
          timestamp: Date.now(),
        })

        const result = await this.toolRegistry.execute({
          toolName: toolCall.name as any,
          params: toolCall.params,
          callId: `${this.currentSessionId}_${toolCall.name}_${Date.now()}`,
        })

        results.push(result)
      } catch (error) {
        console.error(`[ReasoningEngine] Tool ${toolCall.name} failed:`, error)
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: 0,
          timestamp: Date.now(),
        })
      }
    }

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
    const analysisPrompt = `You are an analysis agent. Synthesize the tool results and determine if more information is needed.

Original Query: "${originalQuery}"

Tool Results:
${toolResults.map((result, i) => `
Tool ${i + 1}: ${result.success ? 'SUCCESS' : 'FAILED'}
${result.success ? JSON.stringify(result.data, null, 2) : `Error: ${result.error}`}
`).join('\n')}

Expected Gaps from Plan: ${plan.expectedGaps.join(', ')}

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
        return validated.data
      }
    }

    // Fallback analysis
    return {
      synthesis: 'Tool execution completed',
      gaps: [],
      needsMoreInfo: false,
      refinedQuery: undefined,
      confidence: 70,
      keyFindings: [],
    }
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
   */
  private createDefaultPlan(query: string): AgentPlan {
    return {
      steps: [
        'Analyze user query',
        'Search for relevant information',
        'Synthesize findings',
        'Generate response',
      ],
      tools: [
        {
          name: 'searchPapers',
          params: { query, maxResults: 20 },
          rationale: 'Find relevant research papers',
        },
      ],
      expectedGaps: ['May need additional domain-specific sources'],
      complexity: 5,
      estimatedDuration: 10000,
    }
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
