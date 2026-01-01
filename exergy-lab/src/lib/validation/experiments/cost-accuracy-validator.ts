/**
 * Cost Accuracy Validator
 *
 * Validates cost estimates using supplier pricing database.
 * Provides confidence intervals and regional adjustments.
 */

import type { Material } from '@/types/experiment-workflow'
import type { ProtocolValidation, CostBreakdown } from '@/types/experiment-workflow'

// ============================================================================
// Pricing Database (MVP - Later integrate Sigma-Aldrich/Fisher API)
// ============================================================================

interface PricingData {
  unitCost: number // Cost per unit
  unit: string // Standardized unit (g, mL, mol)
  source: string // Supplier name
  catalogNumber?: string
  purity?: string
  lastUpdated?: string
}

const PRICING_DATABASE: Record<string, PricingData> = {
  // Perovskite materials
  'Lead iodide': {
    unitCost: 90,
    unit: 'g',
    source: 'Sigma-Aldrich',
    catalogNumber: '211257',
    purity: '99.999%',
  },
  'PbI2': {
    unitCost: 90,
    unit: 'g',
    source: 'Sigma-Aldrich',
    catalogNumber: '211257',
    purity: '99.999%',
  },
  'Methylammonium iodide': {
    unitCost: 150,
    unit: 'g',
    source: 'Sigma-Aldrich',
    catalogNumber: '793450',
    purity: '≥99.5%',
  },
  'MAI': {
    unitCost: 150,
    unit: 'g',
    source: 'Sigma-Aldrich',
    catalogNumber: '793450',
    purity: '≥99.5%',
  },
  'Formamidinium iodide': {
    unitCost: 180,
    unit: 'g',
    source: 'Sigma-Aldrich',
    catalogNumber: '816310',
    purity: '≥99%',
  },
  'FAI': {
    unitCost: 180,
    unit: 'g',
    source: 'Sigma-Aldrich',
    catalogNumber: '816310',
    purity: '≥99%',
  },

  // Solvents
  'DMF': {
    unitCost: 0.3,
    unit: 'mL',
    source: 'Fisher Scientific',
    catalogNumber: 'D119',
    purity: 'ACS grade',
  },
  'DMSO': {
    unitCost: 0.4,
    unit: 'mL',
    source: 'Fisher Scientific',
    catalogNumber: 'D128',
    purity: 'ACS grade',
  },
  'Acetonitrile': {
    unitCost: 0.25,
    unit: 'mL',
    source: 'Fisher Scientific',
    catalogNumber: 'A996',
    purity: 'HPLC grade',
  },
  'Isopropanol': {
    unitCost: 0.1,
    unit: 'mL',
    source: 'Fisher Scientific',
    catalogNumber: 'A461',
    purity: 'ACS grade',
  },
  'Ethanol': {
    unitCost: 0.08,
    unit: 'mL',
    source: 'Fisher Scientific',
    catalogNumber: 'A407',
    purity: 'ACS grade',
  },
  'Chlorobenzene': {
    unitCost: 0.5,
    unit: 'mL',
    source: 'Sigma-Aldrich',
    catalogNumber: '284513',
    purity: '99.8%',
  },
  'Toluene': {
    unitCost: 0.15,
    unit: 'mL',
    source: 'Fisher Scientific',
    catalogNumber: 'T290',
    purity: 'ACS grade',
  },

  // Hole transport materials
  'Spiro-OMeTAD': {
    unitCost: 800,
    unit: 'g',
    source: 'Sigma-Aldrich',
    catalogNumber: '792071',
    purity: '≥99.5%',
  },
  'PTAA': {
    unitCost: 600,
    unit: 'g',
    source: 'Sigma-Aldrich',
    catalogNumber: '702471',
    purity: 'Mw ~15,000',
  },

  // Metal oxides
  'Titanium dioxide': {
    unitCost: 5,
    unit: 'g',
    source: 'Sigma-Aldrich',
    catalogNumber: '634662',
    purity: 'Nanopowder, 21 nm',
  },
  'TiO2': {
    unitCost: 5,
    unit: 'g',
    source: 'Sigma-Aldrich',
    catalogNumber: '634662',
    purity: 'Nanopowder, 21 nm',
  },
  'Tin oxide': {
    unitCost: 8,
    unit: 'g',
    source: 'Sigma-Aldrich',
    catalogNumber: '549657',
    purity: 'Nanopowder',
  },
  'SnO2': {
    unitCost: 8,
    unit: 'g',
    source: 'Sigma-Aldrich',
    catalogNumber: '549657',
    purity: 'Nanopowder',
  },

  // Metals
  'Gold': {
    unitCost: 60000,
    unit: 'g',
    source: 'Sigma-Aldrich',
    catalogNumber: '326542',
    purity: '99.99%',
  },
  'Silver': {
    unitCost: 800,
    unit: 'g',
    source: 'Sigma-Aldrich',
    catalogNumber: '327085',
    purity: '99.99%',
  },
  'Aluminum': {
    unitCost: 50,
    unit: 'g',
    source: 'Alfa Aesar',
    catalogNumber: '43832',
    purity: '99.999%',
  },

  // Substrates
  'ITO glass': {
    unitCost: 15,
    unit: 'piece',
    source: 'Ossila',
    catalogNumber: 'S141',
    purity: '15 Ω/sq, 25×25 mm',
  },
  'FTO glass': {
    unitCost: 12,
    unit: 'piece',
    source: 'Ossila',
    catalogNumber: 'S145',
    purity: '7 Ω/sq, 25×25 mm',
  },

  // Common chemicals
  'Hydrochloric acid': {
    unitCost: 0.05,
    unit: 'mL',
    source: 'Fisher Scientific',
    catalogNumber: 'A144',
    purity: 'ACS grade',
  },
  'Sulfuric acid': {
    unitCost: 0.08,
    unit: 'mL',
    source: 'Fisher Scientific',
    catalogNumber: 'A300',
    purity: 'ACS grade',
  },
  'Nitric acid': {
    unitCost: 0.12,
    unit: 'mL',
    source: 'Fisher Scientific',
    catalogNumber: 'A200',
    purity: 'ACS grade',
  },
  'Sodium hydroxide': {
    unitCost: 0.15,
    unit: 'g',
    source: 'Fisher Scientific',
    catalogNumber: 'S318',
    purity: 'ACS grade',
  },
}

// ============================================================================
// Validation Function
// ============================================================================

export async function validateCostAccuracy(
  materials: Material[]
): Promise<ProtocolValidation['costAccuracy']> {
  const breakdown: CostBreakdown = {
    materials: [],
    subtotalMaterials: 0,
    total: 0,
  }
  const quoteSources = new Set<string>()

  for (const material of materials) {
    const pricing = getMaterialPricing(material)

    if (pricing) {
      breakdown.materials.push({
        name: material.name,
        quantity: `${material.quantity} ${material.unit}`,
        unitCost: pricing.unitCost,
        totalCost: pricing.totalCost,
      })

      breakdown.subtotalMaterials += pricing.totalCost
      quoteSources.add(pricing.source)
    } else {
      // Unknown material - use provided cost or estimate
      const estimatedCost = material.cost || 50 // Default $50 if no cost provided
      breakdown.materials.push({
        name: material.name,
        quantity: `${material.quantity} ${material.unit}`,
        unitCost: estimatedCost,
        totalCost: estimatedCost,
      })

      breakdown.subtotalMaterials += estimatedCost
      quoteSources.add('Estimated')
    }
  }

  breakdown.total = breakdown.subtotalMaterials

  // Calculate 95% confidence interval (±15% for fresh quotes)
  const confidenceInterval: [number, number] = [
    breakdown.total * 0.85,
    breakdown.total * 1.15,
  ]

  return {
    totalCost: breakdown.total,
    confidenceInterval,
    regionalAdjustment: 1.0, // No regional adjustment for MVP
    breakdown,
    quoteSources: Array.from(quoteSources),
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getMaterialPricing(material: Material): {
  unitCost: number
  totalCost: number
  source: string
} | null {
  const pricingData = findPricingData(material.name)

  if (!pricingData) {
    return null
  }

  // Convert quantity to pricing unit
  let quantityInPricingUnit = parseFloat(material.quantity)

  // Handle unit conversions (basic)
  if (material.unit !== pricingData.unit) {
    quantityInPricingUnit = convertUnit(
      quantityInPricingUnit,
      material.unit,
      pricingData.unit
    )
  }

  const totalCost = pricingData.unitCost * quantityInPricingUnit

  return {
    unitCost: pricingData.unitCost,
    totalCost,
    source: pricingData.source,
  }
}

function findPricingData(materialName: string): PricingData | null {
  // Try exact match
  if (PRICING_DATABASE[materialName]) {
    return PRICING_DATABASE[materialName]
  }

  // Try case-insensitive match
  const lowerName = materialName.toLowerCase()
  for (const [key, value] of Object.entries(PRICING_DATABASE)) {
    if (key.toLowerCase() === lowerName) {
      return value
    }
  }

  // Try partial match
  for (const [key, value] of Object.entries(PRICING_DATABASE)) {
    if (
      lowerName.includes(key.toLowerCase()) ||
      key.toLowerCase().includes(lowerName)
    ) {
      return value
    }
  }

  return null
}

function convertUnit(value: number, fromUnit: string, toUnit: string): number {
  // Simple unit conversions (expand as needed)
  const from = fromUnit.toLowerCase()
  const to = toUnit.toLowerCase()

  // Same unit
  if (from === to) return value

  // Volume conversions
  if (from === 'l' && to === 'ml') return value * 1000
  if (from === 'ml' && to === 'l') return value / 1000

  // Mass conversions
  if (from === 'kg' && to === 'g') return value * 1000
  if (from === 'g' && to === 'kg') return value / 1000
  if (from === 'mg' && to === 'g') return value / 1000
  if (from === 'g' && to === 'mg') return value * 1000

  // If no conversion found, return original value
  console.warn(`No conversion from ${fromUnit} to ${toUnit}, using original value`)
  return value
}
