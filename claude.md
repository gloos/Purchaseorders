# PO Tool - Claude AI Assistant Documentation

## Project Overview

**PO Tool** is a modern Purchase Order (PO) management system built with Next.js 14, designed for businesses to create, manage, and track purchase orders with seamless FreeAgent accounting integration.

### Core Purpose
- Streamline purchase order creation and management
- Automate accounting workflows via FreeAgent integration
- Enable supplier invoice collection through secure links
- Provide comprehensive PO tracking and analytics

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component patterns
- **Database**: PostgreSQL (Supabase) with Prisma ORM
- **Authentication**: Supabase Auth (supports OAuth and email/password)
- **Email**: Resend for transactional emails
- **PDF Generation**: React PDF Renderer
- **Monitoring**: Sentry for error tracking
- **Rate Limiting**: Upstash Redis (production) / In-memory (development)
- **Deployment**: Optimized for Vercel

## Architecture Overview

### Multi-tenant SaaS Architecture
- Organizations are the primary tenant entity
- Users belong to organizations with role-based access (ADMIN, MANAGER, VIEWER)
- All data is scoped to organizations for isolation
- PO numbers are unique per organization using counter-based generation

### Key Design Patterns

1. **Server Components First**: Leverages Next.js 14 server components for optimal performance
2. **Type Safety**: Strict TypeScript with Zod validation throughout
3. **Database Transactions**: Uses Prisma transactions for data consistency
4. **Row-Level Locking**: Counter model uses SELECT FOR UPDATE to prevent race conditions
5. **Immutable Financial Data**: Tax rates are snapshotted at PO creation for accounting integrity

## Database Schema

### Core Models

- **User**: Application users linked to Supabase Auth
- **Organization**: Company entities with FreeAgent integration
- **PurchaseOrder**: Main PO entity with comprehensive financial tracking
- **POLineItem**: Individual line items within purchase orders
- **Contact**: Suppliers synced from FreeAgent
- **TaxRate**: Configurable tax rates per organization
- **Counter**: Sequential number generation for PO numbers

### Key Features

1. **Tax Handling**
   - Supports VAT, GST, Sales Tax, etc.
   - INCLUSIVE, EXCLUSIVE, or NONE tax modes
   - Tax rates are immutably snapshotted at PO creation

2. **Status Workflow**
   - DRAFT → PENDING_APPROVAL → APPROVED → SENT → RECEIVED → INVOICED
   - CANCELLED state for voided orders

3. **Invoice Upload System**
   - Secure tokenized links (90-day expiry)
   - Public upload page for suppliers
   - Automatic status transition to INVOICED
   - File storage in Supabase Storage

## Project Structure

```
po-tool/
├── app/                       # Next.js App Router
│   ├── (auth)/               # Authentication pages
│   ├── (dashboard)/          # Protected dashboard routes
│   │   ├── dashboard/        # Analytics dashboard
│   │   ├── purchase-orders/  # PO management
│   │   ├── settings/         # Organization settings
│   │   ├── freeagent/        # FreeAgent integration
│   │   └── profile/          # User profile
│   ├── api/                  # API routes
│   │   ├── public/           # Unauthenticated endpoints
│   │   └── [various]/        # Resource-based APIs
│   └── invoice-upload/       # Public invoice upload page
├── lib/                      # Utilities and helpers
│   ├── supabase/            # Database clients
│   ├── freeagent/           # FreeAgent API client
│   ├── resend/              # Email service
│   ├── pdf/                 # PDF generation
│   └── [helpers]/           # Various utility functions
├── components/              # React components
├── prisma/                  # Database schema
└── docs/                    # Documentation
```

## Key Features

### 1. Purchase Order Management
- Create, edit, and manage purchase orders
- Line item management with quantity and pricing
- Automatic tax calculations
- PDF generation and email delivery
- Status tracking through workflow

### 2. FreeAgent Integration
- OAuth-based authentication
- Contact/supplier synchronization
- Future: Bill creation from invoices

### 3. Supplier Invoice Upload
- Time-limited secure upload links (90 days)
- Drag-and-drop file upload
- Supports PDF, PNG, JPG formats
- Automatic PO status updates
- Rate-limited public endpoints for security

### 4. Dashboard & Analytics
- Organization-wide PO statistics
- Status distribution charts
- Recent activity tracking
- Monthly spending trends

### 5. Multi-tenancy & RBAC
- Organization-based data isolation
- Three role levels: ADMIN, MANAGER, VIEWER
- Granular permission checks

## Security Measures

### Authentication & Authorization
- Supabase Auth with JWT tokens
- Row-level security via Prisma queries
- Role-based access control (RBAC)
- Session refresh in middleware

### API Security
- Rate limiting on all public endpoints
- Token validation for invoice uploads
- Input validation with Zod schemas
- SQL injection prevention via Prisma

### Data Protection
- Encrypted database connections
- Secure file storage in Supabase
- Environment variable protection
- HTTPS-only in production

## Development Guidelines

### Code Patterns

1. **TypeScript Strict Mode**: Project enforces strict unused variable checking
```typescript
// ❌ BAD: Unused variables cause build failures
export async function GET(request: Request) {
  const router = useRouter() // Error: 'router' is declared but never read
  const response = await fetch('/api') // Error: 'response' is declared but never read
}

// ✅ GOOD: Remove unused variables
export async function GET(_request: Request) { // Prefix with _ if required by signature
  await fetch('/api') // Don't assign if not needed
}

// ❌ BAD: Optional properties without null checks
const email = user.email // Error: Type 'string | undefined' not assignable to 'string'

// ✅ GOOD: Add null checks for optional properties
if (!user || !user.email) {
  return error
}
const email = user.email // Now TypeScript knows it's defined
```

**Common Patterns:**
- Remove unused imports: `import { useRouter } from 'next/navigation'` → delete if unused
- Prefix required-but-unused params: `function GET(_request: Request)`
- Check optional properties: `if (!user || !user.email)` before using
- Don't assign if not reading: `await fetch()` not `const res = await fetch()`

2. **API Routes**: Use standardized response patterns
```typescript
// Success: return NextResponse.json({ data })
// Error: return NextResponse.json({ error: message }, { status })
```

3. **Database Operations**: Always scope to organization
```typescript
where: { organizationId, id: resourceId }
```

4. **Error Handling**: Use try-catch with Sentry logging
```typescript
try {
  // operation
} catch (error) {
  Sentry.captureException(error);
  return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
}
```

### Testing Approach
- Unit tests with Jest and React Testing Library
- Manual test plans for critical features
- Type checking with TypeScript strict mode

### Deployment Considerations

1. **Environment Variables**
   - All sensitive keys in production env
   - Use lazy loading for build-time variables
   - Graceful fallbacks for optional services

2. **Database**
   - PgBouncer compatibility (no prepared statements)
   - Connection pooling configuration
   - Regular backups via Supabase

3. **Performance**
   - Server components for initial load
   - Optimistic updates where appropriate
   - Efficient database queries with indexes

## Recent Updates

### Latest Features
1. **Invoice Upload System**: Suppliers can upload invoices via secure links
2. **Tax Rate Management**: Configurable tax rates with immutable snapshotting
3. **Rate Limiting**: Protection against brute force and DoS attacks
4. **FreeAgent Sync**: Contact synchronization from accounting system

### Recent Fixes
- PgBouncer compatibility for Prisma
- Build-time environment variable handling
- TypeScript strict mode compliance
- Sentry configuration for production

## Common Tasks

### Adding a New Feature
1. Update Prisma schema if needed
2. Run migration: `npx prisma migrate dev`
3. Create API route in `app/api/`
4. Add frontend pages/components
5. Update types and validations
6. Add tests if critical path

### Debugging Issues
1. Check Sentry for error reports
2. Review API logs in Supabase
3. Verify environment variables
4. Check database migrations status
5. Review recent commits for changes

### Database Operations
```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name description

# Reset database (dev only)
npx prisma migrate reset
```

## Important Files

- `/prisma/schema.prisma` - Database schema
- `/middleware.ts` - Auth middleware
- `/lib/supabase/server.ts` - Server DB client
- `/lib/auth-helpers.ts` - Auth utilities
- `/lib/rbac.ts` - Permission checks
- `/app/api/purchase-orders/route.ts` - Main PO API

## Known Limitations

1. **Single Currency**: Currently GBP-focused, multi-currency planned
2. **File Size**: 10MB limit for invoice uploads
3. **FreeAgent Scope**: Limited to contact sync currently
4. **Reporting**: Basic analytics, advanced reports planned

## Support & Maintenance

This is a production application requiring:
- Regular dependency updates
- Security patch monitoring
- Database backup verification
- Performance monitoring via Sentry
- Rate limit threshold adjustments

## AI Assistant Notes

When working with this codebase:

1. **Always maintain type safety** - TypeScript strict mode is enabled
2. **Respect multi-tenancy** - Always filter by organizationId
3. **Preserve financial integrity** - Never modify historical tax data
4. **Follow existing patterns** - Consistency is key for maintainability
5. **Consider performance** - Use server components where possible
6. **Security first** - Validate all inputs, rate limit public endpoints

### Common Pitfalls to Avoid

- **Don't leave unused variables** - TypeScript strict mode will fail the build. Remove or prefix with underscore
- Don't use Prisma prepared statements (breaks with PgBouncer)
- Don't assume environment variables exist at build time
- Don't modify tax rates on existing POs
- Don't expose internal IDs in public endpoints
- Don't skip organization scoping in queries
- **Don't use optional properties without null checks** - Check `if (!obj || !obj.prop)` before using

### Testing Checklist

When implementing features:
- [ ] Type checking passes (`npm run build`)
- [ ] Database migrations applied
- [ ] API endpoints return correct status codes
- [ ] Frontend handles loading and error states
- [ ] RBAC permissions enforced
- [ ] Rate limiting applied to public endpoints
- [ ] Sentry captures errors appropriately

This documentation should be updated as the project evolves to maintain accuracy and usefulness for AI-assisted development.