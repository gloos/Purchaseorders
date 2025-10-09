'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { useUser } from '@/lib/hooks/use-user'
import { CreateBillModal } from '@/components/create-bill-modal'
import { AuditTrail } from '@/components/audit-trail'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { POStatus } from '@prisma/client'

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
  subtotalAmount: string
  taxMode: 'NONE' | 'EXCLUSIVE' | 'INCLUSIVE'
  taxRate: string
  taxAmount: string
  totalAmount: string
  currency: string
  orderDate: string
  deliveryDate?: string | null
  notes?: string | null
  supplierName: string
  supplierEmail?: string | null
  supplierPhone?: string | null
  supplierAddress?: string | null
  invoiceUrl?: string | null
  invoiceReceivedAt?: string | null
  invoiceUploadTokenExpiresAt?: string | null
  paymentTermsDays?: number | null
  freeAgentBillId?: string | null
  freeAgentBillUrl?: string | null
  freeAgentBillCreatedAt?: string | null
  freeAgentContactUrl?: string | null
  createdAt: string
  createdBy: {
    name: string | null
    email: string
  }
  organization: {
    name: string
    freeAgentAccessToken?: string | null
  }
  lineItems: LineItem[]
}

export default function PurchaseOrderDetailPage() {
  const { hasPermission, loading: userLoading } = useUser()
  const params = useParams()
  const router = useRouter()
  const [po, setPo] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [showBillModal, setShowBillModal] = useState(false)
  const [canCreateBill, setCanCreateBill] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchPurchaseOrder()
    }
  }, [params.id])

  useEffect(() => {
    if (po) {
      checkBillEligibility()
    }
  }, [po])

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

  const checkBillEligibility = async () => {
    try {
      const response = await fetch(`/api/purchase-orders/${params.id}/create-bill`)
      if (response.ok) {
        const data = await response.json()
        setCanCreateBill(data.canCreate)
      }
    } catch (error) {
      console.error('Error checking bill eligibility:', error)
    }
  }

  const handleBillCreated = () => {
    setMessage('Bill created successfully in FreeAgent!')
    fetchPurchaseOrder()
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
      <div className="flex items-center justify-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
      </div>
    )
  }

  if (!po) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <Link href="/purchase-orders" className="text-blue-600 hover:text-blue-700 mb-4 inline-flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Purchase Orders
      </Link>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{po.poNumber}</h1>
            <StatusBadge status={po.status} size="md" />
          </div>
          <p className="text-slate-600 dark:text-slate-400">{po.title}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!userLoading && hasPermission('canViewPO') && (
            po.status === 'PENDING_APPROVAL' ? (
              <Button
                variant="secondary"
                size="md"
                disabled
                title="PDF download disabled while pending approval"
              >
                Download PDF
              </Button>
            ) : (
              <a href={`/api/purchase-orders/${po.id}/pdf`} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="md" title="Download PDF">
                  Download PDF
                </Button>
              </a>
            )
          )}
          {!userLoading && hasPermission('canSendPO') && (
            <Button
              variant="success"
              size="md"
              onClick={handleSendEmail}
              disabled={sending || !po.supplierEmail || po.status === 'PENDING_APPROVAL'}
              isLoading={sending}
              title={
                po.status === 'PENDING_APPROVAL'
                  ? 'Email sending disabled while pending approval'
                  : !po.supplierEmail
                    ? 'Supplier email required'
                    : 'Send purchase order to supplier'
              }
            >
              Send Email
            </Button>
          )}
          {!userLoading && canCreateBill && hasPermission('canEditPO') && (
            <Button
              variant="success"
              size="md"
              onClick={() => setShowBillModal(true)}
              title="Create bill in FreeAgent"
            >
              Create FreeAgent Bill
            </Button>
          )}
          {po.freeAgentBillUrl && (
            <Button
              variant="primary"
              size="md"
              onClick={() => po.freeAgentBillUrl && window.open(po.freeAgentBillUrl, '_blank', 'noopener,noreferrer')}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              }
            >
              View Bill in FreeAgent
            </Button>
          )}
          {!userLoading && hasPermission('canEditPO') && (
            <Link href={`/purchase-orders/${po.id}/edit`}>
              <Button variant="secondary" size="md">
                Edit
              </Button>
            </Link>
          )}
          {!userLoading && hasPermission('canDeletePO') && (
            <Button
              variant="danger"
              size="md"
              onClick={handleDelete}
              disabled={deleting}
              isLoading={deleting}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <Card
          padding="md"
          className={`mb-6 ${
            message.startsWith('Error')
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          }`}
        >
          <p className={message.startsWith('Error')
            ? 'text-red-800 dark:text-red-200'
            : 'text-green-800 dark:text-green-200'
          }>
            {message}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Purchase Order Info */}
          <Card padding="lg">
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
          </Card>

          {/* Line Items */}
          <Card padding="lg">
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
                  <tr className="border-t border-slate-200 dark:border-slate-600">
                    <td colSpan={3} className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 text-right">
                      Subtotal
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-white text-right">
                      {po.currency} {parseFloat(po.subtotalAmount).toFixed(2)}
                    </td>
                  </tr>
                  {po.taxMode !== 'NONE' && parseFloat(po.taxRate) > 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 text-right">
                        Tax ({parseFloat(po.taxRate).toFixed(2)}% {po.taxMode === 'INCLUSIVE' ? 'incl.' : 'excl.'})
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-white text-right">
                        {po.currency} {parseFloat(po.taxAmount).toFixed(2)}
                      </td>
                    </tr>
                  )}
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
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Supplier Info */}
          <Card padding="lg">
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
          </Card>

          {/* Organization Info */}
          <Card padding="lg">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Organization</h2>
            <p className="text-sm text-slate-900 dark:text-white">{po.organization.name}</p>
          </Card>

          {/* Invoice Status */}
          {(po.status === 'SENT' || po.status === 'INVOICED') && (
            <Card padding="lg">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Invoice</h2>
              {po.invoiceUrl && po.invoiceReceivedAt ? (
                <div className="space-y-3">
                  <div className="flex items-center text-green-600 dark:text-green-400 mb-2">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium">Invoice Uploaded</span>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Received</dt>
                    <dd className="mt-1 text-sm text-slate-900 dark:text-white">
                      {format(new Date(po.invoiceReceivedAt), 'MMM d, yyyy h:mm a')}
                    </dd>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/purchase-orders/${po.id}/invoice`)
                        if (response.ok) {
                          const blob = await response.blob()
                          const url = window.URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `Invoice-${po.poNumber}.pdf`
                          document.body.appendChild(a)
                          a.click()
                          window.URL.revokeObjectURL(url)
                          document.body.removeChild(a)
                        } else {
                          alert('Failed to download invoice')
                        }
                      } catch (error) {
                        console.error('Error downloading invoice:', error)
                        alert('Failed to download invoice')
                      }
                    }}
                    className="w-full"
                  >
                    Download Invoice
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center text-yellow-600 dark:text-yellow-400 mb-2">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium">Pending Upload</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Supplier has been sent a secure link to upload their invoice.
                  </p>
                  {po.invoiceUploadTokenExpiresAt && (
                    <div>
                      <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Link Expires</dt>
                      <dd className="mt-1 text-sm text-slate-900 dark:text-white">
                        {format(new Date(po.invoiceUploadTokenExpiresAt), 'MMM d, yyyy')}
                      </dd>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Approval Audit Trail */}
        {po && <AuditTrail purchaseOrderId={po.id} />}
      </div>

      {/* Bill Creation Modal */}
      {po && (
        <CreateBillModal
          isOpen={showBillModal}
          onClose={() => setShowBillModal(false)}
          purchaseOrder={po}
          onSuccess={handleBillCreated}
        />
      )}
    </div>
  )
}
