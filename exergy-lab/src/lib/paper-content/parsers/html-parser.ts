/**
 * HTML Parser
 *
 * Extracts structured content from HTML pages using cheerio.
 * Primarily used for ar5iv.org (arXiv HTML) and other HTML sources.
 */

import { load, type CheerioAPI } from 'cheerio'
import type { HtmlParseResult, ContentSection, Figure, Reference } from '../types'

/**
 * Parse HTML content and extract structured sections
 */
export function parseHtml(html: string): HtmlParseResult {
  const $ = load(html)

  return {
    title: extractTitle($),
    abstract: extractAbstract($),
    sections: extractSections($),
    figures: extractFigures($),
    references: extractReferences($),
  }
}

/**
 * Parse ar5iv.org HTML specifically
 * ar5iv renders arXiv papers as accessible HTML
 */
export function parseAr5ivHtml(html: string): HtmlParseResult {
  const $ = load(html)

  return {
    title: extractAr5ivTitle($),
    abstract: extractAr5ivAbstract($),
    sections: extractAr5ivSections($),
    figures: extractAr5ivFigures($),
    references: extractAr5ivReferences($),
  }
}

// ============================================================================
// Generic HTML Extraction
// ============================================================================

function extractTitle($: CheerioAPI): string | undefined {
  // Try common title selectors
  const selectors = [
    'h1.title',
    'h1.article-title',
    '.paper-title h1',
    'article h1',
    'h1',
    'title',
  ]

  for (const selector of selectors) {
    const text = $(selector).first().text().trim()
    if (text && text.length > 5 && text.length < 500) {
      return text
    }
  }

  return undefined
}

function extractAbstract($: CheerioAPI): string | undefined {
  const selectors = [
    '.abstract',
    '#abstract',
    '[class*="abstract"]',
    'section.abstract',
    'div.abstract',
  ]

  for (const selector of selectors) {
    const el = $(selector).first()
    if (el.length) {
      // Remove the "Abstract" heading if present
      el.find('h2, h3, h4, .title').remove()
      const text = el.text().trim()
      if (text.length > 50) {
        return cleanText(text)
      }
    }
  }

  return undefined
}

function extractSections($: CheerioAPI): ContentSection[] {
  const sections: ContentSection[] = []

  // Try to find article sections
  $('section, article > div, .section').each((index, el) => {
    const $el = $(el)
    const heading = $el.find('h1, h2, h3, h4').first().text().trim()

    if (heading) {
      // Get content excluding sub-sections and heading
      const $content = $el.clone()
      $content.find('h1, h2, h3, h4, section').remove()

      const content = cleanText($content.text())

      if (content.length > 50) {
        sections.push({
          id: `section-${index + 1}`,
          heading,
          level: getHeadingLevel($el.find('h1, h2, h3, h4').first().prop('tagName') || 'H2'),
          content,
        })
      }
    }
  })

  return sections
}

function extractFigures($: CheerioAPI): Figure[] {
  const figures: Figure[] = []

  $('figure, .figure, [class*="figure"]').each((index, el) => {
    const $el = $(el)
    const img = $el.find('img').first()
    const caption = $el.find('figcaption, .caption, [class*="caption"]').text().trim()

    if (img.length || caption) {
      figures.push({
        id: `figure-${index + 1}`,
        label: `Figure ${index + 1}`,
        caption: caption || 'No caption',
        url: img.attr('src') || undefined,
      })
    }
  })

  return figures
}

function extractReferences($: CheerioAPI): Reference[] {
  const references: Reference[] = []

  // Try common reference list selectors
  const selectors = [
    '.references li',
    '#references li',
    '.bibliography li',
    '.reference-list li',
    '[class*="reference"] li',
  ]

  for (const selector of selectors) {
    $(selector).each((index, el) => {
      const text = $(el).text().trim()
      if (text.length > 20) {
        references.push({
          index: index + 1,
          text: cleanText(text),
          doi: extractDoiFromText(text),
        })
      }
    })

    if (references.length > 0) break
  }

  return references
}

// ============================================================================
// ar5iv.org Specific Extraction
// ============================================================================

function extractAr5ivTitle($: CheerioAPI): string | undefined {
  // ar5iv puts title in h1.ltx_title
  const title = $('h1.ltx_title').first().text().trim()
  return title || extractTitle($)
}

function extractAr5ivAbstract($: CheerioAPI): string | undefined {
  // ar5iv abstract is in .ltx_abstract
  const abstractEl = $('.ltx_abstract').first()
  if (abstractEl.length) {
    // Remove the "Abstract" title
    abstractEl.find('.ltx_title').remove()
    return cleanText(abstractEl.text())
  }
  return extractAbstract($)
}

function extractAr5ivSections($: CheerioAPI): ContentSection[] {
  const sections: ContentSection[] = []

  // ar5iv sections are in .ltx_section
  $('.ltx_section, .ltx_subsection').each((index, el) => {
    const $el = $(el)
    const $title = $el.find('> .ltx_title').first()
    const heading = $title.text().trim()

    if (heading) {
      // Get section content
      const $content = $el.clone()
      $content.find('.ltx_title, .ltx_subsection, .ltx_subsubsection').remove()

      // Process paragraphs
      const paragraphs: string[] = []
      $content.find('.ltx_para, p').each((_, p) => {
        const text = $(p).text().trim()
        if (text.length > 10) {
          paragraphs.push(text)
        }
      })

      const content = paragraphs.join('\n\n')

      if (content.length > 50) {
        const isSubsection = $el.hasClass('ltx_subsection')
        sections.push({
          id: `section-${index + 1}`,
          heading: cleanHeading(heading),
          level: isSubsection ? 2 : 1,
          content: cleanText(content),
        })
      }
    }
  })

  return sections
}

function extractAr5ivFigures($: CheerioAPI): Figure[] {
  const figures: Figure[] = []

  // ar5iv figures are in .ltx_figure
  $('.ltx_figure').each((index, el) => {
    const $el = $(el)
    const img = $el.find('img').first()
    const caption = $el.find('.ltx_caption').text().trim()
    const label = $el.find('.ltx_tag').first().text().trim() || `Figure ${index + 1}`

    figures.push({
      id: `figure-${index + 1}`,
      label,
      caption: caption.replace(label, '').trim() || 'No caption',
      url: img.attr('src') || undefined,
    })
  })

  return figures
}

function extractAr5ivReferences($: CheerioAPI): Reference[] {
  const references: Reference[] = []

  // ar5iv references are in .ltx_bibitem
  $('.ltx_bibitem').each((index, el) => {
    const $el = $(el)
    const text = $el.find('.ltx_bibblock').text().trim()
    const tag = $el.find('.ltx_tag').first().text().trim()

    if (text.length > 10) {
      references.push({
        index: index + 1,
        text: cleanText(text),
        doi: extractDoiFromText(text),
      })
    }
  })

  return references
}

// ============================================================================
// Utility Functions
// ============================================================================

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function cleanHeading(heading: string): string {
  // Remove section numbers like "1." or "1.1"
  return heading.replace(/^\d+\.?\d*\.?\s*/, '').trim()
}

function getHeadingLevel(tagName: string): 1 | 2 | 3 {
  switch (tagName.toUpperCase()) {
    case 'H1':
      return 1
    case 'H2':
      return 1
    case 'H3':
      return 2
    case 'H4':
      return 3
    default:
      return 1
  }
}

function extractDoiFromText(text: string): string | undefined {
  const doiMatch = text.match(/10\.\d{4,}\/[^\s]+/i)
  return doiMatch ? doiMatch[0].replace(/[.,;]$/, '') : undefined
}

/**
 * Fetch and parse HTML from a URL
 */
export async function fetchAndParseHtml(
  url: string,
  options: { timeout?: number; isAr5iv?: boolean } = {}
): Promise<HtmlParseResult> {
  const { timeout = 30000, isAr5iv = false } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'ExergyLab/1.0 (Research Paper Viewer)',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch HTML: ${response.status} ${response.statusText}`)
    }

    const html = await response.text()
    return isAr5iv ? parseAr5ivHtml(html) : parseHtml(html)
  } finally {
    clearTimeout(timeoutId)
  }
}
