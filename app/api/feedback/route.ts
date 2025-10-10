import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getResendClient } from '@/lib/resend/client'

// POST /api/feedback - Submit user feedback
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { subject, feedback } = body

    if (!subject || !feedback) {
      return NextResponse.json(
        { error: 'Subject and feedback are required' },
        { status: 400 }
      )
    }

    // Get user details from database
    const { prisma } = await import('@/lib/prisma')
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { organization: true }
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Send email via Resend
    const resend = getResendClient()

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>User Feedback</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #3b82f6; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">New Feedback from HelixFlow</h2>

            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px;"><strong>From:</strong> ${dbUser.name || 'No name'} (${dbUser.email})</p>
              <p style="margin: 0 0 10px;"><strong>Organization:</strong> ${dbUser.organization?.name || 'Unknown'}</p>
              <p style="margin: 0 0 10px;"><strong>User ID:</strong> ${dbUser.id}</p>
              <p style="margin: 0;"><strong>Role:</strong> ${dbUser.role}</p>
            </div>

            <div style="margin: 20px 0;">
              <h3 style="color: #334155; margin-bottom: 10px;">Subject:</h3>
              <p style="background-color: #f1f5f9; padding: 10px; border-radius: 4px; margin: 0;">
                ${subject}
              </p>
            </div>

            <div style="margin: 20px 0;">
              <h3 style="color: #334155; margin-bottom: 10px;">Feedback:</h3>
              <div style="background-color: #f1f5f9; padding: 15px; border-radius: 4px; white-space: pre-wrap;">
${feedback}
              </div>
            </div>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">

            <p style="color: #64748b; font-size: 14px; margin: 0;">
              Sent from HelixFlow Beta Feedback System
            </p>
          </div>
        </body>
      </html>
    `

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'HelixFlow <noreply@helixflow.app>',
      to: 'lucegary@gmail.com',
      subject: `HelixFlow Feedback: ${subject}`,
      html,
      replyTo: dbUser.email
    })

    return NextResponse.json({
      success: true,
      message: 'Feedback sent successfully'
    })
  } catch (error) {
    console.error('Error sending feedback:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Failed to send feedback: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to send feedback' },
      { status: 500 }
    )
  }
}
