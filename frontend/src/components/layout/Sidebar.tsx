import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Calculator,
  FolderOpen,
  Upload,
  BarChart3,
  Settings,
  HelpCircle,
  Zap,
  Globe,
  Atom,
  Sparkles,
  Lock,
  LogIn,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUserTier, TierBadge } from '@/lib/auth'
import { useAuth, useUser } from '@clerk/clerk-react'

const navigation = [
  { name: 'Energy Explorer', href: '/', icon: Globe, description: 'Interactive visualization' },
  { name: 'Global Energy', href: '/energy', icon: BarChart3, description: 'Regional data & trends' },
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, description: 'Overview & quick actions' },
  { name: 'TEA Calculator', href: '/tea', icon: Calculator, description: 'Cost analysis' },
  { name: 'Projects', href: '/projects', icon: FolderOpen, description: 'Saved analyses' },
  { name: 'Data Upload', href: '/upload', icon: Upload, description: 'Import your data' },
]

const proFeatures = [
  { name: 'Exergy Analysis', href: '/exergy', icon: Atom, tier: 'Pro', description: 'Thermodynamic efficiency' },
]

const discoveryFeatures = [
  { name: 'Discovery Engine', href: '/discovery', icon: Sparkles, tier: 'Discovery', description: 'AI-powered research' },
]

const secondaryNav = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Help', href: '/help', icon: HelpCircle },
]

export function Sidebar() {
  return (
    <aside className="flex flex-col w-64 bg-surface border-r border-border h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-text-primary">Clean Energy</h1>
          <p className="text-xs text-text-muted">Intelligence Platform</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </div>

        {/* Professional Tier Features */}
        <div className="mt-6">
          <div className="flex items-center gap-2 px-3 mb-2">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Professional</span>
            <Lock className="w-3 h-3 text-text-muted" />
          </div>
          <div className="space-y-1">
            {proFeatures.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                  )
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="flex-1">{item.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-blue/20 text-accent-blue font-medium">
                  {item.tier}
                </span>
              </NavLink>
            ))}
          </div>
        </div>

        {/* Discovery Tier Features */}
        <div className="mt-6">
          <div className="flex items-center gap-2 px-3 mb-2">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Discovery</span>
            <Lock className="w-3 h-3 text-text-muted" />
          </div>
          <div className="space-y-1">
            {discoveryFeatures.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                  )
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="flex-1">{item.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-purple/20 text-accent-purple font-medium">
                  {item.tier}
                </span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Secondary Navigation */}
      <div className="px-3 py-4 border-t border-border space-y-1">
        {secondaryNav.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </div>

      {/* User/Plan Info */}
      <UserPanel />
    </aside>
  )
}

function UserPanel() {
  // Try to use Clerk hooks, but handle the case when ClerkProvider is not available
  let isSignedIn = false
  let isLoaded = true
  let user = null
  let tier: ReturnType<typeof useUserTier> = 'free'

  try {
    const authResult = useAuth()
    const userResult = useUser()
    isSignedIn = authResult.isSignedIn || false
    isLoaded = authResult.isLoaded
    user = userResult.user
    tier = useUserTier()
  } catch {
    // Clerk is not available, show mock UI
    isLoaded = true
    isSignedIn = false
  }

  if (!isLoaded) {
    return (
      <div className="px-3 py-4 border-t border-border">
        <div className="px-3 py-2 rounded-lg bg-surface-elevated animate-pulse h-16" />
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="px-3 py-4 border-t border-border">
        <div className="px-3 py-3 rounded-lg bg-surface-elevated">
          <p className="text-xs text-text-muted mb-2">Sign in to save projects</p>
          <a
            href="/pricing"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 py-4 border-t border-border">
      <div className="px-3 py-2 rounded-lg bg-surface-elevated">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {user?.firstName || 'User'}
            </p>
            <TierBadge tier={tier} />
          </div>
        </div>
        {tier !== 'discovery' && (
          <a href="/pricing" className="block w-full mt-2 text-xs text-primary hover:underline text-left">
            {tier === 'free' ? 'Upgrade Plan' : tier === 'starter' ? 'Go Pro' : 'Upgrade Plan'}
          </a>
        )}
      </div>
    </div>
  )
}
