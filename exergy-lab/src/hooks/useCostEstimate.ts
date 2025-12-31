'use client'

import { useState, useCallback, useMemo } from 'react'
import { create } from 'zustand'

// ============================================================================
// Types
// ============================================================================

export interface Material {
  name: string
  quantity: number
  unit: string
  category?: 'chemical' | 'consumable' | 'equipment' | 'substrate' | 'other'
  purity?: string
}

export interface MaterialCost {
  name: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
  priceSource: 'database' | 'estimated'
  volatility: 'low' | 'medium' | 'high'
}

export interface EquipmentCost {
  name: string
  hourlyRate: number
  estimatedHours: number
  totalCost: number
}

export interface CostBreakdown {
  materials: {
    items: MaterialCost[]
    subtotal: number
    uncertainty: number
  }
  equipment: {
    items: EquipmentCost[]
    subtotal: number
  }
  labor: {
    hours: number
    hourlyRate: number
    subtotal: number
  }
  overhead: {
    percentage: number
    amount: number
  }
  regional: {
    region: string
    factor: number
    adjustment: number
  }
  total: {
    base: number
    adjusted: number
    uncertainty: number
    range: [number, number]
  }
  recommendations: string[]
}

export interface CostEstimateState {
  materials: Material[]
  equipment: string[]
  laborHours: number
  region: string
  breakdown: CostBreakdown | null
  isLoading: boolean
  error: string | null
  history: Array<{ id: string; timestamp: number; breakdown: CostBreakdown }>

  // Actions
  setMaterials: (materials: Material[]) => void
  addMaterial: (material: Material) => void
  removeMaterial: (index: number) => void
  updateMaterial: (index: number, material: Material) => void
  setEquipment: (equipment: string[]) => void
  addEquipment: (equipment: string) => void
  removeEquipment: (index: number) => void
  setLaborHours: (hours: number) => void
  setRegion: (region: string) => void
  setBreakdown: (breakdown: CostBreakdown | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  addToHistory: (breakdown: CostBreakdown) => void
  clearHistory: () => void
  reset: () => void
}

// ============================================================================
// Store
// ============================================================================

const initialState = {
  materials: [],
  equipment: [],
  laborHours: 8,
  region: 'default',
  breakdown: null,
  isLoading: false,
  error: null,
  history: [],
}

export const useCostEstimateStore = create<CostEstimateState>((set) => ({
  ...initialState,

  setMaterials: (materials) => set({ materials }),

  addMaterial: (material) =>
    set((state) => ({ materials: [...state.materials, material] })),

  removeMaterial: (index) =>
    set((state) => ({
      materials: state.materials.filter((_, i) => i !== index),
    })),

  updateMaterial: (index, material) =>
    set((state) => ({
      materials: state.materials.map((m, i) => (i === index ? material : m)),
    })),

  setEquipment: (equipment) => set({ equipment }),

  addEquipment: (equipment) =>
    set((state) => ({ equipment: [...state.equipment, equipment] })),

  removeEquipment: (index) =>
    set((state) => ({
      equipment: state.equipment.filter((_, i) => i !== index),
    })),

  setLaborHours: (hours) => set({ laborHours: hours }),
  setRegion: (region) => set({ region }),
  setBreakdown: (breakdown) => set({ breakdown }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  addToHistory: (breakdown) =>
    set((state) => ({
      history: [
        { id: `cost_${Date.now()}`, timestamp: Date.now(), breakdown },
        ...state.history,
      ].slice(0, 20),
    })),

  clearHistory: () => set({ history: [] }),
  reset: () => set(initialState),
}))

// ============================================================================
// Hook
// ============================================================================

export function useCostEstimate() {
  const store = useCostEstimateStore()
  const [availableMaterials, setAvailableMaterials] = useState<Array<{
    name: string
    price: number
    unit: string
    volatility: 'low' | 'medium' | 'high'
  }>>([])
  const [availableEquipment, setAvailableEquipment] = useState<Array<{
    name: string
    hourlyRate: number
  }>>([])
  const [availableRegions, setAvailableRegions] = useState<Array<{
    region: string
    factor: number
    laborRate: number
  }>>([])

  // Fetch reference data (materials, equipment, regions)
  const fetchReferenceData = useCallback(async () => {
    try {
      const response = await fetch('/api/experiments/cost')

      if (!response.ok) {
        throw new Error('Failed to fetch reference data')
      }

      const data = await response.json()

      setAvailableMaterials(data.materials || [])
      setAvailableEquipment(data.equipment || [])
      setAvailableRegions(data.regions || [])

      return data
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch reference data'
      store.setError(message)
      return null
    }
  }, [store])

  // Estimate costs
  const estimateCosts = useCallback(async (
    domain: string,
    options?: {
      materials?: Material[]
      equipment?: string[]
      laborHours?: number
      region?: string
    }
  ): Promise<CostBreakdown | null> => {
    store.setLoading(true)
    store.setError(null)

    const materials = options?.materials || store.materials
    const equipment = options?.equipment || store.equipment
    const laborHours = options?.laborHours ?? store.laborHours
    const region = options?.region || store.region

    if (materials.length === 0) {
      store.setError('At least one material is required')
      store.setLoading(false)
      return null
    }

    try {
      const response = await fetch('/api/experiments/cost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          materials,
          equipment,
          laborHours,
          region,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Cost estimation failed')
      }

      const breakdown = (await response.json()) as CostBreakdown

      store.setBreakdown(breakdown)
      store.addToHistory(breakdown)

      return breakdown
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cost estimation failed'
      store.setError(message)
      return null
    } finally {
      store.setLoading(false)
    }
  }, [store])

  // Calculate quick estimate without API call
  const quickEstimate = useCallback((materials: Material[]): number => {
    // Simple estimation based on typical lab costs
    let total = 0

    for (const mat of materials) {
      // Find in reference data or use default
      const ref = availableMaterials.find(
        (m) => m.name.toLowerCase() === mat.name.toLowerCase()
      )

      if (ref) {
        total += ref.price * mat.quantity
      } else {
        // Default price per unit
        total += 25 * mat.quantity
      }
    }

    // Add overhead estimate (20%)
    return total * 1.2
  }, [availableMaterials])

  // Get material suggestions based on domain
  const getMaterialSuggestions = useCallback((domain: string): Material[] => {
    const suggestions: Record<string, Material[]> = {
      solar: [
        { name: 'Lead Iodide', quantity: 0.5, unit: 'g', category: 'chemical' },
        { name: 'MAI', quantity: 0.3, unit: 'g', category: 'chemical' },
        { name: 'DMF', quantity: 50, unit: 'mL', category: 'chemical' },
        { name: 'ITO Glass', quantity: 10, unit: 'piece', category: 'substrate' },
        { name: 'Spiro-OMeTAD', quantity: 0.1, unit: 'g', category: 'chemical' },
      ],
      battery: [
        { name: 'Lithium Carbonate', quantity: 100, unit: 'g', category: 'chemical' },
        { name: 'Graphite', quantity: 200, unit: 'g', category: 'chemical' },
        { name: 'NMP', quantity: 100, unit: 'mL', category: 'chemical' },
        { name: 'PVDF', quantity: 20, unit: 'g', category: 'chemical' },
      ],
      hydrogen: [
        { name: 'Nafion', quantity: 5, unit: 'mL', category: 'chemical' },
        { name: 'Platinum', quantity: 0.01, unit: 'g', category: 'chemical' },
        { name: 'Carbon Cloth', quantity: 50, unit: 'cm2', category: 'substrate' },
        { name: 'Nickel Foam', quantity: 100, unit: 'cm2', category: 'substrate' },
      ],
      wind: [
        { name: 'Carbon Fiber', quantity: 1000, unit: 'g', category: 'consumable' },
        { name: 'Epoxy Resin', quantity: 500, unit: 'mL', category: 'chemical' },
      ],
    }

    return suggestions[domain] || []
  }, [])

  // Calculate cost breakdown percentages
  const costPercentages = useMemo(() => {
    if (!store.breakdown) return null

    const total = store.breakdown.total.adjusted

    return {
      materials: (store.breakdown.materials.subtotal / total) * 100,
      equipment: (store.breakdown.equipment.subtotal / total) * 100,
      labor: (store.breakdown.labor.subtotal / total) * 100,
      overhead: (store.breakdown.overhead.amount / total) * 100,
    }
  }, [store.breakdown])

  // Get cost optimization suggestions
  const optimizationSuggestions = useMemo(() => {
    if (!store.breakdown) return []

    const suggestions: string[] = []

    // Check for high-cost materials
    const expensiveMaterials = store.breakdown.materials.items.filter(
      (m) => m.totalPrice > store.breakdown!.total.adjusted * 0.2
    )

    if (expensiveMaterials.length > 0) {
      suggestions.push(
        `Consider alternatives for ${expensiveMaterials.map((m) => m.name).join(', ')} - they represent >20% of total cost.`
      )
    }

    // Check for high equipment costs
    if (store.breakdown.equipment.subtotal > store.breakdown.total.adjusted * 0.3) {
      suggestions.push(
        'Equipment costs are high. Consider scheduling efficiency or shared equipment access.'
      )
    }

    // Add breakdown recommendations
    suggestions.push(...store.breakdown.recommendations)

    return suggestions
  }, [store.breakdown])

  return {
    // State
    materials: store.materials,
    equipment: store.equipment,
    laborHours: store.laborHours,
    region: store.region,
    breakdown: store.breakdown,
    isLoading: store.isLoading,
    error: store.error,
    history: store.history,

    // Reference data
    availableMaterials,
    availableEquipment,
    availableRegions,

    // Computed
    costPercentages,
    optimizationSuggestions,

    // Actions
    setMaterials: store.setMaterials,
    addMaterial: store.addMaterial,
    removeMaterial: store.removeMaterial,
    updateMaterial: store.updateMaterial,
    setEquipment: store.setEquipment,
    addEquipment: store.addEquipment,
    removeEquipment: store.removeEquipment,
    setLaborHours: store.setLaborHours,
    setRegion: store.setRegion,
    reset: store.reset,
    clearHistory: store.clearHistory,

    // API functions
    fetchReferenceData,
    estimateCosts,
    quickEstimate,
    getMaterialSuggestions,
  }
}
