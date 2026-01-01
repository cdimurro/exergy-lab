/**
 * RecentSimulationsCard Component
 *
 * Displays the 3 most recent simulations with tier, cost, and key metrics.
 */

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Bot, ArrowRight, Zap } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSimulationsStore } from '@/lib/store/simulations-store'

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  } catch {
    return timestamp
  }
}

function TierBadge({ tier }: { tier: string }) {
  const config: Record<string, { label: string; className: string }> = {
    local: { label: 'T1', className: 'bg-green-500/10 text-green-500' },
    browser: { label: 'T2', className: 'bg-amber-500/10 text-amber-500' },
    cloud: { label: 'T3', className: 'bg-purple-500/10 text-purple-500' },
  }

  const { label, className } = config[tier] || { label: tier, className: 'bg-slate-500/10 text-slate-400' }

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${className}`}>
      {label}
    </span>
  )
}

export function RecentSimulationsCard() {
  const router = useRouter()
  const { savedSimulations, stats } = useSimulationsStore()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Get top 3 most recent
  const recentItems = savedSimulations.slice(0, 3)

  if (!mounted) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-foreground-muted" />
            <h3 className="font-semibold text-foreground">Recent Simulations</h3>
          </div>
        </div>
        <div className="text-sm text-foreground-muted">Loading...</div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-foreground-muted" />
          <h3 className="font-semibold text-foreground">Recent Simulations</h3>
          {stats.totalCost > 0 && (
            <Badge variant="secondary" size="sm" className="text-xs">
              ${stats.totalCost.toFixed(2)} spent
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/simulations')}
          className="text-xs"
        >
          View All
          <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>

      {recentItems.length === 0 ? (
        <div className="text-center py-6">
          <Zap className="w-10 h-10 text-foreground-subtle mx-auto mb-2" />
          <p className="text-sm text-foreground-muted mb-3">No simulations yet</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push('/simulations')}
          >
            Run Simulation
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {recentItems.map((sim) => {
            const topMetrics = sim.results?.metrics?.slice(0, 2) || []
            return (
              <div
                key={sim.id}
                className="p-3 rounded-lg bg-background-surface hover:bg-background-elevated transition-colors cursor-pointer group"
                onClick={() => router.push(`/simulations?load=${sim.id}`)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {sim.name}
                  </p>
                  <span className="text-xs text-foreground-muted shrink-0">
                    {formatTimestamp(sim.savedAt)}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <TierBadge tier={sim.tier} />
                  {sim.cost !== undefined && sim.cost > 0 && (
                    <span className="text-xs text-foreground-muted">
                      ${sim.cost.toFixed(3)}
                    </span>
                  )}
                  {topMetrics.map((metric, i) => (
                    <span key={i} className="text-xs text-foreground-subtle">
                      {metric.name}: {metric.value}{metric.unit}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
