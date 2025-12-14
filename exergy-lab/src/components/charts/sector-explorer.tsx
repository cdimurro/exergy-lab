'use client'

import * as React from 'react'
import { Card } from '@/components/ui'
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// Generate sector energy data
const generateSectorData = () => {
  const years: number[] = []
  for (let year = 1965; year <= 2024; year++) {
    years.push(year)
  }

  return years.map((year) => {
    const yearIndex = year - 1965

    // Sector energy consumption patterns (EJ)
    const industry = 30 + yearIndex * 0.6 + Math.sin(yearIndex * 0.15) * 2
    const transport = 20 + yearIndex * 0.5 + Math.sin(yearIndex * 0.2) * 1.5
    const residential = 15 + yearIndex * 0.25 + Math.sin(yearIndex * 0.1) * 1
    const commercial = 8 + yearIndex * 0.35
    const agriculture = 3 + yearIndex * 0.08
    const other = 2 + yearIndex * 0.1

    return {
      year: year.toString(),
      'Industry': Math.round(industry * 10) / 10,
      'Transport': Math.round(transport * 10) / 10,
      'Residential': Math.round(residential * 10) / 10,
      'Commercial': Math.round(commercial * 10) / 10,
      'Agriculture': Math.round(agriculture * 10) / 10,
      'Other': Math.round(other * 10) / 10,
    }
  })
}

const sectorData = generateSectorData()

// Latest year data for donut chart
const latestSectorData = [
  { name: 'Industry', value: 65.4, color: '#71717a' },
  { name: 'Transport', value: 49.5, color: '#3b82f6' },
  { name: 'Residential', value: 29.8, color: '#f59e0b' },
  { name: 'Commercial', value: 28.7, color: '#8b5cf6' },
  { name: 'Agriculture', value: 7.7, color: '#10b981' },
  { name: 'Other', value: 7.9, color: '#94a3b8' },
]

// Direct hex colors for Recharts
const sectorColors: Record<string, string> = {
  'Industry': '#71717a',
  'Transport': '#3b82f6',
  'Residential': '#f59e0b',
  'Commercial': '#8b5cf6',
  'Agriculture': '#10b981',
  'Other': '#94a3b8',
}

// Button colors for light theme
const buttonColors: Record<string, { selected: string; unselected: string }> = {
  'Industry': { selected: 'bg-zinc-500 border-zinc-500 text-white ring-2 ring-zinc-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  'Transport': { selected: 'bg-blue-500 border-blue-500 text-white ring-2 ring-blue-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  'Residential': { selected: 'bg-amber-500 border-amber-500 text-white ring-2 ring-amber-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  'Commercial': { selected: 'bg-violet-500 border-violet-500 text-white ring-2 ring-violet-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  'Agriculture': { selected: 'bg-emerald-500 border-emerald-500 text-white ring-2 ring-emerald-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  'Other': { selected: 'bg-slate-400 border-slate-400 text-white ring-2 ring-slate-400 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
}

// Color mapping for legend dots (Tailwind classes)
const colorMap: Record<string, string> = {
  'Industry': 'bg-zinc-500',
  'Transport': 'bg-blue-500',
  'Residential': 'bg-amber-500',
  'Commercial': 'bg-violet-500',
  'Agriculture': 'bg-emerald-500',
  'Other': 'bg-slate-400',
}

const allSectors = ['Industry', 'Transport', 'Residential', 'Commercial', 'Agriculture', 'Other']

type ViewType = 'timeseries' | 'breakdown'

interface SectorExplorerProps {
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

// Pie tooltip
function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) {
  if (!active || !payload || payload.length === 0) return null

  const item = payload[0]
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: item.payload.color }}
        />
        <span className="font-bold text-lg text-gray-800">{item.name}</span>
      </div>
      <span className="text-base font-medium text-gray-900">{item.value.toFixed(1)} EJ</span>
    </div>
  )
}

export function SectorExplorer({ className }: SectorExplorerProps) {
  const [viewType, setViewType] = React.useState<ViewType>('timeseries')
  const [selectedSectors, setSelectedSectors] = React.useState<string[]>(allSectors)

  const toggleSector = (sector: string) => {
    setSelectedSectors((prev) => {
      if (prev.length === allSectors.length) {
        return [sector]
      }
      if (prev.length === 1 && prev.includes(sector)) {
        return allSectors
      }
      return prev.includes(sector)
        ? prev.filter((s) => s !== sector)
        : [...prev, sector]
    })
  }

  return (
    <Card className={`bg-background-elevated border-border ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold text-foreground">Explore by Sector or Industry</h3>
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
            onClick={() => setViewType('breakdown')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              viewType === 'breakdown'
                ? 'bg-accent-blue text-white'
                : 'bg-background-surface text-foreground-muted hover:bg-background-surface/80'
            }`}
          >
            2024 Breakdown
          </button>
        </div>
      </div>

      {/* Sector Toggles */}
      {viewType === 'timeseries' && (
        <div className="flex flex-wrap gap-2 mb-4">
          {allSectors.map((sector) => {
            const isSelected = selectedSectors.includes(sector)
            const colors = buttonColors[sector]
            return (
              <button
                key={sector}
                onClick={() => toggleSector(sector)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                  isSelected ? colors.selected : colors.unselected
                }`}
              >
                {sector}
              </button>
            )
          })}
        </div>
      )}

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {viewType === 'timeseries' ? (
            <AreaChart data={sectorData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
              {selectedSectors.map((sector) => (
                <Area
                  key={sector}
                  type="monotone"
                  dataKey={sector}
                  stackId="1"
                  stroke={sectorColors[sector]}
                  fill={sectorColors[sector]}
                  fillOpacity={0.7}
                />
              ))}
            </AreaChart>
          ) : (
            <PieChart>
              <Pie
                data={latestSectorData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
              >
                {latestSectorData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      {viewType === 'timeseries' ? (
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 pt-3 border-t border-border mt-4">
          {selectedSectors.map((sector) => (
            <div key={sector} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${colorMap[sector] || 'bg-gray-500'}`} />
              <span className="text-xs text-foreground-muted">{sector}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 pt-3 border-t border-border mt-4">
          {latestSectorData.map((sector) => (
            <div key={sector.name} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sector.color }} />
              <span className="text-xs text-foreground-muted">{sector.name}: {sector.value} EJ</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
