import * as Sentry from '@sentry/nextjs'

/**
 * Capture an exception and send it to Sentry
 * @param error - The error to capture
 * @param context - Additional context to include with the error
 */
export function captureError(
  error: Error | unknown,
  context?: {
    user?: { id: string; email?: string }
    tags?: Record<string, string>
    extra?: Record<string, any>
  }
) {
  if (context?.user) {
    Sentry.setUser(context.user)
  }

  if (context?.tags) {
    Sentry.setTags(context.tags)
  }

  if (context?.extra) {
    Sentry.setContext('additional', context.extra)
  }

  return Sentry.captureException(error)
}

/**
 * Capture a message (non-error) and send it to Sentry
 * @param message - The message to capture
 * @param level - The severity level (error, warning, info, debug)
 */
export function captureMessage(
  message: string,
  level: 'error' | 'warning' | 'info' | 'debug' = 'info'
) {
  return Sentry.captureMessage(message, level)
}

/**
 * Set user context for Sentry
 * @param user - User information
 */
export function setUser(user: { id: string; email?: string; username?: string } | null) {
  Sentry.setUser(user)
}

/**
 * Add breadcrumb for better error context
 * @param message - Breadcrumb message
 * @param category - Breadcrumb category
 * @param level - Severity level
 * @param data - Additional data
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info',
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  })
}

/**
 * Start a new transaction for performance monitoring
 * @param name - Transaction name
 * @param op - Operation type (e.g., 'http.server', 'db.query')
 */
export function startTransaction(name: string, op: string) {
  return Sentry.startTransaction({ name, op })
}
