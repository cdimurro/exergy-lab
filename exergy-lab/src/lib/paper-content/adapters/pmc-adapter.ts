/**
 * PubMed Central (PMC) Content Adapter
 *
 * Fetches full paper content from PubMed Central using NCBI E-utilities.
 * PMC provides full JATS XML for open access articles.
 *
 * Note: Only works for papers that have a PMCID (are in PMC).
 * For papers with only PMID, use the PubMed adapter instead.
 *
 * This is a Tier 1 source - provides full structured content.
 */

import type { Source } from '@/types/sources'
import type { PaperContent, FetchContentOptions } from '../types'
import { BaseContentAdapter } from './base-adapter'
import { parseJatsXml } from '../parsers/jats-parser'

/**
 * PMC adapter - provides full structured content via JATS XML
 */
export class PmcAdapter extends BaseContentAdapter {
  source = 'pubmed' as const  // PMC papers come through PubMed source
  canFetchFullContent = true
  canFetchPdf = true

  /**
   * Fetch paper content from PMC
   */
  async fetchContent(
    paper: Source,
    options?: FetchContentOptions
  ): Promise<PaperContent> {
    const startTime = Date.now()
    const opts = this.mergeOptions(options)

    // Extract PMCID
    const pmcid = this.extractPmcid(paper)

    // Create base content
    const content = this.createBasePaperContent(paper)

    if (!pmcid) {
      // Without PMCID, we can't fetch from PMC
      content.availability = 'metadata_only'
      content.unavailableReason = 'no_open_access'
      content.fetchDurationMs = Date.now() - startTime
      return content
    }

    try {
      // Fetch JATS XML from PMC
      const xml = await this.fetchPmcXml(pmcid, opts.timeout)

      if (!xml) {
        content.availability = 'metadata_only'
        content.unavailableReason = 'api_error'
        content.fetchDurationMs = Date.now() - startTime
        return content
      }

      // Parse JATS XML
      const parsed = parseJatsXml(xml)

      // Update content with parsed data
      if (parsed.title) {
        content.title = parsed.title
      }

      if (parsed.authors && parsed.authors.length > 0) {
        content.authors = parsed.authors
      }

      if (parsed.abstract) {
        content.abstract = parsed.abstract
      }

      if (parsed.doi) {
        content.doi = parsed.doi
      }

      if (parsed.journal) {
        content.journal = parsed.journal
      }

      if (parsed.volume) {
        content.volume = parsed.volume
      }

      if (parsed.issue) {
        content.issue = parsed.issue
      }

      if (parsed.pages) {
        content.pages = parsed.pages
      }

      // Sections
      if (parsed.sections && parsed.sections.length > 0) {
        content.sections = parsed.sections
      }

      // Figures
      if (parsed.figures && parsed.figures.length > 0 && opts.includeFigures) {
        content.figures = parsed.figures.map((fig) => ({
          ...fig,
          // Resolve figure URLs
          url: fig.url ? this.resolvePmcUrl(fig.url, pmcid) : undefined,
        }))
      }

      // Tables
      if (parsed.tables && parsed.tables.length > 0) {
        content.tables = parsed.tables
      }

      // References
      if (parsed.references && parsed.references.length > 0 && opts.includeReferences) {
        content.references = parsed.references
      }

      // Set PDF URL
      const pdfUrl = this.getPmcPdfUrl(pmcid)
      content.pdfUrl = pdfUrl
      content.pdfAvailable = true

      content.availability = parsed.sections && parsed.sections.length > 0 ? 'full' : 'partial'

    } catch (error) {
      console.error(`[pmc-adapter] Error fetching content for ${pmcid}:`, error)
      content.availability = 'metadata_only'
      content.unavailableReason = 'api_error'
    }

    content.fetchDurationMs = Date.now() - startTime
    return content
  }

  /**
   * Get PDF URL from PMC
   */
  getPdfUrl(paper: Source): string | null {
    const pmcid = this.extractPmcid(paper)
    if (pmcid) {
      return this.getPmcPdfUrl(pmcid)
    }
    return null
  }

  /**
   * Get external URL for PMC paper
   */
  getExternalUrl(paper: Source): string {
    const pmcid = this.extractPmcid(paper)
    if (pmcid) {
      return `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid}/`
    }

    // Fall back to PubMed URL if we have PMID
    const pmid = this.extractPmid(paper)
    if (pmid) {
      return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
    }

    return paper.url || ''
  }

  /**
   * Fetch JATS XML from PMC E-utilities
   */
  private async fetchPmcXml(pmcid: string, timeout: number): Promise<string | null> {
    // Normalize PMCID (add PMC prefix if not present)
    const normalizedPmcid = pmcid.startsWith('PMC') ? pmcid : `PMC${pmcid}`
    const numericId = normalizedPmcid.replace('PMC', '')

    // Use efetch to get full XML
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=${numericId}&rettype=full&retmode=xml`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/xml',
          'User-Agent': 'ExergyLab/1.0 (Research Platform)',
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.warn(`[pmc-adapter] efetch returned ${response.status} for ${pmcid}`)
        return null
      }

      const xml = await response.text()

      // Check if we got valid XML (not an error page)
      if (!xml.includes('<article') && !xml.includes('<pmc-articleset')) {
        console.warn(`[pmc-adapter] Invalid XML response for ${pmcid}`)
        return null
      }

      return xml
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`[pmc-adapter] Request timed out for ${pmcid}`)
      }
      throw error
    }
  }

  /**
   * Get PMC PDF URL
   */
  private getPmcPdfUrl(pmcid: string): string {
    const normalizedPmcid = pmcid.startsWith('PMC') ? pmcid : `PMC${pmcid}`
    return `https://www.ncbi.nlm.nih.gov/pmc/articles/${normalizedPmcid}/pdf/`
  }

  /**
   * Resolve PMC image/figure URLs
   */
  private resolvePmcUrl(url: string, pmcid: string): string {
    if (url.startsWith('http')) {
      return url
    }

    const normalizedPmcid = pmcid.startsWith('PMC') ? pmcid : `PMC${pmcid}`

    if (url.startsWith('/')) {
      return `https://www.ncbi.nlm.nih.gov${url}`
    }

    // Relative to article
    return `https://www.ncbi.nlm.nih.gov/pmc/articles/${normalizedPmcid}/${url}`
  }

  /**
   * Extract PMCID from paper (override base class)
   */
  protected extractPmcid(paper: Source): string | null {
    // Check metadata
    const metadata = paper.metadata as unknown as Record<string, unknown>
    if (typeof metadata.pmcid === 'string') {
      return this.normalizePmcid(metadata.pmcid)
    }

    // Check paper ID
    if (paper.id.toLowerCase().includes('pmc')) {
      const match = paper.id.match(/PMC?(\d+)/i)
      if (match) {
        return `PMC${match[1]}`
      }
    }

    // Check URL
    if (paper.url) {
      const match = paper.url.match(/pmc\/articles\/(PMC\d+)/i)
      if (match) {
        return match[1]
      }

      // Numeric PMC ID in URL
      const numMatch = paper.url.match(/pmc\/articles\/(\d+)/i)
      if (numMatch) {
        return `PMC${numMatch[1]}`
      }
    }

    // Check externalIds in metadata
    if (metadata.externalIds && typeof metadata.externalIds === 'object') {
      const extIds = metadata.externalIds as Record<string, unknown>
      if (typeof extIds.pmcid === 'string') {
        return this.normalizePmcid(extIds.pmcid)
      }
    }

    return null
  }

  /**
   * Normalize PMCID (ensure PMC prefix)
   */
  private normalizePmcid(pmcid: string): string {
    const normalized = pmcid.trim().toUpperCase()
    if (normalized.startsWith('PMC')) {
      return normalized
    }
    // Add PMC prefix if it's just a number
    if (/^\d+$/.test(normalized)) {
      return `PMC${normalized}`
    }
    return normalized
  }
}

/**
 * Check if a paper has PMC access (has PMCID)
 */
export function hasPmcAccess(paper: Source): boolean {
  const adapter = new PmcAdapter()
  return adapter['extractPmcid'](paper) !== null
}
