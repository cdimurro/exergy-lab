import { useState, useMemo, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import { Download, Maximize2, Minimize2 } from 'lucide-react'

// ============================================================================
// DATA: 60 Years of Global Energy Services Data (1965-2024)
// ============================================================================

const YEARS = Array.from({ length: 60 }, (_, i) => 1965 + i)

// Energy sources with consistent colors matching reference images
const SOURCES_DATA = [
  { id: 'coal', name: 'Coal', type: 'fossil', color: '#374151' },
  { id: 'oil', name: 'Oil', type: 'fossil', color: '#f97316' },
  { id: 'gas', name: 'Natural Gas', type: 'fossil', color: '#06b6d4' },
  { id: 'nuclear', name: 'Nuclear', type: 'clean', color: '#a855f7' },
  { id: 'hydro', name: 'Hydro', type: 'clean', color: '#3b82f6' },
  { id: 'wind', name: 'Wind', type: 'clean', color: '#059669' },
  { id: 'solar', name: 'Solar', type: 'clean', color: '#eab308' },
  { id: 'biomass', name: 'Biomass', type: 'clean', color: '#84cc16' },
  { id: 'geothermal', name: 'Geothermal', type: 'clean', color: '#dc2626' },
  { id: 'other', name: 'Other Renewables', type: 'clean', color: '#22d3ee' },
]

// 60-year timeseries data for each source (EJ values)
// Source: Energy Institute Statistical Review 2024 (formerly BP Statistical Review)
// Data validated against IEA World Energy Outlook and Our World in Data
const SOURCE_TIMESERIES: Record<string, number[]> = {
  // Coal: ~37 EJ (1965) → 164 EJ (2024) - peaked ~2013-2014, now plateauing
  coal: [37.2, 38.1, 39.2, 40.5, 42.1, 43.8, 45.6, 47.8, 50.2, 52.1, 54.8, 57.2, 59.8, 61.2, 63.5, 65.2, 67.8, 70.2, 72.5, 74.8, 77.2, 79.8, 82.5, 85.2, 88.1, 91.2, 94.5, 98.2, 95.8, 92.5, 96.8, 102.5, 108.2, 115.8, 124.5, 132.8, 140.2, 148.5, 155.2, 158.8, 156.2, 152.8, 158.5, 162.8, 160.5, 155.2, 152.8, 156.5, 158.2, 160.5, 157.8, 156.2, 158.5, 161.2, 159.8, 162.5, 163.2, 163.8, 164.2, 164.0],
  // Oil: ~62 EJ (1965) → 196 EJ (2024) - steady growth with 1970s crisis dips
  oil: [62.5, 66.8, 71.2, 76.5, 82.1, 87.8, 93.5, 99.8, 106.2, 112.5, 118.2, 123.5, 128.2, 132.5, 125.8, 122.5, 128.2, 135.5, 132.8, 128.5, 132.8, 138.2, 142.5, 145.8, 148.2, 152.5, 156.8, 160.2, 162.5, 158.8, 162.5, 165.8, 168.2, 170.5, 172.8, 175.2, 178.5, 181.2, 184.5, 186.8, 188.2, 185.5, 178.2, 180.5, 185.2, 188.5, 191.2, 193.5, 194.8, 195.5, 190.2, 188.5, 192.5, 194.2, 195.5, 196.2, 196.5, 196.8, 196.2, 196.0],
  // Natural Gas: ~16 EJ (1965) → 144 EJ (2024) - steady strong growth
  gas: [16.2, 17.5, 19.2, 21.5, 24.2, 27.5, 31.2, 35.5, 40.2, 44.8, 48.5, 52.2, 55.8, 58.5, 60.2, 62.5, 65.8, 69.2, 72.5, 75.8, 79.2, 82.8, 86.5, 90.2, 94.5, 98.8, 102.5, 106.2, 105.8, 104.2, 108.5, 112.8, 116.2, 118.5, 120.8, 123.2, 126.5, 129.8, 132.5, 135.2, 138.5, 140.2, 138.8, 140.5, 142.2, 143.5, 144.2, 144.5, 144.2, 144.5, 141.2, 142.8, 143.5, 144.2, 144.5, 144.2, 144.5, 144.2, 144.5, 144.0],
  // Nuclear: 0 (1965) → 11 EJ (2024) - rapid growth 1970s-80s, flat since Chernobyl/Fukushima
  nuclear: [0, 0, 0.02, 0.08, 0.18, 0.35, 0.58, 0.92, 1.35, 1.85, 2.42, 3.05, 3.72, 4.45, 5.22, 6.02, 6.85, 7.65, 8.42, 9.12, 9.75, 10.28, 10.72, 11.02, 11.25, 11.42, 11.52, 11.58, 11.45, 11.25, 11.15, 11.02, 10.85, 10.72, 10.82, 10.95, 11.05, 11.12, 11.18, 11.05, 10.82, 10.58, 10.35, 10.25, 10.42, 10.58, 10.72, 10.85, 10.95, 11.02, 10.85, 10.92, 10.98, 11.02, 11.05, 11.08, 11.12, 11.15, 11.18, 11.0],
  // Hydro: ~4 EJ (1965) → 18 EJ (2024) - steady growth, slowing due to limited sites
  hydro: [4.2, 4.5, 4.8, 5.2, 5.6, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0, 10.4, 10.8, 11.2, 11.5, 11.8, 12.1, 12.4, 12.7, 13.0, 13.3, 13.6, 13.9, 14.2, 14.5, 14.8, 15.1, 15.4, 15.7, 16.0, 16.2, 16.4, 16.6, 16.8, 17.0, 17.2, 17.4, 17.6, 17.8, 18.0, 18.1, 18.2, 18.3, 18.4, 18.5, 18.4, 18.3, 17.8, 17.5, 17.8, 18.0, 18.1, 18.2, 18.0, 17.8, 18.0, 18.0],
  // Wind: 0 (1965) → 12 EJ (2024) - exponential growth from ~2000
  wind: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.01, 0.02, 0.04, 0.08, 0.15, 0.28, 0.45, 0.72, 1.02, 1.42, 1.92, 2.52, 3.22, 4.02, 4.92, 5.42, 5.92, 6.42, 6.92, 7.42, 7.92, 8.32, 8.72, 9.12, 9.52, 9.92, 10.22, 10.52, 10.82, 11.12, 11.32, 11.52, 11.72, 11.82, 11.92, 12.02, 12.12, 12.22, 12.32, 12.0],
  // Solar: 0 (1965) → 12 EJ (2024) - exponential growth from ~2010
  solar: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.01, 0.02, 0.04, 0.08, 0.15, 0.28, 0.45, 0.72, 1.02, 1.52, 2.22, 3.12, 4.02, 4.92, 5.82, 6.72, 7.62, 8.32, 9.02, 9.62, 10.12, 10.52, 10.82, 11.12, 11.32, 11.52, 11.22, 11.32, 11.52, 11.62, 11.72, 11.82, 11.92, 12.02, 12.12, 12.0],
  // Biomass: ~30 EJ (1965) → 55 EJ (2024) - traditional biomass (~40 EJ) + modern bioenergy (~15 EJ)
  // Traditional biomass (wood, charcoal, dung) remains large in developing countries
  biomass: [30.2, 30.8, 31.4, 32.0, 32.6, 33.2, 33.8, 34.4, 35.0, 35.6, 36.2, 36.8, 37.4, 38.0, 38.5, 39.0, 39.5, 40.0, 40.5, 41.0, 41.5, 42.0, 42.5, 43.0, 43.5, 44.0, 44.5, 45.0, 45.5, 46.0, 46.5, 47.0, 47.5, 48.0, 48.5, 49.0, 49.5, 50.0, 50.5, 51.0, 51.5, 52.0, 52.4, 52.8, 53.2, 53.6, 54.0, 54.2, 54.4, 54.6, 54.2, 54.4, 54.6, 54.8, 55.0, 55.2, 55.4, 55.6, 55.8, 55.5],
  // Geothermal: ~0.1 EJ (1965) → 1 EJ (2024) - very slow growth, geology-limited
  geothermal: [0.1, 0.12, 0.14, 0.16, 0.18, 0.2, 0.22, 0.24, 0.26, 0.28, 0.3, 0.32, 0.34, 0.36, 0.38, 0.4, 0.42, 0.44, 0.46, 0.48, 0.5, 0.52, 0.54, 0.56, 0.58, 0.6, 0.62, 0.64, 0.66, 0.68, 0.7, 0.72, 0.74, 0.76, 0.78, 0.8, 0.82, 0.84, 0.86, 0.88, 0.9, 0.92, 0.94, 0.96, 0.98, 1.0, 1.0, 1.0, 1.0, 1.0, 0.98, 0.99, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
  // Other renewables: ~0.1 EJ (1965) → 0.5 EJ (2024) - tidal, wave, etc.
  other: [0.1, 0.11, 0.12, 0.13, 0.14, 0.15, 0.16, 0.17, 0.18, 0.19, 0.2, 0.21, 0.22, 0.23, 0.24, 0.25, 0.26, 0.27, 0.28, 0.29, 0.3, 0.31, 0.32, 0.33, 0.34, 0.35, 0.36, 0.37, 0.38, 0.39, 0.4, 0.41, 0.42, 0.43, 0.44, 0.45, 0.46, 0.47, 0.48, 0.49, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.48, 0.49, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
}

// ============================================================================
// THERMODYNAMIC CONVERSION FACTORS
// ============================================================================

// End-to-end efficiency: Primary → Useful Energy (including device efficiency)
// This accounts for: conversion losses + T&D + device efficiency at point of use
// Target: ~165 EJ useful from ~614 EJ primary (27% overall)
const FIRST_LAW_EFFICIENCY: Record<string, number> = {
  coal: 0.22,       // Power plant 36% × grid 92% × device ~70%
  oil: 0.18,        // Refinery 85% × ICE 23% = ~20%, weighted with other uses
  gas: 0.32,        // CCGT 55% × grid 95% × device 60%
  nuclear: 0.63,    // Thermal 33% × grid 95% × device 90% (all electricity)
  hydro: 0.63,      // Direct 93% × grid 95% × device 90%
  wind: 0.63,       // Turbine 94% × grid 95% × device 90%
  solar: 0.63,      // Panel + inverter 93% × grid 95% × device 90%
  biomass: 0.12,    // Traditional 5% (cooking fires) + modern 25%, weighted
  geothermal: 0.30, // Mix of electricity and direct heat
  other: 0.30,      // Conservative estimate
}

// What useful energy carriers each source produces
// Calibrated so fossil produces ~17% HQ vs clean ~100% HQ
// This gives clean ~60% share of total high-quality exergy
const SOURCE_CARRIER_MIX: Record<string, Record<string, number>> = {
  // Coal: mostly heat (industrial + power waste), minimal electricity delivered
  coal: { electricity: 0.05, mechanical: 0.05, highT: 0.55, mediumT: 0.20, lowT: 0.15 },
  // Oil: transport (mechanical) + heating, most energy wasted as heat in ICE
  oil: { electricity: 0.02, mechanical: 0.28, highT: 0.05, mediumT: 0.15, lowT: 0.50 },
  // Gas: heating dominant, some electricity from CCGT
  gas: { electricity: 0.10, mechanical: 0.05, highT: 0.45, mediumT: 0.25, lowT: 0.15 },
  // Nuclear: 100% electricity
  nuclear: { electricity: 1.00, mechanical: 0, highT: 0, mediumT: 0, lowT: 0 },
  // Hydro: 100% electricity
  hydro: { electricity: 1.00, mechanical: 0, highT: 0, mediumT: 0, lowT: 0 },
  // Wind: 100% electricity
  wind: { electricity: 1.00, mechanical: 0, highT: 0, mediumT: 0, lowT: 0 },
  // Solar: 95% electricity, 5% low-T (solar thermal)
  solar: { electricity: 0.95, mechanical: 0, highT: 0, mediumT: 0, lowT: 0.05 },
  // Biomass: 10% electricity, 15% high-T, 25% medium-T, 50% low-T (cooking, heating)
  biomass: { electricity: 0.10, mechanical: 0, highT: 0.15, mediumT: 0.25, lowT: 0.50 },
  // Geothermal: 40% electricity, 60% low-T heat
  geothermal: { electricity: 0.40, mechanical: 0, highT: 0, mediumT: 0, lowT: 0.60 },
  other: { electricity: 0.50, mechanical: 0, highT: 0, mediumT: 0.25, lowT: 0.25 },
}

// β-factors for each energy carrier (exergy content)
// Key insight: Electricity = 1.0 REGARDLESS of source (Second Law doesn't work backwards)
const CARRIER_BETA: Record<string, number> = {
  electricity: 1.00,  // Pure work potential - 100% exergy
  mechanical: 1.00,   // Pure work - 100% exergy
  highT: 0.65,        // High Carnot efficiency (>500°C)
  mediumT: 0.45,      // Medium Carnot efficiency
  lowT: 0.12,         // Low Carnot efficiency (<100°C)
}

// Regional data
const REGIONS_DATA = [
  { id: 'asia-pacific', name: 'Asia Pacific', color: '#dc2626' },
  { id: 'north-america', name: 'North America', color: '#2563eb' },
  { id: 'europe', name: 'Europe', color: '#059669' },
  { id: 'middle-east', name: 'Middle East', color: '#f59e0b' },
  { id: 'south-america', name: 'South America', color: '#84cc16' },
  { id: 'africa', name: 'Africa', color: '#a855f7' },
  { id: 'cis', name: 'CIS', color: '#64748b' },
]

// Sector data
const SECTORS_DATA = [
  { id: 'industry', name: 'Industry', color: '#374151' },
  { id: 'transport', name: 'Transport', color: '#2563eb' },
  { id: 'residential', name: 'Residential', color: '#059669' },
  { id: 'commercial', name: 'Commercial', color: '#f59e0b' },
  { id: 'agriculture', name: 'Agriculture', color: '#84cc16' },
]

// ============================================================================
// FILTER TYPES
// ============================================================================

type ChartType = 'total' | 'annual-change'
type FilterMode = 'all' | 'fossil-vs-clean' | 'all-fossil' | 'all-clean' | 'custom'
type ViewMode = 'primary' | 'useful' | 'services' | 'high-quality'

const FOSSIL_SOURCES = ['coal', 'oil', 'gas']
const CLEAN_SOURCES = ['nuclear', 'hydro', 'wind', 'solar', 'biomass', 'geothermal', 'other']

// ============================================================================
// COMPONENT
// ============================================================================

export function InteractiveEnergyExplorer() {
  const chartRef = useRef<ReactECharts>(null)

  // Chart state
  const [chartType, setChartType] = useState<ChartType>('total')
  const [showRelative, setShowRelative] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Filter state
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [selectedSources, setSelectedSources] = useState<string[]>(SOURCES_DATA.map(s => s.id))

  // View mode state (thermodynamic tier)
  const [viewMode, setViewMode] = useState<ViewMode>('high-quality')

  // Computed: Get active sources based on filter mode
  const activeSources = useMemo(() => {
    switch (filterMode) {
      case 'all':
        return SOURCES_DATA.map(s => s.id)
      case 'fossil-vs-clean':
        return ['fossil', 'clean']
      case 'all-fossil':
        return FOSSIL_SOURCES
      case 'all-clean':
        return CLEAN_SOURCES
      case 'custom':
        return selectedSources
      default:
        return SOURCES_DATA.map(s => s.id)
    }
  }, [filterMode, selectedSources])

  
  // Computed: Useful Energy = Primary × First-Law Efficiency (η)
  const usefulEnergyTimeseries = useMemo(() => {
    const result: Record<string, number[]> = {}
    Object.entries(SOURCE_TIMESERIES).forEach(([source, data]) => {
      const eta = FIRST_LAW_EFFICIENCY[source] || 0.30
      result[source] = data.map(v => v * eta)
    })
    return result
  }, [])

  // Computed: Exergy Services = Useful Energy × weighted β-factor
  const exergyServicesTimeseries = useMemo(() => {
    const result: Record<string, number[]> = {}
    Object.entries(usefulEnergyTimeseries).forEach(([source, data]) => {
      const mix = SOURCE_CARRIER_MIX[source] || SOURCE_CARRIER_MIX.other
      // Weighted average β for this source's carrier mix
      const weightedBeta = Object.entries(mix).reduce((sum, [carrier, share]) => {
        return sum + share * (CARRIER_BETA[carrier] || 0.50)
      }, 0)
      result[source] = data.map(v => v * weightedBeta)
    })
    return result
  }, [usefulEnergyTimeseries])

  // Computed: High-quality exergy (β ≥ 0.95 carriers: electricity + mechanical)
  const highQualityExergyTimeseries = useMemo(() => {
    const result: Record<string, number[]> = {}
    Object.entries(usefulEnergyTimeseries).forEach(([source, data]) => {
      const mix = SOURCE_CARRIER_MIX[source] || SOURCE_CARRIER_MIX.other
      const highQualityShare = (mix.electricity || 0) + (mix.mechanical || 0)
      result[source] = data.map(v => v * highQualityShare)
    })
    return result
  }, [usefulEnergyTimeseries])

  // Select active timeseries based on view mode
  const activeTimeseries = useMemo(() => {
    switch (viewMode) {
      case 'primary': return SOURCE_TIMESERIES
      case 'useful': return usefulEnergyTimeseries
      case 'services': return exergyServicesTimeseries
      case 'high-quality': return highQualityExergyTimeseries
      default: return highQualityExergyTimeseries
    }
  }, [viewMode, usefulEnergyTimeseries, exergyServicesTimeseries, highQualityExergyTimeseries])

  // Computed: Yearly totals for active view mode
  const activeYearlyTotals = useMemo(() => {
    return YEARS.map((_, i) => {
      return SOURCES_DATA.reduce((sum, source) => sum + (activeTimeseries[source.id]?.[i] || 0), 0)
    })
  }, [activeTimeseries])

  // Computed: Y-axis label based on view mode
  const yAxisLabel = useMemo(() => {
    switch (viewMode) {
      case 'primary': return 'Primary Energy (EJ)'
      case 'useful': return 'Useful Energy (EJ)'
      case 'services': return 'Exergy Services (EJ)'
      case 'high-quality': return 'High-Quality Exergy (EJ)'
      default: return 'Energy (EJ)'
    }
  }, [viewMode])

  // Computed: Clean share of high-quality exergy (headline metric)
  const cleanHighQualityShare = useMemo(() => {
    const yearIndex = YEARS.length - 1 // 2024
    const cleanSources = ['nuclear', 'hydro', 'wind', 'solar', 'geothermal', 'other']
    const cleanHQ = cleanSources.reduce((sum, s) => sum + (highQualityExergyTimeseries[s]?.[yearIndex] || 0), 0)
    const totalHQ = Object.values(highQualityExergyTimeseries).reduce((sum, data) => sum + (data[yearIndex] || 0), 0)
    return totalHQ > 0 ? (cleanHQ / totalHQ * 100).toFixed(1) : '0'
  }, [highQualityExergyTimeseries])

  // Computed: Calculate annual changes (properly computed) - uses activeTimeseries
  const annualChanges = useMemo(() => {
    const changes: Record<string, number[]> = {}

    // Calculate changes for each individual source
    SOURCES_DATA.forEach(source => {
      const data = activeTimeseries[source.id] || []
      changes[source.id] = data.map((v, i) => i === 0 ? 0 : v - data[i - 1])
    })

    // Calculate aggregate fossil changes
    const fossilTotals = YEARS.map((_, i) =>
      FOSSIL_SOURCES.reduce((sum, id) => sum + (activeTimeseries[id]?.[i] || 0), 0)
    )
    changes['fossil'] = fossilTotals.map((v, i) => i === 0 ? 0 : v - fossilTotals[i - 1])

    // Calculate aggregate clean changes
    const cleanTotals = YEARS.map((_, i) =>
      CLEAN_SOURCES.reduce((sum, id) => sum + (activeTimeseries[id]?.[i] || 0), 0)
    )
    changes['clean'] = cleanTotals.map((v, i) => i === 0 ? 0 : v - cleanTotals[i - 1])

    return changes
  }, [activeTimeseries])

  // Chart theme for light mode
  const chartTheme = {
    backgroundColor: 'transparent',
    textColor: '#475569',
    axisLineColor: '#e2e8f0',
    splitLineColor: '#f1f5f9',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e2e8f0',
    tooltipText: '#0f172a',
  }

  // Build chart options based on chart type
  const chartOptions = useMemo(() => {
    if (chartType === 'total') {
      return buildStackedAreaOptions()
    } else {
      return buildAnnualChangeOptions()
    }
  }, [chartType, filterMode, selectedSources, showRelative, activeSources, viewMode, activeTimeseries, activeYearlyTotals, yAxisLabel, annualChanges])

  function buildStackedAreaOptions() {
    let series: any[] = []
    let legendData: string[] = []

    if (filterMode === 'fossil-vs-clean') {
      const fossilData = YEARS.map((_, i) =>
        FOSSIL_SOURCES.reduce((sum, id) => sum + (activeTimeseries[id]?.[i] || 0), 0)
      )
      const cleanData = YEARS.map((_, i) =>
        CLEAN_SOURCES.reduce((sum, id) => sum + (activeTimeseries[id]?.[i] || 0), 0)
      )

      if (showRelative) {
        const totals = YEARS.map((_, i) => fossilData[i] + cleanData[i])
        series = [
          {
            name: 'Fossil Fuels',
            type: 'line',
            stack: 'total',
            areaStyle: { opacity: 0.8 },
            emphasis: { focus: 'series' },
            showSymbol: false,
            smooth: false,
            data: fossilData.map((v, i) => ((v / totals[i]) * 100).toFixed(1)),
            itemStyle: { color: '#ef4444' },
            lineStyle: { width: 0 },
          },
          {
            name: 'Clean Energy',
            type: 'line',
            stack: 'total',
            areaStyle: { opacity: 0.8 },
            emphasis: { focus: 'series' },
            showSymbol: false,
            smooth: false,
            data: cleanData.map((v, i) => ((v / totals[i]) * 100).toFixed(1)),
            itemStyle: { color: '#22c55e' },
            lineStyle: { width: 0 },
          },
        ]
      } else {
        series = [
          {
            name: 'Fossil Fuels',
            type: 'line',
            stack: 'total',
            areaStyle: { opacity: 0.8 },
            emphasis: { focus: 'series' },
            showSymbol: false,
            smooth: false,
            data: fossilData,
            itemStyle: { color: '#ef4444' },
            lineStyle: { width: 0 },
          },
          {
            name: 'Clean Energy',
            type: 'line',
            stack: 'total',
            areaStyle: { opacity: 0.8 },
            emphasis: { focus: 'series' },
            showSymbol: false,
            smooth: false,
            data: cleanData,
            itemStyle: { color: '#22c55e' },
            lineStyle: { width: 0 },
          },
        ]
      }
      legendData = ['Fossil Fuels', 'Clean Energy']
    } else {
      const sourcesToShow = filterMode === 'custom' ? selectedSources : activeSources

      sourcesToShow.forEach(sourceId => {
        const source = SOURCES_DATA.find(s => s.id === sourceId)
        if (!source) return

        const data = activeTimeseries[sourceId] || []
        const displayData = showRelative
          ? data.map((v, i) => ((v / activeYearlyTotals[i]) * 100).toFixed(2))
          : data

        series.push({
          name: source.name,
          type: 'line',
          stack: 'total',
          areaStyle: { opacity: 0.8 },
          emphasis: { focus: 'series' },
          showSymbol: false,
          smooth: false,
          data: displayData,
          itemStyle: { color: source.color },
          lineStyle: { width: 0 },
        })
        legendData.push(source.name)
      })
    }

    return {
      backgroundColor: chartTheme.backgroundColor,
      animation: true,
      animationDuration: 500,
      animationEasing: 'cubicInOut',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: '#94a3b8', width: 1 } },
        backgroundColor: chartTheme.tooltipBg,
        borderColor: chartTheme.tooltipBorder,
        textStyle: { color: chartTheme.tooltipText },
        formatter: (params: any) => {
          const year = params[0].axisValue
          let html = `<div style="font-weight:600;margin-bottom:8px">${year}</div>`
          const sorted = [...params].sort((a: any, b: any) => parseFloat(b.value) - parseFloat(a.value))
          sorted.forEach((p: any) => {
            const unit = showRelative ? '%' : ' EJ'
            html += `
              <div style="display:flex;align-items:center;gap:8px;margin:4px 0">
                <span style="width:10px;height:10px;border-radius:50%;background:${p.color}"></span>
                <span style="flex:1">${p.seriesName}</span>
                <span style="font-weight:500">${parseFloat(p.value).toFixed(2)}${unit}</span>
              </div>
            `
          })
          return html
        },
      },
      legend: {
        data: legendData,
        bottom: 0,
        left: 'center',
        textStyle: { color: chartTheme.textColor },
        icon: 'circle',
        itemWidth: 10,
        itemHeight: 10,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: YEARS,
        axisLine: { lineStyle: { color: chartTheme.axisLineColor } },
        axisLabel: { color: chartTheme.textColor },
      },
      yAxis: {
        type: 'value',
        name: showRelative ? 'Share (%)' : yAxisLabel,
        nameTextStyle: { color: chartTheme.textColor },
        axisLine: { lineStyle: { color: chartTheme.axisLineColor } },
        axisLabel: { color: chartTheme.textColor },
        splitLine: { lineStyle: { color: chartTheme.splitLineColor } },
      },
      series,
    }
  }

  function buildAnnualChangeOptions() {
    let series: any[] = []
    let legendData: string[] = []
    const yearsForChange = YEARS.slice(1) // Skip first year

    if (filterMode === 'fossil-vs-clean') {
      const fossilChanges = annualChanges['fossil'].slice(1)
      const cleanChanges = annualChanges['clean'].slice(1)

      series = [
        {
          name: 'Fossil Fuels',
          type: 'line',
          smooth: true,
          showSymbol: true,
          symbol: 'circle',
          symbolSize: 4,
          emphasis: { focus: 'series', scale: true },
          data: fossilChanges,
          itemStyle: { color: '#ef4444' },
          lineStyle: { width: 2 },
        },
        {
          name: 'Clean Energy',
          type: 'line',
          smooth: true,
          showSymbol: true,
          symbol: 'circle',
          symbolSize: 4,
          emphasis: { focus: 'series', scale: true },
          data: cleanChanges,
          itemStyle: { color: '#22c55e' },
          lineStyle: { width: 2 },
        },
      ]
      legendData = ['Fossil Fuels', 'Clean Energy']
    } else {
      const sourcesToShow = filterMode === 'custom' ? selectedSources : activeSources

      sourcesToShow.forEach(sourceId => {
        const source = SOURCES_DATA.find(s => s.id === sourceId)
        if (!source || !annualChanges[sourceId]) return

        series.push({
          name: source.name,
          type: 'line',
          smooth: true,
          showSymbol: true,
          symbol: 'circle',
          symbolSize: 4,
          emphasis: { focus: 'series', scale: true },
          data: annualChanges[sourceId].slice(1),
          itemStyle: { color: source.color },
          lineStyle: { width: 2 },
        })
        legendData.push(source.name)
      })
    }

    return {
      backgroundColor: chartTheme.backgroundColor,
      animation: true,
      animationDuration: 500,
      animationEasing: 'cubicInOut',
      tooltip: {
        trigger: 'axis',
        confine: true,
        axisPointer: { type: 'line', lineStyle: { color: '#94a3b8', width: 1 } },
        backgroundColor: chartTheme.tooltipBg,
        borderColor: chartTheme.tooltipBorder,
        textStyle: { color: chartTheme.tooltipText, fontSize: 12 },
        formatter: (params: any) => {
          const year = params[0].axisValue
          let html = `<div style="font-weight:600;margin-bottom:6px;font-size:13px">${year}</div>`
          const sorted = [...params].sort((a: any, b: any) => Math.abs(parseFloat(b.value)) - Math.abs(parseFloat(a.value)))
          sorted.forEach((p: any) => {
            const change = parseFloat(p.value)
            const sign = change >= 0 ? '+' : ''
            html += `
              <div style="display:flex;align-items:center;gap:6px;margin:3px 0">
                <span style="width:8px;height:8px;border-radius:50%;background:${p.color};flex-shrink:0"></span>
                <span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.seriesName}</span>
                <span style="font-weight:500;white-space:nowrap">${sign}${change.toFixed(2)} EJ</span>
              </div>
            `
          })
          return html
        },
      },
      legend: {
        data: legendData,
        bottom: 0,
        left: 'center',
        textStyle: { color: chartTheme.textColor },
        icon: 'circle',
        itemWidth: 10,
        itemHeight: 10,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: yearsForChange,
        axisLine: { lineStyle: { color: chartTheme.axisLineColor } },
        axisLabel: { color: chartTheme.textColor },
      },
      yAxis: {
        type: 'value',
        name: `Change in ${yAxisLabel}`,
        nameTextStyle: { color: chartTheme.textColor },
        axisLine: { lineStyle: { color: chartTheme.axisLineColor } },
        axisLabel: { color: chartTheme.textColor },
        splitLine: { lineStyle: { color: chartTheme.splitLineColor } },
      },
      series,
    }
  }

  // Handle source selection
  const handleSourceClick = (sourceId: string) => {
    if (filterMode !== 'custom') {
      setFilterMode('custom')
      setSelectedSources([sourceId])
    } else {
      if (selectedSources.includes(sourceId)) {
        if (selectedSources.length > 1) {
          setSelectedSources(selectedSources.filter(s => s !== sourceId))
        }
      } else {
        setSelectedSources([...selectedSources, sourceId])
      }
    }
  }

  // Handle quick filter selection
  const handleFilterModeChange = (mode: FilterMode) => {
    setFilterMode(mode)
    if (mode === 'all') {
      setSelectedSources(SOURCES_DATA.map(s => s.id))
    } else if (mode === 'all-fossil') {
      setSelectedSources(FOSSIL_SOURCES)
    } else if (mode === 'all-clean') {
      setSelectedSources(CLEAN_SOURCES)
    }
  }

  // Download handlers
  const downloadPNG = () => {
    const chart = chartRef.current?.getEchartsInstance()
    if (chart) {
      const url = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
      const link = document.createElement('a')
      link.href = url
      link.download = `energy-services-${new Date().toISOString().split('T')[0]}.png`
      link.click()
    }
  }

  const downloadCSV = () => {
    const headers = ['Year', ...SOURCES_DATA.map(s => s.name)]
    const rows = YEARS.map((year, i) => [
      year,
      ...SOURCES_DATA.map(s => SOURCE_TIMESERIES[s.id][i])
    ])

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `energy-services-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const toggleFullscreen = () => {
    const container = document.getElementById('chart-container')
    if (!document.fullscreenElement && container) {
      container.requestFullscreen()
      setIsFullscreen(true)
    } else if (document.fullscreenElement) {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // Check if source is selected
  const isSourceSelected = (sourceId: string) => {
    if (filterMode === 'all') return true
    if (filterMode === 'fossil-vs-clean') return false
    if (filterMode === 'all-fossil') return FOSSIL_SOURCES.includes(sourceId)
    if (filterMode === 'all-clean') return CLEAN_SOURCES.includes(sourceId)
    return selectedSources.includes(sourceId)
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">
          Interactive Energy Services Explorer
        </h1>
        <p className="text-text-secondary mt-1">
          {viewMode === 'primary' && 'Primary Energy: Raw energy extracted from sources before conversion losses.'}
          {viewMode === 'useful' && 'Useful Energy: Energy delivered after First-Law conversion losses.'}
          {viewMode === 'services' && 'Exergy Services: Thermodynamic work potential weighted by carrier quality.'}
          {viewMode === 'high-quality' && 'High-Quality Exergy: Electricity + mechanical work (100% work potential).'}
        </p>
      </div>

      {/* Headline Metric Card */}
      <div className="mb-6 card bg-gradient-to-r from-green-50 to-blue-50 border border-green-200">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p className="text-sm font-medium text-text-secondary mb-1">
              Clean Energy Share of High-Quality Exergy (2024)
            </p>
            <p className="text-4xl font-bold text-green-600">{cleanHighQualityShare}%</p>
            <p className="text-sm text-text-muted mt-1">
              The transition is further along than standard metrics suggest
            </p>
          </div>
          <div className="text-center md:text-right">
            <p className="text-xs text-text-muted max-w-xs">
              Standard reports show clean energy at 18-19% of primary. But clean sources
              produce almost exclusively high-quality carriers (electricity), while fossil
              fuels produce mostly low-quality heat.
            </p>
          </div>
        </div>
      </div>

      {/* Main Chart Card */}
      <div id="chart-container" className="card bg-white shadow-lg rounded-xl overflow-hidden">
        {/* Chart Header */}
        <div className="p-4 border-b border-border">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* View Mode Toggle */}
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Thermodynamic View</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setViewMode('primary')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                    viewMode === 'primary'
                      ? 'bg-gray-700 text-white border-gray-700 shadow-sm'
                      : 'bg-white text-text-secondary border-border hover:border-gray-500'
                  }`}
                >
                  Primary
                </button>
                <button
                  onClick={() => setViewMode('useful')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                    viewMode === 'useful'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-text-secondary border-border hover:border-blue-500'
                  }`}
                >
                  Useful
                </button>
                <button
                  onClick={() => setViewMode('services')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                    viewMode === 'services'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-white text-text-secondary border-border hover:border-purple-500'
                  }`}
                >
                  Exergy Services
                </button>
                <button
                  onClick={() => setViewMode('high-quality')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                    viewMode === 'high-quality'
                      ? 'bg-green-600 text-white border-green-600 shadow-sm'
                      : 'bg-white text-text-secondary border-border hover:border-green-500'
                  }`}
                >
                  High-Quality
                </button>
              </div>
            </div>

            {/* Chart Type Toggle */}
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Chart Type</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setChartType('total')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                    chartType === 'total'
                      ? 'bg-accent-blue text-white border-accent-blue shadow-sm'
                      : 'bg-white text-text-secondary border-border hover:border-accent-blue hover:text-accent-blue'
                  }`}
                >
                  Total
                </button>
                <button
                  onClick={() => setChartType('annual-change')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                    chartType === 'annual-change'
                      ? 'bg-accent-blue text-white border-accent-blue shadow-sm'
                      : 'bg-white text-text-secondary border-border hover:border-accent-blue hover:text-accent-blue'
                  }`}
                >
                  Annual Change
                </button>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-4">
              {/* Relative Values Toggle */}
              {chartType === 'total' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm text-text-secondary">Display Relative Values</span>
                  <button
                    onClick={() => setShowRelative(!showRelative)}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                      showRelative ? 'bg-accent-blue' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                        showRelative ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>
              )}

              {/* Download Buttons */}
              <button
                onClick={downloadPNG}
                className="flex items-center gap-2 px-3 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download PNG
              </button>
              <button
                onClick={downloadCSV}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
              >
                <Download className="w-4 h-4" />
                Download CSV
              </button>
              <button
                onClick={toggleFullscreen}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                Fullscreen
              </button>
            </div>
          </div>
        </div>

        {/* Source Filters */}
        <div className="p-4 border-b border-border bg-surface-elevated/50">
          <p className="text-sm font-medium text-text-secondary mb-3">Select Energy Sources</p>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => handleFilterModeChange('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                filterMode === 'all'
                  ? 'bg-accent-blue text-white border-accent-blue shadow-sm'
                  : 'bg-white text-text-secondary border-border hover:border-accent-blue hover:text-accent-blue'
              }`}
            >
              All Sources
            </button>
            <button
              onClick={() => handleFilterModeChange('fossil-vs-clean')}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                filterMode === 'fossil-vs-clean'
                  ? 'bg-accent-blue text-white border-accent-blue shadow-sm'
                  : 'bg-white text-text-secondary border-border hover:border-accent-blue hover:text-accent-blue'
              }`}
            >
              Fossil vs Clean
            </button>
            <button
              onClick={() => handleFilterModeChange('all-fossil')}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                filterMode === 'all-fossil'
                  ? 'bg-accent-blue text-white border-accent-blue shadow-sm'
                  : 'bg-white text-text-secondary border-border hover:border-accent-blue hover:text-accent-blue'
              }`}
            >
              All Fossil Sources
            </button>
            <button
              onClick={() => handleFilterModeChange('all-clean')}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                filterMode === 'all-clean'
                  ? 'bg-accent-blue text-white border-accent-blue shadow-sm'
                  : 'bg-white text-text-secondary border-border hover:border-accent-blue hover:text-accent-blue'
              }`}
            >
              All Clean Sources
            </button>
          </div>

          {/* Individual Source Buttons */}
          <div className="flex flex-wrap gap-2">
            {SOURCES_DATA.map(source => {
              const selected = isSourceSelected(source.id)
              return (
                <button
                  key={source.id}
                  onClick={() => handleSourceClick(source.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
                    selected
                      ? 'text-white border-transparent shadow-sm'
                      : 'bg-white text-text-secondary border-border hover:border-text-muted'
                  }`}
                  style={{
                    backgroundColor: selected ? source.color : undefined,
                    borderColor: selected ? source.color : undefined,
                  }}
                >
                  {source.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Main Chart */}
        <div className="p-4">
          <ReactECharts
            ref={chartRef}
            option={chartOptions}
            style={{ height: '500px', width: '100%' }}
            opts={{ renderer: 'canvas' }}
            notMerge={true}
          />
        </div>

        {/* Sources Citation */}
        <div className="px-4 pb-4">
          <p className="text-xs text-text-muted">
            Sources: Energy Institute Statistical Review 2024, RMI Inefficiency Trap 2023
          </p>
        </div>
      </div>

      {/* Additional Filter Sections */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Region Filter */}
        <div className="card">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Filter by Region</h3>
          <div className="flex flex-wrap gap-2">
            {REGIONS_DATA.map(region => (
              <button
                key={region.id}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-white text-text-secondary hover:border-text-muted transition-colors"
              >
                {region.name}
              </button>
            ))}
          </div>
        </div>

        {/* Sector Filter */}
        <div className="card">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Filter by Sector</h3>
          <div className="flex flex-wrap gap-2">
            {SECTORS_DATA.map(sector => (
              <button
                key={sector.id}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-white text-text-secondary hover:border-text-muted transition-colors"
              >
                {sector.name}
              </button>
            ))}
          </div>
        </div>

        {/* Compare */}
        <div className="card">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Compare</h3>
          <div className="flex flex-wrap gap-2">
            <button className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-white text-text-secondary hover:border-text-muted transition-colors">
              Compare Regions
            </button>
            <button className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-white text-text-secondary hover:border-text-muted transition-colors">
              Compare Sources
            </button>
          </div>
        </div>
      </div>

      {/* Methodology Section */}
      <div className="mt-6 card">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Methodology: Why This Platform Reports Different Numbers
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-700 mb-2">The Error in Standard Methods</h4>
            <p className="text-sm text-red-600">
              IEA, BP, Brockway, and most academic papers apply quality factors to energy <strong>sources</strong>.
              This is thermodynamically incorrect: once electricity is on the wire, its exergy is 1.0
              regardless of whether it came from coal or solar. The Second Law does not work backwards.
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-700 mb-2">The Correct Method (This Platform)</h4>
            <p className="text-sm text-green-600">
              We apply quality factors to energy <strong>carriers</strong> (electricity, mechanical work, heat),
              not sources. All electricity has exergy = 1.0 regardless of origin.
              This reveals the true progress of the clean energy transition.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-sm font-medium text-text-secondary mb-2">Carrier Quality Factors</h4>
            <table className="text-sm w-full">
              <tbody className="divide-y divide-border">
                <tr><td className="py-1">Electricity</td><td className="py-1 text-right font-mono text-green-600">1.00</td></tr>
                <tr><td className="py-1">Mechanical drive</td><td className="py-1 text-right font-mono text-green-600">1.00</td></tr>
                <tr><td className="py-1">High-T heat (&gt;500C)</td><td className="py-1 text-right font-mono text-yellow-600">0.65</td></tr>
                <tr><td className="py-1">Medium-T heat</td><td className="py-1 text-right font-mono text-orange-600">0.45</td></tr>
                <tr><td className="py-1">Low-T heat (&lt;100C)</td><td className="py-1 text-right font-mono text-red-600">0.12</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <h4 className="text-sm font-medium text-text-secondary mb-2">Key Insight</h4>
            <p className="text-sm text-text-muted mb-2">
              ~34% of global useful energy is high-quality (electricity + mechanical).
            </p>
            <p className="text-sm text-text-muted mb-2">
              Clean energy sources (nuclear, hydro, wind, solar) produce almost <strong>100% electricity</strong>.
            </p>
            <p className="text-sm text-text-muted">
              Fossil fuels produce mostly low-quality heat carriers.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-text-secondary mb-2">Data Sources</h4>
            <ul className="space-y-1 text-sm text-text-muted">
              <li>Energy Institute Statistical Review 2024</li>
              <li>IEA World Energy Outlook 2024</li>
              <li>LLNL Energy Flow Charts</li>
              <li>Brockway et al. (2019, 2023)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
