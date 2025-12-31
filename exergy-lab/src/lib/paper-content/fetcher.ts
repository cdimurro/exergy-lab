/**
 * Paper Content Fetcher
 *
 * Main orchestrator for fetching paper content from various sources.
 * Routes to the appropriate adapter based on the paper's source.
 */

import type { Source } from '@/types/sources'
import type { PaperContent, FetchContentOptions } from './types'
import { getAdapter, hasPmcAccess, PmcAdapter } from './adapters'

/**
 * Fetch paper content from the appropriate source adapter
 *
 * This is the main entry point for fetching paper content.
 * It automatically routes to the correct adapter based on the paper's source.
 */
export async function fetchPaperContent(
  paper: Source,
  options?: FetchContentOptions
): Promise<PaperContent> {
  const source = paper.metadata.source

  // Special case: PubMed papers with PMCID should use PMC adapter
  if (source === 'pubmed' && hasPmcAccess(paper)) {
    const pmcAdapter = new PmcAdapter()
    return pmcAdapter.fetchContent(paper, options)
  }

  // Get the adapter for this source
  const adapter = getAdapter(source)

  // Fetch content
  return adapter.fetchContent(paper, options)
}

/**
 * Get the PDF URL for a paper
 */
export function getPaperPdfUrl(paper: Source): string | null {
  const source = paper.metadata.source

  // Special case: PubMed papers with PMCID
  if (source === 'pubmed' && hasPmcAccess(paper)) {
    const pmcAdapter = new PmcAdapter()
    return pmcAdapter.getPdfUrl(paper)
  }

  const adapter = getAdapter(source)
  return adapter.getPdfUrl(paper)
}

/**
 * Get the external URL for a paper (link to original source)
 */
export function getPaperExternalUrl(paper: Source): string {
  const source = paper.metadata.source

  // Special case: PubMed papers with PMCID
  if (source === 'pubmed' && hasPmcAccess(paper)) {
    const pmcAdapter = new PmcAdapter()
    return pmcAdapter.getExternalUrl(paper)
  }

  const adapter = getAdapter(source)
  return adapter.getExternalUrl(paper)
}

/**
 * Check if a paper can provide full text content
 */
export function canFetchFullContent(paper: Source): boolean {
  const source = paper.metadata.source

  // Special case: PubMed papers with PMCID have full content
  if (source === 'pubmed' && hasPmcAccess(paper)) {
    return true
  }

  const adapter = getAdapter(source)
  return adapter.canFetchFullContent
}

/**
 * Check if a paper has a PDF available
 */
export function canFetchPdf(paper: Source): boolean {
  const source = paper.metadata.source

  // Special case: PubMed papers with PMCID have PDFs
  if (source === 'pubmed' && hasPmcAccess(paper)) {
    return true
  }

  const adapter = getAdapter(source)
  return adapter.canFetchPdf
}

/**
 * Get content tier for a paper
 * Tier 1: Full content available (arXiv, CORE, PMC)
 * Tier 2: Metadata + PDF sometimes available (Semantic Scholar, OpenAlex, Crossref)
 * Tier 3: Metadata only (PubMed without PMC, others)
 */
export function getContentTier(paper: Source): 1 | 2 | 3 {
  const source = paper.metadata.source

  // Tier 1 sources
  if (source === 'arxiv' || source === 'core') {
    return 1
  }

  // PubMed with PMCID is Tier 1
  if (source === 'pubmed' && hasPmcAccess(paper)) {
    return 1
  }

  // Tier 2 sources
  if (['semantic-scholar', 'openalex', 'crossref'].includes(source)) {
    return 2
  }

  // Everything else is Tier 3
  return 3
}

/**
 * Get expected content availability for a paper
 */
export function getExpectedAvailability(paper: Source): {
  fullText: boolean
  pdf: boolean
  abstract: boolean
  references: boolean
  figures: boolean
} {
  const tier = getContentTier(paper)

  switch (tier) {
    case 1:
      return {
        fullText: true,
        pdf: true,
        abstract: true,
        references: true,
        figures: true,
      }
    case 2:
      return {
        fullText: false,
        pdf: true, // Sometimes
        abstract: true,
        references: true, // Often via API
        figures: false,
      }
    case 3:
    default:
      return {
        fullText: false,
        pdf: false,
        abstract: true,
        references: false,
        figures: false,
      }
  }
}

/**
 * Batch fetch content for multiple papers
 * Fetches in parallel with concurrency limit
 */
export async function fetchMultiplePaperContents(
  papers: Source[],
  options?: FetchContentOptions & { concurrency?: number }
): Promise<Map<string, PaperContent>> {
  const { concurrency = 3, ...fetchOptions } = options || {}
  const results = new Map<string, PaperContent>()

  // Process in batches
  for (let i = 0; i < papers.length; i += concurrency) {
    const batch = papers.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(
      batch.map((paper) => fetchPaperContent(paper, fetchOptions))
    )

    batchResults.forEach((result, index) => {
      const paper = batch[index]
      if (result.status === 'fulfilled') {
        results.set(paper.id, result.value)
      } else {
        console.error(`[fetcher] Failed to fetch content for ${paper.id}:`, result.reason)
      }
    })
  }

  return results
}
