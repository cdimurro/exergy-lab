/**
 * arXiv Daily Feed (v0.0.5)
 *
 * Real-time literature feed from arXiv preprint server.
 * Fetches new submissions in energy-related categories.
 *
 * @see https://arxiv.org/help/api
 */

import type {
  FeedItem,
  FeedFetchResult,
  FeedDigest,
  DigestSummary,
  ArxivFeedConfig,
  Author,
  RelevanceInfo,
  FeedPriority,
  ItemMetadata,
} from './feed-types'
import { ARXIV_ENERGY_CATEGORIES, DEFAULT_ARXIV_CONFIG } from './feed-types'

// ============================================================================
// Constants
// ============================================================================

const ARXIV_API_BASE = 'http://export.arxiv.org/api/query'
const MAX_RESULTS_PER_QUERY = 100
const RATE_LIMIT_DELAY = 3000 // 3 seconds between requests

/**
 * Energy-related keyword sets for relevance scoring
 */
const ENERGY_KEYWORD_SETS = {
  solar: [
    'solar cell',
    'photovoltaic',
    'perovskite',
    'silicon solar',
    'tandem cell',
    'quantum dot solar',
    'dye-sensitized',
    'organic solar',
    'thin film solar',
    'solar efficiency',
  ],
  battery: [
    'lithium ion',
    'lithium-ion',
    'battery',
    'cathode',
    'anode',
    'electrolyte',
    'solid state battery',
    'sodium ion',
    'all-solid-state',
    'battery degradation',
  ],
  hydrogen: [
    'electrolysis',
    'electrolyzer',
    'hydrogen production',
    'fuel cell',
    'PEM',
    'alkaline electrolysis',
    'green hydrogen',
    'water splitting',
    'hydrogen storage',
  ],
  wind: [
    'wind turbine',
    'wind energy',
    'offshore wind',
    'wind power',
    'blade aerodynamics',
    'wind farm',
    'wake effects',
  ],
  materials: [
    'bandgap',
    'semiconductor',
    'catalyst',
    'electrocatalyst',
    'two-dimensional',
    'nanostructure',
    'defect engineering',
    'interface',
    'heterostructure',
  ],
}

// ============================================================================
// Types
// ============================================================================

interface ArxivEntry {
  id: string
  title: string
  summary: string
  authors: Array<{ name: string; affiliation?: string }>
  published: string
  updated: string
  categories: string[]
  primaryCategory: string
  links: Array<{ href: string; type?: string; title?: string }>
  doi?: string
  comment?: string
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch papers from arXiv API
 */
async function fetchArxivPapers(
  query: string,
  start: number = 0,
  maxResults: number = MAX_RESULTS_PER_QUERY
): Promise<ArxivEntry[]> {
  const params = new URLSearchParams({
    search_query: query,
    start: start.toString(),
    max_results: maxResults.toString(),
    sortBy: 'submittedDate',
    sortOrder: 'descending',
  })

  const url = `${ARXIV_API_BASE}?${params.toString()}`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`arXiv API error: ${response.status}`)
    }

    const xmlText = await response.text()
    return parseArxivResponse(xmlText)
  } catch (error) {
    console.error('Error fetching from arXiv:', error)
    throw error
  }
}

/**
 * Parse arXiv Atom XML response
 */
function parseArxivResponse(xmlText: string): ArxivEntry[] {
  const entries: ArxivEntry[] = []

  // Simple XML parsing (would use proper XML parser in production)
  const entryMatches = xmlText.match(/<entry>[\s\S]*?<\/entry>/g) || []

  for (const entryXml of entryMatches) {
    const entry = parseArxivEntry(entryXml)
    if (entry) {
      entries.push(entry)
    }
  }

  return entries
}

/**
 * Parse a single arXiv entry
 */
function parseArxivEntry(entryXml: string): ArxivEntry | null {
  try {
    const getId = (xml: string) => {
      const match = xml.match(/<id>(.*?)<\/id>/)
      return match ? match[1].trim() : ''
    }

    const getTitle = (xml: string) => {
      const match = xml.match(/<title>([\s\S]*?)<\/title>/)
      return match ? match[1].replace(/\s+/g, ' ').trim() : ''
    }

    const getSummary = (xml: string) => {
      const match = xml.match(/<summary>([\s\S]*?)<\/summary>/)
      return match ? match[1].replace(/\s+/g, ' ').trim() : ''
    }

    const getPublished = (xml: string) => {
      const match = xml.match(/<published>(.*?)<\/published>/)
      return match ? match[1].trim() : ''
    }

    const getUpdated = (xml: string) => {
      const match = xml.match(/<updated>(.*?)<\/updated>/)
      return match ? match[1].trim() : ''
    }

    const getAuthors = (xml: string): Array<{ name: string; affiliation?: string }> => {
      const authorMatches = xml.match(/<author>[\s\S]*?<\/author>/g) || []
      return authorMatches.map((authorXml) => {
        const nameMatch = authorXml.match(/<name>(.*?)<\/name>/)
        const affiliationMatch = authorXml.match(/<arxiv:affiliation>(.*?)<\/arxiv:affiliation>/)
        return {
          name: nameMatch ? nameMatch[1].trim() : 'Unknown',
          affiliation: affiliationMatch ? affiliationMatch[1].trim() : undefined,
        }
      })
    }

    const getCategories = (xml: string): string[] => {
      const categoryMatches = xml.match(/<category term="([^"]+)"/g) || []
      return categoryMatches.map((cat) => {
        const match = cat.match(/term="([^"]+)"/)
        return match ? match[1] : ''
      })
    }

    const getPrimaryCategory = (xml: string): string => {
      const match = xml.match(/<arxiv:primary_category term="([^"]+)"/)
      return match ? match[1] : ''
    }

    const getLinks = (xml: string): Array<{ href: string; type?: string; title?: string }> => {
      const linkMatches = xml.match(/<link[^>]*\/>/g) || []
      return linkMatches.map((linkXml) => {
        const hrefMatch = linkXml.match(/href="([^"]+)"/)
        const typeMatch = linkXml.match(/type="([^"]+)"/)
        const titleMatch = linkXml.match(/title="([^"]+)"/)
        return {
          href: hrefMatch ? hrefMatch[1] : '',
          type: typeMatch ? typeMatch[1] : undefined,
          title: titleMatch ? titleMatch[1] : undefined,
        }
      })
    }

    const getDoi = (xml: string): string | undefined => {
      const match = xml.match(/<arxiv:doi>(.*?)<\/arxiv:doi>/)
      return match ? match[1].trim() : undefined
    }

    const getComment = (xml: string): string | undefined => {
      const match = xml.match(/<arxiv:comment>(.*?)<\/arxiv:comment>/)
      return match ? match[1].trim() : undefined
    }

    const id = getId(entryXml)
    if (!id) return null

    return {
      id,
      title: getTitle(entryXml),
      summary: getSummary(entryXml),
      authors: getAuthors(entryXml),
      published: getPublished(entryXml),
      updated: getUpdated(entryXml),
      categories: getCategories(entryXml),
      primaryCategory: getPrimaryCategory(entryXml),
      links: getLinks(entryXml),
      doi: getDoi(entryXml),
      comment: getComment(entryXml),
    }
  } catch {
    return null
  }
}

/**
 * Extract arXiv ID from URL
 */
function extractArxivId(idUrl: string): string {
  const match = idUrl.match(/(\d{4}\.\d{4,5})(v\d+)?$/)
  return match ? match[1] : idUrl.replace('http://arxiv.org/abs/', '')
}

// ============================================================================
// Relevance Scoring
// ============================================================================

/**
 * Calculate relevance score for an arXiv entry
 */
function calculateRelevance(
  entry: ArxivEntry,
  config: ArxivFeedConfig
): RelevanceInfo {
  const matchedKeywords: string[] = []
  const matchedAuthors: string[] = []
  let score = 0

  const textToSearch = `${entry.title} ${entry.summary}`.toLowerCase()

  // Match configured keywords
  for (const keyword of config.keywords) {
    if (textToSearch.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword)
      score += 10
    }
  }

  // Match priority keywords (higher weight)
  for (const keyword of config.priorityKeywords || []) {
    if (textToSearch.includes(keyword.toLowerCase())) {
      if (!matchedKeywords.includes(keyword)) {
        matchedKeywords.push(keyword)
      }
      score += 20
    }
  }

  // Match domain-specific keywords
  for (const domain of config.domains) {
    const domainKeywords = ENERGY_KEYWORD_SETS[domain as keyof typeof ENERGY_KEYWORD_SETS] || []
    for (const keyword of domainKeywords) {
      if (textToSearch.includes(keyword.toLowerCase())) {
        if (!matchedKeywords.includes(keyword)) {
          matchedKeywords.push(keyword)
        }
        score += 5
      }
    }
  }

  // Match authors
  for (const author of config.authors || []) {
    const authorLower = author.toLowerCase()
    for (const entryAuthor of entry.authors) {
      if (entryAuthor.name.toLowerCase().includes(authorLower)) {
        matchedAuthors.push(entryAuthor.name)
        score += 15
      }
    }
  }

  // Match categories
  for (const category of config.categories) {
    if (entry.categories.includes(category)) {
      score += 5
    }
  }

  // Penalize excluded keywords
  for (const keyword of config.excludeKeywords || []) {
    if (textToSearch.includes(keyword.toLowerCase())) {
      score -= 30
    }
  }

  // Normalize score to 0-100
  const normalizedScore = Math.min(100, Math.max(0, score))

  // Determine priority
  let priority: FeedPriority = 'low'
  if (normalizedScore >= 80) priority = 'critical'
  else if (normalizedScore >= 60) priority = 'high'
  else if (normalizedScore >= 40) priority = 'medium'

  return {
    score: normalizedScore,
    matchedKeywords,
    matchedAuthors: matchedAuthors.length > 0 ? matchedAuthors : undefined,
    explanation: generateRelevanceExplanation(matchedKeywords, matchedAuthors, priority),
    priority,
  }
}

/**
 * Generate human-readable relevance explanation
 */
function generateRelevanceExplanation(
  keywords: string[],
  authors: string[],
  priority: FeedPriority
): string {
  const parts: string[] = []

  if (keywords.length > 0) {
    parts.push(`Matched keywords: ${keywords.slice(0, 3).join(', ')}`)
  }
  if (authors.length > 0) {
    parts.push(`Matched authors: ${authors.join(', ')}`)
  }

  if (parts.length === 0) {
    return 'Matched by category'
  }

  return parts.join('. ')
}

// ============================================================================
// Feed Item Conversion
// ============================================================================

/**
 * Convert arXiv entry to FeedItem
 */
function arxivEntryToFeedItem(
  entry: ArxivEntry,
  feedId: string,
  relevance: RelevanceInfo
): FeedItem {
  const arxivId = extractArxivId(entry.id)
  const pdfLink = entry.links.find((l) => l.title === 'pdf')

  const authors: Author[] = entry.authors.map((a) => ({
    name: a.name,
    affiliations: a.affiliation ? [a.affiliation] : undefined,
  }))

  const metadata: ItemMetadata = {
    categories: entry.categories,
    keywords: extractKeywordsFromAbstract(entry.summary),
    pdfUrl: pdfLink?.href,
    openAccess: true, // arXiv is always open access
  }

  if (entry.comment) {
    // Extract page count from comment like "15 pages, 8 figures"
    const pageMatch = entry.comment.match(/(\d+)\s*pages?/i)
    const figMatch = entry.comment.match(/(\d+)\s*figures?/i)
    if (figMatch) {
      metadata.figures = parseInt(figMatch[1], 10)
    }
  }

  return {
    id: `arxiv-${arxivId}`,
    feedId,
    source: 'arxiv',
    type: 'preprint',
    title: entry.title,
    authors,
    abstract: entry.summary,
    publicationDate: entry.published,
    fetchedAt: new Date().toISOString(),
    url: entry.id,
    doi: entry.doi,
    arxivId,
    metadata,
    relevance,
    status: {
      read: false,
      starred: false,
      savedToLibrary: false,
    },
  }
}

/**
 * Extract keywords from abstract text
 */
function extractKeywordsFromAbstract(abstract: string): string[] {
  const keywords: string[] = []
  const abstractLower = abstract.toLowerCase()

  // Check all energy keyword sets
  for (const keywordSet of Object.values(ENERGY_KEYWORD_SETS)) {
    for (const keyword of keywordSet) {
      if (abstractLower.includes(keyword.toLowerCase()) && !keywords.includes(keyword)) {
        keywords.push(keyword)
      }
    }
  }

  return keywords.slice(0, 10)
}

// ============================================================================
// Main Feed Functions
// ============================================================================

/**
 * Fetch arXiv daily digest
 */
export async function fetchArxivDailyDigest(
  feedId: string,
  config: ArxivFeedConfig = DEFAULT_ARXIV_CONFIG
): Promise<FeedFetchResult> {
  const items: FeedItem[] = []
  const errors: Array<{ source: 'arxiv'; code: string; message: string; retryable: boolean }> = []
  const fetchedAt = new Date().toISOString()

  try {
    // Build query from categories and keywords
    const categoryQuery = config.categories.map((cat) => `cat:${cat}`).join(' OR ')
    const keywordQuery = config.keywords.length > 0
      ? ` AND (${config.keywords.map((kw) => `all:${kw}`).join(' OR ')})`
      : ''

    const query = `(${categoryQuery})${keywordQuery}`

    // Fetch papers
    const entries = await fetchArxivPapers(query, 0, config.maxItemsPerDigest)

    // Filter by date if configured
    const dateThreshold = config.dateRange?.type === 'last_days' && config.dateRange.days
      ? new Date(Date.now() - config.dateRange.days * 24 * 60 * 60 * 1000)
      : null

    for (const entry of entries) {
      const publishedDate = new Date(entry.published)

      // Skip if too old
      if (dateThreshold && publishedDate < dateThreshold) {
        continue
      }

      // Calculate relevance
      const relevance = calculateRelevance(entry, config)

      // Skip if excluded keywords matched (negative score)
      if (relevance.score <= 0) {
        continue
      }

      // Convert to feed item
      const feedItem = arxivEntryToFeedItem(entry, feedId, relevance)
      items.push(feedItem)
    }

    // Sort by relevance
    items.sort((a, b) => b.relevance.score - a.relevance.score)

  } catch (error) {
    errors.push({
      source: 'arxiv',
      code: 'FETCH_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      retryable: true,
    })
  }

  return {
    feedId,
    success: errors.length === 0,
    fetchedAt,
    itemCount: items.length,
    newItems: items.length, // All items are "new" in initial fetch
    items,
    errors: errors.length > 0 ? errors : undefined,
    nextFetch: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Next day
  }
}

/**
 * Generate digest summary from feed items
 */
export function generateArxivDigestSummary(items: FeedItem[]): DigestSummary {
  const bySource: Record<string, number> = {
    arxiv: items.length,
    pubmed: 0,
    biorxiv: 0,
    chemrxiv: 0,
    'google-patents': 0,
    uspto: 0,
    'semantic-scholar': 0,
    crossref: 0,
  }
  const byPriority: Record<FeedPriority, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  }

  const keywordCounts: Record<string, number> = {}
  const authorCounts: Record<string, number> = {}

  for (const item of items) {
    // Count by priority
    byPriority[item.relevance.priority]++

    // Count keywords
    for (const keyword of item.relevance.matchedKeywords) {
      keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1
    }

    // Count authors
    for (const author of item.authors) {
      authorCounts[author.name] = (authorCounts[author.name] || 0) + 1
    }
  }

  const topKeywords = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }))

  const topAuthors = Object.entries(authorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  // Identify trending topics (keywords that appear frequently)
  const trendingTopics = topKeywords
    .filter((k) => k.count >= 3)
    .map((k) => k.keyword)

  return {
    totalItems: items.length,
    bySource,
    byPriority,
    topKeywords,
    topAuthors,
    trendingTopics,
  }
}

/**
 * Create a full digest object
 */
export async function createArxivDigest(
  feedId: string,
  config: ArxivFeedConfig
): Promise<FeedDigest> {
  const result = await fetchArxivDailyDigest(feedId, config)

  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const summary = generateArxivDigestSummary(result.items)

  const topItems = result.items
    .filter((item) => item.relevance.priority === 'critical' || item.relevance.priority === 'high')
    .slice(0, 10)

  return {
    id: `digest-${feedId}-${now.toISOString().split('T')[0]}`,
    feedId,
    period: {
      from: yesterday.toISOString(),
      to: now.toISOString(),
    },
    generatedAt: now.toISOString(),
    summary,
    topItems,
    allItems: result.items,
  }
}

/**
 * Get available arXiv categories for energy research
 */
export function getArxivEnergyCategories() {
  return ARXIV_ENERGY_CATEGORIES
}

/**
 * Create default arXiv feed configuration for a domain
 */
export function createArxivConfigForDomain(
  domain: 'solar' | 'battery' | 'hydrogen' | 'wind' | 'materials'
): ArxivFeedConfig {
  const domainKeywords = ENERGY_KEYWORD_SETS[domain] || []

  return {
    ...DEFAULT_ARXIV_CONFIG,
    domains: [domain],
    keywords: domainKeywords.slice(0, 5),
    priorityKeywords: domainKeywords.slice(0, 2),
  }
}

export default {
  fetchArxivDailyDigest,
  generateArxivDigestSummary,
  createArxivDigest,
  getArxivEnergyCategories,
  createArxivConfigForDomain,
}
