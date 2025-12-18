'use client'

/**
 * useFrontierScienceWorkflow Hook
 *
 * Manages the FrontierScience discovery workflow with SSE streaming.
 * Provides real-time progress updates, iteration tracking, and rubric scores.
 * Integrates with debug capture for admin debugging.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import type {
  DiscoveryPhase,
  DiscoveryQuality,
  DiscoveryResult,
  JudgeResult,
} from '@/lib/ai/rubrics/types'
import { classifyDiscoveryQuality } from '@/lib/ai/rubrics/types'
import type {
  WorkflowStatus,
  PhaseProgressDisplay,
  DiscoveryOptions,
  UseFrontierScienceWorkflowReturn,
  SSEEvent,
  ALL_PHASES,
} from '@/types/frontierscience'
import { useDebugCapture } from '@/hooks/use-debug-capture'

// All phases in order
const DISCOVERY_PHASES: DiscoveryPhase[] = [
  'research',
  'synthesis',
  'hypothesis',
  'screening',
  'experiment',
  'simulation',
  'exergy',
  'tea',
  'patent',
  'validation',
  'rubric_eval',
  'publication',
]

function createInitialPhaseProgress(): Map<DiscoveryPhase, PhaseProgressDisplay> {
  const map = new Map<DiscoveryPhase, PhaseProgressDisplay>()
  for (const phase of DISCOVERY_PHASES) {
    map.set(phase, {
      phase,
      status: 'pending',
      currentIteration: 0,
      maxIterations: 3,
    })
  }
  return map
}

export function useFrontierScienceWorkflow(): UseFrontierScienceWorkflowReturn {
  // Debug capture hook
  const debugCapture = useDebugCapture({
    enabled: typeof window !== 'undefined' && (
      process.env.NODE_ENV === 'development' ||
      process.env.NEXT_PUBLIC_ENABLE_DEBUG_VIEWER === 'true'
    ),
  })

  // Core state
  const [discoveryId, setDiscoveryId] = useState<string | null>(null)
  const [status, setStatus] = useState<WorkflowStatus>('idle')
  const [currentPhase, setCurrentPhase] = useState<DiscoveryPhase | null>(null)
  const [phaseProgress, setPhaseProgress] = useState<Map<DiscoveryPhase, PhaseProgressDisplay>>(
    createInitialPhaseProgress
  )
  const [elapsedTime, setElapsedTime] = useState(0)
  const [result, setResult] = useState<DiscoveryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [thinkingMessage, setThinkingMessage] = useState<string | null>(null)

  // Refs for cleanup
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

  // Start elapsed time timer
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setElapsedTime(Date.now() - startTimeRef.current)
    }, 1000)
  }, [])

  // Handle SSE events
  const handleSSEEvent = useCallback((event: SSEEvent) => {
    // Capture event for debugging
    const phase = 'phase' in event ? event.phase : undefined
    debugCapture.captureSSEEvent(event.type, event, phase)

    console.log('[FrontierScience UI] SSE Event received:', event.type, event)

    switch (event.type) {
      case 'progress': {
        const { phase, status: phaseStatus, iteration, maxIterations, score, passed, message } = event
        console.log('[FrontierScience UI] Progress update:', { phase, phaseStatus, iteration, score, passed })
        setCurrentPhase(phase)
        setPhaseProgress(prev => {
          const newMap = new Map(prev)
          const existing = newMap.get(phase) || {
            phase,
            status: 'pending',
            currentIteration: 0,
            maxIterations: 3,
          }
          newMap.set(phase, {
            ...existing,
            status: phaseStatus,
            currentIteration: iteration ?? existing.currentIteration,
            maxIterations: maxIterations ?? existing.maxIterations,
            score: score ?? existing.score,
            passed: passed ?? existing.passed,
            message: message ?? existing.message,
            startTime: phaseStatus === 'running' && !existing.startTime ? Date.now() : existing.startTime,
            endTime: phaseStatus === 'completed' || phaseStatus === 'failed' ? Date.now() : existing.endTime,
          })
          return newMap
        })
        break
      }

      case 'iteration': {
        const { phase, iteration, maxIterations, judgeResult, previousScore } = event
        setPhaseProgress(prev => {
          const newMap = new Map(prev)
          const existing = newMap.get(phase)
          if (existing) {
            newMap.set(phase, {
              ...existing,
              currentIteration: iteration,
              maxIterations,
              score: judgeResult.totalScore,
              passed: judgeResult.passed,
              judgeResult,
            })
          }
          return newMap
        })
        break
      }

      case 'thinking': {
        const { message, details } = event
        const fullMessage = details?.length
          ? `${message}\n${details.map(d => `  - ${d}`).join('\n')}`
          : message
        setThinkingMessage(fullMessage)
        break
      }

      case 'complete': {
        setStatus('completed')
        // Parse the result summary into a full result
        const summary = event.result
        setResult({
          id: summary.id,
          query: summary.query,
          domain: summary.domain,
          phases: summary.phases.map(p => ({
            phase: p.phase,
            finalOutput: null, // Not sent in summary
            finalScore: p.finalScore,
            passed: p.passed,
            iterations: [],
            durationMs: 0,
          })),
          overallScore: summary.overallScore,
          discoveryQuality: summary.discoveryQuality,
          recommendations: summary.recommendations,
          startTime: new Date(),
          endTime: new Date(),
          totalDurationMs: summary.totalDuration,
        } as DiscoveryResult)
        setThinkingMessage(null)
        cleanup()
        break
      }

      case 'error': {
        setStatus('failed')
        setError(event.error)
        setThinkingMessage(null)
        cleanup()
        break
      }

      case 'heartbeat': {
        // Just update elapsed time
        setElapsedTime(event.elapsed)
        break
      }
    }
  }, [cleanup, debugCapture])

  // Start discovery
  const startDiscovery = useCallback(async (query: string, options?: DiscoveryOptions) => {
    // Reset state
    setDiscoveryId(null)
    setStatus('starting')
    setCurrentPhase(null)
    setPhaseProgress(createInitialPhaseProgress())
    setElapsedTime(0)
    setResult(null)
    setError(null)
    setThinkingMessage(null)
    cleanup()

    // Clear previous debug session
    debugCapture.clearSession()

    try {
      const apiStartTime = Date.now()
      const requestPayload = {
        query,
        domain: options?.domain ?? 'clean-energy',
        targetQuality: options?.targetQuality ?? 'validated',
        options: {
          enablePatentAnalysis: options?.enablePatentAnalysis ?? true,
          enableExergyAnalysis: options?.enableExergyAnalysis ?? true,
          enableTEAAnalysis: options?.enableTEAAnalysis ?? true,
          maxIterationsPerPhase: options?.maxIterationsPerPhase ?? 3,
        },
      }

      // POST to start discovery
      const response = await fetch('/api/discovery/frontierscience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      })

      const apiEndTime = Date.now()

      if (!response.ok) {
        const errorData = await response.json()
        // Log failed API call
        debugCapture.addApiCall({
          timestamp: apiStartTime,
          method: 'POST',
          url: '/api/discovery/frontierscience',
          requestPayload,
          responsePayload: errorData,
          statusCode: response.status,
          duration: apiEndTime - apiStartTime,
          error: errorData.error || 'Request failed',
        })
        throw new Error(errorData.error || 'Failed to start discovery')
      }

      const data = await response.json()
      const newDiscoveryId = data.discoveryId

      // Log successful API call
      debugCapture.addApiCall({
        timestamp: apiStartTime,
        method: 'POST',
        url: '/api/discovery/frontierscience',
        requestPayload,
        responsePayload: data,
        statusCode: response.status,
        duration: apiEndTime - apiStartTime,
      })

      // Start debug session
      debugCapture.startSession(newDiscoveryId, query)

      setDiscoveryId(newDiscoveryId)
      setStatus('running')
      startTimer()

      // Start SSE connection
      const eventSource = new EventSource(
        `/api/discovery/frontierscience?discoveryId=${newDiscoveryId}&stream=true`
      )
      eventSourceRef.current = eventSource

      eventSource.onmessage = (event) => {
        try {
          console.log('[FrontierScience UI] Raw SSE message:', event.data)
          const data = JSON.parse(event.data) as SSEEvent
          handleSSEEvent(data)
        } catch (err) {
          console.error('[FrontierScience] Failed to parse SSE event:', err, event.data)
        }
      }

      eventSource.onerror = (err) => {
        console.error('[FrontierScience] SSE error:', err)
        // Don't immediately set to failed - connection might reconnect
        // Only fail if we're still in running state after a delay
        setTimeout(() => {
          if (eventSourceRef.current === eventSource) {
            setStatus('failed')
            setError('Connection lost to discovery server')
            cleanup()
          }
        }, 5000)
      }
    } catch (err) {
      console.error('[FrontierScience] Start error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setStatus('failed')
      setError(errorMessage)

      // Log error to debug capture
      debugCapture.addError({
        timestamp: Date.now(),
        message: errorMessage,
        stack: err instanceof Error ? err.stack : undefined,
        context: { action: 'startDiscovery', query, options },
      })
      debugCapture.endSession('failed')

      cleanup()
    }
  }, [cleanup, handleSSEEvent, startTimer, debugCapture])

  // Cancel discovery
  const cancelDiscovery = useCallback(() => {
    cleanup()
    setStatus('idle')
    setThinkingMessage(null)
    // Note: We don't reset other state so user can see what was completed
  }, [cleanup])

  // Computed values
  const qualityTier = useMemo((): DiscoveryQuality | null => {
    if (result) {
      return result.discoveryQuality
    }
    // Calculate from current progress
    const completedPhases = Array.from(phaseProgress.values()).filter(
      p => p.status === 'completed' && p.score !== undefined
    )
    if (completedPhases.length === 0) return null

    const avgScore = completedPhases.reduce((sum, p) => sum + (p.score || 0), 0) / completedPhases.length
    return classifyDiscoveryQuality(avgScore)
  }, [result, phaseProgress])

  const passedPhases = useMemo((): DiscoveryPhase[] => {
    return Array.from(phaseProgress.entries())
      .filter(([_, p]) => p.passed === true)
      .map(([phase]) => phase)
  }, [phaseProgress])

  const failedPhases = useMemo((): DiscoveryPhase[] => {
    return Array.from(phaseProgress.entries())
      .filter(([_, p]) => p.status === 'completed' && p.passed === false)
      .map(([phase]) => phase)
  }, [phaseProgress])

  const completedPhasesCount = useMemo((): number => {
    return Array.from(phaseProgress.values()).filter(
      p => p.status === 'completed'
    ).length
  }, [phaseProgress])

  const overallProgress = useMemo((): number => {
    const completed = completedPhasesCount
    const total = DISCOVERY_PHASES.length
    const currentProgress = currentPhase
      ? (phaseProgress.get(currentPhase)?.currentIteration || 0) /
        (phaseProgress.get(currentPhase)?.maxIterations || 3) * 0.5
      : 0
    return Math.min(100, ((completed + currentProgress) / total) * 100)
  }, [completedPhasesCount, currentPhase, phaseProgress])

  return {
    // State
    discoveryId,
    status,
    currentPhase,
    phaseProgress,
    overallProgress,
    elapsedTime,
    result,
    error,
    thinkingMessage,

    // Actions
    startDiscovery,
    cancelDiscovery,

    // Computed
    qualityTier,
    passedPhases,
    failedPhases,
    completedPhasesCount,
    totalPhasesCount: DISCOVERY_PHASES.length,
  }
}

export default useFrontierScienceWorkflow
