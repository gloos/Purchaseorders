'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'

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

interface PurchaseOrder {
  id: string
  poNumber: string
  title: string
  description?: string | null
  status: string
  currency: string
  orderDate: string
  deliveryDate?: string | null
  supplierName: string
  supplierEmail?: string | null
  supplierPhone?: string | null
  supplierAddress?: string | null
  notes?: string | null
  lineItems: {
    id: string
    description: string
    quantity: number
    unitPrice: string
    notes?: string | null
  }[]
}

export default function EditPurchaseOrderPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [selectedContactId, setSelectedContactId] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'DRAFT',
    currency: 'GBP',
    taxMode: 'EXCLUSIVE',
    taxRateId: '',
    taxRate: 0,
    orderDate: '',
    deliveryDate: '',
    supplierName: '',
    supplierEmail: '',
    supplierPhone: '',
    supplierAddress: '',
    notes: ''
  })

  const [lineItems, setLineItems] = useState<LineItem[]>([])

  useEffect(() => {
    fetchContacts()
    fetchTaxRates()
    if (params.id) {
      fetchPurchaseOrder()
    }
  }, [params.id])

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
      }
    } catch (error) {
      console.error('Error fetching tax rates:', error)
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

  const fetchPurchaseOrder = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/purchase-orders/${params.id}`)
      if (response.ok) {
        const data: any = await response.json()
        setFormData({
          title: data.title,
          description: data.description || '',
          status: data.status,
          currency: data.currency,
          taxMode: data.taxMode || 'EXCLUSIVE',
          taxRateId: data.taxRateId || '',
          taxRate: data.taxRate ? parseFloat(data.taxRate) : 0,
          orderDate: data.orderDate.split('T')[0],
          deliveryDate: data.deliveryDate ? data.deliveryDate.split('T')[0] : '',
          supplierName: data.supplierName,
          supplierEmail: data.supplierEmail || '',
          supplierPhone: data.supplierPhone || '',
          supplierAddress: data.supplierAddress || '',
          notes: data.notes || ''
        })
        setLineItems(data.lineItems.map((item: any) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes || ''
        })))
      } else {
        router.push('/purchase-orders')
      }
    } catch (error) {
      console.error('Error fetching purchase order:', error)
      router.push('/purchase-orders')
    } finally {
      setLoading(false)
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
    const newId = `new-${Date.now()}`
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch(`/api/purchase-orders/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          deliveryDate: formData.deliveryDate || null,
          lineItems: lineItems.map(({ id, ...item }) => item)
        })
      })

      if (response.ok) {
        router.push(`/purchase-orders/${params.id}`)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update purchase order')
      }
    } catch (error) {
      console.error('Error updating purchase order:', error)
      alert('Failed to update purchase order')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Navbar />
        <div className="p-8">
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <div className="p-8">
        <div className="mb-6">
        <Link href={`/purchase-orders/${params.id}`} className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
          ← Back to Purchase Order
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Edit Purchase Order</h1>
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
                <option value="GBP">GBP (£)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
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

          {/* Contact Selector */}
          <div className="mb-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                Email
              </label>
              <input
                type="email"
                name="supplierEmail"
                value={formData.supplierEmail}
                onChange={handleChange}
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
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            href={`/purchase-orders/${params.id}`}
            className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
      </div>
    </div>
  )
}
