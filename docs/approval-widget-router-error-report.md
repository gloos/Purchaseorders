# ApprovalWidget Router Mounting Error - Investigation Report

## ✅ RESOLVED

**Root Cause:** Prisma Decimal.toFixed() during render conflicts with App Router mounting
**Solution:** Serialize Decimals to strings in API response
**Resolution Date:** 2025-01-09
**Commits:** `868a023`, `0968118`

---

## Executive Summary

The ApprovalWidget component was causing a consistent `"invariant expected app router to be mounted"` error in production (Next.js 14.2.33) when displaying approval data. The error occurred specifically when the widget rendered pending approval items, but NOT when the widget was empty.

## Project Context

**PO Tool** is a multi-tenant SaaS purchase order management system built with:
- Next.js 14.2.33 (App Router)
- Supabase Authentication
- PostgreSQL + Prisma ORM
- TypeScript with strict mode

The ApprovalWidget displays pending purchase order approval requests on the dashboard for ADMIN and SUPER_ADMIN users.

## The Issue

### Symptoms
When a user with ADMIN or SUPER_ADMIN privileges logs in and has pending approvals assigned to them, the dashboard loads briefly (~1-2 seconds) then crashes with:

```
Error: invariant expected app router to be mounted
    at fd9d1056-e32e54574dc7745e.js:1:40343
```

### Critical Discovery
**The error ONLY occurs when the ApprovalWidget has approval data to render.**

Testing revealed:
- ✅ Widget with **NO approvals assigned** → Dashboard loads successfully, no error
- ❌ Widget with **1+ approvals assigned** → Dashboard crashes with router error

This suggests the issue is related to **rendering the approval list items** specifically, not the component mounting itself.

## Component Architecture

### Current Implementation
```typescript
// Dashboard: /app/(dashboard)/dashboard/page.tsx
const ApprovalWidget = dynamic(
  () => import('@/components/approval-widget').then(mod => mod.ApprovalWidget),
  { ssr: false }
)

// Conditionally rendered based on user role
{!userRoleLoading && (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
  <div className="mb-8">
    <ApprovalWidget />
  </div>
)}
```

### Data Flow
1. Dashboard mounts, fetches user role via `/api/me`
2. When role is confirmed ADMIN/SUPER_ADMIN, ApprovalWidget conditionally renders
3. ApprovalWidget fetches data from `/api/approvals/pending`
4. **If data exists**, widget maps over approvals and renders list items
5. **Router error occurs during this rendering**

## Attempted Solutions

All attempts failed to resolve the error:

### 1. **Timing/Loading Strategies**
- ❌ Added `userRoleLoading` state to delay widget mount
- ❌ Added 100ms timeout before fetching approval data
- ❌ Used `React.lazy()` with Suspense
- ❌ Used `next/dynamic` with `ssr: false`
- ❌ CSS hiding instead of conditional mounting

### 2. **Router/Navigation Changes**
- ❌ Removed `router.refresh()` from signin page
- ❌ Disabled Link prefetching with `prefetch={false}`
- ❌ Replaced `next/link` with `<button>` + `router.push()`
- ❌ Replaced `next/link` with plain `<a>` tags
- ❌ Removed ALL router usage from component

### 3. **Component Structure**
- ❌ Removed all console.log debug statements
- ❌ Simplified component to minimal state
- ❌ Removed useRouter hook entirely

### 4. **Confirmation Tests**
- ✅ Completely removing ApprovalWidget → Dashboard works perfectly
- ✅ ApprovalWidget with NO approval data → Works fine
- ❌ ApprovalWidget with approval data → Crashes

## Technical Details

### Approval Data Structure
```typescript
interface ApprovalRequest {
  id: string
  status: string
  amount: number
  createdAt: string
  purchaseOrder: {
    id: string
    poNumber: string
    title: string
    totalAmount: number
    currency: string
    supplierName: string
    // ...
  }
  requester: {
    id: string
    name: string | null
    email: string
  }
}
```

### Rendering Logic (Problematic Section)
```typescript
{approvals.map((approval) => (
  <div key={approval.id} className="border rounded-lg p-4">
    <a href={`/purchase-orders/${approval.purchaseOrder.id}`}>
      PO #{approval.purchaseOrder.poNumber}
    </a>
    <p>{approval.purchaseOrder.title}</p>
    <p>{approval.purchaseOrder.currency} {approval.purchaseOrder.totalAmount.toFixed(2)}</p>
    // ... more rendering
  </div>
))}
```

**This section only renders when `approvals.length > 0`, which is exactly when the crash occurs.**

### Environment
- Development: Works correctly (using `npm run dev`)
- Production: Consistent error (Vercel deployment)
- Browser: Chrome (error also appears in other browsers)
- Next.js: 14.2.33
- React: 18

## Hypotheses

### Most Likely
1. **Data-driven rendering issue**: Something about the approval data structure causes excessive re-renders or DOM updates that conflict with router state
2. **Hydration mismatch**: The dynamic data rendering creates a mismatch between server and client that corrupts router context
3. **Next.js App Router bug**: This specific combination of dynamic imports, conditional rendering, and list rendering triggers an App Router bug

### Less Likely
4. **Memory/performance**: Rendering approval items exhausts some resource during router transition
5. **Authentication state**: Something about the authenticated user's data structure conflicts with router

## Recommended Next Steps

### Immediate (High Priority)
1. **Add error boundary** around ApprovalWidget to gracefully catch the error
2. **Inspect approval data**: Log the exact data structure that causes the crash
3. **Test with mock data**: Create a static approval object to see if specific data values trigger it
4. **Try without map()**: Render a single hardcoded approval item to isolate if it's the mapping or the item rendering

### Medium Term
5. **Upgrade Next.js**: Test with Next.js 15.x to see if it's a known bug
6. **Separate approvals page**: Move approvals to `/approvals` route instead of dashboard widget
7. **File Next.js issue**: If bug is confirmed, create minimal reproduction and file with Next.js team

### Alternative Approaches
8. **Server-side widget**: Convert ApprovalWidget to a Server Component (requires restructuring)
9. **Iframe isolation**: Load approvals in an isolated iframe (heavy-handed but would work)
10. **Polling instead of mounting**: Load approvals on a separate interval after page is stable

## Files Affected

- `/app/(dashboard)/dashboard/page.tsx` - Dashboard with widget
- `/components/approval-widget.tsx` - The problematic component
- `/app/api/approvals/pending/route.ts` - API endpoint returning approval data
- `/lib/supabase/middleware.ts` - Authentication middleware

## Contact for Questions

Repository: https://github.com/gloos/Purchaseorders
Latest commit with issue: `68a2c02`

## Key Takeaway

**The error is specifically triggered by rendering approval list items with real data.** Any solution must address why mapping over and rendering approval objects causes a router mounting conflict in Next.js App Router.

---

## ✅ RESOLUTION

### Root Cause Identified

Through systematic testing, the issue was isolated to **Prisma Decimal.toFixed() conversion during component render**:

1. ✅ Empty widget works
2. ✅ Minimal rendering (just IDs) works
3. ✅ Nested object access works
4. ✅ String fields work
5. ❌ **Decimal.toFixed() causes router error** ← THE CULPRIT

**Why it failed:**
- Prisma returns `Decimal` types as special objects from the `decimal.js` library
- Not native JavaScript numbers
- Calling `.toFixed()` on Decimal objects during render performs synchronous conversion
- This conversion conflicts with Next.js App Router initialization
- Result: "invariant expected app router to be mounted" error

### Solution Implemented

**Serialize Decimals to strings in the API response:**

```typescript
// API: /app/api/approvals/pending/route.ts
const serializedApprovals = pendingApprovals.map(approval => ({
  ...approval,
  amount: approval.amount.toString(),
  purchaseOrder: {
    ...approval.purchaseOrder,
    subtotalAmount: approval.purchaseOrder.subtotalAmount.toString(),
    totalAmount: approval.purchaseOrder.totalAmount.toString(),
  },
}))
```

**Frontend receives plain strings:**

```typescript
// Component: /components/approval-widget.tsx
interface ApprovalRequest {
  amount: string // Changed from number
  purchaseOrder: {
    totalAmount: string // Changed from number
    // ...
  }
}

// Render with native JavaScript
{parseFloat(approval.purchaseOrder.totalAmount).toFixed(2)}
```

### Benefits of This Solution

1. **No Decimal library operations during render** - Frontend uses native `parseFloat().toFixed()`
2. **Type-safe** - TypeScript interface updated to reflect string types
3. **Performance** - No synchronous Decimal conversion blocking render
4. **Maintainable** - Clear separation of concerns (API handles conversion)
5. **Scalable** - Same pattern can be applied to other Decimal fields

### Testing Results

After implementing the fix:
- ✅ Widget loads without router error
- ✅ Displays all PO details correctly
- ✅ Currency amounts format properly (e.g., "GBP 106.80")
- ✅ Approve/Deny buttons work
- ✅ Link navigation works
- ✅ Date formatting works (not related to issue, but confirmed safe)

### Lessons Learned

1. **Prisma Decimal types require serialization** for client-side rendering
2. **Systematic testing is essential** - Removing elements one by one isolated the issue
3. **Not all .toFixed() calls are equal** - Decimal.toFixed() ≠ Number.toFixed()
4. **API serialization is preferable** to client-side type conversion for complex types

### Prevention for Future

**For all API endpoints returning Prisma data with Decimal or DateTime types:**

```typescript
// Always serialize before sending to client
return NextResponse.json({
  data: results.map(item => ({
    ...item,
    decimalField: item.decimalField.toString(),
    dateField: item.dateField.toISOString(),
  }))
})
```

This pattern prevents similar issues across the application.
