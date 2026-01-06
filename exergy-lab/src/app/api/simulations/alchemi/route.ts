/**
 * ALCHEMI Materials Discovery API Route
 *
 * GPU-accelerated materials science simulations using NVIDIA ALCHEMI toolkit.
 *
 * Endpoints:
 * - POST /api/simulations/alchemi - Execute materials simulation
 *
 * Actions:
 * - relax: Geometry relaxation
 * - screen_battery: Battery materials screening
 * - predict_properties: Molecular property prediction
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createALCHEMIProvider } from '@/lib/simulation/providers/alchemi-provider'

// ============================================================================
// Request Schemas
// ============================================================================

const AtomicStructureSchema = z.object({
  symbols: z.array(z.string()),
  positions: z.array(z.array(z.number())),
  cell: z.array(z.array(z.number())).optional(),
  pbc: z.array(z.boolean()).optional(),
})

const RelaxRequestSchema = z.object({
  action: z.literal('relax'),
  structure: AtomicStructureSchema,
  model: z.enum(['AIMNet2', 'MACE-MP-0', 'analytical']).default('analytical'),
  fmax: z.number().positive().default(0.05),
  maxSteps: z.number().int().positive().default(100),
})

const BatteryScreeningRequestSchema = z.object({
  action: z.literal('screen_battery'),
  candidates: z.array(AtomicStructureSchema),
  targetProperties: z.object({
    voltageRange: z.tuple([z.number(), z.number()]).optional(),
    capacityMin: z.number().optional(),
    stabilityThreshold: z.number().optional(),
  }).optional(),
  materialType: z.enum(['cathode', 'anode', 'electrolyte']).default('cathode'),
  model: z.enum(['AIMNet2', 'MACE-MP-0', 'analytical']).default('analytical'),
})

const PropertyPredictionRequestSchema = z.object({
  action: z.literal('predict_properties'),
  structures: z.array(AtomicStructureSchema),
  properties: z.array(z.string()).default(['energy', 'forces']),
  model: z.enum(['AIMNet2', 'MACE-MP-0', 'analytical']).default('analytical'),
})

const RequestSchema = z.discriminatedUnion('action', [
  RelaxRequestSchema,
  BatteryScreeningRequestSchema,
  PropertyPredictionRequestSchema,
])

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = RequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: parsed.error.format(),
        },
        { status: 400 }
      )
    }

    const request = parsed.data
    const provider = createALCHEMIProvider()

    // Check if provider is available
    const isAvailable = await provider.isAvailable()
    if (!isAvailable) {
      return NextResponse.json(
        {
          error: 'ALCHEMI provider not available',
          details: 'Modal API key not configured or service unavailable',
        },
        { status: 503 }
      )
    }

    let result: unknown

    switch (request.action) {
      case 'relax':
        result = await provider.relaxGeometry({
          structure: request.structure,
          model: request.model,
          fmax: request.fmax,
          maxSteps: request.maxSteps,
        })
        break

      case 'screen_battery':
        result = await provider.screenBatteryMaterials({
          candidates: request.candidates,
          targetProperties: request.targetProperties,
          materialType: request.materialType,
          model: request.model,
        })
        break

      case 'predict_properties':
        result = await provider.predictProperties({
          structures: request.structures,
          properties: request.properties,
          model: request.model,
        })
        break
    }

    return NextResponse.json({
      success: true,
      action: request.action,
      result,
    })
  } catch (error) {
    console.error('[ALCHEMI API] Error:', error)

    return NextResponse.json(
      {
        error: 'Simulation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  const provider = createALCHEMIProvider()
  const isAvailable = await provider.isAvailable()

  return NextResponse.json({
    provider: 'ALCHEMI Materials Discovery',
    version: '2.0',
    available: isAvailable,
    capabilities: [
      'geometry_relaxation',
      'battery_screening',
      'property_prediction',
    ],
    supportedModels: ['AIMNet2', 'MACE-MP-0', 'analytical'],
    billing: {
      gpuType: 'A100',
      ratePerHourUsd: 2.86,
      ratePerMinuteUsd: 0.0477,
    },
  })
}
