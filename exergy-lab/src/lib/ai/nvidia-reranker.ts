/**
 * NVIDIA Nemotron Reranker Client
 *
 * TypeScript client for reranking search results using NVIDIA's Nemotron
 * reranker model. Improves scientific search quality by providing more
 * accurate relevance scoring through cross-encoder architecture.
 *
 * Features:
 * - Cross-encoder reranking for better relevance
 * - Batch processing for multiple queries
 * - GPU acceleration via Modal Labs
 * - Fallback to local scoring if Modal unavailable
 *
 * @see modal-simulations/nemotron_reranker.py - Backend GPU functions
 * @see model-router.ts - Routes reranking requests here
 */

// ============================================================================
// Types
// ============================================================================

export interface RerankerDocument {
  id: string
  text: string
}

export interface RerankedResult {
  id: string
  score: number
  text: string
}

export interface RerankerResponse {
  results: RerankedResult[]
  query: string
  model: string
  totalDocuments: number
  returnedDocuments: number
  executionTimeMs: number
}

export interface BatchRerankerResponse {
  batchResults: RerankerResponse[]
  batchSize: number
  totalExecutionTimeMs: number
}

export interface RerankerConfig {
  endpoint?: string
  apiKey?: string
  timeout?: number
  maxRetries?: number
  fallbackToLocal?: boolean
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: RerankerConfig = {
  endpoint:
    process.env.MODAL_RERANKER_ENDPOINT ||
    process.env.MODAL_ENDPOINT?.replace(
      'breakthrough-engine-gpu',
      'exergy-nemotron-reranker'
    ) ||
    'https://modal.run',
  apiKey: process.env.MODAL_API_KEY,
  timeout: 60000, // 60 seconds
  maxRetries: 2,
  fallbackToLocal: true,
}

// ============================================================================
// Nemotron Reranker Client
// ============================================================================

class NemotronRerankerClient {
  private config: RerankerConfig

  constructor(config: Partial<RerankerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Rerank documents based on relevance to query
   *
   * @param query - The search query
   * @param documents - Array of documents with id and text
   * @param topK - Number of top results to return (optional)
   * @returns Reranked results with scores
   */
  async rerank(
    query: string,
    documents: RerankerDocument[],
    topK?: number
  ): Promise<RerankerResponse> {
    if (!documents.length) {
      return {
        results: [],
        query,
        model: 'none',
        totalDocuments: 0,
        returnedDocuments: 0,
        executionTimeMs: 0,
      }
    }

    try {
      const result = await this.callModalFunction<{
        results: Array<{ id: string; score: number; text: string }>
        query: string
        model: string
        total_documents: number
        returned_documents: number
        execution_time_ms: number
      }>('rerank-endpoint', {
        query,
        documents,
        top_k: topK,
      })

      return {
        results: result.results,
        query: result.query,
        model: result.model,
        totalDocuments: result.total_documents,
        returnedDocuments: result.returned_documents,
        executionTimeMs: result.execution_time_ms,
      }
    } catch (error) {
      console.error('[NemotronReranker] Reranking failed:', error)

      // Fall back to local scoring if configured
      if (this.config.fallbackToLocal) {
        console.log('[NemotronReranker] Falling back to local TF-IDF scoring')
        return this.fallbackRerank(query, documents, topK)
      }

      throw error
    }
  }

  /**
   * Batch rerank multiple query-document pairs
   *
   * @param queries - Array of search queries
   * @param documentsLists - Array of document arrays (one per query)
   * @param topK - Number of top results per query
   * @returns Batch reranked results
   */
  async batchRerank(
    queries: string[],
    documentsLists: RerankerDocument[][],
    topK?: number
  ): Promise<BatchRerankerResponse> {
    if (queries.length !== documentsLists.length) {
      throw new Error('queries and documentsLists must have same length')
    }

    try {
      const result = await this.callModalFunction<{
        batch_results: Array<{
          results: Array<{ id: string; score: number; text: string }>
          query: string
          model: string
          total_documents: number
          returned_documents: number
          execution_time_ms: number
        }>
        batch_size: number
        total_execution_time_ms: number
      }>('batch-rerank-endpoint', {
        queries,
        documents_list: documentsLists,
        top_k: topK,
      })

      return {
        batchResults: result.batch_results.map(r => ({
          results: r.results,
          query: r.query,
          model: r.model,
          totalDocuments: r.total_documents,
          returnedDocuments: r.returned_documents,
          executionTimeMs: r.execution_time_ms,
        })),
        batchSize: result.batch_size,
        totalExecutionTimeMs: result.total_execution_time_ms,
      }
    } catch (error) {
      console.error('[NemotronReranker] Batch reranking failed:', error)

      // Fall back to sequential local reranking
      if (this.config.fallbackToLocal) {
        const startTime = Date.now()
        const batchResults: RerankerResponse[] = []

        for (let i = 0; i < queries.length; i++) {
          const result = await this.fallbackRerank(
            queries[i],
            documentsLists[i],
            topK
          )
          batchResults.push(result)
        }

        return {
          batchResults,
          batchSize: queries.length,
          totalExecutionTimeMs: Date.now() - startTime,
        }
      }

      throw error
    }
  }

  /**
   * Check if reranker service is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.config.apiKey) {
      return false
    }

    try {
      const endpoint = this.config.endpoint?.replace(
        '.modal.run',
        '-health-endpoint.modal.run'
      )
      if (!endpoint) return false

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
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
    description: string
    isAvailable: boolean
  } {
    return {
      name: 'nvidia/nv-rerankqa-mistral-4b-v3',
      description: 'NVIDIA Nemotron Reranker for scientific document retrieval',
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
      throw new Error(
        'Modal API key not configured. Set MODAL_API_KEY environment variable.'
      )
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
            Authorization: `Bearer ${apiKey}`,
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

        const data = (await response.json()) as T
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
   * Fallback reranking using TF-IDF-like scoring
   * Used when Modal endpoint is unavailable
   */
  private async fallbackRerank(
    query: string,
    documents: RerankerDocument[],
    topK?: number
  ): Promise<RerankerResponse> {
    const startTime = Date.now()

    // Simple TF-IDF-like scoring
    const queryTerms = this.tokenize(query)
    const queryTermSet = new Set(queryTerms)

    const scores = documents.map((doc, index) => {
      const docTerms = this.tokenize(doc.text)
      const docTermSet = new Set(docTerms)

      // Calculate term overlap
      let matchCount = 0
      for (const term of queryTermSet) {
        if (docTermSet.has(term)) {
          matchCount++
        }
      }

      // Normalize by query length
      const score = queryTerms.length > 0 ? matchCount / queryTerms.length : 0

      return {
        id: doc.id,
        score,
        text: doc.text.slice(0, 200),
        index,
      }
    })

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score)

    // Apply topK
    const finalResults =
      topK && topK > 0
        ? scores.slice(0, topK)
        : scores

    return {
      results: finalResults.map(({ id, score, text }) => ({ id, score, text })),
      query,
      model: 'local-tfidf-fallback',
      totalDocuments: documents.length,
      returnedDocuments: finalResults.length,
      executionTimeMs: Date.now() - startTime,
    }
  }

  /**
   * Simple tokenizer for fallback scoring
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2)
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let rerankerClient: NemotronRerankerClient | null = null

export function getRerankerClient(): NemotronRerankerClient {
  if (!rerankerClient) {
    rerankerClient = new NemotronRerankerClient()
  }
  return rerankerClient
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Rerank documents based on relevance to query
 */
export async function rerankDocuments(
  query: string,
  documents: RerankerDocument[],
  topK?: number
): Promise<RerankedResult[]> {
  const client = getRerankerClient()
  const result = await client.rerank(query, documents, topK)
  return result.results
}

/**
 * Rerank with full response (including metadata)
 */
export async function rerankWithMetadata(
  query: string,
  documents: RerankerDocument[],
  topK?: number
): Promise<RerankerResponse> {
  const client = getRerankerClient()
  return client.rerank(query, documents, topK)
}

/**
 * Batch rerank multiple query-document pairs
 */
export async function batchRerankDocuments(
  queries: string[],
  documentsLists: RerankerDocument[][],
  topK?: number
): Promise<BatchRerankerResponse> {
  const client = getRerankerClient()
  return client.batchRerank(queries, documentsLists, topK)
}

/**
 * Check if reranker is available
 */
export async function isRerankerAvailable(): Promise<boolean> {
  const client = getRerankerClient()
  return client.isAvailable()
}

export { NemotronRerankerClient }
export default getRerankerClient
