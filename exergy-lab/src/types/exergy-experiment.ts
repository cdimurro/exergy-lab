/**
 * Exergy Experiment File Format (v1.0.0)
 *
 * This file format enables interoperability between the Experiments Designer
 * and Simulations pages. Experiments can be exported as .exergy-experiment.json
 * files and imported into the Simulations page for virtual validation.
 *
 * @version 1.0.0
 */

import type { Material, ExperimentStep, SafetyWarning, FailureMode } from './experiment'
import type { SimulationType, SimulationTier, BoundaryCondition } from '@/lib/simulation/types'

/**
 * Domain categories for clean energy experiments
 */
export type ExperimentDomain =
  | 'solar'
  | 'wind'
  | 'battery'
  | 'hydrogen'
  | 'geothermal'
  | 'biomass'
  | 'carbon-capture'
  | 'energy-efficiency'
  | 'grid-optimization'
  | 'materials-science'

/**
 * Simulation parameter with uncertainty bounds
 */
export interface SimulationParameter {
  name: string
  value: number
  unit: string
  description?: string
  uncertainty?: number // Percentage uncertainty (e.g., 5 for ±5%)
  range?: {
    min: number
    max: number
  }
}

/**
 * Expected output from simulation
 */
export interface ExpectedOutput {
  name: string
  expectedValue?: number
  expectedRange: [number, number]
  unit: string
  description?: string
  tolerance?: number // Acceptable deviation from expected
}

/**
 * AI-generated simulation configuration
 */
export interface SimulationSuggestion {
  suggestedType: SimulationType
  suggestedTier: SimulationTier
  parameters: SimulationParameter[]
  boundaryConditions: BoundaryCondition[]
  expectedOutputs: ExpectedOutput[]
  reasoning: string // AI explanation of why these params were suggested
  confidence: number // 0-100 confidence score
  alternativeTypes?: SimulationType[] // Other simulation types that could work
  estimatedCost?: number // Estimated cost in USD
  estimatedDuration?: number // Estimated duration in seconds
}

/**
 * Protocol section of the experiment file
 */
export interface ExperimentProtocolData {
  materials: Material[]
  equipment: string[]
  steps: ExperimentStep[]
  safetyWarnings: SafetyWarning[]
  expectedResults: string
  estimatedDuration: string
  estimatedCost?: number
}

/**
 * Failure analysis section
 */
export interface FailureAnalysisData {
  potentialFailures: FailureMode[]
  riskScore: number // 0-100
  recommendations: string[]
}

/**
 * Metadata for the experiment file
 */
export interface ExperimentMetadata {
  id: string
  title: string
  createdAt: string // ISO 8601 date string
  updatedAt?: string
  domain: ExperimentDomain
  description: string
  author?: string
  organization?: string
  tags?: string[]
  version?: string // User-defined version for the experiment
}

/**
 * Main Exergy Experiment File interface
 *
 * This is the complete structure of a .exergy-experiment.json file
 */
export interface ExergyExperimentFile {
  /**
   * File format version - always '1.0.0' for this version
   */
  version: '1.0.0'

  /**
   * Experiment metadata
   */
  metadata: ExperimentMetadata

  /**
   * Full experiment protocol with materials, steps, and safety
   */
  protocol: ExperimentProtocolData

  /**
   * Failure mode and risk analysis
   */
  failureAnalysis: FailureAnalysisData

  /**
   * AI-suggested simulation configuration
   */
  simulation: SimulationSuggestion
}

/**
 * Partial experiment file for import preview
 * Used when validating files before full import
 */
export type PartialExergyExperimentFile = Partial<ExergyExperimentFile> & {
  version: '1.0.0'
  metadata: Pick<ExperimentMetadata, 'id' | 'title' | 'domain'>
}

/**
 * Validation result for experiment files
 */
export interface ExperimentFileValidation {
  valid: boolean
  errors: Array<{
    path: string
    message: string
    code: string
  }>
  warnings: Array<{
    path: string
    message: string
    suggestion?: string
  }>
  parsedFile?: ExergyExperimentFile
}

/**
 * Export options when generating experiment files
 */
export interface ExperimentExportOptions {
  includeFailureAnalysis?: boolean
  includeSimulationSuggestions?: boolean
  format?: 'json' | 'yaml'
  prettyPrint?: boolean
  includeMetadata?: boolean
}

/**
 * Import options when loading experiment files
 */
export interface ExperimentImportOptions {
  validateSchema?: boolean
  allowPartial?: boolean
  overrideSimulationParams?: Partial<SimulationSuggestion>
}

/**
 * Helper type for experiment file content without version
 */
export type ExergyExperimentContent = Omit<ExergyExperimentFile, 'version'>

/**
 * Type guard to check if an object is a valid ExergyExperimentFile
 */
export function isExergyExperimentFile(obj: unknown): obj is ExergyExperimentFile {
  if (typeof obj !== 'object' || obj === null) return false
  const file = obj as Record<string, unknown>
  return (
    file.version === '1.0.0' &&
    typeof file.metadata === 'object' &&
    typeof file.protocol === 'object' &&
    typeof file.simulation === 'object'
  )
}

/**
 * Creates a minimal valid experiment file structure
 */
export function createEmptyExperimentFile(
  metadata: Pick<ExperimentMetadata, 'title' | 'domain' | 'description'>
): ExergyExperimentFile {
  return {
    version: '1.0.0',
    metadata: {
      id: crypto.randomUUID(),
      title: metadata.title,
      createdAt: new Date().toISOString(),
      domain: metadata.domain,
      description: metadata.description,
    },
    protocol: {
      materials: [],
      equipment: [],
      steps: [],
      safetyWarnings: [],
      expectedResults: '',
      estimatedDuration: '',
    },
    failureAnalysis: {
      potentialFailures: [],
      riskScore: 0,
      recommendations: [],
    },
    simulation: {
      suggestedType: 'thermodynamic',
      suggestedTier: 'tier1',
      parameters: [],
      boundaryConditions: [],
      expectedOutputs: [],
      reasoning: '',
      confidence: 0,
    },
  }
}
