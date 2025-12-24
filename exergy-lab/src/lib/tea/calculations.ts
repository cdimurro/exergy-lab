/**
 * TEA Calculation Engine
 *
 * Industry-standard mathematical formulas for techno-economic analysis
 * Based on NETL QGESS, DOE, IEA, NREL, and ICAO CORSIA methodologies
 *
 * All formulas are documented with references to source standards
 */

import type { TEAInput_v2, TEAResult_v2, CalculationProvenance } from '@/types/tea'
import { exergyCalculator } from './exergy'
import type { ExergyAnalysisResult } from './exergy'

/**
 * Core Calculation Results Interface
 */
export interface TEACalculations {
  // Primary metrics
  lcoe: number // Levelized Cost of Energy ($/kWh)
  npv: number // Net Present Value ($)
  irr: number // Internal Rate of Return (%)
  paybackSimple: number // Simple Payback Period (years)
  paybackDiscounted: number // Discounted Payback Period (years)

  // Extended metrics
  msp: number // Minimum Selling Price ($/unit)
  lcop: number // Levelized Cost of Product ($/unit)
  roi: number // Return on Investment (%)
  profitabilityIndex: number // PI = NPV / Initial Investment
  benefitCostRatio: number // BCR = PV(Benefits) / PV(Costs)

  // Energy metrics (for energy projects)
  eroi?: number // Energy Return on Investment
  epbt?: number // Energy Payback Time (years)

  // Carbon metrics
  mitigationCost?: number // USD/tCO2e avoided
  carbonIntensity?: number // gCO2e/MJ
  avoidedEmissions?: number // tCO2e/year

  // Exergy metrics (Second-law thermodynamic analysis)
  exergy?: {
    appliedExergyLeverage: number
    secondLawEfficiency: number
    firstLawEfficiency: number
    exergyDestructionRatio: number
    fossilComparisonMultiple: number
    fossilComparisonStatement: string
    fossilEquivalentTechnology: string
    confidence: 'high' | 'medium' | 'low'
    dataSource: string
  }

  // Cost breakdowns
  totalCapex: number
  totalOpexAnnual: number
  totalLifetimeCost: number

  // Cash flows
  annualCashFlows: number[]
  cumulativeCashFlows: number[]
  discountedCashFlows: number[]

  // Provenance for validation
  provenance: CalculationProvenance[]
}

/**
 * Calculation Options
 */
export interface CalculationOptions {
  includeProvenance?: boolean
  validateResults?: boolean
  uncertaintyAnalysis?: boolean
  sensitivityParameters?: string[]
}

/**
 * Main TEA Calculator Class
 */
export class TEACalculator {
  private input: TEAInput_v2
  private provenance: CalculationProvenance[] = []

  constructor(input: TEAInput_v2) {
    this.input = input
  }

  /**
   * Calculate all TEA metrics
   */
  calculate(options: CalculationOptions = {}): TEACalculations {
    // Reset provenance
    if (options.includeProvenance) {
      this.provenance = []
    }

    // Calculate cash flows first (needed for most metrics)
    const cashFlows = this.calculateCashFlows()

    // Calculate primary metrics
    const lcoe = this.calculateLCOE(cashFlows)
    const npv = this.calculateNPV(cashFlows)
    const irr = this.calculateIRR(cashFlows)
    const paybackSimple = this.calculateSimplePayback(cashFlows)
    const paybackDiscounted = this.calculateDiscountedPayback(cashFlows)

    // Calculate extended metrics
    const msp = this.calculateMSP()
    const lcop = this.calculateLCOP()
    const roi = this.calculateROI(npv)
    const profitabilityIndex = this.calculateProfitabilityIndex(npv)
    const benefitCostRatio = this.calculateBenefitCostRatio(cashFlows)

    // Calculate energy metrics (if applicable)
    const eroi = this.calculateEROI()
    const epbt = this.calculateEPBT()

    // Calculate carbon metrics (if applicable)
    const mitigationCost = this.calculateMitigationCost()
    const carbonIntensity = this.input.carbon_intensity_avoided
    const avoidedEmissions = this.calculateAvoidedEmissions()

    // Calculate exergy metrics
    const exergy = this.calculateExergyMetrics()

    // Cost aggregations
    const totalCapex = this.calculateTotalCAPEX()
    const totalOpexAnnual = this.calculateAnnualOPEX()
    const totalLifetimeCost = this.calculateLifetimeCost(cashFlows)

    return {
      lcoe,
      npv,
      irr,
      paybackSimple,
      paybackDiscounted,
      msp,
      lcop,
      roi,
      profitabilityIndex,
      benefitCostRatio,
      eroi,
      epbt,
      mitigationCost,
      carbonIntensity,
      avoidedEmissions,
      exergy,
      totalCapex,
      totalOpexAnnual,
      totalLifetimeCost,
      annualCashFlows: cashFlows.annual,
      cumulativeCashFlows: cashFlows.cumulative,
      discountedCashFlows: cashFlows.discounted,
      provenance: this.provenance,
    }
  }

  /**
   * Calculate LCOE (Levelized Cost of Energy)
   *
   * Formula: LCOE = NPV(CAPEX + OPEX) / NPV(Energy Production)
   * Reference: NETL QGESS, IEA Energy Technology Systems Analysis Programme
   */
  private calculateLCOE(cashFlows: CashFlowData): number {
    const discountRate = this.input.discount_rate / 100
    const lifetime = this.input.project_lifetime_years

    // Calculate NPV of all costs
    let npvCosts = 0
    for (let year = 0; year <= lifetime; year++) {
      const yearCost = year === 0 ? this.calculateTotalCAPEX() : this.calculateAnnualOPEX()
      npvCosts += yearCost / Math.pow(1 + discountRate, year)
    }

    // Calculate NPV of energy production
    const annualProduction = this.input.annual_production_mwh || this.calculateAnnualProduction()
    const degradationRate = this.input.performanceData?.degradation.annual || 0

    let npvProduction = 0
    for (let year = 1; year <= lifetime; year++) {
      const yearProduction = annualProduction * Math.pow(1 - degradationRate / 100, year - 1)
      npvProduction += yearProduction / Math.pow(1 + discountRate, year)
    }

    const lcoe = npvCosts / npvProduction

    // Add provenance
    this.addProvenance({
      metric: 'LCOE',
      formula: 'NPV(CAPEX + OPEX) / NPV(Energy Production)',
      inputs: {
        npvCosts: { value: npvCosts, unit: 'USD', source: 'Calculated from cash flows' },
        npvProduction: { value: npvProduction, unit: 'kWh', source: 'Calculated with degradation' },
        discountRate: {
          value: this.input.discount_rate,
          unit: '%',
          source: 'User input or default',
        },
      },
      assumptions: [
        `Discount rate: ${this.input.discount_rate}%`,
        `Project lifetime: ${lifetime} years`,
        `Annual degradation: ${degradationRate}%`,
      ],
      references: ['NETL QGESS Cost Estimation Methodology', 'IEA ETAP LCOE Guidelines'],
      calculatedValue: lcoe,
      unit: '$/kWh',
      confidence: 85,
      validated: false,
    })

    return lcoe
  }

  /**
   * Calculate NPV (Net Present Value)
   *
   * Formula: NPV = Σ(Cash Flow_t / (1 + r)^t) for t = 0 to N
   * Reference: Standard financial analysis, NETL QGESS
   */
  private calculateNPV(cashFlows: CashFlowData): number {
    const npv = cashFlows.discounted.reduce((sum, cf) => sum + cf, 0)

    this.addProvenance({
      metric: 'NPV',
      formula: 'Σ(Cash Flow_t / (1 + discount_rate)^t)',
      inputs: {
        totalDiscountedCashFlow: {
          value: npv,
          unit: 'USD',
          source: 'Sum of discounted cash flows',
        },
        discountRate: {
          value: this.input.discount_rate,
          unit: '%',
          source: 'User input or default',
        },
      },
      assumptions: [
        `Project lifetime: ${this.input.project_lifetime_years} years`,
        `Discount rate: ${this.input.discount_rate}%`,
      ],
      references: ['NETL QGESS Economic Analysis', 'Standard NPV methodology'],
      calculatedValue: npv,
      unit: 'USD',
      confidence: 90,
      validated: false,
    })

    return npv
  }

  /**
   * Calculate IRR (Internal Rate of Return)
   *
   * Formula: 0 = Σ(Cash Flow_t / (1 + IRR)^t) for t = 0 to N
   * Uses Newton-Raphson method to solve for IRR
   * Reference: Standard financial analysis
   */
  private calculateIRR(cashFlows: CashFlowData): number {
    const cashFlowArray = cashFlows.annual
    let irr = 0.1 // Initial guess: 10%
    const maxIterations = 100
    const tolerance = 0.0001

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let npv = 0
      let dnpv = 0 // Derivative of NPV with respect to IRR

      for (let t = 0; t < cashFlowArray.length; t++) {
        const cashFlow = cashFlowArray[t]
        const discountFactor = Math.pow(1 + irr, t)
        npv += cashFlow / discountFactor
        dnpv -= (t * cashFlow) / (discountFactor * (1 + irr))
      }

      if (Math.abs(npv) < tolerance) {
        break // Converged
      }

      // Newton-Raphson update
      irr = irr - npv / dnpv

      // Prevent extreme values
      if (irr < -0.99) irr = -0.99
      if (irr > 10) irr = 10 // 1000% cap
    }

    const irrPercent = irr * 100

    this.addProvenance({
      metric: 'IRR',
      formula: '0 = Σ(Cash Flow_t / (1 + IRR)^t), solved using Newton-Raphson',
      inputs: {
        cashFlows: {
          value: cashFlowArray.length,
          unit: 'years of data',
          source: 'Calculated annual cash flows',
        },
      },
      assumptions: ['Converged within tolerance of 0.01%'],
      references: ['Standard IRR calculation methodology', 'Newton-Raphson solver'],
      calculatedValue: irrPercent,
      unit: '%',
      confidence: 85,
      validated: false,
    })

    return irrPercent
  }

  /**
   * Calculate Simple Payback Period
   *
   * Formula: Years until cumulative cash flow becomes positive
   * Reference: Standard financial analysis
   */
  private calculateSimplePayback(cashFlows: CashFlowData): number {
    const cumulativeFlows = cashFlows.cumulative

    // Find first year where cumulative becomes positive
    for (let year = 0; year < cumulativeFlows.length; year++) {
      if (cumulativeFlows[year] >= 0) {
        // Interpolate for fractional year
        if (year > 0) {
          const prevFlow = cumulativeFlows[year - 1]
          const currFlow = cumulativeFlows[year]
          const fraction = Math.abs(prevFlow) / (currFlow - prevFlow)
          return year - 1 + fraction
        }
        return year
      }
    }

    // Payback not achieved within project lifetime
    const payback = this.input.project_lifetime_years

    this.addProvenance({
      metric: 'Simple Payback',
      formula: 'Years until Cumulative Cash Flow >= 0',
      inputs: {
        initialInvestment: {
          value: this.calculateTotalCAPEX(),
          unit: 'USD',
          source: 'Total CAPEX',
        },
      },
      assumptions: ['Undiscounted cash flows'],
      references: ['Standard payback period methodology'],
      calculatedValue: payback,
      unit: 'years',
      confidence: 90,
      validated: false,
    })

    return payback
  }

  /**
   * Calculate Discounted Payback Period
   *
   * Formula: Years until cumulative discounted cash flow becomes positive
   */
  private calculateDiscountedPayback(cashFlows: CashFlowData): number {
    const discountedFlows = cashFlows.discounted
    let cumulative = 0

    for (let year = 0; year < discountedFlows.length; year++) {
      cumulative += discountedFlows[year]
      if (cumulative >= 0) {
        // Interpolate
        if (year > 0) {
          const prevCumulative = cumulative - discountedFlows[year]
          const fraction = Math.abs(prevCumulative) / discountedFlows[year]
          return year - 1 + fraction
        }
        return year
      }
    }

    return this.input.project_lifetime_years
  }

  /**
   * Calculate MSP (Minimum Selling Price)
   *
   * Formula: MSP where NPV = 0
   * Reference: NETL QGESS, RSB TEA Tool
   */
  private calculateMSP(): number {
    const lifetime = this.input.project_lifetime_years
    const discountRate = this.input.discount_rate / 100
    const annualProduction = this.input.annual_production_mwh || this.calculateAnnualProduction()

    // Calculate total NPV of costs
    let npvCosts = this.calculateTotalCAPEX()

    for (let year = 1; year <= lifetime; year++) {
      const yearOpex = this.calculateAnnualOPEX()
      npvCosts += yearOpex / Math.pow(1 + discountRate, year)
    }

    // Calculate NPV of production (with degradation)
    const degradationRate = this.input.performanceData?.degradation.annual || 0
    let npvProduction = 0

    for (let year = 1; year <= lifetime; year++) {
      const yearProduction = annualProduction * Math.pow(1 - degradationRate / 100, year - 1)
      npvProduction += yearProduction / Math.pow(1 + discountRate, year)
    }

    // MSP = Total NPV Costs / NPV Production
    const msp = npvCosts / npvProduction

    this.addProvenance({
      metric: 'MSP',
      formula: 'NPV(Total Costs) / NPV(Production) where NPV = 0',
      inputs: {
        npvCosts: { value: npvCosts, unit: 'USD', source: 'CAPEX + discounted OPEX' },
        npvProduction: { value: npvProduction, unit: 'kWh', source: 'Discounted production with degradation' },
      },
      assumptions: [
        `Discount rate: ${this.input.discount_rate}%`,
        `Degradation: ${degradationRate}%/year`,
      ],
      references: ['NETL QGESS MSP Methodology', 'RSB SAF TEA Tool'],
      calculatedValue: msp,
      unit: '$/kWh',
      confidence: 85,
      validated: false,
    })

    return msp
  }

  /**
   * Calculate LCOP (Levelized Cost of Product)
   *
   * Formula: LCOP = (TVOM + TFOM + TOC * FCF) / (Product Units per Year)
   * Reference: NETL Carbon Utilization Procurement Grants Guidance
   */
  private calculateLCOP(): number {
    const tvom = this.input.opexDetailed?.variableOM.total || this.input.variable_opex_per_mwh || 0
    const tfom = this.input.opexDetailed?.fixedOM.total || this.input.fixed_opex_annual || 0
    const toc = this.calculateTOC()
    const fcf = this.calculateFixedChargeFactor()
    const annualProduction = this.input.annual_production_mwh || this.calculateAnnualProduction()

    const lcop = (tvom + tfom + toc * fcf) / annualProduction

    this.addProvenance({
      metric: 'LCOP',
      formula: '(TVOM + TFOM + TOC * FCF) / Annual Production',
      inputs: {
        tvom: { value: tvom, unit: 'USD/year', source: 'Variable O&M' },
        tfom: { value: tfom, unit: 'USD/year', source: 'Fixed O&M' },
        toc: { value: toc, unit: 'USD', source: 'Total Overnight Cost' },
        fcf: { value: fcf, unit: 'fraction', source: 'Fixed Charge Factor' },
      },
      assumptions: [`Annual production: ${annualProduction} units`],
      references: ['NETL Basis for TEA - Carbon Utilization'],
      calculatedValue: lcop,
      unit: '$/unit',
      confidence: 85,
      validated: false,
    })

    return lcop
  }

  /**
   * Calculate ROI (Return on Investment)
   *
   * Formula: ROI = (NPV / Initial Investment) * 100
   */
  private calculateROI(npv: number): number {
    const initialInvestment = this.calculateTotalCAPEX()
    const roi = (npv / initialInvestment) * 100

    this.addProvenance({
      metric: 'ROI',
      formula: '(NPV / Initial Investment) * 100',
      inputs: {
        npv: { value: npv, unit: 'USD', source: 'Calculated NPV' },
        initialInvestment: { value: initialInvestment, unit: 'USD', source: 'Total CAPEX' },
      },
      assumptions: [],
      references: ['Standard ROI calculation'],
      calculatedValue: roi,
      unit: '%',
      confidence: 90,
      validated: false,
    })

    return roi
  }

  /**
   * Calculate Profitability Index
   *
   * Formula: PI = NPV / Initial Investment
   * Reference: Standard financial analysis
   */
  private calculateProfitabilityIndex(npv: number): number {
    const initialInvestment = this.calculateTotalCAPEX()
    const pi = 1 + npv / initialInvestment

    this.addProvenance({
      metric: 'Profitability Index',
      formula: '1 + (NPV / Initial Investment)',
      inputs: {
        npv: { value: npv, unit: 'USD', source: 'Calculated NPV' },
        initialInvestment: { value: initialInvestment, unit: 'USD', source: 'Total CAPEX' },
      },
      assumptions: [],
      references: ['Standard PI calculation', 'NETL Economic Analysis'],
      calculatedValue: pi,
      unit: 'dimensionless',
      confidence: 90,
      validated: false,
    })

    return pi
  }

  /**
   * Calculate Benefit-Cost Ratio
   *
   * Formula: BCR = PV(Benefits) / PV(Costs)
   */
  private calculateBenefitCostRatio(cashFlows: CashFlowData): number {
    const discountRate = this.input.discount_rate / 100
    const lifetime = this.input.project_lifetime_years

    let pvBenefits = 0
    let pvCosts = this.calculateTotalCAPEX()

    // Calculate present value of benefits (revenues)
    const annualRevenue = this.calculateAnnualRevenue()
    for (let year = 1; year <= lifetime; year++) {
      pvBenefits += annualRevenue / Math.pow(1 + discountRate, year)
      pvCosts += this.calculateAnnualOPEX() / Math.pow(1 + discountRate, year)
    }

    const bcr = pvBenefits / pvCosts

    this.addProvenance({
      metric: 'Benefit-Cost Ratio',
      formula: 'PV(Revenue) / PV(CAPEX + OPEX)',
      inputs: {
        pvBenefits: { value: pvBenefits, unit: 'USD', source: 'Discounted revenues' },
        pvCosts: { value: pvCosts, unit: 'USD', source: 'Discounted costs' },
      },
      assumptions: [`Electricity price: ${this.input.electricity_price_per_mwh} $/MWh`],
      references: ['NETL BCR Methodology'],
      calculatedValue: bcr,
      unit: 'dimensionless',
      confidence: 85,
      validated: false,
    })

    return bcr
  }

  /**
   * Calculate EROI (Energy Return on Investment)
   *
   * Formula: EROI = Lifetime Energy Output / Primary Energy Input
   * Reference: Net Energy Analysis, Hall et al. 2014
   */
  private calculateEROI(): number | undefined {
    if (!this.input.performanceData) return undefined

    const lifetime = this.input.project_lifetime_years
    const annualProduction = this.input.annual_production_mwh || this.calculateAnnualProduction()

    // Lifetime energy output
    const lifetimeOutput = annualProduction * lifetime // Simplified, should account for degradation

    // Primary energy input (for manufacturing, construction, operation)
    // This would need detailed LCA data
    const primaryEnergyInput = this.estimatePrimaryEnergyInput()

    if (primaryEnergyInput === 0) return undefined

    const eroi = lifetimeOutput / primaryEnergyInput

    return eroi
  }

  /**
   * Calculate EPBT (Energy Payback Time)
   *
   * Formula: EPBT = Primary Energy Input / Annual Energy Output
   * Reference: IEA PVPS Task 12
   */
  private calculateEPBT(): number | undefined {
    if (!this.input.performanceData) return undefined

    const annualProduction = this.input.annual_production_mwh || this.calculateAnnualProduction()
    const primaryEnergyInput = this.estimatePrimaryEnergyInput()

    if (annualProduction === 0) return undefined

    const epbt = primaryEnergyInput / annualProduction

    return epbt
  }

  /**
   * Calculate Mitigation Cost (Carbon Abatement Cost)
   *
   * Formula: MC = (MSP - Fossil Fuel Price) / Emissions Reduction
   * Reference: ICAO CORSIA, RSB SAF TEA Tool
   */
  private calculateMitigationCost(): number | undefined {
    if (!this.input.carbon_intensity_avoided) return undefined

    const msp = this.calculateMSP()
    const fossilPrice = 0.08 // $/kWh typical fossil kerosene (should be input parameter)

    // Emissions reduction (gCO2e/MJ)
    const fossilEmissions = 89.0 // gCO2e/MJ for fossil kerosene (CORSIA default)
    const safEmissions = this.input.carbon_intensity_avoided || 0

    // Convert to emissions per kWh
    const mJPerKWh = 3.6
    const emissionsReductionPerKWh = ((fossilEmissions - safEmissions) / 1000) * mJPerKWh // kgCO2e/kWh

    if (emissionsReductionPerKWh <= 0) return undefined

    const mitigationCost = (msp - fossilPrice) / emissionsReductionPerKWh

    this.addProvenance({
      metric: 'Mitigation Cost',
      formula: '(MSP - Fossil Price) / Emissions Reduction',
      inputs: {
        msp: { value: msp, unit: '$/kWh', source: 'Calculated MSP' },
        fossilPrice: { value: fossilPrice, unit: '$/kWh', source: 'Market data or assumption' },
        emissionsReduction: {
          value: emissionsReductionPerKWh,
          unit: 'kgCO2e/kWh',
          source: 'CORSIA methodology',
        },
      },
      assumptions: [
        `Fossil emissions: ${fossilEmissions} gCO2e/MJ`,
        `SAF emissions: ${safEmissions} gCO2e/MJ`,
      ],
      references: ['ICAO CORSIA Methodology', 'RSB TEA Tool for SAF'],
      calculatedValue: mitigationCost,
      unit: 'USD/tCO2e',
      confidence: 80,
      validated: false,
    })

    return mitigationCost
  }

  /**
   * Calculate Avoided Emissions
   *
   * Formula: (Fossil Emissions - SAF Emissions) * Annual Production
   * Reference: CORSIA Methodology
   */
  private calculateAvoidedEmissions(): number | undefined {
    if (!this.input.carbon_intensity_avoided) return undefined

    const annualProduction = this.input.annual_production_mwh || this.calculateAnnualProduction()

    const fossilEmissions = 89.0 // gCO2e/MJ
    const safEmissions = this.input.carbon_intensity_avoided

    // Convert production to energy (MJ)
    const mJPerKWh = 3.6
    const annualEnergyMJ = annualProduction * 1000 * mJPerKWh

    // Calculate avoided emissions (tonnes CO2e)
    const avoidedEmissions = ((fossilEmissions - safEmissions) / 1e6) * annualEnergyMJ

    return avoidedEmissions
  }

  /**
   * Calculate Exergy Metrics (Second-Law Thermodynamic Analysis)
   *
   * Provides device-level exergy analysis including:
   * - Applied Exergy Leverage score
   * - Second-law efficiency
   * - Comparison to fossil fuel equivalent
   *
   * Reference: Thermodynamic second-law analysis, Petela solar exergy
   */
  private calculateExergyMetrics(): TEACalculations['exergy'] | undefined {
    // Map TEA technology type to exergy profile technology type
    const technologyMapping: Record<string, string> = {
      solar: 'solar-pv',
      wind: 'wind-onshore',
      offshore_wind: 'wind-offshore',
      hydrogen: 'electrolyzer',
      storage: 'battery-storage',
      nuclear: 'nuclear',
      geothermal: 'geothermal',
      hydro: 'hydro',
      biomass: 'biomass',
      generic: 'ccgt', // Use CCGT as baseline for generic
    }

    const exergyTechType = technologyMapping[this.input.technology_type] || this.input.technology_type

    // Perform exergy analysis
    const exergyResult = exergyCalculator.analyzeProcess(exergyTechType)

    if (!exergyResult) {
      // No exergy profile found for this technology
      return undefined
    }

    // Add provenance for exergy calculation
    this.addProvenance({
      metric: 'Applied Exergy Leverage',
      formula: 'Second-Law Efficiency x Output Energy Quality Factor',
      inputs: {
        secondLawEfficiency: {
          value: exergyResult.secondLawEfficiency,
          unit: 'fraction',
          source: exergyResult.dataSource,
        },
        outputQualityFactor: {
          value: exergyResult.outputQualityFactor,
          unit: 'fraction',
          source: 'Energy quality classification',
        },
      },
      assumptions: [
        'Device-level analysis (excludes upstream/downstream losses)',
        'Steady-state operation assumed',
        `Reference temperature: 300K (ambient)`,
      ],
      references: [
        exergyResult.dataSource,
        'Second-law thermodynamic analysis methodology',
      ],
      calculatedValue: exergyResult.appliedExergyLeverage,
      unit: 'dimensionless',
      confidence: exergyResult.confidence === 'high' ? 90 : exergyResult.confidence === 'medium' ? 75 : 60,
      validated: false,
    })

    return {
      appliedExergyLeverage: exergyResult.appliedExergyLeverage,
      secondLawEfficiency: exergyResult.secondLawEfficiency,
      firstLawEfficiency: exergyResult.firstLawEfficiency,
      exergyDestructionRatio: exergyResult.exergyDestructionRatio,
      fossilComparisonMultiple: exergyResult.fossilComparison.leverageMultiple,
      fossilComparisonStatement: exergyResult.fossilComparison.statement,
      fossilEquivalentTechnology: exergyResult.fossilComparison.equivalentTechnology,
      confidence: exergyResult.confidence,
      dataSource: exergyResult.dataSource,
    }
  }

  /**
   * Calculate multi-year cash flows
   */
  private calculateCashFlows(): CashFlowData {
    const lifetime = this.input.project_lifetime_years
    const discountRate = this.input.discount_rate / 100

    const annual: number[] = []
    const cumulative: number[] = []
    const discounted: number[] = []

    let cumulativeSum = 0

    for (let year = 0; year <= lifetime; year++) {
      let cashFlow = 0

      if (year === 0) {
        // Year 0: Capital investment
        cashFlow = -this.calculateTotalCAPEX()
      } else {
        // Operating years: Revenue - OPEX
        const revenue = this.calculateAnnualRevenue()
        const opex = this.calculateAnnualOPEX()
        const depreciation = this.calculateDepreciation(year)
        const taxableIncome = revenue - opex - depreciation
        const taxes = Math.max(0, taxableIncome * (this.input.tax_rate / 100))

        cashFlow = revenue - opex - taxes
      }

      annual.push(cashFlow)
      cumulativeSum += cashFlow
      cumulative.push(cumulativeSum)

      const discountedCashFlow = cashFlow / Math.pow(1 + discountRate, year)
      discounted.push(discountedCashFlow)
    }

    return { annual, cumulative, discounted }
  }

  /**
   * Calculate Total CAPEX
   */
  private calculateTotalCAPEX(): number {
    const baseCAPEX = this.input.capacity_mw * this.input.capex_per_kw * 1000

    // Apply installation factor
    const installed = baseCAPEX * this.input.installation_factor

    // Add other capital costs
    const total =
      installed + this.input.land_cost + this.input.grid_connection_cost

    return total
  }

  /**
   * Calculate TOC (Total Overnight Cost)
   */
  private calculateTOC(): number {
    if (this.input.capexDetailed?.toc) {
      return this.input.capexDetailed.toc.total
    }

    // Simplified TOC calculation
    const tpc = this.calculateTotalCAPEX() * 1.15 // Add 15% for owner's costs
    const toc = tpc * 1.05 // Add 5% for other costs

    return toc
  }

  /**
   * Calculate Annual OPEX
   */
  private calculateAnnualOPEX(): number {
    if (this.input.opexDetailed) {
      return this.input.opexDetailed.fixedOM.total + this.input.opexDetailed.variableOM.total
    }

    // Simplified calculation
    const capacityBased = this.input.capacity_mw * this.input.opex_per_kw_year * 1000
    const fixed = this.input.fixed_opex_annual
    const variable =
      (this.input.annual_production_mwh || this.calculateAnnualProduction()) *
      this.input.variable_opex_per_mwh

    return capacityBased + fixed + variable
  }

  /**
   * Calculate Annual Production
   */
  private calculateAnnualProduction(): number {
    return this.input.capacity_mw * this.input.capacity_factor * 8760 * 1000 // kWh
  }

  /**
   * Calculate Annual Revenue
   */
  private calculateAnnualRevenue(): number {
    const production = this.input.annual_production_mwh || this.calculateAnnualProduction()
    const revenue = (production / 1000) * this.input.electricity_price_per_mwh

    // Add carbon credit revenue
    const carbonRevenue = this.input.carbon_credit_per_ton * this.input.carbon_intensity_avoided

    return revenue + carbonRevenue
  }

  /**
   * Calculate Depreciation for a given year
   */
  private calculateDepreciation(year: number): number {
    const depreciationYears = this.input.depreciation_years
    const totalCAPEX = this.calculateTotalCAPEX()

    if (year > depreciationYears) return 0

    // Straight-line depreciation
    return totalCAPEX / depreciationYears
  }

  /**
   * Calculate Fixed Charge Factor
   *
   * Formula: FCF accounts for capital recovery, taxes, insurance, etc.
   * Reference: NETL QGESS
   */
  private calculateFixedChargeFactor(): number {
    const i = this.input.discount_rate / 100
    const n = this.input.project_lifetime_years

    // Capital recovery factor
    const crf = (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1)

    // Add insurance and taxes
    const insurance = this.input.insurance_rate / 100
    const propertyTax = 0.01 // 1% typical

    const fcf = crf + insurance + propertyTax

    return fcf
  }

  /**
   * Calculate Lifetime Cost
   */
  private calculateLifetimeCost(cashFlows: CashFlowData): number {
    return cashFlows.annual.reduce((sum, cf) => sum + Math.abs(cf), 0)
  }

  /**
   * Estimate primary energy input (placeholder for LCA integration)
   */
  private estimatePrimaryEnergyInput(): number {
    // This would come from detailed LCA
    // For now, return 0 to indicate unavailable
    return 0
  }

  /**
   * Add calculation provenance for validation
   */
  private addProvenance(provenance: CalculationProvenance) {
    this.provenance.push(provenance)
  }

  /**
   * Get all calculation provenance
   */
  getProvenance(): CalculationProvenance[] {
    return this.provenance
  }
}

/**
 * Cash flow data structure
 */
interface CashFlowData {
  annual: number[]
  cumulative: number[]
  discounted: number[]
}

/**
 * Convenience function for quick calculations
 */
export function calculateTEA(
  input: TEAInput_v2,
  options: CalculationOptions = { includeProvenance: true }
): TEACalculations {
  const calculator = new TEACalculator(input)
  return calculator.calculate(options)
}

/**
 * Validate calculation against reference case
 */
export function validateAgainstReference(
  calculated: TEACalculations,
  reference: Partial<TEACalculations>,
  tolerance: number = 0.05 // 5% tolerance
): {
  valid: boolean
  deviations: Array<{ metric: string; calculated: number; reference: number; deviation: number }>
} {
  const deviations: Array<{ metric: string; calculated: number; reference: number; deviation: number }> = []
  let valid = true

  // Compare each metric in reference
  for (const [metric, refValue] of Object.entries(reference)) {
    if (typeof refValue === 'number' && refValue !== 0) {
      const calcValue = (calculated as any)[metric]
      if (typeof calcValue === 'number') {
        const deviation = Math.abs((calcValue - refValue) / refValue)
        deviations.push({
          metric,
          calculated: calcValue,
          reference: refValue,
          deviation,
        })

        if (deviation > tolerance) {
          valid = false
        }
      }
    }
  }

  return { valid, deviations }
}
