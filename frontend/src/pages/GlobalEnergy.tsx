import { useState, useMemo } from 'react'
import { Header } from '@/components/layout/Header'
import { KPICard } from '@/components/ui/KPICard'
import { Button } from '@/components/ui/Button'
import ReactECharts from 'echarts-for-react'
import {
  Info, TrendingUp, Zap, Leaf, Factory, Globe,
  BarChart3, ArrowLeftRight, ChevronDown, BookOpen, Percent, Hash
} from 'lucide-react'

// ============================================================================
// DATA: 60 Years of Global Exergy Data (1965-2024)
// ============================================================================

const YEARS = Array.from({ length: 60 }, (_, i) => 1965 + i)

// Global exergy timeseries by source type
const EXERGY_TIMESERIES = {
  years: YEARS,
  fossil: [80, 82, 85, 88, 92, 95, 98, 100, 102, 104, 106, 108, 110, 112, 114, 116, 118, 120, 118, 116, 118, 120, 122, 124, 126, 128, 130, 132, 130, 128, 130, 132, 128, 126, 124, 122, 120, 118, 116, 118, 120, 122, 124, 126, 128, 126, 124, 122, 120, 122, 124, 126, 125, 124, 123, 122, 121, 120, 122, 123.4],
  clean: [2, 2.1, 2.2, 2.3, 2.5, 2.7, 2.9, 3.1, 3.3, 3.5, 3.8, 4.1, 4.4, 4.7, 5, 5.3, 5.6, 6, 6.2, 6.4, 6.6, 6.9, 7.2, 7.5, 7.9, 8.3, 8.7, 9.1, 9.3, 9.5, 9.8, 10.1, 10.3, 10.5, 10.8, 11.1, 11.5, 11.9, 12.3, 12.8, 13.3, 13.9, 14.5, 15.2, 16, 16.8, 17.7, 18.6, 19.6, 20.2, 21, 21.8, 22.6, 23.2, 23.9, 24.5, 25, 25.3, 25.5, 25.54],
}

// Current metrics (2024)
const CURRENT_METRICS = {
  totalExergyServicesEj: 148.94,
  globalExergyEfficiency: 24.6,
  fossilSharePercent: 82.9,
  cleanSharePercent: 17.1,
  cleanEnergyMultiplier: 3.2,
  yearOverYearGrowth: 2.1,
}

// Energy sources breakdown with detailed data
const SOURCES_DATA = [
  { id: 'oil', name: 'Oil', value: 45.6, type: 'fossil', color: '#374151', efficiency: 18, trend: -0.8 },
  { id: 'coal', name: 'Coal', value: 37.2, type: 'fossil', color: '#1f2937', efficiency: 15, trend: -2.1 },
  { id: 'gas', name: 'Natural Gas', value: 28.8, type: 'fossil', color: '#6b7280', efficiency: 22, trend: 0.5 },
  { id: 'hydro', name: 'Hydropower', value: 9.5, type: 'clean', color: '#2563eb', efficiency: 85, trend: 1.2 },
  { id: 'wind', name: 'Wind', value: 6.1, type: 'clean', color: '#059669', efficiency: 95, trend: 12.5 },
  { id: 'solar', name: 'Solar PV', value: 5.1, type: 'clean', color: '#eab308', efficiency: 93, trend: 18.2 },
  { id: 'biomass', name: 'Biomass', value: 4.2, type: 'clean', color: '#84cc16', efficiency: 25, trend: 2.1 },
  { id: 'nuclear', name: 'Nuclear', value: 2.9, type: 'clean', color: '#7c3aed', efficiency: 33, trend: 0.3 },
  { id: 'geothermal', name: 'Geothermal', value: 0.14, type: 'clean', color: '#dc2626', efficiency: 45, trend: 3.4 },
]

// Regional data
const REGIONS_DATA = [
  {
    id: 'asia-pacific',
    name: 'Asia Pacific',
    totalExergy: 58.2,
    cleanShare: 14.8,
    efficiency: 22.1,
    fossil: 49.6,
    clean: 8.6,
    color: '#dc2626',
    countries: ['China', 'India', 'Japan', 'South Korea', 'Australia'],
  },
  {
    id: 'north-america',
    name: 'North America',
    totalExergy: 32.4,
    cleanShare: 18.2,
    efficiency: 26.3,
    fossil: 26.5,
    clean: 5.9,
    color: '#2563eb',
    countries: ['United States', 'Canada', 'Mexico'],
  },
  {
    id: 'europe',
    name: 'Europe',
    totalExergy: 24.8,
    cleanShare: 24.5,
    efficiency: 28.7,
    fossil: 18.7,
    clean: 6.1,
    color: '#059669',
    countries: ['Germany', 'France', 'UK', 'Italy', 'Spain'],
  },
  {
    id: 'middle-east',
    name: 'Middle East',
    totalExergy: 14.2,
    cleanShare: 5.2,
    efficiency: 19.4,
    fossil: 13.5,
    clean: 0.7,
    color: '#f59e0b',
    countries: ['Saudi Arabia', 'UAE', 'Iran', 'Iraq', 'Qatar'],
  },
  {
    id: 'south-america',
    name: 'South America',
    totalExergy: 9.8,
    cleanShare: 32.1,
    efficiency: 31.2,
    fossil: 6.7,
    clean: 3.1,
    color: '#84cc16',
    countries: ['Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru'],
  },
  {
    id: 'africa',
    name: 'Africa',
    totalExergy: 6.2,
    cleanShare: 22.4,
    efficiency: 20.8,
    fossil: 4.8,
    clean: 1.4,
    color: '#a855f7',
    countries: ['South Africa', 'Egypt', 'Nigeria', 'Morocco', 'Kenya'],
  },
  {
    id: 'cis',
    name: 'CIS',
    totalExergy: 3.34,
    cleanShare: 12.1,
    efficiency: 21.5,
    fossil: 2.94,
    clean: 0.4,
    color: '#64748b',
    countries: ['Russia', 'Kazakhstan', 'Ukraine', 'Uzbekistan'],
  },
]

// Sectoral breakdown
const SECTORS_DATA = [
  {
    id: 'industry',
    name: 'Industry',
    exergy: 52.1,
    share: 35.0,
    efficiency: 28.4,
    color: '#374151',
    subsectors: ['Manufacturing', 'Mining', 'Construction', 'Chemicals'],
  },
  {
    id: 'transport',
    name: 'Transport',
    exergy: 41.5,
    share: 27.9,
    efficiency: 21.2,
    color: '#2563eb',
    subsectors: ['Road', 'Aviation', 'Maritime', 'Rail'],
  },
  {
    id: 'residential',
    name: 'Residential',
    exergy: 26.8,
    share: 18.0,
    efficiency: 18.6,
    color: '#059669',
    subsectors: ['Heating', 'Cooling', 'Lighting', 'Appliances'],
  },
  {
    id: 'commercial',
    name: 'Commercial',
    exergy: 19.4,
    share: 13.0,
    efficiency: 24.1,
    color: '#f59e0b',
    subsectors: ['Office', 'Retail', 'Hospitality', 'Healthcare'],
  },
  {
    id: 'agriculture',
    name: 'Agriculture',
    exergy: 9.14,
    share: 6.1,
    efficiency: 15.3,
    color: '#84cc16',
    subsectors: ['Farming', 'Irrigation', 'Processing', 'Fisheries'],
  },
]

// Regional timeseries data (simplified - shows growth patterns)
const REGIONAL_TIMESERIES: Record<string, number[]> = {
  'asia-pacific': [15, 16, 17, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 45, 44, 45, 46, 47, 48, 49, 50, 51, 52, 51, 50, 51, 52, 51, 50, 49, 48, 48, 48, 49, 50, 51, 52, 53, 54, 55, 55.5, 56, 56.5, 57, 57.2, 57.4, 57.6, 57.8, 58, 58.1, 58.15, 58.18, 58.2, 58.2, 58.2],
  'north-america': [28, 28.5, 29, 29.5, 30, 30.5, 31, 31.5, 32, 32.5, 33, 33.5, 34, 34.2, 34.4, 34.5, 34.6, 34.7, 34.5, 34.3, 34.4, 34.5, 34.6, 34.5, 34.4, 34.3, 34.2, 34.1, 34, 33.9, 33.8, 33.7, 33.6, 33.5, 33.4, 33.3, 33.2, 33.1, 33, 32.9, 32.8, 32.7, 32.6, 32.5, 32.5, 32.5, 32.5, 32.4, 32.4, 32.4, 32.4, 32.4, 32.4, 32.4, 32.4, 32.4, 32.4, 32.4, 32.4, 32.4],
  'europe': [22, 22.5, 23, 23.5, 24, 24.5, 25, 25.5, 26, 26.5, 27, 27.5, 28, 28.2, 28.4, 28.5, 28.4, 28.3, 28.1, 27.9, 27.8, 27.7, 27.5, 27.3, 27.1, 26.9, 26.7, 26.5, 26.3, 26.1, 25.9, 25.7, 25.5, 25.3, 25.2, 25.1, 25, 25, 25, 25, 25, 25, 24.9, 24.9, 24.9, 24.8, 24.8, 24.8, 24.8, 24.8, 24.8, 24.8, 24.8, 24.8, 24.8, 24.8, 24.8, 24.8, 24.8, 24.8],
  'middle-east': [3, 3.2, 3.4, 3.6, 3.9, 4.2, 4.5, 4.8, 5.1, 5.5, 5.9, 6.3, 6.7, 7.1, 7.5, 8, 8.5, 9, 9.2, 9.4, 9.6, 9.8, 10, 10.3, 10.6, 10.9, 11.2, 11.5, 11.6, 11.7, 11.8, 12, 12.2, 12.4, 12.6, 12.8, 13, 13.2, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9, 14, 14, 14.1, 14.1, 14.1, 14.1, 14.1, 14.1, 14.2, 14.2, 14.2, 14.2, 14.2, 14.2, 14.2, 14.2],
  'south-america': [4, 4.1, 4.2, 4.3, 4.5, 4.7, 4.9, 5.1, 5.3, 5.5, 5.7, 5.9, 6.1, 6.3, 6.5, 6.7, 6.9, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 8, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 9, 9.1, 9.2, 9.3, 9.4, 9.5, 9.5, 9.6, 9.6, 9.7, 9.7, 9.7, 9.7, 9.8, 9.8, 9.8, 9.8, 9.8, 9.8, 9.8, 9.8, 9.8, 9.8, 9.8, 9.8],
  'africa': [2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 6, 6, 6, 6.1, 6.1, 6.1, 6.1, 6.1, 6.2, 6.2, 6.2, 6.2, 6.2, 6.2, 6.2, 6.2, 6.2, 6.2, 6.2, 6.2],
  'cis': [8, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 9, 9.1, 9.2, 9.3, 9.4, 9.5, 9.4, 9.3, 8.5, 7.5, 6.5, 5.8, 5.2, 4.8, 4.5, 4.3, 4.1, 4, 3.9, 3.8, 3.7, 3.6, 3.6, 3.5, 3.5, 3.5, 3.4, 3.4, 3.4, 3.4, 3.4, 3.4, 3.34, 3.34, 3.34, 3.34, 3.34, 3.34, 3.34, 3.34, 3.34, 3.34, 3.34, 3.34, 3.34, 3.34, 3.34, 3.34, 3.34, 3.34],
}

// Source-specific timeseries (indexed by source id)
const SOURCE_TIMESERIES: Record<string, number[]> = {
  'oil': [35, 36, 37, 38, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 52, 51, 52, 53, 54, 54, 54, 54, 53, 53, 52, 51, 51, 50, 49, 48, 48, 47, 47, 46, 46, 46, 46, 46, 46, 46, 46, 46, 46, 46, 46, 46, 46, 46, 45.8, 45.7, 45.6, 45.6, 45.6, 45.6, 45.6, 45.6],
  'coal': [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 46, 45, 46, 47, 48, 49, 50, 51, 52, 53, 52, 51, 52, 53, 51, 49, 47, 45, 44, 43, 42, 42, 42, 42, 41, 40, 40, 39, 39, 38, 38, 38, 38, 38, 37.8, 37.5, 37.3, 37.2, 37.2, 37.2, 37.2, 37.2],
  'gas': [10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5, 17, 17.5, 18, 18.5, 19, 19.5, 20, 20.5, 21, 21.5, 22, 22.5, 23, 23.5, 24, 24.5, 25, 25.5, 26, 26.5, 27, 27.5, 28, 28.2, 28.4, 28.5, 28.6, 28.7, 28.8, 28.8, 28.8, 28.8, 28.8, 28.8, 28.8, 28.8, 28.8, 28.8, 28.8, 28.8, 28.8, 28.8, 28.8, 28.8, 28.8, 28.8],
  'hydro': [2, 2.2, 2.4, 2.6, 2.8, 3, 3.2, 3.4, 3.6, 3.8, 4, 4.2, 4.4, 4.6, 4.8, 5, 5.2, 5.4, 5.6, 5.8, 6, 6.2, 6.4, 6.6, 6.8, 7, 7.2, 7.4, 7.6, 7.8, 8, 8.2, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 9, 9.1, 9.2, 9.2, 9.3, 9.3, 9.4, 9.4, 9.4, 9.4, 9.5, 9.5, 9.5, 9.5, 9.5, 9.5, 9.5, 9.5, 9.5, 9.5, 9.5, 9.5],
  'wind': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.01, 0.02, 0.03, 0.05, 0.08, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.4, 2.6, 2.9, 3.2, 3.5, 3.8, 4.1, 4.4, 4.7, 5, 5.3, 5.5, 5.7, 5.8, 5.9, 6, 6, 6.05, 6.08, 6.1, 6.1, 6.1, 6.1, 6.1, 6.1, 6.1],
  'solar': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.01, 0.02, 0.03, 0.05, 0.08, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.2, 1.4, 1.7, 2, 2.3, 2.7, 3.1, 3.5, 3.9, 4.3, 4.6, 4.8, 4.9, 5, 5.05, 5.08, 5.1, 5.1, 5.1, 5.1, 5.1, 5.1, 5.1, 5.1, 5.1, 5.1],
  'nuclear': [0, 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.4, 2.6, 2.7, 2.8, 2.9, 3, 3.1, 3.1, 3.1, 3.1, 3, 3, 2.95, 2.9, 2.9, 2.9, 2.9, 2.9, 2.9, 2.9, 2.9, 2.9, 2.9, 2.9, 2.9, 2.9, 2.9, 2.9, 2.9, 2.9, 2.9, 2.9, 2.9, 2.9, 2.9, 2.9, 2.9, 2.9, 2.9, 2.9, 2.9, 2.9, 2.9, 2.9],
  'biomass': [1.5, 1.6, 1.7, 1.8, 1.9, 2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.85, 3.9, 3.95, 4, 4.02, 4.04, 4.06, 4.08, 4.1, 4.1, 4.1, 4.1, 4.12, 4.14, 4.15, 4.16, 4.17, 4.18, 4.19, 4.2, 4.2, 4.2, 4.2, 4.2, 4.2, 4.2, 4.2, 4.2, 4.2, 4.2, 4.2, 4.2, 4.2, 4.2, 4.2, 4.2],
  'geothermal': [0.02, 0.02, 0.02, 0.03, 0.03, 0.03, 0.04, 0.04, 0.04, 0.05, 0.05, 0.05, 0.06, 0.06, 0.06, 0.07, 0.07, 0.07, 0.08, 0.08, 0.08, 0.09, 0.09, 0.09, 0.1, 0.1, 0.1, 0.11, 0.11, 0.11, 0.12, 0.12, 0.12, 0.12, 0.13, 0.13, 0.13, 0.13, 0.13, 0.14, 0.14, 0.14, 0.14, 0.14, 0.14, 0.14, 0.14, 0.14, 0.14, 0.14, 0.14, 0.14, 0.14, 0.14, 0.14, 0.14, 0.14, 0.14, 0.14, 0.14],
}

// Efficiency data by source type
const EFFICIENCY_DATA = {
  conversionFactors: [
    { source: 'Coal Power Plant', primaryToUseful: 33, usefulToExergy: 85, overall: 28 },
    { source: 'Gas Combined Cycle', primaryToUseful: 55, usefulToExergy: 90, overall: 50 },
    { source: 'Oil Refining + Use', primaryToUseful: 85, usefulToExergy: 21, overall: 18 },
    { source: 'Nuclear Power', primaryToUseful: 33, usefulToExergy: 100, overall: 33 },
    { source: 'Hydropower', primaryToUseful: 90, usefulToExergy: 95, overall: 85 },
    { source: 'Wind Power', primaryToUseful: 100, usefulToExergy: 95, overall: 95 },
    { source: 'Solar PV', primaryToUseful: 100, usefulToExergy: 93, overall: 93 },
    { source: 'Biomass Combustion', primaryToUseful: 30, usefulToExergy: 85, overall: 25 },
    { source: 'Geothermal', primaryToUseful: 50, usefulToExergy: 90, overall: 45 },
  ],
  sectoralEfficiency: [
    { sector: 'Industry - High Temp', efficiency: 45, potential: 65 },
    { sector: 'Industry - Low Temp', efficiency: 25, potential: 55 },
    { sector: 'Transport - Road', efficiency: 20, potential: 85 },
    { sector: 'Transport - Aviation', efficiency: 35, potential: 50 },
    { sector: 'Buildings - Heating', efficiency: 15, potential: 90 },
    { sector: 'Buildings - Cooling', efficiency: 25, potential: 85 },
    { sector: 'Buildings - Lighting', efficiency: 65, potential: 95 },
  ],
}

// ============================================================================
// COMPONENT
// ============================================================================

type ViewType = 'timeseries' | 'sources' | 'regions' | 'sectors' | 'efficiency' | 'compare'
type DisplayMode = 'absolute' | 'relative'

export function GlobalEnergy() {
  const [selectedView, setSelectedView] = useState<ViewType>('timeseries')
  const [displayMode, setDisplayMode] = useState<DisplayMode>('absolute')
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['asia-pacific', 'north-america', 'europe'])
  const [selectedSources, setSelectedSources] = useState<string[]>(['solar', 'wind', 'gas'])
  const [compareType, setCompareType] = useState<'regions' | 'sources'>('regions')
  const [expandedMethodology, setExpandedMethodology] = useState<string | null>(null)

  // Chart theme colors for light mode
  const chartTheme = {
    backgroundColor: 'transparent',
    textColor: '#475569',
    axisLineColor: '#e2e8f0',
    splitLineColor: '#f1f5f9',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e2e8f0',
    tooltipText: '#0f172a',
  }

  // ============================================================================
  // CHART OPTIONS
  // ============================================================================

  // Global timeseries chart
  const timeseriesOptions = useMemo(() => {
    const fossilData = displayMode === 'absolute'
      ? EXERGY_TIMESERIES.fossil
      : EXERGY_TIMESERIES.fossil.map((v, i) => {
          const total = v + EXERGY_TIMESERIES.clean[i]
          return (v / total) * 100
        })
    const cleanData = displayMode === 'absolute'
      ? EXERGY_TIMESERIES.clean
      : EXERGY_TIMESERIES.clean.map((v, i) => {
          const total = EXERGY_TIMESERIES.fossil[i] + v
          return (v / total) * 100
        })

    return {
      backgroundColor: chartTheme.backgroundColor,
      tooltip: {
        trigger: 'axis',
        backgroundColor: chartTheme.tooltipBg,
        borderColor: chartTheme.tooltipBorder,
        textStyle: { color: chartTheme.tooltipText },
        formatter: (params: any) => {
          const year = params[0].axisValue
          let html = `<strong>${year}</strong><br/>`
          params.forEach((p: any) => {
            const unit = displayMode === 'absolute' ? 'EJ' : '%'
            html += `<span style="color:${p.color}">\u25CF</span> ${p.seriesName}: ${p.value.toFixed(1)} ${unit}<br/>`
          })
          return html
        },
      },
      legend: {
        data: ['Fossil', 'Clean'],
        textStyle: { color: chartTheme.textColor },
        top: 10,
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: EXERGY_TIMESERIES.years,
        axisLine: { lineStyle: { color: chartTheme.axisLineColor } },
        axisLabel: { color: chartTheme.textColor },
      },
      yAxis: {
        type: 'value',
        name: displayMode === 'absolute' ? 'Exergy Services (EJ)' : 'Share (%)',
        nameTextStyle: { color: chartTheme.textColor },
        axisLine: { lineStyle: { color: chartTheme.axisLineColor } },
        axisLabel: { color: chartTheme.textColor },
        splitLine: { lineStyle: { color: chartTheme.splitLineColor } },
      },
      series: [
        {
          name: 'Fossil',
          type: 'line',
          data: fossilData,
          smooth: true,
          lineStyle: { width: 2, color: '#6b7280' },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(107, 114, 128, 0.3)' },
                { offset: 1, color: 'rgba(107, 114, 128, 0.05)' },
              ],
            },
          },
        },
        {
          name: 'Clean',
          type: 'line',
          data: cleanData,
          smooth: true,
          lineStyle: { width: 3, color: '#059669' },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(5, 150, 105, 0.4)' },
                { offset: 1, color: 'rgba(5, 150, 105, 0.05)' },
              ],
            },
          },
        },
      ],
    }
  }, [displayMode])

  // Sources chart
  const sourcesOptions = useMemo(() => {
    const data = displayMode === 'absolute'
      ? SOURCES_DATA.map(s => ({ value: s.value, name: s.name, itemStyle: { color: s.color } }))
      : SOURCES_DATA.map(s => {
          const total = SOURCES_DATA.reduce((acc, x) => acc + x.value, 0)
          return { value: (s.value / total) * 100, name: s.name, itemStyle: { color: s.color } }
        })

    return {
      backgroundColor: chartTheme.backgroundColor,
      tooltip: {
        trigger: 'item',
        backgroundColor: chartTheme.tooltipBg,
        borderColor: chartTheme.tooltipBorder,
        textStyle: { color: chartTheme.tooltipText },
        formatter: (params: any) => {
          const unit = displayMode === 'absolute' ? 'EJ' : '%'
          return `${params.name}: ${params.value.toFixed(2)} ${unit} (${params.percent.toFixed(1)}%)`
        },
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        textStyle: { color: chartTheme.textColor },
      },
      series: [{
        name: 'Energy Sources',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['60%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 4, borderColor: '#ffffff', borderWidth: 2 },
        label: { show: true, color: chartTheme.textColor, formatter: '{b}: {c}' },
        data,
      }],
    }
  }, [displayMode])

  // Regional bar chart
  const regionsOptions = useMemo(() => {
    const sortedRegions = [...REGIONS_DATA].sort((a, b) => b.totalExergy - a.totalExergy)

    return {
      backgroundColor: chartTheme.backgroundColor,
      tooltip: {
        trigger: 'axis',
        backgroundColor: chartTheme.tooltipBg,
        borderColor: chartTheme.tooltipBorder,
        textStyle: { color: chartTheme.tooltipText },
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['Fossil', 'Clean'],
        textStyle: { color: chartTheme.textColor },
        top: 10,
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: sortedRegions.map(r => r.name),
        axisLine: { lineStyle: { color: chartTheme.axisLineColor } },
        axisLabel: { color: chartTheme.textColor, rotate: 30 },
      },
      yAxis: {
        type: 'value',
        name: displayMode === 'absolute' ? 'Exergy (EJ)' : 'Share (%)',
        nameTextStyle: { color: chartTheme.textColor },
        axisLine: { lineStyle: { color: chartTheme.axisLineColor } },
        axisLabel: { color: chartTheme.textColor },
        splitLine: { lineStyle: { color: chartTheme.splitLineColor } },
      },
      series: [
        {
          name: 'Fossil',
          type: 'bar',
          stack: 'total',
          data: sortedRegions.map(r => displayMode === 'absolute' ? r.fossil : (r.fossil / r.totalExergy) * 100),
          itemStyle: { color: '#6b7280' },
        },
        {
          name: 'Clean',
          type: 'bar',
          stack: 'total',
          data: sortedRegions.map(r => displayMode === 'absolute' ? r.clean : (r.clean / r.totalExergy) * 100),
          itemStyle: { color: '#059669' },
        },
      ],
    }
  }, [displayMode])

  // Sectoral breakdown chart
  const sectorsOptions = useMemo(() => {
    return {
      backgroundColor: chartTheme.backgroundColor,
      tooltip: {
        trigger: 'item',
        backgroundColor: chartTheme.tooltipBg,
        borderColor: chartTheme.tooltipBorder,
        textStyle: { color: chartTheme.tooltipText },
        formatter: (params: any) => {
          const sector = SECTORS_DATA.find(s => s.name === params.name)
          return `<strong>${params.name}</strong><br/>
            Exergy: ${sector?.exergy.toFixed(1)} EJ<br/>
            Share: ${sector?.share.toFixed(1)}%<br/>
            Efficiency: ${sector?.efficiency.toFixed(1)}%`
        },
      },
      legend: {
        orient: 'vertical',
        right: 'right',
        textStyle: { color: chartTheme.textColor },
      },
      series: [{
        name: 'Sectors',
        type: 'pie',
        radius: '70%',
        center: ['40%', '50%'],
        data: SECTORS_DATA.map(s => ({
          value: displayMode === 'absolute' ? s.exergy : s.share,
          name: s.name,
          itemStyle: { color: s.color },
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.2)',
          },
        },
        label: { color: chartTheme.textColor },
      }],
    }
  }, [displayMode])

  // Efficiency gauge
  const efficiencyGaugeOptions = {
    backgroundColor: chartTheme.backgroundColor,
    series: [{
      type: 'gauge',
      startAngle: 180,
      endAngle: 0,
      center: ['50%', '75%'],
      radius: '90%',
      min: 0,
      max: 100,
      splitNumber: 10,
      axisLine: {
        lineStyle: {
          width: 30,
          color: [
            [0.25, '#dc2626'],
            [0.5, '#f59e0b'],
            [0.75, '#059669'],
            [1, '#059669'],
          ],
        },
      },
      pointer: {
        icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
        length: '12%',
        width: 20,
        offsetCenter: [0, '-60%'],
        itemStyle: { color: '#0f172a' },
      },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      title: {
        offsetCenter: [0, '-20%'],
        fontSize: 16,
        color: chartTheme.textColor,
      },
      detail: {
        fontSize: 48,
        offsetCenter: [0, '0%'],
        valueAnimation: true,
        formatter: '{value}%',
        color: '#059669',
      },
      data: [{ value: CURRENT_METRICS.globalExergyEfficiency, name: 'Global Exergy Efficiency' }],
    }],
  }

  // Comparison chart
  const comparisonOptions = useMemo(() => {
    if (compareType === 'regions') {
      const series = selectedRegions.map(regionId => {
        const region = REGIONS_DATA.find(r => r.id === regionId)!
        return {
          name: region.name,
          type: 'line',
          data: REGIONAL_TIMESERIES[regionId],
          smooth: true,
          lineStyle: { width: 2, color: region.color },
        }
      })

      return {
        backgroundColor: chartTheme.backgroundColor,
        tooltip: {
          trigger: 'axis',
          backgroundColor: chartTheme.tooltipBg,
          borderColor: chartTheme.tooltipBorder,
          textStyle: { color: chartTheme.tooltipText },
        },
        legend: {
          data: selectedRegions.map(id => REGIONS_DATA.find(r => r.id === id)!.name),
          textStyle: { color: chartTheme.textColor },
          top: 10,
        },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: {
          type: 'category',
          data: YEARS,
          axisLine: { lineStyle: { color: chartTheme.axisLineColor } },
          axisLabel: { color: chartTheme.textColor },
        },
        yAxis: {
          type: 'value',
          name: 'Exergy (EJ)',
          nameTextStyle: { color: chartTheme.textColor },
          axisLine: { lineStyle: { color: chartTheme.axisLineColor } },
          axisLabel: { color: chartTheme.textColor },
          splitLine: { lineStyle: { color: chartTheme.splitLineColor } },
        },
        series,
      }
    } else {
      const series = selectedSources.map(sourceId => {
        const source = SOURCES_DATA.find(s => s.id === sourceId)!
        return {
          name: source.name,
          type: 'line',
          data: SOURCE_TIMESERIES[sourceId],
          smooth: true,
          lineStyle: { width: 2, color: source.color },
        }
      })

      return {
        backgroundColor: chartTheme.backgroundColor,
        tooltip: {
          trigger: 'axis',
          backgroundColor: chartTheme.tooltipBg,
          borderColor: chartTheme.tooltipBorder,
          textStyle: { color: chartTheme.tooltipText },
        },
        legend: {
          data: selectedSources.map(id => SOURCES_DATA.find(s => s.id === id)!.name),
          textStyle: { color: chartTheme.textColor },
          top: 10,
        },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: {
          type: 'category',
          data: YEARS,
          axisLine: { lineStyle: { color: chartTheme.axisLineColor } },
          axisLabel: { color: chartTheme.textColor },
        },
        yAxis: {
          type: 'value',
          name: 'Exergy (EJ)',
          nameTextStyle: { color: chartTheme.textColor },
          axisLine: { lineStyle: { color: chartTheme.axisLineColor } },
          axisLabel: { color: chartTheme.textColor },
          splitLine: { lineStyle: { color: chartTheme.splitLineColor } },
        },
        series,
      }
    }
  }, [compareType, selectedRegions, selectedSources])

  // Toggle selection helper
  const toggleSelection = (id: string, current: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (current.includes(id)) {
      if (current.length > 1) {
        setter(current.filter(x => x !== id))
      }
    } else {
      setter([...current, id])
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div>
      <Header
        title="Global Energy Intelligence"
        subtitle="Exergy-based analysis of the world's energy system (1965-2024)"
      />

      <div className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Exergy Services"
            value={CURRENT_METRICS.totalExergyServicesEj.toFixed(2)}
            unit="EJ"
            change={CURRENT_METRICS.yearOverYearGrowth}
            changeLabel="vs 2023"
          />
          <KPICard
            title="Global Exergy Efficiency"
            value={CURRENT_METRICS.globalExergyEfficiency.toFixed(1)}
            unit="%"
            change={0.3}
            changeLabel="improvement"
          />
          <KPICard
            title="Clean Energy Share"
            value={CURRENT_METRICS.cleanSharePercent.toFixed(1)}
            unit="%"
            change={1.2}
            changeLabel="growth"
          />
          <div className="card bg-gradient-to-br from-primary/5 to-accent-blue/5">
            <p className="text-sm text-text-muted mb-1">Clean Energy Advantage</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-primary">{CURRENT_METRICS.cleanEnergyMultiplier}x</span>
              <span className="text-lg text-text-secondary">more value</span>
            </div>
            <p className="text-xs text-text-muted mt-2">
              Clean energy delivers {CURRENT_METRICS.cleanEnergyMultiplier}x more thermodynamic value per unit of primary energy
            </p>
          </div>
        </div>

        {/* Key Insight Banner */}
        <div className="card bg-gradient-to-r from-surface to-surface-elevated border-primary/20">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">
                Why Exergy Services Matter
              </h3>
              <p className="text-text-secondary mt-1">
                Traditional energy statistics measure <strong>primary energy</strong> (what we extract),
                which unfairly penalizes clean energy. Exergy services measure the actual
                <strong> thermodynamic work</strong> delivered to end-users. This reveals that clean
                energy's true share is <strong>{CURRENT_METRICS.cleanSharePercent}%</strong> (not 7% as commonly reported).
              </p>
              <div className="flex gap-4 mt-4">
                <Button variant="secondary" size="sm" leftIcon={<Info className="w-4 h-4" />}>
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* View Selector and Display Mode */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedView === 'timeseries' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedView('timeseries')}
              leftIcon={<TrendingUp className="w-4 h-4" />}
            >
              Historical Trends
            </Button>
            <Button
              variant={selectedView === 'sources' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedView('sources')}
              leftIcon={<Factory className="w-4 h-4" />}
            >
              Energy Sources
            </Button>
            <Button
              variant={selectedView === 'regions' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedView('regions')}
              leftIcon={<Globe className="w-4 h-4" />}
            >
              By Region
            </Button>
            <Button
              variant={selectedView === 'sectors' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedView('sectors')}
              leftIcon={<BarChart3 className="w-4 h-4" />}
            >
              By Sector
            </Button>
            <Button
              variant={selectedView === 'compare' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedView('compare')}
              leftIcon={<ArrowLeftRight className="w-4 h-4" />}
            >
              Compare
            </Button>
            <Button
              variant={selectedView === 'efficiency' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedView('efficiency')}
              leftIcon={<Leaf className="w-4 h-4" />}
            >
              Efficiency
            </Button>
          </div>

          {/* Display Mode Toggle */}
          <div className="flex items-center gap-2 bg-surface-elevated rounded-lg p-1">
            <button
              onClick={() => setDisplayMode('absolute')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                displayMode === 'absolute'
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Hash className="w-4 h-4" />
              Absolute
            </button>
            <button
              onClick={() => setDisplayMode('relative')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                displayMode === 'relative'
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Percent className="w-4 h-4" />
              Relative
            </button>
          </div>
        </div>

        {/* Main Chart Area */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary">
              {selectedView === 'timeseries' && 'Exergy Services by Source (1965-2024)'}
              {selectedView === 'sources' && 'Current Energy Mix by Source (2024)'}
              {selectedView === 'regions' && 'Regional Energy Distribution (2024)'}
              {selectedView === 'sectors' && 'Sectoral Energy Consumption (2024)'}
              {selectedView === 'compare' && 'Historical Comparison'}
              {selectedView === 'efficiency' && 'Global Exergy Efficiency'}
            </h3>
          </div>

          {/* Comparison Controls */}
          {selectedView === 'compare' && (
            <div className="mb-4 space-y-4">
              <div className="flex gap-4">
                <button
                  onClick={() => setCompareType('regions')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    compareType === 'regions'
                      ? 'bg-primary text-white'
                      : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Compare Regions
                </button>
                <button
                  onClick={() => setCompareType('sources')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    compareType === 'sources'
                      ? 'bg-primary text-white'
                      : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Compare Sources
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {compareType === 'regions' ? (
                  REGIONS_DATA.map(region => (
                    <button
                      key={region.id}
                      onClick={() => toggleSelection(region.id, selectedRegions, setSelectedRegions)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                        selectedRegions.includes(region.id)
                          ? 'border-transparent text-white'
                          : 'border-border text-text-secondary hover:border-text-muted'
                      }`}
                      style={{
                        backgroundColor: selectedRegions.includes(region.id) ? region.color : 'transparent',
                      }}
                    >
                      {region.name}
                    </button>
                  ))
                ) : (
                  SOURCES_DATA.map(source => (
                    <button
                      key={source.id}
                      onClick={() => toggleSelection(source.id, selectedSources, setSelectedSources)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                        selectedSources.includes(source.id)
                          ? 'border-transparent text-white'
                          : 'border-border text-text-secondary hover:border-text-muted'
                      }`}
                      style={{
                        backgroundColor: selectedSources.includes(source.id) ? source.color : 'transparent',
                      }}
                    >
                      {source.name}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="h-[400px]">
            {selectedView === 'timeseries' && (
              <ReactECharts option={timeseriesOptions} style={{ height: '100%', width: '100%' }} />
            )}
            {selectedView === 'sources' && (
              <ReactECharts option={sourcesOptions} style={{ height: '100%', width: '100%' }} />
            )}
            {selectedView === 'regions' && (
              <ReactECharts option={regionsOptions} style={{ height: '100%', width: '100%' }} />
            )}
            {selectedView === 'sectors' && (
              <ReactECharts option={sectorsOptions} style={{ height: '100%', width: '100%' }} />
            )}
            {selectedView === 'compare' && (
              <ReactECharts option={comparisonOptions} style={{ height: '100%', width: '100%' }} />
            )}
            {selectedView === 'efficiency' && (
              <ReactECharts option={efficiencyGaugeOptions} style={{ height: '100%', width: '100%' }} />
            )}
          </div>
        </div>

        {/* Regional Details Table */}
        {selectedView === 'regions' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Regional Details</h3>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Region</th>
                    <th>Total Exergy (EJ)</th>
                    <th>Clean Share</th>
                    <th>Efficiency</th>
                    <th>Key Countries</th>
                  </tr>
                </thead>
                <tbody>
                  {REGIONS_DATA.sort((a, b) => b.totalExergy - a.totalExergy).map(region => (
                    <tr key={region.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: region.color }} />
                          <span className="font-medium text-text-primary">{region.name}</span>
                        </div>
                      </td>
                      <td className="text-text-secondary">{region.totalExergy.toFixed(1)} EJ</td>
                      <td>
                        <span className={`badge ${region.cleanShare > 20 ? 'badge-success' : region.cleanShare > 10 ? 'badge-warning' : 'badge-error'}`}>
                          {region.cleanShare.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-text-secondary">{region.efficiency.toFixed(1)}%</td>
                      <td className="text-text-muted text-sm">{region.countries.slice(0, 3).join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sectoral Details Table */}
        {selectedView === 'sectors' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Sectoral Details</h3>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Sector</th>
                    <th>Exergy Consumption (EJ)</th>
                    <th>Share</th>
                    <th>Efficiency</th>
                    <th>Subsectors</th>
                  </tr>
                </thead>
                <tbody>
                  {SECTORS_DATA.sort((a, b) => b.exergy - a.exergy).map(sector => (
                    <tr key={sector.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sector.color }} />
                          <span className="font-medium text-text-primary">{sector.name}</span>
                        </div>
                      </td>
                      <td className="text-text-secondary">{sector.exergy.toFixed(1)} EJ</td>
                      <td className="text-text-secondary">{sector.share.toFixed(1)}%</td>
                      <td>
                        <span className={`badge ${sector.efficiency > 25 ? 'badge-success' : sector.efficiency > 18 ? 'badge-warning' : 'badge-error'}`}>
                          {sector.efficiency.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-text-muted text-sm">{sector.subsectors.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sources Details Table */}
        {selectedView === 'sources' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Source Details</h3>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Type</th>
                    <th>Exergy Output (EJ)</th>
                    <th>Exergy Efficiency</th>
                    <th>YoY Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {SOURCES_DATA.sort((a, b) => b.value - a.value).map(source => (
                    <tr key={source.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }} />
                          <span className="font-medium text-text-primary">{source.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${source.type === 'clean' ? 'badge-success' : ''}`}
                              style={{ backgroundColor: source.type === 'fossil' ? 'rgba(107, 114, 128, 0.2)' : undefined,
                                       color: source.type === 'fossil' ? '#6b7280' : undefined }}>
                          {source.type}
                        </span>
                      </td>
                      <td className="text-text-secondary">{source.value.toFixed(2)} EJ</td>
                      <td className="text-text-secondary">{source.efficiency}%</td>
                      <td>
                        <span className={source.trend > 0 ? 'text-success' : 'text-error'}>
                          {source.trend > 0 ? '+' : ''}{source.trend.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Expanded Efficiency Section */}
        {selectedView === 'efficiency' && (
          <div className="space-y-6">
            {/* Conversion Factors Table */}
            <div className="card">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Energy Conversion Efficiency by Source
              </h3>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Energy Source</th>
                      <th>Primary to Useful</th>
                      <th>Useful to Exergy</th>
                      <th>Overall Efficiency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EFFICIENCY_DATA.conversionFactors.map((row, idx) => (
                      <tr key={idx}>
                        <td className="font-medium text-text-primary">{row.source}</td>
                        <td className="text-text-secondary">{row.primaryToUseful}%</td>
                        <td className="text-text-secondary">{row.usefulToExergy}%</td>
                        <td>
                          <span className={`badge ${row.overall > 50 ? 'badge-success' : row.overall > 30 ? 'badge-warning' : 'badge-error'}`}>
                            {row.overall}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sectoral Efficiency & Potential */}
            <div className="card">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Sectoral Efficiency & Improvement Potential
              </h3>
              <div className="space-y-4">
                {EFFICIENCY_DATA.sectoralEfficiency.map((sector, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-primary font-medium">{sector.sector}</span>
                      <span className="text-text-secondary">
                        {sector.efficiency}% current / {sector.potential}% potential
                      </span>
                    </div>
                    <div className="h-4 bg-surface-elevated rounded-full overflow-hidden">
                      <div className="h-full flex">
                        <div
                          className="bg-primary transition-all"
                          style={{ width: `${sector.efficiency}%` }}
                        />
                        <div
                          className="bg-primary/30 transition-all"
                          style={{ width: `${sector.potential - sector.efficiency}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Methodology */}
            <div className="card">
              <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Detailed Methodology
              </h3>

              <div className="space-y-3">
                {/* Methodology Section 1 */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedMethodology(expandedMethodology === 'primary' ? null : 'primary')}
                    className="w-full flex items-center justify-between p-4 bg-surface-elevated hover:bg-surface-elevated/80 transition-colors"
                  >
                    <span className="font-medium text-text-primary">1. Primary Energy Accounting</span>
                    <ChevronDown className={`w-5 h-5 text-text-muted transition-transform ${expandedMethodology === 'primary' ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedMethodology === 'primary' && (
                    <div className="p-4 text-text-secondary text-sm space-y-3">
                      <p>
                        <strong>Definition:</strong> Primary energy is the energy contained in raw fuels and other forms of energy
                        received as input to the energy system. It includes fossil fuels (coal, oil, natural gas), nuclear energy,
                        and renewable sources before any transformation.
                      </p>
                      <p>
                        <strong>Measurement:</strong> For fossil fuels, primary energy equals the heat content (calorific value) of the fuel.
                        For nuclear, it's typically calculated as heat generated in the reactor. For renewables like wind and solar,
                        there are different conventions - we use the "direct equivalent" method where electricity output equals primary energy input.
                      </p>
                      <p>
                        <strong>Data Sources:</strong> IEA World Energy Statistics, BP Statistical Review of World Energy,
                        national energy agencies, and IRENA for renewables.
                      </p>
                    </div>
                  )}
                </div>

                {/* Methodology Section 2 */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedMethodology(expandedMethodology === 'useful' ? null : 'useful')}
                    className="w-full flex items-center justify-between p-4 bg-surface-elevated hover:bg-surface-elevated/80 transition-colors"
                  >
                    <span className="font-medium text-text-primary">2. Useful Energy Calculation</span>
                    <ChevronDown className={`w-5 h-5 text-text-muted transition-transform ${expandedMethodology === 'useful' ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedMethodology === 'useful' && (
                    <div className="p-4 text-text-secondary text-sm space-y-3">
                      <p>
                        <strong>Definition:</strong> Useful energy is the energy actually delivered to end-users after accounting
                        for conversion and distribution losses. It represents the energy available to perform desired tasks.
                      </p>
                      <p>
                        <strong>Conversion Factors:</strong>
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Coal power plants: 33-45% (average 38%)</li>
                        <li>Gas combined cycle: 50-62% (average 55%)</li>
                        <li>Internal combustion engines: 20-25%</li>
                        <li>Electric vehicles: 85-90%</li>
                        <li>Heat pumps: 250-400% (COP 2.5-4)</li>
                        <li>Direct electric heating: 95-100%</li>
                      </ul>
                      <p>
                        <strong>Formula:</strong> Useful Energy = Primary Energy x Conversion Efficiency x Distribution Efficiency
                      </p>
                    </div>
                  )}
                </div>

                {/* Methodology Section 3 */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedMethodology(expandedMethodology === 'exergy' ? null : 'exergy')}
                    className="w-full flex items-center justify-between p-4 bg-surface-elevated hover:bg-surface-elevated/80 transition-colors"
                  >
                    <span className="font-medium text-text-primary">3. Exergy Services (Second Law Analysis)</span>
                    <ChevronDown className={`w-5 h-5 text-text-muted transition-transform ${expandedMethodology === 'exergy' ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedMethodology === 'exergy' && (
                    <div className="p-4 text-text-secondary text-sm space-y-3">
                      <p>
                        <strong>Definition:</strong> Exergy (also called "available work" or "availability") is the maximum useful
                        work obtainable from a system as it comes to equilibrium with its environment. Unlike energy, exergy can be
                        destroyed through irreversibilities.
                      </p>
                      <p>
                        <strong>The Second Law Perspective:</strong> While energy is always conserved (First Law), the quality of
                        energy degrades (Second Law). Exergy quantifies this quality. Electricity has near-100% exergy content,
                        while low-temperature heat has low exergy content.
                      </p>
                      <p>
                        <strong>Exergy Factors by End-Use:</strong>
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Mechanical work (motors, vehicles): ~100%</li>
                        <li>High-temperature heat ({'>'}500C): 70-85%</li>
                        <li>Medium-temperature heat (100-500C): 40-70%</li>
                        <li>Low-temperature heat ({'<'}100C): 5-40%</li>
                        <li>Lighting: ~95%</li>
                        <li>Electronics/computing: ~100%</li>
                      </ul>
                      <p>
                        <strong>Formula:</strong> Exergy Services = Useful Energy x Exergy Factor
                      </p>
                      <p>
                        <strong>Key Insight:</strong> This methodology reveals that clean electricity sources (wind, solar, hydro)
                        deliver more thermodynamic value per unit of primary energy because they produce high-quality electricity
                        directly, avoiding the thermal conversion losses inherent in fossil fuel combustion.
                      </p>
                    </div>
                  )}
                </div>

                {/* Methodology Section 4 */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedMethodology(expandedMethodology === 'validation' ? null : 'validation')}
                    className="w-full flex items-center justify-between p-4 bg-surface-elevated hover:bg-surface-elevated/80 transition-colors"
                  >
                    <span className="font-medium text-text-primary">4. Data Validation & Uncertainty</span>
                    <ChevronDown className={`w-5 h-5 text-text-muted transition-transform ${expandedMethodology === 'validation' ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedMethodology === 'validation' && (
                    <div className="p-4 text-text-secondary text-sm space-y-3">
                      <p>
                        <strong>Cross-Validation:</strong> Our estimates are validated against:
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Brockway et al. (2021) - "Estimation of global final-stage energy-return-on-investment"</li>
                        <li>De Stercke (2014) - "Dynamics of Energy Systems"</li>
                        <li>Ayres & Warr (2009) - "The Economic Growth Engine"</li>
                        <li>IEA Energy Efficiency Indicators</li>
                      </ul>
                      <p>
                        <strong>Uncertainty Ranges:</strong>
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Primary energy data: ±2-5%</li>
                        <li>Conversion efficiencies: ±5-10%</li>
                        <li>Exergy factors: ±10-15%</li>
                        <li>Overall exergy services estimate: ±10-12%</li>
                      </ul>
                      <p>
                        <strong>Methodology References:</strong>
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Sciubba & Wall (2007) - "A brief commented history of exergy"</li>
                        <li>NIST/ATcT thermochemical reference data</li>
                        <li>ISO 50001 energy management standards</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Data Quality & Sources Footer */}
        <div className="card">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Data Quality & Validation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-2">Validation Sources</h4>
              <ul className="space-y-1 text-sm text-text-muted">
                <li>IEA World Energy Outlook 2024</li>
                <li>Brockway et al. (2021)</li>
                <li>RMI Energy Analysis 2024</li>
                <li>NIST/ATcT Reference Data</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-2">Data Quality</h4>
              <ul className="space-y-1 text-sm text-text-muted">
                <li>Fossil fuels: +/-2% accuracy</li>
                <li>Nuclear: +/-3% accuracy</li>
                <li>Renewables: +/-5-10% accuracy</li>
                <li>Overall: +/-10-12% uncertainty</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-2">Methodology</h4>
              <p className="text-sm text-text-muted">
                Three-tier calculation: Primary Energy to Useful Energy (efficiency factors) to
                Exergy Services (quality factors). Based on Second Law thermodynamics.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
