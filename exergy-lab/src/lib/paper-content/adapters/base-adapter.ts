/**
 * Base Content Adapter
 *
 * Abstract base class for all source-specific content adapters.
 * Provides common functionality and enforces the adapter interface.
 */

import type { DataSourceName, Source } from '@/types/sources'
import type {
  ContentAdapter,
  PaperContent,
  FetchContentOptions,
  Author,
  ContentAvailability,
  ContentUnavailableReason,
} from '../types'
import { SOURCE_DISPLAY_NAMES, extractExternalIds } from '../types'

/**
 * Default fetch options
 */
const DEFAULT_OPTIONS: Required<FetchContentOptions> = {
  parsePdf: true,
  includeReferences: true,
  includeFigures: true,
  timeout: 30000,
}

/**
 * Abstract base class for content adapters
 */
export abstract class BaseContentAdapter implements ContentAdapter {
  abstract source: DataSourceName
  abstract canFetchFullContent: boolean
  abstract canFetchPdf: boolean

  get sourceDisplay(): string {
    return SOURCE_DISPLAY_NAMES[this.source] || this.source
  }

  /**
   * Main fetch method - must be implemented by subclasses
   */
  abstract fetchContent(
    paper: Source,
    options?: FetchContentOptions
  ): Promise<PaperContent>

  /**
   * Get PDF URL - must be implemented by subclasses
   */
  abstract getPdfUrl(paper: Source): string | null

  /**
   * Get external URL - must be implemented by subclasses
   */
  abstract getExternalUrl(paper: Source): string

  /**
   * Merge options with defaults
   */
  protected mergeOptions(options?: FetchContentOptions): Required<FetchContentOptions> {
    return { ...DEFAULT_OPTIONS, ...options }
  }

  /**
   * Create a base paper content object from a Source
   * Subclasses can extend this with additional data
   */
  protected createBasePaperContent(
    paper: Source,
    availability: ContentAvailability = 'metadata_only',
    unavailableReason?: ContentUnavailableReason
  ): PaperContent {
    const externalIds = extractExternalIds(paper)

    return {
      // Metadata
      title: paper.title,
      authors: this.parseAuthors(paper.authors),
      abstract: paper.abstract || '',
      publicationDate: paper.metadata.publicationDate,
      doi: externalIds.doi || paper.doi,
      citationCount: paper.metadata.citationCount,

      // Source information
      source: this.source,
      sourceDisplay: this.sourceDisplay,
      sourceId: paper.id,

      // Content availability
      availability,
      unavailableReason,

      // PDF access
      pdfUrl: this.getPdfUrl(paper) || undefined,
      pdfAvailable: this.getPdfUrl(paper) !== null,

      // External access
      externalUrl: this.getExternalUrl(paper),

      // Fetch metadata
      fetchedAt: new Date(),
    }
  }

  /**
   * Parse author strings into Author objects
   */
  protected parseAuthors(authors?: string[]): Author[] {
    if (!authors || authors.length === 0) {
      return []
    }

    return authors.map((name) => ({
      name: name.trim(),
    }))
  }

  /**
   * Extract arXiv ID from various formats
   */
  protected extractArxivId(paper: Source): string | null {
    const ids = extractExternalIds(paper)
    if (ids.arxivId) {
      return ids.arxivId
    }

    // Check URL
    if (paper.url) {
      const match = paper.url.match(/arxiv\.org\/(?:abs|pdf)\/(\d+\.\d+)/i)
      if (match) {
        return match[1]
      }
    }

    return null
  }

  /**
   * Extract DOI from various formats
   */
  protected extractDoi(paper: Source): string | null {
    const ids = extractExternalIds(paper)
    if (ids.doi) {
      return ids.doi
    }

    // Check URL for DOI
    if (paper.url) {
      const match = paper.url.match(/doi\.org\/(10\.\d+\/[^\s]+)/i)
      if (match) {
        return match[1]
      }
    }

    return null
  }

  /**
   * Extract PMID from various formats
   */
  protected extractPmid(paper: Source): string | null {
    const ids = extractExternalIds(paper)
    if (ids.pmid) {
      return ids.pmid
    }

    // Check URL
    if (paper.url) {
      const match = paper.url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i)
      if (match) {
        return match[1]
      }
    }

    return null
  }

  /**
   * Extract PMCID from various formats
   */
  protected extractPmcid(paper: Source): string | null {
    const ids = extractExternalIds(paper)
    if (ids.pmcid) {
      return ids.pmcid
    }

    // Check URL
    if (paper.url) {
      const match = paper.url.match(/pmc\/articles\/(PMC\d+)/i)
      if (match) {
        return match[1]
      }
    }

    return null
  }

  /**
   * Fetch with timeout
   */
  protected async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = 30000
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      return response
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Clean and normalize text content
   */
  protected cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/\n{3,}/g, '\n\n')  // Max 2 newlines
      .trim()
  }

  /**
   * Split text into paragraphs
   */
  protected splitIntoParagraphs(text: string): string[] {
    return text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
  }
}
