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
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Search', href: '/search', icon: Search },
  { label: 'Experiment', href: '/experiments', icon: FlaskConical },
  { label: 'Simulation', href: '/simulations', icon: Bot },
  { label: 'TEA Report', href: '/tea-generator', icon: Calculator },
  { label: 'Discovery', href: '/discovery', icon: Cpu },
]

export function QuickActionsCard() {
  const router = useRouter()

  return (
    <Card>
      <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>

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
                <Icon className="w-4 h-4 text-foreground-muted" />
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
