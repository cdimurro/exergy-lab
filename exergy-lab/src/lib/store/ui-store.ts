import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface UIState {
  // Sidebar state
  sidebarCollapsed: boolean
  sidebarMobileOpen: boolean

  // Theme (future dark mode support)
  theme: 'light' | 'dark'

  // Actions
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebarMobile: () => void
  setSidebarMobileOpen: (open: boolean) => void
  setTheme: (theme: 'light' | 'dark') => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Initial state
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      theme: 'light',

      // Actions
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (collapsed) =>
        set({ sidebarCollapsed: collapsed }),

      toggleSidebarMobile: () =>
        set((state) => ({ sidebarMobileOpen: !state.sidebarMobileOpen })),

      setSidebarMobileOpen: (open) =>
        set({ sidebarMobileOpen: open }),

      setTheme: (theme) =>
        set({ theme }),
    }),
    {
      name: 'exergy-lab-ui-storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
)
