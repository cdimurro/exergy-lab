import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SimulationResult, SimulationTier } from '@/types/simulation'

interface SimulationHistory {
  id: string
  title: string
  tier: SimulationTier
  completedAt: string
  cost?: number
}

interface ActiveSimulation {
  id: string
  tier: SimulationTier
  startedAt: string
  progress: number
}

interface SimulationStats {
  totalSimulations: number
  totalCost: number
  byTier: {
    local: number
    browser: number
    cloud: number
  }
}

interface ComparisonMode {
  enabled: boolean
  simulationIds: string[] // Max 4
}

export interface SimulationsState {
  // Completed simulation results
  results: SimulationResult[]

  // Quick access history
  history: SimulationHistory[]

  // Currently running simulation
  activeSimulation: ActiveSimulation | null

  // Statistics
  stats: SimulationStats

  // Comparison mode (compare up to 4 simulations)
  comparison: ComparisonMode

  // Actions
  addResult: (result: SimulationResult) => void
  setActiveSimulation: (id: string, tier: SimulationTier) => void
  updateProgress: (id: string, progress: number) => void
  clearActive: () => void
  deleteResult: (id: string) => void

  // Comparison
  toggleComparison: () => void
  addToComparison: (id: string) => void
  removeFromComparison: (id: string) => void
  clearComparison: () => void
}

export const useSimulationsStore = create<SimulationsState>()(
  persist(
    (set, get) => ({
      results: [],
      history: [],
      activeSimulation: null,
      stats: {
        totalSimulations: 0,
        totalCost: 0,
        byTier: { local: 0, browser: 0, cloud: 0 }
      },
      comparison: {
        enabled: false,
        simulationIds: []
      },

      addResult: (result) => set((state) => {
        const cost = result.cost || 0
        const tier = result.config.tier

        return {
          results: [result, ...state.results].slice(0, 100),
          history: [
            {
              id: result.id,
              title: result.config.title,
              tier: result.config.tier,
              completedAt: new Date().toISOString(),
              cost: result.cost
            },
            ...state.history
          ].slice(0, 200),
          stats: {
            totalSimulations: state.stats.totalSimulations + 1,
            totalCost: state.stats.totalCost + cost,
            byTier: {
              ...state.stats.byTier,
              [tier]: state.stats.byTier[tier] + 1
            }
          },
          activeSimulation: null
        }
      }),

      setActiveSimulation: (id, tier) => set({
        activeSimulation: {
          id,
          tier,
          startedAt: new Date().toISOString(),
          progress: 0
        }
      }),

      updateProgress: (id, progress) => set((state) => ({
        activeSimulation: state.activeSimulation?.id === id
          ? { ...state.activeSimulation, progress }
          : state.activeSimulation
      })),

      clearActive: () => set({ activeSimulation: null }),

      deleteResult: (id) => set((state) => ({
        results: state.results.filter(r => r.id !== id),
        history: state.history.filter(h => h.id !== id),
        comparison: {
          ...state.comparison,
          simulationIds: state.comparison.simulationIds.filter(sid => sid !== id)
        }
      })),

      toggleComparison: () => set((state) => ({
        comparison: {
          ...state.comparison,
          enabled: !state.comparison.enabled
        }
      })),

      addToComparison: (id) => set((state) => {
        if (state.comparison.simulationIds.length >= 4) {
          console.warn('Max 4 simulations can be compared')
          return state
        }
        return {
          comparison: {
            ...state.comparison,
            simulationIds: [...state.comparison.simulationIds, id]
          }
        }
      }),

      removeFromComparison: (id) => set((state) => ({
        comparison: {
          ...state.comparison,
          simulationIds: state.comparison.simulationIds.filter(sid => sid !== id)
        }
      })),

      clearComparison: () => set((state) => ({
        comparison: {
          enabled: false,
          simulationIds: []
        }
      }))
    }),
    {
      name: 'exergy-lab-simulations-storage',
      partialize: (state) => ({
        results: state.results.slice(0, 50), // Only persist latest 50
        history: state.history,
        stats: state.stats
        // Don't persist activeSimulation or comparison
      })
    }
  )
)
