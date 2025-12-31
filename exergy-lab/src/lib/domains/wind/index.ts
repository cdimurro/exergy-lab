/**
 * Wind Domain Module (v0.0.5)
 *
 * Domain-specific calculators for wind energy systems.
 * Includes Betz limit, wake modeling, Weibull distribution, and AEP estimation.
 *
 * @see base.ts - Base domain interfaces
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
// Wind Domain Module
// ============================================================================

class WindDomainModule extends BaseDomainModule {
  id: DomainId = 'wind'
  name = 'Wind Energy'
  description = 'Wind turbine and wind farm systems'
  icon = 'wind'

  physicalLimits: PhysicalLimit[] = [
    {
      id: 'betz-limit',
      name: 'Betz Limit',
      description: 'Maximum theoretical power extraction from wind',
      value: THERMODYNAMIC_LIMITS.betz,
      unit: '',
      formula: 'Cp_max = 16/27 ≈ 0.593',
      citation: 'Betz, A. (1920). Das Maximum der theoretisch möglichen Ausnützung des Windes durch Windmotoren',
      conditions: 'Ideal actuator disk, no swirl, uniform flow',
    },
    {
      id: 'glauert-limit',
      name: 'Glauert Limit',
      description: 'Maximum Cp accounting for wake rotation',
      value: 0.587,
      unit: '',
      formula: 'Slightly below Betz due to wake swirl',
      citation: 'Glauert, H. (1935). Airplane Propellers, Aerodynamic Theory',
      conditions: 'Includes wake rotation losses',
    },
    {
      id: 'tip-speed-ratio-optimal',
      name: 'Optimal Tip Speed Ratio',
      description: 'Optimal TSR for maximum power extraction',
      value: 8,
      unit: '',
      formula: 'λ_opt ≈ 4πn / B (where B = number of blades)',
      citation: 'Burton et al. (2011). Wind Energy Handbook',
      conditions: 'Modern 3-blade horizontal axis turbine',
    },
  ]

  industryBenchmarks: IndustryBenchmark[] = [
    {
      id: 'cp-commercial',
      name: 'Commercial Turbine Cp',
      description: 'Typical peak Cp for commercial wind turbines',
      value: 0.48,
      unit: '',
      year: 2024,
      source: 'Industry average',
      category: 'commercial',
    },
    {
      id: 'capacity-factor-onshore',
      name: 'Onshore Capacity Factor',
      description: 'Typical capacity factor for onshore wind farms',
      value: 0.35,
      unit: '',
      year: 2024,
      source: 'IEA Wind TCP',
      category: 'commercial',
    },
    {
      id: 'capacity-factor-offshore',
      name: 'Offshore Capacity Factor',
      description: 'Typical capacity factor for offshore wind farms',
      value: 0.45,
      unit: '',
      year: 2024,
      source: 'IEA Wind TCP',
      category: 'commercial',
    },
    {
      id: 'onshore-lcoe',
      name: 'Onshore Wind LCOE',
      description: 'Levelized cost of electricity for onshore wind',
      value: 0.035,
      unit: '$/kWh',
      year: 2024,
      source: 'Lazard LCOE Analysis 2024',
      category: 'commercial',
    },
    {
      id: 'largest-turbine',
      name: 'Largest Offshore Turbine',
      description: 'Current largest commercial offshore turbine capacity',
      value: 16,
      unit: 'MW',
      year: 2024,
      source: 'Vestas V236-15.0 MW',
      category: 'commercial',
    },
  ]

  calculators: DomainCalculator[] = [
    {
      id: 'betz-power',
      name: 'Betz Power Calculation',
      description: 'Calculate maximum theoretical power extraction using Betz limit',
      category: 'Power',
      inputs: [
        {
          id: 'rotor_diameter',
          name: 'Rotor Diameter',
          description: 'Turbine rotor diameter',
          type: 'number',
          unit: 'm',
          defaultValue: 126,
          min: 10,
          max: 300,
          step: 1,
          required: true,
        },
        {
          id: 'wind_speed',
          name: 'Wind Speed',
          description: 'Incoming wind speed',
          type: 'number',
          unit: 'm/s',
          defaultValue: 10,
          min: 1,
          max: 30,
          step: 0.1,
          required: true,
        },
        {
          id: 'air_density',
          name: 'Air Density',
          description: 'Air density (default: sea level STP)',
          type: 'number',
          unit: 'kg/m³',
          defaultValue: PHYSICAL_CONSTANTS.rho_air,
          min: 0.9,
          max: 1.4,
          step: 0.001,
          required: true,
        },
      ],
      outputs: [
        {
          id: 'power_available',
          name: 'Available Power',
          description: 'Total power in the wind',
          unit: 'MW',
          precision: 3,
        },
        {
          id: 'power_betz',
          name: 'Betz Power',
          description: 'Maximum extractable power (Betz limit)',
          unit: 'MW',
          precision: 3,
        },
        {
          id: 'power_practical',
          name: 'Practical Power',
          description: 'Realistic power output (Cp ≈ 0.45)',
          unit: 'MW',
          precision: 3,
        },
      ],
      calculate: (inputs) => {
        const D = Number(inputs.rotor_diameter)
        const v = Number(inputs.wind_speed)
        const rho = Number(inputs.air_density)

        const A = Math.PI * (D / 2) ** 2 // Swept area
        const P_wind = 0.5 * rho * A * v ** 3 // Power in wind

        const P_betz = P_wind * THERMODYNAMIC_LIMITS.betz
        const P_practical = P_wind * 0.45 // Typical Cp

        return {
          outputs: {
            power_available: P_wind / 1e6,
            power_betz: P_betz / 1e6,
            power_practical: P_practical / 1e6,
          },
          isValid: true,
          notes: [
            `Swept area: ${(A / 1e4).toFixed(2)} hectares`,
            'Practical Cp of 0.45 assumed for commercial turbine',
          ],
          references: [
            'Betz, A. (1920). Das Maximum der theoretisch möglichen Ausnützung des Windes durch Windmotoren',
          ],
        }
      },
      citation: 'Betz (1920)',
    },
    {
      id: 'weibull-distribution',
      name: 'Weibull Wind Distribution',
      description: 'Calculate Weibull distribution parameters from mean wind speed',
      category: 'Resource',
      inputs: [
        {
          id: 'mean_wind_speed',
          name: 'Mean Wind Speed',
          description: 'Average wind speed at hub height',
          type: 'number',
          unit: 'm/s',
          defaultValue: 8,
          min: 3,
          max: 15,
          step: 0.1,
          required: true,
        },
        {
          id: 'shape_factor',
          name: 'Shape Factor (k)',
          description: 'Weibull shape parameter (typical: 1.5-2.5)',
          type: 'number',
          unit: '',
          defaultValue: 2.0,
          min: 1.0,
          max: 3.5,
          step: 0.1,
          required: true,
        },
      ],
      outputs: [
        {
          id: 'scale_factor',
          name: 'Scale Factor (c)',
          description: 'Weibull scale parameter',
          unit: 'm/s',
          precision: 2,
        },
        {
          id: 'probability_above_cutin',
          name: 'Time Above Cut-in',
          description: 'Percentage of time above cut-in speed (3 m/s)',
          unit: '%',
          precision: 1,
        },
        {
          id: 'energy_density',
          name: 'Wind Energy Density',
          description: 'Annual energy density at hub height',
          unit: 'W/m²',
          precision: 0,
        },
      ],
      calculate: (inputs) => {
        const v_mean = Number(inputs.mean_wind_speed)
        const k = Number(inputs.shape_factor)

        // Calculate scale factor from mean wind speed
        // v_mean = c * Gamma(1 + 1/k)
        const gamma_factor = gammaFunction(1 + 1 / k)
        const c = v_mean / gamma_factor

        // Probability above cut-in (3 m/s)
        const v_cutin = 3
        const prob_above = Math.exp(-((v_cutin / c) ** k)) * 100

        // Energy density (cubic mean of wind speed)
        // P/A = 0.5 * rho * v³_mean_cubic
        const v3_mean = c ** 3 * gammaFunction(1 + 3 / k)
        const energy_density = 0.5 * PHYSICAL_CONSTANTS.rho_air * v3_mean

        return {
          outputs: {
            scale_factor: c,
            probability_above_cutin: prob_above,
            energy_density,
          },
          isValid: true,
          notes: [
            `Weibull parameters: k = ${k}, c = ${c.toFixed(2)} m/s`,
            `Wind power class: ${getWindPowerClass(energy_density)}`,
          ],
        }
      },
    },
    {
      id: 'wake-effect',
      name: 'Wake Effect Calculator',
      description: 'Estimate wake losses using Jensen/Frandsen model',
      category: 'Wind Farm',
      inputs: [
        {
          id: 'spacing',
          name: 'Turbine Spacing',
          description: 'Distance between turbines in rotor diameters',
          type: 'number',
          unit: 'D',
          defaultValue: 7,
          min: 3,
          max: 15,
          step: 0.5,
          required: true,
        },
        {
          id: 'thrust_coefficient',
          name: 'Thrust Coefficient',
          description: 'Turbine thrust coefficient',
          type: 'number',
          unit: '',
          defaultValue: 0.75,
          min: 0.4,
          max: 1.0,
          step: 0.01,
          required: true,
        },
        {
          id: 'wake_decay',
          name: 'Wake Decay Constant',
          description: 'Wake expansion coefficient (0.04-0.1)',
          type: 'number',
          unit: '',
          defaultValue: 0.075,
          min: 0.04,
          max: 0.12,
          step: 0.005,
          required: true,
        },
      ],
      outputs: [
        {
          id: 'velocity_deficit',
          name: 'Velocity Deficit',
          description: 'Wind speed reduction at downstream turbine',
          unit: '%',
          precision: 1,
        },
        {
          id: 'power_deficit',
          name: 'Power Deficit',
          description: 'Power loss at downstream turbine',
          unit: '%',
          precision: 1,
        },
        {
          id: 'wake_diameter',
          name: 'Wake Diameter',
          description: 'Wake diameter at downstream location',
          unit: 'D',
          precision: 2,
        },
      ],
      calculate: (inputs) => {
        const x = Number(inputs.spacing) // Distance in rotor diameters
        const Ct = Number(inputs.thrust_coefficient)
        const k = Number(inputs.wake_decay)

        // Jensen wake model
        const a = (1 - Math.sqrt(1 - Ct)) / 2 // Induction factor
        const wake_diameter = 1 + 2 * k * x // Wake diameter in D

        // Velocity deficit
        const velocity_deficit = (1 - Math.sqrt(1 - Ct)) / (1 + 2 * k * x) ** 2

        // Power deficit (proportional to v³)
        const power_deficit = 1 - (1 - velocity_deficit) ** 3

        return {
          outputs: {
            velocity_deficit: velocity_deficit * 100,
            power_deficit: power_deficit * 100,
            wake_diameter,
          },
          isValid: true,
          notes: [
            'Jensen/Park wake model used',
            'Assumes single wake, no multiple wake interactions',
            `Recommended spacing: ${x < 7 ? 'increase to 7-10D' : 'adequate'}`,
          ],
          references: [
            'Jensen, N.O. (1983). Risø-M-2411. A Note on Wind Generator Interaction',
          ],
        }
      },
    },
    {
      id: 'annual-energy-production',
      name: 'Annual Energy Production (AEP)',
      description: 'Estimate annual energy production using Weibull distribution',
      category: 'Performance',
      inputs: [
        {
          id: 'rated_power',
          name: 'Rated Power',
          description: 'Turbine rated capacity',
          type: 'number',
          unit: 'MW',
          defaultValue: 5,
          min: 0.1,
          max: 20,
          step: 0.1,
          required: true,
        },
        {
          id: 'mean_wind_speed',
          name: 'Mean Wind Speed',
          description: 'Annual average wind speed at hub height',
          type: 'number',
          unit: 'm/s',
          defaultValue: 8.5,
          min: 4,
          max: 15,
          step: 0.1,
          required: true,
        },
        {
          id: 'availability',
          name: 'Availability',
          description: 'Turbine availability factor',
          type: 'number',
          unit: '%',
          defaultValue: 97,
          min: 85,
          max: 99,
          step: 0.5,
          required: true,
        },
      ],
      outputs: [
        {
          id: 'aep_gross',
          name: 'Gross AEP',
          description: 'Annual energy production before losses',
          unit: 'GWh/year',
          precision: 2,
        },
        {
          id: 'aep_net',
          name: 'Net AEP',
          description: 'Annual energy after availability',
          unit: 'GWh/year',
          precision: 2,
        },
        {
          id: 'capacity_factor',
          name: 'Capacity Factor',
          description: 'Net capacity factor',
          unit: '%',
          precision: 1,
        },
      ],
      calculate: (inputs) => {
        const P_rated = Number(inputs.rated_power)
        const v_mean = Number(inputs.mean_wind_speed)
        const avail = Number(inputs.availability) / 100

        // Simplified AEP using capacity factor correlation
        // CF ≈ 0.087 * v_mean - 0.26 (empirical fit)
        const cf_estimate = Math.max(0.15, Math.min(0.55, 0.087 * v_mean - 0.26))

        const hours_year = 8760
        const aep_gross = P_rated * hours_year * cf_estimate / 1000 // GWh
        const aep_net = aep_gross * avail
        const capacity_factor = (aep_net * 1000) / (P_rated * hours_year) * 100

        return {
          outputs: {
            aep_gross,
            aep_net,
            capacity_factor,
          },
          isValid: true,
          notes: [
            'Simplified capacity factor correlation used',
            'Actual AEP depends on power curve and site-specific conditions',
          ],
        }
      },
    },
  ]

  validationRules: ValidationRule[] = [
    {
      id: 'cp-betz-limit',
      name: 'Betz Limit Check',
      description: 'Power coefficient cannot exceed Betz limit',
      severity: 'error',
      check: (value) => value <= THERMODYNAMIC_LIMITS.betz,
      message: 'Power coefficient exceeds Betz limit (0.593)',
    },
    {
      id: 'cp-practical',
      name: 'Practical Cp Check',
      description: 'Cp above commercial levels',
      severity: 'warning',
      check: (value) => value <= 0.50,
      message: 'Power coefficient exceeds typical commercial values (0.45-0.50)',
    },
    {
      id: 'capacity-factor',
      name: 'Capacity Factor Check',
      description: 'Capacity factor should be realistic',
      severity: 'warning',
      check: (value) => value >= 0.20 && value <= 0.60,
      message: 'Capacity factor outside typical range (20-60%)',
    },
  ]

  simulationTemplates: SimulationTemplate[] = [
    {
      id: 'wind-farm-layout',
      name: 'Wind Farm Layout Optimization',
      description: 'Optimize turbine placement for maximum AEP',
      provider: 'modal',
      parameters: {
        model: 'floris',
        optimization: 'genetic-algorithm',
      },
      estimatedCost: 0.05,
      estimatedDuration: 300,
    },
    {
      id: 'turbine-dynamics',
      name: 'Turbine Mechanical Dynamics',
      description: 'MuJoCo simulation of turbine mechanical behavior',
      provider: 'mujoco',
      parameters: {
        type: 'wind_turbine',
        duration: 60,
      },
      estimatedCost: 0.03,
      estimatedDuration: 180,
    },
  ]

  inputFormConfig: DomainFormConfig = {
    sections: [
      {
        id: 'turbine',
        title: 'Turbine Parameters',
        fields: [
          {
            id: 'rated_power',
            name: 'Rated Power',
            description: 'Turbine rated capacity',
            type: 'number',
            unit: 'MW',
            defaultValue: 5,
            required: true,
          },
          {
            id: 'rotor_diameter',
            name: 'Rotor Diameter',
            description: 'Turbine rotor diameter',
            type: 'number',
            unit: 'm',
            defaultValue: 126,
            required: true,
          },
        ],
      },
    ],
    presets: [
      {
        id: 'vestas-v110',
        name: 'Vestas V110-2.0',
        values: { rated_power: 2.0, rotor_diameter: 110 },
      },
      {
        id: 'vestas-v164',
        name: 'Vestas V164-9.5',
        values: { rated_power: 9.5, rotor_diameter: 164 },
      },
    ],
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function gammaFunction(n: number): number {
  // Lanczos approximation for gamma function
  const g = 7
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ]

  if (n < 0.5) {
    return Math.PI / (Math.sin(Math.PI * n) * gammaFunction(1 - n))
  }

  n -= 1
  let x = c[0]
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (n + i)
  }

  const t = n + g + 0.5
  return Math.sqrt(2 * Math.PI) * Math.pow(t, n + 0.5) * Math.exp(-t) * x
}

function getWindPowerClass(energyDensity: number): string {
  if (energyDensity < 100) return 'Class 1 (Poor)'
  if (energyDensity < 150) return 'Class 2 (Marginal)'
  if (energyDensity < 200) return 'Class 3 (Fair)'
  if (energyDensity < 250) return 'Class 4 (Good)'
  if (energyDensity < 300) return 'Class 5 (Excellent)'
  if (energyDensity < 400) return 'Class 6 (Outstanding)'
  return 'Class 7 (Superb)'
}

// ============================================================================
// Export
// ============================================================================

export const WindDomain = new WindDomainModule()
export default WindDomain
