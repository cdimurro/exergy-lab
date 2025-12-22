/**
 * Process Engineering Types for TEA
 *
 * Comprehensive type definitions for process streams, equipment,
 * material/energy balances matching industry standards (NETL, DOE, ICAO)
 */

/**
 * Process Stream Specification
 * Matches NETL stream table requirements
 */
export interface ProcessStream {
  id: string
  name: string
  streamNumber: number

  // Phase information
  phase: 'vapor' | 'liquid' | 'solid' | 'two-phase' | 'supercritical'
  vaporFraction: number // 0-1

  // Flow rates
  flowRate: {
    mass: number // kg/hr
    molar: number // kmol/hr
    volumetric?: number // m³/hr
    massLb?: number // lb/hr (for US standards)
    molarLb?: number // lbmol/hr
  }

  // Solids (if present)
  solidsFlowRate?: {
    mass: number // kg/hr
    massLb?: number // lb/hr
  }

  // Composition (vapor-liquid mole fractions)
  composition: Record<string, number> // component name: mole fraction

  // Operating conditions
  temperature: {
    celsius: number // °C
    fahrenheit: number // °F
  }
  pressure: {
    mpa: number // MPa absolute
    psia: number // psia
  }

  // Thermodynamic properties
  enthalpy: {
    kjPerKg: number // kJ/kg
    btuPerLb: number // Btu/lb
  }
  density: {
    kgPerM3: number // kg/m³
    lbPerFt3: number // lb/ft³
  }
  molecularWeight: number // g/mol or lb/lbmol

  // Optional additional properties
  quality?: number // For two-phase streams (0-1)
  viscosity?: number // Pa·s
  thermalConductivity?: number // W/(m·K)
}

/**
 * Equipment Item Specification
 * Matches NETL equipment list requirements
 */
export interface EquipmentItem {
  id: string
  equipmentNumber: string
  type: EquipmentType
  description: string

  // Quantity and sizing
  quantity: number
  size: string // e.g., "1000 m³", "500 kW", "100 kg/s"

  // Material specifications
  material: MaterialType
  materialGrade?: string

  // Cost information
  cost: {
    equipment: number // USD
    installation: number // USD
    total: number // USD (equipment + installation)
  }

  // Technical specifications
  specifications: {
    designPressure?: { value: number; unit: string }
    designTemperature?: { value: number; unit: string }
    capacity?: { value: number; unit: string }
    efficiency?: number // percentage
    powerConsumption?: { value: number; unit: string }
    heatDuty?: { value: number; unit: string }
    [key: string]: any // Allow custom specs
  }

  // Operating parameters
  operating?: {
    dutyCycle?: number // percentage
    maintenanceInterval?: number // hours
    expectedLifetime?: number // years
  }
}

export type EquipmentType =
  | 'reactor'
  | 'separator'
  | 'distillation_column'
  | 'heat_exchanger'
  | 'cooler'
  | 'heater'
  | 'compressor'
  | 'pump'
  | 'turbine'
  | 'vessel'
  | 'tank'
  | 'mixer'
  | 'filter'
  | 'dryer'
  | 'furnace'
  | 'boiler'
  | 'condenser'
  | 'evaporator'
  | 'crystallizer'
  | 'other'

export type MaterialType =
  | 'carbon_steel'
  | 'stainless_steel_304'
  | 'stainless_steel_316'
  | 'stainless_steel_317'
  | 'hastelloy'
  | 'monel'
  | 'titanium'
  | 'nickel_alloy'
  | 'aluminum'
  | 'copper'
  | 'concrete'
  | 'polymer'
  | 'ceramic'
  | 'other'

/**
 * Material Balance
 * Tracks component flows for mass balance validation
 */
export interface MaterialBalance {
  component: string // e.g., 'Carbon', 'Water', 'Hydrogen'
  unit: 'kg/hr' | 'kmol/hr' | 't/year'

  // Inlets
  inlet: Record<string, number> // stream_id or source: flow rate

  // Outlets
  outlet: Record<string, number> // stream_id or sink: flow rate

  // Accumulation (should be near zero for steady-state)
  accumulation: number

  // Generation/consumption (for reactions)
  generation?: number
  consumption?: number

  // Convergence (inlet - outlet - accumulation)
  convergence: number // Should be ~0 (< 1% error)
  converged: boolean
}

/**
 * Energy Balance
 * Tracks energy flows for energy balance validation
 */
export interface EnergyBalance {
  unit: 'kW' | 'MW' | 'GJ/hr' | 'MMBtu/hr'

  // Energy inputs
  energyIn: {
    feedstockEnthalpy?: number
    heatDuty?: number
    workInput?: number
    electricity?: number
    fuel?: number
    [key: string]: number | undefined
  }

  // Energy outputs
  energyOut: {
    productEnthalpy?: number
    heatRemoved?: number
    workOutput?: number
    electricityGenerated?: number
    losses?: number
    [key: string]: number | undefined
  }

  // Total balance
  totalIn: number
  totalOut: number
  convergence: number // Should be ~0
  converged: boolean
}

/**
 * Auxiliary Load Specification
 * Power consumption breakdown for equipment
 */
export interface AuxiliaryLoad {
  item: string
  equipment: string
  load: {
    kW: number
    hp?: number
  }
  dutyCycle: number // percentage (0-100)
  annualConsumption: {
    kWh: number
    MWh: number
  }
}

/**
 * Emissions Specification
 * Pollutant emissions vs regulatory limits
 */
export interface EmissionsData {
  pollutant: 'SO2' | 'NOx' | 'Particulate' | 'Hg' | 'HCl' | 'CO2' | 'CO' | 'VOC' | 'CH4'
  emissions: {
    value: number
    unit: 'tonnes/year' | 'kg/hr' | 'g/GJ' | 'lb/MMBtu'
  }
  emissionsPerProduct: {
    value: number
    unit: 'kg/tProduct' | 'g/MJ' | 'lb/ton'
  }
  regulatoryLimit?: {
    value: number
    unit: string
    standard: string // e.g., "EPA Clean Air Act", "EU Directive 2010/75/EU"
    compliance: boolean
  }
}

/**
 * Process Flow Diagram Data
 * Data structure for PFD generation
 */
export interface ProcessFlowDiagram {
  id: string
  name: string
  version: string

  // Equipment nodes
  equipment: Array<{
    id: string
    type: EquipmentType
    label: string
    position: { x: number; y: number }
  }>

  // Material streams
  materialStreams: Array<{
    id: string
    from: string // equipment id or source
    to: string // equipment id or sink
    streamNumber: number
    label?: string
  }>

  // Heat/Energy streams
  heatStreams: Array<{
    id: string
    from: string
    to: string
    duty: number // kW or MW
    label?: string
  }>

  // Layout metadata
  layout: {
    width: number
    height: number
    scale: number
  }
}

/**
 * Technology Performance Specification
 * Key performance indicators for different technologies
 */
export interface TechnologyPerformance {
  technology: string

  // Conversion efficiency
  efficiency: {
    primary: number // Main efficiency metric (e.g., PCE for solar, HHV for fuel)
    auxiliary?: number // Secondary efficiency (e.g., inverter efficiency)
    overall: number // System efficiency
  }

  // Capacity factor
  capacityFactor: {
    design: number // Design capacity factor
    actual: number // Actual/expected capacity factor
    availability: number // Plant availability (excluding degradation)
  }

  // Degradation
  degradation: {
    annual: number // Annual degradation rate (%/year)
    mechanism: string // e.g., "UV exposure", "thermal cycling"
  }

  // Performance ratio
  performanceRatio?: number // Actual/theoretical output

  // Yields (for conversion processes)
  yields?: Record<string, number> // product: yield (kg_product/kg_feed)
}

/**
 * Feedstock Specification
 * Detailed feedstock characterization
 */
export interface FeedstockSpecification {
  name: string
  type: 'biomass' | 'waste' | 'fossil' | 'renewable' | 'chemical'

  // Physical properties
  composition: {
    moisture?: number // wt%
    ash?: number // wt%
    volatiles?: number // wt%
    fixedCarbon?: number // wt%

    // Elemental analysis
    carbon?: number // wt%
    hydrogen?: number // wt%
    oxygen?: number // wt%
    nitrogen?: number // wt%
    sulfur?: number // wt%

    // Component analysis (for specific feedstocks)
    [key: string]: number | undefined
  }

  // Energy content
  heatingValue: {
    lhv: number // Lower Heating Value (MJ/kg)
    hhv: number // Higher Heating Value (MJ/kg)
    lhvBtu?: number // Btu/lb
  }

  // Cost
  cost: {
    value: number
    unit: 'USD/t' | 'USD/kg' | 'USD/GJ'
    basis: string // e.g., "2024 market price", "contract price"
    source?: string
  }

  // Availability
  availability?: {
    annual: number // tonnes/year
    seasonal?: Record<string, number> // month: availability factor
    geographic?: string // region
  }

  // Quality specifications
  quality?: {
    grade: string
    standards: string[] // e.g., "ASTM D-XXXX"
    variability?: number // percentage
  }
}

/**
 * Economic Allocation
 * For processes with multiple products
 */
export interface EconomicAllocation {
  product: string

  // Production
  annualProduction: {
    value: number
    unit: string
  }

  // Market value
  marketPrice: {
    value: number
    unit: string
    source: string
  }

  // Allocation factors
  allocation: {
    mass: number // percentage (0-100)
    energy: number // percentage (0-100)
    economic: number // percentage (0-100)
    exergy?: number // percentage (0-100)
  }

  // Allocated costs
  allocatedCosts: {
    capex: number // USD
    opex: number // USD/year
    total: number // USD
  }
}

/**
 * Uncertainty Specification
 * For Monte Carlo simulation and uncertainty quantification
 */
export interface UncertaintyParameter {
  parameter: string
  baseValue: number
  unit: string

  // Distribution type
  distribution: 'normal' | 'lognormal' | 'uniform' | 'triangular' | 'beta'

  // Distribution parameters
  distributionParams: {
    mean?: number
    stdDev?: number
    min?: number
    max?: number
    mode?: number
    alpha?: number
    beta?: number
  }

  // Correlation with other parameters
  correlations?: Record<string, number> // parameter: correlation coefficient (-1 to 1)

  // Source of uncertainty
  source: 'measurement' | 'model' | 'market' | 'technology' | 'other'
  confidence: number // 0-100
}

/**
 * Validation Result Type
 * Extended from basic TEA validation
 */
export interface TEAValidationResult {
  valid: boolean
  score: number // 0-10
  confidence: number // 0-100

  checks: Array<{
    category: string
    check: string
    passed: boolean
    score: number
    details: string
    severity: 'critical' | 'major' | 'minor' | 'info'
  }>

  warnings: Array<{
    message: string
    severity: 'high' | 'medium' | 'low'
    suggestions: string[]
    references?: string[]
  }>

  errors: Array<{
    code: string
    message: string
    field?: string
    criticalPath?: boolean
  }>

  metadata: {
    validatedAt: Date
    validatedBy: string // agent or system component
    validationVersion: string
    standardsUsed: string[]
  }
}
