/**
 * Standards Database for TEA
 *
 * Reference data from industry standards organizations:
 * - NETL QGESS (Quality Guidelines for Energy System Studies)
 * - ICAO CORSIA (Carbon Offsetting and Reduction Scheme)
 * - DOE/IEA/NREL databases
 * - EPA emissions standards
 * - Regional regulations
 *
 * Provides validation references for multi-agent quality pipeline
 */

/**
 * NETL QGESS Economic Assumptions
 */
export const NETL_ECONOMIC_STANDARDS = {
  taxRates: {
    federal: 21, // %
    stateTypical: 6, // %
    effective: 25.74, // %
  },
  depreciation: {
    method: 'MACRS' as const,
    period: 20, // years
    conventionDecliiningBalance: 1.5, // 150% DB
  },
  financingTerms: {
    contracting: 'EPC' as const, // Engineering, Procurement, Construction
    debtType: 'non-recourse' as const,
    repaymentTerm: 30, // years (equal to operational period)
    gracePeroid: 0, // years
  },
  analysisPeriods: {
    capitalExpenditure: {
      naturalGas: 3, // years
      coal: 5, // years
    },
    operational: 30, // years
  },
  costEscalation: {
    realEscalation: 0, // % (constant dollars)
    nominalInflation: 3, // %
  },
}

/**
 * ICAO CORSIA Standards
 */
export const ICAO_CORSIA_STANDARDS = {
  emissionFactors: {
    fossilKerosene: 89.0, // gCO2e/MJ
    fossilDiesel: 94.1, // gCO2e/MJ
  },
  fuelProperties: {
    jetFuel: {
      density: 0.8, // kg/L
      lhv: 43.2, // MJ/kg
      hhv: 46.4, // MJ/kg
    },
  },
  eligiblePathways: [
    'Fischer-Tropsch (FT)',
    'Hydroprocessed Esters and Fatty Acids (HEFA)',
    'Alcohol-to-Jet (ATJ)',
    'Synthesized Iso-Paraffins (SIP)',
    'Fischer-Tropsch plus Aromatics (FT-A)',
    'Co-processing',
    'Power-to-Liquid (PtL)',
  ],
  lifecycleAssessment: {
    methodology: 'CORSIA Default Life Cycle Emissions',
    systemBoundary: 'Well-to-Wake',
    functionalUnit: 'gCO2e/MJ',
  },
}

/**
 * IEA Energy Technology Cost Data
 */
export const IEA_COST_BENCHMARKS = {
  solar: {
    capexRange: { min: 600, max: 2000, typical: 1000, unit: '$/kW' },
    opexRange: { min: 10, max: 40, typical: 20, unit: '$/kW-year' },
    lcoeRange: { min: 0.02, max: 0.12, typical: 0.05, unit: '$/kWh' },
    year: 2024,
    source: 'IEA World Energy Outlook 2023',
  },
  wind: {
    capexRange: { min: 1000, max: 2500, typical: 1500, unit: '$/kW' },
    opexRange: { min: 25, max: 60, typical: 40, unit: '$/kW-year' },
    lcoeRange: { min: 0.02, max: 0.09, typical: 0.04, unit: '$/kWh' },
    year: 2024,
    source: 'IEA Wind Energy Report 2023',
  },
  hydrogen: {
    capexRange: { min: 500, max: 2000, typical: 1200, unit: '$/kW' },
    lcohRange: { min: 2, max: 8, typical: 4, unit: '$/kg' },
    year: 2024,
    source: 'IEA Global Hydrogen Review 2023',
  },
}

/**
 * EPA Emissions Standards
 */
export const EPA_EMISSIONS_STANDARDS = {
  'Clean Air Act': {
    SO2: { limit: 0.10, unit: 'lb/MMBtu', regulation: '40 CFR Part 60' },
    NOx: { limit: 0.15, unit: 'lb/MMBtu', regulation: '40 CFR Part 60' },
    Particulate: { limit: 0.03, unit: 'lb/MMBtu', regulation: '40 CFR Part 60' },
    CO: { limit: 0.20, unit: 'lb/MMBtu', regulation: '40 CFR Part 60' },
  },
  'Mercury and Air Toxics': {
    Hg: { limit: 0.000003, unit: 'lb/MMBtu', regulation: '40 CFR Part 63' },
    HCl: { limit: 0.002, unit: 'lb/MMBtu', regulation: '40 CFR Part 63' },
  },
}

/**
 * Regional Economic Data
 */
export const REGIONAL_ECONOMIC_DATA = {
  'US-National': {
    electricityPrice: { industrial: 80, commercial: 120, residential: 150, unit: '$/MWh' },
    naturalGasPrice: { industrial: 5.0, commercial: 8.0, unit: '$/MMBtu' },
    laborRate: { engineer: 75, operator: 35, maintenance: 45, unit: '$/hour' },
    taxRate: { federal: 21, state: 6, local: 1, unit: '%' },
  },
  'Europe-Western': {
    electricityPrice: { industrial: 150, commercial: 200, residential: 250, unit: '$/MWh' },
    naturalGasPrice: { industrial: 12.0, commercial: 15.0, unit: '$/MMBtu' },
    laborRate: { engineer: 85, operator: 45, maintenance: 50, unit: '$/hour' },
    taxRate: { federal: 25, state: 0, local: 2, unit: '%' },
  },
  'Asia-Southeast': {
    electricityPrice: { industrial: 90, commercial: 110, residential: 130, unit: '$/MWh' },
    naturalGasPrice: { industrial: 8.5, commercial: 10.0, unit: '$/MMBtu' },
    laborRate: { engineer: 30, operator: 15, maintenance: 18, unit: '$/hour' },
    taxRate: { federal: 20, state: 0, local: 1, unit: '%' },
  },
}

/**
 * Technology Readiness Level (TRL) Definitions
 */
export const TRL_DEFINITIONS = {
  1: { level: 'Basic Principles', description: 'Scientific research begins, basic principles observed' },
  2: { level: 'Concept Formulated', description: 'Technology concept and application formulated' },
  3: { level: 'Proof of Concept', description: 'Analytical/experimental critical function proven' },
  4: { level: 'Lab Validation', description: 'Component validation in laboratory environment' },
  5: { level: 'Lab System', description: 'System validation in relevant environment' },
  6: { level: 'Pilot Demonstration', description: 'System demonstration in relevant environment' },
  7: { level: 'Pre-Commercial', description: 'System prototype in operational environment' },
  8: { level: 'Commercial Proven', description: 'System completed and qualified' },
  9: { level: 'Fully Commercial', description: 'System proven in operational environment' },
}

/**
 * Standard reference cases for validation
 */
export const REFERENCE_CASES = {
  'NETL-B12A': {
    name: 'Supercritical Pulverized Coal (no capture)',
    technology: 'coal',
    capacity: 650, // MW
    lcoe: 0.0904, // $/kWh
    capex: 3763, // $/kW
    emissions: 3763000, // tCO2/year
    source: 'NETL Cost and Performance Baseline Vol 1, Rev 4',
  },
  'IEA-Solar-2024': {
    name: 'Utility-Scale Solar PV',
    technology: 'solar',
    capacity: 100, // MW
    lcoeRange: { min: 0.03, max: 0.08 },
    capexRange: { min: 800, max: 1200 },
    source: 'IEA Renewables 2024',
  },
}

/**
 * Formula library with standard references
 */
export const STANDARD_FORMULAS = {
  LCOE: {
    formula: 'NPV(CAPEX + OPEX) / NPV(Energy Generation)',
    reference: 'NETL QGESS, IEA ETAP',
    units: '$/kWh',
    applicability: 'All energy technologies',
  },
  NPV: {
    formula: 'Σ(Cash Flow_t / (1 + r)^t) for t = 0 to N',
    reference: 'Standard financial analysis',
    units: 'USD',
    applicability: 'All projects',
  },
  IRR: {
    formula: '0 = Σ(Cash Flow_t / (1 + IRR)^t), solved iteratively',
    reference: 'Standard financial analysis',
    units: '%',
    applicability: 'All projects',
  },
  MSP: {
    formula: 'NPV(Total Costs) / NPV(Production) where NPV = 0',
    reference: 'NETL QGESS, RSB TEA Tool',
    units: '$/unit',
    applicability: 'Product-focused analyses',
  },
  LCOP: {
    formula: '(TVOM + TFOM + TOC × FCF) / Annual Production',
    reference: 'NETL Carbon Utilization Procurement Grants',
    units: '$/unit',
    applicability: 'Product manufacturing',
  },
  MitigationCost: {
    formula: '(MSP - Fossil Price) / Emissions Reduction',
    reference: 'ICAO CORSIA, RSB SAF',
    units: '$/tCO2e',
    applicability: 'Carbon abatement projects',
  },
}

/**
 * Helper function to get standard for validation
 */
export function getStandard(category: string, subcategory: string): any {
  const standards: Record<string, any> = {
    NETL: NETL_ECONOMIC_STANDARDS,
    ICAO: ICAO_CORSIA_STANDARDS,
    IEA: IEA_COST_BENCHMARKS,
    EPA: EPA_EMISSIONS_STANDARDS,
  }

  return standards[category]
}

/**
 * Helper to get formula definition
 */
export function getFormulaDefinition(metric: string): typeof STANDARD_FORMULAS[keyof typeof STANDARD_FORMULAS] | undefined {
  return STANDARD_FORMULAS[metric as keyof typeof STANDARD_FORMULAS]
}
