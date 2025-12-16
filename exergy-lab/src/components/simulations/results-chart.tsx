'use client'

import * as React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui'
import type { SimulationVisualization } from '@/types/simulation'

export interface ResultsChartProps {
  visualization: SimulationVisualization
}

export function ResultsChart({ visualization }: ResultsChartProps) {
  // Transform data for Recharts
  const chartData = visualization.data.map((point) => ({
    timestamp: point.timestamp,
    ...point.values,
  }))

  // Get all value keys (excluding timestamp)
  const valueKeys = visualization.data.length > 0 ? Object.keys(visualization.data[0].values) : []

  // Color palette for multiple lines
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']

  return (
    <Card>
      <h3 className="text-lg font-semibold text-foreground mb-4">{visualization.title}</h3>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="timestamp"
            label={{ value: visualization.xAxis, position: 'insideBottom', offset: -5 }}
            stroke="#6b7280"
          />
          <YAxis
            label={{ value: visualization.yAxis, angle: -90, position: 'insideLeft' }}
            stroke="#6b7280"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          />
          <Legend />

          {/* Dynamic lines for each value */}
          {valueKeys.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
              name={key.charAt(0).toUpperCase() + key.slice(1)}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Chart Description */}
      <div className="mt-4 p-3 rounded-lg bg-background-surface border border-border">
        <p className="text-xs text-foreground-muted">
          <strong className="text-foreground">Chart Type:</strong>{' '}
          {visualization.type.charAt(0).toUpperCase() + visualization.type.slice(1)}
        </p>
        {visualization.zAxis && (
          <p className="text-xs text-foreground-muted mt-1">
            <strong className="text-foreground">Z-Axis:</strong> {visualization.zAxis}
          </p>
        )}
      </div>
    </Card>
  )
}
