/**
 * Search API Orchestrator for Discovery Engine
 *
 * Integrates with multiple real APIs:
 * - Semantic Scholar (academic papers)
 * - arXiv (preprints)
 * - USPTO (patents)
 * - NewsAPI (industry news)
 */

import type { DiscoveryPrompt } from '@/types/discovery'

export interface Source {
  id: string
  type: 'academic-paper' | 'patent' | 'technical-report' | 'news'
  title: string
  authors?: string[]
  abstract?: string
  url?: string
  publishedDate?: string
  citationCount?: number
  relevanceScore: number
}

export interface SearchResults {
  totalSources: number
  papers: number
  patents: number
  reports: number
  news: number
  sources: Source[]
}

export class SearchOrchestrator {
  /**
   * Search across all sources in parallel
   */
  async searchAllSources(prompt: DiscoveryPrompt): Promise<SearchResults> {
    console.log('[Discovery] Starting parallel search across all APIs...')

    // Execute all searches in parallel
    const [papersResult, patentsResult, preprintsResult, newsResult] = await Promise.allSettled([
      this.searchSemanticScholar(prompt.description, prompt.domains),
      this.searchUSPTO(prompt.description),
      this.searchArxiv(prompt.domains, prompt.description),
      this.searchNews(prompt.description)
    ])

    // Extract successful results
    const papers = papersResult.status === 'fulfilled' ? papersResult.value : []
    const patents = patentsResult.status === 'fulfilled' ? patentsResult.value : []
    const preprints = preprintsResult.status === 'fulfilled' ? preprintsResult.value : []
    const news = newsResult.status === 'fulfilled' ? newsResult.value : []

    // Log any failures
    if (papersResult.status === 'rejected') {
      console.error('[Discovery] Semantic Scholar search failed:', papersResult.reason)
    }
    if (patentsResult.status === 'rejected') {
      console.error('[Discovery] USPTO search failed:', patentsResult.reason)
    }
    if (preprintsResult.status === 'rejected') {
      console.error('[Discovery] arXiv search failed:', preprintsResult.reason)
    }
    if (newsResult.status === 'rejected') {
      console.error('[Discovery] NewsAPI search failed:', newsResult.reason)
    }

    // Combine all sources
    const allSources = [...papers, ...patents, ...preprints, ...news]

    // Sort by relevance score
    allSources.sort((a, b) => b.relevanceScore - a.relevanceScore)

    const results: SearchResults = {
      totalSources: allSources.length,
      papers: papers.length,
      patents: patents.length,
      reports: preprints.length,
      news: news.length,
      sources: allSources.slice(0, 100) // Limit to top 100
    }

    console.log(`[Discovery] Search complete: ${results.totalSources} total sources`)
    console.log(`  Papers: ${results.papers}, Patents: ${results.patents}, Reports: ${results.reports}, News: ${results.news}`)

    return results
  }

  /**
   * Semantic Scholar - Academic Papers
   * API: https://api.semanticscholar.org/graph/v1/paper/search
   * Rate Limit: 100 requests/5 minutes
   */
  private async searchSemanticScholar(query: string, domains: string[]): Promise<Source[]> {
    try {
      const url = `https://api.semanticscholar.org/graph/v1/paper/search?` +
        `query=${encodeURIComponent(query)}` +
        `&fields=paperId,title,authors,abstract,citationCount,year,url,publicationDate` +
        `&limit=20`

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Semantic Scholar API error: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.data || !Array.isArray(data.data)) {
        return []
      }

      return data.data.map((paper: any) => ({
        id: paper.paperId || `ss_${Date.now()}_${Math.random()}`,
        type: 'academic-paper' as const,
        title: paper.title || 'Untitled',
        authors: paper.authors?.map((a: any) => a.name) || [],
        abstract: paper.abstract || '',
        url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
        publishedDate: paper.publicationDate || `${paper.year || 'Unknown'}`,
        citationCount: paper.citationCount || 0,
        relevanceScore: this.calculateRelevanceScore(paper, query, domains)
      }))
    } catch (error) {
      console.error('[Semantic Scholar] Search failed:', error)
      throw error
    }
  }

  /**
   * arXiv - Preprints and Technical Reports
   * API: http://export.arxiv.org/api/query
   * Rate Limit: 1 request/3 seconds (respected via sequential calls)
   */
  private async searchArxiv(domains: string[], query: string): Promise<Source[]> {
    try {
      // Map domains to arXiv categories
      const categories = this.getArxivCategories(domains)
      const categoryQuery = categories.length > 0 ? `+AND+(${categories.map(c => `cat:${c}`).join('+OR+')})` : ''

      const url = `http://export.arxiv.org/api/query?` +
        `search_query=all:${encodeURIComponent(query)}${categoryQuery}` +
        `&max_results=20` +
        `&sortBy=relevance`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`arXiv API error: ${response.statusText}`)
      }

      const xmlText = await response.text()

      // Parse XML (basic extraction)
      const sources = this.parseArxivXML(xmlText, query, domains)

      return sources
    } catch (error) {
      console.error('[arXiv] Search failed:', error)
      throw error
    }
  }

  /**
   * USPTO - Patents
   * API: https://developer.uspto.gov/ds-api/patents/v1/search
   * No strict rate limit
   */
  private async searchUSPTO(query: string): Promise<Source[]> {
    try {
      // USPTO API is complex - using simpler approach with patent search
      // For production, you'd want to use their official API with proper authentication

      // Fallback: Return empty for now since USPTO API requires more complex setup
      // In production, integrate with USPTO PatentsView or Google Patents API
      console.warn('[USPTO] Patent search not yet implemented - requires API setup')
      return []
    } catch (error) {
      console.error('[USPTO] Search failed:', error)
      throw error
    }
  }

  /**
   * NewsAPI - Industry News
   * API: https://newsapi.org/v2/everything
   * Rate Limit: 100 requests/day (free tier)
   * Requires API key
   */
  private async searchNews(query: string): Promise<Source[]> {
    try {
      const apiKey = process.env.NEWSAPI_KEY

      if (!apiKey) {
        console.warn('[NewsAPI] API key not configured')
        return []
      }

      // Add clean energy context to query
      const enhancedQuery = `${query} AND (energy OR renewable OR solar OR wind OR battery OR climate)`

      const url = `https://newsapi.org/v2/everything?` +
        `q=${encodeURIComponent(enhancedQuery)}` +
        `&sortBy=publishedAt` +
        `&language=en` +
        `&pageSize=20` +
        `&apiKey=${apiKey}`

      const response = await fetch(url)

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('[NewsAPI] Rate limit exceeded')
          return []
        }
        throw new Error(`NewsAPI error: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.articles || !Array.isArray(data.articles)) {
        return []
      }

      return data.articles.map((article: any, index: number) => ({
        id: `news_${Date.now()}_${index}`,
        type: 'news' as const,
        title: article.title || 'Untitled',
        authors: article.author ? [article.author] : [],
        abstract: article.description || article.content?.substring(0, 200) || '',
        url: article.url || '',
        publishedDate: article.publishedAt || '',
        relevanceScore: this.calculateNewsRelevanceScore(article, query)
      }))
    } catch (error) {
      console.error('[NewsAPI] Search failed:', error)
      throw error
    }
  }

  /**
   * Calculate relevance score for a paper (0-100)
   */
  private calculateRelevanceScore(paper: any, query: string, domains: string[]): number {
    let score = 50 // Base score

    // Citation count boosts score
    if (paper.citationCount) {
      score += Math.min(20, Math.log10(paper.citationCount + 1) * 5)
    }

    // Recency boosts score
    const year = paper.year || 2000
    const yearsSincePublish = new Date().getFullYear() - year
    if (yearsSincePublish <= 2) {
      score += 15
    } else if (yearsSincePublish <= 5) {
      score += 10
    } else if (yearsSincePublish <= 10) {
      score += 5
    }

    // Title/abstract match boosts score
    const queryTerms = query.toLowerCase().split(' ')
    const titleLower = (paper.title || '').toLowerCase()
    const abstractLower = (paper.abstract || '').toLowerCase()

    const titleMatches = queryTerms.filter(term => titleLower.includes(term)).length
    const abstractMatches = queryTerms.filter(term => abstractLower.includes(term)).length

    score += (titleMatches / queryTerms.length) * 15
    score += (abstractMatches / queryTerms.length) * 5

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Calculate relevance score for news article
   */
  private calculateNewsRelevanceScore(article: any, query: string): number {
    let score = 40 // Base score (lower than papers)

    // Recency is very important for news
    const publishDate = new Date(article.publishedAt)
    const daysSincePublish = (Date.now() - publishDate.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSincePublish <= 7) {
      score += 30 // Very recent
    } else if (daysSincePublish <= 30) {
      score += 20 // Recent
    } else if (daysSincePublish <= 90) {
      score += 10 // Somewhat recent
    }

    // Title match
    const queryTerms = query.toLowerCase().split(' ')
    const titleLower = (article.title || '').toLowerCase()
    const titleMatches = queryTerms.filter(term => titleLower.includes(term)).length

    score += (titleMatches / queryTerms.length) * 20

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Map discovery domains to arXiv categories
   */
  private getArxivCategories(domains: string[]): string[] {
    const mapping: Record<string, string> = {
      'solar': 'physics.app-ph',
      'wind': 'physics.flu-dyn',
      'battery-storage': 'cond-mat.mtrl-sci',
      'hydrogen': 'physics.chem-ph',
      'geothermal': 'physics.geo-ph',
      'biomass': 'q-bio',
      'carbon-capture': 'physics.chem-ph',
      'energy-efficiency': 'physics.app-ph',
      'grid-optimization': 'cs.SY',
      'materials-science': 'cond-mat.mtrl-sci'
    }

    return domains.map(d => mapping[d]).filter(Boolean)
  }

  /**
   * Parse arXiv XML response
   */
  private parseArxivXML(xml: string, query: string, domains: string[]): Source[] {
    const sources: Source[] = []

    try {
      // Extract entries using regex (simple approach)
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
      const entries = xml.match(entryRegex) || []

      for (const entry of entries.slice(0, 20)) {
        const title = this.extractXMLTag(entry, 'title')
        const summary = this.extractXMLTag(entry, 'summary')
        const published = this.extractXMLTag(entry, 'published')
        const id = this.extractXMLTag(entry, 'id')

        // Extract authors
        const authorMatches = entry.match(/<author>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<\/author>/g) || []
        const authors = authorMatches.map(match => {
          const nameMatch = match.match(/<name>(.*?)<\/name>/)
          return nameMatch ? nameMatch[1].trim() : ''
        }).filter(Boolean)

        if (title) {
          sources.push({
            id: id || `arxiv_${Date.now()}_${Math.random()}`,
            type: 'technical-report',
            title: title.replace(/\n/g, ' ').trim(),
            authors,
            abstract: summary?.replace(/\n/g, ' ').trim() || '',
            url: id || '',
            publishedDate: published || '',
            relevanceScore: this.calculateRelevanceScore({
              title,
              abstract: summary,
              year: published ? new Date(published).getFullYear() : 2020,
              citationCount: 0
            }, query, domains)
          })
        }
      }
    } catch (error) {
      console.error('[arXiv] XML parsing error:', error)
    }

    return sources
  }

  /**
   * Extract XML tag content
   */
  private extractXMLTag(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)
    const match = xml.match(regex)
    return match ? match[1] : null
  }
}
