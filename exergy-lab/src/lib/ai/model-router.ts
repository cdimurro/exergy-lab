import * as gemini from './gemini'
import * as openai from './openai'
import * as huggingface from './huggingface'
import { rateLimiter, RateLimitError, AIProvider } from './rate-limiter'
import { ThinkingLevel } from './gemini'

/**
 * AI Task Types
 */
export type AITask =
  | 'search-expand' // Expand user search query
  | 'search-rank' // Rank search results
  | 'tea-insights' // Generate TEA insights
  | 'tea-extract' // Extract parameters from files
  | 'experiment-design' // Design experiment protocol
  | 'experiment-failure' // Analyze failure modes
  | 'discovery' // Multi-domain discovery
  | 'simulation-predict' // Predict simulation results
  | 'summarize' // Summarize text
  | 'embeddings' // Generate embeddings

/**
 * Discovery Phase Types (for adaptive thinking)
 */
export type DiscoveryPhase =
  | 'research'
  | 'synthesis'
  | 'hypothesis'
  | 'screening'
  | 'experiment'
  | 'simulation'
  | 'exergy'
  | 'tea'
  | 'patent'
  | 'validation'
  | 'judge'
  | 'rubric_eval'
  | 'publication'

// ============================================================================
// Adaptive Thinking Levels - Optimize token usage per task/phase
// ============================================================================

/**
 * Get appropriate thinking level based on task complexity
 * - 'high': Creative, safety-critical, or judgment tasks
 * - 'medium': Analysis and pattern matching tasks
 * - 'low': Formula-based or filtering tasks
 * - 'minimal': Simple transformations
 */
const PHASE_THINKING_LEVELS: Record<string, ThinkingLevel> = {
  // Discovery phases
  'research': 'medium',      // Data gathering doesn't need deep reasoning
  'synthesis': 'medium',     // Pattern matching and summarization
  'hypothesis': 'high',      // Creative, needs deep thinking
  'screening': 'low',        // Mostly filtering
  'experiment': 'high',      // Safety-critical, needs care
  'simulation': 'medium',    // Computational, not reasoning-heavy
  'exergy': 'low',           // Formula-based calculation
  'tea': 'low',              // Financial formulas
  'patent': 'medium',        // Search + analysis
  'validation': 'high',      // Critical thinking
  'judge': 'high',           // Grading requires rigor
  'rubric_eval': 'high',     // Evaluation requires rigor
  'publication': 'medium',   // Writing/formatting

  // General AI tasks
  'search-expand': 'low',
  'search-rank': 'low',
  'tea-insights': 'medium',
  'tea-extract': 'low',
  'experiment-design': 'high',
  'experiment-failure': 'high',
  'discovery': 'high',
  'simulation-predict': 'medium',
  'summarize': 'low',
}

/**
 * Get thinking level for a task or phase
 */
export function getThinkingLevel(taskOrPhase: string): ThinkingLevel {
  return PHASE_THINKING_LEVELS[taskOrPhase] || 'medium'
}

// ============================================================================
// Token Budgets per Phase - Prevent excessive token usage
// ============================================================================

/**
 * Maximum output tokens per phase/task
 * Lower budgets for formula-based tasks, higher for creative tasks
 */
const PHASE_TOKEN_BUDGETS: Record<string, number> = {
  // Discovery phases
  'research': 4000,
  'synthesis': 3000,
  'hypothesis': 6000,
  'screening': 2000,
  'experiment': 5000,
  'simulation': 4000,
  'exergy': 2000,
  'tea': 2000,
  'patent': 3000,
  'validation': 4000,
  'judge': 3000,
  'rubric_eval': 3000,
  'publication': 5000,

  // General AI tasks
  'search-expand': 500,
  'search-rank': 1000,
  'tea-insights': 2000,
  'tea-extract': 1500,
  'experiment-design': 5000,
  'experiment-failure': 3000,
  'discovery': 6000,
  'simulation-predict': 2000,
  'summarize': 1000,
}

/**
 * Get token budget for a task or phase
 */
export function getTokenBudget(taskOrPhase: string): number {
  return PHASE_TOKEN_BUDGETS[taskOrPhase] || 2048
}

/**
 * Task routing configuration
 * Defines primary and fallback models for each task
 */
const TASK_ROUTING: Record<
  AITask,
  {
    primary: AIProvider
    fallbacks: AIProvider[]
  }
> = {
  'search-expand': {
    primary: 'gemini',
    fallbacks: ['openai', 'huggingface'],
  },
  'search-rank': {
    primary: 'gemini',
    fallbacks: ['openai'],
  },
  'tea-insights': {
    primary: 'gemini',
    fallbacks: ['openai'],
  },
  'tea-extract': {
    primary: 'gemini',
    fallbacks: ['openai'],
  },
  'experiment-design': {
    primary: 'gemini',
    fallbacks: [],
  },
  'experiment-failure': {
    primary: 'gemini',
    fallbacks: [],
  },
  discovery: {
    primary: 'gemini',
    fallbacks: [],
  },
  'simulation-predict': {
    primary: 'gemini',
    fallbacks: ['huggingface'],
  },
  summarize: {
    primary: 'huggingface',
    fallbacks: ['gemini', 'openai'],
  },
  embeddings: {
    primary: 'huggingface',
    fallbacks: ['openai'],
  },
}

/**
 * AI Model Router with intelligent fallback
 */
class AIModelRouter {
  /**
   * Execute an AI task with automatic fallback
   */
  async execute(
    task: AITask,
    prompt: string,
    options: {
      temperature?: number
      maxTokens?: number
      model?: 'fast' | 'quality'
    } = {}
  ): Promise<string> {
    const routing = TASK_ROUTING[task]
    const providers = [routing.primary, ...routing.fallbacks]

    for (const provider of providers) {
      try {
        // Check rate limits
        if (!rateLimiter.canExecute(provider)) {
          const retryAfter = rateLimiter.getRetryAfter(provider)
          console.warn(
            `Rate limit exceeded for ${provider}, trying fallback. Retry after ${retryAfter}ms`
          )
          continue
        }

        // Execute with the provider
        const result = await this.callProvider(provider, prompt, options, task)

        // Consume rate limit token on success
        rateLimiter.consume(provider)

        return result
      } catch (error) {
        console.error(`Error with ${provider}:`, error)
        // Continue to next fallback
        if (provider === providers[providers.length - 1]) {
          // Last provider also failed
          throw new Error(
            `All AI providers failed for task "${task}": ${error}`
          )
        }
      }
    }

    throw new Error(`No available providers for task "${task}"`)
  }

  /**
   * Call a specific AI provider
   */
  private async callProvider(
    provider: AIProvider,
    prompt: string,
    options: {
      temperature?: number
      maxTokens?: number
      model?: 'fast' | 'quality'
    },
    task: AITask
  ): Promise<string> {
    const temperature = options.temperature ?? 0.7
    const maxTokens = options.maxTokens ?? 2048

    switch (provider) {
      case 'gemini': {
        const geminiModel = options.model === 'quality' ? 'pro' : 'flash'
        return await gemini.generateText(prompt, {
          model: geminiModel,
          temperature,
          maxOutputTokens: maxTokens,
          thinkingLevel: getThinkingLevel(task), // Adaptive thinking based on task
        })
      }

      case 'openai': {
        return await openai.generateText(prompt, {
          model: 'gpt-3.5-turbo',
          temperature,
          maxTokens,
        })
      }

      case 'huggingface': {
        // HuggingFace has specialized functions
        if (task === 'summarize') {
          return await huggingface.summarizeText(prompt)
        }
        // For other tasks, fall back to embeddings-based approach
        // This is a simplification - in production, you'd use different models
        throw new Error('HuggingFace not suitable for this task')
      }

      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  }

  /**
   * Stream text generation with fallback
   */
  async *stream(
    task: AITask,
    prompt: string,
    options: {
      temperature?: number
      maxTokens?: number
      model?: 'fast' | 'quality'
    } = {}
  ): AsyncGenerator<string> {
    const routing = TASK_ROUTING[task]
    const provider = routing.primary

    // Check rate limits
    if (!rateLimiter.canExecute(provider)) {
      throw new RateLimitError(provider, rateLimiter.getRetryAfter(provider))
    }

    const temperature = options.temperature ?? 0.7
    const maxTokens = options.maxTokens ?? 2048

    try {
      if (provider === 'gemini') {
        const geminiModel = options.model === 'quality' ? 'pro' : 'flash'
        for await (const chunk of gemini.streamText(prompt, {
          model: geminiModel,
          temperature,
          maxOutputTokens: maxTokens,
          thinkingLevel: getThinkingLevel(task), // Adaptive thinking based on task
        })) {
          yield chunk
        }
      } else if (provider === 'openai') {
        for await (const chunk of openai.streamText(prompt, {
          model: 'gpt-3.5-turbo',
          temperature,
          maxTokens,
        })) {
          yield chunk
        }
      } else {
        throw new Error('Streaming not supported for this provider')
      }

      // Consume rate limit token
      rateLimiter.consume(provider)
    } catch (error) {
      console.error(`Streaming error with ${provider}:`, error)
      throw error
    }
  }

  /**
   * Generate embeddings for semantic search
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const task: AITask = 'embeddings'
    const routing = TASK_ROUTING[task]
    const providers = [routing.primary, ...routing.fallbacks]

    for (const provider of providers) {
      try {
        if (!rateLimiter.canExecute(provider)) {
          continue
        }

        let result: number[][]

        if (provider === 'huggingface') {
          const embeddings = await huggingface.generateEmbeddings(texts)
          result = Array.isArray(embeddings[0])
            ? (embeddings as number[][])
            : [embeddings as number[]]
        } else if (provider === 'openai') {
          result = await openai.generateEmbeddings(texts)
        } else {
          continue
        }

        rateLimiter.consume(provider)
        return result
      } catch (error) {
        console.error(`Embeddings error with ${provider}:`, error)
      }
    }

    throw new Error('Failed to generate embeddings with all providers')
  }

  /**
   * Analyze an image (only supported by Gemini)
   */
  async analyzeImage(
    imageData: string | Uint8Array,
    prompt: string
  ): Promise<string> {
    if (!rateLimiter.canExecute('gemini')) {
      throw new RateLimitError(
        'gemini',
        rateLimiter.getRetryAfter('gemini')
      )
    }

    try {
      const result = await gemini.analyzeImage(imageData, prompt)
      rateLimiter.consume('gemini')
      return result
    } catch (error) {
      console.error('Image analysis error:', error)
      throw new Error(`Image analysis failed: ${error}`)
    }
  }

  /**
   * Get quota information for all providers
   */
  getQuotas(): Record<
    AIProvider,
    {
      remainingMinute: number
      remainingDay: number
      resetsIn: number
    }
  > {
    return {
      gemini: rateLimiter.getQuota('gemini'),
      openai: rateLimiter.getQuota('openai'),
      huggingface: rateLimiter.getQuota('huggingface'),
    }
  }
}

// Singleton instance
export const aiRouter = new AIModelRouter()

// Helper function for common tasks
export async function generateText(
  task: AITask,
  prompt: string,
  options?: {
    temperature?: number
    maxTokens?: number
    model?: 'fast' | 'quality'
  }
): Promise<string> {
  return aiRouter.execute(task, prompt, options)
}

export async function* streamText(
  task: AITask,
  prompt: string,
  options?: {
    temperature?: number
    maxTokens?: number
    model?: 'fast' | 'quality'
  }
): AsyncGenerator<string> {
  yield* aiRouter.stream(task, prompt, options)
}

// ============================================================================
// Agent Support with Function Calling
// ============================================================================

import { FunctionDeclaration, GenerateResult } from '@/types/agent'
import { getGlobalToolRegistry } from './tools/registry'

/**
 * Execute with function calling support (agent mode)
 * Uses Gemini 3 as primary provider with adaptive thinking levels
 */
export async function executeWithTools(
  prompt: string,
  options?: {
    temperature?: number
    maxTokens?: number
    model?: 'fast' | 'quality'
    thinkingLevel?: ThinkingLevel // Gemini 3 thinking level
    phase?: string // Discovery phase for adaptive thinking
  }
): Promise<GenerateResult> {
  // Check rate limits for Gemini (primary provider)
  if (!rateLimiter.canExecute('gemini')) {
    throw new RateLimitError(
      'gemini',
      rateLimiter.getRetryAfter('gemini')
    )
  }

  try {
    // Get registered tools from global registry
    const toolRegistry = getGlobalToolRegistry()
    const tools = toolRegistry.toGeminiFunctionDeclarations()

    // Use Gemini 3 flash for all operations (Pro-grade reasoning at Flash speed)
    const geminiModel = options?.model === 'quality' ? 'flash' : 'flash-lite'

    // Adaptive thinking: use provided level, or derive from phase, or default to 'medium'
    const thinkingLevel = options?.thinkingLevel ??
      (options?.phase ? getThinkingLevel(options.phase) : 'medium')

    const result = await gemini.generateWithTools(prompt, tools, {
      model: geminiModel as any,
      temperature: options?.temperature ?? 1.0, // Gemini 3 recommended default
      maxOutputTokens: options?.maxTokens ?? 2048,
      thinkingLevel,
    })

    // Consume rate limit token
    rateLimiter.consume('gemini')

    return result
  } catch (error) {
    console.error('Agent execution with tools error:', error)
    throw new Error(`Agent execution failed: ${error}`)
  }
}

/**
 * Continue agent conversation after function calls
 * Uses Gemini 3 as primary provider with adaptive thinking levels
 */
export async function continueAfterFunctionCalls(
  prompt: string,
  previousCalls: Array<{ name: string; args: Record<string, any> }>,
  functionResponses: Array<{ name: string; response: any }>,
  options?: {
    temperature?: number
    maxTokens?: number
    model?: 'fast' | 'quality'
    thinkingLevel?: ThinkingLevel // Gemini 3 thinking level
    phase?: string // Discovery phase for adaptive thinking
  }
): Promise<string> {
  if (!rateLimiter.canExecute('gemini')) {
    throw new RateLimitError(
      'gemini',
      rateLimiter.getRetryAfter('gemini')
    )
  }

  try {
    const toolRegistry = getGlobalToolRegistry()
    const tools = toolRegistry.toGeminiFunctionDeclarations()

    const geminiModel = options?.model === 'quality' ? 'flash' : 'flash-lite'

    // Adaptive thinking: use provided level, or derive from phase, or default to 'medium'
    const thinkingLevel = options?.thinkingLevel ??
      (options?.phase ? getThinkingLevel(options.phase) : 'medium')

    const result = await gemini.continueWithFunctionResponse(
      prompt,
      tools,
      previousCalls,
      functionResponses,
      {
        model: geminiModel as any,
        temperature: options?.temperature ?? 1.0, // Gemini 3 recommended default
        maxOutputTokens: options?.maxTokens ?? 2048,
        thinkingLevel,
      }
    )

    rateLimiter.consume('gemini')
    return result
  } catch (error) {
    console.error('Continue after function calls error:', error)
    throw new Error(`Failed to continue after function calls: ${error}`)
  }
}

/**
 * Generate structured output with schema validation
 * Uses Gemini 3 as primary provider with adaptive thinking levels
 */
export async function generateStructured<T = any>(
  prompt: string,
  schema: string,
  options?: {
    temperature?: number
    maxTokens?: number
    model?: 'fast' | 'quality'
    thinkingLevel?: ThinkingLevel // Gemini 3 thinking level
    phase?: string // Discovery phase for adaptive thinking
  }
): Promise<T> {
  if (!rateLimiter.canExecute('gemini')) {
    throw new RateLimitError(
      'gemini',
      rateLimiter.getRetryAfter('gemini')
    )
  }

  try {
    const geminiModel = options?.model === 'quality' ? 'flash' : 'flash-lite'
    const fullPrompt = `${prompt}\n\nRespond with valid JSON matching this schema:\n${schema}`

    // Adaptive thinking: use provided level, or derive from phase, or default to 'low' for structured output
    const thinkingLevel = options?.thinkingLevel ??
      (options?.phase ? getThinkingLevel(options.phase) : 'low')

    const response = await gemini.generateText(fullPrompt, {
      model: geminiModel as any,
      temperature: options?.temperature ?? 0.3, // Keep lower for JSON output
      maxOutputTokens: options?.maxTokens ?? 2048,
      thinkingLevel,
    })

    rateLimiter.consume('gemini')

    // Parse JSON response
    let cleaned = response.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
    }

    return JSON.parse(cleaned) as T
  } catch (error) {
    console.error('Structured output generation error:', error)
    throw new Error(`Structured output generation failed: ${error}`)
  }
}
