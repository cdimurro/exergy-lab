/**
 * Breakthrough Engine API
 *
 * Production API for the Breakthrough Engine v0.0.3
 * Uses the same SSE patterns as FrontierScience for consistent UX.
 *
 * Endpoints:
 * - POST   /api/discovery/breakthrough          → Start breakthrough discovery
 * - GET    /api/discovery/breakthrough?id=xxx   → SSE stream progress
 *
 * Architecture:
 * - Shares research phase with Discovery Engine
 * - 5 HypGen agents generate hypotheses in parallel
 * - Racing arena evaluates and refines hypotheses
 * - 12-dimension breakthrough scoring (8 impact + 4 feasibility)
 * - GPU-accelerated validation (when available)
 *
 * @see lib/ai/agents/hypothesis-racer.ts - Racing arena
 * @see lib/ai/agents/hypgen/ - HypGen agents
 * @see lib/ai/rubrics/breakthrough-judge.ts - 12-dimension scoring
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  HypothesisRacingArena,
  createHypothesisRacingArena,
  type RaceEvent,
  type RaceResult,
  type RacingArenaConfig,
} from '@/lib/ai/agents/hypothesis-racer'
import { ResearchAgent, createResearchAgent, type ResearchResult, type ResearchProgressEvent } from '@/lib/ai/agents/research-agent'
import type { RacingHypothesis } from '@/lib/ai/agents/hypgen/base'
import type { LeaderboardEntry } from '@/lib/ai/agents/breakthrough-evaluator'
import { createModalProvider, type ModalProgressEvent, type GPUTier } from '@/lib/simulation/providers/modal-provider'

// ============================================================================
// Types
// ============================================================================

interface BreakthroughRequest {
  query: string
  domain?: string
  config?: Partial<RacingArenaConfig>
}

interface HypothesisValidation {
  hypothesisId: string
  physicsValid: boolean
  economicallyViable: boolean
  confidenceScore: number
  gpuTier: GPUTier
  durationMs: number
}

interface BreakthroughState {
  id: string
  // 'hypothesis' is the combined generation+racing phase for consistent UI display
  status: 'pending' | 'researching' | 'hypothesis' | 'racing' | 'validating' | 'completed' | 'completed_partial' | 'paused' | 'failed'
  query: string
  domain: string
  research?: ResearchResult
  events: RaceEvent[]
  leaderboard: LeaderboardEntry[]
  validations?: HypothesisValidation[]
  result?: RaceResult
  partialResult?: {
    phase: 'researching' | 'hypothesis' | 'validating'
    winners: RacingHypothesis[]
    leaderboard: LeaderboardEntry[]
    validations?: HypothesisValidation[]
    reason: string
  }
  isPaused?: boolean
  pausedAtPhase?: 'researching' | 'hypothesis' | 'validating'
  error?: string
  startTime: number
  endTime?: number
}

// ============================================================================
// In-memory Store (would use Redis in production)
// ============================================================================

const activeBreakthroughs = new Map<string, BreakthroughState>()

// ============================================================================
// POST - Start Breakthrough Discovery
// ============================================================================

/**
 * Start a new Breakthrough Engine discovery
 *
 * Request body:
 * {
 *   query: string,           // Research query
 *   domain?: string,         // Domain (default: clean-energy)
 *   config?: {
 *     maxIterations?: number,      // Max refinement iterations (default: 5)
 *     breakthroughThreshold?: number,  // Score for breakthrough (default: 9.0)
 *     eliminationThreshold?: number,   // Score for elimination (default: 5.0)
 *     winnersCount?: number,        // Number of winners to select (default: 3)
 *   }
 * }
 *
 * Response:
 * {
 *   breakthroughId: string,
 *   status: 'started',
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as BreakthroughRequest
    const {
      query,
      domain = 'clean-energy',
      config = {},
    } = body

    // Validate input
    if (!query || query.trim().length < 10) {
      return NextResponse.json(
        { error: 'Query must be at least 10 characters' },
        { status: 400 }
      )
    }

    // Generate breakthrough ID
    const breakthroughId = `bt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    // Initialize state
    const state: BreakthroughState = {
      id: breakthroughId,
      status: 'pending',
      query,
      domain,
      events: [],
      leaderboard: [],
      startTime: Date.now(),
    }
    activeBreakthroughs.set(breakthroughId, state)

    // Racing arena config with defaults
    const arenaConfig: Partial<RacingArenaConfig> = {
      maxIterations: config.maxIterations ?? 5,
      breakthroughThreshold: config.breakthroughThreshold ?? 9.0,
      eliminationThreshold: config.eliminationThreshold ?? 5.0,
      winnersCount: config.winnersCount ?? 3,
      targetScore: 9.0,
    }

    // Start the breakthrough discovery in background
    runBreakthroughDiscovery(breakthroughId, query, domain, arenaConfig)
      .catch((error) => {
        const currentState = activeBreakthroughs.get(breakthroughId)
        if (currentState) {
          currentState.status = 'failed'
          currentState.error = error instanceof Error ? error.message : 'Unknown error'
          currentState.endTime = Date.now()
        }
        console.error(`[Breakthrough] Discovery ${breakthroughId} failed:`, error)
      })

    console.log(`[Breakthrough] Started discovery ${breakthroughId} for: "${query}"`)

    return NextResponse.json({
      breakthroughId,
      status: 'started',
      message: 'Breakthrough discovery started. Use GET to stream progress.',
      estimatedDuration: '3-5 minutes',
    })

  } catch (error) {
    console.error('[Breakthrough] Failed to start discovery:', error)
    return NextResponse.json(
      {
        error: 'Failed to start breakthrough discovery',
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
 * Stream breakthrough progress or get final results
 *
 * Query params:
 * - breakthroughId: string (required)
 * - stream: boolean (optional, default: true)
 */
export async function GET(request: NextRequest) {
  const breakthroughId = request.nextUrl.searchParams.get('breakthroughId')
  const streamMode = request.nextUrl.searchParams.get('stream') !== 'false'

  if (!breakthroughId) {
    return NextResponse.json({ error: 'breakthroughId required' }, { status: 400 })
  }

  const state = activeBreakthroughs.get(breakthroughId)
  if (!state) {
    return NextResponse.json({ error: 'Breakthrough not found' }, { status: 404 })
  }

  // Non-streaming mode: return current status
  if (!streamMode) {
    return NextResponse.json({
      breakthroughId,
      status: state.status,
      events: state.events.slice(-20), // Last 20 events
      leaderboard: state.leaderboard,
      result: state.result,
      error: state.error,
      duration: Date.now() - state.startTime,
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

  // Stream progress updates
  const streamInterval = setInterval(async () => {
    if (isStreamClosed) {
      clearInterval(streamInterval)
      return
    }

    try {
      const currentState = activeBreakthroughs.get(breakthroughId)
      if (!currentState) {
        clearInterval(streamInterval)
        await safeCloseStream()
        return
      }

      // Send any new events
      while (lastEventIndex < currentState.events.length) {
        const event = currentState.events[lastEventIndex]
        const sseEvent = formatEventForSSE(event, currentState)
        await writer.write(encoder.encode(`data: ${JSON.stringify(sseEvent)}\n\n`))
        lastEventIndex++
      }

      // Check for completion
      if (currentState.status === 'completed' && currentState.result) {
        const completeEvent = {
          type: 'complete',
          breakthroughId,
          status: 'completed',
          result: formatResultForSSE(currentState.result),
          duration: currentState.endTime! - currentState.startTime,
        }
        await writer.write(encoder.encode(`data: ${JSON.stringify(completeEvent)}\n\n`))

        clearInterval(streamInterval)
        setTimeout(safeCloseStream, 300)
        return
      }

      // Check for failure
      if (currentState.status === 'failed') {
        const errorEvent = {
          type: 'error',
          breakthroughId,
          status: 'failed',
          error: currentState.error || 'Breakthrough failed',
        }
        await writer.write(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`))

        clearInterval(streamInterval)
        setTimeout(safeCloseStream, 300)
        return
      }

      // Send heartbeat if no events
      if (lastEventIndex === currentState.events.length) {
        const heartbeat = {
          type: 'heartbeat',
          status: currentState.status,
          elapsed: Date.now() - currentState.startTime,
          leaderboard: currentState.leaderboard.slice(0, 5),
        }
        await writer.write(encoder.encode(`data: ${JSON.stringify(heartbeat)}\n\n`))
      }

    } catch (error) {
      console.error('[Breakthrough] Stream error:', error)
      clearInterval(streamInterval)
      await safeCloseStream()
    }
  }, 2000) // Stream interval

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// ============================================================================
// PATCH - Pause/Resume Breakthrough Discovery
// ============================================================================

/**
 * Pause or resume a breakthrough discovery
 *
 * Request body:
 * {
 *   breakthroughId: string,
 *   action: 'pause' | 'resume'
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { breakthroughId, action } = body

    if (!breakthroughId) {
      return NextResponse.json({ error: 'breakthroughId required' }, { status: 400 })
    }

    if (!action || !['pause', 'resume'].includes(action)) {
      return NextResponse.json({ error: 'action must be "pause" or "resume"' }, { status: 400 })
    }

    const state = activeBreakthroughs.get(breakthroughId)
    if (!state) {
      return NextResponse.json({ error: 'Breakthrough not found' }, { status: 404 })
    }

    if (action === 'pause') {
      if (state.status === 'paused') {
        return NextResponse.json({ error: 'Already paused' }, { status: 400 })
      }

      if (!['researching', 'hypothesis', 'racing', 'validating'].includes(state.status)) {
        return NextResponse.json({
          error: `Cannot pause in status: ${state.status}`,
        }, { status: 400 })
      }

      // Map 'racing' to 'hypothesis' for consistent phase naming
      const pausePhase = state.status === 'racing' ? 'hypothesis' : state.status
      state.pausedAtPhase = pausePhase as 'researching' | 'hypothesis' | 'validating'
      state.isPaused = true
      state.status = 'paused'

      state.events.push({
        type: 'refinement_complete',
        message: `Discovery paused at ${state.pausedAtPhase} phase`,
        timestamp: Date.now(),
      })

      console.log(`[Breakthrough] ${breakthroughId} paused at ${state.pausedAtPhase}`)

      return NextResponse.json({
        breakthroughId,
        status: 'paused',
        pausedAtPhase: state.pausedAtPhase,
      })

    } else {
      // Resume
      if (state.status !== 'paused') {
        return NextResponse.json({ error: 'Not paused' }, { status: 400 })
      }

      const resumePhase = state.pausedAtPhase || 'hypothesis'
      state.status = resumePhase
      state.isPaused = false
      state.pausedAtPhase = undefined

      state.events.push({
        type: 'race_started',
        message: `Discovery resumed at ${resumePhase} phase`,
        timestamp: Date.now(),
      })

      console.log(`[Breakthrough] ${breakthroughId} resumed at ${resumePhase}`)

      return NextResponse.json({
        breakthroughId,
        status: 'resumed',
        currentPhase: resumePhase,
      })
    }

  } catch (error) {
    console.error('[Breakthrough] PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to pause/resume' },
      { status: 500 }
    )
  }
}

// ============================================================================
// Research Event Type Mapping
// ============================================================================

/**
 * Map research progress event types to race event types for SSE streaming
 * This allows the UI to receive granular research progress updates
 */
function mapResearchEventType(researchType: ResearchProgressEvent['type']): RaceEvent['type'] {
  switch (researchType) {
    case 'research_started':
      return 'race_started' // Reuse existing type
    case 'query_expanded':
      return 'iteration_started' // Reuse to show progress
    case 'source_searching':
      return 'iteration_started' // Show source is being searched
    case 'source_complete':
      return 'evaluation_complete' // Show source completed
    case 'synthesis_started':
      return 'refinement_complete' // Show synthesis starting
    case 'synthesis_progress':
      return 'refinement_complete' // Show synthesis stage
    case 'research_complete':
      return 'generation_complete' // Research done
    default:
      return 'race_started'
  }
}

// ============================================================================
// Background Discovery Process
// ============================================================================

async function runBreakthroughDiscovery(
  breakthroughId: string,
  query: string,
  domain: string,
  config: Partial<RacingArenaConfig>
): Promise<void> {
  const state = activeBreakthroughs.get(breakthroughId)
  if (!state) {
    throw new Error('Breakthrough state not found')
  }

  console.log(`[Breakthrough] Running discovery ${breakthroughId}`)

  // Phase 1: Research (shared with Discovery Engine)
  state.status = 'researching'

  const researchAgent = createResearchAgent({
    maxSourcesPerDatabase: 50,
    includePatents: true,
    includeMaterials: true,
    includeChemicals: true,
    minRelevanceScore: 0.5,
  })

  state.events.push({
    type: 'race_started',
    message: 'Starting comprehensive research phase...',
    timestamp: Date.now(),
  })

  console.log(`[Breakthrough] ${breakthroughId} - Starting research phase`)

  // Progress callback to emit granular SSE events during research
  const onResearchProgress = (event: ResearchProgressEvent): void => {
    const currentState = activeBreakthroughs.get(breakthroughId)
    if (!currentState) return

    // Map research progress events to race events for SSE streaming
    const raceEvent: RaceEvent = {
      type: mapResearchEventType(event.type),
      message: event.message,
      timestamp: event.timestamp,
      // Include source and count metadata
      state: {
        researchSource: event.source,
        researchCount: event.count,
        researchStage: event.stage,
      } as any,
    }

    currentState.events.push(raceEvent)
    console.log(`[Breakthrough] ${breakthroughId} - Research: ${event.message}`)
  }

  const researchResult = await researchAgent.execute(query, domain, undefined, onResearchProgress)
  state.research = researchResult

  state.events.push({
    type: 'generation_complete',
    message: `Research complete: ${researchResult.sources.length} sources, ${researchResult.keyFindings.length} findings, ${researchResult.technologicalGaps.length} gaps identified`,
    timestamp: Date.now(),
  })

  console.log(`[Breakthrough] ${breakthroughId} - Research complete, starting hypothesis generation and racing`)

  // Phase 2: Hypothesis Generation + Racing (combined into single "hypothesis" phase)
  state.status = 'hypothesis'

  const arena = createHypothesisRacingArena(config)

  // Subscribe to arena events
  arena.onEvent((event) => {
    const currentState = activeBreakthroughs.get(breakthroughId)
    if (currentState) {
      currentState.events.push(event)

      // Update leaderboard from state
      if (event.state?.leaderboard) {
        currentState.leaderboard = event.state.leaderboard
      }
    }
  })

  // Run the race
  const raceResult = await arena.runRace(researchResult, query)

  console.log(`[Breakthrough] ${breakthroughId} - Racing complete, starting GPU validation`)

  // Phase 3: GPU Validation of top winners
  state.status = 'validating'

  state.events.push({
    type: 'race_started', // Reuse for validation phase start
    message: `Starting GPU-accelerated validation of top ${Math.min(raceResult.winners.length, 3)} hypotheses...`,
    timestamp: Date.now(),
  })

  const validations: HypothesisValidation[] = []

  // Try to validate top 3 winners with GPU (graceful fallback if unavailable)
  const modalProvider = createModalProvider('tier2')
  const gpuAvailable = await modalProvider.isAvailable()

  if (gpuAvailable && raceResult.winners.length > 0) {
    const winnersToValidate = raceResult.winners.slice(0, 3)

    for (const winner of winnersToValidate) {
      state.events.push({
        type: 'iteration_started',
        message: `Validating hypothesis ${winner.id.slice(-8)}: ${winner.title.slice(0, 50)}...`,
        timestamp: Date.now(),
        hypothesisId: winner.id,
      })

      try {
        const validationResult = await modalProvider.validateHypothesis({
          id: winner.id,
          title: winner.title,
          scores: winner.scores,
          predictions: winner.predictions,
          mechanism: winner.mechanism,
        })

        validations.push({
          hypothesisId: validationResult.hypothesisId,
          physicsValid: validationResult.physicsValid,
          economicallyViable: validationResult.economicallyViable,
          confidenceScore: validationResult.confidenceScore,
          gpuTier: validationResult.gpuTier,
          durationMs: validationResult.durationMs,
        })

        const validityStatus = validationResult.physicsValid && validationResult.economicallyViable
          ? '✓ Valid'
          : validationResult.physicsValid
          ? '⚠ Physics valid, economic concerns'
          : '✗ Needs review'

        state.events.push({
          type: 'evaluation_complete',
          message: `Hypothesis ${winner.id.slice(-8)} validated: ${validityStatus} (confidence: ${(validationResult.confidenceScore * 100).toFixed(0)}%)`,
          timestamp: Date.now(),
          hypothesisId: winner.id,
          score: validationResult.confidenceScore * 10, // Scale to 0-10
        })

        console.log(`[Breakthrough] ${breakthroughId} - Validated ${winner.id.slice(-8)}: physics=${validationResult.physicsValid}, economic=${validationResult.economicallyViable}`)

      } catch (error) {
        console.error(`[Breakthrough] ${breakthroughId} - Validation failed for ${winner.id}:`, error)
        state.events.push({
          type: 'race_error',
          message: `GPU validation failed for ${winner.id.slice(-8)} - continuing with results`,
          timestamp: Date.now(),
          hypothesisId: winner.id,
        })
      }
    }
  } else {
    // GPU not available - emit notice and continue
    const reason = !gpuAvailable
      ? 'GPU validation unavailable (Modal API not configured)'
      : 'No winners to validate'

    state.events.push({
      type: 'refinement_complete',
      message: `Skipping GPU validation: ${reason}. Results based on AI evaluation only.`,
      timestamp: Date.now(),
    })

    console.log(`[Breakthrough] ${breakthroughId} - GPU validation skipped: ${reason}`)
  }

  state.validations = validations

  state.events.push({
    type: 'generation_complete',
    message: `GPU validation complete: ${validations.length} hypotheses validated`,
    timestamp: Date.now(),
  })

  // Update state with results
  state.status = 'completed'
  state.result = raceResult
  state.endTime = Date.now()

  console.log(`[Breakthrough] ${breakthroughId} completed:`, {
    winners: raceResult.winners.length,
    breakthroughs: raceResult.breakthroughs.length,
    eliminated: raceResult.eliminated.length,
    validations: validations.length,
    duration: raceResult.totalTimeMs,
  })
}

// ============================================================================
// SSE Formatting Helpers
// ============================================================================

function formatEventForSSE(event: RaceEvent, state: BreakthroughState): Record<string, unknown> {
  // Extract research-specific metadata if present
  const researchState = event.state as any
  const researchSource = researchState?.researchSource
  const researchCount = researchState?.researchCount
  const researchStage = researchState?.researchStage

  // Map status to user-friendly phase names for consistent UI display
  // 'hypothesis' is the unified phase for generation + racing
  const phaseMap: Record<string, string> = {
    'pending': 'idle',
    'researching': 'research',
    'hypothesis': 'hypothesis',  // Unified phase
    'racing': 'hypothesis',      // Legacy - maps to hypothesis
    'validating': 'validation',
    'completed': 'complete',
    'completed_partial': 'complete',
    'paused': 'paused',
    'failed': 'failed',
  }
  const currentPhase = phaseMap[state.status] || state.status

  const base = {
    type: event.type,
    timestamp: event.timestamp,
    iteration: event.iteration,
    message: event.message,
    // Consistent phase field across all events (matches BreakthroughEnginePhase type)
    currentPhase,
    // Include research metadata if present (for research phase events)
    ...(researchSource && { source: researchSource }),
    ...(researchCount !== undefined && { count: researchCount }),
    ...(researchStage && { stage: researchStage }),
  }

  switch (event.type) {
    case 'race_started':
      return {
        ...base,
        phase: state.status === 'researching' ? 'research' : 'hypothesis',
        totalAgents: 5,
        hypothesesPerAgent: 3,
      }

    case 'iteration_started':
      return {
        ...base,
        phase: currentPhase,
        maxIterations: state.result?.totalIterations || 5,
      }

    case 'generation_complete':
      return {
        ...base,
        phase: currentPhase,
        hypothesesCount: event.state?.activeHypotheses?.length || researchCount || 0,
        sourcesCount: state.research?.sources?.length || 0,
        findingsCount: state.research?.keyFindings?.length || 0,
        gapsCount: state.research?.technologicalGaps?.length || 0,
      }

    case 'evaluation_complete':
      return {
        ...base,
        phase: currentPhase,
        leaderboard: event.state?.leaderboard?.slice(0, 10) || [],
        topScore: event.state?.leaderboard?.[0]?.score || 0,
      }

    case 'refinement_complete':
      return {
        ...base,
        phase: currentPhase,
        activeCount: event.state?.activeHypotheses?.length || 0,
      }

    case 'hypothesis_eliminated':
      return {
        ...base,
        phase: currentPhase,
        hypothesisId: event.hypothesisId,
        score: event.score,
        reason: 'Score below elimination threshold',
      }

    case 'breakthrough_detected':
      return {
        ...base,
        phase: currentPhase,
        hypothesisId: event.hypothesisId,
        score: event.score,
        classification: event.classification,
      }

    case 'hypothesis_generated':
      return {
        ...base,
        phase: currentPhase,
        hypothesis: event.hypothesis ? formatHypothesisForSSE(event.hypothesis) : null,
      }

    case 'hypothesis_updated':
      return {
        ...base,
        phase: currentPhase,
        hypothesisId: event.hypothesisId,
        score: event.score,
        iteration: event.iteration,
      }

    case 'hypotheses_batch':
      return {
        ...base,
        phase: currentPhase,
        hypotheses: event.hypotheses?.map(formatHypothesisForSSE) || [],
        count: event.hypotheses?.length || 0,
      }

    case 'iteration_complete':
      return {
        ...base,
        phase: currentPhase,
        leaderboard: event.state?.leaderboard?.slice(0, 10) || [],
        activeCount: event.state?.activeHypotheses?.length || 0,
        eliminatedCount: event.state?.eliminatedHypotheses?.length || 0,
        breakthroughCount: event.state?.breakthroughCandidates?.length || 0,
      }

    case 'race_complete':
      return {
        ...base,
        phase: 'complete',
        statistics: event.state?.statistics,
      }

    case 'race_error':
      return {
        ...base,
        phase: currentPhase,
        error: event.message,
      }

    default:
      return {
        ...base,
        phase: currentPhase,
      }
  }
}

function formatResultForSSE(result: RaceResult): Record<string, unknown> {
  return {
    winners: result.winners.map(formatHypothesisForSSE),
    breakthroughs: result.breakthroughs.map(formatHypothesisForSSE),
    statistics: {
      totalGenerated: result.statistics.totalGenerated,
      totalEliminated: result.statistics.totalEliminated,
      totalBreakthroughs: result.statistics.totalBreakthroughs,
      averageScore: result.statistics.averageScore,
      highestScore: result.statistics.highestScore,
    },
    leaderboard: result.finalLeaderboard.slice(0, 10),
    totalIterations: result.totalIterations,
    totalTimeMs: result.totalTimeMs,
    earlyTermination: result.earlyTermination,
    terminationReason: result.terminationReason,
  }
}

function formatHypothesisForSSE(hypothesis: RacingHypothesis): Record<string, unknown> {
  return {
    id: hypothesis.id,
    title: hypothesis.title,
    statement: hypothesis.statement,
    agentSource: hypothesis.agentSource,
    scores: {
      overall: hypothesis.scores.overall,
      // Convert Map to object
      dimensions: Object.fromEntries(hypothesis.scores.dimensions),
    },
    status: hypothesis.status,
    noveltyScore: hypothesis.noveltyScore,
    feasibilityScore: hypothesis.feasibilityScore,
    impactScore: hypothesis.impactScore,
    predictions: hypothesis.predictions.slice(0, 3),
    mechanism: hypothesis.mechanism,
    history: hypothesis.history,
  }
}

// ============================================================================
// Cleanup Old Breakthroughs
// ============================================================================

setInterval(() => {
  const now = Date.now()
  const oneHour = 60 * 60 * 1000

  for (const [id, state] of activeBreakthroughs.entries()) {
    if (now - state.startTime > oneHour) {
      activeBreakthroughs.delete(id)
      console.log(`[Breakthrough] Cleaned up old discovery: ${id}`)
    }
  }
}, 10 * 60 * 1000) // Every 10 minutes
