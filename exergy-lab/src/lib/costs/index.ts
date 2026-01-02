/**
 * Cost Estimation Module (v0.6.0)
 *
 * Comprehensive cost estimation for clean energy research.
 * Includes material database, lab time estimation, and regional adjustments.
 *
 * @example
 * ```typescript
 * import {
 *   getMaterialsByDomain,
 *   quickEstimate,
 *   getFullRegionalCosts
 * } from '@/lib/costs'
 *
 * // Get materials for solar research
 * const solarMaterials = getMaterialsByDomain('solar')
 *
 * // Estimate lab time for a perovskite cell
 * const timeEstimate = quickEstimate('perovskite_solar_cell', {
 *   skillLevel: 'graduate',
 *   laborRate: 30
 * })
 *
 * // Get regional costs for Germany
 * const germanyCosts = getFullRegionalCosts('eu-germany')
 * ```
 */

// Material Database
export {
  MATERIAL_DATABASE,
  getAllMaterials,
  getMaterial,
  getMaterialsByCategory,
  getMaterialsByDomain,
  getMaterialsByVolatility,
  searchMaterials,
  getHighRiskMaterials,
  calculateBillOfMaterials,
  getMaterialStatistics,
  formatMaterialPrice,
  getMaterialAlternatives,
  type MaterialCategory,
  type VolatilityLevel,
  type MaterialCost,
  type MaterialPriceHistory,
} from './material-database'

// Lab Time Estimation
export {
  estimateLabTime,
  createStepsFromTemplates,
  quickEstimate,
  estimateCharacterizationTime,
  formatTimeEstimate,
  calculateWorkingDays,
  STEP_TEMPLATES,
  type SkillLevel,
  type SafetyLevel,
  type EquipmentComplexity,
  type ExperimentStep,
  type StepCategory,
  type LabTimeEstimate,
  type StepTimeBreakdown,
  type EstimationOptions,
} from './lab-time-estimator'

// Regional Cost Factors
export {
  REGIONAL_FACTORS,
  getRegionalFactors,
  getAllRegions,
  getRegionsByCountry,
  getRegionalLaborRates,
  getRegionalEnergyPrices,
  getFullRegionalCosts,
  adjustCostForRegion,
  convertToLocalCurrency,
  compareCostsAcrossRegions,
  findLowestCostRegion,
  calculateRegionalProjectCost,
  getCompetitivenessRanking,
  type RegionalCostFactors,
  type RegionalLaborRates,
  type RegionalEnergyPrices,
  type FullRegionalCosts,
} from './regional-factors'

// ============================================================================
// Convenience Functions
// ============================================================================

import { getMaterialsByDomain, calculateBillOfMaterials } from './material-database'
import { quickEstimate, type EstimationOptions } from './lab-time-estimator'
import {
  getFullRegionalCosts,
  calculateRegionalProjectCost,
} from './regional-factors'

/**
 * Estimate full experiment cost including materials, labor, and regional adjustments
 */
export function estimateFullExperimentCost(
  experimentType: string,
  materials: Array<{ materialId: string; quantity: number }>,
  regionId: string,
  options?: Partial<EstimationOptions>
): {
  materialCost: number
  laborCost: number
  totalCostUSD: number
  breakdown: {
    materials: ReturnType<typeof calculateBillOfMaterials>
    time: ReturnType<typeof quickEstimate>
    regional: ReturnType<typeof calculateRegionalProjectCost>
  }
  warnings: string[]
} {
  const warnings: string[] = []

  // Get regional costs
  const regionalCosts = getFullRegionalCosts(regionId)
  if (!regionalCosts) {
    warnings.push(`Region ${regionId} not found, using US baseline`)
  }

  // Calculate material costs
  const materialResult = calculateBillOfMaterials(materials)
  warnings.push(...materialResult.warnings)

  // Get labor rate from regional data
  const laborRate = regionalCosts?.laborRates.graduate ?? 30

  // Estimate lab time with labor cost
  const timeEstimate = quickEstimate(experimentType, {
    ...options,
    laborRate,
  })

  // Calculate regional project cost
  const projectCost = calculateRegionalProjectCost(regionId, {
    labor: timeEstimate.laborCost ?? 0,
    energy: 50, // Estimate for equipment energy use
    materials: materialResult.total,
    facility: 100, // Daily facility overhead
  })

  return {
    materialCost: materialResult.total,
    laborCost: timeEstimate.laborCost ?? 0,
    totalCostUSD: projectCost.totalUSD,
    breakdown: {
      materials: materialResult,
      time: timeEstimate,
      regional: projectCost,
    },
    warnings,
  }
}

/**
 * Get common materials for a domain with costs
 */
export function getDomainMaterialCosts(domain: string): Array<{
  id: string
  name: string
  price: number
  unit: string
  volatility: string
}> {
  return getMaterialsByDomain(domain).map((m) => ({
    id: m.id,
    name: m.name,
    price: m.price,
    unit: m.unit,
    volatility: m.volatility,
  }))
}
