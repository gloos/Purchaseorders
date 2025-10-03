'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'

type POStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SENT' | 'RECEIVED' | 'CANCELLED'

interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: string
  totalPrice: string
  notes?: string | null
}

interface PurchaseOrder {
  id: string
  poNumber: string
  title: string
  description?: string | null
  status: POStatus
  totalAmount: string
  currency: string
  orderDate: string
  deliveryDate?: string | null
  notes?: string | null
  supplierName: string
  supplierEmail?: string | null
  supplierPhone?: string | null
  supplierAddress?: string | null
  createdAt: string
  createdBy: {
    name: string | null
    email: string
  }
  organization: {
    name: string
  }
  lineItems: LineItem[]
}

const statusColors: Record<POStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  SENT: 'bg-blue-100 text-blue-800',
  RECEIVED: 'bg-purple-100 text-purple-800',
  CANCELLED: 'bg-red-100 text-red-800'
}

const statusLabels: Record<POStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  SENT: 'Sent',
  RECEIVED: 'Received',
  CANCELLED: 'Cancelled'
}

export default function PurchaseOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [po, setPo] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (params.id) {
      fetchPurchaseOrder()
    }
  }, [params.id])

  const fetchPurchaseOrder = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/purchase-orders/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setPo(data)
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

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this purchase order?')) {
      return
    }

    try {
      setDeleting(true)
      const response = await fetch(`/api/purchase-orders/${params.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/purchase-orders')
      } else {
        alert('Failed to delete purchase order')
      }
    } catch (error) {
      console.error('Error deleting purchase order:', error)
      alert('Failed to delete purchase order')
    } finally {
      setDeleting(false)
    }
  }

  const handleSendEmail = async () => {
    try {
      setSending(true)
      setMessage('')

      const response = await fetch(`/api/purchase-orders/${params.id}/send-email`, {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Purchase order sent successfully!')
        // Refresh the PO to update status
        fetchPurchaseOrder()
      } else {
        setMessage(`Error: ${data.error || 'Failed to send email'}`)
      }
    } catch (error) {
      console.error('Error sending email:', error)
      setMessage('Error: Failed to send email')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        </div>
      </div>
    )
  }

  if (!po) {
    return null
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/purchase-orders" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
          ← Back to Purchase Orders
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{po.poNumber}</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">{po.title}</p>
          </div>
          <div className="flex gap-2">
            <a
              href={`/api/purchase-orders/${po.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              title="Download PDF"
            >
              Download PDF
            </a>
            <button
              onClick={handleSendEmail}
              disabled={sending || !po.supplierEmail}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={!po.supplierEmail ? 'Supplier email required' : 'Send purchase order to supplier'}
            >
              {sending ? 'Sending...' : 'Send Email'}
            </button>
            <Link
              href={`/purchase-orders/${po.id}/edit`}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.startsWith('Error')
            ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            : 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
        }`}>
          {message}
        </div>
      )}

      {/* Status Badge */}
      <div className="mb-6">
        <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${statusColors[po.status]}`}>
          {statusLabels[po.status]}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Purchase Order Info */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Purchase Order Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">PO Number</dt>
                <dd className="mt-1 text-sm text-slate-900 dark:text-white">{po.poNumber}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Order Date</dt>
                <dd className="mt-1 text-sm text-slate-900 dark:text-white">
                  {format(new Date(po.orderDate), 'MMM d, yyyy')}
                </dd>
              </div>
              {po.deliveryDate && (
                <div>
                  <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Delivery Date</dt>
                  <dd className="mt-1 text-sm text-slate-900 dark:text-white">
                    {format(new Date(po.deliveryDate), 'MMM d, yyyy')}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Created By</dt>
                <dd className="mt-1 text-sm text-slate-900 dark:text-white">
                  {po.createdBy.name || po.createdBy.email}
                </dd>
              </div>
              {po.description && (
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Description</dt>
                  <dd className="mt-1 text-sm text-slate-900 dark:text-white">{po.description}</dd>
                </div>
              )}
              {po.notes && (
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Notes</dt>
                  <dd className="mt-1 text-sm text-slate-900 dark:text-white">{po.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Line Items */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Line Items</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                      Description
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                      Unit Price
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {po.lineItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                        {item.description}
                        {item.notes && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.notes}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-white text-right">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-white text-right">
                        {po.currency} {parseFloat(item.unitPrice).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-white text-right">
                        {po.currency} {parseFloat(item.totalPrice).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 dark:border-slate-600">
                    <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white text-right">
                      Total Amount
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white text-right">
                      {po.currency} {parseFloat(po.totalAmount).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Supplier Info */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Supplier</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Name</dt>
                <dd className="mt-1 text-sm text-slate-900 dark:text-white">{po.supplierName}</dd>
              </div>
              {po.supplierEmail && (
                <div>
                  <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Email</dt>
                  <dd className="mt-1 text-sm text-slate-900 dark:text-white">
                    <a href={`mailto:${po.supplierEmail}`} className="text-blue-600 hover:text-blue-700">
                      {po.supplierEmail}
                    </a>
                  </dd>
                </div>
              )}
              {po.supplierPhone && (
                <div>
                  <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Phone</dt>
                  <dd className="mt-1 text-sm text-slate-900 dark:text-white">{po.supplierPhone}</dd>
                </div>
              )}
              {po.supplierAddress && (
                <div>
                  <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Address</dt>
                  <dd className="mt-1 text-sm text-slate-900 dark:text-white whitespace-pre-line">
                    {po.supplierAddress}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Organization Info */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Organization</h2>
            <p className="text-sm text-slate-900 dark:text-white">{po.organization.name}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
