# Implementation Guide for Sonnet

## Quick Summary
You need to implement two features:
1. **Organization Setup During Signup** - Users must create an organization when signing up
2. **PO Approval Workflow** - Purchase orders above a threshold need manager approval

## Feature 1: Organization Setup & Dashboard Permissions

### Step 1: Database Changes
Add to `prisma/schema.prisma`:

```prisma
// In Organization model, add:
approvalThreshold    Decimal?  @db.Decimal(10, 2)
autoApproveAdmin     Boolean   @default(true)
defaultWidgets       Json?

// In User model, add:
widgetPreferences    Json?
dashboardLayout      Json?

// New models (add at end of file):
model ApprovalRequest {
  id              String   @id @default(uuid())
  purchaseOrderId String   @unique
  requesterId     String
  approverId      String?
  status          String   @default("PENDING") // PENDING, APPROVED, DENIED, CANCELLED
  amount          Decimal  @db.Decimal(10, 2)
  reason          String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id])
  requester       User          @relation("Requester", fields: [requesterId], references: [id])
  approver        User?         @relation("Approver", fields: [approverId], references: [id])
  actions         ApprovalAction[]

  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])

  @@map("approval_requests")
  @@index([status])
  @@index([approverId, status])
  @@index([organizationId])
}

model ApprovalAction {
  id              String   @id @default(uuid())
  approvalRequestId String
  userId          String
  action          String   // SUBMITTED, APPROVED, DENIED, COMMENTED
  reason          String?
  createdAt       DateTime @default(now())

  approvalRequest ApprovalRequest @relation(fields: [approvalRequestId], references: [id])
  user            User            @relation(fields: [userId], references: [id])

  @@map("approval_actions")
  @@index([approvalRequestId])
}

// In User model relations, add:
approvalRequestsSent     ApprovalRequest[] @relation("Requester")
approvalRequestsReceived ApprovalRequest[] @relation("Approver")
approvalActions          ApprovalAction[]

// In Organization model relations, add:
approvalRequests     ApprovalRequest[]

// In PurchaseOrder model relations, add:
approvalRequest      ApprovalRequest?
```

Run: `npx prisma db push`

### Step 2: Update Signup Page
File: `/app/(auth)/signup/page.tsx`

Make it a 2-step form:
1. **Step 1**: Email & Password (existing)
2. **Step 2**: Organization Name (new)

```typescript
// Add organization step after successful user creation
const [step, setStep] = useState(1)
const [orgName, setOrgName] = useState('')

// After user signup succeeds:
if (step === 1) {
  setStep(2) // Move to org creation
  return (
    <div>
      <h2>Set up your organization</h2>
      <input
        placeholder="Company Name"
        value={orgName}
        onChange={(e) => setOrgName(e.target.value)}
      />
      <button onClick={createOrganization}>Continue</button>
    </div>
  )
}

// In createOrganization:
// 1. Create organization with the user as ADMIN
// 2. Set default approvalThreshold to 1000
// 3. Redirect to dashboard
```

### Step 3: Add Approval Settings Page
Create: `/app/(dashboard)/settings/approvals/page.tsx`

For ADMIN users only:
- Input field for approval threshold amount
- Toggle for auto-approve own POs
- Save button

```typescript
// GET current settings
const getSettings = async () => {
  const res = await fetch('/api/organization/approval-settings')
  return res.json()
}

// PUT to update
const updateSettings = async (settings) => {
  await fetch('/api/organization/approval-settings', {
    method: 'PUT',
    body: JSON.stringify(settings)
  })
}
```

## Feature 2: Purchase Order Approval Workflow

### Step 1: Update PO Creation Page
File: `/app/(dashboard)/purchase-orders/new/page.tsx`

Add logic to check if approval is needed:

```typescript
// Before the submit button:
const needsApproval = () => {
  const total = calculateTotal()
  if (user.role === 'ADMIN' && org.autoApproveAdmin) return false
  return user.role === 'MANAGER' && total >= org.approvalThreshold
}

// Change button based on needsApproval():
{needsApproval() ? (
  <button onClick={submitForApproval}>Submit for Approval</button>
) : (
  <button onClick={createPurchaseOrder}>Create Purchase Order</button>
)}
```

### Step 2: Create Approval API Endpoints

#### `/api/purchase-orders/submit-for-approval/route.ts`
```typescript
export async function POST(request: NextRequest) {
  const { purchaseOrderData } = await request.json()

  // 1. Create PO with status "PENDING_APPROVAL"
  // 2. Create ApprovalRequest record
  // 3. Create initial ApprovalAction (SUBMITTED)
  // 4. Send email to admins
  // 5. Return success
}
```

#### `/api/approvals/[id]/approve/route.ts`
```typescript
export async function POST(request: NextRequest) {
  // 1. Verify user is ADMIN
  // 2. Update ApprovalRequest status to APPROVED
  // 3. Update PO status to DRAFT/SENT based on settings
  // 4. Create ApprovalAction record
  // 5. Send email to requester
}
```

#### `/api/approvals/[id]/deny/route.ts`
```typescript
export async function POST(request: NextRequest) {
  const { reason } = await request.json()

  // 1. Verify user is ADMIN
  // 2. Update ApprovalRequest status to DENIED
  // 3. Update PO status to CANCELLED
  // 4. Create ApprovalAction with reason
  // 5. Send email to requester with reason
}
```

### Step 3: Create Approval Dashboard Widget
Create: `/components/dashboard/approval-widget.tsx`

```typescript
export function ApprovalWidget() {
  const [approvals, setApprovals] = useState([])
  const [denyModalOpen, setDenyModalOpen] = useState(false)
  const [selectedApproval, setSelectedApproval] = useState(null)
  const [denyReason, setDenyReason] = useState('')

  // Fetch pending approvals
  useEffect(() => {
    fetch('/api/approvals/pending').then(...)
  }, [])

  const handleApprove = async (id) => {
    await fetch(`/api/approvals/${id}/approve`, { method: 'POST' })
    // Refresh list
  }

  const handleDeny = (approval) => {
    setSelectedApproval(approval)
    setDenyModalOpen(true)
  }

  const submitDenial = async () => {
    await fetch(`/api/approvals/${selectedApproval.id}/deny`, {
      method: 'POST',
      body: JSON.stringify({ reason: denyReason })
    })
    setDenyModalOpen(false)
    // Refresh list
  }

  return (
    <div className="bg-white rounded-lg p-6">
      <h3>Pending Approvals ({approvals.length})</h3>
      {approvals.map(approval => (
        <div key={approval.id} className="border-b py-3">
          <div>{approval.purchaseOrder.title}</div>
          <div>£{approval.amount} - {approval.requester.name}</div>
          <div className="mt-2">
            <button onClick={() => handleApprove(approval.id)} className="bg-green-500 text-white px-3 py-1 rounded">
              Approve
            </button>
            <button onClick={() => handleDeny(approval)} className="bg-red-500 text-white px-3 py-1 rounded ml-2">
              Deny
            </button>
          </div>
        </div>
      ))}

      {/* Deny Modal */}
      {denyModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <h3>Reason for Denial (Optional)</h3>
            <textarea
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              className="w-full border rounded p-2"
              rows={4}
            />
            <button onClick={submitDenial}>Submit</button>
            <button onClick={() => setDenyModalOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

### Step 4: Add Approval Widget to Dashboard
File: `/app/(dashboard)/dashboard/page.tsx`

```typescript
// Import the widget
import { ApprovalWidget } from '@/components/dashboard/approval-widget'

// Add to dashboard (only for ADMIN role):
{user.role === 'ADMIN' && <ApprovalWidget />}
```

### Step 5: Add Audit Trail to PO Page
File: `/app/(dashboard)/purchase-orders/[id]/page.tsx`

Add section showing approval history:

```typescript
// Fetch audit trail
const auditTrail = await fetch(`/api/purchase-orders/${id}/audit-trail`)

// Display timeline
<div className="mt-8">
  <h3>Approval History</h3>
  {auditTrail.map(action => (
    <div key={action.id} className="flex items-start gap-3 py-2">
      <div className="text-sm text-gray-500">
        {format(action.createdAt, 'MMM d, HH:mm')}
      </div>
      <div>
        <strong>{action.user.name}</strong> {action.action.toLowerCase()}
        {action.reason && <p className="text-gray-600">{action.reason}</p>}
      </div>
    </div>
  ))}
</div>
```

### Step 6: Disable PDF/Email for Pending Approval
File: `/app/(dashboard)/purchase-orders/[id]/page.tsx`

```typescript
// Disable buttons if status is PENDING_APPROVAL
<button
  disabled={purchaseOrder.status === 'PENDING_APPROVAL'}
  className={purchaseOrder.status === 'PENDING_APPROVAL' ? 'opacity-50 cursor-not-allowed' : ''}
>
  Download PDF
</button>
```

## Implementation Order

1. **Day 1**: Database schema changes and migration
2. **Day 2**: Update signup flow with organization creation
3. **Day 3**: Create approval settings page
4. **Day 4**: Update PO creation flow with approval check
5. **Day 5**: Create approval API endpoints
6. **Day 6**: Build approval dashboard widget
7. **Day 7**: Add audit trail to PO pages
8. **Day 8**: Testing and bug fixes

## Testing Scenarios

1. **New User Signup**
   - Creates account → Creates organization → Becomes ADMIN

2. **Approval Flow**
   - MANAGER creates PO over threshold → Goes to approval
   - ADMIN sees in widget → Approves/Denies
   - Requester gets notification

3. **Edge Cases**
   - ADMIN creating own PO (should auto-approve if setting enabled)
   - Changing threshold doesn't affect existing approvals
   - Multiple ADMINs can all see pending approvals

## Important Notes

1. **First user in an organization is automatically ADMIN**
2. **Default approval threshold: £1000** (configurable)
3. **Email notifications are important** - requester needs to know status
4. **Audit trail is immutable** - never delete approval actions
5. **PENDING_APPROVAL status** prevents PDF/email actions

## API Response Formats

```typescript
// Approval Request
{
  id: string,
  purchaseOrder: { id, title, amount, poNumber },
  requester: { id, name, email },
  status: 'PENDING' | 'APPROVED' | 'DENIED',
  createdAt: Date,
  amount: number
}

// Approval Action
{
  id: string,
  action: 'SUBMITTED' | 'APPROVED' | 'DENIED',
  user: { name, email },
  reason?: string,
  createdAt: Date
}
```

## Remember to:
- Check user permissions on every action
- Add loading states to all buttons
- Handle errors gracefully
- Test with multiple users/roles
- Add TypeScript types for all new interfaces