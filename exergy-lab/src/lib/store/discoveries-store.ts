import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DiscoveryReport, NovelIdea } from '@/types/discovery'

export interface SavedDiscovery {
  id: string
  report: DiscoveryReport
  savedAt: string
  tags?: string[]
  notes?: string
}

export interface SavedIdea {
  id: string
  idea: NovelIdea
  discoveryId?: string
  savedAt: string
  tags?: string[]
  notes?: string
}

export interface DiscoveriesState {
  // Saved discoveries and ideas
  savedDiscoveries: SavedDiscovery[]
  savedIdeas: SavedIdea[]

  // Actions for discoveries
  saveDiscovery: (report: DiscoveryReport, tags?: string[], notes?: string) => void
  updateDiscovery: (id: string, updates: Partial<SavedDiscovery>) => void
  removeDiscovery: (id: string) => void
  getDiscovery: (id: string) => SavedDiscovery | undefined

  // Actions for ideas
  saveIdea: (idea: NovelIdea, discoveryId?: string, tags?: string[], notes?: string) => void
  updateIdea: (id: string, updates: Partial<SavedIdea>) => void
  removeIdea: (id: string) => void
  getIdea: (id: string) => SavedIdea | undefined

  // Utility
  clearAll: () => void
}

export const useDiscoveriesStore = create<DiscoveriesState>()(
  persist(
    (set, get) => ({
      // Initial state
      savedDiscoveries: [],
      savedIdeas: [],

      // Discovery actions
      saveDiscovery: (report, tags, notes) =>
        set((state) => {
          const savedDiscovery: SavedDiscovery = {
            id: report.id,
            report,
            savedAt: new Date().toISOString(),
            tags,
            notes,
          }

          return {
            savedDiscoveries: [savedDiscovery, ...state.savedDiscoveries].slice(0, 50), // Keep latest 50
          }
        }),

      updateDiscovery: (id, updates) =>
        set((state) => ({
          savedDiscoveries: state.savedDiscoveries.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        })),

      removeDiscovery: (id) =>
        set((state) => ({
          savedDiscoveries: state.savedDiscoveries.filter((d) => d.id !== id),
          // Also remove associated ideas
          savedIdeas: state.savedIdeas.filter((i) => i.discoveryId !== id),
        })),

      getDiscovery: (id) => {
        return get().savedDiscoveries.find((d) => d.id === id)
      },

      // Idea actions
      saveIdea: (idea, discoveryId, tags, notes) =>
        set((state) => {
          const savedIdea: SavedIdea = {
            id: idea.id,
            idea,
            discoveryId,
            savedAt: new Date().toISOString(),
            tags,
            notes,
          }

          return {
            savedIdeas: [savedIdea, ...state.savedIdeas].slice(0, 100), // Keep latest 100
          }
        }),

      updateIdea: (id, updates) =>
        set((state) => ({
          savedIdeas: state.savedIdeas.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })),

      removeIdea: (id) =>
        set((state) => ({
          savedIdeas: state.savedIdeas.filter((i) => i.id !== id),
        })),

      getIdea: (id) => {
        return get().savedIdeas.find((i) => i.id === id)
      },

      // Utility
      clearAll: () =>
        set({
          savedDiscoveries: [],
          savedIdeas: [],
        }),
    }),
    {
      name: 'exergy-lab-discoveries-storage',
    }
  )
)
