import { NextRequest, NextResponse } from 'next/server'
import { StatusUpdate } from '@/types/agent'

/**
 * Server-Sent Events (SSE) endpoint for real-time agent status updates
 *
 * Usage:
 * const eventSource = new EventSource('/api/agent/stream?query=...')
 * eventSource.onmessage = (event) => {
 *   const status: StatusUpdate = JSON.parse(event.data)
 *   console.log(status)
 * }
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('query')

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    )
  }

  // Create a TransformStream for SSE
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // Start async task that emits status updates
  ;(async () => {
    try {
      // Send initial status
      await sendStatus(writer, encoder, {
        step: 'initializing',
        phase: 'plan',
        progress: 0,
        message: 'Starting agent execution...',
        timestamp: Date.now(),
      })

      // This is a placeholder - in production, this would execute the actual agent
      // For now, we'll simulate progress
      await simulateAgentExecution(writer, encoder)

      // Send completion status
      await sendStatus(writer, encoder, {
        step: 'completed',
        phase: 'respond',
        progress: 100,
        message: 'Agent execution completed',
        timestamp: Date.now(),
      })

      // Close the connection
      await writer.close()
    } catch (error) {
      console.error('[SSE] Error during agent execution:', error)

      await sendStatus(writer, encoder, {
        step: 'error',
        phase: 'respond',
        progress: 0,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
      })

      await writer.close()
    }
  })()

  // Return SSE response
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  })
}

/**
 * Send a status update via SSE
 */
async function sendStatus(
  writer: WritableStreamDefaultWriter,
  encoder: TextEncoder,
  status: StatusUpdate
): Promise<void> {
  const data = JSON.stringify(status)
  const message = `data: ${data}\n\n`
  await writer.write(encoder.encode(message))
}

/**
 * Simulate agent execution for demonstration
 * In production, this would be replaced with actual agent execution
 */
async function simulateAgentExecution(
  writer: WritableStreamDefaultWriter,
  encoder: TextEncoder
): Promise<void> {
  const steps = [
    {
      step: 'planning',
      phase: 'plan' as const,
      progress: 10,
      message: 'Analyzing query and planning execution...',
      details: { steps: 3, estimatedDuration: 15000 },
    },
    {
      step: 'tool_selection',
      phase: 'plan' as const,
      progress: 20,
      message: 'Selecting appropriate tools...',
      details: { tools: ['searchPapers', 'analyzePatent'] },
    },
    {
      step: 'searching_papers',
      phase: 'execute' as const,
      progress: 40,
      message: 'Searching academic papers across 14 sources...',
      details: { sources: 14, progress: 'in_progress' },
    },
    {
      step: 'analyzing_results',
      phase: 'analyze' as const,
      progress: 60,
      message: 'Analyzing search results...',
      details: { papers: 45, patents: 12 },
    },
    {
      step: 'synthesizing',
      phase: 'analyze' as const,
      progress: 80,
      message: 'Synthesizing findings...',
      details: { keyInsights: 5 },
    },
    {
      step: 'generating_response',
      phase: 'respond' as const,
      progress: 90,
      message: 'Generating final response with citations...',
      details: { sources: 8 },
    },
  ]

  for (const step of steps) {
    await sendStatus(writer, encoder, {
      ...step,
      timestamp: Date.now(),
    })

    // Simulate processing time
    await sleep(1000)
  }
}

/**
 * Helper to sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * POST endpoint for non-streaming agent execution
 * Returns final result without intermediate status updates
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, options } = body

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    // This will integrate with the actual agent execution system
    // For now, return a placeholder response

    return NextResponse.json({
      success: true,
      response: 'Agent execution completed (placeholder)',
      query,
      duration: 0,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error('[Agent API] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
