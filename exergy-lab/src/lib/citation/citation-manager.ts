/**
 * Citation Manager (v0.0.5)
 *
 * Comprehensive citation management system supporting multiple styles
 * and formats for academic references.
 *
 * @see citation-styles.ts - Style implementations
 * @see components/discovery/ExportPanel.tsx - Integration
 */

import { formatCitationAPA, formatCitationIEEE, formatCitationNature, formatCitationChicago, formatCitationMLA } from './citation-styles'

// ============================================================================
// Types
// ============================================================================

export type CitationStyle = 'apa' | 'ieee' | 'nature' | 'chicago' | 'mla' | 'bibtex'

export type SourceType =
  | 'journal'
  | 'conference'
  | 'book'
  | 'chapter'
  | 'thesis'
  | 'report'
  | 'website'
  | 'patent'
  | 'preprint'
  | 'dataset'
  | 'software'

export interface Author {
  firstName: string
  lastName: string
  middleName?: string
  suffix?: string // Jr., Sr., III, etc.
  orcid?: string
}

export interface SourceCitation {
  id: string
  type: SourceType
  title: string
  authors: Author[]
  year: number
  month?: number
  day?: number

  // Journal/Conference
  journal?: string
  volume?: string
  issue?: string
  pages?: string
  conference?: string
  location?: string

  // Book
  publisher?: string
  edition?: string
  isbn?: string

  // Digital
  doi?: string
  url?: string
  accessDate?: string
  arxivId?: string

  // Patent
  patentNumber?: string
  patentOffice?: string

  // Additional
  abstract?: string
  keywords?: string[]
  notes?: string
  addedAt: string
  tags?: string[]
  folder?: string
}

export interface CitationLibrary {
  citations: SourceCitation[]
  folders: string[]
  defaultStyle: CitationStyle
  lastUpdated: string
}

export interface FormattedCitation {
  inline: string      // In-text citation (Author, Year) or [1]
  full: string        // Full reference entry
  bibtex: string      // BibTeX entry
  ris: string         // RIS entry
}

// ============================================================================
// Citation Manager Class
// ============================================================================

export class CitationManager {
  private citations: Map<string, SourceCitation> = new Map()
  private defaultStyle: CitationStyle = 'apa'
  private folders: Set<string> = new Set(['Uncategorized'])

  constructor(initialCitations?: SourceCitation[], defaultStyle?: CitationStyle) {
    if (initialCitations) {
      for (const citation of initialCitations) {
        this.citations.set(citation.id, citation)
      }
    }
    if (defaultStyle) {
      this.defaultStyle = defaultStyle
    }
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Add a new citation to the library
   */
  addCitation(citation: Omit<SourceCitation, 'id' | 'addedAt'>): string {
    const id = `cite-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const fullCitation: SourceCitation = {
      ...citation,
      id,
      addedAt: new Date().toISOString(),
    }
    this.citations.set(id, fullCitation)

    // Add folder if new
    if (citation.folder) {
      this.folders.add(citation.folder)
    }

    return id
  }

  /**
   * Update an existing citation
   */
  updateCitation(id: string, updates: Partial<SourceCitation>): boolean {
    const existing = this.citations.get(id)
    if (!existing) return false

    this.citations.set(id, { ...existing, ...updates })

    if (updates.folder) {
      this.folders.add(updates.folder)
    }

    return true
  }

  /**
   * Delete a citation
   */
  deleteCitation(id: string): boolean {
    return this.citations.delete(id)
  }

  /**
   * Get a citation by ID
   */
  getCitation(id: string): SourceCitation | undefined {
    return this.citations.get(id)
  }

  /**
   * Get all citations
   */
  getAllCitations(): SourceCitation[] {
    return Array.from(this.citations.values())
  }

  /**
   * Get citations by folder
   */
  getCitationsByFolder(folder: string): SourceCitation[] {
    return this.getAllCitations().filter(c => c.folder === folder)
  }

  /**
   * Search citations by query
   */
  searchCitations(query: string): SourceCitation[] {
    const lowerQuery = query.toLowerCase()
    return this.getAllCitations().filter(c => {
      const searchText = [
        c.title,
        c.abstract,
        c.authors.map(a => `${a.firstName} ${a.lastName}`).join(' '),
        c.journal,
        c.conference,
        ...(c.keywords || []),
        ...(c.tags || []),
      ].filter(Boolean).join(' ').toLowerCase()

      return searchText.includes(lowerQuery)
    })
  }

  // ============================================================================
  // Formatting
  // ============================================================================

  /**
   * Format a citation in the specified style
   */
  formatCitation(id: string, style?: CitationStyle): FormattedCitation | null {
    const citation = this.citations.get(id)
    if (!citation) return null

    const activeStyle = style || this.defaultStyle

    return {
      inline: this.formatInline(citation, activeStyle),
      full: this.formatFull(citation, activeStyle),
      bibtex: this.formatBibTeX(citation),
      ris: this.formatRIS(citation),
    }
  }

  /**
   * Format in-text citation
   */
  private formatInline(citation: SourceCitation, style: CitationStyle): string {
    switch (style) {
      case 'ieee':
        // IEEE uses numbered citations
        return `[${Array.from(this.citations.keys()).indexOf(citation.id) + 1}]`

      case 'nature':
        // Nature uses superscript numbers
        return `${Array.from(this.citations.keys()).indexOf(citation.id) + 1}`

      case 'apa':
      case 'chicago':
      case 'mla':
      default:
        // Author-year format
        if (citation.authors.length === 0) {
          return `(${citation.title.slice(0, 20)}..., ${citation.year})`
        } else if (citation.authors.length === 1) {
          return `(${citation.authors[0].lastName}, ${citation.year})`
        } else if (citation.authors.length === 2) {
          return `(${citation.authors[0].lastName} & ${citation.authors[1].lastName}, ${citation.year})`
        } else {
          return `(${citation.authors[0].lastName} et al., ${citation.year})`
        }
    }
  }

  /**
   * Format full reference entry
   */
  private formatFull(citation: SourceCitation, style: CitationStyle): string {
    switch (style) {
      case 'apa':
        return formatCitationAPA(citation)
      case 'ieee':
        return formatCitationIEEE(citation)
      case 'nature':
        return formatCitationNature(citation)
      case 'chicago':
        return formatCitationChicago(citation)
      case 'mla':
        return formatCitationMLA(citation)
      case 'bibtex':
        return this.formatBibTeX(citation)
      default:
        return formatCitationAPA(citation)
    }
  }

  /**
   * Format as BibTeX entry
   */
  private formatBibTeX(citation: SourceCitation): string {
    const key = citation.doi
      ? citation.doi.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)
      : `${citation.authors[0]?.lastName || 'unknown'}${citation.year}`

    const type = this.getBibTeXType(citation.type)
    const lines = [`@${type}{${key},`]

    lines.push(`  title = {${citation.title}},`)

    if (citation.authors.length > 0) {
      const authorStr = citation.authors
        .map(a => `${a.lastName}, ${a.firstName}${a.middleName ? ' ' + a.middleName : ''}`)
        .join(' and ')
      lines.push(`  author = {${authorStr}},`)
    }

    lines.push(`  year = {${citation.year}},`)

    if (citation.journal) lines.push(`  journal = {${citation.journal}},`)
    if (citation.volume) lines.push(`  volume = {${citation.volume}},`)
    if (citation.issue) lines.push(`  number = {${citation.issue}},`)
    if (citation.pages) lines.push(`  pages = {${citation.pages}},`)
    if (citation.publisher) lines.push(`  publisher = {${citation.publisher}},`)
    if (citation.doi) lines.push(`  doi = {${citation.doi}},`)
    if (citation.url) lines.push(`  url = {${citation.url}},`)
    if (citation.isbn) lines.push(`  isbn = {${citation.isbn}},`)

    lines.push('}')

    return lines.join('\n')
  }

  /**
   * Format as RIS entry
   */
  private formatRIS(citation: SourceCitation): string {
    const lines: string[] = []
    lines.push(`TY  - ${this.getRISType(citation.type)}`)
    lines.push(`TI  - ${citation.title}`)

    for (const author of citation.authors) {
      lines.push(`AU  - ${author.lastName}, ${author.firstName}`)
    }

    lines.push(`PY  - ${citation.year}`)

    if (citation.journal) lines.push(`JO  - ${citation.journal}`)
    if (citation.volume) lines.push(`VL  - ${citation.volume}`)
    if (citation.issue) lines.push(`IS  - ${citation.issue}`)
    if (citation.pages) {
      const [start, end] = citation.pages.split('-')
      if (start) lines.push(`SP  - ${start.trim()}`)
      if (end) lines.push(`EP  - ${end.trim()}`)
    }
    if (citation.publisher) lines.push(`PB  - ${citation.publisher}`)
    if (citation.doi) {
      lines.push(`DO  - ${citation.doi}`)
      lines.push(`UR  - https://doi.org/${citation.doi}`)
    } else if (citation.url) {
      lines.push(`UR  - ${citation.url}`)
    }
    if (citation.abstract) lines.push(`AB  - ${citation.abstract}`)
    if (citation.keywords) {
      for (const kw of citation.keywords) {
        lines.push(`KW  - ${kw}`)
      }
    }

    lines.push('ER  - ')

    return lines.join('\n')
  }

  private getBibTeXType(type: SourceType): string {
    const typeMap: Record<SourceType, string> = {
      journal: 'article',
      conference: 'inproceedings',
      book: 'book',
      chapter: 'incollection',
      thesis: 'phdthesis',
      report: 'techreport',
      website: 'misc',
      patent: 'misc',
      preprint: 'article',
      dataset: 'misc',
      software: 'software',
    }
    return typeMap[type] || 'misc'
  }

  private getRISType(type: SourceType): string {
    const typeMap: Record<SourceType, string> = {
      journal: 'JOUR',
      conference: 'CONF',
      book: 'BOOK',
      chapter: 'CHAP',
      thesis: 'THES',
      report: 'RPRT',
      website: 'ELEC',
      patent: 'PAT',
      preprint: 'JOUR',
      dataset: 'DATA',
      software: 'COMP',
    }
    return typeMap[type] || 'GEN'
  }

  // ============================================================================
  // Bibliography Generation
  // ============================================================================

  /**
   * Generate full bibliography in specified style
   */
  generateBibliography(style?: CitationStyle, citationIds?: string[]): string {
    const activeStyle = style || this.defaultStyle
    const ids = citationIds || Array.from(this.citations.keys())

    const entries = ids
      .map(id => this.formatCitation(id, activeStyle))
      .filter((f): f is FormattedCitation => f !== null)
      .map(f => f.full)

    // Sort alphabetically for author-year styles
    if (['apa', 'chicago', 'mla'].includes(activeStyle)) {
      entries.sort()
    }

    return entries.join('\n\n')
  }

  /**
   * Export all citations as BibTeX
   */
  exportBibTeX(): string {
    const entries = Array.from(this.citations.values())
      .map(c => this.formatBibTeX(c))

    return [
      '% Bibliography generated by Exergy Lab Citation Manager',
      `% Generated: ${new Date().toISOString()}`,
      `% Total entries: ${entries.length}`,
      '',
      ...entries,
    ].join('\n\n')
  }

  /**
   * Export all citations as RIS
   */
  exportRIS(): string {
    return Array.from(this.citations.values())
      .map(c => this.formatRIS(c))
      .join('\n\n')
  }

  // ============================================================================
  // Import Functions
  // ============================================================================

  /**
   * Import citation from DOI
   */
  async importFromDOI(doi: string): Promise<SourceCitation | null> {
    try {
      const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`)
      if (!response.ok) return null

      const data = await response.json()
      const work = data.message

      const authors: Author[] = (work.author || []).map((a: any) => ({
        firstName: a.given || '',
        lastName: a.family || '',
        orcid: a.ORCID,
      }))

      const citation: Omit<SourceCitation, 'id' | 'addedAt'> = {
        type: 'journal',
        title: work.title?.[0] || 'Unknown Title',
        authors,
        year: work.published?.['date-parts']?.[0]?.[0] || new Date().getFullYear(),
        month: work.published?.['date-parts']?.[0]?.[1],
        journal: work['container-title']?.[0],
        volume: work.volume,
        issue: work.issue,
        pages: work.page,
        doi: work.DOI,
        url: work.URL,
        abstract: work.abstract,
      }

      const id = this.addCitation(citation)
      return this.getCitation(id) || null
    } catch (error) {
      console.error('[CitationManager] Failed to import from DOI:', error)
      return null
    }
  }

  /**
   * Import citations from BibTeX string
   */
  importFromBibTeX(bibtex: string): number {
    // Basic BibTeX parser
    const entries = bibtex.match(/@\w+\{[^@]+\}/g) || []
    let imported = 0

    for (const entry of entries) {
      try {
        const typeMatch = entry.match(/@(\w+)\{/)
        const type = typeMatch?.[1]?.toLowerCase() || 'misc'

        const fields: Record<string, string> = {}
        const fieldPattern = /(\w+)\s*=\s*\{([^}]*)\}/g
        let match
        while ((match = fieldPattern.exec(entry)) !== null) {
          fields[match[1].toLowerCase()] = match[2]
        }

        if (!fields.title) continue

        // Parse authors
        const authors: Author[] = []
        if (fields.author) {
          const authorParts = fields.author.split(' and ')
          for (const part of authorParts) {
            const [lastName, firstName] = part.split(',').map(s => s.trim())
            if (lastName) {
              authors.push({ firstName: firstName || '', lastName })
            }
          }
        }

        const citation: Omit<SourceCitation, 'id' | 'addedAt'> = {
          type: type === 'article' ? 'journal' : type === 'inproceedings' ? 'conference' : 'journal',
          title: fields.title,
          authors,
          year: parseInt(fields.year) || new Date().getFullYear(),
          journal: fields.journal,
          volume: fields.volume,
          issue: fields.number,
          pages: fields.pages,
          publisher: fields.publisher,
          doi: fields.doi,
          url: fields.url,
          isbn: fields.isbn,
        }

        this.addCitation(citation)
        imported++
      } catch (error) {
        console.warn('[CitationManager] Failed to parse BibTeX entry:', error)
      }
    }

    return imported
  }

  // ============================================================================
  // Folder Management
  // ============================================================================

  /**
   * Get all folders
   */
  getFolders(): string[] {
    return Array.from(this.folders)
  }

  /**
   * Create a new folder
   */
  createFolder(name: string): boolean {
    if (this.folders.has(name)) return false
    this.folders.add(name)
    return true
  }

  /**
   * Delete a folder (moves citations to Uncategorized)
   */
  deleteFolder(name: string): boolean {
    if (name === 'Uncategorized') return false
    if (!this.folders.has(name)) return false

    // Move citations to Uncategorized
    for (const citation of this.citations.values()) {
      if (citation.folder === name) {
        citation.folder = 'Uncategorized'
      }
    }

    this.folders.delete(name)
    return true
  }

  // ============================================================================
  // Serialization
  // ============================================================================

  /**
   * Export library to JSON
   */
  toJSON(): CitationLibrary {
    return {
      citations: Array.from(this.citations.values()),
      folders: Array.from(this.folders),
      defaultStyle: this.defaultStyle,
      lastUpdated: new Date().toISOString(),
    }
  }

  /**
   * Import library from JSON
   */
  static fromJSON(data: CitationLibrary): CitationManager {
    const manager = new CitationManager(data.citations, data.defaultStyle)
    for (const folder of data.folders) {
      manager.folders.add(folder)
    }
    return manager
  }

  /**
   * Set default citation style
   */
  setDefaultStyle(style: CitationStyle): void {
    this.defaultStyle = style
  }

  /**
   * Get default citation style
   */
  getDefaultStyle(): CitationStyle {
    return this.defaultStyle
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let citationManagerInstance: CitationManager | null = null

/**
 * Get the citation manager instance
 */
export function getCitationManager(): CitationManager {
  if (!citationManagerInstance) {
    // Try to load from localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('exergy-lab-citations')
        if (stored) {
          const data = JSON.parse(stored)
          citationManagerInstance = CitationManager.fromJSON(data)
        }
      } catch (error) {
        console.warn('[CitationManager] Failed to load from localStorage:', error)
      }
    }

    if (!citationManagerInstance) {
      citationManagerInstance = new CitationManager()
    }
  }
  return citationManagerInstance
}

/**
 * Save citation manager to localStorage
 */
export function saveCitationManager(): void {
  if (typeof window === 'undefined') return
  if (!citationManagerInstance) return

  try {
    const data = citationManagerInstance.toJSON()
    localStorage.setItem('exergy-lab-citations', JSON.stringify(data))
  } catch (error) {
    console.warn('[CitationManager] Failed to save to localStorage:', error)
  }
}
