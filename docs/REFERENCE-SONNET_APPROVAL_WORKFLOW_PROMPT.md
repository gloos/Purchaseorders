# Sonnet Implementation Instructions: PO Approval Workflow

## Overview
Implement two features:
1. **Organization Setup During Signup** - Require organization creation at signup
2. **PO Approval Workflow** - POs over £50 need approval from admins

## IMPORTANT BUSINESS RULES
- **Approval threshold**: £50 (calculated on subtotal BEFORE tax)
- **Auto-approve**: Admins creating their own POs are auto-approved regardless of amount
- **Auto-send**: Approved POs automatically change status to SENT
- **Resubmission**: Denied POs can be edited and resubmitted
- **Email notifications**: Send emails for all approval events (use Resend)

## Step 1: Update User Roles

### File: `prisma/schema.prisma`

Update the UserRole enum to add SUPER_ADMIN:

```prisma
enum UserRole {
  SUPER_ADMIN // Platform owner - can manage everything including billing
  ADMIN       // Organization admin - manage users, settings, approve POs
  MANAGER     // Can create and edit POs, needs approval above threshold
  VIEWER      // Read-only access - cannot create or edit anything
}
```

### Migration for existing user:
After updating schema, create a migration to set lucegary@gmail.com as SUPER_ADMIN:

```sql
UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'lucegary@gmail.com';
```

## Step 2: Add Approval Models to Schema

### File: `prisma/schema.prisma`

Add these new models:

```prisma
// In Organization model, add these fields:
approvalThreshold    Decimal   @default(50) @db.Decimal(10, 2)
autoApproveAdmin     Boolean   @default(true)
companyName          String?   // For display in navbar

// New model for approval requests
model ApprovalRequest {
  id              String   @id @default(uuid())
  purchaseOrderId String   @unique
  requesterId     String
  status          String   @default("PENDING") // PENDING, APPROVED, DENIED
  amount          Decimal  @db.Decimal(10, 2)
  denialReason    String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  approvedAt      DateTime?
  approvedById    String?
  deniedAt        DateTime?
  deniedById      String?

  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id])
  requester       User          @relation("Requester", fields: [requesterId], references: [id])
  approvedBy      User?         @relation("Approver", fields: [approvedById], references: [id])
  deniedBy        User?         @relation("Denier", fields: [deniedById], references: [id])
  actions         ApprovalAction[]

  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])

  @@map("approval_requests")
  @@index([status])
  @@index([organizationId, status])
}

// Audit trail for all approval actions
model ApprovalAction {
  id                String   @id @default(uuid())
  approvalRequestId String
  userId            String
  action            String   // SUBMITTED, APPROVED, DENIED, RESUBMITTED, EDITED
  note              String?
  metadata          Json?    // Store IP, browser, etc
  createdAt         DateTime @default(now())

  approvalRequest ApprovalRequest @relation(fields: [approvalRequestId], references: [id])
  user            User            @relation(fields: [userId], references: [id])

  @@map("approval_actions")
  @@index([approvalRequestId])
  @@index([userId])
}

// Update User model relations:
approvalRequestsSent     ApprovalRequest[] @relation("Requester")
approvalRequestsApproved ApprovalRequest[] @relation("Approver")
approvalRequestsDenied   ApprovalRequest[] @relation("Denier")
approvalActions          ApprovalAction[]

// Update Organization model relations:
approvalRequests     ApprovalRequest[]

// Update PurchaseOrder model:
approvalRequest      ApprovalRequest?
```

Run: `npx prisma db push`

## Step 3: Update Signup Flow

### File: `/app/(auth)/signup/page.tsx`

Add organization creation step after user signup:

```typescript
'use client'

import { useState } from 'react'

export default function SignupPage() {
  const [step, setStep] = useState<'account' | 'organization' | 'complete'>('account')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAccountCreation = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // 1. Create user account with Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    })

    if (!authError && authData.user) {
      // Move to organization step
      setStep('organization')
    }
    setLoading(false)
  }

  const handleOrgCreation = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Create organization with user as ADMIN
    const response = await fetch('/api/organization/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: orgName,
        approvalThreshold: 50, // Default £50
        autoApproveAdmin: true
      })
    })

    if (response.ok) {
      // Redirect to dashboard
      window.location.href = '/dashboard'
    }
    setLoading(false)
  }

  if (step === 'account') {
    return (
      <form onSubmit={handleAccountCreation}>
        <h2>Create your account</h2>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit" disabled={loading}>Continue</button>
      </form>
    )
  }

  if (step === 'organization') {
    return (
      <form onSubmit={handleOrgCreation}>
        <h2>Set up your organization</h2>
        <p>This will be displayed in your navigation bar</p>
        <input
          type="text"
          placeholder="Company Name"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>Complete Setup</button>
      </form>
    )
  }
}
```

### File: `/app/api/organization/create/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  const { name, approvalThreshold, autoApproveAdmin } = await request.json()

  // Create organization with user as ADMIN
  const org = await prisma.organization.create({
    data: {
      name,
      companyName: name,
      approvalThreshold: approvalThreshold || 50,
      autoApproveAdmin: autoApproveAdmin ?? true,
      users: {
        connect: { id: user.id }
      }
    }
  })

  // Update user to be ADMIN of this org
  await prisma.user.update({
    where: { id: user.id },
    data: {
      organizationId: org.id,
      role: 'ADMIN' // First user is always admin
    }
  })

  return NextResponse.json({ success: true, organizationId: org.id })
}
```

## Step 4: Update Navbar to Use Organization Name

### File: `/components/navbar.tsx`

Replace FreeAgent company name with organization name:

```typescript
const fetchProfile = async () => {
  try {
    const response = await fetch('/api/organization/profile')
    if (response.ok) {
      const data = await response.json()
      setProfile({
        name: data.companyName || data.name, // Use companyName from org
        logoUrl: data.logoUrl
      })
    }
  } catch (error) {
    console.error('Error fetching profile:', error)
  }
}
```

## Step 5: Update PO Creation Flow

### File: `/app/(dashboard)/purchase-orders/new/page.tsx`

Add approval check logic:

```typescript
const calculateSubtotal = () => {
  return lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
}

const needsApproval = () => {
  // VIEWER cannot create POs at all
  if (user.role === 'VIEWER') return 'BLOCKED'

  // SUPER_ADMIN and ADMIN always auto-approve
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return false

  // MANAGER needs approval if over threshold
  const subtotal = calculateSubtotal()
  return subtotal >= (org.approvalThreshold || 50)
}

const handleSubmit = async () => {
  const approvalNeeded = needsApproval()

  if (approvalNeeded === 'BLOCKED') {
    alert('You do not have permission to create purchase orders')
    return
  }

  if (approvalNeeded) {
    // Submit for approval
    const response = await fetch('/api/purchase-orders/submit-for-approval', {
      method: 'POST',
      body: JSON.stringify({
        ...formData,
        status: 'PENDING_APPROVAL',
        subtotalAmount: calculateSubtotal()
      })
    })

    if (response.ok) {
      alert('Purchase order submitted for approval')
      router.push('/purchase-orders')
    }
  } else {
    // Create and auto-send if admin
    const response = await fetch('/api/purchase-orders', {
      method: 'POST',
      body: JSON.stringify({
        ...formData,
        status: user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? 'SENT' : 'DRAFT'
      })
    })

    if (response.ok) {
      alert('Purchase order created and sent')
      router.push('/purchase-orders')
    }
  }
}

// Update button text
<button onClick={handleSubmit}>
  {needsApproval() ? 'Submit for Approval' : 'Create and Send'}
</button>
```

## Step 6: Create Approval Dashboard Widget

### File: `/components/dashboard/approval-widget.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

export function ApprovalWidget({ user }) {
  const [pendingApprovals, setPendingApprovals] = useState([])
  const [denyModal, setDenyModal] = useState({ open: false, approval: null })
  const [denialReason, setDenialReason] = useState('')
  const [loading, setLoading] = useState(false)

  // Only show for ADMIN and SUPER_ADMIN
  if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return null
  }

  useEffect(() => {
    fetchPendingApprovals()
  }, [])

  const fetchPendingApprovals = async () => {
    const response = await fetch('/api/approvals/pending')
    if (response.ok) {
      const data = await response.json()
      setPendingApprovals(data)
    }
  }

  const handleApprove = async (approvalId: string) => {
    setLoading(true)
    const response = await fetch(`/api/approvals/${approvalId}/approve`, {
      method: 'POST'
    })

    if (response.ok) {
      alert('Purchase order approved and sent')
      fetchPendingApprovals()
    }
    setLoading(false)
  }

  const handleDeny = async () => {
    setLoading(true)
    const response = await fetch(`/api/approvals/${denyModal.approval.id}/deny`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: denialReason })
    })

    if (response.ok) {
      alert('Purchase order denied')
      setDenyModal({ open: false, approval: null })
      setDenialReason('')
      fetchPendingApprovals()
    }
    setLoading(false)
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">
          Pending Approvals ({pendingApprovals.length})
        </h3>

        {pendingApprovals.length === 0 ? (
          <p className="text-gray-500">No pending approvals</p>
        ) : (
          <div className="space-y-3">
            {pendingApprovals.map((approval) => (
              <div key={approval.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{approval.purchaseOrder.title}</h4>
                    <p className="text-sm text-gray-600">
                      PO #{approval.purchaseOrder.poNumber}
                    </p>
                    <p className="text-sm text-gray-600">
                      Requested by: {approval.requester.name}
                    </p>
                    <p className="text-lg font-semibold mt-2">
                      £{approval.amount.toFixed(2)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(approval.id)}
                      disabled={loading}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setDenyModal({ open: true, approval })}
                      disabled={loading}
                      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Denial Reason Modal */}
      {denyModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Deny Purchase Order</h3>
            <p className="text-sm text-gray-600 mb-4">
              Optionally provide a reason for denial. This will be sent to the requester.
            </p>
            <textarea
              value={denialReason}
              onChange={(e) => setDenialReason(e.target.value)}
              placeholder="Reason for denial (optional)"
              className="w-full border rounded p-2 mb-4"
              rows={4}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDenyModal({ open: false, approval: null })}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeny}
                disabled={loading}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Denial
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

## Step 7: Add Approval APIs

### File: `/app/api/purchase-orders/submit-for-approval/route.ts`

```typescript
import { resend } from '@/lib/resend'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  const data = await request.json()

  // Create PO with PENDING_APPROVAL status
  const po = await prisma.purchaseOrder.create({
    data: {
      ...data,
      status: 'PENDING_APPROVAL',
      createdById: user.id,
      organizationId: user.organizationId
    }
  })

  // Create approval request
  const approvalRequest = await prisma.approvalRequest.create({
    data: {
      purchaseOrderId: po.id,
      requesterId: user.id,
      organizationId: user.organizationId,
      amount: data.subtotalAmount,
      status: 'PENDING'
    }
  })

  // Create audit trail entry
  await prisma.approvalAction.create({
    data: {
      approvalRequestId: approvalRequest.id,
      userId: user.id,
      action: 'SUBMITTED',
      metadata: {
        userAgent: request.headers.get('user-agent'),
        ip: request.ip
      }
    }
  })

  // Send email to all admins
  const admins = await prisma.user.findMany({
    where: {
      organizationId: user.organizationId,
      role: { in: ['ADMIN', 'SUPER_ADMIN'] }
    }
  })

  for (const admin of admins) {
    await resend.emails.send({
      from: 'PO Tool <notifications@yourdomain.com>',
      to: admin.email,
      subject: `Approval Required: PO #${po.poNumber}`,
      html: `
        <h2>New Purchase Order Needs Approval</h2>
        <p><strong>PO Number:</strong> ${po.poNumber}</p>
        <p><strong>Amount:</strong> £${data.subtotalAmount}</p>
        <p><strong>Requested by:</strong> ${user.name}</p>
        <p><strong>Supplier:</strong> ${po.supplierName}</p>
        <a href="${process.env.NEXT_PUBLIC_URL}/purchase-orders/${po.id}">
          View and Approve
        </a>
      `
    })
  }

  return NextResponse.json({ success: true, poId: po.id })
}
```

### File: `/app/api/approvals/[id]/approve/route.ts`

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser()

  // Check user is admin
  if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const approval = await prisma.approvalRequest.findUnique({
    where: { id: params.id },
    include: {
      purchaseOrder: true,
      requester: true
    }
  })

  if (!approval || approval.status !== 'PENDING') {
    return NextResponse.json({ error: 'Invalid approval request' }, { status: 400 })
  }

  // Update approval request
  await prisma.approvalRequest.update({
    where: { id: params.id },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedById: user.id
    }
  })

  // Update PO status to SENT (auto-send after approval)
  await prisma.purchaseOrder.update({
    where: { id: approval.purchaseOrderId },
    data: { status: 'SENT' }
  })

  // Create audit trail
  await prisma.approvalAction.create({
    data: {
      approvalRequestId: params.id,
      userId: user.id,
      action: 'APPROVED'
    }
  })

  // Send email to requester
  await resend.emails.send({
    from: 'PO Tool <notifications@yourdomain.com>',
    to: approval.requester.email,
    subject: `Approved: PO #${approval.purchaseOrder.poNumber}`,
    html: `
      <h2>Your Purchase Order Has Been Approved</h2>
      <p>PO #${approval.purchaseOrder.poNumber} has been approved by ${user.name} and automatically sent to the supplier.</p>
      <a href="${process.env.NEXT_PUBLIC_URL}/purchase-orders/${approval.purchaseOrderId}">
        View Purchase Order
      </a>
    `
  })

  return NextResponse.json({ success: true })
}
```

### File: `/app/api/approvals/[id]/deny/route.ts`

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser()
  const { reason } = await request.json()

  // Check user is admin
  if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const approval = await prisma.approvalRequest.findUnique({
    where: { id: params.id },
    include: {
      purchaseOrder: true,
      requester: true
    }
  })

  // Update approval request
  await prisma.approvalRequest.update({
    where: { id: params.id },
    data: {
      status: 'DENIED',
      deniedAt: new Date(),
      deniedById: user.id,
      denialReason: reason
    }
  })

  // Update PO status to DRAFT (so it can be edited)
  await prisma.purchaseOrder.update({
    where: { id: approval.purchaseOrderId },
    data: { status: 'DRAFT' }
  })

  // Create audit trail
  await prisma.approvalAction.create({
    data: {
      approvalRequestId: params.id,
      userId: user.id,
      action: 'DENIED',
      note: reason
    }
  })

  // Send email to requester
  await resend.emails.send({
    from: 'PO Tool <notifications@yourdomain.com>',
    to: approval.requester.email,
    subject: `Denied: PO #${approval.purchaseOrder.poNumber}`,
    html: `
      <h2>Your Purchase Order Has Been Denied</h2>
      <p>PO #${approval.purchaseOrder.poNumber} has been denied by ${user.name}.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>You can edit and resubmit the purchase order.</p>
      <a href="${process.env.NEXT_PUBLIC_URL}/purchase-orders/${approval.purchaseOrderId}/edit">
        Edit Purchase Order
      </a>
    `
  })

  return NextResponse.json({ success: true })
}
```

## Step 8: Add Audit Trail to PO Page

### File: `/app/(dashboard)/purchase-orders/[id]/page.tsx`

Add audit trail section:

```typescript
// Fetch approval history
const [auditTrail, setAuditTrail] = useState([])

useEffect(() => {
  if (purchaseOrder.approvalRequest) {
    fetch(`/api/purchase-orders/${id}/audit-trail`)
      .then(res => res.json())
      .then(data => setAuditTrail(data))
  }
}, [id])

// In the JSX, add after the main PO details:
{purchaseOrder.approvalRequest && (
  <div className="mt-8 bg-white rounded-lg shadow p-6">
    <h3 className="text-lg font-semibold mb-4">Approval History</h3>
    <div className="space-y-3">
      {auditTrail.map((action, index) => (
        <div key={action.id} className="flex gap-4 pb-3 border-b last:border-0">
          <div className="text-sm text-gray-500 w-32">
            {format(new Date(action.createdAt), 'MMM d, HH:mm')}
          </div>
          <div className="flex-1">
            <p className="font-medium">{action.user.name}</p>
            <p className="text-sm">
              {action.action === 'SUBMITTED' && 'Submitted for approval'}
              {action.action === 'APPROVED' && 'Approved this purchase order'}
              {action.action === 'DENIED' && 'Denied this purchase order'}
              {action.action === 'RESUBMITTED' && 'Resubmitted for approval'}
            </p>
            {action.note && (
              <p className="text-sm text-gray-600 mt-1">Note: {action.note}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
)}

// Disable PDF/Email buttons for pending approval
<button
  disabled={purchaseOrder.status === 'PENDING_APPROVAL'}
  className={`px-4 py-2 rounded ${
    purchaseOrder.status === 'PENDING_APPROVAL'
      ? 'bg-gray-300 cursor-not-allowed'
      : 'bg-blue-600 hover:bg-blue-700 text-white'
  }`}
>
  Download PDF
</button>
```

## Step 9: Add Settings Page for Approval Threshold

### File: `/app/(dashboard)/settings/approvals/page.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/hooks/use-user'

export default function ApprovalSettingsPage() {
  const { user } = useUser()
  const [threshold, setThreshold] = useState(50)
  const [autoApprove, setAutoApprove] = useState(true)
  const [loading, setLoading] = useState(false)

  // Only allow SUPER_ADMIN and ADMIN
  if (!['ADMIN', 'SUPER_ADMIN'].includes(user?.role)) {
    return <div>You don't have permission to view this page</div>
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    const response = await fetch('/api/organization/approval-settings')
    if (response.ok) {
      const data = await response.json()
      setThreshold(data.approvalThreshold)
      setAutoApprove(data.autoApproveAdmin)
    }
  }

  const saveSettings = async () => {
    setLoading(true)
    await fetch('/api/organization/approval-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approvalThreshold: threshold,
        autoApproveAdmin: autoApprove
      })
    })
    alert('Settings saved')
    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Approval Settings</h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Approval Threshold (£)
          </label>
          <input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full border rounded px-3 py-2"
            min="0"
            step="10"
          />
          <p className="text-sm text-gray-600 mt-1">
            Purchase orders with subtotal above this amount will require admin approval
          </p>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
            />
            <span>Auto-approve admin's own purchase orders</span>
          </label>
          <p className="text-sm text-gray-600 mt-1">
            When enabled, admins can create POs of any amount without approval
          </p>
        </div>

        <button
          onClick={saveSettings}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Save Settings
        </button>
      </div>
    </div>
  )
}
```

## Step 10: Add to Dashboard

### File: `/app/(dashboard)/dashboard/page.tsx`

Import and add the approval widget:

```typescript
import { ApprovalWidget } from '@/components/dashboard/approval-widget'

// In the component:
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Existing widgets */}

  {/* Add approval widget for admins */}
  {['ADMIN', 'SUPER_ADMIN'].includes(user.role) && (
    <ApprovalWidget user={user} />
  )}
</div>
```

## Testing Plan

1. **Test Role Hierarchy**:
   - SUPER_ADMIN (lucegary@gmail.com) can do everything
   - ADMIN can approve POs and manage settings
   - MANAGER can create POs but needs approval above £50
   - VIEWER can only view, cannot create or edit

2. **Test Approval Flow**:
   - Create a MANAGER user
   - Create PO above £50 → Should require approval
   - Login as ADMIN → Should see in widget
   - Approve → PO should auto-send
   - Check email notifications

3. **Test Denial Flow**:
   - MANAGER creates PO above £50
   - ADMIN denies with reason
   - PO changes to DRAFT
   - MANAGER can edit and resubmit

4. **Test Auto-Approval**:
   - ADMIN creates PO of any amount → Auto-approved and sent
   - MANAGER creates PO under £50 → Auto-approved

## Important Implementation Notes

1. **Email Setup**: Make sure Resend is configured with proper templates
2. **Permissions**: Always check user role before allowing actions
3. **Audit Trail**: Never delete audit records, they're for compliance
4. **Status Flow**: PENDING_APPROVAL → APPROVED (auto-sends) or DENIED (back to DRAFT)
5. **Viewer Role**: Cannot create or edit anything, only read access

## Email Templates Needed

1. **approval-request.html** - Sent to admins when approval needed
2. **approval-granted.html** - Sent to requester when approved
3. **approval-denied.html** - Sent to requester when denied
4. **daily-pending.html** - Daily digest of pending approvals (optional)