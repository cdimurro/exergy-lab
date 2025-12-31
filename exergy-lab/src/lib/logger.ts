/**
 * Logging and Monitoring Utility
 *
 * Centralized logging for search operations, API calls, and errors
 * Helps with debugging and understanding user behavior
 */

export interface LogEntry {
  timestamp: number
  level: 'info' | 'warn' | 'error'
  component: string
  message: string
  data?: any
}

class Logger {
  private logs: LogEntry[] = []
  private readonly MAX_LOGS = 100
  private isDev = typeof window !== 'undefined' && process.env.NODE_ENV === 'development'

  /**
   * Log an info message
   */
  info(component: string, message: string, data?: any) {
    this.log('info', component, message, data)
  }

  /**
   * Log a warning
   */
  warn(component: string, message: string, data?: any) {
    this.log('warn', component, message, data)
  }

  /**
   * Log an error
   */
  error(component: string, message: string, data?: any) {
    this.log('error', component, message, data)
  }

  /**
   * Internal log method
   */
  private log(
    level: 'info' | 'warn' | 'error',
    component: string,
    message: string,
    data?: any
  ) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      component,
      message,
      data,
    }

    // Add to in-memory log
    this.logs.push(entry)
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift()
    }

    // Log to console in development
    if (this.isDev) {
      const prefix = `[${component}] ${message}`
      const style = {
        info: 'color: #0066cc',
        warn: 'color: #ff8800',
        error: 'color: #cc0000',
      }[level]

      if (data) {
        console.log(`%c${prefix}`, style, data)
      } else {
        console.log(`%c${prefix}`, style)
      }
    }
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  /**
   * Get logs for a specific component
   */
  getComponentLogs(component: string): LogEntry[] {
    return this.logs.filter(log => log.component === component)
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: 'info' | 'warn' | 'error'): LogEntry[] {
    return this.logs.filter(log => log.level === level)
  }

  /**
   * Clear all logs
   */
  clear() {
    this.logs = []
  }

  /**
   * Export logs as JSON
   */
  export(): string {
    return JSON.stringify(this.logs, null, 2)
  }
}

// Export singleton instance
export const logger = new Logger()

/**
 * Performance monitoring helper
 */
export class PerformanceMonitor {
  private startTime: number

  constructor(private label: string) {
    this.startTime = performance.now()
  }

  end() {
    const duration = performance.now() - this.startTime
    logger.info('performance', `${this.label} completed in ${duration.toFixed(2)}ms`, {
      duration,
    })
    return duration
  }
}
