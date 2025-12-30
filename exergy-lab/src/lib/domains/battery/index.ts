/**
 * Battery Domain Module (v0.0.5)
 *
 * Domain-specific calculators for battery energy storage systems.
 * Includes degradation modeling, thermal analysis, and aging prediction.
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
} from '../base'

// ============================================================================
// Battery Domain Module
// ============================================================================

class BatteryDomainModule extends BaseDomainModule {
  id: DomainId = 'battery'
  name = 'Battery Storage'
  description = 'Lithium-ion and advanced battery systems'
  icon = 'battery'

  physicalLimits: PhysicalLimit[] = [
    {
      id: 'li-ion-theoretical-capacity',
      name: 'Li-ion Theoretical Capacity',
      description: 'Theoretical specific capacity for LiCoO2 cathode',
      value: 274,
      unit: 'mAh/g',
      formula: 'Q = nF/(3.6M), where n=1, M=97.87 g/mol for LiCoO2',
      citation: 'Whittingham, M.S. (2004). Chem. Rev. 104, 4271',
      conditions: 'Full lithium extraction, practical limit ~140 mAh/g',
    },
    {
      id: 'graphite-theoretical-capacity',
      name: 'Graphite Anode Capacity',
      description: 'Theoretical capacity for graphite anode',
      value: 372,
      unit: 'mAh/g',
      formula: 'LiC6 stoichiometry',
      citation: 'Standard literature value',
      conditions: 'Full lithiation, practical ~350 mAh/g',
    },
    {
      id: 'coulombic-efficiency-limit',
      name: 'Coulombic Efficiency Limit',
      description: 'Theoretical maximum coulombic efficiency',
      value: 1.0,
      unit: '',
      formula: 'η_c = Q_discharge / Q_charge',
      citation: 'Thermodynamic limit',
      conditions: 'No parasitic reactions',
    },
    {
      id: 'sei-formation-loss',
      name: 'Initial SEI Formation Loss',
      description: 'Typical capacity loss from initial SEI formation',
      value: 0.10,
      unit: '',
      formula: '5-15% capacity loss in first few cycles',
      citation: 'Peled, E. (1979). J. Electrochem. Soc. 126, 2047',
      conditions: 'Graphite anode, carbonate electrolyte',
    },
  ]

  industryBenchmarks: IndustryBenchmark[] = [
    {
      id: 'lfp-cycle-life',
      name: 'LFP Cycle Life',
      description: 'Typical cycle life for LiFePO4 cells',
      value: 3000,
      unit: 'cycles',
      year: 2024,
      source: 'CATL/BYD specifications',
      category: 'commercial',
    },
    {
      id: 'nmc-energy-density',
      name: 'NMC Energy Density',
      description: 'Commercial NMC811 cell energy density',
      value: 270,
      unit: 'Wh/kg',
      year: 2024,
      source: 'LG Energy Solution specifications',
      category: 'commercial',
    },
    {
      id: 'battery-cost',
      name: 'Li-ion Pack Cost',
      description: 'Average battery pack cost',
      value: 139,
      unit: '$/kWh',
      year: 2024,
      source: 'BloombergNEF Battery Price Survey 2024',
      category: 'commercial',
    },
    {
      id: 'solid-state-lab',
      name: 'Solid-State Lab Record',
      description: 'Best reported solid-state battery energy density',
      value: 500,
      unit: 'Wh/kg',
      year: 2024,
      source: 'Toyota/QuantumScape reports',
      category: 'lab_record',
    },
  ]

  calculators: DomainCalculator[] = [
    {
      id: 'capacity-fade',
      name: 'Capacity Fade Calculator',
      description: 'Estimate capacity degradation over cycles and time',
      category: 'Degradation',
      inputs: [
        {
          id: 'initial_capacity',
          name: 'Initial Capacity',
          description: 'Starting capacity in Ah or kWh',
          type: 'number',
          unit: 'kWh',
          defaultValue: 100,
          min: 1,
          max: 10000,
          step: 1,
          required: true,
        },
        {
          id: 'cycles',
          name: 'Cycle Count',
          description: 'Number of full equivalent cycles',
          type: 'number',
          unit: 'cycles',
          defaultValue: 1000,
          min: 0,
          max: 10000,
          step: 100,
          required: true,
        },
        {
          id: 'calendar_years',
          name: 'Calendar Age',
          description: 'Time since manufacture',
          type: 'number',
          unit: 'years',
          defaultValue: 5,
          min: 0,
          max: 20,
          step: 0.5,
          required: true,
        },
        {
          id: 'avg_soc',
          name: 'Average SOC',
          description: 'Average state of charge during storage',
          type: 'number',
          unit: '%',
          defaultValue: 50,
          min: 0,
          max: 100,
          step: 5,
          required: true,
        },
        {
          id: 'avg_temperature',
          name: 'Average Temperature',
          description: 'Average operating temperature',
          type: 'number',
          unit: '°C',
          defaultValue: 25,
          min: -20,
          max: 60,
          step: 1,
          required: true,
        },
      ],
      outputs: [
        {
          id: 'remaining_capacity',
          name: 'Remaining Capacity',
          description: 'Capacity after degradation',
          unit: 'kWh',
          precision: 1,
        },
        {
          id: 'soh',
          name: 'State of Health',
          description: 'Capacity retention percentage',
          unit: '%',
          precision: 1,
        },
        {
          id: 'cycle_fade',
          name: 'Cycle-Induced Fade',
          description: 'Capacity loss from cycling',
          unit: '%',
          precision: 1,
        },
        {
          id: 'calendar_fade',
          name: 'Calendar Fade',
          description: 'Capacity loss from calendar aging',
          unit: '%',
          precision: 1,
        },
      ],
      calculate: (inputs) => calculateCapacityFade(inputs),
      citation: 'Based on NMC aging models from literature',
    },
    {
      id: 'thermal-runaway-risk',
      name: 'Thermal Runaway Risk Assessment',
      description: 'Estimate thermal runaway risk based on operating conditions',
      category: 'Safety',
      inputs: [
        {
          id: 'temperature',
          name: 'Cell Temperature',
          description: 'Current cell temperature',
          type: 'number',
          unit: '°C',
          defaultValue: 45,
          min: 0,
          max: 80,
          step: 1,
          required: true,
        },
        {
          id: 'c_rate',
          name: 'C-Rate',
          description: 'Charge/discharge rate',
          type: 'number',
          unit: 'C',
          defaultValue: 1,
          min: 0.1,
          max: 5,
          step: 0.1,
          required: true,
        },
        {
          id: 'soc',
          name: 'State of Charge',
          description: 'Current SOC',
          type: 'number',
          unit: '%',
          defaultValue: 80,
          min: 0,
          max: 100,
          step: 5,
          required: true,
        },
        {
          id: 'soh',
          name: 'State of Health',
          description: 'Current SOH',
          type: 'number',
          unit: '%',
          defaultValue: 90,
          min: 50,
          max: 100,
          step: 1,
          required: true,
        },
      ],
      outputs: [
        {
          id: 'risk_score',
          name: 'Risk Score',
          description: 'Thermal runaway risk (0-100)',
          unit: '',
          precision: 0,
        },
        {
          id: 'risk_level',
          name: 'Risk Level',
          description: 'Risk category',
          unit: '',
        },
        {
          id: 'recommended_action',
          name: 'Recommended Action',
          description: 'Suggested safety measure',
          unit: '',
        },
      ],
      calculate: (inputs) => {
        const T = Number(inputs.temperature)
        const C = Number(inputs.c_rate)
        const SOC = Number(inputs.soc)
        const SOH = Number(inputs.soh)

        // Risk factors (0-1 scale)
        const temp_factor = T > 60 ? 1 : T > 45 ? 0.5 : T > 35 ? 0.2 : 0
        const c_rate_factor = C > 3 ? 1 : C > 2 ? 0.5 : C > 1 ? 0.2 : 0
        const soc_factor = SOC > 95 ? 0.8 : SOC > 80 ? 0.3 : 0
        const soh_factor = SOH < 60 ? 0.8 : SOH < 70 ? 0.4 : SOH < 80 ? 0.2 : 0

        // Combined risk score
        const risk_score = Math.min(
          100,
          (temp_factor * 40 + c_rate_factor * 25 + soc_factor * 20 + soh_factor * 15)
        )

        let risk_level: string
        let recommended_action: string

        if (risk_score >= 70) {
          risk_level = 'HIGH'
          recommended_action = 'Immediately reduce C-rate and improve cooling'
        } else if (risk_score >= 40) {
          risk_level = 'MODERATE'
          recommended_action = 'Monitor closely, consider reducing load'
        } else if (risk_score >= 20) {
          risk_level = 'LOW'
          recommended_action = 'Normal operation, maintain monitoring'
        } else {
          risk_level = 'MINIMAL'
          recommended_action = 'Safe operating conditions'
        }

        return {
          outputs: {
            risk_score,
            risk_level,
            recommended_action,
          },
          isValid: true,
          warnings: risk_score >= 40 ? ['Elevated thermal runaway risk detected'] : [],
        }
      },
    },
    {
      id: 'energy-throughput',
      name: 'Energy Throughput Calculator',
      description: 'Calculate total energy throughput and equivalent cycles',
      category: 'Performance',
      inputs: [
        {
          id: 'capacity',
          name: 'Usable Capacity',
          description: 'Usable battery capacity',
          type: 'number',
          unit: 'kWh',
          defaultValue: 13.5,
          min: 1,
          max: 1000,
          step: 0.5,
          required: true,
        },
        {
          id: 'daily_cycles',
          name: 'Daily Cycles',
          description: 'Average full equivalent cycles per day',
          type: 'number',
          unit: 'cycles/day',
          defaultValue: 1,
          min: 0.1,
          max: 3,
          step: 0.1,
          required: true,
        },
        {
          id: 'years',
          name: 'Project Life',
          description: 'Expected operational lifetime',
          type: 'number',
          unit: 'years',
          defaultValue: 10,
          min: 1,
          max: 30,
          step: 1,
          required: true,
        },
      ],
      outputs: [
        {
          id: 'total_throughput',
          name: 'Total Throughput',
          description: 'Total energy throughput over lifetime',
          unit: 'MWh',
          precision: 0,
        },
        {
          id: 'total_cycles',
          name: 'Total Cycles',
          description: 'Total full equivalent cycles',
          unit: 'cycles',
          precision: 0,
        },
        {
          id: 'throughput_per_kwh',
          name: 'Throughput per kWh Capacity',
          description: 'Energy delivered per kWh of installed capacity',
          unit: 'kWh/kWh',
          precision: 0,
        },
      ],
      calculate: (inputs) => {
        const capacity = Number(inputs.capacity)
        const daily_cycles = Number(inputs.daily_cycles)
        const years = Number(inputs.years)

        const total_cycles = daily_cycles * 365 * years
        const total_throughput = capacity * total_cycles / 1000 // MWh
        const throughput_per_kwh = total_throughput * 1000 / capacity

        return {
          outputs: {
            total_throughput,
            total_cycles,
            throughput_per_kwh,
          },
          isValid: true,
          notes: [
            `Daily energy: ${(capacity * daily_cycles).toFixed(1)} kWh`,
            `Annual energy: ${(capacity * daily_cycles * 365 / 1000).toFixed(1)} MWh`,
          ],
        }
      },
    },
  ]

  validationRules: ValidationRule[] = [
    {
      id: 'coulombic-efficiency',
      name: 'Coulombic Efficiency Check',
      description: 'Coulombic efficiency cannot exceed 100%',
      severity: 'error',
      check: (value) => value <= 1.0,
      message: 'Coulombic efficiency cannot exceed 100%',
    },
    {
      id: 'energy-density',
      name: 'Energy Density Check',
      description: 'Energy density within realistic range',
      severity: 'warning',
      check: (value) => value <= 500,
      message: 'Energy density exceeds current lab records (500 Wh/kg)',
    },
    {
      id: 'cycle-life',
      name: 'Cycle Life Check',
      description: 'Cycle life within realistic range',
      severity: 'warning',
      check: (value) => value <= 10000,
      message: 'Cycle life exceeds typical maximum for Li-ion (~10,000 cycles)',
    },
  ]

  simulationTemplates: SimulationTemplate[] = [
    {
      id: 'thermal-simulation',
      name: 'Battery Thermal Simulation',
      description: 'Simulate thermal behavior under cycling',
      provider: 'physx',
      parameters: {
        type: 'thermal',
        boundary_conditions: 'convective',
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
            name: 'Capacity',
            description: 'Total energy capacity',
            type: 'number',
            unit: 'kWh',
            defaultValue: 100,
            required: true,
          },
        ],
      },
    ],
    presets: [
      {
        id: 'tesla-powerwall',
        name: 'Tesla Powerwall 3',
        values: { capacity: 13.5 },
      },
      {
        id: 'utility-scale',
        name: 'Utility 100MW/400MWh',
        values: { capacity: 400000 },
      },
    ],
  }
}

// ============================================================================
// Calculator Implementations
// ============================================================================

function calculateCapacityFade(
  inputs: Record<string, number | string>
): CalculatorResult {
  const C0 = Number(inputs.initial_capacity)
  const cycles = Number(inputs.cycles)
  const years = Number(inputs.calendar_years)
  const soc = Number(inputs.avg_soc) / 100
  const T = Number(inputs.avg_temperature)

  // Cycle aging model (empirical NMC model)
  // Q_cycle = B * N^0.5 (square root model)
  const B_cycle = 0.0002 // Cycle aging coefficient
  const cycle_fade = B_cycle * Math.sqrt(cycles)

  // Calendar aging model (Arrhenius)
  // Q_calendar = A * exp(-Ea/RT) * t^0.5
  const Ea = 50000 // Activation energy J/mol
  const R = PHYSICAL_CONSTANTS.R
  const T_K = T + 273.15
  const T_ref = 298.15

  const A_calendar = 0.02 // Calendar aging pre-factor
  const temp_factor = Math.exp((Ea / R) * (1 / T_ref - 1 / T_K))
  const soc_factor = 1 + 2 * (soc - 0.5) ** 2 // Higher degradation at high/low SOC

  const calendar_fade = A_calendar * temp_factor * soc_factor * Math.sqrt(years)

  // Total fade (empirical combination)
  const total_fade = Math.min(0.50, cycle_fade + calendar_fade) // Cap at 50%

  const remaining_capacity = C0 * (1 - total_fade)
  const soh = (1 - total_fade) * 100

  return {
    outputs: {
      remaining_capacity,
      soh,
      cycle_fade: cycle_fade * 100,
      calendar_fade: calendar_fade * 100,
    },
    isValid: true,
    notes: [
      'Based on empirical NMC degradation models',
      `Temperature acceleration factor: ${temp_factor.toFixed(2)}x`,
      `SOC stress factor: ${soc_factor.toFixed(2)}x`,
    ],
    warnings: soh < 80 ? ['Battery below 80% SOH - consider replacement'] : [],
  }
}

// ============================================================================
// Export
// ============================================================================

export const BatteryDomain = new BatteryDomainModule()
export default BatteryDomain
