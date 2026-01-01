/**
 * Materials Safety Validator
 *
 * Validates material safety using MSDS database with GHS classification.
 * Checks for hazards, incompatibilities, and required PPE.
 */

import type { Material } from '@/types/experiment-workflow'
import type { ProtocolValidation, MaterialHazard, Incompatibility } from '@/types/experiment-workflow'

// ============================================================================
// Mock MSDS Database (MVP - Later integrate PubChem/NIOSH API)
// ============================================================================

interface MSDSData {
  hazardClass: 'low' | 'medium' | 'high' | 'critical'
  ghsPictograms: string[]
  handlingRequirements: string[]
  storageRequirements: string
  disposalRequirements: string
  requiredPPE: string[]
  incompatibleWith?: string[]
}

const MSDS_DATABASE: Record<string, MSDSData> = {
  // Perovskite solar cell materials
  'Lead iodide': {
    hazardClass: 'high',
    ghsPictograms: ['GHS06', 'GHS08'],
    handlingRequirements: ['Use in fume hood', 'Wear nitrile gloves', 'Avoid dust generation'],
    storageRequirements: 'Store in cool, dry place away from oxidizers',
    disposalRequirements: 'Dispose as hazardous waste - heavy metal',
    requiredPPE: ['Safety glasses', 'Lab coat', 'Nitrile gloves', 'Fume hood'],
    incompatibleWith: ['Strong oxidizers', 'Strong acids'],
  },
  'PbI2': {
    hazardClass: 'high',
    ghsPictograms: ['GHS06', 'GHS08'],
    handlingRequirements: ['Use in fume hood', 'Wear nitrile gloves', 'Avoid dust generation'],
    storageRequirements: 'Store in cool, dry place away from oxidizers',
    disposalRequirements: 'Dispose as hazardous waste - heavy metal',
    requiredPPE: ['Safety glasses', 'Lab coat', 'Nitrile gloves', 'Fume hood'],
    incompatibleWith: ['Strong oxidizers', 'Strong acids'],
  },
  'Methylammonium iodide': {
    hazardClass: 'medium',
    ghsPictograms: ['GHS07'],
    handlingRequirements: ['Use in inert atmosphere', 'Moisture sensitive'],
    storageRequirements: 'Store under inert gas (nitrogen or argon), moisture-free',
    disposalRequirements: 'Neutralize and dispose as chemical waste',
    requiredPPE: ['Safety glasses', 'Lab coat', 'Gloves', 'Glovebox recommended'],
  },
  'MAI': {
    hazardClass: 'medium',
    ghsPictograms: ['GHS07'],
    handlingRequirements: ['Use in inert atmosphere', 'Moisture sensitive'],
    storageRequirements: 'Store under inert gas (nitrogen or argon), moisture-free',
    disposalRequirements: 'Neutralize and dispose as chemical waste',
    requiredPPE: ['Safety glasses', 'Lab coat', 'Gloves', 'Glovebox recommended'],
  },
  'DMF': {
    hazardClass: 'medium',
    ghsPictograms: ['GHS07', 'GHS08'],
    handlingRequirements: ['Use in fume hood', 'Avoid skin contact', 'Hepatotoxic'],
    storageRequirements: 'Store in cool, well-ventilated area',
    disposalRequirements: 'Dispose as organic solvent waste',
    requiredPPE: ['Safety glasses', 'Lab coat', 'Nitrile gloves', 'Fume hood'],
    incompatibleWith: ['Strong oxidizers', 'Strong bases'],
  },
  'DMSO': {
    hazardClass: 'low',
    ghsPictograms: ['GHS07'],
    handlingRequirements: ['Can penetrate skin', 'Use gloves'],
    storageRequirements: 'Store at room temperature',
    disposalRequirements: 'Dispose as organic solvent waste',
    requiredPPE: ['Safety glasses', 'Lab coat', 'Gloves'],
  },
  'Isopropanol': {
    hazardClass: 'medium',
    ghsPictograms: ['GHS02', 'GHS07'],
    handlingRequirements: ['Flammable', 'Use away from ignition sources'],
    storageRequirements: 'Store in flammables cabinet',
    disposalRequirements: 'Dispose as organic solvent waste',
    requiredPPE: ['Safety glasses', 'Lab coat', 'Gloves'],
    incompatibleWith: ['Strong oxidizers'],
  },
  'Chlorobenzene': {
    hazardClass: 'medium',
    ghsPictograms: ['GHS02', 'GHS07', 'GHS09'],
    handlingRequirements: ['Flammable', 'Use in fume hood', 'Toxic to aquatic life'],
    storageRequirements: 'Store in cool, ventilated area',
    disposalRequirements: 'Dispose as halogenated organic waste',
    requiredPPE: ['Safety glasses', 'Lab coat', 'Nitrile gloves', 'Fume hood'],
    incompatibleWith: ['Strong oxidizers', 'Strong bases'],
  },
  'Spiro-OMeTAD': {
    hazardClass: 'low',
    ghsPictograms: ['GHS07'],
    handlingRequirements: ['Hygroscopic', 'Handle in dry environment'],
    storageRequirements: 'Store in desiccator under inert atmosphere',
    disposalRequirements: 'Dispose as organic chemical waste',
    requiredPPE: ['Safety glasses', 'Lab coat', 'Gloves'],
  },
  'Titanium dioxide': {
    hazardClass: 'low',
    ghsPictograms: [],
    handlingRequirements: ['Avoid dust inhalation'],
    storageRequirements: 'Store in closed container',
    disposalRequirements: 'Dispose as solid waste',
    requiredPPE: ['Safety glasses', 'Lab coat', 'Dust mask if powder'],
  },
  'TiO2': {
    hazardClass: 'low',
    ghsPictograms: [],
    handlingRequirements: ['Avoid dust inhalation'],
    storageRequirements: 'Store in closed container',
    disposalRequirements: 'Dispose as solid waste',
    requiredPPE: ['Safety glasses', 'Lab coat', 'Dust mask if powder'],
  },
  'Gold': {
    hazardClass: 'low',
    ghsPictograms: [],
    handlingRequirements: ['Inert metal'],
    storageRequirements: 'Store in secure location',
    disposalRequirements: 'Recycle precious metal',
    requiredPPE: ['Safety glasses', 'Lab coat'],
  },
  'Silver': {
    hazardClass: 'low',
    ghsPictograms: [],
    handlingRequirements: ['Inert metal'],
    storageRequirements: 'Store in secure location',
    disposalRequirements: 'Recycle precious metal',
    requiredPPE: ['Safety glasses', 'Lab coat'],
  },
  'Acetonitrile': {
    hazardClass: 'medium',
    ghsPictograms: ['GHS02', 'GHS07'],
    handlingRequirements: ['Flammable', 'Use in fume hood', 'Toxic by inhalation'],
    storageRequirements: 'Store in flammables cabinet',
    disposalRequirements: 'Dispose as organic solvent waste',
    requiredPPE: ['Safety glasses', 'Lab coat', 'Nitrile gloves', 'Fume hood'],
    incompatibleWith: ['Strong oxidizers', 'Strong acids'],
  },
  'Ethanol': {
    hazardClass: 'low',
    ghsPictograms: ['GHS02'],
    handlingRequirements: ['Flammable', 'Use away from ignition sources'],
    storageRequirements: 'Store in flammables cabinet',
    disposalRequirements: 'Dispose as organic solvent waste',
    requiredPPE: ['Safety glasses', 'Lab coat'],
    incompatibleWith: ['Strong oxidizers'],
  },
  'Toluene': {
    hazardClass: 'medium',
    ghsPictograms: ['GHS02', 'GHS07', 'GHS08'],
    handlingRequirements: ['Flammable', 'Use in fume hood', 'Reproductive hazard'],
    storageRequirements: 'Store in flammables cabinet',
    disposalRequirements: 'Dispose as organic solvent waste',
    requiredPPE: ['Safety glasses', 'Lab coat', 'Nitrile gloves', 'Fume hood'],
    incompatibleWith: ['Strong oxidizers'],
  },
}

// ============================================================================
// Known Incompatibilities
// ============================================================================

const INCOMPATIBILITY_MATRIX: Array<{
  material1: string
  material2: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  reaction: string
  mitigation: string
}> = [
  {
    material1: 'Lead iodide',
    material2: 'Strong acids',
    riskLevel: 'high',
    reaction: 'May release toxic hydrogen iodide gas',
    mitigation: 'Keep acids separate, use fume hood if both present',
  },
  {
    material1: 'DMF',
    material2: 'Strong bases',
    riskLevel: 'medium',
    reaction: 'Exothermic decomposition',
    mitigation: 'Add base slowly with cooling if needed',
  },
]

// ============================================================================
// Validation Function
// ============================================================================

export async function validateMaterialsSafety(
  materials: Material[]
): Promise<ProtocolValidation['materialSafety']> {
  const hazards: MaterialHazard[] = []
  const incompatibilities: Incompatibility[] = []
  const requiredPPE = new Set<string>()

  // Check each material
  for (const material of materials) {
    const msdsData = getMSDSData(material.name)

    if (msdsData) {
      // Add hazard info
      hazards.push({
        material: material.name,
        hazardClass: msdsData.hazardClass,
        ghsPictograms: msdsData.ghsPictograms,
        handlingRequirements: msdsData.handlingRequirements,
        storageRequirements: msdsData.storageRequirements,
        disposalRequirements: msdsData.disposalRequirements,
        requiredPPE: msdsData.requiredPPE,
      })

      // Collect all required PPE
      msdsData.requiredPPE.forEach((ppe) => requiredPPE.add(ppe))
    } else {
      // Unknown material - flag for manual review
      hazards.push({
        material: material.name,
        hazardClass: 'medium',
        ghsPictograms: [],
        handlingRequirements: ['MSDS not available - manual review required'],
        storageRequirements: 'Consult supplier SDS',
        disposalRequirements: 'Consult supplier SDS',
        requiredPPE: ['Safety glasses', 'Lab coat', 'Gloves'],
      })
      requiredPPE.add('Safety glasses')
      requiredPPE.add('Lab coat')
      requiredPPE.add('Gloves')
    }
  }

  // Check for incompatibilities
  for (let i = 0; i < materials.length; i++) {
    for (let j = i + 1; j < materials.length; j++) {
      const incompatibility = checkIncompatibility(materials[i].name, materials[j].name)
      if (incompatibility) {
        incompatibilities.push(incompatibility)
      }
    }
  }

  return {
    allChecked: true,
    hazards,
    incompatibilities,
    requiredPPE: Array.from(requiredPPE),
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getMSDSData(materialName: string): MSDSData | null {
  // Try exact match first
  if (MSDS_DATABASE[materialName]) {
    return MSDS_DATABASE[materialName]
  }

  // Try case-insensitive match
  const lowerName = materialName.toLowerCase()
  for (const [key, value] of Object.entries(MSDS_DATABASE)) {
    if (key.toLowerCase() === lowerName) {
      return value
    }
  }

  // Try partial match (e.g., "Lead(II) iodide" matches "Lead iodide")
  for (const [key, value] of Object.entries(MSDS_DATABASE)) {
    if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
      return value
    }
  }

  return null
}

function checkIncompatibility(material1: string, material2: string): Incompatibility | null {
  // Check explicit incompatibility matrix
  for (const entry of INCOMPATIBILITY_MATRIX) {
    if (
      (entry.material1.toLowerCase() === material1.toLowerCase() &&
        entry.material2.toLowerCase() === material2.toLowerCase()) ||
      (entry.material1.toLowerCase() === material2.toLowerCase() &&
        entry.material2.toLowerCase() === material1.toLowerCase())
    ) {
      return {
        material1,
        material2,
        riskLevel: entry.riskLevel,
        reaction: entry.reaction,
        mitigation: entry.mitigation,
      }
    }
  }

  // Check if materials list incompatible classes in their MSDS data
  const msds1 = getMSDSData(material1)
  const msds2 = getMSDSData(material2)

  if (msds1?.incompatibleWith && msds2) {
    // Check if material2 matches any incompatible class for material1
    for (const incompatibleClass of msds1.incompatibleWith) {
      if (material2.toLowerCase().includes(incompatibleClass.toLowerCase())) {
        return {
          material1,
          material2,
          riskLevel: 'medium',
          reaction: `${material1} is incompatible with ${incompatibleClass}`,
          mitigation: 'Store separately and use appropriate handling procedures',
        }
      }
    }
  }

  if (msds2?.incompatibleWith && msds1) {
    // Check if material1 matches any incompatible class for material2
    for (const incompatibleClass of msds2.incompatibleWith) {
      if (material1.toLowerCase().includes(incompatibleClass.toLowerCase())) {
        return {
          material1,
          material2,
          riskLevel: 'medium',
          reaction: `${material2} is incompatible with ${incompatibleClass}`,
          mitigation: 'Store separately and use appropriate handling procedures',
        }
      }
    }
  }

  return null
}
