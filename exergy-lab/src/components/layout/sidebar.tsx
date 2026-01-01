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
  Bot,
  Settings,
  HelpCircle,
  Zap,
  ChevronLeft,
  Activity,
  ClipboardCheck,
  Microscope,
  ChevronDown,
  ChevronRight,
  Flame,
  Sun,
  Wind,
  Battery,
  Droplets,
  Globe,
  Recycle,
  Factory,
  Atom,
  Clock,
} from 'lucide-react'
import { useSimulationsStore } from '@/lib/store/simulations-store'
import { Badge } from '@/components/ui'
import type { SimulationType } from '@/types/simulation-workflow'

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
}

const mainNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Discovery Engine', href: '/discovery', icon: Cpu },
  { name: 'Breakthrough Engine', href: '/breakthrough', icon: Microscope },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Experiments', href: '/experiments', icon: FlaskConical },
  { name: 'Simulations', href: '/simulations', icon: Bot },
  { name: 'TEA Reports', href: '/tea-generator', icon: Calculator },
]

const secondaryNavItems: NavItem[] = [
  { name: 'Activity Logs', href: '/admin/logs', icon: Activity },
  { name: 'Criteria', href: '/criteria', icon: ClipboardCheck },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Help', href: '/help', icon: HelpCircle },
]

// Get icon for simulation type
function getSimulationIcon(type: SimulationType): React.ElementType {
  const iconMap: Partial<Record<SimulationType, React.ElementType>> = {
    'geothermal': Flame,
    'solar': Sun,
    'wind': Wind,
    'battery': Battery,
    'hydrogen': Droplets,
    'carbon-capture': Factory,
    'materials': Atom,
    'process': Factory,
  }
  return iconMap[type] || Bot
}

// Recent Simulations Section Component
interface RecentSimulationsSectionProps {
  collapsed: boolean
}

function RecentSimulationsSection({ collapsed }: RecentSimulationsSectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(true)
  const getRecentSimulations = useSimulationsStore(state => state.getRecentSimulations)
  const recentSimulations = getRecentSimulations(5)

  if (recentSimulations.length === 0) {
    return null // Don't show section if no saved simulations
  }

  return (
    <div className="mb-4">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-foreground-subtle hover:text-foreground transition-colors"
      >
        {!collapsed && <span>Recent Simulations</span>}
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>

      {/* List */}
      {isExpanded && (
        <div className="space-y-1 mt-2">
          {recentSimulations.map((sim) => {
            const Icon = getSimulationIcon(sim.simulationType)
            const displayName = collapsed ? '' : (sim.name.length > 25 ? sim.name.slice(0, 25) + '...' : sim.name)

            return (
              <Link
                key={sim.id}
                href={`/simulations?load=${sim.id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-foreground hover:bg-background-hover transition-colors group"
                title={sim.name}
              >
                <Icon className="w-4 h-4 text-foreground-subtle group-hover:text-primary transition-colors flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-xs text-foreground-muted group-hover:text-foreground truncate">
                      {displayName}
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                      {sim.tier.toUpperCase()}
                    </Badge>
                  </>
                )}
              </Link>
            )
          })}

          {/* View All Link */}
          {!collapsed && (
            <Link
              href="/simulations/history"
              className="flex items-center gap-2 px-3 py-2 text-xs text-primary hover:text-primary/80 hover:bg-primary/5 rounded-lg transition-colors"
            >
              <Clock className="w-4 h-4" />
              <span>View All History</span>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

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
          'fixed left-0 top-0 z-40 h-screen bg-background-surface border-r border-border transition-all duration-300',
          collapsed ? 'w-20' : 'w-72',
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
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-background-hover'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 shrink-0',
                      isActive
                        ? 'text-primary'
                        : 'text-foreground'
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

        {/* Recent Simulations */}
        <RecentSimulationsSection collapsed={collapsed} />

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
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-background-hover'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0',
                    isActive
                      ? 'text-primary'
                      : 'text-foreground'
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
      <div className="p-4 border-t border-border">
        {!collapsed ? (
          <div className="px-3 py-2 flex items-center justify-between">
            <p className="text-xs text-foreground-subtle">
              Powered by AI
            </p>
            <span className="text-xs text-muted-foreground/60 font-mono">
              v0.0.6
            </span>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="text-xs text-muted-foreground/60 font-mono">
              v0.0.6
            </span>
          </div>
        )}
      </div>
    </aside>
    </>
  )
}
