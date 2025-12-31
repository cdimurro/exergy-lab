/**
 * useExperimentDesign Hook (v0.0.6)
 *
 * Comprehensive experiment design hook for the ExperimentLab page.
 *
 * Features:
 * - Protocol generation from goal description
 * - Failure mode analysis
 * - Cost estimation
 * - Safety analysis
 * - DOE (Design of Experiments) integration
 * - Template library management
 * - Workflow context integration for cross-page data passing
 * - Export capabilities
 */

import { useState, useCallback, useMemo } from 'react'
import { useWorkflowContext } from '@/lib/store'
import type { Domain } from '@/types/discovery'
import type {
  ExperimentGoal,
  ExperimentProtocol,
  FailureAnalysis,
  Material,
  ExperimentStep,
  SafetyWarning,
  FailureMode,
} from '@/types/experiment'

// ============================================================================
// Types
// ============================================================================

export type DesignPhase = 'idle' | 'configuring' | 'generating' | 'analyzing' | 'complete'

export interface ProtocolTemplate {
  id: string
  name: string
  domain: Domain
  category: 'synthesis' | 'characterization' | 'testing' | 'assembly'
  description: string
  defaultMaterials: Material[]
  defaultEquipment: string[]
  baseSteps: ExperimentStep[]
  safetyProfile: SafetyWarning[]
  estimatedCost: { min: number; max: number }
  estimatedDuration: { min: string; max: string }
}

export interface CostBreakdown {
  materials: { name: string; quantity: string; unitCost: number; totalCost: number }[]
  equipment: { name: string; hourlyRate: number; hours: number; totalCost: number }[]
  labor: { role: string; hourlyRate: number; hours: number; totalCost: number }[]
  subtotalMaterials: number
  subtotalEquipment: number
  subtotalLabor: number
  total: number
  uncertainty: number
}

export interface DOEConfig {
  designType: 'full-factorial' | 'fractional-factorial' | 'taguchi' | 'central-composite' | 'custom'
  factors: DOEFactor[]
  runsNeeded: number
  replicates: number
}

export interface DOEFactor {
  name: string
  unit: string
  levels: number[]
  isNumeric: boolean
}

export interface DOEMatrixRow {
  runNumber: number
  factorValues: Record<string, number | string>
  estimatedOutcome?: number
  notes?: string
}

export interface ExperimentDesignState {
  // Core state
  phase: DesignPhase
  goal: ExperimentGoal | null
  protocol: ExperimentProtocol | null
  failureAnalysis: FailureAnalysis | null

  // Cost and safety
  costBreakdown: CostBreakdown | null
  safetyChecklist: SafetyChecklistItem[]

  // DOE
  doeConfig: DOEConfig | null
  doeMatrix: DOEMatrixRow[]

  // Templates
  selectedTemplate: ProtocolTemplate | null

  // UI state
  isGenerating: boolean
  isAnalyzing: boolean
  error: string | null

  // Workflow context
  hasContextFromSearch: boolean
}

export interface SafetyChecklistItem {
  id: string
  category: string
  requirement: string
  isRequired: boolean
  isCompleted: boolean
  notes?: string
}

// ============================================================================
// Constants
// ============================================================================

export const PROTOCOL_TEMPLATES: ProtocolTemplate[] = [
  {
    id: 'perovskite-thin-film',
    name: 'Perovskite Thin Film Deposition',
    domain: 'solar-energy',
    category: 'synthesis',
    description: 'Spin-coating deposition of perovskite thin films for solar cell fabrication',
    defaultMaterials: [
      { name: 'Lead iodide (PbI2)', quantity: '500', unit: 'mg', specification: '99.99% purity', cost: 45 },
      { name: 'Methylammonium iodide (MAI)', quantity: '200', unit: 'mg', specification: 'Anhydrous', cost: 30 },
      { name: 'DMF', quantity: '50', unit: 'mL', specification: 'Anhydrous', cost: 15 },
      { name: 'DMSO', quantity: '10', unit: 'mL', specification: 'Anhydrous', cost: 12 },
      { name: 'ITO substrates', quantity: '10', unit: 'pcs', specification: '15 ohm/sq', cost: 85 },
    ],
    defaultEquipment: ['Spin coater', 'Glovebox (N2)', 'Hot plate', 'Solar simulator', 'Profilometer'],
    baseSteps: [
      { step: 1, title: 'Substrate Preparation', description: 'Clean ITO substrates with UV-ozone treatment', duration: '30 min' },
      { step: 2, title: 'Precursor Solution', description: 'Prepare 1.2M PbI2:MAI solution in DMF:DMSO', duration: '20 min' },
      { step: 3, title: 'Spin Coating', description: 'Deposit solution at 4000 RPM for 30s', duration: '5 min' },
      { step: 4, title: 'Annealing', description: 'Anneal at 100C for 10 min', duration: '15 min' },
      { step: 5, title: 'Characterization', description: 'Measure IV curves and EQE', duration: '1 hour' },
    ],
    safetyProfile: [
      { level: 'high', category: 'chemical hazard', description: 'Lead compounds are toxic', mitigation: 'Use gloves, work in fume hood' },
      { level: 'medium', category: 'solvent hazard', description: 'DMF is a reproductive hazard', mitigation: 'Proper ventilation, PPE' },
    ],
    estimatedCost: { min: 200, max: 400 },
    estimatedDuration: { min: '3 hours', max: '5 hours' },
  },
  {
    id: 'electrode-slurry',
    name: 'Battery Electrode Slurry Preparation',
    domain: 'battery-storage',
    category: 'synthesis',
    description: 'Preparation of electrode slurry for lithium-ion battery fabrication',
    defaultMaterials: [
      { name: 'Active material (NMC)', quantity: '10', unit: 'g', specification: 'Battery grade', cost: 50 },
      { name: 'Carbon black', quantity: '1', unit: 'g', specification: 'Super P', cost: 15 },
      { name: 'PVDF binder', quantity: '0.5', unit: 'g', specification: 'Molecular weight 600k', cost: 20 },
      { name: 'NMP solvent', quantity: '20', unit: 'mL', specification: 'Anhydrous', cost: 25 },
    ],
    defaultEquipment: ['Planetary mixer', 'Vacuum oven', 'Doctor blade coater', 'Argon glovebox'],
    baseSteps: [
      { step: 1, title: 'Dissolve Binder', description: 'Dissolve PVDF in NMP at 60C', duration: '2 hours' },
      { step: 2, title: 'Mix Powders', description: 'Mix active material and carbon black', duration: '30 min' },
      { step: 3, title: 'Slurry Mixing', description: 'Combine and mix for 4 hours', duration: '4 hours' },
      { step: 4, title: 'Coating', description: 'Coat on Al foil using doctor blade', duration: '1 hour' },
    ],
    safetyProfile: [
      { level: 'medium', category: 'solvent hazard', description: 'NMP is a skin irritant', mitigation: 'Use chemical-resistant gloves' },
      { level: 'low', category: 'particulate hazard', description: 'Fine powders may be inhaled', mitigation: 'Use N95 mask' },
    ],
    estimatedCost: { min: 150, max: 300 },
    estimatedDuration: { min: '6 hours', max: '8 hours' },
  },
  {
    id: 'electrolyzer-mea',
    name: 'Electrolyzer MEA Assembly',
    domain: 'hydrogen-fuel',
    category: 'assembly',
    description: 'Membrane electrode assembly for PEM electrolyzer cells',
    defaultMaterials: [
      { name: 'Nafion membrane', quantity: '1', unit: 'sheet', specification: 'N117', cost: 150 },
      { name: 'Iridium oxide catalyst', quantity: '100', unit: 'mg', specification: 'IrO2', cost: 200 },
      { name: 'Platinum catalyst', quantity: '50', unit: 'mg', specification: 'Pt/C 40%', cost: 100 },
      { name: 'Carbon paper GDL', quantity: '2', unit: 'sheets', specification: 'Toray 090', cost: 40 },
    ],
    defaultEquipment: ['Hot press', 'Spray coater', 'Electrochemical test station'],
    baseSteps: [
      { step: 1, title: 'Catalyst Ink Preparation', description: 'Prepare anode and cathode catalyst inks', duration: '1 hour' },
      { step: 2, title: 'Catalyst Coating', description: 'Spray coat catalysts onto GDLs', duration: '2 hours' },
      { step: 3, title: 'Hot Press', description: 'Hot press MEA at 130C, 2 MPa', duration: '30 min' },
      { step: 4, title: 'Performance Testing', description: 'Measure polarization curves', duration: '2 hours' },
    ],
    safetyProfile: [
      { level: 'high', category: 'precious metal', description: 'Handle expensive catalysts carefully', mitigation: 'Dedicated workspace, inventory tracking' },
      { level: 'medium', category: 'thermal hazard', description: 'Hot press operates at high temperature', mitigation: 'Heat-resistant gloves, cool-down period' },
    ],
    estimatedCost: { min: 500, max: 800 },
    estimatedDuration: { min: '5 hours', max: '7 hours' },
  },
]

export const DEFAULT_SAFETY_CHECKLIST: SafetyChecklistItem[] = [
  { id: 'ppe-1', category: 'PPE', requirement: 'Safety glasses', isRequired: true, isCompleted: false },
  { id: 'ppe-2', category: 'PPE', requirement: 'Lab coat', isRequired: true, isCompleted: false },
  { id: 'ppe-3', category: 'PPE', requirement: 'Chemical-resistant gloves', isRequired: true, isCompleted: false },
  { id: 'vent-1', category: 'Ventilation', requirement: 'Work in fume hood or glovebox', isRequired: true, isCompleted: false },
  { id: 'waste-1', category: 'Waste', requirement: 'Waste containers available', isRequired: true, isCompleted: false },
  { id: 'emergency-1', category: 'Emergency', requirement: 'Know location of safety shower/eyewash', isRequired: true, isCompleted: false },
  { id: 'training-1', category: 'Training', requirement: 'Completed relevant safety training', isRequired: true, isCompleted: false },
]

// ============================================================================
// Hook Implementation
// ============================================================================

export function useExperimentDesign() {
  // State
  const [state, setState] = useState<ExperimentDesignState>({
    phase: 'idle',
    goal: null,
    protocol: null,
    failureAnalysis: null,
    costBreakdown: null,
    safetyChecklist: [...DEFAULT_SAFETY_CHECKLIST],
    doeConfig: null,
    doeMatrix: [],
    selectedTemplate: null,
    isGenerating: false,
    isAnalyzing: false,
    error: null,
    hasContextFromSearch: false,
  })

  // Workflow context for cross-page data passing
  const { sourcePapers, setExperimentProtocol, setLastTool } = useWorkflowContext()

  // Check if we have context from search page
  const hasSearchContext = useMemo(() => {
    return !!sourcePapers && sourcePapers.ids.length > 0
  }, [sourcePapers])

  // ============================================================================
  // Goal Configuration
  // ============================================================================

  const setGoal = useCallback((goal: ExperimentGoal) => {
    setState(prev => ({
      ...prev,
      goal,
      phase: 'configuring',
      error: null,
    }))
  }, [])

  const updateGoal = useCallback((updates: Partial<ExperimentGoal>) => {
    setState(prev => ({
      ...prev,
      goal: prev.goal ? { ...prev.goal, ...updates } : null,
    }))
  }, [])

  // ============================================================================
  // Template Management
  // ============================================================================

  const selectTemplate = useCallback((templateId: string) => {
    const template = PROTOCOL_TEMPLATES.find(t => t.id === templateId)
    if (template) {
      setState(prev => ({
        ...prev,
        selectedTemplate: template,
        goal: prev.goal || {
          description: template.description,
          domain: template.domain,
          objectives: [],
        },
        safetyChecklist: [
          ...DEFAULT_SAFETY_CHECKLIST,
          ...template.safetyProfile.map((sp, idx) => ({
            id: `template-${idx}`,
            category: sp.category,
            requirement: sp.mitigation,
            isRequired: sp.level === 'high' || sp.level === 'critical',
            isCompleted: false,
          })),
        ],
        phase: 'configuring',
      }))
    }
  }, [])

  const clearTemplate = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedTemplate: null,
      safetyChecklist: [...DEFAULT_SAFETY_CHECKLIST],
    }))
  }, [])

  // ============================================================================
  // Protocol Generation
  // ============================================================================

  const generateProtocol = useCallback(async () => {
    if (!state.goal) {
      setState(prev => ({ ...prev, error: 'Please set experiment goal first' }))
      return
    }

    setState(prev => ({ ...prev, isGenerating: true, error: null, phase: 'generating' }))

    try {
      const response = await fetch('/api/experiments/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: state.goal }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate protocol')
      }

      const data = await response.json()
      const protocol = data.protocol as ExperimentProtocol

      // Calculate cost breakdown
      const costBreakdown = calculateCostBreakdown(protocol)

      setState(prev => ({
        ...prev,
        protocol,
        costBreakdown,
        isGenerating: false,
        phase: 'analyzing',
      }))

      // Auto-run failure analysis
      await runFailureAnalysis(protocol)

    } catch (error) {
      console.error('Protocol generation error:', error)
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Generation failed',
        phase: 'configuring',
      }))
    }
  }, [state.goal])

  // ============================================================================
  // Failure Analysis
  // ============================================================================

  const runFailureAnalysis = useCallback(async (protocol?: ExperimentProtocol) => {
    const protocolToAnalyze = protocol || state.protocol
    if (!protocolToAnalyze) {
      setState(prev => ({ ...prev, error: 'No protocol to analyze' }))
      return
    }

    setState(prev => ({ ...prev, isAnalyzing: true, error: null }))

    try {
      const response = await fetch('/api/experiments/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocol: protocolToAnalyze }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to analyze protocol')
      }

      const data = await response.json()

      setState(prev => ({
        ...prev,
        failureAnalysis: data.failureAnalysis,
        isAnalyzing: false,
        phase: 'complete',
      }))

    } catch (error) {
      console.error('Failure analysis error:', error)
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
      }))
    }
  }, [state.protocol])

  // ============================================================================
  // DOE (Design of Experiments)
  // ============================================================================

  const configureDOE = useCallback((config: DOEConfig) => {
    // Calculate number of runs based on design type
    const runsNeeded = calculateDOERuns(config)

    setState(prev => ({
      ...prev,
      doeConfig: { ...config, runsNeeded },
    }))
  }, [])

  const generateDOEMatrix = useCallback(() => {
    if (!state.doeConfig) return

    const matrix = generateDOEMatrixRows(state.doeConfig)
    setState(prev => ({
      ...prev,
      doeMatrix: matrix,
    }))
  }, [state.doeConfig])

  // ============================================================================
  // Safety Checklist
  // ============================================================================

  const toggleSafetyItem = useCallback((itemId: string) => {
    setState(prev => ({
      ...prev,
      safetyChecklist: prev.safetyChecklist.map(item =>
        item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
      ),
    }))
  }, [])

  const safetyProgress = useMemo(() => {
    const required = state.safetyChecklist.filter(item => item.isRequired)
    const completed = required.filter(item => item.isCompleted)
    return {
      completed: completed.length,
      total: required.length,
      percentage: required.length > 0 ? Math.round((completed.length / required.length) * 100) : 0,
      allComplete: completed.length === required.length,
    }
  }, [state.safetyChecklist])

  // ============================================================================
  // Workflow Integration
  // ============================================================================

  const sendToSimulations = useCallback(() => {
    if (!state.protocol) return null

    // Store protocol in workflow context
    setExperimentProtocol({
      id: state.protocol.id,
      title: state.protocol.title,
      domain: state.protocol.goal.domain as Domain,
      materials: state.protocol.materials,
      parameters: extractParametersFromProtocol(state.protocol),
      expectedOutcomes: state.protocol.goal.objectives,
      estimatedCost: state.protocol.estimatedCost,
      estimatedDuration: state.protocol.estimatedDuration,
    })
    setLastTool('experiments')

    return '/simulations'
  }, [state.protocol, setExperimentProtocol, setLastTool])

  // ============================================================================
  // Export Functions
  // ============================================================================

  const exportAsJSON = useCallback(() => {
    if (!state.protocol) return null

    const exportData = {
      version: '1.0.0',
      metadata: {
        id: state.protocol.id,
        title: state.protocol.title,
        createdAt: state.protocol.createdAt,
        domain: state.protocol.goal.domain,
        description: state.protocol.goal.description,
      },
      protocol: state.protocol,
      failureAnalysis: state.failureAnalysis,
      simulation: {
        suggestedType: 'monte-carlo',
        suggestedTier: 'tier-2',
        parameters: extractParametersFromProtocol(state.protocol),
        reasoning: 'AI-suggested simulation parameters based on protocol',
      },
    }

    return JSON.stringify(exportData, null, 2)
  }, [state.protocol, state.failureAnalysis])

  // ============================================================================
  // Reset
  // ============================================================================

  const reset = useCallback(() => {
    setState({
      phase: 'idle',
      goal: null,
      protocol: null,
      failureAnalysis: null,
      costBreakdown: null,
      safetyChecklist: [...DEFAULT_SAFETY_CHECKLIST],
      doeConfig: null,
      doeMatrix: [],
      selectedTemplate: null,
      isGenerating: false,
      isAnalyzing: false,
      error: null,
      hasContextFromSearch: false,
    })
  }, [])

  // ============================================================================
  // Return Hook API
  // ============================================================================

  return {
    // State
    ...state,
    templates: PROTOCOL_TEMPLATES,
    safetyProgress,
    hasSearchContext,
    searchContext: sourcePapers,

    // Goal Actions
    setGoal,
    updateGoal,

    // Template Actions
    selectTemplate,
    clearTemplate,

    // Generation Actions
    generateProtocol,
    runFailureAnalysis,

    // DOE Actions
    configureDOE,
    generateDOEMatrix,

    // Safety Actions
    toggleSafetyItem,

    // Workflow Actions
    sendToSimulations,

    // Export Actions
    exportAsJSON,

    // Reset
    reset,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateCostBreakdown(protocol: ExperimentProtocol): CostBreakdown {
  // Calculate materials cost
  const materialsCosts = protocol.materials.map(m => ({
    name: m.name,
    quantity: m.quantity,
    unitCost: m.cost || estimateMaterialCost(m.name),
    totalCost: (m.cost || estimateMaterialCost(m.name)) * parseFloat(m.quantity) || 0,
  }))

  // Estimate equipment time costs
  const equipmentCosts = protocol.equipment.map(e => ({
    name: e,
    hourlyRate: estimateEquipmentRate(e),
    hours: estimateEquipmentHours(protocol.steps.length),
    totalCost: estimateEquipmentRate(e) * estimateEquipmentHours(protocol.steps.length),
  }))

  // Estimate labor costs
  const laborHours = estimateLaborHours(protocol.steps)
  const laborCosts = [
    {
      role: 'Researcher',
      hourlyRate: 50,
      hours: laborHours,
      totalCost: 50 * laborHours,
    },
  ]

  const subtotalMaterials = materialsCosts.reduce((sum, m) => sum + m.totalCost, 0)
  const subtotalEquipment = equipmentCosts.reduce((sum, e) => sum + e.totalCost, 0)
  const subtotalLabor = laborCosts.reduce((sum, l) => sum + l.totalCost, 0)
  const total = subtotalMaterials + subtotalEquipment + subtotalLabor

  return {
    materials: materialsCosts,
    equipment: equipmentCosts,
    labor: laborCosts,
    subtotalMaterials,
    subtotalEquipment,
    subtotalLabor,
    total,
    uncertainty: total * 0.15, // 15% uncertainty
  }
}

function estimateMaterialCost(materialName: string): number {
  const costMap: Record<string, number> = {
    'lead': 50,
    'platinum': 200,
    'iridium': 250,
    'lithium': 30,
    'cobalt': 60,
    'nafion': 150,
    'carbon': 15,
    'default': 25,
  }

  for (const [key, cost] of Object.entries(costMap)) {
    if (materialName.toLowerCase().includes(key)) {
      return cost
    }
  }
  return costMap.default
}

function estimateEquipmentRate(equipmentName: string): number {
  const rateMap: Record<string, number> = {
    'glovebox': 25,
    'spin coater': 15,
    'hot press': 30,
    'solar simulator': 50,
    'xrd': 75,
    'sem': 100,
    'default': 20,
  }

  for (const [key, rate] of Object.entries(rateMap)) {
    if (equipmentName.toLowerCase().includes(key)) {
      return rate
    }
  }
  return rateMap.default
}

function estimateEquipmentHours(stepCount: number): number {
  return Math.max(2, stepCount * 0.5)
}

function estimateLaborHours(steps: ExperimentStep[]): number {
  let totalMinutes = 0

  for (const step of steps) {
    if (step.duration) {
      const match = step.duration.match(/(\d+)\s*(min|hour|hr|h)/i)
      if (match) {
        const value = parseFloat(match[1])
        const unit = match[2].toLowerCase()
        if (unit.startsWith('h')) {
          totalMinutes += value * 60
        } else {
          totalMinutes += value
        }
      }
    } else {
      totalMinutes += 30 // Default 30 min per step
    }
  }

  return Math.ceil(totalMinutes / 60)
}

function extractParametersFromProtocol(protocol: ExperimentProtocol): Record<string, number> {
  const params: Record<string, number> = {}

  for (const step of protocol.steps) {
    if (step.temperature) {
      const match = step.temperature.match(/(\d+)/)
      if (match) params.temperature = parseFloat(match[1])
    }
    if (step.pressure) {
      const match = step.pressure.match(/(\d+)/)
      if (match) params.pressure = parseFloat(match[1])
    }
    if (step.duration) {
      const match = step.duration.match(/(\d+)/)
      if (match) params.duration = parseFloat(match[1])
    }
  }

  return params
}

function calculateDOERuns(config: DOEConfig): number {
  const numFactors = config.factors.length
  const levels = config.factors.map(f => f.levels.length)
  const maxLevels = Math.max(...levels, 2)

  switch (config.designType) {
    case 'full-factorial':
      return levels.reduce((prod, l) => prod * l, 1) * config.replicates
    case 'fractional-factorial':
      return Math.pow(2, numFactors - 1) * config.replicates
    case 'taguchi':
      // L9 for 3 levels, L8 for 2 levels
      return maxLevels === 3 ? 9 * config.replicates : 8 * config.replicates
    case 'central-composite':
      return (Math.pow(2, numFactors) + 2 * numFactors + 1) * config.replicates
    default:
      return numFactors * maxLevels * config.replicates
  }
}

function generateDOEMatrixRows(config: DOEConfig): DOEMatrixRow[] {
  const rows: DOEMatrixRow[] = []
  let runNumber = 1

  // Simple full factorial for demonstration
  const generateCombinations = (factors: DOEFactor[], current: Record<string, number | string> = {}): void => {
    if (Object.keys(current).length === factors.length) {
      rows.push({
        runNumber: runNumber++,
        factorValues: { ...current },
      })
      return
    }

    const nextFactor = factors[Object.keys(current).length]
    for (const level of nextFactor.levels) {
      generateCombinations(factors, { ...current, [nextFactor.name]: level })
    }
  }

  if (config.factors.length > 0) {
    generateCombinations(config.factors)
  }

  return rows.slice(0, config.runsNeeded)
}

// ============================================================================
// Export Types
// ============================================================================

export type UseExperimentDesignReturn = ReturnType<typeof useExperimentDesign>
