import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Filter out sensitive data
  beforeSend(event, hint) {
    // Don't send events in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_ENABLE_DEV) {
      return null
    }

    // Remove sensitive headers and data
    if (event.request?.headers) {
      delete event.request.headers['authorization']
      delete event.request.headers['cookie']
    }

    // Filter out sensitive environment variables from context
    if (event.contexts?.runtime?.env) {
      const env = event.contexts.runtime.env as Record<string, any>
      delete env.DATABASE_URL
      delete env.SUPABASE_SERVICE_ROLE_KEY
      delete env.FREEAGENT_CLIENT_SECRET
      delete env.RESEND_API_KEY
      delete env.UPSTASH_REDIS_REST_TOKEN
    }

    return event
  },

  // Set environment
  environment: process.env.NODE_ENV || 'development',
})
