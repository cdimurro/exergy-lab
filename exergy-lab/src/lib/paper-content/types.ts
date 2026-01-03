/**
 * Paper Content System - Type Definitions
 *
 * Defines the data structures for extracting and displaying
 * paper content from various academic sources.
 */

import type { DataSourceName, Source } from '@/types/sources'

// ============================================================================
// Core Content Types
// ============================================================================

/**
 * Author information for a paper
 */
export interface Author {
  name: string
  affiliations?: string[]
  orcid?: string
}

/**
 * A section of paper content (e.g., Introduction, Methods, Results)
 */
export interface ContentSection {
  id: string
  heading: string
  level: 1 | 2 | 3  // Heading level (h1, h2, h3)
  content: string   // Formatted text content
  subsections?: ContentSection[]
}

/**
 * A figure/image from the paper
 */
export interface Figure {
  id: string
  label: string       // "Figure 1", "Fig. 2", etc.
  caption: string
  url?: string        // Image URL if available
  base64?: string     // Base64 data if extracted from PDF
}

/**
 * A table from the paper
 */
export interface Table {
  id: string
  label: string       // "Table 1", etc.
  caption: string
  html?: string       // HTML representation
  data?: string[][]   // Parsed table data
}

/**
 * A reference/citation from the paper
 */
export interface Reference {
  index: number
  text: string        // Full citation text
  doi?: string
  url?: string
  title?: string
  authors?: string[]
  year?: string
}

// ============================================================================
// Content Availability
// ============================================================================

/**
 * Content availability status
 */
export type ContentAvailability = 'full' | 'partial' | 'metadata_only'

/**
 * Reasons why full content may not be available
 */
export type ContentUnavailableReason =
  | 'subscription_required'
  | 'no_open_access'
  | 'pdf_parsing_failed'
  | 'source_not_supported'
  | 'api_error'
  | 'rate_limited'

// ============================================================================
// Paper Content
// ============================================================================

/**
 * Complete paper content structure returned by adapters
 */
export interface PaperContent {
  // Metadata (always available)
  title: string
  authors: Author[]
  abstract: string
  publicationDate?: string
  doi?: string
  citationCount?: number
  journal?: string
  volume?: string
  issue?: string
  pages?: string

  // Source information
  source: DataSourceName
  sourceDisplay: string  // Human-readable source name
  sourceId: string       // Original ID from source

  // Content availability
  availability: ContentAvailability
  unavailableReason?: ContentUnavailableReason

  // Full content (when available)
  sections?: ContentSection[]
  figures?: Figure[]
  tables?: Table[]
  references?: Reference[]

  // Raw full text (for sources without structured content)
  fullText?: string

  // PDF access
  pdfUrl?: string
  pdfAvailable: boolean

  // External access
  externalUrl: string

  // Fetch metadata
  fetchedAt: Date
  fetchDurationMs?: number
}

// ============================================================================
// Adapter Types
// ============================================================================

/**
 * Options for fetching paper content
 */
export interface FetchContentOptions {
  /**
   * Whether to attempt PDF parsing for full text extraction
   * Default: true
   */
  parsePdf?: boolean

  /**
   * Whether to fetch references
   * Default: true
   */
  includeReferences?: boolean

  /**
   * Whether to fetch figures
   * Default: true
   */
  includeFigures?: boolean

  /**
   * Timeout for fetch operations in ms
   * Default: 30000
   */
  timeout?: number
}

/**
 * Base adapter interface that all source adapters must implement
 */
export interface ContentAdapter {
  /**
   * The data source this adapter handles
   */
  source: DataSourceName

  /**
   * Human-readable display name for the source
   */
  sourceDisplay: string

  /**
   * Whether this source can provide full text content
   */
  canFetchFullContent: boolean

  /**
   * Whether this source can provide PDF URLs
   */
  canFetchPdf: boolean

  /**
   * Fetch paper content from this source
   */
  fetchContent(paper: Source, options?: FetchContentOptions): Promise<PaperContent>

  /**
   * Get the PDF URL for a paper, if available
   */
  getPdfUrl(paper: Source): string | null

  /**
   * Get the external URL to view the paper on the source website
   */
  getExternalUrl(paper: Source): string
}

// ============================================================================
// Parser Types
// ============================================================================

/**
 * Result of parsing a PDF document
 */
export interface PdfParseResult {
  text: string
  numPages: number
  metadata?: {
    title?: string
    author?: string
    subject?: string
    keywords?: string
  }
}

/**
 * Result of parsing HTML content
 */
export interface HtmlParseResult {
  title?: string
  abstract?: string
  sections: ContentSection[]
  figures: Figure[]
  references: Reference[]
}

/**
 * Result of parsing JATS XML (PubMed/PMC format)
 */
export interface JatsParseResult {
  title: string
  abstract: string
  authors: Author[]
  sections: ContentSection[]
  figures: Figure[]
  tables: Table[]
  references: Reference[]
  keywords?: string[]
  journal?: string
  volume?: string
  issue?: string
  pages?: string
  doi?: string
  pmid?: string
  pmcid?: string
}

// ============================================================================
// API Types
// ============================================================================

/**
 * Request body for the paper content API route
 */
export interface PaperContentRequest {
  paper: Source
  options?: FetchContentOptions
}

/**
 * Response from the paper content API route
 */
export interface PaperContentResponse {
  success: boolean
  content?: PaperContent
  error?: {
    code: string
    message: string
  }
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Source-specific IDs that may be available on a paper
 */
export interface ExternalIds {
  doi?: string
  arxivId?: string
  pmid?: string
  pmcid?: string
  semanticScholarId?: string
  openAlexId?: string
  coreId?: string
  corpusId?: string
}

/**
 * Extract external IDs from a Source object
 */
export function extractExternalIds(paper: Source): ExternalIds {
  const ids: ExternalIds = {}

  // Check doi field on paper
  if (paper.doi) {
    ids.doi = paper.doi
  }

  // Check metadata for additional IDs (cast to unknown first then to record)
  const metadata = paper.metadata as unknown as Record<string, unknown>

  if (metadata.doi && typeof metadata.doi === 'string' && !ids.doi) {
    ids.doi = metadata.doi
  }

  if (metadata.arxivId && typeof metadata.arxivId === 'string') {
    ids.arxivId = metadata.arxivId
  }

  if (metadata.pmid && typeof metadata.pmid === 'string') {
    ids.pmid = metadata.pmid
  }

  if (metadata.pmcid && typeof metadata.pmcid === 'string') {
    ids.pmcid = metadata.pmcid
  }

  // Try to extract from paper ID
  const id = paper.id

  if (id.startsWith('arxiv:')) {
    ids.arxivId = id.replace('arxiv:', '')
  } else if (id.startsWith('pmid:')) {
    ids.pmid = id.replace('pmid:', '')
  } else if (id.startsWith('pmc:')) {
    ids.pmcid = id.replace('pmc:', '')
  } else if (id.startsWith('10.')) {
    ids.doi = id
  } else if (id.startsWith('ss:')) {
    ids.semanticScholarId = id.replace('ss:', '')
  } else if (id.startsWith('oa:') || id.startsWith('W')) {
    ids.openAlexId = id.replace('oa:', '')
  } else if (id.startsWith('core:')) {
    ids.coreId = id.replace('core:', '')
  }

  return ids
}

/**
 * Source display name mapping
 */
export const SOURCE_DISPLAY_NAMES: Record<DataSourceName, string> = {
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
  'pubchem': 'PubChem',
  'chemspider': 'ChemSpider',
  'nist-webbook': 'NIST WebBook',
}
