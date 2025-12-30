/**
 * Solar Domain Module (v0.0.5)
 *
 * Domain-specific calculators for solar photovoltaic and thermal systems.
 * Includes Shockley-Queisser limit, tandem cell optimization, and more.
 *
 * @see base.ts - Base domain interfaces
 * @see calculators.ts - Calculator implementations
 */

import {
  BaseDomainModule,
  type DomainId,
  type PhysicalLimit,
  type IndustryBenchmark,
  type DomainCalculator,
  type ValidationRule,
  type SimulationTemplate,
  type DomainFormConfig,
  type CalculatorResult,
  PHYSICAL_CONSTANTS,
  THERMODYNAMIC_LIMITS,
} from '../base'

// ============================================================================
// Solar Domain Module
// ============================================================================

class SolarDomainModule extends BaseDomainModule {
  id: DomainId = 'solar'
  name = 'Solar Energy'
  description = 'Photovoltaic and solar thermal systems'
  icon = 'sun'

  physicalLimits: PhysicalLimit[] = [
    {
      id: 'shockley-queisser',
      name: 'Shockley-Queisser Limit',
      description: 'Maximum theoretical efficiency for a single-junction solar cell',
      value: 0.337,
      unit: '',
      formula: 'η_max = 33.7% at bandgap Eg = 1.34 eV',
      citation: 'Shockley, W. & Queisser, H.J. (1961). J. Appl. Phys. 32, 510',
      conditions: 'AM1.5 solar spectrum, single junction, no concentration',
    },
    {
      id: 'thermodynamic-limit',
      name: 'Thermodynamic Efficiency Limit',
      description: 'Maximum possible efficiency under concentration',
      value: 0.86,
      unit: '',
      formula: 'η_max = 1 - (T_cell/T_sun)^4',
      citation: 'Landsberg & Tonge (1980). J. Appl. Phys. 51, 4424',
      conditions: 'Infinite concentration, ideal heat engine',
    },
    {
      id: 'tandem-2j-limit',
      name: '2-Junction Tandem Limit',
      description: 'Maximum efficiency for 2-junction tandem cell',
      value: 0.424,
      unit: '',
      formula: 'Optimal bandgaps: 1.9 eV / 1.0 eV',
      citation: 'De Vos (1980). J. Phys. D: Appl. Phys. 13, 839',
      conditions: 'AM1.5, no concentration, detailed balance',
    },
    {
      id: 'tandem-3j-limit',
      name: '3-Junction Tandem Limit',
      description: 'Maximum efficiency for 3-junction tandem cell',
      value: 0.495,
      unit: '',
      formula: 'Optimal bandgaps: 2.0 eV / 1.4 eV / 0.9 eV',
      citation: 'De Vos (1980). J. Phys. D: Appl. Phys. 13, 839',
      conditions: 'AM1.5, no concentration, detailed balance',
    },
    {
      id: 'auger-limit-silicon',
      name: 'Silicon Auger Limit',
      description: 'Maximum efficiency for crystalline silicon accounting for Auger recombination',
      value: 0.297,
      unit: '',
      formula: 'Limited by intrinsic Auger recombination',
      citation: 'Richter et al. (2013). IEEE J. Photovolt. 3, 1184',
      conditions: 'AM1.5G, c-Si, includes Auger recombination',
    },
  ]

  industryBenchmarks: IndustryBenchmark[] = [
    {
      id: 'perovskite-lab',
      name: 'Perovskite Lab Record',
      description: 'Highest certified perovskite single-junction efficiency',
      value: 0.263,
      unit: '',
      year: 2024,
      source: 'NREL Best Research-Cell Efficiency Chart',
      category: 'lab_record',
    },
    {
      id: 'silicon-lab',
      name: 'Silicon Lab Record',
      description: 'Highest certified crystalline silicon efficiency',
      value: 0.268,
      unit: '',
      year: 2024,
      source: 'NREL Best Research-Cell Efficiency Chart',
      category: 'lab_record',
    },
    {
      id: 'tandem-lab',
      name: 'Perovskite/Silicon Tandem Record',
      description: 'Highest certified perovskite/Si tandem efficiency',
      value: 0.336,
      unit: '',
      year: 2024,
      source: 'NREL Best Research-Cell Efficiency Chart',
      category: 'lab_record',
    },
    {
      id: 'silicon-commercial',
      name: 'Commercial Silicon Module',
      description: 'Typical commercial mono-PERC module efficiency',
      value: 0.22,
      unit: '',
      year: 2024,
      source: 'Industry average',
      category: 'commercial',
    },
    {
      id: 'utility-lcoe',
      name: 'Utility Solar LCOE',
      description: 'Levelized cost of electricity for utility-scale PV',
      value: 0.031,
      unit: '$/kWh',
      year: 2024,
      source: 'Lazard LCOE Analysis 2024',
      category: 'commercial',
    },
  ]

  calculators: DomainCalculator[] = [
    {
      id: 'shockley-queisser-calculator',
      name: 'Shockley-Queisser Efficiency',
      description: 'Calculate theoretical maximum efficiency based on bandgap',
      category: 'Efficiency Limits',
      inputs: [
        {
          id: 'bandgap',
          name: 'Bandgap Energy',
          description: 'Material bandgap in electron volts',
          type: 'number',
          unit: 'eV',
          defaultValue: 1.12,
          min: 0.5,
          max: 3.0,
          step: 0.01,
          required: true,
        },
        {
          id: 'concentration',
          name: 'Concentration Factor',
          description: 'Solar concentration ratio (1 = no concentration)',
          type: 'number',
          unit: 'suns',
          defaultValue: 1,
          min: 1,
          max: 1000,
          step: 1,
          required: true,
        },
      ],
      outputs: [
        {
          id: 'efficiency',
          name: 'Maximum Efficiency',
          description: 'Theoretical maximum efficiency',
          unit: '%',
          precision: 2,
        },
        {
          id: 'voc',
          name: 'Open Circuit Voltage',
          description: 'Theoretical Voc',
          unit: 'V',
          precision: 3,
        },
        {
          id: 'jsc',
          name: 'Short Circuit Current',
          description: 'Theoretical Jsc',
          unit: 'mA/cm²',
          precision: 1,
        },
      ],
      calculate: (inputs) => calculateShockleyQueisser(inputs),
      citation: 'Shockley & Queisser (1961). J. Appl. Phys. 32, 510',
    },
    {
      id: 'module-temperature-derating',
      name: 'Module Temperature Derating',
      description: 'Calculate efficiency loss due to elevated operating temperature',
      category: 'Performance',
      inputs: [
        {
          id: 'efficiency_stc',
          name: 'STC Efficiency',
          description: 'Efficiency at Standard Test Conditions (25°C)',
          type: 'number',
          unit: '%',
          defaultValue: 20,
          min: 5,
          max: 35,
          step: 0.1,
          required: true,
        },
        {
          id: 'temp_coefficient',
          name: 'Temperature Coefficient',
          description: 'Power temperature coefficient (negative value)',
          type: 'number',
          unit: '%/°C',
          defaultValue: -0.35,
          min: -0.6,
          max: -0.1,
          step: 0.01,
          required: true,
        },
        {
          id: 'cell_temperature',
          name: 'Cell Temperature',
          description: 'Operating cell temperature',
          type: 'number',
          unit: '°C',
          defaultValue: 45,
          min: -20,
          max: 90,
          step: 1,
          required: true,
        },
      ],
      outputs: [
        {
          id: 'efficiency_actual',
          name: 'Actual Efficiency',
          description: 'Efficiency at operating temperature',
          unit: '%',
          precision: 2,
        },
        {
          id: 'power_loss',
          name: 'Power Loss',
          description: 'Percentage power loss due to temperature',
          unit: '%',
          precision: 2,
        },
      ],
      calculate: (inputs) => {
        const eta_stc = Number(inputs.efficiency_stc)
        const tc = Number(inputs.temp_coefficient)
        const t_cell = Number(inputs.cell_temperature)
        const t_stc = 25

        const delta_t = t_cell - t_stc
        const power_loss = delta_t * tc
        const eta_actual = eta_stc * (1 + power_loss / 100)

        return {
          outputs: {
            efficiency_actual: eta_actual,
            power_loss: Math.abs(power_loss),
          },
          isValid: true,
          notes: delta_t > 0
            ? [`Module operating ${delta_t}°C above STC`]
            : [`Module operating ${Math.abs(delta_t)}°C below STC`],
        }
      },
    },
    {
      id: 'annual-energy-yield',
      name: 'Annual Energy Yield',
      description: 'Estimate annual energy production based on system parameters',
      category: 'Performance',
      inputs: [
        {
          id: 'capacity',
          name: 'System Capacity',
          description: 'Installed capacity in kW',
          type: 'number',
          unit: 'kW',
          defaultValue: 10,
          min: 0.1,
          max: 1000000,
          step: 0.1,
          required: true,
        },
        {
          id: 'ghi',
          name: 'Annual GHI',
          description: 'Annual Global Horizontal Irradiance',
          type: 'number',
          unit: 'kWh/m²/year',
          defaultValue: 1800,
          min: 500,
          max: 2500,
          step: 10,
          required: true,
        },
        {
          id: 'performance_ratio',
          name: 'Performance Ratio',
          description: 'System performance ratio (typical 0.75-0.85)',
          type: 'number',
          unit: '',
          defaultValue: 0.80,
          min: 0.5,
          max: 0.95,
          step: 0.01,
          required: true,
        },
      ],
      outputs: [
        {
          id: 'annual_yield',
          name: 'Annual Energy Yield',
          description: 'Total annual energy production',
          unit: 'kWh/year',
          precision: 0,
        },
        {
          id: 'specific_yield',
          name: 'Specific Yield',
          description: 'Energy produced per kW installed',
          unit: 'kWh/kWp/year',
          precision: 0,
        },
        {
          id: 'capacity_factor',
          name: 'Capacity Factor',
          description: 'Ratio of actual to maximum possible output',
          unit: '%',
          precision: 1,
        },
      ],
      calculate: (inputs) => {
        const capacity = Number(inputs.capacity)
        const ghi = Number(inputs.ghi)
        const pr = Number(inputs.performance_ratio)

        // Simple estimation assuming fixed tilt ≈ GHI
        const specific_yield = ghi * pr
        const annual_yield = capacity * specific_yield
        const max_possible = capacity * 8760 // 24h * 365d
        const capacity_factor = (annual_yield / max_possible) * 100

        return {
          outputs: {
            annual_yield,
            specific_yield,
            capacity_factor,
          },
          isValid: true,
          notes: [
            'Assumes fixed-tilt system with tilt ≈ latitude',
            'Actual yield depends on local conditions and system design',
          ],
        }
      },
    },
  ]

  validationRules: ValidationRule[] = [
    {
      id: 'efficiency-sq-limit',
      name: 'Shockley-Queisser Limit Check',
      description: 'Single-junction efficiency cannot exceed S-Q limit',
      severity: 'error',
      check: (value, context) => {
        if (context?.junctions === 1) {
          return value <= THERMODYNAMIC_LIMITS.shockley_queisser * 100
        }
        return true
      },
      message: 'Efficiency exceeds Shockley-Queisser limit (33.7%) for single junction',
    },
    {
      id: 'efficiency-silicon-auger',
      name: 'Silicon Auger Limit Check',
      description: 'Silicon efficiency cannot exceed Auger limit',
      severity: 'warning',
      check: (value, context) => {
        if (context?.material === 'silicon') {
          return value <= 29.7
        }
        return true
      },
      message: 'Efficiency exceeds practical silicon Auger limit (29.7%)',
    },
    {
      id: 'bandgap-reasonable',
      name: 'Reasonable Bandgap Check',
      description: 'Bandgap should be within reasonable range for PV',
      severity: 'warning',
      check: (value) => value >= 0.7 && value <= 2.5,
      message: 'Bandgap outside typical PV range (0.7-2.5 eV)',
    },
  ]

  simulationTemplates: SimulationTemplate[] = [
    {
      id: 'pv-performance',
      name: 'PV System Performance',
      description: 'Annual performance simulation using SAM',
      provider: 'analytical',
      parameters: {
        model: 'pvwatts',
        timestep: 'hourly',
      },
      estimatedDuration: 60,
    },
    {
      id: 'thermal-analysis',
      name: 'Module Thermal Analysis',
      description: 'Thermal simulation for operating temperature',
      provider: 'physx',
      parameters: {
        type: 'thermal',
        solver: 'steady-state',
      },
      estimatedCost: 0.02,
      estimatedDuration: 120,
    },
  ]

  inputFormConfig: DomainFormConfig = {
    sections: [
      {
        id: 'system',
        title: 'System Parameters',
        fields: [
          {
            id: 'capacity',
            name: 'System Capacity',
            description: 'Total installed capacity',
            type: 'number',
            unit: 'kW',
            defaultValue: 10,
            min: 0.1,
            max: 1000000,
            required: true,
          },
          {
            id: 'module_type',
            name: 'Module Technology',
            description: 'PV module technology type',
            type: 'select',
            defaultValue: 'mono-perc',
            options: [
              { value: 'mono-perc', label: 'Mono-PERC' },
              { value: 'poly', label: 'Polycrystalline' },
              { value: 'thin-film', label: 'Thin Film (CdTe/CIGS)' },
              { value: 'bifacial', label: 'Bifacial' },
              { value: 'perovskite', label: 'Perovskite' },
            ],
            required: true,
          },
        ],
      },
      {
        id: 'location',
        title: 'Location & Irradiance',
        fields: [
          {
            id: 'ghi',
            name: 'Annual GHI',
            description: 'Global Horizontal Irradiance',
            type: 'number',
            unit: 'kWh/m²/year',
            defaultValue: 1800,
            min: 500,
            max: 2500,
            required: true,
          },
        ],
      },
    ],
    presets: [
      {
        id: 'residential-us',
        name: 'US Residential',
        values: {
          capacity: 8,
          module_type: 'mono-perc',
          ghi: 1700,
        },
      },
      {
        id: 'utility-arizona',
        name: 'Arizona Utility Scale',
        values: {
          capacity: 100000,
          module_type: 'bifacial',
          ghi: 2200,
        },
      },
    ],
  }
}

// ============================================================================
// Calculator Implementations
// ============================================================================

function calculateShockleyQueisser(
  inputs: Record<string, number | string>
): CalculatorResult {
  const Eg = Number(inputs.bandgap) // eV
  const X = Number(inputs.concentration) // suns

  // Physical constants
  const k = PHYSICAL_CONSTANTS.k // J/K
  const T = 300 // K (room temperature)
  const q = PHYSICAL_CONSTANTS.e // C

  // Simplified S-Q calculation
  // Based on detailed balance with AM1.5G spectrum

  // Approximate Jsc from bandgap (empirical fit to AM1.5G)
  // Jsc decreases with increasing bandgap
  const Jsc = 44 * Math.exp(-0.5 * (Eg - 1.1)) // mA/cm²

  // Voc from detailed balance
  const kT = k * T / q // thermal voltage in eV
  const Voc = Eg - kT * Math.log(X * 1000 / Jsc) // V

  // Fill factor (empirical approximation)
  const voc_norm = Voc / kT // normalized Voc
  const FF = (voc_norm - Math.log(voc_norm + 0.72)) / (voc_norm + 1)

  // Efficiency (assuming 1000 W/m² = 100 mW/cm²)
  const Pin = 100 // mW/cm²
  const efficiency = (Jsc * Voc * FF) / Pin * 100 // %

  // Check for physical limits
  const warnings: string[] = []
  if (efficiency > 33.7 && X === 1) {
    warnings.push('Result exceeds standard S-Q limit - concentration effect included')
  }

  return {
    outputs: {
      efficiency: Math.min(efficiency, X > 1 ? 86 : 33.7), // cap at limits
      voc: Voc,
      jsc: Jsc,
    },
    warnings,
    notes: [
      'Calculation uses simplified detailed balance model',
      'Assumes AM1.5G spectrum and 300K cell temperature',
    ],
    references: [
      'Shockley & Queisser (1961). J. Appl. Phys. 32, 510',
    ],
    isValid: true,
  }
}

// ============================================================================
// Export
// ============================================================================

export const SolarDomain = new SolarDomainModule()
export default SolarDomain
