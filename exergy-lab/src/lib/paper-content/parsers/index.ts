/**
 * Content Parsers
 *
 * Re-exports all parser functions for easy importing.
 */

// PDF Parser
export {
  parsePdfFromUrl,
  parsePdfFromBuffer,
  extractSectionsFromPdfText,
  cleanPdfText,
  extractAbstractFromPdf,
} from './pdf-parser'

// HTML Parser
export {
  parseHtml,
  parseAr5ivHtml,
  fetchAndParseHtml,
} from './html-parser'

// JATS XML Parser
export {
  parseJatsXml,
  fetchAndParseJats,
} from './jats-parser'

// Markdown/Plain Text Parser
export {
  parseMarkdown,
  parseCoreFullText,
  splitIntoAcademicSections,
} from './markdown-parser'

// Re-export types
export type { PdfParseResult, HtmlParseResult, JatsParseResult } from '../types'
export type { MarkdownParseResult } from './markdown-parser'
