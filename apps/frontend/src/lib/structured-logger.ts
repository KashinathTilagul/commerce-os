/**
 * Structured Logging and Metrics Collection
 * Provides centralized logging with consistent structure and metrics collection
 */

enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
}

interface LogContext {
  userId?: string
  organizationId?: string
  requestId?: string
  sessionId?: string
  agentId?: string
  workflowId?: string
  tags?: Record<string, string>
  extra?: Record<string, any>
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context: LogContext
  stack?: string
  metadata?: Record<string, any>
}

interface MetricData {
  name: string
  value: number
  unit?: string
  tags?: Record<string, string>
  timestamp: string
}

class StructuredLogger {
  private logLevel: LogLevel = this.getLogLevelFromEnv()
  private metrics: Map<string, MetricData[]> = new Map()
  private maxMetricsRetention: number = 1000

  private getLogLevelFromEnv(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase()
    return Object.values(LogLevel).includes(envLevel as LogLevel) 
      ? envLevel as LogLevel 
      : LogLevel.INFO
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL]
    return levels.indexOf(level) >= levels.indexOf(this.logLevel)
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context || {},
    }

    if (error) {
      entry.stack = error.stack
      entry.metadata = {
        errorName: error.name,
        errorMessage: error.message,
      }
    }

    const formattedMessage = this.formatLogEntry(entry)

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage)
        break
      case LogLevel.INFO:
        console.info(formattedMessage)
        break
      case LogLevel.WARN:
        console.warn(formattedMessage)
        break
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formattedMessage)
        break
    }

    // Store critical logs for analysis
    if (level === LogLevel.ERROR || level === LogLevel.FATAL) {
      this.storeCriticalLog(entry)
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const contextStr = Object.keys(entry.context).length > 0 
      ? ` | Context: ${JSON.stringify(entry.context)}` 
      : ''
    const metadataStr = entry.metadata 
      ? ` | Metadata: ${JSON.stringify(entry.metadata)}` 
      : ''
    const stackStr = entry.stack ? ` | Stack: ${entry.stack}` : ''
    
    return `[${entry.timestamp}] [${entry.level}] ${entry.message}${contextStr}${metadataStr}${stackStr}`
  }

  private storeCriticalLog(entry: LogEntry): void {
    // In production, this would send to a log aggregation service
    // For now, we'll just ensure it's properly captured
    if (process.env.NODE_ENV === 'production') {
      // Could integrate with external logging service here
    }
  }

  // Public logging methods
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context)
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context)
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context, error)
  }

  fatal(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.FATAL, message, context, error)
  }

  /**
   * Metrics collection
   */
  recordMetric(name: string, value: number, unit?: string, tags?: Record<string, string>): void {
    const metric: MetricData = {
      name,
      value,
      unit,
      tags: tags || {},
      timestamp: new Date().toISOString(),
    }

    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }

    const metricsArray = this.metrics.get(name)!
    metricsArray.push(metric)

    // Retention management
    if (metricsArray.length > this.maxMetricsRetention) {
      metricsArray.shift()
    }
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, value: number = 1, tags?: Record<string, string>): void {
    this.recordMetric(name, value, 'count', tags)
  }

  /**
   * Record a timing metric
   */
  recordTiming(name: string, durationMs: number, tags?: Record<string, string>): void {
    this.recordMetric(name, durationMs, 'milliseconds', tags)
  }

  /**
   * Record a gauge metric (current value)
   */
  recordGauge(name: string, value: number, unit?: string, tags?: Record<string, string>): void {
    this.recordMetric(name, value, unit || 'value', tags)
  }

  /**
   * Get metrics for a specific name
   */
  getMetrics(name: string): MetricData[] {
    return this.metrics.get(name) || []
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, MetricData[]> {
    const result: Record<string, MetricData[]> = {}
    for (const [name, data] of this.metrics.entries()) {
      result[name] = data
    }
    return result
  }

  /**
   * Get aggregated metrics for a name
   */
  getAggregatedMetrics(name: string): {
    count: number
    sum: number
    avg: number
    min: number
    max: number
  } | null {
    const metrics = this.getMetrics(name)
    if (metrics.length === 0) return null

    const values = metrics.map(m => m.value)
    const sum = values.reduce((a, b) => a + b, 0)
    
    return {
      count: metrics.length,
      sum,
      avg: sum / metrics.length,
      min: Math.min(...values),
      max: Math.max(...values),
    }
  }

  /**
   * Clear metrics for a specific name
   */
  clearMetrics(name: string): void {
    this.metrics.delete(name)
  }

  /**
   * Clear all metrics
   */
  clearAllMetrics(): void {
    this.metrics.clear()
  }

  /**
   * Performance measurement helper
   */
  startTimer(name: string, tags?: Record<string, string>): () => void {
    const startTime = Date.now()
    return () => {
      const duration = Date.now() - startTime
      this.recordTiming(name, duration, tags)
    }
  }

  /**
   * API request logging helper
   */
  logApiRequest(method: string, path: string, statusCode: number, durationMs: number, context?: LogContext): void {
    this.info(`API Request: ${method} ${path}`, {
      ...context,
      tags: {
        method,
        path,
        statusCode: statusCode.toString(),
        duration: durationMs.toString(),
      },
    })

    // Record metrics
    this.recordTiming('api.request.duration', durationMs, {
      method,
      path,
      status: statusCode.toString(),
    })

    if (statusCode >= 400) {
      this.incrementCounter('api.request.error', 1, {
        method,
        path,
        status: statusCode.toString(),
      })
    } else {
      this.incrementCounter('api.request.success', 1, {
        method,
        path,
        status: statusCode.toString(),
      })
    }
  }

  /**
   * Agent operation logging helper
   */
  logAgentOperation(agentId: string, operation: string, status: string, durationMs: number, context?: LogContext): void {
    this.info(`Agent Operation: ${agentId} - ${operation}`, {
      ...context,
      tags: {
        agentId,
        operation,
        status,
        duration: durationMs.toString(),
      },
    })

    this.recordTiming('agent.operation.duration', durationMs, {
      agentId,
      operation,
      status,
    })

    if (status === 'FAILED') {
      this.incrementCounter('agent.operation.failed', 1, {
        agentId,
        operation,
      })
    } else if (status === 'SUCCESS') {
      this.incrementCounter('agent.operation.success', 1, {
        agentId,
        operation,
      })
    }
  }

  /**
   * Database operation logging helper
   */
  logDbOperation(operation: string, table: string, durationMs: number, context?: LogContext): void {
    this.debug(`DB Operation: ${operation} on ${table}`, {
      ...context,
      tags: {
        operation,
        table,
        duration: durationMs.toString(),
      },
    })

    this.recordTiming('db.operation.duration', durationMs, {
      operation,
      table,
    })
  }

  /**
   * Workflow step logging helper
   */
  logWorkflowStep(workflowId: string, step: string, status: string, durationMs: number, context?: LogContext): void {
    this.info(`Workflow Step: ${workflowId} - ${step}`, {
      ...context,
      tags: {
        workflowId,
        step,
        status,
        duration: durationMs.toString(),
      },
    })

    this.recordTiming('workflow.step.duration', durationMs, {
      workflowId,
      step,
      status,
    })
  }
}

// Singleton instance
export const logger = new StructuredLogger()

// Convenience functions for common logging patterns
export function logApiRequestWithContext(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  userId?: string,
  organizationId?: string
): void {
  logger.logApiRequest(method, path, statusCode, durationMs, {
    userId,
    organizationId,
  })
}

export function logAgentOperationWithContext(
  agentId: string,
  operation: string,
  status: string,
  durationMs: number,
  organizationId?: string
): void {
  logger.logAgentOperation(agentId, operation, status, durationMs, {
    agentId,
    organizationId,
  })
}

export function withPerformanceLogging<T>(
  name: string,
  fn: () => T,
  tags?: Record<string, string>
): T {
  const endTimer = logger.startTimer(name, tags)
  try {
    const result = fn()
    endTimer()
    return result
  } catch (error) {
    endTimer()
    logger.error(`Performance logging failed for ${name}`, error as Error, { tags })
    throw error
  }
}

export async function withAsyncPerformanceLogging<T>(
  name: string,
  fn: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  const endTimer = logger.startTimer(name, tags)
  try {
    const result = await fn()
    endTimer()
    return result
  } catch (error) {
    endTimer()
    logger.error(`Async performance logging failed for ${name}`, error as Error, { tags })
    throw error
  }
}