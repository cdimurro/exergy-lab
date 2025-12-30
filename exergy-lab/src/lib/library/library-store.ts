/**
 * Library Store (v0.0.5)
 *
 * Zustand store for managing personal library state.
 * Handles folders, items, collections, and search.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  LibraryFolder,
  LibraryItem,
  LibraryItemType,
  LibraryItemData,
  LibraryCollection,
  LibrarySearchQuery,
  LibraryStatistics,
  LibraryViewState,
  SaveToLibraryOptions,
  FolderTreeNode,
  FolderPath,
  SortField,
  SortDirection,
  FolderColor,
} from './library-types'

// ============================================================================
// Types
// ============================================================================

interface LibraryState {
  // Data
  folders: LibraryFolder[]
  items: LibraryItem[]
  collections: LibraryCollection[]

  // View State
  viewState: LibraryViewState

  // Actions - Folders
  createFolder: (name: string, parentId?: string | null, options?: Partial<LibraryFolder>) => LibraryFolder
  renameFolder: (folderId: string, newName: string) => void
  moveFolder: (folderId: string, newParentId: string | null) => void
  deleteFolder: (folderId: string, deleteContents?: boolean) => void
  updateFolderColor: (folderId: string, color: FolderColor) => void
  toggleFolderExpanded: (folderId: string) => void

  // Actions - Items
  saveItem: (type: LibraryItemType, title: string, data: LibraryItemData, options?: SaveToLibraryOptions) => LibraryItem
  updateItem: (itemId: string, updates: Partial<LibraryItem>) => void
  moveItem: (itemId: string, folderId: string | null) => void
  deleteItem: (itemId: string) => void
  updateItemTags: (itemId: string, tags: string[]) => void
  updateItemNotes: (itemId: string, notes: string) => void
  recordItemAccess: (itemId: string) => void

  // Actions - Bulk Operations
  moveItems: (itemIds: string[], folderId: string | null) => void
  deleteItems: (itemIds: string[]) => void
  tagItems: (itemIds: string[], tags: string[]) => void

  // Actions - Collections
  createCollection: (name: string, itemIds?: string[]) => LibraryCollection
  updateCollection: (collectionId: string, updates: Partial<LibraryCollection>) => void
  deleteCollection: (collectionId: string) => void
  addToCollection: (collectionId: string, itemIds: string[]) => void
  removeFromCollection: (collectionId: string, itemIds: string[]) => void

  // Actions - View State
  setCurrentFolder: (folderId: string | null) => void
  setSelectedItems: (itemIds: string[]) => void
  toggleItemSelection: (itemId: string) => void
  clearSelection: () => void
  setViewMode: (mode: 'grid' | 'list' | 'compact') => void
  setSortBy: (field: SortField) => void
  setSortDirection: (direction: SortDirection) => void
  setFilterTypes: (types: LibraryItemType[]) => void
  setFilterTags: (tags: string[]) => void
  setSearchQuery: (query: string) => void

  // Queries
  getFolder: (folderId: string) => LibraryFolder | undefined
  getItem: (itemId: string) => LibraryItem | undefined
  getItemsInFolder: (folderId: string | null) => LibraryItem[]
  getFolderTree: () => FolderTreeNode[]
  getFolderPath: (folderId: string) => FolderPath[]
  getChildFolders: (parentId: string | null) => LibraryFolder[]
  searchItems: (query: LibrarySearchQuery) => LibraryItem[]
  getRecentItems: (limit?: number) => LibraryItem[]
  getStarredItems: () => LibraryItem[]
  getAllTags: () => string[]
  getStatistics: () => LibraryStatistics

  // Utilities
  exportLibrary: () => string
  importLibrary: (json: string) => { success: boolean; errors: string[] }
  clearLibrary: () => void
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function sortItems(items: LibraryItem[], sortBy: SortField, direction: SortDirection): LibraryItem[] {
  return [...items].sort((a, b) => {
    let comparison = 0
    switch (sortBy) {
      case 'title':
        comparison = a.title.localeCompare(b.title)
        break
      case 'savedAt':
        comparison = new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime()
        break
      case 'lastAccessedAt':
        comparison = new Date(a.lastAccessedAt).getTime() - new Date(b.lastAccessedAt).getTime()
        break
      case 'type':
        comparison = a.type.localeCompare(b.type)
        break
    }
    return direction === 'asc' ? comparison : -comparison
  })
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      // Initial state
      folders: [],
      items: [],
      collections: [],
      viewState: {
        currentFolderId: null,
        selectedItemIds: [],
        viewMode: 'grid',
        sortBy: 'savedAt',
        sortDirection: 'desc',
        filterTypes: [],
        filterTags: [],
        searchQuery: '',
      },

      // ----------------------------------------
      // Folder Actions
      // ----------------------------------------

      createFolder: (name, parentId = null, options = {}) => {
        const now = new Date().toISOString()
        const folder: LibraryFolder = {
          id: `folder-${generateId()}`,
          name,
          parentId,
          createdAt: now,
          updatedAt: now,
          isExpanded: true,
          ...options,
        }

        set((state) => ({
          folders: [...state.folders, folder],
        }))

        return folder
      },

      renameFolder: (folderId, newName) => {
        set((state) => ({
          folders: state.folders.map((folder) =>
            folder.id === folderId
              ? { ...folder, name: newName, updatedAt: new Date().toISOString() }
              : folder
          ),
        }))
      },

      moveFolder: (folderId, newParentId) => {
        // Prevent moving folder into itself or its descendants
        const { folders } = get()
        const isDescendant = (parentId: string | null): boolean => {
          if (!parentId) return false
          if (parentId === folderId) return true
          const parent = folders.find((f) => f.id === parentId)
          return parent ? isDescendant(parent.parentId) : false
        }

        if (isDescendant(newParentId)) {
          console.warn('Cannot move folder into itself or its descendants')
          return
        }

        set((state) => ({
          folders: state.folders.map((folder) =>
            folder.id === folderId
              ? { ...folder, parentId: newParentId, updatedAt: new Date().toISOString() }
              : folder
          ),
        }))
      },

      deleteFolder: (folderId, deleteContents = false) => {
        const { folders, items } = get()

        // Get all descendant folder IDs
        const getDescendantIds = (parentId: string): string[] => {
          const children = folders.filter((f) => f.parentId === parentId)
          return children.flatMap((child) => [child.id, ...getDescendantIds(child.id)])
        }

        const folderIdsToDelete = [folderId, ...getDescendantIds(folderId)]

        set((state) => ({
          folders: state.folders.filter((f) => !folderIdsToDelete.includes(f.id)),
          items: deleteContents
            ? state.items.filter((i) => !folderIdsToDelete.includes(i.folderId ?? ''))
            : state.items.map((i) =>
                folderIdsToDelete.includes(i.folderId ?? '')
                  ? { ...i, folderId: null }
                  : i
              ),
          viewState:
            state.viewState.currentFolderId &&
            folderIdsToDelete.includes(state.viewState.currentFolderId)
              ? { ...state.viewState, currentFolderId: null }
              : state.viewState,
        }))
      },

      updateFolderColor: (folderId, color) => {
        set((state) => ({
          folders: state.folders.map((folder) =>
            folder.id === folderId
              ? { ...folder, color, updatedAt: new Date().toISOString() }
              : folder
          ),
        }))
      },

      toggleFolderExpanded: (folderId) => {
        set((state) => ({
          folders: state.folders.map((folder) =>
            folder.id === folderId
              ? { ...folder, isExpanded: !folder.isExpanded }
              : folder
          ),
        }))
      },

      // ----------------------------------------
      // Item Actions
      // ----------------------------------------

      saveItem: (type, title, data, options = {}) => {
        const now = new Date().toISOString()
        const item: LibraryItem = {
          id: `item-${generateId()}`,
          folderId: options.folderId ?? null,
          type,
          title,
          data,
          tags: options.tags ?? [],
          notes: options.notes,
          savedAt: now,
          lastAccessedAt: now,
          metadata: {},
        }

        set((state) => ({
          items: [...state.items, item],
        }))

        return item
      },

      updateItem: (itemId, updates) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId
              ? { ...item, ...updates, lastAccessedAt: new Date().toISOString() }
              : item
          ),
        }))
      },

      moveItem: (itemId, folderId) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId ? { ...item, folderId } : item
          ),
        }))
      },

      deleteItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== itemId),
          viewState: {
            ...state.viewState,
            selectedItemIds: state.viewState.selectedItemIds.filter((id) => id !== itemId),
          },
          collections: state.collections.map((c) => ({
            ...c,
            itemIds: c.itemIds.filter((id) => id !== itemId),
          })),
        }))
      },

      updateItemTags: (itemId, tags) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId ? { ...item, tags } : item
          ),
        }))
      },

      updateItemNotes: (itemId, notes) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId ? { ...item, notes } : item
          ),
        }))
      },

      recordItemAccess: (itemId) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId
              ? { ...item, lastAccessedAt: new Date().toISOString() }
              : item
          ),
        }))
      },

      // ----------------------------------------
      // Bulk Operations
      // ----------------------------------------

      moveItems: (itemIds, folderId) => {
        set((state) => ({
          items: state.items.map((item) =>
            itemIds.includes(item.id) ? { ...item, folderId } : item
          ),
        }))
      },

      deleteItems: (itemIds) => {
        set((state) => ({
          items: state.items.filter((i) => !itemIds.includes(i.id)),
          viewState: {
            ...state.viewState,
            selectedItemIds: state.viewState.selectedItemIds.filter(
              (id) => !itemIds.includes(id)
            ),
          },
          collections: state.collections.map((c) => ({
            ...c,
            itemIds: c.itemIds.filter((id) => !itemIds.includes(id)),
          })),
        }))
      },

      tagItems: (itemIds, tags) => {
        set((state) => ({
          items: state.items.map((item) =>
            itemIds.includes(item.id)
              ? { ...item, tags: [...new Set([...item.tags, ...tags])] }
              : item
          ),
        }))
      },

      // ----------------------------------------
      // Collection Actions
      // ----------------------------------------

      createCollection: (name, itemIds = []) => {
        const now = new Date().toISOString()
        const collection: LibraryCollection = {
          id: `collection-${generateId()}`,
          name,
          itemIds,
          createdAt: now,
          updatedAt: now,
          isSmartCollection: false,
        }

        set((state) => ({
          collections: [...state.collections, collection],
        }))

        return collection
      },

      updateCollection: (collectionId, updates) => {
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId
              ? { ...c, ...updates, updatedAt: new Date().toISOString() }
              : c
          ),
        }))
      },

      deleteCollection: (collectionId) => {
        set((state) => ({
          collections: state.collections.filter((c) => c.id !== collectionId),
        }))
      },

      addToCollection: (collectionId, itemIds) => {
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId
              ? {
                  ...c,
                  itemIds: [...new Set([...c.itemIds, ...itemIds])],
                  updatedAt: new Date().toISOString(),
                }
              : c
          ),
        }))
      },

      removeFromCollection: (collectionId, itemIds) => {
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId
              ? {
                  ...c,
                  itemIds: c.itemIds.filter((id) => !itemIds.includes(id)),
                  updatedAt: new Date().toISOString(),
                }
              : c
          ),
        }))
      },

      // ----------------------------------------
      // View State Actions
      // ----------------------------------------

      setCurrentFolder: (folderId) => {
        set((state) => ({
          viewState: { ...state.viewState, currentFolderId: folderId, selectedItemIds: [] },
        }))
      },

      setSelectedItems: (itemIds) => {
        set((state) => ({
          viewState: { ...state.viewState, selectedItemIds: itemIds },
        }))
      },

      toggleItemSelection: (itemId) => {
        set((state) => {
          const { selectedItemIds } = state.viewState
          const isSelected = selectedItemIds.includes(itemId)
          return {
            viewState: {
              ...state.viewState,
              selectedItemIds: isSelected
                ? selectedItemIds.filter((id) => id !== itemId)
                : [...selectedItemIds, itemId],
            },
          }
        })
      },

      clearSelection: () => {
        set((state) => ({
          viewState: { ...state.viewState, selectedItemIds: [] },
        }))
      },

      setViewMode: (mode) => {
        set((state) => ({
          viewState: { ...state.viewState, viewMode: mode },
        }))
      },

      setSortBy: (field) => {
        set((state) => ({
          viewState: { ...state.viewState, sortBy: field },
        }))
      },

      setSortDirection: (direction) => {
        set((state) => ({
          viewState: { ...state.viewState, sortDirection: direction },
        }))
      },

      setFilterTypes: (types) => {
        set((state) => ({
          viewState: { ...state.viewState, filterTypes: types },
        }))
      },

      setFilterTags: (tags) => {
        set((state) => ({
          viewState: { ...state.viewState, filterTags: tags },
        }))
      },

      setSearchQuery: (query) => {
        set((state) => ({
          viewState: { ...state.viewState, searchQuery: query },
        }))
      },

      // ----------------------------------------
      // Queries
      // ----------------------------------------

      getFolder: (folderId) => {
        return get().folders.find((f) => f.id === folderId)
      },

      getItem: (itemId) => {
        return get().items.find((i) => i.id === itemId)
      },

      getItemsInFolder: (folderId) => {
        const { items, viewState } = get()
        let filtered = items.filter((i) => i.folderId === folderId)

        // Apply type filter
        if (viewState.filterTypes.length > 0) {
          filtered = filtered.filter((i) => viewState.filterTypes.includes(i.type))
        }

        // Apply tag filter
        if (viewState.filterTags.length > 0) {
          filtered = filtered.filter((i) =>
            viewState.filterTags.some((tag) => i.tags.includes(tag))
          )
        }

        // Apply search
        if (viewState.searchQuery) {
          const query = viewState.searchQuery.toLowerCase()
          filtered = filtered.filter(
            (i) =>
              i.title.toLowerCase().includes(query) ||
              i.description?.toLowerCase().includes(query) ||
              i.tags.some((t) => t.toLowerCase().includes(query))
          )
        }

        // Apply sort
        return sortItems(filtered, viewState.sortBy, viewState.sortDirection)
      },

      getFolderTree: () => {
        const { folders, items } = get()

        const buildTree = (parentId: string | null, depth: number = 0): FolderTreeNode[] => {
          return folders
            .filter((f) => f.parentId === parentId)
            .map((folder) => {
              const children = buildTree(folder.id, depth + 1)
              const directItemCount = items.filter((i) => i.folderId === folder.id).length
              const childItemCount = children.reduce((sum, child) => sum + child.itemCount, 0)

              return {
                ...folder,
                children,
                itemCount: directItemCount + childItemCount,
                depth,
              }
            })
        }

        return buildTree(null)
      },

      getFolderPath: (folderId) => {
        const { folders } = get()
        const path: FolderPath[] = []

        let current = folders.find((f) => f.id === folderId)
        while (current) {
          path.unshift({ id: current.id, name: current.name })
          current = current.parentId ? folders.find((f) => f.id === current!.parentId) : undefined
        }

        return path
      },

      getChildFolders: (parentId) => {
        return get().folders.filter((f) => f.parentId === parentId)
      },

      searchItems: (query) => {
        const { items } = get()
        let results = [...items]

        // Text search
        if (query.text) {
          const text = query.text.toLowerCase()
          results = results.filter(
            (i) =>
              i.title.toLowerCase().includes(text) ||
              i.description?.toLowerCase().includes(text) ||
              i.tags.some((t) => t.toLowerCase().includes(text))
          )
        }

        // Type filter
        if (query.types && query.types.length > 0) {
          results = results.filter((i) => query.types!.includes(i.type))
        }

        // Tag filter
        if (query.tags && query.tags.length > 0) {
          results = results.filter((i) => query.tags!.some((t) => i.tags.includes(t)))
        }

        // Folder filter
        if (query.folderId !== undefined) {
          results = results.filter((i) => i.folderId === query.folderId)
        }

        // Date range filter
        if (query.dateRange) {
          if (query.dateRange.from) {
            const from = new Date(query.dateRange.from)
            results = results.filter((i) => new Date(i.savedAt) >= from)
          }
          if (query.dateRange.to) {
            const to = new Date(query.dateRange.to)
            results = results.filter((i) => new Date(i.savedAt) <= to)
          }
        }

        // Sort
        if (query.sortBy) {
          results = sortItems(results, query.sortBy, query.sortDirection || 'desc')
        }

        // Pagination
        if (query.offset) {
          results = results.slice(query.offset)
        }
        if (query.limit) {
          results = results.slice(0, query.limit)
        }

        return results
      },

      getRecentItems: (limit = 10) => {
        const { items } = get()
        return [...items]
          .sort((a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime())
          .slice(0, limit)
      },

      getStarredItems: () => {
        return get().items.filter((i) => i.tags.includes('starred'))
      },

      getAllTags: () => {
        const { items } = get()
        const tagSet = new Set<string>()
        items.forEach((i) => i.tags.forEach((t) => tagSet.add(t)))
        return Array.from(tagSet).sort()
      },

      getStatistics: () => {
        const { folders, items } = get()
        const now = new Date()
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

        const byType: Record<LibraryItemType, number> = {
          paper: 0,
          report: 0,
          discovery: 0,
          experiment: 0,
          simulation: 0,
          note: 0,
        }

        const byTag: Record<string, number> = {}

        for (const item of items) {
          byType[item.type]++
          for (const tag of item.tags) {
            byTag[tag] = (byTag[tag] || 0) + 1
          }
        }

        return {
          totalItems: items.length,
          totalFolders: folders.length,
          byType,
          byTag,
          recentlyAdded: items.filter((i) => new Date(i.savedAt) >= weekAgo).length,
          recentlyAccessed: items.filter((i) => new Date(i.lastAccessedAt) >= weekAgo).length,
        }
      },

      // ----------------------------------------
      // Utilities
      // ----------------------------------------

      exportLibrary: () => {
        const { folders, items, collections } = get()
        return JSON.stringify(
          {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            folders,
            items,
            collections,
          },
          null,
          2
        )
      },

      importLibrary: (json) => {
        const errors: string[] = []

        try {
          const data = JSON.parse(json)

          if (!data.version) {
            errors.push('Invalid library export format')
            return { success: false, errors }
          }

          if (data.folders) {
            set((state) => ({
              folders: [...state.folders, ...data.folders],
            }))
          }

          if (data.items) {
            set((state) => ({
              items: [...state.items, ...data.items],
            }))
          }

          if (data.collections) {
            set((state) => ({
              collections: [...state.collections, ...data.collections],
            }))
          }

          return { success: true, errors }
        } catch (error) {
          errors.push(error instanceof Error ? error.message : 'Unknown error')
          return { success: false, errors }
        }
      },

      clearLibrary: () => {
        set({
          folders: [],
          items: [],
          collections: [],
          viewState: {
            currentFolderId: null,
            selectedItemIds: [],
            viewMode: 'grid',
            sortBy: 'savedAt',
            sortDirection: 'desc',
            filterTypes: [],
            filterTags: [],
            searchQuery: '',
          },
        })
      },
    }),
    {
      name: 'exergy-lab-library-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

export default useLibraryStore
