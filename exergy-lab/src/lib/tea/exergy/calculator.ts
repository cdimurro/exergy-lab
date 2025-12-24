/**
 * Exergy Calculator
 *
 * Calculates device-level exergy metrics including:
 * - Applied Exergy Leverage scores
 * - Carnot factors for heat systems
 * - Exergy destruction ratios
 * - Comparative statements vs fossil equivalents
 *
 * Based on second-law thermodynamic analysis principles.
 */

import type {
  ExergyAnalysisResult,
  AppliedExergyLeverage,
  DeviceExergyProfile,
  EnergyQualityType,
} from './types'
import {
  ENERGY_QUALITY_FACTORS,
  LEVERAGE_CATEGORIES,
  getLeverageCategory,
  REFERENCE_TEMPERATURE_K,
  MIN_EFFICIENCY,
} from './types'
import { getDeviceProfile, DEVICE_EXERGY_PROFILES } from './device-profiles'

// ============================================================================
// Exergy Calculator Class
// ============================================================================

export class ExergyCalculator {
  /**
   * Calculate Carnot factor for heat-based systems.
   * Represents the maximum theoretical efficiency for converting heat to work.
   *
   * Formula: eta_carnot = 1 - (T_cold / T_hot)
   *
   * @param hotTemp - Source temperature in Kelvin
   * @param coldTemp - Sink temperature in Kelvin (default: 300K / ~27C)
   * @returns Carnot efficiency factor (0-1)
   */
  calculateCarnotFactor(
    hotTemp: number,
    coldTemp: number = REFERENCE_TEMPERATURE_K
  ): number {
    if (hotTemp <= coldTemp) return 0
    if (hotTemp <= 0 || coldTemp <= 0) return 0

    return 1 - coldTemp / hotTemp
  }

  /**
   * Calculate the exergy content of heat at a given temperature.
   * Exergy = Q x (1 - T0/T), where T0 is ambient temperature.
   *
   * @param heatEnergy - Heat energy in any consistent units
   * @param sourceTemp - Source temperature in Kelvin
   * @param ambientTemp - Ambient temperature in Kelvin (default: 300K)
   * @returns Exergy content in same units as heatEnergy
   */
  calculateHeatExergy(
    heatEnergy: number,
    sourceTemp: number,
    ambientTemp: number = REFERENCE_TEMPERATURE_K
  ): number {
    if (heatEnergy <= 0) return 0
    if (sourceTemp <= ambientTemp) return 0

    const carnotFactor = this.calculateCarnotFactor(sourceTemp, ambientTemp)
    return heatEnergy * carnotFactor
  }

  /**
   * Get the quality factor for an energy type.
   *
   * @param energyType - The type of energy
   * @returns Quality factor (0-1)
   */
  getQualityFactor(energyType: EnergyQualityType): number {
    return ENERGY_QUALITY_FACTORS[energyType] ?? 0.5
  }

  /**
   * Calculate Applied Exergy Leverage.
   * Combines device exergy efficiency with output energy quality.
   *
   * Formula: AEL = Device_Efficiency x Output_Quality_Factor
   *
   * This metric captures both:
   * 1. How efficiently the device converts exergy
   * 2. How valuable the output energy form is
   *
   * @param profile - Device exergy profile
   * @returns Applied Exergy Leverage calculation details
   */
  calculateAppliedExergyLeverage(profile: DeviceExergyProfile): AppliedExergyLeverage {
    const outputQuality = this.getQualityFactor(profile.outputEnergyType)
    const leverageScore = profile.secondLawEfficiency * outputQuality

    const category = getLeverageCategory(leverageScore)
    const categoryInfo = LEVERAGE_CATEGORIES[category]

    return {
      deviceEfficiency: profile.secondLawEfficiency,
      outputQualityFactor: outputQuality,
      leverageScore,
      category,
      categoryDescription: categoryInfo.description,
    }
  }

  /**
   * Generate a human-readable comparative statement vs fossil equivalent.
   *
   * @param profile - Device exergy profile
   * @param leverageMultiple - Ratio of clean tech efficiency to fossil equivalent
   * @returns Comparative statement string
   */
  generateComparativeStatement(
    profile: DeviceExergyProfile,
    leverageMultiple: number
  ): string {
    const displayName = profile.displayName
    const fossilName = profile.fossilEquivalent.technology

    // Format the multiple for display
    const formatMultiple = (m: number): string => {
      if (m >= 10) return m.toFixed(0)
      if (m >= 2) return m.toFixed(1)
      return m.toFixed(2)
    }

    // Generate appropriate statement based on the comparison
    if (leverageMultiple >= 3.0) {
      return `This ${displayName} system delivers ${formatMultiple(leverageMultiple)}x more useful work per primary energy input than a conventional ${fossilName}.`
    } else if (leverageMultiple >= 2.0) {
      return `This ${displayName} system is ${formatMultiple(leverageMultiple)}x more exergy-efficient than a ${fossilName}, delivering significantly more useful work.`
    } else if (leverageMultiple >= 1.5) {
      return `This ${displayName} system delivers ${((leverageMultiple - 1) * 100).toFixed(0)}% more useful work per unit of primary energy compared to a ${fossilName}.`
    } else if (leverageMultiple >= 1.1) {
      return `This ${displayName} system is ${((leverageMultiple - 1) * 100).toFixed(0)}% more exergy-efficient than a comparable ${fossilName}.`
    } else if (leverageMultiple >= 0.9) {
      return `This ${displayName} system has comparable exergy efficiency to a ${fossilName}, with additional benefits in emissions reduction and sustainability.`
    } else if (leverageMultiple >= 0.5) {
      return `While this ${displayName} system has ${((1 - leverageMultiple) * 100).toFixed(0)}% lower exergy efficiency than a ${fossilName}, it offers significant environmental benefits including zero direct emissions.`
    } else {
      return `This ${displayName} system prioritizes sustainability over thermodynamic efficiency compared to a ${fossilName}. Consider this trade-off in the context of decarbonization goals.`
    }
  }

  /**
   * Perform full exergy analysis for a technology type.
   *
   * @param technologyType - Technology identifier
   * @returns Complete exergy analysis result, or null if technology not found
   */
  analyzeProcess(technologyType: string): ExergyAnalysisResult | null {
    const profile = getDeviceProfile(technologyType)
    if (!profile) {
      console.warn(
        `[ExergyCalculator] No profile found for technology: ${technologyType}`
      )
      return null
    }

    return this.analyzeProfile(profile)
  }

  /**
   * Perform full exergy analysis for a device profile.
   *
   * @param profile - Device exergy profile
   * @returns Complete exergy analysis result
   */
  analyzeProfile(profile: DeviceExergyProfile): ExergyAnalysisResult {
    // Calculate Applied Exergy Leverage
    const leverage = this.calculateAppliedExergyLeverage(profile)

    // Calculate Carnot factor for heat systems
    let carnotFactor: number | undefined
    if (profile.temperatureRange) {
      carnotFactor = this.calculateCarnotFactor(
        profile.temperatureRange.hot,
        profile.temperatureRange.cold
      )
    }

    // Exergy destruction ratio (fraction of input exergy destroyed)
    const exergyDestructionRatio = Math.max(
      0,
      1 - profile.secondLawEfficiency
    )

    // Compare to fossil equivalent
    const fossilEfficiency = Math.max(
      profile.fossilEquivalent.secondLawEfficiency,
      MIN_EFFICIENCY
    )
    const leverageMultiple = profile.secondLawEfficiency / fossilEfficiency

    // Generate comparative statement
    const statement = this.generateComparativeStatement(profile, leverageMultiple)

    return {
      technology: profile.displayName,
      appliedExergyLeverage: leverage.leverageScore,
      secondLawEfficiency: profile.secondLawEfficiency,
      firstLawEfficiency: profile.firstLawEfficiency,
      exergyDestructionRatio,
      carnotFactor,
      fossilComparison: {
        equivalentTechnology: profile.fossilEquivalent.technology,
        leverageMultiple,
        statement,
      },
      outputQualityFactor: leverage.outputQualityFactor,
      confidence: profile.confidenceLevel,
      dataSource: profile.dataSource,
    }
  }

  /**
   * Analyze multiple technologies for comparison.
   *
   * @param technologyTypes - Array of technology identifiers
   * @returns Array of exergy analysis results (excludes unfound technologies)
   */
  analyzeMultiple(technologyTypes: string[]): ExergyAnalysisResult[] {
    return technologyTypes
      .map((type) => this.analyzeProcess(type))
      .filter((result): result is ExergyAnalysisResult => result !== null)
  }

  /**
   * Compare two technologies on exergy efficiency.
   *
   * @param tech1 - First technology type
   * @param tech2 - Second technology type
   * @returns Comparison object with ratio and statement
   */
  compareTechnologies(
    tech1: string,
    tech2: string
  ): { ratio: number; statement: string } | null {
    const result1 = this.analyzeProcess(tech1)
    const result2 = this.analyzeProcess(tech2)

    if (!result1 || !result2) return null

    const ratio = result1.secondLawEfficiency / Math.max(result2.secondLawEfficiency, MIN_EFFICIENCY)

    let statement: string
    if (ratio >= 1.5) {
      statement = `${result1.technology} is ${ratio.toFixed(1)}x more exergy-efficient than ${result2.technology}.`
    } else if (ratio >= 1.1) {
      statement = `${result1.technology} is ${((ratio - 1) * 100).toFixed(0)}% more exergy-efficient than ${result2.technology}.`
    } else if (ratio >= 0.9) {
      statement = `${result1.technology} and ${result2.technology} have comparable exergy efficiency.`
    } else {
      statement = `${result2.technology} is ${((1 / ratio - 1) * 100).toFixed(0)}% more exergy-efficient than ${result1.technology}.`
    }

    return { ratio, statement }
  }

  /**
   * Get human-readable efficiency label.
   *
   * @param secondLawEfficiency - Second-law efficiency value (0-1)
   * @returns Descriptive label
   */
  getEfficiencyLabel(secondLawEfficiency: number): string {
    if (secondLawEfficiency >= 0.8) return 'Excellent'
    if (secondLawEfficiency >= 0.6) return 'Good'
    if (secondLawEfficiency >= 0.4) return 'Moderate'
    if (secondLawEfficiency >= 0.2) return 'Low'
    return 'Very Low'
  }

  /**
   * Get all available technology analyses.
   *
   * @returns Array of all exergy analysis results
   */
  analyzeAllTechnologies(): ExergyAnalysisResult[] {
    return Object.keys(DEVICE_EXERGY_PROFILES)
      .map((key) => this.analyzeProcess(key))
      .filter((result): result is ExergyAnalysisResult => result !== null)
  }

  /**
   * Rank technologies by Applied Exergy Leverage.
   *
   * @returns Array of results sorted by leverage score (highest first)
   */
  rankByExergyLeverage(): ExergyAnalysisResult[] {
    return this.analyzeAllTechnologies().sort(
      (a, b) => b.appliedExergyLeverage - a.appliedExergyLeverage
    )
  }

  /**
   * Get best-in-class technology for a given output type.
   *
   * @param outputType - Desired output energy type
   * @returns Best technology analysis result, or null if none found
   */
  getBestForOutputType(outputType: EnergyQualityType): ExergyAnalysisResult | null {
    const all = this.analyzeAllTechnologies()
    const matching = all.filter(
      (result) => {
        const profile = getDeviceProfile(result.technology.toLowerCase().replace(/\s+/g, '-'))
        return profile?.outputEnergyType === outputType
      }
    )

    if (matching.length === 0) return null

    return matching.reduce((best, current) =>
      current.appliedExergyLeverage > best.appliedExergyLeverage ? current : best
    )
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

/**
 * Singleton exergy calculator instance for use throughout the application.
 */
export const exergyCalculator = new ExergyCalculator()
