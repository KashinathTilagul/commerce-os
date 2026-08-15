/**
 * Error Tracking Integration
 * Provides centralized error tracking and reporting capabilities
 * Currently supports Sentry integration with fallback to console logging
 */

interface ErrorContext {
  userId?: string
  organizationId?: string
  tags?: Record<string, string>
  extra?: Record<string, any>
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug'
}

interface ErrorTrackingConfig {
  enabled: boolean
  dsn?: string
  environment?: string
  release?: string
  sampleRate?: number
}

class ErrorTracker {
  private config: ErrorTrackingConfig
  private sentryInitialized: boolean = false

  constructor() {
    this.config = {
      enabled: process.env.SENTRY_ENABLED === 'true',
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.RELEASE_VERSION || 'v3.5.0-platform-ready',
      sampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE || '0.1'),
    }

    if (this.config.enabled && this.config.dsn) {
      this.initializeSentry()
    }
  }

  private initializeSentry() {
    try {
      // Dynamic import to avoid requiring Sentry if not used
      import('@sentry/nextjs').then(({ init }) => {
        init({
          dsn: this.config.dsn,
          environment: this.config.environment,
          release: this.config.release,
          sampleRate: this.config.sampleRate,
          tracesSampleRate: 0.1, // 10% of transactions for performance monitoring
          beforeSend(event, hint) {
            // Filter out sensitive data
            if (event.request) {
              delete event.request.cookies
              if (event.request.headers) {
                delete event.request.headers['authorization']
                delete event.request.headers['cookie']
              }
            }
            return event
          },
          beforeSendTransaction(event) {
            // Filter transactions if needed
            return event
          },
          integrations: [
            // Add Sentry integrations as needed
          ],
        })
        this.sentryInitialized = true
        console.log('[ErrorTracker] Sentry initialized successfully')
      }).catch((error) => {
        console.error('[ErrorTracker] Failed to initialize Sentry:', error)
      })
    } catch (error) {
      console.error('[ErrorTracker] Sentry import failed:', error)
    }
  }

  /**
   * Capture an exception/error
   */
  captureException(error: Error | unknown, context?: ErrorContext): void {
    const errorObj = error instanceof Error ? error : new Error(String(error))

    if (this.sentryInitialized) {
      try {
        import('@sentry/nextjs').then(({ captureException }) => {
          captureException(errorObj, {
            tags: this.buildTags(context),
            extra: this.buildExtra(context),
            user: this.buildUser(context),
            level: context?.level || 'error',
          })
        })
      } catch (sentryError) {
        console.error('[ErrorTracker] Sentry captureException failed:', sentryError)
        this.fallbackLog(errorObj, context)
      }
    } else {
      this.fallbackLog(errorObj, context)
    }
  }

  /**
   * Capture a message
   */
  captureMessage(message: string, context?: ErrorContext): void {
    if (this.sentryInitialized) {
      try {
        import('@sentry/nextjs').then(({ captureMessage }) => {
          captureMessage(message, {
            tags: this.buildTags(context),
            extra: this.buildExtra(context),
            user: this.buildUser(context),
            level: context?.level || 'info',
          })
        })
      } catch (sentryError) {
        console.error('[ErrorTracker] Sentry captureMessage failed:', sentryError)
        this.fallbackLogMessage(message, context)
      }
    } else {
      this.fallbackLogMessage(message, context)
    }
  }

  /**
   * Capture a breadcrumb for debugging
   */
  addBreadcrumb(category: string, message: string, level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug', data?: Record<string, any>): void {
    if (this.sentryInitialized) {
      try {
        import('@sentry/nextjs').then(({ addBreadcrumb }) => {
          addBreadcrumb({
            category,
            message,
            level: level || 'info',
            data,
            timestamp: Date.now() / 1000,
          })
        })
      } catch (sentryError) {
        console.error('[ErrorTracker] Sentry addBreadcrumb failed:', sentryError)
      }
    }
  }

  /**
   * Set user context
   */
  setUser(user: { id: string; email?: string; username?: string }): void {
    if (this.sentryInitialized) {
      try {
        import('@sentry/nextjs').then(({ setUser }) => {
          setUser(user)
        })
      } catch (sentryError) {
        console.error('[ErrorTracker] Sentry setUser failed:', sentryError)
      }
    }
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    if (this.sentryInitialized) {
      try {
        import('@sentry/nextjs').then(({ setUser }) => {
          setUser(null)
        })
      } catch (sentryError) {
        console.error('[ErrorTracker] Sentry clearUser failed:', sentryError)
      }
    }
  }

  /**
   * Start a performance transaction
   */
  startTransaction(name: string, op: string): any {
    if (this.sentryInitialized) {
      try {
        import('@sentry/nextjs').then(({ startTransaction }) => {
          return startTransaction({
            name,
            op,
          })
        })
      } catch (sentryError) {
        console.error('[ErrorTracker] Sentry startTransaction failed:', sentryError)
      }
    }
    return null
  }

  private buildTags(context?: ErrorContext): Record<string, string> {
    const tags: Record<string, string> = {
      environment: this.config.environment,
      release: this.config.release || 'unknown',
    }

    if (context?.organizationId) {
      tags.organizationId = context.organizationId
    }

    if (context?.tags) {
      Object.assign(tags, context.tags)
    }

    return tags
  }

  private buildExtra(context?: ErrorContext): Record<string, any> {
    const extra: Record<string, any> = {
      timestamp: new Date().toISOString(),
    }

    if (context?.extra) {
      Object.assign(extra, context.extra)
    }

    return extra
  }

  private buildUser(context?: ErrorContext): { id?: string } | undefined {
    if (context?.userId) {
      return { id: context.userId }
    }
    return undefined
  }

  private fallbackLog(error: Error, context?: ErrorContext): void {
    const logMessage = `[ErrorTracker] ${error.message}`
    const logData = {
      error: error.stack,
      context: {
        tags: this.buildTags(context),
        extra: this.buildExtra(context),
        user: this.buildUser(context),
      },
    }

    switch (context?.level) {
      case 'fatal':
      case 'error':
        console.error(logMessage, logData)
        break
      case 'warning':
        console.warn(logMessage, logData)
        break
      default:
        console.log(logMessage, logData)
    }
  }

  private fallbackLogMessage(message: string, context?: ErrorContext): void {
    const logData = {
      context: {
        tags: this.buildTags(context),
        extra: this.buildExtra(context),
        user: this.buildUser(context),
      },
    }

    switch (context?.level) {
      case 'fatal':
      case 'error':
        console.error(`[ErrorTracker] ${message}`, logData)
        break
      case 'warning':
        console.warn(`[ErrorTracker] ${message}`, logData)
        break
      default:
        console.log(`[ErrorTracker] ${message}`, logData)
    }
  }

  /**
   * Check if error tracking is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled && this.sentryInitialized
  }

  /**
   * Get current configuration
   */
  getConfig(): ErrorTrackingConfig {
    return { ...this.config }
  }
}

// Singleton instance
export const errorTracker = new ErrorTracker()

// Convenience functions for common use cases
export function captureApiError(error: Error | unknown, endpoint: string, method: string, context?: ErrorContext): void {
  errorTracker.captureException(error, {
    ...context,
    tags: {
      ...context?.tags,
      endpoint,
      method,
      type: 'api_error',
    },
  })
}

export function captureAgentError(error: Error | unknown, agentId: string, task: string, context?: ErrorContext): void {
  errorTracker.captureException(error, {
    ...context,
    tags: {
      ...context?.tags,
      agentId,
      task,
      type: 'agent_error',
    },
  })
}

export function captureWorkflowError(error: Error | unknown, workflowId: string, step: string, context?: ErrorContext): void {
  errorTracker.captureException(error, {
    ...context,
    tags: {
      ...context?.tags,
      workflowId,
      step,
      type: 'workflow_error',
    },
  })
}

// React Error Boundary wrapper (optional)
export function withErrorTracking<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode,
  context?: ErrorContext
): React.ComponentType<P> {
  return function ErrorTrackedComponent(props: P) {
    try {
      return <Component {...props} />
    } catch (error) {
      errorTracker.captureException(error, context)
      return fallback ? <>{fallback}</> : null
    }
  }
}