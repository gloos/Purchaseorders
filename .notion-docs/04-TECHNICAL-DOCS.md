# Technical Documentation

## 🏗 Architecture Overview

### Application Structure

```
po-tool/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication routes
│   │   ├── signin/
│   │   ├── signup/
│   │   └── setup/                # Organization setup
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── dashboard/            # Analytics dashboard
│   │   ├── purchase-orders/      # PO management
│   │   ├── freeagent/            # FreeAgent integration
│   │   └── profile/              # Company profile
│   ├── api/                      # API routes
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── freeagent/
│   │   ├── organization/
│   │   ├── organizations/
│   │   ├── purchase-orders/
│   │   └── storage/
│   └── globals.css               # Global styles
├── components/                   # Reusable components
│   └── navbar.tsx               # Navigation component
├── lib/                         # Utility libraries
│   ├── auth-helpers.ts          # Authentication utilities
│   ├── freeagent/               # FreeAgent client
│   ├── pdf/                     # PDF generation
│   ├── prisma.ts                # Prisma client
│   ├── resend/                  # Email client & templates
│   └── supabase/                # Supabase client & middleware
├── prisma/                      # Database schema & migrations
│   └── schema.prisma
└── .env                         # Environment variables
```

### Architecture Patterns

**Multi-Tenant SaaS**
- Organization-based data isolation
- User-organization relationships
- Scoped queries by organizationId
- Cascade deletes for data integrity

**API Design**
- RESTful endpoints
- Consistent error responses
- HTTP status codes
- JSON request/response

**Authentication Flow**
1. Supabase Auth (OAuth 2.0)
2. Session verification
3. User lookup by id (not email)
4. Organization verification
5. Scoped data access

## 📊 Database Schema

### Entity Relationship Diagram

```
User (1) ──────── (1..*) PurchaseOrder
  │                         │
  │                         │
  └─> (0..1) Organization <─┘
                  │
                  │
                  ├─> (*) Contact
                  └─> (*) PurchaseOrder ─> (*) POLineItem
```

### Models

#### User
- Represents authenticated users
- Links to Supabase auth.users via id
- Belongs to one Organization
- Creates multiple PurchaseOrders

#### Organization
- Multi-tenant root entity
- Unique slug for URLs
- Stores FreeAgent OAuth tokens
- Company profile information
- Has many Users, PurchaseOrders, Contacts

#### Contact
- Synced from FreeAgent
- Supplier/contact information
- Belongs to Organization
- Indexed by freeAgentId

#### PurchaseOrder
- Core business entity
- Unique PO number
- Status workflow (DRAFT → SENT → RECEIVED)
- Supplier details
- Belongs to Organization
- Created by User
- Has many POLineItems

#### POLineItem
- Line items for PurchaseOrders
- Quantity, unit price, total
- Cascade deletes with PO

### Key Constraints

- **Unique Indices**:
  - `User.email`
  - `Organization.slug`
  - `Contact.freeAgentId`
  - `PurchaseOrder.poNumber`

- **Foreign Keys with Cascade**:
  - Contact → Organization
  - PurchaseOrder → Organization
  - POLineItem → PurchaseOrder

- **Recommended Missing Indices**:
  - `(organizationId, poNumber)` unique on PurchaseOrder
  - `(organizationId, status)` on PurchaseOrder
  - `(organizationId, orderDate)` on PurchaseOrder

## 🔐 Security

### Authentication
- **Provider**: Supabase Auth
- **Method**: Email/Password, OAuth (extensible)
- **Sessions**: HTTP-only cookies
- **Token Refresh**: Automatic via middleware

### Authorization
- Organization-scoped data access
- All API routes verify user authentication
- Queries filtered by user's organizationId
- Helper function: `getUserAndOrgOrThrow()`

### Data Protection
- Environment variables for secrets
- OAuth tokens encrypted at rest (Supabase)
- API keys never exposed to client
- HTTPS only in production

### Input Validation
- **Client**: Form validation, pattern matching
- **Server**: Type checking, manual validation
- **Future**: Zod schemas for comprehensive validation

### CORS & CSP
- Same-origin policy
- Configured for Next.js serverless functions
- Supabase CORS properly configured

## 🔗 External Integrations

### FreeAgent API

**Purpose**: Accounting software integration
**Auth**: OAuth 2.0
**Endpoints Used**:
- `GET /v2/company` - Company information
- `GET /v2/contacts` - Contact list (paginated)

**Token Management**:
- Access token stored in Organization
- Refresh token for renewal
- Token expiry tracked
- Automatic refresh before expiry

**Data Sync**:
- Company: On-demand via button
- Contacts: Paginated fetch (all pages)
- Incremental updates supported

### Resend API

**Purpose**: Transactional email sending
**Auth**: API Key
**Features**:
- HTML email templates
- React-based template generation
- Company branding inline
- Error handling & logging

**Current Issues**:
- Using test sender (onboarding@resend.dev)
- Missing plain-text version
- No PDF attachment yet

### Supabase

**Services Used**:
1. **Authentication**
   - User management
   - Session handling
   - Token refresh

2. **Database** (PostgreSQL)
   - Prisma ORM
   - Migrations
   - Connection pooling

3. **Storage**
   - Company logos
   - Public bucket
   - 5MB file limit
   - Auto-cleanup on replacement

## 🚀 Deployment

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."  # For Storage admin

# FreeAgent API
FREEAGENT_CLIENT_ID="..."
FREEAGENT_CLIENT_SECRET="..."
FREEAGENT_REDIRECT_URI="http://localhost:3000/api/freeagent/callback"

# Resend API
RESEND_API_KEY="..."
```

### Build & Deploy

**Local Development**:
```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

**Production Build**:
```bash
npm run build
npm start
```

**Recommended Platform**: Vercel
- Automatic deployments from Git
- Serverless functions
- Edge network
- Environment variables management

### Database Migrations

```bash
# Create migration
npx prisma migrate dev --name migration_name

# Apply to production
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset
```

## 🧪 Testing

### Current State
- No automated tests yet
- Manual testing via UI
- Console logging for debugging

### Recommended Test Strategy

**Unit Tests** (Future):
- Utility functions
- Data transformations
- Calculation logic

**Integration Tests** (Future):
- API endpoints
- Database operations
- External API mocks

**E2E Tests** (Future):
- Critical user flows
- PO creation to email
- FreeAgent sync workflow

**Tools to Consider**:
- Jest (unit)
- Supertest (API)
- Playwright (E2E)

## 📝 Code Quality

### TypeScript Configuration
- Strict mode enabled
- No implicit any
- Type checking enforced

### Code Organization
- Feature-based routing (App Router)
- Shared utilities in /lib
- Component reusability
- Clear separation of concerns

### Error Handling Pattern
```typescript
try {
  const { organizationId } = await getUserAndOrgOrThrow()
  // Business logic
  return NextResponse.json({ success: true })
} catch (error) {
  console.error('Error:', error)
  if (error instanceof Error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  return NextResponse.json({ error: 'Server error' }, { status: 500 })
}
```

### Best Practices Followed
✅ Transaction safety for multi-step operations
✅ Consistent auth helper usage
✅ Proper HTTP status codes
✅ Environment variable management
✅ TypeScript throughout
✅ Error logging
✅ Input sanitization (partial)

### Areas for Improvement
⚠️ Add Zod validation schemas
⚠️ Implement rate limiting
⚠️ Add automated tests
⚠️ Set up monitoring (Sentry)
⚠️ Add database indices
⚠️ Implement caching strategy
