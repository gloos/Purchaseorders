import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

// GET /api/sentry-test - Test endpoint to verify Sentry error tracking
export async function GET() {
  try {
    // Throw a test error
    throw new Error('This is a test error to verify Sentry integration')
  } catch (error) {
    // Manually capture the error (this happens automatically too)
    Sentry.captureException(error)

    return NextResponse.json(
      {
        error: 'Test error thrown and captured by Sentry',
        message: 'Check your Sentry dashboard to see if the error was reported'
      },
      { status: 500 }
    )
  }
}
