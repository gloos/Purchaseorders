'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
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
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/purchase-orders" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Purchase Orders
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">New Purchase Order</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>
            <div className="md:col-span-2">
              <Textarea
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
              />
            </div>
            <div>
              <Select
                label="Status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                options={[
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
                  { value: 'APPROVED', label: 'Approved' },
                  { value: 'SENT', label: 'Sent' },
                  { value: 'RECEIVED', label: 'Received' },
                  { value: 'CANCELLED', label: 'Cancelled' }
                ]}
              />
            </div>
            <div>
              <Select
                label="Currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                required
              >
                {SUPPORTED_CURRENCIES.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name} {currency.symbol ? `(${currency.symbol})` : ''}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Select
                label="Tax Mode"
                name="taxMode"
                value={formData.taxMode}
                onChange={handleChange}
                required
                options={[
                  { value: 'NONE', label: 'No Tax' },
                  { value: 'EXCLUSIVE', label: 'Tax Exclusive (added on top)' },
                  { value: 'INCLUSIVE', label: 'Tax Inclusive (included in prices)' }
                ]}
              />
            </div>
            <div>
              <Select
                label={`Tax Rate ${formData.taxMode !== 'NONE' ? '*' : ''}`}
                value={formData.taxRateId}
                onChange={(e) => handleTaxRateSelect(e.target.value)}
                disabled={formData.taxMode === 'NONE'}
                required={formData.taxMode !== 'NONE'}
                placeholder="-- Select tax rate --"
                helperText={formData.taxRateId && formData.taxMode !== 'NONE' ? `Tax rate: ${formData.taxRate}%` : undefined}
              >
                {taxRates.map((rate) => (
                  <option key={rate.id} value={rate.id}>
                    {rate.name} ({rate.rate}%)
                  </option>
                ))}
              </Select>
              {taxRates.length === 0 && formData.taxMode !== 'NONE' && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  No tax rates configured. <Link href="/settings/tax-rates" className="underline">Add tax rates</Link>
                </p>
              )}
            </div>
            <div>
              <Input
                label="Order Date"
                type="date"
                name="orderDate"
                value={formData.orderDate}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Input
                label="Delivery Date"
                type="date"
                name="deliveryDate"
                value={formData.deliveryDate}
                onChange={handleChange}
              />
            </div>
          </div>
        </Card>

        {/* Supplier Information */}
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Supplier Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Select
                label="Select from Contacts (Optional)"
                value={selectedContactId}
                onChange={(e) => handleContactSelect(e.target.value)}
                placeholder="-- Or enter manually below --"
              >
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                  </option>
                ))}
              </Select>
              {contacts.length === 0 && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  No contacts available. <Link href="/freeagent/contacts" className="underline">Sync from FreeAgent</Link>
                </p>
              )}
            </div>
            <div>
              <Input
                label="Supplier Name"
                type="text"
                name="supplierName"
                value={formData.supplierName}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Input
                label="Email"
                type="email"
                name="supplierEmail"
                value={formData.supplierEmail}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Input
                label="Phone"
                type="tel"
                name="supplierPhone"
                value={formData.supplierPhone}
                onChange={handleChange}
              />
            </div>
            <div className="md:col-span-2">
              <Textarea
                label="Address"
                name="supplierAddress"
                value={formData.supplierAddress}
                onChange={handleChange}
                rows={3}
              />
            </div>
          </div>
        </Card>

        {/* Line Items */}
        <Card padding="lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Line Items</h2>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={addLineItem}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Add Item
            </Button>
          </div>
          <div className="space-y-4">
            {lineItems.map((item, index) => (
              <div key={item.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Item {index + 1}
                  </span>
                  {lineItems.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => removeLineItem(item.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
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
        </Card>

        {/* Notes */}
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Additional Notes</h2>
          <Textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            placeholder="Any additional notes or comments..."
            helperText="Any additional information or special instructions"
          />
        </Card>

        {/* Actions */}
        <Card padding="lg">
          <div className="flex justify-between items-center">
            <Link href="/purchase-orders">
              <Button variant="secondary" type="button">
                Cancel
              </Button>
            </Link>
            <Button
              variant="primary"
              type="submit"
              disabled={submitting || !user || user.role === 'VIEWER'}
              isLoading={submitting}
            >
              {user && user.role === 'VIEWER' ? 'No Permission' : getSubmitButtonText()}
            </Button>
          </div>
        </Card>
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
              <Select
                label="Approver"
                value={selectedApproverId}
                onChange={(e) => setSelectedApproverId(e.target.value)}
                placeholder="-- Select an approver --"
                required
              >
                {approvers.map((approver) => (
                  <option key={approver.id} value={approver.id}>
                    {approver.name || approver.email} ({approver.role})
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setShowApproverModal(false)
                  setSelectedApproverId('')
                  setPendingPurchaseOrderData(null)
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleApproverSubmit}
                disabled={!selectedApproverId || submitting}
                isLoading={submitting}
              >
                Submit for Approval
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
