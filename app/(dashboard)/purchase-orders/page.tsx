'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Navbar } from '@/components/navbar'
import { useUser } from '@/lib/hooks/use-user'

type POStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SENT' | 'RECEIVED' | 'INVOICED' | 'CANCELLED'

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

const statusColors: Record<POStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  SENT: 'bg-blue-100 text-blue-800',
  RECEIVED: 'bg-purple-100 text-purple-800',
  INVOICED: 'bg-teal-100 text-teal-800',
  CANCELLED: 'bg-red-100 text-red-800'
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
  const { hasPermission } = useUser()
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Purchase Orders</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage your purchase orders</p>
        </div>
        {hasPermission('canCreatePO') && (
          <Link
            href="/purchase-orders/new"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            + New Purchase Order
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
        >
          <option value="">All Statuses</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Purchase Orders List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        </div>
      ) : purchaseOrders.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-12 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">No purchase orders found</p>
          {hasPermission('canCreatePO') && (
            <Link
              href="/purchase-orders/new"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first purchase order
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  PO Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Created By
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {purchaseOrders.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/purchase-orders/${po.id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {po.poNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-900 dark:text-white">{po.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900 dark:text-white">{po.supplierName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900 dark:text-white">
                      {po.currency} {parseFloat(po.totalAmount).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[po.status]}`}>
                      {statusLabels[po.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    {format(new Date(po.orderDate), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    {po.createdBy.name || po.createdBy.email}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  )
}
