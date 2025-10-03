'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  const router = useRouter()

  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Something went wrong!</h1>
          <p style={{ color: '#666', marginBottom: '2rem' }}>
            We've been notified and are looking into it.
          </p>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '10px 20px',
              fontSize: '1rem',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Go back home
          </button>
        </div>
      </body>
    </html>
  )
}
