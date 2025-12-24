/**
 * TEA (Techno-Economic Analysis) Types
 */

export interface TEAInput {
  // Project metadata
  project_name: string
  technology_type: TechnologyType

  // Capacity and production
  capacity_mw: number
  capacity_factor: number
  annual_production_mwh?: number

  // Capital costs
  capex_per_kw: number
  installation_factor: number
  land_cost: number
  grid_connection_cost: number

  // Operating costs
  opex_per_kw_year: number
  fixed_opex_annual: number
  variable_opex_per_mwh: number
  insurance_rate: number

  // Financial parameters
  project_lifetime_years: number
  discount_rate: number
  debt_ratio: number
  interest_rate: number
  tax_rate: number
  depreciation_years: number

  // Revenue assumptions
  electricity_price_per_mwh: number
  price_escalation_rate: number
  carbon_credit_per_ton: number
  carbon_intensity_avoided: number
}

export interface TEAResult {
  // Summary metrics
  lcoe: number
  npv: number
  irr: number
  payback_years: number

  // Cost breakdown
  total_capex: number
  annual_opex: number
  total_lifetime_cost: number

  // Production
  annual_production_mwh: number
  lifetime_production_mwh: number

  // Revenue
  annual_revenue: number
  lifetime_revenue_npv: number

  // Detailed breakdown
  capex_breakdown: CAPEXBreakdown
  opex_breakdown: OPEXBreakdown
  cash_flows: Array<{
    year: number
    cashFlow: number
    cumulativeCashFlow: number
  }>
}

export interface CAPEXBreakdown {
  equipment: number
  installation: number
  land: number
  grid_connection: number
}

export interface OPEXBreakdown {
  capacity_based: number
  fixed: number
  variable: number
  insurance: number
}

export type TechnologyType =
  | 'solar'
  | 'wind'
  | 'offshore_wind'
  | 'hydrogen'
  | 'storage'
  | 'nuclear'
  | 'geothermal'
  | 'hydro'
  | 'biomass'
  | 'generic'

export interface TEATemplate {
  id: string
  name: string
  technology_type: TechnologyType
  capex_per_kw: number
  opex_per_kw_year: number
  capacity_factor: number
  lifetime_years: number
}

export interface Project {
  id: string
  name: string
  description?: string
  technology_type: TechnologyType
  status: ProjectStatus
  created_at: string
  updated_at: string
  tea_results?: TEAResult
}

export type ProjectStatus = 'draft' | 'analyzing' | 'complete' | 'archived'

export interface SensitivityAnalysis {
  parameter: string
  variations: number[]
  lcoe: number[]
  npv: number[]
}

// Technology configuration
export interface TechnologyConfig {
  type: TechnologyType
  label: string
  icon: string
  color: string
  defaults: Partial<TEAInput>
}

// ============================================================================
// ENHANCED TEA TYPES v2 (Backward Compatible Extensions)
// ============================================================================

import type {
  ProcessStream,
  EquipmentItem,
  MaterialBalance,
  EnergyBalance,
  AuxiliaryLoad,
  EmissionsData,
  ProcessFlowDiagram,
  TechnologyPerformance,
  FeedstockSpecification,
  EconomicAllocation,
  UncertaintyParameter,
  TEAValidationResult,
} from './tea-process'

/**
 * Enhanced TEA Input (v2)
 * Extends TEAInput with comprehensive industry-standard parameters
 */
export interface TEAInput_v2 extends TEAInput {
  // Additional metadata
  project_description?: string
  evaluation_year?: number

  // Storage-specific parameters
  degradation_rate?: number
  depth_of_discharge?: number
  cycle_life?: number

  // Simplified capital cost breakdown (form-friendly)
  process_equipment_cost?: number
  electrical_equipment_cost?: number
  instrumentation_cost?: number
  civil_structural_cost?: number
  piping_cost?: number
  contingency_cost?: number

  // Financial parameters
  depreciation_method?: 'straight-line' | 'declining-balance' | 'macrs'

  // Simplified operating costs (form-friendly)
  operating_labor_annual?: number
  maintenance_labor_annual?: number
  admin_labor_annual?: number
  property_tax_annual?: number
  maintenance_materials_annual?: number
  electricity_cost_per_kwh?: number
  water_cost_per_m3?: number
  natural_gas_cost?: number
  consumables_annual?: number
  waste_disposal_annual?: number

  // Process Engineering Data
  processStreams?: ProcessStream[]
  equipment?: EquipmentItem[]
  materialBalances?: MaterialBalance[]
  energyBalance?: EnergyBalance
  auxiliaryLoads?: AuxiliaryLoad[]
  emissions?: EmissionsData[]
  processFlowDiagram?: ProcessFlowDiagram

  // Enhanced Capital Costs (Multi-level NETL standard)
  capexDetailed?: {
    // Bare Erected Cost (BEC)
    bareErectedCost: {
      processEquipment: Record<string, number> // equipment type: cost
      onSiteFacilities: number
      infrastructure: number
      directLabor: number
      indirectLabor: number
      total: number
    }

    // Engineering, Procurement, Construction Cost (EPCC)
    epcc: {
      bec: number
      epcServices: number
      detailedDesign: number
      projectManagement: number
      total: number
    }

    // Total Plant Cost (TPC)
    tpc: {
      epcc: number
      processContingency: number // Based on TRL
      projectContingency: number
      total: number
    }

    // Total Overnight Cost (TOC)
    toc: {
      tpc: number
      preProductionCosts: number
      inventoryCapital: number
      financingCosts: number
      otherOwnerCosts: number
      total: number
    }

    // Total As-Spent Cost (TASC)
    tasc: {
      toc: number
      escalationDuringConstruction: number
      interestDuringConstruction: number
      total: number
    }
  }

  // Enhanced Operating Costs
  opexDetailed?: {
    // Fixed O&M
    fixedOM: {
      operatingLabor: {
        operators: number
        supervisors: number
        maintenance: number
        admin: number
        total: number
      }
      maintenanceMaterials: number
      propertyTax: number
      insurance: number
      overhead: number
      total: number
    }

    // Variable O&M
    variableOM: {
      feedstock: Record<string, { quantity: number; cost: number }> // feedstock: details
      consumables: Record<string, { quantity: number; cost: number }> // consumable: details
      utilities: {
        electricity: { quantity: number; cost: number }
        naturalGas: { quantity: number; cost: number }
        water: { quantity: number; cost: number }
        steam: { quantity: number; cost: number }
        cooling: { quantity: number; cost: number }
        hydrogen: { quantity: number; cost: number }
        other: Record<string, { quantity: number; cost: number }>
      }
      wasteDisposal: number
      byproductCredits: number // Negative value (revenue)
      total: number
    }
  }

  // Enhanced Financial Parameters
  financialDetailed?: {
    // Financing structure
    financing: {
      equityFraction: number // 0-1
      debtFraction: number // 0-1
      costOfEquity: number // percentage
      costOfDebt: number // percentage
      wacc: number // Weighted Average Cost of Capital
    }

    // Construction schedule
    construction: {
      duration: number // years
      investmentSchedule: number[] // percentage per year, must sum to 100
      availabilitySchedule: number[] // plant availability per year during construction
    }

    // Depreciation
    depreciation: {
      method: 'straight-line' | 'declining-balance' | 'macrs'
      equipmentLife: number // years
      buildingLife: number // years
      schedule?: number[] // Custom depreciation schedule
    }

    // Taxation
    taxation: {
      federalRate: number // percentage
      stateRate: number // percentage
      effectiveRate: number // percentage
      taxCredits: Record<string, number> // credit type: value
      taxHoliday?: number // years
    }

    // Working capital
    workingCapital: {
      inventoryMonths: number // months of inventory
      receivablesMonths: number // months of receivables
      payablesMonths: number // months of payables
      total: number // USD
    }
  }

  // Technology Performance
  performanceData?: TechnologyPerformance

  // Feedstock Data
  feedstocks?: FeedstockSpecification[]

  // Co-products and allocation
  coproducts?: EconomicAllocation[]

  // Uncertainty parameters (for Monte Carlo)
  uncertaintyParams?: UncertaintyParameter[]

  // Market data
  marketData?: {
    productDemand?: { value: number; unit: string; geography: string }
    marketSize?: { value: number; unit: string; geography: string }
    marketShare?: number // percentage
    competitorPricing?: Record<string, number> // competitor: price
    marketGrowthRate?: number // percentage per year
    incentives?: Array<{
      type: string
      value: number
      duration: number
      eligibility: string
    }>
  }

  // Standards and compliance
  standards?: {
    applicableStandards: string[] // e.g., "NETL QGESS", "ICAO CORSIA"
    complianceChecks: Record<string, boolean>
    certifications: string[]
  }
}

/**
 * Enhanced TEA Result (v2)
 * Extends TEAResult with comprehensive industry-standard metrics
 */
export interface TEAResult_v2 extends TEAResult {
  // Additional financial metrics
  extendedMetrics?: {
    // NETL standard metrics
    msp: number // Minimum Selling Price ($/unit)
    lcop: number // Levelized Cost of Product ($/unit)
    roi: number // Return on Investment (%)
    profitabilityIndex: number
    benefitCostRatio: number

    // Energy metrics (for energy projects)
    eroi?: number // Energy Return on Investment
    epbt?: number // Energy Payback Time (years)

    // Carbon metrics
    mitigationCost?: number // USD/tCO2e avoided
    carbonIntensity?: number // gCO2e/MJ or kgCO2e/unit
    avoidedEmissions?: number // tCO2e/year

    // Exergy metrics (Second-law thermodynamic analysis)
    exergy?: {
      /** Applied Exergy Leverage score (0-1+) */
      appliedExergyLeverage: number
      /** Second-law efficiency (0-1, except heat pumps) */
      secondLawEfficiency: number
      /** First-law efficiency for reference */
      firstLawEfficiency: number
      /** Exergy destruction ratio (0-1) */
      exergyDestructionRatio: number
      /** Comparison multiple vs fossil equivalent */
      fossilComparisonMultiple: number
      /** Human-readable comparison statement */
      fossilComparisonStatement: string
      /** Fossil technology used for comparison */
      fossilEquivalentTechnology: string
      /** Confidence level in the analysis */
      confidence: 'high' | 'medium' | 'low'
      /** Data source citation */
      dataSource: string
    }
  }

  // Detailed cost breakdowns (NETL 5-level structure)
  costBreakdownDetailed?: {
    bec: number
    epcc: number
    tpc: number
    toc: number
    tasc: number
    unitCosts: {
      becPerKW: number
      tpcPerKW: number
      tocPerKW: number
    }
  }

  // Multi-year projections
  yearlyProjections?: Array<{
    year: number
    revenue: number
    opex: number
    depreciation: number
    interest: number
    taxableIncome: number
    taxes: number
    netIncome: number
    cashFlow: number
    cumulativeCashFlow: number
    discountedCashFlow: number
  }>

  // Sensitivity analysis results
  sensitivityResults?: {
    tornadoPlotData: Array<{
      parameter: string
      lowCase: { value: number; impact: number }
      baseCase: { value: number; impact: number }
      highCase: { value: number; impact: number }
    }>
    criticalParameters: string[]
    elasticities: Record<string, number> // parameter: elasticity
  }

  // Monte Carlo results (if stochastic analysis performed)
  monteCarloResults?: {
    iterations: number
    metrics: {
      lcoe: { mean: number; std: number; p5: number; p50: number; p95: number }
      npv: { mean: number; std: number; p5: number; p50: number; p95: number }
      irr: { mean: number; std: number; p5: number; p50: number; p95: number }
    }
    distributions: Record<string, number[]> // metric: distribution array
    riskMetrics: {
      probabilityOfSuccess: number // NPV > 0
      valueAtRisk: number // VaR at 95% confidence
      expectedShortfall: number
    }
  }

  // Process performance results
  processResults?: {
    materialBalances: MaterialBalance[]
    energyBalance: EnergyBalance
    conversionEfficiencies: Record<string, number>
    yields: Record<string, number>
  }

  // Product-specific results
  productResults?: {
    product: string
    annualProduction: { value: number; unit: string }
    productionCost: { value: number; unit: string }
    marketPrice: { value: number; unit: string }
    margin: number // percentage
  }[]

  // Validation results
  validation?: TEAValidationResult

  // Metadata
  metadata?: {
    calculationDate: Date
    calculationVersion: string
    modelVersion: string
    validatedBy: string[]
    references: string[]
    dataQuality: {
      completeness: number // 0-100
      confidence: number // 0-100
      primaryDataPercentage: number // 0-100
    }
  }
}

/**
 * Calculation Provenance
 * Track how each metric was calculated for transparency and validation
 */
export interface CalculationProvenance {
  metric: string
  formula: string
  inputs: Record<string, { value: number; unit: string; source: string }>
  assumptions: string[]
  references: string[]
  calculatedValue: number
  unit: string
  confidence: number // 0-100
  validated: boolean
  validationDetails?: {
    method: string
    benchmarks: string[]
    deviation: number // percentage from benchmark
    acceptable: boolean
  }
}

/**
 * TEA Report Configuration
 * Controls which sections are included in generated reports
 */
export interface TEAReportConfig {
  // Report metadata
  reportType: 'academic' | 'executive' | 'regulatory' | 'technical' | 'government'
  title: string
  authors?: string[]
  organization?: string
  date: Date
  version: string
  confidential: boolean

  // Sections to include
  sections: {
    coverPage: boolean
    tableOfContents: boolean
    listOfExhibits: boolean
    acronymsAndAbbreviations: boolean
    glossary: boolean
    executiveSummary: boolean
    introduction: boolean
    methodology: boolean
    processDescription: boolean
    performanceAnalysis: boolean
    economicAnalysis: boolean
    marketAnalysis: boolean
    resultsAndDiscussion: boolean
    aiInsights: boolean
    conclusions: boolean
    limitations: boolean
    references: boolean
    appendices: boolean
  }

  // Customization options
  customization: {
    includeFormulas: boolean
    includePFDs: boolean
    includeStreamTables: boolean
    includeMaterialBalances: boolean
    includeEquipmentLists: boolean
    includeSensitivityAnalysis: boolean
    includeMonteCarloResults: boolean
    includeValidationDetails: boolean
    detailLevel: 'minimal' | 'standard' | 'comprehensive' | 'exhaustive'
  }

  // Visualization preferences
  visualizations: {
    chartStyle: 'professional' | 'academic' | 'simple'
    colorScheme: 'default' | 'grayscale' | 'colorblind-safe'
    includeCharts: string[] // chart types to include
    chartResolution: 'screen' | 'print' | 'publication'
  }

  // Branding
  branding?: {
    logo?: string // base64 or URL
    colors: {
      primary: string
      secondary: string
      accent: string
    }
    footer?: string
    header?: string
  }
}
