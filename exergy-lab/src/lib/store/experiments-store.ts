import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ExperimentProtocol } from '@/types/experiment'

interface ExperimentDraft {
  id: string
  lastSaved: string
  data: Partial<ExperimentProtocol>
}

interface ExperimentHistory {
  id: string
  title: string
  createdAt: string
  status: 'draft' | 'completed' | 'in-progress'
}

export interface ExperimentsState {
  // Saved protocols
  protocols: ExperimentProtocol[]

  // Auto-save draft (current work-in-progress)
  currentDraft: ExperimentDraft | null

  // Protocol history for quick access
  history: ExperimentHistory[]

  // Actions
  saveProtocol: (protocol: ExperimentProtocol) => void
  updateDraft: (data: Partial<ExperimentProtocol>) => void
  loadProtocol: (id: string) => ExperimentProtocol | null
  clearDraft: () => void
  deleteProtocol: (id: string) => void
  duplicateProtocol: (id: string) => void
  getStats: () => { total: number; drafts: number; completed: number }
}

export const useExperimentsStore = create<ExperimentsState>()(
  persist(
    (set, get) => ({
      protocols: [],
      currentDraft: null,
      history: [],

      saveProtocol: (protocol) => set((state) => {
        const id = protocol.title ? `exp_${Date.now()}` : `exp_${Date.now()}`
        const savedProtocol = { ...protocol, id }

        return {
          protocols: [savedProtocol, ...state.protocols].slice(0, 50), // Keep max 50
          history: [
            {
              id: savedProtocol.id,
              title: savedProtocol.title,
              createdAt: new Date().toISOString(),
              status: 'completed'
            },
            ...state.history
          ].slice(0, 100),
          currentDraft: null // Clear draft after save
        }
      }),

      updateDraft: (data) => set((state) => {
        const now = new Date().toISOString()
        return {
          currentDraft: {
            id: state.currentDraft?.id || `draft_${Date.now()}`,
            lastSaved: now,
            data: { ...state.currentDraft?.data, ...data }
          }
        }
      }),

      loadProtocol: (id) => {
        return get().protocols.find(p => p.id === id) || null
      },

      clearDraft: () => set({ currentDraft: null }),

      deleteProtocol: (id) => set((state) => ({
        protocols: state.protocols.filter(p => p.id !== id),
        history: state.history.filter(h => h.id !== id)
      })),

      duplicateProtocol: (id) => set((state) => {
        const protocol = state.protocols.find(p => p.id === id)
        if (!protocol) return state

        const duplicate = {
          ...protocol,
          id: `exp_${Date.now()}`,
          title: `${protocol.title} (Copy)`
        }

        return {
          protocols: [duplicate, ...state.protocols].slice(0, 50)
        }
      }),

      getStats: () => {
        const state = get()
        return {
          total: state.protocols.length,
          drafts: state.currentDraft ? 1 : 0,
          completed: state.protocols.length
        }
      }
    }),
    {
      name: 'exergy-lab-experiments-storage',
      partialize: (state) => ({
        protocols: state.protocols.slice(0, 20), // Only persist latest 20
        currentDraft: state.currentDraft,
        history: state.history.slice(0, 50)
      })
    }
  )
)
