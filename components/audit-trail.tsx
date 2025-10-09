'use client'

import { useEffect, useState } from 'react'

interface AuditAction {
  id: string
  action: 'SUBMITTED' | 'APPROVED' | 'DENIED' | 'COMMENTED' | 'CANCELLED'
  reason: string | null
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface ApprovalRequest {
  id: string
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'CANCELLED'
  amount: number
  reason: string | null
  createdAt: string
  requester: {
    id: string
    name: string | null
    email: string
  }
  approver: {
    id: string
    name: string | null
    email: string
  } | null
}

interface AuditTrailProps {
  purchaseOrderId: string
}

const ACTION_LABELS: Record<string, string> = {
  SUBMITTED: 'submitted for approval',
  APPROVED: 'approved',
  DENIED: 'denied',
  COMMENTED: 'commented',
  CANCELLED: 'cancelled',
}

const ACTION_COLORS: Record<string, string> = {
  SUBMITTED: 'text-blue-600 dark:text-blue-400',
  APPROVED: 'text-green-600 dark:text-green-400',
  DENIED: 'text-red-600 dark:text-red-400',
  COMMENTED: 'text-slate-600 dark:text-slate-400',
  CANCELLED: 'text-orange-600 dark:text-orange-400',
}

export function AuditTrail({ purchaseOrderId }: AuditTrailProps) {
  const [loading, setLoading] = useState(true)
  const [hasApprovalRequest, setHasApprovalRequest] = useState(false)
  const [approvalRequest, setApprovalRequest] = useState<ApprovalRequest | null>(null)
  const [auditTrail, setAuditTrail] = useState<AuditAction[]>([])

  useEffect(() => {
    fetchAuditTrail()
  }, [purchaseOrderId])

  const fetchAuditTrail = async () => {
    try {
      const response = await fetch(`/api/purchase-orders/${purchaseOrderId}/audit-trail`)
      if (response.ok) {
        const data = await response.json()
        setHasApprovalRequest(data.hasApprovalRequest)
        setApprovalRequest(data.approvalRequest || null)
        setAuditTrail(data.auditTrail || [])
      }
    } catch (error) {
      console.error('Error fetching audit trail:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Approval History
        </h3>
        <div className="text-center text-slate-600 dark:text-slate-400 py-4">
          Loading...
        </div>
      </div>
    )
  }

  if (!hasApprovalRequest) {
    return null // Don't show audit trail if there's no approval request
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        Approval History
      </h3>

      {approvalRequest && (
        <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Status
            </span>
            <span
              className={`text-sm font-semibold px-2 py-1 rounded ${
                approvalRequest.status === 'APPROVED'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                  : approvalRequest.status === 'DENIED'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                  : approvalRequest.status === 'PENDING'
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300'
              }`}
            >
              {approvalRequest.status}
            </span>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            <p>
              Requested by:{' '}
              {approvalRequest.requester.name || approvalRequest.requester.email}
            </p>
            {approvalRequest.approver && (
              <p>
                {approvalRequest.status === 'APPROVED' ? 'Approved' : 'Denied'} by:{' '}
                {approvalRequest.approver.name || approvalRequest.approver.email}
              </p>
            )}
            {approvalRequest.reason && (
              <p className="mt-2 text-slate-700 dark:text-slate-300">
                <span className="font-medium">Reason:</span> {approvalRequest.reason}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {auditTrail.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400 text-center py-4">
            No approval actions yet
          </p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-slate-200 dark:bg-slate-700" />

            {/* Timeline items */}
            <div className="space-y-6">
              {auditTrail.map((action) => (
                <div key={action.id} className="relative flex items-start gap-4">
                  {/* Timeline dot */}
                  <div
                    className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 ${
                      action.action === 'APPROVED'
                        ? 'bg-green-500'
                        : action.action === 'DENIED'
                        ? 'bg-red-500'
                        : action.action === 'SUBMITTED'
                        ? 'bg-blue-500'
                        : 'bg-slate-400'
                    }`}
                  >
                    {action.action === 'APPROVED' && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    {action.action === 'DENIED' && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-slate-900 dark:text-white">
                          <span className="font-medium">
                            {action.user.name || action.user.email}
                          </span>{' '}
                          <span className={ACTION_COLORS[action.action]}>
                            {ACTION_LABELS[action.action]}
                          </span>
                        </p>
                        {action.reason && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {action.reason}
                          </p>
                        )}
                      </div>
                      <time className="text-xs text-slate-500 dark:text-slate-400 ml-4 whitespace-nowrap">
                        {new Date(action.createdAt).toLocaleDateString()}{' '}
                        {new Date(action.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
