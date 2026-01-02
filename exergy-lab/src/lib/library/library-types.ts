/**
 * Personal Library Types (v0.6.0)
 *
 * Type definitions for the personal library system.
 * Supports papers, reports, discoveries, experiments, and simulations.
 */

// ============================================================================
// Core Types
// ============================================================================

export type LibraryItemType =
  | 'paper'
  | 'report'
  | 'discovery'
  | 'experiment'
  | 'simulation'
  | 'note'

export type SortField = 'savedAt' | 'lastAccessedAt' | 'title' | 'type'

export type SortDirection = 'asc' | 'desc'

// ============================================================================
// Folder Types
// ============================================================================

export interface LibraryFolder {
  id: string
  name: string
  parentId: string | null
  createdAt: string
  updatedAt: string
  color?: FolderColor
  icon?: string
  description?: string
  isExpanded?: boolean
}

export type FolderColor =
  | 'default'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'

export const FOLDER_COLORS: Record<FolderColor, string> = {
  default: '#6B7280',
  red: '#EF4444',
  orange: '#F97316',
  yellow: '#EAB308',
  green: '#22C55E',
  blue: '#3B82F6',
  purple: '#A855F7',
  pink: '#EC4899',
}

// ============================================================================
// Library Item Types
// ============================================================================

export interface LibraryItem {
  id: string
  folderId: string | null
  type: LibraryItemType
  title: string
  description?: string
  data: LibraryItemData
  tags: string[]
  notes?: string
  savedAt: string
  lastAccessedAt: string
  metadata: LibraryItemMetadata
}

export interface LibraryItemMetadata {
  source?: string
  sourceUrl?: string
  authors?: string[]
  publicationDate?: string
  doi?: string
  citations?: number
  thumbnail?: string
}

// ============================================================================
// Item Data Types
// ============================================================================

export type LibraryItemData =
  | PaperData
  | ReportData
  | DiscoveryData
  | ExperimentData
  | SimulationData
  | NoteData

export interface PaperData {
  type: 'paper'
  title: string
  authors: Array<{
    name: string
    affiliation?: string
  }>
  abstract?: string
  journal?: string
  volume?: string
  issue?: string
  pages?: string
  year: number
  doi?: string
  url?: string
  pdfUrl?: string
  arxivId?: string
  pubmedId?: string
  keywords?: string[]
  openAccess?: boolean
}

export interface ReportData {
  type: 'report'
  reportType: 'tea' | 'simulation' | 'discovery' | 'custom'
  title: string
  generatedAt: string
  sections: string[]
  pdfUrl?: string
  summary?: string
  metrics?: Record<string, number | string>
}

export interface DiscoveryData {
  type: 'discovery'
  discoveryId: string
  phase: string
  domain: string
  hypothesis?: string
  findings: string[]
  score?: number
  scoreLevel?: string
  createdAt: string
}

export interface ExperimentData {
  type: 'experiment'
  experimentId: string
  domain: string
  protocol: {
    materials: string[]
    equipment: string[]
    steps: string[]
  }
  estimatedCost?: number
  estimatedTime?: string
  createdAt: string
}

export interface SimulationData {
  type: 'simulation'
  simulationId: string
  simulationType: string
  parameters: Record<string, number | string>
  results: Record<string, number | string>
  completedAt: string
  cost?: number
}

export interface NoteData {
  type: 'note'
  content: string
  format: 'markdown' | 'plaintext'
  linkedItems?: string[]
}

// ============================================================================
// Collection Types
// ============================================================================

export interface LibraryCollection {
  id: string
  name: string
  description?: string
  color?: FolderColor
  itemIds: string[]
  createdAt: string
  updatedAt: string
  isSmartCollection: boolean
  smartCriteria?: SmartCollectionCriteria
}

export interface SmartCollectionCriteria {
  types?: LibraryItemType[]
  tags?: string[]
  dateRange?: {
    field: 'savedAt' | 'lastAccessedAt'
    from?: string
    to?: string
  }
  searchQuery?: string
}

// ============================================================================
// Search and Filter Types
// ============================================================================

export interface LibrarySearchQuery {
  text?: string
  types?: LibraryItemType[]
  tags?: string[]
  folderId?: string | null
  dateRange?: {
    from?: string
    to?: string
  }
  sortBy?: SortField
  sortDirection?: SortDirection
  limit?: number
  offset?: number
}

export interface LibrarySearchResult {
  items: LibraryItem[]
  total: number
  hasMore: boolean
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface LibraryStatistics {
  totalItems: number
  totalFolders: number
  byType: Record<LibraryItemType, number>
  byTag: Record<string, number>
  recentlyAdded: number
  recentlyAccessed: number
  storageUsed?: number
}

// ============================================================================
// Import/Export Types
// ============================================================================

export interface LibraryExport {
  version: string
  exportedAt: string
  folders: LibraryFolder[]
  items: LibraryItem[]
  collections: LibraryCollection[]
}

export interface LibraryImportResult {
  success: boolean
  foldersImported: number
  itemsImported: number
  collectionsImported: number
  errors: string[]
}

// ============================================================================
// Action Types
// ============================================================================

export interface SaveToLibraryOptions {
  folderId?: string | null
  tags?: string[]
  notes?: string
}

export interface MoveItemOptions {
  targetFolderId: string | null
  keepCopy?: boolean
}

export interface BulkActionResult {
  success: boolean
  affected: number
  errors: string[]
}

// ============================================================================
// Event Types
// ============================================================================

export type LibraryEvent =
  | { type: 'item_added'; item: LibraryItem }
  | { type: 'item_removed'; itemId: string }
  | { type: 'item_updated'; item: LibraryItem }
  | { type: 'item_moved'; itemId: string; fromFolderId: string | null; toFolderId: string | null }
  | { type: 'folder_created'; folder: LibraryFolder }
  | { type: 'folder_deleted'; folderId: string }
  | { type: 'folder_renamed'; folderId: string; newName: string }

// ============================================================================
// Utility Types
// ============================================================================

export interface FolderPath {
  id: string
  name: string
}

export interface FolderTreeNode extends LibraryFolder {
  children: FolderTreeNode[]
  itemCount: number
  depth: number
}

export interface LibraryViewState {
  currentFolderId: string | null
  selectedItemIds: string[]
  viewMode: 'grid' | 'list' | 'compact'
  sortBy: SortField
  sortDirection: SortDirection
  filterTypes: LibraryItemType[]
  filterTags: string[]
  searchQuery: string
}
