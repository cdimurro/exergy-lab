/**
 * Centralized Activity Logger
 * Client and server-side logging utility for tracking all user interactions
 */

import type { ActivityLog, ActivityType } from '@/types/activity-log'

class ActivityLogger {
  private sessionId: string
  private buffer: ActivityLog[] = []
  private flushInterval: NodeJS.Timeout | null = null
  private readonly BUFFER_SIZE = 10
  private readonly FLUSH_INTERVAL = 5000 // 5 seconds

  constructor() {
    this.sessionId = this.generateSessionId()
    if (typeof window !== 'undefined') {
      this.startAutoFlush()
      this.attachUnloadHandler()
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate a unique log ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Log an activity
   */
  async log(data: Omit<ActivityLog, 'id' | 'timestamp' | 'sessionId'>): Promise<void> {
    const log: ActivityLog = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      ...data,
    }

    // Add to buffer
    this.buffer.push(log)

    // Immediate flush for errors or if buffer is full
    if (data.type === 'error' || this.buffer.length >= this.BUFFER_SIZE) {
      await this.flush()
    }
  }

  /**
   * Log a field input
   */
  async logFieldInput(
    page: string,
    fieldName: string,
    fieldValue: any,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      type: 'field_input',
      page,
      action: `input_${fieldName}`,
      inputs: { [fieldName]: fieldValue },
      success: true,
      metadata,
    })
  }

  /**
   * Log a search query
   */
  async logSearch(query: string, filters?: any, results?: any): Promise<void> {
    await this.log({
      type: 'search_query',
      page: 'search',
      action: 'execute_search',
      inputs: { query, filters },
      outputs: { resultsCount: results?.length || 0, results },
      success: true,
    })
  }

  /**
   * Log a discovery prompt
   */
  async logDiscovery(prompt: any, report?: any): Promise<void> {
    await this.log({
      type: 'discovery_prompt',
      page: 'discovery',
      action: 'generate_discovery',
      inputs: { prompt },
      outputs: { report },
      success: !!report,
    })
  }

  /**
   * Log an experiment design
   */
  async logExperiment(inputs: any, design?: any): Promise<void> {
    await this.log({
      type: 'experiment_design',
      page: 'experiments',
      action: 'design_experiment',
      inputs,
      outputs: { design },
      success: !!design,
    })
  }

  /**
   * Log a simulation run
   */
  async logSimulation(inputs: any, results?: any, duration?: number): Promise<void> {
    await this.log({
      type: 'simulation_run',
      page: 'simulations',
      action: 'execute_simulation',
      inputs,
      outputs: { results },
      duration,
      success: !!results,
    })
  }

  /**
   * Log a TEA calculation
   */
  async logTEA(inputs: any, results?: any): Promise<void> {
    await this.log({
      type: 'tea_calculation',
      page: 'tea-generator',
      action: 'calculate_tea',
      inputs,
      outputs: { results },
      success: !!results,
    })
  }

  /**
   * Log an AI agent request/response
   */
  async logAI(
    page: string,
    action: string,
    prompt: string,
    response?: string,
    model?: string,
    tokens?: number,
    responseTime?: number
  ): Promise<void> {
    await this.log({
      type: 'ai_agent_request',
      page,
      action,
      aiPrompt: prompt,
      aiResponse: response,
      aiModel: model,
      aiTokensUsed: tokens,
      aiResponseTime: responseTime,
      success: !!response,
    })
  }

  /**
   * Log an error
   */
  async logError(
    page: string,
    action: string,
    error: Error | string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const errorData = typeof error === 'string'
      ? { message: error }
      : {
          message: error.message,
          stack: error.stack,
          code: (error as any).code,
        }

    await this.log({
      type: 'error',
      page,
      action,
      error: errorData,
      success: false,
      metadata,
    })
  }

  /**
   * Log a page view
   */
  async logPageView(page: string, metadata?: Record<string, any>): Promise<void> {
    await this.log({
      type: 'page_view',
      page,
      action: 'view_page',
      success: true,
      metadata,
    })
  }

  /**
   * Flush buffered logs to the server
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return

    const logsToSend = [...this.buffer]
    this.buffer = []

    try {
      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: logsToSend }),
      })

      if (!response.ok) {
        console.error('Failed to send logs:', response.statusText)
        // Re-add to buffer on failure
        this.buffer.unshift(...logsToSend)
      }
    } catch (error) {
      console.error('Failed to send logs:', error)
      // Re-add to buffer on failure
      this.buffer.unshift(...logsToSend)
    }
  }

  /**
   * Start automatic flushing
   */
  private startAutoFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flush()
    }, this.FLUSH_INTERVAL)
  }

  /**
   * Attach beforeunload handler to flush on page close
   */
  private attachUnloadHandler(): void {
    if (typeof window === 'undefined') return

    window.addEventListener('beforeunload', () => {
      if (this.buffer.length > 0) {
        // Use sendBeacon for reliable delivery on page close
        const blob = new Blob(
          [JSON.stringify({ logs: this.buffer })],
          { type: 'application/json' }
        )
        navigator.sendBeacon('/api/logs', blob)
      }
    })
  }

  /**
   * Stop auto-flushing
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }
    this.flush() // Final flush
  }
}

// Singleton instance
let loggerInstance: ActivityLogger | null = null

export function getLogger(): ActivityLogger {
  if (!loggerInstance) {
    loggerInstance = new ActivityLogger()
  }
  return loggerInstance
}

export const activityLogger = getLogger()
