/**
 * Quick Calculator API Route
 *
 * Provides fast analytical calculations for common clean energy formulas.
 * These are Tier 1 calculations that run instantly in the browser.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getAllCalculators,
  getCalculatorsByDomain,
  type CalculatorDefinition,
  type CalculatorResult,
} from '@/lib/simulation/quick-calculators'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface CalculatorRequest {
  calculatorId: string
  inputs: Record<string, number>
}

/**
 * POST /api/simulations/quick-calc
 * Execute a quick calculation
 */
export async function POST(request: NextRequest) {
  try {
    const { calculatorId, inputs } = (await request.json()) as CalculatorRequest

    if (!calculatorId) {
      return NextResponse.json(
        { error: 'Calculator ID is required' },
        { status: 400 }
      )
    }

    const calculators = getAllCalculators()
    const calculator = calculators.find((c) => c.id === calculatorId)

    if (!calculator) {
      return NextResponse.json(
        { error: `Calculator '${calculatorId}' not found` },
        { status: 404 }
      )
    }

    // Validate inputs
    const missingInputs = calculator.inputs
      .filter((input) => inputs[input.id] === undefined && input.defaultValue === undefined)
      .map((input) => input.id)

    if (missingInputs.length > 0) {
      return NextResponse.json(
        { error: `Missing required inputs: ${missingInputs.join(', ')}` },
        { status: 400 }
      )
    }

    // Merge with defaults
    const mergedInputs: Record<string, number> = {}
    for (const input of calculator.inputs) {
      mergedInputs[input.id] = inputs[input.id] ?? input.defaultValue ?? 0
    }

    // Execute calculation
    const result = calculator.calculate(mergedInputs)

    return NextResponse.json({
      calculatorId,
      calculatorName: calculator.name,
      domain: calculator.domain,
      inputs: mergedInputs,
      result,
      formula: calculator.formula,
      citation: calculator.citation,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Quick calculation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Calculation failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/simulations/quick-calc
 * List all available calculators
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const domain = searchParams.get('domain')

  const calculators = domain ? getCalculatorsByDomain(domain) : getAllCalculators()

  // Format for API response
  const formattedCalculators = calculators.map((calc: CalculatorDefinition) => ({
    id: calc.id,
    name: calc.name,
    domain: calc.domain,
    description: calc.description,
    inputs: calc.inputs,
    outputs: calc.outputs,
    formula: calc.formula,
    citation: calc.citation,
  }))

  // Group by domain
  const byDomain: Record<string, typeof formattedCalculators> = {}
  for (const calc of formattedCalculators) {
    if (!byDomain[calc.domain]) {
      byDomain[calc.domain] = []
    }
    byDomain[calc.domain].push(calc)
  }

  return NextResponse.json({
    total: calculators.length,
    calculators: formattedCalculators,
    byDomain,
    domains: Object.keys(byDomain),
  })
}
