/**
 * Unified Simulation Execution API Route
 * Handles all 3 tiers: local, browser AI, and cloud GPU
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSimulationEngine } from '@/lib/simulation-engine'
import type { SimulationConfig, SimulationResult } from '@/types/simulation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max for cloud simulations

/**
 * POST /api/simulations/execute
 * Execute simulation based on tier selection
 */
export async function POST(request: NextRequest) {
  try {
    const config = (await request.json()) as SimulationConfig

    if (!config.tier) {
      return NextResponse.json({ error: 'Simulation tier is required' }, { status: 400 })
    }

    if (!config.title || !config.description) {
      return NextResponse.json(
        { error: 'Simulation title and description are required' },
        { status: 400 }
      )
    }

    // Create simulation engine
    const engine = createSimulationEngine()

    // Execute simulation
    const result = await engine.execute(config)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Simulation execution error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Simulation failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/simulations/execute
 * Get tier capabilities and pricing
 */
export async function GET() {
  return NextResponse.json({
    tiers: [
      {
        tier: 'local',
        name: 'Local Execution',
        description: 'JavaScript-based calculations in your browser',
        estimatedTime: '~10 seconds',
        accuracy: '±20%',
        cost: 'FREE',
        features: [
          'Monte Carlo sampling',
          'Basic physics calculations',
          'Quick estimates',
          'No external dependencies',
        ],
      },
      {
        tier: 'browser',
        name: 'Browser AI',
        description: 'AI-powered predictions using ML models',
        estimatedTime: '~2 minutes',
        accuracy: '±10%',
        cost: 'FREE (rate limited)',
        features: [
          'Machine learning predictions',
          'Historical data analysis',
          'Confidence intervals',
          'AI-generated insights',
        ],
      },
      {
        tier: 'cloud',
        name: 'Cloud GPU',
        description: 'Production-grade simulations on cloud infrastructure',
        estimatedTime: '~10 minutes',
        accuracy: '±2%',
        cost: '$0.50 - $2.00',
        features: [
          'Molecular dynamics',
          'Computational fluid dynamics',
          'Thermal analysis',
          'High-fidelity results',
        ],
      },
    ],
  })
}
