# FreeAgent Bill Creation - Implementation Tasks

## Prerequisites Checklist
- [ ] Verify FreeAgent API credentials are working
- [ ] Confirm Manager/Admin role permissions in RBAC
- [ ] Review current FreeAgent sync implementation

## Phase 1: Database & Models (Priority: HIGH)

### Task 1.1: Database Schema Updates
```bash
npx prisma migrate dev --name add-freeagent-bill-fields
```
- [ ] Add `freeAgentBillId`, `freeAgentBillUrl`, `freeAgentBillCreatedAt` to PurchaseOrder
- [ ] Add `paymentTermsDays` with default 30 to PurchaseOrder
- [ ] Add `defaultPaymentTermsDays` and `defaultExpenseCategoryUrl` to Organization
- [ ] Create new `ExpenseCategoryMapping` model
- [ ] Run migration and generate Prisma client

### Task 1.2: Update Validations
- [ ] Update `/lib/validations.ts` with new bill-related fields
- [ ] Add Zod schemas for bill creation request/response

## Phase 2: FreeAgent Client Enhancement (Priority: HIGH)

### Task 2.1: Extend FreeAgent Client
Location: `/lib/freeagent/client.ts`
- [ ] Add `getCategories()` method to fetch expense categories
- [ ] Add `createBill(billData)` method for bill creation
- [ ] Add `getBill(billUrl)` method to fetch single bill
- [ ] Add `findContactByEmail(email)` helper method
- [ ] Add proper TypeScript interfaces for Bill and Category

### Task 2.2: Create Bill Service Layer
New file: `/lib/freeagent/bill-service.ts`
- [ ] Create `matchOrCreateContact()` function
- [ ] Create `suggestCategoryForItem()` function
- [ ] Create `transformPOToBill()` data transformer
- [ ] Add retry logic with exponential backoff
- [ ] Implement idempotency checks

## Phase 3: API Endpoints (Priority: HIGH)

### Task 3.1: Category Management APIs
- [ ] Create `GET /api/freeagent/categories/route.ts`
  - Fetch and cache categories from FreeAgent
  - Return formatted for frontend consumption
- [ ] Create `POST /api/expense-mappings/route.ts`
  - Save user's category mapping preferences
- [ ] Create `GET /api/expense-mappings/route.ts`
  - Retrieve saved mappings for organization

### Task 3.2: Bill Creation API
- [ ] Create `POST /api/purchase-orders/[id]/create-bill/route.ts`
  - Validate PO status is INVOICED
  - Check user has MANAGER or ADMIN role
  - Transform PO data to bill format
  - Handle contact creation if needed
  - Create bill in FreeAgent
  - Update PO with bill reference
  - Return success with bill URL

### Task 3.3: Bill Status API
- [ ] Create `GET /api/purchase-orders/[id]/bill-status/route.ts`
  - Check if bill exists in FreeAgent
  - Return current bill status
  - Handle sync discrepancies

## Phase 4: Frontend Components (Priority: MEDIUM)

### Task 4.1: Create Bill Creation Modal
New file: `/components/create-bill-modal.tsx`
- [ ] Step 1: Contact verification/creation component
- [ ] Step 2: Payment details form (due date calculator)
- [ ] Step 3: Category mapping interface
- [ ] Step 4: Review and confirm screen
- [ ] Loading and error states
- [ ] Success confirmation with FreeAgent link

### Task 4.2: Category Selector Component
New file: `/components/category-selector.tsx`
- [ ] Searchable dropdown with categories
- [ ] Group by category type (Admin, Cost of Sales, etc.)
- [ ] Remember recent selections
- [ ] Keyboard navigation support

### Task 4.3: Update PO Detail Page
Location: `/app/(dashboard)/purchase-orders/[id]/page.tsx`
- [ ] Add "Create FreeAgent Bill" button (conditional)
- [ ] Show bill status badge if bill exists
- [ ] Add "View in FreeAgent" link when billed
- [ ] Handle loading and error states
- [ ] Add permission checks for Manager/Admin

### Task 4.4: Update Dashboard
Location: `/app/(dashboard)/dashboard/page.tsx`
- [ ] Add bill creation quick action to recent invoiced POs
- [ ] Show bill status in activity feed
- [ ] Add success toast notifications

## Phase 5: Integration & Testing (Priority: MEDIUM)

### Task 5.1: Error Handling & Logging
- [ ] Add Sentry error tracking for bill creation
- [ ] Implement comprehensive error messages
- [ ] Add audit logging for financial operations
- [ ] Create error recovery mechanisms

### Task 5.2: Testing
- [ ] Unit tests for bill transformation logic
- [ ] Unit tests for category matching
- [ ] Unit tests for contact matching
- [ ] Integration tests for API endpoints
- [ ] Mock FreeAgent API responses for testing

### Task 5.3: Performance Optimization
- [ ] Implement Redis caching for categories
- [ ] Add database indexes for new fields
- [ ] Optimize API response times
- [ ] Add request debouncing on frontend

## Phase 6: Documentation & UI Polish (Priority: LOW)

### Task 6.1: User Documentation
- [ ] Add help tooltips in UI
- [ ] Create user guide for bill creation
- [ ] Document category mapping best practices
- [ ] Add FAQ section for common issues

### Task 6.2: UI Enhancements
- [ ] Add keyboard shortcuts
- [ ] Implement bulk selection (future)
- [ ] Add progress indicators
- [ ] Create success animations

## Implementation Order (Recommended)

### Week 1 Sprint
1. Database schema updates (Task 1.1-1.2)
2. Extend FreeAgent client (Task 2.1-2.2)
3. Create core APIs (Task 3.1-3.2)

### Week 2 Sprint
4. Build frontend components (Task 4.1-4.2)
5. Integrate with PO pages (Task 4.3-4.4)
6. Add error handling (Task 5.1)

### Week 3 Sprint
7. Write tests (Task 5.2)
8. Performance optimization (Task 5.3)
9. Documentation and polish (Task 6.1-6.2)

## Code Snippets for Quick Start

### FreeAgent Bill Creation Request Example
```typescript
const billData = {
  bill: {
    contact: `https://api.freeagent.com/v2/contacts/${contactId}`,
    reference: po.poNumber,
    dated_on: po.invoiceReceivedAt || new Date().toISOString().split('T')[0],
    due_on: calculateDueDate(po.invoiceReceivedAt, po.paymentTermsDays),
    bill_items: po.lineItems.map(item => ({
      description: item.description,
      total_value: item.totalPrice.toString(),
      sales_tax_rate: po.taxRate.toString(),
      category: categoryMapping[item.id] || defaultCategory
    }))
  }
};
```

### Permission Check Helper
```typescript
const canCreateBill = (user: User, po: PurchaseOrder) => {
  return (
    (user.role === 'MANAGER' || user.role === 'ADMIN') &&
    po.status === 'INVOICED' &&
    !po.freeAgentBillId &&
    po.organizationId === user.organizationId
  );
};
```

## Testing Checklist

### Manual Testing Scenarios
- [ ] Create bill for PO with single line item
- [ ] Create bill for PO with multiple line items
- [ ] Handle missing supplier in FreeAgent
- [ ] Handle expired FreeAgent token
- [ ] Test with different tax rates
- [ ] Test duplicate bill prevention
- [ ] Test permission restrictions
- [ ] Test error recovery flows

## Rollback Plan
If issues arise:
1. Remove bill creation buttons from UI
2. Disable bill creation API endpoint
3. Keep database fields (non-destructive)
4. Document issues for resolution
5. Communicate with affected users

## Success Criteria
- [ ] Bills created successfully in FreeAgent
- [ ] No duplicate bills created
- [ ] Proper error handling and user feedback
- [ ] Performance under 3 seconds for creation
- [ ] All tests passing
- [ ] Documentation complete