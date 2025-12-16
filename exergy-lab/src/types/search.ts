/**
 * Academic Paper Search Types
 */

export interface Paper {
  id: string
  title: string
  authors: string[]
  abstract: string
  publicationDate: string
  citationCount: number
  url: string
  pdfUrl?: string
  venue?: string // Journal or conference
  doi?: string
  fields?: string[] // Research fields/domains
}

export interface SearchQuery {
  query: string
  filters?: SearchFilters
}

export interface SearchFilters {
  domains?: string[] // e.g., "clean energy", "materials science"
  yearRange?: {
    start: number
    end: number
  }
  minCitations?: number
  venues?: string[] // Specific journals/conferences
}

export interface SearchResult {
  papers: Paper[]
  totalCount: number
  expandedQuery?: string // AI-expanded version of the query
}

export interface SavedPaper extends Paper {
  savedAt: string
  notes?: string
  tags?: string[]
}
