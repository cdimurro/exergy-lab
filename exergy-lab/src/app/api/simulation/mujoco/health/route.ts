import { NextResponse } from 'next/server'

/**
 * MuJoCo Health Check API
 *
 * Returns the availability status of MuJoCo simulation capabilities.
 *
 * GET /api/simulation/mujoco/health
 */

const MODAL_CONFIG = {
  endpoint: process.env.MODAL_ENDPOINT,
  tokenId: process.env.MODAL_TOKEN_ID,
  tokenSecret: process.env.MODAL_TOKEN_SECRET,
}

export async function GET() {
  const modalConfigured = !!(MODAL_CONFIG.tokenId && MODAL_CONFIG.tokenSecret)

  // Check Modal endpoint reachability if configured
  let modalReachable = false
  if (modalConfigured) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)

      const response = await fetch(`${MODAL_CONFIG.endpoint}/health`, {
        method: 'GET',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      modalReachable = response.ok
    } catch {
      modalReachable = false
    }
  }

  return NextResponse.json({
    available: true, // Always available (analytical fallback)
    providers: {
      analytical: {
        available: true,
        description: 'CPU-based analytical models for mechanical systems',
        cost: 0,
      },
      mujoco: {
        available: modalConfigured && modalReachable,
        description: 'DeepMind MuJoCo physics engine via Modal',
        requiresGPU: false, // MuJoCo is CPU-optimized
        costPerRun: 0.005, // Very low - CPU only
      },
    },
    capabilities: {
      windTurbine: {
        available: true,
        description: 'Wind turbine aerodynamics and power generation',
        metrics: ['power', 'rpm', 'tipSpeedRatio', 'powerCoefficient', 'AEP'],
      },
      energyStorage: {
        available: true,
        description: 'Flywheel energy storage dynamics',
        metrics: ['storedEnergy', 'efficiency', 'selfDischarge', 'maxPower'],
      },
      rigidBody: {
        available: true,
        description: 'General rigid body dynamics',
      },
      contactDynamics: {
        available: modalConfigured,
        description: 'Contact and collision simulation',
      },
    },
    modalConfigured,
    modalReachable,
  })
}
