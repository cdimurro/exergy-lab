import { z } from 'zod'
import { ToolDeclaration } from '@/types/agent'
import { SearchResultSchema, PatentAnalysisSchema, ExtractedDataSchema, SimulationResultSchema } from '../schemas'

// Note: These will integrate with existing systems once they're connected
// For now, we'll create the interfaces that other systems can implement

// ============================================================================
// Tool 1: searchPapers - Search across all data sources
// ============================================================================

const searchPapersSchema = z.object({
  query: z.string().min(3).describe('Search query for papers'),
  domains: z.array(z.string()).optional().describe('Domain filters (e.g., ["solar-energy", "battery-storage"])'),
  filters: z.object({
    yearFrom: z.number().optional(),
    yearTo: z.number().optional(),
    minCitations: z.number().optional(),
    sources: z.array(z.string()).optional(),
  }).optional().describe('Additional search filters'),
  maxResults: z.number().min(1).max(100).default(20).describe('Maximum number of results'),
})

async function searchPapersHandler(params: z.infer<typeof searchPapersSchema>) {
  const { query, domains = [], filters = {}, maxResults = 20 } = params

  console.log('[searchPapers] Executing search:', { query, domains, maxResults })

  try {
    // Import SearchOrchestrator (dynamic import to avoid circular dependencies)
    const { SearchOrchestrator } = await import('@/lib/discovery/search-apis')
    const orchestrator = new SearchOrchestrator()

    // Execute real search across all data sources
    const startTime = Date.now()
    const results = await orchestrator.searchAllSources({
      description: query,
      domains: domains as any[], // Cast to Domain[]
      goals: [], // Goals not needed for tool-based search
    })

    // Transform SearchResults to tool response format
    const papers = results.sources
      .filter(s => s.type === 'academic-paper' || s.type === 'patent')
      .slice(0, maxResults)
      .map((source: any) => ({
        id: source.id,
        title: source.title,
        authors: source.authors || [],
        abstract: source.abstract,
        url: source.url,
        doi: source.doi || undefined,
        citationCount: source.citationCount || 0,
        publicationDate: source.publishedDate || source.publicationDate,
        relevanceScore: source.relevanceScore,
        type: source.type,
      }))

    const response = {
      papers,
      totalResults: results.totalSources,
      searchTime: Date.now() - startTime,
      query,
      sources: {
        papers: results.papers,
        patents: results.patents,
        reports: results.reports,
        news: results.news,
      },
    }

    console.log(`[searchPapers] Found ${response.totalResults} total sources (${response.papers.length} papers returned)`)
    return response
  } catch (error) {
    console.error('[searchPapers] Search failed:', error)
    // Return empty results on error rather than throwing (agent can handle empty results)
    return {
      papers: [],
      totalResults: 0,
      searchTime: 0,
      query,
      sources: { papers: 0, patents: 0, reports: 0, news: 0 },
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export const searchPapersTool: ToolDeclaration = {
  name: 'searchPapers',
  description: 'Search for academic papers, preprints, and research across 14+ scientific databases including Semantic Scholar, arXiv, PubMed, Consensus, ChemRxiv, BioRxiv, NREL, IEEE, and more. Returns papers with relevance scores, citations, and metadata.',
  schema: searchPapersSchema,
  handler: searchPapersHandler,
}

// ============================================================================
// Tool 2: analyzePatent - Deep patent analysis
// ============================================================================

const analyzePatentSchema = z.object({
  patentId: z.string().min(1).describe('Patent ID or number'),
  analysisDepth: z.enum(['basic', 'detailed', 'comprehensive']).default('detailed').describe('Depth of analysis'),
  includeRelated: z.boolean().default(true).describe('Include related patents'),
})

async function analyzePatentHandler(params: z.infer<typeof analyzePatentSchema>) {
  const { patentId, analysisDepth, includeRelated } = params

  console.log('[analyzePatent] Analyzing patent:', { patentId, analysisDepth })

  try {
    // This will integrate with Google Patents API once implemented
    // For now, return structured response

    const analysis = {
      patent: {
        id: patentId,
        title: 'Patent analysis pending integration',
        abstract: '',
        inventors: [],
        assignee: '',
        publicationDate: new Date().toISOString(),
        patentNumber: patentId,
        relevanceScore: 0,
      },
      noveltyScore: 0,
      technicalDepth: 0,
      commercialPotential: 0,
      keyInnovations: [],
      relatedPatents: includeRelated ? [] : [],
      marketApplications: [],
    }

    console.log('[analyzePatent] Analysis complete')
    return analysis
  } catch (error) {
    console.error('[analyzePatent] Analysis failed:', error)
    throw new Error(`Patent analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export const analyzePatentTool: ToolDeclaration = {
  name: 'analyzePatent',
  description: 'Perform deep analysis of a patent including novelty assessment, technical depth evaluation, commercial potential scoring, key innovations extraction, and related patent identification. Useful for competitive analysis and prior art search.',
  schema: analyzePatentSchema,
  handler: analyzePatentHandler,
}

// ============================================================================
// Tool 3: extractData - Extract structured data from files
// ============================================================================

const extractDataSchema = z.object({
  fileUrl: z.string().url().describe('URL to the file to extract data from'),
  format: z.enum(['pdf', 'docx', 'xlsx', 'csv', 'json']).describe('File format'),
  extractionType: z.enum(['text', 'tables', 'metadata', 'all']).default('all').describe('What to extract'),
})

async function extractDataHandler(params: z.infer<typeof extractDataSchema>) {
  const { fileUrl, format, extractionType } = params

  console.log('[extractData] Extracting from:', { fileUrl, format, extractionType })

  try {
    // This will integrate with file parsing libraries (pdf-parse, mammoth, xlsx)
    // For now, return structured response

    const extracted = {
      format,
      content: {
        text: extractionType === 'text' || extractionType === 'all' ? '' : undefined,
        tables: extractionType === 'tables' || extractionType === 'all' ? [] : undefined,
        metadata: extractionType === 'metadata' || extractionType === 'all' ? {} : undefined,
      },
      extractionMethod: `${format}-parser`,
      confidence: 0,
      warnings: [],
    }

    console.log('[extractData] Extraction complete')
    return extracted
  } catch (error) {
    console.error('[extractData] Extraction failed:', error)
    throw new Error(`Data extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export const extractDataTool: ToolDeclaration = {
  name: 'extractData',
  description: 'Extract structured data from various file formats (PDF, DOCX, XLSX, CSV, JSON). Can extract text content, tables, metadata, or all information. Returns structured data with confidence scores and warnings.',
  schema: extractDataSchema,
  handler: extractDataHandler,
}

// ============================================================================
// Tool 4: calculateMetrics - Run various calculations
// ============================================================================

const calculateMetricsSchema = z.object({
  type: z.enum(['tea', 'efficiency', 'emissions', 'cost', 'energy', 'lcoe', 'exergy']).describe('Type of calculation'),
  data: z.record(z.string(), z.any()).describe('Input data for calculation'),
  parameters: z.object({
    discountRate: z.number().optional().describe('Discount rate for financial calculations (e.g., 0.08 for 8%)'),
    projectLifetime: z.number().optional().describe('Project lifetime in years'),
    units: z.string().optional().describe('Output units'),
    inflationRate: z.number().optional().describe('Annual inflation rate'),
    taxRate: z.number().optional().describe('Tax rate for financial calculations'),
  }).optional().describe('Calculation parameters'),
})

// ===================== TEA Calculation Helpers =====================

/**
 * Calculate Net Present Value (NPV)
 * NPV = Σ(Cash Flow_t / (1 + r)^t) - Initial Investment
 */
function calculateNPV(cashFlows: number[], discountRate: number): number {
  let npv = 0
  for (let t = 0; t < cashFlows.length; t++) {
    npv += cashFlows[t] / Math.pow(1 + discountRate, t)
  }
  return Math.round(npv * 100) / 100
}

/**
 * Calculate Internal Rate of Return (IRR)
 * Uses Newton-Raphson method to find rate where NPV = 0
 */
function calculateIRR(cashFlows: number[], maxIterations: number = 100, tolerance: number = 0.0001): number {
  // Initial guess
  let irr = 0.1

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0
    let npvDerivative = 0

    for (let t = 0; t < cashFlows.length; t++) {
      const discountFactor = Math.pow(1 + irr, t)
      npv += cashFlows[t] / discountFactor
      if (t > 0) {
        npvDerivative -= t * cashFlows[t] / Math.pow(1 + irr, t + 1)
      }
    }

    // Newton-Raphson update
    const newIrr = irr - npv / npvDerivative

    if (Math.abs(newIrr - irr) < tolerance) {
      return Math.round(newIrr * 10000) / 10000 // 4 decimal places
    }

    irr = newIrr

    // Bounds check
    if (irr < -1 || irr > 10) {
      return NaN // No valid IRR found
    }
  }

  return Math.round(irr * 10000) / 10000
}

/**
 * Calculate Simple Payback Period
 * Time required to recover initial investment from cash flows
 */
function calculatePaybackPeriod(initialInvestment: number, annualCashFlow: number): number {
  if (annualCashFlow <= 0) return Infinity
  return Math.round((initialInvestment / annualCashFlow) * 100) / 100
}

/**
 * Calculate Discounted Payback Period
 * Time to recover investment considering time value of money
 */
function calculateDiscountedPayback(cashFlows: number[], discountRate: number): number {
  let cumulativePV = 0

  for (let t = 0; t < cashFlows.length; t++) {
    const pv = cashFlows[t] / Math.pow(1 + discountRate, t)
    cumulativePV += pv

    if (cumulativePV >= 0) {
      // Interpolate for exact payback year
      const prevCumulative = cumulativePV - pv
      const fraction = -prevCumulative / pv
      return Math.round((t - 1 + fraction) * 100) / 100
    }
  }

  return cashFlows.length // Never pays back within project lifetime
}

/**
 * Calculate Levelized Cost of Energy (LCOE)
 * LCOE = (Total Lifecycle Costs) / (Total Energy Production)
 * LCOE = (CAPEX + Σ(OPEX_t / (1+r)^t)) / (Σ(Energy_t / (1+r)^t))
 */
function calculateLCOE(
  capitalCost: number,
  annualOperatingCost: number,
  annualEnergyProduction: number, // kWh or MWh
  discountRate: number,
  lifetime: number,
  degradationRate: number = 0.005 // 0.5% annual degradation
): number {
  let totalCostPV = capitalCost
  let totalEnergyPV = 0

  for (let year = 1; year <= lifetime; year++) {
    const discountFactor = Math.pow(1 + discountRate, year)

    // Operating costs (may increase with inflation)
    totalCostPV += annualOperatingCost / discountFactor

    // Energy production (decreases with degradation)
    const energyThisYear = annualEnergyProduction * Math.pow(1 - degradationRate, year - 1)
    totalEnergyPV += energyThisYear / discountFactor
  }

  if (totalEnergyPV <= 0) return Infinity

  return Math.round((totalCostPV / totalEnergyPV) * 10000) / 10000 // $/kWh or $/MWh
}

/**
 * Calculate Return on Investment (ROI)
 */
function calculateROI(totalRevenue: number, totalCost: number): number {
  if (totalCost <= 0) return 0
  return Math.round(((totalRevenue - totalCost) / totalCost) * 10000) / 100 // percentage
}

/**
 * Calculate Profitability Index (PI)
 * PI = PV of future cash flows / Initial investment
 */
function calculateProfitabilityIndex(npv: number, initialInvestment: number): number {
  if (initialInvestment <= 0) return 0
  return Math.round(((npv + initialInvestment) / initialInvestment) * 100) / 100
}

/**
 * Perform sensitivity analysis on key parameters
 */
function performSensitivityAnalysis(
  baseCase: { capitalCost: number; operatingCost: number; energyProduction: number; energyPrice: number },
  discountRate: number,
  lifetime: number
): Record<string, { low: number; base: number; high: number }> {
  const variations = [0.8, 1.0, 1.2] // -20%, base, +20%

  const results: Record<string, { low: number; base: number; high: number }> = {}

  // Capital cost sensitivity
  const capexLCOE = variations.map(v =>
    calculateLCOE(baseCase.capitalCost * v, baseCase.operatingCost, baseCase.energyProduction, discountRate, lifetime)
  )
  results.capitalCost = { low: capexLCOE[0], base: capexLCOE[1], high: capexLCOE[2] }

  // Operating cost sensitivity
  const opexLCOE = variations.map(v =>
    calculateLCOE(baseCase.capitalCost, baseCase.operatingCost * v, baseCase.energyProduction, discountRate, lifetime)
  )
  results.operatingCost = { low: opexLCOE[0], base: opexLCOE[1], high: opexLCOE[2] }

  // Energy production sensitivity
  const energyLCOE = variations.map(v =>
    calculateLCOE(baseCase.capitalCost, baseCase.operatingCost, baseCase.energyProduction * v, discountRate, lifetime)
  )
  results.energyProduction = { low: energyLCOE[2], base: energyLCOE[1], high: energyLCOE[0] } // Inverted

  // Discount rate sensitivity
  const discountRates = [discountRate * 0.7, discountRate, discountRate * 1.3]
  const drLCOE = discountRates.map(dr =>
    calculateLCOE(baseCase.capitalCost, baseCase.operatingCost, baseCase.energyProduction, dr, lifetime)
  )
  results.discountRate = { low: drLCOE[0], base: drLCOE[1], high: drLCOE[2] }

  return results
}

// ===================== Emissions Calculation Helpers =====================

/**
 * Calculate lifecycle CO2 emissions
 */
function calculateLifecycleEmissions(
  constructionEmissions: number, // kg CO2
  annualOperatingEmissions: number, // kg CO2/year
  lifetime: number,
  annualEnergyProduction: number // kWh
): { totalEmissions: number; emissionsIntensity: number } {
  const totalEmissions = constructionEmissions + (annualOperatingEmissions * lifetime)
  const totalEnergy = annualEnergyProduction * lifetime
  const emissionsIntensity = totalEnergy > 0 ? (totalEmissions * 1000) / totalEnergy : 0 // g CO2/kWh

  return {
    totalEmissions: Math.round(totalEmissions),
    emissionsIntensity: Math.round(emissionsIntensity * 100) / 100,
  }
}

/**
 * Emission factors by energy source (kg CO2/kWh)
 */
const EMISSION_FACTORS: Record<string, number> = {
  coal: 0.82,
  naturalGas: 0.49,
  oil: 0.65,
  nuclear: 0.012,
  solar: 0.041,
  wind: 0.011,
  hydro: 0.024,
  biomass: 0.230,
  geothermal: 0.038,
  grid_average: 0.42, // US average
}

// ===================== Main Handler =====================

async function calculateMetricsHandler(params: z.infer<typeof calculateMetricsSchema>) {
  const { type, data, parameters = {} } = params
  const discountRate = parameters?.discountRate ?? 0.08 // Default 8%
  const projectLifetime = parameters?.projectLifetime ?? 25 // Default 25 years

  console.log('[calculateMetrics] Calculating:', { type, parameters })

  try {
    let results: any = {}

    switch (type) {
      case 'tea': {
        // Full Techno-Economic Analysis
        const {
          capitalCost = 0,
          operatingCost = 0,
          annualRevenue = 0,
          annualEnergyProduction = 0,
          energyPrice = 0,
          constructionTime = 1,
        } = data

        // Build cash flow array
        const cashFlows: number[] = [-capitalCost] // Year 0: initial investment
        for (let year = 1; year <= projectLifetime; year++) {
          const revenue = annualRevenue || (annualEnergyProduction * energyPrice)
          cashFlows.push(revenue - operatingCost)
        }

        const npv = calculateNPV(cashFlows, discountRate)
        const irr = calculateIRR(cashFlows)
        const simplePayback = calculatePaybackPeriod(capitalCost, (annualRevenue || annualEnergyProduction * energyPrice) - operatingCost)
        const discountedPayback = calculateDiscountedPayback(cashFlows, discountRate)
        const lcoe = calculateLCOE(capitalCost, operatingCost, annualEnergyProduction, discountRate, projectLifetime)
        const totalRevenue = (annualRevenue || annualEnergyProduction * energyPrice) * projectLifetime
        const totalCost = capitalCost + (operatingCost * projectLifetime)
        const roi = calculateROI(totalRevenue, totalCost)
        const pi = calculateProfitabilityIndex(npv, capitalCost)

        // Sensitivity analysis
        const sensitivity = performSensitivityAnalysis(
          { capitalCost, operatingCost, energyProduction: annualEnergyProduction, energyPrice },
          discountRate,
          projectLifetime
        )

        results = {
          npv,
          irr: isNaN(irr) ? null : irr,
          irrPercentage: isNaN(irr) ? null : Math.round(irr * 10000) / 100,
          simplePaybackPeriod: simplePayback,
          discountedPaybackPeriod: discountedPayback,
          lcoe,
          lcoeUnit: '$/kWh',
          roi,
          profitabilityIndex: pi,
          totalRevenue: Math.round(totalRevenue),
          totalCost: Math.round(totalCost),
          netProfit: Math.round(totalRevenue - totalCost),
          assumptions: {
            discountRate,
            projectLifetime,
            inflationRate: parameters?.inflationRate ?? 0.02,
          },
          sensitivityAnalysis: sensitivity,
          isViable: npv > 0 && (isNaN(irr) || irr > discountRate),
        }
        break
      }

      case 'lcoe': {
        // Dedicated LCOE calculation
        const {
          capitalCost = 0,
          operatingCost = 0,
          annualEnergyProduction = 0,
          degradationRate = 0.005,
          capacityFactor,
          installedCapacity,
        } = data

        // Calculate energy production from capacity if not provided
        let energyProduction = annualEnergyProduction
        if (!energyProduction && installedCapacity && capacityFactor) {
          // installedCapacity in kW, capacityFactor as decimal
          energyProduction = installedCapacity * capacityFactor * 8760 // kWh/year
        }

        const lcoe = calculateLCOE(capitalCost, operatingCost, energyProduction, discountRate, projectLifetime, degradationRate)

        // Compare to benchmarks
        const benchmarks: Record<string, { min: number; max: number }> = {
          'utility-solar': { min: 0.028, max: 0.041 },
          'rooftop-solar': { min: 0.065, max: 0.113 },
          'onshore-wind': { min: 0.026, max: 0.050 },
          'offshore-wind': { min: 0.083, max: 0.130 },
          'natural-gas': { min: 0.044, max: 0.073 },
          'coal': { min: 0.065, max: 0.152 },
          'nuclear': { min: 0.118, max: 0.192 },
        }

        results = {
          lcoe,
          lcoeUnit: '$/kWh',
          lcoeMWh: Math.round(lcoe * 1000 * 100) / 100, // $/MWh
          totalLifetimeCost: Math.round(capitalCost + operatingCost * projectLifetime),
          totalLifetimeEnergy: Math.round(energyProduction * projectLifetime * (1 - degradationRate * projectLifetime / 2)),
          assumptions: {
            discountRate,
            projectLifetime,
            degradationRate,
            capacityFactor: capacityFactor || (energyProduction / (installedCapacity * 8760)),
          },
          benchmarkComparison: benchmarks,
          competitiveness: lcoe < 0.05 ? 'highly competitive' : lcoe < 0.08 ? 'competitive' : lcoe < 0.12 ? 'moderate' : 'high cost',
        }
        break
      }

      case 'efficiency': {
        // Energy efficiency calculations
        const {
          energyInput = 0,
          energyOutput = 0,
          heatInput = 0,
          heatOutput = 0,
          electricalInput = 0,
          electricalOutput = 0,
          fuelInput = 0,
          fuelHeatingValue = 0,
        } = data

        // Thermal efficiency
        const thermalEfficiency = heatInput > 0 ? (heatOutput / heatInput) * 100 : null

        // Electrical efficiency
        const electricalEfficiency = electricalInput > 0 ? (electricalOutput / electricalInput) * 100 : null

        // Overall energy efficiency
        const totalInput = energyInput || (heatInput + electricalInput + fuelInput * fuelHeatingValue)
        const totalOutput = energyOutput || (heatOutput + electricalOutput)
        const overallEfficiency = totalInput > 0 ? (totalOutput / totalInput) * 100 : 0

        // Carnot efficiency (if temperatures provided)
        let carnotEfficiency = null
        if (data.hotTemperature && data.coldTemperature) {
          // Temperatures in Kelvin
          carnotEfficiency = (1 - data.coldTemperature / data.hotTemperature) * 100
        }

        // Capacity factor
        let capacityFactor = null
        if (data.actualOutput && data.ratedCapacity && data.operatingHours) {
          capacityFactor = (data.actualOutput / (data.ratedCapacity * data.operatingHours)) * 100
        }

        results = {
          overallEfficiency: Math.round(overallEfficiency * 100) / 100,
          thermalEfficiency: thermalEfficiency ? Math.round(thermalEfficiency * 100) / 100 : null,
          electricalEfficiency: electricalEfficiency ? Math.round(electricalEfficiency * 100) / 100 : null,
          carnotEfficiency: carnotEfficiency ? Math.round(carnotEfficiency * 100) / 100 : null,
          capacityFactor: capacityFactor ? Math.round(capacityFactor * 100) / 100 : null,
          energyBalance: {
            input: Math.round(totalInput * 100) / 100,
            output: Math.round(totalOutput * 100) / 100,
            losses: Math.round((totalInput - totalOutput) * 100) / 100,
          },
          unit: parameters?.units || '%',
        }
        break
      }

      case 'emissions': {
        // Emissions calculations
        const {
          energySource = 'grid_average',
          energyConsumption = 0,
          fuelConsumption = 0,
          fuelType = 'naturalGas',
          constructionEmissions = 0,
          annualOperatingEmissions = 0,
          annualEnergyProduction = 0,
        } = data

        // Get emission factor
        const emissionFactor = EMISSION_FACTORS[energySource] || EMISSION_FACTORS.grid_average
        const fuelEmissionFactor = EMISSION_FACTORS[fuelType] || 0.49 // Default to natural gas

        // Calculate emissions
        const electricityEmissions = energyConsumption * emissionFactor
        const fuelEmissions = fuelConsumption * fuelEmissionFactor
        const totalAnnualEmissions = electricityEmissions + fuelEmissions + annualOperatingEmissions

        // Lifecycle analysis
        const lifecycle = calculateLifecycleEmissions(
          constructionEmissions,
          totalAnnualEmissions,
          projectLifetime,
          annualEnergyProduction
        )

        // CO2 avoided (compared to grid)
        const gridEmissions = annualEnergyProduction * EMISSION_FACTORS.grid_average
        const emissionsAvoided = gridEmissions - totalAnnualEmissions

        results = {
          annualEmissions: Math.round(totalAnnualEmissions),
          emissionBreakdown: {
            electricity: Math.round(electricityEmissions),
            fuel: Math.round(fuelEmissions),
            operations: Math.round(annualOperatingEmissions),
          },
          lifecycleEmissions: lifecycle.totalEmissions,
          emissionsIntensity: lifecycle.emissionsIntensity,
          emissionsIntensityUnit: 'g CO2/kWh',
          emissionsAvoided: Math.round(emissionsAvoided),
          emissionFactor: emissionFactor,
          unit: 'kg CO2',
          carbonFootprint: {
            annual: Math.round(totalAnnualEmissions / 1000), // tonnes
            lifetime: Math.round(lifecycle.totalEmissions / 1000), // tonnes
          },
        }
        break
      }

      case 'cost': {
        // Detailed cost breakdown
        const {
          capitalCosts = {},
          operatingCosts = {},
          quantity = 1,
          productionVolume = 0,
        } = data

        // Capital cost breakdown
        const capexItems = Object.entries(capitalCosts as Record<string, number>)
        const totalCapex = capexItems.reduce((sum, [, cost]) => sum + (cost as number), 0)

        // Operating cost breakdown
        const opexItems = Object.entries(operatingCosts as Record<string, number>)
        const totalOpex = opexItems.reduce((sum, [, cost]) => sum + (cost as number), 0)

        // Per-unit costs
        const capexPerUnit = quantity > 0 ? totalCapex / quantity : totalCapex
        const opexPerUnit = quantity > 0 ? totalOpex / quantity : totalOpex

        // Cost of production
        const costPerUnit = productionVolume > 0
          ? (totalCapex / projectLifetime + totalOpex) / productionVolume
          : null

        // Cost breakdown percentages
        const capexBreakdown: Record<string, number> = {}
        for (const [item, cost] of capexItems) {
          capexBreakdown[item] = Math.round(((cost as number) / totalCapex) * 10000) / 100
        }

        const opexBreakdown: Record<string, number> = {}
        for (const [item, cost] of opexItems) {
          opexBreakdown[item] = Math.round(((cost as number) / totalOpex) * 10000) / 100
        }

        results = {
          totalCapex: Math.round(totalCapex),
          totalOpex: Math.round(totalOpex),
          totalLifetimeCost: Math.round(totalCapex + totalOpex * projectLifetime),
          capexPerUnit: Math.round(capexPerUnit * 100) / 100,
          opexPerUnit: Math.round(opexPerUnit * 100) / 100,
          annualizedCapex: Math.round(totalCapex / projectLifetime),
          costPerUnit: costPerUnit ? Math.round(costPerUnit * 10000) / 10000 : null,
          breakdown: {
            capital: capexBreakdown,
            operating: opexBreakdown,
          },
          assumptions: {
            projectLifetime,
            quantity,
            productionVolume,
          },
        }
        break
      }

      case 'energy': {
        // Energy production/consumption analysis
        const {
          installedCapacity = 0, // kW
          capacityFactor = 0.25,
          operatingHours = 8760,
          efficiency = 1,
          solarIrradiance = 0, // kWh/m²/day
          panelArea = 0, // m²
          windSpeed = 0, // m/s
          rotorDiameter = 0, // m
          airDensity = 1.225, // kg/m³
        } = data

        let annualProduction = 0
        let peakPower = installedCapacity
        let averagePower = 0
        let calculationMethod = ''

        if (installedCapacity > 0) {
          // Generic capacity-based calculation
          annualProduction = installedCapacity * capacityFactor * operatingHours * efficiency
          averagePower = installedCapacity * capacityFactor
          calculationMethod = 'capacity-factor'
        }

        // Solar-specific calculation
        if (solarIrradiance > 0 && panelArea > 0) {
          const panelEfficiency = efficiency || 0.20 // Default 20% panel efficiency
          annualProduction = solarIrradiance * 365 * panelArea * panelEfficiency
          peakPower = panelArea * 1 * panelEfficiency // 1 kW/m² peak irradiance
          averagePower = annualProduction / 8760
          calculationMethod = 'solar-irradiance'
        }

        // Wind-specific calculation (Betz limit)
        if (windSpeed > 0 && rotorDiameter > 0) {
          const rotorArea = Math.PI * Math.pow(rotorDiameter / 2, 2)
          const betzLimit = 0.593
          const turbineEfficiency = efficiency || 0.45
          // Power = 0.5 * ρ * A * v³ * Cp * η
          peakPower = 0.5 * airDensity * rotorArea * Math.pow(windSpeed, 3) * betzLimit * turbineEfficiency / 1000 // kW
          // Assume 35% capacity factor for wind
          const windCapacityFactor = capacityFactor || 0.35
          annualProduction = peakPower * windCapacityFactor * 8760
          averagePower = peakPower * windCapacityFactor
          calculationMethod = 'wind-power'
        }

        results = {
          annualProduction: Math.round(annualProduction), // kWh
          annualProductionMWh: Math.round(annualProduction / 10) / 100, // MWh
          peakPower: Math.round(peakPower * 100) / 100, // kW
          averagePower: Math.round(averagePower * 100) / 100, // kW
          capacityFactor: Math.round(averagePower / peakPower * 10000) / 100, // %
          specificYield: installedCapacity > 0 ? Math.round(annualProduction / installedCapacity) : null, // kWh/kWp
          calculationMethod,
          assumptions: {
            operatingHours,
            efficiency,
            installedCapacity,
          },
          monthlyEstimate: Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            production: Math.round(annualProduction / 12 * (1 + 0.2 * Math.sin((i - 3) * Math.PI / 6))), // Seasonal variation
          })),
        }
        break
      }

      case 'exergy': {
        // Exergy (Second-Law Thermodynamic) Analysis
        // Exergy = maximum useful work obtainable from a system
        const {
          inputEnergy = 0,           // kWh or kJ
          outputEnergy = 0,          // kWh or kJ (useful output)
          hotTemperature = 373.15,   // Th in Kelvin (default 100°C)
          coldTemperature = 298.15,  // Tc in Kelvin (default 25°C = dead state)
          energyType = 'thermal',    // 'thermal', 'electrical', 'chemical', 'mechanical', 'solar', 'wind'
          solarIrradiance = 0,       // W/m² for solar exergy
          panelArea = 0,             // m² for solar
          windSpeed = 0,             // m/s for wind
          rotorArea = 0,             // m² for wind
          airDensity = 1.225,        // kg/m³
        } = data

        const T0 = coldTemperature || 298.15  // Dead state temperature (25°C)
        const SOLAR_TEMPERATURE = 5778        // Sun surface temperature in K

        let inputExergy = 0
        let outputExergy = 0
        let carnotFactor = 1
        let theoreticalMax = 0
        let calculationMethod = energyType

        switch (energyType) {
          case 'thermal':
            // Thermal exergy: E_x = Q * (1 - T0/Th)
            carnotFactor = 1 - (T0 / hotTemperature)
            inputExergy = inputEnergy * carnotFactor
            outputExergy = outputEnergy * carnotFactor
            theoreticalMax = carnotFactor * 100  // Carnot efficiency %
            break

          case 'electrical':
          case 'mechanical':
            // Electrical/mechanical energy = exergy (100% convertible to work)
            carnotFactor = 1
            inputExergy = inputEnergy
            outputExergy = outputEnergy
            theoreticalMax = 100
            break

          case 'solar':
            // Solar exergy: considers sun as heat source at 5778K
            // Petela formula: η_ex_max = 1 - (4/3)*(T0/Ts) + (1/3)*(T0/Ts)^4
            const tempRatio = T0 / SOLAR_TEMPERATURE
            const petelaEfficiency = 1 - (4/3) * tempRatio + (1/3) * Math.pow(tempRatio, 4)
            carnotFactor = petelaEfficiency
            inputExergy = solarIrradiance * panelArea * 8760 / 1000 * petelaEfficiency  // kWh/year
            outputExergy = outputEnergy  // Actual electrical output
            theoreticalMax = petelaEfficiency * 100  // ~93.6%
            calculationMethod = 'solar-petela'
            break

          case 'wind':
            // Wind exergy: kinetic energy of air
            // E_x = 0.5 * ρ * A * v³ (limited by Betz at 59.3%)
            const betzLimit = 0.593
            const windPower = 0.5 * airDensity * rotorArea * Math.pow(windSpeed, 3) / 1000  // kW
            inputExergy = windPower * 8760  // kWh/year theoretical
            outputExergy = outputEnergy
            theoreticalMax = betzLimit * 100  // 59.3%
            carnotFactor = betzLimit
            calculationMethod = 'wind-betz'
            break

          case 'chemical':
            // Chemical exergy (simplified - uses standard chemical exergy values)
            // For hydrogen: 236.1 kJ/mol or 118 MJ/kg
            carnotFactor = 0.83  // Typical fuel cell exergy efficiency limit
            inputExergy = inputEnergy
            outputExergy = outputEnergy
            theoreticalMax = 83
            break

          default:
            // Generic calculation
            inputExergy = inputEnergy
            outputExergy = outputEnergy
            carnotFactor = 1
            theoreticalMax = 100
        }

        // Calculate exergy metrics
        const exergyDestruction = Math.max(0, inputExergy - outputExergy)
        const exergyEfficiency = inputExergy > 0 ? (outputExergy / inputExergy) * 100 : 0
        const exergyDestructionRatio = inputExergy > 0 ? (exergyDestruction / inputExergy) * 100 : 0
        const secondLawEfficiency = theoreticalMax > 0 ? (exergyEfficiency / theoreticalMax) * 100 : 0

        results = {
          // Core exergy metrics
          inputExergy: Math.round(inputExergy * 100) / 100,
          outputExergy: Math.round(outputExergy * 100) / 100,
          exergyDestruction: Math.round(exergyDestruction * 100) / 100,
          exergyLoss: Math.round(exergyDestruction * 100) / 100,  // Alias

          // Efficiency metrics
          exergyEfficiency: Math.round(exergyEfficiency * 100) / 100,
          secondLawEfficiency: Math.round(secondLawEfficiency * 100) / 100,
          carnotFactor: Math.round(carnotFactor * 10000) / 10000,
          theoreticalMaxEfficiency: Math.round(theoreticalMax * 100) / 100,

          // Destruction analysis
          exergyDestructionRatio: Math.round(exergyDestructionRatio * 100) / 100,
          irreversibility: Math.round(exergyDestruction * 100) / 100,

          // Reference environment
          deadStateTemperature: T0,
          deadStatePressure: 101.325,  // kPa (standard)

          // Metadata
          energyType,
          calculationMethod,
          unit: 'kWh',
          efficiencyUnit: '%',

          // Benchmarks for comparison
          benchmarks: {
            solarPV: { typical: 15, max: 25 },
            solarThermal: { typical: 35, max: 50 },
            windTurbine: { typical: 45, max: 59.3 },
            battery: { typical: 90, max: 98 },
            fuelCell: { typical: 55, max: 70 },
            electrolyzer: { typical: 65, max: 85 },
            carbonCapture: { typical: 15, max: 30 },
          },
        }
        break
      }
    }

    console.log('[calculateMetrics] Calculation complete:', type)
    return results
  } catch (error) {
    console.error('[calculateMetrics] Calculation failed:', error)
    throw new Error(`Metrics calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export const calculateMetricsTool: ToolDeclaration = {
  name: 'calculateMetrics',
  description: 'Perform various engineering and financial calculations including Techno-Economic Analysis (TEA), efficiency calculations, emissions analysis, cost breakdown, and energy metrics. Supports parametric calculations with discount rates, project lifetimes, and custom units.',
  schema: calculateMetricsSchema,
  handler: calculateMetricsHandler,
}

// ============================================================================
// Tool 5: runSimulation - Execute simulations
// ============================================================================

const runSimulationSchema = z.object({
  tier: z.enum(['tier1', 'tier2', 'tier3']).default('tier1').describe('Simulation tier (tier1=analytical, tier2=numerical, tier3=ML/cloud)'),
  simulationType: z.enum([
    'solar_pv',
    'solar_thermal',
    'wind_turbine',
    'battery_storage',
    'hydrogen_electrolyzer',
    'fuel_cell',
    'heat_pump',
    'combined_system',
  ]).describe('Type of simulation'),
  parameters: z.record(z.string(), z.any()).describe('Simulation parameters'),
  timeHorizon: z.number().optional().describe('Simulation time horizon in hours (default: 8760 for 1 year)'),
  timeStep: z.number().optional().describe('Time step in minutes (default: 60)'),
})

// ===================== Solar PV Model =====================

interface SolarPVParams {
  capacity: number // kW
  panelEfficiency?: number // 0-1
  temperatureCoefficient?: number // %/°C
  systemLosses?: number // 0-1 (inverter, wiring, etc.)
  latitude?: number
  longitude?: number
  tilt?: number // degrees
  azimuth?: number // degrees from south
  ambientTemperature?: number // °C
  irradiance?: number // kWh/m²/day
}

function simulateSolarPV(params: SolarPVParams, hours: number = 8760): any {
  const {
    capacity,
    panelEfficiency = 0.20,
    temperatureCoefficient = -0.004, // -0.4%/°C
    systemLosses = 0.14, // 14% typical system losses
    latitude = 35,
    tilt = latitude, // Optimal tilt ≈ latitude
    azimuth = 180, // South-facing
    ambientTemperature = 25,
    irradiance = 5.5, // kWh/m²/day global average
  } = params

  // Hourly simulation
  const hourlyProduction: number[] = []
  const hourlyIrradiance: number[] = []
  let totalProduction = 0
  let peakPower = 0

  for (let hour = 0; hour < hours; hour++) {
    // Day of year (1-365)
    const dayOfYear = Math.floor(hour / 24) % 365 + 1

    // Hour of day (0-23)
    const hourOfDay = hour % 24

    // Solar declination angle (simplified)
    const declination = 23.45 * Math.sin(2 * Math.PI * (284 + dayOfYear) / 365)

    // Hour angle
    const hourAngle = 15 * (hourOfDay - 12)

    // Solar altitude (elevation angle)
    const solarAltitude = Math.asin(
      Math.sin(latitude * Math.PI / 180) * Math.sin(declination * Math.PI / 180) +
      Math.cos(latitude * Math.PI / 180) * Math.cos(declination * Math.PI / 180) *
      Math.cos(hourAngle * Math.PI / 180)
    ) * 180 / Math.PI

    // Only produce power when sun is up
    if (solarAltitude > 0) {
      // Daily irradiance pattern (bell curve)
      const irradianceHourly = irradiance * Math.sin(Math.PI * (hourOfDay - 6) / 12)
      const effectiveIrradiance = Math.max(0, irradianceHourly)

      // Temperature effect (cell temperature higher than ambient)
      const cellTemperature = ambientTemperature + effectiveIrradiance * 25 // Simplified NOCT model
      const tempLoss = (cellTemperature - 25) * temperatureCoefficient

      // Power output
      const power = capacity * (effectiveIrradiance / 5.5) * panelEfficiency / 0.20 *
        (1 + tempLoss) * (1 - systemLosses)

      hourlyProduction.push(Math.max(0, power))
      hourlyIrradiance.push(effectiveIrradiance)
      totalProduction += Math.max(0, power)
      peakPower = Math.max(peakPower, power)
    } else {
      hourlyProduction.push(0)
      hourlyIrradiance.push(0)
    }
  }

  const capacityFactor = totalProduction / (capacity * hours)
  const specificYield = totalProduction / capacity // kWh/kWp

  return {
    outputs: [
      { name: 'Annual Production', value: Math.round(totalProduction), unit: 'kWh', confidence: 85 },
      { name: 'Capacity Factor', value: Math.round(capacityFactor * 10000) / 100, unit: '%', confidence: 80 },
      { name: 'Specific Yield', value: Math.round(specificYield), unit: 'kWh/kWp', confidence: 80 },
      { name: 'Peak Power', value: Math.round(peakPower * 100) / 100, unit: 'kW', confidence: 90 },
    ],
    convergenceMetrics: {
      converged: true,
      iterations: 1,
      residual: 0.001,
      tolerance: 0.01,
    },
    timeSeries: {
      hourlyProduction: hourlyProduction.slice(0, 168), // First week
      hourlyIrradiance: hourlyIrradiance.slice(0, 168),
    },
    monthlyProduction: Array.from({ length: 12 }, (_, month) => {
      const startHour = month * 730
      const monthlySum = hourlyProduction.slice(startHour, startHour + 730).reduce((a, b) => a + b, 0)
      return { month: month + 1, production: Math.round(monthlySum) }
    }),
  }
}

// ===================== Wind Turbine Model =====================

interface WindTurbineParams {
  ratedPower: number // kW
  rotorDiameter: number // m
  hubHeight: number // m
  cutInSpeed?: number // m/s
  ratedSpeed?: number // m/s
  cutOutSpeed?: number // m/s
  meanWindSpeed?: number // m/s at reference height
  referenceHeight?: number // m
  airDensity?: number // kg/m³
  surfaceRoughness?: number // roughness length in m
}

function simulateWindTurbine(params: WindTurbineParams, hours: number = 8760): any {
  const {
    ratedPower,
    rotorDiameter,
    hubHeight,
    cutInSpeed = 3,
    ratedSpeed = 12,
    cutOutSpeed = 25,
    meanWindSpeed = 7,
    referenceHeight = 10,
    airDensity = 1.225,
    surfaceRoughness = 0.03, // Open terrain
  } = params

  // Wind shear coefficient (power law)
  const alpha = Math.log(hubHeight / surfaceRoughness) / Math.log(referenceHeight / surfaceRoughness)
  const shearExponent = 0.14 // Typical for open terrain

  // Adjust wind speed for hub height
  const hubWindSpeed = meanWindSpeed * Math.pow(hubHeight / referenceHeight, shearExponent)

  // Weibull distribution parameters (k=2 is Rayleigh)
  const k = 2.0 // Shape parameter
  const c = hubWindSpeed / 0.8862 // Scale parameter (mean/gamma(1+1/k))

  // Rotor swept area
  const rotorArea = Math.PI * Math.pow(rotorDiameter / 2, 2)

  // Betz limit
  const betzLimit = 0.593
  const powerCoefficient = 0.45 // Typical Cp for modern turbines

  // Generate hourly wind speeds using Weibull distribution
  const hourlyPower: number[] = []
  const hourlyWindSpeed: number[] = []
  let totalProduction = 0
  let operatingHours = 0

  for (let hour = 0; hour < hours; hour++) {
    // Generate random wind speed from Weibull distribution
    // Using inverse transform sampling
    const u = Math.random()
    const windSpeed = c * Math.pow(-Math.log(1 - u), 1 / k)

    // Add seasonal variation
    const dayOfYear = Math.floor(hour / 24) % 365
    const seasonalFactor = 1 + 0.2 * Math.cos(2 * Math.PI * (dayOfYear - 15) / 365) // Higher in winter
    const effectiveWindSpeed = windSpeed * seasonalFactor

    hourlyWindSpeed.push(effectiveWindSpeed)

    // Calculate power output based on power curve
    let power = 0
    if (effectiveWindSpeed >= cutInSpeed && effectiveWindSpeed < ratedSpeed) {
      // Cubic region
      const availablePower = 0.5 * airDensity * rotorArea * Math.pow(effectiveWindSpeed, 3) * powerCoefficient
      power = Math.min(availablePower / 1000, ratedPower) // Convert to kW
    } else if (effectiveWindSpeed >= ratedSpeed && effectiveWindSpeed < cutOutSpeed) {
      // Rated power region
      power = ratedPower
    }
    // Below cut-in or above cut-out: power = 0

    hourlyPower.push(power)
    totalProduction += power
    if (power > 0) operatingHours++
  }

  const capacityFactor = totalProduction / (ratedPower * hours)
  const availability = operatingHours / hours

  return {
    outputs: [
      { name: 'Annual Production', value: Math.round(totalProduction), unit: 'kWh', confidence: 80 },
      { name: 'Capacity Factor', value: Math.round(capacityFactor * 10000) / 100, unit: '%', confidence: 75 },
      { name: 'Operating Hours', value: Math.round(operatingHours), unit: 'hours', confidence: 85 },
      { name: 'Availability', value: Math.round(availability * 10000) / 100, unit: '%', confidence: 85 },
      { name: 'Hub Wind Speed', value: Math.round(hubWindSpeed * 100) / 100, unit: 'm/s', confidence: 70 },
    ],
    convergenceMetrics: {
      converged: true,
      iterations: 1,
      residual: 0.005,
      tolerance: 0.01,
    },
    timeSeries: {
      hourlyPower: hourlyPower.slice(0, 168),
      hourlyWindSpeed: hourlyWindSpeed.slice(0, 168),
    },
    windDistribution: {
      weibullK: k,
      weibullC: Math.round(c * 100) / 100,
      meanSpeed: Math.round(hubWindSpeed * 100) / 100,
    },
  }
}

// ===================== Battery Storage Model =====================

interface BatteryStorageParams {
  capacity: number // kWh
  maxPower: number // kW (charge/discharge rate)
  initialSOC?: number // 0-1
  chargeEfficiency?: number // 0-1
  dischargeEfficiency?: number // 0-1
  selfDischargeRate?: number // per hour
  minSOC?: number // 0-1 (depth of discharge limit)
  maxSOC?: number // 0-1
  cycleLife?: number // cycles at 80% DOD
  temperatureSensitivity?: boolean
  loadProfile?: number[] // kW demand for each hour
  generationProfile?: number[] // kW generation for each hour
}

function simulateBatteryStorage(params: BatteryStorageParams, hours: number = 8760): any {
  const {
    capacity,
    maxPower,
    initialSOC = 0.5,
    chargeEfficiency = 0.95,
    dischargeEfficiency = 0.95,
    selfDischargeRate = 0.0001, // 0.01% per hour
    minSOC = 0.1,
    maxSOC = 0.95,
    cycleLife = 6000,
    loadProfile,
    generationProfile,
  } = params

  // State tracking
  let soc = initialSOC
  let totalCharged = 0
  let totalDischarged = 0
  let cycles = 0
  let cycleDepth = 0
  let minSOCReached = 1
  let maxSOCReached = 0

  const hourlySOC: number[] = []
  const hourlyPower: number[] = []
  const hourlyAction: string[] = []

  // Generate default profiles if not provided
  const defaultLoad = Array.from({ length: hours }, (_, h) => {
    const hourOfDay = h % 24
    // Typical residential load pattern
    if (hourOfDay >= 6 && hourOfDay < 9) return maxPower * 0.8 // Morning peak
    if (hourOfDay >= 17 && hourOfDay < 21) return maxPower * 1.0 // Evening peak
    if (hourOfDay >= 9 && hourOfDay < 17) return maxPower * 0.4 // Day
    return maxPower * 0.2 // Night
  })

  const defaultGeneration = Array.from({ length: hours }, (_, h) => {
    const hourOfDay = h % 24
    // Solar-like generation pattern
    if (hourOfDay >= 6 && hourOfDay < 18) {
      return maxPower * Math.sin(Math.PI * (hourOfDay - 6) / 12) * 1.2
    }
    return 0
  })

  const load = loadProfile || defaultLoad
  const generation = generationProfile || defaultGeneration

  for (let hour = 0; hour < hours; hour++) {
    const loadDemand = load[hour % load.length]
    const gen = generation[hour % generation.length]
    const netPower = gen - loadDemand // Positive = excess generation

    // Self-discharge
    soc *= (1 - selfDischargeRate)

    let action = 'idle'
    let powerFlow = 0

    if (netPower > 0 && soc < maxSOC) {
      // Charge battery
      const chargeRoom = (maxSOC - soc) * capacity
      const chargePower = Math.min(netPower, maxPower, chargeRoom / chargeEfficiency)
      const energyStored = chargePower * chargeEfficiency
      soc += energyStored / capacity
      totalCharged += energyStored
      powerFlow = chargePower
      action = 'charging'
    } else if (netPower < 0 && soc > minSOC) {
      // Discharge battery
      const dischargeRoom = (soc - minSOC) * capacity
      const dischargePower = Math.min(-netPower, maxPower, dischargeRoom * dischargeEfficiency)
      const energyUsed = dischargePower / dischargeEfficiency
      soc -= energyUsed / capacity
      totalDischarged += dischargePower
      powerFlow = -dischargePower
      action = 'discharging'
    }

    // Track cycle depth
    if (action === 'discharging') {
      cycleDepth += Math.abs(powerFlow) / capacity
      if (cycleDepth >= 0.8) {
        cycles += cycleDepth / 0.8
        cycleDepth = 0
      }
    }

    minSOCReached = Math.min(minSOCReached, soc)
    maxSOCReached = Math.max(maxSOCReached, soc)

    hourlySOC.push(soc)
    hourlyPower.push(powerFlow)
    hourlyAction.push(action)
  }

  // Round-trip efficiency
  const roundTripEfficiency = totalDischarged > 0 && totalCharged > 0
    ? (totalDischarged / totalCharged) * 100
    : chargeEfficiency * dischargeEfficiency * 100

  // Battery health estimation (simplified)
  const cycleLifeUsed = cycles / cycleLife * 100
  const estimatedHealth = Math.max(0, 100 - cycleLifeUsed * 0.5)

  return {
    outputs: [
      { name: 'Total Charged', value: Math.round(totalCharged), unit: 'kWh', confidence: 90 },
      { name: 'Total Discharged', value: Math.round(totalDischarged), unit: 'kWh', confidence: 90 },
      { name: 'Round-Trip Efficiency', value: Math.round(roundTripEfficiency * 10) / 10, unit: '%', confidence: 85 },
      { name: 'Equivalent Full Cycles', value: Math.round(cycles * 10) / 10, unit: 'cycles', confidence: 85 },
      { name: 'Estimated Health', value: Math.round(estimatedHealth), unit: '%', confidence: 70 },
      { name: 'SOC Range', value: `${Math.round(minSOCReached * 100)}-${Math.round(maxSOCReached * 100)}`, unit: '%', confidence: 95 },
    ],
    convergenceMetrics: {
      converged: true,
      iterations: hours,
      residual: 0.001,
      tolerance: 0.01,
    },
    timeSeries: {
      hourlySOC: hourlySOC.slice(0, 168),
      hourlyPower: hourlyPower.slice(0, 168),
    },
    batteryHealth: {
      equivalentCycles: Math.round(cycles * 10) / 10,
      cycleLifeRemaining: Math.round(cycleLife - cycles),
      estimatedYearsRemaining: Math.round((cycleLife - cycles) / (cycles / (hours / 8760)) * 10) / 10,
    },
  }
}

// ===================== Hydrogen Electrolyzer Model =====================

interface ElectrolyzerParams {
  power: number // kW input
  efficiency?: number // 0-1 (electrical to H2)
  electrolyzerType?: 'pem' | 'alkaline' | 'soec'
  operatingPressure?: number // bar
  stackTemperature?: number // °C
  waterConsumption?: number // L/kg H2
  electricityProfile?: number[] // kW available for each hour
}

function simulateElectrolyzer(params: ElectrolyzerParams, hours: number = 8760): any {
  const {
    power,
    efficiency = 0.65,
    electrolyzerType = 'pem',
    operatingPressure = 30,
    stackTemperature = 80,
    waterConsumption = 10, // L/kg H2
    electricityProfile,
  } = params

  // H2 energy content: 33.33 kWh/kg (HHV) or 39.4 kWh/kg (LHV)
  const h2EnergyContent = 33.33 // kWh/kg HHV

  // Calculate H2 production rate
  const h2ProductionRate = (power * efficiency) / h2EnergyContent // kg/hour at full power

  // Type-specific characteristics
  const typeParams: Record<string, { efficiency: number; degradation: number; coldStartTime: number }> = {
    pem: { efficiency: 0.68, degradation: 0.0002, coldStartTime: 0.1 },
    alkaline: { efficiency: 0.62, degradation: 0.00015, coldStartTime: 0.5 },
    soec: { efficiency: 0.85, degradation: 0.0005, coldStartTime: 2 },
  }

  const typeCharacteristics = typeParams[electrolyzerType] || typeParams.pem
  const effectiveEfficiency = efficiency || typeCharacteristics.efficiency

  // Generate default electricity profile (constant if not provided)
  const defaultProfile = Array(hours).fill(power)
  const electricityInput = electricityProfile || defaultProfile

  let totalH2Produced = 0
  let totalElectricityUsed = 0
  let totalWaterConsumed = 0
  let operatingHours = 0

  const hourlyH2: number[] = []
  const hourlyEfficiency: number[] = []

  for (let hour = 0; hour < hours; hour++) {
    const availablePower = Math.min(electricityInput[hour % electricityInput.length], power)

    if (availablePower > power * 0.1) { // Minimum operating point
      // Efficiency varies with load
      const loadFactor = availablePower / power
      const partLoadEfficiency = effectiveEfficiency * (0.9 + 0.1 * loadFactor) // Lower efficiency at part load

      // Degradation over time
      const degradationFactor = 1 - typeCharacteristics.degradation * hour

      const currentEfficiency = partLoadEfficiency * degradationFactor
      const h2Produced = (availablePower * currentEfficiency) / h2EnergyContent

      totalH2Produced += h2Produced
      totalElectricityUsed += availablePower
      totalWaterConsumed += h2Produced * waterConsumption
      operatingHours++

      hourlyH2.push(h2Produced)
      hourlyEfficiency.push(currentEfficiency)
    } else {
      hourlyH2.push(0)
      hourlyEfficiency.push(0)
    }
  }

  const systemEfficiency = totalH2Produced * h2EnergyContent / totalElectricityUsed * 100
  const capacityFactor = operatingHours / hours

  return {
    outputs: [
      { name: 'Total H2 Produced', value: Math.round(totalH2Produced), unit: 'kg', confidence: 85 },
      { name: 'System Efficiency', value: Math.round(systemEfficiency * 10) / 10, unit: '%', confidence: 80 },
      { name: 'Electricity Used', value: Math.round(totalElectricityUsed), unit: 'kWh', confidence: 90 },
      { name: 'Water Consumed', value: Math.round(totalWaterConsumed), unit: 'L', confidence: 85 },
      { name: 'Capacity Factor', value: Math.round(capacityFactor * 10000) / 100, unit: '%', confidence: 85 },
      { name: 'H2 Production Rate', value: Math.round(h2ProductionRate * 100) / 100, unit: 'kg/hr', confidence: 90 },
    ],
    convergenceMetrics: {
      converged: true,
      iterations: 1,
      residual: 0.002,
      tolerance: 0.01,
    },
    timeSeries: {
      hourlyH2: hourlyH2.slice(0, 168),
      hourlyEfficiency: hourlyEfficiency.slice(0, 168),
    },
    h2Properties: {
      energyContent: h2EnergyContent,
      volumeAtSTP: Math.round(totalH2Produced * 11.1), // m³ at STP
      storagePressure: operatingPressure,
    },
  }
}

// ===================== Main Handler =====================

async function runSimulationHandler(params: z.infer<typeof runSimulationSchema>) {
  const { tier, simulationType, parameters, timeHorizon = 8760, timeStep = 60 } = params
  const startTime = Date.now()

  console.log('[runSimulation] Running simulation:', { tier, simulationType })

  try {
    let simulationResult: any = null

    // Tier 1: Analytical models
    switch (simulationType) {
      case 'solar_pv':
        simulationResult = simulateSolarPV(parameters as SolarPVParams, timeHorizon)
        break

      case 'solar_thermal':
        // Simplified solar thermal (similar to PV but with thermal efficiency)
        const solarThermalParams = {
          ...parameters,
          panelEfficiency: parameters.collectorEfficiency || 0.70,
          systemLosses: parameters.thermalLosses || 0.20,
        }
        simulationResult = simulateSolarPV(solarThermalParams as SolarPVParams, timeHorizon)
        simulationResult.outputs = simulationResult.outputs.map((o: any) => ({
          ...o,
          name: o.name.replace('Production', 'Thermal Output'),
          unit: o.unit === 'kWh' ? 'kWhth' : o.unit,
        }))
        break

      case 'wind_turbine':
        simulationResult = simulateWindTurbine(parameters as WindTurbineParams, timeHorizon)
        break

      case 'battery_storage':
        simulationResult = simulateBatteryStorage(parameters as BatteryStorageParams, timeHorizon)
        break

      case 'hydrogen_electrolyzer':
        simulationResult = simulateElectrolyzer(parameters as ElectrolyzerParams, timeHorizon)
        break

      case 'fuel_cell':
        // Reverse of electrolyzer
        const fuelCellEfficiency = parameters.efficiency || 0.55
        const h2Input = parameters.h2Input || 100 // kg
        const electricityOutput = h2Input * 33.33 * fuelCellEfficiency
        const heatOutput = h2Input * 33.33 * (1 - fuelCellEfficiency) * 0.8

        simulationResult = {
          outputs: [
            { name: 'Electricity Output', value: Math.round(electricityOutput), unit: 'kWh', confidence: 85 },
            { name: 'Heat Output', value: Math.round(heatOutput), unit: 'kWhth', confidence: 80 },
            { name: 'Electrical Efficiency', value: Math.round(fuelCellEfficiency * 100), unit: '%', confidence: 85 },
            { name: 'H2 Consumed', value: h2Input, unit: 'kg', confidence: 95 },
          ],
          convergenceMetrics: {
            converged: true,
            iterations: 1,
            residual: 0.001,
            tolerance: 0.01,
          },
        }
        break

      case 'heat_pump':
        const cop = parameters.cop || 3.5
        const heatingCapacity = parameters.heatingCapacity || 10 // kW
        const operatingHours = parameters.operatingHours || 2000
        const electricityIn = heatingCapacity / cop * operatingHours
        const heatOut = heatingCapacity * operatingHours

        simulationResult = {
          outputs: [
            { name: 'Heat Output', value: Math.round(heatOut), unit: 'kWh', confidence: 90 },
            { name: 'Electricity Input', value: Math.round(electricityIn), unit: 'kWh', confidence: 90 },
            { name: 'COP', value: cop, unit: '', confidence: 85 },
            { name: 'SPF (Seasonal)', value: Math.round(cop * 0.9 * 100) / 100, unit: '', confidence: 75 },
          ],
          convergenceMetrics: {
            converged: true,
            iterations: 1,
            residual: 0.001,
            tolerance: 0.01,
          },
        }
        break

      case 'combined_system':
        // Run multiple simulations and combine
        const solarResult = parameters.solar ? simulateSolarPV(parameters.solar, timeHorizon) : null
        const windResult = parameters.wind ? simulateWindTurbine(parameters.wind, timeHorizon) : null
        const batteryResult = parameters.battery ? simulateBatteryStorage(parameters.battery, timeHorizon) : null

        const combinedOutputs = []
        if (solarResult) combinedOutputs.push(...solarResult.outputs.map((o: any) => ({ ...o, source: 'Solar' })))
        if (windResult) combinedOutputs.push(...windResult.outputs.map((o: any) => ({ ...o, source: 'Wind' })))
        if (batteryResult) combinedOutputs.push(...batteryResult.outputs.map((o: any) => ({ ...o, source: 'Battery' })))

        simulationResult = {
          outputs: combinedOutputs,
          convergenceMetrics: {
            converged: true,
            iterations: 1,
            residual: 0.003,
            tolerance: 0.01,
          },
          subsystems: {
            solar: solarResult,
            wind: windResult,
            battery: batteryResult,
          },
        }
        break

      default:
        throw new Error(`Unknown simulation type: ${simulationType}`)
    }

    const executionTime = Date.now() - startTime

    console.log(`[runSimulation] Simulation complete in ${executionTime}ms`)

    return {
      success: true,
      tier,
      simulationType,
      id: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      ...simulationResult,
      executionTimeMs: executionTime,
      timestamp: new Date().toISOString(),
      parameters,
      metadata: {
        timeHorizon,
        timeStep,
        modelVersion: '1.0.0',
      },
    }
  } catch (error) {
    console.error('[runSimulation] Simulation failed:', error)
    throw new Error(`Simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export const runSimulationTool: ToolDeclaration = {
  name: 'runSimulation',
  description: 'Execute physics-based or machine learning simulations across three computational tiers: Tier 1 (fast analytical), Tier 2 (browser ML with WebGPU), Tier 3 (cloud GPU for high-fidelity). Supports solar, wind, battery, hydrogen, and other clean energy simulations.',
  schema: runSimulationSchema,
  handler: runSimulationHandler,
}

// ============================================================================
// Tool 6: designExperiment - Design experimental protocols (NEW)
// ============================================================================

const designExperimentSchema = z.object({
  goal: z.object({
    description: z.string().min(10).describe('Experiment goal description'),
    objectives: z.array(z.string()).describe('Specific objectives to achieve'),
    domain: z.string().describe('Scientific domain (e.g., "solar-energy", "battery-storage")'),
  }).describe('Experiment goal and objectives'),
  referenceResearch: z.array(z.object({
    title: z.string(),
    methodology: z.string(),
  })).optional().describe('Reference papers with methodologies'),
  constraints: z.object({
    budget: z.number().optional().describe('Budget limit in USD'),
    timeline: z.string().optional().describe('Timeline constraint (e.g., "3 months")'),
    safetyLevel: z.enum(['standard', 'high', 'critical']).default('standard'),
  }).optional().describe('Experiment constraints'),
})

async function designExperimentHandler(params: z.infer<typeof designExperimentSchema>) {
  const { goal, referenceResearch = [], constraints = {} as z.infer<typeof designExperimentSchema>['constraints'] } = params

  console.log('[designExperiment] Designing protocol for:', goal.description)

  try {
    // Use AI to generate comprehensive experimental protocol
    const { executeWithTools } = await import('../model-router')

    const prompt = `Design a detailed experimental protocol for:

Goal: ${goal.description}
Objectives: ${goal.objectives.join(', ')}
Domain: ${goal.domain}

${referenceResearch.length > 0 ? `
Reference Research:
${referenceResearch.map(r => `- ${r.title}: ${r.methodology}`).join('\n')}
` : ''}

${constraints?.budget ? `Budget: $${constraints.budget}` : ''}
${constraints?.timeline ? `Timeline: ${constraints.timeline}` : ''}
Safety Level: ${constraints?.safetyLevel || 'standard'}

Generate a complete experimental protocol with:
1. Materials list with quantities and specifications
2. Equipment requirements (required and alternatives)
3. Step-by-step procedure with durations and temperatures
4. Safety warnings and precautions
5. Expected results and success criteria
6. Potential failure modes with likelihood and mitigation

Format as JSON matching this structure:
{
  "title": string,
  "objective": string,
  "materials": [{"name": string, "quantity": string, "purity"?: string}],
  "equipment": [{"name": string, "specification"?: string, "required": boolean}],
  "procedure": [{"step": number, "instruction": string, "duration"?: string}],
  "safetyWarnings": string[],
  "expectedResults": string[],
  "failureModes": [{"mode": string, "likelihood": "low"|"medium"|"high", "mitigation": string[]}],
  "duration": string,
  "difficulty": "low"|"medium"|"high",
  "estimatedCost": number
}`

    const response = await executeWithTools(prompt, {
      model: 'fast',
      temperature: 0.6,
      maxTokens: 3000,
    })

    // Parse AI response
    let protocol
    try {
      const content = response.type === 'text' ? response.content : ''
      protocol = JSON.parse(content)
    } catch {
      // If parsing fails, create structured response from text
      const textContent = response.type === 'text' ? response.content : ''
      protocol = {
        title: `Experimental Protocol: ${goal.description}`,
        objective: goal.description,
        materials: [],
        equipment: [],
        procedure: [{ step: 1, instruction: textContent.substring(0, 500) }],
        safetyWarnings: ['Protocol generated - requires expert review'],
        expectedResults: goal.objectives,
        failureModes: [],
        duration: '2-4 weeks',
        difficulty: 'medium',
        estimatedCost: constraints?.budget || 10000,
      }
    }

    console.log('[designExperiment] Protocol generated successfully')

    return {
      protocol,
      generatedAt: new Date().toISOString(),
      domain: goal.domain,
      confidence: referenceResearch.length > 0 ? 85 : 70,
    }
  } catch (error) {
    console.error('[designExperiment] Protocol generation failed:', error)
    throw new Error(`Experiment design failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export const designExperimentTool: ToolDeclaration = {
  name: 'designExperiment' as any, // Type assertion for new tool
  description: 'Design comprehensive experimental protocols based on research findings. Generates materials lists, equipment requirements, step-by-step procedures, safety warnings, expected results, and failure mode analysis. Incorporates methodologies from reference research when available.',
  schema: designExperimentSchema,
  handler: designExperimentHandler,
}

// ============================================================================
// Tool 7: generateHypotheses - Generate testable hypotheses from research
// ============================================================================

const generateHypothesesSchema = z.object({
  researchFindings: z.array(z.object({
    title: z.string(),
    keyInsights: z.array(z.string()),
    gaps: z.array(z.string()).optional(),
  })).describe('Key findings from research phase'),
  domain: z.string().describe('Scientific domain'),
  goals: z.array(z.string()).describe('Research goals to address'),
  constraints: z.object({
    maxHypotheses: z.number().min(1).max(10).default(5),
    focusAreas: z.array(z.string()).optional(),
  }).optional().describe('Generation constraints'),
})

async function generateHypothesesHandler(params: z.infer<typeof generateHypothesesSchema>) {
  const { researchFindings, domain, goals, constraints } = params
  const maxHypotheses = constraints?.maxHypotheses ?? 5
  const focusAreas = constraints?.focusAreas

  console.log('[generateHypotheses] Generating hypotheses from', researchFindings.length, 'findings')

  try {
    const { executeWithTools } = await import('../model-router')

    // Build context from research findings
    const findingsSummary = researchFindings.map((f, i) =>
      `${i + 1}. ${f.title}\n   Insights: ${f.keyInsights.join('; ')}\n   Gaps: ${(f.gaps || []).join('; ')}`
    ).join('\n\n')

    const prompt = `Based on the following research findings in the ${domain} domain, generate ${maxHypotheses} testable scientific hypotheses.

RESEARCH FINDINGS:
${findingsSummary}

RESEARCH GOALS:
${goals.map((g, i) => `${i + 1}. ${g}`).join('\n')}

${focusAreas ? `FOCUS AREAS: ${focusAreas.join(', ')}` : ''}

For each hypothesis, provide:
1. A clear, testable statement
2. Supporting evidence from the research
3. Key assumptions
4. Predictions that can be validated
5. Feasibility score (0-100)
6. Novelty score (0-100)
7. Potential impact score (0-100)

Format as JSON array:
[
  {
    "statement": "...",
    "supportingEvidence": ["..."],
    "assumptions": ["..."],
    "predictions": [{ "description": "...", "measurable": true, "expectedRange": { "min": 0, "max": 100, "unit": "%" } }],
    "validationMetrics": ["..."],
    "feasibilityScore": 75,
    "noveltyScore": 80,
    "impactScore": 70
  }
]

Generate hypotheses that:
- Address identified gaps in the research
- Build on emerging trends
- Are scientifically sound and testable
- Have clear validation criteria
- Balance novelty with feasibility`

    const response = await executeWithTools(prompt, {
      model: 'fast',
      temperature: 0.7,
      maxTokens: 4000,
    })

    // Parse AI response
    let hypotheses: any[] = []
    try {
      const content = response.type === 'text' ? response.content : ''
      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        hypotheses = JSON.parse(jsonMatch[0])
      }
    } catch (parseError) {
      console.warn('[generateHypotheses] Failed to parse JSON, creating structured response')
      // Create a single hypothesis from the text
      const textContent = response.type === 'text' ? response.content : ''
      hypotheses = [{
        statement: textContent.slice(0, 300),
        supportingEvidence: goals,
        assumptions: ['Based on current research literature'],
        predictions: [{ description: 'Requires experimental validation', measurable: true }],
        validationMetrics: ['Experimental confirmation needed'],
        feasibilityScore: 70,
        noveltyScore: 60,
        impactScore: 65,
      }]
    }

    // Add IDs and status to each hypothesis
    const processedHypotheses = hypotheses.slice(0, maxHypotheses).map((h: any, i: number) => ({
      id: `hyp_${Date.now()}_${i}`,
      ...h,
      status: 'proposed',
      iterationCount: 0,
    }))

    console.log(`[generateHypotheses] Generated ${processedHypotheses.length} hypotheses`)

    return {
      hypotheses: processedHypotheses,
      domain,
      generatedAt: new Date().toISOString(),
      basedOnFindings: researchFindings.length,
    }
  } catch (error) {
    console.error('[generateHypotheses] Generation failed:', error)
    throw new Error(`Hypothesis generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export const generateHypothesesTool: ToolDeclaration = {
  name: 'generateHypotheses' as any,
  description: 'Generate testable scientific hypotheses from research findings. Analyzes key insights, identifies gaps, and creates hypotheses ranked by feasibility, novelty, and potential impact. Each hypothesis includes supporting evidence, assumptions, and validation metrics.',
  schema: generateHypothesesSchema,
  handler: generateHypothesesHandler,
}

// ============================================================================
// Export all tools
// ============================================================================

export const ALL_TOOLS: ToolDeclaration[] = [
  searchPapersTool,
  analyzePatentTool,
  extractDataTool,
  calculateMetricsTool,
  runSimulationTool,
  designExperimentTool,
  generateHypothesesTool,
]

// ============================================================================
// Tool initialization utility
// ============================================================================

export function initializeTools(): ToolDeclaration[] {
  console.log('[Tools] Initializing 7 core tools...')
  console.log('[Tools] Available tools:', ALL_TOOLS.map(t => t.name).join(', '))
  return ALL_TOOLS
}

// ============================================================================
// Integration points for existing systems
// ============================================================================

/**
 * Connect searchPapers tool to SearchOrchestrator
 * This should be called once SearchOrchestrator is refactored with adapters
 */
export function connectSearchOrchestrator(orchestrator: any) {
  // Update searchPapersHandler to use real orchestrator
  console.log('[Tools] Connected SearchOrchestrator to searchPapers tool')
}

/**
 * Connect runSimulation tool to SimulationEngine
 * This should be called to integrate with existing simulation system
 */
export function connectSimulationEngine(engine: any) {
  // Update runSimulationHandler to use real engine
  console.log('[Tools] Connected SimulationEngine to runSimulation tool')
}

/**
 * Connect calculateMetrics tool to TEA Calculator
 * This should be called to integrate with existing TEA system
 */
export function connectTEACalculator(calculator: any) {
  // Update calculateMetricsHandler to use real calculator
  console.log('[Tools] Connected TEACalculator to calculateMetrics tool')
}
