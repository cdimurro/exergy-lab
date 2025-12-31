/**
 * Fallback Content Adapter
 *
 * Used for sources that don't have a dedicated adapter.
 * Returns metadata-only content with a link to the external source.
 */

import type { DataSourceName, Source } from '@/types/sources'
import type { PaperContent, FetchContentOptions } from '../types'
import { BaseContentAdapter } from './base-adapter'

/**
 * Fallback adapter for unsupported or generic sources
 */
export class FallbackAdapter extends BaseContentAdapter {
  source: DataSourceName = 'web-search' // Generic source type
  canFetchFullContent = false
  canFetchPdf = false

  /**
   * Fetch content - returns metadata only
   */
  async fetchContent(
    paper: Source,
    options?: FetchContentOptions
  ): Promise<PaperContent> {
    const startTime = Date.now()

    // Create base content with metadata only
    const content = this.createBasePaperContent(
      paper,
      'metadata_only',
      'source_not_supported'
    )

    // Override source to use the actual source from the paper
    content.source = paper.metadata.source
    content.sourceDisplay = this.getSourceDisplayName(paper.metadata.source)

    // Check if paper has a PDF URL in metadata
    const pdfUrl = this.findPdfUrl(paper)
    if (pdfUrl) {
      content.pdfUrl = pdfUrl
      content.pdfAvailable = true
    }

    content.fetchDurationMs = Date.now() - startTime

    return content
  }

  /**
   * Get PDF URL from paper metadata if available
   */
  getPdfUrl(paper: Source): string | null {
    return this.findPdfUrl(paper)
  }

  /**
   * Get external URL - use paper's URL or construct from DOI
   */
  getExternalUrl(paper: Source): string {
    if (paper.url) {
      return paper.url
    }

    // Try to construct URL from DOI
    const doi = this.extractDoi(paper)
    if (doi) {
      return `https://doi.org/${doi}`
    }

    return ''
  }

  /**
   * Find PDF URL in paper metadata
   */
  private findPdfUrl(paper: Source): string | null {
    const metadata = paper.metadata as unknown as Record<string, unknown>

    // Check common PDF URL fields
    if (typeof metadata.pdfUrl === 'string' && metadata.pdfUrl) {
      return metadata.pdfUrl
    }

    if (typeof metadata.pdf_url === 'string' && metadata.pdf_url) {
      return metadata.pdf_url
    }

    // Check openAccessPdf field (Semantic Scholar format)
    if (metadata.openAccessPdf && typeof metadata.openAccessPdf === 'object') {
      const oaPdf = metadata.openAccessPdf as Record<string, unknown>
      if (typeof oaPdf.url === 'string') {
        return oaPdf.url
      }
    }

    // Check if the paper URL is a PDF
    if (paper.url && paper.url.toLowerCase().endsWith('.pdf')) {
      return paper.url
    }

    return null
  }

  /**
   * Get display name for a source
   */
  private getSourceDisplayName(source: DataSourceName): string {
    const displayNames: Record<string, string> = {
      'semantic-scholar': 'Semantic Scholar',
      'openalex': 'OpenAlex',
      'arxiv': 'arXiv',
      'pubmed': 'PubMed',
      'crossref': 'Crossref',
      'core': 'CORE',
      'consensus': 'Consensus',
      'google-patents': 'Google Patents',
      'uspto': 'USPTO',
      'epo': 'EPO',
      'chemrxiv': 'ChemRxiv',
      'biorxiv': 'bioRxiv',
      'medrxiv': 'medRxiv',
      'nrel': 'NREL',
      'ieee': 'IEEE Xplore',
      'iea': 'IEA',
      'eia': 'EIA',
      'materials-project': 'Materials Project',
      'zenodo': 'Zenodo',
      'inspire': 'INSPIRE',
      'newsapi': 'NewsAPI',
      'web-search': 'Web Search',
    }

    return displayNames[source] || source
  }
}
