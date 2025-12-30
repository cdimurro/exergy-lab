/**
 * Material Cost Database (v0.0.5)
 *
 * Comprehensive database of material costs for clean energy research.
 * Includes metals, chemicals, semiconductors, and polymers with
 * volatility ratings and regional factors.
 *
 * @see lib/costs/regional-factors.ts - Regional cost adjustments
 */

// ============================================================================
// Types
// ============================================================================

export type MaterialCategory =
  | 'metal'
  | 'rare_earth'
  | 'chemical'
  | 'semiconductor'
  | 'polymer'
  | 'ceramic'
  | 'electrolyte'
  | 'catalyst'
  | 'gas'

export type VolatilityLevel = 'low' | 'medium' | 'high' | 'very_high'

export interface MaterialCost {
  id: string
  name: string
  formula?: string
  category: MaterialCategory
  price: number
  unit: string
  purity?: string
  volatility: VolatilityLevel
  priceDate: string
  source: string
  notes?: string
  alternatives?: string[]
  domains: string[]
}

export interface MaterialPriceHistory {
  materialId: string
  date: string
  price: number
  source: string
}

// ============================================================================
// Material Database
// ============================================================================

/**
 * Comprehensive material cost database for clean energy research
 */
export const MATERIAL_DATABASE: MaterialCost[] = [
  // ----------------------------------------
  // Metals - Common
  // ----------------------------------------
  {
    id: 'aluminum',
    name: 'Aluminum',
    formula: 'Al',
    category: 'metal',
    price: 2.5,
    unit: '$/kg',
    purity: '99.7%',
    volatility: 'medium',
    priceDate: '2024-12',
    source: 'LME',
    domains: ['solar', 'wind', 'battery'],
  },
  {
    id: 'copper',
    name: 'Copper',
    formula: 'Cu',
    category: 'metal',
    price: 8.5,
    unit: '$/kg',
    purity: '99.9%',
    volatility: 'high',
    priceDate: '2024-12',
    source: 'LME',
    domains: ['solar', 'wind', 'battery', 'hydrogen'],
  },
  {
    id: 'steel_structural',
    name: 'Structural Steel',
    category: 'metal',
    price: 0.8,
    unit: '$/kg',
    volatility: 'medium',
    priceDate: '2024-12',
    source: 'Steel Benchmarker',
    domains: ['wind', 'hydrogen'],
  },
  {
    id: 'nickel',
    name: 'Nickel',
    formula: 'Ni',
    category: 'metal',
    price: 16.5,
    unit: '$/kg',
    purity: '99.8%',
    volatility: 'high',
    priceDate: '2024-12',
    source: 'LME',
    domains: ['battery', 'hydrogen'],
  },
  {
    id: 'cobalt',
    name: 'Cobalt',
    formula: 'Co',
    category: 'metal',
    price: 28.0,
    unit: '$/kg',
    purity: '99.8%',
    volatility: 'very_high',
    priceDate: '2024-12',
    source: 'LME, Fastmarkets',
    notes: 'Supply chain concentration in DRC',
    domains: ['battery'],
  },
  {
    id: 'manganese',
    name: 'Manganese',
    formula: 'Mn',
    category: 'metal',
    price: 2.0,
    unit: '$/kg',
    purity: '99.7%',
    volatility: 'medium',
    priceDate: '2024-12',
    source: 'Metal Bulletin',
    domains: ['battery'],
  },

  // ----------------------------------------
  // Metals - Precious
  // ----------------------------------------
  {
    id: 'silver',
    name: 'Silver',
    formula: 'Ag',
    category: 'metal',
    price: 900.0,
    unit: '$/kg',
    purity: '99.99%',
    volatility: 'high',
    priceDate: '2024-12',
    source: 'LBMA',
    domains: ['solar'],
  },
  {
    id: 'platinum',
    name: 'Platinum',
    formula: 'Pt',
    category: 'catalyst',
    price: 31000.0,
    unit: '$/kg',
    purity: '99.95%',
    volatility: 'high',
    priceDate: '2024-12',
    source: 'LPPM',
    domains: ['hydrogen'],
  },
  {
    id: 'iridium',
    name: 'Iridium',
    formula: 'Ir',
    category: 'catalyst',
    price: 140000.0,
    unit: '$/kg',
    purity: '99.9%',
    volatility: 'very_high',
    priceDate: '2024-12',
    source: 'Johnson Matthey',
    notes: 'Critical for PEM electrolyzer anodes',
    domains: ['hydrogen'],
  },

  // ----------------------------------------
  // Rare Earth Elements
  // ----------------------------------------
  {
    id: 'neodymium',
    name: 'Neodymium Oxide',
    formula: 'Nd2O3',
    category: 'rare_earth',
    price: 80.0,
    unit: '$/kg',
    purity: '99%',
    volatility: 'high',
    priceDate: '2024-12',
    source: 'Asian Metal',
    notes: 'Critical for permanent magnets in wind turbines',
    domains: ['wind'],
  },
  {
    id: 'dysprosium',
    name: 'Dysprosium Oxide',
    formula: 'Dy2O3',
    category: 'rare_earth',
    price: 350.0,
    unit: '$/kg',
    purity: '99%',
    volatility: 'very_high',
    priceDate: '2024-12',
    source: 'Asian Metal',
    notes: 'Improves magnet high-temperature performance',
    domains: ['wind'],
  },
  {
    id: 'praseodymium',
    name: 'Praseodymium Oxide',
    formula: 'Pr6O11',
    category: 'rare_earth',
    price: 70.0,
    unit: '$/kg',
    purity: '99%',
    volatility: 'high',
    priceDate: '2024-12',
    source: 'Asian Metal',
    domains: ['wind'],
  },

  // ----------------------------------------
  // Semiconductors
  // ----------------------------------------
  {
    id: 'silicon_solar',
    name: 'Silicon (Solar Grade)',
    formula: 'Si',
    category: 'semiconductor',
    price: 15.0,
    unit: '$/kg',
    purity: '6N (99.9999%)',
    volatility: 'high',
    priceDate: '2024-12',
    source: 'PVInsights',
    domains: ['solar'],
  },
  {
    id: 'silicon_electronic',
    name: 'Silicon (Electronic Grade)',
    formula: 'Si',
    category: 'semiconductor',
    price: 50.0,
    unit: '$/kg',
    purity: '9N (99.9999999%)',
    volatility: 'medium',
    priceDate: '2024-12',
    source: 'Industry estimates',
    domains: ['solar'],
  },
  {
    id: 'gallium',
    name: 'Gallium',
    formula: 'Ga',
    category: 'semiconductor',
    price: 300.0,
    unit: '$/kg',
    purity: '99.99%',
    volatility: 'high',
    priceDate: '2024-12',
    source: 'USGS, Metal Bulletin',
    notes: 'Critical for GaAs and CIGS solar cells',
    domains: ['solar'],
  },
  {
    id: 'indium',
    name: 'Indium',
    formula: 'In',
    category: 'semiconductor',
    price: 250.0,
    unit: '$/kg',
    purity: '99.99%',
    volatility: 'high',
    priceDate: '2024-12',
    source: 'Metal Bulletin',
    notes: 'Critical for ITO and CIGS',
    domains: ['solar'],
  },
  {
    id: 'tellurium',
    name: 'Tellurium',
    formula: 'Te',
    category: 'semiconductor',
    price: 80.0,
    unit: '$/kg',
    purity: '99.99%',
    volatility: 'high',
    priceDate: '2024-12',
    source: 'USGS',
    notes: 'Critical for CdTe solar cells',
    domains: ['solar'],
  },
  {
    id: 'cadmium',
    name: 'Cadmium',
    formula: 'Cd',
    category: 'semiconductor',
    price: 3.0,
    unit: '$/kg',
    purity: '99.99%',
    volatility: 'low',
    priceDate: '2024-12',
    source: 'Metal Bulletin',
    notes: 'Toxic - regulatory restrictions',
    domains: ['solar'],
  },

  // ----------------------------------------
  // Battery Materials
  // ----------------------------------------
  {
    id: 'lithium_carbonate',
    name: 'Lithium Carbonate',
    formula: 'Li2CO3',
    category: 'chemical',
    price: 15.0,
    unit: '$/kg',
    purity: '99.5%',
    volatility: 'very_high',
    priceDate: '2024-12',
    source: 'Fastmarkets, Benchmark Mineral',
    notes: 'Price highly volatile (ranged $10-80/kg in 2022-2024)',
    domains: ['battery'],
  },
  {
    id: 'lithium_hydroxide',
    name: 'Lithium Hydroxide',
    formula: 'LiOH',
    category: 'chemical',
    price: 18.0,
    unit: '$/kg',
    purity: '99.5%',
    volatility: 'very_high',
    priceDate: '2024-12',
    source: 'Fastmarkets',
    notes: 'Preferred for high-nickel cathodes',
    domains: ['battery'],
  },
  {
    id: 'graphite_anode',
    name: 'Graphite (Anode Grade)',
    formula: 'C',
    category: 'chemical',
    price: 12.0,
    unit: '$/kg',
    purity: '99.95%',
    volatility: 'medium',
    priceDate: '2024-12',
    source: 'Benchmark Mineral',
    domains: ['battery'],
  },
  {
    id: 'nmc_811',
    name: 'NMC 811 Cathode Material',
    formula: 'LiNi0.8Mn0.1Co0.1O2',
    category: 'chemical',
    price: 35.0,
    unit: '$/kg',
    volatility: 'high',
    priceDate: '2024-12',
    source: 'Benchmark Mineral',
    domains: ['battery'],
  },
  {
    id: 'lfp_cathode',
    name: 'LFP Cathode Material',
    formula: 'LiFePO4',
    category: 'chemical',
    price: 12.0,
    unit: '$/kg',
    volatility: 'medium',
    priceDate: '2024-12',
    source: 'Benchmark Mineral',
    domains: ['battery'],
  },
  {
    id: 'electrolyte_lipf6',
    name: 'LiPF6 Electrolyte',
    formula: 'LiPF6',
    category: 'electrolyte',
    price: 25.0,
    unit: '$/kg',
    purity: '99.9%',
    volatility: 'medium',
    priceDate: '2024-12',
    source: 'Industry estimates',
    domains: ['battery'],
  },

  // ----------------------------------------
  // Hydrogen Materials
  // ----------------------------------------
  {
    id: 'nafion_membrane',
    name: 'Nafion Membrane',
    category: 'polymer',
    price: 800.0,
    unit: '$/m²',
    volatility: 'low',
    priceDate: '2024-12',
    source: 'Chemours',
    notes: 'Dominant PEM membrane material',
    domains: ['hydrogen'],
  },
  {
    id: 'ptfe',
    name: 'PTFE (Teflon)',
    formula: '(C2F4)n',
    category: 'polymer',
    price: 15.0,
    unit: '$/kg',
    volatility: 'low',
    priceDate: '2024-12',
    source: 'Industry estimates',
    domains: ['hydrogen'],
  },
  {
    id: 'titanium_felt',
    name: 'Titanium Felt (GDL)',
    formula: 'Ti',
    category: 'metal',
    price: 300.0,
    unit: '$/m²',
    volatility: 'medium',
    priceDate: '2024-12',
    source: 'Industry estimates',
    notes: 'Used as gas diffusion layer in PEM electrolyzers',
    domains: ['hydrogen'],
  },
  {
    id: 'zirconia',
    name: 'Yttria-Stabilized Zirconia',
    formula: 'ZrO2-Y2O3',
    category: 'ceramic',
    price: 50.0,
    unit: '$/kg',
    purity: '99.9%',
    volatility: 'low',
    priceDate: '2024-12',
    source: 'Industry estimates',
    notes: 'Electrolyte for SOEC',
    domains: ['hydrogen'],
  },

  // ----------------------------------------
  // Gases
  // ----------------------------------------
  {
    id: 'nitrogen_liquid',
    name: 'Liquid Nitrogen',
    formula: 'N2',
    category: 'gas',
    price: 0.3,
    unit: '$/L',
    purity: '99.99%',
    volatility: 'low',
    priceDate: '2024-12',
    source: 'Air Products, Linde',
    domains: ['solar', 'battery', 'hydrogen'],
  },
  {
    id: 'argon',
    name: 'Argon',
    formula: 'Ar',
    category: 'gas',
    price: 0.5,
    unit: '$/L',
    purity: '99.999%',
    volatility: 'low',
    priceDate: '2024-12',
    source: 'Air Products, Linde',
    domains: ['solar', 'battery'],
  },
  {
    id: 'hydrogen_industrial',
    name: 'Hydrogen (Industrial)',
    formula: 'H2',
    category: 'gas',
    price: 4.0,
    unit: '$/kg',
    purity: '99.9%',
    volatility: 'medium',
    priceDate: '2024-12',
    source: 'Air Products, SMR production',
    domains: ['hydrogen'],
  },

  // ----------------------------------------
  // Perovskite Materials (Solar)
  // ----------------------------------------
  {
    id: 'lead_iodide',
    name: 'Lead Iodide',
    formula: 'PbI2',
    category: 'chemical',
    price: 150.0,
    unit: '$/kg',
    purity: '99.999%',
    volatility: 'medium',
    priceDate: '2024-12',
    source: 'Sigma-Aldrich, specialty suppliers',
    notes: 'Key perovskite precursor',
    domains: ['solar'],
  },
  {
    id: 'mai',
    name: 'Methylammonium Iodide',
    formula: 'CH3NH3I',
    category: 'chemical',
    price: 400.0,
    unit: '$/kg',
    purity: '99.9%',
    volatility: 'medium',
    priceDate: '2024-12',
    source: 'Greatcell Solar, specialty suppliers',
    notes: 'Perovskite organic cation',
    domains: ['solar'],
  },
  {
    id: 'fai',
    name: 'Formamidinium Iodide',
    formula: 'HC(NH2)2I',
    category: 'chemical',
    price: 500.0,
    unit: '$/kg',
    purity: '99.9%',
    volatility: 'medium',
    priceDate: '2024-12',
    source: 'Greatcell Solar, specialty suppliers',
    notes: 'Preferred for high-efficiency perovskites',
    domains: ['solar'],
  },

  // ----------------------------------------
  // Glass and Encapsulation
  // ----------------------------------------
  {
    id: 'solar_glass',
    name: 'Solar Glass (Low-Iron)',
    category: 'ceramic',
    price: 8.0,
    unit: '$/m²',
    volatility: 'low',
    priceDate: '2024-12',
    source: 'AGC, Xinyi Glass',
    notes: '3.2mm tempered, AR coated',
    domains: ['solar'],
  },
  {
    id: 'eva_encapsulant',
    name: 'EVA Encapsulant',
    category: 'polymer',
    price: 1.5,
    unit: '$/m²',
    volatility: 'low',
    priceDate: '2024-12',
    source: 'Industry estimates',
    domains: ['solar'],
  },
  {
    id: 'poe_encapsulant',
    name: 'POE Encapsulant',
    category: 'polymer',
    price: 2.0,
    unit: '$/m²',
    volatility: 'low',
    priceDate: '2024-12',
    source: 'Industry estimates',
    notes: 'Better moisture barrier than EVA',
    domains: ['solar'],
  },

  // ----------------------------------------
  // Carbon Materials
  // ----------------------------------------
  {
    id: 'carbon_fiber',
    name: 'Carbon Fiber',
    formula: 'C',
    category: 'polymer',
    price: 25.0,
    unit: '$/kg',
    volatility: 'medium',
    priceDate: '2024-12',
    source: 'Toray, Hexcel',
    domains: ['wind', 'hydrogen'],
  },
  {
    id: 'carbon_black',
    name: 'Carbon Black (Conductive)',
    formula: 'C',
    category: 'chemical',
    price: 3.0,
    unit: '$/kg',
    volatility: 'low',
    priceDate: '2024-12',
    source: 'Cabot, Orion',
    domains: ['battery'],
  },
  {
    id: 'cnt',
    name: 'Carbon Nanotubes (Multi-Wall)',
    category: 'chemical',
    price: 100.0,
    unit: '$/kg',
    purity: '95%',
    volatility: 'medium',
    priceDate: '2024-12',
    source: 'OCSiAl, Nanocyl',
    notes: 'Price decreasing as production scales',
    domains: ['battery'],
  },
]

// ============================================================================
// Database Access Functions
// ============================================================================

/**
 * Get all materials in the database
 */
export function getAllMaterials(): MaterialCost[] {
  return MATERIAL_DATABASE
}

/**
 * Get material by ID
 */
export function getMaterial(id: string): MaterialCost | undefined {
  return MATERIAL_DATABASE.find((m) => m.id === id)
}

/**
 * Get materials by category
 */
export function getMaterialsByCategory(category: MaterialCategory): MaterialCost[] {
  return MATERIAL_DATABASE.filter((m) => m.category === category)
}

/**
 * Get materials by domain
 */
export function getMaterialsByDomain(domain: string): MaterialCost[] {
  return MATERIAL_DATABASE.filter((m) => m.domains.includes(domain))
}

/**
 * Get materials by volatility level
 */
export function getMaterialsByVolatility(volatility: VolatilityLevel): MaterialCost[] {
  return MATERIAL_DATABASE.filter((m) => m.volatility === volatility)
}

/**
 * Search materials by name or formula
 */
export function searchMaterials(query: string): MaterialCost[] {
  const lowerQuery = query.toLowerCase()
  return MATERIAL_DATABASE.filter(
    (m) =>
      m.name.toLowerCase().includes(lowerQuery) ||
      m.formula?.toLowerCase().includes(lowerQuery) ||
      m.id.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Get high-risk materials (very high volatility)
 */
export function getHighRiskMaterials(): MaterialCost[] {
  return MATERIAL_DATABASE.filter((m) => m.volatility === 'very_high')
}

/**
 * Calculate total material cost for a bill of materials
 */
export function calculateBillOfMaterials(
  items: Array<{ materialId: string; quantity: number }>
): {
  total: number
  breakdown: Array<{
    material: MaterialCost
    quantity: number
    cost: number
  }>
  warnings: string[]
} {
  const breakdown: Array<{
    material: MaterialCost
    quantity: number
    cost: number
  }> = []
  const warnings: string[] = []
  let total = 0

  for (const item of items) {
    const material = getMaterial(item.materialId)
    if (!material) {
      warnings.push(`Material not found: ${item.materialId}`)
      continue
    }

    const cost = material.price * item.quantity
    total += cost

    breakdown.push({
      material,
      quantity: item.quantity,
      cost,
    })

    if (material.volatility === 'very_high') {
      warnings.push(
        `${material.name} has very high price volatility - budget accordingly`
      )
    }
  }

  return { total, breakdown, warnings }
}

/**
 * Get material price statistics
 */
export function getMaterialStatistics(): {
  totalMaterials: number
  byCategory: Record<string, number>
  byVolatility: Record<string, number>
  byDomain: Record<string, number>
  averagePrices: Record<string, number>
} {
  const stats = {
    totalMaterials: MATERIAL_DATABASE.length,
    byCategory: {} as Record<string, number>,
    byVolatility: {} as Record<string, number>,
    byDomain: {} as Record<string, number>,
    averagePrices: {} as Record<string, number>,
  }

  const categoryTotals: Record<string, { sum: number; count: number }> = {}

  for (const material of MATERIAL_DATABASE) {
    // Count by category
    stats.byCategory[material.category] =
      (stats.byCategory[material.category] || 0) + 1

    // Count by volatility
    stats.byVolatility[material.volatility] =
      (stats.byVolatility[material.volatility] || 0) + 1

    // Count by domain
    for (const domain of material.domains) {
      stats.byDomain[domain] = (stats.byDomain[domain] || 0) + 1
    }

    // Calculate average prices by category
    if (!categoryTotals[material.category]) {
      categoryTotals[material.category] = { sum: 0, count: 0 }
    }
    categoryTotals[material.category].sum += material.price
    categoryTotals[material.category].count += 1
  }

  for (const [category, totals] of Object.entries(categoryTotals)) {
    stats.averagePrices[category] = totals.sum / totals.count
  }

  return stats
}

/**
 * Format material price with unit
 */
export function formatMaterialPrice(material: MaterialCost): string {
  return `${material.price.toFixed(2)} ${material.unit}`
}

/**
 * Get material alternatives if any
 */
export function getMaterialAlternatives(id: string): MaterialCost[] {
  const material = getMaterial(id)
  if (!material?.alternatives) return []

  return material.alternatives
    .map((altId) => getMaterial(altId))
    .filter((m): m is MaterialCost => m !== undefined)
}

export default MATERIAL_DATABASE
