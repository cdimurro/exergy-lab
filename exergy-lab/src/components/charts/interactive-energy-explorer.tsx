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
import { Download, Maximize2, Loader2 } from 'lucide-react'
import type { EnergyTier, ChartDataPoint, YearlyExergyData } from '@/types/exergy'
import {
  loadAppliedExergyTimeseries,
  transformExergyDataForChart,
  getFossilVsCleanData,
  getRelativeData,
  getAnnualChangeData,
  getTierLabel,
  getTierDescription,
  getThreeTierComparison,
} from '@/lib/exergy-data-service'

// Energy colors - distinct colors for each source
const ENERGY_COLORS: Record<string, string> = {
  coal: '#475569',      // Slate
  oil: '#f97316',       // Orange
  gas: '#06b6d4',       // Cyan
  nuclear: '#8b5cf6',   // Purple
  hydro: '#3b82f6',     // Blue
  wind: '#84cc16',      // Lime
  solar: '#f59e0b',     // Amber
  biomass: '#166534',   // Dark Green
  geothermal: '#f43f5e', // Rose
  other: '#14b8a6',     // Teal
  fossil: '#DC2626',    // Red
  clean: '#16A34A',     // Green
}

type ChartType = 'total' | 'change'
type SourceFilter = 'all' | 'fossilVsClean' | 'fossil' | 'clean'

const allSources = ['Coal', 'Oil', 'Natural Gas', 'Nuclear', 'Hydro', 'Wind', 'Solar', 'Biomass', 'Geothermal', 'Other Renewables']
const fossilSources = ['Coal', 'Oil', 'Natural Gas']
const cleanSources = ['Nuclear', 'Hydro', 'Wind', 'Solar', 'Biomass', 'Geothermal', 'Other Renewables']

// Direct hex colors for Recharts
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

// Button colors for light theme
const buttonColors: Record<string, { selected: string; unselected: string }> = {
  Coal: { selected: 'bg-slate-600 border-slate-600 text-white ring-2 ring-slate-600 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  Oil: { selected: 'bg-orange-500 border-orange-500 text-white ring-2 ring-orange-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  'Natural Gas': { selected: 'bg-cyan-500 border-cyan-500 text-white ring-2 ring-cyan-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  Nuclear: { selected: 'bg-violet-500 border-violet-500 text-white ring-2 ring-violet-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  Hydro: { selected: 'bg-blue-500 border-blue-500 text-white ring-2 ring-blue-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  Wind: { selected: 'bg-lime-500 border-lime-500 text-white ring-2 ring-lime-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  Solar: { selected: 'bg-amber-500 border-amber-500 text-white ring-2 ring-amber-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  Biomass: { selected: 'bg-green-800 border-green-800 text-white ring-2 ring-green-800 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  Geothermal: { selected: 'bg-rose-500 border-rose-500 text-white ring-2 ring-rose-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  'Other Renewables': { selected: 'bg-teal-500 border-teal-500 text-white ring-2 ring-teal-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
}

// Color mapping for legend dots
const colorMap: Record<string, string> = {
  Coal: 'bg-slate-500',
  Oil: 'bg-orange-500',
  'Natural Gas': 'bg-cyan-500',
  Nuclear: 'bg-violet-500',
  Hydro: 'bg-blue-500',
  Wind: 'bg-lime-500',
  Solar: 'bg-amber-500',
  Biomass: 'bg-green-800',
  Geothermal: 'bg-rose-500',
  'Other Renewables': 'bg-teal-500',
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
  chartType: ChartType
  showRelative: boolean
  energyTier: EnergyTier
  rawData: YearlyExergyData[]
}

function CustomTooltip({
  active,
  payload,
  label,
  valueFormatter,
  chartType,
  showRelative,
  energyTier,
  rawData,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const total = payload.reduce((sum, item) => sum + (item.value || 0), 0)
  const isAnnualChange = chartType === 'change'

  // Get three-tier comparison for this year
  const yearNum = parseInt(label || '0')
  const threeTier = getThreeTierComparison(rawData, yearNum)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs min-w-[280px]">
      <p className="font-bold text-base text-gray-800 mb-2">{label}</p>

      {/* Header row */}
      <div className="flex items-center justify-between gap-2 text-[10px] text-gray-500 mb-1 pb-1 border-b border-gray-100">
        <span className="flex-1">Source</span>
        {isAnnualChange ? (
          <span className="w-16 text-right">Change</span>
        ) : (
          <>
            <span className="w-16 text-right">Value</span>
            {showRelative && <span className="w-12 text-right">Share</span>}
          </>
        )}
      </div>

      <div className="space-y-1 max-h-48 overflow-y-auto">
        {payload
          .filter(item => Math.abs(item.value) > 0.01)
          .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
          .map((item) => (
            <div key={item.dataKey} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-gray-700 truncate">{item.name}</span>
              </div>
              <span className="text-xs font-medium text-gray-900 w-16 text-right">
                {valueFormatter(item.value)}
              </span>
            </div>
          ))}
      </div>

      <div className="border-t border-gray-200 mt-2 pt-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-gray-700 flex-1">Total</span>
        <span className="text-xs font-bold text-gray-900 w-16 text-right">
          {chartType === 'total' && !showRelative
            ? `${total.toFixed(1)} EJ`
            : valueFormatter(total)
          }
        </span>
      </div>

      {/* Three-tier comparison */}
      {threeTier && chartType === 'total' && !showRelative && (
        <div className="border-t border-gray-200 mt-2 pt-2">
          <p className="text-[10px] font-semibold text-gray-500 mb-1.5">Energy Framework</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className={energyTier === 'primary' ? 'text-gray-900 font-medium' : 'text-gray-500'}>Primary Energy</span>
              <span className={energyTier === 'primary' ? 'font-bold' : ''}>{threeTier.primary.toFixed(1)} EJ</span>
            </div>
            <div className="flex justify-between">
              <span className={energyTier === 'useful' ? 'text-blue-600 font-medium' : 'text-gray-500'}>Useful Energy</span>
              <span className={energyTier === 'useful' ? 'font-bold text-blue-600' : ''}>{threeTier.useful.toFixed(1)} EJ</span>
            </div>
            <div className="flex justify-between">
              <span className={energyTier === 'applied' ? 'text-emerald-600 font-medium' : 'text-gray-500'}>Applied Exergy</span>
              <span className={energyTier === 'applied' ? 'font-bold text-emerald-600' : ''}>{threeTier.applied.toFixed(1)} EJ</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-gray-100">
              <span className="text-gray-500">Global Efficiency</span>
              <span className="font-medium">{threeTier.efficiency.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function InteractiveEnergyExplorer({ className }: InteractiveEnergyExplorerProps) {
  const [chartType, setChartType] = React.useState<ChartType>('total')
  const [sourceFilter, setSourceFilter] = React.useState<SourceFilter>('all')
  const [selectedSources, setSelectedSources] = React.useState<string[]>(allSources)
  const [showRelative, setShowRelative] = React.useState(false)

  // Energy tier state
  const [energyTier, setEnergyTier] = React.useState<EnergyTier>('applied')

  // Data loading state
  const [rawData, setRawData] = React.useState<YearlyExergyData[]>([])
  const [energyData, setEnergyData] = React.useState<ChartDataPoint[]>([])
  const [fossilVsCleanData, setFossilVsCleanData] = React.useState<ChartDataPoint[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Load data on mount and when tier changes
  React.useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        const timeseries = await loadAppliedExergyTimeseries()
        setRawData(timeseries.data)

        const chartData = transformExergyDataForChart(timeseries.data, energyTier)
        const fossilClean = getFossilVsCleanData(timeseries.data, energyTier)

        setEnergyData(chartData)
        setFossilVsCleanData(fossilClean)
        setError(null)
      } catch (err) {
        setError('Failed to load energy data')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [energyTier])

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

  // Calculate derived data
  const relativeData = React.useMemo(() => getRelativeData(energyData), [energyData])
  const relativeFossilVsCleanData = React.useMemo(() => getRelativeData(fossilVsCleanData), [fossilVsCleanData])
  const annualChangeData = React.useMemo(() => getAnnualChangeData(energyData), [energyData])
  const annualChangeFossilVsCleanData = React.useMemo(() => getAnnualChangeData(fossilVsCleanData), [fossilVsCleanData])

  let chartData: ChartDataPoint[]
  if (chartType === 'total') {
    if (isFossilVsClean) {
      chartData = showRelative ? relativeFossilVsCleanData : fossilVsCleanData
    } else {
      chartData = showRelative ? relativeData : energyData
    }
  } else {
    chartData = isFossilVsClean ? annualChangeFossilVsCleanData : annualChangeData
  }

  const valueFormatter = (value: number) =>
    chartType === 'total'
      ? showRelative
        ? `${value.toFixed(1)}%`
        : `${value.toFixed(1)} EJ`
      : `${value > 0 ? '+' : ''}${value.toFixed(2)} EJ`

  // Custom tooltip wrapper
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTooltip = (props: any) => {
    const { active, payload, label } = props
    if (!active || !payload || !label) return null

    return (
      <CustomTooltip
        active={active}
        payload={payload}
        label={label}
        valueFormatter={valueFormatter}
        chartType={chartType}
        showRelative={showRelative}
        energyTier={energyTier}
        rawData={rawData}
      />
    )
  }

  if (isLoading) {
    return (
      <Card className={`bg-background-elevated border-border ${className}`}>
        <div className="flex items-center justify-center h-[600px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2 text-foreground-muted">Loading energy data...</span>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={`bg-background-elevated border-border ${className}`}>
        <div className="flex items-center justify-center h-[600px] text-red-500">
          {error}
        </div>
      </Card>
    )
  }

  return (
    <Card className={`bg-background-elevated border-border ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Interactive Energy Explorer</h2>
          <p className="text-sm text-foreground-muted mt-1">
            {getTierLabel(energyTier)} • {getTierDescription(energyTier)}
          </p>
        </div>
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
        {/* Energy Tier Selection */}
        <div>
          <p className="text-sm font-medium text-foreground mb-2">Energy Framework (Three-Tier)</p>
          <div className="flex gap-2">
            <button
              onClick={() => setEnergyTier('primary')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                energyTier === 'primary'
                  ? 'bg-slate-600 text-white'
                  : 'bg-background-surface text-foreground-muted hover:bg-background-surface/80'
              }`}
            >
              Primary Energy
            </button>
            <button
              onClick={() => setEnergyTier('useful')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                energyTier === 'useful'
                  ? 'bg-blue-500 text-white'
                  : 'bg-background-surface text-foreground-muted hover:bg-background-surface/80'
              }`}
            >
              Useful Energy
            </button>
            <button
              onClick={() => setEnergyTier('applied')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                energyTier === 'applied'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-background-surface text-foreground-muted hover:bg-background-surface/80'
              }`}
            >
              Applied Exergy
            </button>
          </div>
        </div>

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
              Fossil Fuels
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
                domain={showRelative ? [0, 100] : [0, 'auto']}
                tickFormatter={(value) => showRelative ? `${value}%` : `${value}`}
                label={{
                  value: showRelative ? 'Share of Total (%)' : `${getTierLabel(energyTier)} (EJ)`,
                  angle: -90,
                  position: 'insideLeft',
                  offset: 10,
                  style: { fontSize: 12, fontWeight: 500, fill: '#475569', textAnchor: 'middle' }
                }}
              />
              <Tooltip content={renderTooltip} />
              {categories.map((source) => (
                <Area
                  key={source}
                  type="monotone"
                  dataKey={source}
                  stackId="1"
                  stroke={sourceColors[source]}
                  fill={sourceColors[source]}
                  fillOpacity={0.65}
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
              <Tooltip content={renderTooltip} />
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
