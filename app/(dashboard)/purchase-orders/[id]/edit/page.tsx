'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
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
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <Link href={`/purchase-orders/${params.id}`} className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Purchase Order
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Edit Purchase Order</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Title"
                type="text"
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
                options={SUPPORTED_CURRENCIES.map(currency => ({
                  value: currency.code,
                  label: `${currency.code} - ${currency.name}${currency.symbol ? ` (${currency.symbol})` : ''}`
                }))}
              />
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
                label={`Tax Rate${formData.taxMode !== 'NONE' ? ' *' : ''}`}
                value={formData.taxRateId}
                onChange={(e) => handleTaxRateSelect(e.target.value)}
                disabled={formData.taxMode === 'NONE'}
                required={formData.taxMode !== 'NONE'}
                options={[
                  { value: '', label: '-- Select tax rate --' },
                  ...taxRates.map((rate) => ({
                    value: rate.id,
                    label: `${rate.name} (${rate.rate}%)`
                  }))
                ]}
              />
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

          {/* Contact Selector */}
          <div className="mb-4">
            <Select
              label="Select from Contacts"
              value={selectedContactId}
              onChange={(e) => handleContactSelect(e.target.value)}
              options={[
                { value: '', label: '-- Select a contact or enter manually --' },
                ...contacts.map((contact) => ({
                  value: contact.id,
                  label: contact.name
                }))
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
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
              type="button"
              onClick={addLineItem}
              variant="ghost"
              size="sm"
            >
              + Add Item
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
                      type="button"
                      onClick={() => removeLineItem(item.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <Input
                      label="Description"
                      type="text"
                      value={item.description}
                      onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                      required
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Input
                      label="Quantity"
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleLineItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      required
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Input
                      label="Unit Price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => handleLineItemChange(item.id, 'unitPrice', e.target.value)}
                      required
                      className="text-sm"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <Input
                      label="Notes"
                      type="text"
                      value={item.notes}
                      onChange={(e) => handleLineItemChange(item.id, 'notes', e.target.value)}
                      className="text-sm"
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
          />
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={submitting}
            isLoading={submitting}
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
          <Link href={`/purchase-orders/${params.id}`}>
            <Button
              type="button"
              variant="secondary"
              size="md"
            >
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
