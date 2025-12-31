/**
 * Paper Content System
 *
 * A robust framework for extracting and displaying paper content
 * from various academic data sources.
 *
 * @module paper-content
 *
 * @example
 * ```typescript
 * import { fetchPaperContent, getPaperPdfUrl } from '@/lib/paper-content'
 *
 * // Fetch full paper content
 * const content = await fetchPaperContent(paper)
 *
 * // Get PDF URL
 * const pdfUrl = getPaperPdfUrl(paper)
 * ```
 */

// Main fetcher functions
export {
  fetchPaperContent,
  getPaperPdfUrl,
  getPaperExternalUrl,
  canFetchFullContent,
  canFetchPdf,
  getContentTier,
  getExpectedAvailability,
  fetchMultiplePaperContents,
} from './fetcher'

// Types
export type {
  PaperContent,
  ContentSection,
  Figure,
  Table,
  Reference,
  Author,
  ContentAvailability,
  ContentUnavailableReason,
  FetchContentOptions,
  ContentAdapter,
  PaperContentRequest,
  PaperContentResponse,
  ExternalIds,
} from './types'

// Type utilities
export {
  extractExternalIds,
  SOURCE_DISPLAY_NAMES,
} from './types'

// Adapter registry
export {
  getAdapter,
  hasAdapter,
  getAllAdapters,
  getFullContentAdapters,
  getPdfAdapters,
  initializeAdapters,
} from './adapters'

// Individual adapters (for direct use when needed)
export {
  ArxivAdapter,
  CoreAdapter,
  PmcAdapter,
  hasPmcAccess,
  SemanticScholarAdapter,
  OpenAlexAdapter,
  CrossrefAdapter,
  PubMedAdapter,
  FallbackAdapter,
} from './adapters'

// Parsers (for direct use when needed)
export {
  parsePdfFromUrl,
  parsePdfFromBuffer,
  parseHtml,
  parseAr5ivHtml,
  parseJatsXml,
  parseMarkdown,
  parseCoreFullText,
} from './parsers'
