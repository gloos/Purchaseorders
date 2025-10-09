# Supplier Invoice Upload Feature Specification

  ## Overview
  Enable suppliers to upload invoices via a secure, time-limited link sent with their PO email.

  ## Database Schema Changes

  ### PurchaseOrder Model Extensions
  ```prisma
  enum POStatus {
    DRAFT
    PENDING_APPROVAL
    APPROVED
    SENT
    RECEIVED
    INVOICED  // NEW
    CANCELLED
  }

  model PurchaseOrder {
    // ... existing fields

    // Invoice upload fields
    invoiceUploadToken          String?   @unique
    invoiceUploadTokenExpiresAt DateTime?
    invoiceUrl                  String?
    invoiceReceivedAt           DateTime?
  }

  Supabase Storage

  - Bucket name: supplier-invoices
  - Public: NO (private bucket)
  - Path structure: {organizationId}/{poId}-{timestamp}-{filename}
  - Access: Service role only
  - Allowed types: PDF, PNG, JPG
  - Max size: 10MB

  API Endpoints

  1. GET /api/public/po-details

  - Purpose: Validate token and return PO details
  - Query params: token
  - Response: PO number, supplier name, total, currency
  - Errors: 404 (invalid), 410 (expired), 409 (already uploaded)

  2. POST /api/public/invoice-upload

  - Purpose: Handle file upload
  - Content-Type: multipart/form-data
  - Query params: token
  - Body: file field
  - Validation: Token, file size, file type
  - On success: Update PO status to INVOICED, save URL, invalidate token

  Frontend

  New Route: /invoice-upload

  - Public page (no auth required)
  - States: loading, valid, expired, error, success
  - Display: PO details for confirmation
  - File input: drag-drop support
  - Upload progress indicator

  Email Template Updates

  - Add "Upload Invoice" section with CTA button
  - Link format: https://your-app.com/invoice-upload?token={token}
  - Mention 90-day expiry

  Security Requirements

  1. Token must be cryptographically secure (UUID v4)
  2. Token must be hashed in database (optional, can store plain for simplicity)
  3. Single-use tokens (invalidate after successful upload)
  4. Validate expiry on every request
  5. Rate limiting on upload endpoint
  6. File type and size validation
  7. Virus scanning (future consideration)

  Implementation Order

  1. Database migration
  2. Supabase bucket setup
  3. Public API endpoints
  4. Token generation in send-email endpoint
  5. Email template update
  6. Frontend upload page
  7. Internal PO view updates (show invoice status/link)
  8. Testing

  Future Enhancements

  - AI invoice data extraction
  - FreeAgent bill creation
  - Multiple invoices per PO
  - Upload reminders before expiry
  - Duplicate detection