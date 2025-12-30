/**
 * Regional Cost Factors (v0.0.5)
 *
 * Regional cost adjustments for materials, labor, and energy.
 * Enables accurate cost estimation across different locations.
 *
 * @see lib/costs/material-database.ts - Material costs
 * @see lib/costs/lab-time-estimator.ts - Lab time estimation
 */

// ============================================================================
// Types
// ============================================================================

export interface RegionalCostFactors {
  regionId: string
  name: string
  country: string
  laborMultiplier: number
  energyMultiplier: number
  materialMultiplier: number
  facilityMultiplier: number
  currency: string
  currencySymbol: string
  exchangeRate: number // To USD
  notes?: string
}

export interface RegionalLaborRates {
  undergraduate: number // $/hour
  graduate: number
  postdoc: number
  technician: number
  seniorResearcher: number
  principalInvestigator: number
}

export interface RegionalEnergyPrices {
  electricity: number // $/kWh
  naturalGas: number // $/MMBtu
  industrialElectricity: number // $/kWh (bulk)
}

export interface FullRegionalCosts {
  factors: RegionalCostFactors
  laborRates: RegionalLaborRates
  energyPrices: RegionalEnergyPrices
}

// ============================================================================
// Regional Data
// ============================================================================

/**
 * Base US rates (reference point)
 */
const US_BASE_LABOR_RATES: RegionalLaborRates = {
  undergraduate: 18,
  graduate: 30,
  postdoc: 45,
  technician: 35,
  seniorResearcher: 65,
  principalInvestigator: 100,
}

const US_BASE_ENERGY_PRICES: RegionalEnergyPrices = {
  electricity: 0.12,
  naturalGas: 3.0,
  industrialElectricity: 0.08,
}

/**
 * Regional cost factor database
 */
export const REGIONAL_FACTORS: Record<string, RegionalCostFactors> = {
  // United States
  'us-california': {
    regionId: 'us-california',
    name: 'California, USA',
    country: 'USA',
    laborMultiplier: 1.4,
    energyMultiplier: 1.5,
    materialMultiplier: 1.0,
    facilityMultiplier: 1.6,
    currency: 'USD',
    currencySymbol: '$',
    exchangeRate: 1.0,
    notes: 'High cost of living, elevated energy prices',
  },
  'us-texas': {
    regionId: 'us-texas',
    name: 'Texas, USA',
    country: 'USA',
    laborMultiplier: 0.9,
    energyMultiplier: 0.7,
    materialMultiplier: 0.95,
    facilityMultiplier: 0.8,
    currency: 'USD',
    currencySymbol: '$',
    exchangeRate: 1.0,
    notes: 'Low energy costs, competitive labor market',
  },
  'us-massachusetts': {
    regionId: 'us-massachusetts',
    name: 'Massachusetts, USA',
    country: 'USA',
    laborMultiplier: 1.3,
    energyMultiplier: 1.3,
    materialMultiplier: 1.05,
    facilityMultiplier: 1.4,
    currency: 'USD',
    currencySymbol: '$',
    exchangeRate: 1.0,
    notes: 'Strong research ecosystem, higher costs',
  },
  'us-colorado': {
    regionId: 'us-colorado',
    name: 'Colorado, USA',
    country: 'USA',
    laborMultiplier: 1.1,
    energyMultiplier: 0.85,
    materialMultiplier: 1.0,
    facilityMultiplier: 1.0,
    currency: 'USD',
    currencySymbol: '$',
    exchangeRate: 1.0,
    notes: 'NREL location, strong clean energy focus',
  },

  // Europe
  'eu-germany': {
    regionId: 'eu-germany',
    name: 'Germany',
    country: 'Germany',
    laborMultiplier: 1.3,
    energyMultiplier: 2.0,
    materialMultiplier: 1.1,
    facilityMultiplier: 1.2,
    currency: 'EUR',
    currencySymbol: '€',
    exchangeRate: 0.92,
    notes: 'High energy costs, strong engineering base',
  },
  'eu-netherlands': {
    regionId: 'eu-netherlands',
    name: 'Netherlands',
    country: 'Netherlands',
    laborMultiplier: 1.25,
    energyMultiplier: 1.6,
    materialMultiplier: 1.05,
    facilityMultiplier: 1.3,
    currency: 'EUR',
    currencySymbol: '€',
    exchangeRate: 0.92,
    notes: 'Strong solar and offshore wind industry',
  },
  'eu-uk': {
    regionId: 'eu-uk',
    name: 'United Kingdom',
    country: 'UK',
    laborMultiplier: 1.2,
    energyMultiplier: 1.4,
    materialMultiplier: 1.1,
    facilityMultiplier: 1.3,
    currency: 'GBP',
    currencySymbol: '£',
    exchangeRate: 0.79,
    notes: 'Strong research universities, offshore wind leader',
  },
  'eu-france': {
    regionId: 'eu-france',
    name: 'France',
    country: 'France',
    laborMultiplier: 1.15,
    energyMultiplier: 0.9,
    materialMultiplier: 1.0,
    facilityMultiplier: 1.1,
    currency: 'EUR',
    currencySymbol: '€',
    exchangeRate: 0.92,
    notes: 'Nuclear baseload provides low electricity costs',
  },
  'eu-spain': {
    regionId: 'eu-spain',
    name: 'Spain',
    country: 'Spain',
    laborMultiplier: 0.85,
    energyMultiplier: 1.1,
    materialMultiplier: 0.95,
    facilityMultiplier: 0.9,
    currency: 'EUR',
    currencySymbol: '€',
    exchangeRate: 0.92,
    notes: 'Growing solar manufacturing, competitive costs',
  },

  // Asia
  'asia-china': {
    regionId: 'asia-china',
    name: 'China',
    country: 'China',
    laborMultiplier: 0.4,
    energyMultiplier: 0.6,
    materialMultiplier: 0.8,
    facilityMultiplier: 0.5,
    currency: 'CNY',
    currencySymbol: '¥',
    exchangeRate: 7.1,
    notes: 'Dominant solar/battery supply chain, lowest manufacturing costs',
  },
  'asia-japan': {
    regionId: 'asia-japan',
    name: 'Japan',
    country: 'Japan',
    laborMultiplier: 1.1,
    energyMultiplier: 1.4,
    materialMultiplier: 1.0,
    facilityMultiplier: 1.3,
    currency: 'JPY',
    currencySymbol: '¥',
    exchangeRate: 149,
    notes: 'High precision manufacturing, elevated energy costs',
  },
  'asia-korea': {
    regionId: 'asia-korea',
    name: 'South Korea',
    country: 'South Korea',
    laborMultiplier: 0.95,
    energyMultiplier: 1.0,
    materialMultiplier: 0.95,
    facilityMultiplier: 1.0,
    currency: 'KRW',
    currencySymbol: '₩',
    exchangeRate: 1300,
    notes: 'Strong battery manufacturing, semiconductor expertise',
  },
  'asia-india': {
    regionId: 'asia-india',
    name: 'India',
    country: 'India',
    laborMultiplier: 0.25,
    energyMultiplier: 0.7,
    materialMultiplier: 0.85,
    facilityMultiplier: 0.4,
    currency: 'INR',
    currencySymbol: '₹',
    exchangeRate: 83,
    notes: 'Low labor costs, growing solar manufacturing',
  },
  'asia-singapore': {
    regionId: 'asia-singapore',
    name: 'Singapore',
    country: 'Singapore',
    laborMultiplier: 1.1,
    energyMultiplier: 1.2,
    materialMultiplier: 1.05,
    facilityMultiplier: 1.5,
    currency: 'SGD',
    currencySymbol: 'S$',
    exchangeRate: 1.34,
    notes: 'High facility costs, excellent research infrastructure',
  },

  // Other
  'aus-australia': {
    regionId: 'aus-australia',
    name: 'Australia',
    country: 'Australia',
    laborMultiplier: 1.3,
    energyMultiplier: 0.9,
    materialMultiplier: 1.15,
    facilityMultiplier: 1.2,
    currency: 'AUD',
    currencySymbol: 'A$',
    exchangeRate: 1.54,
    notes: 'Strong solar irradiance, mining resources',
  },
  'me-saudi': {
    regionId: 'me-saudi',
    name: 'Saudi Arabia',
    country: 'Saudi Arabia',
    laborMultiplier: 0.8,
    energyMultiplier: 0.3,
    materialMultiplier: 1.1,
    facilityMultiplier: 1.0,
    currency: 'SAR',
    currencySymbol: 'SR',
    exchangeRate: 3.75,
    notes: 'Very low energy costs, investing heavily in renewables',
  },
  'me-uae': {
    regionId: 'me-uae',
    name: 'United Arab Emirates',
    country: 'UAE',
    laborMultiplier: 0.7,
    energyMultiplier: 0.4,
    materialMultiplier: 1.05,
    facilityMultiplier: 1.1,
    currency: 'AED',
    currencySymbol: 'AED',
    exchangeRate: 3.67,
    notes: 'Low energy, growing clean energy investments',
  },
}

// ============================================================================
// Functions
// ============================================================================

/**
 * Get regional cost factors by ID
 */
export function getRegionalFactors(regionId: string): RegionalCostFactors | undefined {
  return REGIONAL_FACTORS[regionId]
}

/**
 * Get all available regions
 */
export function getAllRegions(): RegionalCostFactors[] {
  return Object.values(REGIONAL_FACTORS)
}

/**
 * Get regions by country
 */
export function getRegionsByCountry(country: string): RegionalCostFactors[] {
  return Object.values(REGIONAL_FACTORS).filter(
    (r) => r.country.toLowerCase() === country.toLowerCase()
  )
}

/**
 * Calculate regional labor rates based on multipliers
 */
export function getRegionalLaborRates(regionId: string): RegionalLaborRates | undefined {
  const factors = getRegionalFactors(regionId)
  if (!factors) return undefined

  const multiplier = factors.laborMultiplier
  return {
    undergraduate: US_BASE_LABOR_RATES.undergraduate * multiplier,
    graduate: US_BASE_LABOR_RATES.graduate * multiplier,
    postdoc: US_BASE_LABOR_RATES.postdoc * multiplier,
    technician: US_BASE_LABOR_RATES.technician * multiplier,
    seniorResearcher: US_BASE_LABOR_RATES.seniorResearcher * multiplier,
    principalInvestigator: US_BASE_LABOR_RATES.principalInvestigator * multiplier,
  }
}

/**
 * Calculate regional energy prices based on multipliers
 */
export function getRegionalEnergyPrices(regionId: string): RegionalEnergyPrices | undefined {
  const factors = getRegionalFactors(regionId)
  if (!factors) return undefined

  const multiplier = factors.energyMultiplier
  return {
    electricity: US_BASE_ENERGY_PRICES.electricity * multiplier,
    naturalGas: US_BASE_ENERGY_PRICES.naturalGas * multiplier,
    industrialElectricity: US_BASE_ENERGY_PRICES.industrialElectricity * multiplier,
  }
}

/**
 * Get full regional costs
 */
export function getFullRegionalCosts(regionId: string): FullRegionalCosts | undefined {
  const factors = getRegionalFactors(regionId)
  const laborRates = getRegionalLaborRates(regionId)
  const energyPrices = getRegionalEnergyPrices(regionId)

  if (!factors || !laborRates || !energyPrices) return undefined

  return { factors, laborRates, energyPrices }
}

/**
 * Adjust a base cost for a specific region
 */
export function adjustCostForRegion(
  baseCostUSD: number,
  regionId: string,
  costType: 'labor' | 'energy' | 'material' | 'facility'
): number {
  const factors = getRegionalFactors(regionId)
  if (!factors) return baseCostUSD

  switch (costType) {
    case 'labor':
      return baseCostUSD * factors.laborMultiplier
    case 'energy':
      return baseCostUSD * factors.energyMultiplier
    case 'material':
      return baseCostUSD * factors.materialMultiplier
    case 'facility':
      return baseCostUSD * factors.facilityMultiplier
    default:
      return baseCostUSD
  }
}

/**
 * Convert USD to local currency
 */
export function convertToLocalCurrency(
  amountUSD: number,
  regionId: string
): { amount: number; currency: string; formatted: string } | undefined {
  const factors = getRegionalFactors(regionId)
  if (!factors) return undefined

  const localAmount = amountUSD * factors.exchangeRate
  return {
    amount: localAmount,
    currency: factors.currency,
    formatted: `${factors.currencySymbol}${localAmount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
  }
}

/**
 * Compare costs across regions
 */
export function compareCostsAcrossRegions(
  baseCostUSD: number,
  costType: 'labor' | 'energy' | 'material' | 'facility',
  regionIds?: string[]
): Array<{
  region: RegionalCostFactors
  adjustedCostUSD: number
  localCurrency: { amount: number; formatted: string }
  percentDifference: number
}> {
  const regions = regionIds
    ? regionIds.map((id) => getRegionalFactors(id)).filter((r): r is RegionalCostFactors => !!r)
    : getAllRegions()

  return regions
    .map((region) => {
      const adjustedCostUSD = adjustCostForRegion(baseCostUSD, region.regionId, costType)
      const local = convertToLocalCurrency(adjustedCostUSD, region.regionId)

      return {
        region,
        adjustedCostUSD,
        localCurrency: {
          amount: local?.amount ?? adjustedCostUSD,
          formatted: local?.formatted ?? `$${adjustedCostUSD.toFixed(2)}`,
        },
        percentDifference: ((adjustedCostUSD - baseCostUSD) / baseCostUSD) * 100,
      }
    })
    .sort((a, b) => a.adjustedCostUSD - b.adjustedCostUSD)
}

/**
 * Find lowest cost region for a specific cost type
 */
export function findLowestCostRegion(
  costType: 'labor' | 'energy' | 'material' | 'facility'
): RegionalCostFactors {
  const regions = getAllRegions()
  const multiplierKey = `${costType}Multiplier` as keyof RegionalCostFactors

  return regions.reduce((lowest, region) => {
    const currentMultiplier = region[multiplierKey] as number
    const lowestMultiplier = lowest[multiplierKey] as number
    return currentMultiplier < lowestMultiplier ? region : lowest
  })
}

/**
 * Calculate total project cost with regional adjustments
 */
export function calculateRegionalProjectCost(
  regionId: string,
  costs: {
    labor: number
    energy: number
    materials: number
    facility: number
  }
): {
  totalUSD: number
  breakdown: Record<string, number>
  localCurrency?: { total: number; formatted: string }
} {
  const factors = getRegionalFactors(regionId)

  const breakdown = {
    labor: costs.labor * (factors?.laborMultiplier ?? 1),
    energy: costs.energy * (factors?.energyMultiplier ?? 1),
    materials: costs.materials * (factors?.materialMultiplier ?? 1),
    facility: costs.facility * (factors?.facilityMultiplier ?? 1),
  }

  const totalUSD = breakdown.labor + breakdown.energy + breakdown.materials + breakdown.facility

  const local = factors ? convertToLocalCurrency(totalUSD, regionId) : undefined

  return {
    totalUSD,
    breakdown,
    localCurrency: local
      ? { total: local.amount, formatted: local.formatted }
      : undefined,
  }
}

/**
 * Get regional competitiveness ranking
 */
export function getCompetitivenessRanking(): Array<{
  region: RegionalCostFactors
  overallMultiplier: number
  rank: number
}> {
  const regions = getAllRegions()

  const rankings = regions
    .map((region) => {
      // Weighted average of multipliers (labor is most important for R&D)
      const overallMultiplier =
        region.laborMultiplier * 0.4 +
        region.energyMultiplier * 0.2 +
        region.materialMultiplier * 0.2 +
        region.facilityMultiplier * 0.2

      return { region, overallMultiplier, rank: 0 }
    })
    .sort((a, b) => a.overallMultiplier - b.overallMultiplier)

  // Assign ranks
  rankings.forEach((item, index) => {
    item.rank = index + 1
  })

  return rankings
}

export default {
  REGIONAL_FACTORS,
  getRegionalFactors,
  getAllRegions,
  getRegionalLaborRates,
  getRegionalEnergyPrices,
  getFullRegionalCosts,
  adjustCostForRegion,
  convertToLocalCurrency,
  compareCostsAcrossRegions,
  findLowestCostRegion,
  calculateRegionalProjectCost,
  getCompetitivenessRanking,
}
