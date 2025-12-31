/**
 * Quick Calculators Module
 *
 * Domain-specific physics calculators for instant analytical results.
 * These calculators implement fundamental equations from clean energy physics.
 */

export * from './shockley-queisser'
export * from './betz-limit'
export * from './carnot-efficiency'
export * from './electrolysis'
export * from './battery-degradation'

// Calculator registry for dynamic access
export interface CalculatorDefinition {
  id: string
  name: string
  domain: string
  description: string
  inputs: CalculatorInput[]
  outputs: CalculatorOutput[]
  calculate: (inputs: Record<string, number>) => CalculatorResult
  formula?: string
  citation?: string
}

export interface CalculatorInput {
  id: string
  name: string
  unit: string
  defaultValue: number
  min?: number
  max?: number
  step?: number
  description?: string
}

export interface CalculatorOutput {
  id: string
  name: string
  unit: string
  description?: string
}

export interface CalculatorResult {
  outputs: Record<string, number>
  notes?: string[]
  warnings?: string[]
}

// Import all calculators
import { shockleyQueisserCalculator } from './shockley-queisser'
import { betzLimitCalculator } from './betz-limit'
import { carnotCalculator } from './carnot-efficiency'
import { electrolysisCalculator } from './electrolysis'
import { batteryDegradationCalculator } from './battery-degradation'

// Calculator registry
const CALCULATORS: CalculatorDefinition[] = [
  shockleyQueisserCalculator,
  betzLimitCalculator,
  carnotCalculator,
  electrolysisCalculator,
  batteryDegradationCalculator,
]

/**
 * Get all available calculators
 */
export function getAllCalculators(): CalculatorDefinition[] {
  return CALCULATORS
}

/**
 * Get calculators for a specific domain
 */
export function getCalculatorsByDomain(domain: string): CalculatorDefinition[] {
  return CALCULATORS.filter((calc) => calc.domain === domain)
}

/**
 * Get a calculator by ID
 */
export function getCalculatorById(id: string): CalculatorDefinition | undefined {
  return CALCULATORS.find((calc) => calc.id === id)
}
