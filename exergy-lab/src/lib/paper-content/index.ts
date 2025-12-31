/**
 * Paper Content Module
 *
 * Provides functions for fetching, parsing, and extracting content from academic papers
 * across multiple data sources (arXiv, CORE, PubMed, etc.)
 */

import type { Source } from '@/types/sources'

export interface ContentSection {
  id?: string
  heading: string
  level?: 1 | 2 | 3
  content: string
  subsections?: ContentSection[]
}

export interface Figure {
  id: string
  url?: string
  base64?: string
  caption: string
  label: string
}

export interface Table {
  id: string
  caption: string
  label: string
  data: string[][]
  html?: string
}

export interface Reference {
  index: number
  text: string
  doi?: string
  url?: string
}

export interface PaperContent {
  title: string
  authors: Array<{ name: string }>
  abstract: string
  availability: 'full' | 'partial' | 'metadata_only'
  sections?: ContentSection[]
  figures?: Figure[]
  tables?: Table[]
  references?: Reference[]
  pdfUrl?: string
  pdfAvailable?: boolean
  externalUrl: string
  publicationDate?: string
  journal?: string
  doi?: string
  citationCount?: number
}

export interface FetchContentOptions {
  parsePdf?: boolean
  includeReferences?: boolean
  includeFigures?: boolean
  timeout?: number // milliseconds
}

export interface PaperContentResponse {
  success: boolean
  content?: PaperContent
  error?: {
    code: string
    message: string
  }
}

/**
 * Default timeout for content fetching (30 seconds)
 */
const DEFAULT_TIMEOUT = 30000

/**
 * Timeout wrapper for async operations
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = DEFAULT_TIMEOUT
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ])
}

/**
 * Fetch paper content from the appropriate source
 */
export async function fetchPaperContent(
  paper: Source,
  options: FetchContentOptions = {}
): Promise<PaperContent> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT

  try {
    // Wrap the fetch in a timeout
    const content = await withTimeout(
      fetchContentBySource(paper, options),
      timeout
    )
    return content
  } catch (error) {
    // On timeout or other errors, return metadata-only content
    console.error('[fetchPaperContent] Error:', error)
    return createMetadataOnlyContent(paper, error)
  }
}

/**
 * Fetch content based on paper source
 */
async function fetchContentBySource(
  paper: Source,
  _options: FetchContentOptions
): Promise<PaperContent> {
  // For now, return metadata-only content
  // In a full implementation, each source would have specialized fetching logic
  return createMetadataOnlyContent(paper)
}

/**
 * Create metadata-only content (fallback)
 */
function createMetadataOnlyContent(
  paper: Source,
  _error?: any
): PaperContent {
  return {
    title: paper.title,
    authors: (paper.authors || []).map(name => ({ name })),
    abstract: paper.abstract || '',
    availability: 'metadata_only',
    externalUrl: paper.url || '',
    publicationDate: paper.metadata.publicationDate,
    citationCount: paper.metadata.citationCount,
    doi: paper.doi,
  }
}

/**
 * Get PDF URL for a paper (source-dependent)
 */
export function getPaperPdfUrl(paper: Source): string | null {
  const source = paper.metadata.source

  // Source-specific PDF URL resolution
  switch (source) {
    case 'arxiv':
      return `https://arxiv.org/pdf/${paper.id}.pdf`
    default:
      return null
  }
}

/**
 * Get external URL for viewing paper at source
 */
export function getPaperExternalUrl(paper: Source): string {
  return paper.url || ''
}

/**
 * Determine content tier (full/partial/metadata)
 */
export function getContentTier(
  paper: Source
): 'full' | 'partial' | 'metadata_only' {
  const source = paper.metadata.source

  // Determine based on source
  switch (source) {
    case 'arxiv':
    case 'core':
      return 'full'
    case 'semantic-scholar':
    case 'openalex':
      return 'partial'
    default:
      return 'metadata_only'
  }
}
