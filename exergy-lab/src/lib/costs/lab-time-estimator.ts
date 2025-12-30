/**
 * Lab Time Estimator (v0.0.5)
 *
 * Estimates laboratory time requirements for experimental protocols.
 * Considers equipment, skill level, safety requirements, and documentation.
 *
 * @see lib/costs/material-database.ts - Material costs
 * @see lib/costs/regional-factors.ts - Regional adjustments
 */

// ============================================================================
// Types
// ============================================================================

export type SkillLevel = 'undergraduate' | 'graduate' | 'postdoc' | 'expert'

export type SafetyLevel = 'minimal' | 'standard' | 'elevated' | 'high'

export type EquipmentComplexity = 'basic' | 'intermediate' | 'advanced' | 'specialized'

export interface ExperimentStep {
  id: string
  name: string
  description: string
  category: StepCategory
  baseTimeMinutes: number
  equipment?: string[]
  hazards?: string[]
  notes?: string
}

export type StepCategory =
  | 'preparation'
  | 'synthesis'
  | 'characterization'
  | 'measurement'
  | 'processing'
  | 'cleanup'
  | 'documentation'
  | 'waiting'

export interface LabTimeEstimate {
  setupTime: number
  executionTime: number
  cleanupTime: number
  documentationTime: number
  totalTime: number
  unit: 'hours'
  breakdown: StepTimeBreakdown[]
  recommendations: string[]
  laborCost?: number
}

export interface StepTimeBreakdown {
  stepId: string
  stepName: string
  category: StepCategory
  baseTime: number
  adjustedTime: number
  adjustmentFactors: Record<string, number>
}

export interface EstimationOptions {
  skillLevel: SkillLevel
  safetyLevel: SafetyLevel
  equipmentAvailability: number // 0-1, 1 = all equipment available
  includeDocumentation: boolean
  includeReplicates: number
  contingencyPercent: number
  laborRate?: number // $/hour
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Time multipliers based on skill level
 * Expert = 1.0 (baseline), less experienced = slower
 */
const SKILL_MULTIPLIERS: Record<SkillLevel, number> = {
  undergraduate: 2.0,
  graduate: 1.4,
  postdoc: 1.1,
  expert: 1.0,
}

/**
 * Time additions for safety protocols (minutes per step)
 */
const SAFETY_OVERHEAD: Record<SafetyLevel, number> = {
  minimal: 0,
  standard: 5,
  elevated: 15,
  high: 30,
}

/**
 * Equipment setup time additions (minutes)
 */
const EQUIPMENT_SETUP: Record<EquipmentComplexity, number> = {
  basic: 5,
  intermediate: 15,
  advanced: 30,
  specialized: 60,
}

/**
 * Standard step templates with base times
 */
export const STEP_TEMPLATES: Record<string, Partial<ExperimentStep>> = {
  // Preparation
  weigh_materials: {
    category: 'preparation',
    baseTimeMinutes: 15,
    equipment: ['analytical_balance'],
  },
  prepare_solutions: {
    category: 'preparation',
    baseTimeMinutes: 30,
    equipment: ['balance', 'volumetric_flask'],
  },
  calibrate_equipment: {
    category: 'preparation',
    baseTimeMinutes: 20,
  },
  glovebox_entry: {
    category: 'preparation',
    baseTimeMinutes: 15,
    equipment: ['glovebox'],
    hazards: ['inert_atmosphere'],
  },

  // Synthesis
  spin_coating: {
    category: 'synthesis',
    baseTimeMinutes: 20,
    equipment: ['spin_coater'],
  },
  thermal_evaporation: {
    category: 'synthesis',
    baseTimeMinutes: 120,
    equipment: ['evaporator'],
  },
  annealing: {
    category: 'synthesis',
    baseTimeMinutes: 60,
    equipment: ['hotplate', 'furnace'],
  },
  electrodeposition: {
    category: 'synthesis',
    baseTimeMinutes: 60,
    equipment: ['potentiostat'],
  },
  slurry_mixing: {
    category: 'synthesis',
    baseTimeMinutes: 120,
    equipment: ['mixer', 'ball_mill'],
  },
  electrode_coating: {
    category: 'synthesis',
    baseTimeMinutes: 45,
    equipment: ['doctor_blade', 'coater'],
  },
  cell_assembly: {
    category: 'synthesis',
    baseTimeMinutes: 30,
    equipment: ['glovebox', 'crimper'],
    hazards: ['inert_atmosphere'],
  },

  // Characterization
  xrd_measurement: {
    category: 'characterization',
    baseTimeMinutes: 60,
    equipment: ['xrd'],
  },
  sem_imaging: {
    category: 'characterization',
    baseTimeMinutes: 90,
    equipment: ['sem'],
  },
  tem_imaging: {
    category: 'characterization',
    baseTimeMinutes: 180,
    equipment: ['tem'],
  },
  uv_vis_spectroscopy: {
    category: 'characterization',
    baseTimeMinutes: 30,
    equipment: ['uv_vis'],
  },
  ftir_measurement: {
    category: 'characterization',
    baseTimeMinutes: 30,
    equipment: ['ftir'],
  },
  pl_measurement: {
    category: 'characterization',
    baseTimeMinutes: 45,
    equipment: ['pl_spectrometer'],
  },

  // Electrical Measurements
  iv_measurement: {
    category: 'measurement',
    baseTimeMinutes: 20,
    equipment: ['solar_simulator', 'source_meter'],
  },
  eqe_measurement: {
    category: 'measurement',
    baseTimeMinutes: 60,
    equipment: ['eqe_system'],
  },
  impedance_spectroscopy: {
    category: 'measurement',
    baseTimeMinutes: 45,
    equipment: ['potentiostat'],
  },
  cycle_testing: {
    category: 'measurement',
    baseTimeMinutes: 0, // Variable - use waiting time
    notes: 'Duration depends on cycle count and rate',
  },
  capacity_test: {
    category: 'measurement',
    baseTimeMinutes: 240,
    equipment: ['battery_cycler'],
  },

  // Processing
  laser_scribing: {
    category: 'processing',
    baseTimeMinutes: 30,
    equipment: ['laser_scriber'],
  },
  encapsulation: {
    category: 'processing',
    baseTimeMinutes: 60,
    equipment: ['laminator'],
  },
  dicing: {
    category: 'processing',
    baseTimeMinutes: 45,
    equipment: ['dicing_saw'],
  },

  // Cleanup
  standard_cleanup: {
    category: 'cleanup',
    baseTimeMinutes: 30,
  },
  solvent_waste_disposal: {
    category: 'cleanup',
    baseTimeMinutes: 15,
    hazards: ['chemical_waste'],
  },
  equipment_shutdown: {
    category: 'cleanup',
    baseTimeMinutes: 15,
  },

  // Documentation
  data_recording: {
    category: 'documentation',
    baseTimeMinutes: 15,
  },
  photo_documentation: {
    category: 'documentation',
    baseTimeMinutes: 10,
  },
  sample_labeling: {
    category: 'documentation',
    baseTimeMinutes: 5,
  },

  // Waiting/Drying
  drying_ambient: {
    category: 'waiting',
    baseTimeMinutes: 60,
  },
  overnight_treatment: {
    category: 'waiting',
    baseTimeMinutes: 960, // 16 hours
  },
  cooling: {
    category: 'waiting',
    baseTimeMinutes: 60,
  },
}

/**
 * Equipment complexity mapping
 */
const EQUIPMENT_COMPLEXITY: Record<string, EquipmentComplexity> = {
  analytical_balance: 'basic',
  hotplate: 'basic',
  volumetric_flask: 'basic',
  doctor_blade: 'basic',
  spin_coater: 'intermediate',
  uv_vis: 'intermediate',
  ftir: 'intermediate',
  potentiostat: 'intermediate',
  battery_cycler: 'intermediate',
  xrd: 'advanced',
  sem: 'advanced',
  solar_simulator: 'advanced',
  evaporator: 'advanced',
  glovebox: 'advanced',
  tem: 'specialized',
  eqe_system: 'specialized',
  afm: 'specialized',
}

// ============================================================================
// Estimation Functions
// ============================================================================

/**
 * Estimate total lab time for an experiment
 */
export function estimateLabTime(
  steps: ExperimentStep[],
  options: EstimationOptions
): LabTimeEstimate {
  const breakdown: StepTimeBreakdown[] = []
  const recommendations: string[] = []

  let setupTime = 0
  let executionTime = 0
  let cleanupTime = 0
  let documentationTime = 0

  // Calculate time for each step
  for (const step of steps) {
    const factors: Record<string, number> = {}

    // Base time
    let adjustedTime = step.baseTimeMinutes

    // Skill level adjustment
    const skillMultiplier = SKILL_MULTIPLIERS[options.skillLevel]
    factors.skill = skillMultiplier
    adjustedTime *= skillMultiplier

    // Safety overhead
    const safetyOverhead = SAFETY_OVERHEAD[options.safetyLevel]
    if (step.hazards && step.hazards.length > 0) {
      const hazardOverhead = safetyOverhead * step.hazards.length
      factors.safety = 1 + hazardOverhead / step.baseTimeMinutes
      adjustedTime += hazardOverhead
    }

    // Equipment availability
    if (step.equipment && step.equipment.length > 0) {
      // If equipment not fully available, add waiting time
      if (options.equipmentAvailability < 1) {
        const waitFactor = 1 + (1 - options.equipmentAvailability) * 0.5
        factors.availability = waitFactor
        adjustedTime *= waitFactor
      }

      // Add equipment setup time
      let maxSetupTime = 0
      for (const eq of step.equipment) {
        const complexity = EQUIPMENT_COMPLEXITY[eq] || 'intermediate'
        maxSetupTime = Math.max(maxSetupTime, EQUIPMENT_SETUP[complexity])
      }
      adjustedTime += maxSetupTime * skillMultiplier
    }

    // Categorize time
    switch (step.category) {
      case 'preparation':
        setupTime += adjustedTime
        break
      case 'cleanup':
        cleanupTime += adjustedTime
        break
      case 'documentation':
        documentationTime += adjustedTime
        break
      default:
        executionTime += adjustedTime
    }

    breakdown.push({
      stepId: step.id,
      stepName: step.name,
      category: step.category,
      baseTime: step.baseTimeMinutes,
      adjustedTime,
      adjustmentFactors: factors,
    })
  }

  // Add documentation time if requested
  if (options.includeDocumentation) {
    // Estimate 10% of execution time for documentation
    const autoDocTime = executionTime * 0.1
    documentationTime += autoDocTime
  }

  // Apply replicates
  if (options.includeReplicates > 1) {
    // Replicates don't multiply setup time
    const replicateFactor = options.includeReplicates
    executionTime *= replicateFactor
    // Some cleanup is shared
    cleanupTime *= Math.sqrt(replicateFactor)

    recommendations.push(
      `Running ${replicateFactor} replicates - consider parallel processing where possible`
    )
  }

  // Apply contingency
  const contingencyMultiplier = 1 + options.contingencyPercent / 100
  setupTime *= contingencyMultiplier
  executionTime *= contingencyMultiplier
  cleanupTime *= contingencyMultiplier

  // Convert to hours
  setupTime = setupTime / 60
  executionTime = executionTime / 60
  cleanupTime = cleanupTime / 60
  documentationTime = documentationTime / 60

  const totalTime = setupTime + executionTime + cleanupTime + documentationTime

  // Generate recommendations
  if (options.skillLevel === 'undergraduate') {
    recommendations.push('Consider pairing with experienced researcher for first run')
  }

  if (options.safetyLevel === 'high') {
    recommendations.push('Schedule safety officer review before starting')
  }

  const specializedEquipment = steps.some((s) =>
    s.equipment?.some((e) => EQUIPMENT_COMPLEXITY[e] === 'specialized')
  )
  if (specializedEquipment) {
    recommendations.push('Book specialized equipment well in advance')
  }

  // Calculate labor cost if rate provided
  let laborCost: number | undefined
  if (options.laborRate) {
    laborCost = totalTime * options.laborRate
  }

  return {
    setupTime: Math.round(setupTime * 10) / 10,
    executionTime: Math.round(executionTime * 10) / 10,
    cleanupTime: Math.round(cleanupTime * 10) / 10,
    documentationTime: Math.round(documentationTime * 10) / 10,
    totalTime: Math.round(totalTime * 10) / 10,
    unit: 'hours',
    breakdown,
    recommendations,
    laborCost: laborCost ? Math.round(laborCost * 100) / 100 : undefined,
  }
}

/**
 * Create experiment steps from template names
 */
export function createStepsFromTemplates(
  templateNames: string[]
): ExperimentStep[] {
  return templateNames.map((name, index) => {
    const template = STEP_TEMPLATES[name]
    if (!template) {
      return {
        id: `step_${index}`,
        name: name,
        description: `Custom step: ${name}`,
        category: 'processing' as StepCategory,
        baseTimeMinutes: 30, // Default
      }
    }

    return {
      id: `step_${index}_${name}`,
      name: name.replace(/_/g, ' '),
      description: `${name.replace(/_/g, ' ')} step`,
      category: template.category || 'processing',
      baseTimeMinutes: template.baseTimeMinutes || 30,
      equipment: template.equipment,
      hazards: template.hazards,
      notes: template.notes,
    }
  })
}

/**
 * Quick estimate for common experiment types
 */
export function quickEstimate(
  experimentType: string,
  options: Partial<EstimationOptions> = {}
): LabTimeEstimate {
  const defaultOptions: EstimationOptions = {
    skillLevel: 'graduate',
    safetyLevel: 'standard',
    equipmentAvailability: 0.9,
    includeDocumentation: true,
    includeReplicates: 1,
    contingencyPercent: 20,
    ...options,
  }

  // Predefined step sequences for common experiments
  const experimentTemplates: Record<string, string[]> = {
    perovskite_solar_cell: [
      'weigh_materials',
      'prepare_solutions',
      'glovebox_entry',
      'spin_coating',
      'annealing',
      'spin_coating',
      'thermal_evaporation',
      'iv_measurement',
      'eqe_measurement',
      'xrd_measurement',
      'standard_cleanup',
      'data_recording',
    ],
    battery_coin_cell: [
      'weigh_materials',
      'slurry_mixing',
      'electrode_coating',
      'drying_ambient',
      'glovebox_entry',
      'cell_assembly',
      'capacity_test',
      'impedance_spectroscopy',
      'standard_cleanup',
      'data_recording',
    ],
    electrolyzer_mea: [
      'weigh_materials',
      'prepare_solutions',
      'spin_coating',
      'annealing',
      'electrodeposition',
      'sem_imaging',
      'xrd_measurement',
      'impedance_spectroscopy',
      'standard_cleanup',
      'data_recording',
    ],
    thin_film_deposition: [
      'calibrate_equipment',
      'prepare_solutions',
      'spin_coating',
      'annealing',
      'uv_vis_spectroscopy',
      'sem_imaging',
      'standard_cleanup',
      'data_recording',
    ],
  }

  const templateSteps = experimentTemplates[experimentType] || [
    'prepare_solutions',
    'standard_cleanup',
    'data_recording',
  ]

  const steps = createStepsFromTemplates(templateSteps)
  return estimateLabTime(steps, defaultOptions)
}

/**
 * Estimate time for a single characterization technique
 */
export function estimateCharacterizationTime(
  technique: string,
  sampleCount: number,
  skillLevel: SkillLevel = 'graduate'
): { timePerSample: number; totalTime: number; unit: string } {
  const characterizationTimes: Record<string, number> = {
    xrd: 60,
    sem: 45,
    tem: 120,
    afm: 90,
    uv_vis: 15,
    ftir: 20,
    pl: 30,
    iv: 10,
    eqe: 45,
    impedance: 30,
    cyclic_voltammetry: 20,
  }

  const baseTime = characterizationTimes[technique.toLowerCase()] || 30
  const adjustedTime = baseTime * SKILL_MULTIPLIERS[skillLevel]
  const setupTime = 15 * SKILL_MULTIPLIERS[skillLevel]

  const timePerSample = adjustedTime
  const totalTime = setupTime + adjustedTime * sampleCount

  return {
    timePerSample: Math.round(timePerSample),
    totalTime: Math.round(totalTime),
    unit: 'minutes',
  }
}

/**
 * Format time estimate as readable string
 */
export function formatTimeEstimate(estimate: LabTimeEstimate): string {
  const hours = Math.floor(estimate.totalTime)
  const minutes = Math.round((estimate.totalTime - hours) * 60)

  if (hours === 0) {
    return `${minutes} minutes`
  } else if (minutes === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`
  } else {
    return `${hours}h ${minutes}m`
  }
}

/**
 * Calculate working days required
 */
export function calculateWorkingDays(
  estimate: LabTimeEstimate,
  hoursPerDay: number = 8
): number {
  return Math.ceil(estimate.totalTime / hoursPerDay)
}

export default {
  estimateLabTime,
  createStepsFromTemplates,
  quickEstimate,
  estimateCharacterizationTime,
  formatTimeEstimate,
  calculateWorkingDays,
  STEP_TEMPLATES,
}
