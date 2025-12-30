import { NextResponse } from 'next/server'

/**
 * PhysX Health Check API
 *
 * Returns the availability status of PhysX simulation capabilities.
 *
 * GET /api/simulation/physx/health
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
        description: 'CPU-based analytical approximations',
        cost: 0,
      },
      physx: {
        available: modalConfigured && modalReachable,
        description: 'NVIDIA PhysX 5 GPU simulation via Modal',
        requiresGPU: true,
        gpuTiers: ['T4', 'A10G', 'A100'],
        costPerRun: {
          T4: 0.01,
          A10G: 0.02,
          A100: 0.05,
        },
      },
    },
    capabilities: {
      fluidDynamics: true,
      thermalSimulation: true,
      rigidBody: true,
      particulate: true,
    },
    modalConfigured,
    modalReachable,
  })
}
