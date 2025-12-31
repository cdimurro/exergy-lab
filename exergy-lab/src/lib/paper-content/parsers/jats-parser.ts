/**
 * JATS XML Parser
 *
 * Parses Journal Article Tag Suite (JATS) XML format used by
 * PubMed Central and many academic publishers.
 */

import { load, type CheerioAPI, type Cheerio } from 'cheerio'
import type { Element } from 'domhandler'
import type { JatsParseResult, ContentSection, Figure, Table, Reference, Author } from '../types'

/**
 * Parse JATS XML content
 */
export function parseJatsXml(xml: string): JatsParseResult {
  // Load with XML mode
  const $ = load(xml, { xmlMode: true })

  return {
    title: extractTitle($),
    abstract: extractAbstract($),
    authors: extractAuthors($),
    sections: extractSections($),
    figures: extractFigures($),
    tables: extractTables($),
    references: extractReferences($),
    keywords: extractKeywords($),
    journal: extractJournalInfo($),
    volume: $('volume').first().text().trim() || undefined,
    issue: $('issue').first().text().trim() || undefined,
    pages: extractPages($),
    doi: extractDoi($),
    pmid: $('article-id[pub-id-type="pmid"]').text().trim() || undefined,
    pmcid: $('article-id[pub-id-type="pmc"]').text().trim() || undefined,
  }
}

// ============================================================================
// Extraction Functions
// ============================================================================

function extractTitle($: CheerioAPI): string {
  // Try article-title first, then title-group
  const title = $('article-title').first().text().trim() ||
    $('title-group article-title').first().text().trim()

  return cleanText(title)
}

function extractAbstract($: CheerioAPI): string {
  const abstractEl = $('abstract').first()

  if (!abstractEl.length) {
    return ''
  }

  // Check for structured abstract
  const sections = abstractEl.find('sec')
  if (sections.length > 0) {
    const parts: string[] = []
    sections.each((_, sec) => {
      const $sec = $(sec)
      const title = $sec.find('title').text().trim()
      const content = $sec.find('p').map((_, p) => $(p).text().trim()).get().join(' ')
      if (title && content) {
        parts.push(`${title}: ${content}`)
      } else if (content) {
        parts.push(content)
      }
    })
    return cleanText(parts.join('\n\n'))
  }

  // Simple abstract
  return cleanText(abstractEl.text())
}

function extractAuthors($: CheerioAPI): Author[] {
  const authors: Author[] = []

  $('contrib[contrib-type="author"]').each((_, el) => {
    const $el = $(el)

    // Get name
    const surname = $el.find('surname').text().trim()
    const givenNames = $el.find('given-names').text().trim()
    const name = givenNames && surname
      ? `${givenNames} ${surname}`
      : $el.find('name').text().trim() || $el.find('string-name').text().trim()

    if (!name) return

    // Get affiliations
    const affiliations: string[] = []
    const affRefs = $el.find('xref[ref-type="aff"]')
    affRefs.each((_, ref) => {
      const rid = $(ref).attr('rid')
      if (rid) {
        const affText = $(`aff#${rid}`).text().trim()
        if (affText) {
          affiliations.push(cleanText(affText))
        }
      }
    })

    // Get ORCID
    const orcidEl = $el.find('contrib-id[contrib-id-type="orcid"]')
    const orcid = orcidEl.text().trim() || undefined

    authors.push({
      name: cleanText(name),
      affiliations: affiliations.length > 0 ? affiliations : undefined,
      orcid,
    })
  })

  return authors
}

function extractSections($: CheerioAPI): ContentSection[] {
  const sections: ContentSection[] = []
  let sectionIndex = 0

  // Process body sections
  $('body > sec').each((_, el) => {
    const section = processSection($, $(el), ++sectionIndex)
    if (section) {
      sections.push(section)
    }
  })

  return sections
}

function processSection(
  $: CheerioAPI,
  $sec: Cheerio<Element>,
  index: number,
  level: 1 | 2 | 3 = 1
): ContentSection | null {
  const titleEl = $sec.children('title').first()
  const heading = titleEl.text().trim()

  // Get paragraphs
  const paragraphs: string[] = []
  $sec.children('p').each((_, p) => {
    const text = $(p).text().trim()
    if (text.length > 10) {
      paragraphs.push(cleanText(text))
    }
  })

  const content = paragraphs.join('\n\n')

  if (!heading && !content) {
    return null
  }

  const section: ContentSection = {
    id: `section-${index}`,
    heading: heading || `Section ${index}`,
    level,
    content,
  }

  // Process subsections
  const subsections: ContentSection[] = []
  let subIndex = 0
  $sec.children('sec').each((_, subSec) => {
    const nextLevel = Math.min(level + 1, 3) as 1 | 2 | 3
    const subSection = processSection($, $(subSec), ++subIndex, nextLevel)
    if (subSection) {
      subsections.push(subSection)
    }
  })

  if (subsections.length > 0) {
    section.subsections = subsections
  }

  return section
}

function extractFigures($: CheerioAPI): Figure[] {
  const figures: Figure[] = []

  $('fig').each((index, el) => {
    const $el = $(el)

    // Get label (e.g., "Figure 1")
    const label = $el.find('label').text().trim() || `Figure ${index + 1}`

    // Get caption
    const captionEl = $el.find('caption')
    const captionTitle = captionEl.find('title').text().trim()
    const captionParagraphs = captionEl.find('p').map((_, p) => $(p).text().trim()).get()
    const caption = [captionTitle, ...captionParagraphs].filter(Boolean).join(' ')

    // Get graphic URL
    const graphic = $el.find('graphic').first()
    const url = graphic.attr('xlink:href') || graphic.attr('href') || undefined

    figures.push({
      id: $el.attr('id') || `figure-${index + 1}`,
      label,
      caption: cleanText(caption),
      url,
    })
  })

  return figures
}

function extractTables($: CheerioAPI): Table[] {
  const tables: Table[] = []

  $('table-wrap').each((index, el) => {
    const $el = $(el)

    const label = $el.find('label').text().trim() || `Table ${index + 1}`
    const caption = $el.find('caption').text().trim()

    // Get table HTML
    const tableEl = $el.find('table').first()
    const html = tableEl.length ? tableEl.html() || undefined : undefined

    // Parse table data
    const data: string[][] = []
    tableEl.find('tr').each((_, tr) => {
      const row: string[] = []
      $(tr).find('th, td').each((_, cell) => {
        row.push($(cell).text().trim())
      })
      if (row.length > 0) {
        data.push(row)
      }
    })

    tables.push({
      id: $el.attr('id') || `table-${index + 1}`,
      label,
      caption: cleanText(caption),
      html,
      data: data.length > 0 ? data : undefined,
    })
  })

  return tables
}

function extractReferences($: CheerioAPI): Reference[] {
  const references: Reference[] = []

  $('ref').each((index, el) => {
    const $el = $(el)

    // Get mixed citation or element citation
    const citation = $el.find('mixed-citation, element-citation').first()

    if (citation.length) {
      // Build reference text
      const authors = citation.find('person-group name, string-name')
        .map((_, n) => $(n).text().trim())
        .get()
        .join(', ')

      const year = citation.find('year').first().text().trim()
      const title = citation.find('article-title, chapter-title').first().text().trim()
      const source = citation.find('source').first().text().trim()
      const volume = citation.find('volume').first().text().trim()
      const pages = citation.find('fpage').first().text().trim()

      // Build formatted reference
      const parts = [authors]
      if (year) parts.push(`(${year})`)
      if (title) parts.push(title)
      if (source) parts.push(source)
      if (volume) parts.push(volume)
      if (pages) parts.push(pages)

      const text = parts.filter(Boolean).join('. ')

      // Get DOI
      const doi = citation.find('pub-id[pub-id-type="doi"]').text().trim() ||
        citation.find('ext-link[ext-link-type="doi"]').text().trim()

      // Get URL
      const url = citation.find('ext-link[ext-link-type="uri"]').attr('xlink:href') ||
        citation.find('uri').text().trim()

      references.push({
        index: index + 1,
        text: cleanText(text) || cleanText($el.text()),
        doi: doi || undefined,
        url: url || undefined,
        title: title || undefined,
        authors: authors ? authors.split(', ') : undefined,
        year: year || undefined,
      })
    } else {
      // Fallback to raw text
      references.push({
        index: index + 1,
        text: cleanText($el.text()),
      })
    }
  })

  return references
}

function extractKeywords($: CheerioAPI): string[] {
  const keywords: string[] = []

  $('kwd').each((_, el) => {
    const kwd = $(el).text().trim()
    if (kwd) {
      keywords.push(kwd)
    }
  })

  return keywords
}

function extractJournalInfo($: CheerioAPI): string | undefined {
  const journalTitle = $('journal-title').first().text().trim() ||
    $('journal-title-group journal-title').first().text().trim()

  return journalTitle || undefined
}

function extractPages($: CheerioAPI): string | undefined {
  const fpage = $('fpage').first().text().trim()
  const lpage = $('lpage').first().text().trim()

  if (fpage && lpage) {
    return `${fpage}-${lpage}`
  } else if (fpage) {
    return fpage
  }

  return undefined
}

function extractDoi($: CheerioAPI): string | undefined {
  const doi = $('article-id[pub-id-type="doi"]').first().text().trim()
  return doi || undefined
}

// ============================================================================
// Utility Functions
// ============================================================================

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Fetch and parse JATS XML from a URL
 */
export async function fetchAndParseJats(
  url: string,
  options: { timeout?: number } = {}
): Promise<JatsParseResult> {
  const { timeout = 30000 } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/xml, text/xml',
        'User-Agent': 'ExergyLab/1.0 (Research Paper Viewer)',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch JATS XML: ${response.status} ${response.statusText}`)
    }

    const xml = await response.text()
    return parseJatsXml(xml)
  } finally {
    clearTimeout(timeoutId)
  }
}
