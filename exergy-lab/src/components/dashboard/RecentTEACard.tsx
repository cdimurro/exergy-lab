/**
 * RecentTEACard Component
 *
 * Displays the 3 most recent TEA reports with key metrics (LCOE, NPV, IRR).
 */

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Calculator, ArrowRight, BarChart3 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTEAStore } from '@/lib/store/tea-store'

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

function formatTechnology(tech: string): string {
  const map: Record<string, string> = {
    solar: 'Solar',
    wind: 'Wind',
    offshore_wind: 'Offshore Wind',
    hydrogen: 'Hydrogen',
    storage: 'Storage',
    nuclear: 'Nuclear',
    geothermal: 'Geothermal',
    hydro: 'Hydro',
    biomass: 'Biomass',
    generic: 'Generic',
  }
  return map[tech] || tech.charAt(0).toUpperCase() + tech.slice(1)
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
  if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

export function RecentTEACard() {
  const router = useRouter()
  const { savedReports } = useTEAStore()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Get top 3 most recent
  const recentItems = savedReports.slice(0, 3)

  if (!mounted) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-accent-cyan" />
            <h3 className="font-semibold text-foreground">Recent TEA Reports</h3>
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
          <Calculator className="w-5 h-5 text-accent-cyan" />
          <h3 className="font-semibold text-foreground">Recent TEA Reports</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/tea-generator')}
          className="text-xs"
        >
          View All
          <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>

      {recentItems.length === 0 ? (
        <div className="text-center py-6">
          <BarChart3 className="w-10 h-10 text-foreground-subtle mx-auto mb-2" />
          <p className="text-sm text-foreground-muted mb-3">No TEA reports yet</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push('/tea-generator')}
          >
            Generate Report
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {recentItems.map((report) => {
            const { lcoe, npv, irr } = report.result
            return (
              <div
                key={report.id}
                className="p-3 rounded-lg bg-background-surface hover:bg-background-elevated transition-colors cursor-pointer group"
                onClick={() => router.push(`/tea-generator?load=${report.id}`)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {report.projectName}
                  </p>
                  <span className="text-xs text-foreground-muted shrink-0">
                    {formatTimestamp(report.savedAt)}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" size="sm" className="text-xs">
                    {formatTechnology(report.technology)}
                  </Badge>
                  <span className="text-xs text-foreground-subtle">
                    LCOE: ${lcoe?.toFixed(3) || '-'}/kWh
                  </span>
                  <span className="text-xs text-foreground-subtle">
                    NPV: {formatCurrency(npv || 0)}
                  </span>
                  <span className="text-xs text-foreground-subtle">
                    IRR: {((irr || 0) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
