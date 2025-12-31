/**
 * arXiv Content Adapter
 *
 * Fetches full paper content from arXiv using:
 * 1. ar5iv.org for accessible HTML version (preferred)
 * 2. PDF parsing as fallback
 *
 * arXiv always provides full content - this is a Tier 1 source.
 */

import type { Source } from '@/types/sources'
import type { PaperContent, FetchContentOptions, ContentSection, Figure, Reference } from '../types'
import { BaseContentAdapter } from './base-adapter'
import { fetchAndParseHtml, parseAr5ivHtml } from '../parsers/html-parser'
import { parsePdfFromUrl, extractSectionsFromPdfText, cleanPdfText } from '../parsers/pdf-parser'

/**
 * arXiv adapter - provides full text and PDF
 */
export class ArxivAdapter extends BaseContentAdapter {
  source = 'arxiv' as const
  canFetchFullContent = true
  canFetchPdf = true

  /**
   * Fetch full paper content from arXiv
   */
  async fetchContent(
    paper: Source,
    options?: FetchContentOptions
  ): Promise<PaperContent> {
    const startTime = Date.now()
    const opts = this.mergeOptions(options)

    // Extract arXiv ID
    const arxivId = this.extractArxivId(paper)

    if (!arxivId) {
      // Return metadata-only if we can't find arXiv ID
      const content = this.createBasePaperContent(paper, 'metadata_only', 'api_error')
      content.fetchDurationMs = Date.now() - startTime
      return content
    }

    // Create base content
    const content = this.createBasePaperContent(paper)
    content.pdfUrl = this.getPdfUrl(paper) || undefined
    content.pdfAvailable = true

    try {
      // Try ar5iv.org first (accessible HTML version)
      const ar5ivResult = await this.fetchFromAr5iv(arxivId, opts.timeout)

      if (ar5ivResult) {
        // Successfully got HTML content
        if (ar5ivResult.title) {
          content.title = ar5ivResult.title
        }
        if (ar5ivResult.abstract) {
          content.abstract = ar5ivResult.abstract
        }
        if (ar5ivResult.sections && ar5ivResult.sections.length > 0) {
          content.sections = ar5ivResult.sections
        }
        if (ar5ivResult.figures && ar5ivResult.figures.length > 0 && opts.includeFigures) {
          content.figures = ar5ivResult.figures.map((f) => ({
            ...f,
            // Fix relative URLs
            url: f.url ? this.resolveAr5ivUrl(f.url, arxivId) : undefined,
          }))
        }
        if (ar5ivResult.references && ar5ivResult.references.length > 0 && opts.includeReferences) {
          content.references = ar5ivResult.references
        }

        content.availability = 'full'
        content.fetchDurationMs = Date.now() - startTime
        return content
      }
    } catch (error) {
      console.warn(`[arxiv-adapter] ar5iv fetch failed for ${arxivId}:`, error)
    }

    // Fallback to PDF parsing
    if (opts.parsePdf) {
      try {
        const pdfResult = await this.fetchFromPdf(arxivId, opts.timeout)

        if (pdfResult) {
          if (pdfResult.sections.length > 0) {
            content.sections = pdfResult.sections
          }
          if (pdfResult.fullText) {
            content.fullText = pdfResult.fullText
          }

          content.availability = pdfResult.sections.length > 0 ? 'partial' : 'metadata_only'
        }
      } catch (error) {
        console.warn(`[arxiv-adapter] PDF fetch failed for ${arxivId}:`, error)
      }
    }

    content.fetchDurationMs = Date.now() - startTime
    return content
  }

  /**
   * Get PDF URL for arXiv paper
   */
  getPdfUrl(paper: Source): string | null {
    const arxivId = this.extractArxivId(paper)
    if (arxivId) {
      return `https://arxiv.org/pdf/${arxivId}.pdf`
    }
    return null
  }

  /**
   * Get external URL for arXiv paper
   */
  getExternalUrl(paper: Source): string {
    const arxivId = this.extractArxivId(paper)
    if (arxivId) {
      return `https://arxiv.org/abs/${arxivId}`
    }
    return paper.url || ''
  }

  /**
   * Fetch content from ar5iv.org (HTML version of arXiv papers)
   */
  private async fetchFromAr5iv(
    arxivId: string,
    timeout: number
  ): Promise<{
    title?: string
    abstract?: string
    sections: ContentSection[]
    figures: Figure[]
    references: Reference[]
  } | null> {
    const url = `https://ar5iv.org/html/${arxivId}`

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/html',
          'User-Agent': 'ExergyLab/1.0 (Research Paper Viewer)',
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.warn(`[arxiv-adapter] ar5iv returned ${response.status} for ${arxivId}`)
        return null
      }

      const html = await response.text()
      const result = parseAr5ivHtml(html)

      return {
        title: result.title,
        abstract: result.abstract,
        sections: result.sections,
        figures: result.figures,
        references: result.references,
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`[arxiv-adapter] ar5iv request timed out for ${arxivId}`)
      }
      throw error
    }
  }

  /**
   * Fetch and parse PDF from arXiv
   */
  private async fetchFromPdf(
    arxivId: string,
    timeout: number
  ): Promise<{
    sections: ContentSection[]
    fullText: string
  } | null> {
    const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`

    try {
      const result = await parsePdfFromUrl(pdfUrl, { timeout })

      const cleanedText = cleanPdfText(result.text)
      const sections = extractSectionsFromPdfText(cleanedText)

      return {
        sections,
        fullText: cleanedText,
      }
    } catch (error) {
      console.warn(`[arxiv-adapter] PDF parsing failed for ${arxivId}:`, error)
      return null
    }
  }

  /**
   * Resolve relative ar5iv URLs to absolute
   */
  private resolveAr5ivUrl(url: string, arxivId: string): string {
    if (url.startsWith('http')) {
      return url
    }

    if (url.startsWith('/')) {
      return `https://ar5iv.org${url}`
    }

    return `https://ar5iv.org/html/${arxivId}/${url}`
  }

  /**
   * Extract arXiv ID from paper (override to handle arXiv-specific formats)
   */
  protected extractArxivId(paper: Source): string | null {
    // Check metadata
    const metadata = paper.metadata as unknown as Record<string, unknown>
    if (typeof metadata.arxivId === 'string') {
      return this.normalizeArxivId(metadata.arxivId)
    }

    // Check paper ID
    if (paper.id.startsWith('arxiv:')) {
      return this.normalizeArxivId(paper.id.replace('arxiv:', ''))
    }

    // Check for arXiv ID pattern in paper ID
    const idMatch = paper.id.match(/(\d{4}\.\d{4,5})(v\d+)?/)
    if (idMatch) {
      return idMatch[1]
    }

    // Check URL
    if (paper.url) {
      const urlMatch = paper.url.match(/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5})/i)
      if (urlMatch) {
        return urlMatch[1]
      }

      // Old arXiv format (e.g., hep-th/9901001)
      const oldMatch = paper.url.match(/arxiv\.org\/(?:abs|pdf)\/([a-z-]+\/\d{7})/i)
      if (oldMatch) {
        return oldMatch[1]
      }
    }

    return null
  }

  /**
   * Normalize arXiv ID (remove version suffix if present)
   */
  private normalizeArxivId(arxivId: string): string {
    // Remove "arXiv:" prefix if present
    let normalized = arxivId.replace(/^arxiv:/i, '')

    // Remove version suffix (e.g., v1, v2)
    normalized = normalized.replace(/v\d+$/, '')

    return normalized.trim()
  }
}
