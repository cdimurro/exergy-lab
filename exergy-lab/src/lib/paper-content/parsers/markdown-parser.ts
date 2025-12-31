/**
 * Markdown/Plain Text Parser
 *
 * Parses plain text and markdown content, typically from
 * CORE API fullText field or other text-based sources.
 */

import type { ContentSection, Reference } from '../types'

/**
 * Result of parsing markdown/plain text content
 */
export interface MarkdownParseResult {
  abstract?: string
  sections: ContentSection[]
  references: Reference[]
}

/**
 * Parse markdown or plain text content
 */
export function parseMarkdown(text: string): MarkdownParseResult {
  const cleaned = cleanText(text)

  return {
    abstract: extractAbstract(cleaned),
    sections: extractSections(cleaned),
    references: extractReferences(cleaned),
  }
}

/**
 * Parse CORE API fullText field
 * CORE returns text that may be markdown, plain text, or a mix
 */
export function parseCoreFullText(fullText: string): MarkdownParseResult {
  return parseMarkdown(fullText)
}

// ============================================================================
// Extraction Functions
// ============================================================================

/**
 * Extract abstract from text
 */
function extractAbstract(text: string): string | undefined {
  // Try to find abstract section
  const patterns = [
    /^abstract\s*[:\n]+([\s\S]+?)(?=\n\s*(?:introduction|background|keywords|1\.|I\.))/im,
    /\babstract\b\s*[:\n]+([\s\S]+?)(?=\n\n\s*[A-Z1-9])/im,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const abstract = match[1].trim()
      if (abstract.length > 50 && abstract.length < 3000) {
        return abstract
      }
    }
  }

  return undefined
}

/**
 * Extract sections from text
 */
function extractSections(text: string): ContentSection[] {
  const sections: ContentSection[] = []

  // Split by potential section headers
  // Match patterns like: "## Introduction", "1. Introduction", "INTRODUCTION"
  const sectionPattern = /(?:^|\n)(?:#{1,3}\s*)?(\d+\.?\s*)?([A-Z][A-Z\s]+|[A-Z][a-z]+(?:\s+[A-Za-z]+)*)\s*\n/g

  const matches: Array<{ index: number; heading: string; level: number }> = []
  let match: RegExpExecArray | null

  while ((match = sectionPattern.exec(text)) !== null) {
    const heading = match[2].trim()

    // Skip if it's too long (probably not a heading)
    if (heading.length > 60) continue

    // Skip common non-section patterns
    if (/^(the|and|or|for|with|from|this|that|these|those)/i.test(heading)) continue

    // Determine heading level
    let level: 1 | 2 | 3 = 1
    if (match[1]) {
      // Numbered section
      const num = match[1].trim()
      if (num.includes('.') && num.match(/\d+\.\d+/)) {
        level = 2
      }
    }

    matches.push({
      index: match.index,
      heading,
      level,
    })
  }

  // Extract content between headings
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    const next = matches[i + 1]

    const startIndex = current.index + text.slice(current.index).indexOf('\n') + 1
    const endIndex = next ? next.index : text.length

    const content = text.slice(startIndex, endIndex).trim()

    // Skip very short sections
    if (content.length < 50) continue

    // Skip references section content (keep heading though)
    const isReferences = /^references?$/i.test(current.heading) ||
      /^bibliography$/i.test(current.heading)

    sections.push({
      id: `section-${i + 1}`,
      heading: normalizeHeading(current.heading),
      level: current.level as 1 | 2 | 3,
      content: isReferences ? '' : formatContent(content),
    })
  }

  // If no sections found, treat entire text as one section
  if (sections.length === 0 && text.length > 100) {
    sections.push({
      id: 'section-1',
      heading: 'Content',
      level: 1,
      content: formatContent(text),
    })
  }

  return sections
}

/**
 * Extract references from text
 */
function extractReferences(text: string): Reference[] {
  const references: Reference[] = []

  // Find references section
  const refMatch = text.match(/(?:references?|bibliography)\s*\n([\s\S]+?)(?=\n\s*(?:appendix|supplementary|$))/i)

  if (!refMatch) {
    return references
  }

  const refText = refMatch[1]

  // Try different reference patterns

  // Pattern 1: [1] Author et al. Title...
  const bracketPattern = /\[(\d+)\]\s*([^\[]+)/g
  let match: RegExpExecArray | null

  while ((match = bracketPattern.exec(refText)) !== null) {
    const index = parseInt(match[1], 10)
    const content = match[2].trim()

    if (content.length > 20) {
      references.push({
        index,
        text: content,
        doi: extractDoi(content),
      })
    }
  }

  if (references.length > 0) {
    return references
  }

  // Pattern 2: Numbered list (1. Author et al.)
  const numberedPattern = /(\d+)\.\s+([^0-9\n][^\n]+)/g

  while ((match = numberedPattern.exec(refText)) !== null) {
    const index = parseInt(match[1], 10)
    const content = match[2].trim()

    if (content.length > 20) {
      references.push({
        index,
        text: content,
        doi: extractDoi(content),
      })
    }
  }

  if (references.length > 0) {
    return references
  }

  // Pattern 3: Each line is a reference
  const lines = refText.split('\n').filter((line) => line.trim().length > 30)

  lines.forEach((line, index) => {
    references.push({
      index: index + 1,
      text: line.trim(),
      doi: extractDoi(line),
    })
  })

  return references.slice(0, 100) // Limit to 100 references
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clean raw text
 */
function cleanText(text: string): string {
  return text
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive blank lines
    .replace(/\n{4,}/g, '\n\n\n')
    // Normalize spaces
    .replace(/[ \t]+/g, ' ')
    // Remove page numbers and headers/footers
    .replace(/\n\s*\d+\s*\n/g, '\n')
    .replace(/\n\s*page\s+\d+\s*\n/gi, '\n')
    .trim()
}

/**
 * Normalize section heading
 */
function normalizeHeading(heading: string): string {
  // Remove numbers and extra whitespace
  const cleaned = heading
    .replace(/^\d+\.?\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Title case
  if (cleaned === cleaned.toUpperCase() && cleaned.length > 3) {
    return cleaned
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return cleaned
}

/**
 * Format content into readable paragraphs
 */
function formatContent(content: string): string {
  // Split by paragraph breaks (2+ newlines or clear breaks)
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter((p) => p.length > 0)

  return paragraphs.join('\n\n')
}

/**
 * Extract DOI from text
 */
function extractDoi(text: string): string | undefined {
  const match = text.match(/10\.\d{4,}\/[^\s,;]+/i)
  return match ? match[0].replace(/[.,;]$/, '') : undefined
}

/**
 * Split text into sections by common academic paper structure
 */
export function splitIntoAcademicSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {}

  const sectionNames = [
    'abstract',
    'introduction',
    'background',
    'related work',
    'literature review',
    'methods',
    'methodology',
    'materials and methods',
    'experimental',
    'results',
    'discussion',
    'results and discussion',
    'conclusions',
    'conclusion',
    'summary',
    'acknowledgements',
    'acknowledgments',
    'references',
    'bibliography',
  ]

  // Build regex pattern
  const pattern = new RegExp(
    `(?:^|\\n)(?:#{1,3}\\s*)?(?:\\d+\\.?\\s*)?(${sectionNames.join('|')})\\s*[:\\n]`,
    'gi'
  )

  const matches: Array<{ name: string; index: number }> = []
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    matches.push({
      name: match[1].toLowerCase().trim(),
      index: match.index,
    })
  }

  // Extract content between matches
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    const next = matches[i + 1]

    const startIndex = current.index + text.slice(current.index).indexOf('\n') + 1
    const endIndex = next ? next.index : text.length

    const content = text.slice(startIndex, endIndex).trim()

    // Normalize section name
    const normalizedName = normalizeSectionName(current.name)
    sections[normalizedName] = formatContent(content)
  }

  return sections
}

/**
 * Normalize section name to standard format
 */
function normalizeSectionName(name: string): string {
  const mappings: Record<string, string> = {
    'methods': 'methods',
    'methodology': 'methods',
    'materials and methods': 'methods',
    'experimental': 'methods',
    'conclusions': 'conclusion',
    'summary': 'conclusion',
    'acknowledgements': 'acknowledgments',
    'bibliography': 'references',
  }

  const lower = name.toLowerCase().trim()
  return mappings[lower] || lower
}
