'use client'

import { Card } from '@/components/ui'

interface CashFlowChartProps {
  data: Array<{
    year: number
    cashFlow: number
    cumulativeCashFlow: number
  }>
  className?: string
}

export function CashFlowChart({ data, className }: CashFlowChartProps) {
  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    }
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`
    }
    return `$${value.toFixed(0)}`
  }

  const maxValue = Math.max(...data.map((d) => Math.abs(d.cashFlow)))

  return (
    <Card className={className}>
      <h3 className="text-lg font-semibold text-foreground mb-4">Cash Flow Analysis</h3>
      <div className="space-y-2">
        {data.slice(0, 10).map((item) => {
          const isNegative = item.cashFlow < 0
          const barWidth = (Math.abs(item.cashFlow) / maxValue) * 100

          return (
            <div key={item.year} className="flex items-center gap-3">
              <span className="text-xs text-foreground-muted w-12">
                Year {item.year}
              </span>
              <div className="flex-1 flex items-center gap-2">
                {isNegative ? (
                  <>
                    <div className="flex-1" />
                    <div
                      className="h-6 bg-red-500 rounded-r"
                      style={{ width: `${barWidth}%` }}
                    />
                  </>
                ) : (
                  <div
                    className="h-6 bg-green-500 rounded-r"
                    style={{ width: `${barWidth}%` }}
                  />
                )}
              </div>
              <span className={`text-xs font-medium w-20 text-right ${
                isNegative ? 'text-red-600' : 'text-green-600'
              }`}>
                {formatCurrency(item.cashFlow)}
              </span>
            </div>
          )
        })}
      </div>
      {data.length > 10 && (
        <p className="text-xs text-foreground-muted mt-3">
          Showing first 10 years of {data.length} total years
        </p>
      )}
    </Card>
  )
}
