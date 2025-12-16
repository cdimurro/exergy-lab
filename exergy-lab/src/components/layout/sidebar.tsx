'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home,
  Search,
  Calculator,
  FlaskConical,
  Cpu,
  Sparkles,
  Settings,
  HelpCircle,
  Zap,
  ChevronLeft,
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
}

const mainNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'TEA Reports', href: '/tea-generator', icon: Calculator },
  { name: 'Experiments', href: '/experiments', icon: FlaskConical },
  { name: 'Simulations', href: '/simulations', icon: Cpu },
  { name: 'Discovery', href: '/discovery', icon: Sparkles },
]

const secondaryNavItems: NavItem[] = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Help', href: '/help', icon: HelpCircle },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-background border-r border-border transition-all duration-300',
          collapsed ? 'w-20' : 'w-64',
          // Mobile: slide from left
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-base font-semibold text-foreground">
                  Exergy Lab
                </span>
                <span className="text-xs text-foreground-muted">
                  Clean Energy Research
                </span>
              </div>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'p-1.5 rounded-lg hover:bg-background-elevated text-foreground-muted hover:text-foreground transition-colors',
              collapsed && 'mx-auto'
            )}
          >
            <ChevronLeft
              className={cn(
                'w-5 h-5 transition-transform duration-300',
                collapsed && 'rotate-180'
              )}
            />
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-1">
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground-muted hover:bg-background-elevated hover:text-foreground'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 shrink-0',
                      isActive
                        ? 'text-primary'
                        : 'text-foreground-subtle group-hover:text-foreground-muted'
                    )}
                  />
                  {!collapsed && (
                    <span className="flex-1 text-sm font-medium">
                      {item.name}
                    </span>
                  )}
              </Link>
            )
          })}
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-border" />

        {/* Secondary Navigation */}
        <div className="space-y-1">
          {secondaryNavItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground-muted hover:bg-background-elevated hover:text-foreground'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0',
                    isActive
                      ? 'text-primary'
                      : 'text-foreground-subtle group-hover:text-foreground-muted'
                  )}
                />
                {!collapsed && (
                  <span className="text-sm font-medium">{item.name}</span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-border">
          <div className="px-3 py-2">
            <p className="text-xs text-foreground-subtle">
              Powered by AI
            </p>
          </div>
        </div>
      )}
    </aside>
    </>
  )
}
