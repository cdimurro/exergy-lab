/**
 * FrontierScience Discovery API
 *
 * New 12-phase discovery pipeline with FrontierScience rubric validation.
 * Implements iterative refinement until 7/10 threshold is achieved.
 *
 * Endpoints:
 * - POST   /api/discovery/frontierscience          → Start discovery
 * - GET    /api/discovery/frontierscience/stream   → SSE progress updates
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  DiscoveryOrchestrator,
  createDiscoveryOrchestrator,
  streamDiscovery,
} from '@/lib/ai/agents'
import type {
  DiscoveryResult,
  PhaseProgress,
  IterationEvent,
  ThinkingEvent,
} from '@/lib/ai/agents'

// In-memory store for active discoveries (would use Redis in production)
const activeDiscoveries = new Map<string, {
  orchestrator: DiscoveryOrchestrator
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: PhaseProgress[]
  iterations: IterationEvent[]
  thinking: ThinkingEvent[]
  result?: DiscoveryResult
  error?: string
  startTime: number
}>()

// ============================================================================
// POST - Start Discovery
// ============================================================================

/**
 * Start a new FrontierScience discovery
 *
 * Request body:
 * {
 *   query: string,           // Research query
 *   domain?: string,         // Domain (default: clean-energy)
 *   targetQuality?: string,  // Target quality level
 *   options?: {
 *     enablePatentAnalysis?: boolean,
 *     enableExergyAnalysis?: boolean,
 *     enableTEAAnalysis?: boolean,
 *     maxIterationsPerPhase?: number,
 *   }
 * }
 *
 * Response:
 * {
 *   discoveryId: string,
 *   status: 'started',
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      query,
      domain = 'clean-energy',
      targetQuality = 'validated',
      options = {},
    } = body

    // Validate input
    if (!query || query.trim().length < 10) {
      return NextResponse.json(
        { error: 'Query must be at least 10 characters' },
        { status: 400 }
      )
    }

    // Generate discovery ID
    const discoveryId = `fs_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    // Create orchestrator with config
    const orchestrator = createDiscoveryOrchestrator({
      domain,
      targetQuality: targetQuality as any,
      enablePatentAnalysis: options.enablePatentAnalysis ?? true,
      enableExergyAnalysis: options.enableExergyAnalysis ?? true,
      enableTEAAnalysis: options.enableTEAAnalysis ?? true,
      maxIterationsPerPhase: options.maxIterationsPerPhase ?? 3,
      verbose: true,
    })

    // Initialize discovery state
    const discoveryState: {
      orchestrator: DiscoveryOrchestrator
      status: 'pending' | 'running' | 'completed' | 'failed'
      progress: PhaseProgress[]
      iterations: IterationEvent[]
      thinking: ThinkingEvent[]
      result?: DiscoveryResult
      error?: string
      startTime: number
    } = {
      orchestrator,
      status: 'pending',
      progress: [],
      iterations: [],
      thinking: [],
      startTime: Date.now(),
    }
    activeDiscoveries.set(discoveryId, discoveryState)

    // Set up progress tracking
    orchestrator.onProgress((progress) => {
      const state = activeDiscoveries.get(discoveryId)
      if (state) {
        state.progress.push(progress)
        if (progress.status === 'failed') {
          state.status = 'failed'
        }
      }
    })

    // Set up iteration tracking (rich rubric judge results)
    orchestrator.onIteration((iteration) => {
      const state = activeDiscoveries.get(discoveryId)
      if (state) {
        state.iterations.push(iteration)
      }
    })

    // Set up thinking tracking (AI activity updates)
    orchestrator.onThinking((thinking) => {
      const state = activeDiscoveries.get(discoveryId)
      if (state) {
        state.thinking.push(thinking)
      }
    })

    // Start discovery in background
    discoveryState.status = 'running'
    orchestrator.executeDiscovery(query)
      .then((result) => {
        const state = activeDiscoveries.get(discoveryId)
        if (state) {
          state.status = 'completed'
          state.result = result
        }
        console.log(`[FrontierScience] Discovery ${discoveryId} completed:`, {
          quality: result.discoveryQuality,
          score: result.overallScore,
          duration: result.totalDurationMs,
        })
      })
      .catch((error) => {
        const state = activeDiscoveries.get(discoveryId)
        if (state) {
          state.status = 'failed'
          state.error = error.message
        }
        console.error(`[FrontierScience] Discovery ${discoveryId} failed:`, error)
      })

    console.log(`[FrontierScience] Started discovery ${discoveryId} for: "${query}"`)

    return NextResponse.json({
      discoveryId,
      status: 'started',
      message: 'FrontierScience discovery started. Use GET to stream progress.',
      estimatedDuration: '5-10 minutes',
    })
  } catch (error) {
    console.error('[FrontierScience] Failed to start discovery:', error)
    return NextResponse.json(
      {
        error: 'Failed to start discovery',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET - Stream Progress / Get Results
// ============================================================================

/**
 * Stream discovery progress or get final results
 *
 * Query params:
 * - discoveryId: string (required)
 * - stream: boolean (optional, default: true)
 *
 * If stream=true: Returns SSE stream
 * If stream=false: Returns current status JSON
 */
export async function GET(request: NextRequest) {
  const discoveryId = request.nextUrl.searchParams.get('discoveryId')
  const streamMode = request.nextUrl.searchParams.get('stream') !== 'false'

  if (!discoveryId) {
    return NextResponse.json({ error: 'discoveryId required' }, { status: 400 })
  }

  const discovery = activeDiscoveries.get(discoveryId)
  if (!discovery) {
    return NextResponse.json({ error: 'Discovery not found' }, { status: 404 })
  }

  // Non-streaming mode: return current status
  if (!streamMode) {
    return NextResponse.json({
      discoveryId,
      status: discovery.status,
      progress: discovery.progress,
      result: discovery.result,
      error: discovery.error,
      duration: Date.now() - discovery.startTime,
    })
  }

  // Streaming mode: SSE
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  let isStreamClosed = false
  let lastProgressIndex = 0
  let lastIterationIndex = 0
  let lastThinkingIndex = 0

  const safeCloseStream = async () => {
    if (isStreamClosed) return
    isStreamClosed = true
    try {
      await writer.close()
    } catch {
      // Already closed
    }
  }

  // Stream progress updates
  const streamInterval = setInterval(async () => {
    if (isStreamClosed) {
      clearInterval(streamInterval)
      return
    }

    try {
      const currentDiscovery = activeDiscoveries.get(discoveryId)
      if (!currentDiscovery) {
        clearInterval(streamInterval)
        await safeCloseStream()
        return
      }

      // Send any new thinking events (AI activity updates)
      while (lastThinkingIndex < currentDiscovery.thinking.length) {
        const thinking = currentDiscovery.thinking[lastThinkingIndex]
        await writer.write(encoder.encode(
          `data: ${JSON.stringify({ type: 'thinking', ...thinking })}\n\n`
        ))
        lastThinkingIndex++
      }

      // Send any new progress updates
      while (lastProgressIndex < currentDiscovery.progress.length) {
        const progress = currentDiscovery.progress[lastProgressIndex]
        await writer.write(encoder.encode(
          `data: ${JSON.stringify({ type: 'progress', ...progress })}\n\n`
        ))
        lastProgressIndex++
      }

      // Send any new iteration events (rich rubric judge results)
      while (lastIterationIndex < currentDiscovery.iterations.length) {
        const iteration = currentDiscovery.iterations[lastIterationIndex]
        await writer.write(encoder.encode(
          `data: ${JSON.stringify({ type: 'iteration', ...iteration })}\n\n`
        ))
        lastIterationIndex++
      }

      // Check for completion
      if (currentDiscovery.status === 'completed' && currentDiscovery.result) {
        const completeEvent = {
          type: 'complete',
          discoveryId,
          status: 'completed',
          result: {
            id: currentDiscovery.result.id,
            query: currentDiscovery.result.query,
            domain: currentDiscovery.result.domain,
            overallScore: currentDiscovery.result.overallScore,
            discoveryQuality: currentDiscovery.result.discoveryQuality,
            recommendations: currentDiscovery.result.recommendations,
            phases: currentDiscovery.result.phases.map(p => ({
              phase: p.phase,
              finalScore: p.finalScore,
              passed: p.passed,
              iterationCount: p.iterations.length,
              durationMs: p.durationMs,
              // Include full phase output for report generation
              finalOutput: p.finalOutput,
              // Include iteration details for detailed reports
              iterations: p.iterations.map(iter => ({
                iteration: iter.iteration,
                judgeResult: iter.judgeResult ? {
                  totalScore: iter.judgeResult.totalScore,
                  passed: iter.judgeResult.passed,
                  reasoning: iter.judgeResult.reasoning,
                  recommendations: iter.judgeResult.recommendations,
                  itemScores: iter.judgeResult.itemScores?.slice(0, 10), // Limit to prevent huge payloads
                } : null,
                durationMs: iter.durationMs,
              })),
            })),
            totalDuration: currentDiscovery.result.totalDurationMs,
            startTime: currentDiscovery.result.startTime,
            endTime: currentDiscovery.result.endTime,
          },
        }
        await writer.write(encoder.encode(`data: ${JSON.stringify(completeEvent)}\n\n`))

        clearInterval(streamInterval)
        setTimeout(safeCloseStream, 300)
        return
      }

      // Check for failure
      if (currentDiscovery.status === 'failed') {
        const errorEvent = {
          type: 'error',
          discoveryId,
          status: 'failed',
          error: currentDiscovery.error || 'Discovery failed',
        }
        await writer.write(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`))

        clearInterval(streamInterval)
        setTimeout(safeCloseStream, 300)
        return
      }

      // Send heartbeat (only if no other events were sent in this cycle)
      if (lastProgressIndex === currentDiscovery.progress.length &&
          lastIterationIndex === currentDiscovery.iterations.length &&
          lastThinkingIndex === currentDiscovery.thinking.length) {
        await writer.write(encoder.encode(
          `data: ${JSON.stringify({
            type: 'heartbeat',
            status: currentDiscovery.status,
            elapsed: Date.now() - currentDiscovery.startTime,
          })}\n\n`
        ))
      }
    } catch (error) {
      console.error('[FrontierScience] Stream error:', error)
      clearInterval(streamInterval)
      await safeCloseStream()
    }
  }, 2000) // Reduced heartbeat noise - only send events every 2s

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// ============================================================================
// Cleanup Old Discoveries (called periodically)
// ============================================================================

// Clean up discoveries older than 1 hour
setInterval(() => {
  const now = Date.now()
  const oneHour = 60 * 60 * 1000

  for (const [id, discovery] of activeDiscoveries.entries()) {
    if (now - discovery.startTime > oneHour) {
      activeDiscoveries.delete(id)
      console.log(`[FrontierScience] Cleaned up old discovery: ${id}`)
    }
  }
}, 10 * 60 * 1000) // Every 10 minutes
