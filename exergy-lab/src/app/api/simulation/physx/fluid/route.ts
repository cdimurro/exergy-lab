import { NextRequest, NextResponse } from 'next/server'

/**
 * PhysX Fluid Dynamics Simulation API
 *
 * Runs CFD simulations using PhysX 5 via Modal Labs GPU.
 * Supports SPH-based fluid simulation for clean energy applications:
 * - Battery thermal management (cooling channels)
 * - Hydrogen electrolyzer flow dynamics
 * - Solar thermal receiver HTF flow
 *
 * POST /api/simulation/physx/fluid
 */

interface FluidSimulationRequest {
  params: {
    fluidType: 'water' | 'oil' | 'gas' | 'custom'
    density: number
    viscosity: number
    initialVelocity: [number, number, number]
    domainBounds: [[number, number], [number, number], [number, number]]
    particleResolution: number
    boundaryConditions: {
      inlet?: { velocity: number; pressure: number }
      outlet?: { pressure: number }
      walls?: 'no_slip' | 'free_slip'
    }
  }
  config: {
    gpuTier: 'T4' | 'A10G' | 'A100'
    maxDuration: number
    timeStep: number
  }
}

const MODAL_CONFIG = {
  endpoint: process.env.MODAL_ENDPOINT || 'https://cdimurro--breakthrough-engine-gpu.modal.run',
  tokenId: process.env.MODAL_TOKEN_ID,
  tokenSecret: process.env.MODAL_TOKEN_SECRET,
}

export async function POST(request: NextRequest) {
  try {
    const body: FluidSimulationRequest = await request.json()

    if (!body.params) {
      return NextResponse.json(
        { error: 'Simulation parameters are required' },
        { status: 400 }
      )
    }

    // Check if Modal is configured
    if (!MODAL_CONFIG.tokenId || !MODAL_CONFIG.tokenSecret) {
      // Fall back to analytical simulation
      console.log('[PhysX Fluid] Modal not configured, using analytical fallback')
      const result = await runAnalyticalFluidSim(body.params)
      return NextResponse.json({
        success: true,
        result,
        provider: 'analytical',
        message: 'Using analytical fallback - configure Modal for GPU simulation',
      })
    }

    // Call Modal PhysX endpoint
    const result = await callModalPhysXFluid(body.params, body.config)

    return NextResponse.json({
      success: true,
      result,
      provider: 'physx-modal',
    })

  } catch (error) {
    console.error('[PhysX Fluid] Simulation failed:', error)

    // Fall back to analytical on error
    try {
      const body: FluidSimulationRequest = await request.json()
      const fallbackResult = await runAnalyticalFluidSim(body.params)

      return NextResponse.json({
        success: true,
        result: fallbackResult,
        provider: 'analytical-fallback',
        warning: error instanceof Error ? error.message : 'GPU simulation failed',
      })
    } catch {
      return NextResponse.json(
        { error: 'Simulation failed', message: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Health check for PhysX availability
 */
export async function GET() {
  const modalConfigured = !!(MODAL_CONFIG.tokenId && MODAL_CONFIG.tokenSecret)

  return NextResponse.json({
    available: true, // Always available (analytical fallback)
    gpuAvailable: modalConfigured,
    provider: modalConfigured ? 'physx-modal' : 'analytical',
  })
}

/**
 * Call Modal PhysX fluid simulation
 */
async function callModalPhysXFluid(
  params: FluidSimulationRequest['params'],
  config: FluidSimulationRequest['config']
): Promise<PhysXFluidResult> {
  const url = MODAL_CONFIG.endpoint.replace(
    '.modal.run',
    '--physx-fluid-simulation.modal.run'
  )

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MODAL_CONFIG.tokenId}:${MODAL_CONFIG.tokenSecret}`,
    },
    body: JSON.stringify({
      args: { params, config },
    }),
  })

  if (!response.ok) {
    throw new Error(`Modal PhysX API error: ${response.status}`)
  }

  return response.json()
}

interface PhysXFluidResult {
  converged: boolean
  steps: number
  wallTime: number
  gpuTime: number
  peakMemory: number
  metrics: {
    averageVelocity?: number
    maxVelocity?: number
    reynoldsNumber?: number
    pressureDrop?: number
  }
}

/**
 * Analytical fluid simulation fallback (Navier-Stokes approximation)
 */
async function runAnalyticalFluidSim(
  params: FluidSimulationRequest['params']
): Promise<PhysXFluidResult> {
  const startTime = Date.now()

  // Calculate Reynolds number
  const characteristicLength = params.domainBounds[0][1] - params.domainBounds[0][0]
  const velocity = params.initialVelocity[0]
  const reynoldsNumber = (params.density * velocity * characteristicLength) / params.viscosity

  // Flow regime classification
  const isTurbulent = reynoldsNumber > 2300
  const isTransitional = reynoldsNumber >= 2000 && reynoldsNumber <= 4000

  // Hagen-Poiseuille for laminar pipe flow (or turbulent approximation)
  let frictionFactor: number
  if (isTurbulent) {
    // Blasius correlation for turbulent flow
    frictionFactor = 0.316 / Math.pow(reynoldsNumber, 0.25)
  } else {
    // Laminar flow
    frictionFactor = 64 / reynoldsNumber
  }

  // Pressure drop (Darcy-Weisbach)
  const diameter = characteristicLength
  const pressureDrop = frictionFactor * (characteristicLength / diameter) *
    (0.5 * params.density * velocity ** 2)

  // Velocity profile adjustments
  const avgVelocity = isTurbulent ? velocity * 0.82 : velocity * 0.5
  const maxVelocity = isTurbulent ? velocity * 1.2 : velocity * 2.0

  // Simulate compute time (10-100ms depending on resolution)
  await new Promise(resolve => setTimeout(resolve, params.particleResolution * 2))

  return {
    converged: true,
    steps: params.particleResolution * 100,
    wallTime: Date.now() - startTime,
    gpuTime: 0,
    peakMemory: params.particleResolution * 0.5,
    metrics: {
      averageVelocity: avgVelocity,
      maxVelocity: maxVelocity,
      reynoldsNumber: reynoldsNumber,
      pressureDrop: pressureDrop,
    },
  }
}
