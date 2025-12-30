/**
 * Enhanced Search API v2
 *
 * POST /api/search/v2
 *
 * Multi-source scientific search with:
 * - All 21+ data sources searched by default
 * - AI-powered query expansion and relevance explanations
 * - Cross-reference detection across sources
 * - Source health monitoring and graceful degradation
 * - Parallel execution with timeouts
 */

import { NextRequest, NextResponse } from 'next/server'
import { aiRouter } from '@/lib/ai/model-router'
import {
  getDataSourceRegistry,
  initializeDataSourceRegistry,
  type AggregatedSearchResult,
} from '@/lib/discovery/data-sources/registry'
import type {
  Source,
  DataSourceName,
  DataSourceType,
  SearchFilters,
} from '@/types/sources'
import type { Domain } from '@/types/discovery'

// ============================================================================
// Request/Response Types
// ============================================================================

interface EnhancedSearchRequest {
  query: string
  domains?: Domain[]
  sources?: DataSourceName[] // Optional filter, defaults to ALL
  sourceTypes?: DataSourceType[]
  dateRange?: { from: string; to: string }
  minCitations?: number
  openAccessOnly?: boolean
  peerReviewedOnly?: boolean
  limit?: number
  includeAIEnhancements?: boolean // Default true
}

interface CrossReference {
  title: string
  sources: DataSourceName[]
  count: number
  primaryId: string
}

interface SourceStats {
  name: DataSourceName
  count: number
  success: boolean
  time: number
  error?: string
}

interface AIEnhancements {
  expandedQuery: string
  relevanceExplanations: Record<string, { score: number; explanation: string }>
  topRecommendations: string[]
  queryInterpretation: string
}

interface EnhancedSearchResponse {
  success: boolean
  results: Source[]
  total: number
  bySource: Record<DataSourceName, SourceStats>
  crossReferences: CrossReference[]
  aiEnhancements?: AIEnhancements
  searchMeta: {
    query: string
    expandedQuery?: string
    totalTime: number
    sourcesQueried: number
    sourcesSucceeded: number
    deduplicatedCount: number
  }
  error?: string
}

// ============================================================================
// AI Enhancement Functions
// ============================================================================

/**
 * Expand query using AI with domain context
 */
async function expandQueryWithAI(
  query: string,
  domains: Domain[]
): Promise<{ expandedQuery: string; interpretation: string }> {
  try {
    const domainContext = domains.length > 0
      ? `focusing on ${domains.join(', ')}`
      : 'across all clean energy domains'

    const prompt = `You are a research librarian specializing in clean energy and scientific literature.

Original query: "${query}"
Domain context: ${domainContext}

Provide:
1. An expanded search query (1-2 sentences) that includes relevant synonyms, technical terms, and alternative phrasings to improve academic search results.
2. A brief interpretation of what the user is looking for.

Respond in JSON format:
{
  "expandedQuery": "...",
  "interpretation": "..."
}`

    const response = await aiRouter.execute('search-expand', prompt, {
      temperature: 0.3,
      maxTokens: 300,
    })

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        expandedQuery: parsed.expandedQuery || query,
        interpretation: parsed.interpretation || '',
      }
    }

    return { expandedQuery: query, interpretation: '' }
  } catch (error) {
    console.error('Query expansion failed:', error)
    return { expandedQuery: query, interpretation: '' }
  }
}

/**
 * Generate relevance explanations for top results
 */
async function generateRelevanceExplanations(
  query: string,
  results: Source[],
  limit: number = 5
): Promise<Record<string, { score: number; explanation: string }>> {
  try {
    const topResults = results.slice(0, limit)
    if (topResults.length === 0) return {}

    const resultsText = topResults
      .map((r, i) => `${i + 1}. "${r.title}" - ${r.abstract?.substring(0, 150) || 'No abstract'}...`)
      .join('\n')

    const prompt = `For the search query "${query}", explain why each result is relevant.

Results:
${resultsText}

Respond in JSON format with result IDs as keys:
{
  "1": { "score": 85, "explanation": "This paper directly addresses..." },
  "2": { "score": 72, "explanation": "While not directly about..." },
  ...
}`

    const response = await aiRouter.execute('search-rank', prompt, {
      temperature: 0.2,
      maxTokens: 500,
    })

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const explanations: Record<string, { score: number; explanation: string }> = {}

      for (let i = 0; i < topResults.length; i++) {
        const key = String(i + 1)
        if (parsed[key]) {
          explanations[topResults[i].id] = {
            score: parsed[key].score || 70,
            explanation: parsed[key].explanation || 'Relevant to the search query',
          }
        }
      }

      return explanations
    }

    return {}
  } catch (error) {
    console.error('Relevance explanation failed:', error)
    return {}
  }
}

/**
 * Generate search recommendations
 */
async function generateRecommendations(
  query: string,
  results: Source[]
): Promise<string[]> {
  try {
    if (results.length === 0) {
      return ['Try broader search terms', 'Remove filters to see more results']
    }

    const prompt = `Based on the search "${query}" with ${results.length} results, suggest 3 follow-up searches or refinements that would help the researcher. Keep suggestions brief (1 sentence each).

Respond in JSON format:
["suggestion 1", "suggestion 2", "suggestion 3"]`

    const response = await aiRouter.execute('search-expand', prompt, {
      temperature: 0.5,
      maxTokens: 200,
    })

    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    return []
  } catch {
    return []
  }
}

// ============================================================================
// Cross-Reference Detection
// ============================================================================

/**
 * Detect papers that appear in multiple sources
 */
function detectCrossReferences(results: Source[]): CrossReference[] {
  const titleMap = new Map<string, { sources: Set<DataSourceName>; primaryId: string; title: string }>()

  for (const result of results) {
    // Normalize title for comparison
    const normalizedTitle = result.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 80)

    if (titleMap.has(normalizedTitle)) {
      const existing = titleMap.get(normalizedTitle)!
      existing.sources.add(result.metadata.source)
    } else {
      titleMap.set(normalizedTitle, {
        sources: new Set([result.metadata.source]),
        primaryId: result.id,
        title: result.title,
      })
    }
  }

  // Return only items found in multiple sources
  const crossRefs: CrossReference[] = []
  for (const [, data] of titleMap) {
    if (data.sources.size > 1) {
      crossRefs.push({
        title: data.title,
        sources: Array.from(data.sources),
        count: data.sources.size,
        primaryId: data.primaryId,
      })
    }
  }

  // Sort by number of sources (descending)
  return crossRefs.sort((a, b) => b.count - a.count).slice(0, 10)
}

// ============================================================================
// API Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<EnhancedSearchResponse>> {
  const startTime = Date.now()

  try {
    const body = (await request.json()) as EnhancedSearchRequest
    const {
      query,
      domains = [],
      sources,
      sourceTypes,
      dateRange,
      minCitations,
      openAccessOnly = false,
      peerReviewedOnly = false,
      limit = 50,
      includeAIEnhancements = true,
    } = body

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          results: [],
          total: 0,
          bySource: {} as Record<DataSourceName, SourceStats>,
          crossReferences: [],
          searchMeta: {
            query: '',
            totalTime: 0,
            sourcesQueried: 0,
            sourcesSucceeded: 0,
            deduplicatedCount: 0,
          },
          error: 'Query is required',
        },
        { status: 400 }
      )
    }

    // Initialize the data source registry
    const registry = await initializeDataSourceRegistry()

    // Build search filters
    const filters: SearchFilters = {
      domains: domains.length > 0 ? domains : undefined,
      sources,
      sourceTypes,
      yearFrom: dateRange?.from ? parseInt(dateRange.from.split('-')[0]) : undefined,
      yearTo: dateRange?.to ? parseInt(dateRange.to.split('-')[0]) : undefined,
      minCitations,
      openAccessOnly,
      peerReviewedOnly,
      limit: limit * 2, // Get more results for deduplication
    }

    // AI query expansion (parallel with search)
    const [aiExpansion, searchResults] = await Promise.all([
      includeAIEnhancements ? expandQueryWithAI(query, domains) : Promise.resolve(null),
      domains.length > 0
        ? registry.smartSearch(query, domains, filters)
        : registry.searchAll(query, filters),
    ])

    // Apply limit after deduplication
    const limitedResults = searchResults.sources.slice(0, limit)

    // Detect cross-references
    const crossReferences = detectCrossReferences(searchResults.sources)

    // Generate AI enhancements (if enabled)
    let aiEnhancements: AIEnhancements | undefined
    if (includeAIEnhancements && aiExpansion) {
      const [relevanceExplanations, recommendations] = await Promise.all([
        generateRelevanceExplanations(query, limitedResults, 5),
        generateRecommendations(query, limitedResults),
      ])

      aiEnhancements = {
        expandedQuery: aiExpansion.expandedQuery,
        queryInterpretation: aiExpansion.interpretation,
        relevanceExplanations,
        topRecommendations: recommendations,
      }
    }

    // Build source stats
    const bySource: Record<DataSourceName, SourceStats> = {} as Record<DataSourceName, SourceStats>
    for (const [name, stats] of Object.entries(searchResults.bySource)) {
      bySource[name as DataSourceName] = {
        name: name as DataSourceName,
        count: stats.count,
        success: stats.success,
        time: stats.time,
        error: stats.error,
      }
    }

    const sourcesQueried = Object.keys(bySource).length
    const sourcesSucceeded = Object.values(bySource).filter((s) => s.success).length

    return NextResponse.json({
      success: true,
      results: limitedResults,
      total: searchResults.total,
      bySource,
      crossReferences,
      aiEnhancements,
      searchMeta: {
        query,
        expandedQuery: aiExpansion?.expandedQuery,
        totalTime: Date.now() - startTime,
        sourcesQueried,
        sourcesSucceeded,
        deduplicatedCount: searchResults.deduplicatedCount,
      },
    })
  } catch (error) {
    console.error('Enhanced search error:', error)
    return NextResponse.json(
      {
        success: false,
        results: [],
        total: 0,
        bySource: {} as Record<DataSourceName, SourceStats>,
        crossReferences: [],
        searchMeta: {
          query: '',
          totalTime: Date.now() - startTime,
          sourcesQueried: 0,
          sourcesSucceeded: 0,
          deduplicatedCount: 0,
        },
        error: error instanceof Error ? error.message : 'Search failed',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/search/v2
 * Returns API info and available sources
 */
export async function GET(): Promise<NextResponse> {
  try {
    const registry = await initializeDataSourceRegistry()
    const stats = registry.getStats()
    const availability = await registry.checkAvailability()

    return NextResponse.json({
      description: 'Enhanced Search API v2',
      version: '2.0.0',
      features: [
        'Multi-source parallel search (21+ sources)',
        'AI-powered query expansion',
        'Relevance explanations for top results',
        'Cross-reference detection across sources',
        'Source health monitoring',
        'Domain-aware smart routing',
      ],
      availableSources: Object.entries(availability)
        .filter(([, available]) => available)
        .map(([name]) => name),
      unavailableSources: Object.entries(availability)
        .filter(([, available]) => !available)
        .map(([name]) => name),
      stats,
      endpoints: {
        POST: {
          description: 'Execute enhanced search across all sources',
          body: {
            query: 'string (required) - Search query',
            domains: 'Domain[] (optional) - Filter by energy domains',
            sources: 'DataSourceName[] (optional) - Filter to specific sources',
            sourceTypes: 'DataSourceType[] (optional) - Filter by source type',
            dateRange: '{ from: string, to: string } (optional) - Year range',
            minCitations: 'number (optional) - Minimum citation count',
            openAccessOnly: 'boolean (optional, default: false)',
            peerReviewedOnly: 'boolean (optional, default: false)',
            limit: 'number (optional, default: 50)',
            includeAIEnhancements: 'boolean (optional, default: true)',
          },
          returns: {
            success: 'boolean',
            results: 'Source[] - Deduplicated, ranked results',
            total: 'number',
            bySource: 'Record<DataSourceName, SourceStats>',
            crossReferences: 'CrossReference[] - Papers found in multiple sources',
            aiEnhancements: 'AIEnhancements (if enabled)',
            searchMeta: 'Search metadata and timing',
          },
        },
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get API info' },
      { status: 500 }
    )
  }
}
