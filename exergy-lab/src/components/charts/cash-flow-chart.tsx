'use client'

import { BarChart, Card, Title, Text } from '@tremor/react'

interface CashFlowChartProps {
  cashFlows: number[]
  title?: string
  className?: string
}

export function CashFlowChart({
  cashFlows,
  title = 'Annual Cash Flows',
  className,
}: CashFlowChartProps) {
  // Convert cash flows array to chart data
  const data = cashFlows.map((value, index) => ({
    year: index === 0 ? 'Year 0' : `Year ${index}`,
    'Cash Flow': value / 1000000, // Convert to millions
    color: value >= 0 ? 'emerald' : 'rose',
  }))

  return (
    <Card className={className}>
      <Title className="text-foreground">{title}</Title>
      <Text className="text-foreground-muted">Project cash flows in millions ($M)</Text>
      <BarChart
        className="h-64 mt-4"
        data={data}
        index="year"
        categories={['Cash Flow']}
        colors={['emerald']}
        valueFormatter={(value) => `$${value.toFixed(1)}M`}
        showAnimation
        showGridLines={false}
      />
    </Card>
  )
}
