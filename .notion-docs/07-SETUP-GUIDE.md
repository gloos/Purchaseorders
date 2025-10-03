# Setup Guide

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL**: v14+ (via Supabase)
- **Git**: Latest version
- **Supabase Account**: Free tier sufficient
- **FreeAgent Account** (optional): For accounting integration
- **Resend Account**: For email sending

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/gloos/Purchaseorders.git
cd Purchaseorders
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Note your project reference ID (from the URL)
3. Go to **Settings** → **API**
   - Copy `URL` (Project URL)
   - Copy `anon public` key
   - Copy `service_role` key (⚠️ keep secret)
4. Go to **Settings** → **Database**
   - Copy `Connection string` (URI format)

### 4. Configure Environment Variables

Create `.env` file in project root:

```bash
# Database
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# FreeAgent API (optional)
FREEAGENT_CLIENT_ID="your-client-id"
FREEAGENT_CLIENT_SECRET="your-client-secret"
FREEAGENT_REDIRECT_URI="http://localhost:3000/api/freeagent/callback"

# Resend API
RESEND_API_KEY="re_your-api-key-here"
```

### 5. Run Database Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed database
npx prisma db seed
```

### 6. Set Up Supabase Storage

**Option A: Via API** (requires service role key in .env)
```bash
curl -X POST http://localhost:3000/api/storage/setup
```

**Option B: Via Supabase Dashboard**
1. Go to **Storage** in Supabase dashboard
2. Create new bucket named `company-logos`
3. Settings:
   - Public bucket: Yes
   - File size limit: 5242880 (5MB)
   - Allowed MIME types: `image/png,image/jpeg,image/jpg,image/svg+xml,image/webp`

### 7. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## FreeAgent Integration Setup

### 1. Register Application

1. Go to [FreeAgent Developer Dashboard](https://dev.freeagent.com)
2. Create new OAuth application
3. Settings:
   - **App Name**: PO Tool
   - **Redirect URI**: `http://localhost:3000/api/freeagent/callback`
   - **Description**: Purchase Order Management
4. Note your `Client ID` and `Client Secret`

### 2. Update Environment Variables

Add to `.env`:
```bash
FREEAGENT_CLIENT_ID="your-actual-client-id"
FREEAGENT_CLIENT_SECRET="your-actual-client-secret"
```

### 3. Connect FreeAgent

1. Sign in to PO Tool
2. Go to FreeAgent page
3. Click "Connect to FreeAgent"
4. Authorize the application
5. You'll be redirected back to dashboard

## Resend Email Setup

### 1. Create Resend Account

1. Sign up at [resend.com](https://resend.com)
2. Go to **API Keys**
3. Create new API key
4. Copy the key

### 2. Verify Domain (Production)

For production use:
1. Go to **Domains** in Resend
2. Add your domain
3. Add DNS records as instructed
4. Wait for verification

### 3. Update Email From Address

Edit `app/api/purchase-orders/[id]/send-email/route.ts`:

```typescript
// Change from
from: 'Purchase Orders <onboarding@resend.dev>'

// To
from: 'Purchase Orders <orders@yourdomain.com>'
```

## Production Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy!

### Environment Variables in Vercel

Add all variables from `.env` except:
- Update `FREEAGENT_REDIRECT_URI` to production URL
- Use production database URL
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret

### Post-Deployment Checklist

- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Test authentication flow
- [ ] Test FreeAgent connection
- [ ] Test email sending
- [ ] Test logo upload
- [ ] Set up error monitoring (Sentry)
- [ ] Configure custom domain
- [ ] Enable SSL/HTTPS
- [ ] Test production database connection

## Troubleshooting

### Database Connection Issues

**Problem**: Can't connect to database

**Solutions**:
- Check `DATABASE_URL` is correct
- Ensure IP is allowlisted in Supabase (usually auto for Vercel)
- Verify database is running
- Check connection pooling limits

### Prisma Client Not Found

**Problem**: `@prisma/client` not generated

**Solution**:
```bash
npx prisma generate
```

### OAuth Redirect Issues

**Problem**: FreeAgent callback fails

**Solutions**:
- Verify `FREEAGENT_REDIRECT_URI` matches registered URI exactly
- Check state parameter is being validated
- Ensure session cookies are working

### Email Sending Fails

**Problem**: Emails not sending

**Solutions**:
- Verify `RESEND_API_KEY` is correct
- Check from address is verified
- Review Resend dashboard for errors
- Check email has valid recipient

### Logo Upload Fails

**Problem**: Can't upload logos

**Solutions**:
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Run storage setup endpoint
- Check file size < 5MB
- Verify file type is allowed

### Build Errors

**Problem**: Build fails in production

**Solutions**:
```bash
# Clear cache
rm -rf .next
rm -rf node_modules
npm install
npm run build
```

## Development Workflow

### Daily Development

```bash
# Pull latest changes
git pull

# Install any new dependencies
npm install

# Run migrations if schema changed
npx prisma migrate dev

# Start dev server
npm run dev
```

### Making Schema Changes

```bash
# 1. Edit prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name description_of_change

# 3. Generate client
npx prisma generate

# 4. Restart dev server
```

### Adding New Features

1. Create feature branch
   ```bash
   git checkout -b feature/feature-name
   ```

2. Make changes

3. Test thoroughly

4. Commit and push
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin feature/feature-name
   ```

5. Create pull request

6. Merge to main after review

## Useful Commands

```bash
# Database
npx prisma studio              # Open database GUI
npx prisma migrate reset       # Reset database (dev only!)
npx prisma db push             # Push schema without migration

# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm start                      # Start production server
npm run lint                   # Run ESLint

# Git
git status                     # Check status
git log --oneline -10         # Recent commits
git diff                       # Show changes
```

## Security Best Practices

### Environment Variables
- ✅ Never commit `.env` file
- ✅ Use different keys for dev/production
- ✅ Rotate API keys regularly
- ✅ Limit scope of API keys

### Database
- ✅ Use connection pooling
- ✅ Enable Row Level Security (RLS) in Supabase
- ✅ Regular backups
- ✅ Monitor for suspicious queries

### Application
- ✅ Keep dependencies updated
- ✅ Validate all inputs
- ✅ Sanitize user data
- ✅ Use HTTPS in production
- ✅ Implement rate limiting
- ✅ Add CORS protection

## Getting Help

- **Documentation**: Check docs in `.notion-docs/`
- **Issues**: Create issue on GitHub
- **Email**: [your-email]
- **Logs**: Check console and Vercel logs

## Next Steps

After setup:
1. ✅ Create your organization
2. ✅ Connect FreeAgent account
3. ✅ Sync company information
4. ✅ Sync contacts
5. ✅ Create your first PO
6. ✅ Test PDF generation
7. ✅ Test email sending
8. ✅ Upload company logo
9. ✅ Explore dashboard analytics
10. ✅ Invite team members
