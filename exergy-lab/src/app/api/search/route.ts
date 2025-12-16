/**
 * Search API Route
 * AI-powered academic paper and article search
 * Integrates with: Semantic Scholar, arXiv, PubMed
 */

import { NextRequest, NextResponse } from 'next/server'
import { aiRouter } from '@/lib/ai/model-router'
import type { SearchQuery, SearchResult, Paper } from '@/types/search'

/**
 * POST /api/search
 * Search for academic papers and articles
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SearchQuery

    if (!body.query || body.query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Step 1: AI expands and refines the query
    const expandedQuery = await expandQuery(body.query)

    // Step 2: Search multiple academic databases in parallel
    const [semanticScholarResults, arXivResults, pubMedResults] = await Promise.allSettled([
      searchSemanticScholar(expandedQuery, body.filters),
      searchArXiv(expandedQuery, body.filters),
      searchPubMed(expandedQuery, body.filters),
    ])

    // Combine results
    const allPapers: Paper[] = []

    if (semanticScholarResults.status === 'fulfilled') {
      allPapers.push(...semanticScholarResults.value)
    }
    if (arXivResults.status === 'fulfilled') {
      allPapers.push(...arXivResults.value)
    }
    if (pubMedResults.status === 'fulfilled') {
      allPapers.push(...pubMedResults.value)
    }

    // Step 3: Remove duplicates (by DOI or title similarity)
    const uniquePapers = deduplicatePapers(allPapers)

    // Step 4: AI ranks results by relevance
    const rankedPapers = await rankPapersByRelevance(body.query, uniquePapers)

    // Step 5: Apply filters
    const filteredPapers = applyFilters(rankedPapers, body.filters)

    // Return results
    const result: SearchResult = {
      papers: filteredPapers,
      totalCount: filteredPapers.length,
      expandedQuery,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    )
  }
}

/**
 * Expand query using AI
 */
async function expandQuery(query: string): Promise<string> {
  try {
    const prompt = `You are a research librarian. Expand this search query to include relevant synonyms, related terms, and alternative phrasings for better academic search results. Keep it concise (1-2 sentences).

Original query: "${query}"

Expanded query:`

    const expanded = await aiRouter.execute('search-expand', prompt, {
      temperature: 0.5,
      maxTokens: 100,
    })

    return expanded.trim()
  } catch (error) {
    console.error('Query expansion failed, using original:', error)
    return query
  }
}

/**
 * Search Semantic Scholar API
 * Docs: https://api.semanticscholar.org/
 */
async function searchSemanticScholar(
  query: string,
  filters?: SearchQuery['filters']
): Promise<Paper[]> {
  try {
    // Build query parameters
    const params = new URLSearchParams({
      query,
      limit: '20',
      fields: 'paperId,title,abstract,authors,year,citationCount,url,externalIds,venue,fieldsOfStudy',
    })

    const response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?${params}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Semantic Scholar API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.data || !Array.isArray(data.data)) {
      return []
    }

    return data.data.map((item: any) => ({
      id: `s2-${item.paperId}`,
      title: item.title || 'Untitled',
      authors: item.authors?.map((a: any) => a.name) || [],
      abstract: item.abstract || '',
      publicationDate: item.year ? `${item.year}-01-01` : '',
      citationCount: item.citationCount || 0,
      url: item.url || `https://www.semanticscholar.org/paper/${item.paperId}`,
      doi: item.externalIds?.DOI,
      venue: item.venue,
      fields: item.fieldsOfStudy || [],
    })) as Paper[]
  } catch (error) {
    console.error('Semantic Scholar search failed:', error)
    return []
  }
}

/**
 * Search arXiv API
 * Docs: https://info.arxiv.org/help/api/index.html
 */
async function searchArXiv(query: string, filters?: SearchQuery['filters']): Promise<Paper[]> {
  try {
    // arXiv uses Atom feed format
    const params = new URLSearchParams({
      search_query: `all:${query}`,
      start: '0',
      max_results: '20',
    })

    const response = await fetch(`https://export.arxiv.org/api/query?${params}`)

    if (!response.ok) {
      throw new Error(`arXiv API error: ${response.status}`)
    }

    const xmlText = await response.text()

    // Parse arXiv XML (simplified - in production use a proper XML parser)
    const papers = parseArXivXML(xmlText)

    return papers
  } catch (error) {
    console.error('arXiv search failed:', error)
    return []
  }
}

/**
 * Parse arXiv XML response
 * Simplified parser - in production use a proper XML parser
 */
function parseArXivXML(xml: string): Paper[] {
  const papers: Paper[] = []

  // Simple regex-based parsing (not robust for production)
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
  const entries = xml.match(entryRegex) || []

  for (const entry of entries.slice(0, 20)) {
    const getTag = (tag: string) => {
      const match = entry.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`))
      return match ? match[1].trim() : ''
    }

    const getId = () => {
      const match = entry.match(/<id>(.*?)<\/id>/)
      return match ? match[1].split('/').pop()?.trim() || '' : ''
    }

    const getAuthors = () => {
      const authorMatches = entry.match(/<name>(.*?)<\/name>/g) || []
      return authorMatches.map((m) => m.replace(/<\/?name>/g, '').trim())
    }

    const id = getId()
    const title = getTag('title').replace(/\s+/g, ' ')
    const abstract = getTag('summary').replace(/\s+/g, ' ')
    const published = getTag('published')

    papers.push({
      id: `arxiv-${id}`,
      title,
      authors: getAuthors(),
      abstract,
      publicationDate: published.split('T')[0],
      citationCount: 0, // arXiv doesn't provide citation counts
      url: `https://arxiv.org/abs/${id}`,
      pdfUrl: `https://arxiv.org/pdf/${id}.pdf`,
      fields: ['Computer Science', 'Physics'], // Simplified
    })
  }

  return papers
}

/**
 * Search PubMed API
 * Docs: https://www.ncbi.nlm.nih.gov/home/develop/api/
 */
async function searchPubMed(query: string, filters?: SearchQuery['filters']): Promise<Paper[]> {
  try {
    // PubMed E-utilities API
    // Step 1: Search for PMIDs
    const searchParams = new URLSearchParams({
      db: 'pubmed',
      term: query,
      retmax: '20',
      retmode: 'json',
    })

    const searchResponse = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${searchParams}`
    )

    if (!searchResponse.ok) {
      throw new Error(`PubMed search API error: ${searchResponse.status}`)
    }

    const searchData = await searchResponse.json()
    const pmids = searchData.esearchresult?.idlist || []

    if (pmids.length === 0) {
      return []
    }

    // Step 2: Fetch details for PMIDs
    const summaryParams = new URLSearchParams({
      db: 'pubmed',
      id: pmids.join(','),
      retmode: 'json',
    })

    const summaryResponse = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?${summaryParams}`
    )

    if (!summaryResponse.ok) {
      throw new Error(`PubMed summary API error: ${summaryResponse.status}`)
    }

    const summaryData = await summaryResponse.json()
    const result = summaryData.result

    const papers: Paper[] = []

    for (const pmid of pmids) {
      const item = result[pmid]
      if (!item) continue

      papers.push({
        id: `pubmed-${pmid}`,
        title: item.title || 'Untitled',
        authors: item.authors?.map((a: any) => a.name) || [],
        abstract: item.abstract || '',
        publicationDate: item.pubdate || '',
        citationCount: 0, // PubMed doesn't provide citation counts via API
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        doi: item.elocationid?.match(/doi: (.*)/)?.[1],
        venue: item.source,
        fields: ['Medicine', 'Life Sciences'], // Simplified
      })
    }

    return papers
  } catch (error) {
    console.error('PubMed search failed:', error)
    return []
  }
}

/**
 * Remove duplicate papers
 */
function deduplicatePapers(papers: Paper[]): Paper[] {
  const seen = new Set<string>()
  const unique: Paper[] = []

  for (const paper of papers) {
    // Use DOI if available, otherwise use normalized title
    const key = paper.doi || paper.title.toLowerCase().replace(/\s+/g, '')

    if (!seen.has(key)) {
      seen.add(key)
      unique.push(paper)
    }
  }

  return unique
}

/**
 * Rank papers by relevance using AI
 */
async function rankPapersByRelevance(query: string, papers: Paper[]): Promise<Paper[]> {
  if (papers.length === 0) return papers

  try {
    // For efficiency, only rank if we have many papers
    if (papers.length <= 10) {
      return papers // Keep original order for small result sets
    }

    // Build prompt with paper titles and abstracts (truncated)
    const papersText = papers
      .map(
        (p, i) =>
          `${i + 1}. ${p.title}\n   Abstract: ${p.abstract.substring(0, 200)}...\n   Citations: ${p.citationCount}`
      )
      .join('\n\n')

    const prompt = `Rank these research papers by relevance to the query: "${query}"

Papers:
${papersText}

Return ONLY a comma-separated list of paper numbers in order of relevance (e.g., "3,1,5,2,4..."). Most relevant first.`

    const rankingResponse = await aiRouter.execute('search-rank', prompt, {
      temperature: 0.1,
      maxTokens: 200,
    })

    // Parse ranking
    const rankings = rankingResponse
      .match(/\d+/g)
      ?.map((n) => parseInt(n) - 1)
      .filter((i) => i >= 0 && i < papers.length)

    if (rankings && rankings.length > 0) {
      // Reorder papers based on AI ranking
      const ranked = rankings.map((i) => papers[i])
      // Add any papers that weren't ranked (append to end)
      const unranked = papers.filter((_, i) => !rankings.includes(i))
      return [...ranked, ...unranked]
    }

    return papers
  } catch (error) {
    console.error('Paper ranking failed, using default order:', error)
    // Fallback: sort by citation count
    return papers.sort((a, b) => b.citationCount - a.citationCount)
  }
}

/**
 * Apply filters to papers
 */
function applyFilters(papers: Paper[], filters?: SearchQuery['filters']): Paper[] {
  if (!filters) return papers

  let filtered = papers

  // Domain filter
  if (filters.domains && filters.domains.length > 0) {
    filtered = filtered.filter((paper) =>
      paper.fields?.some((field) =>
        filters.domains!.some((domain) => field.toLowerCase().includes(domain.toLowerCase()))
      )
    )
  }

  // Year range filter
  if (filters.yearRange) {
    const { start: minYear, end: maxYear } = filters.yearRange
    filtered = filtered.filter((paper) => {
      const year = new Date(paper.publicationDate).getFullYear()
      return year >= minYear && year <= maxYear
    })
  }

  // Minimum citations filter
  if (filters.minCitations !== undefined) {
    filtered = filtered.filter((paper) => paper.citationCount >= filters.minCitations!)
  }

  // Venue filter
  if (filters.venues && filters.venues.length > 0) {
    filtered = filtered.filter((paper) =>
      filters.venues!.some((venue) => paper.venue?.toLowerCase().includes(venue.toLowerCase()))
    )
  }

  return filtered
}
