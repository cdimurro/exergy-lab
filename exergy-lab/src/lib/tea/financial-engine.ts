/**
 * Financial Modeling Engine for TEA
 *
 * Comprehensive financial modeling including:
 * - Multi-year cash flow projections
 * - Depreciation schedules (straight-line, declining balance, MACRS)
 * - Tax calculations (federal, state, credits)
 * - Debt service and financing
 * - Working capital requirements
 * - Pro-forma income statements
 *
 * Based on NETL QGESS financial analysis standards
 */

import type { TEAInput_v2 } from '@/types/tea'

export interface YearlyFinancialData {
  year: number

  // Revenue
  grossRevenue: number
  byproductRevenue: number
  carbonCredits: number
  totalRevenue: number

  // Operating Costs
  fixedOM: number
  variableOM: number
  feedstockCosts: number
  utilityCosts: number
  totalOPEX: number

  // Depreciation
  depreciation: number
  depreciationMethod: string

  // Financing
  debtPrincipal: number
  debtBalance: number
  interestExpense: number
  principalPayment: number

  // Income
  ebitda: number // Earnings before interest, taxes, depreciation, amortization
  ebit: number // Earnings before interest and taxes
  taxableIncome: number
  taxes: number
  netIncome: number

  // Cash Flow
  operatingCashFlow: number
  capitalExpenditure: number
  financingCashFlow: number
  freeCashFlow: number
  cumulativeCashFlow: number
  discountedCashFlow: number

  // Balance Sheet Items
  totalAssets: number
  totalLiabilities: number
  equity: number
}

export interface ProFormaStatement {
  projectName: string
  technology: string
  years: YearlyFinancialData[]

  // Summary metrics
  summary: {
    totalRevenue: number
    totalOPEX: number
    totalDepreciation: number
    totalTaxes: number
    totalNetIncome: number
    totalCashFlow: number
    npv: number
    irr: number
  }
}

export interface DepreciationSchedule {
  method: 'straight-line' | 'declining-balance' | 'macrs'
  assetValue: number
  usefulLife: number
  salvageValue: number
  annualDepreciation: number[]
  cumulativeDepreciation: number[]
  bookValue: number[]
}

export interface DebtSchedule {
  principal: number
  interestRate: number
  term: number // years
  annualPayment: number
  schedule: Array<{
    year: number
    beginningBalance: number
    payment: number
    interest: number
    principal: number
    endingBalance: number
  }>
}

/**
 * Financial Modeling Engine
 */
export class FinancialEngine {
  private input: TEAInput_v2

  constructor(input: TEAInput_v2) {
    this.input = input
  }

  /**
   * Generate complete pro-forma income statement
   */
  generateProForma(): ProFormaStatement {
    const years: YearlyFinancialData[] = []
    const lifetime = this.input.project_lifetime_years
    const construction = this.input.financialDetailed?.construction

    // Calculate schedules
    const depreciation = this.calculateDepreciationSchedule()
    const debtSchedule = this.calculateDebtSchedule()

    let cumulativeCashFlow = 0
    const discountRate = this.input.discount_rate / 100

    // Year 0: Construction start
    for (let year = 0; year <= lifetime; year++) {
      const yearData = this.calculateYearData(year, depreciation, debtSchedule, cumulativeCashFlow, discountRate)
      years.push(yearData)
      cumulativeCashFlow = yearData.cumulativeCashFlow
    }

    // Calculate summary
    const summary = this.calculateSummary(years)

    return {
      projectName: this.input.project_name,
      technology: this.input.technology_type,
      years,
      summary,
    }
  }

  /**
   * Calculate financial data for a specific year
   */
  private calculateYearData(
    year: number,
    depreciation: DepreciationSchedule,
    debtSchedule: DebtSchedule,
    prevCumulativeCF: number,
    discountRate: number
  ): YearlyFinancialData {
    const construction = this.input.financialDetailed?.construction

    // Determine if plant is operational
    const isConstruction = construction && year < construction.duration
    const availability = isConstruction
      ? construction.availabilitySchedule?.[year] || 0
      : 100

    // Revenue (only when operational)
    const annualProduction = this.calculateAnnualProduction()
    const grossRevenue = isConstruction
      ? (annualProduction * this.input.electricity_price_per_mwh * availability) / 100000 // Convert kWh to MWh
      : (annualProduction * this.input.electricity_price_per_mwh) / 1000

    const byproductRevenue = 0 // TODO: Add byproduct revenue calculation
    const carbonCredits = this.input.carbon_credit_per_ton * this.input.carbon_intensity_avoided
    const totalRevenue = grossRevenue + byproductRevenue + carbonCredits

    // Operating Costs
    const fixedOM = isConstruction
      ? 0
      : this.input.opexDetailed?.fixedOM.total || this.input.fixed_opex_annual

    const variableOM = isConstruction
      ? 0
      : (this.input.opexDetailed?.variableOM.total || this.input.variable_opex_per_mwh * annualProduction / 1000)

    const feedstockCosts = 0 // TODO: Calculate from feedstock data
    const utilityCosts = 0 // TODO: Calculate from utilities
    const totalOPEX = fixedOM + variableOM + feedstockCosts + utilityCosts

    // Depreciation
    const depreciationAmount = year <= depreciation.annualDepreciation.length
      ? depreciation.annualDepreciation[year] || 0
      : 0

    // Debt service
    const debtData = debtSchedule.schedule.find(d => d.year === year)
    const interestExpense = debtData?.interest || 0
    const principalPayment = debtData?.principal || 0
    const debtBalance = debtData?.endingBalance || 0

    // Income calculation
    const ebitda = totalRevenue - totalOPEX
    const ebit = ebitda - depreciationAmount
    const taxableIncome = Math.max(0, ebit - interestExpense)
    const taxes = taxableIncome * (this.input.financialDetailed?.taxation.effectiveRate || this.input.tax_rate) / 100
    const netIncome = taxableIncome - taxes

    // Cash flow
    const operatingCashFlow = netIncome + depreciationAmount // Add back non-cash charges
    const capitalExpenditure = isConstruction
      ? this.calculateCapexForYear(year)
      : 0
    const financingCashFlow = year === 0 ? debtSchedule.principal : -principalPayment
    const freeCashFlow = operatingCashFlow - capitalExpenditure - principalPayment
    const cumulativeCashFlow = prevCumulativeCF + freeCashFlow
    const discountedCashFlow = freeCashFlow / Math.pow(1 + discountRate, year)

    // Balance sheet (simplified)
    const totalAssets = depreciation.bookValue[year] || 0
    const totalLiabilities = debtBalance
    const equity = totalAssets - totalLiabilities

    return {
      year,
      grossRevenue,
      byproductRevenue,
      carbonCredits,
      totalRevenue,
      fixedOM,
      variableOM,
      feedstockCosts,
      utilityCosts,
      totalOPEX,
      depreciation: depreciationAmount,
      depreciationMethod: depreciation.method,
      debtPrincipal: year === 0 ? debtSchedule.principal : debtBalance,
      debtBalance,
      interestExpense,
      principalPayment,
      ebitda,
      ebit,
      taxableIncome,
      taxes,
      netIncome,
      operatingCashFlow,
      capitalExpenditure,
      financingCashFlow,
      freeCashFlow,
      cumulativeCashFlow,
      discountedCashFlow,
      totalAssets,
      totalLiabilities,
      equity,
    }
  }

  /**
   * Calculate depreciation schedule
   */
  private calculateDepreciationSchedule(): DepreciationSchedule {
    const method = this.input.financialDetailed?.depreciation.method || 'straight-line'
    const assetValue = this.calculateTotalCAPEX()
    const usefulLife = this.input.financialDetailed?.depreciation.equipmentLife || this.input.depreciation_years
    const salvageValue = assetValue * 0.1 // Assume 10% salvage value

    const annualDepreciation: number[] = []
    const cumulativeDepreciation: number[] = []
    const bookValue: number[] = []

    let cumulative = 0
    let book = assetValue

    switch (method) {
      case 'straight-line':
        const annualSL = (assetValue - salvageValue) / usefulLife
        for (let year = 0; year <= this.input.project_lifetime_years; year++) {
          if (year === 0) {
            annualDepreciation.push(0)
            cumulativeDepreciation.push(0)
            bookValue.push(assetValue)
          } else if (year <= usefulLife) {
            annualDepreciation.push(annualSL)
            cumulative += annualSL
            cumulativeDepreciation.push(cumulative)
            book = assetValue - cumulative
            bookValue.push(Math.max(salvageValue, book))
          } else {
            annualDepreciation.push(0)
            cumulativeDepreciation.push(cumulative)
            bookValue.push(salvageValue)
          }
        }
        break

      case 'declining-balance':
        const rate = 1.5 / usefulLife // 150% declining balance
        for (let year = 0; year <= this.input.project_lifetime_years; year++) {
          if (year === 0) {
            annualDepreciation.push(0)
            cumulativeDepreciation.push(0)
            bookValue.push(assetValue)
          } else if (book > salvageValue) {
            const deprec = Math.min(book * rate, book - salvageValue)
            annualDepreciation.push(deprec)
            cumulative += deprec
            cumulativeDepreciation.push(cumulative)
            book -= deprec
            bookValue.push(book)
          } else {
            annualDepreciation.push(0)
            cumulativeDepreciation.push(cumulative)
            bookValue.push(salvageValue)
          }
        }
        break

      case 'macrs':
        // MACRS 20-year property rates
        const macrsRates = [3.75, 7.219, 6.677, 6.177, 5.713, 5.285, 4.888, 4.522, 4.462, 4.461, 4.462, 4.461, 4.462, 4.461, 4.462, 4.461, 4.462, 4.461, 4.462, 4.461, 2.231]
        for (let year = 0; year <= this.input.project_lifetime_years; year++) {
          if (year === 0) {
            annualDepreciation.push(0)
            cumulativeDepreciation.push(0)
            bookValue.push(assetValue)
          } else if (year <= macrsRates.length) {
            const deprec = assetValue * (macrsRates[year - 1] / 100)
            annualDepreciation.push(deprec)
            cumulative += deprec
            cumulativeDepreciation.push(cumulative)
            book = assetValue - cumulative
            bookValue.push(book)
          } else {
            annualDepreciation.push(0)
            cumulativeDepreciation.push(cumulative)
            bookValue.push(0)
          }
        }
        break
    }

    return {
      method,
      assetValue,
      usefulLife,
      salvageValue,
      annualDepreciation,
      cumulativeDepreciation,
      bookValue,
    }
  }

  /**
   * Calculate debt schedule
   */
  private calculateDebtSchedule(): DebtSchedule {
    const totalCapex = this.calculateTotalCAPEX()
    const debtFraction = this.input.financialDetailed?.financing.debtFraction || this.input.debt_ratio
    const principal = totalCapex * debtFraction

    const interestRate = this.input.financialDetailed?.financing.costOfDebt || this.input.interest_rate || 6
    const term = this.input.project_lifetime_years

    // Calculate annual payment (amortization)
    const r = interestRate / 100
    const annualPayment = principal * (r * Math.pow(1 + r, term)) / (Math.pow(1 + r, term) - 1)

    const schedule: DebtSchedule['schedule'] = []
    let balance = principal

    for (let year = 1; year <= term; year++) {
      const interest = balance * r
      const principalPmt = annualPayment - interest
      const endingBalance = balance - principalPmt

      schedule.push({
        year,
        beginningBalance: balance,
        payment: annualPayment,
        interest,
        principal: principalPmt,
        endingBalance: Math.max(0, endingBalance),
      })

      balance = endingBalance
    }

    return {
      principal,
      interestRate,
      term,
      annualPayment,
      schedule,
    }
  }

  /**
   * Calculate CAPEX for a specific construction year
   */
  private calculateCapexForYear(year: number): number {
    const totalCapex = this.calculateTotalCAPEX()
    const schedule = this.input.financialDetailed?.construction.investmentSchedule || [100]

    if (year < schedule.length) {
      return totalCapex * (schedule[year] / 100)
    }

    return 0
  }

  /**
   * Calculate total CAPEX
   */
  private calculateTotalCAPEX(): number {
    if (this.input.capexDetailed?.tasc?.total) {
      return this.input.capexDetailed.tasc.total
    }

    if (this.input.capexDetailed?.toc?.total) {
      return this.input.capexDetailed.toc.total
    }

    // Simplified calculation
    const equipment = this.input.capacity_mw * this.input.capex_per_kw * 1000
    const installed = equipment * this.input.installation_factor
    return installed + this.input.land_cost + this.input.grid_connection_cost
  }

  /**
   * Calculate annual production
   */
  private calculateAnnualProduction(): number {
    return this.input.annual_production_mwh || this.input.capacity_mw * this.input.capacity_factor * 8760 * 1000
  }

  /**
   * Calculate summary from yearly data
   */
  private calculateSummary(years: YearlyFinancialData[]): ProFormaStatement['summary'] {
    return {
      totalRevenue: years.reduce((sum, y) => sum + y.totalRevenue, 0),
      totalOPEX: years.reduce((sum, y) => sum + y.totalOPEX, 0),
      totalDepreciation: years.reduce((sum, y) => sum + y.depreciation, 0),
      totalTaxes: years.reduce((sum, y) => sum + y.taxes, 0),
      totalNetIncome: years.reduce((sum, y) => sum + y.netIncome, 0),
      totalCashFlow: years.reduce((sum, y) => sum + y.freeCashFlow, 0),
      npv: years.reduce((sum, y) => sum + y.discountedCashFlow, 0),
      irr: this.calculateIRR(years.map(y => y.freeCashFlow)),
    }
  }

  /**
   * Calculate IRR from cash flows (Newton-Raphson)
   */
  private calculateIRR(cashFlows: number[]): number {
    let irr = 0.1
    const maxIterations = 100
    const tolerance = 0.0001

    for (let i = 0; i < maxIterations; i++) {
      let npv = 0
      let dnpv = 0

      for (let t = 0; t < cashFlows.length; t++) {
        npv += cashFlows[t] / Math.pow(1 + irr, t)
        dnpv -= (t * cashFlows[t]) / (Math.pow(1 + irr, t) * (1 + irr))
      }

      if (Math.abs(npv) < tolerance) break

      irr = irr - npv / dnpv

      if (irr < -0.99) irr = -0.99
      if (irr > 10) irr = 10
    }

    return irr * 100
  }
}

/**
 * Calculate WACC (Weighted Average Cost of Capital)
 */
export function calculateWACC(params: {
  equityFraction: number
  debtFraction: number
  costOfEquity: number // percentage
  costOfDebt: number // percentage
  taxRate: number // percentage
}): number {
  const E = params.equityFraction
  const D = params.debtFraction
  const Re = params.costOfEquity / 100
  const Rd = params.costOfDebt / 100
  const Tc = params.taxRate / 100

  // WACC = (E/(D+E)) * Re + (D/(D+E)) * Rd * (1-Tc)
  const wacc = (E / (D + E)) * Re + (D / (D + E)) * Rd * (1 - Tc)

  return wacc * 100
}

/**
 * Calculate Fixed Charge Factor
 */
export function calculateFixedChargeFactor(params: {
  discountRate: number // percentage
  lifetime: number // years
  insuranceRate: number // percentage of CAPEX
  propertyTaxRate: number // percentage of CAPEX
}): number {
  const i = params.discountRate / 100
  const n = params.lifetime

  // Capital Recovery Factor
  const crf = (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1)

  // Add insurance and property tax
  const fcf = crf + params.insuranceRate / 100 + params.propertyTaxRate / 100

  return fcf
}

/**
 * Calculate working capital requirements
 */
export function calculateWorkingCapital(params: {
  annualRevenue: number
  annualOPEX: number
  inventoryMonths: number
  receivablesMonths: number
  payablesMonths: number
}): {
  inventory: number
  receivables: number
  payables: number
  netWorkingCapital: number
} {
  const inventory = (params.annualOPEX / 12) * params.inventoryMonths
  const receivables = (params.annualRevenue / 12) * params.receivablesMonths
  const payables = (params.annualOPEX / 12) * params.payablesMonths

  const netWorkingCapital = inventory + receivables - payables

  return {
    inventory,
    receivables,
    payables,
    netWorkingCapital,
  }
}

/**
 * Calculate escalation-adjusted value
 */
export function applyEscalation(
  baseValue: number,
  escalationRate: number, // percentage per year
  year: number
): number {
  return baseValue * Math.pow(1 + escalationRate / 100, year)
}

/**
 * Generate pro-forma income statement (convenience function)
 */
export function generateProFormaStatement(input: TEAInput_v2): ProFormaStatement {
  const engine = new FinancialEngine(input)
  return engine.generateProForma()
}
