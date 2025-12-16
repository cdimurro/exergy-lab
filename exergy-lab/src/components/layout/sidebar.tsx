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

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-gray-50 border-r border-gray-200 transition-all duration-300',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100">
            <Zap className="w-5 h-5 text-blue-600" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-semibold text-gray-800">
                Exergy Lab
              </span>
              <span className="text-xs text-gray-500">
                Clean Energy Research
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors',
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
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0',
                    isActive
                      ? 'text-blue-600'
                      : 'text-gray-500 group-hover:text-gray-700'
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
        <div className="my-4 border-t border-gray-200" />

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
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0',
                    isActive
                      ? 'text-blue-600'
                      : 'text-gray-500 group-hover:text-gray-700'
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
        <div className="p-4 border-t border-gray-200">
          <div className="px-3 py-2">
            <p className="text-xs text-gray-400">
              Powered by AI
            </p>
          </div>
        </div>
      )}
    </aside>
  )
}
