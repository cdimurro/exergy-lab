/**
 * Equipment Specification System
 *
 * Equipment databases, sizing calculations, material selection, and performance specs
 * - Standard equipment configurations
 * - Sizing correlations
 * - Cost databases
 * - Performance specifications
 * - Material compatibility
 *
 * Based on Perry's Chemical Engineers' Handbook, Towler & Sinnott
 */

import type { EquipmentItem, EquipmentType, MaterialType } from '@/types/tea-process'

/**
 * Equipment sizing parameters
 */
export interface EquipmentSizingParams {
  type: EquipmentType
  capacity: number
  capacityUnit: string
  operatingConditions: {
    temperature?: number // °C
    pressure?: number // MPa
    flowRate?: number // kg/hr or m³/hr
  }
  serviceType?: string // e.g., "gas compression", "liquid pumping"
}

/**
 * Equipment specification template
 */
interface EquipmentTemplate {
  type: EquipmentType
  typicalSizes: Array<{
    capacity: number
    unit: string
    cost: number // USD, 2024 basis
    power?: number // kW
  }>
  sizingCorrelation?: {
    formula: string
    coefficients: number[]
    validRange: { min: number; max: number }
  }
  recommendedMaterials: MaterialType[]
  typicalEfficiency?: number // percentage
  maintenanceInterval?: number // hours
}

/**
 * Equipment database with templates
 */
const EQUIPMENT_DATABASE: Partial<Record<EquipmentType, EquipmentTemplate>> = {
  reactor: {
    type: 'reactor',
    typicalSizes: [
      { capacity: 10, unit: 'm³', cost: 50000 },
      { capacity: 50, unit: 'm³', cost: 150000 },
      { capacity: 100, unit: 'm³', cost: 250000 },
      { capacity: 500, unit: 'm³', cost: 800000 },
    ],
    recommendedMaterials: ['stainless_steel_316', 'hastelloy', 'titanium'],
    maintenanceInterval: 8760, // Annual
  },
  compressor: {
    type: 'compressor',
    typicalSizes: [
      { capacity: 100, unit: 'kW', cost: 80000, power: 100 },
      { capacity: 500, unit: 'kW', cost: 250000, power: 500 },
      { capacity: 1000, unit: 'kW', cost: 450000, power: 1000 },
      { capacity: 5000, unit: 'kW', cost: 1500000, power: 5000 },
    ],
    typicalEfficiency: 75, // Isentropic efficiency
    recommendedMaterials: ['carbon_steel', 'stainless_steel_304'],
    maintenanceInterval: 4380, // Semi-annual
  },
  heat_exchanger: {
    type: 'heat_exchanger',
    typicalSizes: [
      { capacity: 100, unit: 'm²', cost: 30000 },
      { capacity: 500, unit: 'm²', cost: 100000 },
      { capacity: 1000, unit: 'm²', cost: 180000 },
      { capacity: 5000, unit: 'm²', cost: 650000 },
    ],
    recommendedMaterials: ['carbon_steel', 'stainless_steel_304', 'titanium'],
    maintenanceInterval: 8760,
  },
  pump: {
    type: 'pump',
    typicalSizes: [
      { capacity: 10, unit: 'kW', cost: 5000, power: 10 },
      { capacity: 50, unit: 'kW', cost: 15000, power: 50 },
      { capacity: 100, unit: 'kW', cost: 25000, power: 100 },
      { capacity: 500, unit: 'kW', cost: 80000, power: 500 },
    ],
    typicalEfficiency: 70, // Pump efficiency
    recommendedMaterials: ['carbon_steel', 'stainless_steel_316'],
    maintenanceInterval: 4380,
  },
  separator: {
    type: 'separator',
    typicalSizes: [
      { capacity: 20, unit: 'm³', cost: 40000 },
      { capacity: 100, unit: 'm³', cost: 120000 },
      { capacity: 300, unit: 'm³', cost: 280000 },
    ],
    recommendedMaterials: ['carbon_steel', 'stainless_steel_304'],
    maintenanceInterval: 8760,
  },
  tank: {
    type: 'tank',
    typicalSizes: [
      { capacity: 50, unit: 'm³', cost: 25000 },
      { capacity: 200, unit: 'm³', cost: 70000 },
      { capacity: 1000, unit: 'm³', cost: 250000 },
      { capacity: 5000, unit: 'm³', cost: 900000 },
    ],
    recommendedMaterials: ['carbon_steel', 'stainless_steel_304'],
    maintenanceInterval: 17520, // Every 2 years
  },
}

/**
 * Equipment Sizing Engine
 */
export class EquipmentSizingEngine {
  /**
   * Size equipment based on process requirements
   */
  sizeEquipment(params: EquipmentSizingParams): EquipmentItem {
    const template = EQUIPMENT_DATABASE[params.type]

    if (!template) {
      return this.createDefaultEquipment(params)
    }

    // Find closest size match
    const matchedSize = this.findClosestSize(template.typicalSizes, params.capacity)

    // Scale cost if needed
    const scaledCost = this.scaleCost(
      matchedSize.cost,
      matchedSize.capacity,
      params.capacity,
      0.6
    )

    // Select material
    const material = this.selectMaterial(params.type, params.operatingConditions)

    return {
      id: `${params.type}-001`,
      equipmentNumber: `${params.type.substring(0, 3).toUpperCase()}-001`,
      type: params.type,
      description: `${params.type} - ${params.capacity} ${params.capacityUnit}`,
      quantity: 1,
      size: `${params.capacity} ${params.capacityUnit}`,
      material,
      cost: {
        equipment: scaledCost,
        installation: scaledCost * 1.5, // Typical installation factor
        total: scaledCost * 2.5,
      },
      specifications: {
        designPressure: params.operatingConditions.pressure
          ? { value: params.operatingConditions.pressure * 1.1, unit: 'MPa' }
          : undefined,
        designTemperature: params.operatingConditions.temperature
          ? { value: params.operatingConditions.temperature + 50, unit: '°C' }
          : undefined,
        capacity: { value: params.capacity, unit: params.capacityUnit },
        efficiency: template.typicalEfficiency,
        powerConsumption: matchedSize.power ? { value: matchedSize.power, unit: 'kW' } : undefined,
      },
      operating: {
        dutyCycle: 90, // 90% typical
        maintenanceInterval: template.maintenanceInterval,
        expectedLifetime: 20, // years
      },
    }
  }

  /**
   * Find closest size match from database
   */
  private findClosestSize(
    sizes: Array<{ capacity: number; unit: string; cost: number }>,
    targetCapacity: number
  ): { capacity: number; unit: string; cost: number; power?: number } {
    return sizes.reduce((closest, current) => {
      const closestDiff = Math.abs(closest.capacity - targetCapacity)
      const currentDiff = Math.abs(current.capacity - targetCapacity)
      return currentDiff < closestDiff ? current : closest
    })
  }

  /**
   * Scale cost using power law
   */
  private scaleCost(
    referenceCost: number,
    referenceSize: number,
    targetSize: number,
    exponent: number
  ): number {
    return referenceCost * Math.pow(targetSize / referenceSize, exponent)
  }

  /**
   * Select appropriate material based on operating conditions
   */
  private selectMaterial(
    equipmentType: EquipmentType,
    conditions: EquipmentSizingParams['operatingConditions']
  ): MaterialType {
    const temp = conditions.temperature || 25
    const pressure = conditions.pressure || 0.1

    // High temperature (>200°C) or high pressure (>5 MPa)
    if (temp > 200 || pressure > 5) {
      return 'stainless_steel_316'
    }

    // Moderate conditions
    if (temp > 100 || pressure > 1) {
      return 'stainless_steel_304'
    }

    // Mild conditions
    return 'carbon_steel'
  }

  /**
   * Create default equipment when no template available
   */
  private createDefaultEquipment(params: EquipmentSizingParams): EquipmentItem {
    return {
      id: `${params.type}-001`,
      equipmentNumber: 'CUSTOM-001',
      type: params.type,
      description: `Custom ${params.type}`,
      quantity: 1,
      size: `${params.capacity} ${params.capacityUnit}`,
      material: 'carbon_steel',
      cost: {
        equipment: 100000,
        installation: 150000,
        total: 250000,
      },
      specifications: {
        capacity: { value: params.capacity, unit: params.capacityUnit },
      },
    }
  }
}

/**
 * Equipment List Generator
 * Creates complete equipment lists for TEA reports
 */
export class EquipmentListGenerator {
  /**
   * Generate complete equipment list from process data
   */
  generateEquipmentList(params: {
    technology: string
    capacity: number // MW or other primary metric
    processStreams: any[]
  }): EquipmentItem[] {
    // This would analyze process requirements and generate full equipment list
    // For now, return template-based list
    return []
  }

  /**
   * Calculate total equipment cost
   */
  calculateTotalCost(equipment: EquipmentItem[]): {
    totalEquipment: number
    totalInstallation: number
    totalInstalled: number
    byType: Record<string, number>
  } {
    let totalEquipment = 0
    let totalInstallation = 0
    const byType: Record<string, number> = {}

    for (const item of equipment) {
      totalEquipment += item.cost.equipment * item.quantity
      totalInstallation += item.cost.installation * item.quantity

      if (!byType[item.type]) {
        byType[item.type] = 0
      }
      byType[item.type] += item.cost.total * item.quantity
    }

    return {
      totalEquipment,
      totalInstallation,
      totalInstalled: totalEquipment + totalInstallation,
      byType,
    }
  }
}

/**
 * Material Selection Guide
 * Helps select appropriate materials based on service conditions
 */
export class MaterialSelector {
  /**
   * Recommend material based on conditions and fluid
   */
  recommendMaterial(conditions: {
    temperature: number // °C
    pressure: number // MPa
    fluid: string
    corrosive: boolean
  }): {
    recommended: MaterialType
    alternatives: MaterialType[]
    rationale: string
  } {
    // High corrosion service
    if (conditions.corrosive || conditions.fluid.includes('acid')) {
      return {
        recommended: 'hastelloy',
        alternatives: ['stainless_steel_317', 'titanium'],
        rationale: 'Corrosive service requires high-alloy materials',
      }
    }

    // High temperature service (>400°C)
    if (conditions.temperature > 400) {
      return {
        recommended: 'stainless_steel_316',
        alternatives: ['stainless_steel_317', 'nickel_alloy'],
        rationale: 'High temperature requires austenitic stainless steel or better',
      }
    }

    // High pressure service (>10 MPa)
    if (conditions.pressure > 10) {
      return {
        recommended: 'stainless_steel_316',
        alternatives: ['stainless_steel_304'],
        rationale: 'High pressure requires higher strength materials',
      }
    }

    // Moderate conditions
    if (conditions.temperature > 100 || conditions.pressure > 1) {
      return {
        recommended: 'stainless_steel_304',
        alternatives: ['carbon_steel'],
        rationale: 'Moderate conditions suitable for SS304',
      }
    }

    // Mild conditions
    return {
      recommended: 'carbon_steel',
      alternatives: ['stainless_steel_304'],
      rationale: 'Mild conditions allow carbon steel (lowest cost)',
    }
  }
}

/**
 * Convenience functions
 */

/**
 * Create equipment specification
 */
export function createEquipmentSpec(params: EquipmentSizingParams): EquipmentItem {
  const engine = new EquipmentSizingEngine()
  return engine.sizeEquipment(params)
}

/**
 * Get equipment template
 */
export function getEquipmentTemplate(type: EquipmentType): EquipmentTemplate | undefined {
  return EQUIPMENT_DATABASE[type]
}

/**
 * Calculate auxiliary power load for equipment
 */
export function calculateAuxiliaryLoad(equipment: EquipmentItem[]): {
  totalLoad: number // kW
  breakdown: Record<string, number>
  annualConsumption: number // kWh/year
} {
  let totalLoad = 0
  const breakdown: Record<string, number> = {}

  for (const item of equipment) {
    const power = item.specifications.powerConsumption?.value || 0
    const dutyCycle = item.operating?.dutyCycle || 100
    const effectivePower = power * (dutyCycle / 100)

    totalLoad += effectivePower * item.quantity
    breakdown[item.id] = effectivePower * item.quantity
  }

  const annualConsumption = totalLoad * 8760 // kWh/year

  return {
    totalLoad,
    breakdown,
    annualConsumption,
  }
}
