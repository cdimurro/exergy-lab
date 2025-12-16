import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ProjectType = 'search' | 'tea' | 'experiment' | 'simulation' | 'discovery'

export interface Project {
  id: string
  type: ProjectType
  title: string
  timestamp: string
  status?: string
  data?: any // Type-specific project data
}

export interface ProjectsState {
  // Recent projects
  recentProjects: Project[]

  // Project counts (for stats)
  searchCount: number
  experimentCount: number
  teaCount: number
  discoveryCount: number
  simulationCount: number

  // Actions
  addProject: (project: Omit<Project, 'id' | 'timestamp'>) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  removeProject: (id: string) => void
  clearProjects: () => void

  // Increment counters
  incrementSearchCount: () => void
  incrementExperimentCount: () => void
  incrementTEACount: () => void
  incrementDiscoveryCount: () => void
  incrementSimulationCount: () => void
}

export const useProjectsStore = create<ProjectsState>()(
  persist(
    (set) => ({
      // Initial state
      recentProjects: [],
      searchCount: 0,
      experimentCount: 0,
      teaCount: 0,
      discoveryCount: 0,
      simulationCount: 0,

      // Actions
      addProject: (project) =>
        set((state) => {
          const newProject: Project = {
            ...project,
            id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
          }

          // Keep only latest 20 projects
          const recentProjects = [newProject, ...state.recentProjects].slice(0, 20)

          // Increment appropriate counter
          const updates: any = { recentProjects }
          if (project.type === 'search') updates.searchCount = state.searchCount + 1
          if (project.type === 'experiment') updates.experimentCount = state.experimentCount + 1
          if (project.type === 'tea') updates.teaCount = state.teaCount + 1
          if (project.type === 'discovery') updates.discoveryCount = state.discoveryCount + 1
          if (project.type === 'simulation') updates.simulationCount = state.simulationCount + 1

          return updates
        }),

      updateProject: (id, updates) =>
        set((state) => ({
          recentProjects: state.recentProjects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      removeProject: (id) =>
        set((state) => ({
          recentProjects: state.recentProjects.filter((p) => p.id !== id),
        })),

      clearProjects: () =>
        set({
          recentProjects: [],
          searchCount: 0,
          experimentCount: 0,
          teaCount: 0,
          discoveryCount: 0,
          simulationCount: 0,
        }),

      incrementSearchCount: () =>
        set((state) => ({ searchCount: state.searchCount + 1 })),

      incrementExperimentCount: () =>
        set((state) => ({ experimentCount: state.experimentCount + 1 })),

      incrementTEACount: () =>
        set((state) => ({ teaCount: state.teaCount + 1 })),

      incrementDiscoveryCount: () =>
        set((state) => ({ discoveryCount: state.discoveryCount + 1 })),

      incrementSimulationCount: () =>
        set((state) => ({ simulationCount: state.simulationCount + 1 })),
    }),
    {
      name: 'exergy-lab-projects-storage',
    }
  )
)
