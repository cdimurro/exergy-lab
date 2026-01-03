/**
 * Data Source Types
 *
 * Defines types for all scientific data sources including:
 * - Academic papers (Semantic Scholar, arXiv, PubMed, IEEE)
 * - Preprints (ChemRxiv, BioRxiv)
 * - Patents (Google Patents)
 * - Datasets (NREL, IEA)
 * - Consensus (Consensus API)
 */

import { Domain } from './discovery'

/**
 * All supported data sources
 */
export type DataSourceName =
  | 'semantic-scholar'
  | 'openalex'
  | 'arxiv'
  | 'pubmed'
  | 'crossref'
  | 'core'
  | 'consensus'
  | 'google-patents'
  | 'uspto'
  | 'epo'
  | 'chemrxiv'
  | 'biorxiv'
  | 'medrxiv'
  | 'nrel'
  | 'ieee'
  | 'iea'
  | 'eia'
  | 'materials-project'
  | 'zenodo'
  | 'inspire'
  | 'newsapi'
  | 'web-search'
  | 'pubchem'
  | 'chemspider'
  | 'nist-webbook'

/**
 * Type of data source
 */
export type DataSourceType =
  | 'academic-paper'
  | 'preprint'
  | 'patent'
  | 'dataset'
  | 'news'
  | 'report'
  | 'standard'
  | 'consensus'
  | 'chemical-database'

/**
 * Source metadata
 */
export interface SourceMetadata {
  source: DataSourceName
  sourceType: DataSourceType
  quality: number // 0-100
  verificationStatus: 'peer-reviewed' | 'preprint' | 'unverified'
  accessType: 'open' | 'subscription' | 'restricted'
  indexed?: boolean
  citationCount?: number
  publicationDate?: string
}

/**
 * Generic source document
 */
export interface Source {
  id: string
  title: string
  authors: string[]
  abstract?: string
  url?: string
  doi?: string
  metadata: SourceMetadata
  relevanceScore?: number
  createdAt?: string
  updatedAt?: string
}

/**
 * Academic paper
 */
export interface AcademicPaper extends Source {
  metadata: SourceMetadata & {
    sourceType: 'academic-paper'
  }
  journal?: string
  volume?: string
  issue?: string
  pages?: string
  venue?: string
  isOpenAccess?: boolean
  pdfUrl?: string
  fieldsOfStudy?: string[]
  citedByCount?: number
  influentialCitationCount?: number
  s2FieldsOfStudy?: Array<{ category: string; source: string }>
}

/**
 * Preprint
 */
export interface Preprint extends Source {
  metadata: SourceMetadata & {
    sourceType: 'preprint'
  }
  server: 'arxiv' | 'chemrxiv' | 'biorxiv' | 'medrxiv'
  category?: string
  version?: number
  submittedDate?: string
  publishedDate?: string
}

/**
 * Patent
 */
export interface Patent extends Source {
  metadata: SourceMetadata & {
    sourceType: 'patent'
  }
  patentNumber: string
  applicationNumber?: string
  filingDate?: string
  grantDate?: string
  assignee?: string
  inventors?: string[]
  claims?: string[]
  classifications?: {
    ipc?: string[] // International Patent Classification
    cpc?: string[] // Cooperative Patent Classification
    uspc?: string[] // US Patent Classification
  }
  legalStatus?: 'pending' | 'granted' | 'expired' | 'abandoned'
  priority?: {
    date: string
    country: string
    number: string
  }
}

/**
 * Dataset
 */
export interface Dataset extends Source {
  metadata: SourceMetadata & {
    sourceType: 'dataset'
  }
  dataProvider: 'nrel' | 'iea' | 'other'
  format?: 'csv' | 'json' | 'hdf5' | 'netcdf' | 'api'
  size?: number // bytes
  lastUpdated?: string
  license?: string
  downloadUrl?: string
  apiEndpoint?: string
  tags?: string[]
  variables?: Array<{
    name: string
    unit: string
    description: string
  }>
}

/**
 * Consensus result (scientific consensus)
 */
export interface ConsensusResult extends Source {
  metadata: SourceMetadata & {
    sourceType: 'consensus'
  }
  consensusScore?: number // 0-100
  evidenceCount?: number
  supportingPapers?: string[]
  contradictingPapers?: string[]
  summary?: string
}

/**
 * Search filters for data sources
 */
export interface SearchFilters {
  domains?: Domain[]
  yearFrom?: number
  yearTo?: number
  minCitations?: number
  sources?: DataSourceName[]
  sourceTypes?: DataSourceType[]
  openAccessOnly?: boolean
  peerReviewedOnly?: boolean
  limit?: number
}

/**
 * Search result from a data source
 */
export interface SearchResult {
  sources: Source[]
  total: number
  searchTime: number // milliseconds
  query: string
  filters?: SearchFilters
  from: DataSourceName
}

/**
 * Rate limit information for a data source
 */
export interface RateLimitInfo {
  requestsPerMinute: number
  requestsPerDay: number
  remaining?: number
  resetAt?: number // timestamp
}

/**
 * Data source configuration
 */
export interface DataSourceConfig {
  name: DataSourceName
  enabled: boolean
  apiKey?: string
  baseUrl?: string
  rateLimit: RateLimitInfo
  timeout?: number // milliseconds
  retries?: number
  cacheTTL?: number // milliseconds
}

/**
 * Cache entry
 */
export interface CacheEntry<T = any> {
  key: string
  value: T
  timestamp: number
  ttl: number
  hits: number
}

/**
 * Error from data source
 */
export class DataSourceError extends Error {
  constructor(
    message: string,
    public source: DataSourceName,
    public originalError?: Error
  ) {
    super(`[${source}] ${message}`)
    this.name = 'DataSourceError'
  }
}

/**
 * Source quality scores by type
 */
export const SOURCE_QUALITY_SCORES: Record<DataSourceType, number> = {
  'academic-paper': 95, // Peer-reviewed
  'preprint': 75, // Not peer-reviewed yet
  'patent': 85, // Legally vetted
  'dataset': 90, // Authoritative data
  'news': 60, // Less rigorous
  'report': 80, // Usually well-researched
  'standard': 100, // Official standards
  'consensus': 95, // Aggregated evidence
  'chemical-database': 90, // Authoritative compound data
}

/**
 * Helper: Create source ID
 */
export function createSourceId(sourceName: DataSourceName, externalId: string): string {
  return `${sourceName}:${externalId}`
}

/**
 * Helper: Parse source ID
 */
export function parseSourceId(sourceId: string): { source: DataSourceName; id: string } | null {
  const parts = sourceId.split(':')
  if (parts.length !== 2) return null
  return { source: parts[0] as DataSourceName, id: parts[1] }
}

/**
 * Helper: Check if source is open access
 */
export function isOpenAccess(source: Source): boolean {
  return source.metadata.accessType === 'open'
}

/**
 * Helper: Check if source is peer-reviewed
 */
export function isPeerReviewed(source: Source): boolean {
  return source.metadata.verificationStatus === 'peer-reviewed'
}

/**
 * Helper: Get source quality score
 */
export function getSourceQualityScore(source: Source): number {
  const baseScore = SOURCE_QUALITY_SCORES[source.metadata.sourceType] || 50
  const qualityModifier = source.metadata.quality || 100
  return Math.floor((baseScore * qualityModifier) / 100)
}
