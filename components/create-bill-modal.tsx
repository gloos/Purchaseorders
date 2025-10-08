'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: string
  totalPrice: string
}

interface PurchaseOrder {
  id: string
  poNumber: string
  supplierName: string
  supplierEmail?: string | null
  invoiceReceivedAt?: string | null
  orderDate: string
  lineItems: LineItem[]
  totalAmount: string
  currency: string
  taxRate: string
  paymentTermsDays?: number | null
  freeAgentContactUrl?: string | null
}

interface FreeAgentCategory {
  url: string
  description: string
  nominal_code?: string
}

interface CreateBillModalProps {
  isOpen: boolean
  onClose: () => void
  purchaseOrder: PurchaseOrder
  onSuccess: () => void
}

type Step = 1 | 2 | 3 | 4

export function CreateBillModal({ isOpen, onClose, purchaseOrder, onSuccess }: CreateBillModalProps) {
  const [step, setStep] = useState<Step>(1)
  const [error, setError] = useState('')

  // Step 1: Contact
  const [contactUrl] = useState(purchaseOrder.freeAgentContactUrl || '')
  const [contactVerified] = useState(!!purchaseOrder.freeAgentContactUrl)

  // Step 2: Payment Details
  const [paymentTermsDays, setPaymentTermsDays] = useState(purchaseOrder.paymentTermsDays || 30)
  const [dueDate, setDueDate] = useState('')

  // Step 3: Categories
  const [categories, setCategories] = useState<FreeAgentCategory[]>([])
  const [categoryMappings, setCategoryMappings] = useState<Record<string, string>>({})
  const [loadingCategories, setLoadingCategories] = useState(false)

  // Step 4: Confirm
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (isOpen && step === 3 && categories.length === 0) {
      fetchCategories()
    }
  }, [isOpen, step])

  useEffect(() => {
    // Calculate due date when payment terms change
    if (purchaseOrder.invoiceReceivedAt && paymentTermsDays) {
      const invoiceDate = new Date(purchaseOrder.invoiceReceivedAt)
      const due = new Date(invoiceDate)
      due.setDate(due.getDate() + paymentTermsDays)
      setDueDate(due.toISOString().split('T')[0])
    }
  }, [paymentTermsDays, purchaseOrder.invoiceReceivedAt])

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true)
      const response = await fetch('/api/freeagent/categories')

      if (response.ok) {
        const data = await response.json()
        // Flatten all categories into one array
        const allCategories = [
          ...data.categories.adminExpenses,
          ...data.categories.costOfSales,
          ...data.categories.general
        ]
        setCategories(allCategories)

        // Try to get saved mappings
        fetchSavedMappings(allCategories)
      } else {
        setError('Failed to fetch categories from FreeAgent')
      }
    } catch (err) {
      setError('Error fetching categories')
      console.error(err)
    } finally {
      setLoadingCategories(false)
    }
  }

  const fetchSavedMappings = async (_allCategories: FreeAgentCategory[]) => {
    try {
      const response = await fetch('/api/expense-mappings')
      if (response.ok) {
        const data = await response.json()

        // Auto-map line items based on saved mappings
        const autoMappings: Record<string, string> = {}

        purchaseOrder.lineItems.forEach(item => {
          const keywords = item.description.toLowerCase().split(' ')
          const mapping = data.mappings.find((m: any) =>
            keywords.some(keyword => keyword.includes(m.keyword.toLowerCase()))
          )

          if (mapping) {
            autoMappings[item.id] = mapping.freeAgentCategoryUrl
          }
        })

        setCategoryMappings(autoMappings)
      }
    } catch (err) {
      console.error('Error fetching saved mappings:', err)
    }
  }

  const handleCreateBill = async () => {
    try {
      setCreating(true)
      setError('')

      // Validate all line items have categories
      const missingCategories = purchaseOrder.lineItems.filter(
        item => !categoryMappings[item.id]
      )

      if (missingCategories.length > 0) {
        setError(`Please select categories for: ${missingCategories.map(i => i.description).join(', ')}`)
        return
      }

      const response = await fetch(`/api/purchase-orders/${purchaseOrder.id}/create-bill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseOrderId: purchaseOrder.id,
          categoryMappings,
          paymentTermsDays,
          dueDate,
          contactUrl: contactUrl || undefined
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Save successful category mappings for future use
        await saveCategoryMappings()

        onSuccess()
        onClose()
        resetModal()
      } else {
        setError(data.error || 'Failed to create bill')
      }
    } catch (err) {
      setError('Error creating bill')
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  const saveCategoryMappings = async () => {
    try {
      const mappings = purchaseOrder.lineItems.map(item => {
        const keywords = item.description.toLowerCase().split(' ').filter(w => w.length > 3)
        return {
          keyword: keywords[0] || item.description.substring(0, 20).toLowerCase(),
          freeAgentCategoryUrl: categoryMappings[item.id]
        }
      })

      await fetch('/api/expense-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings })
      })
    } catch (err) {
      console.error('Error saving mappings:', err)
    }
  }

  const resetModal = () => {
    setStep(1)
    setError('')
    setCategoryMappings({})
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  const canProceedToStep2 = contactVerified || contactUrl !== ''
  const canProceedToStep3 = paymentTermsDays > 0 && dueDate !== ''
  const canProceedToStep4 = purchaseOrder.lineItems.every(item => categoryMappings[item.id])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Create FreeAgent Bill
            </h2>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Step Indicator */}
          <div className="mt-4 flex items-center justify-between">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step >= s
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  {s}
                </div>
                <div className={`text-xs ml-2 ${
                  step >= s ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'
                }`}>
                  {s === 1 && 'Contact'}
                  {s === 2 && 'Payment'}
                  {s === 3 && 'Categories'}
                  {s === 4 && 'Confirm'}
                </div>
                {s < 4 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    step > s ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-lg">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Step 1: Contact Verification */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Supplier Contact
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Verify the supplier contact for this bill.
              </p>

              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Supplier Name</dt>
                    <dd className="text-sm text-slate-900 dark:text-white">{purchaseOrder.supplierName}</dd>
                  </div>
                  {purchaseOrder.supplierEmail && (
                    <div>
                      <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Email</dt>
                      <dd className="text-sm text-slate-900 dark:text-white">{purchaseOrder.supplierEmail}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {contactUrl ? (
                <div className="flex items-center text-green-600 dark:text-green-400">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Contact will be matched or created automatically
                </div>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  The system will automatically match this supplier to an existing FreeAgent contact or create a new one.
                </p>
              )}
            </div>
          )}

          {/* Step 2: Payment Details */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Payment Details
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Payment Terms (Days)
                  </label>
                  <select
                    value={paymentTermsDays}
                    onChange={(e) => setPaymentTermsDays(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                    <option value="45">45 days</option>
                    <option value="60">60 days</option>
                    <option value="90">90 days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Invoice Date: {purchaseOrder.invoiceReceivedAt
                        ? format(new Date(purchaseOrder.invoiceReceivedAt), 'MMM d, yyyy')
                        : format(new Date(purchaseOrder.orderDate), 'MMM d, yyyy')}
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                      Due date is calculated automatically based on payment terms.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Category Mapping */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Map Expense Categories
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Select the appropriate FreeAgent category for each line item.
              </p>

              {loadingCategories ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Loading categories...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {purchaseOrder.lineItems.map((item) => (
                    <div key={item.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 dark:text-white">{item.description}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {purchaseOrder.currency} {parseFloat(item.totalPrice).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <select
                        value={categoryMappings[item.id] || ''}
                        onChange={(e) => setCategoryMappings({ ...categoryMappings, [item.id]: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                      >
                        <option value="">Select category...</option>
                        {categories.map((cat) => (
                          <option key={cat.url} value={cat.url}>
                            {cat.description} {cat.nominal_code ? `(${cat.nominal_code})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review & Confirm */}
          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Review & Confirm
              </h3>

              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-4">
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white mb-2">Supplier</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{purchaseOrder.supplierName}</p>
                </div>

                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white mb-2">Payment</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Due: {dueDate ? format(new Date(dueDate), 'MMM d, yyyy') : 'Not set'}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Terms: {paymentTermsDays} days
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white mb-2">Line Items</h4>
                  <div className="space-y-2">
                    {purchaseOrder.lineItems.map((item) => {
                      const category = categories.find(c => c.url === categoryMappings[item.id])
                      return (
                        <div key={item.id} className="text-sm">
                          <span className="text-slate-900 dark:text-white">{item.description}</span>
                          <span className="text-slate-500 dark:text-slate-400"> → </span>
                          <span className="text-blue-600 dark:text-blue-400">{category?.description}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between text-lg font-semibold">
                    <span className="text-slate-900 dark:text-white">Total</span>
                    <span className="text-slate-900 dark:text-white">
                      {purchaseOrder.currency} {parseFloat(purchaseOrder.totalAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-between">
          <button
            onClick={() => setStep(Math.max(1, step - 1) as Step)}
            disabled={step === 1 || creating}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleClose}
              disabled={creating}
              className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            {step < 4 ? (
              <button
                onClick={() => setStep((step + 1) as Step)}
                disabled={
                  (step === 1 && !canProceedToStep2) ||
                  (step === 2 && !canProceedToStep3) ||
                  (step === 3 && !canProceedToStep4)
                }
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleCreateBill}
                disabled={creating}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating Bill...' : 'Create Bill in FreeAgent'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
