# HelixFlow

A modern purchase order management system built with Next.js 14, integrating with FreeAgent for accounting automation.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: PostgreSQL (Supabase) with Prisma ORM
- **Authentication**: Supabase Auth
- **API Integration**: FreeAgent

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (includes PostgreSQL database and authentication)
- FreeAgent developer account

### Installation

1. **Clone and navigate to the project:**
   ```bash
   cd po-tool
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and fill in your actual values:
   - `DATABASE_URL`: Your Supabase PostgreSQL connection string (from Supabase project settings > Database)
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key (from project API settings)
   - `FREEAGENT_CLIENT_ID`, `FREEAGENT_CLIENT_SECRET`: From FreeAgent developer portal

4. **Set up the database:**
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

5. **Install shadcn/ui components (as needed):**
   ```bash
   npx shadcn-ui@latest add button
   npx shadcn-ui@latest add card
   # Add other components as needed
   ```

6. **Run the development server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
po-tool/
├── app/                    # Next.js App Router pages and layouts
│   ├── (auth)/            # Authentication pages (grouped route)
│   ├── (dashboard)/       # Protected dashboard pages (grouped route)
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Landing page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── README.md         # Components documentation
├── lib/                   # Utilities and configurations
│   ├── supabase/         # Supabase client utilities
│   │   ├── client.ts    # Browser client
│   │   ├── server.ts    # Server client
│   │   └── middleware.ts # Middleware helper
│   ├── prisma.ts         # Prisma client
│   ├── utils.ts          # Helper functions
│   ├── freeagent/        # FreeAgent API integration
│   └── README.md         # Lib documentation
├── prisma/               # Database schema and migrations
│   └── schema.prisma     # Prisma schema
├── middleware.ts         # Next.js middleware for auth
└── public/               # Static assets
```

## Database Schema

The initial schema includes:
- **User**: Application user data (syncs with Supabase auth.users)
- **Organization**: Company/organization management

Note: Supabase handles authentication in its own `auth` schema. The User model in Prisma stores application-specific user data and uses UUIDs that match Supabase auth user IDs.

Extend the schema in `prisma/schema.prisma` as needed for PO management.

## Development

### Adding shadcn/ui Components

```bash
npx shadcn-ui@latest add [component-name]
```

### Database Changes

After modifying `prisma/schema.prisma`:
```bash
npx prisma migrate dev --name [migration-name]
npx prisma generate
```

### Type Safety

The project uses strict TypeScript configuration. Ensure all code passes type checking:
```bash
npm run build
```

## Authentication Flow

1. Users authenticate via Supabase Auth (email/password, OAuth providers, etc.)
2. Middleware automatically refreshes user sessions
3. Application-specific user data is stored in PostgreSQL via Prisma
4. Server and client components can access auth state using Supabase clients

### Using Authentication

**In Server Components:**
```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
```

**In Client Components:**
```typescript
'use client'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
```

## FreeAgent Integration

Configure FreeAgent API credentials in your `.env` file. Integration utilities will be located in `lib/freeagent/`.

## Deployment

### Environment Variables

Ensure all production environment variables are set in your deployment platform.

### Build

```bash
npm run build
npm start
```

## License

Private project - All rights reserved
