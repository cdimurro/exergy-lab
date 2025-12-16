import { NextRequest, NextResponse } from 'next/server'
import { ReasoningEngine } from '@/lib/ai/agent/reasoning-engine'
import { CheckpointedAgent } from '@/lib/ai/agent/checkpoint'
import { useConversationStore } from '@/lib/ai/agent/conversation-store'
import { initializeTools } from '@/lib/ai/tools/implementations'
import { registerGlobalTools } from '@/lib/ai/tools/registry'
import {
  rateLimiter,
  UserRateLimitError,
  UserTier,
} from '@/lib/ai/rate-limiter'
import { AgentResult, AgentConfig } from '@/types/agent'

/**
 * Agent Execution API Endpoint
 *
 * POST /api/agent/execute
 *
 * Executes the reasoning engine with:
 * - Per-user rate limiting
 * - Automatic checkpointing
 * - Conversation state management
 * - Tool orchestration
 * - Multi-step reasoning
 *
 * Request Body:
 * {
 *   query: string,
 *   userId?: string,
 *   sessionId?: string,
 *   config?: Partial<AgentConfig>
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   result?: AgentResult,
 *   error?: string,
 *   sessionId: string,
 *   duration: number
 * }
 */

// Initialize tools on module load
const tools = initializeTools()
registerGlobalTools(tools)

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Parse request body
    const body = await request.json()
    const { query, userId, sessionId, config } = body

    // Validate query
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Get user tier and check rate limits
    let userTier: UserTier = 'free'
    if (userId) {
      const existingTier = rateLimiter.getUserTier(userId)
      if (!existingTier) {
        // Register new user with free tier
        rateLimiter.registerUser(userId, 'free')
      } else {
        userTier = existingTier
      }

      // Check rate limit for Gemini (primary provider)
      if (!rateLimiter.canUserExecute(userId, 'gemini')) {
        const retryAfter = rateLimiter.getUserRetryAfter(userId, 'gemini')
        const quota = rateLimiter.getUserQuota(userId, 'gemini')

        throw new UserRateLimitError(userId, userTier, 'gemini', retryAfter)
      }
    }

    console.log(
      `[Agent API] Executing query for user ${userId || 'anonymous'} (${userTier} tier)`
    )
    console.log(`[Agent API] Query: "${query.substring(0, 100)}..."`)

    // Create or get session
    let finalSessionId = sessionId
    if (!finalSessionId && userId) {
      // Create new session
      const store = useConversationStore.getState()
      finalSessionId = store.createSession(userId, query, config)
    }

    // Create checkpointed agent
    const checkpointedAgent = new CheckpointedAgent()

    // Execute with checkpoints
    const result: AgentResult = await checkpointedAgent.executeWithCheckpoints(
      finalSessionId || `anonymous_${Date.now()}`,
      async (createCheckpoint) => {
        // Create reasoning engine
        const engine = new ReasoningEngine(config)

        // Subscribe to status updates
        engine.on('status', (status) => {
          console.log(`[Agent] ${status.phase} - ${status.message}`)
          // In production, you could emit SSE events here
        })

        // Execute with checkpoint callback
        let stepCount = 0

        // Wrap engine execution with checkpoint creation
        const originalExecute = engine.execute.bind(engine)
        engine.execute = async (query: string, sessionId?: string) => {
          // Create checkpoint before execution
          await createCheckpoint(stepCount++, 'plan', {
            query,
            iterationCount: engine.getIterationCount(),
          })

          const result = await originalExecute(query, sessionId)

          // Create checkpoint after execution
          await createCheckpoint(stepCount++, 'respond', {
            query,
            response: result.response,
            iterationCount: engine.getIterationCount(),
          })

          return result
        }

        // Execute the query
        return engine.execute(query, finalSessionId)
      }
    )

    // Consume rate limit token on success
    if (userId) {
      rateLimiter.consumeUser(userId, 'gemini')
    }

    // Add messages to conversation if we have a session
    if (finalSessionId && userId) {
      const store = useConversationStore.getState()

      // Add user message
      store.addMessage(finalSessionId, {
        id: `msg_${startTime}_user`,
        role: 'user',
        content: query,
        timestamp: startTime,
      })

      // Add assistant response
      store.addMessage(finalSessionId, {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: result.response,
        timestamp: Date.now(),
      })
    }

    const duration = Date.now() - startTime

    console.log(
      `[Agent API] Execution completed in ${duration}ms with ${result.steps.length} steps`
    )

    // Return success response
    return NextResponse.json({
      success: true,
      result,
      sessionId: finalSessionId,
      duration,
      quota: userId
        ? rateLimiter.getUserQuota(userId, 'gemini')
        : undefined,
    })
  } catch (error) {
    console.error('[Agent API] Execution failed:', error)

    // Handle rate limit errors
    if (error instanceof UserRateLimitError) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: error.message,
          retryAfter: error.retryAfter,
          tier: error.tier,
        },
        { status: 429 }
      )
    }

    // Handle other errors
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/agent/execute?sessionId=xxx
 *
 * Get execution status or resume from checkpoint
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('sessionId')
    const action = searchParams.get('action') // 'status' or 'resume'

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId parameter is required' },
        { status: 400 }
      )
    }

    if (action === 'resume') {
      // Resume from checkpoint
      const checkpointedAgent = new CheckpointedAgent()
      const resumer = checkpointedAgent.getResumer()

      const resumeInfo = resumer.getResumeInfo(sessionId)

      if (!resumeInfo.canResume) {
        return NextResponse.json(
          { error: 'No valid checkpoint found for this session' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        canResume: true,
        latestCheckpoint: resumeInfo.latestCheckpoint,
        checkpointCount: resumeInfo.checkpointCount,
        message: 'Session can be resumed. Send POST request to resume execution.',
      })
    }

    // Default: Get session status
    const store = useConversationStore.getState()
    const session = store.getSession(sessionId)

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      sessionId: session.id,
      messageCount: session.messages.length,
      checkpointCount: session.checkpoints.length,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      metadata: session.metadata,
    })
  } catch (error) {
    console.error('[Agent API] GET failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/agent/execute?sessionId=xxx
 *
 * Delete a session and its checkpoints
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId parameter is required' },
        { status: 400 }
      )
    }

    // Delete conversation session
    const store = useConversationStore.getState()
    store.deleteSession(sessionId)

    // Delete checkpoints
    const checkpointedAgent = new CheckpointedAgent()
    const checkpointManager = checkpointedAgent.getCheckpointManager()
    checkpointManager.deleteSessionCheckpoints(sessionId)

    return NextResponse.json({
      success: true,
      message: `Session ${sessionId} deleted successfully`,
    })
  } catch (error) {
    console.error('[Agent API] DELETE failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
