# Project Management Feature - Complete Implementation Guide

## Overview
This document provides exhaustive implementation details for adding a comprehensive project management feature to the PO Tool, including FreeAgent synchronization, batch operations, and financial analytics.

## Table of Contents
1. [Database Schema](#database-schema)
2. [API Implementation](#api-implementation)
3. [Frontend Components](#frontend-components)
4. [FreeAgent Integration](#freeagent-integration)
5. [Business Logic](#business-logic)
6. [UI/UX Specifications](#uiux-specifications)
7. [Testing Requirements](#testing-requirements)
8. [Deployment Checklist](#deployment-checklist)

## Database Schema

### 1. Create Migration File
Create a new migration: `prisma/migrations/[timestamp]_add_project_management/migration.sql`

```sql
-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'HIDDEN', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "ProjectHealthStatus" AS ENUM ('HEALTHY', 'WARNING', 'CRITICAL', 'UNKNOWN');

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "freeAgentId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "reference" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "healthStatus" "ProjectHealthStatus" NOT NULL DEFAULT 'UNKNOWN',
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GBP',

    -- Financial fields
    "budget" DECIMAL(10,2),
    "budgetAlertThreshold" INTEGER DEFAULT 75,
    "totalRevenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalCosts" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalPoValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "profitAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "profitMargin" DECIMAL(5,2) NOT NULL DEFAULT 0,

    -- Client information
    "clientName" TEXT,
    "clientFreeAgentId" TEXT,
    "clientEmail" TEXT,

    -- Dates
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    -- Sync metadata
    "lastSyncedAt" TIMESTAMP(3),
    "syncError" TEXT,
    "freeAgentUrl" TEXT,
    "freeAgentCreatedAt" TIMESTAMP(3),
    "freeAgentUpdatedAt" TIMESTAMP(3),

    -- System fields
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_team_members" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_milestones" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_documents" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_sync_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "projectsSynced" INTEGER DEFAULT 0,
    "projectsFailed" INTEGER DEFAULT 0,
    "errorDetails" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "project_sync_logs_pkey" PRIMARY KEY ("id")
);

-- Add project field to purchase_orders
ALTER TABLE "purchase_orders" ADD COLUMN "projectId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "projects_freeAgentId_key" ON "projects"("freeAgentId");
CREATE INDEX "projects_organizationId_idx" ON "projects"("organizationId");
CREATE INDEX "projects_status_idx" ON "projects"("status");
CREATE INDEX "projects_organizationId_status_idx" ON "projects"("organizationId", "status");
CREATE INDEX "projects_clientFreeAgentId_idx" ON "projects"("clientFreeAgentId");
CREATE INDEX "project_team_members_projectId_idx" ON "project_team_members"("projectId");
CREATE INDEX "project_team_members_userId_idx" ON "project_team_members"("userId");
CREATE UNIQUE INDEX "project_team_members_projectId_userId_key" ON "project_team_members"("projectId", "userId");
CREATE INDEX "project_milestones_projectId_idx" ON "project_milestones"("projectId");
CREATE INDEX "project_documents_projectId_idx" ON "project_documents"("projectId");
CREATE INDEX "project_sync_logs_organizationId_idx" ON "project_sync_logs"("organizationId");
CREATE INDEX "purchase_orders_projectId_idx" ON "purchase_orders"("projectId");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_sync_logs" ADD CONSTRAINT "project_sync_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

### 2. Update Prisma Schema
Add to `prisma/schema.prisma`:

```prisma
model Project {
  id                    String              @id @default(uuid())
  freeAgentId          String?             @unique
  name                 String
  code                 String?
  reference            String?
  status               ProjectStatus       @default(ACTIVE)
  healthStatus         ProjectHealthStatus @default(UNKNOWN)
  description          String?
  currency             String              @default("GBP")

  // Financial fields
  budget               Decimal?            @db.Decimal(10, 2)
  budgetAlertThreshold Int?               @default(75)
  totalRevenue         Decimal            @default(0) @db.Decimal(10, 2)
  totalCosts           Decimal            @default(0) @db.Decimal(10, 2)
  totalPoValue         Decimal            @default(0) @db.Decimal(10, 2)
  profitAmount         Decimal            @default(0) @db.Decimal(10, 2)
  profitMargin         Decimal            @default(0) @db.Decimal(5, 2)

  // Client information
  clientName           String?
  clientFreeAgentId    String?
  clientEmail          String?

  // Dates
  startDate            DateTime?
  endDate              DateTime?
  completedAt          DateTime?
  cancelledAt          DateTime?

  // Sync metadata
  lastSyncedAt         DateTime?
  syncError            String?
  freeAgentUrl         String?
  freeAgentCreatedAt   DateTime?
  freeAgentUpdatedAt   DateTime?

  // System fields
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt

  // Relations
  organizationId       String
  organization         Organization       @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  purchaseOrders       PurchaseOrder[]
  teamMembers          ProjectTeamMember[]
  milestones           ProjectMilestone[]
  documents            ProjectDocument[]

  @@map("projects")
  @@index([organizationId])
  @@index([status])
  @@index([organizationId, status])
  @@index([clientFreeAgentId])
}

model ProjectTeamMember {
  id          String   @id @default(uuid())
  projectId   String
  userId      String
  role        String?
  assignedAt  DateTime @default(now())

  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
  @@map("project_team_members")
  @@index([projectId])
  @@index([userId])
}

model ProjectMilestone {
  id          String    @id @default(uuid())
  projectId   String
  name        String
  description String?
  dueDate     DateTime?
  completedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@map("project_milestones")
  @@index([projectId])
}

model ProjectDocument {
  id           String   @id @default(uuid())
  projectId    String
  name         String
  url          String
  fileType     String?
  fileSize     Int?
  uploadedById String
  uploadedAt   DateTime @default(now())

  project      Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  uploadedBy   User     @relation(fields: [uploadedById], references: [id])

  @@map("project_documents")
  @@index([projectId])
}

model ProjectSyncLog {
  id             String       @id @default(uuid())
  organizationId String
  syncType       String
  status         String
  projectsSynced Int?         @default(0)
  projectsFailed Int?         @default(0)
  errorDetails   Json?
  startedAt      DateTime     @default(now())
  completedAt    DateTime?

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@map("project_sync_logs")
  @@index([organizationId])
}

enum ProjectStatus {
  ACTIVE
  COMPLETED
  CANCELLED
  HIDDEN
  ON_HOLD
}

enum ProjectHealthStatus {
  HEALTHY
  WARNING
  CRITICAL
  UNKNOWN
}
```

## API Implementation

### 1. Project List & CRUD Operations

#### `app/api/projects/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserAndOrgOrThrow } from '@/lib/auth-helpers'
import { z } from 'zod'

// GET /api/projects - List projects with filters
export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await getUserAndOrgOrThrow()
    const searchParams = request.nextUrl.searchParams

    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const clientId = searchParams.get('clientId')
    const sortBy = searchParams.get('sortBy') || 'name'
    const sortOrder = searchParams.get('sortOrder') || 'asc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where = {
      organizationId,
      ...(status && { status }),
      ...(clientId && { clientFreeAgentId: clientId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { clientName: { contains: search, mode: 'insensitive' } }
        ]
      })
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          purchaseOrders: {
            select: {
              id: true,
              totalAmount: true,
              status: true
            }
          },
          teamMembers: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.project.count({ where })
    ])

    // Calculate aggregated stats
    const projectsWithStats = projects.map(project => {
      const poStats = project.purchaseOrders.reduce((acc, po) => {
        acc.totalPoValue = acc.totalPoValue.add(po.totalAmount)
        acc.poCount++
        if (po.status === 'SENT' || po.status === 'APPROVED') {
          acc.committedValue = acc.committedValue.add(po.totalAmount)
        }
        return acc
      }, {
        totalPoValue: new Decimal(0),
        committedValue: new Decimal(0),
        poCount: 0
      })

      // Calculate budget usage
      const budgetUsage = project.budget
        ? (poStats.totalPoValue.div(project.budget).mul(100)).toNumber()
        : null

      // Determine health status
      let healthStatus = 'UNKNOWN'
      if (project.budget) {
        if (budgetUsage > 90) healthStatus = 'CRITICAL'
        else if (budgetUsage > project.budgetAlertThreshold) healthStatus = 'WARNING'
        else healthStatus = 'HEALTHY'
      }

      return {
        ...project,
        poCount: poStats.poCount,
        totalPoValue: poStats.totalPoValue.toString(),
        committedValue: poStats.committedValue.toString(),
        budgetUsage,
        healthStatus
      }
    })

    return NextResponse.json({
      projects: projectsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST /api/projects - Create manual project (if not synced from FreeAgent)
const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().optional(),
  description: z.string().optional(),
  budget: z.number().positive().optional(),
  budgetAlertThreshold: z.number().min(0).max(100).optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
})

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await getUserAndOrgOrThrow()
    const body = await request.json()

    const validation = createProjectSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    const project = await prisma.project.create({
      data: {
        ...validation.data,
        organizationId
      }
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
```

#### `app/api/projects/[id]/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserAndOrgOrThrow } from '@/lib/auth-helpers'
import { z } from 'zod'

// GET /api/projects/[id] - Get single project with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { organizationId } = await getUserAndOrgOrThrow()

    const project = await prisma.project.findFirst({
      where: {
        id,
        organizationId
      },
      include: {
        purchaseOrders: {
          orderBy: { createdAt: 'desc' },
          include: {
            lineItems: true
          }
        },
        teamMembers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        },
        milestones: {
          orderBy: { dueDate: 'asc' }
        },
        documents: {
          orderBy: { uploadedAt: 'desc' },
          include: {
            uploadedBy: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Calculate detailed analytics
    const analytics = await calculateProjectAnalytics(project)

    return NextResponse.json({
      ...project,
      analytics
    })
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

// PATCH /api/projects/[id] - Update project
const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED', 'HIDDEN', 'ON_HOLD']).optional(),
  budget: z.number().positive().optional(),
  budgetAlertThreshold: z.number().min(0).max(100).optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { organizationId } = await getUserAndOrgOrThrow()
    const body = await request.json()

    const validation = updateProjectSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    // Check project exists and belongs to org
    const existing = await prisma.project.findFirst({
      where: { id, organizationId }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Handle status changes
    const updateData: any = { ...validation.data }
    if (validation.data.status === 'COMPLETED' && !existing.completedAt) {
      updateData.completedAt = new Date()
    } else if (validation.data.status === 'CANCELLED' && !existing.cancelledAt) {
      updateData.cancelledAt = new Date()
    }

    const project = await prisma.project.update({
      where: { id },
      data: updateData
    })

    // If FreeAgent ID exists, sync status back
    if (project.freeAgentId && validation.data.status) {
      await syncProjectStatusToFreeAgent(project.freeAgentId, validation.data.status)
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[id] - Delete project (soft delete by setting HIDDEN)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { organizationId, user } = await getUserAndOrgOrThrow()

    // Only admins can delete projects
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const project = await prisma.project.update({
      where: {
        id,
        organizationId
      },
      data: {
        status: 'HIDDEN'
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}
```

### 2. Batch Operations

#### `app/api/projects/batch/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserAndOrgOrThrow } from '@/lib/auth-helpers'
import { z } from 'zod'

const batchUpdateSchema = z.object({
  projectIds: z.array(z.string()).min(1),
  operation: z.enum(['updateStatus', 'assignTeamMember', 'updateBudgetAlert']),
  data: z.record(z.any())
})

export async function PATCH(request: NextRequest) {
  try {
    const { organizationId, user } = await getUserAndOrgOrThrow()
    const body = await request.json()

    const validation = batchUpdateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { projectIds, operation, data } = validation.data

    // Verify all projects belong to organization
    const projects = await prisma.project.findMany({
      where: {
        id: { in: projectIds },
        organizationId
      }
    })

    if (projects.length !== projectIds.length) {
      return NextResponse.json(
        { error: 'Some projects not found or unauthorized' },
        { status: 404 }
      )
    }

    let result

    switch (operation) {
      case 'updateStatus':
        const status = data.status as ProjectStatus
        result = await prisma.project.updateMany({
          where: {
            id: { in: projectIds },
            organizationId
          },
          data: {
            status,
            ...(status === 'COMPLETED' && { completedAt: new Date() }),
            ...(status === 'CANCELLED' && { cancelledAt: new Date() })
          }
        })

        // Sync to FreeAgent if applicable
        for (const project of projects) {
          if (project.freeAgentId) {
            await syncProjectStatusToFreeAgent(project.freeAgentId, status)
          }
        }
        break

      case 'assignTeamMember':
        const userId = data.userId as string
        const role = data.role as string

        // Create team member assignments
        const assignments = projectIds.map(projectId => ({
          projectId,
          userId,
          role
        }))

        result = await prisma.projectTeamMember.createMany({
          data: assignments,
          skipDuplicates: true
        })
        break

      case 'updateBudgetAlert':
        const threshold = data.threshold as number
        result = await prisma.project.updateMany({
          where: {
            id: { in: projectIds },
            organizationId
          },
          data: {
            budgetAlertThreshold: threshold
          }
        })
        break

      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      updated: result.count || result.length,
      projectIds
    })
  } catch (error) {
    console.error('Error in batch update:', error)
    return NextResponse.json(
      { error: 'Failed to update projects' },
      { status: 500 }
    )
  }
}
```

### 3. FreeAgent Sync

#### `app/api/projects/sync/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserAndOrgOrThrow } from '@/lib/auth-helpers'
import { getFreeAgentClient } from '@/lib/freeagent/client'

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await getUserAndOrgOrThrow()

    // Check for FreeAgent connection
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        freeAgentAccessToken: true,
        freeAgentRefreshToken: true,
        freeAgentOrganisationId: true
      }
    })

    if (!org?.freeAgentAccessToken) {
      return NextResponse.json(
        { error: 'FreeAgent not connected' },
        { status: 400 }
      )
    }

    // Create sync log
    const syncLog = await prisma.projectSyncLog.create({
      data: {
        organizationId,
        syncType: 'FULL_SYNC',
        status: 'IN_PROGRESS'
      }
    })

    try {
      const freeAgent = await getFreeAgentClient(organizationId)

      // Fetch all projects from FreeAgent
      const freeAgentProjects = await freeAgent.getProjects()

      let synced = 0
      let failed = 0
      const errors = []

      for (const faProject of freeAgentProjects) {
        try {
          // Map FreeAgent status to our status
          const status = mapFreeAgentStatus(faProject.status)

          // Get client details if available
          let clientName = null
          let clientEmail = null
          let clientFreeAgentId = null

          if (faProject.contact) {
            const contact = await freeAgent.getContact(faProject.contact)
            clientName = contact.organisation_name || contact.name
            clientEmail = contact.email
            clientFreeAgentId = faProject.contact
          }

          // Calculate financial metrics
          const invoices = await freeAgent.getProjectInvoices(faProject.url)
          const bills = await freeAgent.getProjectBills(faProject.url)

          const totalRevenue = invoices.reduce((sum, inv) =>
            sum + parseFloat(inv.net_value), 0
          )
          const totalCosts = bills.reduce((sum, bill) =>
            sum + parseFloat(bill.total_value), 0
          )
          const profitAmount = totalRevenue - totalCosts
          const profitMargin = totalRevenue > 0
            ? (profitAmount / totalRevenue) * 100
            : 0

          // Upsert project
          await prisma.project.upsert({
            where: { freeAgentId: faProject.url },
            create: {
              freeAgentId: faProject.url,
              name: faProject.name,
              code: faProject.reference,
              status,
              currency: faProject.currency || 'GBP',
              budget: faProject.budget ? parseFloat(faProject.budget) : null,
              totalRevenue,
              totalCosts,
              profitAmount,
              profitMargin,
              clientName,
              clientEmail,
              clientFreeAgentId,
              startDate: faProject.starts_on ? new Date(faProject.starts_on) : null,
              endDate: faProject.ends_on ? new Date(faProject.ends_on) : null,
              freeAgentUrl: faProject.url,
              freeAgentCreatedAt: new Date(faProject.created_at),
              freeAgentUpdatedAt: new Date(faProject.updated_at),
              lastSyncedAt: new Date(),
              organizationId
            },
            update: {
              name: faProject.name,
              code: faProject.reference,
              status,
              currency: faProject.currency || 'GBP',
              budget: faProject.budget ? parseFloat(faProject.budget) : null,
              totalRevenue,
              totalCosts,
              profitAmount,
              profitMargin,
              clientName,
              clientEmail,
              clientFreeAgentId,
              startDate: faProject.starts_on ? new Date(faProject.starts_on) : null,
              endDate: faProject.ends_on ? new Date(faProject.ends_on) : null,
              freeAgentUpdatedAt: new Date(faProject.updated_at),
              lastSyncedAt: new Date(),
              syncError: null
            }
          })

          synced++
        } catch (error) {
          failed++
          errors.push({
            project: faProject.name,
            error: error.message
          })

          // Mark project with sync error
          if (faProject.url) {
            await prisma.project.update({
              where: { freeAgentId: faProject.url },
              data: { syncError: error.message }
            }).catch(() => {}) // Ignore if project doesn't exist
          }
        }
      }

      // Update sync log
      await prisma.projectSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'COMPLETED',
          projectsSynced: synced,
          projectsFailed: failed,
          errorDetails: errors.length > 0 ? errors : null,
          completedAt: new Date()
        }
      })

      // Update project health statuses
      await updateProjectHealthStatuses(organizationId)

      return NextResponse.json({
        success: true,
        synced,
        failed,
        errors: errors.length > 0 ? errors : undefined
      })

    } catch (error) {
      // Update sync log with failure
      await prisma.projectSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'FAILED',
          errorDetails: { error: error.message },
          completedAt: new Date()
        }
      })

      throw error
    }

  } catch (error) {
    console.error('Error syncing projects:', error)
    return NextResponse.json(
      { error: 'Failed to sync projects', details: error.message },
      { status: 500 }
    )
  }
}

function mapFreeAgentStatus(faStatus: string): ProjectStatus {
  const statusMap = {
    'Active': 'ACTIVE',
    'Completed': 'COMPLETED',
    'Cancelled': 'CANCELLED',
    'Hidden': 'HIDDEN',
    'Pending': 'ON_HOLD'
  }
  return statusMap[faStatus] || 'ACTIVE'
}

async function syncProjectStatusToFreeAgent(projectUrl: string, status: ProjectStatus) {
  // Implementation for syncing status back to FreeAgent
  const freeAgentStatus = {
    'ACTIVE': 'Active',
    'COMPLETED': 'Completed',
    'CANCELLED': 'Cancelled',
    'HIDDEN': 'Hidden',
    'ON_HOLD': 'Pending'
  }[status]

  // Call FreeAgent API to update project status
  // await freeAgent.updateProject(projectUrl, { status: freeAgentStatus })
}

async function updateProjectHealthStatuses(organizationId: string) {
  const projects = await prisma.project.findMany({
    where: { organizationId },
    include: {
      purchaseOrders: {
        select: { totalAmount: true }
      }
    }
  })

  for (const project of projects) {
    const totalPoValue = project.purchaseOrders.reduce(
      (sum, po) => sum.add(po.totalAmount),
      new Decimal(0)
    )

    let healthStatus = 'UNKNOWN'

    if (project.budget) {
      const budgetUsage = totalPoValue.div(project.budget).mul(100).toNumber()

      if (budgetUsage > 100) {
        healthStatus = 'CRITICAL'
      } else if (budgetUsage > (project.budgetAlertThreshold || 75)) {
        healthStatus = 'WARNING'
      } else if (project.profitMargin < 10) {
        healthStatus = 'WARNING'
      } else {
        healthStatus = 'HEALTHY'
      }
    }

    await prisma.project.update({
      where: { id: project.id },
      data: {
        totalPoValue: totalPoValue,
        healthStatus
      }
    })
  }
}
```

### 4. Project Analytics

#### `app/api/projects/[id]/analytics/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserAndOrgOrThrow } from '@/lib/auth-helpers'
import { Decimal } from 'decimal.js'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { organizationId } = await getUserAndOrgOrThrow()

    const project = await prisma.project.findFirst({
      where: { id, organizationId },
      include: {
        purchaseOrders: {
          include: {
            lineItems: true
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Calculate detailed analytics
    const analytics = await calculateProjectAnalytics(project)

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Error calculating project analytics:', error)
    return NextResponse.json(
      { error: 'Failed to calculate analytics' },
      { status: 500 }
    )
  }
}

async function calculateProjectAnalytics(project: any) {
  const now = new Date()

  // PO Analysis
  const poAnalysis = project.purchaseOrders.reduce((acc, po) => {
    const amount = new Decimal(po.totalAmount)

    acc.totalPoValue = acc.totalPoValue.add(amount)
    acc.poCount++

    // Status breakdown
    if (!acc.byStatus[po.status]) {
      acc.byStatus[po.status] = { count: 0, value: new Decimal(0) }
    }
    acc.byStatus[po.status].count++
    acc.byStatus[po.status].value = acc.byStatus[po.status].value.add(amount)

    // Committed vs Pending
    if (['SENT', 'APPROVED', 'INVOICED'].includes(po.status)) {
      acc.committedValue = acc.committedValue.add(amount)
    } else {
      acc.pendingValue = acc.pendingValue.add(amount)
    }

    // Monthly breakdown
    const month = po.createdAt.toISOString().slice(0, 7)
    if (!acc.byMonth[month]) {
      acc.byMonth[month] = { count: 0, value: new Decimal(0) }
    }
    acc.byMonth[month].count++
    acc.byMonth[month].value = acc.byMonth[month].value.add(amount)

    // Supplier breakdown
    if (!acc.bySupplier[po.supplierName]) {
      acc.bySupplier[po.supplierName] = { count: 0, value: new Decimal(0) }
    }
    acc.bySupplier[po.supplierName].count++
    acc.bySupplier[po.supplierName].value = acc.bySupplier[po.supplierName].value.add(amount)

    return acc
  }, {
    totalPoValue: new Decimal(0),
    committedValue: new Decimal(0),
    pendingValue: new Decimal(0),
    poCount: 0,
    byStatus: {},
    byMonth: {},
    bySupplier: {}
  })

  // Budget Analysis
  const budgetAnalysis = {
    budget: project.budget,
    spent: poAnalysis.totalPoValue,
    committed: poAnalysis.committedValue,
    available: null,
    percentUsed: null,
    percentCommitted: null,
    isOverBudget: false,
    projectedOverrun: null
  }

  if (project.budget) {
    const budget = new Decimal(project.budget)
    budgetAnalysis.available = budget.minus(poAnalysis.committedValue)
    budgetAnalysis.percentUsed = poAnalysis.totalPoValue.div(budget).mul(100).toNumber()
    budgetAnalysis.percentCommitted = poAnalysis.committedValue.div(budget).mul(100).toNumber()
    budgetAnalysis.isOverBudget = budgetAnalysis.percentUsed > 100

    // Project overrun based on run rate
    if (project.startDate && project.endDate) {
      const projectDuration = project.endDate.getTime() - project.startDate.getTime()
      const elapsed = now.getTime() - project.startDate.getTime()
      const percentComplete = (elapsed / projectDuration) * 100

      if (percentComplete > 0 && percentComplete < 100) {
        const runRate = poAnalysis.totalPoValue.div(percentComplete).mul(100)
        budgetAnalysis.projectedOverrun = runRate.minus(budget)
      }
    }
  }

  // Profitability Analysis
  const profitability = {
    revenue: new Decimal(project.totalRevenue || 0),
    costs: poAnalysis.totalPoValue,
    profit: new Decimal(project.totalRevenue || 0).minus(poAnalysis.totalPoValue),
    margin: null,
    projectedProfit: null,
    projectedMargin: null
  }

  if (profitability.revenue.gt(0)) {
    profitability.margin = profitability.profit.div(profitability.revenue).mul(100).toNumber()
  }

  // Timeline Analysis
  const timeline = {
    startDate: project.startDate,
    endDate: project.endDate,
    duration: null,
    elapsed: null,
    remaining: null,
    percentComplete: null,
    isOverdue: false,
    daysOverdue: null
  }

  if (project.startDate && project.endDate) {
    timeline.duration = Math.ceil(
      (project.endDate.getTime() - project.startDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (project.startDate <= now) {
      timeline.elapsed = Math.ceil(
        (now.getTime() - project.startDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      timeline.percentComplete = (timeline.elapsed / timeline.duration) * 100
    }

    if (project.endDate < now && project.status === 'ACTIVE') {
      timeline.isOverdue = true
      timeline.daysOverdue = Math.ceil(
        (now.getTime() - project.endDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    } else {
      timeline.remaining = Math.ceil(
        (project.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
    }
  }

  // Top suppliers
  const topSuppliers = Object.entries(poAnalysis.bySupplier)
    .map(([name, data]: [string, any]) => ({
      name,
      count: data.count,
      value: data.value.toString()
    }))
    .sort((a, b) => new Decimal(b.value).minus(new Decimal(a.value)).toNumber())
    .slice(0, 5)

  // Monthly trend
  const monthlyTrend = Object.entries(poAnalysis.byMonth)
    .map(([month, data]: [string, any]) => ({
      month,
      count: data.count,
      value: data.value.toString()
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  return {
    summary: {
      totalPoValue: poAnalysis.totalPoValue.toString(),
      poCount: poAnalysis.poCount,
      committedValue: poAnalysis.committedValue.toString(),
      pendingValue: poAnalysis.pendingValue.toString(),
      avgPoValue: poAnalysis.poCount > 0
        ? poAnalysis.totalPoValue.div(poAnalysis.poCount).toString()
        : '0'
    },
    budget: {
      ...budgetAnalysis,
      spent: budgetAnalysis.spent.toString(),
      committed: budgetAnalysis.committed.toString(),
      available: budgetAnalysis.available?.toString(),
      projectedOverrun: budgetAnalysis.projectedOverrun?.toString()
    },
    profitability: {
      ...profitability,
      revenue: profitability.revenue.toString(),
      costs: profitability.costs.toString(),
      profit: profitability.profit.toString(),
      projectedProfit: profitability.projectedProfit?.toString()
    },
    timeline,
    topSuppliers,
    monthlyTrend,
    statusBreakdown: Object.entries(poAnalysis.byStatus).map(([status, data]: [string, any]) => ({
      status,
      count: data.count,
      value: data.value.toString()
    }))
  }
}
```

## Frontend Components

### 1. Project List Page

#### `app/(dashboard)/projects/page.tsx`
```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { ProjectTable } from '@/components/projects/project-table'
import { ProjectFilters } from '@/components/projects/project-filters'
import { BatchActionsBar } from '@/components/projects/batch-actions-bar'
import { useUser } from '@/lib/hooks/use-user'
import { Button } from '@/components/ui/button'
import { RefreshCw, Plus } from 'lucide-react'

export default function ProjectsPage() {
  const router = useRouter()
  const { hasPermission, loading: userLoading } = useUser()
  const [projects, setProjects] = useState([])
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    clientId: ''
  })
  const [sortConfig, setSortConfig] = useState({
    sortBy: 'name',
    sortOrder: 'asc'
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        ...filters,
        ...sortConfig,
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      })

      const response = await fetch(`/api/projects?${params}`)
      const data = await response.json()

      if (response.ok) {
        setProjects(data.projects)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }, [filters, sortConfig, pagination.page, pagination.limit])

  useEffect(() => {
    if (!userLoading) {
      fetchProjects()
    }
  }, [fetchProjects, userLoading])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/projects/sync', {
        method: 'POST'
      })

      if (response.ok) {
        await fetchProjects()
      }
    } catch (error) {
      console.error('Error syncing projects:', error)
    } finally {
      setSyncing(false)
    }
  }

  const handleBatchAction = async (action: string, data: any) => {
    const projectIds = Array.from(selectedProjects)

    try {
      const response = await fetch('/api/projects/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectIds,
          operation: action,
          data
        })
      })

      if (response.ok) {
        setSelectedProjects(new Set())
        await fetchProjects()
      }
    } catch (error) {
      console.error('Error performing batch action:', error)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProjects(new Set(projects.map(p => p.id)))
    } else {
      setSelectedProjects(new Set())
    }
  }

  const handleSelectProject = (projectId: string, checked: boolean) => {
    const newSelection = new Set(selectedProjects)
    if (checked) {
      newSelection.add(projectId)
    } else {
      newSelection.delete(projectId)
    }
    setSelectedProjects(newSelection)
  }

  if (userLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Projects
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Manage and track project profitability
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSync}
              disabled={syncing}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              Sync with FreeAgent
            </Button>

            {hasPermission('canCreatePO') && (
              <Button onClick={() => router.push('/projects/new')}>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            )}
          </div>
        </div>

        <ProjectFilters
          filters={filters}
          onFiltersChange={setFilters}
        />

        {selectedProjects.size > 0 && (
          <BatchActionsBar
            selectedCount={selectedProjects.size}
            onAction={handleBatchAction}
            onClearSelection={() => setSelectedProjects(new Set())}
          />
        )}

        <ProjectTable
          projects={projects}
          selectedProjects={selectedProjects}
          loading={loading}
          onSelectAll={handleSelectAll}
          onSelectProject={handleSelectProject}
          onSort={(field) => {
            setSortConfig({
              sortBy: field,
              sortOrder: sortConfig.sortBy === field && sortConfig.sortOrder === 'asc'
                ? 'desc'
                : 'asc'
            })
          }}
        />

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-between items-center mt-6">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} projects
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={pagination.page === 1}
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
              >
                Previous
              </Button>

              <Button
                variant="outline"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

### 2. Project Components

#### `components/projects/project-table.tsx`
```typescript
import { Project } from '@/types/project'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'

interface ProjectTableProps {
  projects: Project[]
  selectedProjects: Set<string>
  loading: boolean
  onSelectAll: (checked: boolean) => void
  onSelectProject: (projectId: string, checked: boolean) => void
  onSort: (field: string) => void
}

export function ProjectTable({
  projects,
  selectedProjects,
  loading,
  onSelectAll,
  onSelectProject,
  onSort
}: ProjectTableProps) {
  const allSelected = projects.length > 0 &&
    projects.every(p => selectedProjects.has(p.id))

  const healthIcon = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'WARNING':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'CRITICAL':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const statusBadge = (status: string) => {
    const colors = {
      ACTIVE: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-blue-100 text-blue-800',
      CANCELLED: 'bg-red-100 text-red-800',
      HIDDEN: 'bg-gray-100 text-gray-800',
      ON_HOLD: 'bg-yellow-100 text-yellow-800'
    }

    return (
      <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    )
  }

  if (loading) {
    return <div>Loading projects...</div>
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="px-6 py-3 text-left">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onSelectAll}
              />
            </th>

            <th
              className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer"
              onClick={() => onSort('name')}
            >
              <div className="flex items-center gap-1">
                Project
                <ArrowUp className="h-3 w-3" />
              </div>
            </th>

            <th
              className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer"
              onClick={() => onSort('status')}
            >
              Status
            </th>

            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
              Client
            </th>

            <th
              className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer"
              onClick={() => onSort('budget')}
            >
              Budget
            </th>

            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
              P&L
            </th>

            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
              Health
            </th>

            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>

        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
          {projects.map((project) => (
            <tr key={project.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
              <td className="px-6 py-4">
                <Checkbox
                  checked={selectedProjects.has(project.id)}
                  onCheckedChange={(checked) => onSelectProject(project.id, checked)}
                />
              </td>

              <td className="px-6 py-4">
                <Link
                  href={`/projects/${project.id}`}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  {project.name}
                </Link>
                {project.code && (
                  <div className="text-sm text-slate-500">{project.code}</div>
                )}
              </td>

              <td className="px-6 py-4">
                {statusBadge(project.status)}
              </td>

              <td className="px-6 py-4 text-sm">
                {project.clientName || '-'}
              </td>

              <td className="px-6 py-4">
                {project.budget ? (
                  <div>
                    <div className="text-sm font-medium">
                      £{project.totalPoValue.toLocaleString()} / £{project.budget.toLocaleString()}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className={`h-2 rounded-full ${
                          project.budgetUsage > 90 ? 'bg-red-500' :
                          project.budgetUsage > 75 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(project.budgetUsage, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {project.budgetUsage.toFixed(0)}% used
                    </div>
                  </div>
                ) : (
                  <div className="text-sm">
                    £{project.totalPoValue.toLocaleString()}
                    <div className="text-xs text-slate-500">No budget set</div>
                  </div>
                )}
              </td>

              <td className="px-6 py-4">
                <div className="flex items-center gap-1">
                  {project.profitMargin > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-sm font-medium ${
                    project.profitMargin > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {project.profitMargin.toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  £{project.profitAmount.toLocaleString()}
                </div>
              </td>

              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  {healthIcon(project.healthStatus)}
                  <span className="text-xs text-slate-500">
                    {project.healthStatus}
                  </span>
                </div>
              </td>

              <td className="px-6 py-4 text-right">
                <button className="text-slate-400 hover:text-slate-600">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

## Testing Requirements

### Unit Tests
1. Test project CRUD operations
2. Test batch update logic
3. Test FreeAgent sync mapping
4. Test budget calculations
5. Test health status determination
6. Test P&L calculations

### Integration Tests
1. Test full sync flow with FreeAgent
2. Test PO-project association
3. Test batch status updates
4. Test permission checks
5. Test pagination and filtering

### E2E Tests
1. Create project and associate PO
2. Sync projects from FreeAgent
3. Batch update project statuses
4. View project analytics
5. Export project report

## Deployment Checklist

### Pre-deployment
- [ ] Run database migrations
- [ ] Test FreeAgent connection
- [ ] Verify storage buckets exist
- [ ] Set environment variables
- [ ] Test with sample data

### Deployment Steps
1. Deploy database migrations
2. Deploy API endpoints
3. Deploy frontend components
4. Run initial FreeAgent sync
5. Configure sync schedule

### Post-deployment
- [ ] Verify sync is working
- [ ] Check analytics calculations
- [ ] Test batch operations
- [ ] Monitor error logs
- [ ] Gather user feedback

## Implementation Priority

### Phase 1 - Foundation (Week 1)
1. Database schema and migrations
2. Basic project CRUD API
3. Project list page
4. FreeAgent sync endpoint

### Phase 2 - Core Features (Week 2)
1. Batch operations API
2. PO-project association
3. Project detail page
4. Basic analytics calculations

### Phase 3 - Advanced (Week 3)
1. Dashboard widgets
2. Budget tracking and alerts
3. Health status indicators
4. Advanced filtering

### Phase 4 - Polish (Week 4)
1. Export functionality
2. Email notifications
3. Performance optimization
4. Documentation

## Notes for Implementation

1. **FreeAgent API Rate Limits**: Implement throttling to avoid hitting rate limits during sync
2. **Caching**: Cache project data for dashboard to improve performance
3. **Real-time Updates**: Consider WebSockets for real-time sync status
4. **Permissions**: Ensure proper RBAC for all endpoints
5. **Audit Trail**: Log all batch operations and status changes
6. **Error Recovery**: Implement retry logic for failed syncs
7. **Data Validation**: Validate all FreeAgent data before storing