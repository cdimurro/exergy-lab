/**
 * In-Memory Log Store
 * In production, this would be replaced with a database (PostgreSQL, MongoDB, etc.)
 */

import type { ActivityLog, LogFilters, LogStats, SessionLog } from '@/types/activity-log'

class LogStore {
  private logs: ActivityLog[] = []
  private readonly MAX_LOGS = 10000 // Prevent memory overflow

  /**
   * Add logs to the store
   */
  addLogs(logs: ActivityLog[]): void {
    this.logs.push(...logs)

    // Trim if exceeds max
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS)
    }
  }

  /**
   * Get all logs with optional filters
   */
  getLogs(filters?: LogFilters): ActivityLog[] {
    let filtered = [...this.logs]

    if (!filters) return filtered

    // Filter by date range
    if (filters.startDate) {
      filtered = filtered.filter((log) => log.timestamp >= filters.startDate!)
    }
    if (filters.endDate) {
      filtered = filtered.filter((log) => log.timestamp <= filters.endDate!)
    }

    // Filter by user
    if (filters.userId) {
      filtered = filtered.filter((log) => log.userId === filters.userId)
    }

    // Filter by session
    if (filters.sessionId) {
      filtered = filtered.filter((log) => log.sessionId === filters.sessionId)
    }

    // Filter by type
    if (filters.type) {
      filtered = filtered.filter((log) => log.type === filters.type)
    }

    // Filter by page
    if (filters.page) {
      filtered = filtered.filter((log) => log.page === filters.page)
    }

    // Filter by success
    if (filters.success !== undefined) {
      filtered = filtered.filter((log) => log.success === filters.success)
    }

    // Search in inputs/outputs/actions
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase()
      filtered = filtered.filter((log) => {
        const searchableText = JSON.stringify({
          action: log.action,
          inputs: log.inputs,
          outputs: log.outputs,
          aiPrompt: log.aiPrompt,
        }).toLowerCase()
        return searchableText.includes(term)
      })
    }

    // Sort by timestamp descending (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return filtered
  }

  /**
   * Get logs by session
   */
  getSessionLogs(sessionId: string): ActivityLog[] {
    return this.logs.filter((log) => log.sessionId === sessionId)
  }

  /**
   * Get statistics
   */
  getStats(filters?: LogFilters): LogStats {
    const logs = this.getLogs(filters)

    const uniqueSessions = new Set(logs.map((l) => l.sessionId)).size
    const uniqueUsers = new Set(logs.filter((l) => l.userId).map((l) => l.userId)).size

    const successCount = logs.filter((l) => l.success).length
    const successRate = logs.length > 0 ? (successCount / logs.length) * 100 : 0

    const responseTimes = logs.filter((l) => l.duration).map((l) => l.duration!)
    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0

    // Top pages
    const pageCounts = new Map<string, number>()
    logs.forEach((log) => {
      pageCounts.set(log.page, (pageCounts.get(log.page) || 0) + 1)
    })
    const topPages = Array.from(pageCounts.entries())
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Top actions
    const actionCounts = new Map<string, number>()
    logs.forEach((log) => {
      actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1)
    })
    const topActions = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const errorCount = logs.filter((l) => l.type === 'error').length
    const errorRate = logs.length > 0 ? (errorCount / logs.length) * 100 : 0

    // AI Agent stats
    const aiLogs = logs.filter((l) => l.type === 'ai_agent_request')
    const totalAITokens = aiLogs.reduce((sum, l) => sum + (l.aiTokensUsed || 0), 0)
    const aiSuccessCount = aiLogs.filter((l) => l.success).length
    const aiSuccessRate = aiLogs.length > 0 ? (aiSuccessCount / aiLogs.length) * 100 : 0

    return {
      totalLogs: logs.length,
      uniqueSessions,
      uniqueUsers,
      successRate,
      averageResponseTime,
      topPages,
      topActions,
      errorRate,
      aiAgentUsage: {
        totalRequests: aiLogs.length,
        totalTokens: totalAITokens,
        averageTokensPerRequest: aiLogs.length > 0 ? totalAITokens / aiLogs.length : 0,
        successRate: aiSuccessRate,
      },
    }
  }

  /**
   * Get session summaries
   */
  getSessions(filters?: LogFilters): SessionLog[] {
    const logs = this.getLogs(filters)

    const sessionsMap = new Map<string, SessionLog>()

    logs.forEach((log) => {
      const existing = sessionsMap.get(log.sessionId)

      if (!existing) {
        sessionsMap.set(log.sessionId, {
          sessionId: log.sessionId,
          userId: log.userId,
          startTime: log.timestamp,
          endTime: log.timestamp,
          totalActivities: 1,
          pages: [log.page],
          actions: [log.action],
          errors: log.type === 'error' ? 1 : 0,
        })
      } else {
        existing.totalActivities++
        existing.endTime = log.timestamp
        if (!existing.pages.includes(log.page)) {
          existing.pages.push(log.page)
        }
        if (!existing.actions.includes(log.action)) {
          existing.actions.push(log.action)
        }
        if (log.type === 'error') {
          existing.errors++
        }
      }
    })

    return Array.from(sessionsMap.values()).sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )
  }

  /**
   * Clear all logs (for testing)
   */
  clear(): void {
    this.logs = []
  }

  /**
   * Export logs as JSON
   */
  exportLogs(filters?: LogFilters): string {
    const logs = this.getLogs(filters)
    return JSON.stringify(logs, null, 2)
  }
}

// Singleton instance
export const logStore = new LogStore()
