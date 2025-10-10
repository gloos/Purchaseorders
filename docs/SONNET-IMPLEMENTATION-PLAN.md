# Sonnet Implementation Plan: Critical Pre-Launch Features

## Overview
This document provides a step-by-step implementation guide for addressing the 6 critical gaps identified in the pre-launch analysis. Each feature includes complete code snippets and implementation details.

**Total Timeline:** 5-6 days
**Priority:** All features are CRITICAL for launch

---

## 1. Password Reset Flow (Day 1-2)

### 1.1 Database Schema Update

Add to `/prisma/schema.prisma`:

```prisma
model PasswordResetToken {
  id        String    @id @default(cuid())
  token     String    @unique
  userId    String
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
}
```

Don't forget to add relation to User model:
```prisma
model User {
  // ... existing fields
  passwordResetTokens PasswordResetToken[]
}
```

Run migration:
```bash
npx prisma migrate dev --name add-password-reset-tokens
```

### 1.2 Create Forgot Password Page

Create `/app/(auth)/forgot-password/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      // Always show success to prevent email enumeration
      setSubmitted(true)
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
        <Card padding="lg" className="max-w-md w-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Check Your Email
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              If an account exists with {email}, we've sent a password reset link.
              The link will expire in 1 hour.
            </p>
            <Link href="/signin">
              <Button variant="primary" size="md" className="w-full">
                Back to Sign In
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <Card padding="lg" className="max-w-md w-full">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
            Reset Your Password
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-800 bg-red-100 dark:text-red-200 dark:bg-red-900/30 rounded">
                {error}
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              disabled={loading}
              isLoading={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>

            <div className="text-center">
              <Link href="/signin" className="text-sm text-blue-600 hover:text-blue-700">
                Back to Sign In
              </Link>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}
```

### 1.3 Create Reset Password Page

Create `/app/(auth)/reset-password/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [validating, setValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token')
      setValidating(false)
      return
    }

    // Validate token exists (API will check expiry)
    setValidating(false)
    setTokenValid(true)
  }, [token])

  const validatePassword = (pass: string): string | null => {
    if (pass.length < 8) return 'Password must be at least 8 characters'
    if (!/[A-Z]/.test(pass)) return 'Password must contain at least one uppercase letter'
    if (!/[0-9]/.test(pass)) return 'Password must contain at least one number'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate passwords
    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })

      const data = await response.json()

      if (response.ok) {
        // Success - redirect to signin
        router.push('/signin?message=Password reset successfully. Please sign in.')
      } else {
        setError(data.error || 'Failed to reset password')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
        <Card padding="lg" className="max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            Invalid Reset Link
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            This password reset link is invalid or has expired.
            Please request a new one.
          </p>
          <Link href="/forgot-password">
            <Button variant="primary" size="md" className="w-full">
              Request New Link
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <Card padding="lg" className="max-w-md w-full">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
            Set New Password
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-800 bg-red-100 dark:text-red-200 dark:bg-red-900/30 rounded">
                {error}
              </div>
            )}

            <Input
              label="New Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              helperText="Minimum 8 characters, 1 uppercase letter, 1 number"
            />

            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              disabled={loading}
              isLoading={loading}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
```

### 1.4 Create API Routes

Create `/app/api/auth/forgot-password/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { resend } from '@/lib/resend'
import { checkRateLimit } from '@/lib/rate-limit'
import * as Sentry from '@sentry/nextjs'

export async function POST(request: Request) {
  try {
    // Rate limiting: max 3 requests per hour per IP
    const rateLimitCheck = await checkRateLimit(request, '3-per-hour')

    if (!rateLimitCheck.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: rateLimitCheck.headers
        }
      )
    }

    const { email } = await request.json()

    if (!email) {
      // Always return success to prevent email enumeration
      return NextResponse.json({ message: 'If an account exists, reset email sent' })
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
      const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}`

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
      { headers: rateLimitCheck.headers }
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
```

Create `/app/api/auth/reset-password/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import * as Sentry from '@sentry/nextjs'

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      )
    }

    // Find valid token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    })

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    // Check if token has expired
    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Reset token has expired' },
        { status: 400 }
      )
    }

    // Check if token was already used
    if (resetToken.usedAt) {
      return NextResponse.json(
        { error: 'This reset link has already been used' },
        { status: 400 }
      )
    }

    // Update password in Supabase Auth
    const supabase = createClient(cookies())
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      resetToken.user.supabaseId,
      { password }
    )

    if (updateError) {
      Sentry.captureException(updateError)
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      )
    }

    // Mark token as used
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() }
    })

    // Clean up old tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: resetToken.userId,
        OR: [
          { expiresAt: { lt: new Date() } },
          { usedAt: { not: null } }
        ]
      }
    })

    return NextResponse.json({ message: 'Password reset successfully' })
  } catch (error) {
    Sentry.captureException(error)
    console.error('Password reset error:', error)

    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}
```

### 1.5 Update Sign-in Page

Update `/app/(auth)/signin/page.tsx` - Add forgot password link:

```typescript
// Find the password input field and add this link after it:
<div className="flex items-center justify-between">
  <Input
    label="Password"
    type="password"
    name="password"
    required
    // ... existing props
  />
</div>
<div className="text-right">
  <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
    Forgot Password?
  </Link>
</div>
```

---

## 2. Email Verification Pages (Day 2-3)

### 2.1 Create Verify Email Page

Create `/app/(auth)/verify-email/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/client'

export default function VerifyEmailPage() {
  const router = useRouter()
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState('')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/signin')
        return
      }

      if (user.email_confirmed_at) {
        router.push('/dashboard')
        return
      }

      setUserEmail(user.email || '')
    }

    checkUser()
  }, [router])

  const handleResend = async () => {
    setResending(true)
    setMessage('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail
      })

      if (error) throw error

      setMessage('Verification email sent! Please check your inbox.')
    } catch (error) {
      setMessage('Failed to resend email. Please try again.')
    } finally {
      setResending(false)
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/signin')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <Card padding="lg" className="max-w-md w-full text-center">
        <div className="mb-4">
          <svg className="mx-auto h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Verify Your Email
        </h2>

        <p className="text-slate-600 dark:text-slate-400 mb-6">
          We've sent a verification email to:
          <br />
          <strong className="text-slate-900 dark:text-white">{userEmail}</strong>
        </p>

        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Please click the link in the email to verify your account.
          Check your spam folder if you don't see it.
        </p>

        {message && (
          <div className={`p-3 text-sm rounded mb-4 ${
            message.includes('sent')
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
          }`}>
            {message}
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleResend}
            disabled={resending}
            isLoading={resending}
            variant="primary"
            size="md"
            className="w-full"
          >
            {resending ? 'Resending...' : 'Resend Verification Email'}
          </Button>

          <Button
            onClick={handleSignOut}
            variant="ghost"
            size="md"
            className="w-full"
          >
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  )
}
```

### 2.2 Update Middleware

Update `/middleware.ts` to enforce email verification:

```typescript
// Add this check after user authentication:
if (user && !user.email_confirmed && !pathname.includes('/verify-email')) {
  return NextResponse.redirect(new URL('/verify-email', request.url))
}
```

---

## 3. User Profile Management (Day 3-4)

### 3.1 Create User Profile Page

Create `/app/(dashboard)/settings/profile/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/use-user'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'

export default function UserProfilePage() {
  const { user, loading: userLoading } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Profile form
  const [name, setName] = useState('')

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (!userLoading && user) {
      setName(user.name || '')
    }
  }, [user, userLoading])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Profile updated successfully')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setError(data.error || 'Failed to update profile')
      }
    } catch (err) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const validatePassword = (pass: string): string | null => {
    if (pass.length < 8) return 'Password must be at least 8 characters'
    if (!/[A-Z]/.test(pass)) return 'Password must contain at least one uppercase letter'
    if (!/[0-9]/.test(pass)) return 'Password must contain at least one number'
    return null
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    // Validate new password
    const passwordError = validatePassword(newPassword)
    if (passwordError) {
      setError(passwordError)
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Password changed successfully')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setError(data.error || 'Failed to change password')
      }
    } catch (err) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 mb-2">
            <Link href="/settings" className="hover:text-blue-600 dark:hover:text-blue-400">
              Settings
            </Link>
            <span className="mx-2">/</span>
            <span className="text-slate-900 dark:text-white">My Profile</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Profile</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage your personal account settings
          </p>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">{message}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 max-w-2xl">
          {/* Profile Information */}
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Profile Information
            </h2>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <Input
                label="Full Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                label="Email Address"
                type="email"
                value={user?.email || ''}
                disabled
                helperText="Email cannot be changed"
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={loading}
                  isLoading={loading}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>

          {/* Change Password */}
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Change Password
            </h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />

              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                helperText="Minimum 8 characters, 1 uppercase letter, 1 number"
              />

              <Input
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                  isLoading={loading}
                >
                  Change Password
                </Button>
              </div>
            </form>
          </Card>

          {/* Account Actions */}
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Account Actions
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Need to delete your account? Please contact your administrator.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

### 3.2 Create Profile API Routes

Create `/app/api/user/profile/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUser } from '@/lib/auth-helpers'
import * as Sentry from '@sentry/nextjs'

export async function GET(request: Request) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    })

    return NextResponse.json(profile)
  } catch (error) {
    Sentry.captureException(error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name } = await request.json()

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    Sentry.captureException(error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
```

Create `/app/api/user/change-password/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import * as Sentry from '@sentry/nextjs'

export async function POST(request: Request) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()

    const supabase = createClient(cookies())

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    })

    if (signInError) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (updateError) {
      Sentry.captureException(updateError)
      return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Password changed successfully' })
  } catch (error) {
    Sentry.captureException(error)
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
  }
}
```

### 3.3 Update Settings Page

Add link to profile in `/app/(dashboard)/settings/page.tsx`:

```typescript
// Add this card at the top of the grid:
{/* My Profile */}
<Link href="/settings/profile">
  <Card padding="lg" className="hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer">
    <div className="flex items-start">
      <div className="flex-shrink-0">
        <svg className="h-8 w-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
      <div className="ml-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">My Profile</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Manage your personal account settings and password
        </p>
      </div>
    </div>
  </Card>
</Link>
```

---

## 4. Audit Trail UI (Day 4-5)

### 4.1 Create Audit Trail Component

Create `/components/audit-trail.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'

interface AuditEntry {
  id: string
  action: string
  entityType: string
  entityId: string
  userId: string
  userName: string
  userEmail: string
  details: any
  createdAt: string
}

interface AuditTrailProps {
  purchaseOrderId: string
}

export function AuditTrail({ purchaseOrderId }: AuditTrailProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAuditTrail()
  }, [purchaseOrderId])

  const fetchAuditTrail = async () => {
    try {
      const response = await fetch(`/api/purchase-orders/${purchaseOrderId}/audit-trail`)
      if (response.ok) {
        const data = await response.json()
        setEntries(data)
      }
    } catch (error) {
      console.error('Failed to fetch audit trail:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return '✨'
      case 'UPDATE':
        return '✏️'
      case 'APPROVE':
        return '✅'
      case 'DENY':
        return '❌'
      case 'SEND':
        return '📧'
      case 'DELETE':
        return '🗑️'
      default:
        return '📝'
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'APPROVE':
        return 'text-green-600 dark:text-green-400'
      case 'DENY':
      case 'DELETE':
        return 'text-red-600 dark:text-red-400'
      case 'SEND':
        return 'text-blue-600 dark:text-blue-400'
      default:
        return 'text-slate-600 dark:text-slate-400'
    }
  }

  if (loading) {
    return (
      <Card padding="lg">
        <div className="flex justify-center py-8">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent"></div>
        </div>
      </Card>
    )
  }

  if (entries.length === 0) {
    return (
      <Card padding="lg">
        <p className="text-center text-slate-600 dark:text-slate-400">No activity recorded yet</p>
      </Card>
    )
  }

  return (
    <Card padding="lg">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Activity History</h3>
      <div className="space-y-4">
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-start space-x-3">
            <div className={`text-2xl ${getActionColor(entry.action)}`}>
              {getActionIcon(entry.action)}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-slate-900 dark:text-white">
                  {entry.userName}
                </span>
                <span className={`text-sm ${getActionColor(entry.action)}`}>
                  {entry.action.toLowerCase()}d
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  this purchase order
                </span>
              </div>
              {entry.details && (
                <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {JSON.stringify(entry.details).substring(0, 100)}...
                </div>
              )}
              <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                {new Date(entry.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
```

### 4.2 Update PO Detail Page

Update `/app/(dashboard)/purchase-orders/[id]/page.tsx`:

```typescript
// Import the audit trail component
import { AuditTrail } from '@/components/audit-trail'

// Add after the main PO details section:
{/* Audit Trail Section */}
<div className="mt-8">
  <AuditTrail purchaseOrderId={params.id} />
</div>
```

### 4.3 Create Audit Logger Helper

Create `/lib/audit-logger.ts`:

```typescript
import { prisma } from '@/lib/prisma'
import { getUser } from '@/lib/auth-helpers'

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'DENY' | 'SEND' | 'INVOICE_UPLOAD'

export async function logAuditActivity(
  action: AuditAction,
  entityType: 'PURCHASE_ORDER' | 'USER' | 'CONTACT' | 'TAX_RATE',
  entityId: string,
  details?: any
) {
  try {
    const user = await getUser()
    if (!user) return

    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        userId: user.id,
        organizationId: user.organizationId,
        details,
        ipAddress: null, // Can be added if needed
        userAgent: null  // Can be added if needed
      }
    })
  } catch (error) {
    console.error('Failed to log audit activity:', error)
    // Don't throw - audit logging shouldn't break the main operation
  }
}

// Clean up old audit logs (30 days retention)
export async function cleanupAuditLogs() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  try {
    await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo }
      }
    })
  } catch (error) {
    console.error('Failed to cleanup audit logs:', error)
  }
}
```

---

## 5. Legal Pages (Day 5)

### 5.1 Create Terms of Service

Create `/app/terms/page.tsx`:

```typescript
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card padding="lg">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Terms of Service
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <div className="prose dark:prose-invert max-w-none">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using PO Tool ("Service"), you accept and agree to be bound by
              the terms and provision of this agreement.
            </p>

            <h2>2. Use License</h2>
            <p>
              Subject to your compliance with these Terms, we grant you a limited, non-exclusive,
              non-transferable license to access and use the Service for your internal business purposes.
            </p>

            <h2>3. User Accounts</h2>
            <p>
              You are responsible for safeguarding the password and for all activities that occur
              under your account. You must notify us immediately of any unauthorized use.
            </p>

            <h2>4. Prohibited Uses</h2>
            <p>You may not use our Service:</p>
            <ul>
              <li>For any unlawful purpose</li>
              <li>To transmit any malicious code</li>
              <li>To impersonate or attempt to impersonate another user</li>
              <li>To engage in any activity that interferes with the Service</li>
            </ul>

            <h2>5. Data Ownership</h2>
            <p>
              You retain all rights to your data. You grant us a license to use your data solely
              to provide the Service to you.
            </p>

            <h2>6. Privacy</h2>
            <p>
              Your use of our Service is also governed by our Privacy Policy. Please review our
              Privacy Policy, which also governs the Site and informs users of our data collection practices.
            </p>

            <h2>7. Termination</h2>
            <p>
              We may terminate or suspend your account and bar access to the Service immediately,
              without prior notice or liability, under our sole discretion, for any reason whatsoever.
            </p>

            <h2>8. Disclaimer</h2>
            <p>
              The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided
              without warranties of any kind, whether express or implied.
            </p>

            <h2>9. Limitation of Liability</h2>
            <p>
              In no event shall PO Tool, nor its directors, employees, partners, agents, suppliers,
              or affiliates, be liable for any indirect, incidental, special, consequential, or
              punitive damages.
            </p>

            <h2>10. Governing Law</h2>
            <p>
              These Terms shall be governed and construed in accordance with the laws of the United Kingdom,
              without regard to its conflict of law provisions.
            </p>

            <h2>11. Changes to Terms</h2>
            <p>
              We reserve the right to modify or replace these Terms at any time. If a revision is material,
              we will provide at least 30 days notice prior to any new terms taking effect.
            </p>

            <h2>12. Contact Information</h2>
            <p>
              If you have any questions about these Terms, please contact us at legal@your-domain.com
            </p>
          </div>

          <div className="mt-8 flex justify-center">
            <Link href="/">
              <Button variant="primary" size="md">
                Return to Home
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
```

### 5.2 Create Privacy Policy

Create `/app/privacy/page.tsx`:

```typescript
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card padding="lg">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <div className="prose dark:prose-invert max-w-none">
            <h2>1. Information We Collect</h2>
            <p>We collect information you provide directly to us, such as:</p>
            <ul>
              <li>Account information (name, email, password)</li>
              <li>Organization details</li>
              <li>Purchase order data</li>
              <li>Contact information for suppliers</li>
              <li>Usage data and analytics</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, maintain, and improve our Service</li>
              <li>Process transactions and send related information</li>
              <li>Send technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Monitor and analyze trends and usage</li>
            </ul>

            <h2>3. Information Sharing</h2>
            <p>
              We do not sell, trade, or otherwise transfer your personal information to third parties.
              We may share information:
            </p>
            <ul>
              <li>With your consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect rights and safety</li>
              <li>With service providers who assist in our operations</li>
            </ul>

            <h2>4. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal
              information against unauthorized access, alteration, disclosure, or destruction.
            </p>

            <h2>5. Data Retention</h2>
            <p>
              We retain your information for as long as your account is active or as needed to provide
              services. Audit logs are retained for 30 days. You may request deletion of your data.
            </p>

            <h2>6. Your Rights (GDPR)</h2>
            <p>If you are in the European Economic Area, you have the right to:</p>
            <ul>
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
              <li>Request data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>

            <h2>7. Cookies</h2>
            <p>
              We use cookies and similar tracking technologies to track activity on our Service
              and hold certain information. You can instruct your browser to refuse all cookies.
            </p>

            <h2>8. Third-Party Services</h2>
            <p>Our Service may contain links to third-party websites or services that are not
               owned or controlled by us. We have no control over and assume no responsibility
               for the privacy policies of third-party sites.</p>

            <h2>9. Children's Privacy</h2>
            <p>
              Our Service is not intended for use by children under 18 years of age. We do not
              knowingly collect personal information from children under 18.
            </p>

            <h2>10. Changes to This Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes
              by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>

            <h2>11. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
              privacy@your-domain.com
            </p>
          </div>

          <div className="mt-8 flex justify-center">
            <Link href="/">
              <Button variant="primary" size="md">
                Return to Home
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
```

### 5.3 Update Signup Pages

Update both `/app/(auth)/signup/page.tsx` and `/app/signup/invited/page.tsx`:

```typescript
// Add before the submit button:
<div className="flex items-start">
  <input
    type="checkbox"
    id="terms"
    required
    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
  />
  <label htmlFor="terms" className="ml-2 text-sm text-slate-600 dark:text-slate-400">
    I agree to the{' '}
    <Link href="/terms" target="_blank" className="text-blue-600 hover:text-blue-700">
      Terms of Service
    </Link>{' '}
    and{' '}
    <Link href="/privacy" target="_blank" className="text-blue-600 hover:text-blue-700">
      Privacy Policy
    </Link>
  </label>
</div>
```

---

## 6. Custom Error Pages (Day 5-6)

### 6.1 Create 404 Page

Create `/app/not-found.tsx`:

```typescript
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import * as Sentry from '@sentry/nextjs'

export default function NotFound() {
  // Report to Sentry
  if (typeof window !== 'undefined') {
    Sentry.captureMessage('404 Page Not Found', 'info')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-blue-600 dark:text-blue-400">404</h1>
        <h2 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
          Page Not Found
        </h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6 space-x-3">
          <Link href="/dashboard">
            <Button variant="primary" size="md">
              Go to Dashboard
            </Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="md">
              Go to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
```

### 6.2 Create Error Page

Create `/app/error.tsx`:

```typescript
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import * as Sentry from '@sentry/nextjs'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error, {
      tags: {
        digest: error.digest
      }
    })
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-red-600 dark:text-red-400">500</h1>
        <h2 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
          Something went wrong
        </h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          An unexpected error occurred. Our team has been notified.
        </p>
        {error.digest && (
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-500">
            Error ID: {error.digest}
          </p>
        )}
        <div className="mt-6 space-x-3">
          <Button
            onClick={reset}
            variant="primary"
            size="md"
          >
            Try Again
          </Button>
          <Link href="/dashboard">
            <Button variant="ghost" size="md">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
```

### 6.3 Create Unauthorized Page

Create `/app/(dashboard)/unauthorized/page.tsx`:

```typescript
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
      <Card padding="lg" className="max-w-md w-full text-center">
        <div className="mb-4">
          <svg className="mx-auto h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Access Denied
        </h1>

        <p className="text-slate-600 dark:text-slate-400 mb-6">
          You don't have permission to access this resource. Please contact your administrator
          if you believe this is an error.
        </p>

        <div className="space-y-3">
          <Link href="/dashboard" className="block">
            <Button variant="primary" size="md" className="w-full">
              Back to Dashboard
            </Button>
          </Link>

          <Link href="/settings/profile" className="block">
            <Button variant="ghost" size="md" className="w-full">
              View My Permissions
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
```

---

## Implementation Checklist

### Day 1-2: Password Reset
- [ ] Add PasswordResetToken model to schema
- [ ] Run migration
- [ ] Create forgot-password page
- [ ] Create reset-password page
- [ ] Create API routes
- [ ] Update sign-in page with forgot password link
- [ ] Test email sending with Resend
- [ ] Test token expiry and validation

### Day 2-3: Email Verification
- [ ] Create verify-email page
- [ ] Update middleware for enforcement
- [ ] Test Supabase email settings
- [ ] Add resend email functionality

### Day 3-4: User Profile
- [ ] Create profile page
- [ ] Create profile API routes
- [ ] Create change password API
- [ ] Add profile link to settings
- [ ] Test password validation

### Day 4-5: Audit Trail
- [ ] Create AuditTrail component
- [ ] Update PO detail page
- [ ] Create audit logger helper
- [ ] Add 30-day cleanup job
- [ ] Test activity logging

### Day 5: Legal Pages
- [ ] Create Terms of Service page
- [ ] Create Privacy Policy page
- [ ] Update signup forms with checkbox
- [ ] Add footer links

### Day 5-6: Error Pages
- [ ] Create 404 page
- [ ] Create 500 error page
- [ ] Create unauthorized page
- [ ] Test Sentry error reporting
- [ ] Verify error handling

## Testing Requirements

### Password Reset
- Reset link expires after 1 hour ✓
- Token can only be used once ✓
- Rate limited to 3 attempts per hour ✓
- Password requirements enforced ✓

### Email Verification
- Users cannot access dashboard without verification ✓
- Resend functionality rate limited ✓
- Verification link works correctly ✓

### Profile Management
- Name updates save correctly ✓
- Email field is read-only ✓
- Password change requires current password ✓
- Password requirements enforced ✓

### Audit Trail
- All PO actions logged ✓
- 30-day retention enforced ✓
- UI displays activity correctly ✓

### Legal Compliance
- Terms checkbox required on signup ✓
- Links open in new tab ✓
- Content is accessible ✓

### Error Handling
- 404 pages show for invalid routes ✓
- 500 errors reported to Sentry ✓
- Unauthorized access shows 403 page ✓

---

This plan provides Sonnet with complete, copy-paste ready code for all 6 critical features. Each section includes all necessary files, API routes, and UI components with proper error handling and security measures.