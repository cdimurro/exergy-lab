/**
 * Validate Experiment Protocol API
 *
 * POST: Starts validation, returns validationId
 * GET: Streams progress events via SSE
 *
 * Runs 4 validation stages:
 * 1. Literature Alignment (10-30%)
 * 2. Materials Safety (30-50%)
 * 3. Equipment Feasibility (50-70%)
 * 4. Cost Accuracy (70-100%)
 */

import { NextRequest, NextResponse } from 'next/server'
import type {
  ValidateProtocolRequest,
  ProtocolValidation,
  ValidationEvent,
} from '@/types/experiment-workflow'
import {
  validateLiteratureAlignment,
  validateMaterialsSafety,
  validateEquipmentFeasibility,
  validateCostAccuracy,
} from '@/lib/validation/experiments'

// ============================================================================
// Event Storage (In-Memory for MVP)
// ============================================================================

interface StoredEvents {
  events: ValidationEvent[]
  completed: boolean
}

const eventStore = new Map<string, StoredEvents>()

function addEvent(validationId: string, event: ValidationEvent) {
  const stored = eventStore.get(validationId) || { events: [], completed: false }
  stored.events.push(event)
  if (event.type === 'complete' || event.type === 'error') {
    stored.completed = true
  }
  eventStore.set(validationId, stored)
}

function getEvents(validationId: string): ValidationEvent[] {
  return eventStore.get(validationId)?.events || []
}

function clearEvents(validationId: string) {
  eventStore.delete(validationId)
}

// ============================================================================
// POST: Start Validation
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: ValidateProtocolRequest = await request.json()
    const { plan, sourcePapers } = body

    // Validate required fields
    if (!plan) {
      return NextResponse.json({ error: 'Plan is required' }, { status: 400 })
    }

    // Generate unique validation ID
    const validationId = `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Clear old events (keep only last 100 validation IDs)
    if (eventStore.size > 100) {
      const oldestKeys = Array.from(eventStore.keys()).slice(0, 50)
      oldestKeys.forEach((key) => eventStore.delete(key))
    }

    // Start async validation (don't await)
    validateProtocolAsync(validationId, plan, sourcePapers).catch((error) => {
      console.error('[ValidateProtocol] Error:', error)
      addEvent(validationId, {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    })

    return NextResponse.json({ validationId, status: 'started' })
  } catch (error) {
    console.error('[ValidateProtocol] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to start validation' },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET: Stream Progress Events
// ============================================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const validationId = searchParams.get('validationId')
  const stream = searchParams.get('stream') === 'true'

  if (!validationId) {
    return NextResponse.json({ error: 'validationId required' }, { status: 400 })
  }

  if (!stream) {
    // Return all events as JSON
    const events = getEvents(validationId)
    return NextResponse.json({ events })
  }

  // Set up SSE stream
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      const events = getEvents(validationId)

      // Send all existing events
      for (const event of events) {
        const data = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
        controller.enqueue(encoder.encode(data))

        // If completed or error, close stream
        if (event.type === 'complete' || event.type === 'error') {
          setTimeout(() => clearEvents(validationId), 5000)
          controller.close()
          return
        }
      }

      // If no events yet, poll for new events
      if (events.length === 0) {
        const pollInterval = setInterval(() => {
          const newEvents = getEvents(validationId)
          const unsentEvents = newEvents.slice(events.length)

          for (const event of unsentEvents) {
            const data = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
            controller.enqueue(encoder.encode(data))

            if (event.type === 'complete' || event.type === 'error') {
              clearInterval(pollInterval)
              setTimeout(() => clearEvents(validationId), 5000)
              controller.close()
              return
            }
          }

          // Timeout after 3 minutes
          if (Date.now() - parseInt(validationId.split('_')[1]) > 180000) {
            clearInterval(pollInterval)
            controller.enqueue(
              encoder.encode(
                `event: error\ndata: ${JSON.stringify({ error: 'Timeout' })}\n\n`
              )
            )
            controller.close()
          }
        }, 500)
      } else {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

// ============================================================================
// Async Validation Function
// ============================================================================

async function validateProtocolAsync(
  validationId: string,
  plan: any,
  sourcePapers?: any
) {
  try {
    const validation: Partial<ProtocolValidation> = {}

    // Stage 1: Literature Alignment (10-30%)
    addEvent(validationId, {
      type: 'progress',
      phase: 'literature',
      percentage: 10,
      message: 'Comparing with published protocols...',
    })

    const literatureResult = await validateLiteratureAlignment(plan, sourcePapers)
    validation.literatureAlignment = literatureResult

    addEvent(validationId, {
      type: 'literature_complete',
      phase: 'literature',
      percentage: 30,
      data: { literatureAlignment: literatureResult },
    })

    // Stage 2: Materials Safety (30-50%)
    addEvent(validationId, {
      type: 'progress',
      phase: 'safety',
      percentage: 30,
      message: 'Checking MSDS database...',
    })

    const safetyResult = await validateMaterialsSafety(plan.materials)
    validation.materialSafety = safetyResult

    addEvent(validationId, {
      type: 'safety_complete',
      phase: 'safety',
      percentage: 50,
      data: { materialSafety: safetyResult },
    })

    // Stage 3: Equipment Feasibility (50-70%)
    addEvent(validationId, {
      type: 'progress',
      phase: 'equipment',
      percentage: 50,
      message: 'Validating equipment access...',
    })

    const equipmentResult = await validateEquipmentFeasibility(plan.equipment)
    validation.equipmentFeasibility = equipmentResult

    addEvent(validationId, {
      type: 'equipment_complete',
      phase: 'equipment',
      percentage: 70,
      data: { equipmentFeasibility: equipmentResult },
    })

    // Stage 4: Cost Accuracy (70-100%)
    addEvent(validationId, {
      type: 'progress',
      phase: 'cost',
      percentage: 70,
      message: 'Fetching real-time pricing...',
    })

    const costResult = await validateCostAccuracy(plan.materials)
    validation.costAccuracy = costResult

    addEvent(validationId, {
      type: 'cost_complete',
      phase: 'cost',
      percentage: 90,
      data: { costAccuracy: costResult },
    })

    // Complete
    addEvent(validationId, {
      type: 'progress',
      percentage: 95,
      message: 'Finalizing validation...',
    })

    addEvent(validationId, {
      type: 'complete',
      percentage: 100,
      validation: validation as ProtocolValidation,
    })
  } catch (error) {
    console.error('[ValidateProtocol] Validation error:', error)
    addEvent(validationId, {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}
