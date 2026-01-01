/**
 * Simulations Import API
 *
 * POST /api/simulations/import
 *
 * Validates and processes an ExergyExperimentFile for use in simulations.
 * Returns the validated file with any necessary transformations.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  validateExergyExperimentFile,
  validatePartialExperimentFile,
} from '@/lib/validation/exergy-experiment'
import type { ExergyExperimentFile, SimulationSuggestion } from '@/types/exergy-experiment'
import type {
  SimulationConfig,
  SimulationTier,
  SimulationDomain,
  SimulationParameter as SimConfigParameter,
} from '@/types/simulation'

// ============================================================================
// Request/Response Types
// ============================================================================

interface ImportRequest {
  file: ExergyExperimentFile | string // JSON object or stringified JSON
  validateOnly?: boolean // Just validate without processing
  overrideSimulationParams?: Partial<SimulationSuggestion>
}

/**
 * Extended simulation config with experiment-specific fields
 */
interface ExtendedSimulationConfig extends SimulationConfig {
  simulationType?: string
  domain?: SimulationDomain
  boundaryConditions?: Record<string, { type: string; value: number; unit: string }>
  expectedOutputs?: Array<{ name: string; unit: string; expectedRange: [number, number] }>
  experimentSource?: { id: string; title: string; importedAt: string }
  materials?: Array<{ name: string; quantity: string; unit: string }>
  equipment?: string[]
  estimatedCost?: number
}

interface ImportResponse {
  success: boolean
  valid: boolean
  file?: ExergyExperimentFile
  simulationConfig?: ExtendedSimulationConfig
  errors?: Array<{ path: string; message: string; code: string }>
  warnings?: Array<{ path: string; message: string; suggestion?: string }>
  error?: string
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert ExergyExperimentFile to SimulationConfig
 */
function convertToSimulationConfig(file: ExergyExperimentFile): ExtendedSimulationConfig {
  const { metadata, protocol, simulation } = file

  // Map simulation tier
  const tierMap: Record<string, SimulationTier> = {
    tier1: 'local',
    tier2: 'browser',
    tier3: 'cloud',
  }

  // Build parameters array from simulation suggestion
  const parameters: SimConfigParameter[] = simulation.parameters.map((param) => ({
    name: param.name,
    value: param.value,
    unit: param.unit,
    description: param.description,
  }))

  // Build boundary conditions
  const boundaryConditions: Record<string, { type: string; value: number; unit: string }> = {}
  for (const bc of simulation.boundaryConditions) {
    boundaryConditions[bc.name] = {
      type: bc.type,
      value: bc.value,
      unit: bc.unit,
    }
  }

  return {
    tier: tierMap[simulation.suggestedTier] || 'local',
    experimentId: metadata.id,
    title: metadata.title,
    description: metadata.description,
    parameters,
    duration: simulation.estimatedDuration,
    // Extended fields
    domain: metadata.domain,
    simulationType: simulation.suggestedType,
    boundaryConditions,
    expectedOutputs: simulation.expectedOutputs.map((eo) => ({
      name: eo.name,
      unit: eo.unit,
      expectedRange: eo.expectedRange,
    })),
    experimentSource: {
      id: metadata.id,
      title: metadata.title,
      importedAt: new Date().toISOString(),
    },
    materials: protocol.materials.map((m) => ({
      name: m.name,
      quantity: m.quantity,
      unit: m.unit,
    })),
    equipment: protocol.equipment,
    estimatedCost: simulation.estimatedCost,
  }
}

/**
 * Apply parameter overrides to the experiment file
 */
function applyOverrides(
  file: ExergyExperimentFile,
  overrides: Partial<SimulationSuggestion>
): ExergyExperimentFile {
  return {
    ...file,
    simulation: {
      ...file.simulation,
      ...overrides,
      parameters: overrides.parameters || file.simulation.parameters,
      boundaryConditions: overrides.boundaryConditions || file.simulation.boundaryConditions,
      expectedOutputs: overrides.expectedOutputs || file.simulation.expectedOutputs,
    },
  }
}

// ============================================================================
// API Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<ImportResponse>> {
  try {
    const body = (await request.json()) as ImportRequest
    const { file, validateOnly = false, overrideSimulationParams } = body

    // Parse file if it's a string
    let parsedFile: unknown
    if (typeof file === 'string') {
      try {
        parsedFile = JSON.parse(file)
      } catch {
        return NextResponse.json(
          {
            success: false,
            valid: false,
            error: 'Invalid JSON format',
          },
          { status: 400 }
        )
      }
    } else {
      parsedFile = file
    }

    // Validate the file
    const validation = validateExergyExperimentFile(parsedFile)

    if (!validation.valid || !validation.parsedFile) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          errors: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 }
      )
    }

    // If validateOnly, return early
    if (validateOnly) {
      return NextResponse.json({
        success: true,
        valid: true,
        warnings: validation.warnings,
      })
    }

    // Apply any parameter overrides
    let processedFile = validation.parsedFile
    if (overrideSimulationParams) {
      processedFile = applyOverrides(processedFile, overrideSimulationParams)
    }

    // Convert to simulation config
    const simulationConfig = convertToSimulationConfig(processedFile)

    return NextResponse.json({
      success: true,
      valid: true,
      file: processedFile,
      simulationConfig,
      warnings: validation.warnings,
    })
  } catch (error) {
    console.error('Import failed:', error)
    return NextResponse.json(
      {
        success: false,
        valid: false,
        error: error instanceof Error ? error.message : 'Import failed',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/simulations/import
 * Returns information about the import API
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    description: 'Simulations Import API',
    supportedFormats: ['.exergy-experiment.json'],
    fileVersion: '1.0.0',
    endpoints: {
      POST: {
        description: 'Import and validate an experiment file for simulation',
        body: {
          file: 'ExergyExperimentFile | string (required) - The experiment file to import',
          validateOnly: 'boolean (optional, default: false) - Only validate without processing',
          overrideSimulationParams:
            'Partial<SimulationSuggestion> (optional) - Override AI-suggested parameters',
        },
        returns: {
          success: 'boolean',
          valid: 'boolean',
          file: 'ExergyExperimentFile (if successful)',
          simulationConfig: 'SimulationConfig (ready for execution)',
          errors: 'Array (if invalid)',
          warnings: 'Array (optional)',
        },
      },
    },
  })
}
