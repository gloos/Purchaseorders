'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { useUser } from '@/lib/hooks/use-user'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { POStatus } from '@prisma/client'

interface PurchaseOrder {
  id: string
  poNumber: string
  title: string
  status: POStatus
  totalAmount: string
  currency: string
  orderDate: string
  supplierName: string
  createdBy: {
    name: string | null
    email: string
  }
}

const statusLabels: Record<POStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  SENT: 'Sent',
  RECEIVED: 'Received',
  INVOICED: 'Invoiced',
  CANCELLED: 'Cancelled'
}

export default function PurchaseOrdersPage() {
  const { hasPermission, loading: userLoading } = useUser()
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => {
    fetchPurchaseOrders()
  }, [statusFilter])

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true)
      const url = statusFilter
        ? `/api/purchase-orders?status=${statusFilter}`
        : '/api/purchase-orders'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setPurchaseOrders(data)
      }
    } catch (error) {
      console.error('Error fetching purchase orders:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Purchase Orders</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage your purchase orders</p>
        </div>
        {!userLoading && hasPermission('canCreatePO') && (
          <Link href="/purchase-orders/new">
            <Button variant="primary" size="md" icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }>
              New Purchase Order
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: '', label: 'All Statuses' },
            ...Object.entries(statusLabels).map(([value, label]) => ({
              value,
              label
            }))
          ]}
          className="max-w-xs"
        />
      </div>

      {/* Purchase Orders List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        </div>
      ) : purchaseOrders.length === 0 ? (
        <Card padding="lg" className="text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">No purchase orders found</p>
          {!userLoading && hasPermission('canCreatePO') && (
            <Link href="/purchase-orders/new">
              <Button variant="primary">Create your first purchase order</Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {purchaseOrders.map((po) => (
            <Link key={po.id} href={`/purchase-orders/${po.id}`} className="block">
              <Card variant="hover" padding="md" className="h-full">
                <div className="flex flex-col h-full">
                  {/* Header: PO Number & Status */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {po.poNumber}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {format(new Date(po.orderDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <StatusBadge status={po.status} size="sm" />
                  </div>

                  {/* Title */}
                  <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-2 line-clamp-2">
                    {po.title}
                  </h4>

                  {/* Supplier */}
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-3">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="truncate">{po.supplierName}</span>
                  </div>

                  {/* Amount */}
                  <div className="mt-auto pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Total Amount</span>
                      <span className="text-lg font-semibold text-slate-900 dark:text-white">
                        {po.currency} {parseFloat(po.totalAmount).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Created by {po.createdBy.name || po.createdBy.email}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
