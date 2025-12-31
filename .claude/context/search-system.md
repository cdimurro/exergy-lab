# Search System Context Module
<!-- Load when working on multi-source search, data sources, or paper discovery -->
<!-- Token budget: ~2000 tokens -->

## Overview

The search system federates queries across 15 implemented data sources, providing unified results with AI-powered relevance scoring and cross-reference detection.

## Architecture

```
User Query
    |
    v
+-------------------+
| Query Expansion   |
| (AI enhancement)  |
+-------------------+
    |
    v
+-------------------+
| DataSourceRegistry|
| (15 sources)      |
+-------------------+
    |
    +--+--+--+--+--+
    |  |  |  |  |  |
    v  v  v  v  v  v
+---+ +---+ +---+ +---+ ...
|SS | |arX| |OA | |PM |
+---+ +---+ +---+ +---+
    |  |  |  |  |
    +--+--+--+--+
           |
           v
+-------------------+
| Result Unification|
| (dedup, score)    |
+-------------------+
    |
    v
+-------------------+
| AI Enhancement    |
| (relevance, gaps) |
+-------------------+
```

## Key Files (Critical Path)

| File | Purpose | Lines |
|------|---------|-------|
| `src/app/api/search/v2/route.ts` | Enhanced search API | ~300 |
| `src/lib/discovery/data-sources/registry.ts` | Source registry | ~200 |
| `src/lib/discovery/sources/base.ts` | Base adapter | ~100 |
| `src/hooks/useSearch.ts` | Search hook | ~250 |
| `src/components/search/EnhancedSearchPage.tsx` | UI | ~400 |
| `src/components/search/SourceSelector.tsx` | Source picker | ~200 |

## Implemented Data Sources (15)

| Source | Type | API Key | Status |
|--------|------|---------|--------|
| arXiv | Preprints | No | Working |
| OpenAlex | Academic | No | Working |
| PubMed | Biomedical | No | Working |
| Crossref | DOI metadata | No | Working |
| bioRxiv | Bio preprints | No | Working |
| ChemRxiv | Chem preprints | No | Working |
| CORE | Open access | Optional | Working |
| Semantic Scholar | Academic | Optional | Working |
| USPTO | US Patents | No | Working |
| Google Patents | Patents | SERPAPI | Working |
| IEEE Xplore | Engineering | Required | Working |
| Consensus | AI search | Optional | Working |
| NREL | Energy data | Optional | Partial |
| Materials Project | Materials | Required | Working |
| Web Search | General | Google CSE | Working |

## Types to Know

```typescript
// Unified search result
interface UnifiedResult {
  id: string
  title: string
  authors: string[]
  abstract: string
  year: number
  source: DataSourceName
  url: string
  doi?: string
  citations?: number
  relevanceScore: number
}

// Search request
interface SearchRequest {
  query: string
  domains?: Domain[]
  sources?: DataSourceName[]
  dateRange?: { from: string; to: string }
  limit?: number
}

// Search response
interface EnhancedSearchResponse {
  results: UnifiedResult[]
  bySource: Record<DataSourceName, SourceResults>
  crossReferences: CrossReference[]
  aiEnhancements: {
    expandedQuery: string
    relevanceScores: Record<string, number>
  }
  searchMeta: {
    totalTime: number
    sourceStats: Record<DataSourceName, SourceStat>
  }
}
```

## Patterns in Use

1. **Parallel Queries**: All sources queried concurrently
2. **Circuit Breaker**: Failing sources disabled temporarily
3. **Rate Limiting**: Global limiter prevents API abuse
4. **Result Caching**: 5-minute cache for identical queries
5. **Cross-Reference**: Detect same paper in multiple sources

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/search/v2` | POST | Enhanced multi-source search |
| `/api/search/citations` | POST | Citation graph lookup |
| `/api/search/trends` | GET | Research trend analytics |

## State Management

- Hook: `src/hooks/useSearch.ts`
- Key state: `results`, `loading`, `error`, `selectedSources`

## Quality Requirements

1. Respect source rate limits
2. Graceful degradation on source failure
3. Deduplicate across sources
4. Cite all sources in results

## Related Context

- [discovery-engine.md](discovery-engine.md) - Research phase uses this
- `.claude/development.md` - API key configuration

## Current Development

- Source count: 15 implemented (was incorrectly 21+ in docs)
- Focus: Citation graph integration
- Issue: NREL needs full API integration
