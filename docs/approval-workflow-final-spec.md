# Approval Workflow - Final Specification

## Business Rules Summary

### Role Hierarchy
1. **SUPER_ADMIN** - Platform owner (lucegary@gmail.com)
   - Full platform control including billing and system settings
   - Can manage all organizations (future multi-tenant feature)

2. **ADMIN** - Organization administrator
   - Approve/deny purchase orders
   - Manage organization settings and users
   - Auto-approve their own POs regardless of amount

3. **MANAGER** - Standard user
   - Create and edit purchase orders
   - Need approval for POs above £50 (subtotal before tax)
   - Can view all organizational data

4. **VIEWER** - Read-only user
   - Cannot create or edit anything
   - Can only view POs and reports
   - Useful for accountants or auditors

### Approval Logic

#### Threshold Rules
- **Default threshold**: £50 (calculated on subtotal BEFORE tax)
- **SUPER_ADMIN & ADMIN**: Always auto-approved, no limit
- **MANAGER**: Needs approval if subtotal ≥ £50
- **VIEWER**: Cannot create POs at all

#### Approval Flow
1. **Submission**: MANAGER creates PO above £50 → Status: PENDING_APPROVAL
2. **Notification**: All ADMINs receive email notification
3. **Action**: Any ADMIN can approve or deny (first to act wins)
4. **Approved**: PO automatically changes to SENT status and emails supplier
5. **Denied**: PO changes to DRAFT status, can be edited and resubmitted

### Email Notifications

All emails sent via Resend with the following triggers:

1. **New Approval Request** → All ADMINs
   - Subject: "Approval Required: PO #[number]"
   - Contains: Amount, requester, supplier, direct link

2. **Approval Granted** → Requester
   - Subject: "Approved: PO #[number]"
   - Contains: Approver name, confirmation of auto-send

3. **Approval Denied** → Requester
   - Subject: "Denied: PO #[number]"
   - Contains: Denier name, reason (if provided), edit link

4. **Daily Digest** (Optional, Phase 2)
   - Subject: "[X] Purchase Orders Pending Approval"
   - Sent at 9 AM to all ADMINs with pending items

### Organization Setup

#### New User Flow
1. **Step 1**: Email & password (existing)
2. **Step 2**: Organization name (new)
   - This replaces FreeAgent company name in navbar
   - First user automatically becomes ADMIN
   - Default threshold set to £50

#### Existing User (You)
- Email: lucegary@gmail.com
- Current role: ADMIN → Will be updated to SUPER_ADMIN
- Organization: Already exists and configured correctly

### UI/UX Changes

#### Navigation Bar
- Display organization's `companyName` instead of FreeAgent name
- Source: Organization table, not FreeAgent API

#### Dashboard
- New approval widget for ADMIN/SUPER_ADMIN only
- Shows count, amount, requester for each pending item
- One-click approve with automatic send
- Deny opens modal for optional reason

#### PO Creation Page
- Button changes based on threshold:
  - Under £50: "Create and Send"
  - Over £50 (MANAGER): "Submit for Approval"
  - Any amount (ADMIN): "Create and Send"
- VIEWER sees: "You don't have permission" message

#### PO Detail Page
- Audit trail showing all approval actions
- Timestamp, user, action, and notes
- Disable PDF/Email buttons when PENDING_APPROVAL

#### Settings Page (New)
- Path: `/settings/approvals`
- ADMIN/SUPER_ADMIN only
- Configure approval threshold
- Toggle auto-approve for admin POs

## Implementation Priorities

### Week 1 - Core Functionality
1. Database schema updates (Day 1)
2. Update role system with SUPER_ADMIN (Day 1)
3. Organization setup in signup flow (Day 2)
4. Approval submission logic (Day 3)
5. Approval/denial APIs (Day 4)
6. Email notifications (Day 5)

### Week 2 - UI & Polish
1. Approval dashboard widget (Day 6)
2. Audit trail component (Day 7)
3. Settings page for threshold (Day 8)
4. Testing and bug fixes (Day 9-10)

### Phase 2 - Enhancements (Future)
- Daily digest emails
- Bulk approval/denial
- Vacation delegation
- Category-based thresholds
- Spending analytics by approver

## Key Technical Decisions

### Database
- Add `approvalThreshold` to Organization (default: 50)
- Add `companyName` to Organization for navbar display
- New tables: ApprovalRequest, ApprovalAction
- Audit trail is immutable (never delete records)

### Status Management
```
DRAFT → PENDING_APPROVAL → APPROVED → SENT (automatic)
                         ↘ DENIED → DRAFT (editable)
```

### Permissions Matrix

| Action | SUPER_ADMIN | ADMIN | MANAGER | VIEWER |
|--------|------------|-------|---------|--------|
| Create PO | ✅ Auto | ✅ Auto | ✅ Maybe* | ❌ |
| Edit PO | ✅ | ✅ | ✅ Own | ❌ |
| Delete PO | ✅ | ✅ | ❌ | ❌ |
| Approve PO | ✅ | ✅ | ❌ | ❌ |
| View PO | ✅ | ✅ | ✅ | ✅ |
| Manage Users | ✅ | ✅ | ❌ | ❌ |
| Manage Settings | ✅ | ✅ | ❌ | ❌ |

*Requires approval if ≥ £50

### API Endpoints

```typescript
// Approval submission
POST /api/purchase-orders/submit-for-approval

// Approval actions
POST /api/approvals/[id]/approve
POST /api/approvals/[id]/deny

// Approval queries
GET /api/approvals/pending
GET /api/purchase-orders/[id]/audit-trail

// Settings
GET /api/organization/approval-settings
PUT /api/organization/approval-settings
```

## Migration Notes

1. **Update lucegary@gmail.com to SUPER_ADMIN**:
```sql
UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'lucegary@gmail.com';
```

2. **Set default approval threshold**:
```sql
UPDATE organizations SET approval_threshold = 50, auto_approve_admin = true;
```

3. **Add company name from organization**:
```sql
UPDATE organizations SET company_name = name WHERE company_name IS NULL;
```

## Success Metrics

- **Approval Time**: Target < 4 hours average
- **Auto-approval Rate**: 60-70% (POs under threshold)
- **Denial Rate**: < 10% (indicates good communication)
- **Resubmission Success**: > 90% (denied POs that get approved after edit)

## Edge Cases Handled

1. **Multiple ADMINs**: All see pending, first to act wins
2. **Self-approval**: ADMINs auto-approve own POs
3. **Changed threshold**: Doesn't affect existing pending approvals
4. **Denied POs**: Become DRAFT, fully editable, can resubmit
5. **Email failures**: Log but don't block approval process
6. **Concurrent approvals**: Database transaction prevents double-approval

## What's NOT Included (Future)

- Multi-level approvals (CEO approval above £10k)
- Department-based routing
- Approval delegation during vacation
- Mobile app notifications
- Slack/Teams integration
- Approval by email link
- Partial approvals (approve with reduced amount)