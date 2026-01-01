/**
 * Physics-Based Efficiency Calculations
 *
 * Provides real physics calculations based on fundamental thermodynamic
 * and quantum mechanical limits, replacing mock random values.
 *
 * Includes:
 * - Shockley-Queisser limit for solar cells
 * - Electrolyzer efficiency calculations
 * - Carnot efficiency limits
 * - Battery energy density limits
 * - Fuel cell efficiency calculations
 */

// =============================================================================
// Constants
// =============================================================================

/** Planck constant (J·s) */
const h = 6.62607015e-34

/** Boltzmann constant (J/K) */
const k_B = 1.380649e-23

/** Speed of light (m/s) */
const c = 299792458

/** Elementary charge (C) */
const e = 1.602176634e-19

/** Stefan-Boltzmann constant (W/m²·K⁴) */
const STEFAN_BOLTZMANN = 5.670374419e-8

/** Standard temperature (K) */
const T_STANDARD = 298.15

/** Sun temperature (K) */
const T_SUN = 5778

/** AM1.5G solar spectrum power density (W/m²) */
const AM15G_POWER = 1000

// =============================================================================
// Solar Cell Efficiency (Shockley-Queisser Limit)
// =============================================================================

export interface SolarCellConfig {
  bandgap: number              // eV
  temperature?: number         // K (default 300K)
  concentration?: number       // Suns (default 1)
  tandem?: boolean             // Multi-junction
  numberOfJunctions?: number   // For tandem cells
  subcellBandgaps?: number[]   // Band gaps for each subcell
  fillFactor?: number          // 0-1 (default based on type)
  degradation?: number         // 0-1 fraction of degradation
}

/**
 * Calculate the Shockley-Queisser limit for a single-junction solar cell
 *
 * The SQ limit is derived from detailed balance considerations:
 * 1. Only photons with energy >= band gap are absorbed
 * 2. Each absorbed photon generates one electron-hole pair
 * 3. Energy above band gap is lost to thermalization
 * 4. Radiative recombination limits open-circuit voltage
 */
export function calculateShockleyQueisserLimit(bandgap: number): number {
  // Pre-calculated values for common band gaps (based on detailed balance)
  // These are the theoretical maximum efficiencies at 1 sun, 300K
  const sqLimits: Record<number, number> = {
    0.5: 0.232,   // Narrow gap
    0.7: 0.297,   // Ge
    0.9: 0.328,
    1.0: 0.331,   // Si (approximate)
    1.1: 0.333,   // Si (actual)
    1.12: 0.3337, // Si (exact)
    1.2: 0.332,
    1.3: 0.326,
    1.34: 0.337,  // GaAs (maximum)
    1.4: 0.330,
    1.5: 0.315,   // CdTe
    1.6: 0.295,
    1.7: 0.270,   // Perovskite
    2.0: 0.205,
    2.5: 0.110,
    3.0: 0.050,
  }

  // Find closest pre-calculated value or interpolate
  const sortedGaps = Object.keys(sqLimits).map(Number).sort((a, b) => a - b)

  if (bandgap <= sortedGaps[0]) return sqLimits[sortedGaps[0]]
  if (bandgap >= sortedGaps[sortedGaps.length - 1]) return sqLimits[sortedGaps[sortedGaps.length - 1]]

  // Linear interpolation
  for (let i = 0; i < sortedGaps.length - 1; i++) {
    if (bandgap >= sortedGaps[i] && bandgap <= sortedGaps[i + 1]) {
      const t = (bandgap - sortedGaps[i]) / (sortedGaps[i + 1] - sortedGaps[i])
      return sqLimits[sortedGaps[i]] * (1 - t) + sqLimits[sortedGaps[i + 1]] * t
    }
  }

  return 0.30 // Fallback
}

/**
 * Calculate practical solar cell efficiency with real-world factors
 */
export function calculateSolarEfficiency(config: SolarCellConfig): {
  theoreticalMax: number
  practicalEfficiency: number
  losses: Record<string, number>
} {
  const {
    bandgap,
    temperature = 300,
    concentration = 1,
    tandem = false,
    numberOfJunctions = 1,
    subcellBandgaps = [bandgap],
    fillFactor = 0.82,  // Typical high-quality cell
    degradation = 0,
  } = config

  let theoreticalMax: number

  if (tandem && numberOfJunctions > 1 && subcellBandgaps.length === numberOfJunctions) {
    // Tandem cell: sum of subcell contributions with current matching constraint
    // Approximate: each junction can capture a portion of the spectrum
    theoreticalMax = calculateTandemLimit(subcellBandgaps)
  } else {
    theoreticalMax = calculateShockleyQueisserLimit(bandgap)
  }

  // Concentration factor boost (logarithmic increase in Voc)
  if (concentration > 1) {
    const concentrationBoost = Math.log(concentration) * k_B * temperature / e / bandgap
    theoreticalMax = Math.min(theoreticalMax * (1 + concentrationBoost * 0.5), 0.65) // Cap at 65% for concentration
  }

  // Temperature effect on Voc (~0.3%/K relative loss)
  const tempLoss = (temperature - T_STANDARD) * 0.003

  // Practical losses
  const losses = {
    fillFactor: (1 - fillFactor) * theoreticalMax,
    temperature: tempLoss * theoreticalMax,
    reflection: 0.02 * theoreticalMax,      // ARC coating ~2% reflection loss
    resistance: 0.03 * theoreticalMax,      // Series resistance
    recombination: 0.05 * theoreticalMax,   // Non-radiative recombination
    degradation: degradation * theoreticalMax,
  }

  const totalLoss = Object.values(losses).reduce((sum, loss) => sum + loss, 0)
  const practicalEfficiency = Math.max(0, theoreticalMax - totalLoss)

  return {
    theoreticalMax,
    practicalEfficiency,
    losses,
  }
}

/**
 * Calculate efficiency limit for tandem (multi-junction) solar cells
 */
function calculateTandemLimit(bandgaps: number[]): number {
  // Optimal tandem limits (from literature)
  // 2-junction: ~46% (optimal 1.1/1.7 eV)
  // 3-junction: ~52% (optimal 0.9/1.4/2.0 eV)
  // 4-junction: ~55%
  // Infinite: ~68%

  const nJunctions = bandgaps.length

  // Base limit by number of junctions
  const junctionLimits: Record<number, number> = {
    1: 0.337,
    2: 0.46,
    3: 0.52,
    4: 0.55,
    5: 0.57,
    6: 0.59,
  }

  const baseLimit = junctionLimits[nJunctions] || (0.59 + 0.01 * (nJunctions - 6))

  // Adjust for non-optimal band gap selection
  // Check if bandgaps are reasonably distributed
  const sortedGaps = [...bandgaps].sort((a, b) => a - b)
  let gapQuality = 1.0

  for (let i = 1; i < sortedGaps.length; i++) {
    const spacing = sortedGaps[i] - sortedGaps[i - 1]
    // Optimal spacing is roughly 0.3-0.6 eV between junctions
    if (spacing < 0.2 || spacing > 0.8) {
      gapQuality -= 0.1
    }
  }

  return baseLimit * Math.max(0.7, gapQuality)
}

// =============================================================================
// Electrolyzer Efficiency
// =============================================================================

export interface ElectrolyzerConfig {
  type: 'PEM' | 'Alkaline' | 'SOEC' | 'AEM'
  cellVoltage?: number          // V (actual operating voltage)
  currentDensity?: number       // A/cm²
  temperature?: number          // K
  pressure?: number             // bar
  faradaicEfficiency?: number   // 0-1 (default ~1.0 for most)
  stackEfficiency?: number      // 0-1 (balance of plant losses)
}

/**
 * Calculate electrolyzer efficiency based on electrochemical fundamentals
 *
 * The minimum voltage required for water electrolysis is determined by
 * thermodynamics:
 * - Reversible voltage (ΔG): 1.23 V at standard conditions
 * - Thermoneutral voltage (ΔH): 1.48 V at standard conditions
 *
 * Efficiency = Thermoneutral voltage / Actual cell voltage
 */
export function calculateElectrolyzerEfficiency(config: ElectrolyzerConfig): {
  hvEfficiency: number      // Based on HHV (thermoneutral)
  lvEfficiency: number      // Based on LHV (reversible)
  systemEfficiency: number  // Including BOP losses
  hydrogenProduction: number // kg H2/kWh
} {
  const {
    type,
    cellVoltage,
    currentDensity = 1.0,
    temperature = 353,  // 80°C typical for PEM
    pressure = 30,      // bar
    faradaicEfficiency = 0.99,
    stackEfficiency = 0.90,
  } = config

  // Default voltages by type
  const defaultVoltages: Record<string, number> = {
    'PEM': 1.80,      // Typical PEM at 1 A/cm²
    'Alkaline': 1.90, // Typical alkaline at 0.4 A/cm²
    'SOEC': 1.30,     // High temp operation
    'AEM': 1.85,      // Similar to PEM
  }

  const actualVoltage = cellVoltage || defaultVoltages[type]

  // Calculate thermodynamic voltages with temperature correction
  // ΔG decreases with temperature, ΔH relatively constant
  const dT = temperature - T_STANDARD

  // Reversible voltage (LHV basis): 1.23 V at 25°C
  // Temperature coefficient: -0.85 mV/K
  const reversibleVoltage = 1.229 - 0.00085 * dT

  // Thermoneutral voltage (HHV basis): 1.48 V at 25°C
  // Relatively independent of temperature
  const thermoneutralVoltage = 1.481

  // Pressure correction (Nernst equation)
  // Increases required voltage at higher pressures
  const pressureCorrection = (k_B * temperature / (2 * e)) * Math.log(pressure / 1)
  const effectiveThermoneutral = thermoneutralVoltage + pressureCorrection

  // SOEC operates above thermoneutral (can use heat)
  let effectiveVoltage = actualVoltage
  if (type === 'SOEC' && actualVoltage < thermoneutralVoltage) {
    // SOEC can achieve >100% electrical efficiency by using heat
    effectiveVoltage = actualVoltage
  }

  // Calculate efficiencies
  const hvEfficiency = (effectiveThermoneutral / effectiveVoltage) * faradaicEfficiency
  const lvEfficiency = (reversibleVoltage / effectiveVoltage) * faradaicEfficiency

  // System efficiency including balance of plant
  const systemEfficiency = hvEfficiency * stackEfficiency

  // Hydrogen production rate (based on Faraday's law)
  // At 100% Faradaic efficiency: 0.0373 g H2 per kWh per cell at 1.48V
  const specificProduction = 0.0336 * hvEfficiency // kg H2/kWh

  return {
    hvEfficiency: Math.min(hvEfficiency, type === 'SOEC' ? 1.3 : 1.0),
    lvEfficiency: Math.min(lvEfficiency, 1.5),
    systemEfficiency,
    hydrogenProduction: specificProduction,
  }
}

// =============================================================================
// Carnot Efficiency (Heat Engines)
// =============================================================================

export interface HeatEngineConfig {
  hotTemperature: number    // K
  coldTemperature: number   // K (typically 298-323 K for ambient)
  regenerator?: boolean     // For Stirling engines
  irreversibility?: number  // 0-1 (0 = ideal Carnot, 1 = fully irreversible)
}

/**
 * Calculate Carnot efficiency limit for heat engines
 *
 * The Carnot efficiency is the maximum possible efficiency for any heat
 * engine operating between two temperatures:
 * η = 1 - T_cold/T_hot
 */
export function calculateCarnotEfficiency(config: HeatEngineConfig): {
  carnotLimit: number
  practicalEfficiency: number
  exergyEfficiency: number
} {
  const {
    hotTemperature,
    coldTemperature,
    regenerator = false,
    irreversibility = 0.35, // Typical for real engines
  } = config

  // Carnot limit
  const carnotLimit = 1 - coldTemperature / hotTemperature

  // Practical efficiency with irreversibilities
  // Real engines achieve 40-60% of Carnot limit
  let practicalMultiplier = 1 - irreversibility

  if (regenerator) {
    practicalMultiplier += 0.1 // Regeneration can recover ~10% more
  }

  const practicalEfficiency = carnotLimit * practicalMultiplier

  // Exergy efficiency (how well we use the available work potential)
  const exergyEfficiency = practicalEfficiency / carnotLimit

  return {
    carnotLimit,
    practicalEfficiency,
    exergyEfficiency,
  }
}

// =============================================================================
// Battery Energy Density Limits
// =============================================================================

export interface BatteryConfig {
  chemistry: 'LiCoO2' | 'LFP' | 'NMC' | 'NCA' | 'LiS' | 'NaNi' | 'Li-air' | 'solid-state'
  voltage?: number          // V (cell voltage)
  specificCapacity?: number // mAh/g (cathode)
  packRatio?: number        // 0-1 (active material / total mass)
  cycleLife?: number        // Number of cycles
}

/**
 * Calculate battery energy density based on electrochemistry
 */
export function calculateBatteryEnergyDensity(config: BatteryConfig): {
  theoreticalDensity: number  // Wh/kg
  practicalDensity: number    // Wh/kg
  volumetricDensity: number   // Wh/L
  cyclicEfficiency: number    // Round-trip efficiency
} {
  const { chemistry, packRatio = 0.35 } = config

  // Theoretical limits based on electrochemistry
  const chemistryLimits: Record<string, {
    voltage: number
    specificCapacity: number
    cyclicEfficiency: number
    density: number // g/cm³
  }> = {
    'LiCoO2': { voltage: 3.9, specificCapacity: 274, cyclicEfficiency: 0.92, density: 2.5 },
    'LFP': { voltage: 3.4, specificCapacity: 170, cyclicEfficiency: 0.95, density: 2.0 },
    'NMC': { voltage: 3.7, specificCapacity: 200, cyclicEfficiency: 0.93, density: 2.3 },
    'NCA': { voltage: 3.6, specificCapacity: 200, cyclicEfficiency: 0.92, density: 2.4 },
    'LiS': { voltage: 2.1, specificCapacity: 1675, cyclicEfficiency: 0.85, density: 1.8 },
    'NaNi': { voltage: 3.0, specificCapacity: 250, cyclicEfficiency: 0.88, density: 2.2 },
    'Li-air': { voltage: 2.96, specificCapacity: 3860, cyclicEfficiency: 0.70, density: 1.2 },
    'solid-state': { voltage: 4.2, specificCapacity: 300, cyclicEfficiency: 0.96, density: 2.5 },
  }

  const limits = chemistryLimits[chemistry] || chemistryLimits['NMC']

  const voltage = config.voltage || limits.voltage
  const specificCapacity = config.specificCapacity || limits.specificCapacity

  // Theoretical energy density (cathode only)
  const theoreticalDensity = voltage * specificCapacity

  // Practical pack-level energy density
  const practicalDensity = theoreticalDensity * packRatio

  // Volumetric density (approximate)
  const volumetricDensity = practicalDensity * limits.density

  return {
    theoreticalDensity,
    practicalDensity,
    volumetricDensity,
    cyclicEfficiency: limits.cyclicEfficiency,
  }
}

// =============================================================================
// Fuel Cell Efficiency
// =============================================================================

export interface FuelCellConfig {
  type: 'PEMFC' | 'SOFC' | 'MCFC' | 'AFC' | 'PAFC'
  operatingVoltage?: number     // V
  currentDensity?: number       // A/cm²
  temperature?: number          // K
  fuelUtilization?: number      // 0-1
}

/**
 * Calculate fuel cell efficiency based on electrochemistry
 */
export function calculateFuelCellEfficiency(config: FuelCellConfig): {
  theoreticalEfficiency: number
  practicalEfficiency: number
  powerDensity: number  // W/cm²
} {
  const {
    type,
    currentDensity = 0.5,
    fuelUtilization = 0.80,
  } = config

  // Typical operating parameters by type
  const fuelCellParams: Record<string, {
    temperature: number
    voltage: number
    maxEfficiency: number
  }> = {
    'PEMFC': { temperature: 353, voltage: 0.65, maxEfficiency: 0.60 },
    'SOFC': { temperature: 1073, voltage: 0.80, maxEfficiency: 0.65 },
    'MCFC': { temperature: 923, voltage: 0.75, maxEfficiency: 0.55 },
    'AFC': { temperature: 333, voltage: 0.70, maxEfficiency: 0.60 },
    'PAFC': { temperature: 473, voltage: 0.65, maxEfficiency: 0.45 },
  }

  const params = fuelCellParams[type] || fuelCellParams['PEMFC']
  const operatingVoltage = config.operatingVoltage || params.voltage
  const temperature = config.temperature || params.temperature

  // Reversible voltage at operating temperature
  const dT = temperature - T_STANDARD
  const reversibleVoltage = 1.229 - 0.00085 * dT

  // Theoretical efficiency (voltage efficiency × fuel utilization)
  const theoreticalEfficiency = (operatingVoltage / reversibleVoltage) * fuelUtilization

  // Practical efficiency (with auxiliary losses)
  const auxiliaryLosses = 0.10 // BOP consumes ~10%
  const practicalEfficiency = theoreticalEfficiency * (1 - auxiliaryLosses)

  // Power density
  const powerDensity = operatingVoltage * currentDensity

  return {
    theoreticalEfficiency: Math.min(theoreticalEfficiency, params.maxEfficiency * 1.1),
    practicalEfficiency: Math.min(practicalEfficiency, params.maxEfficiency),
    powerDensity,
  }
}

// =============================================================================
// Wind Turbine Efficiency (Betz Limit)
// =============================================================================

export interface WindTurbineConfig {
  rotorDiameter: number    // m
  windSpeed: number        // m/s
  airDensity?: number      // kg/m³ (default 1.225)
  powerCoefficient?: number // Cp (default 0.45)
}

/**
 * Calculate wind turbine power output
 *
 * The Betz limit (59.3%) is the maximum fraction of kinetic energy
 * that can be extracted from wind.
 */
export function calculateWindPower(config: WindTurbineConfig): {
  betzLimit: number       // Maximum theoretical power (W)
  ratedPower: number      // Practical rated power (W)
  capacityFactor: number  // Expected capacity factor
} {
  const {
    rotorDiameter,
    windSpeed,
    airDensity = 1.225,
    powerCoefficient = 0.45, // Modern turbines achieve ~45-50% Cp
  } = config

  // Swept area
  const area = Math.PI * (rotorDiameter / 2) ** 2

  // Available power in wind
  const windPower = 0.5 * airDensity * area * windSpeed ** 3

  // Betz limit (59.3% of wind power)
  const betzLimit = windPower * (16 / 27) // = 0.593

  // Practical power with actual Cp
  const ratedPower = windPower * powerCoefficient

  // Capacity factor (varies with wind regime)
  // Offshore: 40-50%, Onshore: 25-35%
  const capacityFactor = 0.30

  return {
    betzLimit,
    ratedPower,
    capacityFactor,
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert efficiency to percentage string
 */
export function formatEfficiency(efficiency: number): string {
  return `${(efficiency * 100).toFixed(1)}%`
}

/**
 * Validate that efficiency is within physical limits
 */
export function validateEfficiency(
  efficiency: number,
  type: 'solar' | 'electrolyzer' | 'carnot' | 'battery' | 'fuel-cell' | 'wind' | 'geothermal' | 'orc' | 'binary' | 'rankine' | 'brayton' | 'combined-cycle'
): { valid: boolean; reason?: string } {
  const limits: Record<string, number> = {
    'solar': 0.47,       // Multi-junction under concentration
    'electrolyzer': 1.3, // SOEC with heat integration
    'carnot': 0.99,      // Theoretical limit
    'battery': 0.99,     // Round-trip
    'fuel-cell': 0.70,   // High-temp SOFC with CHP
    'wind': 0.593,       // Betz limit
    'geothermal': 0.35,  // Binary cycle with low-temp source
    'orc': 0.35,         // Organic Rankine Cycle
    'binary': 0.35,      // Binary cycle geothermal
    'rankine': 0.45,     // Steam Rankine
    'brayton': 0.45,     // Gas turbine
    'combined-cycle': 0.65, // CCGT
  }

  const limit = limits[type] || 1.0

  if (efficiency > limit) {
    return {
      valid: false,
      reason: `Efficiency ${formatEfficiency(efficiency)} exceeds physical limit of ${formatEfficiency(limit)} for ${type}`,
    }
  }

  if (efficiency < 0) {
    return { valid: false, reason: 'Efficiency cannot be negative' }
  }

  return { valid: true }
}
