import type { SimulationType } from '@/types/simulation-workflow'
import type { SimulationTier } from '@/types/simulation'

export interface SampleSimulation {
  id: string
  title: string
  description: string
  icon: string // Lucide icon name
  tier: SimulationTier
  type: SimulationType
  goal: string // Full natural language description
  expectedDuration: string
  expectedOutputs: string[]
  category: 'beginner' | 'intermediate' | 'advanced'
}

export const SAMPLE_SIMULATIONS: SampleSimulation[] = [
  {
    id: 'geothermal-binary',
    title: 'Binary Geothermal Plant',
    description: 'Analyze thermodynamic performance of a binary cycle geothermal plant with organic Rankine cycle',
    icon: 'Flame',
    tier: 'local',
    type: 'geothermal',
    goal: 'Analyze a binary cycle geothermal plant with 180°C reservoir temperature, 25 MW capacity, and R245fa working fluid. Calculate thermal efficiency, power output, and specific work. Assess exergy destruction in heat exchangers and turbine.',
    expectedDuration: '30-60s',
    expectedOutputs: [
      'Thermal efficiency (typically 10-15%)',
      'Net power output (MW)',
      'Specific work (kJ/kg)',
      'Exergy efficiency',
      'Component-level exergy destruction'
    ],
    category: 'beginner'
  },
  {
    id: 'solar-pv-efficiency',
    title: 'Solar PV Efficiency',
    description: 'Compare photovoltaic cell efficiency for different bandgap materials under standard test conditions',
    icon: 'Sun',
    tier: 'browser',
    type: 'solar',
    goal: 'Compare PV cell efficiency for different bandgap materials (Si, GaAs, CIGS, Perovskite) under AM1.5 spectrum at 25°C and 1000 W/m² irradiance. Calculate maximum theoretical efficiency using Shockley-Queisser limit. Include temperature coefficient effects and fill factor analysis.',
    expectedDuration: '2-5min',
    expectedOutputs: [
      'Maximum efficiency vs bandgap (Shockley-Queisser curve)',
      'Open-circuit voltage (V)',
      'Short-circuit current density (mA/cm²)',
      'Fill factor (%)',
      'Temperature coefficient (%/°C)',
      'Comparison to theoretical limits'
    ],
    category: 'intermediate'
  },
  {
    id: 'offshore-wind',
    title: 'Offshore Wind Farm',
    description: 'Model performance of offshore wind turbine array with wake effects and capacity factor analysis',
    icon: 'Wind',
    tier: 'browser',
    type: 'wind',
    goal: 'Model a 5 MW offshore wind turbine at 12 m/s average wind speed with 120m hub height. Include wake effects for 10x10 array with 7D spacing. Calculate annual energy production, capacity factor, and power curve. Use Weibull distribution for wind resource and Jensen wake model.',
    expectedDuration: '3-7min',
    expectedOutputs: [
      'Annual energy production (GWh/year)',
      'Capacity factor (%)',
      'Power curve (0-25 m/s)',
      'Wake losses (%)',
      'Array efficiency',
      'LCOE estimate ($/MWh)'
    ],
    category: 'intermediate'
  },
  {
    id: 'pem-electrolyzer',
    title: 'PEM Electrolyzer',
    description: 'Analyze PEM electrolyzer efficiency and hydrogen production with detailed electrochemistry modeling',
    icon: 'Droplets',
    tier: 'cloud',
    type: 'hydrogen',
    goal: 'Analyze PEM electrolyzer efficiency at 80°C with 30 bar output pressure and 95% current efficiency. Model polarization curve including activation, ohmic, and concentration overpotentials. Calculate hydrogen production rate, specific energy consumption, and system efficiency. Include thermal management and stack degradation over 10,000 hours.',
    expectedDuration: '15-30min',
    expectedOutputs: [
      'Polarization curve (V vs current density)',
      'Hydrogen production rate (kg/day)',
      'Specific energy consumption (kWh/kg H₂)',
      'System efficiency (HHV basis)',
      'Voltage efficiency at rated current',
      'Stack degradation rate (μV/h)',
      'Thermal balance and cooling requirements'
    ],
    category: 'advanced'
  }
]
