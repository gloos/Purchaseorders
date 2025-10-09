'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { SUPPORTED_CURRENCIES } from '@/lib/currencies'

interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: string
  notes: string
}

interface Contact {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
}

interface TaxRate {
  id: string
  name: string
  rate: number
  taxType: string
  isDefault: boolean
  isActive: boolean
}

interface User {
  id: string
  email: string
  name: string | null
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'VIEWER'
}

interface Organization {
  id: string
  name: string
  companyName: string | null
  approvalThreshold: number | null
  autoApproveAdmin: boolean
}

interface Approver {
  id: string
  name: string | null
  email: string
  role: 'ADMIN' | 'SUPER_ADMIN'
}

export default function NewPurchaseOrderPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [selectedContactId, setSelectedContactId] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [approvers, setApprovers] = useState<Approver[]>([])
  const [showApproverModal, setShowApproverModal] = useState(false)
  const [selectedApproverId, setSelectedApproverId] = useState('')
  const [pendingPurchaseOrderData, setPendingPurchaseOrderData] = useState<any>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'DRAFT',
    currency: 'GBP',
    taxMode: 'EXCLUSIVE',
    taxRateId: '',
    taxRate: 0,
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    supplierName: '',
    supplierEmail: '',
    supplierPhone: '',
    supplierAddress: '',
    notes: ''
  })

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: '0.00', notes: '' }
  ])

  useEffect(() => {
    fetchContacts()
    fetchTaxRates()
    fetchUserAndOrganization()
    fetchApprovers()
  }, [])

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/contacts')
      if (response.ok) {
        const data = await response.json()
        setContacts(data)
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    }
  }

  const fetchTaxRates = async () => {
    try {
      const response = await fetch('/api/tax-rates')
      if (response.ok) {
        const data = await response.json()
        setTaxRates(data.filter((rate: TaxRate) => rate.isActive))

        // Set default tax rate if available
        const defaultRate = data.find((rate: TaxRate) => rate.isDefault && rate.isActive)
        if (defaultRate) {
          setFormData(prev => ({
            ...prev,
            taxRateId: defaultRate.id,
            taxRate: defaultRate.rate
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching tax rates:', error)
    }
  }

  const fetchUserAndOrganization = async () => {
    try {
      const response = await fetch('/api/me')
      if (response.ok) {
        const data = await response.json()
        setUser(data)
        setOrganization(data.organization)
      }
    } catch (error) {
      console.error('Error fetching user and organization:', error)
    }
  }

  const fetchApprovers = async () => {
    try {
      const response = await fetch('/api/users/approvers')
      if (response.ok) {
        const data = await response.json()
        setApprovers(data.approvers)
      }
    } catch (error) {
      console.error('Error fetching approvers:', error)
    }
  }

  const handleContactSelect = (contactId: string) => {
    setSelectedContactId(contactId)

    if (!contactId) {
      // Clear supplier fields
      setFormData({
        ...formData,
        supplierName: '',
        supplierEmail: '',
        supplierPhone: '',
        supplierAddress: ''
      })
      return
    }

    const contact = contacts.find(c => c.id === contactId)
    if (contact) {
      setFormData({
        ...formData,
        supplierName: contact.name,
        supplierEmail: contact.email || '',
        supplierPhone: contact.phone || '',
        supplierAddress: contact.address || ''
      })
    }
  }

  const handleTaxRateSelect = (taxRateId: string) => {
    if (!taxRateId) {
      setFormData({
        ...formData,
        taxRateId: '',
        taxRate: 0
      })
      return
    }

    const selectedRate = taxRates.find(r => r.id === taxRateId)
    if (selectedRate) {
      setFormData({
        ...formData,
        taxRateId: selectedRate.id,
        taxRate: selectedRate.rate
      })
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleLineItemChange = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(lineItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const addLineItem = () => {
    const newId = String(Date.now())
    setLineItems([...lineItems, { id: newId, description: '', quantity: 1, unitPrice: '0.00', notes: '' }])
  }

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id))
    }
  }

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => {
      return sum + (item.quantity * parseFloat(item.unitPrice || '0'))
    }, 0)
  }

  const calculateTax = () => {
    const subtotal = calculateSubtotal()
    const taxRate = parseFloat(String(formData.taxRate || 0))

    if (formData.taxMode === 'NONE' || taxRate === 0) {
      return { subtotal, tax: 0, total: subtotal }
    } else if (formData.taxMode === 'EXCLUSIVE') {
      // Tax added on top
      const tax = (subtotal * taxRate) / 100
      return { subtotal, tax, total: subtotal + tax }
    } else if (formData.taxMode === 'INCLUSIVE') {
      // Tax already included in prices
      const total = subtotal
      const subtotalBeforeTax = total / (1 + taxRate / 100)
      const tax = total - subtotalBeforeTax
      return { subtotal: subtotalBeforeTax, tax, total }
    }
    return { subtotal, tax: 0, total: subtotal }
  }

  // Check if PO needs approval based on role and amount
  const needsApproval = (): boolean => {
    if (!user || !organization) return false

    // VIEWER cannot create POs
    if (user.role === 'VIEWER') return false

    // SUPER_ADMIN always auto-approves
    if (user.role === 'SUPER_ADMIN') {
      return false
    }

    // ADMIN respects autoApproveAdmin setting
    if (user.role === 'ADMIN') {
      if (organization.autoApproveAdmin) {
        return false
      }
      // If auto-approve is disabled, ADMINs follow the threshold rule
      const subtotal = calculateSubtotal()
      const threshold = organization.approvalThreshold ?? 50
      return subtotal >= threshold
    }

    // MANAGER needs approval if subtotal >= threshold
    if (user.role === 'MANAGER') {
      const subtotal = calculateSubtotal()
      const threshold = organization.approvalThreshold ?? 50
      return subtotal >= threshold
    }

    return false
  }

  const getSubmitButtonText = (): string => {
    if (submitting) {
      return needsApproval() ? 'Submitting for approval...' : 'Creating...'
    }
    return needsApproval() ? 'Submit for Approval' : 'Create Purchase Order'
  }

  const handleApproverSubmit = async () => {
    if (!selectedApproverId) {
      alert('Please select an approver')
      return
    }

    if (!pendingPurchaseOrderData) return

    setSubmitting(true)
    setShowApproverModal(false)

    try {
      const response = await fetch('/api/purchase-orders/submit-for-approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          purchaseOrderData: pendingPurchaseOrderData,
          approverId: selectedApproverId
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert('Purchase order submitted for approval')
        router.push(`/purchase-orders/${data.purchaseOrder.id}`)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to submit for approval')
        setSubmitting(false)
      }
    } catch (error) {
      console.error('Error submitting for approval:', error)
      alert('Failed to submit for approval')
      setSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Calculate totals
      const { subtotal, tax, total } = calculateTax()

      // Prepare PO data
      const purchaseOrderData = {
        ...formData,
        deliveryDate: formData.deliveryDate || null,
        subtotalAmount: subtotal,
        taxAmount: tax,
        totalAmount: total,
        lineItems: lineItems.map(({ id, ...item }) => ({
          ...item,
          totalPrice: item.quantity * parseFloat(item.unitPrice || '0')
        }))
      }

      // Check if approval is needed
      if (needsApproval()) {
        // Show approver selection modal
        setPendingPurchaseOrderData(purchaseOrderData)
        setShowApproverModal(true)
        setSubmitting(false)
        return
      } else {
        // Create normally (auto-approved)
        const response = await fetch('/api/purchase-orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(purchaseOrderData)
        })

        if (response.ok) {
          const data = await response.json()
          router.push(`/purchase-orders/${data.id}`)
        } else {
          const error = await response.json()
          alert(error.error || 'Failed to create purchase order')
        }
      }
    } catch (error) {
      console.error('Error creating purchase order:', error)
      alert('Failed to create purchase order')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <div className="p-8">
        <div className="mb-6">
        <Link href="/purchase-orders" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
          ← Back to Purchase Orders
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">New Purchase Order</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Status *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="DRAFT">Draft</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="SENT">Sent</option>
                <option value="RECEIVED">Received</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Currency *
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                required
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                {SUPPORTED_CURRENCIES.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name} {currency.symbol ? `(${currency.symbol})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Tax Mode *
              </label>
              <select
                name="taxMode"
                value={formData.taxMode}
                onChange={handleChange}
                required
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="NONE">No Tax</option>
                <option value="EXCLUSIVE">Tax Exclusive (added on top)</option>
                <option value="INCLUSIVE">Tax Inclusive (included in prices)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Tax Rate {formData.taxMode !== 'NONE' && '*'}
              </label>
              <select
                value={formData.taxRateId}
                onChange={(e) => handleTaxRateSelect(e.target.value)}
                disabled={formData.taxMode === 'NONE'}
                required={formData.taxMode !== 'NONE'}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">-- Select tax rate --</option>
                {taxRates.map((rate) => (
                  <option key={rate.id} value={rate.id}>
                    {rate.name} ({rate.rate}%)
                  </option>
                ))}
              </select>
              {formData.taxRateId && formData.taxMode !== 'NONE' && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Tax rate: {formData.taxRate}%
                </p>
              )}
              {taxRates.length === 0 && formData.taxMode !== 'NONE' && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  No tax rates configured. <Link href="/settings/tax-rates" className="underline">Add tax rates</Link>
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Order Date *
              </label>
              <input
                type="date"
                name="orderDate"
                value={formData.orderDate}
                onChange={handleChange}
                required
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Delivery Date
              </label>
              <input
                type="date"
                name="deliveryDate"
                value={formData.deliveryDate}
                onChange={handleChange}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Supplier Information */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Supplier Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Select from Contacts
              </label>
              <select
                value={selectedContactId}
                onChange={(e) => handleContactSelect(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="">-- Select a contact or enter manually --</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Supplier Name *
              </label>
              <input
                type="text"
                name="supplierName"
                value={formData.supplierName}
                onChange={handleChange}
                required
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="supplierEmail"
                value={formData.supplierEmail}
                onChange={handleChange}
                required
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Phone
              </label>
              <input
                type="tel"
                name="supplierPhone"
                value={formData.supplierPhone}
                onChange={handleChange}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Address
              </label>
              <textarea
                name="supplierAddress"
                value={formData.supplierAddress}
                onChange={handleChange}
                rows={3}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Line Items</h2>
            <button
              type="button"
              onClick={addLineItem}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              + Add Item
            </button>
          </div>
          <div className="space-y-4">
            {lineItems.map((item, index) => (
              <div key={item.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Item {index + 1}
                  </span>
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(item.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Description *
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                      required
                      className="w-full border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleLineItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      required
                      className="w-full border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Unit Price *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => handleLineItemChange(item.id, 'unitPrice', e.target.value)}
                      required
                      className="w-full border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={item.notes}
                      onChange={(e) => handleLineItemChange(item.id, 'notes', e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="md:col-span-4 text-right">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Line Total: {formData.currency} {(item.quantity * parseFloat(item.unitPrice || '0')).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="space-y-2 text-right">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                <span>Subtotal: {formData.currency} {calculateTax().subtotal.toFixed(2)}</span>
              </div>
              {formData.taxMode !== 'NONE' && parseFloat(String(formData.taxRate || 0)) > 0 && (
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  <span>Tax ({formData.taxRate}% {formData.taxMode === 'INCLUSIVE' ? 'incl.' : 'excl.'}): {formData.currency} {calculateTax().tax.toFixed(2)}</span>
                </div>
              )}
              <div className="text-lg font-semibold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                <span>Total Amount: {formData.currency} {calculateTax().total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Additional Notes</h2>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            placeholder="Any additional notes or comments..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={submitting || !user || user.role === 'VIEWER'}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
          >
            {user && user.role === 'VIEWER' ? 'No Permission' : getSubmitButtonText()}
          </button>
          <Link
            href="/purchase-orders"
            className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>

      {/* Approver Selection Modal */}
      {showApproverModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Select Approver
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              This purchase order requires approval. Please select who should review and approve it.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Approver <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedApproverId}
                onChange={(e) => setSelectedApproverId(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select an approver --</option>
                {approvers.map((approver) => (
                  <option key={approver.id} value={approver.id}>
                    {approver.name || approver.email} ({approver.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowApproverModal(false)
                  setSelectedApproverId('')
                  setPendingPurchaseOrderData(null)
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApproverSubmit}
                disabled={!selectedApproverId || submitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
