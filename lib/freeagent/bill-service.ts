// FreeAgent Bill Service Layer
// Provides helper functions for creating and managing bills in FreeAgent

import { FreeAgentClient, FreeAgentContact, FreeAgentBill, FreeAgentBillItem, FreeAgentCategory } from './client'
import { PurchaseOrder, POLineItem } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * Calculate due date from invoice date and payment terms
 */
export function calculateDueDate(invoiceDate: Date | string, paymentTermsDays: number): string {
  const date = new Date(invoiceDate)
  date.setDate(date.getDate() + paymentTermsDays)
  return date.toISOString().split('T')[0] // Format as YYYY-MM-DD
}

/**
 * Match or create a FreeAgent contact for the supplier
 */
export async function matchOrCreateContact(
  client: FreeAgentClient,
  po: PurchaseOrder
): Promise<FreeAgentContact> {
  // Try to find existing contact
  let contact: FreeAgentContact | null = null

  // 1. Try by email first (most reliable)
  if (po.supplierEmail) {
    contact = await client.findContactByEmail(po.supplierEmail)
    if (contact) return contact
  }

  // 2. Try by supplier name
  contact = await client.findContactByName(po.supplierName)
  if (contact) return contact

  // 3. Create new contact if not found
  const contactData: Partial<FreeAgentContact> = {
    organisation_name: po.supplierName,
    email: po.supplierEmail || undefined,
    phone_number: po.supplierPhone || undefined,
    is_active: true
  }

  // Parse address if available
  if (po.supplierAddress) {
    const addressLines = po.supplierAddress.split('\n').map(line => line.trim()).filter(Boolean)
    contactData.address1 = addressLines[0] || undefined
    contactData.address2 = addressLines[1] || undefined
    contactData.address3 = addressLines[2] || undefined
  }

  return await client.createContact(contactData)
}

/**
 * Suggest FreeAgent category for a line item based on description keywords
 */
export async function suggestCategoryForItem(
  description: string,
  organizationId: string,
  allCategories: FreeAgentCategory[]
): Promise<string | null> {
  // Normalize description for keyword matching
  const normalizedDesc = description.toLowerCase().trim()

  // 1. Check saved mappings first
  const mappings = await prisma.expenseCategoryMapping.findMany({
    where: { organizationId }
  })

  for (const mapping of mappings) {
    if (normalizedDesc.includes(mapping.keyword.toLowerCase())) {
      return mapping.freeAgentCategoryUrl
    }
  }

  // 2. Default keyword-to-category mapping (common cases)
  const defaultMappings: Record<string, string[]> = {
    'software': ['software', 'saas', 'subscription', 'license', 'cloud'],
    'hardware': ['computer', 'laptop', 'equipment', 'device', 'monitor'],
    'consulting': ['consulting', 'consultancy', 'advisory', 'professional services'],
    'marketing': ['marketing', 'advertising', 'promotion', 'seo', 'ppc'],
    'office': ['office', 'stationery', 'supplies', 'furniture'],
    'travel': ['travel', 'flight', 'hotel', 'accommodation', 'transport'],
    'training': ['training', 'course', 'education', 'learning'],
    'utilities': ['utilities', 'electricity', 'water', 'internet', 'phone']
  }

  // Try to match against category descriptions
  for (const category of allCategories) {
    const categoryDesc = category.description.toLowerCase()

    for (const [key, keywords] of Object.entries(defaultMappings)) {
      if (keywords.some(keyword => normalizedDesc.includes(keyword))) {
        // Check if category matches the key
        if (categoryDesc.includes(key)) {
          return category.url
        }
      }
    }
  }

  return null // No suggestion found
}

/**
 * Transform Purchase Order data to FreeAgent Bill format
 */
export async function transformPOToBill(
  po: PurchaseOrder & { lineItems: POLineItem[] },
  contactUrl: string,
  categoryMappings: Record<string, string>, // lineItemId -> categoryUrl
  dueDate?: string,
  paymentTermsDays?: number
): Promise<Partial<FreeAgentBill>> {
  // Calculate due date
  let calculatedDueDate: string
  if (dueDate) {
    calculatedDueDate = new Date(dueDate).toISOString().split('T')[0]
  } else {
    const terms = paymentTermsDays || po.paymentTermsDays || 30
    const invoiceDate = po.invoiceReceivedAt || po.orderDate
    calculatedDueDate = calculateDueDate(invoiceDate, terms)
  }

  // Transform line items
  const billItems: FreeAgentBillItem[] = po.lineItems.map(item => {
    const categoryUrl = categoryMappings[item.id]
    if (!categoryUrl) {
      throw new Error(`Missing category mapping for line item: ${item.description}`)
    }

    return {
      url: '', // Empty string for new items
      description: item.description,
      total_value: item.totalPrice.toString(),
      sales_tax_rate: po.taxRate.toString(),
      category: categoryUrl
    }
  })

  // Build bill object
  const bill: Partial<FreeAgentBill> = {
    contact: contactUrl,
    reference: po.poNumber,
    dated_on: (po.invoiceReceivedAt || po.orderDate).toISOString().split('T')[0],
    due_on: calculatedDueDate,
    bill_items: billItems,
    currency: po.currency
  }

  return bill
}

/**
 * Retry wrapper with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      // Don't retry on client errors (400-499)
      if (error instanceof Error && error.message.includes('400')) {
        throw error
      }

      // Wait before retrying (exponential backoff)
      if (i < maxRetries - 1) {
        const delay = initialDelayMs * Math.pow(2, i)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

/**
 * Check if a bill already exists for this PO (idempotency check)
 */
export async function checkBillExists(poId: string): Promise<{
  exists: boolean
  billId?: string
  billUrl?: string
}> {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    select: {
      freeAgentBillId: true,
      freeAgentBillUrl: true
    }
  })

  if (!po) {
    throw new Error('Purchase Order not found')
  }

  return {
    exists: !!po.freeAgentBillId,
    billId: po.freeAgentBillId || undefined,
    billUrl: po.freeAgentBillUrl || undefined
  }
}

/**
 * Flatten all categories into a single array for easier searching
 */
export function flattenCategories(categories: {
  admin_expenses_categories: FreeAgentCategory[]
  cost_of_sales_categories: FreeAgentCategory[]
  income_categories: FreeAgentCategory[]
  general_categories: FreeAgentCategory[]
}): FreeAgentCategory[] {
  return [
    ...categories.admin_expenses_categories,
    ...categories.cost_of_sales_categories,
    ...categories.income_categories,
    ...categories.general_categories
  ]
}

/**
 * Extract FreeAgent ID from URL
 * Example: https://api.freeagent.com/v2/bills/123 -> 123
 */
export function extractIdFromUrl(url: string): string {
  const parts = url.split('/')
  return parts[parts.length - 1]
}
