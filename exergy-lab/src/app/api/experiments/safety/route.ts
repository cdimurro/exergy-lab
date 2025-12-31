/**
 * Experiment Safety Analysis API Route
 *
 * Analyzes experiment protocols for safety hazards including:
 * - Chemical hazards (toxicity, flammability, reactivity)
 * - Physical hazards (temperature, pressure, radiation)
 * - Equipment hazards
 * - PPE requirements
 * - Emergency procedures
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export interface SafetyRequest {
  domain: string
  materials: Array<{
    name: string
    quantity: number
    unit: string
  }>
  equipment?: string[]
  procedures?: string[]
  temperatures?: number[] // Operating temperatures in °C
  pressures?: number[] // Operating pressures in bar
}

export type HazardLevel = 'critical' | 'high' | 'medium' | 'low'
export type HazardType = 'chemical' | 'physical' | 'biological' | 'electrical' | 'radiation'

export interface Hazard {
  id: string
  type: HazardType
  level: HazardLevel
  source: string
  description: string
  ghs_codes?: string[]
  exposure_routes?: string[]
  health_effects?: string[]
}

export interface PPERequirement {
  item: string
  type: 'eye' | 'hand' | 'body' | 'respiratory' | 'foot'
  level: 'basic' | 'enhanced' | 'specialized'
  specification?: string
}

export interface EmergencyProcedure {
  scenario: string
  steps: string[]
  contacts?: string[]
}

export interface SafetyAnalysis {
  overallRiskScore: number // 0-100
  riskLevel: 'critical' | 'high' | 'medium' | 'low'
  hazards: Hazard[]
  ppe: PPERequirement[]
  emergencyProcedures: EmergencyProcedure[]
  training: string[]
  documentation: string[]
  engineeringControls: string[]
  administrativeControls: string[]
  recommendations: string[]
}

// Chemical hazard database (simplified)
const CHEMICAL_HAZARDS: Record<string, {
  level: HazardLevel
  ghs: string[]
  exposure: string[]
  effects: string[]
  description: string
}> = {
  // Heavy metals
  'lead': {
    level: 'high',
    ghs: ['GHS06', 'GHS08', 'GHS09'],
    exposure: ['inhalation', 'ingestion', 'skin'],
    effects: ['neurotoxicity', 'reproductive toxicity', 'kidney damage'],
    description: 'Toxic heavy metal with cumulative effects',
  },
  'lead iodide': {
    level: 'high',
    ghs: ['GHS06', 'GHS08', 'GHS09'],
    exposure: ['inhalation', 'ingestion', 'skin'],
    effects: ['lead poisoning', 'iodine toxicity', 'developmental toxicity'],
    description: 'Toxic lead compound used in perovskite synthesis',
  },
  'pbi2': {
    level: 'high',
    ghs: ['GHS06', 'GHS08', 'GHS09'],
    exposure: ['inhalation', 'ingestion', 'skin'],
    effects: ['lead poisoning', 'iodine toxicity', 'developmental toxicity'],
    description: 'Toxic lead compound used in perovskite synthesis',
  },
  'cadmium': {
    level: 'critical',
    ghs: ['GHS06', 'GHS08'],
    exposure: ['inhalation', 'ingestion'],
    effects: ['carcinogen', 'kidney damage', 'bone disease'],
    description: 'Known carcinogen - minimize exposure',
  },

  // Solvents
  'dmf': {
    level: 'medium',
    ghs: ['GHS07', 'GHS08'],
    exposure: ['inhalation', 'skin', 'ingestion'],
    effects: ['liver damage', 'reproductive toxicity', 'skin irritation'],
    description: 'Reproductive toxicant - use in fume hood',
  },
  'dimethylformamide': {
    level: 'medium',
    ghs: ['GHS07', 'GHS08'],
    exposure: ['inhalation', 'skin', 'ingestion'],
    effects: ['liver damage', 'reproductive toxicity', 'skin irritation'],
    description: 'Reproductive toxicant - use in fume hood',
  },
  'dmso': {
    level: 'low',
    ghs: ['GHS07'],
    exposure: ['skin', 'ingestion'],
    effects: ['skin irritation', 'enhances absorption of other chemicals'],
    description: 'Can carry dissolved chemicals through skin',
  },
  'chlorobenzene': {
    level: 'medium',
    ghs: ['GHS02', 'GHS07', 'GHS09'],
    exposure: ['inhalation', 'skin'],
    effects: ['CNS depression', 'liver damage', 'environmental hazard'],
    description: 'Flammable solvent - use in fume hood',
  },
  'acetone': {
    level: 'low',
    ghs: ['GHS02', 'GHS07'],
    exposure: ['inhalation', 'skin'],
    effects: ['CNS depression', 'eye irritation', 'defatting of skin'],
    description: 'Highly flammable - keep away from ignition sources',
  },
  'isopropanol': {
    level: 'low',
    ghs: ['GHS02', 'GHS07'],
    exposure: ['inhalation', 'ingestion'],
    effects: ['CNS depression', 'eye irritation'],
    description: 'Flammable - use with adequate ventilation',
  },
  'ethanol': {
    level: 'low',
    ghs: ['GHS02'],
    exposure: ['inhalation', 'ingestion'],
    effects: ['CNS depression', 'eye irritation'],
    description: 'Flammable liquid',
  },
  'nmp': {
    level: 'medium',
    ghs: ['GHS07', 'GHS08'],
    exposure: ['skin', 'inhalation'],
    effects: ['reproductive toxicity', 'skin irritation'],
    description: 'Reproductive toxicant - avoid skin contact',
  },

  // Battery materials
  'lithium': {
    level: 'high',
    ghs: ['GHS02', 'GHS05'],
    exposure: ['skin', 'eye'],
    effects: ['severe burns', 'fire hazard with water'],
    description: 'Reacts violently with water - store under inert atmosphere',
  },
  'lithium carbonate': {
    level: 'medium',
    ghs: ['GHS07'],
    exposure: ['ingestion', 'inhalation'],
    effects: ['GI irritation', 'CNS effects at high doses'],
    description: 'Moderate irritant - use dust mask',
  },
  'cobalt oxide': {
    level: 'high',
    ghs: ['GHS07', 'GHS08'],
    exposure: ['inhalation', 'skin'],
    effects: ['respiratory sensitization', 'potential carcinogen'],
    description: 'Sensitizer - use respiratory protection',
  },

  // Catalysts and specialty chemicals
  'platinum': {
    level: 'low',
    ghs: ['GHS07'],
    exposure: ['inhalation', 'skin'],
    effects: ['respiratory irritation', 'skin sensitization'],
    description: 'Generally low toxicity in bulk form',
  },
  'iridium oxide': {
    level: 'medium',
    ghs: ['GHS07'],
    exposure: ['inhalation', 'skin'],
    effects: ['eye and respiratory irritation'],
    description: 'Use dust mask and gloves',
  },
  'nafion': {
    level: 'low',
    ghs: ['GHS07'],
    exposure: ['skin', 'eye'],
    effects: ['mild irritation'],
    description: 'Low hazard polymer solution',
  },
  'spiro-ometad': {
    level: 'medium',
    ghs: ['GHS07'],
    exposure: ['skin', 'inhalation'],
    effects: ['potential sensitizer', 'irritant'],
    description: 'Limited toxicity data - treat with caution',
  },

  // Acids and bases
  'hydrochloric acid': {
    level: 'high',
    ghs: ['GHS05', 'GHS07'],
    exposure: ['inhalation', 'skin', 'eye'],
    effects: ['severe burns', 'respiratory damage'],
    description: 'Strong acid - use in fume hood with face shield',
  },
  'sulfuric acid': {
    level: 'critical',
    ghs: ['GHS05'],
    exposure: ['skin', 'eye', 'inhalation'],
    effects: ['severe burns', 'tissue destruction'],
    description: 'Highly corrosive - extreme caution required',
  },
  'sodium hydroxide': {
    level: 'high',
    ghs: ['GHS05'],
    exposure: ['skin', 'eye'],
    effects: ['severe burns', 'blindness risk'],
    description: 'Strong base - wear face shield',
  },

  // Gases
  'hydrogen': {
    level: 'high',
    ghs: ['GHS02', 'GHS04'],
    exposure: ['inhalation'],
    effects: ['asphyxiation', 'explosion hazard'],
    description: 'Extremely flammable - explosion risk 4-75% in air',
  },
  'nitrogen': {
    level: 'low',
    ghs: ['GHS04'],
    exposure: ['inhalation'],
    effects: ['asphyxiation in confined spaces'],
    description: 'Asphyxiant - ensure adequate ventilation',
  },
  'argon': {
    level: 'low',
    ghs: ['GHS04'],
    exposure: ['inhalation'],
    effects: ['asphyxiation in confined spaces'],
    description: 'Asphyxiant - ensure adequate ventilation',
  },
}

// Equipment hazards
const EQUIPMENT_HAZARDS: Record<string, {
  type: HazardType
  level: HazardLevel
  description: string
  controls: string[]
}> = {
  'spin coater': {
    type: 'physical',
    level: 'medium',
    description: 'Rotating parts, solvent splash risk',
    controls: ['Enclosure during operation', 'Use lid', 'Keep hands clear'],
  },
  'thermal evaporator': {
    type: 'physical',
    level: 'high',
    description: 'High vacuum, high temperature, electrical hazards',
    controls: ['Training required', 'Check interlocks', 'Cool-down period'],
  },
  'e-beam evaporator': {
    type: 'radiation',
    level: 'high',
    description: 'X-ray generation, high voltage',
    controls: ['Radiation monitoring', 'Interlocks functional', 'Authorized users only'],
  },
  'glovebox': {
    type: 'physical',
    level: 'low',
    description: 'Inert atmosphere, solvent exposure',
    controls: ['Solvent limits', 'O2/H2O monitoring', 'Regeneration schedule'],
  },
  'furnace': {
    type: 'physical',
    level: 'high',
    description: 'High temperature burn risk',
    controls: ['Heat-resistant gloves', 'Warning signs', 'Cool-down period'],
  },
  'tube furnace': {
    type: 'physical',
    level: 'high',
    description: 'High temperature, gas flow hazards',
    controls: ['Gas leak detection', 'Heat shields', 'Emergency shutoff'],
  },
  'electrochemical workstation': {
    type: 'electrical',
    level: 'medium',
    description: 'Electrical shock risk, hydrogen evolution',
    controls: ['Insulated connections', 'Ventilation', 'Current limits'],
  },
  'solar simulator': {
    type: 'radiation',
    level: 'medium',
    description: 'Intense light, UV exposure',
    controls: ['UV blocking glasses', 'Enclosure', 'Interlock'],
  },
  'ultrasonic bath': {
    type: 'physical',
    level: 'low',
    description: 'Noise, potential splashing',
    controls: ['Hearing protection', 'Lid during operation'],
  },
  'hotplate': {
    type: 'physical',
    level: 'medium',
    description: 'Burn hazard, solvent ignition risk',
    controls: ['Temperature monitoring', 'Keep flammables away', 'Use heat-resistant support'],
  },
}

/**
 * POST /api/experiments/safety
 * Analyze experiment for safety hazards
 */
export async function POST(request: NextRequest) {
  try {
    const req = (await request.json()) as SafetyRequest

    const hazards: Hazard[] = []
    const ppe: PPERequirement[] = []
    const emergencyProcedures: EmergencyProcedure[] = []
    const training: string[] = []
    const documentation: string[] = []
    const engineeringControls: string[] = []
    const administrativeControls: string[] = []
    const recommendations: string[] = []

    // Analyze materials
    for (const material of req.materials) {
      const lookup = material.name.toLowerCase()
      const hazardInfo = CHEMICAL_HAZARDS[lookup]

      if (hazardInfo) {
        hazards.push({
          id: `chem_${lookup.replace(/\s+/g, '_')}`,
          type: 'chemical',
          level: hazardInfo.level,
          source: material.name,
          description: hazardInfo.description,
          ghs_codes: hazardInfo.ghs,
          exposure_routes: hazardInfo.exposure,
          health_effects: hazardInfo.effects,
        })
      } else {
        // Unknown chemical - flag for review
        hazards.push({
          id: `chem_unknown_${lookup.replace(/\s+/g, '_')}`,
          type: 'chemical',
          level: 'medium',
          source: material.name,
          description: 'Unknown chemical - review SDS before use',
        })
        recommendations.push(`Obtain and review SDS for ${material.name}`)
      }
    }

    // Analyze equipment
    if (req.equipment) {
      for (const equip of req.equipment) {
        const lookup = equip.toLowerCase()
        const hazardInfo = EQUIPMENT_HAZARDS[lookup]

        if (hazardInfo) {
          hazards.push({
            id: `equip_${lookup.replace(/\s+/g, '_')}`,
            type: hazardInfo.type,
            level: hazardInfo.level,
            source: equip,
            description: hazardInfo.description,
          })
          engineeringControls.push(...hazardInfo.controls)
        }
      }
    }

    // Analyze temperature hazards
    if (req.temperatures) {
      const maxTemp = Math.max(...req.temperatures)
      const minTemp = Math.min(...req.temperatures)

      if (maxTemp > 200) {
        hazards.push({
          id: 'temp_high',
          type: 'physical',
          level: maxTemp > 500 ? 'critical' : 'high',
          source: `High temperature: ${maxTemp}°C`,
          description: `Operations at ${maxTemp}°C require heat protection`,
        })
        ppe.push({
          item: 'Heat-resistant gloves',
          type: 'hand',
          level: 'specialized',
          specification: maxTemp > 300 ? 'Rated for >300°C' : 'Rated for >200°C',
        })
      }

      if (minTemp < -20) {
        hazards.push({
          id: 'temp_low',
          type: 'physical',
          level: 'medium',
          source: `Low temperature: ${minTemp}°C`,
          description: `Cryogenic hazard at ${minTemp}°C`,
        })
        ppe.push({
          item: 'Cryogenic gloves',
          type: 'hand',
          level: 'specialized',
        })
      }
    }

    // Analyze pressure hazards
    if (req.pressures) {
      const maxPressure = Math.max(...req.pressures)

      if (maxPressure > 10) {
        hazards.push({
          id: 'pressure_high',
          type: 'physical',
          level: maxPressure > 100 ? 'critical' : 'high',
          source: `High pressure: ${maxPressure} bar`,
          description: `Operations at ${maxPressure} bar require pressure containment`,
        })
        training.push('High-pressure equipment operation training')
        engineeringControls.push('Pressure relief valves', 'Burst disks', 'Pressure monitoring')
      }
    }

    // Determine PPE requirements based on hazards
    const hasChemicalHazards = hazards.some((h) => h.type === 'chemical')
    const hasLeadOrHeavyMetal = hazards.some((h) =>
      h.source.toLowerCase().includes('lead') ||
      h.source.toLowerCase().includes('cadmium')
    )
    const hasCorrosives = hazards.some((h) =>
      h.ghs_codes?.includes('GHS05')
    )
    const hasFlammables = hazards.some((h) =>
      h.ghs_codes?.includes('GHS02')
    )
    const hasReproToxicants = hazards.some((h) =>
      h.source.toLowerCase().includes('dmf') ||
      h.source.toLowerCase().includes('nmp')
    )

    // Always require basic PPE
    ppe.push(
      { item: 'Safety glasses', type: 'eye', level: 'basic' },
      { item: 'Lab coat', type: 'body', level: 'basic' },
      { item: 'Closed-toe shoes', type: 'foot', level: 'basic' }
    )

    if (hasChemicalHazards) {
      ppe.push({ item: 'Nitrile gloves', type: 'hand', level: 'basic' })
    }

    if (hasCorrosives) {
      ppe.push(
        { item: 'Face shield', type: 'eye', level: 'enhanced' },
        { item: 'Chemical-resistant apron', type: 'body', level: 'enhanced' }
      )
    }

    if (hasLeadOrHeavyMetal) {
      ppe.push(
        { item: 'N95 respirator', type: 'respiratory', level: 'enhanced' },
        { item: 'Double nitrile gloves', type: 'hand', level: 'enhanced' }
      )
      training.push('Lead safety awareness training')
      documentation.push('Lead exposure monitoring records')
    }

    if (hasReproToxicants) {
      training.push('Reproductive hazards awareness')
      engineeringControls.push('Use in fume hood with verified airflow')
    }

    if (hasFlammables) {
      engineeringControls.push('No ignition sources', 'Grounded containers', 'Fire extinguisher nearby')
    }

    // Add emergency procedures based on hazards
    if (hasChemicalHazards) {
      emergencyProcedures.push({
        scenario: 'Chemical spill',
        steps: [
          'Alert others in the area',
          'Evacuate if large spill or unknown chemical',
          'Don appropriate PPE',
          'Contain spill with absorbent materials',
          'Dispose of waste properly',
          'Report to safety officer',
        ],
        contacts: ['EHS Emergency: 911', 'Lab Safety Officer'],
      })
    }

    if (hazards.some((h) => h.level === 'critical' || h.level === 'high')) {
      emergencyProcedures.push({
        scenario: 'Chemical exposure',
        steps: [
          'Remove contaminated clothing immediately',
          'Flush affected area with water for 15+ minutes',
          'For eye exposure: use eyewash station',
          'Seek medical attention',
          'Bring SDS to medical provider',
        ],
        contacts: ['EMS: 911', 'Poison Control: 1-800-222-1222'],
      })
    }

    // Calculate overall risk score
    let riskScore = 0
    for (const hazard of hazards) {
      switch (hazard.level) {
        case 'critical':
          riskScore += 25
          break
        case 'high':
          riskScore += 15
          break
        case 'medium':
          riskScore += 8
          break
        case 'low':
          riskScore += 3
          break
      }
    }
    riskScore = Math.min(100, riskScore)

    const riskLevel: 'critical' | 'high' | 'medium' | 'low' =
      riskScore >= 75 ? 'critical' :
      riskScore >= 50 ? 'high' :
      riskScore >= 25 ? 'medium' : 'low'

    // Add standard documentation
    documentation.push(
      'Chemical inventory updated',
      'SDS files accessible',
      'Training records current'
    )

    if (riskLevel === 'critical' || riskLevel === 'high') {
      documentation.push('Standard Operating Procedure (SOP)')
      administrativeControls.push('Buddy system required', 'Supervisor notification before work')
    }

    // Deduplicate arrays
    const uniquePpe = ppe.filter((p, i, arr) =>
      arr.findIndex((x) => x.item === p.item) === i
    )
    const uniqueTraining = [...new Set(training)]
    const uniqueEngineering = [...new Set(engineeringControls)]

    const analysis: SafetyAnalysis = {
      overallRiskScore: riskScore,
      riskLevel,
      hazards,
      ppe: uniquePpe,
      emergencyProcedures,
      training: uniqueTraining,
      documentation,
      engineeringControls: uniqueEngineering,
      administrativeControls,
      recommendations,
    }

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Safety analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Safety analysis failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/experiments/safety
 * Get available hazard information
 */
export async function GET() {
  return NextResponse.json({
    chemicalHazards: Object.keys(CHEMICAL_HAZARDS),
    equipmentHazards: Object.keys(EQUIPMENT_HAZARDS),
    ghsCodes: {
      'GHS01': 'Explosive',
      'GHS02': 'Flammable',
      'GHS03': 'Oxidizer',
      'GHS04': 'Compressed gas',
      'GHS05': 'Corrosive',
      'GHS06': 'Acute toxicity',
      'GHS07': 'Irritant/Harmful',
      'GHS08': 'Health hazard',
      'GHS09': 'Environmental hazard',
    },
  })
}
