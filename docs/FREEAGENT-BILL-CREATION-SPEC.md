# FreeAgent Bill Creation Feature Specification

## Overview
Enable Managers and Admins to convert uploaded invoices (POs with status "INVOICED") into FreeAgent bills with a single click, streamlining the accounts payable workflow.

## Feature Requirements

### User Access
- **Roles**: MANAGER and ADMIN only
- **Prerequisite**: PO must have status "INVOICED" (invoice already uploaded)
- **FreeAgent Auth**: Organization must have active FreeAgent connection

### Entry Points
1. **PO Detail Page**: Primary "Create FreeAgent Bill" button
2. **Dashboard Recent Activity**: Quick action button for invoiced POs
3. **PO List Page**: Bulk action option (future enhancement)

## Data Requirements Analysis

### Currently Available in PO
✅ Supplier name, email, phone, address
✅ PO reference number (poNumber)
✅ Line items with descriptions, quantities, unit prices
✅ Tax rate and tax amount
✅ Total amount and currency
✅ Invoice file URL
✅ Invoice received date

### Required for FreeAgent Bill

#### Critical Missing Data
1. **FreeAgent Contact URL**
   - Need to match supplier to FreeAgent contact
   - May need to create contact if not exists

2. **Expense Categories**
   - Each line item needs a FreeAgent category URL
   - Categories are company-specific

3. **Payment Due Date**
   - Not stored in PO model
   - Critical for accounts payable

4. **FreeAgent Bill ID**
   - Need to store after creation to prevent duplicates

## Database Schema Updates

```prisma
model PurchaseOrder {
  // ... existing fields

  // FreeAgent Bill Integration
  freeAgentBillId       String?   @unique
  freeAgentBillUrl      String?
  freeAgentBillCreatedAt DateTime?
  paymentTermsDays      Int?      @default(30) // New: payment terms

  // Consider adding:
  freeAgentContactId    String?   // Cache the matched contact
}

model Organization {
  // ... existing fields

  // Default settings for bill creation
  defaultPaymentTermsDays     Int?      @default(30)
  defaultExpenseCategoryUrl   String?   // Default category for unmapped items
}

// New model for category mapping
model ExpenseCategoryMapping {
  id                    String   @id @default(uuid())
  organizationId        String
  organization          Organization @relation(fields: [organizationId], references: [id])
  keyword              String    // e.g., "software", "hardware", "services"
  freeAgentCategoryUrl String
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@unique([organizationId, keyword])
  @@map("expense_category_mappings")
}
```

## User Workflow

### Happy Path
1. User views PO with status "INVOICED"
2. Clicks "Create FreeAgent Bill" button
3. System shows confirmation dialog with:
   - Mapped supplier contact (or option to create)
   - Calculated due date (editable)
   - Line items with suggested categories (editable)
4. User confirms/adjusts mappings
5. System creates bill in FreeAgent
6. Success message with link to FreeAgent bill
7. PO updated with bill reference

### Edge Cases & Error Handling

#### Supplier Not in FreeAgent
- **Detection**: No matching contact by name/email
- **Solution**: Offer to create contact automatically or select manually
- **UX**: Modal with contact creation form pre-filled

#### Missing Expense Categories
- **Detection**: Cannot auto-map line items to categories
- **Solution**: Show category selector with search
- **UX**: Remember selections for future mappings

#### Duplicate Bill Prevention
- **Detection**: Check freeAgentBillId before creation
- **Solution**: Show error with link to existing bill
- **UX**: Option to view in FreeAgent or unlink and recreate

#### FreeAgent API Errors
- **Rate Limiting**: Queue and retry with exponential backoff
- **Auth Expired**: Prompt to reconnect FreeAgent
- **Validation Errors**: Show specific field errors
- **Network Errors**: Retry with user confirmation

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
1. **Database Migration**
   - Add bill tracking fields to PurchaseOrder
   - Create ExpenseCategoryMapping table
   - Add organization default settings

2. **FreeAgent Client Extension**
   ```typescript
   // Add to lib/freeagent/client.ts
   - getBills()
   - createBill()
   - getCategories()
   - createContactIfNotExists()
   ```

3. **Category Management API**
   - GET /api/freeagent/categories - Fetch and cache
   - POST /api/expense-mappings - Save category mappings
   - GET /api/expense-mappings - Retrieve saved mappings

### Phase 2: Core Functionality (Week 1-2)
4. **Bill Creation API**
   - POST /api/purchase-orders/[id]/create-bill
   - Validation and data transformation
   - Idempotency checks
   - Error handling and retry logic

5. **Contact Matching Service**
   - Smart matching algorithm (name, email, VAT number)
   - Contact creation flow
   - Caching for performance

6. **Category Suggestion Engine**
   - Keyword-based matching
   - Learning from user selections
   - Fallback to default category

### Phase 3: User Interface (Week 2)
7. **PO Detail Page Integration**
   - Bill creation button (conditional rendering)
   - Bill status indicator
   - Link to FreeAgent bill

8. **Bill Creation Modal**
   - Multi-step wizard:
     - Step 1: Supplier confirmation
     - Step 2: Payment details
     - Step 3: Category mapping
     - Step 4: Review & confirm
   - Loading states and progress indication
   - Error recovery options

9. **Dashboard Integration**
   - Quick action in recent activity
   - Bill creation success notifications
   - Status badges for billed POs

### Phase 4: Polish & Enhancement (Week 3)
10. **Bulk Operations**
    - Select multiple invoiced POs
    - Batch bill creation
    - Progress tracking

11. **Audit Trail**
    - Log bill creation attempts
    - Track user actions
    - FreeAgent sync status

12. **Advanced Features**
    - Auto-create bills on invoice upload (opt-in)
    - Bill approval workflow
    - Payment status sync from FreeAgent

## Technical Considerations

### Performance
- Cache FreeAgent categories (TTL: 24 hours)
- Batch API calls where possible
- Implement optimistic UI updates
- Queue long-running operations

### Security
- Verify user permissions before bill creation
- Validate FreeAgent token freshness
- Sanitize data before API calls
- Log all financial operations

### Reliability
- Implement idempotency for bill creation
- Transaction rollback on partial failure
- Comprehensive error logging
- Manual retry mechanisms

## Testing Requirements

### Unit Tests
- Bill data transformation logic
- Category matching algorithm
- Contact matching logic
- Permission checks

### Integration Tests
- FreeAgent API mock responses
- Error scenario handling
- Database transaction integrity
- Rate limit handling

### E2E Tests
- Complete bill creation flow
- Error recovery flows
- Permission-based access
- UI state management

## Success Metrics
- Time saved per bill creation (target: 80% reduction)
- Error rate < 1%
- User adoption rate > 70% of eligible POs
- Category mapping accuracy > 90%

## Future Enhancements
1. **Two-way Sync**: Update PO when bill is paid in FreeAgent
2. **Smart Categorization**: ML-based category suggestions
3. **Approval Workflow**: Multi-step approval for high-value bills
4. **Mobile Support**: Create bills from mobile app
5. **Bulk Import**: Historical invoice conversion
6. **Reporting**: Bill creation analytics and insights

## Migration Strategy
1. Beta rollout to select organizations
2. Gradual feature flag enablement
3. Training materials and tooltips
4. Feedback collection and iteration
5. Full rollout with documentation

## Risk Mitigation
- **Data Loss**: All operations are additive, no destructive updates
- **Duplicate Bills**: Unique constraints and existence checks
- **API Limits**: Rate limiting and queuing system
- **User Errors**: Confirmation dialogs and undo capabilities

## Dependencies
- FreeAgent API access and permissions
- Stable internet connection
- Active FreeAgent subscription
- Proper OAuth token management