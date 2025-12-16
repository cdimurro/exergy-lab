/**
 * Experiment Design Types
 */

export interface ExperimentGoal {
  description: string
  domain: string // e.g., "solar energy", "battery storage"
  objectives: string[]
}

export interface Material {
  name: string
  quantity: string
  unit: string
  specification?: string
  supplier?: string
  cost?: number
}

export interface ExperimentStep {
  step: number
  title: string
  description: string
  duration?: string
  temperature?: string
  pressure?: string
  safety?: string[]
}

export interface SafetyWarning {
  level: 'low' | 'medium' | 'high' | 'critical'
  category: string // e.g., "chemical hazard", "high temperature"
  description: string
  mitigation: string
}

export interface ExperimentProtocol {
  id: string
  title: string
  createdAt: string
  goal: ExperimentGoal
  materials: Material[]
  equipment: string[]
  steps: ExperimentStep[]
  safetyWarnings: SafetyWarning[]
  expectedResults: string
  estimatedDuration: string
  estimatedCost?: number
}

export interface FailureMode {
  description: string
  frequency: 'common' | 'occasional' | 'rare'
  impact: 'low' | 'medium' | 'high' | 'critical'
  causes: string[]
  preventions: string[]
  similarExperiments?: string[] // References to similar failed experiments
}

export interface FailureAnalysis {
  potentialFailures: FailureMode[]
  riskScore: number // 0-100
  recommendations: string[]
}

export interface Experiment {
  protocol: ExperimentProtocol
  failureAnalysis: FailureAnalysis
}
