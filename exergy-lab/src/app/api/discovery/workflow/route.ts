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
import { useConversationStore } from '@/lib/ai/agent/conversation-store'
import type {
  UnifiedWorkflow,
  WorkflowInput,
  WorkflowResults,
  ExecutionPlan,
  PhaseModification,
} from '@/types/workflow'
import type { Domain } from '@/types/discovery'

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
    console.log('[Workflow API] Generating plan for query:', query)
    const plan = await workflowPlanner.generatePlan({
      query,
      domains: domains as Domain[],
      goals,
      options,
    })

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

    // Store in ConversationStore
    useConversationStore.getState().createWorkflow(workflow)

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

    // Get workflow from store
    const workflow = useConversationStore.getState().getWorkflow(workflowId)
    if (!workflow) {
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
    useConversationStore.getState().updateWorkflow(workflowId, {
      status: 'executing',
    })

    // Create ReasoningEngine instance for execution
    const engine = new ReasoningEngine({
      maxIterations: 5,
      enableStreaming: true,
      maxTokens: 8000,
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
    executeWorkflowAsync(workflow, engine, sessionId).catch((error) => {
      console.error('[Workflow API] Async execution failed:', error)
      useConversationStore.getState().updateWorkflow(workflowId, {
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

  // Get workflow from store
  const workflow = useConversationStore.getState().getWorkflow(workflowId)
  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  // Create SSE stream
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // Start streaming status updates
  const streamInterval = setInterval(() => {
    const currentWorkflow = useConversationStore.getState().getWorkflow(workflowId)

    if (!currentWorkflow) {
      clearInterval(streamInterval)
      writer.close()
      return
    }

    // Send status update
    const statusUpdate = {
      workflowId,
      status: currentWorkflow.status,
      currentPhase: getCurrentPhase(currentWorkflow),
      overallProgress: calculateProgress(currentWorkflow),
      timestamp: Date.now(),
      message: getStatusMessage(currentWorkflow),
    }

    writer
      .write(encoder.encode(`data: ${JSON.stringify(statusUpdate)}\n\n`))
      .catch((error) => {
        console.error('[Workflow API] Stream write error:', error)
        clearInterval(streamInterval)
      })

    // Close stream when workflow completes or fails
    if (currentWorkflow.status === 'completed' || currentWorkflow.status === 'failed') {
      clearInterval(streamInterval)
      setTimeout(() => writer.close(), 1000) // Allow final message to send
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
 * Create empty workflow results structure
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
    crossFeatureInsights: [],
  }
}

/**
 * Apply user modifications to execution plan
 */
function applyModifications(plan: ExecutionPlan, modifications: PhaseModification[]): void {
  for (const mod of modifications) {
    const phase = plan.phases.find((p) => p.id === mod.phaseId)
    if (phase) {
      // Update phase parameters
      phase.parameters = {
        ...phase.parameters,
        ...mod.parameterChanges,
      }

      console.log('[Workflow API] Modified phase:', phase.id, mod.parameterChanges)
    }
  }
}

/**
 * Build agent query from execution plan
 */
function buildAgentQueryFromPlan(plan: ExecutionPlan): string {
  const phaseDescriptions = plan.phases.map((p) => `- ${p.title}: ${p.description}`).join('\n')

  return `Execute the following workflow plan:

${plan.overview}

Phases:
${phaseDescriptions}

Execute each phase in order, using the specified tools and parameters. Provide detailed status updates and results for each phase.`
}

/**
 * Execute workflow asynchronously
 */
async function executeWorkflowAsync(
  workflow: UnifiedWorkflow,
  engine: ReasoningEngine,
  sessionId: string
): Promise<void> {
  try {
    // Execute workflow using ReasoningEngine
    const result = await engine.execute(
      buildAgentQueryFromPlan(workflow.executionPlan),
      sessionId
    )

    console.log('[Workflow API] Workflow completed:', {
      workflowId: workflow.id,
      status: result.success ? 'completed' : 'failed',
    })

    // Update workflow with results
    useConversationStore.getState().updateWorkflow(workflow.id, {
      status: result.success ? 'completed' : 'failed',
      duration: Date.now() - new Date(workflow.createdAt).getTime(),
    })
  } catch (error) {
    console.error('[Workflow API] Workflow execution error:', error)
    useConversationStore.getState().updateWorkflow(workflow.id, {
      status: 'failed',
    })
  }
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
