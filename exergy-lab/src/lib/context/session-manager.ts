/**
 * Session Manager
 *
 * Manages the session context files (ACTIVE.md and HANDOFF.md).
 * Provides programmatic access to session state for automated updates.
 */

import {
  type ActiveSession,
  type Handoff,
  type TaskBreakdownItem,
  type TestStatus,
  type HandoffReason,
  ActiveSessionSchema,
  DEFAULT_TEST_STATUS,
  generateSessionId,
  isSessionStale,
  getSessionAge,
} from './context-state'

// ============================================================================
// Constants
// ============================================================================

const ACTIVE_PATH = '.claude/session/ACTIVE.md'
const HANDOFF_PATH = '.claude/session/HANDOFF.md'
const TOKEN_LIMIT = 200000
const WARNING_THRESHOLD = 0.85 // 85% = ~170k tokens

// ============================================================================
// Markdown Parsing Helpers
// ============================================================================

function extractValue(content: string, pattern: RegExp): string | null {
  const match = content.match(pattern)
  return match ? match[1].trim() : null
}

function extractList(content: string, heading: string): string[] {
  const regex = new RegExp(`## ${heading}[\\s\\S]*?(?=##|$)`, 'i')
  const section = content.match(regex)?.[0] || ''

  const items: string[] = []
  const lines = section.split('\n')

  for (const line of lines) {
    const match = line.match(/^[-*]\s+(.+)$/)
    if (match) {
      items.push(match[1].trim())
    }
  }

  return items
}

function extractTaskBreakdown(content: string): TaskBreakdownItem[] {
  const taskSection = content.match(/### Task Breakdown[\s\S]*?(?=###|##|$)/)?.[0] || ''
  const items: TaskBreakdownItem[] = []

  const lines = taskSection.split('\n')
  for (const line of lines) {
    const match = line.match(/^\d+\.\s*\[([ x])\]\s*(.+)$/)
    if (match) {
      items.push({
        completed: match[1] === 'x',
        step: match[2].trim(),
      })
    }
  }

  return items
}

function extractTestStatus(content: string): TestStatus {
  const testSection = content.match(/## Test Status[\s\S]*?(?=##|$)/)?.[0] || ''

  const getStatus = (name: string): 'PASSING' | 'FAILING' | 'UNKNOWN' => {
    const match = testSection.match(new RegExp(`${name}:\\s*(PASSING|FAILING|UNKNOWN)`, 'i'))
    if (match) {
      return match[1].toUpperCase() as 'PASSING' | 'FAILING' | 'UNKNOWN'
    }
    return 'UNKNOWN'
  }

  return {
    build: getStatus('Build'),
    typescript: getStatus('TypeScript'),
    lint: getStatus('Lint'),
  }
}

// ============================================================================
// Markdown Generation Helpers
// ============================================================================

function generateActiveMarkdown(session: ActiveSession): string {
  const taskBreakdown = session.currentTask.breakdown
    .map((item, i) => `${i + 1}. [${item.completed ? 'x' : ' '}] ${item.step}`)
    .join('\n')

  const modifiedFiles = session.modifiedFiles
    .map((f, i) => `${i + 1}. \`${f}\``)
    .join('\n')

  const decisions = session.decisions.map((d) => `- ${d}`).join('\n')
  const blockers = session.blockers.map((b) => `- ${b}`).join('\n')
  const notes = session.notes?.map((n) => `- ${n}`).join('\n') || ''

  return `# Active Session State
<!-- AUTO-UPDATED BY CLAUDE - DO NOT MANUALLY EDIT -->

## Session Metadata
- **Session ID:** ${session.metadata.sessionId}
- **Started:** ${session.metadata.startedAt}
- **Last Updated:** ${session.metadata.lastUpdatedAt}
- **Branch:** ${session.metadata.branch}
- **Context Used:** ~${session.metadata.contextUsedTokens.toLocaleString()} tokens

## Current Task
**Primary:** ${session.currentTask.primary}
**Status:** ${session.currentTask.status}
**Priority:** ${session.currentTask.priority}

### Task Breakdown
${taskBreakdown || '(No breakdown defined)'}

### Active Files (ordered by recency)
${modifiedFiles || '(No files modified)'}

## Key Decisions Made
${decisions || '(No decisions recorded)'}

## Blockers/Issues
${blockers || '- None currently'}

## Context Dependencies
- **Feature Area:** (Auto-detected from task)
- **Related Context:** (Referenced .claude/context modules)
- **Skills Needed:** (Any specialized skills required)

## Modified Files This Session
${modifiedFiles || '(No files modified)'}

## Test Status
- Build: ${session.testStatus.build}
- TypeScript: ${session.testStatus.typescript}
- Lint: ${session.testStatus.lint}

## Notes for Continuation
${notes || '(No notes)'}
`
}

function generateHandoffMarkdown(handoff: Handoff): string {
  const currentState = handoff.currentState
    .map((s) => `- **${s.file}:** ${s.status}${s.percentComplete ? ` (${s.percentComplete}%)` : ''}`)
    .join('\n')

  const nextSteps = handoff.nextSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')
  const criticalContext = handoff.criticalContext.map((c) => `- ${c}`).join('\n')
  const filesToRead = handoff.filesToReadFirst
    .map((f, i) => `${i + 1}. \`${f.path}\` - ${f.reason}`)
    .join('\n')
  const knownIssues = handoff.knownIssues.map((i) => `- ${i}`).join('\n')

  return `# Session Handoff Summary
<!-- GENERATED WHEN CONTEXT APPROACHES LIMIT OR SESSION ENDS -->
<!-- Next agent: Read this FIRST, then ACTIVE.md -->

## Quick Resume
**One-liner:** ${handoff.oneLiner}

## What Was Being Done
${handoff.taskContext}

## Current State
${currentState}

## Immediate Next Steps
${nextSteps}

## Critical Context
${criticalContext}

## Files to Read First
${filesToRead}

## Known Issues
${knownIssues || '- None'}

## Session History Summary
${handoff.sessionHistory}

## Token Budget Used
- Session tokens: ~${handoff.tokenBudget.used.toLocaleString()} / ${handoff.tokenBudget.limit.toLocaleString()}
- Reason for handoff: ${handoff.tokenBudget.reason}

---
Generated at: ${handoff.generatedAt}
`
}

// ============================================================================
// Session Manager Class
// ============================================================================

export class SessionManager {
  private session: ActiveSession | null = null
  private activePath: string
  private handoffPath: string

  constructor(basePath: string = process.cwd()) {
    this.activePath = `${basePath}/${ACTIVE_PATH}`
    this.handoffPath = `${basePath}/${HANDOFF_PATH}`
  }

  /**
   * Parse ACTIVE.md content into structured data
   */
  parseActiveMarkdown(content: string): ActiveSession | null {
    try {
      const sessionId = extractValue(content, /Session ID:\*?\*?\s*(\S+)/) || generateSessionId()
      const startedAt = extractValue(content, /Started:\*?\*?\s*(.+)/) || new Date().toISOString()
      const lastUpdatedAt = extractValue(content, /Last Updated:\*?\*?\s*(.+)/) || new Date().toISOString()
      const branch = extractValue(content, /Branch:\*?\*?\s*(\S+)/) || 'unknown'
      const contextTokens = parseInt(extractValue(content, /Context Used:\*?\*?\s*~?([\d,]+)/)?.replace(/,/g, '') || '0', 10)

      const primary = extractValue(content, /Primary:\*?\*?\s*(.+)/) || ''
      const status = (extractValue(content, /Status:\*?\*?\s*(\S+)/) || 'IN_PROGRESS') as ActiveSession['currentTask']['status']
      const priority = (extractValue(content, /Priority:\*?\*?\s*(\S+)/) || 'MEDIUM') as ActiveSession['currentTask']['priority']

      const breakdown = extractTaskBreakdown(content)
      const modifiedFiles = extractList(content, 'Modified Files This Session')
        .map((f) => f.replace(/`/g, '').replace(/^\d+\.\s*/, ''))
      const decisions = extractList(content, 'Key Decisions Made')
      const blockers = extractList(content, 'Blockers/Issues').filter((b) => b !== 'None currently')
      const testStatus = extractTestStatus(content)
      const notes = extractList(content, 'Notes for Continuation')

      const session: ActiveSession = {
        metadata: {
          sessionId,
          startedAt,
          lastUpdatedAt,
          branch,
          contextUsedTokens: contextTokens,
        },
        currentTask: {
          primary,
          status,
          priority,
          breakdown,
        },
        modifiedFiles,
        decisions,
        blockers,
        testStatus,
        notes,
      }

      // Validate with Zod
      ActiveSessionSchema.parse(session)
      return session
    } catch (error) {
      console.error('[SessionManager] Failed to parse ACTIVE.md:', error)
      return null
    }
  }

  /**
   * Get current session (from cache or parsed file)
   */
  getSession(): ActiveSession | null {
    return this.session
  }

  /**
   * Set session from parsed content
   */
  setSession(session: ActiveSession): void {
    this.session = session
  }

  /**
   * Update session with new data
   */
  updateSession(updates: Partial<Omit<ActiveSession, 'metadata'>> & {
    contextUsedTokens?: number
  }): ActiveSession | null {
    if (!this.session) return null

    const now = new Date().toISOString()

    this.session = {
      ...this.session,
      metadata: {
        ...this.session.metadata,
        lastUpdatedAt: now,
        contextUsedTokens: updates.contextUsedTokens ?? this.session.metadata.contextUsedTokens,
      },
      currentTask: updates.currentTask ?? this.session.currentTask,
      modifiedFiles: updates.modifiedFiles ?? this.session.modifiedFiles,
      decisions: updates.decisions ?? this.session.decisions,
      blockers: updates.blockers ?? this.session.blockers,
      testStatus: updates.testStatus ?? this.session.testStatus,
      notes: updates.notes ?? this.session.notes,
    }

    return this.session
  }

  /**
   * Create a new session
   */
  startSession(taskDescription: string, branch: string): ActiveSession {
    const sessionId = generateSessionId()
    const now = new Date().toISOString()

    this.session = {
      metadata: {
        sessionId,
        startedAt: now,
        lastUpdatedAt: now,
        branch,
        contextUsedTokens: 0,
      },
      currentTask: {
        primary: taskDescription,
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        breakdown: [],
      },
      modifiedFiles: [],
      decisions: [],
      blockers: [],
      testStatus: DEFAULT_TEST_STATUS,
    }

    return this.session
  }

  /**
   * Record progress on current task
   */
  recordProgress(step: string, files: string[]): void {
    if (!this.session) return

    // Add step to breakdown if not exists
    const existingStep = this.session.currentTask.breakdown.find((b) => b.step === step)
    if (!existingStep) {
      this.session.currentTask.breakdown.push({ step, completed: false })
    }

    // Add new files to modified list
    for (const file of files) {
      if (!this.session.modifiedFiles.includes(file)) {
        this.session.modifiedFiles.unshift(file)
      }
    }

    this.session.metadata.lastUpdatedAt = new Date().toISOString()
  }

  /**
   * Mark a step as completed
   */
  completeStep(step: string): void {
    if (!this.session) return

    const stepItem = this.session.currentTask.breakdown.find((b) => b.step === step)
    if (stepItem) {
      stepItem.completed = true
    }

    this.session.metadata.lastUpdatedAt = new Date().toISOString()
  }

  /**
   * Update test status
   */
  updateTestStatus(status: Partial<TestStatus>): void {
    if (!this.session) return

    this.session.testStatus = {
      ...this.session.testStatus,
      ...status,
    }

    this.session.metadata.lastUpdatedAt = new Date().toISOString()
  }

  /**
   * Generate ACTIVE.md content
   */
  generateActiveContent(): string | null {
    if (!this.session) return null
    return generateActiveMarkdown(this.session)
  }

  /**
   * Generate handoff
   */
  generateHandoff(reason: HandoffReason, sessionHistory: string): Handoff | null {
    if (!this.session) return null

    const handoff: Handoff = {
      oneLiner: this.session.currentTask.primary,
      taskContext: `Working on: ${this.session.currentTask.primary}. Status: ${this.session.currentTask.status}`,
      currentState: this.session.modifiedFiles.slice(0, 10).map((file) => ({
        file,
        status: 'Modified',
      })),
      nextSteps: this.session.currentTask.breakdown
        .filter((b) => !b.completed)
        .slice(0, 5)
        .map((b) => b.step),
      criticalContext: this.session.decisions.slice(0, 5),
      filesToReadFirst: this.session.modifiedFiles.slice(0, 3).map((path) => ({
        path,
        reason: 'Recently modified',
      })),
      knownIssues: this.session.blockers,
      sessionHistory,
      tokenBudget: {
        used: this.session.metadata.contextUsedTokens,
        limit: TOKEN_LIMIT,
        reason,
      },
      generatedAt: new Date().toISOString(),
    }

    return handoff
  }

  /**
   * Generate HANDOFF.md content
   */
  generateHandoffContent(reason: HandoffReason, sessionHistory: string): string | null {
    const handoff = this.generateHandoff(reason, sessionHistory)
    if (!handoff) return null
    return generateHandoffMarkdown(handoff)
  }

  /**
   * Check if session is stale
   */
  isStale(maxHours: number = 2): boolean {
    if (!this.session) return true
    return isSessionStale(this.session.metadata.lastUpdatedAt, maxHours)
  }

  /**
   * Get session age
   */
  getAge(): { hours: number; minutes: number; isStale: boolean } {
    if (!this.session) {
      return { hours: 0, minutes: 0, isStale: true }
    }
    return getSessionAge(this.session.metadata.lastUpdatedAt)
  }

  /**
   * Check if approaching context limit
   */
  isApproachingLimit(): boolean {
    if (!this.session) return false
    return this.session.metadata.contextUsedTokens >= TOKEN_LIMIT * WARNING_THRESHOLD
  }

  /**
   * Get completion percentage
   */
  getCompletionPercentage(): number {
    if (!this.session || this.session.currentTask.breakdown.length === 0) {
      return 0
    }

    const completed = this.session.currentTask.breakdown.filter((b) => b.completed).length
    return Math.round((completed / this.session.currentTask.breakdown.length) * 100)
  }
}

// ============================================================================
// Exports
// ============================================================================

export { ACTIVE_PATH, HANDOFF_PATH, TOKEN_LIMIT, WARNING_THRESHOLD }
