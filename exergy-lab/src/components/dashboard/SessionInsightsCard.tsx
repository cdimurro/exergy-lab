/**
 * SessionInsightsCard Component
 *
 * Displays aggregate metrics across all features.
 */

'use client'

import * as React from 'react'
import { TrendingUp, DollarSign, Trophy, FlaskConical, Bot } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useSimulationsStore } from '@/lib/store/simulations-store'
import { useExperimentsStore } from '@/lib/store/experiments-store'
import { useDiscoveriesStore } from '@/lib/store/discoveries-store'

interface InsightRowProps {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
}

function InsightRow({ label, value, icon: Icon }: InsightRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-foreground-muted" />
        <span className="text-sm text-foreground-muted">{label}</span>
      </div>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

function TierBreakdown({ stats }: { stats: { local: number; browser: number; cloud: number } }) {
  const total = stats.local + stats.browser + stats.cloud
  if (total === 0) return null

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <p className="text-xs text-foreground-muted mb-2">Simulation Tiers</p>
      <div className="flex justify-between text-xs text-foreground-muted">
        <span>T1 (Local): {stats.local}</span>
        <span>T2 (Browser): {stats.browser}</span>
        <span>T3 (Cloud): {stats.cloud}</span>
      </div>
    </div>
  )
}

export function SessionInsightsCard() {
  const simStore = useSimulationsStore()
  const expStore = useExperimentsStore()
  const discStore = useDiscoveriesStore()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-foreground-muted" />
          <h3 className="font-semibold text-foreground">Session Insights</h3>
        </div>
        <div className="text-sm text-foreground-muted">Loading...</div>
      </Card>
    )
  }

  // Calculate best discovery score
  const bestDiscoveryScore = discStore.savedDiscoveries.length > 0
    ? Math.max(
        ...discStore.savedDiscoveries.flatMap((d) =>
          d.report.ideas.map(
            (i) => (i.noveltyScore + i.feasibilityScore + i.impactScore) / 3
          )
        )
      )
    : 0

  // Count experiments by status
  const completedExperiments = expStore.savedExperiments.length
  const draftExperiments = expStore.currentDraft ? 1 : 0

  // Check if there's any data to show
  const hasData =
    simStore.stats.totalSimulations > 0 ||
    completedExperiments > 0 ||
    discStore.savedDiscoveries.length > 0

  if (!hasData) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-foreground-muted" />
          <h3 className="font-semibold text-foreground">Session Insights</h3>
        </div>
        <p className="text-sm text-foreground-muted text-center py-4">
          Complete your first task to see insights
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-foreground-muted" />
        <h3 className="font-semibold text-foreground">Session Insights</h3>
      </div>

      <div className="space-y-1">
        <InsightRow
          label="Simulation Cost"
          value={`$${simStore.stats.totalCost.toFixed(2)}`}
          icon={DollarSign}
        />

        {bestDiscoveryScore > 0 && (
          <InsightRow
            label="Best Discovery"
            value={bestDiscoveryScore.toFixed(1)}
            icon={Trophy}
          />
        )}

        <InsightRow
          label="Experiments"
          value={`${completedExperiments} saved${draftExperiments > 0 ? ', 1 draft' : ''}`}
          icon={FlaskConical}
        />

        <InsightRow
          label="Simulations"
          value={`${simStore.stats.totalSimulations} total`}
          icon={Bot}
        />
      </div>

      <TierBreakdown stats={simStore.stats.byTier} />
    </Card>
  )
}
