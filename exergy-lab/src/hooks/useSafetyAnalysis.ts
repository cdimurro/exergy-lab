'use client'

import { useState, useCallback, useMemo } from 'react'
import { create } from 'zustand'

// ============================================================================
// Types
// ============================================================================

export type HazardLevel = 'critical' | 'high' | 'medium' | 'low'
export type HazardType = 'chemical' | 'physical' | 'biological' | 'electrical' | 'radiation'

export interface Hazard {
  id: string
  type: HazardType
  level: HazardLevel
  source: string
  description: string
  ghs_codes?: string[]
  exposure_routes?: string[]
  health_effects?: string[]
}

export interface PPERequirement {
  item: string
  type: 'eye' | 'hand' | 'body' | 'respiratory' | 'foot'
  level: 'basic' | 'enhanced' | 'specialized'
  specification?: string
}

export interface EmergencyProcedure {
  scenario: string
  steps: string[]
  contacts?: string[]
}

export interface SafetyAnalysis {
  overallRiskScore: number
  riskLevel: 'critical' | 'high' | 'medium' | 'low'
  hazards: Hazard[]
  ppe: PPERequirement[]
  emergencyProcedures: EmergencyProcedure[]
  training: string[]
  documentation: string[]
  engineeringControls: string[]
  administrativeControls: string[]
  recommendations: string[]
}

export interface Material {
  name: string
  quantity: number
  unit: string
}

export interface SafetyAnalysisState {
  materials: Material[]
  equipment: string[]
  temperatures: number[]
  pressures: number[]
  analysis: SafetyAnalysis | null
  isLoading: boolean
  error: string | null
  history: Array<{ id: string; timestamp: number; analysis: SafetyAnalysis }>

  // Actions
  setMaterials: (materials: Material[]) => void
  addMaterial: (material: Material) => void
  removeMaterial: (index: number) => void
  setEquipment: (equipment: string[]) => void
  addEquipment: (equipment: string) => void
  removeEquipment: (index: number) => void
  setTemperatures: (temps: number[]) => void
  setPressures: (pressures: number[]) => void
  setAnalysis: (analysis: SafetyAnalysis | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  addToHistory: (analysis: SafetyAnalysis) => void
  clearHistory: () => void
  reset: () => void
}

// ============================================================================
// Store
// ============================================================================

const initialState = {
  materials: [],
  equipment: [],
  temperatures: [],
  pressures: [],
  analysis: null,
  isLoading: false,
  error: null,
  history: [],
}

export const useSafetyAnalysisStore = create<SafetyAnalysisState>((set) => ({
  ...initialState,

  setMaterials: (materials) => set({ materials }),

  addMaterial: (material) =>
    set((state) => ({ materials: [...state.materials, material] })),

  removeMaterial: (index) =>
    set((state) => ({
      materials: state.materials.filter((_, i) => i !== index),
    })),

  setEquipment: (equipment) => set({ equipment }),

  addEquipment: (equipment) =>
    set((state) => ({ equipment: [...state.equipment, equipment] })),

  removeEquipment: (index) =>
    set((state) => ({
      equipment: state.equipment.filter((_, i) => i !== index),
    })),

  setTemperatures: (temperatures) => set({ temperatures }),
  setPressures: (pressures) => set({ pressures }),
  setAnalysis: (analysis) => set({ analysis }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  addToHistory: (analysis) =>
    set((state) => ({
      history: [
        { id: `safety_${Date.now()}`, timestamp: Date.now(), analysis },
        ...state.history,
      ].slice(0, 20),
    })),

  clearHistory: () => set({ history: [] }),
  reset: () => set(initialState),
}))

// ============================================================================
// Constants
// ============================================================================

export const GHS_CODES: Record<string, { name: string; icon: string; description: string }> = {
  GHS01: { name: 'Explosive', icon: '💣', description: 'Explosive substances' },
  GHS02: { name: 'Flammable', icon: '🔥', description: 'Flammable materials' },
  GHS03: { name: 'Oxidizer', icon: '⭕', description: 'Oxidizing substances' },
  GHS04: { name: 'Compressed Gas', icon: '🔵', description: 'Compressed gases' },
  GHS05: { name: 'Corrosive', icon: '⚗️', description: 'Corrosive to metals or tissue' },
  GHS06: { name: 'Toxic', icon: '☠️', description: 'Acute toxicity (fatal/toxic)' },
  GHS07: { name: 'Irritant', icon: '⚠️', description: 'Irritant, sensitizer, narcotic' },
  GHS08: { name: 'Health Hazard', icon: '🏥', description: 'Carcinogen, mutagen, reproductive' },
  GHS09: { name: 'Environment', icon: '🌍', description: 'Hazardous to environment' },
}

// ============================================================================
// Hook
// ============================================================================

export function useSafetyAnalysis() {
  const store = useSafetyAnalysisStore()
  const [knownChemicals, setKnownChemicals] = useState<string[]>([])
  const [knownEquipment, setKnownEquipment] = useState<string[]>([])

  // Fetch reference data
  const fetchReferenceData = useCallback(async () => {
    try {
      const response = await fetch('/api/experiments/safety')

      if (!response.ok) {
        throw new Error('Failed to fetch safety reference data')
      }

      const data = await response.json()

      setKnownChemicals(data.chemicalHazards || [])
      setKnownEquipment(data.equipmentHazards || [])

      return data
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch reference data'
      store.setError(message)
      return null
    }
  }, [store])

  // Analyze safety
  const analyzeSafety = useCallback(async (
    domain: string,
    options?: {
      materials?: Material[]
      equipment?: string[]
      temperatures?: number[]
      pressures?: number[]
    }
  ): Promise<SafetyAnalysis | null> => {
    store.setLoading(true)
    store.setError(null)

    const materials = options?.materials || store.materials
    const equipment = options?.equipment || store.equipment
    const temperatures = options?.temperatures || store.temperatures
    const pressures = options?.pressures || store.pressures

    if (materials.length === 0) {
      store.setError('At least one material is required for safety analysis')
      store.setLoading(false)
      return null
    }

    try {
      const response = await fetch('/api/experiments/safety', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          materials,
          equipment,
          temperatures,
          pressures,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Safety analysis failed')
      }

      const analysis = (await response.json()) as SafetyAnalysis

      store.setAnalysis(analysis)
      store.addToHistory(analysis)

      return analysis
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Safety analysis failed'
      store.setError(message)
      return null
    } finally {
      store.setLoading(false)
    }
  }, [store])

  // Quick hazard check (without API call)
  const quickHazardCheck = useCallback((materialName: string): HazardLevel | null => {
    const name = materialName.toLowerCase()

    // Known high-hazard materials
    const criticalMaterials = ['cadmium', 'arsenic', 'beryllium', 'mercury']
    const highMaterials = ['lead', 'lithium', 'hydrogen', 'hydrofluoric']
    const mediumMaterials = ['dmf', 'nmp', 'chlorobenzene', 'toluene']

    if (criticalMaterials.some((m) => name.includes(m))) return 'critical'
    if (highMaterials.some((m) => name.includes(m))) return 'high'
    if (mediumMaterials.some((m) => name.includes(m))) return 'medium'

    return null
  }, [])

  // Get hazards by level
  const hazardsByLevel = useMemo(() => {
    if (!store.analysis) return null

    return {
      critical: store.analysis.hazards.filter((h) => h.level === 'critical'),
      high: store.analysis.hazards.filter((h) => h.level === 'high'),
      medium: store.analysis.hazards.filter((h) => h.level === 'medium'),
      low: store.analysis.hazards.filter((h) => h.level === 'low'),
    }
  }, [store.analysis])

  // Get hazards by type
  const hazardsByType = useMemo(() => {
    if (!store.analysis) return null

    return {
      chemical: store.analysis.hazards.filter((h) => h.type === 'chemical'),
      physical: store.analysis.hazards.filter((h) => h.type === 'physical'),
      electrical: store.analysis.hazards.filter((h) => h.type === 'electrical'),
      radiation: store.analysis.hazards.filter((h) => h.type === 'radiation'),
      biological: store.analysis.hazards.filter((h) => h.type === 'biological'),
    }
  }, [store.analysis])

  // Get PPE by type
  const ppeByType = useMemo(() => {
    if (!store.analysis) return null

    return {
      eye: store.analysis.ppe.filter((p) => p.type === 'eye'),
      hand: store.analysis.ppe.filter((p) => p.type === 'hand'),
      body: store.analysis.ppe.filter((p) => p.type === 'body'),
      respiratory: store.analysis.ppe.filter((p) => p.type === 'respiratory'),
      foot: store.analysis.ppe.filter((p) => p.type === 'foot'),
    }
  }, [store.analysis])

  // Get risk level color
  const getRiskColor = useCallback((level: HazardLevel): string => {
    switch (level) {
      case 'critical':
        return 'text-red-500 bg-red-500/10'
      case 'high':
        return 'text-orange-500 bg-orange-500/10'
      case 'medium':
        return 'text-yellow-500 bg-yellow-500/10'
      case 'low':
        return 'text-green-500 bg-green-500/10'
    }
  }, [])

  // Generate safety checklist
  const generateChecklist = useMemo(() => {
    if (!store.analysis) return []

    const checklist: Array<{ item: string; category: string; required: boolean }> = []

    // PPE items
    for (const ppe of store.analysis.ppe) {
      checklist.push({
        item: ppe.item + (ppe.specification ? ` (${ppe.specification})` : ''),
        category: 'PPE',
        required: true,
      })
    }

    // Training requirements
    for (const training of store.analysis.training) {
      checklist.push({
        item: training,
        category: 'Training',
        required: true,
      })
    }

    // Documentation
    for (const doc of store.analysis.documentation) {
      checklist.push({
        item: doc,
        category: 'Documentation',
        required: true,
      })
    }

    // Engineering controls
    for (const control of store.analysis.engineeringControls) {
      checklist.push({
        item: control,
        category: 'Engineering Controls',
        required: store.analysis.riskLevel === 'critical' || store.analysis.riskLevel === 'high',
      })
    }

    return checklist
  }, [store.analysis])

  return {
    // State
    materials: store.materials,
    equipment: store.equipment,
    temperatures: store.temperatures,
    pressures: store.pressures,
    analysis: store.analysis,
    isLoading: store.isLoading,
    error: store.error,
    history: store.history,

    // Reference data
    knownChemicals,
    knownEquipment,
    ghsCodes: GHS_CODES,

    // Computed
    hazardsByLevel,
    hazardsByType,
    ppeByType,
    generateChecklist,

    // Actions
    setMaterials: store.setMaterials,
    addMaterial: store.addMaterial,
    removeMaterial: store.removeMaterial,
    setEquipment: store.setEquipment,
    addEquipment: store.addEquipment,
    removeEquipment: store.removeEquipment,
    setTemperatures: store.setTemperatures,
    setPressures: store.setPressures,
    reset: store.reset,
    clearHistory: store.clearHistory,

    // API functions
    fetchReferenceData,
    analyzeSafety,
    quickHazardCheck,
    getRiskColor,
  }
}
