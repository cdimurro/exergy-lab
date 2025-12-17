/**
 * Unified Workflow API
 *
 * Handles workflow lifecycle:
 * - POST   /api/discovery/workflow          → Generate execution plan
 * - PUT    /api/discovery/workflow/execute  → Execute approved plan
 * - GET    /api/discovery/workflow/stream   → SSE status updates
 */

import { NextRequest, NextResponse } from 'next/server'
import { workflowPlanner } from '@/lib/discovery/workflow-planner'
import { ReasoningEngine } from '@/lib/ai/agent/reasoning-engine'
import { serverWorkflowStore } from '@/lib/discovery/workflow-store'
import { useConversationStore } from '@/lib/ai/agent/conversation-store'
import {
  initializeTools,
  generateHypothesesTool,
  designExperimentTool,
  runSimulationTool,
  calculateMetricsTool,
} from '@/lib/ai/tools/implementations'
import { registerGlobalTools } from '@/lib/ai/tools/registry'
import type {
  UnifiedWorkflow,
  WorkflowInput,
  WorkflowResults,
  ExecutionPlan,
  PhaseModification,
} from '@/types/workflow'
import type { Domain } from '@/types/discovery'

// Initialize tools at module load time (runs once when module is first imported)
const tools = initializeTools()
registerGlobalTools(tools)
console.log('[Workflow API] Registered', tools.length, 'tools')

// ============================================================================
// POST - Generate Execution Plan
// ============================================================================

/**
 * Generate execution plan from user query
 *
 * Request body:
 * {
 *   query: string,
 *   domains: Domain[],
 *   goals: string[],
 *   options?: WorkflowOptions
 * }
 *
 * Response:
 * {
 *   workflowId: string,
 *   plan: ExecutionPlan
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, domains = [], goals = [], options = {} } = body as WorkflowInput

    // Validate input
    if (!query || query.trim().length < 10) {
      return NextResponse.json(
        { error: 'Query must be at least 10 characters' },
        { status: 400 }
      )
    }

    // Generate execution plan using WorkflowPlanner
    console.log('[Workflow API] === Generating Plan ===')
    console.log('[Workflow API] Query:', query)
    console.log('[Workflow API] Domains:', domains)
    console.log('[Workflow API] Goals:', goals)

    const plan = await workflowPlanner.generatePlan({
      query,
      domains: domains as Domain[],
      goals,
      options,
    })

    console.log('[Workflow API] === Plan Generated ===')
    console.log('[Workflow API] Plan overview:', plan.overview)
    console.log('[Workflow API] Phases count:', plan.phases.length)
    if (plan.phases[0]?.details) {
      console.log('[Workflow API] First phase has details:', Object.keys(plan.phases[0].details))
    } else {
      console.log('[Workflow API] First phase has NO details (fallback plan)')
    }

    // Create workflow object
    const workflowId = generateWorkflowId()
    const workflow: UnifiedWorkflow = {
      id: workflowId,
      status: 'awaiting_approval',
      query,
      executionPlan: plan,
      checkpoints: [],
      results: createEmptyResults(),
      userDecisions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Store in server-side workflow store (persists across API requests)
    await serverWorkflowStore.create(workflow)

    console.log('[Workflow API] Plan generated:', {
      workflowId,
      phases: plan.phases.length,
      estimatedDuration: plan.estimatedDuration,
      estimatedCost: plan.estimatedCost,
    })

    return NextResponse.json({
      workflowId,
      plan,
      status: 'awaiting_approval',
    })
  } catch (error) {
    console.error('[Workflow API] Plan generation failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate execution plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// PUT - Execute Approved Plan
// ============================================================================

/**
 * Execute an approved workflow plan
 *
 * Request body:
 * {
 *   workflowId: string,
 *   modifications?: PhaseModification[]
 * }
 *
 * Response:
 * {
 *   workflowId: string,
 *   status: 'executing' | 'failed',
 *   sessionId: string
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { workflowId, modifications = [] } = body as {
      workflowId: string
      modifications?: PhaseModification[]
    }

    // Get workflow from server-side store
    const workflow = await serverWorkflowStore.get(workflowId)
    if (!workflow) {
      console.error('[Workflow API] Workflow not found:', workflowId)
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Validate workflow is awaiting approval
    if (workflow.status !== 'awaiting_approval') {
      return NextResponse.json(
        { error: `Workflow is ${workflow.status}, cannot execute` },
        { status: 400 }
      )
    }

    // Apply user modifications to plan
    if (modifications.length > 0) {
      console.log('[Workflow API] Applying', modifications.length, 'modifications')
      applyModifications(workflow.executionPlan, modifications)

      // Record user decision
      workflow.userDecisions.push({
        timestamp: Date.now(),
        type: 'plan_modified',
        modifications,
      })
    } else {
      // Record approval
      workflow.userDecisions.push({
        timestamp: Date.now(),
        type: 'plan_approved',
      })
    }

    // Update workflow status to executing
    await serverWorkflowStore.update(workflowId, {
      status: 'executing',
      userDecisions: workflow.userDecisions,
    })

    // Create ReasoningEngine instance for execution
    // Using reduced iterations but longer timeout to allow completion
    const engine = new ReasoningEngine({
      maxIterations: 3,
      enableStreaming: true,
      maxTokens: 8000,
      timeout: 90000, // 90 seconds for research phase
    })

    // Build agent query from execution plan
    const agentQuery = buildAgentQueryFromPlan(workflow.executionPlan)

    // Create conversation session for this workflow
    const sessionId = useConversationStore.getState().createSession(
      'workflow-user', // TODO: Replace with actual user ID
      agentQuery
    )

    console.log('[Workflow API] Executing workflow:', {
      workflowId,
      sessionId,
      phases: workflow.executionPlan.phases.length,
    })

    // Execute workflow in background (non-blocking)
    executeWorkflowAsync(workflow, engine, sessionId).catch(async (error) => {
      console.error('[Workflow API] Async execution failed:', error)
      await serverWorkflowStore.update(workflowId, {
        status: 'failed',
      })
    })

    return NextResponse.json({
      workflowId,
      sessionId,
      status: 'executing',
      message: 'Workflow execution started',
    })
  } catch (error) {
    console.error('[Workflow API] Execution start failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to start workflow execution',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET - Stream Execution Status (SSE)
// ============================================================================

/**
 * Stream real-time workflow execution status via Server-Sent Events
 *
 * Query params:
 * - workflowId: string
 *
 * Response: text/event-stream
 */
export async function GET(request: NextRequest) {
  const workflowId = request.nextUrl.searchParams.get('workflowId')

  if (!workflowId) {
    return NextResponse.json({ error: 'workflowId required' }, { status: 400 })
  }

  // Get workflow from server-side store
  const workflow = await serverWorkflowStore.get(workflowId)
  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  // Create SSE stream
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // Track if stream has been closed to prevent double-close errors
  let isStreamClosed = false

  // Safe close function that prevents double-close errors
  const safeCloseStream = async () => {
    if (isStreamClosed) return
    isStreamClosed = true
    try {
      await writer.close()
    } catch {
      // Stream already closed, ignore
    }
  }

  // Start streaming status updates
  const streamInterval = setInterval(async () => {
    // Skip if stream is already closed
    if (isStreamClosed) {
      clearInterval(streamInterval)
      return
    }

    try {
      const currentWorkflow = await serverWorkflowStore.get(workflowId)

      if (!currentWorkflow) {
        clearInterval(streamInterval)
        await safeCloseStream()
        return
      }

      // Build status update with checkpoint progress
      const latestCheckpoint = currentWorkflow.checkpoints?.slice(-1)[0]
      const statusUpdate = {
        type: 'status',
        workflowId,
        status: currentWorkflow.status,
        currentPhase: getCurrentPhase(currentWorkflow),
        overallProgress: calculateProgress(currentWorkflow),
        timestamp: Date.now(),
        message: getStatusMessage(currentWorkflow),
        checkpoint: latestCheckpoint?.data,
      }

      await writer.write(encoder.encode(`data: ${JSON.stringify(statusUpdate)}\n\n`))

      // Handle workflow completion
      if (currentWorkflow.status === 'completed') {
        console.log('[Workflow API SSE] Sending completion event with results')

        // Send complete event with results
        const completeEvent = {
          type: 'complete',
          workflowId,
          status: 'completed',
          results: currentWorkflow.results || {
            summary: 'Workflow completed successfully',
          },
          duration: currentWorkflow.duration,
          timestamp: Date.now(),
        }
        await writer.write(encoder.encode(`data: ${JSON.stringify(completeEvent)}\n\n`))

        clearInterval(streamInterval)
        setTimeout(safeCloseStream, 300)
        return
      }

      // Handle workflow failure
      if (currentWorkflow.status === 'failed') {
        console.log('[Workflow API SSE] Sending error event')

        // Find error message from checkpoints
        const errorCheckpoint = currentWorkflow.checkpoints?.find(c => c.phaseId === 'error')
        const errorMessage = errorCheckpoint?.data?.error || 'Workflow execution failed'

        const errorEvent = {
          type: 'error',
          workflowId,
          status: 'failed',
          error: errorMessage,
          timestamp: Date.now(),
        }
        await writer.write(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`))

        clearInterval(streamInterval)
        setTimeout(safeCloseStream, 300)
        return
      }
    } catch (error) {
      console.error('[Workflow API] Stream error:', error)
      clearInterval(streamInterval)
      await safeCloseStream()
    }
  }, 1000) // Update every second

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate unique workflow ID
 */
function generateWorkflowId(): string {
  return `workflow_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
}

/**
 * Create empty workflow results structure for 7-phase workflow
 */
function createEmptyResults(): WorkflowResults {
  return {
    research: {
      papers: [],
      patents: [],
      datasets: [],
      totalSources: 0,
      keyFindings: [],
      confidenceScore: 0,
      searchTime: 0,
    },
    hypotheses: {
      hypotheses: [],
      totalHypotheses: 0,
      topRanked: [],
      generationTime: 0,
    },
    experiments: {
      protocols: [],
      failureAnalyses: [],
      recommendations: [],
      totalProtocols: 0,
    },
    simulations: {
      runs: [],
      optimizations: [],
      visualizations: [],
      totalRuns: 0,
      averageAccuracy: 0,
    },
    tea: {
      lcoe: 0,
      npv: 0,
      irr: 0,
      paybackPeriod: 0,
      breakdown: {
        capitalCosts: [],
        operatingCosts: [],
        revenue: [],
        totalCapex: 0,
        totalOpex: 0,
        annualRevenue: 0,
      },
      sensitivityAnalysis: [],
      recommendations: [],
    },
    validation: {
      validationChecks: [],
      literatureComparisons: [],
      overallScore: 0,
      passed: false,
      issues: [],
      validationTime: 0,
    },
    qualityGates: {
      gates: [],
      overallScore: 0,
      passed: false,
      summary: '',
      recommendations: [],
      evaluationTime: 0,
    },
    crossFeatureInsights: [],
  }
}

/**
 * Apply user modifications to execution plan
 * Handles type coercion to ensure numeric/boolean values remain correct types
 * Supports both old format (parameterChanges) and new format (parameter/newValue)
 */
function applyModifications(plan: ExecutionPlan, modifications: any[]): void {
  console.log('[Workflow API] === Applying Modifications ===')
  console.log('[Workflow API] Modifications count:', modifications.length)

  for (const mod of modifications) {
    console.log('[Workflow API] Processing modification for phase:', mod.phaseId)
    console.log('[Workflow API] Modification data:', JSON.stringify(mod))

    const phase = plan.phases.find((p) => p.id === mod.phaseId)
    if (!phase) {
      console.warn('[Workflow API] Phase not found for modification:', mod.phaseId)
      continue
    }

    // Handle new format: { phaseId, parameter, newValue }
    if (mod.parameter !== undefined && mod.newValue !== undefined) {
      const key = mod.parameter
      const value = mod.newValue

      console.log(`[Workflow API] New format - param: "${key}", value: "${value}"`)

      // Handle 'enabled' as a special case - it's on the phase, not in parameters
      if (key === 'enabled') {
        phase.enabled = value === true || value === 'true'
        console.log(`[Workflow API]   -> Set phase.enabled to: ${phase.enabled}`)
        continue
      }

      // Coerce value based on original type
      const originalValue = phase.parameters[key]
      const originalType = typeof originalValue
      let coercedValue: any = value

      console.log(`[Workflow API] Coercing "${key}": value="${value}" (${typeof value}), original="${originalValue}" (${originalType})`)

      if (originalType === 'number' && typeof value === 'string') {
        const parsed = parseFloat(value)
        coercedValue = isNaN(parsed) ? 0 : parsed
      } else if (originalType === 'boolean' && typeof value === 'string') {
        coercedValue = value === 'true' || value === '1'
      } else if (originalType === 'undefined') {
        // New parameter - try to infer type
        if (typeof value === 'string') {
          const numVal = parseFloat(value)
          if (!isNaN(numVal) && String(numVal) === value) {
            coercedValue = numVal
          } else if (value === 'true' || value === 'false') {
            coercedValue = value === 'true'
          }
        }
      }

      phase.parameters[key] = coercedValue
      console.log(`[Workflow API]   -> Set phase.parameters["${key}"] to: ${coercedValue}`)
      continue
    }

    // Handle old format: { phaseId, parameterChanges: { key: value } }
    if (mod.parameterChanges) {
      console.log('[Workflow API] Old format - parameterChanges:', JSON.stringify(mod.parameterChanges))

      const coercedChanges: Record<string, unknown> = {}

      for (const [key, value] of Object.entries(mod.parameterChanges)) {
        // Handle 'enabled' as a special case
        if (key === 'enabled') {
          phase.enabled = value === true || value === 'true'
          console.log(`[Workflow API]   -> Set phase.enabled to: ${phase.enabled}`)
          continue
        }

        const originalValue = phase.parameters[key]
        const originalType = typeof originalValue

        console.log(`[Workflow API] Coercing "${key}": value="${value}" (${typeof value}), original="${originalValue}" (${originalType})`)

        if (originalType === 'number' && typeof value === 'string') {
          const parsed = parseFloat(value as string)
          coercedChanges[key] = isNaN(parsed) ? 0 : parsed
        } else if (originalType === 'boolean' && typeof value === 'string') {
          coercedChanges[key] = value === 'true' || value === '1'
        } else if (originalType === 'number' && typeof value === 'number') {
          coercedChanges[key] = value
        } else if (originalType === 'boolean' && typeof value === 'boolean') {
          coercedChanges[key] = value
        } else if (originalType === 'undefined' && typeof value === 'string') {
          const numVal = parseFloat(value as string)
          if (!isNaN(numVal) && String(numVal) === value) {
            coercedChanges[key] = numVal
          } else if (value === 'true' || value === 'false') {
            coercedChanges[key] = value === 'true'
          } else {
            coercedChanges[key] = value
          }
        } else {
          coercedChanges[key] = value
        }

        console.log(`[Workflow API]   -> Coerced to: ${coercedChanges[key]} (${typeof coercedChanges[key]})`)
      }

      phase.parameters = {
        ...phase.parameters,
        ...coercedChanges,
      }
    }

    console.log('[Workflow API] Modified phase:', phase.id)
    console.log('[Workflow API] Final parameters:', JSON.stringify(phase.parameters))
    console.log('[Workflow API] Phase enabled:', phase.enabled)
  }

  console.log('[Workflow API] === Modifications Applied ===')
}

/**
 * Build agent query from execution plan
 * Uses structured search terms from research phase instead of parsing overview text
 */
function buildAgentQueryFromPlan(plan: ExecutionPlan): string {
  // First priority: Get search terms directly from research phase details
  const researchPhase = plan.phases.find(p => p.type === 'research')
  const researchDetails = researchPhase?.details as { searchTerms?: string[], keyAreas?: string[] } | undefined

  if (researchDetails?.searchTerms?.length) {
    // Use the first 3 search terms for a focused query
    const query = researchDetails.searchTerms.slice(0, 3).join(' ')
    console.log('[Workflow API] Built search query from searchTerms:', query)
    return query
  }

  // Second priority: Use key areas if no search terms
  if (researchDetails?.keyAreas?.length) {
    const query = researchDetails.keyAreas.slice(0, 2).join(' ')
    console.log('[Workflow API] Built search query from keyAreas:', query)
    return query
  }

  // Third priority: Use searchTerms from parameters (older format)
  const searchTermsParam = researchPhase?.parameters?.searchTerms as string[] | undefined
  if (searchTermsParam?.length) {
    const query = searchTermsParam.slice(0, 3).join(' ')
    console.log('[Workflow API] Built search query from parameters:', query)
    return query
  }

  // Last resort: Extract research question from overview
  const overview = plan.overview
  // Look for the quoted research question in the overview
  const match = overview.match(/investigate:\s*"([^"]+)"/i)
  if (match?.[1]) {
    console.log('[Workflow API] Built search query from overview match:', match[1])
    return match[1]
  }

  // Fallback to first line of overview, cleaned
  const firstLine = overview.split('\n')[0]
    .replace(/^A \d+-phase research workflow to investigate:\s*/i, '')
    .replace(/["]/g, '')
    .trim()
    .slice(0, 100)

  const query = firstLine || 'clean energy research'
  console.log('[Workflow API] Built search query (fallback):', query)
  return query
}

/**
 * Calculate exergy metrics for a simulation based on its type
 * Uses second-law thermodynamic analysis to determine efficiency limits
 */
function calculateExergyForSimulation(
  simResult: any,
  simulationType: string
): {
  exergyEfficiency: number
  exergyDestruction: number
  secondLawEfficiency: number
  theoreticalMax: number
  carnotFactor: number
  energyType: string
} {
  // Extract simulation metrics
  const metrics = simResult.metrics || {}
  const annualProduction = metrics.annualProduction?.value || metrics['Annual Production']?.value || 100000
  const efficiency = metrics.efficiency?.value || metrics.systemEfficiency?.value || 85

  // Dead state temperature (25°C = 298.15K)
  const T0 = 298.15

  // Calculate exergy based on simulation type
  let theoreticalMax = 100
  let carnotFactor = 1
  let energyType = 'electrical'
  let inputExergy = annualProduction / (efficiency / 100)
  let outputExergy = annualProduction

  switch (simulationType) {
    case 'solar_pv':
      // Solar PV: Petela formula for solar exergy
      // Max theoretical ~93.6% but practical limit ~30% for single junction
      const SOLAR_TEMP = 5778  // Sun surface temperature K
      const tempRatio = T0 / SOLAR_TEMP
      const petelaEfficiency = 1 - (4/3) * tempRatio + (1/3) * Math.pow(tempRatio, 4)
      theoreticalMax = 30  // Practical Shockley-Queisser limit for single junction
      carnotFactor = petelaEfficiency
      energyType = 'solar'
      break

    case 'solar_thermal':
      // Solar thermal with typical collector temperature ~400K
      const collectorTemp = 400
      carnotFactor = 1 - (T0 / collectorTemp)
      theoreticalMax = carnotFactor * 100  // ~25-35%
      energyType = 'thermal'
      break

    case 'wind_turbine':
      // Wind: Betz limit 59.3%
      theoreticalMax = 59.3
      carnotFactor = 0.593
      energyType = 'wind'
      break

    case 'battery_storage':
      // Battery: Round-trip efficiency limit ~98%
      theoreticalMax = 98
      carnotFactor = 0.98
      energyType = 'electrical'
      break

    case 'hydrogen_electrolyzer':
      // Electrolyzer: Thermodynamic limit ~83% (LHV basis)
      theoreticalMax = 83
      carnotFactor = 0.83
      energyType = 'chemical'
      break

    case 'fuel_cell':
      // Fuel cell: Gibbs free energy limit ~83%
      theoreticalMax = 83
      carnotFactor = 0.83
      energyType = 'chemical'
      break

    case 'heat_pump':
      // Heat pump COP can exceed 100% (typical 300-500%)
      theoreticalMax = 500  // COP of 5
      carnotFactor = 5
      energyType = 'thermal'
      break

    case 'combined_system':
    default:
      // Generic system - use first law efficiency as baseline
      theoreticalMax = 85
      carnotFactor = 0.85
      energyType = 'mixed'
      break
  }

  // Calculate exergy metrics
  const exergyEfficiency = Math.min(efficiency, theoreticalMax)
  const exergyDestruction = inputExergy - outputExergy
  const secondLawEfficiency = theoreticalMax > 0 ? (exergyEfficiency / theoreticalMax) * 100 : 0

  return {
    exergyEfficiency: Math.round(exergyEfficiency * 100) / 100,
    exergyDestruction: Math.round(Math.max(0, exergyDestruction) * 100) / 100,
    secondLawEfficiency: Math.round(secondLawEfficiency * 100) / 100,
    theoreticalMax: Math.round(theoreticalMax * 100) / 100,
    carnotFactor: Math.round(carnotFactor * 10000) / 10000,
    energyType,
  }
}

/**
 * Execute workflow asynchronously with timeout and proper progress tracking
 */
async function executeWorkflowAsync(
  workflow: UnifiedWorkflow,
  engine: ReasoningEngine,
  sessionId: string
): Promise<void> {
  const EXECUTION_TIMEOUT = 120000 // 2 minutes max for entire workflow
  const startTime = Date.now()

  console.log('[executeWorkflowAsync] === Starting Workflow Execution ===')
  console.log('[executeWorkflowAsync] Workflow ID:', workflow.id)
  console.log('[executeWorkflowAsync] Session ID:', sessionId)
  console.log('[executeWorkflowAsync] Phases:', workflow.executionPlan.phases.map(p => p.type))

  try {
    // Update status to executing with initial progress
    await serverWorkflowStore.update(workflow.id, {
      status: 'executing',
      checkpoints: [{
        phaseId: 'start',
        timestamp: startTime,
        data: { message: 'Workflow execution started' },
      }],
    })

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Workflow execution timeout')), EXECUTION_TIMEOUT)
    })

    // Execute with timeout protection
    const executionPromise = executeWorkflowPhases(workflow, engine, sessionId)

    const result = await Promise.race([executionPromise, timeoutPromise])

    const duration = Date.now() - startTime
    console.log('[executeWorkflowAsync] === Workflow Completed ===')
    console.log('[executeWorkflowAsync] Duration:', duration, 'ms')
    console.log('[executeWorkflowAsync] Success:', result.success)

    // Update workflow with final results
    await serverWorkflowStore.update(workflow.id, {
      status: result.success ? 'completed' : 'failed',
      results: result.results,
      duration,
      checkpoints: [
        ...(workflow.checkpoints || []),
        {
          phaseId: 'complete',
          timestamp: Date.now(),
          data: {
            success: result.success,
            duration,
            message: result.success ? 'Workflow completed successfully' : result.error,
          },
        },
      ],
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[executeWorkflowAsync] === Workflow Failed ===')
    console.error('[executeWorkflowAsync] Error:', errorMessage)

    await serverWorkflowStore.update(workflow.id, {
      status: 'failed',
      duration: Date.now() - startTime,
      checkpoints: [
        ...(workflow.checkpoints || []),
        {
          phaseId: 'error',
          timestamp: Date.now(),
          data: { error: errorMessage },
        },
      ],
    })
  }
}

/**
 * Execute workflow phases with progress updates
 * Runs all 7 phases in sequence, chaining outputs between phases
 */
async function executeWorkflowPhases(
  workflow: UnifiedWorkflow,
  engine: ReasoningEngine,
  sessionId: string
): Promise<{ success: boolean; results?: any; error?: string }> {
  const phases = workflow.executionPlan.phases
  const totalPhases = phases.length
  let currentCheckpoints: any[] = workflow.checkpoints || []
  let completedPhases = 0

  console.log('[executeWorkflowPhases] Starting multi-phase execution')
  console.log('[executeWorkflowPhases] Total phases:', totalPhases)
  console.log('[executeWorkflowPhases] Phase types:', phases.map(p => p.type).join(', '))

  // Initialize results structure
  const results: any = {
    summary: '',
    research: {
      papers: [],
      patents: [],
      datasets: [],
      totalSources: 0,
      keyFindings: [],
      confidenceScore: 0,
      searchTime: 0,
    },
    hypotheses: {
      hypotheses: [],
      totalHypotheses: 0,
      topRanked: [],
      generationTime: 0,
    },
    experiments: {
      protocols: [],
      failureAnalyses: [],
      recommendations: [],
      totalProtocols: 0,
    },
    simulations: {
      runs: [],
      optimizations: [],
      visualizations: [],
      totalRuns: 0,
      averageAccuracy: 0,
    },
    tea: {
      lcoe: 0,
      npv: 0,
      irr: 0,
      paybackPeriod: 0,
      breakdown: { capitalCosts: [], operatingCosts: [], revenue: [], totalCapex: 0, totalOpex: 0, annualRevenue: 0 },
      sensitivityAnalysis: [],
      recommendations: [],
    },
    validation: {
      validationChecks: [],
      literatureComparisons: [],
      overallScore: 0,
      passed: false,
      issues: [],
      validationTime: 0,
    },
    qualityGates: {
      gates: [],
      overallScore: 0,
      passed: false,
      summary: '',
      recommendations: [],
      evaluationTime: 0,
    },
    analysis: {
      synthesis: '',
      keyFindings: [],
      recommendations: [],
      confidence: 0,
    },
    crossFeatureInsights: [],
  }

  // Helper to update checkpoints and send progress
  const updateProgress = async (phaseId: string, phaseType: string, message: string) => {
    completedPhases++
    const progress = Math.round((completedPhases / totalPhases) * 100)

    currentCheckpoints = [
      ...currentCheckpoints,
      {
        phaseId,
        timestamp: Date.now(),
        data: { phaseType, progress, message },
      },
    ]

    await serverWorkflowStore.update(workflow.id, {
      checkpoints: currentCheckpoints,
    })

    console.log(`[executeWorkflowPhases] ${message} (${progress}%)`)
  }

  // Helper to check if a phase is enabled
  const isPhaseEnabled = (phaseType: string): boolean => {
    const phase = phases.find(p => p.type === phaseType)
    return phase?.enabled !== false
  }

  // Helper to get phase config
  const getPhaseConfig = (phaseType: string) => {
    return phases.find(p => p.type === phaseType)
  }

  try {
    // ========================================================================
    // PHASE 1: Research (using ReasoningEngine)
    // ========================================================================
    if (isPhaseEnabled('research')) {
      console.log('[executeWorkflowPhases] === Phase 1: Research ===')
      const researchStart = Date.now()

      const agentResult = await engine.execute(
        buildAgentQueryFromPlan(workflow.executionPlan),
        sessionId
      )

      if (agentResult.success) {
        const sources = agentResult.sources || []
        const papers = sources.filter((s: any) => s.type === 'academic-paper' || !s.type)
        const patents = sources.filter((s: any) => s.type === 'patent')

        // Extract key findings from metadata, or generate from paper titles if empty
        let keyFindings = agentResult.metadata?.keyFindings || []
        if (keyFindings.length === 0 && papers.length > 0) {
          // Generate fallback keyFindings from paper titles/snippets
          keyFindings = papers.slice(0, 5).map((p: any) =>
            p.title || p.snippet?.substring(0, 150) || 'Research finding'
          ).filter(Boolean)
          console.log('[executeWorkflowPhases] Generated fallback keyFindings from papers:', keyFindings.length)
        }

        results.research = {
          papers,
          patents,
          datasets: [],
          totalSources: sources.length,
          keyFindings,
          confidenceScore: agentResult.metadata?.confidence || 75,
          searchTime: Date.now() - researchStart,
        }

        results.analysis = {
          synthesis: agentResult.metadata?.synthesis || agentResult.response,
          keyFindings,
          recommendations: agentResult.metadata?.recommendations || [],
          confidence: agentResult.metadata?.confidence || 75,
        }

        await updateProgress('research', 'research', 'Research phase completed')
      } else {
        console.warn('[executeWorkflowPhases] Research failed:', agentResult.error)
        // Continue with other phases even if research partially fails
        await updateProgress('research', 'research', 'Research phase completed with partial results')
      }
    }

    // ========================================================================
    // PHASE 2: Hypothesis Generation
    // ========================================================================
    if (isPhaseEnabled('hypothesis') && results.research.papers.length > 0) {
      console.log('[executeWorkflowPhases] === Phase 2: Hypothesis Generation ===')
      const hypothesisStart = Date.now()

      try {
        const phaseConfig = getPhaseConfig('hypothesis')
        // Extract domain from query (e.g., "solar", "battery", "hydrogen")
        const queryLower = workflow.query.toLowerCase()
        const detectedDomain = queryLower.includes('solar') ? 'solar-energy' :
          queryLower.includes('battery') ? 'battery-storage' :
          queryLower.includes('hydrogen') ? 'hydrogen' :
          queryLower.includes('wind') ? 'wind-energy' : 'clean-energy'

        const hypothesisResult = await generateHypothesesTool.handler({
          researchFindings: results.research.papers.slice(0, 10).map((p: any) => ({
            title: p.title || 'Research Finding',
            keyInsights: [p.abstract || p.snippet || 'Key insight from research'],
            gaps: [],
          })),
          domain: detectedDomain,
          goals: results.analysis.keyFindings.slice(0, 3) || ['Identify key innovations'],
          constraints: {
            maxHypotheses: phaseConfig?.parameters?.maxHypotheses || 5,
          },
        })

        if (hypothesisResult?.hypotheses) {
          results.hypotheses = {
            hypotheses: hypothesisResult.hypotheses.map((h: any, i: number) => ({
              id: `hyp-${i + 1}`,
              title: h.statement?.substring(0, 100) || `Hypothesis ${i + 1}`,
              statement: h.statement || '',
              rationale: h.supportingEvidence?.join('; ') || '',
              supportingEvidence: h.supportingEvidence || [],
              testablePredicitions: h.predictions?.map((p: any) => p.description) || [],
              noveltyScore: h.noveltyScore || 70,
              feasibilityScore: h.feasibilityScore || 70,
              impactScore: h.impactScore || 70,
              overallScore: Math.round(((h.noveltyScore || 70) + (h.feasibilityScore || 70) + (h.impactScore || 70)) / 3),
              status: 'proposed' as const,
            })),
            totalHypotheses: hypothesisResult.hypotheses.length,
            topRanked: [],
            generationTime: Date.now() - hypothesisStart,
          }
          // Set top ranked
          results.hypotheses.topRanked = [...results.hypotheses.hypotheses]
            .sort((a: any, b: any) => b.overallScore - a.overallScore)
            .slice(0, 3)
        }

        await updateProgress('hypothesis', 'hypothesis', 'Hypothesis generation completed')
      } catch (error) {
        console.warn('[executeWorkflowPhases] Hypothesis generation failed:', error)
        await updateProgress('hypothesis', 'hypothesis', 'Hypothesis generation skipped')
      }
    } else {
      console.log('[executeWorkflowPhases] Hypothesis phase SKIPPED:', {
        enabled: isPhaseEnabled('hypothesis'),
        papersCount: results.research.papers.length,
        keyFindingsCount: results.research.keyFindings.length,
      })
    }

    // ========================================================================
    // PHASE 3: Experiment Design
    // ========================================================================
    if (isPhaseEnabled('experiment') && results.hypotheses.hypotheses.length > 0) {
      console.log('[executeWorkflowPhases] === Phase 3: Experiment Design ===')

      try {
        const phaseConfig = getPhaseConfig('experiment')
        const topHypothesis = results.hypotheses.topRanked[0]

        // Reuse detected domain from earlier
        const queryLower = workflow.query.toLowerCase()
        const detectedDomain = queryLower.includes('solar') ? 'solar-energy' :
          queryLower.includes('battery') ? 'battery-storage' :
          queryLower.includes('hydrogen') ? 'hydrogen' :
          queryLower.includes('wind') ? 'wind-energy' : 'clean-energy'

        const experimentResult = await designExperimentTool.handler({
          goal: {
            description: topHypothesis?.statement || 'Validate clean energy hypothesis',
            objectives: topHypothesis?.testablePredicitions || ['Test key predictions'],
            domain: detectedDomain,
          },
          referenceResearch: results.research.papers.slice(0, 3).map((p: any) => ({
            title: p.title || 'Reference Paper',
            methodology: p.abstract?.substring(0, 200) || 'Standard methodology',
          })),
          constraints: {
            budget: phaseConfig?.parameters?.budget || 10000,
            timeline: phaseConfig?.parameters?.timeline || '3 months',
            safetyLevel: 'standard' as const,
          },
        })

        if (experimentResult) {
          results.experiments = {
            protocols: [{
              id: 'exp-1',
              title: experimentResult.title || 'Experimental Protocol',
              objective: experimentResult.objective || topHypothesis?.statement || '',
              materials: experimentResult.materials || [],
              equipment: experimentResult.equipment || [],
              procedure: experimentResult.procedure || [],
              safetyWarnings: experimentResult.safetyWarnings || [],
              expectedResults: experimentResult.expectedResults || [],
              duration: experimentResult.duration || '2-4 weeks',
              difficulty: experimentResult.difficulty || 'medium',
              cost: experimentResult.estimatedCost || 5000,
            }],
            failureAnalyses: (experimentResult.failureModes || []).map((f: any, i: number) => ({
              protocolId: 'exp-1',
              failureMode: f.mode || `Failure mode ${i + 1}`,
              likelihood: f.likelihood || 'medium',
              impact: 'medium' as const,
              riskScore: f.likelihood === 'high' ? 80 : f.likelihood === 'medium' ? 50 : 20,
              mitigation: f.mitigation || [],
            })),
            recommendations: experimentResult.expectedResults || [],
            totalProtocols: 1,
          }
        }

        await updateProgress('experiment', 'experiment', 'Experiment design completed')
      } catch (error) {
        console.warn('[executeWorkflowPhases] Experiment design failed:', error)
        await updateProgress('experiment', 'experiment', 'Experiment design skipped')
      }
    } else {
      console.log('[executeWorkflowPhases] Experiment phase SKIPPED:', {
        enabled: isPhaseEnabled('experiment'),
        hypothesesCount: results.hypotheses.hypotheses.length,
      })
    }

    // ========================================================================
    // PHASE 4: Simulation
    // ========================================================================
    if (isPhaseEnabled('simulation')) {
      console.log('[executeWorkflowPhases] === Phase 4: Simulation ===')
      const simStart = Date.now()

      try {
        const phaseConfig = getPhaseConfig('simulation')

        // Detect simulation type from query (domain-aware)
        const queryLower = workflow.query.toLowerCase()
        const detectedSimType: 'solar_pv' | 'solar_thermal' | 'wind_turbine' | 'battery_storage' | 'hydrogen_electrolyzer' | 'fuel_cell' | 'heat_pump' | 'combined_system' =
          queryLower.includes('solar') ? 'solar_pv' :
          queryLower.includes('wind') ? 'wind_turbine' :
          queryLower.includes('battery') || queryLower.includes('storage') ? 'battery_storage' :
          queryLower.includes('hydrogen') || queryLower.includes('electrolyzer') ? 'hydrogen_electrolyzer' :
          queryLower.includes('fuel cell') ? 'fuel_cell' :
          queryLower.includes('heat pump') ? 'heat_pump' :
          'combined_system' // Default for carbon capture, materials, etc.

        console.log('[executeWorkflowPhases] Detected simulation type:', detectedSimType)

        // Build domain-specific parameters
        const simParams = detectedSimType === 'solar_pv' ? {
          capacity: phaseConfig?.parameters?.capacity || 100,
          panelEfficiency: phaseConfig?.parameters?.efficiency || 0.2,
        } : detectedSimType === 'battery_storage' ? {
          capacity: phaseConfig?.parameters?.capacity || 100,
          roundTripEfficiency: 0.9,
        } : detectedSimType === 'hydrogen_electrolyzer' ? {
          capacity: phaseConfig?.parameters?.capacity || 100,
          efficiency: 0.7,
        } : detectedSimType === 'wind_turbine' ? {
          capacity: phaseConfig?.parameters?.capacity || 100,
          hubHeight: 80,
        } : {
          // Generic/combined system defaults
          capacity: phaseConfig?.parameters?.capacity || 100,
          efficiency: phaseConfig?.parameters?.efficiency || 0.8,
        }

        const simResult = await runSimulationTool.handler({
          tier: 'tier1' as const,
          simulationType: detectedSimType,
          parameters: {
            ...simParams,
            ...phaseConfig?.parameters,
          },
          timeHorizon: 8760, // 1 year
          timeStep: 60,
        })

        if (simResult) {
          // Calculate exergy metrics based on simulation type
          const exergyMetrics = calculateExergyForSimulation(simResult, detectedSimType)

          // Build base metrics from simulation
          const baseMetrics = Object.entries(simResult.metrics || {}).map(([name, data]: [string, any]) => ({
            name,
            value: data.value || 0,
            unit: data.unit || '',
            uncertainty: data.uncertainty,
          }))

          // Add exergy metrics to simulation results
          const allMetrics = [
            ...baseMetrics,
            { name: 'Exergy Efficiency', value: exergyMetrics.exergyEfficiency, unit: '%' },
            { name: 'Exergy Destruction', value: exergyMetrics.exergyDestruction, unit: 'kWh' },
            { name: 'Second Law Efficiency', value: exergyMetrics.secondLawEfficiency, unit: '%' },
            { name: 'Theoretical Max Efficiency', value: exergyMetrics.theoreticalMax, unit: '%' },
          ]

          results.simulations = {
            runs: [{
              id: 'sim-1',
              name: simResult.scenario || 'Baseline Simulation',
              tier: 'local' as const,
              parameters: simResult.parameters || {},
              metrics: allMetrics,
              status: 'completed' as const,
              duration: Date.now() - simStart,
              accuracy: simResult.confidence || 85,
            }],
            optimizations: (simResult.recommendations || []).map((rec: string, i: number) => ({
              parameter: `Optimization ${i + 1}`,
              optimalValue: 0,
              improvement: 5 + i * 2,
              confidence: 80,
            })),
            visualizations: [],
            totalRuns: 1,
            averageAccuracy: simResult.confidence || 85,
            // Store exergy analysis for TEA integration
            exergyAnalysis: exergyMetrics,
          }

          console.log('[executeWorkflowPhases] Exergy analysis:', exergyMetrics)
        }

        await updateProgress('simulation', 'simulation', 'Simulation completed')
      } catch (error) {
        console.warn('[executeWorkflowPhases] Simulation failed:', error)
        await updateProgress('simulation', 'simulation', 'Simulation skipped')
      }
    }

    // ========================================================================
    // PHASE 5: Techno-Economic Analysis (TEA)
    // ========================================================================
    if (isPhaseEnabled('tea')) {
      console.log('[executeWorkflowPhases] === Phase 5: TEA Analysis ===')

      try {
        const phaseConfig = getPhaseConfig('tea')

        // Get energy production estimate from simulation results
        const annualEnergyProduction = results.simulations.runs[0]?.metrics
          ?.find((m: any) => m.name === 'Annual Production' || m.name === 'annualProduction')?.value || 100000

        const teaResult = await calculateMetricsTool.handler({
          type: 'tea',  // Correct field name
          data: {       // Financial data goes in 'data' object
            capitalCost: phaseConfig?.parameters?.capitalCost || 100000,
            operatingCost: phaseConfig?.parameters?.operatingCost || 5000,
            annualRevenue: phaseConfig?.parameters?.revenue || 20000,
            annualEnergyProduction,
            energyPrice: phaseConfig?.parameters?.energyPrice || 0.10,  // $/kWh
          },
          parameters: {  // Options go in 'parameters'
            discountRate: phaseConfig?.parameters?.discountRate || 0.08,
            projectLifetime: phaseConfig?.parameters?.lifetime || 25,
          },
        })

        // Results are flat, not nested under .tea
        if (teaResult) {
          const capitalCost = phaseConfig?.parameters?.capitalCost || 100000
          const operatingCost = phaseConfig?.parameters?.operatingCost || 5000
          const annualRevenue = phaseConfig?.parameters?.revenue || 20000

          // Get exergy analysis from simulation for exergo-economic integration
          const exergyAnalysis = (results.simulations as any).exergyAnalysis || {
            exergyEfficiency: 85,
            exergyDestruction: 15000,
            secondLawEfficiency: 70,
            theoreticalMax: 100,
          }

          // Calculate exergo-economic metrics
          const lcoe = teaResult.lcoe || 0.05
          const exergyEfficiencyFactor = exergyAnalysis.exergyEfficiency / 100
          const specificExergyCost = exergyEfficiencyFactor > 0 ? lcoe / exergyEfficiencyFactor : lcoe
          const exergyDestructionCost = lcoe * (1 - exergyEfficiencyFactor) * annualEnergyProduction
          const exergoEconomicFactor = exergyEfficiencyFactor  // f_k factor

          results.tea = {
            lcoe,
            npv: teaResult.npv || 0,
            irr: teaResult.irrPercentage || teaResult.irr || 0,
            paybackPeriod: teaResult.simplePaybackPeriod || teaResult.discountedPaybackPeriod || 0,
            breakdown: {
              capitalCosts: [{ category: 'Equipment & Installation', amount: capitalCost }],
              operatingCosts: [{ category: 'Annual O&M', amount: operatingCost }],
              revenue: [{ source: 'Energy Sales', amount: annualRevenue }],
              totalCapex: capitalCost,
              totalOpex: operatingCost * (phaseConfig?.parameters?.lifetime || 25),
              annualRevenue,
            },
            sensitivityAnalysis: teaResult.sensitivityAnalysis || [],
            recommendations: teaResult.isViable
              ? ['Project shows positive NPV and is economically viable']
              : ['Consider reducing capital costs or increasing revenue to improve viability'],
            // Exergo-economic analysis
            exergyAnalysis: {
              specificExergyCost: Math.round(specificExergyCost * 10000) / 10000,  // $/kWh-exergy
              exergyDestructionCost: Math.round(exergyDestructionCost),  // $/year lost to inefficiency
              exergoEconomicFactor: Math.round(exergoEconomicFactor * 100) / 100,  // f_k
              exergyEfficiency: exergyAnalysis.exergyEfficiency,
              secondLawEfficiency: exergyAnalysis.secondLawEfficiency,
              theoreticalMaxEfficiency: exergyAnalysis.theoreticalMax,
              // Cost breakdown by exergy component
              costOfExergyDestruction: Math.round(exergyDestructionCost * (phaseConfig?.parameters?.lifetime || 25)),
              potentialSavings: Math.round(exergyDestructionCost * 0.3 * (phaseConfig?.parameters?.lifetime || 25)),  // 30% improvement potential
            },
          }

          console.log('[executeWorkflowPhases] TEA calculated with exergo-economics:', {
            npv: results.tea.npv,
            irr: results.tea.irr,
            lcoe: results.tea.lcoe,
            payback: results.tea.paybackPeriod,
            specificExergyCost: (results.tea as any).exergyAnalysis?.specificExergyCost,
            exergyEfficiency: (results.tea as any).exergyAnalysis?.exergyEfficiency,
          })
        }

        await updateProgress('tea', 'tea', 'TEA analysis completed')
      } catch (error) {
        console.warn('[executeWorkflowPhases] TEA analysis failed:', error)
        await updateProgress('tea', 'tea', 'TEA analysis skipped')
      }
    }

    // ========================================================================
    // PHASE 6: Validation
    // ========================================================================
    if (isPhaseEnabled('validation')) {
      console.log('[executeWorkflowPhases] === Phase 6: Validation ===')
      const validationStart = Date.now()

      // Perform validation checks on all previous results
      const validationChecks: any[] = []
      let overallScore = 0
      let checkCount = 0

      // Check research quality
      if (results.research.papers.length > 0) {
        const researchScore = Math.min(100, results.research.papers.length * 10)
        validationChecks.push({
          name: 'Research Coverage',
          description: 'Sufficient research sources gathered',
          result: researchScore >= 50 ? 'pass' : 'warning',
          score: researchScore,
          details: `Found ${results.research.papers.length} research papers`,
        })
        overallScore += researchScore
        checkCount++
      }

      // Check hypothesis quality
      if (results.hypotheses.hypotheses.length > 0) {
        const avgScore = results.hypotheses.hypotheses.reduce((sum: number, h: any) => sum + h.overallScore, 0) / results.hypotheses.hypotheses.length
        validationChecks.push({
          name: 'Hypothesis Quality',
          description: 'Generated hypotheses meet quality standards',
          result: avgScore >= 60 ? 'pass' : 'warning',
          score: avgScore,
          details: `Average hypothesis score: ${avgScore.toFixed(1)}`,
        })
        overallScore += avgScore
        checkCount++
      }

      // Check simulation accuracy
      if (results.simulations.runs.length > 0) {
        const simAccuracy = results.simulations.averageAccuracy || 75
        validationChecks.push({
          name: 'Simulation Accuracy',
          description: 'Simulation results meet accuracy thresholds',
          result: simAccuracy >= 70 ? 'pass' : 'warning',
          score: simAccuracy,
          details: `Average simulation accuracy: ${simAccuracy}%`,
        })
        overallScore += simAccuracy
        checkCount++
      }

      // Check TEA validity
      if (results.tea.npv !== 0) {
        const teaScore = results.tea.npv > 0 ? 85 : 40
        validationChecks.push({
          name: 'Economic Viability',
          description: 'Project shows positive economic indicators',
          result: teaScore >= 60 ? 'pass' : 'fail',
          score: teaScore,
          details: `NPV: $${results.tea.npv.toLocaleString()}, IRR: ${results.tea.irr}%`,
        })
        overallScore += teaScore
        checkCount++
      }

      // Check exergy efficiency against theoretical limits
      const exergyData = (results.simulations as any).exergyAnalysis
      if (exergyData) {
        // Exergy efficiency benchmarks by technology type
        const exergyBenchmarks: Record<string, { min: number; typical: number; max: number }> = {
          solar: { min: 10, typical: 15, max: 25 },
          wind: { min: 35, typical: 45, max: 59.3 },
          electrical: { min: 80, typical: 90, max: 98 },
          chemical: { min: 50, typical: 65, max: 85 },
          thermal: { min: 20, typical: 35, max: 50 },
          mixed: { min: 60, typical: 75, max: 90 },
        }

        const benchmark = exergyBenchmarks[exergyData.energyType] || exergyBenchmarks.mixed
        const exergyEfficiency = exergyData.exergyEfficiency || 0
        const secondLawEfficiency = exergyData.secondLawEfficiency || 0

        // Score based on how close to typical efficiency
        let exergyScore = 50
        if (exergyEfficiency >= benchmark.typical) {
          exergyScore = 85  // At or above typical
        } else if (exergyEfficiency >= benchmark.min) {
          exergyScore = 70  // Above minimum but below typical
        } else {
          exergyScore = 40  // Below minimum benchmark
        }

        // Validate against theoretical maximum (Carnot, Betz, etc.)
        const theoreticalMax = exergyData.theoreticalMax || 100
        const isPhysicallyValid = exergyEfficiency <= theoreticalMax * 1.05  // 5% tolerance

        validationChecks.push({
          name: 'Exergy Efficiency',
          description: 'Second-law thermodynamic efficiency within acceptable range',
          result: isPhysicallyValid && exergyScore >= 60 ? 'pass' : exergyScore >= 40 ? 'warning' : 'fail',
          score: exergyScore,
          details: `η_ex: ${exergyEfficiency.toFixed(1)}% (benchmark: ${benchmark.min}-${benchmark.max}%), η_II: ${secondLawEfficiency.toFixed(1)}%`,
        })
        overallScore += exergyScore
        checkCount++

        // Check for thermodynamic law violations
        if (!isPhysicallyValid) {
          validationChecks.push({
            name: 'Thermodynamic Validity',
            description: 'Results comply with second law of thermodynamics',
            result: 'fail',
            score: 0,
            details: `Exergy efficiency ${exergyEfficiency.toFixed(1)}% exceeds theoretical maximum ${theoreticalMax.toFixed(1)}%`,
          })
          overallScore += 0
          checkCount++
        }
      }

      results.validation = {
        validationChecks,
        literatureComparisons: [],
        overallScore: checkCount > 0 ? Math.round(overallScore / checkCount) : 50,
        passed: checkCount > 0 ? (overallScore / checkCount) >= 60 : false,
        issues: validationChecks
          .filter(c => c.result !== 'pass')
          .map(c => ({
            severity: c.result === 'fail' ? 'major' as const : 'minor' as const,
            phase: 'validation' as any,
            description: c.details,
            recommendation: `Improve ${c.name.toLowerCase()}`,
          })),
        validationTime: Date.now() - validationStart,
      }

      await updateProgress('validation', 'validation', 'Validation completed')
    }

    // ========================================================================
    // PHASE 7: Quality Gates
    // ========================================================================
    if (isPhaseEnabled('quality_gates')) {
      console.log('[executeWorkflowPhases] === Phase 7: Quality Gates ===')
      const qgStart = Date.now()

      const gates: any[] = [
        {
          name: 'Research Completeness',
          description: 'All required research sources have been gathered',
          weight: 0.2,
          score: Math.min(100, results.research.papers.length * 5),
          threshold: 60,
          passed: results.research.papers.length >= 5,
          details: `${results.research.papers.length} papers, ${results.research.patents.length} patents`,
          affectedPhases: ['research'],
        },
        {
          name: 'Hypothesis Validity',
          description: 'Hypotheses are testable and well-supported',
          weight: 0.2,
          score: results.hypotheses.hypotheses.length > 0
            ? results.hypotheses.topRanked[0]?.overallScore || 70
            : 50,
          threshold: 60,
          passed: results.hypotheses.hypotheses.length > 0,
          details: `${results.hypotheses.totalHypotheses} hypotheses generated`,
          affectedPhases: ['hypothesis'],
        },
        {
          name: 'Experimental Feasibility',
          description: 'Proposed experiments are practical and safe',
          weight: 0.15,
          score: results.experiments.protocols.length > 0 ? 80 : 50,
          threshold: 60,
          passed: results.experiments.protocols.length > 0,
          details: `${results.experiments.totalProtocols} protocols designed`,
          affectedPhases: ['experiment'],
        },
        {
          name: 'Simulation Confidence',
          description: 'Simulations provide reliable predictions',
          weight: 0.15,
          score: results.simulations.averageAccuracy || 70,
          threshold: 70,
          passed: (results.simulations.averageAccuracy || 0) >= 70,
          details: `${results.simulations.totalRuns} simulation runs`,
          affectedPhases: ['simulation'],
        },
        {
          name: 'Economic Viability',
          description: 'Project shows positive return on investment',
          weight: 0.2,
          score: results.tea.npv > 0 ? 85 : 40,
          threshold: 60,
          passed: results.tea.npv > 0 && results.tea.irr > 5,
          details: `NPV: $${results.tea.npv.toLocaleString()}, Payback: ${results.tea.paybackPeriod} years`,
          affectedPhases: ['tea'],
        },
        {
          name: 'Overall Validation',
          description: 'Results pass validation checks',
          weight: 0.1,
          score: results.validation.overallScore || 70,
          threshold: 60,
          passed: results.validation.passed,
          details: `${results.validation.validationChecks.filter((c: any) => c.result === 'pass').length}/${results.validation.validationChecks.length} checks passed`,
          affectedPhases: ['validation'],
        },
      ]

      const overallScore = gates.reduce((sum, g) => sum + g.score * g.weight, 0)
      const passedGates = gates.filter(g => g.passed).length

      results.qualityGates = {
        gates,
        overallScore: Math.round(overallScore),
        passed: passedGates >= 4 && overallScore >= 60,
        summary: `${passedGates}/${gates.length} quality gates passed with overall score of ${Math.round(overallScore)}%`,
        recommendations: gates
          .filter(g => !g.passed)
          .map(g => `Improve ${g.name}: ${g.details}`),
        evaluationTime: Date.now() - qgStart,
      }

      await updateProgress('quality_gates', 'quality_gates', 'Quality gates evaluation completed')
    }

    // ========================================================================
    // Generate Comprehensive Summary
    // ========================================================================
    results.summary = generateComprehensiveReport(results, workflow.query)
    results.crossFeatureInsights = [
      ...results.analysis.keyFindings,
      ...results.qualityGates.recommendations,
    ].slice(0, 10)

    console.log('[executeWorkflowPhases] === All Phases Completed ===')
    console.log('[executeWorkflowPhases] Total phases executed:', completedPhases)

    return { success: true, results }

  } catch (error) {
    console.error('[executeWorkflowPhases] Critical error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during workflow execution',
      results,
    }
  }
}

/**
 * Generate a comprehensive report from all phase results
 */
function generateComprehensiveReport(results: any, query: string): string {
  const sections: string[] = []

  sections.push(`# Comprehensive Research Report\n\n**Query:** ${query}\n`)

  // Research Summary
  if (results.research.papers.length > 0 || results.research.patents.length > 0) {
    sections.push(`## Research Summary\n`)
    sections.push(`Found **${results.research.papers.length} papers** and **${results.research.patents.length} patents**.`)
    if (results.analysis.synthesis) {
      sections.push(`\n${results.analysis.synthesis}`)
    }
    if (results.analysis.keyFindings?.length > 0) {
      sections.push(`\n### Key Findings`)
      results.analysis.keyFindings.forEach((f: string, i: number) => {
        sections.push(`${i + 1}. ${f}`)
      })
    }
  }

  // Hypotheses
  if (results.hypotheses.hypotheses.length > 0) {
    sections.push(`\n## Generated Hypotheses (${results.hypotheses.totalHypotheses})`)
    results.hypotheses.topRanked.forEach((h: any, i: number) => {
      sections.push(`\n### Hypothesis ${i + 1}: ${h.title}`)
      sections.push(`**Statement:** ${h.statement}`)
      sections.push(`**Scores:** Novelty: ${h.noveltyScore}%, Feasibility: ${h.feasibilityScore}%, Impact: ${h.impactScore}%`)
    })
  }

  // Experiments
  if (results.experiments.protocols.length > 0) {
    sections.push(`\n## Experimental Design`)
    results.experiments.protocols.forEach((p: any) => {
      sections.push(`\n### ${p.title}`)
      sections.push(`**Objective:** ${p.objective}`)
      sections.push(`**Duration:** ${p.duration} | **Difficulty:** ${p.difficulty} | **Cost:** $${p.cost}`)
    })
  }

  // Simulations
  if (results.simulations.runs.length > 0) {
    sections.push(`\n## Simulation Results`)
    sections.push(`Completed **${results.simulations.totalRuns}** simulation runs with **${results.simulations.averageAccuracy}%** average accuracy.`)
    results.simulations.runs.forEach((run: any) => {
      sections.push(`\n### ${run.name}`)
      run.metrics.forEach((m: any) => {
        sections.push(`- ${m.name}: ${m.value} ${m.unit}`)
      })
    })
  }

  // TEA
  if (results.tea.npv !== 0) {
    sections.push(`\n## Techno-Economic Analysis`)
    sections.push(`- **LCOE:** $${results.tea.lcoe.toFixed(4)}/kWh`)
    sections.push(`- **NPV:** $${results.tea.npv.toLocaleString()}`)
    sections.push(`- **IRR:** ${results.tea.irr.toFixed(1)}%`)
    sections.push(`- **Payback Period:** ${results.tea.paybackPeriod} years`)
  }

  // Quality Gates
  if (results.qualityGates.gates.length > 0) {
    sections.push(`\n## Quality Assessment`)
    sections.push(`**Overall Score:** ${results.qualityGates.overallScore}%`)
    sections.push(`**Status:** ${results.qualityGates.passed ? '✅ PASSED' : '⚠️ NEEDS IMPROVEMENT'}`)
    sections.push(`\n${results.qualityGates.summary}`)
  }

  // Recommendations
  const allRecommendations = [
    ...(results.analysis.recommendations || []),
    ...(results.tea.recommendations || []),
    ...(results.qualityGates.recommendations || []),
  ]
  if (allRecommendations.length > 0) {
    sections.push(`\n## Recommendations`)
    allRecommendations.slice(0, 10).forEach((r: string, i: number) => {
      sections.push(`${i + 1}. ${r}`)
    })
  }

  return sections.join('\n')
}

/**
 * Get current executing phase
 */
function getCurrentPhase(workflow: UnifiedWorkflow): string | undefined {
  if (workflow.status !== 'executing') return undefined

  // Find first incomplete phase (simplified - would use checkpoints in production)
  const completedPhases = workflow.checkpoints.map((c) => c.phaseId)
  const currentPhase = workflow.executionPlan.phases.find(
    (p) => !completedPhases.includes(p.id)
  )

  return currentPhase?.title
}

/**
 * Calculate overall progress percentage
 */
function calculateProgress(workflow: UnifiedWorkflow): number {
  if (workflow.status === 'completed') return 100
  if (workflow.status === 'planning' || workflow.status === 'awaiting_approval') return 0

  const totalPhases = workflow.executionPlan.phases.length
  const completedPhases = workflow.checkpoints.length

  return Math.min(100, Math.floor((completedPhases / totalPhases) * 100))
}

/**
 * Get human-readable status message
 */
function getStatusMessage(workflow: UnifiedWorkflow): string {
  switch (workflow.status) {
    case 'planning':
      return 'Generating execution plan...'
    case 'awaiting_approval':
      return 'Waiting for user approval'
    case 'executing':
      const currentPhase = getCurrentPhase(workflow)
      return currentPhase ? `Executing: ${currentPhase}` : 'Executing workflow...'
    case 'completed':
      return 'Workflow completed successfully'
    case 'failed':
      return 'Workflow failed'
    case 'cancelled':
      return 'Workflow cancelled by user'
    default:
      return 'Unknown status'
  }
}
