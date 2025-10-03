# API Documentation

## Authentication

All API routes require authentication via Supabase session cookies except for public routes.

**Auth Flow**:
1. Request includes session cookie
2. `getUserAndOrgOrThrow()` validates user & organization
3. Returns `{ userId, organizationId }`
4. Query data scoped to organization

## Organizations

### POST /api/organizations
Create a new organization and assign current user to it.

**Request Body**:
```json
{
  "name": "Acme Inc",
  "slug": "acme-inc"
}
```

**Validations**:
- `name`: Required, string
- `slug`: Required, string, pattern: `/^[a-z0-9-]{3,50}$/`
- `slug`: Must be unique

**Response** (201):
```json
{
  "id": "uuid",
  "name": "Acme Inc",
  "slug": "acme-inc",
  "createdAt": "2025-10-03T...",
  "updatedAt": "2025-10-03T..."
}
```

**Errors**:
- 400: Name/slug missing or invalid format
- 400: Slug already exists
- 401: Unauthorized

---

### GET /api/organization/profile
Get current user's organization profile.

**Response** (200):
```json
{
  "id": "uuid",
  "name": "Acme Inc",
  "companyRegistrationNumber": "12345678",
  "vatNumber": "GB123456789",
  "addressLine1": "123 Main St",
  "addressLine2": "Suite 100",
  "city": "London",
  "region": "Greater London",
  "postcode": "SW1A 1AA",
  "country": "United Kingdom",
  "phone": "+44 20 1234 5678",
  "email": "info@acme.com",
  "website": "https://acme.com",
  "logoUrl": "https://...supabase.co/.../logo.png",
  "companySyncedAt": "2025-10-03T..."
}
```

**Errors**:
- 401: Unauthorized
- 404: Organization not found

---

### PATCH /api/organization/profile
Update organization profile.

**Request Body**:
```json
{
  "name": "Acme Corporation",
  "companyRegistrationNumber": "12345678",
  "vatNumber": "GB123456789",
  "addressLine1": "123 Main St",
  "city": "London",
  "postcode": "SW1A 1AA",
  "country": "United Kingdom",
  "phone": "+44 20 1234 5678",
  "email": "info@acme.com",
  "website": "https://acme.com",
  "logoUrl": "https://example.com/logo.png"
}
```

**Response** (200): Same as GET

**Errors**:
- 401: Unauthorized
- 404: Organization not found

---

### POST /api/organization/upload-logo
Upload company logo to Supabase Storage.

**Request**: `multipart/form-data`
- `file`: Image file (PNG, JPG, SVG, WebP)

**Validations**:
- Max size: 5MB
- Allowed types: image/png, image/jpeg, image/jpg, image/svg+xml, image/webp

**Response** (200):
```json
{
  "success": true,
  "logoUrl": "https://...supabase.co/.../orgId-timestamp.png"
}
```

**Errors**:
- 400: No file provided
- 400: Invalid file type
- 400: File too large
- 401: Unauthorized
- 404: Organization not found
- 500: Upload failed

---

## Purchase Orders

### GET /api/purchase-orders
List all purchase orders for current organization.

**Query Parameters**:
- `status`: Filter by status (optional)
- `search`: Search by PO number or supplier (optional)
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)

**Response** (200):
```json
[
  {
    "id": "uuid",
    "poNumber": "PO-001",
    "title": "Office Supplies Order",
    "description": "Monthly office supplies",
    "status": "SENT",
    "totalAmount": "1250.50",
    "currency": "GBP",
    "orderDate": "2025-10-01T...",
    "deliveryDate": "2025-10-15T...",
    "supplierName": "Office Depot",
    "supplierEmail": "orders@officedepot.com",
    "createdAt": "2025-10-01T...",
    "lineItems": [
      {
        "description": "Printer Paper A4",
        "quantity": 10,
        "unitPrice": "25.00",
        "totalPrice": "250.00"
      }
    ],
    "createdBy": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@acme.com"
    }
  }
]
```

**Errors**:
- 401: Unauthorized
- 404: Organization not found

---

### POST /api/purchase-orders
Create a new purchase order.

**Request Body**:
```json
{
  "title": "Office Supplies Order",
  "description": "Monthly supplies",
  "supplierName": "Office Depot",
  "supplierEmail": "orders@officedepot.com",
  "supplierPhone": "+44 20 1234 5678",
  "supplierAddress": "123 Supply St, London",
  "orderDate": "2025-10-01",
  "deliveryDate": "2025-10-15",
  "currency": "GBP",
  "notes": "Urgent delivery required",
  "lineItems": [
    {
      "description": "Printer Paper A4",
      "quantity": 10,
      "unitPrice": 25.00,
      "notes": "White, 80gsm"
    }
  ]
}
```

**Validations**:
- `title`: Required
- `supplierName`: Required
- `lineItems`: Required, non-empty array
- `lineItems[].quantity`: Required, > 0
- `lineItems[].unitPrice`: Required, >= 0

**Response** (201): Same as GET single PO

**Errors**:
- 400: Validation failed
- 401: Unauthorized
- 404: Organization not found

---

### GET /api/purchase-orders/[id]
Get a single purchase order by ID.

**Response** (200): Same structure as list item

**Errors**:
- 401: Unauthorized
- 404: PO not found or doesn't belong to organization

---

### PATCH /api/purchase-orders/[id]
Update a purchase order (atomic transaction).

**Request Body**: Same as POST (partial updates supported)

**Response** (200): Updated PO

**Notes**:
- Line items are replaced entirely (not merged)
- Wrapped in transaction for atomicity
- Total amount recalculated from line items

**Errors**:
- 401: Unauthorized
- 404: PO not found
- 500: Transaction failed

---

### DELETE /api/purchase-orders/[id]
Delete a purchase order.

**Response** (200):
```json
{
  "success": true
}
```

**Notes**:
- Cascade deletes line items
- Soft delete not implemented

**Errors**:
- 401: Unauthorized
- 404: PO not found

---

### GET /api/purchase-orders/[id]/pdf
Generate and download PO as PDF.

**Response** (200): Binary PDF file

**Headers**:
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="PO-XXX.pdf"`

**PDF Includes**:
- Company branding (logo + details)
- PO information
- Line items with calculations
- Subtotal, VAT (20%), Total

**Errors**:
- 401: Unauthorized
- 404: PO not found
- 500: PDF generation failed

---

### POST /api/purchase-orders/[id]/send-email
Send PO via email to supplier.

**Request Body**: None

**Response** (200):
```json
{
  "success": true,
  "emailId": "resend-email-id",
  "message": "Purchase order sent successfully"
}
```

**Side Effects**:
- PO status updated to "SENT"
- Email sent via Resend API
- HTML email with company branding

**Validations**:
- `supplierEmail` must be set

**Errors**:
- 400: Supplier email missing
- 401: Unauthorized
- 404: PO not found
- 500: Email sending failed

---

## FreeAgent Integration

### GET /api/freeagent/connect
Initiate OAuth flow to connect FreeAgent account.

**Response** (302): Redirect to FreeAgent authorization page

**Query Parameters Generated**:
- `client_id`
- `redirect_uri`
- `response_type=code`
- `state` (CSRF protection)

---

### GET /api/freeagent/callback
OAuth callback handler (called by FreeAgent).

**Query Parameters** (from FreeAgent):
- `code`: Authorization code
- `state`: CSRF token

**Response** (302): Redirect to /dashboard

**Side Effects**:
- Exchange code for access token
- Store tokens in Organization
- Calculate token expiry

**Errors**:
- 400: Missing code or invalid state
- 500: Token exchange failed

---

### POST /api/freeagent/sync-company
Sync company information from FreeAgent.

**Request Body**: None

**Response** (200):
```json
{
  "success": true,
  "message": "Company information synced successfully"
}
```

**Side Effects**:
- Fetches company from FreeAgent API
- Updates Organization fields
- Sets `companySyncedAt` timestamp
- Refreshes token if expired

**Errors**:
- 400: FreeAgent not connected
- 401: Unauthorized
- 404: Organization not found
- 500: Sync failed

---

### POST /api/freeagent/sync-contacts
Sync contacts from FreeAgent (paginated).

**Request Body**: None

**Response** (200):
```json
{
  "success": true,
  "synced": 47,
  "message": "Contacts synced successfully"
}
```

**Side Effects**:
- Fetches all contact pages from FreeAgent
- Creates/updates Contact records
- Marks contacts as active

**Errors**:
- 400: FreeAgent not connected
- 401: Unauthorized
- 500: Sync failed

---

## Dashboard Analytics

### GET /api/dashboard/analytics
Get dashboard statistics and analytics.

**Response** (200):
```json
{
  "summary": {
    "totalPOs": 45,
    "totalValue": 125430.50,
    "statusCounts": {
      "DRAFT": 5,
      "SENT": 30,
      "RECEIVED": 10
    }
  },
  "monthlyData": [
    {
      "month": "Sep 2025",
      "count": 12,
      "value": 34500.00
    }
  ],
  "recentActivity": [
    {
      "id": "uuid",
      "poNumber": "PO-045",
      "title": "Office Supplies",
      "status": "SENT",
      "totalAmount": 1250.50,
      "supplierName": "Office Depot",
      "createdAt": "2025-10-01T..."
    }
  ]
}
```

**Notes**:
- Last 6 months of data
- Recent 10 POs
- All amounts as numbers (not Decimals)

**Errors**:
- 401: Unauthorized
- 404: Organization not found

---

## Storage

### POST /api/storage/setup
Setup Supabase Storage bucket (admin only).

**Request Body**: None

**Response** (200):
```json
{
  "success": true,
  "message": "Storage bucket setup complete",
  "bucket": "company-logos"
}
```

**Notes**:
- Requires SUPABASE_SERVICE_ROLE_KEY
- Idempotent (won't fail if bucket exists)
- One-time setup

**Errors**:
- 500: Setup failed

---

## Error Response Format

All errors follow this format:

```json
{
  "error": "Human-readable error message"
}
```

**Common HTTP Status Codes**:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (not authenticated)
- `404`: Not Found
- `500`: Internal Server Error
