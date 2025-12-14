'use client'

import { DonutChart, Card, Title, Legend } from '@tremor/react'
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
      { name: 'Equipment', value: capex.equipment },
      { name: 'Installation', value: capex.installation },
      { name: 'Land', value: capex.land },
      { name: 'Grid Connection', value: capex.grid_connection },
    ].filter((item) => item.value > 0)

    return (
      <Card className={className}>
        <Title className="text-foreground">CAPEX Breakdown</Title>
        <DonutChart
          className="h-48 mt-4"
          data={data}
          category="value"
          index="name"
          colors={['emerald', 'blue', 'amber', 'purple']}
          valueFormatter={formatCurrency}
          showAnimation
        />
        <Legend
          className="mt-4"
          categories={data.map((d) => d.name)}
          colors={['emerald', 'blue', 'amber', 'purple']}
        />
      </Card>
    )
  }

  if (type === 'opex' && opex) {
    const data = [
      { name: 'Capacity Based', value: opex.capacity_based },
      { name: 'Fixed', value: opex.fixed },
      { name: 'Variable', value: opex.variable },
      { name: 'Insurance', value: opex.insurance },
    ].filter((item) => item.value > 0)

    return (
      <Card className={className}>
        <Title className="text-foreground">OPEX Breakdown</Title>
        <DonutChart
          className="h-48 mt-4"
          data={data}
          category="value"
          index="name"
          colors={['cyan', 'violet', 'rose', 'amber']}
          valueFormatter={formatCurrency}
          showAnimation
        />
        <Legend
          className="mt-4"
          categories={data.map((d) => d.name)}
          colors={['cyan', 'violet', 'rose', 'amber']}
        />
      </Card>
    )
  }

  return null
}
