/**
 * Unified LLM Client with Retry Logic
 *
 * Provides a robust wrapper around LLM calls with:
 * - Exponential backoff retry
 * - Model fallback chains
 * - Cost tracking
 * - Rate limit handling
 *
 * @see /Users/chrisdimurro/.claude/plans/idempotent-beaming-rose.md - Implementation plan
 */

import { z } from 'zod'
import { RetryPolicy, shouldRetryError, classifyError, ErrorCategory } from './error-recovery'
import { generateText as routerGenerateText, AITask, getTokenBudget } from './model-router'
import type { RetryConfig } from '@/types/agent'

// ============================================================================
// Types
// ============================================================================

export interface LLMCallConfig {
  task: AITask
  prompt: string
  temperature?: number
  maxTokens?: number
  model?: 'fast' | 'quality'
  /** Override retry settings */
  retryConfig?: Partial<RetryConfig>
  /** Skip retry and fail fast */
  noRetry?: boolean
  /** Discovery ID for cost tracking */
  discoveryId?: string
}

export interface LLMResult<T = string> {
  data: T
  metadata: {
    attempts: number
    totalDuration: number
    model: string
    estimatedCost: number
  }
}

interface CostEntry {
  task: AITask
  inputTokens: number
  outputTokens: number
  estimatedCost: number
  timestamp: Date
  discoveryId?: string
}

// ============================================================================
// Cost Tracking (in-memory for now)
// ============================================================================

const costHistory: CostEntry[] = []
const COST_HISTORY_MAX = 1000

// Approximate costs per 1K tokens (as of 2024)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'gemini-flash': { input: 0.00001875, output: 0.000075 },
  'gemini-pro': { input: 0.00125, output: 0.005 },
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
}

/**
 * Estimate cost based on prompt length and expected output
 */
function estimateCost(
  promptLength: number,
  maxOutputTokens: number,
  model: string = 'gemini-flash'
): number {
  const costs = MODEL_COSTS[model] || MODEL_COSTS['gemini-flash']
  // Rough estimate: 4 characters per token
  const inputTokens = Math.ceil(promptLength / 4)
  // Assume average output is 60% of max
  const outputTokens = Math.ceil(maxOutputTokens * 0.6)

  return (inputTokens / 1000) * costs.input + (outputTokens / 1000) * costs.output
}

/**
 * Track LLM cost
 */
function trackCost(entry: CostEntry): void {
  costHistory.push(entry)
  // Trim old entries
  if (costHistory.length > COST_HISTORY_MAX) {
    costHistory.splice(0, costHistory.length - COST_HISTORY_MAX)
  }
}

/**
 * Get total cost for a discovery
 */
export function getDiscoveryCost(discoveryId: string): number {
  return costHistory
    .filter((e) => e.discoveryId === discoveryId)
    .reduce((sum, e) => sum + e.estimatedCost, 0)
}

/**
 * Get today's total cost
 */
export function getTodayCost(): number {
  const today = new Date().toDateString()
  return costHistory
    .filter((e) => e.timestamp.toDateString() === today)
    .reduce((sum, e) => sum + e.estimatedCost, 0)
}

/**
 * Get cost breakdown by task
 */
export function getCostByTask(): Record<string, number> {
  const breakdown: Record<string, number> = {}
  for (const entry of costHistory) {
    breakdown[entry.task] = (breakdown[entry.task] || 0) + entry.estimatedCost
  }
  return breakdown
}

// ============================================================================
// LLM Retry Configuration
// ============================================================================

const LLM_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: ['429', '500', '502', '503', '504', 'ECONNRESET', 'timeout', 'rate limit'],
}

// ============================================================================
// Main LLM Client Functions
// ============================================================================

/**
 * Generate text with automatic retry and fallback
 *
 * This is the primary function to use for LLM calls. It wraps the model router
 * with retry logic and cost tracking.
 *
 * @example
 * const result = await generateWithRetry({
 *   task: 'discovery',
 *   prompt: 'Generate a hypothesis for...',
 *   temperature: 0.7,
 * })
 */
export async function generateWithRetry(config: LLMCallConfig): Promise<LLMResult<string>> {
  const startTime = Date.now()
  let attempts = 0

  const retryConfig = { ...LLM_RETRY_CONFIG, ...config.retryConfig }
  const retryPolicy = new RetryPolicy(retryConfig)

  const maxTokens = config.maxTokens ?? getTokenBudget(config.task)

  // If noRetry is set, make a single attempt
  if (config.noRetry) {
    attempts = 1
    const result = await routerGenerateText(config.task, config.prompt, {
      temperature: config.temperature,
      maxTokens,
      model: config.model,
    })

    const estimatedCost = estimateCost(config.prompt.length, maxTokens)
    trackCost({
      task: config.task,
      inputTokens: Math.ceil(config.prompt.length / 4),
      outputTokens: Math.ceil(result.length / 4),
      estimatedCost,
      timestamp: new Date(),
      discoveryId: config.discoveryId,
    })

    return {
      data: result,
      metadata: {
        attempts: 1,
        totalDuration: Date.now() - startTime,
        model: 'gemini-flash',
        estimatedCost,
      },
    }
  }

  // Execute with retry
  const result = await retryPolicy.executeWithRetry(
    async () => {
      attempts++
      return routerGenerateText(config.task, config.prompt, {
        temperature: config.temperature,
        maxTokens,
        model: config.model,
      })
    },
    `llm:${config.task}`
  )

  const estimatedCost = estimateCost(config.prompt.length, maxTokens)
  trackCost({
    task: config.task,
    inputTokens: Math.ceil(config.prompt.length / 4),
    outputTokens: Math.ceil(result.length / 4),
    estimatedCost,
    timestamp: new Date(),
    discoveryId: config.discoveryId,
  })

  return {
    data: result,
    metadata: {
      attempts,
      totalDuration: Date.now() - startTime,
      model: 'gemini-flash',
      estimatedCost,
    },
  }
}

/**
 * Generate text and parse as JSON with schema validation
 *
 * @example
 * const result = await generateStructuredWithRetry({
 *   task: 'discovery',
 *   prompt: 'Generate a list of...',
 *   schema: z.array(z.object({ name: z.string(), score: z.number() })),
 * })
 */
export async function generateStructuredWithRetry<T>(
  config: LLMCallConfig & { schema: z.ZodType<T> }
): Promise<LLMResult<T>> {
  const startTime = Date.now()
  let attempts = 0

  const retryConfig = { ...LLM_RETRY_CONFIG, ...config.retryConfig }
  const retryPolicy = new RetryPolicy(retryConfig)

  const maxTokens = config.maxTokens ?? getTokenBudget(config.task)

  const result = await retryPolicy.executeWithRetry(
    async () => {
      attempts++

      const textResult = await routerGenerateText(config.task, config.prompt, {
        temperature: config.temperature ?? 0.3, // Lower temp for structured output
        maxTokens,
        model: config.model,
      })

      // Clean and parse JSON
      let cleaned = textResult.trim()
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
      }

      try {
        const parsed = JSON.parse(cleaned)
        return config.schema.parse(parsed)
      } catch (parseError) {
        // Throw a retryable error for JSON parse failures
        throw new Error(`JSON parse failed: ${parseError}. Response was: ${cleaned.slice(0, 200)}...`)
      }
    },
    `llm:${config.task}:structured`
  )

  const estimatedCost = estimateCost(config.prompt.length, maxTokens)
  trackCost({
    task: config.task,
    inputTokens: Math.ceil(config.prompt.length / 4),
    outputTokens: maxTokens,
    estimatedCost,
    timestamp: new Date(),
    discoveryId: config.discoveryId,
  })

  return {
    data: result,
    metadata: {
      attempts,
      totalDuration: Date.now() - startTime,
      model: 'gemini-flash',
      estimatedCost,
    },
  }
}

/**
 * Generate text with explicit fallback chain
 *
 * Use this when you need more control over fallback behavior.
 *
 * @example
 * const result = await generateWithFallback({
 *   task: 'discovery',
 *   prompt: '...',
 *   fallbackChain: ['gemini-flash', 'gpt-4o-mini', 'gpt-3.5-turbo'],
 * })
 */
export async function generateWithFallback(
  config: LLMCallConfig & { fallbackChain?: string[] }
): Promise<LLMResult<string>> {
  const startTime = Date.now()
  const errors: Error[] = []

  // Default fallback chain
  const chain = config.fallbackChain || ['gemini-flash', 'gpt-4o-mini']

  for (const model of chain) {
    try {
      const result = await generateWithRetry({
        ...config,
        // Force fast model for first in chain, quality for rest
        model: model.includes('flash') ? 'fast' : 'quality',
      })
      return result
    } catch (error) {
      errors.push(error as Error)
      console.warn(`[LLMClient] Model ${model} failed, trying next...`, (error as Error).message)
      continue
    }
  }

  // All models failed
  throw new Error(
    `All models in fallback chain failed for task "${config.task}": ${errors.map((e) => e.message).join('; ')}`
  )
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if an LLM error is retryable
 */
export function isRetryableLLMError(error: Error): boolean {
  const category = classifyError(error)
  return (
    category === ErrorCategory.RATE_LIMIT ||
    category === ErrorCategory.TIMEOUT ||
    category === ErrorCategory.NETWORK ||
    category === ErrorCategory.RETRYABLE
  )
}

/**
 * Get estimated wait time for rate limit errors
 */
export function getRetryDelay(error: Error): number {
  const message = error.message.toLowerCase()

  // Check for explicit retry-after
  const retryAfterMatch = message.match(/retry.?after[:\s]+(\d+)/i)
  if (retryAfterMatch) {
    return parseInt(retryAfterMatch[1], 10) * 1000
  }

  // Default delays by error type
  if (message.includes('429') || message.includes('rate limit')) {
    return 60000 // 1 minute
  }
  if (message.includes('503') || message.includes('502')) {
    return 5000 // 5 seconds
  }

  return 1000 // Default 1 second
}

/**
 * Pre-flight check to estimate if a prompt is within token limits
 */
export function checkPromptSize(
  prompt: string,
  maxInputTokens: number = 100000
): { allowed: boolean; estimatedTokens: number; message?: string } {
  // Rough estimate: 4 characters per token
  const estimatedTokens = Math.ceil(prompt.length / 4)

  if (estimatedTokens > maxInputTokens) {
    return {
      allowed: false,
      estimatedTokens,
      message: `Prompt exceeds ${maxInputTokens} token limit (estimated ${estimatedTokens} tokens)`,
    }
  }

  return { allowed: true, estimatedTokens }
}
