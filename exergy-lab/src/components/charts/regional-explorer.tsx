'use client'

import * as React from 'react'
import { Card } from '@/components/ui'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

// Generate regional energy data
const generateRegionalData = () => {
  const years: number[] = []
  for (let year = 1965; year <= 2024; year++) {
    years.push(year)
  }

  return years.map((year) => {
    const yearIndex = year - 1965
    const t = yearIndex / 59

    // Regional energy consumption patterns (EJ)
    const northAmerica = 25 + yearIndex * 0.3 + Math.sin(yearIndex * 0.2) * 2
    const europe = 20 + yearIndex * 0.15 + Math.sin(yearIndex * 0.15) * 1.5
    const asiaPacific = 15 + Math.pow(t, 1.8) * 80 // Rapid growth
    const middleEast = 2 + yearIndex * 0.25
    const africa = 3 + yearIndex * 0.15
    const latinAmerica = 5 + yearIndex * 0.2
    const cis = year >= 1991 ? 12 + (year - 1991) * 0.1 : 0

    return {
      year: year.toString(),
      'North America': Math.round(northAmerica * 10) / 10,
      'Europe': Math.round(europe * 10) / 10,
      'Asia Pacific': Math.round(asiaPacific * 10) / 10,
      'Middle East': Math.round(middleEast * 10) / 10,
      'Africa': Math.round(africa * 10) / 10,
      'Latin America': Math.round(latinAmerica * 10) / 10,
      'CIS': Math.round(Math.max(0, cis) * 10) / 10,
    }
  })
}

const regionalData = generateRegionalData()

// Latest year data for bar chart
const latestRegionalData = [
  { region: 'Asia Pacific', value: 95.2, color: '#3b82f6' },
  { region: 'North America', value: 28.5, color: '#10b981' },
  { region: 'Europe', value: 22.3, color: '#8b5cf6' },
  { region: 'Middle East', value: 16.8, color: '#f59e0b' },
  { region: 'CIS', value: 13.2, color: '#06b6d4' },
  { region: 'Latin America', value: 8.9, color: '#f97316' },
  { region: 'Africa', value: 6.4, color: '#f43f5e' },
]

// Direct hex colors for Recharts
const regionColors: Record<string, string> = {
  'North America': '#10b981',
  'Europe': '#8b5cf6',
  'Asia Pacific': '#3b82f6',
  'Middle East': '#f59e0b',
  'Africa': '#f43f5e',
  'Latin America': '#f97316',
  'CIS': '#06b6d4',
}

// Button colors for light theme
const buttonColors: Record<string, { selected: string; unselected: string }> = {
  'North America': { selected: 'bg-emerald-500 border-emerald-500 text-white ring-2 ring-emerald-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  'Europe': { selected: 'bg-violet-500 border-violet-500 text-white ring-2 ring-violet-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  'Asia Pacific': { selected: 'bg-blue-500 border-blue-500 text-white ring-2 ring-blue-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  'Middle East': { selected: 'bg-amber-500 border-amber-500 text-white ring-2 ring-amber-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  'Africa': { selected: 'bg-rose-500 border-rose-500 text-white ring-2 ring-rose-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  'Latin America': { selected: 'bg-orange-500 border-orange-500 text-white ring-2 ring-orange-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  'CIS': { selected: 'bg-cyan-500 border-cyan-500 text-white ring-2 ring-cyan-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
}

// Color mapping for legend dots (Tailwind classes)
const colorMap: Record<string, string> = {
  'North America': 'bg-emerald-500',
  'Europe': 'bg-violet-500',
  'Asia Pacific': 'bg-blue-500',
  'Middle East': 'bg-amber-500',
  'Africa': 'bg-rose-500',
  'Latin America': 'bg-orange-500',
  'CIS': 'bg-cyan-500',
}

const allRegions = ['North America', 'Europe', 'Asia Pacific', 'Middle East', 'Africa', 'Latin America', 'CIS']

type ViewType = 'timeseries' | 'comparison'

interface RegionalExplorerProps {
  className?: string
}

// Custom tooltip component
interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const total = payload.reduce((sum, item) => sum + (item.value || 0), 0)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-lg">
      <p className="font-bold text-xl text-gray-800 mb-3">{label}</p>
      <div className="space-y-2">
        {payload
          .filter(item => item.value > 0)
          .sort((a, b) => b.value - a.value)
          .map((item) => (
            <div key={item.dataKey || item.name} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-base text-gray-700">{item.name}</span>
              </div>
              <span className="text-base font-medium text-gray-900">{item.value.toFixed(1)} EJ</span>
            </div>
          ))}
      </div>
      <div className="border-t border-gray-200 mt-3 pt-3 flex items-center justify-between">
        <span className="text-lg font-semibold text-gray-700">Total</span>
        <span className="text-lg font-bold text-gray-900">{total.toFixed(1)} EJ</span>
      </div>
    </div>
  )
}

// Bar tooltip
function BarTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
      <p className="font-bold text-lg text-gray-800 mb-1">{label}</p>
      <span className="text-base font-medium text-gray-900">{payload[0]?.value?.toFixed(1)} EJ</span>
    </div>
  )
}

export function RegionalExplorer({ className }: RegionalExplorerProps) {
  const [viewType, setViewType] = React.useState<ViewType>('timeseries')
  const [selectedRegions, setSelectedRegions] = React.useState<string[]>(allRegions)

  const toggleRegion = (region: string) => {
    setSelectedRegions((prev) => {
      if (prev.length === allRegions.length) {
        return [region]
      }
      if (prev.length === 1 && prev.includes(region)) {
        return allRegions
      }
      return prev.includes(region)
        ? prev.filter((r) => r !== region)
        : [...prev, region]
    })
  }

  return (
    <Card className={`bg-background-elevated border-border ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold text-foreground">Explore by Country or Region</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setViewType('timeseries')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              viewType === 'timeseries'
                ? 'bg-accent-blue text-white'
                : 'bg-background-surface text-foreground-muted hover:bg-background-surface/80'
            }`}
          >
            Over Time
          </button>
          <button
            onClick={() => setViewType('comparison')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              viewType === 'comparison'
                ? 'bg-accent-blue text-white'
                : 'bg-background-surface text-foreground-muted hover:bg-background-surface/80'
            }`}
          >
            2024 Comparison
          </button>
        </div>
      </div>

      {/* Region Toggles */}
      {viewType === 'timeseries' && (
        <div className="flex flex-wrap gap-2 mb-4">
          {allRegions.map((region) => {
            const isSelected = selectedRegions.includes(region)
            const colors = buttonColors[region]
            return (
              <button
                key={region}
                onClick={() => toggleRegion(region)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                  isSelected ? colors.selected : colors.unselected
                }`}
              >
                {region}
              </button>
            )
          })}
        </div>
      )}

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {viewType === 'timeseries' ? (
            <AreaChart data={regionalData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey="year"
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={{ stroke: '#e0e0e0' }}
                axisLine={{ stroke: '#e0e0e0' }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={{ stroke: '#e0e0e0' }}
                axisLine={{ stroke: '#e0e0e0' }}
              />
              <Tooltip content={<CustomTooltip />} />
              {selectedRegions.map((region) => (
                <Area
                  key={region}
                  type="monotone"
                  dataKey={region}
                  stackId="1"
                  stroke={regionColors[region]}
                  fill={regionColors[region]}
                  fillOpacity={0.7}
                />
              ))}
            </AreaChart>
          ) : (
            <BarChart data={latestRegionalData} layout="vertical" margin={{ top: 10, right: 10, left: 80, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" strokeOpacity={0.5} horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={{ stroke: '#e0e0e0' }}
                axisLine={{ stroke: '#e0e0e0' }}
              />
              <YAxis
                type="category"
                dataKey="region"
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={{ stroke: '#e0e0e0' }}
                axisLine={{ stroke: '#e0e0e0' }}
                width={75}
              />
              <Tooltip content={<BarTooltip />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {latestRegionalData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      {viewType === 'timeseries' && (
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 pt-3 border-t border-border mt-4">
          {selectedRegions.map((region) => (
            <div key={region} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${colorMap[region] || 'bg-gray-500'}`} />
              <span className="text-xs text-foreground-muted">{region}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
