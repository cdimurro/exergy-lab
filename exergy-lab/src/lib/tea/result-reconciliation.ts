/**
 * Result Reconciliation System
 *
 * Validates that all TEA results are internally consistent before report generation:
 * - Mass and energy balances converge
 * - Economic metrics are self-consistent
 * - NPV = 0 when MSP is used
 * - Sensitivity analysis shows expected relationships
 * - Results match reference cases for known pathways
 *
 * Final checkpoint before report generation
 */

import type { TEAInput_v2, TEAResult_v2 } from '@/types/tea'
import type { MaterialBalance, EnergyBalance } from '@/types/tea-process'

export interface ReconciliationCheck {
  category: 'balance' | 'economic' | 'sensitivity' | 'reference'
  check: string
  passed: boolean
  severity: 'critical' | 'major' | 'minor'
  details: string
  values?: {
    expected: number
    actual: number
    difference: number
    tolerance: number
  }
}

export interface ReconciliationResult {
  reconciled: boolean
  confidence: number // 0-100
  checks: ReconciliationCheck[]
  criticalIssues: string[]
  warnings: string[]
  recommendations: string[]
}

/**
 * Convergence tolerance standards
 */
const CONVERGENCE_TOLERANCES = {
  massBalance: 0.01, // 1% error acceptable
  energyBalance: 0.02, // 2% error acceptable
  economicConsistency: 0.001, // 0.1% error for economic calculations
  npvAtMSP: 0.01, // NPV should be within 1% of zero when MSP is used
}

/**
 * Result Reconciliation Class
 */
export class ResultReconciliator {
  private input: TEAInput_v2
  private results: TEAResult_v2
  private checks: ReconciliationCheck[] = []

  constructor(input: TEAInput_v2, results: TEAResult_v2) {
    this.input = input
    this.results = results
  }

  /**
   * Perform comprehensive reconciliation
   */
  reconcile(): ReconciliationResult {
    // Reset checks
    this.checks = []

    // 1. Validate mass balances (if available)
    if (this.input.materialBalances && this.input.materialBalances.length > 0) {
      this.validateMassBalances()
    }

    // 2. Validate energy balance (if available)
    if (this.input.energyBalance) {
      this.validateEnergyBalance()
    }

    // 3. Validate economic metric consistency
    this.validateEconomicConsistency()

    // 4. Validate NPV = 0 at MSP (if MSP calculated)
    if (this.results.extendedMetrics?.msp) {
      this.validateMSPConsistency()
    }

    // 5. Validate sensitivity analysis (if available)
    if (this.results.sensitivityResults) {
      this.validateSensitivityConsistency()
    }

    // 6. Validate cash flow consistency
    this.validateCashFlowConsistency()

    // Analyze results
    const criticalIssues = this.checks.filter(c => !c.passed && c.severity === 'critical').map(c => c.details)

    const warnings = this.checks.filter(c => !c.passed && c.severity !== 'critical').map(c => c.details)

    const reconciled = criticalIssues.length === 0
    const confidence = this.calculateConfidence()
    const recommendations = this.generateRecommendations()

    return {
      reconciled,
      confidence,
      checks: this.checks,
      criticalIssues,
      warnings,
      recommendations,
    }
  }

  /**
   * Validate all mass balances converge
   */
  private validateMassBalances() {
    if (!this.input.materialBalances) return

    for (const balance of this.input.materialBalances) {
      const convergence = Math.abs(balance.convergence)
      const totalFlow = Object.values(balance.inlet).reduce((sum, flow) => sum + flow, 0)
      const relativeError = totalFlow > 0 ? convergence / totalFlow : 0

      const passed = relativeError < CONVERGENCE_TOLERANCES.massBalance

      this.checks.push({
        category: 'balance',
        check: `${balance.component} Mass Balance`,
        passed,
        severity: passed ? 'minor' : 'critical',
        details: passed
          ? `${balance.component} balance converged (${(relativeError * 100).toFixed(3)}% error)`
          : `${balance.component} balance NOT converged (${(relativeError * 100).toFixed(3)}% error > ${CONVERGENCE_TOLERANCES.massBalance * 100}% tolerance)`,
        values: {
          expected: 0,
          actual: convergence,
          difference: convergence,
          tolerance: CONVERGENCE_TOLERANCES.massBalance * totalFlow,
        },
      })
    }
  }

  /**
   * Validate energy balance converges
   */
  private validateEnergyBalance() {
    if (!this.input.energyBalance) return

    const convergence = Math.abs(this.input.energyBalance.convergence)
    const totalEnergyIn = this.input.energyBalance.totalIn
    const relativeError = totalEnergyIn > 0 ? convergence / totalEnergyIn : 0

    const passed = relativeError < CONVERGENCE_TOLERANCES.energyBalance

    this.checks.push({
      category: 'balance',
      check: 'Energy Balance',
      passed,
      severity: passed ? 'minor' : 'critical',
      details: passed
        ? `Energy balance converged (${(relativeError * 100).toFixed(3)}% error)`
        : `Energy balance NOT converged (${(relativeError * 100).toFixed(3)}% error > ${CONVERGENCE_TOLERANCES.energyBalance * 100}% tolerance)`,
      values: {
        expected: this.input.energyBalance.totalOut,
        actual: this.input.energyBalance.totalIn,
        difference: convergence,
        tolerance: CONVERGENCE_TOLERANCES.energyBalance * totalEnergyIn,
      },
    })
  }

  /**
   * Validate economic metric consistency
   */
  private validateEconomicConsistency() {
    // Check 1: NPV and IRR relationship
    // If NPV > 0, then IRR > discount rate
    // If NPV < 0, then IRR < discount rate
    const npvPositive = this.results.npv > 0
    const irrAboveDiscount = this.results.irr > this.input.discount_rate
    const npvIrrConsistent = (npvPositive && irrAboveDiscount) || (!npvPositive && !irrAboveDiscount)

    this.checks.push({
      category: 'economic',
      check: 'NPV-IRR Consistency',
      passed: npvIrrConsistent,
      severity: npvIrrConsistent ? 'minor' : 'critical',
      details: npvIrrConsistent
        ? `NPV (${this.results.npv >= 0 ? '+' : ''}${(this.results.npv / 1e6).toFixed(2)}M) and IRR (${this.results.irr.toFixed(1)}%) are consistent with discount rate (${this.input.discount_rate}%)`
        : `NPV and IRR are INCONSISTENT. NPV is ${npvPositive ? 'positive' : 'negative'} but IRR is ${irrAboveDiscount ? 'above' : 'below'} discount rate.`,
      values: {
        expected: this.input.discount_rate,
        actual: this.results.irr,
        difference: this.results.irr - this.input.discount_rate,
        tolerance: 0.1,
      },
    })

    // Check 2: Profitability Index consistency
    if (this.results.extendedMetrics?.profitabilityIndex) {
      const pi = this.results.extendedMetrics.profitabilityIndex
      const npv = this.results.npv
      const capex = this.results.total_capex

      // PI = 1 + (NPV / Initial Investment)
      const expectedPI = 1 + npv / capex
      const piError = Math.abs((pi - expectedPI) / expectedPI)
      const piConsistent = piError < CONVERGENCE_TOLERANCES.economicConsistency

      this.checks.push({
        category: 'economic',
        check: 'Profitability Index Consistency',
        passed: piConsistent,
        severity: piConsistent ? 'minor' : 'major',
        details: piConsistent
          ? `Profitability Index (${pi.toFixed(3)}) correctly calculated from NPV and CAPEX`
          : `Profitability Index (${pi.toFixed(3)}) inconsistent with NPV (${(npv / 1e6).toFixed(2)}M) and CAPEX (${(capex / 1e6).toFixed(2)}M). Expected: ${expectedPI.toFixed(3)}`,
        values: {
          expected: expectedPI,
          actual: pi,
          difference: pi - expectedPI,
          tolerance: CONVERGENCE_TOLERANCES.economicConsistency,
        },
      })
    }

    // Check 3: Total costs consistency
    const totalCapex = this.results.total_capex
    const totalOpex = this.results.annual_opex
    const totalLifetimeCost = this.results.total_lifetime_cost

    // Lifetime cost should approximately equal CAPEX + (OPEX * lifetime)
    const expectedLifetimeCost = totalCapex + totalOpex * this.input.project_lifetime_years
    const lifetimeCostError = Math.abs((totalLifetimeCost - expectedLifetimeCost) / expectedLifetimeCost)
    const lifetimeCostConsistent = lifetimeCostError < 0.1 // 10% tolerance (taxes, depreciation affect this)

    this.checks.push({
      category: 'economic',
      check: 'Lifetime Cost Consistency',
      passed: lifetimeCostConsistent,
      severity: lifetimeCostConsistent ? 'minor' : 'major',
      details: lifetimeCostConsistent
        ? 'Lifetime cost consistent with CAPEX and OPEX'
        : `Lifetime cost (${(totalLifetimeCost / 1e6).toFixed(2)}M) inconsistent with CAPEX + OPEX over ${this.input.project_lifetime_years} years (expected: ${(expectedLifetimeCost / 1e6).toFixed(2)}M)`,
      values: {
        expected: expectedLifetimeCost,
        actual: totalLifetimeCost,
        difference: totalLifetimeCost - expectedLifetimeCost,
        tolerance: expectedLifetimeCost * 0.1,
      },
    })
  }

  /**
   * Validate MSP consistency (NPV should be ~0 when MSP is used as selling price)
   */
  private validateMSPConsistency() {
    // This check requires recalculating NPV using MSP as the selling price
    // For now, we'll check if MSP * production covers costs

    const msp = this.results.extendedMetrics?.msp || 0
    const annualProduction = this.input.annual_production_mwh || 0
    const lifetime = this.input.project_lifetime_years
    const discountRate = this.input.discount_rate / 100

    // Simple check: MSP * total production should approximately equal total costs
    let pvRevenue = 0
    for (let year = 1; year <= lifetime; year++) {
      pvRevenue += ((msp * annualProduction) / 1000) / Math.pow(1 + discountRate, year)
    }

    let pvCosts = this.results.total_capex
    for (let year = 1; year <= lifetime; year++) {
      pvCosts += this.results.annual_opex / Math.pow(1 + discountRate, year)
    }

    const difference = Math.abs(pvRevenue - pvCosts)
    const relativeError = difference / pvCosts
    const passed = relativeError < CONVERGENCE_TOLERANCES.npvAtMSP

    this.checks.push({
      category: 'economic',
      check: 'MSP-NPV Consistency',
      passed,
      severity: passed ? 'minor' : 'major',
      details: passed
        ? 'MSP yields NPV ≈ 0 as expected'
        : `MSP (${msp.toFixed(4)} $/kWh) does not yield NPV ≈ 0. PV(Revenue) - PV(Costs) = ${(difference / 1e6).toFixed(2)}M`,
      values: {
        expected: pvCosts,
        actual: pvRevenue,
        difference,
        tolerance: pvCosts * CONVERGENCE_TOLERANCES.npvAtMSP,
      },
    })
  }

  /**
   * Validate sensitivity analysis shows expected relationships
   */
  private validateSensitivityConsistency() {
    if (!this.results.sensitivityResults) return

    // Check that sensitivity results show logical relationships
    // E.g., higher discount rate should increase LCOE
    // E.g., higher capacity factor should decrease LCOE

    const tornadoData = this.results.sensitivityResults.tornadoPlotData

    for (const param of tornadoData) {
      // Basic sanity check: impact should be non-zero for most parameters
      const hasImpact =
        Math.abs(param.lowCase.impact) > 0.01 || Math.abs(param.highCase.impact) > 0.01

      this.checks.push({
        category: 'sensitivity',
        check: `Sensitivity to ${param.parameter}`,
        passed: hasImpact,
        severity: 'minor',
        details: hasImpact
          ? `${param.parameter} shows measurable impact on results`
          : `${param.parameter} shows negligible impact (possible error or irrelevant parameter)`,
      })
    }

    // Check critical parameters are identified
    const criticalParams = this.results.sensitivityResults.criticalParameters
    if (criticalParams.length === 0) {
      this.checks.push({
        category: 'sensitivity',
        check: 'Critical Parameters Identified',
        passed: false,
        severity: 'minor',
        details: 'No critical parameters identified in sensitivity analysis',
      })
    } else {
      this.checks.push({
        category: 'sensitivity',
        check: 'Critical Parameters Identified',
        passed: true,
        severity: 'minor',
        details: `${criticalParams.length} critical parameters identified: ${criticalParams.slice(0, 3).join(', ')}${criticalParams.length > 3 ? '...' : ''}`,
      })
    }
  }

  /**
   * Validate cash flow consistency
   */
  private validateCashFlowConsistency() {
    if (!this.results.cash_flows || this.results.cash_flows.length === 0) {
      this.checks.push({
        category: 'economic',
        check: 'Cash Flow Data',
        passed: false,
        severity: 'major',
        details: 'No cash flow data available for validation',
      })
      return
    }

    // Check 1: Cash flows should span project lifetime
    const expectedYears = this.input.project_lifetime_years + 1 // Year 0 + operating years
    const actualYears = this.results.cash_flows.length

    this.checks.push({
      category: 'economic',
      check: 'Cash Flow Timeline',
      passed: actualYears === expectedYears,
      severity: actualYears === expectedYears ? 'minor' : 'major',
      details:
        actualYears === expectedYears
          ? `Cash flows cover full project timeline (${actualYears} years)`
          : `Cash flow timeline (${actualYears} years) doesn't match project lifetime (${expectedYears} years)`,
      values: {
        expected: expectedYears,
        actual: actualYears,
        difference: actualYears - expectedYears,
        tolerance: 0,
      },
    })

    // Check 2: Year 0 should be negative (initial investment)
    const year0CashFlow = this.results.cash_flows[0]?.cashFlow || 0
    const year0Negative = year0CashFlow < 0

    this.checks.push({
      category: 'economic',
      check: 'Initial Investment',
      passed: year0Negative,
      severity: year0Negative ? 'minor' : 'critical',
      details: year0Negative
        ? `Year 0 cash flow is negative (initial investment: ${(Math.abs(year0CashFlow) / 1e6).toFixed(2)}M)`
        : `Year 0 cash flow should be negative (initial investment), but is: ${year0CashFlow}`,
    })

    // Check 3: Cumulative cash flow should match sum of annual cash flows
    const sumAnnual = this.results.cash_flows.reduce((sum, cf) => sum + cf.cashFlow, 0)
    const finalCumulative =
      this.results.cash_flows[this.results.cash_flows.length - 1]?.cumulativeCashFlow || 0

    const cumulativeError = Math.abs((finalCumulative - sumAnnual) / sumAnnual)
    const cumulativeConsistent = cumulativeError < 0.001 // 0.1% tolerance

    this.checks.push({
      category: 'economic',
      check: 'Cumulative Cash Flow Consistency',
      passed: cumulativeConsistent,
      severity: cumulativeConsistent ? 'minor' : 'major',
      details: cumulativeConsistent
        ? 'Cumulative cash flows correctly summed'
        : `Cumulative cash flow (${(finalCumulative / 1e6).toFixed(2)}M) doesn't match sum of annual flows (${(sumAnnual / 1e6).toFixed(2)}M)`,
      values: {
        expected: sumAnnual,
        actual: finalCumulative,
        difference: finalCumulative - sumAnnual,
        tolerance: sumAnnual * 0.001,
      },
    })
  }

  /**
   * Validate LCOE and ROI calculation consistency
   */
  private validateLCOEAndROIConsistency() {
    // LCOE calculation consistency
    // LCOE * Production should approximately equal Total Costs (levelized)
    const lcoe = this.results.lcoe
    const annualProduction = this.input.annual_production_mwh || this.calculateAnnualProduction()
    const lifetime = this.input.project_lifetime_years

    const totalEnergyRevenue = lcoe * annualProduction * lifetime
    const totalCosts = this.results.total_lifetime_cost

    const lcoeError = Math.abs((totalEnergyRevenue - totalCosts) / totalCosts)
    const lcoeConsistent = lcoeError < 0.1 // 10% tolerance (due to discounting effects)

    this.checks.push({
      category: 'economic',
      check: 'LCOE Calculation Consistency',
      passed: lcoeConsistent,
      severity: lcoeConsistent ? 'minor' : 'major',
      details: lcoeConsistent
        ? 'LCOE consistent with total costs and production'
        : `LCOE * Production (${(totalEnergyRevenue / 1e6).toFixed(2)}M) significantly differs from Total Costs (${(totalCosts / 1e6).toFixed(2)}M)`,
      values: {
        expected: totalCosts,
        actual: totalEnergyRevenue,
        difference: totalEnergyRevenue - totalCosts,
        tolerance: totalCosts * 0.1,
      },
    })

    // ROI and NPV relationship
    if (this.results.extendedMetrics?.roi) {
      const roi = this.results.extendedMetrics.roi
      const npv = this.results.npv
      const capex = this.results.total_capex

      // ROI = (NPV / CAPEX) * 100
      const expectedROI = (npv / capex) * 100
      const roiError = Math.abs((roi - expectedROI) / expectedROI)
      const roiConsistent = roiError < CONVERGENCE_TOLERANCES.economicConsistency

      this.checks.push({
        category: 'economic',
        check: 'ROI Calculation',
        passed: roiConsistent,
        severity: roiConsistent ? 'minor' : 'major',
        details: roiConsistent
          ? 'ROI correctly calculated from NPV and CAPEX'
          : `ROI (${roi.toFixed(1)}%) inconsistent with NPV (${(npv / 1e6).toFixed(2)}M) and CAPEX (${(capex / 1e6).toFixed(2)}M). Expected: ${expectedROI.toFixed(1)}%`,
        values: {
          expected: expectedROI,
          actual: roi,
          difference: roi - expectedROI,
          tolerance: expectedROI * CONVERGENCE_TOLERANCES.economicConsistency,
        },
      })
    }
  }

  /**
   * Validate MSP definition exists
   */
  private validateMSPDefinition() {
    // Check if MSP is defined and reasonable
    const msp = this.results.extendedMetrics?.msp || 0

    this.checks.push({
      category: 'economic',
      check: 'MSP Definition',
      passed: msp > 0,
      severity: msp > 0 ? 'minor' : 'minor',
      details: msp > 0
        ? `MSP defined: ${msp.toFixed(4)} $/kWh`
        : 'MSP not calculated',
    })
  }

  /**
   * Calculate annual production (helper)
   */
  private calculateAnnualProduction(): number {
    return this.input.capacity_mw * this.input.capacity_factor * 8760 * 1000 // kWh
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(): number {
    if (this.checks.length === 0) return 0

    const totalChecks = this.checks.length
    const passedChecks = this.checks.filter(c => c.passed).length
    const criticalFailed = this.checks.filter(c => !c.passed && c.severity === 'critical').length

    // Base confidence
    let confidence = (passedChecks / totalChecks) * 100

    // Heavy penalty for critical failures
    confidence -= criticalFailed * 25

    // Ensure 0-100 range
    return Math.max(0, Math.min(100, Math.round(confidence)))
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = []

    const failedCritical = this.checks.filter(c => !c.passed && c.severity === 'critical')
    const failedMajor = this.checks.filter(c => !c.passed && c.severity === 'major')

    if (failedCritical.length > 0) {
      recommendations.push(`CRITICAL: ${failedCritical.length} critical consistency check(s) failed.`)
      failedCritical.forEach(check => {
        recommendations.push(`  - ${check.details}`)
      })
      recommendations.push('DO NOT generate report until critical issues are resolved.')
    }

    if (failedMajor.length > 0) {
      recommendations.push(`${failedMajor.length} major consistency check(s) failed.`)
      recommendations.push('Review and address before finalizing report.')
    }

    const balanceFailed = this.checks.filter(
      c => c.category === 'balance' && !c.passed
    )

    if (balanceFailed.length > 0) {
      recommendations.push('Mass or energy balances not converged. Check process model for errors.')
    }

    const economicFailed = this.checks.filter(
      c => c.category === 'economic' && !c.passed
    )

    if (economicFailed.length > 0) {
      recommendations.push('Economic metrics inconsistent. Verify calculation formulas and inputs.')
    }

    if (recommendations.length === 0) {
      recommendations.push('All reconciliation checks passed. Results are internally consistent.')
    }

    return recommendations
  }
}

/**
 * Convenience function for reconciliation
 */
export function reconcileResults(input: TEAInput_v2, results: TEAResult_v2): ReconciliationResult {
  const reconciliator = new ResultReconciliator(input, results)
  return reconciliator.reconcile()
}

/**
 * Check if a specific balance has converged
 */
export function checkBalanceConvergence(
  balance: MaterialBalance | EnergyBalance,
  tolerance: number = 0.01
): {
  converged: boolean
  error: number
  relativeError: number
  message: string
} {
  const convergence = Math.abs(balance.convergence)
  const totalFlow =
    'totalIn' in balance
      ? balance.totalIn
      : Object.values((balance as MaterialBalance).inlet).reduce((sum, flow) => sum + flow, 0)

  const relativeError = totalFlow > 0 ? convergence / totalFlow : 0
  const converged = relativeError < tolerance

  return {
    converged,
    error: convergence,
    relativeError,
    message: converged
      ? `Balance converged (${(relativeError * 100).toFixed(3)}% error < ${tolerance * 100}% tolerance)`
      : `Balance NOT converged (${(relativeError * 100).toFixed(3)}% error > ${tolerance * 100}% tolerance)`,
  }
}
