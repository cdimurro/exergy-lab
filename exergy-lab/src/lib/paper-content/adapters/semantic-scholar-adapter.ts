/**
 * Semantic Scholar Content Adapter
 *
 * Fetches paper metadata and open access PDF when available.
 * Semantic Scholar doesn't provide full text, but often has PDF links.
 *
 * This is a Tier 2 source - provides metadata + PDF when available.
 */

import type { Source } from '@/types/sources'
import type { PaperContent, FetchContentOptions, Author, Reference } from '../types'
import { BaseContentAdapter } from './base-adapter'
import { parsePdfFromUrl, extractSectionsFromPdfText, cleanPdfText } from '../parsers/pdf-parser'

/**
 * Semantic Scholar API response types
 */
interface S2Paper {
  paperId: string
  corpusId?: number
  title?: string
  abstract?: string
  year?: number
  referenceCount?: number
  citationCount?: number
  influentialCitationCount?: number
  isOpenAccess?: boolean
  openAccessPdf?: {
    url: string
    status?: string
  }
  authors?: Array<{
    authorId?: string
    name: string
  }>
  publicationDate?: string
  journal?: {
    name?: string
    volume?: string
    pages?: string
  }
  externalIds?: {
    DOI?: string
    ArXiv?: string
    PubMed?: string
    PubMedCentral?: string
    DBLP?: string
    MAG?: string
    CorpusId?: number
  }
  s2FieldsOfStudy?: Array<{
    category: string
    source: string
  }>
  references?: Array<{
    paperId: string
    title?: string
    authors?: Array<{ name: string }>
    year?: number
    citationCount?: number
  }>
}

/**
 * Semantic Scholar adapter
 */
export class SemanticScholarAdapter extends BaseContentAdapter {
  source = 'semantic-scholar' as const
  canFetchFullContent = false
  canFetchPdf = true

  private apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY
  private baseUrl = 'https://api.semanticscholar.org/graph/v1'

  /**
   * Fetch paper content from Semantic Scholar
   */
  async fetchContent(
    paper: Source,
    options?: FetchContentOptions
  ): Promise<PaperContent> {
    const startTime = Date.now()
    const opts = this.mergeOptions(options)

    // Create base content
    const content = this.createBasePaperContent(paper)

    // Extract Semantic Scholar ID
    const s2Id = this.extractS2Id(paper)
    const doi = this.extractDoi(paper)

    try {
      let s2Paper: S2Paper | null = null

      // Fetch by S2 ID or DOI
      if (s2Id) {
        s2Paper = await this.fetchPaperById(s2Id, opts.timeout, opts.includeReferences)
      } else if (doi) {
        s2Paper = await this.fetchPaperByDoi(doi, opts.timeout, opts.includeReferences)
      }

      if (!s2Paper) {
        content.availability = 'metadata_only'
        content.unavailableReason = 'api_error'
        content.fetchDurationMs = Date.now() - startTime
        return content
      }

      // Update content with S2 data
      if (s2Paper.title) {
        content.title = s2Paper.title
      }

      if (s2Paper.authors && s2Paper.authors.length > 0) {
        content.authors = s2Paper.authors.map((a) => ({
          name: a.name,
        }))
      }

      if (s2Paper.abstract) {
        content.abstract = s2Paper.abstract
      }

      if (s2Paper.publicationDate) {
        content.publicationDate = s2Paper.publicationDate
      } else if (s2Paper.year) {
        content.publicationDate = `${s2Paper.year}`
      }

      if (s2Paper.citationCount !== undefined) {
        content.citationCount = s2Paper.citationCount
      }

      if (s2Paper.externalIds?.DOI) {
        content.doi = s2Paper.externalIds.DOI
      }

      if (s2Paper.journal?.name) {
        content.journal = s2Paper.journal.name
        if (s2Paper.journal.volume) {
          content.volume = s2Paper.journal.volume
        }
        if (s2Paper.journal.pages) {
          content.pages = s2Paper.journal.pages
        }
      }

      // Check for open access PDF
      if (s2Paper.openAccessPdf?.url) {
        content.pdfUrl = s2Paper.openAccessPdf.url
        content.pdfAvailable = true

        // Try to parse PDF for full content if requested
        if (opts.parsePdf) {
          try {
            const pdfContent = await this.parsePdfContent(s2Paper.openAccessPdf.url, opts.timeout)
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
            console.warn(`[semantic-scholar-adapter] PDF parsing failed:`, error)
          }
        }
      }

      // Add references if available
      if (s2Paper.references && s2Paper.references.length > 0 && opts.includeReferences) {
        content.references = s2Paper.references.slice(0, 50).map((ref, index) => ({
          index: index + 1,
          text: this.formatReference(ref),
          title: ref.title,
          authors: ref.authors?.map((a) => a.name),
          year: ref.year ? String(ref.year) : undefined,
        }))
      }

      // Set availability
      if (!content.availability || content.availability === 'metadata_only') {
        content.availability = content.abstract ? 'partial' : 'metadata_only'
      }

    } catch (error) {
      console.error(`[semantic-scholar-adapter] Error:`, error)
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

    // Check openAccessPdf
    if (metadata.openAccessPdf && typeof metadata.openAccessPdf === 'object') {
      const oaPdf = metadata.openAccessPdf as Record<string, unknown>
      if (typeof oaPdf.url === 'string') {
        return oaPdf.url
      }
    }

    // Check direct pdfUrl
    if (typeof metadata.pdfUrl === 'string') {
      return metadata.pdfUrl
    }

    return null
  }

  /**
   * Get external URL
   */
  getExternalUrl(paper: Source): string {
    const s2Id = this.extractS2Id(paper)
    if (s2Id) {
      return `https://www.semanticscholar.org/paper/${s2Id}`
    }

    // Fall back to DOI
    const doi = this.extractDoi(paper)
    if (doi) {
      return `https://doi.org/${doi}`
    }

    return paper.url || ''
  }

  /**
   * Fetch paper by Semantic Scholar ID
   */
  private async fetchPaperById(
    paperId: string,
    timeout: number,
    includeReferences: boolean
  ): Promise<S2Paper | null> {
    const fields = [
      'paperId',
      'corpusId',
      'title',
      'abstract',
      'year',
      'citationCount',
      'referenceCount',
      'isOpenAccess',
      'openAccessPdf',
      'authors',
      'publicationDate',
      'journal',
      'externalIds',
      's2FieldsOfStudy',
    ]

    if (includeReferences) {
      fields.push('references.paperId', 'references.title', 'references.authors', 'references.year')
    }

    const url = `${this.baseUrl}/paper/${paperId}?fields=${fields.join(',')}`
    return this.fetchFromApi(url, timeout)
  }

  /**
   * Fetch paper by DOI
   */
  private async fetchPaperByDoi(
    doi: string,
    timeout: number,
    includeReferences: boolean
  ): Promise<S2Paper | null> {
    return this.fetchPaperById(`DOI:${doi}`, timeout, includeReferences)
  }

  /**
   * Make API request
   */
  private async fetchFromApi(url: string, timeout: number): Promise<S2Paper | null> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'User-Agent': 'ExergyLab/1.0 (Research Platform)',
      }

      if (this.apiKey) {
        headers['x-api-key'] = this.apiKey
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
        if (response.status === 429) {
          console.warn(`[semantic-scholar-adapter] Rate limited`)
          throw new Error('Rate limited')
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
   * Extract Semantic Scholar ID
   */
  private extractS2Id(paper: Source): string | null {
    // Check paper ID
    if (paper.id.startsWith('ss:')) {
      return paper.id.replace('ss:', '')
    }

    // Check if paper ID is a S2 corpus ID (40-char hex)
    if (/^[a-f0-9]{40}$/i.test(paper.id)) {
      return paper.id
    }

    // Check metadata
    const metadata = paper.metadata as unknown as Record<string, unknown>
    if (typeof metadata.paperId === 'string') {
      return metadata.paperId
    }
    if (typeof metadata.s2Id === 'string') {
      return metadata.s2Id
    }

    // Check URL
    if (paper.url) {
      const match = paper.url.match(/semanticscholar\.org\/paper\/(?:[^\/]+\/)?([a-f0-9]{40})/i)
      if (match) {
        return match[1]
      }
    }

    return null
  }

  /**
   * Format reference for display
   */
  private formatReference(ref: {
    title?: string
    authors?: Array<{ name: string }>
    year?: number
  }): string {
    const parts: string[] = []

    if (ref.authors && ref.authors.length > 0) {
      const authorStr = ref.authors.slice(0, 3).map((a) => a.name).join(', ')
      parts.push(authorStr + (ref.authors.length > 3 ? ' et al.' : ''))
    }

    if (ref.year) {
      parts.push(`(${ref.year})`)
    }

    if (ref.title) {
      parts.push(ref.title)
    }

    return parts.join('. ')
  }
}
