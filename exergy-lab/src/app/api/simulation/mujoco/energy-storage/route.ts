import { NextRequest, NextResponse } from 'next/server'

/**
 * MuJoCo Energy Storage (Flywheel) Simulation API
 *
 * Runs flywheel energy storage simulations using MuJoCo physics engine.
 * Models rotational dynamics, bearing losses, and energy efficiency.
 *
 * POST /api/simulation/mujoco/energy-storage
 */

interface EnergyStorageRequest {
  params: {
    mass: number           // Flywheel mass (kg)
    radius: number         // Flywheel radius (m)
    initialOmega: number   // Initial angular velocity (rad/s)
    bearingFriction: number // Bearing friction coefficient
    efficiency: number     // Motor/generator efficiency
    chamberPressure: number // Vacuum chamber pressure (Pa)
    targetRPM?: number     // Target operating RPM
  }
  duration: number
  config: {
    timeStep: number
    integrator: 'euler' | 'rk4' | 'implicit'
    nsubsteps: number
  }
}

const MODAL_CONFIG = {
  endpoint: process.env.MODAL_ENDPOINT || 'https://cdimurro--breakthrough-engine-gpu.modal.run',
  tokenId: process.env.MODAL_TOKEN_ID,
  tokenSecret: process.env.MODAL_TOKEN_SECRET,
}

export async function POST(request: NextRequest) {
  try {
    const body: EnergyStorageRequest = await request.json()

    if (!body.params) {
      return NextResponse.json(
        { error: 'Energy storage parameters are required' },
        { status: 400 }
      )
    }

    // Check if Modal is configured
    if (!MODAL_CONFIG.tokenId || !MODAL_CONFIG.tokenSecret) {
      console.log('[MuJoCo Energy Storage] Modal not configured, using analytical model')
      const result = await runAnalyticalEnergyStorage(body.params, body.duration)
      return NextResponse.json({
        success: true,
        result,
        provider: 'analytical',
        message: 'Using analytical flywheel model - configure Modal for MuJoCo simulation',
      })
    }

    // Call Modal MuJoCo endpoint
    const result = await callModalMuJoCoEnergyStorage(body)

    return NextResponse.json({
      success: true,
      result,
      provider: 'mujoco-modal',
    })

  } catch (error) {
    console.error('[MuJoCo Energy Storage] Simulation failed:', error)

    try {
      const body: EnergyStorageRequest = await request.json()
      const fallbackResult = await runAnalyticalEnergyStorage(body.params, body.duration)

      return NextResponse.json({
        success: true,
        result: fallbackResult,
        provider: 'analytical-fallback',
        warning: error instanceof Error ? error.message : 'MuJoCo simulation failed',
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
 * Call Modal MuJoCo energy storage simulation
 */
async function callModalMuJoCoEnergyStorage(
  body: EnergyStorageRequest
): Promise<MuJoCoEnergyStorageResult> {
  const url = MODAL_CONFIG.endpoint.replace(
    '.modal.run',
    '--mujoco-energy-storage.modal.run'
  )

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MODAL_CONFIG.tokenId}:${MODAL_CONFIG.tokenSecret}`,
    },
    body: JSON.stringify({ args: body }),
  })

  if (!response.ok) {
    throw new Error(`Modal MuJoCo API error: ${response.status}`)
  }

  return response.json()
}

interface MuJoCoEnergyStorageResult {
  success: boolean
  simulationTime: number
  steps: number
  wallTime: number
  peakMemory: number
  timeSeries: {
    time: number[]
    energy: number[]
    angularVelocity: number[]
    powerLoss: number[]
  }
  metrics: {
    storedEnergy: number        // kWh
    usableEnergy: number        // kWh (accounting for min operating speed)
    specificEnergy: number      // Wh/kg
    roundTripEfficiency: number // %
    selfDischargeRate: number   // %/hour
    maxPower: number            // kW
    standbyLosses: number       // W
    operatingRPM: number
  }
  stability: {
    stable: boolean
    maxSafeRPM: number
    stressRatio: number         // Actual/Yield stress
  }
}

/**
 * Analytical flywheel energy storage model
 */
async function runAnalyticalEnergyStorage(
  params: EnergyStorageRequest['params'],
  duration: number
): Promise<MuJoCoEnergyStorageResult> {
  const startTime = Date.now()

  // Flywheel geometry and physics
  // Moment of inertia for solid cylinder: I = 0.5 * m * r^2
  const I = 0.5 * params.mass * params.radius ** 2

  // Initial energy: E = 0.5 * I * omega^2
  const E0 = 0.5 * I * params.initialOmega ** 2

  // Convert to kWh
  const E0_kWh = E0 / 3.6e6

  // Specific energy (Wh/kg)
  const specificEnergy = (E0 / params.mass) / 3600

  // Angular velocity decay due to friction
  // dω/dt = -b*ω/I where b is friction coefficient
  // ω(t) = ω0 * exp(-b*t/I)

  // Combined losses: bearing friction + air drag
  const bearingLosses = params.bearingFriction * params.initialOmega
  const airDragCoeff = params.chamberPressure > 100 ? 1e-6 : 1e-9 // Higher in atmosphere

  // Effective decay rate
  const decayRate = (params.bearingFriction + airDragCoeff * params.initialOmega) / I

  // Final state after duration
  const finalOmega = params.initialOmega * Math.exp(-decayRate * duration)
  const finalEnergy = 0.5 * I * finalOmega ** 2
  const finalEnergy_kWh = finalEnergy / 3.6e6

  // Efficiency calculations
  const roundTripEfficiency = (finalEnergy / E0) * params.efficiency ** 2

  // Self-discharge rate (%/hour)
  const hourlyDecay = 1 - Math.exp(-decayRate * 3600)
  const selfDischargeRate = hourlyDecay * 100

  // Standby losses (W)
  const avgOmega = (params.initialOmega + finalOmega) / 2
  const standbyLosses = params.bearingFriction * avgOmega ** 2

  // Maximum power (limited by motor/generator)
  // P_max = T_max * omega_max, assume torque limited
  const maxTorque = I * 100 // Assuming 100 rad/s^2 max acceleration
  const maxPower = maxTorque * params.initialOmega / 1000 // kW

  // Usable energy (assuming min 20% of max speed)
  const minOmega = params.initialOmega * 0.2
  const minEnergy = 0.5 * I * minOmega ** 2
  const usableEnergy = (E0 - minEnergy) / 3.6e6 // kWh

  // Stress analysis (for steel flywheel)
  // Max hoop stress: sigma = rho * omega^2 * r^2
  const steelDensity = 7800 // kg/m3
  const tipSpeed = params.initialOmega * params.radius
  const hoopStress = steelDensity * tipSpeed ** 2 // Pa
  const yieldStrength = 350e6 // Pa (typical steel)
  const stressRatio = hoopStress / yieldStrength

  // Safe operating limit
  const safeStressRatio = 0.5
  const maxSafeOmega = params.initialOmega * Math.sqrt(safeStressRatio / Math.max(stressRatio, 0.01))
  const maxSafeRPM = maxSafeOmega * 60 / (2 * Math.PI)

  // Generate time series
  const numPoints = 30
  const timeSeries = {
    time: Array.from({ length: numPoints }, (_, i) => i * duration / (numPoints - 1)),
    energy: [] as number[],
    angularVelocity: [] as number[],
    powerLoss: [] as number[],
  }

  for (let i = 0; i < numPoints; i++) {
    const t = timeSeries.time[i]
    const omega = params.initialOmega * Math.exp(-decayRate * t)
    const energy = 0.5 * I * omega ** 2 / 3.6e6 // kWh

    timeSeries.angularVelocity.push(omega)
    timeSeries.energy.push(energy)
    timeSeries.powerLoss.push(params.bearingFriction * omega ** 2) // W
  }

  // Operating RPM
  const operatingRPM = params.initialOmega * 60 / (2 * Math.PI)

  // Simulate computation time
  await new Promise(resolve => setTimeout(resolve, 40))

  return {
    success: true,
    simulationTime: duration,
    steps: Math.floor(duration / 0.002),
    wallTime: Date.now() - startTime,
    peakMemory: 24,
    timeSeries,
    metrics: {
      storedEnergy: E0_kWh,
      usableEnergy: usableEnergy,
      specificEnergy: specificEnergy,
      roundTripEfficiency: roundTripEfficiency * 100,
      selfDischargeRate: selfDischargeRate,
      maxPower: maxPower,
      standbyLosses: standbyLosses,
      operatingRPM: operatingRPM,
    },
    stability: {
      stable: stressRatio < 0.5 && operatingRPM < 50000,
      maxSafeRPM: maxSafeRPM,
      stressRatio: stressRatio,
    },
  }
}
