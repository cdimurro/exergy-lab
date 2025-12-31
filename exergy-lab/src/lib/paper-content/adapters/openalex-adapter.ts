/**
 * OpenAlex Content Adapter
 *
 * Fetches paper metadata and open access locations from OpenAlex.
 * OpenAlex provides comprehensive metadata and OA links.
 *
 * This is a Tier 2 source - provides metadata + PDF when available.
 */

import type { Source } from '@/types/sources'
import type { PaperContent, FetchContentOptions, Author } from '../types'
import { BaseContentAdapter } from './base-adapter'
import { parsePdfFromUrl, extractSectionsFromPdfText, cleanPdfText } from '../parsers/pdf-parser'

/**
 * OpenAlex API response types
 */
interface OpenAlexWork {
  id: string
  doi?: string
  title?: string
  display_name?: string
  publication_year?: number
  publication_date?: string
  type?: string
  cited_by_count?: number
  is_oa?: boolean
  open_access?: {
    is_oa: boolean
    oa_status?: string
    oa_url?: string
    any_repository_has_fulltext?: boolean
  }
  authorships?: Array<{
    author: {
      id: string
      display_name: string
      orcid?: string
    }
    institutions?: Array<{
      display_name: string
    }>
    author_position?: string
  }>
  primary_location?: {
    source?: {
      display_name?: string
    }
    pdf_url?: string
    landing_page_url?: string
  }
  best_oa_location?: {
    pdf_url?: string
    landing_page_url?: string
    version?: string
    license?: string
  }
  abstract_inverted_index?: Record<string, number[]>
  biblio?: {
    volume?: string
    issue?: string
    first_page?: string
    last_page?: string
  }
  locations?: Array<{
    pdf_url?: string
    landing_page_url?: string
    is_oa?: boolean
  }>
}

/**
 * OpenAlex adapter
 */
export class OpenAlexAdapter extends BaseContentAdapter {
  source = 'openalex' as const
  canFetchFullContent = false
  canFetchPdf = true

  private baseUrl = 'https://api.openalex.org'

  /**
   * Fetch paper content from OpenAlex
   */
  async fetchContent(
    paper: Source,
    options?: FetchContentOptions
  ): Promise<PaperContent> {
    const startTime = Date.now()
    const opts = this.mergeOptions(options)

    // Create base content
    const content = this.createBasePaperContent(paper)

    // Extract OpenAlex ID or DOI
    const oaId = this.extractOpenAlexId(paper)
    const doi = this.extractDoi(paper)

    try {
      let work: OpenAlexWork | null = null

      // Fetch by OpenAlex ID or DOI
      if (oaId) {
        work = await this.fetchWorkById(oaId, opts.timeout)
      } else if (doi) {
        work = await this.fetchWorkByDoi(doi, opts.timeout)
      }

      if (!work) {
        content.availability = 'metadata_only'
        content.unavailableReason = 'api_error'
        content.fetchDurationMs = Date.now() - startTime
        return content
      }

      // Update content with OpenAlex data
      content.title = work.display_name || work.title || content.title

      if (work.authorships && work.authorships.length > 0) {
        content.authors = work.authorships.map((auth) => ({
          name: auth.author.display_name,
          orcid: auth.author.orcid,
          affiliations: auth.institutions?.map((i) => i.display_name),
        }))
      }

      // Reconstruct abstract from inverted index
      if (work.abstract_inverted_index) {
        content.abstract = this.reconstructAbstract(work.abstract_inverted_index)
      }

      if (work.publication_date) {
        content.publicationDate = work.publication_date
      } else if (work.publication_year) {
        content.publicationDate = `${work.publication_year}`
      }

      if (work.doi) {
        content.doi = work.doi.replace('https://doi.org/', '')
      }

      if (work.cited_by_count !== undefined) {
        content.citationCount = work.cited_by_count
      }

      if (work.primary_location?.source?.display_name) {
        content.journal = work.primary_location.source.display_name
      }

      if (work.biblio) {
        if (work.biblio.volume) {
          content.volume = work.biblio.volume
        }
        if (work.biblio.issue) {
          content.issue = work.biblio.issue
        }
        if (work.biblio.first_page) {
          content.pages = work.biblio.last_page
            ? `${work.biblio.first_page}-${work.biblio.last_page}`
            : work.biblio.first_page
        }
      }

      // Find best PDF URL
      const pdfUrl = this.findBestPdfUrl(work)
      if (pdfUrl) {
        content.pdfUrl = pdfUrl
        content.pdfAvailable = true

        // Try to parse PDF for full content if requested
        if (opts.parsePdf) {
          try {
            const pdfContent = await this.parsePdfContent(pdfUrl, opts.timeout)
            if (pdfContent) {
              if (pdfContent.sections.length > 0) {
                content.sections = pdfContent.sections
              }
              if (pdfContent.fullText) {
                content.fullText = pdfContent.fullText
              }
              content.availability = pdfContent.sections.length > 0 ? 'partial' : 'metadata_only'
            }
          } catch (error) {
            console.warn(`[openalex-adapter] PDF parsing failed:`, error)
          }
        }
      }

      // Set availability
      if (!content.availability || content.availability === 'metadata_only') {
        content.availability = content.abstract ? 'partial' : 'metadata_only'
      }

    } catch (error) {
      console.error(`[openalex-adapter] Error:`, error)
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

    if (metadata.open_access && typeof metadata.open_access === 'object') {
      const oa = metadata.open_access as Record<string, unknown>
      if (typeof oa.oa_url === 'string') {
        return oa.oa_url
      }
    }

    return null
  }

  /**
   * Get external URL
   */
  getExternalUrl(paper: Source): string {
    const oaId = this.extractOpenAlexId(paper)
    if (oaId) {
      return `https://openalex.org/works/${oaId}`
    }

    const doi = this.extractDoi(paper)
    if (doi) {
      return `https://doi.org/${doi}`
    }

    return paper.url || ''
  }

  /**
   * Fetch work by OpenAlex ID
   */
  private async fetchWorkById(workId: string, timeout: number): Promise<OpenAlexWork | null> {
    // Ensure proper format (W prefix)
    const id = workId.startsWith('W') ? workId : `W${workId}`
    const url = `${this.baseUrl}/works/${id}`
    return this.fetchFromApi(url, timeout)
  }

  /**
   * Fetch work by DOI
   */
  private async fetchWorkByDoi(doi: string, timeout: number): Promise<OpenAlexWork | null> {
    const url = `${this.baseUrl}/works/https://doi.org/${doi}`
    return this.fetchFromApi(url, timeout)
  }

  /**
   * Make API request
   */
  private async fetchFromApi(url: string, timeout: number): Promise<OpenAlexWork | null> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ExergyLab/1.0 (mailto:research@exergylab.com)',
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  /**
   * Reconstruct abstract from inverted index
   */
  private reconstructAbstract(invertedIndex: Record<string, number[]>): string {
    const words: Array<{ word: string; position: number }> = []

    for (const [word, positions] of Object.entries(invertedIndex)) {
      for (const position of positions) {
        words.push({ word, position })
      }
    }

    // Sort by position
    words.sort((a, b) => a.position - b.position)

    return words.map((w) => w.word).join(' ')
  }

  /**
   * Find best PDF URL from work data
   */
  private findBestPdfUrl(work: OpenAlexWork): string | null {
    // Best OA location first
    if (work.best_oa_location?.pdf_url) {
      return work.best_oa_location.pdf_url
    }

    // Primary location
    if (work.primary_location?.pdf_url) {
      return work.primary_location.pdf_url
    }

    // Open access URL
    if (work.open_access?.oa_url) {
      return work.open_access.oa_url
    }

    // Check all locations for PDF
    if (work.locations) {
      for (const loc of work.locations) {
        if (loc.pdf_url) {
          return loc.pdf_url
        }
      }
    }

    return null
  }

  /**
   * Parse PDF content
   */
  private async parsePdfContent(
    pdfUrl: string,
    timeout: number
  ): Promise<{ sections: any[]; fullText: string } | null> {
    try {
      const result = await parsePdfFromUrl(pdfUrl, { timeout })
      const cleanedText = cleanPdfText(result.text)
      const sections = extractSectionsFromPdfText(cleanedText)

      return {
        sections,
        fullText: cleanedText,
      }
    } catch (error) {
      return null
    }
  }

  /**
   * Extract OpenAlex ID
   */
  private extractOpenAlexId(paper: Source): string | null {
    // Check paper ID
    if (paper.id.startsWith('oa:')) {
      return paper.id.replace('oa:', '')
    }
    if (paper.id.startsWith('W')) {
      return paper.id
    }

    // Check metadata
    const metadata = paper.metadata as unknown as Record<string, unknown>
    if (typeof metadata.openAlexId === 'string') {
      return metadata.openAlexId
    }

    // Check URL
    if (paper.url) {
      const match = paper.url.match(/openalex\.org\/works\/(W\d+)/i)
      if (match) {
        return match[1]
      }
    }

    return null
  }
}
