/**
 * PubMed Content Adapter
 *
 * Fetches paper metadata from PubMed (not PMC).
 * PubMed only provides abstracts, not full text.
 *
 * This is a Tier 3 source - metadata only.
 * For full text, papers need PMCID (use PMC adapter).
 */

import type { Source } from '@/types/sources'
import type { PaperContent, FetchContentOptions, Author } from '../types'
import { BaseContentAdapter } from './base-adapter'

/**
 * PubMed adapter - provides abstract only
 */
export class PubMedAdapter extends BaseContentAdapter {
  source = 'pubmed' as const
  canFetchFullContent = false
  canFetchPdf = false

  /**
   * Fetch paper content from PubMed
   */
  async fetchContent(
    paper: Source,
    options?: FetchContentOptions
  ): Promise<PaperContent> {
    const startTime = Date.now()
    const opts = this.mergeOptions(options)

    // Create base content
    const content = this.createBasePaperContent(paper)

    // Extract PMID
    const pmid = this.extractPmid(paper)

    if (!pmid) {
      content.availability = 'metadata_only'
      content.unavailableReason = 'api_error'
      content.fetchDurationMs = Date.now() - startTime
      return content
    }

    try {
      // Fetch abstract and metadata from efetch
      const pubmedData = await this.fetchPubMedData(pmid, opts.timeout)

      if (!pubmedData) {
        content.availability = 'metadata_only'
        content.unavailableReason = 'api_error'
        content.fetchDurationMs = Date.now() - startTime
        return content
      }

      // Update content with PubMed data
      if (pubmedData.title) {
        content.title = pubmedData.title
      }

      if (pubmedData.authors && pubmedData.authors.length > 0) {
        content.authors = pubmedData.authors
      }

      if (pubmedData.abstract) {
        content.abstract = pubmedData.abstract
      }

      if (pubmedData.publicationDate) {
        content.publicationDate = pubmedData.publicationDate
      }

      if (pubmedData.doi) {
        content.doi = pubmedData.doi
      }

      if (pubmedData.journal) {
        content.journal = pubmedData.journal
      }

      if (pubmedData.volume) {
        content.volume = pubmedData.volume
      }

      if (pubmedData.issue) {
        content.issue = pubmedData.issue
      }

      if (pubmedData.pages) {
        content.pages = pubmedData.pages
      }

      // Check if there's a PMCID (means full text available in PMC)
      if (pubmedData.pmcid) {
        // We have PMC access - note this for the UI
        content.pdfUrl = `https://www.ncbi.nlm.nih.gov/pmc/articles/${pubmedData.pmcid}/pdf/`
        content.pdfAvailable = true
      }

      // Set availability (PubMed only has abstract)
      content.availability = content.abstract ? 'partial' : 'metadata_only'
      if (!content.abstract) {
        content.unavailableReason = 'no_open_access'
      }

    } catch (error) {
      console.error(`[pubmed-adapter] Error:`, error)
      content.availability = 'metadata_only'
      content.unavailableReason = 'api_error'
    }

    content.fetchDurationMs = Date.now() - startTime
    return content
  }

  /**
   * Get PDF URL (via PMC if available)
   */
  getPdfUrl(paper: Source): string | null {
    const pmcid = this.extractPmcid(paper)
    if (pmcid) {
      return `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid}/pdf/`
    }
    return null
  }

  /**
   * Get external URL
   */
  getExternalUrl(paper: Source): string {
    const pmid = this.extractPmid(paper)
    if (pmid) {
      return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
    }

    const doi = this.extractDoi(paper)
    if (doi) {
      return `https://doi.org/${doi}`
    }

    return paper.url || ''
  }

  /**
   * Fetch PubMed data using efetch
   */
  private async fetchPubMedData(
    pmid: string,
    timeout: number
  ): Promise<{
    title?: string
    abstract?: string
    authors?: Author[]
    publicationDate?: string
    doi?: string
    journal?: string
    volume?: string
    issue?: string
    pages?: string
    pmcid?: string
  } | null> {
    // Use efetch to get XML data
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&rettype=xml&retmode=xml`

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
        if (response.status === 404) {
          return null
        }
        throw new Error(`API error: ${response.status}`)
      }

      const xml = await response.text()
      return this.parsePubMedXml(xml)
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  /**
   * Parse PubMed XML response
   */
  private parsePubMedXml(xml: string): {
    title?: string
    abstract?: string
    authors?: Author[]
    publicationDate?: string
    doi?: string
    journal?: string
    volume?: string
    issue?: string
    pages?: string
    pmcid?: string
  } | null {
    const result: ReturnType<typeof this.parsePubMedXml> = {}

    // Extract title
    const titleMatch = xml.match(/<ArticleTitle>([^<]+)<\/ArticleTitle>/i)
    if (titleMatch) {
      result.title = this.decodeHtmlEntities(titleMatch[1])
    }

    // Extract abstract
    const abstractMatch = xml.match(/<AbstractText[^>]*>([^<]+)<\/AbstractText>/gi)
    if (abstractMatch) {
      const abstracts = abstractMatch.map((m) => {
        const labelMatch = m.match(/Label="([^"]+)"/)
        const textMatch = m.match(/>([^<]+)</)
        if (labelMatch && textMatch) {
          return `${labelMatch[1]}: ${textMatch[1]}`
        }
        return textMatch ? textMatch[1] : ''
      })
      result.abstract = this.decodeHtmlEntities(abstracts.join('\n\n'))
    }

    // Extract authors
    const authorMatches = xml.matchAll(/<Author[^>]*>[\s\S]*?<LastName>([^<]+)<\/LastName>[\s\S]*?(?:<ForeName>([^<]+)<\/ForeName>)?[\s\S]*?<\/Author>/gi)
    const authors: Author[] = []
    for (const match of authorMatches) {
      const lastName = match[1]
      const foreName = match[2] || ''
      authors.push({
        name: foreName ? `${foreName} ${lastName}` : lastName,
      })
    }
    if (authors.length > 0) {
      result.authors = authors
    }

    // Extract publication date
    const yearMatch = xml.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/i)
    const monthMatch = xml.match(/<PubDate>[\s\S]*?<Month>([^<]+)<\/Month>/i)
    if (yearMatch) {
      let date = yearMatch[1]
      if (monthMatch) {
        const month = this.parseMonth(monthMatch[1])
        if (month) {
          date = `${date}-${month}`
        }
      }
      result.publicationDate = date
    }

    // Extract DOI
    const doiMatch = xml.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/i)
    if (doiMatch) {
      result.doi = doiMatch[1]
    }

    // Extract PMCID
    const pmcidMatch = xml.match(/<ArticleId IdType="pmc">([^<]+)<\/ArticleId>/i)
    if (pmcidMatch) {
      result.pmcid = pmcidMatch[1].startsWith('PMC') ? pmcidMatch[1] : `PMC${pmcidMatch[1]}`
    }

    // Extract journal
    const journalMatch = xml.match(/<Title>([^<]+)<\/Title>/i)
    if (journalMatch) {
      result.journal = this.decodeHtmlEntities(journalMatch[1])
    }

    // Extract volume
    const volumeMatch = xml.match(/<Volume>([^<]+)<\/Volume>/i)
    if (volumeMatch) {
      result.volume = volumeMatch[1]
    }

    // Extract issue
    const issueMatch = xml.match(/<Issue>([^<]+)<\/Issue>/i)
    if (issueMatch) {
      result.issue = issueMatch[1]
    }

    // Extract pages
    const pagesMatch = xml.match(/<MedlinePgn>([^<]+)<\/MedlinePgn>/i)
    if (pagesMatch) {
      result.pages = pagesMatch[1]
    }

    return Object.keys(result).length > 0 ? result : null
  }

  /**
   * Decode HTML entities
   */
  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
  }

  /**
   * Parse month string to number
   */
  private parseMonth(month: string): string | null {
    const months: Record<string, string> = {
      jan: '01', january: '01',
      feb: '02', february: '02',
      mar: '03', march: '03',
      apr: '04', april: '04',
      may: '05',
      jun: '06', june: '06',
      jul: '07', july: '07',
      aug: '08', august: '08',
      sep: '09', september: '09',
      oct: '10', october: '10',
      nov: '11', november: '11',
      dec: '12', december: '12',
    }

    const lower = month.toLowerCase()
    return months[lower] || (month.length <= 2 ? month.padStart(2, '0') : null)
  }
}
