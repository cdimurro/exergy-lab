/**
 * Feeds Store (v0.0.5)
 *
 * Zustand store for managing literature feed state.
 * Handles feed subscriptions, items, and read status.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  LiteratureFeed,
  FeedItem,
  FeedDigest,
  FeedType,
  FeedConfig,
  FeedAnalytics,
  FeedPriority,
  ItemStatus,
} from './feed-types'

// ============================================================================
// Types
// ============================================================================

interface FeedsState {
  // Feed subscriptions
  feeds: LiteratureFeed[]
  activeFeedId: string | null

  // Items
  items: Map<string, FeedItem[]>
  unreadCounts: Map<string, number>

  // Digests
  digests: Map<string, FeedDigest>

  // UI State
  filterPriority: FeedPriority | 'all'
  showReadItems: boolean
  searchQuery: string

  // Actions - Feeds
  createFeed: (feed: Omit<LiteratureFeed, 'id' | 'createdAt' | 'updatedAt' | 'statistics'>) => string
  updateFeed: (feedId: string, updates: Partial<FeedConfig>) => void
  deleteFeed: (feedId: string) => void
  toggleFeed: (feedId: string, enabled: boolean) => void
  setActiveFeed: (feedId: string | null) => void

  // Actions - Items
  addItems: (feedId: string, items: FeedItem[]) => void
  markAsRead: (itemId: string) => void
  markAllAsRead: (feedId: string) => void
  toggleStarred: (itemId: string) => void
  updateItemStatus: (itemId: string, status: Partial<ItemStatus>) => void
  removeItem: (itemId: string) => void

  // Actions - Digests
  addDigest: (feedId: string, digest: FeedDigest) => void
  getLatestDigest: (feedId: string) => FeedDigest | undefined

  // Actions - UI
  setFilterPriority: (priority: FeedPriority | 'all') => void
  setShowReadItems: (show: boolean) => void
  setSearchQuery: (query: string) => void

  // Queries
  getFeedItems: (feedId: string) => FeedItem[]
  getUnreadItems: (feedId: string) => FeedItem[]
  getStarredItems: () => FeedItem[]
  searchItems: (query: string) => FeedItem[]
  getAnalytics: (feedId: string) => FeedAnalytics

  // Utilities
  clearOldItems: (daysToKeep: number) => void
  exportFeeds: () => string
  importFeeds: (json: string) => void
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useFeedsStore = create<FeedsState>()(
  persist(
    (set, get) => ({
      // Initial state
      feeds: [],
      activeFeedId: null,
      items: new Map(),
      unreadCounts: new Map(),
      digests: new Map(),
      filterPriority: 'all',
      showReadItems: true,
      searchQuery: '',

      // ----------------------------------------
      // Feed Management
      // ----------------------------------------

      createFeed: (feedData) => {
        const id = `feed-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        const now = new Date().toISOString()

        const feed: LiteratureFeed = {
          ...feedData,
          id,
          createdAt: now,
          updatedAt: now,
          statistics: {
            totalItems: 0,
            unreadItems: 0,
            lastFetched: null,
            averageItemsPerDay: 0,
            topKeywords: [],
          },
        }

        set((state) => ({
          feeds: [...state.feeds, feed],
        }))

        // Initialize empty items array
        get().items.set(id, [])
        get().unreadCounts.set(id, 0)

        return id
      },

      updateFeed: (feedId, updates) => {
        set((state) => ({
          feeds: state.feeds.map((feed) =>
            feed.id === feedId
              ? {
                  ...feed,
                  config: { ...feed.config, ...updates },
                  updatedAt: new Date().toISOString(),
                }
              : feed
          ),
        }))
      },

      deleteFeed: (feedId) => {
        set((state) => ({
          feeds: state.feeds.filter((f) => f.id !== feedId),
          activeFeedId: state.activeFeedId === feedId ? null : state.activeFeedId,
        }))

        // Clean up associated data
        const { items, unreadCounts, digests } = get()
        items.delete(feedId)
        unreadCounts.delete(feedId)
        digests.delete(feedId)
      },

      toggleFeed: (feedId, enabled) => {
        set((state) => ({
          feeds: state.feeds.map((feed) =>
            feed.id === feedId
              ? { ...feed, enabled, updatedAt: new Date().toISOString() }
              : feed
          ),
        }))
      },

      setActiveFeed: (feedId) => {
        set({ activeFeedId: feedId })
      },

      // ----------------------------------------
      // Item Management
      // ----------------------------------------

      addItems: (feedId, newItems) => {
        const { items, unreadCounts, feeds } = get()
        const existingItems = items.get(feedId) || []
        const existingIds = new Set(existingItems.map((i) => i.id))

        // Filter out duplicates
        const uniqueNewItems = newItems.filter((item) => !existingIds.has(item.id))

        if (uniqueNewItems.length === 0) return

        // Merge and sort by date
        const allItems = [...uniqueNewItems, ...existingItems].sort(
          (a, b) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime()
        )

        items.set(feedId, allItems)

        // Update unread count
        const newUnread = uniqueNewItems.filter((i) => !i.status.read).length
        const currentUnread = unreadCounts.get(feedId) || 0
        unreadCounts.set(feedId, currentUnread + newUnread)

        // Update feed statistics
        set((state) => ({
          feeds: state.feeds.map((feed) =>
            feed.id === feedId
              ? {
                  ...feed,
                  statistics: {
                    ...feed.statistics,
                    totalItems: allItems.length,
                    unreadItems: (unreadCounts.get(feedId) || 0) + newUnread,
                    lastFetched: new Date().toISOString(),
                  },
                }
              : feed
          ),
        }))
      },

      markAsRead: (itemId) => {
        const { items, unreadCounts } = get()

        for (const [feedId, feedItems] of items.entries()) {
          const itemIndex = feedItems.findIndex((i) => i.id === itemId)
          if (itemIndex >= 0 && !feedItems[itemIndex].status.read) {
            feedItems[itemIndex] = {
              ...feedItems[itemIndex],
              status: { ...feedItems[itemIndex].status, read: true },
            }
            items.set(feedId, [...feedItems])

            // Decrement unread count
            const current = unreadCounts.get(feedId) || 0
            unreadCounts.set(feedId, Math.max(0, current - 1))

            // Update feed statistics
            set((state) => ({
              feeds: state.feeds.map((feed) =>
                feed.id === feedId
                  ? {
                      ...feed,
                      statistics: {
                        ...feed.statistics,
                        unreadItems: Math.max(0, feed.statistics.unreadItems - 1),
                      },
                    }
                  : feed
              ),
            }))

            break
          }
        }
      },

      markAllAsRead: (feedId) => {
        const { items, unreadCounts } = get()
        const feedItems = items.get(feedId)

        if (!feedItems) return

        const updatedItems = feedItems.map((item) => ({
          ...item,
          status: { ...item.status, read: true },
        }))

        items.set(feedId, updatedItems)
        unreadCounts.set(feedId, 0)

        set((state) => ({
          feeds: state.feeds.map((feed) =>
            feed.id === feedId
              ? {
                  ...feed,
                  statistics: { ...feed.statistics, unreadItems: 0 },
                }
              : feed
          ),
        }))
      },

      toggleStarred: (itemId) => {
        const { items } = get()

        for (const [feedId, feedItems] of items.entries()) {
          const itemIndex = feedItems.findIndex((i) => i.id === itemId)
          if (itemIndex >= 0) {
            feedItems[itemIndex] = {
              ...feedItems[itemIndex],
              status: {
                ...feedItems[itemIndex].status,
                starred: !feedItems[itemIndex].status.starred,
              },
            }
            items.set(feedId, [...feedItems])
            break
          }
        }
      },

      updateItemStatus: (itemId, statusUpdates) => {
        const { items } = get()

        for (const [feedId, feedItems] of items.entries()) {
          const itemIndex = feedItems.findIndex((i) => i.id === itemId)
          if (itemIndex >= 0) {
            feedItems[itemIndex] = {
              ...feedItems[itemIndex],
              status: { ...feedItems[itemIndex].status, ...statusUpdates },
            }
            items.set(feedId, [...feedItems])
            break
          }
        }
      },

      removeItem: (itemId) => {
        const { items, unreadCounts } = get()

        for (const [feedId, feedItems] of items.entries()) {
          const itemIndex = feedItems.findIndex((i) => i.id === itemId)
          if (itemIndex >= 0) {
            const item = feedItems[itemIndex]
            const newItems = feedItems.filter((i) => i.id !== itemId)
            items.set(feedId, newItems)

            // Update unread count if item was unread
            if (!item.status.read) {
              const current = unreadCounts.get(feedId) || 0
              unreadCounts.set(feedId, Math.max(0, current - 1))
            }

            break
          }
        }
      },

      // ----------------------------------------
      // Digest Management
      // ----------------------------------------

      addDigest: (feedId, digest) => {
        const { digests } = get()
        digests.set(feedId, digest)
      },

      getLatestDigest: (feedId) => {
        return get().digests.get(feedId)
      },

      // ----------------------------------------
      // UI State
      // ----------------------------------------

      setFilterPriority: (priority) => {
        set({ filterPriority: priority })
      },

      setShowReadItems: (show) => {
        set({ showReadItems: show })
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query })
      },

      // ----------------------------------------
      // Queries
      // ----------------------------------------

      getFeedItems: (feedId) => {
        const { items, filterPriority, showReadItems, searchQuery } = get()
        let feedItems = items.get(feedId) || []

        // Apply filters
        if (filterPriority !== 'all') {
          feedItems = feedItems.filter((i) => i.relevance.priority === filterPriority)
        }

        if (!showReadItems) {
          feedItems = feedItems.filter((i) => !i.status.read)
        }

        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          feedItems = feedItems.filter(
            (i) =>
              i.title.toLowerCase().includes(query) ||
              i.abstract?.toLowerCase().includes(query) ||
              i.authors.some((a) => a.name.toLowerCase().includes(query))
          )
        }

        return feedItems
      },

      getUnreadItems: (feedId) => {
        const feedItems = get().items.get(feedId) || []
        return feedItems.filter((i) => !i.status.read)
      },

      getStarredItems: () => {
        const { items } = get()
        const starred: FeedItem[] = []

        for (const feedItems of items.values()) {
          starred.push(...feedItems.filter((i) => i.status.starred))
        }

        return starred.sort(
          (a, b) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime()
        )
      },

      searchItems: (query) => {
        const { items } = get()
        const queryLower = query.toLowerCase()
        const results: FeedItem[] = []

        for (const feedItems of items.values()) {
          const matches = feedItems.filter(
            (i) =>
              i.title.toLowerCase().includes(queryLower) ||
              i.abstract?.toLowerCase().includes(queryLower) ||
              i.authors.some((a) => a.name.toLowerCase().includes(queryLower)) ||
              i.relevance.matchedKeywords.some((k) => k.toLowerCase().includes(queryLower))
          )
          results.push(...matches)
        }

        return results.sort(
          (a, b) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime()
        )
      },

      getAnalytics: (feedId) => {
        const feedItems = get().items.get(feedId) || []

        const bySource: Record<string, number> = {}
        let totalRead = 0
        let totalSaved = 0
        let totalRelevance = 0

        for (const item of feedItems) {
          bySource[item.source] = (bySource[item.source] || 0) + 1
          if (item.status.read) totalRead++
          if (item.status.savedToLibrary) totalSaved++
          totalRelevance += item.relevance.score
        }

        const topSources = Object.entries(bySource)
          .sort((a, b) => b[1] - a[1])
          .map(([source, count]) => ({ source: source as FeedItem['source'], count }))

        return {
          feedId,
          period: 'month',
          itemsReceived: feedItems.length,
          itemsRead: totalRead,
          itemsSaved: totalSaved,
          averageRelevance: feedItems.length > 0 ? totalRelevance / feedItems.length : 0,
          topSources,
          engagementRate: feedItems.length > 0 ? totalRead / feedItems.length : 0,
        }
      },

      // ----------------------------------------
      // Utilities
      // ----------------------------------------

      clearOldItems: (daysToKeep) => {
        const { items } = get()
        const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)

        for (const [feedId, feedItems] of items.entries()) {
          const filtered = feedItems.filter(
            (item) => new Date(item.fetchedAt) >= cutoffDate || item.status.starred
          )
          items.set(feedId, filtered)
        }
      },

      exportFeeds: () => {
        const { feeds, items, digests } = get()

        const data = {
          feeds,
          items: Object.fromEntries(items),
          digests: Object.fromEntries(digests),
          exportedAt: new Date().toISOString(),
        }

        return JSON.stringify(data, null, 2)
      },

      importFeeds: (json) => {
        try {
          const data = JSON.parse(json)

          if (data.feeds) {
            set({ feeds: data.feeds })
          }

          if (data.items) {
            const itemsMap = new Map(Object.entries(data.items) as [string, FeedItem[]][])
            get().items.clear()
            for (const [key, value] of itemsMap) {
              get().items.set(key, value)
            }
          }

          if (data.digests) {
            const digestsMap = new Map(Object.entries(data.digests) as [string, FeedDigest][])
            get().digests.clear()
            for (const [key, value] of digestsMap) {
              get().digests.set(key, value)
            }
          }
        } catch (error) {
          console.error('Failed to import feeds:', error)
          throw new Error('Invalid feed export format')
        }
      },
    }),
    {
      name: 'exergy-lab-feeds-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        feeds: state.feeds,
        // Note: items and digests are stored separately due to size
        filterPriority: state.filterPriority,
        showReadItems: state.showReadItems,
      }),
    }
  )
)

export default useFeedsStore
