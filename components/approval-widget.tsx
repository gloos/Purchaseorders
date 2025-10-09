'use client'

import { useState, useEffect } from 'react'

interface ApprovalRequest {
  id: string
  status: string
  amount: string // Serialized from Decimal
  createdAt: string // ISO string
  purchaseOrder: {
    id: string
    poNumber: string
    title: string
    subtotalAmount: string // Serialized from Decimal
    totalAmount: string // Serialized from Decimal
    currency: string
    supplierName: string
    createdAt: string // ISO string
  }
  requester: {
    id: string
    name: string | null
    email: string
  }
}

export function ApprovalWidget() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [denyModalOpen, setDenyModalOpen] = useState(false)
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null)
  const [denyReason, setDenyReason] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchPendingApprovals()
  }, [])

  const fetchPendingApprovals = async () => {
    try {
      const response = await fetch('/api/approvals/pending')

      if (response.ok) {
        const data = await response.json()
        setApprovals(data.approvals)
      }
    } catch (error) {
      console.error('Error fetching pending approvals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (approvalId: string) => {
    if (!confirm('Are you sure you want to approve this purchase order?')) {
      return
    }

    setProcessing(true)
    try {
      const response = await fetch(`/api/approvals/${approvalId}/approve`, {
        method: 'POST',
      })

      if (response.ok) {
        // Refresh the list
        await fetchPendingApprovals()
        alert('Purchase order approved successfully')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to approve purchase order')
      }
    } catch (error) {
      console.error('Error approving:', error)
      alert('Failed to approve purchase order')
    } finally {
      setProcessing(false)
    }
  }

  const handleDenyClick = (approval: ApprovalRequest) => {
    setSelectedApproval(approval)
    setDenyReason('')
    setDenyModalOpen(true)
  }

  const handleDenySubmit = async () => {
    if (!selectedApproval) return

    setProcessing(true)
    try {
      const response = await fetch(`/api/approvals/${selectedApproval.id}/deny`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: denyReason }),
      })

      if (response.ok) {
        setDenyModalOpen(false)
        setSelectedApproval(null)
        // Refresh the list
        await fetchPendingApprovals()
        alert('Purchase order denied')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to deny purchase order')
      }
    } catch (error) {
      console.error('Error denying:', error)
      alert('Failed to deny purchase order')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Pending Approvals
        </h3>
        <div className="text-center text-slate-600 dark:text-slate-400 py-4">
          Loading...
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Pending Approvals
          </h3>
          {approvals.length > 0 && (
            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {approvals.length}
            </span>
          )}
        </div>

        {approvals.length === 0 ? (
          <div className="text-center text-slate-600 dark:text-slate-400 py-8">
            <svg
              className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p>No pending approvals</p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvals.map((approval) => (
              <div
                key={approval.id}
                className="border border-slate-200 dark:border-slate-600 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <a
                      href={`/purchase-orders/${approval.purchaseOrder.id}`}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      PO #{approval.purchaseOrder.poNumber}
                    </a>
                    <p className="text-sm text-slate-900 dark:text-white mt-1">
                      {approval.purchaseOrder.title}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {approval.purchaseOrder.currency} {parseFloat(approval.purchaseOrder.totalAmount).toFixed(2)}
                  </span>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                  <p>Supplier: {approval.purchaseOrder.supplierName}</p>
                  <p>
                    Requested by: {approval.requester.name || approval.requester.email}
                  </p>
                  <p>
                    {new Date(approval.createdAt).toLocaleDateString()}{' '}
                    {new Date(approval.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(approval.id)}
                    disabled={processing}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium py-2 px-3 rounded transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleDenyClick(approval)}
                    disabled={processing}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium py-2 px-3 rounded transition-colors"
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deny Modal */}
      {denyModalOpen && selectedApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Deny Purchase Order
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              PO #{selectedApproval.purchaseOrder.poNumber} -{' '}
              {selectedApproval.purchaseOrder.title}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Reason for denial (optional)
              </label>
              <textarea
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                rows={4}
                placeholder="Provide a reason for denying this purchase order..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDenySubmit}
                disabled={processing}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                {processing ? 'Denying...' : 'Confirm Denial'}
              </button>
              <button
                onClick={() => {
                  setDenyModalOpen(false)
                  setSelectedApproval(null)
                }}
                disabled={processing}
                className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
