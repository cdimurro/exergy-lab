import type {
  AppliedExergyTimeseries,
  YearlyExergyData,
  EnergyTier,
  ChartDataPoint,
  ThreeTierComparison,
} from '@/types/exergy'
import { SOURCE_EXERGY_FACTORS, EFFICIENCY_FACTORS } from '@/types/exergy'

// Cache for loaded data
let cachedTimeseries: AppliedExergyTimeseries | null = null

/**
 * Load the applied exergy timeseries data
 */
export async function loadAppliedExergyTimeseries(): Promise<AppliedExergyTimeseries> {
  if (cachedTimeseries) return cachedTimeseries

  const response = await fetch('/data/applied_exergy_timeseries.json')
  if (!response.ok) {
    throw new Error(`Failed to load exergy data: ${response.statusText}`)
  }
  cachedTimeseries = await response.json()
  return cachedTimeseries!
}

/**
 * Transform applied exergy data for chart display based on selected tier
 */
export function transformExergyDataForChart(
  data: YearlyExergyData[],
  tier: EnergyTier
): ChartDataPoint[] {
  return data.map((yearData) => {
    const sources = yearData.sources_services_ej

    if (tier === 'applied') {
      // Use real applied exergy values directly
      return {
        year: yearData.year.toString(),
        Coal: Math.round(sources.coal * 10) / 10,
        Oil: Math.round(sources.oil * 10) / 10,
        'Natural Gas': Math.round(sources.gas * 10) / 10,
        Nuclear: Math.round(sources.nuclear * 10) / 10,
        Hydro: Math.round(sources.hydro * 10) / 10,
        Wind: Math.round(sources.wind * 100) / 100,
        Solar: Math.round(sources.solar * 100) / 100,
        Biomass: Math.round(sources.biomass * 10) / 10,
        Geothermal: Math.round(sources.geothermal * 100) / 100,
        'Other Renewables': 0.01, // Minimal placeholder
      }
    } else if (tier === 'useful') {
      // Back-calculate Useful Energy from Applied Exergy
      // Useful = Applied / Weighted_Exergy_Factor
      return {
        year: yearData.year.toString(),
        Coal: Math.round((sources.coal / SOURCE_EXERGY_FACTORS.coal) * 10) / 10,
        Oil: Math.round((sources.oil / SOURCE_EXERGY_FACTORS.oil) * 10) / 10,
        'Natural Gas': Math.round((sources.gas / SOURCE_EXERGY_FACTORS.gas) * 10) / 10,
        Nuclear: Math.round((sources.nuclear / SOURCE_EXERGY_FACTORS.nuclear) * 10) / 10,
        Hydro: Math.round((sources.hydro / SOURCE_EXERGY_FACTORS.hydro) * 10) / 10,
        Wind: Math.round((sources.wind / SOURCE_EXERGY_FACTORS.wind) * 100) / 100,
        Solar: Math.round((sources.solar / SOURCE_EXERGY_FACTORS.solar) * 100) / 100,
        Biomass: Math.round((sources.biomass / SOURCE_EXERGY_FACTORS.biomass) * 10) / 10,
        Geothermal: Math.round((sources.geothermal / SOURCE_EXERGY_FACTORS.geothermal) * 100) / 100,
        'Other Renewables': 0.02,
      }
    } else {
      // Primary Energy = Applied / (Efficiency × Exergy_Factor)
      return {
        year: yearData.year.toString(),
        Coal: Math.round((sources.coal / (EFFICIENCY_FACTORS.coal * SOURCE_EXERGY_FACTORS.coal)) * 10) / 10,
        Oil: Math.round((sources.oil / (EFFICIENCY_FACTORS.oil * SOURCE_EXERGY_FACTORS.oil)) * 10) / 10,
        'Natural Gas': Math.round((sources.gas / (EFFICIENCY_FACTORS.gas * SOURCE_EXERGY_FACTORS.gas)) * 10) / 10,
        Nuclear: Math.round((sources.nuclear / (EFFICIENCY_FACTORS.nuclear * SOURCE_EXERGY_FACTORS.nuclear)) * 10) / 10,
        Hydro: Math.round((sources.hydro / (EFFICIENCY_FACTORS.hydro * SOURCE_EXERGY_FACTORS.hydro)) * 10) / 10,
        Wind: Math.round((sources.wind / (EFFICIENCY_FACTORS.wind * SOURCE_EXERGY_FACTORS.wind)) * 100) / 100,
        Solar: Math.round((sources.solar / (EFFICIENCY_FACTORS.solar * SOURCE_EXERGY_FACTORS.solar)) * 100) / 100,
        Biomass: Math.round((sources.biomass / (EFFICIENCY_FACTORS.biomass * SOURCE_EXERGY_FACTORS.biomass)) * 10) / 10,
        Geothermal: Math.round((sources.geothermal / (EFFICIENCY_FACTORS.geothermal * SOURCE_EXERGY_FACTORS.geothermal)) * 100) / 100,
        'Other Renewables': 0.05,
      }
    }
  })
}

/**
 * Get fossil vs clean aggregate data for a given tier
 */
export function getFossilVsCleanData(
  data: YearlyExergyData[],
  tier: EnergyTier
): ChartDataPoint[] {
  const chartData = transformExergyDataForChart(data, tier)

  return chartData.map((d) => {
    const fossil =
      (d.Coal as number) + (d.Oil as number) + (d['Natural Gas'] as number)
    const clean =
      (d.Nuclear as number) +
      (d.Hydro as number) +
      (d.Wind as number) +
      (d.Solar as number) +
      (d.Biomass as number) +
      (d.Geothermal as number) +
      (d['Other Renewables'] as number)

    return {
      year: d.year,
      'Fossil Fuels': Math.round(fossil * 10) / 10,
      'Clean Energy': Math.round(clean * 10) / 10,
    }
  })
}

/**
 * Calculate relative (percentage) data
 */
export function getRelativeData(chartData: ChartDataPoint[]): ChartDataPoint[] {
  return chartData.map((d) => {
    const total = Object.entries(d)
      .filter(([key]) => key !== 'year')
      .reduce((sum, [, val]) => sum + (val as number), 0)

    const result: ChartDataPoint = { year: d.year }
    for (const [key, val] of Object.entries(d)) {
      if (key !== 'year') {
        result[key] = total > 0 ? Math.round(((val as number) / total) * 1000) / 10 : 0
      }
    }
    return result
  })
}

/**
 * Calculate annual change data
 */
export function getAnnualChangeData(chartData: ChartDataPoint[]): ChartDataPoint[] {
  return chartData.slice(1).map((current, i) => {
    const prev = chartData[i]
    const result: ChartDataPoint = { year: current.year }

    for (const [key, val] of Object.entries(current)) {
      if (key !== 'year') {
        const change = (val as number) - (prev[key] as number)
        result[key] = Math.round(change * 100) / 100
      }
    }
    return result
  })
}

/**
 * Get three-tier comparison for a specific year
 */
export function getThreeTierComparison(
  data: YearlyExergyData[],
  year: number
): ThreeTierComparison | null {
  const yearData = data.find((d) => d.year === year)
  if (!yearData) return null

  const appliedData = transformExergyDataForChart([yearData], 'applied')[0]
  const usefulData = transformExergyDataForChart([yearData], 'useful')[0]
  const primaryData = transformExergyDataForChart([yearData], 'primary')[0]

  const sumValues = (d: ChartDataPoint): number => {
    return Object.entries(d)
      .filter(([key]) => key !== 'year')
      .reduce((sum, [, val]) => sum + (val as number), 0)
  }

  const primary = sumValues(primaryData)
  const useful = sumValues(usefulData)
  const applied = sumValues(appliedData)

  return {
    year: year.toString(),
    primary: Math.round(primary * 10) / 10,
    useful: Math.round(useful * 10) / 10,
    applied: Math.round(applied * 10) / 10,
    efficiency: Math.round((applied / primary) * 1000) / 10,
  }
}

/**
 * Get tier label for display
 */
export function getTierLabel(tier: EnergyTier): string {
  switch (tier) {
    case 'primary':
      return 'Primary Energy'
    case 'useful':
      return 'Useful Energy'
    case 'applied':
      return 'Applied Exergy'
  }
}

/**
 * Get tier description for tooltips
 */
export function getTierDescription(tier: EnergyTier): string {
  switch (tier) {
    case 'primary':
      return 'Raw energy input before conversion losses'
    case 'useful':
      return 'Energy after conversion efficiency applied'
    case 'applied':
      return 'Thermodynamic work potential (exergy-weighted)'
  }
}
