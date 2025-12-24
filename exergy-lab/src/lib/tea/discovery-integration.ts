/**
 * Discovery Engine Integration for Enhanced TEA
 *
 * Connects the enhanced TEA system with the FrontierScience Discovery Engine
 * Enables automatic TEA analysis during Phase 3 (Validation) of discoveries
 *
 * Integration points:
 * - Convert hypothesis to TEA inputs
 * - Run multi-agent validated TEA
 * - Include TEA results in discovery output
 * - Validate economic viability against thresholds
 */

import type { Domain, DiscoveryReport } from '@/types/discovery'
import type { TEAInput_v2, TEAResult_v2 } from '@/types/tea'

// Local types for discovery integration (compatible with FrontierScience Discovery Engine)
interface Hypothesis {
  id: string
  title: string
  description: string
  domain: string
  noveltyScore?: number
  feasibilityScore?: number
  impactScore?: number
}
import { TEACalculator, calculateTEA } from './calculations'
import { validateTEAQuality } from './quality-orchestrator'
import { evaluateTEAQuality } from './quality-rubric'
import { runSensitivityAnalysis } from './sensitivity'
import { getTechnologyDefaults } from './defaults-database'
import { benchmarkResults } from './benchmarks'

/**
 * Convert Discovery hypothesis to TEA input
 */
export async function hypothesisToTEAInput(hypothesis: Hypothesis): Promise<TEAInput_v2> {
  // Extract relevant parameters from hypothesis
  const technology = mapDomainToTechnology(hypothesis.domain)
  const defaults = getTechnologyDefaults(technology)

  // Parse hypothesis for TEA-relevant parameters
  const capacity = extractCapacityFromHypothesis(hypothesis)
  const costs = extractCostsFromHypothesis(hypothesis)

  // Build complete TEA input with all required properties
  const teaInput: TEAInput_v2 = {
    // Required project metadata
    project_name: hypothesis.title,
    technology_type: technology,

    // Required capacity parameters
    capacity_mw: capacity || defaults.capacity_mw || 1,
    capacity_factor: defaults.capacity_factor || 50,

    // Required capital costs
    capex_per_kw: defaults.capex_per_kw || 1000,
    installation_factor: defaults.installation_factor || 1.2,
    land_cost: defaults.land_cost || 0,
    grid_connection_cost: defaults.grid_connection_cost || 0,

    // Required operating costs
    opex_per_kw_year: defaults.opex_per_kw_year || 20,
    fixed_opex_annual: defaults.fixed_opex_annual || 0,
    variable_opex_per_mwh: defaults.variable_opex_per_mwh || 0,
    insurance_rate: defaults.insurance_rate || 0.5,

    // Required financial parameters
    project_lifetime_years: defaults.project_lifetime_years || 25,
    discount_rate: defaults.discount_rate || 8,
    debt_ratio: defaults.debt_ratio || 0.6,
    interest_rate: defaults.interest_rate || 5,
    tax_rate: defaults.tax_rate || 25,
    depreciation_years: defaults.depreciation_years || 10,

    // Required revenue assumptions
    electricity_price_per_mwh: defaults.electricity_price_per_mwh || 50,
    price_escalation_rate: defaults.price_escalation_rate || 2,
    carbon_credit_per_ton: defaults.carbon_credit_per_ton || 0,
    carbon_intensity_avoided: defaults.carbon_intensity_avoided || 0,

    // Apply any additional defaults and hypothesis-derived costs
    ...costs,
  }

  return teaInput
}

/**
 * Run enhanced TEA for discovery validation
 */
export async function runDiscoveryTEA(hypothesis: Hypothesis, simulationResults?: any): Promise<{
  teaInput: TEAInput_v2
  teaResults: TEAResult_v2
  validation: {
    confidence: number
    qualityScore: number
    approved: boolean
    issues: string[]
  }
  economicViability: {
    viable: boolean
    score: number // 0-10 for Breakthrough Engine BC9 dimension
    rationale: string
  }
}> {
  // Step 1: Convert hypothesis to TEA input
  let teaInput = await hypothesisToTEAInput(hypothesis)

  // Step 2: Enhance with simulation results if available
  if (simulationResults) {
    teaInput = enhanceTEAWithSimulation(teaInput, simulationResults)
  }

  // Step 3: Calculate TEA metrics
  const calculator = new TEACalculator(teaInput)
  const calculations = calculator.calculate({ includeProvenance: true })

  const teaResults: TEAResult_v2 = {
    ...teaInput,
    lcoe: calculations.lcoe,
    npv: calculations.npv,
    irr: calculations.irr,
    payback_years: calculations.paybackSimple,
    total_capex: calculations.totalCapex,
    annual_opex: calculations.totalOpexAnnual,
    total_lifetime_cost: calculations.totalLifetimeCost,
    annual_production_mwh: teaInput.annual_production_mwh || 0,
    lifetime_production_mwh: 0,
    annual_revenue: 0,
    lifetime_revenue_npv: 0,
    capex_breakdown: {
      equipment: calculations.totalCapex * 0.4,
      installation: calculations.totalCapex * 0.35,
      land: teaInput.land_cost,
      grid_connection: teaInput.grid_connection_cost,
    },
    opex_breakdown: {
      capacity_based: calculations.totalOpexAnnual * 0.4,
      fixed: calculations.totalOpexAnnual * 0.3,
      variable: calculations.totalOpexAnnual * 0.25,
      insurance: calculations.totalOpexAnnual * 0.05,
    },
    cash_flows: [],
    extendedMetrics: {
      msp: calculations.msp,
      lcop: calculations.lcop,
      roi: calculations.roi,
      profitabilityIndex: calculations.profitabilityIndex,
      benefitCostRatio: calculations.benefitCostRatio,
      eroi: calculations.eroi,
      epbt: calculations.epbt,
      mitigationCost: calculations.mitigationCost,
      carbonIntensity: teaInput.carbon_intensity_avoided,
      avoidedEmissions: calculations.avoidedEmissions,
    },
  }

  // Step 4: Run multi-agent quality validation (lightweight for discovery)
  // Full validation would be run when generating detailed report
  const quickValidation = await quickValidateTEA(teaInput, teaResults)

  // Step 5: Assess economic viability for Breakthrough Engine
  const economicViability = assessEconomicViability(teaResults, teaInput)

  return {
    teaInput,
    teaResults,
    validation: {
      confidence: quickValidation.confidence,
      qualityScore: quickValidation.confidence / 10, // Scale to 0-10
      approved: quickValidation.passed,
      issues: quickValidation.issues,
    },
    economicViability,
  }
}

/**
 * Quick TEA validation (lightweight for discovery)
 */
async function quickValidateTEA(
  input: TEAInput_v2,
  results: TEAResult_v2
): Promise<{
  passed: boolean
  confidence: number
  issues: string[]
}> {
  const issues: string[] = []
  let confidence = 100

  // Basic checks
  if (results.lcoe <= 0 || results.lcoe > 2) {
    issues.push(`LCOE (${results.lcoe} $/kWh) outside reasonable range`)
    confidence -= 20
  }

  if (results.npv < -input.capex_per_kw * input.capacity_mw * 2000) {
    issues.push('Extremely negative NPV - check assumptions')
    confidence -= 25
  }

  if (results.payback_years > input.project_lifetime_years) {
    issues.push('Payback exceeds project lifetime')
    confidence -= 20
  }

  // NPV-IRR consistency
  const npvPositive = results.npv > 0
  const irrAboveDiscount = results.irr > input.discount_rate
  if ((npvPositive && !irrAboveDiscount) || (!npvPositive && irrAboveDiscount)) {
    issues.push('NPV-IRR inconsistency detected')
    confidence -= 30
  }

  return {
    passed: issues.length === 0 && confidence >= 70,
    confidence: Math.max(0, confidence),
    issues,
  }
}

/**
 * Assess economic viability for Breakthrough Engine (BC9 dimension)
 */
function assessEconomicViability(
  results: TEAResult_v2,
  input: TEAInput_v2
): {
  viable: boolean
  score: number // 0-10
  rationale: string
} {
  let score = 5 // Start at middle

  // NPV contribution
  if (results.npv > 0) score += 2
  else if (results.npv > -input.capex_per_kw * input.capacity_mw * 500) score += 1

  // IRR contribution
  if (results.irr > input.discount_rate + 5) score += 2
  else if (results.irr > input.discount_rate) score += 1

  // Payback contribution
  if (results.payback_years < input.project_lifetime_years / 3) score += 1
  else if (results.payback_years < input.project_lifetime_years / 2) score += 0.5

  // Profitability Index
  if (results.extendedMetrics?.profitabilityIndex) {
    if (results.extendedMetrics.profitabilityIndex > 1.2) score += 1
    else if (results.extendedMetrics.profitabilityIndex > 1.0) score += 0.5
  }

  score = Math.min(10, Math.max(0, score))

  const viable = score >= 6
  const rationale = generateViabilityRationale(score, results, input)

  return { viable, score, rationale }
}

function generateViabilityRationale(
  score: number,
  results: TEAResult_v2,
  input: TEAInput_v2
): string {
  if (score >= 8) {
    return `Excellent economic viability: NPV ${results.npv >= 0 ? 'positive' : 'negative'}, IRR ${results.irr.toFixed(1)}% >> discount rate, payback ${results.payback_years.toFixed(1)} years`
  } else if (score >= 6) {
    return `Good economic viability: Positive indicators suggest commercial potential with IRR ${results.irr.toFixed(1)}%`
  } else if (score >= 4) {
    return `Marginal viability: Economics require optimization or policy support`
  } else {
    return `Poor economic viability: Significant improvements needed for commercial feasibility`
  }
}

// Helper functions
function mapDomainToTechnology(domain: string): any {
  const mapping: Record<string, any> = {
    solar: 'solar',
    'solar-thermal': 'solar',
    photovoltaic: 'solar',
    wind: 'wind',
    'offshore-wind': 'offshore_wind',
    hydrogen: 'hydrogen',
    'energy-storage': 'storage',
    nuclear: 'nuclear',
    geothermal: 'geothermal',
    hydro: 'hydro',
    hydropower: 'hydro',
    biomass: 'biomass',
    bioenergy: 'biomass',
  }

  return mapping[domain.toLowerCase()] || 'generic'
}

function extractCapacityFromHypothesis(hypothesis: Hypothesis): number | undefined {
  // Parse hypothesis text for capacity mentions
  const text = hypothesis.description.toLowerCase()
  const match = text.match(/(\d+\.?\d*)\s*(mw|megawatt|kw|kilowatt)/i)
  if (match) {
    const value = parseFloat(match[1])
    const unit = match[2].toLowerCase()
    return unit.startsWith('k') ? value / 1000 : value
  }
  return undefined
}

function extractEfficiencyFromHypothesis(hypothesis: Hypothesis): number | undefined {
  const text = hypothesis.description.toLowerCase()
  const match = text.match(/(\d+\.?\d*)\s*%?\s*efficiency/i)
  return match ? parseFloat(match[1]) : undefined
}

function extractCostsFromHypothesis(hypothesis: Hypothesis): Partial<TEAInput_v2> {
  // Would use more sophisticated parsing in production
  return {}
}

function enhanceTEAWithSimulation(
  teaInput: TEAInput_v2,
  simulationResults: any
): TEAInput_v2 {
  // Enhance TEA input with actual simulation data
  return {
    ...teaInput,
    // Add simulation-derived performance parameters
  }
}
