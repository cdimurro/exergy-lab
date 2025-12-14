'use client'

import * as React from 'react'
import { Card } from '@/components/ui'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Download, Maximize2 } from 'lucide-react'

// Energy colors - distinct colors for each source
const ENERGY_COLORS: Record<string, string> = {
  coal: '#475569',      // Slate
  oil: '#f97316',       // Orange
  gas: '#06b6d4',       // Cyan
  nuclear: '#8b5cf6',   // Purple
  hydro: '#3b82f6',     // Blue
  wind: '#14b8a6',      // Teal
  solar: '#f59e0b',     // Amber
  biomass: '#166534',   // Dark Green
  geothermal: '#f43f5e', // Rose
  other: '#84cc16',     // Lime (bright lime, distinct from teal)
  fossil: '#DC2626',    // Red
  clean: '#16A34A',     // Green
}

// Generate realistic energy data from 1965-2024
const generateEnergyData = () => {
  const years: number[] = []
  for (let year = 1965; year <= 2024; year++) {
    years.push(year)
  }

  return years.map((year) => {
    const yearIndex = year - 1965
    const t = yearIndex / 59 // Normalized time 0-1

    // Coal: grew until 2013, then declining
    const coalPeak = year <= 2013 ? 1 + t * 1.5 : 1 + 0.81 * 1.5 - (year - 2013) * 0.02
    const coal = Math.max(15, 20 * coalPeak + Math.sin(yearIndex * 0.3) * 2)

    // Oil: steady growth with some fluctuations
    const oil = 25 + yearIndex * 0.5 + Math.sin(yearIndex * 0.2) * 3

    // Natural Gas: accelerating growth
    const gas = 8 + yearIndex * 0.8 + Math.pow(t, 1.5) * 20

    // Nuclear: grew 1970-2000, then plateaued
    const nuclear = year < 1970 ? 0.1 : Math.min(8, (year - 1970) * 0.3) + (year > 2000 ? Math.sin((year - 2000) * 0.2) * 0.5 : 0)

    // Hydro: steady slow growth
    const hydro = 4 + yearIndex * 0.12 + Math.sin(yearIndex * 0.15) * 0.5

    // Wind: exponential growth from 1995
    const wind = year < 1995 ? 0.1 : Math.pow((year - 1995) / 29, 2.5) * 12

    // Solar: exponential growth from 2005
    const solar = year < 2005 ? 0.1 : Math.pow((year - 2005) / 19, 3) * 8

    // Biomass: slow steady growth
    const biomass = 2 + yearIndex * 0.08

    // Geothermal: very small steady
    const geothermal = 0.3 + yearIndex * 0.015

    // Other Renewables
    const otherRenewables = 0.1 + yearIndex * 0.01

    return {
      year: year.toString(),
      Coal: Math.round(coal * 10) / 10,
      Oil: Math.round(oil * 10) / 10,
      'Natural Gas': Math.round(gas * 10) / 10,
      Nuclear: Math.round(Math.max(0.1, nuclear) * 10) / 10,
      Hydro: Math.round(hydro * 10) / 10,
      Wind: Math.round(Math.max(0.1, wind) * 10) / 10,
      Solar: Math.round(Math.max(0.1, solar) * 10) / 10,
      Biomass: Math.round(biomass * 10) / 10,
      Geothermal: Math.round(geothermal * 10) / 10,
      'Other Renewables': Math.round(otherRenewables * 10) / 10,
    }
  })
}

const energyData = generateEnergyData()

// Calculate fossil vs clean totals
const fossilVsCleanData = energyData.map((d) => ({
  year: d.year,
  'Fossil Fuels': Math.round((d.Coal + d.Oil + d['Natural Gas']) * 10) / 10,
  'Clean Energy': Math.round((d.Nuclear + d.Hydro + d.Wind + d.Solar + d.Biomass + d.Geothermal + d['Other Renewables']) * 10) / 10,
}))

// Calculate annual change data
const annualChangeData = energyData.slice(1).map((current, i) => {
  const prev = energyData[i]
  return {
    year: current.year,
    Coal: Math.round((current.Coal - prev.Coal) * 100) / 100,
    Oil: Math.round((current.Oil - prev.Oil) * 100) / 100,
    'Natural Gas': Math.round((current['Natural Gas'] - prev['Natural Gas']) * 100) / 100,
    Nuclear: Math.round((current.Nuclear - prev.Nuclear) * 100) / 100,
    Hydro: Math.round((current.Hydro - prev.Hydro) * 100) / 100,
    Wind: Math.round((current.Wind - prev.Wind) * 100) / 100,
    Solar: Math.round((current.Solar - prev.Solar) * 100) / 100,
    Biomass: Math.round((current.Biomass - prev.Biomass) * 100) / 100,
    Geothermal: Math.round((current.Geothermal - prev.Geothermal) * 100) / 100,
    'Other Renewables': Math.round((current['Other Renewables'] - prev['Other Renewables']) * 100) / 100,
  }
})

// Calculate relative (percentage) data
const relativeData = energyData.map((d) => {
  const total = d.Coal + d.Oil + d['Natural Gas'] + d.Nuclear + d.Hydro + d.Wind + d.Solar + d.Biomass + d.Geothermal + d['Other Renewables']
  return {
    year: d.year,
    Coal: Math.round((d.Coal / total) * 1000) / 10,
    Oil: Math.round((d.Oil / total) * 1000) / 10,
    'Natural Gas': Math.round((d['Natural Gas'] / total) * 1000) / 10,
    Nuclear: Math.round((d.Nuclear / total) * 1000) / 10,
    Hydro: Math.round((d.Hydro / total) * 1000) / 10,
    Wind: Math.round((d.Wind / total) * 1000) / 10,
    Solar: Math.round((d.Solar / total) * 1000) / 10,
    Biomass: Math.round((d.Biomass / total) * 1000) / 10,
    Geothermal: Math.round((d.Geothermal / total) * 1000) / 10,
    'Other Renewables': Math.round((d['Other Renewables'] / total) * 1000) / 10,
  }
})

const relativeFossilVsCleanData = fossilVsCleanData.map((d) => {
  const total = d['Fossil Fuels'] + d['Clean Energy']
  return {
    year: d.year,
    'Fossil Fuels': Math.round((d['Fossil Fuels'] / total) * 1000) / 10,
    'Clean Energy': Math.round((d['Clean Energy'] / total) * 1000) / 10,
  }
})

type ChartType = 'total' | 'change'
type SourceFilter = 'all' | 'fossilVsClean' | 'fossil' | 'clean'

const allSources = ['Coal', 'Oil', 'Natural Gas', 'Nuclear', 'Hydro', 'Wind', 'Solar', 'Biomass', 'Geothermal', 'Other Renewables']
const fossilSources = ['Coal', 'Oil', 'Natural Gas']
const cleanSources = ['Nuclear', 'Hydro', 'Wind', 'Solar', 'Biomass', 'Geothermal', 'Other Renewables']

// Direct hex colors for Recharts (matching reference code)
const sourceColors: Record<string, string> = {
  Coal: ENERGY_COLORS.coal,
  Oil: ENERGY_COLORS.oil,
  'Natural Gas': ENERGY_COLORS.gas,
  Nuclear: ENERGY_COLORS.nuclear,
  Hydro: ENERGY_COLORS.hydro,
  Wind: ENERGY_COLORS.wind,
  Solar: ENERGY_COLORS.solar,
  Biomass: ENERGY_COLORS.biomass,
  Geothermal: ENERGY_COLORS.geothermal,
  'Other Renewables': ENERGY_COLORS.other,
  'Fossil Fuels': ENERGY_COLORS.fossil,
  'Clean Energy': ENERGY_COLORS.clean,
}

// Button colors for light theme - solid colors when selected
const buttonColors: Record<string, { selected: string; unselected: string }> = {
  Coal: { selected: 'bg-slate-600 border-slate-600 text-white ring-2 ring-slate-600 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  Oil: { selected: 'bg-orange-500 border-orange-500 text-white ring-2 ring-orange-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  'Natural Gas': { selected: 'bg-cyan-500 border-cyan-500 text-white ring-2 ring-cyan-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  Nuclear: { selected: 'bg-violet-500 border-violet-500 text-white ring-2 ring-violet-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  Hydro: { selected: 'bg-blue-500 border-blue-500 text-white ring-2 ring-blue-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  Wind: { selected: 'bg-teal-500 border-teal-500 text-white ring-2 ring-teal-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  Solar: { selected: 'bg-amber-500 border-amber-500 text-white ring-2 ring-amber-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  Biomass: { selected: 'bg-green-800 border-green-800 text-white ring-2 ring-green-800 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  Geothermal: { selected: 'bg-rose-500 border-rose-500 text-white ring-2 ring-rose-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  'Other Renewables': { selected: 'bg-lime-500 border-lime-500 text-white ring-2 ring-lime-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
}

// Color mapping for legend dots (Tailwind classes)
const colorMap: Record<string, string> = {
  Coal: 'bg-slate-500',
  Oil: 'bg-orange-500',
  'Natural Gas': 'bg-cyan-500',
  Nuclear: 'bg-violet-500',
  Hydro: 'bg-blue-500',
  Wind: 'bg-teal-500',
  Solar: 'bg-amber-500',
  Biomass: 'bg-green-800',
  Geothermal: 'bg-rose-500',
  'Other Renewables': 'bg-lime-500',
  'Fossil Fuels': 'bg-red-600',
  'Clean Energy': 'bg-green-600',
}

interface InteractiveEnergyExplorerProps {
  className?: string
}

// Custom tooltip component
interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>
  label?: string
  valueFormatter: (value: number) => string
}

function CustomTooltip({ active, payload, label, valueFormatter }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const total = payload.reduce((sum, item) => sum + (item.value || 0), 0)

  return (
    <div className="bg-white border border-gray-200 rounded p-2 shadow-lg text-xs">
      <p className="font-bold text-sm text-gray-800 mb-1">{label}</p>
      <div className="space-y-0.5 max-h-40 overflow-y-auto">
        {payload
          .filter(item => item.value > 0)
          .sort((a, b) => b.value - a.value)
          .map((item) => (
            <div key={item.dataKey} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-gray-700">{item.name}</span>
              </div>
              <span className="text-xs font-medium text-gray-900">{valueFormatter(item.value)}</span>
            </div>
          ))}
      </div>
      <div className="border-t border-gray-200 mt-1 pt-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">Total</span>
        <span className="text-xs font-bold text-gray-900">{valueFormatter(total)}</span>
      </div>
    </div>
  )
}

export function InteractiveEnergyExplorer({ className }: InteractiveEnergyExplorerProps) {
  const [chartType, setChartType] = React.useState<ChartType>('total')
  const [sourceFilter, setSourceFilter] = React.useState<SourceFilter>('all')
  const [selectedSources, setSelectedSources] = React.useState<string[]>(allSources)
  const [showRelative, setShowRelative] = React.useState(false)

  const toggleSource = (source: string) => {
    setSelectedSources((prev) => {
      if (prev.length === allSources.length) {
        return [source]
      }
      if (prev.length === 1 && prev.includes(source)) {
        return allSources
      }
      return prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source]
    })
    setSourceFilter('all')
  }

  const handleFilterChange = (filter: SourceFilter) => {
    setSourceFilter(filter)
    if (filter === 'all') {
      setSelectedSources(allSources)
    } else if (filter === 'fossil') {
      setSelectedSources(fossilSources)
    } else if (filter === 'clean') {
      setSelectedSources(cleanSources)
    } else if (filter === 'fossilVsClean') {
      setSelectedSources(['Fossil Fuels', 'Clean Energy'])
    }
  }

  const isFossilVsClean = sourceFilter === 'fossilVsClean'
  const categories = isFossilVsClean ? ['Fossil Fuels', 'Clean Energy'] : selectedSources

  let chartData
  if (chartType === 'total') {
    if (isFossilVsClean) {
      chartData = showRelative ? relativeFossilVsCleanData : fossilVsCleanData
    } else {
      chartData = showRelative ? relativeData : energyData
    }
  } else {
    chartData = annualChangeData
  }

  const valueFormatter = (value: number) =>
    chartType === 'total'
      ? showRelative
        ? `${value.toFixed(1)}%`
        : `${value.toFixed(1)} EJ`
      : `${value > 0 ? '+' : ''}${value.toFixed(2)} EJ`

  return (
    <Card className={`bg-background-elevated border-border ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold text-foreground">Interactive Energy Explorer</h2>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-1.5">
            <Download className="w-4 h-4" />
            PNG
          </button>
          <button className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-1.5">
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button className="px-3 py-1.5 text-sm font-medium rounded-lg bg-slate-600 text-white hover:bg-slate-500 transition-colors flex items-center gap-1.5">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4 mb-6">
        {/* Chart Type & Relative Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Chart Type</p>
            <div className="flex gap-2">
              <button
                onClick={() => setChartType('total')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  chartType === 'total'
                    ? 'bg-blue-500 text-white'
                    : 'bg-background-surface text-foreground-muted hover:bg-background-surface/80'
                }`}
              >
                Total Energy
              </button>
              <button
                onClick={() => setChartType('change')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  chartType === 'change'
                    ? 'bg-blue-500 text-white'
                    : 'bg-background-surface text-foreground-muted hover:bg-background-surface/80'
                }`}
              >
                Annual Change
              </button>
            </div>
          </div>

          {chartType === 'total' && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-foreground-muted">Relative Values</span>
              <button
                onClick={() => setShowRelative(!showRelative)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  showRelative ? 'bg-blue-500' : 'bg-foreground-subtle'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    showRelative ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {/* Source Filter */}
        <div>
          <p className="text-sm font-medium text-foreground mb-2">Energy Sources</p>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                sourceFilter === 'all' && selectedSources.length === allSources.length
                  ? 'bg-blue-500 text-white'
                  : 'bg-background-surface text-foreground-muted hover:bg-background-surface/80'
              }`}
            >
              All Sources
            </button>
            <button
              onClick={() => handleFilterChange('fossilVsClean')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                sourceFilter === 'fossilVsClean'
                  ? 'bg-violet-500 text-white'
                  : 'bg-background-surface text-foreground-muted hover:bg-background-surface/80'
              }`}
            >
              Fossil vs Clean
            </button>
            <button
              onClick={() => handleFilterChange('fossil')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                sourceFilter === 'fossil'
                  ? 'bg-red-600 text-white'
                  : 'bg-background-surface text-foreground-muted hover:bg-background-surface/80'
              }`}
            >
              Fossil Only
            </button>
            <button
              onClick={() => handleFilterChange('clean')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                sourceFilter === 'clean'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-background-surface text-foreground-muted hover:bg-background-surface/80'
              }`}
            >
              Clean Only
            </button>
          </div>

          {/* Individual source toggles */}
          {sourceFilter !== 'fossilVsClean' && (
            <div className="flex flex-wrap gap-2">
              {allSources.map((source) => {
                const isSelected = selectedSources.includes(source)
                const btnColors = buttonColors[source]
                return (
                  <button
                    key={source}
                    onClick={() => toggleSource(source)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg border-2 transition-colors ${
                      isSelected
                        ? `${btnColors.selected} text-white`
                        : `${btnColors.unselected} text-foreground-muted hover:border-foreground-subtle`
                    }`}
                  >
                    {source}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="mb-4 h-[500px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'total' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey="year"
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickLine={{ stroke: '#e0e0e0' }}
                axisLine={{ stroke: '#e0e0e0' }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickLine={{ stroke: '#e0e0e0' }}
                axisLine={{ stroke: '#e0e0e0' }}
                width={70}
                domain={[0, 100]}
                tickFormatter={(value) => showRelative ? `${value}%` : `${value}`}
                label={{
                  value: showRelative ? 'Share of Total (%)' : 'Energy (EJ)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 10,
                  style: { fontSize: 12, fontWeight: 500, fill: '#475569', textAnchor: 'middle' }
                }}
              />
              <Tooltip content={<CustomTooltip valueFormatter={valueFormatter} />} />
              {categories.map((source) => (
                <Area
                  key={source}
                  type="monotone"
                  dataKey={source}
                  stackId="1"
                  stroke={sourceColors[source]}
                  fill={sourceColors[source]}
                  fillOpacity={0.7}
                />
              ))}
            </AreaChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey="year"
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickLine={{ stroke: '#e0e0e0' }}
                axisLine={{ stroke: '#e0e0e0' }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickLine={{ stroke: '#e0e0e0' }}
                axisLine={{ stroke: '#e0e0e0' }}
                width={70}
                label={{
                  value: 'Change (EJ)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 10,
                  style: { fontSize: 12, fontWeight: 500, fill: '#475569', textAnchor: 'middle' }
                }}
              />
              <Tooltip content={<CustomTooltip valueFormatter={valueFormatter} />} />
              <ReferenceLine y={0} stroke="#000" strokeWidth={2} />
              {categories.map((source) => (
                <Line
                  key={source}
                  type="monotone"
                  dataKey={source}
                  stroke={sourceColors[source]}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 pt-4 border-t border-border">
        {categories.map((category) => (
          <div key={category} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full ${colorMap[category] || 'bg-gray-500'}`} />
            <span className="text-sm text-foreground-muted">{category}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
