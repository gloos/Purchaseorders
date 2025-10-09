import { z } from 'zod'
import { POStatus, TaxMode, UserRole } from '@prisma/client'
import { CURRENCY_CODES } from './currencies'

/**
 * Validation schemas for API request bodies
 * Uses Zod for runtime type checking and validation
 */

// Line Item validation schema
export const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format').or(z.number().positive('Unit price must be positive')),
  notes: z.string().max(1000, 'Notes too long').optional().nullable().transform(val => val === '' ? null : val)
})

// Purchase Order creation schema
export const createPurchaseOrderSchema = z.object({
  // Optional fields
  poNumber: z.string().max(50, 'PO number too long').optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(2000, 'Description too long').optional().nullable().transform(val => val === '' ? null : val),
  status: z.nativeEnum(POStatus).optional().default('DRAFT' as POStatus),
  currency: z.enum(CURRENCY_CODES as [string, ...string[]]).default('GBP'),

  // Tax configuration
  taxMode: z.nativeEnum(TaxMode).optional().default('EXCLUSIVE' as TaxMode),
  taxRate: z.coerce.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100%').optional().default(0),
  taxRateId: z.string().optional().nullable(),

  orderDate: z.string().optional().transform((val) => val ? new Date(val).toISOString() : new Date().toISOString()),
  deliveryDate: z.string().optional().nullable().transform((val) => val ? new Date(val).toISOString() : null),
  notes: z.string().max(2000, 'Notes too long').optional().nullable().transform(val => val === '' ? null : val),

  // Supplier information - all required
  supplierName: z.string().min(1, 'Supplier name is required').max(200, 'Supplier name too long'),
  supplierEmail: z.string().min(1, 'Email is required').email('Invalid email'),
  supplierPhone: z.string().max(50, 'Phone number too long').optional().nullable().transform(val => val === '' ? null : val),
  supplierAddress: z.string().max(500, 'Address too long').optional().nullable().transform(val => val === '' ? null : val),

  // Line items - required, must have at least one
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required').max(100, 'Too many line items')
}).refine(
  (data) => {
    // If deliveryDate is provided, it should be after orderDate
    if (data.deliveryDate && data.orderDate) {
      const order = new Date(data.orderDate)
      const delivery = new Date(data.deliveryDate)
      return delivery >= order
    }
    return true
  },
  {
    message: 'Delivery date must be on or after order date',
    path: ['deliveryDate']
  }
)

// Purchase Order update schema (all fields optional except lineItems if provided)
export const updatePurchaseOrderSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  description: z.string().max(2000, 'Description too long').optional().nullable().transform(val => val === '' ? null : val),
  status: z.nativeEnum(POStatus).optional(),
  currency: z.enum(CURRENCY_CODES as [string, ...string[]]).optional(),

  // Tax configuration
  taxMode: z.nativeEnum(TaxMode).optional(),
  taxRate: z.coerce.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100%').optional(),
  taxRateId: z.string().optional().nullable(),

  orderDate: z.string().optional().transform((val) => val ? new Date(val).toISOString() : undefined),
  deliveryDate: z.string().optional().nullable().transform((val) => val ? new Date(val).toISOString() : null),
  notes: z.string().max(2000, 'Notes too long').optional().nullable().transform(val => val === '' ? null : val),

  supplierName: z.string().min(1, 'Supplier name is required').max(200, 'Supplier name too long').optional(),
  supplierEmail: z.string().min(1, 'Email is required').email('Invalid email').optional(),
  supplierPhone: z.string().max(50, 'Phone number too long').optional().nullable().transform(val => val === '' ? null : val),
  supplierAddress: z.string().max(500, 'Address too long').optional().nullable().transform(val => val === '' ? null : val),

  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required').max(100, 'Too many line items').optional()
}).refine(
  (data) => {
    if (data.deliveryDate && data.orderDate) {
      const order = new Date(data.orderDate)
      const delivery = new Date(data.deliveryDate)
      return delivery >= order
    }
    return true
  },
  {
    message: 'Delivery date must be on or after order date',
    path: ['deliveryDate']
  }
)

// Organization profile update schema
export const updateOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(200, 'Name too long').optional(),
  companyRegistrationNumber: z.string().max(50, 'Registration number too long').optional().nullable(),
  vatNumber: z.string().max(50, 'VAT number too long').optional().nullable(),
  addressLine1: z.string().max(200, 'Address line too long').optional().nullable(),
  addressLine2: z.string().max(200, 'Address line too long').optional().nullable(),
  city: z.string().max(100, 'City too long').optional().nullable(),
  region: z.string().max(100, 'Region too long').optional().nullable(),
  postcode: z.string().max(20, 'Postcode too long').optional().nullable(),
  country: z.string().max(100, 'Country too long').optional().nullable(),
  phone: z.string().max(50, 'Phone number too long').optional().nullable(),
  email: z.string().email('Invalid email').optional().nullable(),
  website: z.string().url('Invalid URL').optional().nullable()
})

// Contact sync schema (for FreeAgent integration)
export const contactSyncSchema = z.object({
  freeAgentId: z.string().min(1, 'FreeAgent ID is required'),
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  email: z.string().email('Invalid email').optional().nullable(),
  phone: z.string().max(50, 'Phone number too long').optional().nullable(),
  address: z.string().max(500, 'Address too long').optional().nullable(),
  isActive: z.boolean().optional().default(true)
})

// Organization creation schema
export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(200, 'Name too long'),
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must be at most 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
})

// FreeAgent Bill Line Item schema
export const billLineItemSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  totalValue: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format'),
  salesTaxRate: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid tax rate format').optional(),
  category: z.string().url('Invalid category URL')
})

// FreeAgent Bill Creation schema
export const createBillSchema = z.object({
  purchaseOrderId: z.string().uuid('Invalid PO ID'),
  categoryMappings: z.record(z.string(), z.string().url('Invalid category URL')), // lineItemId -> categoryUrl
  paymentTermsDays: z.number().int().positive('Payment terms must be positive').min(1).max(365).optional(),
  dueDate: z.string().optional().transform(val => val ? new Date(val).toISOString() : undefined),
  contactUrl: z.string().url('Invalid contact URL').optional()
}).refine(
  (data) => {
    // Must have either dueDate or paymentTermsDays
    return data.dueDate || data.paymentTermsDays
  },
  {
    message: 'Either dueDate or paymentTermsDays must be provided',
    path: ['dueDate']
  }
)

// Expense Category Mapping schema
export const createExpenseMappingSchema = z.object({
  keyword: z.string().min(1, 'Keyword is required').max(100, 'Keyword too long').toLowerCase(),
  freeAgentCategoryUrl: z.string().url('Invalid category URL')
})

// Bulk Expense Category Mappings schema
export const bulkExpenseMappingsSchema = z.object({
  mappings: z.array(createExpenseMappingSchema).min(1, 'At least one mapping is required')
})

// FreeAgent Category response schema (for validation)
export const freeAgentCategorySchema = z.object({
  url: z.string(),
  description: z.string(),
  nominal_code: z.string().optional(),
  allowable_for_tax: z.boolean().optional(),
  auto_sales_tax_rate: z.number().optional()
})

/**
 * Helper function to validate request body and return formatted errors
 */
export function validateRequestBody<T>(schema: z.ZodSchema<T>, body: unknown) {
  const result = schema.safeParse(body)

  if (!result.success) {
    // Access Zod v4 errors - they might be on result.error.issues or result.error directly
    const zodErrors = result.error.issues || (result.error as any).errors || []

    if (!Array.isArray(zodErrors) || zodErrors.length === 0) {
      console.error('Unexpected Zod validation error structure:', result.error)
      return {
        success: false as const,
        errors: [{ field: 'unknown', message: 'Validation failed with unexpected error structure' }]
      }
    }

    const errors = zodErrors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }))

    return {
      success: false as const,
      errors
    }
  }

  return {
    success: true as const,
    data: result.data
  }
}

// ==================== Invitation Schemas ====================

// Create invitation schema
export const createInvitationSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  role: z.nativeEnum(UserRole, { message: 'Invalid role' })
})

// Accept invitation schema
export const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})
