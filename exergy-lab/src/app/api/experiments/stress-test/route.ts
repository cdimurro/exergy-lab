/**
 * Stress Test API Endpoint
 *
 * POST /api/experiments/stress-test - Start a stress test experiment
 * GET /api/experiments/stress-test - List experiments or get specific result
 * DELETE /api/experiments/stress-test - Delete an experiment
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  StressTestRunner,
  runQuickTest,
  runCategoryTest,
  runSpecificPrompts,
  runFullStressTest,
} from '@/lib/experiments/stress-test-runner'
import { ExperimentLogger, listExperiments, loadExperiment, deleteExperiment } from '@/lib/experiments/experiment-logger'
import { ExperimentAnalyzer } from '@/lib/experiments/experiment-analyzer'
import { ALL_TEST_PROMPTS, getPromptsByCategory, getPromptsByIds } from '@/lib/experiments/test-prompts'
import type { ExperimentResult } from '@/lib/experiments/types'

// In-memory store for running experiments
const runningExperiments = new Map<string, {
  runner: StressTestRunner
  status: 'running' | 'completed' | 'aborted'
  result?: ExperimentResult
}>()

// =============================================================================
// POST - Start Experiment
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      mode = 'quick',        // 'quick' | 'full' | 'category' | 'specific'
      category,              // For mode='category'
      promptIds,             // For mode='specific'
      concurrency = 2,
      timeoutPerDiscovery = 5 * 60 * 1000,
      name,
    } = body

    // Determine which prompts to run
    let prompts = ALL_TEST_PROMPTS

    switch (mode) {
      case 'quick':
        const { getQuickTestSet } = await import('@/lib/experiments/test-prompts')
        prompts = getQuickTestSet()
        break
      case 'category':
        if (!category) {
          return NextResponse.json(
            { error: 'category is required for mode=category' },
            { status: 400 }
          )
        }
        prompts = getPromptsByCategory(category)
        break
      case 'specific':
        if (!promptIds || !Array.isArray(promptIds)) {
          return NextResponse.json(
            { error: 'promptIds array is required for mode=specific' },
            { status: 400 }
          )
        }
        prompts = getPromptsByIds(promptIds)
        break
      case 'full':
        // Use all prompts
        break
      default:
        return NextResponse.json(
          { error: `Invalid mode: ${mode}. Use 'quick', 'full', 'category', or 'specific'` },
          { status: 400 }
        )
    }

    if (prompts.length === 0) {
      return NextResponse.json(
        { error: 'No prompts match the specified criteria' },
        { status: 400 }
      )
    }

    // Create runner
    const runner = new StressTestRunner({
      name: name || `${mode} stress test - ${new Date().toISOString()}`,
      prompts,
      concurrency: Math.min(Math.max(concurrency, 1), 3), // 1-3
      timeoutPerDiscovery,
      captureFullLogs: true,
      stopOnCriticalFailure: false,
    })

    // Get experiment ID before starting
    const experimentId = (runner as any).experimentId

    // Store running state
    runningExperiments.set(experimentId, {
      runner,
      status: 'running',
    })

    // Set up progress tracking
    runner.setProgressCallback((progress) => {
      console.log(`[StressTest API] Progress: ${progress.completed}/${progress.total}`)
    })

    // Start experiment in background
    runner.run()
      .then(async (result) => {
        const state = runningExperiments.get(experimentId)
        if (state) {
          state.status = 'completed'
          state.result = result

          // Save results
          const logger = new ExperimentLogger(experimentId)
          const analyzer = new ExperimentAnalyzer(result)
          const analysis = analyzer.analyze()

          await logger.exportAll(result, analysis)
          console.log(`[StressTest API] Experiment ${experimentId} completed and saved`)
        }
      })
      .catch((error) => {
        console.error(`[StressTest API] Experiment ${experimentId} failed:`, error)
        const state = runningExperiments.get(experimentId)
        if (state) {
          state.status = 'aborted'
        }
      })

    return NextResponse.json({
      experimentId,
      status: 'started',
      mode,
      promptCount: prompts.length,
      estimatedDuration: `${Math.ceil(prompts.length * 3 / concurrency)} minutes`,
      message: 'Experiment started. Poll GET /api/experiments/stress-test?id=... for status.',
    })
  } catch (error) {
    console.error('[StressTest API] Failed to start experiment:', error)
    return NextResponse.json(
      {
        error: 'Failed to start experiment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// =============================================================================
// GET - List/Get Experiments
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    const listAll = request.nextUrl.searchParams.get('list') === 'true'
    const analyze = request.nextUrl.searchParams.get('analyze') === 'true'

    // List all experiments
    if (listAll || (!id && !listAll)) {
      const experiments = await listExperiments()

      // Also include running experiments
      const running = Array.from(runningExperiments.entries())
        .filter(([_, state]) => state.status === 'running')
        .map(([id, state]) => ({
          id,
          status: 'running',
          progress: (state.runner as any).results?.length || 0,
        }))

      return NextResponse.json({
        experiments: experiments.slice(-20), // Last 20
        running,
        totalCount: experiments.length,
      })
    }

    // Get specific experiment
    if (id) {
      // Check if it's running
      const runningState = runningExperiments.get(id)
      if (runningState) {
        const progress = {
          completed: (runningState.runner as any).results?.length || 0,
          total: (runningState.runner as any).config?.prompts?.length || 0,
        }

        if (runningState.status === 'running') {
          return NextResponse.json({
            experimentId: id,
            status: 'running',
            progress,
          })
        }

        // Completed but still in memory
        if (runningState.result) {
          const response: any = {
            experimentId: id,
            status: runningState.status,
            result: runningState.result,
          }

          // Include analysis if requested
          if (analyze && runningState.result) {
            const analyzer = new ExperimentAnalyzer(runningState.result)
            response.analysis = analyzer.analyze()
          }

          return NextResponse.json(response)
        }
      }

      // Load from file system
      const result = await loadExperiment(id)
      if (!result) {
        return NextResponse.json(
          { error: `Experiment ${id} not found` },
          { status: 404 }
        )
      }

      const response: any = {
        experimentId: id,
        status: 'completed',
        result,
      }

      // Include analysis if requested
      if (analyze) {
        const analyzer = new ExperimentAnalyzer(result)
        response.analysis = analyzer.analyze()
      }

      return NextResponse.json(response)
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('[StressTest API] Failed to get experiment:', error)
    return NextResponse.json(
      {
        error: 'Failed to get experiment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// =============================================================================
// DELETE - Delete or Abort Experiment
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    const abort = request.nextUrl.searchParams.get('abort') === 'true'

    if (!id) {
      return NextResponse.json(
        { error: 'id parameter is required' },
        { status: 400 }
      )
    }

    // Check if running and abort requested
    const runningState = runningExperiments.get(id)
    if (runningState && abort) {
      runningState.runner.abort()
      runningState.status = 'aborted'
      runningExperiments.delete(id)
      return NextResponse.json({
        experimentId: id,
        status: 'aborted',
        message: 'Experiment aborted',
      })
    }

    // Delete from file system
    const deleted = await deleteExperiment(id)
    if (!deleted) {
      return NextResponse.json(
        { error: `Experiment ${id} not found or could not be deleted` },
        { status: 404 }
      )
    }

    // Also remove from running experiments if present
    runningExperiments.delete(id)

    return NextResponse.json({
      experimentId: id,
      status: 'deleted',
      message: 'Experiment deleted',
    })
  } catch (error) {
    console.error('[StressTest API] Failed to delete experiment:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete experiment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
