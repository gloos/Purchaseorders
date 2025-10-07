// Resend Email Client
// Documentation: https://resend.com/docs

import { Resend } from 'resend'

// Lazy-load the Resend client to avoid build-time errors when env vars aren't available
let resendInstance: Resend | null = null

export function getResendClient(): Resend {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not defined in environment variables')
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY)
  }
  return resendInstance
}

// For backward compatibility, export a getter that throws at runtime if key is missing
export const resend = new Proxy({} as Resend, {
  get(_target, prop) {
    return getResendClient()[prop as keyof Resend]
  }
})
