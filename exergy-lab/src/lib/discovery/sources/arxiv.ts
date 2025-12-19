/**
 * arXiv API Adapter
 *
 * Searches arXiv for preprints in physics, materials science, and energy.
 * API: https://info.arxiv.org/help/api/index.html
 *
 * Rate: No strict limit, 3 seconds between requests recommended
 * Auth: None required (free API)
 *
 * Features:
 * - Full text search across titles, abstracts, authors
 * - Category filtering (cond-mat, physics, etc.)
 * - Date range filtering
 * - Open access to all papers
 */

import { BaseAdapter } from './base'
import {
  DataSourceName,
  Source,
  Preprint,
  SearchFilters,
  SearchResult,
} from '@/types/sources'
import { Domain } from '@/types/discovery'

/**
 * arXiv API response types (Atom XML parsed to JSON)
 */
interface ArxivEntry {
  id: string
  title: string
  summary: string
  published: string
  updated: string
  authors: Array<{ name: string }>
  links: Array<{ href: string; rel: string; type?: string }>
  categories: Array<{ term: string }>
  'arxiv:primary_category'?: { term: string }
  'arxiv:doi'?: string
  'arxiv:comment'?: string
}

interface ArxivFeed {
  feed: {
    entry?: ArxivEntry | ArxivEntry[]
    'opensearch:totalResults': string
    'opensearch:startIndex': string
    'opensearch:itemsPerPage': string
  }
}

/**
 * arXiv category mapping for clean energy domains
 */
const DOMAIN_TO_ARXIV_CATEGORIES: Partial<Record<Domain, string[]>> = {
  'solar-energy': ['cond-mat.mtrl-sci', 'physics.app-ph', 'cond-mat.mes-hall'],
  'wind-energy': ['physics.flu-dyn', 'physics.app-ph'],
  'battery-storage': ['cond-mat.mtrl-sci', 'physics.chem-ph', 'cond-mat.str-el'],
  'hydrogen-fuel': ['physics.chem-ph', 'cond-mat.mtrl-sci', 'physics.app-ph'],
  'biomass': ['physics.bio-ph', 'cond-mat.soft', 'physics.chem-ph'],
  'geothermal': ['physics.geo-ph', 'physics.flu-dyn'],
  'carbon-capture': ['physics.chem-ph', 'physics.ao-ph', 'cond-mat.mtrl-sci'],
  'energy-efficiency': ['physics.app-ph', 'cond-mat.mtrl-sci'],
  'grid-optimization': ['physics.soc-ph', 'cs.SY', 'eess.SY'],
  'materials-science': ['cond-mat.mtrl-sci', 'cond-mat.str-el', 'cond-mat.supr-con'],
}

/**
 * arXiv adapter implementation
 */
export class ArxivAdapter extends BaseAdapter {
  readonly name: DataSourceName = 'arxiv'
  readonly domains: Domain[] = [
    'solar-energy',
    'wind-energy',
    'battery-storage',
    'hydrogen-fuel',
    'biomass',
    'geothermal',
    'carbon-capture',
    'energy-efficiency',
    'grid-optimization',
    'materials-science',
  ]

  constructor() {
    super({
      baseUrl: 'http://export.arxiv.org/api/query',
      requestsPerMinute: 20, // Be conservative with arXiv
      requestsPerDay: 2000,
      cacheTTL: 6 * 60 * 60 * 1000, // 6 hours (preprints update frequently)
    })
  }

  /**
   * Execute search query against arXiv API
   */
  protected async executeSearch(
    query: string,
    filters: SearchFilters = {}
  ): Promise<SearchResult> {
    const startTime = Date.now()

    try {
      const limit = Math.min(filters.limit || 25, 100)

      // Build arXiv query
      const arxivQuery = this.buildArxivQuery(query, filters)

      // Construct URL
      const url = new URL(this.baseUrl)
      url.searchParams.set('search_query', arxivQuery)
      url.searchParams.set('start', '0')
      url.searchParams.set('max_results', String(limit))
      url.searchParams.set('sortBy', 'relevance')
      url.searchParams.set('sortOrder', 'descending')

      console.log(`[${this.name}] Searching: ${query}`)
      console.log(`[${this.name}] Full query: ${arxivQuery}`)

      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/atom+xml',
        },
      })

      if (!response.ok) {
        throw new Error(`arXiv API error: HTTP ${response.status}`)
      }

      const xmlText = await response.text()
      const parsed = this.parseAtomXml(xmlText)

      const entries = this.normalizeEntries(parsed.feed.entry)
      const preprints = entries.map(entry => this.transformEntry(entry, query))

      const total = parseInt(parsed.feed['opensearch:totalResults'] || '0', 10)

      console.log(`[${this.name}] Found ${preprints.length} preprints (total: ${total})`)

      return {
        sources: preprints,
        total,
        searchTime: Date.now() - startTime,
        query,
        filters,
        from: this.name,
      }
    } catch (error) {
      console.error(`[${this.name}] Search failed:`, error)
      throw error
    }
  }

  /**
   * Build arXiv-specific query syntax
   */
  private buildArxivQuery(query: string, filters: SearchFilters): string {
    const parts: string[] = []

    // Main search in title and abstract
    // arXiv uses ti: for title, abs: for abstract, all: for all fields
    const sanitizedQuery = query.replace(/[()]/g, ' ').trim()
    parts.push(`all:${sanitizedQuery}`)

    // Add category filter if domains specified
    if (filters.domains && filters.domains.length > 0) {
      const categories: string[] = []
      for (const domain of filters.domains) {
        const domainCategories = DOMAIN_TO_ARXIV_CATEGORIES[domain]
        if (domainCategories) {
          categories.push(...domainCategories)
        }
      }
      if (categories.length > 0) {
        const uniqueCategories = [...new Set(categories)]
        const catQuery = uniqueCategories.map(c => `cat:${c}`).join(' OR ')
        parts.push(`(${catQuery})`)
      }
    }

    // Date filter - arXiv uses submittedDate
    if (filters.yearFrom || filters.yearTo) {
      const from = filters.yearFrom || 2000
      const to = filters.yearTo || new Date().getFullYear()
      // arXiv date format: YYYYMMDD
      parts.push(`submittedDate:[${from}0101 TO ${to}1231]`)
    }

    return parts.join(' AND ')
  }

  /**
   * Parse Atom XML response to JSON
   * Simple parser for arXiv's specific format
   */
  private parseAtomXml(xml: string): ArxivFeed {
    // Extract feed info
    const totalMatch = xml.match(/<opensearch:totalResults>(\d+)<\/opensearch:totalResults>/)
    const startMatch = xml.match(/<opensearch:startIndex>(\d+)<\/opensearch:startIndex>/)
    const itemsMatch = xml.match(/<opensearch:itemsPerPage>(\d+)<\/opensearch:itemsPerPage>/)

    const entries: ArxivEntry[] = []

    // Find all entry blocks
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
    let match

    while ((match = entryRegex.exec(xml)) !== null) {
      const entryXml = match[1]
      entries.push(this.parseEntry(entryXml))
    }

    return {
      feed: {
        entry: entries,
        'opensearch:totalResults': totalMatch?.[1] || '0',
        'opensearch:startIndex': startMatch?.[1] || '0',
        'opensearch:itemsPerPage': itemsMatch?.[1] || '0',
      },
    }
  }

  /**
   * Parse individual entry from XML
   */
  private parseEntry(xml: string): ArxivEntry {
    const getTagContent = (tag: string): string => {
      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)
      const match = xml.match(regex)
      return match ? match[1].trim() : ''
    }

    // Extract ID (format: http://arxiv.org/abs/1234.5678v1)
    const id = getTagContent('id')

    // Extract title (may have newlines)
    const title = getTagContent('title').replace(/\s+/g, ' ')

    // Extract summary/abstract
    const summary = getTagContent('summary').replace(/\s+/g, ' ')

    // Extract dates
    const published = getTagContent('published')
    const updated = getTagContent('updated')

    // Extract authors
    const authors: Array<{ name: string }> = []
    const authorRegex = /<author>\s*<name>([^<]+)<\/name>/g
    let authorMatch
    while ((authorMatch = authorRegex.exec(xml)) !== null) {
      authors.push({ name: authorMatch[1].trim() })
    }

    // Extract links
    const links: Array<{ href: string; rel: string; type?: string }> = []
    const linkRegex = /<link\s+([^>]+)\/>/g
    let linkMatch
    while ((linkMatch = linkRegex.exec(xml)) !== null) {
      const attrs = linkMatch[1]
      const hrefMatch = attrs.match(/href="([^"]+)"/)
      const relMatch = attrs.match(/rel="([^"]+)"/)
      const typeMatch = attrs.match(/type="([^"]+)"/)
      if (hrefMatch) {
        links.push({
          href: hrefMatch[1],
          rel: relMatch?.[1] || '',
          type: typeMatch?.[1],
        })
      }
    }

    // Extract categories
    const categories: Array<{ term: string }> = []
    const categoryRegex = /<category\s+[^>]*term="([^"]+)"[^>]*\/>/g
    let catMatch
    while ((catMatch = categoryRegex.exec(xml)) !== null) {
      categories.push({ term: catMatch[1] })
    }

    // Extract primary category
    const primaryCatMatch = xml.match(/<arxiv:primary_category[^>]*term="([^"]+)"[^>]*\/>/)

    // Extract DOI if present
    const doiMatch = xml.match(/<arxiv:doi>([^<]+)<\/arxiv:doi>/)

    return {
      id,
      title,
      summary,
      published,
      updated,
      authors,
      links,
      categories,
      'arxiv:primary_category': primaryCatMatch ? { term: primaryCatMatch[1] } : undefined,
      'arxiv:doi': doiMatch?.[1],
    }
  }

  /**
   * Normalize entries to array
   */
  private normalizeEntries(entry?: ArxivEntry | ArxivEntry[]): ArxivEntry[] {
    if (!entry) return []
    if (Array.isArray(entry)) return entry
    return [entry]
  }

  /**
   * Transform arXiv entry to our Preprint type
   */
  private transformEntry(entry: ArxivEntry, query: string): Preprint {
    // Extract arXiv ID from URL (format: http://arxiv.org/abs/1234.5678v1)
    const arxivIdMatch = entry.id.match(/abs\/(.+?)(?:v\d+)?$/)
    const arxivId = arxivIdMatch?.[1] || entry.id

    // Find PDF link
    const pdfLink = entry.links.find(l => l.type === 'application/pdf')
    const absLink = entry.links.find(l => l.rel === 'alternate')

    // Extract version number
    const versionMatch = entry.id.match(/v(\d+)$/)
    const version = versionMatch ? parseInt(versionMatch[1], 10) : 1

    // Get primary category
    const primaryCategory = entry['arxiv:primary_category']?.term || entry.categories[0]?.term

    return {
      id: `arxiv:${arxivId}`,
      title: entry.title,
      authors: entry.authors.map(a => a.name),
      abstract: entry.summary,
      url: absLink?.href || `https://arxiv.org/abs/${arxivId}`,
      doi: entry['arxiv:doi'],
      metadata: {
        source: this.name,
        sourceType: 'preprint',
        quality: 75, // Preprints are not peer-reviewed
        verificationStatus: 'preprint',
        accessType: 'open', // arXiv is always open access
        publicationDate: entry.published,
      },
      server: 'arxiv',
      category: primaryCategory,
      version,
      submittedDate: entry.published,
      publishedDate: entry.updated,
      relevanceScore: this.calculateRelevance(entry, query),
    }
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(entry: ArxivEntry, query: string): number {
    let score = 50 // Base score for arXiv papers

    // Boost for recent papers
    const publishedDate = new Date(entry.published)
    const yearsAgo = (Date.now() - publishedDate.getTime()) / (365 * 24 * 60 * 60 * 1000)

    if (yearsAgo <= 1) {
      score += 25
    } else if (yearsAgo <= 2) {
      score += 20
    } else if (yearsAgo <= 3) {
      score += 15
    } else if (yearsAgo <= 5) {
      score += 10
    }

    // Boost for title match
    const queryTerms = query.toLowerCase().split(/\s+/)
    const titleLower = entry.title.toLowerCase()
    const titleMatches = queryTerms.filter(term => term.length > 3 && titleLower.includes(term)).length
    score += Math.min((titleMatches / queryTerms.length) * 20, 20)

    // Boost for energy-related categories
    const energyCategories = ['cond-mat.mtrl-sci', 'physics.chem-ph', 'physics.app-ph']
    const hasEnergyCategory = entry.categories.some(c =>
      energyCategories.some(ec => c.term.startsWith(ec))
    )
    if (hasEnergyCategory) {
      score += 5
    }

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Get details for a specific arXiv paper
   */
  protected async executeGetDetails(id: string): Promise<Source | null> {
    try {
      // Extract arXiv ID from our format
      const arxivId = id.replace('arxiv:', '')

      const url = new URL(this.baseUrl)
      url.searchParams.set('id_list', arxivId)

      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/atom+xml',
        },
      })

      if (!response.ok) {
        throw new Error(`arXiv API error: HTTP ${response.status}`)
      }

      const xmlText = await response.text()
      const parsed = this.parseAtomXml(xmlText)

      const entries = this.normalizeEntries(parsed.feed.entry)
      if (entries.length === 0) {
        return null
      }

      return this.transformEntry(entries[0], '')
    } catch (error) {
      console.error(`[${this.name}] Failed to get details for ${id}:`, error)
      return null
    }
  }

  /**
   * Test if API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Simple test query
      const url = new URL(this.baseUrl)
      url.searchParams.set('search_query', 'all:solar cell')
      url.searchParams.set('max_results', '1')

      const response = await fetch(url.toString(), {
        headers: { 'Accept': 'application/atom+xml' },
      })

      return response.ok
    } catch (error) {
      console.error(`[${this.name}] Availability check failed:`, error)
      return false
    }
  }
}

/**
 * Create and export arXiv adapter instance
 */
export const arxivAdapter = new ArxivAdapter()
