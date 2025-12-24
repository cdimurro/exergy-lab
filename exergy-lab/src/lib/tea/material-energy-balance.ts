/**
 * Material and Energy Balance Module
 *
 * Comprehensive material and energy balance calculations for process TEA:
 * - Carbon balance (all carbon-containing streams)
 * - Water balance (makeup, recycle, consumption, discharge)
 * - Generic component balances (H2, O2, N2, etc.)
 * - Energy balance (heat duties, power, enthalpy flows)
 * - Stream property calculations
 * - Convergence validation (<1% error for mass, <2% for energy)
 *
 * Based on NETL DOE standards for process analysis
 */

import type {
  MaterialBalance,
  EnergyBalance,
  ProcessStream,
  FeedstockSpecification,
} from '@/types/tea-process'

/**
 * Component property database
 * Physical and thermodynamic properties for common components
 */
interface ComponentProperties {
  name: string
  formula: string
  molecularWeight: number // g/mol
  phase: 'gas' | 'liquid' | 'solid'
  density?: number // kg/m³ at STP
  cp?: number // Specific heat capacity (kJ/kg·K)
  enthalpy?: { value: number; temperature: number; pressure: number } // Reference state
  lhv?: number // Lower Heating Value (MJ/kg)
  hhv?: number // Higher Heating Value (MJ/kg)
}

const COMPONENT_DATABASE: Record<string, ComponentProperties> = {
  CO2: { name: 'Carbon Dioxide', formula: 'CO2', molecularWeight: 44.01, phase: 'gas', density: 1.98 },
  H2O: { name: 'Water', formula: 'H2O', molecularWeight: 18.02, phase: 'liquid', density: 1000, cp: 4.18 },
  H2: { name: 'Hydrogen', formula: 'H2', molecularWeight: 2.02, phase: 'gas', density: 0.09, lhv: 120 },
  O2: { name: 'Oxygen', formula: 'O2', molecularWeight: 32.00, phase: 'gas', density: 1.43 },
  N2: { name: 'Nitrogen', formula: 'N2', molecularWeight: 28.01, phase: 'gas', density: 1.25 },
  CH4: { name: 'Methane', formula: 'CH4', molecularWeight: 16.04, phase: 'gas', density: 0.72, lhv: 50, hhv: 55.5 },
  CO: { name: 'Carbon Monoxide', formula: 'CO', molecularWeight: 28.01, phase: 'gas', density: 1.25 },
  C2H5OH: { name: 'Ethanol', formula: 'C2H5OH', molecularWeight: 46.07, phase: 'liquid', density: 789, lhv: 26.8 },
}

/**
 * Material Balance Calculator
 */
export class MaterialBalanceCalculator {
  private streams: ProcessStream[]
  private tolerance: number

  constructor(streams: ProcessStream[], tolerance: number = 0.01) {
    this.streams = streams
    this.tolerance = tolerance
  }

  /**
   * Calculate carbon balance
   * Tracks all carbon atoms through the process
   */
  calculateCarbonBalance(): MaterialBalance {
    const inlet: Record<string, number> = {}
    const outlet: Record<string, number> = {}
    let totalIn = 0
    let totalOut = 0

    for (const stream of this.streams) {
      const carbonFlow = this.calculateCarbonInStream(stream)

      if (this.isInletStream(stream)) {
        inlet[stream.id] = carbonFlow
        totalIn += carbonFlow
      } else {
        outlet[stream.id] = carbonFlow
        totalOut += carbonFlow
      }
    }

    const convergence = totalIn - totalOut
    const converged = Math.abs(convergence) / totalIn < this.tolerance

    return {
      component: 'Carbon',
      unit: 'kg/hr',
      inlet,
      outlet,
      accumulation: 0, // Assume steady-state
      convergence,
      converged,
    }
  }

  /**
   * Calculate water balance
   * Includes makeup, recycle, consumption, discharge
   */
  calculateWaterBalance(): MaterialBalance & {
    waterDemand: number
    internalRecycle: number
    rawWaterWithdrawal: number
    processDischarge: number
    consumption: number
  } {
    const inlet: Record<string, number> = {}
    const outlet: Record<string, number> = {}
    let totalIn = 0
    let totalOut = 0
    let internalRecycle = 0

    for (const stream of this.streams) {
      const waterFlow = this.calculateComponentInStream(stream, 'H2O')

      if (this.isInletStream(stream)) {
        if (stream.name.includes('recycle') || stream.name.includes('return')) {
          internalRecycle += waterFlow
        } else {
          inlet[stream.id] = waterFlow
          totalIn += waterFlow
        }
      } else {
        outlet[stream.id] = waterFlow
        totalOut += waterFlow
      }
    }

    const convergence = totalIn - totalOut
    const converged = Math.abs(convergence) / Math.max(totalIn, 1) < this.tolerance

    return {
      component: 'Water (H2O)',
      unit: 'kg/hr',
      inlet,
      outlet,
      accumulation: 0,
      convergence,
      converged,
      waterDemand: totalIn + internalRecycle,
      internalRecycle,
      rawWaterWithdrawal: totalIn,
      processDischarge: totalOut,
      consumption: totalIn - totalOut, // Water consumed in process
    }
  }

  /**
   * Calculate generic component balance
   */
  calculateComponentBalance(component: string): MaterialBalance {
    const inlet: Record<string, number> = {}
    const outlet: Record<string, number> = {}
    let totalIn = 0
    let totalOut = 0

    for (const stream of this.streams) {
      const componentFlow = this.calculateComponentInStream(stream, component)

      if (componentFlow > 0) {
        if (this.isInletStream(stream)) {
          inlet[stream.id] = componentFlow
          totalIn += componentFlow
        } else {
          outlet[stream.id] = componentFlow
          totalOut += componentFlow
        }
      }
    }

    const convergence = totalIn - totalOut
    const converged = Math.abs(convergence) / Math.max(totalIn, 1) < this.tolerance

    return {
      component,
      unit: 'kg/hr',
      inlet,
      outlet,
      accumulation: 0,
      convergence,
      converged,
    }
  }

  /**
   * Calculate carbon content in a stream
   */
  private calculateCarbonInStream(stream: ProcessStream): number {
    let carbonMass = 0

    // Carbon-containing components
    const carbonComponents = ['CO2', 'CO', 'CH4', 'C2H5OH', 'biomass', 'coal']

    for (const [component, moleFraction] of Object.entries(stream.composition)) {
      if (carbonComponents.some(cc => component.includes(cc))) {
        const componentMW = this.getComponentMW(component)
        const carbonAtoms = this.getCarbonAtoms(component)

        // Calculate mass flow of carbon from this component
        const componentMassFlow = stream.flowRate.molar * moleFraction * componentMW / 1000 // kg/hr
        const carbonFraction = (carbonAtoms * 12.01) / componentMW
        carbonMass += componentMassFlow * carbonFraction
      }
    }

    return carbonMass
  }

  /**
   * Calculate specific component mass flow in stream
   */
  private calculateComponentInStream(stream: ProcessStream, component: string): number {
    const moleFraction = stream.composition[component] || 0
    if (moleFraction === 0) return 0

    const componentMW = this.getComponentMW(component)
    return stream.flowRate.molar * moleFraction * componentMW / 1000 // kg/hr
  }

  /**
   * Determine if stream is inlet or outlet
   */
  private isInletStream(stream: ProcessStream): boolean {
    // Simple heuristic: check stream name/number
    // In full implementation, this would be based on PFD topology
    return (
      stream.name.includes('feed') ||
      stream.name.includes('inlet') ||
      stream.name.includes('input') ||
      stream.streamNumber < 100
    )
  }

  /**
   * Get molecular weight from database
   */
  private getComponentMW(component: string): number {
    return COMPONENT_DATABASE[component]?.molecularWeight || 44 // Default to CO2 MW
  }

  /**
   * Get number of carbon atoms in component
   */
  private getCarbonAtoms(component: string): number {
    const carbonCounts: Record<string, number> = {
      CO2: 1,
      CO: 1,
      CH4: 1,
      C2H5OH: 2,
      C3H8: 3,
    }
    return carbonCounts[component] || 0
  }

  /**
   * Validate all balances
   */
  validateAllBalances(): {
    carbonBalance: MaterialBalance
    waterBalance: MaterialBalance
    allBalancesConverged: boolean
    issues: string[]
  } {
    const carbonBalance = this.calculateCarbonBalance()
    const waterBalance = this.calculateWaterBalance()

    const issues: string[] = []

    if (!carbonBalance.converged) {
      issues.push(
        `Carbon balance not converged: ${((Math.abs(carbonBalance.convergence) / Math.abs(carbonBalance.inlet['total'] || 1)) * 100).toFixed(2)}% error`
      )
    }

    if (!waterBalance.converged) {
      issues.push(
        `Water balance not converged: ${((Math.abs(waterBalance.convergence) / Math.abs(waterBalance.inlet['total'] || 1)) * 100).toFixed(2)}% error`
      )
    }

    return {
      carbonBalance,
      waterBalance,
      allBalancesConverged: carbonBalance.converged && waterBalance.converged,
      issues,
    }
  }
}

/**
 * Energy Balance Calculator
 */
export class EnergyBalanceCalculator {
  private streams: ProcessStream[]
  private tolerance: number

  constructor(streams: ProcessStream[], tolerance: number = 0.02) {
    this.streams = streams
    this.tolerance = tolerance
  }

  /**
   * Calculate overall energy balance
   */
  calculateEnergyBalance(params: {
    heatDuties?: Record<string, number> // equipment: heat duty (kW)
    powerLoads?: Record<string, number> // equipment: power (kW)
    fuelInputs?: Record<string, number> // fuel: energy (kW)
  }): EnergyBalance {
    // Energy inputs
    const feedstockEnthalpy = this.calculateEnthalpyFlowInlets()
    const heatDuty = Object.values(params.heatDuties || {}).reduce((sum, h) => sum + Math.max(0, h), 0)
    const workInput = Object.values(params.powerLoads || {}).reduce((sum, p) => sum + p, 0)
    const fuel = Object.values(params.fuelInputs || {}).reduce((sum, f) => sum + f, 0)

    const totalIn = feedstockEnthalpy + heatDuty + workInput + fuel

    // Energy outputs
    const productEnthalpy = this.calculateEnthalpyFlowOutlets()
    const heatRemoved = Object.values(params.heatDuties || {}).reduce((sum, h) => sum + Math.max(0, -h), 0)
    const losses = totalIn * 0.05 // Assume 5% heat losses

    const totalOut = productEnthalpy + heatRemoved + losses

    const convergence = totalIn - totalOut
    const converged = Math.abs(convergence) / totalIn < this.tolerance

    return {
      unit: 'kW',
      energyIn: {
        feedstockEnthalpy,
        heatDuty,
        workInput,
        fuel,
        electricity: workInput,
      },
      energyOut: {
        productEnthalpy,
        heatRemoved,
        losses,
      },
      totalIn,
      totalOut,
      convergence,
      converged,
    }
  }

  /**
   * Calculate total enthalpy flow for inlet streams
   */
  private calculateEnthalpyFlowInlets(): number {
    let totalEnthalpy = 0

    for (const stream of this.streams) {
      if (this.isInletStream(stream)) {
        const enthalpyFlow = stream.flowRate.mass * stream.enthalpy.kjPerKg / 3600 // Convert to kW
        totalEnthalpy += enthalpyFlow
      }
    }

    return totalEnthalpy
  }

  /**
   * Calculate total enthalpy flow for outlet streams
   */
  private calculateEnthalpyFlowOutlets(): number {
    let totalEnthalpy = 0

    for (const stream of this.streams) {
      if (!this.isInletStream(stream)) {
        const enthalpyFlow = stream.flowRate.mass * stream.enthalpy.kjPerKg / 3600 // Convert to kW
        totalEnthalpy += enthalpyFlow
      }
    }

    return totalEnthalpy
  }

  /**
   * Determine if stream is inlet
   */
  private isInletStream(stream: ProcessStream): boolean {
    return (
      stream.name.includes('feed') ||
      stream.name.includes('inlet') ||
      stream.name.includes('input') ||
      stream.streamNumber < 100
    )
  }
}

/**
 * Stream Property Calculator
 * Calculate thermodynamic properties for process streams
 */
export class StreamPropertyCalculator {
  /**
   * Calculate stream molecular weight from composition
   */
  calculateMolecularWeight(composition: Record<string, number>): number {
    let mw = 0

    for (const [component, moleFraction] of Object.entries(composition)) {
      const componentMW = COMPONENT_DATABASE[component]?.molecularWeight || 44
      mw += moleFraction * componentMW
    }

    return mw
  }

  /**
   * Calculate stream density (simplified ideal gas or liquid)
   */
  calculateDensity(
    composition: Record<string, number>,
    temperature: number, // K
    pressure: number, // MPa
    phase: 'vapor' | 'liquid'
  ): {
    kgPerM3: number
    lbPerFt3: number
  } {
    if (phase === 'liquid') {
      // Weighted average of liquid densities
      let density = 0
      for (const [component, moleFraction] of Object.entries(composition)) {
        const componentDensity = COMPONENT_DATABASE[component]?.density || 1000
        density += moleFraction * componentDensity
      }

      return {
        kgPerM3: density,
        lbPerFt3: density * 0.062428, // Conversion factor
      }
    } else {
      // Ideal gas law: ρ = (P * MW) / (R * T)
      const mw = this.calculateMolecularWeight(composition)
      const R = 8.314 // J/(mol·K)
      const P = pressure * 1e6 // Convert MPa to Pa
      const density = (P * mw) / (R * temperature * 1000) // kg/m³

      return {
        kgPerM3: density,
        lbPerFt3: density * 0.062428,
      }
    }
  }

  /**
   * Calculate stream enthalpy (simplified)
   */
  calculateEnthalpy(
    composition: Record<string, number>,
    temperature: number, // °C
    pressure: number, // MPa
    phase: 'vapor' | 'liquid'
  ): {
    kjPerKg: number
    btuPerLb: number
  } {
    // Simplified: Use sensible heat from reference temperature
    const refTemp = 25 // °C
    const avgCp = 2.0 // kJ/(kg·K) - average specific heat

    const enthalpy = avgCp * (temperature - refTemp)

    // Add latent heat if vapor
    const latentHeat = phase === 'vapor' ? 2257 : 0 // kJ/kg for water vaporization

    const totalEnthalpy = enthalpy + latentHeat

    return {
      kjPerKg: totalEnthalpy,
      btuPerLb: totalEnthalpy * 0.42992, // Conversion factor
    }
  }

  /**
   * Calculate volumetric flow rate
   */
  calculateVolumetricFlow(
    massFlow: number, // kg/hr
    density: number // kg/m³
  ): number {
    return massFlow / density // m³/hr
  }
}

/**
 * Process Stoichiometry Calculator
 * For reaction-based processes
 */
export class StoichiometryCalculator {
  /**
   * Calculate product yields from stoichiometry
   *
   * Example: Fischer-Tropsch
   * CO + 2H2 → -CH2- + H2O
   */
  calculateYields(params: {
    reaction: string
    feedRate: number // kg/hr of limiting reactant
    conversion: number // percentage (0-100)
    selectivity: number // percentage (0-100) to desired product
  }): {
    products: Record<string, number> // product: kg/hr
    byproducts: Record<string, number>
    unreactedFeed: number
  } {
    // Placeholder - actual implementation would parse reaction equation
    // and calculate stoichiometric yields

    const reacted = params.feedRate * (params.conversion / 100)
    const unreacted = params.feedRate - reacted
    const desiredProduct = reacted * (params.selectivity / 100)
    const byproducts = reacted - desiredProduct

    return {
      products: {
        main: desiredProduct,
      },
      byproducts: {
        side: byproducts,
      },
      unreactedFeed: unreacted,
    }
  }

  /**
   * Calculate heat of reaction
   */
  calculateReactionHeat(params: {
    reaction: string
    flowRate: number // kmol/hr
    heatOfReaction: number // kJ/mol (negative = exothermic)
  }): {
    heatDuty: number // kW
    type: 'exothermic' | 'endothermic'
  } {
    const heatDuty = (params.flowRate * params.heatOfReaction) / 3600 // Convert kJ/hr to kW

    return {
      heatDuty: Math.abs(heatDuty),
      type: params.heatOfReaction < 0 ? 'exothermic' : 'endothermic',
    }
  }
}

/**
 * Balance Validation Helper
 */
export class BalanceValidator {
  /**
   * Check if a balance has converged
   */
  static validateConvergence(
    balance: MaterialBalance | EnergyBalance,
    tolerance: number = 0.01
  ): {
    converged: boolean
    errorPercent: number
    severity: 'none' | 'minor' | 'major' | 'critical'
    message: string
  } {
    const convergence = Math.abs(balance.convergence)
    const total = 'totalIn' in balance ? balance.totalIn : this.getTotalInflow(balance as MaterialBalance)
    const errorPercent = (convergence / Math.max(total, 1)) * 100

    let severity: 'none' | 'minor' | 'major' | 'critical' = 'none'
    if (errorPercent > 5) severity = 'critical'
    else if (errorPercent > 2) severity = 'major'
    else if (errorPercent > tolerance * 100) severity = 'minor'

    const converged = balance.converged || errorPercent < tolerance * 100
    const componentName = 'component' in balance ? balance.component : 'Energy'

    return {
      converged,
      errorPercent,
      severity,
      message: converged
        ? `${componentName} balance converged (${errorPercent.toFixed(3)}% error)`
        : `${componentName} balance NOT converged (${errorPercent.toFixed(3)}% error > ${tolerance * 100}% tolerance)`,
    }
  }

  /**
   * Get total inflow from material balance
   */
  private static getTotalInflow(balance: MaterialBalance): number {
    return Object.values(balance.inlet).reduce((sum, flow) => sum + flow, 0)
  }

  /**
   * Validate all balances for a process
   */
  static validateAllBalances(
    materialBalances: MaterialBalance[],
    energyBalance?: EnergyBalance
  ): {
    allConverged: boolean
    results: Array<{
      component: string
      converged: boolean
      error: number
      severity: string
    }>
    criticalIssues: string[]
  } {
    const results: Array<{
      component: string
      converged: boolean
      error: number
      severity: string
    }> = []
    const criticalIssues: string[] = []

    // Validate material balances
    for (const balance of materialBalances) {
      const validation = this.validateConvergence(balance)
      results.push({
        component: balance.component,
        converged: validation.converged,
        error: validation.errorPercent,
        severity: validation.severity,
      })

      if (validation.severity === 'critical') {
        criticalIssues.push(validation.message)
      }
    }

    // Validate energy balance
    if (energyBalance) {
      const validation = this.validateConvergence(energyBalance, 0.02) // 2% tolerance for energy
      results.push({
        component: 'Energy',
        converged: validation.converged,
        error: validation.errorPercent,
        severity: validation.severity,
      })

      if (validation.severity === 'critical') {
        criticalIssues.push(validation.message)
      }
    }

    const allConverged = results.every(r => r.converged)

    return {
      allConverged,
      results,
      criticalIssues,
    }
  }
}

/**
 * Convenience functions
 */

/**
 * Create material balance from streams
 */
export function createMaterialBalance(
  streams: ProcessStream[],
  component: string
): MaterialBalance {
  const calculator = new MaterialBalanceCalculator(streams)
  return calculator.calculateComponentBalance(component)
}

/**
 * Create energy balance
 */
export function createEnergyBalance(
  streams: ProcessStream[],
  auxiliaryData: {
    heatDuties: Record<string, number>
    powerLoads: Record<string, number>
  }
): EnergyBalance {
  const calculator = new EnergyBalanceCalculator(streams)
  return calculator.calculateEnergyBalance({
    heatDuties: auxiliaryData.heatDuties,
    powerLoads: auxiliaryData.powerLoads,
  })
}

/**
 * Validate process balances
 */
export function validateProcessBalances(
  materialBalances: MaterialBalance[],
  energyBalance?: EnergyBalance
): {
  valid: boolean
  report: string
  issues: string[]
} {
  const validation = BalanceValidator.validateAllBalances(materialBalances, energyBalance)

  const report = `Material and Energy Balance Validation:

  Total Balances: ${validation.results.length}
  Converged: ${validation.results.filter(r => r.converged).length}
  Failed: ${validation.results.filter(r => !r.converged).length}
  Critical Issues: ${validation.criticalIssues.length}

  Details:
  ${validation.results.map(r => `  - ${r.component}: ${r.converged ? '✓' : '✗'} (${r.error.toFixed(2)}% error, ${r.severity})`).join('\n')}
  `

  return {
    valid: validation.allConverged,
    report,
    issues: validation.criticalIssues,
  }
}
