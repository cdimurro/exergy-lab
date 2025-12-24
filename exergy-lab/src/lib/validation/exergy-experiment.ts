/**
 * Zod Validation Schema for Exergy Experiment Files
 *
 * Provides comprehensive validation for .exergy-experiment.json files
 * including type checking, range validation, and helpful error messages.
 */

import { z } from 'zod'
import type {
  ExergyExperimentFile,
  ExperimentFileValidation,
} from '@/types/exergy-experiment'

// ============================================================================
// Base Schemas
// ============================================================================

const ExperimentDomainSchema = z.enum([
  'solar',
  'wind',
  'battery',
  'hydrogen',
  'geothermal',
  'biomass',
  'carbon-capture',
  'energy-efficiency',
  'grid-optimization',
  'materials-science',
])

const SimulationTypeSchema = z.enum([
  'thermodynamic',
  'electrochemical',
  'cfd',
  'kinetics',
  'heat-transfer',
  'mass-transfer',
  'materials',
  'optimization',
])

const SimulationTierSchema = z.enum(['tier1', 'tier2', 'tier3'])

const BoundaryConditionTypeSchema = z.enum([
  'dirichlet',
  'neumann',
  'robin',
  'periodic',
])

// ============================================================================
// Experiment Protocol Schemas
// ============================================================================

const MaterialSchema = z.object({
  name: z.string().min(1, 'Material name is required'),
  quantity: z.string().min(1, 'Quantity is required'),
  unit: z.string().min(1, 'Unit is required'),
  specification: z.string().optional(),
  supplier: z.string().optional(),
  cost: z.number().nonnegative().optional(),
})

const ExperimentStepSchema = z.object({
  step: z.number().int().positive(),
  title: z.string().min(1, 'Step title is required'),
  description: z.string().min(1, 'Step description is required'),
  duration: z.string().optional(),
  temperature: z.string().optional(),
  pressure: z.string().optional(),
  safety: z.array(z.string()).optional(),
})

const SafetyLevelSchema = z.enum(['low', 'medium', 'high', 'critical'])

const SafetyWarningSchema = z.object({
  level: SafetyLevelSchema,
  category: z.string().min(1),
  description: z.string().min(1),
  mitigation: z.string().min(1),
})

const FailureFrequencySchema = z.enum(['common', 'occasional', 'rare'])
const FailureImpactSchema = z.enum(['low', 'medium', 'high', 'critical'])

const FailureModeSchema = z.object({
  description: z.string().min(1),
  frequency: FailureFrequencySchema,
  impact: FailureImpactSchema,
  causes: z.array(z.string()),
  preventions: z.array(z.string()),
  similarExperiments: z.array(z.string()).optional(),
})

// ============================================================================
// Simulation Schemas
// ============================================================================

const SimulationParameterSchema = z.object({
  name: z.string().min(1, 'Parameter name is required'),
  value: z.number(),
  unit: z.string().min(1, 'Unit is required'),
  description: z.string().optional(),
  uncertainty: z.number().min(0).max(100).optional(),
  range: z
    .object({
      min: z.number(),
      max: z.number(),
    })
    .optional()
    .refine((range) => !range || range.min <= range.max, {
      message: 'Range min must be less than or equal to max',
    }),
})

const BoundaryConditionSchema = z.object({
  name: z.string().min(1),
  type: BoundaryConditionTypeSchema,
  value: z.number(),
  unit: z.string().min(1),
  location: z.string().optional(),
})

const ExpectedOutputSchema = z.object({
  name: z.string().min(1),
  expectedValue: z.number().optional(),
  expectedRange: z.tuple([z.number(), z.number()]).refine(
    ([min, max]) => min <= max,
    { message: 'Expected range min must be less than or equal to max' }
  ),
  unit: z.string().min(1),
  description: z.string().optional(),
  tolerance: z.number().nonnegative().optional(),
})

// ============================================================================
// Main File Schemas
// ============================================================================

const ExperimentMetadataSchema = z.object({
  id: z.string().uuid('Invalid experiment ID format'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  createdAt: z.string().datetime({ message: 'Invalid date format' }),
  updatedAt: z.string().datetime().optional(),
  domain: ExperimentDomainSchema,
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description too long'),
  author: z.string().optional(),
  organization: z.string().optional(),
  tags: z.array(z.string()).optional(),
  version: z.string().optional(),
})

const ExperimentProtocolDataSchema = z.object({
  materials: z.array(MaterialSchema),
  equipment: z.array(z.string()),
  steps: z.array(ExperimentStepSchema),
  safetyWarnings: z.array(SafetyWarningSchema),
  expectedResults: z.string(),
  estimatedDuration: z.string(),
  estimatedCost: z.number().nonnegative().optional(),
})

const FailureAnalysisDataSchema = z.object({
  potentialFailures: z.array(FailureModeSchema),
  riskScore: z.number().min(0).max(100),
  recommendations: z.array(z.string()),
})

const SimulationSuggestionSchema = z.object({
  suggestedType: SimulationTypeSchema,
  suggestedTier: SimulationTierSchema,
  parameters: z.array(SimulationParameterSchema),
  boundaryConditions: z.array(BoundaryConditionSchema),
  expectedOutputs: z.array(ExpectedOutputSchema),
  reasoning: z.string(),
  confidence: z.number().min(0).max(100),
  alternativeTypes: z.array(SimulationTypeSchema).optional(),
  estimatedCost: z.number().nonnegative().optional(),
  estimatedDuration: z.number().nonnegative().optional(),
})

/**
 * Complete Exergy Experiment File Schema
 */
export const ExergyExperimentFileSchema = z.object({
  version: z.literal('1.0.0'),
  metadata: ExperimentMetadataSchema,
  protocol: ExperimentProtocolDataSchema,
  failureAnalysis: FailureAnalysisDataSchema,
  simulation: SimulationSuggestionSchema,
})

/**
 * Partial schema for import preview (only requires minimal fields)
 */
export const PartialExergyExperimentFileSchema = z.object({
  version: z.literal('1.0.0'),
  metadata: z.object({
    id: z.string(),
    title: z.string(),
    domain: ExperimentDomainSchema,
    createdAt: z.string().optional(),
    description: z.string().optional(),
  }),
  protocol: ExperimentProtocolDataSchema.partial().optional(),
  failureAnalysis: FailureAnalysisDataSchema.partial().optional(),
  simulation: SimulationSuggestionSchema.partial().optional(),
})

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates an experiment file and returns detailed results
 */
export function validateExergyExperimentFile(
  data: unknown
): ExperimentFileValidation {
  const result = ExergyExperimentFileSchema.safeParse(data)

  if (result.success) {
    // Additional semantic validations
    const warnings = getSemanticWarnings(result.data)

    return {
      valid: true,
      errors: [],
      warnings,
      parsedFile: result.data,
    }
  }

  // Convert Zod errors to our format
  const errors = result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }))

  return {
    valid: false,
    errors,
    warnings: [],
  }
}

/**
 * Performs quick validation for import preview
 */
export function validatePartialExperimentFile(
  data: unknown
): { valid: boolean; error?: string } {
  const result = PartialExergyExperimentFileSchema.safeParse(data)

  if (result.success) {
    return { valid: true }
  }

  return {
    valid: false,
    error: result.error.issues[0]?.message || 'Invalid file format',
  }
}

/**
 * Checks semantic validity beyond schema validation
 */
function getSemanticWarnings(
  file: ExergyExperimentFile
): ExperimentFileValidation['warnings'] {
  const warnings: ExperimentFileValidation['warnings'] = []

  // Check for empty protocol
  if (file.protocol.steps.length === 0) {
    warnings.push({
      path: 'protocol.steps',
      message: 'No experiment steps defined',
      suggestion: 'Add at least one step to define the experiment procedure',
    })
  }

  // Check for missing materials
  if (file.protocol.materials.length === 0) {
    warnings.push({
      path: 'protocol.materials',
      message: 'No materials specified',
      suggestion: 'Add materials required for the experiment',
    })
  }

  // Check for low confidence simulation suggestions
  if (file.simulation.confidence < 50) {
    warnings.push({
      path: 'simulation.confidence',
      message: `Low confidence (${file.simulation.confidence}%) in simulation suggestions`,
      suggestion:
        'Review and adjust simulation parameters manually before running',
    })
  }

  // Check for missing safety warnings on high-risk experiments
  if (
    file.failureAnalysis.riskScore > 70 &&
    file.protocol.safetyWarnings.length === 0
  ) {
    warnings.push({
      path: 'protocol.safetyWarnings',
      message: 'High risk score but no safety warnings defined',
      suggestion: 'Add safety warnings to address identified risks',
    })
  }

  // Check for missing boundary conditions on CFD simulations
  if (
    file.simulation.suggestedType === 'cfd' &&
    file.simulation.boundaryConditions.length === 0
  ) {
    warnings.push({
      path: 'simulation.boundaryConditions',
      message: 'CFD simulation requires boundary conditions',
      suggestion: 'Define inlet, outlet, and wall boundary conditions',
    })
  }

  // Check for unrealistic parameter values
  file.simulation.parameters.forEach((param, idx) => {
    if (param.range && (param.value < param.range.min || param.value > param.range.max)) {
      warnings.push({
        path: `simulation.parameters[${idx}].value`,
        message: `Parameter "${param.name}" value (${param.value}) is outside its defined range`,
        suggestion: `Adjust value to be within ${param.range.min} - ${param.range.max}`,
      })
    }
  })

  return warnings
}

/**
 * Validates file content from a JSON string
 */
export function validateExperimentFileString(
  jsonString: string
): ExperimentFileValidation {
  try {
    const parsed = JSON.parse(jsonString)
    return validateExergyExperimentFile(parsed)
  } catch {
    return {
      valid: false,
      errors: [
        {
          path: '',
          message: 'Invalid JSON format',
          code: 'invalid_json',
        },
      ],
      warnings: [],
    }
  }
}

/**
 * Validates a File object (for drag-and-drop uploads)
 */
export async function validateExperimentFileUpload(
  file: File
): Promise<ExperimentFileValidation> {
  // Check file extension
  if (!file.name.endsWith('.json') && !file.name.endsWith('.exergy-experiment.json')) {
    return {
      valid: false,
      errors: [
        {
          path: '',
          message: 'File must be a .json or .exergy-experiment.json file',
          code: 'invalid_extension',
        },
      ],
      warnings: [],
    }
  }

  // Check file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return {
      valid: false,
      errors: [
        {
          path: '',
          message: 'File size exceeds 5MB limit',
          code: 'file_too_large',
        },
      ],
      warnings: [],
    }
  }

  try {
    const text = await file.text()
    return validateExperimentFileString(text)
  } catch {
    return {
      valid: false,
      errors: [
        {
          path: '',
          message: 'Failed to read file',
          code: 'read_error',
        },
      ],
      warnings: [],
    }
  }
}

// ============================================================================
// Export Individual Schemas for Reuse
// ============================================================================

export {
  ExperimentDomainSchema,
  SimulationTypeSchema,
  SimulationTierSchema,
  MaterialSchema,
  ExperimentStepSchema,
  SafetyWarningSchema,
  FailureModeSchema,
  SimulationParameterSchema,
  BoundaryConditionSchema,
  ExpectedOutputSchema,
  ExperimentMetadataSchema,
  ExperimentProtocolDataSchema,
  FailureAnalysisDataSchema,
  SimulationSuggestionSchema,
}
