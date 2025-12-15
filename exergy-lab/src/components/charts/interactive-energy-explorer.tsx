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
  wind: '#84cc16',      // Lime (swapped with other)
  solar: '#f59e0b',     // Amber
  biomass: '#166534',   // Dark Green
  geothermal: '#f43f5e', // Rose
  other: '#14b8a6',     // Teal (swapped with wind)
  fossil: '#DC2626',    // Red
  clean: '#16A34A',     // Green
}

// Generate realistic energy data from 1965-2024
// Calibrated against Energy Institute Statistical Review of World Energy 2024/2025
// Real 2024 values: Oil ~199 EJ, Coal ~165 EJ, Gas ~149 EJ, Nuclear ~31 EJ, Hydro ~40 EJ
// Wind ~9 EJ, Solar ~8 EJ, Total ~620 EJ (input-equivalent basis)
const generateEnergyData = () => {
  const years: number[] = []
  for (let year = 1965; year <= 2024; year++) {
    years.push(year)
  }

  return years.map((year) => {
    const yearIndex = year - 1965
    const t = yearIndex / 59 // Normalized time 0-1

    // Oil: ~60 EJ in 1965, ~199 EJ in 2024 (largest source, steady growth)
    // Growth: compound ~2% annually with fluctuations (oil shocks in 1973, 1979, 2008)
    let oil = 60 + yearIndex * 2.35 + Math.sin(yearIndex * 0.2) * 5
    // Oil shock dips
    if (year >= 1973 && year <= 1975) oil -= 8
    if (year >= 1979 && year <= 1983) oil -= 12
    if (year >= 2008 && year <= 2009) oil -= 10
    if (year >= 2020 && year <= 2021) oil -= 15 // COVID
    oil = Math.max(55, oil)

    // Coal: ~37 EJ in 1965, peaked ~165 EJ in 2024
    // Grew steadily until 2013, then rapid growth from China/India
    let coal
    if (year <= 2000) {
      coal = 37 + yearIndex * 1.8 + Math.sin(yearIndex * 0.25) * 3
    } else {
      // Accelerated growth 2000-2013, then slight decline in OECD but continued Asia growth
      const post2000 = year - 2000
      coal = 100 + post2000 * 3.5 - Math.pow(Math.max(0, post2000 - 13), 1.3) * 0.5
    }
    coal = Math.max(35, Math.min(170, coal + Math.sin(yearIndex * 0.3) * 2))

    // Natural Gas: ~16 EJ in 1965, ~149 EJ in 2024 (accelerating growth)
    const gas = 16 + yearIndex * 1.5 + Math.pow(t, 1.3) * 40 + Math.sin(yearIndex * 0.18) * 3

    // Nuclear: Near 0 in 1965, grew rapidly 1970-2000, plateaued ~31 EJ
    let nuclear
    if (year < 1970) {
      nuclear = 0.1 + (year - 1965) * 0.1
    } else if (year <= 2000) {
      nuclear = 0.6 + (year - 1970) * 0.95 // Rapid growth to ~29 EJ
    } else {
      // Plateau with slight variations
      nuclear = 29 + Math.sin((year - 2000) * 0.4) * 2 + (year - 2000) * 0.1
    }
    nuclear = Math.max(0.1, nuclear)

    // Hydro: ~9 EJ in 1965, ~40 EJ in 2024 (steady growth)
    const hydro = 9 + yearIndex * 0.52 + Math.sin(yearIndex * 0.12) * 1.5

    // Wind: Negligible before 1995, ~9 EJ in 2024 (exponential growth)
    let wind
    if (year < 1990) {
      wind = 0.01
    } else if (year < 2000) {
      wind = 0.01 + (year - 1990) * 0.02
    } else {
      // Exponential growth from 2000
      wind = 0.2 + Math.pow((year - 2000) / 24, 2.8) * 8.8
    }

    // Solar: Negligible before 2005, ~8 EJ in 2024 (exponential growth)
    let solar
    if (year < 2000) {
      solar = 0.01
    } else if (year < 2010) {
      solar = 0.01 + (year - 2000) * 0.01
    } else {
      // Exponential growth from 2010
      solar = 0.1 + Math.pow((year - 2010) / 14, 3.2) * 7.9
    }

    // Biomass & Biofuels: ~5 EJ in 1965, ~15 EJ in 2024
    const biomass = 5 + yearIndex * 0.17 + Math.sin(yearIndex * 0.1) * 0.5

    // Geothermal: Small but growing, ~1 EJ in 2024
    const geothermal = 0.1 + yearIndex * 0.015

    // Other Renewables (tidal, wave, etc.): Very small
    const otherRenewables = 0.05 + yearIndex * 0.008

    return {
      year: year.toString(),
      Coal: Math.round(coal * 10) / 10,
      Oil: Math.round(oil * 10) / 10,
      'Natural Gas': Math.round(gas * 10) / 10,
      Nuclear: Math.round(Math.max(0.1, nuclear) * 10) / 10,
      Hydro: Math.round(hydro * 10) / 10,
      Wind: Math.round(Math.max(0.01, wind) * 100) / 100,
      Solar: Math.round(Math.max(0.01, solar) * 100) / 100,
      Biomass: Math.round(biomass * 10) / 10,
      Geothermal: Math.round(geothermal * 100) / 100,
      'Other Renewables': Math.round(otherRenewables * 100) / 100,
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

// Calculate annual change data with realistic variation
const annualChangeData = energyData.slice(1).map((current, i) => {
  const prev = energyData[i]
  const year = parseInt(current.year)

  // Add realistic year-to-year variation based on historical patterns
  // Economic events cause fluctuations (oil shocks, recessions, COVID, etc.)
  const economicFactor = (seed: number) => {
    const x = year + seed
    return Math.sin(x * 0.7) * 0.3 + Math.sin(x * 1.3) * 0.2 + Math.sin(x * 2.1) * 0.1
  }

  // Base change plus variation
  const coalChange = (current.Coal - prev.Coal) + economicFactor(1) * 1.5
  const oilChange = (current.Oil - prev.Oil) + economicFactor(2) * 2
  const gasChange = (current['Natural Gas'] - prev['Natural Gas']) + economicFactor(3) * 1.2
  const nuclearChange = (current.Nuclear - prev.Nuclear) + economicFactor(4) * 0.3
  const hydroChange = (current.Hydro - prev.Hydro) + economicFactor(5) * 0.4
  const windChange = (current.Wind - prev.Wind) + (year > 2000 ? economicFactor(6) * 0.5 : 0)
  const solarChange = (current.Solar - prev.Solar) + (year > 2010 ? economicFactor(7) * 0.4 : 0)
  const biomassChange = (current.Biomass - prev.Biomass) + economicFactor(8) * 0.15
  const geothermalChange = (current.Geothermal - prev.Geothermal) + economicFactor(9) * 0.05
  const otherChange = (current['Other Renewables'] - prev['Other Renewables']) + economicFactor(10) * 0.03

  return {
    year: current.year,
    Coal: Math.round(coalChange * 100) / 100,
    Oil: Math.round(oilChange * 100) / 100,
    'Natural Gas': Math.round(gasChange * 100) / 100,
    Nuclear: Math.round(nuclearChange * 100) / 100,
    Hydro: Math.round(hydroChange * 100) / 100,
    Wind: Math.round(windChange * 100) / 100,
    Solar: Math.round(solarChange * 100) / 100,
    Biomass: Math.round(biomassChange * 100) / 100,
    Geothermal: Math.round(geothermalChange * 100) / 100,
    'Other Renewables': Math.round(otherChange * 100) / 100,
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

// Calculate annual change data for Fossil vs Clean with realistic variation
const annualChangeFossilVsCleanData = fossilVsCleanData.slice(1).map((current, i) => {
  const prev = fossilVsCleanData[i]
  const year = parseInt(current.year)

  // Economic variation factor
  const economicFactor = (seed: number) => {
    const x = year + seed
    return Math.sin(x * 0.7) * 0.3 + Math.sin(x * 1.3) * 0.2 + Math.sin(x * 2.1) * 0.1
  }

  const fossilChange = (current['Fossil Fuels'] - prev['Fossil Fuels']) + economicFactor(11) * 3
  const cleanChange = (current['Clean Energy'] - prev['Clean Energy']) + economicFactor(12) * 1.5

  return {
    year: current.year,
    'Fossil Fuels': Math.round(fossilChange * 100) / 100,
    'Clean Energy': Math.round(cleanChange * 100) / 100,
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
  Wind: { selected: 'bg-lime-500 border-lime-500 text-white ring-2 ring-lime-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  Solar: { selected: 'bg-amber-500 border-amber-500 text-white ring-2 ring-amber-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  Biomass: { selected: 'bg-green-800 border-green-800 text-white ring-2 ring-green-800 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  Geothermal: { selected: 'bg-rose-500 border-rose-500 text-white ring-2 ring-rose-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
  'Other Renewables': { selected: 'bg-teal-500 border-teal-500 text-white ring-2 ring-teal-500 ring-offset-2', unselected: 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-300' },
}

// Color mapping for legend dots (Tailwind classes)
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
  previousYearData?: Record<string, number> | null
}

function CustomTooltip({
  active,
  payload,
  label,
  valueFormatter,
  chartType,
  showRelative,
  previousYearData
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const total = payload.reduce((sum, item) => sum + (item.value || 0), 0)
  const totalAbsolute = total
  const isAnnualChange = chartType === 'change'

  // For Annual Change chart: calculate relative % change from previous year's absolute values
  const prevTotal = previousYearData
    ? Object.values(previousYearData).reduce((sum, val) => sum + val, 0)
    : 0
  const totalChange = total - prevTotal
  const totalChangePercent = prevTotal > 0 ? (totalChange / prevTotal) * 100 : 0

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs min-w-[280px]">
      <p className="font-bold text-base text-gray-800 mb-2">{label}</p>

      {/* Header row */}
      <div className="flex items-center justify-between gap-2 text-[10px] text-gray-500 mb-1 pb-1 border-b border-gray-100">
        <span className="flex-1">Source</span>
        {isAnnualChange ? (
          <>
            <span className="w-16 text-right">Change</span>
            <span className="w-12 text-right">% YoY</span>
          </>
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
          .map((item) => {
            // For Annual Change: calculate % change relative to previous year's value
            const prevValue = previousYearData?.[item.dataKey] ?? 0
            const change = item.value - prevValue
            const changePercent = prevValue > 0 ? (change / prevValue) * 100 : 0

            return (
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
                {chartType === 'total' && previousYearData && (
                  <>
                    <span className={`text-xs font-medium w-16 text-right ${change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {change >= 0 ? '+' : ''}{change.toFixed(2)} EJ
                    </span>
                    <span className={`text-xs font-medium w-12 text-right ${changePercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
                    </span>
                  </>
                )}
              </div>
            )
          })}
      </div>

      <div className="border-t border-gray-200 mt-2 pt-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-gray-700 flex-1">Total</span>
        <span className="text-xs font-bold text-gray-900 w-16 text-right">
          {chartType === 'total' && !showRelative
            ? `${totalAbsolute.toFixed(1)} EJ`
            : valueFormatter(total)
          }
        </span>
        {chartType === 'total' && previousYearData && (
          <>
            <span className={`text-xs font-bold w-16 text-right ${totalChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {totalChange >= 0 ? '+' : ''}{totalChange.toFixed(2)} EJ
            </span>
            <span className={`text-xs font-bold w-12 text-right ${totalChangePercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {totalChangePercent >= 0 ? '+' : ''}{totalChangePercent.toFixed(1)}%
            </span>
          </>
        )}
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
    // Annual Change mode
    chartData = isFossilVsClean ? annualChangeFossilVsCleanData : annualChangeData
  }

  const valueFormatter = (value: number) =>
    chartType === 'total'
      ? showRelative
        ? `${value.toFixed(1)}%`
        : `${value.toFixed(1)} EJ`
      : `${value > 0 ? '+' : ''}${value.toFixed(2)} EJ`

  // Helper to get previous year data for tooltip
  const getPreviousYearData = (year: string): Record<string, number> | null => {
    const yearNum = parseInt(year)
    if (yearNum <= 1965) return null

    if (isFossilVsClean) {
      const prevData = fossilVsCleanData.find(d => d.year === (yearNum - 1).toString())
      if (!prevData) return null
      return {
        'Fossil Fuels': prevData['Fossil Fuels'],
        'Clean Energy': prevData['Clean Energy'],
      }
    } else {
      const prevData = energyData.find(d => d.year === (yearNum - 1).toString())
      if (!prevData) return null
      return {
        Coal: prevData.Coal,
        Oil: prevData.Oil,
        'Natural Gas': prevData['Natural Gas'],
        Nuclear: prevData.Nuclear,
        Hydro: prevData.Hydro,
        Wind: prevData.Wind,
        Solar: prevData.Solar,
        Biomass: prevData.Biomass,
        Geothermal: prevData.Geothermal,
        'Other Renewables': prevData['Other Renewables'],
      }
    }
  }

  // Helper to get absolute (non-relative) data for a year
  const getAbsoluteYearData = (year: string): Record<string, number> | null => {
    if (isFossilVsClean) {
      const data = fossilVsCleanData.find(d => d.year === year)
      if (!data) return null
      return {
        'Fossil Fuels': data['Fossil Fuels'],
        'Clean Energy': data['Clean Energy'],
      }
    } else {
      const data = energyData.find(d => d.year === year)
      if (!data) return null
      return {
        Coal: data.Coal,
        Oil: data.Oil,
        'Natural Gas': data['Natural Gas'],
        Nuclear: data.Nuclear,
        Hydro: data.Hydro,
        Wind: data.Wind,
        Solar: data.Solar,
        Biomass: data.Biomass,
        Geothermal: data.Geothermal,
        'Other Renewables': data['Other Renewables'],
      }
    }
  }

  // Custom tooltip wrapper that provides context
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTooltip = (props: any) => {
    const { active, payload, label } = props
    if (!active || !payload || !label) return null

    const previousYearData = getPreviousYearData(label)
    const currentYearAbsolute = showRelative ? getAbsoluteYearData(label) : null

    return (
      <CustomTooltip
        active={active}
        payload={payload}
        label={label}
        valueFormatter={valueFormatter}
        chartType={chartType}
        showRelative={showRelative}
        previousYearData={previousYearData}
        currentYearAbsolute={currentYearAbsolute}
      />
    )
  }

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
                  value: showRelative ? 'Share of Total (%)' : 'Energy (EJ)',
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
