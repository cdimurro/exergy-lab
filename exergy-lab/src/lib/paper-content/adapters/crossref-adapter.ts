/**
 * Crossref Content Adapter
 *
 * Fetches paper metadata via DOI resolution from Crossref.
 * Crossref is the authoritative source for DOI metadata.
 *
 * This is a Tier 2 source - provides metadata, rarely has PDF.
 */

import type { Source } from '@/types/sources'
import type { PaperContent, FetchContentOptions, Author, Reference } from '../types'
import { BaseContentAdapter } from './base-adapter'

/**
 * Crossref API response types
 */
interface CrossrefWork {
  DOI: string
  title?: string[]
  subtitle?: string[]
  abstract?: string
  'container-title'?: string[]
  volume?: string
  issue?: string
  page?: string
  published?: {
    'date-parts'?: number[][]
  }
  'published-print'?: {
    'date-parts'?: number[][]
  }
  'published-online'?: {
    'date-parts'?: number[][]
  }
  author?: Array<{
    given?: string
    family?: string
    name?: string
    ORCID?: string
    affiliation?: Array<{ name: string }>
  }>
  'is-referenced-by-count'?: number
  reference?: Array<{
    key?: string
    DOI?: string
    'article-title'?: string
    author?: string
    year?: string
    'journal-title'?: string
    unstructured?: string
  }>
  link?: Array<{
    URL: string
    'content-type'?: string
    'intended-application'?: string
  }>
  URL?: string
  type?: string
  ISSN?: string[]
  subject?: string[]
}

/**
 * Crossref adapter
 */
export class CrossrefAdapter extends BaseContentAdapter {
  source = 'crossref' as const
  canFetchFullContent = false
  canFetchPdf = true // Sometimes has PDF links

  private baseUrl = 'https://api.crossref.org/works'

  /**
   * Fetch paper content from Crossref
   */
  async fetchContent(
    paper: Source,
    options?: FetchContentOptions
  ): Promise<PaperContent> {
    const startTime = Date.now()
    const opts = this.mergeOptions(options)

    // Create base content
    const content = this.createBasePaperContent(paper)

    // Extract DOI
    const doi = this.extractDoi(paper)

    if (!doi) {
      content.availability = 'metadata_only'
      content.unavailableReason = 'api_error'
      content.fetchDurationMs = Date.now() - startTime
      return content
    }

    try {
      const work = await this.fetchWorkByDoi(doi, opts.timeout)

      if (!work) {
        content.availability = 'metadata_only'
        content.unavailableReason = 'api_error'
        content.fetchDurationMs = Date.now() - startTime
        return content
      }

      // Update content with Crossref data
      if (work.title && work.title.length > 0) {
        let title = work.title[0]
        if (work.subtitle && work.subtitle.length > 0) {
          title += ': ' + work.subtitle[0]
        }
        content.title = title
      }

      if (work.author && work.author.length > 0) {
        content.authors = work.author.map((a) => ({
          name: a.name || (a.given && a.family ? `${a.given} ${a.family}` : a.family || ''),
          orcid: a.ORCID,
          affiliations: a.affiliation?.map((aff) => aff.name),
        })).filter((a) => a.name)
      }

      if (work.abstract) {
        // Crossref abstract may have JATS tags
        content.abstract = this.cleanAbstract(work.abstract)
      }

      // Get publication date
      const dateInfo = work.published || work['published-print'] || work['published-online']
      if (dateInfo?.['date-parts']?.[0]) {
        const parts = dateInfo['date-parts'][0]
        if (parts.length >= 1) {
          const year = parts[0]
          const month = parts[1] ? String(parts[1]).padStart(2, '0') : '01'
          const day = parts[2] ? String(parts[2]).padStart(2, '0') : '01'
          content.publicationDate = `${year}-${month}-${day}`
        }
      }

      content.doi = work.DOI

      if (work['is-referenced-by-count'] !== undefined) {
        content.citationCount = work['is-referenced-by-count']
      }

      if (work['container-title'] && work['container-title'].length > 0) {
        content.journal = work['container-title'][0]
      }

      if (work.volume) {
        content.volume = work.volume
      }

      if (work.issue) {
        content.issue = work.issue
      }

      if (work.page) {
        content.pages = work.page
      }

      // Check for PDF link
      const pdfUrl = this.findPdfUrl(work)
      if (pdfUrl) {
        content.pdfUrl = pdfUrl
        content.pdfAvailable = true
      }

      // Add references if available
      if (work.reference && work.reference.length > 0 && opts.includeReferences) {
        content.references = work.reference.slice(0, 50).map((ref, index) => ({
          index: index + 1,
          text: ref.unstructured || this.formatReference(ref),
          doi: ref.DOI,
          title: ref['article-title'],
          year: ref.year,
        }))
      }

      // Set availability
      content.availability = content.abstract ? 'partial' : 'metadata_only'

    } catch (error) {
      console.error(`[crossref-adapter] Error:`, error)
      content.availability = 'metadata_only'
      content.unavailableReason = 'api_error'
    }

    content.fetchDurationMs = Date.now() - startTime
    return content
  }

  /**
   * Get PDF URL
   */
  getPdfUrl(paper: Source): string | null {
    const metadata = paper.metadata as unknown as Record<string, unknown>

    if (typeof metadata.pdfUrl === 'string') {
      return metadata.pdfUrl
    }

    return null
  }

  /**
   * Get external URL
   */
  getExternalUrl(paper: Source): string {
    const doi = this.extractDoi(paper)
    if (doi) {
      return `https://doi.org/${doi}`
    }
    return paper.url || ''
  }

  /**
   * Fetch work by DOI
   */
  private async fetchWorkByDoi(doi: string, timeout: number): Promise<CrossrefWork | null> {
    const url = `${this.baseUrl}/${encodeURIComponent(doi)}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ExergyLab/1.0 (mailto:research@exergylab.com; https://exergylab.com)',
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      return data.message as CrossrefWork
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  /**
   * Clean abstract (remove JATS tags)
   */
  private cleanAbstract(abstract: string): string {
    return abstract
      .replace(/<\/?jats:[^>]+>/g, '')  // Remove JATS tags
      .replace(/<\/?[^>]+>/g, '')       // Remove any HTML tags
      .replace(/\s+/g, ' ')              // Normalize whitespace
      .trim()
  }

  /**
   * Find PDF URL from links
   */
  private findPdfUrl(work: CrossrefWork): string | null {
    if (!work.link) return null

    // Look for PDF link
    const pdfLink = work.link.find((link) =>
      link['content-type'] === 'application/pdf' ||
      link.URL.toLowerCase().endsWith('.pdf')
    )

    if (pdfLink) {
      return pdfLink.URL
    }

    // Check for full-text link
    const fullTextLink = work.link.find((link) =>
      link['intended-application'] === 'text-mining' ||
      link['intended-application'] === 'syndication'
    )

    return fullTextLink?.URL || null
  }

  /**
   * Format reference for display
   */
  private formatReference(ref: {
    author?: string
    'article-title'?: string
    'journal-title'?: string
    year?: string
    DOI?: string
  }): string {
    const parts: string[] = []

    if (ref.author) {
      parts.push(ref.author)
    }

    if (ref.year) {
      parts.push(`(${ref.year})`)
    }

    if (ref['article-title']) {
      parts.push(ref['article-title'])
    }

    if (ref['journal-title']) {
      parts.push(ref['journal-title'])
    }

    if (ref.DOI) {
      parts.push(`DOI: ${ref.DOI}`)
    }

    return parts.join('. ')
  }
}
