/**
 * TEA Store
 *
 * Zustand store for persisting TEA (Techno-Economic Analysis) report results.
 * Enables dashboard display of recent TEA reports with key metrics.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TEAResult_v2, TEAInput_v2 } from '@/types/tea'

export interface SavedTEAReport {
  id: string
  input: TEAInput_v2
  result: TEAResult_v2
  savedAt: string
  projectName: string
  technology: string
}

export interface TEAState {
  // Saved reports
  savedReports: SavedTEAReport[]

  // Actions
  saveReport: (input: TEAInput_v2, result: TEAResult_v2) => void
  deleteReport: (id: string) => void
  getRecentReports: (limit?: number) => SavedTEAReport[]
  getReportById: (id: string) => SavedTEAReport | undefined
  clearAll: () => void
}

export const useTEAStore = create<TEAState>()(
  persist(
    (set, get) => ({
      savedReports: [],

      saveReport: (input, result) =>
        set((state) => {
          const savedReport: SavedTEAReport = {
            id: `tea_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            input,
            result,
            savedAt: new Date().toISOString(),
            projectName: input.project_name || 'Untitled Report',
            technology: input.technology_type || 'generic',
          }

          return {
            savedReports: [savedReport, ...state.savedReports].slice(0, 50), // Keep max 50
          }
        }),

      deleteReport: (id) =>
        set((state) => ({
          savedReports: state.savedReports.filter((r) => r.id !== id),
        })),

      getRecentReports: (limit = 3) => {
        return get().savedReports.slice(0, limit)
      },

      getReportById: (id) => {
        return get().savedReports.find((r) => r.id === id)
      },

      clearAll: () => set({ savedReports: [] }),
    }),
    {
      name: 'exergy-lab-tea-storage',
    }
  )
)
