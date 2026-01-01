/**
 * Equipment Feasibility Validator
 *
 * Validates equipment accessibility and estimates access costs.
 * Categorizes experiments by tier (academic/industrial/pilot).
 */

import type { ProtocolValidation } from '@/types/experiment-workflow'

// ============================================================================
// Equipment Database (MVP - Later integrate facility APIs)
// ============================================================================

interface EquipmentData {
  tier: 'academic' | 'industrial' | 'pilot'
  costPerHour: number
  alternatives: string[]
  availability: 'common' | 'specialized' | 'rare'
}

const EQUIPMENT_DATABASE: Record<string, EquipmentData> = {
  // Common lab equipment
  'Fume hood': {
    tier: 'academic',
    costPerHour: 0,
    alternatives: [],
    availability: 'common',
  },
  'Glovebox': {
    tier: 'academic',
    costPerHour: 25,
    alternatives: ['Schlenk line', 'Inert atmosphere bag'],
    availability: 'common',
  },
  'Glovebox (N2)': {
    tier: 'academic',
    costPerHour: 25,
    alternatives: ['Schlenk line', 'Inert atmosphere bag'],
    availability: 'common',
  },
  'Glovebox (Ar)': {
    tier: 'academic',
    costPerHour: 30,
    alternatives: ['Schlenk line', 'N2 glovebox'],
    availability: 'common',
  },
  'Spin coater': {
    tier: 'academic',
    costPerHour: 15,
    alternatives: ['Doctor blade', 'Drop casting', 'Dip coating'],
    availability: 'common',
  },
  'Hot plate': {
    tier: 'academic',
    costPerHour: 0,
    alternatives: ['Heating mantle', 'Oil bath'],
    availability: 'common',
  },
  'Stirrer': {
    tier: 'academic',
    costPerHour: 0,
    alternatives: ['Magnetic stirrer', 'Overhead stirrer'],
    availability: 'common',
  },
  'Vacuum oven': {
    tier: 'academic',
    costPerHour: 10,
    alternatives: ['Standard oven with N2 purge'],
    availability: 'common',
  },
  'Centrifuge': {
    tier: 'academic',
    costPerHour: 5,
    alternatives: [],
    availability: 'common',
  },
  'UV lamp': {
    tier: 'academic',
    costPerHour: 5,
    alternatives: [],
    availability: 'common',
  },

  // Characterization equipment
  'Solar simulator': {
    tier: 'academic',
    costPerHour: 50,
    alternatives: ['Natural sunlight (limited precision)', 'LED array'],
    availability: 'specialized',
  },
  'UV-Vis spectrophotometer': {
    tier: 'academic',
    costPerHour: 20,
    alternatives: [],
    availability: 'common',
  },
  'XRD': {
    tier: 'academic',
    costPerHour: 75,
    alternatives: ['Raman spectroscopy (limited)', 'External service'],
    availability: 'specialized',
  },
  'X-ray diffractometer': {
    tier: 'academic',
    costPerHour: 75,
    alternatives: ['Raman spectroscopy (limited)', 'External service'],
    availability: 'specialized',
  },
  'SEM': {
    tier: 'industrial',
    costPerHour: 100,
    alternatives: ['Optical microscope (limited resolution)', 'External service'],
    availability: 'specialized',
  },
  'Scanning electron microscope': {
    tier: 'industrial',
    costPerHour: 100,
    alternatives: ['Optical microscope (limited resolution)', 'External service'],
    availability: 'specialized',
  },
  'TEM': {
    tier: 'industrial',
    costPerHour: 150,
    alternatives: ['SEM', 'External service'],
    availability: 'rare',
  },
  'AFM': {
    tier: 'industrial',
    costPerHour: 80,
    alternatives: ['SEM for surface imaging'],
    availability: 'specialized',
  },
  'XPS': {
    tier: 'industrial',
    costPerHour: 125,
    alternatives: ['EDX (limited)', 'External service'],
    availability: 'rare',
  },
  'FTIR': {
    tier: 'academic',
    costPerHour: 30,
    alternatives: ['Raman spectroscopy'],
    availability: 'common',
  },
  'Raman spectroscopy': {
    tier: 'academic',
    costPerHour: 40,
    alternatives: ['FTIR'],
    availability: 'common',
  },
  'NMR': {
    tier: 'academic',
    costPerHour: 60,
    alternatives: ['Mass spectrometry (different info)', 'External service'],
    availability: 'specialized',
  },
  'Mass spectrometer': {
    tier: 'academic',
    costPerHour: 70,
    alternatives: ['External service'],
    availability: 'specialized',
  },
  'Electrochemical workstation': {
    tier: 'academic',
    costPerHour: 40,
    alternatives: ['Basic potentiostat'],
    availability: 'common',
  },
  'Potentiostat': {
    tier: 'academic',
    costPerHour: 30,
    alternatives: [],
    availability: 'common',
  },
  'TGA': {
    tier: 'academic',
    costPerHour: 45,
    alternatives: ['External service'],
    availability: 'specialized',
  },
  'DSC': {
    tier: 'academic',
    costPerHour: 45,
    alternatives: ['External service'],
    availability: 'specialized',
  },

  // Advanced equipment
  'Laser system': {
    tier: 'industrial',
    costPerHour: 200,
    alternatives: ['External service'],
    availability: 'rare',
  },
  'Sputtering system': {
    tier: 'industrial',
    costPerHour: 150,
    alternatives: ['Thermal evaporation', 'External service'],
    availability: 'specialized',
  },
  'Thermal evaporator': {
    tier: 'academic',
    costPerHour: 80,
    alternatives: ['Sputtering', 'Wet chemical deposition'],
    availability: 'specialized',
  },
  'CVD': {
    tier: 'industrial',
    costPerHour: 200,
    alternatives: ['Wet chemical synthesis', 'External service'],
    availability: 'rare',
  },
  'ALD': {
    tier: 'industrial',
    costPerHour: 250,
    alternatives: ['CVD', 'External service'],
    availability: 'rare',
  },
  'Plasma etcher': {
    tier: 'industrial',
    costPerHour: 100,
    alternatives: ['Wet etching (different results)'],
    availability: 'specialized',
  },
}

// ============================================================================
// Validation Function
// ============================================================================

export async function validateEquipmentFeasibility(
  equipment: string[]
): Promise<ProtocolValidation['equipmentFeasibility']> {
  let highestTier: 'academic' | 'industrial' | 'pilot' = 'academic'
  const available: string[] = []
  const unavailable: string[] = []
  const alternatives: Record<string, string[]> = {}
  let estimatedAccessCost = 0

  for (const eq of equipment) {
    const dbEntry = findEquipment(eq)

    if (dbEntry) {
      available.push(eq)
      estimatedAccessCost += dbEntry.costPerHour * 2 // Assume 2 hours average use

      // Track highest tier needed
      if (dbEntry.tier === 'pilot') {
        highestTier = 'pilot'
      } else if (dbEntry.tier === 'industrial' && highestTier !== 'pilot') {
        highestTier = 'industrial'
      }

      // Add alternatives if available
      if (dbEntry.alternatives.length > 0) {
        alternatives[eq] = dbEntry.alternatives
      }
    } else {
      // Equipment not in database - assume unavailable
      unavailable.push(eq)
      alternatives[eq] = ['Contact facility manager', 'External service']
    }
  }

  return {
    tier: highestTier,
    available,
    unavailable,
    alternatives,
    estimatedAccessCost,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function findEquipment(equipmentName: string): EquipmentData | null {
  // Try exact match
  if (EQUIPMENT_DATABASE[equipmentName]) {
    return EQUIPMENT_DATABASE[equipmentName]
  }

  // Try case-insensitive match
  const lowerName = equipmentName.toLowerCase()
  for (const [key, value] of Object.entries(EQUIPMENT_DATABASE)) {
    if (key.toLowerCase() === lowerName) {
      return value
    }
  }

  // Try partial match
  for (const [key, value] of Object.entries(EQUIPMENT_DATABASE)) {
    if (
      lowerName.includes(key.toLowerCase()) ||
      key.toLowerCase().includes(lowerName)
    ) {
      return value
    }
  }

  return null
}
