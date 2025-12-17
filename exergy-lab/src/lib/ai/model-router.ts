import * as gemini from './gemini'
import * as openai from './openai'
import * as huggingface from './huggingface'
import { rateLimiter, RateLimitError, AIProvider } from './rate-limiter'

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
 * Uses OpenAI as primary provider since Gemini API key is expired
 */
export async function executeWithTools(
  prompt: string,
  options?: {
    temperature?: number
    maxTokens?: number
    model?: 'fast' | 'quality'
  }
): Promise<GenerateResult> {
  // Check rate limits for OpenAI (primary provider - Gemini API key expired)
  if (!rateLimiter.canExecute('openai')) {
    throw new RateLimitError(
      'openai',
      rateLimiter.getRetryAfter('openai')
    )
  }

  try {
    // Get registered tools from global registry
    const toolRegistry = getGlobalToolRegistry()
    const tools = toolRegistry.toGeminiFunctionDeclarations()

    // Execute with OpenAI function calling (Gemini API key expired)
    const openaiModel = options?.model === 'quality' ? 'gpt-4o' : 'gpt-3.5-turbo'
    const result = await openai.generateWithTools(prompt, tools, {
      model: openaiModel,
      temperature: options?.temperature ?? 0.7,
      maxTokens: options?.maxTokens ?? 2048,
    })

    // Consume rate limit token
    rateLimiter.consume('openai')

    return result
  } catch (error) {
    console.error('Agent execution with tools error:', error)
    throw new Error(`Agent execution failed: ${error}`)
  }
}

/**
 * Continue agent conversation after function calls
 * Uses OpenAI as primary provider since Gemini API key is expired
 */
export async function continueAfterFunctionCalls(
  prompt: string,
  previousCalls: Array<{ name: string; args: Record<string, any> }>,
  functionResponses: Array<{ name: string; response: any }>,
  options?: {
    temperature?: number
    maxTokens?: number
    model?: 'fast' | 'quality'
  }
): Promise<string> {
  if (!rateLimiter.canExecute('openai')) {
    throw new RateLimitError(
      'openai',
      rateLimiter.getRetryAfter('openai')
    )
  }

  try {
    const toolRegistry = getGlobalToolRegistry()
    const tools = toolRegistry.toGeminiFunctionDeclarations()

    const openaiModel = options?.model === 'quality' ? 'gpt-4o' : 'gpt-3.5-turbo'
    const result = await openai.continueWithFunctionResponse(
      prompt,
      tools,
      previousCalls,
      functionResponses,
      {
        model: openaiModel,
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens ?? 2048,
      }
    )

    rateLimiter.consume('openai')
    return result
  } catch (error) {
    console.error('Continue after function calls error:', error)
    throw new Error(`Failed to continue after function calls: ${error}`)
  }
}

/**
 * Generate structured output with schema validation
 * Uses OpenAI as primary provider since Gemini API key is expired
 */
export async function generateStructured<T = any>(
  prompt: string,
  schema: string,
  options?: {
    temperature?: number
    maxTokens?: number
    model?: 'fast' | 'quality'
  }
): Promise<T> {
  if (!rateLimiter.canExecute('openai')) {
    throw new RateLimitError(
      'openai',
      rateLimiter.getRetryAfter('openai')
    )
  }

  try {
    const openaiModel = options?.model === 'quality' ? 'gpt-4o' : 'gpt-3.5-turbo'
    const fullPrompt = `${prompt}\n\nRespond with valid JSON matching this schema:\n${schema}`

    const response = await openai.generateText(fullPrompt, {
      model: openaiModel as any,
      temperature: options?.temperature ?? 0.3,
      maxTokens: options?.maxTokens ?? 2048,
    })

    rateLimiter.consume('openai')

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
