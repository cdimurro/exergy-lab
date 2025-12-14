import { useAuth, useUser, SignIn, SignUp, UserButton } from '@clerk/clerk-react'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// Re-export Clerk hooks and components for convenience
export { useAuth, useUser, SignIn, SignUp, UserButton }

// Tier type matching backend
export type Tier = 'free' | 'starter' | 'professional' | 'discovery'

// User context with tier info
interface AuthContextValue {
  user: ReturnType<typeof useUser>['user']
  tier: Tier
  isLoading: boolean
  isAuthenticated: boolean
  syncUser: () => Promise<void>
  getAuthToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Provider component
interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const { user } = useUser()
  const [tier, setTier] = useState<Tier>('free')
  const [isLoading, setIsLoading] = useState(true)

  // Get auth token for API calls
  const getAuthToken = async (): Promise<string | null> => {
    try {
      return await getToken()
    } catch {
      return null
    }
  }

  // Sync user with backend
  const syncUser = async () => {
    if (!isSignedIn) {
      setTier('free')
      setIsLoading(false)
      return
    }

    try {
      const token = await getToken()
      if (!token) {
        setTier('free')
        setIsLoading(false)
        return
      }

      // Sync user with backend
      const syncResponse = await fetch(`${API_BASE}/api/auth/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (syncResponse.ok) {
        // Get user tier
        const tierResponse = await fetch(`${API_BASE}/api/auth/me/tier`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (tierResponse.ok) {
          const data = await tierResponse.json()
          setTier(data.tier as Tier)
        }
      }
    } catch (error) {
      console.error('Failed to sync user:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Sync on auth state change
  useEffect(() => {
    if (isLoaded) {
      syncUser()
    }
  }, [isLoaded, isSignedIn, user?.id])

  const value: AuthContextValue = {
    user,
    tier,
    isLoading: !isLoaded || isLoading,
    isAuthenticated: isSignedIn ?? false,
    syncUser,
    getAuthToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Mock AuthProvider for development without Clerk
export function MockAuthProvider({ children }: AuthProviderProps) {
  const value: AuthContextValue = {
    user: null,
    tier: 'free',
    isLoading: false,
    isAuthenticated: false,
    syncUser: async () => {},
    getAuthToken: async () => null,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Hook to use auth context
export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

// Get user's tier
export function useUserTier(): Tier {
  const context = useContext(AuthContext)
  return context?.tier ?? 'free'
}

// Check if user has access to a specific tier
export function useTierAccess(requiredTier: Tier): boolean {
  const userTier = useUserTier()

  const tierOrder: Record<Tier, number> = {
    free: 0,
    starter: 1,
    professional: 2,
    discovery: 3,
  }

  return tierOrder[userTier] >= tierOrder[requiredTier]
}

// Hook for making authenticated API calls
export function useApi() {
  const { getAuthToken } = useAuthContext()

  const fetchWithAuth = async (
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const token = await getAuthToken()

    const headers = new Headers(options.headers)
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    headers.set('Content-Type', 'application/json')

    return fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    })
  }

  return { fetchWithAuth }
}

// Protected route wrapper
interface ProtectedRouteProps {
  children: ReactNode
  requiredTier?: Tier
  fallback?: ReactNode
}

export function ProtectedRoute({
  children,
  requiredTier = 'free',
  fallback,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthContext()
  const hasAccess = useTierAccess(requiredTier)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      fallback || (
        <div className="flex flex-col items-center justify-center min-h-screen p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">
            Sign in to continue
          </h2>
          <SignIn routing="hash" />
        </div>
      )
    )
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Upgrade Required
        </h2>
        <p className="text-text-muted mb-4">
          This feature requires the {requiredTier} tier or higher.
        </p>
        <a
          href="/pricing"
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          Upgrade Now
        </a>
      </div>
    )
  }

  return <>{children}</>
}

// Tier badge component
interface TierBadgeProps {
  tier: Tier
  className?: string
}

export function TierBadge({ tier, className = '' }: TierBadgeProps) {
  const colors: Record<Tier, string> = {
    free: 'bg-gray-500/20 text-gray-400',
    starter: 'bg-primary/20 text-primary',
    professional: 'bg-accent-blue/20 text-accent-blue',
    discovery: 'bg-accent-purple/20 text-accent-purple',
  }

  const labels: Record<Tier, string> = {
    free: 'Free',
    starter: 'Starter',
    professional: 'Professional',
    discovery: 'Discovery',
  }

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[tier]} ${className}`}
    >
      {labels[tier]}
    </span>
  )
}

// Feature gate component
interface FeatureGateProps {
  children: ReactNode
  requiredTier: Tier
  fallback?: ReactNode
}

export function FeatureGate({ children, requiredTier, fallback }: FeatureGateProps) {
  const hasAccess = useTierAccess(requiredTier)

  if (!hasAccess) {
    return (
      fallback || (
        <div className="p-4 bg-surface-secondary rounded-lg border border-border text-center">
          <p className="text-text-muted text-sm">
            This feature requires {requiredTier} tier.{' '}
            <a href="/pricing" className="text-primary hover:underline">
              Upgrade
            </a>
          </p>
        </div>
      )
    )
  }

  return <>{children}</>
}
