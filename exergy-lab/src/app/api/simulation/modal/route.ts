import { NextRequest, NextResponse } from 'next/server'

/**
 * Modal GPU Simulation API Route
 *
 * Handles simulation requests and forwards them to Modal Labs for GPU execution.
 * Supports Monte Carlo, parametric sweeps, and batch hypothesis validation.
 *
 * POST /api/simulation/modal
 * Body: { type: string, params: object }
 */

interface ModalRequest {
  type: 'monte-carlo' | 'parametric-sweep' | 'batch-validation' | 'ml-md'
  params: Record<string, unknown>
}

// Modal endpoint configuration
const MODAL_CONFIG = {
  endpoint: process.env.MODAL_ENDPOINT || 'https://cdimurro--breakthrough-engine-gpu.modal.run',
  apiKey: process.env.MODAL_API_KEY,
  timeout: 300000, // 5 minutes
}

export async function POST(request: NextRequest) {
  try {
    const body: ModalRequest = await request.json()

    if (!body.type) {
      return NextResponse.json(
        { error: 'Simulation type is required' },
        { status: 400 }
      )
    }

    // Check if Modal is configured
    if (!MODAL_CONFIG.apiKey) {
      return NextResponse.json(
        {
          error: 'Modal GPU not configured',
          message: 'Set MODAL_API_KEY environment variable',
          fallback: 'local',
        },
        { status: 503 }
      )
    }

    // Determine the Modal function endpoint
    const functionEndpoint = getModalFunctionEndpoint(body.type)
    if (!functionEndpoint) {
      return NextResponse.json(
        { error: `Unknown simulation type: ${body.type}` },
        { status: 400 }
      )
    }

    // Call Modal endpoint
    const result = await callModalFunction(functionEndpoint, body.params)

    return NextResponse.json({
      success: true,
      result,
      provider: 'modal',
      endpoint: functionEndpoint,
    })

  } catch (error) {
    console.error('[Modal API] Simulation failed:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        error: 'Simulation failed',
        message: errorMessage,
        fallback: 'local',
      },
      { status: 500 }
    )
  }
}

/**
 * Health check for Modal availability
 */
export async function GET() {
  if (!MODAL_CONFIG.apiKey) {
    return NextResponse.json({
      available: false,
      reason: 'MODAL_API_KEY not configured',
    })
  }

  try {
    // Try a lightweight ping to Modal
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(`${MODAL_CONFIG.endpoint}/health`, {
      method: 'GET',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    return NextResponse.json({
      available: response.ok,
      endpoint: MODAL_CONFIG.endpoint,
    })

  } catch {
    return NextResponse.json({
      available: false,
      reason: 'Modal endpoint unreachable',
    })
  }
}

/**
 * Get the Modal function endpoint for a simulation type
 */
function getModalFunctionEndpoint(type: string): string | null {
  // Note: Using short function names to avoid Modal URL truncation
  const endpoints: Record<string, string> = {
    'monte-carlo': 'mc_endpoint',
    'parametric-sweep': 'parametric_sweep_endpoint',
    'batch-validation': 'batch_validate_endpoint',
    'ml-md': 'ml_potential_md',
  }

  return endpoints[type] || null
}

/**
 * Call a Modal function via HTTP
 */
async function callModalFunction(
  functionName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  // Modal web endpoint URL format: insert function name before .modal.run
  // Modal converts underscores to hyphens and uses single hyphen as separator
  const functionNameFormatted = functionName.replace(/_/g, '-')
  const url = MODAL_CONFIG.endpoint.replace(
    '.modal.run',
    `-${functionNameFormatted}.modal.run`
  )

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), MODAL_CONFIG.timeout)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MODAL_CONFIG.apiKey}`,
      },
      body: JSON.stringify({ args }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Modal API error: ${response.status} - ${errorText}`)
    }

    return response.json()

  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Modal request timed out after ${MODAL_CONFIG.timeout}ms`)
    }

    throw error
  }
}
