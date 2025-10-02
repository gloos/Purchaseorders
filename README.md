# PO Tool

A modern purchase order management system built with Next.js 14, integrating with FreeAgent for accounting automation.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with Supabase
- **API Integration**: FreeAgent

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Supabase account
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
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL`: Your app URL (http://localhost:3000 for development)
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, etc.: From your Supabase project
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
│   │   └── auth/          # NextAuth routes
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Landing page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── README.md         # Components documentation
├── lib/                   # Utilities and configurations
│   ├── auth.ts           # NextAuth configuration
│   ├── prisma.ts         # Prisma client
│   ├── utils.ts          # Helper functions
│   ├── freeagent/        # FreeAgent API integration
│   └── README.md         # Lib documentation
├── prisma/               # Database schema and migrations
│   └── schema.prisma     # Prisma schema
├── types/                # TypeScript type definitions
│   └── next-auth.d.ts   # NextAuth type extensions
└── public/               # Static assets
```

## Database Schema

The initial schema includes:
- **User**: User accounts with authentication
- **Organization**: Company/organization management
- **Account/Session**: NextAuth session management
- **VerificationToken**: Email verification tokens

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

1. Users authenticate via Supabase OAuth
2. NextAuth manages sessions using JWT strategy
3. User data is stored in PostgreSQL via Prisma
4. Protected routes check authentication status

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
