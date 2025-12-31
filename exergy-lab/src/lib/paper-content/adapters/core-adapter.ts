/**
 * CORE Content Adapter
 *
 * Fetches full paper content from CORE (core.ac.uk).
 * CORE provides fullText directly in API responses for many papers.
 *
 * This is a Tier 1 source - often has full text available.
 */

import type { Source } from '@/types/sources'
import type { PaperContent, FetchContentOptions, Author } from '../types'
import { BaseContentAdapter } from './base-adapter'
import { parseCoreFullText } from '../parsers/markdown-parser'

/**
 * CORE API response types
 */
interface CoreWork {
  id: number
  doi?: string
  title?: string
  authors?: Array<{ name: string }>
  abstract?: string
  fullText?: string
  publishedDate?: string
  yearPublished?: number
  downloadUrl?: string
  sourceFulltextUrls?: string[]
  links?: Array<{ type: string; url: string }>
  citationCount?: number
  oai?: string
  repositories?: Array<{
    name: string
    uri?: string
  }>
}

/**
 * CORE adapter - provides full text when available
 */
export class CoreAdapter extends BaseContentAdapter {
  source = 'core' as const
  canFetchFullContent = true
  canFetchPdf = true

  private apiKey = process.env.CORE_API_KEY

  /**
   * Fetch paper content from CORE
   */
  async fetchContent(
    paper: Source,
    options?: FetchContentOptions
  ): Promise<PaperContent> {
    const startTime = Date.now()
    const opts = this.mergeOptions(options)

    // Extract CORE ID or use DOI
    const coreId = this.extractCoreId(paper)
    const doi = this.extractDoi(paper)

    // Create base content
    const content = this.createBasePaperContent(paper)

    try {
      let coreWork: CoreWork | null = null

      // Try to fetch by CORE ID first
      if (coreId) {
        coreWork = await this.fetchWorkById(coreId, opts.timeout)
      }

      // Fall back to DOI search if no CORE ID
      if (!coreWork && doi) {
        coreWork = await this.fetchWorkByDoi(doi, opts.timeout)
      }

      if (!coreWork) {
        content.availability = 'metadata_only'
        content.unavailableReason = 'api_error'
        content.fetchDurationMs = Date.now() - startTime
        return content
      }

      // Update content with CORE data
      if (coreWork.title) {
        content.title = coreWork.title
      }

      if (coreWork.authors && coreWork.authors.length > 0) {
        content.authors = coreWork.authors.map((a) => ({
          name: a.name,
        }))
      }

      if (coreWork.abstract) {
        content.abstract = coreWork.abstract
      }

      if (coreWork.publishedDate) {
        content.publicationDate = coreWork.publishedDate
      } else if (coreWork.yearPublished) {
        content.publicationDate = `${coreWork.yearPublished}`
      }

      if (coreWork.doi) {
        content.doi = coreWork.doi
      }

      if (coreWork.citationCount !== undefined) {
        content.citationCount = coreWork.citationCount
      }

      // Get PDF URL
      const pdfUrl = this.findPdfUrl(coreWork)
      if (pdfUrl) {
        content.pdfUrl = pdfUrl
        content.pdfAvailable = true
      }

      // Check for full text
      if (coreWork.fullText && coreWork.fullText.length > 500) {
        // Parse full text into sections
        const parsed = parseCoreFullText(coreWork.fullText)

        if (parsed.sections.length > 0) {
          content.sections = parsed.sections
        }

        if (parsed.references.length > 0 && opts.includeReferences) {
          content.references = parsed.references
        }

        // Store full text
        content.fullText = coreWork.fullText

        // If we have abstract from full text parsing, use it
        if (parsed.abstract && (!content.abstract || content.abstract.length < parsed.abstract.length)) {
          content.abstract = parsed.abstract
        }

        content.availability = 'full'
      } else {
        content.availability = content.abstract ? 'partial' : 'metadata_only'
      }

    } catch (error) {
      console.error(`[core-adapter] Error fetching content:`, error)
      content.availability = 'metadata_only'
      content.unavailableReason = 'api_error'
    }

    content.fetchDurationMs = Date.now() - startTime
    return content
  }

  /**
   * Get PDF URL from CORE
   */
  getPdfUrl(paper: Source): string | null {
    // Try to get from metadata if we already fetched
    const metadata = paper.metadata as unknown as Record<string, unknown>
    if (typeof metadata.pdfUrl === 'string') {
      return metadata.pdfUrl
    }
    if (typeof metadata.downloadUrl === 'string') {
      return metadata.downloadUrl
    }

    return null
  }

  /**
   * Get external URL for CORE paper
   */
  getExternalUrl(paper: Source): string {
    const coreId = this.extractCoreId(paper)
    if (coreId) {
      return `https://core.ac.uk/works/${coreId}`
    }

    // Fall back to DOI resolver
    const doi = this.extractDoi(paper)
    if (doi) {
      return `https://doi.org/${doi}`
    }

    return paper.url || ''
  }

  /**
   * Fetch work by CORE ID
   */
  private async fetchWorkById(coreId: string, timeout: number): Promise<CoreWork | null> {
    const url = `https://api.core.ac.uk/v3/works/${coreId}`
    return this.fetchFromApi(url, timeout)
  }

  /**
   * Fetch work by DOI
   */
  private async fetchWorkByDoi(doi: string, timeout: number): Promise<CoreWork | null> {
    // Search for work by DOI
    const encodedDoi = encodeURIComponent(doi)
    const url = `https://api.core.ac.uk/v3/search/works?q=doi:"${encodedDoi}"&limit=1`

    try {
      const searchResult = await this.fetchFromApi<{ results: CoreWork[] }>(url, timeout)
      if (searchResult && searchResult.results && searchResult.results.length > 0) {
        return searchResult.results[0]
      }
    } catch (error) {
      console.warn(`[core-adapter] DOI search failed:`, error)
    }

    return null
  }

  /**
   * Make API request to CORE
   */
  private async fetchFromApi<T = CoreWork>(url: string, timeout: number): Promise<T | null> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'User-Agent': 'ExergyLab/1.0 (Research Platform)',
      }

      // Add API key if available
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`
      }

      const response = await fetch(url, {
        signal: controller.signal,
        headers,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`CORE API error: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('CORE API request timed out')
      }
      throw error
    }
  }

  /**
   * Extract CORE ID from paper
   */
  private extractCoreId(paper: Source): string | null {
    // Check paper ID
    if (paper.id.startsWith('core:')) {
      return paper.id.replace('core:', '')
    }

    // Check if paper ID is a numeric CORE ID
    if (/^\d+$/.test(paper.id)) {
      return paper.id
    }

    // Check metadata
    const metadata = paper.metadata as unknown as Record<string, unknown>
    if (typeof metadata.coreId === 'string') {
      return metadata.coreId
    }
    if (typeof metadata.coreId === 'number') {
      return String(metadata.coreId)
    }

    // Check URL for CORE ID
    if (paper.url) {
      const match = paper.url.match(/core\.ac\.uk\/(?:works|display)\/(\d+)/i)
      if (match) {
        return match[1]
      }
    }

    return null
  }

  /**
   * Find best PDF URL from CORE work data
   */
  private findPdfUrl(work: CoreWork): string | null {
    // Direct download URL
    if (work.downloadUrl) {
      return work.downloadUrl
    }

    // Source fulltext URLs
    if (work.sourceFulltextUrls && work.sourceFulltextUrls.length > 0) {
      // Prefer PDF URLs
      const pdfUrl = work.sourceFulltextUrls.find((url) =>
        url.toLowerCase().endsWith('.pdf')
      )
      if (pdfUrl) return pdfUrl

      // Return first available
      return work.sourceFulltextUrls[0]
    }

    // Links array
    if (work.links) {
      const pdfLink = work.links.find((link) =>
        link.type === 'download' || link.url.toLowerCase().endsWith('.pdf')
      )
      if (pdfLink) return pdfLink.url
    }

    return null
  }
}
