/**
 * Simulation Plan Execution API
 *
 * Executes an approved simulation plan using the SimulationEngine.
 * Streams progress updates via SSE.
 *
 * Endpoints:
 * - POST /api/simulations/execute-plan → Start plan execution
 * - GET  /api/simulations/execute-plan?executionId=xxx&stream=true → SSE progress
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSimulationEngine } from '@/lib/simulation-engine'
import type { SimulationConfig, SimulationResult, SimulationParameter } from '@/types/simulation'
import type { SimulationPlan, SimulationPlanParameter } from '@/types/simulation-workflow'

// In-memory store for active executions
const activeExecutions = new Map<string, {
  status: 'pending' | 'running' | 'complete' | 'error'
  events: ExecutionEvent[]
  result?: SimulationResult
  error?: string
  startTime: number
}>()

interface ExecutionEvent {
  type: 'progress' | 'complete' | 'error'
  phase?: string
  percentage?: number
  message?: string
  eta?: number | null
  result?: SimulationResult
  error?: string
}

// ============================================================================
// POST - Start Plan Execution
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { plan } = body as { plan: SimulationPlan }

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan is required' },
        { status: 400 }
      )
    }

    // Generate execution ID
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    // Initialize execution state
    activeExecutions.set(executionId, {
      status: 'pending',
      events: [],
      startTime: Date.now(),
    })

    // Start execution in background
    executeSimulationAsync(executionId, plan)

    console.log(`[SimulationExecution] Started execution ${executionId} for plan ${plan.id}`)

    return NextResponse.json({
      executionId,
      status: 'started',
    })
  } catch (error) {
    console.error('[SimulationExecution] Failed to start execution:', error)
    return NextResponse.json(
      {
        error: 'Failed to start execution',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET - Stream Progress / Get Results
// ============================================================================

export async function GET(request: NextRequest) {
  const executionId = request.nextUrl.searchParams.get('executionId')
  const streamMode = request.nextUrl.searchParams.get('stream') !== 'false'

  if (!executionId) {
    return NextResponse.json({ error: 'executionId required' }, { status: 400 })
  }

  const execution = activeExecutions.get(executionId)
  if (!execution) {
    return NextResponse.json({ error: 'Execution not found' }, { status: 404 })
  }

  // Non-streaming mode: return current status
  if (!streamMode) {
    return NextResponse.json({
      executionId,
      status: execution.status,
      result: execution.result,
      error: execution.error,
      duration: Date.now() - execution.startTime,
    })
  }

  // Streaming mode: SSE
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  let isStreamClosed = false
  let lastEventIndex = 0

  const safeCloseStream = async () => {
    if (isStreamClosed) return
    isStreamClosed = true
    try {
      await writer.close()
    } catch {
      // Already closed
    }
  }

  // Stream events
  const streamInterval = setInterval(async () => {
    if (isStreamClosed) {
      clearInterval(streamInterval)
      return
    }

    try {
      const currentExecution = activeExecutions.get(executionId)
      if (!currentExecution) {
        clearInterval(streamInterval)
        await safeCloseStream()
        return
      }

      // Send any new events
      while (lastEventIndex < currentExecution.events.length) {
        const event = currentExecution.events[lastEventIndex]
        await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        lastEventIndex++
      }

      // Check for completion
      if (currentExecution.status === 'complete' && currentExecution.result) {
        const completeEvent: ExecutionEvent = {
          type: 'complete',
          result: currentExecution.result,
        }
        await writer.write(encoder.encode(`data: ${JSON.stringify(completeEvent)}\n\n`))
        clearInterval(streamInterval)
        setTimeout(safeCloseStream, 300)
        return
      }

      // Check for error
      if (currentExecution.status === 'error') {
        const errorEvent: ExecutionEvent = {
          type: 'error',
          error: currentExecution.error || 'Execution failed',
        }
        await writer.write(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`))
        clearInterval(streamInterval)
        setTimeout(safeCloseStream, 300)
        return
      }
    } catch (error) {
      console.error('[SimulationExecution] Stream error:', error)
      clearInterval(streamInterval)
      await safeCloseStream()
    }
  }, 500) // Check every 500ms

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// ============================================================================
// Background Execution
// ============================================================================

async function executeSimulationAsync(executionId: string, plan: SimulationPlan) {
  const execution = activeExecutions.get(executionId)
  if (!execution) return

  execution.status = 'running'

  try {
    // Convert plan to simulation config
    const config = convertPlanToConfig(plan)

    // Create engine with progress tracking
    const engine = createSimulationEngine((progress) => {
      // Map SimulationProgress status to execution phase
      const phaseMap: Record<string, string> = {
        queued: 'initialization',
        initializing: 'initialization',
        running: 'computing',
        processing: 'validation',
        completed: 'finalization',
        failed: 'finalization',
      }
      addEvent(executionId, {
        type: 'progress',
        phase: phaseMap[progress.status] || 'computing',
        percentage: progress.percentage || 0,
        message: progress.currentStep || '',
        eta: progress.estimatedTimeRemaining ?? null,
      })
    })

    // Initial progress
    addEvent(executionId, {
      type: 'progress',
      phase: 'initialization',
      percentage: 0,
      message: 'Starting simulation...',
    })

    // Execute the simulation
    const result = await engine.execute(config)

    // Mark as complete
    execution.result = result
    execution.status = 'complete'

    console.log(`[SimulationExecution] Execution ${executionId} completed successfully`)
  } catch (error) {
    console.error(`[SimulationExecution] Execution ${executionId} failed:`, error)
    execution.status = 'error'
    execution.error = error instanceof Error ? error.message : 'Unknown error'
  }
}

function addEvent(executionId: string, event: ExecutionEvent) {
  const execution = activeExecutions.get(executionId)
  if (execution) {
    execution.events.push(event)
  }
}

// ============================================================================
// Plan to Config Conversion
// ============================================================================

function convertPlanToConfig(plan: SimulationPlan): SimulationConfig {
  // Convert SimulationPlanParameter to SimulationParameter
  const parameters: SimulationParameter[] = plan.parameters.map(convertParameter)

  return {
    tier: plan.tier,
    experimentId: plan.id,
    title: plan.title,
    description: plan.methodology,
    parameters,
    duration: Math.ceil(plan.estimatedDuration / 1000), // Convert ms to seconds
    // Add domain detection based on simulation type
    domain: mapSimulationTypeToDomain(plan.simulationType) as SimulationConfig['domain'],
  }
}

function convertParameter(param: SimulationPlanParameter): SimulationParameter {
  return {
    name: param.name,
    value: param.value,
    unit: param.unit,
    description: param.description,
  }
}

function mapSimulationTypeToDomain(type: string): string {
  const domainMap: Record<string, string> = {
    geothermal: 'geothermal',
    solar: 'solar',
    wind: 'wind',
    battery: 'battery',
    hydrogen: 'hydrogen',
    'carbon-capture': 'carbon-capture',
    materials: 'materials-science',
    process: 'energy-efficiency',
  }
  return domainMap[type] || 'energy-efficiency'
}

// ============================================================================
// Cleanup Old Executions
// ============================================================================

// Clean up executions older than 1 hour
setInterval(() => {
  const now = Date.now()
  const oneHour = 60 * 60 * 1000

  for (const [id, execution] of activeExecutions.entries()) {
    if (now - execution.startTime > oneHour) {
      activeExecutions.delete(id)
      console.log(`[SimulationExecution] Cleaned up old execution: ${id}`)
    }
  }
}, 10 * 60 * 1000) // Every 10 minutes
