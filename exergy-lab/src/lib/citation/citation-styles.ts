/**
 * Citation Styles (v0.6.0)
 *
 * Implementations for various citation styles:
 * - APA 7th Edition
 * - IEEE
 * - Nature
 * - Chicago 17th Edition
 * - MLA 9th Edition
 *
 * @see citation-manager.ts - Main citation manager
 */

import type { SourceCitation, Author } from './citation-manager'

// ============================================================================
// Helper Functions
// ============================================================================

function formatAuthorName(author: Author, style: 'lastFirst' | 'firstLast' | 'initials'): string {
  switch (style) {
    case 'lastFirst':
      return `${author.lastName}, ${author.firstName}${author.middleName ? ' ' + author.middleName : ''}`
    case 'firstLast':
      return `${author.firstName}${author.middleName ? ' ' + author.middleName : ''} ${author.lastName}`
    case 'initials':
      const firstInitial = author.firstName ? author.firstName[0] + '.' : ''
      const middleInitial = author.middleName ? author.middleName[0] + '.' : ''
      return `${author.lastName}, ${firstInitial}${middleInitial ? ' ' + middleInitial : ''}`
    default:
      return `${author.lastName}, ${author.firstName}`
  }
}

function formatAuthorsAPA(authors: Author[]): string {
  if (authors.length === 0) return ''

  if (authors.length === 1) {
    return formatAuthorName(authors[0], 'initials')
  }

  if (authors.length === 2) {
    return `${formatAuthorName(authors[0], 'initials')} & ${formatAuthorName(authors[1], 'initials')}`
  }

  if (authors.length <= 20) {
    const allButLast = authors.slice(0, -1).map(a => formatAuthorName(a, 'initials')).join(', ')
    const last = formatAuthorName(authors[authors.length - 1], 'initials')
    return `${allButLast}, & ${last}`
  }

  // More than 20 authors
  const first19 = authors.slice(0, 19).map(a => formatAuthorName(a, 'initials')).join(', ')
  const last = formatAuthorName(authors[authors.length - 1], 'initials')
  return `${first19}, ... ${last}`
}

function formatAuthorsIEEE(authors: Author[]): string {
  if (authors.length === 0) return ''

  if (authors.length === 1) {
    const a = authors[0]
    return `${a.firstName[0]}. ${a.middleName ? a.middleName[0] + '. ' : ''}${a.lastName}`
  }

  if (authors.length === 2) {
    return `${formatAuthorNameIEEE(authors[0])} and ${formatAuthorNameIEEE(authors[1])}`
  }

  if (authors.length <= 6) {
    const allButLast = authors.slice(0, -1).map(formatAuthorNameIEEE).join(', ')
    return `${allButLast}, and ${formatAuthorNameIEEE(authors[authors.length - 1])}`
  }

  // More than 6 authors
  return `${formatAuthorNameIEEE(authors[0])} et al.`
}

function formatAuthorNameIEEE(author: Author): string {
  return `${author.firstName[0]}. ${author.middleName ? author.middleName[0] + '. ' : ''}${author.lastName}`
}

function formatAuthorsNature(authors: Author[]): string {
  if (authors.length === 0) return ''

  const formatted = authors.slice(0, 5).map(a => {
    return `${a.lastName}, ${a.firstName[0]}.${a.middleName ? ' ' + a.middleName[0] + '.' : ''}`
  })

  if (authors.length > 5) {
    return formatted.join(', ') + ' et al.'
  }

  if (formatted.length === 1) return formatted[0]
  if (formatted.length === 2) return formatted.join(' & ')

  const allButLast = formatted.slice(0, -1).join(', ')
  return `${allButLast} & ${formatted[formatted.length - 1]}`
}

function formatAuthorsChicago(authors: Author[]): string {
  if (authors.length === 0) return ''

  if (authors.length === 1) {
    return formatAuthorName(authors[0], 'lastFirst')
  }

  if (authors.length === 2) {
    return `${formatAuthorName(authors[0], 'lastFirst')}, and ${formatAuthorName(authors[1], 'firstLast')}`
  }

  if (authors.length === 3) {
    return `${formatAuthorName(authors[0], 'lastFirst')}, ${formatAuthorName(authors[1], 'firstLast')}, and ${formatAuthorName(authors[2], 'firstLast')}`
  }

  // More than 3 authors
  return `${formatAuthorName(authors[0], 'lastFirst')} et al.`
}

function formatAuthorsMLA(authors: Author[]): string {
  if (authors.length === 0) return ''

  if (authors.length === 1) {
    return formatAuthorName(authors[0], 'lastFirst')
  }

  if (authors.length === 2) {
    return `${formatAuthorName(authors[0], 'lastFirst')}, and ${formatAuthorName(authors[1], 'firstLast')}`
  }

  // More than 2 authors
  return `${formatAuthorName(authors[0], 'lastFirst')}, et al.`
}

// ============================================================================
// Style Implementations
// ============================================================================

/**
 * APA 7th Edition Format
 *
 * Journal: Author, A. A. (Year). Title of article. Title of Periodical, Volume(Issue), Pages. https://doi.org/xxxxx
 * Book: Author, A. A. (Year). Title of work: Capital letter also for subtitle. Publisher.
 */
export function formatCitationAPA(citation: SourceCitation): string {
  const parts: string[] = []

  // Authors
  if (citation.authors.length > 0) {
    parts.push(formatAuthorsAPA(citation.authors))
  }

  // Year
  parts.push(`(${citation.year}).`)

  // Title
  if (citation.type === 'journal' || citation.type === 'preprint') {
    parts.push(`${citation.title}.`)
  } else if (citation.type === 'book') {
    parts.push(`*${citation.title}*.`)
  } else {
    parts.push(`${citation.title}.`)
  }

  // Journal/Conference
  if (citation.journal) {
    let journalPart = `*${citation.journal}*`
    if (citation.volume) {
      journalPart += `, *${citation.volume}*`
      if (citation.issue) {
        journalPart += `(${citation.issue})`
      }
    }
    if (citation.pages) {
      journalPart += `, ${citation.pages}`
    }
    parts.push(journalPart + '.')
  }

  // Publisher
  if (citation.publisher && citation.type === 'book') {
    parts.push(citation.publisher + '.')
  }

  // DOI/URL
  if (citation.doi) {
    parts.push(`https://doi.org/${citation.doi}`)
  } else if (citation.url) {
    parts.push(citation.url)
  }

  return parts.join(' ')
}

/**
 * IEEE Format
 *
 * Journal: A. A. Author, "Title of article," Title of Periodical, vol. X, no. X, pp. xxx-xxx, Month Year.
 * Book: A. A. Author, Title of Book. City, State/Country: Publisher, Year.
 */
export function formatCitationIEEE(citation: SourceCitation): string {
  const parts: string[] = []

  // Authors
  if (citation.authors.length > 0) {
    parts.push(formatAuthorsIEEE(citation.authors) + ',')
  }

  // Title (in quotes for articles)
  if (citation.type === 'journal' || citation.type === 'conference' || citation.type === 'preprint') {
    parts.push(`"${citation.title},"`)
  } else {
    parts.push(`*${citation.title}*.`)
  }

  // Journal
  if (citation.journal) {
    parts.push(`*${citation.journal}*,`)

    if (citation.volume) {
      parts.push(`vol. ${citation.volume},`)
    }
    if (citation.issue) {
      parts.push(`no. ${citation.issue},`)
    }
    if (citation.pages) {
      parts.push(`pp. ${citation.pages},`)
    }
  }

  // Conference
  if (citation.conference) {
    parts.push(`in *${citation.conference}*,`)
    if (citation.location) {
      parts.push(`${citation.location},`)
    }
  }

  // Publisher
  if (citation.publisher && citation.type === 'book') {
    parts.push(`${citation.publisher},`)
  }

  // Year
  parts.push(`${citation.year}.`)

  // DOI
  if (citation.doi) {
    parts.push(`doi: ${citation.doi}.`)
  }

  return parts.join(' ')
}

/**
 * Nature Format
 *
 * Journal: Author1, A., Author2, B. & Author3, C. Title of article. Journal Name volume, pages (year).
 */
export function formatCitationNature(citation: SourceCitation): string {
  const parts: string[] = []

  // Authors
  if (citation.authors.length > 0) {
    parts.push(formatAuthorsNature(citation.authors))
  }

  // Title (no italics, sentence case)
  parts.push(citation.title + '.')

  // Journal
  if (citation.journal) {
    let journalPart = `*${citation.journal}*`
    if (citation.volume) {
      journalPart += ` **${citation.volume}**`
    }
    if (citation.pages) {
      journalPart += `, ${citation.pages}`
    }
    journalPart += ` (${citation.year})`
    parts.push(journalPart + '.')
  } else {
    parts.push(`(${citation.year}).`)
  }

  // DOI
  if (citation.doi) {
    parts.push(`https://doi.org/${citation.doi}`)
  }

  return parts.join(' ')
}

/**
 * Chicago 17th Edition Format (Author-Date)
 *
 * Journal: Author, First. Year. "Article Title." Journal Title Volume (Issue): Pages. DOI.
 * Book: Author, First. Year. Title of Book. Place: Publisher.
 */
export function formatCitationChicago(citation: SourceCitation): string {
  const parts: string[] = []

  // Authors
  if (citation.authors.length > 0) {
    parts.push(formatAuthorsChicago(citation.authors) + '.')
  }

  // Year
  parts.push(`${citation.year}.`)

  // Title
  if (citation.type === 'journal' || citation.type === 'preprint') {
    parts.push(`"${citation.title}."`)
  } else {
    parts.push(`*${citation.title}*.`)
  }

  // Journal
  if (citation.journal) {
    let journalPart = `*${citation.journal}*`
    if (citation.volume) {
      journalPart += ` ${citation.volume}`
      if (citation.issue) {
        journalPart += ` (${citation.issue})`
      }
    }
    if (citation.pages) {
      journalPart += `: ${citation.pages}`
    }
    parts.push(journalPart + '.')
  }

  // Publisher
  if (citation.publisher && citation.type === 'book') {
    if (citation.location) {
      parts.push(`${citation.location}: ${citation.publisher}.`)
    } else {
      parts.push(`${citation.publisher}.`)
    }
  }

  // DOI/URL
  if (citation.doi) {
    parts.push(`https://doi.org/${citation.doi}.`)
  } else if (citation.url) {
    parts.push(citation.url + '.')
  }

  return parts.join(' ')
}

/**
 * MLA 9th Edition Format
 *
 * Journal: Author. "Title of Article." Title of Journal, vol. X, no. X, Year, pp. xx-xx.
 * Book: Author. Title of Book. Publisher, Year.
 */
export function formatCitationMLA(citation: SourceCitation): string {
  const parts: string[] = []

  // Authors
  if (citation.authors.length > 0) {
    parts.push(formatAuthorsMLA(citation.authors) + '.')
  }

  // Title
  if (citation.type === 'journal' || citation.type === 'preprint') {
    parts.push(`"${citation.title}."`)
  } else {
    parts.push(`*${citation.title}*.`)
  }

  // Journal
  if (citation.journal) {
    let journalPart = `*${citation.journal}*`
    if (citation.volume) {
      journalPart += `, vol. ${citation.volume}`
    }
    if (citation.issue) {
      journalPart += `, no. ${citation.issue}`
    }
    journalPart += `, ${citation.year}`
    if (citation.pages) {
      journalPart += `, pp. ${citation.pages}`
    }
    parts.push(journalPart + '.')
  }

  // Publisher
  if (citation.publisher && citation.type === 'book') {
    parts.push(`${citation.publisher}, ${citation.year}.`)
  }

  // DOI/URL
  if (citation.doi) {
    parts.push(`doi:${citation.doi}.`)
  } else if (citation.url) {
    parts.push(citation.url + '.')
  }

  return parts.join(' ')
}
