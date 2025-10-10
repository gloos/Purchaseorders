import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { getResendClient } from '@/lib/resend/client'
import { checkRateLimit, getIdentifier, addRateLimitHeaders } from '@/lib/rate-limit'
import * as Sentry from '@sentry/nextjs'

export async function POST(request: Request) {
  try {
    // Rate limiting: max 5 requests per minute per IP
    const identifier = getIdentifier(request)
    const rateLimitResult = await checkRateLimit('email', identifier)

    const headers = new Headers()
    addRateLimitHeaders(headers, rateLimitResult)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers }
      )
    }

    const { email } = await request.json()

    if (!email) {
      // Always return success to prevent email enumeration
      return NextResponse.json(
        { message: 'If an account exists, reset email sent' },
        { headers }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (user) {
      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      // Store token in database
      await prisma.passwordResetToken.create({
        data: {
          token,
          userId: user.id,
          expiresAt
        }
      })

      // Send email
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`

      const resend = getResendClient()
      await resend.emails.send({
        from: 'PO Tool <noreply@your-domain.com>',
        to: user.email,
        subject: 'Reset Your Password',
        html: `
          <h2>Password Reset Request</h2>
          <p>Hi ${user.name || 'there'},</p>
          <p>You requested to reset your password. Click the link below to set a new password:</p>
          <p><a href="${resetUrl}">Reset Password</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr>
          <p><small>PO Tool - Purchase Order Management</small></p>
        `
      })
    }

    // Always return success to prevent email enumeration
    return NextResponse.json(
      { message: 'If an account exists, reset email sent' },
      { headers }
    )
  } catch (error) {
    Sentry.captureException(error)
    console.error('Password reset error:', error)

    // Don't leak error details
    return NextResponse.json(
      { message: 'If an account exists, reset email sent' },
      { status: 200 }
    )
  }
}
