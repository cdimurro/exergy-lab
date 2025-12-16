'use client'

import * as React from 'react'

export type Theme = 'light' | 'dark' | 'system'
export type EffectiveTheme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  effectiveTheme: EffectiveTheme
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = 'exergy-lab-theme'

function getSystemTheme(): EffectiveTheme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>('system')
  const [effectiveTheme, setEffectiveTheme] = React.useState<EffectiveTheme>('dark')

  // Initialize theme from localStorage or system preference
  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    const initialTheme = stored || 'system'
    setThemeState(initialTheme)

    const systemTheme = getSystemTheme()
    const effective = initialTheme === 'system' ? systemTheme : initialTheme
    setEffectiveTheme(effective)

    // Apply theme to document
    document.documentElement.setAttribute('data-theme', effective)
  }, [])

  // Listen for system theme changes
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        const newEffective = e.matches ? 'dark' : 'light'
        setEffectiveTheme(newEffective)
        document.documentElement.setAttribute('data-theme', newEffective)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const setTheme = React.useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(STORAGE_KEY, newTheme)

    const systemTheme = getSystemTheme()
    const newEffective = newTheme === 'system' ? systemTheme : newTheme
    setEffectiveTheme(newEffective)

    // Apply theme to document
    document.documentElement.setAttribute('data-theme', newEffective)
  }, [])

  const value = React.useMemo(
    () => ({ theme, setTheme, effectiveTheme }),
    [theme, setTheme, effectiveTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
