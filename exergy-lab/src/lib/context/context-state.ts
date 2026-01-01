/**
 * Context State Schemas
 *
 * Zod schemas for validating and typing the session context management system.
 * These schemas define the structure of ACTIVE.md and HANDOFF.md files.
 */

import { z } from 'zod'

// ============================================================================
// Session Metadata Schema
// ============================================================================

export const SessionMetadataSchema = z.object({
  sessionId: z.string().min(1),
  startedAt: z.string().datetime(),
  lastUpdatedAt: z.string().datetime(),
  branch: z.string().min(1),
  contextUsedTokens: z.number().int().nonnegative(),
})

export type SessionMetadata = z.infer<typeof SessionMetadataSchema>

// ============================================================================
// Task Status Schema
// ============================================================================

export const TaskStatusSchema = z.enum([
  'NOT_STARTED',
  'IN_PROGRESS',
  'BLOCKED',
  'COMPLETED',
  'HANDED_OFF',
])

export type TaskStatus = z.infer<typeof TaskStatusSchema>

export const TaskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])

export type TaskPriority = z.infer<typeof TaskPrioritySchema>

// ============================================================================
// Task State Schema
// ============================================================================

export const TaskBreakdownItemSchema = z.object({
  step: z.string().min(1),
  completed: z.boolean(),
})

export type TaskBreakdownItem = z.infer<typeof TaskBreakdownItemSchema>

export const TaskStateSchema = z.object({
  primary: z.string().min(1),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  breakdown: z.array(TaskBreakdownItemSchema),
})

export type TaskState = z.infer<typeof TaskStateSchema>

// ============================================================================
// Test Status Schema
// ============================================================================

export const TestResultSchema = z.enum(['PASSING', 'FAILING', 'UNKNOWN'])

export type TestResult = z.infer<typeof TestResultSchema>

export const TestStatusSchema = z.object({
  build: TestResultSchema,
  typescript: TestResultSchema,
  lint: TestResultSchema,
})

export type TestStatus = z.infer<typeof TestStatusSchema>

// ============================================================================
// Active Session Schema
// ============================================================================

export const ActiveSessionSchema = z.object({
  metadata: SessionMetadataSchema,
  currentTask: TaskStateSchema,
  modifiedFiles: z.array(z.string()),
  decisions: z.array(z.string()),
  blockers: z.array(z.string()),
  testStatus: TestStatusSchema,
  notes: z.array(z.string()).optional(),
})

export type ActiveSession = z.infer<typeof ActiveSessionSchema>

// ============================================================================
// Handoff Schema
// ============================================================================

export const HandoffReasonSchema = z.enum([
  'CONTEXT_LIMIT',
  'SESSION_END',
  'FEATURE_SWITCH',
  'USER_REQUEST',
])

export type HandoffReason = z.infer<typeof HandoffReasonSchema>

export const HandoffSchema = z.object({
  oneLiner: z.string().min(1),
  taskContext: z.string().min(1),
  currentState: z.array(
    z.object({
      file: z.string(),
      status: z.string(),
      percentComplete: z.number().min(0).max(100).optional(),
    })
  ),
  nextSteps: z.array(z.string()).min(1),
  criticalContext: z.array(z.string()),
  filesToReadFirst: z.array(
    z.object({
      path: z.string(),
      reason: z.string(),
    })
  ),
  knownIssues: z.array(z.string()),
  sessionHistory: z.string(),
  tokenBudget: z.object({
    used: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    reason: HandoffReasonSchema,
  }),
  generatedAt: z.string().datetime(),
})

export type Handoff = z.infer<typeof HandoffSchema>

// ============================================================================
// Context Registry Schema
// ============================================================================

export const ContextModuleSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  description: z.string(),
  tokenEstimate: z.number().int().positive(),
  dependencies: z.array(z.string()).optional(),
  lastUpdated: z.string().datetime().optional(),
})

export type ContextModule = z.infer<typeof ContextModuleSchema>

export const ContextRegistrySchema = z.object({
  modules: z.array(ContextModuleSchema),
  totalTokenEstimate: z.number().int().positive(),
  version: z.string(),
})

export type ContextRegistry = z.infer<typeof ContextRegistrySchema>

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_TEST_STATUS: TestStatus = {
  build: 'UNKNOWN',
  typescript: 'UNKNOWN',
  lint: 'UNKNOWN',
}

export function createEmptySession(sessionId: string, branch: string): ActiveSession {
  const now = new Date().toISOString()
  return {
    metadata: {
      sessionId,
      startedAt: now,
      lastUpdatedAt: now,
      branch,
      contextUsedTokens: 0,
    },
    currentTask: {
      primary: '',
      status: 'NOT_STARTED',
      priority: 'MEDIUM',
      breakdown: [],
    },
    modifiedFiles: [],
    decisions: [],
    blockers: [],
    testStatus: DEFAULT_TEST_STATUS,
  }
}

export function generateSessionId(): string {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 8)
  return `session_${date}_${random}`
}

// ============================================================================
// Validation Helpers
// ============================================================================

export function validateActiveSession(data: unknown): {
  valid: boolean
  session?: ActiveSession
  errors?: string[]
} {
  try {
    const session = ActiveSessionSchema.parse(data)
    return { valid: true, session }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`),
      }
    }
    return { valid: false, errors: ['Unknown validation error'] }
  }
}

export function validateHandoff(data: unknown): {
  valid: boolean
  handoff?: Handoff
  errors?: string[]
} {
  try {
    const handoff = HandoffSchema.parse(data)
    return { valid: true, handoff }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`),
      }
    }
    return { valid: false, errors: ['Unknown validation error'] }
  }
}

// ============================================================================
// Staleness Check
// ============================================================================

export function isSessionStale(lastUpdated: string, maxHours: number = 2): boolean {
  const lastUpdatedDate = new Date(lastUpdated)
  const now = new Date()
  const hoursSince = (now.getTime() - lastUpdatedDate.getTime()) / (1000 * 60 * 60)
  return hoursSince > maxHours
}

export function getSessionAge(lastUpdated: string): {
  hours: number
  minutes: number
  isStale: boolean
} {
  const lastUpdatedDate = new Date(lastUpdated)
  const now = new Date()
  const totalMinutes = (now.getTime() - lastUpdatedDate.getTime()) / (1000 * 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.floor(totalMinutes % 60)
  return {
    hours,
    minutes,
    isStale: hours >= 2,
  }
}
