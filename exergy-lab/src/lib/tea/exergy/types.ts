/**
 * Device-Level Exergy Analysis Types
 *
 * Focuses on second-law efficiency and energy quality metrics
 * for clean energy technologies at the device/system level.
 *
 * Key concepts:
 * - First-law efficiency: Energy output / Energy input (quantity)
 * - Second-law efficiency: Exergy output / Exergy input (quality)
 * - Applied Exergy Leverage: Combined device efficiency and output quality
 */

// ============================================================================
// Energy Quality Types
// ============================================================================

/**
 * Energy quality categories with associated quality factors.
 * Higher quality means more potential to do useful work.
 */
export type EnergyQualityType =
  | 'electricity'      // Quality factor: 1.0 - Pure work potential
  | 'mechanical-work'  // Quality factor: 1.0 - Pure work potential
  | 'chemical'         // Quality factor: 0.9 - High quality fuel
  | 'high-temp-heat'   // Quality factor: 0.6 - Heat >500C
  | 'medium-temp-heat' // Quality factor: 0.4 - Heat 150-500C
  | 'low-temp-heat'    // Quality factor: 0.2 - Heat <150C
  | 'ambient'          // Quality factor: 0.0 - No work potential

/**
 * Quality factors for each energy type (0-1 scale).
 * Represents the fraction of energy that can theoretically
 * be converted to useful work.
 */
export const ENERGY_QUALITY_FACTORS: Record<EnergyQualityType, number> = {
  'electricity': 1.0,
  'mechanical-work': 1.0,
  'chemical': 0.9,
  'high-temp-heat': 0.6,
  'medium-temp-heat': 0.4,
  'low-temp-heat': 0.2,
  'ambient': 0.0,
}

/**
 * Human-readable labels for energy quality types
 */
export const ENERGY_QUALITY_LABELS: Record<EnergyQualityType, string> = {
  'electricity': 'Electricity',
  'mechanical-work': 'Mechanical Work',
  'chemical': 'Chemical Energy',
  'high-temp-heat': 'High-Temperature Heat (>500C)',
  'medium-temp-heat': 'Medium-Temperature Heat (150-500C)',
  'low-temp-heat': 'Low-Temperature Heat (<150C)',
  'ambient': 'Ambient/Waste Heat',
}

// ============================================================================
// Device Profile Types
// ============================================================================

/**
 * Device-level exergy profile for a technology.
 * Contains pre-calculated efficiency values based on peer-reviewed data.
 */
export interface DeviceExergyProfile {
  /** Technology identifier (matches TEA technology_type) */
  technologyType: string

  /** Display name for reports */
  displayName: string

  /** First-law (energy) efficiency - quantity-based */
  firstLawEfficiency: number

  /** Second-law (exergy) efficiency - quality-based */
  secondLawEfficiency: number

  /** Primary input energy type */
  inputEnergyType: EnergyQualityType

  /** Primary output energy type */
  outputEnergyType: EnergyQualityType

  /** Fossil fuel equivalent for comparison */
  fossilEquivalent: {
    technology: string
    secondLawEfficiency: number
  }

  /** Operating temperature range (Kelvin) for heat systems */
  temperatureRange?: {
    hot: number   // Source/output temperature
    cold: number  // Sink/ambient temperature (typically ~300K)
  }

  /** Data source citation */
  dataSource: string

  /** Confidence level in the data */
  confidenceLevel: 'high' | 'medium' | 'low'

  /** Additional notes or caveats */
  notes?: string
}

// ============================================================================
// Analysis Result Types
// ============================================================================

/**
 * Result of exergy analysis for a specific technology/project.
 */
export interface ExergyAnalysisResult {
  /** Technology analyzed */
  technology: string

  /** Applied Exergy Leverage score (0-1+) */
  appliedExergyLeverage: number

  /** Second-law efficiency (0-1, except heat pumps) */
  secondLawEfficiency: number

  /** First-law efficiency for reference */
  firstLawEfficiency: number

  /** Exergy destruction ratio (0-1) */
  exergyDestructionRatio: number

  /** Carnot factor for heat systems */
  carnotFactor?: number

  /** Comparison to fossil equivalent */
  fossilComparison: {
    equivalentTechnology: string
    leverageMultiple: number  // e.g., 3.0 = "3x more useful work"
    statement: string         // Human-readable comparison
  }

  /** Quality factor of output energy */
  outputQualityFactor: number

  /** Confidence in the analysis */
  confidence: 'high' | 'medium' | 'low'

  /** Data source for traceability */
  dataSource: string
}

/**
 * Applied Exergy Leverage calculation details.
 * Combines device efficiency with output energy quality.
 */
export interface AppliedExergyLeverage {
  /** Base exergy efficiency of device */
  deviceEfficiency: number

  /** Quality factor of output energy form */
  outputQualityFactor: number

  /** Combined leverage score: efficiency x quality */
  leverageScore: number

  /** Interpretation category */
  category: 'excellent' | 'good' | 'moderate' | 'poor'

  /** Category description */
  categoryDescription: string
}

// ============================================================================
// Category Thresholds
// ============================================================================

/**
 * Applied Exergy Leverage category thresholds
 */
export const LEVERAGE_CATEGORIES = {
  excellent: { min: 0.7, label: 'Excellent', description: 'Outstanding exergy utilization' },
  good: { min: 0.5, label: 'Good', description: 'Efficient exergy utilization' },
  moderate: { min: 0.3, label: 'Moderate', description: 'Average exergy utilization' },
  poor: { min: 0, label: 'Poor', description: 'Significant exergy losses' },
} as const

/**
 * Get leverage category for a given score
 */
export function getLeverageCategory(score: number): keyof typeof LEVERAGE_CATEGORIES {
  if (score >= LEVERAGE_CATEGORIES.excellent.min) return 'excellent'
  if (score >= LEVERAGE_CATEGORIES.good.min) return 'good'
  if (score >= LEVERAGE_CATEGORIES.moderate.min) return 'moderate'
  return 'poor'
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Reference temperature for exergy calculations (Kelvin)
 * Standard ambient temperature ~27C / 80F
 */
export const REFERENCE_TEMPERATURE_K = 300

/**
 * Minimum credible efficiency value (prevents divide-by-zero)
 */
export const MIN_EFFICIENCY = 0.001
