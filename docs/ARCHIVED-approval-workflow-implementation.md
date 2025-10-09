# Purchase Order Approval Workflow Implementation Plan

## Overview
This document outlines the implementation of two major features:
1. **Organization Setup & Dashboard Customization** - Streamlined onboarding with role-based widget management
2. **PO Approval Workflow** - Threshold-based approval system with audit trails

## Feature 1: Organization Setup & Dashboard Customization

### 1.1 Database Schema Updates

```prisma
// Update Organization model
model Organization {
  // ... existing fields

  // New fields for approval settings
  approvalThreshold    Decimal?  @db.Decimal(10, 2) // Amount requiring approval
  autoApproveAdmin     Boolean   @default(true)      // Auto-approve admin's own POs
  requirePeerReview    Boolean   @default(false)     // Admins need peer approval

  // Dashboard configuration
  defaultWidgets       Json?     // Default widget configuration for new users

  // Add approval-related relations
  approvalRules        ApprovalRule[]
  approvalRequests     ApprovalRequest[]
}

// Update User model - Already has role field (ADMIN, MANAGER, VIEWER)
model User {
  // ... existing fields

  // Dashboard preferences
  widgetPreferences    Json?     // User's widget visibility/layout
  dashboardLayout      Json?     // Custom dashboard arrangement

  // Approval relations
  approvalRequestsSent     ApprovalRequest[] @relation("Requester")
  approvalRequestsReceived ApprovalRequest[] @relation("Approver")
  approvalActions          ApprovalAction[]
}

// New: Approval request tracking
model ApprovalRequest {
  id              String   @id @default(uuid())
  purchaseOrderId String   @unique
  requesterId     String
  approverId      String?  // Null = any admin can approve
  status          ApprovalStatus @default(PENDING)
  amount          Decimal  @db.Decimal(10, 2)
  reason          String?  // Optional reason for request
  createdAt       DateTime @default(now())
  expiresAt       DateTime? // Optional expiry

  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id])
  requester       User          @relation("Requester", fields: [requesterId], references: [id])
  approver        User?         @relation("Approver", fields: [approverId], references: [id])
  actions         ApprovalAction[]

  @@map("approval_requests")
  @@index([status])
  @@index([approverId, status])
}

// New: Audit trail for approvals
model ApprovalAction {
  id              String   @id @default(uuid())
  approvalRequestId String
  userId          String
  action          ApprovalActionType
  reason          String?  // Denial reason or approval note
  createdAt       DateTime @default(now())
  metadata        Json?    // Additional context (IP, browser, etc.)

  approvalRequest ApprovalRequest @relation(fields: [approvalRequestId], references: [id])
  user            User            @relation(fields: [userId], references: [id])

  @@map("approval_actions")
  @@index([approvalRequestId])
}

// New: Flexible approval rules (future enhancement)
model ApprovalRule {
  id              String   @id @default(uuid())
  organizationId  String
  name            String
  minAmount       Decimal? @db.Decimal(10, 2)
  maxAmount       Decimal? @db.Decimal(10, 2)
  requiredRole    UserRole?
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())

  organization    Organization @relation(fields: [organizationId], references: [id])

  @@map("approval_rules")
}

enum ApprovalStatus {
  PENDING
  APPROVED
  DENIED
  EXPIRED
  CANCELLED
}

enum ApprovalActionType {
  SUBMITTED
  APPROVED
  DENIED
  CANCELLED
  EXPIRED
  COMMENTED
}
```

### 1.2 Signup Flow Updates

#### Page: `/app/(auth)/signup/page.tsx`

**Current Flow:**
1. Email/password input
2. Create user account
3. Redirect to dashboard

**New Flow:**
1. Email/password input
2. Organization setup step:
   - Organization name (required)
   - Industry/type (optional - for better defaults)
   - Company size (optional - for feature suggestions)
   - Currency preference
3. Create organization + user (as ADMIN)
4. Redirect to onboarding dashboard tour

**Implementation Steps:**
```typescript
// Multi-step form with progress indicator
const SignupFlow = () => {
  const [step, setStep] = useState<'account' | 'organization' | 'complete'>('account')
  const [accountData, setAccountData] = useState({})
  const [orgData, setOrgData] = useState({})

  // Step 1: Account creation
  // Step 2: Organization setup
  // Step 3: Welcome/tour
}
```

### 1.3 Dashboard Widget Management

#### New Page: `/app/(dashboard)/settings/dashboard/page.tsx`

**Admin Features:**
- Drag-and-drop widget arrangement
- Set default widgets for each role
- Preview dashboard as different roles
- Save templates for quick setup

**Implementation:**
```typescript
// Widget configuration structure
interface WidgetConfig {
  id: string
  type: 'stats' | 'chart' | 'table' | 'approvals'
  title: string
  visible: boolean
  position: { x: number; y: number; w: number; h: number }
  permissions: {
    roles: UserRole[]
    custom?: string[] // User IDs for exceptions
  }
  settings?: Record<string, any> // Widget-specific settings
}

// Dashboard layout system using react-grid-layout
```

#### API Endpoints:
- `GET /api/dashboard/widgets` - Get user's widget configuration
- `PUT /api/dashboard/widgets` - Update widget preferences
- `GET /api/dashboard/defaults` - Get default widgets for role
- `PUT /api/organization/dashboard-defaults` - Admin: Set role defaults

## Feature 2: PO Approval Workflow

### 2.1 Approval Rules Configuration

#### New Page: `/app/(dashboard)/settings/approvals/page.tsx`

**Admin Settings:**
- Set approval threshold amount
- Toggle auto-approve for admin POs
- Configure peer review requirements
- Set approval expiry times
- Notification preferences

### 2.2 Purchase Order Creation Flow Updates

#### Updated: `/app/(dashboard)/purchase-orders/new/page.tsx`

**Current Behavior:**
- All users can create and send POs directly

**New Behavior:**
```typescript
// Check if approval needed
const needsApproval = (amount: number, userRole: UserRole, orgSettings: OrgSettings) => {
  if (userRole === 'VIEWER') return false // Viewers can't create POs
  if (userRole === 'ADMIN' && orgSettings.autoApproveAdmin) return false
  if (userRole === 'ADMIN' && orgSettings.requirePeerReview) return true
  return amount >= (orgSettings.approvalThreshold || Infinity)
}

// Button logic
if (needsApproval(totalAmount, user.role, org.settings)) {
  return <SubmitForApprovalButton />
} else {
  return <CreatePurchaseOrderButton />
}
```

### 2.3 Approval Dashboard Widget

#### New Component: `/components/dashboard/approval-widget.tsx`

**Features:**
- List pending approvals with key details
- One-click approve/deny buttons
- Modal for denial reason
- Quick preview on hover
- Filter by date/amount/requester

**Design:**
```typescript
interface ApprovalWidget {
  pending: ApprovalRequest[]
  recentActions: ApprovalAction[]
  stats: {
    pendingCount: number
    avgApprovalTime: number
    thisWeek: { approved: number; denied: number }
  }
}
```

### 2.4 Audit Trail Component

#### New Component: `/components/purchase-order/audit-trail.tsx`

**Display on PO Detail Page:**
- Timeline view of all actions
- User avatars and timestamps
- Approval/denial reasons
- Status changes
- Comments thread

### 2.5 Email Notifications

**New Email Templates:**
1. **Approval Request** (to admins)
   - PO summary
   - Direct approve/deny links
   - Requester information

2. **Approval Decision** (to requester)
   - Approved: Next steps
   - Denied: Reason and suggestions

3. **Reminder** (configurable)
   - Pending approvals digest
   - Expiring requests warning

### 2.6 API Endpoints

```typescript
// Approval management
POST   /api/purchase-orders/[id]/submit-for-approval
POST   /api/approvals/[id]/approve
POST   /api/approvals/[id]/deny
GET    /api/approvals/pending
GET    /api/approvals/history

// Audit trail
GET    /api/purchase-orders/[id]/audit-trail
POST   /api/purchase-orders/[id]/comment

// Dashboard
GET    /api/dashboard/approval-stats
GET    /api/dashboard/my-requests
```

## Implementation Order

### Phase 1: Foundation (Week 1)
1. Database migrations for new tables
2. Update User and Organization models
3. Create approval-related models
4. Generate Prisma client

### Phase 2: Organization Setup (Week 1)
1. Update signup flow with organization step
2. Migration script for existing users
3. Basic role assignment logic
4. Default dashboard configurations

### Phase 3: Approval Logic (Week 2)
1. Approval threshold settings page
2. PO creation flow updates
3. Approval submission logic
4. Status management

### Phase 4: Approval Interface (Week 2)
1. Approval dashboard widget
2. Approval actions (approve/deny)
3. Denial reason modal
4. Email notifications

### Phase 5: Audit & Polish (Week 3)
1. Audit trail component
2. PO page integration
3. Dashboard widget management
4. Testing and refinement

## Edge Cases to Handle

1. **Existing Users Without Organizations**
   - Create migration script
   - Prompt to create/join organization on next login

2. **Single Admin Scenarios**
   - Allow self-approval with audit log
   - Or require invitation of second admin

3. **Approval While Admin is Away**
   - Approval delegation feature
   - Escalation after timeout
   - Multiple admin notifications

4. **Changing Approval Thresholds**
   - Don't affect existing pending approvals
   - Clear communication of changes

5. **Bulk Operations**
   - Batch approval interface
   - Bulk denial with common reason

## Security Considerations

1. **Permission Checks**
   - Verify role on every approval action
   - Prevent approval of own requests (unless allowed)
   - Audit all permission bypasses

2. **Data Validation**
   - Validate amounts haven't changed
   - Prevent approval replay attacks
   - Check organization boundaries

3. **Audit Integrity**
   - Immutable audit logs
   - Track IP/device for actions
   - Regular audit exports

## Success Metrics

1. **Adoption**
   - % of POs going through approval
   - Average approval time
   - User satisfaction scores

2. **Efficiency**
   - Reduction in unauthorized purchases
   - Time saved on manual approvals
   - Decreased approval bottlenecks

3. **Compliance**
   - Audit trail completeness
   - Policy adherence rate
   - Error/exception rate

## Future Enhancements

1. **Advanced Rules**
   - Category-based thresholds
   - Vendor-specific rules
   - Time-based restrictions

2. **Delegation**
   - Vacation mode
   - Temporary approvers
   - Approval chains

3. **Analytics**
   - Approval patterns
   - Bottleneck identification
   - Spending insights

4. **Integrations**
   - Slack/Teams approvals
   - Mobile push notifications
   - Calendar integration

## Testing Checklist

### Unit Tests
- [ ] Approval threshold calculations
- [ ] Role permission checks
- [ ] Email notification triggers
- [ ] Audit trail creation

### Integration Tests
- [ ] Complete approval flow
- [ ] Denial with reasons
- [ ] Multi-user scenarios
- [ ] Edge case handling

### E2E Tests
- [ ] Signup with organization
- [ ] PO creation → approval → completion
- [ ] Dashboard widget interactions
- [ ] Audit trail accuracy

## Migration Plan

1. **Database Migration**
   ```bash
   npx prisma migrate dev --name add-approval-workflow
   ```

2. **Seed Data**
   - Set default approval threshold (e.g., £1000)
   - Assign ADMIN role to organization creators
   - Initialize widget configurations

3. **Feature Flags**
   - Roll out gradually by organization
   - A/B test approval thresholds
   - Monitor performance impact

4. **Communication**
   - In-app notifications about new features
   - Email guide to admins
   - Help documentation updates

---

## Questions for Clarification

1. Should approval thresholds vary by category (e.g., IT vs. Office Supplies)?
2. Do we need multi-level approvals for very high amounts?
3. Should denied POs be editable and resubmittable?
4. How long should approval requests remain valid?
5. Should we track partial approvals (e.g., approved with reduced amount)?

## Recommended Next Steps

1. Review and approve this implementation plan
2. Create UI mockups for approval workflow
3. Set up feature flags for gradual rollout
4. Implement Phase 1 (Database foundation)
5. Begin user research for optimal thresholds