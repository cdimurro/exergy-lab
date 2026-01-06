/**
 * NVIDIA Nemotron Embeddings Client
 *
 * TypeScript client for NVIDIA's Llama-Embed-Nemotron-8B model,
 * which ranks #1 on the Multilingual MTEB Leaderboard.
 *
 * Features:
 * - 4096-dimensional embeddings (vs 384 for MiniLM)
 * - Instruction-aware embeddings for better task-specific results
 * - GPU acceleration via Modal Labs
 * - Fallback to HuggingFace if Modal unavailable
 *
 * @see modal-simulations/nemotron_embeddings.py - Backend GPU functions
 * @see model-router.ts - Routes embedding requests here
 */

import { SCIENTIFIC_INSTRUCTIONS, type ScientificTaskType } from './embedding-instructions'

// ============================================================================
// Types
// ============================================================================

export interface NemotronEmbeddingResult {
  embeddings: number[][]
  dimension: number
  count: number
  taskType: string
  instruction: string
  executionTimeMs: number
}

export interface NemotronSimilarityResult {
  query: string
  scores: number[]
  rankedIndices: number[]
  topScores: Array<{ index: number; score: number }>
  executionTimeMs: number
}

export interface NemotronConfig {
  endpoint?: string
  apiKey?: string
  timeout?: number
  maxRetries?: number
  fallbackToHuggingFace?: boolean
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: NemotronConfig = {
  endpoint: process.env.MODAL_NEMOTRON_ENDPOINT ||
    process.env.MODAL_ENDPOINT?.replace('breakthrough-engine-gpu', 'exergy-nemotron-embeddings') ||
    'https://modal.run',
  apiKey: process.env.MODAL_API_KEY,
  timeout: 60000, // 60 seconds
  maxRetries: 2,
  fallbackToHuggingFace: true,
}

// ============================================================================
// Nemotron Embeddings Client
// ============================================================================

class NemotronEmbeddingsClient {
  private config: NemotronConfig

  constructor(config: Partial<NemotronConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Generate embeddings for texts using Nemotron
   *
   * @param texts - Array of texts to embed
   * @param options - Optional configuration
   * @returns Embedding result with 4096-dim vectors
   */
  async generateEmbeddings(
    texts: string[],
    options?: {
      taskType?: ScientificTaskType
      instruction?: string
    }
  ): Promise<NemotronEmbeddingResult> {
    const taskType = options?.taskType || 'general'
    const instruction = options?.instruction || SCIENTIFIC_INSTRUCTIONS[taskType]

    try {
      const result = await this.callModalFunction<{
        embeddings: number[][]
        dimension: number
        count: number
        task_type: string
        instruction: string
        execution_time_ms: number
      }>('embeddings-endpoint', {
        texts,
        task_type: taskType,
        instruction,
      })

      return {
        embeddings: result.embeddings,
        dimension: result.dimension,
        count: result.count,
        taskType: result.task_type,
        instruction: result.instruction,
        executionTimeMs: result.execution_time_ms,
      }
    } catch (error) {
      console.error('[NemotronClient] Embedding generation failed:', error)

      // Fall back to HuggingFace if configured
      if (this.config.fallbackToHuggingFace) {
        console.log('[NemotronClient] Falling back to HuggingFace embeddings')
        return this.fallbackToHuggingFace(texts, taskType)
      }

      throw error
    }
  }

  /**
   * Compute similarity between a query and documents
   *
   * @param query - Query text
   * @param documents - Array of document texts
   * @param options - Optional configuration
   * @returns Similarity scores and rankings
   */
  async computeSimilarity(
    query: string,
    documents: string[],
    options?: {
      taskType?: ScientificTaskType
      instruction?: string
    }
  ): Promise<NemotronSimilarityResult> {
    const taskType = options?.taskType || 'research'
    const instruction = options?.instruction || SCIENTIFIC_INSTRUCTIONS[taskType]

    try {
      const result = await this.callModalFunction<{
        query: string
        scores: number[]
        ranked_indices: number[]
        top_scores: Array<{ index: number; score: number }>
        execution_time_ms: number
      }>('similarity-endpoint', {
        query,
        documents,
        task_type: taskType,
        instruction,
      })

      return {
        query: result.query,
        scores: result.scores,
        rankedIndices: result.ranked_indices,
        topScores: result.top_scores,
        executionTimeMs: result.execution_time_ms,
      }
    } catch (error) {
      console.error('[NemotronClient] Similarity computation failed:', error)

      // Fall back to local computation if configured
      if (this.config.fallbackToHuggingFace) {
        return this.fallbackSimilarity(query, documents, taskType)
      }

      throw error
    }
  }

  /**
   * Generate embeddings for a batch of text groups
   */
  async batchGenerateEmbeddings(
    batches: Array<{
      texts: string[]
      taskType?: ScientificTaskType
      instruction?: string
    }>
  ): Promise<{
    batches: NemotronEmbeddingResult[]
    totalEmbeddings: number
    totalExecutionTimeMs: number
  }> {
    const results = await Promise.all(
      batches.map(batch =>
        this.generateEmbeddings(batch.texts, {
          taskType: batch.taskType,
          instruction: batch.instruction,
        })
      )
    )

    return {
      batches: results,
      totalEmbeddings: results.reduce((sum, r) => sum + r.count, 0),
      totalExecutionTimeMs: results.reduce((sum, r) => sum + r.executionTimeMs, 0),
    }
  }

  /**
   * Check if Nemotron service is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.config.apiKey) {
      return false
    }

    try {
      const endpoint = this.config.endpoint?.replace('.modal.run', '-health.modal.run')
      if (!endpoint) return false

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Get model information
   */
  getModelInfo(): {
    name: string
    dimension: number
    taskTypes: ScientificTaskType[]
    isAvailable: boolean
  } {
    return {
      name: 'nvidia/llama-embed-nemotron-8b',
      dimension: 4096,
      taskTypes: ['research', 'hypothesis', 'materials', 'patent', 'general'] as ScientificTaskType[],
      isAvailable: !!this.config.apiKey,
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Call a Modal function via HTTP API
   */
  private async callModalFunction<T>(
    functionName: string,
    args: Record<string, unknown>
  ): Promise<T> {
    const apiKey = this.config.apiKey

    if (!apiKey) {
      throw new Error('Modal API key not configured. Set MODAL_API_KEY environment variable.')
    }

    // Format URL for Modal web endpoint
    const baseEndpoint = this.config.endpoint || ''
    const url = baseEndpoint.replace('.modal.run', `-${functionName}.modal.run`)

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= (this.config.maxRetries || 2); attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.timeout || 60000
        )

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(args),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Modal API error: ${response.status} - ${errorText}`)
        }

        const data = await response.json() as T
        return data
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt < (this.config.maxRetries || 2)) {
          // Exponential backoff
          await new Promise(resolve =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          )
          continue
        }
      }
    }

    throw lastError || new Error('Modal API call failed after retries')
  }

  /**
   * Fallback to HuggingFace embeddings if Modal unavailable
   */
  private async fallbackToHuggingFace(
    texts: string[],
    taskType: string
  ): Promise<NemotronEmbeddingResult> {
    // Import HuggingFace dynamically to avoid circular dependency
    const { generateEmbeddings } = await import('./huggingface')

    const startTime = Date.now()
    const embeddings = await generateEmbeddings(texts)

    // HuggingFace returns number[] for single text, number[][] for multiple
    const embeddingsArray = Array.isArray(embeddings[0])
      ? (embeddings as number[][])
      : [embeddings as number[]]

    return {
      embeddings: embeddingsArray,
      dimension: embeddingsArray[0]?.length || 384,
      count: texts.length,
      taskType,
      instruction: 'Fallback to HuggingFace (Nemotron unavailable)',
      executionTimeMs: Date.now() - startTime,
    }
  }

  /**
   * Fallback similarity computation using HuggingFace
   */
  private async fallbackSimilarity(
    query: string,
    documents: string[],
    taskType: string
  ): Promise<NemotronSimilarityResult> {
    const startTime = Date.now()

    // Generate embeddings for query and documents
    const allTexts = [query, ...documents]
    const result = await this.fallbackToHuggingFace(allTexts, taskType)

    // Compute cosine similarities
    const queryEmbedding = result.embeddings[0]
    const docEmbeddings = result.embeddings.slice(1)

    const scores = docEmbeddings.map(docEmb =>
      this.cosineSimilarity(queryEmbedding, docEmb)
    )

    // Rank by score
    const rankedIndices = scores
      .map((score, index) => ({ score, index }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.index)

    return {
      query,
      scores,
      rankedIndices,
      topScores: rankedIndices.slice(0, 10).map(index => ({
        index,
        score: scores[index],
      })),
      executionTimeMs: Date.now() - startTime,
    }
  }

  /**
   * Compute cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    if (normA === 0 || normB === 0) return 0
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let nemotronClient: NemotronEmbeddingsClient | null = null

export function getNemotronClient(): NemotronEmbeddingsClient {
  if (!nemotronClient) {
    nemotronClient = new NemotronEmbeddingsClient()
  }
  return nemotronClient
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Generate Nemotron embeddings for texts
 */
export async function generateNemotronEmbeddings(
  texts: string[],
  options?: {
    taskType?: ScientificTaskType
    instruction?: string
  }
): Promise<number[][]> {
  const client = getNemotronClient()
  const result = await client.generateEmbeddings(texts, options)
  return result.embeddings
}

/**
 * Compute similarity using Nemotron
 */
export async function computeNemotronSimilarity(
  query: string,
  documents: string[],
  options?: {
    taskType?: ScientificTaskType
    instruction?: string
  }
): Promise<NemotronSimilarityResult> {
  const client = getNemotronClient()
  return client.computeSimilarity(query, documents, options)
}

/**
 * Check if Nemotron is available
 */
export async function isNemotronAvailable(): Promise<boolean> {
  const client = getNemotronClient()
  return client.isAvailable()
}

export { NemotronEmbeddingsClient }
export default getNemotronClient
