/**
 * 3-Tier Experiment Design Types
 *
 * Tier 1: Rapid Feasibility (<1 min) - analytical/literature-based
 * Tier 2: Standard Lab Protocol (5-30 min) - AI-generated full protocols
 * Tier 3: Advanced Validation (30+ min) - publication-grade with DOE
 */

import type { ExperimentProtocol, Material, SafetyWarning, FailureMode } from './experiment'

// ============================================================================
// Core Tier Types
// ============================================================================

export type ExperimentTier = 1 | 2 | 3

export type ExperimentTierName = 'rapid-feasibility' | 'standard-protocol' | 'advanced-validation'

export interface ExperimentTierCapabilities {
  tier: ExperimentTier
  name: ExperimentTierName
  displayName: string
  description: string
  timeEstimate: string
  costEstimate: string
  accuracy: string
  capabilities: string[]
  limitations: string[]
  outputTypes: string[]
  recommended: {
    noveltyThreshold: number      // Min novelty score to recommend this tier
    safetyRiskLevel: 'low' | 'medium' | 'high' | 'any'
    targetQuality: ('exploratory' | 'validated' | 'publication')[]
  }
}

// ============================================================================
// Tier 1: Rapid Feasibility
// ============================================================================

export interface ThermodynamicCheck {
  name: string
  limit: string                   // e.g., "Carnot efficiency", "Betz limit"
  expectedValue: number
  actualValue?: number
  unit: string
  passed: boolean
  reasoning?: string
}

export interface LiteratureSupport {
  finding: string
  citation: string
  relevance: number              // 0-1
  year: number
  sourceType: 'paper' | 'patent' | 'database'
}

export interface SafetyFlag {
  category: 'chemical' | 'thermal' | 'pressure' | 'electrical' | 'radiation' | 'mechanical'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  mitigation?: string
  requiresExpertReview: boolean
}

export interface Tier1FeasibilityResult {
  tier: 1
  feasible: boolean
  confidence: number              // 0-100
  thermodynamicChecks: ThermodynamicCheck[]
  materialsProjectCheck?: {
    materialsFound: number
    stabilityVerified: boolean
    bandGapSuitable?: boolean
    formationEnergyFavorable?: boolean
  }
  safetyFlags: SafetyFlag[]
  literatureSupport: LiteratureSupport[]
  roughProtocolOutline: string[]
  recommendations: string[]
  escalationSuggested: boolean
  escalationReason?: string
  executionTime: number           // milliseconds
}

// ============================================================================
// Tier 2: Standard Lab Protocol
// ============================================================================

export interface SupplierLink {
  supplier: 'sigma-aldrich' | 'fisher-scientific' | 'alfa-aesar' | 'tci' | 'other'
  productNumber: string
  url?: string
  estimatedPrice?: number
  currency: 'USD' | 'EUR' | 'GBP'
  leadTime?: string
}

export interface EnhancedMaterial extends Material {
  supplierLinks: SupplierLink[]
  alternatives: Material[]
  safetyDataSheet?: string       // URL to SDS
  purity?: string
  storageRequirements?: string
}

export interface CharacterizationTechnique {
  technique: 'XRD' | 'SEM' | 'TEM' | 'CV' | 'UV-Vis' | 'XPS' | 'NMR' | 'FTIR' | 'TGA' | 'DSC' | 'BET' | 'ICP-OES' | 'EDX'
  purpose: string
  expectedOutcome: string
  alternatives: string[]
  equipmentRequired: string[]
  samplePreparation?: string
  estimatedTime?: string
}

export interface CharacterizationPlan {
  techniques: CharacterizationTechnique[]
  sequencing: string[]           // Order of techniques
  dependencies: Record<string, string[]>  // Which techniques depend on others
}

export interface EquipmentAlternative {
  primary: string
  alternatives: {
    name: string
    tradeoffs: string
    suitability: 'equivalent' | 'acceptable' | 'limited'
  }[]
}

export interface CostBreakdown {
  materials: number
  equipment: number              // Rental/usage costs
  labor: number
  characterization: number
  overhead: number
  total: number
  currency: 'USD'
}

export interface ChecklistItem {
  id: string
  category: 'preparation' | 'execution' | 'analysis' | 'documentation'
  item: string
  critical: boolean
  completed?: boolean
}

export interface Tier2StandardProtocol extends ExperimentProtocol {
  tier: 2
  enhancedMaterials: EnhancedMaterial[]
  equipmentAlternatives: EquipmentAlternative[]
  characterizationPlan: CharacterizationPlan
  costBreakdown: CostBreakdown
  reproducibilityChecklist: ChecklistItem[]
  estimatedLabTime: string
  skillLevel: 'undergraduate' | 'graduate' | 'postdoc' | 'expert'
  executionTime: number          // Time to generate this protocol (ms)
}

// ============================================================================
// Tier 3: Advanced Validation
// ============================================================================

export interface GloveboxSpec {
  required: boolean
  atmosphere: 'argon' | 'nitrogen' | 'mixed'
  oxygenLevel: string            // e.g., "<0.1 ppm"
  moistureLevel: string
  specialRequirements?: string[]
}

export interface AtmosphereSpec {
  type: 'inert' | 'vacuum' | 'controlled' | 'ambient'
  gas?: string
  pressure?: string
  flow?: string
}

export interface OperandoSpec {
  technique: string              // e.g., "operando XRD", "in-situ FTIR"
  setup: string
  dataCollectionRate: string
  synchronization: string[]      // What parameters to sync
}

export interface DOEFactor {
  name: string
  type: 'continuous' | 'categorical'
  levels: (number | string)[]
  unit?: string
  currentBest?: number | string
}

export interface DOEResponse {
  name: string
  unit: string
  target: 'maximize' | 'minimize' | 'target'
  targetValue?: number
  weight: number                 // Importance weight 0-1
}

export interface DOERun {
  runNumber: number
  factorValues: Record<string, number | string>
  randomized: boolean
  replicates: number
}

export interface DOEPlan {
  designType: 'full_factorial' | 'fractional_factorial' | 'response_surface' | 'taguchi' | 'latin_hypercube'
  factors: DOEFactor[]
  responses: DOEResponse[]
  runs: DOERun[]
  analysisMethod: 'ANOVA' | 'regression' | 'RSM' | 'neural_network'
  powerAnalysis?: {
    detectableEffect: number
    power: number
    sampleSize: number
  }
}

export interface SensitivityResult {
  parameter: string
  baseValue: number
  unit: string
  sensitivity: number            // % change in output per % change in input
  criticalThreshold?: number
  recommendation?: string
}

export interface LabQuote {
  labName: string
  labType: 'academic' | 'commercial' | 'government'
  services: string[]
  estimatedCost: number
  currency: 'USD'
  turnaroundTime: string
  contactInfo: string
  certifications?: string[]      // ISO, GLP, etc.
}

export interface ComplianceItem {
  standard: 'GLP' | 'GMP' | 'ISO-17025' | 'ASTM' | 'EPA' | 'OSHA' | 'custom'
  requirement: string
  status: 'compliant' | 'needs-review' | 'non-compliant'
  notes?: string
}

export interface PublicationChecklist {
  dataCompleteness: boolean
  statisticalRigor: boolean
  reproducibilityDocumented: boolean
  uncertaintyQuantified: boolean
  controlsIncluded: boolean
  blindingApplied?: boolean
  ethicsApproved?: boolean
  supplementaryDataPrepared: boolean
  codeAvailable?: boolean
  rawDataArchived: boolean
}

export interface Tier3AdvancedProtocol extends Omit<Tier2StandardProtocol, 'tier'> {
  tier: 3
  gloveboxSpec?: GloveboxSpec
  atmosphereSpec?: AtmosphereSpec
  operandoSetups?: OperandoSpec[]
  statisticalDesign: DOEPlan
  sensitivityAnalysis: SensitivityResult[]
  externalLabOptions: LabQuote[]
  complianceChecklist: ComplianceItem[]
  publicationReadiness: PublicationChecklist
  peerReviewNotes?: string[]
  estimatedPublicationTimeline?: string
}

// ============================================================================
// Unified Experiment Result Type
// ============================================================================

export type ExperimentTierResult =
  | Tier1FeasibilityResult
  | Tier2StandardProtocol
  | Tier3AdvancedProtocol

// ============================================================================
// Tier Selection Types
// ============================================================================

export interface TierSelectionFactors {
  hypothesisNoveltyScore: number
  hypothesisFeasibilityScore: number
  safetyRiskLevel: 'low' | 'medium' | 'high'
  materialComplexity: 'standard' | 'moderate' | 'advanced' | 'novel'
  targetQuality: 'exploratory' | 'validated' | 'publication'
  budgetConstraint?: number
  timeConstraint?: number        // minutes
}

export interface TierRecommendation {
  recommendedTier: ExperimentTier
  reasoning: string[]
  alternativeTiers: {
    tier: ExperimentTier
    tradeoffs: string
  }[]
  escalationPath?: {
    condition: string
    escalateTo: ExperimentTier
  }
}

// ============================================================================
// Tier Capabilities Configuration
// ============================================================================

export const EXPERIMENT_TIER_CONFIG: ExperimentTierCapabilities[] = [
  {
    tier: 1,
    name: 'rapid-feasibility',
    displayName: 'Rapid Feasibility',
    description: 'Quick analytical validation using thermodynamic limits and literature data',
    timeEstimate: '<1 minute',
    costEstimate: 'Free',
    accuracy: 'Go/No-Go decision',
    capabilities: [
      'Thermodynamic limit checking (Carnot, Betz, S-Q)',
      'Known stability from Materials Project',
      'Solubility prediction via RDKit',
      'Safety hazard screening',
      'Basic reproducibility assessment',
      'Literature precedent search',
    ],
    limitations: [
      'No detailed protocol generation',
      'No novel material predictions',
      'Literature-dependent accuracy',
      'No equipment specifications',
    ],
    outputTypes: ['feasibility_report', 'risk_flags', 'rough_protocol_outline'],
    recommended: {
      noveltyThreshold: 0,
      safetyRiskLevel: 'any',
      targetQuality: ['exploratory'],
    },
  },
  {
    tier: 2,
    name: 'standard-protocol',
    displayName: 'Standard Lab Protocol',
    description: 'AI-generated full synthesis and characterization protocols',
    timeEstimate: '5-30 minutes',
    costEstimate: 'Free (API usage)',
    accuracy: 'Lab-ready protocols',
    capabilities: [
      'Full synthesis protocol (step-by-step)',
      'Materials list with supplier sourcing',
      'Equipment specifications with alternatives',
      'Basic characterization plan (XRD, SEM, CV, UV-Vis)',
      'Safety analysis with PPE requirements',
      'Failure mode identification',
      'Cost/time estimation for benchtop run',
      'Reproducibility checklist',
    ],
    limitations: [
      'Standard techniques only (no custom equipment)',
      'May require expert review for novel materials',
      'No statistical design of experiments',
    ],
    outputTypes: ['full_protocol_pdf', 'materials_list', 'safety_docs', 'reproducibility_checklist'],
    recommended: {
      noveltyThreshold: 50,
      safetyRiskLevel: 'medium',
      targetQuality: ['exploratory', 'validated'],
    },
  },
  {
    tier: 3,
    name: 'advanced-validation',
    displayName: 'Advanced Validation',
    description: 'Publication-grade protocols with advanced characterization and DOE',
    timeEstimate: '30+ minutes',
    costEstimate: '$5-50 (complexity dependent)',
    accuracy: 'Publication-ready',
    capabilities: [
      'Multi-step custom protocols (glovebox, inert atmosphere)',
      'In-operando testing protocols',
      'Integrated characterization suite (XPS, TEM, operando spectroscopy)',
      'Statistical experimental design (DOE)',
      'Sensitivity analysis',
      'External lab collaboration quotes',
      'Full budget and safety documentation',
      'GLP/GMP compliance guidance',
      'Publication readiness checklist',
    ],
    limitations: [
      'Requires significant compute time',
      'May need expert validation',
      'Higher API costs',
    ],
    outputTypes: ['publication_protocol', 'doe_plan', 'full_budget', 'collaboration_quotes', 'compliance_docs'],
    recommended: {
      noveltyThreshold: 70,
      safetyRiskLevel: 'any',
      targetQuality: ['publication'],
    },
  },
]

// ============================================================================
// Helper Functions
// ============================================================================

export function getExperimentTierConfig(tier: ExperimentTier): ExperimentTierCapabilities {
  return EXPERIMENT_TIER_CONFIG.find(t => t.tier === tier) || EXPERIMENT_TIER_CONFIG[0]
}

export function getExperimentTierByName(name: ExperimentTierName): ExperimentTierCapabilities {
  return EXPERIMENT_TIER_CONFIG.find(t => t.name === name) || EXPERIMENT_TIER_CONFIG[0]
}

export function isExperimentTierResult(result: unknown): result is ExperimentTierResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    'tier' in result &&
    typeof (result as { tier: unknown }).tier === 'number' &&
    [1, 2, 3].includes((result as { tier: number }).tier)
  )
}
