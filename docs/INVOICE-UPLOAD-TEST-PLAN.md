# Invoice Upload Feature - Test Plan

## Overview
Comprehensive manual test plan for the supplier invoice upload feature.

## Test Environment Setup

### Prerequisites
1. Development server running (`npm run dev`)
2. Database with at least one test purchase order
3. Supabase `supplier-invoices` bucket configured
4. Email configured (Resend)
5. Test files:
   - Valid PDF (< 10MB)
   - Valid PNG/JPG (< 10MB)
   - Invalid file type (e.g., .txt, .doc)
   - Oversized file (> 10MB)

---

## Test Cases

### 1. Token Generation & Email Integration

#### Test 1.1: Token Generation on Email Send
**Steps:**
1. Create a new PO with supplier email
2. Click "Send Email" button
3. Check database: `SELECT invoiceUploadToken, invoiceUploadTokenExpiresAt FROM purchase_orders WHERE id = '[PO_ID]'`

**Expected:**
- `invoiceUploadToken` is a valid UUID
- `invoiceUploadTokenExpiresAt` is 90 days from now
- Email is sent successfully

**Status:** ⬜ Pass / ⬜ Fail

---

#### Test 1.2: Token Reuse on Resend
**Steps:**
1. Send a PO email
2. Note the `invoiceUploadToken` value
3. Resend the same PO email
4. Check if token is the same

**Expected:**
- Token remains unchanged
- Expiry date remains unchanged
- Same upload link in both emails

**Status:** ⬜ Pass / ⬜ Fail

---

#### Test 1.3: Email Contains Upload Link
**Steps:**
1. Send a PO email
2. Check the email in your inbox (or check Resend dashboard)
3. Verify "Submit Your Invoice" section exists
4. Click the "Upload Invoice" button

**Expected:**
- Email contains blue "Upload Invoice" button
- Link format: `https://your-app.com/invoice-upload?token={UUID}`
- Message mentions 90-day expiry
- Link opens the upload page

**Status:** ⬜ Pass / ⬜ Fail

---

### 2. Public Token Validation (GET /api/public/po-details)

#### Test 2.1: Valid Token
**Steps:**
1. Get a valid token from database
2. Navigate to: `http://localhost:3000/invoice-upload?token={VALID_TOKEN}`

**Expected:**
- Page loads successfully
- Shows PO details: PO number, supplier name, total amount
- Shows upload form
- No error messages

**Status:** ⬜ Pass / ⬜ Fail

---

#### Test 2.2: Invalid/Missing Token
**Steps:**
1. Navigate to: `http://localhost:3000/invoice-upload` (no token)
2. Navigate to: `http://localhost:3000/invoice-upload?token=invalid-token-123`

**Expected:**
- Shows "Invalid Link" error message
- No PO details displayed
- No upload form visible
- Message advises contacting PO sender

**Status:** ⬜ Pass / ⬜ Fail

---

#### Test 2.3: Expired Token
**Steps:**
1. In database, update a PO: `UPDATE purchase_orders SET invoiceUploadTokenExpiresAt = NOW() - INTERVAL '1 day' WHERE id = '[PO_ID]'`
2. Get the token and visit the upload page

**Expected:**
- Shows "Link Expired" error
- Displays expiry date
- No upload form visible
- Message advises contacting sender

**Status:** ⬜ Pass / ⬜ Fail

---

#### Test 2.4: Already Uploaded
**Steps:**
1. Upload an invoice successfully (complete Test 3.1 first)
2. Try to access the same upload link again

**Expected:**
- Shows "Already Uploaded" message
- Displays upload timestamp
- No upload form visible

**Status:** ⬜ Pass / ⬜ Fail

---

### 3. File Upload Flow (POST /api/public/invoice-upload)

#### Test 3.1: Successful PDF Upload
**Steps:**
1. Get a valid upload link
2. Select a valid PDF file (< 10MB)
3. Click "Upload Invoice"

**Expected:**
- Upload progress indicator appears
- Success message: "Invoice Uploaded Successfully!"
- Shows thank you message with PO number
- Database updated:
  - `status` = 'INVOICED'
  - `invoiceUrl` contains file path
  - `invoiceReceivedAt` has current timestamp
  - `invoiceUploadToken` is NULL
  - `invoiceUploadTokenExpiresAt` is NULL
- File exists in Supabase `supplier-invoices` bucket

**Status:** ⬜ Pass / ⬜ Fail

---

#### Test 3.2: Successful PNG Upload
**Steps:**
1. Get a new valid upload link
2. Select a valid PNG file (< 10MB)
3. Click "Upload Invoice"

**Expected:**
- Same as Test 3.1
- File uploaded as PNG

**Status:** ⬜ Pass / ⬜ Fail

---

#### Test 3.3: Successful JPG Upload
**Steps:**
1. Get a new valid upload link
2. Select a valid JPG file (< 10MB)
3. Click "Upload Invoice"

**Expected:**
- Same as Test 3.1
- File uploaded as JPG

**Status:** ⬜ Pass / ⬜ Fail

---

#### Test 3.4: Invalid File Type
**Steps:**
1. Get a valid upload link
2. Try to upload a .txt or .doc file

**Expected:**
- Error message: "Invalid file type. Please upload a PDF, PNG, or JPG file."
- No upload occurs
- Can select a different file

**Status:** ⬜ Pass / ⬜ Fail

---

#### Test 3.5: File Too Large
**Steps:**
1. Get a valid upload link
2. Try to upload a file > 10MB

**Expected:**
- Error message: "File is too large. Maximum size is 10MB."
- No upload occurs
- Can select a different file

**Status:** ⬜ Pass / ⬜ Fail

---

#### Test 3.6: No File Selected
**Steps:**
1. Get a valid upload link
2. Click "Upload Invoice" without selecting a file

**Expected:**
- Button is disabled (grayed out)
- Cannot click upload

**Status:** ⬜ Pass / ⬜ Fail

---

#### Test 3.7: Drag and Drop Upload
**Steps:**
1. Get a valid upload link
2. Drag a valid PDF file onto the upload area
3. Click "Upload Invoice"

**Expected:**
- File is recognized
- Shows file name and size
- Upload succeeds
- Same results as Test 3.1

**Status:** ⬜ Pass / ⬜ Fail

---

#### Test 3.8: Special Characters in Filename
**Steps:**
1. Get a valid upload link
2. Upload a file named: `invoice #123 (final).pdf`

**Expected:**
- Upload succeeds
- Filename is sanitized in storage (special chars replaced with `_`)
- File is accessible

**Status:** ⬜ Pass / ⬜ Fail

---

### 4. Internal Dashboard Updates

#### Test 4.1: Invoice Status - Pending
**Steps:**
1. Create and send a PO (token generated)
2. Navigate to PO detail page
3. Check the Invoice section in the sidebar

**Expected:**
- Shows "Pending Upload" status with yellow icon
- Message: "Supplier has been sent a secure link..."
- Shows expiry date
- No download button

**Status:** ⬜ Pass / ⬜ Fail

---

#### Test 4.2: Invoice Status - Uploaded
**Steps:**
1. Upload an invoice for a PO (complete Test 3.1)
2. Navigate to PO detail page
3. Check the Invoice section in the sidebar

**Expected:**
- Shows "Invoice Uploaded" status with green checkmark
- Shows received timestamp
- "Download Invoice" button is visible
- PO status badge shows "Invoiced" (teal)

**Status:** ⬜ Pass / ⬜ Fail

---

#### Test 4.3: Download Invoice from Dashboard
**Steps:**
1. Navigate to a PO with uploaded invoice
2. Click "Download Invoice" button

**Expected:**
- File downloads successfully
- Filename: `Invoice-{PO_NUMBER}.{ext}`
- File opens correctly (PDF/PNG/JPG)
- File content matches uploaded file

**Status:** ⬜ Pass / ⬜ Fail

---

#### Test 4.4: Invoice Status in PO List
**Steps:**
1. Navigate to Purchase Orders list page
2. Find POs with invoices uploaded

**Expected:**
- Status badge shows "Invoiced" (teal color)
- Can filter by "Invoiced" status

**Status:** ⬜ Pass / ⬜ Fail

---

### 5. Security & Edge Cases

#### Test 5.1: Token Invalidation After Upload
**Steps:**
1. Upload an invoice successfully
2. Try to access the same upload link again

**Expected:**
- Shows "Already Uploaded" error
- Cannot upload another file
- Token is NULL in database

**Status:** ⬜ Pass / ⬜ Fail

---

#### Test 5.2: Concurrent Upload Attempts
**Steps:**
1. Open the same upload link in two browser tabs
2. Upload a file in first tab
3. Try to upload in second tab

**Expected:**
- First upload succeeds
- Second upload shows "Already Uploaded" error

**Status:** ⬜ Pass / ⬜ Fail

---

#### Test 5.3: Organization Isolation
**Steps:**
1. User from Org A uploads invoice
2. User from Org B tries to download that invoice via API

**Expected:**
- Org B cannot access Org A's invoice
- Returns 404 or 403 error

**Status:** ⬜ Pass / ⬜ Fail

---

#### Test 5.4: Unauthenticated Download Attempt
**Steps:**
1. Log out
2. Try to access: `http://localhost:3000/api/purchase-orders/{ID}/invoice`

**Expected:**
- Returns 401 Unauthorized
- No file downloaded

**Status:** ⬜ Pass / ⬜ Fail

---

#### Test 5.5: Upload Link Expiry Boundary
**Steps:**
1. Set expiry to 1 minute from now: `UPDATE purchase_orders SET invoiceUploadTokenExpiresAt = NOW() + INTERVAL '1 minute'`
2. Access upload page before expiry
3. Wait for expiry
4. Refresh page

**Expected:**
- Before: Upload form works
- After: Shows expired error

**Status:** ⬜ Pass / ⬜ Fail

---

### 6. Database Integrity

#### Test 6.1: Schema Fields
**Steps:**
1. Run: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name LIKE 'invoice%'`

**Expected:**
- `invoiceUploadToken` (TEXT, nullable, unique)
- `invoiceUploadTokenExpiresAt` (TIMESTAMP, nullable)
- `invoiceUrl` (TEXT, nullable)
- `invoiceReceivedAt` (TIMESTAMP, nullable)
- POStatus enum includes 'INVOICED'

**Status:** ⬜ Pass / ⬜ Fail

---

#### Test 6.2: Supabase Storage
**Steps:**
1. Check Supabase dashboard → Storage → supplier-invoices
2. Verify RLS policies

**Expected:**
- Bucket exists and is private (not public)
- Files organized by: `{orgId}/{poId}-{timestamp}-{filename}`
- RLS policy allows service_role access

**Status:** ⬜ Pass / ⬜ Fail

---

## Test Summary

**Total Tests:** 28
**Passed:** ___
**Failed:** ___
**Completion:** ___%

## Issues Found

| Test # | Issue Description | Severity | Status |
|--------|------------------|----------|--------|
|        |                  |          |        |

## Notes

- Test Date: __________
- Tester: __________
- Environment: Development / Staging / Production
- Additional Observations:

---

## Automated Test Files

For future automated testing, see:
- `__tests__/api/public/po-details.test.ts` - Token validation tests
- `__tests__/api/public/invoice-upload.test.ts` - Upload flow tests

**Note:** Automated tests require Jest environment fixes for Next.js Edge Runtime APIs.
