// Invitation email service
import { getResendClient } from '@/lib/resend/client'
import { UserRole } from '@prisma/client'

interface SendInvitationEmailParams {
  to: string
  inviterName: string
  organizationName: string
  invitationToken: string
  role: UserRole
}

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Administrator',
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  VIEWER: 'Viewer'
}

export async function sendInvitationEmail({
  to,
  inviterName,
  organizationName,
  invitationToken,
  role
}: SendInvitationEmailParams) {
  const resend = getResendClient()

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const signupUrl = `${baseUrl}/signup/invited?token=${invitationToken}`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You've been invited to ${organizationName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 32px; text-align: center; background-color: #3b82f6; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                      You've Been Invited!
                    </h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #334155;">
                      Hi there,
                    </p>
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #334155;">
                      <strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on our Purchase Order Management platform.
                    </p>
                    <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #334155;">
                      You've been assigned the role of <strong>${ROLE_LABELS[role]}</strong>.
                    </p>

                    <!-- CTA Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td align="center" style="padding: 0 0 24px;">
                          <a href="${signupUrl}" style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                            Accept Invitation
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 16px; font-size: 14px; line-height: 20px; color: #64748b;">
                      Or copy and paste this link into your browser:
                    </p>
                    <p style="margin: 0 0 24px; font-size: 14px; line-height: 20px; color: #3b82f6; word-break: break-all;">
                      ${signupUrl}
                    </p>

                    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;">

                    <p style="margin: 0; font-size: 14px; line-height: 20px; color: #64748b;">
                      This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 40px; background-color: #f8fafc; border-radius: 0 0 8px 8px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; line-height: 16px; color: #94a3b8;">
                      &copy; ${new Date().getFullYear()} ${organizationName}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `

  const text = `
You've been invited to ${organizationName}

${inviterName} has invited you to join ${organizationName} on our Purchase Order Management platform.

Role: ${ROLE_LABELS[role]}

To accept this invitation and create your account, click the link below:
${signupUrl}

This invitation will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.
  `.trim()

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'HelixFlow <noreply@helixflow.app>',
    to,
    subject: `You've been invited to join ${organizationName}`,
    html,
    text
  })
}
