/**
 * Practicality Benchmark
 *
 * Validates real-world implementation feasibility including:
 * - Technology Readiness Level (TRL)
 * - Cost feasibility
 * - Supply chain availability
 * - Regulatory pathway
 * - Market viability
 * - Scalability score (per Grok feedback - critical for materials)
 *
 * @module practicality-benchmark
 */

import type {
  BenchmarkResult,
  BenchmarkItemResult,
  TechnologyReadinessLevel,
  ScalabilityFactors,
  CriticalMaterial,
  CRITICAL_MATERIALS,
} from './types'

// ============================================================================
// Critical Materials List
// ============================================================================

const CRITICAL_MATERIALS_LIST: CriticalMaterial[] = [
  { name: 'cobalt', supplyRisk: 'high', alternatives: ['iron', 'manganese'] },
  { name: 'lithium', supplyRisk: 'medium', alternatives: ['sodium'] },
  { name: 'neodymium', supplyRisk: 'critical' },
  { name: 'dysprosium', supplyRisk: 'critical' },
  { name: 'platinum', supplyRisk: 'high', alternatives: ['nickel', 'iron'] },
  { name: 'iridium', supplyRisk: 'critical' },
  { name: 'ruthenium', supplyRisk: 'high' },
  { name: 'indium', supplyRisk: 'high' },
  { name: 'gallium', supplyRisk: 'medium' },
  { name: 'tellurium', supplyRisk: 'high' },
  { name: 'germanium', supplyRisk: 'medium' },
]

// ============================================================================
// Practicality Benchmark Validator Class
// ============================================================================

export interface PracticalityConfig {
  targetTimeframe: 'near' | 'medium' | 'long'  // 2yr, 5yr, 10yr+
  budgetConstraint?: number
  regulatoryRegion?: string
  includeScalability: boolean
}

const DEFAULT_CONFIG: PracticalityConfig = {
  targetTimeframe: 'medium',
  includeScalability: true,
}

export class PracticalityBenchmarkValidator {
  private config: PracticalityConfig

  constructor(config: Partial<PracticalityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async validate(discoveryOutput: any): Promise<BenchmarkResult> {
    const startTime = Date.now()
    const items: BenchmarkItemResult[] = []

    // Run all practicality checks
    items.push(this.assessTRL(discoveryOutput))
    items.push(this.assessCost(discoveryOutput))
    items.push(this.assessSupplyChain(discoveryOutput))
    items.push(this.assessRegulatory(discoveryOutput))
    items.push(this.assessMarket(discoveryOutput))

    if (this.config.includeScalability) {
      items.push(this.assessScalability(discoveryOutput))
    }

    const totalScore = items.reduce((sum, i) => sum + i.score, 0)
    const maxScore = items.reduce((sum, i) => sum + i.maxScore, 0)
    const normalizedScore = (totalScore / maxScore) * 10

    return {
      benchmarkType: 'practicality',
      score: normalizedScore,
      maxScore: 10,
      passed: normalizedScore >= 6.0,  // Lower threshold for practicality
      weight: 0.20,
      confidence: 0.7,  // Lower confidence - practicality assessments more uncertain
      items,
      metadata: {
        evaluationTimeMs: Date.now() - startTime,
        version: '1.0.0',
        checksRun: items.length,
      },
    }
  }

  // ============================================================================
  // Individual Assessments
  // ============================================================================

  private assessTRL(output: any): BenchmarkItemResult {
    const trl = this.extractTRL(output) || 3  // Default to early lab stage

    const targetTRL = this.config.targetTimeframe === 'near' ? 7 :
                      this.config.targetTimeframe === 'medium' ? 5 : 3

    const gap = Math.max(0, targetTRL - trl)
    const score = Math.max(0, 2.0 - gap * 0.4)
    const passed = gap <= 2

    return {
      id: 'P1',
      name: 'Technology Readiness',
      score,
      maxScore: 2.0,
      passed,
      reasoning: `Current TRL ${trl}, target TRL ${targetTRL} for ${this.config.targetTimeframe}-term (gap: ${gap})`,
      suggestions: gap > 2 ? ['Consider intermediate development milestones', 'Identify key technology de-risking steps'] : undefined,
    }
  }

  private assessCost(output: any): BenchmarkItemResult {
    const costInfo = this.extractCostInfo(output)
    const issues: string[] = []
    const suggestions: string[] = []

    if (!costInfo) {
      return {
        id: 'P2',
        name: 'Cost Feasibility',
        score: 1.0,
        maxScore: 2.0,
        passed: true,
        reasoning: 'No cost information provided - cannot fully assess',
        suggestions: ['Include cost estimates for better feasibility assessment'],
      }
    }

    // Check if cost is competitive
    if (costInfo.lcoe && costInfo.marketLcoe) {
      const ratio = costInfo.lcoe / costInfo.marketLcoe
      if (ratio > 2.0) {
        issues.push(`LCOE ${costInfo.lcoe} ${costInfo.unit} is ${ratio.toFixed(1)}x market rate`)
      } else if (ratio > 1.5) {
        suggestions.push('Cost is above market rate but may be competitive at scale')
      }
    }

    // Check capex
    if (costInfo.capex && costInfo.capex > 1e9) {
      suggestions.push('High capital expenditure may limit initial deployment')
    }

    const passed = issues.length === 0
    const score = passed ? 2.0 : Math.max(0.5, 2.0 - issues.length * 0.5)

    return {
      id: 'P2',
      name: 'Cost Feasibility',
      score,
      maxScore: 2.0,
      passed,
      reasoning: passed ? 'Cost estimates within competitive range' : issues.join('; '),
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    }
  }

  private assessSupplyChain(output: any): BenchmarkItemResult {
    const materials = this.extractMaterials(output)
    const criticalMaterials: string[] = []
    const suggestions: string[] = []

    for (const material of materials) {
      const materialName = material.name?.toLowerCase() || ''
      const critical = CRITICAL_MATERIALS_LIST.find(c =>
        materialName.includes(c.name)
      )

      if (critical) {
        criticalMaterials.push(`${material.name} (${critical.supplyRisk} risk)`)
        if (critical.alternatives?.length) {
          suggestions.push(`Consider ${critical.alternatives.join(' or ')} as alternatives to ${material.name}`)
        }
      }
    }

    const highRiskCount = criticalMaterials.filter(m =>
      m.includes('high') || m.includes('critical')
    ).length

    let score: number
    let passed: boolean
    let reasoning: string

    if (highRiskCount === 0) {
      score = 1.5
      passed = true
      reasoning = 'Materials and components available with low supply risk'
    } else if (highRiskCount <= 1) {
      score = 1.0
      passed = true
      reasoning = `Some supply chain concerns: ${criticalMaterials.join(', ')}`
    } else {
      score = 0.5
      passed = false
      reasoning = `Multiple critical materials: ${criticalMaterials.join(', ')}`
    }

    return {
      id: 'P3',
      name: 'Supply Chain',
      score,
      maxScore: 1.5,
      passed,
      reasoning,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    }
  }

  private assessRegulatory(output: any): BenchmarkItemResult {
    const regulatoryInfo = this.extractRegulatoryInfo(output)
    const issues: string[] = []
    const suggestions: string[] = []

    if (!regulatoryInfo) {
      return {
        id: 'P4',
        name: 'Regulatory Pathway',
        score: 1.0,
        maxScore: 1.5,
        passed: true,
        reasoning: 'No regulatory barriers identified',
      }
    }

    if (regulatoryInfo.noveTechnology) {
      suggestions.push('Novel technology may require new regulatory frameworks')
    }

    if (regulatoryInfo.hazardousMaterials) {
      issues.push('Involves hazardous materials requiring special permits')
    }

    if (regulatoryInfo.crossBorder) {
      suggestions.push('Cross-border deployment may face varying regulations')
    }

    const passed = issues.length === 0
    return {
      id: 'P4',
      name: 'Regulatory Pathway',
      score: passed ? 1.5 : 0.75,
      maxScore: 1.5,
      passed,
      reasoning: passed ? 'Clear regulatory pathway exists' : issues.join('; '),
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    }
  }

  private assessMarket(output: any): BenchmarkItemResult {
    const marketInfo = this.extractMarketInfo(output)
    const positives: string[] = []
    const concerns: string[] = []

    if (!marketInfo) {
      return {
        id: 'P5',
        name: 'Market Viability',
        score: 1.0,
        maxScore: 1.5,
        passed: true,
        reasoning: 'Market analysis not provided',
        suggestions: ['Include market size and competitive analysis'],
      }
    }

    if (marketInfo.marketSize && marketInfo.marketSize > 1e9) {
      positives.push('Large addressable market')
    }

    if (marketInfo.competitiveAdvantage) {
      positives.push('Clear competitive advantage identified')
    }

    if (marketInfo.existingInfrastructure) {
      positives.push('Can leverage existing infrastructure')
    }

    if (marketInfo.highCompetition) {
      concerns.push('Highly competitive market')
    }

    if (marketInfo.regulatoryUncertainty) {
      concerns.push('Regulatory uncertainty in target markets')
    }

    const score = positives.length > 0 ? 1.5 : concerns.length > 0 ? 0.75 : 1.0
    const passed = concerns.length <= 1

    return {
      id: 'P5',
      name: 'Market Viability',
      score,
      maxScore: 1.5,
      passed,
      reasoning: positives.length > 0 ? positives.join('; ') : concerns.join('; ') || 'Market demand identified',
    }
  }

  // Scalability assessment (per Grok feedback - critical for materials)
  private assessScalability(output: any): BenchmarkItemResult {
    const factors = this.calculateScalabilityFactors(output)

    const totalScore = Object.values(factors).reduce((sum, f) => sum + f.score, 0)
    const maxScore = Object.values(factors).length * 0.5  // 0.5 per factor
    const passed = totalScore >= maxScore * 0.6

    const lowScoreFactors = Object.entries(factors)
      .filter(([_, f]) => f.score < 0.3)
      .map(([name, f]) => `${name}: ${f.reason}`)

    const suggestions: string[] = []
    if (factors.precursorAbundance.score < 0.3) {
      suggestions.push('Consider alternative materials with better supply chain availability')
    }
    if (factors.synthesisComplexity.score < 0.3) {
      suggestions.push('Simplify synthesis process for manufacturing scalability')
    }

    return {
      id: 'P6',
      name: 'Scalability Score',
      score: totalScore,
      maxScore,
      passed,
      reasoning: passed
        ? 'Good scalability potential identified'
        : `Scalability concerns: ${lowScoreFactors.join('; ')}`,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    }
  }

  private calculateScalabilityFactors(output: any): ScalabilityFactors {
    return {
      precursorAbundance: this.checkPrecursorAbundance(output),
      synthesisComplexity: this.assessSynthesisComplexity(output),
      equipmentAvailability: this.checkEquipmentNeeds(output),
      energyRequirements: this.assessEnergyIntensity(output),
    }
  }

  private checkPrecursorAbundance(output: any): { score: number; reason: string } {
    const materials = this.extractMaterials(output)
    const criticalFound = materials.some(m => {
      const name = m.name?.toLowerCase() || ''
      return CRITICAL_MATERIALS_LIST.some(c =>
        name.includes(c.name) && (c.supplyRisk === 'high' || c.supplyRisk === 'critical')
      )
    })

    return {
      score: criticalFound ? 0.2 : 0.5,
      reason: criticalFound ? 'Contains supply-constrained materials' : 'Uses abundant materials',
    }
  }

  private assessSynthesisComplexity(output: any): { score: number; reason: string } {
    const process = output?.process || output?.synthesis || output?.manufacturing
    if (!process) {
      return { score: 0.35, reason: 'Process details not provided' }
    }

    const steps = process.steps?.length || 0
    const requiresVacuum = process.conditions?.includes('vacuum') || process.vacuum
    const requiresHighTemp = process.temperature > 1000 || process.conditions?.includes('high temperature')
    const requiresCleanroom = process.conditions?.includes('cleanroom')

    let complexity = 0
    if (steps > 10) complexity++
    if (requiresVacuum) complexity++
    if (requiresHighTemp) complexity++
    if (requiresCleanroom) complexity++

    if (complexity === 0) return { score: 0.5, reason: 'Simple synthesis process' }
    if (complexity === 1) return { score: 0.4, reason: 'Moderate synthesis complexity' }
    if (complexity === 2) return { score: 0.3, reason: 'Complex synthesis requirements' }
    return { score: 0.2, reason: 'Highly complex synthesis process' }
  }

  private checkEquipmentNeeds(output: any): { score: number; reason: string } {
    const equipment = output?.equipment || output?.manufacturing?.equipment || []
    const specializedCount = equipment.filter((e: any) =>
      e.specialized || e.custom || e.cost > 1e6
    ).length

    if (specializedCount === 0) return { score: 0.5, reason: 'Standard equipment available' }
    if (specializedCount <= 2) return { score: 0.35, reason: 'Some specialized equipment needed' }
    return { score: 0.2, reason: 'Significant specialized equipment required' }
  }

  private assessEnergyIntensity(output: any): { score: number; reason: string } {
    const energyUse = output?.energyRequirements || output?.process?.energy || output?.manufacturing?.energy
    if (!energyUse) {
      return { score: 0.35, reason: 'Energy requirements not specified' }
    }

    // Normalize to kWh/kg of product
    const intensity = energyUse.perUnit || energyUse.intensity || 0
    if (intensity < 10) return { score: 0.5, reason: 'Low energy intensity' }
    if (intensity < 100) return { score: 0.4, reason: 'Moderate energy intensity' }
    if (intensity < 1000) return { score: 0.3, reason: 'High energy intensity' }
    return { score: 0.2, reason: 'Very high energy intensity' }
  }

  // ============================================================================
  // Extraction Helpers
  // ============================================================================

  private extractTRL(output: any): TechnologyReadinessLevel | null {
    const trl = output?.trl || output?.readiness?.trl || output?.maturity?.trl
    if (typeof trl === 'number' && trl >= 1 && trl <= 9) {
      return trl as TechnologyReadinessLevel
    }
    return null
  }

  private extractCostInfo(output: any): {
    lcoe?: number
    marketLcoe?: number
    capex?: number
    opex?: number
    unit?: string
  } | null {
    const cost = output?.cost || output?.economics || output?.financials
    if (!cost) return null

    return {
      lcoe: cost.lcoe,
      marketLcoe: cost.marketLcoe || cost.benchmark,
      capex: cost.capex || cost.capitalCost,
      opex: cost.opex || cost.operatingCost,
      unit: cost.unit || '$/MWh',
    }
  }

  private extractMaterials(output: any): Array<{ name: string; quantity?: number }> {
    const materials = output?.materials || output?.components?.materials || output?.bom
    return Array.isArray(materials) ? materials : []
  }

  private extractRegulatoryInfo(output: any): {
    noveTechnology?: boolean
    hazardousMaterials?: boolean
    crossBorder?: boolean
  } | null {
    const regulatory = output?.regulatory || output?.compliance
    if (!regulatory) return null

    return {
      noveTechnology: regulatory.novel || regulatory.newTechnology,
      hazardousMaterials: regulatory.hazardous || regulatory.hazmat,
      crossBorder: regulatory.international || regulatory.crossBorder,
    }
  }

  private extractMarketInfo(output: any): {
    marketSize?: number
    competitiveAdvantage?: boolean
    existingInfrastructure?: boolean
    highCompetition?: boolean
    regulatoryUncertainty?: boolean
  } | null {
    const market = output?.market || output?.business || output?.commercialization
    if (!market) return null

    return {
      marketSize: market.size || market.tam,
      competitiveAdvantage: market.advantage || market.differentiator,
      existingInfrastructure: market.infrastructure || market.leverageExisting,
      highCompetition: market.competition === 'high' || market.competitive,
      regulatoryUncertainty: market.regulatoryRisk || market.policyUncertainty,
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createPracticalityBenchmarkValidator(config?: Partial<PracticalityConfig>) {
  return new PracticalityBenchmarkValidator(config)
}
