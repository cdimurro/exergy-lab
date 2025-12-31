/**
 * PubMed Alerts Feed (v0.0.5)
 *
 * Literature alerts from PubMed/MEDLINE database.
 * Covers energy-related biochemistry, materials, and applied research.
 *
 * @see https://www.ncbi.nlm.nih.gov/books/NBK25499/
 */

import type {
  FeedItem,
  FeedFetchResult,
  FeedDigest,
  DigestSummary,
  PubmedFeedConfig,
  Author,
  RelevanceInfo,
  FeedPriority,
  ItemMetadata,
} from './feed-types'
import { PUBMED_ENERGY_MESH_TERMS, DEFAULT_PUBMED_CONFIG } from './feed-types'

// ============================================================================
// Constants
// ============================================================================

const PUBMED_ESEARCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi'
const PUBMED_EFETCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi'
const MAX_RESULTS_PER_QUERY = 100
const RATE_LIMIT_DELAY = 334 // NCBI allows ~3 requests/second without API key

/**
 * Energy-related PubMed search terms
 */
const PUBMED_ENERGY_TERMS = {
  solar: [
    'solar cell',
    'photovoltaic',
    'perovskite solar',
    'dye-sensitized solar',
    'organic photovoltaic',
    'quantum dot solar',
  ],
  battery: [
    'lithium ion battery',
    'lithium-ion battery',
    'battery electrode',
    'solid electrolyte',
    'battery cathode',
    'battery anode',
    'sodium ion battery',
  ],
  hydrogen: [
    'electrolysis',
    'water splitting',
    'hydrogen production',
    'fuel cell',
    'proton exchange membrane',
    'electrocatalyst',
    'hydrogen storage',
  ],
  catalysis: [
    'photocatalysis',
    'electrocatalysis',
    'heterogeneous catalysis',
    'catalyst design',
    'nanocatalyst',
    'metal organic framework catalysis',
  ],
  materials: [
    'semiconductor nanostructure',
    'two-dimensional material',
    'bandgap engineering',
    'defect engineering',
    'interface engineering',
  ],
}

// ============================================================================
// Types
// ============================================================================

interface PubMedArticle {
  pmid: string
  title: string
  abstract: string
  authors: Array<{
    lastName: string
    foreName: string
    initials: string
    affiliation?: string
  }>
  journal: {
    title: string
    isoAbbreviation: string
    volume?: string
    issue?: string
    pubDate: string
  }
  doi?: string
  pmcid?: string
  publicationType: string[]
  meshTerms: string[]
  keywords: string[]
  articleDate: string
}

interface PubMedSearchResult {
  count: number
  ids: string[]
  queryTranslation: string
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Search PubMed for article IDs
 */
async function searchPubMed(
  query: string,
  retStart: number = 0,
  retMax: number = MAX_RESULTS_PER_QUERY,
  datetype: string = 'pdat',
  reldate?: number
): Promise<PubMedSearchResult> {
  const params: Record<string, string> = {
    db: 'pubmed',
    term: query,
    retstart: retStart.toString(),
    retmax: retMax.toString(),
    retmode: 'json',
    sort: 'pub_date',
    datetype,
  }

  if (reldate) {
    params.reldate = reldate.toString()
  }

  const url = `${PUBMED_ESEARCH_URL}?${new URLSearchParams(params).toString()}`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`PubMed search error: ${response.status}`)
    }

    const data = await response.json()
    return {
      count: parseInt(data.esearchresult?.count || '0', 10),
      ids: data.esearchresult?.idlist || [],
      queryTranslation: data.esearchresult?.querytranslation || '',
    }
  } catch (error) {
    console.error('Error searching PubMed:', error)
    throw error
  }
}

/**
 * Fetch article details by PMIDs
 */
async function fetchPubMedArticles(pmids: string[]): Promise<PubMedArticle[]> {
  if (pmids.length === 0) return []

  const params = new URLSearchParams({
    db: 'pubmed',
    id: pmids.join(','),
    retmode: 'xml',
    rettype: 'abstract',
  })

  const url = `${PUBMED_EFETCH_URL}?${params.toString()}`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`PubMed fetch error: ${response.status}`)
    }

    const xmlText = await response.text()
    return parsePubMedXml(xmlText)
  } catch (error) {
    console.error('Error fetching PubMed articles:', error)
    throw error
  }
}

/**
 * Parse PubMed XML response
 */
function parsePubMedXml(xmlText: string): PubMedArticle[] {
  const articles: PubMedArticle[] = []
  const articleMatches = xmlText.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) || []

  for (const articleXml of articleMatches) {
    const article = parsePubMedArticle(articleXml)
    if (article) {
      articles.push(article)
    }
  }

  return articles
}

/**
 * Parse a single PubMed article
 */
function parsePubMedArticle(articleXml: string): PubMedArticle | null {
  try {
    const getElement = (xml: string, tag: string): string => {
      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)
      const match = xml.match(regex)
      return match ? match[1].replace(/<[^>]+>/g, '').trim() : ''
    }

    const getPmid = (xml: string): string => {
      const match = xml.match(/<PMID[^>]*>(\d+)<\/PMID>/)
      return match ? match[1] : ''
    }

    const getAuthors = (xml: string) => {
      const authorList = xml.match(/<AuthorList[^>]*>([\s\S]*?)<\/AuthorList>/)
      if (!authorList) return []

      const authorMatches = authorList[1].match(/<Author[^>]*>[\s\S]*?<\/Author>/g) || []
      return authorMatches.map((authorXml) => ({
        lastName: getElement(authorXml, 'LastName'),
        foreName: getElement(authorXml, 'ForeName'),
        initials: getElement(authorXml, 'Initials'),
        affiliation: getElement(authorXml, 'Affiliation') || undefined,
      }))
    }

    const getMeshTerms = (xml: string): string[] => {
      const meshList = xml.match(/<MeshHeadingList>([\s\S]*?)<\/MeshHeadingList>/)
      if (!meshList) return []

      const termMatches = meshList[1].match(/<DescriptorName[^>]*>([^<]+)<\/DescriptorName>/g) || []
      return termMatches.map((term) => {
        const match = term.match(/>([^<]+)</)
        return match ? match[1] : ''
      }).filter(Boolean)
    }

    const getKeywords = (xml: string): string[] => {
      const keywordList = xml.match(/<KeywordList[^>]*>([\s\S]*?)<\/KeywordList>/)
      if (!keywordList) return []

      const keywordMatches = keywordList[1].match(/<Keyword[^>]*>([^<]+)<\/Keyword>/g) || []
      return keywordMatches.map((kw) => {
        const match = kw.match(/>([^<]+)</)
        return match ? match[1] : ''
      }).filter(Boolean)
    }

    const getPublicationTypes = (xml: string): string[] => {
      const typeList = xml.match(/<PublicationTypeList>([\s\S]*?)<\/PublicationTypeList>/)
      if (!typeList) return []

      const typeMatches = typeList[1].match(/<PublicationType[^>]*>([^<]+)<\/PublicationType>/g) || []
      return typeMatches.map((pt) => {
        const match = pt.match(/>([^<]+)</)
        return match ? match[1] : ''
      }).filter(Boolean)
    }

    const getDoi = (xml: string): string | undefined => {
      const match = xml.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/)
      return match ? match[1] : undefined
    }

    const getPmcid = (xml: string): string | undefined => {
      const match = xml.match(/<ArticleId IdType="pmc">([^<]+)<\/ArticleId>/)
      return match ? match[1] : undefined
    }

    const getJournalInfo = (xml: string) => {
      const journal = xml.match(/<Journal>([\s\S]*?)<\/Journal>/)
      if (!journal) {
        return {
          title: '',
          isoAbbreviation: '',
          pubDate: '',
        }
      }

      const journalXml = journal[1]
      const pubDateMatch = journalXml.match(/<PubDate>([\s\S]*?)<\/PubDate>/)
      let pubDate = ''
      if (pubDateMatch) {
        const year = getElement(pubDateMatch[1], 'Year')
        const month = getElement(pubDateMatch[1], 'Month')
        const day = getElement(pubDateMatch[1], 'Day')
        pubDate = [year, month, day].filter(Boolean).join('-')
      }

      return {
        title: getElement(journalXml, 'Title'),
        isoAbbreviation: getElement(journalXml, 'ISOAbbreviation'),
        volume: getElement(journalXml, 'Volume') || undefined,
        issue: getElement(journalXml, 'Issue') || undefined,
        pubDate,
      }
    }

    const getArticleDate = (xml: string): string => {
      const dateMatch = xml.match(/<ArticleDate DateType="Electronic">([\s\S]*?)<\/ArticleDate>/)
      if (dateMatch) {
        const year = getElement(dateMatch[1], 'Year')
        const month = getElement(dateMatch[1], 'Month')
        const day = getElement(dateMatch[1], 'Day')
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
      return new Date().toISOString().split('T')[0]
    }

    const pmid = getPmid(articleXml)
    if (!pmid) return null

    const articleSection = articleXml.match(/<Article[^>]*>([\s\S]*?)<\/Article>/)
    const articleContent = articleSection ? articleSection[1] : articleXml

    return {
      pmid,
      title: getElement(articleContent, 'ArticleTitle'),
      abstract: getElement(articleContent, 'AbstractText') || getElement(articleXml, 'AbstractText'),
      authors: getAuthors(articleContent),
      journal: getJournalInfo(articleContent),
      doi: getDoi(articleXml),
      pmcid: getPmcid(articleXml),
      publicationType: getPublicationTypes(articleXml),
      meshTerms: getMeshTerms(articleXml),
      keywords: getKeywords(articleXml),
      articleDate: getArticleDate(articleXml),
    }
  } catch {
    return null
  }
}

// ============================================================================
// Relevance Scoring
// ============================================================================

/**
 * Calculate relevance score for a PubMed article
 */
function calculateRelevance(
  article: PubMedArticle,
  config: PubmedFeedConfig
): RelevanceInfo {
  const matchedKeywords: string[] = []
  const matchedAuthors: string[] = []
  let score = 0

  const textToSearch = `${article.title} ${article.abstract}`.toLowerCase()

  // Match configured keywords
  for (const keyword of config.keywords) {
    if (textToSearch.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword)
      score += 10
    }
  }

  // Match priority keywords
  for (const keyword of config.priorityKeywords || []) {
    if (textToSearch.includes(keyword.toLowerCase())) {
      if (!matchedKeywords.includes(keyword)) {
        matchedKeywords.push(keyword)
      }
      score += 20
    }
  }

  // Match MeSH terms
  for (const meshTerm of config.meshTerms || []) {
    if (article.meshTerms.some((m) => m.toLowerCase().includes(meshTerm.toLowerCase()))) {
      score += 15
    }
  }

  // Match domain-specific terms
  for (const domain of config.domains) {
    const domainTerms = PUBMED_ENERGY_TERMS[domain as keyof typeof PUBMED_ENERGY_TERMS] || []
    for (const term of domainTerms) {
      if (textToSearch.includes(term.toLowerCase())) {
        if (!matchedKeywords.includes(term)) {
          matchedKeywords.push(term)
        }
        score += 5
      }
    }
  }

  // Match authors
  for (const author of config.authors || []) {
    const authorLower = author.toLowerCase()
    for (const articleAuthor of article.authors) {
      const fullName = `${articleAuthor.foreName} ${articleAuthor.lastName}`.toLowerCase()
      if (fullName.includes(authorLower)) {
        matchedAuthors.push(`${articleAuthor.foreName} ${articleAuthor.lastName}`)
        score += 15
      }
    }
  }

  // Bonus for reviews (comprehensive)
  if (article.publicationType.some((pt) => pt.toLowerCase().includes('review'))) {
    score += 10
  }

  // Bonus for articles with MeSH terms (better indexed)
  if (article.meshTerms.length > 0) {
    score += 5
  }

  // Penalize excluded keywords
  for (const keyword of config.excludeKeywords || []) {
    if (textToSearch.includes(keyword.toLowerCase())) {
      score -= 30
    }
  }

  // Normalize score
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
    explanation: generateRelevanceExplanation(matchedKeywords, matchedAuthors, article.publicationType),
    priority,
  }
}

/**
 * Generate relevance explanation
 */
function generateRelevanceExplanation(
  keywords: string[],
  authors: string[],
  publicationTypes: string[]
): string {
  const parts: string[] = []

  if (keywords.length > 0) {
    parts.push(`Keywords: ${keywords.slice(0, 3).join(', ')}`)
  }
  if (authors.length > 0) {
    parts.push(`Authors: ${authors.join(', ')}`)
  }
  if (publicationTypes.some((pt) => pt.toLowerCase().includes('review'))) {
    parts.push('Review article')
  }

  return parts.length > 0 ? parts.join('. ') : 'Matched by search terms'
}

// ============================================================================
// Feed Item Conversion
// ============================================================================

/**
 * Convert PubMed article to FeedItem
 */
function pubmedArticleToFeedItem(
  article: PubMedArticle,
  feedId: string,
  relevance: RelevanceInfo
): FeedItem {
  const authors: Author[] = article.authors.map((a) => ({
    name: `${a.foreName} ${a.lastName}`,
    affiliations: a.affiliation ? [a.affiliation] : undefined,
  }))

  const metadata: ItemMetadata = {
    journal: article.journal.title,
    volume: article.journal.volume,
    issue: article.journal.issue,
    keywords: [...article.keywords, ...article.meshTerms.slice(0, 5)],
    openAccess: !!article.pmcid,
  }

  if (article.pmcid) {
    metadata.pdfUrl = `https://www.ncbi.nlm.nih.gov/pmc/articles/${article.pmcid}/pdf/`
  }

  // Determine item type
  let itemType: 'journal-article' | 'conference-paper' | 'thesis' = 'journal-article'
  if (article.publicationType.some((pt) => pt.toLowerCase().includes('congress'))) {
    itemType = 'conference-paper'
  }

  return {
    id: `pubmed-${article.pmid}`,
    feedId,
    source: 'pubmed',
    type: itemType,
    title: article.title,
    authors,
    abstract: article.abstract,
    publicationDate: article.articleDate || article.journal.pubDate,
    fetchedAt: new Date().toISOString(),
    url: `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`,
    doi: article.doi,
    pubmedId: article.pmid,
    metadata,
    relevance,
    status: {
      read: false,
      starred: false,
      savedToLibrary: false,
    },
  }
}

// ============================================================================
// Main Feed Functions
// ============================================================================

/**
 * Fetch PubMed alerts
 */
export async function fetchPubMedAlerts(
  feedId: string,
  config: PubmedFeedConfig = DEFAULT_PUBMED_CONFIG
): Promise<FeedFetchResult> {
  const items: FeedItem[] = []
  const errors: Array<{ source: 'pubmed'; code: string; message: string; retryable: boolean }> = []
  const fetchedAt = new Date().toISOString()

  try {
    // Build search query
    const queryParts: string[] = []

    // Add keywords
    if (config.keywords.length > 0) {
      queryParts.push(`(${config.keywords.join(' OR ')})`)
    }

    // Add MeSH terms
    if (config.meshTerms && config.meshTerms.length > 0) {
      queryParts.push(`(${config.meshTerms.map((m) => `"${m}"[MeSH]`).join(' OR ')})`)
    }

    // Add domain-specific terms
    for (const domain of config.domains) {
      const terms = PUBMED_ENERGY_TERMS[domain as keyof typeof PUBMED_ENERGY_TERMS]
      if (terms) {
        queryParts.push(`(${terms.slice(0, 3).join(' OR ')})`)
      }
    }

    // Add article type filters
    if (config.articleTypes) {
      const typeFilters = config.articleTypes.map((t) => `"${t}"[Publication Type]`)
      queryParts.push(`(${typeFilters.join(' OR ')})`)
    }

    const query = queryParts.join(' AND ')

    // Calculate date range
    const reldate = config.dateRange?.type === 'last_days' ? config.dateRange.days : 7

    // Search for PMIDs
    const searchResult = await searchPubMed(query, 0, config.maxItemsPerDigest, 'pdat', reldate)

    if (searchResult.ids.length === 0) {
      return {
        feedId,
        success: true,
        fetchedAt,
        itemCount: 0,
        newItems: 0,
        items: [],
      }
    }

    // Rate limit delay
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY))

    // Fetch article details
    const articles = await fetchPubMedArticles(searchResult.ids)

    for (const article of articles) {
      const relevance = calculateRelevance(article, config)

      // Skip if excluded
      if (relevance.score <= 0) continue

      const feedItem = pubmedArticleToFeedItem(article, feedId, relevance)
      items.push(feedItem)
    }

    // Sort by relevance
    items.sort((a, b) => b.relevance.score - a.relevance.score)

  } catch (error) {
    errors.push({
      source: 'pubmed',
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
    newItems: items.length,
    items,
    errors: errors.length > 0 ? errors : undefined,
    nextFetch: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }
}

/**
 * Generate digest summary
 */
export function generatePubMedDigestSummary(items: FeedItem[]): DigestSummary {
  const bySource: Record<string, number> = {
    arxiv: 0,
    pubmed: items.length,
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
  const journalCounts: Record<string, number> = {}

  for (const item of items) {
    byPriority[item.relevance.priority]++

    for (const keyword of item.relevance.matchedKeywords) {
      keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1
    }

    for (const author of item.authors) {
      authorCounts[author.name] = (authorCounts[author.name] || 0) + 1
    }

    if (item.metadata?.journal) {
      journalCounts[item.metadata.journal] = (journalCounts[item.metadata.journal] || 0) + 1
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

  const trendingTopics = topKeywords
    .filter((k) => k.count >= 2)
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
 * Create full digest
 */
export async function createPubMedDigest(
  feedId: string,
  config: PubmedFeedConfig
): Promise<FeedDigest> {
  const result = await fetchPubMedAlerts(feedId, config)

  const now = new Date()
  const pastDays = config.dateRange?.days || 7
  const startDate = new Date(now.getTime() - pastDays * 24 * 60 * 60 * 1000)

  const summary = generatePubMedDigestSummary(result.items)

  const topItems = result.items
    .filter((item) => item.relevance.priority === 'critical' || item.relevance.priority === 'high')
    .slice(0, 10)

  return {
    id: `digest-${feedId}-${now.toISOString().split('T')[0]}`,
    feedId,
    period: {
      from: startDate.toISOString(),
      to: now.toISOString(),
    },
    generatedAt: now.toISOString(),
    summary,
    topItems,
    allItems: result.items,
  }
}

/**
 * Get available MeSH terms for energy research
 */
export function getPubMedEnergyMeshTerms() {
  return PUBMED_ENERGY_MESH_TERMS
}

/**
 * Create default PubMed config for a domain
 */
export function createPubMedConfigForDomain(
  domain: 'solar' | 'battery' | 'hydrogen' | 'catalysis' | 'materials'
): PubmedFeedConfig {
  const domainTerms = PUBMED_ENERGY_TERMS[domain] || []

  return {
    ...DEFAULT_PUBMED_CONFIG,
    domains: [domain],
    keywords: domainTerms.slice(0, 5),
    priorityKeywords: domainTerms.slice(0, 2),
  }
}

export default {
  fetchPubMedAlerts,
  generatePubMedDigestSummary,
  createPubMedDigest,
  getPubMedEnergyMeshTerms,
  createPubMedConfigForDomain,
}
