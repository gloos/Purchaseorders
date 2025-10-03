import { TaxMode } from '@prisma/client'

export interface TaxCalculationResult {
  subtotalAmount: number
  taxAmount: number
  totalAmount: number
}

/**
 * Calculate tax amounts based on line items and tax configuration
 *
 * @param lineItems - Array of line items with quantity and unitPrice
 * @param taxMode - How tax should be calculated (INCLUSIVE, EXCLUSIVE, NONE)
 * @param taxRate - Tax rate as percentage (e.g., 20 for 20%)
 * @returns Object with subtotal, tax, and total amounts
 */
export function calculateTax(
  lineItems: Array<{ quantity: number; unitPrice: string | number }>,
  taxMode: TaxMode,
  taxRate: number
): TaxCalculationResult {
  // Calculate the sum of all line items (quantity * unitPrice)
  const lineItemsTotal = lineItems.reduce((sum, item) => {
    const price = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice
    return sum + (item.quantity * price)
  }, 0)

  let subtotalAmount: number
  let taxAmount: number
  let totalAmount: number

  switch (taxMode) {
    case 'NONE':
      // No tax applied
      subtotalAmount = lineItemsTotal
      taxAmount = 0
      totalAmount = lineItemsTotal
      break

    case 'EXCLUSIVE':
      // Tax is added on top of line items
      // subtotal = line items total
      // tax = subtotal * (taxRate / 100)
      // total = subtotal + tax
      subtotalAmount = lineItemsTotal
      taxAmount = (lineItemsTotal * taxRate) / 100
      totalAmount = subtotalAmount + taxAmount
      break

    case 'INCLUSIVE':
      // Tax is already included in line item prices
      // total = line items total
      // subtotal = total / (1 + taxRate/100)
      // tax = total - subtotal
      totalAmount = lineItemsTotal
      subtotalAmount = totalAmount / (1 + taxRate / 100)
      taxAmount = totalAmount - subtotalAmount
      break

    default:
      // Fallback to NONE if unknown tax mode
      subtotalAmount = lineItemsTotal
      taxAmount = 0
      totalAmount = lineItemsTotal
  }

  // Round to 2 decimal places
  return {
    subtotalAmount: Math.round(subtotalAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100
  }
}

/**
 * Format currency amount using Intl.NumberFormat
 *
 * @param amount - The amount to format
 * @param currency - ISO currency code (e.g., 'GBP', 'USD', 'EUR')
 * @param locale - Locale for formatting (defaults to 'en-GB')
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number | string,
  currency: string = 'GBP',
  locale: string = 'en-GB'
): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numAmount)
}

/**
 * Get locale for a given currency
 * This is a simple mapping - extend as needed
 *
 * @param currency - ISO currency code
 * @returns Appropriate locale string
 */
export function getLocaleForCurrency(currency: string): string {
  const currencyLocaleMap: Record<string, string> = {
    'GBP': 'en-GB',
    'USD': 'en-US',
    'EUR': 'de-DE',
    'JPY': 'ja-JP',
    'CAD': 'en-CA',
    'AUD': 'en-AU'
  }

  return currencyLocaleMap[currency] || 'en-GB'
}

/**
 * Format currency with automatic locale detection
 *
 * @param amount - The amount to format
 * @param currency - ISO currency code
 * @returns Formatted currency string with appropriate locale
 */
export function formatCurrencyAuto(
  amount: number | string,
  currency: string = 'GBP'
): string {
  const locale = getLocaleForCurrency(currency)
  return formatCurrency(amount, currency, locale)
}
