/**
 * Simulation Report Types
 *
 * Defines the data structures for generating comprehensive simulation PDF reports.
 * Follows the 18+ section structure similar to TEA reports.
 */

import type { ExergyExperimentFile, ExperimentDomain } from './exergy-experiment'
import type {
  SimulationType,
  SimulationTier,
  SimulationOutput,
  ExergyAnalysis,
  BoundaryCondition,
} from '@/lib/simulation/types'

// ============================================================================
// Report Metadata
// ============================================================================

export interface SimulationReportMetadata {
  id: string
  title: string
  subtitle?: string
  domain: ExperimentDomain
  createdAt: string
  version: string
  author?: string
  organization?: string
  confidential?: boolean
}

// ============================================================================
// Overview Section
// ============================================================================

export interface SimulationOverview {
  title: string
  description: string
  domain: ExperimentDomain
  goals: string[]
  experimentSource?: {
    id: string
    title: string
    importedAt: string
  }
  backgroundContext?: string
}

// ============================================================================
// Methodology Section
// ============================================================================

export interface SimulationMethodology {
  simulationType: SimulationType
  tier: SimulationTier
  provider: string // PhysX, MuJoCo, Modal, Analytical
  description: string

  parameters: Array<{
    name: string
    value: number
    unit: string
    description?: string
  }>

  boundaryConditions: BoundaryCondition[]

  meshDetails?: {
    type: string
    nodeCount?: number
    elementCount?: number
    resolution?: string
    refinementRegions?: string[]
  }

  solverSettings?: {
    algorithm: string
    convergenceCriteria: string
    maxIterations?: number
    timeStep?: number
    tolerance?: number
  }

  physicsModels?: string[]
  assumptions: string[]
}

// ============================================================================
// Results Section
// ============================================================================

export interface SimulationMetric {
  name: string
  value: number
  unit: string
  significance: 'high' | 'medium' | 'low'
  description?: string
  uncertainty?: number
  trend?: 'increasing' | 'decreasing' | 'stable'
}

export interface ConvergenceData {
  iterations: number
  residual: number
  converged: boolean
  convergenceHistory?: Array<{
    iteration: number
    residual: number
  }>
  convergenceTime?: number // seconds
}

export interface TimeSeriesData {
  name: string
  unit: string
  times: number[]
  values: number[]
  description?: string
}

export interface SimulationResults {
  metrics: SimulationMetric[]
  outputs: SimulationOutput[]
  convergence?: ConvergenceData
  timeSeries?: TimeSeriesData[]
  fields?: Record<string, number[]>
  peakValues?: Record<string, { value: number; location?: string; time?: number }>
}

// ============================================================================
// Visualization Section
// ============================================================================

export type VisualizationType =
  | 'line'
  | 'bar'
  | 'scatter'
  | 'heatmap'
  | 'contour'
  | 'vector'
  | '3d_surface'
  | 'histogram'
  | 'pie'
  | 'tornado'

export interface SimulationVisualization {
  id: string
  title: string
  type: VisualizationType
  description?: string

  // Data for the chart
  data: {
    labels?: string[]
    datasets: Array<{
      name: string
      values: number[]
      color?: string
    }>
  }

  // Axis configuration
  xAxis?: {
    label: string
    unit?: string
    min?: number
    max?: number
  }

  yAxis?: {
    label: string
    unit?: string
    min?: number
    max?: number
  }

  // For heatmaps and contours
  colorScale?: {
    min: number
    max: number
    colormap?: string
  }

  // Rendered image (base64) for PDF embedding
  imageBase64?: string
}

// ============================================================================
// Analysis Sections
// ============================================================================

export interface SensitivityAnalysisResult {
  parameter: string
  baseValue: number
  lowValue: number
  highValue: number
  outputMetric: string
  lowResult: number
  baseResult: number
  highResult: number
  sensitivity: number // Normalized sensitivity coefficient
}

export interface SensitivityAnalysis {
  targetMetric: string
  parameters: SensitivityAnalysisResult[]
  mostSensitive: string[]
  leastSensitive: string[]
  recommendations: string[]
}

export interface ValidationResult {
  metric: string
  expected: number
  simulated: number
  unit: string
  deviation: number // Percentage
  withinTolerance: boolean
  notes?: string
}

export interface SimulationValidation {
  comparedTo: string // 'expected results' | 'literature' | 'experiment'
  results: ValidationResult[]
  overallAccuracy: number // Percentage
  passed: boolean
  notes?: string
}

// ============================================================================
// AI Insights Section
// ============================================================================

export interface AIInsight {
  category: 'observation' | 'recommendation' | 'warning' | 'opportunity'
  title: string
  description: string
  confidence: number // 0-100
  priority: 'high' | 'medium' | 'low'
  actionable: boolean
  suggestedAction?: string
}

export interface AIGeneratedInsights {
  summary: string
  insights: AIInsight[]
  marketTrends?: string[]
  riskAssessment?: {
    overallRisk: 'low' | 'medium' | 'high'
    factors: Array<{
      factor: string
      risk: 'low' | 'medium' | 'high'
      mitigation?: string
    }>
  }
  nextSteps: string[]
}

// ============================================================================
// Conclusions & Recommendations
// ============================================================================

export interface SimulationConclusions {
  summary: string
  keyFindings: string[]
  achievements: string[]
  limitations: string[]
  futureWork: string[]
}

export interface SimulationRecommendations {
  designChanges: string[]
  operationalOptimizations: string[]
  furtherExperiments: string[]
  researchDirections: string[]
}

// ============================================================================
// Appendix & References
// ============================================================================

export interface DataTable {
  id: string
  title: string
  description?: string
  headers: string[]
  rows: (string | number)[][]
  notes?: string
}

export interface Reference {
  id: string
  type: 'standard' | 'paper' | 'book' | 'website' | 'software'
  citation: string
  url?: string
  doi?: string
}

export interface ReportAppendix {
  dataTables: DataTable[]
  additionalCharts: SimulationVisualization[]
  rawDataAvailable: boolean
  downloadLinks?: Array<{
    format: 'csv' | 'json' | 'xlsx'
    description: string
    size?: string
  }>
}

// ============================================================================
// Report Configuration
// ============================================================================

export interface SimulationReportConfig {
  // Section toggles
  includeExecutiveSummary: boolean
  includeMethodology: boolean
  includeResults: boolean
  includeVisualizations: boolean
  includeExergyAnalysis: boolean
  includeAIInsights: boolean
  includeSensitivityAnalysis: boolean
  includeValidation: boolean
  includeConclusions: boolean
  includeLimitations: boolean
  includeRecommendations: boolean
  includeReferences: boolean
  includeAppendix: boolean

  // Detail level
  detailLevel: 'summary' | 'standard' | 'comprehensive'

  // Visualization options
  visualizationOptions: {
    colorScheme: 'default' | 'colorblind-safe' | 'grayscale'
    chartStyle: 'professional' | 'academic' | 'simple'
    resolution: 'screen' | 'print' | 'publication'
  }

  // Branding
  branding?: {
    logoBase64?: string
    primaryColor?: string
    secondaryColor?: string
    footerText?: string
    headerText?: string
  }
}

// ============================================================================
// Main Report Data Structure
// ============================================================================

export interface SimulationReportData {
  metadata: SimulationReportMetadata
  overview: SimulationOverview
  methodology: SimulationMethodology
  results: SimulationResults
  exergyAnalysis?: ExergyAnalysis
  visualizations: SimulationVisualization[]
  sensitivityAnalysis?: SensitivityAnalysis
  validation?: SimulationValidation
  aiInsights?: AIGeneratedInsights
  conclusions: SimulationConclusions
  recommendations: SimulationRecommendations
  references: Reference[]
  appendix?: ReportAppendix

  // Execution metadata
  executionMetadata: {
    executedAt: string
    duration: number // seconds
    cost?: number // USD
    provider: string
    tier: SimulationTier
    warnings?: string[]
  }

  // Source experiment (if imported)
  sourceExperiment?: ExergyExperimentFile
}

// ============================================================================
// Report Generation Options
// ============================================================================

export interface ReportGenerationOptions {
  config: SimulationReportConfig
  format: 'pdf' | 'html' | 'json'
  filename?: string
  watermark?: string
  pageSize?: 'a4' | 'letter'
  orientation?: 'portrait' | 'landscape'
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_REPORT_CONFIG: SimulationReportConfig = {
  includeExecutiveSummary: true,
  includeMethodology: true,
  includeResults: true,
  includeVisualizations: true,
  includeExergyAnalysis: true,
  includeAIInsights: true,
  includeSensitivityAnalysis: true,
  includeValidation: true,
  includeConclusions: true,
  includeLimitations: true,
  includeRecommendations: true,
  includeReferences: true,
  includeAppendix: true,
  detailLevel: 'comprehensive',
  visualizationOptions: {
    colorScheme: 'default',
    chartStyle: 'professional',
    resolution: 'print',
  },
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates an empty report data structure
 */
export function createEmptyReportData(
  metadata: Pick<SimulationReportMetadata, 'title' | 'domain'>
): SimulationReportData {
  return {
    metadata: {
      id: crypto.randomUUID(),
      title: metadata.title,
      domain: metadata.domain,
      createdAt: new Date().toISOString(),
      version: '1.0.0',
    },
    overview: {
      title: metadata.title,
      description: '',
      domain: metadata.domain,
      goals: [],
    },
    methodology: {
      simulationType: 'thermodynamic',
      tier: 'tier1',
      provider: 'Analytical',
      description: '',
      parameters: [],
      boundaryConditions: [],
      assumptions: [],
    },
    results: {
      metrics: [],
      outputs: [],
    },
    visualizations: [],
    conclusions: {
      summary: '',
      keyFindings: [],
      achievements: [],
      limitations: [],
      futureWork: [],
    },
    recommendations: {
      designChanges: [],
      operationalOptimizations: [],
      furtherExperiments: [],
      researchDirections: [],
    },
    references: [],
    executionMetadata: {
      executedAt: new Date().toISOString(),
      duration: 0,
      provider: 'Analytical',
      tier: 'tier1',
    },
  }
}

/**
 * Calculates report completeness percentage
 */
export function calculateReportCompleteness(report: SimulationReportData): number {
  let score = 0
  let total = 0

  // Required sections
  total += 5
  if (report.overview.description) score += 1
  if (report.overview.goals.length > 0) score += 1
  if (report.methodology.description) score += 1
  if (report.results.metrics.length > 0) score += 1
  if (report.conclusions.summary) score += 1

  // Optional sections
  total += 5
  if (report.exergyAnalysis) score += 1
  if (report.visualizations.length > 0) score += 1
  if (report.aiInsights) score += 1
  if (report.sensitivityAnalysis) score += 1
  if (report.validation) score += 1

  return Math.round((score / total) * 100)
}
