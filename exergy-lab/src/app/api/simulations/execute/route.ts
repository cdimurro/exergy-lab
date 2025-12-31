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
        name: 'Tier 1: Analytical',
        description: 'Physics-based analytical calculations with real data sources',
        estimatedTime: '< 1 second',
        accuracy: '+/- 5-10%',
        cost: 'FREE',
        features: [
          'Thermodynamic cycle analysis',
          'Electrochemical calculations',
          'NREL ATB data integration',
          'Uncertainty quantification',
        ],
      },
      {
        tier: 'browser',
        name: 'Tier 2: T4 GPU',
        description: 'GPU-accelerated Monte Carlo simulations via Modal',
        estimatedTime: '1-5 seconds',
        accuracy: '+/- 2-5%',
        cost: '~$0.01',
        features: [
          'Monte Carlo with 10K iterations',
          'Confidence interval calculation',
          'Vectorized GPU computation',
          'Sensitivity analysis',
        ],
      },
      {
        tier: 'cloud',
        name: 'Tier 3: A10G GPU',
        description: 'High-fidelity parametric sweeps on A10G/A100 GPU',
        estimatedTime: '5-30 seconds',
        accuracy: '+/- 1-2%',
        cost: '~$0.02',
        features: [
          'Parametric sweep optimization',
          'Multi-dimensional analysis',
          '100K+ Monte Carlo iterations',
          'Publication-grade results',
        ],
      },
    ],
  })
}
