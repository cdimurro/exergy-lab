'use client'

/**
 * useBreakthroughWorkflow Hook
 *
 * Manages the Breakthrough Engine workflow with SSE streaming.
 * Follows the same patterns as useFrontierScienceWorkflow for consistent UX.
 *
 * @see api/discovery/breakthrough/route.ts - API endpoint
 * @see lib/ai/agents/hypothesis-racer.ts - Racing logic
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { RacingHypothesis as BackendRacingHypothesis, HypGenAgentType } from '@/lib/ai/agents/hypgen/base'
import type { LeaderboardEntry } from '@/lib/ai/agents/breakthrough-evaluator'
import type { ClassificationTier } from '@/lib/ai/rubrics/types-breakthrough'
import type { RacingHypothesis as UIRacingHypothesis } from '@/components/discovery/HypothesisRaceViewer'

// ============================================================================
// Types
// ============================================================================

// BreakthroughPhase includes 'hypothesis' as the combined generation+racing phase
// Legacy values 'generating' and 'racing' map to 'hypothesis' for backward compatibility
export type BreakthroughPhase = 'idle' | 'researching' | 'hypothesis' | 'generating' | 'racing' | 'validating' | 'complete' | 'failed'

// Activity type for validation events
export type ValidationActivityType = 'info' | 'success' | 'warning' | 'error' | 'breakthrough' | 'validation'
export type BreakthroughStatus = 'idle' | 'starting' | 'running' | 'completed' | 'failed'

export interface BreakthroughConfig {
  maxIterations: number
  breakthroughThreshold: number
  eliminationThreshold: number
  winnersCount: number
}

export interface RaceStatistics {
  totalGenerated: number
  totalEliminated: number
  totalBreakthroughs: number
  averageScore: number
  highestScore: number
}

export interface ActivityEntry {
  id: string
  time: Date
  message: string
  type: 'info' | 'success' | 'warning' | 'error' | 'breakthrough'
  phase?: BreakthroughPhase
  score?: number
}

export interface BreakthroughResult {
  winners: BackendRacingHypothesis[]
  breakthroughs: BackendRacingHypothesis[]
  statistics: RaceStatistics
  leaderboard: LeaderboardEntry[]
  totalIterations: number
  totalTimeMs: number
  earlyTermination: boolean
  terminationReason?: string
}

export interface PartialBreakthroughResult {
  phase: BreakthroughPhase
  winners: BackendRacingHypothesis[]
  leaderboard: LeaderboardEntry[]
  validations?: any[]
  reason: string
}

export interface UseBreakthroughWorkflowReturn {
  // State
  breakthroughId: string | null
  status: BreakthroughStatus
  phase: BreakthroughPhase
  elapsedTime: number
  query: string | null

  // Racing state
  hypotheses: UIRacingHypothesis[]
  leaderboard: LeaderboardEntry[]
  currentIteration: number
  maxIterations: number

  // Activity
  activities: ActivityEntry[]
  thinkingMessage: string | null

  // Results
  result: BreakthroughResult | null
  error: string | null

  // Partial results (graceful degradation)
  partialResult: PartialBreakthroughResult | null
  isPartialResult: boolean

  // Pause/Resume state
  isPaused: boolean
  pausedAtPhase: BreakthroughPhase | null

  // Actions
  startDiscovery: (query: string, config?: Partial<BreakthroughConfig>) => Promise<void>
  stopDiscovery: () => void
  reset: () => void
  pauseDiscovery: () => Promise<void>
  resumeDiscovery: () => Promise<void>
}

// ============================================================================
// Conversion Helpers
// ============================================================================

/**
 * Get classification tier from score (5-tier system)
 */
function getClassificationFromScore(score: number): ClassificationTier {
  if (score >= 9.0) return 'breakthrough'
  if (score >= 8.0) return 'scientific_discovery'
  if (score >= 6.5) return 'general_insights'
  if (score >= 5.0) return 'partial_failure'
  return 'failure'
}

/**
 * Extended UI Hypothesis with full backend data
 * Includes rich data for detailed hypothesis views
 */
export interface ExtendedUIHypothesis extends UIRacingHypothesis {
  statement?: string
  predictions?: Array<{ statement: string; expectedValue?: number; unit?: string }>
  mechanism?: { steps: Array<{ order: number; description: string; physicalPrinciple?: string }> }
  noveltyScore?: number
  feasibilityScore?: number
  impactScore?: number
  supportingEvidence?: Array<{ finding: string; citation: string; relevance: number }>
  refinementHistory?: Array<{ iteration: number; score: number; feedback?: string; improvements?: string[] }>
  /** Hybrid scoring fields (v0.0.3) */
  fsScore?: number           // 0-5
  bdScore?: number           // 0-9
  fsBonusScore?: number      // 0-1
  gateStatus?: {
    passed: boolean
    failedDimensions: string[]
    minFsPercentage?: number
    avgFsPercentage?: number
  }
  breakthroughRequirements?: {
    fsGatePassed: boolean
    bd1Performance: boolean
    bd1Percentage?: number
    bd6Trajectory: boolean
    bd6Percentage?: number
    bdHighCount: number
    overallScore: number
    meetsBreakthrough: boolean
  }
  fsDimensions?: Array<{
    dimension: string
    score: number
    maxScore: number
    percentage: number
    passed: boolean
  }>
  bdDimensions?: Array<{
    dimension: string
    score: number
    maxScore: number
    percentage: number
    isCritical?: boolean
    passed: boolean
  }>
}

/**
 * Convert backend RacingHypothesis to UI-compatible format
 * Now includes full hypothesis data (statement, predictions, mechanism) for detailed views
 * Also extracts hybrid scoring fields (v0.0.3) for Gate+Score+Bonus display
 */
function convertToUIHypothesis(backend: BackendRacingHypothesis): ExtendedUIHypothesis {
  const currentScore = backend.scores?.overall ?? 0
  const scoreHistory = backend.history?.map(h => h.score) ?? [currentScore]
  const previousScore = scoreHistory.length > 1 ? scoreHistory[scoreHistory.length - 2] : undefined

  // Extract hybrid scoring fields from backend scores (v0.0.3)
  const backendScores = backend.scores as Record<string, unknown> | undefined
  const fsScore = backendScores?.fsScore as number | undefined
  const bdScore = backendScores?.bdScore as number | undefined
  const fsBonusScore = backendScores?.fsBonusScore as number | undefined
  const gateStatus = backendScores?.gateStatus as ExtendedUIHypothesis['gateStatus']
  const breakthroughRequirements = backendScores?.breakthroughRequirements as ExtendedUIHypothesis['breakthroughRequirements']
  const fsDimensions = backendScores?.fsDimensions as ExtendedUIHypothesis['fsDimensions']
  const bdDimensions = backendScores?.bdDimensions as ExtendedUIHypothesis['bdDimensions']

  return {
    id: backend.id,
    title: backend.title,
    agentSource: backend.agentSource,
    status: backend.status === 'pending' ? 'active' : backend.status,
    currentScore,
    previousScore,
    scoreHistory,
    classification: getClassificationFromScore(currentScore),
    iteration: backend.iteration,
    eliminatedReason: backend.eliminatedReason,
    // Pass through rich hypothesis data for detailed views
    statement: backend.statement,
    predictions: backend.predictions,
    mechanism: backend.mechanism,
    noveltyScore: backend.noveltyScore,
    feasibilityScore: backend.feasibilityScore,
    impactScore: backend.impactScore,
    supportingEvidence: backend.supportingEvidence,
    refinementHistory: backend.history,
    // Hybrid scoring fields (v0.0.3)
    fsScore,
    bdScore,
    fsBonusScore,
    gateStatus,
    breakthroughRequirements,
    fsDimensions,
    bdDimensions,
  }
}

// ============================================================================
// Default Config
// ============================================================================

const DEFAULT_CONFIG: BreakthroughConfig = {
  maxIterations: 5,
  breakthroughThreshold: 9.0,
  eliminationThreshold: 5.0,
  winnersCount: 3,
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useBreakthroughWorkflow(): UseBreakthroughWorkflowReturn {
  // Core state
  const [breakthroughId, setBreakthroughId] = useState<string | null>(null)
  const [status, setStatus] = useState<BreakthroughStatus>('idle')
  const [phase, setPhase] = useState<BreakthroughPhase>('idle')
  const [elapsedTime, setElapsedTime] = useState(0)
  const [query, setQuery] = useState<string | null>(null)

  // Racing state
  const [hypotheses, setHypotheses] = useState<UIRacingHypothesis[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [currentIteration, setCurrentIteration] = useState(0)
  const [maxIterations, setMaxIterations] = useState(5)

  // Activity
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [thinkingMessage, setThinkingMessage] = useState<string | null>(null)

  // Results
  const [result, setResult] = useState<BreakthroughResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Partial results (graceful degradation)
  const [partialResult, setPartialResult] = useState<PartialBreakthroughResult | null>(null)

  // Pause/Resume state
  const [isPaused, setIsPaused] = useState(false)
  const [pausedAtPhase, setPausedAtPhase] = useState<BreakthroughPhase | null>(null)
  const pausedElapsedRef = useRef<number>(0)

  // Refs
  const eventSourceRef = useRef<EventSource | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  // Cleanup function
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  // Add activity helper
  const addActivity = useCallback((
    message: string,
    type: ActivityEntry['type'] = 'info',
    phase?: BreakthroughPhase,
    score?: number
  ) => {
    const activity: ActivityEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      time: new Date(),
      message,
      type,
      phase,
      score,
    }
    setActivities(prev => [...prev, activity])
  }, [])

  // Handle SSE events
  const handleSSEEvent = useCallback((data: Record<string, unknown>) => {
    const eventType = data.type as string
    // Use the new currentPhase field from SSE for cleaner phase detection
    const currentPhase = data.currentPhase as string | undefined
    const eventPhase = data.phase as string | undefined // legacy fallback
    const eventSource = data.source as string | undefined
    const eventStage = data.stage as string | undefined
    const message = data.message as string || ''

    console.log('[Breakthrough] SSE Event:', eventType, { currentPhase, phase: eventPhase }, data)

    // Helper: Map backend phase names to UI phase names
    // 'hypothesis' is the unified phase for generation + racing
    const mapPhaseToUI = (backendPhase: string | undefined): BreakthroughPhase | undefined => {
      if (!backendPhase) return undefined
      const phaseMap: Record<string, BreakthroughPhase> = {
        'research': 'researching',
        'hypothesis': 'hypothesis',   // Unified phase
        'generation': 'hypothesis',   // Legacy - maps to hypothesis
        'racing': 'hypothesis',       // Legacy - maps to hypothesis
        'validation': 'validating',
        'complete': 'complete',
        'failed': 'failed',
        'paused': 'hypothesis', // Keep current phase during pause
      }
      return phaseMap[backendPhase] || (backendPhase as BreakthroughPhase)
    }

    // Update phase from currentPhase if available
    const inferredPhase = mapPhaseToUI(currentPhase || eventPhase)
    // Don't update phase if paused - the mapPhaseToUI returns 'racing' for paused which is fine
    if (inferredPhase) {
      setPhase(inferredPhase)
    }

    switch (eventType) {
      case 'race_started':
        // Use currentPhase for cleaner detection
        if (currentPhase === 'research' || eventPhase === 'research' || eventSource) {
          setPhase('researching')
          setThinkingMessage(message || 'Starting comprehensive research...')
          addActivity(message || 'Research started', 'info', 'researching')
        } else if (currentPhase === 'validation' || message.toLowerCase().includes('gpu') || message.toLowerCase().includes('validation')) {
          setPhase('validating')
          setThinkingMessage(message || 'Starting GPU validation...')
          addActivity(message || 'GPU validation started', 'info', 'validating')
        } else {
          setPhase('hypothesis')
          setThinkingMessage(message || 'Starting hypothesis generation and racing...')
          addActivity(message || 'Hypothesis phase started', 'info', 'hypothesis')
        }
        break

      case 'iteration_started':
        // Use currentPhase for cleaner detection
        if (currentPhase === 'research' || eventSource) {
          setThinkingMessage(message || `Searching ${eventSource}...`)
          addActivity(message || `Searching ${eventSource}`, 'info', 'researching')
        } else if (currentPhase === 'validation' || message.toLowerCase().includes('validating') || data.hypothesisId) {
          // Validation phase - validating individual hypothesis
          setThinkingMessage(message || 'Validating hypothesis...')
          addActivity(message || 'Validating hypothesis', 'info', 'validating')
        } else {
          setCurrentIteration(data.iteration as number || 0)
          setMaxIterations(data.maxIterations as number || 5)
          setThinkingMessage(`Iteration ${data.iteration}/${data.maxIterations}`)
          addActivity(`Starting iteration ${data.iteration}`, 'info', 'hypothesis')
        }
        break

      case 'generation_complete':
        // Use currentPhase for cleaner detection - check if this is research or generation complete
        const sourcesCount = data.sourcesCount as number || 0
        const findingsCount = data.findingsCount as number || 0
        const gapsCount = data.gapsCount as number || 0

        if (currentPhase === 'research' || sourcesCount > 0 || findingsCount > 0) {
          // This is research complete - transition to hypothesis phase
          setPhase('hypothesis')
          setThinkingMessage(message || `Research complete: ${sourcesCount} sources, ${findingsCount} findings`)
          addActivity(message || `Research complete: ${sourcesCount} sources, ${findingsCount} findings, ${gapsCount} gaps`, 'success', 'researching')
        } else if (currentPhase === 'validation') {
          // This is validation complete
          addActivity(message || 'GPU validation complete', 'success', 'validating')
        } else {
          // This is hypothesis generation progress update (still in hypothesis phase)
          const hypCount = data.hypothesesCount as number || 0
          setThinkingMessage(`Generated ${hypCount} hypotheses`)
          addActivity(`Generated ${hypCount} hypotheses`, 'success', 'hypothesis')
        }
        break

      case 'evaluation_complete':
        // Use currentPhase for cleaner detection
        if (currentPhase === 'research' || eventSource) {
          const count = data.count as number || 0
          setThinkingMessage(message || `${eventSource} complete: ${count} results`)
          addActivity(message || `${eventSource}: ${count} results`, 'success', 'researching')
        } else if (currentPhase === 'validation') {
          // Validation phase evaluation complete
          const topScore = data.topScore as number || 0
          setThinkingMessage(message || `Hypothesis validated: ${topScore.toFixed(1)}/10`)
          addActivity(message || `Hypothesis validated`, 'success', 'validating', topScore)
        } else {
          const evalLeaderboard = data.leaderboard as LeaderboardEntry[] || []
          setLeaderboard(evalLeaderboard)
          const topScore = data.topScore as number || 0
          setThinkingMessage(`Top score: ${topScore.toFixed(2)}/10`)
          addActivity(`Evaluation complete. Top score: ${topScore.toFixed(2)}`, 'info', 'hypothesis', topScore)
        }
        break

      case 'refinement_complete':
        // Use currentPhase for cleaner detection
        if (currentPhase === 'research' || eventStage) {
          const stageLabels: Record<string, string> = {
            findings: 'Extracting key findings',
            gaps: 'Identifying technological gaps',
            cross_domain: 'Detecting cross-domain patterns',
            state_of_art: 'Identifying state-of-the-art metrics',
          }
          const stageLabel = eventStage ? (stageLabels[eventStage] || eventStage) : message
          setThinkingMessage(message || stageLabel)
          addActivity(message || stageLabel, 'info', 'researching')
        } else if (currentPhase === 'validation') {
          // Validation phase - skipped or note
          setThinkingMessage(message || 'Validation step completed')
          addActivity(message || 'Validation step completed', 'info', 'validating')
        } else {
          const activeCount = data.activeCount as number || 0
          setThinkingMessage(`Refining ${activeCount} active hypotheses`)
          addActivity(`Refinement complete. ${activeCount} hypotheses active`, 'info', 'hypothesis')
        }
        break

      case 'hypothesis_eliminated':
        const elimId = data.hypothesisId as string
        const elimScore = data.score as number
        addActivity(
          `Hypothesis ${elimId.slice(-8)} eliminated (score: ${elimScore?.toFixed(1) || 'N/A'})`,
          'warning',
          'hypothesis',
          elimScore
        )
        break

      case 'breakthrough_detected':
        const btId = data.hypothesisId as string
        const btScore = data.score as number
        const classification = data.classification as ClassificationTier
        addActivity(
          `Breakthrough detected! ${btId.slice(-8)} scored ${btScore?.toFixed(2) || 'N/A'}`,
          'breakthrough',
          'hypothesis',
          btScore
        )
        break

      case 'iteration_complete':
        const iterLeaderboard = data.leaderboard as LeaderboardEntry[] || []
        setLeaderboard(iterLeaderboard)
        const active = data.activeCount as number || 0
        const eliminated = data.eliminatedCount as number || 0
        const breakthroughs = data.breakthroughCount as number || 0
        setThinkingMessage(`${active} active, ${eliminated} eliminated, ${breakthroughs} breakthroughs`)
        addActivity(
          `Iteration ${data.iteration} complete: ${active} active, ${eliminated} eliminated, ${breakthroughs} breakthroughs`,
          breakthroughs > 0 ? 'success' : 'info',
          'hypothesis'
        )
        break

      case 'heartbeat':
        setElapsedTime(data.elapsed as number || 0)
        const hbLeaderboard = data.leaderboard as LeaderboardEntry[] || []
        if (hbLeaderboard.length > 0) {
          setLeaderboard(hbLeaderboard)
        }
        break

      case 'complete':
        setPhase('complete')
        setStatus('completed')
        setThinkingMessage(null)
        const completeResult = data.result as BreakthroughResult
        if (completeResult) {
          setResult(completeResult)
          if (completeResult.winners) {
            // Convert backend hypotheses to UI format
            setHypotheses(completeResult.winners.map(convertToUIHypothesis))
          }
          if (completeResult.leaderboard) {
            setLeaderboard(completeResult.leaderboard)
          }
        }
        addActivity(
          `Discovery complete! ${completeResult?.breakthroughs?.length || 0} breakthroughs found`,
          'success',
          'complete'
        )
        cleanup()
        break

      case 'error':
        setPhase('failed')
        setStatus('failed')
        setThinkingMessage(null)
        setError(data.error as string || 'Unknown error')
        addActivity(data.error as string || 'Discovery failed', 'error', 'failed')
        cleanup()
        break
    }
  }, [addActivity, cleanup])

  // Start discovery
  const startDiscovery = useCallback(async (
    queryText: string,
    config: Partial<BreakthroughConfig> = {}
  ) => {
    if (status === 'running') {
      console.warn('[Breakthrough] Discovery already running')
      return
    }

    // Reset state
    setStatus('starting')
    setPhase('researching')
    setQuery(queryText)
    setHypotheses([])
    setLeaderboard([])
    setCurrentIteration(0)
    setActivities([])
    setResult(null)
    setError(null)
    setThinkingMessage('Starting research phase...')
    setElapsedTime(0)

    // Start timer
    startTimeRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setElapsedTime(Date.now() - startTimeRef.current)
    }, 1000)

    addActivity('Starting breakthrough discovery...', 'info', 'researching')

    try {
      // Start discovery via POST
      const response = await fetch('/api/discovery/breakthrough', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: queryText,
          domain: 'clean-energy',
          config: {
            ...DEFAULT_CONFIG,
            ...config,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start discovery')
      }

      const data = await response.json()
      const newBreakthroughId = data.breakthroughId

      setBreakthroughId(newBreakthroughId)
      setStatus('running')

      console.log('[Breakthrough] Started:', newBreakthroughId)
      addActivity(`Research phase started (ID: ${newBreakthroughId.slice(-8)})`, 'info', 'researching')

      // Connect to SSE stream
      const eventSource = new EventSource(
        `/api/discovery/breakthrough?breakthroughId=${newBreakthroughId}&stream=true`
      )
      eventSourceRef.current = eventSource

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleSSEEvent(data)
        } catch (err) {
          console.error('[Breakthrough] Failed to parse SSE event:', err)
        }
      }

      eventSource.onerror = (err) => {
        console.error('[Breakthrough] SSE Error:', err)
        if (eventSource.readyState === EventSource.CLOSED) {
          // Connection closed unexpectedly
          if (eventSourceRef.current) {
            setError('Connection lost')
            setStatus('failed')
            setPhase('failed')
          }
        }
      }

    } catch (err) {
      console.error('[Breakthrough] Failed to start:', err)
      setError(err instanceof Error ? err.message : 'Failed to start discovery')
      setStatus('failed')
      setPhase('failed')
      cleanup()
    }
  }, [status, addActivity, handleSSEEvent, cleanup])

  // Stop discovery
  const stopDiscovery = useCallback(() => {
    cleanup()
    setStatus('idle')
    setPhase('idle')
    setThinkingMessage(null)
    addActivity('Discovery stopped', 'warning')
  }, [cleanup, addActivity])

  // Pause discovery
  const pauseDiscovery = useCallback(async () => {
    if (status !== 'running' || !breakthroughId) return

    try {
      pausedElapsedRef.current = elapsedTime

      const response = await fetch('/api/discovery/breakthrough', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          breakthroughId,
          action: 'pause',
        }),
      })

      if (response.ok) {
        // Pause the timer
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }

        setIsPaused(true)
        setPausedAtPhase(phase)
        setThinkingMessage('Discovery paused - awaiting your changes...')
        addActivity(`Discovery paused at ${phase} phase`, 'info')
      }
    } catch (err) {
      console.error('[Breakthrough] Pause failed:', err)
    }
  }, [status, breakthroughId, elapsedTime, phase, addActivity])

  // Resume discovery
  const resumeDiscovery = useCallback(async () => {
    if (!isPaused || !breakthroughId) return

    try {
      const response = await fetch('/api/discovery/breakthrough', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          breakthroughId,
          action: 'resume',
        }),
      })

      if (response.ok) {
        // Resume timer from where we left off
        startTimeRef.current = Date.now() - pausedElapsedRef.current
        timerRef.current = setInterval(() => {
          setElapsedTime(Date.now() - startTimeRef.current)
        }, 1000)

        setIsPaused(false)
        setPausedAtPhase(null)
        setThinkingMessage(null)
        addActivity(`Discovery resumed at ${pausedAtPhase} phase`, 'info')
      }
    } catch (err) {
      console.error('[Breakthrough] Resume failed:', err)
    }
  }, [isPaused, breakthroughId, pausedAtPhase, addActivity])

  // Reset state
  const reset = useCallback(() => {
    cleanup()
    setBreakthroughId(null)
    setStatus('idle')
    setPhase('idle')
    setElapsedTime(0)
    setQuery(null)
    setHypotheses([])
    setLeaderboard([])
    setCurrentIteration(0)
    setMaxIterations(5)
    setActivities([])
    setThinkingMessage(null)
    setResult(null)
    setError(null)
    setPartialResult(null)
    setIsPaused(false)
    setPausedAtPhase(null)
  }, [cleanup])

  return {
    breakthroughId,
    status,
    phase,
    elapsedTime,
    query,
    hypotheses,
    leaderboard,
    currentIteration,
    maxIterations,
    activities,
    thinkingMessage,
    result,
    error,

    // Partial results
    partialResult,
    isPartialResult: status === 'completed' && partialResult !== null,

    // Pause/Resume
    isPaused,
    pausedAtPhase,

    // Actions
    startDiscovery,
    stopDiscovery,
    reset,
    pauseDiscovery,
    resumeDiscovery,
  }
}

export default useBreakthroughWorkflow
