/**
 * Experiment Report Types
 *
 * Defines the data structures for generating comprehensive experiment PDF reports.
 * Follows a similar structure to simulation reports but adapted for experimental protocols.
 */

import type { ExperimentDomain } from './experiment-workflow'
import type {
  ExperimentPlan,
  ProtocolValidation,
  Material,
  ExperimentStep,
  SafetyWarning,
  MaterialHazard,
} from './experiment-workflow'

// ============================================================================
// Report Metadata
// ============================================================================

export interface ExperimentReportMetadata {
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
// Protocol Section
// ============================================================================

export interface ProtocolSection {
  materials: Material[]
  equipment: string[]
  steps: ExperimentStep[]
  safetyWarnings: SafetyWarning[]
  estimatedDuration: string
  estimatedCost: number
  methodology: string
}

// ============================================================================
// Safety Section
// ============================================================================

export interface SafetySection {
  hazards: MaterialHazard[]
  requiredPPE: string[]
  incompatibilities: Array<{
    material1: string
    material2: string
    warning: string
    severity: 'critical' | 'high' | 'medium' | 'low'
  }>
  emergencyProcedures?: string[]
  wasteDisposal?: string[]
}

// ============================================================================
// Validation Section
// ============================================================================

export interface ValidationSection {
  literatureAlignment: {
    confidence: number
    matchedPapers: number
    deviations: string[]
    recommendations: string[]
  }
  materialSafety: {
    allChecked: boolean
    hazardCount: number
    criticalHazards: number
    requiredPPE: string[]
  }
  equipmentFeasibility: {
    tier: 'academic' | 'industrial' | 'pilot'
    availableCount: number
    unavailableCount: number
    estimatedAccessCost: number
    alternatives: Record<string, string[]>
  }
  costAccuracy: {
    totalCost: number
    confidenceInterval: [number, number]
    breakdown: {
      materials: Array<{
        name: string
        quantity: string
        unitCost: number
        totalCost: number
      }>
      subtotalMaterials: number
      total: number
    }
    quoteSources: string[]
  }
}

// ============================================================================
// Recommendations Section
// ============================================================================

export interface RecommendationItem {
  id: string
  type: 'safety' | 'cost' | 'methodology' | 'equipment' | 'simulation'
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  action?: string
}

// ============================================================================
// Main Report Data Structure
// ============================================================================

export interface ExperimentReportData {
  metadata: ExperimentReportMetadata
  overview: {
    title: string
    domain: ExperimentDomain
    goal: string
    objectives: string[]
    backgroundContext?: string
  }
  protocol: ProtocolSection
  safety: SafetySection
  validation: ValidationSection
  recommendations: RecommendationItem[]
  conclusions: string[]
  limitations: string[]
  references?: string[]
  appendix?: {
    rawData?: Record<string, unknown>
    supplementaryMaterials?: string[]
    calculations?: string[]
  }
}

// ============================================================================
// Report Configuration
// ============================================================================

export interface ExperimentReportConfig {
  // Section toggles
  includeOverview: boolean
  includeProtocol: boolean
  includeSafety: boolean
  includeValidation: boolean
  includeRecommendations: boolean
  includeConclusions: boolean
  includeLimitations: boolean
  includeReferences: boolean
  includeAppendix: boolean

  // Detail levels
  detailLevel: 'summary' | 'standard' | 'comprehensive'
  includeCostBreakdown: boolean
  includeSafetyDetails: boolean
  includeEquipmentAlternatives: boolean

  // Formatting options
  colorScheme: 'default' | 'professional' | 'minimal'
  pageSize: 'a4' | 'letter'
  orientation: 'portrait' | 'landscape'
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_EXPERIMENT_REPORT_CONFIG: ExperimentReportConfig = {
  includeOverview: true,
  includeProtocol: true,
  includeSafety: true,
  includeValidation: true,
  includeRecommendations: true,
  includeConclusions: true,
  includeLimitations: true,
  includeReferences: true,
  includeAppendix: false,
  detailLevel: 'standard',
  includeCostBreakdown: true,
  includeSafetyDetails: true,
  includeEquipmentAlternatives: true,
  colorScheme: 'default',
  pageSize: 'a4',
  orientation: 'portrait',
}

// ============================================================================
// Helper Types for Report Generation
// ============================================================================

export interface ReportSection {
  title: string
  level: number
  pageNumber?: number
}

export interface ReportTableOfContents {
  sections: ReportSection[]
  generatedAt: string
}

// ============================================================================
// Transform Functions Types
// ============================================================================

export type TransformToReportData = (
  plan: ExperimentPlan,
  validation: ProtocolValidation,
  options?: {
    author?: string
    organization?: string
    goals?: string[]
  }
) => ExperimentReportData
