/**
 * Literature Feed Types (v0.0.5)
 *
 * Type definitions for real-time literature feeds including
 * arXiv, PubMed, patents, and recommendation feeds.
 */

// ============================================================================
// Core Types
// ============================================================================

export type FeedType =
  | 'arxiv-daily'
  | 'pubmed-alerts'
  | 'patent-filings'
  | 'recommendations'
  | 'citations'

export type FeedFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly'

export type FeedDomain =
  | 'solar'
  | 'wind'
  | 'battery'
  | 'hydrogen'
  | 'energy-storage'
  | 'materials'
  | 'catalysis'
  | 'general'

export type FeedPriority = 'low' | 'medium' | 'high' | 'critical'

// ============================================================================
// Feed Configuration
// ============================================================================

export interface LiteratureFeed {
  id: string
  userId: string
  name: string
  type: FeedType
  enabled: boolean
  createdAt: string
  updatedAt: string
  config: FeedConfig
  statistics: FeedStatistics
}

export interface FeedConfig {
  domains: FeedDomain[]
  keywords: string[]
  authors?: string[]
  institutions?: string[]
  journals?: string[]
  frequency: FeedFrequency
  maxItemsPerDigest: number
  includeAbstracts: boolean
  priorityKeywords?: string[]
  excludeKeywords?: string[]
  minCitations?: number
  dateRange?: {
    type: 'last_days' | 'date_range'
    days?: number
    from?: string
    to?: string
  }
}

export interface FeedStatistics {
  totalItems: number
  unreadItems: number
  lastFetched: string | null
  averageItemsPerDay: number
  topKeywords: Array<{ keyword: string; count: number }>
}

// ============================================================================
// Feed Items
// ============================================================================

export interface FeedItem {
  id: string
  feedId: string
  source: FeedSource
  type: ItemType
  title: string
  authors: Author[]
  abstract?: string
  publicationDate: string
  fetchedAt: string
  url: string
  doi?: string
  arxivId?: string
  pubmedId?: string
  patentNumber?: string
  metadata: ItemMetadata
  relevance: RelevanceInfo
  status: ItemStatus
}

export type FeedSource =
  | 'arxiv'
  | 'pubmed'
  | 'biorxiv'
  | 'chemrxiv'
  | 'google-patents'
  | 'uspto'
  | 'semantic-scholar'
  | 'crossref'

export type ItemType =
  | 'preprint'
  | 'journal-article'
  | 'conference-paper'
  | 'patent'
  | 'thesis'
  | 'book-chapter'
  | 'dataset'

export interface Author {
  name: string
  affiliations?: string[]
  orcid?: string
  email?: string
}

export interface ItemMetadata {
  journal?: string
  volume?: string
  issue?: string
  pages?: string
  citations?: number
  references?: number
  pdfUrl?: string
  openAccess?: boolean
  categories?: string[]
  keywords?: string[]
  figures?: number
  supplementaryMaterials?: string[]
}

export interface RelevanceInfo {
  score: number
  matchedKeywords: string[]
  matchedAuthors?: string[]
  explanation?: string
  priority: FeedPriority
}

export interface ItemStatus {
  read: boolean
  starred: boolean
  savedToLibrary: boolean
  notes?: string
  tags?: string[]
}

// ============================================================================
// Feed Results
// ============================================================================

export interface FeedFetchResult {
  feedId: string
  success: boolean
  fetchedAt: string
  itemCount: number
  newItems: number
  items: FeedItem[]
  errors?: FeedError[]
  nextFetch?: string
}

export interface FeedError {
  source: FeedSource
  code: string
  message: string
  retryable: boolean
}

export interface FeedDigest {
  id: string
  feedId: string
  period: {
    from: string
    to: string
  }
  generatedAt: string
  summary: DigestSummary
  topItems: FeedItem[]
  allItems: FeedItem[]
}

export interface DigestSummary {
  totalItems: number
  bySource: Record<FeedSource, number>
  byPriority: Record<FeedPriority, number>
  topKeywords: Array<{ keyword: string; count: number }>
  topAuthors: Array<{ name: string; count: number }>
  trendingTopics: string[]
  aiSummary?: string
}

// ============================================================================
// arXiv-Specific Types
// ============================================================================

export interface ArxivCategory {
  id: string
  name: string
  description: string
  parentCategory?: string
}

export const ARXIV_ENERGY_CATEGORIES: ArxivCategory[] = [
  {
    id: 'cond-mat.mtrl-sci',
    name: 'Materials Science',
    description: 'Condensed matter materials science',
  },
  {
    id: 'physics.app-ph',
    name: 'Applied Physics',
    description: 'Applied physics research',
  },
  {
    id: 'physics.chem-ph',
    name: 'Chemical Physics',
    description: 'Chemical physics research',
  },
  {
    id: 'physics.optics',
    name: 'Optics',
    description: 'Optics and photonics',
  },
  {
    id: 'cond-mat.mes-hall',
    name: 'Mesoscale and Nanoscale Physics',
    description: 'Mesoscale and nanoscale physics',
  },
  {
    id: 'cs.LG',
    name: 'Machine Learning',
    description: 'Machine learning for energy applications',
  },
]

export interface ArxivFeedConfig extends FeedConfig {
  categories: string[]
  submissionTypes?: ('new' | 'cross' | 'replace')[]
}

// ============================================================================
// PubMed-Specific Types
// ============================================================================

export interface PubmedMeshTerm {
  id: string
  name: string
  tree: string
}

export const PUBMED_ENERGY_MESH_TERMS: PubmedMeshTerm[] = [
  { id: 'D004572', name: 'Electrochemistry', tree: 'G02.111.276' },
  { id: 'D005742', name: 'Fuel Cells', tree: 'J01.897.120.280.310' },
  { id: 'D006860', name: 'Hydrogen', tree: 'D01.362.340.450' },
  { id: 'D018053', name: 'Semiconductors', tree: 'J01.637.833' },
  { id: 'D010087', name: 'Oxides', tree: 'D01.248.497.158.685' },
  { id: 'D008670', name: 'Metals', tree: 'D01.552.544' },
]

export interface PubmedFeedConfig extends FeedConfig {
  meshTerms?: string[]
  publicationTypes?: string[]
  articleTypes?: ('journal article' | 'review' | 'clinical trial')[]
}

// ============================================================================
// Patent-Specific Types
// ============================================================================

export interface PatentClassification {
  code: string
  name: string
  description: string
}

export const ENERGY_PATENT_CLASSIFICATIONS: PatentClassification[] = [
  { code: 'H01L31', name: 'Photovoltaic Devices', description: 'Semiconductor devices for solar energy conversion' },
  { code: 'H01M10', name: 'Secondary Batteries', description: 'Rechargeable batteries' },
  { code: 'H01M8', name: 'Fuel Cells', description: 'Fuel cell technology' },
  { code: 'C25B', name: 'Electrolysis', description: 'Electrolytic processes' },
  { code: 'F03D', name: 'Wind Motors', description: 'Wind turbine technology' },
  { code: 'H02J', name: 'Energy Storage', description: 'Electric power storage' },
]

export interface PatentFeedConfig extends FeedConfig {
  classifications?: string[]
  jurisdictions?: ('US' | 'EP' | 'WO' | 'CN' | 'JP' | 'KR')[]
  patentTypes?: ('utility' | 'design' | 'plant')[]
  applicationStatus?: ('pending' | 'granted' | 'abandoned')[]
}

export interface PatentItem extends FeedItem {
  patentNumber: string
  applicationNumber: string
  filingDate: string
  grantDate?: string
  priority: Array<{
    country: string
    number: string
    date: string
  }>
  assignee: string
  inventors: Author[]
  claims: number
  drawings: number
  classifications: string[]
  citations: {
    cited: number
    citedBy: number
  }
}

// ============================================================================
// Recommendation Feed Types
// ============================================================================

export interface RecommendationFeedConfig extends FeedConfig {
  basedOn: 'reading-history' | 'saved-papers' | 'citations' | 'interests'
  diversityWeight: number // 0-1, higher = more diverse recommendations
  noveltyWeight: number // 0-1, higher = more novel/recent papers
  includeClassics?: boolean
}

export interface RecommendationItem extends FeedItem {
  recommendation: {
    reason: string
    similarity: number
    basedOnPapers?: string[]
    noveltyScore: number
  }
}

// ============================================================================
// Feed Management
// ============================================================================

export interface FeedSubscription {
  id: string
  userId: string
  feedId: string
  createdAt: string
  notificationSettings: NotificationSettings
}

export interface NotificationSettings {
  email: boolean
  emailFrequency: 'immediate' | 'daily' | 'weekly'
  push: boolean
  inApp: boolean
  priorityOnly: boolean
  minPriority: FeedPriority
}

export interface FeedAnalytics {
  feedId: string
  period: 'day' | 'week' | 'month' | 'year'
  itemsReceived: number
  itemsRead: number
  itemsSaved: number
  averageRelevance: number
  topSources: Array<{ source: FeedSource; count: number }>
  engagementRate: number
}

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_FEED_CONFIG: FeedConfig = {
  domains: ['general'],
  keywords: [],
  frequency: 'daily',
  maxItemsPerDigest: 50,
  includeAbstracts: true,
  dateRange: {
    type: 'last_days',
    days: 7,
  },
}

export const DEFAULT_ARXIV_CONFIG: ArxivFeedConfig = {
  ...DEFAULT_FEED_CONFIG,
  categories: ['cond-mat.mtrl-sci', 'physics.app-ph'],
  submissionTypes: ['new'],
}

export const DEFAULT_PUBMED_CONFIG: PubmedFeedConfig = {
  ...DEFAULT_FEED_CONFIG,
  meshTerms: [],
  articleTypes: ['journal article', 'review'],
}

export const DEFAULT_PATENT_CONFIG: PatentFeedConfig = {
  ...DEFAULT_FEED_CONFIG,
  jurisdictions: ['US', 'EP', 'WO'],
  patentTypes: ['utility'],
}
