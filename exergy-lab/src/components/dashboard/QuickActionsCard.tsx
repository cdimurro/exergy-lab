/**
 * QuickActionsCard Component
 *
 * Compact card with quick navigation to all features.
 */

'use client'

import { useRouter } from 'next/navigation'
import { Search, FlaskConical, Bot, Calculator, Cpu, ArrowRight, Zap } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface QuickAction {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  colorClass: string
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Search', href: '/search', icon: Search, colorClass: 'text-accent-blue' },
  { label: 'Experiment', href: '/experiments', icon: FlaskConical, colorClass: 'text-accent-purple' },
  { label: 'Simulation', href: '/simulations', icon: Bot, colorClass: 'text-accent-amber' },
  { label: 'TEA Report', href: '/tea-generator', icon: Calculator, colorClass: 'text-accent-cyan' },
  { label: 'Discovery', href: '/discovery', icon: Cpu, colorClass: 'text-accent-rose' },
]

export function QuickActionsCard() {
  const router = useRouter()

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-accent-amber" />
        <h3 className="font-semibold text-foreground">Quick Actions</h3>
      </div>

      <div className="space-y-2">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.href}
              onClick={() => router.push(action.href)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-background-surface transition-colors group"
            >
              <div className="p-1.5 rounded-lg bg-background-elevated">
                <Icon className={`w-4 h-4 ${action.colorClass}`} />
              </div>
              <span className="text-sm text-foreground group-hover:text-primary transition-colors flex-1 text-left">
                {action.label}
              </span>
              <ArrowRight className="w-4 h-4 text-foreground-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </button>
          )
        })}
      </div>
    </Card>
  )
}
