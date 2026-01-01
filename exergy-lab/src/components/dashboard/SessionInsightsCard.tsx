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
  colorClass: string
}

function InsightRow({ label, value, icon: Icon, colorClass }: InsightRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${colorClass}`} />
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
      <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-background-elevated">
        {stats.local > 0 && (
          <div
            className="bg-green-500 transition-all"
            style={{ width: `${(stats.local / total) * 100}%` }}
            title={`T1: ${stats.local}`}
          />
        )}
        {stats.browser > 0 && (
          <div
            className="bg-amber-500 transition-all"
            style={{ width: `${(stats.browser / total) * 100}%` }}
            title={`T2: ${stats.browser}`}
          />
        )}
        {stats.cloud > 0 && (
          <div
            className="bg-purple-500 transition-all"
            style={{ width: `${(stats.cloud / total) * 100}%` }}
            title={`T3: ${stats.cloud}`}
          />
        )}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-green-500">T1: {stats.local}</span>
        <span className="text-xs text-amber-500">T2: {stats.browser}</span>
        <span className="text-xs text-purple-500">T3: {stats.cloud}</span>
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
          <TrendingUp className="w-5 h-5 text-accent-purple" />
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
          <TrendingUp className="w-5 h-5 text-accent-purple" />
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
        <TrendingUp className="w-5 h-5 text-accent-purple" />
        <h3 className="font-semibold text-foreground">Session Insights</h3>
      </div>

      <div className="space-y-1">
        <InsightRow
          label="Simulation Cost"
          value={`$${simStore.stats.totalCost.toFixed(2)}`}
          icon={DollarSign}
          colorClass="text-accent-amber"
        />

        {bestDiscoveryScore > 0 && (
          <InsightRow
            label="Best Discovery"
            value={bestDiscoveryScore.toFixed(1)}
            icon={Trophy}
            colorClass="text-accent-rose"
          />
        )}

        <InsightRow
          label="Experiments"
          value={`${completedExperiments} saved${draftExperiments > 0 ? ', 1 draft' : ''}`}
          icon={FlaskConical}
          colorClass="text-accent-purple"
        />

        <InsightRow
          label="Simulations"
          value={`${simStore.stats.totalSimulations} total`}
          icon={Bot}
          colorClass="text-accent-amber"
        />
      </div>

      <TierBreakdown stats={simStore.stats.byTier} />
    </Card>
  )
}
