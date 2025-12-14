'use client'

import { AreaChart, Card, Title, Text, TabGroup, TabList, Tab } from '@tremor/react'
import * as React from 'react'

// Sample data - will be replaced with real API data
const generateTimeseriesData = () => {
  const years = Array.from({ length: 60 }, (_, i) => 1965 + i)

  return years.map((year) => {
    // Simulated growth curves for different energy sources
    const yearIndex = year - 1965

    // Fossil fuels: peaked around 2010-2015, slowly declining
    const coal = Math.max(30, 37 + yearIndex * 2.5 - Math.max(0, (yearIndex - 45) * 3))
    const oil = Math.max(50, 62 + yearIndex * 2.2 - Math.max(0, (yearIndex - 50) * 2))
    const gas = 16 + yearIndex * 2.2

    // Clean energy: exponential growth in recent years
    const nuclear = yearIndex > 5 ? Math.min(11, yearIndex * 0.3) : 0
    const hydro = 4 + yearIndex * 0.25
    const wind = yearIndex > 35 ? Math.pow(1.2, yearIndex - 35) : 0
    const solar = yearIndex > 45 ? Math.pow(1.25, yearIndex - 45) : 0
    const biomass = 30 + yearIndex * 0.4
    const geothermal = 0.1 + yearIndex * 0.015

    return {
      year: year.toString(),
      Coal: Math.round(coal * 10) / 10,
      Oil: Math.round(oil * 10) / 10,
      Gas: Math.round(gas * 10) / 10,
      Nuclear: Math.round(nuclear * 10) / 10,
      Hydro: Math.round(hydro * 10) / 10,
      Wind: Math.round(Math.min(12, wind) * 10) / 10,
      Solar: Math.round(Math.min(12, solar) * 10) / 10,
      Biomass: Math.round(biomass * 10) / 10,
      Geothermal: Math.round(geothermal * 10) / 10,
    }
  })
}

const timeseriesData = generateTimeseriesData()

// Get last 20 years for default view
const recentData = timeseriesData.slice(-20)

type ViewMode = 'all' | 'fossil' | 'clean' | 'recent'

const viewModes: { value: ViewMode; label: string }[] = [
  { value: 'recent', label: 'Recent (20yr)' },
  { value: 'all', label: 'All Time' },
  { value: 'fossil', label: 'Fossil Only' },
  { value: 'clean', label: 'Clean Only' },
]

const fossilCategories = ['Coal', 'Oil', 'Gas']
const cleanCategories = ['Nuclear', 'Hydro', 'Wind', 'Solar', 'Biomass', 'Geothermal']
const allCategories = [...fossilCategories, ...cleanCategories]

// Vibrant, distinguishable colors for each energy source
const categoryColors: Record<string, string> = {
  Coal: 'gray',       // Neutral grey for fossil
  Oil: 'orange',      // Warm orange
  Gas: 'sky',         // Light blue/cyan
  Nuclear: 'purple',  // Distinct purple
  Hydro: 'blue',      // Classic blue
  Wind: 'teal',       // Teal green
  Solar: 'yellow',    // Bright yellow
  Biomass: 'lime',    // Bright green
  Geothermal: 'pink', // Pink/rose
}

interface EnergyTimeseriesProps {
  title?: string
  subtitle?: string
  className?: string
}

export function EnergyTimeseries({
  title = 'Global Energy Production',
  subtitle = 'Primary energy by source (Exajoules)',
  className,
}: EnergyTimeseriesProps) {
  const [viewMode, setViewMode] = React.useState<ViewMode>('recent')

  const getData = () => {
    switch (viewMode) {
      case 'all':
        return timeseriesData
      case 'recent':
      default:
        return recentData
    }
  }

  const getCategories = () => {
    switch (viewMode) {
      case 'fossil':
        return fossilCategories
      case 'clean':
        return cleanCategories
      default:
        return allCategories
    }
  }

  const getColors = () => {
    return getCategories().map((cat) => categoryColors[cat])
  }

  return (
    <Card className={className}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <Title className="text-foreground">{title}</Title>
          <Text className="text-foreground-muted">{subtitle}</Text>
        </div>
        <TabGroup
          index={viewModes.findIndex((m) => m.value === viewMode)}
          onIndexChange={(i) => setViewMode(viewModes[i].value)}
        >
          <TabList variant="solid" className="bg-background-surface">
            {viewModes.map((mode) => (
              <Tab key={mode.value}>{mode.label}</Tab>
            ))}
          </TabList>
        </TabGroup>
      </div>

      <AreaChart
        className="h-80 mt-4"
        data={getData()}
        index="year"
        categories={getCategories()}
        colors={getColors()}
        valueFormatter={(value) => `${value.toFixed(1)} EJ`}
        showAnimation
        showLegend
        showGridLines={false}
        curveType="monotone"
      />
    </Card>
  )
}
