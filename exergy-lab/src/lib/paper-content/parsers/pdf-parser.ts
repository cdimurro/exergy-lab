/**
 * PDF Parser
 *
 * Extracts text content from PDF documents using pdf-parse.
 * Note: This should only be used server-side due to pdf-parse limitations.
 */

import type { PdfParseResult, ContentSection } from '../types'

// Dynamic import for server-side only
let pdfParse: ((dataBuffer: Buffer) => Promise<{
  text: string
  numpages: number
  info?: {
    Title?: string
    Author?: string
    Subject?: string
    Keywords?: string
  }
}>) | null = null

/**
 * Initialize pdf-parse library
 * Must be called before using parsePdf
 */
async function initPdfParse(): Promise<void> {
  if (!pdfParse) {
    try {
      // Dynamic import - handle both CommonJS and ESM module formats
      const module = await import('pdf-parse')
      // Use unknown intermediate to handle different export styles
      const parseFn = ((module as unknown as { default?: unknown }).default ?? module) as unknown
      pdfParse = parseFn as typeof pdfParse
    } catch (error) {
      console.error('[pdf-parser] Failed to load pdf-parse:', error)
      throw new Error('PDF parsing is not available in this environment')
    }
  }
}

/**
 * Parse a PDF from a URL
 */
export async function parsePdfFromUrl(
  url: string,
  options: { timeout?: number } = {}
): Promise<PdfParseResult> {
  const { timeout = 30000 } = options

  await initPdfParse()

  // Fetch the PDF
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/pdf',
        'User-Agent': 'ExergyLab/1.0 (Research Paper Viewer)',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    return parsePdfFromBuffer(buffer)
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Parse a PDF from a Buffer
 */
export async function parsePdfFromBuffer(buffer: Buffer): Promise<PdfParseResult> {
  await initPdfParse()

  if (!pdfParse) {
    throw new Error('PDF parsing is not available')
  }

  const data = await pdfParse(buffer)

  return {
    text: data.text,
    numPages: data.numpages,
    metadata: data.info ? {
      title: data.info.Title,
      author: data.info.Author,
      subject: data.info.Subject,
      keywords: data.info.Keywords,
    } : undefined,
  }
}

/**
 * Extract structured sections from PDF text
 * Attempts to identify common academic paper sections
 */
export function extractSectionsFromPdfText(text: string): ContentSection[] {
  const sections: ContentSection[] = []

  // Common section patterns in academic papers
  const sectionPatterns = [
    /^(abstract)\s*$/im,
    /^(\d+\.?\s*)?(introduction)\s*$/im,
    /^(\d+\.?\s*)?(background)\s*$/im,
    /^(\d+\.?\s*)?(related\s+work)\s*$/im,
    /^(\d+\.?\s*)?(literature\s+review)\s*$/im,
    /^(\d+\.?\s*)?(methods?|methodology)\s*$/im,
    /^(\d+\.?\s*)?(materials?\s+and\s+methods?)\s*$/im,
    /^(\d+\.?\s*)?(experimental)\s*$/im,
    /^(\d+\.?\s*)?(results?)\s*$/im,
    /^(\d+\.?\s*)?(results?\s+and\s+discussion)\s*$/im,
    /^(\d+\.?\s*)?(discussion)\s*$/im,
    /^(\d+\.?\s*)?(conclusions?)\s*$/im,
    /^(\d+\.?\s*)?(summary)\s*$/im,
    /^(\d+\.?\s*)?(acknowledgm?ents?)\s*$/im,
    /^(\d+\.?\s*)?(references?|bibliography)\s*$/im,
    /^(\d+\.?\s*)?(appendix|appendices)\s*$/im,
    /^(\d+\.?\s*)?(supplementary\s+(?:material|information))\s*$/im,
  ]

  // Split text into lines
  const lines = text.split('\n')

  let currentSection: ContentSection | null = null
  let currentContent: string[] = []

  for (const line of lines) {
    const trimmedLine = line.trim()

    // Check if this line is a section heading
    let isHeading = false
    let headingText = ''

    for (const pattern of sectionPatterns) {
      const match = trimmedLine.match(pattern)
      if (match) {
        isHeading = true
        // Extract the section name (last captured group)
        headingText = match[match.length - 1] || trimmedLine
        break
      }
    }

    // Also check for numbered sections like "1." or "1.1"
    if (!isHeading && /^\d+\.?\s+\w/.test(trimmedLine) && trimmedLine.length < 100) {
      isHeading = true
      headingText = trimmedLine
    }

    if (isHeading) {
      // Save previous section
      if (currentSection) {
        currentSection.content = currentContent.join('\n\n').trim()
        if (currentSection.content) {
          sections.push(currentSection)
        }
      }

      // Start new section
      currentSection = {
        id: `section-${sections.length + 1}`,
        heading: capitalizeHeading(headingText),
        level: 1,
        content: '',
      }
      currentContent = []
    } else if (currentSection && trimmedLine) {
      // Add to current section content
      currentContent.push(trimmedLine)
    }
  }

  // Save final section
  if (currentSection) {
    currentSection.content = currentContent.join('\n\n').trim()
    if (currentSection.content) {
      sections.push(currentSection)
    }
  }

  return sections
}

/**
 * Capitalize section heading properly
 */
function capitalizeHeading(text: string): string {
  // Remove leading numbers/punctuation
  const cleaned = text.replace(/^\d+\.?\s*/, '').trim()

  // Capitalize first letter of each word
  return cleaned
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Clean PDF text by removing common artifacts
 */
export function cleanPdfText(text: string): string {
  return text
    // Remove page numbers
    .replace(/\n\s*\d+\s*\n/g, '\n')
    // Remove excessive whitespace
    .replace(/[ \t]+/g, ' ')
    // Fix broken words at line ends
    .replace(/(\w)-\n(\w)/g, '$1$2')
    // Normalize line breaks
    .replace(/\n{3,}/g, '\n\n')
    // Remove common headers/footers
    .replace(/^.*(page\s+\d+|©|copyright|doi:).*$/gim, '')
    .trim()
}

/**
 * Extract abstract from PDF text
 */
export function extractAbstractFromPdf(text: string): string | null {
  // Try to find abstract section
  const abstractMatch = text.match(
    /abstract\s*[\n\r]+([\s\S]+?)(?=\n\s*(?:\d+\.?\s*)?(?:introduction|keywords?|background|1\s)|$)/i
  )

  if (abstractMatch && abstractMatch[1]) {
    return cleanPdfText(abstractMatch[1]).slice(0, 2000) // Limit to 2000 chars
  }

  return null
}
