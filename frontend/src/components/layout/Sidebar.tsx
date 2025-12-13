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
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'TEA Calculator', href: '/tea', icon: Calculator },
  { name: 'Projects', href: '/projects', icon: FolderOpen },
  { name: 'Data Upload', href: '/upload', icon: Upload },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
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
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
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
      <div className="px-3 py-4 border-t border-border">
        <div className="px-3 py-2 rounded-lg bg-surface-elevated">
          <p className="text-xs text-text-muted">Current Plan</p>
          <p className="text-sm font-medium text-text-primary">Starter</p>
          <button className="mt-2 text-xs text-primary hover:underline">
            Upgrade to Pro
          </button>
        </div>
      </div>
    </aside>
  )
}
