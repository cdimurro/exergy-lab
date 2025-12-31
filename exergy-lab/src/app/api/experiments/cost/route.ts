/**
 * Experiment Cost Estimation API Route
 *
 * Estimates costs for experiment protocols including:
 * - Materials and consumables
 * - Equipment time
 * - Labor costs
 * - Regional adjustments
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export interface Material {
  name: string
  quantity: number
  unit: string
  category?: 'chemical' | 'consumable' | 'equipment' | 'substrate' | 'other'
  purity?: string
}

export interface CostRequest {
  domain: string
  materials: Material[]
  equipment?: string[]
  laborHours?: number
  region?: string
  currency?: 'USD' | 'EUR' | 'GBP' | 'CNY'
}

export interface MaterialCost {
  name: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
  priceSource: 'database' | 'estimated'
  volatility: 'low' | 'medium' | 'high'
}

export interface EquipmentCost {
  name: string
  hourlyRate: number
  estimatedHours: number
  totalCost: number
}

export interface CostBreakdown {
  materials: {
    items: MaterialCost[]
    subtotal: number
    uncertainty: number
  }
  equipment: {
    items: EquipmentCost[]
    subtotal: number
  }
  labor: {
    hours: number
    hourlyRate: number
    subtotal: number
  }
  overhead: {
    percentage: number
    amount: number
  }
  regional: {
    region: string
    factor: number
    adjustment: number
  }
  total: {
    base: number
    adjusted: number
    uncertainty: number
    range: [number, number]
  }
  recommendations: string[]
}

// Material price database (simplified)
const MATERIAL_PRICES: Record<string, { price: number; unit: string; volatility: 'low' | 'medium' | 'high' }> = {
  // Perovskite materials
  'lead iodide': { price: 85, unit: 'g', volatility: 'medium' },
  'pbi2': { price: 85, unit: 'g', volatility: 'medium' },
  'methylammonium iodide': { price: 150, unit: 'g', volatility: 'medium' },
  'mai': { price: 150, unit: 'g', volatility: 'medium' },
  'formamidinium iodide': { price: 180, unit: 'g', volatility: 'medium' },
  'fai': { price: 180, unit: 'g', volatility: 'medium' },
  'cesium iodide': { price: 120, unit: 'g', volatility: 'low' },
  'csi': { price: 120, unit: 'g', volatility: 'low' },

  // Solvents
  'dmf': { price: 0.15, unit: 'mL', volatility: 'low' },
  'dimethylformamide': { price: 0.15, unit: 'mL', volatility: 'low' },
  'dmso': { price: 0.12, unit: 'mL', volatility: 'low' },
  'dimethyl sulfoxide': { price: 0.12, unit: 'mL', volatility: 'low' },
  'chlorobenzene': { price: 0.08, unit: 'mL', volatility: 'low' },
  'isopropanol': { price: 0.05, unit: 'mL', volatility: 'low' },
  'ethanol': { price: 0.04, unit: 'mL', volatility: 'low' },
  'acetone': { price: 0.03, unit: 'mL', volatility: 'low' },

  // Substrates
  'ito glass': { price: 8.5, unit: 'piece', volatility: 'low' },
  'fto glass': { price: 6.0, unit: 'piece', volatility: 'low' },
  'silicon wafer': { price: 12.0, unit: 'piece', volatility: 'medium' },

  // Transport layers
  'spiro-ometad': { price: 450, unit: 'g', volatility: 'high' },
  'tio2': { price: 25, unit: 'g', volatility: 'low' },
  'titanium dioxide': { price: 25, unit: 'g', volatility: 'low' },
  'zno': { price: 20, unit: 'g', volatility: 'low' },
  'zinc oxide': { price: 20, unit: 'g', volatility: 'low' },
  'pedot:pss': { price: 180, unit: 'mL', volatility: 'medium' },

  // Battery materials
  'lithium carbonate': { price: 0.025, unit: 'g', volatility: 'high' },
  'cobalt oxide': { price: 0.045, unit: 'g', volatility: 'high' },
  'graphite': { price: 0.012, unit: 'g', volatility: 'medium' },
  'nmp': { price: 0.08, unit: 'mL', volatility: 'low' },
  'pvdf': { price: 0.15, unit: 'g', volatility: 'low' },

  // Catalysts
  'platinum': { price: 35000, unit: 'g', volatility: 'high' },
  'iridium oxide': { price: 28000, unit: 'g', volatility: 'high' },
  'nickel foam': { price: 0.50, unit: 'cm2', volatility: 'low' },
  'carbon cloth': { price: 0.15, unit: 'cm2', volatility: 'low' },
  'nafion': { price: 850, unit: 'mL', volatility: 'medium' },

  // Gases
  'nitrogen': { price: 0.02, unit: 'L', volatility: 'low' },
  'argon': { price: 0.05, unit: 'L', volatility: 'low' },
  'hydrogen': { price: 0.08, unit: 'L', volatility: 'medium' },
}

// Equipment hourly rates
const EQUIPMENT_RATES: Record<string, number> = {
  'spin coater': 15,
  'thermal evaporator': 50,
  'e-beam evaporator': 80,
  'sputtering system': 60,
  'glovebox': 25,
  'solar simulator': 40,
  'electrochemical workstation': 30,
  'potentiostat': 25,
  'xrd': 75,
  'sem': 100,
  'tem': 150,
  'afm': 80,
  'uv-vis spectrometer': 20,
  'ftir': 35,
  'raman': 60,
  'profilometer': 25,
  'hotplate': 5,
  'furnace': 15,
  'tube furnace': 20,
  'ultrasonic bath': 8,
  'centrifuge': 10,
}

// Regional cost factors
const REGIONAL_FACTORS: Record<string, number> = {
  'us-california': 1.40,
  'us-northeast': 1.25,
  'us-midwest': 1.00,
  'us-south': 0.95,
  'us-texas': 0.90,
  'eu-germany': 1.35,
  'eu-uk': 1.30,
  'eu-france': 1.25,
  'eu-spain': 1.05,
  'asia-japan': 1.30,
  'asia-korea': 1.15,
  'asia-china': 0.60,
  'asia-india': 0.45,
  'default': 1.00,
}

// Labor rates by region ($/hr)
const LABOR_RATES: Record<string, number> = {
  'us-california': 55,
  'us-northeast': 50,
  'us-midwest': 40,
  'us-south': 38,
  'us-texas': 42,
  'eu-germany': 48,
  'eu-uk': 45,
  'eu-france': 42,
  'eu-spain': 32,
  'asia-japan': 45,
  'asia-korea': 35,
  'asia-china': 18,
  'asia-india': 12,
  'default': 40,
}

/**
 * POST /api/experiments/cost
 * Estimate experiment costs
 */
export async function POST(request: NextRequest) {
  try {
    const req = (await request.json()) as CostRequest

    if (!req.materials || req.materials.length === 0) {
      return NextResponse.json(
        { error: 'At least one material is required' },
        { status: 400 }
      )
    }

    const region = req.region || 'default'
    const regionalFactor = REGIONAL_FACTORS[region] || 1.0
    const laborRate = LABOR_RATES[region] || 40

    // Calculate material costs
    const materialItems: MaterialCost[] = []
    let materialUncertainty = 0

    for (const mat of req.materials) {
      const lookup = mat.name.toLowerCase()
      const priceInfo = MATERIAL_PRICES[lookup]

      let unitPrice: number
      let priceSource: 'database' | 'estimated'
      let volatility: 'low' | 'medium' | 'high'

      if (priceInfo) {
        unitPrice = priceInfo.price
        priceSource = 'database'
        volatility = priceInfo.volatility
      } else {
        // Estimate based on category
        switch (mat.category) {
          case 'chemical':
            unitPrice = 50 // $/g estimated
            break
          case 'consumable':
            unitPrice = 10
            break
          case 'substrate':
            unitPrice = 5
            break
          case 'equipment':
            unitPrice = 100
            break
          default:
            unitPrice = 25
        }
        priceSource = 'estimated'
        volatility = 'medium'
      }

      const totalPrice = unitPrice * mat.quantity

      // Add uncertainty based on volatility
      switch (volatility) {
        case 'high':
          materialUncertainty += totalPrice * 0.3
          break
        case 'medium':
          materialUncertainty += totalPrice * 0.15
          break
        case 'low':
          materialUncertainty += totalPrice * 0.05
          break
      }

      materialItems.push({
        name: mat.name,
        quantity: mat.quantity,
        unit: mat.unit,
        unitPrice,
        totalPrice,
        priceSource,
        volatility,
      })
    }

    const materialSubtotal = materialItems.reduce((sum, m) => sum + m.totalPrice, 0)

    // Calculate equipment costs
    const equipmentItems: EquipmentCost[] = []

    if (req.equipment) {
      for (const equip of req.equipment) {
        const lookup = equip.toLowerCase()
        const hourlyRate = EQUIPMENT_RATES[lookup] || 30
        const estimatedHours = estimateEquipmentHours(lookup, req.domain)

        equipmentItems.push({
          name: equip,
          hourlyRate,
          estimatedHours,
          totalCost: hourlyRate * estimatedHours,
        })
      }
    }

    const equipmentSubtotal = equipmentItems.reduce((sum, e) => sum + e.totalCost, 0)

    // Calculate labor costs
    const laborHours = req.laborHours || estimateLaborHours(req.materials.length, req.equipment?.length || 0)
    const laborSubtotal = laborHours * laborRate

    // Calculate overhead (typically 15-25% in academic labs)
    const overheadPercentage = 0.20
    const baseTotal = materialSubtotal + equipmentSubtotal + laborSubtotal
    const overheadAmount = baseTotal * overheadPercentage

    // Regional adjustment
    const preRegionalTotal = baseTotal + overheadAmount
    const regionalAdjustment = preRegionalTotal * (regionalFactor - 1)
    const adjustedTotal = preRegionalTotal + regionalAdjustment

    // Calculate uncertainty range
    const totalUncertainty = materialUncertainty + adjustedTotal * 0.1
    const lowerBound = adjustedTotal - totalUncertainty
    const upperBound = adjustedTotal + totalUncertainty

    // Generate recommendations
    const recommendations = generateCostRecommendations(materialItems, equipmentItems, req.domain)

    const breakdown: CostBreakdown = {
      materials: {
        items: materialItems,
        subtotal: materialSubtotal,
        uncertainty: materialUncertainty,
      },
      equipment: {
        items: equipmentItems,
        subtotal: equipmentSubtotal,
      },
      labor: {
        hours: laborHours,
        hourlyRate: laborRate,
        subtotal: laborSubtotal,
      },
      overhead: {
        percentage: overheadPercentage * 100,
        amount: overheadAmount,
      },
      regional: {
        region,
        factor: regionalFactor,
        adjustment: regionalAdjustment,
      },
      total: {
        base: baseTotal + overheadAmount,
        adjusted: adjustedTotal,
        uncertainty: totalUncertainty,
        range: [Math.max(0, lowerBound), upperBound],
      },
      recommendations,
    }

    return NextResponse.json(breakdown)
  } catch (error) {
    console.error('Cost estimation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cost estimation failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/experiments/cost
 * Get available materials and pricing info
 */
export async function GET() {
  return NextResponse.json({
    materials: Object.entries(MATERIAL_PRICES).map(([name, info]) => ({
      name,
      ...info,
    })),
    equipment: Object.entries(EQUIPMENT_RATES).map(([name, rate]) => ({
      name,
      hourlyRate: rate,
    })),
    regions: Object.entries(REGIONAL_FACTORS).map(([region, factor]) => ({
      region,
      factor,
      laborRate: LABOR_RATES[region] || 40,
    })),
  })
}

// Helper: Estimate equipment usage hours
function estimateEquipmentHours(equipment: string, domain: string): number {
  const baseHours: Record<string, number> = {
    'spin coater': 2,
    'thermal evaporator': 4,
    'e-beam evaporator': 6,
    'sputtering system': 4,
    'glovebox': 8,
    'solar simulator': 2,
    'electrochemical workstation': 4,
    'potentiostat': 3,
    'xrd': 1,
    'sem': 2,
    'tem': 3,
    'afm': 2,
    'uv-vis spectrometer': 1,
    'ftir': 1,
    'raman': 2,
    'profilometer': 1,
    'hotplate': 4,
    'furnace': 6,
    'tube furnace': 8,
    'ultrasonic bath': 1,
    'centrifuge': 1,
  }

  return baseHours[equipment] || 2
}

// Helper: Estimate labor hours
function estimateLaborHours(numMaterials: number, numEquipment: number): number {
  // Base: 2 hours setup + 0.5 hours per material + 1 hour per equipment + 2 hours analysis
  return 2 + numMaterials * 0.5 + numEquipment * 1 + 2
}

// Helper: Generate cost optimization recommendations
function generateCostRecommendations(
  materials: MaterialCost[],
  equipment: EquipmentCost[],
  domain: string
): string[] {
  const recommendations: string[] = []

  // Check for high-volatility materials
  const volatileMaterials = materials.filter((m) => m.volatility === 'high')
  if (volatileMaterials.length > 0) {
    recommendations.push(
      `Consider bulk purchasing for ${volatileMaterials.map((m) => m.name).join(', ')} to lock in pricing.`
    )
  }

  // Check for estimated prices (not in database)
  const estimatedMaterials = materials.filter((m) => m.priceSource === 'estimated')
  if (estimatedMaterials.length > 0) {
    recommendations.push(
      `Verify pricing for ${estimatedMaterials.map((m) => m.name).join(', ')} - these are estimates.`
    )
  }

  // Check for expensive equipment
  const expensiveEquipment = equipment.filter((e) => e.totalCost > 200)
  if (expensiveEquipment.length > 0) {
    recommendations.push(
      `Schedule ${expensiveEquipment.map((e) => e.name).join(', ')} efficiently to minimize usage time.`
    )
  }

  // Domain-specific recommendations
  if (domain === 'solar' && materials.some((m) => m.name.toLowerCase().includes('spiro'))) {
    recommendations.push(
      'Consider alternative HTL materials like PTAA or carbon-based options for cost reduction.'
    )
  }

  if (domain === 'hydrogen' && materials.some((m) => m.name.toLowerCase().includes('platinum'))) {
    recommendations.push(
      'Explore non-PGM catalysts like Ni-Fe or Co-based materials to reduce catalyst costs.'
    )
  }

  return recommendations
}
