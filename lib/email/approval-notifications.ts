// Approval workflow email notifications
import { getResendClient } from '@/lib/resend/client'

interface ApprovalRequestEmailParams {
  to: string[] // All admin emails
  poNumber: string
  poTitle: string
  amount: string
  currency: string
  requesterName: string
  supplierName: string
  poId: string
}

interface ApprovalGrantedEmailParams {
  to: string // Requester email
  poNumber: string
  poTitle: string
  approverName: string
  poId: string
}

interface ApprovalDeniedEmailParams {
  to: string // Requester email
  poNumber: string
  poTitle: string
  denierName: string
  reason?: string
  poId: string
}

export async function sendApprovalRequestEmail(params: ApprovalRequestEmailParams) {
  const resend = getResendClient()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const poUrl = `${baseUrl}/purchase-orders/${params.poId}`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Approval Required: PO #${params.poNumber}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 32px; text-align: center; background-color: #f59e0b; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                      Approval Required
                    </h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #334155;">
                      <strong>${params.requesterName}</strong> has submitted a purchase order that requires your approval.
                    </p>

                    <!-- PO Details -->
                    <div style="background-color: #f8fafc; border-radius: 6px; padding: 20px; margin: 24px 0;">
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">PO Number:</td>
                          <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">#${params.poNumber}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Title:</td>
                          <td style="padding: 8px 0; color: #0f172a; font-size: 14px; text-align: right;">${params.poTitle}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Supplier:</td>
                          <td style="padding: 8px 0; color: #0f172a; font-size: 14px; text-align: right;">${params.supplierName}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Amount:</td>
                          <td style="padding: 8px 0; color: #0f172a; font-size: 18px; font-weight: 700; text-align: right;">${params.currency}${params.amount}</td>
                        </tr>
                      </table>
                    </div>

                    <!-- CTA Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td align="center" style="padding: 24px 0;">
                          <a href="${poUrl}" style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                            Review Purchase Order
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0; font-size: 14px; line-height: 20px; color: #64748b; text-align: center;">
                      You can approve or deny this request from your dashboard.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 40px; background-color: #f8fafc; border-radius: 0 0 8px 8px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; line-height: 16px; color: #94a3b8;">
                      This is an automated notification from your PO management system.
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
Approval Required: PO #${params.poNumber}

${params.requesterName} has submitted a purchase order that requires your approval.

PO Details:
- Number: #${params.poNumber}
- Title: ${params.poTitle}
- Supplier: ${params.supplierName}
- Amount: ${params.currency}${params.amount}

Review and approve: ${poUrl}

You can approve or deny this request from your dashboard.
  `.trim()

  // Send to all admins
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'PO Tool <noreply@helixflow.app>',
    to: params.to,
    subject: `Approval Required: PO #${params.poNumber}`,
    html,
    text
  })
}

export async function sendApprovalGrantedEmail(params: ApprovalGrantedEmailParams) {
  const resend = getResendClient()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const poUrl = `${baseUrl}/purchase-orders/${params.poId}`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Approved: PO #${params.poNumber}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 32px; text-align: center; background-color: #10b981; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                      ✓ Purchase Order Approved
                    </h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #334155;">
                      Good news! Your purchase order has been approved by <strong>${params.approverName}</strong>.
                    </p>

                    <!-- PO Details -->
                    <div style="background-color: #f8fafc; border-radius: 6px; padding: 20px; margin: 24px 0;">
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">PO Number:</td>
                          <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">#${params.poNumber}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Title:</td>
                          <td style="padding: 8px 0; color: #0f172a; font-size: 14px; text-align: right;">${params.poTitle}</td>
                        </tr>
                      </table>
                    </div>

                    <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #334155;">
                      The purchase order has been automatically sent to the supplier.
                    </p>

                    <!-- CTA Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td align="center" style="padding: 24px 0;">
                          <a href="${poUrl}" style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                            View Purchase Order
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 40px; background-color: #f8fafc; border-radius: 0 0 8px 8px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; line-height: 16px; color: #94a3b8;">
                      This is an automated notification from your PO management system.
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
Purchase Order Approved: PO #${params.poNumber}

Good news! Your purchase order has been approved by ${params.approverName}.

PO Details:
- Number: #${params.poNumber}
- Title: ${params.poTitle}

The purchase order has been automatically sent to the supplier.

View details: ${poUrl}
  `.trim()

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'PO Tool <noreply@helixflow.app>',
    to: params.to,
    subject: `Approved: PO #${params.poNumber}`,
    html,
    text
  })
}

export async function sendApprovalDeniedEmail(params: ApprovalDeniedEmailParams) {
  const resend = getResendClient()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const editUrl = `${baseUrl}/purchase-orders/${params.poId}/edit`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Denied: PO #${params.poNumber}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 32px; text-align: center; background-color: #ef4444; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                      Purchase Order Denied
                    </h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #334155;">
                      Your purchase order has been denied by <strong>${params.denierName}</strong>.
                    </p>

                    <!-- PO Details -->
                    <div style="background-color: #f8fafc; border-radius: 6px; padding: 20px; margin: 24px 0;">
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">PO Number:</td>
                          <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">#${params.poNumber}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Title:</td>
                          <td style="padding: 8px 0; color: #0f172a; font-size: 14px; text-align: right;">${params.poTitle}</td>
                        </tr>
                      </table>
                    </div>

                    ${params.reason ? `
                    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0;">
                      <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #991b1b;">Reason:</p>
                      <p style="margin: 0; font-size: 14px; line-height: 20px; color: #7f1d1d;">${params.reason}</p>
                    </div>
                    ` : ''}

                    <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #334155;">
                      The purchase order has been returned to draft status. You can edit and resubmit it.
                    </p>

                    <!-- CTA Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td align="center" style="padding: 24px 0;">
                          <a href="${editUrl}" style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                            Edit Purchase Order
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 40px; background-color: #f8fafc; border-radius: 0 0 8px 8px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; line-height: 16px; color: #94a3b8;">
                      This is an automated notification from your PO management system.
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
Purchase Order Denied: PO #${params.poNumber}

Your purchase order has been denied by ${params.denierName}.

PO Details:
- Number: #${params.poNumber}
- Title: ${params.poTitle}

${params.reason ? `Reason: ${params.reason}\n\n` : ''}The purchase order has been returned to draft status. You can edit and resubmit it.

Edit purchase order: ${editUrl}
  `.trim()

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'PO Tool <noreply@helixflow.app>',
    to: params.to,
    subject: `Denied: PO #${params.poNumber}`,
    html,
    text
  })
}
