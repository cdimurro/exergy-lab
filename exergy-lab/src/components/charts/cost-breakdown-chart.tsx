'use client'

import { Card } from '@/components/ui'
import type { CAPEXBreakdown, OPEXBreakdown } from '@/types/tea'

interface CostBreakdownChartProps {
  capex?: CAPEXBreakdown
  opex?: OPEXBreakdown
  type: 'capex' | 'opex'
  className?: string
}

export function CostBreakdownChart({
  capex,
  opex,
  type,
  className,
}: CostBreakdownChartProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`
    }
    return `$${value.toFixed(0)}`
  }

  if (type === 'capex' && capex) {
    const data = [
      { name: 'Equipment', value: capex.equipment, color: 'bg-emerald-500' },
      { name: 'Installation', value: capex.installation, color: 'bg-blue-500' },
      { name: 'Land', value: capex.land, color: 'bg-amber-500' },
      { name: 'Grid Connection', value: capex.grid_connection, color: 'bg-purple-500' },
    ].filter((item) => item.value > 0)

    const total = data.reduce((sum, item) => sum + item.value, 0)

    return (
      <Card className={className}>
        <h3 className="text-lg font-semibold text-foreground mb-4">CAPEX Breakdown</h3>
        <div className="space-y-3">
          {data.map((item) => {
            const percentage = ((item.value / total) * 100).toFixed(1)
            return (
              <div key={item.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-sm text-foreground-muted">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {formatCurrency(item.value)} ({percentage}%)
                  </span>
                </div>
                <div className="w-full bg-background-surface rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${item.color}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Total CAPEX</span>
            <span className="text-lg font-bold text-foreground">{formatCurrency(total)}</span>
          </div>
        </div>
      </Card>
    )
  }

  if (type === 'opex' && opex) {
    const data = [
      { name: 'Capacity Based', value: opex.capacity_based, color: 'bg-cyan-500' },
      { name: 'Fixed', value: opex.fixed, color: 'bg-violet-500' },
      { name: 'Variable', value: opex.variable, color: 'bg-rose-500' },
      { name: 'Insurance', value: opex.insurance, color: 'bg-amber-500' },
    ].filter((item) => item.value > 0)

    const total = data.reduce((sum, item) => sum + item.value, 0)

    return (
      <Card className={className}>
        <h3 className="text-lg font-semibold text-foreground mb-4">OPEX Breakdown</h3>
        <div className="space-y-3">
          {data.map((item) => {
            const percentage = ((item.value / total) * 100).toFixed(1)
            return (
              <div key={item.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-sm text-foreground-muted">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {formatCurrency(item.value)} ({percentage}%)
                  </span>
                </div>
                <div className="w-full bg-background-surface rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${item.color}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Total Annual OPEX</span>
            <span className="text-lg font-bold text-foreground">{formatCurrency(total)}</span>
          </div>
        </div>
      </Card>
    )
  }

  return null
}
